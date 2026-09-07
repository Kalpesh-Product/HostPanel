import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search, Plus, Eye, CheckCircle2, Clock, AlertCircle,
  Calendar, User, FileText, X, AlertTriangle, Paperclip,
  MessageSquare, Building2, Filter, Reply, CheckSquare, Shield, Wrench, ChevronDown,
  Download, Maximize2, Loader2, UserPlus, Save, Pencil, Trash2, Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import PageFrame from '../../components/Pages/PageFrame';
import AttachmentDropzone from '../../components/AttachmentDropzone';
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
import { createTicket, getTickets, updateTicket, getTicketIssueSuggestions, createTicketIssue, recordTicketIssueUsage } from '../../services/tickets';
import { getOrganizationOverview } from '../../services/organization';
import { getAssets } from '../../services/assets';
import { axiosPrivate } from '../../utils/axios';
import { statusPillClass } from '../../lib/status-pill';
import { getWorkspacePlan, isDepartmentAllowedForPlan } from '../../utils/workspacePlanAccess';
import ExportReportModal, { type ExportParams } from '../../components/ExportReportModal';
import ReportExportButton from '@/components/ReportExportButton';
import { createReport } from '../../services/reports';
import { downloadReportFile } from '../../utils/report-download';
import { isDateInExportPeriod } from '../../utils/export-period';

// import { getWorkspaceMembers } from '@/services/auth';
// import { getAssets } from '@/services/assets';
// import { createTicket, getTicketIssueSuggestions, getTickets, updateTicket } from '@/services/tickets';

const TICKETS_PAGE_SIZE = 50;

const TICKET_DRAFT_KEY_PREFIX = 'hostpanel_ticket_draft';
const TICKET_DRAFT_DB_NAME = 'hostpanel-ticket-drafts';
const TICKET_DRAFT_DB_STORE = 'attachments';

const getTicketDraftKey = () => {
  const user = getStoredUser();
  const workspaceId =
    user?.workspaceMembership?.workspace ||
    user?.primaryWorkspace ||
    user?.workspaceId ||
    'workspace';
  const userId = user?._id || user?.id || user?.email || 'user';
  return `${TICKET_DRAFT_KEY_PREFIX}:${workspaceId}:${userId}`;
};

const openTicketDraftDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(TICKET_DRAFT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(TICKET_DRAFT_DB_STORE)) {
        request.result.createObjectStore(TICKET_DRAFT_DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const readTicketDraftAttachment = async (draftKey) => {
  const database = await openTicketDraftDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database
        .transaction(TICKET_DRAFT_DB_STORE, 'readonly')
        .objectStore(TICKET_DRAFT_DB_STORE)
        .get(draftKey);
      request.onsuccess = () => {
        const stored = request.result;
        if (Array.isArray(stored)) {
          resolve(stored.filter((entry) => entry instanceof File));
        } else if (stored instanceof File) {
          resolve([stored]);
        } else {
          resolve([]);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
};

const writeTicketDraftAttachment = async (draftKey, files) => {
  const database = await openTicketDraftDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(TICKET_DRAFT_DB_STORE, 'readwrite');
      const store = transaction.objectStore(TICKET_DRAFT_DB_STORE);
      if (files && files.length) store.put(files, draftKey);
      else store.delete(draftKey);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
};

function TicketsSkeleton() {
  return (
    <div className="animate-pulse flex w-full flex-col gap-4" aria-busy="true" aria-label="Loading tickets">
      <div className="mb-3 space-y-2">
        <div className="h-6 w-32 rounded-md bg-slate-200" />
        <div className="h-3 w-full max-w-2xl rounded-md bg-slate-100" />
      </div>

      <div className="mb-3 flex gap-1.5 overflow-hidden rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-8 min-w-24 flex-1 rounded-xl bg-slate-200" />
        ))}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="space-y-3">
              <div className="h-3 w-20 rounded-md bg-slate-200" />
              <div className="h-5 w-10 rounded-md bg-slate-200" />
            </div>
            <div className="h-8 w-8 rounded-2xl bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white/80 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:p-4 lg:p-5 xl:flex-row xl:items-center">
          <div className="flex gap-1.5 overflow-hidden">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-8 w-16 flex-shrink-0 rounded-lg bg-slate-200" />
            ))}
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 xl:w-auto sm:flex-nowrap">
            <div className="h-10 min-w-[180px] flex-1 rounded-lg bg-slate-200 xl:w-56" />
            <div className="h-10 w-28 rounded-lg bg-slate-200" />
            <div className="h-10 w-32 rounded-2xl bg-slate-200" />
          </div>
        </div>

        <div className="hidden min-w-[900px] lg:block">
          <div className="grid grid-cols-6 gap-4 border-b border-slate-100/60 bg-slate-50/50 px-5 py-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-3 rounded-md bg-slate-200" />
            ))}
          </div>
          <div className="divide-y divide-slate-100/60">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-6 items-start gap-4 px-5 py-5">
                <div className="space-y-2">
                  <div className="h-3 w-16 rounded-md bg-slate-200" />
                  <div className="h-4 rounded-md bg-slate-100" />
                  <div className="h-3 w-4/5 rounded-md bg-slate-100" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 rounded-md bg-slate-100" />
                  <div className="h-4 w-4/5 rounded-md bg-slate-100" />
                </div>
                <div className="h-5 w-16 rounded-full bg-slate-200" />
                <div className="h-5 w-20 rounded-full bg-slate-200" />
                <div className="h-4 rounded-md bg-slate-100" />
                <div className="mx-auto h-7 w-7 rounded-lg bg-slate-200" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 bg-slate-50/30 p-3 lg:hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-[20px] border border-slate-200/60 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-16 rounded-md bg-slate-200" />
                  <div className="h-4 w-4/5 rounded-md bg-slate-100" />
                  <div className="h-3 w-full rounded-md bg-slate-100" />
                </div>
                <div className="space-y-2">
                  <div className="h-5 w-16 rounded-full bg-slate-200" />
                  <div className="h-5 w-14 rounded-full bg-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 p-3">
                <div className="h-4 rounded-md bg-slate-100" />
                <div className="h-4 rounded-md bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
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

