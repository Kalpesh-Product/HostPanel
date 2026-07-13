import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search, Plus, Eye, CheckCircle2, Clock, AlertCircle,
  Calendar, User, FileText, X, AlertTriangle, Paperclip,
  MessageSquare, Building2, Filter, Reply, CheckSquare, Shield, Wrench,
} from 'lucide-react';
import PageFrame from '../../components/Pages/PageFrame';
import {
  canAccessAdminDashboard,
  canAccessAdministrationDashboard,
  canAccessFinanceDashboard,
  canAccessHRDashboard,
  canAccessSalesDashboard,
  canAccessTechDashboard,
  canAccessITDashboard,
  canAccessMaintenanceDashboard,
  getStoredActingManagerContext,
  getStoredUser,
} from '../../lib/auth-session';
import { createTicket, getTickets, updateTicket } from '../../services/tickets';
import { getOrganizationOverview } from '../../services/organization';
import { getAssets } from '../../services/assets';
import { axiosPrivate } from '../../utils/axios';
import { statusPillClass } from '../../lib/status-pill';

// import { getWorkspaceMembers } from '@/services/auth';
// import { getAssets } from '@/services/assets';
// import { createTicket, getTicketIssueSuggestions, getTickets, updateTicket } from '@/services/tickets';

const TICKETS_PAGE_SIZE = 50;

// Self-contained skeleton matching MeetingRoomsPage skeleton style
function TicketsSkeleton() {
  return (
    <div className="space-y-4 w-full animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-1/4"></div>
      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
      <div className="grid grid-cols-4 gap-4 mt-8">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-24 bg-slate-200 rounded-2xl"></div>
        ))}
      </div>
      <div className="h-64 bg-slate-200 rounded-3xl mt-8"></div>
    </div>
  );
}

// Self-contained stub for RepairLogModal since it is not implemented in the codebase yet
function RepairLogModal({ open, onClose }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-pmedium text-slate-900 mb-2 flex items-center gap-2">
          <Wrench className="text-cyan-600" size={20} /> Repair Log Modal (Stub)
        </h3>
        <p className="text-slate-500 text-xs mb-4 leading-relaxed">
          The Repair Log workflow is currently disabled in frontend-only preview mode. Real-time updates and maintenance tracking will be enabled upon backend connection.
        </p>
        <button onClick={onClose} className="px-4 py-2 bg-slate-900 text-white text-xs font-pmedium rounded-xl hover:bg-black transition-colors w-full">
          Close
        </button>
      </div>
    </div>
  );
}

const MOCK_TICKETS = [
  {
    id: "TCK-401",
    recordId: "1",
    ticketCode: "TCK-401",
    title: "Air Conditioner leaking water in Meeting Room B",
    description: "The main split AC unit in Meeting Room B is leaking water heavily from the bottom panel. A small puddle has formed. Needs urgent inspection before meeting starts.",
    priority: "High",
    status: "Open",
    department: "Maintenance",
    submittedBy: "Alex Rivers",
    submittedByDept: "hr",
    assignedTo: "Maintenance Queue",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "TCK-402",
    recordId: "2",
    ticketCode: "TCK-402",
    title: "VPN Access Request for new joiners",
    description: "Please provision VPN access keys and credentials for the 3 engineering team members joining next Monday. Standard tech onboarding profile.",
    priority: "Medium",
    status: "In Progress",
    department: "IT",
    submittedBy: "Jane Smith",
    submittedByDept: "hr",
    assignedTo: "Bob Johnson",
    assigneeUserId: "user-bob",
    acceptedBy: "Bob Johnson",
    acceptedByUserId: "user-bob",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "TCK-403",
    recordId: "3",
    ticketCode: "TCK-403",
    title: "Double charge on monthly desk booking invoice",
    description: "The May invoice shows 12 hot desk allocations instead of the actual 6 used by the team. Requesting verification and correction.",
    priority: "Low",
    status: "Resolved",
    department: "Finance",
    submittedBy: "Alice Miller",
    submittedByDept: "tenant-employee",
    tenantCompanyName: "Stark Tech",
    assignedTo: "Finance Queue",
    resolutionNote: "Verified the desk usage log. Refund issued for 6 extra hot desks and invoice updated.",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  }
];

function getManagedOrganizationDepartments(currentUser) {
  const actingContext = getStoredActingManagerContext(currentUser);
  if (actingContext?.departmentName) {
    return [actingContext.departmentName];
  }

  const currentUserId = String(currentUser?._id || currentUser?.id || '').trim();
  const currentUserName = String(
    currentUser?.fullName ||
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') ||
    currentUser?.name ||
    '',
  )
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');

  const organizationDepartments = Array.isArray(currentUser?.workspace?.organizationDepartments)
    ? currentUser.workspace.organizationDepartments
    : [];

  return organizationDepartments
    .filter((department) => {
      const managerUserId = String(department?.managerUserId || '').trim();
      const managerName = String(department?.managerName || '')
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, '-');

      return (
        (currentUserId && managerUserId && currentUserId === managerUserId) ||
        (currentUserName && managerName && currentUserName === managerName)
      );
    })
    .map((department) => department?.name)
    .filter(Boolean);
}

function normalizeAsset(asset) {
  return {
    ...asset,
    recordId: asset.recordId || asset._id || asset.id || '',
    id: asset.id || asset.assetCode || asset.recordId || asset._id || '',
    assetCode: asset.assetCode || asset.id || '',
    assetName: asset.name || asset.assetName || '',
    department: asset.department || '',
    assignedTo: asset.assignedTo || '',
  };
}

function getSubmittedByBadgeLabel(value = '') {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');

  if (['tenant-company-employee', 'tenant-employee', 'tenant-company-manager', 'tenant-manager', 'tenant-admin'].includes(normalized)) {
    return 'Tenant Company Employee';
  }

  return '';
}

function getCompanyBadgeLabel(ticket = {}) {
  return String(ticket.tenantCompanyName || ticket.companyName || ticket.submittedByCompanyName || ticket.requestedByCompanyName || '').trim();
}

function getSubmittedByBadgeClass(value = '') {
  if (getSubmittedByBadgeLabel(value)) {
    return 'bg-violet-50 text-violet-700 border-violet-100';
  }

  return '';
}

function formatLocalInputDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

