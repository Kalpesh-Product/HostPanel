import React, { useEffect, useState, useMemo, type FormEvent } from 'react';
import {
  Search, Plus, Eye, CheckCircle2, Clock, AlertCircle,
  Calendar, User, FileText, X, AlertTriangle, Paperclip,
  MessageSquare, Filter, Download, Pencil
} from 'lucide-react';
import PageFrame from '@/components/Pages/PageFrame';
import { toast } from 'sonner';
import { createReport } from '@/services/reports';
import { downloadReportFile } from '@/utils/report-download';
import ExportReportModal, { type ExportParams } from '@/components/ExportReportModal';
import ReportExportButton from '@/components/ReportExportButton';
import { isDateInExportPeriod } from '@/utils/export-period';
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
import { getTaskTypes, createTaskType } from '@/services/taskTypes';
import { TasksSkeleton } from '@/components/ui/Skeleton';
import { statusPillClass } from '../../lib/status-pill';
import AttachmentDropzone from '@/components/AttachmentDropzone';
import humanDate from '@/utils/humanDateForamt';

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
  taskCode?: string;
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
  createdAt?: string;
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

interface TaskTypeOption {
  id: string;
  name: string;
  workflowKind: 'progress' | 'approval';
  isSystem?: boolean;
}

interface EditTaskForm {
  type: string;
  priority: string;
  dueDate: string;
  title: string;
  description: string;
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
  // The DB's canonical founder role name is "founder" ("owner" is only a
  // legacy alias — see server/config/seedRoles.ts), so both spellings must
  // resolve to the owner profile everywhere below.
  const normalizedRole = (storedUser?.workspaceMembership?.role || storedUser?.role || 'owner').trim().toLowerCase();
  const isOwnerProfile = normalizedRole === 'owner' || normalizedRole === 'founder';
  const isSuperAdminProfile = normalizedRole === 'super_admin' || normalizedRole === 'super-admin';
  const isAdminProfile = normalizedRole === 'admin';
  const isAdminTaskProfile = canAccessAdminDashboard(storedUser) || isAdminProfile;
  const isElevatedTaskProfile = isOwnerProfile || isSuperAdminProfile || isAdminTaskProfile;
  // Some workspaces assign department managers a custom per-department role
  // name (e.g. "HR Manager"), which canAccessXDashboard's role-string check
  // already covers. Others use one generic "manager" role plus a
  // workspaceMembership.departments array to say which department(s) they
  // manage — canAccessXDashboard alone can't see that, so isGenericManagerOfDepartment
  // (defined below, hoisted) covers it too.
  const isHrTaskProfile = !isElevatedTaskProfile && (canAccessHRDashboard(storedUser) || isGenericManagerOfDepartment(isHrDepartmentName));
  const isAdministrationTaskProfile = !isElevatedTaskProfile && (canAccessAdministrationDashboard(storedUser) || isGenericManagerOfDepartment(isAdministrationDepartmentName));
  const isSalesTaskProfile = !isElevatedTaskProfile && (canAccessSalesDashboard(storedUser) || isGenericManagerOfDepartment(isSalesDepartmentName));
  const isFinanceTaskProfile = !isElevatedTaskProfile && (canAccessFinanceDashboard(storedUser) || isGenericManagerOfDepartment(isFinanceDepartmentName));
  const isTechTaskProfile = !isElevatedTaskProfile && (canAccessTechDashboard(storedUser) || isGenericManagerOfDepartment(isTechDepartmentName));
  const isITTaskProfile = !isElevatedTaskProfile && (canAccessITDashboard(storedUser) || isGenericManagerOfDepartment(isITDepartmentName));
  const isMaintenanceTaskProfile = !isElevatedTaskProfile && (canAccessMaintenanceDashboard(storedUser) || isGenericManagerOfDepartment(isMaintenanceDepartmentName));
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
    dept: actingContext?.departmentName || (isOwnerProfile ? 'Founder' : isSuperAdminProfile ? 'Super Admin' : (getOwnDepartmentNames()[0] || 'Executive')),
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
    if (normalized === 'owner' || normalized === 'founder') return 5;
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
      const ownerAliases = ['owner', 'founder', 'company owner', 'company-owner'];
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

  // The server sends workspaceMembership.departments as [{ _id, name }]
  // (see authControllers.ts), not plain strings — extract the names here so
  // every department-name check below works regardless of whether a given
  // department manager was set up with a custom per-department role name or
  // the generic "manager" role scoped via this array.
  function getOwnDepartmentNames(): string[] {
    const raw = storedUser?.workspaceMembership?.departments;
    const list = Array.isArray(raw) ? raw : [];
    return list
      .map((department: any) => (typeof department === 'string' ? department : department?.name))
      .filter(Boolean);
  }

