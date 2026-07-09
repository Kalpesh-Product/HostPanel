import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar as CalendarIcon,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  FileSpreadsheet,
  FileDown,
  LayoutGrid,
  Monitor,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  User,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import PageFrame from '@/components/Pages/PageFrame';
import { canAccessAdministrationDashboard, getStoredUser } from '@/lib/auth-session';
import { BookingsSkeleton } from '@/components/ui/Skeleton';
import { formatTime12h } from '@/utils/time';
// Backend services - uncomment when backend is ready:
// import { getMeetingRoomBookings, updateMeetingRoomBooking } from '@/services/meeting-room-bookings';
// import { getTenantCompanies } from '@/services/tenant-companies';
// import { createReport } from '@/services/reports';
// import { downloadReportFile } from '@/utils/report-download';

// ── Constants ────────────────────────────────────────────────────────────────

const scopeTabs = [
  { key: 'internal', label: 'Internal Department Bookings' },
  { key: 'external', label: 'External Bookings' },
  { key: 'tenant', label: 'Tenant Companies' },
  { key: 'history', label: 'Booking History' },
] as const;

const resourceOptions = ['All Resources', 'Desk', 'Meeting Room', 'Conference Room', 'Cabin', 'Boardroom'];
const bookingTypeOptions = ['All Types', 'Internal', 'Tenant', 'External'];
const bookingStatusOptions = ['All', 'Booked', 'Pending', 'Completed', 'Reschedules', 'Cancelled'];
const tenantStatusOptions = ['All', 'Booked', 'In Progress', 'Completed', 'Cancelled'];
const BOOKING_SLOT_STEP_MINUTES = 5;
const BOOKING_MIN_DURATION_MINUTES = 30;
const BOOKING_CLEANUP_BUFFER_MINUTES = 5;

// ── Types ────────────────────────────────────────────────────────────────────

interface RoomCatalogEntry {
  name: string;
  type: string;
  floor: string;
  wing: string;
  locationLabel: string;
  resourceCategory: string;
  inventoryMode: string;
  capacity: number;
  assignedTenantCompanyId: string | null;
  assignedTenantCompanyName: string;
  assignedDepartmentId: string;
  assignedDepartmentName: string;
  status: string;
  pricePerHour: number;
  pricePerDay: number;
  credits: number;
  activationReady: boolean;
  isActive: boolean;
  currentlyBooked: boolean;
  description: string;
}

interface BookingInvite {
  invitedUserId: string | null;
  invitedName: string;
  invitedRole: string;
  invitedDepartments: string[];
  status: string;
  responseReason: string;
  invitedAt: string | null;
  respondedAt: string | null;
}

interface TenantCompanyRow {
  id: string;
  recordId?: string;
  bookingCode: string;
  companyName: string;
  name?: string;
  contactPerson: string;
  email: string;
  phone: string;
  packageName: string;
  creditsAllocated: number;
  creditsUsed: number;
  remainingCredits: number;
  status: string;
  negotiationWindow: string;
  requestedSeats: number;
  bookingType: string;
  company: string;
  department: string;
  creditHistory: unknown[];
  creditLedger: CreditHistoryEntry[];
  raw: unknown;
}

interface CreditHistoryEntry {
  label: string;
  date: string;
  amount: number;
}

interface TrackerPeriod {
  key: string;
  month: string;
  year: string;
  label: string;
  sortValue: number;
}

interface TrackerDepartmentRow {
  department: string;
  bookings: number;
  totalSeats: number;
  resources: Set<string>;
}

interface TrackerTotals {
  bookings: number;
  owner: number;
  superAdmin: number;
  admin: number;
}

interface CancelForm {
  reason: string;
  refundType: string;
}

interface RescheduleForm {
  newDate: string;
  newStartTime: string;
  newEndTime: string;
}

interface ExtendForm {
  extraMinutes: string;
}

interface AvailabilityResult {
  available: boolean;
  conflicts: unknown[];
  reason: string;
  mode?: string;
  nextDate?: string;
  nextStartTime?: string;
  nextEndTime?: string;
  durationMinutes?: number;
  extraMinutes?: number;
}

interface InviteCounts {
  pending: number;
  approved: number;
  rejected: number;
}

interface StatItem {
  label: string;
  value: number;
  icon: ElementType;
}

interface MasterCalendarMonthMeta {
  label: string;
  daysInMonth: number;
  firstDayOfMonth: number;
  monthKey: string;
}

interface MasterCalendarTypeOption {
  value: string;
  label: string;
}

interface DepartmentCatalogEntry {
  name: string;
  aliases: string[];
}

interface BookingRow {
  id: string;
  recordId: string;
  bookingCode: string;
  resourceName: string;
  resourceType: string;
  resourceLocation: string;
  bookedBy: string;
  contactPerson: string;
  bookedByEmail: string;
  bookedByPhone: string;
  role: string;
  company: string;
  companyName: string;
  clientCompany: string;
  department: string;
  date: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  previousDate: string;
  previousStartTime: string;
  previousEndTime: string;
  scheduleChangeType: string;
  timeSlot: string;
  durationMinutes: number | null;
  duration: string;
  bookingType: string;
  paymentStatus: string;
  bookingCredits: number;
  creditsUsed: number;
  remainingCredits: number | null;
  status: string;
  notes: string;
  bookingNotes: string;
  category: string;
  attendees: number;
  roomCapacity: number | null;
  roomFloor: string;
  roomWing: string;
  location: string;
  roomInventoryMode: string;
  bookingScope: string;
  source: string;
  purpose: string;
  sourceReference: string;
  paymentMode: string;
  transactionId: string;
  paymentProofUrl: string;
  paymentVerificationStatus: string;
  financeStatus: string;
  baseAmount: number;
  gstAmount: number;
  extensionAmount: number;
  originalTotalAmount: number;
  totalAmount: number;
  invoiceNumber: string;
  invoiceFileUrl: string;
  invoiceStatus: string;
  invites: BookingInvite[];
  raw: unknown;
}

// ── Helper Functions ─────────────────────────────────────────────────────────

function normalize(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function statusLabel(value: string | null | undefined): string {
  const n = normalize(value);
  if (n.includes('pending')) return 'Pending';
  if (n === 'in progress') return 'In Progress';
  if (n === 'completed') return 'Completed';
  if (n === 'cancelled' || n === 'canceled') return 'Cancelled';
  if (n === 'rescheduled' || n === 'reschedules') return 'Reschedules';
  if (n === 'expiring soon') return 'Expiring Soon';
  if (n === 'expired') return 'Expired';
  if (n === 'active') return 'Active';
  return 'Booked';
}

function lifecycleFor(status: string): string {
  const n = statusLabel(status);
  if (n === 'Completed') return 'completed';
  if (n === 'Cancelled' || n === 'Reschedules') return 'history';
  return 'upcoming';
}

function deriveRoomType(room: Record<string, unknown> = {}): string {
  const resourceCategory = normalize(String(room.resourceCategory || '')).replace(/[\s_-]+/g, ' ');
  const type = normalize(String(room.type || ''));
  const name = normalize(String(room.name || ''));

  if (resourceCategory.includes('conference') || type.includes('conference') || name.includes('board')) return 'Conference Room';
  if (resourceCategory.includes('meeting') || type.includes('meeting')) return 'Meeting Room';
  if (resourceCategory.includes('cabin') || type.includes('cabin')) return 'Cabin';
  if (resourceCategory.includes('desk') || type.includes('desk')) return 'Desk';
  if (type.includes('virtual office') || resourceCategory.includes('virtual office')) return 'Virtual Office';
  return 'Meeting Room';
}

function normalizeRoomCatalogEntry(room: Record<string, unknown> = {}): RoomCatalogEntry {
  const name = String(room.name || '').trim();
  const floor = String(room.floor || '501').trim() || '501';
  const wing = String(room.wing || '').trim().toUpperCase();
  const type = String(room.type || '').trim() || deriveRoomType(room);

  return {
    name,
    type,
    floor,
    wing,
    locationLabel: [floor, wing].filter(Boolean).join(' ').trim(),
    resourceCategory: String(room.resourceCategory || '').trim(),
    inventoryMode: String(room.inventoryMode || (Number(room.capacity || 0) > 1 ? 'area' : 'single')).trim(),
    capacity: Number(room.capacity || 0),
    assignedTenantCompanyId: (room.assignedTenantCompanyId as string) || null,
    assignedTenantCompanyName: String(room.assignedTenantCompanyName || ''),
    assignedDepartmentId: String(room.assignedDepartmentId || ''),
    assignedDepartmentName: String(room.assignedDepartmentName || ''),
    status: String(room.status || 'Active'),
    pricePerHour: Number(room.pricePerHour || 0),
    pricePerDay: Number(room.pricePerDay || 0),
    credits: Number(room.credits || 0),
    activationReady: room.activationReady !== false,
    isActive: room.isActive !== false,
    currentlyBooked: Boolean(room.currentlyBooked),
    description: String(room.description || ''),
  };
}

function resolveBookingRoomName(booking: Record<string, unknown> = {}): string {
  const candidates = [
    booking.roomName,
    booking.resourceName,
    booking.resource,
    typeof booking.room === 'string' ? booking.room : (booking.room as Record<string, unknown>)?.name,
    (booking.roomDetails as Record<string, unknown>)?.name,
    (booking.resourceDetails as Record<string, unknown>)?.name,
    booking.meetingRoomName,
    booking.meetingRoom,
    booking.roomLabel,
    booking.roomDescription,
  ];

  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value) return value;
  }

  return '';
}

function isRoomEnabledForBooking(room: Record<string, unknown> = {}): boolean {
  const status = normalize(String(room.status || 'Active'));
  const hasPricing = Number(room.pricePerHour || 0) > 0 || Number(room.pricePerDay || 0) > 0;
  const hasCredits = Number(room.credits || 0) > 0;
  const isEnabledStatus = !status || status === 'active';
  return Boolean(room.name) && Boolean(room.isActive !== false) && room.activationReady !== false && isEnabledStatus && hasPricing && hasCredits;
}

function normalizeMasterCalendarRoomType(type = ''): string {
  const normalized = normalize(type).replace(/[\s_-]+/g, ' ');
  if (normalized.includes('conference') || normalized.includes('board')) return 'conference';
  if (normalized.includes('desk')) return 'desk';
  if (normalized.includes('cabin')) return 'cabin';
  if (normalized.includes('meeting')) return 'meeting';
  return 'meeting';
}

