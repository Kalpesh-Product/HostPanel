import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search, ChevronDown, Clock, Users, Building,
  Eye, Plus, X, CheckCircle2, AlertCircle, CalendarClock, XCircle, ChevronLeft, ChevronRight, Calendar as CalIcon, Building2,
  AlertTriangle, Briefcase, UserCheck, CreditCard, DollarSign, Phone, Mail, FileText, BarChart3, UserPlus, Globe, Tag, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageFrame from '../../components/Pages/PageFrame';
import { formatTime12h } from '../../utils/time';
import { getEmployeeDisplayName } from '../../utils/user-helpers';
import {
  canAccessAdminDashboard,
  canAccessAdministrationDashboard,
  canAccessFinanceDashboard,
  canAccessHRDashboard,
  canAccessSalesDashboard,
  canAccessTechDashboard,
  canAccessITDashboard,
  canAccessMaintenanceDashboard,
  canAccessEmployeeDashboard,
  getStoredActingManagerContext,
  getStoredUser,
} from '../../lib/auth-session';
import { getOrganizationOverview } from '../../services/organization';
import { axiosPrivate } from '../../utils/axios';
import { getTenantCompanies } from '../../services/tenant-companies';
import {
  createMeetingRoomBooking,
  getMeetingRoomBookings,
  getMyBookings,
  respondToMeetingRoomInvite,
  updateMeetingRoomBooking,
  cancelBooking,
  getExternalClients,
  createExternalClient,
  sendExternalBookingConfirmationEmail,
} from '../../services/meeting-room-bookings';
import { validateEmail, validatePhone, computeExternalPricing, hasSlotConflict, computeAvailableSlots, timeToMinutes as helpersTimeToMinutes } from './externalBookingHelpers';
import { statusPillClass } from '../../lib/status-pill';
import useBusinessHours from '../../hooks/useBusinessHours';


interface StoredUser {
  id?: string;
  _id?: string;
  fullName?: string;
  role?: string;
  department?: string;
  workspaceMembership?: {
    role?: string;
    userId?: string;
    memberUserId?: string;
    memberId?: string;
    departments?: string[];
    department?: string;
  };
  workspace?: {
    department?: string;
    organizationDepartments?: Array<{ name?: string }>;
  };
}

interface ActingContext {
  departmentName?: string;
}

interface RoomDetails {
  _id?: string;
  id?: string;
  name: string;
  type: string;
  floor: string;
  wing: string;
  location: string;
  capacity: number;
  status: string;
  activationReady: boolean;
  credits: number;
  pricePerHour: number;
  pricePerDay: number;
  isActive: boolean;
}

interface Invite {
  bookingId: string;
  invitedUserId: string;
  invitedName?: string;
  invitedRole?: string;
  status: string;
  responseReason?: string;
  roomName?: string;
  department?: string;
  bookedByName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}

interface Booking {
  recordId?: string;
  id?: string;
  roomName: string;
  floor?: string;
  wing?: string;
  location: string;
  roomType?: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  attendees?: number;
  inviteeUserIds: string[];
  checkIn?: string;
  checkOut?: string;
  previousDate?: string;
  previousStartTime?: string;
  previousEndTime?: string;
  scheduleChangeType?: string;
  cancelReason?: string;
  extensionAmount?: number;
  baseAmount?: number;
  gstAmount?: number;
  totalAmount?: number;
  bookingCredits?: number;
  isMe?: boolean;
  isInvitedMeeting?: boolean;
  currentInviteStatus?: string | null;
  inviteResponseReason?: string;
  invites?: Invite[];
  bookedByRole?: string;
  bookingScope?: string;
  status?: string;
  notes?: string;
  roomCapacity?: number;
  liveStatus?: string;
  storedStatus?: string;
  bookingType?: string;
  bookedByName?: string;
  department?: string;
}

interface WorkspaceMember {
  id?: string;
  _id?: string;
  userId?: string;
  email?: string;
  fullName?: string;
  role?: string;
  departments?: string[];
}

interface ExternalClient {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  source: string;
  bookingCount: number;
}

function CardsGridSkeleton({ count = 6, cardHeight = "h-32" }: { count?: number; cardHeight?: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 p-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`bg-slate-200 rounded-xl ${cardHeight}`} />
      ))}
    </div>
  );
}


const MEETING_ROOM_EXTENSION_RATES = {
  Desk: 100,
  'Meeting Room': 500,
  'Conference Room': 1200,
  Cabin: 800,
};

const BOOKING_SLOT_STEP_MINUTES = 5;
const BOOKING_MIN_DURATION_MINUTES = 30;
const DEFAULT_BOOKING_DAY_START = '09:00';
const DEFAULT_BOOKING_DAY_END = '22:00';
const DEFAULT_BOOKING_DAY_START_MINUTES = 9 * 60;
const DEFAULT_BOOKING_DAY_END_MINUTES = 22 * 60;
function normalizeBookingFloor(value: string | number = '') {
  const normalized = String(value || '').trim();
  if (!normalized) return '';

  if (/^\d+$/.test(normalized)) {
    return normalized;
  }

  const compact = normalized.toLowerCase().replace(/\s+/g, '');
  const digitMatch = compact.match(/(\d+)/);
  if (digitMatch?.[1]) {
    return digitMatch[1];
  }

  return normalized;
}

function normalizeBookingWing(value: string | number = '') {
  return String(value || '').trim().toUpperCase();
}

function getMeetingRoomTypeFromName(roomName?: string) {
  const normalized = String(roomName || '').toLowerCase();
  if (normalized.includes('board')) return 'Conference Room';
  if (normalized.includes('conference')) return 'Conference Room';
  if (normalized.includes('cabin')) return 'Cabin';
  if (normalized.includes('desk')) return 'Desk';
  return 'Meeting Room';
}

function normalizeRoomEntry(room: any) {
  return {
    ...room,
    name: room.name || '',
    type: room.type || getMeetingRoomTypeFromName(room.name),
    floor: normalizeBookingFloor(room.floor),
    wing: normalizeBookingWing(room.wing),
    location: String(room.location || '').trim(),
    capacity: Number(room.capacity || 0),
    status: room.status || 'Active',
    activationReady: room.activationReady !== false,
    credits: Number(room.credits || 0),
    pricePerHour: Number(room.pricePerHour || 0),
    pricePerDay: Number(room.pricePerDay || 0),
    isActive: room.isActive !== false,
  };
}

function isMeetingCalendarRoom(room: any) {
  const normalizedType = String(room.type || getMeetingRoomTypeFromName(room.name || '')).trim().toLowerCase();
  return normalizedType.includes('meeting') || normalizedType.includes('conference');
}

function isActiveRoom(room: any) {
  const status = String(room.status || '').toLowerCase();
  return status !== 'under maintenance' && status !== 'disabled' && room.activationReady !== false && room.isActive !== false;
}

function resolveBookingRoomName(booking: any) {
  return String(booking.roomName || booking.resourceName || booking.resource || booking.roomDescription || '').trim();
}

function normalizeIdentity(value?: string) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeRole(value?: string) {
  return (value || '').toString().trim().toLowerCase().replace(/[\s_]+/g, '-');
}

function stringifyId(value?: any) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }

  if (typeof value === 'object') {
    return String(value?._id || value?.id || value?.userId || '').trim();
  }

  return '';
}

function resolveMemberUserId(member?: any) {
  return (
    stringifyId(member?.userId) ||
    stringifyId(member?.user?.id) ||
    stringifyId(member?.user?._id) ||
    stringifyId(member?.workspaceMembership?.userId) ||
    stringifyId(member?.workspaceMembership?.memberUserId) ||
    stringifyId(member?.memberUserId) ||
    stringifyId(member?.linkedUserId) ||
    stringifyId(member?.id) ||
    stringifyId(member?._id)
  );
}

function bookingScopeKey(value?: string) {
  const role = normalizeRole(value);
  if (role === 'owner') {
    return 'owner';
  }
  if (role === 'super-admin') {
    return 'super-admin';
  }
  return 'department';
}

function bookingScopeLabel(value?: string) {
  const scope = bookingScopeKey(value);
  if (scope === 'owner') {
    return 'Founder booking';
  }
  if (scope === 'super-admin') {
    return 'Super admin booking';
  }
  return 'Department booking';
}

function getBookingTagLabel(booking?: any) {
  const bookingType = normalize(booking?.bookingType);
  if (bookingType === 'external') {
    return 'External booking';
  }

  if (bookingType === 'tenant') {
    return 'Tenant booking';
  }

  return bookingScopeLabel(booking?.bookingScope);
}

function getBookingTagBadge(booking?: any) {
  const bookingType = normalize(booking?.bookingType);
  if (bookingType === 'external') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }

  if (bookingType === 'tenant') {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }

  const scope = bookingScopeKey(booking?.bookingScope);
  return bookingScopeBadge(scope);
}

