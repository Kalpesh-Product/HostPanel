// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Shield,
  Search,
  ChevronDown,
  X,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
  Users,
  Filter,
  UserCheck,
  UserCog,
} from 'lucide-react';
import PageFrame from '../../components/Pages/PageFrame';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAuth from '../../hooks/useAuth';


import { updateEmployeeAccess as updateEmployeeAccessRequest } from '../../services/hr';
import {
  getOrganizationOverview,
  linkOrganizationMember,
  transferOrganizationMember,
  transferOrganizationOwnership,
  updateOrganizationMemberRole,
} from '../../services/organization';

const ROLE_FILTERS = ['All Roles', 'Founder', 'Super-Admin', 'Admin', 'Manager', 'Employee'];
const TRANSFER_ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super-Admin' },
];

const VISITOR_ACTION_CHILDREN = [
  { id: 'visitors_tab_daily', label: 'Daily Visitors Tab', description: 'Access daily visitors tab on the start page.' },
  { id: 'visitors_tab_history', label: 'Visitor History Tab', description: 'Access visitor history tab on the start page.' },
  { id: 'visitors_tab_bookings', label: 'Bookings Tab', description: 'Access bookings tab on the start page.' },
  { id: 'visitors_tab_clients', label: 'Clients Tab', description: 'Access clients tab on the start page.' },
  { id: 'visitors_mode_standard', label: 'Standard Visitor Tab', description: 'Access Standard Visitor tab in New Frontdesk Action.' },
  { id: 'visitors_mode_workspace_tour', label: 'Unit Tour Tab', description: 'Access Unit Tour tab in New Frontdesk Action.' },
  { id: 'visitors_mode_walkin_booking', label: 'Walk-in Booking Tab', description: 'Access Walk-in Booking tab in New Frontdesk Action.' },
  { id: 'visitors_mode_verify_booking', label: 'Verify Booking Tab', description: 'Access Verify Booking ID tab in New Frontdesk Action.' },
];

const VISITOR_STANDARD_CHILDREN = [
  { id: 'visitors_standard_type_standard', label: 'Standard Subtab', description: 'Access Standard subtab inside Standard Visitor.' },
  { id: 'visitors_standard_type_department', label: 'Department Subtab', description: 'Access Department subtab inside Standard Visitor.' },
  { id: 'visitors_standard_type_tenant', label: 'Tenant Subtab', description: 'Access Tenant subtab inside Standard Visitor.' },
];

const VISITOR_PARENT_ALIASES = new Set([
  'visitor-management',
  'visitors-management',
  'manage_visitors',
]);

const ORGANIZATION_TAB_CHILDREN = [
  { id: 'org_tab_users', label: 'Platform Users Tab', description: 'Access users tab in Organization Management.' },
  { id: 'org_tab_departments', label: 'Departments Tab', description: 'Access departments tab in Organization Management.' },
];

const ORGANIZATION_USERS_ACTION_CHILDREN = [
  { id: 'org_users_invite_member', label: 'Invite Member', description: 'Invite/add users from Organization Management.' },
  { id: 'org_users_change_role', label: 'Change Role', description: 'Promote/demote and update member roles.' },
  { id: 'org_users_toggle_access', label: 'Toggle Access', description: 'Enable or disable member access.' },
];

const ORGANIZATION_DEPARTMENTS_ACTION_CHILDREN = [
  { id: 'org_departments_create', label: 'Create Department', description: 'Create new departments.' },
  { id: 'org_departments_edit', label: 'Edit Department', description: 'Update department details and configuration.' },
  { id: 'org_departments_assign_manager', label: 'Assign Manager', description: 'Assign department manager.' },
  { id: 'org_departments_assign_acting_manager', label: 'Assign Acting Manager', description: 'Assign acting manager for department.' },
  { id: 'org_departments_remove_acting_manager', label: 'Remove Acting Manager', description: 'Remove acting manager assignment.' },
];

const ORGANIZATION_PARENT_ALIASES = new Set([
  'organization-management',
]);