function normalizeTenantCompanyRow(company: Record<string, unknown> = {}): TenantCompanyRow {
  const companyName = String(company.companyName || company.name || '').trim();
  const contactPerson = String(company.contactPerson || company.contactName || (company.pocDetails as Record<string, unknown>)?.localPocName || '').trim();
  const email = String(company.email || (company.pocDetails as Record<string, unknown>)?.localPocEmail || '').trim();
  const phone = String(company.phone || (company.pocDetails as Record<string, unknown>)?.localPocPhone || '').trim();
  const packageName = String(company.packageName || company.planType || (company.packageDetails as Record<string, unknown>)?.packageName || '').trim();
  const creditsAllocated = Number(company.creditsAllocated || company.creditsTotal || (company.creditConfiguration as Record<string, unknown>)?.monthlyTotalCredits || 0);
  const creditsUsed = Number(company.creditsUsed || 0);
  const remainingCredits = Math.max(0, Number((creditsAllocated - creditsUsed).toFixed(2)));
  const contractStart = String(company.contractStart || company.contractStartAt || '');
  const contractEnd = String(company.contractEnd || company.contractEndAt || '');
  const requestedSeats = Number(
    (company.packageDetails as Record<string, unknown>)?.totalSeats ||
      (company.spaceAssigned as Record<string, unknown>)?.totalSeats ||
      (Array.isArray(company.employees as unknown)
        ? (company.employees as unknown[]).length
        : 0),
  );

  return {
    id: String(company.id || company.recordId || company.tenantCode || companyName || '').trim(),
    bookingCode: String(company.recordId || company.tenantCode || company.id || companyName || '').trim(),
    companyName,
    contactPerson,
    email,
    phone,
    packageName,
    creditsAllocated,
    creditsUsed,
    remainingCredits,
    status: statusLabel(String(company.status || 'Active')),
    negotiationWindow: [contractStart, contractEnd].filter(Boolean).join(' - ') || 'Contract Active',
    requestedSeats,
    bookingType: 'Tenant',
    company: companyName,
    department: String(company.businessType || 'Tenant Company'),
    creditHistory: Array.isArray(company.creditHistory) ? company.creditHistory : [],
    creditLedger: [],
    raw: company,
  };
}

function formatRoomScopeLabel(room: RoomCatalogEntry): string {
  const parts = [room.name];
  if (room.locationLabel) parts.push(room.locationLabel);
  if (room.type) parts.push(room.type);
  return parts.filter(Boolean).join(' - ');
}