export function TicketsPage() {
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const location = useLocation();

  // Stabilize storedUser to prevent infinite re-renders — getStoredUser() returns
  // a new object reference on every call (JSON.parse), which would cause useEffect
  // dependencies to trigger endlessly.
  const [storedUser] = useState(() => getStoredUser());
  const actingContext = getStoredActingManagerContext(storedUser);
  const rawUserName =
    storedUser?.fullName ||
    [storedUser?.firstName, storedUser?.lastName].filter(Boolean).join(' ') ||
    storedUser?.name ||
    'User';
  const normalizedRole = (storedUser?.workspaceMembership?.role || storedUser?.role || 'owner').toLowerCase();
  const isOwnerProfile = normalizedRole === 'founder' || normalizedRole === 'owner';
  const isSuperAdminProfile = normalizedRole === 'super_admin' || normalizedRole === 'super-admin';
  const isAdminTicketProfile = canAccessAdminDashboard(storedUser);
  const displayUserName = isOwnerProfile
    ? `${rawUserName} (Founder)`
    : (isSuperAdminProfile && !actingContext)
      ? `${rawUserName} (Super Admin)`
      : rawUserName;
  const isHrTicketProfile = canAccessHRDashboard(storedUser);
  const isAdministrationTicketProfile = canAccessAdministrationDashboard(storedUser);
  const isSalesTicketProfile = canAccessSalesDashboard(storedUser);
  const isFinanceTicketProfile = canAccessFinanceDashboard(storedUser);
  const isTechTicketProfile = canAccessTechDashboard(storedUser);
  const isITTicketProfile = canAccessITDashboard(storedUser);
  const isMaintenanceTicketProfile = canAccessMaintenanceDashboard(storedUser);
  const isDepartmentManagerProfile =
    isHrTicketProfile ||
    isAdministrationTicketProfile ||
    isSalesTicketProfile ||
    isFinanceTicketProfile ||
    isTechTicketProfile ||
    isITTicketProfile ||
    isMaintenanceTicketProfile;
  const isManagerTicketProfile =
    isDepartmentManagerProfile ||
    normalizedRole === 'manager' ||
    normalizedRole.endsWith('_manager') ||
    normalizedRole.endsWith('-manager');
  const profile = {
    name: displayUserName,
    role: storedUser?.role || 'owner',
    dept: actingContext?.departmentName || (isOwnerProfile ? 'Founder' : isSuperAdminProfile ? 'Super Admin' : (storedUser?.workspaceMembership?.departments?.[0] || 'Executive')),
  };
  const currentUserId = String(storedUser?._id || storedUser?.id || storedUser?.userId || '').trim();
  const currentUserDepartments = [
    ...(Array.isArray(storedUser?.workspaceMembership?.departments) ? storedUser.workspaceMembership.departments : []),
    storedUser?.workspaceMembership?.department,
    storedUser?.department,
    storedUser?.workspace?.department,
    ...getManagedOrganizationDepartments(storedUser),
  ].filter(Boolean);
  const currentUserDepartmentKeys = useMemo(
    () => new Set(currentUserDepartments.map((department) => normalizeRoleValue(department)).filter(Boolean)),
    [currentUserDepartments],
  );
  const isEmployeeTicketProfile = !isOwnerProfile && !isSuperAdminProfile && !isAdminTicketProfile && !isManagerTicketProfile;
  // Tickets itself is a Professional/Custom module. Do not repeat the plan
  // lookup here: staff workspace lookups can briefly fall back to "basic" and
  // hide this tab even after the parent module access check has allowed entry.
  const showTenantCompanyTicketsTab =
    isOwnerProfile ||
    isSuperAdminProfile ||
    isAdminTicketProfile ||
    isManagerTicketProfile;

  function getAdminDepartments() {
    const departments = [
      ...(Array.isArray(storedUser?.workspaceMembership?.departments) ? storedUser.workspaceMembership.departments : []),
      storedUser?.workspaceMembership?.department,
      storedUser?.department,
    ].filter(Boolean);

    const seen = new Set();
    const assignedDepartments = [];

    departments.forEach((department) => {
      const normalized = normalizeRoleValue(department);
      if (!normalized || seen.has(normalized)) {
        return;
      }

      seen.add(normalized);
      assignedDepartments.push(department);
    });

    return assignedDepartments;
  }

  function normalizeIdentity(value) {
    return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function stripRoleSuffix(value) {
    return (value || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  }

  function roleLabel(role) {
    if (!role) return 'Employee';
    return role
      .toString()
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function isCurrentUserName(name) {
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

  function formatPersonLabel(name, department) {
    if (!name) {
      return '';
    }

    if (/\([^)]*\)/.test(name)) {
      return name;
    }

    return department ? `${name} (${department})` : name;
  }

  function isMyReceivedTicket(ticket) {
    const assignedId = ticket?.assigneeUserId ? String(ticket.assigneeUserId) : '';
    const me = currentUserId ? String(currentUserId) : '';

    if (me && assignedId === me) {
      return true;
    }

    if (!assignedId) {
      return isCurrentUserName(ticket?.assignedTo);
    }

    return false;
  }

  function isAssignedToCurrentUser(ticket) {
    const assignedId = ticket?.assigneeUserId ? String(ticket.assigneeUserId) : '';
    const me = currentUserId ? String(currentUserId) : '';

    if (!me) {
      return false;
    }

    return assignedId === me;
  }

  function isEmployeeDepartmentTaskTicket(ticket) {
    if (!isEmployeeTicketProfile) {
      return false;
    }

    const ticketKey = normalizeRoleValue(ticket?.department || '');
    if (!ticketKey || !currentUserDepartmentKeys.has(ticketKey)) {
      return false;
    }

    if (isEmployeeRaisedTicket(ticket)) {
      return false;
    }

    if (isAssignedToCurrentUser(ticket)) {
      return false;
    }

    return true;
  }

  function isEmployeeMyTicket(ticket) {
    if (!isEmployeeTicketProfile) {
      return false;
    }

    return isMyReceivedTicket(ticket);
  }

  function isEmployeeRaisedTicket(ticket) {
    if (!isEmployeeTicketProfile) {
      return false;
    }

    return isMyRaisedTicket(ticket);
  }

  function isMyRaisedTicket(ticket) {
    const requesterId = ticket?.requesterUserId ? String(ticket.requesterUserId) : '';
    const me = currentUserId ? String(currentUserId) : '';

    if (requesterId) {
      return Boolean(me && requesterId === me);
    }

    // Older tickets may not have requesterUserId, so retain a name fallback only
    // when there is no authoritative requester ID on the ticket.
    return isCurrentUserName(ticket?.submittedBy);
  }

  function isDepartmentTicket(ticket) {
    if (!ticket?.department) {
      return false;
    }

    if (isOwnerProfile || isSuperAdminProfile) {
      return !isSpecialRoutingDepartment(ticket.department);
    }

    if (!isManagerTicketProfile) {
      return false;
    }

    if (isAssignedToCurrentUser(ticket)) {
      return false;
    }

    const departmentKeys = currentUserDepartments.length > 0
      ? currentUserDepartments.map((department) => normalizeRoleValue(department))
      : ['hr'];

    const ticketKey = normalizeRoleValue(ticket?.department || '');
    return departmentKeys.includes(ticketKey);
  }

  // Helper check for routing
  function isDepartmentQueueTicket(ticket) {
    if (!isDepartmentTicket(ticket)) {
      return false;
    }

    const assigneeId = ticket?.assigneeUserId ? String(ticket.assigneeUserId) : '';
    const assignedTo = (ticket?.assignedTo || '').trim().toLowerCase();

    return !assigneeId && /queue$/i.test(assignedTo) && ticket?.status === 'Open';
  }

  function isDepartmentMyTicket(ticket) {
    if (!isManagerTicketProfile) {
      return false;
    }

    return isMyReceivedTicket(ticket);
  }

  function isAdminAssignedDepartmentTicket(ticket) {
    if (!isAdminTicketProfile) {
      return false;
    }

    if (isAssignedToCurrentUser(ticket)) {
      return false;
    }

    const ticketKey = normalizeRoleValue(ticket?.department || '');
    return Boolean(ticketKey && adminAssignedDepartmentKeys.has(ticketKey));
  }

  function isAdminDepartmentQueueTicket(ticket) {
    if (!isAdminAssignedDepartmentTicket(ticket)) {
      return false;
    }

    const assigneeId = ticket?.assigneeUserId ? String(ticket.assigneeUserId) : '';
    const assignedTo = (ticket?.assignedTo || '').trim().toLowerCase();

    return !assigneeId && /queue$/i.test(assignedTo) && ticket?.status === 'Open';
  }

  const canDelegateDepartmentQueueTicket = ['manager', 'admin', 'hr_manager', 'hr', 'admin_manager', 'finance_manager', 'tech_manager', 'it_manager', 'maintenance_manager', 'owner', 'super_admin'].includes(normalizedRole);

  // --- STATE ---
  const [activeTab, setActiveTab] = useState(() => (
    isAdminTicketProfile
      ? 'assigned_dept_tickets'
      : (isManagerTicketProfile ? 'department_tickets' : (isEmployeeTicketProfile ? 'department_tasks' : 'all'))
  ));
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingTicket, setViewingTicket] = useState(null);
  const [isRepairLogModalOpen, setIsRepairLogModalOpen] = useState(false);
  const [repairLogSourceTicket, setRepairLogSourceTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Resolution State 
  const [showResolvePrompt, setShowResolvePrompt] = useState(false);
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [ticketQueueAssigneeUserId, setTicketQueueAssigneeUserId] = useState('');

  // Form State
  const initialForm = {
    title: '',
    description: '',
    department: '',
    assignee: '',
    assigneeUserId: '',
    priority: 'Medium',
    assetId: '',
    dueDate: '',
  };
  const [ticketForm, setTicketForm] = useState(initialForm);

  const [orgData, setOrgData] = useState({});
  const [workspaceDepartmentNames, setWorkspaceDepartmentNames] = useState([]);
  const [memberRoleByName, setMemberRoleByName] = useState({});
  const [memberIdByName, setMemberIdByName] = useState({});
  const [memberDirectory, setMemberDirectory] = useState([]);
  const [specialRoutingAssignees, setSpecialRoutingAssignees] = useState({
    owner: [],
    superAdmin: [],
    admin: [],
  });
  const [issueSuggestions, setIssueSuggestions] = useState([]);
  const [issueSuggestionsLoading, setIssueSuggestionsLoading] = useState(false);
  const [assetOptions, setAssetOptions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [optimisticTicketBackups, setOptimisticTicketBackups] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 3, hasNextPage: false });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  function resolveMemberName(member) {
    if (member?.fullName && member.fullName.trim()) {
      return member.fullName.trim();
    }

    if (member?.name && member.name.trim()) {
      return member.name.trim();
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

  function normalizeRoleValue(role) {
    const normalized = (role || '').toString().trim().toLowerCase();
    const collapsed = normalized.replace(/[^a-z]/g, '');
    if (collapsed === 'superadmin') {
      return 'super_admin';
    }

    return normalized.replace(/[-\s]+/g, '_');
  }

  function canonicalizeDepartmentLabel(department) {
    const normalized = normalizeRoleValue(department);
    if (normalized === 'it') return 'IT';
    if (normalized === 'hr') return 'HR';
    if (normalized === 'super_admin') return 'Super Admin';
    if (normalized === 'owner') return 'Founder';
    if (normalized === 'admin') return 'Admin';
    if (normalized === 'administration') return 'Administration';
    if (normalized === 'sales') return 'Sales';
    if (normalized === 'finance') return 'Finance';
    if (normalized === 'tech') return 'Tech';
    if (normalized === 'maintenance') return 'Maintenance';
    return String(department || '').trim();
  }

  function dedupeDepartmentLabels(departments = []) {
    const seen = new Set();
    const labels = [];

    (Array.isArray(departments) ? departments : []).forEach((department) => {
      const label = canonicalizeDepartmentLabel(department);
      const key = normalizeRoleValue(label);
      if (!key || seen.has(key)) {
        return;
      }

      seen.add(key);
      labels.push(label);
    });

    return labels;
  }

  function shouldShowDepartmentOption(department) {
    if (/^sales\s*(&|and)?\s*crm$/i.test(String(department || '').trim())) {
      return false;
    }

    const normalized = normalizeRoleValue(department);
    if (isOwnerProfile && normalized === 'owner') {
      return false;
    }

    if (isSuperAdminProfile && normalized === 'super_admin') {
      return false;
    }

    return true;
  }

  function orderTopManagementDepartments(departments) {
    const uniqueDepartments = dedupeDepartmentLabels(departments);
    const topManagementOrder = ['Founder', 'Super Admin', 'Admin'];
    const orderedTopManagement = topManagementOrder.filter((label) =>
      uniqueDepartments.some((department) => normalizeRoleValue(department) === normalizeRoleValue(label)),
    );
    const remainingDepartments = uniqueDepartments.filter(
      (department) => !orderedTopManagement.some((label) => normalizeRoleValue(label) === normalizeRoleValue(department)),
    );

    return [...orderedTopManagement, ...remainingDepartments];
  }

  function isSpecialRoutingDepartment(department) {
    const normalized = normalizeRoleValue(department);
    return normalized === 'owner' || normalized === 'super_admin' || normalized === 'admin';
  }

  function requiresAssetSnapshotDepartment(department) {
    const normalized = normalizeRoleValue(department);
    return normalized === 'it' || normalized === 'maintenance';
  }

  function canCreateRepairLogForTicket(ticket) {
    const ticketDepartmentKey = normalizeRoleValue(ticket?.department || '');
    if (!['it', 'maintenance'].includes(ticketDepartmentKey)) {
      return false;
    }

    return canCurrentUserChangeTicketStatus(ticket) && ticket?.status === 'In Progress';
  }

  const adminAssignedDepartments = useMemo(
    () => (isAdminTicketProfile ? getAdminDepartments() : []),
    [storedUser, isAdminTicketProfile],
  );

  const adminAssignedDepartmentKeys = useMemo(
    () => new Set(adminAssignedDepartments.map((department) => normalizeRoleValue(department)).filter(Boolean)),
    [adminAssignedDepartments],
  );

  function isOwnerSuperAdminDirectTicket(ticket) {
    const raisedDept = normalizeRoleValue(ticket?.submittedByDept || '');
    const targetDept = normalizeRoleValue(ticket?.department || '');

    return (
      (raisedDept === 'owner' && targetDept === 'super_admin') ||
      (raisedDept === 'super_admin' && targetDept === 'owner')
    );
  }

  function isTenantCompanyTicket(ticket) {
    return Boolean(
      ticket?.tenantCompanyId ||
      ticket?.tenantCompanyName ||
      getSubmittedByBadgeLabel(ticket?.submittedByDept),
    );
  }

  function isTenantCompanyTicketVisibleToCurrentTeam(ticket) {
    if (!isTenantCompanyTicket(ticket)) {
      return false;
    }

    if (isOwnerProfile || isSuperAdminProfile) {
      return true;
    }

    if (isMyReceivedTicket(ticket)) {
      return true;
    }

    const ticketDepartmentKey = normalizeRoleValue(ticket?.department || '');
    if (!ticketDepartmentKey) {
      return false;
    }

    const currentMember = memberDirectory.find((member) =>
      currentUserId && String(member?.userId || member?.id || '') === String(currentUserId),
    );
    const currentTeamKeys = new Set(currentUserDepartmentKeys);
    (Array.isArray(currentMember?.departments) ? currentMember.departments : []).forEach((department) => {
      const departmentKey = normalizeRoleValue(department);
      if (departmentKey) currentTeamKeys.add(departmentKey);
    });

    if (isAdminTicketProfile) {
      return adminAssignedDepartmentKeys.has(ticketDepartmentKey) || currentTeamKeys.has(ticketDepartmentKey);
    }

    return isManagerTicketProfile && currentTeamKeys.has(ticketDepartmentKey);
  }

  function isAdminDepartmentTicket(ticket) {
    if (!isAdminTicketProfile) {
      return false;
    }

    const ticketKey = normalizeRoleValue(ticket?.department || '');
    if (!ticketKey || !adminAssignedDepartmentKeys.has(ticketKey)) {
      return false;
    }

    const assigneeId = ticket?.assigneeUserId ? String(ticket.assigneeUserId) : '';
    const assignedTo = (ticket?.assignedTo || '').trim().toLowerCase();

    return !assigneeId && /queue$/i.test(assignedTo) && ticket?.status === 'Open';
  }

  function isAdminMyTicket(ticket) {
    if (!isAdminTicketProfile) {
      return false;
    }

    return isMyReceivedTicket(ticket);
  }

  function canCurrentUserChangeTicketStatus(ticket) {
    const assignedId = ticket?.assigneeUserId ? String(ticket.assigneeUserId) : '';
    const me = currentUserId ? String(currentUserId) : '';

    if (me && assignedId) {
      return assignedId === me;
    }

    if (!assignedId) {
      return isCurrentUserName(ticket?.assignedTo);
    }

    return false;
  }

  function isAdminCreatedTicket(ticket) {
    if (!isAdminTicketProfile) {
      return false;
    }

    return isMyRaisedTicket(ticket);
  }

  const availableDepartments = useMemo(() => {
    if (isAdminTicketProfile) {
      return dedupeDepartmentLabels(adminAssignedDepartments);
    }

    const fromMembers = Object.keys(orgData).filter((department) => shouldShowDepartmentOption(department));
    if (fromMembers.length > 0) {
      return (isOwnerProfile || isSuperAdminProfile || normalizedRole.includes('manager'))
        ? orderTopManagementDepartments([...fromMembers, 'Admin'])
        : dedupeDepartmentLabels(fromMembers);
    }

    const fromTickets = Array.from(new Set(tickets.map((ticket) => ticket.department).filter(Boolean))).filter((department) => shouldShowDepartmentOption(department));
    if (fromTickets.length > 0) {
      return (isOwnerProfile || isSuperAdminProfile || normalizedRole.includes('manager'))
        ? orderTopManagementDepartments([...fromTickets, 'Admin'])
        : dedupeDepartmentLabels(fromTickets);
    }

    const fromWorkspace =
      storedUser?.workspace?.departments ||
      storedUser?.workspaceDraft?.departments ||
      [];

    return Array.isArray(fromWorkspace)
      ? (isOwnerProfile || isSuperAdminProfile || normalizedRole.includes('manager'))
        ? orderTopManagementDepartments([
          ...fromWorkspace.filter(Boolean).filter((department) => shouldShowDepartmentOption(department)),
          'Admin',
        ])
        : dedupeDepartmentLabels(fromWorkspace.filter(Boolean).filter((department) => shouldShowDepartmentOption(department)))
      : [];
  }, [orgData, storedUser, tickets, isAdminTicketProfile, adminAssignedDepartments, isOwnerProfile, isSuperAdminProfile, normalizedRole]);

  const ticketCreateDepartments = useMemo(() => {
    // Prefer the canonical workspace department list fetched from the API.
    // Fall back to departments inferred from member data / existing tickets only
    // when the API hasn't returned anything yet.
    const primarySource = workspaceDepartmentNames.length > 0
      ? workspaceDepartmentNames
      : [
          ...Object.keys(orgData),
          ...(Array.isArray(storedUser?.workspace?.departments) ? storedUser.workspace.departments : []),
          ...(Array.isArray(storedUser?.workspaceDraft?.departments) ? storedUser.workspaceDraft.departments : []),
          ...tickets.map((ticket) => ticket.department).filter(Boolean),
        ];

    const collectedDepartments = primarySource
      .filter(Boolean)
      .filter((department) => shouldShowDepartmentOption(department));

    return orderTopManagementDepartments(collectedDepartments);
  }, [workspaceDepartmentNames, orgData, storedUser, tickets, isOwnerProfile, isSuperAdminProfile, normalizedRole]);

  const assigneeOptions = useMemo(() => {
    return getAssigneeOptionsForDepartment(ticketForm.department);
  }, [ticketForm.department, memberDirectory, currentUserId]);

  const selectedTicketAsset = useMemo(
    () => assetOptions.find((asset) => String(asset.recordId || asset.id || asset.assetCode || '') === String(ticketForm.assetId || '')) || null,
    [assetOptions, ticketForm.assetId],
  );

  const ticketQueueAssigneeOptions = useMemo(() => {
    const isAccessibleQueueTicket =
      (isManagerTicketProfile && viewingTicket && isDepartmentQueueTicket(viewingTicket)) ||
      (isAdminTicketProfile && viewingTicket && isAdminDepartmentQueueTicket(viewingTicket)) ||
      ((isOwnerProfile || isSuperAdminProfile) && viewingTicket && isDepartmentQueueTicket(viewingTicket));

    if (!isAccessibleQueueTicket) {
      return [];
    }

    return getAssigneeOptionsForDepartment(viewingTicket.department).filter((member) => {
      const memberRole = normalizeRoleValue(member?.role || '');
      const memberUserId = member?.userId ? String(member.userId) : '';

      if (memberUserId && currentUserId && memberUserId === String(currentUserId)) {
        return true;
      }

      if (isAdminTicketProfile) {
        return memberRole.includes('manager') || memberRole === 'employee';
      }

      if (isOwnerProfile || isSuperAdminProfile) {
        return memberRole === 'employee' || memberRole === 'manager' || memberRole === 'admin' || memberRole.endsWith('_manager');
      }

      return memberRole === 'employee';
    });
  }, [isManagerTicketProfile, isAdminTicketProfile, isOwnerProfile, isSuperAdminProfile, viewingTicket, currentUserId, memberDirectory, specialRoutingAssignees]);

  const ticketQueueAcceptanceOptions = useMemo(() => {
    const isAccessibleQueueTicket =
      (isManagerTicketProfile && viewingTicket && isDepartmentQueueTicket(viewingTicket)) ||
      (isAdminTicketProfile && viewingTicket && isAdminDepartmentQueueTicket(viewingTicket)) ||
      ((isOwnerProfile || isSuperAdminProfile) && viewingTicket && isDepartmentQueueTicket(viewingTicket));

    if (!isAccessibleQueueTicket) {
      return [];
    }

    return ticketQueueAssigneeOptions.filter((member) => {
      const memberUserId = member?.userId ? String(member.userId) : '';
      const memberRole = normalizeRoleValue(member?.role || '');

      if (memberUserId && currentUserId && memberUserId === String(currentUserId)) {
        return false;
      }

      if (isAdminTicketProfile) {
        return memberRole.includes('manager') || memberRole === 'employee';
      }

      if (isOwnerProfile || isSuperAdminProfile) {
        return memberRole === 'employee' || memberRole === 'manager' || memberRole === 'admin' || memberRole.endsWith('_manager');
      }

      return memberRole === 'employee';
    });
  }, [isManagerTicketProfile, isAdminTicketProfile, isOwnerProfile, isSuperAdminProfile, viewingTicket, currentUserId, ticketQueueAssigneeOptions]);

  useEffect(() => {
    const isAccessibleQueueTicket =
      (isManagerTicketProfile && viewingTicket && isDepartmentQueueTicket(viewingTicket)) ||
      (isAdminTicketProfile && viewingTicket && isAdminDepartmentQueueTicket(viewingTicket)) ||
      ((isOwnerProfile || isSuperAdminProfile) && viewingTicket && isDepartmentQueueTicket(viewingTicket));

    if (!viewingTicket || !isAccessibleQueueTicket) {
      setTicketQueueAssigneeUserId('');
      return;
    }

    setTicketQueueAssigneeUserId(currentUserId || '');
  }, [viewingTicket, isManagerTicketProfile, isAdminTicketProfile, isOwnerProfile, isSuperAdminProfile, currentUserId]);

  function getAssigneeOptionsForDepartment(department) {
    if (!department) {
      return [];
    }

    const normalizedDepartment = normalizeRoleValue(department);
    const routingPoolMembers =
      normalizedDepartment === 'owner'
        ? specialRoutingAssignees.owner
        : normalizedDepartment === 'super_admin'
          ? specialRoutingAssignees.superAdmin
          : normalizedDepartment === 'admin'
            ? specialRoutingAssignees.admin
            : [];

    const selectedMembers = routingPoolMembers.length > 0
      ? routingPoolMembers
      : memberDirectory.filter((member) => {
        const memberRole = normalizeRoleValue(member?.role || '');
        const memberDepartments = Array.isArray(member?.departments) ? member.departments : [];
        const hasDepartment = memberDepartments.some(
          (item) => normalizeRoleValue(item) === normalizedDepartment,
        );

        if (normalizedDepartment === 'owner') {
          return memberRole === 'owner' || hasDepartment;
        }

        if (normalizedDepartment === 'super_admin') {
          return memberRole === 'super_admin' || hasDepartment;
        }

        if (normalizedDepartment === 'admin') {
          return memberRole === 'admin' || hasDepartment;
        }

        return hasDepartment;
      });



    const combinedMembers = [];
    const seenMemberKeys = new Set();

    selectedMembers.forEach((member) => {
      const memberKey = String(member?.userId || member?.id || member?.name || '').trim().toLowerCase();
      if (!memberKey || seenMemberKeys.has(memberKey)) {
        return;
      }

      seenMemberKeys.add(memberKey);
      combinedMembers.push(member);
    });

    return combinedMembers.map((member) => {
      const memberUserId = member?.userId ? String(member.userId) : '';
      const hasStableUserMatch =
        memberUserId && currentUserId && memberUserId === String(currentUserId);
      const isSelf = hasStableUserMatch ? true : false;
      const roleText = roleLabel(member.role);
      const emailText = member?.email ? ` - ${member.email}` : '';
      return {
        id: member.id,
        userId: member.userId,
        name: member.name,
        role: roleText,
        isSelf,
        label: `${member.name} (${roleText})${emailText}`,
      };
    });
  }

  function resolvePreferredAssigneeForDepartment(department, preferredAssigneeUserId = '') {
    const options = getAssigneeOptionsForDepartment(department);
    const preferredId = preferredAssigneeUserId ? String(preferredAssigneeUserId) : '';

    if (preferredId) {
      const preferredOption = options.find(
        (option) =>
          String(option.userId || option.id || '') === preferredId && !option.isSelf,
      );

      if (preferredOption) {
        return preferredOption;
      }
    }

    return options.find((option) => !option.isSelf) || options[0] || null;
  }

  function getQueueAssigneeLabel(department) {
    return department ? `${department} Queue` : 'Dept General Queue';
  }

  function isQueueSelection(value = '', assigneeUserId = '') {
    return !String(value || '').trim() && !String(assigneeUserId || '').trim();
  }

  function normalizeNullableUserId(value) {
    if (!value) {
      return '';
    }

    if (typeof value === 'object') {
      return String(value._id || value.id || value.userId || '').trim();
    }

    return String(value).trim();
  }

  function formatCreatedLabel(value) {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatUpdatedLabel(value) {
    if (!value) {
      return 'Just now';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Just now';
    }

    const elapsedMs = Date.now() - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (elapsedMs < minute) {
      return 'Just now';
    }

    if (elapsedMs < hour) {
      const minutes = Math.max(1, Math.floor(elapsedMs / minute));
      return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
    }

    if (elapsedMs < day) {
      const hours = Math.max(1, Math.floor(elapsedMs / hour));
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }

    const days = Math.max(1, Math.floor(elapsedMs / day));
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  function normalizeTicket(ticket) {
    const normalizedAssigneeUserId = normalizeNullableUserId(ticket.assigneeUserId);
    const normalizedRequesterUserId = normalizeNullableUserId(ticket.requesterUserId);
    const normalizedAcceptedByUserId = normalizeNullableUserId(ticket.acceptedByUserId);
    const normalizedRepairLogAssignedToUserId = normalizeNullableUserId(ticket.repairLogAssignedToUserId);
    const populatedAssigneeName = typeof ticket.assigneeUserId === 'object'
      ? String(ticket.assigneeUserId?.name || ticket.assigneeUserId?.email || '').trim()
      : '';

    return {
      ...ticket,
      recordId: String(ticket.recordId || ticket._id || ''),
      id: ticket.id || ticket.ticketCode || '',
      ticketCode: ticket.ticketCode || ticket.id || '',
      assignedTo: ticket.assignedTo || populatedAssigneeName || ticket.assignee || '',
      assigneeUserId: normalizedAssigneeUserId,
      requesterUserId: normalizedRequesterUserId,
      acceptedByUserId: normalizedAcceptedByUserId,
      tenantCompanyId: ticket.tenantCompanyId || '',
      tenantCompanyName: ticket.tenantCompanyName || '',
      assetId: ticket.assetId || '',
      assetCode: ticket.assetCode || '',
      assetName: ticket.assetName || '',
      assetDepartment: ticket.assetDepartment || '',
      assetAssignedTo: ticket.assetAssignedTo || '',
      dueDate: ticket.dueDate || '',
      created: formatCreatedLabel(ticket.createdAt),
      updated: formatUpdatedLabel(ticket.updatedAt),
      resolutionNote: ticket.resolutionNote || '',
      hasRepairLog: Boolean(ticket.hasRepairLog || ticket.repairLogCode || ticket.repairLogId),
      repairLogCode: ticket.repairLogCode || '',
      repairLogAssignedTo: ticket.repairLogAssignedTo || '',
      repairLogAssignedToUserId: normalizedRepairLogAssignedToUserId || null,
      repairLogStatus: ticket.repairLogStatus || '',
    };
  }

  function registerRepairLogOnTicket(repairLog) {
    if (!repairLog) {
      return;
    }

    const sourceTicketId = String(repairLog.sourceTicketId || '').trim();
    const sourceTicketCode = String(repairLog.sourceTicketCode || '').trim().toLowerCase();

    if (!sourceTicketId && !sourceTicketCode) {
      return;
    }

    const applyRepairLogFlag = (ticket) => {
      const ticketRecordId = String(ticket?.recordId || '').trim();
      const ticketId = String(ticket?.id || '').trim();
      const ticketCode = String(ticket?.ticketCode || '').trim().toLowerCase();

      const matchesTicket =
        (sourceTicketId && (ticketRecordId === sourceTicketId || ticketId === sourceTicketId)) ||
        (sourceTicketCode && ticketCode === sourceTicketCode);

      if (!matchesTicket) {
        return ticket;
      }

      return {
        ...ticket,
        hasRepairLog: true,
        repairLogCode: repairLog.repairLogCode || ticket.repairLogCode || '',
        repairLogAssignedTo: repairLog.assignedTo || ticket.repairLogAssignedTo || '',
        repairLogAssignedToUserId: repairLog.assigneeUserId || ticket.repairLogAssignedToUserId || null,
        repairLogStatus: repairLog.status || ticket.repairLogStatus || 'Open',
      };
    };

    setTickets((current) => current.map(applyRepairLogFlag));
    setViewingTicket((current) => (current ? applyRepairLogFlag(current) : current));
    setRepairLogSourceTicket((current) => (current ? applyRepairLogFlag(current) : current));
  }

  function buildTicketDescription(baseDescription, asset) {
    const description = String(baseDescription || '').trim();
    if (!asset) {
      return description;
    }

    const lines = [
      `Asset: ${asset.assetName || asset.name || 'Unknown Asset'} (${asset.assetCode || asset.id || asset.recordId || 'N/A'})`,
      `Department: ${asset.department || 'Unassigned'}`,
      `Assigned To: ${asset.assignedTo || 'Unassigned'}`,
      '',
      description,
    ];

    return lines.filter((line, index) => index < 4 || line).join('\n').trim();
  }

  function buildRepairLogSourceTicket(ticket) {
    if (!ticket) {
      return ticket;
    }

    const requesterName = String(ticket.requestedBy || ticket.submittedBy || '').trim();
    const requesterUserId =
      String(ticket.requesterUserId || '').trim() ||
      String(memberIdByName[requesterName] || '').trim();

    return {
      ...ticket,
      requestedBy: requesterName || ticket.requestedBy || '',
      requesterUserId,
    };
  }

  function applyIssueSuggestion(issue) {
    if (!issue) {
      return;
    }

    setTicketForm((current) => ({
      ...current,
      title: issue.title || current.title,
      description: current.description?.trim() ? current.description : (issue.description || current.description),
    }));
  }

  function applyOptimisticTicketPatch(recordId, patch) {
    const existingTicket = tickets.find((ticket) => ticket.recordId === recordId) || null;
    if (!existingTicket) {
      return;
    }

    setOptimisticTicketBackups((current) => ({
      ...current,
      [recordId]: current[recordId] || existingTicket,
    }));

    const optimisticTicket = normalizeTicket({
      ...existingTicket,
      ...patch,
      updatedAt: new Date().toISOString(),
    });

    setTickets((current) =>
      current.map((ticket) => (ticket.recordId === recordId ? optimisticTicket : ticket)),
    );
    setViewingTicket((current) => (current && current.recordId === recordId ? optimisticTicket : current));
  }

  function rollbackOptimisticTicketPatch(recordId) {
    const backup = optimisticTicketBackups[recordId];
    if (!backup) {
      return;
    }

    setTickets((current) =>
      current.map((ticket) => (ticket.recordId === recordId ? backup : ticket)),
    );
    setViewingTicket((current) => (current && current.recordId === recordId ? backup : current));
    setOptimisticTicketBackups((current) => {
      const next = { ...current };
      delete next[recordId];
      return next;
    });
  }

  // API calls replaced with mock updates
  useEffect(() => {
    let isMounted = true;

    async function loadTickets() {
      setIsInitialLoading(true);
      try {
        const response = await getTickets({ page: 1, limit: TICKETS_PAGE_SIZE });
        const loadedTickets = Array.isArray(response) ? response : response?.tickets || response?.items || [];
        if (isMounted) {
          setTickets(loadedTickets.map(normalizeTicket));
          setPagination((current) => ({ ...current, total: loadedTickets.length, hasNextPage: false }));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.response?.data?.message || 'Unable to load tickets. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    }

    loadTickets();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load real workspace members from organization overview API
  useEffect(() => {
    let isMounted = true;

    async function loadMembers() {
      if (!isMounted) return;

      try {
        const response = await getOrganizationOverview(axiosPrivate);
        const data = response?.data?.data || response?.data || response;
        const teamMembers = Array.isArray(data?.teamMembers) ? data.teamMembers : [];
        const departments = Array.isArray(data?.departments) ? data.departments : [];

        // Build canonical members from real team data
        const members = teamMembers
          .filter((member) => member.name || member.email)
          .map((member) => ({
            id: member.userId || member.id || '',
            userId: member.userId || member.id || '',
            name: member.name || member.email || '',
            email: member.email || '',
            role: normalizeRoleValue(member.role || 'employee'),
            departments: Array.isArray(member.departmentNames) ? member.departmentNames.filter(Boolean) : [],
          }));

        // Always include current user if not already in the list
        const currentUserIdStr = String(currentUserId || '').trim();
        const currentUserInList = members.some((m) => String(m.userId) === currentUserIdStr);
        if (!currentUserInList && currentUserIdStr) {
          members.unshift({
            id: currentUserIdStr,
            userId: currentUserIdStr,
            name: rawUserName,
            email: storedUser?.email || '',
            role: normalizeRoleValue(normalizedRole),
            departments: currentUserDepartments,
          });
        }

        if (!isMounted) return;

        const canonicalById = members.reduce((acc, member) => {
          const memberName = resolveMemberName(member);
          if (!memberName) return acc;

          const memberUserId = member?.userId ? String(member.userId) : '';
          const key = memberUserId || `${normalizeIdentity(memberName)}::${normalizeIdentity(member?.email || '')}`;
          if (!acc[key]) {
            acc[key] = {
              id: memberUserId || key,
              userId: memberUserId || '',
              name: memberName,
              email: member?.email || '',
              role: normalizeRoleValue(member?.role || 'employee'),
              departments: Array.isArray(member?.departments) ? member.departments.filter(Boolean) : [],
            };
          }
          return acc;
        }, {});

        const canonicalMembers = Object.values(canonicalById);
        setMemberDirectory(canonicalMembers);

        const ownerNamesByRole = canonicalMembers
          .filter((member) => member.role === 'owner' || member.departments.some((department) => normalizeRoleValue(department) === 'owner'))
          .map((member) => member.name)
          .filter(Boolean);
        const superAdminNamesByRole = canonicalMembers
          .filter((member) => member.role === 'super_admin' || member.departments.some((department) => normalizeRoleValue(department) === 'super_admin'))
          .map((member) => member.name)
          .filter(Boolean);
        const adminNamesByRole = canonicalMembers
          .filter((member) => member.role === 'admin' || member.departments.some((department) => normalizeRoleValue(department) === 'admin'))
          .map((member) => member.name)
          .filter(Boolean);

        // Build department list from organization data, fallback to workspace departments
        const orgDeptNames = departments
          .filter((d) => d.isActive !== false)
          .map((d) => d.name)
          .filter(Boolean);
        const workspaceDepartments = orgDeptNames.length > 0
          ? orgDeptNames
          : Array.isArray(storedUser?.workspace?.departments)
            ? storedUser.workspace.departments.filter(Boolean)
            : [];

        if (workspaceDepartments.length > 0) {
          setWorkspaceDepartmentNames(workspaceDepartments);
        }

        const grouped = canonicalMembers.reduce((acc, member) => {
          member.departments.forEach((department) => {
            if (!department) return;
            if (!acc[department]) acc[department] = [];
            if (member.name && !acc[department].includes(member.name)) {
              acc[department].push(member.name);
            }
          });
          return acc;
        }, {});

        workspaceDepartments.forEach((department) => {
          if (!grouped[department]) grouped[department] = [];
        });

        const ownerNamesByDepartment = Object.entries(grouped)
          .filter(([department]) => normalizeRoleValue(department) === 'owner')
          .flatMap(([, names]) => (Array.isArray(names) ? names : []))
          .filter(Boolean);

        const superAdminNamesByDepartment = Object.entries(grouped)
          .filter(([department]) => normalizeRoleValue(department) === 'super_admin')
          .flatMap(([, names]) => (Array.isArray(names) ? names : []))
          .filter(Boolean);
        const adminNamesByDepartment = Object.entries(grouped)
          .filter(([department]) => normalizeRoleValue(department) === 'admin')
          .flatMap(([, names]) => (Array.isArray(names) ? names : []))
          .filter(Boolean);

        const ownerNames = Array.from(new Set([...ownerNamesByRole, ...ownerNamesByDepartment]));
        const superAdminNames = Array.from(new Set([...superAdminNamesByRole, ...superAdminNamesByDepartment]));
        const adminNames = Array.from(new Set([...adminNamesByRole, ...adminNamesByDepartment]));

        const roleMap = canonicalMembers.reduce((acc, member) => {
          if (member?.name) acc[member.name] = roleLabel(member.role);
          return acc;
        }, {});

        const idMap = canonicalMembers.reduce((acc, member) => {
          if (member?.name && member?.userId) acc[member.name] = member.userId;
          return acc;
        }, {});

        grouped.Founder = ownerNames;
        grouped['Super Admin'] = superAdminNames;

        setOrgData(grouped);
        setMemberRoleByName(roleMap);
        setMemberIdByName(idMap);

        const ownerRoutingMembers = canonicalMembers.filter((member) => {
          const memberRole = normalizeRoleValue(member?.role || '');
          const memberDepartments = Array.isArray(member?.departments) ? member.departments : [];
          return memberRole === 'owner' || memberDepartments.some((department) => normalizeRoleValue(department) === 'owner');
        });

        const superAdminRoutingMembers = canonicalMembers.filter((member) => {
          const memberRole = normalizeRoleValue(member?.role || '');
          const memberDepartments = Array.isArray(member?.departments) ? member.departments : [];
          return memberRole === 'super_admin' || memberDepartments.some((department) => normalizeRoleValue(department) === 'super_admin');
        });

        setSpecialRoutingAssignees({
          owner: ownerRoutingMembers.length > 0 ? ownerRoutingMembers : canonicalMembers.filter((member) => normalizeRoleValue(member?.role || '') === 'owner'),
          superAdmin: superAdminRoutingMembers.length > 0 ? superAdminRoutingMembers : canonicalMembers.filter((member) => normalizeRoleValue(member?.role || '') === 'super_admin'),
          admin: adminNames.length > 0
            ? canonicalMembers.filter((member) => adminNames.includes(member.name))
            : canonicalMembers.filter((member) => normalizeRoleValue(member?.role || '') === 'admin'),
        });
        setIsLoadingMembers(false);
      } catch (error) {
        console.error('Failed to load organization members:', error);
        // Fallback: include only the current user
        if (isMounted && currentUserId) {
          const selfMember = {
            id: currentUserId,
            userId: currentUserId,
            name: rawUserName,
            email: storedUser?.email || '',
            role: normalizeRoleValue(normalizedRole),
            departments: currentUserDepartments,
          };
          setMemberDirectory([selfMember]);
          setMemberRoleByName({ [rawUserName]: roleLabel(normalizedRole) });
          setMemberIdByName({ [rawUserName]: currentUserId });
        }
        setIsLoadingMembers(false);
      }
    }

    loadMembers();

    return () => {
      isMounted = false;
    };
  }, []); // Empty deps — runs once on mount (storedUser is stabilized via useState)

  // Mock Issue suggestions
  useEffect(() => {
    if (!isCreateModalOpen || !ticketForm.department) {
      setIssueSuggestions([]);
      setIssueSuggestionsLoading(false);
      return undefined;
    }

    let isMounted = true;

    const timerId = window.setTimeout(() => {
      if (!isMounted) return;

      const mockSuggestions = [
        { title: `${ticketForm.department} Request - Resource Provisioning`, description: "Standard request for new unit resources or software licenses.", department: ticketForm.department, departmentKey: ticketForm.department.toLowerCase() },
        { title: `${ticketForm.department} Support - Incident Reporting`, description: "Reporting a physical or digital interruption affecting department activity.", department: ticketForm.department, departmentKey: ticketForm.department.toLowerCase() },
        { title: `${ticketForm.department} Help - Query & Clarification`, description: "General questions concerning corporate policies or task assignments.", department: ticketForm.department, departmentKey: ticketForm.department.toLowerCase() },
      ];
      setIssueSuggestions(mockSuggestions);
      setIssueSuggestionsLoading(false);
    }, 200);

    return () => {
      isMounted = false;
      window.clearTimeout(timerId);
    };
  }, [isCreateModalOpen, ticketForm.department, ticketForm.title]);

  // Load real assets from API when create modal opens
  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }

    let isMounted = true;

    async function loadAssets() {
      try {
        const assets = await getAssets();
        const assetList = Array.isArray(assets) ? assets : [];
        if (isMounted) {
          setAssetOptions(assetList.map(normalizeAsset).filter((asset) => asset.status !== 'Decommissioned'));
        }
      } catch (error) {
        console.error('Failed to load assets:', error);
        if (isMounted) {
          setAssetOptions([]);
        }
      }
    }

    loadAssets();

    return () => {
      isMounted = false;
    };
  }, [isCreateModalOpen]);

  // --- LOGIC & HANDLERS ---
  const displayedTickets = useMemo(() => {
    return tickets.filter((t) => {
      const submittedByMe = (() => {
        return isMyRaisedTicket(t);
      })();

      let matchesTab = false;
      if (isAdminTicketProfile) {
        if (activeTab === 'assigned_dept_tickets') matchesTab = isAdminAssignedDepartmentTicket(t) && (!showTenantCompanyTicketsTab || !isTenantCompanyTicketVisibleToCurrentTeam(t));
        if (activeTab === 'tenant_company_tickets' && showTenantCompanyTicketsTab) matchesTab = isTenantCompanyTicketVisibleToCurrentTeam(t);
        if (activeTab === 'my_tickets') matchesTab = isAdminMyTicket(t);
        if (activeTab === 'my_assigned_tickets') matchesTab = isAdminCreatedTicket(t);
      } else if (isManagerTicketProfile) {
        if (activeTab === 'department_tickets') matchesTab = isDepartmentTicket(t) && (!showTenantCompanyTicketsTab || !isTenantCompanyTicketVisibleToCurrentTeam(t));
        if (activeTab === 'tenant_company_tickets' && showTenantCompanyTicketsTab) matchesTab = isTenantCompanyTicketVisibleToCurrentTeam(t);
        if (activeTab === 'my_tickets') matchesTab = isDepartmentMyTicket(t);
        if (activeTab === 'my_raised') matchesTab = submittedByMe;
      } else if (isEmployeeTicketProfile) {
        if (activeTab === 'department_tasks') matchesTab = isEmployeeDepartmentTaskTicket(t);
        if (activeTab === 'my_tickets') matchesTab = isEmployeeMyTicket(t);
        if (activeTab === 'my_raised_tickets') matchesTab = isEmployeeRaisedTicket(t);
      } else {
        if (activeTab === 'all') matchesTab = !isOwnerSuperAdminDirectTicket(t) && (!showTenantCompanyTicketsTab || !isTenantCompanyTicketVisibleToCurrentTeam(t));
        if (activeTab === 'tenant_company_tickets' && showTenantCompanyTicketsTab) matchesTab = isTenantCompanyTicketVisibleToCurrentTeam(t);
        if (activeTab === 'my_received') matchesTab = isMyReceivedTicket(t);
        if (activeTab === 'my_raised') matchesTab = submittedByMe;
      }

      const matchesDept = selectedDeptFilter === 'All'
        ? true
        : normalizeRoleValue(t.department) === normalizeRoleValue(selectedDeptFilter);

      const matchesStatus = statusFilter === 'All' ? true : t.status === statusFilter;

      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.submittedBy.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTab && matchesDept && matchesStatus && matchesSearch;
    });
  }, [tickets, activeTab, searchQuery, selectedDeptFilter, statusFilter, currentUserId, isManagerTicketProfile, isAdminTicketProfile, isEmployeeTicketProfile, currentUserDepartmentKeys, adminAssignedDepartments, showTenantCompanyTicketsTab]);

  const hasMoreTickets = Boolean(pagination?.hasNextPage);

  const handleLoadMoreTickets = () => {
    // Already in static mode, no backend pages
  };

  // Dynamic Stats base
  const statsBase = useMemo(() => {
    return tickets.filter((t) => {
      const submittedByMe = (() => {
        return isMyRaisedTicket(t);
      })();

      let matchesTab = false;
      if (isAdminTicketProfile) {
        if (activeTab === 'assigned_dept_tickets') matchesTab = isAdminAssignedDepartmentTicket(t) && (!showTenantCompanyTicketsTab || !isTenantCompanyTicketVisibleToCurrentTeam(t));
        if (activeTab === 'tenant_company_tickets' && showTenantCompanyTicketsTab) matchesTab = isTenantCompanyTicketVisibleToCurrentTeam(t);
        if (activeTab === 'my_tickets') matchesTab = isAdminMyTicket(t);
        if (activeTab === 'my_assigned_tickets') matchesTab = isAdminCreatedTicket(t);
      } else if (isManagerTicketProfile) {
        if (activeTab === 'department_tickets') matchesTab = isDepartmentTicket(t) && (!showTenantCompanyTicketsTab || !isTenantCompanyTicketVisibleToCurrentTeam(t));
        if (activeTab === 'tenant_company_tickets' && showTenantCompanyTicketsTab) matchesTab = isTenantCompanyTicketVisibleToCurrentTeam(t);
        if (activeTab === 'my_tickets') matchesTab = isDepartmentMyTicket(t);
        if (activeTab === 'my_raised') matchesTab = submittedByMe;
      } else if (isEmployeeTicketProfile) {
        if (activeTab === 'department_tasks') matchesTab = isEmployeeDepartmentTaskTicket(t);
        if (activeTab === 'my_tickets') matchesTab = isEmployeeMyTicket(t);
        if (activeTab === 'my_raised_tickets') matchesTab = isEmployeeRaisedTicket(t);
      } else {
        if (activeTab === 'all') matchesTab = !isOwnerSuperAdminDirectTicket(t) && (!showTenantCompanyTicketsTab || !isTenantCompanyTicketVisibleToCurrentTeam(t));
        if (activeTab === 'tenant_company_tickets' && showTenantCompanyTicketsTab) matchesTab = isTenantCompanyTicketVisibleToCurrentTeam(t);
        if (activeTab === 'my_received') matchesTab = isMyReceivedTicket(t);
        if (activeTab === 'my_raised') matchesTab = submittedByMe;
      }
      const matchesDept = selectedDeptFilter === 'All'
        ? true
        : normalizeRoleValue(t.department) === normalizeRoleValue(selectedDeptFilter);
      return matchesTab && matchesDept;
    });
  }, [tickets, activeTab, selectedDeptFilter, currentUserId, isManagerTicketProfile, isAdminTicketProfile, isEmployeeTicketProfile, currentUserDepartmentKeys, adminAssignedDepartments, showTenantCompanyTicketsTab]);

  // Form Handlers
  const handleCreateTicket = async (e) => {
    e.preventDefault();

    const requiresAssetSnapshot = requiresAssetSnapshotDepartment(ticketForm.department);
    const selectedAsset = requiresAssetSnapshot
      ? assetOptions.find((asset) => String(asset.recordId || asset.id || asset.assetCode || '') === String(ticketForm.assetId || '')) || null
      : null;
    if (requiresAssetSnapshot && !selectedAsset) {
      setErrorMessage('Please select an asset for this ticket.');
      return;
    }

    if (!ticketForm.dueDate) {
      setErrorMessage('Please choose a due date.');
      return;
    }

    const queueSelection = isQueueSelection(ticketForm.assignee, ticketForm.assigneeUserId);
    const selectedAssignee = queueSelection
      ? null
      : assigneeOptions.find((option) => {
        const optionUserId = String(option.userId || option.id || '');
        const selectedUserId = String(ticketForm.assigneeUserId || '');
        return optionUserId && selectedUserId && optionUserId === selectedUserId;
      }) || null;

    if (
      selectedAssignee?.userId &&
      currentUserId &&
      String(selectedAssignee.userId) === String(currentUserId)
    ) {
      setErrorMessage('You cannot raise a ticket to yourself.');
      return;
    }

    if (!queueSelection && !selectedAssignee && ticketForm.department) {
      setErrorMessage('No valid assignee is available for the selected department.');
      return;
    }

    setIsSaving(true);

    const ticketPayload = {
      title: ticketForm.title,
      description: buildTicketDescription(ticketForm.description, selectedAsset),
      department: ticketForm.department,
      assignedTo: queueSelection
        ? getQueueAssigneeLabel(ticketForm.department)
        : (selectedAssignee?.name || ticketForm.assignee),
      assigneeUserId: queueSelection
        ? undefined
        : (selectedAssignee?.userId || ticketForm.assigneeUserId || undefined),
      priority: ticketForm.priority,
      assetId: selectedAsset ? String(selectedAsset.recordId || '') : '',
      assetCode: selectedAsset ? String(selectedAsset.assetCode || '') : '',
      assetName: selectedAsset ? String(selectedAsset.assetName || selectedAsset.name || '') : '',
      assetDepartment: selectedAsset ? String(selectedAsset.department || '') : '',
      assetAssignedTo: selectedAsset ? String(selectedAsset.assignedTo || '') : '',
      dueDate: ticketForm.dueDate,
      status: 'Open',
      submittedBy: displayUserName,
      submittedByDept: profile.dept,
    };

    try {
      const createdTicket = await createTicket(ticketPayload);
      setTickets((current) => [normalizeTicket(createdTicket), ...current]);
      setPagination((current) => ({ ...current, total: current.total + 1 }));
      setErrorMessage('');
      setIsCreateModalOpen(false);
      setTicketForm(initialForm);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Unable to create the ticket. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAcceptTicket = async (payload = {}) => {
    if (!viewingTicket?.recordId) {
      return;
    }

    const recordId = viewingTicket.recordId;

    const targetUserId = payload?.assigneeUserId || currentUserId;
    const targetMember = memberDirectory.find(m => String(m.userId) === String(targetUserId));
    const targetName = targetMember ? targetMember.name : displayUserName;

    const updatedTicket = {
      ...viewingTicket,
      status: 'In Progress',
      assigneeUserId: targetUserId,
      assignedTo: targetName,
      acceptedBy: displayUserName,
      acceptedByUserId: currentUserId,
      updatedAt: new Date().toISOString(),
    };

    const normalized = normalizeTicket(updatedTicket);

    // Optimistic local update
    setTickets((current) => current.map((ticket) => (ticket.recordId === recordId ? normalized : ticket)));

    if (shouldAutoOpenRepairLog(normalized)) {
      setRepairLogSourceTicket(buildRepairLogSourceTicket(normalized));
      setIsRepairLogModalOpen(true);
    } else {
      setViewingTicket(normalized);
    }
    setErrorMessage('');

    // Persist to backend
    try {
      const backendTicketId = viewingTicket._id || viewingTicket.recordId;
      if (backendTicketId) {
        await updateTicket(backendTicketId, {
          status: 'In Progress',
          assigneeUserId: targetUserId,
          assignedTo: targetName,
          acceptedBy: displayUserName,
          acceptedByUserId: currentUserId,
        });
      }
    } catch (error) {
      console.error('Failed to accept ticket on server:', error);
      setErrorMessage(error?.response?.data?.message || 'Failed to accept ticket. Changes saved locally.');
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!viewingTicket?.recordId) {
      return;
    }

    if (!canCurrentUserChangeTicketStatus(viewingTicket)) {
      setErrorMessage('Only the assigned assignee can update ticket status.');
      return;
    }

    if (newStatus === 'Resolved') {
      setShowResolvePrompt(true);
      return;
    }

    const recordId = viewingTicket.recordId;
    const updatedTicket = {
      ...viewingTicket,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    const normalized = normalizeTicket(updatedTicket);
    setTickets((current) => current.map((ticket) => (ticket.recordId === recordId ? normalized : ticket)));
    setViewingTicket(normalized);
    setErrorMessage('');

    // Persist to backend
    try {
      const backendTicketId = viewingTicket._id || viewingTicket.recordId;
      if (backendTicketId) {
        await updateTicket(backendTicketId, { status: newStatus });
      }
    } catch (error) {
      console.error('Failed to update ticket status on server:', error);
      setErrorMessage(error?.response?.data?.message || 'Failed to update ticket status. Changes saved locally.');
    }
  };

  const confirmResolution = async () => {
    if (!resolutionMessage.trim() || !viewingTicket?.recordId) {
      return;
    }

    const recordId = viewingTicket.recordId;
    const updatedTicket = {
      ...viewingTicket,
      status: 'Resolved',
      resolutionNote: resolutionMessage.trim(),
      updatedAt: new Date().toISOString(),
    };

    const normalized = normalizeTicket(updatedTicket);
    setTickets((current) => current.map((ticket) => (ticket.recordId === recordId ? normalized : ticket)));
    setViewingTicket(normalized);
    setShowResolvePrompt(false);
    setResolutionMessage('');
    setErrorMessage('');

    // Persist to backend
    try {
      const backendTicketId = viewingTicket._id || viewingTicket.recordId;
      if (backendTicketId) {
        await updateTicket(backendTicketId, {
          status: 'Resolved',
          resolutionNote: resolutionMessage.trim(),
        });
      }
    } catch (error) {
      console.error('Failed to resolve ticket on server:', error);
      setErrorMessage(error?.response?.data?.message || 'Failed to resolve ticket. Changes saved locally.');
    }
  };

  const handleRaiseFollowUp = () => {
    const followUpAssignee = viewingTicket.acceptedBy || viewingTicket.assignedTo;
    const followUpAssigneeUserId = viewingTicket.acceptedByUserId || viewingTicket.assigneeUserId || memberIdByName[followUpAssignee] || '';
    setTicketForm({
      ...initialForm,
      title: `Follow-up: ${viewingTicket.title}`,
      description: `Following up on ${viewingTicket.id}. The issue persists because: \n\n[Type your follow-up here...]`,
      department: viewingTicket.department,
      assignee: followUpAssignee,
      assigneeUserId: followUpAssigneeUserId,
    });
    setViewingTicket(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenRepairLog = (ticket) => {
    if (!ticket) {
      return;
    }

    setRepairLogSourceTicket(buildRepairLogSourceTicket(ticket));
    setIsRepairLogModalOpen(true);
  };

  const shouldAutoOpenRepairLog = (ticket) =>
    isITTicketProfile &&
    normalizeRoleValue(ticket?.department || '') === 'it' &&
    Boolean(ticket?.assetId);

  const linkedRepairLogCode = viewingTicket?.repairLogCode || repairLogSourceTicket?.repairLogCode || '';
  const linkedRepairLogStatus = viewingTicket?.repairLogStatus || repairLogSourceTicket?.repairLogStatus || '';
  const linkedRepairLogAssignee =
    viewingTicket?.repairLogAssignedTo ||
    repairLogSourceTicket?.repairLogAssignedTo ||
    viewingTicket?.assignedTo ||
    repairLogSourceTicket?.assignedTo ||
    '';
  const hasLinkedRepairLog = Boolean(viewingTicket?.hasRepairLog || linkedRepairLogCode || repairLogSourceTicket?.hasRepairLog || repairLogSourceTicket?.repairLogCode);

  // UI Helpers
  const getInitials = (name) => name.includes('Queue') ? 'Q' : name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const getPriorityBadge = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high': return <span className={statusPillClass("High")}>High</span>;
      case 'medium': return <span className={statusPillClass("Medium")}>Medium</span>;
      case 'low': return <span className={statusPillClass("Low")}>Low</span>;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case 'resolved': return <span className={statusPillClass("Resolved")}>Resolved</span>;
      case 'in progress': return <span className={statusPillClass("In Progress")}>In Progress</span>;
      case 'open': return <span className={statusPillClass("Open (Raised)")}>Open (Raised)</span>;
      case 'closed': return <span className={statusPillClass("Closed")}>Closed</span>;
      default: return null;
    }
  };

  if (location.pathname !== "/tickets") {
    return null;
  }

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-pmedium text-[12px]">
      <PageFrame>
        {isInitialLoading && <TicketsSkeleton />}
        {!isInitialLoading && (
          <div className="flex flex-col gap-4 text-slate-700 font-pmedium">

            {/* 1. HEADER */}
            <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
              <div>
                <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                  Tickets
                </h2>
                <p className="text-xs font-pmedium text-slate-500 mt-1">
                  {isEmployeeTicketProfile
                    ? 'Employee workspace: accept department tickets, follow your assigned tickets, and review what you raised.'
                    : isAdminTicketProfile
                      ? 'Admin Control: Monitor assigned department tickets, route escalations, and manage follow-through.'
                      : 'Founder God-Mode: Monitor escalations globally, track resolutions, and manage incident assignments.'}
                </p>
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-pmedium text-red-600">
                {errorMessage}
              </div>
            ) : null}

            {/* 2. MAIN TABS (pill-style matching meetings page) */}
            <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
              {isAdminTicketProfile ? (
                <>
                  <button onClick={() => { setActiveTab('assigned_dept_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'assigned_dept_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    Assigned Dept {tickets.filter(t => isAdminDepartmentQueueTicket(t) && (!showTenantCompanyTicketsTab || !isTenantCompanyTicketVisibleToCurrentTeam(t)) && t.status === 'Open').length > 0 && (
                      <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-md text-[9px] border border-red-100 shadow-sm font-pmedium leading-none ml-1">{tickets.filter(t => isAdminDepartmentQueueTicket(t) && (!showTenantCompanyTicketsTab || !isTenantCompanyTicketVisibleToCurrentTeam(t)) && t.status === 'Open').length}</span>
                    )}
                  </button>
                  {showTenantCompanyTicketsTab && (
                    <button onClick={() => { setActiveTab('tenant_company_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'tenant_company_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                      Tenant Company
                    </button>
                  )}
                  <button onClick={() => { setActiveTab('my_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'my_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Assigned
                  </button>
                  <button onClick={() => { setActiveTab('my_assigned_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'my_assigned_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Raised
                  </button>
                </>
              ) : isManagerTicketProfile ? (
                <>
                  <button onClick={() => { setActiveTab('department_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'department_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    Department
                  </button>
                  {showTenantCompanyTicketsTab && (
                    <button onClick={() => { setActiveTab('tenant_company_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'tenant_company_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                      Tenant Company
                    </button>
                  )}
                  <button onClick={() => { setActiveTab('my_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'my_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Assigned {tickets.filter(t => isDepartmentMyTicket(t) && t.status === 'Open').length > 0 && (
                      <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-md text-[9px] border border-red-100 shadow-sm font-pmedium leading-none ml-1">{tickets.filter(t => isDepartmentMyTicket(t) && t.status === 'Open').length}</span>
                    )}
                  </button>
                  <button onClick={() => { setActiveTab('my_raised'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'my_raised' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Raised
                  </button>
                </>
              ) : isEmployeeTicketProfile ? (
                <>
                  <button onClick={() => { setActiveTab('department_tasks'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'department_tasks' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    Department {tickets.filter(t => isEmployeeDepartmentTaskTicket(t) && t.status === 'Open').length > 0 && (
                      <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-md text-[9px] border border-red-100 shadow-sm font-pmedium leading-none ml-1">{tickets.filter(t => isEmployeeDepartmentTaskTicket(t) && t.status === 'Open').length}</span>
                    )}
                  </button>
                  <button onClick={() => { setActiveTab('my_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'my_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Assigned
                  </button>
                  <button onClick={() => { setActiveTab('my_raised_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'my_raised_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Raised
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setActiveTab('all'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'all' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    Company
                  </button>
                  {showTenantCompanyTicketsTab && (
                    <button onClick={() => { setActiveTab('tenant_company_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'tenant_company_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                      Tenant Company
                    </button>
                  )}
                  <button onClick={() => { setActiveTab('my_received'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'my_received' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Assigned {tickets.filter(t => isMyReceivedTicket(t) && t.status === 'Open').length > 0 && (
                      <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-md text-[9px] border border-red-100 shadow-sm font-pmedium leading-none ml-1">{tickets.filter(t => isMyReceivedTicket(t) && t.status === 'Open').length}</span>
                    )}
                  </button>
                  <button onClick={() => { setActiveTab('my_raised'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'my_raised' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Raised
                  </button>
                </>
              )}
            </div>

            {/* 3. STATS CARDS (matching meetings page exactly) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
              {[
                { key: 'total', label: 'Total Tickets', value: statsBase.length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', icon: AlertCircle, iconClass: 'bg-slate-50 text-slate-600' },
                { key: 'open', label: 'Open (Raised)', value: statsBase.filter(t => t.status === 'Open').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500', icon: AlertTriangle, iconClass: 'bg-amber-50 text-amber-600' },
                { key: 'progress', label: 'In Progress', value: statsBase.filter(t => t.status === 'In Progress').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500', icon: Clock, iconClass: 'bg-blue-50 text-blue-600' },
                { key: 'resolved', label: 'Resolved', value: statsBase.filter(t => t.status === 'Resolved').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', icon: CheckCircle2, iconClass: 'bg-emerald-50 text-emerald-600' },
              ].map((card) => {
                const Icon = card.icon;
                const labelToneClass = card.cardClass.includes('border-l')
                  ? (card.iconClass.split(' ').find((cls) => cls.startsWith('text-')) || 'text-slate-400')
                  : 'text-slate-400';
                return (
                  <div key={card.key} className={card.cardClass}>
                    <div className="min-w-0">
                      <p className={`text-[10px] font-pmedium ${labelToneClass} uppercase tracking-widest mb-1`}>{card.label}</p>
                      <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
                    </div>
                    <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}><Icon size={16}/></div>
                  </div>
                );
              })}
            </div>

            {/* 4. WORKSPACE CONTROLS & TABLE */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

              {/* Search + Filters + Action (matching meetings style) */}
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">

                <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${statusFilter === status
                        ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                        : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                        }`}
                    >
                      {status === 'Open' ? 'Raised' : status}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text" placeholder="Search tickets..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                    <select
                      className="pl-9 pr-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[100px]"
                      value={selectedDeptFilter} onChange={(e) => setSelectedDeptFilter(e.target.value)}
                    >
                      <option value="All">All Tickets</option>
                      {availableDepartments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={() => { setTicketForm(initialForm); setIsCreateModalOpen(true); }}
                    className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                  >
                    <Plus size={13} strokeWidth={3} /> RAISE TICKET
                  </button>
                </div>
              </div>

              {/* Table (Desktop) / Cards (Mobile) */}
              <div className="overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden bg-white/20">

                {/* Desktop Table */}
                <table className="hidden lg:table w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Ticket Details</th>
                      <th className="px-5 py-4">Routing & Assignment</th>
                      <th className="px-5 py-4">Priority</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Updated</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {displayedTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-[#E0E7FF]/30 transition-all group">
                        <td className="px-5 sm:px-6 py-4 sm:py-5 align-top max-w-[250px] xl:max-w-[400px]">
                          <span className="text-[10px] font-pmedium text-slate-600 mb-1.5 inline-block">{ticket.id}</span>
                          <div className="font-pmedium text-[#0F172A] text-[13px] sm:text-[14px]" title={ticket.title}>{ticket.title}</div>
                          <div className="text-[11px] sm:text-[12px] text-slate-500 mt-1 line-clamp-2">{ticket.description}</div>
                        </td>
                        <td className="px-5 sm:px-6 py-4 sm:py-5 align-top">
                          <div className="text-[12px] sm:text-[13px] font-pmedium text-[#0F172A] min-w-[200px]">
                            <span className={statusPillClass("Raised By:")}>Raised By:</span>
                            {formatPersonLabel(ticket.submittedBy, ticket.submittedByDept)}
                            {getSubmittedByBadgeLabel(ticket.submittedByDept) ? (
                              <span className={statusPillClass(getSubmittedByBadgeLabel(ticket.submittedByDept))}>
                                {getSubmittedByBadgeLabel(ticket.submittedByDept)}
                              </span>
                            ) : null}
                            {getCompanyBadgeLabel(ticket) ? (
                              <span className={statusPillClass("Tenant •")}>
                                Tenant • {getCompanyBadgeLabel(ticket)}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[12px] sm:text-[13px] font-pmedium text-[#2563EB] min-w-[200px] mt-2.5">
                            <span className={statusPillClass("Sent To:")}>Sent To:</span>
                            <Building2 size={12} className="inline mr-1 -mt-0.5" />
                            {ticket.department} {ticket.assignedTo !== ticket.department + ' Queue' ? `→ ${ticket.assignedTo}` : ''}
                          </div>
                          {ticket.acceptedBy && (
                            <div className="text-[10px] font-pmedium text-slate-500 mt-2 flex items-center gap-1">
                              <User size={10} /> Accepted By: {ticket.acceptedBy}
                            </div>
                          )}
                        </td>
                        <td className="px-5 sm:px-6 py-4 sm:py-5 align-top">{getPriorityBadge(ticket.priority)}</td>
                        <td className="px-5 sm:px-6 py-4 sm:py-5 align-top">
                          {getStatusBadge(ticket.status)}
                          {ticket.status === 'Resolved' && ticket.resolutionNote && (
                            <p className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                              <FileText size={10} strokeWidth={2.5} /> Note Attached
                            </p>
                          )}
                        </td>
                        <td className="px-5 sm:px-6 py-4 sm:py-5 align-top font-pmedium text-[12px] text-slate-500">{ticket.updated}</td>
                        <td className="px-5 sm:px-6 py-4 sm:py-5 align-top text-center">
                          <button
                            onClick={() => setViewingTicket(ticket)}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 mx-auto"
                            aria-label={`View details for ${ticket.id || ticket.title}`}
                            title="View details"
                          >
                            <Eye size={15} strokeWidth={2.5} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Card Grid */}
                <div className="flex flex-col gap-3 lg:hidden p-3 bg-slate-50/30">
                  {displayedTickets.map((ticket) => {
                    const isTicketOpen = ticket.status === 'Open';
                    return (
                      <div key={ticket.id} className={`bg-white border p-4 rounded-[20px] shadow-sm flex flex-col gap-3 transition-all ${isTicketOpen ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200/60'}`}>
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 flex flex-col gap-1.5">
                            <span className="font-pmedium text-[10px] text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded w-max border border-blue-100">{ticket.id}</span>
                            <h3 className="font-pmedium text-[#0F172A] text-[13px] sm:text-[14px]">
                              {ticket.title}
                            </h3>
                            <p className="text-[12px] text-slate-500 line-clamp-2">{ticket.description}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 bg-slate-55 p-3 rounded-xl border border-slate-100 mt-1">
                          <div>
                            <span className={statusPillClass("Raised By")}>Raised By</span>
                            <span className="text-[11px] font-pmedium text-[#0F172A] truncate block" title={ticket.submittedBy}>{formatPersonLabel(ticket.submittedBy, ticket.submittedByDept)}</span>
                            {getSubmittedByBadgeLabel(ticket.submittedByDept) ? (
                              <span className={statusPillClass(getSubmittedByBadgeLabel(ticket.submittedByDept))}>
                                {getSubmittedByBadgeLabel(ticket.submittedByDept)}
                              </span>
                            ) : null}
                            {getCompanyBadgeLabel(ticket) ? (
                              <span className={statusPillClass("Tenant •")}>
                                Tenant • {getCompanyBadgeLabel(ticket)}
                              </span>
                            ) : null}
                          </div>
                          <div>
                            <span className={statusPillClass("Routed To")}>Routed To</span>
                            <span className="text-[11px] font-pmedium text-[#2563EB] truncate block" title={ticket.department}>{ticket.department} {ticket.assignedTo !== ticket.department + ' Queue' ? `→ ${ticket.assignedTo.split(' ')[0]}` : ''}</span>
                          </div>
                        </div>

                        {ticket.acceptedBy && (
                          <div className="flex items-center gap-1.5 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50 mt-1">
                            <span className="text-[10px] sm:text-[11px] font-pmedium text-indigo-700 flex items-center gap-1.5"><User size={12} strokeWidth={2.5} /> Accepted By: {ticket.acceptedBy}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center mt-1 border-t border-slate-100/60 pt-3">
                          <div className="flex flex-col">
                            <span className="font-pmedium text-slate-700 text-[11px] sm:text-[12px] flex items-center gap-1.5"><Clock size={12} /> {ticket.updated}</span>
                            {ticket.status === 'Resolved' && ticket.resolutionNote && (
                              <span className={statusPillClass("Note Attached")}>Note Attached</span>
                            )}
                          </div>
                          <button
                            onClick={() => setViewingTicket(ticket)}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                            aria-label={`View details for ${ticket.id || ticket.title}`}
                            title="View details"
                          >
                            <Eye size={15} strokeWidth={2.5} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Empty State */}
                {displayedTickets.length === 0 && (
                  <div className="text-center py-20 px-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 border border-slate-100">
                      <Search className="text-slate-400" size={24} />
                    </div>
                    <p className="text-slate-500 font-pmedium mb-1">No tickets found</p>
                    <p className="text-slate-400 text-[13px]">Try adjusting your filters or search terms.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ======================================================= */}
        {/* MODAL 1: RAISE NEW TICKET */}
        {/* ======================================================= */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[95vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0"></div>

              <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-xl sm:text-2xl font-pmedium text-primary flex items-center gap-2">
                    <div className="bg-blue-50 text-[#2563EB] p-2 rounded-xl">
                      <AlertCircle size={20} strokeWidth={2.5} />
                    </div>
                    Raise Master Ticket
                  </h2>
                  <p className="text-[10px] sm:text-[11px] font-pmedium text-slate-500 uppercase tracking-widest mt-2">Request technical or facility assistance</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm"><X size={18} strokeWidth={2.5} /></button>
              </div>

              <form onSubmit={handleCreateTicket} className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 [&::-webkit-scrollbar]:hidden bg-slate-50/30">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                  <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                    <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Building2 size={16} /></span>
                    <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Routing & Assignment</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {requiresAssetSnapshotDepartment(ticketForm.department) && (
                      <div className="flex flex-col gap-1 sm:col-span-2">
                        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Related Asset <span className="text-red-400">*</span></label>
                        <select
                          required
                          className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer"
                          value={ticketForm.assetId}
                          onChange={(e) => {
                            const nextAssetId = e.target.value;
                            setTicketForm({
                              ...ticketForm,
                              assetId: nextAssetId,
                            });
                          }}
                        >
                          <option value="">Select Asset</option>
                          {assetOptions.map((asset) => (
                            <option key={asset.recordId || asset.id || asset.assetCode} value={asset.recordId || asset.id || asset.assetCode}>
                              {asset.assetName || asset.name} ({asset.assetCode || asset.id}){asset.department ? ` - ${asset.department}` : ''}
                            </option>
                          ))}
                        </select>
                        {selectedTicketAsset ? (
                          <p className="text-[10px] font-pmedium text-slate-400">
                            {selectedTicketAsset.assetName || selectedTicketAsset.name} will be tagged on this ticket and the repair log.
                          </p>
                        ) : (
                          <p className="text-[10px] font-pmedium text-slate-400">
                            Select the assigned asset only for IT or Maintenance issue reports.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Due Date <span className="text-red-400">*</span></label>
                      <input
                        required
                        type="date"
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        value={ticketForm.dueDate}
                        onChange={(e) => setTicketForm({ ...ticketForm, dueDate: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Target Department <span className="text-red-400">*</span></label>
                      <select required className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer" value={ticketForm.department} onChange={e => {
                        const nextDepartment = e.target.value;

                        setTicketForm({
                          ...ticketForm,
                          department: nextDepartment,
                          assetId: requiresAssetSnapshotDepartment(nextDepartment) ? ticketForm.assetId : '',
                          assignee: '',
                          assigneeUserId: '',
                        });
                      }}>
                        <option value="">Select Dept</option>
                        {ticketCreateDepartments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Direct Assignee (Optional)</label>
                      <select className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer disabled:opacity-50" disabled={!ticketForm.department} value={ticketForm.assigneeUserId || ''} onChange={e => {
                        const selected = assigneeOptions.find(option => option.userId === e.target.value || option.id === e.target.value) || null;
                        setTicketForm({
                          ...ticketForm,
                          assignee: selected?.name || '',
                          assigneeUserId: selected?.userId || '',
                        });
                      }}>
                        {!isSpecialRoutingDepartment(ticketForm.department) && <option value="">Dept General Queue</option>}
                        {assigneeOptions.map(option => <option key={option.id} value={option.userId || option.id}>{option.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><AlertCircle size={16} /></span>
                  <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Issue Details</span>
                </h4>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Priority <span className="text-red-400">*</span></label>
                  <select className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer" value={ticketForm.priority} onChange={e => setTicketForm({ ...ticketForm, priority: e.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Issue Title <span className="text-red-400">*</span></label>
                  <input required type="text" placeholder="e.g. Server configuration needs approval" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400" value={ticketForm.title} onChange={e => setTicketForm({ ...ticketForm, title: e.target.value })} />
                  {ticketForm.department ? (
                    <div className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-blue-50/40">
                        <div>
                          <p className="text-[10px] font-pmedium text-blue-700 uppercase tracking-widest">
                            Issues for {ticketForm.department}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Pick a saved issue or keep typing your own.
                          </p>
                        </div>
                        {issueSuggestionsLoading ? (
                          <span className={statusPillClass("Searching...")}>Searching...</span>
                        ) : (
                          <span className={statusPillClass(issueSuggestions.length)}>
                            {issueSuggestions.length} saved
                          </span>
                        )}
                      </div>
                      <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                        {issueSuggestions.length > 0 ? (
                          issueSuggestions.map((issue) => (
                            <button
                              key={`${issue.departmentKey}-${issue.title}`}
                              type="button"
                              onClick={() => applyIssueSuggestion(issue)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50/70 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <p className="text-[13px] font-pmedium text-[#0F172A] truncate">{issue.title}</p>
                                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                    {issue.description || 'Use this as a starting point for the issue details.'}
                                  </p>
                                </div>
                                <span className={statusPillClass(issue.department)}>
                                  {issue.department}
                                </span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-4 text-[12px] text-slate-400">
                            Type a few words to search saved issues, or continue with a new issue title.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Detailed Description</label>
                  <textarea required rows={4} placeholder="Provide issue details..." className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none placeholder:text-slate-400" value={ticketForm.description} onChange={e => setTicketForm({ ...ticketForm, description: e.target.value })} />
                </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-[11px] font-pmedium text-slate-500 uppercase tracking-wider">Attachments</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-white hover:bg-slate-50 hover:border-[#2563EB] transition-colors cursor-pointer group">
                    <div className="w-12 h-12 bg-blue-50 rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Paperclip className="text-[#2563EB]" size={20} />
                    </div>
                    <p className="text-[12px] sm:text-[13px] font-pmedium text-[#0F172A]">Upload screenshot or document</p>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">PNG, JPG or PDF up to 10MB</p>
                  </div>
                </div>

                <div className="pt-4 sm:pt-6 flex gap-3 border-t border-slate-200/60 flex-col-reverse sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase">CANCEL</button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-primary/95 active:scale-95 transition-all uppercase flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSaving ? 'SUBMITTING...' : 'SUBMIT TICKET'} <Plus size={13} strokeWidth={3} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* MODAL 2: VIEW & UPDATE TICKET */}
        {/* ======================================================= */}
        {viewingTicket && (
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => { setViewingTicket(null); setShowResolvePrompt(false); }}>
            <div
              className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70 max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                    <AlertCircle size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">{viewingTicket.title}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-pmedium text-[10px] text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{viewingTicket.id}</span>
                      {getPriorityBadge(viewingTicket.priority)}
                      {getStatusBadge(viewingTicket.status)}
                    </div>
                  </div>
                </div>
                <button onClick={() => { setViewingTicket(null); setShowResolvePrompt(false); }} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"><X size={16} /></button>
              </div>

              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-white">

                <div>
                  <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                    <FileText size={14} /> Issue Details
                  </h3>
                  <div className="grid grid-cols-1 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1 flex items-center gap-1"><Calendar size={10} /> Raised On</p>
                      <p className="text-[12px] font-pmedium text-slate-900">{viewingTicket.created}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Issue Description</p>
                      <p className="text-[12px] font-pmedium text-slate-900 leading-relaxed whitespace-pre-wrap">{viewingTicket.description}</p>
                    </div>
                  </div>
                </div>

                {/* Resolution Note Display (If resolved) */}
                {viewingTicket.status === 'Resolved' && viewingTicket.resolutionNote && (
                  <div>
                    <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                      <CheckCircle2 size={14} /> Official Resolution Note
                    </h3>
                    <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                      <p className="text-[12px] font-pmedium text-emerald-900 leading-relaxed">{viewingTicket.resolutionNote}</p>
                    </div>
                  </div>
                )}

                {/* Routing Meta Info */}
                <div>
                  <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                    <User size={14} /> Routing & People
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Raised By</p>
                      <p className="text-[12px] font-pmedium text-slate-900 wrap-break-word">{viewingTicket.submittedBy}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {!viewingTicket.submittedBy?.includes('(Owner)') ? (
                          <span className={statusPillClass(viewingTicket.submittedByDept)}>{viewingTicket.submittedByDept}</span>
                        ) : null}
                        {getCompanyBadgeLabel(viewingTicket) ? (
                          <span className={statusPillClass("Tenant •")}>
                            Tenant • {getCompanyBadgeLabel(viewingTicket)}
                          </span>
                        ) : null}
                        {getSubmittedByBadgeLabel(viewingTicket.submittedByDept) ? (
                          <span className={statusPillClass(getSubmittedByBadgeLabel(viewingTicket.submittedByDept))}>
                            {getSubmittedByBadgeLabel(viewingTicket.submittedByDept)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Assigned To</p>
                      <p className="text-[12px] font-pmedium text-slate-900 wrap-break-word">{viewingTicket.assignedTo}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className={statusPillClass(viewingTicket.department)}>{viewingTicket.department}</span>
                      </div>
                    </div>
                    {viewingTicket.acceptedBy && (
                      <div className="sm:col-span-2">
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Currently Accepted By</p>
                        <p className="text-[12px] font-pmedium text-slate-900 wrap-break-word">{viewingTicket.acceptedBy}</p>
                      </div>
                    )}
                  </div>
                </div>

                {((viewingTicket.assetName || viewingTicket.assetCode || viewingTicket.assetDepartment) && requiresAssetSnapshotDepartment(viewingTicket.department)) && (
                  <div>
                    <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                      <Wrench size={14} /> Asset Snapshot
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Asset</p>
                        <p className="text-[12px] font-pmedium text-slate-900">{viewingTicket.assetName || 'Asset'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Asset Code</p>
                        <p className="text-[12px] font-pmedium text-slate-900">{viewingTicket.assetCode || viewingTicket.assetId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Department</p>
                        <p className="text-[12px] font-pmedium text-slate-900">{viewingTicket.assetDepartment || viewingTicket.department}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Assigned To</p>
                        <p className="text-[12px] font-pmedium text-slate-900">{viewingTicket.assetAssignedTo || 'Unassigned'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Due Date</p>
                        <p className="text-[12px] font-pmedium text-slate-900">{viewingTicket.dueDate || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= ACTIONS AREA ================= */}

                {/* 1. Action - Accept Ticket (Automatically sets to In Progress) */}
                {(isManagerTicketProfile && isDepartmentQueueTicket(viewingTicket) && viewingTicket.status === 'Open') ||
                  (isAdminTicketProfile && isAdminDepartmentQueueTicket(viewingTicket) && viewingTicket.status === 'Open') ||
                  ((isOwnerProfile || isSuperAdminProfile) && isDepartmentQueueTicket(viewingTicket) && viewingTicket.status === 'Open') ||
                  (isEmployeeTicketProfile && isEmployeeDepartmentTaskTicket(viewingTicket) && viewingTicket.status === 'Open') ? (
                  <div className="bg-amber-50 border border-amber-200 p-4 sm:p-5 rounded-2xl flex flex-col gap-4 shadow-sm animate-in slide-in-from-bottom-4">
                    <div>
                      <h4 className="font-pmedium text-amber-900 text-[14px]">
                        Accept Department Ticket
                      </h4>
                      <p className="text-[11px] text-amber-700 font-pmedium mt-0.5">
                        {isEmployeeTicketProfile
                          ? 'Accept this ticket for yourself only.'
                          : 'Accept for yourself or assign it directly to a department member.'}
                      </p>
                    </div>
                    {isEmployeeTicketProfile ? null : (
                      <div className="space-y-1.5">
                        <label className="text-[10px] sm:text-[11px] font-pmedium text-slate-500 uppercase tracking-wider">Accept as</label>
                        <select
                          className="w-full px-4 py-3 bg-white border border-slate-200 shadow-sm rounded-xl font-pmedium text-[#0F172A] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none cursor-pointer transition-all"
                          value={ticketQueueAssigneeUserId || ''}
                          onChange={(e) => setTicketQueueAssigneeUserId(e.target.value)}
                        >
                          <option value={currentUserId || ''}>Self</option>
                          {canDelegateDepartmentQueueTicket ? (
                            ticketQueueAcceptanceOptions.map((member) => (
                              <option key={member.id} value={member.userId || member.id}>
                                {member.name} ({member.role})
                              </option>
                            ))
                          ) : null}
                        </select>
                      </div>
                    )}
                    <button
                      onClick={() => handleAcceptTicket(
                        isEmployeeTicketProfile
                          ? {}
                          : (
                            ticketQueueAssigneeUserId && String(ticketQueueAssigneeUserId) !== String(currentUserId)
                              ? { assigneeUserId: ticketQueueAssigneeUserId }
                              : {}
                          ),
                      )}
                      disabled={isSaving}
                      className="w-full py-3 sm:py-3.5 rounded-xl font-pmedium text-[11px] sm:text-[12px] uppercase tracking-wider transition-all flex justify-center items-center gap-2 shadow-sm bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'STARTING...' : 'Accept Ticket'}
                    </button>
                  </div>
                ) : isMyReceivedTicket(viewingTicket) && viewingTicket.status === 'Open' && (
                  <div className="bg-amber-50 border border-amber-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in slide-in-from-bottom-4">
                    <div>
                      <h4 className="font-pmedium text-amber-900 text-[14px]">Acknowledge Ticket</h4>
                      <p className="text-[11px] text-amber-700 font-pmedium mt-0.5">Accepting this will move it to "In Progress".</p>
                    </div>
                    <button onClick={() => handleAcceptTicket()} className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-pmedium text-[11px] tracking-wider transition-colors shadow-sm w-full sm:w-auto uppercase">
                      ACCEPT TICKET
                    </button>
                  </div>
                )}

                {/* 2. Action - Resolve Issue */}
                {canCurrentUserChangeTicketStatus(viewingTicket) && viewingTicket.status === 'In Progress' && !showResolvePrompt && (
                  <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="w-full sm:w-auto text-left">
                      <h3 className="text-[11px] font-pmedium text-slate-800 uppercase tracking-wider">Update Progress</h3>
                      <p className="text-[12px] text-slate-500 font-pmedium mt-0.5">Is the issue completely fixed?</p>
                    </div>
                    <button onClick={() => handleUpdateStatus('Resolved')} className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-pmedium text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white shadow-sm">
                      <CheckCircle2 size={16} strokeWidth={2.5} /> Resolve Issue
                    </button>
                  </div>
                )}

                {/* Mandatory Resolution Message Prompt */}
                {showResolvePrompt && canCurrentUserChangeTicketStatus(viewingTicket) && (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 sm:p-5 rounded-2xl shadow-sm animate-in slide-in-from-bottom-4">
                    <h3 className="text-[11px] font-pmedium text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-2"><CheckSquare size={14} /> Resolution Requirements</h3>
                    <textarea
                      required rows={3}
                      placeholder="Explain how this issue was resolved... (This will be sent to the raiser)"
                      className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl font-pmedium text-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none mb-3 shadow-sm placeholder:text-slate-400 text-[13px]"
                      value={resolutionMessage} onChange={e => setResolutionMessage(e.target.value)}
                    />
                    <div className="flex flex-col-reverse sm:flex-row gap-3">
                      <button onClick={() => setShowResolvePrompt(false)} className="px-5 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-pmedium text-[11px] uppercase tracking-wider hover:bg-slate-50 w-full sm:w-auto">Cancel</button>
                      <button onClick={confirmResolution} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-pmedium text-[11px] uppercase tracking-wider shadow-[0_4px_12px_rgba(5,150,105,0.2)] transition-all">
                        CONFIRM RESOLUTION
                      </button>
                    </div>
                  </div>
                )}

                {/* Raise Follow Up (If Owner raised it, and it was resolved but still broken) */}
                {((activeTab === 'my_raised' || activeTab === 'my_raised_tickets') || isMyRaisedTicket(viewingTicket) || isEmployeeRaisedTicket(viewingTicket)) && viewingTicket.status === 'Resolved' && (
                  <div className="bg-red-50 border border-red-100 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in slide-in-from-bottom-4">
                    <div className="w-full sm:w-auto">
                      <h4 className="font-pmedium text-red-900 text-[14px]">Issue Not Fixed?</h4>
                      <p className="text-[11px] text-red-700 font-pmedium mt-0.5">Re-open this loop with a linked follow-up ticket.</p>
                    </div>
                    <button onClick={handleRaiseFollowUp} className="px-5 py-3 bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white rounded-xl font-pmedium text-[11px] uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto">
                      <Reply size={14} strokeWidth={2.5} /> Raise Follow-up
                    </button>
                  </div>
                )}

                {canCurrentUserChangeTicketStatus(viewingTicket) && viewingTicket.status === 'Resolved' && (
                  <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div className="w-full sm:w-auto">
                      <h4 className="font-pmedium text-slate-900 text-[14px]">Close Ticket</h4>
                      <p className="text-[11px] text-slate-600 font-pmedium mt-0.5">Mark this resolved ticket as formally closed.</p>
                    </div>
                    <button onClick={() => handleUpdateStatus('Closed')} className="px-5 py-3 bg-slate-900 border border-slate-900 text-white hover:bg-black rounded-xl font-pmedium text-[11px] uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto">
                      <CheckSquare size={14} strokeWidth={2.5} /> Close Ticket
                    </button>
                  </div>
                )}

                {canCreateRepairLogForTicket(viewingTicket) && (
                  <div className="bg-cyan-50 border border-cyan-100 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div className="w-full sm:w-auto">
                      <h4 className="font-pmedium text-cyan-950 text-[14px]">Create Repair Log</h4>
                      <p className="text-[11px] text-cyan-800 font-pmedium mt-0.5">Push this IT or Maintenance ticket into the repair-log workflow.</p>
                      {hasLinkedRepairLog ? (
                        <div className="mt-2 space-y-2">
                          <p className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-white px-3 py-1 text-[10px] font-pmedium uppercase tracking-wider text-cyan-700">
                            Repair log added{linkedRepairLogCode ? ` • ${linkedRepairLogCode}` : ''}
                          </p>
                          <p className="text-[11px] font-pmedium text-cyan-900">
                            Assigned to <span className="font-pmedium">{linkedRepairLogAssignee || 'Unassigned'}</span>
                          </p>
                          {linkedRepairLogStatus ? (
                            <p className="text-[11px] font-pmedium text-cyan-900">
                              Status <span className="font-pmedium">{linkedRepairLogStatus}</span>
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {!hasLinkedRepairLog ? (
                      <button
                        onClick={() => handleOpenRepairLog(viewingTicket)}
                        className="px-5 py-3 rounded-xl font-pmedium text-[11px] uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-white"
                      >
                        <Wrench size={14} strokeWidth={2.5} /> Open Repair Log
                      </button>
                    ) : null}
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* Self-contained stub components to keep imports clean */}
        <RepairLogModal
          open={isRepairLogModalOpen}
          onClose={() => {
            setIsRepairLogModalOpen(false);
            setRepairLogSourceTicket(null);
          }}
        />

      </PageFrame>
    </div>
  );
}
