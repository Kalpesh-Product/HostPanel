import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Building2, Plus, Trash2, X, Users, UserPlus, ArrowLeft,
  Mail, Calendar, Briefcase, Shield, Send, DollarSign, Wrench,
  CheckCircle2, Search, Crown, CheckSquare, ChevronDown,
  Power, AlertCircle, Lock, Clock, UserCheck, UserX, Ban, Loader2, Eye, ArrowUpDown
} from 'lucide-react';
import { Switch } from '@mui/material';
import useAuth from '../../hooks/useAuth';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import PageFrame from '../../components/Pages/PageFrame';
import { OrganizationSkeleton } from '../../components/ui/Skeleton';
import {
  assignOrganizationActingManager,
  assignOrganizationDepartmentManager,
  cancelOrganizationInvite,
  getOrganizationOverview,
  inviteOrganizationMember,
  removeOrganizationActingManager,
  saveOrganizationDepartment,
  toggleOrganizationMemberStatus,
  updateOrganizationMemberRole,
} from '../../services/organization';
import {
  OWNER_DEPARTMENT_CATALOG,
  buildDefaultOwnerAccessState,
  getDepartmentDefinition,
  getDepartmentLabel,
  getDepartmentModules,
  getSharedSectionModules,
  isDepartmentEnabledInState,
  isModuleEnabledInState,
  isSharedModuleEnabledInState,
  mergeOwnerAccessState,
  readStoredOwnerAccessState,
  toggleDepartmentInState,
  toggleModuleInState,
  toggleSharedModuleInState,
  writeStoredOwnerAccessState,
} from '../../lib/owner-access';
import { getWorkspaceCount, isDepartmentAllowedForPlan } from '../../utils/workspacePlanAccess';
import { statusPillClass } from '../../lib/status-pill';

