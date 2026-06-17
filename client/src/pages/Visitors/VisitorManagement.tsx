// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { City, Country, State } from 'country-state-city';
import useAuth from '../../hooks/useAuth';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';

import {
  createVisitorLog,
  checkInVisitorLog,
  checkOutVisitorLog,
  getVisitorManagementOverview,
} from '../../services/visitors';
import { PERMISSIONS } from '../../constants/permissions';
import {
  createMeetingRoomBooking,
  getMeetingRoomClients,
  getMeetingRoomBookings,
  updateMeetingRoomBooking,
} from '../../services/meeting-room-bookings';
import { toast } from 'sonner';
import {
  Search, Check, X, Eye, Clock, Building, User,
  AlertCircle, ChevronDown, CreditCard, CheckCircle2,
  LogOut, UserPlus, FileText, BadgeCheck, Phone, Mail,
  CalendarDays, ShieldCheck, ArrowRight, Wallet, Banknote, Sparkles,
  XCircle, ShieldAlert, Calendar as CalendarIcon, AlertTriangle, Globe, Smartphone, LayoutGrid,
  Download, Printer, Lock
} from 'lucide-react';
import PageFrame from '../../components/Pages/PageFrame';

function formatTimeLabel(value) {
  if (!value) return '';
  const date =
    value instanceof Date
      ? value
      : new Date(String(value).includes('T') ? String(value) : `1970-01-01T${value}`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getFlagUrl(isoCode = '') {
  return `https://flagcdn.com/w40/${String(isoCode || '').toLowerCase()}.png`;
}

function getDefaultVisitorForm() {
  return {
    firstName: '',
    lastName: '',
    gender: '',
    name: '',
    phone: '',
    email: '',
    country: '',
    state: '',
    city: '',
    visitorCompanyType: 'individual',
    visitorCompany: '',
    company: '',
    industry: '',
    teamSize: '',
    seatCount: '',
    preferredSpace: '',
    budgetRange: '',
    moveInTimeline: '',
    pocName: '',
    pocDesignation: '',
    pocPhone: '',
    pocEmail: '',
    preferredContactMethod: '',
    followUpDate: '',
    tourNotes: '',
    standardVisitorType: 'standard',
    standardVisitorMode: 'new',
    standardVisitorSearch: '',
    purpose: 'Meeting',
    hostGroupType: '',
    hostGroupValue: '',
    hostGroup: '',
    hostUserId: '',
    tenantCompanyName: '',
    reason: '',
    attendees: '',
    spaceType: '',
    floor: '',
    wing: '',
    resourceName: '',
    seatNumber: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    discountType: 'amount',
    discountValue: '',
    paymentMode: '',
    transactionId: '',
    paymentProofFile: null,
    bookingId: '',
    clientBookingMode: 'new',
    clientId: '',
    clientSearch: '',
    sourceVisitorId: '',
    bookingNotes: ''
  };
}

const WALK_IN_WORKING_START = 9 * 60;
const WALK_IN_WORKING_END = 19 * 60;
const WALK_IN_SLOT_STEP = 5;
const WALK_IN_MIN_DURATION_MINUTES = 30;
const WALK_IN_GST_RATE = 0.18;
const MEETING_ROOM_CLEANUP_BUFFER_MINUTES = 5;

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function hasMeaningfulTimeValue(value) {
  if (value == null) {
    return false;
  }

  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  if (typeof value === 'number') {
    return !Number.isNaN(new Date(value).getTime());
  }

  const text = String(value).trim();
  if (!text) {
    return false;
  }

  return !['--:--', '-', 'n/a', 'na', 'none', 'null'].includes(text.toLowerCase());
}

function formatDateKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }
  const fallback = new Date(`${value}T12:00:00`);
  if (Number.isNaN(fallback.getTime())) return String(value);
  return fallback.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function toTitleCase(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getMonthYearFromValue(value) {
  if (!value) {
    return { month: '', year: '' };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { month: '', year: '' };
  }

  return {
    month: date.toLocaleDateString('en-US', { month: 'long' }),
    year: date.toLocaleDateString('en-US', { year: 'numeric' }),
  };
}

function enrichHostGroupsWithRoster(hostGroups = [], employeeRoster = []) {
  const rosterByUserId = new Map(
    employeeRoster.map((member) => [String(member.userId || member.id || ''), member]),
  );

  return hostGroups.map((group) => ({
    ...group,
    members: Array.isArray(group.members)
      ? group.members.map((member) => {
        const rosterMember = rosterByUserId.get(String(member.userId || member.id || '')) || {};
        return {
          ...member,
          ...rosterMember,
          userId: member.userId || rosterMember.userId || member.id || rosterMember.id || '',
          id: member.id || rosterMember.id || member.userId || rosterMember.userId || '',
          fullName: rosterMember.fullName || member.fullName || '',
          statusKey: rosterMember.statusKey || member.statusKey || '',
          statusLabel: rosterMember.statusLabel || member.statusLabel || 'Present',
          isSelectable: Boolean(rosterMember.isSelectable ?? member.isSelectable),
        };
      })
      : [],
  }));
}

function isSameVisitorEntry(entry = {}, target = {}) {
  const entryId = String(entry?.recordId || entry?.id || entry?.visitorCode || '').trim();
  const targetId = String(target?.recordId || target?.id || target?.visitorCode || '').trim();

  if (entryId && targetId && entryId === targetId) {
    return true;
  }

  const entryHostUserId = String(entry?.hostUserId || '').trim();
  const targetHostUserId = String(target?.hostUserId || '').trim();
  const entryName = String(entry?.name || entry?.fullName || '').trim().toLowerCase();
  const targetName = String(target?.name || target?.fullName || '').trim().toLowerCase();

  return Boolean(
    entryHostUserId &&
    targetHostUserId &&
    entryHostUserId === targetHostUserId &&
    entryName &&
    targetName &&
    entryName === targetName,
  );
}

function getVisitorStateRank(visitor = {}) {
  const status = normalizeText(visitor?.status || visitor?.statusKey || '');
  const approvalStatus = normalizeText(visitor?.approvalStatus || '');
  const hasCheckInTime = hasMeaningfulTimeValue(visitor?.checkInAt) || hasMeaningfulTimeValue(visitor?.checkIn);
  const hasCheckOutTime = hasMeaningfulTimeValue(visitor?.checkOutAt) || hasMeaningfulTimeValue(visitor?.checkOut);

  if (hasCheckOutTime || status === 'checked out') {
    return 4;
  }

  if (hasCheckInTime || status === 'checked in') {
    return 3;
  }

  if (approvalStatus === 'approved' || status === 'approved') {
    return 2;
  }

  if (approvalStatus === 'rejected' || status === 'rejected') {
    return 1;
  }

  return 0;
}

function normalizeVisitorTrackingEntry(visitor = {}) {
  const rawStatus = normalizeText(visitor?.status || visitor?.statusKey || '');
  const approvalStatus = normalizeText(visitor?.approvalStatus || 'pending') || 'pending';
  const hasCheckInTime = hasMeaningfulTimeValue(visitor?.checkInAt) || hasMeaningfulTimeValue(visitor?.checkIn);
  const hasCheckOutTime = hasMeaningfulTimeValue(visitor?.checkOutAt) || hasMeaningfulTimeValue(visitor?.checkOut);
  const isCheckedOut = hasCheckOutTime || rawStatus === 'checked out';
  const isCheckedIn = !isCheckedOut && (hasCheckInTime || rawStatus === 'checked in');

  const statusKey = isCheckedOut
    ? 'checked_out'
    : isCheckedIn
      ? 'checked_in'
      : approvalStatus === 'approved'
        ? 'approved'
        : approvalStatus === 'rejected'
          ? 'rejected'
          : 'pending';

  const status = isCheckedOut
    ? 'Checked Out'
    : isCheckedIn
      ? 'Checked In'
      : approvalStatus === 'approved'
        ? 'Approved'
        : approvalStatus === 'rejected'
          ? 'Rejected'
          : 'Pending Approval';
  const approvalStatusLabel = isCheckedIn
    ? 'Direct Check-in'
    : approvalStatus === 'approved'
      ? 'Approved'
      : approvalStatus === 'rejected'
        ? 'Rejected'
        : 'Pending Approval';

  const monthYearSource =
    visitor?.checkOutAt ||
    visitor?.checkInAt ||
    visitor?.createdAt ||
    (visitor?.date ? new Date(visitor.date) : null);
  const derivedMonthYear = getMonthYearFromValue(monthYearSource);

  return {
    ...visitor,
    name: visitor?.name || visitor?.fullName || [visitor?.firstName, visitor?.lastName].filter(Boolean).join(' ').trim(),
    company: visitor?.company || visitor?.visitorCompany || '',
    host: visitor?.host || visitor?.hostName || 'Front Desk',
    date: formatDisplayDate(visitor?.checkInAt || visitor?.createdAt || visitor?.date) || '',
    month: visitor?.month || derivedMonthYear.month,
    year: visitor?.year || derivedMonthYear.year,
    status,
    statusKey,
    approvalStatus,
    approvalStatusLabel,
    checkIn: formatTimeLabel(visitor.checkInAt || visitor.checkIn) || visitor.checkIn || '--:--',
    checkOut: formatTimeLabel(visitor.checkOutAt || visitor.checkOut) || visitor.checkOut || '--:--',
  };
}

function isVisitorCheckedOut(visitor = {}) {
  const status = normalizeText(visitor?.status || visitor?.statusKey || '').replace(/[_-]+/g, ' ');
  const hasCheckOutTime = hasMeaningfulTimeValue(visitor?.checkOutAt) || hasMeaningfulTimeValue(visitor?.checkOut);
  return hasCheckOutTime || status === 'checked out' || status === 'completed';
}

function isValidName(value = '') {
  return /^[A-Za-z\s]+$/.test(String(value || '').trim());
}

function isValidPhone(value = '') {
  return /^\d{10,15}$/.test(String(value || '').trim());
}

function isValidEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function timeToMinutes(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.getHours() * 60 + value.getMinutes();
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.getHours() * 60 + date.getMinutes();
  }

  const text = String(value).trim();
  if (!text) return null;

  const ampmMatch = text.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (ampmMatch) {
    let hours = Number(ampmMatch[1]);
    const minutes = Number(ampmMatch[2]);
    const period = ampmMatch[3].toUpperCase();
    if (hours > 12 || minutes > 59) return null;
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesToTime(value) {
  const normalized = ((Number(value) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function roundUpToStepTime(value = '', stepMinutes = WALK_IN_SLOT_STEP) {
  const totalMinutes = timeToMinutes(value);
  if (totalMinutes == null) {
    return '';
  }

  const roundedMinutes = Math.ceil(totalMinutes / stepMinutes) * stepMinutes;
  if (roundedMinutes >= 24 * 60) {
    return '23:55';
  }

  return minutesToTime(roundedMinutes);
}

function buildTimeOptions(minTime = '00:00', maxTime = '23:55', stepMinutes = WALK_IN_SLOT_STEP) {
  const minMinutes = Math.max(0, timeToMinutes(minTime) ?? 0);
  const maxMinutes = Math.min((24 * 60) - stepMinutes, timeToMinutes(maxTime) ?? ((24 * 60) - stepMinutes));
  const options = [];

  for (let minutes = minMinutes; minutes <= maxMinutes; minutes += stepMinutes) {
    options.push(minutesToTime(minutes));
  }

  return options;
}

function formatTimeOptionLabel(value = '') {
  return formatTimeLabel(value) || value;
}

function isAlignedToFiveMinuteSlot(totalMinutes) {
  return Number.isInteger(totalMinutes) && totalMinutes % WALK_IN_SLOT_STEP === 0;
}

function formatWalkInDateLabel(startDate, endDate) {
  const startLabel = formatDisplayDate(startDate);
  const endLabel = formatDisplayDate(endDate || startDate);
  if (!startLabel) return '';
  if (!endLabel || startLabel === endLabel) return startLabel;
  return `${startLabel} to ${endLabel}`;
}

function getRoomTypeFromName(roomName) {
  const normalized = normalizeText(roomName);
  if (normalized.includes('board')) return 'Boardroom';
  if (normalized.includes('conference')) return 'Conference Room';
  if (normalized.includes('cabin')) return 'Cabin';
  if (normalized.includes('desk')) return 'Desk';
  return 'Meeting Room';
}

function normalizeSeatNumber(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function isDeskAreaRoom(room: { type?: string; inventoryMode?: string; capacity?: number | string } = {}) {
  return room?.type === 'Desk' && room?.inventoryMode === 'area' && Number(room?.capacity || 0) > 1;
}

function getBookingSeatNumber(booking = {}) {
  return normalizeSeatNumber(booking?.seatNumber);
}

function normalizeMeetingRoom(room = {}) {
  return {
    ...room,
    name: room.name || '',
    type: room.type || getRoomTypeFromName(room.name),
    resourceCategory: room.resourceCategory || '',
    inventoryMode: room.inventoryMode || (Number(room.capacity || 0) > 1 ? 'area' : 'single'),
    assignedTenantCompanyId: room.assignedTenantCompanyId || null,
    assignedTenantCompanyName: room.assignedTenantCompanyName || '',
    assignedDepartmentId: room.assignedDepartmentId || '',
    assignedDepartmentName: room.assignedDepartmentName || '',
    walkInBlockedByAssignment: Boolean(room.walkInBlockedByAssignment),
    activationReady: room.activationReady !== false,
    status: room.status || 'Active',
    floor: room.floor || '501',
    wing: String(room.wing || 'A').trim().toUpperCase() || 'A',
    capacity: Number(room.capacity || 0),
    pricing: room.pricing || '',
    pricePerHour: Number(room.pricePerHour || 0),
    pricePerDay: Number(room.pricePerDay || 0),
  };
}

function getWalkInRate(room) {
  const hourlyValue = Number(room?.pricePerHour || 0);
  const dailyValue = Number(room?.pricePerDay || 0);

  if (hourlyValue > 0 || dailyValue > 0) {
    const hourly = hourlyValue > 0 ? hourlyValue : Math.max(1, Math.round(dailyValue / 8));
    const daily = dailyValue > 0 ? dailyValue : hourly * 8;
    return {
      hourly,
      daily,
    };
  }

  const capacity = Number(room?.capacity || 0);
  const hourly = Math.max(200, Math.round((capacity || 4) / 2) * 100);
  return {
    hourly,
    daily: hourly * 8,
  };
}

function normalizePhoneForMatch(value = '') {
  return String(value || '').replace(/[^\d+]/g, '').replace(/^0+/, '');
}

function getWalkInEffectiveMinutes(form = {}) {
  return {
    startMinutes: timeToMinutes(form.startTime),
    endMinutes: timeToMinutes(form.endTime),
  };
}

function getWalkInDaySpan(startDate, endDate) {
  const startDateKey = formatDateKey(startDate);
  const endDateKey = formatDateKey(endDate || startDate);
  if (!startDateKey || !endDateKey) {
    return 0;
  }

  const start = new Date(`${startDateKey}T00:00:00`);
  const end = new Date(`${endDateKey}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const diff = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return diff >= 0 ? diff + 1 : 0;
}

const TOUR_INDUSTRY_OPTIONS = [
  'Technology',
  'IT Services',
  'Finance',
  'Consulting',
  'Design Studio',
  'Startup',
  'Education',
  'Healthcare',
  'Retail',
  'Other',
];

const TOUR_SPACE_OPTIONS = [
  'Hot Desk',
  'Dedicated Desk',
  'Private Cabin',
  'Meeting Room',
  'Conference Room',
  'Custom Office',
];

const TOUR_BUDGET_OPTIONS = [
  'Under ₹50k',
  '₹50k - ₹1L',
  '₹1L - ₹3L',
  '₹3L - ₹5L',
  '₹5L+',
];

const TOUR_TIMELINE_OPTIONS = [
  'Immediately',
  'Within 2 weeks',
  '1-2 months',
  '3+ months',
];

function getOverlapConflict(booking, roomName, startDateKey, endDateKey, startMinutes, endMinutes) {
  const bookingDateKey = formatDateKey(booking.date || booking.dateKey);
  if (!bookingDateKey || bookingDateKey < startDateKey || bookingDateKey > endDateKey) return false;
  if (normalizeText(booking.roomName) !== normalizeText(roomName)) return false;
  if (normalizeText(booking.status) === 'cancelled') return false;

  const bookingStart = timeToMinutes(booking.startTime);
  const bookingEnd = timeToMinutes(booking.endTime);
  if (bookingStart == null || bookingEnd == null) return false;
  const bufferedBookingEnd = bookingEnd + MEETING_ROOM_CLEANUP_BUFFER_MINUTES;
  return bookingStart < endMinutes && startMinutes < bufferedBookingEnd;
}

function buildWalkInSuggestions(bookings, rooms, selectedRoom, startDate, endDate, startTime, endTime) {
  const startDateKey = formatDateKey(startDate);
  const endDateKey = formatDateKey(endDate || startDate);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (!startDateKey || !endDateKey || startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
    return { roomSuggestions: [], slotSuggestions: [] };
  }

  const selectedRoomType = getRoomTypeFromName(selectedRoom?.name || '');
  const selectedFloor = normalizeText(selectedRoom?.floor || '');
  const selectedCapacity = Number(selectedRoom?.capacity || 0);
  const normalizedRooms = rooms.map(normalizeMeetingRoom);
  const matchingRooms = normalizedRooms.filter((room) => (
    room.type === selectedRoomType &&
    room.capacity >= selectedCapacity &&
    (!selectedFloor || normalizeText(room.floor) === selectedFloor)
  ));
  const fallbackRooms = matchingRooms.length > 0
    ? matchingRooms
    : normalizedRooms.filter((room) => room.type === selectedRoomType && room.capacity >= selectedCapacity);

  const roomSuggestions = fallbackRooms
    .filter((room) => !bookings.some((booking) => getOverlapConflict(booking, room.name, startDateKey, endDateKey, startMinutes, endMinutes)))
    .slice(0, 4)
    .map((room) => ({
      name: room.name,
      capacity: Number(room.capacity || 0),
      type: room.type || getRoomTypeFromName(room.name),
      floor: room.floor || 'Floor 1',
    }));

  const durationMinutes = Math.max(30, endMinutes - startMinutes);
  const candidateSlots: Array<{ start: string; end: string }> = [];
  for (let minutes = WALK_IN_WORKING_START; minutes + durationMinutes <= WALK_IN_WORKING_END; minutes += WALK_IN_SLOT_STEP) {
    const nextEnd = minutes + durationMinutes;
    const conflict = bookings.some((booking) => getOverlapConflict(booking, selectedRoom?.name || '', startDateKey, endDateKey, minutes, nextEnd));
    if (!conflict) {
      candidateSlots.push({
        start: minutesToTime(minutes),
        end: minutesToTime(nextEnd),
      });
    }
    if (candidateSlots.length === 3) {
      break;
    }
  }

  return {
    roomSuggestions,
    slotSuggestions: candidateSlots,
  };
}

function normalizeVerifiedBooking(booking) {
  if (!booking) return null;

  const id = String(booking.id || booking.bookingCode || '').trim().toUpperCase();
  return {
    id,
    recordId: String(booking.recordId || booking._id || booking.id || booking.bookingCode || id || '').trim(),
    resource: booking.roomName || booking.resource || 'Meeting Room',
    date: booking.date ? formatWalkInDateLabel(booking.date, booking.date) : booking.date || '',
    time: booking.time || `${formatTimeLabel(booking.startTime)} - ${formatTimeLabel(booking.endTime)}`,
    bookedBy: booking.bookedByName || booking.bookedBy || '',
    company: booking.clientCompany || booking.company || booking.bookingSource || 'Frontdesk',
    phone: booking.bookedByPhone || booking.phone || '',
    email: booking.bookedByEmail || booking.email || '',
    status: booking.paymentStatus || booking.liveStatus || booking.status || 'Booked',
    amountDue: Number(booking.totalAmount || booking.amountDue || 0),
    discountType: booking.discountType || 'amount',
    discountValue: Number(booking.discountValue || 0),
    discountAmount: Number(booking.discountAmount || 0),
    subtotalBeforeDiscount: Number(booking.subtotalBeforeDiscount || booking.baseAmount || 0),
    taxableBaseAfterDiscount: Number(booking.taxableBaseAfterDiscount || booking.baseAmount || 0),
    paymentMode: booking.paymentMode || '',
    transactionId: booking.transactionId || '',
    paymentProofUrl: booking.paymentProofUrl || '',
    attendees: Number(booking.attendees || 0),
    source: booking.bookingSource || 'Frontdesk',
    bookingType: booking.bookingType || 'External',
  };
}

function getBookingDisplayStatus(status) {
  const normalized = normalizeText(status);
  if (normalized === 'booked') return 'Booked';
  if (normalized === 'in progress' || normalized === 'checked in' || normalized === 'checked-in') return 'In Progress';
  if (normalized === 'completed' || normalized === 'checked out' || normalized === 'checked-out') return 'Completed';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'Cancelled';
  if (normalized === 'rescheduled') return 'Rescheduled';
  if (normalized === 'pending payment' || normalized === 'unpaid') return 'Pending Payment';
  if (normalized === 'paid at frontdesk' || normalized === 'payment collected at frontdesk' || normalized === 'confirmed (paid)') return 'Paid';
  return status || 'Booked';
}

function isExternalMeetingBooking(booking) {
  return normalizeText(booking?.bookingType) === 'external';
}

function normalizeDailyBooking(booking) {
  if (!booking) return null;

  const id = String(booking.id || booking.bookingCode || booking.recordId || booking._id || '').trim().toUpperCase();
  const status = getBookingDisplayStatus(booking.liveStatus || booking.status);
  const paymentStatus = booking.paymentStatus || (status === 'Booked' ? 'Pending Payment' : '');
  const originalTime = booking.previousStartTime && booking.previousEndTime
    ? `${formatTimeLabel(booking.previousStartTime)} - ${formatTimeLabel(booking.previousEndTime)}`
    : '';
  const originalDateLabel = booking.previousDate ? formatDisplayDate(booking.previousDate) : '';
  const isExtended = normalizeText(booking.scheduleChangeType) === 'extended' || Boolean(originalTime);

  return {
    id,
    recordId: String(booking.recordId || booking._id || booking.id || booking.bookingCode || id || '').trim(),
    bookingCode: id,
    resource: booking.roomName || booking.resource || 'Meeting Room',
    date: booking.date || '',
    dateLabel: formatDisplayDate(booking.date),
    time: booking.time || `${formatTimeLabel(booking.startTime)} - ${formatTimeLabel(booking.endTime)}`,
    originalDateLabel,
    originalTime,
    isExtended,
    bookedBy: booking.bookedByName || booking.bookedBy || '',
    company: booking.clientCompany || booking.company || booking.bookingSource || 'Frontdesk',
    phone: booking.bookedByPhone || booking.phone || '',
    email: booking.bookedByEmail || booking.email || '',
    status,
    paymentStatus,
    amountDue: Number(booking.totalAmount || booking.amountDue || 0),
    totalAmount: Number(booking.totalAmount || booking.amountDue || 0),
    discountType: booking.discountType || 'amount',
    discountValue: Number(booking.discountValue || 0),
    discountAmount: Number(booking.discountAmount || 0),
    subtotalBeforeDiscount: Number(booking.subtotalBeforeDiscount || booking.baseAmount || 0),
    taxableBaseAfterDiscount: Number(booking.taxableBaseAfterDiscount || booking.baseAmount || 0),
    baseAmount: Number(booking.baseAmount || 0),
    gstAmount: Number(booking.gstAmount || 0),
    extensionAmount: Number(booking.extensionAmount || 0),
    originalTotalAmount: Math.max(Number(booking.totalAmount || booking.amountDue || 0) - Number(booking.extensionAmount || 0), 0),
    paymentMode: booking.paymentMode || '',
    transactionId: booking.transactionId || '',
    paymentProofUrl: booking.paymentProofUrl || '',
    paymentVerificationStatus: booking.paymentVerificationStatus || 'Pending',
    attendees: Number(booking.attendees || 0),
    source: booking.bookingSource || 'Frontdesk',
    financeStatus: booking.financeStatus || '',
    bookingType: booking.bookingType || 'External',
    clientId: booking.clientId || '',
    sourceVisitorId: booking.sourceVisitorId || '',
    roomName: booking.roomName || '',
    notes: booking.bookingNotes || booking.purpose || '',
    sourceReference: booking.sourceReference || '',
    invoiceNumber: booking.invoiceNumber || '',
    invoiceFileUrl: booking.invoiceFileUrl || '',
    invoiceStatus: booking.invoiceStatus || 'Pending',
    raw: booking,
  };
}

export default function VisitorsManagementPage() {
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const userPermissions = useMemo(
    () => auth?.user?.permissions?.permissions || [],
    [auth?.user?.permissions?.permissions],
  );
  const [currentMemberGrantedModules, setCurrentMemberGrantedModules] = useState([]);
  const memberGrantedModules = useMemo(() => {
    const fromWorkspaceMembership = Array.isArray(auth?.user?.workspaceMembership?.grantedModules)
      ? auth.user.workspaceMembership.grantedModules
      : [];
    const fromUser = Array.isArray(auth?.user?.grantedModules)
      ? auth.user.grantedModules
      : [];
    return [...currentMemberGrantedModules, ...fromWorkspaceMembership, ...fromUser]
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean);
  }, [currentMemberGrantedModules, auth?.user?.workspaceMembership?.grantedModules, auth?.user?.grantedModules]);

  useEffect(() => {
    let active = true;
    const loadCurrentMemberGrants = async () => {
      try {
        // Primary source: same endpoint used by sidebar for current member module grants.
        const moduleMapResponse = await axiosPrivate.get('/api/workspaces/module-access-map');
        const moduleMapPayload = moduleMapResponse?.data?.data || {};
        const moduleMapGrants = Array.isArray(moduleMapPayload?.currentMemberGrantedModules)
          ? moduleMapPayload.currentMemberGrantedModules
          : [];

        if (moduleMapGrants.length > 0) {
          if (!active) return;
          setCurrentMemberGrantedModules(moduleMapGrants);
          return;
        }

        // Fallback: resolve current member through organization overview.
        const response = await axiosPrivate.get('/api/organization/overview');
        const payload = response?.data?.data || {};
        const teamMembers = Array.isArray(payload?.teamMembers) ? payload.teamMembers : [];
        const currentUserId = String(auth?.user?.id || auth?.user?._id || '').trim();
        const currentEmail = String(auth?.user?.email || '').trim().toLowerCase();
        const me = teamMembers.find((member) => {
          const memberUserId = String(member?.userId || member?.id || '').trim();
          const memberEmail = String(member?.email || '').trim().toLowerCase();
          return (
            (memberUserId && memberUserId === currentUserId) ||
            (currentEmail && memberEmail === currentEmail)
          );
        });

        if (!active) return;
        setCurrentMemberGrantedModules(
          Array.isArray(me?.grantedModules) ? me.grantedModules : [],
        );
      } catch {
        if (!active) return;
        setCurrentMemberGrantedModules([]);
      }
    };

    void loadCurrentMemberGrants();
    const refresh = () => {
      void loadCurrentMemberGrants();
    };
    const intervalId = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [axiosPrivate, auth?.user?.id, auth?.user?._id, auth?.user?.email]);
  const hasGrant = (key = '') =>
    memberGrantedModules.includes(String(key || '').trim().toLowerCase()) ||
    userPermissions.includes(String(key || '').trim());
  const visitorAccess = useMemo(
    () => {
      const base = {
        tabs: {
        daily:
          hasGrant(PERMISSIONS.VISITORS_TAB_DAILY.value),
        history:
          hasGrant(PERMISSIONS.VISITORS_TAB_HISTORY.value),
        bookings:
          hasGrant(PERMISSIONS.VISITORS_TAB_BOOKINGS.value),
        clients:
          hasGrant(PERMISSIONS.VISITORS_TAB_CLIENTS.value),
        },
        modes: {
        standard:
          hasGrant(PERMISSIONS.VISITORS_MODE_STANDARD.value),
        tour:
          hasGrant(PERMISSIONS.VISITORS_MODE_WORKSPACE_TOUR.value),
        walkin_booking:
          hasGrant(PERMISSIONS.VISITORS_MODE_WALKIN_BOOKING.value),
        verify_booking:
          hasGrant(PERMISSIONS.VISITORS_MODE_VERIFY_BOOKING.value),
        },
        standardTypes: {
        standard:
          hasGrant(PERMISSIONS.VISITORS_STANDARD_TYPE_STANDARD.value),
        department:
          hasGrant(PERMISSIONS.VISITORS_STANDARD_TYPE_DEPARTMENT.value),
        tenant:
          hasGrant(PERMISSIONS.VISITORS_STANDARD_TYPE_TENANT.value),
        },
      };

      // Backward/partial-save compatibility:
      // if any Standard Visitor subtab is granted, treat Standard mode as granted.
      if (
        !base.modes.standard &&
        (base.standardTypes.standard || base.standardTypes.department || base.standardTypes.tenant)
      ) {
        base.modes.standard = true;
      }

      return base;
    },
    [memberGrantedModules, userPermissions],
  );
  const [activeTab, setActiveTab] = useState('daily');
  const [bookingStatusTab, setBookingStatusTab] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');

  const currentCalendarDate = new Date();
  const [historyMonth, setHistoryMonth] = useState(currentCalendarDate.toLocaleDateString('en-US', { month: 'long' }));
  const [historyYear, setHistoryYear] = useState(String(currentCalendarDate.getFullYear()));

  const [isLoggingVisitor, setIsLoggingVisitor] = useState(false);
  const [viewingVisitor, setViewingVisitor] = useState(null);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [viewingClient, setViewingClient] = useState(null);
  const [showBadge, setShowBadge] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [reschedulingBooking, setReschedulingBooking] = useState(null);

  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extendingBooking, setExtendingBooking] = useState(null);

  const [visitorMode, setVisitorMode] = useState('standard');
  const lockedTopTabs = useMemo(
    () =>
      new Set(
        Object.entries(visitorAccess.tabs)
          .filter(([, allowed]) => !allowed)
          .map(([tab]) => tab),
      ),
    [visitorAccess.tabs],
  );
  const lockedVisitorModes = useMemo(
    () =>
      new Set(
        Object.entries(visitorAccess.modes)
          .filter(([, allowed]) => !allowed)
          .map(([mode]) => mode),
      ),
    [visitorAccess.modes],
  );
  const canOpenFrontdeskAction =
    visitorAccess.modes.standard ||
    visitorAccess.modes.tour ||
    visitorAccess.modes.walkin_booking ||
    visitorAccess.modes.verify_booking ||
    visitorAccess.standardTypes.standard ||
    visitorAccess.standardTypes.department ||
    visitorAccess.standardTypes.tenant;

  const [walkInStep, setWalkInStep] = useState(1);
  const [availabilityStatus, setAvailabilityStatus] = useState('idle');
  const [extendAvailability, setExtendAvailability] = useState('idle');
  const [isVisitorOverviewLoading, setIsVisitorOverviewLoading] = useState(true);
  const [visitorOverviewError, setVisitorOverviewError] = useState('');
  const [isSubmittingVisitor, setIsSubmittingVisitor] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState(null);
  const [showBookingConfirmationPopup, setShowBookingConfirmationPopup] = useState(false);
  const [visitorHostGroups, setVisitorHostGroups] = useState([]);
  const [meetingRoomCatalog, setMeetingRoomCatalog] = useState([]);
  const [meetingRoomBookings, setMeetingRoomBookings] = useState([]);
  const [bookingClients, setBookingClients] = useState([]);
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const [countryHighlightIndex, setCountryHighlightIndex] = useState(0);
  const [lastSelectedExistingVisitor, setLastSelectedExistingVisitor] = useState(null);
  const tenantCompanyOptions = useMemo(
    () => [...new Set((bookingClients || []).map((client) => String(client?.company || '').trim()).filter(Boolean))],
    [bookingClients],
  );
  const [meetingRoomOverviewError, setMeetingRoomOverviewError] = useState('');

  const [form, setForm] = useState(getDefaultVisitorForm());

  const [cancelForm, setCancelForm] = useState({ reason: '', refundType: 'Full Refund' });
  const [rescheduleForm, setRescheduleForm] = useState({ newDate: '', newStartTime: '', newEndTime: '' });
  const [extendForm, setExtendForm] = useState({ newEndTime: '', paymentMode: 'Cash' });
  const [verifiedBooking, setVerifiedBooking] = useState(null);

  const frontdeskProfile = useMemo(() => {
    const user = auth?.user || {};
    const fullName = `${String(user?.firstName || '').trim()} ${String(user?.lastName || '').trim()}`.trim()
      || String(user?.name || '').trim()
      || String(user?.email || '').trim()
      || 'Frontdesk Reception';
    const role = String(user?.workspaceMembership?.role || user?.role || 'Administration')
      .replace(/[_-]+/g, ' ')
      .trim();

    return {
      name: fullName,
      role: role ? toTitleCase(role) : 'Administration',
    };
  }, [auth?.user]);
  const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const yearsList = ['2025', '2026', '2027'];

  const [liveVisitors, setLiveVisitors] = useState([]);
  const [pendingVisitors, setPendingVisitors] = useState([]);
  const [approvedVisitors, setApprovedVisitors] = useState([]);
  const [checkedInVisitorIds, setCheckedInVisitorIds] = useState(() => new Set());

  const [upcomingBookings, setUpcomingBookings] = useState([]);

  const [visitorHistory, setVisitorHistory] = useState([]);
  const [visitorOverviewRefreshToken, setVisitorOverviewRefreshToken] = useState(0);

  const selectedHostEmployee = useMemo(
    () => {
      if (!form.hostGroupType || !form.hostGroupValue) {
        return null;
      }

      const selectedGroup = visitorHostGroups.find(
        (group) => group.type === form.hostGroupType && group.value === `${form.hostGroupType}:${form.hostGroupValue}`,
      );

      return (selectedGroup?.members || []).find((employee) => String(employee.id || employee.userId || '') === String(form.hostUserId || '')) || null;
    },
    [visitorHostGroups, form.hostGroupType, form.hostGroupValue, form.hostUserId],
  );

  const selectedHostGroup = useMemo(
    () => {
      if (!form.hostGroupType || !form.hostGroupValue) {
        return null;
      }

      return visitorHostGroups.find(
        (group) => group.type === form.hostGroupType && group.value === `${form.hostGroupType}:${form.hostGroupValue}`,
      ) || null;
    },
    [visitorHostGroups, form.hostGroupType, form.hostGroupValue],
  );

  const filteredHostGroups = useMemo(
    () => visitorHostGroups.filter((group) => !form.hostGroupType || group.type === form.hostGroupType),
    [visitorHostGroups, form.hostGroupType],
  );

  const trackedVisitors = useMemo(() => {
    const mergedById = new Map();

    [pendingVisitors, approvedVisitors, liveVisitors].forEach((collection) => {
      collection.forEach((visitor) => {
        const normalizedVisitor = normalizeVisitorTrackingEntry(visitor);
        const visitorId = String(normalizedVisitor?.id || normalizedVisitor?.recordId || '').trim();
        if (!visitorId) {
          return;
        }
        const current = mergedById.get(visitorId);
        if (!current || getVisitorStateRank(normalizedVisitor) >= getVisitorStateRank(current)) {
          mergedById.set(visitorId, normalizedVisitor);
        }
      });
    });
    return Array.from(mergedById.values());
  }, [liveVisitors, approvedVisitors, pendingVisitors]);

  useEffect(() => {
    let isCancelled = false;

    async function loadVisitorOverview() {
      setIsVisitorOverviewLoading(true);

      try {
        const result = await getVisitorManagementOverview();
        if (isCancelled || !result) {
          return;
        }

        const hostGroups = Array.isArray(result.hostGroups) ? result.hostGroups : [];
        const employeeRoster = Array.isArray(result.employeeRoster) ? result.employeeRoster : [];
        setVisitorHostGroups(enrichHostGroupsWithRoster(hostGroups, employeeRoster));
        const nextLiveVisitors = (Array.isArray(result.liveVisitors) ? result.liveVisitors : []).map(normalizeVisitorTrackingEntry);
        setLiveVisitors(nextLiveVisitors);
        setPendingVisitors((Array.isArray(result.pendingVisitors) ? result.pendingVisitors : []).map(normalizeVisitorTrackingEntry));
        setApprovedVisitors((Array.isArray(result.approvedVisitors) ? result.approvedVisitors : []).map(normalizeVisitorTrackingEntry));
        setCheckedInVisitorIds(
          new Set(
            nextLiveVisitors
              .map((visitor) => String(visitor?.recordId || visitor?.id || '').trim())
              .filter(Boolean),
          ),
        );
        setVisitorHistory((Array.isArray(result.visitorHistory) ? result.visitorHistory : []).map(normalizeVisitorTrackingEntry));
        setVisitorOverviewError('');
      } catch (error) {
        if (!isCancelled) {
          setVisitorOverviewError(error.message || 'Failed to load visitor roster.');
        }
      } finally {
        if (!isCancelled) {
          setIsVisitorOverviewLoading(false);
        }
      }
    }

    loadVisitorOverview();
    const refreshTimer = window.setInterval(() => {
      if (!isCancelled) {
        loadVisitorOverview();
      }
    }, 20000);

    return () => {
      isCancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [visitorOverviewRefreshToken]);

  useEffect(() => {
    let isCancelled = false;

    async function loadMeetingRoomOverview() {
      try {
        const result = await getMeetingRoomBookings();
        if (isCancelled || !result) {
          return;
        }

        const data = result?.data || result || {};
        const rooms = Array.isArray(data.roomDetails) ? data.roomDetails : [];
        const bookings = Array.isArray(data.bookings) ? data.bookings : [];
        const clients = Array.isArray(data.clients) ? data.clients : [];
        const normalizedRooms = rooms.map(normalizeMeetingRoom);

        setMeetingRoomCatalog(normalizedRooms);
        setMeetingRoomBookings(bookings);
        setBookingClients(clients);
        setUpcomingBookings(
          bookings
            .filter((booking) => isExternalMeetingBooking(booking))
            .map((booking) => normalizeDailyBooking(booking))
            .filter(Boolean),
        );

        const roomNames = normalizedRooms.map((room) => room.name).filter(Boolean);
        if (roomNames.length > 0) {
          setForm((prev) => {
            const hasSelection = Boolean(prev.spaceType || prev.floor || prev.wing || prev.resourceName);
            if (!hasSelection) {
              return prev;
            }

            const matchingRooms = prev.spaceType
              ? normalizedRooms.filter((room) => room.type === prev.spaceType)
              : normalizedRooms;
            const preferredFloor = prev.floor && matchingRooms.some((room) => room.floor === prev.floor)
              ? prev.floor
              : '';
            const roomsOnPreferredFloor = preferredFloor
              ? matchingRooms.filter((room) => room.floor === preferredFloor)
              : matchingRooms;
            const preferredWing = prev.wing && roomsOnPreferredFloor.some((room) => room.wing === prev.wing)
              ? prev.wing
              : '';
            const roomsOnPreferredWing = preferredWing
              ? roomsOnPreferredFloor.filter((room) => room.wing === preferredWing)
              : roomsOnPreferredFloor;
            const roomStillValid = prev.resourceName && roomsOnPreferredWing.some((room) => room.name === prev.resourceName);

            if (
              preferredFloor === prev.floor &&
              preferredWing === prev.wing &&
              (roomStillValid ? prev.resourceName : '') === prev.resourceName
            ) {
              return prev;
            }

            return {
              ...prev,
              floor: preferredFloor,
              wing: preferredWing,
              resourceName: roomStillValid ? prev.resourceName : '',
              seatNumber: roomStillValid ? prev.seatNumber : '',
            };
          });
        }

        setMeetingRoomOverviewError('');
      } catch (error) {
        if (!isCancelled) {
          setMeetingRoomOverviewError(error.message || 'Failed to load meeting room availability.');
        }
      }
    }

    loadMeetingRoomOverview();
    const refreshTimer = window.setInterval(() => {
      if (!isCancelled) {
        loadMeetingRoomOverview();
      }
    }, 30000);

    return () => {
      isCancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const timeToDecimal = (t) => {
    if (!t) return 0;
    if (t.includes('AM') || t.includes('PM')) {
      const match = t.match(/(\d+):(\d+)\s(AM|PM)/);
      if (!match) return 0;
      let h = parseInt(match[1]);
      const m = parseInt(match[2]);
      const ampm = match[3];
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h + (m / 60);
    } else {
      const [h, m] = t.split(':').map(Number);
      return h + (m / 60);
    }
  };

  const calculateHours = (start, end) => {
    const diff = timeToDecimal(end) - timeToDecimal(start);
    return diff > 0 ? diff : 0;
  };

  const extendPricing = useMemo(() => {
    if (!extendingBooking || !extendForm.newEndTime) return { base: 0, gst: 0, total: 0, extraHours: 0 };

    const currentEndTimeStr = extendingBooking.time.split(' - ')[1].replace(' (Extended)', '');
    const extraHours = calculateHours(currentEndTimeStr, extendForm.newEndTime);

    const matchedRoom = meetingRoomCatalog.find((room) => {
      const bookingName = normalizeText(extendingBooking?.resource || extendingBooking?.roomName || '');
      const roomName = normalizeText(room?.name || '');
      return bookingName && roomName && (bookingName === roomName || bookingName.includes(roomName) || roomName.includes(bookingName));
    });
    const rate = getWalkInRate(matchedRoom || extendingBooking).hourly;

    const basePrice = extraHours * rate;
    const gst = basePrice * 0.18;

    return { base: basePrice, gst, total: basePrice + gst, extraHours };
  }, [extendingBooking, extendForm]);

  const historyPeriods = useMemo(() => {
    const periods = new Map();

    visitorHistory.forEach((visitor) => {
      const month = visitor.month || '';
      const year = visitor.year || '';
      if (!month || !year) return;

      const key = `${month}-${year}`;
      if (periods.has(key)) return;

      const parsed = new Date(`${month} 1, ${year}`);
      periods.set(key, {
        month,
        year,
        sortValue: Number.isNaN(parsed.getTime()) ? Number(year) * 12 : parsed.getFullYear() * 12 + parsed.getMonth(),
      });
    });

    return [...periods.values()].sort((a, b) => a.sortValue - b.sortValue);
  }, [visitorHistory]);

  useEffect(() => {
    if (historyPeriods.length === 0) {
      return;
    }

    const isCurrentSelectionValid = historyPeriods.some((period) => period.month === historyMonth && period.year === historyYear);
    if (!isCurrentSelectionValid) {
      const latest = historyPeriods[historyPeriods.length - 1];
      setHistoryMonth(latest.month);
      setHistoryYear(latest.year);
    }
  }, [historyMonth, historyPeriods, historyYear]);

  const historyMonthOptions = useMemo(() => {
    const options = [...new Set(historyPeriods.map((period) => period.month))];
    return options.length > 0 ? options : monthsList;
  }, [historyPeriods, monthsList]);

  const historyYearOptions = useMemo(() => {
    const options = [...new Set(historyPeriods.map((period) => period.year))];
    return options.length > 0 ? options : [String(new Date().getFullYear())];
  }, [historyPeriods]);

  const displayedHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return visitorHistory.filter((visitor) => {
      const matchesMonth = visitor.month === historyMonth && visitor.year === historyYear;
      if (!matchesMonth) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        visitor.name,
        visitor.company,
        visitor.host,
        visitor.purpose,
        visitor.reason,
        visitor.visitorCode,
        visitor.badgeNo,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [visitorHistory, historyMonth, historyYear, searchQuery]);

  const totalCheckedOutCount = useMemo(
    () => visitorHistory.filter((visitor) => normalizeText(visitor.status || visitor.statusKey || '').replace(/[_-]+/g, ' ') === 'checked out').length,
    [visitorHistory],
  );

  const dailyBookings = useMemo(() => {
    const todayKey = formatDateKey(new Date());
    const query = searchQuery.trim().toLowerCase();

    return upcomingBookings
      .filter((booking) => isExternalMeetingBooking(booking.raw || booking))
      .filter((booking) => formatDateKey(booking.date || booking.raw?.date) === todayKey)
      .filter((booking) => {
        if (!query) {
          return true;
        }

        return [
          booking.id,
          booking.resource,
          booking.bookedBy,
          booking.company,
          booking.email,
          booking.phone,
          booking.paymentStatus,
          booking.status,
          booking.sourceReference,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((left, right) => {
        const leftValue = `${left.date || ''} ${left.time || ''}`;
        const rightValue = `${right.date || ''} ${right.time || ''}`;
        return rightValue.localeCompare(leftValue);
      });
  }, [searchQuery, upcomingBookings]);

  const bookingCollections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = (booking) => {
      if (!query) {
        return true;
      }

      return [
        booking.id,
        booking.resource,
        booking.bookedBy,
        booking.company,
        booking.email,
        booking.phone,
        booking.paymentStatus,
        booking.status,
        booking.sourceReference,
        booking.invoiceNumber,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    };

    const externalBookings = upcomingBookings
      .filter((booking) => isExternalMeetingBooking(booking.raw || booking))
      .filter(matchesSearch);

    return {
      upcoming: externalBookings.filter((booking) => !['Completed', 'Cancelled'].includes(booking.status)),
      completed: externalBookings.filter((booking) => booking.status === 'Completed'),
      cancelled: externalBookings.filter((booking) => booking.status === 'Cancelled'),
    };
  }, [searchQuery, upcomingBookings]);

  const selectedBookingList = bookingCollections[bookingStatusTab] || bookingCollections.upcoming;

  const clientRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const externalBookings = upcomingBookings.filter((booking) => isExternalMeetingBooking(booking.raw || booking));

    return bookingClients
      .map((client) => {
        const clientId = String(client.id || client.recordId || '').trim();
        const clientEmail = normalizeText(client.email || '');
        const clientPhone = normalizeText(client.phone || '');
        const clientName = normalizeText(client.name || '');

        const bookings = externalBookings.filter((booking) => {
          const bookingClientId = String(booking.clientId || booking.raw?.clientId || '').trim();
          if (clientId && bookingClientId && clientId === bookingClientId) return true;
          if (clientEmail && normalizeText(booking.email || booking.raw?.bookedByEmail || '') === clientEmail) return true;
          if (clientPhone && normalizeText(booking.phone || booking.raw?.bookedByPhone || '') === clientPhone) return true;
          if (clientName && normalizeText(booking.bookedBy || booking.raw?.bookedByName || '') === clientName) return true;
          return false;
        });

        return {
          ...client,
          bookings,
          bookingCount: Math.max(Number(client.bookingCount || 0), bookings.length),
          totalBookedAmount: Math.max(
            Number(client.totalBookedAmount || 0),
            bookings.reduce((sum, booking) => sum + Number(booking.totalAmount || booking.amountDue || booking.raw?.totalAmount || 0), 0),
          ),
        };
      })
      .filter((client) => {
        if (!query) return true;
        return [
          client.name,
          client.company,
          client.email,
          client.phone,
          client.clientCode,
          client.source,
        ].join(' ').toLowerCase().includes(query);
      });
  }, [bookingClients, searchQuery, upcomingBookings]);

  const selectedBookingClient = useMemo(
    () => bookingClients.find((client) => String(client.id || client.recordId || '') === String(form.clientId || '')) || null,
    [bookingClients, form.clientId],
  );

  const clientSearchMatches = useMemo(() => {
    const query = form.clientSearch.trim().toLowerCase();
    if (!query) {
      return bookingClients.slice(0, 8);
    }

    return bookingClients
      .filter((client) => [
        client.name,
        client.company,
        client.email,
        client.phone,
        client.clientCode,
      ].join(' ').toLowerCase().includes(query))
      .slice(0, 8);
  }, [bookingClients, form.clientSearch]);

  const savedVisitorDirectory = useMemo(() => {
    const directory = new Map();
    [...trackedVisitors, ...visitorHistory].forEach((visitor) => {
      const phoneKey = normalizePhoneForMatch(visitor?.phone || visitor?.pocPhone || '');
      const emailKey = normalizeText(visitor?.email || visitor?.pocEmail || '');
      const identityKey = phoneKey || emailKey;
      if (!identityKey) {
        return;
      }

      if (!directory.has(identityKey)) {
        directory.set(identityKey, {
          id: visitor?.recordId || visitor?.id || identityKey,
          name: visitor?.name || visitor?.fullName || '',
          phone: visitor?.phone || visitor?.pocPhone || '',
          email: visitor?.email || visitor?.pocEmail || '',
          company: visitor?.company || '',
          purpose: visitor?.purpose || '',
          source: visitor?.source || 'Visitor log',
        });
      }
    });

    return Array.from(directory.values());
  }, [trackedVisitors, visitorHistory]);

  const matchedSavedVisitors = useMemo(() => {
    if (visitorMode === 'verify_booking') {
      return [];
    }

    const phoneQuery = normalizePhoneForMatch(form.phone);
    const emailQuery = normalizeText(form.email);
    if (!phoneQuery && !emailQuery) {
      return [];
    }

    return savedVisitorDirectory
      .filter((visitor) => {
        const visitorPhone = normalizePhoneForMatch(visitor.phone);
        const visitorEmail = normalizeText(visitor.email);
        const phoneMatch = phoneQuery && visitorPhone && (visitorPhone.includes(phoneQuery) || phoneQuery.includes(visitorPhone));
        const emailMatch = emailQuery && visitorEmail && visitorEmail.includes(emailQuery);
        return Boolean(phoneMatch || emailMatch);
      })
      .slice(0, 4);
  }, [form.email, form.phone, savedVisitorDirectory, visitorMode]);

  const applySavedVisitorContact = (visitor) => {
    setForm((prev) => ({
      ...prev,
      name: visitor?.name || prev.name,
      phone: visitor?.phone || prev.phone,
      email: visitor?.email || prev.email,
      company: visitor?.company || prev.company,
      purpose: visitor?.purpose || prev.purpose,
    }));
  };

  const standardVisitorDirectory = useMemo(() => {
    const directory = new Map();

    visitorHistory.forEach((visitor) => {
      const visitorId = String(visitor?.recordId || visitor?.id || visitor?.visitorCode || '').trim();
      if (!visitorId || directory.has(visitorId)) {
        return;
      }

      directory.set(visitorId, {
        id: visitorId,
        visitorCode: visitor?.visitorCode || '',
        name: visitor?.name || visitor?.fullName || '',
        firstName: visitor?.firstName || '',
        lastName: visitor?.lastName || '',
        gender: visitor?.gender || '',
        phone: visitor?.phone || visitor?.pocPhone || '',
        email: visitor?.email || visitor?.pocEmail || '',
        country: visitor?.country || '',
        state: visitor?.state || '',
        city: visitor?.city || '',
        visitorCompanyType: visitor?.visitorCompanyType || (visitor?.company ? 'company' : 'individual'),
        visitorCompany: visitor?.visitorCompany || visitor?.company || '',
        company: visitor?.company || '',
        purpose: visitor?.purpose || '',
        reason: visitor?.reason || '',
        hostGroupType: visitor?.hostGroupType || '',
        hostGroupValue: visitor?.hostGroupValue || '',
        hostUserId: visitor?.hostUserId || '',
        createdAt: visitor?.createdAt || null,
      });
    });

    return Array.from(directory.values());
  }, [visitorHistory]);

  const recentStandardVisitors = useMemo(
    () => standardVisitorDirectory.slice(0, 2),
    [standardVisitorDirectory],
  );

  const standardVisitorSearchMatches = useMemo(() => {
    const query = normalizeText(form.standardVisitorSearch);
    if (!query) {
      return recentStandardVisitors;
    }

    return standardVisitorDirectory
      .filter((visitor) => [
        visitor.name,
        visitor.phone,
        visitor.email,
        visitor.company,
        visitor.visitorCode,
      ].join(' ').toLowerCase().includes(query))
      .slice(0, 8);
  }, [form.standardVisitorSearch, recentStandardVisitors, standardVisitorDirectory]);
  const hasStandardVisitorSearchQuery = normalizeText(form.standardVisitorSearch).length > 0;

  const applyExistingStandardVisitor = (visitor) => {
    setLastSelectedExistingVisitor(visitor || null);
    setForm((prev) => ({
      ...prev,
      firstName: visitor?.firstName || prev.firstName,
      lastName: visitor?.lastName || prev.lastName,
      gender: visitor?.gender || prev.gender,
      name: visitor?.name || `${visitor?.firstName || ''} ${visitor?.lastName || ''}`.trim() || prev.name,
      phone: visitor?.phone || prev.phone,
      email: visitor?.email || prev.email,
      country: visitor?.country || prev.country,
      state: visitor?.state || prev.state,
      city: visitor?.city || prev.city,
      visitorCompanyType: visitor?.visitorCompanyType || (visitor?.company ? 'company' : prev.visitorCompanyType || 'individual'),
      visitorCompany: visitor?.visitorCompanyType === 'company'
        ? (visitor?.visitorCompany || visitor?.company || prev.visitorCompany)
        : (visitor?.company ? visitor.company : prev.visitorCompany),
      company: visitor?.company || prev.company,
      purpose: visitor?.purpose || prev.purpose,
      reason: visitor?.reason || '',
      hostGroupType: visitor?.hostGroupType || '',
      hostGroupValue: visitor?.hostGroupValue || '',
      hostUserId: visitor?.hostUserId || '',
    }));
  };

  const switchStandardVisitorMode = (mode) => {
    setForm((prev) => {
      if (mode === 'new') {
        const reset = getDefaultVisitorForm();
        return {
          ...reset,
          standardVisitorMode: 'new',
          standardVisitorType: prev.standardVisitorType || 'standard',
        };
      }

      return {
        ...prev,
        standardVisitorMode: 'existing',
        standardVisitorSearch: lastSelectedExistingVisitor?.name || prev.standardVisitorSearch || '',
      };
    });
  };

  useEffect(() => {
    if (visitorMode === 'verify_booking' || form.sourceVisitorId || form.clientBookingMode === 'existing') {
      return;
    }

    const primaryMatch = matchedSavedVisitors[0];
    if (!primaryMatch) {
      return;
    }

    setForm((prev) => {
      const next = { ...prev };
      let changed = false;

      if (!prev.name && primaryMatch.name) {
        next.name = primaryMatch.name;
        changed = true;
      }

      if (!prev.company && primaryMatch.company) {
        next.company = primaryMatch.company;
        changed = true;
      }

      if (!prev.purpose && primaryMatch.purpose) {
        next.purpose = primaryMatch.purpose;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [form.clientBookingMode, form.sourceVisitorId, matchedSavedVisitors, visitorMode]);

  const normalizedMeetingRoomCatalog = useMemo(
    () => meetingRoomCatalog.map(normalizeMeetingRoom),
    [meetingRoomCatalog],
  );

  const availableFloors = useMemo(() => {
    const floors = Array.from(new Set(normalizedMeetingRoomCatalog.map((room) => room.floor).filter(Boolean)));
    return floors.length > 0 ? floors : ['501', '601', '701'];
  }, [normalizedMeetingRoomCatalog]);

  const walkInFloorOptions = useMemo(() => {
    if (!form.spaceType) {
      return availableFloors;
    }

    const floors = Array.from(
      new Set(
        normalizedMeetingRoomCatalog
          .filter((room) => room.type === form.spaceType)
          .map((room) => room.floor)
          .filter(Boolean),
      ),
    );

    return floors.length > 0 ? floors : availableFloors;
  }, [availableFloors, form.spaceType, normalizedMeetingRoomCatalog]);

  const walkInWingOptions = useMemo(() => {
    return ['A', 'B'];
  }, []);

  const walkInRoomOptions = useMemo(() => {
    if (!form.spaceType || !form.floor || !form.wing) {
      return [];
    }

    const selectedType = form.spaceType;
    const selectedFloor = form.floor;
    const selectedWing = form.wing;

    return normalizedMeetingRoomCatalog
      .filter((room) => room.type === selectedType && room.floor === selectedFloor && room.wing === selectedWing)
      .map((room) => {
        const assignedToTenant = Boolean(room.assignedTenantCompanyId || room.assignedTenantCompanyName);
        const assignedToDepartment = Boolean(room.assignedDepartmentId || room.assignedDepartmentName);
        const assignmentBlocked = Boolean(room.walkInBlockedByAssignment || assignedToTenant || assignedToDepartment);
        const pricingBlocked = room.activationReady === false || Number(room.credits || 0) <= 0 || (!Number(room.pricePerHour || 0) && !Number(room.pricePerDay || 0));
        const statusBlocked = room.status && room.status !== 'Active';

        let walkInDisableReason = '';
        if ((selectedType === 'Desk' || selectedType === 'Cabin') && assignmentBlocked) {
          walkInDisableReason = assignedToTenant
            ? `Assigned to tenant ${room.assignedTenantCompanyName || ''}`.trim()
            : assignedToDepartment
              ? `Assigned to department ${room.assignedDepartmentName || ''}`.trim()
              : 'Assigned workspace';
        } else if (statusBlocked) {
          walkInDisableReason = room.status === 'Under Maintenance' ? 'Under maintenance' : 'Disabled';
        } else if (pricingBlocked) {
          walkInDisableReason = 'Pricing or credits pending';
        }

        return {
          ...room,
          walkInDisabled: Boolean(walkInDisableReason),
          walkInDisableReason,
        };
      })
      .sort((left, right) => {
        const leftSingle = left.inventoryMode === 'single' ? 0 : 1;
        const rightSingle = right.inventoryMode === 'single' ? 0 : 1;

        if (leftSingle !== rightSingle) {
          return leftSingle - rightSingle;
        }

        return Number(left.capacity || 0) - Number(right.capacity || 0);
      });
  }, [form.floor, form.spaceType, form.wing, normalizedMeetingRoomCatalog]);

  const filteredWalkInRooms = useMemo(
    () => walkInRoomOptions.filter((room) => !room.walkInDisabled),
    [walkInRoomOptions],
  );

  const selectedWalkInRoom = useMemo(() => {
    if (!walkInRoomOptions.length || !form.resourceName) {
      return null;
    }

    return walkInRoomOptions.find((room) => room.name === form.resourceName) || null;
  }, [walkInRoomOptions, form.resourceName]);
  const currentRoundedTime = useMemo(() => roundUpToStepTime(minutesToTime(new Date().getHours() * 60 + new Date().getMinutes())), []);
  const walkInStartTimeOptions = useMemo(() => {
    const minStart = form.startDate && formatDateKey(form.startDate) === formatDateKey(new Date())
      ? currentRoundedTime
      : '00:00';
    return buildTimeOptions(minStart || '00:00');
  }, [currentRoundedTime, form.startDate]);
  const walkInEndTimeOptions = useMemo(() => {
    const minEnd = form.startTime
      ? minutesToTime((timeToMinutes(form.startTime) || 0) + WALK_IN_MIN_DURATION_MINUTES)
      : '00:00';
    return buildTimeOptions(minEnd);
  }, [form.startTime]);

  const isDeskAreaSeatBooking = isDeskAreaRoom(selectedWalkInRoom);
  const selectedSeatNumber = normalizeSeatNumber(form.seatNumber);

  const unavailableSeatNumbers = useMemo(() => {
    if (!selectedWalkInRoom || !isDeskAreaSeatBooking) {
      return new Set();
    }

    const startDateKey = formatDateKey(form.startDate);
    const endDateKey = formatDateKey(form.endDate || form.startDate);
    const startMinutes = timeToMinutes(form.startTime);
    const endMinutes = timeToMinutes(form.endTime);
    if (!startDateKey || !endDateKey || startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
      return new Set();
    }

    const occupiedSeats = new Set();
    const roomCapacity = Math.max(1, Number(selectedWalkInRoom.capacity || 0));

    meetingRoomBookings.forEach((booking) => {
      if (!getOverlapConflict(booking, selectedWalkInRoom.name, startDateKey, endDateKey, startMinutes, endMinutes)) {
        return;
      }

      const bookedSeat = getBookingSeatNumber(booking);
      if (bookedSeat == null) {
        for (let seat = 1; seat <= roomCapacity; seat += 1) {
          occupiedSeats.add(seat);
        }
        return;
      }

      occupiedSeats.add(bookedSeat);
    });

    return occupiedSeats;
  }, [
    form.endDate,
    form.endTime,
    form.startDate,
    form.startTime,
    isDeskAreaSeatBooking,
    meetingRoomBookings,
    selectedWalkInRoom,
  ]);

  const deskSeatOptions = useMemo(() => {
    if (!selectedWalkInRoom || !isDeskAreaSeatBooking) {
      return [];
    }

    const roomCapacity = Math.max(1, Number(selectedWalkInRoom.capacity || 0));
    return Array.from({ length: roomCapacity }, (_, index) => {
      const seatNumber = index + 1;
      return {
        seatNumber,
        available: !unavailableSeatNumbers.has(seatNumber),
      };
    });
  }, [isDeskAreaSeatBooking, selectedWalkInRoom, unavailableSeatNumbers]);

  const attendeeCapacity = Number(selectedWalkInRoom?.capacity || 0);
  const attendeeCount = Number(form.attendees || 0);
  const setAttendeeCount = (nextValue) => {
    if (nextValue === '' || nextValue == null) {
      setForm((prev) => ({
        ...prev,
        attendees: '',
      }));
      return;
    }

    const normalized = Number.isFinite(nextValue) ? Math.max(0, Math.trunc(nextValue)) : 0;
    setForm((prev) => ({
      ...prev,
      attendees: normalized,
    }));
  };

  const hasWalkInQuote = Boolean(
    selectedWalkInRoom &&
    form.startDate &&
    form.endDate &&
    form.startTime &&
    form.endTime &&
    timeToMinutes(form.endTime) != null &&
    timeToMinutes(form.startTime) != null &&
    timeToMinutes(form.endTime) > timeToMinutes(form.startTime)
  );

  const walkInPricing = useMemo(() => {
    const room = selectedWalkInRoom;
    const dateSpanDays = getWalkInDaySpan(form.startDate, form.endDate || form.startDate);
    const { startMinutes, endMinutes } = getWalkInEffectiveMinutes(form);
    const rate = getWalkInRate(room);

    if (!dateSpanDays || startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
      return {
        base: 0,
        discountType: form.discountType || 'amount',
        discountValue: 0,
        discountAmount: 0,
        subtotalBeforeDiscount: 0,
        taxableBaseAfterDiscount: 0,
        gst: 0,
        total: 0,
        durationHours: 0,
        roomRate: rate,
      };
    }

    const durationMinutes = Math.max(30, endMinutes - startMinutes);
    const durationHours = (durationMinutes / 60) * dateSpanDays;
    const subtotalBeforeDiscount = dateSpanDays > 1
      ? rate.daily * dateSpanDays
      : Math.max(rate.hourly, Math.ceil(durationHours * rate.hourly));
    const discountType = form.discountType === 'percent' ? 'percent' : 'amount';
    const rawDiscountValue = Number(form.discountValue || 0);
    const discountValue = Number.isFinite(rawDiscountValue) ? Math.max(rawDiscountValue, 0) : 0;
    const discountAmountRaw = discountType === 'percent'
      ? (subtotalBeforeDiscount * Math.min(discountValue, 100)) / 100
      : discountValue;
    const discountAmount = Math.min(Math.max(discountAmountRaw, 0), subtotalBeforeDiscount);
    const taxableBaseAfterDiscount = Math.max(subtotalBeforeDiscount - discountAmount, 0);
    const gst = taxableBaseAfterDiscount * WALK_IN_GST_RATE;
    return {
      base: taxableBaseAfterDiscount,
      discountType,
      discountValue,
      discountAmount,
      subtotalBeforeDiscount,
      taxableBaseAfterDiscount,
      gst,
      total: taxableBaseAfterDiscount + gst,
      durationHours,
      roomRate: rate,
    };
  }, [form.discountType, form.discountValue, form.endDate, form.endTime, form.startDate, form.startTime, selectedWalkInRoom]);

  const walkInAvailability = useMemo(() => {
    const selectedType = form.spaceType || 'space';
    const room = selectedWalkInRoom;
    const startDateKey = formatDateKey(form.startDate);
    const endDateKey = formatDateKey(form.endDate || form.startDate);
    const { startMinutes, endMinutes } = getWalkInEffectiveMinutes(form);

    if (!form.spaceType) {
      return {
        status: 'pending',
        available: false,
        reason: 'Select a space type to continue.',
        roomSuggestions: [],
        slotSuggestions: [],
        seatSuggestions: [],
        hasConflict: false,
      };
    }

    if (!form.name.trim()) {
      return {
        status: 'pending',
        available: false,
        reason: 'Enter the client name to begin.',
        roomSuggestions: [],
        slotSuggestions: [],
        seatSuggestions: [],
        hasConflict: false,
      };
    }

    if (!form.floor) {
      return {
        status: 'pending',
        available: false,
        reason: 'Select a floor to continue.',
        roomSuggestions: [],
        slotSuggestions: [],
        seatSuggestions: [],
        hasConflict: false,
      };
    }

    if (!form.wing) {
      return {
        status: 'pending',
        available: false,
        reason: 'Select a wing to continue.',
        roomSuggestions: [],
        slotSuggestions: [],
        seatSuggestions: [],
        hasConflict: false,
      };
    }

    if (!room) {
      return {
        status: 'pending',
        available: false,
        reason: `Select a ${selectedType.toLowerCase()} to check availability.`,
        roomSuggestions: [],
        slotSuggestions: [],
        seatSuggestions: [],
        hasConflict: false,
      };
    }

    if (room.walkInDisabled) {
      return {
        status: 'blocked',
        available: false,
        reason: room.walkInDisableReason || 'This room is not available for walk-in booking.',
        roomSuggestions: [],
        slotSuggestions: [],
        seatSuggestions: [],
        hasConflict: false,
      };
    }

    if (!startDateKey || !endDateKey) {
      return {
        status: 'pending',
        available: false,
        reason: 'Select a date to check availability.',
        roomSuggestions: [],
        slotSuggestions: [],
        seatSuggestions: [],
        hasConflict: false,
      };
    }

    if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
      return {
        status: 'pending',
        available: false,
        reason: 'Choose a valid start and end time.',
        roomSuggestions: [],
        slotSuggestions: [],
        seatSuggestions: [],
        hasConflict: false,
      };
    }

    if (!isAlignedToFiveMinuteSlot(startMinutes) || !isAlignedToFiveMinuteSlot(endMinutes)) {
      return {
        status: 'pending',
        available: false,
        reason: 'Use 5-minute slots only (for example 12:20, 12:25, 12:30).',
        roomSuggestions: [],
        slotSuggestions: [],
        seatSuggestions: [],
        hasConflict: false,
      };
    }

    if (endMinutes - startMinutes < WALK_IN_MIN_DURATION_MINUTES) {
      return {
        status: 'pending',
        available: false,
        reason: 'Minimum booking duration is 30 minutes.',
        roomSuggestions: [],
        slotSuggestions: [],
        seatSuggestions: [],
        hasConflict: false,
      };
    }

    if (isDeskAreaSeatBooking && selectedSeatNumber == null) {
      return {
        status: 'pending',
        available: false,
        reason: 'Select an available seat to continue.',
        roomSuggestions: [],
        slotSuggestions: [],
        seatSuggestions: deskSeatOptions.filter((seat) => seat.available).map((seat) => seat.seatNumber),
        hasConflict: false,
      };
    }

    const hasConflict = meetingRoomBookings.some((booking) => {
      if (!getOverlapConflict(booking, room.name, startDateKey, endDateKey, startMinutes, endMinutes)) {
        return false;
      }

      if (!isDeskAreaSeatBooking) {
        return true;
      }

      const bookedSeat = getBookingSeatNumber(booking);
      if (bookedSeat == null || selectedSeatNumber == null) {
        return true;
      }

      return bookedSeat === selectedSeatNumber;
    });

    if (hasConflict) {
      const suggestions = buildWalkInSuggestions(
        meetingRoomBookings,
        filteredWalkInRooms.length > 0 ? filteredWalkInRooms : meetingRoomCatalog,
        room,
        form.startDate,
        form.endDate || form.startDate,
        form.startTime,
        form.endTime,
      );

      return {
        status: 'conflict',
        available: false,
        reason: isDeskAreaSeatBooking
          ? 'Selected seat is already booked. Try another seat or time.'
          : 'This slot is already booked. Try a different room or time.',
        roomSuggestions: suggestions.roomSuggestions,
        slotSuggestions: suggestions.slotSuggestions,
        seatSuggestions: isDeskAreaSeatBooking ? deskSeatOptions.filter((seat) => seat.available).map((seat) => seat.seatNumber) : [],
        hasConflict: true,
      };
    }

    return {
      status: 'available',
      available: true,
      reason: 'Slot is open and pricing is ready.',
      roomSuggestions: [],
      slotSuggestions: [],
      seatSuggestions: [],
      hasConflict: false,
    };
  }, [
    deskSeatOptions,
    filteredWalkInRooms,
    form.endDate,
    form.endTime,
    form.floor,
    form.name,
    form.seatNumber,
    form.spaceType,
    form.startDate,
    form.startTime,
    form.wing,
    isDeskAreaSeatBooking,
    meetingRoomBookings,
    meetingRoomCatalog,
    selectedSeatNumber,
    selectedWalkInRoom,
  ]);

  const isCompactMode = visitorMode === 'standard' || visitorMode === 'walkin_booking' || visitorMode === 'verify_booking' || visitorMode === 'tour';
  const isStandardVisitorType = form.standardVisitorType === 'standard';
  const isDepartmentVisitorType = form.standardVisitorType === 'department';
  const isTenantVisitorType = form.standardVisitorType === 'tenant';
  const countryOptions = useMemo(() => Country.getAllCountries(), []);
  const selectedCountryOption = useMemo(
    () => countryOptions.find((country) => country.name === form.country) || null,
    [countryOptions, form.country],
  );
  const filteredCountryOptions = useMemo(() => {
    const query = String(countrySearch || '').trim().toLowerCase();
    if (!query) return countryOptions.slice(0, 120);
    return countryOptions
      .filter((country) => country.name.toLowerCase().includes(query))
      .slice(0, 120);
  }, [countryOptions, countrySearch]);
  const stateOptions = useMemo(
    () => (selectedCountryOption?.isoCode ? State.getStatesOfCountry(selectedCountryOption.isoCode) : []),
    [selectedCountryOption?.isoCode],
  );
  const selectedStateOption = useMemo(
    () => stateOptions.find((state) => state.name === form.state) || null,
    [form.state, stateOptions],
  );
  const cityOptions = useMemo(
    () => (selectedCountryOption?.isoCode && selectedStateOption?.isoCode
      ? City.getCitiesOfState(selectedCountryOption.isoCode, selectedStateOption.isoCode)
      : []),
    [selectedCountryOption?.isoCode, selectedStateOption?.isoCode],
  );

  useEffect(() => {
    if (!form.country) {
      setCountrySearch('');
      return;
    }
    const match = countryOptions.find((country) => country.name === form.country);
    setCountrySearch(match ? match.name : form.country);
  }, [countryOptions, form.country]);

  useEffect(() => {
    if (!showCountrySuggestions) return;
    setCountryHighlightIndex(0);
  }, [countrySearch, showCountrySuggestions]);

  const isStandardFormComplete = useMemo(() => {
    const firstName = String(form.firstName || '').trim();
    const lastName = String(form.lastName || '').trim();
    const gender = String(form.gender || '').trim();
    const phone = String(form.phone || '').trim();
    const email = String(form.email || '').trim();
    const purpose = String(form.purpose || '').trim();
    const note = String(form.reason || '').trim();

    if (!firstName || !lastName || !gender || !phone || !email || !form.country || !form.state || !form.city || !purpose) return false;
    if (!isValidName(firstName) || !isValidName(lastName)) return false;
    if (!isValidPhone(phone)) return false;
    if (!isValidEmail(email)) return false;
    if (form.visitorCompanyType === 'company' && !String(form.visitorCompany || '').trim()) return false;

    if (isDepartmentVisitorType) {
      return Boolean(form.hostGroupType && form.hostGroupValue && form.hostUserId && note);
    }

    if (isTenantVisitorType) {
      return Boolean(form.tenantCompanyName && form.hostGroupValue && form.hostUserId);
    }

    return true;
  }, [form, isDepartmentVisitorType, isTenantVisitorType]);

  useEffect(() => {
    if (lockedTopTabs.has(activeTab)) {
      setActiveTab('daily');
    }
  }, [activeTab, lockedTopTabs]);

  useEffect(() => {
    if (lockedVisitorModes.has(visitorMode)) {
      const firstAllowedMode = ['standard', 'tour', 'walkin_booking', 'verify_booking'].find(
        (mode) => !lockedVisitorModes.has(mode),
      );
      if (firstAllowedMode) {
        setVisitorMode(firstAllowedMode);
      }
    }
  }, [lockedVisitorModes, visitorMode]);

  useEffect(() => {
    if (!form.spaceType || !form.floor || !form.wing || !walkInRoomOptions.length) {
      if (form.resourceName || form.seatNumber) {
        setForm((prev) => ({
          ...prev,
          resourceName: '',
          seatNumber: '',
        }));
      }
      return;
    }

    const match = walkInRoomOptions.find((room) => room.name === form.resourceName);
    if (form.resourceName && (!match || match.walkInDisabled)) {
      setForm((prev) => ({
        ...prev,
        resourceName: '',
        seatNumber: '',
      }));
    }
  }, [form.floor, form.resourceName, form.seatNumber, form.spaceType, form.wing, walkInRoomOptions]);

  useEffect(() => {
    if (!selectedWalkInRoom) {
      return;
    }

    if (!isDeskAreaSeatBooking) {
      if (form.seatNumber !== '') {
        setForm((prev) => ({
          ...prev,
          seatNumber: '',
        }));
      }
      return;
    }

    const firstAvailableSeat = deskSeatOptions.find((seat) => seat.available)?.seatNumber;
    const currentSeat = normalizeSeatNumber(form.seatNumber);
    const isCurrentSeatAvailable =
      currentSeat != null &&
      deskSeatOptions.some((seat) => seat.seatNumber === currentSeat && seat.available);

    const nextSeat = isCurrentSeatAvailable ? currentSeat : firstAvailableSeat || '';
    const attendees = Number(form.attendees || 0);
    const nextSeatValue = nextSeat === '' ? '' : String(nextSeat);

    if (attendees !== 1 || String(form.seatNumber || '') !== nextSeatValue) {
      setForm((prev) => ({
        ...prev,
        attendees: 1,
        seatNumber: nextSeatValue,
      }));
    }
  }, [deskSeatOptions, form.attendees, form.seatNumber, isDeskAreaSeatBooking, selectedWalkInRoom]);

  const handleVerifySearch = () => {
    const normalizedId = String(form.bookingId || '').trim().toUpperCase();
    const backendMatch = meetingRoomBookings.find((booking) => String(booking.id || booking.bookingCode || booking.recordId || '').toUpperCase() === normalizedId);
    const localMatch = upcomingBookings.find((booking) => String(booking.id || booking.bookingCode || booking.recordId || '').toUpperCase() === normalizedId);
    const found = backendMatch ? normalizeVerifiedBooking(backendMatch) : localMatch;
    if (found) {
      setVerifiedBooking(found);
      setBookingConfirmation(null);
      return;
    }

    setVerifiedBooking(null);
    setBookingConfirmation(null);
    alert('Booking ID not found for today.');
  };

  const handleCheckExtendAvailability = () => {
    if (!extendingBooking || !extendForm.newEndTime) {
      return;
    }

    const currentStartTime = extendingBooking?.raw?.startTime || extendingBooking?.startTime || '';
    const currentEndTime = extendingBooking?.raw?.endTime || '';
    const currentStartMinutes = timeToMinutes(currentStartTime);
    const currentEndMinutes = timeToMinutes(currentEndTime);
    const newEndMinutes = timeToMinutes(extendForm.newEndTime);

    if (currentStartMinutes == null || currentEndMinutes == null || newEndMinutes == null) {
      alert('Choose valid booking times.');
      return;
    }

    if (newEndMinutes <= currentEndMinutes) {
      alert('New end time must be later than the current end time.');
      return;
    }

    if (!isAlignedToFiveMinuteSlot(newEndMinutes)) {
      alert('Use 5-minute slots only (for example 12:20, 12:25, 12:30).');
      return;
    }

    if (newEndMinutes - currentStartMinutes < WALK_IN_MIN_DURATION_MINUTES) {
      alert('Minimum booking duration is 30 minutes.');
      return;
    }

    setExtendAvailability('checking');
    setTimeout(() => {
      const bookingDateKey = formatDateKey(extendingBooking?.date || extendingBooking?.raw?.date || '');
      const currentRoomName = extendingBooking?.raw?.roomName || extendingBooking?.resource || '';
      const currentBookingId = String(extendingBooking?.recordId || extendingBooking?.id || '').trim();

      if (!bookingDateKey || currentStartMinutes == null || newEndMinutes == null) {
        setExtendAvailability('conflict');
        return;
      }

      const hasConflict = meetingRoomBookings.some((booking) => {
        const bookingId = String(booking.recordId || booking.id || booking.bookingCode || '').trim();
        if (bookingId && bookingId === currentBookingId) {
          return false;
        }

        return getOverlapConflict(
          booking,
          currentRoomName,
          bookingDateKey,
          bookingDateKey,
          currentStartMinutes,
          newEndMinutes,
        );
      });

      setExtendAvailability(hasConflict ? 'conflict' : 'available');
    }, 800);
  };

  const syncDailyBookingState = (booking) => {
    const normalizedBooking = normalizeDailyBooking(booking);
    if (!normalizedBooking) {
      return null;
    }

    setMeetingRoomBookings((prev) => [
      booking,
      ...prev.filter((entry) => String(entry.recordId || entry.id || entry.bookingCode || '').trim() !== normalizedBooking.recordId && String(entry.id || entry.bookingCode || '').trim().toUpperCase() !== normalizedBooking.id),
    ]);

    setUpcomingBookings((prev) => [
      normalizedBooking,
      ...prev.filter((entry) => String(entry.recordId || entry.id || entry.bookingCode || '').trim() !== normalizedBooking.recordId && String(entry.id || entry.bookingCode || '').trim().toUpperCase() !== normalizedBooking.id),
    ]);

    return normalizedBooking;
  };

  const refreshBookingClients = async (search = '') => {
    try {
      const response = await getMeetingRoomClients({ search, limit: 30 });
      const clients = response?.data?.clients || response?.clients || [];
      if (Array.isArray(clients)) {
        setBookingClients(clients);
      }
    } catch (error) {
      console.warn('Unable to refresh booking clients.', error);
    }
  };

  const openBookingFromVisitor = (visitor) => {
    const visitorId = visitor?.recordId || visitor?.id || '';
    const now = new Date();
    const defaultStartTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    const defaultEndTime = `${String(nextHour.getHours()).padStart(2, '0')}:${String(nextHour.getMinutes()).padStart(2, '0')}`;
    const today = formatDateKey(now);

    setVisitorMode('walkin_booking');
    setWalkInStep(1);
    setBookingConfirmation(null);
    setShowBookingConfirmationPopup(false);
    setVerifiedBooking(null);
    setViewingVisitor(null);
    setForm({
      ...getDefaultVisitorForm(),
      clientBookingMode: 'new',
      sourceVisitorId: visitorId,
      name: visitor?.name || visitor?.fullName || '',
      phone: visitor?.phone || visitor?.pocPhone || '',
      email: visitor?.email || visitor?.pocEmail || '',
      company: visitor?.company || '',
      attendees: visitor?.seatCount || visitor?.teamSize || 1,
      purpose: 'Walk-in Booking',
      startDate: today,
      endDate: today,
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      bookingNotes: `Converted from visitor ${visitor?.visitorCode || visitorId}`.trim(),
    });
    setIsLoggingVisitor(true);
  };

  const applyExistingClient = (client) => {
    setForm((prev) => ({
      ...prev,
      clientBookingMode: 'existing',
      clientId: client.id || client.recordId || '',
      clientSearch: client.name || client.company || '',
      name: client.name || prev.name,
      phone: client.phone || prev.phone,
      email: client.email || prev.email,
      company: client.company || prev.company,
    }));
  };

  const handleProcessAction = async () => {
    const fullName = `${String(form.firstName || '').trim()} ${String(form.lastName || '').trim()}`.trim();
    if (!fullName && visitorMode !== 'verify_booking' && visitorMode !== 'tour') return alert("Visitor name is required.");
    const normalizedCompany = form.visitorCompanyType === 'company'
      ? String(form.visitorCompany || '').trim()
      : 'Individual';
    const normalizedEmail = form.email.trim();

    if (visitorMode !== 'verify_booking' && !normalizedEmail) {
      return alert('Email is required.');
    }

    const newId = `VIS-${Math.floor(Math.random() * 9000) + 1000}`;
    const badge = `B-${Math.floor(Math.random() * 900) + 100}`;
    const timeNow = formatTimeLabel(new Date());

    let finalRecord = {
      id: newId, name: fullName, phone: form.phone, company: normalizedCompany,
      checkIn: timeNow, checkOut: '--:--', status: 'Checked In', badgeNo: badge
    };

    if (visitorMode === 'standard') {
      if (!isStandardFormComplete) return alert('Please complete all required fields with valid details.');
      const isDepartmentVisitor = form.standardVisitorType === 'department';
      const isTenantVisitor = form.standardVisitorType === 'tenant';

      if (!isDepartmentVisitor) {
        setIsSubmittingVisitor(true);
        try {
          const result = await createVisitorLog({
            firstName: form.firstName,
            lastName: form.lastName,
            fullName,
            gender: form.gender,
            phone: form.phone,
            email: normalizedEmail,
            country: form.country,
            state: form.state,
            city: form.city,
            company: normalizedCompany,
            visitorCompanyType: form.visitorCompanyType,
            visitorType: form.standardVisitorType,
            tenantCompanyName: isTenantVisitor ? form.tenantCompanyName : '',
            purpose: form.purpose || 'Exploring Services',
            hostName: 'Front Desk',
            reason: form.reason?.trim() || form.purpose || 'General Visit',
            notes: form.reason?.trim() || '',
            hostRole: isTenantVisitor ? form.hostGroupValue : '',
            hostUserId: isTenantVisitor ? form.hostUserId || undefined : undefined,
            meetingTargetType: isTenantVisitor ? 'tenant-role' : '',
            meetingTargetValue: isTenantVisitor ? form.hostGroupValue : '',
            status: 'checked_in',
          });

          const createdVisitor = result?.visitor || null;
          const normalizedVisitor = createdVisitor
            ? normalizeVisitorTrackingEntry(createdVisitor)
            : normalizeVisitorTrackingEntry({
              ...finalRecord,
              purpose: form.purpose || 'Exploring Services',
              department: 'Frontdesk',
              host: 'Front Desk',
              reason: form.reason?.trim() || form.purpose || 'General Visit',
              approvalStatus: 'approved',
              approvalStatusLabel: 'Direct Check-in',
              statusKey: 'checked_in',
            });

          setLiveVisitors((prev) => [
            normalizedVisitor,
            ...prev.filter((entry) => !isSameVisitorEntry(entry, normalizedVisitor)),
          ]);
          setCheckedInVisitorIds((prev) => {
            const next = new Set(prev);
            const visitorId = String(normalizedVisitor.recordId || normalizedVisitor.id || '').trim();
            if (visitorId) next.add(visitorId);
            return next;
          });
          setVisitorOverviewRefreshToken((value) => value + 1);
          setShowBadge({
            ...normalizedVisitor,
            notes: 'Visitor checked in successfully.',
          });

          setIsLoggingVisitor(false);
          setVerifiedBooking(null);
          setWalkInStep(1);
          setForm(getDefaultVisitorForm());
        } catch (error) {
          alert(error.message || 'Unable to check in visitor right now.');
        } finally {
          setIsSubmittingVisitor(false);
        }

        return;
      }

      if (!form.hostGroupType || !form.hostGroupValue) return alert('Please choose a role or department.');
      if (!form.hostUserId) return alert('Please select a present employee.');
      if (!form.reason.trim()) return alert('Note is required for department visitor.');

      setIsSubmittingVisitor(true);

      try {
        const result = await createVisitorLog({
          firstName: form.firstName,
          lastName: form.lastName,
          fullName,
          gender: form.gender,
          phone: form.phone,
          email: normalizedEmail,
          country: form.country,
          state: form.state,
          city: form.city,
          company: normalizedCompany,
          visitorCompanyType: form.visitorCompanyType,
          visitorType: form.standardVisitorType,
          tenantCompanyName: '',
          purpose: form.purpose,
          hostGroupType: form.hostGroupType,
          hostGroupValue: form.hostGroupValue,
          hostUserId: form.hostUserId || undefined,
          reason: form.reason || form.purpose || 'Department visit',
          meetingTargetType: form.hostGroupType,
          meetingTargetValue: form.hostGroupValue,
          notes: '',
        });

        const createdVisitor = result?.visitor || null;
        if (createdVisitor) {
          setPendingVisitors((prev) => [
            createdVisitor,
            ...prev.filter((entry) => !isSameVisitorEntry(entry, createdVisitor)),
          ]);
          setVisitorOverviewRefreshToken((value) => value + 1);
          alert(`Request sent to ${selectedHostEmployee?.fullName || 'the selected employee'}.`);
        }

        if (Array.isArray(result?.hostGroups) || Array.isArray(result?.employeeRoster)) {
          setVisitorHostGroups(
            enrichHostGroupsWithRoster(
              Array.isArray(result?.hostGroups) ? result.hostGroups : [],
              Array.isArray(result?.employeeRoster) ? result.employeeRoster : [],
            ),
          );
        }

        setIsLoggingVisitor(false);
        setVerifiedBooking(null);
        setWalkInStep(1);
        setForm(getDefaultVisitorForm());
      } catch (error) {
        alert(error.message || 'Unable to log visitor right now.');
      } finally {
        setIsSubmittingVisitor(false);
      }

      return;
    }
    else if (visitorMode === 'tour') {
      const visitorName = form.pocName.trim();
      const contactPhone = form.pocPhone.trim() || form.phone.trim();
      const contactEmail = form.pocEmail.trim() || normalizedEmail;
      const requiredTourFields = [
        [visitorName, 'POC name is required for a sales tour.'],
        [contactPhone, 'POC phone number is required for a sales tour.'],
        [contactEmail, 'POC email is required for a sales tour.'],
        [form.industry.trim(), 'Industry is required for a sales tour.'],
        [form.teamSize.trim() || form.seatCount.trim(), 'Company size or seat count is required for a sales tour.'],
        [form.preferredSpace.trim(), 'Preferred space is required for a sales tour.'],
        [form.budgetRange.trim(), 'Budget range is required for a sales tour.'],
        [form.moveInTimeline.trim(), 'Move-in timeline is required for a sales tour.'],
        [form.preferredContactMethod.trim(), 'Preferred contact method is required for a sales tour.'],
      ];
      const missingTourField = requiredTourFields.find(([value]) => !String(value || '').trim());
      if (missingTourField) return toast.error(missingTourField[1]);
      setIsSubmittingVisitor(true);
      const loadingToastId = toast.loading('Checking in visitor and syncing lead...', {
        description: 'Saving the visit for Administration and Sales follow-up.',
      });

      try {
        const result = await createVisitorLog({
          fullName: visitorName,
          phone: contactPhone,
          email: contactEmail,
          company: normalizedCompany,
          industry: form.industry,
          teamSize: form.teamSize,
          seatCount: form.seatCount,
          preferredSpace: form.preferredSpace,
          budgetRange: form.budgetRange,
          moveInTimeline: form.moveInTimeline,
          pocName: form.pocName,
          pocDesignation: form.pocDesignation,
          pocPhone: form.pocPhone,
          pocEmail: form.pocEmail,
          preferredContactMethod: form.preferredContactMethod,
          followUpDate: form.followUpDate,
          tourNotes: form.tourNotes,
          status: 'checked_in',
          purpose: 'Workspace Tour',
          hostName: 'Administration Desk',
          reason: form.reason?.trim() || 'Workspace tour enquiry.',
          notes: form.tourNotes || 'Lead forwarded to CRM.',
        });

        const createdVisitor = result?.visitor || null;
        if (createdVisitor) {
          setPendingVisitors((prev) => [
            createdVisitor,
            ...prev.filter((entry) => !isSameVisitorEntry(entry, createdVisitor)),
          ]);
          setVisitorOverviewRefreshToken((value) => value + 1);
          toast.success('Visitor checked in and synced to CRM.', {
            id: loadingToastId,
            description: 'Administration logged the check-in. Sales can follow up from CRM.',
          });
        } else {
          toast.success('Visitor checked in and synced to CRM.', {
            id: loadingToastId,
          });
        }

        if (Array.isArray(result?.hostGroups) || Array.isArray(result?.employeeRoster)) {
          setVisitorHostGroups(
            enrichHostGroupsWithRoster(
              Array.isArray(result?.hostGroups) ? result.hostGroups : [],
              Array.isArray(result?.employeeRoster) ? result.employeeRoster : [],
            ),
          );
        }

        finalRecord = {
          ...finalRecord,
          name: visitorName,
          phone: contactPhone,
          status: 'Checked In',
          purpose: 'Workspace Tour',
          department: 'Administration',
          host: 'Administration Desk',
          pocName: form.pocName,
          pocDesignation: form.pocDesignation,
          pocPhone: form.pocPhone,
          pocEmail: form.pocEmail,
          preferredContactMethod: form.preferredContactMethod,
          followUpDate: form.followUpDate,
          notes: form.tourNotes || 'Lead forwarded to CRM.',
        };
        setLiveVisitors([finalRecord, ...liveVisitors]);
        setIsLoggingVisitor(false);
        setVerifiedBooking(null);
        setWalkInStep(1);
        setForm(getDefaultVisitorForm());
      } catch (error) {
        toast.error(error.message || 'Unable to check in the visitor right now.', {
          id: loadingToastId,
        });
      } finally {
        setIsSubmittingVisitor(false);
      }
    }
    else if (visitorMode === 'walkin_booking') {
      if (!walkInAvailability.available) return alert(walkInAvailability.reason || 'Please choose an available slot.');
      if (!form.phone.trim()) return alert('Phone number is required for walk-in bookings.');
      if (!form.paymentMode) return alert('Select a payment mode for this booking.');
      const isGPayBooking = normalizeText(form.paymentMode).includes('gpay');
      if (isGPayBooking && !form.transactionId.trim()) {
        return alert('Transaction number is required for GPay bookings.');
      }
      if (isGPayBooking && !form.paymentProofFile) {
        return alert('Upload the payment screenshot for GPay bookings.');
      }
      if (form.discountType === 'percent' && walkInPricing.discountValue > 100) {
        return alert('Discount percentage cannot be greater than 100.');
      }
      if (form.discountType === 'amount' && walkInPricing.discountAmount > walkInPricing.subtotalBeforeDiscount) {
        return alert('Discount amount cannot be greater than base amount.');
      }
      const walkInSeatNumber = normalizeSeatNumber(form.seatNumber);
      const bookingAttendees = isDeskAreaSeatBooking ? 1 : attendeeCount;

      if (isDeskAreaSeatBooking && walkInSeatNumber == null) {
        return alert('Select an available seat for this desk area booking.');
      }

      if (bookingAttendees < 1) return alert('Enter the attendee count.');

      if (!isDeskAreaSeatBooking && attendeeCapacity && bookingAttendees > attendeeCapacity) {
        return alert(`Attendees cannot exceed ${attendeeCapacity} seats for this room.`);
      }

      let createdBooking = null;
      setIsSubmittingVisitor(true);
      try {
        const bookingPayload = new FormData();
        const bookingFields = {
          bookingType: 'External',
          bookingSource: 'Frontdesk',
          bookedByName: form.name,
          bookedByEmail: normalizedEmail,
          bookedByPhone: form.phone,
          clientCompany: normalizedCompany,
          clientId: form.clientBookingMode === 'existing' ? form.clientId : '',
          sourceVisitorId: form.sourceVisitorId || '',
          roomName: selectedWalkInRoom?.name || form.resourceName,
          floor: selectedWalkInRoom?.floor || form.floor || '',
          date: form.startDate,
          startTime: form.startTime,
          endTime: form.endTime,
          purpose: form.purpose || 'Walk-in Booking',
          attendees: bookingAttendees,
          seatNumber: isDeskAreaSeatBooking ? walkInSeatNumber : undefined,
          paymentMode: form.paymentMode,
          paymentStatus: form.paymentMode === 'Cash' ? 'Cash Collected' : 'Payment Completed',
          financeStatus: form.paymentMode === 'Cash' ? 'Invoice Pending' : 'Sent To Finance',
          paymentVerificationStatus: form.paymentMode === 'Cash' ? '' : 'Pending',
          transactionId: form.transactionId.trim(),
          discountType: walkInPricing.discountType,
          discountValue: walkInPricing.discountValue,
          discountAmount: walkInPricing.discountAmount,
          subtotalBeforeDiscount: walkInPricing.subtotalBeforeDiscount,
          taxableBaseAfterDiscount: walkInPricing.taxableBaseAfterDiscount,
          baseAmount: walkInPricing.base,
          gstAmount: walkInPricing.gst,
          totalAmount: walkInPricing.total,
          sourceReference: form.sourceVisitorId ? `Visitor ${form.sourceVisitorId}` : 'Visitors Management',
          bookingNotes: form.bookingNotes || `Walk-in confirmed via ${form.paymentMode}. Visitors Management capture.`,
        };

        Object.entries(bookingFields).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') {
            return;
          }
          bookingPayload.append(key, value);
        });

        if (isGPayBooking && form.paymentProofFile) {
          bookingPayload.append('paymentProof', form.paymentProofFile);
        }

        const response = await createMeetingRoomBooking(bookingPayload);

        createdBooking = response?.data?.booking || response?.booking || null;
        if (createdBooking) {
          const normalizedBooking = normalizeDailyBooking(createdBooking);
          setBookingConfirmation({
            bookingId: normalizedBooking.id,
            email: normalizedEmail,
            paymentMode: form.paymentMode,
            totalAmount: Number(createdBooking.totalAmount || walkInPricing.total || 0),
            roomName: normalizedBooking.resource,
            transactionId: form.transactionId.trim(),
          });
          setShowBookingConfirmationPopup(true);
          syncDailyBookingState(createdBooking);
          refreshBookingClients();

          if (form.sourceVisitorId) {
            try {
              const checkOutResponse = await checkOutVisitorLog(form.sourceVisitorId, {
                convertedToClient: true,
                convertedClientId: createdBooking.clientId || '',
                convertedBookingId: createdBooking.recordId || createdBooking._id || '',
                notes: `Converted to client booking ${normalizedBooking.id}.`,
              });
              const checkedOutVisitor = checkOutResponse?.visitor || checkOutResponse?.data?.visitor || null;

              if (checkedOutVisitor) {
                const normalizedCheckedOutVisitor = normalizeVisitorTrackingEntry(checkedOutVisitor);
                setLiveVisitors((prev) => prev.filter((visitor) => !isSameVisitorEntry(visitor, normalizedCheckedOutVisitor)));
                setVisitorHistory((prev) => [
                  normalizedCheckedOutVisitor,
                  ...prev.filter((visitor) => !isSameVisitorEntry(visitor, normalizedCheckedOutVisitor)),
                ]);
                setCheckedInVisitorIds((prev) => {
                  const next = new Set(prev);
                  next.delete(String(normalizedCheckedOutVisitor.id || normalizedCheckedOutVisitor.recordId || ''));
                  return next;
                });
                setVisitorOverviewRefreshToken((value) => value + 1);
              }
            } catch (checkoutError) {
              console.warn('Booking created, but visitor conversion checkout failed.', checkoutError);
              toast.warning('Booking created, but visitor checkout needs manual review.', {
                description: checkoutError.message || 'Please check out the visitor from Daily Visitors.',
              });
            }
          }
        }

      } catch (error) {
        alert(error.message || 'Unable to create walk-in booking right now.');
      } finally {
        setIsSubmittingVisitor(false);
      }
      return;
    }
    else if (visitorMode === 'verify_booking' && verifiedBooking) {
      try {
        const response = await updateMeetingRoomBooking(verifiedBooking.recordId || verifiedBooking.id, {
          status: 'in progress',
        });
        const updatedBooking = response?.data?.booking || response?.booking || null;
        if (updatedBooking) {
          syncDailyBookingState(updatedBooking);
        }
      } catch (error) {
        alert(error.message || 'Unable to mark the meeting as in progress.');
        return;
      }

      finalRecord = {
        ...finalRecord, name: verifiedBooking.bookedBy, company: verifiedBooking.company, phone: verifiedBooking.phone,
        purpose: 'Pre-booked Space', department: 'Admin', host: 'Self',
        notes: `Booking ${verifiedBooking.id} Verified. ${verifiedBooking.status === 'Pending Payment' ? `Payment collected via ${form.paymentMode}` : 'Pre-paid'}.`
      };
      setLiveVisitors([finalRecord, ...liveVisitors]);
    }

    setIsLoggingVisitor(false);
    setShowBadge(finalRecord);
    setVerifiedBooking(null);
    setWalkInStep(1);
    setForm(getDefaultVisitorForm());
  };

  const handleExtendBooking = (e) => {
    e.preventDefault();
    if (extendAvailability !== 'available') return;

    const bookingId = extendingBooking?.recordId || extendingBooking?.id;
    if (!bookingId) {
      alert('Booking details are missing.');
      return;
    }

    const currentTotalAmount = Number(extendingBooking?.raw?.totalAmount || extendingBooking?.amountDue || extendingBooking?.totalAmount || 0);
    const nextTotalAmount = currentTotalAmount + extendPricing.total;

    updateMeetingRoomBooking(bookingId, {
      endTime: extendForm.newEndTime,
      status: 'in progress',
      extensionAmount: extendPricing.total,
      baseAmount: Number(extendingBooking?.raw?.baseAmount || extendingBooking?.baseAmount || 0),
      discountType: extendingBooking?.raw?.discountType || extendingBooking?.discountType || 'amount',
      discountValue: Number(extendingBooking?.raw?.discountValue || extendingBooking?.discountValue || 0),
      discountAmount: Number(extendingBooking?.raw?.discountAmount || extendingBooking?.discountAmount || 0),
      subtotalBeforeDiscount: Number(extendingBooking?.raw?.subtotalBeforeDiscount || extendingBooking?.subtotalBeforeDiscount || extendingBooking?.raw?.baseAmount || extendingBooking?.baseAmount || 0),
      taxableBaseAfterDiscount: Number(extendingBooking?.raw?.taxableBaseAfterDiscount || extendingBooking?.taxableBaseAfterDiscount || extendingBooking?.raw?.baseAmount || extendingBooking?.baseAmount || 0),
      gstAmount: Number(extendingBooking?.raw?.gstAmount || extendingBooking?.gstAmount || 0),
      totalAmount: nextTotalAmount,
      paymentMode: extendForm.paymentMode,
      paymentStatus: extendForm.paymentMode === 'Cash' ? 'Cash collected at frontdesk' : 'Payment collected at frontdesk',
      financeStatus: extendForm.paymentMode === 'Cash' ? 'Invoice Pending' : 'Not Required',
    })
      .then((response) => {
        const updatedBooking = response?.data?.booking || response?.booking || null;
        if (updatedBooking) {
          syncDailyBookingState(updatedBooking);
          if (viewingBooking && String(viewingBooking.recordId || viewingBooking.id) === String(updatedBooking.recordId || updatedBooking.id)) {
            setViewingBooking(normalizeDailyBooking(updatedBooking));
          }
        }

        alert(`System: Extension confirmed. Extension charge of ${formatCurrency(extendPricing.total)} collected. Total booking value updated to ${formatCurrency(nextTotalAmount)}.`);
        setIsExtendModalOpen(false);
        setExtendingBooking(null);
        setExtendAvailability('idle');
        setExtendForm({ newEndTime: '', paymentMode: 'Cash' });
      })
      .catch((error) => {
        alert(error.message || 'Unable to extend the meeting right now.');
      });
  };

  const handleCheckOut = async (id) => {
    try {
      const response = await checkOutVisitorLog(id, {});
      const checkedOutVisitor = response?.visitor || response?.data?.visitor || null;

      if (checkedOutVisitor) {
        const normalizedCheckedOutVisitor = normalizeVisitorTrackingEntry(checkedOutVisitor);
        setLiveVisitors((prev) => prev.filter((visitor) => visitor.id !== normalizedCheckedOutVisitor.id));
        setVisitorHistory((prev) => [normalizedCheckedOutVisitor, ...prev.filter((visitor) => visitor.id !== normalizedCheckedOutVisitor.id)]);
        setViewingVisitor((prev) => (
          prev && String(prev.id || prev.recordId || '') === String(normalizedCheckedOutVisitor.id || normalizedCheckedOutVisitor.recordId || '')
            ? normalizedCheckedOutVisitor
            : prev
        ));
        setCheckedInVisitorIds((prev) => {
          const next = new Set(prev);
          next.delete(String(normalizedCheckedOutVisitor.id || normalizedCheckedOutVisitor.recordId || ''));
          return next;
        });
      } else {
        const fallbackCheckedOutVisitor = normalizeVisitorTrackingEntry({ ...(viewingVisitor || {}), id, checkOutAt: new Date(), checkOut: formatTimeLabel(new Date()), status: 'Checked Out', statusKey: 'checked_out' });
        setLiveVisitors((prev) => prev.map((visitor) => visitor.id === id ? normalizeVisitorTrackingEntry({ ...visitor, checkOutAt: new Date(), checkOut: formatTimeLabel(new Date()), status: 'Checked Out', statusKey: 'checked_out' }) : visitor));
        setViewingVisitor((prev) => (
          prev && String(prev.id || prev.recordId || '') === String(id)
            ? fallbackCheckedOutVisitor
            : prev
        ));
        setCheckedInVisitorIds((prev) => {
          const next = new Set(prev);
          next.delete(String(id));
          return next;
        });
      }
    } catch (error) {
      alert(error.message || 'Unable to check the visitor out right now.');
    }
  };

  const handleAllowEntry = async (visitor) => {
    const visitorId = visitor?.recordId || visitor?.id;
    if (!visitorId) {
      return;
    }

    try {
      const response = await checkInVisitorLog(visitorId, {});
      const checkedInVisitor = response?.visitor || response?.data?.visitor || null;
      const fallbackCheckedInVisitor = {
        ...(visitor || {}),
        id: visitorId,
        recordId: visitorId,
        status: 'Checked In',
        statusKey: 'checked_in',
        approvalStatus: 'approved',
        approvalStatusLabel: 'Approved',
        checkIn: visitor?.checkIn || formatTimeLabel(new Date()),
      };
      const normalizedCheckedInVisitor = checkedInVisitor
        ? normalizeVisitorTrackingEntry(checkedInVisitor)
        : normalizeVisitorTrackingEntry(fallbackCheckedInVisitor);

      const isSameTrackedVisitor = (entry) => (
        isSameVisitorEntry(entry, visitor) ||
        String(entry?.recordId || entry?.id || '') === String(visitorId)
      );

      setApprovedVisitors((prev) => prev.filter((entry) => !isSameTrackedVisitor(entry)));
      setPendingVisitors((prev) => prev.filter((entry) => !isSameTrackedVisitor(entry)));
      setCheckedInVisitorIds((prev) => {
        const next = new Set(prev);
        next.add(String(visitorId));
        return next;
      });

      setLiveVisitors((prev) => [
        normalizedCheckedInVisitor,
        ...prev.filter((entry) => !isSameTrackedVisitor(entry)),
      ]);
      setVisitorOverviewRefreshToken((value) => value + 1);
      setShowBadge(normalizedCheckedInVisitor);
    } catch (error) {
      alert(error.message || 'Unable to check the visitor in right now.');
    }
  };

  const handleCancelUpcoming = async () => {
    if (!cancellingBooking || !cancelForm.reason) return;
    const bookingId = cancellingBooking.recordId || cancellingBooking.id;

    try {
      const response = await updateMeetingRoomBooking(bookingId, {
        status: 'cancelled',
        cancelReason: `${cancelForm.reason} | ${cancelForm.refundType}`,
      });
      const updatedBooking = response?.data?.booking || response?.booking || null;
      if (updatedBooking) {
        syncDailyBookingState(updatedBooking);
      } else {
        setUpcomingBookings((prev) => prev.map((booking) => booking.id === cancellingBooking.id ? { ...booking, status: 'Cancelled' } : booking));
      }
      alert(`System: Booking ${cancellingBooking.id} cancelled. Refund Type: ${cancelForm.refundType}. Slot freed.`);
      setCancellingBooking(null);
      setCancelForm({ reason: '', refundType: 'Full Refund' });
    } catch (error) {
      alert(error.message || 'Unable to cancel this booking right now.');
    }
  };

  const handleRescheduleUpcoming = () => {
    const bookingId = reschedulingBooking?.recordId || reschedulingBooking?.id;
    if (!bookingId || !rescheduleForm.newDate || !rescheduleForm.newStartTime || !rescheduleForm.newEndTime) return;

    const startMinutes = timeToMinutes(rescheduleForm.newStartTime);
    const endMinutes = timeToMinutes(rescheduleForm.newEndTime);

    if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
      alert('Choose a valid start and end time.');
      return;
    }

    if (!isAlignedToFiveMinuteSlot(startMinutes) || !isAlignedToFiveMinuteSlot(endMinutes)) {
      alert('Use 5-minute slots only (for example 12:20, 12:25, 12:30).');
      return;
    }

    if (endMinutes - startMinutes < WALK_IN_MIN_DURATION_MINUTES) {
      alert('Minimum booking duration is 30 minutes.');
      return;
    }

    updateMeetingRoomBooking(bookingId, {
      date: rescheduleForm.newDate,
      startTime: rescheduleForm.newStartTime,
      endTime: rescheduleForm.newEndTime,
      status: 'rescheduled',
    })
      .then((response) => {
        const updatedBooking = response?.data?.booking || response?.booking || null;
        if (updatedBooking) {
          syncDailyBookingState(updatedBooking);
        }
        alert(`System: Booking rescheduled to ${rescheduleForm.newDate} at ${formatTimeLabel(rescheduleForm.newStartTime)} - ${formatTimeLabel(rescheduleForm.newEndTime)}. Customer notified.`);
        setReschedulingBooking(null);
        setRescheduleForm({ newDate: '', newStartTime: '', newEndTime: '' });
      })
      .catch((error) => {
        alert(error.message || 'Unable to reschedule this booking right now.');
      });
  };

  const buildBadgeDetails = (visitor = {}) => ({
    badgeNo: String(visitor?.badgeNo || 'N/A'),
    visitorName: String(visitor?.name || visitor?.fullName || 'Visitor'),
    visitorCompany: String(visitor?.company || 'Individual'),
    purpose: String(visitor?.purpose || 'General visit'),
    host: String(visitor?.host || visitor?.hostName || 'Frontdesk'),
    checkIn: String(visitor?.checkIn || formatTimeLabel(visitor?.checkInAt) || formatTimeLabel(new Date())),
    visitDate: String(visitor?.date || formatDisplayDate(visitor?.createdAt || new Date()) || ''),
    note: String(visitor?.notes || 'Host has been notified via email and SMS.'),
  });

  const openBadgePrintWindow = (visitor = {}) => {
    const badgeDetails = buildBadgeDetails(visitor);
    const {
      badgeNo,
      visitorName,
      visitorCompany,
      purpose,
      host,
      checkIn,
      visitDate,
      note,
    } = badgeDetails;

    const printHtml = `
      <html>
        <head>
          <title>Visitor Badge - ${badgeNo}</title>
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; }
            body {
              padding: 20px;
              font-family: "Poppins", "Segoe UI", Arial, sans-serif;
              background: #f8fafc;
              color: #111827;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .sheet {
              max-width: 350px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 18px;
              border: 1px solid #dbeafe;
              box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
              color: #ffffff;
              padding: 14px 16px;
            }
            .header h1 { margin: 0; font-size: 18px; line-height: 1.15; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; text-align: center; }
            .content { padding: 14px 16px 16px 16px; }
            .name { margin: 0 0 2px 0; font-size: 20px; font-weight: 800; line-height: 1.2; color: #111827; text-align: center; }
            .company { margin: 0 0 12px 0; color: #6b7280; font-size: 11px; font-weight: 700; text-align: center; }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 12px;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 10px 12px;
              background: #f9fafb;
            }
            .field-label { margin: 0; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: #9ca3af; font-weight: 800; }
            .field-value { margin: 2px 0 0 0; font-size: 12px; font-weight: 700; color: #1f2937; word-break: break-word; }
            .span-2 { grid-column: span 2; }
            .print-hint { max-width: 350px; margin: 10px auto 0 auto; font-size: 11px; color: #475569; text-align: center; }
            @media print {
              html, body { width: 100%; height: 100%; }
              body { background: #ffffff !important; padding: 0; }
              .sheet { box-shadow: none; border-color: #dbeafe; }
              .print-hint { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header"><h1>Visitor Pass</h1></div>
            <div class="content">
              <p class="name">${visitorName}</p>
              <p class="company">${visitorCompany}</p>
              <div class="grid">
                <div><p class="field-label">Badge No</p><p class="field-value">${badgeNo}</p></div>
                <div><p class="field-label">Check-In</p><p class="field-value">${checkIn}</p></div>
                <div><p class="field-label">Visit Date</p><p class="field-value">${visitDate}</p></div>
                <div><p class="field-label">Purpose</p><p class="field-value">${purpose}</p></div>
                <div class="span-2"><p class="field-label">Host / Destination</p><p class="field-value">${host}</p></div>
              </div>
            </div>
          </div>
          <p class="print-hint">For exact colors, keep "Background graphics" enabled in the print dialog.</p>
          <script>window.onload = function () { window.focus(); window.print(); };</script>
        </body>
      </html>
    `;

    // Print in-place via hidden iframe so no extra browser tab opens.
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      alert('Unable to open print preview right now. Please try again.');
      return;
    }

    iframeDoc.open();
    iframeDoc.write(printHtml.replace(
      'window.focus(); window.print();',
      "window.focus(); setTimeout(function(){ window.print(); }, 120);",
    ));
    iframeDoc.close();

    window.setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 8000);
  };

  const handlePrintBadge = (visitor = showBadge) => {
    if (!visitor) {
      return;
    }
    openBadgePrintWindow(visitor);
  };


  const getStatusBadge = (status) => {
    const normalized = normalizeText(status);
    if (normalized === 'checked in' || normalized === 'checked-in' || normalized === 'confirmed (paid)') return 'bg-green-50 text-green-600 border-green-200';
    if (normalized === 'in progress') return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
    if (normalized === 'booked') return 'bg-blue-50 text-blue-600 border-blue-200';
    if (normalized === 'checked out' || normalized === 'completed') return 'bg-slate-100 text-slate-500 border-slate-200';
    if (normalized === 'pending payment' || normalized === 'unpaid') return 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse';
    if (normalized === 'cancelled' || normalized === 'canceled') return 'bg-red-50 text-red-600 border-red-200';
    return 'bg-blue-50 text-blue-600 border-blue-200';
  };

  return (
    <>
      <PageFrame>
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">

        <div className="flex flex-col gap-4">

        {/* 1. HEADER */}
        <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">Visitor Management</h2>
            <p className="text-xs font-medium text-slate-500 mt-1">Daily visitors, walk-in bookings, client conversion, payment proof, and invoice handoff in one front desk unit.</p>
          </div>
        </div>

        {/* 2. MAIN PILL TABS */}
        <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
          <button
            type="button"
            disabled={!visitorAccess.tabs.daily}
            title={!visitorAccess.tabs.daily ? 'You do not have permission for Daily Visitors.' : undefined}
            onClick={() => setActiveTab('daily')}
            className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              activeTab === 'daily' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            } ${!visitorAccess.tabs.daily ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            DAILY VISITORS {trackedVisitors.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-md flex items-center gap-1 ${activeTab === 'daily' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>{trackedVisitors.length}
              </span>
            )}
          </button>
          <button
            type="button"
            disabled={!visitorAccess.tabs.history}
            title={!visitorAccess.tabs.history ? 'You do not have permission for Visitor History.' : undefined}
            onClick={() => setActiveTab('history')}
            className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'history' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            } ${!visitorAccess.tabs.history ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            VISITOR HISTORY
          </button>
          <button
            type="button"
            disabled={!visitorAccess.tabs.bookings}
            title={!visitorAccess.tabs.bookings ? 'You do not have permission for Bookings.' : undefined}
            onClick={() => setActiveTab('bookings')}
            className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              activeTab === 'bookings' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            } ${!visitorAccess.tabs.bookings ? 'text-slate-300 cursor-not-allowed' : ''}`}
          >
            {!visitorAccess.tabs.bookings && <Lock size={12} />} BOOKINGS
          </button>
          <button
            type="button"
            disabled={!visitorAccess.tabs.clients}
            title={!visitorAccess.tabs.clients ? 'You do not have permission for Clients.' : undefined}
            onClick={() => setActiveTab('clients')}
            className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              activeTab === 'clients' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            } ${!visitorAccess.tabs.clients ? 'text-slate-300 cursor-not-allowed' : ''}`}
          >
            {!visitorAccess.tabs.clients && <Lock size={12} />} CLIENTS
          </button>
        </div>

        {/* 3. STATS OVERVIEW */}
        <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
            <div className="min-w-0"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Currently Inside</p><p className="text-[15px] font-black text-slate-900">{liveVisitors.filter((v) => normalizeText(v.status || v.statusKey || '').replace(/[_-]+/g, ' ') === 'checked in').length}</p></div>
            <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><User size={16} /></div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
            <div className="min-w-0"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Daily Bookings</p><p className="text-[15px] font-black text-slate-900">{dailyBookings.length}</p></div>
            <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><CalendarDays size={16} /></div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
            <div className="min-w-0"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Payments Due</p><p className="text-[15px] font-black text-slate-900">{dailyBookings.filter((booking) => booking.paymentStatus === 'Pending Payment').length}</p></div>
            <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><Wallet size={16} /></div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-slate-500">
            <div className="min-w-0"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Checked Out</p><p className="text-[15px] font-black text-slate-900">{totalCheckedOutCount}</p></div>
            <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><LogOut size={16} /></div>
          </div>
        </div>

        {/* 4. TABLE WORKSPACE */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

          <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">

            <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {activeTab === 'history' && (
                <>
                  <select className="px-3 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none cursor-pointer transition-all" value={historyMonth} onChange={(e) => setHistoryMonth(e.target.value)}>
                    {historyMonthOptions.map((month) => <option key={month} value={month}>{month}</option>)}
                  </select>
                  <select className="px-3 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none cursor-pointer transition-all" value={historyYear} onChange={(e) => setHistoryYear(e.target.value)}>
                    {historyYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </>
              )}
              {activeTab === 'bookings' && (
                <div className="flex items-center gap-1 rounded-2xl bg-slate-100/70 p-1">
                  {[
                    ['upcoming', 'Upcoming', bookingCollections.upcoming.length],
                    ['completed', 'Completed', bookingCollections.completed.length],
                    ['cancelled', 'Cancelled', bookingCollections.cancelled.length],
                  ].map(([key, label, count]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setBookingStatusTab(key)}
                      className={`rounded-xl px-3 py-1.5 text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        bookingStatusTab === key
                          ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                          : 'bg-transparent text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                      }`}
                    >
                      {label} <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${bookingStatusTab === key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>{count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
              {(activeTab === 'daily' || activeTab === 'history' || activeTab === 'bookings' || activeTab === 'clients') && (
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input type="text" placeholder="Search records..." className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400" onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              )}
              <button
                type="button"
                disabled={!canOpenFrontdeskAction}
                title={!canOpenFrontdeskAction ? 'You do not have permission for frontdesk action tabs.' : undefined}
                onClick={() => { setVisitorMode('standard'); setWalkInStep(1); setForm(getDefaultVisitorForm()); setVerifiedBooking(null); setBookingConfirmation(null); setIsLoggingVisitor(true); }}
                className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-[10px] font-bold shadow-sm transition-all whitespace-nowrap ${
                  canOpenFrontdeskAction
                    ? 'bg-[#2563EB] text-white hover:bg-blue-700 active:scale-95'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none'
                }`}
              >
                <UserPlus size={13} strokeWidth={3} /> NEW FRONTDESK ACTION
              </button>
            </div>
          </div>

          {/* --- TAB: DAILY VISITORS --- */}
          {activeTab === 'daily' && (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-5 py-4">Badge ID</th>
                    <th className="px-5 py-4">Visitor Info</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Purpose</th>
                    <th className="px-5 py-4">Host</th>
                    <th className="px-5 py-4">Check-In / Out</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {trackedVisitors.filter((v) => String(v.name || '').toLowerCase().includes(searchQuery.toLowerCase())).map((vis) => {
                    const visitorId = vis.recordId || vis.id;
                    const normalizedStatus = normalizeText(vis.status || '').replace(/[_-]+/g, ' ');
                    const normalizedStatusKey = normalizeText(vis.statusKey || '').replace(/[_-]+/g, ' ');
                    const normalizedApprovalStatus = normalizeText(vis.approvalStatus || '');
                    const hasCheckInTime = Boolean(vis.checkInAt || (String(vis.checkIn || '').trim() && String(vis.checkIn).trim() !== '--:--'));
                    const isCheckedIn = checkedInVisitorIds.has(String(visitorId)) || hasCheckInTime || normalizedStatus === 'checked in' || normalizedStatusKey === 'checked in';
                    const isApproved = normalizedApprovalStatus === 'approved' && !isCheckedIn;
                    const isRejected = normalizedApprovalStatus === 'rejected' || normalizedStatus === 'rejected' || normalizedStatusKey === 'rejected';
                    const isCheckedOut = isVisitorCheckedOut(vis);

                    return (
                      <tr key={visitorId} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-5 py-4 align-top">
                          <div className="font-black text-blue-600 bg-blue-50 px-3 py-2 rounded inline-flex items-center gap-1 border border-blue-100 whitespace-nowrap">
                            <BadgeCheck size={14} /> {vis.badgeNo || 'N/A'}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="font-bold text-[#0F172A] text-[13px] whitespace-nowrap truncate max-w-[180px]">{vis.name}</div>
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5 flex items-center gap-1 whitespace-nowrap">
                            <Building size={10} /> {vis.company}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="font-bold text-[#0F172A] text-[13px] flex items-center gap-1.5 whitespace-nowrap">
                            <CalendarDays size={14} className="text-slate-400" /> {vis.date || formatDisplayDate(vis.createdAt)}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] uppercase rounded mb-1">{vis.purpose}</span>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1 whitespace-nowrap">
                            <User size={12} /> <span className="font-bold text-[#0F172A] truncate max-w-[150px]">{vis.host}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-2 font-bold text-[#0F172A] text-[13px] whitespace-nowrap">
                            <span className="text-emerald-600">{vis.checkIn || formatTimeLabel(vis.checkInAt) || '--:--'}</span>
                            <span className="text-slate-300">-</span>
                            <span className={(vis.checkOut || '--:--') === '--:--' ? 'text-slate-400' : 'text-[#0F172A]'}>{vis.checkOut || formatTimeLabel(vis.checkOutAt) || '--:--'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-col items-start gap-0.5">
                            <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${getStatusBadge(vis.status)}`}>
                              {vis.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-col items-start gap-2">
                            <div className="flex items-center gap-1.5">
                              <button title="View details" onClick={() => setViewingVisitor(vis)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all">
                                <Eye size={15} strokeWidth={2.5} />
                              </button>
                              {!isCheckedOut && (
                                <button title="Print badge" onClick={() => handlePrintBadge(vis)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-700 rounded-lg transition-all">
                                  <Printer size={15} strokeWidth={2.5} />
                                </button>
                              )}
                              {isCheckedIn ? (
                                <button title="Check out visitor" onClick={() => handleCheckOut(vis.id)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 rounded-lg transition-all">
                                  <LogOut size={15} strokeWidth={2.5} />
                                </button>
                              ) : isApproved ? (
                                <button title="Check in visitor" onClick={() => handleAllowEntry(vis)} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-all">
                                  <CheckCircle2 size={15} strokeWidth={2.5} />
                                </button>
                              ) : (
                                <button title={isRejected ? 'Rejected' : 'Awaiting approval'} type="button" disabled className={`p-1.5 rounded-lg transition-all ${isRejected ? 'bg-red-50 text-red-400' : 'bg-amber-50 text-amber-500'} cursor-not-allowed`}>
                                  {isRejected ? <XCircle size={15} strokeWidth={2.5} /> : <Clock size={15} strokeWidth={2.5} />}
                                </button>
                              )}
                            </div>
                            {isCheckedIn ? (
                              <button type="button" disabled title="Upgrade plan to access this feature." className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-400 rounded-lg text-[9px] font-black uppercase transition-all inline-flex items-center gap-1 shadow-sm whitespace-nowrap cursor-not-allowed">
                                <Lock size={11} /> Convert to Client
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {trackedVisitors.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-20 text-slate-400 font-semibold">No live visitors.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* --- TAB: BOOKINGS --- */}
          {activeTab === 'bookings' && (
            <div className="overflow-x-auto flex-1">
              <div className="grid grid-cols-1 gap-4 p-6 max-w-[960px] mx-auto">
                {selectedBookingList.map((bkg) => (
                  <div key={bkg.id} className="w-full bg-white border border-slate-200 rounded-[15px] p-3.5 md:p-4 flex flex-col lg:grid lg:grid-cols-[minmax(0,1.95fr)_auto] gap-3 lg:gap-4 items-start lg:items-stretch hover:shadow-md hover:border-blue-300 transition-all group">

                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                        <CalendarDays size={16} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="font-black text-[#0F172A] text-[15px]">{bkg.resource}</h3>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${getStatusBadge(bkg.status)}`}>{bkg.status}</span>
                            {bkg.isExtended && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase border bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                                <Clock size={9} /> Extended
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 mt-2 text-[11px] font-bold text-slate-600">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1 text-slate-800"><User size={12} /> {bkg.bookedBy} ({bkg.company})</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg ${bkg.source === 'Website' ? 'bg-indigo-50 text-indigo-700' : 'bg-orange-50 text-orange-700'}`}>
                              {bkg.source === 'Website' ? <Globe size={9} /> : <Smartphone size={9} />} {bkg.source}
                            </span>
                          </div>

                          {bkg.isExtended ? (
                            <div className="flex flex-col mt-1 space-y-1.5">
                              <span className="flex items-center gap-1 text-slate-400 line-through decoration-slate-300"><Clock size={12} /> Original: {(bkg.originalDateLabel || bkg.dateLabel || bkg.date)} • {bkg.originalTime || bkg.time}</span>
                              <span className="flex items-center gap-1 text-purple-600 font-black"><Clock size={12} /> Extended: {(bkg.dateLabel || bkg.date)} • {bkg.time}</span>
                            </div>
                          ) : (
                            <span className="flex items-center gap-1 mt-1"><Clock size={12} /> {bkg.dateLabel || bkg.date} • {bkg.time}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="w-full border-t border-slate-100 pt-3 mt-auto flex flex-wrap justify-end gap-1">
                      {Number(bkg.discountAmount || 0) > 0 && (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-[7px] font-black uppercase tracking-widest whitespace-nowrap">
                          Discount {formatCurrency(bkg.discountAmount)}{bkg.discountType === 'percent' ? ` (${Number(bkg.discountValue || 0)}%)` : ''}
                        </span>
                      )}
                      {bkg.invoiceFileUrl && (
                        <>
                          <button onClick={() => window.open(bkg.invoiceFileUrl, '_blank', 'noopener,noreferrer')} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-2xl text-[7px] font-black uppercase tracking-widest transition-all flex items-center gap-1 whitespace-nowrap">
                            <Download size={12} /> Invoice
                          </button>
                          <button onClick={() => { const win = window.open(bkg.invoiceFileUrl, '_blank', 'noopener,noreferrer'); if (win) window.setTimeout(() => win.print?.(), 800); }} className="px-2.5 py-1 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-2xl text-[7px] font-black uppercase tracking-widest transition-all flex items-center gap-1 whitespace-nowrap">
                            <Printer size={12} /> Print
                          </button>
                        </>
                      )}
                      {bkg.status === 'In Progress' ? (
                        <>
                          <button onClick={() => setViewingBooking(bkg)} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-2xl text-[7px] font-black uppercase transition-all flex items-center gap-1 shadow-sm whitespace-nowrap">
                            <Eye size={12} /> View
                          </button>
                          <button onClick={() => { setExtendingBooking(bkg); setExtendAvailability('idle'); setExtendForm({ newEndTime: '', paymentMode: 'Cash' }); setIsExtendModalOpen(true); }} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-2xl text-[7px] font-black uppercase tracking-widest transition-all flex items-center gap-1 whitespace-nowrap">
                            <Clock size={12} /> Extend Slot
                          </button>
                        </>
                      ) : bkg.status === 'Completed' || bkg.status === 'Cancelled' ? (
                        <button onClick={() => setViewingBooking(bkg)} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-2xl text-[7px] font-black uppercase transition-all flex items-center gap-1 shadow-sm whitespace-nowrap">
                          <Eye size={14} /> View
                        </button>
                      ) : (
                        <>
                          <button onClick={() => setViewingBooking(bkg)} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-2xl text-[7px] font-black uppercase transition-all flex items-center gap-1 shadow-sm whitespace-nowrap">
                            <Eye size={14} /> View
                          </button>
                          <button onClick={() => { setReschedulingBooking(bkg); setRescheduleForm({ newDate: '', newStartTime: '', newEndTime: '' }); }} className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-2xl text-[7px] font-black uppercase tracking-widest transition-all flex items-center gap-1 whitespace-nowrap">
                            <CalendarIcon size={12} /> Reschedule
                          </button>
                          {bkg.status !== 'In Progress' && (
                            <button onClick={() => setCancellingBooking(bkg)} className="p-1.5 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all" title="Cancel Booking">
                              <XCircle size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>

                  </div>
                ))}
                {selectedBookingList.length === 0 && (
                  <div className="text-center py-20 text-slate-400 font-semibold">No {bookingStatusTab} external bookings found.</div>
                )}
              </div>
            </div>
          )}

          {/* --- TAB: CLIENTS --- */}
          {activeTab === 'clients' && (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-5 py-4">Client Info</th>
                    <th className="px-5 py-4">Contact</th>
                    <th className="px-5 py-4">Source</th>
                    <th className="px-5 py-4 text-center">Bookings</th>
                    <th className="px-5 py-4 text-center">Total Value</th>
                    <th className="px-5 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {clientRows.map((client) => (
                    <tr key={client.id || client.recordId || client.clientCode} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4 align-top">
                        <div className="font-bold text-[#0F172A] text-[13px]">{client.name || client.company || 'Unnamed Client'}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-blue-700">
                            {client.clientCode || 'Client'}
                          </span>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{client.company || 'Individual'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="text-xs font-semibold text-slate-600 flex items-center gap-1"><Phone size={12} /> {client.phone || '—'}</div>
                        <div className="text-xs font-semibold text-slate-600 flex items-center gap-1 mt-0.5"><Mail size={12} /> {client.email || '—'}</div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        {normalizeText(client.source) === 'visitor-conversion' ? (
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border border-emerald-200 bg-emerald-50 text-emerald-700">
                            Converted
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">Direct</span>
                        )}
                      </td>
                      <td className="px-5 py-4 align-top text-center">
                        <span className="font-black text-[#0F172A] text-[13px]">{client.bookingCount || 0}</span>
                      </td>
                      <td className="px-5 py-4 align-top text-center">
                        <span className="font-black text-[#0F172A] text-[13px]">{formatCurrency(client.totalBookedAmount || 0)}</span>
                      </td>
                      <td className="px-5 py-4 align-top text-center">
                        <button
                          type="button"
                          onClick={() => setViewingClient(client)}
                          className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                        >
                          <Eye size={15} strokeWidth={2.5} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {clientRows.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-20 text-slate-400 font-semibold">No clients found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* --- TAB: HISTORY TABLE --- */}
          {activeTab === 'history' && (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-5 py-4">Badge ID</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Visitor Info</th>
                    <th className="px-5 py-4">Purpose</th>
                    <th className="px-5 py-4">Host</th>
                    <th className="px-5 py-4">In - Out Time</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {displayedHistory.map((vis) => {
                    const isCheckedOut = isVisitorCheckedOut(vis);
                    return (
                    <tr key={vis.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4 align-top">
                        <div className="font-black text-blue-600 bg-blue-50 px-3 py-2 rounded inline-flex items-center gap-1 border border-blue-100 whitespace-nowrap">
                          <BadgeCheck size={14} /> {vis.badgeNo || 'N/A'}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="font-bold text-[#0F172A] text-[13px] flex items-center gap-1.5 whitespace-nowrap"><CalendarDays size={14} className="text-slate-400" /> {vis.date || formatDisplayDate(vis.createdAt)}</div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="font-bold text-[#0F172A] text-[13px] whitespace-nowrap truncate max-w-[180px]">{vis.name}</div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5 flex items-center gap-1 whitespace-nowrap">
                          <Building size={10} /> {vis.company}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] uppercase rounded mb-1">{vis.purpose}</span>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="text-xs font-semibold text-slate-600 flex items-center gap-1 whitespace-nowrap">
                          <User size={12} /> <span className="font-bold text-[#0F172A] truncate max-w-[150px]">{vis.host}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-center gap-2 font-bold text-[#0F172A] text-[13px] whitespace-nowrap">
                          <span>{vis.checkIn || formatTimeLabel(vis.checkInAt) || '--:--'}</span>
                          <span className="text-slate-300">-</span>
                          <span>{vis.checkOut || formatTimeLabel(vis.checkOutAt) || '--:--'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${getStatusBadge(vis.status)}`}>
                          {vis.status}
                        </span>
                        {vis.convertedToClient && (
                          <div className="mt-2">
                            <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                              Converted to Client
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 align-top text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button title="View details" onClick={() => setViewingVisitor(vis)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all">
                            <Eye size={15} strokeWidth={2.5} />
                          </button>
                          {!isCheckedOut && (
                            <button title="Print badge" onClick={() => handlePrintBadge(vis)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-700 rounded-lg transition-all">
                              <Printer size={15} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})}
                  {displayedHistory.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-20 text-slate-400 font-semibold">No historical data found for {historyMonth} {historyYear}.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>

        {/* MODAL 1: GRAND UNIFIED "LOG VISITOR & BOOKING" TERMINAL */}
        {isLoggingVisitor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F172A]/90 backdrop-blur-sm">
            <div className="bg-white shadow-2xl animate-in zoom-in duration-200 overflow-hidden flex flex-col rounded-[22px] w-full max-w-[72rem] h-[78vh]">

              <div className="p-3 md:p-3.5 bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shrink-0">
                <div>
                  <h2 className="text-base font-black text-white leading-none flex items-center gap-1.5"><UserPlus size={15} /> Frontdesk Action Terminal</h2>
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1.5">Select the correct workflow below</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-300">
                    Logged in as <span className="font-black text-white">{frontdeskProfile.name}</span> ({frontdeskProfile.role})
                  </p>
                </div>

                <div className="grid grid-cols-2 xl:grid-cols-4 gap-1.5 w-full md:w-auto bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    disabled={!visitorAccess.modes.standard}
                    title={!visitorAccess.modes.standard ? 'You do not have permission for Standard Visitor.' : undefined}
                    onClick={() => { setVisitorMode('standard'); setVerifiedBooking(null); setBookingConfirmation(null); setShowBookingConfirmationPopup(false); setForm((prev) => ({ ...prev, standardVisitorType: prev.standardVisitorType || 'standard' })); }}
                    className={`w-full px-2.5 py-2 rounded-lg text-[9px] font-bold uppercase whitespace-nowrap transition-all ${visitorMode === 'standard' ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-800/30' : 'text-slate-400 hover:text-white'} ${!visitorAccess.modes.standard ? 'cursor-not-allowed opacity-60' : ''}`}
                  >Standard Visitor</button>
                  <button type="button" disabled={!visitorAccess.modes.tour} title={!visitorAccess.modes.tour ? 'You do not have permission for Unit Tour.' : undefined} onClick={() => setVisitorMode('tour')} className={`w-full px-2.5 py-2 rounded-lg text-[9px] font-bold uppercase whitespace-nowrap transition-all inline-flex items-center justify-center gap-1 ${visitorMode === 'tour' ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-800/30' : 'text-slate-400 hover:text-white'} ${!visitorAccess.modes.tour ? 'text-slate-500 bg-slate-700/60 cursor-not-allowed' : ''}`}>{!visitorAccess.modes.tour && <Lock size={11} />} Unit Tour</button>
                  <button type="button" disabled={!visitorAccess.modes.walkin_booking} title={!visitorAccess.modes.walkin_booking ? 'You do not have permission for Walk-in Booking.' : undefined} onClick={() => setVisitorMode('walkin_booking')} className={`w-full px-2.5 py-2 rounded-lg text-[9px] font-bold uppercase whitespace-nowrap transition-all inline-flex items-center justify-center gap-1 ${visitorMode === 'walkin_booking' ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-800/30' : 'text-slate-400 hover:text-white'} ${!visitorAccess.modes.walkin_booking ? 'text-slate-500 bg-slate-700/60 cursor-not-allowed' : ''}`}>{!visitorAccess.modes.walkin_booking && <Lock size={11} />} Walk-in Booking</button>
                  <button type="button" disabled={!visitorAccess.modes.verify_booking} title={!visitorAccess.modes.verify_booking ? 'You do not have permission for Verify Booking ID.' : undefined} onClick={() => setVisitorMode('verify_booking')} className={`w-full px-2.5 py-2 rounded-lg text-[9px] font-bold uppercase whitespace-nowrap transition-all inline-flex items-center justify-center gap-1 ${visitorMode === 'verify_booking' ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-800/30' : 'text-slate-400 hover:text-white'} ${!visitorAccess.modes.verify_booking ? 'text-slate-500 bg-slate-700/60 cursor-not-allowed' : ''}`}>{!visitorAccess.modes.verify_booking && <Lock size={11} />} Verify Booking ID</button>
                </div>
              </div>

              <div className={`flex-1 h-full min-h-0 bg-white ${isCompactMode ? 'grid grid-cols-1' : 'grid grid-cols-1 lg:grid-cols-[0.92fr_1.08fr]'}`}>

                {!isCompactMode && (
                  <div className={`min-h-0 overflow-y-auto p-4 md:p-5 border-r border-gray-100 bg-slate-50/30 ${visitorMode === 'verify_booking' && !verifiedBooking ? 'opacity-50 pointer-events-none grayscale' : 'animate-in fade-in slide-in-from-left-4'}`}>
                    {visitorMode === 'standard' && (
                      <div className="mb-5 space-y-3 rounded-xl border border-blue-100 bg-white p-3">
                          <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1.5">
                          {[
                            ['new', 'New Visitor'],
                            ['existing', 'Existing Visitor'],
                          ].map(([mode, label]) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => switchStandardVisitorMode(mode)}
                                className={`rounded-lg px-2.5 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${form.standardVisitorMode === mode
                                  ? 'bg-white text-blue-700 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        {form.standardVisitorMode === 'existing' && (
                          <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Search Existing Visitor</label>
                            <div className="flex items-center gap-2 rounded-xl px-1 py-1">
                              <Search size={14} className="text-gray-400" />
                              <input
                                type="text"
                                value={form.standardVisitorSearch}
                                onChange={(e) => setForm((prev) => ({ ...prev, standardVisitorSearch: e.target.value }))}
                                placeholder="Search by name, phone, email, company"
                                className="w-full border-0 bg-white text-xs font-semibold text-gray-900 outline-none ring-0 shadow-none placeholder:text-gray-400 focus:border-0 focus:outline-none focus:ring-0"
                              />
                            </div>

                            {hasStandardVisitorSearchQuery && standardVisitorSearchMatches.length > 0 ? (
                              <div className="grid gap-2">
                                {standardVisitorSearchMatches.map((visitor) => (
                                  <button
                                    key={visitor.id}
                                    type="button"
                                    onClick={() => applyExistingStandardVisitor(visitor)}
                                    className="rounded-xl border border-blue-100 bg-white px-3 py-3 text-left transition-all hover:border-blue-400 hover:bg-blue-50"
                                  >
                                    <p className="text-xs font-black text-slate-900">{visitor.name || 'Visitor'}</p>
                                    <p className="mt-1 text-[10px] font-bold text-slate-600">{visitor.phone || 'No phone'} | {visitor.email || 'No email'}</p>
                                    <p className="mt-1 text-[10px] font-bold text-blue-700">{visitor.company || 'No company'}</p>
                                  </button>
                                ))}
                              </div>
                            ) : hasStandardVisitorSearchQuery ? (
                              <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs font-bold text-gray-500">
                                No matching visitor found in history.
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4 flex items-center gap-2"><User size={16} /> Personal Details</h3>

                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Full Name *</label>
                        <input type="text" placeholder="Visitor Name" className="w-full px-2.5 py-2 bg-white border-2 border-gray-200 rounded-lg font-semibold text-xs text-gray-900 focus:border-[#2563EB] outline-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Phone *</label>
                          <input type="tel" placeholder="+91..." className="w-full px-2.5 py-2 bg-white border-2 border-gray-200 rounded-lg font-semibold text-xs text-gray-900 focus:border-[#2563EB] outline-none" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Email *</label>
                          <input type="email" placeholder="@email.com" className="w-full px-2.5 py-2 bg-white border-2 border-gray-200 rounded-lg font-semibold text-xs text-gray-900 focus:border-[#2563EB] outline-none" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Company / Agency</label>
                          <input type="text" placeholder="Optional" className="w-full px-2.5 py-2 bg-white border-2 border-gray-200 rounded-lg font-semibold text-xs text-gray-900 focus:border-[#2563EB] outline-none" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                        </div>
                        {visitorMode === 'walkin_booking' && (
                          <div className="col-span-1 space-y-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Attendees</label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              className="w-full px-2.5 py-2 bg-white border-2 border-gray-200 rounded-lg font-semibold text-xs text-gray-900 focus:border-[#2563EB] outline-none"
                              value={form.attendees}
                              onChange={(e) => {
                                const nextValue = e.target.value === '' ? '' : Number(e.target.value);
                                setAttendeeCount(nextValue);
                              }}
                            />
                            <p className="text-[10px] font-semibold text-gray-400">
                              {selectedWalkInRoom
                                ? attendeeCapacity
                                  ? `Room capacity is ${attendeeCapacity}. Enter a manual count and keep it at or below that number.`
                                  : 'Enter the manual attendee count for this room.'
                                : 'Select a room first, then enter the attendee count.'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div
                  className={`min-h-0 overflow-y-auto p-4 md:p-5 flex flex-col ${isCompactMode
                      ? visitorMode === 'tour'
                        ? 'w-full h-full max-w-none mx-auto bg-gradient-to-b from-indigo-50 via-white to-white px-0 md:px-0'
                        : visitorMode === 'walkin_booking'
                          ? 'w-full h-full max-w-none mx-auto bg-blue-50/30 px-0 md:px-0'
                          : 'w-full h-full max-w-[92rem] 2xl:max-w-[100rem] mx-auto bg-slate-50 px-0 md:px-2'
                      : ''
                    }`}
                >

                  {visitorMode === 'standard' && (
                    <div className="space-y-2.5 animate-in fade-in bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-[10px]">
                      <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 mb-2.5 flex items-center gap-1"><Building size={12} /> Visitor Entry Type</h3>

                      {isCompactMode && (
                        <div className="space-y-2.5 rounded-lg border border-blue-100 bg-white p-2.5">
                          <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1.5">
                            {[
                              ['new', 'New Visitor'],
                              ['existing', 'Existing Visitor'],
                            ].map(([mode, label]) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => switchStandardVisitorMode(mode)}
                                className={`rounded-lg px-2.5 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${form.standardVisitorMode === mode
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-900'
                                  }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          {form.standardVisitorMode === 'existing' && (
                            <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/40 p-2.5">
                              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Search Existing Visitor</label>
                              <div className="flex items-center gap-2 rounded-xl px-1 py-1">
                                <Search size={14} className="text-gray-400" />
                                <input
                                  type="text"
                                  value={form.standardVisitorSearch}
                                  onChange={(e) => setForm((prev) => ({ ...prev, standardVisitorSearch: e.target.value }))}
                                  placeholder="Search by name, phone, email, company"
                                  className="w-full border-0 bg-white text-xs font-semibold text-gray-900 outline-none ring-0 shadow-none placeholder:text-gray-400 focus:border-0 focus:outline-none focus:ring-0"
                                />
                              </div>
                              {hasStandardVisitorSearchQuery && standardVisitorSearchMatches.length > 0 ? (
                                <div className="grid gap-2">
                                  {standardVisitorSearchMatches.map((visitor) => (
                                    <button
                                      key={visitor.id}
                                      type="button"
                                      onClick={() => applyExistingStandardVisitor(visitor)}
                                      className="rounded-lg border border-blue-100 bg-white px-2.5 py-2 text-left transition-all hover:border-blue-400 hover:bg-blue-50"
                                    >
                                      <p className="text-xs font-black text-slate-900">{visitor.name || 'Visitor'}</p>
                                      <p className="mt-1 text-[10px] font-bold text-slate-600">{visitor.phone || 'No phone'} | {visitor.email || 'No email'}</p>
                                      <p className="mt-1 text-[10px] font-bold text-blue-700">{visitor.company || 'No company'}</p>
                                    </button>
                                  ))}
                                </div>
                              ) : hasStandardVisitorSearchQuery ? (
                                <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs font-bold text-gray-500">
                                  No matching visitor found in history.
                                </p>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-3">
                        <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Personal Information</h4>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <input
                            type="text"
                            placeholder="First Name"
                            value={form.firstName}
                            onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value, name: `${e.target.value} ${String(prev.lastName || '')}`.trim() }))}
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Last Name"
                            value={form.lastName}
                            onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value, name: `${String(prev.firstName || '')} ${e.target.value}`.trim() }))}
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500"
                          />
                          <select
                            value={form.gender}
                            onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500"
                          >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                          <input
                            type="tel"
                            placeholder="Phone Number"
                            value={form.phone}
                            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value.replace(/[^\d]/g, '') }))}
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500"
                          />
                          <input
                            type="email"
                            placeholder="Email Address"
                            value={form.email}
                            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500 sm:col-span-2"
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <select
                            value={form.country}
                            onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value, state: '', city: '' }))}
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500"
                          >
                            <option value="">Select Country</option>
                            {countryOptions.map((country) => (
                              <option key={country.isoCode} value={country.name}>
                                {country.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={form.state}
                            onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value, city: '' }))}
                            disabled={!form.country}
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                          >
                            <option value="">{form.country ? 'Select State' : 'Select country first'}</option>
                            {stateOptions.map((state) => (
                              <option key={state.isoCode} value={state.name}>
                                {state.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={form.city}
                            onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                            disabled={!form.country || !form.state}
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                          >
                            <option value="">{form.country && form.state ? 'Select City' : 'Select country and state first'}</option>
                            {cityOptions.map((city) => (
                              <option key={`${city.name}-${city.stateCode}-${city.latitude}`} value={city.name}>
                                {city.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <select
                            value={form.visitorCompanyType}
                            onChange={(e) => setForm((prev) => ({ ...prev, visitorCompanyType: e.target.value, visitorCompany: e.target.value === 'individual' ? '' : prev.visitorCompany }))}
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500"
                          >
                            <option value="individual">Individual</option>
                            <option value="company">Company</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Visitor Company"
                            value={form.visitorCompany}
                            onChange={(e) => setForm((prev) => ({ ...prev, visitorCompany: e.target.value }))}
                            disabled={form.visitorCompanyType === 'individual'}
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1">
                        {[
                          ['standard', 'Standard Visitor', !visitorAccess.standardTypes.standard],
                          ['department', 'Department Visitor', !visitorAccess.standardTypes.department],
                          ['tenant', 'Tenant Company Visitor', !visitorAccess.standardTypes.tenant],
                        ].map(([type, label, locked]) => (
                          <button
                            key={type}
                            type="button"
                            disabled={locked}
                            title={locked ? 'You do not have permission for this subtab.' : undefined}
                            onClick={() => setForm((prev) => ({
                              ...prev,
                              standardVisitorType: type,
                              hostGroupType: type === 'standard' ? '' : prev.hostGroupType,
                              hostGroupValue: type === 'standard' ? '' : prev.hostGroupValue,
                              hostUserId: type === 'standard' ? '' : prev.hostUserId,
                            }))}
                            className={`rounded-lg px-2.5 py-2 text-[9px] font-black uppercase tracking-widest transition-all inline-flex items-center justify-center gap-1 ${locked
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : form.standardVisitorType === type
                                  ? 'bg-white text-blue-700 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                          >
                            {locked ? <Lock size={11} /> : null}
                            {label}
                          </button>
                        ))}
                      </div>

                      {form.standardVisitorType === 'department' ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Purpose</label>
                              <select className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg font-semibold text-xs text-gray-900 focus:border-[#2563EB] outline-none cursor-pointer" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })}>
                                <option value="Meeting">Meeting</option><option value="Interview">Interview</option><option value="Delivery">Delivery</option><option value="Maintenance">Maintenance</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Role / Department</label>
                              <select
                                className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg font-semibold text-xs text-gray-900 focus:border-[#2563EB] outline-none cursor-pointer disabled:cursor-not-allowed"
                                value={form.hostGroupType}
                                onChange={(e) => {
                                  const nextType = e.target.value;
                                  setForm((prev) => ({
                                    ...prev,
                                    hostGroupType: nextType,
                                    hostGroupValue: '',
                                    hostUserId: '',
                                  }));
                                }}
                                disabled={isVisitorOverviewLoading || visitorHostGroups.length === 0}
                              >
                                <option value="">Select type</option>
                                <option value="department">Department</option>
                                <option value="role">Role</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Department / Role Name</label>
                              <select
                                className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg font-semibold text-xs text-gray-900 focus:border-[#2563EB] outline-none cursor-pointer disabled:cursor-not-allowed"
                                value={form.hostGroupValue}
                                onChange={(e) => {
                                  setForm((prev) => ({
                                    ...prev,
                                    hostGroupValue: e.target.value,
                                    hostUserId: '',
                                  }));
                                }}
                                disabled={isVisitorOverviewLoading || !form.hostGroupType}
                              >
                                <option value="">
                                  {form.hostGroupType ? `Select a ${form.hostGroupType}` : 'Choose type first'}
                                </option>
                                {filteredHostGroups.map((group) => {
                                  const groupValue = String(group.value || '').split(':').slice(1).join(':');
                                  return (
                                    <option key={group.value} value={groupValue}>
                                      {group.label}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Host Member</label>
                              <select
                                className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg font-semibold text-xs text-gray-900 focus:border-[#2563EB] outline-none cursor-pointer disabled:cursor-not-allowed"
                                value={form.hostUserId}
                                onChange={(e) => {
                                  setForm((prev) => ({
                                    ...prev,
                                    hostUserId: e.target.value,
                                  }));
                                }}
                                disabled={isVisitorOverviewLoading || !selectedHostGroup || selectedHostGroup.members.length === 0}
                              >
                                <option value="">
                                  {selectedHostGroup ? 'Select a present member' : 'Choose a department or role first'}
                                </option>
                                {(selectedHostGroup?.members || []).map((group) => (
                                  <option key={group.userId || group.id} value={group.userId || group.id} disabled={!group.isSelectable}>
                                    {group.fullName} ({group.statusLabel || 'Present'})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Reason *</label>
                            <textarea
                              rows={3}
                              placeholder="Why is the visitor here?"
                              className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg font-semibold text-xs text-gray-900 focus:border-[#2563EB] outline-none resize-none"
                              value={form.reason}
                              onChange={e => setForm({ ...form, reason: e.target.value })}
                            />
                          </div>

                          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2 mt-3">
                            <ShieldCheck className="text-blue-500 shrink-0" size={24} />
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest leading-relaxed">System will notify the host for approval.</p>
                              {visitorOverviewError ? (
                                <p className="text-[10px] font-bold text-red-600">{visitorOverviewError}</p>
                              ) : (
                                <p className="text-[10px] font-bold text-blue-700">Only present unit members in the selected group can be selected, including managers and other roles.</p>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3.5">
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Purpose</label>
                              <select
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:border-[#2563EB] outline-none cursor-pointer"
                                value={form.purpose}
                                onChange={e => setForm({ ...form, purpose: e.target.value })}
                              >
                                <option value="Exploring Services">Exploring Services</option>
                                <option value="General Visit">General Visit</option>
                                <option value="Unit Enquiry">Unit Enquiry</option>
                                <option value="Delivery">Delivery</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Visit Note</label>
                            <textarea
                              rows={4}
                              placeholder="Optional note, e.g. came to see the place or explore services"
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:border-[#2563EB] outline-none resize-none"
                              value={form.reason}
                              onChange={e => setForm({ ...form, reason: e.target.value })}
                            />
                          </div>

                        </div>
                      )}
                    </div>
                  )}

                  {visitorMode === 'tour' && (
                    <div className="h-full overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2.5 shadow-sm text-[10px]">
                      <div className="flex flex-col gap-4 border-b border-indigo-100 pb-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700">
                              <Building size={12} /> Unit Tour Check-in
                            </div>
                            <h3 className="mt-1 text-base font-black tracking-tight text-gray-950">Unit Tour / Enquiry</h3>
                            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-gray-600">
                              Capture the full client profile during the tour so Administration can check the visitor in immediately and Sales can follow up with pricing, space needs, and contact context already in place.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-5 xl:grid-cols-[1.04fr_0.96fr]">
                        <div className="space-y-3.5">
                          <div className="rounded-lg border border-indigo-100 bg-white p-2.5 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Client Profile</p>
                                <h4 className="mt-1 text-xs font-black text-gray-950">What kind of company is visiting?</h4>
                              </div>
                              <BadgeCheck className="text-indigo-500" size={18} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <label className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Industry</span>
                                <select
                                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                                  value={form.industry}
                                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                                >
                                  <option value="">Select industry</option>
                                  {TOUR_INDUSTRY_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Company Size</span>
                                <input
                                  type="text"
                                  placeholder="e.g. 12 employees"
                                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                                  value={form.teamSize}
                                  onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Seats Needed</span>
                                <input
                                  type="text"
                                  placeholder="e.g. 8-12"
                                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                                  value={form.seatCount}
                                  onChange={(e) => setForm({ ...form, seatCount: e.target.value })}
                                />
                              </label>
                            </div>
                          </div>

                          <div className="rounded-lg border border-indigo-100 bg-white p-2.5 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">POC & Follow-Up</p>
                                <h4 className="mt-1 text-xs font-black text-gray-950">Who should Administration contact next?</h4>
                              </div>
                              <Phone className="text-indigo-500" size={18} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <label className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">POC / Visitor Name</span>
                                <input
                                  type="text"
                                  placeholder="Primary contact / visitor name"
                                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                                  value={form.pocName}
                                  onChange={(e) => setForm({ ...form, pocName: e.target.value })}
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Designation</span>
                                <input
                                  type="text"
                                  placeholder="Founder, Manager, Admin"
                                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                                  value={form.pocDesignation}
                                  onChange={(e) => setForm({ ...form, pocDesignation: e.target.value })}
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">POC Phone</span>
                                <input
                                  type="tel"
                                  placeholder="+91..."
                                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                                  value={form.pocPhone}
                                  onChange={(e) => setForm({ ...form, pocPhone: e.target.value })}
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">POC Email</span>
                                <input
                                  type="email"
                                  placeholder="contact@company.com"
                                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                                  value={form.pocEmail}
                                  onChange={(e) => setForm({ ...form, pocEmail: e.target.value })}
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Preferred Contact</span>
                                <select
                                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                                  value={form.preferredContactMethod}
                                  onChange={(e) => setForm({ ...form, preferredContactMethod: e.target.value })}
                                >
                                  <option value="">Select method</option>
                                  <option value="Call">Call</option>
                                  <option value="WhatsApp">WhatsApp</option>
                                  <option value="Email">Email</option>
                                  <option value="In-person">In-person</option>
                                </select>
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Follow-Up Date</span>
                                <input
                                  type="date"
                                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                                  value={form.followUpDate}
                                  onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                                />
                              </label>
                            </div>
                          </div>

                          <div className="rounded-lg border border-indigo-100 bg-white p-2.5 shadow-sm">
                            <div className="mb-4">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Space Intent</p>
                              <h4 className="mt-1 text-xs font-black text-gray-950">What are they looking for?</h4>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <label className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Preferred Space</span>
                                <select
                                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                                  value={form.preferredSpace}
                                  onChange={(e) => setForm({ ...form, preferredSpace: e.target.value })}
                                >
                                  <option value="">Select space type</option>
                                  {TOUR_SPACE_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Budget Range</span>
                                <select
                                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                                  value={form.budgetRange}
                                  onChange={(e) => setForm({ ...form, budgetRange: e.target.value })}
                                >
                                  <option value="">Select budget</option>
                                  {TOUR_BUDGET_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Move-In Timeline</span>
                                <select
                                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                                  value={form.moveInTimeline}
                                  onChange={(e) => setForm({ ...form, moveInTimeline: e.target.value })}
                                >
                                  <option value="">Select timeline</option>
                                  {TOUR_TIMELINE_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Company / Agency</span>
                                <input
                                  type="text"
                                  placeholder="Optional"
                                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                                  value={form.company}
                                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3.5">
                          <div className="rounded-lg border border-indigo-100 bg-white p-2.5 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sales Notes</p>
                                <h4 className="mt-1 text-xs font-black text-gray-950">Extra context for the sales team</h4>
                              </div>
                              <Sparkles className="text-indigo-500" size={18} />
                            </div>
                            <label className="space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tour Notes</span>
                              <textarea
                                rows={7}
                                placeholder="What did the client say? What objections, preferences, or follow-up points should Sales know?"
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition focus:border-indigo-400 focus:bg-white resize-none"
                                value={form.tourNotes}
                                onChange={(e) => setForm({ ...form, tourNotes: e.target.value })}
                              />
                            </label>
                          </div>

                          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-700">Frontdesk Checklist</p>
                            <ul className="mt-3 space-y-2 text-sm font-medium leading-6 text-indigo-950">
                              <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-indigo-600" />
                                Capture the visitor contact details and the company name.
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-indigo-600" />
                                Fill the preferred space, seat count, budget, timeline, and POC.
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-indigo-600" />
                                Add tour notes and follow-up details so Sales sees the context when the lead lands.
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {visitorMode === 'walkin_booking' && (
                    <div className="animate-in fade-in flex h-full min-h-0 flex-col gap-2.5 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                      <div className="flex flex-1 min-h-0 flex-col gap-5 overflow-y-auto pr-1 lg:pr-2">
                        <div className="space-y-3.5">
                          <div className="rounded-lg border border-blue-100 bg-white p-2 shadow-sm lg:p-3">
                            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Client</p>
                                <h4 className="text-[11px] font-black text-slate-950">New or existing client booking</h4>
                              </div>
                              {form.sourceVisitorId ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-blue-700">
                                  <ArrowRight size={11} /> Visitor conversion
                                </span>
                              ) : null}
                            </div>

                            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
                              {[
                                ['new', 'New Client Booking'],
                                ['existing', 'Existing Client Booking'],
                              ].map(([mode, label]) => (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() => setForm((prev) => ({ ...prev, clientBookingMode: mode, clientId: mode === 'new' ? '' : prev.clientId }))}
                                  className={`rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${form.clientBookingMode === mode ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>

                            {form.clientBookingMode === 'existing' && (
                              <div className="mb-4 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Search Existing Client</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={form.clientSearch}
                                    onChange={(e) => setForm({ ...form, clientSearch: e.target.value })}
                                    placeholder="Search by name, phone, email, company"
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-900 outline-none transition-all focus:border-blue-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => refreshBookingClients(form.clientSearch)}
                                    className="rounded-xl bg-blue-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                                  >
                                    Search
                                  </button>
                                </div>
                                {clientSearchMatches.length > 0 && (
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    {clientSearchMatches.map((client) => (
                                      <button
                                        key={client.id || client.recordId}
                                        type="button"
                                        onClick={() => applyExistingClient(client)}
                                        className={`rounded-xl border p-3 text-left transition-all ${String(form.clientId) === String(client.id || client.recordId) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-white'}`}
                                      >
                                        <p className="text-[11px] font-black text-slate-950">{client.name || client.company}</p>
                                        <p className="mt-1 text-[10px] font-bold text-slate-500">{client.phone || 'No phone'} • {client.email || 'No email'}</p>
                                        <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-blue-600">{client.clientCode || 'Client'} • {client.bookingCount || 0} bookings</p>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                              <label className="space-y-1 md:col-span-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Name *</span>
                                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500" placeholder="Client name" />
                              </label>
                              <label className="space-y-1 md:col-span-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Phone *</span>
                                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500" placeholder="+91..." />
                              </label>
                              <label className="space-y-1 md:col-span-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Email *</span>
                                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500" placeholder="client@email.com" />
                              </label>
                              <label className="space-y-1 md:col-span-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Company</span>
                                <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500" placeholder="Optional" />
                              </label>
                            </div>

                            {selectedBookingClient && (
                              <p className="mt-3 text-[10px] font-bold text-blue-700">Using saved client {selectedBookingClient.clientCode || selectedBookingClient.name}. Contact fields are auto-filled; choose the room, schedule, and payment details below.</p>
                            )}

                            {form.clientBookingMode === 'new' && matchedSavedVisitors.length > 0 && (
                              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                                <p className="text-[8px] font-black uppercase tracking-widest text-blue-700">Saved visitor matches</p>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                  {matchedSavedVisitors.map((visitor) => (
                                    <button
                                      key={visitor.id}
                                      type="button"
                                      onClick={() => applySavedVisitorContact(visitor)}
                                      className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-left transition-all hover:border-blue-500 hover:bg-blue-50"
                                    >
                                      <p className="text-xs font-black text-slate-900">{visitor.name || 'Visitor'}</p>
                                      <p className="mt-1 text-[10px] font-bold text-slate-500">{visitor.phone || 'No phone'} • {visitor.email || 'No email'}</p>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="rounded-lg border border-blue-100 bg-white p-2 shadow-sm lg:p-3">
                            <div className="mb-4 flex items-center justify-between">
                              <p className="text-[8px] font-black uppercase tracking-widest text-blue-700">Location & Capacity</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Filter by floor and wing</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Space Type *</label>
                                <select
                                  className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 font-bold text-gray-900 outline-none transition-all focus:border-blue-500"
                                  value={form.spaceType}
                                  onChange={(e) => {
                                    const nextType = e.target.value;
                                    setForm({ ...form, spaceType: nextType, floor: '', wing: '', resourceName: '', seatNumber: '' });
                                  }}
                                >
                                  <option value="">Select type</option>
                                  {['Desk', 'Cabin', 'Meeting Room', 'Conference Room'].map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Floor *</label>
                                <select
                                  className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 font-bold text-gray-900 outline-none transition-all focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                                  value={form.floor}
                                  disabled={!form.spaceType}
                                  onChange={(e) => {
                                    const nextFloor = e.target.value;
                                    setForm({ ...form, floor: nextFloor, wing: '', resourceName: '', seatNumber: '' });
                                  }}
                                >
                                  <option value="" disabled>Select a floor</option>
                                  {walkInFloorOptions.map((floor) => (
                                    <option key={floor} value={floor}>{floor}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Wing *</label>
                                <select
                                  className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 font-bold text-gray-900 outline-none transition-all focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                                  value={form.wing}
                                  disabled={!form.spaceType || !form.floor}
                                  onChange={(e) => {
                                    const nextWing = e.target.value;
                                    setForm({ ...form, wing: nextWing, resourceName: '', seatNumber: '' });
                                  }}
                                >
                                  <option value="" disabled>Select a wing</option>
                                  {walkInWingOptions.map((wing) => (
                                    <option key={wing} value={wing}>Wing {wing}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Specific Room *</label>
                                <select
                                  className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 font-bold text-gray-900 outline-none transition-all focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                                  value={form.resourceName}
                                  disabled={!form.spaceType || !form.floor || !form.wing}
                                  onChange={(e) => setForm({ ...form, resourceName: e.target.value, seatNumber: '' })}
                                >
                                  <option value="">Select a room</option>
                                  {walkInRoomOptions.map((room) => (
                                    <option key={room.name} value={room.name} disabled={room.walkInDisabled}>
                                      {room.name} {room.floor ? `(${room.floor}${room.wing ? ` ${room.wing}` : ''})` : ''} {room.capacity ? `- ${room.capacity} seats` : ''} {room.inventoryMode === 'area' ? '(Area)' : '(Single)'} {room.assignedTenantCompanyName ? `- ${room.assignedTenantCompanyName}` : ''} {room.assignedDepartmentName ? `- ${room.assignedDepartmentName}` : ''} {room.walkInDisabled ? `- ${room.walkInDisableReason}` : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Attendees *</label>
                                <input
                                  type="number"
                                  min="1"
                                  max={selectedWalkInRoom?.capacity || undefined}
                                  inputMode="numeric"
                                  className={`w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 font-bold text-gray-900 outline-none transition-all focus:border-blue-500 ${isDeskAreaSeatBooking ? 'opacity-70' : ''}`}
                                  value={isDeskAreaSeatBooking ? 1 : form.attendees}
                                  disabled={isDeskAreaSeatBooking}
                                  onChange={(e) => {
                                    if (isDeskAreaSeatBooking) {
                                      return;
                                    }
                                    const rawValue = e.target.value === '' ? '' : Number(e.target.value);
                                    const roomCapacity = Number(selectedWalkInRoom?.capacity || 0);
                                    const nextValue = rawValue === '' ? '' : Math.max(1, roomCapacity ? Math.min(roomCapacity, rawValue) : rawValue);
                                    setForm({ ...form, attendees: nextValue === '' ? 1 : nextValue });
                                  }}
                                />
                                <p className="text-[10px] font-semibold text-gray-400">
                                  {isDeskAreaSeatBooking
                                    ? 'Desk area bookings are one seat per booking.'
                                    : selectedWalkInRoom?.capacity
                                      ? `Maximum ${selectedWalkInRoom.capacity} for this room.`
                                      : 'Select a room to set capacity.'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {isDeskAreaSeatBooking && (
                            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-blue-700">Seat Number *</label>
                                  <select
                                    className="w-full rounded-xl border border-blue-100 bg-white px-2.5 py-2 font-bold text-gray-900 outline-none transition-all focus:border-blue-500"
                                    value={form.seatNumber}
                                    onChange={(e) => setForm({ ...form, seatNumber: e.target.value, attendees: 1 })}
                                  >
                                    <option value="">Select a seat</option>
                                    {deskSeatOptions.map((seat) => (
                                      <option
                                        key={seat.seatNumber}
                                        value={seat.seatNumber}
                                        disabled={!seat.available}
                                      >
                                        Seat {seat.seatNumber} {seat.available ? '(Available)' : '(Booked)'}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="rounded-xl bg-white px-4 py-3 text-right shadow-sm">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Seat Availability</p>
                                  <p className="mt-1 text-xs font-black text-blue-700">
                                    {deskSeatOptions.filter((seat) => seat.available).length} / {deskSeatOptions.length} available
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="rounded-lg border border-blue-100 bg-white p-2 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                              <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Booking Note</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Optional front desk context</p>
                            </div>
                            <textarea
                              rows="3"
                              placeholder="Add booking purpose, special request, or internal note"
                              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-2.5 py-2 font-bold text-gray-900 outline-none transition-all focus:border-blue-500"
                              value={form.purpose}
                              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Start Date *</label>
                              <input
                                type="date"
                                className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 font-bold text-gray-900 outline-none transition-all focus:border-blue-500"
                                value={form.startDate}
                                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">End Date *</label>
                              <input
                                type="date"
                                min={form.startDate}
                                className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 font-bold text-gray-900 outline-none transition-all focus:border-blue-500"
                                value={form.endDate}
                                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Availability</p>
                            <p className={`mt-1 text-xs font-bold ${walkInAvailability.status === 'available'
                                ? 'text-emerald-700'
                                : walkInAvailability.status === 'conflict'
                                  ? 'text-rose-700'
                                  : 'text-blue-900'
                              }`}>
                              {walkInAvailability.reason}
                            </p>
                            {meetingRoomOverviewError ? (
                              <p className="mt-2 text-[10px] font-bold text-red-600">{meetingRoomOverviewError}</p>
                            ) : null}
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Start Time *</label>
                              <select
                                className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 font-bold text-gray-900 outline-none transition-all focus:border-blue-500"
                                value={form.startTime}
                                onChange={(e) => {
                                  const nextStartTime = e.target.value;
                                  const nextEndTime = nextStartTime
                                    ? minutesToTime((timeToMinutes(nextStartTime) || 0) + WALK_IN_MIN_DURATION_MINUTES)
                                    : '';
                                  setForm({
                                    ...form,
                                    startTime: nextStartTime,
                                    endTime: nextEndTime,
                                  });
                                }}
                              >
                                <option value="">Select start time</option>
                                {walkInStartTimeOptions.map((timeValue) => (
                                  <option key={timeValue} value={timeValue}>{formatTimeOptionLabel(timeValue)}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">End Time *</label>
                              <select
                                className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 font-bold text-gray-900 outline-none transition-all focus:border-blue-500"
                                value={form.endTime}
                                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                              >
                                <option value="">Select end time</option>
                                {walkInEndTimeOptions.map((timeValue) => (
                                  <option key={timeValue} value={timeValue}>{formatTimeOptionLabel(timeValue)}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {walkInAvailability.status === 'conflict' && walkInAvailability.slotSuggestions.length > 0 && (
                            <div className="space-y-3 rounded-xl border border-blue-100 bg-white p-3">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Alternative times</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">{formatWalkInDateLabel(form.startDate, form.endDate)}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {walkInAvailability.slotSuggestions.map((slot) => (
                                  <button
                                    key={`${slot.start}-${slot.end}`}
                                    type="button"
                                    onClick={() => setForm({ ...form, startTime: slot.start, endTime: slot.end })}
                                    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700 transition-all hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                                  >
                                    {formatTimeLabel(slot.start)} - {formatTimeLabel(slot.end)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {isDeskAreaSeatBooking && walkInAvailability.seatSuggestions.length > 0 && (
                            <div className="space-y-3 rounded-xl border border-blue-100 bg-white p-3">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Available seats</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Desk Area</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {walkInAvailability.seatSuggestions.map((seatNumber) => (
                                  <button
                                    key={seatNumber}
                                    type="button"
                                    onClick={() => setForm((prev) => ({ ...prev, seatNumber: String(seatNumber), attendees: 1 }))}
                                    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700 transition-all hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                                  >
                                    Seat {seatNumber}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid gap-4 lg:grid-cols-3">
                          <div className="rounded-lg border border-blue-100 bg-white p-2 shadow-sm">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Live pricing</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{selectedWalkInRoom?.capacity || 0} seats</p>
                            </div>
                            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-blue-600">
                              {selectedWalkInRoom?.pricePerHour > 0
                                ? `${formatCurrency(selectedWalkInRoom.pricePerHour)} / hr`
                                : selectedWalkInRoom?.pricing || 'Pricing pending'}
                            </p>
                            <div className="mt-3 space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setForm((prev) => ({ ...prev, discountType: 'amount' }))}
                                  className={`rounded-lg border px-2 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${form.discountType === 'amount' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'}`}
                                >
                                  Amount
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setForm((prev) => ({ ...prev, discountType: 'percent' }))}
                                  className={`rounded-lg border px-2 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${form.discountType === 'percent' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'}`}
                                >
                                  Percent
                                </button>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">
                                  Discount {form.discountType === 'percent' ? '(%)' : '(INR)'}
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step={form.discountType === 'percent' ? '1' : '1'}
                                  value={form.discountValue}
                                  onChange={(e) => setForm((prev) => ({ ...prev, discountValue: e.target.value }))}
                                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 outline-none transition-all focus:border-blue-500"
                                  placeholder={form.discountType === 'percent' ? 'e.g. 10' : 'e.g. 500'}
                                />
                              </div>
                              <div className="flex justify-between text-xs font-bold text-gray-600">
                                <span>Base rate</span>
                                <span>{hasWalkInQuote ? formatCurrency(walkInPricing.subtotalBeforeDiscount) : 'Pending'}</span>
                              </div>
                              <div className="flex justify-between text-xs font-bold text-gray-600">
                                <span>
                                  Discount
                                  {hasWalkInQuote && walkInPricing.discountType === 'percent' ? ` (${walkInPricing.discountValue}%)` : ''}
                                </span>
                                <span>{hasWalkInQuote ? `- ${formatCurrency(walkInPricing.discountAmount)}` : 'Pending'}</span>
                              </div>
                              <div className="flex justify-between text-xs font-bold text-gray-600">
                                <span>Taxable amount</span>
                                <span>{hasWalkInQuote ? formatCurrency(walkInPricing.taxableBaseAfterDiscount) : 'Pending'}</span>
                              </div>
                              <div className="flex justify-between text-xs font-bold text-gray-600">
                                <span>GST (18%)</span>
                                <span>{hasWalkInQuote ? formatCurrency(walkInPricing.gst) : 'Pending'}</span>
                              </div>
                              <div className="flex justify-between border-t border-gray-100 pt-2 text-sm font-black text-gray-900">
                                <span>Total</span>
                                <span>{hasWalkInQuote ? formatCurrency(walkInPricing.total) : 'Pending'}</span>
                              </div>
                            </div>
                          </div>

                          {walkInAvailability.status === 'conflict' && (
                            <div className="rounded-lg border border-blue-100 bg-white p-2 shadow-sm">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Room alternatives</p>
                              <div className="mt-3 space-y-2">
                                {walkInAvailability.roomSuggestions.length > 0 ? (
                                  walkInAvailability.roomSuggestions.map((room) => (
                                    <button
                                      key={room.name}
                                      type="button"
                                      onClick={() => setForm((prev) => ({ ...prev, floor: room.floor || prev.floor, wing: room.wing || prev.wing, resourceName: room.name, seatNumber: '' }))}
                                      className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left transition-all hover:border-blue-200 hover:bg-blue-50"
                                    >
                                      <span className="text-xs font-semibold text-gray-900">{room.name}</span>
                                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{room.floor} - {room.capacity} seats</span>
                                    </button>
                                  ))
                                ) : (
                                  <p className="text-xs font-medium text-gray-500">No alternate room suggestions for the selected slot.</p>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="rounded-lg border border-blue-100 bg-white p-2 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Payment mode</p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {['Cash', 'GPay (UPI)'].map((mode) => (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() => setForm({ ...form, paymentMode: mode, transactionId: mode === 'GPay (UPI)' ? form.transactionId : '', paymentProofFile: mode === 'GPay (UPI)' ? form.paymentProofFile : null })}
                                  className={`rounded-xl border px-3 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${form.paymentMode === mode ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-200' : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'}`}
                                >
                                  {mode}
                                </button>
                              ))}
                            </div>
                            {normalizeText(form.paymentMode).includes('gpay') && (
                              <div className="mt-4 space-y-3">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Transaction Number *</label>
                                  <input
                                    type="text"
                                    value={form.transactionId}
                                    onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
                                    placeholder="Enter GPay reference / UTR"
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Payment Screenshot *</label>
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg"
                                    onChange={(e) => setForm({ ...form, paymentProofFile: e.target.files?.[0] || null })}
                                    className="block w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:text-white hover:border-blue-300"
                                  />
                                  {form.paymentProofFile?.name ? (
                                    <p className="text-[10px] font-bold text-blue-700">Selected: {form.paymentProofFile.name}</p>
                                  ) : null}
                                  <p className="text-[10px] font-medium text-gray-500">Upload a JPG or PNG screenshot from the UPI app.</p>
                                </div>
                              </div>
                            )}
                            <div className="mt-4 rounded-xl bg-blue-50 p-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Summary</p>
                              <p className="mt-1 text-xs font-bold text-blue-950">{selectedWalkInRoom?.name || 'Select a room'} - {selectedWalkInRoom?.floor || form.floor || 'Select floor'} {selectedWalkInRoom?.wing || form.wing || ''}{isDeskAreaSeatBooking ? ` - Seat ${form.seatNumber || '-'}` : ''} - {formatWalkInDateLabel(form.startDate, form.endDate) || 'Select dates'}</p>
                              <p className="mt-1 text-xs font-medium text-blue-900/80">{walkInAvailability.reason}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {visitorMode === 'verify_booking' && (
                    <div className="space-y-2.5 animate-in fade-in h-full flex flex-col bg-gray-50 rounded-lg border border-gray-200 p-2.5 text-[10px]">
                      <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b border-blue-200 pb-2 mb-2 flex items-center gap-2"><Search size={16} /> Online Booking Lookup</h3>

                      <div className="flex gap-3">
                        <input type="text" placeholder="Enter booking ID..." className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:border-blue-500 outline-none uppercase shadow-sm text-xs" value={form.bookingId} onChange={e => setForm({ ...form, bookingId: e.target.value })} />
                        <button onClick={handleVerifySearch} disabled={!form.bookingId || !visitorAccess.modes.verify_booking} title={!visitorAccess.modes.verify_booking ? 'You do not have permission to verify booking IDs.' : undefined} className="px-6 bg-gray-900 text-white rounded-xl font-black text-xs hover:bg-black disabled:bg-gray-300 transition-all shadow-md">FETCH</button>
                      </div>

                      {verifiedBooking && (
                        <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 animate-in slide-in-from-bottom-2">
                          <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Matched Booking</p>
                              <p className="font-bold text-gray-900 text-lg mt-1">{verifiedBooking.resource}</p>
                              <p className="text-xs font-bold text-gray-500">{verifiedBooking.date} • {verifiedBooking.time}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${verifiedBooking.status === 'Pending Payment' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                              {verifiedBooking.status}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-500 uppercase">Booked By / Primary Attendee</p>
                            <p className="font-bold text-gray-900">{verifiedBooking.bookedBy} <span className="text-gray-400 text-xs">({verifiedBooking.company})</span></p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-xl bg-gray-50 p-3">
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Booking ID</p>
                              <p className="mt-1 font-black text-gray-900">{verifiedBooking.id}</p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-3">
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Attendees</p>
                              <p className="mt-1 font-black text-gray-900">{verifiedBooking.attendees || '1'}</p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-3">
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Email</p>
                              <p className="mt-1 font-bold text-gray-900">{verifiedBooking.email || 'Not provided'}</p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-3">
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Payment Mode</p>
                              <p className="mt-1 font-bold text-gray-900">{verifiedBooking.paymentMode || 'Not set'}</p>
                            </div>
                          </div>

                          {verifiedBooking.status === 'Pending Payment' && (
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-amber-800 uppercase tracking-widest">Amount Due:</span>
                                <span className="text-xl font-black text-amber-600">₹{verifiedBooking.amountDue}</span>
                              </div>
                              <div className="flex gap-2">
                                {['Cash', 'GPay (UPI)'].map(method => (
                                  <button
                                    key={method} type="button" onClick={() => setForm({ ...form, paymentMode: method })}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all border ${form.paymentMode === method ? 'border-amber-500 bg-amber-500 text-white' : 'border-amber-200 bg-white text-amber-700'}`}
                                  >
                                    {method}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4 shrink-0">
                <button onClick={() => { setIsLoggingVisitor(false); setVerifiedBooking(null); setBookingConfirmation(null); setShowBookingConfirmationPopup(false); setWalkInStep(1); setAvailabilityStatus('idle'); }} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-black text-xs text-gray-500 hover:text-gray-900 transition-all shadow-sm">CANCEL</button>

                {visitorMode === 'standard' && (
                  <button
                    onClick={handleProcessAction}
                    disabled={isSubmittingVisitor || isVisitorOverviewLoading || !isStandardFormComplete || !visitorAccess.modes.standard}
                    title={!visitorAccess.modes.standard ? 'You do not have access to Standard Visitor tab.' : undefined}
                    className="flex-[2] py-3 bg-[#2563EB] text-white rounded-xl text-xs font-black shadow-md shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 disabled:bg-slate-300 disabled:shadow-none"
                  >
                    <CheckCircle2 size={18} />{isSubmittingVisitor ? 'SENDING...' : form.standardVisitorType === 'department' ? 'SEND HOST APPROVAL' : 'CHECK IN VISITOR'}
                  </button>
                )}
                {visitorMode === 'tour' && (
                  <button onClick={handleProcessAction} disabled={!visitorAccess.modes.tour} title={!visitorAccess.modes.tour ? 'You do not have access to Unit Tour tab.' : undefined} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 disabled:bg-gray-300 disabled:shadow-none">
                    <Building size={18} /> SYNC LEAD & START TOUR
                  </button>
                )}
                {visitorMode === 'walkin_booking' && (
                  <button disabled={!walkInAvailability.available || isSubmittingVisitor || !visitorAccess.modes.walkin_booking} title={!visitorAccess.modes.walkin_booking ? 'You do not have access to Walk-in Booking tab.' : undefined} onClick={handleProcessAction} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-xs font-black shadow-md shadow-blue-200 disabled:bg-gray-300 disabled:shadow-none hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5">
                    <Wallet size={18} /> {isSubmittingVisitor ? 'CONFIRMING...' : 'COLLECT PAYMENT & CONFIRM'}
                  </button>
                )}
                {visitorMode === 'verify_booking' && (
                  <button disabled={!verifiedBooking || !visitorAccess.modes.verify_booking} title={!visitorAccess.modes.verify_booking ? 'You do not have access to Verify Booking tab.' : undefined} onClick={handleProcessAction} className="flex-[2] py-3 bg-green-600 text-white rounded-xl text-xs font-black shadow-md shadow-green-200 disabled:bg-gray-300 disabled:shadow-none hover:bg-green-700 transition-all flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={18} /> {verifiedBooking?.status === 'Pending Payment' ? 'MARK PAID & CHECK IN' : 'CONFIRM ENTRY'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {isLoggingVisitor && showBookingConfirmationPopup && bookingConfirmation && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0F172A]/85 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-[32px] border border-emerald-200 bg-white shadow-2xl">
              <div className="bg-emerald-50 px-6 py-5 border-b border-emerald-100 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Booking Confirmed</p>
                  <h3 className="mt-1 text-2xl font-black text-emerald-950">Walk-in booking saved</h3>
                  <p className="mt-1 text-sm font-semibold text-emerald-900/80">Move to verification and fetch the booking ID.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingConfirmationPopup(false);
                    setBookingConfirmation(null);
                  }}
                  className="w-9 h-9 rounded-full bg-white text-emerald-700 shadow-sm hover:bg-emerald-100 transition-all flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-3.5">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Booking ID</p>
                  <p className="mt-1 text-2xl font-black tracking-[0.2em] text-emerald-700">{bookingConfirmation.bookingId}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">This ID is already saved and ready to verify.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Room</p>
                    <p className="mt-1 text-sm font-black text-gray-900">{bookingConfirmation.roomName}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Total</p>
                    <p className="mt-1 text-sm font-black text-gray-900">{formatCurrency(bookingConfirmation.totalAmount || 0)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Payment Mode</p>
                    <p className="mt-1 text-sm font-black text-gray-900">{bookingConfirmation.paymentMode || 'Cash'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Transaction</p>
                    <p className="mt-1 text-sm font-black text-gray-900">{bookingConfirmation.transactionId || 'Not required'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      ...getDefaultVisitorForm(),
                      bookingId: bookingConfirmation.bookingId,
                      paymentMode: bookingConfirmation.paymentMode || '',
                      transactionId: '',
                      paymentProofFile: null,
                    });
                    setVisitorMode('verify_booking');
                    setVerifiedBooking(null);
                    setShowBookingConfirmationPopup(false);
                    setBookingConfirmation(null);
                    setAvailabilityStatus('idle');
                  }}
                  className="w-full rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700"
                >
                  GO TO VERIFY BOOKING
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: EXTEND BOOKING MODAL */}
        {isExtendModalOpen && extendingBooking && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
              <div className="p-6 md:p-8 bg-indigo-600 text-white flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-xl font-black flex items-center gap-2"><Clock size={20} /> Extend Booking</h2>
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mt-1">{extendingBooking.resource} • {extendingBooking.bookedBy}</p>
                </div>
                <button onClick={() => { setIsExtendModalOpen(false); setExtendAvailability('idle'); }} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-red-500 transition-all"><X size={16} /></button>
              </div>

              <form onSubmit={handleExtendBooking} className="p-6 md:p-8 overflow-y-auto flex-1 bg-white space-y-6">

                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Current End Time</p>
                    <p className="text-lg font-black text-indigo-900">{extendingBooking.time.split(' - ')[1].replace(' (Extended)', '')}</p>
                  </div>
                  <ArrowRight size={20} className="text-indigo-300" />
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">New End Time *</p>
                    <input required type="time" step={WALK_IN_SLOT_STEP * 60} min={(() => {
                      const startTime = extendingBooking?.raw?.startTime || extendingBooking?.startTime || '';
                      const startMinutes = timeToMinutes(startTime);
                      return startMinutes == null ? undefined : minutesToTime(startMinutes + WALK_IN_MIN_DURATION_MINUTES);
                    })()} className="w-28 px-3 py-2 bg-white border border-gray-200 rounded-lg font-bold text-gray-900 focus:border-indigo-500 outline-none cursor-pointer" value={extendForm.newEndTime} onChange={e => { setExtendForm({ ...extendForm, newEndTime: e.target.value }); setExtendAvailability('idle'); }} />
                  </div>
                </div>

                {extendAvailability === 'idle' && extendForm.newEndTime && (
                  <button type="button" onClick={handleCheckExtendAvailability} className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-black text-xs hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
                    <Search size={14} /> Check Availability & Calculate
                  </button>
                )}

                {extendAvailability === 'checking' && (
                  <div className="w-full py-3.5 bg-gray-100 text-gray-500 rounded-xl font-black text-xs flex items-center justify-center gap-2 animate-pulse">
                    Checking conflicts...
                  </div>
                )}

                {extendAvailability === 'conflict' && (
                  <div className="w-full p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-in shake">
                    <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-red-700">Extension Blocked</p>
                      <p className="text-[10px] font-bold text-red-600 mt-1">Another booking conflicts with this extension window (including the 5-minute cleanup buffer).</p>
                    </div>
                  </div>
                )}

                {extendAvailability === 'available' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 space-y-3.5">
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Extra Charges Calculation</p>
                      <div className="flex justify-between text-xs font-bold text-gray-600 mb-2">
                        <span>Extra Hours ({extendPricing.extraHours}h)</span>
                        <span>{formatCurrency(extendPricing.base)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-gray-600 mb-3 pb-3 border-b border-gray-200">
                        <span>GST (18%)</span>
                        <span>{formatCurrency(extendPricing.gst)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-black text-gray-900">
                        <span>Total Extra Due</span>
                        <span>{formatCurrency(extendPricing.total)}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><CreditCard size={12} /> Collect Payment</p>
                      <div className="flex gap-2">
                        {['Cash', 'GPay (UPI)'].map(mode => (
                          <button key={mode} type="button" onClick={() => setExtendForm({ ...extendForm, paymentMode: mode })} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all border-2 ${extendForm.paymentMode === mode ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'}`}>
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => { setIsExtendModalOpen(false); setExtendAvailability('idle'); }} className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-black hover:bg-gray-200 transition-all text-xs">CANCEL</button>
                  <button type="submit" disabled={extendAvailability !== 'available'} className="flex-[2] py-3.5 bg-indigo-600 text-white rounded-xl font-black shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    COLLECT & EXTEND <CheckCircle2 size={16} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: CANCEL UPCOMING BOOKING */}
        {cancellingBooking && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0F172A]/90 backdrop-blur-md">
            <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in duration-200 overflow-hidden flex flex-col">
              <div className="p-8 bg-red-50 border-b border-red-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 text-red-600 rounded-xl"><XCircle size={24} /></div>
                  <div>
                    <h2 className="text-xl font-black text-red-900 leading-none">Cancel Booking</h2>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1">{cancellingBooking.id}</p>
                  </div>
                </div>
                <button onClick={() => setCancellingBooking(null)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm hover:text-red-500 transition-all"><X size={16} /></button>
              </div>

              <div className="p-8 space-y-6">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex gap-3 items-start">
                  <ShieldAlert className="text-gray-500 shrink-0 mt-0.5" size={20} />
                  <div className="text-xs text-gray-600 font-medium leading-relaxed">
                    Cancelling <span className="font-bold text-gray-900">{cancellingBooking.resource}</span> for <span className="font-bold text-gray-900">{cancellingBooking.bookedBy}</span>. System will free up the slot on the calendar immediately.
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Reason for Cancellation *</label>
                  <textarea
                    className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:border-red-400 outline-none resize-none"
                    rows={3} placeholder="Provide a reason..."
                    value={cancelForm.reason} onChange={e => setCancelForm({ ...cancelForm, reason: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Refund Action</label>
                  <select
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:border-red-400 outline-none cursor-pointer"
                    value={cancelForm.refundType} onChange={e => setCancelForm({ ...cancelForm, refundType: e.target.value })}
                  >
                    <option value="Full Refund">Full Refund (100% Credits/Money back)</option>
                    <option value="Partial Refund">Partial Refund (50% Penalty)</option>
                    <option value="No refund">No Refund (Late Cancellation)</option>
                  </select>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                <button onClick={() => setCancellingBooking(null)} className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl font-black text-gray-500 hover:text-gray-900 transition-all">ABORT</button>
                <button disabled={!cancelForm.reason} onClick={handleCancelUpcoming} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-200 disabled:bg-gray-300 disabled:shadow-none hover:bg-red-700 transition-all">CONFIRM CANCELLATION</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: RESCHEDULE BOOKING */}
        {reschedulingBooking && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0F172A]/90 backdrop-blur-md">
            <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl animate-in zoom-in duration-200 overflow-hidden flex flex-col">
              <div className="p-8 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><CalendarDays size={24} /></div>
                  <div>
                    <h2 className="text-xl font-black text-amber-900 leading-none">Reschedule Booking</h2>
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1">{reschedulingBooking.resource}</p>
                  </div>
                </div>
                <button onClick={() => { setReschedulingBooking(null); setRescheduleForm({ newDate: '', newStartTime: '', newEndTime: '' }) }} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm hover:text-red-500 transition-all"><X size={16} /></button>
              </div>

              <div className="p-8 space-y-6">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Booked Slot</p>
                    <p className="font-bold text-gray-900">{reschedulingBooking.date} • {reschedulingBooking.time}</p>
                  </div>
                  <div className="flex-1 border-l-2 border-gray-200 pl-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Resource</p>
                    <p className="font-bold text-blue-600">{reschedulingBooking.resource}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select New Date *</label>
                    <input
                      type="date"
                      className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl font-black text-gray-900 focus:border-amber-400 outline-none transition-all shadow-sm cursor-pointer"
                      value={rescheduleForm.newDate} onChange={e => setRescheduleForm({ ...rescheduleForm, newDate: e.target.value, newStartTime: '', newEndTime: '' })}
                    />
                  </div>

                  {rescheduleForm.newDate ? (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Available Time Slots</label>
                        <span className="text-[10px] font-black text-green-600 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded"><Check size={10} /> Live Master Calendar Sync</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[150px] overflow-y-auto pr-2">
                        {['09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00'].map((slot, idx) => {
                          const [slotStart = '', slotEnd = ''] = slot.split('-');
                          const slotStartMinutes = timeToMinutes(slotStart);
                          const slotEndMinutes = timeToMinutes(slotEnd);
                          const rescheduleDateKey = formatDateKey(rescheduleForm.newDate);
                          const currentBookingId = String(reschedulingBooking?.recordId || reschedulingBooking?.id || '').trim();
                          const booked = meetingRoomBookings.some((booking) => {
                            const bookingId = String(booking.recordId || booking.id || booking.bookingCode || '').trim();
                            if (bookingId && bookingId === currentBookingId) {
                              return false;
                            }
                            if (slotStartMinutes == null || slotEndMinutes == null) {
                              return false;
                            }
                            return getOverlapConflict(
                              booking,
                              reschedulingBooking?.resource || '',
                              rescheduleDateKey,
                              rescheduleDateKey,
                              slotStartMinutes,
                              slotEndMinutes,
                            );
                          });
                          const selected = rescheduleForm.newStartTime === slotStart && rescheduleForm.newEndTime === slotEnd;
                          const displayLabel = `${formatTimeLabel(slotStart)} - ${formatTimeLabel(slotEnd)}`;
                          return (
                            <button
                              key={idx} disabled={booked} onClick={() => setRescheduleForm({ ...rescheduleForm, newStartTime: slotStart, newEndTime: slotEnd })}
                              className={`relative p-3 rounded-xl border-2 text-xs font-black transition-all text-center overflow-hidden
                               ${booked ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60' :
                                  selected ? 'bg-amber-500 border-amber-500 text-white shadow-md' :
                                    'bg-white border-green-200 text-green-700 hover:bg-green-50'}`}
                            >
                              <span className={booked ? 'line-through decoration-red-400 decoration-2' : ''}>{displayLabel}</span>
                              {booked && <span className="block text-[9px] uppercase mt-1 text-red-500">Booked by another</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center text-gray-400 font-bold text-sm bg-gray-50/50">
                      Please select a date above to view live slot availability.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                <button onClick={() => { setReschedulingBooking(null); setRescheduleForm({ newDate: '', newStartTime: '', newEndTime: '' }) }} className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl font-black text-gray-500 hover:text-gray-900 transition-all shadow-sm">CANCEL</button>
                <button disabled={!rescheduleForm.newDate || !rescheduleForm.newStartTime || !rescheduleForm.newEndTime} onClick={handleRescheduleUpcoming} className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black shadow-lg shadow-amber-200 disabled:bg-gray-300 disabled:shadow-none hover:bg-amber-600 transition-all flex items-center justify-center gap-2">
                  <CheckCircle2 size={18} /> UPDATE BOOKING SLOT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5: VIEW HISTORICAL VISITOR DETAILS  */}
        {viewingVisitor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-sm">
            <div className="bg-white rounded-[24px] w-full max-w-[760px] shadow-2xl animate-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[82vh]">

              <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-start shrink-0">
                <div>
                  <h2 className="text-lg font-['Poppins'] font-extrabold text-gray-900 leading-tight flex items-center gap-2">
                    {viewingVisitor.name}
                    <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${getStatusBadge(viewingVisitor.status)}`}>{viewingVisitor.status}</span>
                    {viewingVisitor.convertedToClient && (
                      <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">Converted to Client</span>
                    )}
                  </h2>
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1.5">{viewingVisitor.company} • Badge: {viewingVisitor.badgeNo || 'N/A'}</p>
                </div>
                <button onClick={() => setViewingVisitor(null)} className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm hover:text-red-500 transition-all"><X size={18} /></button>
              </div>

              <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 bg-white">

                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider">First Name</p>
                    <p className="font-bold text-gray-900 text-xs">{viewingVisitor.firstName || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider">Last Name</p>
                    <p className="font-bold text-gray-900 text-xs">{viewingVisitor.lastName || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider">Gender</p>
                    <p className="font-bold text-gray-900 text-xs">{viewingVisitor.gender || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider flex items-center gap-1"><Phone size={12} /> Phone Contact</p>
                    <p className="font-bold text-gray-900 text-xs">{viewingVisitor.phone || 'Not Provided'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider">Country</p>
                    <p className="font-bold text-gray-900 text-xs">{viewingVisitor.country || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider">State</p>
                    <p className="font-bold text-gray-900 text-xs">{viewingVisitor.state || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider">City</p>
                    <p className="font-bold text-gray-900 text-xs">{viewingVisitor.city || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider flex items-center gap-1"><User size={12} /> Host / Point of Contact</p>
                    <p className="font-bold text-gray-900 text-xs">{viewingVisitor.host}</p>
                    {viewingVisitor.department && <p className="text-[10px] text-gray-500 font-bold uppercase">{viewingVisitor.department}</p>}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider flex items-center gap-1"><BadgeCheck size={12} /> Visit Purpose</p>
                    <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-xs rounded">{viewingVisitor.purpose}</span>
                  </div>
                  {viewingVisitor.bookingId && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider flex items-center gap-1"><FileText size={12} /> Online Booking ID</p>
                      <p className="font-black text-blue-600 text-xs">{viewingVisitor.bookingId}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Visit Date</p>
                    <p className="mt-1.5 text-xs font-black text-gray-900">{viewingVisitor.date || formatDisplayDate(viewingVisitor.createdAt)}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Visitor Code</p>
                    <p className="mt-1.5 text-xs font-black text-gray-900">{viewingVisitor.visitorCode || 'N/A'}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Source</p>
                    <p className="mt-1.5 text-xs font-black text-gray-900">{viewingVisitor.source || 'Frontdesk'}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Department</p>
                    <p className="mt-1.5 text-xs font-black text-gray-900">{viewingVisitor.department || 'General'}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Visitor Type</p>
                    <p className="mt-1.5 text-xs font-black text-gray-900">{toTitleCase(viewingVisitor.visitorType || 'standard')}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Company Type</p>
                    <p className="mt-1.5 text-xs font-black text-gray-900">{toTitleCase(viewingVisitor.visitorCompanyType || 'individual')}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Visitor Company</p>
                  <p className="mt-1.5 text-xs font-black text-gray-900">
                    {normalizeText(viewingVisitor.visitorType) === 'tenant'
                      ? (viewingVisitor.tenantCompanyName || 'N/A')
                      : 'Not Applicable'}
                  </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-center">
                  <div className={`flex-1 p-3 border rounded-xl ${viewingVisitor.status === 'Cancelled' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                    <p className={`text-[10px] font-['Poppins'] font-extrabold uppercase tracking-widest mb-1 ${viewingVisitor.status === 'Cancelled' ? 'text-red-600' : 'text-green-600'}`}>Time In</p>
                    <p className={`text-base font-black ${viewingVisitor.status === 'Cancelled' ? 'text-red-700 line-through' : 'text-green-700'}`}>{viewingVisitor.checkIn || formatTimeLabel(viewingVisitor.checkInAt) || '--:--'}</p>
                  </div>
                  <div className="text-gray-300"><ArrowRight size={24} strokeWidth={3} /></div>
                  <div className={`flex-1 p-3 border rounded-xl ${(viewingVisitor.checkOut || '--:--') === '--:--' ? 'border-gray-200 bg-gray-50' : 'border-gray-300 bg-gray-100'}`}>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Time Out</p>
                    <p className="text-base font-black text-gray-700">{viewingVisitor.checkOut || formatTimeLabel(viewingVisitor.checkOutAt) || '--:--'}</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reason to Meet Host</p>
                  <p className="mt-1.5 text-xs font-medium text-gray-700 leading-relaxed">{viewingVisitor.reason || viewingVisitor.notes || 'No reason added.'}</p>
                </div>

                {String(viewingVisitor.approvalStatus || viewingVisitor.status || '').toLowerCase() === 'rejected' && (
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Rejection Reason</p>
                    <p className="mt-1.5 text-xs font-medium text-red-700 leading-relaxed">
                      {viewingVisitor.rejectionReason || 'No rejection reason provided.'}
                    </p>
                  </div>
                )}

              </div>

              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-2.5 shrink-0">
                <button onClick={() => setViewingVisitor(null)} className="flex-1 py-2.5 bg-white border border-gray-200 rounded-lg font-black text-xs text-gray-600 hover:bg-gray-100 transition-all">CLOSE</button>
                {!isVisitorCheckedOut(viewingVisitor) && (
                  <button onClick={() => handlePrintBadge(viewingVisitor)} className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg font-black text-xs shadow-lg hover:bg-black transition-all flex items-center justify-center gap-1.5">
                    <Printer size={15} /> PRINT BADGE
                  </button>
                )}
                {viewingVisitor.status === 'Checked In' && (
                  <button onClick={() => handleCheckOut(viewingVisitor.id)} className="flex-1 py-2.5 rounded-lg font-black text-xs transition-all flex items-center justify-center gap-1.5 bg-red-600 text-white shadow-lg shadow-red-200 hover:bg-red-700">
                    <LogOut size={15} /> CHECK OUT
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5B: VIEW DAILY BOOKING DETAILS */}
        {viewingBooking && (
          <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-[#0F172A]/85 backdrop-blur-sm">
            <div className="bg-white rounded-[40px] w-full max-w-5xl shadow-2xl animate-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 bg-amber-50 border-b border-amber-100 flex justify-between items-start shrink-0">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 leading-none flex items-center gap-3">
                    {viewingBooking.resource}
                    <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${getStatusBadge(viewingBooking.status)}`}>{viewingBooking.status}</span>
                  </h2>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">
                    {viewingBooking.company}
                  </p>
                </div>
                <button onClick={() => setViewingBooking(null)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm hover:text-red-500 transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4">
                  <div className="rounded-3xl bg-gray-50 border border-gray-100 p-4 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Booked By</p>
                    <p className="text-lg font-black text-gray-900">{viewingBooking.bookedBy}</p>
                    <p className="text-xs font-bold text-gray-500">{viewingBooking.company}</p>
                  </div>
                  <div className="rounded-3xl bg-gray-50 border border-gray-100 p-4 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Schedule</p>
                    <p className="text-lg font-black text-gray-900">{viewingBooking.dateLabel || formatDisplayDate(viewingBooking.date)}</p>
                    <p className="text-xs font-bold text-gray-500">{viewingBooking.time}</p>
                    {viewingBooking.isExtended && (
                      <div className="pt-2 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Original Slot</p>
                        <p className="text-xs font-bold text-gray-400 line-through decoration-gray-300">{viewingBooking.originalDateLabel || viewingBooking.dateLabel || formatDisplayDate(viewingBooking.date)} â€¢ {viewingBooking.originalTime || viewingBooking.time}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mt-2">Extended Slot</p>
                        <p className="text-xs font-bold text-purple-700">{viewingBooking.dateLabel || formatDisplayDate(viewingBooking.date)} â€¢ {viewingBooking.time}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Payment Status</p>
                    <p className={`mt-2 text-sm font-black ${normalizeText(viewingBooking.paymentStatus).includes('pending') || normalizeText(viewingBooking.paymentStatus).includes('unpaid') ? 'text-amber-600' : 'text-emerald-600'}`}>{viewingBooking.paymentStatus || 'Pending Payment'}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4 md:col-span-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Amount Breakdown</p>
                    <div className="mt-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500">Base Amount</span>
                        <span className="text-sm font-black text-gray-900">{formatCurrency(viewingBooking.subtotalBeforeDiscount || viewingBooking.baseAmount || 0)}</span>
                      </div>
                      {Number(viewingBooking.discountAmount || 0) > 0 && (
                        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2">
                          <span className="text-xs font-bold text-emerald-600">
                            Discount{viewingBooking.discountType === 'percent' ? ` (${Number(viewingBooking.discountValue || 0)}%)` : ''}
                          </span>
                          <span className="text-sm font-black text-emerald-700">- {formatCurrency(viewingBooking.discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500">GST (18%)</span>
                        <span className="text-sm font-black text-gray-900">{formatCurrency(viewingBooking.gstAmount || 0)}</span>
                      </div>
                      {Number(viewingBooking.extensionAmount || 0) > 0 && (
                        <div className="flex items-center justify-between rounded-xl bg-purple-50 px-3 py-2">
                          <span className="text-xs font-bold text-purple-600">Extension Charges</span>
                          <span className="text-sm font-black text-purple-700">{formatCurrency(viewingBooking.extensionAmount)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-gray-200 pt-2.5">
                        <span className="text-sm font-black text-gray-900">Total Paid</span>
                        <span className="text-base font-black text-blue-700">{formatCurrency(viewingBooking.totalAmount || viewingBooking.amountDue || 0)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Payment Mode</p>
                    <p className="mt-2 text-sm font-black text-gray-900">{viewingBooking.paymentMode || 'Not set'}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Attendees</p>
                    <p className="mt-2 text-sm font-black text-gray-900">{viewingBooking.attendees || 0}</p>
                  </div>
                </div>

                <div className="rounded-3xl bg-gray-50 border border-gray-100 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Contact & Source</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Phone</p>
                      <p className="mt-1 font-bold text-gray-900">{viewingBooking.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Email</p>
                      <p className="mt-1 font-bold text-gray-900 break-all">{viewingBooking.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Finance Status</p>
                      <p className="mt-1 font-bold text-gray-900">{viewingBooking.financeStatus || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Source Reference</p>
                      <p className="mt-1 font-bold text-gray-900 break-all">{viewingBooking.sourceReference || 'Frontdesk'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Booking Type</p>
                      <p className="mt-1 font-bold text-gray-900">{viewingBooking.bookingType || 'External'}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Notes</p>
                    <p className="mt-1 text-sm font-medium text-gray-700 leading-relaxed">{viewingBooking.notes || 'No booking notes added.'}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4 shrink-0">
                <button onClick={() => setViewingBooking(null)} className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl font-black text-gray-600 hover:bg-gray-100 transition-all">
                  CLOSE
                </button>
                {viewingBooking.status === 'In Progress' ? (
                  <>
                    <button onClick={() => { setExtendingBooking(viewingBooking); setExtendAvailability('idle'); setExtendForm({ newEndTime: '', paymentMode: 'Cash' }); setIsExtendModalOpen(true); }} className="flex-1 py-4 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-2xl font-black hover:bg-indigo-100 transition-all flex items-center justify-center gap-2">
                      <Clock size={18} /> EXTEND SLOT
                    </button>
                  </>
                ) : viewingBooking.status !== 'Completed' && viewingBooking.status !== 'Cancelled' && (
                  <>
                    <button onClick={() => { setReschedulingBooking(viewingBooking); setRescheduleForm({ newDate: '', newStartTime: '', newEndTime: '' }); setViewingBooking(null); }} className="flex-1 py-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl font-black hover:bg-amber-100 transition-all flex items-center justify-center gap-2">
                      <CalendarIcon size={18} /> RESCHEDULE
                    </button>
                    <button onClick={() => { setCancellingBooking(viewingBooking); setViewingBooking(null); }} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                      <XCircle size={18} /> CANCEL
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5C: CLIENT BOOKING HISTORY */}
        {viewingClient && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0F172A]/85 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[36px] bg-white shadow-2xl animate-in zoom-in duration-200">
              <div className="flex shrink-0 items-start justify-between border-b border-blue-100 bg-blue-50 p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black leading-none text-slate-950">{viewingClient.name || viewingClient.company || 'Client'}</h2>
                    <span className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
                      {viewingClient.clientCode || 'Client'}
                    </span>
                    {normalizeText(viewingClient.source) === 'visitor-conversion' && (
                      <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                        Converted Visitor
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">{viewingClient.company || 'Individual'} • {viewingClient.bookingCount || 0} bookings</p>
                </div>
                <button onClick={() => setViewingClient(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition-all hover:text-red-500">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Phone</p>
                    <p className="mt-2 text-sm font-black text-slate-900">{viewingClient.phone || 'Not provided'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 md:col-span-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Email</p>
                    <p className="mt-2 break-all text-sm font-black text-slate-900">{viewingClient.email || 'Not provided'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Bookings</p>
                    <p className="mt-2 text-xl font-black text-slate-900">{viewingClient.bookingCount || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Value</p>
                    <p className="mt-2 text-xl font-black text-slate-900">{formatCurrency(viewingClient.totalBookedAmount || 0)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Source</p>
                    <p className="mt-2 text-sm font-black text-slate-900">{viewingClient.source || 'booking'}</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white">
                  <div className="border-b border-slate-100 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Booking History</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(viewingClient.bookings || []).map((booking) => (
                      <div key={booking.recordId || booking.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-slate-950">{booking.resource}</p>
                            <span className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${getStatusBadge(booking.status)}`}>{booking.status}</span>
                          </div>
                          <p className="mt-1 text-xs font-bold text-slate-500">{booking.dateLabel || booking.date} • {booking.time}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">{booking.sourceReference || booking.notes || 'Frontdesk booking'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-900">{formatCurrency(booking.totalAmount || booking.amountDue || 0)}</p>
                            {Number(booking.discountAmount || 0) > 0 && (
                              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                Disc. {formatCurrency(booking.discountAmount)}{booking.discountType === 'percent' ? ` (${Number(booking.discountValue || 0)}%)` : ''}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => { setViewingBooking(booking); setViewingClient(null); }}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!viewingClient.bookings || viewingClient.bookings.length === 0) && (
                      <div className="p-8 text-center text-sm font-bold text-slate-400">No booking records found for this client yet.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-6">
                <button onClick={() => setViewingClient(null)} className="w-full rounded-2xl border border-slate-200 bg-white py-4 font-black text-slate-600 transition-all hover:bg-slate-100">
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 6: POST-CHECK-IN BADGE */}
        {showBadge && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0F172A]/95 backdrop-blur-md">
            <div className="bg-white w-full max-w-xs rounded-[2.2rem] shadow-2xl animate-in zoom-in duration-300 overflow-hidden flex flex-col items-center p-6 text-center relative">

              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-green-400 to-green-500 rounded-b-[30px] -z-0"></div>

              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl z-10 mb-4 border-4 border-green-50">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>

              <h2 className="text-xl font-black text-gray-900 z-10">Check-In Successful</h2>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2 mb-5">Virtual Visitor Badge Generated</p>

              <div className="w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-4 relative">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-14 h-5 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center"><div className="w-7 h-1.5 bg-gray-200 rounded-full"></div></div>

                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-3">VISITOR PASS</p>
                <h3 className="text-xl font-black text-gray-900 mb-1 leading-tight">{showBadge.name}</h3>
                <p className="text-[11px] font-bold text-gray-500 mb-4">{showBadge.company}</p>

                <div className="grid grid-cols-2 gap-3 text-left border-t border-gray-200 pt-3">
                  <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Badge No</p><p className="font-black text-base text-gray-900">{showBadge.badgeNo}</p></div>
                  <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Purpose</p><p className="font-bold text-xs text-gray-700">{showBadge.purpose}</p></div>
                  <div className="col-span-2"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Host / Destination</p><p className="font-bold text-xs text-gray-700">{showBadge.host}</p></div>
                </div>
              </div>

              <p className="text-[10px] font-bold text-amber-600 mt-4 max-w-[240px] leading-relaxed">{showBadge.notes || "Host has been notified via email and SMS."}</p>

              <div className="w-full mt-5 grid grid-cols-2 gap-2">
                <button onClick={handlePrintBadge} className="w-full py-3 bg-gray-900 text-white rounded-2xl text-xs font-black shadow-lg hover:bg-black transition-all">
                  PRINT BADGE
                </button>
                <button onClick={() => setShowBadge(null)} className="w-full py-3 border border-gray-300 text-gray-700 rounded-2xl text-xs font-black hover:bg-gray-50 transition-all">
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </PageFrame>
    </>
  );
}




