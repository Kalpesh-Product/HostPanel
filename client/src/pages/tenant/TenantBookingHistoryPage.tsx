import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  History,
  MapPin,
  RefreshCw,
  Send,
  Users,
  XCircle,
} from 'lucide-react';
import PageFrame from '@/components/Pages/PageFrame';
import { TablePageSkeleton } from '@/components/ui/Skeleton';
import WebsiteFormField from '@/components/WebsiteFormField';
import { formatTime12h } from '@/utils/time';
import { getStoredTenantCompanyId, getStoredTenantCompanyName, getStoredUser } from '@/lib/auth-session';
import { getStoredTenantRole, isTenantAdminRole, isTenantManagerRole } from '@/lib/tenant-session';
import { getMyTenantCompany } from '@/services/tenant-companies';
import { getMeetingRoomBookings, respondToMeetingRoomInvite, updateMeetingRoomBooking, cancelBooking } from '@/services/meeting-room-bookings';
import useBusinessHours from '@/hooks/useBusinessHours';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { getWorkspaceDateKey, getWorkspaceTime } from '@/lib/workspaceLocalization';
import { statusPillClass } from '../../lib/status-pill';

const BOOKING_SLOT_STEP_MINUTES = 5;
const BOOKING_MIN_DURATION_MINUTES = 30;

const MAIN_TABS = [
  { key: 'my', label: 'My Bookings' },
  { key: 'invites', label: 'Invites' },
];
const MANAGER_TAB = { key: 'company', label: 'Company View' };

