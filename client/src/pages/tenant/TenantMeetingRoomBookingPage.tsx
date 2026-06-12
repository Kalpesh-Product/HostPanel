import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Calendar, Clock, MapPin, Search, Users, Building2, X, CheckCircle2, AlertCircle, Plus, Presentation, Monitor,
} from 'lucide-react';
// import { toast } from 'sonner';
import { CardsGridSkeleton } from '@/components/ui/Skeleton';
import { formatTime12h } from '@/utils/time';
import { getStoredTenantCompanyId, getStoredTenantCompanyName, getStoredUser } from '@/lib/auth-session';

// ─── Backend service imports (uncomment when backend ready) ───
// import { getMeetingRoomBookings, createMeetingRoomBooking } from '@/services/meeting-room-bookings';
// import { getTenantCompanies } from '@/services/tenant-companies';
// import { getResources } from '@/services/resources';

const ROOM_TYPE_OPTIONS = ['All', 'Meeting Room', 'Conference Room'];
const BOOKING_SLOT_STEP_MINUTES = 5;
const BOOKING_MIN_DURATION_MINUTES = 30;

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeSearchText(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function normalizeFloor(value: unknown): string {
  const normalized = normalizeText(value);
  if (!normalized) return '501';
  const compact = normalized.toLowerCase().replace(/\s+/g, '');
  if (compact.includes('floor1') || compact === '1') return '501';
  if (compact.includes('floor2') || compact === '2') return '601';
  if (compact.includes('floor3') || compact === '3') return '701';
  return normalized;
}

function normalizeWing(value: unknown): string {
  const normalized = normalizeText(value).toUpperCase();
  return normalized || 'A';
}

interface NormalizedRoom {
  recordId: string;
  name: string;
  type: string;
  resourceCategory: string;
  floor: string;
  wing: string;
  capacity: number;
  credits: number;
  pricePerHour: number;
  pricePerDay: number;
  status: string;
  currentlyBooked: boolean;
  assignmentLabel: string;
  assignedTenantCompanyId: string;
  assignedDepartmentId: string;
  locationLabel: string;
  description: string;
}

function normalizeResourceRoom(resource: Record<string, any>): NormalizedRoom | null {
  const category = normalizeText(resource.resourceCategory || '').toLowerCase();
  const type = normalizeText(resource.type || '').toLowerCase();

  if (
    category === 'open_desk' || category === 'cabin_desk' ||
    type === 'desk' || type === 'cabin' ||
    type.includes('desk') || type.includes('cabin')
  ) return null;

  const derivedType = category === 'conference_room' || type.includes('conference') || type.includes('board')
    ? 'Conference Room'
    : category === 'meeting_room' || type.includes('meeting')
      ? 'Meeting Room'
      : null;

  if (!derivedType) return null;

  return {
    recordId: String(resource.recordId || resource._id || resource.id || resource.resourceCode || ''),
    name: normalizeText(resource.name),
    type: derivedType,
    resourceCategory: category || (derivedType === 'Conference Room' ? 'conference_room' : 'meeting_room'),
    floor: normalizeFloor(resource.floor),
    wing: normalizeWing(resource.wing),
    capacity: Number(resource.capacity || 0),
    credits: Number(resource.credits || 0),
    pricePerHour: Number(resource.pricePerHour || 0),
    pricePerDay: Number(resource.pricePerDay || 0),
    status: normalizeText(resource.status || 'Active'),
    currentlyBooked: Boolean(resource.currentlyBooked),
    assignmentLabel: normalizeText(resource.assignmentLabel || resource.assignedTenantCompanyName || resource.assignedDepartmentName || ''),
    assignedTenantCompanyId: normalizeText(resource.assignedTenantCompanyId || ''),
    assignedDepartmentId: normalizeText(resource.assignedDepartmentId || ''),
    locationLabel: normalizeText(resource.locationLabel || [resource.floor, resource.wing].filter(Boolean).join(' ')),
    description: normalizeText(resource.description || ''),
  };
}

function isBookableRoom(room: NormalizedRoom): boolean {
  const hasPricing = Number(room.pricePerHour || 0) > 0 || Number(room.pricePerDay || 0) > 0;
  const hasCredits = Number(room.credits || 0) > 0;
  return (room.type === 'Meeting Room' || room.type === 'Conference Room')
    && normalizeSearchText(room.status) === 'active'
    && hasPricing && hasCredits && !room.currentlyBooked;
}

function getRoomRateLabel(room: NormalizedRoom): string {
  const ratePerHour = getRoomHourlyCreditRate(room);
  return ratePerHour > 0 ? `${ratePerHour} CR / hr` : '0 CR / hr';
}

function getRoomHourlyCreditRate(room: NormalizedRoom): number {
  const credits = Number(room.credits || 0);
  return credits > 0 ? credits : 0;
}

function timeToMinutes(value: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function isAlignedToStep(totalMinutes: number, stepMinutes = BOOKING_SLOT_STEP_MINUTES): boolean {
  return Number.isInteger(totalMinutes) && totalMinutes % stepMinutes === 0;
}

function normalizeDateKey(value: string): string {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isTimeOverlap(existingStart: number, existingEnd: number, incomingStart: number, incomingEnd: number): boolean {
  return incomingStart < existingEnd && incomingEnd > existingStart;
}

function calculateBookingCredits(room: NormalizedRoom, startTime: string, endTime: string): number {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return 0;
  const durationMinutes = endMinutes - startMinutes;
  const ratePerHour = getRoomHourlyCreditRate(room);
  if (ratePerHour <= 0) return 0;
  return Number(((durationMinutes / 60) * ratePerHour).toFixed(2));
}

function minutesToTimeString(totalMinutes = 0): string {
  const boundedMinutes = Math.max(0, Math.min(24 * 60, Number(totalMinutes || 0)));
  const hours = Math.floor(boundedMinutes / 60);
  const minutes = boundedMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function roundUpToStepTime(value: string, stepMinutes = BOOKING_SLOT_STEP_MINUTES): string {
  const totalMinutes = timeToMinutes(value);
  if (totalMinutes === null) return '';
  const roundedMinutes = Math.ceil(totalMinutes / stepMinutes) * stepMinutes;
  if (roundedMinutes >= 24 * 60) return '23:55';
  return minutesToTimeString(roundedMinutes);
}

function buildTimeOptions(minTime = '00:00', maxTime = '23:55', stepMinutes = BOOKING_SLOT_STEP_MINUTES): string[] {
  const minMinutes = Math.max(0, timeToMinutes(minTime) ?? 0);
  const maxMinutes = Math.min((24 * 60) - stepMinutes, timeToMinutes(maxTime) ?? ((24 * 60) - stepMinutes));
  const options: string[] = [];
  for (let minutes = minMinutes; minutes <= maxMinutes; minutes += stepMinutes) {
    options.push(minutesToTimeString(minutes));
  }
  return options;
}

function getCurrentTimeInputValue(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getTodayInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLaterTimeInputValue(...values: string[]): string {
  const validValues = values.map((value) => timeToMinutes(value)).filter((v): v is number => v !== null);
  if (validValues.length === 0) return '';
  return minutesToTimeString(Math.max(...validValues));
}

function getMinimumEndTime(startTime: string): string {
  const startMinutes = timeToMinutes(startTime);
  if (startMinutes === null) return '';
  return minutesToTimeString(startMinutes + BOOKING_MIN_DURATION_MINUTES);
}

function getRoomIcon(room: NormalizedRoom) {
  if (room.type === 'Conference Room') return <Presentation size={18} className="text-indigo-600" />;
  return <Monitor size={18} className="text-blue-600" />;
}

function formatTimeOptionLabel(value: string): string {
  return formatTime12h(value) || value;
}

interface RoomGroup {
  floor: string;
  wing: string;
  rooms: NormalizedRoom[];
}

function getRoomGroupKey(room: NormalizedRoom): string {
  return `${room.floor}::${room.wing}`;
}

interface BookingForm {
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  attendees: number;
  inviteeUserIds: string[];
}

interface InviteeOption {
  userId: string;
  fullName: string;
  role: string;
  designation: string;
  status: string;
}

export default function TenantMeetingRoomBookingPage() {
  const currentUser = getStoredUser() || {};
  const tenantCompanyName = currentUser?.tenantCompanyName || currentUser?.workspaceMembership?.tenantCompanyName || getStoredTenantCompanyName() || 'Tenant Workspace';
  const tenantCompanyId = String(currentUser?.tenantCompanyId || currentUser?.workspaceMembership?.tenantCompanyId || getStoredTenantCompanyId() || '').trim();
  const currentUserId = String(currentUser?.id || currentUser?._id || currentUser?.userId || '').trim();
  const currentUserName = currentUser?.fullName || currentUser?.name || 'Tenant User';

  const [isLoading, setIsLoading] = useState(true);
  const [isInviteesLoading, setIsInviteesLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedWing, setSelectedWing] = useState('all');
  const [selectedType, setSelectedType] = useState('All');
  const [rooms, setRooms] = useState<NormalizedRoom[]>([]);
  const [bookings, setBookings] = useState<Record<string, any>[]>([]);
  const [inviteeOptions, setInviteeOptions] = useState<InviteeOption[]>([]);
  const [tenantCompanies, setTenantCompanies] = useState<Record<string, any>[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<NormalizedRoom | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    date: '',
    startTime: '',
    endTime: '',
    purpose: '',
    attendees: 1,
    inviteeUserIds: [],
  });

  useEffect(() => {
    let isMounted = true;

    async function loadRooms() {
      setIsLoading(true);
      try {
        // ─── Backend calls (uncomment when backend ready) ───
        // const [resourcesResponse, bookingsResponse] = await Promise.all([
        //   getResources(),
        //   getMeetingRoomBookings({ page: 1, limit: 100 }),
        // ]);
        // if (!isMounted) return;
        // const resourceRooms = Array.isArray(resourcesResponse?.data?.resources) ? resourcesResponse.data.resources : [];
        // const normalized = resourceRooms
        //   .map(normalizeResourceRoom)
        //   .filter(Boolean)
        //   .filter((room) => {
        //     if (!isBookableRoom(room)) return false;
        //     if (tenantCompanyId && room.assignedTenantCompanyId && room.assignedTenantCompanyId !== tenantCompanyId) return false;
        //     if (tenantCompanyId && room.assignedDepartmentId) return false;
        //     return true;
        //   }) as NormalizedRoom[];
        // setRooms(normalized);
        // setBookings(Array.isArray(bookingsResponse?.data?.bookings) ? bookingsResponse.data.bookings : []);

        // ⚠️ Placeholder
        await new Promise((resolve) => setTimeout(resolve, 600));
        if (!isMounted) return;
        setRooms([]);
        setBookings([]);
        setErrorMessage('');
      } catch (error: any) {
        if (isMounted) setErrorMessage(error.message || 'Unable to load meeting rooms right now.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadRooms();

    const refreshTimer = window.setInterval(() => { /* refresh stub */ }, 30000);
    return () => { isMounted = false; window.clearInterval(refreshTimer); };
  }, [tenantCompanyId]);

  const currentCompany = useMemo(() => {
    if (!Array.isArray(tenantCompanies) || tenantCompanies.length === 0) return null;
    const matched = tenantCompanies.find((company) => {
      const recordId = String(company?.recordId || company?.id || '').trim();
      const companyId = String(company?.tenantCompanyId || company?.tenantId || '').trim();
      return recordId === tenantCompanyId || companyId === tenantCompanyId;
    });
    return matched || tenantCompanies[0] || null;
  }, [tenantCompanies, tenantCompanyId]);

  const companyCreditsAllocated = Number(currentCompany?.creditsAllocated || currentCompany?.creditsTotal || currentCompany?.packageDetails?.monthlyTotalCredits || 0);
  const companyCreditsUsed = Number(currentCompany?.creditsUsed || 0);
  const companyCreditsRemaining = Number(
    (currentCompany?.creditsRemaining ?? currentCompany?.addOnCredits?.remainingCredits ?? Math.max(0, companyCreditsAllocated - companyCreditsUsed)) || 0,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadInviteeOptions() {
      if (!tenantCompanyId) {
        if (isMounted) { setInviteeOptions([]); setIsInviteesLoading(false); }
        return;
      }

      try {
        // ─── Backend call (uncomment when backend ready) ───
        // const response = await getTenantCompanies();
        // if (!isMounted) return;
        // const tenants = Array.isArray(response?.data?.tenants) ? response.data.tenants : [];
        // setTenantCompanies(tenants);
        // ... employee extraction logic

        await new Promise((resolve) => setTimeout(resolve, 300));
        if (!isMounted) return;
        setInviteeOptions([]);
      } catch {
        if (isMounted) setInviteeOptions([]);
      } finally {
        if (isMounted) setIsInviteesLoading(false);
      }
    }

    loadInviteeOptions();
    return () => { isMounted = false; };
  }, [currentUserId, tenantCompanyId]);

  const availableFloors = useMemo(
    () => Array.from(new Set(rooms.map((room) => room.floor))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [rooms],
  );
  const availableWings = useMemo(
    () => Array.from(new Set(rooms.map((room) => room.wing))).sort(),
    [rooms],
  );

  const visibleRooms = useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    return rooms.filter((room) => {
      const matchesFloor = selectedFloor === 'all' || room.floor === selectedFloor;
      const matchesWing = selectedWing === 'all' || room.wing === selectedWing;
      const matchesType = selectedType === 'All' || room.type === selectedType;
      const matchesSearch = !query
        || normalizeSearchText(room.name).includes(query)
        || normalizeSearchText(room.locationLabel).includes(query)
        || normalizeSearchText(room.assignmentLabel).includes(query)
        || normalizeSearchText(room.description).includes(query);
      return matchesFloor && matchesWing && matchesType && matchesSearch;
    });
  }, [rooms, searchQuery, selectedFloor, selectedType, selectedWing]);

  const inviteeLimit = useMemo(() => {
    if (!selectedRoom) return 0;
    return Math.max(0, Number(selectedRoom.capacity || 0) - 1);
  }, [selectedRoom]);

  const selectedInviteeIds = Array.isArray(bookingForm.inviteeUserIds) ? bookingForm.inviteeUserIds : [];
  const selectedInviteeCount = selectedInviteeIds.length;
  const visibleInviteeOptions = useMemo(
    () => inviteeOptions.filter((employee) => !employee.status || employee.status === 'Active'),
    [inviteeOptions],
  );
  const todayValue = getTodayInputValue();
  const currentTimeValue = getCurrentTimeInputValue();
  const roundedCurrentTimeValue = roundUpToStepTime(currentTimeValue);
  const startTimeOptions = useMemo(
    () => buildTimeOptions(bookingForm.date === todayValue ? roundedCurrentTimeValue : '00:00'),
    [bookingForm.date, roundedCurrentTimeValue, todayValue],
  );
  const endTimeOptions = useMemo(() => {
    const minimumEndTime = getMinimumEndTime(bookingForm.startTime);
    const baseMin = bookingForm.date === todayValue
      ? getLaterTimeInputValue(roundedCurrentTimeValue, minimumEndTime || '')
      : minimumEndTime;
    return buildTimeOptions(baseMin || '00:00');
  }, [bookingForm.date, bookingForm.startTime, roundedCurrentTimeValue, todayValue]);

  const groupedRooms: RoomGroup[] = useMemo(() => {
    const groups = new Map<string, RoomGroup>();
    visibleRooms.forEach((room) => {
      const key = getRoomGroupKey(room);
      if (!groups.has(key)) {
        groups.set(key, { floor: room.floor, wing: room.wing, rooms: [] });
      }
      groups.get(key)!.rooms.push(room);
    });
    return Array.from(groups.values())
      .sort((a, b) => {
        const fc = String(a.floor || '').localeCompare(String(b.floor || ''), undefined, { numeric: true });
        return fc !== 0 ? fc : String(a.wing || '').localeCompare(String(b.wing || ''), undefined, { numeric: true });
      })
      .map((g) => ({
        ...g,
        rooms: g.rooms.sort((a, b) => {
          const tc = a.type.localeCompare(b.type);
          return tc !== 0 ? tc : a.name.localeCompare(b.name);
        }),
      }));
  }, [visibleRooms]);

  const summary = useMemo(() => ({
    total: visibleRooms.length,
    meeting: visibleRooms.filter((r) => r.type === 'Meeting Room').length,
    conference: visibleRooms.filter((r) => r.type === 'Conference Room').length,
    floors: availableFloors.length,
  }), [availableFloors.length, visibleRooms]);

  const normalizedBookings = useMemo(() => bookings.map((b) => ({
    id: String(b?._id || b?.id || ''),
    roomName: normalizeText(b?.roomName),
    dateKey: normalizeDateKey(b?.date),
    startTime: normalizeText(b?.startTime),
    endTime: normalizeText(b?.endTime),
    status: normalizeText(b?.bookingStatus || b?.status || ''),
    bookedByName: normalizeText(b?.bookedByName || ''),
    purpose: normalizeText(b?.purpose || ''),
  })).filter((b) => b.roomName && b.dateKey), [bookings]);

  const selectedRoomConflictBookings = useMemo(() => {
    if (!selectedRoom) return [];
    const selectedRoomName = normalizeText(selectedRoom.name);
    const selectedDateKey = normalizeDateKey(bookingForm.date);
    const incomingStartMinutes = timeToMinutes(bookingForm.startTime);
    const incomingEndMinutes = timeToMinutes(bookingForm.endTime);
    if (!selectedRoomName || !selectedDateKey || incomingStartMinutes === null || incomingEndMinutes === null) return [];
    return normalizedBookings.filter((b) => {
      if (b.roomName !== selectedRoomName || b.dateKey !== selectedDateKey) return false;
      if (b.status === 'cancelled' || b.status === 'canceled') return false;
      const existingStartMinutes = timeToMinutes(b.startTime);
      const existingEndMinutes = timeToMinutes(b.endTime);
      if (existingStartMinutes === null || existingEndMinutes === null) return false;
      return isTimeOverlap(existingStartMinutes, existingEndMinutes, incomingStartMinutes, incomingEndMinutes);
    });
  }, [bookingForm.date, bookingForm.endTime, bookingForm.startTime, normalizedBookings, selectedRoom]);

  const selectedRoomCreditEstimate = useMemo(() => {
    if (!selectedRoom) return 0;
    return calculateBookingCredits(selectedRoom, bookingForm.startTime, bookingForm.endTime);
  }, [bookingForm.endTime, bookingForm.startTime, selectedRoom]);

  const selectedRoomAvailabilityLabel = selectedRoomConflictBookings.length > 0
    ? `${selectedRoomConflictBookings.length} conflicting booking${selectedRoomConflictBookings.length === 1 ? '' : 's'} found`
    : 'Slot available';

  const handleOpenBooking = (room: NormalizedRoom) => {
    setSelectedRoom(room);
    setBookingForm({ date: '', startTime: '', endTime: '', purpose: '', attendees: 1, inviteeUserIds: [] });
  };

  const handleToggleInvitee = (userId: string) => {
    if (!selectedRoom) return;
    setBookingForm((prev) => {
      const existing = Array.isArray(prev.inviteeUserIds) ? prev.inviteeUserIds : [];
      const isSelected = existing.includes(userId);
      const nextInvitees = isSelected ? existing.filter((id) => id !== userId) : [...existing, userId];
      return {
        ...prev,
        inviteeUserIds: nextInvitees,
        attendees: Math.max(Number(prev.attendees || 1), nextInvitees.length + 1),
      };
    });
  };

  const handleCloseBooking = () => {
    setSelectedRoom(null);
    setIsSubmitting(false);
  };

  const handleSubmitBooking = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedRoom) return;

    const todayVal = getTodayInputValue();
    const currentTimeVal = getCurrentTimeInputValue();
    const selectedDateKey = normalizeDateKey(bookingForm.date);
    const currentTimeMinutes = timeToMinutes(currentTimeVal);
    const selectedStartMinutes = timeToMinutes(bookingForm.startTime);
    const selectedEndMinutes = timeToMinutes(bookingForm.endTime);

    if (!bookingForm.date) { setErrorMessage('Date is required.'); return; }
    if (!bookingForm.startTime) { setErrorMessage('Start time is required.'); return; }
    if (!bookingForm.endTime) { setErrorMessage('End time is required.'); return; }
    if (selectedDateKey && selectedDateKey < todayVal) { setErrorMessage('Backdated bookings not allowed.'); return; }
    if (selectedDateKey === todayVal && currentTimeMinutes !== null && selectedStartMinutes !== null && selectedStartMinutes < currentTimeMinutes) {
      setErrorMessage('Choose a start time from the current time onward.'); return;
    }
    if (selectedDateKey === todayVal && currentTimeMinutes !== null && selectedEndMinutes !== null && selectedEndMinutes < currentTimeMinutes) {
      setErrorMessage('Choose an end time from the current time onward.'); return;
    }
    if (!bookingForm.purpose.trim()) { setErrorMessage('Purpose is required.'); return; }
    if (selectedStartMinutes === null || selectedEndMinutes === null || selectedStartMinutes >= selectedEndMinutes) {
      setErrorMessage('End time must be after start time.'); return;
    }
    if (!isAlignedToStep(selectedStartMinutes) || !isAlignedToStep(selectedEndMinutes)) {
      setErrorMessage('Use 5-minute slots only.'); return;
    }
    if (selectedEndMinutes - selectedStartMinutes < BOOKING_MIN_DURATION_MINUTES) {
      setErrorMessage('Minimum booking duration is 30 minutes.'); return;
    }
    if (!bookingForm.attendees || Number(bookingForm.attendees || 0) < 1) {
      setErrorMessage('Attendees is required.'); return;
    }
    if (selectedInviteeCount > inviteeLimit) {
      setErrorMessage(`This room can only invite up to ${inviteeLimit} other employee${inviteeLimit === 1 ? '' : 's'}.`); return;
    }
    if (Number(bookingForm.attendees || 0) < selectedInviteeCount + 1) {
      setErrorMessage('Attendees must include host plus invitees.'); return;
    }
    if (Number(bookingForm.attendees || 0) > Number(selectedRoom.capacity || 0)) {
      setErrorMessage(`This room can only host up to ${selectedRoom.capacity} people.`); return;
    }
    if (selectedRoomConflictBookings.length > 0) {
      setErrorMessage(`Time overlaps with ${selectedRoomConflictBookings.length} existing booking${selectedRoomConflictBookings.length === 1 ? '' : 's'}.`); return;
    }
    if (companyCreditsRemaining > 0 && selectedRoomCreditEstimate > companyCreditsRemaining) {
      setErrorMessage(`Not enough credits. Need ${selectedRoomCreditEstimate.toFixed(2)} CR, have ${companyCreditsRemaining.toFixed(2)} CR.`); return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // ─── Backend call (uncomment when backend ready) ───
      // await createMeetingRoomBooking({
      //   roomName: selectedRoom.name,
      //   date: bookingForm.date,
      //   startTime: bookingForm.startTime,
      //   endTime: bookingForm.endTime,
      //   purpose: bookingForm.purpose.trim(),
      //   attendees: Number(bookingForm.attendees || 1),
      //   inviteeUserIds: selectedInviteeIds,
      //   bookingType: 'Tenant',
      //   bookingSource: 'Tenant Portal',
      //   bookedByName: currentUserName,
      //   bookedByEmail: currentUser?.email || '',
      //   bookedByPhone: currentUser?.phone || currentUser?.mobile || '',
      //   clientCompany: tenantCompanyName,
      //   sourceReference: `tenant-room-booking:${tenantCompanyId || tenantCompanyName}`,
      //   bookingNotes: `Floor ${selectedRoom.floor} Wing ${selectedRoom.wing}`,
      // });
      // toast.success(`${selectedRoom.name} booked successfully.`);

      // ⚠️ Placeholder
      await new Promise((resolve) => setTimeout(resolve, 500));

      handleCloseBooking();
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to create booking.');
      // toast.error(error.message || 'Unable to create booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <CardsGridSkeleton count={6} />;

  const inviteSummaryLabel = selectedInviteeCount > 0
    ? `${selectedInviteeCount} invitee${selectedInviteeCount === 1 ? '' : 's'} selected`
    : 'No invitees selected';

  return (
    <div className="p-6 lg:p-8 bg-[#F8FAFC] min-h-screen text-[#0F172A] font-sans flex flex-col gap-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
              <Calendar size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Tenant Rooms</p>
              <h1 className="text-3xl font-black tracking-tight">Meeting Room Booking</h1>
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 leading-relaxed">
            View only active meeting rooms and conference rooms grouped by floor and wing, then book a slot directly from the tenant portal.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Company</p>
            <p className="text-sm font-black text-slate-900">{tenantCompanyName}</p>
            <p className="text-xs font-bold text-slate-500">{summary.total} available rooms</p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Available Rooms</p>
          <p className="text-3xl font-black text-slate-900">{summary.total}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Meeting Rooms</p>
          <p className="text-3xl font-black text-slate-900">{summary.meeting}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Conference Rooms</p>
          <p className="text-3xl font-black text-slate-900">{summary.conference}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Floors Covered</p>
          <p className="text-3xl font-black text-slate-900">{summary.floors}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-4 lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search room name, floor, wing, or assignment"
              className="w-full min-w-65 md:w-96 px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-[#2563EB] outline-none transition-all"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full xl:w-auto">
            <select value={selectedFloor} onChange={(e) => setSelectedFloor(e.target.value)}
              className="px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-[#2563EB] outline-none transition-all">
              <option value="all">All Floors</option>
              {availableFloors.map((floor) => <option key={floor} value={floor}>{floor}</option>)}
            </select>
            <select value={selectedWing} onChange={(e) => setSelectedWing(e.target.value)}
              className="px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-[#2563EB] outline-none transition-all">
              <option value="all">All Wings</option>
              {availableWings.map((wing) => <option key={wing} value={wing}>{wing}</option>)}
            </select>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-[#2563EB] outline-none transition-all">
              {ROOM_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {ROOM_TYPE_OPTIONS.map((option) => (
            <button key={option} onClick={() => setSelectedType(option)}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-all ${selectedType === option ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200 hover:text-slate-900'}`}>
              {option}
            </button>
          ))}
        </div>

        {groupedRooms.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Calendar size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">No rooms available</h3>
            <p className="text-sm font-medium text-slate-500">Try another floor, wing, or room type.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedRooms.map((group) => (
              <section key={`${group.floor}-${group.wing}`} className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Floor {group.floor}</h2>
                    <p className="text-xs font-bold text-slate-500">Wing {group.wing} \u2022 {group.rooms.length} available room{group.rooms.length === 1 ? '' : 's'}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <MapPin size={14} /> {group.floor} / {group.wing}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {group.rooms.map((room) => (
                    <article key={room.recordId || room.name} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col">
                      <div className="p-5 border-b border-slate-50 bg-slate-50/60 flex items-start justify-between gap-4">
                        <div>
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">{room.type}</div>
                          <h3 className="text-xl font-black text-slate-900 leading-tight">{room.name}</h3>
                          <p className="text-xs font-bold text-slate-500 mt-1">Floor {room.floor} \u2022 Wing {room.wing}</p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">{getRoomIcon(room)}</div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col gap-4">
                        <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-slate-500">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-1.5"><Users size={12} /> {room.capacity} people</span>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-1.5"><Clock size={12} /> {getRoomRateLabel(room)}</span>
                        </div>
                        <div className="space-y-2 text-sm text-slate-600">
                          <div className="flex items-start gap-2"><CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" /><span>Active and available for booking</span></div>
                          <div className="flex items-start gap-2"><Building2 size={14} className="text-blue-500 mt-0.5 shrink-0" /><span>{room.assignmentLabel || 'Shared tenant space'}</span></div>
                          {room.description && (
                            <div className="flex items-start gap-2"><AlertCircle size={14} className="text-slate-400 mt-0.5 shrink-0" /><span>{room.description}</span></div>
                          )}
                        </div>
                      </div>
                      <div className="p-5 pt-0">
                        <button onClick={() => handleOpenBooking(room)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                          <Plus size={14} /> Book Room
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form onSubmit={handleSubmitBooking} className="w-full max-w-2xl rounded-[2.5rem] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Selected Room</p>
                <h2 className="text-2xl font-black text-slate-900 leading-tight mt-1">{selectedRoom.name}</h2>
                <p className="text-sm font-bold text-slate-500 mt-1">Floor {selectedRoom.floor} \u2022 Wing {selectedRoom.wing} \u2022 {selectedRoom.type}</p>
              </div>
              <button onClick={handleCloseBooking} className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-all flex items-center justify-center"><X size={18} /></button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Capacity</p>
                  <p className="text-xl font-black text-slate-900 flex items-center gap-2"><Users size={16} className="text-blue-600" /> {selectedRoom.capacity} people</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Invite Slots</p>
                  <p className="text-xl font-black text-emerald-600 flex items-center gap-2"><CheckCircle2 size={16} /> {inviteeLimit} other employee{inviteeLimit === 1 ? '' : 's'}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Availability</p>
                  <p className={`text-xl font-black flex items-center gap-2 ${selectedRoomConflictBookings.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {selectedRoomConflictBookings.length > 0 ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                    {selectedRoomAvailabilityLabel}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Estimated Credits</p>
                  <p className="text-xl font-black text-slate-900 flex items-center gap-2"><Clock size={16} className="text-indigo-600" />{selectedRoomCreditEstimate.toFixed(2)} CR</p>
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Company Credit Balance</p>
                    <p className="mt-1 text-sm font-bold text-indigo-950">Bookings deduct from allocated company credits. Cancellations refund the same amount.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Remaining</p>
                    <p className="text-xl font-black text-indigo-700">{companyCreditsRemaining.toFixed(2)} CR</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="date" min={todayValue} required value={bookingForm.date}
                      onChange={(e) => setBookingForm((prev) => ({ ...prev, date: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-900 focus:bg-white focus:border-[#2563EB] outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Purpose</label>
                  <input type="text" required value={bookingForm.purpose}
                    onChange={(e) => setBookingForm((prev) => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Team sync, client call, review meeting..."
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-900 focus:bg-white focus:border-[#2563EB] outline-none transition-all" />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Start Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select required value={bookingForm.startTime}
                      onChange={(e) => {
                        const nextStart = e.target.value;
                        const minEnd = getMinimumEndTime(nextStart);
                        setBookingForm((prev) => {
                          const curEndMin = timeToMinutes(prev.endTime);
                          const minEndMin = timeToMinutes(minEnd);
                          const shouldAdjust = !prev.endTime || curEndMin === null || (minEndMin !== null && curEndMin < minEndMin);
                          return { ...prev, startTime: nextStart, endTime: shouldAdjust ? minEnd : prev.endTime };
                        });
                      }}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-900 focus:bg-white focus:border-[#2563EB] outline-none transition-all">
                      <option value="">Select start time</option>
                      {startTimeOptions.map((tv) => <option key={tv} value={tv}>{formatTimeOptionLabel(tv)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">End Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select required value={bookingForm.endTime}
                      onChange={(e) => setBookingForm((prev) => ({ ...prev, endTime: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-900 focus:bg-white focus:border-[#2563EB] outline-none transition-all">
                      <option value="">Select end time</option>
                      {endTimeOptions.map((tv) => <option key={tv} value={tv}>{formatTimeOptionLabel(tv)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Attendees</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="number" min={Math.max(1, selectedInviteeCount + 1)} max={selectedRoom.capacity} required
                      value={bookingForm.attendees}
                      onChange={(e) => setBookingForm((prev) => ({ ...prev, attendees: e.target.value === '' ? ('' as any) : Number(e.target.value) }))}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-900 focus:bg-white focus:border-[#2563EB] outline-none transition-all" />
                  </div>
                  <p className="px-1 text-[11px] font-semibold text-slate-500">Host counts as one seat. Invitees must fit within room capacity.</p>
                </div>
              </div>

              {selectedRoomConflictBookings.length > 0 && (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 md:p-5 space-y-3">
                  <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                    <AlertCircle size={16} /> Existing bookings on this slot
                  </div>
                  <div className="space-y-2">
                    {selectedRoomConflictBookings.map((b) => (
                      <div key={b.id} className="rounded-2xl bg-white border border-rose-100 p-3 text-sm text-slate-700">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-black text-slate-900">{b.bookedByName || 'Another booking'}</p>
                          <p className="text-[11px] font-black uppercase tracking-widest text-rose-600">{b.startTime} - {b.endTime}</p>
                        </div>
                        {b.purpose && <p className="mt-1 text-xs font-semibold text-slate-500">{b.purpose}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 rounded-3xl border border-slate-100 bg-slate-50/80 p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Invite Employees</label>
                    <p className="text-sm font-bold text-slate-500 px-1">Select coworkers to receive the booking invite. The host is included separately.</p>
                  </div>
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">{inviteSummaryLabel}</div>
                </div>

                {isInviteesLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">Loading employee list...</div>
                ) : visibleInviteeOptions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">No additional active employees available.</div>
                ) : inviteeLimit <= 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">This room has no extra capacity for invitees.</div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 max-h-60 overflow-y-auto pr-1">
                    {visibleInviteeOptions.map((employee) => {
                      const isSelected = selectedInviteeIds.includes(employee.userId);
                      const isDisabled = !isSelected && selectedInviteeCount >= inviteeLimit;
                      return (
                        <button key={employee.userId} type="button" onClick={() => handleToggleInvitee(employee.userId)} disabled={isDisabled}
                          className={`rounded-2xl border p-4 text-left transition-all ${isSelected ? 'border-[#2563EB] bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm'} ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-slate-900">{employee.fullName}</p>
                              <p className="text-xs font-bold text-slate-500 mt-1">{employee.designation || employee.role || 'Employee'}</p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#2563EB] bg-[#2563EB] text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                              <CheckCircle2 size={14} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
                Booking will be submitted under <span className="font-black text-slate-900">{currentUserName}</span> for <span className="font-black text-slate-900">{tenantCompanyName}</span>.
                {selectedInviteeCount > 0 && (
                  <span className="block mt-1 font-bold text-slate-500">Inviting {selectedInviteeCount} employee{selectedInviteeCount === 1 ? '' : 's'}.</span>
                )}
              </div>
            </div>

            <div className="p-5 md:p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={handleCloseBooking} type="button" disabled={isSubmitting}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-100 transition-all">CANCEL</button>
              <button type="submit" disabled={isSubmitting || selectedRoomConflictBookings.length > 0}
                className="flex-2 py-3 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-all disabled:opacity-50">
                {isSubmitting ? 'BOOKING...' : selectedRoomConflictBookings.length > 0 ? 'SLOT UNAVAILABLE' : 'CONFIRM BOOKING'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
