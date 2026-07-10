import { useState, useMemo, useEffect, useCallback, type FormEvent } from 'react';
import {
  Search, Eye, X, Calendar, AlertCircle, CheckCircle2,
  Clock, XCircle, Filter, User, Building2, ArrowRight, FileText, ShieldAlert,
  Send, CalendarDays, UploadCloud, Users, ThumbsUp, ThumbsDown, Plus, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import PageFrame from '@/components/Pages/PageFrame';
import { getLeaveRequests, updateLeaveRequest, createLeaveRequest, uploadLeaveCertificate } from '@/services/leave-requests';
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

interface LeaveRequest {
  recordId?: string;
  id?: string;
  status: string;
  rejectionReason?: string;
  actionedBy?: string;
  leaveMode: string;
  halfDaySession?: string;
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
  isMe?: boolean;
}

interface LeaveBalances {
  Casual: { total: number; used: number; remaining: number };
  Sick: { total: number; used: number; remaining: number };
  Vacation: { total: number; used: number; remaining: number };
}

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

const calculateInclusiveDays = (startValue: string, endValue: string): number => {
  if (!startValue || !endValue) return 0;
  const start = new Date(`${startValue}T00:00:00.000Z`);
  const end = new Date(`${endValue}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
};

const calculateRequestedDays = ({ leaveMode, startValue, endValue, partialDayHours }: { leaveMode: string; startValue: string; endValue: string; partialDayHours?: number }): number => {
  if (leaveMode === 'half_day') return startValue ? 0.5 : 0;
  if (leaveMode === 'partial_day') return (partialDayHours || 0) / 8;
  return calculateInclusiveDays(startValue, endValue);
};

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeLeaveMode = (value: string) => value === 'half_day' ? 'half_day' : 'full_day';

const isAdministrationDepartmentLabel = (value: string) => {
  const n = String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
  return n === 'admin' || n === 'administration' || n.startsWith('admin-') || n.includes('administration');
};

const isHrDepartmentLabel = (value: string) => {
  const n = String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
  return n === 'hr' || n.startsWith('hr-') || n.includes('human-resources') || n.includes('hr-department') || n.includes('hr-team');
};

const normalizeHalfDaySession = (value: string) => {
  const n = String(value || '').trim().toLowerCase();
  if (n === 'morning' || n.includes('morning')) return 'morning';
  if (n === 'evening' || n.includes('evening')) return 'evening';
  return '';
};

const getHalfDaySessionLabel = (session: string) => {
  if (session === 'morning') return 'Morning (9:30 AM - 1:30 PM)';
  if (session === 'evening') return 'Evening (2:30 PM - 6:30 PM)';
  return '';
};

const normalizeRole = (role: string) =>
  String(role || '').trim().toLowerCase().replace(/[_\s]+/g, '-');

const INITIAL_LEAVE_FORM: LeaveForm = {
  type: 'Casual',
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
  const isDepartmentManagerProfile = isHrProfile || isAdministrationProfile || isSalesProfile || isFinanceProfile || isTechProfile || isITProfile || isMaintenanceProfile;
  const profile = {
    name: currentUser?.fullName || [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || currentUser?.name || 'Super Admin',
    role: currentUser?.role || currentUser?.designation || (isOwnerProfile ? 'Founder' : 'Super-Admin'),
  };

  const canManageLeaveRequests = isDepartmentManagerProfile || isAdminProfile || isSuperAdminProfile || isOwnerProfile;
  const [activeTab, setActiveTab] = useState(
    isActingManagerView ? 'leave-requests'
    : isHrPersonalLeaveRoute ? 'my-leaves'
    : (isOwnerProfile || isSuperAdminProfile) ? 'company-leaves'
    : isAdminProfile && assignedDepartmentNames.length > 0 ? 'assigned-dept-leaves'
    : canManageLeaveRequests ? 'leave-requests'
    : 'my-leaves',
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
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalances>({
    Casual: { total: 0, used: 0, remaining: 0 },
    Sick: { total: 0, used: 0, remaining: 0 },
    Vacation: { total: 0, used: 0, remaining: 0 },
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [allEntries, setAllEntries] = useState<LeaveRequest[]>([]);
  const todayDateKey = useMemo(() => getLocalDateKey(), []);

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
    requesterBalance: Number(entry.requesterBalance || 0),
  });

  useEffect(() => {
    let isMounted = true;
    const loadLeaveRequests = async () => {
      try {
        const response = await getLeaveRequests();
        if (!isMounted) return;
        const entries = response?.data?.leaveRequests || [];
        const balances = response?.data?.leaveBalances;
        if (balances?.Casual && balances?.Sick && balances?.Vacation) {
          setLeaveBalances(balances);
        }
        setAllEntries(entries.map(normalizeLeaveRequest));
        setErrorMessage('');
      } catch (error: any) {
        if (isMounted) setErrorMessage(error.message || 'Unable to load leave requests right now.');
      } finally {
        if (isMounted) setIsLoadingLeaveRequests(false);
      }
    };
    loadLeaveRequests();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (isActingManagerView) {
      if (activeTab !== 'leave-requests') setActiveTab('leave-requests');
      return;
    }
    if (isHrPersonalLeaveRoute) {
      if (activeTab !== 'my-leaves') setActiveTab('my-leaves');
      return;
    }
    const defaultTab = isOwnerProfile || isSuperAdminProfile ? 'company-leaves'
      : isAdminProfile && assignedDepartmentNames.length > 0 ? 'assigned-dept-leaves'
      : canManageLeaveRequests ? 'leave-requests' : 'my-leaves';
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
      setFormData((prev) => ({ ...prev, days: (prev.partialDayHours || 0) / 8 }));
      return;
    }
    if (formData.end) {
      setFormData((prev) => ({ ...prev, days: calculateInclusiveDays(prev.start, prev.end) }));
    }
  }, [formData.start, formData.end, formData.leaveMode, formData.partialDayHours]);

  const requestedDays = useMemo(
    () => calculateRequestedDays({ leaveMode: formData.leaveMode, startValue: formData.start, endValue: formData.end, partialDayHours: formData.partialDayHours }),
    [formData.leaveMode, formData.start, formData.end, formData.partialDayHours],
  );

  const selectedBalance = leaveBalances[formData.type as keyof LeaveBalances] || { total: 0, used: 0, remaining: 0 };
  const remainingBalance = Number(selectedBalance.remaining || 0);
  const isBalanceExceeded = requestedDays > remainingBalance;
  const requiresMedicalCert = formData.type === 'Sick' && requestedDays >= 2;
  const canSubmitHalfDay = formData.leaveMode === 'half_day' ? Boolean(formData.halfDaySession && formData.start) : true;
  const canSubmitPartialDay = formData.leaveMode === 'partial_day' ? formData.partialDayHours >= 1 && Boolean(formData.start) : true;
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
  const isFormValid = !isBalanceExceeded && !hasApprovedLeaveConflict && canSubmitHalfDay && canSubmitPartialDay && requestedDays > 0 && formData.reason.trim() !== '' && (!requiresMedicalCert || (requiresMedicalCert && medicalCertFile !== null));
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
    if (isMyEntry) return false;
    if (!canManageLeaveRequests) return false;
    const requesterRole = normalizeRole(item.requesterRole);
    const requesterDepartment = normalizeRole(item.department);
    const isEmployeeRequest = requesterRole === 'employee' || requesterRole === 'staff';
    const isManagerRequest = requesterRole === 'manager';
    const isAdminRequest = requesterRole === 'admin' || requesterRole === 'admin-manager';
    const isSuperAdminRequest = requesterRole === 'super-admin';
    if (isActingManagerView) return isEmployeeRequest && Boolean(requesterDepartment) && requesterDepartment === normalizeRole(actingContext?.departmentName);
    if (isOwnerProfile) return isSuperAdminRequest;
    if (isSuperAdminProfile) return isAdminRequest || isManagerRequest;
    if (isHrProfile) return true;
    if (isAdminProfile) {
      const matchesDepartment = assignedDepartmentKeys.has(requesterDepartment) || currentUserDepartments.some((d: string) => normalizeRole(d) === requesterDepartment);
      return isManagerRequest && Boolean(requesterDepartment) && matchesDepartment;
    }
    const itemDepartment = normalizeRole(item.department);
    const matchesDepartment = assignedDepartmentKeys.has(itemDepartment) || currentUserDepartments.some((d: string) => normalizeRole(d) === itemDepartment);
    return isEmployeeRequest && Boolean(requesterDepartment) && matchesDepartment;
  }, [canManageLeaveRequests, isActingManagerView, actingContext, isOwnerProfile, isSuperAdminProfile, isHrProfile, isAdminProfile, assignedDepartmentKeys, currentUserDepartments]);

  const canCurrentUserActionRequest = useCallback((item: LeaveRequest, isMyEntry: boolean) => item.status === 'pending' && canViewApprovalQueueRequest(item, isMyEntry), [canViewApprovalQueueRequest]);

  const availableBalance = Object.values(leaveBalances).reduce((sum, b) => sum + (b.remaining || 0), 0);

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
      const updated = response?.data?.leaveRequest ? normalizeLeaveRequest(response.data.leaveRequest) : null;
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
      const updated = response?.data?.leaveRequest ? normalizeLeaveRequest(response.data.leaveRequest) : null;
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
    if (!isFormValid) return;
    setIsSubmittingLeave(true);
    setErrorMessage('');
    try {
      let uploadedCert: any = null;
      if (medicalCertFile) {
        const fd = new FormData();
        fd.append('file', medicalCertFile);
        const uploadResponse = await uploadLeaveCertificate(fd);
        uploadedCert = uploadResponse?.data?.certificate || null;
      }
      const payload = {
        leaveType: formData.type,
        leaveMode: formData.leaveMode,
        halfDaySession: formData.leaveMode === 'half_day' ? (normalizeHalfDaySession(formData.halfDaySession) || undefined) : undefined,
        startDate: formData.start,
        endDate: formData.end,
        days: requestedDays,
        reason: formData.reason,
        medicalCertAttached: !!medicalCertFile,
        medicalCertName: uploadedCert?.name || '',
        medicalCertUrl: uploadedCert?.url || '',
        medicalCertPublicId: uploadedCert?.publicId || '',
        medicalCertMimeType: uploadedCert?.mimeType || '',
      };
      const response = await createLeaveRequest(payload);
      const newEntry = response?.data?.leaveRequest ? normalizeLeaveRequest(response.data.leaveRequest) : null;
      if (newEntry) setAllEntries(prev => [newEntry, ...prev]);
      setIsApplyModalOpen(false);
      setActiveTab('my-leaves');
      setFormData(INITIAL_LEAVE_FORM);
      setMedicalCertFile(null);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to submit leave request.');
    } finally {
      setIsSubmittingLeave(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className={statusPillClass("Approved")}>Approved</span>;
      case 'rejected': return <span className={statusPillClass("Rejected")}>Rejected</span>;
      default: return <span className={statusPillClass("Pending")}>Pending</span>;
    }
  };

  const getLeaveTypeBadge = (type?: string) => {
    if (type === 'Sick') return <span className={statusPillClass(type)}>{type}</span>;
    if (type === 'Vacation') return <span className={statusPillClass(type)}>{type}</span>;
    return <span className={statusPillClass(type || 'Casual')}>{type || 'Casual'}</span>;
  };

  const getLeaveModeBadge = (entry: LeaveRequest) => {
    const leaveMode = normalizeLeaveMode(entry?.leaveMode || '');
    if (leaveMode === 'half_day') {
      return (
        <span className={statusPillClass("Half Day")}>
          Half Day{entry?.halfDaySession ? ` | ${getHalfDaySessionLabel(entry.halfDaySession)}` : ''}
        </span>
      );
    }
    return (
      <span className={statusPillClass("Full Day")}>
        Full Day
      </span>
    );
  };

  const getApprovalFlowMeta = (entry: LeaveRequest) => {
    const requesterRole = (entry?.requesterRole || '').toLowerCase();
    const requesterDepartment = normalizeRole(entry?.department);
    const status = (entry?.status || '').toLowerCase();
    const actionedByRaw = (entry?.actionedBy || '').trim();
    if (status === 'pending') {
      if (requesterRole === 'employee' || requesterRole === 'staff') {
        if (isHrDepartmentLabel(requesterDepartment)) return { label: 'Pending with HR Manager', tone: 'amber' };
        if (isAdministrationDepartmentLabel(requesterDepartment)) return { label: 'Pending with Admin Manager and HR', tone: 'amber' };
        return { label: 'Pending with Manager and HR', tone: 'amber' };
      }
      if (requesterRole === 'owner') return { label: 'Pending with HR Manager', tone: 'amber' };
      if (requesterRole === 'super-admin') return { label: 'Pending with Founder / HR Manager', tone: 'amber' };
      if (requesterRole === 'admin' || requesterRole === 'admin-manager') return { label: 'Pending with Super Admin / HR Manager', tone: 'amber' };
      if (requesterRole === 'manager') {
        if (isHrDepartmentLabel(requesterDepartment)) return { label: 'Pending with Assigned Admin or Super Admin', tone: 'amber' };
        return { label: 'Pending with Assigned Admin or Super Admin and HR', tone: 'amber' };
      }
      if (isAdministrationDepartmentLabel(requesterDepartment)) return { label: 'Pending with Super Admin', tone: 'amber' };
      if (isHrDepartmentLabel(requesterDepartment)) return { label: 'Pending with Super Admin', tone: 'amber' };
      return { label: 'Pending review', tone: 'amber' };
    }
    if (status === 'approved') return { label: actionedByRaw ? `Approved by ${actionedByRaw}` : 'Approved', tone: 'emerald' };
    if (status === 'rejected') return { label: actionedByRaw ? `Rejected by ${actionedByRaw}` : 'Rejected', tone: 'rose' };
    return { label: 'In progress', tone: 'slate' };
  };

  const getApprovalFlowBadge = (entry: LeaveRequest) => {
    const flow = getApprovalFlowMeta(entry);
    if (flow.tone === 'emerald') return <span className={statusPillClass(flow.label)}>{flow.label}</span>;
    if (flow.tone === 'rose') return <span className={statusPillClass(flow.label)}>{flow.label}</span>;
    if (flow.tone === 'amber') return <span className={statusPillClass(flow.label)}>{flow.label}</span>;
    return <span className={statusPillClass(flow.label)}>{flow.label}</span>;
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
      tabs.push({ id: 'my-leaves', label: 'My Leaves' });
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

            {/* 2. MAIN TABS (Pill-Style Navigation) — above cards per DESIGN.md */}
            {mainTabs.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
                {mainTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setStatusFilter('All'); setDepartmentFilter('All'); }}
                    className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    {tab.label}
                    {tab.id === 'leave-requests' && pendingActionRequests > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-white/20 text-white text-[9px]">{pendingActionRequests}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 3. STAT CARDS — per-tab contextual cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
              {tabCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.key} className={card.cardClass}>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                      <p className="text-[15px] font-black text-slate-900">{card.value}</p>
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
                {activeTab === 'my-leaves' && isDepartmentManagerProfile && (
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
                  {!isActingManagerView && (
                    <button
                      onClick={() => setIsApplyModalOpen(true)}
                      className="btn-pill bg-[#2563EB] text-white px-4 py-2.5 flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                    >
                      <Plus size={13} strokeWidth={3} /> APPLY LEAVE
                    </button>
                  )}
                </div>
              </div>

              {/* Table (Desktop) / Cards (Mobile) */}
              <div className="overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden bg-white/20">
                {/* Desktop Table */}
                <table className="hidden lg:table w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Employee / Role</th>
                      <th className="px-5 py-4">Leave Type</th>
                      <th className="px-5 py-4">Duration</th>
                      <th className="px-5 py-4 text-center">Status</th>
                      <th className="px-5 py-4">Workflow</th>
                      {activeTab === 'company-leaves' && showCompanyTabs && <th className="px-5 py-4">Managed By</th>}
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredData.map((item) => (
                      <tr key={item.recordId || item.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-5 py-4 align-top">
                          <p className="font-pmedium text-[#0F172A] text-[13px] sm:text-[14px] flex items-center gap-2">
                            <User size={14} className="text-slate-400" />
                            {item.employeeName}
                          </p>
                          {item.employeeId && (
                            <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mt-1">{item.employeeId}</p>
                          )}
                          <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mt-1">
                            {item.department || <span className="text-slate-600 font-pmedium">GLOBAL</span>} &bull; <span className="text-slate-700">{item.requesterRole}</span>
                          </p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          {getLeaveTypeBadge(item.leaveType)}
                          <div className="mt-2 flex flex-wrap gap-1.5">{getLeaveModeBadge(item)}</div>
                          <p className="text-[11px] font-pmedium text-slate-500 uppercase mt-2">{item.days} Total {item.days && item.days > 1 ? 'Days' : 'Day'}</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="font-pmedium text-[#0F172A] text-[13px] flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" /> {item.startDate}</p>
                          <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mt-1 ml-5">To: {item.endDate}</p>
                        </td>
                        <td className="px-5 py-4 align-top text-center">{getStatusBadge(item.status)}</td>
                        <td className="px-5 py-4 align-top">{getApprovalFlowBadge(item)}</td>
                        {activeTab === 'company-leaves' && showCompanyTabs && (
                          <td className="px-5 py-4 align-top">
                            {item.actionedBy ? (
                              <span className={statusPillClass(item.actionedBy)}>{item.actionedBy}</span>
                            ) : (
                              <span className={statusPillClass("Awaiting Action")}>Awaiting Action</span>
                            )}
                          </td>
                        )}
                        <td className="px-5 py-4 align-top text-right">
                          <button
                            onClick={() => { setViewingRequest(item); setIsRejecting(false); setRejectionReason(''); }}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                            title={activeTab === 'leave-requests' ? 'Review' : 'View'}
                          >
                            <Eye size={15} strokeWidth={2.5} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Cards */}
                <div className="flex flex-col gap-3 lg:hidden p-3 sm:p-4 bg-slate-50/30">
                  {filteredData.map((item) => (
                    <div key={item.recordId || item.id} className="bg-white border border-slate-200/60 shadow-sm rounded-[20px] p-4 sm:p-5 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.requesterRole === 'Admin' ? 'bg-indigo-50 border-indigo-100' : 'bg-blue-50 border-blue-100'}`}>
                            <User className={item.requesterRole === 'Admin' ? 'text-indigo-600' : 'text-[#2563EB]'} size={18} />
                          </div>
                          <div>
                            <h3 className="text-[14px] font-bold text-[#0F172A] leading-tight mb-1">{item.employeeName}</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              {item.department || <span className="text-indigo-600 font-black">GLOBAL</span>} &bull; {item.requesterRole}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(item.status)}
                      </div>
                      <div>{getApprovalFlowBadge(item)}</div>
                      <div className="grid grid-cols-2 gap-3 bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Leave Type</p>
                          {getLeaveTypeBadge(item.leaveType)}
                          <div className="mt-2">{getLeaveModeBadge(item)}</div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Duration</p>
                          <p className="text-[12px] font-bold text-[#0F172A] truncate flex items-center gap-1.5"><Calendar size={12} className="text-slate-400" /> {item.days} Day{item.days && item.days > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      {activeTab === 'company-leaves' && showCompanyTabs && item.actionedBy && (
                        <div className="text-[10px] font-bold text-slate-500 border-t border-slate-100 pt-2 shrink-0">
                          <span className="uppercase tracking-widest opacity-80">Actioned By:</span> {item.actionedBy}
                        </div>
                      )}
                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => { setViewingRequest(item); setIsRejecting(false); setRejectionReason(''); }}
                          className="btn-pill flex-1 py-2.5 transition-all shadow-sm flex items-center justify-center gap-1.5 bg-[#2563EB] text-white hover:bg-blue-700"
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
                    className="bg-white rounded-t-[32px] sm:rounded-[32px] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] border border-slate-200/50"
                  >
                    <div className="w-full flex justify-center py-3 sm:hidden">
                      <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                    </div>
                    <div className="p-6 md:p-8 bg-slate-50/80 border-b border-slate-100/80 flex justify-between items-start shrink-0">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] flex items-center gap-2">
                          {activeTab === 'my-leaves' ? 'My Leave Details' : activeTab === 'leave-requests' ? 'Review Admin Request' : 'Leave Summary'}
                        </h2>
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Request #{viewingRequest.id} &bull; {viewingRequest.requesterRole}</p>
                      </div>
                      <button onClick={() => setViewingRequest(null)} className="w-9 h-9 sm:w-10 sm:h-10 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all"><X size={18} /></button>
                    </div>
                    <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Employee Details</p>
                          <p className="font-bold text-[#0F172A] flex items-center gap-1.5"><User size={14} className={viewingRequest.requesterRole === 'Admin' ? 'text-indigo-600' : 'text-[#2563EB]'} /> {viewingRequest.employeeName}</p>
                          {viewingRequest.employeeId && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{viewingRequest.employeeId}</p>}
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{viewingRequest.department || <span className="text-indigo-600 font-black">GLOBAL JURISDICTION</span>}</p>
                        </div>
                        <div className="text-right">{getStatusBadge(viewingRequest.status)}</div>
                      </div>
                      <div className="bg-slate-50/80 border border-slate-100 p-4 rounded-2xl flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Workflow State</p>
                          <p className="text-[12px] font-semibold text-slate-600">Approval routing and final decision provenance.</p>
                        </div>
                        {getApprovalFlowBadge(viewingRequest)}
                      </div>
                      {viewingRequest.status !== 'pending' && viewingRequest.actionedBy ? (
                        <div className="bg-slate-50/80 border border-slate-100 p-4 rounded-2xl flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{viewingRequest.status === 'approved' ? 'Approved By' : 'Rejected By'}</p>
                            <p className="text-[13px] font-semibold text-[#0F172A]">{viewingRequest.actionedBy}</p>
                          </div>
                          <div className="text-[10px] font-pmedium uppercase tracking-wider text-slate-600">
                            {viewingRequest.status}
                          </div>
                        </div>
                      ) : null}
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Request Type</p>
                          {getLeaveTypeBadge(viewingRequest.leaveType)}
                        </div>
                        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-right">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total Duration</p>
                          <p className="font-bold text-[#0F172A] text-lg leading-none">{viewingRequest.days} <span className="text-sm font-semibold text-slate-500">{viewingRequest.days && viewingRequest.days > 1 ? 'Days' : 'Day'}</span></p>
                        </div>
                        <div className="col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                          <p className="font-semibold text-[#0F172A] text-[13px] flex items-center gap-2"><Calendar size={14} className="text-slate-400" /> {viewingRequest.startDate}</p>
                          <ArrowRight size={14} className="text-slate-300" />
                          <p className="font-semibold text-[#0F172A] text-[13px] flex items-center gap-2"><Calendar size={14} className="text-slate-400" /> {viewingRequest.endDate}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50/80 border border-slate-100 p-4 rounded-2xl flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Leave Mode</p>
                          <p className="text-[13px] font-semibold text-[#0F172A]">
                            {normalizeLeaveMode(viewingRequest.leaveMode || '') === 'half_day'
                              ? `Half Day${viewingRequest.halfDaySession ? ` | ${getHalfDaySessionLabel(viewingRequest.halfDaySession)}` : ''}`
                              : 'Full Day'}
                          </p>
                        </div>
                        {getLeaveModeBadge(viewingRequest)}
                      </div>
                      {isActionable && (
                        <div className={`p-4 rounded-2xl border flex justify-between items-center ${(viewingRequest.days || 0) > (viewingRequest.requesterBalance || 0) ? 'bg-red-50/50 border-red-200' : 'bg-blue-50/50 border-blue-200/60'}`}>
                          <div>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${(viewingRequest.days || 0) > (viewingRequest.requesterBalance || 0) ? 'text-red-500' : 'text-blue-500'}`}>Admin Balance</p>
                            <p className={`text-[14px] font-bold ${(viewingRequest.days || 0) > (viewingRequest.requesterBalance || 0) ? 'text-red-700' : 'text-blue-700'}`}>{viewingRequest.requesterBalance} Quota Left</p>
                          </div>
                          {(viewingRequest.days || 0) > (viewingRequest.requesterBalance || 0) ? (
                            <div className="flex items-center gap-1.5 text-red-600 text-[10px] font-black uppercase bg-white px-2.5 py-1.5 rounded-lg border border-red-100 shadow-sm"><AlertCircle size={14} strokeWidth={2.5} /> Exceeded</div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-blue-600 text-[10px] font-black uppercase bg-white px-2.5 py-1.5 rounded-lg border border-blue-100 shadow-sm"><CheckCircle2 size={14} strokeWidth={2.5} /> Available</div>
                          )}
                        </div>
                      )}
                      {viewingRequest.leaveType === 'Sick' && (viewingRequest.days || 0) >= 2 && (
                        <div className={`p-4 rounded-2xl border flex items-center justify-between ${viewingRequest.medicalCertAttached ? 'bg-emerald-50/50 border-emerald-100' : 'bg-orange-50/50 border-orange-200'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${viewingRequest.medicalCertAttached ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-orange-500 shadow-md shadow-orange-500/20'}`}>
                              <FileText size={18} />
                            </div>
                            <div>
                              <p className={`text-[13px] font-bold ${viewingRequest.medicalCertAttached ? 'text-emerald-900' : 'text-orange-900'}`}>
                                {viewingRequest.medicalCertAttached ? (viewingRequest.medicalCertName || 'Medical_Certificate') : 'Missing Certificate'}
                              </p>
                              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${viewingRequest.medicalCertAttached ? 'text-emerald-600' : 'text-orange-600'}`}>
                                {viewingRequest.medicalCertAttached ? 'Document Verified' : 'Required (>2 Days)'}
                              </p>
                            </div>
                          </div>
                          {viewingRequest.medicalCertAttached && viewingRequest.medicalCertUrl ? (
                            <a href={viewingRequest.medicalCertUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                              Open
                            </a>
                          ) : null}
                        </div>
                      )}
                      <div className="bg-slate-50/80 border border-slate-100 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Request Statement</p>
                        <p className="text-[13px] font-semibold text-slate-700 leading-relaxed">{viewingRequest.reason}</p>
                      </div>
                      {viewingRequest.status === 'rejected' && viewingRequest.rejectionReason && (
                        <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl relative overflow-hidden">
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500"></div>
                          <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><XCircle size={14} /> Grounds for Rejection</p>
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
                            <button onClick={() => setIsRejecting(false)} className="btn-pill px-4 py-2.5 text-slate-600 hover:bg-red-100/50 transition-all">CANCEL</button>
                            <button onClick={handleReject} disabled={!rejectionReason.trim() || isSavingDecision} className="btn-pill px-4 py-2.5 text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 shadow-sm transition-all">{isSavingDecision ? 'SAVING...' : 'CONFIRM REJECT'}</button>
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
                            else if (viewingRequest.leaveType === 'Sick' && (viewingRequest.days || 0) >= 2 && !viewingRequest.medicalCertAttached) setRejectionReason('A medical certificate must be provided for extended sick leave.');
                          }} className="btn-pill w-full sm:flex-1 py-3.5 sm:py-4 bg-white border border-red-200/80 text-red-600 hover:bg-red-50 shadow-sm transition-all disabled:opacity-50">
                            REJECT
                          </button>
                          <button
                            onClick={handleApprove}
                            disabled={isSavingDecision || (viewingRequest.leaveType === 'Sick' && (viewingRequest.days || 0) >= 2 && !viewingRequest.medicalCertAttached) || ((viewingRequest.days || 0) > (viewingRequest.requesterBalance || 0))}
                            className="btn-pill w-full sm:flex-[2] py-3.5 sm:py-4 bg-[#2563EB] text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                          >
                            {isSavingDecision ? 'SAVING...' : (viewingRequest.leaveType === 'Sick' && (viewingRequest.days || 0) >= 2 && !viewingRequest.medicalCertAttached) ? 'MISSING CERTIFICATE'
                            : ((viewingRequest.days || 0) > (viewingRequest.requesterBalance || 0)) ? 'INSUFFICIENT BALANCE'
                            : 'AUTHORIZE LEAVE'}
                            <CheckCircle2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setViewingRequest(null); setIsRejecting(false); }} className="btn-pill w-full py-3.5 sm:py-4 bg-white border border-slate-200/60 shadow-sm text-slate-700 hover:bg-slate-50 transition-all">
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
                    <div className="p-4 sm:p-6 bg-[#0F172A] border-b border-slate-800 flex justify-between items-center shrink-0">
                      <div>
                        <h2 className="text-lg sm:text-xl font-pmedium text-white flex items-center gap-2"><Calendar size={18} /> Apply for Leave</h2>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{isOwnerProfile ? 'Submit to HR & Manager for approval' : 'Submit to Founder / HR Manager for approval'}</p>
                      </div>
                      <button onClick={() => setIsApplyModalOpen(false)} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-500 transition-all"><X size={15} /></button>
                    </div>
                    <form onSubmit={handleSubmitOwnLeave} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-white [&::-webkit-scrollbar]:hidden">
                      <div className="space-y-1">
                        <label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest">Leave Category *</label>
                        <div className="relative">
                          <select className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl font-pmedium text-[#0F172A] text-[12px] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none cursor-pointer appearance-none" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                            <option>Casual</option><option>Sick</option><option>Vacation</option>
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
                                partialDayHours: mode.value === 'partial_day' ? (prev.partialDayHours || 1) : 0,
                                end: mode.value === 'half_day' ? (prev.start || prev.end) : (mode.value === 'partial_day' ? '' : (prev.end || prev.start)),
                                days: mode.value === 'half_day' ? (prev.start ? 0.5 : 0) : mode.value === 'partial_day' ? ((prev.partialDayHours || 1) / 8) : calculateInclusiveDays(prev.start, prev.end || prev.start),
                              }))}
                              className={`px-3 py-2 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all ${formData.leaveMode === mode.value ? 'bg-[#0F172A] text-white border-[#0F172A]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
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
                            <input type="date" required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl font-pmedium text-[#0F172A] text-[12px] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none" value={formData.start} onChange={(e) => setFormData({ ...formData, start: e.target.value, end: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest">Session *</label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { value: 'morning', label: 'AM', time: '9:30-1:30' },
                                { value: 'evening', label: 'PM', time: '2:30-6:30' },
                              ].map((session) => (
                                <button key={session.value} type="button" onClick={() => setFormData((prev) => ({ ...prev, halfDaySession: session.value }))}
                                  className={`px-2 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${formData.halfDaySession === session.value ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                >
                                  <span className="block">{session.label}</span>
                                  <span className="block mt-0.5 text-[8px] font-semibold normal-case tracking-normal opacity-80">{session.time}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : formData.leaveMode === 'partial_day' ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest">Date *</label>
                            <input type="date" required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl font-pmedium text-[#0F172A] text-[12px] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none" value={formData.start} onChange={(e) => setFormData({ ...formData, start: e.target.value, end: '' })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest">Hours *</label>
                            <select className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl font-pmedium text-[#0F172A] text-[12px] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none cursor-pointer appearance-none" value={formData.partialDayHours} onChange={(e) => { const h = Number(e.target.value); setFormData((prev) => ({ ...prev, partialDayHours: h, days: h / 8 })); }}>
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => <option key={h} value={h}>{h} {h === 1 ? 'Hour' : 'Hours'}</option>)}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest">From Date *</label>
                            <input type="date" required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl font-pmedium text-[#0F172A] text-[12px] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none" value={formData.start} onChange={(e) => setFormData({ ...formData, start: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest">To Date *</label>
                            <input type="date" required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl font-pmedium text-[#0F172A] text-[12px] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none" min={formData.start} value={formData.end} onChange={(e) => setFormData({ ...formData, end: e.target.value })} />
                          </div>
                        </div>
                      )}
                      {isTeamCapacityLow && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 items-start">
                          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Capacity Warning</h4>
                            <p className="text-[11px] font-semibold text-amber-700 mt-0.5">Other team members may be off during these dates.</p>
                          </div>
                        </div>
                      )}
                      {departmentCapacityWarning && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 items-start">
                          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Department Capacity</h4>
                            <p className="text-[11px] font-semibold text-amber-700 mt-0.5">{departmentCapacityWarning.count} team members already on leave that day.</p>
                          </div>
                        </div>
                      )}
                      <div className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${isBalanceExceeded ? 'bg-red-50 border-red-200' : requestedDays > 0 ? 'bg-blue-50/50 border-blue-200/60' : 'bg-slate-50 border-slate-200'}`}>
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Duration</p>
                          <p className="text-lg font-black text-[#2563EB]">{requestedDays > 0 ? (formData.leaveMode === 'partial_day' ? `${formData.partialDayHours} ${formData.partialDayHours === 1 ? 'Hr' : 'Hrs'}` : `${requestedDays} ${requestedDays > 1 ? 'Days' : 'Day'}`) : '-'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Balance</p>
                          <p className="text-xs font-bold text-[#0F172A]">{remainingBalance} Days Left</p>
                        </div>
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
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-pmedium text-red-500 uppercase tracking-widest flex items-center gap-1"><AlertCircle size={11} /> Medical Certificate Required (Sick &gt; 2 Days)</label>
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
                        <button type="button" onClick={() => setIsApplyModalOpen(false)} className="btn-pill flex-1 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all">CANCEL</button>
                        <button type="submit" disabled={!isFormValid || isSubmittingLeave} className="btn-pill flex-1 py-3 bg-[#2563EB] text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
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
