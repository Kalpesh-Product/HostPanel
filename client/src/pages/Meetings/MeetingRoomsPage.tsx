import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search, ChevronDown, Clock, Users, Building,
  Eye, Plus, X, CheckCircle2, AlertCircle, CalendarClock, XCircle, ChevronLeft, ChevronRight, Calendar as CalIcon, Building2
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
import { getWorkspaceMembers } from '../../services/auth';
import {
  createMeetingRoomBooking,
  getMeetingRoomBookings,
  getMyBookings,
  respondToMeetingRoomInvite,
  updateMeetingRoomBooking,
  cancelBooking,
} from '../../services/meeting-room-bookings';


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

const ROOM_TYPE_OPTIONS = ['Meeting Room', 'Conference Room'];
const BOOKING_SLOT_STEP_MINUTES = 5;
const BOOKING_MIN_DURATION_MINUTES = 30;
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

export function MeetingRoomsPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const storedUser = getStoredUser();
  const actingContext = getStoredActingManagerContext(storedUser);
  const location = useLocation();
  // FRONTEND PREVIEW: Default to 'owner' role when no user is stored in localStorage.
  // TODO: Remove this fallback when auth is wired up.
  const membershipRole = (storedUser?.workspaceMembership?.role || storedUser?.role || 'owner').toLowerCase();
  const isOwnerProfile = membershipRole === 'owner';
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
  const canSeeCalendarBookingDetails = isAdministrationManagerProfile;
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
    isAdministrationManagerProfile,
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
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false); // false = skip skeleton in frontend preview
  const [isSavingBooking, setIsSavingBooking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false); // false = render immediately


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
    roomType: '',
    date: '',
    startTime: '',
    endTime: '',
    purpose: '',
    inviteeUserIds: [],
  });
  const [rescheduleData, setRescheduleData] = useState<Partial<Booking>>({});
  const [extendBooking, setExtendBooking] = useState<Booking | null>(null);
  const [extendForm, setExtendForm] = useState<{ extraMinutes: string }>({ extraMinutes: '30' });
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [showRejectInviteDialog, setShowRejectInviteDialog] = useState<boolean>(false);
  const [inviteToReject, setInviteToReject] = useState<Invite | null>(null);
  const [inviteRejectReason, setInviteRejectReason] = useState<string>('');

  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const formatCurrency = (value: any) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));

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

  function resolveMemberName(member?: any) {
    return getEmployeeDisplayName(member).toString().trim();
  }

  function resolveMemberRole(member?: any) {
    return String(member?.role || member?.workspaceRole || member?.membershipRole || 'Employee').trim();
  }

  function resolveMemberDepartments(member?: any) {
    const directDepartments = Array.isArray(member?.departments)
      ? member.departments
      : Array.isArray(member?.workspaceMembership?.departments)
        ? member.workspaceMembership.departments
        : [];

    if (directDepartments.length > 0) {
      return directDepartments
        .map((department: any) => {
          if (!department) return '';
          if (typeof department === 'string') return department;
          return department?.name || department?.label || department?.department || department?.value || '';
        })
        .filter(Boolean);
    }

    const singleDepartment =
      member?.department ||
      member?.workspaceMembership?.department ||
      member?.workspaceDepartment;

    if (singleDepartment) {
      if (typeof singleDepartment === 'string') {
        return [singleDepartment].filter(Boolean);
      }

      return [
        singleDepartment?.name ||
        singleDepartment?.label ||
        singleDepartment?.department ||
        singleDepartment?.value ||
        '',
      ].filter(Boolean);
    }

    return [];
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

  function formatInviteGroupLabel(value?: string) {
    return (value || '')
      .toString()
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase()) || 'General';
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

  function formatDisplayDate(value?: any) {
    if (!value) {
      return '';
    }

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

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }

  function formatTimeSlot(startTime?: string, endTime?: string) {
    const start = formatTime12h(startTime || '');
    const end = formatTime12h(endTime || '');

    if (!startTime && !endTime) {
      return '--:--';
    }

    if (!startTime) {
      return end;
    }

    if (!endTime) {
      return start;
    }

    return `${start} - ${end}`;
  }

  function getScheduleChangeLabel(value?: string) {
    const normalized = normalize(value);
    if (normalized === 'extended') return 'Extended';
    if (normalized === 'rescheduled') return 'Rescheduled';
    return '';
  }

  function renderScheduleSummary(row: any, options: any = {}) {
    const showDate = options.showDate !== false;
    const currentDateLabel = showDate ? formatDisplayDate(row.date) : '';
    const currentTimeLabel = row.checkIn && row.checkOut ? `${row.checkIn} - ${row.checkOut}` : formatTimeSlot(row.startTime, row.endTime);
    const previousDateLabel = showDate ? formatDisplayDate(row.previousDate) : '';
    const previousTimeLabel = formatTimeSlot(row.previousStartTime, row.previousEndTime);
    const changeLabel = getScheduleChangeLabel(row.scheduleChangeType);
    const hasHistory =
      Boolean(row.previousDate || row.previousStartTime || row.previousEndTime) &&
      Boolean(previousTimeLabel);

    if (!hasHistory) {
      return showDate ? (
        <div className="text-[12px] font-semibold text-slate-600 flex flex-col gap-0.5">
          <span className="font-bold text-[#0F172A]">{currentDateLabel}</span>
          <span className="whitespace-nowrap">{currentTimeLabel}</span>
        </div>
      ) : (
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

  function stripRoleSuffix(value?: string) {
    return (value || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
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

  function formatTimeOptionLabel(value: string = '') {
    return formatTime12h(value) || value;
  }

  function isAlignedToStep(totalMinutes: number, stepMinutes: number = BOOKING_SLOT_STEP_MINUTES) {
    return Number.isInteger(totalMinutes) && totalMinutes % stepMinutes === 0;
  }

  function getBookingTimeValidation(dateValue: any, startTimeValue: any, endTimeValue: any) {
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

  function isCurrentUserName(name?: string) {
    if (!name) {
      return false;
    }

    const candidates = [
      normalizeIdentity(managerProfile.name),
      normalizeIdentity(storedUser?.fullName || ''),
      normalizeIdentity(stripRoleSuffix(managerProfile.name)),
      normalizeIdentity(stripRoleSuffix(storedUser?.fullName || '')),
    ];
    const normalizedName = normalizeIdentity(name);
    const normalizedNameBase = normalizeIdentity(stripRoleSuffix(name));

    return candidates.includes(normalizedName) || candidates.includes(normalizedNameBase);
  }

  function normalizeBooking(booking: any): Booking {
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

  function isRescheduledBooking(booking: any) {
    return normalize(booking?.status) === 'rescheduled' || normalize(booking?.storedStatus) === 'rescheduled';
  }

  function isInviteResponseOpen(booking: any) {
    const liveStatus = getBookingDisplayStatus(booking);
    return liveStatus !== 'completed' && liveStatus !== 'cancelled';
  }

  function canManageOwnBooking(booking: any) {
    const liveStatus = getBookingDisplayStatus(booking);
    return liveStatus !== 'completed' && liveStatus !== 'cancelled';
  }

  function canExtendOwnBooking(booking: any) {
    return getBookingDisplayStatus(booking) === 'in progress';
  }

  function canRescheduleOwnBooking(booking: any) {
    return getBookingDisplayStatus(booking) === 'booked';
  }

  function getBookingDisplayStatus(booking: any) {
    if (!booking) {
      return 'booked';
    }

    return booking.liveStatus || booking.status || 'booked';
  }

  function getInviteMeetingLabel(booking: any) {
    const inviteStatus = booking?.currentInviteStatus;

    if (!inviteStatus) {
      return booking?.isInvitedMeeting ? 'Invited Meeting' : '';
    }

    if (inviteStatus === 'accepted') {
      return 'Invited Meeting';
    }

    if (inviteStatus === 'rejected') {
      return 'Rejected Invite';
    }

    if (inviteStatus === 'cancelled') {
      return 'Cancelled Invite';
    }

    if (inviteStatus === 'pending') {
      return 'Pending Invite';
    }

    return inviteStatus;
  }

  function isMyBooking(booking: any) {
    const bookedByUserId = booking?.bookedByUserId ? String(booking.bookedByUserId) : '';
    const currentInviteStatus = booking?.currentInviteStatus || '';
    const hasCurrentInvite = Boolean(currentInviteStatus);
    const isAcceptedInvite = currentInviteStatus === 'accepted';

    if (isDepartmentManagerProfile) {
      return Boolean(
        (bookedByUserId && currentUserId && bookedByUserId === String(currentUserId)) ||
        isAcceptedInvite
      );
    }

    return Boolean(
      (bookedByUserId && currentUserId && bookedByUserId === String(currentUserId)) ||
      isAcceptedInvite,
    );
  }

  function getCurrentUserInvite(booking: any) {
    return (booking?.invites || []).find((invite: any) => invite.invitedUserId === String(currentUserId)) || null;
  }

  function matchesDepartmentScope(bookingDepartment: string = '') {
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
  }

  function hasCurrentUserInvite(booking: any) {
    return Boolean(getCurrentUserInvite(booking));
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

  function isAssignedDeptBooking(booking: any) {
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

    // Assigned department meetings should stay visible here unless the
    // admin accepted the invite, in which case they move to My Bookings.
    return !isAcceptedCurrentUserInvite(booking);
  }

  function isDepartmentBooking(booking: any) {
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
  }

  function isCompanyBooking(booking: any) {
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
  }

  function isBookingInActiveTab(booking: any, tab: string = activeTab) {
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
  }

  function getRoomCapacity(roomName?: string) {
    const room = roomDetails.find((entry) => entry.name === roomName);
    return room?.capacity || null;
  }

  function getRoomCatalogEntry(roomName?: string) {
    return roomCatalog.find((entry) => entry.name === roomName) || roomDetails.find((entry) => entry.name === roomName) || null;
  }

  function getRoomOptionLabel(roomName?: string) {
    const room = getRoomCatalogEntry(roomName);
    if (!room) {
      return roomName;
    }
    const normalizedStatus = String(room.status || '').toLowerCase();
    const hasPricing = Number(room.pricePerHour || 0) > 0 || Number(room.pricePerDay || 0) > 0;
    const hasCredits = Number(room.credits || 0) > 0;

    if (normalizedStatus === 'under maintenance') {
      return `${roomName} - Under Maintenance`;
    }

    if (normalizedStatus === 'disabled' || room.isActive === false) {
      return `${roomName} - Disabled`;
    }

    if (room.activationReady === false || !hasPricing || !hasCredits) {
      return `${roomName} - Pricing/Credits Pending`;
    }

    return `${roomName}${room.floor ? ` - ${room.floor}` : ''}${room.wing ? ` ${room.wing}` : ''}${room.capacity ? ` - ${room.capacity} seats` : ''}`;
  }

  function isRoomOptionDisabled(roomName?: string) {
    const room = getRoomCatalogEntry(roomName);
    if (!room) {
      return true;
    }
    return !isActiveRoom(room);
  }

  function getBookingAttendeeCount(data: any) {
    const inviteCount = Array.isArray(data?.inviteeUserIds) ? data.inviteeUserIds.length : 0;
    const explicitCount = Number(data?.attendees || 0);

    if (explicitCount > 0) {
      return explicitCount;
    }

    return inviteCount + 1;
  }

  function getBookingDisplayCount() {
    return 1;
  }

  function getRoomTimeWindows(roomName: string, date: string, excludeRecordId: string | null = null) {
    if (!roomName || !date) {
      return [];
    }

    const startOfDay = 9 * 60;
    const endOfDay = 18 * 60;
    const toMinutes = (time: any) => {
      const [hours, minutes] = (time || '00:00').split(':').map(Number);
      return hours * 60 + minutes;
    };
    const toTime = (minutes: any) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

    const bookings = allBookings
      .filter((booking) => (
        booking.roomName === roomName &&
        booking.date === date &&
        booking.status !== 'cancelled' &&
        booking.recordId !== excludeRecordId
      ))
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    const windows: { start: string; end: string }[] = [];
    let cursor = startOfDay;

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
  }

  function getRoomDayStatus(roomName: string, date: string) {
    if (!roomName || !date) {
      return 'pending';
    }

    const bookings = allBookings.filter(
      (booking) =>
        booking.roomName === roomName &&
        booking.date === date &&
        booking.status !== 'cancelled',
    );

    if (bookings.length === 0) {
      return 'available';
    }

    const windows = getRoomTimeWindows(roomName, date);
    if (windows.length === 0) {
      return 'full';
    }

    return 'partial';
  }

  function getSuggestedSlots(roomName: string, date: string, desiredStartTime: string, desiredEndTime: string, excludeRecordId: string | null = null) {
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
  }

  const [workspaceId, setWorkspaceId] = useState<string>('');
  // Load initial room and booking data from the backend.
  useEffect(() => {
    const user = getStoredUser();

    // Better workspaceId extraction
    let wsId = user?.workspaceMembership?.workspaceId ||
      user?.workspaceMembership?.workspace ||
      user?.primaryWorkspace ||
      user?.workspace?.id ||
      user?.workspaceId ||
      user?.workspace?.workspaceId ||
      user?.accessibleWorkspaces?.[0]?.id;

    if (!wsId) {
      console.warn("⚠️ No workspaceId found in user object");
      setErrorMessage("No workspace found. Please check login or user data.");
      setIsLoading(false);
      return;
    }

    setWorkspaceId(wsId);
    console.log("✅ Using workspaceId:", wsId);

    async function loadData() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await getMeetingRoomBookings(wsId!);
        console.log("📡 API Response:", response);

        const rawData = response?.data?.data || response?.data || response || {};

        const details = (rawData.roomDetails || rawData.rooms || []).map((room: any) =>
          normalizeRoomEntry(room)
        );

        const bookingsData = rawData.bookings || rawData.data?.bookings || rawData || [];

        setRoomDetails(details);

        const activeRoomNames = details
          .filter((room: any) => isActiveRoom(room) && isMeetingCalendarRoom(room))
          .map((room: any) => room.name);

        setAvailableRooms(activeRoomNames);
        setCalendarRoomFilter((current) => activeRoomNames.includes(current) ? current : (activeRoomNames[0] || ''));

        setAllBookings(bookingsData.map((b: any) => normalizeBooking(b)));
        setReceivedInvites(rawData.receivedInvites || []);

        // Load workspace members - NO ARGUMENT
        try {
          const membersResponse = await getWorkspaceMembers();   // ← No (wsId) here
          setWorkspaceMembers(
            membersResponse?.data?.members ||
            membersResponse?.members ||
            membersResponse ||
            []
          );
        } catch (mErr) {
          console.warn("Failed to load workspace members:", mErr);
        }

      } catch (err: any) {
        console.error("Failed to load meeting rooms/bookings:", err);
        setErrorMessage(`Failed to load data: ${err.response?.data?.message || err.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // TODO: Uncomment background polling when backend is ready
  // useEffect(() => {
  //   const timerId = setInterval(async () => {
  //     try {
  //       const response = await getMeetingRoomBookings();
  //       const details = (response?.data?.roomDetails || []).map((room: any) => normalizeRoomEntry(room));
  //       const activeRoomNames = details.filter((room: any) => isActiveRoom(room) && isMeetingCalendarRoom(room)).map((room: any) => room.name);
  //       const bookings = response?.data?.bookings || [];
  //       const invites = response?.data?.receivedInvites || [];
  //       if (details.length > 0) setRoomDetails(details);
  //       if (activeRoomNames.length > 0) { setAvailableRooms(activeRoomNames); setCalendarRoomFilter((c) => activeRoomNames.includes(c) ? c : activeRoomNames[0]); } else { setAvailableRooms([]); }
  //       setAllBookings(bookings.map((b: any) => normalizeBooking(b)));
  //       setReceivedInvites(invites);
  //     } catch { /* Keep current bookings if background sync fails */ }
  //   }, 20000);
  //   return () => clearInterval(timerId);
  // }, []);

  // --- LOGIC: TABLE DATA ---
  const visibleBookings = useMemo(() => {
    if (isEmployeeProfile) {
      return allBookings.filter((booking) => isMyBooking(booking));
    }

    if (!isAdminProfile) {
      return allBookings;
    }

    return allBookings.filter((booking) => isAssignedDeptBooking(booking) || isMyBooking(booking));
  }, [allBookings, isAdminProfile, departmentScopeNames, currentUserId, isEmployeeProfile]);

  const displayedBookings = useMemo(() => {
    if (activeTab === 'invites') {
      return [];
    }

    return visibleBookings.filter((booking) => {
      const matchesTab = isBookingInActiveTab(booking);
      const matchesSearch =
        (booking.roomName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (booking.bookedByName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const displayStatus = getBookingDisplayStatus(booking);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'rescheduled' ? isRescheduledBooking(booking) : displayStatus === statusFilter);
      return matchesTab && matchesSearch && matchesStatus;
    });
  }, [visibleBookings, activeTab, searchQuery, statusFilter, currentUserId, departmentScopeNames, isAdminProfile]);

  const scopedBookings = useMemo(() => {
    return visibleBookings;
  }, [visibleBookings]);

  const inviteCandidates = useMemo(
    () => workspaceMembers.filter((member) => {
      const memberId = resolveMemberUserId(member);
      return memberId && memberId !== String(currentUserId);
    }),
    [workspaceMembers, currentUserId],
  );

  const memberDirectoryById = useMemo(() => {
    const directory = new Map();
    workspaceMembers.forEach((member: any) => {
      const memberId = resolveMemberUserId(member);
      if (memberId) {
        directory.set(memberId, member);
      }
    });
    return directory;
  }, [workspaceMembers]);

  const resolveInviteDisplayName = (invite: any) => {
    const inviteUserId = String(invite?.invitedUserId || invite?.userId || invite?.id || '').trim();
    const member = inviteUserId ? memberDirectoryById.get(inviteUserId) : null;
    return (
      invite?.invitedName ||
      member?.fullName ||
      member?.name ||
      member?.email ||
      'Member'
    );
  };

  const resolveInviteDisplayRole = (invite: any) => {
    const inviteUserId = String(invite?.invitedUserId || invite?.userId || invite?.id || '').trim();
    const member = inviteUserId ? memberDirectoryById.get(inviteUserId) : null;
    return invite?.invitedRole || member?.role || 'Member';
  };

  const displayedInvites = useMemo(() => {
    return receivedInvites.filter((invite) => {
      if (isEmployeeProfile && invite.status === 'accepted') {
        return false;
      }

      const inviteName = resolveInviteDisplayName(invite);
      const matchesSearch =
        (invite.roomName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (invite.bookedByName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        inviteName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || invite.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [receivedInvites, searchQuery, statusFilter, isEmployeeProfile, memberDirectoryById]);

  // --- LOGIC: CALENDAR ---
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonth = calendarDate.getMonth();
  const currentYear = calendarDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    const nextDate = new Date(currentYear, currentMonth - 1, 1);
    setCalendarDate(nextDate);
    setSelectedCalendarDateKey(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`);
  };
  const handleNextMonth = () => {
    const nextDate = new Date(currentYear, currentMonth + 1, 1);
    setCalendarDate(nextDate);
    setSelectedCalendarDateKey(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`);
  };

  const getDayColor = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const bookingsOnDay = allBookings.filter(b => b.roomName === calendarRoomFilter && b.date === dateStr && b.status !== 'cancelled');

    if (bookingsOnDay.length === 0) return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200';
    if (bookingsOnDay.length < 3) return 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200';
    return 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200';
  };

  const selectedCalendarBookings = useMemo(() => {
    return allBookings
      .filter((booking) => booking.roomName === calendarRoomFilter && booking.date === selectedCalendarDateKey && booking.status !== 'cancelled')
      .sort((left, right) => {
        const leftMinutes = timeToMinutes(left.checkIn || left.startTime || '00:00') ?? 0;
        const rightMinutes = timeToMinutes(right.checkIn || right.startTime || '00:00') ?? 0;
        return leftMinutes - rightMinutes;
      });
  }, [allBookings, calendarRoomFilter, selectedCalendarDateKey]);

  const selectedCalendarHasExternalBookings = useMemo(
    () => selectedCalendarBookings.some((booking) => normalize(booking.bookingType) === 'external'),
    [selectedCalendarBookings],
  );

  const selectedCalendarDateLabel = useMemo(() => {
    if (!selectedCalendarDateKey) {
      return 'Pick a date';
    }

    const parsed = new Date(`${selectedCalendarDateKey}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return selectedCalendarDateKey;
    }

    return parsed.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }, [selectedCalendarDateKey]);

  // --- LOGIC: UPCOMING RESERVATIONS WIDGET ---
  const upcomingReservations = useMemo(() => {
    return visibleBookings
      .filter(b => {
        const matchesTab = isBookingInActiveTab(b);
        const displayStatus = getBookingDisplayStatus(b);
        return matchesTab && displayStatus !== 'cancelled' && displayStatus !== 'completed' && b.date >= todayStr;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);
  }, [visibleBookings, activeTab, todayStr, currentUserId, departmentScopeNames, isAdminProfile]);

  // --- LOGIC: AVAILABILITY CHECKER ---
  const checkAvailability = (data: any, excludeRecordId: string | null = null) => {
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
  };

  const extendBookingPreview = useMemo(() => {
    if (!extendBooking) {
      return null;
    }

    const extraMinutes = Number(extendForm.extraMinutes || 0);
    const currentEndMinutes = timeToMinutes(extendBooking.endTime);
    if (!currentEndMinutes || !extraMinutes || extraMinutes <= 0) {
      return {
        available: false,
        reason: 'Choose how long to extend the booking.',
      };
    }

    const nextEndMinutes = currentEndMinutes + extraMinutes;
    if (nextEndMinutes > 24 * 60) {
      return {
        available: false,
        reason: 'This extension would go past midnight.',
      };
    }

    const nextEndTime = minutesToTimeString(nextEndMinutes);
    const roomType = getMeetingRoomTypeFromName(extendBooking.roomName);
    const hourlyRate = MEETING_ROOM_EXTENSION_RATES[roomType] || MEETING_ROOM_EXTENSION_RATES['Meeting Room'];
    const extensionAmount = (extraMinutes / 60) * hourlyRate;
    const gstAmount = extensionAmount * 0.18;
    const extensionTotal = extensionAmount + gstAmount;
    const currentTotalAmount = Number(extendBooking.totalAmount || 0);
    const nextTotalAmount = currentTotalAmount + extensionTotal;
    const availability = checkAvailability(
      {
        ...extendBooking,
        endTime: nextEndTime,
      },
      extendBooking.recordId || null,
    );

    return {
      available: availability === 'available',
      reason:
        availability === 'available'
          ? 'This booking can be extended.'
          : availability === 'conflict'
            ? 'The extended time overlaps with another booking. Choose a shorter extension.'
            : availability === 'full'
              ? 'No room is available for the extended time.'
              : 'Choose a valid extension.',
      nextEndTime,
      extensionAmount,
      extensionTotal,
      nextTotalAmount,
      hourlyRate,
      mode: 'extend',
    };
  }, [checkAvailability, extendBooking, extendForm.extraMinutes]);

  const bookingTimeValidation = useMemo(
    () => getBookingTimeValidation(newBooking.date, newBooking.startTime, newBooking.endTime),
    [newBooking.date, newBooking.endTime, newBooking.startTime],
  );
  const rescheduleTimeValidation = useMemo(
    () => getBookingTimeValidation(rescheduleData.date, rescheduleData.startTime, rescheduleData.endTime),
    [rescheduleData.date, rescheduleData.endTime, rescheduleData.startTime],
  );
  const currentMeetingClock = getMeetingClockParts();
  const currentMeetingTime = currentMeetingClock ? minutesToTimeString(currentMeetingClock.minutes) : '';
  const roundedCurrentMeetingTime = roundUpToStepTime(currentMeetingTime);
  const createStartTimeOptions = useMemo(
    () => buildTimeOptions(newBooking.date === todayStr ? roundedCurrentMeetingTime : '00:00'),
    [newBooking.date, roundedCurrentMeetingTime, todayStr],
  );
  const createEndTimeOptions = useMemo(
    () => buildTimeOptions(
      newBooking.startTime
        ? minutesToTimeString((timeToMinutes(newBooking.startTime) || 0) + BOOKING_MIN_DURATION_MINUTES)
        : '00:00',
    ),
    [newBooking.startTime],
  );
  const rescheduleStartTimeOptions = useMemo(
    () => buildTimeOptions(rescheduleData.date === todayStr ? roundedCurrentMeetingTime : '00:00'),
    [rescheduleData.date, roundedCurrentMeetingTime, todayStr],
  );
  const rescheduleEndTimeOptions = useMemo(
    () => buildTimeOptions(
      rescheduleData.startTime
        ? minutesToTimeString((timeToMinutes(rescheduleData.startTime) || 0) + BOOKING_MIN_DURATION_MINUTES)
        : '00:00',
    ),
    [rescheduleData.startTime],
  );
  const bookingStatus = bookingTimeValidation.valid ? checkAvailability(newBooking) : 'past';
  const rescheduleStatus = rescheduleTimeValidation.valid ? checkAvailability(rescheduleData, rescheduleData.recordId || null) : 'past';
  const selectedRoomCapacity = getRoomCapacity(newBooking.roomName);
  const bookingSuggestions = getSuggestedSlots(newBooking.roomName, newBooking.date, newBooking.startTime, newBooking.endTime);
  const roomDayStatus = getRoomDayStatus(newBooking.roomName, newBooking.date);
  const roomCatalog = useMemo(() => roomDetails.map((room: any) => normalizeRoomEntry(room)), [roomDetails]);
  const availableFloors = useMemo(() => {
    const floors = Array.from(
      new Set(
        roomCatalog
          .map((room) => room.floor)
          .filter(Boolean),
      ),
    );
    return floors;
  }, [roomCatalog]);
  const selectedBookingFloor = newBooking.floor ? normalizeBookingFloor(newBooking.floor) : '';
  const availableWings = useMemo(() => {
    const sourceRooms = selectedBookingFloor
      ? roomCatalog.filter((room) => room.floor === selectedBookingFloor)
      : roomCatalog;
    return Array.from(
      new Set(
        sourceRooms
          .map((room) => normalizeBookingWing(room.wing))
          .filter(Boolean),
      ),
    );
  }, [roomCatalog, selectedBookingFloor]);
  const selectedBookingWing = newBooking.wing ? normalizeBookingWing(newBooking.wing) : '';
  const selectedBookingRoomType = newBooking.roomType || '';
  const bookingRoomsOnFloor = useMemo(() => {
    if (!selectedBookingFloor) return [];
    return roomCatalog.filter((room) => room.floor === selectedBookingFloor && isActiveRoom(room));
  }, [roomCatalog, selectedBookingFloor]);
  const floorHasWingValues = useMemo(
    () => bookingRoomsOnFloor.some((room) => Boolean(normalizeBookingWing(room.wing))),
    [bookingRoomsOnFloor],
  );
  const bookingRoomsOnSelectedFloorAndWing = useMemo(() => {
    if (!selectedBookingWing) return bookingRoomsOnFloor;
    return bookingRoomsOnFloor.filter((room) => normalizeBookingWing(room.wing) === selectedBookingWing);
  }, [bookingRoomsOnFloor, selectedBookingWing]);
  const bookingRoomsOnSelectedFloorAndType = useMemo(() => {
    if (!selectedBookingRoomType) return [];
    return bookingRoomsOnSelectedFloorAndWing.filter((room) => room.type === selectedBookingRoomType);
  }, [bookingRoomsOnSelectedFloorAndWing, selectedBookingRoomType]);
  const selectedFloorRoomTypeCount = bookingRoomsOnSelectedFloorAndWing.filter(
    (room) => room.type === selectedBookingRoomType,
  ).length;
  const canShowRoomTypeCount = Boolean(selectedBookingFloor && selectedBookingRoomType);

  useEffect(() => {
    if (!showBookingDialog) {
      return;
    }

    setNewBooking((prev) => {
      const nextFloor = prev.floor && availableFloors.includes(normalizeBookingFloor(prev.floor))
        ? normalizeBookingFloor(prev.floor)
        : '';
      const nextWing = prev.wing && availableWings.includes(normalizeBookingWing(prev.wing))
        ? normalizeBookingWing(prev.wing)
        : '';
      const nextType = prev.roomType || '';
      const nextRoomName =
        prev.roomName &&
          roomCatalog.some((room) => room.name === prev.roomName && room.floor === nextFloor && (!nextWing || normalizeBookingWing(room.wing) === nextWing) && room.type === nextType)
          ? prev.roomName
          : '';
      if (prev.floor === nextFloor && prev.wing === nextWing && prev.roomType === nextType && prev.roomName === nextRoomName) {
        return prev;
      }
      return {
        ...prev,
        floor: nextFloor,
        wing: nextWing,
        roomType: nextType,
        roomName: nextRoomName,
      };
    });
  }, [availableFloors, availableWings, roomCatalog, showBookingDialog]);
  const inviteDepartments = useMemo(() => {
    const grouped = new Map();
    const groupPriority = new Map([
      ['Founder', 0],
      ['Super Admin', 1],
      ['Admin', 2],
    ]);

    const getInviteGroupName = (member: any) => {
      const role = normalizeRole(member?.role || member?.workspaceRole || member?.membershipRole || '');

      if (role === 'owner') {
        return 'Founder';
      }

      if (role === 'super-admin' || role === 'super_admin') {
        return 'Super Admin';
      }

      if (role === 'admin' || role === 'admin-manager' || role === 'admin_manager') {
        return 'Admin';
      }

      const departmentName = member.departments?.[0] || '';
      return departmentName ? String(departmentName) : 'General';
    };

    inviteCandidates.forEach((member: any) => {
      const departmentName = getInviteGroupName(member);
      if (!grouped.has(departmentName)) {
        grouped.set(departmentName, []);
      }
      grouped.get(departmentName).push(member);
    });

    return Array.from(grouped.entries())
      .sort(([leftName], [rightName]) => {
        const leftPriority = groupPriority.get(leftName) ?? 10;
        const rightPriority = groupPriority.get(rightName) ?? 10;
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }

        return leftName.localeCompare(rightName);
      })
      .map(([department, members]) => ({
        department,
        members: members.slice().sort((left: any, right: any) => {
          const leftName = (left?.fullName || '').toString().toLowerCase();
          const rightName = (right?.fullName || '').toString().toLowerCase();
          return leftName.localeCompare(rightName);
        }),
      }));
  }, [inviteCandidates]);

  // --- ACTION HANDLERS ---
  const buildBookingDateTime = (date: string = '', time: string = '') => `${date}T${time}:00+05:30`;
  const selectedRoom = (roomName: string = '') => roomCatalog.find((room: any) => room.name === roomName);
  const reloadBookings = async () => {
    if (!workspaceId) return;
    const response = await getMeetingRoomBookings(workspaceId);
    const data = response?.data?.data || response?.data || response || {};
    const details = (data.roomDetails || data.rooms || []).map((room: any) => normalizeRoomEntry(room));
    const bookings = data.bookings || data.data?.bookings || [];
    setRoomDetails(details);
    setAllBookings(bookings.map((booking: any) => normalizeBooking(booking)));
    setReceivedInvites(data.receivedInvites || []);
    const roomNames = details.filter((room: any) => isActiveRoom(room) && isMeetingCalendarRoom(room)).map((room: any) => room.name);
    setAvailableRooms(roomNames);
    setCalendarRoomFilter((current) => roomNames.includes(current) ? current : (roomNames[0] || ''));
  };

  const handleCreateBooking = async () => {
    if (!newBooking.roomType) { setErrorMessage('Select a room type to continue.'); return; }
    if (!newBooking.floor) { setErrorMessage('Select a floor to continue.'); return; }
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

    setNewBooking({ roomName: '', floor: '', wing: '', roomType: '', date: '', startTime: '', endTime: '', purpose: '', inviteeUserIds: [] });
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
      await updateMeetingRoomBooking(rescheduleData.recordId, {
        start: buildBookingDateTime(rescheduleData.date, rescheduleData.startTime),
        end: buildBookingDateTime(rescheduleData.date, rescheduleData.endTime),
        scheduleChangeType: 'rescheduled',
      });
      await reloadBookings();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || error?.message || 'Failed to reschedule booking.');
      setIsSavingBooking(false);
      return;
    }
    setShowRescheduleDialog(false);
    setRescheduleData({});
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
      await updateMeetingRoomBooking(extendBooking.recordId, {
        end: buildBookingDateTime(extendBooking.date, extendBookingPreview.nextEndTime),
        extensionAmount: extendBookingPreview.extensionAmount,
        totalAmount: extendBookingPreview.nextTotalAmount,
        scheduleChangeType: 'extended',
      });
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
  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        {isInitialLoading && <CardsGridSkeleton count={6} cardHeight="h-32" />}
        {!isInitialLoading && (
          <div className="flex flex-col gap-4 text-slate-700 font-sans">

            {/* 1. HEADER */}
            <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
              <div>
                <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">

                  Meeting Rooms
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Reserve campus workspaces and monitor department availability.
                </p>
              </div>
              <button
                onClick={() => {
                  setNewBooking((prev) => ({
                    ...prev,
                    floor: '',
                    wing: '',
                    roomType: '',
                    roomName: '',
                  }));
                  setShowBookingDialog(true);
                }}
                className="w-full md:w-auto bg-[#2563EB] text-white px-4 py-2 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:bg-primary/95 active:scale-95"
              >
                <Plus size={14} strokeWidth={3} /> BOOK A ROOM
              </button>
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-600">
                {errorMessage}
              </div>
            ) : null}

            {/* 2. LIVE STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
              {[
                { label: 'Upcoming', val: scopedBookings.filter(b => getBookingDisplayStatus(b) === 'booked').length, color: 'text-primary', bg: 'bg-blue-50', icon: <CalendarClock size={16} /> },
                { label: 'In Progress', val: scopedBookings.filter(b => getBookingDisplayStatus(b) === 'in progress').length, color: 'text-amber-500', bg: 'bg-amber-50', icon: <Clock size={16} className="animate-spin-slow" /> },
                { label: 'Completed', val: scopedBookings.filter(b => getBookingDisplayStatus(b) === 'completed').length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <CheckCircle2 size={16} /> },
                { label: 'Cancelled', val: scopedBookings.filter(b => getBookingDisplayStatus(b) === 'cancelled').length, color: 'text-red-500', bg: 'bg-red-50', icon: <XCircle size={16} /> },
                { label: 'Rescheduled', val: scopedBookings.filter((b) => isRescheduledBooking(b)).length, color: 'text-purple-600', bg: 'bg-purple-50', icon: <Clock size={16} /> },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-2.5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">{stat.label}</p>
                    <p className={`text-[15px] font-black ${stat.color}`}>{stat.val}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${stat.bg} ${stat.color} shrink-0`}>{stat.icon}</div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">

              {/* 3. MAIN DATA TABLE (LEFT: 2/3) */}
              <div className="lg:col-span-2 flex flex-col bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden min-h-[500px]">

                {/* Tabs & Filters */}
                <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
                  <div className="flex bg-slate-100/50 p-1 rounded-xl w-full xl:w-auto relative border border-slate-200/50 overflow-x-auto">
                    {isEmployeeProfile ? (
                      <>
                        <button
                          onClick={() => { setActiveTab('my_bookings'); setStatusFilter('all'); }}
                          className={`flex-1 min-w-0 sm:min-w-[100px] py-2 px-2.5 sm:px-4 rounded-lg text-[11px] sm:text-[13px] font-bold transition-colors relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeTab === 'my_bookings' ? 'text-[#0F172A]' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                          {activeTab === 'my_bookings' && <motion.div layoutId="roomTabs" className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/60 z-[-1]" />}
                          MY BOOKINGS
                        </button>
                        <button
                          onClick={() => { setActiveTab('invites'); setStatusFilter('all'); }}
                          className={`flex-1 min-w-0 sm:min-w-[90px] py-2 px-2.5 sm:px-4 rounded-lg text-[11px] sm:text-[13px] font-bold transition-colors relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeTab === 'invites' ? 'text-[#0F172A]' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                          {activeTab === 'invites' && <motion.div layoutId="roomTabs" className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/60 z-[-1]" />}
                          INVITES
                          {receivedInvites.filter(i => i.status === 'pending').length > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full shadow-sm shadow-red-200 animate-pulse">
                              {receivedInvites.filter(i => i.status === 'pending').length}
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
                          className={`flex-[2.2] min-w-[210px] sm:min-w-[250px] lg:min-w-[200px] py-2 px-3 sm:px-4 rounded-lg text-[11px] sm:text-[12px] lg:text-[13px] font-bold transition-colors relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap text-center ${(activeTab === 'assigned_dept_bookings' || activeTab === 'company_bookings' || activeTab === 'dept_bookings') ? 'text-[#0F172A]' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                          {(activeTab === 'assigned_dept_bookings' || activeTab === 'company_bookings' || activeTab === 'dept_bookings') && <motion.div layoutId="roomTabs" className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/60 z-[-1]" />}
                          {isAdminProfile ? 'Assigned meetings' : (isDepartmentManagerProfile ? 'Department meetings' : 'Company')}
                        </button>
                        <button
                          onClick={() => { setActiveTab('my_bookings'); setStatusFilter('all'); }}
                          className={`flex-1 min-w-0 sm:min-w-[100px] py-2 px-2.5 sm:px-4 rounded-lg text-[11px] sm:text-[13px] font-bold transition-colors relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeTab === 'my_bookings' ? 'text-[#0F172A]' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                          {activeTab === 'my_bookings' && <motion.div layoutId="roomTabs" className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/60 z-[-1]" />}
                          MY BOOKINGS
                        </button>
                        <button
                          onClick={() => { setActiveTab('invites'); setStatusFilter('all'); }}
                          className={`flex-1 min-w-0 sm:min-w-[90px] py-2 px-2.5 sm:px-4 rounded-lg text-[11px] sm:text-[13px] font-bold transition-colors relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeTab === 'invites' ? 'text-[#0F172A]' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                          {activeTab === 'invites' && <motion.div layoutId="roomTabs" className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/60 z-[-1]" />}
                          INVITES
                          {receivedInvites.filter(i => i.status === 'pending').length > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full shadow-sm shadow-red-200 animate-pulse">
                              {receivedInvites.filter(i => i.status === 'pending').length}
                            </span>
                          )}
                        </button>
                      </>
                    )}
                  </div>


                  <div className="relative w-full xl:w-auto">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search rooms or hosts..."
                      className="w-full xl:w-64 pl-10 pr-4 py-2 bg-white border border-slate-200/60 rounded-xl text-[13px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400 shadow-sm"
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Status Sub-Tabs */}
                <div className="px-3 sm:px-4 lg:px-5 py-2 border-b border-slate-100/40 bg-white flex items-center gap-1.5 overflow-x-auto">
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

                {/* Desktop Table */}
                {activeTab !== 'invites' ? (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                          <tr>
                            <th className="px-5 py-4">Meeting Room</th>
                            <th className="px-5 py-4">Host</th>
                            <th className="px-5 py-4">Schedule</th>
                            <th className="px-5 py-4 text-center">Status</th>
                            <th className="px-5 py-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60">
                          {displayedBookings.map((b) => {
                            const displayStatus = getBookingDisplayStatus(b);
                            const canManageBooking = isMyBooking(b) && !b.isInvitedMeeting && canManageOwnBooking(b);
                            const canRescheduleBooking = canManageBooking && canRescheduleOwnBooking(b);
                            const canExtendBooking = canManageBooking && canExtendOwnBooking(b);

                            return (
                              <tr key={b.recordId || b.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-2.5 min-w-[180px]">
                                    <Building size={16} className="text-primary" />
                                    <div className="min-w-0">
                                      <p className="font-bold text-[#0F172A] text-[13px] whitespace-nowrap">{b.roomName}</p>
                                      <p className="text-[11px] font-semibold text-slate-400">{getBookingDisplayCount()} Booking{b.roomCapacity ? ` - ${b.roomCapacity} seats` : ''}</p>
                                      <span className={`mt-1 inline-flex px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${getBookingTagBadge(b)}`}>
                                        {getBookingTagLabel(b)}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  <p className="text-[13px] font-bold text-[#0F172A]">
                                    {b.bookedByName}
                                    {getInviteMeetingLabel(b) ? ` (${getInviteMeetingLabel(b)})` : ''}
                                  </p>
                                  <p className="text-[11px] font-semibold text-slate-400">{b.department}</p>
                                </td>
                                <td className="px-5 py-4">
                                  {renderScheduleSummary(b)}
                                  {(Number(b.totalAmount || 0) > 0 || Number(b.extensionAmount || 0) > 0) && (
                                    <p className="mt-1 text-[11px] font-bold text-slate-500">Total: {formatCurrency(b.totalAmount || 0)}</p>
                                  )}
                                </td>
                                <td className="px-5 py-4 text-center">
                                  <span className={`px-2.5 py-1 flex items-center justify-center gap-1.5 rounded-md text-[10px] font-black uppercase tracking-wider ${getStatusStyle(displayStatus)} border`}>
                                    {displayStatus}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button onClick={() => setViewingBooking(b)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary rounded-lg transition-all" title="View Details"><Eye size={15} strokeWidth={2.5} /></button>
                                    {canRescheduleBooking && (
                                      <>
                                        <button onClick={() => { setRescheduleData({ ...b, startTime: b.startTime, endTime: b.endTime }); setShowRescheduleDialog(true); }} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700 rounded-lg transition-all" title="Reschedule"><CalendarClock size={15} strokeWidth={2.5} /></button>
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
                            <tr><td colSpan={5} className="px-6 py-16 text-center text-sm font-semibold text-slate-400 bg-slate-50/30">No bookings found matching your criteria.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden flex flex-col p-4 gap-4 bg-slate-50/30">
                      {displayedBookings.map((b) => {
                        const displayStatus = getBookingDisplayStatus(b);
                        const canManageBooking = isMyBooking(b) && !b.isInvitedMeeting && canManageOwnBooking(b);
                        const canRescheduleBooking = canManageBooking && canRescheduleOwnBooking(b);
                        const canExtendBooking = canManageBooking && canExtendOwnBooking(b);

                        return (
                          <div key={b.recordId || b.id} className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2 min-w-[180px]">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Building size={14} strokeWidth={2.5} /></div>
                                <div className="min-w-0">
                                  <p className="font-bold text-[#0F172A] text-sm leading-tight whitespace-nowrap">{b.roomName}</p>
                                  <p className="text-[11px] font-semibold text-slate-500">
                                    {b.bookedByName}
                                    {getInviteMeetingLabel(b) ? ` (${getInviteMeetingLabel(b)})` : ''}
                                  </p>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${getStatusStyle(displayStatus)} border`}>
                                {displayStatus}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs font-semibold text-slate-600">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-0.5">Date</span>
                                {b.date}
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-0.5">Time</span>
                                {b.checkIn} - {b.checkOut}
                              </div>
                              {(Number(b.totalAmount || 0) > 0 || Number(b.extensionAmount || 0) > 0) && (
                                <div className="col-span-2">
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-0.5">Amount</span>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-black text-[#0F172A]">{formatCurrency(b.totalAmount || 0)}</span>
                                    {Number(b.extensionAmount || 0) > 0 && (
                                      <span className="text-[10px] font-bold text-slate-500">Extension: {formatCurrency(b.extensionAmount)}</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                              <button onClick={() => setViewingBooking(b)} className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl shadow-sm">Details</button>
                              {canRescheduleBooking && (
                                <>
                                  <button onClick={() => { setRescheduleData({ ...b, startTime: b.startTime, endTime: b.endTime }); setShowRescheduleDialog(true); }} className="flex-1 py-2 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-xs rounded-xl shadow-sm">Reschedule</button>
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
                        <div className="py-12 text-center text-sm font-semibold text-slate-400">No bookings found.</div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
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
                                        <p className="font-bold text-[#0F172A] text-[13px] whitespace-nowrap">{invite.roomName}</p>
                                        <p className="text-[11px] font-semibold text-slate-400">{invite.department}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <p className="text-[13px] font-bold text-[#0F172A]">{invite.bookedByName}</p>
                                    <p className="text-[11px] font-semibold text-slate-400">{inviteName}</p>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className="text-[12px] font-semibold text-slate-600 flex flex-col gap-0.5">
                                      <span className="font-bold text-[#0F172A]">{invite.date}</span>
                                      <span className="whitespace-nowrap">{formatTimeSlot(invite.startTime, invite.endTime)}</span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    <span className={`px-2.5 py-1 flex items-center justify-center gap-1.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${statusBadge(invite.status)}`}>
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
                                        <span className="px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">Expired</span>
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
                            <tr><td colSpan={5} className="px-6 py-16 text-center text-sm font-semibold text-slate-400 bg-slate-50/30">No meeting invites found.</td></tr>
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
                                  <p className="font-bold text-[#0F172A] text-sm leading-tight whitespace-nowrap">{invite.roomName}</p>
                                  <p className="text-[11px] font-semibold text-slate-500">{invite.bookedByName}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${statusBadge(invite.status)
                                  } border`}>
                                  {statusLabel(invite.status)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs font-semibold text-slate-600">
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-0.5">Date</span>
                                  {invite.date}
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-0.5">Time</span>
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
                        <div className="py-12 text-center text-sm font-semibold text-slate-400">No meeting invites found.</div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* 4. DASHBOARD WIDGETS (RIGHT: 1/3) */}
              <div className="flex flex-col gap-6 lg:gap-8 min-h-full">

                {/* Calendar Widget */}
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-5 flex-grow-0">
                  <div className="mb-5">
                    <h3 className="font-bold text-[14px] text-[#0F172A] mb-3">Room Availability</h3>
                    <div className="relative">
                      <select
                        className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[12px] text-primary focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none appearance-none cursor-pointer transition-all shadow-sm"
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

                  <div className="flex justify-between items-center mb-5">
                    <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"><ChevronLeft size={16} /></button>
                    <span className="font-bold text-[12px] text-[#0F172A] tracking-wide">{monthNames[currentMonth]} {currentYear}</span>
                    <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"><ChevronRight size={16} /></button>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center text-[10px] font-black text-slate-400 tracking-widest">
                    {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d, idx) => <div key={`day-${idx}`}>{d}</div>)}
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} className="aspect-square rounded-xl border border-dashed border-slate-200 bg-slate-50" />)}
                    {[...Array(daysInMonth)].map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const dayBookings = allBookings.filter((booking) => booking.roomName === calendarRoomFilter && booking.date === dateStr && booking.status !== 'cancelled');
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
                          className={`aspect-square rounded-[10px] sm:rounded-xl border-2 p-1.5 sm:p-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm flex flex-col justify-between ${dayStyle} ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-white' : ''}`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className="font-black text-[11px] sm:text-[13px] leading-none">{day}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-70">{dayBookings.length}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected day</p>
                        <p className="mt-1 text-sm font-black text-slate-950">{selectedCalendarDateLabel}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bookings</p>
                        <p className="mt-1 text-lg font-black text-primary">{selectedCalendarBookings.length}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3 max-h-56 overflow-y-auto pr-1">
                      {selectedCalendarBookings.length > 0 ? (
                        canSeeCalendarBookingDetails && !selectedCalendarHasExternalBookings ? (
                          selectedCalendarBookings.map((booking) => (
                            <div key={`${booking.recordId || booking.id}-${booking.startTime}-${booking.endTime}`} className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-950 break-words leading-snug">{booking.bookedByName || booking.roomName}</p>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 whitespace-nowrap">{booking.roomName}</p>
                                </div>
                                <span className={`inline-flex shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${statusBadge(booking.status)}`}>{statusLabel(booking.status)}</span>
                              </div>
                              <div className="mt-2">{renderScheduleSummary(booking, { showDate: false })}</div>
                              <p className="mt-1 text-[10px] font-medium text-slate-500">{booking.purpose || booking.notes || ''}</p>
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-semibold text-slate-600">
                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                                  <p className="mt-1 leading-snug break-words">{booking.date || selectedCalendarDateKey}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Room</p>
                                  <p className="mt-1 leading-snug whitespace-nowrap">{booking.roomName || "Meeting Room"}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</p>
                                  <p className="mt-1 leading-snug break-words">{booking.bookingType || "Booking"}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                                  <p className="mt-1 leading-snug break-words">{statusLabel(booking.status)}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl bg-white border border-slate-200 p-5 text-center">
                            <p className="text-[12px] font-bold text-slate-900">Booked on this date</p>
                            <p className="mt-1 text-[28px] font-black text-primary leading-none">{selectedCalendarBookings.length}</p>
                            <p className="mt-2 text-[10px] font-semibold text-slate-500">
                              {selectedCalendarHasExternalBookings
                                ? 'External booking details are hidden for Internal company employees.'
                                : 'Booking details are visible to the administration manager only.'}
                            </p>
                          </div>
                        )
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center">
                          <p className="text-[12px] font-bold text-slate-500">No bookings for this date.</p>
                          <p className="mt-1 text-[10px] font-semibold text-slate-400">Pick another day or room to inspect the calendar.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contextual Upcoming Widget */}
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-5 flex-grow">
                  <h3 className="font-bold text-[14px] text-[#0F172A] mb-1">Upcoming</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">
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
                            {b.date === todayStr && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md uppercase tracking-wider border border-amber-200">Today</span>}
                          </div>
                          <p className="text-[11px] font-bold text-slate-500 mt-1 whitespace-nowrap">{b.roomName}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">{b.date}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-3">
                          <CalIcon size={20} className="text-slate-300" />
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No scheduled meetings</p>
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
              className="bg-white rounded-t-[32px] md:rounded-[32px] w-full md:max-w-2xl max-h-[92vh] md:max-h-[85vh] shadow-2xl relative z-[90] flex flex-col overflow-hidden"
            >
              <div className="w-full flex justify-center py-3 md:hidden">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
              </div>

              <div className="px-6 py-4 md:p-8 flex justify-between items-center border-b border-slate-100/60 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-[#0F172A] tracking-tight">Book Meeting Room</h2>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Host: {managerProfile.name}</p>
                </div>
                <button onClick={() => setShowBookingDialog(false)} className="w-10 h-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors">
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 md:space-y-8 overflow-y-auto flex-1">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Room Type</label>
                    <div className="relative">
                      <select
                        className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm"
                        value={newBooking.roomType}
                        onChange={(e) => setNewBooking((prev) => ({ ...prev, roomType: e.target.value, roomName: '' }))}
                      >
                        <option value="" disabled>Select room type</option>
                        {ROOM_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Floor</label>
                    <div className="relative">
                      <select
                        className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm"
                        value={newBooking.floor}
                        onChange={(e) => setNewBooking((prev) => ({ ...prev, floor: e.target.value, roomName: '' }))}
                      >
                        <option value="" disabled>Select floor</option>
                        {availableFloors.map((floor) => (
                          <option key={floor} value={floor}>{floor}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wing (Optional)</label>
                    <div className="relative">
                      <select
                        className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm"
                        value={newBooking.wing}
                        onChange={(e) => setNewBooking((prev) => ({ ...prev, wing: e.target.value, roomName: '' }))}
                      >
                        <option value="">{floorHasWingValues ? 'Any wing' : 'No wing configured'}</option>
                        {availableWings.map((wing) => (
                          <option key={wing} value={wing}>{wing}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                    {canShowRoomTypeCount ? (
                      <p className={`text-[12px] font-bold ${selectedFloorRoomTypeCount > 0 ? 'text-blue-700' : 'text-rose-600'}`}>
                        {selectedFloorRoomTypeCount > 0
                          ? `${selectedFloorRoomTypeCount} ${selectedBookingRoomType.toLowerCase()}${selectedFloorRoomTypeCount === 1 ? '' : 's'} available on this floor${selectedBookingWing ? ` in wing ${selectedBookingWing}` : ''}.`
                          : `No ${selectedBookingRoomType.toLowerCase()} available for this floor${selectedBookingWing ? ` in wing ${selectedBookingWing}` : ''}.`}
                      </p>
                    ) : (
                      <p className="text-[12px] font-bold text-slate-500">Select room type and floor to see availability. Add wing if needed.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Location</label>
                    <div className="relative">
                      <select
                        className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm"
                        value={newBooking.roomName}
                        onChange={(e) => {
                          const roomName = e.target.value;
                          const selectedRoom = roomCatalog.find((room) => room.name === roomName);
                          setNewBooking((prev) => ({
                            ...prev,
                            roomName,
                            floor: selectedRoom?.floor || prev.floor,
                            wing: selectedRoom?.wing || prev.wing,
                            roomType: selectedRoom?.type || prev.roomType,
                          }));
                        }}
                      >
                        <option value="">-- Choose a Room --</option>
                        {bookingRoomsOnSelectedFloorAndType.length > 0 ? (
                          bookingRoomsOnSelectedFloorAndType.map((room) => (
                            <option key={room.name} value={room.name} disabled={!isActiveRoom(room)}>
                              {getRoomOptionLabel(room.name)}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>
                            {canShowRoomTypeCount
                              ? `No ${selectedBookingRoomType.toLowerCase()} available for ${selectedBookingFloor || 'this floor'}${selectedBookingWing ? ` wing ${selectedBookingWing}` : ''}`
                              : 'Select room type and floor first'}
                          </option>
                        )}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                    {selectedRoomCapacity ? (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-[12px] font-semibold text-blue-800">
                        Selected room capacity: {selectedRoomCapacity} seats. Invite slots left: {Math.max(Number(selectedRoomCapacity) - 1 - Number(newBooking.inviteeUserIds.length || 0), 0)}.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                    <input type="date" min={todayStr} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm transition-all" onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-4 col-span-1 md:col-span-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Time</label>
                      <select value={newBooking.startTime || ''} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm transition-all" onChange={(e) => {
                        const nextStartTime = e.target.value;
                        const minimumEndTime = minutesToTimeString((timeToMinutes(nextStartTime) || 0) + BOOKING_MIN_DURATION_MINUTES);
                        const currentEndMinutes = timeToMinutes(newBooking.endTime);
                        const minimumEndMinutes = timeToMinutes(minimumEndTime);
                        setNewBooking({
                          ...newBooking,
                          startTime: nextStartTime,
                          endTime: !newBooking.endTime || currentEndMinutes === null || (minimumEndMinutes !== null && currentEndMinutes < minimumEndMinutes) ? minimumEndTime : newBooking.endTime,
                        });
                      }}>
                        <option value="">Select start time</option>
                        {createStartTimeOptions.map((timeValue) => (
                          <option key={timeValue} value={timeValue}>{formatTimeOptionLabel(timeValue)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Time</label>
                      <select value={newBooking.endTime || ''} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm transition-all" onChange={(e) => setNewBooking({ ...newBooking, endTime: e.target.value })}>
                        <option value="">Select end time</option>
                        {createEndTimeOptions.map((timeValue) => (
                          <option key={timeValue} value={timeValue}>{formatTimeOptionLabel(timeValue)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {!bookingTimeValidation.valid && (
                  <div className="p-4 bg-red-50 rounded-2xl flex items-start sm:items-center gap-3 border border-red-100">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5 sm:mt-0" size={20} />
                    <p className="text-[13px] text-red-800 font-bold">{bookingTimeValidation.reason}</p>
                  </div>
                )}
                {bookingTimeValidation.valid && roomDayStatus === 'available' && !newBooking.startTime && !newBooking.endTime && (
                  <div className="p-4 bg-emerald-50 rounded-2xl flex items-start sm:items-center gap-3 border border-emerald-100">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5 sm:mt-0" size={20} />
                    <p className="text-[13px] text-emerald-800 font-bold">Meeting room is available for this date. Choose a slot.</p>
                  </div>
                )}
                {bookingTimeValidation.valid && roomDayStatus === 'partial' && !newBooking.startTime && !newBooking.endTime && (
                  <div className="p-4 bg-amber-50 rounded-2xl flex items-start sm:items-center gap-3 border border-amber-100">
                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5 sm:mt-0" size={20} />
                    <p className="text-[13px] text-amber-800 font-bold">This room already has some bookings on that date. Choose an open time slot.</p>
                  </div>
                )}
                {bookingTimeValidation.valid && roomDayStatus === 'full' && !newBooking.startTime && !newBooking.endTime && (
                  <div className="p-4 bg-red-50 rounded-2xl flex items-start sm:items-center gap-3 border border-red-100">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5 sm:mt-0" size={20} />
                    <p className="text-[13px] text-red-800 font-bold">Bookings are full for this room on the selected date. Choose another date.</p>
                  </div>
                )}
                {bookingTimeValidation.valid && bookingStatus === 'available' && (
                  <div className="p-4 bg-emerald-50 rounded-2xl flex items-start sm:items-center gap-3 border border-emerald-100">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5 sm:mt-0" size={20} />
                    <p className="text-[13px] text-emerald-800 font-bold">Meeting room available for the selected slot.</p>
                  </div>
                )}
                {bookingTimeValidation.valid && bookingStatus === 'capacity' && (
                  <div className="p-4 bg-amber-50 rounded-2xl flex items-start sm:items-center gap-3 border border-amber-100">
                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5 sm:mt-0" size={20} />
                    <p className="text-[13px] text-amber-800 font-bold">Room capacity is not enough for this booking. Pick a bigger room.</p>
                  </div>
                )}
                {bookingTimeValidation.valid && bookingStatus === 'full' && (
                  <div className="p-4 bg-red-50 rounded-2xl flex items-start sm:items-center gap-3 border border-red-100">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5 sm:mt-0" size={20} />
                    <p className="text-[13px] text-red-800 font-bold">Bookings are full for this room on the selected date. Choose another date.</p>
                  </div>
                )}
                {bookingTimeValidation.valid && bookingStatus === 'conflict' && (
                  <div className="p-4 bg-red-50 rounded-2xl flex items-start sm:items-center gap-3 border border-red-100">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5 sm:mt-0" size={20} />
                    <div className="space-y-2">
                      <p className="text-[13px] text-red-800 font-bold">Time conflict detected. Try another slot or room.</p>
                      {bookingSuggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {bookingSuggestions.map((slot: any) => (
                            <button
                              key={`${slot.start}-${slot.end}`}
                              type="button"
                              onClick={() => setNewBooking((prev) => ({ ...prev, startTime: slot.start, endTime: slot.end }))}
                              className="px-3 py-1.5 rounded-full bg-white border border-red-200 text-[11px] font-bold text-red-700 hover:bg-red-100 transition-colors"
                            >
                              {slot.start} - {slot.end}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Purpose / Agenda</label>
                    <input type="text" required placeholder="e.g. Q3 Roadmap Review..." className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm outline-none transition-all" onChange={(e) => setNewBooking({ ...newBooking, purpose: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invite Members</label>
                    <span className="text-[11px] font-bold text-slate-500">{newBooking.inviteeUserIds.length} selected</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-4 pr-1">
                    {inviteDepartments.map((group: any) => (
                      <div key={group.department} className="rounded-2xl border border-slate-200/60 bg-slate-50/70 p-4">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3">{group.department}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {group.members.map((member: any) => {
                            const memberId = resolveMemberUserId(member);
                            const checked = newBooking.inviteeUserIds.includes(memberId);
                            return (
                              <label key={memberId} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${checked ? 'border-[#2563EB] bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => setNewBooking((prev) => ({
                                    ...prev,
                                    inviteeUserIds: checked
                                      ? prev.inviteeUserIds.filter((id) => id !== memberId)
                                      : [...prev.inviteeUserIds, memberId],
                                  }))}
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                                />
                                <div className="min-w-0">
                                  <p className="text-[13px] font-bold text-[#0F172A] truncate">{resolveMemberName(member) || member.email || 'Member'}</p>
                                  <p className="text-[11px] font-semibold text-slate-500">{formatInviteGroupLabel(member.role || 'General')}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {inviteDepartments.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-[12px] font-semibold text-slate-400">
                        No inviteable members found.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 md:p-8 bg-slate-50/50 border-t border-slate-100/60 shrink-0">
                <button
                  disabled={bookingStatus !== 'available' || isSavingBooking || !newBooking.purpose.trim()}
                  onClick={handleCreateBooking}
                  className="w-full py-3.5 sm:py-4 bg-[#2563EB] text-white rounded-xl font-black text-[12px] sm:text-[13px] uppercase tracking-wider shadow-lg shadow-[#2563EB]/30 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none hover:bg-blue-600 transition-all active:scale-[0.98]"
                >
                  {isSavingBooking ? 'Saving...' : 'Confirm Booking'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. VIEW DETAILS MODAL */}
      <AnimatePresence>
        {viewingBooking && (
          <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingBooking(null)} className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-[32px] md:rounded-[32px] w-full md:max-w-md max-h-[85vh] overflow-y-auto shadow-2xl relative z-[90] flex flex-col"
            >
              <div className="w-full flex justify-center py-3 md:hidden">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
              </div>

              <div className="px-6 py-4 md:p-8 flex justify-between items-center border-b border-slate-100/60 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
                <h2 className="text-xl md:text-2xl font-black text-[#0F172A] tracking-tight">Meeting Details</h2>
                <button onClick={() => setViewingBooking(null)} className="w-10 h-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors">
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-5">
                {isAdministrationManagerProfile && normalize(viewingBooking.bookingType) === 'external' ? (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5 text-center">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">External booking</p>
                    <p className="mt-2 text-lg font-black text-slate-950">Details hidden for administration manager.</p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">This shared module keeps external booking details private in this view.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100/60">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</span>
                      <span className="font-bold text-[#2563EB] text-[13px] flex items-center gap-1.5"><Building size={14} /> {viewingBooking.roomName}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100/60">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Host / Dept</span>
                      <div className="text-right">
                        <p className="font-bold text-[#0F172A] text-[13px]">{viewingBooking.bookedByName}</p>
                        <p className="font-semibold text-slate-400 text-[11px]">{viewingBooking.department}</p>
                        <span className={`mt-2 inline-flex px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${getBookingTagBadge(viewingBooking)}`}>
                          {getBookingTagLabel(viewingBooking)}
                        </span>
                      </div>
                    </div>
                    {viewingBooking.isInvitedMeeting && (
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100/60">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meeting Type</span>
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${viewingBooking.currentInviteStatus === 'accepted'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : viewingBooking.currentInviteStatus === 'rejected'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                          {getInviteMeetingLabel(viewingBooking)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100/60">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timing</span>
                      <div className="text-right">
                        {renderScheduleSummary(viewingBooking)}
                      </div>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100/60">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendees</span>
                      <span className="font-bold text-[#0F172A] text-[13px] flex items-center gap-1.5"><Users size={14} className="text-slate-400" /> {getBookingDisplayCount()} Booking</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100/60">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${getStatusStyle(viewingBooking.liveStatus || viewingBooking.status || '')} border`}>
                          {viewingBooking.liveStatus || viewingBooking.status}
                        </span>
                        {isRescheduledBooking(viewingBooking) && (
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                            Rescheduled
                          </span>
                        )}
                      </div>
                    </div>

                    {(Number(viewingBooking.totalAmount || 0) > 0 || Number(viewingBooking.extensionAmount || 0) > 0) && (
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100/60">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</span>
                        <div className="text-right">
                          <p className="font-black text-[#0F172A] text-[13px]">{formatCurrency(viewingBooking.totalAmount || 0)}</p>
                          {Number(viewingBooking.extensionAmount || 0) > 0 && (
                            <p className="text-[10px] font-bold text-slate-500">Extension: {formatCurrency(viewingBooking.extensionAmount)}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {viewingBooking.currentInviteStatus && (
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100/60">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Invite</span>
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${statusBadge(viewingBooking.currentInviteStatus)}`}>
                          {statusLabel(viewingBooking.currentInviteStatus)}
                        </span>
                      </div>
                    )}

                    {Array.isArray(viewingBooking.invites) && viewingBooking.invites.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Users size={12} /> Invited Members</span>
                        <div className="space-y-2">
                          {viewingBooking.invites.map((invite: any) => {
                            const inviteName = resolveInviteDisplayName(invite);
                            const inviteRole = resolveInviteDisplayRole(invite);

                            return (
                              <div key={`${invite.invitedUserId}-${inviteName}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                <div>
                                  <p className="text-[13px] font-bold text-[#0F172A]">{inviteName}</p>
                                  <p className="text-[11px] font-semibold text-slate-400">{formatInviteGroupLabel(inviteRole)}</p>
                                </div>
                                <div className="text-right">
                                  <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${statusBadge(invite.status)}`}>
                                    {statusLabel(invite.status)}
                                  </span>
                                  {invite.responseReason ? (
                                    <p className="mt-1 text-[10px] font-semibold text-slate-500 max-w-[180px]">{invite.responseReason}</p>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {viewingBooking.status === 'cancelled' && viewingBooking.cancelReason && (
                      <div className="space-y-2 pt-2">
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1.5"><AlertCircle size={12} /> Cancellation Reason</span>
                        <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl font-semibold text-red-900 text-[13px] leading-relaxed">"{viewingBooking.cancelReason}"</div>
                      </div>
                    )}

                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Eye size={12} /> Purpose</span>
                      <div className="p-4 bg-slate-50 border border-slate-100/60 rounded-2xl italic font-semibold text-slate-700 text-[13px] leading-relaxed">"{viewingBooking.purpose}"</div>
                    </div>

                    {isMyBooking(viewingBooking) && !viewingBooking.isInvitedMeeting && canManageOwnBooking(viewingBooking) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {canRescheduleOwnBooking(viewingBooking) && (
                          <>
                            <button onClick={() => { setRescheduleData({ ...viewingBooking, startTime: viewingBooking.startTime, endTime: viewingBooking.endTime }); setShowRescheduleDialog(true); }} className="w-full py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-[13px] text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2"><CalendarClock size={16} /> Reschedule</button>
                            <button onClick={() => { setBookingToCancel(viewingBooking); setShowCancelDialog(true); }} className="w-full py-3.5 bg-red-50 border border-red-200 rounded-xl font-bold text-[13px] text-red-700 hover:bg-red-100 transition-all shadow-sm flex items-center justify-center gap-2"><XCircle size={16} /> Cancel</button>
                          </>
                        )}
                        {canExtendOwnBooking(viewingBooking) && (
                          <button onClick={() => { setExtendBooking(viewingBooking); setExtendForm({ extraMinutes: '30' }); setShowExtendDialog(true); }} className="w-full py-3.5 bg-amber-50 border border-amber-200 rounded-xl font-bold text-[13px] text-amber-700 hover:bg-amber-100 transition-all shadow-sm flex items-center justify-center gap-2 sm:col-span-2"><Clock size={16} /> Extend Booking</button>
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
                  <h2 className="text-xl md:text-2xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">Extend Booking</h2>
                  <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mt-1">Meeting is in progress</p>
                </div>
                <button onClick={closeExtendDialog} className="w-10 h-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors">
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Slot</p>
                  <div className="mt-1">{renderScheduleSummary(extendBooking)}</div>
                </div>

                {extendBookingPreview?.available && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-2">
                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Extension Charge</p>
                    <div className="flex items-center justify-between text-sm font-bold text-amber-900">
                      <span>Extra time</span>
                      <span>{extendForm.extraMinutes} minutes</span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-bold text-amber-900">
                      <span>Extension amount</span>
                      <span>{formatCurrency(extendBookingPreview.extensionAmount || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-bold text-amber-900">
                      <span>GST</span>
                      <span>{formatCurrency((extendBookingPreview.extensionTotal || 0) - (extendBookingPreview.extensionAmount || 0))}</span>
                    </div>
                    <div className="flex items-center justify-between text-base font-black text-amber-950 pt-2 border-t border-amber-200">
                      <span>Total booking value</span>
                      <span>{formatCurrency(extendBookingPreview.nextTotalAmount || extendBooking.totalAmount || 0)}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extend By</label>
                  <select className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm transition-all" value={extendForm.extraMinutes} onChange={(e) => setExtendForm({ extraMinutes: e.target.value })}>
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">1 Hour</option>
                    <option value="90">1 Hour 30 Minutes</option>
                    <option value="120">2 Hours</option>
                  </select>
                </div>

                <div className={`p-4 rounded-2xl border ${extendBookingPreview?.available ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${extendBookingPreview?.available ? 'text-emerald-700' : 'text-red-700'}`}>{extendBookingPreview?.available ? 'Availability Check' : 'Availability Blocked'}</p>
                  <p className={`text-sm font-bold ${extendBookingPreview?.available ? 'text-emerald-700' : 'text-red-700'}`}>{extendBookingPreview?.reason || 'This booking can be extended.'}</p>
                  {extendBookingPreview?.available && extendBookingPreview?.nextEndTime && (
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">New End Time: {formatTime12h(extendBookingPreview.nextEndTime)}</p>
                  )}
                </div>

                {errorMessage && !extendBookingPreview?.available && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-sm font-bold text-red-700">{errorMessage}</div>
                )}
              </div>

              <div className="p-6 md:p-8 bg-slate-50/50 border-t border-slate-100/60 flex gap-3 sticky bottom-0">
                <button disabled={isSavingBooking} onClick={closeExtendDialog} className="flex-1 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-[13px] text-slate-600 hover:text-[#0F172A] transition-all shadow-sm disabled:opacity-50">Cancel</button>
                <button disabled={!extendBookingPreview?.available || isSavingBooking} onClick={handleExtendBooking} className="flex-1 py-3.5 bg-amber-500 text-white rounded-xl font-bold text-[13px] uppercase tracking-wider shadow-lg shadow-amber-200 disabled:bg-slate-200 disabled:shadow-none hover:bg-amber-600 transition-all active:scale-[0.98]">{isSavingBooking ? 'Saving...' : 'Extend Booking'}</button>
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
                    <h2 className="text-xl md:text-2xl font-black text-red-900 tracking-tight">Reject Meeting Invite</h2>
                    <p className="text-[11px] font-bold text-red-600 uppercase tracking-widest mt-1.5">{inviteToReject.roomName}</p>
                  </div>
                </div>
                <button onClick={closeRejectInviteDialog} className="w-10 h-10 bg-white hover:bg-red-100 text-red-400 hover:text-red-600 rounded-full flex items-center justify-center transition-colors shadow-sm"><X size={18} strokeWidth={2.5} /></button>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div className="p-4 bg-white border border-slate-200/60 rounded-2xl text-[13px] font-medium text-slate-600 shadow-sm space-y-1.5">
                  <p>
                    You are rejecting the meeting invite on <span className="font-bold text-[#0F172A]">{inviteToReject.date}</span> at <span className="font-bold text-[#0F172A] whitespace-nowrap">{formatTimeSlot(inviteToReject.startTime, inviteToReject.endTime)}</span>.
                  </p>
                  <p className="text-slate-500">
                    This will notify <span className="font-bold text-[#0F172A]">{inviteToReject.bookedByName}</span> with your reason.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason for Rejection</label>
                  <textarea
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-semibold text-[13px] text-[#0F172A] focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none transition-all shadow-sm"
                    rows={3}
                    placeholder="Please share why you cannot attend this meeting..."
                    value={inviteRejectReason}
                    onChange={(e) => setInviteRejectReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-6 md:p-8 bg-slate-50/50 border-t border-slate-100/60 flex gap-3">
                <button disabled={isSavingBooking} onClick={closeRejectInviteDialog} className="flex-1 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-[13px] text-slate-600 hover:text-[#0F172A] hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50">Keep It</button>
                <button disabled={!inviteRejectReason.trim() || isSavingBooking} onClick={handleRejectInviteSubmit} className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-bold text-[13px] shadow-lg shadow-red-500/30 disabled:bg-slate-200 disabled:shadow-none hover:bg-red-700 transition-all active:scale-[0.98]">{isSavingBooking ? 'Saving...' : 'Reject Invite'}</button>
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
                    <h2 className="text-xl md:text-2xl font-black text-red-900 tracking-tight">Cancel Meeting</h2>
                    <p className="text-[11px] font-bold text-red-600 uppercase tracking-widest mt-1.5">{bookingToCancel.roomName}</p>
                  </div>
                </div>
                <button onClick={() => setShowCancelDialog(false)} className="w-10 h-10 bg-white hover:bg-red-100 text-red-400 hover:text-red-600 rounded-full flex items-center justify-center transition-colors shadow-sm"><X size={18} strokeWidth={2.5} /></button>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div className="p-4 bg-white border border-slate-200/60 rounded-2xl text-[13px] font-medium text-slate-600 shadow-sm">
                  You are cancelling the meeting on <span className="font-bold text-[#0F172A]">{bookingToCancel.date}</span> at <span className="font-bold text-[#0F172A]">{bookingToCancel.checkIn}</span>. This action cannot be undone.
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason for Cancellation</label>
                  <textarea
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-semibold text-[13px] text-[#0F172A] focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none transition-all shadow-sm"
                    rows={3}
                    placeholder="Please inform attendees why this is cancelled..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-6 md:p-8 bg-slate-50/50 border-t border-slate-100/60 flex gap-3">
                <button disabled={isSavingBooking} onClick={() => setShowCancelDialog(false)} className="flex-1 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-[13px] text-slate-600 hover:text-[#0F172A] hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50">Keep It</button>
                <button disabled={!cancelReason.trim() || isSavingBooking} onClick={handleCancelBooking} className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-bold text-[13px] shadow-lg shadow-red-500/30 disabled:bg-slate-200 disabled:shadow-none hover:bg-red-700 transition-all active:scale-[0.98]">{isSavingBooking ? 'Saving...' : 'Cancel Meeting'}</button>
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
                  <h2 className="text-xl md:text-2xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">Reschedule</h2>
                  <p className="text-[11px] font-bold text-[#2563EB] uppercase tracking-widest mt-1">Refining Schedule</p>
                </div>
                <button onClick={() => setShowRescheduleDialog(false)} className="w-10 h-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors">
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Location (Optional)</label>
                  <div className="relative">
                    <select className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm" value={rescheduleData.roomName || ''} onChange={(e) => setRescheduleData({ ...rescheduleData, roomName: e.target.value })}>
                      {availableRooms.map((roomName) => (
                        <option key={roomName} value={roomName} disabled={isRoomOptionDisabled(roomName)}>
                          {getRoomOptionLabel(roomName)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Date</label>
                    <input type="date" min={todayStr} value={rescheduleData.date || ''} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm transition-all" onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Check In</label>
                    <select value={rescheduleData.startTime || ''} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm transition-all" onChange={(e) => {
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Check Out</label>
                    <select value={rescheduleData.endTime || ''} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm transition-all" onChange={(e) => setRescheduleData({ ...rescheduleData, endTime: e.target.value })}>
                      <option value="">Select end time</option>
                      {rescheduleEndTimeOptions.map((timeValue) => (
                        <option key={timeValue} value={timeValue}>{formatTimeOptionLabel(timeValue)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {!rescheduleTimeValidation.valid && (
                  <div className="p-4 bg-red-50 rounded-2xl flex items-start sm:items-center gap-3 border border-red-100 mt-2">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5 sm:mt-0" size={20} />
                    <p className="text-[13px] text-red-800 font-bold">{rescheduleTimeValidation.reason}</p>
                  </div>
                )}
                {rescheduleTimeValidation.valid && rescheduleStatus === 'available' && (
                  <div className="p-4 bg-emerald-50 rounded-2xl flex items-start sm:items-center gap-3 border border-emerald-100 mt-2">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5 sm:mt-0" size={20} />
                    <p className="text-[13px] text-emerald-800 font-bold">Slot is available!</p>
                  </div>
                )}
                {rescheduleTimeValidation.valid && rescheduleStatus === 'conflict' && (
                  <div className="p-4 bg-red-50 rounded-2xl flex items-start sm:items-center gap-3 border border-red-100 mt-2">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5 sm:mt-0" size={20} />
                    <p className="text-[13px] text-red-800 font-bold">Slot conflict detected. Please adjust time.</p>
                  </div>
                )}
              </div>
              <div className="p-6 md:p-8 bg-slate-50/50 border-t border-slate-100/60 flex gap-3 sticky bottom-0">
                <button disabled={isSavingBooking} className="flex-1 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-[13px] text-slate-600 hover:text-[#0F172A] transition-all shadow-sm disabled:opacity-50" onClick={() => setShowRescheduleDialog(false)}>Cancel</button>
                <button disabled={rescheduleStatus !== 'available' || isSavingBooking} onClick={handleRescheduleBooking} className="flex-1 py-3.5 bg-[#2563EB] text-white rounded-xl font-bold text-[13px] uppercase tracking-wider shadow-lg shadow-[#2563EB]/30 disabled:bg-slate-200 disabled:shadow-none hover:bg-blue-600 transition-all active:scale-[0.98]">{isSavingBooking ? 'Saving...' : 'Update'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