function bookingScopeBadge(scope?: string) {
  if (scope === 'owner') {
    return 'bg-violet-50 text-violet-700 border-violet-200';
  }
  if (scope === 'super-admin') {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function normalize(value?: string) {
  return String(value || '').trim().toLowerCase();
}

function statusLabel(value?: string) {
  const normalized = normalize(value);
  if (normalized.includes('pending')) return 'Pending';
  if (normalized === 'in progress') return 'In Progress';
  if (normalized === 'completed') return 'Completed';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'Cancelled';
  if (normalized === 'rescheduled' || normalized === 'reschedules') return 'Reschedules';
  if (normalized === 'accepted') return 'Accepted';
  if (normalized === 'rejected') return 'Rejected';
  if (normalized === 'declined') return 'Rejected';
  if (normalized === 'active') return 'Active';
  return 'Booked';
}

function statusBadge(status?: string) {
  const normalized = statusLabel(status);
  if (normalized === 'In Progress') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (normalized === 'Pending') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  if (normalized === 'Accepted') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (normalized === 'Rejected') return 'bg-red-50 text-red-700 border-red-200';
  if (normalized === 'Completed') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (normalized === 'Cancelled') return 'bg-red-50 text-red-700 border-red-200';
  if (normalized === 'Reschedules') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (normalized === 'Active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function getMeetingTimeZoneDateParts(value?: any) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const normalized = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (!normalized.year || !normalized.month || !normalized.day) {
    return null;
  }

  return {
    year: normalized.year,
    month: normalized.month,
    day: normalized.day,
  };
}

function getMeetingClockParts(now: Date = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const normalized = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (!normalized.year || !normalized.month || !normalized.day || !normalized.hour || !normalized.minute) {
    return null;
  }

  return {
    dateKey: `${normalized.year}-${normalized.month}-${normalized.day}`,
    minutes: Number(normalized.hour) * 60 + Number(normalized.minute),
  };
}

function timeToMinutes(value?: string) {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTimeString(value: number) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '';
  }

  const normalized = ((Number(value) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function roundUpToStepTime(value: string = '', stepMinutes: number = BOOKING_SLOT_STEP_MINUTES) {
  const totalMinutes = timeToMinutes(value);
  if (totalMinutes === null) {
    return '';
  }

  const roundedMinutes = Math.ceil(totalMinutes / stepMinutes) * stepMinutes;
  if (roundedMinutes >= 24 * 60) {
    return '23:55';
  }

  return minutesToTimeString(roundedMinutes);
}

function buildTimeOptions(minTime: string = '00:00', maxTime: string = '23:55', stepMinutes: number = BOOKING_SLOT_STEP_MINUTES) {
  const minMinutes = Math.max(0, timeToMinutes(minTime) ?? 0);
  const maxMinutes = Math.min((24 * 60) - stepMinutes, timeToMinutes(maxTime) ?? ((24 * 60) - stepMinutes));
  const options: string[] = [];

  for (let minutes = minMinutes; minutes <= maxMinutes; minutes += stepMinutes) {
    options.push(minutesToTimeString(minutes));
  }

  return options;
}

function isAlignedToStep(totalMinutes: number, stepMinutes: number = BOOKING_SLOT_STEP_MINUTES) {
  return Number.isInteger(totalMinutes) && totalMinutes % stepMinutes === 0;
}

function getBookingTimeValidation(
  dateValue: any,
  startTimeValue: any,
  endTimeValue: any,
  dayStartMinutes: number = DEFAULT_BOOKING_DAY_START_MINUTES,
  dayEndMinutes: number = DEFAULT_BOOKING_DAY_END_MINUTES,
) {
  if (!dateValue || !startTimeValue) {
    return { valid: true, reason: '' };
  }

  const bookingDateParts = getMeetingTimeZoneDateParts(dateValue);
  const currentClock = getMeetingClockParts();
  const startMinutes = timeToMinutes(startTimeValue);

  if (!bookingDateParts || !currentClock || startMinutes === null) {
    return { valid: false, reason: 'Choose a valid future booking date and time.' };
  }

  const bookingDateKey = `${bookingDateParts.year}-${bookingDateParts.month}-${bookingDateParts.day}`;
  if (bookingDateKey < currentClock.dateKey) {
    return { valid: false, reason: 'Backdated bookings are not allowed. Choose a future date.' };
  }

  if (bookingDateKey === currentClock.dateKey && startMinutes <= currentClock.minutes) {
    return { valid: false, reason: 'That time has already passed. Choose another slot for today.' };
  }

  if (!isAlignedToStep(startMinutes)) {
    return { valid: false, reason: 'Use 5-minute slots only (for example 12:20, 12:25, 12:30).' };
  }

  if (startMinutes < dayStartMinutes || startMinutes >= dayEndMinutes) {
    return { valid: false, reason: `Bookings are available from ${formatTime12h(minutesToTimeString(dayStartMinutes))} to ${formatTime12h(minutesToTimeString(dayEndMinutes))} only.` };
  }

  if (endTimeValue) {
    const endMinutes = timeToMinutes(endTimeValue);
    if (endMinutes === null) {
      return { valid: false, reason: 'Choose a valid end time.' };
    }

    if (!isAlignedToStep(endMinutes)) {
      return { valid: false, reason: 'Use 5-minute slots only (for example 12:20, 12:25, 12:30).' };
    }

    if (endMinutes <= startMinutes) {
      return { valid: false, reason: 'End time must be after start time.' };
    }

    if (endMinutes > dayEndMinutes) {
      return { valid: false, reason: `Bookings must end by ${formatTime12h(minutesToTimeString(dayEndMinutes))}.` };
    }

    if (endMinutes - startMinutes < BOOKING_MIN_DURATION_MINUTES) {
      return { valid: false, reason: 'Minimum booking duration is 30 minutes.' };
    }
  }

  return { valid: true, reason: '' };
}

function deriveLiveMeetingStatus(booking: any, now: Date = new Date()) {
  if (!booking) {
    return 'booked';
  }

  const storedStatus = booking.storedStatus || booking.status || 'booked';
  if (storedStatus === 'cancelled') {
    return 'cancelled';
  }

  const bookingDateParts = getMeetingTimeZoneDateParts(booking.date);
  const currentClock = getMeetingClockParts(now);
  const startMinutes = timeToMinutes(booking.startTime);
  const endMinutes = timeToMinutes(booking.endTime);

  if (!bookingDateParts || !currentClock || startMinutes === null || endMinutes === null) {
    return storedStatus;
  }

  const bookingDateKey = `${bookingDateParts.year}-${bookingDateParts.month}-${bookingDateParts.day}`;

  if (currentClock.dateKey < bookingDateKey) {
    return 'booked';
  }

  if (currentClock.dateKey > bookingDateKey) {
    return 'completed';
  }

  if (currentClock.minutes < startMinutes) {
    return 'booked';
  }

  if (currentClock.minutes < endMinutes) {
    return 'in progress';
  }

  return 'completed';
}

function normalizeBooking(booking: any, currentUserId: string): Booking {
  const roomName = resolveBookingRoomName(booking);
  const invites = Array.isArray(booking.invites)
    ? booking.invites.map((invite: any) => ({
      ...invite,
      invitedUserId: invite?.invitedUserId ? String(invite.invitedUserId) : '',
    }))
    : [];
  const currentInvite = invites.find((invite: any) => invite.invitedUserId === String(currentUserId)) || null;
  const liveStatus = booking.liveStatus || booking.bookingStatus || deriveLiveMeetingStatus(booking);

  return {
    ...booking,
    recordId: String(booking.recordId || booking._id || booking.id || ''),
    id: String(booking.id || booking._id || booking.recordId || ''),
    checkIn: booking.checkIn || booking.startTime,
    checkOut: booking.checkOut || booking.endTime,
    previousDate: booking.previousDate || '',
    previousStartTime: booking.previousStartTime || '',
    previousEndTime: booking.previousEndTime || '',
    scheduleChangeType: booking.scheduleChangeType || '',
    cancelReason: booking.cancelReason || '',
    extensionAmount: Number(booking.extensionAmount || 0),
    baseAmount: Number(booking.baseAmount || 0),
    gstAmount: Number(booking.gstAmount || 0),
    totalAmount: Number(booking.totalAmount || 0),
    isMe: Boolean(booking.isMe),
    isInvitedMeeting: Boolean(booking.isInvitedMeeting || currentInvite),
    currentInviteStatus: booking.currentInviteStatus || currentInvite?.status || null,
    inviteResponseReason: booking.inviteResponseReason || currentInvite?.responseReason || '',
    invites,
    bookedByRole: booking.bookedByRole || '',
    bookingScope: booking.bookingScope || bookingScopeKey(booking.bookedByRole),
    roomName,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status || 'booked',
    liveStatus,
    storedStatus: booking.storedStatus || booking.status || '',
  };
}

function getExternalClientName(booking: any): string {
  return String(
    booking?.bookedForName ||
    booking?.externalClientName ||
    booking?.clientName ||
    booking?.bookedByName ||
    '',
  ).trim();
}

function getBookingAttendeeCount(data: any) {
  const inviteCount = Array.isArray(data?.inviteeUserIds) ? data.inviteeUserIds.length : 0;
  const explicitCount = Number(data?.attendees || 0);

  if (explicitCount > 0) {
    return explicitCount;
  }

  return inviteCount + 1;
}

function getBookingDisplayStatus(booking: any) {
  if (!booking) {
    return 'booked';
  }

  return booking.liveStatus || booking.status || 'booked';
}

function isRescheduledBooking(booking: any) {
  return normalize(booking?.status) === 'rescheduled' || normalize(booking?.storedStatus) === 'rescheduled';
}

function isPendingCurrentUserInvite(booking: any) {
  return booking?.currentInviteStatus === 'pending';
}

function isAcceptedCurrentUserInvite(booking: any) {
  return booking?.currentInviteStatus === 'accepted';
}

function isRejectedCurrentUserInvite(booking: any) {
  return booking?.currentInviteStatus === 'rejected';
}

// ─────────────────────────────────────────────────────────────────────────────
// ClientDetailsTab — Task 9: Search, select, and "Add New Client" flow
// ─────────────────────────────────────────────────────────────────────────────

interface ClientDetailsTabProps {
  workspaceId: string;
  clientMode: 'search' | 'new';
  setClientMode: (mode: 'search' | 'new') => void;
  clientSearch: string;
  setClientSearch: (v: string) => void;
  clientSearchResults: ExternalClient[];
  setClientSearchResults: (r: ExternalClient[]) => void;
  selectedClient: ExternalClient | null;
  setSelectedClient: (c: ExternalClient | null) => void;
  newClientForm: { name: string; email: string; phone: string; company: string };
  setNewClientForm: (f: { name: string; email: string; phone: string; company: string }) => void;
  clientErrors: Record<string, string>;
  setClientErrors: (e: Record<string, string>) => void;
  setErrorMessage: (m: string) => void;
  setActiveDialogTab: (tab: 'client' | 'booking') => void;
}

function ClientDetailsTab({
  workspaceId,
  clientMode,
  setClientMode,
  clientSearch,
  setClientSearch,
  clientSearchResults,
  setClientSearchResults,
  selectedClient,
  setSelectedClient,
  newClientForm,
  setNewClientForm,
  clientErrors,
  setClientErrors,
  setErrorMessage,
  setActiveDialogTab,
}: ClientDetailsTabProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search — fires 300ms after the user stops typing if ≥ 2 chars
  const handleSearchChange = useCallback(
    (value: string) => {
      setClientSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.length < 2) {
        setClientSearchResults([]);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        try {
          const results = await getExternalClients(workspaceId, value);
          setClientSearchResults(Array.isArray(results) ? results : []);
        } catch {
          setClientSearchResults([]);
        }
      }, 300);
    },
    [workspaceId, setClientSearch, setClientSearchResults],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSelectClient = (client: ExternalClient) => {
    setSelectedClient(client);
    setClientSearch('');
    setClientSearchResults([]);
    setClientMode('search');
    setClientErrors({});
  };

  const handleClearSelection = () => {
    setSelectedClient(null);
    setClientSearch('');
    setClientSearchResults([]);
    setClientErrors({});
  };

  const handleAddNew = () => {
    setClientMode('new');
    setSelectedClient(null);
    setClientErrors({});
  };

  const handleNewFormChange = (field: keyof typeof newClientForm, value: string) => {
    setNewClientForm({ ...newClientForm, [field]: value });
    // Clear the field error when user starts typing
    if (clientErrors[field]) {
      setClientErrors({ ...clientErrors, [field]: '' });
    }
  };

  const handleEmailBlur = () => {
    if (newClientForm.email && !validateEmail(newClientForm.email)) {
      setClientErrors({ ...clientErrors, email: 'Please enter a valid email address.' });
    } else {
      const { email: _e, ...rest } = clientErrors;
      void _e;
      setClientErrors(rest);
    }
  };

  const handlePhoneBlur = () => {
    if (newClientForm.phone && !validatePhone(newClientForm.phone)) {
      setClientErrors({ ...clientErrors, phone: 'Please enter a valid phone number (10 digits).' });
    } else {
      const { phone: _p, ...rest } = clientErrors;
      void _p;
      setClientErrors(rest);
    }
  };

  const handleConfirmClient = async () => {
    if (clientMode === 'search') {
      if (!selectedClient) {
        setClientErrors({ ...clientErrors, general: 'Please select or create a client.' });
        return;
      }
      setActiveDialogTab('booking');
      return;
    }

    // clientMode === 'new' — validate all required fields
    const errors: Record<string, string> = {};
    if (!newClientForm.name.trim()) errors.name = 'Name is required.';
    if (!newClientForm.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!validateEmail(newClientForm.email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!newClientForm.phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (!validatePhone(newClientForm.phone)) {
      errors.phone = 'Please enter a valid phone number (10 digits).';
    }

    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      return;
    }

    setIsConfirming(true);
    setErrorMessage('');
    try {
      const created = await createExternalClient({
        workspaceId,
        name: newClientForm.name.trim(),
        email: newClientForm.email.trim(),
        phone: newClientForm.phone.trim(),
        company: newClientForm.company.trim() || undefined,
      });
      setSelectedClient(created);
      setClientErrors({});
      setActiveDialogTab('booking');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create client. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsConfirming(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl font-pmedium text-[13px] text-[#0F172A] placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all';

  return (
    <div className="flex flex-col gap-4">

      {/* ── Selected client display ── */}
      {selectedClient && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-[13px] font-pmedium text-emerald-800">{selectedClient.name}</p>
            <p className="text-[11px] text-emerald-600">{selectedClient.email}</p>
            {selectedClient.phone && (
              <p className="text-[11px] text-emerald-600">{selectedClient.phone}</p>
            )}
            {selectedClient.company && (
              <p className="text-[11px] text-emerald-500">{selectedClient.company}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            title="Clear selection"
            className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 hover:bg-red-100 text-emerald-600 hover:text-red-500 transition-colors shrink-0 mt-0.5"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* ── Search input (shown when no client selected) ── */}
      {!selectedClient && clientMode === 'search' && (
        <div className="relative">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search client by name, email, or phone…"
              className={`${inputClass} pl-9`}
            />
          </div>

          {/* Dropdown results */}
          {clientSearchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {clientSearchResults.map((client) => (
                <button
                  key={client._id}
                  type="button"
                  onClick={() => handleSelectClient(client)}
                  className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                >
                  <p className="text-[13px] font-pmedium text-[#0F172A]">{client.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {client.email}
                    {client.phone ? ` · ${client.phone}` : ''}
                    {client.company ? ` · ${client.company}` : ''}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* No results hint */}
          {clientSearch.length >= 2 && clientSearchResults.length === 0 && (
            <p className="mt-2 text-[11px] text-slate-400 px-1">
              No clients found. Use "Add New Client" to create one.
            </p>
          )}
        </div>
      )}

      {/* ── "Add New Client" button ── */}
      {!selectedClient && clientMode === 'search' && (
        <button
          type="button"
          onClick={handleAddNew}
          className="flex items-center gap-2 text-[13px] font-pmedium text-[#2563EB] hover:text-blue-700 transition-colors self-start"
        >
          <UserPlus size={15} strokeWidth={2.5} />
          Add New Client
        </button>
      )}

      {/* ── Inline new client form ── */}
      {clientMode === 'new' && !selectedClient && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-pmedium uppercase tracking-widest text-slate-500">
              New Client Details
            </p>
            <button
              type="button"
              onClick={() => { setClientMode('search'); setClientErrors({}); }}
              className="text-[11px] font-pmedium text-slate-400 hover:text-slate-600 transition-colors"
            >
              ← Back to search
            </button>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={newClientForm.name}
              onChange={(e) => handleNewFormChange('name', e.target.value)}
              placeholder="Full name *"
              className={inputClass}
            />
            {clientErrors.name && (
              <p className="text-[11px] text-red-500 px-1">{clientErrors.name}</p>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <input
              type="email"
              value={newClientForm.email}
              onChange={(e) => handleNewFormChange('email', e.target.value)}
              onBlur={handleEmailBlur}
              placeholder="Email address *"
              className={inputClass}
            />
            {clientErrors.email && (
              <p className="text-[11px] text-red-500 px-1">{clientErrors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1">
            <input
              type="tel"
              value={newClientForm.phone}
              onChange={(e) => handleNewFormChange('phone', e.target.value)}
              onBlur={handlePhoneBlur}
              placeholder="Phone number * (10 digits)"
              className={inputClass}
            />
            {clientErrors.phone && (
              <p className="text-[11px] text-red-500 px-1">{clientErrors.phone}</p>
            )}
          </div>

          {/* Company (optional) */}
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={newClientForm.company}
              onChange={(e) => handleNewFormChange('company', e.target.value)}
              placeholder="Company (optional)"
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* ── General error (no client selected on confirm attempt) ── */}
      {clientErrors.general && (
        <p className="text-[11px] text-red-500 px-1">{clientErrors.general}</p>
      )}

      {/* ── Confirm Client button ── */}
      {!selectedClient && (
        <button
          type="button"
          disabled={isConfirming}
          onClick={handleConfirmClient}
          className="w-full px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isConfirming
            ? 'Saving…'
            : clientMode === 'new'
              ? 'Confirm Client'
              : 'Continue with Selected Client'}
        </button>
      )}

      {/* ── Already confirmed — advance to booking ── */}
      {selectedClient && (
        <button
          type="button"
          onClick={() => setActiveDialogTab('booking')}
          className="w-full px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 transition-all"
        >
          Continue to Booking Details →
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ExternalBookingDialog — Task 8: Skeleton, state, and tab bar
// ─────────────────────────────────────────────────────────────────────────────

interface ExternalBookingDialogProps {
  open: boolean;
  onClose: () => void;
  roomCatalog: RoomDetails[];
  allBookings: Booking[];
  workspaceId: string;
  managerName: string;
  onSuccess: () => Promise<void>;
}

function ExternalBookingDialog({
  open,
  onClose,
  roomCatalog,
  allBookings,
  workspaceId,
  managerName,
  onSuccess,
}: ExternalBookingDialogProps) {
  const businessHours = useBusinessHours();
  const BOOKING_DAY_START = businessHours.start;
  const BOOKING_DAY_END = businessHours.end;
  const BOOKING_DAY_START_MINUTES = businessHours.startMinutes;
  const BOOKING_DAY_END_MINUTES = businessHours.endMinutes;

  // ── Tab navigation ──────────────────────────────────────────────────────────
  const [activeDialogTab, setActiveDialogTab] = useState<'client' | 'booking'>('client');

  // ── Client state ────────────────────────────────────────────────────────────
  const [clientMode, setClientMode] = useState<'search' | 'new'>('search');
  const [clientSearch, setClientSearch] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState<ExternalClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<ExternalClient | null>(null);
  const [newClientForm, setNewClientForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  // ── Booking state ───────────────────────────────────────────────────────────
  const [bookingForm, setBookingForm] = useState({
    resourceId: '',
    resourceName: '',
    resourceType: '',
    floor: '',
    wing: '',
    date: '',
    startTime: '',
    endTime: '',
    purpose: '',
    notes: '',
    paymentMode: '',
    paymentStatus: 'Pending',
    transactionId: '',
    paymentProofFile: null as File | null,
    discountType: 'flat' as 'flat' | 'percent',
    discountValue: '',
  });
  const [bookingErrors, setBookingErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ── Resource filter state (Task 10) ────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState('');
  const [wingFilter, setWingFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');

  // Filtered resource list for the resource selector
  const filteredResources = useMemo(() => {
    return roomCatalog.filter((r) => {
      if (!isActiveRoom(r)) return false;
      if (typeFilter && r.type !== typeFilter) return false;
      if (floorFilter && r.floor !== floorFilter) return false;
      if (wingFilter && r.wing !== wingFilter) return false;
      return true;
    });
  }, [roomCatalog, typeFilter, floorFilter, wingFilter]);

  // Distinct filter option lists derived from full catalog
  const distinctTypes = useMemo(() => Array.from(new Set(roomCatalog.map((r) => r.type).filter(Boolean))).sort(), [roomCatalog]);
  const distinctFloors = useMemo(() => Array.from(new Set(roomCatalog.map((r) => r.floor).filter(Boolean))).sort(), [roomCatalog]);
  const distinctWings = useMemo(() => Array.from(new Set(roomCatalog.map((r) => r.wing).filter(Boolean))).sort(), [roomCatalog]);

  // Selected resource for pricing helper text
  const selectedResource = useMemo(
    () => roomCatalog.find((r) => r.name === bookingForm.resourceName) ?? null,
    [roomCatalog, bookingForm.resourceName],
  );

  // Reactive pricing computation
  const externalPricing = useMemo(() => {
    const pricePerHour = selectedResource?.pricePerHour ?? 0;
    return computeExternalPricing(
      pricePerHour,
      bookingForm.startTime,
      bookingForm.endTime,
      bookingForm.discountType,
      bookingForm.discountValue,
    );
  }, [
    selectedResource,
    bookingForm.startTime,
    bookingForm.endTime,
    bookingForm.discountType,
    bookingForm.discountValue,
  ]);

  // Discount validation — runs whenever discount inputs or base price change
  useEffect(() => {
    if (!bookingForm.discountValue || Number(bookingForm.discountValue) === 0) {
      if (bookingErrors.discount) setBookingErrors((prev) => { const n = { ...prev }; delete n.discount; return n; });
      return;
    }
    const rawVal = Number(bookingForm.discountValue);
    if (bookingForm.discountType === 'percent') {
      if (rawVal < 0 || rawVal > 100) {
        setBookingErrors((prev) => ({ ...prev, discount: 'Discount percentage must be between 0 and 100.' }));
      } else {
        setBookingErrors((prev) => { const n = { ...prev }; delete n.discount; return n; });
      }
    } else {
      if (rawVal > externalPricing.basePriceRaw && externalPricing.basePriceRaw > 0) {
        setBookingErrors((prev) => ({ ...prev, discount: 'Discount cannot exceed the base price.' }));
      } else {
        setBookingErrors((prev) => { const n = { ...prev }; delete n.discount; return n; });
      }
    }
  }, [bookingForm.discountValue, bookingForm.discountType, externalPricing.basePriceRaw, bookingErrors.discount]);

  // ── Slot conflict detection (Task 15) ───────────────────────────────────────
  const externalSlotConflict = useMemo(() => {
    if (!bookingForm.resourceName || !bookingForm.date || !bookingForm.startTime || !bookingForm.endTime) return false;
    return hasSlotConflict(allBookings, bookingForm.resourceName, bookingForm.date, bookingForm.startTime, bookingForm.endTime);
  }, [allBookings, bookingForm.resourceName, bookingForm.date, bookingForm.startTime, bookingForm.endTime]);

  // Available slot suggestions (only computed when conflict is active)
  const externalSlotSuggestions = useMemo(() => {
    if (!externalSlotConflict || !bookingForm.resourceName || !bookingForm.date || !bookingForm.startTime || !bookingForm.endTime) return [];
    const startMin = helpersTimeToMinutes(bookingForm.startTime);
    const endMin = helpersTimeToMinutes(bookingForm.endTime);
    if (startMin === null || endMin === null || endMin <= startMin) return [];
    const desiredDuration = endMin - startMin;
    const suggestions = computeAvailableSlots(allBookings, bookingForm.resourceName, bookingForm.date, desiredDuration, BOOKING_DAY_START_MINUTES, BOOKING_DAY_END_MINUTES);
    return suggestions.slice(0, 6); // show max 6 chips
  }, [externalSlotConflict, allBookings, bookingForm.resourceName, bookingForm.date, bookingForm.startTime, bookingForm.endTime, BOOKING_DAY_START_MINUTES, BOOKING_DAY_END_MINUTES]);

  // Reset all state when dialog closes
  const handleClose = () => {
    setActiveDialogTab('client');
    setClientMode('search');
    setClientSearch('');
    setClientSearchResults([]);
    setSelectedClient(null);
    setNewClientForm({ name: '', email: '', phone: '', company: '' });
    setClientErrors({});
    setBookingForm({
      resourceId: '',
      resourceName: '',
      resourceType: '',
      floor: '',
      wing: '',
      date: '',
      startTime: '',
      endTime: '',
      purpose: '',
      notes: '',
      paymentMode: '',
      paymentStatus: 'Pending',
      transactionId: '',
      paymentProofFile: null,
      discountType: 'flat',
      discountValue: '',
    });
    setBookingErrors({});
    setIsSaving(false);
    setErrorMessage('');
    onClose();
  };

  // ── Submit handler ─────────────────────────────────────────────────────────
  const handleDialogSubmit = async () => {
    // Validate all required fields
    const errors: Record<string, string> = {};

    if (!bookingForm.resourceName) errors.resource = 'Please select a resource.';
    if (!bookingForm.date) errors.date = 'Date is required.';
    if (!bookingForm.startTime) errors.startTime = 'Start time is required.';
    if (!bookingForm.endTime) errors.endTime = 'End time is required.';
    if (!bookingForm.purpose.trim()) errors.purpose = 'Purpose is required.';
    if (!bookingForm.paymentMode) errors.paymentMode = 'Please select a payment mode.';
    if (bookingForm.paymentMode !== 'Cash' && !bookingForm.transactionId.trim()) errors.transactionId = 'Transaction / UTR number is required.';
    if (bookingForm.paymentMode !== 'Cash' && !bookingForm.paymentProofFile) errors.paymentProofFile = 'Upload the GPay payment screenshot.';

    // Time validation
    const timeValidation = getBookingTimeValidation(bookingForm.date, bookingForm.startTime, bookingForm.endTime, BOOKING_DAY_START_MINUTES, BOOKING_DAY_END_MINUTES);
    if (!timeValidation.valid) {
      if (timeValidation.reason.includes('date')) errors.date = timeValidation.reason;
      else if (timeValidation.reason.includes('time') || timeValidation.reason.includes('passed')) errors.startTime = timeValidation.reason;
      else errors.endTime = timeValidation.reason;
    }

    if (Object.keys(errors).length > 0) {
      setBookingErrors((prev) => ({ ...prev, ...errors }));
      return;
    }

    if (!selectedClient) {
      setErrorMessage('Please select or create a client first.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      // Find the room to get its ID
      const room = roomCatalog.find((r) => r.name === bookingForm.resourceName);
      if (!room) throw new Error('Selected resource not found. Please reselect.');

      const roomId = String(room._id ?? room.id ?? '');
      const start = `${bookingForm.date}T${bookingForm.startTime}:00+05:30`;
      const end = `${bookingForm.date}T${bookingForm.endTime}:00+05:30`;

      await createMeetingRoomBooking({
        bookingType: 'External',
        roomId,
        roomName: room.name,
        bookedByName: managerName,
        bookedForName: selectedClient.name,
        externalClientId: selectedClient._id,
        start,
        end,
        attendees: 1,
        purpose: bookingForm.purpose.trim(),
        bookingNotes: bookingForm.notes.trim() || '',
        baseAmount: externalPricing.basePriceRaw,
        gstAmount: externalPricing.gstAmount,
        totalAmount: externalPricing.totalAmount,
        discountType: bookingForm.discountType,
        discountValue: Number(bookingForm.discountValue) || 0,
        paymentMode: bookingForm.paymentMode,
        paymentStatus: 'Paid',
        transactionId: bookingForm.transactionId || '',
        paymentProof: bookingForm.paymentProofFile,
      } as any);

      await onSuccess();
      handleClose();
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Failed to create booking.';
      if (status === 409) {
        setBookingErrors((prev) => ({ ...prev, endTime: 'This resource is already booked for the selected time slot.' }));
      } else if (status === 422) {
        setErrorMessage('Client not found in this workspace.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm"
          />

          {/* Dialog panel */}
          <motion.div
            initial={{ y: '100%', opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: '100%', opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-t-[32px] md:rounded-[32px] w-full md:max-w-4xl max-h-[92vh] md:max-h-[88vh] shadow-2xl relative z-[90] flex flex-col overflow-hidden font-pmedium"
          >
            {/* Mobile drag indicator */}
            <div className="w-full flex justify-center py-3 md:hidden">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 py-4 md:p-8 flex justify-between items-start gap-4 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
              <div>
                <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">New Booking</p>
                <h2 className="mt-1 text-xl md:text-2xl font-pmedium text-primary tracking-tight">
                  External Booking
                </h2>
                <p className="text-[11px] font-pmedium text-slate-400 uppercase tracking-widest mt-1">
                  Walk-in / External visitor
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-10 h-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors shadow-sm border border-slate-200"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-4 sm:py-6 md:px-5 md:py-8 flex flex-col gap-5 bg-slate-50/30">
              {/* Error banner */}
              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-pmedium text-red-600">
                  {errorMessage}
                </div>
              )}

              {/* Two-tab bar */}
              <div className="flex bg-slate-100/60 p-1 rounded-xl border border-slate-200/50 mb-4">
                {(['client', 'booking'] as const).map((tab) => {
                  const label = tab === 'client' ? 'Client Details' : 'Booking Details';
                  const isActive = activeDialogTab === tab;
                  const isDisabled = tab === 'booking' && !selectedClient;
                  return (
                    <button
                      key={tab}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => !isDisabled && setActiveDialogTab(tab)}
                      className={`flex-1 py-2.5 rounded-xl text-[11px] font-pmedium uppercase tracking-widest transition-all
                        ${isActive ? 'bg-[#2563EB] text-white shadow-sm' : ''}
                        ${!isActive && !isDisabled ? 'text-[#0F172A] hover:bg-slate-200/70 hover:text-slate-900' : ''}
                        ${isDisabled ? 'text-slate-300 cursor-not-allowed' : ''}
                      `}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Tab content placeholders */}
              {activeDialogTab === 'client' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                    <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><UserPlus size={16} /></span>
                    <span className="text-[12px] font-pmedium uppercase tracking-[0.16em] text-slate-900">Client Details</span>
                  </div>
                  <ClientDetailsTab
                    workspaceId={workspaceId}
                    clientMode={clientMode}
                    setClientMode={setClientMode}
                    clientSearch={clientSearch}
                    setClientSearch={setClientSearch}
                    clientSearchResults={clientSearchResults}
                    setClientSearchResults={setClientSearchResults}
                    selectedClient={selectedClient}
                    setSelectedClient={setSelectedClient}
                    newClientForm={newClientForm}
                    setNewClientForm={setNewClientForm}
                    clientErrors={clientErrors}
                    setClientErrors={setClientErrors}
                    setErrorMessage={setErrorMessage}
                    setActiveDialogTab={setActiveDialogTab}
                  />
                </div>
              )}
              {activeDialogTab === 'booking' && (
                <div className="booking-tab-content rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                    <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0"><CalIcon size={16} /></span>
                    <span className="text-[12px] font-pmedium uppercase tracking-[0.16em] text-slate-900">Booking Details</span>
                  </div>
                  {/* Booking Details — two-column grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* Row 1 — Type filter (left) + Floor filter (right) */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-pmedium uppercase tracking-widest text-slate-500">
                        Type
                      </label>
                      <select
                        value={typeFilter}
                        onChange={(e) => {
                          setTypeFilter(e.target.value);
                          // Reset resource selection when filter changes
                          setBookingForm((f) => ({ ...f, resourceId: '', resourceName: '', resourceType: '', floor: '', wing: '' }));
                        }}
                        className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="">All Types</option>
                        {distinctTypes.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-pmedium uppercase tracking-widest text-slate-500">
                        Floor
                      </label>
                      <select
                        value={floorFilter}
                        onChange={(e) => {
                          setFloorFilter(e.target.value);
                          setBookingForm((f) => ({ ...f, resourceId: '', resourceName: '', resourceType: '', floor: '', wing: '' }));
                        }}
                        className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="">All Floors</option>
                        {distinctFloors.map((fl) => (
                          <option key={fl} value={fl}>{fl}</option>
                        ))}
                      </select>
                    </div>

                    {/* Row 2 — Wing filter (left, optional) + Resource selector (right) */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-pmedium uppercase tracking-widest text-slate-500">
                        Wing <span className="text-slate-300 font-pmedium normal-case tracking-normal">(optional)</span>
                      </label>
                      <select
                        value={wingFilter}
                        onChange={(e) => {
                          setWingFilter(e.target.value);
                          setBookingForm((f) => ({ ...f, resourceId: '', resourceName: '', resourceType: '', floor: '', wing: '' }));
                        }}
                        className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="">All Wings</option>
                        {distinctWings.map((w) => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-pmedium uppercase tracking-widest text-slate-500">
                        Resource <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={bookingForm.resourceId}
                        onChange={(e) => {
                          const room = filteredResources.find(
                            (r) => String(r._id ?? r.id) === e.target.value,
                          );
                          if (room) {
                            setBookingForm((f) => ({
                              ...f,
                              resourceId: String(room._id ?? room.id ?? ''),
                              resourceName: room.name,
                              resourceType: room.type,
                              floor: room.floor,
                              wing: room.wing,
                            }));
                            if (bookingErrors.resource) setBookingErrors((prev) => { const n = { ...prev }; delete n.resource; return n; });
                          } else {
                            setBookingForm((f) => ({
                              ...f,
                              resourceId: '',
                              resourceName: '',
                              resourceType: '',
                              floor: '',
                              wing: '',
                            }));
                          }
                        }}
                        className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="">Select resource…</option>
                        {filteredResources.map((r) => (
                          <option key={String(r._id ?? r.id)} value={String(r._id ?? r.id)}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      {selectedResource && (
                        <p className="text-xs text-slate-500">
                          {selectedResource.pricePerHour > 0
                            ? `₹${selectedResource.pricePerHour}/hr`
                            : 'No hourly rate set'}
                        </p>
                      )}
                      {bookingErrors.resource && (
                        <p className="text-[11px] text-red-500 font-pmedium mt-0.5">{bookingErrors.resource}</p>
                      )}
                    </div>

                    {/* ── Row 3: Date (left) + Start time (right) ─────────────────── */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-pmedium uppercase tracking-widest text-slate-500">Date</label>
                      <input
                        type="date"
                        value={bookingForm.date}
                        min={(() => {
                          const parts = new Intl.DateTimeFormat('en-GB', {
                            timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
                          }).formatToParts(new Date());
                          const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
                          return `${p.year}-${p.month}-${p.day}`;
                        })()}
                        onChange={(e) => {
                          setBookingForm((f) => ({ ...f, date: e.target.value, startTime: '', endTime: '' }));
                          if (bookingErrors.date) setBookingErrors((prev) => { const n = { ...prev }; delete n.date; return n; });
                        }}
                        className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      {bookingErrors.date && (
                        <p className="text-[11px] text-red-500 font-pmedium mt-0.5">{bookingErrors.date}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-pmedium uppercase tracking-widest text-slate-500">Start Time</label>
                      <select
                        value={bookingForm.startTime}
                        onChange={(e) => {
                          const nextStart = e.target.value;
                          const minEnd = minutesToTimeString((timeToMinutes(nextStart) || 0) + BOOKING_MIN_DURATION_MINUTES);
                          setBookingForm((f) => ({
                            ...f,
                            startTime: nextStart,
                            // auto-set end to start+30min if unset or too early
                            endTime: !f.endTime || (timeToMinutes(f.endTime) || 0) < (timeToMinutes(minEnd) || 0) ? minEnd : f.endTime,
                          }));
                          if (bookingErrors.startTime) setBookingErrors((prev) => { const n = { ...prev }; delete n.startTime; return n; });
                          if (bookingErrors.endTime) setBookingErrors((prev) => { const n = { ...prev }; delete n.endTime; return n; });
                        }}
                        className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="">Select…</option>
                        {(() => {
                          const todayIST = (() => {
                            const parts = new Intl.DateTimeFormat('en-GB', {
                              timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
                            }).formatToParts(new Date());
                            const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
                            return `${p.year}-${p.month}-${p.day}`;
                          })();
                          const isToday = bookingForm.date === todayIST;
                          if (isToday) {
                            const nowParts = new Intl.DateTimeFormat('en-GB', {
                              timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
                            }).formatToParts(new Date());
                            const np = Object.fromEntries(nowParts.map((x) => [x.type, x.value]));
                            const nowMinutes = Number(np.hour) * 60 + Number(np.minute);
                            const minStart = Math.ceil((nowMinutes + 1) / 5) * 5;
                            return buildTimeOptions(BOOKING_DAY_START, minutesToTimeString(BOOKING_DAY_END_MINUTES - BOOKING_MIN_DURATION_MINUTES), 5).filter((t) => {
                              const tm = timeToMinutes(t);
                              return tm !== null && tm >= minStart;
                            });
                          }
                          return buildTimeOptions(BOOKING_DAY_START, minutesToTimeString(BOOKING_DAY_END_MINUTES - BOOKING_MIN_DURATION_MINUTES), 5);
                        })().map((t) => (
                          <option key={t} value={t}>{formatTime12h(t)}</option>
                        ))}
                      </select>
                      {bookingErrors.startTime && (
                        <p className="text-[11px] text-red-500 font-pmedium mt-0.5">{bookingErrors.startTime}</p>
                      )}
                    </div>

                    {/* ── Row 4: End time (left) + Duration display (right) ────────── */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-pmedium uppercase tracking-widest text-slate-500">End Time</label>
                      <select
                        value={bookingForm.endTime}
                        onChange={(e) => {
                          setBookingForm((f) => ({ ...f, endTime: e.target.value }));
                          if (bookingErrors.endTime) setBookingErrors((prev) => { const n = { ...prev }; delete n.endTime; return n; });
                        }}
                        className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="">Select…</option>
                        {buildTimeOptions(
                          bookingForm.startTime
                            ? minutesToTimeString((timeToMinutes(bookingForm.startTime) || 0) + BOOKING_MIN_DURATION_MINUTES)
                            : '00:30',
                          BOOKING_DAY_END,
                          5
                        ).map((t) => (
                          <option key={t} value={t}>{formatTime12h(t)}</option>
                        ))}
                      </select>
                      {bookingErrors.endTime && (
                        <p className="text-[11px] text-red-500 font-pmedium mt-0.5">{bookingErrors.endTime}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-pmedium uppercase tracking-widest text-slate-500">Duration</label>
                      <p className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 min-h-[42px] flex items-center">
                        {(() => {
                          const startMin = timeToMinutes(bookingForm.startTime);
                          const endMin = timeToMinutes(bookingForm.endTime);
                          if (startMin === null || endMin === null || endMin <= startMin) return '—';
                          const diff = endMin - startMin;
                          const h = Math.floor(diff / 60);
                          const m = diff % 60;
                          if (h === 0) return `${m} min`;
                          if (m === 0) return `${h} h`;
                          return `${h} h ${m} min`;
                        })()}
                      </p>
                    </div>

                    {/* ── Availability status block (col-span-2) ─────────────────── */}
                    {bookingForm.resourceName && bookingForm.date && (
                      <div className="sm:col-span-2">
                        {(() => {
                          const dayBookings = allBookings.filter(
                            (b) => b.roomName === bookingForm.resourceName && b.date === bookingForm.date && b.status !== 'cancelled'
                          );
                          const timeWindows = (() => {
                            const toMin = (t: string) => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m; };
                            const toTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
                            const sorted = [...dayBookings].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
                            const windows: { start: string; end: string }[] = [];
                            let cursor = BOOKING_DAY_START_MINUTES;
                            sorted.forEach((b) => {
                              const bs = toMin(b.startTime);
                              const be = toMin(b.endTime);
                              if (bs > cursor) windows.push({ start: toTime(cursor), end: toTime(bs) });
                              cursor = Math.max(cursor, be);
                            });
                            if (cursor < BOOKING_DAY_END_MINUTES) windows.push({ start: toTime(cursor), end: BOOKING_DAY_END });
                            return windows.filter((w) => toMin(w.end) - toMin(w.start) >= BOOKING_MIN_DURATION_MINUTES);
                          })();

                          const hasConflict = bookingForm.startTime && bookingForm.endTime
                            ? hasSlotConflict(allBookings, bookingForm.resourceName, bookingForm.date, bookingForm.startTime, bookingForm.endTime)
                            : false;

                          const suggestions = (hasConflict && bookingForm.startTime && bookingForm.endTime)
                            ? (() => {
                                const startMin = timeToMinutes(bookingForm.startTime);
                                const endMin = timeToMinutes(bookingForm.endTime);
                                if (startMin === null || endMin === null || endMin <= startMin) return [];
                                return computeAvailableSlots(allBookings, bookingForm.resourceName, bookingForm.date, endMin - startMin, BOOKING_DAY_START_MINUTES, BOOKING_DAY_END_MINUTES).slice(0, 6);
                              })()
                            : [];

                          // Time conflict
                          if (hasConflict) {
                            return (
                              <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                                <div className="flex items-start gap-2 mb-2">
                                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={15} />
                                  <p className="text-[12px] text-red-800 font-pmedium">Time conflict — this slot is already booked.</p>
                                </div>
                                {suggestions.length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-pmedium text-red-700 uppercase tracking-widest mb-1.5">Available slots for this duration:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {suggestions.map((slot) => (
                                        <button
                                          key={`${slot.startTime}-${slot.endTime}`}
                                          type="button"
                                          onClick={() => {
                                            setBookingForm((f) => ({ ...f, startTime: slot.startTime, endTime: slot.endTime }));
                                            setBookingErrors((prev) => { const n = { ...prev }; delete n.startTime; delete n.endTime; return n; });
                                          }}
                                          className="px-2.5 py-1 rounded-full bg-white border border-red-200 text-[11px] font-pmedium text-red-700 hover:bg-red-100 transition-colors"
                                        >
                                          {formatTime12h(slot.startTime)} — {formatTime12h(slot.endTime)}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {suggestions.length === 0 && (
                                  <p className="text-[11px] font-pmedium text-red-700 mt-1">No available slots for this duration. Choose another date.</p>
                                )}
                              </div>
                            );
                          }

                          // Available for selected slot
                          if (bookingForm.startTime && bookingForm.endTime && !hasConflict) {
                            return (
                              <div className="p-3 bg-emerald-50 rounded-xl flex items-start gap-2 border border-emerald-100">
                                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={15} />
                                <p className="text-[12px] text-emerald-800 font-pmedium">Resource is available for the selected slot.</p>
                              </div>
                            );
                          }

                          // Day-level status (before time is selected)
                          if (!bookingForm.startTime) {
                            if (dayBookings.length === 0) {
                              return (
                                <div className="p-3 bg-emerald-50 rounded-xl flex items-start gap-2 border border-emerald-100">
                                  <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={15} />
                                  <p className="text-[12px] text-emerald-800 font-pmedium">Fully available on this date. Choose a time slot.</p>
                                </div>
                              );
                            }
                            if (timeWindows.length === 0) {
                              return (
                                <div className="p-3 bg-red-50 rounded-xl flex items-start gap-2 border border-red-100">
                                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={15} />
                                  <p className="text-[12px] text-red-800 font-pmedium">No slots available on this date. Choose another date.</p>
                                </div>
                              );
                            }
                            return (
                              <div className="p-3 bg-amber-50 rounded-xl flex items-start gap-2 border border-amber-100">
                                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={15} />
                                <p className="text-[12px] text-amber-800 font-pmedium">Some slots are taken on this date. Choose an open time slot.</p>
                              </div>
                            );
                          }

                          return null;
                        })()}
                      </div>
                    )}

                    {/* ── Row 5: Purpose (full-width, col-span-2) ──────────────────── */}
                    <div className="sm:col-span-2 flex flex-col gap-1">
                      <label className="text-[11px] font-pmedium uppercase tracking-widest text-slate-500">
                        Purpose <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={bookingForm.purpose}
                        placeholder="e.g. Client meeting, Workshop…"
                        onChange={(e) => {
                          setBookingForm((f) => ({ ...f, purpose: e.target.value }));
                          if (bookingErrors.purpose) setBookingErrors((prev) => { const n = { ...prev }; delete n.purpose; return n; });
                        }}
                        className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      {bookingErrors.purpose && (
                        <p className="text-[11px] text-red-500 font-pmedium mt-0.5">{bookingErrors.purpose}</p>
                      )}
                    </div>

                    {/* ── Row 6: Payment Mode pills (full-width, col-span-2) ─────────── */}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-pmedium text-slate-500 uppercase tracking-wider mb-1.5 block">
                        Payment Mode <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5 bg-slate-100/60 p-1 rounded-xl border border-slate-200/50">
                        {(['Cash', 'UPI'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setBookingForm((f) => ({
                              ...f,
                              paymentMode: mode,
                              paymentStatus: 'Paid',
                              transactionId: mode === 'Cash' ? '' : f.transactionId,
                              paymentProofFile: mode === 'Cash' ? null : f.paymentProofFile,
                            }))}
                            className={`flex-1 py-2 rounded-xl text-[11px] font-pmedium uppercase tracking-widest transition-all
                              ${bookingForm.paymentMode === mode
                                ? 'bg-[#2563EB] text-white shadow-sm'
                                : 'text-[#0F172A] hover:bg-slate-200/70 hover:text-slate-900'}
                            `}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                      {bookingErrors.paymentMode && (
                        <p className="text-xs text-red-500 mt-1">{bookingErrors.paymentMode}</p>
                      )}
                    </div>

                    {/* ── Row 7: Payment status + online payment evidence ── */}
                    <div>
                      <label className="text-xs font-pmedium text-slate-500 uppercase tracking-wider mb-1.5 block">
                        Payment Status
                      </label>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-emerald-700">
                        {bookingForm.paymentMode === 'Cash' ? 'Paid · Cash' : bookingForm.paymentMode ? `Paid · ${bookingForm.paymentMode}` : 'Select payment mode'}
                      </div>
                    </div>

                    <div>
                      {bookingForm.paymentMode !== 'Cash' && bookingForm.paymentMode ? (
                        <>
                          <label className="text-xs font-pmedium text-slate-500 uppercase tracking-wider mb-1.5 block">
                            Transaction / UTR Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            maxLength={100}
                            value={bookingForm.transactionId}
                            onChange={(e) =>
                              setBookingForm((f) => ({ ...f, transactionId: e.target.value }))
                            }
                            placeholder="e.g. UPI ref / cheque no."
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all"
                          />
                          {bookingErrors.transactionId && <p className="mt-1 text-[11px] font-pmedium text-red-500">{bookingErrors.transactionId}</p>}
                        </>
                      ) : (
                        /* Empty placeholder to preserve grid layout */
                        <div />
                      )}
                    </div>

                    {bookingForm.paymentMode !== 'Cash' && bookingForm.paymentMode && (
                      <div className="sm:col-span-2">
                        <label className="text-xs font-pmedium text-slate-500 uppercase tracking-wider mb-1.5 block">
                          Payment Screenshot <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => setBookingForm((form) => ({ ...form, paymentProofFile: event.target.files?.[0] || null }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-pmedium text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-[10px] file:font-pmedium file:uppercase file:text-blue-700"
                        />
                        {bookingErrors.paymentProofFile && <p className="mt-1 text-[11px] font-pmedium text-red-500">{bookingErrors.paymentProofFile}</p>}
                      </div>
                    )}

                    {/* ── Row 7.5: Discount (full-width, col-span-2, optional) ─────── */}
                    <div className="sm:col-span-2 flex flex-col gap-1">
                      <label className="text-[11px] font-pmedium uppercase tracking-widest text-slate-500">
                        Discount <span className="text-slate-300 font-pmedium normal-case tracking-normal">(optional)</span>
                      </label>
                      <div className="flex gap-2">
                        {/* ₹ / % type toggle — same pill style as payment mode */}
                        <div className="flex bg-slate-100/60 p-0.5 rounded-lg border border-slate-200/50 shrink-0">
                          {(['flat', 'percent'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setBookingForm((f) => ({ ...f, discountType: t }))}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-pmedium uppercase tracking-widest transition-all
                                ${bookingForm.discountType === t
                                  ? 'bg-[#2563EB] text-white shadow-sm'
                                  : 'text-[#0F172A] hover:bg-slate-200/70'}
                              `}
                            >
                              {t === 'flat' ? '₹' : '%'}
                            </button>
                          ))}
                        </div>
                        {/* Discount value input */}
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={bookingForm.discountValue}
                          placeholder={bookingForm.discountType === 'percent' ? 'e.g. 10' : 'e.g. 500'}
                          onChange={(e) => {
                            setBookingForm((f) => ({ ...f, discountValue: e.target.value }));
                            if (bookingErrors.discount) setBookingErrors((prev) => { const n = { ...prev }; delete n.discount; return n; });
                          }}
                          className="flex-1 text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      {bookingErrors.discount && (
                        <p className="text-[11px] text-red-500 font-pmedium mt-0.5">{bookingErrors.discount}</p>
                      )}
                    </div>

                    {/* ── Row 8: Notes (full-width, col-span-2, optional) ──────────── */}
                    <div className="sm:col-span-2 flex flex-col gap-1">
                      <label className="text-[11px] font-pmedium uppercase tracking-widest text-slate-500">
                        Notes{' '}
                        <span className="text-slate-300 font-pmedium normal-case tracking-normal">(optional)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={bookingForm.notes}
                        placeholder="Any additional notes…"
                        onChange={(e) => setBookingForm((f) => ({ ...f, notes: e.target.value }))}
                        className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                      />
                    </div>

                    {/* ── Row 9: Pricing Summary Box (full-width, col-span-2) ──────── */}
                    <div className="sm:col-span-2">
                      <div className="rounded-2xl border border-blue-200/60 bg-blue-50/40 p-4 flex flex-col gap-2">
                        <p className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600 mb-1">Pricing Summary</p>
                        {/* Base Price */}
                        <div className="flex justify-between items-center text-[13px]">
                          <span className="text-slate-600 font-pmedium">Base Price</span>
                          <span className="font-pmedium text-slate-900">₹{externalPricing.basePriceRaw.toFixed(2)}</span>
                        </div>
                        {/* Discount line — only shown when non-zero */}
                        {externalPricing.discountAmount > 0 && (
                          <div className="flex justify-between items-center text-[13px]">
                            <span className="text-slate-600 font-pmedium">Discount</span>
                            <span className="font-pmedium text-emerald-600">−₹{externalPricing.discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {/* GST */}
                        <div className="flex justify-between items-center text-[13px]">
                          <span className="text-slate-600 font-pmedium">GST (18%)</span>
                          <span className="font-pmedium text-slate-900">₹{externalPricing.gstAmount.toFixed(2)}</span>
                        </div>
                        {/* Divider */}
                        <div className="h-px bg-blue-200/60 my-0.5" />
                        {/* Total */}
                        <div className="flex justify-between items-center">
                          <span className="text-[14px] font-pmedium text-[#0F172A] uppercase tracking-wider">Total</span>
                          <span className="text-[16px] font-pmedium text-[#2563EB]">₹{externalPricing.totalAmount.toFixed(2)}</span>
                        </div>
                        {/* No rate note */}
                        {externalPricing.noRateSet && selectedResource && (
                          <p className="text-[11px] font-pmedium text-amber-600 mt-1">
                            This resource has no hourly rate set.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-100 flex gap-3 sticky bottom-0 shrink-0">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleClose}
                className="flex-1 px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isSaving ||
                  !selectedClient ||
                  !bookingForm.resourceName ||
                  !bookingForm.date ||
                  !bookingForm.startTime ||
                  !bookingForm.endTime ||
                  !bookingForm.purpose.trim() ||
                  !bookingForm.paymentMode ||
                  (bookingForm.resourceName && bookingForm.date && bookingForm.startTime && bookingForm.endTime
                    ? hasSlotConflict(allBookings, bookingForm.resourceName, bookingForm.date, bookingForm.startTime, bookingForm.endTime)
                    : false) ||
                  Object.values(bookingErrors).some(Boolean)
                }
                onClick={handleDialogSubmit}
                className="flex-1 px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSaving ? 'Saving...' : 'Confirm Booking'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function MeetingRoomsPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const businessHours = useBusinessHours();
  const BOOKING_DAY_START = businessHours.start;
  const BOOKING_DAY_END = businessHours.end;
  const BOOKING_DAY_START_MINUTES = businessHours.startMinutes;
  const BOOKING_DAY_END_MINUTES = businessHours.endMinutes;

  const storedUser = getStoredUser();
  const actingContext = getStoredActingManagerContext(storedUser);
  const location = useLocation();
  const navigate = useNavigate();
  // FRONTEND PREVIEW: Default to 'owner' role when no user is stored in localStorage.
  // TODO: Remove this fallback when auth is wired up.
  const membershipRole = (storedUser?.workspaceMembership?.role || storedUser?.role || 'owner').toLowerCase();
  const isOwnerProfile = membershipRole === 'owner' || membershipRole === 'founder';
  const isSuperAdminProfile = membershipRole === 'super_admin' || membershipRole === 'super-admin';
  const isAdminProfile = canAccessAdminDashboard(storedUser);
  const isHrManagerProfile = canAccessHRDashboard(storedUser);
  const isAdministrationManagerProfile = canAccessAdministrationDashboard(storedUser);
  const isSalesManagerProfile = canAccessSalesDashboard(storedUser);
  const isFinanceManagerProfile = canAccessFinanceDashboard(storedUser);
  const isTechManagerProfile = canAccessTechDashboard(storedUser);
  const isITManagerProfile = canAccessITDashboard(storedUser);
  const isMaintenanceManagerProfile = canAccessMaintenanceDashboard(storedUser);
  const isEmployeeProfile = canAccessEmployeeDashboard(storedUser) &&
    !isOwnerProfile &&
    !isSuperAdminProfile &&
    !isAdminProfile &&
    !isHrManagerProfile &&
    !isAdministrationManagerProfile &&
    !isSalesManagerProfile &&
    !isFinanceManagerProfile &&
    !isTechManagerProfile &&
    !isITManagerProfile &&
    !isMaintenanceManagerProfile;
  const isDepartmentManagerProfile =
    isHrManagerProfile ||
    isAdministrationManagerProfile ||
    isSalesManagerProfile ||
    isFinanceManagerProfile ||
    isTechManagerProfile ||
    isITManagerProfile ||
    isMaintenanceManagerProfile;
  // Owner/Super-admin see company_bookings, not assigned_dept. Only pure admins get assigned_dept.
  const isAssignedDeptProfile = isAdminProfile && !isOwnerProfile && !isSuperAdminProfile;
  const currentUserId = String(
    storedUser?.workspaceMembership?.userId ||
    storedUser?.workspaceMembership?.memberUserId ||
    storedUser?.workspaceMembership?.memberId ||
    storedUser?.id ||
    storedUser?._id ||
    '',
  ).trim();
  const managerProfile = {
    name: storedUser?.fullName || 'Founder',
    department: actingContext?.departmentName || (isOwnerProfile
      ? 'Founder'
      : isSuperAdminProfile
        ? 'Super Admin'
        : (
          storedUser?.workspaceMembership?.departments?.[0] ||
          storedUser?.workspaceMembership?.department ||
          storedUser?.department ||
          storedUser?.workspace?.department ||
          'Executive'
        )),
  };
  const departmentScopeNames = useMemo(() => {
    if (actingContext?.departmentName) {
      return [actingContext.departmentName.toString().trim().toLowerCase()];
    }

    if (!isDepartmentManagerProfile && !isAdminProfile) {
      return [];
    }

    const departments = isAdminProfile
      ? [
        ...(Array.isArray(storedUser?.workspaceMembership?.departments) ? storedUser.workspaceMembership.departments : []),
        storedUser?.workspaceMembership?.department,
        storedUser?.department,
        storedUser?.workspace?.department,
      ]
      : [
        ...(Array.isArray(storedUser?.workspaceMembership?.departments) ? storedUser.workspaceMembership.departments : []),
        storedUser?.workspaceMembership?.department,
        storedUser?.department,
        storedUser?.workspace?.department,
        ...(Array.isArray(storedUser?.workspace?.organizationDepartments)
          ? storedUser.workspace.organizationDepartments.map((department: any) => department?.name).filter(Boolean)
          : []),
      ];

    const filteredDepartments = departments.filter(Boolean);

    const matchedDepartments = filteredDepartments.filter((department) => {
      const normalized = (department || '').toString().trim().toLowerCase().replace(/[\s_]+/g, '-');

      if (isAdminProfile) {
        return Boolean(normalized);
      }

      if (isHrManagerProfile) {
        return normalized === 'hr' || normalized.startsWith('hr-') || normalized.includes('human-resources');
      }

      if (isSalesManagerProfile) {
        return normalized === 'sales' || normalized.startsWith('sales-') || normalized.includes('sales-crm') || normalized.includes('sales-team');
      }

      if (isFinanceManagerProfile) {
        return normalized === 'finance' || normalized === 'accounting' || normalized.startsWith('finance-') || normalized.includes('finance-team') || normalized.includes('accounts');
      }

      if (isTechManagerProfile) {
        return normalized === 'tech' || normalized === 'technology' || normalized.startsWith('tech-') || normalized.includes('tech-team');
      }

      if (isITManagerProfile) {
        return normalized === 'it' || normalized === 'information-technology' || normalized === 'information-tech' || normalized.startsWith('it-') || normalized.includes('it-support');
      }

      if (isMaintenanceManagerProfile) {
        return normalized === 'maintenance' || normalized === 'facilities' || normalized === 'operations' || normalized.startsWith('maintenance-') || normalized.includes('maintenance-department') || normalized.includes('facilities-team');
      }

      return (
        normalized === 'administration' ||
        normalized === 'admin' ||
        normalized.startsWith('admin-') ||
        normalized.includes('administration-department')
      );
    });

    if (matchedDepartments.length > 0) {
      return [...new Set(matchedDepartments.map((department) => department.toString().trim().toLowerCase()))];
    }

    return [];
  }, [
    isDepartmentManagerProfile,
    isAdminProfile,
    isHrManagerProfile,
    isSalesManagerProfile,
    isFinanceManagerProfile,
    isTechManagerProfile,
    isITManagerProfile,
    isMaintenanceManagerProfile,
    storedUser,
    actingContext,
  ]);

  // --- CORE STATE ---
  const [activeTab, setActiveTab] = useState<string>(
    isEmployeeProfile
      ? 'my_bookings'
      : isAssignedDeptProfile
        ? 'assigned_dept_bookings'
        : (isOwnerProfile || isSuperAdminProfile)
          ? 'company_bookings'
          : 'dept_bookings',
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);
  const [isSavingBooking, setIsSavingBooking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false);


  // Calendar State
  const [calendarRoomFilter, setCalendarRoomFilter] = useState<string>('Boardroom');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const status = params.get('status');

    if (isEmployeeProfile) {
      if (tab === 'invites') {
        setActiveTab('invites');
      } else {
        setActiveTab('my_bookings');
      }
    } else if (tab === 'dept_bookings' || tab === 'company_bookings') {
      setActiveTab(isAssignedDeptProfile ? 'assigned_dept_bookings' : tab);
    } else if (tab === 'invites' || tab === 'my_bookings' || tab === 'assigned_dept_bookings') {
      setActiveTab(tab);
    }

    if (status === 'pending' || status === 'accepted' || status === 'rejected' || status === 'booked' || status === 'in progress' || status === 'completed' || status === 'cancelled' || status === 'rescheduled' || status === 'all') {
      setStatusFilter(status);
    } else if (tab === 'invites') {
      setStatusFilter('pending');
    }
  }, [location.search, isEmployeeProfile, isAssignedDeptProfile]);

  // Modal States
  const [showBookingDialog, setShowBookingDialog] = useState<boolean>(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState<boolean>(false);
  const [showExtendDialog, setShowExtendDialog] = useState<boolean>(false);
  const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);

  const [availableRooms, setAvailableRooms] = useState<string[]>([
    'Conference Room A',
    'Conference Room B',
    'Meeting Room A',
    'Meeting Room B',
  ]);
  const [roomDetails, setRoomDetails] = useState<RoomDetails[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([]);

  // Form States
  const [newBooking, setNewBooking] = useState<Booking>({
    roomName: '',
    floor: '',
    wing: '',
    location: '',
    roomType: '',
    date: '',
    startTime: '',
    endTime: '',
    purpose: '',
    inviteeUserIds: [],
  });
  const [rescheduleData, setRescheduleData] = useState<Partial<Booking>>({});
  const [rescheduleInviteeIds, setRescheduleInviteeIds] = useState<string[]>([]);
  const [extendBooking, setExtendBooking] = useState<Booking | null>(null);
  const [extendForm, setExtendForm] = useState<{ extraMinutes: string }>({ extraMinutes: '30' });
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [showRejectInviteDialog, setShowRejectInviteDialog] = useState<boolean>(false);
  const [inviteToReject, setInviteToReject] = useState<Invite | null>(null);
  const [inviteRejectReason, setInviteRejectReason] = useState<string>('');

  const [allBookings, setAllBookings] = useState<Booking[]>([]);

  // --------- MAIN BOOKING TABS ---------
  const [mainBookingTab, setMainBookingTab] = useState<'my_bookings' | 'internal_booking' | 'external_booking' | 'tenant_bookings'>('my_bookings');

  // --------- EXTERNAL BOOKINGS LIST FILTERS (Tasks 18/19) ---------
  const [externalSearchQuery, setExternalSearchQuery] = useState('');
  const [externalPaymentFilter, setExternalPaymentFilter] = useState<'all' | 'Paid' | 'Pending'>('all');
  const [externalStatusFilter, setExternalStatusFilter] = useState<string>('all');

  // --------- TENANT COMPANIES ---------
  const [tenantCompanies, setTenantCompanies] = useState<Record<string, any>[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);

  // --------- FORMS ---------
  const [showExternalBookingDialog, setShowExternalBookingDialog] = useState(false);
  const [showNewExternalBookingDialog, setShowNewExternalBookingDialog] = useState(false);
  const [showInternalBookingDialog, setShowInternalBookingDialog] = useState(false);
  const [showTenantBookingDialog, setShowTenantBookingDialog] = useState(false);
  const [tenantBookingError, setTenantBookingError] = useState('');

  const isMyBooking = useCallback((booking: any) => {
    const bookedByUserId = booking?.bookedByUserId ? String(booking.bookedByUserId) : '';
    const currentInviteStatus = booking?.currentInviteStatus || '';
    const isAcceptedInvite = currentInviteStatus === 'accepted';
    // For on-behalf internal bookings: bookedForName is set, meaning ownerId = selected member,
    // bookedByUserId = admin/founder. The admin should NOT see these in their My Bookings —
    // only the host member (isMe) and accepted invitees do.
    const isOnBehalfBooking = Boolean((booking as any).bookedForName);
    return Boolean(
      booking?.isMe ||
      (!isOnBehalfBooking && bookedByUserId && currentUserId && bookedByUserId === String(currentUserId)) ||
      isAcceptedInvite
    );
  }, [currentUserId]);

  const isPersonalCalendarBooking = useCallback((booking: any) => {
    if (!booking || normalize(booking.bookingType) !== 'internal') return false;
    const inviteStatus = normalize(booking.currentInviteStatus);
    const isVisibleInvite = inviteStatus === 'pending' || inviteStatus === 'accepted';
    return isMyBooking(booking) || isVisibleInvite;
  }, [isMyBooking]);

  const getCurrentUserInvite = useCallback((booking: any) => {
    return (booking?.invites || []).find((invite: any) => invite.invitedUserId === String(currentUserId)) || null;
  }, [currentUserId]);

  const hasCurrentUserInvite = useCallback((booking: any) => {
    return Boolean(getCurrentUserInvite(booking));
  }, [getCurrentUserInvite]);

  const matchesDepartmentScope = useCallback((bookingDepartment: string = '') => {
    if (!isDepartmentManagerProfile) {
      return true;
    }

    const normalizedBookingDepartment = (bookingDepartment || '').toString().trim().toLowerCase();
    if (!normalizedBookingDepartment) {
      return false;
    }

    return departmentScopeNames.some((departmentName) => (
      normalizedBookingDepartment === departmentName ||
      normalizedBookingDepartment.includes(departmentName) ||
      departmentName.includes(normalizedBookingDepartment)
    ));
  }, [isDepartmentManagerProfile, departmentScopeNames]);

  const isAssignedDeptBooking = useCallback((booking: any) => {
    if (!isAdminProfile || !booking) {
      return false;
    }

    if (!matchesDepartmentScope(booking.department)) {
      return false;
    }

    if (!booking.bookedByUserId) {
      return false;
    }

    if (isMyBooking(booking)) {
      return false;
    }

    if (normalize(booking.bookingType) === 'external') {
      return false;
    }

    const bookedByRole = normalizeRole(booking.bookedByRole);
    if (bookedByRole === 'owner' || bookedByRole === 'super-admin') {
      return false;
    }

    return !isAcceptedCurrentUserInvite(booking);
  }, [isAdminProfile, matchesDepartmentScope, isMyBooking]);

  const isDepartmentBooking = useCallback((booking: any) => {
    if (!booking) {
      return false;
    }

    if (normalize(booking.bookingType) === 'external') {
      return false;
    }

    if (!isDepartmentManagerProfile) {
      return !isMyBooking(booking) && !hasCurrentUserInvite(booking);
    }

    return matchesDepartmentScope(booking.department) && !isMyBooking(booking) && !hasCurrentUserInvite(booking);
  }, [isDepartmentManagerProfile, isMyBooking, hasCurrentUserInvite, matchesDepartmentScope]);

  const isCompanyBooking = useCallback((booking: any) => {
    if (!booking) {
      return false;
    }

    if (normalize(booking.bookingType) === 'external') {
      return false;
    }

    if (isMyBooking(booking)) {
      return false;
    }

    if (isAcceptedCurrentUserInvite(booking) || isPendingCurrentUserInvite(booking)) {
      return false;
    }

    if (isDepartmentManagerProfile) {
      return isRejectedCurrentUserInvite(booking) || !matchesDepartmentScope(booking.department);
    }

    return !hasCurrentUserInvite(booking);
  }, [isMyBooking, isDepartmentManagerProfile, matchesDepartmentScope, hasCurrentUserInvite]);

  const isBookingInActiveTab = useCallback((booking: any, tab: string = activeTab) => {
    if (mainBookingTab !== 'my_bookings') {
      const status = getBookingDisplayStatus(booking);
      if (tab === 'bookings') return status !== 'completed' && status !== 'cancelled';
      if (tab === 'booking_history') return status === 'completed' || status === 'cancelled';
      return true;
    }

    if (tab === 'my_bookings') {
      return isMyBooking(booking);
    }

    if (tab === 'assigned_dept_bookings') {
      return isAssignedDeptBooking(booking);
    }

    if (tab === 'company_bookings') {
      return isCompanyBooking(booking);
    }

    if (tab === 'dept_bookings') {
      return isDepartmentBooking(booking);
    }

    return false;
  }, [activeTab, isMyBooking, isAssignedDeptBooking, isCompanyBooking, isDepartmentBooking, mainBookingTab]);

  const getRoomCatalogEntry = useCallback((roomName?: string) => {
    const roomCatalog = roomDetails.map((room: any) => normalizeRoomEntry(room));
    return roomCatalog.find((entry) => entry.name === roomName) || roomDetails.find((entry) => entry.name === roomName) || null;
  }, [roomDetails]);

  const getRoomCapacity = useCallback((roomName?: string) => {
    const room = roomDetails.find((entry) => entry.name === roomName);
    return room?.capacity || null;
  }, [roomDetails]);

  const getRoomTimeWindows = useCallback((roomName: string, date: string, excludeRecordId: string | null = null) => {
    if (!roomName || !date) {
      return [];
    }

    const startOfDay = BOOKING_DAY_START_MINUTES;
    const endOfDay = BOOKING_DAY_END_MINUTES;
    const toMinutes = (time: any) => {
      const [hours, minutes] = (time || '00:00').split(':').map(Number);
      return hours * 60 + minutes;
    };
    const toTime = (minutes: any) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

    // For today: clamp the start cursor to current time so past slots are never suggested
    const nowClock = getMeetingClockParts();
    const isToday = date === todayStr;
    const nowMinutes = isToday && nowClock
      ? Math.ceil((nowClock.minutes + 1) / BOOKING_SLOT_STEP_MINUTES) * BOOKING_SLOT_STEP_MINUTES
      : 0;

    const bookings = allBookings
      .filter((booking) => (
        booking.roomName === roomName &&
        booking.date === date &&
        booking.status !== 'cancelled' &&
        booking.recordId !== excludeRecordId
      ))
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    const windows: { start: string; end: string }[] = [];
    // Start cursor at the later of startOfDay or current time (for today)
    let cursor = Math.max(startOfDay, nowMinutes);

    bookings.forEach((booking) => {
      const bookingStart = toMinutes(booking.startTime);
      const bookingEnd = toMinutes(booking.endTime);
      if (bookingStart > cursor) {
        windows.push({ start: toTime(cursor), end: toTime(bookingStart) });
      }
      cursor = Math.max(cursor, bookingEnd);
    });

    if (cursor < endOfDay) {
      windows.push({ start: toTime(cursor), end: toTime(endOfDay) });
    }

    return windows.filter((window) => toMinutes(window.end) - toMinutes(window.start) >= BOOKING_MIN_DURATION_MINUTES);
  }, [allBookings, todayStr, BOOKING_DAY_START_MINUTES, BOOKING_DAY_END_MINUTES]);

  const getSuggestedSlots = useCallback((roomName: string, date: string, desiredStartTime: string, desiredEndTime: string, excludeRecordId: string | null = null) => {
    const duration = (() => {
      if (!desiredStartTime || !desiredEndTime) {
        return 0;
      }
      const [startHour, startMinute] = desiredStartTime.split(':').map(Number);
      const [endHour, endMinute] = desiredEndTime.split(':').map(Number);
      return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    })();

    return getRoomTimeWindows(roomName, date, excludeRecordId)
      .filter((window) => {
        const [startHour, startMinute] = window.start.split(':').map(Number);
        const [endHour, endMinute] = window.end.split(':').map(Number);
        return (endHour * 60 + endMinute) - (startHour * 60 + startMinute) >= duration;
      })
      .slice(0, 3);
  }, [getRoomTimeWindows]);

  const checkAvailability = useCallback((data: any, excludeRecordId: string | null = null) => {
    if (!data.roomName || !data.date || !data.startTime || !data.endTime) return 'pending';
    const attendeeCount = getBookingAttendeeCount(data);
    if (!attendeeCount) return 'pending';
    if (Array.isArray(data.inviteeUserIds) && attendeeCount < data.inviteeUserIds.length + 1) {
      return 'capacity';
    }
    const roomCapacity = getRoomCapacity(data.roomName);
    if (roomCapacity && attendeeCount > Number(roomCapacity)) {
      return 'capacity';
    }

    const existing = allBookings.filter(
      (b) =>
        b.roomName === data.roomName &&
        b.date === data.date &&
        b.status !== 'cancelled' &&
        b.recordId !== excludeRecordId,
    );
    const hasOverlap = existing.some(
      (b) => data.startTime < b.endTime && data.endTime > b.startTime,
    );
    if (hasOverlap) {
      const suggestions = getSuggestedSlots(data.roomName, data.date, data.startTime, data.endTime, excludeRecordId);
      if (suggestions.length === 0) {
        return 'full';
      }
      return 'conflict';
    }
    return 'available';
  }, [allBookings, getRoomCapacity, getSuggestedSlots]);

  const [workspaceId, setWorkspaceId] = useState<string>('');

  useEffect(() => {
    const user = getStoredUser();
    let wsId = user?.workspaceMembership?.workspaceId ||
      user?.workspaceMembership?.workspace ||
      user?.primaryWorkspace ||
      user?.workspace?.id ||
      user?.workspaceId ||
      user?.workspace?.workspaceId ||
      user?.accessibleWorkspaces?.[0]?.id;

    if (!wsId) {
      setErrorMessage("No unit found. Please check login or user data.");
      setIsLoading(false);
      return;
    }

    setWorkspaceId(wsId);
    const localCurrentUserId = String(
      user?.workspaceMembership?.userId ||
      user?.workspaceMembership?.memberUserId ||
      user?.workspaceMembership?.memberId ||
      user?.id ||
      user?._id ||
      '',
    ).trim();

    async function loadData() {
      setIsLoading(true);
      try {
        const response = await getMeetingRoomBookings(wsId!);
        const rawData = response?.data?.data || response?.data || response || {};
        const details = (rawData.roomDetails || rawData.rooms || []).map((room: any) => normalizeRoomEntry(room));
        const bookingsData = rawData.bookings || rawData.data?.bookings || rawData || [];
        setRoomDetails(details);
        const activeRoomNames = details.filter((room: any) => isActiveRoom(room) && isMeetingCalendarRoom(room)).map((room: any) => room.name);
        setAvailableRooms(activeRoomNames);
        setCalendarRoomFilter((current) => activeRoomNames.includes(current) ? current : (activeRoomNames[0] || ''));
        setAllBookings(bookingsData.map((b: any) => normalizeBooking(b, localCurrentUserId)));
        setReceivedInvites(rawData.receivedInvites || []);
        try {
          const orgResponse = await getOrganizationOverview(axiosPrivate);
          const orgData = orgResponse?.data?.data || orgResponse?.data || {};
          const rawMembers = Array.isArray(orgData.teamMembers) ? orgData.teamMembers : [];
          // Normalize org members to match the WorkspaceMember shape expected by the rest of the page.
          // Org overview returns: { userId, name, role, departmentNames[], status }
          // We need: { userId, fullName, name, role, departments[] }
          const normalizedMembers = rawMembers.map((m: any) => ({
            ...m,
            fullName: m.fullName || m.name || '',
            name: m.name || m.fullName || '',
            departments: Array.isArray(m.departmentNames) ? m.departmentNames : (Array.isArray(m.departments) ? m.departments : []),
          }));
          setWorkspaceMembers(normalizedMembers);
        } catch (mErr) { console.warn("Failed to load workspace members:", mErr); }
      } catch (err: any) {
        setErrorMessage(`Failed to load data: ${err.response?.data?.message || err.message}`);
      } finally { setIsLoading(false); setIsInitialLoading(false); }
    }
    setIsInitialLoading(true);
    loadData();

    // Real-time polling: refresh bookings every 30 seconds
    const pollInterval = setInterval(async () => {
      try {
        const response = await getMeetingRoomBookings(wsId!);
        const rawData = response?.data?.data || response?.data || response || {};
        const details = (rawData.roomDetails || rawData.rooms || []).map((room: any) => normalizeRoomEntry(room));
        const bookingsData = rawData.bookings || rawData.data?.bookings || [];
        setRoomDetails(details);
        setAllBookings(bookingsData.map((b: any) => normalizeBooking(b, localCurrentUserId)));
        setReceivedInvites(rawData.receivedInvites || []);
        const roomNames = details.filter((room: any) => isActiveRoom(room) && isMeetingCalendarRoom(room)).map((room: any) => room.name);
        setAvailableRooms(roomNames);
        setCalendarRoomFilter((current) => roomNames.includes(current) ? current : (roomNames[0] || ''));
      } catch { /* silent — poll failures don't show errors */ }
    }, 30000);

    return () => clearInterval(pollInterval);
  }, []);

  const visibleBookings = useMemo(() => {
    if (mainBookingTab === 'external_booking') return allBookings.filter((b) => normalize(b.bookingType) === 'external');
    if (mainBookingTab === 'tenant_bookings') return allBookings.filter((b) => normalize(b.bookingType) === 'tenant');
    if (mainBookingTab === 'internal_booking') return allBookings.filter((b) => normalize(b.bookingType) !== 'external' && normalize(b.bookingType) !== 'tenant');
    
    // Default tabs (my_bookings, company_bookings, dept_bookings) — never show external or tenant
    if (isEmployeeProfile) return allBookings.filter((booking) => isMyBooking(booking) && normalize(booking.bookingType) !== 'tenant' && normalize(booking.bookingType) !== 'external');
    if (!isAdminProfile) return allBookings.filter((b) => normalize(b.bookingType) !== 'tenant' && normalize(b.bookingType) !== 'external');
    return allBookings.filter((booking) => (isAssignedDeptBooking(booking) || isMyBooking(booking)) && normalize(booking.bookingType) !== 'tenant' && normalize(booking.bookingType) !== 'external');
  }, [allBookings, isAdminProfile, isAssignedDeptBooking, isMyBooking, isEmployeeProfile, mainBookingTab]);

  const displayedBookings = useMemo(() => {
    if (activeTab === 'invites') return [];
    return visibleBookings.filter((booking) => {
      const matchesTab = isBookingInActiveTab(booking);
      const matchesSearch = (booking.roomName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (booking.bookedByName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const displayStatus = getBookingDisplayStatus(booking);
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'rescheduled' ? isRescheduledBooking(booking) : displayStatus === statusFilter);
      return matchesTab && matchesSearch && matchesStatus;
    });
  }, [visibleBookings, activeTab, searchQuery, statusFilter, isBookingInActiveTab]);

  const externalDisplayedBookings = useMemo(() => {
    if (mainBookingTab !== 'external_booking') return [];
    return allBookings
      .filter((b) => normalize(b.bookingType) === 'external')
      .filter((b) => {
        const q = externalSearchQuery.toLowerCase();
        if (q.length >= 2) {
          const matchesClient = getExternalClientName(b).toLowerCase().includes(q);
          const matchesRoom = (b.roomName || '').toLowerCase().includes(q);
          const matchesCode = ((b as any).bookingCode || '').toLowerCase().includes(q);
          if (!matchesClient && !matchesRoom && !matchesCode) return false;
        }
        if (externalPaymentFilter !== 'all') {
          if ((b as any).paymentStatus !== externalPaymentFilter) return false;
        }
        if (externalStatusFilter !== 'all') {
          if (getBookingDisplayStatus(b) !== externalStatusFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateCompare = (b.date || '').localeCompare(a.date || '');
        if (dateCompare !== 0) return dateCompare;
        return (b.startTime || '').localeCompare(a.startTime || '');
      });
  }, [allBookings, mainBookingTab, externalSearchQuery, externalPaymentFilter, externalStatusFilter]);

  const memberDirectoryById = useMemo(() => {
    const directory = new Map();
    workspaceMembers.forEach((member: any) => {
      const memberId = resolveMemberUserId(member);
      if (memberId) directory.set(memberId, member);
    });
    return directory;
  }, [workspaceMembers]);

  const resolveInviteDisplayName = useCallback((invite: any) => {
    const inviteUserId = String(invite?.invitedUserId || invite?.userId || invite?.id || '').trim();
    const member = inviteUserId ? memberDirectoryById.get(inviteUserId) : null;
    return invite?.invitedName || member?.fullName || member?.name || member?.email || 'Member';
  }, [memberDirectoryById]);

  const displayedInvites = useMemo(() => {
    return receivedInvites.filter((invite) => {
      if (isEmployeeProfile && invite.status === 'accepted') return false;
      const inviteName = resolveInviteDisplayName(invite);
      const matchesSearch = (invite.roomName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (invite.bookedByName || '').toLowerCase().includes(searchQuery.toLowerCase()) || inviteName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || invite.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [receivedInvites, searchQuery, statusFilter, isEmployeeProfile, resolveInviteDisplayName]);

  const upcomingReservations = useMemo(() => {
    return visibleBookings
      .filter(b => {
        const matchesTab = isBookingInActiveTab(b);
        const displayStatus = getBookingDisplayStatus(b);
        return matchesTab && displayStatus !== 'cancelled' && displayStatus !== 'completed' && b.date >= todayStr;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);
  }, [visibleBookings, todayStr, isBookingInActiveTab]);

  const reloadBookings = async () => {
    if (!workspaceId) return;
    const response = await getMeetingRoomBookings(workspaceId);
    const data = response?.data?.data || response?.data || response || {};
    const details = (data.roomDetails || data.rooms || []).map((room: any) => normalizeRoomEntry(room));
    const bookings = data.bookings || data.data?.bookings || [];
    setRoomDetails(details);
    setAllBookings(bookings.map((booking: any) => normalizeBooking(booking, currentUserId)));
    setReceivedInvites(data.receivedInvites || []);
    const roomNames = details.filter((room: any) => isActiveRoom(room) && isMeetingCalendarRoom(room)).map((room: any) => room.name);
    setAvailableRooms(roomNames);
    setCalendarRoomFilter((current) => roomNames.includes(current) ? current : (roomNames[0] || ''));
  };

  // --------- MISSING FORM STATES ---------
  const [externalBookingForm, setExternalBookingForm] = useState({
    name: '', phone: '', email: '', company: '', roomType: '', floor: '', wing: '', roomName: '', date: '',
    startTime: '', endTime: '', attendees: 1, purpose: '', paymentMode: 'Cash',
    transactionId: '', paymentProofFile: null as File | null, discountType: 'amount', discountValue: '', notes: '',
  });
  const [isSavingExternalBooking, setIsSavingExternalBooking] = useState(false);
  // Live client search state
  const [extClientSearch, setExtClientSearch] = useState('');
  const [extClientSearchResults, setExtClientSearchResults] = useState<any[]>([]);
  const [extClientSearchLoading, setExtClientSearchLoading] = useState(false);
  const [extClientSelected, setExtClientSelected] = useState<any | null>(null);
  const extClientSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [internalBookingForm, setInternalBookingForm] = useState({
    bookedForName: '', bookedForUserId: '', department: '', roomType: '', floor: '', wing: '', roomName: '', date: '',
    startTime: '', endTime: '', attendees: 1, purpose: '', inviteParticipantIds: [] as string[], notes: '',
  });
  const [isSavingInternalBooking, setIsSavingInternalBooking] = useState(false);

  const [tenantBookingForm, setTenantBookingForm] = useState({
    tenantCompanyId: '', tenantCompanyName: '', bookedByName: '', bookedByEmail: '', bookedByPhone: '',
    roomType: '', floor: '', wing: '', roomName: '', date: '', startTime: '', endTime: '', attendees: 1, purpose: '', notes: '', creditsToDeduct: 0, inviteParticipantIds: [] as string[],
  });
  const [isSavingTenantBooking, setIsSavingTenantBooking] = useState(false);
  const [externalBookingClientTab, setExternalBookingClientTab] = useState<'new' | 'search'>('search');
  const [tenantSearchQuery, setTenantSearchQuery] = useState('');

  // --------- ROOM CATALOG (normalized list) ---------
  const roomCatalog = useMemo(() => roomDetails.map((room: any) => normalizeRoomEntry(room)), [roomDetails]);
  const hasBookableMeetingResources = useMemo(
    () => roomCatalog.some((room) => isActiveRoom(room) && isMeetingCalendarRoom(room)),
    [roomCatalog],
  );
  const hasAnyActiveBookingResource = useMemo(
    () => roomCatalog.some((room) => isActiveRoom(room)),
    [roomCatalog],
  );

  const goToResourcePricing = () => {
    setShowBookingDialog(false);
    setShowInternalBookingDialog(false);
    setShowExternalBookingDialog(false);
    setShowNewExternalBookingDialog(false);
    setShowTenantBookingDialog(false);
    navigate('/sales-crm/resource-pricing', {
      state: { from: '/meeting-rooms', intent: 'add-meeting-resource' },
    });
  };

  const openBookingDialog = (dialog: 'room' | 'internal' | 'external' | 'tenant') => {
    const hasRequiredResource = dialog === 'external'
      ? hasAnyActiveBookingResource
      : hasBookableMeetingResources;
    if (!hasRequiredResource) {
      setShowBookingDialog(true);
      return;
    }
    if (dialog === 'room') {
      setNewBooking((prev) => ({ ...prev, floor: '', wing: '', roomType: '', roomName: '' }));
      setShowBookingDialog(true);
    } else if (dialog === 'internal') {
      setShowInternalBookingDialog(true);
    } else if (dialog === 'external') {
      setShowNewExternalBookingDialog(true);
    } else {
      setShowTenantBookingDialog(true);
    }
  };

  // --------- EXTERNAL (WALK-IN) PRICING ---------
  const externalWalkInPricing = useMemo(() => {
    const room = roomCatalog.find(r => r.name === externalBookingForm.roomName);
    if (!room) return null;

    const startMinutes = timeToMinutes(externalBookingForm.startTime) || 0;
    const endMinutes = timeToMinutes(externalBookingForm.endTime) || 0;
    const durationMinutes = Math.max(0, endMinutes - startMinutes);
    const durationHours = durationMinutes / 60;
    
    let baseAmount = 0;
    if (room.pricePerHour > 0) {
      baseAmount = room.pricePerHour * durationHours;
    } else {
      const capacity = Number(room.capacity || 4);
      const hourly = Math.max(200, Math.round(capacity / 2) * 100);
      baseAmount = hourly * durationHours;
    }

    const subtotalBeforeDiscount = baseAmount;
    const discountType = externalBookingForm.discountType === 'percent' ? 'percent' : 'amount';
    const rawDiscountValue = Number(externalBookingForm.discountValue || 0);
    const discountValue = Number.isFinite(rawDiscountValue) ? Math.max(rawDiscountValue, 0) : 0;
    
    const discountAmountRaw = discountType === 'percent'
      ? (subtotalBeforeDiscount * Math.min(discountValue, 100)) / 100
      : discountValue;
      
    const discountAmount = Math.min(Math.max(discountAmountRaw, 0), subtotalBeforeDiscount);
    const taxableBaseAfterDiscount = Math.max(subtotalBeforeDiscount - discountAmount, 0);
    const gst = taxableBaseAfterDiscount * 0.18;

    return {
      subtotalBeforeDiscount,
      discountType,
      discountValue,
      discountAmount,
      taxableBaseAfterDiscount,
      gst,
      total: taxableBaseAfterDiscount + gst,
    };
  }, [externalBookingForm.roomName, externalBookingForm.startTime, externalBookingForm.endTime, externalBookingForm.discountType, externalBookingForm.discountValue, roomCatalog]);

  // --------- CALENDAR STATE ---------
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonth = calendarDate.getMonth();
  const currentYear = calendarDate.getFullYear();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const handlePrevMonth = () => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNextMonth = () => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const selectedCalendarBookings = useMemo(() => {
    return allBookings.filter(b => b.roomName === calendarRoomFilter && b.date === selectedCalendarDateKey && b.status !== 'cancelled' && isPersonalCalendarBooking(b));
  }, [allBookings, calendarRoomFilter, selectedCalendarDateKey, isPersonalCalendarBooking]);

  const selectedCalendarDateLabel = useMemo(() => {
    if (!selectedCalendarDateKey) return '';
    const [y, m, d] = selectedCalendarDateKey.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [selectedCalendarDateKey]);

  // --------- FORMATTING HELPERS ---------
  const formatCurrency = (amount?: number | null) => {
    const value = Number(amount || 0);
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const getExternalPaymentLabel = (booking: any) => {
    const status = String(booking?.paymentStatus || 'Pending');
    if (status.toLowerCase() !== 'paid') return status;
    const mode = String(booking?.paymentMode || '').trim();
    return mode ? `Paid · ${mode}` : 'Paid';
  };

  const formatTimeSlot = (startTime?: string, endTime?: string) => {
    const fmt = (t?: string) => formatTime12h(t || '');
    if (!startTime && !endTime) return '';
    if (!endTime) return fmt(startTime);
    return `${fmt(startTime)} to ${fmt(endTime)}`;
  };

  const formatTimeOptionLabel = (timeValue: string) => formatTime12h(timeValue);

  const renderScheduleSummary = (booking: any, opts?: { showDate?: boolean }) => {
    const showDate = opts?.showDate !== false;
    return (
      <div className="text-[12px] font-pmedium text-slate-600 flex flex-col gap-0.5">
        {showDate && <span className="font-pmedium text-[#0F172A]">{booking.date || ''}</span>}
        <span className="whitespace-nowrap">{formatTimeSlot(booking.startTime, booking.endTime)}</span>
        {isRescheduledBooking(booking) && booking.previousDate && (
          <span className="text-[10px] font-pmedium text-purple-500 line-through">
            {booking.previousDate} {formatTimeSlot(booking.previousStartTime, booking.previousEndTime)}
          </span>
        )}
      </div>
    );
  };

  const buildBookingDateTime = (date?: string, time?: string) => {
    if (!date || !time) return '';
    return `${date}T${time}:00+05:30`;
  };

  const selectedRoom = (roomName?: string) => {
    return roomCatalog.find(r => r.name === roomName) || roomDetails.find((r: any) => r.name === roomName) || null;
  };

  const isInviteResponseOpen = (booking: any) => {
    if (!booking) return false;
    const status = getBookingDisplayStatus(booking);
    return status === 'booked' || status === 'in progress';
  };

  // Badge count for the Invites tab: only invites the user can still act on.
  // A pending invite whose booking has ended is shown as expired in the list
  // and must not keep the red badge alive.
  const actionablePendingInviteCount = receivedInvites.filter((invite) => {
    if (invite.status !== 'pending') return false;
    const linkedBooking = allBookings.find((booking) => String(booking.recordId) === String(invite.bookingId)) || null;
    return isInviteResponseOpen(linkedBooking);
  }).length;

  const isRoomOptionDisabled = (roomName: string) => {
    const room = roomCatalog.find(r => r.name === roomName);
    if (!room) return false;
    return !isActiveRoom(room);
  };

  const getRoomOptionLabel = (roomName: string) => {
    const room = roomCatalog.find(r => r.name === roomName);
    if (!room) return roomName;
    const parts = [roomName];
    if (room.floor) parts.push(`Floor ${room.floor}`);
    if (room.wing) parts.push(`Wing ${room.wing}`);
    if (room.capacity) parts.push(`${room.capacity} seats`);
    if (!isActiveRoom(room)) parts.push('(Unavailable)');
    return parts.join(' - ');
  };

  // --------- MANAGE OWN BOOKING PERMISSIONS ---------
  const canManageOwnBooking = (booking: any) => {
    const status = getBookingDisplayStatus(booking);
    return status === 'booked' || status === 'in progress';
  };

  const canRescheduleOwnBooking = (booking: any) => {
    return getBookingDisplayStatus(booking) === 'booked';
  };

  const canExtendOwnBooking = (booking: any) => {
    return getBookingDisplayStatus(booking) === 'in progress';
  };

  const getBookingDisplayCount = () => {
    return displayedBookings.length;
  };

  const getInviteMeetingLabel = (booking: any) => {
    if (!booking?.isInvitedMeeting) return '';
    const status = booking.currentInviteStatus;
    if (status === 'accepted') return 'Invited - Accepted';
    if (status === 'rejected') return 'Invited - Rejected';
    return 'Invited';
  };

  // --------- BOOKING TIME VALIDATION ---------
  const bookingTimeValidation = useMemo(() => {
    return getBookingTimeValidation(newBooking.date, newBooking.startTime, newBooking.endTime, BOOKING_DAY_START_MINUTES, BOOKING_DAY_END_MINUTES);
  }, [newBooking.date, newBooking.startTime, newBooking.endTime, BOOKING_DAY_START_MINUTES, BOOKING_DAY_END_MINUTES]);

  const bookingStatus = useMemo(() => {
    if (!newBooking.roomName || !newBooking.date || !newBooking.startTime || !newBooking.endTime) return 'pending';
    return checkAvailability(newBooking);
  }, [newBooking, checkAvailability]);

  const roomDayStatus = useMemo(() => {
    if (!newBooking.roomName || !newBooking.date) return 'pending';
    const dayBookings = allBookings.filter(b =>
      b.roomName === newBooking.roomName && b.date === newBooking.date && b.status !== 'cancelled'
    );
    if (dayBookings.length === 0) return 'available';
    const windows = getRoomTimeWindows(newBooking.roomName, newBooking.date);
    if (windows.length === 0) return 'full';
    return 'partial';
  }, [newBooking.roomName, newBooking.date, allBookings, getRoomTimeWindows]);

  const bookingSuggestions = useMemo(() => {
    if (!newBooking.roomName || !newBooking.date) return [];
    return getSuggestedSlots(newBooking.roomName, newBooking.date, newBooking.startTime, newBooking.endTime);
  }, [newBooking.roomName, newBooking.date, newBooking.startTime, newBooking.endTime, getSuggestedSlots]);

  // --------- INTERNAL BOOKING AVAILABILITY ---------
  const internalBookingTimeValidation = useMemo(() => {
    return getBookingTimeValidation(internalBookingForm.date, internalBookingForm.startTime, internalBookingForm.endTime, BOOKING_DAY_START_MINUTES, BOOKING_DAY_END_MINUTES);
  }, [internalBookingForm.date, internalBookingForm.startTime, internalBookingForm.endTime, BOOKING_DAY_START_MINUTES, BOOKING_DAY_END_MINUTES]);

  const internalBookingAvailability = useMemo(() => {
    if (!internalBookingForm.roomName || !internalBookingForm.date || !internalBookingForm.startTime || !internalBookingForm.endTime) return 'pending';
    return checkAvailability({ roomName: internalBookingForm.roomName, date: internalBookingForm.date, startTime: internalBookingForm.startTime, endTime: internalBookingForm.endTime });
  }, [internalBookingForm.roomName, internalBookingForm.date, internalBookingForm.startTime, internalBookingForm.endTime, checkAvailability]);

  const internalRoomDayStatus = useMemo(() => {
    if (!internalBookingForm.roomName || !internalBookingForm.date) return 'pending';
    const dayBookings = allBookings.filter(b =>
      b.roomName === internalBookingForm.roomName && b.date === internalBookingForm.date && b.status !== 'cancelled'
    );
    if (dayBookings.length === 0) return 'available';
    const windows = getRoomTimeWindows(internalBookingForm.roomName, internalBookingForm.date);
    if (windows.length === 0) return 'full';
    return 'partial';
  }, [internalBookingForm.roomName, internalBookingForm.date, allBookings, getRoomTimeWindows]);

  const internalBookingSuggestions = useMemo(() => {
    if (!internalBookingForm.roomName || !internalBookingForm.date) return [];
    return getSuggestedSlots(internalBookingForm.roomName, internalBookingForm.date, internalBookingForm.startTime, internalBookingForm.endTime);
  }, [internalBookingForm.roomName, internalBookingForm.date, internalBookingForm.startTime, internalBookingForm.endTime, getSuggestedSlots]);

  // --------- RESCHEDULE TIME VALIDATION ---------
  const rescheduleTimeValidation = useMemo(() => {
    return getBookingTimeValidation(rescheduleData.date, rescheduleData.startTime, rescheduleData.endTime, BOOKING_DAY_START_MINUTES, BOOKING_DAY_END_MINUTES);
  }, [rescheduleData.date, rescheduleData.startTime, rescheduleData.endTime, BOOKING_DAY_START_MINUTES, BOOKING_DAY_END_MINUTES]);

  const rescheduleStatus = useMemo(() => {
    if (!rescheduleData.roomName || !rescheduleData.date || !rescheduleData.startTime || !rescheduleData.endTime) return 'pending';
    return checkAvailability(rescheduleData, rescheduleData.recordId || null);
  }, [rescheduleData, checkAvailability]);

  const rescheduleCreditEstimate = useMemo(() => {
    if (normalize(rescheduleData.bookingType) !== 'tenant') return 0;
    const room = roomCatalog.find(r => r.name === rescheduleData.roomName);
    if (!room) return 0;
    const startMinutes = timeToMinutes(rescheduleData.startTime);
    const endMinutes = timeToMinutes(rescheduleData.endTime);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return 0;
    const durationHours = (endMinutes - startMinutes) / 60;
    const rate = Number(room.credits || 0);
    return Number((durationHours * rate).toFixed(2));
  }, [rescheduleData.bookingType, rescheduleData.roomName, rescheduleData.startTime, rescheduleData.endTime, roomCatalog]);

  // --------- EXTEND BOOKING PREVIEW ---------
  const extendBookingPreview = useMemo(() => {
    if (!extendBooking || !extendForm.extraMinutes) return { available: false, reason: 'No booking selected.' };
    const extraMinutes = Number(extendForm.extraMinutes);
    const currentEndMinutes = timeToMinutes(extendBooking.endTime);
    if (currentEndMinutes === null) return { available: false, reason: 'Invalid booking times.' };
    const nextEndMinutes = currentEndMinutes + extraMinutes;
    const nextEndTime = minutesToTimeString(nextEndMinutes);

    const hasConflict = allBookings.some(b =>
      b.roomName === extendBooking.roomName &&
      b.date === extendBooking.date &&
      b.status !== 'cancelled' &&
      b.recordId !== extendBooking.recordId &&
      extendBooking.endTime < b.endTime &&
      nextEndTime > b.startTime
    );
    if (hasConflict) {
      return { available: false, reason: 'A conflicting booking exists in that time slot.' };
    }

    const roomType = getMeetingRoomTypeFromName(extendBooking.roomName) as keyof typeof MEETING_ROOM_EXTENSION_RATES;
    const ratePerHour = MEETING_ROOM_EXTENSION_RATES[roomType] || 500;
    const extensionAmount = Math.round((ratePerHour / 60) * extraMinutes);
    const gst = Math.round(extensionAmount * 0.18);
    const extensionTotal = extensionAmount + gst;
    const nextTotalAmount = (extendBooking.totalAmount || 0) + extensionTotal;

    // Tenant bookings are billed in credits, not currency.
    const isTenant = normalize(extendBooking.bookingType) === 'tenant';
    let creditsToDeduct = 0;
    let remainingCredits: number | null = null;
    if (isTenant) {
      const room = roomCatalog.find(r => r.name === extendBooking.roomName);
      const creditRatePerHour = Number(room?.credits || 0);
      creditsToDeduct = Number(((extraMinutes / 60) * creditRatePerHour).toFixed(2));

      // Resolve the booking's tenant company to check remaining credits (server stays source of truth).
      const companyId = (extendBooking as any).bookedByTenantCompanyId;
      const companyName = (extendBooking as any).bookedByTenantCompanyName;
      const companyList = Array.isArray(tenantCompanies) ? tenantCompanies : [];
      const company = companyList.find(t =>
        (companyId && String((t as any).recordId || (t as any)._id) === String(companyId)) ||
        (companyName && ((t as any).companyName === companyName || (t as any).name === companyName))
      );
      if (company) {
        remainingCredits = Number(
          ((company as any)?.creditsRemaining
            ?? (company as any)?.addOnCredits?.remainingCredits
            ?? Math.max(0, Number((company as any)?.creditsAllocated || 0) - Number((company as any)?.creditsUsed || 0))) || 0
        );
        if (creditsToDeduct > remainingCredits) {
          return {
            available: false,
            reason: 'Not enough credits for this extension.',
            isTenant,
            creditsToDeduct,
            remainingCredits,
          };
        }
      }
    }

    return {
      available: true,
      reason: `Room is free for an additional ${extraMinutes} minutes.`,
      nextEndTime,
      extensionAmount,
      extensionTotal,
      nextTotalAmount,
      isTenant,
      creditsToDeduct,
      remainingCredits,
    };
  }, [extendBooking, extendForm.extraMinutes, allBookings, roomCatalog, tenantCompanies]);

  // --------- SCOPED BOOKINGS (for summary cards) ---------
  const scopedBookings = useMemo(() => {
    return allBookings.filter(b => isMyBooking(b));
  }, [allBookings, isMyBooking]);

  // --------- BOOKING FORM: room filter state ---------
  const [selectedBookingLocation, setSelectedBookingLocation] = useState('');
  const [selectedBookingFloor, setSelectedBookingFloor] = useState('');
  const [selectedBookingWing, setSelectedBookingWing] = useState('');
  const [selectedBookingRoomType, setSelectedBookingRoomType] = useState('');

  const availableLocations = useMemo(() => {
    return [...new Set(roomCatalog.filter(isActiveRoom).map(r => r.location).filter(Boolean))];
  }, [roomCatalog]);

  const availableRoomTypes = useMemo(() => {
    const filtered = roomCatalog.filter(r => isActiveRoom(r) && (!selectedBookingLocation || r.location === selectedBookingLocation));
    return [...new Set(filtered.map(r => r.type).filter(Boolean))];
  }, [roomCatalog, selectedBookingLocation]);

  const availableFloors = useMemo(() => {
    const filtered = roomCatalog.filter(r =>
      isActiveRoom(r) &&
      (!selectedBookingLocation || r.location === selectedBookingLocation) &&
      (!selectedBookingRoomType || r.type === selectedBookingRoomType)
    );
    return [...new Set(filtered.map(r => r.floor).filter(Boolean))];
  }, [roomCatalog, selectedBookingLocation, selectedBookingRoomType]);

  const floorHasWingValues = useMemo(() => {
    const filtered = roomCatalog.filter(r =>
      isActiveRoom(r) &&
      (!selectedBookingLocation || r.location === selectedBookingLocation) &&
      (!selectedBookingRoomType || r.type === selectedBookingRoomType) &&
      (!selectedBookingFloor || r.floor === selectedBookingFloor)
    );
    return filtered.some(r => Boolean(r.wing));
  }, [roomCatalog, selectedBookingLocation, selectedBookingRoomType, selectedBookingFloor]);

  const availableWings = useMemo(() => {
    const filtered = roomCatalog.filter(r =>
      isActiveRoom(r) &&
      (!selectedBookingLocation || r.location === selectedBookingLocation) &&
      (!selectedBookingRoomType || r.type === selectedBookingRoomType) &&
      (!selectedBookingFloor || r.floor === selectedBookingFloor)
    );
    return [...new Set(filtered.map(r => r.wing).filter(Boolean))];
  }, [roomCatalog, selectedBookingLocation, selectedBookingRoomType, selectedBookingFloor]);

  const bookingRoomsAtSelectedLocation = useMemo(() => {
    return roomCatalog.filter(r =>
      isActiveRoom(r) &&
      isMeetingCalendarRoom(r) &&
      (!selectedBookingLocation || r.location === selectedBookingLocation) &&
      (!selectedBookingRoomType || r.type === selectedBookingRoomType) &&
      (!selectedBookingFloor || r.floor === selectedBookingFloor) &&
      (!selectedBookingWing || !r.wing || r.wing === selectedBookingWing)
    );
  }, [roomCatalog, selectedBookingLocation, selectedBookingRoomType, selectedBookingFloor, selectedBookingWing]);

  const selectedFloorRoomTypeCount = useMemo(() => {
    return roomCatalog.filter(r =>
      isActiveRoom(r) &&
      isMeetingCalendarRoom(r) &&
      (!selectedBookingLocation || r.location === selectedBookingLocation) &&
      (!selectedBookingRoomType || r.type === selectedBookingRoomType) &&
      (!selectedBookingFloor || r.floor === selectedBookingFloor) &&
      (!selectedBookingWing || !r.wing || r.wing === selectedBookingWing)
    ).length;
  }, [roomCatalog, selectedBookingLocation, selectedBookingRoomType, selectedBookingFloor, selectedBookingWing]);

  const canShowRoomTypeCount = Boolean(selectedBookingRoomType || selectedBookingFloor);

  const selectedRoomCapacity = useMemo(() => {
    return getRoomCapacity(newBooking.roomName);
  }, [newBooking.roomName, getRoomCapacity]);

  // --------- TIME OPTIONS ---------
  const createStartTimeOptions = useMemo(() => {
    const now = getMeetingClockParts();
    if (!now || !newBooking.date) return buildTimeOptions(BOOKING_DAY_START, minutesToTimeString(BOOKING_DAY_END_MINUTES - BOOKING_MIN_DURATION_MINUTES));
    const parts = getMeetingTimeZoneDateParts(newBooking.date);
    const todayKey = now.dateKey;
    const bookingDateKey = parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
    if (bookingDateKey === todayKey) {
      const minTime = minutesToTimeString(Math.ceil((now.minutes + 5) / BOOKING_SLOT_STEP_MINUTES) * BOOKING_SLOT_STEP_MINUTES);
      return buildTimeOptions(minTime, minutesToTimeString(BOOKING_DAY_END_MINUTES - BOOKING_MIN_DURATION_MINUTES));
    }
    return buildTimeOptions(BOOKING_DAY_START, minutesToTimeString(BOOKING_DAY_END_MINUTES - BOOKING_MIN_DURATION_MINUTES));
  }, [newBooking.date, BOOKING_DAY_START, BOOKING_DAY_END_MINUTES]);

  const createEndTimeOptions = useMemo(() => {
    if (!newBooking.startTime) return buildTimeOptions(minutesToTimeString(BOOKING_DAY_START_MINUTES + BOOKING_MIN_DURATION_MINUTES), BOOKING_DAY_END);
    const minEnd = minutesToTimeString((timeToMinutes(newBooking.startTime) || 0) + BOOKING_MIN_DURATION_MINUTES);
    return buildTimeOptions(minEnd, BOOKING_DAY_END);
  }, [newBooking.startTime, BOOKING_DAY_START_MINUTES, BOOKING_DAY_END]);

  const tenantStartTimeOptions = useMemo(() => {
    const now = getMeetingClockParts();
    if (!now || !tenantBookingForm.date) return buildTimeOptions(BOOKING_DAY_START, minutesToTimeString(BOOKING_DAY_END_MINUTES - BOOKING_MIN_DURATION_MINUTES));
    const parts = getMeetingTimeZoneDateParts(tenantBookingForm.date);
    const todayKey = now.dateKey;
    const bookingDateKey = parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
    if (bookingDateKey === todayKey) {
      const minTime = minutesToTimeString(Math.ceil((now.minutes + 5) / BOOKING_SLOT_STEP_MINUTES) * BOOKING_SLOT_STEP_MINUTES);
      return buildTimeOptions(minTime, minutesToTimeString(BOOKING_DAY_END_MINUTES - BOOKING_MIN_DURATION_MINUTES));
    }
    return buildTimeOptions(BOOKING_DAY_START, minutesToTimeString(BOOKING_DAY_END_MINUTES - BOOKING_MIN_DURATION_MINUTES));
  }, [tenantBookingForm.date, BOOKING_DAY_START, BOOKING_DAY_END_MINUTES]);

  const tenantEndTimeOptions = useMemo(() => {
    if (!tenantBookingForm.startTime) return buildTimeOptions(minutesToTimeString(BOOKING_DAY_START_MINUTES + BOOKING_MIN_DURATION_MINUTES), BOOKING_DAY_END);
    const minEnd = minutesToTimeString((timeToMinutes(tenantBookingForm.startTime) || 0) + BOOKING_MIN_DURATION_MINUTES);
    return buildTimeOptions(minEnd, BOOKING_DAY_END);
  }, [tenantBookingForm.startTime, BOOKING_DAY_START_MINUTES, BOOKING_DAY_END]);

  const internalStartTimeOptions = useMemo(() => {
    const now = getMeetingClockParts();
    if (!now || !internalBookingForm.date) return buildTimeOptions(BOOKING_DAY_START, minutesToTimeString(BOOKING_DAY_END_MINUTES - BOOKING_MIN_DURATION_MINUTES));
    const parts = getMeetingTimeZoneDateParts(internalBookingForm.date);
    const todayKey = now.dateKey;
    const bookingDateKey = parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
    if (bookingDateKey === todayKey) {
      const minTime = minutesToTimeString(Math.ceil((now.minutes + 5) / BOOKING_SLOT_STEP_MINUTES) * BOOKING_SLOT_STEP_MINUTES);
      return buildTimeOptions(minTime, minutesToTimeString(BOOKING_DAY_END_MINUTES - BOOKING_MIN_DURATION_MINUTES));
    }
    return buildTimeOptions(BOOKING_DAY_START, minutesToTimeString(BOOKING_DAY_END_MINUTES - BOOKING_MIN_DURATION_MINUTES));
  }, [internalBookingForm.date, BOOKING_DAY_START, BOOKING_DAY_END_MINUTES]);

  const externalStartTimeOptions = useMemo(() => {
    const now = getMeetingClockParts();
    if (!now || !externalBookingForm.date) return buildTimeOptions(BOOKING_DAY_START, minutesToTimeString(BOOKING_DAY_END_MINUTES - BOOKING_MIN_DURATION_MINUTES));
    const parts = getMeetingTimeZoneDateParts(externalBookingForm.date);
    const todayKey = now.dateKey;
    const bookingDateKey = parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
    if (bookingDateKey === todayKey) {
      const minTime = minutesToTimeString(Math.ceil((now.minutes + 5) / BOOKING_SLOT_STEP_MINUTES) * BOOKING_SLOT_STEP_MINUTES);
      return buildTimeOptions(minTime, minutesToTimeString(BOOKING_DAY_END_MINUTES - BOOKING_MIN_DURATION_MINUTES));
    }
    return buildTimeOptions(BOOKING_DAY_START, minutesToTimeString(BOOKING_DAY_END_MINUTES - BOOKING_MIN_DURATION_MINUTES));
  }, [externalBookingForm.date, BOOKING_DAY_START, BOOKING_DAY_END_MINUTES]);

  // --------- INVITE MEMBER HELPERS ---------
  const resolveMemberName = (member: any) => {
    return getEmployeeDisplayName(member) || member?.fullName || member?.name || member?.email || '';
  };

  const formatInviteGroupLabel = (role?: string) => {
    if (!role) return 'Member';
    return role.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const resolveInviteDisplayRole = (invite: any) => {
    const userId = String(invite?.invitedUserId || '').trim();
    const member = userId ? memberDirectoryById.get(userId) : null;
    const role = normalize(invite?.invitedRole || member?.role || '');
    // Founder, Super Admin, and Admin show their role label
    const isManagement =
      role === 'owner' ||
      role === 'founder' ||
      role === 'super_admin' ||
      role === 'super-admin' ||
      role === 'admin';
    if (isManagement) return invite?.invitedRole || member?.role || '';
    // Everyone else (Manager, Employee, etc.) shows their department
    return (
      (member as any)?.departments?.[0] ||
      (member as any)?.department ||
      invite?.department ||
      invite?.invitedRole ||
      member?.role ||
      ''
    );
  };

  const inviteDepartments = useMemo(() => {
    const filteredMembers = workspaceMembers.filter(member => {
      const memberId = resolveMemberUserId(member);
      const isExternalOrTenant = normalize(member.role) === 'external' || normalize(member.role) === 'tenant';
      return memberId && memberId !== currentUserId && !isExternalOrTenant;
    });

    // Management roles get their own dedicated groups (in display order)
    const managementGroupOrder = [
      { key: '__founder__',     roles: ['owner', 'founder'],               label: 'Founder' },
      { key: '__super_admin__', roles: ['super_admin', 'super-admin'],      label: 'Super Admin' },
      { key: '__admin__',       roles: ['admin'],                           label: 'Admin' },
    ];
    const managementRoleSet = new Set(managementGroupOrder.flatMap(g => g.roles));

    // Bucket each member
    const managementBuckets: Record<string, any[]> = {};
    const departmentMap = new Map<string, any[]>();

    filteredMembers.forEach(member => {
      const role = normalize((member as any).role || '');
      if (managementRoleSet.has(role)) {
        const group = managementGroupOrder.find(g => g.roles.includes(role));
        if (group) {
          if (!managementBuckets[group.key]) managementBuckets[group.key] = [];
          managementBuckets[group.key].push(member);
        }
        return;
      }
      // Managers, Employees and other non-management → group by department
      const depts = (member as any).departments?.length
        ? (member as any).departments
        : [(member as any).department || 'General'];
      (depts as string[]).filter(Boolean).forEach((dept: string) => {
        if (!departmentMap.has(dept)) departmentMap.set(dept, []);
        departmentMap.get(dept)!.push(member);
      });
    });

    const result: { department: string; label: string; members: any[] }[] = [];

    // Management groups first (Founder → Super Admin → Admin)
    managementGroupOrder.forEach(({ key, label }) => {
      if (managementBuckets[key]?.length) {
        result.push({ department: key, label, members: managementBuckets[key] });
      }
    });

    // Then alphabetical department groups
    Array.from(departmentMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([dept, members]) => result.push({ department: dept, label: dept, members }));

    return result;
  }, [workspaceMembers, currentUserId]);

  const internalBookingEligibleParticipants = useMemo(() => {
    const hostId = internalBookingForm.bookedForUserId;
    const hostDept = (internalBookingForm.department || '').trim().toLowerCase();
    if (!hostId) return [];

    // Find the host member to check their role
    const hostMember = workspaceMembers.find((m: any) => resolveMemberUserId(m) === hostId);
    const hostRole = normalize((hostMember as any)?.role || '');
    const hostIsManagement = hostRole === 'owner' || hostRole === 'founder' || hostRole === 'super_admin' || hostRole === 'super-admin' || hostRole === 'admin';

    return workspaceMembers.filter((member: any) => {
      const memberId = resolveMemberUserId(member);
      if (!memberId) return false;
      if (memberId === hostId) return false;
      if (memberId === currentUserId) return false;
      const role = normalize(member.role);
      if (role === 'external' || role === 'tenant') return false;

      // Management host → show all non-external, non-tenant members
      if (hostIsManagement) return true;

      // Department host → show only members in same department
      if (!hostDept) return false;
      const depts = Array.isArray(member.departments)
        ? member.departments.map((d: any) => normalize(d)).filter(Boolean)
        : [];
      const singleDept = normalize(member.department);
      return depts.includes(hostDept) || singleDept === hostDept;
    });
  }, [workspaceMembers, internalBookingForm.bookedForUserId, internalBookingForm.department, currentUserId]);

  // --------- RESCHEDULE TIME OPTIONS ---------
  const rescheduleStartTimeOptions = useMemo(() => {
    const now = getMeetingClockParts();
    if (!now || !rescheduleData.date) return buildTimeOptions(BOOKING_DAY_START, minutesToTimeString(BOOKING_DAY_END_MINUTES - BOOKING_MIN_DURATION_MINUTES));
    const parts = getMeetingTimeZoneDateParts(rescheduleData.date);
    const todayKey = now.dateKey;
    const bookingDateKey = parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
    if (bookingDateKey === todayKey) {
      const minTime = minutesToTimeString(Math.ceil((now.minutes + 5) / BOOKING_SLOT_STEP_MINUTES) * BOOKING_SLOT_STEP_MINUTES);
      return buildTimeOptions(minTime, minutesToTimeString(BOOKING_DAY_END_MINUTES - BOOKING_MIN_DURATION_MINUTES));
    }
    return buildTimeOptions(BOOKING_DAY_START, minutesToTimeString(BOOKING_DAY_END_MINUTES - BOOKING_MIN_DURATION_MINUTES));
  }, [rescheduleData.date, BOOKING_DAY_START, BOOKING_DAY_END_MINUTES]);

  const rescheduleEndTimeOptions = useMemo(() => {
    if (!rescheduleData.startTime) return buildTimeOptions(minutesToTimeString(BOOKING_DAY_START_MINUTES + BOOKING_MIN_DURATION_MINUTES), BOOKING_DAY_END);
    const minEnd = minutesToTimeString((timeToMinutes(rescheduleData.startTime) || 0) + BOOKING_MIN_DURATION_MINUTES);
    return buildTimeOptions(minEnd, BOOKING_DAY_END);
  }, [rescheduleData.startTime, BOOKING_DAY_START_MINUTES, BOOKING_DAY_END]);

  // --------- ALL NORMALIZED ROOMS (flat list for booking dialogs) ---------
  const allNormalizedRooms = useMemo(() => {
    return roomCatalog.filter(isActiveRoom).map(room => ({
      ...room,
      roomId: String(room._id || room.id || ''),
    }));
  }, [roomCatalog]);

  const handleCreateBooking = async () => {
    if (!newBooking.roomName) { setErrorMessage('Select a meeting room to continue.'); return; }
    if (!newBooking.purpose.trim()) { setErrorMessage('Purpose / Agenda is required.'); return; }
    if (!bookingTimeValidation.valid) { setErrorMessage(bookingTimeValidation.reason); return; }
    if (bookingStatus !== 'available') return;

    setIsSavingBooking(true);
    setErrorMessage('');

    try {
      const room = selectedRoom(newBooking.roomName);
      const roomId = String(room?._id || room?.id || '');
      if (!roomId) throw new Error('The selected room is missing its ID. Refresh and try again.');
      await createMeetingRoomBooking({
        roomId,
        start: buildBookingDateTime(newBooking.date, newBooking.startTime),
        end: buildBookingDateTime(newBooking.date, newBooking.endTime),
        purpose: newBooking.purpose.trim(),
        attendees: getBookingAttendeeCount(newBooking),
        inviteeUserIds: newBooking.inviteeUserIds,
        department: managerProfile.department,
      });
      await reloadBookings();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || error?.message || 'Failed to create booking.');
      setIsSavingBooking(false);
      return;
    }

    setNewBooking({ roomName: '', floor: '', wing: '', location: '', roomType: '', date: '', startTime: '', endTime: '', purpose: '', inviteeUserIds: [] });
    setShowBookingDialog(false);
    setIsSavingBooking(false);
  };

  const handleCancelBooking = async () => {
    if (!bookingToCancel?.recordId || !cancelReason.trim()) return;

    setIsSavingBooking(true);
    setErrorMessage('');

    try {
      await cancelBooking(bookingToCancel.recordId, cancelReason.trim());
      await reloadBookings();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || error?.message || 'Failed to cancel booking.');
      setIsSavingBooking(false);
      return;
    }
    setShowCancelDialog(false);
    setBookingToCancel(null);
    setCancelReason('');
    setIsSavingBooking(false);
  };

  const handleRescheduleBooking = async () => {
    if (!rescheduleTimeValidation.valid) { setErrorMessage(rescheduleTimeValidation.reason); return; }
    if (!rescheduleData?.recordId || rescheduleStatus !== 'available') return;

    setIsSavingBooking(true);
    setErrorMessage('');

    try {
      // For external bookings, recalculate total based on new duration
      const isExternal = normalize(rescheduleData.bookingType) === 'external';
      let externalPricingUpdate: Record<string, any> = {};
      if (isExternal && rescheduleData.startTime && rescheduleData.endTime) {
        const room = roomCatalog.find(r => r.name === rescheduleData.roomName);
        const pricePerHour = Number(room?.pricePerHour || 0);
        if (pricePerHour > 0) {
          const newPricing = computeExternalPricing(pricePerHour, rescheduleData.startTime, rescheduleData.endTime, 'flat', 0);
          externalPricingUpdate = {
            baseAmount: newPricing.basePriceRaw,
            gstAmount: newPricing.gstAmount,
            totalAmount: newPricing.totalAmount,
          };
        }
      }

      await updateMeetingRoomBooking(rescheduleData.recordId, {
        start: buildBookingDateTime(rescheduleData.date, rescheduleData.startTime),
        end: buildBookingDateTime(rescheduleData.date, rescheduleData.endTime),
        scheduleChangeType: 'rescheduled',
        ...(normalize(rescheduleData.bookingType) === 'tenant' && rescheduleInviteeIds.length > 0 ? { inviteeUserIds: rescheduleInviteeIds } : {}),
        ...externalPricingUpdate,
      });
      await reloadBookings();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || error?.message || 'Failed to reschedule booking.');
      setIsSavingBooking(false);
      return;
    }
    setShowRescheduleDialog(false);
    setRescheduleData({});
    setRescheduleInviteeIds([]);
    setIsSavingBooking(false);
  };

  const closeExtendDialog = () => {
    setShowExtendDialog(false);
    setExtendBooking(null);
    setExtendForm({ extraMinutes: '30' });
    setErrorMessage('');
  };

  const handleExtendBooking = async () => {
    if (!extendBookingPreview?.available || !extendBooking?.recordId) {
      setErrorMessage(extendBookingPreview?.reason || 'Unable to extend this booking right now.');
      return;
    }

    setIsSavingBooking(true);
    setErrorMessage('');

    try {
      const end = buildBookingDateTime(extendBooking.date, extendBookingPreview.nextEndTime);
      const updatePayload = extendBookingPreview.isTenant
        ? { end, scheduleChangeType: 'extended' as const }
        : {
            end,
            extensionAmount: extendBookingPreview.extensionAmount,
            totalAmount: extendBookingPreview.nextTotalAmount,
            scheduleChangeType: 'extended' as const,
          };
      await updateMeetingRoomBooking(extendBooking.recordId, updatePayload);
      await reloadBookings();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || error?.message || 'Failed to extend booking.');
      setIsSavingBooking(false);
      return;
    }
    closeExtendDialog();
    setIsSavingBooking(false);
  };

  const closeRejectInviteDialog = () => {
    setShowRejectInviteDialog(false);
    setInviteToReject(null);
    setInviteRejectReason('');
  };

  const submitInviteResponse = async (invite: any, status: string, reason: string = '') => {
    if (!invite?.bookingId) return;

    const linkedBooking = allBookings.find((booking) => String(booking.recordId) === String(invite.bookingId)) || null;
    if (!isInviteResponseOpen(linkedBooking)) {
      setErrorMessage('This meeting has already ended. You can no longer respond to this invite.');
      closeRejectInviteDialog();
      return;
    }

    setIsSavingBooking(true);
    setErrorMessage('');

    try {
      await respondToMeetingRoomInvite(invite.bookingId, { status, reason });
      await reloadBookings();
      setReceivedInvites((prev) => prev.map((i) => String(i.bookingId) === String(invite.bookingId) ? { ...i, status, responseReason: reason } : i));
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || error?.message || 'Failed to respond to invite.');
      setIsSavingBooking(false);
      return;
    }
    if (status === 'rejected') closeRejectInviteDialog();
    setIsSavingBooking(false);
  };

  const handleInviteResponse = async (invite: any, status: string) => {
    const linkedBooking = allBookings.find((booking) => String(booking.recordId) === String(invite.bookingId)) || null;
    if (!isInviteResponseOpen(linkedBooking)) {
      setErrorMessage('This meeting has already ended. You can no longer respond to this invite.');
      return;
    }

    if (status === 'rejected') {
      setInviteToReject(invite);
      setInviteRejectReason('');
      setShowRejectInviteDialog(true);
      return;
    }

    await submitInviteResponse(invite, status);
  };

  const handleRejectInviteSubmit = async () => {
    if (!inviteToReject?.bookingId || !inviteRejectReason.trim()) {
      return;
    }

    await submitInviteResponse(inviteToReject, 'rejected', inviteRejectReason.trim());
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'accepted': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
      case 'booked': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in progress': return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      case 'rescheduled': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // --------- LOAD TENANT COMPANIES for Tenant Booking tab ---------
  useEffect(() => {
    if (mainBookingTab !== 'tenant_bookings') return;
    let isMounted = true;
    setIsLoadingTenants(true);
    getTenantCompanies()
      .then((response) => {
        if (!isMounted) return;
        const list = Array.isArray(response?.data?.tenants) ? response.data.tenants : [];
        setTenantCompanies(list);
      })
      .catch(() => {})
      .finally(() => { if (isMounted) setIsLoadingTenants(false); });
    return () => { isMounted = false; };
  }, [mainBookingTab]);

  // --------- SUMMARY CARDS (change per mainBookingTab) ---------
  const meetingSummaryCards = useMemo(() => {
    const upcomingCount = scopedBookings.filter(b => getBookingDisplayStatus(b) === 'booked').length;
    const inProgressCount = scopedBookings.filter(b => getBookingDisplayStatus(b) === 'in progress').length;
    const completedCount = scopedBookings.filter(b => getBookingDisplayStatus(b) === 'completed').length;
    const cancelledCount = scopedBookings.filter(b => getBookingDisplayStatus(b) === 'cancelled').length;
    const externalBookings = allBookings.filter(b => normalize(b.bookingType) === 'external');
    const tenantBookings = allBookings.filter(b => normalize(b.bookingType) === 'tenant');

    if (mainBookingTab === 'external_booking') {
      return [
        { key: 'ext-total', icon: Globe, label: 'Total External', value: externalBookings.length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', iconClass: 'bg-amber-50 text-amber-600' },
        { key: 'ext-upcoming', icon: CalendarClock, label: 'Upcoming', value: externalBookings.filter(b => getBookingDisplayStatus(b) === 'booked').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500', iconClass: 'bg-blue-50 text-blue-600' },
        { key: 'ext-progress', icon: Clock, label: 'In Progress', value: externalBookings.filter(b => getBookingDisplayStatus(b) === 'in progress').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500', iconClass: 'bg-amber-50 text-amber-600' },
        { key: 'ext-completed', icon: CheckCircle2, label: 'Completed', value: externalBookings.filter(b => getBookingDisplayStatus(b) === 'completed').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', iconClass: 'bg-emerald-50 text-emerald-600' },
      ];
    }
    if (mainBookingTab === 'tenant_bookings') {
      return [
        { key: 'ten-total', icon: Building2, label: 'Total Tenant Bookings', value: tenantBookings.length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', iconClass: 'bg-blue-50 text-blue-600' },
        { key: 'ten-upcoming', icon: CalendarClock, label: 'Upcoming', value: tenantBookings.filter(b => getBookingDisplayStatus(b) === 'booked').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500', iconClass: 'bg-blue-50 text-blue-600' },
        { key: 'ten-progress', icon: Clock, label: 'In Progress', value: tenantBookings.filter(b => getBookingDisplayStatus(b) === 'in progress').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500', iconClass: 'bg-amber-50 text-amber-600' },
        { key: 'ten-companies', icon: Briefcase, label: 'Tenant Companies', value: tenantCompanies.filter(t => t.status === 'Active').length || tenantCompanies.length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-indigo-500', iconClass: 'bg-indigo-50 text-indigo-600' },
      ];
    }
    if (mainBookingTab === 'internal_booking') {
      const internalBookings = allBookings.filter(b => normalize(b.bookingType) !== 'external' && normalize(b.bookingType) !== 'tenant');
      return [
        { key: 'int-upcoming', icon: CalendarClock, label: 'Upcoming', value: internalBookings.filter(b => getBookingDisplayStatus(b) === 'booked').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', iconClass: 'bg-blue-50 text-blue-600' },
        { key: 'int-progress', icon: Clock, label: 'In Progress', value: internalBookings.filter(b => getBookingDisplayStatus(b) === 'in progress').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500', iconClass: 'bg-amber-50 text-amber-600' },
        { key: 'int-done', icon: CheckCircle2, label: 'Completed', value: internalBookings.filter(b => getBookingDisplayStatus(b) === 'completed').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', iconClass: 'bg-emerald-50 text-emerald-600' },
        { key: 'int-cancelled', icon: XCircle, label: 'Cancelled', value: internalBookings.filter(b => getBookingDisplayStatus(b) === 'cancelled').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-red-500', iconClass: 'bg-red-50 text-red-600' },
      ];
    }
    // my_bookings (default)
    return [
      { key: 'my-upcoming', icon: CalendarClock, label: 'Upcoming', value: upcomingCount, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', iconClass: 'bg-blue-50 text-blue-600' },
      { key: 'my-progress', icon: Clock, label: 'In Progress', value: inProgressCount, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500', iconClass: 'bg-amber-50 text-amber-600' },
      { key: 'my-done', icon: CheckCircle2, label: 'Completed', value: completedCount, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', iconClass: 'bg-emerald-50 text-emerald-600' },
      { key: 'my-cancelled', icon: XCircle, label: 'Cancelled', value: cancelledCount, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-red-500', iconClass: 'bg-red-50 text-red-600' },
    ];
  }, [mainBookingTab, scopedBookings, allBookings, tenantCompanies]);

  // --------- EXISTING EXTERNAL CLIENTS (derived from booking history for the Existing Client tab) ---------
  const existingExternalClients = useMemo(() => {
    const seen = new Set<string>();
    const clients: { name: string; phone: string; email: string; company: string }[] = [];
    allBookings
      .filter(b => normalize(b.bookingType) === 'external' && getExternalClientName(b))
      .forEach(b => {
        const clientName = getExternalClientName(b);
        const key = clientName.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          clients.push({
            name: clientName,
            phone: (b as any).bookedByPhone || '',
            email: (b as any).bookedByEmail || '',
            company: (b as any).clientCompany || '',
          });
        }
      });
    return clients;
  }, [allBookings]);

  // --------- HANDLERS for new booking modals ---------
  const handleSubmitExternalBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalBookingForm.name.trim()) return setErrorMessage('Client name is required.');
    if (!externalBookingForm.phone.trim()) return setErrorMessage('Phone number is required.');
    if (!externalBookingForm.roomName) return setErrorMessage('Please select a room.');
    if (!externalBookingForm.date) return setErrorMessage('Date is required.');
    if (!externalBookingForm.startTime) return setErrorMessage('Start time is required.');
    if (!externalBookingForm.endTime) return setErrorMessage('End time is required.');
    const externalTimeValidation = getBookingTimeValidation(externalBookingForm.date, externalBookingForm.startTime, externalBookingForm.endTime, BOOKING_DAY_START_MINUTES, BOOKING_DAY_END_MINUTES);
    if (!externalTimeValidation.valid) return setErrorMessage(externalTimeValidation.reason);
    if (externalBookingForm.paymentMode !== 'Cash' && !externalBookingForm.transactionId.trim()) return setErrorMessage('Transaction / UTR number is required for GPay payments.');
    if (externalBookingForm.paymentMode !== 'Cash' && !externalBookingForm.paymentProofFile) return setErrorMessage('Upload the GPay payment screenshot.');
    setIsSavingExternalBooking(true);
    setErrorMessage('');
    try {
      const result = await createMeetingRoomBooking({
        bookingType: 'External',
        bookingSource: 'Admin Panel',
        bookedByName: externalBookingForm.name,
        bookedForName: externalBookingForm.name,
        bookedByPhone: externalBookingForm.phone,
        bookedByEmail: externalBookingForm.email,
        clientCompany: externalBookingForm.company,
        roomName: externalBookingForm.roomName,
        date: externalBookingForm.date,
        startTime: externalBookingForm.startTime,
        endTime: externalBookingForm.endTime,
        attendees: externalBookingForm.attendees,
        purpose: externalBookingForm.purpose || 'External Booking',
        paymentMode: externalBookingForm.paymentMode,
        paymentStatus: 'Paid',
        transactionId: externalBookingForm.transactionId,
        paymentProof: externalBookingForm.paymentProofFile,
        bookingNotes: externalBookingForm.notes,
        totalAmount: externalWalkInPricing?.total || 0,
        amountDue: externalWalkInPricing?.total || 0,
        discountType: externalWalkInPricing?.discountType || 'amount',
        discountValue: externalWalkInPricing?.discountValue || 0,
        discountAmount: externalWalkInPricing?.discountAmount || 0,
        subtotalBeforeDiscount: externalWalkInPricing?.subtotalBeforeDiscount || 0,
        taxableBaseAfterDiscount: externalWalkInPricing?.taxableBaseAfterDiscount || 0,
        baseAmount: externalWalkInPricing?.taxableBaseAfterDiscount || 0,
        gstAmount: externalWalkInPricing?.gst || 0,
      } as any);
      await reloadBookings();

      // Send email confirmation if client has an email address (silent — don't fail booking on email error)
      if (externalBookingForm.email) {
        const bookingId = result?.booking?._id || result?.booking?.id || result?._id || result?.id;
        if (bookingId) {
          try { await sendExternalBookingConfirmationEmail(String(bookingId)); } catch { /* silent */ }
        }
      }

      setShowExternalBookingDialog(false);
      setExternalBookingForm({ name: '', phone: '', email: '', company: '', roomType: '', floor: '', wing: '', roomName: '', date: '', startTime: '', endTime: '', attendees: 1, purpose: '', paymentMode: 'Cash', transactionId: '', paymentProofFile: null, discountType: 'amount', discountValue: '', notes: '' });
      setExtClientSearch(''); setExtClientSearchResults([]); setExtClientSelected(null);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || error?.message || 'Failed to create external booking.');
    } finally {
      setIsSavingExternalBooking(false);
    }
  };

  const handleSubmitInternalBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalBookingForm.bookedForUserId?.trim()) {
      setErrorMessage('Please select a member to book on behalf of.');
      return;
    }
    if (!internalBookingForm.roomName) return setErrorMessage('Please select a room.');
    if (!internalBookingForm.date) return setErrorMessage('Date is required.');
    if (!internalBookingForm.startTime) return setErrorMessage('Start time is required.');
    if (!internalBookingForm.endTime) return setErrorMessage('End time is required.');
    setIsSavingInternalBooking(true);
    setErrorMessage('');
    try {
      // Strip host from invitee list (safety guard)
      const safeInviteeIds = internalBookingForm.inviteParticipantIds.filter(
        id => id !== internalBookingForm.bookedForUserId
      );
      await createMeetingRoomBooking({
        bookingType: 'Internal',
        bookingSource: 'Admin Panel',
        bookedByName: managerProfile.name,
        bookedForName: internalBookingForm.bookedForName,
        bookedForUserId: internalBookingForm.bookedForUserId,
        department: internalBookingForm.department || managerProfile.department,
        roomName: internalBookingForm.roomName,
        date: internalBookingForm.date,
        startTime: internalBookingForm.startTime,
        endTime: internalBookingForm.endTime,
        attendees: internalBookingForm.attendees,
        purpose: internalBookingForm.purpose || 'Internal Meeting',
        inviteeUserIds: safeInviteeIds,
        bookingNotes: internalBookingForm.notes,
      } as any);
      await reloadBookings();
      setShowInternalBookingDialog(false);
      setInternalBookingForm({ bookedForName: '', bookedForUserId: '', department: '', roomType: '', floor: '', wing: '', roomName: '', date: '', startTime: '', endTime: '', attendees: 1, purpose: '', inviteParticipantIds: [], notes: '' });
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || error?.message || 'Failed to create internal booking.');
    } finally {
      setIsSavingInternalBooking(false);
    }
  };

  const handleSubmitTenantBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantBookingForm.tenantCompanyId) { setTenantBookingError('Please select a tenant company.'); return; }
    if (!tenantBookingForm.roomName) { setTenantBookingError('Please select a room.'); return; }
    if (!tenantBookingForm.date) { setTenantBookingError('Date is required.'); return; }
    if (!tenantBookingForm.startTime) { setTenantBookingError('Start time is required.'); return; }
    if (!tenantBookingForm.endTime) { setTenantBookingError('End time is required.'); return; }
    const tenantTimeValidation = getBookingTimeValidation(tenantBookingForm.date, tenantBookingForm.startTime, tenantBookingForm.endTime, BOOKING_DAY_START_MINUTES, BOOKING_DAY_END_MINUTES);
    if (!tenantTimeValidation.valid) { setTenantBookingError(tenantTimeValidation.reason); return; }
    setIsSavingTenantBooking(true);
    setTenantBookingError('');
    try {
      await createMeetingRoomBooking({
        bookingType: 'Tenant',
        bookingSource: 'Admin Panel',
        bookedByName: tenantBookingForm.bookedByName || managerProfile.name,
        bookedByEmail: tenantBookingForm.bookedByEmail,
        bookedByPhone: tenantBookingForm.bookedByPhone,
        clientCompany: tenantBookingForm.tenantCompanyName,
        tenantCompanyId: tenantBookingForm.tenantCompanyId,
        sourceReference: `tenant-room-booking:${tenantBookingForm.tenantCompanyId}`,
        roomName: tenantBookingForm.roomName,
        date: tenantBookingForm.date,
        startTime: tenantBookingForm.startTime,
        endTime: tenantBookingForm.endTime,
        // On-behalf booking: attendees = invited tenant employees only (host/founder is not an attendee)
        attendees: Math.max(1, tenantBookingForm.inviteParticipantIds.length),
        purpose: tenantBookingForm.purpose || 'Tenant Meeting',
        inviteeUserIds: tenantBookingForm.inviteParticipantIds,
        bookingNotes: tenantBookingForm.notes,
      } as any);
      await reloadBookings();
      setShowTenantBookingDialog(false);
      setTenantBookingForm({ tenantCompanyId: '', tenantCompanyName: '', bookedByName: '', bookedByEmail: '', bookedByPhone: '', roomType: '', floor: '', wing: '', roomName: '', date: '', startTime: '', endTime: '', attendees: 1, purpose: '', notes: '', creditsToDeduct: 0, inviteParticipantIds: [] });
      setTenantSearchQuery('');
    } catch (error: any) {
      setTenantBookingError(error?.response?.data?.message || error?.message || 'Failed to create tenant booking.');
    } finally {
      setIsSavingTenantBooking(false);
    }
  };

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-pmedium text-[12px]">
      <PageFrame>
        {isInitialLoading && (
          <div className="flex flex-col gap-4 animate-pulse">
            {/* Header skeleton */}
            <div className="h-8 w-64 bg-slate-200 rounded-xl" />
            <div className="h-4 w-80 bg-slate-100 rounded-xl" />
            {/* Tab bar skeleton */}
            <div className="h-12 w-full bg-slate-100 rounded-2xl" />
            {/* Summary cards skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-200 rounded-[2rem]" />)}
            </div>
            {/* Main content skeleton */}
            <div className="flex flex-col gap-6">
              <div className="h-96 bg-slate-100 rounded-3xl" />
              <div className="grid md:grid-cols-2 gap-6">
                <div className="h-72 bg-slate-100 rounded-3xl" />
                <div className="h-72 bg-slate-100 rounded-3xl" />
              </div>
            </div>
          </div>
        )}
        {!isInitialLoading && (
          <div className="flex flex-col gap-4 text-slate-700 font-pmedium">

            {/* 1. HEADER */}
            <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
              <div>
                <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                  Meeting Rooms Booking
                </h2>
                <p className="text-xs font-pmedium text-slate-500 mt-1">
                  Reserve campus workspaces and monitor department availability.
                </p>
              </div>
              {/* <div className="flex items-center gap-2">
                {mainBookingTab === 'my_bookings' && (
                  <button
                    onClick={() => {
                      setNewBooking((prev) => ({ ...prev, floor: '', wing: '', roomType: '', roomName: '' }));
                      setShowBookingDialog(true);
                    }}
                    className="w-full md:w-auto bg-[#2563EB] text-white px-4 py-2 rounded-2xl font-pmedium text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:bg-primary/95 active:scale-95"
                  >
                    <Plus size={14} strokeWidth={3} /> BOOK A ROOM
                  </button>
                )}
                {mainBookingTab === 'internal_booking' && (
                  <button
                    onClick={() => setShowInternalBookingDialog(true)}
                    className="w-full md:w-auto bg-[#2563EB] text-white px-4 py-2 rounded-2xl font-pmedium text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:bg-primary/95 active:scale-95"
                  >
                    <UserPlus size={14} strokeWidth={3} /> BOOK FOR MEMBER
                  </button>
                )}
                {mainBookingTab === 'external_booking' && (
                  <button
                    onClick={() => setShowNewExternalBookingDialog(true)}
                    className="w-full md:w-auto bg-[#2563EB] text-white px-4 py-2 rounded-2xl font-pmedium text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:bg-primary/95 active:scale-95"
                  >
                    <Globe size={14} strokeWidth={3} /> WALK-IN BOOKING
                  </button>
                )}
                {mainBookingTab === 'tenant_bookings' && (
                  <button
                    onClick={() => setShowTenantBookingDialog(true)}
                    className="w-full md:w-auto bg-[#2563EB] text-white px-4 py-2 rounded-2xl font-pmedium text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:bg-indigo-700 active:scale-95"
                  >
                    <Building2 size={14} strokeWidth={3} /> TENANT BOOKING
                  </button>
                )}
              </div> */}
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-pmedium text-red-600">
                {errorMessage}
              </div>
            ) : null}

            {!hasBookableMeetingResources && (
              <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-700 shadow-sm">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <p className="text-[12px] font-pmedium text-amber-950">Add a meeting or conference room before accepting bookings.</p>
                    <p className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-amber-700">Sales Department → Resource & Pricing</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={goToResourcePricing}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-[10px] font-pmedium uppercase tracking-wider text-amber-800 shadow-sm ring-1 ring-amber-200 transition-all hover:bg-amber-100"
                >
                  <Tag size={13} /> Add Resources <ArrowRight size={13} />
                </button>
              </div>
            )}

            {/* 2. MAIN TABS */}
            <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
              {[
                { key: 'my_bookings', label: 'My Bookings' },
                { key: 'internal_booking', label: 'Internal Booking' },
                { key: 'external_booking', label: 'External Booking' },
                { key: 'tenant_bookings', label: 'Tenant Bookings' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setMainBookingTab(tab.key as any);
                    if (tab.key === 'my_bookings') setActiveTab('my_bookings');
                    else setActiveTab('bookings');
                    setStatusFilter('all');
                  }}
                  className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${mainBookingTab === tab.key ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 3. SUMMARY CARDS (4-card grid, changes per tab) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
              {meetingSummaryCards.map((card) => {
                const Icon = card.icon;
                const labelToneClass = card.cardClass.includes('border-l')
                  ? (card.iconClass.split(' ').find((cls) => cls.startsWith('text-')) || 'text-slate-400')
                  : 'text-slate-400';
                return (
                  <div key={card.key} className={card.cardClass}>
                    <div className="min-w-0">
                      <p className={`text-[10px] font-pmedium ${labelToneClass} uppercase tracking-widest mb-1`}>{card.label}</p>
                      <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
                    </div>
                    <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}><Icon size={16}/></div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-6 lg:gap-8">

              {/* 3. MAIN DATA TABLE */}
              <div className="flex flex-col bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden min-h-[500px]">

                {/* Status, Search & Action */}
                <div className="order-2 px-3 sm:px-4 lg:px-5 py-3 border-b border-slate-100/60 bg-slate-50/50 flex flex-col xl:flex-row xl:items-center gap-3">
                  <div className="flex flex-1 items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {(activeTab !== 'invites'
                    ? activeTab === 'assigned_dept_bookings'
                      ? [
                        { key: 'all', label: 'All' },
                        { key: 'booked', label: 'Booked' },
                        { key: 'in progress', label: 'In Progress' },
                        { key: 'completed', label: 'Completed' },
                        { key: 'cancelled', label: 'Cancelled' },
                        { key: 'rescheduled', label: 'Rescheduled' },
                        { key: 'rejected', label: 'Rejected' },
                      ]
                      : [
                        { key: 'all', label: 'All' },
                        { key: 'booked', label: 'Booked' },
                        { key: 'in progress', label: 'In Progress' },
                        { key: 'completed', label: 'Completed' },
                        { key: 'cancelled', label: 'Cancelled' },
                        { key: 'rescheduled', label: 'Rescheduled' },
                      ]
                    : isEmployeeProfile
                      ? [
                        { key: 'all', label: 'All' },
                        { key: 'pending', label: 'Pending' },
                        { key: 'rejected', label: 'Rejected' },
                      ]
                      : [
                        { key: 'all', label: 'All' },
                        { key: 'pending', label: 'Pending' },
                        { key: 'accepted', label: 'Accepted' },
                        { key: 'rejected', label: 'Rejected' },
                      ]
                  ).map((pill) => (
                    <button
                      key={pill.key}
                      onClick={() => setStatusFilter(pill.key)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all ${statusFilter === pill.key
                        ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                        : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                        }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                  </div>

                  <div className="relative w-full xl:w-64 shrink-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={mainBookingTab === 'external_booking' ? externalSearchQuery : searchQuery}
                      placeholder={mainBookingTab === 'external_booking' ? 'Search clients, rooms, or booking codes...' : 'Search rooms or hosts...'}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200/60 rounded-xl text-[13px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400 shadow-sm"
                      onChange={(e) => mainBookingTab === 'external_booking' ? setExternalSearchQuery(e.target.value) : setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center shrink-0">
                    {mainBookingTab === 'my_bookings' && (
                      <button onClick={() => openBookingDialog('room')} className="rounded-2xl font-pmedium text-[10px] uppercase tracking-wider w-full md:w-auto bg-[#2563EB] text-white px-4 py-2 flex items-center justify-center gap-1.5 shadow-sm transition-all hover:bg-primary/95 active:scale-95">
                        <Plus size={14} strokeWidth={3} /> BOOK A ROOM
                      </button>
                    )}
                    {mainBookingTab === 'internal_booking' && (
                      <button onClick={() => openBookingDialog('internal')} className="rounded-2xl font-pmedium text-[10px] uppercase tracking-wider w-full md:w-auto bg-[#2563EB] text-white px-4 py-2 flex items-center justify-center gap-1.5 shadow-sm transition-all hover:bg-primary/95 active:scale-95">
                        <UserPlus size={14} strokeWidth={3} /> BOOK FOR MEMBER
                      </button>
                    )}
                    {mainBookingTab === 'external_booking' && (
                      <button onClick={() => openBookingDialog('external')} className="rounded-2xl font-pmedium text-[10px] uppercase tracking-wider w-full md:w-auto bg-[#2563EB] text-white px-4 py-2 flex items-center justify-center gap-1.5 shadow-sm transition-all hover:bg-primary/95 active:scale-95">
                        <Globe size={14} strokeWidth={3} /> WALK-IN BOOKING
                      </button>
                    )}
                    {mainBookingTab === 'tenant_bookings' && (
                      <button onClick={() => openBookingDialog('tenant')} className="rounded-2xl font-pmedium text-[10px] uppercase tracking-wider w-full md:w-auto bg-[#2563EB] text-white px-4 py-2 flex items-center justify-center gap-1.5 shadow-sm transition-all hover:bg-primary/95 active:scale-95">
                        <Building2 size={14} strokeWidth={3} /> TENANT BOOKING
                      </button>
                    )}
                  </div>
                </div>

                {/* Scope Tabs */}
                <div className="order-1 p-1 border-b border-slate-100/60 flex bg-white shadow-sm overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {mainBookingTab === 'my_bookings' && (
                    <div className="flex w-full gap-1.5 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-1 shadow-sm [&::-webkit-scrollbar]:hidden">
                      {isEmployeeProfile ? (
                      <>
                        <button
                          onClick={() => { setActiveTab('my_bookings'); setStatusFilter('all'); }}
                          className={`flex-1 min-w-[130px] py-2 px-4 rounded-full text-[10px] font-pmedium uppercase tracking-widest transition-all relative z-10 flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'my_bookings' ? 'text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                          {activeTab === 'my_bookings' && <motion.div layoutId="roomTabs" className="absolute inset-0 bg-[#2563EB] rounded-full shadow-sm z-[-1]" />}
                          MY BOOKINGS
                        </button>
                        <button
                          onClick={() => { setActiveTab('invites'); setStatusFilter('all'); }}
                          className={`flex-1 min-w-[130px] py-2 px-4 rounded-full text-[10px] font-pmedium uppercase tracking-widest transition-all relative z-10 flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'invites' ? 'text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                          {activeTab === 'invites' && <motion.div layoutId="roomTabs" className="absolute inset-0 bg-[#2563EB] rounded-full shadow-sm z-[-1]" />}
                          INVITES
                          {actionablePendingInviteCount > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[9px] font-pmedium rounded-full shadow-sm shadow-red-200 animate-pulse">
                              {actionablePendingInviteCount}
                            </span>
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        {/* First tab: Company / Dept / Assigned - role-based */}
                        <button
                          onClick={() => {
                            const tab = isAdminProfile
                              ? 'assigned_dept_bookings'
                              : (isOwnerProfile || isSuperAdminProfile)
                                ? 'company_bookings'
                                : 'dept_bookings';
                            setActiveTab(tab);
                            setStatusFilter('all');
                          }}
                          className={`flex-1 min-w-[130px] py-2 px-4 rounded-full text-[10px] font-pmedium uppercase tracking-widest transition-all relative z-10 flex items-center justify-center gap-2 whitespace-nowrap ${(activeTab === 'assigned_dept_bookings' || activeTab === 'company_bookings' || activeTab === 'dept_bookings') ? 'text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                          {(activeTab === 'assigned_dept_bookings' || activeTab === 'company_bookings' || activeTab === 'dept_bookings') && <motion.div layoutId="roomTabs" className="absolute inset-0 bg-[#2563EB] rounded-full shadow-sm z-[-1]" />}
                          COMPANY
                        </button>
                        <button
                          onClick={() => { setActiveTab('my_bookings'); setStatusFilter('all'); }}
                          className={`flex-1 min-w-[130px] py-2 px-4 rounded-full text-[10px] font-pmedium uppercase tracking-widest transition-all relative z-10 flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'my_bookings' ? 'text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                          {activeTab === 'my_bookings' && <motion.div layoutId="roomTabs" className="absolute inset-0 bg-[#2563EB] rounded-full shadow-sm z-[-1]" />}
                          MY BOOKINGS
                        </button>
                        <button
                          onClick={() => { setActiveTab('invites'); setStatusFilter('all'); }}
                          className={`flex-1 min-w-[130px] py-2 px-4 rounded-full text-[10px] font-pmedium uppercase tracking-widest transition-all relative z-10 flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'invites' ? 'text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                          {activeTab === 'invites' && <motion.div layoutId="roomTabs" className="absolute inset-0 bg-[#2563EB] rounded-full shadow-sm z-[-1]" />}
                          INVITES
                          {actionablePendingInviteCount > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[9px] font-pmedium rounded-full shadow-sm shadow-red-200 animate-pulse">
                              {actionablePendingInviteCount}
                            </span>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                  )}
                  {mainBookingTab !== 'my_bookings' && (
                    <div className="flex w-full gap-1.5 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-1 shadow-sm [&::-webkit-scrollbar]:hidden">
                      <button
                        onClick={() => { setActiveTab('bookings'); setStatusFilter('all'); }}
                        className={`flex-1 min-w-[150px] py-2 px-4 rounded-full text-[10px] font-pmedium uppercase tracking-widest transition-all relative z-10 flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'bookings' ? 'text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                      >
                        {activeTab === 'bookings' && <motion.div layoutId="roomTabs" className="absolute inset-0 bg-[#2563EB] rounded-full shadow-sm z-[-1]" />}
                        BOOKINGS
                      </button>
                      <button
                        onClick={() => { setActiveTab('booking_history'); setStatusFilter('all'); }}
                        className={`flex-1 min-w-[150px] py-2 px-4 rounded-full text-[10px] font-pmedium uppercase tracking-widest transition-all relative z-10 flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'booking_history' ? 'text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                      >
                        {activeTab === 'booking_history' && <motion.div layoutId="roomTabs" className="absolute inset-0 bg-[#2563EB] rounded-full shadow-sm z-[-1]" />}
                        BOOKING HISTORY
                      </button>
                    </div>
                  )}
                </div>

                {/* Desktop Table */}
                <div className="order-3">
                  {activeTab !== 'invites' ? (
                  <>
                    {/* ── External Bookings Table (Tasks 18/19/21) ── */}
                    {mainBookingTab === 'external_booking' ? (
                      <>
                        {/* Desktop external table */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                              <tr>
                                <th className="px-5 py-4">Client Name</th>
                                <th className="px-5 py-4">Resource</th>
                                <th className="px-5 py-4">Date &amp; Slot</th>
                                <th className="px-5 py-4 text-center">Payment</th>
                                <th className="px-5 py-4 text-center">Status</th>
                                <th className="px-5 py-4 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/60">
                              {externalDisplayedBookings.map((b) => {
                                const displayStatus = getBookingDisplayStatus(b);
                                const paymentStatus = (b as any).paymentStatus as string | undefined;
                                const canCancel = displayStatus !== 'cancelled' && displayStatus !== 'completed';
                                return (
                                  <tr key={b.recordId || b.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-5 py-4">
                                      <p className="font-pmedium text-[#0F172A] text-[13px]">{getExternalClientName(b) || '—'}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                      <div className="flex items-center gap-2">
                                        <Building size={14} className="text-primary shrink-0" />
                                        <p className="font-pmedium text-[#0F172A] text-[13px] whitespace-nowrap">{b.roomName}</p>
                                      </div>
                                    </td>
                                    <td className="px-5 py-4">
                                      {renderScheduleSummary(b)}
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                      <span className={`px-2.5 py-1 inline-flex items-center justify-center rounded-md text-[10px] font-pmedium uppercase tracking-wider border ${
                                        paymentStatus === 'Paid'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-amber-50 text-amber-700 border-amber-200'
                                      }`}>
                                        {getExternalPaymentLabel(b)}
                                      </span>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                      <span className={`${statusPillClass(displayStatus)} justify-center gap-1.5`}>
                                        {displayStatus}
                                      </span>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button onClick={() => setViewingBooking(b)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary rounded-lg transition-all" title="View Details"><Eye size={15} strokeWidth={2.5} /></button>
                                        {displayStatus === 'booked' && (
                                          <button onClick={() => { setRescheduleData({ ...b, startTime: b.startTime, endTime: b.endTime }); setRescheduleInviteeIds([]); setShowRescheduleDialog(true); }} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700 rounded-lg transition-all" title="Reschedule"><CalendarClock size={15} strokeWidth={2.5} /></button>
                                        )}
                                        {displayStatus === 'in progress' && (
                                          <button onClick={() => { setExtendBooking(b); setExtendForm({ extraMinutes: '30' }); setShowExtendDialog(true); }} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700 rounded-lg transition-all" title="Extend Booking"><Clock size={15} strokeWidth={2.5} /></button>
                                        )}
                                        {canCancel && (
                                          <button onClick={() => { setBookingToCancel(b); setShowCancelDialog(true); }} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 rounded-lg transition-all" title="Cancel Booking"><XCircle size={15} strokeWidth={2.5} /></button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                              {externalDisplayedBookings.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                      <Globe size={32} className="text-slate-300" />
                                      <p className="text-sm font-pmedium text-slate-400">No external bookings yet. Click &quot;Walk-in Booking&quot; to get started.</p>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile cards for external bookings */}
                        <div className="md:hidden flex flex-col p-4 gap-4 bg-slate-50/30">
                          {externalDisplayedBookings.map((b) => {
                            const displayStatus = getBookingDisplayStatus(b);
                            const paymentStatus = (b as any).paymentStatus as string | undefined;
                            const canCancel = displayStatus !== 'cancelled' && displayStatus !== 'completed';
                            return (
                              <div key={b.recordId || b.id} className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-pmedium text-[#0F172A] text-sm">{getExternalClientName(b) || '—'}</p>
                                    <p className="text-[11px] font-pmedium text-slate-500">{b.roomName}</p>
                                  </div>
                                  <span className={statusPillClass(displayStatus)}>
                                    {displayStatus}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs font-pmedium text-slate-600">
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-pmedium block mb-0.5">Date</span>
                                    {b.date}
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-pmedium block mb-0.5">Time</span>
                                    {formatTime12h(b.startTime)} – {formatTime12h(b.endTime)}
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-pmedium block mb-0.5">Payment</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-pmedium uppercase border ${paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                      {getExternalPaymentLabel(b)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                                  <button onClick={() => setViewingBooking(b)} className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl shadow-sm">Details</button>
                                  {displayStatus === 'booked' && (
                                    <button onClick={() => { setRescheduleData({ ...b, startTime: b.startTime, endTime: b.endTime }); setRescheduleInviteeIds([]); setShowRescheduleDialog(true); }} className="flex-1 py-2 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-xs rounded-xl shadow-sm">Reschedule</button>
                                  )}
                                  {displayStatus === 'in progress' && (
                                    <button onClick={() => { setExtendBooking(b); setExtendForm({ extraMinutes: '30' }); setShowExtendDialog(true); }} className="flex-1 py-2 bg-amber-50 border border-amber-200 text-amber-700 font-bold text-xs rounded-xl shadow-sm">Extend</button>
                                  )}
                                  {canCancel && (
                                    <button onClick={() => { setBookingToCancel(b); setShowCancelDialog(true); }} className="flex-1 py-2 bg-red-50 border border-red-200 text-red-600 font-bold text-xs rounded-xl shadow-sm">Cancel</button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {externalDisplayedBookings.length === 0 && (
                            <div className="py-12 text-center">
                              <Globe size={32} className="text-slate-300 mx-auto mb-3" />
                              <p className="text-sm font-pmedium text-slate-400">No external bookings yet. Click &quot;Walk-in Booking&quot; to get started.</p>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                    <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                          <tr>
                            <th className="px-5 py-4">Meeting Room</th>
                            <th className="px-5 py-4">Type</th>
                            <th className="px-5 py-4">Department</th>
                            <th className="px-5 py-4">Host</th>
                            <th className="px-5 py-4">Date</th>
                            <th className="px-5 py-4">Start &amp; End Time</th>
                            <th className="px-5 py-4 text-center">Status</th>
                            <th className="px-5 py-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60">
                          {displayedBookings.map((b) => {
                            const displayStatus = getBookingDisplayStatus(b);
                            const canManageBooking = mainBookingTab === 'tenant_bookings'
                              ? canManageOwnBooking(b)
                              : (isMyBooking(b) && !b.isInvitedMeeting && canManageOwnBooking(b));
                            const canRescheduleBooking = canManageBooking && canRescheduleOwnBooking(b);
                            const canExtendBooking = canManageBooking && canExtendOwnBooking(b);

                            return (
                              <tr key={b.recordId || b.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-2.5 min-w-[180px]">
                                    <Building size={16} className="text-primary" />
                                    <div className="min-w-0">
                                      <p className="font-pmedium text-[#0F172A] text-[13px] whitespace-nowrap">{b.roomName}</p>
                                      <p className="text-[11px] font-pmedium text-slate-400">{getBookingDisplayCount()} Booking{b.roomCapacity ? ` - ${b.roomCapacity} seats` : ''}</p>
                                      <span className={`mt-1 inline-flex px-2 py-0.5 rounded-full border text-[9px] font-pmedium uppercase tracking-wider ${getBookingTagBadge(b)}`}>
                                        {getBookingTagLabel(b)}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-[12px] text-slate-600">
                                  {b.roomType || roomCatalog.find((room) => room.name === b.roomName)?.type || getMeetingRoomTypeFromName(b.roomName)}
                                </td>
                                <td className="px-5 py-4 text-[12px] text-slate-600">
                                  {b.department || '—'}
                                </td>
                                <td className="px-5 py-4">
                                  <p className="text-[13px] font-pmedium text-[#0F172A]">
                                    {normalize(b.bookingType) === 'tenant'
                                      ? ((b as any).bookedByTenantCompanyName || b.department || 'Tenant Company')
                                      : ((b as any).bookedForName || b.bookedByName)}
                                    {getInviteMeetingLabel(b) ? ` (${getInviteMeetingLabel(b)})` : ''}
                                  </p>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-[12px] text-slate-600">
                                  {b.date || '—'}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-[12px] text-slate-600">
                                  {formatTimeSlot(b.startTime || b.checkIn, b.endTime || b.checkOut)}
                                </td>
                                <td className="px-5 py-4 text-center">
                                  <span className={`${statusPillClass(displayStatus)} justify-center gap-1.5`}>
                                    {displayStatus}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button onClick={() => setViewingBooking(b)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary rounded-lg transition-all" title="View Details"><Eye size={15} strokeWidth={2.5} /></button>
                                    {canRescheduleBooking && (
                                      <>
                                        <button onClick={() => { setRescheduleData({ ...b, startTime: b.startTime, endTime: b.endTime }); setRescheduleInviteeIds(b.inviteeUserIds || []); setShowRescheduleDialog(true); }} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700 rounded-lg transition-all" title="Reschedule"><CalendarClock size={15} strokeWidth={2.5} /></button>
                                        <button onClick={() => { setBookingToCancel(b); setShowCancelDialog(true); }} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 rounded-lg transition-all" title="Cancel Booking"><XCircle size={15} strokeWidth={2.5} /></button>
                                      </>
                                    )}
                                    {canExtendBooking && (
                                      <button onClick={() => { setExtendBooking(b); setExtendForm({ extraMinutes: '30' }); setShowExtendDialog(true); }} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700 rounded-lg transition-all" title="Extend Booking"><Clock size={15} strokeWidth={2.5} /></button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {displayedBookings.length === 0 && (
                            <tr><td colSpan={8} className="px-6 py-16 text-center text-sm font-pmedium text-slate-400 bg-slate-50/30">No bookings found matching your criteria.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden flex flex-col p-4 gap-4 bg-slate-50/30">
                      {displayedBookings.map((b) => {
                        const displayStatus = getBookingDisplayStatus(b);
                        const canManageBooking = mainBookingTab === 'tenant_bookings'
                          ? canManageOwnBooking(b)
                          : (isMyBooking(b) && !b.isInvitedMeeting && canManageOwnBooking(b));
                        const canRescheduleBooking = canManageBooking && canRescheduleOwnBooking(b);
                        const canExtendBooking = canManageBooking && canExtendOwnBooking(b);

                        return (
                          <div key={b.recordId || b.id} className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2 min-w-[180px]">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Building size={14} strokeWidth={2.5} /></div>
                                <div className="min-w-0">
                                  <p className="font-pmedium text-[#0F172A] text-sm leading-tight whitespace-nowrap">{b.roomName}</p>
                                  <p className="text-[11px] font-pmedium text-slate-500">
                                    {(b as any).bookedForName || b.bookedByName}
                                    {getInviteMeetingLabel(b) ? ` (${getInviteMeetingLabel(b)})` : ''}
                                  </p>
                                </div>
                              </div>
                              <span className={statusPillClass(displayStatus)}>
                                {displayStatus}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs font-pmedium text-slate-600">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-pmedium block mb-0.5">Date</span>
                                {b.date}
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-pmedium block mb-0.5">Time</span>
                                {b.checkIn} - {b.checkOut}
                              </div>
                              {(Number(b.totalAmount || 0) > 0 || Number(b.extensionAmount || 0) > 0) && (
                                <div className="col-span-2">
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-pmedium block mb-0.5">Amount</span>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-pmedium text-[#0F172A]">{formatCurrency(b.totalAmount || 0)}</span>
                                    {Number(b.extensionAmount || 0) > 0 && (
                                      <span className="text-[10px] font-pmedium text-slate-500">Extension: {formatCurrency(b.extensionAmount)}</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                              <button onClick={() => setViewingBooking(b)} className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl shadow-sm">Details</button>
                              {canRescheduleBooking && (
                                <>
                                  <button onClick={() => { setRescheduleData({ ...b, startTime: b.startTime, endTime: b.endTime }); setRescheduleInviteeIds(b.inviteeUserIds || []); setShowRescheduleDialog(true); }} className="flex-1 py-2 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-xs rounded-xl shadow-sm">Reschedule</button>
                                  <button onClick={() => { setBookingToCancel(b); setShowCancelDialog(true); }} className="flex-1 py-2 bg-red-50 border border-red-200 text-red-600 font-bold text-xs rounded-xl shadow-sm">Cancel</button>
                                </>
                              )}
                              {canExtendBooking && (
                                <button onClick={() => { setExtendBooking(b); setExtendForm({ extraMinutes: '30' }); setShowExtendDialog(true); }} className="flex-1 py-2 bg-amber-50 border border-amber-200 text-amber-700 font-bold text-xs rounded-xl shadow-sm">Extend</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {displayedBookings.length === 0 && (
                        <div className="py-12 text-center text-sm font-pmedium text-slate-400">No bookings found.</div>
                      )}
                    </div>
                    </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                          <tr>
                            <th className="px-5 py-4">Meeting Room</th>
                            <th className="px-5 py-4">Invited By</th>
                            <th className="px-5 py-4">Schedule</th>
                            <th className="px-5 py-4 text-center">Status</th>
                            <th className="px-5 py-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60">
                          {displayedInvites.map((invite) => (
                            (() => {
                              const inviteLinkedBooking = allBookings.find((booking) => String(booking.recordId) === String(invite.bookingId)) || null;
                              const canRespond = isInviteResponseOpen(inviteLinkedBooking) && invite.status === 'pending';
                              const inviteName = resolveInviteDisplayName(invite);

                              return (
                                <tr key={`${invite.bookingId}-${invite.invitedUserId}`} className="hover:bg-slate-50/50 transition-colors group">
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-2.5 min-w-[180px]">
                                      <Building size={16} className="text-primary" />
                                      <div className="min-w-0">
                                        <p className="font-pmedium text-[#0F172A] text-[13px] whitespace-nowrap">{invite.roomName}</p>
                                        <p className="text-[11px] font-pmedium text-slate-400">{invite.department}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <p className="text-[13px] font-pmedium text-[#0F172A]">{invite.bookedByName}</p>
                                    <p className="text-[11px] font-pmedium text-slate-400">{inviteName}</p>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className="text-[12px] font-pmedium text-slate-600 flex flex-col gap-0.5">
                                      <span className="font-pmedium text-[#0F172A]">{invite.date}</span>
                                      <span className="whitespace-nowrap">{formatTimeSlot(invite.startTime, invite.endTime)}</span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    <span className={`${statusPillClass(statusLabel(invite.status))} justify-center gap-1.5`}>
                                      {statusLabel(invite.status)}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className="flex justify-center gap-1.5 transition-opacity">
                                      <button onClick={() => setViewingBooking(allBookings.find((booking) => String(booking.recordId) === String(invite.bookingId)) || null)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary rounded-lg transition-all" title="View Details"><Eye size={15} strokeWidth={2.5} /></button>
                                      {invite.status === 'pending' && canRespond && (
                                        <>
                                          <button onClick={() => handleInviteResponse(invite, 'accepted')} className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-all" title="Accept"><CheckCircle2 size={15} strokeWidth={2.5} /></button>
                                          <button onClick={() => handleInviteResponse(invite, 'rejected')} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all" title="Reject"><XCircle size={15} strokeWidth={2.5} /></button>
                                        </>
                                      )}
                                      {invite.status === 'pending' && !canRespond && (
                                        <span className="px-2 py-1 rounded-md text-[9px] font-pmedium uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">Expired</span>
                                      )}
                                      {invite.status === 'rejected' && invite.responseReason && (
                                        <button onClick={() => setViewingBooking(allBookings.find((booking) => String(booking.recordId) === String(invite.bookingId)) || null)} className="p-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-all" title="View Reject Reason">Reason</button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })()
                          ))}
                          {displayedInvites.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-16 text-center text-sm font-pmedium text-slate-400 bg-slate-50/30">No meeting invites found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="md:hidden flex flex-col p-4 gap-4 bg-slate-50/30">
                      {displayedInvites.map((invite) => (
                        (() => {
                          const inviteLinkedBooking = allBookings.find((booking) => String(booking.recordId) === String(invite.bookingId)) || null;
                          const canRespond = isInviteResponseOpen(inviteLinkedBooking) && invite.status === 'pending';

                          return (
                            <div key={`${invite.bookingId}-${invite.invitedUserId}`} className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                              <div className="flex justify-between items-start gap-3">
                                <div className="min-w-0">
                                  <p className="font-pmedium text-[#0F172A] text-sm leading-tight whitespace-nowrap">{invite.roomName}</p>
                                  <p className="text-[11px] font-pmedium text-slate-500">{invite.bookedByName}</p>
                                </div>
                                <span className={statusPillClass(statusLabel(invite.status))}>
                                  {statusLabel(invite.status)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs font-pmedium text-slate-600">
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-pmedium block mb-0.5">Date</span>
                                  {invite.date}
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-pmedium block mb-0.5">Time</span>
                                  <span className="whitespace-nowrap">{formatTimeSlot(invite.startTime, invite.endTime)}</span>
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                                <button onClick={() => setViewingBooking(allBookings.find((booking) => String(booking.recordId) === String(invite.bookingId)) || null)} className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl shadow-sm">Details</button>
                                {invite.status === 'pending' && canRespond && (
                                  <>
                                    <button onClick={() => handleInviteResponse(invite, 'accepted')} className="flex-1 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl shadow-sm">Accept</button>
                                    <button onClick={() => handleInviteResponse(invite, 'rejected')} className="flex-1 py-2 bg-red-50 border border-red-200 text-red-600 font-bold text-xs rounded-xl shadow-sm">Reject</button>
                                  </>
                                )}
                                {invite.status === 'pending' && !canRespond && (
                                  <div className="flex-1 py-2 text-center bg-slate-50 border border-slate-200 text-slate-500 font-bold text-xs rounded-xl shadow-sm">Expired</div>
                                )}
                                {invite.status === 'rejected' && invite.responseReason && (
                                  <button onClick={() => setViewingBooking(allBookings.find((booking) => String(booking.recordId) === String(invite.bookingId)) || null)} className="flex-1 py-2 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-xs rounded-xl shadow-sm">Reason</button>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      ))}
                      {displayedInvites.length === 0 && (
                        <div className="py-12 text-center text-sm font-pmedium text-slate-400">No meeting invites found.</div>
                      )}
                    </div>
                  </>
                  )}
                </div>
              </div>

              {/* 4. AVAILABILITY AND UPCOMING (BELOW TABLE) */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">

                {/* Calendar Widget */}
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-4 flex-grow-0">
                  <div className="mb-4">
                    <h3 className="font-pmedium text-[14px] text-[#0F172A] mb-3">Room Availability</h3>
                    <div className="relative">
                      <select
                        className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl font-pmedium text-[12px] text-primary focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none appearance-none cursor-pointer transition-all shadow-sm"
                        value={calendarRoomFilter}
                        onChange={(e) => setCalendarRoomFilter(e.target.value)}
                      >
                        {availableRooms.map((roomName) => (
                          <option key={roomName} value={roomName} disabled={isRoomOptionDisabled(roomName)}>
                            {getRoomOptionLabel(roomName)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                  </div>

                  <div className="mx-auto flex max-w-sm justify-between items-center mb-4">
                    <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ChevronLeft size={16} /></button>
                    <span className="font-pmedium text-[12px] text-[#0F172A] tracking-wide">{monthNames[currentMonth]} {currentYear}</span>
                    <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ChevronRight size={16} /></button>
                  </div>

                  <div className="mx-auto grid max-w-sm grid-cols-7 gap-1 mb-1.5 text-center text-[9px] font-pmedium text-slate-400 tracking-widest">
                    {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d, idx) => <div key={`day-${idx}`}>{d}</div>)}
                  </div>

                  <div className="mx-auto grid max-w-sm grid-cols-7 gap-1">
                    {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} className="aspect-square rounded-lg border border-dashed border-slate-200 bg-slate-50" />)}
                    {[...Array(daysInMonth)].map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const dayBookings = allBookings.filter((booking) => booking.roomName === calendarRoomFilter && booking.date === dateStr && booking.status !== 'cancelled' && isPersonalCalendarBooking(booking));
                      const isSelected = selectedCalendarDateKey === dateStr;
                      const dayStyle = dayBookings.length === 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : dayBookings.length < 3
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-red-50 text-red-700 border-red-200';
                      return (
                        <button
                          key={dateStr}
                          type="button"
                          title={`Bookings: ${dayBookings.length}`}
                          onClick={() => setSelectedCalendarDateKey(dateStr)}
                          className={`relative flex aspect-square items-center justify-center rounded-lg border p-0 text-center transition-all hover:-translate-y-0.5 hover:shadow-sm ${dayStyle} ${isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-white' : ''}`}
                        >
                          <span className="font-pmedium text-[11px] leading-none">{day}</span>
                          {dayBookings.length > 0 && (
                            <span className="absolute bottom-1 right-1 text-[7px] font-pmedium leading-none opacity-70">{dayBookings.length}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Selected day</p>
                        <p className="mt-1 text-sm font-pmedium text-slate-950">{selectedCalendarDateLabel}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Bookings</p>
                        <p className="mt-1 text-lg font-pmedium text-primary">{selectedCalendarBookings.length}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3 max-h-56 overflow-y-auto pr-1">
                      {selectedCalendarBookings.length > 0 ? (
                        (
                          selectedCalendarBookings.map((booking) => (
                            <div key={`${booking.recordId || booking.id}-${booking.startTime}-${booking.endTime}`} className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-pmedium text-slate-950 break-words leading-snug">
                                    {normalize(booking.bookingType) === 'tenant'
                                      ? ((booking as any).bookedByTenantCompanyName || booking.department || 'Tenant Company')
                                      : (booking.bookedByName || booking.roomName)}
                                  </p>
                                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mt-0.5 whitespace-nowrap">{booking.roomName}</p>
                                </div>
                                <span className={`${statusPillClass(statusLabel(booking.status))} shrink-0`}>{statusLabel(booking.status)}</span>
                              </div>
                              <div className="mt-2">{renderScheduleSummary(booking, { showDate: false })}</div>
                              <p className="mt-1 text-[10px] font-pmedium text-slate-500">{booking.purpose || booking.notes || ''}</p>
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-pmedium text-slate-600">
                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                                  <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Date</p>
                                  <p className="mt-1 leading-snug break-words">{booking.date || selectedCalendarDateKey}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                                  <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Room</p>
                                  <p className="mt-1 leading-snug whitespace-nowrap">{booking.roomName || "Meeting Room"}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                                  <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Type</p>
                                  <p className="mt-1 leading-snug break-words">{booking.bookingType || "Booking"}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                                  <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Status</p>
                                  <p className="mt-1 leading-snug break-words">{statusLabel(booking.status)}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center">
                          <p className="text-[12px] font-pmedium text-slate-500">No bookings for this date.</p>
                          <p className="mt-1 text-[10px] font-pmedium text-slate-400">Pick another day or room to inspect the calendar.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contextual Upcoming Widget */}
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-5 flex-grow">
                  <h3 className="font-pmedium text-[14px] text-[#0F172A] mb-1">Upcoming</h3>
                  <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-5">
                    {activeTab === 'my_bookings'
                      ? 'Your Schedule'
                      : isEmployeeProfile && activeTab === 'invites'
                        ? 'Your Invitations'
                        : activeTab === 'assigned_dept_bookings'
                          ? 'Assigned Dept Schedule'
                          : activeTab === 'company_bookings'
                            ? 'Company Schedule'
                            : isDepartmentManagerProfile
                              ? 'Department Schedule'
                              : 'Company Schedule'}
                  </p>

                  <div className="space-y-3 sm:space-y-4">
                    {upcomingReservations.length > 0 ? upcomingReservations.map(b => (
                      <div key={b.recordId || b.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-stretch gap-3.5 hover:shadow-md transition-all group">
                        {/* Timeline Marker */}
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full ring-4 ring-white shadow-sm ${b.date === todayStr ? 'bg-amber-500' : 'bg-primary'}`}></div>
                          <div className={`w-[2px] flex-grow mt-1 rounded-full ${b.date === todayStr ? 'bg-amber-100' : 'bg-slate-200'}`}></div>
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex justify-between items-start mb-0.5">
                            {renderScheduleSummary(b, { showDate: false })}
                            {b.date === todayStr && <span className="text-[9px] font-pmedium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md uppercase tracking-wider border border-amber-200">Today</span>}
                          </div>
                          <p className="text-[11px] font-pmedium text-slate-500 mt-1 whitespace-nowrap">{b.roomName}</p>
                          <p className="text-[10px] font-pmedium text-slate-400 mt-1">{b.date}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-3">
                          <CalIcon size={20} className="text-slate-300" />
                        </div>
                        <p className="text-[11px] font-pmedium text-slate-400 uppercase tracking-widest">No scheduled meetings</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </PageFrame>

      {/* --- ALL MODALS --- */}

      {/* 1. BOOK NEW ROOM MODAL */}
      <AnimatePresence>
        {showBookingDialog && (
          <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBookingDialog(false)} className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-[32px] md:rounded-[32px] w-full md:max-w-4xl max-h-[92vh] md:max-h-[88vh] shadow-2xl relative z-[90] flex flex-col overflow-hidden"
            >
              <div className="w-full flex justify-center py-3 md:hidden">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
              </div>

              <div className="px-6 py-4 md:p-8 flex justify-between items-start gap-4 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
                <div>
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">New Booking</p>
                  <h2 className="mt-1 text-xl md:text-2xl font-pmedium text-primary tracking-tight">Book Meeting Room</h2>
                  <p className="text-[11px] font-pmedium text-slate-400 uppercase tracking-widest mt-1">Host: {managerProfile.name}</p>
                </div>
                <button type="button" onClick={() => setShowBookingDialog(false)} className="w-10 h-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors shadow-sm border border-slate-200">
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              {!hasBookableMeetingResources ? (
                <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/50 px-5 py-10 text-center sm:px-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-[#2563EB] shadow-sm">
                    <Building2 size={24} />
                  </div>
                  <p className="mt-5 text-base font-pmedium text-slate-950">No meeting resources are available yet</p>
                  <p className="mt-2 max-w-md text-[12px] font-pmedium leading-relaxed text-slate-500">
                    Add an active Meeting Room or Conference Room before creating a booking. You can manage these resources under Sales Department → Resource & Pricing.
                  </p>
                  <button
                    type="button"
                    onClick={goToResourcePricing}
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 py-3 text-[10px] font-pmedium uppercase tracking-wider text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
                  >
                    <Tag size={14} /> Add Meeting Resources <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBookingDialog(false)}
                    className="mt-3 text-[10px] font-pmedium uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-700"
                  >
                    Close
                  </button>
                </div>
              ) : (
              <>
              <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-5 md:py-8 space-y-5 overflow-y-auto flex-1 bg-slate-50/30">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><CalIcon size={16} /></span>
                      <span className="text-[12px] font-pmedium uppercase tracking-[0.16em] text-slate-900">Room Selection</span>
                    </div>
                    <span className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Meeting / Conference</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Meeting Type</label>
                      <div className="relative">
                        <select
                          className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm"
                          value={newBooking.roomType}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSelectedBookingRoomType(v);
                            setNewBooking((prev) => ({ ...prev, roomType: v, floor: '', wing: '', location: '', roomName: '' }));
                            setSelectedBookingFloor('');
                            setSelectedBookingWing('');
                          }}
                        >
                          <option value="" disabled>Select type</option>
                          {availableRoomTypes.filter(type => {
                            const t = normalize(type);
                            return t.includes('meeting') || t.includes('conference');
                          }).map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Floor</label>
                      <div className="relative">
                        <select
                          className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm"
                          value={newBooking.floor}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSelectedBookingFloor(v);
                            setNewBooking((prev) => ({ ...prev, floor: v, wing: '', location: '', roomName: '' }));
                            setSelectedBookingWing('');
                          }}
                        >
                          <option value="" disabled>Select floor</option>
                          {availableFloors.map((floor) => (
                            <option key={floor} value={floor}>{floor}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Wing <span className="text-slate-300 normal-case font-pmedium">(optional)</span></label>
                      <div className="relative">
                        <select
                          className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm"
                          value={newBooking.wing}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSelectedBookingWing(v);
                            setNewBooking((prev) => ({ ...prev, wing: v, location: '', roomName: '' }));
                          }}
                        >
                          <option value="">{floorHasWingValues ? 'Any wing' : 'No wing'}</option>
                          {availableWings.map((wing) => (
                            <option key={wing} value={wing}>{wing}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Room</label>
                      <div className="relative">
                        <select
                          className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm"
                          value={newBooking.roomName}
                          onChange={(e) => {
                            const roomName = e.target.value;
                            const sel = roomCatalog.find((room) => room.name === roomName);
                            setNewBooking((prev) => ({
                              ...prev,
                              roomName,
                              floor: sel?.floor || prev.floor,
                              wing: sel?.wing || prev.wing,
                              location: sel?.location || prev.location,
                              roomType: sel?.type || prev.roomType,
                            }));
                          }}
                        >
                          <option value="">Choose room</option>
                          {bookingRoomsAtSelectedLocation.length > 0 ? (
                            bookingRoomsAtSelectedLocation.map((room) => (
                              <option key={room.name} value={room.name} disabled={!isActiveRoom(room)}>
                                {getRoomOptionLabel(room.name)}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>
                              {canShowRoomTypeCount
                                ? `No ${selectedBookingRoomType.toLowerCase()} on this floor`
                                : 'Select type and floor first'}
                            </option>
                          )}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                  </div>
                  {selectedRoomCapacity ? (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-2.5 text-[12px] font-pmedium text-blue-800 flex items-center justify-between">
                      <span>Capacity: <strong>{selectedRoomCapacity}</strong> seats</span>
                      <span>Invite slots left: <strong>{Math.max(Number(selectedRoomCapacity) - 1 - Number(newBooking.inviteeUserIds.length || 0), 0)}</strong></span>
                    </div>
                  ) : canShowRoomTypeCount ? (
                    <p className={`text-[12px] font-pmedium ${selectedFloorRoomTypeCount > 0 ? 'text-blue-700' : 'text-rose-600'}`}>
                      {selectedFloorRoomTypeCount > 0
                        ? `${selectedFloorRoomTypeCount} room${selectedFloorRoomTypeCount === 1 ? '' : 's'} available${selectedBookingWing ? ` in wing ${selectedBookingWing}` : ''}`
                        : `No rooms available for this floor${selectedBookingWing ? ` in wing ${selectedBookingWing}` : ''}`}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0"><Clock size={16} /></span>
                      <span className="text-[12px] font-pmedium uppercase tracking-[0.16em] text-slate-900">Timing & Slot</span>
                    </div>
                    <span className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{selectedRoomCapacity || '—'} seats</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Date</label>
                      <input
                        type="date"
                        min={todayStr}
                        value={newBooking.date}
                        className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl font-pmedium text-[13px] text-[#0F172A] outline-none focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm transition-all"
                        onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Start Time</label>
                      <div className="relative">
                        <select
                          value={newBooking.startTime || ''}
                          className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl font-pmedium text-[13px] text-[#0F172A] outline-none focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm transition-all appearance-none cursor-pointer"
                          onChange={(e) => {
                            const nextStartTime = e.target.value;
                            const minimumEndTime = minutesToTimeString((timeToMinutes(nextStartTime) || 0) + BOOKING_MIN_DURATION_MINUTES);
                            const currentEndMinutes = timeToMinutes(newBooking.endTime);
                            const minimumEndMinutes = timeToMinutes(minimumEndTime);
                            setNewBooking({
                              ...newBooking,
                              startTime: nextStartTime,
                              endTime: !newBooking.endTime || currentEndMinutes === null || (minimumEndMinutes !== null && currentEndMinutes < minimumEndMinutes) ? minimumEndTime : newBooking.endTime,
                            });
                          }}
                        >
                          <option value="">Start</option>
                          {createStartTimeOptions.map((timeValue) => (
                            <option key={timeValue} value={timeValue}>{formatTimeOptionLabel(timeValue)}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">End Time</label>
                      <div className="relative">
                        <select
                          value={newBooking.endTime || ''}
                          className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl font-pmedium text-[13px] text-[#0F172A] outline-none focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm transition-all appearance-none cursor-pointer"
                          onChange={(e) => setNewBooking({ ...newBooking, endTime: e.target.value })}
                        >
                          <option value="">End</option>
                          {createEndTimeOptions.map((timeValue) => (
                            <option key={timeValue} value={timeValue}>{formatTimeOptionLabel(timeValue)}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0"><CheckCircle2 size={16} /></span>
                      <span className="text-[12px] font-pmedium uppercase tracking-[0.16em] text-slate-900">Availability</span>
                    </div>
                    <span className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Live slot check</span>
                  </div>
                  {!bookingTimeValidation.valid && (
                    <div className="p-4 bg-red-50 rounded-2xl flex items-start gap-3 border border-red-100">
                      <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                      <p className="text-[13px] text-red-800 font-pmedium">{bookingTimeValidation.reason}</p>
                    </div>
                  )}
                  {bookingTimeValidation.valid && roomDayStatus === 'available' && !newBooking.startTime && (
                    <div className="p-3.5 bg-emerald-50 rounded-2xl flex items-center gap-3 border border-emerald-100">
                      <CheckCircle2 className="text-emerald-500 shrink-0" size={16} />
                      <p className="text-[12px] text-emerald-800 font-pmedium">Room is fully free on this date. Pick a slot.</p>
                    </div>
                  )}
                  {bookingTimeValidation.valid && roomDayStatus === 'partial' && !newBooking.startTime && (
                    <div className="p-3.5 bg-amber-50 rounded-2xl flex items-center gap-3 border border-amber-100">
                      <AlertCircle className="text-amber-500 shrink-0" size={16} />
                      <p className="text-[12px] text-amber-800 font-pmedium">Some slots taken on this date. Choose an open time.</p>
                    </div>
                  )}
                  {bookingTimeValidation.valid && roomDayStatus === 'full' && !newBooking.startTime && (
                    <div className="p-3.5 bg-red-50 rounded-2xl flex items-center gap-3 border border-red-100">
                      <AlertCircle className="text-red-500 shrink-0" size={16} />
                      <p className="text-[12px] text-red-800 font-pmedium">Room fully booked on this date. Choose another date.</p>
                    </div>
                  )}
                  {bookingTimeValidation.valid && bookingStatus === 'available' && newBooking.startTime && newBooking.endTime && (
                    <div className="p-3.5 bg-emerald-50 rounded-2xl flex items-center gap-3 border border-emerald-100">
                      <CheckCircle2 className="text-emerald-500 shrink-0" size={16} />
                      <p className="text-[12px] text-emerald-800 font-pmedium">Slot is available.</p>
                    </div>
                  )}
                  {bookingTimeValidation.valid && bookingStatus === 'capacity' && (
                    <div className="p-3.5 bg-amber-50 rounded-2xl flex items-center gap-3 border border-amber-100">
                      <AlertCircle className="text-amber-500 shrink-0" size={16} />
                      <p className="text-[12px] text-amber-800 font-pmedium">Room capacity too small for this booking. Pick a bigger room.</p>
                    </div>
                  )}
                  {bookingTimeValidation.valid && bookingStatus === 'full' && (
                    <div className="p-3.5 bg-red-50 rounded-2xl flex items-center gap-3 border border-red-100">
                      <AlertCircle className="text-red-500 shrink-0" size={16} />
                      <p className="text-[12px] text-red-800 font-pmedium">Room fully booked on this date. Choose another date.</p>
                    </div>
                  )}
                  {bookingTimeValidation.valid && bookingStatus === 'conflict' && (
                    <div className="p-3.5 bg-red-50 rounded-2xl border border-red-100 space-y-2.5">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="text-red-500 shrink-0" size={16} />
                        <p className="text-[12px] text-red-800 font-pmedium">Time conflict — slot already booked.</p>
                      </div>
                      {bookingSuggestions.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-pmedium text-red-600 uppercase tracking-widest">Try these open slots:</p>
                          <div className="flex flex-wrap gap-2">
                            {bookingSuggestions.map((slot: any) => (
                              <button
                                key={`${slot.start}-${slot.end}`}
                                type="button"
                                onClick={() => setNewBooking((prev) => ({ ...prev, startTime: slot.start, endTime: slot.end }))}
                                className="px-3 py-1.5 rounded-full bg-white border border-red-200 text-[11px] font-pmedium text-red-700 hover:bg-red-100 transition-colors"
                              >
                                {formatTimeOptionLabel(slot.start)} – {formatTimeOptionLabel(slot.end)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {bookingTimeValidation.valid && newBooking.roomName && newBooking.date && newBooking.startTime && newBooking.endTime && bookingStatus === 'available' && bookingSuggestions.length > 0 && (
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Other available slots today:</p>
                      <div className="flex flex-wrap gap-2">
                        {bookingSuggestions.map((slot: any) => (
                          <button
                            key={`rec-${slot.start}-${slot.end}`}
                            type="button"
                            onClick={() => setNewBooking((prev) => ({ ...prev, startTime: slot.start, endTime: slot.end }))}
                            className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-pmedium text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                          >
                            {formatTimeOptionLabel(slot.start)} – {formatTimeOptionLabel(slot.end)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0"><Users size={16} /></span>
                      <span className="text-[12px] font-pmedium uppercase tracking-[0.16em] text-slate-900">Details & Guests</span>
                    </div>
                    <span className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Host + invitees</span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Purpose / Agenda</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Q3 Roadmap Review…"
                      className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all"
                      onChange={(e) => setNewBooking({ ...newBooking, purpose: e.target.value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Invite Members</label>
                      <div className="flex items-center gap-2">
                        {selectedRoomCapacity ? (
                          <span className={`text-[11px] font-pmedium ${newBooking.inviteeUserIds.length >= Number(selectedRoomCapacity) - 1 ? 'text-rose-500' : 'text-slate-500'}`}>
                            {newBooking.inviteeUserIds.length} / {Math.max(Number(selectedRoomCapacity) - 1, 0)} seats
                          </span>
                        ) : (
                          <span className="text-[11px] font-pmedium text-slate-500">{newBooking.inviteeUserIds.length} selected</span>
                        )}
                      </div>
                    </div>
                    {selectedRoomCapacity && Number(selectedRoomCapacity) <= 1 && (
                      <p className="text-[11px] font-pmedium text-amber-600">This room seats 1 — no additional members can be invited.</p>
                    )}
                    <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                      {inviteDepartments.map((group: any) => (
                        <div key={group.department} className="rounded-2xl border border-slate-200/60 bg-slate-50/70 p-4">
                          <p className="text-[11px] font-pmedium uppercase tracking-widest text-slate-500 mb-3">
                            {group.label}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {group.members.map((member: any) => {
                              const memberId = resolveMemberUserId(member);
                              const checked = newBooking.inviteeUserIds.includes(memberId);
                              const atCapacity = selectedRoomCapacity
                                ? newBooking.inviteeUserIds.length >= Number(selectedRoomCapacity) - 1
                                : false;
                              const disabled = !checked && atCapacity;
                              const memberRole = normalize(member.role || '');
                              const isManagement = memberRole === 'owner' || memberRole === 'founder' || memberRole === 'super_admin' || memberRole === 'super-admin' || memberRole === 'admin';
                              const sublabel = isManagement
                                ? formatInviteGroupLabel(member.role)
                                : ((member as any).departments?.[0] || (member as any).department || formatInviteGroupLabel(member.role || 'Member'));
                              return (
                                <label
                                  key={memberId}
                                  className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                                    disabled
                                      ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                                      : checked
                                      ? 'border-[#2563EB] bg-blue-50 cursor-pointer'
                                      : 'border-slate-200 bg-white hover:bg-slate-50 cursor-pointer'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={disabled}
                                    onChange={() => !disabled && setNewBooking((prev) => ({
                                      ...prev,
                                      inviteeUserIds: checked
                                        ? prev.inviteeUserIds.filter((id) => id !== memberId)
                                        : [...prev.inviteeUserIds, memberId],
                                    }))}
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-[13px] font-pmedium text-[#0F172A] truncate">{resolveMemberName(member) || member.email || 'Member'}</p>
                                    <p className="text-[11px] font-pmedium text-slate-500">{sublabel}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {inviteDepartments.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-[12px] font-pmedium text-slate-400">
                          No inviteable members found.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-white border-t border-slate-100 shrink-0 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowBookingDialog(false)}
                  className="flex-1 px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={bookingStatus !== 'available' || isSavingBooking || !newBooking.purpose.trim() || !newBooking.roomType || !newBooking.roomName || !newBooking.date || !newBooking.startTime || !newBooking.endTime}
                  onClick={handleCreateBooking}
                  className="flex-1 px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSavingBooking ? 'Saving...' : 'Confirm Booking'}
                </button>
              </div>
              </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. VIEW DETAILS MODAL */}
      <AnimatePresence>
        {viewingBooking && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-3">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingBooking(null)} className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-[2rem] max-w-xl w-full max-h-[90vh] shadow-2xl border border-white/70 relative z-[90] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                    <Building size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">Meeting Details</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={statusPillClass(viewingBooking.liveStatus || viewingBooking.status || '')}>
                        {viewingBooking.liveStatus || viewingBooking.status}
                      </span>
                      {isRescheduledBooking(viewingBooking) && (
                        <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-pmedium uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                          Rescheduled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setViewingBooking(null)} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto bg-white">
                {isAdministrationManagerProfile && normalize(viewingBooking.bookingType) === 'external' ? (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5 text-center">
                    <p className="text-[10px] font-pmedium text-amber-500 uppercase tracking-widest">External booking</p>
                    <p className="mt-2 text-lg font-pmedium text-slate-950">Details hidden for administration manager.</p>
                    <p className="mt-2 text-sm font-pmedium text-slate-500">This shared module keeps external booking details private in this view.</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                        <Building size={14} /> Booking Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Location</p>
                          <p className="text-[12px] font-pmedium text-slate-900">{viewingBooking.roomName}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Host / Dept</p>
                          <p className="text-[12px] font-pmedium text-slate-900">
                            {(viewingBooking as any).bookedForName || viewingBooking.bookedByName}
                          </p>
                          <span className={`mt-1 inline-flex px-2 py-0.5 rounded-md text-[9px] font-pmedium uppercase tracking-wider border ${getBookingTagBadge(viewingBooking)}`}>
                            {getBookingTagLabel(viewingBooking)}
                          </span>
                        </div>
                        {(viewingBooking as any).bookedForName && normalize(viewingBooking.bookingType) === 'internal' && (
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Booked By</p>
                            <p className="text-[12px] font-pmedium text-slate-900">{viewingBooking.bookedByName}</p>
                          </div>
                        )}
                        {viewingBooking.isInvitedMeeting && (
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Meeting Type</p>
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-pmedium uppercase tracking-wider border ${viewingBooking.currentInviteStatus === 'accepted'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : viewingBooking.currentInviteStatus === 'rejected'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                              {getInviteMeetingLabel(viewingBooking)}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Schedule</p>
                          <div className="text-[12px] font-pmedium text-slate-900">
                            {renderScheduleSummary(viewingBooking)}
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Attendees</p>
                          <p className="text-[12px] font-pmedium text-slate-900 flex items-center gap-1.5">
                            <Users size={12} className="text-slate-400" />
                            {(() => {
                              // Host (1) + accepted invitees
                              const acceptedCount = Array.isArray(viewingBooking.invites)
                                ? viewingBooking.invites.filter((inv: any) => inv.status === 'accepted').length
                                : 0;
                              const total = 1 + acceptedCount;
                              return `${total} ${total === 1 ? 'Person' : 'People'}`;
                            })()}
                          </p>
                        </div>
                        {(Number(viewingBooking.totalAmount || 0) > 0 || Number(viewingBooking.extensionAmount || 0) > 0) && (
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Amount</p>
                            <p className="text-[12px] font-pmedium text-slate-900">{formatCurrency(viewingBooking.totalAmount || 0)}</p>
                            {Number(viewingBooking.extensionAmount || 0) > 0 && (
                              <p className="text-[10px] font-pmedium text-slate-500">Extension: {formatCurrency(viewingBooking.extensionAmount)}</p>
                            )}
                          </div>
                        )}
                        {viewingBooking.currentInviteStatus && (
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Your Invite</p>
                            <span className={statusPillClass(statusLabel(viewingBooking.currentInviteStatus))}>
                              {statusLabel(viewingBooking.currentInviteStatus)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── External-specific fields (Task 20) ── */}
                    {normalize(viewingBooking.bookingType) === 'external' && (
                      <div>
                        <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                          <Users size={14} /> Client & Payment
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Client Name</p>
                            <p className="text-[12px] font-pmedium text-slate-900">{(viewingBooking as any).bookedForName || '—'}</p>
                          </div>
                          {(viewingBooking as any).paymentMode && (
                            <div>
                              <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Payment Mode</p>
                              <p className="text-[12px] font-pmedium text-slate-900">{(viewingBooking as any).paymentMode}</p>
                            </div>
                          )}
                          {(viewingBooking as any).paymentStatus && (
                            <div>
                              <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Payment Status</p>
                              <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-pmedium uppercase tracking-wider border ${
                                (viewingBooking as any).paymentStatus === 'Paid'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {getExternalPaymentLabel(viewingBooking)}
                              </span>
                            </div>
                          )}
                          {(viewingBooking as any).transactionId && (
                            <div>
                              <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Transaction ID</p>
                              <p className="text-[12px] font-pmedium text-slate-900 font-mono">{(viewingBooking as any).transactionId}</p>
                            </div>
                          )}
                          {(viewingBooking as any).paymentProofUrl && (
                            <div>
                              <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Payment Screenshot</p>
                              <a
                                href={(viewingBooking as any).paymentProofUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-pmedium text-blue-700 transition-colors hover:bg-blue-100"
                              >
                                <Eye size={11} /> View Screenshot
                              </a>
                            </div>
                          )}
                          {(Number(viewingBooking.baseAmount || 0) > 0 || Number(viewingBooking.totalAmount || 0) > 0) && (
                            <div className="sm:col-span-2">
                              <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-2">Pricing Breakdown</p>
                              <div className="rounded-xl border border-slate-100 bg-white p-3 space-y-1.5 text-[12px]">
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-pmedium">Base Amount</span>
                                  <span className="font-pmedium text-[#0F172A]">{formatCurrency(viewingBooking.baseAmount || 0)}</span>
                                </div>
                                {Number((viewingBooking as any).discountValue || 0) > 0 && (
                                  <div className="flex justify-between text-emerald-700">
                                    <span className="font-pmedium">Discount</span>
                                    <span className="font-pmedium">−{formatCurrency(Math.abs((viewingBooking as any).discountAmount || 0))}</span>
                                  </div>
                                )}
                                {Number(viewingBooking.gstAmount || 0) > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-500 font-pmedium">GST (18%)</span>
                                    <span className="font-pmedium text-[#0F172A]">{formatCurrency(viewingBooking.gstAmount || 0)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between pt-1.5 border-t border-slate-200">
                                  <span className="font-pmedium text-[#0F172A]">Total</span>
                                  <span className="font-pmedium text-[#2563EB]">{formatCurrency(viewingBooking.totalAmount || 0)}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {Array.isArray(viewingBooking.invites) && viewingBooking.invites.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                          <Users size={14} /> Invited Members
                        </h3>
                        <div className="space-y-2">
                          {viewingBooking.invites.map((invite: any) => {
                            const inviteName = resolveInviteDisplayName(invite);
                            const inviteRole = resolveInviteDisplayRole(invite);

                            return (
                              <div key={`${invite.invitedUserId}-${inviteName}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                                <div>
                                  <p className="text-[12px] font-pmedium text-slate-900">{inviteName}</p>
                                  <p className="text-[10px] font-pmedium text-slate-400">{formatInviteGroupLabel(inviteRole)}</p>
                                </div>
                                <div className="text-right">
                                  <span className={statusPillClass(statusLabel(invite.status))}>
                                    {statusLabel(invite.status)}
                                  </span>
                                  {invite.responseReason ? (
                                    <p className="mt-1 text-[10px] font-pmedium text-slate-500 max-w-[180px]">{invite.responseReason}</p>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {viewingBooking.status === 'cancelled' && viewingBooking.cancelReason && (
                      <div>
                        <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                          <AlertCircle size={14} /> Cancellation Reason
                        </h3>
                        <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl font-pmedium text-red-900 text-[12px] leading-relaxed">"{viewingBooking.cancelReason}"</div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                        <Eye size={14} /> Purpose
                      </h3>
                      <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[12px] font-pmedium leading-5 text-slate-700 italic">"{viewingBooking.purpose}"</p>
                      </div>
                    </div>

                    {(mainBookingTab === 'tenant_bookings' ? canManageOwnBooking(viewingBooking) : (isMyBooking(viewingBooking) && !viewingBooking.isInvitedMeeting && canManageOwnBooking(viewingBooking))) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {canRescheduleOwnBooking(viewingBooking) && (
                          <>
                            <button onClick={() => { setRescheduleData({ ...viewingBooking, startTime: viewingBooking.startTime, endTime: viewingBooking.endTime }); setRescheduleInviteeIds(viewingBooking.inviteeUserIds || []); setShowRescheduleDialog(true); }} className="w-full py-2.5 bg-white border border-slate-200 rounded-xl font-pmedium text-[12px] text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-1.5"><CalendarClock size={14} /> Reschedule</button>
                            <button onClick={() => { setBookingToCancel(viewingBooking); setShowCancelDialog(true); }} className="w-full py-2.5 bg-white border border-red-200 rounded-xl font-pmedium text-[12px] text-red-600 hover:bg-red-50 transition-all shadow-sm flex items-center justify-center gap-1.5"><XCircle size={14} /> Cancel</button>
                          </>
                        )}
                        {canExtendOwnBooking(viewingBooking) && (
                          <button onClick={() => { setExtendBooking(viewingBooking); setExtendForm({ extraMinutes: '30' }); setShowExtendDialog(true); }} className="w-full py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[12px] shadow-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 sm:col-span-2"><Clock size={14} /> Extend Booking</button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. EXTEND BOOKING MODAL */}
      <AnimatePresence>
        {showExtendDialog && extendBooking && (
          <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeExtendDialog} className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-[32px] md:rounded-[32px] w-full md:max-w-xl shadow-2xl relative z-[90] flex flex-col overflow-y-auto max-h-[90vh] md:max-h-[85vh]"
            >
              <div className="w-full flex justify-center py-3 md:hidden">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
              </div>

              <div className="px-6 py-4 md:p-8 border-b border-slate-100/60 flex justify-between items-center bg-white/95 backdrop-blur-sm sticky top-0 z-20">
                <div>
                  <h2 className="text-xl md:text-2xl font-pmedium text-primary tracking-tight flex items-center gap-2">Extend Booking</h2>
                  <p className="text-[11px] font-pmedium text-amber-600 uppercase tracking-widest mt-1">Meeting is in progress</p>
                </div>
                <button onClick={closeExtendDialog} className="w-10 h-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors">
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Current Slot</p>
                  <div className="mt-1">{renderScheduleSummary(extendBooking)}</div>
                </div>

                {extendBookingPreview?.available && (
                  extendBookingPreview.isTenant ? (
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-2">
                      <p className="text-[10px] font-pmedium text-indigo-700 uppercase tracking-widest">Extension Credits</p>
                      <div className="flex items-center justify-between text-sm font-pmedium text-indigo-900">
                        <span>Extra time</span>
                        <span>{extendForm.extraMinutes} minutes</span>
                      </div>
                      <div className="flex items-center justify-between text-base font-pmedium text-indigo-950 pt-2 border-t border-indigo-200">
                        <span>Credits to deduct</span>
                        <span>{(extendBookingPreview.creditsToDeduct || 0).toFixed(2)} CR</span>
                      </div>
                      {typeof extendBookingPreview.remainingCredits === 'number' && (
                        <div className="flex items-center justify-between text-sm font-pmedium text-indigo-700">
                          <span>Remaining after extension</span>
                          <span>{Math.max(0, extendBookingPreview.remainingCredits - (extendBookingPreview.creditsToDeduct || 0)).toFixed(2)} CR</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-2">
                      <p className="text-[10px] font-pmedium text-amber-700 uppercase tracking-widest">Extension Charge</p>
                      <div className="flex items-center justify-between text-sm font-pmedium text-amber-900">
                        <span>Extra time</span>
                        <span>{extendForm.extraMinutes} minutes</span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-pmedium text-amber-900">
                        <span>Extension amount</span>
                        <span>{formatCurrency(extendBookingPreview.extensionAmount || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-pmedium text-amber-900">
                        <span>GST</span>
                        <span>{formatCurrency((extendBookingPreview.extensionTotal || 0) - (extendBookingPreview.extensionAmount || 0))}</span>
                      </div>
                      <div className="flex items-center justify-between text-base font-pmedium text-amber-950 pt-2 border-t border-amber-200">
                        <span>Total booking value</span>
                        <span>{formatCurrency(extendBookingPreview.nextTotalAmount || extendBooking.totalAmount || 0)}</span>
                      </div>
                    </div>
                  )
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Extend By</label>
                  <select className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm transition-all" value={extendForm.extraMinutes} onChange={(e) => setExtendForm({ extraMinutes: e.target.value })}>
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">1 Hour</option>
                    <option value="90">1 Hour 30 Minutes</option>
                    <option value="120">2 Hours</option>
                  </select>
                </div>

                <div className={`p-4 rounded-2xl border ${extendBookingPreview?.available ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  <p className={`text-[10px] font-pmedium uppercase tracking-widest mb-1 ${extendBookingPreview?.available ? 'text-emerald-700' : 'text-red-700'}`}>{extendBookingPreview?.available ? 'Availability Check' : 'Availability Blocked'}</p>
                  <p className={`text-sm font-pmedium ${extendBookingPreview?.available ? 'text-emerald-700' : 'text-red-700'}`}>{extendBookingPreview?.reason || 'This booking can be extended.'}</p>
                  {extendBookingPreview?.available && extendBookingPreview?.nextEndTime && (
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mt-2">New End Time: {formatTime12h(extendBookingPreview.nextEndTime)}</p>
                  )}
                </div>

                {errorMessage && !extendBookingPreview?.available && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-sm font-pmedium text-red-700">{errorMessage}</div>
                )}
              </div>

              <div className="p-6 md:p-8 bg-slate-50/50 border-t border-slate-100/60 flex gap-3 sticky bottom-0">
                <button disabled={isSavingBooking} onClick={closeExtendDialog} className="flex-1 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-[13px] text-slate-600 hover:text-[#0F172A] transition-all shadow-sm disabled:opacity-50">Cancel</button>
                <button disabled={!extendBookingPreview?.available || isSavingBooking} onClick={handleExtendBooking} className="flex-1 py-3.5 bg-amber-500 text-white rounded-xl font-pmedium text-[13px] uppercase tracking-wider shadow-lg shadow-amber-200 disabled:bg-slate-200 disabled:shadow-none hover:bg-amber-600 transition-all active:scale-[0.98]">{isSavingBooking ? 'Saving...' : 'Extend Booking'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. REJECT INVITE MODAL */}
      <AnimatePresence>
        {showRejectInviteDialog && inviteToReject && (
          <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeRejectInviteDialog} className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-[32px] md:rounded-[32px] w-full md:max-w-md shadow-2xl relative z-[90] flex flex-col overflow-hidden"
            >
              <div className="p-6 md:p-8 bg-red-50/50 border-b border-red-100/60 flex justify-between items-center sm:hidden">
                <div className="w-12 h-1.5 bg-red-200 rounded-full mx-auto"></div>
              </div>

              <div className="p-6 md:p-8 bg-red-50/50 border-b border-red-100/60 flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="p-3 bg-red-100 text-red-600 rounded-2xl shadow-sm border border-red-200/50 hidden sm:flex items-center justify-center"><XCircle size={24} /></div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-pmedium text-red-900 tracking-tight">Reject Meeting Invite</h2>
                    <p className="text-[11px] font-pmedium text-red-600 uppercase tracking-widest mt-1.5">{inviteToReject.roomName}</p>
                  </div>
                </div>
                <button onClick={closeRejectInviteDialog} className="w-10 h-10 bg-white hover:bg-red-100 text-red-400 hover:text-red-600 rounded-full flex items-center justify-center transition-colors shadow-sm"><X size={18} strokeWidth={2.5} /></button>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div className="p-4 bg-white border border-slate-200/60 rounded-2xl text-[13px] font-pmedium text-slate-600 shadow-sm space-y-1.5">
                  <p>
                    You are rejecting the meeting invite on <span className="font-pmedium text-[#0F172A]">{inviteToReject.date}</span> at <span className="font-pmedium text-[#0F172A] whitespace-nowrap">{formatTimeSlot(inviteToReject.startTime, inviteToReject.endTime)}</span>.
                  </p>
                  <p className="text-slate-500">
                    This will notify <span className="font-pmedium text-[#0F172A]">{inviteToReject.bookedByName}</span> with your reason.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Reason for Rejection</label>
                  <textarea
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none transition-all shadow-sm"
                    rows={3}
                    placeholder="Please share why you cannot attend this meeting..."
                    value={inviteRejectReason}
                    onChange={(e) => setInviteRejectReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-6 md:p-8 bg-slate-50/50 border-t border-slate-100/60 flex gap-3">
                <button disabled={isSavingBooking} onClick={closeRejectInviteDialog} className="flex-1 py-3.5 bg-white border border-slate-200 rounded-xl font-pmedium text-[13px] text-slate-600 hover:text-[#0F172A] hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50">Keep It</button>
                <button disabled={!inviteRejectReason.trim() || isSavingBooking} onClick={handleRejectInviteSubmit} className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-pmedium text-[13px] shadow-lg shadow-red-500/30 disabled:bg-slate-200 disabled:shadow-none hover:bg-red-700 transition-all active:scale-[0.98]">{isSavingBooking ? 'Saving...' : 'Reject Invite'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. CANCEL BOOKING MODAL */}
      <AnimatePresence>
        {showCancelDialog && bookingToCancel && (
          <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCancelDialog(false)} className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-[32px] md:rounded-[32px] w-full md:max-w-md shadow-2xl relative z-[90] flex flex-col overflow-hidden"
            >
              <div className="p-6 md:p-8 bg-red-50/50 border-b border-red-100/60 flex justify-between items-center sm:hidden">
                <div className="w-12 h-1.5 bg-red-200 rounded-full mx-auto"></div>
              </div>

              <div className="p-6 md:p-8 bg-red-50/50 border-b border-red-100/60 flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="p-3 bg-red-100 text-red-600 rounded-2xl shadow-sm border border-red-200/50 hidden sm:flex items-center justify-center"><XCircle size={24} /></div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-pmedium text-red-900 tracking-tight">Cancel Meeting</h2>
                    <p className="text-[11px] font-pmedium text-red-600 uppercase tracking-widest mt-1.5">{bookingToCancel.roomName}</p>
                  </div>
                </div>
                <button onClick={() => setShowCancelDialog(false)} className="w-10 h-10 bg-white hover:bg-red-100 text-red-400 hover:text-red-600 rounded-full flex items-center justify-center transition-colors shadow-sm"><X size={18} strokeWidth={2.5} /></button>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div className="p-4 bg-white border border-slate-200/60 rounded-2xl text-[13px] font-pmedium text-slate-600 shadow-sm">
                  You are cancelling the meeting on <span className="font-pmedium text-[#0F172A]">{bookingToCancel.date}</span> at <span className="font-pmedium text-[#0F172A]">{bookingToCancel.checkIn}</span>. This action cannot be undone.
                </div>
                {normalize(bookingToCancel.bookingType) === 'tenant' && Number(bookingToCancel.bookingCredits || 0) > 0 && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-[13px] font-pmedium text-emerald-800 flex items-center gap-2 shadow-sm">
                    <CreditCard size={18} />
                    You will be refunded {Number(bookingToCancel.bookingCredits).toFixed(2)} CR for this booking.
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Reason for Cancellation</label>
                  <textarea
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none transition-all shadow-sm"
                    rows={3}
                    placeholder="Please inform attendees why this is cancelled..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-6 md:p-8 bg-slate-50/50 border-t border-slate-100/60 flex gap-3">
                <button disabled={isSavingBooking} onClick={() => setShowCancelDialog(false)} className="flex-1 py-3.5 bg-white border border-slate-200 rounded-xl font-pmedium text-[13px] text-slate-600 hover:text-[#0F172A] hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50">Keep It</button>
                <button disabled={!cancelReason.trim() || isSavingBooking} onClick={handleCancelBooking} className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-pmedium text-[13px] shadow-lg shadow-red-500/30 disabled:bg-slate-200 disabled:shadow-none hover:bg-red-700 transition-all active:scale-[0.98]">{isSavingBooking ? 'Saving...' : 'Cancel Meeting'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. RESCHEDULE MODAL */}
      <AnimatePresence>
        {showRescheduleDialog && (
          <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRescheduleDialog(false)} className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-[32px] md:rounded-[32px] w-full md:max-w-xl shadow-2xl relative z-[90] flex flex-col overflow-y-auto max-h-[90vh] md:max-h-[85vh]"
            >
              <div className="w-full flex justify-center py-3 md:hidden">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
              </div>

              <div className="px-6 py-4 md:p-8 border-b border-slate-100/60 flex justify-between items-center bg-white/95 backdrop-blur-sm sticky top-0 z-20">
                <div>
                  <h2 className="text-xl md:text-2xl font-pmedium text-primary tracking-tight flex items-center gap-2">Reschedule</h2>
                  <p className="text-[11px] font-pmedium text-[#2563EB] uppercase tracking-widest mt-1">Refining Schedule</p>
                </div>
                <button onClick={() => setShowRescheduleDialog(false)} className="w-10 h-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors">
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                {normalize(rescheduleData.bookingType) !== 'tenant' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Update Location (Optional)</label>
                  <div className="relative">
                    <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={rescheduleData.roomName || ''} onChange={(e) => setRescheduleData({ ...rescheduleData, roomName: e.target.value })}>
                      {availableRooms.map((roomName) => (
                        <option key={roomName} value={roomName} disabled={isRoomOptionDisabled(roomName)}>
                          {getRoomOptionLabel(roomName)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  </div>
                </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">New Date</label>
                    <input type="date" min={todayStr} value={rescheduleData.date || ''} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm transition-all" onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">New Check In</label>
                    <select value={rescheduleData.startTime || ''} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm transition-all" onChange={(e) => {
                      const nextStartTime = e.target.value;
                      const minimumEndTime = minutesToTimeString((timeToMinutes(nextStartTime) || 0) + BOOKING_MIN_DURATION_MINUTES);
                      const currentEndMinutes = timeToMinutes(rescheduleData.endTime);
                      const minimumEndMinutes = timeToMinutes(minimumEndTime);
                      setRescheduleData({
                        ...rescheduleData,
                        startTime: nextStartTime,
                        endTime: !rescheduleData.endTime || currentEndMinutes === null || (minimumEndMinutes !== null && currentEndMinutes < minimumEndMinutes) ? minimumEndTime : rescheduleData.endTime,
                      });
                    }}>
                      <option value="">Select start time</option>
                      {rescheduleStartTimeOptions.map((timeValue) => (
                        <option key={timeValue} value={timeValue}>{formatTimeOptionLabel(timeValue)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">New Check Out</label>
                    <select value={rescheduleData.endTime || ''} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm transition-all" onChange={(e) => setRescheduleData({ ...rescheduleData, endTime: e.target.value })}>
                      <option value="">Select end time</option>
                      {rescheduleEndTimeOptions.map((timeValue) => (
                        <option key={timeValue} value={timeValue}>{formatTimeOptionLabel(timeValue)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {normalize(rescheduleData.bookingType) === 'tenant' && (() => {
                  const currentCredits = Number(rescheduleData.bookingCredits || 0);
                  const newCredits = Number(rescheduleCreditEstimate);
                  const diff = newCredits - currentCredits;
                  const hasDiff = Math.abs(diff) > 0.01;
                  return (
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-[13px] flex flex-col gap-2 shadow-sm">
                      <div className="flex items-center gap-2 font-pmedium text-indigo-800">
                        <CreditCard size={16} />
                        Credit Summary
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-xl bg-white/70 px-2 py-2 border border-indigo-100">
                          <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Current</p>
                          <p className="text-sm font-pmedium text-indigo-800 mt-0.5">{currentCredits.toFixed(2)} CR</p>
                        </div>
                        <div className="rounded-xl bg-white/70 px-2 py-2 border border-indigo-100">
                          <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">New Estimate</p>
                          <p className="text-sm font-pmedium text-indigo-800 mt-0.5">{newCredits.toFixed(2)} CR</p>
                        </div>
                        <div className={`rounded-xl px-2 py-2 border ${hasDiff && diff > 0 ? 'bg-red-50 border-red-200' : hasDiff && diff < 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-white/70 border-indigo-100'}`}>
                          <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">{hasDiff && diff > 0 ? 'Extra Charge' : hasDiff && diff < 0 ? 'Refund' : 'Change'}</p>
                          {hasDiff && diff > 0 ? (
                            <p className="text-sm font-pmedium text-red-700 mt-0.5">+{diff.toFixed(2)} CR</p>
                          ) : hasDiff && diff < 0 ? (
                            <p className="text-sm font-pmedium text-emerald-700 mt-0.5">{diff.toFixed(2)} CR</p>
                          ) : (
                            <p className="text-sm font-pmedium text-slate-500 mt-0.5">-</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {normalize(rescheduleData.bookingType) === 'tenant' && (
                  <div className="space-y-4 border-t border-slate-100 pt-5">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-slate-100" />
                      <span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest shrink-0">Invite Members</span>
                      <div className="h-px flex-1 bg-slate-100" />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Select Members</span>
                      <span className="text-[11px] font-pmedium text-slate-500">{rescheduleInviteeIds.length} selected</span>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
                      {inviteDepartments.map((group: any) => (
                        <div key={group.department} className="rounded-xl border border-slate-200/60 bg-slate-50/70 p-3">
                          <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500 mb-2">
                            {group.label}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {group.members.map((member: any) => {
                              const memberId = resolveMemberUserId(member);
                              const checked = rescheduleInviteeIds.includes(memberId);
                              const existingInvite = Array.isArray(rescheduleData.invites) ? rescheduleData.invites.find((inv: Invite) => normalize(inv.invitedUserId) === normalize(memberId)) : null;
                              const existingStatus = existingInvite ? normalize(existingInvite.status) : '';
                              const memberRole = normalize(member.role || '');
                              const isManagement = memberRole === 'owner' || memberRole === 'founder' || memberRole === 'super_admin' || memberRole === 'super-admin' || memberRole === 'admin';
                              const sublabel = isManagement
                                ? formatInviteGroupLabel(member.role)
                                : ((member as any).departments?.[0] || (member as any).department || formatInviteGroupLabel(member.role || 'Member'));
                              return (
                                <label key={memberId} className={`flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors ${checked ? 'border-[#2563EB] bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => setRescheduleInviteeIds(prev =>
                                      checked ? prev.filter(id => id !== memberId) : [...prev, memberId]
                                    )}
                                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-pmedium text-[#0F172A] truncate">{resolveMemberName(member) || member.email || 'Member'}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] font-pmedium text-slate-500">{sublabel}</span>
                                      {existingStatus === 'accepted' && (
                                        <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-pmedium uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200">
                                          <CheckCircle2 size={10} /> Accepted
                                        </span>
                                      )}
                                      {existingStatus === 'pending' && (
                                        <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-pmedium uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200">Pending</span>
                                      )}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {inviteDepartments.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] font-pmedium text-slate-400">
                          No inviteable members found.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!rescheduleTimeValidation.valid && (
                  <div className="p-4 bg-red-50 rounded-2xl flex items-start sm:items-center gap-3 border border-red-100 mt-2">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5 sm:mt-0" size={20} />
                    <p className="text-[13px] text-red-800 font-pmedium">{rescheduleTimeValidation.reason}</p>
                  </div>
                )}

                {/* External booking — reschedule pricing delta */}
                {normalize(rescheduleData.bookingType) === 'external' && rescheduleData.startTime && rescheduleData.endTime && rescheduleTimeValidation.valid && (() => {
                  const room = roomCatalog.find(r => r.name === rescheduleData.roomName);
                  const pricePerHour = Number(room?.pricePerHour || 0);
                  const origPricing = computeExternalPricing(pricePerHour, rescheduleData.previousStartTime || rescheduleData.startTime, rescheduleData.previousEndTime || rescheduleData.endTime, 'flat', 0);
                  const newPricing = computeExternalPricing(pricePerHour, rescheduleData.startTime, rescheduleData.endTime, 'flat', 0);
                  const origTotal = Number(rescheduleData.totalAmount || origPricing.totalAmount || 0);
                  const newTotal = newPricing.totalAmount;
                  const diff = newTotal - origTotal;
                  const hasDiff = Math.abs(diff) > 0.5;
                  return (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 font-pmedium text-amber-800 text-[13px]">
                        <DollarSign size={15} />
                        Pricing Adjustment
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-xl bg-white/70 px-2 py-2 border border-amber-100">
                          <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Original</p>
                          <p className="text-sm font-pmedium text-amber-800 mt-0.5">{formatCurrency(origTotal)}</p>
                        </div>
                        <div className="rounded-xl bg-white/70 px-2 py-2 border border-amber-100">
                          <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">New Estimate</p>
                          <p className="text-sm font-pmedium text-amber-800 mt-0.5">{formatCurrency(newTotal)}</p>
                        </div>
                        <div className={`rounded-xl px-2 py-2 border ${hasDiff && diff > 0 ? 'bg-red-50 border-red-200' : hasDiff && diff < 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-white/70 border-amber-100'}`}>
                          <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">{hasDiff && diff > 0 ? 'Extra Charge' : hasDiff && diff < 0 ? 'Saving' : 'Change'}</p>
                          {hasDiff && diff > 0 ? (
                            <p className="text-sm font-pmedium text-red-700 mt-0.5">+{formatCurrency(diff)}</p>
                          ) : hasDiff && diff < 0 ? (
                            <p className="text-sm font-pmedium text-emerald-700 mt-0.5">{formatCurrency(diff)}</p>
                          ) : (
                            <p className="text-sm font-pmedium text-slate-500 mt-0.5">—</p>
                          )}
                        </div>
                      </div>
                      {pricePerHour > 0 && (
                        <p className="text-[11px] font-pmedium text-amber-700">Rate: {formatCurrency(pricePerHour)}/hr · GST included</p>
                      )}
                    </div>
                  );
                })()}

                {rescheduleTimeValidation.valid && rescheduleStatus === 'available' && (
                  <div className="p-4 bg-emerald-50 rounded-2xl flex items-start sm:items-center gap-3 border border-emerald-100 mt-2">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5 sm:mt-0" size={20} />
                    <p className="text-[13px] text-emerald-800 font-pmedium">Slot is available!</p>
                  </div>
                )}
                {rescheduleTimeValidation.valid && rescheduleStatus === 'conflict' && (
                  <div className="p-4 bg-red-50 rounded-2xl flex items-start sm:items-center gap-3 border border-red-100 mt-2">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5 sm:mt-0" size={20} />
                    <p className="text-[13px] text-red-800 font-pmedium">Slot conflict detected. Please adjust time.</p>
                  </div>
                )}
              </div>
              <div className="p-6 md:p-8 bg-slate-50/50 border-t border-slate-100/60 flex gap-3 sticky bottom-0">
                <button disabled={isSavingBooking} className="flex-1 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-[13px] text-slate-600 hover:text-[#0F172A] transition-all shadow-sm disabled:opacity-50" onClick={() => setShowRescheduleDialog(false)}>Cancel</button>
                <button disabled={rescheduleStatus !== 'available' || isSavingBooking} onClick={handleRescheduleBooking} className="flex-1 py-3.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[13px] uppercase tracking-wider shadow-lg shadow-[#2563EB]/30 disabled:bg-slate-200 disabled:shadow-none hover:bg-blue-600 transition-all active:scale-[0.98]">{isSavingBooking ? 'Saving...' : 'Update'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --------- EXTERNAL BOOKING DIALOG --------- */}
      <AnimatePresence>
        {showExternalBookingDialog && (
          <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowExternalBookingDialog(false); setExtClientSearch(''); setExtClientSearchResults([]); setExtClientSelected(null); }} className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-[32px] md:rounded-[32px] w-full md:max-w-2xl max-h-[92vh] md:max-h-[88vh] shadow-2xl relative z-[90] flex flex-col overflow-hidden"
            >
              <div className="w-full flex justify-center py-3 md:hidden"><div className="w-12 h-1.5 bg-slate-200 rounded-full" /></div>

              {/* Header */}
              <div className="px-6 py-4 md:p-8 flex justify-between items-center border-b border-slate-100/60 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
                <div>
                  <h2 className="text-xl md:text-2xl font-pmedium text-primary tracking-tight">External Booking</h2>
                  <p className="text-[11px] font-pmedium text-slate-400 uppercase tracking-widest mt-1">Walk-in / External visitor</p>
                </div>
              <button onClick={() => { setShowExternalBookingDialog(false); setExtClientSearch(''); setExtClientSearchResults([]); setExtClientSelected(null); }} className="w-10 h-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors">
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              {/* Client Type Tabs */}
              <div className="px-6 md:px-8 pt-4 pb-0 shrink-0">
                <div className="flex bg-slate-100/60 p-1 rounded-xl border border-slate-200/50 mb-1">
                  {([{ key: 'search' as const, label: 'Search / Recent' }, { key: 'new' as const, label: 'New Client' }]).map(tab => (
                    <button key={tab.key} type="button" onClick={() => {
                      setExternalBookingClientTab(tab.key as any);
                      setExtClientSearch(''); setExtClientSearchResults([]); setExtClientSelected(null);
                    }}
                      className={`flex-1 py-2.5 rounded-xl text-[11px] font-pmedium uppercase tracking-widest transition-all ${(externalBookingClientTab as string) === tab.key ? 'bg-[#2563EB] text-white shadow-sm' : 'text-[#0F172A] hover:bg-slate-200/70 hover:text-slate-900'}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 sm:p-6 md:p-8 space-y-5 overflow-y-auto flex-1">
                {/* Client Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest shrink-0">Client Information</span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>

                  {(externalBookingClientTab as string) !== 'new' ? (
                    /* ── Search / Recent tab ── */
                    <div className="space-y-3">
                      {/* Selected client chip */}
                      {extClientSelected && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[13px] font-pmedium text-emerald-800">{extClientSelected.name}</p>
                            <p className="text-[11px] font-pmedium text-emerald-600">{extClientSelected.phone}{extClientSelected.email ? ` · ${extClientSelected.email}` : ''}{extClientSelected.company ? ` · ${extClientSelected.company}` : ''}</p>
                          </div>
                          <button type="button" onClick={() => { setExtClientSelected(null); setExternalBookingForm(f => ({ ...f, name: '', phone: '', email: '', company: '' })); }} className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-100 hover:bg-red-100 text-emerald-600 hover:text-red-500 transition-colors shrink-0">
                            <X size={13} strokeWidth={2.5} />
                          </button>
                        </div>
                      )}

                      {/* Live search input */}
                      {!extClientSelected && (
                        <div className="relative">
                          <div className="relative">
                            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              value={extClientSearch}
                              onChange={(e) => {
                                const val = e.target.value;
                                setExtClientSearch(val);
                                if (extClientSearchDebounceRef.current) clearTimeout(extClientSearchDebounceRef.current);
                                if (val.length < 2) { setExtClientSearchResults([]); return; }
                                setExtClientSearchLoading(true);
                                extClientSearchDebounceRef.current = setTimeout(async () => {
                                  try {
                                    const res = await getExternalClients(workspaceId, val);
                                    setExtClientSearchResults(Array.isArray(res) ? res : []);
                                  } catch { setExtClientSearchResults([]); }
                                  finally { setExtClientSearchLoading(false); }
                                }, 350);
                              }}
                              placeholder="Search by name, phone, or email…"
                              className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all"
                            />
                            {extClientSearchLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />}
                          </div>

                          {/* Search results dropdown */}
                          {extClientSearchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
                              {extClientSearchResults.map((client: any) => (
                                <button key={client._id || client.email} type="button" onClick={() => {
                                  setExtClientSelected(client);
                                  setExternalBookingForm(f => ({ ...f, name: client.name, phone: client.phone, email: client.email || '', company: client.company || '' }));
                                  setExtClientSearch(''); setExtClientSearchResults([]);
                                }} className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                                  <p className="text-[13px] font-pmedium text-[#0F172A]">{client.name}</p>
                                  <p className="text-[11px] text-slate-500">{client.phone}{client.email ? ` · ${client.email}` : ''}{client.company ? ` · ${client.company}` : ''}</p>
                                </button>
                              ))}
                            </div>
                          )}
                          {extClientSearch.length >= 2 && !extClientSearchLoading && extClientSearchResults.length === 0 && (
                            <p className="mt-2 text-[11px] text-slate-400 px-1">No clients found. Use "New Client" to add one.</p>
                          )}
                        </div>
                      )}

                      {/* Recent 2 clients */}
                      {!extClientSelected && extClientSearch.length < 2 && existingExternalClients.slice(0, 2).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Recent clients</p>
                          {existingExternalClients.slice(0, 2).map((client, idx) => (
                            <button key={idx} type="button" onClick={() => {
                              setExtClientSelected(client);
                              setExternalBookingForm(f => ({ ...f, name: client.name, phone: client.phone, email: client.email, company: client.company }));
                            }}
                              className="w-full flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-[#2563EB]/50 p-4 text-left transition-all">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#2563EB] font-pmedium text-sm shrink-0">
                                  {client.name[0]?.toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[13px] font-pmedium text-[#0F172A] truncate">{client.name}</p>
                                  <p className="text-[11px] font-pmedium text-slate-500 truncate">{client.phone}{client.company ? ` · ${client.company}` : ''}</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-pmedium text-[#2563EB] uppercase tracking-widest shrink-0">Select</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ── New Client tab ── */
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Full Name *</label>
                        <input type="text" value={externalBookingForm.name} onChange={e => setExternalBookingForm(f => ({ ...f, name: e.target.value }))} placeholder="Client name" className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all" />
                      </div>
                      <div className="space-y-2 col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Phone *</label>
                        <input type="tel" value={externalBookingForm.phone} onChange={e => setExternalBookingForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all" />
                      </div>
                      <div className="space-y-2 col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          Email <span className="text-slate-300 normal-case font-pmedium">(for confirmation)</span>
                        </label>
                        <input type="email" value={externalBookingForm.email} onChange={e => setExternalBookingForm(f => ({ ...f, email: e.target.value }))} placeholder="client@email.com" className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all" />
                      </div>
                      <div className="space-y-2 col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Company <span className="text-slate-300 normal-case font-pmedium">(optional)</span></label>
                        <input type="text" value={externalBookingForm.company} onChange={e => setExternalBookingForm(f => ({ ...f, company: e.target.value }))} placeholder="Company / Agency" className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Room Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest shrink-0">Room Selection</span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  {(() => {
                    const activeRooms = roomCatalog.filter(isActiveRoom);
                    const roomTypes = [...new Set(activeRooms.map(r => r.type).filter(Boolean))];
                    const floors = [...new Set(activeRooms.filter(r => !externalBookingForm.roomType || r.type === externalBookingForm.roomType).map(r => r.floor).filter(Boolean))];
                    const hasWings = activeRooms.some(r => (!externalBookingForm.floor || r.floor === externalBookingForm.floor) && Boolean(r.wing));
                    const wings = [...new Set(activeRooms.filter(r => (!externalBookingForm.roomType || r.type === externalBookingForm.roomType) && (!externalBookingForm.floor || r.floor === externalBookingForm.floor)).map(r => r.wing).filter(Boolean))];
                    const filteredRooms = activeRooms.filter(r => (!externalBookingForm.roomType || r.type === externalBookingForm.roomType) && (!externalBookingForm.floor || r.floor === externalBookingForm.floor) && (!externalBookingForm.wing || !r.wing || r.wing === externalBookingForm.wing));
                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Room Type</label>
                            <div className="relative">
                              <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={externalBookingForm.roomType} onChange={e => setExternalBookingForm(f => ({ ...f, roomType: e.target.value, floor: '', wing: '', roomName: '' }))}>
                                <option value="">Select room type</option>
                                {roomTypes.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Floor</label>
                            <div className="relative">
                              <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={externalBookingForm.floor} onChange={e => setExternalBookingForm(f => ({ ...f, floor: e.target.value, wing: '', roomName: '' }))}>
                                <option value="">Select floor</option>
                                {floors.map(floor => <option key={floor} value={floor}>{floor}</option>)}
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                          </div>
                        </div>
                        {hasWings && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Wing (Optional)</label>
                            <div className="relative">
                              <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={externalBookingForm.wing} onChange={e => setExternalBookingForm(f => ({ ...f, wing: e.target.value, roomName: '' }))}>
                                <option value="">Any wing</option>
                                {wings.map(wing => <option key={wing} value={wing}>{wing}</option>)}
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                          </div>
                        )}
                        <div className="space-y-2">
                          <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Meeting Room *</label>
                          <div className="relative">
                            <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={externalBookingForm.roomName} onChange={e => setExternalBookingForm(f => ({ ...f, roomName: e.target.value }))}>
                              <option value="">-- Choose a Room --</option>
                              {filteredRooms.map(room => <option key={room.name} value={room.name}>{room.name}{room.floor ? `  Floor ${room.floor}` : ''}{room.wing ? `  Wing ${room.wing}` : ''}{room.capacity ? `  ${room.capacity} seats` : ''}</option>)}
                              {filteredRooms.length === 0 && <option value="" disabled>No rooms match your filters</option>}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Date & Time */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest shrink-0">Date & Time</span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Date *</label>
                      <input type="date" min={todayStr} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm transition-all" value={externalBookingForm.date} onChange={e => setExternalBookingForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Start Time *</label>
                      <div className="relative">
                        <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={externalBookingForm.startTime} onChange={e => { const nextStart = e.target.value; const minEnd = minutesToTimeString((timeToMinutes(nextStart) || 0) + BOOKING_MIN_DURATION_MINUTES); setExternalBookingForm(f => ({ ...f, startTime: nextStart, endTime: !f.endTime || (timeToMinutes(f.endTime) || 0) < (timeToMinutes(minEnd) || 0) ? minEnd : f.endTime })); }}>
                          <option value="">Select time</option>
                          {externalStartTimeOptions.map(t => <option key={t} value={t}>{formatTimeOptionLabel(t)}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">End Time *</label>
                      <div className="relative">
                        <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={externalBookingForm.endTime} onChange={e => setExternalBookingForm(f => ({ ...f, endTime: e.target.value }))}>
                          <option value="">Select time</option>
                          {buildTimeOptions(externalBookingForm.startTime ? minutesToTimeString((timeToMinutes(externalBookingForm.startTime) || 0) + BOOKING_MIN_DURATION_MINUTES) : minutesToTimeString(BOOKING_DAY_START_MINUTES + BOOKING_MIN_DURATION_MINUTES), BOOKING_DAY_END).map(t => <option key={t} value={t}>{formatTimeOptionLabel(t)}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Attendees</label>
                      <input type="number" min="1" className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all" value={externalBookingForm.attendees} onChange={e => setExternalBookingForm(f => ({ ...f, attendees: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Purpose</label>
                      <input type="text" placeholder="Meeting, Training, etc." className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all" value={externalBookingForm.purpose} onChange={e => setExternalBookingForm(f => ({ ...f, purpose: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Live Pricing UI */}
                {externalWalkInPricing && (() => {
                  const hasExternalQuote = externalBookingForm.roomName && externalBookingForm.startTime && externalBookingForm.endTime && externalWalkInPricing.subtotalBeforeDiscount > 0;
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-slate-100" />
                        <span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest shrink-0">Pricing & Discount</span>
                        <div className="h-px flex-1 bg-slate-100" />
                      </div>
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-pmedium text-slate-500 uppercase tracking-widest">Base Rate</span>
                              <span className="text-[13px] font-pmedium text-slate-800">{hasExternalQuote ? formatCurrency(externalWalkInPricing.subtotalBeforeDiscount) : 'Pending'}</span>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <button type="button" onClick={() => setExternalBookingForm(f => ({ ...f, discountType: 'amount' }))} className={`flex-1 py-2 rounded-lg text-[10px] font-pmedium uppercase tracking-widest transition-all ${externalBookingForm.discountType === 'amount' ? 'bg-[#2563EB] text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>Amount</button>
                                <button type="button" onClick={() => setExternalBookingForm(f => ({ ...f, discountType: 'percent' }))} className={`flex-1 py-2 rounded-lg text-[10px] font-pmedium uppercase tracking-widest transition-all ${externalBookingForm.discountType === 'percent' ? 'bg-[#2563EB] text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>Percent</button>
                              </div>
                              <input type="number" min="0" placeholder={externalBookingForm.discountType === 'percent' ? 'e.g. 10' : 'e.g. 500'} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-pmedium text-[12px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none" value={externalBookingForm.discountValue} onChange={e => setExternalBookingForm(f => ({ ...f, discountValue: e.target.value }))} />
                            </div>
                          </div>

                          <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-200/60 pt-4 md:pt-0 md:pl-6 flex flex-col justify-end">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-pmedium text-slate-500 uppercase tracking-widest">Discount</span>
                              <span className="text-[12px] font-pmedium text-emerald-600">{hasExternalQuote ? `- ${formatCurrency(externalWalkInPricing.discountAmount)}` : 'Pending'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-pmedium text-slate-500 uppercase tracking-widest">Taxable Amount</span>
                              <span className="text-[12px] font-pmedium text-slate-600">{hasExternalQuote ? formatCurrency(externalWalkInPricing.taxableBaseAfterDiscount) : 'Pending'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-pmedium text-slate-500 uppercase tracking-widest">GST (18%)</span>
                              <span className="text-[12px] font-pmedium text-slate-600">{hasExternalQuote ? formatCurrency(externalWalkInPricing.gst) : 'Pending'}</span>
                            </div>
                            <div className="h-px w-full bg-slate-200/80 my-1" />
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-pmedium text-[#0F172A] uppercase tracking-widest">Total Due</span>
                              <span className="text-[16px] font-pmedium text-[#2563EB]">{hasExternalQuote ? formatCurrency(externalWalkInPricing.total) : 'Pending'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Payment */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest shrink-0">Payment Collection</span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {['Cash', 'GPay (UPI)'].map(mode => (
                      <button key={mode} type="button" onClick={() => setExternalBookingForm(f => ({ ...f, paymentMode: mode, transactionId: mode === 'Cash' ? '' : f.transactionId, paymentProofFile: mode === 'Cash' ? null : f.paymentProofFile }))}
                        className={`py-3.5 rounded-2xl border text-[11px] font-pmedium uppercase tracking-widest transition-all ${externalBookingForm.paymentMode === mode ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-[#2563EB]/50'}`}>
                        {mode}
                      </button>
                    ))}
                  </div>
                  {externalBookingForm.paymentMode !== 'Cash' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Transaction / UTR Number *</label>
                        <input type="text" placeholder="Enter GPay reference" className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all" value={externalBookingForm.transactionId} onChange={e => setExternalBookingForm(f => ({ ...f, transactionId: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Payment Screenshot *</label>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={e => setExternalBookingForm(f => ({ ...f, paymentProofFile: e.target.files?.[0] || null }))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-pmedium text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-[10px] file:font-pmedium file:uppercase file:text-blue-700"
                        />
                      </div>
                    </div>
                  )}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-emerald-700">
                    {externalBookingForm.paymentMode === 'Cash' ? 'Payment Status · Paid as Cash' : 'Payment Status · Paid via GPay'}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Notes (Optional)</label>
                    <textarea rows={2} placeholder="Any internal notes..." className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all resize-none" value={externalBookingForm.notes} onChange={e => setExternalBookingForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 md:p-8 bg-slate-50/50 border-t border-slate-100/60 shrink-0">
                <button type="button" disabled={isSavingExternalBooking || !externalBookingForm.name || !externalBookingForm.phone || !externalBookingForm.roomName || !externalBookingForm.date || !externalBookingForm.startTime || !externalBookingForm.endTime || (externalBookingForm.paymentMode !== 'Cash' && (!externalBookingForm.transactionId.trim() || !externalBookingForm.paymentProofFile))} onClick={(e: any) => handleSubmitExternalBooking(e)} className="w-full py-3.5 sm:py-4 bg-[#2563EB] text-[#ffffff] rounded-xl font-pmedium text-[12px] sm:text-[13px] uppercase tracking-wider shadow-lg shadow-[#2563EB]/30 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none hover:bg-blue-600 transition-all active:scale-[0.98]">
                  {isSavingExternalBooking ? 'Confirming...' : 'Collect Payment & Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --------- INTERNAL BOOKING DIALOG --------- */}
      <AnimatePresence>
        {showInternalBookingDialog && (
          <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInternalBookingDialog(false)} className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-[32px] md:rounded-[32px] w-full md:max-w-4xl max-h-[92vh] md:max-h-[88vh] shadow-2xl relative z-[90] flex flex-col overflow-hidden font-pmedium"
            >
              <div className="w-full flex justify-center py-3 md:hidden"><div className="w-12 h-1.5 bg-slate-200 rounded-full" /></div>

              {/* Header */}
              <div className="px-6 py-4 md:p-8 flex justify-between items-start gap-4 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
                <div>
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">New Booking</p>
                  <h2 className="mt-1 text-xl md:text-2xl font-pmedium text-primary tracking-tight">Internal Booking</h2>
                  <p className="text-[11px] font-pmedium text-slate-400 uppercase tracking-widest mt-1">Booking on behalf of a member</p>
                </div>
                <button type="button" onClick={() => setShowInternalBookingDialog(false)} className="w-10 h-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors shadow-sm border border-slate-200">
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-5 md:py-8 space-y-5 overflow-y-auto flex-1 bg-slate-50/30">
                {/* Booking For */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                    <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><UserPlus size={16} /></span>
                    <span className="text-[12px] font-pmedium uppercase tracking-[0.16em] text-slate-900">Booking For</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Member *</label>
                      <div className="relative">
                        <select
                          className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm"
                          value={internalBookingForm.bookedForUserId}
                          onChange={e => {
                            const selectedId = e.target.value;
                            const member = workspaceMembers.find((m: any) => resolveMemberUserId(m) === selectedId);
                            const memberRole = normalize((member as any)?.role || '');
                            const isManagement = memberRole === 'owner' || memberRole === 'founder' || memberRole === 'super_admin' || memberRole === 'super-admin' || memberRole === 'admin';
                            // For management roles, use role label as department (they have no real dept)
                            const dept = isManagement
                              ? ''
                              : (Array.isArray((member as any)?.departments) && (member as any).departments.find(Boolean)) || (member as any)?.department || '';
                            const name = (member as any)?.fullName || (member as any)?.name || '';
                            setInternalBookingForm(f => ({
                              ...f,
                              bookedForUserId: selectedId,
                              bookedForName: name,
                              department: dept,
                              inviteParticipantIds: [],
                            }));
                          }}
                        >
                          <option value="">Select a member</option>
                          {workspaceMembers.filter((m: any) => {
                            const mId = resolveMemberUserId(m);
                            return mId && mId !== currentUserId;
                          }).map((m: any) => {
                            const mId = resolveMemberUserId(m);
                            return <option key={mId} value={mId}>{getEmployeeDisplayName(m) || (m as any).email}</option>;
                          })}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Department / Role</label>
                      <p className="px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-pmedium text-[13px] min-h-[48px] flex items-center">
                        {(() => {
                          if (internalBookingForm.department) {
                            return <span className="text-[#0F172A]">{internalBookingForm.department}</span>;
                          }
                          if (internalBookingForm.bookedForUserId) {
                            const selectedMember = workspaceMembers.find((m: any) => resolveMemberUserId(m) === internalBookingForm.bookedForUserId);
                            const roleLabel = formatInviteGroupLabel((selectedMember as any)?.role || '');
                            if (roleLabel && roleLabel !== 'Member') {
                              return <span className="text-[#0F172A]">{roleLabel}</span>;
                            }
                          }
                          return <span className="text-slate-400 font-pmedium">Auto-filled from member</span>;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Room Selection */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                    <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0"><CalIcon size={16} /></span>
                    <span className="text-[12px] font-pmedium uppercase tracking-[0.16em] text-slate-900">Room Selection</span>
                  </div>
                  {(() => {
                    const activeRooms = roomCatalog.filter(r => isActiveRoom(r) && isMeetingCalendarRoom(r));
                    const roomTypes = [...new Set(activeRooms.map(r => r.type).filter(Boolean))];
                    const floors = [...new Set(activeRooms.filter(r => !internalBookingForm.roomType || r.type === internalBookingForm.roomType).map(r => r.floor).filter(Boolean))];
                    const hasWings = activeRooms.some(r => (!internalBookingForm.floor || r.floor === internalBookingForm.floor) && Boolean(r.wing));
                    const wings = [...new Set(activeRooms.filter(r => (!internalBookingForm.roomType || r.type === internalBookingForm.roomType) && (!internalBookingForm.floor || r.floor === internalBookingForm.floor)).map(r => r.wing).filter(Boolean))];
                    const filteredRooms = activeRooms.filter(r => (!internalBookingForm.roomType || r.type === internalBookingForm.roomType) && (!internalBookingForm.floor || r.floor === internalBookingForm.floor) && (!internalBookingForm.wing || !r.wing || r.wing === internalBookingForm.wing));
                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Room Type</label>
                            <div className="relative">
                              <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={internalBookingForm.roomType} onChange={e => setInternalBookingForm(f => ({ ...f, roomType: e.target.value, floor: '', wing: '', roomName: '' }))}>
                                <option value="">Select room type</option>
                                {roomTypes.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Floor</label>
                            <div className="relative">
                              <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={internalBookingForm.floor} onChange={e => setInternalBookingForm(f => ({ ...f, floor: e.target.value, wing: '', roomName: '' }))}>
                                <option value="">Select floor</option>
                                {floors.map(floor => <option key={floor} value={floor}>{floor}</option>)}
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                          </div>
                        </div>
                        <div className={`grid gap-5 ${hasWings ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {hasWings && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Wing</label>
                              <div className="relative">
                                <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={internalBookingForm.wing} onChange={e => setInternalBookingForm(f => ({ ...f, wing: e.target.value, roomName: '' }))}>
                                  <option value="">Any wing</option>
                                  {wings.map(wing => <option key={wing} value={wing}>{wing}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                              </div>
                            </div>
                          )}
                          <div className="space-y-2">
                            <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Meeting Room *</label>
                            <div className="relative">
                              <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={internalBookingForm.roomName} onChange={e => setInternalBookingForm(f => ({ ...f, roomName: e.target.value }))}>
                                <option value="">-- Choose a Room --</option>
                                {filteredRooms.map(room => <option key={room.name} value={room.name}>{room.name}{room.floor ? `  Floor ${room.floor}` : ''}{room.wing ? `  Wing ${room.wing}` : ''}{room.capacity ? `  ${room.capacity} seats` : ''}</option>)}
                                {filteredRooms.length === 0 && <option value="" disabled>No rooms match your filters</option>}
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Date & Time */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                    <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0"><Clock size={16} /></span>
                    <span className="text-[12px] font-pmedium uppercase tracking-[0.16em] text-slate-900">Timing & Slot</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Date *</label>
                      <input type="date" min={todayStr} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm transition-all" value={internalBookingForm.date} onChange={e => setInternalBookingForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Start Time *</label>
                      <div className="relative">
                        <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={internalBookingForm.startTime} onChange={e => { const nextStart = e.target.value; const minEnd = minutesToTimeString((timeToMinutes(nextStart) || 0) + BOOKING_MIN_DURATION_MINUTES); setInternalBookingForm(f => ({ ...f, startTime: nextStart, endTime: !f.endTime || (timeToMinutes(f.endTime) || 0) < (timeToMinutes(minEnd) || 0) ? minEnd : f.endTime })); }}>
                          <option value="">Select time</option>
                          {internalStartTimeOptions.map(t => <option key={t} value={t}>{formatTimeOptionLabel(t)}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">End Time *</label>
                      <div className="relative">
                        <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={internalBookingForm.endTime} onChange={e => setInternalBookingForm(f => ({ ...f, endTime: e.target.value }))}>
                          <option value="">Select time</option>
                          {buildTimeOptions(internalBookingForm.startTime ? minutesToTimeString((timeToMinutes(internalBookingForm.startTime) || 0) + BOOKING_MIN_DURATION_MINUTES) : minutesToTimeString(BOOKING_DAY_START_MINUTES + BOOKING_MIN_DURATION_MINUTES), BOOKING_DAY_END).map(t => <option key={t} value={t}>{formatTimeOptionLabel(t)}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Availability feedback */}
                {internalBookingForm.roomName && internalBookingForm.date && (
                  <>
                    {!internalBookingTimeValidation.valid && (
                      <div className="p-4 bg-red-50 rounded-2xl flex items-start gap-3 border border-red-100">
                        <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                        <p className="text-[13px] text-red-800 font-pmedium">{internalBookingTimeValidation.reason}</p>
                      </div>
                    )}
                    {internalBookingTimeValidation.valid && internalRoomDayStatus === 'available' && !internalBookingForm.startTime && (
                      <div className="p-4 bg-emerald-50 rounded-2xl flex items-start gap-3 border border-emerald-100">
                        <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                        <p className="text-[13px] text-emerald-800 font-pmedium">Room is fully available on this date. Choose a time slot.</p>
                      </div>
                    )}
                    {internalBookingTimeValidation.valid && internalRoomDayStatus === 'partial' && !internalBookingForm.startTime && (
                      <div className="p-4 bg-amber-50 rounded-2xl flex items-start gap-3 border border-amber-100">
                        <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                        <p className="text-[13px] text-amber-800 font-pmedium">This room has some bookings on that date. Choose an open time slot.</p>
                      </div>
                    )}
                    {internalBookingTimeValidation.valid && internalRoomDayStatus === 'full' && !internalBookingForm.startTime && (
                      <div className="p-4 bg-red-50 rounded-2xl flex items-start gap-3 border border-red-100">
                        <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                        <p className="text-[13px] text-red-800 font-pmedium">No slots available for this room on the selected date.</p>
                      </div>
                    )}
                    {internalBookingTimeValidation.valid && internalBookingAvailability === 'available' && (
                      <div className="p-4 bg-emerald-50 rounded-2xl flex items-start gap-3 border border-emerald-100">
                        <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                        <p className="text-[13px] text-emerald-800 font-pmedium">Room is available for the selected slot.</p>
                      </div>
                    )}
                    {internalBookingTimeValidation.valid && internalBookingAvailability === 'conflict' && (
                      <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                        <div className="flex items-start gap-3 mb-2">
                          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                          <p className="text-[13px] text-red-800 font-pmedium">Time conflict — this slot is already booked.</p>
                        </div>
                        {internalBookingSuggestions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-[11px] font-pmedium text-red-700 uppercase tracking-widest mb-2">Available slots for selected duration:</p>
                            <div className="flex flex-wrap gap-2">
                              {internalBookingSuggestions.map((slot: any) => (
                                <button
                                  key={`${slot.start}-${slot.end}`}
                                  type="button"
                                  onClick={() => setInternalBookingForm(f => ({ ...f, startTime: slot.start, endTime: slot.end }))}
                                  className="px-3 py-1.5 rounded-full bg-white border border-red-200 text-[11px] font-pmedium text-red-700 hover:bg-red-100 transition-colors"
                                >
                                  {formatTimeOptionLabel(slot.start)} — {formatTimeOptionLabel(slot.end)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {internalBookingSuggestions.length === 0 && (
                          <p className="text-[12px] font-pmedium text-red-700 mt-1">No available slots found for this duration on this day.</p>
                        )}
                      </div>
                    )}
                    {internalBookingTimeValidation.valid && internalBookingAvailability === 'full' && (
                      <div className="p-4 bg-red-50 rounded-2xl flex items-start gap-3 border border-red-100">
                        <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                        <p className="text-[13px] text-red-800 font-pmedium">Room is fully booked for this date. Please choose another date.</p>
                      </div>
                    )}
                  </>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                    <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0"><Users size={16} /></span>
                    <span className="text-[12px] font-pmedium uppercase tracking-[0.16em] text-slate-900">Details & Guests</span>
                  </div>

                {/* Purpose */}
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Purpose / Agenda</label>
                  <input type="text" placeholder="e.g. Q3 Review, Team Sync, Planning..." className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all" value={internalBookingForm.purpose} onChange={e => setInternalBookingForm(f => ({ ...f, purpose: e.target.value }))} />
                </div>

                {/* Invite Participants */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-px w-8 bg-slate-100" />
                      <span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Invite Participants</span>
                    </div>
                    {(() => {
                      const cap = getRoomCapacity(internalBookingForm.roomName);
                      const maxInvites = cap ? Math.max(0, Number(cap) - 1) : null;
                      return maxInvites !== null ? (
                        <span className={`text-[11px] font-pmedium ${internalBookingForm.inviteParticipantIds.length >= maxInvites ? 'text-rose-500' : 'text-[#2563EB]'}`}>
                          {internalBookingForm.inviteParticipantIds.length} / {maxInvites} seats
                        </span>
                      ) : (
                        <span className="text-[11px] font-pmedium text-[#2563EB]">{internalBookingForm.inviteParticipantIds.length} selected</span>
                      );
                    })()}
                  </div>
                  {(() => {
                    const cap = getRoomCapacity(internalBookingForm.roomName);
                    const maxInvites = cap ? Math.max(0, Number(cap) - 1) : null;
                    return (
                      <>
                        {internalBookingForm.roomName && cap && Number(cap) <= 1 && (
                          <p className="text-[11px] font-pmedium text-amber-600">This room seats 1 — no additional participants can be invited.</p>
                        )}
                        {internalBookingForm.roomName && cap && (
                          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-2.5 text-[12px] font-pmedium text-blue-800 flex items-center justify-between">
                            <span>Capacity: <strong>{cap}</strong> seats</span>
                            <span>Invite slots left: <strong>{Math.max(0, Number(cap) - 1 - internalBookingForm.inviteParticipantIds.length)}</strong></span>
                          </div>
                        )}
                        <div className="max-h-64 overflow-y-auto space-y-4 pr-1">
                          {!internalBookingForm.bookedForUserId ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-[12px] font-pmedium text-slate-400">
                              Select a member above to see eligible participants.
                            </div>
                          ) : internalBookingEligibleParticipants.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-[12px] font-pmedium text-slate-400">
                              No inviteable participants found in this department.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {internalBookingEligibleParticipants.map((member: any) => {
                                const memberId = resolveMemberUserId(member);
                                const checked = internalBookingForm.inviteParticipantIds.includes(memberId);
                                const atCapacity = maxInvites !== null && internalBookingForm.inviteParticipantIds.length >= maxInvites;
                                const disabled = !checked && atCapacity;
                                const memberRole = normalize(member.role || '');
                                const isManagement = memberRole === 'owner' || memberRole === 'founder' || memberRole === 'super_admin' || memberRole === 'super-admin' || memberRole === 'admin';
                                const sublabel = isManagement
                                  ? formatInviteGroupLabel(member.role)
                                  : ((member as any).departments?.[0] || (member as any).department || formatInviteGroupLabel(member.role || 'Member'));
                                return (
                                  <label
                                    key={memberId}
                                    className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                                      disabled
                                        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                                        : checked
                                        ? 'border-[#2563EB] bg-blue-50 cursor-pointer'
                                        : 'border-slate-200 bg-white hover:bg-slate-50 cursor-pointer'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={disabled}
                                      onChange={() => !disabled && setInternalBookingForm(f => ({
                                        ...f,
                                        inviteParticipantIds: checked
                                          ? f.inviteParticipantIds.filter(id => id !== memberId)
                                          : [...f.inviteParticipantIds, memberId],
                                      }))}
                                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                                    />
                                    <div className="min-w-0">
                                      <p className="text-[13px] font-pmedium text-[#0F172A] truncate">{resolveMemberName(member) || (member as any).email || 'Member'}</p>
                                      <p className="text-[11px] font-pmedium text-slate-500">{sublabel}</p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Notes (Optional)</label>
                  <textarea rows={2} placeholder="Any additional context..." className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all resize-none" value={internalBookingForm.notes} onChange={e => setInternalBookingForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-white border-t border-slate-100 shrink-0 flex gap-3">
                <button type="button" onClick={() => setShowInternalBookingDialog(false)} className="flex-1 px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all">
                  Cancel
                </button>
                <button type="button" disabled={isSavingInternalBooking || !internalBookingForm.bookedForUserId || !internalBookingForm.roomName || !internalBookingForm.date || !internalBookingForm.startTime || !internalBookingForm.endTime || internalBookingAvailability === 'conflict' || internalBookingAvailability === 'full' || !internalBookingTimeValidation.valid} onClick={(e: any) => handleSubmitInternalBooking(e)} className="flex-1 px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  {isSavingInternalBooking ? 'Booking...' : 'Confirm Internal Booking'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --------- TENANT BOOKING DIALOG --------- */}
      <AnimatePresence>
        {showTenantBookingDialog && (
          <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowTenantBookingDialog(false); setTenantBookingError(''); }} className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-[32px] md:rounded-[32px] w-full md:max-w-4xl max-h-[92vh] md:max-h-[88vh] shadow-2xl relative z-[90] flex flex-col overflow-hidden font-pmedium"
            >
              <div className="w-full flex justify-center py-3 md:hidden"><div className="w-12 h-1.5 bg-slate-200 rounded-full" /></div>

              {/* Header */}
              <div className="px-6 py-4 md:p-8 flex justify-between items-start gap-4 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
                <div>
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">New Booking</p>
                  <h2 className="mt-1 text-xl md:text-2xl font-pmedium text-primary tracking-tight">Tenant Booking</h2>
                  <p className="text-[11px] font-pmedium text-slate-400 uppercase tracking-widest mt-1">Book a meeting room for a tenant company</p>
                </div>
                <button type="button" onClick={() => { setShowTenantBookingDialog(false); setTenantBookingError(''); }} className="w-10 h-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors shadow-sm border border-slate-200">
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-5 md:py-8 space-y-5 overflow-y-auto flex-1 bg-slate-50/30">
                {tenantBookingError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-pmedium text-red-600">{tenantBookingError}</div>
                )}

                {/* Tenant Company Selection */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                    <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Building2 size={16} /></span>
                    <span className="text-[12px] font-pmedium uppercase tracking-[0.16em] text-slate-900">Select Tenant Company</span>
                  </div>
                  {isLoadingTenants ? (
                    <div className="py-8 text-center text-xs font-pmedium text-slate-400">Loading tenant companies...</div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Company *</label>
                      <div className="relative">
                        <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={tenantBookingForm.tenantCompanyId} onChange={e => {
                          const selected = tenantCompanies.find(t => String(t.recordId || t._id) === e.target.value);
                          setTenantBookingForm(f => ({ ...f, tenantCompanyId: e.target.value, tenantCompanyName: selected?.companyName || selected?.name || '', inviteParticipantIds: [], attendees: 1 }));
                        }}>
                          <option value="">-- Choose a Company --</option>
                          {tenantCompanies.filter(t => (t as any).status === 'Active' || !Object.prototype.hasOwnProperty.call(t, 'status')).map(t => (
                            <option key={String(t.recordId || t._id)} value={String(t.recordId || t._id)}>{t.companyName || t.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                      </div>
                    </div>
                  )}
                </div>


                {/* Room Selection */}
                {tenantBookingForm.tenantCompanyId && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                      <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0"><CalIcon size={16} /></span>
                      <span className="text-[12px] font-pmedium uppercase tracking-[0.16em] text-slate-900">Room Selection</span>
                    </div>
                    {(() => {
                      const activeRooms = roomCatalog.filter(r => isActiveRoom(r) && isMeetingCalendarRoom(r));
                      const roomTypes = [...new Set(activeRooms.map(r => r.type).filter(Boolean))];
                      const floors = [...new Set(activeRooms.filter(r => !tenantBookingForm.roomType || r.type === tenantBookingForm.roomType).map(r => r.floor).filter(Boolean))];
                      const hasWings = activeRooms.some(r => (!tenantBookingForm.floor || r.floor === tenantBookingForm.floor) && Boolean(r.wing));
                      const wings = [...new Set(activeRooms.filter(r => (!tenantBookingForm.roomType || r.type === tenantBookingForm.roomType) && (!tenantBookingForm.floor || r.floor === tenantBookingForm.floor)).map(r => r.wing).filter(Boolean))];
                      const filteredRooms = activeRooms.filter(r => (!tenantBookingForm.roomType || r.type === tenantBookingForm.roomType) && (!tenantBookingForm.floor || r.floor === tenantBookingForm.floor) && (!tenantBookingForm.wing || !r.wing || r.wing === tenantBookingForm.wing));
                      return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                              <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Room Type</label>
                              <div className="relative">
                                <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={tenantBookingForm.roomType} onChange={e => setTenantBookingForm(f => ({ ...f, roomType: e.target.value, floor: '', wing: '', roomName: '' }))}>
                                  <option value="">Select room type</option>
                                  {roomTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Floor</label>
                              <div className="relative">
                                <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={tenantBookingForm.floor} onChange={e => setTenantBookingForm(f => ({ ...f, floor: e.target.value, wing: '', roomName: '' }))}>
                                  <option value="">Select floor</option>
                                  {floors.map(floor => <option key={floor} value={floor}>{floor}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                              </div>
                            </div>
                            {hasWings && (
                              <div className="space-y-2">
                                <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Wing (Optional)</label>
                                <div className="relative">
                                  <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={tenantBookingForm.wing} onChange={e => setTenantBookingForm(f => ({ ...f, wing: e.target.value, roomName: '' }))}>
                                    <option value="">Any wing</option>
                                    {wings.map(wing => <option key={wing} value={wing}>{wing}</option>)}
                                  </select>
                                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                </div>
                              </div>
                            )}
                            <div className={`space-y-2${hasWings ? '' : ' md:col-span-2'}`}>
                              <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Meeting Room *</label>
                              <div className="relative">
                                <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={tenantBookingForm.roomName} onChange={e => setTenantBookingForm(f => ({ ...f, roomName: e.target.value }))}>
                                  <option value="">-- Choose a Room --</option>
                                  {filteredRooms.map(room => <option key={room.name} value={room.name}>{room.name}{room.floor ? `  Floor ${room.floor}` : ''}{room.wing ? `  Wing ${room.wing}` : ''}{room.capacity ? `  ${room.capacity} seats` : ''}</option>)}
                                  {filteredRooms.length === 0 && <option value="" disabled>No rooms match your filters</option>}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                    
                    {/* Room Summary Cards */}
                    {tenantBookingForm.roomName && (() => {
                      const room = roomCatalog.find(r => r.name === tenantBookingForm.roomName);
                      if (!room) return null;
                      const inviteeLimit = Math.max(0, Number(room.capacity || 0));
                      const remainingSlots = Math.max(0, inviteeLimit - tenantBookingForm.inviteParticipantIds.length);
                      const selectedCompany = tenantCompanies.find(t => String(t.recordId || t._id) === tenantBookingForm.tenantCompanyId);
                      
                      const startMinutes = timeToMinutes(tenantBookingForm.startTime);
                      const endMinutes = timeToMinutes(tenantBookingForm.endTime);
                      let selectedRoomCreditEstimate = 0;
                      if (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) {
                        const durationHours = (endMinutes - startMinutes) / 60;
                        const rate = Number(room.credits || 0);
                        selectedRoomCreditEstimate = Number((durationHours * rate).toFixed(2));
                      }
                      
                      const companyCreditsRemaining = Number(
                        ((selectedCompany as any)?.creditsRemaining ?? (selectedCompany as any)?.addOnCredits?.remainingCredits ?? Math.max(0, Number((selectedCompany as any)?.creditsAllocated || 0) - Number((selectedCompany as any)?.creditsUsed || 0))) || 0
                      );

                      return (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                            <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400 mb-0.5">Capacity</p>
                            <p className="text-base font-pmedium text-slate-900 flex items-center gap-1.5"><Users size={14} className="text-blue-600" /> {room.capacity || 0} people</p>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                            <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400 mb-0.5">Invite Slots</p>
                            <p className="text-base font-pmedium text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={14} /> {remainingSlots} {remainingSlots === 1 ? 'Slot' : 'Slots'}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                            <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400 mb-0.5">Remaining Credits</p>
                            <p className="text-base font-pmedium text-indigo-700 flex items-center gap-1.5"><Clock size={14} className="text-indigo-600" /> {companyCreditsRemaining.toFixed(2)} CR</p>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                            <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400 mb-0.5">Estimated Credits</p>
                            <p className="text-base font-pmedium text-slate-900 flex items-center gap-1.5"><Clock size={14} className="text-indigo-600" />{selectedRoomCreditEstimate.toFixed(2)} CR</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Date & Time */}
                {tenantBookingForm.tenantCompanyId && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                      <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0"><Clock size={16} /></span>
                      <span className="text-[12px] font-pmedium uppercase tracking-[0.16em] text-slate-900">Timing & Guests</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Date *</label>
                        <input type="date" min={todayStr} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm transition-all" value={tenantBookingForm.date} onChange={e => setTenantBookingForm(f => ({ ...f, date: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Start Time *</label>
                        <div className="relative">
                          <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={tenantBookingForm.startTime} onChange={e => { const nextStart = e.target.value; const minEnd = minutesToTimeString((timeToMinutes(nextStart) || 0) + BOOKING_MIN_DURATION_MINUTES); setTenantBookingForm(f => ({ ...f, startTime: nextStart, endTime: !f.endTime || (timeToMinutes(f.endTime) || 0) < (timeToMinutes(minEnd) || 0) ? minEnd : f.endTime })); }}>
                            <option value="">Select time</option>
                            {tenantStartTimeOptions.map(t => <option key={t} value={t}>{formatTimeOptionLabel(t)}</option>)}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">End Time *</label>
                        <div className="relative">
                          <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={tenantBookingForm.endTime} onChange={e => setTenantBookingForm(f => ({ ...f, endTime: e.target.value }))}>
                            <option value="">Select time</option>
                            {tenantEndTimeOptions.map(t => <option key={t} value={t}>{formatTimeOptionLabel(t)}</option>)}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Attendees</label>
                        <input type="number" min="1" className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all" value={tenantBookingForm.attendees} onChange={e => setTenantBookingForm(f => ({ ...f, attendees: Number(e.target.value) }))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Purpose</label>
                        <input type="text" placeholder="Client meeting, board meeting..." className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all" value={tenantBookingForm.purpose} onChange={e => setTenantBookingForm(f => ({ ...f, purpose: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Notes (Optional)</label>
                      <textarea rows={2} placeholder="Any internal notes or requirements..." className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all resize-none" value={tenantBookingForm.notes} onChange={e => setTenantBookingForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>

                    {/* Invite Employees */}
                    {(() => {
                      const selectedCompany = tenantCompanies.find(t => String(t.recordId || t._id) === tenantBookingForm.tenantCompanyId);
                      const employees = (selectedCompany as any)?.employees || [];
                      const room = roomCatalog.find(r => r.name === tenantBookingForm.roomName);
                      const maxCapacity = room ? Number(room.capacity || 0) : 0;
                      const remainingSlots = Math.max(0, maxCapacity - tenantBookingForm.inviteParticipantIds.length);
                      
                      return employees.length > 0 ? (
                        <div className="space-y-4 pt-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="h-px w-8 bg-slate-100" />
                              <span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Invite Employees</span>
                            </div>
                            <span className="text-[11px] font-pmedium text-[#2563EB]">{tenantBookingForm.inviteParticipantIds.length} selected</span>
                          </div>
                          
                          {maxCapacity > 0 && remainingSlots <= 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2">
                              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                              <span className="text-[11px] font-pmedium text-amber-700">Invite limit reached. Select a bigger room with more capacity to invite more members.</span>
                            </div>
                          )}

                          <div className="max-h-64 overflow-y-auto space-y-4 pr-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {employees.map((emp: any) => {
                                // Prefer the ObjectId the backend can resolve (HostUser ref `userId`
                                // or the TenantEmployee `_id`). `emp.id` is a non-ObjectId business id
                                // (e.g. "TE-..."), which resolveInvites filters out, silently dropping
                                // the invite.
                                const empId = String(emp.userId || emp._id || emp.id);
                                const checked = tenantBookingForm.inviteParticipantIds.includes(empId);
                                const empName = emp.name || emp.fullName || emp.email || 'Employee';
                                const isDisabled = !checked && maxCapacity > 0 && remainingSlots <= 0;
                                
                                return (
                                  <label key={empId} className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${checked ? 'border-[#2563EB] bg-blue-50 cursor-pointer' : isDisabled ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed' : 'border-slate-200 bg-white hover:bg-slate-50 cursor-pointer'}`}>
                                    <input type="checkbox" disabled={isDisabled} checked={checked} onChange={() => setTenantBookingForm(f => ({ ...f, inviteParticipantIds: checked ? f.inviteParticipantIds.filter(id => id !== empId) : [...f.inviteParticipantIds, empId], attendees: checked ? Math.max(1, f.attendees - 1) : f.attendees + 1 }))} className="mt-1 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] disabled:opacity-50" />
                                    <div className="min-w-0">
                                      <p className="text-[13px] font-pmedium text-[#0F172A] truncate">{empName}</p>
                                      <p className="text-[11px] font-pmedium text-slate-500">{emp.designation || emp.role || 'Member'}</p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-4">
                          <div className="flex items-center gap-2">
                            <div className="h-px w-8 bg-slate-100" />
                            <span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Contact Details</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="space-y-2">
                              <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Booked By Name</label>
                              <input type="text" placeholder="Contact person" className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all" value={tenantBookingForm.bookedByName} onChange={e => setTenantBookingForm(f => ({ ...f, bookedByName: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Email</label>
                              <input type="email" placeholder="email@company.com" className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all" value={tenantBookingForm.bookedByEmail} onChange={e => setTenantBookingForm(f => ({ ...f, bookedByEmail: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Phone</label>
                              <input type="tel" placeholder="+91..." className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all" value={tenantBookingForm.bookedByPhone} onChange={e => setTenantBookingForm(f => ({ ...f, bookedByPhone: e.target.value }))} />
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="p-3 sm:p-4 bg-white border-t border-slate-100 shrink-0 flex gap-3">
                <button type="button" onClick={() => { setShowTenantBookingDialog(false); setTenantBookingError(''); }} className="flex-1 px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all">
                  Cancel
                </button>
                <button type="button" disabled={isSavingTenantBooking || !tenantBookingForm.tenantCompanyId || !tenantBookingForm.roomName || !tenantBookingForm.date || !tenantBookingForm.startTime || !tenantBookingForm.endTime} onClick={(e: any) => handleSubmitTenantBooking(e)} className="flex-1 px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  {isSavingTenantBooking ? 'Booking...' : 'Confirm Tenant Booking'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --------- NEW EXTERNAL BOOKING DIALOG (Task 17) --------- */}
      <ExternalBookingDialog
        open={showNewExternalBookingDialog}
        onClose={() => setShowNewExternalBookingDialog(false)}
        roomCatalog={roomCatalog}
        allBookings={allBookings}
        workspaceId={workspaceId}
        managerName={managerProfile.name}
        onSuccess={reloadBookings}
      />

    </div>
  );
}
