import { useEffect, useMemo, useState } from 'react';
import { City, Country, State } from 'country-state-city';
import useAuth from '../../hooks/useAuth';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useBusinessHours from '../../hooks/useBusinessHours';

import {
  createVisitorLog,
  checkInVisitorLog,
  checkOutVisitorLog,
  getVisitorManagementOverview,
} from '../../services/visitors';
import { PERMISSIONS } from '../../constants/permissions';
import {
  createExternalClient,
  createMeetingRoomBooking,
  getExternalClients,
  getMeetingRoomBookings,
  sendExternalBookingConfirmationEmail,
  updateMeetingRoomBooking,
} from '../../services/meeting-room-bookings';
import { toast } from 'sonner';
import {
  Search, Check, X, Eye, Clock, Building, User,
  AlertCircle, ChevronDown, CreditCard, CheckCircle2,
  LogOut, UserPlus, FileText, BadgeCheck, Phone, Mail,
  CalendarDays, ShieldCheck, ArrowRight, Wallet, Banknote, Sparkles,
  XCircle, ShieldAlert, Calendar as CalendarIcon, AlertTriangle, Globe, Smartphone, LayoutGrid,
  Download, Printer, Lock, Home, UserCheck
} from 'lucide-react';
import PageFrame from '../../components/Pages/PageFrame';
import { VisitorManagementSkeleton } from '../../components/ui/Skeleton';
import { statusPillClass } from '../../lib/status-pill';

