import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  AlertCircle,
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
import { formatTime12h } from '@/utils/time';
import { getStoredTenantCompanyId, getStoredTenantCompanyName, getStoredUser } from '@/lib/auth-session';
import { getStoredTenantRole, isTenantAdminRole, isTenantManagerRole } from '@/lib/tenant-session';
import { getMyTenantCompany } from '@/services/tenant-companies';
import { getMeetingRoomBookings, respondToMeetingRoomInvite, updateMeetingRoomBooking, cancelBooking } from '@/services/meeting-room-bookings';

const BOOKING_SLOT_STEP_MINUTES = 5;
const BOOKING_MIN_DURATION_MINUTES = 30;

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

function getStatusTone(status: string): string {
  const n = normalizeId(status);
  if (n === 'cancelled') return 'border-slate-200 bg-slate-100 text-slate-500';
  if (n === 'completed') return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  if (n === 'in progress') return 'border-blue-200 bg-blue-100 text-blue-700';
  return 'border-amber-200 bg-amber-100 text-amber-700';
}

function getInviteTone(status: string): string {
  const n = normalizeId(status);
  if (n === 'accepted') return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  if (n === 'cancelled' || n === 'rejected') return 'border-slate-200 bg-slate-100 text-slate-500';
  return 'border-amber-200 bg-amber-100 text-amber-700';
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
  const workspaceId = normalizeId(currentUser?.primaryWorkspace || currentUser?.workspaceMembership?.workspaceId || currentUser?.workspaceId || '');
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
  const [rescheduleModal, setRescheduleModal] = useState<Record<string, any> | null>(null);
  const [extendModal, setExtendModal] = useState<Record<string, any> | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleForm, setRescheduleForm] = useState({ roomName: '', date: '', startTime: '', endTime: '', purpose: '' });
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
    Math.max(0, Number(currentCompany?.creditsAllocated || currentCompany?.creditsTotal || 0) - Number(currentCompany?.creditsUsed || 0)),
  );

  const loadBookings = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [bookingsResponse, companiesResponse] = await Promise.allSettled([
        getMeetingRoomBookings(workspaceId), getMyTenantCompany(),
      ]);
      const nextBookings = bookingsResponse.status === 'fulfilled' ? extractList(bookingsResponse.value, ['bookings', 'items']) : [];
      const nextCompanies = companiesResponse.status === 'fulfilled' && companiesResponse.value?.data?.tenant ? [companiesResponse.value.data.tenant] : [];

      setBookings(nextBookings);
      setTenantCompanies(nextCompanies);
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

  const pendingInviteCount = inviteBookings.length;
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

  const todayValue = getTodayInputValue();
  const currentTimeValue = getCurrentTimeInputValue();
  const roundedCurrentTimeValue = roundUpToStepTime(currentTimeValue);

  const rescheduleStartTimeOptions = useMemo(
    () => buildTimeOptions(rescheduleForm.date === todayValue ? roundedCurrentTimeValue : '00:00'),
    [rescheduleForm.date, roundedCurrentTimeValue, todayValue],
  );

  const rescheduleEndTimeOptions = useMemo(() => {
    const minimumEndTime = getMinimumEndTime(rescheduleForm.startTime);
    const baseMin = rescheduleForm.date === todayValue
      ? getLaterTimeInputValue(roundedCurrentTimeValue, minimumEndTime || '')
      : minimumEndTime;
    return buildTimeOptions(baseMin || '00:00');
  }, [rescheduleForm.date, rescheduleForm.startTime, roundedCurrentTimeValue, todayValue]);

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
      const currentUserEmail = (currentUser?.email || '').toLowerCase().trim();
      const mapped = employees
        .filter((emp: Record<string, any>) => emp.status === 'Active' && emp.userId && (emp.email || '').toLowerCase().trim() !== currentUserEmail)
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

  const handleAcceptInvite = async (booking: Record<string, any>) => {
    if (!booking?.recordId) return;
    setIsSaving(true); setErrorMessage('');
    try {
      await respondToMeetingRoomInvite(booking.recordId, { status: 'accepted' });
      setNoticeMessage('Invite accepted.');
      await loadBookings();
      setMainTab('my'); setSubTab('upcoming');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to accept the invite.');
    } finally { setIsSaving(false); }
  };

  const handleRejectInvite = async (booking: Record<string, any>) => {
    if (!booking?.recordId) return;
    const reason = window.prompt('Reason for declining this invite?', '');
    if (reason === null) return;
    setIsSaving(true); setErrorMessage('');
    try {
      await respondToMeetingRoomInvite(booking.recordId, { status: 'declined', reason: reason.trim() });
      setNoticeMessage('Invite declined.');
      await loadBookings();
      setMainTab('invites'); setSubTab('upcoming');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to decline the invite.');
    } finally { setIsSaving(false); }
  };

  const openCancelModal = (booking: Record<string, any>) => { setCancelModal(booking); setCancelReason(booking?.cancelReason || ''); };
  const openRescheduleModal = (booking: Record<string, any>) => {
    setRescheduleModal(booking); setExtendModal(null);
    setRescheduleForm({ roomName: booking?.roomName || '', date: booking?.date || '', startTime: booking?.startTime || '', endTime: booking?.endTime || '', purpose: booking?.purpose || '' });
    loadRescheduleInvitees(booking);
  };
  const openExtendModal = (booking: Record<string, any>) => { setExtendModal(booking); setRescheduleModal(null); setExtendMinutes('30'); };
  const closeExtendModal = () => { setExtendModal(null); setExtendMinutes('30'); };
  const closeRescheduleModal = () => { setRescheduleModal(null); setRescheduleInviteeOptions([]); setRescheduleInviteeIds([]); };
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
    setIsSaving(true); setErrorMessage('');
    try {
      await cancelBooking(cancelModal.recordId, cancelReason.trim() || 'Cancelled by user');
      setNoticeMessage('Booking cancelled. Credits will be refunded.');
      setCancelModal(null); setCancelReason('');
      await loadBookings();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to cancel this booking.');
    } finally { setIsSaving(false); }
  };

  const handleRescheduleBooking = async (event: FormEvent) => {
    event.preventDefault();
    if (!rescheduleModal?.recordId) return;
    if (!rescheduleAvailability.available) { setErrorMessage(rescheduleAvailability.reason); return; }
    setIsSaving(true); setErrorMessage('');
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
      setErrorMessage(error?.message || 'Unable to reschedule.');
    } finally { setIsSaving(false); }
  };

  const handleExtendBooking = async (event: FormEvent) => {
    event.preventDefault();
    if (!extendModal?.recordId) return;
    if (!extendAvailability.available) { setErrorMessage(extendAvailability.reason); return; }
    const extra = Number(extendMinutes || 0);
    const extendDate = extendModal?.date || '';
    const currentEndStr = extendModal?.endTime || extendModal?.checkOut || '';
    const currentEndMin = timeToMinutes(currentEndStr);
    const nextEndMin = minutesToTimeString((currentEndMin || 0) + extra);
    const nextEndISO = `${extendDate}T${nextEndMin}:00`;
    setIsSaving(true); setErrorMessage('');
    try {
      await updateMeetingRoomBooking(extendModal.recordId, {
        end: nextEndISO,
        scheduleChangeType: 'extended',
      });
      setNoticeMessage('Booking extended.');
      closeExtendModal();
      await loadBookings();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to extend.');
    } finally { setIsSaving(false); }
  };

  if (isLoading) return <TablePageSkeleton />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-title font-pmedium text-primary uppercase">Booking History</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Track bookings, handle invites, and keep your tenant meetings in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-200/50 p-1.5 shadow-inner">
          {canManageTenant && (
            <button onClick={() => { setMainTab('company'); setSubTab('upcoming'); }}
              className={`rounded-xl px-5 py-2.5 text-xs font-pbold uppercase tracking-widest transition-all ${mainTab === 'company' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>Company View</button>
          )}
          <button onClick={() => { setMainTab('my'); setSubTab('upcoming'); }}
            className={`rounded-xl px-5 py-2.5 text-xs font-pbold uppercase tracking-widest transition-all ${mainTab === 'my' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>My Bookings</button>
          <button onClick={() => { setMainTab('invites'); setSubTab('upcoming'); }}
            className={`rounded-xl px-5 py-2.5 text-xs font-pbold uppercase tracking-widest transition-all ${mainTab === 'invites' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>Invites {pendingInviteCount > 0 ? `(${pendingInviteCount})` : ''}</button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-pregular text-amber-800">{errorMessage}</div>
      )}
      {noticeMessage && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-pregular text-emerald-800">{noticeMessage}</div>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <button onClick={() => setSubTab('upcoming')} className={`rounded-xl px-4 py-2.5 text-xs font-pbold uppercase tracking-widest ${subTab === 'upcoming' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 shadow-sm'}`}>Upcoming {upcomingCount}</button>
        <button onClick={() => setSubTab('past')} className={`rounded-xl px-4 py-2.5 text-xs font-pbold uppercase tracking-widest ${subTab === 'past' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 shadow-sm'}`}>Past {pastCount}</button>
        <button onClick={() => setSubTab('cancelled')} className={`rounded-xl px-4 py-2.5 text-xs font-pbold uppercase tracking-widest ${subTab === 'cancelled' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 shadow-sm'}`}>Cancelled {cancelledCount}</button>
      </div>

      <div className="flex-1 rounded-[2.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-pbold text-slate-900">
              <History size={20} className="text-[#2563EB]" /> {mainTab === 'company' ? 'Company Booking History' : mainTab === 'invites' ? 'Meeting Invites' : 'My Booking History'}
            </h2>
            <p className="mt-1 text-xs font-pmedium uppercase tracking-widest text-slate-400">{tenantCompanyName}</p>
          </div>
          <Link to="/dashboard/tenant/meeting-room-booking" className="hidden items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-pbold uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-slate-800 md:inline-flex">
            <Calendar size={14} /> Book Room
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 border-b border-slate-100 bg-white text-[10px] font-pbold uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-6 py-4">Meeting</th>
                <th className="px-6 py-4">Host / Company</th>
                <th className="px-6 py-4">Schedule</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
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
                  <tr key={booking.recordId || booking.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-6 py-5 align-top">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><MapPin size={18} /></div>
                        <div>
                          <p className="text-sm font-pbold text-slate-900">{booking.roomName}</p>
                          <p className="mt-1 text-[10px] font-pbold uppercase tracking-widest text-slate-400">{booking.bookingCode || booking.id}</p>
                          <p className="mt-1 text-xs font-pregular text-slate-500">{booking.bookingType || 'Tenant'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <p className="text-sm font-pmedium text-slate-800">{booking.bookedByName || 'Unknown host'}</p>
                      <p className="mt-1 text-xs font-pregular text-slate-500">{booking.clientCompany || tenantCompanyName}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {inviteDisplayStatus === 'pending' && <span className="rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5 text-[9px] font-pbold uppercase tracking-widest text-amber-700">Pending Invite</span>}
                        {inviteDisplayStatus === 'accepted' && <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-pbold uppercase tracking-widest text-emerald-700">Accepted Invite</span>}
                        {inviteDisplayStatus === 'cancelled' && <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[9px] font-pbold uppercase tracking-widest text-slate-500">Cancelled Invite</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <p className="text-sm font-pmedium text-slate-700">{formatDateLabel(booking.date)}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-pmedium text-slate-500">
                        <Clock size={12} /> {formatTime12h(booking.checkIn || booking.startTime || '')} - {formatTime12h(booking.checkOut || booking.endTime || '')}
                      </p>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <span className={`inline-flex rounded-lg border px-3 py-1 text-[10px] font-pbold uppercase tracking-widest ${getStatusTone(bookingStatus)}`}>{bookingStatus}</span>
                      {inviteDisplayStatus && inviteDisplayStatus !== 'pending' && (
                        <div className="mt-2">
                          <span className={`inline-flex rounded-lg border px-3 py-1 text-[10px] font-pbold uppercase tracking-widest ${getInviteTone(inviteDisplayStatus)}`}>Invite {normalizeText(inviteDisplayStatus)}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 align-top text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button onClick={() => setSelectedBooking(booking)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-pbold uppercase tracking-widest text-slate-600 shadow-sm transition-colors hover:bg-slate-50">
                          <Eye size={14} /> View
                        </button>
                        {inviteDisplayStatus === 'pending' && (
                          <>
                            <button disabled={isSaving || areInviteActionsDisabled} onClick={() => handleAcceptInvite(booking)} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-pbold uppercase tracking-widest text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60">
                              <Send size={14} /> Accept
                            </button>
                            <button disabled={isSaving || areInviteActionsDisabled} onClick={() => handleRejectInvite(booking)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-pbold uppercase tracking-widest text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                              <XCircle size={14} /> Decline
                            </button>
                          </>
                        )}
                        {inviteDisplayStatus === 'cancelled' && (
                          <>
                            <button disabled className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-[10px] font-pbold uppercase tracking-widest text-slate-400 opacity-80"><Send size={14} /> Accept</button>
                            <button disabled className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-[10px] font-pbold uppercase tracking-widest text-slate-400 opacity-80"><XCircle size={14} /> Decline</button>
                          </>
                        )}
                        {canRescheduleOrCancel && (
                          <>
                            <button disabled={isSaving} onClick={() => openRescheduleModal(booking)} className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-pbold uppercase tracking-widest text-blue-700 shadow-sm transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">
                              <Edit2 size={14} /> Reschedule
                            </button>
                            <button disabled={isSaving} onClick={() => openCancelModal(booking)} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-[10px] font-pbold uppercase tracking-widest text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
                              <XCircle size={14} /> Cancel
                            </button>
                          </>
                        )}
                        {canExtendBooking && (
                          <button disabled={isSaving} onClick={() => openExtendModal(booking)} className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-[10px] font-pbold uppercase tracking-widest text-indigo-700 shadow-sm transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60">
                            <RefreshCw size={14} /> Extend Meeting
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleBookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400"><History size={24} /></div>
                    <h3 className="text-lg font-pbold text-slate-900">No bookings match this filter</h3>
                    <p className="mt-1 text-sm font-pregular text-slate-500">Use the booking page to create a new room reservation.</p>
                    <Link to="/dashboard/tenant/meeting-room-booking" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-xs font-pbold uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-slate-800">
                      <Calendar size={14} /> Book a room
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected booking detail modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
            <div className="shrink-0 flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <h3 className="text-sm font-pbold text-slate-900">Booking Details</h3>
                <p className="mt-0.5 text-[10px] font-pbold uppercase tracking-widest text-slate-400">{selectedBooking.bookingCode || selectedBooking.id}</p>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="rounded-full bg-white p-1.5 text-slate-400 shadow-sm transition-colors hover:text-red-500"><XCircle size={16} /></button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-pbold text-slate-900">{selectedBooking.roomName}</p>
                    <p className="mt-0.5 text-[11px] font-pregular text-slate-500">{selectedBooking.roomInventoryMode || 'Meeting room'} {selectedBooking.roomCapacity ? `${selectedBooking.roomCapacity} seats` : 'Capacity not set'}</p>
                  </div>
                  <span className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-pbold uppercase tracking-widest ${getStatusTone(selectedBooking.status || selectedBooking.bookingStatus)}`}>{normalizeText(selectedBooking.status || selectedBooking.bookingStatus || 'Booked')}</span>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-pmedium text-slate-500"><Clock size={12} /> {formatBookingWindow(selectedBooking)}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-3 text-xs font-pmedium text-slate-600 items-stretch">
                  <div className="rounded-xl bg-white px-3 py-2 border border-slate-100 flex flex-col items-center justify-center text-center">{(function () { const loc = normalizeText(selectedBooking.location || ''); const floor = parseFloorFromLocation(loc); const wing = normalizeText(selectedBooking.roomWing || parseWingFromLocation(loc)); const parts = [loc.replace(/Floor\s+\d+.*$/i, '').trim() || 'Location:']; if (floor) parts.push(`Floor ${floor}`); if (wing) parts.push(wing); return parts.join(' '); })()}</div>
                  <div className="rounded-xl bg-white px-3 py-2 border border-slate-100 flex flex-col items-center justify-center text-center">
                    <p>Credits Used: {Number(selectedBooking.bookingCredits || 0).toFixed(2)}</p>
                    {normalizeText(selectedBooking.status || selectedBooking.bookingStatus) === 'cancelled' && <p className="mt-1 text-xs font-pmedium text-slate-700">Refunded: {Number(selectedBooking.bookingCredits || 0).toFixed(2)} CR</p>}
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 border border-slate-100 flex flex-col items-center justify-center text-center">Remaining: {Number.isFinite(companyCreditsRemaining) ? `${companyCreditsRemaining.toFixed(2)} CR` : ''}</div>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-white p-3"><p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Host</p><p className="mt-1 text-xs font-pmedium text-slate-900">{selectedBooking.bookedByName || 'Unknown host'}</p></div>
                <div className="rounded-xl border border-slate-100 bg-white p-3"><p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Attendees</p><p className="mt-1 text-xs font-pmedium text-slate-900">{selectedBooking.attendees || 0}</p></div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-3"><p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Purpose</p><p className="mt-1.5 text-xs font-pregular leading-5 text-slate-600">{selectedBooking.purpose || 'No purpose provided.'}</p></div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-white p-3"><p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Booker</p><p className="mt-1 text-xs font-pmedium text-slate-900">{selectedBooking.bookedByName || 'Unknown host'}</p><p className="mt-0.5 text-[11px] text-slate-500">{selectedBooking.bookedByEmail || 'No email on file'}</p></div>
                <div className="rounded-xl border border-slate-100 bg-white p-3"><p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Room Details</p><p className="mt-1 text-xs font-pmedium text-slate-900">{selectedBooking.roomName}</p><p className="mt-0.5 text-[11px] text-slate-500">{selectedBooking.roomDescription || 'No room description available.'}</p></div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <div className="flex items-center justify-between"><p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Invite List</p><Users size={14} className="text-slate-400" /></div>
                <div className="mt-3 space-y-1.5">
                  {(Array.isArray(selectedBooking.invites) ? selectedBooking.invites : []).length > 0 ? selectedBooking.invites.map((invite: Record<string, any>) => (
                    <div key={`${invite.invitedUserId || invite.invitedName}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <div><p className="text-xs font-pmedium text-slate-800">{invite.invitedName}</p><p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">{invite.invitedRole || 'Member'}</p></div>
                      <span className={`rounded-md border px-2 py-0.5 text-[9px] font-pbold uppercase tracking-widest ${getInviteTone(invite.status)}`}>{normalizeText(invite.status || 'pending')}</span>
                    </div>
                  )) : (
                    <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs font-pregular text-slate-500">No invite list available.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-red-50 px-4 py-3">
              <h3 className="text-sm font-pbold text-red-900">Cancel Booking</h3>
              <p className="mt-0.5 text-[10px] font-pmedium uppercase tracking-widest text-red-700">{cancelModal.roomName}</p>
            </div>
            <div className="space-y-3 p-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-pregular text-slate-600">Enter a cancellation reason so the unit can keep a proper record.</div>
              {Number(cancelModal?.bookingCredits || 0) > 0 && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-pmedium text-emerald-800">
                  You will be refunded {Number(cancelModal.bookingCredits).toFixed(2)} CR for this booking.
                </div>
              )}
              <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition-colors focus:border-[#2563EB]" placeholder="Reason for cancellation" />
              <div className="flex gap-3">
                <button onClick={() => setCancelModal(null)} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-pbold uppercase tracking-widest text-slate-600 shadow-sm transition-colors hover:bg-slate-50">Back</button>
                <button disabled={isSaving} onClick={handleCancelBooking} className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-[10px] font-pbold uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">Confirm Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule modal */}
      {rescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <form onSubmit={handleRescheduleBooking} className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-pbold text-slate-900">Reschedule Booking</h3>
              <p className="mt-0.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{rescheduleModal.roomName}</p>
            </div>
            <div className="grid gap-2.5 p-4 md:grid-cols-2">
              <label className="space-y-1.5 text-xs font-pmedium text-slate-700"><span>Room</span>
                <input value={rescheduleForm.roomName} readOnly tabIndex={-1}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500 outline-none cursor-not-allowed" />
              </label>
              <label className="space-y-1.5 text-xs font-pmedium text-slate-700"><span>Date</span>
                <input type="date" value={rescheduleForm.date} min={todayValue}
                  onChange={(e) => setRescheduleForm((p) => ({ ...p, date: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none transition-colors focus:border-[#2563EB]" />
              </label>
              <label className="space-y-1.5 text-xs font-pmedium text-slate-700"><span>Start Time</span>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select required value={rescheduleForm.startTime}
                    onChange={(e) => {
                      const nextStart = e.target.value;
                      const minEnd = getMinimumEndTime(nextStart);
                      setRescheduleForm((p) => {
                        const curEndMin = timeToMinutes(p.endTime);
                        const minEndMin = timeToMinutes(minEnd);
                        const shouldAdjust = !p.endTime || curEndMin === null || (minEndMin !== null && curEndMin < minEndMin);
                        return { ...p, startTime: nextStart, endTime: shouldAdjust ? minEnd : p.endTime };
                      });
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-transparent rounded-xl text-xs font-pmedium text-slate-900 focus:bg-white focus:border-[#2563EB] outline-none transition-all">
                    <option value="">Select start time</option>
                    {rescheduleStartTimeOptions.map((tv) => <option key={tv} value={tv}>{formatTimeOptionLabel(tv)}</option>)}
                  </select>
                </div>
              </label>
              <label className="space-y-1.5 text-xs font-pmedium text-slate-700"><span>End Time</span>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select required value={rescheduleForm.endTime}
                    onChange={(e) => setRescheduleForm((p) => ({ ...p, endTime: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-transparent rounded-xl text-xs font-pmedium text-slate-900 focus:bg-white focus:border-[#2563EB] outline-none transition-all">
                    <option value="">Select end time</option>
                    {rescheduleEndTimeOptions.map((tv) => <option key={tv} value={tv}>{formatTimeOptionLabel(tv)}</option>)}
                  </select>
                </div>
              </label>
              <label className="space-y-1.5 text-xs font-pmedium text-slate-700 md:col-span-2"><span>Purpose</span>
                <textarea value={rescheduleForm.purpose} onChange={(e) => setRescheduleForm((p) => ({ ...p, purpose: e.target.value }))} rows={2}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none transition-colors focus:border-[#2563EB]" />
              </label>

              <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 md:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Invite Employees</label>
                    <p className="text-xs font-pmedium text-slate-500">Select coworkers to receive invites for this updated booking.</p>
                  </div>
                  <div className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">
                    {Array.isArray(rescheduleInviteeIds) ? rescheduleInviteeIds.length : 0} selected
                  </div>
                </div>

                {isRescheduleInviteesLoading ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs font-semibold text-slate-500">Loading employee list...</div>
                ) : rescheduleInviteeOptions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs font-semibold text-slate-500">No additional active employees available.</div>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2 max-h-48 overflow-y-auto pr-1">
                    {rescheduleInviteeOptions.map((employee) => {
                      const isSelected = Array.isArray(rescheduleInviteeIds) && rescheduleInviteeIds.includes(employee.userId);
                      return (
                        <button key={employee.userId} type="button" onClick={() => handleToggleRescheduleInvitee(employee.userId)}
                          className={`rounded-xl border p-3 text-left transition-all ${isSelected ? 'border-[#2563EB] bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-pbold text-slate-900">{employee.fullName}</p>
                              <p className="text-[11px] font-pmedium text-slate-500 mt-0.5">{employee.designation || employee.role || 'Employee'}</p>
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

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-pregular text-slate-600 md:col-span-2">
                <p className="font-pmedium text-slate-800">Current credits: {Number(rescheduleModal?.bookingCredits || 0).toFixed(2)} CR</p>
                {rescheduleForm.startTime && rescheduleForm.endTime && (
                  <>
                    <p className="mt-1 text-slate-600">New credits: {rescheduleNewCredits.toFixed(2)} CR</p>
                    <p className={`mt-0.5 font-pmedium ${rescheduleCreditDiff >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {rescheduleCreditDiff >= 0
                        ? `You will be charged ${rescheduleCreditDiff.toFixed(2)} additional CR`
                        : `${Math.abs(rescheduleCreditDiff).toFixed(2)} CR will be refunded`}
                    </p>
                  </>
                )}
              </div>
              <div className={`rounded-xl border p-3 text-xs font-pmedium md:col-span-2 ${rescheduleAvailability.available ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-rose-100 bg-rose-50 text-rose-800'}`}>{rescheduleAvailability.reason}</div>
            </div>
            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
              <button onClick={closeRescheduleModal} type="button" className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-pbold uppercase tracking-widest text-slate-600 shadow-sm transition-colors hover:bg-slate-50">Back</button>
              <button disabled={isSaving || !rescheduleAvailability.available} type="submit" className="flex-1 rounded-xl bg-[#2563EB] px-3 py-2 text-[10px] font-pbold uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {/* Extend modal */}
      {extendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <form onSubmit={handleExtendBooking} className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-pbold text-slate-900">Extend Booking</h3>
              <p className="mt-0.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{extendModal.roomName}</p>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 md:col-span-2">
                <p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Current Schedule</p>
                <p className="mt-1 text-xs font-pmedium text-slate-900">{formatBookingWindow(extendModal)}</p>
                <p className="mt-1.5 text-[11px] font-pregular text-slate-500">Bookings are checked against room overlap before the extension is saved.</p>
              </div>
              <label className="space-y-1.5 text-xs font-pmedium text-slate-700 md:col-span-2"><span>Extend By</span>
                <select value={extendMinutes} onChange={(e) => setExtendMinutes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none transition-colors focus:border-[#2563EB]">
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1 hour 30 minutes</option>
                </select>
              </label>
              {extendPreview && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 md:col-span-2 space-y-1.5">
                  <p className="text-[10px] font-pbold uppercase tracking-widest text-indigo-700">Extension Summary</p>
                  <div className="flex items-center justify-between text-xs font-pmedium text-indigo-900">
                    <span>New end time</span>
                    <span className="font-pbold">{formatTime12h(extendPreview.nextEndTime)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-pmedium text-indigo-900">
                    <span>Credits to deduct</span>
                    <span className="font-pbold">{extendPreview.extraCredits.toFixed(2)} CR</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-pbold text-indigo-950 border-t border-indigo-200 pt-1.5">
                    <span>New total credits</span>
                    <span>{extendPreview.newTotalCredits.toFixed(2)} CR</span>
                  </div>
                </div>
              )}
              <div className={`rounded-xl border p-3 text-xs font-pmedium md:col-span-2 ${extendAvailability.available ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-rose-100 bg-rose-50 text-rose-800'}`}>{extendAvailability.reason}</div>
            </div>
            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
              <button onClick={closeExtendModal} type="button" className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-pbold uppercase tracking-widest text-slate-600 shadow-sm transition-colors hover:bg-slate-50">Back</button>
              <button disabled={isSaving || !extendAvailability.available} type="submit" className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-[10px] font-pbold uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">Extend Meeting</button>
            </div>
          </form>
        </div>
      )}
      </PageFrame>
    </div>
  );
}
