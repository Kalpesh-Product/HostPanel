import React, { useEffect, useState, useMemo, type FormEvent } from 'react';
import {
  Search, Plus, Eye, CheckCircle2, Clock, AlertCircle,
  Calendar, User, FileText, X, AlertTriangle, Paperclip,
  MessageSquare,   Building2, Filter
} from 'lucide-react';
import PageFrame from '@/components/Pages/PageFrame';
import {
  canAccessAdminDashboard,
  canAccessAdministrationDashboard,
  canAccessFinanceDashboard,
  canAccessEmployeeDashboard,
  canAccessHRDashboard,
  canAccessSalesDashboard,
  canAccessTechDashboard,
  canAccessITDashboard,
  canAccessMaintenanceDashboard,
  getStoredActingManagerContext,
  getStoredUser,
} from '@/lib/auth-session';
import { getWorkspaceMembers } from '@/services/auth';
import { axiosPrivate } from '@/utils/axios';
import {
  addTaskComment,
  acceptTask,
  completeTask,
  createTask,
  getTasks,
  uploadTaskAttachments,
  updateTask,
} from '@/services/tasks';
import { TasksSkeleton } from '@/components/ui/Skeleton';

const TASKS_PAGE_SIZE = 50;

interface Member {
  userId?: string;
  id?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: string;
  departments?: string[];
  email?: string;
  isSelf?: boolean;
}

interface TaskComment {
  author: string;
  text: string;
  time: string;
}

interface TaskAttachment {
  name: string;
  url?: string;
  size?: string;
}

interface Task {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  type?: string;
  department?: string;
  assignee?: string;
  assigneeUserId?: string;
  raisedBy?: string;
  raisedByUserId?: string;
  raisedByDept?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
  progress?: number;
  comments: TaskComment[];
  attachments?: TaskAttachment[];
  completionNote?: string;
}

interface TaskForm {
  title: string;
  description: string;
  type: string;
  department: string;
  assignee: string;
  assigneeUserId: string;
  priority: string;
  dueDate: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}