// sessionStorage only - see client/src/lib/auth-session.ts for why localStorage
// (shared across tabs) must not be used as a fallback for the cached user.
const getStoredUser = () => {
  try {
    const raw = sessionStorage.getItem("hostpanel_auth_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const updateStoredUser = (user) => {
  try {
    sessionStorage.setItem("hostpanel_auth_user", JSON.stringify(user || null));
    window.dispatchEvent(new Event("auth:updated"));
  } catch {
    // noop
  }
};

const DEPARTMENT_TONE_CLASSES = {
  blue: 'bg-[#2563EB]',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
  cyan: 'bg-cyan-500',
};

const departmentIcons = {
  hr: Users,
  administration: Briefcase,
  sales: DollarSign,
  finance: DollarSign,
  maintenance: Wrench,
  technology: Building2,
  it: Wrench,
};

type DepartmentOption = {
  id?: string;
  _id?: string;
  name?: string;
  employeeCount?: number;
  isActive?: boolean;
  description?: string;
  managerName?: string;
  managerId?: string;
  managerUserId?: string;
  moduleIds?: string[];
  adminUserIds?: string[];
  employeeUserIds?: string[];
  employees?: TeamMember[];
  transferredEmployees?: TeamMember[];
  actingManagers?: Array<{
    id?: string;
    assignedUserId?: string;
    assignedUserName?: string;
    assignedBaseRole?: string;
  }>;
};

type CoreModuleOption = {
  id: string;
  name: string;
  group?: string;
};

type CreatedDepartmentNotice = {
  id: string;
  name: string;
};

const getDepartmentToneClass = (dept: DepartmentOption) => {
  const definition = getDepartmentDefinition(dept?.name || '');
  return DEPARTMENT_TONE_CLASSES[definition?.tone || 'blue'] || DEPARTMENT_TONE_CLASSES.blue;
};

const normalizeDepartmentLabel = (value = '') => {
  const normalized = String(value || '').trim();
  const lower = normalized.toLowerCase();
  if (lower === 'it') {
    return 'IT';
  }
  const definition = getDepartmentDefinition(normalized);
  return definition?.label || normalized;
};

const isCustomDepartmentOption = (department: DepartmentOption | null | undefined) => {
  const normalizedName = String(department?.name || '').trim().toLowerCase();
  if (!normalizedName) return false;
  return !OWNER_DEPARTMENT_CATALOG.some(
    (catalogDepartment) =>
      catalogDepartment.label.toLowerCase() === normalizedName ||
      catalogDepartment.key.toLowerCase() === normalizedName,
  );
};

const formatModuleLabel = (value = '') =>
  String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

type TeamMember = {
  id?: string;
  _id?: string;
  userId?: string;
  name?: string;
  email?: string;
  employeeId?: string;
  role?: string;
  status?: string;
  departmentNames?: string[];
  transferredToWorkspaceName?: string;
  transferredToWorkspaceLocation?: string;
  grantedModules?: string[];
  enabledModules?: string[];
  workspaceAccesses?: Array<{ id?: string; workspaceName?: string; location?: string }>;
  joinedAt?: string;
};

type TeamMemberFormData = {
  name: string;
  email: string;
  role: string;
  departments: string[];
};

const SINGLE_DEPARTMENT_TEAM_MEMBER_ROLES = new Set(['manager', 'employee']);
const isValidWorkEmail = (value = '') =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim().toLowerCase());


const getTeamMemberDepartmentHelperText = (role = '') => {
  const normalizedRole = String(role || '').trim().toLowerCase();

  if (normalizedRole === 'admin') {
    return 'Admin can be assigned to multiple departments.';
  }

  if (normalizedRole === 'manager') {
    return 'Manager can be assigned to exactly one department, and each department can have only one manager.';
  }

  if (normalizedRole === 'employee') {
    return 'Employee can be assigned to exactly one department.';
  }

  return 'Select departments based on the chosen role.';
};

function resolveDepartmentManagementState(user, organizationDepartments: DepartmentOption[] = []) {
  const baseState = mergeOwnerAccessState(
    user?.workspace?.ownerAccessSettings ||
      user?.workspaceDraft?.ownerAccessSettings ||
      user?.workspaceMembership?.ownerAccessSettings ||
      readStoredOwnerAccessState(user) ||
      buildDefaultOwnerAccessState(),
  );

  if (!Array.isArray(organizationDepartments) || organizationDepartments.length === 0) {
    return baseState;
  }

  let nextState = baseState;

  OWNER_DEPARTMENT_CATALOG.forEach((department) => {
    const matchingDepartment = organizationDepartments.find((candidate: DepartmentOption) => {
      const definition = getDepartmentDefinition(candidate?.name || '');
      return definition?.key === department.key;
    });

    nextState = toggleDepartmentInState(
      nextState,
      department.key,
      matchingDepartment ? matchingDepartment.isActive !== false : false,
    );
  });

  return nextState;
}

function saveUserOwnerAccessSettings(user, accessState) {
  if (!user) {
    return;
  }

  const nextWorkspace = {
    ...(user.workspace || {}),
    ownerAccessSettings: accessState,
  };

  const nextMembership = user.workspaceMembership
    ? {
        ...user.workspaceMembership,
        ownerAccessSettings: accessState,
      }
    : user.workspaceMembership;

  updateStoredUser({
    ...user,
    workspace: nextWorkspace,
    workspaceMembership: nextMembership,
  });
}

export function OrganizationPage() {
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const [currentUser, setCurrentUser] = useState(() => auth?.user || getStoredUser());
  const [isLoading, setIsLoading] = useState(true);
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('users');
  const [view, setView] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptRoleFilter, setDeptRoleFilter] = useState('all');
  
  // Selection States
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentOption | null>(null);
  
  // Modal Triggers
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showAssignManagerModal, setShowAssignManagerModal] = useState(false);
  const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);
  
  // Form States
  const [employeeFormData, setEmployeeFormData] = useState({ name: '', email: '' });
  const [teamMemberFormData, setTeamMemberFormData] = useState<TeamMemberFormData>({ name: '', email: '', role: 'manager', departments: [] });
  const [permissions, setPermissions] = useState({});
  const [workspaceOrganizationDepartments, setWorkspaceOrganizationDepartments] = useState([]);
  const [workspaceEnabledModuleIds, setWorkspaceEnabledModuleIds] = useState<string[]>([]);
  const [currentMemberGrantedModuleIds, setCurrentMemberGrantedModuleIds] = useState<string[]>([]);
  const [departmentAccessState, setDepartmentAccessState] = useState(() =>
    resolveDepartmentManagementState(currentUser, []),
  );
  const [expandedDepartmentKey, setExpandedDepartmentKey] = useState('');
  const [isSavingDepartments, setIsSavingDepartments] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false);
  const [createdDepartmentNotice, setCreatedDepartmentNotice] = useState<CreatedDepartmentNotice | null>(null);
  const [accessTogglePendingMemberId, setAccessTogglePendingMemberId] = useState('');
  const [cancelInvitePendingMemberId, setCancelInvitePendingMemberId] = useState('');

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);
  const [inviteToRemove, setInviteToRemove] = useState<TeamMember | null>(null);
  const [roleChangeTarget, setRoleChangeTarget] = useState<TeamMember | null>(null);
  const [roleChangeForm, setRoleChangeForm] = useState<{ role: string; departments: string[] }>({
    role: 'employee',
    departments: [],
  });
  const [isSavingRoleChange, setIsSavingRoleChange] = useState(false);
  const [transferredTeamMembers, setTransferredTeamMembers] = useState<TeamMember[]>([]);
  const [workspacePlan, setWorkspacePlan] = useState('basic');
  const [availableCoreModules, setAvailableCoreModules] = useState<CoreModuleOption[]>([]);
  const [newDepartmentForm, setNewDepartmentForm] = useState({
    departmentId: '',
    name: '',
    description: '',
    moduleIds: [] as string[],
  });

  const permissionSchema = {
    common: [
      { id: 'dashboard', name: 'Dashboard Analytics', features: ['View Global Data', 'Export Reports'] },
      { id: 'attendance', name: 'Attendance & Leaves', features: ['View Team Logs', 'Approve Leaves'] },
    ],
    hr_core: [
      { id: 'emp_mgmt', name: 'Employee Management', features: ['Add/Remove Staff', 'Access Control Panel'] },
    ]
  };

  const loadOrganization = useCallback(async (preferredDepartmentId: string | null = null, showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const [overviewResult, moduleMapResult] = await Promise.allSettled([
        getOrganizationOverview(axiosPrivate),
        axiosPrivate.get('/api/workspaces/module-access-map'),
      ]);
      const payload =
        overviewResult.status === 'fulfilled'
          ? overviewResult.value?.data?.data || overviewResult.value?.data || {}
          : {};
      const moduleMapPayload =
        moduleMapResult.status === 'fulfilled'
          ? moduleMapResult.value?.data?.data || {}
          : {};
      const nextWorkspaceDepartments = Array.isArray(payload?.workspace?.organizationDepartments)
        ? payload.workspace.organizationDepartments
        : [];
      const moduleSections = Array.isArray(moduleMapPayload?.moduleMap?.sections)
        ? moduleMapPayload.moduleMap.sections
        : Array.isArray(payload?.workspace?.moduleMap?.sections)
          ? payload.workspace.moduleMap.sections
          : [];
      const departmentModuleSection = moduleSections.find((section: any) => section?.sectionId === 'department-accesses');
      const mappedDepartmentCoreModules = (departmentModuleSection?.items || []).flatMap((group: any) =>
        (group?.tabs || [])
          .filter((tab: any) => tab?.unlockedInWorkspace === true)
          .map((tab: any) => ({
            id: String(tab?.id || '').trim(),
            name: String(tab?.label || tab?.name || '').trim(),
            group: String(group?.label || group?.name || 'Available Modules').trim(),
          })),
      ).filter((item: CoreModuleOption) => item.id && item.name);
      const fallbackCoreModules = Array.isArray(payload?.workspace?.availableCoreModules)
        ? payload.workspace.availableCoreModules.map((item: any) => ({
            id: String(item?.id || '').trim(),
            name: String(item?.name || item?.label || '').trim(),
            group: String(item?.group || 'Available Modules').trim(),
          })).filter((item: CoreModuleOption) => item.id && item.name)
        : [];
      const nextAvailableCoreModules = mappedDepartmentCoreModules.length > 0
        ? mappedDepartmentCoreModules
        : fallbackCoreModules;
      const nextWorkspacePlan = String(payload?.workspace?.selectedPlan || 'basic').trim().toLowerCase();
      const nextDepartments = Array.isArray(payload.departments) ? payload.departments : [];
      const roleSnapshot = String(
        currentUser?.workspaceMembership?.role || currentUser?.role || "",
      )
        .trim()
        .toLowerCase()
        .replace(/_/g, "-");
      const mergedDepartments = OWNER_DEPARTMENT_CATALOG.map((catalogDepartment) => {
        const existingDepartment = nextDepartments.find((department) => {
          const normalizedName = String(department?.name || "")
            .trim()
            .toLowerCase();
          return (
            normalizedName === catalogDepartment.label.toLowerCase() ||
            normalizedName === catalogDepartment.key.toLowerCase()
          );
        });

        return (
          existingDepartment || {
            id: `virtual-${catalogDepartment.key}`,
            name: catalogDepartment.label,
            description: catalogDepartment.summary,
            employeeCount: 0,
            employees: [],
            managerUserId: "",
            managerName: "",
            actingManagers: [],
          }
        );
      });
      // Always show the full platform catalog (7 departments) on this screen.
      // API workspace department payloads can temporarily be partial and hide one item.
      const customDepartments = nextDepartments.filter((department) => {
        const normalizedName = String(department?.name || '').trim().toLowerCase();
        return !OWNER_DEPARTMENT_CATALOG.some(
          (catalogDepartment) =>
            catalogDepartment.label.toLowerCase() === normalizedName ||
            catalogDepartment.key.toLowerCase() === normalizedName,
        );
      });
      const visibleDepartments = [...mergedDepartments, ...customDepartments];
      const nextMembers = Array.isArray(payload.teamMembers) ? payload.teamMembers : [];
      const currentUserIdSnapshot = String(currentUser?.id || currentUser?._id || '').trim();
      const currentUserEmailSnapshot = String(currentUser?.email || '').trim().toLowerCase();
      const currentMemberFromOverview = nextMembers.find((member) => {
        const memberUserId = String(member?.userId || member?.id || member?._id || '').trim();
        const memberEmail = String(member?.email || '').trim().toLowerCase();
        return (
          (memberUserId && currentUserIdSnapshot && memberUserId === currentUserIdSnapshot) ||
          (memberEmail && currentUserEmailSnapshot && memberEmail === currentUserEmailSnapshot)
        );
      });
      const nextTransferredMembers = Array.isArray(payload.transferredTeamMembers)
        ? payload.transferredTeamMembers
        : [];

      setWorkspaceOrganizationDepartments(nextWorkspaceDepartments);
      setWorkspaceEnabledModuleIds(
        Array.isArray(moduleMapPayload?.enabledModuleIds)
          ? moduleMapPayload.enabledModuleIds
          : Array.isArray(payload?.workspace?.enabledModuleIds)
            ? payload.workspace.enabledModuleIds
            : [],
      );
      setCurrentMemberGrantedModuleIds(
        Array.isArray(moduleMapPayload?.currentMemberGrantedModules) &&
        moduleMapPayload.currentMemberGrantedModules.length > 0
          ? moduleMapPayload.currentMemberGrantedModules
          : Array.isArray(currentMemberFromOverview?.grantedModules)
            ? currentMemberFromOverview.grantedModules
            : [],
      );
      setWorkspacePlan(nextWorkspacePlan);
      setAvailableCoreModules(nextAvailableCoreModules);
      setDepartments(visibleDepartments);
      setTeamMembers(nextMembers);
      setTransferredTeamMembers(nextTransferredMembers);
      setPermissions(payload.metrics || {});
      setDeptRoleFilter((current) =>
        current === 'all' || (current.startsWith('dept:') && visibleDepartments.some((department) => department.id === current.replace('dept:', '')))
          ? current
          : 'all',
      );

      setSelectedDepartment((current) => {
        const targetId = preferredDepartmentId || current?.id;

        if (targetId) {
          return visibleDepartments.find((department) => department.id === targetId) || visibleDepartments[0] || null;
        }

        return visibleDepartments[0] || null;
      });
    } catch (error) {
      console.error("Failed to load organization overview", error);
      toast.error("Failed to load organization overview");
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [axiosPrivate, currentUser?._id, currentUser?.email, currentUser?.id, currentUser?.workspaceMembership?.role, currentUser?.role]);

  useEffect(() => {
    const syncCurrentUser = () => {
      setCurrentUser(auth?.user || getStoredUser());
    };

    window.addEventListener('auth:updated', syncCurrentUser);
    window.addEventListener('auth:cleared', syncCurrentUser);

    return () => {
      window.removeEventListener('auth:updated', syncCurrentUser);
      window.removeEventListener('auth:cleared', syncCurrentUser);
    };
  }, [auth?.user]);

  useEffect(() => {
    setDepartments([]);
    setTeamMembers([]);
    setTransferredTeamMembers([]);
    setPermissions({});
    setWorkspaceOrganizationDepartments([]);
    setWorkspaceEnabledModuleIds([]);
    setCurrentMemberGrantedModuleIds([]);
    setWorkspacePlan('basic');
    setAvailableCoreModules([]);
    setSelectedDepartment(null);
    setExpandedDepartmentKey('');
    setIsSavingDepartments(false);
    setSearchQuery('');
    setStatusFilter('all');
    setDeptRoleFilter('all');
    setShowDepartmentModal(false);
    setShowEmployeeModal(false);
    setShowAssignManagerModal(false);
    setShowTeamMemberModal(false);
    setCreatedDepartmentNotice(null);
    setIsCreatingDepartment(false);
    setNewDepartmentForm({
      departmentId: '',
      name: '',
      description: '',
      moduleIds: [],
    });

    if (currentUser?.id || currentUser?._id) {
      void loadOrganization(null, true);
    } else {
      setIsLoading(false);
    }
  }, [currentUser?.id, currentUser?._id, currentUser?.activeWorkspaceId, currentUser?.workspace?.id, loadOrganization]);

  useEffect(() => {
    setDepartmentAccessState(resolveDepartmentManagementState(currentUser, workspaceOrganizationDepartments));
  }, [
    currentUser,
    workspaceOrganizationDepartments,
  ]);

  useEffect(() => {
    if (!(currentUser?.id || currentUser?._id)) return;
    const refresh = () => {
      void loadOrganization(selectedDepartment?.id || null, false);
    };
    const intervalId = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [currentUser?.id, currentUser?._id, selectedDepartment?.id, loadOrganization]);

  // --- LOGIC ---
  const normalizeRoleValue = (role) => (role || '').toString().trim().toLowerCase().replace(/_/g, '-');
  const normalizeAccessKey = (value = '') => String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  const currentUserRole = (currentUser?.workspaceMembership?.role || currentUser?.role || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  const currentUserId = (currentUser?.id || currentUser?._id || '').toString();
  const isFounderRole = currentUserRole === 'owner' || currentUserRole === 'founder';
  const isFounderFromTeamRecord = teamMembers.some((member) => {
    const memberUserId = (member.userId || member.id || member._id || '').toString();
    if (!memberUserId || !currentUserId || memberUserId !== currentUserId) {
      return false;
    }
    const memberRole = normalizeRoleValue(member.role);
    return memberRole === 'owner' || memberRole === 'founder';
  });
  const canInviteSuperAdmin = isFounderRole || isFounderFromTeamRecord;
  const canManageDepartments = isFounderRole || isFounderFromTeamRecord;
  const canManageActingAssignments = canManageDepartments || currentUserRole === 'super-admin';
  const canRemoveInvitedMemberByAccess = isFounderRole || isFounderFromTeamRecord || currentUserRole === 'super-admin';
  const currentMemberGrantedKeys = new Set(
    (Array.isArray(currentMemberGrantedModuleIds) ? currentMemberGrantedModuleIds : [])
      .map((item) => normalizeAccessKey(String(item || '')))
      .filter(Boolean),
  );
  const workspaceEnabledKeys = new Set(
    (Array.isArray(workspaceEnabledModuleIds) ? workspaceEnabledModuleIds : [])
      .map((item) => normalizeAccessKey(String(item || '')))
      .filter(Boolean),
  );
  const hasAnyOrgWorkspaceKey = Array.from(workspaceEnabledKeys).some((key) => key.startsWith('org-'));
  const hasAnyOrgGrantedKey = Array.from(currentMemberGrantedKeys).some((key) => key.startsWith('org-'));
  const hasOrgModuleAccess =
    workspaceEnabledKeys.has('organization-management') || hasAnyOrgWorkspaceKey || hasAnyOrgGrantedKey;
  const hasUsersTabGrant =
    currentMemberGrantedKeys.has('org-tab-users') ||
    currentMemberGrantedKeys.has('org-users-invite-member');
  const hasDepartmentsTabGrant =
    currentMemberGrantedKeys.has('org-tab-departments') ||
    currentMemberGrantedKeys.has('org-departments-create') ||
    currentMemberGrantedKeys.has('org-departments-edit') ||
    currentMemberGrantedKeys.has('org-departments-assign-manager') ||
    currentMemberGrantedKeys.has('org-departments-assign-acting-manager') ||
    currentMemberGrantedKeys.has('org-departments-remove-acting-manager');
  const hasAnyExplicitOrgTabGrant = hasUsersTabGrant || hasDepartmentsTabGrant;
  const canAccessUsersTab =
    hasOrgModuleAccess &&
    (hasUsersTabGrant || !hasAnyExplicitOrgTabGrant);
  const canAccessDepartmentsTab =
    hasOrgModuleAccess && hasDepartmentsTabGrant;
  const canInviteUsersByAccess =
    hasOrgModuleAccess && currentMemberGrantedKeys.has('org-users-invite-member');
  const canChangeRoleByAccess = isFounderRole || isFounderFromTeamRecord || currentUserRole === 'super-admin';
  const canToggleAccessByAccess =
    hasOrgModuleAccess && currentMemberGrantedKeys.has('org-users-toggle-access');
  const canCreateDepartmentByAccess =
    hasOrgModuleAccess && currentMemberGrantedKeys.has('org-departments-create');
  const canEditDepartmentByAccess =
    hasOrgModuleAccess && currentMemberGrantedKeys.has('org-departments-edit');
  const canAssignManagerByAccess =
    hasOrgModuleAccess && currentMemberGrantedKeys.has('org-departments-assign-manager');
  const canAssignActingManagerByAccess =
    hasOrgModuleAccess && currentMemberGrantedKeys.has('org-departments-assign-acting-manager');
  const canRemoveActingManagerByAccess =
    hasOrgModuleAccess && currentMemberGrantedKeys.has('org-departments-remove-acting-manager');
  const isBasicPlanWorkspace = workspacePlan === 'basic';
  // Mirrors the backend cap in organizationControllers.ts (isBasicPlan block):
  // Basic plan allows the founder to add exactly one additional user, who must
  // be Super Admin. Count active (non-disabled) Super Admins the same way the
  // backend counts WorkspaceMember.isActive super_admin members.
  const activeSuperAdminCount = teamMembers.filter((member) => {
    const memberRole = normalizeRoleValue(member.role);
    const memberStatus = (member.status || '').toLowerCase();
    return memberRole === 'super-admin' && memberStatus !== 'disabled';
  }).length;
  const basicPlanAdditionalUserLimit = 1;
  const basicPlanLimitReached = isBasicPlanWorkspace && activeSuperAdminCount >= basicPlanAdditionalUserLimit;

  const isProfessionalPlanWorkspace = workspacePlan === 'professional';
  // Mirrors PROFESSIONAL_PLAN_MAX_USERS in organizationControllers.ts - total
  // active members (including the founder) capped at 5 on Professional.
  const professionalPlanMaxUsers = 5;
  const activeMemberCount = teamMembers.filter(
    (member) => (member.status || '').toLowerCase() !== 'disabled',
  ).length;
  const disabledMemberCount = teamMembers.filter(
    (member) => (member.status || '').toLowerCase() === 'disabled',
  ).length;
  const professionalPlanLimitReached =
    isProfessionalPlanWorkspace && activeMemberCount >= professionalPlanMaxUsers;
  const isCustomPlanWorkspace = workspacePlan === 'custom';
  const canManageCustomDepartment =
    (isProfessionalPlanWorkspace || isCustomPlanWorkspace) && canManageDepartments && canCreateDepartmentByAccess;
  const customWorkspaceDepartment = departments.find((department) =>
    isCustomDepartmentOption(department) && !String(department.id || department._id || '').startsWith('virtual-'),
  ) || null;
  const canCreateCustomDepartment = canManageCustomDepartment && !customWorkspaceDepartment;
  const isEditingCustomDepartment = Boolean(newDepartmentForm.departmentId);
  // Department availability (Basic: none, Founder/Super Admin only; Professional:
  // Sales + Technology plus workspace-created departments; Custom: full catalog) lives in workspacePlanAccess.ts
  // (isDepartmentAllowedForPlan, imported above) so every department dropdown in
  // the app agrees on what's selectable for a given plan.

  const canAddUserOnCurrentPlan = isBasicPlanWorkspace
    ? isFounderRole && !basicPlanLimitReached
    : canAccessUsersTab && canInviteUsersByAccess;
  const normalizedTeamMemberRole = String(teamMemberFormData.role || '').trim().toLowerCase();
  const isSingleDepartmentTeamMemberRole = SINGLE_DEPARTMENT_TEAM_MEMBER_ROLES.has(normalizedTeamMemberRole);
  const inviteDepartmentOptions = departments.filter((dept) => isDepartmentAllowedForPlan(workspacePlan, dept.name));
  const enabledDepartmentCount = inviteDepartmentOptions.length;
  const normalizedEmployeeEmail = String(employeeFormData.email || '').trim().toLowerCase();
  const isEmployeeEmailAlreadyUsed = Boolean(normalizedEmployeeEmail) && teamMembers.some(
    (member) => String(member.email || '').trim().toLowerCase() === normalizedEmployeeEmail,
  );
  const isEmployeeEmailValid = isValidWorkEmail(normalizedEmployeeEmail);
  const normalizedTeamMemberEmail = String(teamMemberFormData.email || '').trim().toLowerCase();
  const isTeamMemberEmailValid = isValidWorkEmail(normalizedTeamMemberEmail);
  const isTeamMemberEmailAlreadyUsed = Boolean(normalizedTeamMemberEmail) && teamMembers.some(
    (member) => String(member.email || '').trim().toLowerCase() === normalizedTeamMemberEmail,
  );
  const addUserHoverMessage = isBasicPlanWorkspace
    ? !isFounderRole
      ? 'Only the founder can add users on the Basic plan.'
      : basicPlanLimitReached
        ? `Basic plan limit reached - ${activeSuperAdminCount}/${basicPlanAdditionalUserLimit} additional user added.`
        : `Add your one allowed Super Admin (${activeSuperAdminCount}/${basicPlanAdditionalUserLimit} used)`
    : isProfessionalPlanWorkspace
      ? professionalPlanLimitReached
        ? `No more users can be added. Disable one user to add another.`
        : `Add a user (${activeMemberCount}/${professionalPlanMaxUsers} used)`
      : canAddUserOnCurrentPlan
        ? 'Invite and onboard instantly'
        : 'You do not have access to invite users';
  const workspaceCount = getWorkspaceCount(
    (currentUser as { workspaceCount?: number } | null)?.workspaceCount,
  );
  const hasTransferredRecords =
    transferredTeamMembers.length > 0 ||
    departments.some(
      (department) =>
        Array.isArray((department as DepartmentOption)?.transferredEmployees) &&
        ((department as DepartmentOption).transferredEmployees?.length || 0) > 0,
    );
  const shouldShowTransferredReferences =
    canManageDepartments && workspaceCount > 1 && hasTransferredRecords;
  const workspaceModuleOptions = useMemo(() =>
    Array.from(
      new Map(
        availableCoreModules
          .filter((module) => module.id && module.name)
          .map((module) => [module.id, module] as const),
      ).values(),
    ),
  [availableCoreModules]);
  const workspaceModuleGroups = useMemo(() => {
    const groups = new Map<string, CoreModuleOption[]>();
    workspaceModuleOptions.forEach((module) => {
      const groupName = module.group || 'Available Modules';
      groups.set(groupName, [...(groups.get(groupName) || []), module]);
    });
    return Array.from(groups.entries());
  }, [workspaceModuleOptions]);
  const getDepartmentModuleLabels = (department: DepartmentOption) =>
    (Array.isArray(department?.moduleIds) ? department.moduleIds : []).map((moduleId) =>
      workspaceModuleOptions.find((module) => module.id === moduleId)?.name || formatModuleLabel(moduleId),
    );
  const selectedDepartmentManager = selectedDepartment?.employees?.find((member) => {
    const memberUserId = String(member.userId || member.id || '').trim();
    const managerUserId = String(selectedDepartment.managerUserId || selectedDepartment.managerId || '').trim();
    return (managerUserId && memberUserId === managerUserId) || normalizeRoleValue(member.role) === 'manager';
  });
  const selectedDepartmentMembers = (selectedDepartment?.employees || []).filter((member) => {
    const role = normalizeRoleValue(member.role);
    return role === 'manager' || role === 'employee' || role === 'admin' || role === 'admin-manager';
  });

  const formatJoinedDate = (value) => {
    if (!value) {
      return '-';
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return '-';
    }

    return parsedDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  useEffect(() => {
    if (!canAccessDepartmentsTab && activeTab === 'departments') {
      setActiveTab('users');
      setView('list');
    }
  }, [activeTab, canAccessDepartmentsTab]);

  const filteredTeamMembers = useMemo(() => {
    const normalizedSearch = searchQuery.toLowerCase().trim();

    return teamMembers.filter((member) => {
      const memberName = (member.name || '').toLowerCase();
      const memberEmployeeId = (member.employeeId || '').toLowerCase();
      const memberRole = normalizeRoleValue(member.role);
      const memberStatus = (member.status || '').toLowerCase();
      const memberDepartments = Array.isArray(member.departmentNames) ? member.departmentNames : [];
      const matchesSearch =
        !normalizedSearch ||
        memberName.includes(normalizedSearch) ||
        memberEmployeeId.includes(normalizedSearch) ||
        memberRole.includes(normalizedSearch) ||
        memberStatus.includes(normalizedSearch);

      const matchesStatus = statusFilter === 'all' || memberStatus === statusFilter;

      let matchesRole = true;
      let matchesDepartment = true;

      if (deptRoleFilter === 'all') {
        // both true by default
      } else if (deptRoleFilter.startsWith('dept:')) {
        const deptId = deptRoleFilter.replace('dept:', '');
        matchesDepartment = memberDepartments.some(
          (department) =>
            department.toLowerCase() ===
            (departments.find((d) => d.id === deptId)?.name || '').toLowerCase(),
        );
      } else if (deptRoleFilter.startsWith('role:')) {
        const role = deptRoleFilter.replace('role:', '');
        matchesRole = memberRole === role;
      }

      return matchesSearch && matchesStatus && matchesRole && matchesDepartment;
    });
  }, [teamMembers, searchQuery, statusFilter, deptRoleFilter, departments]);

  const filteredTransferredTeamMembers = useMemo(() => {
    const normalizedSearch = searchQuery.toLowerCase().trim();

    return transferredTeamMembers.filter((member) => {
      const memberName = (member.name || '').toLowerCase();
      const memberEmployeeId = (member.employeeId || '').toLowerCase();
      const memberRole = normalizeRoleValue(member.role);
      const memberDepartments = Array.isArray(member.departmentNames) ? member.departmentNames : [];
      const memberDestination = `${member.transferredToWorkspaceName || ''} ${member.transferredToWorkspaceLocation || ''}`.toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        memberName.includes(normalizedSearch) ||
        memberEmployeeId.includes(normalizedSearch) ||
        memberRole.includes(normalizedSearch) ||
        memberDestination.includes(normalizedSearch);

      let matchesDepartment = true;

      if (deptRoleFilter === 'all') {
        // show all
      } else if (deptRoleFilter.startsWith('dept:')) {
        const deptId = deptRoleFilter.replace('dept:', '');
        matchesDepartment = memberDepartments.some(
          (department) =>
            department.toLowerCase() ===
            (departments.find((d) => d.id === deptId)?.name || '').toLowerCase(),
        );
      }
      // role filter - show all transferred (no role filtering on transferred table)

      return matchesSearch && matchesDepartment;
    });
  }, [transferredTeamMembers, searchQuery, deptRoleFilter, departments]);

  const formatTransferDate = (value) => {
    if (!value) {
      return 'Transferred recently';
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return 'Transferred recently';
    }

    return parsedDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleSaveDepartment = async () => {
    if (isSavingDepartments) {
      return;
    }

    setIsSavingDepartments(true);

    try {
      const workspaceDepartments = Array.isArray(workspaceOrganizationDepartments)
        ? workspaceOrganizationDepartments
        : [];

      for (const department of OWNER_DEPARTMENT_CATALOG) {
        const existingDepartment = workspaceDepartments.find((candidate: any) =>
          getDepartmentDefinition((candidate as any)?.name || '')?.key === department.key,
        );

        await saveOrganizationDepartment(axiosPrivate, {
          departmentId: (existingDepartment as unknown as DepartmentOption)?._id || (existingDepartment as unknown as DepartmentOption)?.id || '',
          name: department.label,
          description: department.summary,
          isActive: isDepartmentEnabledInState(departmentAccessState, department.key),
        });
      }

      const persistedAccessState = writeStoredOwnerAccessState(currentUser, departmentAccessState);
      saveUserOwnerAccessSettings(currentUser, persistedAccessState);
      toast.success('Department settings saved.');

      setShowDepartmentModal(false);
      setExpandedDepartmentKey('');

      const selectedDepartmentId = selectedDepartment
        ? (selectedDepartment as DepartmentOption)._id || (selectedDepartment as DepartmentOption).id || null
        : null;

      await loadOrganization(selectedDepartmentId);
    } catch (error) {
      console.error('Failed to save department settings', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save department settings.');
    } finally {
      setIsSavingDepartments(false);
    }
  };

  const openDepartmentModal = (department: DepartmentOption | null = null) => {
    if (department && isCustomDepartmentOption(department)) {
      setNewDepartmentForm({
        departmentId: String(department.id || department._id || '').trim(),
        name: String(department.name || ''),
        description: String(department.description || ''),
        moduleIds: Array.isArray(department.moduleIds) ? [...department.moduleIds] : [],
      });
      setExpandedDepartmentKey(department.name || '');
    } else {
      setNewDepartmentForm({ departmentId: '', name: '', description: '', moduleIds: [] });
      setExpandedDepartmentKey('');
    }
    setShowDepartmentModal(true);
  };

  const handleAddEmployee = async () => {
    if (isAddingEmployee) return;
    if (!selectedDepartment || !employeeFormData.name.trim() || !normalizedEmployeeEmail) return;
    if (!isEmployeeEmailValid) {
      toast.error('Enter a valid work email address.');
      return;
    }
    if (isEmployeeEmailAlreadyUsed) {
      toast.error('Email already used. Try using a different email.');
      return;
    }

    setIsAddingEmployee(true);
    try {
      await inviteOrganizationMember(axiosPrivate, {
        fullName: employeeFormData.name.trim(),
        email: normalizedEmployeeEmail,
        role: 'employee',
        departments: [selectedDepartment.id || ''],
      });
      await loadOrganization(selectedDepartment.id || '');
      setEmployeeFormData({ name: '', email: '' });
      setShowEmployeeModal(false);
      toast.success(`Invite sent to ${employeeFormData.name.trim()}.`);
    } catch (error) {
      console.error("Failed to add employee", error);
      toast.error((error as any)?.response?.data?.message || 'Failed to send invite. Please try again.');
    } finally {
      setIsAddingEmployee(false);
    }
  };

  const openInviteForDepartment = (department: DepartmentOption, role: 'manager' | 'employee' = 'manager') => {
    const departmentId = String(department.id || department._id || '').trim();
    if (!departmentId) return;
    setSelectedDepartment(department);
    setTeamMemberFormData({ name: '', email: '', role, departments: [departmentId] });
    setCreatedDepartmentNotice(null);
    setShowTeamMemberModal(true);
  };

  const handleOpenTeamMemberModal = () => {
    if (isProfessionalPlanWorkspace && professionalPlanLimitReached) {
      toast.error('No more users can be added. Disable one user to add another.');
      return;
    }

    setActiveTab('users');
    setTeamMemberFormData({
      name: '',
      email: '',
      role: isBasicPlanWorkspace ? 'super-admin' : 'manager',
      departments: [],
    });
    setShowTeamMemberModal(true);
  };
  const handleSendInvite = async () => {
    if (isSendingInvite) return;
    if (isProfessionalPlanWorkspace && professionalPlanLimitReached) {
      toast.error('No more users can be added. Disable one user to add another.');
      return;
    }
    if (teamMemberFormData.name && teamMemberFormData.email) {
      const normalizedRole =
        teamMemberFormData.role === 'super-admin'
          ? 'super_admin'
          : teamMemberFormData.role === 'admin-manager'
            ? 'admin_manager'
            : teamMemberFormData.role;
      if (!isTeamMemberEmailValid) {
        toast.error('Enter a valid work email address.');
        return;
      }


      if (isTeamMemberEmailAlreadyUsed) {
        toast.error('Email already used. Try using a different email.');
        return;
      }

      if (normalizedTeamMemberRole !== 'super-admin') {
        if (normalizedTeamMemberRole === 'admin' && teamMemberFormData.departments.length === 0) {
          toast.error('Select at least one department for admin.');
          return;
        }

        if (isSingleDepartmentTeamMemberRole && teamMemberFormData.departments.length !== 1) {
          toast.error(
            normalizedTeamMemberRole === 'manager'
              ? 'Manager must have exactly one department.'
              : 'Employee must have exactly one department.',
          );
          return;
        }

        if (normalizedTeamMemberRole === 'manager') {
          const selectedManagerDepartment = departments.find(
            (department) => String(department.id || '') === String(teamMemberFormData.departments[0] || ''),
          );
          const hasExistingManager = Boolean(
            String(selectedManagerDepartment?.managerUserId || selectedManagerDepartment?.managerId || '').trim(),
          ) || Boolean(
            selectedManagerDepartment?.employees?.some((member) => {
              const memberRole = normalizeRoleValue(member.role);
              const memberStatus = String(member.status || '').toLowerCase();
              return memberRole === 'manager' && memberStatus !== 'disabled';
            }),
          );

          if (hasExistingManager) {
            toast.error('This department already has a manager assigned.');
            return;
          }
        }
      }

      setIsSendingInvite(true);
      try {
        await inviteOrganizationMember(axiosPrivate, {
          fullName: teamMemberFormData.name,
          email: teamMemberFormData.email,
          role: normalizedRole,
          departments: teamMemberFormData.departments,
        });
        await loadOrganization();
        toast.success(`Invitation sent to ${teamMemberFormData.email}.`);
        setShowTeamMemberModal(false);
        setTeamMemberFormData({ name: '', email: '', role: 'manager', departments: [] });
      } catch (error) {
        console.error("Failed to send invite", error);
        const inviteErrorMessage = (error as any)?.response?.data?.message;
        toast.error(inviteErrorMessage || 'Failed to send invite. Please try again.');
      } finally {
        setIsSendingInvite(false);
      }
    }
  };

  const toggleMemberStatus = async (id, nextEnabled?: boolean) => {
    if (!canToggleAccessByAccess) {
      toast.error('You do not have access to toggle user status.');
      return;
    }
    if (nextEnabled && isProfessionalPlanWorkspace && professionalPlanLimitReached) {
      toast.error('Only 5 users can be enabled at a time. Disable one user to enable another.');
      return;
    }
    setAccessTogglePendingMemberId(id);
    try {
      await toggleOrganizationMemberStatus(axiosPrivate, id);
      toast.success(nextEnabled ? 'Access enabled' : 'Access disabled');
      await loadOrganization(selectedDepartment?.id || null);
    } catch (error) {
      console.error("Failed to update member status", error);
      const accessErrorMessage = (error as any)?.response?.data?.message;
      toast.error(accessErrorMessage || 'Failed to update access.');
    } finally {
      setAccessTogglePendingMemberId('');
    }
  };

  const requestCancelInvite = (member: TeamMember) => {
    if (!canRemoveInvitedMemberByAccess) {
      toast.error('Only the founder or a super admin can remove invited members.');
      return;
    }
    setInviteToRemove(member);
  };

  const handleCancelInvite = async (id: string) => {
    setCancelInvitePendingMemberId(id);
    try {
      await cancelOrganizationInvite(axiosPrivate, id);
      toast.success('Invite removed. This email can be invited again.');
      setInviteToRemove(null);
      await loadOrganization(selectedDepartment?.id || null);
    } catch (error) {
      console.error("Failed to cancel invite", error);
      const cancelInviteErrorMessage = (error as any)?.response?.data?.message;
      toast.error(cancelInviteErrorMessage || 'Failed to remove invited member.');
    } finally {
      setCancelInvitePendingMemberId('');
    }
  };

  const openRoleChangeModal = (member: TeamMember) => {
    if (!canChangeRoleByAccess) {
      toast.error('Only the founder or a super admin can change roles.');
      return;
    }
    if (isBasicPlanWorkspace) {
      toast.error("Role changes aren't needed on the Basic plan.");
      return;
    }
    const normalizedCurrentRole = normalizeRoleValue(member.role);
    if (normalizedCurrentRole === 'owner' || normalizedCurrentRole === 'founder') {
      toast.error("Transfer ownership instead to change the founder's role.");
      return;
    }

    const departmentIds = (Array.isArray(member.departmentNames) ? member.departmentNames : [])
      .map((departmentName) =>
        departments.find(
          (department) =>
            String(department?.name || '').trim().toLowerCase() ===
            String(departmentName || '').trim().toLowerCase(),
        )?.id,
      )
      .filter((id): id is string => Boolean(id));

    setRoleChangeForm({
      role: SINGLE_DEPARTMENT_TEAM_MEMBER_ROLES.has(normalizedCurrentRole) || normalizedCurrentRole === 'admin'
        ? normalizedCurrentRole
        : normalizedCurrentRole === 'super-admin'
          ? 'super-admin'
          : 'employee',
      departments: departmentIds,
    });
    setRoleChangeTarget(member);
  };

  const submitRoleChange = async () => {
    if (!roleChangeTarget) return;
    const memberId = String(roleChangeTarget.id || '').trim();
    if (!memberId) return;

    const nextRole = roleChangeForm.role;
    const nextDepartments = roleChangeForm.departments;

    if (nextRole === 'admin' && nextDepartments.length === 0) {
      toast.error('Select at least one department for this role.');
      return;
    }
    if ((nextRole === 'manager' || nextRole === 'employee') && nextDepartments.length !== 1) {
      toast.error(
        nextRole === 'manager'
          ? 'Manager role requires exactly one department.'
          : 'Employee role requires exactly one department.',
      );
      return;
    }

    setIsSavingRoleChange(true);
    try {
      await updateOrganizationMemberRole(axiosPrivate, memberId, {
        role: nextRole,
        departments: nextRole === 'super-admin' ? [] : nextDepartments,
      });
      toast.success('Member role updated.');
      setRoleChangeTarget(null);
      await loadOrganization(selectedDepartment?.id || null);
    } catch (error) {
      console.error('Failed to update role', error);
      toast.error((error as any)?.response?.data?.message || 'Failed to update role.');
    } finally {
      setIsSavingRoleChange(false);
    }
  };

  const handleDepartmentToggle = (deptId) => {
    if (teamMemberFormData.departments.includes(deptId)) {
      setTeamMemberFormData({ ...teamMemberFormData, departments: teamMemberFormData.departments.filter((d) => d !== deptId) });
    } else {
      setTeamMemberFormData({ ...teamMemberFormData, departments: [...teamMemberFormData.departments, deptId] });
    }
  };

  const handleAssignManagerToDepartment = (managerId, managerName) => {
    if (!canAssignManagerByAccess) {
      toast.error('You do not have access to assign department manager.');
      return;
    }
    if (selectedDepartment) {
      assignOrganizationDepartmentManager(axiosPrivate, selectedDepartment.id || '', managerId)
        .then(() => loadOrganization(selectedDepartment.id || ''))
        .then(() => {
          setShowAssignManagerModal(false);
        })
        .catch((error) => {
          console.error("Failed to assign manager", error);
        });
    }
  };

  const handleAssignActingManager = (member) => {
    if (!canAssignActingManagerByAccess) {
      toast.error('You do not have access to assign acting manager.');
      return;
    }
    if (!selectedDepartment) {
      return;
    }

    const departmentId = selectedDepartment.id || '';
    if (!departmentId) {
      return;
    }

    assignOrganizationActingManager(axiosPrivate, departmentId, {
      assignedUserId: member.userId || member.id,
    })
      .then(() => loadOrganization(departmentId))
      .catch((error) => {
        console.error("Failed to assign acting manager", error);
      });
  };

  const handleRemoveActingManager = (assignedUserId) => {
    if (!canRemoveActingManagerByAccess) {
      toast.error('You do not have access to remove acting manager.');
      return;
    }
    if (!selectedDepartment) {
      return;
    }

    const departmentId = selectedDepartment.id || '';
    if (!departmentId) {
      return;
    }

    removeOrganizationActingManager(axiosPrivate, departmentId, assignedUserId)
      .then(() => loadOrganization(departmentId))
      .catch((error) => {
        console.error("Failed to remove acting manager", error);
      });
  };

  const actingManagerCandidates = useMemo(() => {
    return teamMembers.filter((member) => {
      const normalizedRole = normalizeRoleValue(member.role);
      const isEligibleRole =
        isFounderRole
          ? normalizedRole === 'admin' || normalizedRole === 'super-admin'
          : normalizedRole === 'admin';

      const normalizedStatus = (member.status || '').toLowerCase();
      const isEligibleStatus = normalizedStatus !== 'disabled' && normalizedStatus !== 'invited' && normalizedStatus !== 'pending';

      return isEligibleRole && isEligibleStatus;
    });
  }, [teamMembers, isFounderRole]);

  // --- UI HELPERS ---
  const getRoleIcon = (role) => {
    switch (normalizeRoleValue(role)) {
      case 'super-admin': return Shield;
      case 'admin-manager': return Shield;
      case 'admin': return Users;
      case 'manager': return Briefcase;
      default: return Users;
    }
  };

  const getRoleBadge = (role) => {
    switch (normalizeRoleValue(role)) {
      case 'owner': return <span className={statusPillClass("Founder")}>Founder</span>;
      case 'super-admin': return <span className={statusPillClass("Super Admin")}>Super Admin</span>;
      case 'admin-manager': return <span className={statusPillClass("Admin Manager")}>Admin Manager</span>;
      case 'admin': return <span className={statusPillClass("Admin")}>Admin</span>;
      case 'manager': return <span className={statusPillClass("Manager")}>Manager</span>;
      case 'employee': return <span className={statusPillClass("Employee")}>Employee</span>;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'joined':
        return <span className={statusPillClass("Joined")}>Joined</span>;
      case 'accepted':
        return <span className={statusPillClass("Accepted")}>Accepted</span>;
      case 'registered':
        return <span className={statusPillClass("Registered")}>Registered</span>;
      case 'pending':
        return <span className={statusPillClass("Pending")}>Pending</span>;
      case 'invited':
        return <span className={statusPillClass("Invited")}>Invited</span>;
      case 'disabled':
        return <span className={statusPillClass("Disabled")}>Disabled</span>;
      default:
        return <span className={statusPillClass(status || 'Unknown')}>{status || 'Unknown'}</span>;
    }
  };

  const handleCreateDepartmentForFounder = async () => {
    if (isCreatingDepartment) return;
    if (!canManageCustomDepartment) {
      toast.error('Custom departments are available to the founder on Professional and Custom plans.');
      return;
    }

    const editingDepartmentId = String(newDepartmentForm.departmentId || '').trim();
    if (!editingDepartmentId && customWorkspaceDepartment) {
      toast.error('Only one custom department can be created. Edit the existing custom department instead.');
      return;
    }

    const departmentName = newDepartmentForm.name.trim();
    const description = newDepartmentForm.description.trim();
    if (departmentName.length < 2) {
      toast.error('Department name must contain at least 2 characters.');
      return;
    }
    if (departmentName.length > 80) {
      toast.error('Department name cannot exceed 80 characters.');
      return;
    }
    if (description.length > 240) {
      toast.error('Department description cannot exceed 240 characters.');
      return;
    }
    if (departments.some((department) => {
      const departmentId = String(department.id || department._id || '').trim();
      return departmentId !== editingDepartmentId &&
        String(department.name || '').trim().toLowerCase() === departmentName.toLowerCase();
    })) {
      toast.error('A department with this name already exists.');
      return;
    }
    if (newDepartmentForm.moduleIds.length === 0) {
      toast.error('Select at least one core module.');
      return;
    }

    setIsCreatingDepartment(true);
    try {
      const response = await saveOrganizationDepartment(axiosPrivate, {
        departmentId: editingDepartmentId || undefined,
        name: departmentName,
        description,
        moduleIds: newDepartmentForm.moduleIds,
        isActive: true,
      });
      const savedDepartment = response?.data?.data?.department || {};
      const savedDepartmentId = String(savedDepartment.id || editingDepartmentId).trim();
      await loadOrganization(savedDepartmentId || null);
      setShowDepartmentModal(false);
      setNewDepartmentForm({ departmentId: '', name: '', description: '', moduleIds: [] });

      if (editingDepartmentId) {
        setCreatedDepartmentNotice(null);
        toast.success('Custom department and module access updated.');
      } else {
        setCreatedDepartmentNotice({ id: savedDepartmentId, name: departmentName });
        toast.success('Department created. Add a manager or employee from Add User.');
      }
    } catch (error) {
      console.error('Failed to save custom department', error);
      toast.error((error as any)?.response?.data?.message || 'Failed to save custom department.');
    } finally {
      setIsCreatingDepartment(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  if (isLoading) {
    return <OrganizationSkeleton />;
  }

  return (
    <>
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4 text-slate-700 font-sans">

        {/* 1. HEADER */}
        <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">Organization Management</h2>
            <p className="text-xs font-pmedium text-slate-500 mt-1">Manage platform users and organization access.</p>
          </div>
        </div>

        {/* 2. MAIN TABS (pill-style matching DESIGN.md) */}
        <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
          <button data-tour="organization-users-tab" onClick={() => setActiveTab('users')} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
            <Shield size={16} className="inline mr-1"/> PLATFORM USERS
          </button>
          <button
            title={!canAccessDepartmentsTab ? 'You do not have access to departments.' : ''}
            disabled={!canAccessDepartmentsTab}
            onClick={() => { setActiveTab('departments'); setView('list'); }}
            className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
              !canAccessDepartmentsTab
                ? 'text-slate-300 cursor-not-allowed'
                : activeTab === 'departments'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}>
            <Building2 size={16} className="inline mr-1"/> DEPARTMENTS {!canAccessDepartmentsTab ? <Lock size={12} className="inline" /> : null}
          </button>
        </div>

        {/* 3. STAT CARDS (DESIGN.md 4-col grid with border-left accents) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
          <div className="min-w-0">
            <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Total Platform Users</p>
            <p className="text-[15px] font-pmedium text-slate-900">{teamMembers.length}</p>
          </div>
          <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><Shield size={16}/></div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
          <div className="min-w-0">
            <p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-widest mb-1">Enabled Users</p>
            <p className="text-[15px] font-pmedium text-slate-900">{activeMemberCount}</p>
          </div>
          <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><UserCheck size={16}/></div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-rose-500">
          <div className="min-w-0">
            <p className="text-[10px] font-pmedium text-rose-600 uppercase tracking-widest mb-1">Disabled Users</p>
            <p className="text-[15px] font-pmedium text-slate-900">{disabledMemberCount}</p>
          </div>
          <div className="p-2 rounded-2xl bg-rose-50 text-rose-600 shrink-0"><UserX size={16}/></div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
          <div className="min-w-0">
            <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Total Depts</p>
            <p className={`text-[15px] font-pmedium ${canAccessDepartmentsTab ? 'text-slate-900' : 'text-slate-300'}`}>
              {canAccessDepartmentsTab ? enabledDepartmentCount : '--'}
            </p>
          </div>
          <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><Building2 size={16}/></div>
        </div>
      </div>

      

      {/* ========================================== */}
      {/* TAB 1: PLATFORM USERS (DEFAULT)            */}
      {/* ========================================== */}
      {activeTab === 'users' && (
        <>
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          {/* HEADER: status sub-tabs on left, search + filters + actions on right */}
          <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
            <div data-tour="organization-status-filters" className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {['all', 'invited', 'registered', 'pending', 'joined', 'disabled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${
                    statusFilter === status
                      ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                      : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
              <div data-tour="organization-search" className="relative min-w-[180px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text" placeholder="Search platform users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <div className="relative w-min">
                  <select
                    value={deptRoleFilter}
                    onChange={(e) => setDeptRoleFilter(e.target.value)}
                    className="pl-1 pr-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[9px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none"
                  >
                    <option value="all">All</option>
                    <option disabled className="text-slate-300">-- DEPARTMENTS --</option>
                    {departments.filter((department) => isDepartmentAllowedForPlan(workspacePlan, department.name)).map((department) => (
                      <option key={department.id} value={`dept:${department.id}`}>
                        {normalizeDepartmentLabel(department.name)}
                      </option>
                    ))}
                    <option disabled className="text-slate-300">--- ROLES ---</option>
                    <option value="role:owner">Founder</option>
                    <option value="role:super-admin">Super Admin</option>
                    <option value="role:admin">Admin</option>
                    <option value="role:manager">Manager</option>
                    <option value="role:employee">Employee</option>
                  </select>
                  <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-[#2563EB] pointer-events-none" />
                </div>
                {isBasicPlanWorkspace && (
                  <p data-tour="organization-basic-user-limit" className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    {activeSuperAdminCount}/{basicPlanAdditionalUserLimit} additional user added
                  </p>
                )}
                {isProfessionalPlanWorkspace && (
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    {activeMemberCount}/{professionalPlanMaxUsers} active users
                  </p>
                )}
                <button
                  data-tour="organization-add-user"
                  title={addUserHoverMessage}
                  onClick={handleOpenTeamMemberModal}
                  disabled={!canAddUserOnCurrentPlan}
                  className={`bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap ${
                    !canAddUserOnCurrentPlan ? 'opacity-50 cursor-not-allowed' : ''
                  }`}>
                  <Plus size={13} strokeWidth={3} /> ADD USER
                </button>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto flex-1">
          <table data-tour="organization-members-table" className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
              <tr>
                <th className="px-5 py-4 text-left">Employee ID</th>
                <th className="px-5 py-4 text-left">Platform User</th>
                <th className="px-5 py-4 text-left">Email</th>
                <th className="px-5 py-4 text-left">Access Role</th>
                <th className="px-5 py-4 text-left">Department</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-left">Access</th>
                <th className="px-5 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
                {filteredTeamMembers.map((member) => {
                  const normalizedRole = normalizeRoleValue(member.role);
                  const normalizedDepartments = Array.isArray(member.departmentNames)
                    ? member.departmentNames.filter(Boolean)
                    : [];
                  // Super Admins automatically receive top-level access to ALL
                  // departments, so their row always reads "All Departments"
                  // exactly like the founder's, regardless of how many
                  // department assignments the API happens to return.
                  const hasAllDepartmentsAccess =
                    normalizedRole === 'owner' || normalizedRole === 'super-admin';
                  const departmentBadges = hasAllDepartmentsAccess
                    ? ['All Departments']
                    : normalizedDepartments;

                  return (
                  <tr key={member.id} className={`hover:bg-slate-50/50 transition-colors group ${normalizedRole === 'owner' ? 'bg-slate-50/50' : member.status === 'disabled' ? 'bg-slate-50/50 opacity-75' : ''}`}>
                    <td className="px-5 py-4">
                      <span className="font-pmedium text-slate-800 text-[12px]">{member.employeeId || '-'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-pmedium shadow-sm shrink-0 ${normalizedRole === 'owner' ? 'bg-[#111827] text-white' : 'bg-[#2563EB] text-white'}`}>
                          {getInitials(member.name)}
                        </div>
                        <span className="font-pmedium text-slate-800 text-[12px]">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[11px] font-pmedium text-slate-500">{member.email}</span>
                    </td>
                    <td className="px-5 py-4">{getRoleBadge(member.role)}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-56">
                        {departmentBadges.map((dept, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-pmedium tracking-wide">{normalizeDepartmentLabel(dept)}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {getStatusBadge(member.status)}
                    </td>
                    <td className="px-5 py-4">
                      {(() => {
                        const memberStatus = member.status ?? '';
                        const isOwner = member.role === 'owner';
                        const isSelf = member.userId && String(member.userId) === currentUserId;
                        const isProtectedSelf = isSelf && normalizeRoleValue(member.role) === 'super-admin';

                        if (memberStatus === 'invited' || memberStatus === 'invite_sent') {
                          return (
                            <span className={statusPillClass("Access Pending")}>Access Pending
                            </span>
                          );
                        }

                        if (memberStatus === 'pending') {
                          return (
                            <div className="flex flex-col items-start gap-1">
                              <label className="inline-flex items-center gap-2 cursor-not-allowed select-none">
                                <input type="checkbox" checked={false} disabled={true} className="sr-only peer" />
                                <span className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-amber-400 opacity-60">
                                  <span className="absolute left-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow translate-x-0" />
                                </span>
                              </label>
                              <span className="text-[10px] font-pmedium text-amber-600">Access Pending</span>
                            </div>
                          );
                        }

                        if (memberStatus === 'accepted' || memberStatus === 'registered') {
                          return (
                            <div className="flex flex-col items-start gap-1">
                              <label className="inline-flex items-center gap-2 cursor-not-allowed select-none">
                                <input type="checkbox" checked={true} disabled={true} className="sr-only peer" />
                                <span className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-blue-500 opacity-60">
                                  <span className="absolute left-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow translate-x-5" />
                                </span>
                              </label>
                              <span className="text-[10px] font-pmedium text-blue-600">Access Pending</span>
                            </div>
                          );
                        }

                        const isAccessEnabled = memberStatus === 'joined';
                        const canToggle =
                          canToggleAccessByAccess &&
                          !isProtectedSelf &&
                          !isOwner &&
                          ['joined', 'disabled'].includes(memberStatus);
                        const isToggleLocked = !canToggle;
                        const toggleColor = isToggleLocked
                          ? 'bg-slate-300'
                          : isAccessEnabled
                            ? 'bg-emerald-500'
                            : 'bg-rose-500';

                        if (isOwner) {
                          return <span className="text-[10px] font-pmedium text-slate-400">Founder</span>;
                        }

                        const isAccessSaving = accessTogglePendingMemberId === member.id;
                        return (
                          <div className="flex flex-col items-start gap-1">
                            <label className={`inline-flex items-center gap-2 ${isToggleLocked || isAccessSaving ? 'cursor-not-allowed' : 'cursor-pointer'} select-none`}>
                              <input
                                type="checkbox"
                                checked={isAccessEnabled}
                                disabled={isToggleLocked || isAccessSaving}
                                onChange={() => canToggle && !isAccessSaving && toggleMemberStatus(member.id, !isAccessEnabled)}
                                className="sr-only peer"
                              />
                              <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${toggleColor} ${isToggleLocked ? 'opacity-60' : ''} ${isAccessSaving ? 'opacity-80' : ''}`}>
                                <span className={`absolute left-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${isAccessEnabled ? 'translate-x-5' : 'translate-x-0'}`}>
                                  {isAccessSaving ? <Loader2 size={10} className="animate-spin text-slate-400" /> : null}
                                </span>
                              </span>
                            </label>
                            <span className={`text-[10px] font-pmedium ${isToggleLocked ? 'text-slate-500' : isAccessEnabled ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isProtectedSelf
                                ? 'Self Protected'
                                : isAccessEnabled
                                  ? 'Access On'
                                  : 'Access Off'}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          title="View Details"
                          onClick={() => setViewingMember(member)}
                          className="p-2 rounded-xl bg-white border border-slate-200/60 text-slate-400 hover:text-[#2563EB] hover:border-blue-200 hover:bg-blue-50 transition-all active:scale-95 shadow-sm"
                        >
                          <Eye size={15} />
                        </button>
                        {normalizeRoleValue(member.role) !== 'owner' && member.status !== 'disabled' && canChangeRoleByAccess ? (
                          <button
                            title={isBasicPlanWorkspace ? "Role changes aren't needed on the Basic plan" : "Change Role"}
                            disabled={isBasicPlanWorkspace}
                            onClick={() => openRoleChangeModal(member)}
                            className="p-2 rounded-xl bg-white border border-slate-200/60 text-slate-400 hover:text-[#2563EB] hover:border-blue-200 hover:bg-blue-50 transition-all active:scale-95 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:border-slate-200/60 disabled:hover:bg-white"
                          >
                            <ArrowUpDown size={15} />
                          </button>
                        ) : null}
                        {(member.status === 'invited' || member.status === 'invite_sent') && canRemoveInvitedMemberByAccess ? (
                          <button
                            title="Remove invited member"
                            disabled={cancelInvitePendingMemberId === member.id}
                            onClick={() => requestCancelInvite(member)}
                            className="p-2 rounded-xl bg-white border border-slate-200/60 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {cancelInvitePendingMemberId === member.id ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )})}
                {filteredTeamMembers.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-20 text-slate-400 font-pmedium"><Shield size={32} className="mx-auto mb-3 opacity-50"/>No platform users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {shouldShowTransferredReferences ? (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50/50">
            <div>
              <h3 className="text-[13px] font-pmedium text-slate-900">Transferred References</h3>
              <p className="text-xs font-pmedium text-slate-500 mt-0.5">
                These users are no longer counted in this workspace and are shown here only for record keeping.
              </p>
            </div>
            <span className={statusPillClass(filteredTransferredTeamMembers.length)}>
              {filteredTransferredTeamMembers.length} Recorded
            </span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                <tr>
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Previous Role</th>
                  <th className="px-5 py-4">Departments</th>
                  <th className="px-5 py-4">Transferred To</th>
                  <th className="px-5 py-4">Transfer Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {filteredTransferredTeamMembers.map((member) => (
                  <tr key={`transferred-${member.id}`} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-black font-pmedium text-sm shadow-sm bg-slate-400">
                          {member.name?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <div className="font-pmedium text-slate-900">{member.name}</div>
                          <div className="text-[12px] font-pmedium text-slate-500 mt-0.5">{member.email}</div>
                          {member.employeeId ? (
                            <div className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mt-1">
                              {member.employeeId}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(((member as TeamMember & { previousRole?: string }).previousRole) || member.role)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-62.5">
                        {((member as TeamMember & { previousDepartments?: string[] }).previousDepartments || member.departmentNames || []).map((dept, index) => (
                          <span key={`${member.id}-${dept}-${index}`} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-pmedium tracking-wide">
                            {normalizeDepartmentLabel(dept)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="font-pmedium text-slate-900">{member.transferredToWorkspaceName || 'Linked Unit'}</div>
                        <div className="text-[12px] font-pmedium text-slate-500">
                          {member.transferredToWorkspaceLocation || 'Location not set'}
                        </div>
                        {((member as TeamMember & { nextRole?: string }).nextRole) ? (
                          <div className="text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]">
                            Now {(member as TeamMember & { nextRole?: string }).nextRole!.replace(/_/g, ' ')}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-pmedium text-slate-500">
                      {formatTransferDate((member as TeamMember & { transferredAt?: string }).transferredAt)}
                    </td>
                  </tr>
                ))}
                {filteredTransferredTeamMembers.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-pmedium"><ArrowLeft size={32} className="mx-auto mb-3 opacity-30 rotate-45"/>No transferred users recorded for this unit.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        ) : null}
        </>
      )}

      {/* ========================================== */}
      {/* TAB 2: DEPARTMENTS & ROSTER                */}
      {/* ========================================== */}
      {activeTab === 'departments' && view === 'list' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
          <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">Departments</h2>
              <p className="mt-1 text-xs font-pmedium text-slate-500">
                {isProfessionalPlanWorkspace
                  ? 'Professional includes Sales and Technology, plus one editable custom department.'
                  : 'Review department leadership, team members, and the core modules assigned to each department.'}
              </p>
            </div>
            {canCreateDepartmentByAccess ? (
              <button
                type="button"
                title={customWorkspaceDepartment ? 'Edit the custom department and its modules' : canCreateCustomDepartment ? 'Create the one allowed custom department' : 'Department management is unavailable.'}
                disabled={!canManageCustomDepartment}
                onClick={() => openDepartmentModal(customWorkspaceDepartment)}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
              >
                {customWorkspaceDepartment ? <Wrench size={13} /> : <Plus size={13} strokeWidth={3} />}
                {customWorkspaceDepartment ? 'EDIT CUSTOM DEPARTMENT' : 'CREATE DEPARTMENT'}
              </button>
            ) : null}
          </div>

          {createdDepartmentNotice ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-[12px] font-pmedium text-emerald-900">{createdDepartmentNotice.name} was created successfully.</p>
                  <p className="mt-1 text-[11px] font-pmedium text-emerald-700">Use Add User to invite its one manager or add employees. The selected core modules are granted to its manager with the common modules.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const department = departments.find((item) => String(item.id || item._id || '') === createdDepartmentNotice.id)
                    || departments.find((item) => String(item.name || '').trim().toLowerCase() === createdDepartmentNotice.name.toLowerCase());
                  if (department) openInviteForDepartment(department, 'manager');
                }}
                className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-[10px] font-pmedium text-white transition-colors hover:bg-emerald-700"
              >
                ADD MANAGER
              </button>
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {inviteDepartmentOptions.map((dept) => {
              const isAllowedDepartment = isDepartmentAllowedForPlan(workspacePlan, dept.name);
              const departmentModuleLabels = getDepartmentModuleLabels(dept);
              return (
                <button
                  type="button"
                  key={dept.id || dept._id || dept.name}
                  disabled={!isAllowedDepartment}
                  title={!isAllowedDepartment ? `${normalizeDepartmentLabel(dept.name)} is available on the Custom plan.` : `Open ${normalizeDepartmentLabel(dept.name)}`}
                  onClick={() => { setSelectedDepartment(dept); setView('detail'); }}
                  className={`relative flex min-h-[230px] flex-col overflow-hidden rounded-[1.5rem] border bg-white text-left shadow-sm transition-all ${
                    isAllowedDepartment
                      ? 'cursor-pointer border-slate-100 hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md'
                      : 'cursor-not-allowed border-slate-200 bg-slate-50/80 opacity-65'
                  }`}
                >
                  <span className={`h-2 w-full ${isAllowedDepartment ? getDepartmentToneClass(dept) : 'bg-slate-300'}`} />
                  <span className="flex flex-1 flex-col p-4">
                    <span className="mb-3 flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-[15px] font-pmedium text-slate-900">{normalizeDepartmentLabel(dept.name)}</span>
                        <span className="mt-1 block text-[11px] font-pmedium leading-relaxed text-slate-500">{dept.description || 'Custom workspace department'}</span>
                      </span>
                      <span className={`rounded-lg px-2 py-1 text-[9px] font-pmedium uppercase tracking-wider ${isAllowedDepartment ? 'bg-blue-50 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                        {isAllowedDepartment ? 'Enabled' : <><Lock size={10} className="mr-1 inline" />Custom only</>}
                      </span>
                    </span>

                    <span className="mb-3 block rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                      <span className="block text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Core Modules</span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        {departmentModuleLabels.length > 0 ? departmentModuleLabels.slice(0, 3).map((moduleLabel) => (
                          <span key={`${dept.id}-${moduleLabel}`} className="rounded-md bg-white px-2 py-1 text-[9px] font-pmedium text-slate-600 shadow-sm">{moduleLabel}</span>
                        )) : <span className="text-[10px] font-pmedium text-slate-400">No core modules configured</span>}
                        {departmentModuleLabels.length > 3 ? <span className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-pmedium text-blue-700">+{departmentModuleLabels.length - 3}</span> : null}
                      </span>
                    </span>

                    <span className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                      <span>
                        <span className="block text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Manager</span>
                        <span className={`mt-1 block truncate text-[11px] font-pmedium ${dept.managerName ? 'text-emerald-700' : 'text-amber-600'}`}>{dept.managerName || 'Not assigned'}</span>
                      </span>
                      <span>
                        <span className="block text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Members</span>
                        <span className="mt-1 block text-[11px] font-pmedium text-slate-800">{dept.employeeCount || 0} members</span>
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: DEPARTMENTS (DETAIL VIEW)           */}
      {/* ========================================== */}
      {activeTab === 'departments' && view === 'detail' && selectedDepartment && (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <button onClick={() => setView('list')} className="mb-4 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl font-pmedium text-[11px] transition-all flex items-center gap-2 shadow-sm">
            <ArrowLeft size={16} /> Directory
          </button>

          {/* Dept Header Card */}
          <div className="bg-white rounded-[1.6rem] border border-slate-100 shadow-sm p-4.5 mb-4 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 rounded-bl-full ${getDepartmentToneClass(selectedDepartment)}`}></div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`w-2 h-6 rounded-full ${getDepartmentToneClass(selectedDepartment)}`}></div>
                  <h1 className="text-xl font-pmedium text-slate-900">{normalizeDepartmentLabel(selectedDepartment.name)}</h1>
                </div>
                <p className="text-[12px] text-slate-500 max-w-2xl leading-relaxed">{selectedDepartment.description}</p>
              </div>
              <div className="flex w-full flex-wrap gap-2.5 md:w-auto">
                {isCustomDepartmentOption(selectedDepartment) && canManageCustomDepartment ? (
                  <button type="button" onClick={() => openDepartmentModal(selectedDepartment)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-[11px] font-pmedium text-blue-700 transition-colors hover:bg-blue-100 md:flex-none">
                    <Wrench size={14} /> Edit Department
                  </button>
                ) : null}
                {canInviteUsersByAccess && !selectedDepartment.managerName ? (
                  <button type="button" onClick={() => openInviteForDepartment(selectedDepartment, 'manager')} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-[11px] font-pmedium text-blue-700 transition-colors hover:bg-blue-100 md:flex-none">
                    <UserPlus size={14} /> Invite Manager
                  </button>
                ) : null}
                {canAssignManagerByAccess ? (
                  <button type="button" onClick={() => setShowAssignManagerModal(true)} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-pmedium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 md:flex-none">
                    {selectedDepartment.managerName ? 'Change Manager' : 'Assign Existing'}
                  </button>
                ) : null}
                <button type="button" onClick={() => setShowEmployeeModal(true)} disabled={!canInviteUsersByAccess} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-[11px] font-pmedium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 md:flex-none">
                  <UserPlus size={14}/> Add Employee
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Department Manager</p>
                {selectedDepartment.managerName ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-[11px] font-pmedium text-emerald-700">{getInitials(selectedDepartment.managerName)}</div>
                    <div>
                      <p className="flex items-center gap-1.5 text-[12px] font-pmedium text-emerald-700"><CheckCircle2 size={14}/> {selectedDepartment.managerName}</p>
                      <p className="mt-0.5 text-[10px] font-pmedium text-slate-500">{selectedDepartmentManager?.email || 'Primary department lead'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-[12px] font-pmedium text-amber-600"><AlertCircle size={15}/> No manager assigned</p>
                )}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Core Modules</p>
                  <span className="text-[10px] font-pmedium text-blue-600">{getDepartmentModuleLabels(selectedDepartment).length} selected</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {getDepartmentModuleLabels(selectedDepartment).length > 0 ? getDepartmentModuleLabels(selectedDepartment).map((moduleLabel) => (
                    <span key={`detail-module-${moduleLabel}`} className="rounded-md border border-blue-100 bg-white px-2 py-1 text-[9px] font-pmedium text-blue-700">{moduleLabel}</span>
                  )) : <span className="text-[10px] font-pmedium text-slate-400">No department-specific modules configured.</span>}
                </div>
                <p className="mt-2 text-[9px] font-pmedium text-slate-500">Common modules are added automatically. The manager receives these department modules.</p>
              </div>
            </div>
            {Array.isArray(selectedDepartment.actingManagers) && selectedDepartment.actingManagers.length > 0 ? (
              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-[11px] font-pmedium text-blue-600 uppercase tracking-widest mb-3">Active Acting Managers</p>
                <div className="flex flex-wrap gap-3">
                  {selectedDepartment.actingManagers.map((assignment) => (
                    <div key={assignment.id || assignment.assignedUserId} className="flex items-center gap-3 rounded-2xl bg-white border border-blue-100 px-4 py-3">
                      <div>
                        <p className="font-pmedium text-slate-900 text-sm">{assignment.assignedUserName}</p>
                        <p className="text-[11px] font-pmedium text-slate-500 uppercase tracking-widest">
                          {(assignment.assignedBaseRole || 'acting-manager').replace(/_/g, ' ')}
                        </p>
                      </div>
                      {canManageActingAssignments && canRemoveActingManagerByAccess ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveActingManager(assignment.assignedUserId)}
                          className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-[11px] font-pmedium uppercase tracking-widest hover:bg-red-100 transition-colors"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Dept Employee Table */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-[13px] font-pmedium text-slate-900">Department Members</h3>
              <span className={statusPillClass(selectedDepartmentMembers.length)}>{selectedDepartmentMembers.length} Members</span>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-5 py-4">Member Info</th>
                    <th className="px-5 py-4">Employee ID</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Contact Details</th>
                    <th className="px-5 py-4">Join Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {selectedDepartmentMembers.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-pmedium text-[10px] shadow-sm bg-gradient-to-br from-[#2563EB] to-blue-700">
                            {getInitials(emp.name)}
                          </div>
                          <div className="font-pmedium text-[11px] text-slate-900">{emp.name}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {emp.employeeId ? (
                          <span className={statusPillClass(emp.employeeId)}>
                            {emp.employeeId}
                          </span>
                        ) : (
                          <span className="text-[12px] font-pmedium text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">{getRoleBadge(emp.role)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-[12px] text-slate-600"><Mail size={14} className="text-slate-400"/> {emp.email}</div>
                      </td>
                      <td className="px-5 py-4 text-[12px] font-pmedium text-slate-500">{formatJoinedDate((emp as any).joinedAt)}</td>
                    </tr>
                  ))}
                  {selectedDepartmentMembers.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-20 text-slate-400 font-pmedium"><Users size={32} className="mx-auto mb-3 opacity-30"/>No manager, admin, or employee is linked to this department.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-[13px] font-pmedium text-slate-900">Transferred From This Department</h3>
                <span className={statusPillClass((selectedDepartment as any)?.transferredEmployees?.length || 0)}>
                {(selectedDepartment as any)?.transferredEmployees?.length || 0} Recorded
              </span>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-5 py-4">Employee</th>
                    <th className="px-5 py-4">Previous Role</th>
                    <th className="px-5 py-4">Transferred To</th>
                    <th className="px-5 py-4">Transfer Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {((selectedDepartment as any)?.transferredEmployees || []).map((emp: any) => (
                    <tr key={`dept-transfer-${emp.id}`} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-pmedium text-[10px] shadow-sm bg-slate-400">
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <div className="font-pmedium text-[11px] text-slate-900">{emp.name}</div>
                            <div className="text-[10px] font-pmedium text-slate-500">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">{getRoleBadge(emp.role)}</td>
                      <td className="px-5 py-4">
                        <div className="font-pmedium text-[11px] text-slate-900">{emp.transferredToWorkspaceName || 'Linked Unit'}</div>
                        <div className="text-[10px] font-pmedium text-slate-500">{emp.transferredToWorkspaceLocation || 'Location not set'}</div>
                      </td>
                      <td className="px-5 py-4 text-[12px] font-pmedium text-slate-500">{formatTransferDate(emp.transferredAt)}</td>
                    </tr>
                  ))}
                  {(!selectedDepartment.transferredEmployees || selectedDepartment.transferredEmployees.length === 0) && (
                    <tr><td colSpan={4} className="text-center py-20 text-slate-400 font-pmedium"><Users size={32} className="mx-auto mb-3 opacity-30"/>No transferred records for this department yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
 
        </div>
      )}

      {/* ========================================== */}
      {/* MODALS                                     */}
      {/* ========================================== */}

        {/* 2. Add Employee to Roster Modal */}
      {showEmployeeModal && selectedDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-3 font-pmedium backdrop-blur-sm">
          <div className="flex w-full max-w-xl animate-in flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl duration-200 zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 bg-blue-50/30 p-5 sm:p-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-[#2563EB] p-1.5 text-white"><UserPlus size={16} /></span>
                  <h2 className="text-lg font-pmedium text-primary">Add Department Employee</h2>
                </div>
                <p className="mt-1 text-[11px] font-pmedium text-slate-500">The invite will be assigned directly to {normalizeDepartmentLabel(selectedDepartment.name)}.</p>
              </div>
              <button type="button" onClick={() => setShowEmployeeModal(false)} disabled={isAddingEmployee} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:text-slate-700 disabled:opacity-50"><X size={16} /></button>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <div>
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-blue-600">Role</p>
                  <p className="mt-1 text-[12px] font-pmedium text-slate-800">Employee</p>
                </div>
                <div>
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-blue-600">Department</p>
                  <p className="mt-1 truncate text-[12px] font-pmedium text-slate-800">{normalizeDepartmentLabel(selectedDepartment.name)}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Full Name *</label>
                <input type="text" maxLength={80} autoComplete="name" placeholder="Enter employee name" value={employeeFormData.name} onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Work Email *</label>
                <input type="email" autoComplete="email" placeholder="name@company.com" value={employeeFormData.email} onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })} aria-invalid={Boolean(normalizedEmployeeEmail) && (!isEmployeeEmailValid || isEmployeeEmailAlreadyUsed)} className={`w-full rounded-xl border bg-slate-50 px-3.5 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 ${Boolean(normalizedEmployeeEmail) && (!isEmployeeEmailValid || isEmployeeEmailAlreadyUsed) ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-[#2563EB] focus:ring-blue-500/10'}`} />
                {normalizedEmployeeEmail && !isEmployeeEmailValid ? <p className="flex items-center gap-1 text-[10px] font-pmedium text-red-600"><AlertCircle size={12} /> Enter a valid work email address.</p> : null}
                {isEmployeeEmailAlreadyUsed ? <p className="flex items-center gap-1 text-[10px] font-pmedium text-red-600"><AlertCircle size={12} /> Email already used. Try another email.</p> : null}
              </div>
            </div>
            <div className="flex gap-2.5 border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
              <button type="button" onClick={() => setShowEmployeeModal(false)} disabled={isAddingEmployee} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-[12px] font-pmedium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleAddEmployee} disabled={!employeeFormData.name.trim() || !normalizedEmployeeEmail || !isEmployeeEmailValid || isEmployeeEmailAlreadyUsed || isAddingEmployee} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-2.5 text-[12px] font-pmedium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                {isAddingEmployee ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : <><Send size={14} /> Send Invite</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDepartmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-3 font-pmedium backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl animate-in flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl duration-200 zoom-in-95">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-blue-50/30 p-5 sm:p-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-[#2563EB] p-1.5 text-white"><Building2 size={16} /></span>
                  <h2 className="text-lg font-pmedium text-primary">{isEditingCustomDepartment ? 'Edit Custom Department' : 'Create Custom Department'}</h2>
                </div>
                <p className="mt-1 text-[11px] font-pmedium text-slate-500">{isEditingCustomDepartment ? 'Update its public name and enable or disable available modules.' : 'Create the one custom department allowed for this workspace and select its modules.'}</p>
              </div>
              <button type="button" onClick={() => setShowDepartmentModal(false)} disabled={isCreatingDepartment} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:text-slate-700 disabled:opacity-50"><X size={16} /></button>
            </div>

            <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
              {!canManageCustomDepartment ? (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[11px] font-pmedium text-amber-800">
                  <Lock size={16} className="mt-0.5 shrink-0" /> The founder can manage one custom department on Professional and Custom plans.
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Department Name *</label>
                  <input type="text" maxLength={80} placeholder="e.g. Customer Success" value={newDepartmentForm.name} onChange={(e) => setNewDepartmentForm((current) => ({ ...current, name: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
                  <p className="text-[9px] font-pmedium text-slate-400">This name is visible to every workspace user in department lists and assignments.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Description</label>
                  <textarea maxLength={240} rows={3} placeholder="Briefly explain this department's responsibility" value={newDepartmentForm.description} onChange={(e) => setNewDepartmentForm((current) => ({ ...current, description: e.target.value }))} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
                  <p className="text-right text-[9px] font-pmedium text-slate-400">{newDepartmentForm.description.length}/240</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Core Modules *</p>
                    <p className="mt-1 text-[10px] font-pmedium text-slate-400">Enable or disable any available department module. Professional combines the available Sales and Technology modules here.</p>
                  </div>
                  <span className="w-fit rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium text-blue-700">{newDepartmentForm.moduleIds.length} Selected</span>
                </div>
                <div className="mt-3 space-y-3">
                  {workspaceModuleGroups.map(([groupName, modules]) => (
                    <div key={`custom-module-group-${groupName}`} className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="mb-2 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">{groupName}</p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {modules.map((module) => {
                          const selected = newDepartmentForm.moduleIds.includes(module.id);
                          return (
                            <button type="button" key={`create-dept-module-${module.id}`} onClick={() => setNewDepartmentForm((current) => ({ ...current, moduleIds: selected ? current.moduleIds.filter((id) => id !== module.id) : [...current.moduleIds, module.id] }))} className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-[10px] font-pmedium transition-all ${selected ? 'border-[#2563EB] bg-blue-50 text-blue-800 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50/40'}`}>
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected ? 'border-[#2563EB] bg-[#2563EB] text-white' : 'border-slate-300 bg-white text-transparent'}`}><CheckSquare size={12} /></span>
                              {module.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {workspaceModuleOptions.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-[10px] font-pmedium text-slate-400">No enabled workspace modules are available for custom department assignment.</p> : null}
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <Shield size={16} className="mt-0.5 shrink-0 text-[#2563EB]" />
                <div>
                  <p className="text-[10px] font-pmedium text-blue-900">Access after saving</p>
                  <p className="mt-1 text-[10px] font-pmedium leading-relaxed text-blue-700">Founder and Super Admin keep full workspace visibility. Invite the one department manager from Add User; that manager receives common modules plus the core modules selected here. Employees can then be added to the same department.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 border-t border-slate-100 bg-slate-50 p-4 sm:justify-end sm:p-5">
              <button type="button" onClick={() => setShowDepartmentModal(false)} disabled={isCreatingDepartment} className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[12px] font-pmedium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none">Cancel</button>
              <button type="button" onClick={handleCreateDepartmentForFounder} disabled={!canManageCustomDepartment || isCreatingDepartment || newDepartmentForm.name.trim().length < 2 || newDepartmentForm.moduleIds.length === 0} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-[12px] font-pmedium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">
                {isCreatingDepartment ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : isEditingCustomDepartment ? <><Wrench size={14} /> Save Changes</> : <><Plus size={14} /> Create Department</>}
              </button>
            </div>
          </div>
        </div>
      )}

        </div>
      </PageFrame>

      {/* 3. Assign Manager Modal */}
      {showAssignManagerModal && selectedDepartment && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] max-w-lg w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-pmedium text-slate-900">Department Leadership</h2>
                <p className="text-xs text-slate-500 mt-1">Manage primary and acting leadership for {selectedDepartment.name}</p>
              </div>
              <button onClick={() => setShowAssignManagerModal(false)} className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={18} /></button>
            </div>
              <div className="p-6 max-h-[50vh] overflow-y-auto">
                <div className="mb-6">
                  <p className="text-[11px] font-pmedium text-slate-400 uppercase tracking-widest mb-3">Primary Manager</p>
                {selectedDepartment.employees?.filter((tm) => ['manager', 'admin', 'super_admin', 'super-admin'].includes(normalizeRoleValue(tm.role)) && tm.status !== 'invited').length === 0 ? (
                  <div className="text-center py-10">
                    <Shield size={32} className="mx-auto text-slate-300 mb-3"/>
                    <p className="text-sm font-pmedium text-slate-600">No department personnel available.</p>
                    <p className="text-xs text-slate-500 mt-1">Add users to this department first.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDepartment.employees?.filter((tm) => ['manager', 'admin', 'super_admin', 'super-admin'].includes(normalizeRoleValue(tm.role)) && tm.status !== 'invited').map((manager) => (
                      <div 
                        key={manager.id} 
                        onClick={() => handleAssignManagerToDepartment(manager.userId || manager.id, manager.name)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 ${selectedDepartment.managerId === manager.id || selectedDepartment.managerUserId === manager.userId ? 'border-[#2563EB] bg-blue-50/50' : 'border-slate-200 bg-white hover:border-[#2563EB] hover:shadow-sm'}`}
                    >
                      <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-white font-pmedium text-sm ${selectedDepartment.managerId === manager.id || selectedDepartment.managerUserId === manager.userId ? 'bg-[#2563EB]' : 'bg-slate-300'}`}>
                        {manager.name?.charAt(0)}
                      </div>
                        <div>
                          <div className="font-pmedium text-slate-900 text-sm">{manager.name}</div>
                          {manager.employeeId && (
                            <div className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mt-0.5">
                              {manager.employeeId}
                            </div>
                          )}
                          <div className="text-[12px] text-slate-500 font-pmedium">{manager.email}</div>
                        </div>
                      {(selectedDepartment.managerId === manager.id || selectedDepartment.managerUserId === manager.userId) && <CheckCircle2 className="ml-auto text-[#2563EB]" size={20}/>}
                    </div>
                  ))}
                  </div>
                )}
                </div>

                {canManageActingAssignments ? (
                  <div className="border-t border-slate-100 pt-6">
                    <p className="text-[11px] font-pmedium text-slate-400 uppercase tracking-widest mb-3">Acting Managers</p>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Acting managers get temporary department-manager mode for this department only. Attendance shows department employee records only, and leave requests stay limited to approval actions for this department.
                    </p>
                    {actingManagerCandidates.length === 0 ? (
                      <div className="text-center py-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                        <Shield size={28} className="mx-auto text-slate-300 mb-3"/>
                        <p className="text-sm font-pmedium text-slate-600">No eligible acting-manager candidates.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {actingManagerCandidates.map((member) => {
                          const isAssigned = (selectedDepartment.actingManagers || []).some(
                            (assignment) => String(assignment.assignedUserId) === String(member.userId || member.id),
                          );

                          return (
                            <div
                              key={`acting-${member.id}`}
                              className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${isAssigned ? 'border-blue-200 bg-blue-50/60' : 'border-slate-200 bg-white'}`}
                            >
                              <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-white font-pmedium text-sm ${isAssigned ? 'bg-[#2563EB]' : 'bg-slate-300'}`}>
                                {member.name ? member.name.charAt(0) : (member.email ? member.email.charAt(0) : '')}
                              </div>
                              <div className="min-w-0">
                                <div className="font-pmedium text-slate-900 text-sm">{member.name}</div>
                                <div className="text-[12px] text-slate-500 font-pmedium">{member.email}</div>
                              </div>
                              {isAssigned ? (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveActingManager(member.userId || member.id)}
                                  className="ml-auto px-3 py-2 rounded-xl bg-red-50 text-red-600 text-[11px] font-pmedium uppercase tracking-widest hover:bg-red-100 transition-colors"
                                >
                                  Remove
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAssignActingManager(member)}
                                  disabled={!canAssignActingManagerByAccess}
                                  className="ml-auto px-3 py-2 rounded-xl bg-[#2563EB] text-white text-[11px] font-pmedium uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Assign
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
            </div>
          </div>
        </div>
      )}

      {/* 4. Add Platform Administrator Modal */}
      {viewingMember && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => setViewingMember(null)}>
          <div
            className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70 max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[12px] font-pmedium shadow-sm shrink-0 ${normalizeRoleValue(viewingMember.role) === 'owner' ? 'bg-[#111827] text-white' : 'bg-[#2563EB] text-white'}`}>
                  {getInitials(viewingMember.name)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">{viewingMember.name || 'Unknown User'}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleBadge(viewingMember.role)}
                    {getStatusBadge(viewingMember.status)}
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingMember(null)} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"><X size={16} /></button>
            </div>

            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto bg-white">
              <div>
                <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                  <Users size={14} /> Basic Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Employee ID</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{viewingMember.employeeId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1 flex items-center gap-1"><Mail size={10} /> Email</p>
                    <p className="text-[12px] font-pmedium text-slate-900 break-all">{viewingMember.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1 flex items-center gap-1"><Shield size={10} /> Access Role</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{getRoleBadge(viewingMember.role)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1 flex items-center gap-1"><Calendar size={10} /> Joined On</p>
                    <p className="text-[12px] font-pmedium text-slate-900">
                      {viewingMember.joinedAt ? new Date(viewingMember.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                  <Briefcase size={14} /> Departments
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {(normalizeRoleValue(viewingMember.role) === 'owner' || normalizeRoleValue(viewingMember.role) === 'super-admin'
                    ? ['All Departments']
                    : (Array.isArray(viewingMember.departmentNames) && viewingMember.departmentNames.length > 0
                      ? viewingMember.departmentNames
                      : ['-'])
                  ).map((dept, i) => (
                    <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-pmedium tracking-wide">{normalizeDepartmentLabel(dept)}</span>
                  ))}
                </div>
              </div>

              {Array.isArray(viewingMember.grantedModules) && viewingMember.grantedModules.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                    <CheckSquare size={14} /> Granted Modules
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingMember.grantedModules.map((moduleId, i) => (
                      <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-pmedium tracking-wide">{formatModuleLabel(moduleId)}</span>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(viewingMember.workspaceAccesses) && viewingMember.workspaceAccesses.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                    <Building2 size={14} /> Linked Workspaces
                  </h3>
                  <div className="space-y-2">
                    {viewingMember.workspaceAccesses.map((access, i) => (
                      <div key={access.id || i} className="flex items-center justify-between p-3 bg-slate-50/60 border border-slate-100 rounded-xl">
                        <span className="text-[12px] font-pmedium text-slate-800">{access.workspaceName || 'Workspace'}</span>
                        {access.location && <span className="text-[10px] font-pmedium text-slate-500">{access.location}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 shrink-0">
              <button onClick={() => setViewingMember(null)} className="w-full py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[12px] shadow-sm hover:bg-blue-700 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {inviteToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-3 font-pmedium backdrop-blur-sm">
          <div className="flex w-full max-w-md animate-in flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl duration-200 zoom-in-95">
            <div className="flex items-start justify-between gap-4 border-b border-rose-100 bg-rose-50/60 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-pmedium text-slate-900">Remove Invited Member</h2>
                  <p className="mt-1 text-[11px] font-pmedium text-slate-500">{inviteToRemove.name || inviteToRemove.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInviteToRemove(null)}
                disabled={cancelInvitePendingMemberId === inviteToRemove.id}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:text-slate-700 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 p-5 sm:p-6">
              <p className="text-sm text-slate-600">
                This person hasn't registered yet. Removing them will free up their seat and cancel their invite link.
              </p>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[12px] font-pmedium text-amber-800">
                Their current invite email will stop working — you'll need to send a brand new invite if you want them to join later.
              </div>
            </div>

            <div className="flex gap-2.5 border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
              <button
                type="button"
                onClick={() => setInviteToRemove(null)}
                disabled={cancelInvitePendingMemberId === inviteToRemove.id}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-[12px] font-pmedium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCancelInvite(String(inviteToRemove.id || ''))}
                disabled={cancelInvitePendingMemberId === inviteToRemove.id}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-[12px] font-pmedium text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelInvitePendingMemberId === inviteToRemove.id ? (
                  <><Loader2 size={15} className="animate-spin" /> Removing...</>
                ) : (
                  <><Trash2 size={15} /> Remove Invite</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {roleChangeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-3 font-pmedium backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-xl animate-in flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl duration-200 zoom-in-95">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-blue-50/30 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-[#2563EB] p-1.5 text-white"><ArrowUpDown size={16} /></span>
                <div>
                  <h2 className="text-lg font-pmedium text-primary">Change Role</h2>
                  <p className="mt-1 text-[11px] font-pmedium text-slate-500">{roleChangeTarget.name || roleChangeTarget.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRoleChangeTarget(null)}
                disabled={isSavingRoleChange}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:text-slate-700 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Platform Role *</label>
                <select
                  value={roleChangeForm.role}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    setRoleChangeForm((current) => ({
                      role: nextRole,
                      departments:
                        nextRole === 'super-admin'
                          ? []
                          : nextRole === 'manager'
                            ? []
                            : nextRole === 'employee'
                              ? current.departments.slice(0, 1)
                              : current.departments,
                    }));
                  }}
                  disabled={isBasicPlanWorkspace}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <option value="employee" disabled={isBasicPlanWorkspace}>Department Employee</option>
                  <option value="manager" disabled={isBasicPlanWorkspace || inviteDepartmentOptions.length === 0}>Department Manager</option>
                  <option value="admin" disabled={isBasicPlanWorkspace}>Department Admin</option>
                  <option value="super-admin" disabled={!canInviteSuperAdmin}>Super Admin</option>
                </select>
                {isBasicPlanWorkspace ? (
                  <p className="text-[11px] font-pmedium text-amber-600">Role changes aren't needed on the Basic plan.</p>
                ) : !canInviteSuperAdmin ? (
                  <p className="text-[11px] font-pmedium text-amber-600">Only the founder can promote someone to Super Admin.</p>
                ) : inviteDepartmentOptions.length === 0 ? (
                  <p className="text-[11px] font-pmedium text-amber-600">Add a unit (department) before assigning the Manager role.</p>
                ) : null}
              </div>

              {roleChangeForm.role !== 'super-admin' ? (
                <div className="space-y-3">
                  <label className="flex items-center justify-between text-[11px] font-pmedium uppercase tracking-widest text-slate-500">
                    Assign Department
                    <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[#2563EB]">{roleChangeForm.departments.length} Selected</span>
                  </label>
                  <p className="-mt-1 text-[11px] text-slate-500">{getTeamMemberDepartmentHelperText(roleChangeForm.role)}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {inviteDepartmentOptions.map((dept) => {
                      const departmentId = String(dept.id || '').trim();
                      const isPlanAllowedDepartment = isDepartmentAllowedForPlan(workspacePlan, dept.name);
                      const isSelected = departmentId ? roleChangeForm.departments.includes(departmentId) : false;
                      const hasAssignedManager =
                        (Boolean(String(dept.managerUserId || dept.managerId || '').trim()) &&
                          String(dept.managerUserId || dept.managerId || '') !== String(roleChangeTarget.userId || roleChangeTarget.id || '')) ||
                        Boolean(
                          dept.employees?.some((employeeMember) => {
                            const employeeRole = normalizeRoleValue(employeeMember.role);
                            const employeeStatus = String(employeeMember.status || '').toLowerCase();
                            const isSameMember =
                              String(employeeMember.userId || employeeMember.id || '') ===
                              String(roleChangeTarget.userId || roleChangeTarget.id || '');
                            return employeeRole === 'manager' && employeeStatus !== 'disabled' && !isSameMember;
                          }),
                        );
                      const isManagerDepartmentDisabled = roleChangeForm.role === 'manager' && hasAssignedManager;
                      const isDepartmentDisabled = !isPlanAllowedDepartment || isManagerDepartmentDisabled;
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          disabled={isDepartmentDisabled}
                          onClick={() => {
                            if (!departmentId || isDepartmentDisabled) return;
                            setRoleChangeForm((current) => {
                              const alreadySelected = current.departments.includes(departmentId);
                              if (SINGLE_DEPARTMENT_TEAM_MEMBER_ROLES.has(current.role)) {
                                return { ...current, departments: alreadySelected ? [] : [departmentId] };
                              }
                              return {
                                ...current,
                                departments: alreadySelected
                                  ? current.departments.filter((id) => id !== departmentId)
                                  : [...current.departments, departmentId],
                              };
                            });
                          }}
                          className={`flex min-h-[54px] w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                            isSelected
                              ? 'border-blue-300 bg-blue-50 text-blue-800 shadow-sm'
                              : isDepartmentDisabled
                                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40'
                          }`}
                        >
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            isSelected ? 'border-[#2563EB] bg-[#2563EB] text-white' : 'border-slate-300 bg-white text-transparent'
                          }`}>
                            <CheckSquare size={13} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12px] font-pmedium">{normalizeDepartmentLabel(dept.name)}</span>
                            {isManagerDepartmentDisabled ? (
                              <span className="mt-0.5 block text-[9px] font-pmedium uppercase tracking-wide text-amber-600">Manager already added</span>
                            ) : null}
                            {!isPlanAllowedDepartment ? (
                              <span className="mt-0.5 block text-[9px] font-pmedium uppercase tracking-wide text-slate-500">Custom plan only</span>
                            ) : null}
                          </span>
                          {isDepartmentDisabled ? <Lock size={13} className="shrink-0 text-slate-400" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <div className="rounded-xl bg-white p-2 shadow-sm"><Crown className="text-[#2563EB]" size={20} /></div>
                  <p className="text-[12px] font-pmedium leading-relaxed text-slate-700">Super Admins automatically receive top-level access to ALL departments and platform modules.</p>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
              <button
                type="button"
                onClick={() => setRoleChangeTarget(null)}
                disabled={isSavingRoleChange}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-[12px] font-pmedium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRoleChange}
                disabled={
                  isSavingRoleChange ||
                  (roleChangeForm.role === 'admin' && roleChangeForm.departments.length === 0) ||
                  (SINGLE_DEPARTMENT_TEAM_MEMBER_ROLES.has(roleChangeForm.role) && roleChangeForm.departments.length !== 1)
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-2.5 text-[12px] font-pmedium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingRoleChange ? (
                  <><Loader2 size={15} className="animate-spin" /> Saving...</>
                ) : (
                  <><ArrowUpDown size={15} /> Update Role</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTeamMemberModal && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70">
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-[#2563EB] text-white rounded-lg"><UserPlus size={16}/></span>
                  <h2 className="text-primary lg:text-lg font-pmedium tracking-tight text-slate-800" style={{ fontFamily: "inherit" }}>
                    Add Platform User
                  </h2>
                </div>
              </div>
              <button onClick={() => setShowTeamMemberModal(false)} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors absolute top-5 right-5 md:static"><X size={16} /></button>
            </div>
            
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[58vh] bg-white">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Full Name *</label>
                  <input type="text" placeholder="Enter full name" value={teamMemberFormData.name} onChange={(e) => setTeamMemberFormData({ ...teamMemberFormData, name: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Work Email *</label>
                  <input
                    type="email"
                    placeholder="Enter work email"
                    value={teamMemberFormData.email}
                    onChange={(e) => setTeamMemberFormData({ ...teamMemberFormData, email: e.target.value })}
                    aria-invalid={Boolean(normalizedTeamMemberEmail) && (!isTeamMemberEmailValid || isTeamMemberEmailAlreadyUsed)}
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-[12px] font-pmedium text-slate-900 focus:bg-white focus:ring-4 outline-none transition-all ${
                      Boolean(normalizedTeamMemberEmail) && (!isTeamMemberEmailValid || isTeamMemberEmailAlreadyUsed)
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
                        : 'border-slate-200 focus:border-[#2563EB] focus:ring-blue-500/10'
                    }`}
                  />
                  {normalizedTeamMemberEmail && !isTeamMemberEmailValid && (
                    <p className="flex items-center gap-1 text-[10px] font-pmedium text-red-600"><AlertCircle size={12} /> Enter a valid work email address.</p>
                  )}
                  {isTeamMemberEmailAlreadyUsed && (
                    <p className="flex items-center gap-1 text-[10px] font-pmedium text-red-600">
                      <AlertCircle size={12} /> Email already used. Try using a different email.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Platform Role *</label>
                <select
                  value={teamMemberFormData.role}
                  onChange={(e) =>
                    setTeamMemberFormData((current) => {
                      const nextRole = e.target.value;
                      return {
                        ...current,
                        role: nextRole,
                        departments:
                          nextRole === 'super-admin'
                            ? inviteDepartmentOptions.map((department) => department.id).filter((id): id is string => !!id)
                            : nextRole === 'manager'
                              ? []
                              : nextRole === 'employee'
                                ? current.departments.slice(0, 1)
                                : current.departments,
                      };
                    })
                  }
                  disabled={isBasicPlanWorkspace}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                >
                   <option value="employee" disabled={isBasicPlanWorkspace}>Department Employee</option>
                   <option value="manager" disabled={isBasicPlanWorkspace || inviteDepartmentOptions.length === 0}>Department Manager</option>
                   <option value="admin" disabled={isBasicPlanWorkspace}>Department Admin</option>
                   <option value="super-admin" disabled={!canInviteSuperAdmin}>Super Admin</option>
                </select>
                {isBasicPlanWorkspace ? (
                  <p className="text-[11px] text-amber-600 font-pmedium">
                    Basic plan only allows the founder to add one additional user, as Super Admin.
                  </p>
                ) : !canInviteSuperAdmin && (
                  <p className="text-[11px] text-amber-600 font-pmedium">
                    Only the founder can create a new Super Admin account.
                  </p>
                )}
              </div>

              {/* <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <p className="mb-3 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Department access by role</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    { role: 'employee', title: 'Employee', rule: 'Choose exactly 1 department' },
                    { role: 'manager', title: 'Manager', rule: 'Choose 1; one manager per department' },
                    { role: 'admin', title: 'Admin', rule: 'Choose one or multiple departments' },
                    { role: 'super-admin', title: 'Super Admin', rule: 'All departments automatically' },
                  ].map((roleRule) => {
                    const isActiveRole = teamMemberFormData.role === roleRule.role;
                    return (
                      <div
                        key={roleRule.role}
                        className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${
                          isActiveRole
                            ? 'border-blue-200 bg-white text-slate-900 shadow-sm'
                            : 'border-transparent text-slate-500'
                        }`}
                      >
                        <CheckCircle2
                          size={16}
                          className={isActiveRole ? 'mt-0.5 shrink-0 text-[#2563EB]' : 'mt-0.5 shrink-0 text-slate-300'}
                        />
                        <div>
                          <p className="text-[11px] font-pmedium">{roleRule.title}</p>
                          <p className="mt-0.5 text-[10px] leading-4">{roleRule.rule}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div> */}
              {teamMemberFormData.role !== 'super-admin' ? (
                <div className="space-y-3 pt-2">
                  <label className="text-[11px] font-pmedium text-slate-500 uppercase tracking-widest flex items-center justify-between">
                    Assign Department
                    <span className="text-[#2563EB] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">{teamMemberFormData.departments.length} Selected</span>
                  </label>
                    <p className="text-[11px] text-slate-500 -mt-1">
                      {getTeamMemberDepartmentHelperText(teamMemberFormData.role)}
                    </p>
                    {isProfessionalPlanWorkspace && (
                      <p className="text-[11px] text-amber-600 font-pmedium -mt-1">
                        Professional includes Sales, Technology, and custom departments created in Organization Management.
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {inviteDepartmentOptions.map((dept) => {
                      const departmentId = String(dept.id || '').trim();
                      const isPlanAllowedDepartment = isDepartmentAllowedForPlan(workspacePlan, dept.name);
                      const isSelected = departmentId ? teamMemberFormData.departments.includes(departmentId) : false;
                      const hasAssignedManager = Boolean(String(dept.managerUserId || dept.managerId || '').trim()) || Boolean(
                        dept.employees?.some((member) => {
                          const memberRole = normalizeRoleValue(member.role);
                          const memberStatus = String(member.status || '').toLowerCase();
                          return memberRole === 'manager' && memberStatus !== 'disabled';
                        }),
                      );
                      const isManagerDepartmentDisabled = normalizedTeamMemberRole === 'manager' && hasAssignedManager;
                      const isDepartmentDisabled = !isPlanAllowedDepartment || isManagerDepartmentDisabled;
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          disabled={isDepartmentDisabled}
                          onClick={() => {
                            if (!departmentId || isDepartmentDisabled) return;
                            setTeamMemberFormData((current) => {
                              const alreadySelected = current.departments.includes(departmentId);
                              if (SINGLE_DEPARTMENT_TEAM_MEMBER_ROLES.has(current.role)) {
                                return {
                                  ...current,
                                  departments: alreadySelected ? [] : [departmentId],
                                };
                              }
                              return {
                                ...current,
                                departments: alreadySelected
                                  ? current.departments.filter((selectedDepartmentId) => selectedDepartmentId !== departmentId)
                                  : [...current.departments, departmentId],
                              };
                            });
                          }}
                          className={`flex min-h-[54px] w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                            isSelected
                              ? 'border-blue-300 bg-blue-50 text-blue-800 shadow-sm'
                              : isDepartmentDisabled
                                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40'
                          }`}
                        >
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            isSelected
                              ? 'border-[#2563EB] bg-[#2563EB] text-white'
                              : 'border-slate-300 bg-white text-transparent'
                          }`}>
                            <CheckSquare size={13} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12px] font-pmedium">{normalizeDepartmentLabel(dept.name)}</span>
                            {normalizedTeamMemberRole === 'manager' && hasAssignedManager && (
                              <span className="mt-0.5 block text-[9px] font-pmedium uppercase tracking-wide text-amber-600">
                                Manager already added
                              </span>
                            )}
                            {!isPlanAllowedDepartment && (
                              <span className="mt-0.5 block text-[9px] font-pmedium uppercase tracking-wide text-slate-500">
                                Custom plan only
                              </span>
                            )}
                          </span>
                          {isDepartmentDisabled && <Lock size={13} className="shrink-0 text-slate-400" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-500 -mt-1">
                    {normalizedTeamMemberRole === 'manager' && teamMemberFormData.departments.length === 1
                      ? (() => {
                          const selectedDepartment = departments.find((department) => String(department.id || '') === String(teamMemberFormData.departments[0] || ''));
                          return selectedDepartment?.managerName
                            ? `Existing manager: ${selectedDepartment.managerName}`
                            : 'Only one department can be selected for this role.';
                        })()
                      : isSingleDepartmentTeamMemberRole
                        ? 'Only one department can be selected for this role.'
                        : 'This role can be assigned to multiple departments.'}
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50/50 p-4 rounded-2xl flex gap-3 items-center border border-blue-100">
                   <div className="p-2 bg-white rounded-xl shadow-sm"><Crown className="text-[#2563EB]" size={20}/></div>
                   <p className="text-[12px] font-pmedium text-slate-700 leading-relaxed">Super Admins automatically receive top-level access to ALL departments and platform modules.</p>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex gap-2.5 shrink-0">
              <button onClick={() => setShowTeamMemberModal(false)} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[12px] hover:bg-slate-50 transition-colors shadow-sm">Cancel</button>
              <button
                onClick={handleSendInvite}
                disabled={
                  isSendingInvite ||
                  !teamMemberFormData.name ||
                  !teamMemberFormData.email ||
                  !isTeamMemberEmailValid ||
                  isTeamMemberEmailAlreadyUsed ||
                  !canAddUserOnCurrentPlan ||
                  (normalizedTeamMemberRole === 'admin' && teamMemberFormData.departments.length === 0) ||
                  (isSingleDepartmentTeamMemberRole && teamMemberFormData.departments.length !== 1) ||
                  (teamMemberFormData.role === 'super-admin' && !canInviteSuperAdmin)
                }
                className="flex-1 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[12px] shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSendingInvite ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    Sending...
                  </>
                ) : (
                  <><Send size={14}/> Send Secure Invite</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </>
  );
}

export default OrganizationPage;