  function isGenericManagerOfDepartment(matchesDepartmentName: (value: string) => boolean): boolean {
    if (normalizedRole !== 'manager') {
      return false;
    }
    return getOwnDepartmentNames().some((name) => matchesDepartmentName(name));
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
    return normalized === 'owner' || normalized === 'founder' || normalized === 'companyowner';
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
      return 'Technology';
    }
    if (isITDepartmentName(value)) {
      return 'IT';
    }
    if (isMaintenanceDepartmentName(value)) {
      return 'Maintenance';
    }
    return (value || '').toString().trim();
  }

  // Resolves a task's workflow behavior (progress slider vs approve/reject)
  // from the dynamic Task Type list, falling back to the legacy hardcoded
  // "Approval" check so tasks still render correctly before taskTypes loads.
  function getWorkflowKindForType(typeName: string): 'progress' | 'approval' {
    const normalized = (typeName || '').trim().toLowerCase();
    const match = taskTypes.find((t) => t.name.trim().toLowerCase() === normalized);
    if (match) {
      return match.workflowKind;
    }
    return normalized === 'approval' ? 'approval' : 'progress';
  }

  function getHrDepartments(): string[] {
    const departments = getOwnDepartmentNames();
    const hrDepartments = departments.filter((department: string) => isHrDepartmentName(department));
    return hrDepartments.length > 0 ? hrDepartments : ['HR'];
  }

  function getAdministrationDepartments(): string[] {
    const departments = [
      ...getOwnDepartmentNames(),
      storedUser?.workspaceMembership?.department,
      storedUser?.department,
      storedUser?.workspace?.department,
    ].filter(Boolean);
    const administrationDepartments = departments.filter((department: string) => isAdministrationDepartmentName(department));
    return administrationDepartments.length > 0 ? administrationDepartments : ['Administration'];
  }

  function getSalesDepartments(): string[] {
    const departments = [
      ...getOwnDepartmentNames(),
      storedUser?.workspaceMembership?.department,
      storedUser?.department,
      storedUser?.workspace?.department,
    ].filter(Boolean);
    const salesDepartments = departments.filter((department: string) => isSalesDepartmentName(department));
    return salesDepartments.length > 0 ? salesDepartments : ['Sales'];
  }

  function getFinanceDepartments(): string[] {
    const departments = [
      ...getOwnDepartmentNames(),
      storedUser?.workspaceMembership?.department,
      storedUser?.department,
      storedUser?.workspace?.department,
    ].filter(Boolean);
    const financeDepartments = departments.filter((department: string) => isFinanceDepartmentName(department));
    return financeDepartments.length > 0 ? financeDepartments : ['Finance'];
  }

  function getTechDepartments(): string[] {
    const departments = [
      ...getOwnDepartmentNames(),
      storedUser?.workspaceMembership?.department,
      storedUser?.department,
      storedUser?.workspace?.department,
    ].filter(Boolean);
    const techDepartments = departments.filter((department: string) => isTechDepartmentName(department));
    return techDepartments.length > 0 ? techDepartments : ['Tech'];
  }

  function getITDepartments(): string[] {
    const departments = [
      ...getOwnDepartmentNames(),
      storedUser?.workspaceMembership?.department,
      storedUser?.department,
      storedUser?.workspace?.department,
    ].filter(Boolean);
    const itDepartments = departments.filter((department: string) => isITDepartmentName(department));
    return itDepartments.length > 0 ? itDepartments : ['IT'];
  }

  function getMaintenanceDepartments(): string[] {
    const departments = [
      ...getOwnDepartmentNames(),
      storedUser?.workspaceMembership?.department,
      storedUser?.department,
      storedUser?.workspace?.department,
    ].filter(Boolean);
    const maintenanceDepartments = departments.filter((department: string) => isMaintenanceDepartmentName(department));
    return maintenanceDepartments.length > 0 ? maintenanceDepartments : ['Maintenance'];
  }

  function getEmployeeDepartments(): string[] {
    const departments = [
      ...getOwnDepartmentNames(),
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
      ...getOwnDepartmentNames(),
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
    () => new Set(adminAssignedDepartments.map((department: string) => normalizeDepartmentKey(getCanonicalDepartmentLabel(department))).filter(Boolean)),
    [adminAssignedDepartments],
  );

  function isTaskAssignedToCurrentUser(task: Task): boolean {
    const assignedUserId = task?.assigneeUserId ? String(task.assigneeUserId) : '';
    if (assignedUserId && currentUserId && assignedUserId === String(currentUserId)) {
      return true;
    }
    return isCurrentUserName(task?.assignee || '');
  }

  // Only the person who raised a task may edit its details.
  // Only the raiser can edit, and only before anyone has accepted it — once
  // accepted, the task's details are locked in (matches the server-side
  // guard in updateTask).
  function canEditTask(task: Task): boolean {
    const raisedByUserId = task?.raisedByUserId ? String(task.raisedByUserId) : '';
    if (!raisedByUserId || !currentUserId || raisedByUserId !== String(currentUserId)) {
      return false;
    }
    return task?.status === 'Pending';
  }

  function isOwnerRaisedTask(task: Task): boolean {
    const raisedByDept = normalizeDepartmentKey(task?.raisedByDept || '');
    if (raisedByDept.includes('owner')) {
      return true;
    }
    const raisedBy = normalizeIdentity(stripRoleSuffix(task?.raisedBy || ''));
    return raisedBy === 'owner' || raisedBy === 'founder' || raisedBy === 'company owner' || raisedBy === 'company-owner' || /\((owner|founder)\)/i.test(task?.raisedBy || '');
  }

  function isSuperAdminRaisedTask(task: Task): boolean {
    const raisedByDept = normalizeDepartmentKey(task?.raisedByDept || '');
    if (raisedByDept.includes('superadmin')) {
      return true;
    }
    const raisedBy = normalizeDepartmentKey(stripRoleSuffix(task?.raisedBy || ''));
    return raisedBy.includes('superadmin');
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

  // Tasks I raised and handed to someone else (not myself) — the "My
  // Assigned Tasks" tab content for Super Admin (Founder/Admin/Manager each
  // have their own more specific version of this already).
  function isRaisedByCurrentUserToOthers(task: Task): boolean {
    const raisedByUserId = task?.raisedByUserId ? String(task.raisedByUserId) : '';
    const assignedUserId = task?.assigneeUserId ? String(task.assigneeUserId) : '';
    if (!currentUserId || raisedByUserId !== String(currentUserId)) {
      return false;
    }
    return Boolean(assignedUserId && assignedUserId !== String(currentUserId));
  }

  // Unassigned covers both "not yet accepted" (Pending) and "accepted but
  // not yet handed to a specific person" (In Progress, accept and assign
  // are now two separate steps) — a task stays visible/manageable to the
  // department the whole time until someone is actually assigned.
  function isQueueTask(task: Task): boolean {
    const queueTask = !task?.assigneeUserId && /^unassigned$/i.test(task?.assignee || '');
    const status = (task?.status || '').toLowerCase();
    return queueTask && (status === 'pending' || status === 'in progress');
  }

  // Department-match only, no status requirement — used to decide who can
  // accept/assign a department's queue tasks, independent of where a given
  // task currently sits in that Pending -> In Progress (unassigned) -> In
  // Progress (assigned) lifecycle.
  function isManagedDepartmentTask(task: Task): boolean {
    if (!isDepartmentManagerProfile) {
      return false;
    }
    // Canonicalize both sides — a task's department and the manager's own
    // department string can be spelled differently ("Technology" vs "Tech")
    // while referring to the same department; raw string equality here
    // silently hid tasks from the manager who should see them.
    const taskKey = normalizeDepartmentKey(getCanonicalDepartmentLabel(task?.department!));
    const departmentKeys = getManagedDepartments().map((department: string) => normalizeDepartmentKey(getCanonicalDepartmentLabel(department)));
    return Boolean(taskKey) && departmentKeys.includes(taskKey);
  }

  function isDepartmentTask(task: Task): boolean {
    if (!isManagedDepartmentTask(task)) {
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

  function isManagedEmployeeDepartmentTask(task: Task): boolean {
    if (!isEmployeeTaskProfile) {
      return false;
    }
    const taskKey = normalizeDepartmentKey(getCanonicalDepartmentLabel(task?.department!));
    const departmentKeys = getEmployeeDepartments().map((department: string) => normalizeDepartmentKey(getCanonicalDepartmentLabel(department)));
    return Boolean(taskKey) && departmentKeys.includes(taskKey);
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

  function getTaskMatchesActiveTab(task: Task): boolean {
    if (isAdminTaskProfile) {
      if (activeTab === 'my_tasks') {
        return isAdminSuperAdminTask(task);
      }
      if (activeTab === 'my_assigned_tasks') {
        return isAdminCreatedTask(task);
      }
      if (activeTab === 'assigned_dept_tasks') {
        return isAdminDepartmentTask(task);
      }
      return false;
    }

    if (isDepartmentManagerProfile) {
      if (activeTab === 'my_tasks') {
        return isDepartmentMyTask(task);
      }
      if (activeTab === 'my_assigned_tasks') {
        return isDepartmentAssignedToEmployeesTask(task);
      }
      if (activeTab === 'department_tasks') {
        // Every task in the department, whoever it ends up assigned to —
        // not just the still-unassigned queue — so the whole department can
        // see status and progress on everything, not only what's pending.
        return isManagedDepartmentTask(task);
      }
      return false;
    }

    if (isEmployeeTaskProfile) {
      if (activeTab === 'my_tasks') {
        return isMyAssignedTask(task);
      }
      if (activeTab === 'department_tasks') {
        return isManagedEmployeeDepartmentTask(task);
      }
      return false;
    }

    // Founder: nothing outranks them, so there's no "My Tasks" tab — just
    // what they raised and handed off, and every task in the company.
    if (isOwnerProfile) {
      if (activeTab === 'my_assigned_tasks') {
        return isOwnerRaisedTask(task);
      }
      if (activeTab === 'company_tasks') {
        return true;
      }
      return false;
    }

    if (isSuperAdminProfile) {
      if (activeTab === 'my_tasks') {
        return isTaskAssignedToCurrentUser(task);
      }
      if (activeTab === 'my_assigned_tasks') {
        return isRaisedByCurrentUserToOthers(task);
      }
      if (activeTab === 'company_tasks') {
        return true;
      }
      return false;
    }

    return false;
  }


  // --- STATE ---
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (isOwnerProfile || isSuperAdminProfile) {
      return 'company_tasks';
    }
    if (isAdminTaskProfile) {
      return 'assigned_dept_tasks';
    }
    if (isDepartmentManagerProfile || isEmployeeTaskProfile) {
      return 'department_tasks';
    }
    return 'my_tasks';
  });
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [completionNote, setCompletionNote] = useState('');
  const [completionFiles, setCompletionFiles] = useState<File[]>([]);
  const [selectedApprovalAction, setSelectedApprovalAction] = useState<'Approved' | 'Rejected' | ''>('');
  const [assignmentFiles, setAssignmentFiles] = useState<File[]>([]);
  const [assignmentFilesError, setAssignmentFilesError] = useState('');
  const [hrQueueAssigneeUserId, setHrQueueAssigneeUserId] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Form State
  const initialTaskForm: TaskForm = { title: '', description: '', type: '', department: '', assignee: '', assigneeUserId: '', priority: '', dueDate: '' };
  const [taskForm, setTaskForm] = useState<TaskForm>(initialTaskForm);

  const [taskTypes, setTaskTypes] = useState<TaskTypeOption[]>([]);
  const [isAddingTaskType, setIsAddingTaskType] = useState(false);
  const [newTaskTypeName, setNewTaskTypeName] = useState('');
  const [newTaskTypeWorkflowKind, setNewTaskTypeWorkflowKind] = useState<'progress' | 'approval'>('progress');
  const [isSavingTaskType, setIsSavingTaskType] = useState(false);

  const [routingMode, setRoutingMode] = useState<'department' | 'role'>('department');
  const [selectedRole, setSelectedRole] = useState('');
  const [assignTarget, setAssignTarget] = useState<'self' | 'others' | ''>('');

  const initialEditForm: EditTaskForm = { type: '', priority: '', dueDate: '', title: '', description: '' };
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<EditTaskForm>(initialEditForm);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  // The "Admin" pseudo-department is a top-management escalation shortcut, not
  // a real Department document — it's offered via "Route via Role" instead
  // (see getAssignableRoleOptions) so the real Department dropdown only ever
  // lists actual departments. taskFilterDepartments (used by the list filter)
  // keeps "Admin" so tasks routed there before this change stay filterable.
  //
  // Routing is strictly top-down: Founder/Super Admin can route to any
  // department, Admin can route to any department they're assigned to
  // oversee, but a Department Manager can only route within their own
  // department — they can't hand work sideways to a department they don't
  // manage.
  const taskRouteDepartments = useMemo(() => {
    const withoutPlatformAdmin = taskFilterDepartments.filter((dept) => !isPlatformAdminDepartmentName(dept));
    if (isOwnerProfile || isSuperAdminProfile) {
      return orderDepartmentOptions(withoutPlatformAdmin, true);
    }
    if (isAdminTaskProfile) {
      return withoutPlatformAdmin.filter((dept) => adminAssignedDepartmentKeys.has(normalizeDepartmentKey(getCanonicalDepartmentLabel(dept))));
    }
    if (isDepartmentManagerProfile) {
      const managedDeptKeys = new Set(getManagedDepartments().map((dept) => normalizeDepartmentKey(getCanonicalDepartmentLabel(dept))));
      return withoutPlatformAdmin.filter((dept) => managedDeptKeys.has(normalizeDepartmentKey(getCanonicalDepartmentLabel(dept))));
    }
    return withoutPlatformAdmin;
  }, [taskFilterDepartments, isOwnerProfile, isSuperAdminProfile, isAdminTaskProfile, isDepartmentManagerProfile, adminAssignedDepartmentKeys, storedUser]);

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
        if (role === 'owner' || role === 'founder') {
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
        return role !== 'owner' && role !== 'founder';
      }
      if (isSuperAdminProfile) {
        if (isSuperAdminDepartment) {
          return role === 'super_admin' || role === 'admin';
        }
        return role !== 'owner' && role !== 'founder' && role !== 'super_admin';
      }
      return true;
    });

    if (isOwnerProfile && normalizeRoleValue(taskForm.department) !== 'super_admin') {
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

  // "Route via Role" — an alternative to picking a department first, for
  // targeting a role (e.g. any Admin/Manager/Employee) directly. Strictly
  // downward only: a role can never be assigned to anyone at or above its
  // own rank (getRolePriority, same ranking assigneeOptions' permission
  // checks above already use). Department Managers don't get Role mode at
  // all — Department mode already covers everything they're allowed to do
  // (route within their own managed department), so a Role picker would
  // only ever offer "Employee" with no added value.
  const ROLE_ROUTE_OPTIONS: { value: string; label: string }[] = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'employee', label: 'Employee' },
  ];

  function getAssignableRoleOptions(): { value: string; label: string }[] {
    if (isDepartmentManagerProfile || isEmployeeTaskProfile) {
      return [];
    }
    const creatorPriority = isOwnerProfile
      ? getRolePriority('owner')
      : isSuperAdminProfile
        ? getRolePriority('super_admin')
        : isAdminTaskProfile
          ? getRolePriority('admin')
          : 0;
    return ROLE_ROUTE_OPTIONS.filter((option) => getRolePriority(option.value) < creatorPriority);
  }

  function getMembersByRole(role: string): Member[] {
    const normalizedTarget = normalizeRoleValue(role);
    if (normalizedTarget === 'super_admin') {
      return superAdminMembers;
    }
    if (normalizedTarget === 'admin') {
      return adminAssignableMembers;
    }
    const matches = Object.values(memberDirectoryById).filter((member) => {
      const memberRole = normalizeRoleValue(member?.role || '');
      if (normalizedTarget === 'manager') {
        return memberRole === 'manager' || memberRole.endsWith('_manager');
      }
      return memberRole === normalizedTarget;
    });
    // Admin only oversees the departments assigned to it — Manager/Employee
    // targets are scoped down to those, not every manager/employee company-wide.
    if (isAdminTaskProfile) {
      return matches.filter((member) =>
        (member.departments || []).some((department) =>
          adminAssignedDepartmentKeys.has(normalizeDepartmentKey(getCanonicalDepartmentLabel(department))),
        ),
      );
    }
    return matches;
  }

  const roleAssigneeOptions = useMemo(() => {
    if (routingMode !== 'role' || !selectedRole) {
      return [];
    }
    return getMembersByRole(selectedRole);
  }, [routingMode, selectedRole, superAdminMembers, adminAssignableMembers, memberDirectoryById]);

  function handleSelectRoleAssignee(member: Member | null) {
    if (!member) {
      setTaskForm((current) => ({ ...current, department: '', assignee: '', assigneeUserId: '' }));
      return;
    }
    const normalizedTarget = normalizeRoleValue(selectedRole);
    // Admin/Super Admin are represented by the existing pseudo-department
    // machinery (isPlatformAdminDepartmentName / normalizeRoleValue ===
    // 'super_admin'), which is what the department-scoped queue filters
    // already understand. Manager/Employee use the member's real department
    // so departmentId resolves to a real Department document server-side.
    const resolvedDepartment =
      normalizedTarget === 'super_admin'
        ? 'Super Admin'
        : normalizedTarget === 'admin'
          ? 'Admin'
          : (member.departments && member.departments[0]) || '';

    setTaskForm((current) => ({
      ...current,
      department: resolvedDepartment,
      assignee: member.name || '',
      assigneeUserId: member.id || '',
    }));
  }

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
      return {
        ...current,
        department: nextDepartment,
        assignee: '',
        assigneeUserId: '',
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

  // Department-match eligibility for the (separate, post-accept) Assign
  // step — independent of task status, so it stays available for the whole
  // Pending -> accepted-but-unassigned -> assigned lifecycle.
  function canManageQueueForTask(task: Task | null): boolean {
    if (!task) return false;
    if (isSuperAdminProfile) return true;
    if (isAdminTaskProfile) {
      const taskDepartmentKey = normalizeDepartmentKey(getCanonicalDepartmentLabel(task.department!));
      return Boolean(taskDepartmentKey) && adminAssignedDepartmentKeys.has(taskDepartmentKey);
    }
    if (isDepartmentManagerProfile) return isManagedDepartmentTask(task);
    if (isEmployeeTaskProfile) return isManagedEmployeeDepartmentTask(task);
    return false;
  }

  // Who can be assigned this task — always includes the current viewer
  // (assigning to self is never compulsory, but always allowed), plus
  // whoever else they're permitted to hand it to.
  const assignCandidateOptions = useMemo(() => {
    if (!viewingTask || !canManageQueueForTask(viewingTask)) {
      return [];
    }
    const departmentMembers = getMembersForDepartment(viewingTask.department!);
    const others = departmentMembers
      .filter((member) => member?.id && String(member.id) !== String(currentUserId))
      .filter((member) => {
        const role = normalizeRoleValue(member?.role || '');
        if (isSuperAdminProfile) {
          return role === 'employee' || role === 'manager' || role === 'admin' || role.endsWith('_manager');
        }
        // Admin can assign to the department's manager or its employees;
        // a department manager can only assign to its employees; an
        // employee has no one else to hand it to.
        if (isAdminTaskProfile) {
          return role === 'employee' || role === 'manager' || role.endsWith('_manager');
        }
        if (isDepartmentManagerProfile) {
          return role === 'employee';
        }
        return false;
      });
    const self: Member = { id: currentUserId, name: profile.name, role: normalizedRole };
    return [self, ...others];
  }, [viewingTask, isSuperAdminProfile, isAdminTaskProfile, isDepartmentManagerProfile, isEmployeeTaskProfile, currentUserId, orgData, normalizedDepartmentMembers, adminAssignedDepartmentKeys]);

  useEffect(() => {
    if (!viewingTask || !canManageQueueForTask(viewingTask)) {
      setHrQueueAssigneeUserId('');
      return;
    }
    setHrQueueAssigneeUserId(currentUserId || '');
  }, [viewingTask, isDepartmentManagerProfile, isAdminTaskProfile, isSuperAdminProfile, isEmployeeTaskProfile, currentUserId]);

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
    let isMounted = true;

    async function loadTaskTypes() {
      try {
        const response = await getTaskTypes();
        if (!isMounted) return;
        setTaskTypes(Array.isArray(response?.taskTypes) ? response.taskTypes : []);
      } catch {
        // Task Type dropdown falls back to the built-in Standard/Approval defaults.
      }
    }

    loadTaskTypes();

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
      setSelectedApprovalAction('');
      return;
    }
    setCompletionNote(viewingTask.completionNote || '');
    setCompletionFiles([]);
    setSelectedApprovalAction('');
  }, [viewingTask?.id]);

  useEffect(() => {
    let isMounted = true;

    async function loadMembers() {
      try {
        const response = await getWorkspaceMembers();
        const members: Member[] = response?.members || [];

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

  const handleExportReport = async ({ format, dataWindow, period, reportMonth, dateFrom, dateTo }: ExportParams) => {
    const reportFormat = format === 'Excel' ? 'Excel' : 'PDF';
    const exportRows = displayedTasks
      .filter((task) => isDateInExportPeriod(task.createdAt || task.assignedAt || task.dueDate, { dateFrom, dateTo }))
      .map((task, index) => ({
      label: `${index + 1}. ${task.title || 'Untitled Task'}`,
      value: [
        `Department: ${task.department || '-'}`,
        `Priority: ${task.priority || '-'}`,
        `Status: ${task.status || '-'}`,
        `Assignee: ${task.assignee || 'Unassigned'}`,
        `Raised By: ${task.raisedBy || '-'}`,
        task.dueDate ? `Due: ${task.dueDate}` : '',
        task.progress != null ? `Progress: ${task.progress}%` : '',
      ].filter(Boolean).join(' | '),
      }));
    if (exportRows.length === 0) {
      toast.error('There are no tasks to export.');
      return;
    }
    try {
      const response = await createReport({
        title: 'Task Management',
        department: 'Admin',
        category: 'Other',
        dataWindow,
        reportMonth,
        period: period || 'Current view',
        generatedBy: profile.name || 'Admin',
        format: reportFormat,
        description: `Tasks for the current view (${activeTab}).`,
        sourceType: 'custom',
        sourceRef: 'tasks-page',
        reportRows: exportRows,
        monthlyData: [],
      });
      await downloadReportFile(response?.data?.download?.url, { openInNewTab: false });
      window.dispatchEvent(new Event('reports:refresh'));
      toast.success(`${reportFormat} task report saved to Reports.`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to export task report.');
    }
  };

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
      setAssignmentFilesError('');
      setRoutingMode('department');
      setSelectedRole('');
      setAssignTarget('');
      setIsAddingTaskType(false);
      setNewTaskTypeName('');
      setNewTaskTypeWorkflowKind('progress');
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to create task right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTaskType = async () => {
    const trimmedName = newTaskTypeName.trim();
    if (!trimmedName) return;

    try {
      setIsSavingTaskType(true);
      const response = await createTaskType({ name: trimmedName, workflowKind: newTaskTypeWorkflowKind });
      const created: TaskTypeOption | undefined = response?.taskType;
      if (created) {
        setTaskTypes((prev) => (prev.some((t) => t.id === created.id) ? prev : [...prev, created]));
        setTaskForm((current) => ({ ...current, type: created.name }));
      }
      setIsAddingTaskType(false);
      setNewTaskTypeName('');
      setNewTaskTypeWorkflowKind('progress');
      setErrorMessage('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to add task type.');
    } finally {
      setIsSavingTaskType(false);
    }
  };

  function openEditTask(task: Task) {
    setEditingTask(task);
    setEditForm({
      type: task.type || '',
      priority: task.priority || '',
      dueDate: task.dueDate || '',
      title: task.title || '',
      description: task.description || '',
    });
    setIsEditModalOpen(true);
  }

  function closeEditModal() {
    setIsEditModalOpen(false);
    setEditingTask(null);
    setEditForm(initialEditForm);
  }

  const handleEditTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTask?.id) return;

    try {
      setIsSavingEdit(true);
      const response = await updateTask(editingTask.id, {
        type: editForm.type,
        priority: editForm.priority,
        dueDate: editForm.dueDate,
        title: editForm.title,
        description: editForm.description,
      });
      const updatedTask: Task = response?.task;
      if (updatedTask) {
        setTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
        if (viewingTask?.id === updatedTask.id) {
          setViewingTask(updatedTask);
        }
      }
      setErrorMessage('');
      closeEditModal();
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to update task.');
    } finally {
      setIsSavingEdit(false);
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

  // Separate from accepting — hands an already-accepted (or still-pending)
  // task to a specific person. Not compulsory to be the person doing this;
  // whoever accepted it can assign it to themselves or anyone else eligible.
  const handleAssignQueueTask = async () => {
    if (!viewingTask || !hrQueueAssigneeUserId) return;
    const selected = assignCandidateOptions.find((member) => String(member.id) === String(hrQueueAssigneeUserId));
    if (!selected) return;

    try {
      setIsSaving(true);
      const response = await updateTask(viewingTask.id!, {
        assigneeUserId: selected.id,
        assignee: selected.name || '',
      });
      const updatedTask: Task = response?.task;

      if (!updatedTask) {
        return;
      }

      setTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
      setViewingTask(updatedTask);
      setErrorMessage('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to assign task.');
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
      case 'high': return <span className={statusPillClass("High")}>High</span>;
      case 'medium': return <span className={statusPillClass("Medium")}>Medium</span>;
      case 'low': return <span className={statusPillClass("Low")}>Low</span>;
      default: return null;
    }
  };

  const getStatusBadge = (status = '') => {
    switch ((status || '').toLowerCase()) {
      case 'completed':
      case 'approved': return <span className={statusPillClass(status)}>{status}</span>;
      case 'in progress': return <span className={statusPillClass("In Progress")}>In Progress</span>;
      case 'pending': return <span className={statusPillClass("Pending")}>Pending</span>;
      case 'rejected': return <span className={statusPillClass("Rejected")}>Rejected</span>;
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
                <p className="text-xs font-pmedium text-slate-500 mt-1">
                  {isOwnerProfile
                    ? 'Founder View: Monitor department-created tasks and track the assignments you issued.'
                    : isAdminTaskProfile
                      ? 'Admin Task View: Track assigned department work, tasks you raised, and items assigned by super admin.'
                      : 'Track task routing across all departments and manage workloads.'}
                </p>
              </div>
              <ReportExportButton onClick={() => setShowExportModal(true)} />
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-600">
                {errorMessage}
              </div>
            ) : null}

            {/* 2. MAIN TABS (Pill-Style Navigation) */}
            <div data-tour="tasks-page-tabs" className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
              {(
                isOwnerProfile
                  ? [
                    { key: 'company_tasks', label: 'Company Tasks' },
                    { key: 'my_assigned_tasks', label: 'My Assigned Tasks' },
                  ]
                  : isSuperAdminProfile
                    ? [
                      { key: 'company_tasks', label: 'Company Tasks' },
                      { key: 'my_tasks', label: 'My Tasks' },
                      { key: 'my_assigned_tasks', label: 'My Assigned Tasks' },
                    ]
                    : isAdminTaskProfile
                      ? [
                        { key: 'assigned_dept_tasks', label: 'Assigned Dept Tasks' },
                        { key: 'my_tasks', label: 'My Tasks' },
                        { key: 'my_assigned_tasks', label: 'My Assigned Tasks' },
                      ]
                      : isDepartmentManagerProfile
                        ? [
                          { key: 'department_tasks', label: 'Department Tasks' },
                          { key: 'my_tasks', label: 'My Tasks' },
                          { key: 'my_assigned_tasks', label: 'My Assigned Tasks' },
                        ]
                        : [
                          { key: 'department_tasks', label: 'Department Tasks' },
                          { key: 'my_tasks', label: 'My Tasks' },
                        ]
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setStatusFilter('All'); }}
                  className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${activeTab === tab.key ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 3. STAT CARDS */}
            <div data-tour="tasks-page-summary" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
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
                      <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                      <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
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

                <div data-tour="tasks-page-status-filter" className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {['All', 'Pending', 'In Progress', 'Completed', 'Approved'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${statusFilter === status
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
                      data-tour="tasks-page-search"
                      type="text" placeholder="Search Tasks or People..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-500"
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                    <select
                      data-tour="tasks-page-department-filter"
                      className="pl-9 pr-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[100px]"
                      value={selectedDeptFilter} onChange={(e) => setSelectedDeptFilter(e.target.value)}
                    >
                      <option value="All">All Departments</option>
                      {taskFilterDepartments.map(dept => <option key={dept} value={dept}>{getCanonicalDepartmentLabel(dept)}</option>)}
                    </select>
                  </div>
                  <button
                    data-tour="tasks-page-assign-btn"
                    onClick={() => setIsAssignModalOpen(true)}
                    className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                  >
<Plus size={13} strokeWidth={3} /> ASSIGN TASK
                    </button>
                </div>
              </div>

              {/* Table (Desktop) / Cards (Mobile) */}
              <div className="overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden bg-white/20">
                {/* --- DESKTOP TABLE VIEW --- */}
                <table data-tour="tasks-page-table" className="hidden lg:table w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Task Title</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Assigned To</th>
                      <th className="px-5 py-4">Dept</th>
                      <th className="px-5 py-4">Priority</th>
                      <th className="px-5 py-4">Submitted On</th>
                      <th className="px-5 py-4">Due Date</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {displayedTasks.map((task) => {
                      const isTaskOverdue = isOverdue(task.dueDate!, task.status);
                      return (
                        <tr key={task.id} className={`hover:bg-slate-50/50 transition-all group ${isTaskOverdue ? 'bg-red-50/30' : ''}`}>
                          <td className="px-5 py-4 align-top max-w-[250px] xl:max-w-[400px]">
                            <div className="font-pmedium text-[#0F172A] text-[13px] sm:text-[14px]" title={task.title}>
                              {task.title}
                              {task.attachments && task.attachments.length > 0 && (
                                <Paperclip size={12} className="inline ml-2 text-[#2563EB]" />
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <span className="text-[12px] sm:text-[13px] font-pmedium text-slate-700">{task.type}</span>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <span className="text-[12px] sm:text-[13px] font-pmedium text-slate-700">{task.assignee === 'Unassigned' ? 'Department' : getAssigneeDisplayLabel(task)}</span>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <span className="text-[12px] sm:text-[13px] font-pmedium text-slate-700">{getCanonicalDepartmentLabel(task.department!)}</span>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <span className="text-[12px] sm:text-[13px] font-pmedium text-slate-700">{task.priority}</span>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <span className="font-pmedium text-slate-700 text-[12px] sm:text-[13px]">{humanDate(task.createdAt)}</span>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <span className="font-pmedium text-slate-700 text-[12px] sm:text-[13px]">{humanDate(task.dueDate)}</span>
                          </td>
                          <td className="px-5 py-4 align-top">
                            {getStatusBadge(task.status)}
                          </td>
                          <td className="px-5 py-4 align-top text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setViewingTask(task)}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                                title="View"
                              >
                                <Eye size={15} strokeWidth={2.5} />
                              </button>
                              {canEditTask(task) && (
                                <button
                                  onClick={() => openEditTask(task)}
                                  className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                                  title="Edit"
                                >
                                  <Pencil size={15} strokeWidth={2.5} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* --- MOBILE CARD VIEW --- */}
                <div data-tour="tasks-page-table" className="flex flex-col gap-3 lg:hidden p-3 sm:p-4 bg-slate-50/30">
                  {displayedTasks.map((task) => {
                    const isTaskOverdue = isOverdue(task.dueDate!, task.status);
                    return (
                      <div key={task.id} className={`bg-white border p-4 sm:p-5 rounded-[20px] shadow-sm flex flex-col gap-3 transition-all ${isTaskOverdue ? 'border-red-200 bg-red-50/10' : 'border-slate-200/60'}`}>
                        <div className="flex justify-between items-start gap-3">
                          <h3 className="flex-1 font-semibold text-[#0F172A] text-[13px] sm:text-[14px]">
                            {task.title}
                            {task.attachments && task.attachments.length > 0 && <Paperclip size={12} className="inline ml-1 text-[#2563EB]" />}
                          </h3>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {getStatusBadge(task.status)}
                            <span className="text-[11px] font-semibold text-slate-700">{task.priority}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-1">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-pmedium tracking-widest block">Type</span>
                            <span className="text-[11px] font-semibold text-[#0F172A] truncate block">{task.type}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-pmedium tracking-widest block">Dept</span>
                            <span className="text-[11px] font-semibold text-[#0F172A] truncate block">{getCanonicalDepartmentLabel(task.department!)}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[9px] text-slate-400 uppercase font-pmedium tracking-widest block">Assigned To</span>
                            <span className="text-[11px] font-semibold text-[#0F172A] truncate block">{task.assignee === 'Unassigned' ? 'Department' : getAssigneeDisplayLabel(task)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-pmedium tracking-widest block">Submitted On</span>
                            <span className="text-[11px] font-semibold text-[#0F172A] truncate block">{humanDate(task.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-1 border-t border-slate-100/60 pt-3">
                          <span className="font-semibold text-slate-700 text-[11px] sm:text-[12px] flex items-center gap-1.5"><Calendar size={12} /> {humanDate(task.dueDate)}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingTask(task)}
                              className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-pmedium text-[10px] uppercase shadow-sm hover:shadow-md hover:border-blue-200 hover:text-[#2563EB] transition-all flex items-center gap-1.5"
                            >
                              <Eye size={14} strokeWidth={2} /> View
                            </button>
                            {canEditTask(task) && (
                              <button
                                onClick={() => openEditTask(task)}
                                className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-pmedium text-[10px] uppercase shadow-sm hover:shadow-md hover:border-blue-200 hover:text-[#2563EB] transition-all flex items-center gap-1.5"
                              >
                                <Pencil size={14} strokeWidth={2} /> Edit
                              </button>
                            )}
                          </div>
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
                      className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-2.5 text-[12px] font-pmedium uppercase tracking-wider text-[#2563EB] shadow-sm transition-all hover:border-blue-200 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
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
                      Assign Task
                    </h2>
                    <p className="text-[10px] sm:text-[11px] font-pmedium text-slate-500 uppercase tracking-widest mt-2">
                      {isAdminTaskProfile
                        ? 'Assign work to your assigned departments and their staff'
                        : 'Assign work across departments safely'}
                    </p>
                  </div>
                  <button onClick={() => { setIsAssignModalOpen(false); setTaskForm(initialTaskForm); setAssignmentFiles([]); setAssignmentFilesError(''); setRoutingMode('department'); setSelectedRole(''); setAssignTarget(''); setIsAddingTaskType(false); setNewTaskTypeName(''); setNewTaskTypeWorkflowKind('progress'); }} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm">
                    <X size={18} strokeWidth={2.5} />
                  </button>
                </div>

                <form onSubmit={handleAssignTask} className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 [&::-webkit-scrollbar]:hidden bg-slate-50/30">

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Assign To <span className="text-red-400">*</span></label>
                    <select required className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer" value={assignTarget} onChange={e => {
                      const next = e.target.value as 'self' | 'others' | '';
                      setAssignTarget(next);
                      if (next === 'self') {
                        setTaskForm((current) => ({
                          ...current,
                          department: getOwnDepartmentNames()[0] || profile.dept || '',
                          assignee: profile.name,
                          assigneeUserId: currentUserId,
                        }));
                      } else {
                        setRoutingMode('department');
                        setSelectedRole('');
                        setTaskForm((current) => ({ ...current, department: '', assignee: '', assigneeUserId: '' }));
                      }
                    }}>
                      <option value="" disabled>Select Assign Type</option>
                      <option value="self">Self</option>
                      {!isEmployeeTaskProfile && <option value="others">Others</option>}
                    </select>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                    <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                      <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><FileText size={16} /></span>
                      <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Task Details</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Task Type <span className="text-red-400">*</span></label>
                        <select required className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer" value={isAddingTaskType ? '__new__' : taskForm.type} onChange={e => {
                          if (e.target.value === '__new__') {
                            setIsAddingTaskType(true);
                            return;
                          }
                          setIsAddingTaskType(false);
                          setTaskForm({ ...taskForm, type: e.target.value });
                        }}>
                          <option value="" disabled>Select Type</option>
                          {(taskTypes.length > 0 ? taskTypes : [{ id: 'standard', name: 'Standard', workflowKind: 'progress' as const }, { id: 'approval', name: 'Approval', workflowKind: 'approval' as const }]).map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))}
                          <option value="__new__">+ Add New Type</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Priority <span className="text-red-400">*</span></label>
                        <select required className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                          <option value="" disabled>Select Priority</option>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                      {isAddingTaskType && (
                        <div className="sm:col-span-2 bg-blue-50/60 border border-blue-100 rounded-lg p-3 space-y-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">New Type Name</label>
                            <input type="text" placeholder="e.g. Client Escalation" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-500" value={newTaskTypeName} onChange={e => setNewTaskTypeName(e.target.value)} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Behavior</label>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => setNewTaskTypeWorkflowKind('progress')} className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-pmedium border transition-all ${newTaskTypeWorkflowKind === 'progress' ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-slate-600 border-slate-200'}`}>Progress-tracked</button>
                              <button type="button" onClick={() => setNewTaskTypeWorkflowKind('approval')} className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-pmedium border transition-all ${newTaskTypeWorkflowKind === 'approval' ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-slate-600 border-slate-200'}`}>Approval-based</button>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            <button type="button" onClick={() => { setIsAddingTaskType(false); setNewTaskTypeName(''); setNewTaskTypeWorkflowKind('progress'); }} className="px-3 py-2 text-[11px] font-pmedium text-slate-500 hover:text-slate-700">Cancel</button>
                            <button type="button" disabled={!newTaskTypeName.trim() || isSavingTaskType} onClick={handleCreateTaskType} className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-[11px] font-pmedium disabled:opacity-50">{isSavingTaskType ? 'Saving...' : 'Save Type'}</button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Deadline <span className="text-red-400">*</span></label>
                      <input required type="date" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Task Title <span className="text-red-400">*</span></label>
                      <input required type="text" placeholder="e.g. Audit Q3 Finances" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-500" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Details & Instructions</label>
                      <textarea required rows={4} placeholder="Detailed instructions..." className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none placeholder:text-slate-500" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
                    </div>
                  </div>

                  {assignTarget === 'others' && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                    <h4 className="flex items-center justify-between border-b border-slate-200/80 pb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><User size={16} /></span>
                        <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Routing & Workload Control</span>
                      </div>
                      <div className="flex bg-slate-100 rounded-lg p-1">
                        <button type="button" onClick={() => { setRoutingMode('department'); setSelectedRole(''); setTaskForm(current => ({ ...current, department: '', assignee: '', assigneeUserId: '' })); }} className={`px-3 py-1.5 rounded-md text-[10px] font-pmedium uppercase tracking-wider transition-all ${routingMode === 'department' ? 'bg-white text-[#2563EB] shadow-sm' : 'text-slate-500'}`}>Department</button>
                        {getAssignableRoleOptions().length > 0 && (
                          <button type="button" onClick={() => { setRoutingMode('role'); setSelectedRole(''); setTaskForm(current => ({ ...current, department: '', assignee: '', assigneeUserId: '' })); }} className={`px-3 py-1.5 rounded-md text-[10px] font-pmedium uppercase tracking-wider transition-all ${routingMode === 'role' ? 'bg-white text-[#2563EB] shadow-sm' : 'text-slate-500'}`}>Role</button>
                        )}
                      </div>
                    </h4>
                    {routingMode === 'department' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Route to Department <span className="text-red-400">*</span></label>
                          <select required className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer" value={taskForm.department} onChange={e => {
                            const nextDepartment = e.target.value;

                            // Picking a department defaults to the Unassigned
                            // queue rather than auto-selecting a person — the
                            // department manager (or an eligible member) picks
                            // it up from there.
                            setTaskForm((current) => ({
                              ...current,
                              department: nextDepartment,
                              assignee: '',
                              assigneeUserId: '',
                            }));
                          }}>
                            <option value="">Select Department</option>
                            {taskRouteDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Assignee (Checks Workload)</label>
                          <select required={isAdminTaskProfile || isTopManagementDepartmentName(taskForm.department)} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer disabled:opacity-50 disabled:bg-slate-100" disabled={!taskForm.department} value={taskForm.assigneeUserId || ''} onChange={e => {
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
                            <p className="text-[10px] font-pmedium text-red-600 mt-1">No active Super Admin member found in this workspace.</p>
                          ) : null}
                          {isAdminTaskProfile && taskForm.department && assigneeOptions.length === 0 ? (
                            <p className="text-[10px] font-pmedium text-red-600 mt-1">
                              No assigned-department managers or employees found for "{taskForm.department}".
                            </p>
                          ) : null}
                          {!isAdminTaskProfile && taskForm.department && assigneeOptions.length === 0 ? (
                            <p className="text-[10px] font-pmedium text-red-600 mt-1">
                              No members matched for department "{taskForm.department}".
                            </p>
                          ) : null}
                          {taskForm.assignee && getPendingTaskCount(taskForm.assignee) >= 3 && (
                            <p className="text-[10px] font-pmedium text-amber-600 inline-flex items-center gap-1.5 mt-1 bg-amber-50 px-2 py-1 rounded border border-amber-100"><AlertTriangle size={12} /> High workload detected.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Route to Role <span className="text-red-400">*</span></label>
                          <select required className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer" value={selectedRole} onChange={e => {
                            setSelectedRole(e.target.value);
                            handleSelectRoleAssignee(null);
                          }}>
                            <option value="">Select Role</option>
                            {getAssignableRoleOptions().map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Assignee (Checks Workload)</label>
                          <select required className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer disabled:opacity-50 disabled:bg-slate-100" disabled={!selectedRole} value={taskForm.assigneeUserId || ''} onChange={e => {
                            const selected = roleAssigneeOptions.find((member) => member.id === e.target.value) || null;
                            handleSelectRoleAssignee(selected);
                          }}>
                            <option value="">Select Assignee</option>
                            {roleAssigneeOptions.map(member => {
                              const pending = getPendingTaskCount(member.name || '');
                              return (
                                <option key={member.id} value={member.id}>
                                  {member.name} {pending > 0 ? `(${pending} tasks pending)` : `(Available)`}
                                </option>
                              );
                            })}
                          </select>
                          {selectedRole && roleAssigneeOptions.length === 0 ? (
                            <p className="text-[10px] font-pmedium text-red-600 mt-1">No members found with this role.</p>
                          ) : null}
                          {taskForm.assignee && getPendingTaskCount(taskForm.assignee) >= 3 && (
                            <p className="text-[10px] font-pmedium text-amber-600 inline-flex items-center gap-1.5 mt-1 bg-amber-50 px-2 py-1 rounded border border-amber-100"><AlertTriangle size={12} /> High workload detected.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  )}

                  <AttachmentDropzone
                    files={assignmentFiles}
                    onFilesChange={setAssignmentFiles}
                    error={assignmentFilesError}
                    onErrorChange={setAssignmentFilesError}
                    label="Reference Files (Optional)"
                  />

                  <div className="pt-4 sm:pt-6 flex gap-3 border-t border-slate-200/60 flex-col-reverse sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => { setIsAssignModalOpen(false); setTaskForm(initialTaskForm); setAssignmentFiles([]); setAssignmentFilesError(''); setRoutingMode('department'); setSelectedRole(''); setAssignTarget(''); setIsAddingTaskType(false); setNewTaskTypeName(''); setNewTaskTypeWorkflowKind('progress'); }} className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase">CANCEL</button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full sm:w-auto px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-primary/95 active:scale-95 transition-all uppercase flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSaving ? 'CREATING...' : 'CREATE TASK'} <Plus size={13} strokeWidth={3} />
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
            <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3">
              <div className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70 max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">{viewingTask.title}</h2>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {getStatusBadge(viewingTask.status)}
                        {getPriorityBadge(viewingTask.priority)}
                        <span className="text-[10px] font-pmedium text-slate-500">{viewingTask.taskCode || viewingTask.id}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setViewingTask(null)} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"><X size={16} /></button>
                </div>

                <div className="p-5 sm:p-6 space-y-5 overflow-y-auto bg-white">

                  <div>
                    <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                      <FileText size={14} /> Task Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Type</p>
                        <p className="text-[12px] font-pmedium text-slate-900">{viewingTask.type}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Department</p>
                        <p className="text-[12px] font-pmedium text-slate-900">{getCanonicalDepartmentLabel(viewingTask.department!)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Raised By</p>
                        <p className="text-[12px] font-pmedium text-slate-900">{formatPersonLabel(viewingTask.raisedBy || '', viewingTask.raisedByDept)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Assigned To</p>
                        <p className="text-[12px] font-pmedium text-slate-900">{getAssigneeDisplayLabel(viewingTask)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Due Date</p>
                        <p className="text-[12px] font-pmedium text-slate-900 flex items-center gap-1.5">
                          {humanDate(viewingTask.dueDate)}
                          {isOverdue(viewingTask.dueDate!, viewingTask.status) && (
                            <span className={statusPillClass("Overdue")}>Overdue</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Submitted On</p>
                        <p className="text-[12px] font-pmedium text-slate-900">{humanDate(viewingTask.createdAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                      <FileText size={14} /> Description
                    </h3>
                    <p className="text-[12px] font-pmedium text-slate-900 leading-relaxed bg-slate-50/60 p-4 rounded-2xl border border-slate-100">{viewingTask.description}</p>
                  </div>

                  {(viewingTask.completionNote || (viewingTask.attachments || []).length > 0) ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                      {viewingTask.completionNote ? (
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1.5">Completion Message</p>
                          <p className="text-[12px] font-pmedium text-slate-900 leading-relaxed">{viewingTask.completionNote}</p>
                        </div>
                      ) : null}
                      {(viewingTask.attachments || []).length > 0 ? (
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-2">Attached Documents</p>
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
                                  <span className={statusPillClass(attachment.size)}>{attachment.size}</span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* PROGRESS SLIDER OR APPROVAL ACTIONS */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                    <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                      <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Clock size={16} /></span>
                      <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Task Status / Progress</span>
                    </h4>

                    {/* Step 1: Accept — a plain claim, no assignee decision yet. */}
                    {viewingTask.status === "Pending" && !isOwnerProfile ? (
                      <button
                        onClick={() => handleAcceptTask()}
                        disabled={isSaving}
                        className="w-full mb-4 py-3 sm:py-3.5 rounded-xl font-pmedium text-[11px] sm:text-[12px] uppercase tracking-wider transition-all flex justify-center items-center gap-2 shadow-sm bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSaving ? 'ACCEPTING...' : 'Accept Task'}
                      </button>
                    ) : null}

                    {/* Step 2: Assign — separate action, once accepted. Not
                        compulsory to assign to self; any eligible member works. */}
                    {viewingTask.status === "In Progress" && !viewingTask.assigneeUserId && !isOwnerProfile && canManageQueueForTask(viewingTask) ? (
                      <div className="mb-4 space-y-3">
                        <div>
                          <label className="text-[10px] sm:text-[11px] font-pmedium text-slate-500 uppercase tracking-wider">Assign to</label>
                          <select
                            className="mt-1.5 w-full px-4 py-3 bg-white border border-slate-200 shadow-sm rounded-xl font-pmedium text-[#0F172A] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none cursor-pointer transition-all"
                            value={hrQueueAssigneeUserId || ''}
                            onChange={(e) => setHrQueueAssigneeUserId(e.target.value)}
                          >
                            {assignCandidateOptions.map((member) => {
                              const isSelf = String(member.id) === String(currentUserId);
                              const memberRole = resolveDisplayRole([member.role || '']);
                              return (
                                <option key={member.id} value={member.id}>
                                  {isSelf ? `${member.name} (You)` : `${member.name} (${memberRole})`}
                                </option>
                              );
                            })}
                          </select>
                          <p className="text-[10px] font-pmedium text-slate-500 mt-2">
                            Accepted — now assign it to yourself or a teammate.
                          </p>
                        </div>
                        <button
                          onClick={handleAssignQueueTask}
                          disabled={isSaving || !hrQueueAssigneeUserId}
                          className="w-full py-3 sm:py-3.5 rounded-xl font-pmedium text-[11px] sm:text-[12px] uppercase tracking-wider transition-all flex justify-center items-center gap-2 shadow-sm bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isSaving ? 'ASSIGNING...' : 'Assign Task'}
                        </button>
                      </div>
                    ) : null}

                    {viewingTask.status === "In Progress" && !isOwnerProfile && isTaskAssignedToCurrentUser(viewingTask) ? (
                      <div className="mb-4 space-y-3">
                        <div>
                          <label className="text-[10px] sm:text-[11px] font-pmedium text-slate-500 uppercase tracking-wider">Completion Message (Optional)</label>
                          <textarea
                            rows={3}
                            value={completionNote}
                            onChange={(e) => setCompletionNote(e.target.value)}
                            placeholder="Add what was completed, blockers resolved, or handover notes..."
                            className="mt-1.5 w-full px-4 py-3 bg-white border border-slate-200 shadow-sm rounded-xl font-pmedium text-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none transition-all placeholder:text-slate-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] sm:text-[11px] font-pmedium text-slate-500 uppercase tracking-wider">Attach Document (Optional)</label>
                          <input
                            type="file"
                            multiple
                            onChange={handleCompletionFilesChange}
                            className="mt-1.5 block w-full text-[12px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-[11px] file:font-pmedium file:uppercase file:tracking-wider file:text-emerald-700 hover:file:bg-emerald-100"
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
                                    <span className={statusPillClass(formatFileSize(file.size))}>{formatFileSize(file.size)}</span>
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
                          className="w-full py-3 sm:py-3.5 rounded-xl font-pmedium text-[11px] sm:text-[12px] uppercase tracking-wider transition-all flex justify-center items-center gap-2 shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isSaving ? 'UPDATING...' : 'Mark As Completed'}
                        </button>
                      </div>
                    ) : null}

                    {getWorkflowKindForType(viewingTask.type || '') === 'progress' ? (
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
                    ) : (viewingTask.status === "Approved" || viewingTask.status === "Rejected") ? (
                      <div className={`py-3 sm:py-3.5 rounded-xl font-pmedium text-[11px] sm:text-[12px] uppercase tracking-wider flex justify-center items-center gap-2 border ${viewingTask.status === "Approved" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                        {viewingTask.status === "Approved" ? <CheckCircle2 size={16} strokeWidth={2.5} /> : <X size={16} strokeWidth={2.5} />}
                        Final Decision: {viewingTask.status} — this cannot be changed
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedApprovalAction("Approved")}
                            disabled={!canEditTaskStatus || !isCurrentUserName(viewingTask.assignee || '')}
                            className={`flex-1 py-3 sm:py-3.5 rounded-xl font-pmedium text-[11px] sm:text-[12px] uppercase tracking-wider transition-all flex justify-center items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${selectedApprovalAction === "Approved" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50"}`}
                          >
                            <CheckCircle2 size={16} strokeWidth={2.5} /> Formally Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedApprovalAction("Rejected")}
                            disabled={!canEditTaskStatus || !isCurrentUserName(viewingTask.assignee || '')}
                            className={`flex-1 py-3 sm:py-3.5 rounded-xl font-pmedium text-[11px] sm:text-[12px] uppercase tracking-wider transition-all flex justify-center items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${selectedApprovalAction === "Rejected" ? "bg-red-50 border border-red-200 text-red-700" : "bg-white border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-700 hover:bg-red-50"}`}
                          >
                            <X size={16} strokeWidth={2.5} /> Reject / Revise
                          </button>
                        </div>
                        <button
                          onClick={() => selectedApprovalAction && handleApprovalAction(selectedApprovalAction)}
                          disabled={!selectedApprovalAction || isSaving || !canEditTaskStatus || !isCurrentUserName(viewingTask.assignee || '')}
                          className="w-full py-3 sm:py-3.5 rounded-xl font-pmedium text-[11px] sm:text-[12px] uppercase tracking-wider transition-all flex justify-center items-center gap-2 shadow-sm bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? 'SUBMITTING...' : 'Submit Decision'}
                        </button>
                        <p className="text-[10px] font-pmedium text-slate-500">
                          Select Approve or Reject, then submit — this is final and cannot be changed afterward.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* COMMENTS & ACTIVITY FEED */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                    <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                      <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><MessageSquare size={16} /></span>
                      <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Internal Comments</span>
                    </h4>
                    <div className="space-y-3 sm:space-y-4">
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
                              <span className={statusPillClass(c.time)}>{c.time}</span>
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
                        className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-24 py-3 sm:py-3.5 text-[13px] sm:text-[14px] font-pmedium text-[#0F172A] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none transition-all shadow-sm placeholder:text-slate-500"
                      />
                      <button onClick={handleAddComment} className="absolute right-2 top-1.5 sm:top-2 bg-slate-900 hover:bg-black text-white px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-[12px] font-pmedium transition-colors shadow-sm tracking-wider uppercase">
                        Post
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* MODAL 3: EDIT TASK */}
          {/* ======================================================= */}
          {isEditModalOpen && editingTask && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[95vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0"></div>

                <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-pmedium text-primary flex items-center gap-2">
                      <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
                        <Pencil size={20} strokeWidth={2.5} />
                      </div>
                      Edit Task
                    </h2>
                    <p className="text-[10px] sm:text-[11px] font-pmedium text-slate-500 uppercase tracking-widest mt-2">
                      Update the task details below
                    </p>
                  </div>
                  <button onClick={closeEditModal} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm">
                    <X size={18} strokeWidth={2.5} />
                  </button>
                </div>

                <form onSubmit={handleEditTask} className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 [&::-webkit-scrollbar]:hidden bg-slate-50/30">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                    <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                      <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><FileText size={16} /></span>
                      <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Task Details</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Task Type <span className="text-red-400">*</span></label>
                        <select required className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer" value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                          {(taskTypes.length > 0 ? taskTypes : [{ id: 'standard', name: 'Standard', workflowKind: 'progress' as const }, { id: 'approval', name: 'Approval', workflowKind: 'approval' as const }]).map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Priority <span className="text-red-400">*</span></label>
                        <select required className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer" value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value })}>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Deadline <span className="text-red-400">*</span></label>
                      <input required type="date" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer" value={editForm.dueDate} onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })} />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Task Title <span className="text-red-400">*</span></label>
                      <input required type="text" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-500" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Details & Instructions</label>
                      <textarea required rows={4} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none placeholder:text-slate-500" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                    </div>
                  </div>

                  <div className="pt-4 sm:pt-6 flex gap-3 border-t border-slate-200/60 flex-col-reverse sm:flex-row sm:justify-end">
                    <button type="button" onClick={closeEditModal} className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase">CANCEL</button>
                    <button
                      type="submit"
                      disabled={isSavingEdit}
                      className="w-full sm:w-auto px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-primary/95 active:scale-95 transition-all uppercase flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSavingEdit ? 'SAVING...' : 'SAVE CHANGES'} <Pencil size={13} strokeWidth={3} />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}
    </PageFrame>

      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Tasks"
        subtitle="Select format and date range to export."
        department="Admin"
        category="Other"
        sourceRef="tasks-page"
        reportTitle="Task Management"
        defaultDataWindow="Annual"
        onExport={handleExportReport}
      />
    </div>
  );
}