export function TasksPage() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const storedUser: any = getStoredUser();
  const actingContext = getStoredActingManagerContext(storedUser);
  const rawUserName: string =
    storedUser?.fullName ||
    [storedUser?.firstName, storedUser?.lastName].filter(Boolean).join(' ') ||
    storedUser?.name ||
    'Founder';
  const normalizedRole = (storedUser?.workspaceMembership?.role || storedUser?.role || 'owner').toLowerCase();
  const isOwnerProfile = normalizedRole === 'owner';
  const isSuperAdminProfile = normalizedRole === 'super_admin' || normalizedRole === 'super-admin';
  const isAdminProfile = normalizedRole === 'admin';
  const isAdminTaskProfile = canAccessAdminDashboard(storedUser) || isAdminProfile;
  const isElevatedTaskProfile = isOwnerProfile || isSuperAdminProfile || isAdminTaskProfile;
  const isHrTaskProfile = !isElevatedTaskProfile && canAccessHRDashboard(storedUser);
  const isAdministrationTaskProfile = !isElevatedTaskProfile && canAccessAdministrationDashboard(storedUser);
  const isSalesTaskProfile = !isElevatedTaskProfile && canAccessSalesDashboard(storedUser);
  const isFinanceTaskProfile = !isElevatedTaskProfile && canAccessFinanceDashboard(storedUser);
  const isTechTaskProfile = !isElevatedTaskProfile && canAccessTechDashboard(storedUser);
  const isITTaskProfile = !isElevatedTaskProfile && canAccessITDashboard(storedUser);
  const isMaintenanceTaskProfile = !isElevatedTaskProfile && canAccessMaintenanceDashboard(storedUser);
  const isDepartmentManagerProfile =
    isHrTaskProfile ||
    isAdministrationTaskProfile ||
    isSalesTaskProfile ||
    isFinanceTaskProfile ||
    isTechTaskProfile ||
    isITTaskProfile ||
    isMaintenanceTaskProfile;
  const isEmployeeTaskProfile =
    !isElevatedTaskProfile &&
    !isDepartmentManagerProfile &&
    canAccessEmployeeDashboard(storedUser);
  const displayUserName = isOwnerProfile
    ? `${rawUserName} (Founder)`
    : (isSuperAdminProfile && !actingContext)
      ? `${rawUserName} (Super Admin)`
      : rawUserName;
  const profile = {
    name: displayUserName,
    role: storedUser?.role || 'owner',
    dept: actingContext?.departmentName || (isOwnerProfile ? 'Founder' : isSuperAdminProfile ? 'Super Admin' : (storedUser?.workspaceMembership?.departments?.[0] || 'Executive')),
  };
  const currentUserId: string = storedUser?.id || storedUser?._id || '';

  const canEditTaskStatus = !isOwnerProfile;

  function normalizeIdentity(value: string): string {
    return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function stripRoleSuffix(value: string): string {
    return (value || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  }

  function roleLabel(role: string): string {
    if (!role) return 'Employee';
    return role
      .toString()
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char: string) => char.toUpperCase());
  }

  function normalizeRoleValue(role: string): string {
    const normalized = (role || '').toString().trim().toLowerCase();
    const collapsed = normalized.replace(/[^a-z]/g, '');
    if (collapsed === 'superadmin') {
      return 'super_admin';
    }
    return normalized.replace(/[-\s]+/g, '_');
  }

  function getRolePriority(role: string): number {
    const normalized = normalizeRoleValue(role);
    if (normalized === 'owner') return 5;
    if (normalized === 'super_admin') return 4;
    if (normalized === 'admin') return 3;
    if (normalized === 'manager') return 2;
    if (normalized === 'employee') return 1;
    return 0;
  }

  function resolveDisplayRole(roles: string[]): string {
    const roleList = Array.isArray(roles) ? roles : [];
    if (roleList.length === 0) {
      return 'Employee';
    }
    const topRole = roleList
      .map((role) => normalizeRoleValue(role))
      .sort((a, b) => getRolePriority(b) - getRolePriority(a))[0];
    return roleLabel(topRole);
  }

  function isCurrentUserName(name: string): boolean {
    if (!name) {
      return false;
    }
    const normalizedName = normalizeIdentity(name);
    const normalizedNameBase = normalizeIdentity(stripRoleSuffix(name));

    if (isSuperAdminProfile) {
      const superAdminAliases = ['super admin', 'super-admin', 'super_admin'];
      if (superAdminAliases.includes(normalizedName) || superAdminAliases.includes(normalizedNameBase)) {
        return true;
      }
    }

    if (isOwnerProfile) {
      const ownerAliases = ['owner', 'company owner', 'company-owner'];
      if (ownerAliases.includes(normalizedName) || ownerAliases.includes(normalizedNameBase)) {
        return true;
      }
    }

    const candidates = [
      normalizeIdentity(profile.name),
      normalizeIdentity(rawUserName),
      normalizeIdentity(stripRoleSuffix(profile.name)),
      normalizeIdentity(stripRoleSuffix(rawUserName)),
      normalizeIdentity(storedUser?.fullName || ''),
      normalizeIdentity(stripRoleSuffix(storedUser?.fullName || '')),
      normalizeIdentity([storedUser?.firstName, storedUser?.lastName].filter(Boolean).join(' ')),
    ];

    return candidates.includes(normalizedName) || candidates.includes(normalizedNameBase);
  }

  function formatPersonLabel(name: string, department?: string): string {
    if (!name) {
      return '';
    }
    if (/\([^)]*\)/.test(name)) {
      return name;
    }
    return department ? `${name} (${department})` : name;
  }

  function normalizeDepartmentKey(value: string): string {
    return (value || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function shouldShowDepartmentOption(department: string): boolean {
    const normalized = normalizeRoleValue(department);
    if (normalized === 'owner') {
      return false;
    }
    if (isSuperAdminProfile && normalized === 'super_admin') {
      return false;
    }
    return true;
  }

  function isHrDepartmentName(value: string): boolean {
    const normalized = normalizeDepartmentKey(value);
    return normalized === 'hr' || normalized.startsWith('hr') || normalized.includes('humanresources');
  }

  function isAdministrationDepartmentName(value: string): boolean {
    const normalized = normalizeDepartmentKey(value);
    return (
      normalized === 'administration' ||
      normalized === 'admin' ||
      normalized.startsWith('admin') ||
      normalized.includes('administration')
    );
  }

  function isSalesDepartmentName(value: string): boolean {
    const normalized = normalizeDepartmentKey(value);
    return (
      normalized === 'sales' ||
      normalized.startsWith('sales') ||
      normalized.includes('salescrm') ||
      normalized.includes('salesteam')
    );
  }

  function isFinanceDepartmentName(value: string): boolean {
    const normalized = normalizeDepartmentKey(value);
    return (
      normalized === 'finance' ||
      normalized === 'accounting' ||
      normalized.startsWith('finance') ||
      normalized.includes('finance') ||
      normalized.includes('accounts')
    );
  }

  function isTechDepartmentName(value: string): boolean {
    const normalized = normalizeDepartmentKey(value);
    return (
      normalized === 'tech' ||
      normalized === 'technology' ||
      normalized.startsWith('tech') ||
      normalized.includes('tech')
    );
  }

  function isITDepartmentName(value: string): boolean {
    const normalized = normalizeDepartmentKey(value);
    return (
      normalized === 'it' ||
      normalized === 'informationtechnology' ||
      normalized === 'informationtech' ||
      normalized.startsWith('it') ||
      normalized.includes('itsupport')
    );
  }

  function isMaintenanceDepartmentName(value: string): boolean {
    const normalized = normalizeDepartmentKey(value);
    return (
      normalized === 'maintenance' ||
      normalized === 'facilities' ||
      normalized === 'operations' ||
      normalized.startsWith('maintenance') ||
      normalized.includes('maintenance') ||
      normalized.includes('facilities')
    );
  }

  function isOwnerDepartmentName(value: string): boolean {
    const normalized = normalizeDepartmentKey(value);
    return normalized === 'owner' || normalized === 'companyowner';
  }

  function isSuperAdminDepartmentName(value: string): boolean {
    const normalized = normalizeDepartmentKey(value);
    const collapsed = normalized.replace(/[^a-z]/g, '');
    return normalized === 'super_admin' || normalized === 'super-admin' || collapsed === 'superadmin';
  }

  function isPlatformAdminDepartmentName(value: string): boolean {
    const normalized = normalizeDepartmentKey(value);
    const collapsed = normalized.replace(/[^a-z]/g, '');
    return normalized === 'admin' || normalized === 'platformadmin' || normalized === 'adminrouting' || collapsed === 'platformadmin' || collapsed === 'adminrouting';
  }

  function isTopManagementDepartmentName(value: string): boolean {
    return isOwnerDepartmentName(value) || isSuperAdminDepartmentName(value) || isPlatformAdminDepartmentName(value);
  }

  function canonicalizeDepartmentOption(value: string): string {
    if (isOwnerDepartmentName(value)) {
      return 'Founder';
    }
    if (isSuperAdminDepartmentName(value)) {
      return 'Super Admin';
    }
    if (isPlatformAdminDepartmentName(value)) {
      return 'Admin';
    }
    return value;
  }

  function orderDepartmentOptions(departments: string[], prioritizeTopManagement = false): string[] {
    const uniqueDepartments = Array.from(new Set((Array.isArray(departments) ? departments : []).filter(Boolean).map(canonicalizeDepartmentOption)));

    if (!prioritizeTopManagement) {
      return uniqueDepartments;
    }

    const topManagementOrder = ['Founder', 'Super Admin', 'Admin'];
    const orderedTopManagement = topManagementOrder.filter((label) =>
      uniqueDepartments.some((department) => normalizeDepartmentKey(department) === normalizeDepartmentKey(label)),
    );
    const remainingDepartments = uniqueDepartments.filter(
      (department) => !orderedTopManagement.some((label) => normalizeDepartmentKey(label) === normalizeDepartmentKey(department)),
    );

    return [...orderedTopManagement, ...remainingDepartments];
  }

  function isKnownDepartmentName(value: string): boolean {
    return (
      isHrDepartmentName(value) ||
      isAdministrationDepartmentName(value) ||
      isSalesDepartmentName(value) ||
      isFinanceDepartmentName(value) ||
      isTechDepartmentName(value) ||
      isITDepartmentName(value) ||
      isMaintenanceDepartmentName(value)
    );
  }

  function getCanonicalDepartmentLabel(value: string): string {
    if (isOwnerDepartmentName(value)) {
      return 'Founder';
    }
    if (isSuperAdminDepartmentName(value)) {
      return 'Super Admin';
    }
    if (isPlatformAdminDepartmentName(value)) {
      return 'Admin';
    }
    if (isHrDepartmentName(value)) {
      return 'HR';
    }
    if (isAdministrationDepartmentName(value)) {
      return 'Administration';
    }
    if (isSalesDepartmentName(value)) {
      return 'Sales';
    }
    if (isFinanceDepartmentName(value)) {
      return 'Finance';
    }
    if (isTechDepartmentName(value)) {
      return 'Tech';
    }
    if (isITDepartmentName(value)) {
      return 'IT';
    }
    if (isMaintenanceDepartmentName(value)) {
      return 'Maintenance';
    }
    return (value || '').toString().trim();
  }

  function getHrDepartments(): string[] {
    const departments = Array.isArray(storedUser?.workspaceMembership?.departments)
      ? storedUser.workspaceMembership.departments.filter(Boolean)
      : [];
    const hrDepartments = departments.filter((department: string) => isHrDepartmentName(department));
    return hrDepartments.length > 0 ? hrDepartments : ['HR'];
  }

  function getAdministrationDepartments(): string[] {
    const departments = [
      ...(Array.isArray(storedUser?.workspaceMembership?.departments) ? storedUser.workspaceMembership.departments : []),
      storedUser?.workspaceMembership?.department,
      storedUser?.department,
      storedUser?.workspace?.department,
    ].filter(Boolean);
    const administrationDepartments = departments.filter((department: string) => isAdministrationDepartmentName(department));
    return administrationDepartments.length > 0 ? administrationDepartments : ['Administration'];
  }

  function getSalesDepartments(): string[] {
    const departments = [
      ...(Array.isArray(storedUser?.workspaceMembership?.departments) ? storedUser.workspaceMembership.departments : []),
      storedUser?.workspaceMembership?.department,
      storedUser?.department,
      storedUser?.workspace?.department,
    ].filter(Boolean);
    const salesDepartments = departments.filter((department: string) => isSalesDepartmentName(department));
    return salesDepartments.length > 0 ? salesDepartments : ['Sales'];
  }

  function getFinanceDepartments(): string[] {
    const departments = [
      ...(Array.isArray(storedUser?.workspaceMembership?.departments) ? storedUser.workspaceMembership.departments : []),
      storedUser?.workspaceMembership?.department,
      storedUser?.department,
      storedUser?.workspace?.department,
    ].filter(Boolean);
    const financeDepartments = departments.filter((department: string) => isFinanceDepartmentName(department));
    return financeDepartments.length > 0 ? financeDepartments : ['Finance'];
  }

  function getTechDepartments(): string[] {
    const departments = [
      ...(Array.isArray(storedUser?.workspaceMembership?.departments) ? storedUser.workspaceMembership.departments : []),
      storedUser?.workspaceMembership?.department,
      storedUser?.department,
      storedUser?.workspace?.department,
    ].filter(Boolean);
    const techDepartments = departments.filter((department: string) => isTechDepartmentName(department));
    return techDepartments.length > 0 ? techDepartments : ['Tech'];
  }

  function getITDepartments(): string[] {
    const departments = [
      ...(Array.isArray(storedUser?.workspaceMembership?.departments) ? storedUser.workspaceMembership.departments : []),
      storedUser?.workspaceMembership?.department,
      storedUser?.department,
      storedUser?.workspace?.department,
    ].filter(Boolean);
    const itDepartments = departments.filter((department: string) => isITDepartmentName(department));
    return itDepartments.length > 0 ? itDepartments : ['IT'];
  }

  function getMaintenanceDepartments(): string[] {
    const departments = [
      ...(Array.isArray(storedUser?.workspaceMembership?.departments) ? storedUser.workspaceMembership.departments : []),
      storedUser?.workspaceMembership?.department,
      storedUser?.department,
      storedUser?.workspace?.department,
    ].filter(Boolean);
    const maintenanceDepartments = departments.filter((department: string) => isMaintenanceDepartmentName(department));
    return maintenanceDepartments.length > 0 ? maintenanceDepartments : ['Maintenance'];
  }

  function getEmployeeDepartments(): string[] {
    const departments = [
      ...(Array.isArray(storedUser?.workspaceMembership?.departments) ? storedUser.workspaceMembership.departments : []),
      storedUser?.workspaceMembership?.department,
      storedUser?.department,
      storedUser?.workspace?.department,
    ].filter(Boolean);

    const seen = new Set<string>();
    const assignedDepartments: string[] = [];

    departments.forEach((department: string) => {
      if (!isKnownDepartmentName(department)) {
        return;
      }
      const canonical = getCanonicalDepartmentLabel(department);
      const key = normalizeDepartmentKey(canonical);
      if (!key || seen.has(key)) {
        return;
      }
      seen.add(key);
      assignedDepartments.push(canonical);
    });

    return assignedDepartments;
  }

  function getAdminDepartments(): string[] {
    const departments = [
      ...(Array.isArray(storedUser?.workspaceMembership?.departments) ? storedUser.workspaceMembership.departments : []),
      storedUser?.workspaceMembership?.department,
      storedUser?.department,
    ].filter(Boolean);

    const seen = new Set<string>();
    const assignedDepartments: string[] = [];

    departments.forEach((department: string) => {
      if (!isKnownDepartmentName(department)) {
        return;
      }
      const canonical = getCanonicalDepartmentLabel(department);
      const key = normalizeDepartmentKey(canonical);
      if (!key || seen.has(key)) {
        return;
      }
      seen.add(key);
      assignedDepartments.push(canonical);
    });

    return assignedDepartments.length > 0 ? assignedDepartments : ['HR', 'Administration'];
  }

  function getManagedDepartments(): string[] {
    if (isAdministrationTaskProfile) {
      return getAdministrationDepartments();
    }
    if (isSalesTaskProfile) {
      return getSalesDepartments();
    }
    if (isFinanceTaskProfile) {
      return getFinanceDepartments();
    }
    if (isTechTaskProfile) {
      return getTechDepartments();
    }
    if (isITTaskProfile) {
      return getITDepartments();
    }
    if (isMaintenanceTaskProfile) {
      return getMaintenanceDepartments();
    }
    if (isHrTaskProfile) {
      return getHrDepartments();
    }
    if (isEmployeeTaskProfile) {
      return getEmployeeDepartments();
    }
    return [];
  }

  const adminAssignedDepartments = useMemo(
    () => (isAdminTaskProfile ? getAdminDepartments() : []),
    [storedUser, isAdminTaskProfile],
  );

  const adminAssignedDepartmentKeys = useMemo(
    () => new Set(adminAssignedDepartments.map((department: string) => normalizeDepartmentKey(department)).filter(Boolean)),
    [adminAssignedDepartments],
  );

  function isTaskAssignedToCurrentUser(task: Task): boolean {
    const assignedUserId = task?.assigneeUserId ? String(task.assigneeUserId) : '';
    if (assignedUserId && currentUserId && assignedUserId === String(currentUserId)) {
      return true;
    }
    return isCurrentUserName(task?.assignee || '');
  }

  function isOwnerRaisedTask(task: Task): boolean {
    const raisedByDept = normalizeDepartmentKey(task?.raisedByDept || '');
    if (raisedByDept.includes('owner')) {
      return true;
    }
    const raisedBy = normalizeIdentity(stripRoleSuffix(task?.raisedBy || ''));
    return raisedBy === 'owner' || raisedBy === 'company owner' || raisedBy === 'company-owner' || /\(owner\)/i.test(task?.raisedBy || '');
  }

  function isSuperAdminRaisedTask(task: Task): boolean {
    const raisedByDept = normalizeDepartmentKey(task?.raisedByDept || '');
    if (raisedByDept.includes('superadmin')) {
      return true;
    }
    const raisedBy = normalizeDepartmentKey(stripRoleSuffix(task?.raisedBy || ''));
    return raisedBy.includes('superadmin');
  }

  function isOwnerOrSuperAdminRaisedTask(task: Task): boolean {
    return isOwnerRaisedTask(task) || isSuperAdminRaisedTask(task);
  }

  function isAdminDepartmentTask(task: Task): boolean {
    if (!isAdminTaskProfile) {
      return false;
    }
    const taskDepartmentKey = normalizeDepartmentKey(getCanonicalDepartmentLabel(task?.department!));
    if (!taskDepartmentKey || !adminAssignedDepartmentKeys.has(taskDepartmentKey)) {
      return false;
    }
    if (task?.raisedByUserId && currentUserId && String(task.raisedByUserId) === String(currentUserId)) {
      return false;
    }
    if (isSuperAdminRaisedTask(task) && isTaskAssignedToCurrentUser(task)) {
      return false;
    }
    return true;
  }

  function isAdminCreatedTask(task: Task): boolean {
    if (!isAdminTaskProfile) {
      return false;
    }
    const taskDepartmentKey = normalizeDepartmentKey(getCanonicalDepartmentLabel(task?.department!));
    if (!taskDepartmentKey || !adminAssignedDepartmentKeys.has(taskDepartmentKey)) {
      return false;
    }
    return Boolean(task?.raisedByUserId && currentUserId && String(task.raisedByUserId) === String(currentUserId));
  }

  function isAdminSuperAdminTask(task: Task): boolean {
    if (!isAdminTaskProfile || (!isOwnerRaisedTask(task) && !isSuperAdminRaisedTask(task))) {
      return false;
    }
    return isTaskAssignedToCurrentUser(task);
  }

  function isDepartmentScopedTask(task: Task): boolean {
    if (!task?.department) {
      return false;
    }
    return !isTopManagementDepartmentName(task.department);
  }

  function isOwnerDepartmentTask(task: Task): boolean {
    if (!isOwnerProfile) {
      return false;
    }
    return isDepartmentScopedTask(task) && !isOwnerRaisedTask(task);
  }

  function isQueueTask(task: Task): boolean {
    const queueTask = !task?.assigneeUserId && /^unassigned$/i.test(task?.assignee || '');
    return queueTask && (task?.status || '').toLowerCase() === 'pending';
  }

  function isDepartmentTask(task: Task): boolean {
    if (!isDepartmentManagerProfile) {
      return false;
    }
    const taskKey = normalizeDepartmentKey(task?.department!);
    const departmentKeys = getManagedDepartments().map((department: string) => normalizeDepartmentKey(department));
    if (!departmentKeys.includes(taskKey)) {
      return false;
    }
    return isQueueTask(task);
  }

  function isDepartmentQueueTask(task: Task): boolean {
    if (!isDepartmentTask(task)) {
      return false;
    }
    return isQueueTask(task);
  }

  function isEmployeeDepartmentTask(task: Task): boolean {
    if (!isEmployeeTaskProfile) {
      return false;
    }
    const taskKey = normalizeDepartmentKey(task?.department!);
    const departmentKeys = getEmployeeDepartments().map((department: string) => normalizeDepartmentKey(department));
    if (!taskKey || !departmentKeys.includes(taskKey)) {
      return false;
    }
    return isQueueTask(task);
  }

  function isDepartmentMyTask(task: Task): boolean {
    if (!isDepartmentManagerProfile) {
      return false;
    }
    const assignedUserId = task?.assigneeUserId ? String(task.assigneeUserId) : '';
    return Boolean(currentUserId && assignedUserId && assignedUserId === String(currentUserId));
  }

  function isDepartmentAssignedToEmployeesTask(task: Task): boolean {
    if (!isDepartmentManagerProfile) {
      return false;
    }
    const raisedByUserId = task?.raisedByUserId ? String(task.raisedByUserId) : '';
    const assignedUserId = task?.assigneeUserId ? String(task.assigneeUserId) : '';
    if (!currentUserId || raisedByUserId !== String(currentUserId)) {
      return false;
    }
    if (!assignedUserId || assignedUserId === String(currentUserId)) {
      return false;
    }
    return !isDepartmentQueueTask(task);
  }

  function isMyAssignedTask(task: Task): boolean {
    if (isOwnerProfile) {
      return isOwnerRaisedTask(task);
    }
    if (isSuperAdminProfile && (task?.raisedByUserId || '') && currentUserId && String(task.raisedByUserId) === String(currentUserId)) {
      return true;
    }
    const assignedToCurrentUser = (() => {
      const assignedUserId = task?.assigneeUserId ? String(task.assigneeUserId) : '';
      if (assignedUserId && currentUserId && assignedUserId === String(currentUserId)) {
        return true;
      }
      return isCurrentUserName(task?.assignee || '');
    })();
    if (!assignedToCurrentUser) {
      return false;
    }
    return true;
  }

  function isCompanyTask(task: Task): boolean {
    return !isMyAssignedTask(task);
  }

  function getTaskMatchesActiveTab(task: Task): boolean {
    if (isAdminTaskProfile) {
      if (activeTab === 'assigned_dept_tasks') {
        return isAdminDepartmentTask(task);
      }
      if (activeTab === 'my_assigned') {
        return isAdminCreatedTask(task);
      }
      if (activeTab === 'from_super_admin') {
        return isAdminSuperAdminTask(task);
      }
      return false;
    }

    if (isDepartmentManagerProfile) {
      if (activeTab === 'department_tasks') {
        return isDepartmentQueueTask(task);
      }
      if (activeTab === 'my_tasks') {
        return isDepartmentMyTask(task);
      }
      if (activeTab === 'my_assigned') {
        return isDepartmentAssignedToEmployeesTask(task);
      }
      return false;
    }

    if (isEmployeeTaskProfile) {
      if (activeTab === 'department_tasks') {
        return isEmployeeDepartmentTask(task);
      }
      if (activeTab === 'my_assigned') {
        return isMyAssignedTask(task);
      }
      return false;
    }

    if (isOwnerProfile) {
      if (activeTab === 'department_tasks') {
        return isOwnerDepartmentTask(task);
      }
      if (activeTab === 'my_assigned') {
        return isOwnerRaisedTask(task);
      }
      return false;
    }

    if (activeTab === 'all') {
      return isCompanyTask(task);
    }
    if (activeTab === 'my_assigned') {
      return isMyAssignedTask(task);
    }
    if (activeTab === 'from_owner') {
      return isOwnerOrSuperAdminRaisedTask(task) || (isSuperAdminProfile && isQueueTask(task));
    }
    return false;
  }

  const canDelegateDepartmentQueueTask = ['manager', 'admin', 'hr_manager', 'hr', 'admin_manager', 'finance_manager', 'tech_manager', 'it_manager', 'maintenance_manager', 'super_admin'].includes(normalizedRole);

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (isOwnerProfile) {
      return 'department_tasks';
    }
    if (isAdminTaskProfile) {
      return 'assigned_dept_tasks';
    }
    if (isDepartmentManagerProfile || isEmployeeTaskProfile) {
      return 'my_assigned';
    }
    return 'my_assigned';
  });
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [completionNote, setCompletionNote] = useState('');
  const [completionFiles, setCompletionFiles] = useState<File[]>([]);
  const [assignmentFiles, setAssignmentFiles] = useState<File[]>([]);
  const [hrQueueAssigneeUserId, setHrQueueAssigneeUserId] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Form State
  const initialTaskForm: TaskForm = { title: '', description: '', type: 'Standard', department: '', assignee: '', assigneeUserId: '', priority: 'Medium', dueDate: '' };
  const [taskForm, setTaskForm] = useState<TaskForm>(initialTaskForm);

  const [orgData, setOrgData] = useState<Record<string, Member[]>>({});
  const [superAdminMembers, setSuperAdminMembers] = useState<Member[]>([]);

  // --- STATEFUL MOCK DATA (Cross-Department Visibility) ---
  const [tasks, setTasks] = useState<Task[]>([]);

  function resolveMemberName(member: Member): string {
    if (member?.fullName && member.fullName.trim()) {
      return member.fullName.trim();
    }
    const composed = [member?.firstName, member?.lastName]
      .map((part) => (part || '').trim())
      .filter(Boolean)
      .join(' ');
    if (composed) {
      return composed;
    }
    return '';
  }

  const memberDirectoryById: Record<string, Member> = useMemo(() => {
    const map: Record<string, Member> = {};
    Object.values(orgData).forEach((members) => {
      (Array.isArray(members) ? members : []).forEach((member: Member) => {
        if (member?.id) {
          map[member.id] = member;
        }
      });
    });
    (Array.isArray(superAdminMembers) ? superAdminMembers : []).forEach((member: Member) => {
      if (member?.id) {
        map[member.id] = member;
      }
    });
    return map;
  }, [orgData, superAdminMembers]);

  const adminAssignableMembers = useMemo(() => {
    return Object.values(memberDirectoryById).filter((member) => normalizeRoleValue(member?.role || '') === 'admin');
  }, [memberDirectoryById]);

  function getAssigneeDisplayLabel(task: Task): string {
    const id = task?.assigneeUserId ? String(task.assigneeUserId) : '';
    const member = id ? memberDirectoryById[id] : null;
    if (!member?.role) {
      return task?.assignee || 'Unassigned';
    }
    const roleText = roleLabel(member.role);
    return `${task?.assignee || member.name} (${roleText})`;
  }

  const taskFilterDepartments = useMemo(() => {
    const adminRouteDepartment = (isOwnerProfile || isSuperAdminProfile) ? ['Admin'] : [];
    const appendAdminRouteDepartment = (departments: string[]) => orderDepartmentOptions([...(departments || []), ...adminRouteDepartment], true);

    const fromMembers = Object.keys(orgData);
    if (fromMembers.length > 0) {
      return appendAdminRouteDepartment(fromMembers.filter((department) => shouldShowDepartmentOption(department)));
    }

    const fromTasks = Array.from(
      new Set(
        tasks
          .map((task) => task.department)
          .filter(Boolean) as string[],
      ),
    );
    if (fromTasks.length > 0) {
      return appendAdminRouteDepartment(fromTasks.filter((department) => shouldShowDepartmentOption(department)));
    }

    const fromWorkspace: string[] =
      storedUser?.workspace?.departments ||
      storedUser?.workspaceDraft?.departments ||
      [];

    const base = Array.isArray(fromWorkspace) ? fromWorkspace.filter(Boolean) : [];

    return appendAdminRouteDepartment(base.filter((department) => shouldShowDepartmentOption(department)));
  }, [
    orgData,
    storedUser,
    tasks,
    isOwnerProfile,
    isSuperAdminProfile,
  ]);

  const taskRouteDepartments = useMemo(() => {
    if (isOwnerProfile || isSuperAdminProfile) {
      return orderDepartmentOptions(taskFilterDepartments, true);
    }
    return taskFilterDepartments;
  }, [taskFilterDepartments, isOwnerProfile, isSuperAdminProfile]);

  const normalizedDepartmentMembers = useMemo(() => {
    return Object.entries(orgData).reduce<Record<string, Member[]>>((acc, [department, members]) => {
      const key = normalizeDepartmentKey(department);
      if (!key) {
        return acc;
      }
      if (!acc[key]) {
        acc[key] = [];
      }
      (Array.isArray(members) ? members : []).forEach((member: Member) => {
        const memberId = member?.id || '';
        if (memberId && !acc[key].some((item) => item.id === memberId)) {
          acc[key].push(member);
        }
      });
      return acc;
    }, {});
  }, [orgData]);

  function getMembersForDepartment(department: string): Member[] {
    const direct = orgData[department];
    if (Array.isArray(direct) && direct.length > 0) {
      return direct;
    }
    const normalizedKey = normalizeDepartmentKey(department);
    if (!normalizedKey) {
      return [];
    }
    return normalizedDepartmentMembers[normalizedKey] || [];
  }

  function isEligibleAssigneeForCurrentProfile(member: Member): boolean {
    const role = normalizeRoleValue(member?.role || '');

    if (isAdminTaskProfile) {
      if (member?.id && currentUserId && String(member.id) === String(currentUserId)) {
        return false;
      }
      return role === 'employee' || role === 'manager' || role.endsWith('_manager');
    }

    if (isDepartmentManagerProfile) {
      return role === 'employee';
    }

    return true;
  }

  function getPreferredAssigneeForDepartment(department: string): Member | null {
    const members = getMembersForDepartment(department).filter(isEligibleAssigneeForCurrentProfile);

    if (isPlatformAdminDepartmentName(department)) {
      return adminAssignableMembers[0] || null;
    }

    if (members.length === 0) {
      if (isSuperAdminProfile && normalizeRoleValue(department) === 'super_admin') {
        return superAdminMembers[0] || adminAssignableMembers[0] || null;
      }
      return null;
    }

    if (isAdminTaskProfile) {
      return members[0];
    }

    if (isSuperAdminProfile && normalizeRoleValue(department) === 'super_admin') {
      return superAdminMembers[0] || adminAssignableMembers[0] || members[0];
    }

    return members[0];
  }

  const assigneeOptions = useMemo(() => {
    if (!taskForm.department) {
      return [];
    }

    if (isPlatformAdminDepartmentName(taskForm.department)) {
      return adminAssignableMembers.filter((member) => normalizeRoleValue(member?.role || '') === 'admin');
    }

    if (isAdminTaskProfile) {
      return getMembersForDepartment(taskForm.department).filter((member) => {
        const role = normalizeRoleValue(member?.role || '');
        if (role === 'owner') {
          return false;
        }
        return role === 'employee' || role === 'manager' || role.endsWith('_manager');
      });
    }

    if (isDepartmentManagerProfile) {
      return getMembersForDepartment(taskForm.department).filter(isEligibleAssigneeForCurrentProfile);
    }

    const isSuperAdminDepartment = normalizeRoleValue(taskForm.department) === 'super_admin';
    const source = isSuperAdminProfile
      ? (
        isSuperAdminDepartment
          ? [...superAdminMembers, ...adminAssignableMembers].reduce<Member[]>((acc, member) => {
            if (member?.id && !acc.some((entry) => entry.id === member.id)) {
              acc.push(member);
            }
            return acc;
          }, [])
          : getMembersForDepartment(taskForm.department)
      )
      : getMembersForDepartment(taskForm.department);

    const filteredSource = source.filter((member) => {
      const role = normalizeRoleValue(member?.role || '');
      if (isOwnerProfile) {
        return role !== 'owner';
      }
      if (isSuperAdminProfile) {
        if (isSuperAdminDepartment) {
          return role === 'super_admin' || role === 'admin';
        }
        return role !== 'owner' && role !== 'super_admin';
      }
      return true;
    });

    if (isOwnerProfile && normalizedRole === 'owner' && normalizeRoleValue(taskForm.department) !== 'super_admin') {
      const superAdminPool = Array.isArray(superAdminMembers) ? superAdminMembers : [];
      const merged = [...filteredSource];
      const seen = new Set(
        merged.map((member) => String(member?.userId || member?.id || member?.name || '').trim().toLowerCase()).filter(Boolean),
      );

      superAdminPool.forEach((member) => {
        const key = String(member?.userId || member?.id || member?.name || '').trim().toLowerCase();
        if (!key || seen.has(key)) {
          return;
        }
        seen.add(key);
        merged.push(member);
      });

      return merged;
    }

    return filteredSource;
  }, [
    taskForm.department,
    superAdminMembers,
    adminAssignableMembers,
    isOwnerProfile,
    isSuperAdminProfile,
    orgData,
    normalizedDepartmentMembers,
    currentUserId,
    isAdminTaskProfile,
    isDepartmentManagerProfile,
  ]);

  useEffect(() => {
    if (!isAssignModalOpen || !taskForm.department) {
      return;
    }
    if (!isTopManagementDepartmentName(taskForm.department)) {
      return;
    }
    if (assigneeOptions.length === 0) {
      return;
    }
    const currentAssigneeId = String(taskForm.assigneeUserId || '');
    const matchingAssignee = assigneeOptions.find((member) => {
      const memberId = String(member?.id || '');
      const memberUserId = String(member?.userId || '');
      return currentAssigneeId && (memberId === currentAssigneeId || memberUserId === currentAssigneeId);
    });
    if (matchingAssignee) {
      return;
    }
    const preferredAssignee = assigneeOptions.find((member) => !member.isSelf) || assigneeOptions[0];
    if (!preferredAssignee) {
      return;
    }
    setTaskForm((current) => {
      const activeDepartment = current.department || '';
      if (activeDepartment !== taskForm.department) {
        return current;
      }
      const activeAssigneeId = String(current.assigneeUserId || '');
      const alreadySelected = assigneeOptions.some((member) => {
        const memberId = String(member?.id || '');
        const memberUserId = String(member?.userId || '');
        return activeAssigneeId && (memberId === activeAssigneeId || memberUserId === activeAssigneeId);
      });
      if (alreadySelected) {
        return current;
      }
      return {
        ...current,
        assignee: preferredAssignee.id === 'owner' ? 'Founder' : (preferredAssignee.name || ''),
        assigneeUserId: preferredAssignee.id || '',
      };
    });
  }, [assigneeOptions, isAssignModalOpen, taskForm.department, taskForm.assigneeUserId]);

  useEffect(() => {
    if (!isAssignModalOpen || (!isDepartmentManagerProfile && !isAdminTaskProfile)) {
      return;
    }
    const managedDepartments = isAdminTaskProfile ? adminAssignedDepartments : getManagedDepartments();
    if (managedDepartments.length === 0) {
      return;
    }
    setTaskForm((current) => {
      const currentDepartment = current.department || '';
      const nextDepartment = currentDepartment && managedDepartments.includes(currentDepartment)
        ? currentDepartment
        : managedDepartments[0];
      if (currentDepartment === nextDepartment) {
        return current;
      }
      const nextAssignee = getPreferredAssigneeForDepartment(nextDepartment);
      return {
        ...current,
        department: nextDepartment,
        assignee: nextAssignee?.name || '',
        assigneeUserId: nextAssignee?.id || '',
      };
    });
  }, [
    isAssignModalOpen,
    isDepartmentManagerProfile,
    isAdminTaskProfile,
    adminAssignedDepartments,
    orgData,
    normalizedDepartmentMembers,
    currentUserId,
  ]);

  const queueAssigneeOptions = useMemo(() => {
    const canHandleQueueTask = (
      (isDepartmentManagerProfile && viewingTask && isDepartmentQueueTask(viewingTask)) ||
      (isSuperAdminProfile && viewingTask && isQueueTask(viewingTask))
    );
    if (!canHandleQueueTask || !viewingTask) {
      return [];
    }
    const departmentMembers = getMembersForDepartment(viewingTask.department!);
    return departmentMembers
      .filter((member) => member?.id && String(member.id) !== String(currentUserId))
      .filter((member) => {
        const role = normalizeRoleValue(member?.role || '');
        if (isSuperAdminProfile) {
          return role === 'employee' || role === 'manager' || role === 'admin' || role.endsWith('_manager');
        }
        return role === 'employee';
      });
  }, [isDepartmentManagerProfile, isSuperAdminProfile, viewingTask, currentUserId, orgData, normalizedDepartmentMembers]);

  useEffect(() => {
    const canHandleQueueTask = (
      (isDepartmentManagerProfile && viewingTask && isDepartmentQueueTask(viewingTask)) ||
      (isSuperAdminProfile && viewingTask && isQueueTask(viewingTask))
    );
    if (!viewingTask || !canHandleQueueTask) {
      setHrQueueAssigneeUserId('');
      return;
    }
    setHrQueueAssigneeUserId(currentUserId || '');
  }, [viewingTask, isDepartmentManagerProfile, isSuperAdminProfile, currentUserId]);

  useEffect(() => {
    let isMounted = true;

    async function loadTasks() {
      try {
        const response = await getTasks({ page: 1, limit: TASKS_PAGE_SIZE });
        if (!isMounted) {
          return;
        }
        setTasks(response?.tasks || []);
        setPagination(response?.pagination || null);
        setErrorMessage('');
      } catch (error: any) {
        if (isMounted) {
          setErrorMessage(error.message || 'Unable to load tasks right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsInitialLoading(false);
        }
      }
    }

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timerId = setInterval(async () => {
      try {
        const response = await getTasks({ page: 1, limit: tasks.length || TASKS_PAGE_SIZE });
        setTasks(response?.tasks || []);
        setPagination(response?.pagination || null);
      } catch {
        // Keep the existing list when background sync fails.
      }
    }, 20000);

    return () => clearInterval(timerId);
  }, [tasks.length]);

  useEffect(() => {
    if (!viewingTask) {
      setCompletionNote('');
      setCompletionFiles([]);
      return;
    }
    setCompletionNote(viewingTask.completionNote || '');
    setCompletionFiles([]);
  }, [viewingTask?.id]);

  useEffect(() => {
    let isMounted = true;

    async function loadMembers() {
      try {
        const response = await getWorkspaceMembers();
        const members: Member[] = response?.data?.members || [];

        if (!isMounted) {
          return;
        }

        const canonicalById: Record<string, Member> = members.reduce<Record<string, Member>>((acc, member) => {
          const memberName = resolveMemberName(member);
          if (!memberName) {
            return acc;
          }
          const memberUserId = member?.userId ? String(member.userId) : '';
          const key = memberUserId || `${normalizeIdentity(memberName)}::${normalizeIdentity(member?.email || '')}`;
          if (!acc[key]) {
            acc[key] = {
              id: memberUserId || key,
              name: memberName,
              role: normalizeRoleValue(member?.role || 'employee'),
              departments: Array.isArray(member?.departments) ? member.departments.filter(Boolean) : [],
            };
          }
          return acc;
        }, {});

        const canonicalMembers = Object.values(canonicalById);

        const superAdminMembersList = canonicalMembers
          .filter((member) => {
            const hasSuperAdminRole = member.role === 'super_admin';
            const hasSuperAdminDepartment = (member.departments || []).some(
              (department: string) => normalizeRoleValue(department) === 'super_admin',
            );
            return hasSuperAdminRole || hasSuperAdminDepartment;
          });

        const workspaceDepartments: string[] = Array.isArray(storedUser?.workspace?.departments)
          ? storedUser.workspace.departments.filter(Boolean)
          : [];

        const grouped: Record<string, Member[]> = canonicalMembers.reduce<Record<string, Member[]>>((acc, member) => {
          (member.departments || []).forEach((department: string) => {
            if (!department) {
              return;
            }
            if (!acc[department]) {
              acc[department] = [];
            }
            if (member.id && !acc[department].some((entry) => entry.id === member.id)) {
              acc[department].push(member);
            }
          });
          return acc;
        }, {});

        workspaceDepartments.forEach((department) => {
          if (!grouped[department]) {
            grouped[department] = [];
          }
        });

        grouped['Super Admin'] = superAdminMembersList;
        setSuperAdminMembers(superAdminMembersList);

        if (isOwnerProfile) {
          Object.keys(grouped).forEach((department) => {
            grouped[department] = grouped[department].filter((member) => {
              const roleName = normalizeRoleValue(member?.role || '');
              return roleName !== 'owner';
            });
          });
        }

        setOrgData(grouped);

        if (Object.keys(grouped).length === 0) {
          try {
            const ovRes = await axiosPrivate.get("/api/organization/overview");
            const overview = ovRes?.data?.data || ovRes?.data || {};
            const teamMembers: any[] = Array.isArray(overview.teamMembers) ? overview.teamMembers : [];
            if (teamMembers.length > 0) {
              const fallback: Record<string, Member[]> = {};
              const added = new Set<string>();
              const canon = (val: string) => val.trim().toLowerCase().replace(/[\s_]+/g, '-');
              teamMembers.forEach((tm: any) => {
                (tm.departmentNames || []).forEach((dept: string) => {
                  const key = canon(dept);
                  if (!key) return;
                  if (!fallback[dept]) fallback[dept] = [];
                  const memberId = tm.userId || tm.id || '';
                  const dedupKey = memberId ? `${key}::${memberId}` : `${key}::${canon(tm.name || '')}`;
                  if (!added.has(dedupKey)) {
                    added.add(dedupKey);
                    fallback[dept].push({
                      id: memberId,
                      userId: tm.userId,
                      name: tm.name || '',
                      role: normalizeRoleValue(tm.role || 'employee'),
                      departments: tm.departmentNames || [],
                    });
                  }
                });
              });
              if (Object.keys(fallback).length > 0) setOrgData(fallback);
            }
          } catch {
            // fallback failed, orgData stays empty
          }
        }
      } catch {
        try {
          const ovRes = await axiosPrivate.get("/api/organization/overview");
          const overview = ovRes?.data?.data || ovRes?.data || {};
          const teamMembers: any[] = Array.isArray(overview.teamMembers) ? overview.teamMembers : [];
          if (teamMembers.length > 0) {
            const fallback: Record<string, Member[]> = {};
            const added = new Set<string>();
            const canon = (val: string) => val.trim().toLowerCase().replace(/[\s_]+/g, '-');
            teamMembers.forEach((tm: any) => {
              (tm.departmentNames || []).forEach((dept: string) => {
                const key = canon(dept);
                if (!key) return;
                if (!fallback[dept]) fallback[dept] = [];
                const memberId = tm.userId || tm.id || '';
                const dedupKey = memberId ? `${key}::${memberId}` : `${key}::${canon(tm.name || '')}`;
                if (!added.has(dedupKey)) {
                  added.add(dedupKey);
                  fallback[dept].push({
                    id: memberId,
                    userId: tm.userId,
                    name: tm.name || '',
                    role: normalizeRoleValue(tm.role || 'employee'),
                    departments: tm.departmentNames || [],
                  });
                }
              });
            });
            if (Object.keys(fallback).length > 0) setOrgData(fallback);
          }
        } catch {
          // Keep task page usable even when member directory cannot be loaded.
        }
      } finally {
        if (isMounted) {
          setIsLoadingMembers(false);
          setIsInitialLoading(false);
        }
      }
    }

    loadMembers();

    return () => {
      isMounted = false;
    };
  }, []);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const getPendingTaskCount = (employeeName: string): number => {
    return tasks.filter(t => t.assignee === employeeName && t.status !== 'Completed' && t.status !== 'Approved' && t.status !== 'Rejected').length;
  };

  // --- LOGIC & HANDLERS ---
  const displayedTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesTab = getTaskMatchesActiveTab(t);

      const matchesDept =
        selectedDeptFilter === 'All'
          ? true
          : normalizeDepartmentKey(getCanonicalDepartmentLabel(t.department!)) ===
            normalizeDepartmentKey(getCanonicalDepartmentLabel(selectedDeptFilter));
      const matchesStatus = statusFilter === 'All' ? true : t.status === statusFilter;
      const query = searchQuery.toLowerCase();
      const title = (t.title || '').toString().toLowerCase();
      const assignee = (t.assignee || '').toString().toLowerCase();
      const raisedBy = (t.raisedBy || '').toString().toLowerCase();
      const matchesSearch =
        title.includes(query) ||
        assignee.includes(query) ||
        raisedBy.includes(query);

      return matchesTab && matchesDept && matchesStatus && matchesSearch;
    });
  }, [tasks, activeTab, searchQuery, selectedDeptFilter, statusFilter, isDepartmentManagerProfile, isAdminTaskProfile, currentUserId, adminAssignedDepartments]);

  const statsBase = useMemo(() => {
    return tasks.filter(t => {
      const matchesTab = getTaskMatchesActiveTab(t);
      const matchesDept =
        selectedDeptFilter === 'All'
          ? true
          : normalizeDepartmentKey(getCanonicalDepartmentLabel(t.department!)) ===
            normalizeDepartmentKey(getCanonicalDepartmentLabel(selectedDeptFilter));
      return matchesTab && matchesDept;
    });
  }, [tasks, activeTab, selectedDeptFilter, isDepartmentManagerProfile, isAdminTaskProfile, currentUserId, adminAssignedDepartments]);

  const pendingFromOwnerCount = useMemo(() => {
    return tasks.filter((task) => {
      return isOwnerOrSuperAdminRaisedTask(task) && task.status === 'Pending';
    }).length;
  }, [tasks]);

  const hasMoreTasks = Boolean(pagination?.hasNextPage);

  const handleLoadMoreTasks = async () => {
    if (!pagination?.hasNextPage || isLoadingMore) {
      return;
    }
    try {
      setIsLoadingMore(true);
      const response = await getTasks({
        page: pagination.page + 1,
        limit: pagination.limit || TASKS_PAGE_SIZE,
      });
      const nextTasks: Task[] = response?.tasks || [];
      setTasks((current) => {
        const existingIds = new Set(current.map((task) => String(task.id)));
        const uniqueNextTasks = nextTasks.filter((task) => !existingIds.has(String(task.id)));
        return [...current, ...uniqueNextTasks];
      });
      setPagination(response?.pagination || null);
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to load more tasks right now.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleAssignTask = async (e: FormEvent) => {
    e.preventDefault();

    try {
      setIsSaving(true);
      let uploadedAttachments: string[] = [];
      if (assignmentFiles.length > 0) {
        const formData = new FormData();
        assignmentFiles.forEach((file) => {
          formData.append('files', file);
        });
        const uploadResponse = await uploadTaskAttachments(formData);
        uploadedAttachments = uploadResponse?.attachments || [];
      }

      await createTask({
        title: taskForm.title,
        description: taskForm.description,
        type: taskForm.type,
        department: taskForm.department,
        raisedBy: profile.name || storedUser?.fullName || storedUser?.name || 'Unknown',
        raisedByUserId: currentUserId || undefined,
        assignee: taskForm.assignee || 'Unassigned',
        assigneeUserId: taskForm.assigneeUserId === 'owner' ? undefined : (taskForm.assigneeUserId || undefined),
        priority: taskForm.priority,
        dueDate: taskForm.dueDate,
        attachments: uploadedAttachments,
      });

      const refresh = await getTasks({ page: 1, limit: TASKS_PAGE_SIZE });
      setTasks(refresh?.tasks || []);
      setPagination(refresh?.pagination || null);

      setErrorMessage('');
      setIsAssignModalOpen(false);
      setTaskForm(initialTaskForm);
      setAssignmentFiles([]);
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to create task right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProgress = async (newProg: number) => {
    if (!viewingTask) return;

    try {
      const response = await updateTask(viewingTask.id!, { progress: newProg });
      const updatedTask: Task = response?.task;

      if (!updatedTask) {
        return;
      }

      setTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
      setViewingTask(updatedTask);
      setErrorMessage('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to update task progress.');
    }
  };

  const handleApprovalAction = async (action: string) => {
    if (!viewingTask) return;

    try {
      const response = await updateTask(viewingTask.id!, { status: action });
      const updatedTask: Task = response?.task;

      if (!updatedTask) {
        return;
      }

      setTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
      setViewingTask(updatedTask);
      setErrorMessage('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to update approval status.');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !viewingTask) return;

    try {
      const response = await addTaskComment(viewingTask.id!, { text: commentText.trim() });
      const updatedTask: Task = response?.task;

      if (!updatedTask) {
        return;
      }

      setTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
      setViewingTask(updatedTask);
      setCommentText('');
      setErrorMessage('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to post comment.');
    }
  };

  const handleAcceptTask = async (payload = {}) => {
    if (!viewingTask) return;

    try {
      setIsSaving(true);
      const response = await acceptTask(viewingTask.id!, payload);
      const updatedTask: Task = response?.task;

      if (!updatedTask) {
        return;
      }

      setTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
      setViewingTask(updatedTask);
      setErrorMessage('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to accept task.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!viewingTask) return;

    try {
      setIsSaving(true);
      const payload = {
        note: completionNote.trim() || undefined,
        attachments: completionFiles.map((file) => ({
          name: file.name,
          size: formatFileSize(file.size),
        })),
      };
      const response = await completeTask(viewingTask.id!, payload);
      const updatedTask: Task = response?.task;

      if (!updatedTask) {
        return;
      }

      setTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
      setViewingTask(updatedTask);
      setCompletionFiles([]);
      setErrorMessage('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to complete task.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- UI HELPERS ---
  const getInitials = (name: string): string => {
    const safeName = (name || '').trim();
    if (!safeName || safeName === 'Unassigned') return '?';

    return safeName
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const isOverdue = (dateStr: string, status?: string): boolean => {
    if (status === "Completed" || status === "Approved" || status === "Rejected") return false;

    const dueDate = new Date(dateStr);
    if (Number.isNaN(dueDate.getTime())) return false;

    return dueDate < todayDate;
  };

  const getPriorityBadge = (priority = '') => {
    switch ((priority || '').toLowerCase()) {
      case 'high': return <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-red-100 shadow-sm">High</span>;
      case 'medium': return <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-amber-100 shadow-sm">Medium</span>;
      case 'low': return <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-blue-100 shadow-sm">Low</span>;
      default: return null;
    }
  };

  const getStatusBadge = (status = '') => {
    switch ((status || '').toLowerCase()) {
      case 'completed':
      case 'approved': return <span className="flex items-center gap-1 w-max px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm"><CheckCircle2 size={12} /> {status}</span>;
      case 'in progress': return <span className="flex items-center gap-1 w-max px-2.5 py-1 bg-blue-50 text-[#2563EB] border border-blue-200 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm"><Clock size={12} /> In Progress</span>;
      case 'pending': return <span className="flex items-center gap-1 w-max px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm"><AlertCircle size={12} /> Pending</span>;
      case 'rejected': return <span className="flex items-center gap-1 w-max px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm"><X size={12} /> Rejected</span>;
      default: return null;
    }
  };

  const formatFileSize = (sizeInBytes: number): string => {
    if (!sizeInBytes || sizeInBytes <= 0) {
      return '';
    }
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    }
    const kb = sizeInBytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const handleCompletionFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files || []);
    if (incoming.length === 0) {
      return;
    }
    setCompletionFiles((current) => {
      const merged = [...current];
      incoming.forEach((file) => {
        const exists = merged.some(
          (item) => item.name === file.name && item.size === file.size,
        );
        if (!exists) {
          merged.push(file);
        }
      });
      return merged.slice(0, 10);
    });
    event.target.value = '';
  };

  const removeCompletionFile = (fileToRemove: File) => {
    setCompletionFiles((current) =>
      current.filter(
        (file) => !(file.name === fileToRemove.name && file.size === fileToRemove.size),
      ),
    );
  };

  const handleAssignmentFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files || []);
    if (incoming.length === 0) {
      return;
    }
    setAssignmentFiles((current) => {
      const merged = [...current];
      incoming.forEach((file) => {
        const exists = merged.some(
          (item) => item.name === file.name && item.size === file.size,
        );
        if (!exists) {
          merged.push(file);
        }
      });
      return merged.slice(0, 10);
    });
    event.target.value = '';
  };

  const removeAssignmentFile = (fileToRemove: File) => {
    setAssignmentFiles((current) =>
      current.filter(
        (file) => !(file.name === fileToRemove.name && file.size === fileToRemove.size),
      ),
    );
  };

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        {isInitialLoading && <TasksSkeleton />}
        {!isInitialLoading && (
          <div className="flex flex-col gap-4">

            {/* 1. HEADER */}
            <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
              <div>
                <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                  Task Management
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  {isOwnerProfile
                    ? 'Founder View: Monitor department-created tasks and track the assignments you issued.'
                    : isAdminTaskProfile
                      ? 'Admin Task View: Track assigned department work, tasks you raised, and items assigned by super admin.'
                      : 'Track task routing across all departments and manage workloads.'}
                </p>
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-600">
                {errorMessage}
              </div>
            ) : null}

            {/* 2. MAIN TABS (Pill-Style Navigation) */}
            <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
              {isOwnerProfile ? (
                <>
                  <button onClick={() => { setActiveTab('department_tasks'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${activeTab === 'department_tasks' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    Department Tasks
                  </button>
                  <button onClick={() => { setActiveTab('my_assigned'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${activeTab === 'my_assigned' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Assigned Tasks
                  </button>
                </>
              ) : isAdminTaskProfile ? (
                <>
                  <button onClick={() => { setActiveTab('assigned_dept_tasks'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${activeTab === 'assigned_dept_tasks' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    Assigned Dept Tasks
                  </button>
                  <button onClick={() => { setActiveTab('my_assigned'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${activeTab === 'my_assigned' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Assigned Tasks
                  </button>
                  <button onClick={() => { setActiveTab('from_super_admin'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${activeTab === 'from_super_admin' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Tasks
                  </button>
                </>
              ) : isDepartmentManagerProfile ? (
                <>
                  <button onClick={() => { setActiveTab('department_tasks'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${activeTab === 'department_tasks' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    Department Tasks
                  </button>
                  <button onClick={() => { setActiveTab('my_tasks'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${activeTab === 'my_tasks' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Tasks
                  </button>
                  <button onClick={() => { setActiveTab('my_assigned'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${activeTab === 'my_assigned' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Assigned Tasks
                  </button>
                </>
              ) : isEmployeeTaskProfile ? (
                <>
                  <button onClick={() => { setActiveTab('department_tasks'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${activeTab === 'department_tasks' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    Department Tasks
                  </button>
                  <button onClick={() => { setActiveTab('my_assigned'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${activeTab === 'my_assigned' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Tasks
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setActiveTab('my_assigned'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${activeTab === 'my_assigned' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Tasks
                  </button>
                  {isSuperAdminProfile ? (
                    <button onClick={() => { setActiveTab('from_owner'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${activeTab === 'from_owner' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                      My Tasks (Founder) {pendingFromOwnerCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-white/20 text-white flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>{pendingFromOwnerCount}</span>}
                    </button>
                  ) : null}
                </>
              )}
            </div>

            {/* 3. STAT CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
              {[
                { key: 'total', label: 'Total Tasks', value: statsBase.length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', icon: AlertCircle, iconClass: 'bg-slate-50 text-slate-600' },
                { key: 'pending', label: 'Pending', value: statsBase.filter(t => t.status === 'Pending').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500', icon: AlertTriangle, iconClass: 'bg-amber-50 text-amber-600' },
                { key: 'in_progress', label: 'In Progress', value: statsBase.filter(t => t.status === 'In Progress').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500', icon: Clock, iconClass: 'bg-blue-50 text-blue-600' },
                { key: 'resolved', label: 'Resolved / Done', value: statsBase.filter(t => t.status === 'Completed' || t.status === 'Approved').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', icon: CheckCircle2, iconClass: 'bg-emerald-50 text-emerald-600' },
              ].map((card) => {
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

            {/* 4. DATA PANEL */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

              {/* Toolbar: status pills + search + filter + action */}
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">

                <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {['All', 'Pending', 'In Progress', 'Completed', 'Approved'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all ${statusFilter === status
                        ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                        : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text" placeholder="Search Tasks or People..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                    <select
                      className="pl-9 pr-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[100px]"
                      value={selectedDeptFilter} onChange={(e) => setSelectedDeptFilter(e.target.value)}
                    >
                      <option value="All">All Departments</option>
                      {taskFilterDepartments.map(dept => <option key={dept} value={dept}>{getCanonicalDepartmentLabel(dept)}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={() => setIsAssignModalOpen(true)}
                    className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-bold text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                  >
                    <Plus size={13} strokeWidth={3} /> ASSIGN TASK
                  </button>
                </div>
              </div>

              {/* Table (Desktop) / Cards (Mobile) */}
              <div className="overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden bg-white/20">
                {/* --- DESKTOP TABLE VIEW --- */}
                <table className="hidden lg:table w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Task Details</th>
                      <th className="px-5 py-4">Type / Dept</th>
                      <th className="px-5 py-4">Routing & Assignment</th>
                      <th className="px-5 py-4">Status & Priority</th>
                      <th className="px-5 py-4">Due Date</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {displayedTasks.map((task) => {
                      const isTaskOverdue = isOverdue(task.dueDate!, task.status);
                      return (
                        <tr key={task.id} className={`hover:bg-slate-50/50 transition-all group ${isTaskOverdue ? 'bg-red-50/30' : ''}`}>
                          <td className="px-5 py-4 align-top max-w-[250px] xl:max-w-[400px]">
                            <div className="font-semibold text-[#0F172A] text-[13px] sm:text-[14px]" title={task.title}>
                              {task.title}
                              {task.attachments && task.attachments.length > 0 && (
                                <Paperclip size={12} className="inline ml-2 text-[#2563EB]" />
                              )}
                            </div>
                            <div className="text-[11px] sm:text-[12px] text-slate-500 mt-1 line-clamp-2">{task.description}</div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="flex flex-col items-start gap-1.5">
                              <span className="w-max px-2 py-0.5 bg-slate-100/80 text-slate-600 rounded text-[10px] font-bold uppercase border border-slate-200/60">{task.type}</span>
                              <span className="text-[10px] font-bold text-[#2563EB] uppercase flex items-center gap-1.5 mt-0.5"><Building2 size={12} /> {getCanonicalDepartmentLabel(task.department!)}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="text-[12px] sm:text-[13px] font-semibold text-[#0F172A] min-w-[200px]">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Raised By:</span>
                              {formatPersonLabel(task.raisedBy!, task.raisedByDept)}
                            </div>
                            <div className="text-[12px] sm:text-[13px] font-semibold text-[#2563EB] min-w-[200px] mt-2.5">
                              <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider block mb-0.5">Assigned To:</span>
                              {getAssigneeDisplayLabel(task)}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="flex flex-col gap-2">
                              {getStatusBadge(task.status)}
                              {getPriorityBadge(task.priority)}
                              {task.type === 'Standard' && task.status !== 'Completed' && (
                                <div className="w-full bg-slate-200/60 rounded-full h-1.5 mt-1.5 max-w-[100px] shadow-inner">
                                  <div className="bg-[#2563EB] h-1.5 rounded-full" style={{ width: `${task.progress}%` }} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="flex flex-col items-start gap-1.5">
                              <span className="font-semibold text-slate-700 text-[12px] sm:text-[13px]">{task.dueDate}</span>
                              {isTaskOverdue && (
                                <span className="flex items-center gap-1 text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase border border-red-100 shadow-sm">
                                  <AlertTriangle size={10} strokeWidth={2.5} /> Overdue
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top text-center">
                            <button
                              onClick={() => setViewingTask(task)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                              title="View"
                            >
                              <Eye size={15} strokeWidth={2.5} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* --- MOBILE CARD VIEW --- */}
                <div className="flex flex-col gap-3 lg:hidden p-3 sm:p-4 bg-slate-50/30">
                  {displayedTasks.map((task) => {
                    const isTaskOverdue = isOverdue(task.dueDate!, task.status);
                    return (
                      <div key={task.id} className={`bg-white border p-4 sm:p-5 rounded-[20px] shadow-sm flex flex-col gap-3 transition-all ${isTaskOverdue ? 'border-red-200 bg-red-50/10' : 'border-slate-200/60'}`}>
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 flex flex-col gap-1.5">
                            <span className="w-max px-2 py-0.5 bg-slate-100/80 text-slate-600 rounded text-[10px] font-bold uppercase border border-slate-200/60">{task.type}</span>
                            <h3 className="font-semibold text-[#0F172A] text-[13px] sm:text-[14px]">
                              {task.title}
                              {task.attachments && task.attachments.length > 0 && <Paperclip size={12} className="inline ml-1 text-[#2563EB]" />}
                            </h3>
                            <p className="text-[12px] text-slate-500 line-clamp-2">{task.description}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {getStatusBadge(task.status)}
                            {getPriorityBadge(task.priority)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-1">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Raised By</span>
                            <span className="text-[11px] font-semibold text-[#0F172A] truncate block" title={task.raisedBy}>{task.raisedBy!.split(' ')[0]}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider block mb-0.5">Assigned To</span>
                            <span className="text-[11px] font-semibold text-[#2563EB] truncate block" title={task.assignee}>{task.assignee!.split(' ')[0]}</span>
                          </div>
                        </div>
                        {task.type === 'Standard' && task.status !== 'Completed' && (
                          <div className="w-full bg-slate-200/60 rounded-full h-1.5 shadow-inner mt-1">
                            <div className="bg-[#2563EB] h-1.5 rounded-full" style={{ width: `${task.progress}%` }} />
                          </div>
                        )}
                        <div className="flex justify-between items-center mt-1 border-t border-slate-100/60 pt-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-700 text-[11px] sm:text-[12px] flex items-center gap-1.5"><Calendar size={12} /> {task.dueDate}</span>
                            {isTaskOverdue && (
                              <span className="text-[9px] text-red-600 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5"><AlertTriangle size={10} strokeWidth={2.5} /> Overdue</span>
                            )}
                          </div>
                          <button
                            onClick={() => setViewingTask(task)}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-[10px] uppercase shadow-sm hover:shadow-md hover:border-blue-200 hover:text-[#2563EB] transition-all flex items-center gap-1.5"
                          >
                            <Eye size={14} strokeWidth={2} /> View
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Empty State */}
                {displayedTasks.length === 0 && (
                  <div className="text-center py-20 text-slate-400 font-semibold">
                    No tasks found.
                  </div>
                )}

                {hasMoreTasks && (
                  <div className="flex flex-col items-center gap-2 border-t border-slate-100/70 bg-white/70 px-4 py-5">
                    <p className="text-[12px] font-semibold text-slate-500">
                      Showing {tasks.length} of {pagination?.total || tasks.length} accessible tasks.
                    </p>
                    <button
                      type="button"
                      onClick={handleLoadMoreTasks}
                      disabled={isLoadingMore}
                      className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-2.5 text-[12px] font-bold uppercase tracking-wider text-[#2563EB] shadow-sm transition-all hover:border-blue-200 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoadingMore ? 'Loading...' : 'Load More Tasks'}
                    </button>
                  </div>
                )}

              </div>
            </div>

          {/* ======================================================= */}
          {/* MODAL 1: ASSIGN TASK */}
          {/* ======================================================= */}
          {isAssignModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[95vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0"></div>
                <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-pmedium text-primary flex items-center gap-2">
                      <div className="bg-blue-50 text-[#2563EB] p-2 rounded-xl">
                        <Plus size={20} strokeWidth={2.5} />
                      </div>
                      Delegate Task
                    </h2>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-widest mt-2">
                      {isAdminTaskProfile
                        ? 'Assign work to your assigned departments and their staff'
                        : 'Assign work across departments safely'}
                    </p>
                  </div>
                  <button onClick={() => setIsAssignModalOpen(false)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm">
                    <X size={18} strokeWidth={2.5} />
                  </button>
                </div>

                <form onSubmit={handleAssignTask} className="p-5 sm:p-6 md:p-8 overflow-y-auto flex-1 space-y-5 sm:space-y-6 custom-scrollbar bg-slate-50/50">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Task Type *</label>
                      <select required className="w-full px-4 py-3 bg-white border border-slate-200 shadow-sm rounded-xl font-semibold text-[#0F172A] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none cursor-pointer transition-all" value={taskForm.type} onChange={e => setTaskForm({ ...taskForm, type: e.target.value })}>
                        <option value="Standard">Standard Execution</option>
                        <option value="Approval">Formal Approval Request</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                      <select className="w-full px-4 py-3 bg-white border border-slate-200 shadow-sm rounded-xl font-semibold text-[#0F172A] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none cursor-pointer transition-all" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Task Title *</label>
                    <input required type="text" placeholder="e.g. Audit Q3 Finances" className="w-full px-4 py-3 bg-white border border-slate-200 shadow-sm rounded-xl font-semibold text-[#0F172A] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none transition-all placeholder:font-medium placeholder:text-slate-400" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Details & Instructions</label>
                    <textarea required rows={3} placeholder="Detailed instructions..." className="w-full px-4 py-3 bg-white border border-slate-200 shadow-sm rounded-xl font-medium text-slate-700 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none resize-none transition-all placeholder:text-slate-400" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
                  </div>

                  {/* Routing & Workload Control */}
                  <div className="grid grid-cols-1 gap-5 bg-white p-5 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-slate-100 shadow-sm">
                    <h4 className="text-[11px] font-bold text-[#0F172A] uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                      <User size={16} strokeWidth={2} /> Routing & Workload Control
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mt-1">
                      <div className="space-y-1.5">
                        <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Route to Department *</label>
                        <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-[#0F172A] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none cursor-pointer transition-all" value={taskForm.department} onChange={e => {
                          const nextDepartment = e.target.value;
                          const defaultMember = getPreferredAssigneeForDepartment(nextDepartment);

                          setTaskForm((current) => ({
                            ...current,
                            department: nextDepartment,
                            assignee: defaultMember?.name || '',
                            assigneeUserId: defaultMember?.id || '',
                          }));
                        }}>
                          <option value="">Select Department</option>
                          {taskRouteDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assignee (Checks Workload)</label>
                        <select required={isAdminTaskProfile || isTopManagementDepartmentName(taskForm.department)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-[#0F172A] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none cursor-pointer transition-all disabled:opacity-50 disabled:bg-slate-100" disabled={!taskForm.department} value={taskForm.assigneeUserId || ''} onChange={e => {
                          const selected = assigneeOptions.find((member) => member.id === e.target.value) || null;
                          setTaskForm({
                            ...taskForm,
                            assignee: selected?.id === 'owner' ? 'Founder' : (selected?.name || ''),
                            assigneeUserId: selected?.id === 'owner' ? 'owner' : (selected?.id || ''),
                          });
                        }}>
                          {isTopManagementDepartmentName(taskForm.department) || isDepartmentManagerProfile
                            ? <option value="">Select Assignee</option>
                            : <option value="">Unassigned (Queue)</option>}
                          {taskForm.department && assigneeOptions.map(member => {
                            const pending = getPendingTaskCount(member.name || '');
                            const empRole = resolveDisplayRole([member.role || '']);
                            return (
                              <option key={member.id} value={member.id}>
                                {member.name} ({empRole}) {pending > 0 ? `(${pending} tasks pending)` : `(Available)`}
                              </option>
                            );
                          })}
                        </select>
                        {taskForm.department && normalizeRoleValue(taskForm.department) === 'super_admin' && superAdminMembers.length === 0 ? (
                          <p className="text-[10px] font-bold text-red-600 mt-2">No active Super Admin member found in this workspace.</p>
                        ) : null}
                        {isAdminTaskProfile && taskForm.department && assigneeOptions.length === 0 ? (
                          <p className="text-[10px] font-bold text-red-600 mt-2">
                            No assigned-department managers or employees found for "{taskForm.department}".
                          </p>
                        ) : null}
                        {!isAdminTaskProfile && taskForm.department && assigneeOptions.length === 0 ? (
                          <p className="text-[10px] font-bold text-red-600 mt-2">
                            No members matched for department "{taskForm.department}".
                          </p>
                        ) : null}
                        {taskForm.assignee && getPendingTaskCount(taskForm.assignee) >= 3 && (
                          <p className="text-[10px] font-bold text-amber-600 inline-flex items-center gap-1.5 mt-2 bg-amber-50 px-2 py-1 rounded border border-amber-100"><AlertTriangle size={12} /> High workload detected.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Deadline *</label>
                    <input required type="date" className="w-full px-4 py-3 bg-white border border-slate-200 shadow-sm rounded-xl font-semibold text-[#0F172A] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none cursor-pointer transition-all" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reference Files (Optional)</label>
                    <input
                      type="file"
                      multiple
                      onChange={handleAssignmentFilesChange}
                      className="block w-full text-[12px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-[11px] file:font-bold file:uppercase file:tracking-wider file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {assignmentFiles.length > 0 ? (
                      <div className="space-y-2 mt-2">
                        {assignmentFiles.map((file) => (
                          <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <div className="min-w-0 flex items-center gap-2">
                              <Paperclip size={12} className="text-[#2563EB] shrink-0" />
                              <span className="text-[12px] font-semibold text-slate-700 truncate">{file.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{formatFileSize(file.size)}</span>
                              <button
                                type="button"
                                onClick={() => removeAssignmentFile(file)}
                                className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 flex items-center justify-center"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="pt-4 sm:pt-6 flex gap-3 sm:gap-4 border-t border-slate-200/60 flex-col-reverse sm:flex-row">
                    <button type="button" onClick={() => setIsAssignModalOpen(false)} className="w-full sm:flex-1 py-3 sm:py-3.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all text-[11px] sm:text-[12px] tracking-wider uppercase">CANCEL</button>
                    <button disabled={isSaving} type="submit" className="w-full sm:flex-[2] py-3 sm:py-3.5 bg-[#2563EB] text-white rounded-xl font-bold shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:bg-blue-700 transition-all text-[11px] sm:text-[12px] tracking-wider uppercase flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                      {isSaving ? 'CREATING...' : 'CREATE TASK'} <Plus size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* MODAL 2: VIEW & UPDATE TASK */}
          {/* ======================================================= */}
          {viewingTask && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[95vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0"></div>

                <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-start shrink-0 relative">
                  <div className="pr-10">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                      <span className="px-2.5 py-1 bg-slate-100/80 border border-slate-200/60 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider">{viewingTask.type}</span>
                      {getPriorityBadge(viewingTask.priority)}
                      {getStatusBadge(viewingTask.status)}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] leading-tight pr-2">{viewingTask.title}</h2>
                    <p className="text-[10px] sm:text-[11px] font-bold text-[#2563EB] uppercase tracking-wider mt-2.5 flex items-center gap-1.5"><Building2 size={14} /> {getCanonicalDepartmentLabel(viewingTask.department!)} Dept | ID: {viewingTask.id}</p>
                  </div>
                  <button onClick={() => setViewingTask(null)} className="absolute top-5 sm:top-6 md:top-8 right-5 sm:right-6 md:right-8 w-10 h-10 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 shadow-sm transition-all shrink-0"><X size={18} strokeWidth={2.5} /></button>
                </div>

                <div className="p-5 sm:p-6 md:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/50">

                  <div>
                    <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><FileText size={14} /> Description</p>
                    <p className="text-[13px] sm:text-[14px] font-medium text-[#0F172A] leading-relaxed bg-white p-4 sm:p-5 rounded-xl border border-slate-200/60 shadow-sm">{viewingTask.description}</p>
                  </div>

                  {(viewingTask.completionNote || (viewingTask.attachments || []).length > 0) ? (
                    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/60 shadow-sm space-y-3">
                      {viewingTask.completionNote ? (
                        <div>
                          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Completion Message</p>
                          <p className="text-[12px] sm:text-[13px] font-medium text-slate-700 leading-relaxed">{viewingTask.completionNote}</p>
                        </div>
                      ) : null}
                      {(viewingTask.attachments || []).length > 0 ? (
                        <div>
                          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Attached Documents</p>
                          <div className="space-y-2">
                            {(viewingTask.attachments || []).map((attachment, index) => (
                              <div key={`${attachment.name}-${index}`} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Paperclip size={13} className="text-[#2563EB] shrink-0" />
                                  {attachment.url ? (
                                    <a
                                      href={attachment.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[12px] font-semibold text-blue-700 hover:underline truncate"
                                    >
                                      {attachment.name}
                                    </a>
                                  ) : (
                                    <span className="text-[12px] font-semibold text-slate-700 truncate">{attachment.name}</span>
                                  )}
                                </div>
                                {attachment.size ? (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">{attachment.size}</span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-4 sm:gap-6 bg-white p-5 rounded-[20px] sm:rounded-[24px] border border-slate-200/60 shadow-sm">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Raised By</p>
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center text-[10px] sm:text-[11px] font-bold border border-blue-100 shadow-sm shrink-0">{getInitials(viewingTask.raisedBy || '')}</div>
                        <div className="min-w-0">
                          <span className="font-semibold text-[#0F172A] text-[12px] sm:text-[13px] block truncate">{viewingTask.raisedBy}</span>
                          {!viewingTask.raisedBy?.includes('(Owner)') ? (
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate block">{viewingTask.raisedByDept}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Assigned To</p>
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] sm:text-[11px] font-bold border border-indigo-100 shadow-sm shrink-0">{getInitials(viewingTask.assignee || '')}</div>
                        <div className="min-w-0">
                          <span className="font-semibold text-[#0F172A] text-[12px] sm:text-[13px] block truncate">{getAssigneeDisplayLabel(viewingTask)}</span>
                          {viewingTask.assignee !== 'Unassigned' && (
                            <span className="text-[9px] sm:text-[10px] font-bold text-amber-500 uppercase tracking-wider truncate block">{getPendingTaskCount(viewingTask.assignee || '')} Current Tasks</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 border-t border-slate-100 pt-4 sm:pt-5 mt-1 sm:mt-2 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Calendar size={12} /> Deadline</p>
                        <p className="font-bold text-[#0F172A] text-[13px] sm:text-[14px]">{viewingTask.dueDate}</p>
                      </div>
                      {isOverdue(viewingTask.dueDate!, viewingTask.status) && (
                        <span className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-red-100 shadow-sm"><AlertTriangle size={14} /> Overdue</span>
                      )}
                    </div>
                  </div>

                  {/* PROGRESS SLIDER OR APPROVAL ACTIONS */}
                  <div className="bg-white border border-slate-200/60 p-5 rounded-[20px] sm:rounded-[24px] shadow-sm">
                    <h3 className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 sm:mb-5">Task Status / Progress</h3>

                    {viewingTask.status === "Pending" && !isOwnerProfile ? (
                      ((isDepartmentManagerProfile && isDepartmentTask(viewingTask)) || (isSuperAdminProfile && isQueueTask(viewingTask))) ? (
                        <div className="mb-4 space-y-3">
                          <div>
                            <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Accept as</label>
                            <select
                              className="mt-1.5 w-full px-4 py-3 bg-white border border-slate-200 shadow-sm rounded-xl font-semibold text-[#0F172A] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none cursor-pointer transition-all"
                              value={hrQueueAssigneeUserId || ''}
                              onChange={(e) => setHrQueueAssigneeUserId(e.target.value)}
                            >
                              <option value={currentUserId || ''}>Self</option>
                              {canDelegateDepartmentQueueTask && queueAssigneeOptions.length > 0 ? (
                                <>
                                  {queueAssigneeOptions.map((member) => {
                                    const memberRole = resolveDisplayRole([member.role || '']);
                                    return (
                                      <option key={member.id} value={member.id}>
                                        {member.name} ({memberRole})
                                      </option>
                                    );
                                  })}
                                </>
                              ) : null}
                            </select>
                            <p className="text-[10px] font-bold text-slate-500 mt-2">
                              Select yourself to take it, or choose a department member to assign it after acceptance.
                            </p>
                          </div>
                          <button
                            onClick={() => handleAcceptTask(
                              hrQueueAssigneeUserId && String(hrQueueAssigneeUserId) !== String(currentUserId)
                                ? { assigneeUserId: hrQueueAssigneeUserId }
                                : {},
                            )}
                            disabled={isSaving}
                            className="w-full py-3 sm:py-3.5 rounded-xl font-bold text-[11px] sm:text-[12px] uppercase tracking-wider transition-all flex justify-center items-center gap-2 shadow-sm bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isSaving ? 'STARTING...' : 'Accept & Start'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAcceptTask()}
                          disabled={isSaving}
                          className="w-full mb-4 py-3 sm:py-3.5 rounded-xl font-bold text-[11px] sm:text-[12px] uppercase tracking-wider transition-all flex justify-center items-center gap-2 shadow-sm bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isSaving ? 'STARTING...' : 'Accept & Start Task'}
                        </button>
                      )
                    ) : null}

                    {viewingTask.status === "In Progress" && !isOwnerProfile ? (
                      <div className="mb-4 space-y-3">
                        <div>
                          <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completion Message (Optional)</label>
                          <textarea
                            rows={3}
                            value={completionNote}
                            onChange={(e) => setCompletionNote(e.target.value)}
                            placeholder="Add what was completed, blockers resolved, or handover notes..."
                            className="mt-1.5 w-full px-4 py-3 bg-white border border-slate-200 shadow-sm rounded-xl font-medium text-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none transition-all placeholder:text-slate-400"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Attach Document (Optional)</label>
                          <input
                            type="file"
                            multiple
                            onChange={handleCompletionFilesChange}
                            className="mt-1.5 block w-full text-[12px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-[11px] file:font-bold file:uppercase file:tracking-wider file:text-emerald-700 hover:file:bg-emerald-100"
                          />
                          {completionFiles.length > 0 ? (
                            <div className="mt-2 space-y-2">
                              {completionFiles.map((file) => (
                                <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                  <div className="min-w-0 flex items-center gap-2">
                                    <Paperclip size={12} className="text-emerald-600 shrink-0" />
                                    <span className="text-[12px] font-semibold text-slate-700 truncate">{file.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{formatFileSize(file.size)}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeCompletionFile(file)}
                                      className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 flex items-center justify-center"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <button
                          onClick={handleMarkCompleted}
                          disabled={isSaving}
                          className="w-full py-3 sm:py-3.5 rounded-xl font-bold text-[11px] sm:text-[12px] uppercase tracking-wider transition-all flex justify-center items-center gap-2 shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isSaving ? 'UPDATING...' : 'Mark As Completed'}
                        </button>
                      </div>
                    ) : null}

                    {viewingTask.type === "Standard" ? (
                      <div>
                        <div className="flex justify-between mb-3">
                          <span className="text-[12px] sm:text-[13px] font-semibold text-slate-700">Completion</span>
                          <span className="text-[12px] sm:text-[13px] font-bold text-[#2563EB]">{viewingTask.progress}%</span>
                        </div>
                        <input
                          type="range" min="0" max="100" step="10"
                          value={viewingTask.progress}
                          onChange={(e) => handleUpdateProgress(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!canEditTaskStatus || !isCurrentUserName(viewingTask.assignee || '')}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => handleApprovalAction("Approved")} disabled={!canEditTaskStatus || !isCurrentUserName(viewingTask.assignee || '')} className={`flex-1 py-3 sm:py-3.5 rounded-xl font-bold text-[11px] sm:text-[12px] uppercase tracking-wider transition-all flex justify-center items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${viewingTask.status === "Approved" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50"}`}>
                          <CheckCircle2 size={16} strokeWidth={2.5} /> Formally Approve
                        </button>
                        <button onClick={() => handleApprovalAction("Rejected")} disabled={!canEditTaskStatus || !isCurrentUserName(viewingTask.assignee || '')} className={`flex-1 py-3 sm:py-3.5 rounded-xl font-bold text-[11px] sm:text-[12px] uppercase tracking-wider transition-all flex justify-center items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${viewingTask.status === "Rejected" ? "bg-red-50 border border-red-200 text-red-700" : "bg-white border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-700 hover:bg-red-50"}`}>
                          <X size={16} strokeWidth={2.5} /> Reject / Revise
                        </button>
                      </div>
                    )}
                  </div>

                  {/* COMMENTS & ACTIVITY FEED */}
                  <div>
                    <h3 className="text-[10px] sm:text-[11px] font-bold text-[#0F172A] uppercase tracking-wider mb-4 sm:mb-5 flex items-center gap-2"><MessageSquare size={16} strokeWidth={2.5} className="text-[#2563EB]" /> Internal Comments</h3>
                    <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-5">
                      {viewingTask.comments.length === 0 && (
                        <div className="border border-dashed border-slate-200 bg-slate-50/50 rounded-xl p-6 text-center">
                          <p className="text-[12px] font-medium text-slate-400">No activity yet. Leave a note below.</p>
                        </div>
                      )}
                      {viewingTask.comments.map((c, i) => (
                        <div key={i} className="flex gap-3 bg-white p-4 rounded-[16px] border border-slate-100 shadow-sm">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] sm:text-[11px] text-slate-600 font-bold shrink-0">
                            {getInitials(c.author)}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                              <span className="font-semibold text-[#0F172A] text-[12px] sm:text-[13px]">{c.author}</span>
                              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{c.time}</span>
                            </div>
                            <p className="text-slate-600 text-[12px] sm:text-[13px] font-medium leading-relaxed">{c.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Input Box */}
                    <div className="flex items-center relative">
                      <input
                        type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                        placeholder="Tag someone (@) or type a message..."
                        className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-24 py-3 sm:py-3.5 text-[13px] sm:text-[14px] font-medium text-[#0F172A] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none transition-all shadow-sm placeholder:text-slate-400"
                      />
                      <button onClick={handleAddComment} className="absolute right-2 top-1.5 sm:top-2 bg-slate-900 hover:bg-black text-white px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-[12px] font-bold transition-colors shadow-sm tracking-wider uppercase">
                        Post
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </PageFrame>
    </div>
  );
}