function formatTimeLabel(value) {
  if (!value) return '';

  const timeOnlyMatch = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeOnlyMatch) {
    const hour = Number(timeOnlyMatch[1]);
    const minute = Number(timeOnlyMatch[2]);
    if (hour <= 23 && minute <= 59) {
      const period = hour >= 12 ? 'PM' : 'AM';
      return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${period}`;
    }
  }

  const date =
    value instanceof Date
      ? value
      : new Date(String(value).includes('T') ? String(value) : `1970-01-01T${value}`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getWorkspaceClockMinutes(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(values.hour || 0) * 60 + Number(values.minute || 0);
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

const DEFAULT_WALK_IN_WORKING_START = 9 * 60;
const DEFAULT_WALK_IN_WORKING_END = 22 * 60;
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
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDisplayDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString('en-US', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }
  const fallback = new Date(`${value}T12:00:00`);
  if (Number.isNaN(fallback.getTime())) return String(value);
  return fallback.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
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
    month: date.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month: 'long' }),
    year: date.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric' }),
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

function getStandardVisitorValidationErrors(form = {}, isDepartmentVisitorType = false, isTenantVisitorType = false) {
  const errors = {};
  const requiredMessage = 'This field is required.';
  const firstName = String(form.firstName || '').trim();
  const lastName = String(form.lastName || '').trim();
  const gender = String(form.gender || '').trim();
  const phone = String(form.phone || '').trim();
  const email = String(form.email || '').trim();
  const country = String(form.country || '').trim();
  const state = String(form.state || '').trim();
  const city = String(form.city || '').trim();
  const visitorCompanyType = String(form.visitorCompanyType || 'individual').trim();
  const visitorCompany = String(form.visitorCompany || '').trim();
  const purpose = String(form.purpose || '').trim();
  const reason = String(form.reason || '').trim();
  const hostGroupType = String(form.hostGroupType || '').trim();
  const hostGroupValue = String(form.hostGroupValue || '').trim();
  const hostUserId = String(form.hostUserId || '').trim();
  const tenantCompanyName = String(form.tenantCompanyName || '').trim();

  if (!firstName) errors.firstName = requiredMessage;
  else if (!isValidName(firstName)) errors.firstName = 'Only letters and spaces are allowed.';

  if (!lastName) errors.lastName = requiredMessage;
  else if (!isValidName(lastName)) errors.lastName = 'Only letters and spaces are allowed.';

  if (!gender) errors.gender = requiredMessage;

  if (!phone) errors.phone = requiredMessage;
  else if (!isValidPhone(phone)) errors.phone = 'Enter a valid 10-digit phone number.';

  if (!email) errors.email = requiredMessage;
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';

  if (!country) errors.country = requiredMessage;
  if (!state) errors.state = requiredMessage;
  if (!city) errors.city = requiredMessage;
  if (!purpose) errors.purpose = requiredMessage;

  if (visitorCompanyType === 'company' && !visitorCompany) {
    errors.visitorCompany = requiredMessage;
  }

  if (isDepartmentVisitorType) {
    if (!hostGroupType) errors.hostGroupType = requiredMessage;
    if (!hostGroupValue) errors.hostGroupValue = requiredMessage;
    if (!hostUserId) errors.hostUserId = requiredMessage;
    if (!reason) errors.reason = requiredMessage;
  }

  if (isTenantVisitorType) {
    if (!tenantCompanyName) errors.tenantCompanyName = requiredMessage;
    if (!hostGroupValue) errors.hostGroupValue = requiredMessage;
    if (!hostUserId) errors.hostUserId = requiredMessage;
  }

  return errors;
}

function getUnitTourValidationErrors(form = {}) {
  const errors = {};
  const requiredMessage = 'This field is required.';
  const pocName = String(form.pocName || '').trim();
  const phone = String(form.pocPhone || '').trim();
  const email = String(form.pocEmail || '').trim();

  if (!pocName) errors.pocName = requiredMessage;
  else if (!isValidName(pocName)) errors.pocName = 'Only letters and spaces are allowed.';

  if (!phone) errors.pocPhone = requiredMessage;
  else if (!isValidPhone(phone)) errors.pocPhone = 'Enter a valid 10-digit phone number.';

  if (!email) errors.pocEmail = requiredMessage;
  else if (!isValidEmail(email)) errors.pocEmail = 'Enter a valid email address.';

  ['industry', 'teamSize', 'seatCount', 'preferredSpace', 'budgetRange', 'moveInTimeline', 'preferredContactMethod'].forEach((field) => {
    if (!String(form[field] || '').trim()) errors[field] = requiredMessage;
  });

  return errors;
}

function getWalkInValidationErrors(form = {}, options = {}) {
  const errors = {};
  const requiredMessage = 'This field is required.';
  const name = String(form.name || '').trim();
  const phone = String(form.phone || '').trim();
  const email = String(form.email || '').trim();
  const attendees = Number(form.attendees || 0);

  if (!name) errors.name = requiredMessage;
  else if (!isValidName(name)) errors.name = 'Only letters and spaces are allowed.';

  if (!phone) errors.phone = requiredMessage;
  else if (!isValidPhone(phone)) errors.phone = 'Enter a valid 10-digit phone number.';

  if (!email) errors.email = requiredMessage;
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';

  // Wing is optional — rooms can be picked across all wings of the floor.
  ['spaceType', 'floor', 'resourceName', 'startDate', 'endDate', 'startTime', 'endTime', 'paymentMode'].forEach((field) => {
    if (!String(form[field] || '').trim()) errors[field] = requiredMessage;
  });

  if (attendees < 1) errors.attendees = 'Enter at least one attendee.';
  if (options.attendeeCapacity && attendees > options.attendeeCapacity) {
    errors.attendees = `Maximum ${options.attendeeCapacity} attendees allowed.`;
  }
  if (options.isDeskAreaSeatBooking && !String(form.seatNumber || '').trim()) {
    errors.seatNumber = requiredMessage;
  }
  if (normalizeText(form.paymentMode).includes('gpay')) {
    if (!String(form.transactionId || '').trim()) errors.transactionId = requiredMessage;
    if (!form.paymentProofFile) errors.paymentProofFile = 'Upload the payment screenshot.';
  }
  if (!options.availability?.available) {
    errors.availability = options.availability?.reason || 'Please choose an available slot.';
  }

  return errors;
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

function buildWalkInSuggestions(bookings, rooms, selectedRoom, startDate, endDate, startTime, endTime, workingStartMinutes = DEFAULT_WALK_IN_WORKING_START, workingEndMinutes = DEFAULT_WALK_IN_WORKING_END) {
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
  const isFreeForSlot = (room) =>
    !bookings.some((booking) => getOverlapConflict(booking, room.name, startDateKey, endDateKey, startMinutes, endMinutes));

  // Same-type rooms first (same floor preferred), then any other free space —
  // desk, cabin, meeting or conference room — so the visitor always gets options.
  const matchingRooms = normalizedRooms.filter((room) => (
    room.type === selectedRoomType &&
    room.capacity >= selectedCapacity &&
    (!selectedFloor || normalizeText(room.floor) === selectedFloor)
  ));
  const sameTypeRooms = matchingRooms.length > 0
    ? matchingRooms
    : normalizedRooms.filter((room) => room.type === selectedRoomType && room.capacity >= selectedCapacity);
  const otherTypeRooms = normalizedRooms.filter((room) => room.type !== selectedRoomType);

  const toSuggestion = (room) => ({
    name: room.name,
    capacity: Number(room.capacity || 0),
    type: room.type || getRoomTypeFromName(room.name),
    floor: room.floor || 'Floor 1',
  });
  const freeSameType = sameTypeRooms.filter(isFreeForSlot).map(toSuggestion);
  const freeOtherTypes = otherTypeRooms.filter(isFreeForSlot).map(toSuggestion);
  const roomSuggestions = [...freeSameType, ...freeOtherTypes].slice(0, 4);

  // Slot alternatives keep the requested duration and never suggest a time
  // that has already passed when booking for today.
  const durationMinutes = Math.max(30, endMinutes - startMinutes);
  let cursor = workingStartMinutes;
  if (startDateKey === formatDateKey(new Date())) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    cursor = Math.max(cursor, Math.ceil(nowMinutes / WALK_IN_SLOT_STEP) * WALK_IN_SLOT_STEP);
  }
  const candidateSlots: Array<{ start: string; end: string }> = [];
  for (let minutes = cursor; minutes + durationMinutes <= workingEndMinutes; minutes += WALK_IN_SLOT_STEP) {
    const nextEnd = minutes + durationMinutes;
    const conflict = bookings.some((booking) => getOverlapConflict(booking, selectedRoom?.name || '', startDateKey, endDateKey, minutes, nextEnd));
    if (!conflict) {
      candidateSlots.push({
        start: minutesToTime(minutes),
        end: minutesToTime(nextEnd),
      });
      if (candidateSlots.length === 3) break;
      // Skip past this window so alternatives are distinct slots, not 5-minute shifts.
      minutes = nextEnd - WALK_IN_SLOT_STEP;
    }
  }

  return {
    roomSuggestions,
    slotSuggestions: candidateSlots,
  };
}

function normalizeVerifiedBooking(booking) {
  if (!booking) return null;

  const id = String(booking.bookingCode || booking.id || '').trim().toUpperCase();
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
  if (normalized === 'booked' || normalized === 'confirmed') return 'Booked';
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

/**
 * Live walk-in booking lifecycle, derived from the clock:
 *   Booked      — before start, entry not confirmed (reschedule/cancel allowed)
 *   Confirmed   — front desk confirmed entry, meeting not started yet
 *   In Progress — between start and end (extend allowed)
 *   Completed   — past end time (view only)
 * Stored Cancelled/Completed always win over the clock.
 */
function deriveWalkInLiveStatus(storedStatus, date, startTime, endTime) {
  if (storedStatus === 'Cancelled' || storedStatus === 'Completed') return storedStatus;
  const dateKey = formatDateKey(date);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (!dateKey || startMinutes == null || endMinutes == null) return storedStatus;

  const now = new Date();
  const todayKey = formatDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (dateKey < todayKey || (dateKey === todayKey && nowMinutes >= endMinutes)) return 'Completed';
  if (dateKey === todayKey && nowMinutes >= startMinutes) return 'In Progress';
  // Meeting has not started yet. A stored "In Progress" here means the front
  // desk already confirmed the visitor's entry — surface that as Confirmed.
  if (storedStatus === 'In Progress') return 'Confirmed';
  return storedStatus === 'Rescheduled' ? 'Rescheduled' : 'Booked';
}

function normalizeDailyBooking(booking) {
  if (!booking) return null;

  // Prefer the friendly bookingCode (MRB-...) — it is what the confirmation
  // email shows and what the front desk verifies against.
  const id = String(booking.bookingCode || booking.id || booking.recordId || booking._id || '').trim().toUpperCase();
  const storedStatus = getBookingDisplayStatus(booking.liveStatus || booking.status);
  const status = deriveWalkInLiveStatus(storedStatus, booking.date, booking.startTime, booking.endTime);
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

function RecordSubTabs({ items = [], activeKey, onChange }) {
  return (
    <div className="flex flex-1 items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-pmedium transition-all sm:text-[12px] ${activeKey === item.key
            ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
            : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

const VALIDATION_FIELD_LABELS = {
  firstName: 'First name', lastName: 'Last name', gender: 'Gender', phone: 'Phone number', email: 'Email address',
  country: 'Country', state: 'State', city: 'City', visitorCompany: 'Company name', purpose: 'Purpose',
  hostGroupType: 'Host type', hostGroupValue: 'Host department or role', hostUserId: 'Host employee', reason: 'Reason for visit',
  tenantCompanyName: 'Tenant company', pocName: 'Contact name', pocPhone: 'Contact phone', pocEmail: 'Contact email',
  industry: 'Industry', teamSize: 'Team size', seatCount: 'Seat count', preferredSpace: 'Preferred space',
  budgetRange: 'Budget range', moveInTimeline: 'Move-in timeline', preferredContactMethod: 'Preferred contact method',
  name: 'Client name', spaceType: 'Space type', floor: 'Floor', wing: 'Wing', resourceName: 'Meeting room',
  attendees: 'Attendees', seatNumber: 'Seat number', startDate: 'Start date', endDate: 'End date',
  startTime: 'Start time', endTime: 'End time', availability: 'Availability', paymentMode: 'Payment mode',
  transactionId: 'Transaction ID', paymentProofFile: 'Payment screenshot',
};

function ValidationSummary({ errors = {} }) {
  const entries = Object.entries(errors);
  if (entries.length === 0) return null;
  return (
    <div data-validation-summary tabIndex={-1} role="alert" aria-live="polite" className="mx-6 mb-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 outline-none focus:ring-2 focus:ring-red-300">
      <p className="flex items-center gap-1.5 text-[10px] font-pmedium uppercase tracking-widest text-red-700"><AlertCircle size={13} /> Complete the following fields</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {entries.map(([field, message]) => <span key={field} className="text-[10px] font-pmedium text-red-600">• {VALIDATION_FIELD_LABELS[field] || field}: {message}</span>)}
      </div>
    </div>
  );
}

export default function VisitorsManagementPage() {
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const businessHours = useBusinessHours();
  const WALK_IN_WORKING_START = businessHours.startMinutes;
  const WALK_IN_WORKING_END = businessHours.endMinutes;
  const isReadOnlySession = Boolean(auth?.impersonation);
  const workspaceId = String(
    auth?.user?.workspaceMembership?.workspaceId ||
    auth?.user?.workspaceMembership?.workspace ||
    auth?.user?.primaryWorkspace ||
    auth?.user?.workspaceId ||
    '',
  ).trim();
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
  const [dailyStatusTab, setDailyStatusTab] = useState('all');
  const [bookingStatusTab, setBookingStatusTab] = useState('upcoming');
  const [clientSourceTab, setClientSourceTab] = useState('all');
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
  const [confirmingCheckout, setConfirmingCheckout] = useState(null);
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
  const [hasLoadedVisitorOverview, setHasLoadedVisitorOverview] = useState(false);
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
  const [standardVisitorTouched, setStandardVisitorTouched] = useState({});
  const [standardVisitorSubmitAttempted, setStandardVisitorSubmitAttempted] = useState(false);
  const [tourTouched, setTourTouched] = useState({});
  const [tourSubmitAttempted, setTourSubmitAttempted] = useState(false);
  const [walkInTouched, setWalkInTouched] = useState({});
  const [walkInSubmitAttempted, setWalkInSubmitAttempted] = useState(false);
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

  const dailyVisitorCollections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = (visitor) => [visitor.name, visitor.company, visitor.phone, visitor.email, visitor.purpose, visitor.host, visitor.badgeNo]
      .join(' ').toLowerCase().includes(query);
    const rows = trackedVisitors.filter(matchesSearch);
    const statusKey = (visitor) => normalizeText(visitor.status || visitor.statusKey || visitor.approvalStatus || '').replace(/[_-]+/g, ' ');
    return {
      all: rows,
      pending: rows.filter((visitor) => statusKey(visitor).includes('pending') || statusKey(visitor).includes('awaiting')),
      approved: rows.filter((visitor) => statusKey(visitor) === 'approved'),
      checked_in: rows.filter((visitor) => statusKey(visitor).includes('checked in')),
      checked_out: rows.filter((visitor) => statusKey(visitor).includes('checked out')),
      rejected: rows.filter((visitor) => statusKey(visitor).includes('rejected') || statusKey(visitor).includes('cancelled')),
    };
  }, [searchQuery, trackedVisitors]);
  const selectedDailyVisitors = dailyVisitorCollections[dailyStatusTab] || dailyVisitorCollections.all;

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
        // Populate clients from visitor overview (includes both external-booking + visitor-conversion sources)
        if (Array.isArray(result.clients) && result.clients.length > 0) {
          setBookingClients(result.clients);
        }
        setVisitorOverviewError('');
      } catch (error) {
        if (!isCancelled) {
          setVisitorOverviewError(error.message || 'Failed to load visitor roster.');
        }
      } finally {
        if (!isCancelled) {
          setIsVisitorOverviewLoading(false);
          setHasLoadedVisitorOverview(true);
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
      if (!workspaceId) {
        setMeetingRoomOverviewError('An active workspace is required to load meeting room availability.');
        return;
      }

      try {
        const result = await getMeetingRoomBookings(workspaceId);
        if (isCancelled || !result) {
          return;
        }

        const data = result?.data || result || {};
        const rooms = Array.isArray(data.roomDetails) ? data.roomDetails : [];
        const bookings = Array.isArray(data.bookings) ? data.bookings : [];
        // Do NOT overwrite bookingClients here — that data comes from getVisitorManagementOverview
        // which properly returns the Client collection. getMeetingRoomBookings doesn't return clients.
        const normalizedRooms = rooms.map(normalizeMeetingRoom);

        setMeetingRoomCatalog(normalizedRooms);
        setMeetingRoomBookings(bookings);
        // bookingClients is populated from getVisitorManagementOverview — don't overwrite here
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
  }, [workspaceId]);

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
      all: externalBookings,
      upcoming: externalBookings.filter((booking) => !['In Progress', 'Completed', 'Cancelled'].includes(booking.status)),
      in_progress: externalBookings.filter((booking) => booking.status === 'In Progress'),
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

  const clientCollections = useMemo(() => ({
    all: clientRows,
    walk_in: clientRows.filter((client) => normalizeText(client.source) !== 'visitor-conversion'),
    converted: clientRows.filter((client) => normalizeText(client.source) === 'visitor-conversion'),
  }), [clientRows]);
  const selectedClientRows = clientCollections[clientSourceTab] || clientCollections.all;

  const selectedBookingClient = useMemo(
    () => bookingClients.find((client) => String(client.id || client.recordId || client._id || '') === String(form.clientId || '')) || null,
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
    const visitorPhone = normalizePhoneForMatch(visitor?.phone || '');
    const visitorEmail = normalizeText(visitor?.email || '');
    const matchedClient = bookingClients.find((client) => {
      const clientPhone = normalizePhoneForMatch(client?.phone || '');
      const clientEmail = normalizeText(client?.email || '');
      return (visitorPhone && clientPhone && clientPhone === visitorPhone)
        || (visitorEmail && clientEmail && clientEmail === visitorEmail);
    }) || null;

    if (matchedClient) {
      applyExistingClient(matchedClient);
      return;
    }

    setForm((prev) => ({
      ...prev,
      clientBookingMode: 'existing',
      clientId: '',
      clientSearch: visitor?.name || visitor?.phone || visitor?.email || '',
      name: visitor?.name || '',
      phone: visitor?.phone || '',
      email: visitor?.email || '',
      company: visitor?.company || '',
      purpose: visitor?.purpose || prev.purpose,
    }));
    setWalkInTouched({});
    setWalkInSubmitAttempted(false);
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
    const nameParts = String(visitor?.name || '').trim().split(/\s+/).filter(Boolean);
    const selectedFirstName = visitor?.firstName || nameParts[0] || '';
    const selectedLastName = visitor?.lastName || nameParts.slice(1).join(' ');
    setLastSelectedExistingVisitor(visitor || null);
    setForm((prev) => ({
      ...prev,
      firstName: selectedFirstName || prev.firstName,
      lastName: selectedLastName || prev.lastName,
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
      standardVisitorSearch: '',
    }));
    setStandardVisitorTouched({});
    setStandardVisitorSubmitAttempted(false);
  };

  const switchStandardVisitorMode = (mode) => {
    if (mode === 'new') setLastSelectedExistingVisitor(null);
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

  // Wings actually present on the selected floor for the selected space type —
  // sourced from the resource catalog, not hardcoded.
  const walkInWingOptions = useMemo(() => {
    const wings = normalizedMeetingRoomCatalog
      .filter((room) => (!form.spaceType || room.type === form.spaceType) && (!form.floor || room.floor === form.floor))
      .map((room) => normalizeText(room.wing))
      .filter(Boolean);
    return Array.from(new Set(wings)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [form.floor, form.spaceType, normalizedMeetingRoomCatalog]);

  const walkInRoomOptions = useMemo(() => {
    if (!form.spaceType || !form.floor) {
      return [];
    }

    const selectedType = form.spaceType;
    const selectedFloor = form.floor;
    const selectedWing = form.wing;

    return normalizedMeetingRoomCatalog
      .filter((room) => room.type === selectedType && room.floor === selectedFloor && (!selectedWing || room.wing === selectedWing))
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
  const currentRoundedTime = useMemo(
    () => roundUpToStepTime(minutesToTime(getWorkspaceClockMinutes() + 1)),
    [],
  );
  const walkInStartTimeOptions = useMemo(() => {
    const isToday = form.startDate && formatDateKey(form.startDate) === formatDateKey(new Date());
    const currentMinutes = timeToMinutes(currentRoundedTime);
    const minStartMinutes = isToday && currentMinutes != null
      ? Math.max(WALK_IN_WORKING_START, currentMinutes)
      : WALK_IN_WORKING_START;
    const latestStartMinutes = WALK_IN_WORKING_END - WALK_IN_MIN_DURATION_MINUTES;

    if (minStartMinutes > latestStartMinutes) {
      return [];
    }

    return buildTimeOptions(
      minutesToTime(minStartMinutes),
      minutesToTime(latestStartMinutes),
    );
  }, [WALK_IN_WORKING_END, WALK_IN_WORKING_START, currentRoundedTime, form.startDate]);
  const walkInEndTimeOptions = useMemo(() => {
    const startMinutes = timeToMinutes(form.startTime);
    if (startMinutes == null) {
      return [];
    }

    const minEndMinutes = startMinutes + WALK_IN_MIN_DURATION_MINUTES;
    if (minEndMinutes > WALK_IN_WORKING_END) {
      return [];
    }

    return buildTimeOptions(
      minutesToTime(minEndMinutes),
      minutesToTime(WALK_IN_WORKING_END),
    );
  }, [WALK_IN_WORKING_END, form.startTime]);

  useEffect(() => {
    const startIsValid = !form.startTime || walkInStartTimeOptions.includes(form.startTime);
    const endIsValid = !form.endTime || walkInEndTimeOptions.includes(form.endTime);
    if (startIsValid && endIsValid) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      startTime: startIsValid ? prev.startTime : '',
      endTime: startIsValid && endIsValid ? prev.endTime : '',
    }));
  }, [form.endTime, form.startTime, walkInEndTimeOptions, walkInStartTimeOptions]);

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

    const todayKey = formatDateKey(new Date());
    if (startDateKey < todayKey || endDateKey < todayKey) {
      return {
        status: 'pending',
        available: false,
        reason: 'Past dates cannot be booked.',
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

    if (startMinutes < WALK_IN_WORKING_START || endMinutes > WALK_IN_WORKING_END) {
      return {
        status: 'pending',
        available: false,
        reason: `Choose a time between ${formatTimeLabel(minutesToTime(WALK_IN_WORKING_START))} and ${formatTimeLabel(minutesToTime(WALK_IN_WORKING_END))}.`,
        roomSuggestions: [],
        slotSuggestions: [],
        seatSuggestions: [],
        hasConflict: false,
      };
    }

    const currentMinutes = timeToMinutes(currentRoundedTime);
    if (startDateKey === todayKey && currentMinutes != null && startMinutes < currentMinutes) {
      return {
        status: 'pending',
        available: false,
        reason: 'Choose a start time that has not passed.',
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
        WALK_IN_WORKING_START,
        WALK_IN_WORKING_END,
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
    WALK_IN_WORKING_START,
    WALK_IN_WORKING_END,
    currentRoundedTime,
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

  const standardVisitorErrors = useMemo(() => {
    return getStandardVisitorValidationErrors(
      form,
      isDepartmentVisitorType,
      isTenantVisitorType,
    );
  }, [form, isDepartmentVisitorType, isTenantVisitorType]);
  const visibleStandardVisitorErrors = useMemo(() => {
    const nextErrors = {};
    Object.entries(standardVisitorErrors).forEach(([field, message]) => {
      if (standardVisitorTouched[field] || standardVisitorSubmitAttempted) {
        nextErrors[field] = message;
      }
    });
    return nextErrors;
  }, [standardVisitorErrors, standardVisitorTouched, standardVisitorSubmitAttempted]);
  const shouldShowStandardVisitorError = (field) => Boolean(standardVisitorTouched[field] || standardVisitorSubmitAttempted);

  const isStandardFormComplete = useMemo(() => {
    return Object.keys(standardVisitorErrors).length === 0;
  }, [standardVisitorErrors]);

  const tourErrors = useMemo(() => getUnitTourValidationErrors(form), [form]);
  const visibleTourErrors = useMemo(() => {
    const nextErrors = {};
    Object.entries(tourErrors).forEach(([field, message]) => {
      if (tourTouched[field] || tourSubmitAttempted) nextErrors[field] = message;
    });
    return nextErrors;
  }, [tourErrors, tourSubmitAttempted, tourTouched]);
  const isTourFormComplete = Object.keys(tourErrors).length === 0;

  const walkInErrors = useMemo(() => getWalkInValidationErrors(form, {
    attendeeCapacity,
    availability: walkInAvailability,
    isDeskAreaSeatBooking,
  }), [attendeeCapacity, form, isDeskAreaSeatBooking, walkInAvailability]);
  const visibleWalkInErrors = useMemo(() => {
    const nextErrors = {};
    Object.entries(walkInErrors).forEach(([field, message]) => {
      if (walkInTouched[field] || walkInSubmitAttempted) nextErrors[field] = message;
    });
    return nextErrors;
  }, [walkInErrors, walkInSubmitAttempted, walkInTouched]);
  const isWalkInFormComplete = Object.keys(walkInErrors).length === 0;

  const activeFormValidationErrors = useMemo(() => {
    if (visitorMode === 'standard') return standardVisitorErrors;
    if (visitorMode === 'tour') return tourErrors;
    if (visitorMode === 'walkin_booking') return walkInErrors;
    return {};
  }, [standardVisitorErrors, tourErrors, visitorMode, walkInErrors]);
  const activeFormSubmitAttempted = visitorMode === 'standard'
    ? standardVisitorSubmitAttempted
    : visitorMode === 'tour'
      ? tourSubmitAttempted
      : visitorMode === 'walkin_booking'
        ? walkInSubmitAttempted
        : false;

  useEffect(() => {
    if (!isLoggingVisitor || !activeFormSubmitAttempted || Object.keys(activeFormValidationErrors).length === 0) return undefined;
    const timer = window.setTimeout(() => {
      const firstInvalidField = document.querySelector('[data-frontdesk-form] .border-red-300') || document.querySelector('[data-validation-summary]');
      if (!firstInvalidField) return;
      firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (typeof firstInvalidField.focus === 'function') firstInvalidField.focus({ preventScroll: true });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [activeFormSubmitAttempted, activeFormValidationErrors, isLoggingVisitor, visitorMode]);

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
    if (!form.spaceType || !form.floor || !walkInRoomOptions.length) {
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
    // Match every identifier a visitor might quote — the confirmation email
    // carries bookingCode (MRB-...), while internal views may show the record id.
    const matchesEnteredId = (booking) =>
      [booking.bookingCode, booking.id, booking.recordId]
        .some((candidate) => String(candidate || '').trim().toUpperCase() === normalizedId);
    const backendMatch = meetingRoomBookings.find(matchesEnteredId);
    const localMatch = upcomingBookings.find(matchesEnteredId);
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
    if (!workspaceId) return;

    try {
      const response = await getExternalClients(workspaceId, search);
      const clients = Array.isArray(response) ? response : response?.clients || [];
      if (Array.isArray(clients)) {
        setBookingClients(clients.map((client) => ({
          ...client,
          id: client.id || client.recordId || client._id || '',
          recordId: client.recordId || client.id || client._id || '',
        })));
      }
    } catch (error) {
      console.warn('Unable to refresh booking clients.', error);
    }
  };

  const openBookingFromVisitor = (visitor) => {
    const visitorId = visitor?.recordId || visitor?.id || '';
    const now = new Date();
    const roundedNowMinutes = Math.ceil((getWorkspaceClockMinutes(now) + 1) / WALK_IN_SLOT_STEP) * WALK_IN_SLOT_STEP;
    const defaultStartMinutes = Math.max(WALK_IN_WORKING_START, roundedNowMinutes);
    const hasRemainingBookingWindow = defaultStartMinutes + WALK_IN_MIN_DURATION_MINUTES <= WALK_IN_WORKING_END;
    const defaultDuration = defaultStartMinutes + 60 <= WALK_IN_WORKING_END ? 60 : WALK_IN_MIN_DURATION_MINUTES;
    const defaultStartTime = hasRemainingBookingWindow ? minutesToTime(defaultStartMinutes) : '';
    const defaultEndTime = hasRemainingBookingWindow ? minutesToTime(defaultStartMinutes + defaultDuration) : '';
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
      clientId: client.id || client.recordId || client._id || '',
      clientSearch: '',
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      company: client.company || '',
    }));
    setWalkInTouched({});
    setWalkInSubmitAttempted(false);
  };

  const switchClientBookingMode = (mode) => {
    setForm((prev) => {
      if (mode === 'new') {
        return {
          ...prev,
          clientBookingMode: 'new',
          clientId: '',
          clientSearch: '',
          sourceVisitorId: '',
          name: '',
          phone: '',
          email: '',
          company: '',
        };
      }
      return { ...prev, clientBookingMode: 'existing' };
    });
    setWalkInTouched({});
    setWalkInSubmitAttempted(false);
  };

  const handleProcessAction = async () => {
    const isWalkInBooking = visitorMode === 'walkin_booking';
    const fullName = isWalkInBooking
      ? String(form.name || '').trim()
      : `${String(form.firstName || '').trim()} ${String(form.lastName || '').trim()}`.trim();
    const normalizedCompany = isWalkInBooking || visitorMode === 'tour'
      ? String(form.company || '').trim()
      : form.visitorCompanyType === 'company'
        ? String(form.visitorCompany || '').trim()
        : 'Individual';
    const normalizedEmail = form.email.trim();

    const newId = `VIS-${Math.floor(Math.random() * 9000) + 1000}`;
    const badge = `B-${Math.floor(Math.random() * 900) + 100}`;
    const timeNow = formatTimeLabel(new Date());

    let finalRecord = {
      id: newId, name: fullName, phone: form.phone, company: normalizedCompany,
      checkIn: timeNow, checkOut: '--:--', status: 'Checked In', badgeNo: badge
    };

    if (visitorMode === 'standard') {
      if (!isStandardFormComplete) {
        setStandardVisitorSubmitAttempted(true);
        return;
      }
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
            // Explicitly set every field the badge modal needs so display is never blank
            name: fullName || normalizedVisitor.name || normalizedVisitor.fullName || 'Visitor',
            phone: form.phone || '',
            company: normalizedCompany || 'Individual',
            purpose: form.purpose || 'General Visit',
            host: 'Front Desk',
            badgeNo: normalizedVisitor.badgeNo || createdVisitor?.badgeNo || badge,
            checkIn: formatTimeLabel(new Date()),
            notes: 'Visitor checked in successfully.',
          });

          setIsLoggingVisitor(false);
          setVerifiedBooking(null);
          setWalkInStep(1);
          setForm(getDefaultVisitorForm());
          setStandardVisitorTouched({});
          setStandardVisitorSubmitAttempted(false);
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
        setTourTouched({});
        setTourSubmitAttempted(false);
      } catch (error) {
        alert(error.message || 'Unable to log visitor right now.');
      } finally {
        setIsSubmittingVisitor(false);
      }

      return;
    }
    else if (visitorMode === 'tour') {
      if (!isTourFormComplete) {
        setTourSubmitAttempted(true);
        return;
      }
      const visitorName = form.pocName.trim();
      const contactPhone = form.pocPhone.trim() || form.phone.trim();
      const contactEmail = form.pocEmail.trim() || normalizedEmail;
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
          country: form.country?.trim() || '',
          state: form.state?.trim() || '',
          city: form.city?.trim() || '',
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
        const normalizedTourVisitor = createdVisitor
          ? normalizeVisitorTrackingEntry(createdVisitor)
          : normalizeVisitorTrackingEntry({
            ...finalRecord,
            name: visitorName,
            phone: contactPhone,
            email: contactEmail,
            company: normalizedCompany,
            purpose: 'Workspace Tour',
            department: 'Administration',
            host: 'Administration Desk',
            pocName: form.pocName,
            pocDesignation: form.pocDesignation,
            pocPhone: form.pocPhone,
            pocEmail: form.pocEmail,
            preferredContactMethod: form.preferredContactMethod,
            followUpDate: form.followUpDate,
            industry: form.industry,
            teamSize: form.teamSize,
            seatCount: form.seatCount,
            preferredSpace: form.preferredSpace,
            budgetRange: form.budgetRange,
            moveInTimeline: form.moveInTimeline,
            tourNotes: form.tourNotes,
            notes: form.tourNotes || 'Lead forwarded to CRM.',
            approvalStatus: 'approved',
            approvalStatusLabel: 'Direct Check-in',
            statusKey: 'checked_in',
          });

        setLiveVisitors((prev) => [
          normalizedTourVisitor,
          ...prev.filter((entry) => !isSameVisitorEntry(entry, normalizedTourVisitor)),
        ]);
        setCheckedInVisitorIds((prev) => {
          const next = new Set(prev);
          const visitorId = String(normalizedTourVisitor.recordId || normalizedTourVisitor.id || '').trim();
          if (visitorId) next.add(visitorId);
          return next;
        });
        setVisitorOverviewRefreshToken((value) => value + 1);
        setShowBadge({
          ...normalizedTourVisitor,
          // Explicitly set every field the badge modal needs so display is never blank
          name: visitorName || normalizedTourVisitor.name || normalizedTourVisitor.fullName || 'Visitor',
          phone: contactPhone || normalizedTourVisitor.phone || '',
          company: normalizedCompany || 'Individual',
          purpose: 'Workspace Tour',
          host: 'Administration Desk',
          badgeNo: normalizedTourVisitor.badgeNo || createdVisitor?.badgeNo || badge,
          checkIn: formatTimeLabel(new Date()),
          notes: 'Unit tour visitor checked in. Lead forwarded to CRM for Sales follow-up.',
        });

        if (Array.isArray(result?.hostGroups) || Array.isArray(result?.employeeRoster)) {
          setVisitorHostGroups(
            enrichHostGroupsWithRoster(
              Array.isArray(result?.hostGroups) ? result.hostGroups : [],
              Array.isArray(result?.employeeRoster) ? result.employeeRoster : [],
            ),
          );
        }

        toast.success('Visitor checked in and synced to CRM.', {
          id: loadingToastId,
          description: 'Administration logged the check-in. Sales can follow up from CRM.',
        });

        setIsLoggingVisitor(false);
        setVerifiedBooking(null);
        setWalkInStep(1);
        setForm(getDefaultVisitorForm());
        setTourTouched({});
        setTourSubmitAttempted(false);
      } catch (error) {
        toast.error(error.message || 'Unable to check in the visitor right now.', {
          id: loadingToastId,
        });
      } finally {
        setIsSubmittingVisitor(false);
      }
    }
    else if (visitorMode === 'walkin_booking') {
      if (!isWalkInFormComplete) {
        setWalkInSubmitAttempted(true);
        return;
      }
      if (form.discountType === 'percent' && walkInPricing.discountValue > 100) {
        return alert('Discount percentage cannot be greater than 100.');
      }
      if (form.discountType === 'amount' && walkInPricing.discountAmount > walkInPricing.subtotalBeforeDiscount) {
        return alert('Discount amount cannot be greater than base amount.');
      }
      const walkInSeatNumber = normalizeSeatNumber(form.seatNumber);
      const bookingAttendees = isDeskAreaSeatBooking ? 1 : attendeeCount;

      let createdBooking = null;
      setIsSubmittingVisitor(true);
      try {
        let externalClientId = form.clientBookingMode === 'existing' ? form.clientId : '';
        if (!externalClientId && workspaceId) {
          const createdClient = await createExternalClient({
            workspaceId,
            name: fullName,
            email: normalizedEmail,
            phone: form.phone.trim(),
            company: normalizedCompany,
          });
          externalClientId = String(createdClient?._id || createdClient?.id || createdClient?.recordId || '').trim();
        }

        const bookingFields = {
          bookingType: 'External',
          bookingSource: 'Frontdesk',
          bookedByName: fullName,
          bookedByEmail: normalizedEmail,
          bookedByPhone: form.phone,
          clientCompany: normalizedCompany,
          externalClientId,
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
          paymentStatus: 'Paid',
          financeStatus: form.paymentMode === 'Cash' ? 'Invoice Pending' : 'Sent To Finance',
          paymentVerificationStatus: form.paymentMode === 'Cash' ? '' : 'Pending',
          transactionId: form.transactionId.trim(),
          paymentProof: form.paymentProofFile,
          discountType: walkInPricing.discountType === 'percent' ? 'percent' : 'flat',
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

        const response = await createMeetingRoomBooking(bookingFields);

        createdBooking = response?.data?.booking || response?.booking || null;
        if (createdBooking) {
          const enrichedBooking = {
            ...createdBooking,
            bookingSource: 'Frontdesk',
            bookedByName: fullName,
            bookedByEmail: normalizedEmail,
            bookedByPhone: form.phone,
            clientCompany: normalizedCompany,
            clientId: externalClientId,
            date: form.startDate,
            startTime: form.startTime,
            endTime: form.endTime,
          };
          const normalizedBooking = normalizeDailyBooking(enrichedBooking);
          setBookingConfirmation({
            bookingId: normalizedBooking.id,
            email: normalizedEmail,
            paymentMode: form.paymentMode,
            totalAmount: Number(createdBooking.totalAmount || walkInPricing.total || 0),
            roomName: normalizedBooking.resource,
            transactionId: form.transactionId.trim(),
          });
          setShowBookingConfirmationPopup(true);
          syncDailyBookingState(enrichedBooking);
          await refreshBookingClients();

          const createdBookingId = String(createdBooking._id || createdBooking.recordId || createdBooking.id || '').trim();
          if (createdBookingId && normalizedEmail) {
            try {
              await sendExternalBookingConfirmationEmail(createdBookingId);
            } catch (emailError) {
              console.warn('Booking created, but the confirmation email could not be sent.', emailError);
            }
          }

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
    visitorName: String(visitor?.name || visitor?.fullName || [visitor?.firstName, visitor?.lastName].filter(Boolean).join(' ').trim() || 'Visitor'),
    visitorCompany: String(visitor?.company || 'Individual'),
    purpose: String(visitor?.purpose || 'General visit'),
    host: String(visitor?.host || visitor?.hostName || 'Frontdesk'),
    checkIn: String(visitor?.checkIn || formatTimeLabel(visitor?.checkInAt) || '--:--'),
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
          <title></title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
            @page { margin: 30px 0 0 0; }
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
            .header h1 { margin: 0; font-size: 18px; line-height: 1.15; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; text-align: center; }
            .content { padding: 14px 16px 16px 16px; }
            .name { margin: 0 0 2px 0; font-size: 20px; font-weight: 500; line-height: 1.2; color: #111827; text-align: center; }
            .company { margin: 0 0 12px 0; color: #6b7280; font-size: 11px; font-weight: 500; text-align: center; }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 12px;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 10px 12px;
              background: #f9fafb;
            }
            .field-label { margin: 0; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: #9ca3af; font-weight: 500; }
            .field-value { margin: 2px 0 0 0; font-size: 12px; font-weight: 500; color: #1f2937; word-break: break-word; }
            .span-2 { grid-column: span 2; }
            @media print {
              html, body { width: 100%; height: 100%; }
              body { background: #ffffff !important; padding: 0; }
              .sheet { box-shadow: none; border-color: #dbeafe; }
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

  if (isVisitorOverviewLoading && !hasLoadedVisitorOverview) {
    return (
      <PageFrame>
        <VisitorManagementSkeleton />
      </PageFrame>
    );
  }

  return (
    <>
      <PageFrame>
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">

        <div className="flex flex-col gap-4">

        {/* 1. HEADER */}
        <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">Visitor Management</h2>
            <p className="text-xs font-pmedium text-slate-500 mt-1">Daily visitors, walk-in bookings, client conversion, payment proof, and invoice handoff in one front desk unit.</p>
          </div>
        </div>

        {/* 2. MAIN PILL TABS */}
        <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
          <button
            type="button"
            disabled={!visitorAccess.tabs.daily}
            title={!visitorAccess.tabs.daily ? 'You do not have permission for Daily Visitors.' : undefined}
            onClick={() => setActiveTab('daily')}
            className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
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
            className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
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
            className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
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
            className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              activeTab === 'clients' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            } ${!visitorAccess.tabs.clients ? 'text-slate-300 cursor-not-allowed' : ''}`}
          >
            {!visitorAccess.tabs.clients && <Lock size={12} />} CLIENTS
          </button>
        </div>

        {/* 3. STATS OVERVIEW */}
        <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
            <div className="min-w-0"><p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">Currently Inside</p><p className="text-[15px] font-pmedium text-slate-900">{liveVisitors.filter((v) => normalizeText(v.status || v.statusKey || '').replace(/[_-]+/g, ' ') === 'checked in').length}</p></div>
            <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><User size={16} /></div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
            <div className="min-w-0"><p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Daily Bookings</p><p className="text-[15px] font-pmedium text-slate-900">{dailyBookings.length}</p></div>
            <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><CalendarDays size={16} /></div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
            <div className="min-w-0"><p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-widest mb-1">Payments Due</p><p className="text-[15px] font-pmedium text-slate-900">{dailyBookings.filter((booking) => booking.paymentStatus === 'Pending Payment').length}</p></div>
            <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><Wallet size={16} /></div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-slate-500">
            <div className="min-w-0"><p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Total Checked Out</p><p className="text-[15px] font-pmedium text-slate-900">{totalCheckedOutCount}</p></div>
            <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><LogOut size={16} /></div>
          </div>
        </div>

        {/* 4. TABLE WORKSPACE */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

          <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">

            <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {activeTab === 'daily' && (
                <RecordSubTabs
                  activeKey={dailyStatusTab}
                  onChange={setDailyStatusTab}
                  items={[
                    { key: 'all', label: 'All', count: dailyVisitorCollections.all.length },
                    { key: 'pending', label: 'Pending', count: dailyVisitorCollections.pending.length },
                    { key: 'approved', label: 'Approved', count: dailyVisitorCollections.approved.length },
                    { key: 'checked_in', label: 'Checked In', count: dailyVisitorCollections.checked_in.length },
                    { key: 'checked_out', label: 'Checked Out', count: dailyVisitorCollections.checked_out.length },
                    { key: 'rejected', label: 'Rejected', count: dailyVisitorCollections.rejected.length },
                  ]}
                />
              )}
              {activeTab === 'history' && (
                <>
                  <select className="px-3 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none cursor-pointer transition-all" value={historyMonth} onChange={(e) => setHistoryMonth(e.target.value)}>
                    {historyMonthOptions.map((month) => <option key={month} value={month}>{month}</option>)}
                  </select>
                  <select className="px-3 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none cursor-pointer transition-all" value={historyYear} onChange={(e) => setHistoryYear(e.target.value)}>
                    {historyYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </>
              )}
              {activeTab === 'bookings' && (
                <RecordSubTabs
                  activeKey={bookingStatusTab}
                  onChange={setBookingStatusTab}
                  items={[
                    { key: 'all', label: 'All', count: bookingCollections.all.length },
                    { key: 'upcoming', label: 'Upcoming', count: bookingCollections.upcoming.length },
                    { key: 'in_progress', label: 'In Progress', count: bookingCollections.in_progress.length },
                    { key: 'completed', label: 'Completed', count: bookingCollections.completed.length },
                    { key: 'cancelled', label: 'Cancelled', count: bookingCollections.cancelled.length },
                  ]}
                />
              )}
              {activeTab === 'clients' && (
                <RecordSubTabs
                  activeKey={clientSourceTab}
                  onChange={setClientSourceTab}
                  items={[
                    { key: 'all', label: 'All Clients', count: clientCollections.all.length },
                    { key: 'walk_in', label: 'Walk-in', count: clientCollections.walk_in.length },
                    { key: 'converted', label: 'Converted Visitors', count: clientCollections.converted.length },
                  ]}
                />
              )}
            </div>

            <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
              {(activeTab === 'daily' || activeTab === 'history' || activeTab === 'bookings' || activeTab === 'clients') && (
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input type="text" placeholder="Search records..." className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400" onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              )}
              <button
                type="button"
                disabled={!canOpenFrontdeskAction}
                title={!canOpenFrontdeskAction ? 'You do not have permission for frontdesk action tabs.' : undefined}
                onClick={() => { setVisitorMode('standard'); setWalkInStep(1); setForm(getDefaultVisitorForm()); setLastSelectedExistingVisitor(null); setStandardVisitorTouched({}); setStandardVisitorSubmitAttempted(false); setTourTouched({}); setTourSubmitAttempted(false); setWalkInTouched({}); setWalkInSubmitAttempted(false); setVerifiedBooking(null); setBookingConfirmation(null); setIsLoggingVisitor(true); }}
                className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-[10px] font-pmedium shadow-sm transition-all whitespace-nowrap ${
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
                <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
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
                  {selectedDailyVisitors.map((vis) => {
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
                          <div className="font-pmedium text-slate-600 inline-flex items-center gap-1 whitespace-nowrap">
                            <BadgeCheck size={14} /> {vis.badgeNo || 'N/A'}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="font-pmedium text-[#0F172A] text-[13px] whitespace-nowrap truncate max-w-[180px]">{vis.name}</div>
                          <div className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mt-0.5 flex items-center gap-1 whitespace-nowrap">
                            <Building size={10} /> {vis.company}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="font-pmedium text-[#0F172A] text-[13px] flex items-center gap-1.5 whitespace-nowrap">
                            <CalendarDays size={14} className="text-slate-400" /> {vis.date || formatDisplayDate(vis.createdAt)}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span className={statusPillClass(vis.purpose)}>{vis.purpose}</span>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="text-xs font-pmedium text-slate-600 flex items-center gap-1 whitespace-nowrap">
                            <User size={12} /> <span className="font-pmedium text-[#0F172A] truncate max-w-[150px]">{vis.host}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-2 font-pmedium text-[#0F172A] text-[13px] whitespace-nowrap">
                            <span className="text-slate-600">{vis.checkIn || formatTimeLabel(vis.checkInAt) || '--:--'}</span>
                            <span className="text-slate-300">-</span>
                            <span className={(vis.checkOut || '--:--') === '--:--' ? 'text-slate-400' : 'text-[#0F172A]'}>{vis.checkOut || formatTimeLabel(vis.checkOutAt) || '--:--'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-col items-start gap-0.5">
                            <span className={statusPillClass(vis.status)}>
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
                                <button title="Check out visitor" onClick={() => setConfirmingCheckout(vis)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 rounded-lg transition-all">
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
                              <button
                                type="button"
                                title="Open a walk-in booking pre-filled with this visitor's details. Completing the booking checks them out and converts them to a client."
                                onClick={() => openBookingFromVisitor(vis)}
                                className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[9px] font-pmedium uppercase transition-all inline-flex items-center gap-1 shadow-sm whitespace-nowrap"
                              >
                                <UserCheck size={11} /> Convert to Client
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {selectedDailyVisitors.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-20 text-slate-400 font-pmedium">No visitors found for this status.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* --- TAB: BOOKINGS --- */}
          {activeTab === 'bookings' && (
            <div className="overflow-x-auto flex-1">
              <table className="w-full min-w-[1080px] text-left border-collapse">
                <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-5 py-4">Booking / Client</th>
                    <th className="px-5 py-4">Meeting Room</th>
                    <th className="px-5 py-4">Schedule</th>
                    <th className="px-5 py-4">Payment</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {selectedBookingList.map((bkg) => (
                    <tr key={`table-${bkg.recordId || bkg.id}`} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 align-top">
                        <p className="text-[13px] font-pmedium text-slate-950">{bkg.bookedBy || 'External Client'}</p>
                        <p className="mt-0.5 text-[11px] font-pmedium text-slate-500">{bkg.company || 'Individual'}</p>
                        <p className="mt-1 text-[10px] font-pmedium text-blue-600">{bkg.id || bkg.bookingCode}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="text-[13px] font-pmedium text-slate-900">{bkg.resource || 'Meeting Room'}</p>
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-pmedium text-slate-500">{bkg.source === 'Website' ? <Globe size={11} /> : <Smartphone size={11} />} {bkg.source || 'Frontdesk'}</span>
                      </td>
                      <td className="px-5 py-4 align-top whitespace-nowrap">
                        <p className="flex items-center gap-1.5 text-[12px] font-pmedium text-slate-800"><CalendarDays size={13} className="text-slate-400" /> {bkg.dateLabel || formatDisplayDate(bkg.date)}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-pmedium text-slate-500"><Clock size={12} /> {bkg.time || 'Time not set'}</p>
                      </td>
                      <td className="px-5 py-4 align-top"><span className={statusPillClass(bkg.paymentStatus || 'Pending')}>{bkg.paymentStatus || 'Pending'}</span><p className="mt-1.5 text-[10px] font-pmedium text-slate-500">{bkg.paymentMode || 'Not set'}</p></td>
                      <td className="px-5 py-4 align-top"><p className="text-[13px] font-pmedium text-slate-950">{formatCurrency(bkg.totalAmount || bkg.amountDue || 0)}</p>{Number(bkg.discountAmount || 0) > 0 && <p className="mt-1 text-[10px] font-pmedium text-emerald-600">Discount {formatCurrency(bkg.discountAmount)}</p>}</td>
                      <td className="px-5 py-4 align-top"><span className={statusPillClass(bkg.status)}>{bkg.status}</span>{bkg.isExtended && <span className={statusPillClass('Extended')}>Extended</span>}</td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-center gap-1.5">
                          <button type="button" title="View booking" onClick={() => setViewingBooking(bkg)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"><Eye size={15} strokeWidth={2.5} /></button>
                          {bkg.invoiceFileUrl && <button type="button" title="Download invoice" onClick={() => window.open(bkg.invoiceFileUrl, '_blank', 'noopener,noreferrer')} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-all"><Download size={15} strokeWidth={2.5} /></button>}
                          {bkg.status === 'In Progress' && <button type="button" title="Extend slot" onClick={() => { setExtendingBooking(bkg); setExtendAvailability('idle'); setExtendForm({ newEndTime: '', paymentMode: 'Cash' }); setIsExtendModalOpen(true); }} className="p-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-all"><Clock size={15} strokeWidth={2.5} /></button>}
                          {bkg.status !== 'In Progress' && bkg.status !== 'Completed' && bkg.status !== 'Cancelled' && <><button type="button" title="Reschedule booking" onClick={() => { setReschedulingBooking(bkg); setRescheduleForm({ newDate: '', newStartTime: '', newEndTime: '' }); }} className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-all"><CalendarIcon size={15} strokeWidth={2.5} /></button><button type="button" title="Cancel booking" onClick={() => setCancellingBooking(bkg)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all"><XCircle size={15} strokeWidth={2.5} /></button></>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {selectedBookingList.length === 0 && <tr><td colSpan={7} className="py-20 text-center font-pmedium text-slate-400">No bookings found for this status.</td></tr>}
                </tbody>
              </table>
              <div className="hidden">
                {selectedBookingList.map((bkg) => (
                  <div key={bkg.id} className="w-full bg-white border border-slate-200 rounded-[15px] p-3.5 md:p-4 flex flex-col lg:grid lg:grid-cols-[minmax(0,1.95fr)_auto] gap-3 lg:gap-4 items-start lg:items-stretch hover:shadow-md hover:border-blue-300 transition-all group">

                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                        <CalendarDays size={16} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="font-pmedium text-[#0F172A] text-[15px]">{bkg.resource}</h3>
                          <div className="flex items-center gap-1.5">
                            <span className={statusPillClass(bkg.status)}>{bkg.status}</span>
                            {bkg.isExtended && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-pmedium uppercase border bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
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
                        <span className={statusPillClass("Discount")}>
                          Discount {formatCurrency(bkg.discountAmount)}{bkg.discountType === 'percent' ? ` (${Number(bkg.discountValue || 0)}%)` : ''}
                        </span>
                      )}
                      {bkg.invoiceFileUrl && (
                        <>
                          <button onClick={() => window.open(bkg.invoiceFileUrl, '_blank', 'noopener,noreferrer')} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-2xl text-[7px] font-pmedium uppercase tracking-widest transition-all flex items-center gap-1 whitespace-nowrap">
                            <Download size={12} /> Invoice
                          </button>
                          <button onClick={() => { const win = window.open(bkg.invoiceFileUrl, '_blank', 'noopener,noreferrer'); if (win) window.setTimeout(() => win.print?.(), 800); }} className="px-2.5 py-1 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-2xl text-[7px] font-pmedium uppercase tracking-widest transition-all flex items-center gap-1 whitespace-nowrap">
                            <Printer size={12} /> Print
                          </button>
                        </>
                      )}
                      {bkg.status === 'In Progress' ? (
                        <>
                          <button onClick={() => setViewingBooking(bkg)} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-2xl text-[7px] font-pmedium uppercase transition-all flex items-center gap-1 shadow-sm whitespace-nowrap">
                            <Eye size={12} /> View
                          </button>
                          <button onClick={() => { setExtendingBooking(bkg); setExtendAvailability('idle'); setExtendForm({ newEndTime: '', paymentMode: 'Cash' }); setIsExtendModalOpen(true); }} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-2xl text-[7px] font-pmedium uppercase tracking-widest transition-all flex items-center gap-1 whitespace-nowrap">
                            <Clock size={12} /> Extend Slot
                          </button>
                        </>
                      ) : bkg.status === 'Completed' || bkg.status === 'Cancelled' || bkg.status === 'Confirmed' ? (
                        <button onClick={() => setViewingBooking(bkg)} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-2xl text-[7px] font-pmedium uppercase transition-all flex items-center gap-1 shadow-sm whitespace-nowrap">
                          <Eye size={14} /> View
                        </button>
                      ) : (
                        <>
                          <button onClick={() => setViewingBooking(bkg)} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-2xl text-[7px] font-pmedium uppercase transition-all flex items-center gap-1 shadow-sm whitespace-nowrap">
                            <Eye size={14} /> View
                          </button>
                          <button onClick={() => { setReschedulingBooking(bkg); setRescheduleForm({ newDate: '', newStartTime: '', newEndTime: '' }); }} className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-2xl text-[7px] font-pmedium uppercase tracking-widest transition-all flex items-center gap-1 whitespace-nowrap">
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
                <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
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
                  {selectedClientRows.map((client) => (
                    <tr key={client.id || client.recordId || client.clientCode} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4 align-top">
                        <div className="font-pmedium text-[#0F172A] text-[13px]">{client.name || client.company || 'Unnamed Client'}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {client.company && <span className="text-[11px] font-pmedium text-slate-500">{client.company}</span>}
                          {!client.company && <span className="text-[11px] font-pmedium text-slate-400">Individual</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="text-xs font-pmedium text-slate-600 flex items-center gap-1"><Phone size={12} /> {client.phone || '—'}</div>
                        <div className="text-xs font-pmedium text-slate-600 flex items-center gap-1 mt-0.5"><Mail size={12} /> {client.email || '—'}</div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        {normalizeText(client.source) === 'visitor-conversion' ? (
                          <span className={statusPillClass("Converted")}>
                            Converted
                          </span>
                        ) : (
                          <span className={statusPillClass("Walk-in")}>
                            Walk-in
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 align-top text-center">
                        <span className="font-pmedium text-[#0F172A] text-[13px]">{client.bookingCount || 0}</span>
                      </td>
                      <td className="px-5 py-4 align-top text-center">
                        <span className="font-pmedium text-[#0F172A] text-[13px]">{formatCurrency(client.totalBookedAmount || 0)}</span>
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
                  {selectedClientRows.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-20 text-slate-400 font-pmedium">No clients found for this source.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* --- TAB: HISTORY TABLE --- */}
          {activeTab === 'history' && (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
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
                        <div className="font-pmedium text-slate-600 inline-flex items-center gap-1 whitespace-nowrap">
                          <BadgeCheck size={14} /> {vis.badgeNo || 'N/A'}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="font-pmedium text-[#0F172A] text-[13px] flex items-center gap-1.5 whitespace-nowrap"><CalendarDays size={14} className="text-slate-400" /> {vis.date || formatDisplayDate(vis.createdAt)}</div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="font-pmedium text-[#0F172A] text-[13px] whitespace-nowrap truncate max-w-[180px]">{vis.name}</div>
                        <div className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mt-0.5 flex items-center gap-1 whitespace-nowrap">
                          <Building size={10} /> {vis.company}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span className={statusPillClass(vis.purpose)}>{vis.purpose}</span>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="text-xs font-pmedium text-slate-600 flex items-center gap-1 whitespace-nowrap">
                          <User size={12} /> <span className="font-pmedium text-[#0F172A] truncate max-w-[150px]">{vis.host}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-center gap-2 font-pmedium text-[#0F172A] text-[13px] whitespace-nowrap">
                          <span>{vis.checkIn || formatTimeLabel(vis.checkInAt) || '--:--'}</span>
                          <span className="text-slate-300">-</span>
                          <span>{vis.checkOut || formatTimeLabel(vis.checkOutAt) || '--:--'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top text-center">
                        <span className={statusPillClass(vis.status)}>
                          {vis.status}
                        </span>
                        {vis.convertedToClient && (
                          <div className="mt-2">
                            <span className={statusPillClass("Converted to Client")}>
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
                    <tr><td colSpan={8} className="text-center py-20 text-slate-400 font-pmedium">No historical data found for {historyMonth} {historyYear}.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>

        {/* MODAL 1: GRAND UNIFIED "LOG VISITOR & BOOKING" TERMINAL */}
        {isLoggingVisitor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div data-frontdesk-form className="bg-white shadow-2xl animate-in zoom-in duration-200 overflow-hidden flex flex-col rounded-[22px] w-full max-w-[72rem] h-[78vh]">

              <div className="p-3 md:p-3.5 bg-white border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shrink-0">
                <div>
                  <h2 className="text-primary font-pmedium leading-none flex items-center gap-1.5"><UserPlus size={15} /> Frontdesk Action Terminal</h2>
                  <p className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest mt-1.5">Select the correct workflow below</p>
                  <p className="mt-1 text-[10px] font-pmedium text-slate-500">
                    Logged in as <span className="font-pmedium text-slate-900">{frontdeskProfile.name}</span> ({frontdeskProfile.role})
                  </p>
                </div>

                <div className="grid grid-cols-2 xl:grid-cols-4 gap-1.5 w-full md:w-auto bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    disabled={!visitorAccess.modes.standard}
                    title={!visitorAccess.modes.standard ? 'You do not have permission for Standard Visitor.' : undefined}
                    onClick={() => { setVisitorMode('standard'); setVerifiedBooking(null); setBookingConfirmation(null); setShowBookingConfirmationPopup(false); setStandardVisitorTouched({}); setStandardVisitorSubmitAttempted(false); setForm((prev) => ({ ...prev, standardVisitorType: prev.standardVisitorType || 'standard' })); }}
                    className={`w-full px-2.5 py-2 rounded-lg text-[9px] font-pmedium uppercase whitespace-nowrap transition-all ${visitorMode === 'standard' ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200' : 'text-slate-500 hover:text-slate-900'} ${!visitorAccess.modes.standard ? 'cursor-not-allowed opacity-60' : ''}`}
                  >Standard Visitor</button>
                  <button type="button" disabled={!visitorAccess.modes.tour} title={!visitorAccess.modes.tour ? 'You do not have permission for Unit Tour.' : undefined} onClick={() => { setVisitorMode('tour'); setTourTouched({}); setTourSubmitAttempted(false); }} className={`w-full px-2.5 py-2 rounded-lg text-[9px] font-pmedium uppercase whitespace-nowrap transition-all inline-flex items-center justify-center gap-1 ${visitorMode === 'tour' ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200' : 'text-slate-500 hover:text-slate-900'} ${!visitorAccess.modes.tour ? 'text-slate-400 bg-slate-200/60 cursor-not-allowed' : ''}`}>{!visitorAccess.modes.tour && <Lock size={11} />} Unit Tour</button>
                  <button type="button" disabled={!visitorAccess.modes.walkin_booking} title={!visitorAccess.modes.walkin_booking ? 'You do not have permission for Walk-in Booking.' : undefined} onClick={() => { setVisitorMode('walkin_booking'); setWalkInTouched({}); setWalkInSubmitAttempted(false); }} className={`w-full px-2.5 py-2 rounded-lg text-[9px] font-pmedium uppercase whitespace-nowrap transition-all inline-flex items-center justify-center gap-1 ${visitorMode === 'walkin_booking' ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200' : 'text-slate-500 hover:text-slate-900'} ${!visitorAccess.modes.walkin_booking ? 'text-slate-400 bg-slate-200/60 cursor-not-allowed' : ''}`}>{!visitorAccess.modes.walkin_booking && <Lock size={11} />} Walk-in Booking</button>
                  <button type="button" disabled={!visitorAccess.modes.verify_booking} title={!visitorAccess.modes.verify_booking ? 'You do not have permission for Verify Booking ID.' : undefined} onClick={() => setVisitorMode('verify_booking')} className={`w-full px-2.5 py-2 rounded-lg text-[9px] font-pmedium uppercase whitespace-nowrap transition-all inline-flex items-center justify-center gap-1 ${visitorMode === 'verify_booking' ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200' : 'text-slate-500 hover:text-slate-900'} ${!visitorAccess.modes.verify_booking ? 'text-slate-400 bg-slate-200/60 cursor-not-allowed' : ''}`}>{!visitorAccess.modes.verify_booking && <Lock size={11} />} Verify Booking</button>
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
                                className={`rounded-lg px-2.5 py-2 text-[9px] font-pmedium uppercase tracking-widest transition-all ${form.standardVisitorMode === mode
                                  ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                                  : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        {form.standardVisitorMode === 'existing' && !lastSelectedExistingVisitor && (
                          <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
                            <label className="text-[10px] font-pmedium uppercase tracking-widest text-gray-500">Search Existing Visitor</label>
                            <div className="flex items-center gap-2 rounded-xl px-1 py-1">
                              <Search size={14} className="text-gray-400" />
                              <input
                                type="text"
                                value={form.standardVisitorSearch}
                                onChange={(e) => setForm((prev) => ({ ...prev, standardVisitorSearch: e.target.value }))}
                                placeholder="Search by name, phone, email, company"
                                className="w-full border-0 bg-white text-xs font-pmedium text-gray-900 outline-none ring-0 shadow-none placeholder:text-gray-400 focus:border-0 focus:outline-none focus:ring-0"
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
                                    <p className="text-xs font-pmedium text-slate-900">{visitor.name || 'Visitor'}</p>
                                    <p className="mt-1 text-[10px] font-pmedium text-slate-600">{visitor.phone || 'No phone'} | {visitor.email || 'No email'}</p>
                                    <p className="mt-1 text-[10px] font-pmedium text-blue-700">{visitor.company || 'No company'}</p>
                                  </button>
                                ))}
                              </div>
                            ) : hasStandardVisitorSearchQuery ? (
                              <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs font-pmedium text-gray-500">
                                No matching visitor found in history.
                              </p>
                            ) : null}
                          </div>
                        )}
                        {form.standardVisitorMode === 'existing' && lastSelectedExistingVisitor && (
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="text-[10px] font-pmedium uppercase tracking-widest text-emerald-700">Visitor selected</p>
                              <p className="truncate text-xs font-pmedium text-slate-900">{lastSelectedExistingVisitor.name || 'Visitor'} · {lastSelectedExistingVisitor.phone || lastSelectedExistingVisitor.email}</p>
                            </div>
                            <button type="button" onClick={() => { setLastSelectedExistingVisitor(null); setForm((prev) => ({ ...prev, standardVisitorSearch: '' })); }} className="shrink-0 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-[9px] font-pmedium uppercase tracking-wider text-emerald-700 hover:bg-emerald-100">Change</button>
                          </div>
                        )}
                      </div>
                    )}
                    <h3 className="text-xs font-pmedium text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4 flex items-center gap-2"><User size={16} /> Personal Details</h3>

                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-pmedium text-gray-500 uppercase tracking-widest">Full Name *</label>
                        <input type="text" placeholder="Visitor Name" className="w-full px-2.5 py-2 bg-white border-2 border-gray-200 rounded-lg font-pmedium text-xs text-gray-900 focus:border-[#2563EB] outline-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-pmedium text-gray-500 uppercase tracking-widest">Phone *</label>
                          <input type="tel" placeholder="+91..." className="w-full px-2.5 py-2 bg-white border-2 border-gray-200 rounded-lg font-pmedium text-xs text-gray-900 focus:border-[#2563EB] outline-none" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-pmedium text-gray-500 uppercase tracking-widest">Email *</label>
                          <input type="email" placeholder="@email.com" className="w-full px-2.5 py-2 bg-white border-2 border-gray-200 rounded-lg font-pmedium text-xs text-gray-900 focus:border-[#2563EB] outline-none" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] font-pmedium text-gray-500 uppercase tracking-widest">Company / Agency</label>
                          <input type="text" placeholder="Optional" className="w-full px-2.5 py-2 bg-white border-2 border-gray-200 rounded-lg font-pmedium text-xs text-gray-900 focus:border-[#2563EB] outline-none" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                        </div>
                        {visitorMode === 'walkin_booking' && (
                          <div className="col-span-1 space-y-1">
                            <label className="text-[10px] font-pmedium text-gray-500 uppercase tracking-widest">Attendees</label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              className="w-full px-2.5 py-2 bg-white border-2 border-gray-200 rounded-lg font-pmedium text-xs text-gray-900 focus:border-[#2563EB] outline-none"
                              value={form.attendees}
                              onChange={(e) => {
                                const nextValue = e.target.value === '' ? '' : Number(e.target.value);
                                setAttendeeCount(nextValue);
                              }}
                            />
                            <p className="text-[10px] font-pmedium text-gray-400">
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
                    <div className="space-y-5 animate-in fade-in">

                      {isCompactMode && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                          <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><UserPlus size={16} /></span>
                            <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Visitor Entry</span>
                          </h4>
                          <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1.5">
                            {[
                              ['new', 'New Visitor'],
                              ['existing', 'Existing Visitor'],
                            ].map(([mode, label]) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => switchStandardVisitorMode(mode)}
                                className={`rounded-lg px-2.5 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${form.standardVisitorMode === mode
                                    ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                                    : 'text-slate-500 hover:text-slate-900'
                                  }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          {form.standardVisitorMode === 'existing' && !lastSelectedExistingVisitor && (
                            <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                              <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Search Existing Visitor</label>
                              <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 border border-slate-200/60 focus-within:ring-2 focus-within:ring-[#2563EB]/20 focus-within:border-[#2563EB]">
                                <Search size={14} className="text-gray-400 shrink-0" />
                                <input
                                  type="text"
                                  value={form.standardVisitorSearch}
                                  onChange={(e) => setForm((prev) => ({ ...prev, standardVisitorSearch: e.target.value }))}
                                  placeholder="Search by name, phone, email, company"
                                  className="w-full bg-transparent text-[12px] font-pmedium text-[#0F172A] outline-none placeholder:text-slate-400"
                                />
                              </div>
                              {hasStandardVisitorSearchQuery && standardVisitorSearchMatches.length > 0 ? (
                                <div className="grid gap-2">
                                  {standardVisitorSearchMatches.map((visitor) => (
                                    <button
                                      key={visitor.id}
                                      type="button"
                                      onClick={() => applyExistingStandardVisitor(visitor)}
                                      className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-left transition-all hover:border-blue-400 hover:bg-blue-50"
                                    >
                                      <p className="text-[12px] font-semibold text-slate-900">{visitor.name || 'Visitor'}</p>
                                      <p className="mt-1 text-[10px] font-pmedium text-slate-600">{visitor.phone || 'No phone'} | {visitor.email || 'No email'}</p>
                                      <p className="mt-1 text-[10px] font-pmedium text-blue-700">{visitor.company || 'No company'}</p>
                                    </button>
                                  ))}
                                </div>
                              ) : hasStandardVisitorSearchQuery ? (
                                <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs font-semibold text-gray-500">
                                  No matching visitor found in history.
                                </p>
                              ) : null}
                            </div>
                          )}
                          {form.standardVisitorMode === 'existing' && lastSelectedExistingVisitor && (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                              <div className="min-w-0">
                                <p className="text-[10px] font-pmedium uppercase tracking-widest text-emerald-700">Visitor selected</p>
                                <p className="truncate text-[12px] font-pmedium text-slate-900">{lastSelectedExistingVisitor.name || 'Visitor'} · {lastSelectedExistingVisitor.phone || lastSelectedExistingVisitor.email}</p>
                              </div>
                              <button type="button" onClick={() => { setLastSelectedExistingVisitor(null); setForm((prev) => ({ ...prev, standardVisitorSearch: '' })); }} className="shrink-0 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-[9px] font-pmedium uppercase tracking-wider text-emerald-700 hover:bg-emerald-100">Change</button>
                            </div>
                          )}
                          
                        </div>
                      )}

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                        <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                          <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><User size={16} /></span>
                          <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Personal Information</span>
                        </h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">First Name <span className="text-red-400">*</span></label>
                            <input
                              type="text"
                              placeholder="Visitor Name"
                              value={form.firstName}
                              onBlur={() => setStandardVisitorTouched((prev) => ({ ...prev, firstName: true }))}
                              onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value, name: `${e.target.value} ${String(prev.lastName || '')}`.trim() }))}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleStandardVisitorErrors.firstName ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                            />
                            {visibleStandardVisitorErrors.firstName ? <span className="text-[10px] font-medium text-red-500">{visibleStandardVisitorErrors.firstName}</span> : null}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Last Name <span className="text-red-400">*</span></label>
                            <input
                              type="text"
                              placeholder="Visitor Surname"
                              value={form.lastName}
                              onBlur={() => setStandardVisitorTouched((prev) => ({ ...prev, lastName: true }))}
                              onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value, name: `${String(prev.firstName || '')} ${e.target.value}`.trim() }))}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleStandardVisitorErrors.lastName ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                            />
                            {visibleStandardVisitorErrors.lastName ? <span className="text-[10px] font-medium text-red-500">{visibleStandardVisitorErrors.lastName}</span> : null}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Gender <span className="text-red-400">*</span></label>
                            <select
                              value={form.gender}
                              onBlur={() => setStandardVisitorTouched((prev) => ({ ...prev, gender: true }))}
                              onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleStandardVisitorErrors.gender ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                            >
                              <option value="">Select Gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                            {visibleStandardVisitorErrors.gender ? <span className="text-[10px] font-medium text-red-500">{visibleStandardVisitorErrors.gender}</span> : null}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Phone Number <span className="text-red-400">*</span></label>
                            <input
                              type="tel"
                              placeholder="10 digit phone number"
                              value={form.phone}
                              onBlur={() => setStandardVisitorTouched((prev) => ({ ...prev, phone: true }))}
                              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value.replace(/[^\d]/g, '') }))}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleStandardVisitorErrors.phone ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                            />
                            {visibleStandardVisitorErrors.phone ? <span className="text-[10px] font-medium text-red-500">{visibleStandardVisitorErrors.phone}</span> : null}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Email Address <span className="text-red-400">*</span></label>
                            <input
                              type="email"
                              inputMode="email"
                              autoComplete="email"
                              placeholder="name@example.com"
                              value={form.email}
                              onBlur={() => setStandardVisitorTouched((prev) => ({ ...prev, email: true }))}
                              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleStandardVisitorErrors.email ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                            />
                            {visibleStandardVisitorErrors.email ? <span className="text-[10px] font-medium text-red-500">{visibleStandardVisitorErrors.email}</span> : null}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Country <span className="text-red-400">*</span></label>
                            <select
                              value={form.country}
                              onBlur={() => setStandardVisitorTouched((prev) => ({ ...prev, country: true }))}
                              onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value, state: '', city: '' }))}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleStandardVisitorErrors.country ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                            >
                              <option value="">Select Country</option>
                              {countryOptions.map((country) => (
                                <option key={country.isoCode} value={country.name}>
                                  {country.name}
                                </option>
                              ))}
                            </select>
                            {visibleStandardVisitorErrors.country ? <span className="text-[10px] font-medium text-red-500">{visibleStandardVisitorErrors.country}</span> : null}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">State <span className="text-red-400">*</span></label>
                            <select
                              value={form.state}
                              onBlur={() => setStandardVisitorTouched((prev) => ({ ...prev, state: true }))}
                              onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value, city: '' }))}
                              disabled={!form.country}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:cursor-not-allowed disabled:bg-gray-100 ${visibleStandardVisitorErrors.state ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                            >
                              <option value="">{form.country ? 'Select State' : 'Select country first'}</option>
                              {stateOptions.map((state) => (
                                <option key={state.isoCode} value={state.name}>
                                  {state.name}
                                </option>
                              ))}
                            </select>
                            {visibleStandardVisitorErrors.state ? <span className="text-[10px] font-medium text-red-500">{visibleStandardVisitorErrors.state}</span> : null}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">City <span className="text-red-400">*</span></label>
                            <select
                              value={form.city}
                              onBlur={() => setStandardVisitorTouched((prev) => ({ ...prev, city: true }))}
                              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                              disabled={!form.country || !form.state}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:cursor-not-allowed disabled:bg-gray-100 ${visibleStandardVisitorErrors.city ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                            >
                              <option value="">{form.country && form.state ? 'Select City' : 'Select country and state first'}</option>
                              {cityOptions.map((city) => (
                                <option key={`${city.name}-${city.stateCode}-${city.latitude}`} value={city.name}>
                                  {city.name}
                                </option>
                              ))}
                            </select>
                            {visibleStandardVisitorErrors.city ? <span className="text-[10px] font-medium text-red-500">{visibleStandardVisitorErrors.city}</span> : null}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Visitor Type</label>
                            <select
                              value={form.visitorCompanyType}
                              onChange={(e) => setForm((prev) => ({ ...prev, visitorCompanyType: e.target.value, visitorCompany: e.target.value === 'individual' ? '' : prev.visitorCompany }))}
                              className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                            >
                              <option value="individual">Individual</option>
                              <option value="company">Company</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Visitor Company {form.visitorCompanyType === 'company' ? <span className="text-red-400">*</span> : ''}</label>
                            <input
                              type="text"
                              placeholder="Visitor Company"
                              value={form.visitorCompany}
                              onBlur={() => setStandardVisitorTouched((prev) => ({ ...prev, visitorCompany: true }))}
                              onChange={(e) => setForm((prev) => ({ ...prev, visitorCompany: e.target.value }))}
                              disabled={form.visitorCompanyType === 'individual'}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${visibleStandardVisitorErrors.visitorCompany ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                            />
                            {visibleStandardVisitorErrors.visitorCompany ? <span className="text-[10px] font-medium text-red-500">{visibleStandardVisitorErrors.visitorCompany}</span> : null}
                          </div>
                        </div>
                    </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                        <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                          <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><CalendarDays size={16} /></span>
                          <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Visit Details</span>
                        </h4>

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
                            className={`rounded-lg px-2.5 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all inline-flex items-center justify-center gap-1 ${locked
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : form.standardVisitorType === type
                                    ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
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
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Purpose <span className="text-red-400">*</span></label>
                              <select className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleStandardVisitorErrors.purpose ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`} value={form.purpose} onBlur={() => setStandardVisitorTouched((prev) => ({ ...prev, purpose: true }))} onChange={e => setForm({ ...form, purpose: e.target.value })}>
                                <option value="Meeting">Meeting</option><option value="Interview">Interview</option><option value="Delivery">Delivery</option><option value="Maintenance">Maintenance</option>
                              </select>
                              {visibleStandardVisitorErrors.purpose ? <span className="text-[10px] font-medium text-red-500">{visibleStandardVisitorErrors.purpose}</span> : null}
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Role / Department <span className="text-red-400">*</span></label>
                              <select
                                className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer disabled:cursor-not-allowed ${visibleStandardVisitorErrors.hostGroupType ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                                value={form.hostGroupType}
                                onBlur={() => setStandardVisitorTouched((prev) => ({ ...prev, hostGroupType: true }))}
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
                              {visibleStandardVisitorErrors.hostGroupType ? <span className="text-[10px] font-medium text-red-500">{visibleStandardVisitorErrors.hostGroupType}</span> : null}
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Department / Role Name <span className="text-red-400">*</span></label>
                              <select
                                className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer disabled:cursor-not-allowed ${visibleStandardVisitorErrors.hostGroupValue ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                                value={form.hostGroupValue}
                                onBlur={() => setStandardVisitorTouched((prev) => ({ ...prev, hostGroupValue: true }))}
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
                              {visibleStandardVisitorErrors.hostGroupValue ? <span className="text-[10px] font-medium text-red-500">{visibleStandardVisitorErrors.hostGroupValue}</span> : null}
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Host Member <span className="text-red-400">*</span></label>
                              <select
                                className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer disabled:cursor-not-allowed ${visibleStandardVisitorErrors.hostUserId ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                                value={form.hostUserId}
                                onBlur={() => setStandardVisitorTouched((prev) => ({ ...prev, hostUserId: true }))}
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
                              {visibleStandardVisitorErrors.hostUserId ? <span className="text-[10px] font-medium text-red-500">{visibleStandardVisitorErrors.hostUserId}</span> : null}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Reason <span className="text-red-400">*</span></label>
                            <textarea
                              rows={3}
                              placeholder="Why is the visitor here?"
                              onBlur={() => setStandardVisitorTouched((prev) => ({ ...prev, reason: true }))}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none ${visibleStandardVisitorErrors.reason ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                              value={form.reason}
                              onChange={e => setForm({ ...form, reason: e.target.value })}
                            />
                            {visibleStandardVisitorErrors.reason ? <span className="text-[10px] font-medium text-red-500">{visibleStandardVisitorErrors.reason}</span> : null}
                          </div>

                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5">
                            <ShieldCheck className="text-blue-500 shrink-0 mt-0.5" size={18} />
                            <div className="space-y-1">
                              <p className="text-[10px] font-pmedium text-blue-800 uppercase tracking-widest leading-relaxed">System will notify the host for approval.</p>
                              {visitorOverviewError ? (
                                <p className="text-[10px] font-medium text-red-600">{visitorOverviewError}</p>
                              ) : (
                                <p className="text-[10px] font-pmedium text-blue-700">Only present unit members in the selected group can be selected, including managers and other roles.</p>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Purpose</label>
                            <select
                              className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                              value={form.purpose}
                              onChange={e => setForm({ ...form, purpose: e.target.value })}
                            >
                              <option value="Exploring Services">Exploring Services</option>
                              <option value="General Visit">General Visit</option>
                              <option value="Unit Enquiry">Unit Enquiry</option>
                              <option value="Delivery">Delivery</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Visit Note</label>
                            <textarea
                              rows={4}
                              placeholder="Optional note, e.g. came to see the place or explore services"
                              className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
                              value={form.reason}
                              onChange={e => setForm({ ...form, reason: e.target.value })}
                            />
                          </div>

                        </div>
                      )}
                      </div>
                    </div>
                  )}

                  {visitorMode === 'tour' && (
                    <div className="space-y-5 animate-in fade-in">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                        <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                          <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><User size={16} /></span>
                          <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Contact Information</span>
                        </h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">POC / Visitor Name <span className="text-red-400">*</span></label>
                            <input type="text" placeholder="POC / Visitor Name"
                              value={form.pocName} onBlur={() => setTourTouched((prev) => ({ ...prev, pocName: true }))} onChange={(e) => setForm({ ...form, pocName: e.target.value })}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleTourErrors.pocName ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`} />
                            {visibleTourErrors.pocName ? <span className="text-[10px] font-medium text-red-500">{visibleTourErrors.pocName}</span> : null}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Designation</label>
                            <input type="text" placeholder="e.g. Founder"
                              value={form.pocDesignation} onChange={(e) => setForm({ ...form, pocDesignation: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Company / Agency</label>
                            <input type="text" placeholder="Company / Agency"
                              value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Phone <span className="text-red-400">*</span></label>
                            <input type="tel" placeholder="Phone"
                              value={form.pocPhone} onBlur={() => setTourTouched((prev) => ({ ...prev, pocPhone: true }))} onChange={(e) => setForm({ ...form, pocPhone: e.target.value })}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleTourErrors.pocPhone ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`} />
                            {visibleTourErrors.pocPhone ? <span className="text-[10px] font-medium text-red-500">{visibleTourErrors.pocPhone}</span> : null}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Email <span className="text-red-400">*</span></label>
                            <input type="email" placeholder="Email"
                              value={form.pocEmail} onBlur={() => setTourTouched((prev) => ({ ...prev, pocEmail: true }))} onChange={(e) => setForm({ ...form, pocEmail: e.target.value })}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleTourErrors.pocEmail ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`} />
                            {visibleTourErrors.pocEmail ? <span className="text-[10px] font-medium text-red-500">{visibleTourErrors.pocEmail}</span> : null}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                        <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                          <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Globe size={16} /></span>
                          <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Location</span>
                        </h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Country</label>
                            <select
                              value={form.country}
                              onChange={(e) => setForm({ ...form, country: e.target.value, state: '', city: '' })}
                              className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                            >
                              <option value="">Select Country</option>
                              {countryOptions.map((country) => (
                                <option key={country.isoCode} value={country.name}>{country.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">State</label>
                            <select
                              value={form.state}
                              onChange={(e) => setForm({ ...form, state: e.target.value, city: '' })}
                              disabled={!form.country}
                              className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:cursor-not-allowed disabled:bg-gray-100"
                            >
                              <option value="">{form.country ? 'Select State' : 'Select country first'}</option>
                              {stateOptions.map((state) => (
                                <option key={state.isoCode} value={state.name}>{state.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">City</label>
                            <select
                              value={form.city}
                              onChange={(e) => setForm({ ...form, city: e.target.value })}
                              disabled={!form.country || !form.state}
                              className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:cursor-not-allowed disabled:bg-gray-100"
                            >
                              <option value="">{form.country && form.state ? 'Select City' : 'Select country and state first'}</option>
                              {cityOptions.map((city) => (
                                <option key={`${city.name}-${city.stateCode}-${city.latitude}`} value={city.name}>{city.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                        <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                          <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Building size={16} /></span>
                          <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Client Profile &amp; Requirements</span>
                        </h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Industry <span className="text-red-400">*</span></label>
                            <select value={form.industry} onBlur={() => setTourTouched((prev) => ({ ...prev, industry: true }))} onChange={(e) => setForm({ ...form, industry: e.target.value })}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleTourErrors.industry ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}>
                              <option value="">Select Industry</option>
                              {TOUR_INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                            {visibleTourErrors.industry ? <span className="text-[10px] font-medium text-red-500">{visibleTourErrors.industry}</span> : null}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Team Size <span className="text-red-400">*</span></label>
                            <input type="text" placeholder="Team Size"
                              value={form.teamSize} onBlur={() => setTourTouched((prev) => ({ ...prev, teamSize: true }))} onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleTourErrors.teamSize ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`} />
                            {visibleTourErrors.teamSize ? <span className="text-[10px] font-medium text-red-500">{visibleTourErrors.teamSize}</span> : null}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Seats Needed <span className="text-red-400">*</span></label>
                            <input type="text" placeholder="Seats Needed"
                              value={form.seatCount} onBlur={() => setTourTouched((prev) => ({ ...prev, seatCount: true }))} onChange={(e) => setForm({ ...form, seatCount: e.target.value })}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleTourErrors.seatCount ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`} />
                            {visibleTourErrors.seatCount ? <span className="text-[10px] font-medium text-red-500">{visibleTourErrors.seatCount}</span> : null}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Preferred Space <span className="text-red-400">*</span></label>
                            <select value={form.preferredSpace} onBlur={() => setTourTouched((prev) => ({ ...prev, preferredSpace: true }))} onChange={(e) => setForm({ ...form, preferredSpace: e.target.value })}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleTourErrors.preferredSpace ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}>
                              <option value="">Select Space Type</option>
                              {TOUR_SPACE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                            {visibleTourErrors.preferredSpace ? <span className="text-[10px] font-medium text-red-500">{visibleTourErrors.preferredSpace}</span> : null}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Budget Range <span className="text-red-400">*</span></label>
                            <select value={form.budgetRange} onBlur={() => setTourTouched((prev) => ({ ...prev, budgetRange: true }))} onChange={(e) => setForm({ ...form, budgetRange: e.target.value })}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleTourErrors.budgetRange ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}>
                              <option value="">Select Budget</option>
                              {TOUR_BUDGET_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                            {visibleTourErrors.budgetRange ? <span className="text-[10px] font-medium text-red-500">{visibleTourErrors.budgetRange}</span> : null}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Move-in Timeline <span className="text-red-400">*</span></label>
                            <select value={form.moveInTimeline} onBlur={() => setTourTouched((prev) => ({ ...prev, moveInTimeline: true }))} onChange={(e) => setForm({ ...form, moveInTimeline: e.target.value })}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleTourErrors.moveInTimeline ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}>
                              <option value="">Select Timeline</option>
                              {TOUR_TIMELINE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                            {visibleTourErrors.moveInTimeline ? <span className="text-[10px] font-medium text-red-500">{visibleTourErrors.moveInTimeline}</span> : null}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                        <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                          <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><CalendarDays size={16} /></span>
                          <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Follow-up</span>
                        </h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Preferred Contact Method <span className="text-red-400">*</span></label>
                            <select value={form.preferredContactMethod} onBlur={() => setTourTouched((prev) => ({ ...prev, preferredContactMethod: true }))} onChange={(e) => setForm({ ...form, preferredContactMethod: e.target.value })}
                              className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleTourErrors.preferredContactMethod ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}>
                              <option value="">Select Contact Method</option>
                              <option value="Call">Call</option>
                              <option value="WhatsApp">WhatsApp</option>
                              <option value="Email">Email</option>
                              <option value="In-person">In-person</option>
                            </select>
                            {visibleTourErrors.preferredContactMethod ? <span className="text-[10px] font-medium text-red-500">{visibleTourErrors.preferredContactMethod}</span> : null}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Follow-up Date</label>
                            <input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Tour Notes</label>
                          <textarea rows={3} placeholder="Tour notes — objections, preferences, follow-up points for Sales (optional)"
                            className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
                            value={form.tourNotes} onChange={(e) => setForm({ ...form, tourNotes: e.target.value })} />
                        </div>
                      </div>

                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5">
                        <ShieldCheck className="text-blue-500 shrink-0 mt-0.5" size={18} />
                        <p className="text-[10px] font-pmedium text-blue-700 leading-relaxed">
                          Visitor is checked in &amp; lead synced to CRM. All starred (*) fields required.
                        </p>
                      </div>
                    </div>
                  )}

                  {visitorMode === 'walkin_booking' && (
                    <div className="space-y-5 animate-in fade-in">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                        <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                          <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><UserPlus size={16} /></span>
                          <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Client Information</span>
                        </h4>
                        {form.sourceVisitorId ? (
                          <span className={statusPillClass("Visitor conversion")}>Visitor conversion
                          </span>
                        ) : null}

                            <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1.5">
                              {[
                                ['new', 'New Client Booking'],
                                ['existing', 'Existing Client Booking'],
                              ].map(([mode, label]) => (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() => switchClientBookingMode(mode)}
                                  className={`rounded-lg px-2.5 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${form.clientBookingMode === mode ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>

                            {form.clientBookingMode === 'existing' && !selectedBookingClient && (
                              <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Search Existing Client</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={form.clientSearch}
                                    onChange={(e) => setForm({ ...form, clientSearch: e.target.value })}
                                    placeholder="Search by name, phone, email, company"
                                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => refreshBookingClients(form.clientSearch)}
                                    className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-[10px] font-pmedium uppercase tracking-wider shadow-sm hover:bg-blue-700 transition-all"
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
                                        <p className="mt-1 text-[10px] font-pmedium text-slate-500">{client.phone || 'No phone'} • {client.email || 'No email'}</p>
                                        <p className="mt-1 text-[9px] font-pmedium uppercase tracking-widest text-blue-600">{client.clientCode || 'Client'} • {client.bookingCount || 0} bookings</p>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {form.clientBookingMode === 'existing' && selectedBookingClient && (
                              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                                <div className="min-w-0">
                                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-emerald-700">Client selected</p>
                                  <p className="truncate text-[12px] font-pmedium text-slate-900">{selectedBookingClient.name || selectedBookingClient.company} · {selectedBookingClient.phone || selectedBookingClient.email}</p>
                                </div>
                                <button type="button" onClick={() => setForm((prev) => ({ ...prev, clientId: '', clientSearch: '' }))} className="shrink-0 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-[9px] font-pmedium uppercase tracking-wider text-emerald-700 hover:bg-emerald-100">Change</button>
                              </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Name <span className="text-red-400">*</span></label>
                                <input type="text" value={form.name} onBlur={() => setWalkInTouched((prev) => ({ ...prev, name: true }))} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleWalkInErrors.name ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`} placeholder="Client name" />
                                {visibleWalkInErrors.name ? <span className="text-[10px] font-medium text-red-500">{visibleWalkInErrors.name}</span> : null}
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Phone <span className="text-red-400">*</span></label>
                                <input type="tel" value={form.phone} onBlur={() => setWalkInTouched((prev) => ({ ...prev, phone: true }))} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleWalkInErrors.phone ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`} placeholder="+91..." />
                                {visibleWalkInErrors.phone ? <span className="text-[10px] font-medium text-red-500">{visibleWalkInErrors.phone}</span> : null}
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Email <span className="text-red-400">*</span></label>
                                <input type="email" value={form.email} onBlur={() => setWalkInTouched((prev) => ({ ...prev, email: true }))} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleWalkInErrors.email ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`} placeholder="client@email.com" />
                                {visibleWalkInErrors.email ? <span className="text-[10px] font-medium text-red-500">{visibleWalkInErrors.email}</span> : null}
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Company</label>
                                <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" placeholder="Optional" />
                              </div>
                            </div>

                            {form.clientBookingMode === 'new' && matchedSavedVisitors.length > 0 && (
                              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                                <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Saved visitor matches</p>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                  {matchedSavedVisitors.map((visitor) => (
                                    <button
                                      key={visitor.id}
                                      type="button"
                                      onClick={() => applySavedVisitorContact(visitor)}
                                      className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-left transition-all hover:border-blue-500 hover:bg-blue-50"
                                    >
                                      <p className="text-[12px] font-semibold text-slate-900">{visitor.name || 'Visitor'}</p>
                                      <p className="mt-1 text-[10px] font-pmedium text-slate-500">{visitor.phone || 'No phone'} • {visitor.email || 'No email'}</p>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                            <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><LayoutGrid size={16} /></span>
                              <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Location &amp; Capacity</span>
                            </h4>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Space Type <span className="text-red-400">*</span></label>
                                <select
                                  className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleWalkInErrors.spaceType ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                                  value={form.spaceType}
                                  onBlur={() => setWalkInTouched((prev) => ({ ...prev, spaceType: true }))}
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
                                {visibleWalkInErrors.spaceType ? <span className="text-[10px] font-medium text-red-500">{visibleWalkInErrors.spaceType}</span> : null}
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Floor <span className="text-red-400">*</span></label>
                                <select
                                  className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${visibleWalkInErrors.floor ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                                  value={form.floor}
                                  disabled={!form.spaceType}
                                  onBlur={() => setWalkInTouched((prev) => ({ ...prev, floor: true }))}
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
                                {visibleWalkInErrors.floor ? <span className="text-[10px] font-medium text-red-500">{visibleWalkInErrors.floor}</span> : null}
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Wing <span className="text-slate-400 normal-case">(optional)</span></label>
                                <select
                                  className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${visibleWalkInErrors.wing ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                                  value={form.wing}
                                  disabled={!form.spaceType || !form.floor}
                                  onBlur={() => setWalkInTouched((prev) => ({ ...prev, wing: true }))}
                                  onChange={(e) => {
                                    const nextWing = e.target.value;
                                    setForm({ ...form, wing: nextWing, resourceName: '', seatNumber: '' });
                                  }}
                                >
                                  <option value="">All wings</option>
                                  {walkInWingOptions.map((wing) => (
                                    <option key={wing} value={wing}>Wing {wing}</option>
                                  ))}
                                </select>
                                {visibleWalkInErrors.wing ? <span className="text-[10px] font-medium text-red-500">{visibleWalkInErrors.wing}</span> : null}
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Specific Room <span className="text-red-400">*</span></label>
                                <select
                                  className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${visibleWalkInErrors.resourceName ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                                  value={form.resourceName}
                                  disabled={!form.spaceType || !form.floor}
                                  onBlur={() => setWalkInTouched((prev) => ({ ...prev, resourceName: true }))}
                                  onChange={(e) => setForm({ ...form, resourceName: e.target.value, seatNumber: '' })}
                                >
                                  <option value="">Select a room</option>
                                  {walkInRoomOptions.map((room) => (
                                    <option key={room.name} value={room.name} disabled={room.walkInDisabled}>
                                      {room.name} {room.floor ? `(${room.floor}${room.wing ? ` ${room.wing}` : ''})` : ''} {room.capacity ? `- ${room.capacity} seats` : ''} {room.inventoryMode === 'area' ? '(Area)' : '(Single)'} {room.assignedTenantCompanyName ? `- ${room.assignedTenantCompanyName}` : ''} {room.assignedDepartmentName ? `- ${room.assignedDepartmentName}` : ''} {room.walkInDisabled ? `- ${room.walkInDisableReason}` : ''}
                                    </option>
                                  ))}
                                </select>
                                {visibleWalkInErrors.resourceName ? <span className="text-[10px] font-medium text-red-500">{visibleWalkInErrors.resourceName}</span> : null}
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Attendees <span className="text-red-400">*</span></label>
                                <input
                                  type="number"
                                  min="1"
                                  max={selectedWalkInRoom?.capacity || undefined}
                                  inputMode="numeric"
                                  className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleWalkInErrors.attendees ? 'border-red-300 bg-red-50' : 'border-slate-200/60'} ${isDeskAreaSeatBooking ? 'opacity-70' : ''}`}
                                  value={isDeskAreaSeatBooking ? 1 : form.attendees}
                                  disabled={isDeskAreaSeatBooking}
                                  onBlur={() => setWalkInTouched((prev) => ({ ...prev, attendees: true }))}
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
                                {visibleWalkInErrors.attendees ? <span className="text-[10px] font-medium text-red-500">{visibleWalkInErrors.attendees}</span> : null}
                                <p className="text-[10px] font-medium text-slate-400">
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
                            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Seat Number <span className="text-red-400">*</span></label>
                                  <select
                                    className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleWalkInErrors.seatNumber ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                                    value={form.seatNumber}
                                    onBlur={() => setWalkInTouched((prev) => ({ ...prev, seatNumber: true }))}
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
                                  {visibleWalkInErrors.seatNumber ? <span className="text-[10px] font-medium text-red-500">{visibleWalkInErrors.seatNumber}</span> : null}
                                </div>
                                <div className="rounded-xl bg-white px-4 py-3 text-right shadow-sm">
                                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Seat Availability</p>
                                  <p className="mt-1 text-xs font-bold text-blue-700">
                                    {deskSeatOptions.filter((seat) => seat.available).length} / {deskSeatOptions.length} available
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                            <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><FileText size={16} /></span>
                              <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Schedule &amp; Availability</span>
                            </h4>

                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Booking Note</label>
                              <textarea
                                rows="3"
                                placeholder="Add booking purpose, special request, or internal note"
                                className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
                                value={form.purpose}
                                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                              />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Booking Start Date <span className="text-red-400">*</span></label>
                                <input
                                  type="date"
                                  min={formatDateKey(new Date())}
                                  className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleWalkInErrors.startDate ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                                  value={form.startDate}
                                  onBlur={() => setWalkInTouched((prev) => ({ ...prev, startDate: true }))}
                                  onChange={(e) => {
                                    const nextStartDate = e.target.value;
                                    setForm({
                                      ...form,
                                      startDate: nextStartDate,
                                      endDate: !form.endDate || form.endDate < nextStartDate ? nextStartDate : form.endDate,
                                      startTime: '',
                                      endTime: '',
                                    });
                                  }}
                                />
                                {visibleWalkInErrors.startDate ? <span className="text-[10px] font-medium text-red-500">{visibleWalkInErrors.startDate}</span> : null}
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Booking End Date <span className="text-red-400">*</span></label>
                                <input
                                  type="date"
                                  min={form.startDate || formatDateKey(new Date())}
                                  className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleWalkInErrors.endDate ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                                  value={form.endDate}
                                  onBlur={() => setWalkInTouched((prev) => ({ ...prev, endDate: true }))}
                                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                />
                                {visibleWalkInErrors.endDate ? <span className="text-[10px] font-medium text-red-500">{visibleWalkInErrors.endDate}</span> : null}
                              </div>
                            </div>

                            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:flex sm:items-start sm:justify-between sm:gap-6">
                              <div className="min-w-0">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Availability</label>
                                <p className={`mt-1 text-[12px] font-semibold ${walkInAvailability.status === 'available'
                                    ? 'text-emerald-700'
                                    : walkInAvailability.status === 'conflict'
                                      ? 'text-rose-700'
                                      : 'text-blue-900'
                                }`}>
                                  {walkInAvailability.reason}
                                </p>
                                {meetingRoomOverviewError ? (
                                  <p className="mt-2 text-[10px] font-medium text-red-500">{meetingRoomOverviewError}</p>
                                ) : null}
                                {visibleWalkInErrors.availability ? <p className="mt-2 text-[10px] font-medium text-red-500">{visibleWalkInErrors.availability}</p> : null}
                              </div>
                              <div className="mt-3 shrink-0 border-t border-blue-100 pt-3 text-left sm:mt-0 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:text-right">
                                <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Booking Hours</p>
                                <p className="mt-1 whitespace-nowrap text-[12px] font-pmedium text-blue-800">
                                  {formatTimeOptionLabel(businessHours.start)} - {formatTimeOptionLabel(businessHours.end)}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Start Time <span className="text-red-400">*</span></label>
                                <select
                                  className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleWalkInErrors.startTime ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                                  value={form.startTime}
                                  onBlur={() => setWalkInTouched((prev) => ({ ...prev, startTime: true, availability: true }))}
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
                                  {form.startDate && walkInStartTimeOptions.length === 0 ? (
                                    <option value="" disabled>No booking hours remaining today</option>
                                  ) : null}
                                  {walkInStartTimeOptions.map((timeValue) => (
                                    <option key={timeValue} value={timeValue}>{formatTimeOptionLabel(timeValue)}</option>
                                  ))}
                                </select>
                                {visibleWalkInErrors.startTime ? <span className="text-[10px] font-medium text-red-500">{visibleWalkInErrors.startTime}</span> : null}
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">End Time <span className="text-red-400">*</span></label>
                                <select
                                  className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleWalkInErrors.endTime ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                                  value={form.endTime}
                                  onBlur={() => setWalkInTouched((prev) => ({ ...prev, endTime: true, availability: true }))}
                                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                                >
                                  <option value="">Select end time</option>
                                  {walkInEndTimeOptions.map((timeValue) => (
                                    <option key={timeValue} value={timeValue}>{formatTimeOptionLabel(timeValue)}</option>
                                  ))}
                                </select>
                                {visibleWalkInErrors.endTime ? <span className="text-[10px] font-medium text-red-500">{visibleWalkInErrors.endTime}</span> : null}
                              </div>
                            </div>
                          {walkInAvailability.status === 'conflict' && walkInAvailability.slotSuggestions.length > 0 && (
                            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className={statusPillClass("Alternative times")}>Alternative times</span>
                                <span className="text-[10px] font-pmedium text-blue-700">{formatWalkInDateLabel(form.startDate, form.endDate)}</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {walkInAvailability.slotSuggestions.map((slot) => (
                                  <button
                                    key={`${slot.start}-${slot.end}`}
                                    type="button"
                                    onClick={() => setForm({ ...form, startTime: slot.start, endTime: slot.end })}
                                    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-pmedium text-blue-700 transition-all hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                                  >
                                    {formatTimeLabel(slot.start)} - {formatTimeLabel(slot.end)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {isDeskAreaSeatBooking && walkInAvailability.seatSuggestions.length > 0 && (
                            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className={statusPillClass("Available seats")}>Available seats</span>
                                <span className="text-[10px] font-pmedium text-blue-700">Desk Area</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {walkInAvailability.seatSuggestions.map((seatNumber) => (
                                  <button
                                    key={seatNumber}
                                    type="button"
                                    onClick={() => setForm((prev) => ({ ...prev, seatNumber: String(seatNumber), attendees: 1 }))}
                                    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-pmedium text-blue-700 transition-all hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                                  >
                                    Seat {seatNumber}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                          <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Wallet size={16} /></span>
                            <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Pricing &amp; Payment</span>
                          </h4>
                          <div className="grid gap-4 lg:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className={statusPillClass("Live Pricing")}>Live Pricing</span>
                                <span className="text-[10px] font-pmedium text-slate-400">{selectedWalkInRoom?.capacity || 0} seats</span>
                              </div>
                              <p className="text-[12px] font-semibold text-blue-700">
                                {selectedWalkInRoom?.pricePerHour > 0
                                  ? `${formatCurrency(selectedWalkInRoom.pricePerHour)} / hr`
                                  : selectedWalkInRoom?.pricing || 'Pricing pending'}
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setForm((prev) => ({ ...prev, discountType: 'amount' }))}
                                  className={`rounded-lg border px-2 py-1.5 text-[10px] font-pmedium uppercase tracking-widest transition-all ${form.discountType === 'amount' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}
                                >
                                  Amount
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setForm((prev) => ({ ...prev, discountType: 'percent' }))}
                                  className={`rounded-lg border px-2 py-1.5 text-[10px] font-pmedium uppercase tracking-widest transition-all ${form.discountType === 'percent' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}
                                >
                                  Percent
                                </button>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">
                                  Discount {form.discountType === 'percent' ? '(%)' : '(INR)'}
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={form.discountValue}
                                  onChange={(e) => setForm((prev) => ({ ...prev, discountValue: e.target.value }))}
                                  className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                                  placeholder={form.discountType === 'percent' ? 'e.g. 10' : 'e.g. 500'}
                                />
                              </div>
                              <div className="flex justify-between text-[12px] font-semibold text-slate-600">
                                <span>Base rate</span>
                                <span>{hasWalkInQuote ? formatCurrency(walkInPricing.subtotalBeforeDiscount) : 'Pending'}</span>
                              </div>
                              <div className="flex justify-between text-[12px] font-semibold text-slate-600">
                                <span>
                                  Discount
                                  {hasWalkInQuote && walkInPricing.discountType === 'percent' ? ` (${walkInPricing.discountValue}%)` : ''}
                                </span>
                                <span>{hasWalkInQuote ? `- ${formatCurrency(walkInPricing.discountAmount)}` : 'Pending'}</span>
                              </div>
                              <div className="flex justify-between text-[12px] font-semibold text-slate-600">
                                <span>Taxable amount</span>
                                <span>{hasWalkInQuote ? formatCurrency(walkInPricing.taxableBaseAfterDiscount) : 'Pending'}</span>
                              </div>
                              <div className="flex justify-between text-[12px] font-semibold text-slate-600">
                                <span>GST (18%)</span>
                                <span>{hasWalkInQuote ? formatCurrency(walkInPricing.gst) : 'Pending'}</span>
                              </div>
                              <div className="flex justify-between border-t border-slate-200 pt-2 text-[14px] font-bold text-[#0F172A]">
                                <span>Total</span>
                                <span>{hasWalkInQuote ? formatCurrency(walkInPricing.total) : 'Pending'}</span>
                              </div>
                            </div>

                            {walkInAvailability.status === 'conflict' && (
                              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
                                <span className={statusPillClass("Room Alternatives")}>Room Alternatives</span>
                                <div className="space-y-2">
                                  {walkInAvailability.roomSuggestions.length > 0 ? (
                                    walkInAvailability.roomSuggestions.map((room) => (
                                      <button
                                        key={room.name}
                                        type="button"
                                        onClick={() => setForm((prev) => ({ ...prev, floor: room.floor || prev.floor, wing: room.wing || prev.wing, resourceName: room.name, seatNumber: '' }))}
                                        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-all hover:border-blue-200 hover:bg-blue-50"
                                      >
                                        <span className="text-[12px] font-semibold text-slate-900">{room.name}</span>
                                        <span className="text-[10px] font-pmedium text-slate-500">{room.floor} - {room.capacity} seats</span>
                                      </button>
                                    ))
                                  ) : (
                                    <p className="text-[12px] font-medium text-slate-500">No alternate room suggestions for the selected slot.</p>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-4">
                              <span className={statusPillClass("Payment Mode")}>Payment Mode</span>
                              <div className="grid grid-cols-2 gap-2">
                                {['Cash', 'GPay (UPI)'].map((mode) => (
                                  <button
                                    key={mode}
                                    type="button"
                                    onClick={() => { setWalkInTouched((prev) => ({ ...prev, paymentMode: true })); setForm({ ...form, paymentMode: mode, transactionId: mode === 'GPay (UPI)' ? form.transactionId : '', paymentProofFile: mode === 'GPay (UPI)' ? form.paymentProofFile : null }); }}
                                    className={`rounded-lg border px-3 py-2.5 text-[10px] font-pmedium uppercase tracking-widest transition-all ${form.paymentMode === mode ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}
                                  >
                                    {mode}
                                  </button>
                                ))}
                              </div>
                              {visibleWalkInErrors.paymentMode ? <span className="text-[10px] font-medium text-red-500">{visibleWalkInErrors.paymentMode}</span> : null}
                              {normalizeText(form.paymentMode).includes('gpay') && (
                                <div className="space-y-3">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Transaction Number <span className="text-red-400">*</span></label>
                                    <input
                                      type="text"
                                      value={form.transactionId}
                                      onBlur={() => setWalkInTouched((prev) => ({ ...prev, transactionId: true }))}
                                      onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
                                      placeholder="Enter GPay reference / UTR"
                                      className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${visibleWalkInErrors.transactionId ? 'border-red-300 bg-red-50' : 'border-slate-200/60'}`}
                                    />
                                    {visibleWalkInErrors.transactionId ? <span className="text-[10px] font-medium text-red-500">{visibleWalkInErrors.transactionId}</span> : null}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Payment Screenshot <span className="text-red-400">*</span></label>
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/jpg"
                                      onBlur={() => setWalkInTouched((prev) => ({ ...prev, paymentProofFile: true }))}
                                      onChange={(e) => { setWalkInTouched((prev) => ({ ...prev, paymentProofFile: true })); setForm({ ...form, paymentProofFile: e.target.files?.[0] || null }); }}
                                      className={`block w-full rounded-lg border border-dashed bg-slate-50 px-3 py-2 text-[12px] text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[#2563EB] file:px-4 file:py-2 file:text-[10px] file:font-bold file:uppercase file:tracking-wider file:text-white hover:border-blue-300 ${visibleWalkInErrors.paymentProofFile ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
                                    />
                                    {visibleWalkInErrors.paymentProofFile ? <span className="text-[10px] font-medium text-red-500">{visibleWalkInErrors.paymentProofFile}</span> : null}
                                    {form.paymentProofFile?.name ? (
                                      <p className="text-[10px] font-medium text-blue-700">Selected: {form.paymentProofFile.name}</p>
                                    ) : null}
                                    <p className="text-[10px] font-medium text-slate-500">Upload a JPG or PNG screenshot from the UPI app.</p>
                                  </div>
                                </div>
                              )}
                              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 space-y-1">
                                <p className="text-[10px] font-pmedium text-blue-700 uppercase tracking-widest">Summary</p>
                                <p className="text-[12px] font-semibold text-blue-950">{selectedWalkInRoom?.name || 'Select a room'} - {selectedWalkInRoom?.floor || form.floor || 'Select floor'} {selectedWalkInRoom?.wing || form.wing || ''}{isDeskAreaSeatBooking ? ` - Seat ${form.seatNumber || '-'}` : ''} - {formatWalkInDateLabel(form.startDate, form.endDate) || 'Select dates'}</p>
                                <p className="text-[12px] font-medium text-blue-900/80">{walkInAvailability.reason}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                  )}

                  {visitorMode === 'verify_booking' && (
                    <div className="space-y-2.5 animate-in fade-in h-full flex flex-col bg-gray-50 rounded-lg border border-gray-200 p-2.5 text-[10px]">
                      <h3 className="text-xs font-pmedium text-blue-600 uppercase tracking-widest border-b border-blue-200 pb-2 mb-2 flex items-center gap-2"><Search size={16} /> Verify Booking</h3>
                      <p className="text-[11px] font-pmedium text-slate-500 -mt-1">Ask the visitor for the booking ID from their confirmation email and enter it below to verify the booking.</p>

                      <div className="flex gap-3">
                        <input type="text" placeholder="Enter booking ID from the confirmation email..." className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-pmedium text-gray-900 focus:border-blue-500 outline-none uppercase shadow-sm text-xs" value={form.bookingId} onChange={e => setForm({ ...form, bookingId: e.target.value })} />
                        <button onClick={handleVerifySearch} disabled={!form.bookingId || !visitorAccess.modes.verify_booking} title={!visitorAccess.modes.verify_booking ? 'You do not have permission to verify booking IDs.' : undefined} className="rounded-2xl font-pmedium text-[10px] uppercase tracking-wider px-6 bg-gray-900 text-white hover:bg-black disabled:bg-gray-300 transition-all shadow-md">FETCH</button>
                      </div>

                      {verifiedBooking && (
                        <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 animate-in slide-in-from-bottom-2">
                          <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                            <div>
                              <p className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest">Matched Booking</p>
                              <p className="font-bold text-gray-900 text-lg mt-1">{verifiedBooking.resource}</p>
                              <p className="text-xs font-bold text-gray-500">{verifiedBooking.date} • {verifiedBooking.time}</p>
                            </div>
                            <span className={statusPillClass(verifiedBooking.status)}>
                              {verifiedBooking.status}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[10px] font-pmedium text-gray-500 uppercase">Booked By / Primary Attendee</p>
                            <p className="font-bold text-gray-900">{verifiedBooking.bookedBy} <span className="text-gray-400 text-xs">({verifiedBooking.company})</span></p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-xl bg-gray-50 p-3">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Booking ID</p>
                              <p className="mt-1 font-black text-gray-900">{verifiedBooking.id}</p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-3">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Attendees</p>
                              <p className="mt-1 font-black text-gray-900">{verifiedBooking.attendees || '1'}</p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-3">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Email</p>
                              <p className="mt-1 font-bold text-gray-900">{verifiedBooking.email || 'Not provided'}</p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-3">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Payment Mode</p>
                              <p className="mt-1 font-bold text-gray-900">{verifiedBooking.paymentMode || 'Not set'}</p>
                            </div>
                          </div>

                          {verifiedBooking.status === 'Pending Payment' && (
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3">
                              <div className="flex justify-between items-center">
                                <span className={statusPillClass("Amount Due:")}>Amount Due:</span>
                                <span className="text-xl font-black text-amber-600">₹{verifiedBooking.amountDue}</span>
                              </div>
                              <div className="flex gap-2">
                                {['Cash', 'GPay (UPI)'].map(method => (
                                  <button
                                    key={method} type="button" onClick={() => setForm({ ...form, paymentMode: method })}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-pmedium transition-all border ${form.paymentMode === method ? 'border-amber-500 bg-amber-500 text-white' : 'border-amber-200 bg-white text-amber-700'}`}
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

              {activeFormSubmitAttempted && <ValidationSummary errors={activeFormValidationErrors} />}

              <div className={visitorMode === 'walkin_booking' ? 'flex flex-col-reverse items-stretch gap-3 pt-2 shrink-0 px-6 pb-4 sm:flex-row sm:justify-end' : 'flex items-center justify-end gap-3 pt-2 shrink-0 px-6 pb-4'}>
                <button type="button" onClick={() => { setIsLoggingVisitor(false); setLastSelectedExistingVisitor(null); setVerifiedBooking(null); setBookingConfirmation(null); setShowBookingConfirmationPopup(false); setWalkInStep(1); setAvailabilityStatus('idle'); setStandardVisitorTouched({}); setStandardVisitorSubmitAttempted(false); setTourTouched({}); setTourSubmitAttempted(false); setWalkInTouched({}); setWalkInSubmitAttempted(false); }} className={visitorMode === 'walkin_booking' ? 'w-full sm:flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all' : 'flex-1 px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all'}>Cancel</button>

                {visitorMode === 'standard' && (
                  <button
                    type="button"
                    onClick={handleProcessAction}
                    disabled={isSubmittingVisitor || isVisitorOverviewLoading || !visitorAccess.modes.standard || isReadOnlySession}
                    title={isReadOnlySession ? 'Read-only staff view - changes are disabled' : !visitorAccess.modes.standard ? 'You do not have access to Standard Visitor tab.' : undefined}
                    className="flex-1 px-8 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={14} />{isSubmittingVisitor ? 'SENDING...' : form.standardVisitorType === 'department' ? 'SEND HOST APPROVAL' : 'CHECK IN VISITOR'}
                  </button>
                )}
                {visitorMode === 'tour' && (
                  <button onClick={handleProcessAction} disabled={!visitorAccess.modes.tour || isReadOnlySession} title={isReadOnlySession ? 'Read-only staff view - changes are disabled' : !visitorAccess.modes.tour ? 'You do not have access to Unit Tour tab.' : undefined} className="rounded-2xl font-pmedium text-[10px] uppercase tracking-wider flex-1 py-3 bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 disabled:bg-gray-300 disabled:shadow-none">
                    <Building size={18} /> SYNC LEAD & START TOUR
                  </button>
                )}
                {visitorMode === 'walkin_booking' && (
                  <button type="button" disabled={isSubmittingVisitor || !visitorAccess.modes.walkin_booking || isReadOnlySession} title={isReadOnlySession ? 'Read-only staff view - changes are disabled' : !visitorAccess.modes.walkin_booking ? 'You do not have access to Walk-in Booking tab.' : undefined} onClick={handleProcessAction} className="w-full sm:flex-1 rounded-2xl font-pmedium text-[10px] uppercase tracking-wider px-6 py-3 bg-[#2563EB] text-white shadow-sm shadow-blue-200 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5">
                    <Wallet size={18} /> {isSubmittingVisitor ? 'CONFIRMING...' : 'COLLECT PAYMENT & CONFIRM'}
                  </button>
                )}
                {visitorMode === 'verify_booking' && (
                  <button disabled={!verifiedBooking || !visitorAccess.modes.verify_booking || isReadOnlySession} title={isReadOnlySession ? 'Read-only staff view - changes are disabled' : !visitorAccess.modes.verify_booking ? 'You do not have access to Verify Booking tab.' : undefined} onClick={handleProcessAction} className="rounded-2xl font-pmedium text-[10px] uppercase tracking-wider flex-1 py-3 bg-green-600 text-white shadow-md shadow-green-200 disabled:bg-gray-300 disabled:shadow-none hover:bg-green-700 transition-all flex items-center justify-center gap-1.5">
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
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-emerald-600">Booking Confirmed</p>
                    <h3 className="mt-0.5 text-lg font-pmedium text-emerald-950">Walk-in booking saved</h3>
                    <p className="mt-0.5 text-[12px] font-pmedium text-emerald-900/70">A confirmation email with this booking ID has been sent to the visitor.</p>
                  </div>
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
                <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 p-4 text-center">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-emerald-600">Booking ID</p>
                  <p className="mt-1 text-3xl font-pmedium tracking-[0.15em] text-emerald-700">{bookingConfirmation.bookingId}</p>
                  <p className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Saved and ready to verify at the front desk</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Room</p>
                    <p className="mt-1 text-[13px] font-pmedium text-slate-900">{bookingConfirmation.roomName}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Total</p>
                    <p className="mt-1 text-[13px] font-pmedium text-slate-900">{formatCurrency(bookingConfirmation.totalAmount || 0)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Payment Mode</p>
                    <p className="mt-1 text-[13px] font-pmedium text-slate-900">{bookingConfirmation.paymentMode || 'Cash'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Transaction</p>
                    <p className="mt-1 text-[13px] font-pmedium text-slate-900">{bookingConfirmation.transactionId || 'Not required'}</p>
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
                  className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-[10px] font-pmedium uppercase tracking-wider text-white shadow-sm shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck size={13} /> Go To Verify Booking
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
                  <h2 className="text-xl font-pmedium flex items-center gap-2"><Clock size={20} /> Extend Booking</h2>
                  <p className="text-[10px] font-pmedium text-indigo-200 uppercase tracking-widest mt-1">{extendingBooking.resource} • {extendingBooking.bookedBy}</p>
                </div>
                <button onClick={() => { setIsExtendModalOpen(false); setExtendAvailability('idle'); }} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-red-500 transition-all"><X size={16} /></button>
              </div>

              <form onSubmit={handleExtendBooking} className="p-6 md:p-8 overflow-y-auto flex-1 bg-white space-y-6">

                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-pmedium text-indigo-400 uppercase tracking-widest mb-0.5">Current End Time</p>
                    <p className="text-lg font-black text-indigo-900">{extendingBooking.time.split(' - ')[1].replace(' (Extended)', '')}</p>
                  </div>
                  <ArrowRight size={20} className="text-indigo-300" />
                  <div className="text-right">
                    <p className="text-[10px] font-pmedium text-gray-500 uppercase tracking-widest mb-0.5">New End Time *</p>
                    <input required type="time" step={WALK_IN_SLOT_STEP * 60} min={(() => {
                      const startTime = extendingBooking?.raw?.startTime || extendingBooking?.startTime || '';
                      const startMinutes = timeToMinutes(startTime);
                      return startMinutes == null ? undefined : minutesToTime(startMinutes + WALK_IN_MIN_DURATION_MINUTES);
                    })()} className="w-28 px-3 py-2 bg-white border border-gray-200 rounded-lg font-bold text-gray-900 focus:border-indigo-500 outline-none cursor-pointer" value={extendForm.newEndTime} onChange={e => { setExtendForm({ ...extendForm, newEndTime: e.target.value }); setExtendAvailability('idle'); }} />
                  </div>
                </div>

                {extendAvailability === 'idle' && extendForm.newEndTime && (
                  <button type="button" onClick={handleCheckExtendAvailability} className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-pmedium text-xs hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
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
                      <p className="text-[10px] font-pmedium text-red-600 mt-1">Another booking conflicts with this extension window (including the 5-minute cleanup buffer).</p>
                    </div>
                  </div>
                )}

                {extendAvailability === 'available' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 space-y-3.5">
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                      <p className="text-[10px] font-pmedium text-gray-500 uppercase tracking-widest mb-3">Extra Charges Calculation</p>
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
                      <p className="text-[10px] font-pmedium text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><CreditCard size={12} /> Collect Payment</p>
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
                  <button type="button" onClick={() => { setIsExtendModalOpen(false); setExtendAvailability('idle'); }} className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-pmedium hover:bg-gray-200 transition-all text-xs">CANCEL</button>
                  <button type="submit" disabled={extendAvailability !== 'available'} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-pmedium shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
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
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl animate-in zoom-in duration-200 overflow-hidden flex flex-col">
              <div className="p-5 sm:p-6 bg-red-50/70 border-b border-red-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 text-red-600 rounded-xl"><XCircle size={24} /></div>
                  <div>
                    <h2 className="text-lg font-pmedium text-red-900 leading-none">Cancel Booking</h2>
                    <p className="text-[10px] font-pmedium text-red-500 uppercase tracking-widest mt-1">{cancellingBooking.id}</p>
                  </div>
                </div>
                <button onClick={() => setCancellingBooking(null)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm hover:text-red-500 transition-all"><X size={16} /></button>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex gap-3 items-start">
                  <ShieldAlert className="text-gray-500 shrink-0 mt-0.5" size={20} />
                  <div className="text-xs text-gray-600 font-medium leading-relaxed">
                    Cancelling <span className="font-bold text-gray-900">{cancellingBooking.resource}</span> for <span className="font-bold text-gray-900">{cancellingBooking.bookedBy}</span>. System will free up the slot on the calendar immediately.
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-gray-500 uppercase tracking-widest">Reason for Cancellation *</label>
                  <textarea
                    className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl font-pmedium text-gray-900 focus:border-red-400 outline-none resize-none"
                    rows={3} placeholder="Provide a reason..."
                    value={cancelForm.reason} onChange={e => setCancelForm({ ...cancelForm, reason: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-gray-500 uppercase tracking-widest">Refund Action</label>
                  <select
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-pmedium text-gray-900 focus:border-red-400 outline-none cursor-pointer"
                    value={cancelForm.refundType} onChange={e => setCancelForm({ ...cancelForm, refundType: e.target.value })}
                  >
                    <option value="Full Refund">Full Refund (100% Credits/Money back)</option>
                    <option value="Partial Refund">Partial Refund (50% Penalty)</option>
                    <option value="No refund">No Refund (Late Cancellation)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex gap-3">
                <button onClick={() => setCancellingBooking(null)} className="rounded-xl font-pmedium text-[10px] uppercase tracking-wider flex-1 py-3 bg-white border border-gray-200 text-gray-500 hover:text-gray-900 transition-all">ABORT</button>
                <button disabled={!cancelForm.reason || isReadOnlySession} title={isReadOnlySession ? 'Read-only staff view - changes are disabled' : undefined} onClick={handleCancelUpcoming} className="rounded-xl font-pmedium text-[10px] uppercase tracking-wider flex-1 py-3 bg-red-600 text-white shadow-md shadow-red-100 disabled:bg-gray-300 disabled:shadow-none hover:bg-red-700 transition-all">CONFIRM CANCELLATION</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: RESCHEDULE BOOKING */}
        {reschedulingBooking && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0F172A]/90 backdrop-blur-md">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl animate-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[88vh]">
              <div className="p-5 sm:p-6 bg-amber-50/70 border-b border-amber-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><CalendarDays size={24} /></div>
                  <div>
                    <h2 className="text-lg font-pmedium text-amber-900 leading-none">Reschedule Booking</h2>
                    <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mt-1">{reschedulingBooking.resource}</p>
                  </div>
                </div>
                <button onClick={() => { setReschedulingBooking(null); setRescheduleForm({ newDate: '', newStartTime: '', newEndTime: '' }) }} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm hover:text-red-500 transition-all"><X size={16} /></button>
              </div>

              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest mb-1">Current Booked Slot</p>
                    <p className="font-bold text-gray-900">{reschedulingBooking.date} • {reschedulingBooking.time}</p>
                  </div>
                  <div className="flex-1 border-l-2 border-gray-200 pl-4">
                    <p className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest mb-1">Resource</p>
                    <p className="font-bold text-blue-600">{reschedulingBooking.resource}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-pmedium text-gray-500 uppercase tracking-widest">Select New Date *</label>
                    <input
                      type="date"
                      className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl font-pmedium text-gray-900 focus:border-amber-400 outline-none transition-all shadow-sm cursor-pointer"
                      value={rescheduleForm.newDate} onChange={e => setRescheduleForm({ ...rescheduleForm, newDate: e.target.value, newStartTime: '', newEndTime: '' })}
                    />
                  </div>

                  {rescheduleForm.newDate ? (() => {
                    const rescheduleDateKey = formatDateKey(rescheduleForm.newDate);
                    const todayKey = formatDateKey(new Date());
                    const now = new Date();
                    const nowRounded = Math.ceil((now.getHours() * 60 + now.getMinutes()) / WALK_IN_SLOT_STEP) * WALK_IN_SLOT_STEP;
                    // For today the day effectively starts "now" — past slots are never offered.
                    const dayStartMinutes = rescheduleDateKey === todayKey ? Math.max(businessHours.startMinutes, nowRounded) : businessHours.startMinutes;
                    const originalStartMinutes = timeToMinutes(reschedulingBooking?.raw?.startTime || '');
                    const originalEndMinutes = timeToMinutes(reschedulingBooking?.raw?.endTime || '');
                    const originalDuration = originalStartMinutes != null && originalEndMinutes != null && originalEndMinutes > originalStartMinutes
                      ? originalEndMinutes - originalStartMinutes
                      : 60;
                    const selectedStartMinutes = timeToMinutes(rescheduleForm.newStartTime);
                    const selectedEndMinutes = timeToMinutes(rescheduleForm.newEndTime);
                    // Chart windows follow the picked start/end duration; before any pick, the original booking's duration.
                    const chartDuration = selectedStartMinutes != null && selectedEndMinutes != null && selectedEndMinutes > selectedStartMinutes
                      ? selectedEndMinutes - selectedStartMinutes
                      : originalDuration;
                    const startOptions = buildTimeOptions(minutesToTime(dayStartMinutes), minutesToTime(businessHours.endMinutes - WALK_IN_MIN_DURATION_MINUTES), WALK_IN_SLOT_STEP);
                    const endOptions = buildTimeOptions(
                      minutesToTime((selectedStartMinutes != null ? selectedStartMinutes : dayStartMinutes) + WALK_IN_MIN_DURATION_MINUTES),
                      minutesToTime(businessHours.endMinutes),
                      WALK_IN_SLOT_STEP,
                    );
                    const currentBookingId = String(reschedulingBooking?.recordId || reschedulingBooking?.id || '').trim();
                    const isSlotBooked = (slotStartMinutes, slotEndMinutes) => meetingRoomBookings.some((booking) => {
                      const bookingId = String(booking.recordId || booking.id || booking.bookingCode || '').trim();
                      if (bookingId && bookingId === currentBookingId) return false;
                      return getOverlapConflict(
                        booking,
                        reschedulingBooking?.resource || '',
                        rescheduleDateKey,
                        rescheduleDateKey,
                        slotStartMinutes,
                        slotEndMinutes,
                      );
                    });
                    const chartSlots = [];
                    for (let minutes = dayStartMinutes; minutes + chartDuration <= businessHours.endMinutes; minutes += chartDuration) {
                      chartSlots.push({ startMinutes: minutes, endMinutes: minutes + chartDuration, start: minutesToTime(minutes), end: minutesToTime(minutes + chartDuration) });
                    }
                    return (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-pmedium text-gray-500 uppercase tracking-widest">New Start Time *</label>
                          <select
                            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-pmedium text-[12px] text-gray-900 focus:border-amber-400 outline-none transition-all shadow-sm cursor-pointer"
                            value={rescheduleForm.newStartTime}
                            onChange={(e) => {
                              const nextStart = e.target.value;
                              const nextStartMinutes = timeToMinutes(nextStart);
                              // Keep the current duration when moving the start time.
                              const nextEnd = nextStartMinutes != null
                                ? minutesToTime(Math.min(businessHours.endMinutes, nextStartMinutes + chartDuration))
                                : '';
                              setRescheduleForm({ ...rescheduleForm, newStartTime: nextStart, newEndTime: nextEnd });
                            }}
                          >
                            <option value="">Select start</option>
                            {startOptions.map((time) => <option key={time} value={time}>{formatTimeLabel(time)}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-pmedium text-gray-500 uppercase tracking-widest">New End Time *</label>
                          <select
                            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-pmedium text-[12px] text-gray-900 focus:border-amber-400 outline-none transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-100"
                            value={rescheduleForm.newEndTime}
                            disabled={!rescheduleForm.newStartTime}
                            onChange={(e) => setRescheduleForm({ ...rescheduleForm, newEndTime: e.target.value })}
                          >
                            <option value="">Select end</option>
                            {endOptions.map((time) => <option key={time} value={time}>{formatTimeLabel(time)}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-pmedium text-gray-500 uppercase tracking-widest">Available {Math.round(chartDuration / 60 * 100) / 100} hr Slots</label>
                        <span className="text-[10px] font-pmedium text-green-600 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded"><Check size={10} /> Live Master Calendar Sync</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[170px] overflow-y-auto pr-2">
                        {chartSlots.map((slot) => {
                          const booked = isSlotBooked(slot.startMinutes, slot.endMinutes);
                          const selected = rescheduleForm.newStartTime === slot.start && rescheduleForm.newEndTime === slot.end;
                          const displayLabel = `${formatTimeLabel(slot.start)} - ${formatTimeLabel(slot.end)}`;
                          return (
                            <button
                              key={slot.start} disabled={booked} onClick={() => setRescheduleForm({ ...rescheduleForm, newStartTime: slot.start, newEndTime: slot.end })}
                              className={`relative p-3 rounded-xl border-2 text-xs font-pmedium transition-all text-center overflow-hidden
                               ${booked ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60' :
                                  selected ? 'bg-amber-500 border-amber-500 text-white shadow-md' :
                                    'bg-white border-green-200 text-green-700 hover:bg-green-50'}`}
                            >
                              <span className={booked ? 'line-through decoration-red-400 decoration-2' : ''}>{displayLabel}</span>
                              {booked && <span className={statusPillClass("Booked by another")}>Booked by another</span>}
                            </button>
                          );
                        })}
                        {chartSlots.length === 0 && (
                          <div className="col-span-full p-6 text-center text-gray-400 font-pmedium text-xs">No slots left within business hours for this date.</div>
                        )}
                      </div>
                    </div>
                    );
                  })() : (
                    <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center text-gray-400 font-bold text-sm bg-gray-50/50">
                      Please select a date above to view live slot availability.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
                <button onClick={() => { setReschedulingBooking(null); setRescheduleForm({ newDate: '', newStartTime: '', newEndTime: '' }) }} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-pmedium text-[10px] uppercase text-gray-500 hover:text-gray-900 transition-all shadow-sm">CANCEL</button>
                <button disabled={!rescheduleForm.newDate || !rescheduleForm.newStartTime || !rescheduleForm.newEndTime} onClick={handleRescheduleUpcoming} className="flex-1 py-3 bg-amber-500 text-white rounded-xl text-[10px] uppercase font-pmedium shadow-md shadow-amber-100 disabled:bg-gray-300 disabled:shadow-none hover:bg-amber-600 transition-all flex items-center justify-center gap-2">
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
                    <span className={statusPillClass(viewingVisitor.status)}>{viewingVisitor.status}</span>
                    {viewingVisitor.convertedToClient && (
                      <span className={statusPillClass("Converted to Client")}>Converted to Client</span>
                    )}
                  </h2>
                  <p className="text-[9px] font-pmedium text-gray-500 uppercase tracking-widest mt-1.5">{viewingVisitor.company} • Badge: {viewingVisitor.badgeNo || 'N/A'}</p>
                </div>
                <button onClick={() => setViewingVisitor(null)} className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm hover:text-red-500 transition-all"><X size={18} /></button>
              </div>

              <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 bg-white">

                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-pmedium tracking-wider">First Name</p>
                    <p className="font-pmedium text-gray-900 text-xs">{viewingVisitor.firstName || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-pmedium tracking-wider">Last Name</p>
                    <p className="font-pmedium text-gray-900 text-xs">{viewingVisitor.lastName || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-pmedium tracking-wider">Gender</p>
                    <p className="font-pmedium text-gray-900 text-xs">{viewingVisitor.gender || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-pmedium tracking-wider flex items-center gap-1"><Phone size={12} /> Phone Contact</p>
                    <p className="font-pmedium text-gray-900 text-xs">{viewingVisitor.phone || 'Not Provided'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-pmedium tracking-wider">Country</p>
                    <p className="font-pmedium text-gray-900 text-xs">{viewingVisitor.country || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-pmedium tracking-wider">State</p>
                    <p className="font-pmedium text-gray-900 text-xs">{viewingVisitor.state || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-pmedium tracking-wider">City</p>
                    <p className="font-pmedium text-gray-900 text-xs">{viewingVisitor.city || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-pmedium tracking-wider flex items-center gap-1"><User size={12} /> Host / Point of Contact</p>
                    <p className="font-pmedium text-gray-900 text-xs">{viewingVisitor.host}</p>
                    {viewingVisitor.department && <p className="text-[10px] text-gray-500 font-pmedium uppercase">{viewingVisitor.department}</p>}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-pmedium tracking-wider flex items-center gap-1"><BadgeCheck size={12} /> Visit Purpose</p>
                    <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 font-pmedium text-xs rounded">{viewingVisitor.purpose}</span>
                  </div>
                  {viewingVisitor.bookingId && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 uppercase font-pmedium tracking-wider flex items-center gap-1"><FileText size={12} /> Online Booking ID</p>
                      <p className="font-pmedium text-blue-600 text-xs">{viewingVisitor.bookingId}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Visit Date</p>
                    <p className="mt-1.5 text-xs font-pmedium text-gray-900">{viewingVisitor.date || formatDisplayDate(viewingVisitor.createdAt)}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Visitor Code</p>
                    <p className="mt-1.5 text-xs font-pmedium text-gray-900">{viewingVisitor.visitorCode || 'N/A'}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Source</p>
                    <p className="mt-1.5 text-xs font-pmedium text-gray-900">{viewingVisitor.source || 'Frontdesk'}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Department</p>
                    <p className="mt-1.5 text-xs font-pmedium text-gray-900">{viewingVisitor.department || 'General'}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Visitor Type</p>
                    <p className="mt-1.5 text-xs font-pmedium text-gray-900">{toTitleCase(viewingVisitor.visitorType || 'standard')}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Company Type</p>
                    <p className="mt-1.5 text-xs font-pmedium text-gray-900">{toTitleCase(viewingVisitor.visitorCompanyType || 'individual')}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Visitor Company</p>
                  <p className="mt-1.5 text-xs font-pmedium text-gray-900">
                    {normalizeText(viewingVisitor.visitorType) === 'tenant'
                      ? (viewingVisitor.tenantCompanyName || 'N/A')
                      : 'Not Applicable'}
                  </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-center">
                  <div className={`flex-1 p-3 border rounded-xl ${viewingVisitor.status === 'Cancelled' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                    <p className={`text-[10px] font-['Poppins'] font-extrabold uppercase tracking-widest mb-1 ${viewingVisitor.status === 'Cancelled' ? 'text-red-600' : 'text-green-600'}`}>Time In</p>
                    <p className={`text-base font-pmedium ${viewingVisitor.status === 'Cancelled' ? 'text-red-700 line-through' : 'text-green-700'}`}>{viewingVisitor.checkIn || formatTimeLabel(viewingVisitor.checkInAt) || '--:--'}</p>
                  </div>
                  <div className="text-gray-300"><ArrowRight size={24} strokeWidth={3} /></div>
                  <div className={`flex-1 p-3 border rounded-xl ${(viewingVisitor.checkOut || '--:--') === '--:--' ? 'border-red-200 bg-red-50' : 'border-red-300 bg-red-100'}`}>
                    <p className="text-[10px] font-pmedium text-red-500 uppercase tracking-widest mb-1">Time Out</p>
                    <p className="text-base font-pmedium text-red-700">{viewingVisitor.checkOut || formatTimeLabel(viewingVisitor.checkOutAt) || '--:--'}</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-gray-400">Reason to Meet Host</p>
                  <p className="mt-1.5 text-xs font-pmedium text-gray-700 leading-relaxed">{viewingVisitor.reason || viewingVisitor.notes || 'No reason added.'}</p>
                </div>

                {String(viewingVisitor.approvalStatus || viewingVisitor.status || '').toLowerCase() === 'rejected' && (
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-red-500">Rejection Reason</p>
                    <p className="mt-1.5 text-xs font-pmedium text-red-700 leading-relaxed">
                      {viewingVisitor.rejectionReason || 'No rejection reason provided.'}
                    </p>
                  </div>
                )}

              </div>

              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-2.5 shrink-0">
                <button onClick={() => setViewingVisitor(null)} className="rounded-2xl font-pmedium text-[10px] uppercase tracking-wider flex-1 py-2.5 bg-grey-600 text-black shadow-lg shadow-grey-200 hover:bg-grey-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none">CLOSE</button>
                {!isVisitorCheckedOut(viewingVisitor) && (
                  <button onClick={() => handlePrintBadge(viewingVisitor)} className="rounded-2xl font-pmedium text-[10px] uppercase tracking-wider flex-1 py-2.5 bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none">
                    <Printer size={15} /> PRINT BADGE
                  </button>
                )}
                {viewingVisitor.status === 'Checked In' && (
                  <button disabled={isReadOnlySession} title={isReadOnlySession ? 'Read-only staff view - changes are disabled' : undefined} onClick={() => setConfirmingCheckout(viewingVisitor)} className="rounded-2xl font-pmedium text-[10px] uppercase tracking-wider flex-1 py-2.5 bg-red-600 text-white shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none">
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
            <div className="bg-white rounded-[24px] w-full max-w-[760px] shadow-2xl animate-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[82vh]">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-start shrink-0">
                <div>
                  <h2 className="text-lg font-pmedium text-gray-900 leading-none flex flex-wrap items-center gap-2">
                    {viewingBooking.resource}
                    <span className={statusPillClass(viewingBooking.status)}>{viewingBooking.status}</span>
                  </h2>
                  <p className="text-[10px] font-pmedium text-gray-500 uppercase tracking-widest mt-2">
                    {viewingBooking.company}
                  </p>
                </div>
                <button onClick={() => setViewingBooking(null)} className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm hover:text-red-500 transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5 space-y-1.5">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-gray-400">Booked By</p>
                    <p className="text-sm font-pmedium text-gray-900">{viewingBooking.bookedBy}</p>
                    <p className="text-xs font-pmedium text-gray-500">{viewingBooking.company}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5 space-y-1.5">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-gray-400">Schedule</p>
                    <p className="text-sm font-pmedium text-gray-900">{viewingBooking.dateLabel || formatDisplayDate(viewingBooking.date)}</p>
                    <p className="text-xs font-pmedium text-gray-500">{viewingBooking.time}</p>
                    {viewingBooking.isExtended && (
                      <div className="pt-2 space-y-1">
                        <p className="text-[10px] font-pmedium uppercase tracking-widest text-gray-400">Original Slot</p>
                        <p className="text-xs font-bold text-gray-400 line-through decoration-gray-300">{viewingBooking.originalDateLabel || viewingBooking.dateLabel || formatDisplayDate(viewingBooking.date)} â€¢ {viewingBooking.originalTime || viewingBooking.time}</p>
                        <p className="text-[10px] font-pmedium uppercase tracking-widest text-purple-600 mt-2">Extended Slot</p>
                        <p className="text-xs font-bold text-purple-700">{viewingBooking.dateLabel || formatDisplayDate(viewingBooking.date)} â€¢ {viewingBooking.time}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <p className="text-[9px] font-pmedium text-gray-400 uppercase tracking-widest">Payment Status</p>
                    <p className={`mt-2 text-sm font-pmedium ${normalizeText(viewingBooking.paymentStatus).includes('pending') || normalizeText(viewingBooking.paymentStatus).includes('unpaid') ? 'text-amber-600' : 'text-emerald-600'}`}>{viewingBooking.paymentStatus || 'Pending Payment'}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4 md:col-span-1">
                    <p className="text-[9px] font-pmedium text-gray-400 uppercase tracking-widest">Amount Breakdown</p>
                    <div className="mt-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-pmedium text-gray-500">Base Amount</span>
                        <span className="text-sm font-pmedium text-gray-900">{formatCurrency(viewingBooking.subtotalBeforeDiscount || viewingBooking.baseAmount || 0)}</span>
                      </div>
                      {Number(viewingBooking.discountAmount || 0) > 0 && (
                        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2">
                          <span className="text-xs font-pmedium text-emerald-600">
                            Discount{viewingBooking.discountType === 'percent' ? ` (${Number(viewingBooking.discountValue || 0)}%)` : ''}
                          </span>
                          <span className="text-sm font-pmedium text-emerald-700">- {formatCurrency(viewingBooking.discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-pmedium text-gray-500">GST (18%)</span>
                        <span className="text-sm font-pmedium text-gray-900">{formatCurrency(viewingBooking.gstAmount || 0)}</span>
                      </div>
                      {Number(viewingBooking.extensionAmount || 0) > 0 && (
                        <div className="flex items-center justify-between rounded-xl bg-purple-50 px-3 py-2">
                          <span className="text-xs font-pmedium text-purple-600">Extension Charges</span>
                          <span className="text-sm font-pmedium text-purple-700">{formatCurrency(viewingBooking.extensionAmount)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-gray-200 pt-2.5">
                        <span className="text-sm font-pmedium text-gray-900">Total Paid</span>
                        <span className="text-base font-pmedium text-blue-700">{formatCurrency(viewingBooking.totalAmount || viewingBooking.amountDue || 0)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <p className="text-[9px] font-pmedium text-gray-400 uppercase tracking-widest">Payment Mode</p>
                    <p className="mt-2 text-sm font-pmedium text-gray-900">{viewingBooking.paymentMode || 'Not set'}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <p className="text-[9px] font-pmedium text-gray-400 uppercase tracking-widest">Attendees</p>
                    <p className="mt-2 text-sm font-pmedium text-gray-900">{viewingBooking.attendees || 0}</p>
                  </div>
                </div>

                {(viewingBooking.paymentProofUrl || viewingBooking.transactionId) && (
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-gray-400 mb-3">Payment Proof</p>
                    <div className="flex flex-wrap items-start gap-4">
                      {viewingBooking.transactionId && (
                        <div>
                          <p className="text-[10px] font-pmedium uppercase tracking-widest text-gray-500">Transaction / UTR</p>
                          <p className="mt-1 text-sm font-pmedium text-gray-900 break-all">{viewingBooking.transactionId}</p>
                        </div>
                      )}
                      {viewingBooking.paymentProofUrl && (
                        <div>
                          <p className="text-[10px] font-pmedium uppercase tracking-widest text-gray-500 mb-1.5">Payment Screenshot</p>
                          <a href={viewingBooking.paymentProofUrl} target="_blank" rel="noopener noreferrer" title="Open full screenshot in a new tab" className="block">
                            <img
                              src={viewingBooking.paymentProofUrl}
                              alt="Payment screenshot"
                              className="h-28 w-auto max-w-[220px] rounded-xl border border-gray-200 object-cover shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
                            />
                          </a>
                          <a href={viewingBooking.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-pmedium uppercase tracking-wider text-[#2563EB] hover:underline">
                            <Eye size={11} /> View full size
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-gray-400 mb-3">Contact & Source</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] font-pmedium uppercase tracking-widest text-gray-500">Phone</p>
                      <p className="mt-1 font-pmedium text-gray-900">{viewingBooking.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-pmedium uppercase tracking-widest text-gray-500">Email</p>
                      <p className="mt-1 font-pmedium text-gray-900 break-all">{viewingBooking.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-pmedium uppercase tracking-widest text-gray-500">Finance Status</p>
                      <p className="mt-1 font-pmedium text-gray-900">{viewingBooking.financeStatus || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-pmedium uppercase tracking-widest text-gray-500">Source Reference</p>
                      <p className="mt-1 font-pmedium text-gray-900 break-all">{viewingBooking.sourceReference || 'Frontdesk'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-pmedium uppercase tracking-widest text-gray-500">Booking Type</p>
                      <p className="mt-1 font-pmedium text-gray-900">{viewingBooking.bookingType || 'External'}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-gray-500">Notes</p>
                    <p className="mt-1 text-sm font-medium text-gray-700 leading-relaxed">{viewingBooking.notes || 'No booking notes added.'}</p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-2.5 shrink-0">
                <button onClick={() => setViewingBooking(null)} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-[10px] uppercase font-pmedium text-gray-600 hover:bg-gray-100 transition-all">
                  CLOSE
                </button>
                {viewingBooking.status === 'In Progress' ? (
                  <>
                    <button onClick={() => { setExtendingBooking(viewingBooking); setExtendAvailability('idle'); setExtendForm({ newEndTime: '', paymentMode: 'Cash' }); setIsExtendModalOpen(true); }} className="flex-1 py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-[10px] uppercase font-pmedium hover:bg-indigo-100 transition-all flex items-center justify-center gap-2">
                      <Clock size={18} /> EXTEND SLOT
                    </button>
                  </>
                ) : viewingBooking.status !== 'Completed' && viewingBooking.status !== 'Cancelled' && (
                  <>
                    <button onClick={() => { setReschedulingBooking(viewingBooking); setRescheduleForm({ newDate: '', newStartTime: '', newEndTime: '' }); setViewingBooking(null); }} className="flex-1 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[10px] uppercase font-pmedium hover:bg-amber-100 transition-all flex items-center justify-center gap-2">
                      <CalendarIcon size={18} /> RESCHEDULE
                    </button>
                    <button onClick={() => { setCancellingBooking(viewingBooking); setViewingBooking(null); }} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] uppercase font-pmedium shadow-md shadow-red-100 hover:bg-red-700 transition-all flex items-center justify-center gap-2">
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
            <div className="flex max-h-[82vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl animate-in zoom-in duration-200">
              <div className="flex shrink-0 items-start justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-pmedium leading-none text-slate-950">{viewingClient.name || viewingClient.company || 'Client'}</h2>
                    {viewingClient.company && (
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-pmedium text-slate-600">
                        {viewingClient.company}
                      </span>
                    )}
                    {normalizeText(viewingClient.source) === 'visitor-conversion' && (
                      <span className={statusPillClass("Converted Visitor")}>
                        Converted Visitor
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">{viewingClient.phone || viewingClient.email || 'No contact'} • {viewingClient.bookingCount || 0} bookings</p>
                </div>
                <button onClick={() => setViewingClient(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition-all hover:text-red-500">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Phone</p>
                    <p className="mt-2 text-sm font-pmedium text-slate-900">{viewingClient.phone || 'Not provided'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 md:col-span-2">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Email</p>
                    <p className="mt-2 break-all text-sm font-pmedium text-slate-900">{viewingClient.email || 'Not provided'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Bookings</p>
                    <p className="mt-2 text-xl font-pmedium text-slate-900">{viewingClient.bookingCount || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Total Value</p>
                    <p className="mt-2 text-xl font-pmedium text-slate-900">{formatCurrency(viewingClient.totalBookedAmount || 0)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Source</p>
                    <p className="mt-2 text-sm font-pmedium text-slate-900">
                      {normalizeText(viewingClient.source) === 'visitor-conversion' ? 'Visitor Conversion' : 'Walk-in Booking'}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white">
                  <div className="border-b border-slate-100 p-4">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Booking History</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-left border-collapse">
                      <thead className="bg-slate-50 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">
                        <tr><th className="px-4 py-3">Room</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(viewingClient.bookings || []).map((booking) => (
                          <tr key={`history-${booking.recordId || booking.id}`} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3"><p className="text-xs font-pmedium text-slate-950">{booking.resource}</p><p className="mt-0.5 text-[10px] font-pmedium text-slate-400">{booking.sourceReference || 'Frontdesk booking'}</p></td>
                            <td className="px-4 py-3 whitespace-nowrap"><p className="text-xs font-pmedium text-slate-800">{booking.dateLabel || booking.date}</p><p className="mt-0.5 text-[10px] font-pmedium text-slate-500">{booking.time}</p></td>
                            <td className="px-4 py-3 text-xs font-pmedium text-slate-900">{formatCurrency(booking.totalAmount || booking.amountDue || 0)}</td>
                            <td className="px-4 py-3"><span className={statusPillClass(booking.status)}>{booking.status}</span></td>
                            <td className="px-4 py-3"><button type="button" title="View booking" onClick={() => { setViewingBooking(booking); setViewingClient(null); }} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"><Eye size={14} strokeWidth={2.5} /></button></td>
                          </tr>
                        ))}
                        {(!viewingClient.bookings || viewingClient.bookings.length === 0) && <tr><td colSpan={5} className="p-8 text-center text-xs font-pmedium text-slate-400">No booking records found for this client yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <div className="hidden">
                    {(viewingClient.bookings || []).map((booking) => (
                      <div key={booking.recordId || booking.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-slate-950">{booking.resource}</p>
                            <span className={statusPillClass(booking.status)}>{booking.status}</span>
                          </div>
                          <p className="mt-1 text-xs font-bold text-slate-500">{booking.dateLabel || booking.date} • {booking.time}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">{booking.sourceReference || booking.notes || 'Frontdesk booking'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-900">{formatCurrency(booking.totalAmount || booking.amountDue || 0)}</p>
                            {Number(booking.discountAmount || 0) > 0 && (
                              <p className="text-[10px] font-pmedium uppercase tracking-widest text-emerald-700">
                                Disc. {formatCurrency(booking.discountAmount)}{booking.discountType === 'percent' ? ` (${Number(booking.discountValue || 0)}%)` : ''}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => { setViewingBooking(booking); setViewingClient(null); }}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
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

              <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-5 py-3">
                <button onClick={() => setViewingClient(null)} className="w-full rounded-xl border border-slate-200 bg-white py-3 text-[10px] uppercase font-pmedium text-slate-600 transition-all hover:bg-slate-100">
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5C: CONFIRM CHECK-OUT */}
        {confirmingCheckout && (
          <div className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-[#0F172A]/90 backdrop-blur-md">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl animate-in zoom-in duration-200 overflow-hidden flex flex-col">
              <div className="p-5 sm:p-6 bg-red-50/70 border-b border-red-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 text-red-600 rounded-xl"><LogOut size={24} /></div>
                  <div>
                    <h2 className="text-lg font-pmedium text-red-900 leading-none">Check-Out Visitor</h2>
                    <p className="text-[10px] font-pmedium text-red-500 uppercase tracking-widest mt-1">Confirm Action</p>
                  </div>
                </div>
                <button onClick={() => setConfirmingCheckout(null)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm hover:text-red-500 transition-all"><X size={16} /></button>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex gap-3 items-start">
                  <ShieldAlert className="text-gray-500 shrink-0 mt-0.5" size={20} />
                  <div className="text-xs text-gray-600 font-medium leading-relaxed">
                    Are you sure you want to check out <span className="font-bold text-gray-900">{confirmingCheckout.name || confirmingCheckout.fullName || 'this visitor'}</span>? This will mark their visit as completed and record the check-out time.
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex gap-3">
                <button onClick={() => setConfirmingCheckout(null)} className="rounded-2xl font-pmedium text-[10px] uppercase tracking-wider flex-1 py-3 bg-white border border-gray-200 text-gray-500 hover:text-gray-900 transition-all">CANCEL</button>
                <button disabled={isReadOnlySession} title={isReadOnlySession ? 'Read-only staff view - changes are disabled' : undefined} onClick={() => { const v = confirmingCheckout; setConfirmingCheckout(null); handleCheckOut(v.id); }} className="rounded-2xl font-pmedium text-[10px] uppercase tracking-wider flex-1 py-3 bg-red-600 text-white shadow-md shadow-red-100 disabled:bg-gray-300 disabled:shadow-none hover:bg-red-700 transition-all">CONFIRM CHECK-OUT</button>
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

              <h2 className="text-xl font-pmedium text-gray-900 z-10">Check-In Successful</h2>
              <p className="text-[10px] font-pmedium text-gray-500 uppercase tracking-widest mt-2 mb-5">Virtual Visitor Badge Generated</p>

              <div className="w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-4 relative">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-14 h-5 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center"><div className="w-7 h-1.5 bg-gray-200 rounded-full"></div></div>

                <p className="text-[9px] font-pmedium text-blue-600 uppercase tracking-widest mb-3">VISITOR PASS</p>
                <h3 className="text-xl font-pmedium text-gray-900 mb-1 leading-tight">{showBadge.name || showBadge.fullName || '—'}</h3>
                <p className="text-[11px] font-pmedium text-gray-500 mb-4">{showBadge.company || 'Individual'}</p>

                <div className="grid grid-cols-2 gap-3 text-left border-t border-gray-200 pt-3">
                  <div><p className="text-[8px] font-pmedium text-gray-400 uppercase tracking-widest">Badge No</p><p className="font-pmedium text-xs text-gray-700">{showBadge.badgeNo || '—'}</p></div>
                  <div><p className="text-[8px] font-pmedium text-gray-400 uppercase tracking-widest">Purpose</p><p className="font-pmedium text-xs text-gray-700">{showBadge.purpose || '—'}</p></div>
                  <div><p className="text-[8px] font-pmedium text-gray-400 uppercase tracking-widest">Check-In</p><p className="font-pmedium text-xs text-gray-700">{showBadge.checkIn || formatTimeLabel(new Date())}</p></div>
                  <div><p className="text-[8px] font-pmedium text-gray-400 uppercase tracking-widest">Phone</p><p className="font-pmedium text-xs text-gray-700">{showBadge.phone || '—'}</p></div>
                  <div className="col-span-2"><p className="text-[8px] font-pmedium text-gray-400 uppercase tracking-widest">Host / Destination</p><p className="font-pmedium text-xs text-gray-700">{showBadge.host || showBadge.hostName || 'Front Desk'}</p></div>
                </div>
              </div>

              <p className="text-[10px] font-pmedium text-green-600 mt-4 max-w-[240px] leading-relaxed">{showBadge.notes || "Host has been notified via email and SMS."}</p>

              <div className="w-full mt-5 grid grid-cols-2 gap-2">
                <button onClick={() => handlePrintBadge()} className="w-full py-3 bg-blue-600 text-white rounded-2xl text-xs font-pmedium shadow-lg hover:bg-blue-700 transition-all">
                  PRINT BADGE
                </button>
                <button onClick={() => setShowBadge(null)} className="w-full py-3 border border-gray-300 text-gray-700 rounded-2xl text-xs font-pmedium hover:bg-gray-50 transition-all">
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