const SUB_TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
];

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeId(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function timeToMinutes(value: unknown): number | null {
  const str = String(value ?? '');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(str)) return null;
  const [hours, minutes] = str.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTimeString(totalMinutes = 0): string {
  const bounded = Math.max(0, Math.min(24 * 60, Number(totalMinutes || 0)));
  const hours = Math.floor(bounded / 60);
  const minutes = bounded % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function isTimeOverlap(existingStart: number, existingEnd: number, incomingStart: number, incomingEnd: number): boolean {
  return incomingStart < existingEnd && incomingEnd > existingStart;
}

function getBookingScheduleAvailability(bookings: Record<string, any>[] = [], targetBooking: Record<string, any> = {}, ignoreRecordId = '') {
  const roomName = normalizeId(targetBooking?.roomName || '');
  const date = normalizeId(targetBooking?.date || '');
  const startMinutes = timeToMinutes(targetBooking?.startTime || targetBooking?.checkIn || '');
  const endMinutes = timeToMinutes(targetBooking?.endTime || targetBooking?.checkOut || '');
  if (!roomName || !date || startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return { available: false, reason: 'Choose a valid room, date, and time window.', conflict: null as Record<string, any> | null };
  }
  const conflict = bookings.find((booking) => {
    const bookingId = normalizeId(booking?.recordId || booking?.id || '');
    if (ignoreRecordId && bookingId === normalizeId(ignoreRecordId)) return false;
    if (normalizeId(booking?.roomName || '') !== roomName) return false;
    if (normalizeId(booking?.date || '') !== date) return false;
    const bookingStatus = normalizeId(booking?.status || booking?.bookingStatus);
    if (bookingStatus === 'cancelled' || bookingStatus === 'rescheduled') return false;
    const bStart = timeToMinutes(booking?.startTime || booking?.checkIn || '');
    const bEnd = timeToMinutes(booking?.endTime || booking?.checkOut || '');
    if (bStart === null || bEnd === null) return false;
    return isTimeOverlap(bStart, bEnd, startMinutes, endMinutes);
  });
  if (conflict) return { available: false, reason: `Room is already booked by ${conflict.bookedByName || 'another tenant'} for that time window.`, conflict };
  return { available: true, reason: 'This room is available for the selected time window.', conflict: null };
}

function getCurrentUserId(user: Record<string, any>): string {
  return normalizeId(user?.id || user?._id || user?.recordId || '');
}

function getCurrentUserName(user: Record<string, any>): string {
  return normalizeText(user?.fullName || user?.name || user?.email || '');
}

function extractList(payload: any, keys: string[] = []): any[] {
  if (!payload) return [];
  for (const key of keys) { if (Array.isArray(payload[key])) return payload[key]; }
  if (payload.data && typeof payload.data === 'object') {
    for (const key of keys) { if (Array.isArray(payload.data[key])) return payload.data[key]; }
    if (Array.isArray(payload.data.items)) return payload.data.items;
  }
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

function formatDateLabel(value: string): string {
  if (!value) return 'N/A';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}

function formatBookingWindow(booking: Record<string, any>): string {
  const dl = formatDateLabel(booking?.date);
  const st = formatTime12h(booking?.checkIn || booking?.startTime || '');
  const et = formatTime12h(booking?.checkOut || booking?.endTime || '');
  return `${dl} ${st}${et ? ` - ${et}` : ''}`;
}

function toBookingSortKey(booking: Record<string, any>): number {
  const dv = booking?.date || '';
  const st = booking?.startTime || booking?.checkIn || '00:00';
  const pv = new Date(`${dv}T${st}:00`);
  return Number.isNaN(pv.getTime()) ? 0 : pv.getTime();
}

function isFutureBooking(booking: Record<string, any>): boolean {
  const sk = toBookingSortKey(booking);
  if (!sk) return false;
  const s = normalizeId(booking?.status || booking?.bookingStatus);
  return s !== 'cancelled' && s !== 'completed' && sk >= Date.now();
}

function isPastBooking(booking: Record<string, any>): boolean {
  const sk = toBookingSortKey(booking);
  const s = normalizeId(booking?.status || booking?.bookingStatus);
  return s === 'cancelled' || s === 'completed' || (sk > 0 && sk < Date.now());
}

function isMyBooking(booking: Record<string, any>, currentUserId: string, currentUserName: string, currentUserEmail = ''): boolean {
  const bName = normalizeId(booking?.bookedByName || '').replace(/\s*\((manager|employee|owner)\)\s*$/i, '');
  const uName = normalizeId(currentUserName || '').replace(/\s*\((manager|employee|owner)\)\s*$/i, '');
  return Boolean(
    booking?.isMe ||
    normalizeId(booking?.bookedByUserId || '') === currentUserId ||
    bName === uName ||
    normalizeId(booking?.bookedByEmail || '') === currentUserEmail,
  );
}

function isAcceptedInviteForUser(booking: Record<string, any>, currentUserId: string, currentUserEmail = ''): boolean {
  const invite = getInviteForUser(booking, currentUserId, currentUserEmail);
  return Boolean(invite && normalizeId(invite.status) === 'accepted');
}

function getInviteForUser(booking: Record<string, any>, currentUserId: string, currentUserEmail = ''): Record<string, any> | null {
  const invites = Array.isArray(booking?.invites) ? booking.invites : [];
  return invites.find((i: Record<string, any>) =>
    normalizeId(i?.invitedUserId || '') === currentUserId ||
    normalizeId(i?.invitedEmail || '') === currentUserEmail
  ) || null;
}

function matchesTenantBookingScope(booking: Record<string, any>, tenantCompanyId: string, tenantCompanyName: string, currentUserId: string, currentUserName: string, currentUserEmail: string): boolean {
  if (normalizeId(booking?.bookingType) !== 'tenant') return false;
  const bcId = normalizeId(booking?.bookedByTenantCompanyId || booking?.roomAssignedTenantCompanyId || '');
  const bcName = normalizeId(booking?.bookedByTenantCompanyName || booking?.roomAssignedTenantCompanyName || booking?.clientCompany || '');
  const invite = getInviteForUser(booking, currentUserId, currentUserEmail);
  return Boolean(
    (tenantCompanyId && bcId === tenantCompanyId) ||
    (tenantCompanyName && bcName === tenantCompanyName) ||
    isMyBooking(booking, currentUserId, currentUserName, currentUserEmail) ||
    Boolean(invite && normalizeId(invite.status) === 'accepted'),
  );
}

function getLiveBookingStatus(booking: Record<string, any>): string {
  const status = normalizeId(booking?.status || booking?.bookingStatus);
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'completed') return 'Completed';
  const startSortKey = toBookingSortKey(booking);
  if (!startSortKey) return status === 'reschedules' ? 'Reschedules' : 'Booked';
  const endDate = new Date(`${booking?.date || ''}T${booking?.endTime || booking?.checkOut || '23:59'}:00`);
  if (!Number.isNaN(endDate.getTime()) && Date.now() >= endDate.getTime()) return 'Completed';
  const startDate = new Date(`${booking?.date || ''}T${booking?.startTime || booking?.checkIn || ''}:00`);
  if (!Number.isNaN(startDate.getTime()) && Date.now() >= startDate.getTime()) return 'In Progress';
  return 'Booked';
}

function getStatusBadge(status: string) {
  return <span className={statusPillClass(status)}>{normalizeText(status) || 'Booked'}</span>;
}

function getInviteBadge(status: string) {
  return <span className={statusPillClass(`invite ${status}`)}>{`Invite ${normalizeText(status) || 'Pending'}`}</span>;
}

function formatTimeOptionLabel(value: string): string {
  return formatTime12h(value) || value;
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

function roundUpToStepTime(value: string, stepMinutes = BOOKING_SLOT_STEP_MINUTES): string {
  const totalMinutes = timeToMinutes(value);
  if (totalMinutes === null) return '';
  const roundedMinutes = Math.ceil(totalMinutes / stepMinutes) * stepMinutes;
  if (roundedMinutes >= 24 * 60) return '23:55';
  return minutesToTimeString(roundedMinutes);
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

function parseFloorFromLocation(location: string): string {
  const match = String(location || '').match(/Floor\s+(\d+)/i);
  return match ? match[1] : '';
}

function parseWingFromLocation(location: string): string {
  const match = String(location || '').match(/Wing\s+(\w+)/i);
  return match ? match[1] : '';
}

export default function TenantBookingHistoryPage() {
  const currentUser = getStoredUser() || {};
  const userRole = currentUser?.tenantRole || getStoredTenantRole() || 'tenant-employee';
  const canManageTenant = isTenantAdminRole(userRole) || isTenantManagerRole(userRole);
  const currentUserId = getCurrentUserId(currentUser);
  const currentUserName = getCurrentUserName(currentUser);
  const currentUserEmail = normalizeId(currentUser?.email || '');
  const tenantCompanyName = currentUser?.tenantCompanyName || currentUser?.workspaceMembership?.tenantCompanyName || getStoredTenantCompanyName() || 'Tenant Workspace';
  const tenantCompanyId = normalizeId(currentUser?.tenantCompanyId || currentUser?.workspaceMembership?.tenantCompanyId || getStoredTenantCompanyId() || '');
  const storedWorkspaceId = normalizeId(currentUser?.primaryWorkspace || currentUser?.workspaceMembership?.workspaceId || currentUser?.workspaceId || '');
  const normalizedTenantCompanyName = normalizeId(tenantCompanyName);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [bookings, setBookings] = useState<Record<string, any>[]>([]);
  const [mainTab, setMainTab] = useState('my');
  const [subTab, setSubTab] = useState('upcoming');
  const [selectedBooking, setSelectedBooking] = useState<Record<string, any> | null>(null);
  const [cancelModal, setCancelModal] = useState<Record<string, any> | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [declineModal, setDeclineModal] = useState<Record<string, any> | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [rescheduleModal, setRescheduleModal] = useState<Record<string, any> | null>(null);
  const [extendModal, setExtendModal] = useState<Record<string, any> | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({ roomName: '', date: '', startTime: '', endTime: '', purpose: '' });
  const [rescheduleFieldErrors, setRescheduleFieldErrors] = useState<Record<string, string>>({});
  const [extendMinutes, setExtendMinutes] = useState('30');
  const [tenantCompanies, setTenantCompanies] = useState<Record<string, any>[]>([]);
  const [rescheduleInviteeOptions, setRescheduleInviteeOptions] = useState<any[]>([]);
  const [rescheduleInviteeIds, setRescheduleInviteeIds] = useState<string[]>([]);
  const [isRescheduleInviteesLoading, setIsRescheduleInviteesLoading] = useState(false);

  const currentCompany = useMemo(() => {
    if (!Array.isArray(tenantCompanies) || tenantCompanies.length === 0) return null;
    const matched = tenantCompanies.find((company) => {
      const recordId = normalizeId(company?.recordId || company?.id || '');
      const companyId = normalizeId(company?.tenantCompanyId || company?.tenantId || '');
      const companyName = normalizeId(company?.companyName || '');
      return (tenantCompanyId && recordId === tenantCompanyId) || (tenantCompanyId && companyId === tenantCompanyId) || (normalizedTenantCompanyName && companyName === normalizedTenantCompanyName);
    });
    return matched || tenantCompanies[0] || null;
  }, [normalizedTenantCompanyName, tenantCompanyId, tenantCompanies]);

  const companyCreditsRemaining = Number(
    currentCompany?.creditsRemaining ?? currentCompany?.addOnCredits?.remainingCredits ??
    Math.max(0, Number(currentCompany?.creditsAllocated || 0) - Number(currentCompany?.creditsUsed || 0)),
  );

  // Tenant logins have no primaryWorkspace — resolve the host workspace from
  // the tenant-company payload so workspace-scoped fetches actually work.
  const [workspaceId, setWorkspaceId] = useState<string>(storedWorkspaceId);

  const loadBookings = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const companiesResponse = await getMyTenantCompany().catch(() => null);
      const company = companiesResponse?.data?.tenant || null;
      setTenantCompanies(company ? [company] : []);

      const resolvedWorkspaceId = workspaceId || normalizeId(company?.workspaceId || '');
      if (!workspaceId && resolvedWorkspaceId) setWorkspaceId(resolvedWorkspaceId);

      if (resolvedWorkspaceId) {
        const bookingsResponse = await getMeetingRoomBookings(resolvedWorkspaceId);
        setBookings(extractList(bookingsResponse, ['bookings', 'items']));
      } else {
        setBookings([]);
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to load booking history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadBookings(); }, []);

  // Auto-clear notice after 4 seconds
  useEffect(() => {
    if (!noticeMessage) return;
    const t = setTimeout(() => setNoticeMessage(''), 4000);
    return () => clearTimeout(t);
  }, [noticeMessage]);

  // Periodic refresh for real-time updates
  useEffect(() => {
    if (!workspaceId) return;
    const interval = setInterval(() => { loadBookings(); }, 30000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  const tenantBookings = useMemo(() => {
    return bookings.filter((b) => matchesTenantBookingScope(b, tenantCompanyId, normalizedTenantCompanyName, currentUserId, currentUserName, currentUserEmail));
  }, [bookings, currentUserId, currentUserName, currentUserEmail, normalizedTenantCompanyName, tenantCompanyId]);

  const myBookings = useMemo(() => {
    return tenantBookings.filter((b) => isMyBooking(b, currentUserId, currentUserName, currentUserEmail) || isAcceptedInviteForUser(b, currentUserId, currentUserEmail));
  }, [currentUserEmail, currentUserId, currentUserName, tenantBookings]);

  const companyBookings = useMemo(() => {
    if (!canManageTenant) return myBookings;
    return tenantBookings.filter((b) => !isMyBooking(b, currentUserId, currentUserName, currentUserEmail) && !isAcceptedInviteForUser(b, currentUserId, currentUserEmail));
  }, [canManageTenant, currentUserEmail, currentUserId, currentUserName, myBookings, tenantBookings]);
  const inviteBookings = useMemo(
    () => tenantBookings.filter((b) => {
      const invite = getInviteForUser(b, currentUserId, currentUserEmail);
      if (!invite) return false;
      const inviteStatus = normalizeId(invite.status);
      return inviteStatus === 'pending' || inviteStatus === 'rejected' || inviteStatus === 'declined';
    }),
    [currentUserEmail, currentUserId, tenantBookings],
  );

  const activeScope = mainTab === 'company' ? companyBookings : mainTab === 'invites' ? inviteBookings : myBookings;

  const visibleBookings = useMemo(() => {
    return activeScope.filter((b) => {
      if (subTab === 'upcoming') return isFutureBooking(b);
      if (subTab === 'past') return isPastBooking(b) && normalizeId(b?.status || b?.bookingStatus) !== 'cancelled';
      if (subTab === 'cancelled') return normalizeId(b?.status || b?.bookingStatus) === 'cancelled';
      return true;
    }).sort((a, b) => toBookingSortKey(b) - toBookingSortKey(a));
  }, [activeScope, subTab]);

  const pendingInviteCount = inviteBookings.filter((b) => {
    const invite = getInviteForUser(b, currentUserId, currentUserEmail);
    return invite && normalizeId(invite.status) === 'pending';
  }).length;
  const upcomingCount = activeScope.filter(isFutureBooking).length;
  const pastCount = activeScope.filter((b) => isPastBooking(b) && normalizeId(b?.status || b?.bookingStatus) !== 'cancelled').length;
  const cancelledCount = activeScope.filter((b) => normalizeId(b?.status || b?.bookingStatus) === 'cancelled').length;

  const rescheduleAvailability = useMemo(() => {
    if (!rescheduleModal) return { available: false, reason: 'Choose a booking to reschedule.', conflict: null };
    return getBookingScheduleAvailability(tenantBookings, { ...rescheduleModal, ...rescheduleForm }, rescheduleModal.recordId);
  }, [rescheduleForm, rescheduleModal, tenantBookings]);

  const extendAvailability = useMemo(() => {
    if (!extendModal) return { available: false, reason: 'Choose a booking to extend.', conflict: null };
    const extraMinutes = Number(extendMinutes || 0);
    const currentEndMinutes = timeToMinutes(extendModal?.endTime || extendModal?.checkOut || '');
    const currentStartMinutes = timeToMinutes(extendModal?.startTime || extendModal?.checkIn || '');
    if (!extraMinutes || extraMinutes <= 0) return { available: false, reason: 'Choose how long to extend.', conflict: null };
    if (currentEndMinutes === null || currentStartMinutes === null || currentEndMinutes <= currentStartMinutes) return { available: false, reason: 'Invalid time window.', conflict: null };
    const nextEndMinutes = currentEndMinutes + extraMinutes;
    if (nextEndMinutes > 24 * 60) return { available: false, reason: 'Extension goes past midnight.', conflict: null };
    return getBookingScheduleAvailability(tenantBookings, { ...extendModal, endTime: minutesToTimeString(nextEndMinutes) }, extendModal.recordId);
  }, [extendModal, extendMinutes, tenantBookings]);

  const extendPreview = useMemo(() => {
    if (!extendModal) return null;
    const extra = Number(extendMinutes || 0);
    const currentEndMinutes = timeToMinutes(extendModal?.endTime || extendModal?.checkOut || '');
    if (currentEndMinutes === null || extra <= 0) return null;
    const nextEndMinutes = currentEndMinutes + extra;
    const nextEndTime = minutesToTimeString(nextEndMinutes);
    const currentCredits = Number(extendModal?.bookingCredits || 0);
    const origStartMinutes = timeToMinutes(extendModal?.startTime || extendModal?.checkIn || '');
    const origEndMinutes = currentEndMinutes;
    const origDurationHours = (origStartMinutes !== null && origEndMinutes > origStartMinutes)
      ? (origEndMinutes - origStartMinutes) / 60
      : 0;
    const ratePerHour = origDurationHours > 0 ? currentCredits / origDurationHours : 0;
    const extraCredits = Number(((extra / 60) * ratePerHour).toFixed(2));
    const newTotalCredits = Number((currentCredits + extraCredits).toFixed(2));
    return { nextEndTime, extraCredits, newTotalCredits, currentCredits };
  }, [extendModal, extendMinutes]);

  const rescheduleBookingRate = useMemo(() => {
    if (!rescheduleModal) return 0;
    const originalCredits = Number(rescheduleModal.bookingCredits || 0);
    const origStartMinutes = timeToMinutes(rescheduleModal.startTime || rescheduleModal.checkIn || '');
    const origEndMinutes = timeToMinutes(rescheduleModal.endTime || rescheduleModal.checkOut || '');
    if (!originalCredits || origStartMinutes === null || origEndMinutes === null || origEndMinutes <= origStartMinutes) return originalCredits;
    const durationHours = (origEndMinutes - origStartMinutes) / 60;
    return durationHours > 0 ? Number((originalCredits / durationHours).toFixed(2)) : originalCredits;
  }, [rescheduleModal]);

  const rescheduleNewCredits = useMemo(() => {
    if (!rescheduleModal) return 0;
    const startM = timeToMinutes(rescheduleForm.startTime);
    const endM = timeToMinutes(rescheduleForm.endTime);
    if (startM === null || endM === null || endM <= startM) return 0;
    const durationHours = (endM - startM) / 60;
    return Number((rescheduleBookingRate * durationHours).toFixed(2));
  }, [rescheduleForm.startTime, rescheduleForm.endTime, rescheduleBookingRate]);

  const rescheduleCreditDiff = useMemo(() => {
    if (!rescheduleModal) return 0;
    const originalCredits = Number(rescheduleModal.bookingCredits || 0);
    return Number((rescheduleNewCredits - originalCredits).toFixed(2));
  }, [rescheduleModal, rescheduleNewCredits]);

  const workspacePreferences = useWorkspacePreferences();
  const todayValue = getWorkspaceDateKey(new Date(), workspacePreferences.timezone);
  const currentTimeValue = getWorkspaceTime(new Date(), workspacePreferences.timezone);
  const roundedCurrentTimeValue = roundUpToStepTime(currentTimeValue);

  const businessHours = useBusinessHours();

  const rescheduleStartTimeOptions = useMemo(
    () => buildTimeOptions(
      rescheduleForm.date === todayValue
        ? getLaterTimeInputValue(roundedCurrentTimeValue, businessHours.start)
        : businessHours.start,
      minutesToTimeString(businessHours.endMinutes - BOOKING_MIN_DURATION_MINUTES),
    ),
    [rescheduleForm.date, roundedCurrentTimeValue, todayValue, businessHours.start, businessHours.endMinutes],
  );

  const rescheduleEndTimeOptions = useMemo(() => {
    const minimumEndTime = getMinimumEndTime(rescheduleForm.startTime);
    const baseMin = rescheduleForm.date === todayValue
      ? getLaterTimeInputValue(roundedCurrentTimeValue, minimumEndTime || '', businessHours.start)
      : getLaterTimeInputValue(minimumEndTime || '', businessHours.start);
    return buildTimeOptions(baseMin || businessHours.start, businessHours.end);
  }, [rescheduleForm.date, rescheduleForm.startTime, roundedCurrentTimeValue, todayValue, businessHours.start, businessHours.end, businessHours.endMinutes]);

  useEffect(() => {
    if (mainTab === 'invites' && inviteBookings.length > 0) return;
    if (mainTab === 'company' && companyBookings.length > 0) return;
    const hasUpcoming = activeScope.some(isFutureBooking);
    const hasPast = activeScope.some(isPastBooking);
    const nextSubTab = hasUpcoming ? 'upcoming' : hasPast ? 'past' : 'upcoming';
    if (visibleBookings.length === 0 && activeScope.length > 0) setSubTab(nextSubTab);
    if (!canManageTenant && myBookings.length === 0 && tenantBookings.length > 0) setMainTab('my');
  }, [activeScope, canManageTenant, companyBookings.length, inviteBookings.length, mainTab, myBookings.length, tenantBookings.length, visibleBookings.length]);

  const loadRescheduleInvitees = async (booking: Record<string, any>) => {
    setIsRescheduleInviteesLoading(true);
    try {
      const response = await getMyTenantCompany();
      const company = response?.data?.tenant || null;
      const employees = Array.isArray(company?.employees) ? company.employees : [];
      const currentUserEmailLower = (currentUser?.email || '').toLowerCase().trim();
      const mapped = employees
        .filter((emp: Record<string, any>) => emp.status === 'Active' && emp.userId && (emp.email || '').toLowerCase().trim() !== currentUserEmailLower)
        .map((emp: Record<string, any>) => ({
          userId: String(emp.userId),
          fullName: emp.name || 'Unknown',
          role: emp.tenantRole || emp.role || 'Employee',
          designation: emp.designation || '',
          status: emp.status || 'Active',
        }));
      setRescheduleInviteeOptions(mapped);
      const existingInvitees = Array.isArray(booking.invites) ? booking.invites : [];
      const preSelected = existingInvitees
        .filter((i: any) => i.status !== 'rejected' && i.status !== 'declined')
        .map((i: any) => String(i.invitedUserId || ''))
        .filter(Boolean);
      setRescheduleInviteeIds(preSelected);
    } catch {
      setRescheduleInviteeOptions([]);
      setRescheduleInviteeIds([]);
    } finally {
      setIsRescheduleInviteesLoading(false);
    }
  };

  const handleRefresh = async () => { await loadBookings(); };

  const switchMainTab = (tab: string) => { setMainTab(tab); setSubTab('upcoming'); };

  const handleAcceptInvite = async (booking: Record<string, any>) => {
    if (!booking?.recordId) return;
    setIsSaving(true); setActionError('');
    try {
      await respondToMeetingRoomInvite(booking.recordId, { status: 'accepted' });
      setNoticeMessage('Invite accepted.');
      setSelectedBooking(null);
      await loadBookings();
      setMainTab('my'); setSubTab('upcoming');
    } catch (error: any) {
      setActionError(error?.message || 'Unable to accept the invite.');
    } finally { setIsSaving(false); }
  };

  const openDeclineModal = (booking: Record<string, any>) => {
    setSelectedBooking(null);
    setDeclineModal(booking);
    setDeclineReason('');
    setActionError('');
  };

  const handleRejectInvite = async () => {
    if (!declineModal?.recordId) return;
    setIsSaving(true); setActionError('');
    try {
      await respondToMeetingRoomInvite(declineModal.recordId, { status: 'declined', reason: declineReason.trim() });
      setNoticeMessage('Invite declined.');
      setDeclineModal(null); setDeclineReason('');
      await loadBookings();
      setMainTab('invites'); setSubTab('upcoming');
    } catch (error: any) {
      setActionError(error?.message || 'Unable to decline the invite.');
    } finally { setIsSaving(false); }
  };

  const openCancelModal = (booking: Record<string, any>) => {
    setSelectedBooking(null);
    setCancelModal(booking);
    setCancelReason(booking?.cancelReason || '');
    setActionError('');
  };

  const openRescheduleModal = (booking: Record<string, any>) => {
    setSelectedBooking(null);
    setRescheduleModal(booking); setExtendModal(null);
    setRescheduleForm({ roomName: booking?.roomName || '', date: booking?.date || '', startTime: booking?.startTime || '', endTime: booking?.endTime || '', purpose: booking?.purpose || '' });
    setRescheduleFieldErrors({});
    setActionError('');
    loadRescheduleInvitees(booking);
  };
  const openExtendModal = (booking: Record<string, any>) => {
    setSelectedBooking(null);
    setExtendModal(booking); setRescheduleModal(null); setExtendMinutes('30');
    setActionError('');
  };
  const closeExtendModal = () => { setExtendModal(null); setExtendMinutes('30'); };
  const closeRescheduleModal = () => { setRescheduleModal(null); setRescheduleInviteeOptions([]); setRescheduleInviteeIds([]); setRescheduleFieldErrors({}); };
  const handleToggleRescheduleInvitee = (userId: string) => {
    setRescheduleInviteeIds((prev) => {
      const existing = Array.isArray(prev) ? prev : [];
      return existing.includes(userId)
        ? existing.filter((id) => id !== userId)
        : [...existing, userId];
    });
  };

  const handleCancelBooking = async () => {
    if (!cancelModal?.recordId) return;
    setIsSaving(true); setActionError('');
    try {
      await cancelBooking(cancelModal.recordId, cancelReason.trim() || 'Cancelled by user');
      setNoticeMessage('Booking cancelled. Credits will be refunded.');
      setCancelModal(null); setCancelReason('');
      await loadBookings();
    } catch (error: any) {
      setActionError(error?.message || 'Unable to cancel this booking.');
    } finally { setIsSaving(false); }
  };

  const handleRescheduleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!rescheduleModal?.recordId) return;
    const errors: Record<string, string> = {};
    if (!rescheduleForm.date) errors.date = 'Pick a new date.';
    else if (rescheduleForm.date < todayValue) errors.date = 'Backdated bookings are not allowed.';
    if (!rescheduleForm.startTime) errors.startTime = 'Select a start time.';
    if (!rescheduleForm.endTime) errors.endTime = 'Select an end time.';
    setRescheduleFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (!rescheduleAvailability.available) { setActionError(rescheduleAvailability.reason); return; }
    void (async () => {
      setIsSaving(true); setActionError('');
      try {
        await updateMeetingRoomBooking(rescheduleModal.recordId, {
          start: `${rescheduleForm.date}T${rescheduleForm.startTime}:00`,
          end: `${rescheduleForm.date}T${rescheduleForm.endTime}:00`,
          scheduleChangeType: 'rescheduled',
          inviteeUserIds: rescheduleInviteeIds,
        });
        setNoticeMessage('Booking rescheduled.');
        closeRescheduleModal();
        await loadBookings();
      } catch (error: any) {
        setActionError(error?.message || 'Unable to reschedule.');
      } finally { setIsSaving(false); }
    })();
  };

  const handleExtendBooking = async (event: FormEvent) => {
    event.preventDefault();
    if (!extendModal?.recordId) return;
    if (!extendAvailability.available) { setActionError(extendAvailability.reason); return; }
    const extra = Number(extendMinutes || 0);
    const extendDate = extendModal?.date || '';
    const currentEndStr = extendModal?.endTime || extendModal?.checkOut || '';
    const currentEndMin = timeToMinutes(currentEndStr);
    const nextEndMin = minutesToTimeString((currentEndMin || 0) + extra);
    const nextEndISO = `${extendDate}T${nextEndMin}:00`;
    setIsSaving(true); setActionError('');
    try {
      await updateMeetingRoomBooking(extendModal.recordId, {
        end: nextEndISO,
        scheduleChangeType: 'extended',
      });
      setNoticeMessage('Booking extended.');
      closeExtendModal();
      await loadBookings();
    } catch (error: any) {
      setActionError(error?.message || 'Unable to extend.');
    } finally { setIsSaving(false); }
  };

  if (isLoading) return <TablePageSkeleton />;

  const visibleMainTabs = canManageTenant ? [MANAGER_TAB, ...MAIN_TABS] : MAIN_TABS;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-pmedium text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ── Header ── */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h1 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Booking History
              </h1>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Track bookings, handle invites, and keep your tenant meetings in one place.
              </p>
            </div>
            <button onClick={() => void handleRefresh()} disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200/60 px-3.5 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB] disabled:opacity-60">
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-pmedium text-red-600">
              {errorMessage}
            </div>
          )}
          {noticeMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] font-pmedium text-emerald-700">
              {noticeMessage}
            </div>
          )}

          {/* ── Main Pill Tabs ── */}
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            {visibleMainTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => switchMainTab(tab.key)}
                className={`flex-1 min-w-[120px] rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
                  mainTab === tab.key ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
                {tab.key === 'invites' && pendingInviteCount > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[9px] leading-none border ${mainTab === 'invites' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{pendingInviteCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {[
              { label: 'Upcoming', value: upcomingCount, borderClass: 'border-l-4 border-l-blue-500', iconClass: 'bg-blue-50 text-blue-600', icon: <Calendar size={16} /> },
              { label: 'Past Meetings', value: pastCount, borderClass: 'border-l-4 border-l-violet-500', iconClass: 'bg-violet-50 text-violet-600', icon: <History size={16} /> },
              { label: 'Cancelled', value: cancelledCount, borderClass: 'border-l-4 border-l-red-500', iconClass: 'bg-red-50 text-red-600', icon: <XCircle size={16} /> },
              { label: 'Pending Invites', value: pendingInviteCount, borderClass: 'border-l-4 border-l-amber-500', iconClass: 'bg-amber-50 text-amber-600', icon: <Send size={16} /> },
            ].map((card) => (
              <div key={card.label} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${card.borderClass}`}>
                <div className="min-w-0">
                  <p className={`text-[10px] font-pmedium uppercase tracking-widest mb-1 ${card.iconClass.split(' ').find((cls) => cls.startsWith('text-')) || 'text-slate-400'}`}>{card.label}</p>
                  <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
                </div>
                <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}>{card.icon}</div>
              </div>
            ))}
          </div>

          {/* ── Data Panel ── */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

            {/* Panel header row: sub-tabs → book button */}
            <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:gap-4 sm:p-4 xl:flex-row xl:items-center lg:p-5">
              <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {SUB_TABS.map((pill) => (
                  <button
                    key={pill.key}
                    onClick={() => setSubTab(pill.key)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] sm:text-[12px] font-pmedium transition-all ${
                      subTab === pill.key ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200' : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                    }`}
                  >
                    {pill.label} {pill.key === 'upcoming' ? upcomingCount : pill.key === 'past' ? pastCount : cancelledCount}
                  </button>
                ))}
              </div>
              <Link to="/dashboard/tenant/meeting-room-booking" className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap">
                <Calendar size={13} strokeWidth={3} /> Book Room
              </Link>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1 bg-white/20">
              <table className="w-full min-w-[1080px] text-left font-pmedium">
                <thead className="border-b border-slate-100/60 bg-slate-50/50 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Meeting</th>
                    <th className="px-5 py-4">Host / Company</th>
                    <th className="px-5 py-4">Schedule</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {visibleBookings.map((booking) => {
                    const invite = getInviteForUser(booking, currentUserId, currentUserEmail);
                    const bookingStatus = getLiveBookingStatus(booking);
                    const isBooker = isMyBooking(booking, currentUserId, currentUserName, currentUserEmail);
                    const isAcceptedInvite = isAcceptedInviteForUser(booking, currentUserId, currentUserEmail);
                    const inviteStatus = invite?.status || booking?.currentInviteStatus || '';
                    const inviteDisplayStatus = normalizeId(bookingStatus) === 'cancelled' ? 'cancelled' : normalizeId(inviteStatus);
                    const areInviteActionsDisabled = inviteDisplayStatus === 'cancelled' || inviteDisplayStatus !== 'pending';
                    const canManageAll = canManageTenant && mainTab === 'company';
                    const canRescheduleOrCancel = (isBooker || canManageAll) && normalizeId(bookingStatus) === 'booked';
                    const canExtendBooking = (isBooker || isAcceptedInvite || canManageAll) && normalizeId(bookingStatus) === 'in progress';

                    return (
                      <tr key={booking.recordId || booking.id} className="transition-colors hover:bg-slate-50/50 group">
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><MapPin size={16} /></div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-pmedium text-slate-900 truncate">{booking.roomName}</p>
                              <p className="mt-0.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{booking.bookingCode || booking.id}</p>
                              <p className="mt-0.5 text-[11px] font-pregular text-slate-500 capitalize">{booking.bookingType || 'Tenant'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-2 font-pmedium text-slate-900 text-[12px]">
                            <Users size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate">{booking.bookedByName || 'Unknown host'}</span>
                          </div>
                          <p className="mt-0.5 text-[10px] font-pmedium text-slate-400 truncate">{booking.clientCompany || tenantCompanyName}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {inviteDisplayStatus === 'pending' && <span className={statusPillClass('pending')}>Pending Invite</span>}
                            {inviteDisplayStatus === 'accepted' && <span className={statusPillClass('accepted')}>Accepted Invite</span>}
                            {inviteDisplayStatus === 'cancelled' && <span className={statusPillClass('cancelled')}>Cancelled Invite</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top whitespace-nowrap">
                          <p className="text-[12px] font-pmedium text-slate-700">{formatDateLabel(booking.date)}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-[11px] font-pmedium text-slate-500">
                            <Clock size={11} /> {formatTime12h(booking.checkIn || booking.startTime || '')} - {formatTime12h(booking.checkOut || booking.endTime || '')}
                          </p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          {getStatusBadge(bookingStatus)}
                          {inviteDisplayStatus && inviteDisplayStatus !== 'pending' && (
                            <div className="mt-1.5">
                              {getInviteBadge(inviteDisplayStatus)}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-wrap justify-center gap-1.5">
                            <button onClick={() => setSelectedBooking(booking)} title="View details" aria-label={`View booking ${booking.bookingCode || booking.id}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700">
                              <Eye size={14} />
                            </button>
                            {inviteDisplayStatus === 'pending' && (
                              <>
                                <button disabled={isSaving || areInviteActionsDisabled} onClick={() => void handleAcceptInvite(booking)} title="Accept invite"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60">
                                  <CheckCircle2 size={14} />
                                </button>
                                <button disabled={isSaving || areInviteActionsDisabled} onClick={() => openDeclineModal(booking)} title="Decline invite"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-red-100 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60">
                                  <XCircle size={14} />
                                </button>
                              </>
                            )}
                            {canRescheduleOrCancel && (
                              <>
                                <button disabled={isSaving} onClick={() => openRescheduleModal(booking)} title="Reschedule"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-200 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">
                                  <Edit2 size={14} />
                                </button>
                                <button disabled={isSaving} onClick={() => openCancelModal(booking)} title="Cancel booking"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-red-200 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
                                  <XCircle size={14} />
                                </button>
                              </>
                            )}
                            {canExtendBooking && (
                              <button disabled={isSaving} onClick={() => openExtendModal(booking)} title="Extend meeting"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700 border border-violet-200 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60">
                                <RefreshCw size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {visibleBookings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-16 text-center font-pmedium text-slate-400">
                        No bookings match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Booking detail modal ── */}
        {selectedBooking && (
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => setSelectedBooking(null)}>
            <div className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70 max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                    <MapPin size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">{selectedBooking.roomName}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-pmedium text-[10px] text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{selectedBooking.bookingCode || selectedBooking.id}</span>
                      {getStatusBadge(getLiveBookingStatus(selectedBooking))}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedBooking(null)} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"><XCircle size={16} /></button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-white">
                <div>
                  <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                    <Clock size={14} /> Schedule &amp; Room
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Window</p>
                      <p className="text-[12px] font-pmedium text-slate-900">{formatBookingWindow(selectedBooking)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Location</p>
                      <p className="text-[12px] font-pmedium text-slate-900">{(function () { const loc = normalizeText(selectedBooking.location || ''); const floor = parseFloorFromLocation(loc); const wing = normalizeText(selectedBooking.roomWing || parseWingFromLocation(loc)); const parts = [loc.replace(/Floor\s+\d+.*$/i, '').trim() || '--']; if (floor) parts.push(`Floor ${floor}`); if (wing) parts.push(wing); return parts.join(' \u2022 '); })()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Capacity</p>
                      <p className="text-[12px] font-pmedium text-slate-900">{selectedBooking.roomCapacity ? `${selectedBooking.roomCapacity} seats` : 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Room Description</p>
                      <p className="text-[12px] font-pmedium text-slate-900">{selectedBooking.roomDescription || 'No description available.'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                    <History size={14} /> Credits &amp; People
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Host</p>
                      <p className="text-[12px] font-pmedium text-slate-900 break-words">{selectedBooking.bookedByName || 'Unknown host'}</p>
                      <p className="mt-0.5 text-[10px] font-pmedium text-slate-400">{selectedBooking.bookedByEmail || 'No email on file'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Attendees</p>
                      <p className="text-[12px] font-pmedium text-slate-900">{selectedBooking.attendees || 0}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Purpose</p>
                      <p className="text-[12px] font-pregular leading-5 text-slate-700">{selectedBooking.purpose || 'No purpose provided.'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Credits Used</p>
                      <p className="text-[12px] font-pmedium text-slate-900">{Number(selectedBooking.bookingCredits || 0).toFixed(2)} CR</p>
                      {normalizeText(selectedBooking.status || selectedBooking.bookingStatus) === 'cancelled' && (
                        <p className="mt-0.5 text-[10px] font-pmedium text-emerald-600">Refunded: {Number(selectedBooking.bookingCredits || 0).toFixed(2)} CR</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Remaining Balance</p>
                      <p className="text-[12px] font-pmedium text-slate-900">{Number.isFinite(companyCreditsRemaining) ? `${companyCreditsRemaining.toFixed(2)} CR` : '--'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                    <Users size={14} /> Invite List
                  </h3>
                  <div className="space-y-1.5 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                    {(Array.isArray(selectedBooking.invites) ? selectedBooking.invites : []).length > 0 ? selectedBooking.invites.map((invite: Record<string, any>) => (
                      <div key={`${invite.invitedUserId || invite.invitedName}`} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-slate-100">
                        <div>
                          <p className="text-[12px] font-pmedium text-slate-800">{invite.invitedName}</p>
                          <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{invite.invitedRole || 'Member'}</p>
                        </div>
                        {getInviteBadge(invite.status)}
                      </div>
                    )) : (
                      <div className="rounded-xl bg-white px-3 py-3 text-[11px] font-pregular text-slate-500 border border-slate-100">No invite list available.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 sm:p-6 border-t border-slate-100 bg-white flex justify-end gap-2">
                {(() => {
                  const live = getLiveBookingStatus(selectedBooking);
                  const isBooker = isMyBooking(selectedBooking, currentUserId, currentUserName, currentUserEmail);
                  const canRescheduleOrCancel = isBooker && normalizeId(live) === 'booked';
                  return (
                    <>
                      {canRescheduleOrCancel && (
                        <button onClick={() => openCancelModal(selectedBooking)}
                          className="w-full sm:w-auto px-4 py-2.5 bg-white text-red-600 border border-red-200 rounded-2xl font-pmedium hover:bg-red-50 transition-all text-[10px] uppercase tracking-widest">Cancel Booking</button>
                      )}
                      <button onClick={() => setSelectedBooking(null)}
                        className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest">Close</button>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── Cancel modal ── */}
        {cancelModal && (
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => !isSaving && setCancelModal(null)}>
            <div className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-red-50/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-red-500 text-white">
                    <XCircle size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">Cancel Booking</h2>
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mt-0.5 truncate">{cancelModal.roomName} • {formatDateLabel(cancelModal.date)}</p>
                  </div>
                </div>
                <button onClick={() => setCancelModal(null)} disabled={isSaving} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"><XCircle size={16} /></button>
              </div>
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto bg-white">
                {Number(cancelModal?.bookingCredits || 0) > 0 && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5 text-[12px] font-pmedium text-emerald-800 flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                    You will be refunded {Number(cancelModal.bookingCredits).toFixed(2)} CR for this booking.
                  </div>
                )}
                <WebsiteFormField
                  label="Cancellation Reason"
                  multiline
                  minRows={3}
                  maxLength={300}
                  helperText={`${cancelReason.trim().length}/300 characters — helps the unit keep a proper record.`}
                  placeholder="Reason for cancellation"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                {actionError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-pmedium text-red-600">{actionError}</div>
                )}
              </div>
              <div className="p-5 sm:p-6 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button onClick={() => setCancelModal(null)} disabled={isSaving}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest disabled:opacity-60">Back</button>
                <button disabled={isSaving} onClick={() => void handleCancelBooking()}
                  className="w-full sm:w-auto px-4 py-2.5 bg-red-600 text-white rounded-2xl font-pmedium text-[10px] uppercase tracking-widest shadow-sm hover:bg-red-700 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-70">
                  {isSaving ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Decline invite modal ── */}
        {declineModal && (
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => !isSaving && setDeclineModal(null)}>
            <div className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-slate-700 text-white">
                    <XCircle size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">Decline Invite</h2>
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mt-0.5 truncate">{declineModal.roomName} • {formatDateLabel(declineModal.date)}</p>
                  </div>
                </div>
                <button onClick={() => setDeclineModal(null)} disabled={isSaving} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"><XCircle size={16} /></button>
              </div>
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto bg-white">
                <WebsiteFormField
                  label="Reason for declining"
                  multiline
                  minRows={3}
                  maxLength={300}
                  helperText={`${declineReason.trim().length}/300 characters — shared with the host.`}
                  placeholder="e.g. Conflict with another meeting"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                />
                {actionError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-pmedium text-red-600">{actionError}</div>
                )}
              </div>
              <div className="p-5 sm:p-6 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button onClick={() => setDeclineModal(null)} disabled={isSaving}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest disabled:opacity-60">Back</button>
                <button disabled={isSaving} onClick={() => void handleRejectInvite()}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 text-white rounded-2xl font-pmedium text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-900 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-70">
                  {isSaving ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Reschedule modal ── */}
        {rescheduleModal && (
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-3" onClick={() => !isSaving && closeRescheduleModal()}>
            <form onSubmit={handleRescheduleSubmit} noValidate className="bg-white rounded-t-[2rem] sm:rounded-[2rem] max-w-xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70 max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                    <Edit2 size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">Reschedule Booking</h2>
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mt-0.5 truncate">{rescheduleModal.roomName}</p>
                  </div>
                </div>
                <button type="button" onClick={closeRescheduleModal} disabled={isSaving} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"><XCircle size={16} /></button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                  <WebsiteFormField
                    label="Room"
                    disabled
                    value={rescheduleForm.roomName}
                    onChange={() => {}}
                  />
                  <WebsiteFormField
                    label="Date"
                    type="date"
                    min={todayValue}
                    required
                    error={!!rescheduleFieldErrors.date}
                    helperText={rescheduleFieldErrors.date}
                    value={rescheduleForm.date}
                    onChange={(e) => {
                      setRescheduleForm((p) => ({ ...p, date: e.target.value }));
                      setRescheduleFieldErrors((prev) => ({ ...prev, date: '' }));
                      setActionError('');
                    }}
                  />
                  <WebsiteFormField
                    label="Start Time"
                    select
                    required
                    error={!!rescheduleFieldErrors.startTime}
                    helperText={rescheduleFieldErrors.startTime}
                    value={rescheduleForm.startTime}
                    onChange={(e) => {
                      const nextStart = e.target.value;
                      const minEnd = getMinimumEndTime(nextStart);
                      setRescheduleForm((p) => {
                        const curEndMin = timeToMinutes(p.endTime);
                        const minEndMin = timeToMinutes(minEnd);
                        const shouldAdjust = !p.endTime || curEndMin === null || (minEndMin !== null && curEndMin < minEndMin);
                        return { ...p, startTime: nextStart, endTime: shouldAdjust ? minEnd : p.endTime };
                      });
                      setRescheduleFieldErrors((prev) => ({ ...prev, startTime: '', endTime: '' }));
                      setActionError('');
                    }}
                  >
                    <option value="">Select start time</option>
                    {rescheduleStartTimeOptions.map((tv) => <option key={tv} value={tv}>{formatTimeOptionLabel(tv)}</option>)}
                  </WebsiteFormField>
                  <WebsiteFormField
                    label="End Time"
                    select
                    required
                    error={!!rescheduleFieldErrors.endTime}
                    helperText={rescheduleFieldErrors.endTime}
                    value={rescheduleForm.endTime}
                    onChange={(e) => {
                      setRescheduleForm((p) => ({ ...p, endTime: e.target.value }));
                      setRescheduleFieldErrors((prev) => ({ ...prev, endTime: '' }));
                      setActionError('');
                    }}
                  >
                    <option value="">Select end time</option>
                    {rescheduleEndTimeOptions.map((tv) => <option key={tv} value={tv}>{formatTimeOptionLabel(tv)}</option>)}
                  </WebsiteFormField>
                  <div className="sm:col-span-2">
                    <WebsiteFormField
                      label="Purpose"
                      multiline
                      minRows={2}
                      maxLength={200}
                      placeholder="What is this meeting about?"
                      value={rescheduleForm.purpose}
                      onChange={(e) => setRescheduleForm((p) => ({ ...p, purpose: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Invite employees */}
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Invite Employees</label>
                      <p className="text-[11px] font-pregular text-slate-500 mt-0.5">Select coworkers to receive invites for this updated booking.</p>
                    </div>
                    <div className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">
                      {Array.isArray(rescheduleInviteeIds) ? rescheduleInviteeIds.length : 0} selected
                    </div>
                  </div>

                  {isRescheduleInviteesLoading ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-[12px] font-pmedium text-slate-500">Loading employee list...</div>
                  ) : rescheduleInviteeOptions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-[12px] font-pmedium text-slate-500">No additional active employees available.</div>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2 max-h-44 overflow-y-auto pr-1">
                      {rescheduleInviteeOptions.map((employee) => {
                        const isSelected = Array.isArray(rescheduleInviteeIds) && rescheduleInviteeIds.includes(employee.userId);
                        return (
                          <button key={employee.userId} type="button" onClick={() => handleToggleRescheduleInvitee(employee.userId)}
                            className={`cursor-pointer rounded-xl border p-3 text-left transition-all ${isSelected ? 'border-[#2563EB] bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm'}`}>
                            <div className="flex items-start justify-between gap-2">
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

                {/* Credit summary */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-[12px] font-pmedium text-slate-600">
                  <p className="font-pmedium text-slate-800">Current credits: {Number(rescheduleModal?.bookingCredits || 0).toFixed(2)} CR</p>
                  {rescheduleForm.startTime && rescheduleForm.endTime && (
                    <>
                      <p className="mt-1">New credits: {rescheduleNewCredits.toFixed(2)} CR</p>
                      <p className={`mt-0.5 ${rescheduleCreditDiff >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {rescheduleCreditDiff >= 0
                          ? `You will be charged ${rescheduleCreditDiff.toFixed(2)} additional CR`
                          : `${Math.abs(rescheduleCreditDiff).toFixed(2)} CR will be refunded`}
                      </p>
                    </>
                  )}
                </div>

                <div className={`rounded-xl border p-3 text-[12px] font-pmedium ${rescheduleAvailability.available ? 'border-emerald-100 bg-emerald-50/70 text-emerald-800' : 'border-rose-100 bg-rose-50/70 text-rose-800'}`}>
                  {rescheduleAvailability.reason}
                </div>

                {actionError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-pmedium text-red-600">{actionError}</div>
                )}
              </div>

              {/* Footer */}
              <div className="p-5 sm:p-6 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button type="button" onClick={closeRescheduleModal} disabled={isSaving}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest">Back</button>
                <button disabled={isSaving || !rescheduleAvailability.available} type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] uppercase tracking-widest shadow-sm hover:bg-primary/95 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-70">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Extend modal ── */}
        {extendModal && (
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => !isSaving && closeExtendModal()}>
            <form onSubmit={handleExtendBooking} className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-violet-50/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-violet-600 text-white">
                    <RefreshCw size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">Extend Meeting</h2>
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mt-0.5 truncate">{extendModal.roomName}</p>
                  </div>
                </div>
                <button type="button" onClick={closeExtendModal} disabled={isSaving} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"><XCircle size={16} /></button>
              </div>
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto bg-white">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Current Schedule</p>
                  <p className="mt-1 text-[12px] font-pmedium text-slate-900">{formatBookingWindow(extendModal)}</p>
                  <p className="mt-1.5 text-[10px] font-pregular text-slate-500">Bookings are checked against room overlap before the extension is saved.</p>
                </div>
                <WebsiteFormField
                  label="Extend By"
                  select
                  value={extendMinutes}
                  onChange={(e) => setExtendMinutes(e.target.value)}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1 hour 30 minutes</option>
                </WebsiteFormField>
                {extendPreview && (
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 space-y-1.5">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-violet-700">Extension Summary</p>
                    <div className="flex items-center justify-between text-[12px] font-pmedium text-violet-900">
                      <span>New end time</span>
                      <span>{formatTime12h(extendPreview.nextEndTime)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px] font-pmedium text-violet-900">
                      <span>Credits to deduct</span>
                      <span>{extendPreview.extraCredits.toFixed(2)} CR</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px] font-pmedium text-violet-950 border-t border-violet-200 pt-1.5">
                      <span>New total credits</span>
                      <span>{extendPreview.newTotalCredits.toFixed(2)} CR</span>
                    </div>
                  </div>
                )}
                <div className={`rounded-xl border p-3 text-[12px] font-pmedium ${extendAvailability.available ? 'border-emerald-100 bg-emerald-50/70 text-emerald-800' : 'border-rose-100 bg-rose-50/70 text-rose-800'}`}>
                  {extendAvailability.reason}
                </div>
                {actionError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-pmedium text-red-600">{actionError}</div>
                )}
              </div>
              <div className="p-5 sm:p-6 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button type="button" onClick={closeExtendModal} disabled={isSaving}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest">Back</button>
                <button disabled={isSaving || !extendAvailability.available} type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 bg-violet-600 text-white rounded-2xl font-pmedium text-[10px] uppercase tracking-widest shadow-sm hover:bg-violet-700 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-70">
                  {isSaving ? 'Extending...' : 'Extend Meeting'}
                </button>
              </div>
            </form>
          </div>
        )}
      </PageFrame>
    </div>
  );
}