function statusBadge(status: string): string {
  const n = statusLabel(status);
  if (n === 'In Progress') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (n === 'Pending') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  if (n === 'Completed') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (n === 'Cancelled') return 'bg-red-50 text-red-700 border-red-200';
  if (n === 'Reschedules') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (n === 'Active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (n === 'Expiring Soon') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (n === 'Expired') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-green-50 text-green-700 border-green-200';
}

function invoiceStatusBadge(status: string): string {
  const n = normalize(status);
  if (n.includes('sent')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (n.includes('generated')) return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
  if (n.includes('pending')) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function inviteStatusLabel(status: string): string {
  const n = normalize(status);
  if (n === 'accepted' || n === 'approved') return 'Approved';
  if (n === 'rejected') return 'Rejected';
  return 'Pending';
}

function inviteStatusBadge(status: string): string {
  const n = inviteStatusLabel(status);
  if (n === 'Approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (n === 'Rejected') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function inviteSortWeight(status: string): number {
  const n = normalize(status);
  if (n === 'accepted' || n === 'approved') return 1;
  if (n === 'rejected') return 2;
  return 0;
}

function scopeBadge(scope: string): string {
  if (scope === 'tenant') return 'bg-violet-50 text-violet-700 border-violet-200';
  if (scope === 'external') return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function roleCategory(value: string): string {
  const n = normalize(value).replace(/[-_]+/g, ' ');
  if (n.includes('super admin')) return 'superAdmin';
  if (n === 'admin') return 'admin';
  if (n === 'owner') return 'owner';
  return 'other';
}

function bookingScopeKey(value: string): string {
  const category = roleCategory(value);
  if (category === 'owner') return 'owner';
  if (category === 'superAdmin') return 'super-admin';
  return 'department';
}

function bookingScopeLabel(value: string): string {
  const scope = bookingScopeKey(value);
  if (scope === 'owner') return 'Founder booking';
  if (scope === 'super-admin') return 'Super admin booking';
  return 'Department booking';
}

function bookingScopeBadge(scope: string): string {
  if (scope === 'owner') return 'bg-violet-50 text-violet-700 border-violet-200';
  if (scope === 'super-admin') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function bookingTypeBadgeClass(type: string): string {
  const normalized = normalize(type);
  if (normalized === 'external') return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
  if (normalized === 'tenant') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function isGpayPaymentMode(value: string): boolean {
  const normalized = normalize(value);
  return normalized.includes('gpay') || normalized.includes('upi');
}

function formatCurrency(value: number | string | null | undefined): string {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function isExternalBooking(row: Record<string, unknown>): boolean {
  return normalize(String(row?.bookingType)) === 'external';
}

function canManageExternalBooking(row: Record<string, unknown>): boolean {
  const label = statusLabel(String(row?.status));
  return isExternalBooking(row) && label !== 'Completed' && label !== 'Cancelled' && label !== 'Reschedules';
}

const departmentCatalog: DepartmentCatalogEntry[] = [
  { name: 'Human Resources', aliases: ['human resources', 'hr', 'hr dept', 'hr department', 'human-resources'] },
  { name: 'Sales', aliases: ['Sales', 'sales crm', 'sales', 'sales department', 'sales team', 'sales-crm'] },
  { name: 'Finance', aliases: ['finance', 'accounting', 'finance department', 'finance team'] },
  { name: 'Administration', aliases: ['administration', 'admin', 'management', 'admin department', 'administration department'] },
  { name: 'IT', aliases: ['it', 'information technology', 'it support', 'it department'] },
  { name: 'Tech', aliases: ['tech', 'technology', 'tech team', 'tech department'] },
  { name: 'Maintenance', aliases: ['maintenance', 'facilities', 'operations', 'maintenance department'] },
];

function parseBookingDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDateOnly(value: string | Date | null | undefined): string {
  if (!value) return '';

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text.slice(0, 10);
  }

  const parsed = parseBookingDate(value);
  if (!parsed) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string | Date | null | undefined): string {
  if (!value) return '';

  if (typeof value === 'string') {
    const text = value.trim();
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const parsed = new Date(Number(year), Number(month) - 1, Number(day));
      return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
    }
  }

  const parsed = parseBookingDate(value);
  if (!parsed) return String(value);

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatTimeSlot(startTime: string, endTime: string): string {
  const start = formatTime12h(startTime);
  const end = formatTime12h(endTime);
  if (!startTime && !endTime) return '--:--';
  if (!startTime) return end;
  if (!endTime) return start;
  return `${start} - ${end}`;
}

function getScheduleChangeLabel(value: string): string {
  const normalized = normalize(value);
  if (normalized === 'extended') return 'Extended';
  if (normalized === 'rescheduled') return 'Rescheduled';
  return '';
}

function renderScheduleSummary(row: Record<string, unknown>, options: { showDate?: boolean } = {}): ReactNode {
  const showDate = options.showDate !== false;
  const currentDateLabel = showDate ? formatDisplayDate(String(row.date)) : '';
  const currentTimeLabel = String(row.timeSlot || formatTimeSlot(String(row.startTime || ''), String(row.endTime || '')));
  const previousDateLabel = showDate ? formatDisplayDate(String(row.previousDate)) : '';
  const previousTimeLabel = formatTimeSlot(String(row.previousStartTime || ''), String(row.previousEndTime || ''));
  const changeLabel = getScheduleChangeLabel(String(row.scheduleChangeType || ''));
  const hasHistory = Boolean(row.previousDate || row.previousStartTime || row.previousEndTime) && Boolean(previousTimeLabel);

  if (!hasHistory) {
    if (showDate) {
      return (
        <div className="text-[12px] font-semibold text-slate-600 flex flex-col gap-0.5">
          <span className="font-bold text-[#0F172A]">{currentDateLabel}</span>
          <span className="whitespace-nowrap">{currentTimeLabel}</span>
        </div>
      );
    }
    return (
      <div className="text-[12px] font-semibold text-slate-600">
        <span className="whitespace-nowrap">{currentTimeLabel}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-0.5 text-[11px] font-semibold text-slate-400">
        {showDate && (
          <span className="line-through decoration-slate-300 decoration-2">{previousDateLabel || currentDateLabel}</span>
        )}
        <span className="line-through decoration-slate-300 decoration-2 whitespace-nowrap">{previousTimeLabel}</span>
      </div>
      <div className="flex flex-col gap-0.5 text-[12px] font-semibold text-slate-600">
        {showDate && <span className="font-bold text-[#0F172A]">{currentDateLabel}</span>}
        <span className="whitespace-nowrap">{currentTimeLabel}</span>
      </div>
      {changeLabel && (
        <span className="inline-flex w-fit px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
          {changeLabel}
        </span>
      )}
    </div>
  );
}

function timeStringToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const suffix = match[3] ? match[3].toUpperCase() : '';

  if (suffix) {
    if (hours < 1 || hours > 12) return null;
    if (hours === 12) hours = 0;
    if (suffix === 'PM') hours += 12;
  }

  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesToTimeString(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '';
  const normalized = ((Number(value) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function isAlignedToBookingStep(totalMinutes: number | null, stepMinutes = BOOKING_SLOT_STEP_MINUTES): boolean {
  return totalMinutes != null && Number.isInteger(totalMinutes) && totalMinutes % stepMinutes === 0;
}

function buildBookingTimeOptions(minTime = '00:00', maxTime = '23:55', stepMinutes = BOOKING_SLOT_STEP_MINUTES): string[] {
  const minMinutes = Math.max(0, timeStringToMinutes(minTime) ?? 0);
  const maxMinutes = Math.min((24 * 60) - stepMinutes, timeStringToMinutes(maxTime) ?? ((24 * 60) - stepMinutes));
  if (maxMinutes < minMinutes) return [];

  const options: string[] = [];
  for (let value = minMinutes; value <= maxMinutes; value += stepMinutes) {
    options.push(minutesToTimeString(value));
  }
  return options;
}

function getDateTimeValue(dateValue: string, timeValue: string): Date | null {
  const parsedDate = parseBookingDate(dateValue);
  const parsedMinutes = timeStringToMinutes(timeValue);
  if (!parsedDate || parsedMinutes == null) return null;
  return new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
    Math.floor(parsedMinutes / 60),
    parsedMinutes % 60,
    0,
    0,
  );
}

function getDurationMinutes(startTime: string, endTime: string): number | null {
  const startMinutes = timeStringToMinutes(startTime);
  const endMinutes = timeStringToMinutes(endTime);
  if (startMinutes == null || endMinutes == null) return null;
  return endMinutes - startMinutes;
}

function getBookingTimeValidation(dateValue: string, startTimeValue: string): { valid: boolean; reason: string } {
  if (!dateValue || !startTimeValue) {
    return { valid: true, reason: '' };
  }

  const selectedDate = formatDateOnly(dateValue);
  const startMinutes = timeStringToMinutes(startTimeValue);
  if (!selectedDate || startMinutes == null) {
    return { valid: false, reason: 'Choose a valid future booking date and time.' };
  }

  const now = new Date();
  const today = formatDateOnly(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (selectedDate < today) {
    return { valid: false, reason: 'Backdated bookings are not allowed. Choose a future date.' };
  }

  if (selectedDate === today && startMinutes <= currentMinutes) {
    return { valid: false, reason: 'That time has already passed. Choose another slot for today.' };
  }

  return { valid: true, reason: '' };
}

function buildMeetingRoomAvailability(
  rows: BookingRow[],
  booking: Record<string, unknown>,
  dateValue: string,
  startTimeValue: string,
  endTimeValue: string,
): AvailabilityResult {
  const startDateTime = getDateTimeValue(dateValue, startTimeValue);
  const endDateTime = getDateTimeValue(dateValue, endTimeValue);
  if (!startDateTime || !endDateTime) {
    return { available: false, conflicts: [], reason: 'Choose a valid date and time.' };
  }

  if (endDateTime <= startDateTime) {
    return { available: false, conflicts: [], reason: 'End time must be after the start time.' };
  }

  const startMinutes = timeStringToMinutes(startTimeValue);
  const endMinutes = timeStringToMinutes(endTimeValue);
  if (!isAlignedToBookingStep(startMinutes) || !isAlignedToBookingStep(endMinutes)) {
    return {
      available: false,
      conflicts: [],
      reason: `${BOOKING_SLOT_STEP_MINUTES}-minute slots only (for example 12:20, 12:25, 12:30).`,
    };
  }
  if (endMinutes! - startMinutes! < BOOKING_MIN_DURATION_MINUTES) {
    return {
      available: false,
      conflicts: [],
      reason: `Minimum booking duration is ${BOOKING_MIN_DURATION_MINUTES} minutes.`,
    };
  }

  const targetRoom = normalize(String(booking?.resourceName));
  const conflicts = rows.filter((candidate) => {
    if (!candidate || candidate.id === booking?.id) return false;
    if (normalize(candidate.resourceName) !== targetRoom) return false;

    const candidateStart = getDateTimeValue(candidate.dateKey || candidate.date, candidate.startTime);
    const candidateEnd = getDateTimeValue(candidate.dateKey || candidate.date, candidate.endTime);
    if (!candidateStart || !candidateEnd) return false;
    if (normalize(candidate.status) === 'cancelled' || normalize(candidate.status) === 'reschedules') return false;

    const bufferedCandidateEnd = new Date(candidateEnd.getTime() + (BOOKING_CLEANUP_BUFFER_MINUTES * 60 * 1000));
    return candidateStart < endDateTime && startDateTime < bufferedCandidateEnd;
  });

  return {
    available: conflicts.length === 0,
    conflicts,
    reason: conflicts.length ? `Room is already booked by ${conflicts[0].bookedBy || conflicts[0].company || 'another booking'}.` : '',
  };
}

function getLiveMeetingStatus(row: Record<string, unknown>): string {
  const currentStatus = statusLabel(String(row?.status));
  if (currentStatus === 'Cancelled' || currentStatus === 'Reschedules' || currentStatus === 'Completed') {
    return currentStatus;
  }

  const startDateTime = getDateTimeValue(String(row?.dateKey || row?.date), String(row?.startTime));
  const endDateTime = getDateTimeValue(String(row?.dateKey || row?.date), String(row?.endTime));
  if (!startDateTime || !endDateTime) return currentStatus;

  const now = new Date();
  if (now >= endDateTime) return 'Completed';
  if (now >= startDateTime) return 'In Progress';
  return 'Booked';
}

function getInternalActionMode(row: Record<string, unknown>): string | null {
  const liveStatus = getLiveMeetingStatus(row);
  if (liveStatus === 'Booked') return 'reschedule';
  if (liveStatus === 'In Progress') return 'extend';
  return null;
}

function buildBookingExportRows(rows: BookingRow[], scopeLabel = 'Bookings', filters: Record<string, string> = {}): Array<{ label: string; value: string }> {
  const { activeTab = 'All', resourceFilter = 'All Resources', bookingTypeFilter = 'All Types', searchQuery = '' } = filters;
  const exportRows: Array<{ label: string; value: string }> = [
    { label: 'Scope', value: scopeLabel },
    { label: 'Status Filter', value: activeTab },
    { label: 'Resource Filter', value: resourceFilter },
    { label: 'Type Filter', value: bookingTypeFilter },
    { label: 'Search Filter', value: searchQuery || 'All' },
    { label: 'Record Count', value: String(rows.length) },
  ];

  rows.forEach((row, index) => {
    exportRows.push({
      label: `${index + 1}. ${row.companyName || row.bookedBy || row.resourceName || 'Booking'}`,
      value: [
        row.bookingCode ? `Code: ${row.bookingCode}` : '',
        row.resourceName ? `Resource: ${row.resourceName}` : '',
        row.date ? `Date: ${row.date}` : '',
        row.timeSlot ? `Time: ${row.timeSlot}` : '',
        row.companyName ? `Company: ${row.companyName}` : '',
        row.department ? `Department: ${row.department}` : '',
        row.role ? `Role: ${row.role}` : '',
        row.status ? `Status: ${row.status}` : '',
        row.bookingType ? `Type: ${row.bookingType}` : '',
      ].filter(Boolean).join(' | '),
    });
  });

  return exportRows;
}

function buildBookingDetailExportRows(booking: Record<string, unknown> = {}): Array<{ label: string; value: string }> {
  const invites = Array.isArray(booking.invites) ? booking.invites as BookingInvite[] : [];
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Booking Code', value: String(booking.bookingCode || booking.id || '-') },
    { label: 'Resource Name', value: String(booking.resourceName || '-') },
    { label: 'Resource Type', value: String(booking.resourceType || '-') },
    { label: 'Booking Type', value: String(booking.bookingType || '-') },
    { label: 'Status', value: String(booking.status || '-') },
    { label: 'Date', value: String(booking.date || '-') },
    { label: 'Time Slot', value: String(booking.timeSlot || '-') },
    { label: 'Department', value: String(booking.department || '-') },
    { label: 'Company', value: String(booking.companyName || booking.company || '-') },
    { label: 'Booked By', value: String(booking.bookedBy || '-') },
    { label: 'Booking Source', value: String(booking.source || '-') },
    { label: 'Payment Status', value: String(booking.paymentStatus || '-') },
    { label: 'Finance Status', value: String(booking.financeStatus || '-') },
    { label: 'Invoice Status', value: String(booking.invoiceStatus || '-') },
    { label: 'Total Amount', value: String(booking.totalAmount ?? 0) },
    { label: 'Credits Used', value: String(booking.creditsUsed ?? 0) },
    { label: 'Remaining Credits', value: String(booking.remainingCredits ?? 0) },
    { label: 'Notes', value: String(booking.bookingNotes || booking.notes || '-') },
  ];

  invites.slice(0, 20).forEach((invite, index) => {
    rows.push({
      label: `Invite ${index + 1}`,
      value: [
        invite.invitedName || 'Employee',
        invite.invitedRole ? `Role: ${invite.invitedRole}` : '',
        Array.isArray(invite.invitedDepartments) && invite.invitedDepartments.length > 0 ? `Departments: ${invite.invitedDepartments.join(', ')}` : '',
        invite.status ? `Status: ${invite.status}` : '',
        invite.responseReason ? `Reason: ${invite.responseReason}` : '',
      ].filter(Boolean).join(' | '),
    });
  });

  return rows;
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function BookingsPage() {
  const storedUser = getStoredUser();
  const isAdministrationManagerProfile = canAccessAdministrationDashboard(storedUser);
  const [activeScope, setActiveScope] = useState('internal');
  const [activeTab, setActiveTab] = useState('All');
  const [trackerMonth, setTrackerMonth] = useState('');
  const [trackerYear, setTrackerYear] = useState('');
  const [resourceFilter, setResourceFilter] = useState('All Resources');
  const [bookingTypeFilter, setBookingTypeFilter] = useState('All Types');
  const [searchQuery, setSearchQuery] = useState('');
  const [internalBookings, setInternalBookings] = useState<Record<string, unknown>[]>([]);
  const [tenantCompanies, setTenantCompanies] = useState<TenantCompanyRow[]>([]);
  const [roomCatalog, setRoomCatalog] = useState<RoomCatalogEntry[]>([]);
  const [loadingInternal, setLoadingInternal] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [viewingDetails, setViewingDetails] = useState<BookingRow | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<BookingRow | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<BookingRow | null>(null);
  const [bookingActionMode, setBookingActionMode] = useState('reschedule');
  const [viewingCalendar, setViewingCalendar] = useState(false);
  const [cancelForm, setCancelForm] = useState<CancelForm>({ reason: '', refundType: 'Full' });
  const [rescheduleForm, setRescheduleForm] = useState<RescheduleForm>({ newDate: '', newStartTime: '', newEndTime: '' });
  const [extendForm, setExtendForm] = useState<ExtendForm>({ extraMinutes: '30' });
  const [savingBookingUpdate, setSavingBookingUpdate] = useState(false);
  const [bookingUpdateError, setBookingUpdateError] = useState('');
  const [isExportingReport, setIsExportingReport] = useState('');
  const [masterCalendarMonth, setMasterCalendarMonth] = useState(() => new Date().getMonth());
  const [masterCalendarYear, setMasterCalendarYear] = useState(() => new Date().getFullYear());
  const [masterCalendarRoom, setMasterCalendarRoom] = useState('All Rooms');
  const [masterCalendarType, setMasterCalendarType] = useState('all');
  const [masterCalendarFloor, setMasterCalendarFloor] = useState('All Floors');
  const [masterCalendarWing, setMasterCalendarWing] = useState('All Wings');
  const [masterCalendarDateKey, setMasterCalendarDateKey] = useState(() => formatDateOnly(new Date()));

  const roomLookup = useMemo(() => new Map(roomCatalog.map((room) => [room.name, room])), [roomCatalog]);
  const enabledRoomCatalog = useMemo(
    () => roomCatalog.filter((room) => isRoomEnabledForBooking(room as unknown as Record<string, unknown>)),
    [roomCatalog],
  );
  const enabledRoomNameSet = useMemo(
    () => new Set(enabledRoomCatalog.map((room) => room.name)),
    [enabledRoomCatalog],
  );
  const tenantCompanyLookup = useMemo(() => {
    return new Map(
      tenantCompanies.flatMap((company) => {
        const keys = [company.id, company.recordId, company.bookingCode, company.name]
          .map((value) => String(value || '').trim().toLowerCase())
          .filter(Boolean);
        return keys.map((key) => [key, company]);
      }),
    );
  }, [tenantCompanies]);

  // Backend service - uncomment when backend is ready:
  /*
  const syncBookings = useCallback(async () => {
    setLoadingInternal(true);
    try {
      const [bookingResponse, tenantResponse] = await Promise.allSettled([getMeetingRoomBookings(), getTenantCompanies()]);
      const bookings = bookingResponse.status === 'fulfilled' ? (bookingResponse.value as any)?.data?.bookings || [] : [];
      const rooms = bookingResponse.status === 'fulfilled' ? (bookingResponse.value as any)?.data?.roomDetails || [] : [];
      const tenantPayload = tenantResponse.status === 'fulfilled' ? ((tenantResponse.value as any)?.data || {}) : {};
      const nextTenantCompanies = Array.isArray(tenantPayload.tenants)
        ? tenantPayload.tenants.map((item: Record<string, unknown>) => normalizeTenantCompanyRow(item)).filter((company: TenantCompanyRow) => company.id)
        : [];
      setInternalBookings(bookings);
      setTenantCompanies(nextTenantCompanies);
      setRoomCatalog(rooms.map((item: Record<string, unknown>) => normalizeRoomCatalogEntry(item)).filter((room: RoomCatalogEntry) => room.name));
      setLastSyncedAt(new Date());
    } catch {
      setInternalBookings([]);
      setTenantCompanies([]);
      setRoomCatalog([]);
    } finally {
      setLoadingInternal(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    syncBookings();
    const syncTimer = window.setInterval(() => {
      if (!cancelled) {
        syncBookings();
      }
    }, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(syncTimer);
    };
  }, [syncBookings]);
  */

  const internalRows = useMemo(
    () =>
      internalBookings.map((booking) => {
        const roomName = resolveBookingRoomName(booking);
        const roomMeta = roomLookup.get(roomName) || null;
        const derivedBookingType = String(booking.bookingType || (normalize(String(booking.bookingSource)) === 'frontdesk' ? 'External' : 'Internal'));
        const normalizedBookingType = normalize(derivedBookingType);
        const isTenantBooking = normalizedBookingType === 'tenant';
        const isExternalBookingType = normalizedBookingType === 'external';
        const resolvedCompanyName = isTenantBooking
          ? String(booking.bookedByTenantCompanyName || booking.clientCompany || booking.company || 'Tenant Company')
          : String(booking.clientCompany || booking.company || (isExternalBookingType ? 'Individual' : 'Internal Staff'));

        const tenantCompanyMatch = booking.bookingType === 'Tenant'
          ? (tenantCompanyLookup.get(String(booking.bookedByTenantCompanyId || '').toLowerCase()) ||
             tenantCompanyLookup.get(String(booking.bookedByTenantCompanyName || booking.clientCompany || '').toLowerCase()) ||
             null)
          : null;

        return {
          id: String(booking.bookingCode || booking.id || ''),
          recordId: String(booking.recordId || booking._id || booking.id || booking.bookingCode || '').trim(),
          bookingCode: String(booking.bookingCode || booking.id || ''),
          resourceName: roomName,
          resourceType: roomMeta?.type || (roomName?.toLowerCase().includes('board') ? 'Conference Room' : roomName?.toLowerCase().includes('conference') ? 'Conference Room' : roomName?.toLowerCase().includes('cabin') ? 'Cabin' : roomName?.toLowerCase().includes('desk') ? 'Desk' : 'Meeting Room'),
          resourceLocation: roomMeta?.locationLabel || String(booking.roomDescription || 'Workspace'),
          bookedBy: String(booking.bookedByName || booking.bookedBy || booking.contactPerson || ''),
          contactPerson: String(booking.bookedByName || booking.bookedBy || booking.contactPerson || ''),
          bookedByEmail: String(booking.bookedByEmail || ''),
          bookedByPhone: String(booking.bookedByPhone || ''),
          role: String(booking.bookedByRole || 'Manager'),
          company: resolvedCompanyName,
          companyName: resolvedCompanyName,
          clientCompany: String(booking.clientCompany || booking.company || ''),
          department: String(booking.department || 'Administration'),
          date: String(booking.date || ''),
          dateKey: formatDateOnly(String(booking.date)),
          startTime: String(booking.startTime || ''),
          endTime: String(booking.endTime || ''),
          previousDate: String(booking.previousDate || ''),
          previousStartTime: String(booking.previousStartTime || ''),
          previousEndTime: String(booking.previousEndTime || ''),
          scheduleChangeType: String(booking.scheduleChangeType || ''),
          timeSlot: formatTimeSlot(String(booking.startTime || ''), String(booking.endTime || '')),
          durationMinutes: getDurationMinutes(String(booking.startTime || ''), String(booking.endTime || '')),
          duration: '',
          bookingType: derivedBookingType,
          paymentStatus: String(booking.paymentStatus || 'No Payment Required'),
          bookingCredits: Number(booking.bookingCredits || 0),
          creditsUsed: booking.bookingType === 'Tenant' ? Number(booking.bookingCredits || 0) : 0,
          remainingCredits: tenantCompanyMatch
            ? Number((tenantCompanyMatch as TenantCompanyRow).remainingCredits ?? Math.max(0, Number((tenantCompanyMatch as TenantCompanyRow).creditsAllocated || 0) - Number((tenantCompanyMatch as TenantCompanyRow).creditsUsed || 0)))
            : null,
          status: statusLabel(String(booking.liveStatus || booking.status || '')),
          notes: String(booking.purpose || ''),
          bookingNotes: String(booking.bookingNotes || booking.purpose || ''),
          category: lifecycleFor(String(booking.liveStatus || booking.status || '')),
          attendees: Number(booking.attendees || 0),
          roomCapacity: roomMeta?.capacity ?? Number(booking.roomCapacity || null),
          roomFloor: roomMeta?.floor || '',
          roomWing: roomMeta?.wing || '',
          location: roomMeta?.locationLabel || String(booking.bookingNotes || booking.roomDescription || 'Workspace'),
          roomInventoryMode: roomMeta?.inventoryMode || String(booking.roomInventoryMode || ''),
          bookingScope: String(booking.bookingScope || bookingScopeKey(String(booking.bookedByRole || ''))),
          source: String(booking.bookingSource || 'Internal System'),
          purpose: String(booking.purpose || ''),
          sourceReference: String(booking.sourceReference || booking.bookingReference || booking.externalReference || booking.confirmationId || ''),
          paymentMode: String(booking.paymentMode || ''),
          transactionId: String(booking.transactionId || ''),
          paymentProofUrl: String(booking.paymentProofUrl || ''),
          paymentVerificationStatus: String(booking.paymentVerificationStatus || 'Pending'),
          financeStatus: String(booking.financeStatus || ''),
          baseAmount: Number(booking.baseAmount || 0),
          gstAmount: Number(booking.gstAmount || 0),
          extensionAmount: Number(booking.extensionAmount || 0),
          originalTotalAmount: Math.max(Number(booking.totalAmount || 0) - Number(booking.extensionAmount || 0), 0),
          totalAmount: Number(booking.totalAmount || 0),
          invoiceNumber: String(booking.invoiceNumber || ''),
          invoiceFileUrl: String(booking.invoiceFileUrl || ''),
          invoiceStatus: String(booking.invoiceStatus || 'Pending'),
          invites: Array.isArray(booking.invites)
            ? (booking.invites as Record<string, unknown>[]).map((invite) => ({
                invitedUserId: (invite.invitedUserId as string) || null,
                invitedName: String(invite.invitedName || ''),
                invitedRole: String(invite.invitedRole || ''),
                invitedDepartments: Array.isArray(invite.invitedDepartments) ? invite.invitedDepartments as string[] : [],
                status: String(invite.status || 'pending'),
                responseReason: String(invite.responseReason || ''),
                invitedAt: (invite.invitedAt as string) || null,
                respondedAt: (invite.respondedAt as string) || null,
              }))
            : [],
          raw: booking,
        } as BookingRow;
      }),
    [internalBookings, roomLookup, tenantCompanyLookup],
  );

  const backendExternalRows = useMemo(
    () => internalRows.filter((row) => row.bookingType === 'External'),
    [internalRows],
  );
  const internalDepartmentRows = useMemo(
    () => internalRows.filter((row) => row.bookingType !== 'External' && row.bookingType !== 'Tenant'),
    [internalRows],
  );
  const externalRows = useMemo(() => backendExternalRows, [backendExternalRows]);
  const tenantRows = useMemo(() => internalRows.filter((row) => normalize(row.bookingType) === 'tenant'), [internalRows]);
  const allRows = useMemo(() => [...internalDepartmentRows, ...externalRows, ...tenantRows], [externalRows, internalDepartmentRows, tenantRows]);
  const bookingCalendarRows = useMemo(() => [...internalDepartmentRows, ...externalRows, ...tenantRows], [externalRows, internalDepartmentRows, tenantRows]);
  const historyRows = useMemo(() => [...internalDepartmentRows, ...externalRows, ...tenantRows], [externalRows, internalDepartmentRows, tenantRows]);

  const updateBookingInState = useCallback((updated: Record<string, unknown> | null) => {
    if (!updated) return;

    setInternalBookings((prev) => prev.map((entry) => (String(entry.bookingCode || entry.id) === String(updated.bookingCode || updated.id) ? updated : entry)));
    setViewingDetails((current) => {
      if (!current) return current;
      const currentId = String(current.bookingCode || current.id);
      const updatedId = String(updated.bookingCode || updated.id);
      return currentId === updatedId ? { ...current, ...updated } as unknown as BookingRow : current;
    });
  }, []);

  const masterCalendarTypeOptions: MasterCalendarTypeOption[] = useMemo(
    () => [
      { value: 'all', label: 'All Types' },
      { value: 'meeting', label: 'Meeting' },
      { value: 'conference', label: 'Conference' },
      { value: 'desk', label: 'Desk' },
      { value: 'cabin', label: 'Cabin' },
    ],
    [],
  );

  const masterCalendarTypeFilteredRooms = useMemo(() => {
    if (masterCalendarType === 'all') return enabledRoomCatalog;
    return enabledRoomCatalog.filter((room) => normalizeMasterCalendarRoomType(room.type || '') === masterCalendarType);
  }, [enabledRoomCatalog, masterCalendarType]);

  const masterCalendarFloorOptions = useMemo(() => {
    const floors = Array.from(
      new Set(masterCalendarTypeFilteredRooms.map((room) => String(room.floor || '').trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return ['All Floors', ...floors];
  }, [masterCalendarTypeFilteredRooms]);

  const masterCalendarWingOptions = useMemo(() => {
    const sourceRooms = masterCalendarTypeFilteredRooms.filter((room) => (
      masterCalendarFloor === 'All Floors' || String(room.floor || '').trim() === masterCalendarFloor
    ));
    const wings = Array.from(
      new Set(sourceRooms.map((room) => String(room.wing || '').trim().toUpperCase()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
    return ['All Wings', ...wings];
  }, [masterCalendarFloor, masterCalendarTypeFilteredRooms]);

  const bookingCalendarRoomOptions = useMemo(() => {
    const filteredRooms = masterCalendarTypeFilteredRooms.filter((room) => {
      const floor = String(room.floor || '').trim();
      const wing = String(room.wing || '').trim().toUpperCase();
      if (masterCalendarFloor !== 'All Floors' && floor !== masterCalendarFloor) return false;
      if (masterCalendarWing !== 'All Wings' && wing !== masterCalendarWing) return false;
      return true;
    });

    const uniqueRooms = Array.from(
      new Map(filteredRooms.filter((room) => room.name).map((room) => [room.name, room])).values(),
    ).sort((a, b) => a.name.localeCompare(b.name));

    return ['All Rooms', ...uniqueRooms.map((room) => ({ value: room.name, label: formatRoomScopeLabel(room) }))];
  }, [masterCalendarFloor, masterCalendarTypeFilteredRooms, masterCalendarWing]);

  const masterCalendarScopeSummary = useMemo(() => {
    const typeLabel = masterCalendarTypeOptions.find((option) => option.value === masterCalendarType)?.label || 'All Types';
    return [typeLabel, masterCalendarFloor, masterCalendarWing, masterCalendarRoom].join(' • ');
  }, [masterCalendarFloor, masterCalendarRoom, masterCalendarType, masterCalendarTypeOptions, masterCalendarWing]);

  const matchesMasterCalendarFilters = useCallback(
    (row: BookingRow) => {
      const roomName = String(row.resourceName || resolveBookingRoomName(row.raw as Record<string, unknown>)).trim();
      if (!roomName) return false;

      if (enabledRoomNameSet.size > 0 && !enabledRoomNameSet.has(roomName)) return false;
      if (masterCalendarRoom !== 'All Rooms' && roomName !== masterCalendarRoom) return false;

      const roomMeta = roomLookup.get(roomName) || null;
      const roomType = normalizeMasterCalendarRoomType(roomMeta?.type || row.resourceType || '');
      if (masterCalendarType !== 'all' && roomType !== masterCalendarType) return false;

      const floor = String(roomMeta?.floor || row.roomFloor || '').trim();
      if (masterCalendarFloor !== 'All Floors' && floor !== masterCalendarFloor) return false;

      const wing = String(roomMeta?.wing || row.roomWing || '').trim().toUpperCase();
      if (masterCalendarWing !== 'All Wings' && wing !== masterCalendarWing) return false;

      return true;
    },
    [enabledRoomNameSet, masterCalendarFloor, masterCalendarRoom, masterCalendarType, masterCalendarWing, roomLookup],
  );

  const masterCalendarMonthMeta: MasterCalendarMonthMeta = useMemo(() => {
    const firstDay = new Date(masterCalendarYear, masterCalendarMonth, 1);
    return {
      label: firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      daysInMonth: new Date(masterCalendarYear, masterCalendarMonth + 1, 0).getDate(),
      firstDayOfMonth: firstDay.getDay(),
      monthKey: `${masterCalendarYear}-${String(masterCalendarMonth + 1).padStart(2, '0')}`,
    };
  }, [masterCalendarMonth, masterCalendarYear]);

  const selectedMasterCalendarBookings = useMemo(() => {
    if (!masterCalendarDateKey) return [];
    return bookingCalendarRows
      .filter((row) => {
        const key = formatDateOnly(row.date);
        if (key !== masterCalendarDateKey) return false;
        return matchesMasterCalendarFilters(row);
      })
      .sort((a, b) => {
        const leftMinutes = timeStringToMinutes(a.startTime || '00:00') ?? 0;
        const rightMinutes = timeStringToMinutes(b.startTime || '00:00') ?? 0;
        return leftMinutes - rightMinutes;
      });
  }, [bookingCalendarRows, masterCalendarDateKey, matchesMasterCalendarFilters]);

  useEffect(() => {
    const validRoomValues = new Set(
      bookingCalendarRoomOptions
        .map((option) => (typeof option === 'string' ? option : option.value))
        .filter(Boolean),
    );
    if (!validRoomValues.has(masterCalendarRoom)) {
      setMasterCalendarRoom('All Rooms');
    }
  }, [bookingCalendarRoomOptions, masterCalendarRoom]);

  useEffect(() => {
    if (!masterCalendarFloorOptions.includes(masterCalendarFloor)) {
      setMasterCalendarFloor('All Floors');
    }
  }, [masterCalendarFloor, masterCalendarFloorOptions]);

  useEffect(() => {
    if (!masterCalendarWingOptions.includes(masterCalendarWing)) {
      setMasterCalendarWing('All Wings');
    }
  }, [masterCalendarWing, masterCalendarWingOptions]);

  const trackerPeriods = useMemo(() => {
    const map = new Map<string, TrackerPeriod>();
    internalDepartmentRows.forEach((row) => {
      const parsed = parseBookingDate(row.date);
      if (!parsed) return;
      const key = `${parsed.getFullYear()}-${parsed.getMonth()}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          month: String(parsed.getMonth()),
          year: String(parsed.getFullYear()),
          label: formatMonthYear(parsed),
          sortValue: parsed.getFullYear() * 12 + parsed.getMonth(),
        });
      }
    });

    return [...map.values()].sort((a, b) => a.sortValue - b.sortValue);
  }, [internalDepartmentRows]);

  useEffect(() => {
    if (trackerMonth && trackerYear) return;
    if (!trackerPeriods.length) return;
    const latest = trackerPeriods[trackerPeriods.length - 1];
    setTrackerMonth(latest.month);
    setTrackerYear(latest.year);
  }, [trackerMonth, trackerPeriods, trackerYear]);

  const departmentTrackerRows = useMemo(() => {
    if (!trackerMonth || !trackerYear) return [];
    return internalDepartmentRows.filter((row) => {
      const parsed = parseBookingDate(row.date);
      if (!parsed) return false;
      return String(parsed.getMonth()) === trackerMonth && String(parsed.getFullYear()) === trackerYear;
    });
  }, [internalDepartmentRows, trackerMonth, trackerYear]);

  const departmentTrackerSummary = useMemo(() => {
    const groups = new Map<string, TrackerDepartmentRow>(
      departmentCatalog.map((dept) => [dept.name, {
        department: dept.name,
        bookings: 0,
        totalSeats: 0,
        resources: new Set<string>(),
      }]),
    );

    departmentTrackerRows.forEach((row) => {
      const departmentValue = normalize(row.department || '');
      const matchedDepartment = departmentCatalog.find((entry) =>
        entry.name.toLowerCase() === departmentValue ||
        entry.aliases.some((alias) => departmentValue.includes(alias)),
      );

      if (!matchedDepartment) return;

      const current = groups.get(matchedDepartment.name);
      if (!current) return;
      if (statusLabel(row.status) !== 'Completed') return;

      current.bookings += 1;
    });

    return [...groups.values()].sort((a, b) => b.bookings - a.bookings || a.department.localeCompare(b.department));
  }, [departmentTrackerRows]);

  const departmentTrackerTotals: TrackerTotals = useMemo(() => {
    return departmentTrackerRows.reduce(
      (totals, row) => {
        totals.bookings += 1;
        const category = roleCategory(row.role || '');
        if (category === 'owner') totals.owner += 1;
        else if (category === 'superAdmin') totals.superAdmin += 1;
        else if (category === 'admin') totals.admin += 1;
        return totals;
      },
      { bookings: 0, owner: 0, superAdmin: 0, admin: 0 },
    );
  }, [departmentTrackerRows]);

  const visibleRows = useMemo(() => {
    const query = normalize(searchQuery);
    if (activeScope === 'tenant') {
      return tenantRows.filter((row) => {
        const liveStatus = getLiveMeetingStatus(row as unknown as Record<string, unknown>);
        const matchesSearch = !query || [
          row.companyName,
          row.resourceName,
          row.date,
          row.timeSlot,
          row.location,
          row.roomWing,
          row.bookingCode,
          row.bookingNotes,
        ].join(' ').toLowerCase().includes(query);
        const matchesStatus = activeTab === 'All' || liveStatus === activeTab;
        return matchesSearch && matchesStatus;
      });
    }

    const source = activeScope === 'history' ? historyRows : (activeScope === 'internal' ? internalDepartmentRows : externalRows);
    return source.filter((row) => {
      const matchesSearch = !query || [
        row.id,
        row.bookingCode,
        row.resourceName,
        row.bookedBy,
        row.company,
        row.companyName,
        row.clientCompany,
        row.department,
        row.notes,
        row.bookingNotes,
        row.bookedByEmail,
        row.bookedByPhone,
        row.sourceReference,
      ].join(' ').toLowerCase().includes(query);
      const matchesResource = resourceFilter === 'All Resources' || row.resourceType === resourceFilter;
      const matchesType = bookingTypeFilter === 'All Types' || row.bookingType === bookingTypeFilter;
      const matchesStatus = activeTab === 'All' || row.status === statusLabel(activeTab);
      return matchesSearch && matchesResource && matchesType && matchesStatus;
    });
  }, [activeScope, activeTab, externalRows, historyRows, internalDepartmentRows, bookingTypeFilter, resourceFilter, searchQuery, tenantRows]);

  const stats = useMemo(() => {
    if (activeScope === 'tenant') {
      const tenantBooked = tenantRows.filter((row) => getLiveMeetingStatus(row as unknown as Record<string, unknown>) === 'Booked').length;
      const tenantInProgress = tenantRows.filter((row) => getLiveMeetingStatus(row as unknown as Record<string, unknown>) === 'In Progress').length;
      const tenantCompleted = tenantRows.filter((row) => getLiveMeetingStatus(row as unknown as Record<string, unknown>) === 'Completed').length;
      return [
        { label: 'Total Bookings', value: tenantRows.length, icon: Building2 },
        { label: 'Booked', value: tenantBooked, icon: CalendarDays },
        { label: 'In Progress', value: tenantInProgress, icon: Clock },
        { label: 'Completed', value: tenantCompleted, icon: CheckCircle2 },
      ] as StatItem[];
    }
    const source = activeScope === 'history' ? historyRows : (activeScope === 'internal' ? internalDepartmentRows : externalRows);
    return [
      { label: 'Upcoming Bookings', value: source.filter((b) => b.category === 'upcoming').length, icon: CalendarDays },
      { label: 'Completed', value: source.filter((b) => b.category === 'completed').length, icon: CheckCircle2 },
      { label: 'History', value: source.filter((b) => b.category === 'history').length, icon: Clock },
      { label: 'Resource Types', value: new Set(source.map((b) => b.resourceType)).size, icon: LayoutGrid },
    ] as StatItem[];
  }, [activeScope, externalRows, historyRows, internalDepartmentRows, tenantRows]);

  // Backend service - uncomment when backend is ready:
  /*
  const handleExportBookingsReport = async (format = 'PDF') => {
    const reportFormat = String(format).toLowerCase() === 'excel' ? 'Excel' : 'PDF';
    if (visibleRows.length === 0) {
      alert('No booking rows are available for export.');
      return;
    }

    setIsExportingReport(reportFormat);
    try {
      const response = await createReport({
        title: `Administration ${activeScope === 'tenant' ? 'Tenant Companies' : activeScope === 'external' ? 'External Bookings' : activeScope === 'history' ? 'Booking History' : 'Internal Department Bookings'}`,
        department: 'Administration',
        category: 'Other',
        dataWindow: 'Custom',
        reportMonth: new Date().toISOString().slice(0, 7),
        period: activeScope === 'tenant' ? 'Tenant Companies' : activeScope === 'external' ? 'External Bookings' : activeScope === 'history' ? 'Booking History' : 'Internal Department Bookings',
        generatedBy: (storedUser as any)?.fullName || (storedUser as any)?.name || 'Administration Manager',
        format: reportFormat,
        description: 'Administration bookings export for the current filtered view.',
        sourceType: 'custom',
        sourceRef: `administration-bookings-${activeScope}`,
        reportRows: buildBookingExportRows(visibleRows, activeScope === 'tenant' ? 'Tenant Companies' : activeScope === 'external' ? 'External Bookings' : activeScope === 'history' ? 'Booking History' : 'Internal Department Bookings', {
          activeTab,
          resourceFilter,
          bookingTypeFilter,
          searchQuery,
        }),
        monthlyData: [],
      });

      if (reportFormat === 'PDF') {
        await downloadReportFile((response as any)?.data?.download, { openInNewTab: false });
      }

      window.dispatchEvent(new Event('reports:refresh'));

      alert(reportFormat === 'PDF' ? 'Bookings report saved to Reports.' : 'Bookings report saved to Reports. Preview it before downloading.');
    } catch (error: any) {
      alert(error?.message || 'Unable to export bookings report.');
    } finally {
      setIsExportingReport('');
    }
  };
  */

  const handleExportBookingsReport = async (format = 'PDF') => {
    alert('Export UI only - Backend integration pending.');
    setIsExportingReport('');
  };

  // Backend service - uncomment when backend is ready:
  /*
  const handleExportBookingReport = async (booking: Record<string, unknown> | null = null, format = 'PDF') => {
    if (!booking) return;

    const reportFormat = String(format).toLowerCase() === 'excel' ? 'Excel' : 'PDF';
    setIsExportingReport(reportFormat);
    try {
      const response = await createReport({
        title: `${booking.resourceName || booking.companyName || 'Booking'} Details`,
        department: 'Administration',
        category: 'Other',
        dataWindow: 'Custom',
        reportMonth: new Date().toISOString().slice(0, 7),
        period: 'Booking Detail',
        generatedBy: (storedUser as any)?.fullName || (storedUser as any)?.name || 'Administration Manager',
        format: reportFormat,
        description: `${booking.resourceName || booking.companyName || 'Booking'} detail report.`,
        sourceType: 'custom',
        sourceRef: String(booking.bookingCode || booking.id || '').trim(),
        reportRows: buildBookingDetailExportRows(booking),
        monthlyData: [],
      });

      if (reportFormat === 'PDF') {
        await downloadReportFile((response as any)?.data?.download, { openInNewTab: false });
      }

      window.dispatchEvent(new Event('reports:refresh'));

      alert(reportFormat === 'PDF' ? 'Booking report saved to Reports.' : 'Booking report saved to Reports. Preview it before downloading.');
    } catch (error: any) {
      alert(error?.message || 'Unable to export booking report.');
    } finally {
      setIsExportingReport('');
    }
  };
  */

  const handleExportBookingReport = async (booking: Record<string, unknown> | null = null, format = 'PDF') => {
    if (!booking) return;
    alert('Export UI only - Backend integration pending.');
    setIsExportingReport('');
  };

  const currentBookingInvites = useMemo(() => {
    if (!viewingDetails || isExternalBooking(viewingDetails as unknown as Record<string, unknown>) || viewingDetails.bookingType !== 'Internal') return [];
    const invites = Array.isArray(viewingDetails.invites) ? viewingDetails.invites : [];
    return [...invites].sort((a, b) => {
      const statusDelta = inviteSortWeight(a.status) - inviteSortWeight(b.status);
      if (statusDelta !== 0) return statusDelta;
      return new Date(a.respondedAt || a.invitedAt || 0).getTime() - new Date(b.respondedAt || b.invitedAt || 0).getTime();
    });
  }, [viewingDetails]);

  const currentBookingInviteCounts: InviteCounts = useMemo(() => {
    return currentBookingInvites.reduce(
      (counts, invite) => {
        const label = inviteStatusLabel(invite.status);
        if (label === 'Approved') counts.approved += 1;
        else if (label === 'Rejected') counts.rejected += 1;
        else counts.pending += 1;
        return counts;
      },
      { pending: 0, approved: 0, rejected: 0 },
    );
  }, [currentBookingInvites]);

  const bookingActionPreview: AvailabilityResult | null = useMemo(() => {
    if (!reschedulingBooking) return null;

    const baseDate = reschedulingBooking.dateKey || formatDateOnly(reschedulingBooking.date) || '';
    const baseStartTime = reschedulingBooking.startTime || '';

    if (bookingActionMode === 'extend') {
      const extraMinutes = Number(extendForm.extraMinutes || 0);
      const currentEndMinutes = timeStringToMinutes(reschedulingBooking.endTime);
      if (!currentEndMinutes || !extraMinutes || extraMinutes <= 0) {
        return { available: false, conflicts: [], reason: 'Choose how long to extend the booking.', mode: 'extend' };
      }

      const nextEndMinutes = currentEndMinutes + extraMinutes;
      if (nextEndMinutes > 24 * 60) {
        return { available: false, conflicts: [], reason: 'This extension would go past midnight.', mode: 'extend' };
      }

      const nextEndTime = minutesToTimeString(nextEndMinutes);
      const availability = buildMeetingRoomAvailability(allRows, reschedulingBooking as unknown as Record<string, unknown>, baseDate, baseStartTime, nextEndTime);
      return { ...availability, mode: 'extend', nextDate: baseDate, nextStartTime: baseStartTime, nextEndTime, extraMinutes };
    }

    const timeValidation = getBookingTimeValidation(rescheduleForm.newDate, rescheduleForm.newStartTime);
    if (!timeValidation.valid) {
      return { available: false, conflicts: [], reason: timeValidation.reason, mode: 'reschedule' };
    }

    if (!rescheduleForm.newDate || !rescheduleForm.newStartTime || !rescheduleForm.newEndTime) {
      return { available: false, conflicts: [], reason: 'Choose a new date, start time, and end time.', mode: 'reschedule' };
    }

    const startMinutes = timeStringToMinutes(rescheduleForm.newStartTime);
    if (startMinutes == null) {
      return { available: false, conflicts: [], reason: 'Choose a valid start time.', mode: 'reschedule' };
    }

    const endMinutes = timeStringToMinutes(rescheduleForm.newEndTime);
    if (endMinutes == null) {
      return { available: false, conflicts: [], reason: 'Choose a valid end time.', mode: 'reschedule' };
    }

    if (endMinutes <= startMinutes) {
      return { available: false, conflicts: [], reason: 'End time must be after the start time.', mode: 'reschedule' };
    }

    if (!isAlignedToBookingStep(startMinutes) || !isAlignedToBookingStep(endMinutes)) {
      return { available: false, conflicts: [], reason: `${BOOKING_SLOT_STEP_MINUTES}-minute slots only (for example 12:20, 12:25, 12:30).`, mode: 'reschedule' };
    }

    if (endMinutes - startMinutes < BOOKING_MIN_DURATION_MINUTES) {
      return { available: false, conflicts: [], reason: `Minimum booking duration is ${BOOKING_MIN_DURATION_MINUTES} minutes.`, mode: 'reschedule' };
    }

    const availability = buildMeetingRoomAvailability(allRows, reschedulingBooking as unknown as Record<string, unknown>, rescheduleForm.newDate, rescheduleForm.newStartTime, rescheduleForm.newEndTime);
    return {
      ...availability,
      mode: 'reschedule',
      nextDate: rescheduleForm.newDate,
      nextStartTime: rescheduleForm.newStartTime,
      nextEndTime: rescheduleForm.newEndTime,
      durationMinutes: endMinutes - startMinutes,
    };
  }, [allRows, bookingActionMode, extendForm.extraMinutes, rescheduleForm, reschedulingBooking]);

  const rescheduleStartTimeOptions = useMemo(
    () => buildBookingTimeOptions('00:00', '23:55', BOOKING_SLOT_STEP_MINUTES),
    [],
  );
  const rescheduleEndTimeOptions = useMemo(() => {
    const startMinutes = timeStringToMinutes(rescheduleForm.newStartTime);
    if (startMinutes == null) return buildBookingTimeOptions('00:00', '23:55', BOOKING_SLOT_STEP_MINUTES);
    return buildBookingTimeOptions(minutesToTimeString(startMinutes + BOOKING_MIN_DURATION_MINUTES), '23:55', BOOKING_SLOT_STEP_MINUTES);
  }, [rescheduleForm.newStartTime]);

  // Backend service - uncomment when backend is ready:
  /*
  const handleCancelBooking = async () => {
    if (!cancellingBooking || !cancelForm.reason) return;

    setSavingBookingUpdate(true);
    setBookingUpdateError('');

    const bookingId = cancellingBooking.recordId || cancellingBooking.id;

    try {
      const response = await updateMeetingRoomBooking(bookingId, {
        status: 'cancelled',
        cancelReason: cancelForm.reason.trim(),
      });
      const updatedBooking = (response as any)?.data?.booking || (response as any)?.booking || null;

      if (updatedBooking) {
        setInternalBookings((prev) => prev.map((booking) => {
          const currentId = String(booking.recordId || booking.id);
          return currentId === bookingId ? updatedBooking : booking;
        }));
      } else {
        await syncBookings();
      }

      setCancellingBooking(null);
      setCancelForm({ reason: '', refundType: 'Full' });
      setLastSyncedAt(new Date());
    } catch (error: any) {
      setBookingUpdateError(error?.message || 'Unable to cancel this booking right now.');
    } finally {
      setSavingBookingUpdate(false);
    }
  };
  */

  const handleCancelBooking = async () => {
    if (!cancellingBooking || !cancelForm.reason) return;
    alert('Cancel UI only - Backend integration pending.');
    setCancellingBooking(null);
    setCancelForm({ reason: '', refundType: 'Full' });
    setSavingBookingUpdate(false);
  };

  // Backend service - uncomment when backend is ready:
  /*
  const handleRescheduleBooking = async () => {
    if (!reschedulingBooking || !bookingActionPreview?.available) return;

    setSavingBookingUpdate(true);
    setBookingUpdateError('');

    const bookingId = reschedulingBooking.recordId || reschedulingBooking.id;
    const payload = bookingActionMode === 'extend'
      ? { endTime: bookingActionPreview.nextEndTime, status: 'in progress' }
      : { date: bookingActionPreview.nextDate, startTime: bookingActionPreview.nextStartTime, endTime: bookingActionPreview.nextEndTime, status: 'rescheduled' };

    try {
      const response = await updateMeetingRoomBooking(bookingId, payload);
      const updatedBooking = (response as any)?.data?.booking || (response as any)?.booking || null;
      if (updatedBooking) {
        setInternalBookings((prev) => prev.map((booking) => {
          const currentId = String(booking.recordId || booking.id);
          return currentId === bookingId ? updatedBooking : booking;
        }));
      } else {
        await syncBookings();
      }

      alert(
        bookingActionMode === 'extend'
          ? 'System: Booking extended successfully. Booker and invited members have been notified.'
          : 'System: Booking rescheduled successfully. Booker and invited members have been notified.',
      );

      setReschedulingBooking(null);
      setBookingActionMode('reschedule');
      setRescheduleForm({ newDate: '', newStartTime: '', newEndTime: '' });
      setExtendForm({ extraMinutes: '30' });
      setLastSyncedAt(new Date());
    } catch (error: any) {
      setBookingUpdateError(error?.message || 'Unable to update booking right now.');
    } finally {
      setSavingBookingUpdate(false);
    }
  };
  */

  const handleRescheduleBooking = async () => {
    if (!reschedulingBooking || !bookingActionPreview?.available) return;
    alert('Reschedule/Extend UI only - Backend integration pending.');
    setReschedulingBooking(null);
    setBookingActionMode('reschedule');
    setRescheduleForm({ newDate: '', newStartTime: '', newEndTime: '' });
    setExtendForm({ extraMinutes: '30' });
    setSavingBookingUpdate(false);
  };

  const handleMasterCalendarPrevMonth = () => {
    const nextMonth = masterCalendarMonth - 1;
    const nextYear = nextMonth < 0 ? masterCalendarYear - 1 : masterCalendarYear;
    const normalizedMonth = (nextMonth + 12) % 12;
    setMasterCalendarYear(nextYear);
    setMasterCalendarMonth(normalizedMonth);
    setMasterCalendarDateKey(`${nextYear}-${String(normalizedMonth + 1).padStart(2, '0')}-01`);
  };

  const handleMasterCalendarNextMonth = () => {
    const nextMonth = masterCalendarMonth + 1;
    const nextYear = nextMonth > 11 ? masterCalendarYear + 1 : masterCalendarYear;
    const normalizedMonth = nextMonth % 12;
    setMasterCalendarYear(nextYear);
    setMasterCalendarMonth(normalizedMonth);
    setMasterCalendarDateKey(`${nextYear}-${String(normalizedMonth + 1).padStart(2, '0')}-01`);
  };

  return (
    <AppShell>
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        {loadingInternal ? (
          <BookingsSkeleton />
        ) : (
          <PageFrame>
            <div className="flex flex-col gap-4">

            {/* ── Header ────────────────────────────────────────────── */}
            <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
              <div>
                <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                  Administration Meeting Room Bookings
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-1">View meeting room bookings Internal, External, and Tenant.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingCalendar(true)}
                  className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-blue-50 hover:border-blue-200 text-slate-500 transition-all active:scale-95 shadow-sm"
                >
                  <CalendarDays size={16} />
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500 text-white px-1.5 py-0.5 rounded">CALENDAR</span>
                </button>
                 <button
                                type="button"
                                // onClick={handleExportPDF}
                                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-red-50 hover:border-red-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                                <FileDown size={16} className="text-red-500"/>
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white px-1.5 py-0.5 rounded">PDF</span>
                              </button>
                              <button
                                type="button"
                                // onClick={handleExportExcel}
                                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                                <FileSpreadsheet size={16} className="text-emerald-500"/>
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white px-1.5 py-0.5 rounded">EXCEL</span>
                              </button>

              </div>
            </div>

            {/* ── Scope Tabs (pill tabs) ────────────────────────────── */}
            <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
              {scopeTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setActiveScope(tab.key); setActiveTab('All'); setSearchQuery(''); }}
                  className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${
                    activeScope === tab.key
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Stat Cards ────────────────────────────────────────── */}
            <div className="mb-3 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
              {stats.map((stat, idx) => {
                const Icon = stat.icon;
                const borderColors = ['', 'border-l-4 border-l-blue-500', 'border-l-4 border-l-emerald-500', 'border-l-4 border-l-amber-500'];
                const iconClasses = ['bg-slate-50 text-slate-600', 'bg-blue-50 text-blue-600', 'bg-emerald-50 text-emerald-600', 'bg-amber-50 text-amber-600'];
                return (
                  <div key={stat.label} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${borderColors[idx] || ''}`}>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-[15px] font-black text-slate-900">{stat.value}</p>
                    </div>
                    <div className={`p-2 rounded-2xl ${iconClasses[idx] || 'bg-slate-50 text-slate-600'} shrink-0`}>
                      <Icon size={16} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Department Tracker (internal scope) ──────────────── */}
            {activeScope === 'internal' && trackerPeriods.length > 0 && (
              <div className="mb-3 rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                    <FileText size={14} className="mr-2 inline-block" />
                    Department Tracker
                  </h3>
                  <div className="flex items-center gap-2">
                    <select
                      className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
                      value={trackerMonth}
                      onChange={(e) => setTrackerMonth(e.target.value)}
                    >
                      {trackerPeriods.map((period) => (
                        <option key={period.key} value={period.month}>
                          {period.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <table className="w-full table-auto text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-3 py-4">Department</th>
                      <th className="px-3 py-4 text-center">Bookings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {departmentTrackerSummary.map((dept) => (
                      <tr key={dept.department} className="hover:bg-blue-50/30 transition-all group">
                        <td className="px-3 py-4 text-xs font-bold text-slate-900">{dept.department}</td>
                        <td className="px-3 py-4 text-center text-xs font-bold text-slate-900">{dept.bookings}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50/50">
                    <tr>
                      <td className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Totals</td>
                      <td className="px-3 py-4 text-center text-xs font-black text-slate-900">{departmentTrackerTotals.bookings}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* ── Data Panel ──────────────────────────────────────── */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              {/* ── Panel Header ── */}
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                  {/* ── Sub-tabs: Status ── */}
                  <div className="flex items-center gap-1 rounded-2xl bg-slate-100/70 p-1">
                    {(activeScope === 'tenant' ? tenantStatusOptions : bookingStatusOptions).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setActiveTab(status)}
                        className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                          activeTab === status
                            ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                            : 'bg-transparent text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                  {activeScope !== 'tenant' && (
                    <>
                      <select
                        className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
                        value={resourceFilter}
                        onChange={(e) => setResourceFilter(e.target.value)}
                      >
                        {resourceOptions.map((opt) => (
                          <option key={opt}>{opt}</option>
                        ))}
                      </select>
                      <select
                        className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
                        value={bookingTypeFilter}
                        onChange={(e) => setBookingTypeFilter(e.target.value)}
                      >
                        {bookingTypeOptions.map((opt) => (
                          <option key={opt}>{opt}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative min-w-[200px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder={activeScope === 'tenant' ? 'Search company, resource, date...' : 'Search bookings...'}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* ── Bookings Table ──────────────────────────────────── */}
              <table className="w-full table-auto text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-3 py-4 whitespace-nowrap">Resource</th>
                    {activeScope === 'tenant' && <th className="px-3 py-4 whitespace-nowrap">Company</th>}
                    <th className="px-3 py-4 whitespace-nowrap">Schedule</th>
                    <th className="px-3 py-4 whitespace-nowrap">Booked By</th>
                    {activeScope !== 'tenant' && <th className="px-3 py-4 whitespace-nowrap">Company / Dept</th>}
                    <th className="px-3 py-4 text-center whitespace-nowrap">Status</th>
                    {activeScope !== 'tenant' && <th className="px-3 py-4 text-center whitespace-nowrap">Type</th>}
                    <th className="px-3 py-4 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={activeScope === 'tenant' ? 5 : 7} className="px-3 py-20 text-center font-bold text-slate-400">
                        No bookings found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row) => {
                      const liveStatus = activeScope === 'tenant' ? getLiveMeetingStatus(row as unknown as Record<string, unknown>) : row.status;
                      const actionMode = getInternalActionMode(row as unknown as Record<string, unknown>);
                      const isExternal = isExternalBooking(row as unknown as Record<string, unknown>);
                      const canManage = canManageExternalBooking(row as unknown as Record<string, unknown>);
                      return (
                        <tr key={row.id || row.bookingCode} className="hover:bg-blue-50/30 transition-all group">
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm">
                                <MapPin size={14} />
                              </div>
                              <div>
                                <div className="font-black text-slate-900 text-sm">{row.resourceName}</div>
                                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">
                                  {row.resourceType}{row.resourceLocation ? ` • ${row.resourceLocation}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          {activeScope === 'tenant' && (
                            <td className="px-3 py-4">
                              <span className="font-black text-slate-900 text-sm">{row.companyName || row.company}</span>
                            </td>
                          )}
                          <td className="px-3 py-4">
                            {renderScheduleSummary(row as unknown as Record<string, unknown>, { showDate: true })}
                          </td>
                          <td className="px-3 py-4">
                            <div className="font-bold text-slate-800 text-xs">{row.bookedBy || '-'}</div>
                            <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                              {row.role || 'Manager'}
                            </div>
                          </td>
                          {activeScope !== 'tenant' && (
                            <td className="px-3 py-4">
                              <span className="font-black text-slate-900 text-sm">{row.company || row.department}</span>
                            </td>
                          )}
                          <td className="px-3 py-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${statusBadge(liveStatus)}`}>
                              {liveStatus}
                            </span>
                          </td>
                          {activeScope !== 'tenant' && (
                            <td className="px-3 py-4 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${bookingTypeBadgeClass(row.bookingType)}`}>
                                {row.bookingType}
                              </span>
                            </td>
                          )}
                          <td className="px-3 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setViewingDetails(row)}
                                className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all shadow-sm"
                                title="View Details"
                              >
                                <Eye size={14} />
                              </button>
                              {activeScope === 'internal' && actionMode && (
                                <button
                                  onClick={() => { setReschedulingBooking(row); setBookingActionMode(actionMode); }}
                                  className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all shadow-sm"
                                  title={actionMode === 'extend' ? 'Extend Booking' : 'Reschedule Booking'}
                                >
                                  <Clock size={14} />
                                </button>
                              )}
                              {(activeScope === 'internal' || isExternal) && (canManage || (activeScope === 'internal' && liveStatus !== 'Completed' && liveStatus !== 'Cancelled')) && (
                                <button
                                  onClick={() => setCancellingBooking(row)}
                                  className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all shadow-sm"
                                  title="Cancel Booking"
                                >
                                  <XCircle size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleExportBookingReport(row as unknown as Record<string, unknown>, 'PDF')}
                                disabled={Boolean(isExportingReport)}
                                className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                                title="Export Booking Report"
                              >
                                <FileText size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            </div>
          </PageFrame>
        )}
      </div>

      {/* ── View Details Modal ───────────────────────────────────────── */}
      {viewingDetails && (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/70 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <Building2 className="text-blue-600" size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{viewingDetails.resourceName || 'Booking Details'}</h2>
                  <div className="mt-1 flex items-center gap-3">
                    <span className={`inline-flex rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusBadge(viewingDetails.status)}`}>{viewingDetails.status}</span>
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                      <MapPin size={12} /> {viewingDetails.resourceType}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportBookingReport(viewingDetails as unknown as Record<string, unknown>, 'PDF')}
                  disabled={Boolean(isExportingReport)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >PDF</button>
                <button
                  type="button"
                  onClick={() => handleExportBookingReport(viewingDetails as unknown as Record<string, unknown>, 'Excel')}
                  disabled={Boolean(isExportingReport)}
                  className="rounded-xl bg-[#2563EB] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >Excel</button>
                <button
                  type="button"
                  onClick={() => setViewingDetails(null)}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-100"
                ><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <section>
                    <h4 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Booking Information</h4>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                      <InfoRow label="Booking Code" value={viewingDetails.bookingCode || '-'} />
                      <InfoRow label="Resource" value={viewingDetails.resourceName || '-'} />
                      <InfoRow label="Resource Type" value={viewingDetails.resourceType || '-'} />
                      <InfoRow label="Date" value={formatDisplayDate(viewingDetails.date) || '-'} />
                      <InfoRow label="Time Slot" value={viewingDetails.timeSlot || '-'} />
                      <InfoRow label="Duration" value={viewingDetails.durationMinutes ? `${viewingDetails.durationMinutes} min` : '-'} />
                      <InfoRow label="Location" value={viewingDetails.resourceLocation || '-'} />
                      <InfoRow label="Booking Type" value={viewingDetails.bookingType || '-'} />
                      <InfoRow label="Source" value={viewingDetails.source || '-'} />
                      <InfoRow label="Source Reference" value={viewingDetails.sourceReference || '-'} />
                    </div>
                  </section>
                  <section>
                    <h4 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Booked By</h4>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                      <InfoRow label="Name" value={viewingDetails.bookedBy || '-'} />
                      <InfoRow label="Email" value={viewingDetails.bookedByEmail || '-'} />
                      <InfoRow label="Phone" value={viewingDetails.bookedByPhone || '-'} />
                      <InfoRow label="Role" value={viewingDetails.role || '-'} />
                      <InfoRow label="Company" value={viewingDetails.companyName || viewingDetails.company || '-'} />
                      <InfoRow label="Department" value={viewingDetails.department || '-'} />
                    </div>
                  </section>
                </div>
                <div className="space-y-4">
                  {viewingDetails.bookingType !== 'External' && viewingDetails.bookingType !== 'Tenant' && (
                    <section>
                      <h4 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Invites ({currentBookingInvites.length})
                        {currentBookingInviteCounts.pending > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-700">
                            {currentBookingInviteCounts.pending} pending
                          </span>
                        )}
                      </h4>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        {currentBookingInvites.length === 0 ? (
                          <p className="text-xs font-bold text-slate-400">No invites sent.</p>
                        ) : (
                          <div className="space-y-2">
                            {currentBookingInvites.map((invite, idx) => (
                              <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3">
                                <div>
                                  <p className="text-sm font-bold text-slate-900">{invite.invitedName || 'Employee'}</p>
                                  <p className="text-[10px] font-bold text-slate-500">{invite.invitedRole}{invite.invitedDepartments.length > 0 ? ` • ${invite.invitedDepartments.join(', ')}` : ''}</p>
                                </div>
                                <span className={`inline-flex rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${inviteStatusBadge(invite.status)}`}>
                                  {inviteStatusLabel(invite.status)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                  <section>
                    <h4 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Payment & Invoice</h4>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                      <InfoRow label="Payment Status" value={viewingDetails.paymentStatus || '-'} />
                      {viewingDetails.totalAmount > 0 && (
                        <>
                          <InfoRow label="Base Amount" value={formatCurrency(viewingDetails.baseAmount)} />
                          <InfoRow label="GST" value={formatCurrency(viewingDetails.gstAmount)} />
                          {viewingDetails.extensionAmount > 0 && <InfoRow label="Extension Charges" value={formatCurrency(viewingDetails.extensionAmount)} />}
                          <InfoRow label="Total Amount" value={formatCurrency(viewingDetails.totalAmount)} />
                        </>
                      )}
                      <InfoRow label="Payment Mode" value={viewingDetails.paymentMode || '-'} />
                      {viewingDetails.transactionId && <InfoRow label="Transaction ID" value={viewingDetails.transactionId} />}
                      <InfoRow label="Invoice Status" value={
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${invoiceStatusBadge(viewingDetails.invoiceStatus)}`}>
                          {viewingDetails.invoiceStatus}
                        </span>
                      } />
                      {viewingDetails.invoiceFileUrl && (
                        <div className="mt-2">
                          <a href={viewingDetails.invoiceFileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">
                            <FileText size={12} /> View Invoice
                          </a>
                        </div>
                      )}
                    </div>
                  </section>
                  {viewingDetails.remainingCredits != null && (
                    <section>
                      <h4 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Credits</h4>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        <InfoRow label="Credits Used" value={String(viewingDetails.creditsUsed)} />
                        <InfoRow label="Remaining Credits" value={String(viewingDetails.remainingCredits)} />
                      </div>
                    </section>
                  )}
                  {viewingDetails.notes && (
                    <section>
                      <h4 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Notes</h4>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        <p className="text-sm font-medium text-slate-700">{viewingDetails.notes}</p>
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Booking Modal ─────────────────────────────────────── */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <AlertTriangle size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">Cancel Booking</h2>
              </div>
              <button
                type="button"
                onClick={() => { setCancellingBooking(null); setCancelForm({ reason: '', refundType: 'Full' }); setBookingUpdateError(''); }}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-100"
              ><X size={18} /></button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <p className="text-sm font-bold text-slate-900">{cancellingBooking.resourceName}</p>
                <p className="text-xs font-bold text-slate-500">{formatDisplayDate(cancellingBooking.date)} • {cancellingBooking.timeSlot}</p>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-500">Reason for cancellation</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-red-400"
                  rows={3}
                  placeholder="Enter cancellation reason..."
                  value={cancelForm.reason}
                  onChange={(e) => setCancelForm((prev) => ({ ...prev, reason: e.target.value }))}
                />
              </div>
              {bookingUpdateError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                  {bookingUpdateError}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-6">
              <button
                type="button"
                onClick={() => { setCancellingBooking(null); setCancelForm({ reason: '', refundType: 'Full' }); setBookingUpdateError(''); }}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-100"
              >Keep Booking</button>
              <button
                type="button"
                disabled={!cancelForm.reason || savingBookingUpdate}
                onClick={handleCancelBooking}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingBookingUpdate ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reschedule / Extend Modal ────────────────────────────────── */}
      {reschedulingBooking && (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Clock size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  {bookingActionMode === 'extend' ? 'Extend Booking' : 'Reschedule Booking'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => { setReschedulingBooking(null); setBookingActionMode('reschedule'); setBookingUpdateError(''); }}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-100"
              ><X size={18} /></button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <p className="text-sm font-bold text-slate-900">{reschedulingBooking.resourceName}</p>
                <p className="text-xs font-bold text-slate-500">{formatDisplayDate(reschedulingBooking.date)} • {reschedulingBooking.timeSlot}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBookingActionMode('reschedule')}
                  className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                    bookingActionMode === 'reschedule'
                      ? 'bg-[#2563EB] text-white shadow-md'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200'
                  }`}
                >Reschedule</button>
                <button
                  type="button"
                  onClick={() => setBookingActionMode('extend')}
                  className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                    bookingActionMode === 'extend'
                      ? 'bg-[#2563EB] text-white shadow-md'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200'
                  }`}
                >Extend</button>
              </div>

              {bookingActionMode === 'reschedule' ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3">
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-500">New Date</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-[#2563EB]"
                      value={rescheduleForm.newDate}
                      onChange={(e) => setRescheduleForm((prev) => ({ ...prev, newDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-500">Start Time</label>
                    <select
                      className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-[#2563EB]"
                      value={rescheduleForm.newStartTime}
                      onChange={(e) => setRescheduleForm((prev) => ({ ...prev, newStartTime: e.target.value }))}
                    >
                      <option value="">Select...</option>
                      {rescheduleStartTimeOptions.map((time) => (
                        <option key={time} value={time}>{formatTime12h(time)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-500">End Time</label>
                    <select
                      className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-[#2563EB]"
                      value={rescheduleForm.newEndTime}
                      onChange={(e) => setRescheduleForm((prev) => ({ ...prev, newEndTime: e.target.value }))}
                    >
                      <option value="">Select...</option>
                      {rescheduleEndTimeOptions.map((time) => (
                        <option key={time} value={time}>{formatTime12h(time)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-500">Extra Minutes</label>
                  <select
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-[#2563EB]"
                    value={extendForm.extraMinutes}
                    onChange={(e) => setExtendForm({ extraMinutes: e.target.value })}
                  >
                    {[15, 30, 45, 60, 90, 120, 180].map((mins) => (
                      <option key={mins} value={mins}>{mins} minutes</option>
                    ))}
                  </select>
                </div>
              )}

              {bookingActionPreview && (
                <div className={`rounded-xl border p-3 text-xs font-bold ${bookingActionPreview.available ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {bookingActionPreview.available ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      <span>
                        Room available{bookingActionMode === 'extend' ? ` until ${formatTime12h(bookingActionPreview.nextEndTime || '')}` : ''}!
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle size={14} />
                      <span>{bookingActionPreview.reason}</span>
                    </div>
                  )}
                </div>
              )}

              {bookingUpdateError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                  {bookingUpdateError}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-6">
              <button
                type="button"
                onClick={() => { setReschedulingBooking(null); setBookingActionMode('reschedule'); setBookingUpdateError(''); }}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-100"
              >Cancel</button>
              <button
                type="button"
                disabled={!bookingActionPreview?.available || savingBookingUpdate}
                onClick={handleRescheduleBooking}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingBookingUpdate ? 'Updating...' : bookingActionMode === 'extend' ? 'Confirm Extension' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Master Availability Calendar Modal ───────────────────────── */}
      {viewingCalendar && (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Master Availability Calendar</h2>
                  <p className="text-[10px] font-bold text-slate-500">{masterCalendarScopeSummary}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingCalendar(false)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-100"
              ><X size={18} /></button>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/30 px-6 py-4">
              <select
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                value={masterCalendarType}
                onChange={(e) => { setMasterCalendarType(e.target.value); setMasterCalendarFloor('All Floors'); setMasterCalendarWing('All Wings'); setMasterCalendarRoom('All Rooms'); }}
              >
                {masterCalendarTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                value={masterCalendarFloor}
                onChange={(e) => { setMasterCalendarFloor(e.target.value); setMasterCalendarWing('All Wings'); setMasterCalendarRoom('All Rooms'); }}
              >
                {masterCalendarFloorOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <select
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                value={masterCalendarWing}
                onChange={(e) => { setMasterCalendarWing(e.target.value); setMasterCalendarRoom('All Rooms'); }}
              >
                {masterCalendarWingOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <select
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                value={masterCalendarRoom}
                onChange={(e) => setMasterCalendarRoom(e.target.value)}
              >
                {bookingCalendarRoomOptions.map((opt) => (
                  <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
                    {typeof opt === 'string' ? opt : opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleMasterCalendarPrevMonth}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition-all hover:bg-slate-100"
                ><ChevronLeft size={18} /></button>
                <h3 className="text-lg font-black text-slate-900">{masterCalendarMonthMeta.label}</h3>
                <button
                  type="button"
                  onClick={handleMasterCalendarNextMonth}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition-all hover:bg-slate-100"
                ><ChevronRight size={18} /></button>
              </div>

              <div className="mb-6 grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{day}</div>
                ))}
                {Array.from({ length: masterCalendarMonthMeta.firstDayOfMonth }).map((_, idx) => (
                  <div key={`empty-${idx}`} />
                ))}
                {Array.from({ length: masterCalendarMonthMeta.daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const dateKey = `${masterCalendarMonthMeta.monthKey}-${String(day).padStart(2, '0')}`;
                  const isSelected = dateKey === masterCalendarDateKey;
                  const dayBookings = bookingCalendarRows.filter((row) => formatDateOnly(row.date) === dateKey && matchesMasterCalendarFilters(row));
                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => setMasterCalendarDateKey(dateKey)}
                      className={`flex flex-col items-center rounded-xl p-2 text-xs font-bold transition-all ${
                        isSelected ? 'bg-[#2563EB] text-white shadow-md' : 'hover:bg-blue-50'
                      }`}
                    >
                      <span>{day}</span>
                      {dayBookings.length > 0 && (
                        <span className={`mt-0.5 text-[8px] font-black ${isSelected ? 'text-blue-200' : 'text-blue-600'}`}>
                          {dayBookings.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {masterCalendarDateKey && selectedMasterCalendarBookings.length > 0 && (
                <div>
                  <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">
                    Bookings for {formatDisplayDate(masterCalendarDateKey)}
                  </h4>
                  <div className="space-y-2">
                    {selectedMasterCalendarBookings.map((booking) => (
                      <div key={booking.id || booking.bookingCode} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                            <MapPin size={14} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{booking.resourceName}</p>
                            <p className="text-[10px] font-bold text-slate-500">
                              {formatTime12h(booking.startTime)} - {formatTime12h(booking.endTime)}
                              {booking.bookedBy ? ` • ${booking.bookedBy}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusBadge(getLiveMeetingStatus(booking as unknown as Record<string, unknown>))}`}>
                          {getLiveMeetingStatus(booking as unknown as Record<string, unknown>)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {masterCalendarDateKey && selectedMasterCalendarBookings.length === 0 && (
                <div className="py-10 text-center">
                  <CalendarIcon className="mx-auto mb-2 text-slate-300" size={32} />
                  <p className="text-sm font-bold text-slate-400">No bookings for this date.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ── InfoRow sub-component ─────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: ReactNode | string | number | null | undefined }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <span className="text-xs font-bold text-slate-900">{value ?? '-'}</span>
    </div>
  );
}