function resolveDepartmentName(department) {
  if (department && typeof department === 'object') {
    return String(department.name || department.department || '').trim();
  }

  return String(department || '').trim();
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
  // The stored/auth user object never carries the workspace's plan (the login
  // payload has no `workspace` field at all — see buildAuthUserPayload on the
  // server), so this can't be derived from storedUser. It's set once the
  // organization overview response loads below (data.workspace.selectedPlan),
  // and defaults to 'basic' until then.
  const [workspacePlan, setWorkspacePlan] = useState('basic');
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
    dept: actingContext?.departmentName || (isOwnerProfile ? 'Founder' : isSuperAdminProfile ? 'Super Admin' : (resolveDepartmentName(storedUser?.workspaceMembership?.departments?.[0]) || 'Executive')),
  };
  const currentUserId = String(storedUser?._id || storedUser?.id || storedUser?.userId || '').trim();
  const currentUserDepartments = [
    ...(Array.isArray(storedUser?.workspaceMembership?.departments) ? storedUser.workspaceMembership.departments.map(resolveDepartmentName) : []),
    resolveDepartmentName(storedUser?.workspaceMembership?.department),
    resolveDepartmentName(storedUser?.department),
    resolveDepartmentName(storedUser?.workspace?.department),
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
  //
  // Tenant Company tickets are only relevant to the Administration
  // department's chain (its admin/manager/employees) plus founder/super
  // admin — a manager or employee of any other department never sees this
  // tab, regardless of role.
  const isInAdministrationDepartment = currentUserDepartmentKeys.has('administration');
  const isAdminOverAdministrationDepartment = isAdminTicketProfile &&
    getAdminDepartments().some((department) => normalizeRoleValue(department) === 'administration');
  const showTenantCompanyTicketsTab =
    isOwnerProfile ||
    isSuperAdminProfile ||
    isAdminOverAdministrationDepartment ||
    ((isManagerTicketProfile || isEmployeeTicketProfile) && isInAdministrationDepartment);

  function getAdminDepartments() {
    const departments = [
      ...(Array.isArray(storedUser?.workspaceMembership?.departments) ? storedUser.workspaceMembership.departments.map(resolveDepartmentName) : []),
      resolveDepartmentName(storedUser?.workspaceMembership?.department),
      resolveDepartmentName(storedUser?.department),
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

    const assigneeId = ticket?.assigneeUserId ? String(ticket.assigneeUserId) : '';
    const assignedTo = (ticket?.assignedTo || '').trim().toLowerCase();

    return !assigneeId && /queue$/i.test(assignedTo) && ticket?.status === 'Open';
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

  // The raiser owns the final call on a resolved ticket — they either close
  // it (confirming the fix) or raise a follow-up (it's not actually fixed).
  // The assignee's part ends at marking it Resolved.
  function isRaiserViewOfTicket(ticket) {
    return (
      activeTab === 'my_raised' ||
      activeTab === 'my_raised_tickets' ||
      isMyRaisedTicket(ticket) ||
      isEmployeeRaisedTicket(ticket)
    );
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

  function canAcceptDepartmentTicket(ticket) {
    if (!ticket || ticket.status !== 'Open') {
      return false;
    }
    // The raiser never accepts their own ticket.
    if (isMyRaisedTicket(ticket)) {
      return false;
    }
    // Every ticket needs an accept step regardless of who raised it — including
    // tickets raised by the founder/owner/super admin to a department.
    // Only the destination department's manager / admin / employees can accept.
    if (isManagerTicketProfile && isDepartmentQueueTicket(ticket)) {
      return true;
    }
    if (isAdminTicketProfile && isAdminDepartmentQueueTicket(ticket)) {
      return true;
    }
    if (isEmployeeTicketProfile && isEmployeeDepartmentTaskTicket(ticket)) {
      return true;
    }
    return false;
  }

  function canAssignDepartmentQueueTicket(ticket) {
    if (!ticket) {
      return false;
    }
    // Assignment is a one-time action: once the ticket has a real assignee,
    // nobody — including that assignee — sees the assign controls again;
    // everyone just sees the read-only "Assigned To" line instead.
    if (ticket.assigneeUserId) {
      return false;
    }
    // Only the person who accepted the ticket gets the one-time chance to
    // route it to a department member (or keep it with themselves).
    const acceptedById = ticket.acceptedByUserId ? String(ticket.acceptedByUserId) : '';
    return Boolean(acceptedById && currentUserId && acceptedById === String(currentUserId));
  }

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
  const [zoomedAttachment, setZoomedAttachment] = useState(null);
  const [isRepairLogModalOpen, setIsRepairLogModalOpen] = useState(false);
  const [repairLogSourceTicket, setRepairLogSourceTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [savedDraft, setSavedDraft] = useState(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isRemovingDraft, setIsRemovingDraft] = useState(false);

  // Resolution State 
  const [showResolvePrompt, setShowResolvePrompt] = useState(false);
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [ticketQueueAssigneeUserId, setTicketQueueAssigneeUserId] = useState('');

  // Form State
  const initialForm = {
    title: '',
    description: '',
    department: '',
    assetId: '',
  };
  const [ticketForm, setTicketForm] = useState(initialForm);
  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isCustomIssue, setIsCustomIssue] = useState(false);
  const [customIssueTitle, setCustomIssueTitle] = useState('');
  const [showIssuePicker, setShowIssuePicker] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState('');

  function resetCreateForm() {
    setTicketForm(initialForm);
    setAttachmentFiles([]);
    setAttachmentError('');
    setSelectedIssueId('');
    setSelectedIssue(null);
    setIsCustomIssue(false);
    setCustomIssueTitle('');
    setShowIssuePicker(false);
  }

  const draftStorageKey = useMemo(getTicketDraftKey, []);

  // Mirrors the customer-support module's draft pattern: a locally-saved
  // draft is loaded on mount (not just when the create modal opens) so it
  // can be shown as its own "Draft" row in the ticket list.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftStorageKey);
      setSavedDraft(raw ? JSON.parse(raw) : null);
    } catch (e) {
      setSavedDraft(null);
    }
  }, [draftStorageKey]);

  async function restoreDraft() {
    resetCreateForm();
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          setSavedDraft(saved);
          setTicketForm((current) => ({
            ...current,
            title: typeof saved.title === 'string' ? saved.title : '',
            description: typeof saved.description === 'string' ? saved.description : '',
            department: typeof saved.department === 'string' ? saved.department : '',
            assetId: typeof saved.assetId === 'string' ? saved.assetId : '',
          }));
        }
      }
      const storedFiles = await readTicketDraftAttachment(draftStorageKey);
      setAttachmentFiles(storedFiles);
    } catch (e) {
      toast.error('The saved ticket draft could not be restored.');
    }
  }

  function openCreateModal() {
    setIsCreateModalOpen(true);
    void restoreDraft();
  }

  async function saveDraft() {
    if (!ticketForm.title.trim() && !ticketForm.description.trim() && !ticketForm.department && !attachmentFiles.length) {
      toast.error('Add ticket details before saving a draft.');
      return;
    }

    try {
      setIsSavingDraft(true);
      const draft = {
        title: ticketForm.title || '',
        description: ticketForm.description || '',
        department: ticketForm.department || '',
        assetId: ticketForm.assetId || '',
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      await writeTicketDraftAttachment(draftStorageKey, attachmentFiles);
      setSavedDraft(draft);
      setIsCreateModalOpen(false);
      toast.success('Ticket saved as draft. It has not been submitted.');
    } catch (e) {
      toast.error('Failed to save the ticket draft.');
    } finally {
      setIsSavingDraft(false);
    }
  }

  function clearDraft() {
    setSavedDraft(null);
    try {
      localStorage.removeItem(draftStorageKey);
    } catch (_) {}
    void writeTicketDraftAttachment(draftStorageKey, []).catch(() => undefined);
  }

  async function removeDraft() {
    if (!window.confirm('Remove this ticket draft? This cannot be undone.')) return;

    try {
      setIsRemovingDraft(true);
      await writeTicketDraftAttachment(draftStorageKey, []);
      localStorage.removeItem(draftStorageKey);
      setSavedDraft(null);
      resetCreateForm();
      toast.success('Ticket draft removed.');
    } catch (e) {
      toast.error('Failed to remove the ticket draft.');
    } finally {
      setIsRemovingDraft(false);
    }
  }

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
  const [showExportModal, setShowExportModal] = useState(false);
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

    // 'Owner'/'Super Admin'/'Admin' are role-routing targets, not real
    // departments — the plan-based department catalog restriction below
    // doesn't apply to them.
    if (isSpecialRoutingDepartment(department)) {
      return true;
    }

    if (!isDepartmentAllowedForPlan(workspacePlan, department)) {
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

    return (isManagerTicketProfile || isEmployeeTicketProfile) && currentTeamKeys.has(ticketDepartmentKey);
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

  // Accepting a ticket sets it to "In Progress" and assigns it to the accepter,
  // so the assignable-member list can't require "Open" + unassigned (that only
  // matches queue tickets nobody has accepted yet). Reuse the same
  // can-assign check that gates the "Assign To" UI block itself, so the
  // dropdown is never rendered empty for a ticket someone is allowed to assign.
  const isAccessibleAssignTicket = Boolean(
    viewingTicket && viewingTicket.status === 'In Progress' && canAssignDepartmentQueueTicket(viewingTicket)
  );

  const ticketQueueAssigneeOptions = useMemo(() => {
    if (!isAccessibleAssignTicket) {
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
  }, [isAccessibleAssignTicket, isAdminTicketProfile, isOwnerProfile, isSuperAdminProfile, viewingTicket, currentUserId, memberDirectory, specialRoutingAssignees]);

  useEffect(() => {
    if (!isAccessibleAssignTicket) {
      setTicketQueueAssigneeUserId('');
      return;
    }

    setTicketQueueAssigneeUserId(currentUserId || '');
  }, [isAccessibleAssignTicket, viewingTicket, currentUserId]);

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
      acceptedAt: formatCreatedLabel(ticket.acceptedAt),
      assignedAt: formatCreatedLabel(ticket.assignedAt),
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

  function selectSavedIssue(issue) {
    if (!issue) {
      return;
    }

    setSelectedIssue(issue);
    setSelectedIssueId(String(issue._id || issue.id || ''));
    setIsCustomIssue(false);
    // Selecting an issue closes the dropdown, leaving just the title visible.
    // The user adds the detailed description below.
    setShowIssuePicker(false);
    setTicketForm((current) => ({
      ...current,
      title: issue.title || current.title,
      description: current.description,
    }));
  }

  function useCustomIssue() {
    setSelectedIssue(null);
    setSelectedIssueId('');
    setIsCustomIssue(true);
    setShowIssuePicker(true);
  }

  function selectSavedOrContinue() {
    setIsCustomIssue(false);
    setSelectedIssue(null);
    setSelectedIssueId('');
    setShowIssuePicker(true);
  }

  function changeIssue() {
    setIsCustomIssue(false);
    setShowIssuePicker(true);
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
        if (isMounted) {
          setWorkspacePlan(getWorkspacePlan({ selectedPlan: data?.workspace?.selectedPlan }));
        }

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

  // Load saved issues for the selected department from the DB catalog
  useEffect(() => {
    if (!isCreateModalOpen || !ticketForm.department) {
      setIssueSuggestions([]);
      setIssueSuggestionsLoading(false);
      return undefined;
    }

    let isMounted = true;
    setIssueSuggestionsLoading(true);

    getTicketIssueSuggestions({ department: ticketForm.department })
      .then((data) => {
        if (!isMounted) return;
        const savedIssues = Array.isArray(data) ? data : data?.issues || [];
        setIssueSuggestions(savedIssues);
      })
      .catch(() => {
        if (isMounted) setIssueSuggestions([]);
      })
      .finally(() => {
        if (isMounted) setIssueSuggestionsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isCreateModalOpen, ticketForm.department]);

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

  // A locally-saved draft is shown as its own "Draft" row — but only in the
  // one tab that represents "tickets I raised" for the current role, never
  // in a department/queue tab (it isn't a real ticket yet, so nobody else
  // should see it as something to accept/assign).
  const isViewingRaisedTab =
    (isAdminTicketProfile && activeTab === 'my_assigned_tickets') ||
    (isManagerTicketProfile && activeTab === 'my_raised') ||
    (isEmployeeTicketProfile && activeTab === 'my_raised_tickets') ||
    (!isAdminTicketProfile && !isManagerTicketProfile && !isEmployeeTicketProfile && activeTab === 'my_raised');

  const draftTicket = useMemo(() => {
    if (!savedDraft) {
      return null;
    }

    return normalizeTicket({
      recordId: 'local-ticket-draft',
      id: 'DRAFT',
      ticketCode: 'DRAFT',
      title: String(savedDraft.title || '').trim() || 'Untitled ticket',
      description: String(savedDraft.description || ''),
      department: savedDraft.department || '',
      status: 'Draft',
      priority: 'Medium',
      submittedBy: displayUserName,
      submittedByDept: profile.dept,
      requesterUserId: currentUserId,
      assignedTo: '',
      createdAt: savedDraft.savedAt || new Date().toISOString(),
      updatedAt: savedDraft.savedAt || new Date().toISOString(),
      attachments: [],
    });
  }, [savedDraft, displayUserName, currentUserId]);

  const displayedTickets = useMemo(() => {
    const filtered = tickets.filter((t) => {
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
        if (activeTab === 'department_tasks') matchesTab = isEmployeeDepartmentTaskTicket(t) && (!showTenantCompanyTicketsTab || !isTenantCompanyTicketVisibleToCurrentTeam(t));
        if (activeTab === 'tenant_company_tickets' && showTenantCompanyTicketsTab) matchesTab = isTenantCompanyTicketVisibleToCurrentTeam(t);
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

    if (!isViewingRaisedTab || !draftTicket) {
      return filtered;
    }

    const draftMatchesDept = selectedDeptFilter === 'All'
      ? true
      : normalizeRoleValue(draftTicket.department) === normalizeRoleValue(selectedDeptFilter);
    const draftMatchesStatus = statusFilter === 'All' ? true : draftTicket.status === statusFilter;
    const draftMatchesSearch = draftTicket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      draftTicket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      draftTicket.submittedBy.toLowerCase().includes(searchQuery.toLowerCase());

    return (draftMatchesDept && draftMatchesStatus && draftMatchesSearch) ? [draftTicket, ...filtered] : filtered;
  }, [tickets, activeTab, searchQuery, selectedDeptFilter, statusFilter, currentUserId, isManagerTicketProfile, isAdminTicketProfile, isEmployeeTicketProfile, currentUserDepartmentKeys, adminAssignedDepartments, showTenantCompanyTicketsTab, isViewingRaisedTab, draftTicket]);

  const handleExportReport = async (params: ExportParams) => {
    const exportTickets = displayedTickets.filter((ticket: any) =>
      isDateInExportPeriod(ticket.createdAt || ticket.raisedAt || ticket.date, params),
    );
    if (!exportTickets.length) throw new Error('There are no tickets in the selected period.');
    const reportFormat = params.format === 'Excel' ? 'Excel' : 'PDF';
    const response = await createReport({
      title: 'Tickets', department: 'General', category: 'Ticket', dataWindow: params.dataWindow,
      reportMonth: params.reportMonth, period: params.period, generatedBy: storedUser?.fullName || storedUser?.name || 'User',
      format: reportFormat, description: 'Tickets from the current filtered workspace view.', sourceType: 'custom',
      sourceRef: `tickets-${activeTab}`,
      reportRows: exportTickets.map((ticket: any, index: number) => ({
        label: `${index + 1}. ${ticket.ticketCode || ticket.title || ticket.subject || 'Ticket'}`,
        value: `Department: ${ticket.department || '-'} | Priority: ${ticket.priority || '-'} | Status: ${ticket.status || '-'} | Raised By: ${ticket.raisedBy || ticket.createdByName || '-'} | Date: ${ticket.createdAt || ticket.raisedAt || ticket.date || '-'}`,
      })), monthlyData: [],
    });
    await downloadReportFile(response?.data?.download?.url, { openInNewTab: false });
    window.dispatchEvent(new Event('reports:refresh'));
  };

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
        if (activeTab === 'department_tasks') matchesTab = isEmployeeDepartmentTaskTicket(t) && (!showTenantCompanyTicketsTab || !isTenantCompanyTicketVisibleToCurrentTeam(t));
        if (activeTab === 'tenant_company_tickets' && showTenantCompanyTicketsTab) matchesTab = isTenantCompanyTicketVisibleToCurrentTeam(t);
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

    if (!ticketForm.department) {
      setErrorMessage('Please choose a target department.');
      return;
    }

    const requiresAssetSnapshot = requiresAssetSnapshotDepartment(ticketForm.department);
    const selectedAsset = requiresAssetSnapshot
      ? assetOptions.find((asset) => String(asset.recordId || asset.id || asset.assetCode || '') === String(ticketForm.assetId || '')) || null
      : null;
    if (requiresAssetSnapshot && !selectedAsset) {
      setErrorMessage('Please select an asset for this ticket.');
      return;
    }

    if (!ticketForm.title.trim()) {
      setErrorMessage('Please choose or enter an issue.');
      return;
    }
    if (!ticketForm.description.trim()) {
      setErrorMessage('Please add an issue description.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    // If a custom issue was typed, persist it into the catalog (best effort —
    // the ticket still gets created even if saving the issue fails).
    if (isCustomIssue && customIssueTitle.trim()) {
      try {
        const created = await createTicketIssue({
          department: ticketForm.department,
          title: customIssueTitle.trim(),
          description: ticketForm.description.trim(),
        });
        const savedIssue = Array.isArray(created) ? created[0] : created;
        if (savedIssue?._id || savedIssue?.id) {
          setSelectedIssueId(String(savedIssue._id || savedIssue.id));
          setSelectedIssue(savedIssue);
        }
      } catch {
        // non-fatal: ignore catalog save errors
      }
    }

    // Record usage for the selected saved issue so it floats to the top later.
    if (selectedIssueId) {
      try {
        await recordTicketIssueUsage({
          issueId: selectedIssueId,
          department: ticketForm.department,
          title: ticketForm.title.trim(),
        });
      } catch {
        // non-fatal
      }
    }

    const ticketPayload = {
      title: ticketForm.title.trim(),
      description: buildTicketDescription(ticketForm.description.trim(), selectedAsset),
      department: ticketForm.department,
      assignedTo: getQueueAssigneeLabel(ticketForm.department),
      assigneeUserId: undefined,
      assetId: selectedAsset ? String(selectedAsset.recordId || '') : '',
      assetCode: selectedAsset ? String(selectedAsset.assetCode || '') : '',
      assetName: selectedAsset ? String(selectedAsset.assetName || selectedAsset.name || '') : '',
      assetDepartment: selectedAsset ? String(selectedAsset.department || '') : '',
      assetAssignedTo: selectedAsset ? String(selectedAsset.assignedTo || '') : '',
      status: 'Open',
      submittedBy: displayUserName,
      submittedByDept: profile.dept,
    };

    try {
      const createdTicket = await createTicket(ticketPayload, attachmentFiles);
      setTickets((current) => [normalizeTicket(createdTicket), ...current]);
      setPagination((current) => ({ ...current, total: current.total + 1 }));
      setIsCreateModalOpen(false);
      clearDraft();
      resetCreateForm();
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Unable to create the ticket. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAcceptTicket = async () => {
    if (!viewingTicket?.recordId) {
      return;
    }

    const recordId = viewingTicket.recordId;

    // Accepting only records who accepted it and moves it to "In Progress" —
    // it deliberately leaves assigneeUserId/assignedTo untouched so the
    // one-time "Assign To" step (shown only to the accepter) still has an
    // unassigned ticket to work with. Setting an assignee here would make the
    // ticket look "already assigned" and hide that step immediately.
    const updatedTicket = {
      ...viewingTicket,
      status: 'In Progress',
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
          acceptedBy: displayUserName,
          acceptedByUserId: currentUserId,
        });
      }
    } catch (error) {
      console.error('Failed to accept ticket on server:', error);
      setErrorMessage(error?.response?.data?.message || 'Failed to accept ticket. Changes saved locally.');
    }
  };

  const handleAssignTicket = async (assignToUserId) => {
    if (!viewingTicket?.recordId || !assignToUserId) {
      return;
    }

    const recordId = viewingTicket.recordId;
    const targetMember = memberDirectory.find((m) => String(m.userId) === String(assignToUserId));
    const targetName = targetMember ? targetMember.name : displayUserName;

    const updatedTicket = {
      ...viewingTicket,
      assigneeUserId: assignToUserId,
      assignedTo: targetName,
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const normalized = normalizeTicket(updatedTicket);

    setTickets((current) => current.map((ticket) => (ticket.recordId === recordId ? normalized : ticket)));
    setViewingTicket(normalized);
    setErrorMessage('');

    try {
      const backendTicketId = viewingTicket._id || viewingTicket.recordId;
      if (backendTicketId) {
        await updateTicket(backendTicketId, {
          assigneeUserId: assignToUserId,
          assignedTo: targetName,
        });
      }
    } catch (error) {
      console.error('Failed to assign ticket on server:', error);
      setErrorMessage(error?.response?.data?.message || 'Failed to assign ticket. Changes saved locally.');
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!viewingTicket?.recordId) {
      return;
    }

    // Resolving is the assignee's call (they did the work); closing is the
    // raiser's call (they confirm the fix actually worked).
    if (newStatus === 'Closed') {
      if (!isRaiserViewOfTicket(viewingTicket)) {
        setErrorMessage('Only the ticket raiser can close this ticket.');
        return;
      }
    } else if (!canCurrentUserChangeTicketStatus(viewingTicket)) {
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
      case 'draft': return <span className={statusPillClass("Draft")}>Draft</span>;
      default: return null;
    }
  };

  if (location.pathname !== "/common-modules/tickets") {
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
                <h2 data-tour="tickets-heading" className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
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
              <ReportExportButton onClick={() => setShowExportModal(true)} />
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-pmedium text-red-600">
                {errorMessage}
              </div>
            ) : null}

            {/* 2. MAIN TABS (pill-style matching meetings page) */}
            <div data-tour="tickets-tabs" className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
              {isAdminTicketProfile ? (
                <>
                  <button data-tour="tickets-tab-assigned-dept" onClick={() => { setActiveTab('assigned_dept_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'assigned_dept_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    Assigned Dept {tickets.filter(t => isAdminDepartmentQueueTicket(t) && (!showTenantCompanyTicketsTab || !isTenantCompanyTicketVisibleToCurrentTeam(t)) && t.status === 'Open').length > 0 && (
                      <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-md text-[9px] border border-red-100 shadow-sm font-pmedium leading-none ml-1">{tickets.filter(t => isAdminDepartmentQueueTicket(t) && (!showTenantCompanyTicketsTab || !isTenantCompanyTicketVisibleToCurrentTeam(t)) && t.status === 'Open').length}</span>
                    )}
                  </button>
                  {showTenantCompanyTicketsTab && (
                    <button data-tour="tickets-tab-tenant-company" onClick={() => { setActiveTab('tenant_company_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'tenant_company_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                      Tenant Company
                    </button>
                  )}
                  <button data-tour="tickets-tab-my-assigned" onClick={() => { setActiveTab('my_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'my_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Assigned
                  </button>
                  <button data-tour="tickets-tab-my-raised" onClick={() => { setActiveTab('my_assigned_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'my_assigned_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Raised
                  </button>
                </>
              ) : isManagerTicketProfile ? (
                <>
                  <button data-tour="tickets-tab-department" onClick={() => { setActiveTab('department_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'department_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    Department Tickets
                  </button>
                  {showTenantCompanyTicketsTab && (
                    <button data-tour="tickets-tab-tenant-company" onClick={() => { setActiveTab('tenant_company_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'tenant_company_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                      Tenant Company
                    </button>
                  )}
                  <button data-tour="tickets-tab-my-assigned" onClick={() => { setActiveTab('my_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'my_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Assigned {tickets.filter(t => isDepartmentMyTicket(t) && t.status === 'Open').length > 0 && (
                      <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-md text-[9px] border border-red-100 shadow-sm font-pmedium leading-none ml-1">{tickets.filter(t => isDepartmentMyTicket(t) && t.status === 'Open').length}</span>
                    )}
                  </button>
                  <button data-tour="tickets-tab-my-raised" onClick={() => { setActiveTab('my_raised'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'my_raised' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Raised
                  </button>
                </>
              ) : isEmployeeTicketProfile ? (
                <>
                  <button data-tour="tickets-tab-department" onClick={() => { setActiveTab('department_tasks'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'department_tasks' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    Department {tickets.filter(t => isEmployeeDepartmentTaskTicket(t) && t.status === 'Open').length > 0 && (
                      <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-md text-[9px] border border-red-100 shadow-sm font-pmedium leading-none ml-1">{tickets.filter(t => isEmployeeDepartmentTaskTicket(t) && t.status === 'Open').length}</span>
                    )}
                  </button>
                  {showTenantCompanyTicketsTab && (
                    <button data-tour="tickets-tab-tenant-company" onClick={() => { setActiveTab('tenant_company_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'tenant_company_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                      Tenant Company
                    </button>
                  )}
                  <button data-tour="tickets-tab-my-assigned" onClick={() => { setActiveTab('my_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'my_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Assigned
                  </button>
                  <button data-tour="tickets-tab-my-raised" onClick={() => { setActiveTab('my_raised_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'my_raised_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Raised
                  </button>
                </>
              ) : (
                <>
                  <button data-tour="tickets-tab-company" onClick={() => { setActiveTab('all'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'all' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    Company
                  </button>
                  {showTenantCompanyTicketsTab && (
                    <button data-tour="tickets-tab-tenant-company" onClick={() => { setActiveTab('tenant_company_tickets'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'tenant_company_tickets' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                      Tenant Company
                    </button>
                  )}
                  <button data-tour="tickets-tab-my-assigned" onClick={() => { setActiveTab('my_received'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'my_received' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Assigned {tickets.filter(t => isMyReceivedTicket(t) && t.status === 'Open').length > 0 && (
                      <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-md text-[9px] border border-red-100 shadow-sm font-pmedium leading-none ml-1">{tickets.filter(t => isMyReceivedTicket(t) && t.status === 'Open').length}</span>
                    )}
                  </button>
                  <button data-tour="tickets-tab-my-raised" onClick={() => { setActiveTab('my_raised'); setStatusFilter('All'); }} className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'my_raised' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    My Raised
                  </button>
                </>
              )}
            </div>

            {/* 3. STATS CARDS (matching meetings page exactly) */}
            <div data-tour="tickets-summary" className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3 shrink-0">
              {[
                { key: 'total', label: 'Total Tickets', value: statsBase.length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', icon: AlertCircle, iconClass: 'bg-slate-50 text-slate-600' },
                { key: 'open', label: 'Open (Raised)', value: statsBase.filter(t => t.status === 'Open').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500', icon: AlertTriangle, iconClass: 'bg-amber-50 text-amber-600' },
                { key: 'progress', label: 'In Progress', value: statsBase.filter(t => t.status === 'In Progress').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500', icon: Clock, iconClass: 'bg-blue-50 text-blue-600' },
                { key: 'resolved', label: 'Resolved', value: statsBase.filter(t => t.status === 'Resolved').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', icon: CheckCircle2, iconClass: 'bg-emerald-50 text-emerald-600' },
                { key: 'closed', label: 'Closed', value: statsBase.filter(t => t.status === 'Closed').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-slate-500', icon: Lock, iconClass: 'bg-slate-50 text-slate-600' },
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

                <div data-tour="tickets-status-filter" className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {(isViewingRaisedTab ? ['All', 'Draft', 'Open', 'In Progress', 'Resolved', 'Closed'] : ['All', 'Open', 'In Progress', 'Resolved', 'Closed']).map((status) => (
                    <button
                      key={status}
                      data-tour={`tickets-status-${status === 'Open' ? 'raised' : status.toLowerCase().replace(/\s+/g, '-')}`}
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

                <div data-tour="tickets-search-filter" className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                  <div className="relative">
                    <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                    <select
                      className="pl-9 pr-8 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[100px]"
                      value={selectedDeptFilter} onChange={(e) => setSelectedDeptFilter(e.target.value)}
                    >
                      <option value="All">All Tickets</option>
                      {availableDepartments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#2563EB] pointer-events-none" size={13} />
                  </div>
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text" placeholder="Search tickets..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-500"
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    data-tour="tickets-raise-btn"
                    onClick={openCreateModal}
                    className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                  >
                    <Plus size={13} strokeWidth={3} /> RAISE TICKET
                  </button>
                </div>
              </div>

              {/* Table (Desktop) / Cards (Mobile) */}
              <div className="overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden bg-white/20">

                {/* Desktop Table */}
                <table data-tour="tickets-table" className="hidden lg:table w-full min-w-max text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Ticket ID</th>
                      <th className="px-5 py-4">Ticket Type</th>
                      <th className="px-5 py-4">Raised To</th>
                      <th className="px-5 py-4">Raised By</th>
                      <th className="px-5 py-4">Raised On</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {displayedTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-[#E0E7FF]/30 transition-all group">
                        <td className="px-5 sm:px-6 py-4 sm:py-5 align-top">
                          <span className="text-[12px] font-pmedium text-slate-600">{ticket.id}</span>
                        </td>
                        <td className="px-5 sm:px-6 py-4 sm:py-5 align-top whitespace-nowrap">
                          <div className="font-pmedium text-[#0F172A] text-[13px] sm:text-[14px]" title={ticket.title}>{ticket.title}</div>
                        </td>
                        <td className="px-5 sm:px-6 py-4 sm:py-5 align-top">
                          <div className="text-[12px] sm:text-[13px] font-pmedium text-[#0F172A] min-w-[140px]">
                            
                            {ticket.department || '-'}
                          </div>
                        </td>
                        <td className="px-5 sm:px-6 py-4 sm:py-5 align-top">
                          <div className="text-[12px] sm:text-[13px] font-pmedium text-[#0F172A] min-w-[180px]">
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
                        </td>
                        <td className="px-5 sm:px-6 py-4 sm:py-5 align-top font-pmedium text-[12px] text-slate-500">{ticket.created}</td>
                        <td className="px-5 sm:px-6 py-4 sm:py-5 align-top">
                          {getStatusBadge(ticket.status)}
                          {/* {ticket.status === 'Resolved' && ticket.resolutionNote && (
                            <p className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                              <FileText size={10} strokeWidth={2.5} /> Note Attached
                            </p>
                          )} */}
                        </td>
                        <td className="px-5 sm:px-6 py-4 sm:py-5 align-top text-center">
                          {ticket.status === 'Draft' ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={openCreateModal}
                                className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                aria-label="Edit ticket draft"
                                title="Edit draft"
                              >
                                <Pencil size={15} strokeWidth={2.5} aria-hidden="true" />
                              </button>
                              <button
                                onClick={() => void removeDraft()}
                                disabled={isRemovingDraft}
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Remove ticket draft"
                                title="Remove draft"
                              >
                                <Trash2 size={15} strokeWidth={2.5} aria-hidden="true" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setViewingTicket(ticket)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 mx-auto"
                              aria-label={`View details for ${ticket.id || ticket.title}`}
                              title="View details"
                            >
                              <Eye size={15} strokeWidth={2.5} aria-hidden="true" />
                            </button>
                          )}
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
                            <span className="font-pmedium text-[10px] text-slate-500">{ticket.id}</span>
                            <h3 className="font-pmedium text-[#0F172A] text-[13px] sm:text-[14px]">
                              {ticket.title}
                            </h3>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {getStatusBadge(ticket.status)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-1">
                          <div>
                            <span className={statusPillClass("Raised By")}>Raised By</span>
                            <span className="text-[11px] font-pmedium text-[#0F172A] truncate block" title={ticket.submittedBy}>{formatPersonLabel(ticket.submittedBy, ticket.submittedByDept)}</span>
                            {getSubmittedByBadgeLabel(ticket.submittedByDept) ? (
                              <span className={statusPillClass(getSubmittedByBadgeLabel(ticket.submittedByDept))}>
                                {getSubmittedByBadgeLabel(ticket.submittedByDept)}
                              </span>
                            ) : null}
                          </div>
                          <div>
                            <span className={statusPillClass("Raised To")}>Raised To</span>
                            <span className="text-[11px] font-pmedium text-[#2563EB] truncate block" title={ticket.department}>{ticket.department}</span>
                          </div>
                          <div>
                            <span className={statusPillClass("Raised On")}>Raised On</span>
                            <span className="text-[11px] font-pmedium text-slate-600 truncate block" title={ticket.created}>{ticket.created}</span>
                          </div>
                        </div>

                        <div className="flex justify-end items-center gap-1 mt-1 border-t border-slate-100/60 pt-3">
                          {ticket.status === 'Draft' ? (
                            <>
                              <button
                                onClick={openCreateModal}
                                className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                aria-label="Edit ticket draft"
                                title="Edit draft"
                              >
                                <Pencil size={15} strokeWidth={2.5} aria-hidden="true" />
                              </button>
                              <button
                                onClick={() => void removeDraft()}
                                disabled={isRemovingDraft}
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Remove ticket draft"
                                title="Remove draft"
                              >
                                <Trash2 size={15} strokeWidth={2.5} aria-hidden="true" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setViewingTicket(ticket)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                              aria-label={`View details for ${ticket.id || ticket.title}`}
                              title="View details"
                            >
                              <Eye size={15} strokeWidth={2.5} aria-hidden="true" />
                            </button>
                          )}
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
                   
                    Raise a Ticket
                  </h2>
                  <p className="text-[10px] sm:text-[11px] font-pmedium text-slate-500 uppercase tracking-widest mt-2">Request technical or facility assistance</p>
                </div>
                <button onClick={() => { setIsCreateModalOpen(false); resetCreateForm(); }} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm"><X size={18} strokeWidth={2.5} /></button>
              </div>

              <form onSubmit={handleCreateTicket} className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 [&::-webkit-scrollbar]:hidden bg-slate-50/30">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                  <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                    <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Building2 size={16} /></span>
                    <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Target Department</span>
                  </h4>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Target Department <span className="text-red-400">*</span></label>
                    <select required className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer" value={ticketForm.department} onChange={e => {
                      const nextDepartment = e.target.value;

                      setTicketForm({
                        ...ticketForm,
                        department: nextDepartment,
                        title: '',
                        description: '',
                        assetId: '',
                      });
                      setSelectedIssueId('');
                      setSelectedIssue(null);
                      setIsCustomIssue(false);
                      setCustomIssueTitle('');
                      setShowIssuePicker(Boolean(nextDepartment));
                    }}>
                      <option value="">Select Dept</option>
                      {ticketCreateDepartments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                  </div>
                  {requiresAssetSnapshotDepartment(ticketForm.department) && (
                    <div className="flex flex-col gap-1">
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
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><AlertCircle size={16} /></span>
                  <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Issue Details</span>
                </h4>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Select Issue</label>
                  {ticketForm.department ? (
                    <>
                      {!showIssuePicker && ticketForm.title.trim() && !isCustomIssue ? (
                        <div className="rounded-2xl border border-blue-100 bg-white shadow-sm p-4 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#2563EB] shrink-0" />
                            <p className="text-[13px] font-pmedium text-[#0F172A] truncate">{ticketForm.title}</p>
                          </div>
                          <button
                            type="button"
                            onClick={changeIssue}
                            className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-[10px] font-pmedium uppercase tracking-wider hover:bg-slate-100 transition-colors"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
                          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-blue-50/40">
                            <div>
                              <p className="text-[10px] font-pmedium text-blue-700 uppercase tracking-widest">
                                Issues for {ticketForm.department}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Pick a saved issue or add a new custom issue.
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
                            {isCustomIssue ? (
                              <div className="px-4 py-3">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1 block">Custom Issue *</label>
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Type a new issue for this department"
                                  className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-500"
                                  value={customIssueTitle}
                                  onChange={(e) => {
                                    setCustomIssueTitle(e.target.value);
                                    setTicketForm({ ...ticketForm, title: e.target.value });
                                  }}
                                />
                                <p className="text-[10px] font-medium text-slate-400 mt-1.5">This issue will be saved for future tickets in {ticketForm.department}.</p>
                              </div>
                            ) : (
                              <>
                                {issueSuggestions.length > 0 ? (
                                  issueSuggestions.map((issue) => {
                                    const issueId = String(issue._id || issue.id || '');
                                    const isSelected = !isCustomIssue && selectedIssueId && issueId && issueId === selectedIssueId;
                                    return (
                                      <button
                                        key={`${issue.departmentKey}-${issue.title}-${issueId}`}
                                        type="button"
                                        onClick={() => selectSavedIssue(issue)}
                                        className={`w-full text-left px-4 py-3 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-blue-50/70'}`}
                                      >
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="min-w-0 flex items-center gap-2">
                                            {isSelected && <CheckCircle2 size={14} className="text-[#2563EB] shrink-0" />}
                                            <div className="min-w-0">
                                              <p className="text-[13px] font-pmedium text-[#0F172A] truncate">{issue.title}</p>
                                            </div>
                                          </div>
                                          {issue.source !== 'seed' && (
                                            <span className={statusPillClass(issue.source === 'custom' ? 'Custom' : issue.department)}>
                                              {issue.source === 'custom' ? 'Custom' : issue.department}
                                            </span>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="px-4 py-4 text-[12px] text-slate-400">
                                    No saved issues yet. Add a custom issue below.
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={useCustomIssue}
                                  className="w-full text-left px-4 py-3 hover:bg-blue-50/70 transition-colors border-t border-slate-100 text-blue-700 text-[12px] font-pmedium flex items-center gap-2"
                                >
                                  <Plus size={14} /> Add a custom issue
                                </button>
                              </>
                            )}
                          </div>
                          {isCustomIssue && (
                            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={selectSavedOrContinue}
                                className="text-[11px] font-pmedium text-slate-500 hover:text-slate-700"
                              >
                                ← Back to saved issues
                              </button>
                              <span className="text-[10px] text-slate-400">Custom issue</span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-[12px] text-slate-400">Choose a target department first.</p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Detailed Description</label>
                  <textarea required rows={4} placeholder="Provide issue details..." className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none placeholder:text-slate-500" value={ticketForm.description} onChange={e => setTicketForm({ ...ticketForm, description: e.target.value })} />
                </div>
                </div>

                <AttachmentDropzone
                  files={attachmentFiles}
                  onFilesChange={setAttachmentFiles}
                  error={attachmentError}
                  onErrorChange={setAttachmentError}
                  label="Attachments"
                />

                <div className="pt-4 sm:pt-6 flex gap-3 border-t border-slate-200/60 flex-col sm:flex-row">
                  <button type="button" onClick={() => void saveDraft()} disabled={isSavingDraft} className="flex-1 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70">
                    <Save size={13} /> {isSavingDraft ? 'SAVING...' : 'SAVE DRAFT'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-primary/95 active:scale-95 transition-all uppercase flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70"
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
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3">
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
                <button onClick={() => { setViewingTicket(null); setShowResolvePrompt(false); setZoomedAttachment(null); }} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"><X size={16} /></button>
              </div>

              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-white">

                <div>
                  <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                    <FileText size={14} /> Issue Details
                  </h3>
                  <div className="grid grid-cols-1 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1 flex items-center gap-1"><Calendar size={10} /> Raised On</p>
                        <p className="text-[12px] font-pmedium text-slate-900">{viewingTicket.created}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1 flex items-center gap-1"><User size={10} /> Raised By</p>
                        <p className="text-[12px] font-pmedium text-slate-900 wrap-break-word">{viewingTicket.submittedBy}</p>
                        {getSubmittedByBadgeLabel(viewingTicket.submittedByDept) ? (
                          <span className={statusPillClass(getSubmittedByBadgeLabel(viewingTicket.submittedByDept))}>
                            {getSubmittedByBadgeLabel(viewingTicket.submittedByDept)}
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1 flex items-center gap-1"><Building2 size={10} /> Raised To</p>
                        <p className="text-[12px] font-pmedium text-[#2563EB] wrap-break-word">{viewingTicket.department || '-'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Issue Description</p>
                      <p className="text-[12px] font-pmedium text-slate-900 leading-relaxed whitespace-pre-wrap">{viewingTicket.description}</p>
                    </div>
                    {Array.isArray(viewingTicket.attachments) && viewingTicket.attachments.length > 0 && (
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-2">
                          Attachments ({viewingTicket.attachments.length})
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {viewingTicket.attachments.map((attachment, index) => {
                            const lower = String(attachment.name || attachment.url || '').toLowerCase();
                            const isImage = /\.(png|jpe?g|webp|gif|bmp|svg|avif|heic)$/.test(lower);
                            if (isImage) {
                              return (
                                <button
                                  key={attachment.id || `${attachment.url}-${index}`}
                                  type="button"
                                  onClick={() => setZoomedAttachment(attachment)}
                                  className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                  title="Click to zoom"
                                >
                                  <img
                                    src={attachment.url}
                                    alt={attachment.name || `Attachment ${index + 1}`}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    loading="lazy"
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                                    <Maximize2 size={18} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
                                  </span>
                                </button>
                              );
                            }
                            return (
                              <a
                                key={attachment.id || `${attachment.url}-${index}`}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-2 text-[11px] font-pmedium hover:border-[#2563EB] hover:text-[#2563EB] transition-colors max-w-[220px]"
                              >
                                <Paperclip size={12} className="shrink-0" />
                                <span className="truncate">{attachment.name || 'Attachment'}</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
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

                {/* Accepted & Assigned */}
                <div>
                  <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                    <User size={14} /> Accepted & Assigned
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Accepted By</p>
                      <p className="text-[12px] font-pmedium text-slate-900 wrap-break-word">{viewingTicket.acceptedBy || 'Not accepted yet'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Accepted On</p>
                      <p className="text-[12px] font-pmedium text-slate-900 wrap-break-word">{viewingTicket.acceptedAt || '—'}</p>
                    </div>
                    {(viewingTicket.assigneeUserId || (viewingTicket.assignedTo && !/queue$/i.test(String(viewingTicket.assignedTo ?? '').trim()))) && (
                      <>
                        <div className="min-w-0">
                          <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Assigned To</p>
                          <p className="text-[12px] font-pmedium text-slate-900 wrap-break-word">{viewingTicket.assignedTo || 'Unassigned'}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Assigned On</p>
                          <p className="text-[12px] font-pmedium text-slate-900 wrap-break-word">{viewingTicket.assignedAt || '—'}</p>
                        </div>
                      </>
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
                {canAcceptDepartmentTicket(viewingTicket) ? (
                  <div className="bg-amber-50 border border-amber-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in slide-in-from-bottom-4">
                    <div>
                      <h4 className="font-pmedium text-amber-900 text-[14px]">Accept Ticket</h4>
                      <p className="text-[11px] text-amber-700 font-pmedium mt-0.5">
                        Accepting this ticket will move it to "In Progress". You can assign it to someone afterwards.
                      </p>
                    </div>
                    <button
                      onClick={() => handleAcceptTicket()}
                      disabled={isSaving}
                      className="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-pmedium text-[11px] uppercase tracking-wider transition-colors shadow-sm w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSaving ? <><Loader2 size={15} className="animate-spin" /> Accepting...</> : 'Accept Ticket'}
                    </button>
                  </div>
                ) : isMyReceivedTicket(viewingTicket) && viewingTicket.status === 'Open' && !isMyRaisedTicket(viewingTicket) && (
                  <div className="bg-amber-50 border border-amber-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in slide-in-from-bottom-4">
                    <div>
                      <h4 className="font-pmedium text-amber-900 text-[14px]">Acknowledge Ticket</h4>
                      <p className="text-[11px] text-amber-700 font-pmedium mt-0.5">Accepting this will move it to "In Progress". You can assign it afterwards.</p>
                    </div>
                    <button onClick={() => handleAcceptTicket()} disabled={isSaving} className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-pmedium text-[11px] tracking-wider transition-colors shadow-sm w-full sm:w-auto uppercase disabled:opacity-60 disabled:cursor-not-allowed">
                      ACCEPT TICKET
                    </button>
                  </div>
                )}

                {/* 1b. Action - Assign Ticket (shows after acceptance for everyone) */}
                {canAssignDepartmentQueueTicket(viewingTicket) && viewingTicket.status === 'In Progress' && (
                  <div className="bg-indigo-50 border border-indigo-200 p-4 sm:p-5 rounded-2xl flex flex-col gap-4 shadow-sm animate-in slide-in-from-bottom-4">
                    <div>
                      <h4 className="font-pmedium text-indigo-900 text-[14px] flex items-center gap-2"><UserPlus size={15} /> Assign To</h4>
                      <p className="text-[11px] text-indigo-700 font-pmedium mt-0.5">
                        Route this ticket to a department member, or keep it with yourself.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] sm:text-[11px] font-pmedium text-slate-500 uppercase tracking-wider">Assign To</label>
                      <select
                        className="w-full px-4 py-3 bg-white border border-slate-200 shadow-sm rounded-xl font-pmedium text-[#0F172A] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none cursor-pointer transition-all"
                        value={ticketQueueAssigneeUserId || currentUserId || ''}
                        onChange={(e) => setTicketQueueAssigneeUserId(e.target.value)}
                      >
                        <option value={currentUserId || ''}>Keep with self</option>
                        {ticketQueueAssigneeOptions.map((member) => (
                          (String(member.userId) !== String(currentUserId)) && (
                            <option key={member.id} value={member.userId || member.id}>
                              Assign to {member.name} ({member.role})
                            </option>
                          )
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => handleAssignTicket(ticketQueueAssigneeUserId || currentUserId)}
                      disabled={isSaving}
                      className="w-full py-3 sm:py-3.5 rounded-xl font-pmedium text-[11px] sm:text-[12px] uppercase tracking-wider transition-all flex justify-center items-center gap-2 shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'ASSIGNING...' : 'Assign Ticket'}
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
                      className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl font-pmedium text-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none mb-3 shadow-sm placeholder:text-slate-500 text-[13px]"
                      value={resolutionMessage} onChange={e => setResolutionMessage(e.target.value)}
                    />
                    <div className="flex flex-col-reverse sm:flex-row gap-3">
                      <button onClick={() => setShowResolvePrompt(false)} className="flex-1 px-5 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-pmedium text-[11px] uppercase tracking-wider hover:bg-slate-50 w-full sm:w-auto">Cancel</button>
                      <button onClick={confirmResolution} className="flex-1 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-pmedium text-[11px] uppercase tracking-wider shadow-[0_4px_12px_rgba(5,150,105,0.2)] transition-all">
                        CONFIRM RESOLUTION
                      </button>
                    </div>
                  </div>
                )}

                {/* Raise Follow Up (If Owner raised it, and it was resolved but still broken) */}
                {isRaiserViewOfTicket(viewingTicket) && viewingTicket.status === 'Resolved' && (
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

                {isRaiserViewOfTicket(viewingTicket) && viewingTicket.status === 'Resolved' && (
                  <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div className="w-full sm:w-auto">
                      <h4 className="font-pmedium text-slate-900 text-[14px]">Close Ticket</h4>
                      <p className="text-[11px] text-slate-600 font-pmedium mt-0.5">Confirm the fix worked and close this ticket for good.</p>
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

        {/* Zoom Attachment Popup */}
        {zoomedAttachment && (
          <div
            className="fixed inset-0 z-[120] bg-[#0F172A]/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-8"
            onClick={() => setZoomedAttachment(null)}
          >
            <button
              onClick={() => setZoomedAttachment(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center text-white transition-colors z-10"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className="max-w-full max-h-full flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <figure className="max-h-full overflow-auto rounded-2xl border border-white/20 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                <img
                  src={zoomedAttachment.url}
                  alt={zoomedAttachment.name || 'Attachment'}
                  className="max-w-full max-h-[80vh] object-contain sm:object-scale-down block cursor-zoom-out"
                  onClick={() => setZoomedAttachment(null)}
                />
                {zoomedAttachment.name ? (
                  <figcaption className="px-4 py-2.5 border-t border-slate-100 text-[11px] font-pmedium text-slate-500 truncate text-center">
                    {zoomedAttachment.name}
                  </figcaption>
                ) : null}
              </figure>
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
        <ExportReportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          title="Export Tickets"
          department="General"
          category="Ticket"
          sourceRef={`tickets-${activeTab}`}
          reportTitle="Tickets"
          defaultDataWindow="Monthly"
          onExport={handleExportReport}
        />

      </PageFrame>
    </div>
  );
}
