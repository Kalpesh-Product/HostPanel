import { useState, useMemo, useEffect, useCallback, type FormEvent } from 'react';
import {
  Search, Eye, X, Calendar, AlertCircle, CheckCircle2,
  Clock, XCircle, Filter, Building2, FileText, ShieldAlert,
  Send, CalendarDays, UploadCloud, Users, ThumbsUp, ThumbsDown, Plus, ChevronDown, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import PageFrame from '@/components/Pages/PageFrame';
import { getLeaveRequests, updateLeaveRequest, createLeaveRequest, uploadLeaveCertificate, attachLeaveCertificate, getHolidays } from '@/services/leave-requests';
import {
  canAccessAdminDashboard,
  canAccessFinanceDashboard,
  canAccessTechDashboard,
  canAccessITDashboard,
  canAccessMaintenanceDashboard,
  canAccessSalesDashboard,
  getStoredActingManagerContext,
  getStoredUser,
} from '@/lib/auth-session';
import { extractDepartmentLabel } from '@/utils/user-helpers';
import { LeaveSkeleton } from '@/components/ui/Skeleton';
import { statusPillClass } from '../../lib/status-pill';
import { toast } from 'sonner';
import { getWorkspaceDateKey } from '@/lib/workspaceLocalization';

interface LeaveRequest {
  recordId?: string;
  id?: string;
  status: string;
  rejectionReason?: string;
  actionedBy?: string;
  actionedByDesignation?: string;
  actionedByDepartment?: string;
  actionedAt?: string;
  leaveMode: string;
  halfDaySession?: string;
  leaveHours?: number;
  medicalCertAttached?: boolean;
  requesterBalance?: number;
  leaveType?: string;
  employeeName?: string;
  employeeId?: string;
  department?: string;
  requesterRole?: string;
  requesterUserId?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  reason?: string;
  medicalCertName?: string;
  medicalCertUrl?: string;
  medicalCertMimeType?: string;
  isMe?: boolean;
  isApprovalRecipient?: boolean;
  canAction?: boolean;
}

interface LeaveTypeConfig {
  id: string;
  name: string;
  code: string;
  requiresBalance: boolean;
  medicalCertificateAfterDays?: number | null;
  color?: string;
}

type LeaveBalances = Record<string, { total: number; used: number; remaining: number }>;

interface LeaveForm {
  type: string;
  leaveMode: string;
  halfDaySession: string;
  partialDayHours: number;
  start: string;
  end: string;
  reason: string;
  days: number;
}

const getManagedOrganizationDepartments = (currentUser: any): string[] => {
  const currentUserId = String(currentUser?.id || currentUser?._id || '').trim();
  const currentUserName = String(
    currentUser?.fullName ||
      [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') ||
      currentUser?.name || '',
  ).trim().toLowerCase().replace(/[\s_]+/g, '-');

  const organizationDepartments = Array.isArray(currentUser?.workspace?.organizationDepartments)
    ? currentUser.workspace.organizationDepartments
    : [];

  return organizationDepartments
    .filter((department: any) => {
      const managerUserId = String(department?.managerUserId || '').trim();
      const managerName = String(department?.managerName || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
      return (
        (currentUserId && managerUserId && currentUserId === managerUserId) ||
        (currentUserName && managerName && currentUserName === managerName)
      );
    })
    .map((department: any) => department?.name)
    .filter(Boolean);
};

const toDateKey = (value: string) => value ? String(value).slice(0, 10) : '';

const PARTIAL_LEAVE_DAY_HOURS = 10;
const parseTimeMinutes = (value: string): number | null => {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};
const formatMinutes12h = (minutes: number): string => {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${hours % 12 || 12}:${String(minute).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
};

const isWorkingLeaveDate = (dateKey: string, holidayDateKeys: Set<string>): boolean => {
  if (!dateKey) return false;
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.getUTCDay() !== 0 && !holidayDateKeys.has(dateKey);
};

const calculateWorkingDays = (startValue: string, endValue: string, holidayDateKeys: Set<string>): number => {
  if (!startValue || !endValue) return 0;
  const cursor = new Date(`${startValue}T00:00:00.000Z`);
  const end = new Date(`${endValue}T00:00:00.000Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || end < cursor) return 0;
  let count = 0;
  while (cursor <= end) {
    const dateKey = cursor.toISOString().slice(0, 10);
    if (isWorkingLeaveDate(dateKey, holidayDateKeys)) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
};

const calculateRequestedDays = ({ leaveMode, startValue, endValue, partialDayHours, holidayDateKeys }: { leaveMode: string; startValue: string; endValue: string; partialDayHours?: number; holidayDateKeys: Set<string> }): number => {
  if (!isWorkingLeaveDate(startValue, holidayDateKeys)) return 0;
  if (leaveMode === 'half_day') return 0.5;
  if (leaveMode === 'partial_day') return Math.round(Math.min(1, (partialDayHours || 0) / PARTIAL_LEAVE_DAY_HOURS) * 100) / 100;
  return calculateWorkingDays(startValue, endValue, holidayDateKeys);
};


const normalizeLeaveMode = (value: string) => {
  const n = String(value || '').trim().toLowerCase();
  if (n === 'half_day' || n === 'half-day') return 'half_day';
  if (n === 'partial_day' || n === 'partial-day' || n === 'hours') return 'partial_day';
  return 'full_day';
};

const normalizeHalfDaySession = (value: string) => {
  const n = String(value || '').trim().toLowerCase();
  if (n === 'morning' || n.includes('morning')) return 'morning';
  if (n === 'evening' || n.includes('evening')) return 'evening';
  return '';
};

const getHalfDaySessionLabel = (session: string, dailyWorkingHours: number) => {
  const halfDayHours = Math.round((dailyWorkingHours / 2) * 100) / 100;
  if (session === 'morning') return `First Half (${halfDayHours} hrs)`;
  if (session === 'evening') return `Second Half (${halfDayHours} hrs)`;
  return '';
};

const normalizeRole = (role: string) =>
  String(role || '').trim().toLowerCase().replace(/[_\s]+/g, '-');

const ROLE_LABEL_UPPERCASE_WORDS = new Set(['hr', 'it']);
const formatRoleLabel = (role?: string) => {
  const raw = String(role || '').trim();
  if (!raw) return '-';
  return raw
    .replace(/[_\s]+/g, '-')
    .split('-')
    .filter(Boolean)
    .map((word) => (ROLE_LABEL_UPPERCASE_WORDS.has(word.toLowerCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(' ');
};

const formatDepartmentLabel = (department?: string) => {
  const raw = String(department || '').trim();
  if (!raw) return 'All Departments';
  return raw
    .split(/\s+/)
    .map((word) => (ROLE_LABEL_UPPERCASE_WORDS.has(word.toLowerCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(' ');
};

const getInitials = (name?: string) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.map((p) => p[0]).join('').slice(0, 2).toUpperCase();
};

const formatActionedBy = (entry: { actionedBy?: string; actionedByDesignation?: string; actionedByDepartment?: string }) => {
  const name = (entry.actionedBy || '').trim();
  if (!name) return '-';
  const bracket = [entry.actionedByDesignation, entry.actionedByDepartment].filter(Boolean).join(' · ');
  return bracket ? `${name} (${bracket})` : name;
};

const formatLeaveModeLabel = (entry: { leaveMode?: string; halfDaySession?: string; leaveHours?: number }, dailyWorkingHours: number) => {
  const leaveMode = normalizeLeaveMode(entry?.leaveMode || '');
  if (leaveMode === 'half_day') {
    return `Half Day${entry?.halfDaySession ? ` | ${getHalfDaySessionLabel(entry.halfDaySession, dailyWorkingHours)}` : ''}`;
  }
  if (leaveMode === 'partial_day') {
    const hours = Number(entry?.leaveHours || 0);
    return hours > 0 ? `${hours} ${hours === 1 ? 'Hour' : 'Hours'}` : 'Partial Day';
  }
  return 'Full Day';
};

const INITIAL_LEAVE_FORM: LeaveForm = {
  type: '',
  leaveMode: 'full_day',
  halfDaySession: '',
  partialDayHours: 0,
  start: '',
  end: '',
  reason: '',
  days: 0,
};

export function LeaveRequestsPage() {
  const location = useLocation();

  const currentUser = getStoredUser();
  const actingContext = getStoredActingManagerContext(currentUser);
  const isActingManagerView = Boolean(actingContext?.departmentName);
  const currentUserId = currentUser?.id || currentUser?._id || null;
  const isHrPersonalLeaveRoute = location.pathname === '/dashboard/hr/my-leave-requests';
  const membershipRole = normalizeRole(currentUser?.workspaceMembership?.role || currentUser?.role || '');
  const isOwnerProfile = membershipRole === 'owner' || membershipRole === 'founder';
  const isSuperAdminProfile = membershipRole === 'super-admin';
  const isAdminProfile = canAccessAdminDashboard(currentUser) || membershipRole === 'admin' || membershipRole === 'admin-manager';
  const currentUserDepartments = [
    ...(Array.isArray(currentUser?.workspaceMembership?.departments) ? currentUser.workspaceMembership.departments : []),
    currentUser?.workspaceMembership?.department,
    currentUser?.department,
    currentUser?.workspace?.department,
    ...getManagedOrganizationDepartments(currentUser),
    actingContext?.departmentName,
  ].filter(Boolean);
  const assignedDepartmentNames = useMemo(
    () => Array.from(new Set(currentUserDepartments.map(extractDepartmentLabel).filter(Boolean))),
    [currentUserDepartments],
  );
  const assignedDepartmentKeys = useMemo(
    () => new Set(assignedDepartmentNames.map((d: string) => normalizeRole(d)).filter(Boolean)),
    [assignedDepartmentNames],
  );
  const isHrDepartment = currentUserDepartments
    .map((d: string) => String(d || '').trim().toLowerCase().replace(/[_\s]+/g, '-'))
    .some((d: string) => d === 'hr' || d.startsWith('hr-') || d.includes('human-resources') || d.includes('hr-department') || d.includes('hr-team'));
  const isHrProfile = membershipRole === 'hr' || membershipRole === 'hr-manager' || (membershipRole === 'manager' && isHrDepartment);
  const isAdministrationDepartment = currentUserDepartments
    .map((d: string) => String(d || '').trim().toLowerCase().replace(/[_\s]+/g, '-'))
    .some((d: string) => d === 'administration' || d === 'admin' || d.startsWith('admin-') || d.includes('administration-department') || d.includes('admin-team'));
  const isAdministrationProfile = membershipRole === 'admin-manager' || (membershipRole === 'manager' && isAdministrationDepartment);
  const isSalesDepartment = currentUserDepartments
    .map((d: string) => String(d || '').trim().toLowerCase().replace(/[_\s]+/g, '-'))
    .some((d: string) => d === 'sales' || d.startsWith('sales-') || d.includes('sales-crm') || d.includes('sales-team'));
  const isSalesProfile = canAccessSalesDashboard(currentUser) || (membershipRole === 'manager' && isSalesDepartment);
  const isFinanceProfile = canAccessFinanceDashboard(currentUser);
  const isTechProfile = canAccessTechDashboard(currentUser);
  const isITProfile = canAccessITDashboard(currentUser);
  const isMaintenanceProfile = canAccessMaintenanceDashboard(currentUser);
  const isDepartmentManagerProfile = membershipRole === 'manager' || membershipRole === 'admin-manager' || isHrProfile || isAdministrationProfile || isSalesProfile || isFinanceProfile || isTechProfile || isITProfile || isMaintenanceProfile;
  const profile = {
    name: currentUser?.fullName || [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || currentUser?.name || 'Super Admin',
    role: currentUser?.role || currentUser?.designation || (isOwnerProfile ? 'Founder' : 'Super-Admin'),
  };

  const canManageLeaveRequests = isDepartmentManagerProfile || isAdminProfile || isSuperAdminProfile || isOwnerProfile;
  const [activeTab, setActiveTab] = useState(
    isActingManagerView ? 'leave-requests' : 'my-leaves',
  );
  const [requestQueueStatus, setRequestQueueStatus] = useState('all');
  const [myLeaveStatus, setMyLeaveStatus] = useState('all');
  const [viewingRequest, setViewingRequest] = useState<LeaveRequest | null>(null);
  const [isLoadingLeaveRequests, setIsLoadingLeaveRequests] = useState(true);
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [formData, setFormData] = useState<LeaveForm>(INITIAL_LEAVE_FORM);
  const [medicalCertFile, setMedicalCertFile] = useState<File | null>(null);
  const [certUploadFile, setCertUploadFile] = useState<File | null>(null);
  const [isCertUploading, setIsCertUploading] = useState(false);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalances>({});
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeConfig[]>([]);
  const [dailyWorkingHours, setDailyWorkingHours] = useState(8);
  const [workingSchedule, setWorkingSchedule] = useState({ start: '09:30', end: '18:30', breakMinutes: 60, timezone: 'Asia/Kolkata' });
  const [holidayDatesByYear, setHolidayDatesByYear] = useState<Record<string, string[]>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [allEntries, setAllEntries] = useState<LeaveRequest[]>([]);
  const todayDateKey = useMemo(() => getWorkspaceDateKey(new Date(), workingSchedule.timezone), [workingSchedule.timezone]);
  const holidayDateKeys = useMemo(
    () => new Set(Object.values(holidayDatesByYear).flat()),
    [holidayDatesByYear],
  );

  const adminDepartmentKeys = useMemo(
    () => new Set(currentUserDepartments.map((d: string) => normalizeRole(d)).filter(Boolean)),
    [currentUserDepartments],
  );

  const allDepartments = useMemo(() => {
    if (assignedDepartmentNames.length > 0) return assignedDepartmentNames;
    return ['HR', 'Administration', 'Sales', 'IT', 'Tech', 'Finance', 'Maintenance'];
  }, [assignedDepartmentNames]);

  const normalizeLeaveRequest = (entry: any): LeaveRequest => ({
    ...entry,
    recordId: entry.recordId,
    id: entry.id,
    status: entry.status || 'pending',
    rejectionReason: entry.rejectionReason || '',
    actionedBy: entry.actionedBy || '',
    leaveMode: normalizeLeaveMode(entry.leaveMode),
    halfDaySession: entry.halfDaySession || '',
    medicalCertAttached: Boolean(entry.medicalCertAttached),
    medicalCertName: entry.medicalCertName || '',
    medicalCertUrl: entry.medicalCertUrl || '',
    medicalCertMimeType: entry.medicalCertMimeType || '',
    requesterBalance: Number(entry.requesterBalance || 0),
  });

  useEffect(() => {
    let isMounted = true;
    const loadLeaveRequests = async () => {
      try {
        const response = await getLeaveRequests();
        if (!isMounted) return;
        const data = response?.data || response || {};
        const entries = data.leaveRequests || [];
        const balanceData = data.leaveBalances || {};
        const configuredTypes = Array.isArray(balanceData.leaveTypes) ? balanceData.leaveTypes : [];
        setLeaveTypes(configuredTypes);
        setLeaveBalances(balanceData.balances || {});
        setDailyWorkingHours(Math.max(1, Number(balanceData.dailyWorkingHours) || 8));
        setWorkingSchedule({
          start: String(balanceData.workingHoursStart || '09:30'),
          end: String(balanceData.workingHoursEnd || '18:30'),
          breakMinutes: Math.max(0, Number(balanceData.breakDurationMinutes ?? 60) || 0),
          timezone: String(balanceData.timezone || 'Asia/Kolkata'),
        });
        setFormData((prev) => ({
          ...prev,
          type: configuredTypes.some((type: LeaveTypeConfig) => type.id === prev.type)
            ? prev.type
            : (configuredTypes[0]?.id || ""),
        }));
        setAllEntries(entries.map(normalizeLeaveRequest));
        setErrorMessage('');
      } catch (error: any) {
        if (isMounted) setErrorMessage(error.message || 'Unable to load leave requests right now.');
      } finally {
        if (isMounted) setIsLoadingLeaveRequests(false);
      }
    };
    loadLeaveRequests();
    const intervalId = window.setInterval(loadLeaveRequests, 3000);
    return () => { isMounted = false; window.clearInterval(intervalId); };
  }, []);

  useEffect(() => {
    const years = Array.from(new Set(
      [todayDateKey, formData.start, formData.end]
        .filter(Boolean)
        .map((dateKey) => String(dateKey).slice(0, 4)),
    ));
    const missingYears = years.filter((year) => !(year in holidayDatesByYear));
    if (missingYears.length === 0) return;

    let isMounted = true;
    Promise.all(missingYears.map(async (year) => {
      const response = await getHolidays({ year: Number(year) });
      const holidays = Array.isArray(response?.holidays) ? response.holidays : [];
      return [year, holidays
        .filter((holiday: any) => holiday?.entryKind !== 'event' && holiday?.isActive !== false)
        .map((holiday: any) => toDateKey(holiday?.date || holiday?.dateKey || ''))
        .filter(Boolean)] as const;
    }))
      .then((entries) => {
        if (!isMounted) return;
        setHolidayDatesByYear((previous) => ({ ...previous, ...Object.fromEntries(entries) }));
      })
      .catch(() => {
        // The server remains authoritative if a holiday preview request fails.
      });

    return () => { isMounted = false; };
  }, [formData.end, formData.start, holidayDatesByYear, todayDateKey]);

  useEffect(() => {
    if (isActingManagerView) {
      if (activeTab !== 'leave-requests') setActiveTab('leave-requests');
      return;
    }
    if (isHrPersonalLeaveRoute) {
      if (activeTab !== 'my-leaves') setActiveTab('my-leaves');
      return;
    }
    const defaultTab = 'my-leaves';

    const allowedTabs = new Set(['my-leaves']);
    if (isOwnerProfile || isSuperAdminProfile) allowedTabs.add('company-leaves');
    if (isAdminProfile && assignedDepartmentNames.length > 0) allowedTabs.add('assigned-dept-leaves');
    if (canManageLeaveRequests) allowedTabs.add('leave-requests');
    if (!allowedTabs.has(activeTab)) setActiveTab(defaultTab);
  }, [activeTab, assignedDepartmentNames.length, canManageLeaveRequests, isActingManagerView, isAdminProfile, isHrPersonalLeaveRoute, isOwnerProfile, isSuperAdminProfile]);

  useEffect(() => {
    if (formData.leaveMode === 'half_day' && formData.start && formData.end !== formData.start) {
      setFormData((prev) => ({ ...prev, end: prev.start || prev.end }));
    }
    if (formData.leaveMode === 'partial_day') {
      setFormData((prev) => ({ ...prev, end: prev.start || '', halfDaySession: '' }));
    }
  }, [formData.leaveMode, formData.start, formData.end]);

  useEffect(() => {
    if (!formData.start) return;
    if (formData.leaveMode === 'half_day') {
      setFormData((prev) => ({ ...prev, end: prev.start || prev.end, days: 0.5 }));
      return;
    }
    if (formData.leaveMode === 'partial_day') {
      setFormData((prev) => ({ ...prev, days: Math.round(Math.min(1, (prev.partialDayHours || 0) / PARTIAL_LEAVE_DAY_HOURS) * 100) / 100 }));
      return;
    }
    if (formData.end) {
      setFormData((prev) => ({ ...prev, days: calculateWorkingDays(prev.start, prev.end, holidayDateKeys) }));
    }
  }, [dailyWorkingHours, formData.start, formData.end, formData.leaveMode, formData.partialDayHours, holidayDateKeys]);

  const requestedDays = useMemo(
    () => calculateRequestedDays({ leaveMode: formData.leaveMode, startValue: formData.start, endValue: formData.end, partialDayHours: formData.partialDayHours, holidayDateKeys }),
    [formData.leaveMode, formData.start, formData.end, formData.partialDayHours, holidayDateKeys],
  );

  const halfDaySlots = useMemo(() => {
    const configuredStart = parseTimeMinutes(workingSchedule.start);
    const configuredEnd = parseTimeMinutes(workingSchedule.end);
    const startMinutes = configuredStart ?? 9 * 60 + 30;
    const fallbackEnd = startMinutes + Math.round(dailyWorkingHours * 60) + workingSchedule.breakMinutes;
    const endMinutes = configuredEnd != null && configuredEnd > startMinutes ? configuredEnd : fallbackEnd;
    const workingMinutes = Math.max(60, endMinutes - startMinutes - workingSchedule.breakMinutes);
    const halfMinutes = workingMinutes / 2;
    const firstEnd = startMinutes + halfMinutes;
    const secondStart = firstEnd + workingSchedule.breakMinutes;
    return [
      { value: 'morning', label: 'First Half', time: `${formatMinutes12h(startMinutes)} - ${formatMinutes12h(firstEnd)}`, hours: halfMinutes / 60 },
      { value: 'evening', label: 'Second Half', time: `${formatMinutes12h(secondStart)} - ${formatMinutes12h(endMinutes)}`, hours: halfMinutes / 60 },
    ];
  }, [dailyWorkingHours, workingSchedule]);

  const selectedLeaveType = leaveTypes.find((type) => type.id === formData.type) || null;
  const selectedBalance = leaveBalances[formData.type] || { total: 0, used: 0, remaining: 0 };
  const remainingBalance = Number(selectedBalance.remaining || 0);
  const isBalanceExceeded = selectedLeaveType?.requiresBalance !== false && requestedDays > remainingBalance;
  const medicalCertificateThreshold = selectedLeaveType?.medicalCertificateAfterDays ??
    (/sick/i.test(`${selectedLeaveType?.code || ''} ${selectedLeaveType?.name || ''}`) ? 1 : null);
  const requiresMedicalCert = medicalCertificateThreshold != null && requestedDays > Number(medicalCertificateThreshold);
  const viewingRequestThreshold = (() => {
    if (!viewingRequest) return null;
    const typeConfig = leaveTypes.find((t) => t.name === viewingRequest.leaveType || t.code === viewingRequest.leaveType);
    if (typeConfig?.medicalCertificateAfterDays != null) return Number(typeConfig.medicalCertificateAfterDays);
    return /sick/i.test(`${typeConfig?.code || ''} ${typeConfig?.name || ''} ${viewingRequest.leaveType || ''}`) ? 1 : null;
  })();
  const viewingRequiresCert = Boolean(
    viewingRequest &&
      ['pending', 'approved'].includes(viewingRequest.status) &&
      !viewingRequest.medicalCertAttached &&
      viewingRequestThreshold != null &&
      Number(viewingRequest.days || 0) > Number(viewingRequestThreshold),
  );
  const isViewingSickLeave = Boolean(
    viewingRequest && /sick/i.test(`${viewingRequest.leaveType || ""}`),
  );
  const isPendingMedicalCertRequired = (item: LeaveRequest): boolean => {
    if (!item) return false;
    if (String(item.status || '').toLowerCase() !== 'pending') return false;
    if (item.medicalCertAttached) return false;
    const typeConfig = leaveTypes.find((t) => t.name === item.leaveType || t.code === item.leaveType);
    const threshold = typeConfig?.medicalCertificateAfterDays ??
      (/sick/i.test(`${typeConfig?.code || ''} ${typeConfig?.name || ''} ${item.leaveType || ''}`) ? 1 : null);
    return threshold != null && Number(item.days || 0) > Number(threshold);
  };
  const renderPendingCertBadge = (item: LeaveRequest) =>
    isPendingMedicalCertRequired(item) ? (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
        <FileText size={10} strokeWidth={2.5} /> Medical Cert Pending
      </span>
    ) : null;
  const selectedDepartmentKey = normalizeRole(
    currentUser?.workspaceMembership?.department ||
      currentUser?.department ||
      currentUser?.workspace?.department ||
      currentUserDepartments[0] || '',
  );

  const departmentCapacityWarning = useMemo(() => {
    if (!selectedDepartmentKey || !formData.start) return null;
    const requestedDates = formData.leaveMode === 'half_day'
      ? [formData.start]
      : (() => {
          const dates: string[] = [];
          const start = new Date(`${formData.start}T00:00:00.000Z`);
          const end = new Date(`${formData.end || formData.start}T00:00:00.000Z`);
          if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return dates;
          const cursor = new Date(start);
          while (cursor <= end) {
            dates.push(toDateKey(cursor.toISOString()));
            cursor.setUTCDate(cursor.getUTCDate() + 1);
          }
          return dates;
        })();
    const requesterIdsToExclude = currentUserId ? new Set([String(currentUserId)]) : new Set();
    const approvedDepartmentMembers = new Set<string>();
    allEntries.forEach((entry) => {
      if (entry.status !== 'approved') return;
      if (requesterIdsToExclude.has(String(entry.requesterUserId || ''))) return;
      const entryDepartment = normalizeRole(entry.department);
      if (entryDepartment !== selectedDepartmentKey) return;
      const entryDates: string[] = [];
      const start = new Date(`${entry.startDate}T00:00:00.000Z`);
      const end = new Date(`${entry.endDate}T00:00:00.000Z`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
      const cursor = new Date(start);
      while (cursor <= end) {
        entryDates.push(toDateKey(cursor.toISOString()));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      const hasOverlap = entryDates.some((dateKey) => requestedDates.includes(dateKey));
      if (hasOverlap && entry.requesterUserId) approvedDepartmentMembers.add(String(entry.requesterUserId));
    });
    if (approvedDepartmentMembers.size >= 2) return { count: approvedDepartmentMembers.size, department: selectedDepartmentKey };
    return null;
  }, [allEntries, currentUserId, formData.end, formData.leaveMode, formData.start, selectedDepartmentKey]);

  const currentLeaveConflict = useMemo(() => {
    if (!currentUserId || !formData.start) return null;
    const start = new Date(formData.start);
    const end = new Date(formData.leaveMode === 'half_day' ? formData.start : formData.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return allEntries.find((entry) => {
      if (!entry || entry.status !== 'approved') return false;
      if (!entry.requesterUserId || String(entry.requesterUserId) !== String(currentUserId)) return false;
      const existingStart = new Date(entry.startDate!);
      const existingEnd = new Date(entry.endDate!);
      if (Number.isNaN(existingStart.getTime()) || Number.isNaN(existingEnd.getTime())) return false;
      return existingStart <= end && existingEnd >= start;
    }) || null;
  }, [allEntries, currentUserId, formData.end, formData.leaveMode, formData.start]);

  const hasApprovedLeaveConflict = Boolean(currentLeaveConflict);
  const formValidationMessage = (() => {
    if (!formData.type) return 'Select a leave category.';
    if (!formData.start) return 'Select the leave date.';
    if (formData.start < todayDateKey) return 'Past dates cannot be selected for this unit.';
    if (formData.leaveMode === 'full_day' && !formData.end) return 'Select the leave end date.';
    if (formData.end && formData.end < formData.start) return 'End date must be on or after the start date.';
    if (formData.leaveMode === 'half_day' && !formData.halfDaySession) return 'Select the first-half or second-half slot.';
    if (formData.leaveMode === 'partial_day' && (formData.partialDayHours < 0.5 || formData.partialDayHours > dailyWorkingHours)) return `Select partial leave between 30 minutes and ${dailyWorkingHours} hours.`;
    if (requestedDays <= 0) return 'The selected date or range contains no working days. Sundays and company holidays are excluded.';
    if (formData.reason.trim().length < 3) return 'Enter a reason of at least 3 characters.';
    if (isBalanceExceeded) return 'The requested duration exceeds your available leave balance.';
    if (hasApprovedLeaveConflict) return 'You already have approved leave during the selected dates.';
    return '';
  })();
  const isTeamCapacityLow = formData.start && requestedDays > 2;

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const isInThisMonth = useCallback((dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !Number.isNaN(d.getTime()) && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }, [thisMonth, thisYear]);
  const isOnLeaveToday = useCallback((item: LeaveRequest) => {
    if (item.status !== 'approved') return false;
    const s = toDateKey(item.startDate || '');
    const e = toDateKey(item.endDate || '');
    return s <= todayDateKey && e >= todayDateKey;
  }, [todayDateKey]);
  const isMyEntry = useCallback((item: LeaveRequest) =>
    item.isMe === true || (currentUserId && item.requesterUserId && String(item.requesterUserId) === String(currentUserId)) || item.employeeName === profile.name,
  [currentUserId, profile.name]);
  const isDeptEntry = useCallback((item: LeaveRequest) =>
    Boolean(item.department) && assignedDepartmentKeys.has(normalizeRole(item.department)) && normalizeRole(item.requesterRole) === 'employee',
  [assignedDepartmentKeys]);
  const canViewApprovalQueueRequest = useCallback((item: LeaveRequest, isMyEntry: boolean) => {
    if (isMyEntry || !canManageLeaveRequests) return false;
    // HR's shared queue only surfaces employee-submitted requests here;
    // requests from managers/admins/HR/etc. are handled in HR's dedicated
    // Leave Requests Processing console instead.
    if (isHrProfile) return normalizeRole(item.requesterRole) === 'employee';
    return item.isApprovalRecipient === true;
  }, [canManageLeaveRequests, isHrProfile]);

  const canCurrentUserActionRequest = useCallback(
    (item: LeaveRequest, isMyEntry: boolean) =>
      !isMyEntry && item.status === 'pending' && item.canAction === true,
    [],
  );
  const availableBalance = Object.values(leaveBalances).reduce((sum, balance) => sum + Math.max(0, Number(balance.remaining) || 0), 0);

  const tabCards = useMemo((): { key: string; label: string; value: number | string; cardClass: string; icon: any; iconClass: string }[] => {
    if (activeTab === 'my-leaves') {
      const takenThisMonth = allEntries.filter((i) => isMyEntry(i) && isInThisMonth(i.startDate || '')).reduce((sum, i) => sum + (i.days || 0), 0);
      const myPending = allEntries.filter((i) => isMyEntry(i) && i.status === 'pending').length;
      const myApproved = allEntries.filter((i) => isMyEntry(i) && i.status === 'approved').length;
      return [
        { key: 'available', label: 'Available', value: `${availableBalance} Days`, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', icon: CalendarDays, iconClass: 'bg-slate-50 text-slate-600' },
        { key: 'taken', label: 'Taken This Month', value: `${takenThisMonth} Day${takenThisMonth !== 1 ? 's' : ''}`, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500', icon: Clock, iconClass: 'bg-amber-50 text-amber-600' },
        { key: 'pending', label: 'My Pending', value: myPending, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500', icon: Clock, iconClass: 'bg-blue-50 text-blue-600' },
        { key: 'approved', label: 'My Approved', value: myApproved, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', icon: CheckCircle2, iconClass: 'bg-emerald-50 text-emerald-600' },
      ];
    } else if (activeTab === 'assigned-dept-leaves') {
      const deptTotal = allEntries.filter(isDeptEntry).length;
      const onLeaveToday = allEntries.filter((i) => isDeptEntry(i) && isOnLeaveToday(i)).length;
      const deptPending = allEntries.filter((i) => isDeptEntry(i) && i.status === 'pending').length;
      const deptApproved = allEntries.filter((i) => isDeptEntry(i) && i.status === 'approved').length;
      return [
        { key: 'total', label: 'Dept Total', value: deptTotal, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', icon: Users, iconClass: 'bg-slate-50 text-slate-600' },
        { key: 'onleave', label: 'On Leave Today', value: onLeaveToday, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500', icon: Users, iconClass: 'bg-amber-50 text-amber-600' },
        { key: 'pending', label: 'Pending', value: deptPending, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500', icon: Clock, iconClass: 'bg-blue-50 text-blue-600' },
        { key: 'approved', label: 'Approved', value: deptApproved, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', icon: CheckCircle2, iconClass: 'bg-emerald-50 text-emerald-600' },
      ];
    } else if (activeTab === 'leave-requests') {
      const totalInQueue = allEntries.filter((i) => canViewApprovalQueueRequest(i, isMyEntry(i))).length;
      const pendingAction = allEntries.filter((i) => i.status === 'pending' && canViewApprovalQueueRequest(i, isMyEntry(i))).length;
      const queueApproved = allEntries.filter((i) => i.status === 'approved' && canViewApprovalQueueRequest(i, isMyEntry(i))).length;
      const queueRejected = allEntries.filter((i) => i.status === 'rejected' && canViewApprovalQueueRequest(i, isMyEntry(i))).length;
      return [
        { key: 'total', label: 'Total in Queue', value: totalInQueue, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', icon: AlertCircle, iconClass: 'bg-slate-50 text-slate-600' },
        { key: 'pending', label: 'Pending Action', value: pendingAction, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500', icon: Clock, iconClass: 'bg-amber-50 text-amber-600' },
        { key: 'approved', label: 'Approved', value: queueApproved, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', icon: CheckCircle2, iconClass: 'bg-emerald-50 text-emerald-600' },
        { key: 'rejected', label: 'Rejected', value: queueRejected, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-red-500', icon: XCircle, iconClass: 'bg-red-50 text-red-600' },
      ];
    } else {
      const onLeaveToday = allEntries.filter(isOnLeaveToday).length;
      const approvedThisMonth = allEntries.filter((i) => i.status === 'approved' && isInThisMonth(i.startDate || '')).length;
      const totalPending = allEntries.filter((i) => i.status === 'pending').length;
      return [
        { key: 'total', label: 'Total Requests', value: allEntries.length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', icon: AlertCircle, iconClass: 'bg-slate-50 text-slate-600' },
        { key: 'onleave', label: 'On Leave Today', value: onLeaveToday, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500', icon: Users, iconClass: 'bg-amber-50 text-amber-600' },
        { key: 'pending', label: 'Pending', value: totalPending, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500', icon: Clock, iconClass: 'bg-blue-50 text-blue-600' },
        { key: 'approved', label: 'Approved This Month', value: approvedThisMonth, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', icon: CheckCircle2, iconClass: 'bg-emerald-50 text-emerald-600' },
      ];
    }
  }, [allEntries, activeTab, availableBalance, isMyEntry, isInThisMonth, isOnLeaveToday, isDeptEntry, canViewApprovalQueueRequest]);

  const filteredData = useMemo(() => {
    return allEntries.filter(item => {
      const isMyEntry = item.isMe === true || (currentUserId && item.requesterUserId && String(item.requesterUserId) === String(currentUserId)) || item.employeeName === profile.name;
      let matchesTab = false;
      const isAssignedDepartmentEmployeeEntry = Boolean(item.department) && assignedDepartmentKeys.has(normalizeRole(item.department)) && normalizeRole(item.requesterRole) === 'employee';
      if (activeTab === 'company-leaves') {
        matchesTab = true;
      } else if (activeTab === 'assigned-dept-leaves') {
        matchesTab = isAssignedDepartmentEmployeeEntry;
      } else if (activeTab === 'leave-requests') {
        if (requestQueueStatus === 'all') matchesTab = canViewApprovalQueueRequest(item, isMyEntry);
        else if (requestQueueStatus === 'pending') matchesTab = item.status === 'pending' && canViewApprovalQueueRequest(item, isMyEntry);
        else if (requestQueueStatus === 'rejected') matchesTab = item.status === 'rejected' && canViewApprovalQueueRequest(item, isMyEntry);
        else matchesTab = item.status === 'approved' && canViewApprovalQueueRequest(item, isMyEntry);
      } else if (activeTab === 'my-leaves') {
        matchesTab = isMyEntry && (myLeaveStatus === 'all' || item.status === myLeaveStatus);
      }
      const matchesSearch = item.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.employeeId && item.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.department && item.department.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter.toLowerCase();
      const matchesDept = departmentFilter === 'All' || item.department === departmentFilter;
      return matchesTab && matchesSearch && matchesStatus && matchesDept;
    });
  }, [allEntries, activeTab, requestQueueStatus, myLeaveStatus, searchQuery, statusFilter, departmentFilter, profile.name, currentUserId, assignedDepartmentKeys, canViewApprovalQueueRequest]);

  const handleApprove = async () => {
    if (!viewingRequest?.recordId) return;
    setIsSavingDecision(true);
    setErrorMessage('');
    try {
      const response = await updateLeaveRequest(viewingRequest.recordId, { status: 'approved' });
      const updatedPayload = response?.data?.leaveRequest || response?.leaveRequest;
      const updated = updatedPayload ? normalizeLeaveRequest(updatedPayload) : null;
      if (updated) setAllEntries((prev) => prev.map((r) => (r.recordId === updated.recordId ? updated : r)));
      setViewingRequest(null);
      setIsRejecting(false);
      setRejectionReason('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to approve leave request right now.');
    } finally {
      setIsSavingDecision(false);
    }
  };

  const handleReject = async () => {
    if (!viewingRequest?.recordId || !rejectionReason.trim()) return;
    setIsSavingDecision(true);
    setErrorMessage('');
    try {
      const response = await updateLeaveRequest(viewingRequest.recordId, { status: 'rejected', rejectionReason });
      const updatedPayload = response?.data?.leaveRequest || response?.leaveRequest;
      const updated = updatedPayload ? normalizeLeaveRequest(updatedPayload) : null;
      if (updated) setAllEntries((prev) => prev.map((r) => (r.recordId === updated.recordId ? updated : r)));
      setViewingRequest(null);
      setIsRejecting(false);
      setRejectionReason('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to reject leave request right now.');
    } finally {
      setIsSavingDecision(false);
    }
  };

  const handleSubmitOwnLeave = async (e: FormEvent) => {
    e.preventDefault();
    if (formValidationMessage) { toast.error(formValidationMessage); return; }
    setIsSubmittingLeave(true);
    setErrorMessage('');
    try {
      let uploadedCert: any = null;
      if (medicalCertFile) {
        const fd = new FormData();
        fd.append('file', medicalCertFile);
        const uploadResponse = await uploadLeaveCertificate(fd);
        uploadedCert = uploadResponse?.certificate || null;
      }
      const payload = {
        leaveTypeId: formData.type,
        leaveType: selectedLeaveType?.name || "",
        leaveMode: formData.leaveMode === 'partial_day' ? 'hours' : formData.leaveMode,
        leaveHours: formData.leaveMode === 'partial_day' ? (Number(formData.partialDayHours) || 0) : undefined,
        halfDaySession: formData.leaveMode === 'half_day' ? (normalizeHalfDaySession(formData.halfDaySession) || undefined) : undefined,
        startDate: formData.start,
        endDate: formData.end || formData.start,
        days: requestedDays,
        reason: formData.reason,
        medicalCertAttached: !!medicalCertFile,
        medicalCertName: uploadedCert?.name || '',
        medicalCertUrl: uploadedCert?.url || '',
        medicalCertPublicId: uploadedCert?.publicId || '',
        medicalCertMimeType: uploadedCert?.mimeType || '',
      };
      const response = await createLeaveRequest(payload);
      const createdPayload = response?.data?.leaveRequest || response?.leaveRequest;
      const newEntry = createdPayload ? normalizeLeaveRequest(createdPayload) : null;
      if (newEntry) setAllEntries(prev => [newEntry, ...prev]);
      setIsApplyModalOpen(false);
      setActiveTab('my-leaves');
      setFormData({ ...INITIAL_LEAVE_FORM, type: leaveTypes[0]?.id || "" });
      setMedicalCertFile(null);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to submit leave request.');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleUploadCertificateAfterApproval = async () => {
    if (!viewingRequest?.recordId || !certUploadFile) return;
    setIsCertUploading(true);
    setErrorMessage('');
    try {
      const fd = new FormData();
      fd.append('file', certUploadFile);
      const response = await attachLeaveCertificate(viewingRequest.recordId, fd);
      const updatedPayload = response?.data?.leaveRequest || response?.leaveRequest;
      const updated = updatedPayload ? normalizeLeaveRequest(updatedPayload) : null;
      if (updated) {
        setAllEntries((prev) => prev.map((r) => (r.recordId === updated.recordId ? updated : r)));
        setViewingRequest(updated);
        toast.success('Medical certificate uploaded for confirmation.');
      }
      setCertUploadFile(null);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to upload medical certificate.');
    } finally {
      setIsCertUploading(false);
    }
  };

  const pendingActionRequests = useMemo(() => {
    return allEntries.filter((item) => {
      if (item.status !== 'pending') return false;
      const isMyEntry = item.isMe === true || (currentUserId && item.requesterUserId && String(item.requesterUserId) === String(currentUserId)) || item.employeeName === profile.name;
      return canCurrentUserActionRequest(item, isMyEntry);
    }).length;
  }, [allEntries, currentUserId, profile.name, canCurrentUserActionRequest]);

  const getDepartmentOnLeaveCount = (department: string) =>
    allEntries.filter((entry) =>
      entry.status === 'approved' &&
      normalizeRole(entry.requesterRole) === 'employee' &&
      normalizeRole(entry.department) === normalizeRole(department) &&
      toDateKey(entry.startDate || '') <= todayDateKey &&
      toDateKey(entry.endDate || '') >= todayDateKey
    ).length;

  const showDepartmentCards = !isActingManagerView && !isHrPersonalLeaveRoute && isAdminProfile && activeTab === 'assigned-dept-leaves';
  const showAssignedDepartmentTabs = !isActingManagerView && !isHrPersonalLeaveRoute && isAdminProfile && assignedDepartmentNames.length > 0;
  const showCompanyTabs = !isActingManagerView && !isHrPersonalLeaveRoute && (isOwnerProfile || isSuperAdminProfile);
  const showApprovalTabs = !isHrPersonalLeaveRoute && canManageLeaveRequests;
  const isMyLeavesTab = activeTab === 'my-leaves';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className={statusPillClass("Approved")}>Approved</span>;
      case 'rejected': return <span className={statusPillClass("Rejected")}>Rejected</span>;
      default: return <span className={statusPillClass("Pending")}>Pending</span>;
    }
  };

  const isViewingOwnEntry = viewingRequest
    ? viewingRequest.isMe === true ||
      (currentUserId && viewingRequest.requesterUserId && String(viewingRequest.requesterUserId) === String(currentUserId)) ||
      viewingRequest.employeeName === profile.name
    : false;
  const isActionable = activeTab === 'leave-requests' && viewingRequest?.status === 'pending' && canCurrentUserActionRequest(viewingRequest, isViewingOwnEntry);

  const mainTabs = useMemo(() => {
    const tabs: { id: string; label: string }[] = [];
    if (isActingManagerView) {
      tabs.push({ id: 'leave-requests', label: 'Leave Requests' });
    } else {
      if (showAssignedDepartmentTabs) tabs.push({ id: 'assigned-dept-leaves', label: 'Assigned Dept Leaves' });
      if (showCompanyTabs) tabs.push({ id: 'company-leaves', label: 'Company Leaves' });
      if (showApprovalTabs) tabs.push({ id: 'leave-requests', label: 'Leave Requests' });
      tabs.unshift({ id: 'my-leaves', label: 'My Leaves' });
    }
    return tabs;
  }, [isActingManagerView, showAssignedDepartmentTabs, showCompanyTabs, showApprovalTabs]);

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        {isLoadingLeaveRequests && <LeaveSkeleton />}
        {!isLoadingLeaveRequests && (
          <div className="flex flex-col gap-4">

            {/* 1. HEADER */}
            <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
              <div>
                <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                  Leave Management
                </h2>
                <p className="text-xs font-pmedium text-slate-500 mt-1">
                  {isActingManagerView ? 'Review and action leave requests for this department.' : 'Review leave flow and apply for your own leave.'}
                </p>
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-600">{errorMessage}</div>
            ) : null}

            {/* 2. MAIN TABS (Pill-Style Navigation) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â above cards per DESIGN.md */}
            {mainTabs.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
                {mainTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setStatusFilter('All'); setDepartmentFilter('All'); }}
                    className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    {tab.label}
                    {tab.id === 'leave-requests' && pendingActionRequests > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-white/20 text-white text-[9px]">{pendingActionRequests}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 3. STAT CARDS ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â per-tab contextual cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
              {tabCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.key} className={card.cardClass}>
                    <div className="min-w-0">
                      <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                      <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
                    </div>
                    <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}><Icon size={16} /></div>
                  </div>
                );
              })}
            </div>

            {/* 4. DEPARTMENT ABSENCE CARDS */}
            {showDepartmentCards && (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-4">
                {allDepartments.map((dept: string, idx: number) => {
                  const accentColors = ['border-l-rose-500', 'border-l-amber-500', 'border-l-yellow-500', 'border-l-indigo-500', 'border-l-blue-500', 'border-l-emerald-500', 'border-l-slate-500'];
                  return (
                    <div key={dept} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-2 sm:gap-3 transition-all hover:shadow-md border-l-4 ${accentColors[idx % accentColors.length]}`}>
                      <p className="text-[9px] sm:text-[10px] lg:text-[11px] font-bold text-slate-500 uppercase tracking-tight sm:tracking-widest flex items-start gap-1 sm:gap-1.5 break-words leading-tight mt-0.5"><Building2 size={12} className="shrink-0 text-slate-400 mt-[1px]" /> <span className="break-words">{dept}</span></p>
                      <p className="text-xl sm:text-3xl lg:text-4xl font-black text-[#0F172A] leading-none">{getDepartmentOnLeaveCount(dept)} <span className={statusPillClass("On Leave Today")}>On Leave Today</span></p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 5. DATA PANEL */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

              {/* Toolbar: status sub-tabs + search + filter + action */}
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
                {activeTab === 'leave-requests' && showApprovalTabs && (
                  <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                    {['all', 'pending', 'approved', 'rejected'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setRequestQueueStatus(status)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${requestQueueStatus === status ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200' : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'}`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
                {activeTab === 'my-leaves' && (
                  <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                    {['all', 'pending', 'approved', 'rejected'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setMyLeaveStatus(status)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${myLeaveStatus === status ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200' : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'}`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
                {activeTab !== 'leave-requests' && activeTab !== 'my-leaves' && (
                  <div /> /* spacer */
                )}

                <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text" placeholder="Search employee..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {(activeTab === 'company-leaves' || activeTab === 'assigned-dept-leaves') && (
                    <>
                      <div className="relative">
                        <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                        <select
                          className="pl-9 pr-8 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[100px]"
                          value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}
                        >
                          <option value="All">All Departments</option>
                          {allDepartments.map((d: string) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2563EB] pointer-events-none" size={11} />
                      </div>
                      <div className="relative">
                        <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                        <select
                          className="pl-9 pr-8 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[100px]"
                          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="All">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2563EB] pointer-events-none" size={11} />
                      </div>
                    </>
                  )}
                  {!isActingManagerView && activeTab === 'my-leaves' && (
                    <button
                      onClick={() => {
                        if (leaveTypes.length === 0) {
                          toast.error('Leave types are not configured. Contact your HR manager to enable them.');
                          return;
                        }
                        setIsApplyModalOpen(true);
                      }}
                      className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                    >
                      <Plus size={13} strokeWidth={3} /> APPLY LEAVE
                    </button>
                  )}
                </div>
              </div>

              {/* Table (Desktop) / Cards (Mobile) */}
              <div className="overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden bg-white/20">
                {/* Desktop Table */}
                <table className={`hidden lg:table w-full text-left ${isMyLeavesTab ? 'min-w-[1080px]' : 'min-w-[1200px]'}`}>
                  <thead className="bg-slate-50/80 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      {isMyLeavesTab ? (
                        <>
                          <th className="px-4 py-4">Type</th>
                          <th className="px-4 py-4">From</th>
                          <th className="px-4 py-4">To</th>
                          <th className="px-4 py-4">Duration</th>
                          <th className="px-4 py-4">Leave Mode</th>
                          <th className="px-4 py-4 text-center">Status</th>
                          <th className="px-4 py-4">Approved By</th>
                          <th className="px-4 py-4 text-right">Action</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-4">Employee ID</th>
                          <th className="px-4 py-4">Employee Name</th>
                          <th className="px-4 py-4">Role</th>
                          <th className="px-4 py-4">Department</th>
                          <th className="px-4 py-4">Type</th>
                          <th className="px-4 py-4">From</th>
                          <th className="px-4 py-4">To</th>
                          <th className="px-4 py-4">Duration</th>
                          <th className="px-4 py-4 text-center">Status</th>
                          <th className="px-4 py-4 text-right">Action</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredData.map((item) => (
                      <tr key={item.recordId || item.id} className="group transition-colors hover:bg-blue-50/30">
                        {isMyLeavesTab ? (
                          <>
                            <td className="px-4 py-4 align-middle text-[11px] font-pmedium text-slate-600">{item.leaveType || 'Leave'}</td>
                            <td className="px-4 py-4 align-middle text-[11px] font-pmedium text-[#0F172A] whitespace-nowrap">{item.startDate || '-'}</td>
                            <td className="px-4 py-4 align-middle text-[11px] font-pmedium text-[#0F172A] whitespace-nowrap">{item.endDate || item.startDate || '-'}</td>
                            <td className="px-4 py-4 align-middle text-[11px] font-pmedium text-slate-600 whitespace-nowrap">{item.days ?? 0} {item.days === 1 ? 'Day' : 'Days'}</td>
                            <td className="px-4 py-4 align-middle text-[11px] font-pmedium text-slate-600 whitespace-nowrap">{formatLeaveModeLabel(item, dailyWorkingHours)}</td>
                            <td className="px-4 py-4 align-middle text-center">
                              <div className="flex flex-col items-center gap-1">
                                {getStatusBadge(item.status)}
                                {renderPendingCertBadge(item)}
                              </div>
                            </td>
                            <td className="px-4 py-4 align-middle text-[11px] font-pmedium text-slate-600 whitespace-nowrap">{item.actionedBy ? formatActionedBy(item) : '-'}</td>
                            <td className="px-4 py-4 align-middle text-right">
                              <button
                                type="button"
                                onClick={() => { setViewingRequest(item); setIsRejecting(false); setRejectionReason(''); }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB]"
                                title="View request"
                              >
                                <Eye size={14} strokeWidth={2.25} />
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-4 align-middle text-[11px] font-pmedium text-slate-500">{item.employeeId || '-'}</td>
                            <td className="px-4 py-4 align-middle">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#2563EB] to-[#1e40af] text-white text-[11px] font-semibold shadow-sm">
                                  {getInitials(item.employeeName)}
                                </div>
                                <p className="whitespace-nowrap text-[12px] font-pmedium text-[#0F172A]">{item.employeeName || '-'}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-middle text-[11px] font-pmedium text-slate-600">{formatRoleLabel(item.requesterRole)}</td>
                            <td className="px-4 py-4 align-middle text-[11px] font-pmedium text-slate-600">{formatDepartmentLabel(item.department)}</td>
                            <td className="px-4 py-4 align-middle text-[11px] font-pmedium text-slate-600">{item.leaveType || 'Leave'}</td>
                            <td className="px-4 py-4 align-middle text-[11px] font-pmedium text-[#0F172A] whitespace-nowrap">{item.startDate || '-'}</td>
                            <td className="px-4 py-4 align-middle text-[11px] font-pmedium text-[#0F172A] whitespace-nowrap">{item.endDate || item.startDate || '-'}</td>
                            <td className="px-4 py-4 align-middle text-[11px] font-pmedium text-slate-600 whitespace-nowrap">{item.days ?? 0} {item.days === 1 ? 'Day' : 'Days'}</td>
                            <td className="px-4 py-4 align-middle text-center">
                              <div className="flex flex-col items-center gap-1">
                                {getStatusBadge(item.status)}
                                {renderPendingCertBadge(item)}
                              </div>
                            </td>
                            <td className="px-4 py-4 align-middle text-right">
                              <button
                                type="button"
                                onClick={() => { setViewingRequest(item); setIsRejecting(false); setRejectionReason(''); }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB]"
                                title={activeTab === 'leave-requests' ? 'Review request' : 'View request'}
                              >
                                <Eye size={14} strokeWidth={2.25} />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Cards */}
                <div className="flex flex-col gap-3 lg:hidden p-3 sm:p-4 bg-slate-50/30">
                  {filteredData.map((item) => (
                    <div key={item.recordId || item.id} className="bg-white border border-slate-200/60 shadow-sm rounded-[20px] p-4 sm:p-5 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        {isMyLeavesTab ? (
                          <div>
                            <h3 className="text-[14px] font-pmedium text-[#0F172A] leading-tight mb-1">{item.leaveType || 'Leave'}</h3>
                            <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">{formatLeaveModeLabel(item, dailyWorkingHours)}</p>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-linear-to-br from-[#2563EB] to-[#1e40af] text-white text-xs font-semibold shadow-sm">
                              {getInitials(item.employeeName)}
                            </div>
                            <div>
                              <h3 className="text-[14px] font-pmedium text-[#0F172A] leading-tight mb-1">{item.employeeName}</h3>
                              <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">{item.employeeId || '-'}</p>
                              <p className="mt-1 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">
                                {formatDepartmentLabel(item.department)} &bull; {formatRoleLabel(item.requesterRole)}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(item.status)}
                          {renderPendingCertBadge(item)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                        {!isMyLeavesTab && (
                          <div>
                            <p className="mb-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Type</p>
                            <p className="text-[12px] font-pmedium text-[#0F172A]">{item.leaveType || 'Leave'}</p>
                          </div>
                        )}
                        <div>
                          <p className="mb-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Duration</p>
                          <p className="text-[12px] font-pmedium text-[#0F172A]">{item.days ?? 0} {item.days === 1 ? 'Day' : 'Days'}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">From</p>
                          <p className="flex items-center gap-1.5 text-[11px] font-pmedium text-[#0F172A]"><Calendar size={12} className="text-slate-400" /> {item.startDate || '-'}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">To</p>
                          <p className="flex items-center gap-1.5 text-[11px] font-pmedium text-[#0F172A]"><Calendar size={12} className="text-slate-400" /> {item.endDate || item.startDate || '-'}</p>
                        </div>
                        {isMyLeavesTab && (
                          <div className="col-span-2">
                            <p className="mb-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Approved By</p>
                            <p className="text-[12px] font-pmedium text-[#0F172A]">{item.actionedBy ? formatActionedBy(item) : '-'}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => { setViewingRequest(item); setIsRejecting(false); setRejectionReason(''); }}
                          className="flex-1 py-2.5 rounded-xl text-[12px] font-pmedium transition-all shadow-sm flex items-center justify-center gap-1.5 bg-[#2563EB] text-white hover:bg-blue-700"
                        >
                          <Eye size={14} /> {activeTab === 'leave-requests' ? 'Review Request' : 'View Record'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Empty State */}
                {filteredData.length === 0 && (
                  <div className="text-center py-20 text-slate-400 font-semibold">
                    No leave records match your criteria.
                  </div>
                )}
              </div>
            </div>

            {/* ======================================================= */}
            {/* MODAL: REVIEW / VIEW DETAIL PANEL                        */}
            {/* ======================================================= */}
            <AnimatePresence>
              {viewingRequest && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/20 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-slate-200/60 bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-[24px]"
                  >
                    <div className="flex w-full justify-center py-2 sm:hidden">
                      <div className="h-1 w-10 rounded-full bg-slate-200" />
                    </div>
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 p-4 sm:p-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]"><FileText size={17} /></div>
                        <div className="min-w-0">
                          <h2 className="text-base font-pmedium text-slate-900">{activeTab === 'leave-requests' ? 'Review Leave Request' : 'Leave Request Details'}</h2>
                          <p className="mt-0.5 truncate text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Request #{viewingRequest.id || viewingRequest.recordId || '-'} &bull; {viewingRequest.status}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setViewingRequest(null)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-700"><X size={15} /></button>
                    </div>
                    <div className="flex-1 space-y-4 overflow-y-auto bg-white p-4 sm:p-6 [&::-webkit-scrollbar]:hidden">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <div>
                          <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Employee ID</p>
                          <p className="mt-1 text-[12px] font-pmedium text-[#0F172A]">{viewingRequest.employeeId || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Employee Name</p>
                          <p className="mt-1 flex items-center gap-2 text-[12px] font-pmedium text-[#0F172A]">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#2563EB] to-[#1e40af] text-[9px] font-semibold text-white">{getInitials(viewingRequest.employeeName)}</span>
                            {viewingRequest.employeeName || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Role</p>
                          <p className="mt-1 text-[12px] font-pmedium text-[#0F172A]">{formatRoleLabel(viewingRequest.requesterRole)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Department</p>
                          <p className="mt-1 text-[12px] font-pmedium text-[#0F172A]">{formatDepartmentLabel(viewingRequest.department)}</p>
                        </div>
                        <div className="col-span-2 flex items-center justify-between border-t border-slate-200/70 pt-3">
                          <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Current Status</p>
                          {getStatusBadge(viewingRequest.status)}
                        </div>
                        {viewingRequiresCert && (
                          <div className="col-span-2 -mt-2 flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                            <p className="text-[10px] font-pmedium uppercase tracking-widest text-amber-600 flex items-center gap-1.5"><FileText size={13} /> Medical Certificate</p>
                            <span className="text-[10px] font-pmedium uppercase tracking-wider text-amber-700 bg-white border border-amber-200 px-2 py-1 rounded-lg">Pending</span>
                          </div>
                        )}
                      </div>
                      <div className="bg-slate-50/80 border border-slate-100 p-4 rounded-2xl">
                        <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">{viewingRequest.status === 'rejected' ? 'Rejected By' : 'Approved By'}</p>
                        <p className="text-[13px] font-pmedium text-[#0F172A]">{viewingRequest.actionedBy ? formatActionedBy(viewingRequest) : '-'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                          <p className="mb-1.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Type</p>
                          <p className="text-[13px] font-pmedium text-[#0F172A]">{viewingRequest.leaveType || 'Leave'}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-right">
                          <p className="mb-1.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Duration</p>
                          <p className="text-[14px] font-pmedium text-[#0F172A]">{viewingRequest.days ?? 0} {viewingRequest.days === 1 ? 'Day' : 'Days'}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                          <p className="mb-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">From</p>
                          <p className="flex items-center gap-2 text-[12px] font-pmedium text-[#0F172A]"><Calendar size={13} className="text-[#2563EB]" /> {viewingRequest.startDate || '-'}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                          <p className="mb-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">To</p>
                          <p className="flex items-center gap-2 text-[12px] font-pmedium text-[#0F172A]"><Calendar size={13} className="text-[#2563EB]" /> {viewingRequest.endDate || viewingRequest.startDate || '-'}</p>
                        </div>
                      </div>
                      {normalizeLeaveMode(viewingRequest.leaveMode || '') !== 'full_day' && (
                        <div className="bg-slate-50/80 border border-slate-100 p-4 rounded-2xl">
                          <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Leave Mode</p>
                          <p className="text-[13px] font-semibold text-[#0F172A]">
                            {normalizeLeaveMode(viewingRequest.leaveMode || '') === 'half_day'
                              ? `Half Day${viewingRequest.halfDaySession ? ` | ${getHalfDaySessionLabel(viewingRequest.halfDaySession, dailyWorkingHours)}` : ''}`
                              : `${Number(viewingRequest.leaveHours || 0) > 0 ? `${viewingRequest.leaveHours} Hours` : 'Partial Day'}`}
                          </p>
                        </div>
                      )}
                      {isActionable && (
                        <div className={`p-4 rounded-2xl border flex justify-between items-center ${(viewingRequest.days || 0) > (viewingRequest.requesterBalance || 0) ? 'bg-red-50/50 border-red-200' : 'bg-blue-50/50 border-blue-200/60'}`}>
                          <div>
                            <p className={`text-[10px] font-pmedium uppercase tracking-widest mb-1 ${(viewingRequest.days || 0) > (viewingRequest.requesterBalance || 0) ? 'text-red-500' : 'text-blue-500'}`}>Admin Balance</p>
                            <p className={`text-[14px] font-bold ${(viewingRequest.days || 0) > (viewingRequest.requesterBalance || 0) ? 'text-red-700' : 'text-blue-700'}`}>{viewingRequest.requesterBalance} Quota Left</p>
                          </div>
                          {(viewingRequest.days || 0) > (viewingRequest.requesterBalance || 0) ? (
                            <div className="flex items-center gap-1.5 text-red-600 text-[10px] font-pmedium uppercase bg-white px-2.5 py-1.5 rounded-lg border border-red-100 shadow-sm"><AlertCircle size={14} strokeWidth={2.5} /> Exceeded</div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-blue-600 text-[10px] font-pmedium uppercase bg-white px-2.5 py-1.5 rounded-lg border border-blue-100 shadow-sm"><CheckCircle2 size={14} strokeWidth={2.5} /> Available</div>
                          )}
                        </div>
                      )}
                      {isViewingSickLeave && viewingRequest.medicalCertAttached ? (
                        <div className="p-4 rounded-2xl border bg-emerald-50/50 border-emerald-100 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-emerald-500 shadow-md shadow-emerald-500/20">
                              <FileText size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-pmedium uppercase tracking-widest text-emerald-600">Medical Certificate</p>
                              <p className="text-[13px] font-bold text-emerald-900 truncate">
                                {viewingRequest.medicalCertName || 'Medical_Certificate'}
                              </p>
                              <p className="text-[9px] font-pmedium uppercase tracking-widest mt-1 text-emerald-600">
                                Document Verified
                              </p>
                            </div>
                          </div>
                          {viewingRequest.medicalCertUrl ? (
                            <a href={viewingRequest.medicalCertUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-700 text-[10px] font-pmedium uppercase tracking-wider hover:bg-emerald-50 active:scale-95 transition">
                              <Eye size={13} /> View
                            </a>
                          ) : null}
                        </div>
                      ) : viewingRequiresCert ? (
                        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50">
                          <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><FileText size={13} /> Medical Certificate Required {viewingRequest.status === 'approved' ? '(Approved)' : ''}</p>
                          <p className="text-[11px] font-semibold text-amber-800 mb-3">
                            {viewingRequest.status === 'approved'
                              ? `Upload the medical certificate to confirm your ${viewingRequest.leaveType} leave.`
                              : `A medical certificate is required for this ${viewingRequest.leaveType} leave. You can upload it now.`}
                          </p>
                          <div className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-colors cursor-pointer ${certUploadFile ? 'border-emerald-300 bg-emerald-50/50' : 'border-amber-300 bg-white hover:bg-amber-50/50 hover:border-[#2563EB]'}`}>
                            <input type="file" id="med-cert-after-approval" className="hidden" accept=".pdf,.jpg,.png" onChange={(e) => setCertUploadFile(e.target.files?.[0] || null)} />
                            <label htmlFor="med-cert-after-approval" className="flex flex-col items-center cursor-pointer">
                              {certUploadFile ? (
                                <>
                                  <CheckCircle2 size={22} className="text-emerald-500 mb-1" />
                                  <p className="text-xs font-bold text-emerald-700">{certUploadFile.name}</p>
                                  <p className="text-[9px] font-bold text-emerald-600 mt-0.5 uppercase">Click to change</p>
                                </>
                              ) : (
                                <>
                                  <UploadCloud size={22} className="text-amber-500 mb-1" />
                                  <p className="text-xs font-bold text-[#2563EB]">Upload medical certificate</p>
                                  <p className="text-[9px] font-medium text-slate-500 mt-0.5">PDF, JPG or PNG</p>
                                </>
                              )}
                            </label>
                          </div>
                          <button
                            onClick={handleUploadCertificateAfterApproval}
                            disabled={!certUploadFile || isCertUploading}
                            className="mt-3 w-full flex items-center justify-center gap-1.5 bg-[#2563EB] text-white py-2.5 rounded-xl font-pmedium uppercase tracking-wider hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-[11px]"
                          >
                            {isCertUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                            {isCertUploading ? 'UPLOADING...' : 'UPLOAD CERTIFICATE'}
                          </button>
                        </div>
                      ) : null}
                      <div className="bg-slate-50/80 border border-slate-100 p-4 rounded-2xl">
                        <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-2">Request Statement</p>
                        <p className="text-[13px] font-semibold text-slate-700 leading-relaxed">{viewingRequest.reason}</p>
                      </div>
                      {viewingRequest.status === 'rejected' && viewingRequest.rejectionReason && (
                        <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl relative overflow-hidden">
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500"></div>
                          <p className="text-[10px] font-pmedium text-red-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><XCircle size={14} /> Grounds for Rejection</p>
                          <p className="text-[13px] font-semibold text-red-900 leading-relaxed">{viewingRequest.rejectionReason}</p>
                        </div>
                      )}
                      {isRejecting && isActionable && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="p-4 sm:p-5 bg-red-50/80 border border-red-200/80 rounded-2xl"
                        >
                          <label className="text-[10px] font-pmedium text-red-600 uppercase tracking-widest mb-2 block">Mandatory Rejection Note</label>
                          <textarea
                            rows={2} required placeholder="Explain why this request is denied..."
                            className="w-full p-3 sm:p-4 text-[13px] sm:text-[14px] rounded-xl border border-red-200 outline-none focus:ring-2 focus:ring-red-200 bg-white font-pmedium text-red-900 placeholder:text-red-300 shadow-sm"
                            value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                          />
                          <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setIsRejecting(false)} className="px-4 py-2.5 text-[11px] sm:text-[12px] font-pmedium text-slate-600 hover:bg-red-100/50 rounded-xl transition-all">CANCEL</button>
                            <button onClick={handleReject} disabled={!rejectionReason.trim() || isSavingDecision} className="px-4 py-2.5 text-[11px] sm:text-[12px] font-pmedium text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 shadow-sm transition-all uppercase tracking-wider">{isSavingDecision ? 'SAVING...' : 'CONFIRM REJECT'}</button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                    <div className="p-4 sm:p-6 bg-slate-50/80 border-t border-slate-100/80 shrink-0">
                      {isActionable && !isRejecting ? (
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          <button disabled={isSavingDecision} onClick={() => {
                            setIsRejecting(true);
                            if ((viewingRequest.days || 0) > (viewingRequest.requesterBalance || 0)) setRejectionReason('Insufficient leave balance available.');

                          }} className="w-full sm:flex-1 py-3.5 sm:py-4 bg-white border border-red-200/80 text-red-600 rounded-xl font-pmedium hover:bg-red-50 shadow-sm transition-all text-[11px] sm:text-[12px] uppercase tracking-wider disabled:opacity-50">
                            REJECT
                          </button>
                          <button
                            onClick={handleApprove}
                            disabled={isSavingDecision || ((viewingRequest.days || 0) > (viewingRequest.requesterBalance || 0))}
                            className="w-full sm:flex-[2] py-3.5 sm:py-4 bg-[#2563EB] text-white rounded-xl font-pmedium shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all text-[11px] sm:text-[12px] uppercase tracking-wider disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                          >
                            {isSavingDecision ? 'SAVING...' : ((viewingRequest.days || 0) > (viewingRequest.requesterBalance || 0)) ? 'INSUFFICIENT BALANCE'
                            : 'AUTHORIZE LEAVE'}
                            <CheckCircle2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setViewingRequest(null); setIsRejecting(false); }} className="w-full py-3.5 sm:py-4 bg-white border border-slate-200/60 shadow-sm text-slate-700 rounded-xl font-pmedium hover:bg-slate-50 transition-all text-[11px] sm:text-[12px] uppercase tracking-wider">
                          CLOSE PANEL
                        </button>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* ======================================================= */}
            {/* MODAL: APPLY FOR LEAVE                                   */}
            {/* ======================================================= */}
            <AnimatePresence>
              {isApplyModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/30 backdrop-blur-sm">
                  <motion.div
                    initial={{ y: '100%', opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: '100%', opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-white rounded-t-[24px] sm:rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                  >
                    <div className="w-full flex justify-center py-2 sm:hidden">
                      <div className="w-10 h-1 bg-slate-200 rounded-full"></div>
                    </div>
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 p-4 sm:p-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]"><Calendar size={17} /></div>
                        <div className="min-w-0">
                          <h2 className="text-base font-pmedium text-slate-900">Apply for Leave</h2>
                          <p className="mt-0.5 truncate text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{isOwnerProfile ? 'Submit to HR and Manager for approval' : 'Submit to Founder or HR Manager for approval'}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setIsApplyModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-700"><X size={15} /></button>
                    </div>                    <form noValidate onSubmit={handleSubmitOwnLeave} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-white [&::-webkit-scrollbar]:hidden">
                      <div className="space-y-1">
                        <label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest">Leave Category *</label>
                        <div className="relative">
                          <select className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl font-pmedium text-[#0F172A] text-[12px] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none cursor-pointer appearance-none" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                            {leaveTypes.length === 0 ? <option value="">No leave types configured</option> : leaveTypes.map((type) => (
                              <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest">Leave Mode *</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { value: 'full_day', label: 'Full Day' },
                            { value: 'half_day', label: 'Half Day' },
                            { value: 'partial_day', label: 'Partial' },
                          ].map((mode) => (
                            <button
                              key={mode.value} type="button"
                              onClick={() => setFormData((prev) => ({
                                ...prev,
                                leaveMode: mode.value,
                                halfDaySession: mode.value === 'half_day' ? (prev.halfDaySession || 'morning') : '',
                                partialDayHours: mode.value === 'partial_day' ? Math.min(prev.partialDayHours || 1, dailyWorkingHours) : 0,
                                end: mode.value === 'half_day' ? (prev.start || prev.end) : (mode.value === 'partial_day' ? '' : (prev.end || prev.start)),
                                days: mode.value === 'half_day' ? (prev.start ? 0.5 : 0) : mode.value === 'partial_day' ? (Math.round((Math.min(prev.partialDayHours || 1, dailyWorkingHours) / PARTIAL_LEAVE_DAY_HOURS) * 100) / 100) : calculateWorkingDays(prev.start, prev.end || prev.start, holidayDateKeys),
                              }))}
                              className={`px-3 py-2 rounded-xl border text-[11px] font-pmedium uppercase tracking-wider transition-all ${formData.leaveMode === mode.value ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-sm shadow-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200 hover:text-[#2563EB]'}`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {formData.leaveMode === 'half_day' ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest">Date *</label>
                            <input type="date" required min={todayDateKey} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl font-pmedium text-[#0F172A] text-[12px] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none" value={formData.start} onChange={(e) => setFormData({ ...formData, start: e.target.value, end: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest">Session *</label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {halfDaySlots.map((session) => (
                                <button key={session.value} type="button" onClick={() => setFormData((prev) => ({ ...prev, halfDaySession: session.value }))}
                                  className={`px-2 py-2 rounded-xl border text-[10px] font-pmedium uppercase tracking-wider transition-all ${formData.halfDaySession === session.value ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                >
                                  <span className="block">{session.label}</span>
                                  <span className="block mt-0.5 text-[8px] font-semibold normal-case tracking-normal opacity-80">{session.time}</span>
                                  <span className="block text-[8px] font-semibold normal-case tracking-normal opacity-70">{Number(session.hours.toFixed(2))} hrs</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : formData.leaveMode === 'partial_day' ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest">Date *</label>
                            <input type="date" required min={todayDateKey} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl font-pmedium text-[#0F172A] text-[12px] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none" value={formData.start} onChange={(e) => setFormData({ ...formData, start: e.target.value, end: '' })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest">Hours *</label>
                            <select className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl font-pmedium text-[#0F172A] text-[12px] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none cursor-pointer appearance-none" value={formData.partialDayHours} onChange={(e) => { const h = Number(e.target.value); setFormData((prev) => ({ ...prev, partialDayHours: h, days: Math.round((h / PARTIAL_LEAVE_DAY_HOURS) * 100) / 100 })); }}>
                              {Array.from({ length: Math.max(1, Math.round(dailyWorkingHours * 2)) }, (_, index) => (index + 1) / 2).filter((hours) => hours <= dailyWorkingHours).map((h) => <option key={h} value={h}>{h} {h === 1 ? 'Hour' : 'Hours'}</option>)}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest">From Date *</label>
                            <input type="date" required min={todayDateKey} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl font-pmedium text-[#0F172A] text-[12px] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none" value={formData.start} onChange={(e) => setFormData({ ...formData, start: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest">To Date *</label>
                            <input type="date" required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl font-pmedium text-[#0F172A] text-[12px] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none" min={formData.start && formData.start > todayDateKey ? formData.start : todayDateKey} value={formData.end} onChange={(e) => setFormData({ ...formData, end: e.target.value })} />
                          </div>
                        </div>
                      )}
                      {isTeamCapacityLow && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 items-start">
                          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-[10px] font-pmedium text-amber-800 uppercase tracking-widest">Capacity Warning</h4>
                            <p className="text-[11px] font-semibold text-amber-700 mt-0.5">Other team members may be off during these dates.</p>
                          </div>
                        </div>
                      )}
                      {departmentCapacityWarning && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 items-start">
                          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-[10px] font-pmedium text-amber-800 uppercase tracking-widest">Department Capacity</h4>
                            <p className="text-[11px] font-semibold text-amber-700 mt-0.5">{departmentCapacityWarning.count} team members already on leave that day.</p>
                          </div>
                        </div>
                      )}
                      <div className={`grid grid-cols-3 gap-3 rounded-xl border p-3 transition-colors ${isBalanceExceeded ? 'bg-red-50 border-red-200' : requestedDays > 0 ? 'bg-blue-50/50 border-blue-200/60' : 'bg-slate-50 border-slate-200'}`}>
                        <div >
                          <p className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest mb-0.5">Duration</p>
                          <p className="text-xs font-bold text-[#2563EB]">{requestedDays > 0 ? (formData.leaveMode === 'partial_day' ? `${formData.partialDayHours} ${formData.partialDayHours === 1 ? 'Hr' : 'Hrs'}` : `${requestedDays} ${requestedDays > 1 ? 'Days' : 'Day'}`) : '-'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest mb-0.5">Deduction</p>
                          <p className="text-xs font-bold text-[#DC143C]">{requestedDays > 0 ? `${requestedDays} ${requestedDays === 1 ? 'Day' : 'Days'}` : '-'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest mb-0.5">Balance</p>
                          <p className="text-xs font-bold text-[#27d10d]">{remainingBalance} Days Left</p>
                        </div>
                        <p className="col-span-3 border-t border-blue-100/70 pt-2 text-[9px] font-pmedium text-slate-500">Sundays and company holidays are excluded from the deduction.</p>
                      </div>
                      {isBalanceExceeded && (
                        <div className="flex items-center gap-2 p-3 bg-red-600 text-white rounded-xl text-[11px] font-bold"><AlertCircle size={14} /> INSUFFICIENT BALANCE</div>
                      )}
                      {hasApprovedLeaveConflict && (
                        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[11px] font-bold">
                          <AlertCircle size={14} className="mt-0.5 shrink-0" />
                          <div>
                            <p className="uppercase tracking-widest text-[9px] font-black">Approved leave conflict</p>
                            <p className="mt-0.5 font-semibold">You already have an approved leave from {currentLeaveConflict?.startDate} to {currentLeaveConflict?.endDate}.</p>
                          </div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest">Reason *</label>
                        <textarea required rows={2} placeholder="Reason for leave..." className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl font-pmedium text-[#0F172A] text-[12px] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none resize-none placeholder:text-slate-400" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
                      </div>
                      {requiresMedicalCert && (
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[11px] font-bold">
                            <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                            <div>
                              <p className="uppercase tracking-widest text-[9px] font-black text-amber-600">Medical certificate required</p>
                              <p className="mt-0.5 font-semibold">A medical certificate must be provided for {selectedLeaveType?.name || 'sick'} leave longer than {medicalCertificateThreshold} {Number(medicalCertificateThreshold) === 1 ? 'day' : 'days'}. You can upload it after submitting, even once approved.</p>
                            </div>
                          </div>
                          <div className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-colors cursor-pointer ${medicalCertFile ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100/50 hover:border-[#2563EB]'}`}>
                            <input type="file" id="med-cert-sa" className="hidden" accept=".pdf,.jpg,.png" onChange={(e) => setMedicalCertFile(e.target.files?.[0] || null)} />
                            <label htmlFor="med-cert-sa" className="flex flex-col items-center cursor-pointer">
                              {medicalCertFile ? (
                                <>
                                  <CheckCircle2 size={24} className="text-emerald-500 mb-1" />
                                  <p className="text-xs font-bold text-emerald-700">{medicalCertFile.name}</p>
                                  <p className="text-[9px] font-bold text-emerald-600 mt-0.5 uppercase">Click to change</p>
                                </>
                              ) : (
                                <>
                                  <UploadCloud size={24} className="text-slate-400 mb-1" />
                                  <p className="text-xs font-bold text-[#2563EB]">Upload document</p>
                                  <p className="text-[9px] font-medium text-slate-500 mt-0.5">PDF, JPG or PNG</p>
                                </>
                              )}
                            </label>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setIsApplyModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-pmedium hover:bg-slate-200 transition-all text-[10px] uppercase tracking-wider">CANCEL</button>
                        <button type="submit" disabled={isSubmittingLeave} className="flex-1 py-3 bg-[#2563EB] text-white rounded-xl font-pmedium shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all text-[10px] flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider">
                          {isSubmittingLeave ? 'SUBMITTING...' : 'SUBMIT REQUEST'} <Send size={13} />
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </div>
        )}
      </PageFrame>
    </div>
  );
}