function Switch({ checked, disabled, onCheckedChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${
        checked ? 'bg-[#2563EB]' : 'bg-slate-300'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
          checked ? 'left-5' : 'left-0.5'
        }`}
      />
    </button>
  );
}

function isOwnerLikeMember(member = null) {
  const normalized = normalizeRole(member?.rawRole || '');
  return normalized === 'owner';
}

function normalizeRole(value = '') {
  return value.toString().trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function getRoleGroup(role = '') {
  const normalized = normalizeRole(role);

  if (normalized === 'owner') {
    return 'Founder';
  }

  if (normalized === 'super_admin' || normalized === 'superadmin') {
    return 'Super-Admin';
  }

  if (normalized === 'admin' || normalized === 'admin_manager') {
    return 'Admin';
  }

  if (
    normalized === 'manager' ||
    normalized === 'hr' ||
    normalized === 'hr_manager' ||
    normalized === 'sales_manager' ||
    normalized === 'finance_manager' ||
    normalized === 'tech_manager' ||
    normalized === 'it_manager' ||
    normalized === 'maintenance_manager' ||
    normalized === 'facilities_manager'
  ) {
    return 'Manager';
  }

  if (normalized === 'employee' || normalized === 'hr') {
    return 'Employee';
  }

  return normalized.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) || 'Employee';
}

function getRoleLabel(role = '') {
  const normalized = normalizeRole(role);

  if (normalized === 'owner') return 'Founder';
  if (normalized === 'super_admin' || normalized === 'superadmin') return 'Super-Admin';
  if (normalized === 'admin' || normalized === 'admin_manager') return 'Admin';

  if (
    normalized === 'manager' ||
    normalized === 'hr_manager' ||
    normalized === 'sales_manager' ||
    normalized === 'finance_manager' ||
    normalized === 'tech_manager' ||
    normalized === 'it_manager' ||
    normalized === 'maintenance_manager' ||
    normalized === 'facilities_manager'
  ) {
    return 'Manager';
  }

  if (normalized === 'hr') return 'HR Manager';

  if (normalized === 'employee') return 'Employee';

  return role
    .toString()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Employee';
}

function normalizeModuleKey(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
}

function expandModuleAliases(values = []) {
  // Keep only exact normalized ids to allow independent control across sections.
  return new Set(values.map((value) => normalizeModuleKey(value)).filter(Boolean));
}

function resolveCanonicalModuleId(rawValue = '', aliasToCanonical = new Map()) {
  const normalized = normalizeModuleKey(rawValue);
  const direct = aliasToCanonical.get(normalized);
  if (direct) return direct;

  if (normalized.startsWith('administration-')) {
    const withoutPrefix = normalized.slice('administration-'.length);
    if (withoutPrefix === 'visitor-management') {
      const adminVisitor = aliasToCanonical.get('visitors-management');
      if (adminVisitor) return adminVisitor;
    }
    const prefixedMatch = aliasToCanonical.get(withoutPrefix);
    if (prefixedMatch) return prefixedMatch;
  }

  if (normalized === 'housekeeping') {
    const housekeeping = aliasToCanonical.get('house-keeping');
    if (housekeeping) return housekeeping;
  }

  const segments = normalized.split('-').filter(Boolean);
  if (segments.length > 1) {
    const stripped = segments.slice(1).join('-');
    const strippedMatch = aliasToCanonical.get(stripped);
    if (strippedMatch) return strippedMatch;
  }

  return normalized;
}

function resolveDepartmentKey(value = '') {
  const normalized = normalizeModuleKey(value);
  if (normalized.includes('administration') || normalized === 'admin') return 'administration';
  if (normalized.includes('sales')) return 'sales';
  if (normalized.includes('finance') || normalized.includes('accounting')) return 'finance';
  if (normalized.includes('maintenance') || normalized.includes('facilities') || normalized.includes('operations')) return 'maintenance';
  if (normalized.includes('technology') || normalized.includes('tech')) return 'technology';
  if (normalized === 'it' || normalized.includes('information-technology')) return 'it';
  if (normalized.includes('hr')) return 'hr';
  return normalized;
}

function getRoleRank(role = '') {
  const group = getRoleGroup(role);
  if (group === 'Founder') return 4;
  if (group === 'Super-Admin') return 3;
  if (group === 'Admin') return 2;
  if (group === 'Manager') return 1;
  return 0;
}

function getNextHigherRole(role = '') {
  const group = getRoleGroup(role);
  if (group === 'Employee') return 'manager';
  if (group === 'Manager') return 'admin';
  if (group === 'Admin') return 'super_admin';
  return null;
}

function getNextLowerRole(role = '') {
  const group = getRoleGroup(role);
  if (group === 'Super-Admin') return 'admin';
  if (group === 'Admin') return 'manager';
  if (group === 'Manager') return 'employee';
  return null;
}

function getTransferRoleValue(role = '') {
  const group = getRoleGroup(role);

  if (group === 'Super-Admin') return 'super_admin';
  if (group === 'Admin') return 'admin';
  if (group === 'Manager') return 'manager';
  return 'employee';
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getDepartmentLabel(member = {}) {
  const departments = Array.isArray(member.departmentNames) && member.departmentNames.length > 0
    ? member.departmentNames
    : Array.isArray(member.departments)
      ? member.departments
      : [];

  if (departments.length === 0) {
    return 'All Departments';
  }

  return departments.join(' / ');
}

function mapOverviewMember(member = {}) {
  return {
    id: member.id || member.userId || member.email || member.name,
    userId: member.userId || null,
    name: member.name || member.fullName || 'Unknown',
    email: member.email || '',
    rawRole: member.role || 'employee',
    role: getRoleLabel(member.role),
    roleGroup: getRoleGroup(member.role),
    department: getDepartmentLabel(member),
    status: member.status || 'joined',
    departments: Array.isArray(member.departmentNames)
      ? member.departmentNames
      : Array.isArray(member.departments)
        ? member.departments
        : [],
    grantedModules: Array.isArray(member.grantedModules) ? member.grantedModules : [],
    enabledModules: Array.isArray(member.enabledModules) ? member.enabledModules : [],
    workspaceAccesses: Array.isArray(member.workspaceAccesses) ? member.workspaceAccesses : [],
  };
}

export default function AccessGrantsPage() {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const { auth, setAuth } = useAuth();
  const currentUser = auth?.user || null;
  const currentRole = normalizeRole(currentUser?.workspaceMembership?.role || currentUser?.role);
  const canEditAccessGrants = currentRole === 'owner' || currentRole === 'founder';
  const canManageModuleAccess =
    currentRole === 'owner' || currentRole === 'founder' || currentRole === 'super_admin';

  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleActionWarning, setRoleActionWarning] = useState(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showTransferWarning, setShowTransferWarning] = useState(false);
  const [transferTargetUserId, setTransferTargetUserId] = useState('');
  const [linkedWorkspaces, setLinkedWorkspaces] = useState([]);
  const [showWorkspaceTransferDialog, setShowWorkspaceTransferDialog] = useState(false);
  const [showWorkspaceLinkDialog, setShowWorkspaceLinkDialog] = useState(false);
  const [workspaceTransferForm, setWorkspaceTransferForm] = useState({
    targetWorkspaceId: '',
    role: 'employee',
    departmentIds: [],
    note: '',
  });
  const [workspaceLinkForm, setWorkspaceLinkForm] = useState({
    targetWorkspaceId: '',
    note: '',
  });
  const [showMemberAccessDialog, setShowMemberAccessDialog] = useState(false);
  const [memberAccessTarget, setMemberAccessTarget] = useState(null);
  const [memberAccessDraft, setMemberAccessDraft] = useState({});
  const [expandedAccessModules, setExpandedAccessModules] = useState({});
  const [expandedDepartmentGroups, setExpandedDepartmentGroups] = useState({});
  const [members, setMembers] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const enabledWorkspaceModuleKeys = useMemo(() => {
    const workspaceRaw = Array.isArray(workspace?.enabledModuleIds) ? workspace.enabledModuleIds : [];
    const raw = [...workspaceRaw];
    const expanded = raw.flatMap((value) => {
      const normalized = normalizeModuleKey(String(value || ''));
      if (!normalized) return [];
      const values = [normalized];
      if (normalized.startsWith('administration-')) {
        values.push(normalized.slice('administration-'.length));
      }
      return values;
    });
    const normalizedExpanded = new Set(expanded.map((value) => normalizeModuleKey(value)));
    if (normalizedExpanded.has('organization-management')) {
      [
        'org_tab_users',
        'org_tab_departments',
        'org_users_invite_member',
        'org_users_change_role',
        'org_users_toggle_access',
        'org_departments_create',
        'org_departments_edit',
        'org_departments_assign_manager',
        'org_departments_assign_acting_manager',
        'org_departments_remove_acting_manager',
      ].forEach((moduleId) => normalizedExpanded.add(normalizeModuleKey(moduleId)));
    }
    return normalizedExpanded;
  }, [workspace?.enabledModuleIds]);

  const getModuleChildren = (moduleId = '') => {
    const normalized = normalizeModuleKey(moduleId);
    const isEnabled = (key = '') => enabledWorkspaceModuleKeys.has(normalizeModuleKey(key));
    if (VISITOR_PARENT_ALIASES.has(normalized)) {
      const hasAnyStandardSubtype =
        isEnabled('visitors_standard_type_standard') ||
        isEnabled('visitors_standard_type_department') ||
        isEnabled('visitors_standard_type_tenant');
      return VISITOR_ACTION_CHILDREN.filter((child) => {
        const childKey = normalizeModuleKey(child.id);
        if (childKey === 'visitors-mode-standard') {
          return isEnabled(childKey) || hasAnyStandardSubtype;
        }
        return isEnabled(childKey);
      });
    }
    if (normalized === 'visitors-mode-standard') {
      return VISITOR_STANDARD_CHILDREN.filter((child) =>
        enabledWorkspaceModuleKeys.has(normalizeModuleKey(child.id)),
      );
    }
    if (ORGANIZATION_PARENT_ALIASES.has(normalized)) {
      return ORGANIZATION_TAB_CHILDREN.filter((child) => isEnabled(child.id));
    }
    if (normalized === 'org-tab-users') {
      return ORGANIZATION_USERS_ACTION_CHILDREN.filter((child) => isEnabled(child.id));
    }
    if (normalized === 'org-tab-departments') {
      return ORGANIZATION_DEPARTMENTS_ACTION_CHILDREN.filter((child) => isEnabled(child.id));
    }
    return [];
  };

  const collectChildIds = (moduleId = '') => {
    const direct = getModuleChildren(moduleId);
    if (!direct.length) return [];
    return direct.flatMap((child) => [child.id, ...collectChildIds(child.id)]);
  };

  const isModuleCheckedFromDraft = (moduleId = '', draft = {}, includeChildren = true) => {
    const directChecked = Boolean(draft?.[moduleId]);
    if (directChecked) return true;
    if (!includeChildren) return false;
    const childIds = collectChildIds(moduleId);
    return childIds.some((childId) => Boolean(draft?.[childId]));
  };

  const loadAccessGrants = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const response = await getOrganizationOverview(axiosPrivate);
      const payload = response?.data?.data || {};
      const nextMembers = Array.isArray(payload.teamMembers) ? payload.teamMembers : [];

      setWorkspace(payload.workspace || null);
      setLinkedWorkspaces(Array.isArray(payload.linkedWorkspaces) ? payload.linkedWorkspaces : []);
      setMembers(
        nextMembers
          .filter((member) => member?.userId && member?.status !== 'pending')
          .map(mapOverviewMember),
      );
    } catch (error) {
      toast.error(error.message || 'Failed to load access grants.');
    } finally { 
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [axiosPrivate]);

  useEffect(() => {
    void loadAccessGrants(true);
  }, [loadAccessGrants]);

  const users = useMemo(() => members, [members]);
  const transferWorkspaceOptions = useMemo(
    () => linkedWorkspaces.filter((item) => !item?.isCurrentWorkspace),
    [linkedWorkspaces],
  );
  const canTransferMembers = canEditAccessGrants && transferWorkspaceOptions.length > 0;
  const linkWorkspaceOptions = useMemo(() => {
    const activeWorkspaceIds = new Set(
      Array.isArray(selectedUser?.workspaceAccesses)
        ? selectedUser.workspaceAccesses.map((item) => String(item?.id || ''))
        : [],
    );

    return transferWorkspaceOptions.filter((item) => !activeWorkspaceIds.has(String(item.id)));
  }, [selectedUser, transferWorkspaceOptions]);
  const canLinkMembers = canEditAccessGrants && linkWorkspaceOptions.length > 0;
  const isDemoteDisabled = true;
  const selectedTransferWorkspace = useMemo(
    () => transferWorkspaceOptions.find((item) => String(item.id) === String(workspaceTransferForm.targetWorkspaceId)) || null,
    [transferWorkspaceOptions, workspaceTransferForm.targetWorkspaceId],
  );
  const selectedTransferRole = useMemo(
    () => TRANSFER_ROLE_OPTIONS.find((option) => option.value === workspaceTransferForm.role) || TRANSFER_ROLE_OPTIONS[0],
    [workspaceTransferForm.role],
  );
  const selectedTransferDepartmentOptions = Array.isArray(selectedTransferWorkspace?.departments)
    ? selectedTransferWorkspace.departments
    : [];
  const currentWorkspaceDepartmentOptions = useMemo(
    () =>
      Array.isArray(workspace?.organizationDepartments)
        ? workspace.organizationDepartments
            .filter((department) => department?.isActive !== false)
            .map((department) => ({
              id: String(department?._id || ''),
              name: String(department?.name || '').trim(),
            }))
            .filter((department) => department.id && department.name)
        : [],
    [workspace],
  );
  const isAdminTransferRole = workspaceTransferForm.role === 'admin';
  const isSuperAdminTransferRole = workspaceTransferForm.role === 'super_admin';
  const selectedSingleTransferDepartmentId = workspaceTransferForm.departmentIds[0] || '';

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchQuery.toLowerCase().trim();

    return users.filter((user) => {
      const matchesRole = selectedRole === 'All Roles' || user.roleGroup === selectedRole;
      const matchesSearch =
        !normalizedSearch ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        user.department.toLowerCase().includes(normalizedSearch) ||
        user.role.toLowerCase().includes(normalizedSearch);

      return matchesRole && matchesSearch;
    });
  }, [users, searchQuery, selectedRole]);

  const stats = useMemo(() => {
    const countByGroup = (group) => users.filter((user) => user.roleGroup === group).length;

    return {
      owner: countByGroup('Founder'),
      superAdmin: countByGroup('Super-Admin'),
      admin: countByGroup('Admin'),
      manager: countByGroup('Manager'),
      employee: countByGroup('Employee'),
    };
  }, [users]);

  const eligibleOwnershipCandidates = useMemo(
    () =>
      users.filter(
        (user) =>
          user.roleGroup === 'Super-Admin' &&
          user.status !== 'disabled',
      ),
    [users],
  );

  const transferTargetUser = useMemo(
    () => users.find((user) => String(user.id) === String(transferTargetUserId)) || null,
    [users, transferTargetUserId],
  );

  const getRoleBadge = (group) => {
    switch (group) {
      case 'Founder':
        return <span className="px-3 py-1 bg-[#111827] text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><Shield size={12} /> Founder</span>;
      case 'Super-Admin':
        return <span className="px-3 py-1 bg-[#2563EB]/10 text-[#2563EB] rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><Shield size={12} /> Super Admin</span>;
      case 'Admin':
        return <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><Shield size={12} /> Admin</span>;
      case 'Manager':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><Users size={12} /> Manager</span>;
      case 'Employee':
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><Users size={12} /> Employee</span>;
    }
  };

  const workspaceAccessSections = useMemo(() => {
    const sections = Array.isArray(workspace?.moduleMap?.sections) ? workspace.moduleMap.sections : [];
    const aliasToCanonical = new Map();
    sections.forEach((section) => {
      (Array.isArray(section?.items) ? section.items : []).forEach((item) => {
        const itemId = String(item?.id || '').trim();
        const itemLabel = String(item?.label || '').trim();
        if (itemId) aliasToCanonical.set(normalizeModuleKey(itemId), itemId);
        if (itemLabel) aliasToCanonical.set(normalizeModuleKey(itemLabel), itemId);
        (Array.isArray(item?.tabs) ? item.tabs : []).forEach((tab) => {
          const tabId = String(tab?.id || '').trim();
          const tabLabel = String(tab?.label || '').trim();
          if (tabId) aliasToCanonical.set(normalizeModuleKey(tabId), tabId);
          if (tabLabel) aliasToCanonical.set(normalizeModuleKey(tabLabel), tabId);
        });
      });
    });

    const selectedEnabledRaw = Array.isArray(workspace?.enabledModuleIds)
      ? workspace.enabledModuleIds
      : [];
    const enabledCanonical = new Set(
      selectedEnabledRaw
        .map((item) => resolveCanonicalModuleId(String(item || ''), aliasToCanonical))
        .filter(Boolean),
    );
    const rawEnabledNormalized = new Set(
      selectedEnabledRaw.map((item) => normalizeModuleKey(String(item || ''))).filter(Boolean),
    );
    const hasWebsiteBuilderEnabled =
      enabledCanonical.has('website-builder') ||
      enabledCanonical.has('tech-website-builder') ||
      rawEnabledNormalized.has('website-builder') ||
      rawEnabledNormalized.has('tech-website-builder');

    const mappedSections = sections
      .map((section) => {
        const modules = (Array.isArray(section?.items) ? section.items : []).flatMap((item) => {
          if (Array.isArray(item?.tabs) && item.tabs.length > 0) {
            return item.tabs
              .filter((tab) => {
                const tabId = String(tab?.id || '').trim();
                return tabId && enabledCanonical.has(tabId);
              })
              .map((tab) => ({
                id: String(tab?.id || '').trim(),
                label: String(tab?.label || tab?.id || '').trim(),
                description: `${String(section?.sectionLabel || 'Section')} -> ${String(item?.label || item?.id || '')}`,
              }))
              .filter((module) => module.id);
          }

          const itemId = String(item?.id || '').trim();
          if (!itemId || !enabledCanonical.has(itemId)) return [];
          return [{
            id: itemId,
            label: String(item?.label || item?.id || '').trim(),
            description: String(section?.sectionLabel || 'Section'),
          }].filter((module) => module.id);
        });

        return {
          key: String(section?.sectionId || section?.sectionLabel || 'section').trim(),
          title: String(section?.sectionLabel || 'Section').trim(),
          modules,
        };
      })
      .filter((section) => section.modules.length > 0);

    // Keep Website Builder visible in Key Apps when enabled in workspace/member modules.
    let keyAppsSection = mappedSections.find(
      (section) => normalizeModuleKey(section.key) === 'key-apps',
    );
    const hasWebsiteBuilderInKeyApps = keyAppsSection?.modules?.some(
      (module) => normalizeModuleKey(module.id) === 'website-builder',
    );
    if (hasWebsiteBuilderEnabled && !hasWebsiteBuilderInKeyApps) {
      if (!keyAppsSection) {
        keyAppsSection = {
          key: 'key-apps',
          title: 'Key Apps',
          modules: [],
        };
        mappedSections.push(keyAppsSection);
      }
      keyAppsSection.modules.push({
        id: 'website-builder',
        label: 'Website Builder',
        description: 'Key Apps',
      });
    }

    return mappedSections;
  }, [workspace, memberAccessTarget]);

  const visitorParentChainByChild = useMemo(() => {
    const chainMap = new Map();
    workspaceAccessSections.forEach((section) => {
      section.modules.forEach((module) => {
        const moduleChildren = getModuleChildren(module.id);
        moduleChildren.forEach((child) => {
          const childKey = normalizeModuleKey(child.id);
          const existingChildParents = Array.isArray(chainMap.get(childKey)) ? chainMap.get(childKey) : [];
          chainMap.set(childKey, Array.from(new Set([...existingChildParents, String(module.id)])));
          const grandChildren = getModuleChildren(child.id);
          grandChildren.forEach((grandChild) => {
            const grandChildKey = normalizeModuleKey(grandChild.id);
            const existingGrandParents = Array.isArray(chainMap.get(grandChildKey)) ? chainMap.get(grandChildKey) : [];
            chainMap.set(
              grandChildKey,
              Array.from(new Set([...existingGrandParents, String(module.id), String(child.id)])),
            );
          });
        });
      });
    });
    return chainMap;
  }, [workspaceAccessSections, enabledWorkspaceModuleKeys, getModuleChildren]);

  const openMemberAccessDialog = (member) => {
    if (!canManageModuleAccess) {
      toast.error('Only founder or super-admin can manage module access.');
      return;
    }
    const grantedModuleValues = Array.isArray(member?.grantedModules) ? member.grantedModules : [];
    const effectiveAccessModules = expandModuleAliases(
      [...grantedModuleValues]
        .map((item) => String(item || ''))
        .filter((item) => item && !normalizeModuleKey(item).startsWith('disabled:'))
        .map((item) => normalizeModuleKey(item)),
    );
    // Department-key compatibility from master panel payloads:
    // keep department rows independent from key-app rows.
    if (effectiveAccessModules.has('administration-visitor-management')) {
      effectiveAccessModules.add('visitors-management');
    }
    if (effectiveAccessModules.has('housekeeping')) {
      effectiveAccessModules.add('house-keeping');
    }
    const allModuleIds = workspaceAccessSections.flatMap((section) =>
      section.modules.flatMap((module) => [
        module.id,
        ...collectChildIds(module.id),
      ]),
    );
    const nextDraft = {
      db: allModuleIds.reduce((acc, moduleId) => {
        acc[moduleId] = effectiveAccessModules.has(normalizeModuleKey(moduleId));
        return acc;
      }, {}),
    };

    setMemberAccessTarget(member);
    setMemberAccessDraft(nextDraft);
    setExpandedAccessModules({});
    setShowMemberAccessDialog(true);
  };

  const toggleMemberModule = (sectionKey, moduleId) => {
    if (!memberAccessTarget) {
      return;
    }

    const childModuleIds = collectChildIds(moduleId);
    setMemberAccessDraft((current) => ({
      ...(current || {}),
      [sectionKey]: (() => {
        const nextValue = !current?.[sectionKey]?.[moduleId];
        const nextSection = {
          ...(current?.[sectionKey] || {}),
          [moduleId]: nextValue,
        };
        if (nextValue && childModuleIds.length > 0) {
          childModuleIds.forEach((childId) => {
            if (nextSection[childId] == null) {
              nextSection[childId] = true;
            }
          });
        }
        if (!nextValue && childModuleIds.length > 0) {
          childModuleIds.forEach((childId) => {
            nextSection[childId] = false;
          });
        }
        return nextSection;
      })(),
    }));
  };

  const toggleMemberChildModule = (sectionKey, moduleId) => {
    if (!memberAccessTarget) {
      return;
    }

    const childModuleIds = collectChildIds(moduleId);
    setMemberAccessDraft((current) => {
      const nextValue = !isModuleCheckedFromDraft(moduleId, current?.[sectionKey] || {}, true);
      const nextSection = {
        ...(current?.[sectionKey] || {}),
        [moduleId]: nextValue,
      };
      if (!nextValue && childModuleIds.length > 0) {
        childModuleIds.forEach((childId) => {
          nextSection[childId] = false;
        });
      }
      return {
        ...current,
        [sectionKey]: nextSection,
      };
    });
  };

  const handleSaveMemberAccess = async () => {
    if (!memberAccessTarget) return;
    if (!canManageModuleAccess) {
      toast.error('Only founder or super-admin can manage module access.');
      return;
    }

    const rawCheckedModules = Object.entries(memberAccessDraft?.db || {})
      .filter(([, enabled]) => Boolean(enabled))
      .map(([moduleId]) => String(moduleId || '').trim())
      .filter(Boolean);
    const originalByNormalized = new Map(
      rawCheckedModules.map((moduleId) => [normalizeModuleKey(moduleId), moduleId]),
    );
    rawCheckedModules.forEach((moduleId) => {
      const chain = visitorParentChainByChild.get(normalizeModuleKey(moduleId)) || [];
      chain.forEach((parentIdRaw) => {
        const parentId = String(parentIdRaw || '').trim();
        if (!parentId) return;
        const parentNormalized = normalizeModuleKey(parentId);
        if (!originalByNormalized.has(parentNormalized)) {
          originalByNormalized.set(parentNormalized, parentId);
        }
      });
    });
    const effectiveModules = Array.from(originalByNormalized.values());

    // Administration department DB key compatibility:
    // persist both canonical department ids and admin-prefixed aliases
    // so reopen state and backend-side consumers stay consistent.
    const normalizedEffective = new Set(
      effectiveModules.map((moduleId) => normalizeModuleKey(moduleId)),
    );
    if (normalizedEffective.has('visitors-management')) {
      effectiveModules.push('administration-visitor-management');
    }
    if (normalizedEffective.has('house-keeping')) {
      effectiveModules.push('housekeeping');
    }

    setIsSaving(true);
    try {
      await updateEmployeeAccessRequest(axiosPrivate, memberAccessTarget.id, {
        accessModules: effectiveModules,
        accessFeatures: [],
      });
      toast.success(`Sidebar access updated for ${memberAccessTarget.name}.`);
      setShowMemberAccessDialog(false);
      setMemberAccessTarget(null);
      await loadAccessGrants();
    } catch (error) {
      toast.error(error?.message || 'Unable to update sidebar access for this user.');
    } finally {
      setIsSaving(false);
    }
  };

  const groupDepartmentModules = (modules = []) => {
    const grouped = new Map();
    modules.forEach((module) => {
      const description = String(module?.description || '');
      const parts = description.split('->').map((part) => part.trim()).filter(Boolean);
      const departmentName = parts.length > 1 ? parts[parts.length - 1] : 'Department';
      if (!grouped.has(departmentName)) {
        grouped.set(departmentName, []);
      }
      grouped.get(departmentName).push(module);
    });
    return Array.from(grouped.entries()).map(([department, items]) => ({
      department,
      items,
    }));
  };

  const refreshCurrentUserSession = (nextUser) => {
    if (nextUser) {
      setAuth((prev) => ({ ...prev, user: nextUser }));
    }
  };

  const handleOpenDetails = (user) => {
    setSelectedUser(user);
    setRoleActionWarning(null);
    setShowDetailPanel(true);
  };

  const handleOpenWorkspaceTransferDialog = (user) => {
    const defaultTargetWorkspace = transferWorkspaceOptions[0] || null;
    const normalizedRole = getTransferRoleValue(user?.rawRole);
    const departmentOptions = Array.isArray(defaultTargetWorkspace?.departments)
      ? defaultTargetWorkspace.departments
      : [];
    const matchedDepartmentIds = departmentOptions
      .filter((department) =>
        Array.isArray(user?.departments) &&
        user.departments.some(
          (currentDepartment) =>
            String(currentDepartment || '').trim().toLowerCase() ===
            String(department?.name || '').trim().toLowerCase(),
        ),
      )
      .map((department) => department.id);
    const preferredDepartmentIds =
      normalizedRole === 'super_admin'
        ? []
        : normalizedRole === 'admin'
          ? (matchedDepartmentIds.length > 0 ? matchedDepartmentIds : departmentOptions[0]?.id ? [departmentOptions[0].id] : [])
          : [
              departmentOptions.find((department) =>
                Array.isArray(user?.departments) &&
                user.departments.some(
                  (currentDepartment) =>
                    String(currentDepartment || '').trim().toLowerCase() ===
                    String(department?.name || '').trim().toLowerCase(),
                ),
              )?.id || departmentOptions[0]?.id || '',
            ].filter(Boolean);

    setSelectedUser(user);
    setWorkspaceTransferForm({
      targetWorkspaceId: defaultTargetWorkspace?.id || '',
      role: normalizedRole,
      departmentIds: preferredDepartmentIds,
      note: '',
    });
    setShowWorkspaceTransferDialog(true);
  };

  const handleOpenWorkspaceLinkDialog = (user) => {
    const defaultTargetWorkspace = (
      transferWorkspaceOptions.filter((item) =>
        !(Array.isArray(user?.workspaceAccesses) ? user.workspaceAccesses : []).some(
          (access) => String(access?.id || '') === String(item.id),
        ),
      )[0] || null
    );

    setSelectedUser(user);
    setWorkspaceLinkForm({
      targetWorkspaceId: defaultTargetWorkspace?.id || '',
      note: '',
    });
    setShowWorkspaceLinkDialog(true);
  };

  const reloadFromResponse = async (response) => {
    const payload = response?.data?.data || {};

    if (payload.overview) {
      const overview = payload.overview;
      setWorkspace(overview.workspace || null);
      setLinkedWorkspaces(Array.isArray(overview.linkedWorkspaces) ? overview.linkedWorkspaces : []);
      setMembers((Array.isArray(overview.teamMembers) ? overview.teamMembers : []).map(mapOverviewMember));
    } else {
      await loadAccessGrants();
    }

    refreshCurrentUserSession(payload.currentUser?.user || payload.currentUser || null);
  };

  const handlePromote = async () => {
    if (!canEditAccessGrants) {
      toast.error('Only the workspace founder can change access grants.');
      return;
    }

    if (!selectedUser || selectedUser.roleGroup === 'Founder') {
      return;
    }

    const nextRole = getNextHigherRole(selectedUser.rawRole);
    if (!nextRole) {
      toast.info('No higher role is available for this user.');
      return;
    }

    if (!roleActionWarning || roleActionWarning.type !== 'promote') {
      const isManagerToAdmin = normalizeRole(selectedUser.rawRole) === 'manager' && normalizeRole(nextRole) === 'admin';
      const selectedDepartmentIds = currentWorkspaceDepartmentOptions
        .filter((department) =>
          Array.isArray(selectedUser?.departments) &&
          selectedUser.departments.some((name) => String(name || '').trim().toLowerCase() === department.name.toLowerCase()),
        )
        .map((department) => department.id);
      setRoleActionWarning({
        type: 'promote',
        nextRole,
        title: `Confirm promotion for ${selectedUser.name}`,
        message: `${selectedUser.name} will be promoted to ${getRoleLabel(nextRole)}.`,
        note: isManagerToAdmin
          ? "Select departments this admin should manage."
          : "This will expand the user's access to the next role level.",
        requiresDepartments: isManagerToAdmin,
        departmentMode: 'multi',
        departmentIds: selectedDepartmentIds,
      });
      return;
    }

    const requiresDepartments = Boolean(roleActionWarning.requiresDepartments);
    const departmentIds = Array.isArray(roleActionWarning.departmentIds) ? roleActionWarning.departmentIds.filter(Boolean) : [];
    if (requiresDepartments && departmentIds.length === 0) {
      toast.error('Select at least one department for this role change.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await updateOrganizationMemberRole(axiosPrivate, selectedUser.id, {
        role: roleActionWarning.nextRole || nextRole,
        departments: requiresDepartments ? departmentIds : [],
      });
      await reloadFromResponse(response);
      setShowDetailPanel(false);
      setSelectedUser(null);
      setRoleActionWarning(null);
      toast.success(`${selectedUser.name} promoted to ${getRoleLabel(roleActionWarning.nextRole || nextRole)}.`);
    } catch (error) {
      toast.error(error.message || 'Unable to promote user right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDemote = async () => {
    if (!canEditAccessGrants) {
      toast.error('Only the workspace founder can change access grants.');
      return;
    }

    if (!selectedUser || selectedUser.roleGroup === 'Founder') {
      return;
    }

    const nextRole = getNextLowerRole(selectedUser.rawRole);
    if (!nextRole) {
      toast.info('No lower role is available for this user.');
      return;
    }

    if (!roleActionWarning || roleActionWarning.type !== 'demote') {
      const currentNormalizedRole = normalizeRole(selectedUser.rawRole);
      const nextNormalizedRole = normalizeRole(nextRole);
      const isSuperAdminToAdmin = currentNormalizedRole === 'super_admin' && nextNormalizedRole === 'admin';
      const isAdminToManager = currentNormalizedRole === 'admin' && nextNormalizedRole === 'manager';
      const selectedDepartmentIds = currentWorkspaceDepartmentOptions
        .filter((department) =>
          Array.isArray(selectedUser?.departments) &&
          selectedUser.departments.some((name) => String(name || '').trim().toLowerCase() === department.name.toLowerCase()),
        )
        .map((department) => department.id);
      setRoleActionWarning({
        type: 'demote',
        nextRole,
        title: `Confirm demotion for ${selectedUser.name}`,
        message: `${selectedUser.name} will be demoted to ${getRoleLabel(nextRole)}.`,
        note: isSuperAdminToAdmin
          ? 'Select departments this admin can access after demotion.'
          : isAdminToManager
            ? 'Select one department this manager can access.'
            : "This will reduce the user's access to the next lower role level.",
        requiresDepartments: isSuperAdminToAdmin || isAdminToManager,
        departmentMode: isAdminToManager ? 'single' : 'multi',
        departmentIds:
          isAdminToManager
            ? [selectedDepartmentIds[0] || currentWorkspaceDepartmentOptions[0]?.id || ''].filter(Boolean)
            : selectedDepartmentIds,
      });
      return;
    }

    const requiresDepartments = Boolean(roleActionWarning.requiresDepartments);
    const isSingleDepartmentMode = roleActionWarning.departmentMode === 'single';
    const departmentIds = Array.isArray(roleActionWarning.departmentIds) ? roleActionWarning.departmentIds.filter(Boolean) : [];
    if (requiresDepartments && departmentIds.length === 0) {
      toast.error('Select at least one department for this role change.');
      return;
    }
    if (requiresDepartments && isSingleDepartmentMode && departmentIds.length !== 1) {
      toast.error('Select exactly one department for manager access.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await updateOrganizationMemberRole(axiosPrivate, selectedUser.id, {
        role: roleActionWarning.nextRole || nextRole,
        departments: requiresDepartments ? departmentIds : [],
      });
      await reloadFromResponse(response);
      setShowDetailPanel(false);
      setSelectedUser(null);
      setRoleActionWarning(null);
      toast.success(`${selectedUser.name} demoted to ${getRoleLabel(roleActionWarning.nextRole || nextRole)}.`);
    } catch (error) {
      toast.error(error.message || 'Unable to demote user right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!canEditAccessGrants) {
      toast.error('Only the workspace founder can transfer founder access.');
      return;
    }

    const targetMemberId = transferTargetUser?.id || eligibleOwnershipCandidates[0]?.id;
    if (!targetMemberId) {
      toast.info('Select an eligible Super-Admin before transferring founder access.');
      return;
    }

    if (!showTransferWarning) {
      setShowTransferWarning(true);
      return;
    }

    const targetMember = users.find((member) => String(member.id) === String(targetMemberId));

    setIsSaving(true);
    try {
      const response = await transferOrganizationOwnership(axiosPrivate, { memberId: targetMemberId });
      await reloadFromResponse(response);
      setShowTransferDialog(false);
      setShowTransferWarning(false);
      setShowDetailPanel(false);
      setSelectedUser(null);
      setTransferTargetUserId('');
      toast.success(`Founder access transferred to ${targetMember?.name || 'the selected user'}.`);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(error.message || 'Unable to transfer founder access right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmWorkspaceTransfer = async () => {
    if (!canTransferMembers || !selectedUser) {
      return;
    }

    if (!workspaceTransferForm.targetWorkspaceId) {
      toast.error('Select a target workspace first.');
      return;
    }

    if (!isSuperAdminTransferRole && workspaceTransferForm.departmentIds.length === 0) {
      toast.error('Select a target department for this transfer.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await transferOrganizationMember(axiosPrivate, selectedUser.id, {
        targetWorkspaceId: workspaceTransferForm.targetWorkspaceId,
        role: workspaceTransferForm.role,
        departments:
          isSuperAdminTransferRole
            ? []
            : workspaceTransferForm.departmentIds,
        note: workspaceTransferForm.note,
      });
      await reloadFromResponse(response);
      setShowWorkspaceTransferDialog(false);
      setShowDetailPanel(false);
      setSelectedUser(null);
      toast.success(`${selectedUser.name} transferred successfully.`);
    } catch (error) {
      toast.error(error.message || 'Unable to transfer this user right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmWorkspaceLink = async () => {
    if (!canLinkMembers || !selectedUser) {
      return;
    }

    if (!workspaceLinkForm.targetWorkspaceId) {
      toast.error('Select a workspace to add access.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await linkOrganizationMember(axiosPrivate, selectedUser.id, {
        targetWorkspaceId: workspaceLinkForm.targetWorkspaceId,
        note: workspaceLinkForm.note,
      });
      await reloadFromResponse(response);
      setShowWorkspaceLinkDialog(false);
      setShowDetailPanel(false);
      setSelectedUser(null);
      toast.success(`${selectedUser.name} can now access another workspace.`);
    } catch (error) {
      toast.error(error.message || 'Unable to add unit access right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const nextHigherRole = selectedUser ? getNextHigherRole(selectedUser.rawRole) : null;
  const nextLowerRole = selectedUser ? getNextLowerRole(selectedUser.rawRole) : null;
  const workspaceDepartmentCount = Array.isArray(workspace?.organizationDepartments)
    ? workspace.organizationDepartments.length
    : 0;

  const todayCounts = [
    { label: 'Founder', value: stats.owner, color: 'text-purple-600' },
    { label: 'Super-Admin', value: stats.superAdmin, color: 'text-red-600' },
    { label: 'Admin', value: stats.admin, color: 'text-amber-600' },
    { label: 'Manager', value: stats.manager, color: 'text-blue-600' },
    { label: 'Employee', value: stats.employee, color: 'text-green-600' },
  ];

  const ownerName = currentUser?.fullName || currentUser?.name || 'Founder';
  const accessGrantsModeLabel = canEditAccessGrants ? 'Founder edit access' : 'Read-only access';

  const [statusFilter, setStatusFilter] = useState('All');

  const statusFilteredUsers = useMemo(() => {
    if (statusFilter === 'All') return filteredUsers;
    if (statusFilter === 'Active') return filteredUsers.filter(u => u.status === 'joined');
    if (statusFilter === 'Disabled') return filteredUsers.filter(u => u.status === 'disabled');
    return filteredUsers;
  }, [filteredUsers, statusFilter]);

  if (isLoading) {
    return (
      <PageFrame>
        <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/4" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-slate-200 rounded-[2rem]" />)}
            </div>
            <div className="h-96 bg-slate-200 rounded-2xl" />
          </div>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <div className="flex flex-col gap-4">

          {/* 1. HEADER */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Access Grants
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Manage user roles and module access for {workspace?.workspaceName || 'this unit'}.
              </p>
            </div>
          </div>

          {/* 2. MAIN TABS — role filter pill nav */}
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            {ROLE_FILTERS.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  selectedRole === role
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {role === 'All Roles' ? 'All' : role}
                {role !== 'All Roles' && (() => {
                  const count = users.filter(u => u.roleGroup === role).length;
                  return count > 0 ? (
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold ${
                      selectedRole === role ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
                    }`}>{count}</span>
                  ) : null;
                })()}
              </button>
            ))}
          </div>

          {/* 3. STAT CARDS — 5-col grid matching DESIGN.md pattern */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3 shrink-0">
            {[
              { key: 'total', label: 'Total Members', value: users.length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', iconClass: 'bg-slate-50 text-slate-600', Icon: Users },
              { key: 'founder', label: 'Founder', value: stats.owner, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-violet-500', iconClass: 'bg-violet-50 text-violet-600', Icon: Shield },
              { key: 'admin', label: 'Admin', value: stats.superAdmin + stats.admin, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500', iconClass: 'bg-amber-50 text-amber-600', Icon: Shield },
              { key: 'manager', label: 'Manager', value: stats.manager, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500', iconClass: 'bg-blue-50 text-blue-600', Icon: UserCheck },
              { key: 'employee', label: 'Employee', value: stats.employee, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', iconClass: 'bg-emerald-50 text-emerald-600', Icon: UserCog },
            ].map((card) => {
              const Icon = card.Icon;
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

            {/* Inner header: search + role filter dropdown + transfer founder action */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">

              {/* LEFT: status sub-tab pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {['All', 'Active', 'Disabled'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all ${
                      statusFilter === s
                        ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                        : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* RIGHT: Search + Dept filter + Transfer action */}
              <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Search by name, email, or dept..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Role dropdown filter */}
                <div className="relative">
                  <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="pl-9 pr-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[110px]"
                  >
                    {ROLE_FILTERS.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                {/* Transfer Founder Access */}
                {canEditAccessGrants && eligibleOwnershipCandidates.length > 0 && (
                  <button
                    onClick={() => {
                      setTransferTargetUserId(eligibleOwnershipCandidates[0]?.id || '');
                      setShowTransferWarning(false);
                      setShowTransferDialog(true);
                    }}
                    className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-bold text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap"
                  >
                    <ArrowRightLeft size={13} strokeWidth={2.5} />
                    Transfer Founder
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-5 py-4">Platform User</th>
                    <th className="px-5 py-4">Access Role</th>
                    <th className="px-5 py-4">Department</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {statusFilteredUsers.length > 0 ? (
                    statusFilteredUsers.map((user) => {
                      const currentUserId = String(currentUser?.id || currentUser?._id || '').trim();
                      const rowUserId = String(user?.userId || user?.id || '').trim();
                      const hideAccessButtonForSelfSuperAdmin =
                        normalizeRole(currentRole) === 'super_admin' &&
                        user.roleGroup === 'Super-Admin' &&
                        currentUserId &&
                        rowUserId &&
                        currentUserId === rowUserId;
                      const normalizedDepartments = Array.isArray(user.departments)
                        ? user.departments.filter(Boolean)
                        : [];
                      const hasAllDepartmentsAccess =
                        (user.roleGroup === 'Founder' || user.roleGroup === 'Super-Admin') &&
                        (normalizedDepartments.length === 0 ||
                          (workspaceDepartmentCount > 0 && normalizedDepartments.length >= workspaceDepartmentCount));
                      const departmentBadges = hasAllDepartmentsAccess
                        ? ['All Departments']
                        : (normalizedDepartments.length > 0 ? normalizedDepartments : [user.department]).filter(Boolean);

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-[10px] shadow-sm shrink-0 ${
                                user.roleGroup === 'Founder' ? 'bg-[#111827]' : 'bg-gradient-to-br from-[#2563EB] to-blue-700'
                              }`}>
                                {getInitials(user.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-[11px] text-slate-900 truncate">{user.name}</div>
                                <div className="text-[10px] font-medium text-slate-500 truncate">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">{getRoleBadge(user.roleGroup)}</td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1.5 max-w-56">
                              {departmentBadges.map((dept, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-bold tracking-wide">{dept}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.14em] w-max ${
                              user.status === 'joined' ? 'bg-emerald-100 text-emerald-700' :
                              user.status === 'disabled' ? 'bg-slate-200 text-slate-700' :
                              user.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              user.status === 'invited' ? 'bg-violet-100 text-violet-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {user.status === 'joined' ? 'Active' : user.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {user.roleGroup === 'Founder' ? (
                                <span className="px-3 py-1.5 bg-[#111827] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Founder</span>
                              ) : (
                                <>
                                  {!hideAccessButtonForSelfSuperAdmin ? (
                                    <button
                                      onClick={() => openMemberAccessDialog(user)}
                                      type="button"
                                      disabled={!canManageModuleAccess}
                                      className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all disabled:opacity-55 disabled:cursor-not-allowed"
                                      title="Manage Sidebar Access"
                                    >
                                      <Shield size={15} strokeWidth={2.5} />
                                    </button>
                                  ) : null}
                                  <button
                                    onClick={() => handleOpenDetails(user)}
                                    type="button"
                                    className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                                    title={canEditAccessGrants ? 'Manage Role' : 'View Role'}
                                  >
                                    <UserCog size={15} strokeWidth={2.5} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-20 text-slate-400 font-semibold">
                        No members found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showDetailPanel && selectedUser && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[1rem] max-w-md w-full overflow-hidden shadow-2xl border border-white/10 scale-95 sm:scale-90">
              <div className="p-2.5 sm:p-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Access Control</p>
                  <h2 className="text-[13px] sm:text-sm font-semibold text-white mt-1">
                    {canEditAccessGrants ? 'Manage Access' : 'View Access'} - {selectedUser.name}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowDetailPanel(false);
                    setSelectedUser(null);
                    setRoleActionWarning(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                >
                  <X className="w-5 h-5 text-slate-300" />
                </button>
              </div>

              <div className="p-2.5 sm:p-3 space-y-2.5 bg-gradient-to-b from-slate-50 to-white">
                <div className="grid gap-3 md:grid-cols-[1.25fr_0.75fr]">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#2563EB] to-[#1e40af] rounded-full flex items-center justify-center text-white font-semibold text-xs">
                      {getInitials(selectedUser.name)}
                    </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 text-sm">{selectedUser.name}</div>
                    <div className="text-xs text-slate-500">{selectedUser.email}</div>
                    <div className="flex items-center gap-2 mt-2">
                      {getRoleBadge(selectedUser.roleGroup)}
                      <span className="text-xs text-slate-400">• {selectedUser.department}</span>
                    </div>
                  </div>
                </div>

                {roleActionWarning ? (
                  <div className="space-y-3">
                    <div className={`rounded-[1.2rem] border p-4 sm:p-4 ${roleActionWarning.type === 'promote' ? 'border-emerald-200 bg-emerald-50/80' : 'border-amber-200 bg-amber-50/80'}`}>
                      <div className="flex items-start gap-4">
                        <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${roleActionWarning.type === 'promote' ? 'bg-emerald-600' : 'bg-amber-500'}`}>
                          <AlertCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="space-y-3">
                          <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${roleActionWarning.type === 'promote' ? 'text-emerald-700' : 'text-amber-700'}`}>
                            Final Confirmation
                          </p>
                          <p className={`text-base font-bold ${roleActionWarning.type === 'promote' ? 'text-emerald-950' : 'text-amber-950'}`}>
                            {roleActionWarning.title}
                          </p>
                          <p className={`text-sm leading-relaxed ${roleActionWarning.type === 'promote' ? 'text-emerald-900/80' : 'text-amber-900/80'}`}>
                            {roleActionWarning.message}
                          </p>
                          <p className={`text-xs font-medium ${roleActionWarning.type === 'promote' ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {roleActionWarning.note}
                          </p>
                          {roleActionWarning.requiresDepartments && (
                            <div className="space-y-2 rounded-xl border border-white/70 bg-white/80 p-3">
                              <label className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                                Department Access
                              </label>
                              {roleActionWarning.departmentMode === 'single' ? (
                                <select
                                  value={(roleActionWarning.departmentIds?.[0] || '')}
                                  onChange={(event) =>
                                    setRoleActionWarning((current) => ({
                                      ...current,
                                      departmentIds: event.target.value ? [event.target.value] : [],
                                    }))
                                  }
                                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                >
                                  <option value="">Select one department</option>
                                  {currentWorkspaceDepartmentOptions.map((department) => (
                                    <option key={department.id} value={department.id}>
                                      {department.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div className="max-h-36 space-y-1 overflow-auto rounded-lg border border-slate-200 bg-white p-2">
                                  {currentWorkspaceDepartmentOptions.map((department) => {
                                    const isChecked = Array.isArray(roleActionWarning.departmentIds)
                                      ? roleActionWarning.departmentIds.includes(department.id)
                                      : false;
                                    return (
                                      <label key={department.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm text-slate-700 hover:bg-slate-50">
                                        <input
                                          type="checkbox"
                                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                          checked={isChecked}
                                          onChange={(event) =>
                                            setRoleActionWarning((current) => ({
                                              ...current,
                                              departmentIds: event.target.checked
                                                ? [...(Array.isArray(current.departmentIds) ? current.departmentIds : []), department.id]
                                                : (Array.isArray(current.departmentIds) ? current.departmentIds : []).filter((id) => id !== department.id),
                                            }))
                                          }
                                        />
                                        <span>{department.name}</span>
                                      </label>
                                    );
                                  })}
                                  {currentWorkspaceDepartmentOptions.length === 0 && (
                                    <div className="px-1 py-2 text-sm text-slate-400">No departments available.</div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-xl bg-white border border-slate-100 px-3 py-2.5 shadow-sm">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Ready to continue?</p>
                        <p className="text-xs text-slate-500">Use confirm only if you want to apply the role update.</p>
                      </div>
                      <div className={`px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.22em] ${roleActionWarning.type === 'promote' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        Second step
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                      <button
                        onClick={() => setRoleActionWarning(null)}
                        disabled={isSaving || !canEditAccessGrants}
                        className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors text-sm disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={roleActionWarning.type === 'promote' ? handlePromote : handleDemote}
                        disabled={isSaving || !canEditAccessGrants || (roleActionWarning.type === 'demote' && isDemoteDisabled)}
                        className={`px-4 py-2 text-white rounded-lg font-semibold transition-colors text-sm shadow-sm disabled:opacity-60 ${roleActionWarning.type === 'promote' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                      >
                        {isSaving ? 'Saving...' : roleActionWarning.type === 'promote' ? 'Confirm Promote' : 'Confirm Demote'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">Available Actions</h3>

                    {!canEditAccessGrants && (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
                        Super-admins can review access details here, but only the workspace founder can promote, demote, or transfer founder access.
                      </div>
                    )}

                    {nextLowerRole && (
                      <button
                        title={isDemoteDisabled ? 'Demote is disabled.' : ''}
                        onClick={handleDemote}
                        disabled={isSaving || !canEditAccessGrants || isDemoteDisabled}
                        className="w-full p-3 bg-white hover:bg-amber-50 text-left rounded-[1.1rem] transition-colors group border border-slate-100 shadow-sm disabled:opacity-60"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-9 h-9 bg-amber-100 group-hover:bg-amber-200 rounded-xl flex items-center justify-center transition-colors">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-[13px] text-slate-900">Demote User</div>
                              <div className="text-xs text-slate-500 mt-0.5">Lower this user's role by one level</div>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-amber-500 transition-colors" />
                        </div>
                      </button>
                    )}

                    {nextHigherRole && (
                      <button
                        onClick={handlePromote}
                        disabled={isSaving || !canEditAccessGrants}
                        className="w-full p-3 bg-white hover:bg-emerald-50 text-left rounded-[1.1rem] transition-colors group border border-slate-100 shadow-sm disabled:opacity-60"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-9 h-9 bg-emerald-100 group-hover:bg-emerald-200 rounded-xl flex items-center justify-center transition-colors">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-[13px] text-slate-900">Promote User</div>
                              <div className="text-xs text-slate-500 mt-0.5">Raise this user to the next role level</div>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                        </div>
                      </button>
                    )}

                      {canTransferMembers && (
                        <button
                          onClick={() => handleOpenWorkspaceTransferDialog(selectedUser)}
                        disabled={isSaving || !canEditAccessGrants}
                        className="w-full p-3 bg-white hover:bg-indigo-50 text-left rounded-[1.1rem] transition-colors group border border-slate-100 shadow-sm disabled:opacity-60"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-9 h-9 bg-indigo-100 group-hover:bg-indigo-200 rounded-xl flex items-center justify-center transition-colors">
                              <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-[13px] text-slate-900">Transfer Unit</div>
                              <div className="text-xs text-slate-500 mt-0.5">Move this user to another linked unit</div>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                          </div>
                        </button>
                      )}

                      {canLinkMembers && (
                        <button
                          onClick={() => handleOpenWorkspaceLinkDialog(selectedUser)}
                          disabled={isSaving || !canEditAccessGrants}
                          className="w-full p-3 bg-white hover:bg-sky-50 text-left rounded-[1.1rem] transition-colors group border border-slate-100 shadow-sm disabled:opacity-60"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-9 h-9 bg-sky-100 group-hover:bg-sky-200 rounded-xl flex items-center justify-center transition-colors">
                                <Users className="w-4 h-4 text-sky-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-[13px] text-slate-900">Add Unit Access</div>
                                <div className="text-xs text-slate-500 mt-0.5">Keep this user here and add another unit</div>
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-sky-500 transition-colors" />
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
        )}

        {showMemberAccessDialog && memberAccessTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-[1.25rem] border border-white/10 bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-slate-900 px-4 py-3.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Sidebar Access</p>
                  <h3 className="mt-1 text-base font-semibold text-white">{memberAccessTarget.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMemberAccessDialog(false)}
                  className="rounded-xl border border-white/10 p-2.5 text-slate-300 transition-colors hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[68vh] space-y-3 overflow-y-auto bg-slate-50 p-4">
                {workspaceAccessSections.map((section, sectionIndex) => (
                  <div key={`${section.key}-${section.title}-${sectionIndex}`} className="rounded-xl border border-slate-200 bg-white p-3">
                    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{section.title}</h4>
                    <div className="space-y-2">
                      {normalizeModuleKey(section.key) === 'department-accesses' ? (
                        groupDepartmentModules(section.modules).map((group) => {
                          const departmentKey = normalizeModuleKey(group.department);
                          const isDeptExpanded = Boolean(expandedDepartmentGroups?.[departmentKey]);
                          return (
                            <div key={departmentKey} className="rounded-lg border border-slate-100 px-2.5 py-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedDepartmentGroups((current) => ({
                                    ...(current || {}),
                                    [departmentKey]: !current?.[departmentKey],
                                  }))
                                }
                                className="w-full flex items-center justify-between text-left"
                              >
                                <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">{group.department}</p>
                                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isDeptExpanded ? 'rotate-180' : ''}`} />
                              </button>
                              {isDeptExpanded ? (
                                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                                  {group.items.map((module) => {
                                    const checked = isModuleCheckedFromDraft(module.id, memberAccessDraft?.db || {}, false);
                                    const childModules = getModuleChildren(module.id);
                                    const hasChildren = childModules.length > 0;
                                    const isExpanded = Boolean(expandedAccessModules?.[module.id]);
                                    return (
                                    <div key={module.id} className="rounded-lg border border-slate-100 px-2.5 py-2">
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex items-start gap-2">
                                            {hasChildren ? (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setExpandedAccessModules((current) => ({
                                                    ...(current || {}),
                                                    [module.id]: !current?.[module.id],
                                                  }))
                                                }
                                                className="mt-0.5 rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-50"
                                                title={isExpanded ? 'Collapse actions' : 'Expand actions'}
                                              >
                                                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                              </button>
                                            ) : null}
                                            <div>
                                              <p className="text-xs font-semibold text-slate-900">{module.label}</p>
                                              <p className="text-[10px] text-slate-500">{module.description}</p>
                                            </div>
                                          </div>
                                          <Switch checked={checked} disabled={!canManageModuleAccess} onCheckedChange={() => toggleMemberModule('db', module.id)} />
                                        </div>
                                        {hasChildren && isExpanded ? (
                                          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 pl-7">
                                            {childModules.map((child) => {
                                              const childChecked = isModuleCheckedFromDraft(child.id, memberAccessDraft?.db || {});
                                              const grandChildren = getModuleChildren(child.id);
                                              const hasGrandChildren = grandChildren.length > 0;
                                              const isChildExpanded = Boolean(expandedAccessModules?.[child.id]);
                                              return (
                                                <div key={child.id} className="rounded-md border border-slate-100 px-2.5 py-2">
                                                  <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-start gap-2">
                                                      {hasGrandChildren ? (
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            setExpandedAccessModules((current) => ({
                                                              ...(current || {}),
                                                              [child.id]: !current?.[child.id],
                                                            }))
                                                          }
                                                          className="mt-0.5 rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-50"
                                                          title={isChildExpanded ? 'Collapse subtabs' : 'Expand subtabs'}
                                                        >
                                                          <ChevronDown className={`h-3 w-3 transition-transform ${isChildExpanded ? 'rotate-180' : ''}`} />
                                                        </button>
                                                      ) : null}
                                                      <div>
                                                        <p className="text-[11px] font-semibold text-slate-800">{child.label}</p>
                                                        <p className="text-[10px] text-slate-500">{child.description}</p>
                                                      </div>
                                                    </div>
                                                    <Switch
                                                      checked={childChecked}
                                                      disabled={!canManageModuleAccess || !checked}
                                                      onCheckedChange={() => toggleMemberChildModule('db', child.id)}
                                                    />
                                                  </div>
                                                  {hasGrandChildren && isChildExpanded ? (
                                                    <div className="mt-2 space-y-2 border-t border-slate-100 pt-2 pl-6">
                                                      {grandChildren.map((subtab) => {
                                                        const subtabChecked = isModuleCheckedFromDraft(subtab.id, memberAccessDraft?.db || {});
                                                        return (
                                                          <div key={subtab.id} className="flex items-center justify-between rounded-md border border-slate-100 px-2 py-1.5">
                                                            <div>
                                                              <p className="text-[10px] font-semibold text-slate-800">{subtab.label}</p>
                                                              <p className="text-[10px] text-slate-500">{subtab.description}</p>
                                                            </div>
                                                            <Switch
                                                              checked={subtabChecked}
                                                              disabled={!canManageModuleAccess || !checked || !childChecked}
                                                              onCheckedChange={() => toggleMemberChildModule('db', subtab.id)}
                                                            />
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  ) : null}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      ) : (
                      section.modules.map((module) => {
                        const checked = isModuleCheckedFromDraft(module.id, memberAccessDraft?.db || {}, false);
                        const childModules = getModuleChildren(module.id);
                        const hasChildren = childModules.length > 0;
                        const isExpanded = Boolean(expandedAccessModules?.[module.id]);
                        return (
                          <div key={module.id} className="rounded-lg border border-slate-100 px-2.5 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-start gap-2">
                                {hasChildren ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedAccessModules((current) => ({
                                        ...(current || {}),
                                        [module.id]: !current?.[module.id],
                                      }))
                                    }
                                    className="mt-0.5 rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-50"
                                    title={isExpanded ? 'Collapse actions' : 'Expand actions'}
                                  >
                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                ) : null}
                                <div>
                                  <p className="text-xs font-semibold text-slate-900">{module.label}</p>
                                  <p className="text-[10px] text-slate-500">{module.description}</p>
                                </div>
                              </div>
                              <Switch checked={checked} disabled={!canManageModuleAccess} onCheckedChange={() => toggleMemberModule('db', module.id)} />
                            </div>
                            {hasChildren && isExpanded ? (
                              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 pl-7">
                                {childModules.map((child) => {
                                  const childChecked = isModuleCheckedFromDraft(child.id, memberAccessDraft?.db || {});
                                  const grandChildren = getModuleChildren(child.id);
                                  const hasGrandChildren = grandChildren.length > 0;
                                  const isChildExpanded = Boolean(expandedAccessModules?.[child.id]);
                                  return (
                                    <div key={child.id} className="rounded-md border border-slate-100 px-2.5 py-2">
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-start gap-2">
                                          {hasGrandChildren ? (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setExpandedAccessModules((current) => ({
                                                  ...(current || {}),
                                                  [child.id]: !current?.[child.id],
                                                }))
                                              }
                                              className="mt-0.5 rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-50"
                                              title={isChildExpanded ? 'Collapse subtabs' : 'Expand subtabs'}
                                            >
                                              <ChevronDown className={`h-3 w-3 transition-transform ${isChildExpanded ? 'rotate-180' : ''}`} />
                                            </button>
                                          ) : null}
                                          <div>
                                            <p className="text-[11px] font-semibold text-slate-800">{child.label}</p>
                                            <p className="text-[10px] text-slate-500">{child.description}</p>
                                          </div>
                                        </div>
                                        <Switch
                                          checked={childChecked}
                                          disabled={!canManageModuleAccess || !checked}
                                          onCheckedChange={() => toggleMemberChildModule('db', child.id)}
                                        />
                                      </div>
                                      {hasGrandChildren && isChildExpanded ? (
                                        <div className="mt-2 space-y-2 border-t border-slate-100 pt-2 pl-6">
                                          {grandChildren.map((subtab) => {
                                            const subtabChecked = isModuleCheckedFromDraft(subtab.id, memberAccessDraft?.db || {});
                                            return (
                                              <div key={subtab.id} className="flex items-center justify-between rounded-md border border-slate-100 px-2 py-1.5">
                                                <div>
                                                  <p className="text-[10px] font-semibold text-slate-800">{subtab.label}</p>
                                                  <p className="text-[10px] text-slate-500">{subtab.description}</p>
                                                </div>
                                                <Switch
                                                  checked={subtabChecked}
                                                  disabled={!canManageModuleAccess || !checked || !childChecked}
                                                  onCheckedChange={() => toggleMemberChildModule('db', subtab.id)}
                                                />
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-white px-4 py-3">
                <button
                  type="button"
                  onClick={() => setShowMemberAccessDialog(false)}
                  className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving || !canManageModuleAccess}
                  onClick={handleSaveMemberAccess}
                  className="rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Save Access'}
                </button>
              </div>
            </div>
          </div>
        )}

          {showWorkspaceLinkDialog && selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
              <div className="my-6 w-full max-w-md overflow-hidden rounded-[1.1rem] border border-white/10 bg-white shadow-2xl scale-95 sm:scale-90">
                <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-3 sm:p-3.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Unit Access</p>
                    <h2 className="mt-1 text-sm font-semibold text-white">Add access for {selectedUser.name}</h2>
                  </div>
                  <button
                    onClick={() => setShowWorkspaceLinkDialog(false)}
                    className="rounded-xl border border-white/5 p-2.5 transition-colors hover:bg-white/10"
                  >
                    <X className="h-5 w-5 text-slate-300" />
                  </button>
                </div>

                <div className="space-y-3 bg-gradient-to-b from-slate-50 to-white p-3 sm:p-3.5">
                  <div className="rounded-[0.9rem] border border-slate-100 bg-white p-3 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Current units</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(selectedUser.workspaceAccesses || []).map((access) => (
                        <span key={access.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          {access.workspaceName}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Target Workspace</label>
                    <div className="relative">
                      <select
                        value={workspaceLinkForm.targetWorkspaceId}
                        onChange={(event) =>
                          setWorkspaceLinkForm((current) => ({
                            ...current,
                            targetWorkspaceId: event.target.value,
                          }))
                        }
                        className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
                      >
                        <option value="">Select unit</option>
                        {linkWorkspaceOptions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.workspaceName}{item.location ? ` - ${item.location}` : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Link Note</label>
                    <textarea
                      rows={3}
                      value={workspaceLinkForm.note}
                      onChange={(event) =>
                        setWorkspaceLinkForm((current) => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                      placeholder="Optional note for this access grant..."
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
                    />
                  </div>

                  <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800">
                    The same login, role, departments, employee profile, attendance, and leave data will stay shared across both workspaces.
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100/60 bg-white p-3 sm:p-3.5">
                  <button
                    onClick={() => setShowWorkspaceLinkDialog(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmWorkspaceLink}
                    disabled={isSaving}
                    className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:opacity-60"
                  >
                    {isSaving ? 'Saving...' : 'Add Access'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showWorkspaceTransferDialog && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="my-6 w-full max-w-lg overflow-hidden rounded-[1.1rem] border border-white/10 bg-white shadow-2xl scale-95 sm:scale-90">
              <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-3 sm:p-3.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Unit Transfer</p>
                  <h2 className="mt-1 text-sm font-semibold text-white">Transfer {selectedUser.name}</h2>
                </div>
                <button
                  onClick={() => setShowWorkspaceTransferDialog(false)}
                  className="rounded-xl border border-white/5 p-2.5 transition-colors hover:bg-white/10"
                >
                  <X className="h-5 w-5 text-slate-300" />
                </button>
              </div>

              <div className="max-h-[calc(100vh-13rem)] space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-3 sm:p-3.5">
                <div className="rounded-[0.9rem] border border-slate-100 bg-white p-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Current assignment</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{selectedUser.name}</span>
                    {getRoleBadge(selectedUser.roleGroup)}
                    <span className="text-xs text-slate-500">{selectedUser.department}</span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Target Unit</label>
                    <div className="relative">
                      <select
                        value={workspaceTransferForm.targetWorkspaceId}
                        onChange={(event) => {
                          const nextWorkspace = transferWorkspaceOptions.find((item) => String(item.id) === String(event.target.value)) || null;
                          const nextDepartmentIds =
                            workspaceTransferForm.role === 'super_admin'
                              ? []
                              : workspaceTransferForm.role === 'admin'
                                ? (nextWorkspace?.departments?.[0]?.id ? [nextWorkspace.departments[0].id] : [])
                                : (nextWorkspace?.departments?.[0]?.id ? [nextWorkspace.departments[0].id] : []);
                          setWorkspaceTransferForm((current) => ({
                            ...current,
                            targetWorkspaceId: event.target.value,
                            departmentIds: nextDepartmentIds,
                          }));
                        }}
                        className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
                      >
                        {transferWorkspaceOptions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.workspaceName}{item.location ? ` - ${item.location}` : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Role After Transfer</label>
                    <div className="relative">
                      <select
                        value={workspaceTransferForm.role}
                        onChange={(event) => {
                          const nextRole = event.target.value;
                          setWorkspaceTransferForm((current) => ({
                            ...current,
                            role: nextRole,
                            departmentIds:
                              nextRole === 'super_admin'
                                ? []
                                : nextRole === 'admin'
                                  ? (current.departmentIds.length > 0
                                      ? current.departmentIds
                                      : (selectedTransferDepartmentOptions[0]?.id ? [selectedTransferDepartmentOptions[0].id] : []))
                                  : [current.departmentIds[0] || selectedTransferDepartmentOptions[0]?.id || ''].filter(Boolean),
                          }));
                        }}
                        className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
                      >
                        {TRANSFER_ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Department After Transfer</label>
                  {isSuperAdminTransferRole ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                      All Departments
                    </div>
                  ) : isAdminTransferRole ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      {selectedTransferDepartmentOptions.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {selectedTransferDepartmentOptions.map((department) => {
                            const isChecked = workspaceTransferForm.departmentIds.includes(department.id);
                            return (
                              <label
                                key={department.id}
                                className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 text-sm font-medium text-slate-700"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(event) =>
                                    setWorkspaceTransferForm((current) => ({
                                      ...current,
                                      departmentIds: event.target.checked
                                        ? [...current.departmentIds, department.id]
                                        : current.departmentIds.filter((id) => id !== department.id),
                                    }))
                                  }
                                  className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                                />
                                <span className="truncate">{department.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-1 py-2 text-sm text-slate-400">No departments available.</div>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedSingleTransferDepartmentId}
                        onChange={(event) =>
                          setWorkspaceTransferForm((current) => ({
                            ...current,
                            departmentIds: event.target.value ? [event.target.value] : [],
                          }))
                        }
                        className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
                      >
                        <option value="">Select department</option>
                        {selectedTransferDepartmentOptions.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  )}
                  {selectedTransferWorkspace?.location ? (
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      New location: {selectedTransferWorkspace.location}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Transfer Note</label>
                  <textarea
                    rows={3}
                    value={workspaceTransferForm.note}
                    onChange={(event) =>
                      setWorkspaceTransferForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    placeholder="Optional note for this transfer..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
                  />
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
                  The user will keep the same email and password. After transfer, they will sign in to the new workspace with the updated role and department shown here.
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100/60 bg-white p-3 sm:p-3.5">
                <button
                  onClick={() => setShowWorkspaceTransferDialog(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmWorkspaceTransfer}
                  disabled={isSaving}
                  className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : `Transfer as ${selectedTransferRole.label}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {showTransferDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2rem] max-w-md w-full overflow-hidden">
              <div className="p-5 sm:p-6 bg-[#1E293B]">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  Transfer Founder Access
                </h2>
              </div>
              <div className="p-5 sm:p-6 space-y-4">
                {!showTransferWarning ? (
                  <>
                    <p className="text-slate-500 text-sm">
                      You are about to transfer workspace founder access to a Super-Admin. This will move founder access to the selected account and refresh your current session.
                    </p>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Select New Founder</label>
                      <select
                        value={transferTargetUserId || eligibleOwnershipCandidates[0]?.id || ''}
                        onChange={(event) => setTransferTargetUserId(event.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-100/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent text-sm"
                      >
                        {eligibleOwnershipCandidates.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name} - {member.role}
                          </option>
                        ))}
                      </select>
                    </div>

                    {eligibleOwnershipCandidates.length === 0 && (
                      <p className="text-xs font-medium text-amber-600">
                        No eligible Super-Admin users are available for founder access transfer yet.
                      </p>
                    )}

                    <p className="text-xs text-slate-400">
                      Current founder: {ownerName}
                    </p>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-amber-900">
                            Final warning before transfer
                          </p>
                          <p className="text-sm text-amber-800 leading-relaxed">
                            All platform access will move with this transfer. The selected Super-Admin will be promoted to Founder, and the current Founder will be demoted to Super-Admin.
                          </p>
                          <p className="text-xs font-medium text-amber-700">
                            Selected recipient: {transferTargetUser?.name || 'Unknown user'} - {transferTargetUser?.role || 'Super-Admin'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400">
                      This action should only be used when you are ready to hand over the workspace.
                    </p>
                  </div>
                )}
              </div>
              <div className="p-5 sm:p-6 border-t border-slate-100/60 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowTransferDialog(false);
                    setShowTransferWarning(false);
                    setTransferTargetUserId('');
                  }}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferOwnership}
                  disabled={isSaving || !canEditAccessGrants || eligibleOwnershipCandidates.length === 0}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors text-sm disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : showTransferWarning ? 'Confirm Transfer' : 'Review Transfer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageFrame>
  );
}










