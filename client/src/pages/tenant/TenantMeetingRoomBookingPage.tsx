import { useEffect, useMemo, useState, type FormEvent } from 'react';
import PageFrame from '@/components/Pages/PageFrame';
import {
  Calendar, Clock, MapPin, Search, Users, Building2, X, CheckCircle2, AlertCircle, Plus, Presentation, Monitor,
} from 'lucide-react';
import { toast } from 'sonner';
import { CardsGridSkeleton } from '@/components/ui/Skeleton';
import WebsiteFormField from '@/components/WebsiteFormField';
import { formatTime12h } from '@/utils/time';
import { getStoredTenantCompanyId, getStoredTenantCompanyName, getStoredUser } from '@/lib/auth-session';
import { getMeetingRoomBookings, createMeetingRoomBooking } from '@/services/meeting-room-bookings';
import { getMyTenantCompany } from '@/services/tenant-companies';
import { getResources } from '@/services/resources';
import useBusinessHours from '@/hooks/useBusinessHours';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { getWorkspaceDateKey, getWorkspaceTime } from '@/lib/workspaceLocalization';

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
  return normalizeText(value);
}

function normalizeWing(value: unknown): string {
  return normalizeText(value).toUpperCase();
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
  const currentUserName = currentUser?.fullName || currentUser?.name || 'Tenant User';

  // Tenant logins have no primaryWorkspace — the host workspace comes back on
  // the tenant-company payload. Start with whatever is stored and let the
  // company fetch fill it in.
  const [workspaceId, setWorkspaceId] = useState<string>(String(currentUser?.primaryWorkspace || ''));

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
  const [bookingError, setBookingError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
        const [resourcesResponse, bookingsResponse] = await Promise.all([
          getResources(),
          workspaceId ? getMeetingRoomBookings(workspaceId) : Promise.resolve({ bookings: [] }),
        ]);
        if (!isMounted) return;
        const resourceRooms = Array.isArray(resourcesResponse?.data?.data?.resources) ? resourcesResponse.data.data.resources : [];
        const normalized = resourceRooms
          .map(normalizeResourceRoom)
          .filter(Boolean)
          .filter((room) => {
            if (!isBookableRoom(room)) return false;
            if (tenantCompanyId && room.assignedTenantCompanyId && room.assignedTenantCompanyId !== tenantCompanyId) return false;
            if (tenantCompanyId && room.assignedDepartmentId) return false;
            return true;
          }) as NormalizedRoom[];
        setRooms(normalized);
        setBookings(Array.isArray(bookingsResponse?.bookings) ? bookingsResponse.bookings : []);
        setErrorMessage('');
      } catch (error: any) {
        if (isMounted) setErrorMessage(error.message || 'Unable to load meeting rooms right now.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadRooms();

    return () => { isMounted = false; };
    // workspaceId resolves async from the tenant-company fetch — re-run so
    // existing bookings (conflict detection) load once it is known.
  }, [tenantCompanyId, workspaceId]);

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
        const response = await getMyTenantCompany();
        if (!isMounted) return;
        const company = response?.data?.tenant || null;
        setTenantCompanies(company ? [company] : []);
        if (company?.workspaceId) setWorkspaceId((prev) => prev || String(company.workspaceId));
        const employees = Array.isArray(company?.employees) ? company.employees : [];
        const currentUserEmail = (currentUser?.email || '').toLowerCase().trim();
        const mapped: InviteeOption[] = employees
          .filter((emp: Record<string, any>) => emp.status === 'Active' && emp.userId && (emp.email || '').toLowerCase().trim() !== currentUserEmail)
          .map((emp: Record<string, any>) => ({
            userId: String(emp.userId),
            fullName: emp.name || 'Unknown',
            role: emp.tenantRole || emp.role || 'Employee',
            designation: emp.designation || '',
            status: emp.status || 'Active',
          }));
        if (isMounted) setInviteeOptions(mapped);
      } catch {
        if (isMounted) setInviteeOptions([]);
      } finally {
        if (isMounted) setIsInviteesLoading(false);
      }
    }

    loadInviteeOptions();
    return () => { isMounted = false; };
  }, [currentUser?.email, tenantCompanyId]);

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
  const workspacePreferences = useWorkspacePreferences();
  const todayValue = getWorkspaceDateKey(new Date(), workspacePreferences.timezone);
  const currentTimeValue = getWorkspaceTime(new Date(), workspacePreferences.timezone);
  const roundedCurrentTimeValue = roundUpToStepTime(currentTimeValue);
  const businessHours = useBusinessHours();
  const startTimeOptions = useMemo(
    () => buildTimeOptions(
      bookingForm.date === todayValue
        ? getLaterTimeInputValue(roundedCurrentTimeValue, businessHours.start)
        : businessHours.start,
      minutesToTimeString(businessHours.endMinutes - BOOKING_MIN_DURATION_MINUTES),
    ),
    [bookingForm.date, roundedCurrentTimeValue, todayValue, businessHours.start, businessHours.endMinutes],
  );
  const endTimeOptions = useMemo(() => {
    const minimumEndTime = getMinimumEndTime(bookingForm.startTime);
    const baseMin = bookingForm.date === todayValue
      ? getLaterTimeInputValue(roundedCurrentTimeValue, minimumEndTime || '', businessHours.start)
      : getLaterTimeInputValue(minimumEndTime || '', businessHours.start);
    return buildTimeOptions(baseMin || businessHours.start, businessHours.end);
  }, [bookingForm.date, bookingForm.startTime, roundedCurrentTimeValue, todayValue, businessHours.start, businessHours.end]);

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

  // When the chosen slot conflicts, offer the nearest free windows of the same
  // duration in this room — within business hours, and for today never in the past.
  const alternativeSlotSuggestions = useMemo(() => {
    if (!selectedRoom || selectedRoomConflictBookings.length === 0) return [];
    const selectedRoomName = normalizeText(selectedRoom.name);
    const selectedDateKey = normalizeDateKey(bookingForm.date);
    const startMinutes = timeToMinutes(bookingForm.startTime);
    const endMinutes = timeToMinutes(bookingForm.endTime);
    if (!selectedDateKey || startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return [];
    const duration = Math.max(BOOKING_MIN_DURATION_MINUTES, endMinutes - startMinutes);

    const dayBookings = normalizedBookings.filter((b) =>
      b.roomName === selectedRoomName && b.dateKey === selectedDateKey &&
      b.status !== 'cancelled' && b.status !== 'canceled');

    let cursor = businessHours.startMinutes;
    if (selectedDateKey === getWorkspaceDateKey(new Date(), workspacePreferences.timezone)) {
      const nowMinutes = timeToMinutes(roundUpToStepTime(getWorkspaceTime(new Date(), workspacePreferences.timezone)));
      if (nowMinutes !== null) cursor = Math.max(cursor, nowMinutes);
    }
    cursor = Math.ceil(cursor / BOOKING_SLOT_STEP_MINUTES) * BOOKING_SLOT_STEP_MINUTES;

    const slots: Array<{ start: string; end: string }> = [];
    for (let minutes = cursor; minutes + duration <= businessHours.endMinutes; minutes += BOOKING_SLOT_STEP_MINUTES) {
      const slotEnd = minutes + duration;
      const hasConflict = dayBookings.some((b) => {
        const existingStart = timeToMinutes(b.startTime);
        const existingEnd = timeToMinutes(b.endTime);
        if (existingStart === null || existingEnd === null) return false;
        return isTimeOverlap(existingStart, existingEnd, minutes, slotEnd);
      });
      if (!hasConflict) {
        slots.push({ start: minutesToTimeString(minutes), end: minutesToTimeString(slotEnd) });
        if (slots.length === 4) break;
        // Jump past this window so suggestions are distinct, not 5 minutes apart.
        minutes = slotEnd - BOOKING_SLOT_STEP_MINUTES;
      }
    }
    return slots;
  }, [bookingForm.date, bookingForm.endTime, bookingForm.startTime, businessHours.startMinutes, businessHours.endMinutes, normalizedBookings, selectedRoom, selectedRoomConflictBookings.length, workspacePreferences.timezone]);

  const selectedRoomCreditEstimate = useMemo(() => {
    if (!selectedRoom) return 0;
    return calculateBookingCredits(selectedRoom, bookingForm.startTime, bookingForm.endTime);
  }, [bookingForm.endTime, bookingForm.startTime, selectedRoom]);

  const handleOpenBooking = (room: NormalizedRoom) => {
    setSelectedRoom(room);
    setBookingForm({ date: '', startTime: '', endTime: '', purpose: '', attendees: 1, inviteeUserIds: [] });
    setBookingError('');
    setFieldErrors({});
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
    setFieldErrors((prev) => ({ ...prev, attendees: '', invitees: '' }));
  };

  const handleCloseBooking = () => {
    setSelectedRoom(null);
    setIsSubmitting(false);
    setBookingError('');
    setFieldErrors({});
  };

  const handleSubmitBooking = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedRoom) return;

    const todayVal = getWorkspaceDateKey(new Date(), workspacePreferences.timezone);
    const currentTimeVal = getWorkspaceTime(new Date(), workspacePreferences.timezone);
    const selectedDateKey = normalizeDateKey(bookingForm.date);
    const currentTimeMinutes = timeToMinutes(currentTimeVal);
    const selectedStartMinutes = timeToMinutes(bookingForm.startTime);
    const selectedEndMinutes = timeToMinutes(bookingForm.endTime);

    const errors: Record<string, string> = {};
    if (!bookingForm.date) errors.date = 'Date is required.';
    else if (selectedDateKey && selectedDateKey < todayVal) errors.date = 'Backdated bookings are not allowed.';
    if (!bookingForm.startTime) errors.startTime = 'Start time is required.';
    if (!bookingForm.endTime) errors.endTime = 'End time is required.';
    if (selectedDateKey && selectedDateKey >= todayVal && currentTimeMinutes !== null && selectedStartMinutes !== null && selectedDateKey === todayVal && selectedStartMinutes < currentTimeMinutes) {
      errors.startTime = 'Choose a start time from now onward.';
    }
    if (bookingForm.startTime && bookingForm.endTime && selectedStartMinutes !== null && selectedEndMinutes !== null && selectedEndMinutes <= selectedStartMinutes) {
      errors.endTime = 'End time must be after start time.';
    }
    if (bookingForm.startTime && bookingForm.endTime && selectedStartMinutes !== null && selectedEndMinutes !== null && selectedEndMinutes > selectedStartMinutes) {
      if (!isAlignedToStep(selectedStartMinutes) || !isAlignedToStep(selectedEndMinutes)) errors.startTime = 'Use 5-minute slots only.';
      else if (selectedEndMinutes - selectedStartMinutes < BOOKING_MIN_DURATION_MINUTES) errors.endTime = `Minimum duration is ${BOOKING_MIN_DURATION_MINUTES} minutes.`;
    }
    if (!String(bookingForm.purpose || '').trim()) errors.purpose = 'Purpose is required.';
    else if (bookingForm.purpose.trim().length < 3) errors.purpose = 'Purpose must be at least 3 characters.';
    if (!bookingForm.attendees || Number(bookingForm.attendees || 0) < 1) errors.attendees = 'At least 1 attendee (you) is required.';
    else if (Number(bookingForm.attendees || 0) > Number(selectedRoom.capacity || 0)) errors.attendees = `This room can only host up to ${selectedRoom.capacity} people.`;
    else if (Number(bookingForm.attendees || 0) < selectedInviteeCount + 1) errors.attendees = 'Attendees must include you plus every invitee.';
    if (selectedInviteeCount > inviteeLimit) errors.invitees = `This room can only invite up to ${inviteeLimit} other employee${inviteeLimit === 1 ? '' : 's'}.`;

    let blockingError = '';
    if (Object.keys(errors).length === 0) {
      if (selectedRoomConflictBookings.length > 0) {
        blockingError = `Time overlaps with ${selectedRoomConflictBookings.length} existing booking${selectedRoomConflictBookings.length === 1 ? '' : 's'}. Pick one of the free slots below or change the window.`;
      } else if (companyCreditsRemaining > 0 && selectedRoomCreditEstimate > companyCreditsRemaining) {
        blockingError = `Not enough credits. This slot needs ${selectedRoomCreditEstimate.toFixed(2)} CR but only ${companyCreditsRemaining.toFixed(2)} CR remain.`;
      }
    }

    setFieldErrors(errors);
    setBookingError(blockingError);
    if (Object.keys(errors).length > 0 || blockingError) return;

    setIsSubmitting(true);

    try {
      await createMeetingRoomBooking({
        roomId: selectedRoom.recordId,
        start: `${bookingForm.date}T${bookingForm.startTime}:00`,
        end: `${bookingForm.date}T${bookingForm.endTime}:00`,
        purpose: bookingForm.purpose.trim(),
        attendees: Number(bookingForm.attendees || 1),
        inviteeUserIds: selectedInviteeIds,
        bookingType: 'Tenant',
        tenantCompanyId,
        sourceReference: `tenant-room-booking:${tenantCompanyId}`,
        bookedByName: currentUserName,
        bookedByEmail: currentUser?.email || '',
        bookingNotes: `Floor ${selectedRoom.floor} Wing ${selectedRoom.wing}`,
      });

      toast.success(`${selectedRoom.name} booked for ${formatTime12h(bookingForm.startTime)}.`);
      handleCloseBooking();
      if (workspaceId) {
        getMeetingRoomBookings(workspaceId).then((res) => {
          setBookings(Array.isArray(res?.bookings) ? res.bookings : []);
        }).catch(() => {});
      }
    } catch (error: any) {
      setBookingError(error.message || 'Unable to create booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <CardsGridSkeleton count={6} />;

  const inviteSummaryLabel = selectedInviteeCount > 0
    ? `${selectedInviteeCount} invitee${selectedInviteeCount === 1 ? '' : 's'} selected`
    : 'No invitees selected';

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-pmedium text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ── Header ── */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h1 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Meeting Room Booking
              </h1>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Browse active meeting and conference rooms by floor and wing, then book a slot directly from the tenant portal.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-pmedium text-red-600">
              {errorMessage}
            </div>
          )}

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0" data-tour="tenant-rooms-summary">
            {[
              { label: 'Available Rooms', value: summary.total, borderClass: '', iconClass: 'bg-slate-50 text-slate-600', icon: <Building2 size={16} /> },
              { label: 'Meeting Rooms', value: summary.meeting, borderClass: 'border-l-4 border-l-blue-500', iconClass: 'bg-blue-50 text-blue-600', icon: <Monitor size={16} /> },
              { label: 'Conference Rooms', value: summary.conference, borderClass: 'border-l-4 border-l-violet-500', iconClass: 'bg-violet-50 text-violet-600', icon: <Presentation size={16} /> },
              { label: 'Floors Covered', value: summary.floors, borderClass: 'border-l-4 border-l-emerald-500', iconClass: 'bg-emerald-50 text-emerald-600', icon: <MapPin size={16} /> },
            ].map((card) => (
              <div key={card.label} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${card.borderClass}`}>
                <div className="min-w-0">
                  <p className={`text-[10px] font-pmedium uppercase tracking-widest mb-1 ${card.borderClass ? card.iconClass.split(' ').find((cls) => cls.startsWith('text-')) || 'text-slate-400' : 'text-slate-400'}`}>{card.label}</p>
                  <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
                </div>
                <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}>{card.icon}</div>
              </div>
            ))}
          </div>

          {/* ── Data Panel ── */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

            {/* Panel header row: type pills → search → floor/wing/type filters */}
            <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:gap-4 sm:p-4 xl:flex-row xl:items-center lg:p-5">
              <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden" data-tour="tenant-rooms-type-pills">
                {ROOM_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setSelectedType(option)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] sm:text-[12px] font-pmedium transition-all ${
                      selectedType === option ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200' : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="flex w-full flex-wrap items-center gap-3 sm:flex-nowrap xl:w-auto">
                <select value={selectedFloor} onChange={(e) => setSelectedFloor(e.target.value)}
                  data-tour="tenant-rooms-floor-filter"
                  className="min-w-[110px] cursor-pointer appearance-none rounded-lg border border-blue-100 bg-blue-50/50 py-2.5 pl-3 pr-8 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB] shadow-sm outline-none hover:bg-blue-50">
                  <option value="all">All Floors</option>
                  {availableFloors.map((floor) => <option key={floor} value={floor}>{floor}</option>)}
                </select>
                <select value={selectedWing} onChange={(e) => setSelectedWing(e.target.value)}
                  data-tour="tenant-rooms-wing-filter"
                  className="min-w-[100px] cursor-pointer appearance-none rounded-lg border border-blue-100 bg-blue-50/50 py-2.5 pl-3 pr-8 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB] shadow-sm outline-none hover:bg-blue-50">
                  <option value="all">All Wings</option>
                  {availableWings.map((wing) => <option key={wing} value={wing}>{wing}</option>)}
                </select>
                <div className="relative min-w-[180px] flex-1" data-tour="tenant-rooms-search">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Search rooms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-200/60 bg-white py-2.5 pl-9 pr-4 text-[12px] font-pmedium text-[#0F172A] outline-none transition-all placeholder:text-slate-500 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                  />
                </div>
              </div>
            </div>

            {/* Room grid */}
            <div className="flex-1 p-3 sm:p-4 lg:p-5 bg-white/20 overflow-y-auto" data-tour="tenant-rooms-grid">
              {groupedRooms.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <Calendar size={22} />
                  </div>
                  <p className="font-pmedium text-slate-700">No rooms available</p>
                  <p className="text-sm font-pregular text-slate-500 mt-1">Try another floor, wing, or room type.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedRooms.map((group) => (
                    <section key={`${group.floor}-${group.wing}`} className="space-y-3">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100/60 pb-2">
                        <div className="flex items-center gap-2">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <h2 className="text-[12px] font-pmedium uppercase tracking-widest text-slate-700">Floor {group.floor}{group.wing}</h2>
                        </div>
                        <span className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{group.rooms.length} available</span>
                      </div>

                      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {group.rooms.map((room) => (
                          <article key={room.recordId || room.name} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-100/60 bg-slate-50/60 flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="p-2 rounded-2xl bg-white border border-slate-100 shadow-sm shrink-0">{getRoomIcon(room)}</div>
                                <div className="min-w-0">
                                  <h3 className="text-[13px] font-pmedium text-slate-900 leading-tight truncate">{room.name}</h3>
                                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mt-0.5">Floor {room.floor}{room.wing}</p>
                                </div>
                              </div>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-wider ${room.type === 'Conference Room' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>{room.type}</span>
                            </div>
                            <div className="p-4 flex-1 flex flex-col gap-3">
                              <div className="flex items-center gap-2 flex-wrap text-[10px] font-pmedium text-slate-500">
                                <span className="px-2 py-1 rounded-md bg-slate-50 border border-slate-100 flex items-center gap-1"><Users size={11} /> {room.capacity} people</span>
                                <span className="px-2 py-1 rounded-md bg-slate-50 border border-slate-100 flex items-center gap-1"><Clock size={11} /> {getRoomRateLabel(room)}</span>
                              </div>
                              <div className="space-y-1.5 text-[11px] font-pmedium text-slate-600">
                                <div className="flex items-start gap-1.5"><CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" /><span>Available for booking</span></div>
                                {room.description && (
                                  <div className="flex items-start gap-1.5 line-clamp-2"><AlertCircle size={12} className="text-slate-400 mt-0.5 shrink-0" /><span>{room.description}</span></div>
                                )}
                              </div>
                            </div>
                            <div className="px-4 pb-4">
                              <button onClick={() => handleOpenBooking(room)}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#2563EB] text-white font-pmedium text-[10px] uppercase tracking-widest hover:bg-primary/95 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                                <Plus size={12} strokeWidth={3} /> Book Room
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
          </div>
        </div>

        {/* ── Booking modal ── */}
        {selectedRoom && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0F172A]/40 backdrop-blur-sm animate-in fade-in duration-200">
            <form onSubmit={handleSubmitBooking} noValidate className="w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-[2rem] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200 border border-white/70">
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                    <Calendar size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{selectedRoom.type}</p>
                    <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">{selectedRoom.name}</h2>
                    <p className="text-[11px] font-pmedium text-slate-500 mt-0.5">Floor {selectedRoom.floor}{selectedRoom.wing}</p>
                  </div>
                </div>
                <button type="button" onClick={handleCloseBooking} disabled={isSubmitting} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"><X size={16} /></button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-white">
                {/* Snapshot grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400 mb-0.5">Capacity</p>
                    <p className="text-[13px] font-pmedium text-slate-900 flex items-center gap-1.5"><Users size={13} className="text-blue-600" /> {selectedRoom.capacity}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400 mb-0.5">Invite Slots</p>
                    <p className="text-[13px] font-pmedium text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={13} /> {Math.max(0, inviteeLimit - selectedInviteeCount)} / {inviteeLimit} left</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400 mb-0.5">Remaining Credits</p>
                    <p className="text-[13px] font-pmedium text-indigo-700 flex items-center gap-1.5"><Clock size={13} className="text-indigo-500" /> {companyCreditsRemaining.toFixed(2)} CR</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400 mb-0.5">Estimated Credits</p>
                    <p className="text-[13px] font-pmedium text-slate-900 flex items-center gap-1.5"><Clock size={13} className="text-slate-400" /> {selectedRoomCreditEstimate.toFixed(2)} CR</p>
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <WebsiteFormField
                      label="Date"
                      type="date"
                      min={todayValue}
                      required
                      error={!!fieldErrors.date}
                      helperText={fieldErrors.date}
                      value={bookingForm.date}
                      onChange={(e) => {
                        setBookingForm((prev) => ({ ...prev, date: e.target.value }));
                        setFieldErrors((prev) => ({ ...prev, date: '' }));
                        setBookingError('');
                      }}
                    />
                    <WebsiteFormField
                      label="Purpose"
                      required
                      maxLength={120}
                      placeholder="Team sync, client call, review meeting..."
                      error={!!fieldErrors.purpose}
                      helperText={fieldErrors.purpose}
                      value={bookingForm.purpose}
                      onChange={(e) => {
                        setBookingForm((prev) => ({ ...prev, purpose: e.target.value }));
                        setFieldErrors((prev) => ({ ...prev, purpose: '' }));
                        setBookingError('');
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <WebsiteFormField
                      label="Start Time"
                      select
                      required
                      error={!!fieldErrors.startTime}
                      helperText={fieldErrors.startTime}
                      value={bookingForm.startTime}
                      onChange={(e) => {
                        const nextStart = e.target.value;
                        const minEnd = getMinimumEndTime(nextStart);
                        setBookingForm((prev) => {
                          const curEndMin = timeToMinutes(prev.endTime);
                          const minEndMin = timeToMinutes(minEnd);
                          const shouldAdjust = !prev.endTime || curEndMin === null || (minEndMin !== null && curEndMin < minEndMin);
                          return { ...prev, startTime: nextStart, endTime: shouldAdjust ? minEnd : prev.endTime };
                        });
                        setFieldErrors((prev) => ({ ...prev, startTime: '', endTime: '' }));
                        setBookingError('');
                      }}
                    >
                      <option value="">Select start time</option>
                      {startTimeOptions.map((tv) => <option key={tv} value={tv}>{formatTimeOptionLabel(tv)}</option>)}
                    </WebsiteFormField>
                    <WebsiteFormField
                      label="End Time"
                      select
                      required
                      error={!!fieldErrors.endTime}
                      helperText={fieldErrors.endTime}
                      value={bookingForm.endTime}
                      onChange={(e) => {
                        setBookingForm((prev) => ({ ...prev, endTime: e.target.value }));
                        setFieldErrors((prev) => ({ ...prev, endTime: '' }));
                        setBookingError('');
                      }}
                    >
                      <option value="">Select end time</option>
                      {endTimeOptions.map((tv) => <option key={tv} value={tv}>{formatTimeOptionLabel(tv)}</option>)}
                    </WebsiteFormField>
                    <WebsiteFormField
                      label="Attendees (incl. you)"
                      type="number"
                      min={Math.max(1, selectedInviteeCount + 1)}
                      max={selectedRoom.capacity}
                      required
                      error={!!fieldErrors.attendees}
                      helperText={fieldErrors.attendees}
                      value={bookingForm.attendees as any}
                      onChange={(e) => {
                        setBookingForm((prev) => ({ ...prev, attendees: e.target.value === '' ? ('' as any) : Number(e.target.value) }));
                        setFieldErrors((prev) => ({ ...prev, attendees: '' }));
                        setBookingError('');
                      }}
                    />
                  </div>
                </div>

                {/* Conflict block */}
                {selectedRoomConflictBookings.length > 0 && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-rose-700 font-pmedium text-[12px]">
                      <AlertCircle size={15} /> Existing bookings on this slot
                    </div>
                    <div className="space-y-2">
                      {selectedRoomConflictBookings.map((b) => (
                        <div key={b.id} className="rounded-xl bg-white border border-rose-100 p-3 text-[12px] font-pmedium text-slate-700">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-pmedium text-slate-900">{b.bookedByName || 'Another booking'}</p>
                            <p className="text-[11px] font-pmedium uppercase tracking-widest text-rose-600">{formatTime12h(b.startTime)} - {formatTime12h(b.endTime)}</p>
                          </div>
                          {b.purpose && <p className="mt-1 text-[11px] font-pregular text-slate-500">{b.purpose}</p>}
                        </div>
                      ))}
                    </div>
                    {alternativeSlotSuggestions.length > 0 && (
                      <div className="rounded-xl bg-white border border-emerald-100 p-3 space-y-2">
                        <p className="text-[10px] font-pmedium uppercase tracking-widest text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 size={12} /> Available alternatives for this duration
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {alternativeSlotSuggestions.map((slot) => (
                            <button
                              key={`${slot.start}-${slot.end}`}
                              type="button"
                              onClick={() => {
                                setBookingForm((prev) => ({ ...prev, startTime: slot.start, endTime: slot.end }));
                                setBookingError('');
                                setFieldErrors({});
                              }}
                              className="cursor-pointer px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-pmedium hover:bg-emerald-100 active:scale-95 transition-all"
                            >
                              {formatTime12h(slot.start)} – {formatTime12h(slot.end)}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] font-pmedium text-slate-400">Tap a slot to apply it to your booking.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Invite employees */}
                <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Invite Employees</label>
                      <p className="text-[11px] font-pregular text-slate-500 mt-0.5">Select coworkers to receive the booking invite. The host is included separately.</p>
                    </div>
                    <div className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{inviteSummaryLabel}</div>
                  </div>
                  {fieldErrors.invitees && (
                    <p className="text-[10px] font-pmedium text-red-500">{fieldErrors.invitees}</p>
                  )}

                  {isInviteesLoading ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-[12px] font-pmedium text-slate-500">Loading employee list...</div>
                  ) : visibleInviteeOptions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-[12px] font-pmedium text-slate-500">No additional active employees available.</div>
                  ) : inviteeLimit <= 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-[12px] font-pmedium text-slate-500">This room has no extra capacity for invitees.</div>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2 max-h-56 overflow-y-auto pr-1">
                      {visibleInviteeOptions.map((employee) => {
                        const isSelected = selectedInviteeIds.includes(employee.userId);
                        const isDisabled = !isSelected && selectedInviteeCount >= inviteeLimit;
                        return (
                          <button key={employee.userId} type="button" onClick={() => handleToggleInvitee(employee.userId)} disabled={isDisabled}
                            className={`cursor-pointer rounded-xl border p-3 text-left transition-all ${isSelected ? 'border-[#2563EB] bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm'} ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[12px] font-pmedium text-slate-900 truncate">{employee.fullName}</p>
                                <p className="text-[10px] font-pmedium text-slate-500 mt-0.5">{employee.designation || employee.role || 'Employee'}</p>
                              </div>
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-[#2563EB] bg-[#2563EB] text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                                <CheckCircle2 size={12} />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Blocking error inside modal so it's never hidden behind the overlay */}
                {bookingError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-pmedium text-red-600 flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" /> {bookingError}
                  </div>
                )}

                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-[11px] font-pregular text-slate-600">
                  Booking will be submitted under <span className="font-pmedium text-slate-900">{currentUserName}</span>.
                  {selectedInviteeCount > 0 && (
                    <span className="block mt-1 font-pmedium text-slate-500">Inviting {selectedInviteeCount} employee{selectedInviteeCount === 1 ? '' : 's'}.</span>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 sm:p-6 border-t border-slate-100 bg-white flex gap-2">
                <button onClick={handleCloseBooking} type="button" disabled={isSubmitting}
                  className="flex-1 w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest">Cancel</button>
                <button type="submit" disabled={isSubmitting || selectedRoomConflictBookings.length > 0}
                  className="flex-1 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] uppercase tracking-widest hover:bg-primary/95 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-1.5">
                  {isSubmitting ? 'Booking...' : selectedRoomConflictBookings.length > 0 ? 'Slot Unavailable' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        )}
      </PageFrame>
    </div>
  );
}
