import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Building2, Plus, Trash2, X, Users, UserPlus, ArrowLeft,
  Mail, Calendar, Briefcase, Shield, Send, DollarSign, Wrench,
  CheckCircle2, Search, Crown, CheckSquare, ChevronDown,
  Power, AlertCircle, Lock, Clock, UserCheck, UserX, Ban, Loader2, Eye
} from 'lucide-react';
import { Switch } from '@mui/material';
import useAuth from '../../hooks/useAuth';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import PageFrame from '../../components/Pages/PageFrame';
import { OrganizationSkeleton } from '../../components/ui/Skeleton';
import {
  assignOrganizationActingManager,
  assignOrganizationDepartmentManager,
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
import { getWorkspaceCount } from '../../utils/workspacePlanAccess';
import { statusPillClass } from '../../lib/status-pill';

// sessionStorage only — see client/src/lib/auth-session.ts for why localStorage
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
  const [accessTogglePendingMemberId, setAccessTogglePendingMemberId] = useState('');

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);
  const [transferredTeamMembers, setTransferredTeamMembers] = useState<TeamMember[]>([]);
  const [workspacePlan, setWorkspacePlan] = useState('basic');
  const [availableCoreModules, setAvailableCoreModules] = useState<CoreModuleOption[]>([]);
  const [newDepartmentForm, setNewDepartmentForm] = useState({
    name: '',
    description: '',
    moduleIds: [] as string[],
    managerUserId: '',
    adminUserIds: [] as string[],
    employeeUserIds: [] as string[],
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
      const nextAvailableCoreModules = Array.isArray(payload?.workspace?.availableCoreModules)
        ? payload.workspace.availableCoreModules
            .map((item: any) => ({
              id: String(item?.id || '').trim(),
              name: String(item?.name || item?.label || '').trim(),
            }))
            .filter((item: CoreModuleOption) => item.id && item.name)
        : [];
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
  }, [axiosPrivate, currentUser?.workspaceMembership?.role, currentUser?.role]);

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
    setNewDepartmentForm({
      name: '',
      description: '',
      moduleIds: [],
      managerUserId: '',
      adminUserIds: [],
      employeeUserIds: [],
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
  const totalEmployees = departments.reduce((sum, dept) => sum + (dept.employeeCount || 0), 0);
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
  const canChangeRoleByAccess =
    hasOrgModuleAccess && currentMemberGrantedKeys.has('org-users-change-role');
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
  // Mirrors PROFESSIONAL_PLAN_MAX_USERS in organizationControllers.ts — total
  // active members (including the founder) capped at 5 on Professional.
  const professionalPlanMaxUsers = 5;
  const activeMemberCount = teamMembers.filter(
    (member) => (member.status || '').toLowerCase() !== 'disabled',
  ).length;
  const professionalPlanLimitReached =
    isProfessionalPlanWorkspace && activeMemberCount >= professionalPlanMaxUsers;
  // Professional plan only has built-out modules for Administration, Sales,
  // and Technology departments — HR/Finance/Maintenance/IT are Custom-only
  // (see workspaceModuleCatalog.ts PROFESSIONAL_DEFAULT_IDS), so restrict
  // department assignment in Add User to match.
  const PROFESSIONAL_ALLOWED_DEPARTMENT_NAMES = new Set(['administration', 'sales', 'technology']);
  const isDepartmentAllowedForPlan = (departmentName = '') =>
    !isProfessionalPlanWorkspace ||
    PROFESSIONAL_ALLOWED_DEPARTMENT_NAMES.has(String(departmentName || '').trim().toLowerCase());

  const canAddUserOnCurrentPlan = isBasicPlanWorkspace
    ? isFounderRole && !basicPlanLimitReached
    : isProfessionalPlanWorkspace
      ? canAccessUsersTab && canInviteUsersByAccess && !professionalPlanLimitReached
      : canAccessUsersTab && canInviteUsersByAccess;
  const addUserHoverMessage = isBasicPlanWorkspace
    ? !isFounderRole
      ? 'Only the founder can add users on the Basic plan.'
      : basicPlanLimitReached
        ? `Basic plan limit reached — ${activeSuperAdminCount}/${basicPlanAdditionalUserLimit} additional user added.`
        : `Add your one allowed Super Admin (${activeSuperAdminCount}/${basicPlanAdditionalUserLimit} used)`
    : isProfessionalPlanWorkspace
      ? professionalPlanLimitReached
        ? `Professional plan limit reached — ${activeMemberCount}/${professionalPlanMaxUsers} users added.`
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
  const workspaceModuleOptions = useMemo(() => {
    const uniqueIds = Array.from(
      new Set(
        (Array.isArray(workspaceEnabledModuleIds) ? workspaceEnabledModuleIds : [])
          .map((item) => String(item || '').trim())
          .filter(Boolean),
      ),
    );
    return uniqueIds.map((id) => ({
      id,
      name:
        availableCoreModules.find((module) => module.id === id)?.name ||
        formatModuleLabel(id),
    }));
  }, [workspaceEnabledModuleIds, availableCoreModules]);
  const formatJoinedDate = (value) => {
    if (!value) {
      return '—';
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return '—';
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
      // role filter — show all transferred (no role filtering on transferred table)

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
    setExpandedDepartmentKey(department?.name || '');
    setShowDepartmentModal(true);
  };

  const handleAddEmployee = async () => {
    if (isAddingEmployee) return;
    if (selectedDepartment && employeeFormData.name && employeeFormData.email) {
      setIsAddingEmployee(true);
      try {
        await inviteOrganizationMember(axiosPrivate, {
          fullName: employeeFormData.name,
          email: employeeFormData.email,
          role: 'employee',
          departments: [selectedDepartment.id || ''],
        });
        await loadOrganization(selectedDepartment.id || '');
        setEmployeeFormData({ name: '', email: '' });
        setShowEmployeeModal(false);
        setActiveTab('users');
        toast.success(`Invite sent to ${employeeFormData.name}.`);
      } catch (error) {
        console.error("Failed to add employee", error);
        toast.error('Failed to send invite. Please try again.');
      } finally {
        setIsAddingEmployee(false);
      }
    }
  };

  const handleSendInvite = async () => {
    if (isSendingInvite) return;
    if (teamMemberFormData.name && teamMemberFormData.email) {
      setIsSendingInvite(true);
      try {
        const normalizedRole =
          teamMemberFormData.role === 'super-admin'
            ? 'super_admin'
            : teamMemberFormData.role === 'admin-manager'
              ? 'admin_manager'
              : teamMemberFormData.role;
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
        toast.error('Failed to send invite. Please try again.');
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
    setAccessTogglePendingMemberId(id);
    try {
      await toggleOrganizationMemberStatus(axiosPrivate, id);
      toast.success(nextEnabled ? 'Access enabled' : 'Access disabled');
      await loadOrganization(selectedDepartment?.id || null);
    } catch (error) {
      console.error("Failed to update member status", error);
      toast.error('Failed to update access.');
    } finally {
      setAccessTogglePendingMemberId('');
    }
  };

  const handleRoleChange = (member: TeamMember, nextRole: string) => {
    if (!canChangeRoleByAccess) {
      toast.error('You do not have access to change roles.');
      return;
    }
    const memberId = String(member.id || '').trim();
    if (!memberId) return;

    const departmentIds = (Array.isArray(member.departmentNames) ? member.departmentNames : [])
      .map((departmentName) =>
        departments.find(
          (department) =>
            String(department?.name || '').trim().toLowerCase() ===
            String(departmentName || '').trim().toLowerCase(),
        )?.id,
      )
      .filter((id): id is string => Boolean(id));

    updateOrganizationMemberRole(axiosPrivate, memberId, {
      role: nextRole,
      departments: departmentIds,
    })
      .then(() => {
        toast.success('Member role updated.');
        return loadOrganization(selectedDepartment?.id || null);
      })
      .catch((error) => {
        console.error('Failed to update role', error);
        toast.error(error?.response?.data?.message || 'Failed to update role.');
      });
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
    if (!canManageDepartments) {
      toast.error('Only founder can create departments.');
      return;
    }

    if (!newDepartmentForm.name.trim()) {
      toast.error('Department name is required.');
      return;
    }

    if (newDepartmentForm.moduleIds.length === 0) {
      toast.error('Select at least one core module.');
      return;
    }

    try {
      const founderAndSuperAdminIds = teamMembers
        .filter((member) => {
          const role = normalizeRoleValue(member.role);
          return role === 'owner' || role === 'founder' || role === 'super-admin' || role === 'super_admin';
        })
        .map((member) => String(member.userId || member.id || '').trim())
        .filter(Boolean);
      const mergedAdminUserIds = Array.from(
        new Set([...(newDepartmentForm.adminUserIds || []), ...founderAndSuperAdminIds]),
      );
      await saveOrganizationDepartment(axiosPrivate, {
        name: newDepartmentForm.name.trim(),
        description: newDepartmentForm.description.trim(),
        moduleIds: newDepartmentForm.moduleIds,
        managerUserId: newDepartmentForm.managerUserId || '',
        adminUserIds: mergedAdminUserIds,
        employeeUserIds: newDepartmentForm.employeeUserIds,
        isActive: true,
      });
      toast.success('Department created successfully.');
      setNewDepartmentForm({
        name: '',
        description: '',
        moduleIds: [],
        managerUserId: '',
        adminUserIds: [],
        employeeUserIds: [],
      });
      await loadOrganization(null);
    } catch (error) {
      console.error('Failed to create department', error);
      toast.error('Failed to create department.');
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
          <button onClick={() => setActiveTab('users')} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
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
            <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Platform Users</p>
            <p className="text-[15px] font-pmedium text-slate-900">{teamMembers.length}</p>
          </div>
          <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><Shield size={16}/></div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
          <div className="min-w-0">
            <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Total Depts</p>
            <p className={`text-[15px] font-pmedium ${canAccessDepartmentsTab ? 'text-slate-900' : 'text-slate-300'}`}>
              {canAccessDepartmentsTab ? departments.length : '--'}
            </p>
          </div>
          <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><Building2 size={16}/></div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
          <div className="min-w-0">
            <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">Global Headcount</p>
            <p className={`text-[15px] font-pmedium ${canAccessDepartmentsTab ? 'text-slate-900' : 'text-slate-300'}`}>
              {canAccessDepartmentsTab ? totalEmployees : '--'}
            </p>
          </div>
          <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><Users size={16}/></div>
        </div>
        <button
          type="button"
          title={addUserHoverMessage}
          disabled={!canAddUserOnCurrentPlan}
          className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all text-left w-full border-l-4 border-l-emerald-500 ${
            canAddUserOnCurrentPlan
              ? 'hover:shadow-md cursor-pointer'
              : 'opacity-60 cursor-not-allowed'
          }`}
          onClick={() => {
            setActiveTab('users');
            setTeamMemberFormData({ name: '', email: '', role: isBasicPlanWorkspace ? 'super-admin' : 'manager', departments: [] });
            setShowTeamMemberModal(true);
          }}>
          <div className="min-w-0">
            <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Quick Action</p>
            <p className="text-[15px] font-pmedium text-slate-900 flex items-center gap-1.5">
              {!canAddUserOnCurrentPlan ? <Lock size={12} /> : null}
              Add User
            </p>
            {/* <p className="text-[10px] font-pmedium text-slate-400 mt-1">{addUserHoverMessage}</p>
            {isBasicPlanWorkspace && (
              <p className="text-[10px] font-pmedium text-slate-400 mt-0.5">
                {activeSuperAdminCount} of {basicPlanAdditionalUserLimit} additional user added
              </p>
            )}
            {isProfessionalPlanWorkspace && (
              <p className="text-[10px] font-pmedium text-slate-400 mt-0.5">
                {activeMemberCount} of {professionalPlanMaxUsers} users added
              </p>
            )} */}
          </div>
          <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><UserPlus size={16}/></div>
        </button>
      </div>

      

      {/* ========================================== */}
      {/* TAB 1: PLATFORM USERS (DEFAULT)            */}
      {/* ========================================== */}
      {activeTab === 'users' && (
        <>
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          {/* HEADER: status sub-tabs on left, search + filters + actions on right */}
          <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
            <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
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
              <div className="relative min-w-[180px]">
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
                    <option disabled className="text-slate-300">── DEPARTMENTS ──</option>
                    {departments.map((department) => (
                      <option key={department.id} value={`dept:${department.id}`}>
                        {normalizeDepartmentLabel(department.name)}
                      </option>
                    ))}
                    <option disabled className="text-slate-300">─── ROLES ───</option>
                    <option value="role:owner">Founder</option>
                    <option value="role:super-admin">Super Admin</option>
                    <option value="role:admin">Admin</option>
                    <option value="role:manager">Manager</option>
                    <option value="role:employee">Employee</option>
                  </select>
                  <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-[#2563EB] pointer-events-none" />
                </div>
                {isBasicPlanWorkspace && (
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    {activeSuperAdminCount}/{basicPlanAdditionalUserLimit} additional user added
                  </p>
                )}
                {isProfessionalPlanWorkspace && (
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    {activeMemberCount}/{professionalPlanMaxUsers} users added
                  </p>
                )}
                <button
                  title={addUserHoverMessage}
                  onClick={() => {
                    setTeamMemberFormData({ name: '', email: '', role: isBasicPlanWorkspace ? 'super-admin' : 'manager', departments: [] });
                    setShowTeamMemberModal(true);
                  }}
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
          <table className="w-full text-left">
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
                      <span className="font-pmedium text-slate-800 text-[12px]">{member.employeeId || '—'}</span>
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
                      <button
                        title="View Details"
                        onClick={() => setViewingMember(member)}
                        className="p-2 rounded-xl bg-white border border-slate-200/60 text-slate-400 hover:text-[#2563EB] hover:border-blue-200 hover:bg-blue-50 transition-all active:scale-95 shadow-sm"
                      >
                        <Eye size={15} />
                      </button>
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
              <h3 className="text-[13px] font-bold text-slate-900">Transferred References</h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
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
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">Departments</h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Review existing departments and enable the ones that were missed during setup.
              </p>
            </div>
            {canCreateDepartmentByAccess ? (
              <button
                type="button"
                onClick={() => openDepartmentModal(null)}
                className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
              >
                <Plus size={13} strokeWidth={3} /> CREATE DEPARTMENT
              </button>
            ) : null}

          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
           {departments.map((dept) => (
            <div key={dept.id} onClick={() => { setSelectedDepartment(dept); setView('detail'); }} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col relative cursor-pointer">
              <div className={`h-2 w-full ${getDepartmentToneClass(dept)}`}></div>
              <div className="p-3.5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-[15px] font-pmedium text-slate-900 transition-colors">{dept.name}</h3>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{dept.description}</p>
                  </div>
                  </div>
                
                <div className="mt-auto pt-2.5 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={statusPillClass("Manager")}>Manager</span>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-md ${dept.managerName ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {dept.managerName || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={statusPillClass("Team Size")}>Team Size</span>
                    <span className="font-bold text-slate-800 text-[11px]">{dept.employeeCount} <span className="text-slate-400 text-[10px] font-medium">Staff</span></span>
                  </div>
                    <div className="space-y-2">
                      <span className={statusPillClass("Selected Members")}>Selected Members</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(dept.employees || []).slice(0, 3).map((employee) => (
                          <span key={employee.id} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-bold tracking-wide">
                            {employee.employeeId ? `${employee.employeeId} · ` : ''}{employee.name}
                          </span>
                        ))}
                      {(dept.employees || []).length > 3 && (
                        <span className={statusPillClass("+")}>
                          +{(dept.employees || []).length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
                  <h1 className="text-xl font-black text-slate-900">{selectedDepartment.name}</h1>
                </div>
                <p className="text-[12px] text-slate-500 max-w-2xl leading-relaxed">{selectedDepartment.description}</p>
              </div>
              <div className="flex gap-2.5 w-full md:w-auto">
                {canAssignManagerByAccess ? (
                  <button
                    onClick={() => setShowAssignManagerModal(true)}
                    className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-pmedium text-[12px] transition-all shadow-sm hover:bg-slate-50"
                  >
                    Assign Manager
                  </button>
                ) : null}
                <button
                  onClick={() => setShowEmployeeModal(true)}
                  disabled={!canInviteUsersByAccess}
                  className="flex-1 md:flex-none px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl font-pmedium text-[12px] transition-all shadow-sm shadow-blue-200 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus size={16}/> Add Employee
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5 pt-5 border-t border-slate-100">
               <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                 <p className="text-[11px] font-pmedium text-slate-400 uppercase tracking-widest mb-2">Assigned Manager</p>
                 {selectedDepartment.managerName ? (
                   <p className="font-bold text-emerald-700 flex items-center gap-2"><CheckCircle2 size={16}/> {selectedDepartment.managerName}</p>
                 ) : (
                   <p className="font-bold text-amber-600 flex items-center gap-2"><AlertCircle size={16}/> Action Required</p>
                 )}
               </div>
               <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                 <p className="text-[11px] font-pmedium text-slate-400 uppercase tracking-widest mb-1.5">Manager Transfer</p>
                 <p className="font-bold text-slate-800 leading-relaxed text-[12px]">
                   Change the department head when a manager leaves or access needs to move to another department lead.
                 </p>
               </div>
            </div>
            {Array.isArray(selectedDepartment.actingManagers) && selectedDepartment.actingManagers.length > 0 ? (
              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-[11px] font-pmedium text-blue-600 uppercase tracking-widest mb-3">Active Acting Managers</p>
                <div className="flex flex-wrap gap-3">
                  {selectedDepartment.actingManagers.map((assignment) => (
                    <div key={assignment.id || assignment.assignedUserId} className="flex items-center gap-3 rounded-2xl bg-white border border-blue-100 px-4 py-3">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{assignment.assignedUserName}</p>
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">
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
              <h3 className="text-[13px] font-bold text-slate-900">Department Roster</h3>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-5 py-4">Employee Info</th>
                    <th className="px-5 py-4">Employee ID</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Contact Details</th>
                    <th className="px-5 py-4">Join Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {(selectedDepartment?.employees ?? []).map((emp) => (
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
                          <span className="text-[12px] font-pmedium text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">{getRoleBadge(emp.role)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-[12px] text-slate-600"><Mail size={14} className="text-slate-400"/> {emp.email}</div>
                      </td>
                      <td className="px-5 py-4 text-[12px] font-pmedium text-slate-500">{formatJoinedDate((emp as any).joinedAt)}</td>
                    </tr>
                  ))}
                  {(selectedDepartment?.employees?.length ?? 0) === 0 && (
                    <tr><td colSpan={5} className="text-center py-20 text-slate-400 font-pmedium"><Users size={32} className="mx-auto mb-3 opacity-30"/>No personnel assigned.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-slate-900">Transferred From This Department</h3>
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
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] max-w-xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-pmedium text-primary">Add Employee</h2>
                <p className="text-xs text-[#2563EB] font-medium mt-1">Invite directly into {selectedDepartment.name}</p>
              </div>
              <button onClick={() => setShowEmployeeModal(false)} className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 sm:p-8 space-y-4">
              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-pmedium uppercase tracking-widest text-blue-600">Default Role</p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">Employee</p>
                </div>
                <div>
                  <p className="text-[11px] font-pmedium uppercase tracking-widest text-blue-600">Default Department</p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{selectedDepartment.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-pmedium text-slate-500 uppercase tracking-widest">Full Name *</label>
                  <input type="text" placeholder="John Doe" value={employeeFormData.name} onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-pmedium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-pmedium text-slate-500 uppercase tracking-widest">Email Address *</label>
                  <input type="email" placeholder="john@company.com" value={employeeFormData.email} onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-pmedium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowEmployeeModal(false)} disabled={isAddingEmployee} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-sm hover:bg-slate-50 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleAddEmployee} disabled={!employeeFormData.name || !employeeFormData.email || isAddingEmployee} className="flex-1 py-3 bg-[#2563EB] text-white rounded-xl font-pmedium text-sm shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {isAddingEmployee ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    Sending...
                  </>
                ) : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDepartmentModal && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] max-w-6xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70 max-h-[90vh]">
            <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-pmedium text-primary">Manage Departments</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Use the same platform department set from workspace setup. Enabled departments stay active, disabled ones stay hidden, and module configuration follows the same state.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDepartmentModal(false);
                  setExpandedDepartmentKey('');
                }}
                className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200 shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 lg:p-8 overflow-y-auto">
              {canManageDepartments && canCreateDepartmentByAccess ? (
                <div className="mt-5 rounded-[20px] border border-blue-100 bg-blue-50/40 px-4 py-4 sm:rounded-[22px]">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#2563EB]">Create Department (Founder)</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Department name"
                      value={newDepartmentForm.name}
                      onChange={(e) => setNewDepartmentForm((current) => ({ ...current, name: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={newDepartmentForm.description}
                      onChange={(e) => setNewDepartmentForm((current) => ({ ...current, description: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    />
                  </div>
                  <p className="mt-3 text-[11px] font-pmedium uppercase tracking-widest text-slate-500">Core Modules</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {workspaceModuleOptions.map((module) => {
                      const selected = newDepartmentForm.moduleIds.includes(module.id);
                      return (
                        <button
                          type="button"
                          key={`create-dept-module-${module.id}`}
                          onClick={() =>
                            setNewDepartmentForm((current) => ({
                              ...current,
                              moduleIds: selected
                                ? current.moduleIds.filter((id) => id !== module.id)
                                : [...current.moduleIds, module.id],
                            }))
                          }
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${selected ? 'border-[#2563EB] bg-[#2563EB] text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                        >
                          {module.name}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <select
                      value={newDepartmentForm.managerUserId}
                      onChange={(e) => setNewDepartmentForm((current) => ({ ...current, managerUserId: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    >
                      <option value="">Manager (optional)</option>
                      {teamMembers.map((member) => (
                        <option key={`manager-opt-${member.userId || member.id}`} value={member.userId || member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value=""
                      onChange={(e) => {
                        const value = e.target.value;
                        if (!value) return;
                        setNewDepartmentForm((current) => ({
                          ...current,
                          adminUserIds: current.adminUserIds.includes(value)
                            ? current.adminUserIds
                            : [...current.adminUserIds, value],
                        }));
                      }}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    >
                      <option value="">Add admin</option>
                      {teamMembers.map((member) => (
                        <option key={`admin-opt-${member.userId || member.id}`} value={member.userId || member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value=""
                      onChange={(e) => {
                        const value = e.target.value;
                        if (!value) return;
                        setNewDepartmentForm((current) => ({
                          ...current,
                          employeeUserIds: current.employeeUserIds.includes(value)
                            ? current.employeeUserIds
                            : [...current.employeeUserIds, value],
                        }));
                      }}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 font-pmedium text-primary"
                    >
                      <option value="">Add employee</option>
                      {teamMembers.map((member) => (
                        <option key={`employee-opt-${member.userId || member.id}`} value={member.userId || member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    {newDepartmentForm.adminUserIds.map((id) => (
                      <span key={`admin-badge-${id}`} className="rounded-full bg-white px-2 py-1 text-slate-600 border border-slate-200">
                        Admin: {teamMembers.find((member) => String(member.userId || member.id) === id)?.name || id}
                      </span>
                    ))}
                    {newDepartmentForm.employeeUserIds.map((id) => (
                      <span key={`employee-badge-${id}`} className="rounded-full bg-white px-2 py-1 text-slate-600 border border-slate-200">
                        Employee: {teamMembers.find((member) => String(member.userId || member.id) === id)?.name || id}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateDepartmentForFounder}
                    className="mt-3 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-pmedium uppercase tracking-wider text-white hover:bg-blue-700"
                  >
                    Create Department
                  </button>
                </div>
              ) : (
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  You do not have access to create departments.
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
              <button
                onClick={() => {
                  setShowDepartmentModal(false);
                  setExpandedDepartmentKey('');
                }}
                className="w-full sm:w-auto px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-sm hover:bg-slate-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDepartmentForFounder}
                disabled={!canManageDepartments || !canCreateDepartmentByAccess}
                className="w-full sm:w-auto px-5 py-3 bg-[#2563EB] text-white rounded-xl font-pmedium text-sm shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                Create Department
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
                <h2 className="text-xl font-bold text-slate-900">Department Leadership</h2>
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
                    <p className="text-sm font-bold text-slate-600">No department personnel available.</p>
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
                      <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-white font-bold text-sm ${selectedDepartment.managerId === manager.id || selectedDepartment.managerUserId === manager.userId ? 'bg-[#2563EB]' : 'bg-slate-300'}`}>
                        {manager.name?.charAt(0)}
                      </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{manager.name}</div>
                          {manager.employeeId && (
                            <div className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mt-0.5">
                              {manager.employeeId}
                            </div>
                          )}
                          <div className="text-[12px] text-slate-500 font-medium">{manager.email}</div>
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
                        <p className="text-sm font-bold text-slate-600">No eligible acting-manager candidates.</p>
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
                              <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-white font-bold text-sm ${isAssigned ? 'bg-[#2563EB]' : 'bg-slate-300'}`}>
                                {member.name ? member.name.charAt(0) : (member.email ? member.email.charAt(0) : '')}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 text-sm">{member.name}</div>
                                <div className="text-[12px] text-slate-500 font-medium">{member.email}</div>
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
                    <p className="text-[12px] font-pmedium text-slate-900">{viewingMember.employeeId || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1 flex items-center gap-1"><Mail size={10} /> Email</p>
                    <p className="text-[12px] font-pmedium text-slate-900 break-all">{viewingMember.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1 flex items-center gap-1"><Shield size={10} /> Access Role</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{getRoleBadge(viewingMember.role)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1 flex items-center gap-1"><Calendar size={10} /> Joined On</p>
                    <p className="text-[12px] font-pmedium text-slate-900">
                      {viewingMember.joinedAt ? new Date(viewingMember.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
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
                      : ['—'])
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

      {showTeamMemberModal && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70">
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-[#2563EB] text-white rounded-lg"><UserPlus size={16}/></span>
                  <h2 className="text-base lg:text-lg font-black tracking-tight text-slate-800 font-sans" style={{ fontFamily: "inherit" }}>
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
                  <input type="email" placeholder="Enter work email" value={teamMemberFormData.email} onChange={(e) => setTeamMemberFormData({ ...teamMemberFormData, email: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Platform Role *</label>
                <select
                  value={teamMemberFormData.role}
                  onChange={(e) =>
                    setTeamMemberFormData({
                      ...teamMemberFormData,
                      role: e.target.value,
                      departments:
                        e.target.value === 'super-admin'
                          ? departments.map((d) => d.id).filter((id): id is string => !!id)
                          : e.target.value === 'manager'
                            ? teamMemberFormData.departments.slice(0, 1)
                            : teamMemberFormData.departments,
                    })
                  }
                  disabled={isBasicPlanWorkspace}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                >
                   <option value="employee" disabled={isBasicPlanWorkspace}>Department Employee</option>
                   <option value="manager" disabled={isBasicPlanWorkspace}>Department Manager</option>
                   <option value="admin" disabled={isBasicPlanWorkspace}>Department Admin</option>
                   <option value="super-admin" disabled={!canInviteSuperAdmin}>Super Admin</option>
                </select>
                {isBasicPlanWorkspace ? (
                  <p className="text-[11px] text-amber-600 font-medium">
                    Basic plan only allows the founder to add one additional user, as Super Admin.
                  </p>
                ) : !canInviteSuperAdmin && (
                  <p className="text-[11px] text-amber-600 font-medium">
                    Only the founder can create a new Super Admin account.
                  </p>
                )}
              </div>

              {teamMemberFormData.role !== 'super-admin' ? (
                <div className="space-y-3 pt-2">
                  <label className="text-[11px] font-pmedium text-slate-500 uppercase tracking-widest flex items-center justify-between">
                    Assign Department
                    <span className="text-[#2563EB] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">{teamMemberFormData.departments.length} Selected</span>
                  </label>
                    <p className="text-[11px] text-slate-500 -mt-1">
                      Department managers stay attached to one department. Department admins and employees may cover multiple departments.
                    </p>
                    {isProfessionalPlanWorkspace && (
                      <p className="text-[11px] text-amber-600 font-medium -mt-1">
                        Professional plan only allows Administration, Sales, and Technology departments — upgrade to Custom for the rest.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                    {departments.map((dept) => {
                      const isSelected = dept.id ? teamMemberFormData.departments.includes(dept.id) : false;
                      const isAllowed = isDepartmentAllowedForPlan(dept.name);
                      return (
                        <button key={dept.id} disabled={!isAllowed} title={!isAllowed ? 'Not available on Professional plan.' : undefined} onClick={() => {
                            if (!isAllowed) return;
                            if (teamMemberFormData.role === 'manager') { setTeamMemberFormData({ ...teamMemberFormData, departments: dept.id ? [dept.id] : [] }); }
                            else { setTeamMemberFormData({ ...teamMemberFormData, departments: isSelected ? teamMemberFormData.departments.filter((departmentId) => departmentId !== dept.id) : dept.id ? [...teamMemberFormData.departments, dept.id] : teamMemberFormData.departments }); }
                          }}
                          className={`px-3 py-2 rounded-[10px] text-[12px] font-semibold border transition-all ${!isAllowed ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed' : isSelected ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-[#2563EB] hover:text-[#2563EB]'}`}
                        >
                          {!isAllowed ? <Lock size={10} className="inline mr-1" /> : null}
                          {dept.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50/50 p-4 rounded-2xl flex gap-3 items-center border border-blue-100">
                   <div className="p-2 bg-white rounded-xl shadow-sm"><Crown className="text-[#2563EB]" size={20}/></div>
                   <p className="text-[12px] font-medium text-slate-700 leading-relaxed">Super Admins automatically receive top-level access to ALL departments and platform modules.</p>
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
                  !canAddUserOnCurrentPlan ||
                  (teamMemberFormData.role !== 'super-admin' && teamMemberFormData.departments.length === 0) ||
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


