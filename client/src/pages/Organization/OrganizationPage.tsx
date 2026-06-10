import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Building2, Plus, Trash2, X, Users, UserPlus, ArrowLeft,
  Mail, Calendar, Briefcase, Shield, Send, DollarSign, Wrench,
  CheckCircle2, Search, Crown, CheckSquare, 
  Power, AlertCircle, Lock
} from 'lucide-react';
import { Switch } from '@mui/material';
import useAuth from '../../hooks/useAuth';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import PageFrame from '../../components/Pages/PageFrame';
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

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("hostpanel_auth_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const updateStoredUser = (user) => {
  try {
    localStorage.setItem("hostpanel_auth_user", JSON.stringify(user || null));
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
  const [departmentFilter, setDepartmentFilter] = useState('all');
  
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

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [transferredTeamMembers, setTransferredTeamMembers] = useState<TeamMember[]>([]);
  const [, setWorkspacePlan] = useState('basic');
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
      setDepartmentFilter((current) =>
        current === 'all' || visibleDepartments.some((department) => department.id === current)
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
    setDepartmentFilter('all');
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
  const canAddUserOnCurrentPlan = canAccessUsersTab && canInviteUsersByAccess;
  const addUserHoverMessage = canAddUserOnCurrentPlan
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
      const matchesDepartment =
        departmentFilter === 'all' ||
        memberDepartments.some(
          (department) =>
            department.toLowerCase() ===
            (departments.find((dept) => dept.id === departmentFilter)?.name || '').toLowerCase(),
        );

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [teamMembers, searchQuery, statusFilter, departmentFilter, departments]);

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

      const matchesDepartment =
        departmentFilter === 'all' ||
        memberDepartments.some(
          (department) =>
            department.toLowerCase() ===
            (departments.find((dept) => dept.id === departmentFilter)?.name || '').toLowerCase(),
        );

      return matchesSearch && matchesDepartment;
    });
  }, [transferredTeamMembers, searchQuery, departmentFilter, departments]);

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

  const handleAddEmployee = () => {
    if (selectedDepartment && employeeFormData.name && employeeFormData.email) {
      inviteOrganizationMember(axiosPrivate, {
        fullName: employeeFormData.name,
        email: employeeFormData.email,
        role: 'employee',
        departments: [selectedDepartment.id || ''],
      })
        .then(() => loadOrganization(selectedDepartment.id || ''))
        .then(() => {
          setEmployeeFormData({ name: '', email: '' });
          setShowEmployeeModal(false);
          setActiveTab('users');
          toast.success(`Invite sent to ${employeeFormData.name}.`);
        })
        .catch((error) => {
          console.error("Failed to add employee", error);
        });
    }
  };

  const handleSendInvite = () => {
    if (teamMemberFormData.name && teamMemberFormData.email) {
      const normalizedRole =
        teamMemberFormData.role === 'super-admin'
          ? 'super_admin'
          : teamMemberFormData.role === 'admin-manager'
            ? 'admin_manager'
            : teamMemberFormData.role;
      inviteOrganizationMember(axiosPrivate, {
        fullName: teamMemberFormData.name,
        email: teamMemberFormData.email,
        role: normalizedRole,
        departments: teamMemberFormData.departments,
      })
        .then(() => loadOrganization())
        .then(() => {
          toast.success(`Invitation sent to ${teamMemberFormData.email}.`);
          setShowTeamMemberModal(false);
          setTeamMemberFormData({ name: '', email: '', role: 'manager', departments: [] });
        })
        .catch((error) => {
          console.error("Failed to send invite", error);
        });
    }
  };

  const toggleMemberStatus = (id) => {
    if (!canToggleAccessByAccess) {
      toast.error('You do not have access to toggle user status.');
      return;
    }
    toggleOrganizationMemberStatus(axiosPrivate, id)
      .then(() => loadOrganization(selectedDepartment?.id || null))
      .catch((error) => {
        console.error("Failed to update member status", error);
      });
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
      case 'owner': return <span className="px-3 py-1 bg-[#111827] text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><Crown size={12}/> Founder</span>;
      case 'super-admin': return <span className="px-3 py-1 bg-[#2563EB]/10 text-[#2563EB] rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><Crown size={12}/> Super Admin</span>;
      case 'admin-manager': return <span className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><Shield size={12}/> Admin Manager</span>;
      case 'admin': return <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><Shield size={12}/> Department Admin</span>;
      case 'manager': return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><Briefcase size={12}/> Dept Manager</span>;
      case 'employee': return <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><Users size={12}/> Employee</span>;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'joined':
        return <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 w-max">Joined</span>;
      case 'accepted':
        return <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 w-max">Accepted</span>;
      case 'pending':
        return <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 w-max">Pending</span>;
      case 'invited':
        return <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-violet-100 text-violet-700 w-max">Invited</span>;
      case 'disabled':
        return <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-700 w-max">Disabled</span>;
      default:
        return <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 w-max">{status || 'Unknown'}</span>;
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
    return (
      <div className="p-6 lg:p-8">Loading organization...</div>
    );
  }

  return (
    <>
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
      
      {/* HEADER & TOP KPIs */}
      <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
        <div>
          <h2 className="text-title font-pmedium text-primary uppercase">Organization Management</h2>
          <p className="text-xs font-medium text-slate-500 mt-1">Manage platform users and organization access.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div className="bg-white p-2.5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
           <div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Platform Users</p>
             <p className="text-[15px] font-black text-[#2563EB]">{teamMembers.length}</p>
           </div>
           <div className="p-2 rounded-2xl bg-blue-50 text-[#2563EB]"><Shield size={16}/></div>
        </div>
        <div className="bg-white p-2.5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
           <div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Depts</p>
             <p className={`text-[15px] font-black ${canAccessDepartmentsTab ? 'text-slate-800' : 'text-slate-300'}`}>
               {canAccessDepartmentsTab ? departments.length : '--'}
             </p>
           </div>
           <div className="p-2 rounded-2xl bg-slate-50 text-slate-600"><Building2 size={16}/></div>
        </div>
        <div className="bg-white p-2.5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
           <div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Global Headcount</p>
             <p className={`text-[15px] font-black ${canAccessDepartmentsTab ? 'text-emerald-600' : 'text-slate-300'}`}>
               {canAccessDepartmentsTab ? totalEmployees : '--'}
             </p>
           </div>
           <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600"><Users size={16}/></div>
        </div>
        <button
          type="button"
          title={addUserHoverMessage}
          disabled={!canAddUserOnCurrentPlan}
          className={`relative overflow-hidden bg-gradient-to-br from-[#0b3aa8] via-[#1d4ed8] to-[#2563EB] p-2.5 rounded-[2rem] border border-blue-300/40 shadow-lg shadow-blue-300/40 flex justify-between items-center transition-all group text-left w-full ${
            canAddUserOnCurrentPlan
              ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1'
              : 'opacity-60 cursor-not-allowed'
          }`}
          onClick={() => {
            setActiveTab('users');
            setTeamMemberFormData({
              name: '',
              email: '',
              role: 'manager',
              departments: [],
            });
            setShowTeamMemberModal(true);
          }}>
          <div className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-white/15 blur-[1px]" />
           <div>
              <p className="text-[10px] font-black text-blue-100/90 uppercase tracking-widest mb-1">Quick Action</p>
             <p className="text-[13px] font-black text-white group-hover:scale-105 transition-transform origin-left flex items-center gap-1.5">
               {!canAddUserOnCurrentPlan ? <Lock size={12} /> : null}
               Add User
             </p>
             <p className="text-[10px] mt-1 text-blue-100/90 font-semibold">{addUserHoverMessage}</p>
           </div>
           <div className="p-2 rounded-2xl bg-white/20 text-white border border-white/30"><UserPlus size={16}/></div>
        </button>
      </div>

      {/* CUSTOM TABS */}
      <div className="flex bg-white p-1 rounded-2xl w-full md:w-max mb-3 shadow-sm border border-slate-200/60 overflow-x-auto">
        <button onClick={() => setActiveTab('users')} className={`flex-1 md:px-5 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'users' ? 'bg-[#2563EB] shadow-sm text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
          <Shield size={16}/> PLATFORM USERS
        </button>
        <button
          title={!canAccessDepartmentsTab ? 'You do not have access to departments.' : ''}
          disabled={!canAccessDepartmentsTab}
          onClick={() => { setActiveTab('departments'); setView('list'); }}
          className={`flex-1 md:px-5 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            !canAccessDepartmentsTab
              ? 'text-slate-300 cursor-not-allowed'
              : activeTab === 'departments'
                ? 'bg-[#2563EB] shadow-sm text-white'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}>
          <Building2 size={16}/> DEPARTMENTS {!canAccessDepartmentsTab ? <Lock size={12} /> : null}
        </button>
      </div>

      {/* ========================================== */}
      {/* TAB 1: PLATFORM USERS (DEFAULT)            */}
      {/* ========================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-110">
          
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-2.5 shrink-0">
              <div className="relative w-full md:w-88">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" placeholder="Search platform users..." 
                  className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
              <button
                title={addUserHoverMessage}
                onClick={() => {
                  setTeamMemberFormData({
                    name: '',
                    email: '',
                    role: 'manager',
                    departments: [],
                  });
                  setShowTeamMemberModal(true);
                }}
                disabled={!canAddUserOnCurrentPlan}
                className={`w-full md:w-auto px-3.5 py-2.5 rounded-2xl font-bold text-[11px] leading-none transition-all shadow-sm inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  canAddUserOnCurrentPlan
                    ? 'bg-[#2563EB] hover:bg-blue-700 text-white shadow-blue-200'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}>
              <Plus size={13}/> Add User
              </button>
            </div>

            <div className="px-4 pb-3.5 flex flex-col md:flex-row gap-2.5 md:gap-3">
              <div className="w-full md:w-48">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="joined">Joined</option>
                  <option value="invited">Invited</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              <div className="w-full md:w-60">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Department</label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {normalizeDepartmentLabel(department.name)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 p-2">
            <table className="w-full text-left">
              <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 sticky top-0 bg-white z-10">
                <tr>
                  <th className="px-3.5 py-2">Platform User</th>
                  <th className="px-3.5 py-2">Access Role</th>
                  <th className="px-3.5 py-2">Department</th>
                  <th className="px-3.5 py-2">Status</th>
                  <th className="px-4 py-3 text-right">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTeamMembers.map((member) => {
                  const normalizedRole = normalizeRoleValue(member.role);
                  const normalizedDepartments = Array.isArray(member.departmentNames)
                    ? member.departmentNames.filter(Boolean)
                    : [];
                  const hasAllDepartmentsAccess =
                    (normalizedRole === 'owner' || normalizedRole === 'super-admin') &&
                    (normalizedDepartments.length === 0 ||
                      (departments.length > 0 && normalizedDepartments.length >= departments.length));
                  const departmentBadges = hasAllDepartmentsAccess
                    ? ['All Departments']
                    : normalizedDepartments;

                  return (
                  <tr key={member.id} className={`transition-all ${normalizedRole === 'owner' ? 'bg-slate-50/50' : member.status === 'disabled' ? 'bg-slate-50/50 opacity-75' : 'hover:bg-blue-50/30'}`}>
                    <td className="px-3.5 py-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[10px] shadow-sm ${normalizedRole === 'owner' ? 'bg-[#111827]' : 'bg-gradient-to-br from-[#2563EB] to-blue-700'}`}>
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <div className="font-bold text-[11px] text-slate-900">{member.name}</div>
                          <div className="text-[10px] font-medium text-slate-500">{member.email}</div>
                          {member.employeeId && (
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
                              {member.employeeId}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-2">{getRoleBadge(member.role)}</td>
                    <td className="px-3.5 py-2">
                      <div className="flex flex-wrap gap-1.5 max-w-56">
                        {departmentBadges.map((dept, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-bold tracking-wide">{normalizeDepartmentLabel(dept)}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3.5 py-2">
                      <div className="flex items-center justify-center">
                        {getStatusBadge(member.status)}
                      </div>
                    </td>
                    <td className="px-3.5 py-2">
                      <div className="flex flex-col items-end justify-center gap-1.5">
                        {(() => {
                          const isSelf = member.userId && String(member.userId) === currentUserId;
                          const isProtectedSelf = isSelf && normalizeRoleValue(member.role) === 'super-admin';
                          const canToggleAccess =
                            canToggleAccessByAccess &&
                            !isProtectedSelf &&
                            member.role !== 'owner' &&
                            ['joined', 'disabled'].includes(member.status ?? '');

                          return (
                        <div
                          onClick={() => canToggleAccess && toggleMemberStatus(member.id)}
                          className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-all duration-300 ${member.role === 'owner' || isProtectedSelf ? 'bg-slate-200 cursor-not-allowed' : member.status === 'joined' ? 'bg-emerald-500 cursor-pointer shadow-inner' : member.status === 'disabled' ? 'bg-red-500 cursor-pointer shadow-inner' : 'bg-amber-200 cursor-not-allowed'}`}
                          title={member.role === 'owner' ? 'Founder access' : isProtectedSelf ? 'Super admin access cannot be disabled' : member.status === 'joined' ? 'Disable access' : member.status === 'disabled' ? 'Enable access' : 'Pending Invite'}
                        >
                          <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-sm transition-all duration-300 flex items-center justify-center ${member.role === 'owner' || isProtectedSelf ? 'translate-x-0' : member.status === 'joined' ? 'translate-x-5' : 'translate-x-0'}`}>
                            {member.role === 'owner' || isProtectedSelf ? <Crown size={10} className="text-slate-500"/> : member.status === 'joined' ? <CheckCircle2 size={10} className="text-emerald-500"/> : member.status === 'disabled' ? <Power size={10} className="text-red-500"/> : null}
                          </div>
                        </div>
                          );
                        })()}
                        <span className={`text-[10px] font-bold ${(member.role === 'owner' || (member.userId && String(member.userId) === currentUserId && normalizeRoleValue(member.role) === 'super-admin')) ? 'text-slate-500' : member.status === 'joined' ? 'text-emerald-600' : member.status === 'disabled' ? 'text-red-600' : 'text-amber-500'}`}>
                          {member.role === 'owner'
                            ? 'Founder'
                            : (member.userId && String(member.userId) === currentUserId && normalizeRoleValue(member.role) === 'super-admin')
                              ? 'Self Protected'
                              : member.status === 'joined'
                                ? 'Access On'
                                : member.status === 'disabled'
                                  ? 'Access Off'
                                  : 'Invite Sent'}
                        </span>
                        {canChangeRoleByAccess && member.role !== 'owner' ? (
                          <select
                            value={normalizeRoleValue(member.role)}
                            onChange={(e) => handleRoleChange(member, e.target.value)}
                            className="mt-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700"
                          >
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )})}
                {filteredTeamMembers.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-bold"><Shield size={32} className="mx-auto mb-3 opacity-50"/>No platform users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {shouldShowTransferredReferences ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Transferred References</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">
                These users are no longer counted in this workspace and are shown here only for record keeping.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-widest">
              {filteredTransferredTeamMembers.length} Recorded
            </span>
          </div>
          <div className="overflow-x-auto p-2">
            <table className="w-full text-left">
              <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Previous Role</th>
                  <th className="px-6 py-4">Departments</th>
                  <th className="px-6 py-4">Transferred To</th>
                  <th className="px-6 py-4">Transfer Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTransferredTeamMembers.map((member) => (
                  <tr key={`transferred-${member.id}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-black font-bold text-sm shadow-sm bg-slate-400">
                          {member.name?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{member.name}</div>
                          <div className="text-[12px] font-medium text-slate-500 mt-0.5">{member.email}</div>
                          {member.employeeId ? (
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
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
                          <span key={`${member.id}-${dept}-${index}`} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold tracking-wide">
                            {normalizeDepartmentLabel(dept)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900">{member.transferredToWorkspaceName || 'Linked Workspace'}</div>
                        <div className="text-[12px] font-medium text-slate-500">
                          {member.transferredToWorkspaceLocation || 'Location not set'}
                        </div>
                        {((member as TeamMember & { nextRole?: string }).nextRole) ? (
                          <div className="text-[10px] font-black uppercase tracking-widest text-[#2563EB]">
                            Now {(member as TeamMember & { nextRole?: string }).nextRole!.replace(/_/g, ' ')}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-medium text-slate-500">
                      {formatTransferDate((member as TeamMember & { transferredAt?: string }).transferredAt)}
                    </td>
                  </tr>
                ))}
                {filteredTransferredTeamMembers.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-bold"><ArrowLeft size={32} className="mx-auto mb-3 opacity-30 rotate-45"/>No transferred users recorded for this workspace.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        ) : null}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: DEPARTMENTS & ROSTER                */}
      {/* ========================================== */}
      {activeTab === 'departments' && view === 'list' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <h2 className="font-sans text-base lg:text-lg font-black tracking-tight text-slate-800" style={{ fontFamily: "inherit" }}>Departments</h2>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Review existing departments and enable the ones that were missed during setup.
              </p>
            </div>
            {canCreateDepartmentByAccess ? (
              <button
                type="button"
                onClick={() => openDepartmentModal(null)}
                className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-[11px] font-black uppercase tracking-widest hover:bg-blue-700"
              >
                Create Department
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
                    <h3 className="text-[15px] font-bold text-slate-900 transition-colors">{dept.name}</h3>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{dept.description}</p>
                  </div>
                  </div>
                
                <div className="mt-auto pt-2.5 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Briefcase size={12}/> Manager</span>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-md ${dept.managerName ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {dept.managerName || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Users size={12}/> Team Size</span>
                    <span className="font-bold text-slate-800 text-[11px]">{dept.employeeCount} <span className="text-slate-400 text-[10px] font-medium">Staff</span></span>
                  </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Users size={12}/> Selected Members</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(dept.employees || []).slice(0, 3).map((employee) => (
                          <span key={employee.id} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-bold tracking-wide">
                            {employee.employeeId ? `${employee.employeeId} · ` : ''}{employee.name}
                          </span>
                        ))}
                      {(dept.employees || []).length > 3 && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-[#2563EB] rounded-md text-[9px] font-bold tracking-wide">
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
          <button onClick={() => setView('list')} className="mb-4 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl font-bold text-[11px] transition-all flex items-center gap-2 shadow-sm">
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
                    className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-[12px] transition-all shadow-sm hover:bg-slate-50"
                  >
                    Assign Manager
                  </button>
                ) : null}
                <button
                  onClick={() => setShowEmployeeModal(true)}
                  disabled={!canInviteUsersByAccess}
                  className="flex-1 md:flex-none px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl font-bold text-[12px] transition-all shadow-sm shadow-blue-200 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus size={16}/> Add Employee
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5 pt-5 border-t border-slate-100">
               <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                 <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assigned Manager</p>
                 {selectedDepartment.managerName ? (
                   <p className="font-bold text-emerald-700 flex items-center gap-2"><CheckCircle2 size={16}/> {selectedDepartment.managerName}</p>
                 ) : (
                   <p className="font-bold text-amber-600 flex items-center gap-2"><AlertCircle size={16}/> Action Required</p>
                 )}
               </div>
               <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                 <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Manager Transfer</p>
                 <p className="font-bold text-slate-800 leading-relaxed text-[12px]">
                   Change the department head when a manager leaves or access needs to move to another department lead.
                 </p>
               </div>
            </div>
            {Array.isArray(selectedDepartment.actingManagers) && selectedDepartment.actingManagers.length > 0 ? (
              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest mb-3">Active Acting Managers</p>
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
                          className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-[11px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors"
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
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Department Roster</h2>
            </div>
            <div className="overflow-x-auto p-2">
              <table className="w-full text-left">
                <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Employee Info</th>
                    <th className="px-6 py-4">Employee ID</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Contact Details</th>
                    <th className="px-6 py-4">Join Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(selectedDepartment?.employees ?? []).map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 font-bold text-sm shadow-sm">
                            {emp.name?.split(' ').map((n) => n[0]).join('') ?? ''}
                          </div>
                          <div className="font-bold text-slate-900">{emp.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {emp.employeeId ? (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-blue-50 text-[#2563EB] text-[11px] font-black tracking-widest uppercase">
                            {emp.employeeId}
                          </span>
                        ) : (
                          <span className="text-[12px] font-medium text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{getRoleBadge(emp.role)}</td>
                      <td className="px-6 py-4 space-y-1.5">
                        <div className="flex items-center gap-2 text-[13px] text-slate-600"><Mail size={14} className="text-slate-400"/> {emp.email}</div>
                      </td>
                      <td className="px-6 py-4 text-[13px] font-medium text-slate-500">{formatJoinedDate((emp as any).joinedAt)}</td>
                    </tr>
                  ))}
                  {(selectedDepartment?.employees?.length ?? 0) === 0 && (
                    <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-medium"><Users size={32} className="mx-auto mb-3 opacity-30"/>No personnel assigned.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Transferred From This Department</h2>
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-widest">
                {(selectedDepartment as any)?.transferredEmployees?.length || 0} Recorded
              </span>
            </div>
            <div className="overflow-x-auto p-2">
              <table className="w-full text-left">
                <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Previous Role</th>
                    <th className="px-6 py-4">Transferred To</th>
                    <th className="px-6 py-4">Transfer Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {((selectedDepartment as any)?.transferredEmployees || []).map((emp: any) => (
                    <tr key={`dept-transfer-${emp.id}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 font-bold text-sm shadow-sm">
                            {emp.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{emp.name}</div>
                            <div className="text-[12px] font-medium text-slate-500">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getRoleBadge(emp.role)}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{emp.transferredToWorkspaceName || 'Linked Workspace'}</div>
                        <div className="text-[12px] font-medium text-slate-500">{emp.transferredToWorkspaceLocation || 'Location not set'}</div>
                      </td>
                      <td className="px-6 py-4 text-[13px] font-medium text-slate-500">{formatTransferDate(emp.transferredAt)}</td>
                    </tr>
                  ))}
                  {(!selectedDepartment.transferredEmployees || selectedDepartment.transferredEmployees.length === 0) && (
                    <tr><td colSpan={4} className="px-6 py-16 text-center text-slate-400 font-medium"><Users size={32} className="mx-auto mb-3 opacity-30"/>No transferred records for this department yet.</td></tr>
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
                <h2 className="text-xl font-bold text-slate-900">Add Employee</h2>
                <p className="text-xs text-[#2563EB] font-medium mt-1">Invite directly into {selectedDepartment.name}</p>
              </div>
              <button onClick={() => setShowEmployeeModal(false)} className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 sm:p-8 space-y-4">
              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600">Default Role</p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">Employee</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600">Default Department</p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{selectedDepartment.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Full Name *</label>
                  <input type="text" placeholder="John Doe" value={employeeFormData.name} onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Email Address *</label>
                  <input type="email" placeholder="john@company.com" value={employeeFormData.email} onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowEmployeeModal(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleAddEmployee} disabled={!employeeFormData.name || !employeeFormData.email} className="flex-2 py-3 bg-[#2563EB] text-white rounded-xl font-bold text-sm shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all">Send Invite</button>
            </div>
          </div>
        </div>
      )}

      {showDepartmentModal && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] max-w-6xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70 max-h-[90vh]">
            <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Manage Departments</h2>
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
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">Core Modules</p>
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
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
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
                    className="mt-3 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-blue-700"
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
                className="w-full sm:w-auto px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDepartmentForFounder}
                disabled={!canManageDepartments || !canCreateDepartmentByAccess}
                className="w-full sm:w-auto px-5 py-3 bg-[#2563EB] text-white rounded-xl font-bold text-sm shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                Create Department
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Primary Manager</p>
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
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
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
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Acting Managers</p>
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
                                  className="ml-auto px-3 py-2 rounded-xl bg-red-50 text-red-600 text-[11px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors"
                                >
                                  Remove
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAssignActingManager(member)}
                                  disabled={!canAssignActingManagerByAccess}
                                  className="ml-auto px-3 py-2 rounded-xl bg-[#2563EB] text-white text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name *</label>
                  <input type="text" placeholder="Enter full name" value={teamMemberFormData.name} onChange={(e) => setTeamMemberFormData({ ...teamMemberFormData, name: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Work Email *</label>
                  <input type="email" placeholder="Enter work email" value={teamMemberFormData.email} onChange={(e) => setTeamMemberFormData({ ...teamMemberFormData, email: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Platform Role *</label>
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                >
                   <option value="manager">Department Manager</option>
                   <option value="admin">Department Admin</option>
                   <option value="super-admin" disabled={!canInviteSuperAdmin}>Super Admin</option>
                </select>
                {!canInviteSuperAdmin && (
                  <p className="text-[11px] text-amber-600 font-medium">
                    Only the founder can create a new Super Admin account.
                  </p>
                )}
              </div>

              {teamMemberFormData.role !== 'super-admin' ? (
                <div className="space-y-3 pt-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                    Assign Department
                    <span className="text-[#2563EB] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">{teamMemberFormData.departments.length} Selected</span>
                  </label>
                    <p className="text-[11px] text-slate-500 -mt-1">
                      Department managers stay attached to one department. Department admins may cover multiple departments.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                    {departments.map((dept) => {
                      const isSelected = dept.id ? teamMemberFormData.departments.includes(dept.id) : false;
                      return (
                        <button key={dept.id} onClick={() => {
                            if (teamMemberFormData.role === 'manager') { setTeamMemberFormData({ ...teamMemberFormData, departments: dept.id ? [dept.id] : [] }); } 
                            else { setTeamMemberFormData({ ...teamMemberFormData, departments: isSelected ? teamMemberFormData.departments.filter((departmentId) => departmentId !== dept.id) : dept.id ? [...teamMemberFormData.departments, dept.id] : teamMemberFormData.departments }); }
                          }} 
                          className={`px-3 py-2 rounded-[10px] text-[12px] font-semibold border transition-all ${isSelected ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-[#2563EB] hover:text-[#2563EB]'}`}
                        >
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
              <button onClick={() => setShowTeamMemberModal(false)} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-[12px] hover:bg-slate-50 transition-colors shadow-sm">Cancel</button>
              <button
                onClick={handleSendInvite}
                disabled={
                  !teamMemberFormData.name ||
                  !teamMemberFormData.email ||
                  !canAddUserOnCurrentPlan ||
                  (teamMemberFormData.role !== 'super-admin' && teamMemberFormData.departments.length === 0) ||
                  (teamMemberFormData.role === 'super-admin' && !canInviteSuperAdmin)
                }
                className="flex-2 py-2.5 bg-[#2563EB] text-white rounded-xl font-bold text-[12px] shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <Send size={14}/> Send Secure Invite
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


