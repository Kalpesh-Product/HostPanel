import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import PageFrame from '@/components/Pages/PageFrame';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  MessageSquarePlus,
  Plus,
  Search,
  Ticket,
  UserCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { TicketsSkeleton } from '@/components/ui/Skeleton';
import WebsiteFormField from '@/components/WebsiteFormField';
import { getStoredTenantCompanyId, getStoredTenantCompanyName, getStoredUser } from '@/lib/auth-session';
import { getStoredTenantRole, isTenantAdminRole, isTenantManagerRole } from '@/lib/tenant-session';
import { getTickets, createTicket, getTicketIssueSuggestions } from '@/services/tickets';
import { statusPillClass } from '../../lib/status-pill';

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeId(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function formatDate(value: string): string {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}

function formatDateTime(value: string): string {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
}

function getStatusBadge(status: string) {
  const n = normalizeId(status);
  if (n === 'closed') return <span className={statusPillClass('closed')}>Closed</span>;
  if (n === 'resolved') return <span className={statusPillClass('resolved')}>Resolved</span>;
  if (n === 'in progress' || n === 'assigned' || n === 'progress') return <span className={statusPillClass('in progress')}>{normalizeText(status) || 'In Progress'}</span>;
  return <span className={statusPillClass('open')}>{normalizeText(status) || 'Open'}</span>;
}

function getPriorityBadge(priority: string) {
  const n = normalizeId(priority);
  if (n === 'high' || n === 'critical' || n === 'urgent') return <span className={statusPillClass('high priority')}>{normalizeText(priority) || 'High'}</span>;
  if (n === 'medium') return <span className={statusPillClass('medium')}>Medium</span>;
  return <span className={statusPillClass('low')}>{normalizeText(priority) || 'Low'}</span>;
}

function getCurrentUserId(user: Record<string, any>): string {
  return normalizeId(user?.id || user?._id || user?.recordId || '');
}

function getCurrentUserName(user: Record<string, any>): string {
  return normalizeText(user?.fullName || user?.name || user?.email || '');
}

const STATUS_PILLS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in progress', label: 'In Progress' },
  { key: 'closed', label: 'Closed' },
];

interface TicketItem {
  id: string;
  recordId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  department: string;
  category: string;
  issueType: string;
  requesterUserId: string;
  requesterName: string;
  assignedTo: string;
  assignedToName: string;
  submittedBy: string;
  tenantCompanyId: string;
  tenantCompanyName: string;
  createdAt: string;
  updatedAt: string;
}

interface IssueSuggestion {
  id: string;
  title: string;
  category: string;
}

const EMPTY_FORM = {
  title: '',
  description: '',
  priority: 'medium',
  category: '',
  department: 'Administration',
};

export default function TenantTicketsPage() {
  const currentUser = getStoredUser() || {};
  const userRole = getStoredTenantRole() || 'tenant-employee';
  const canManageTenant = isTenantAdminRole(userRole) || isTenantManagerRole(userRole);
  const tenantCompanyName = currentUser?.tenantCompanyName || currentUser?.workspaceMembership?.tenantCompanyName || getStoredTenantCompanyName() || 'Tenant Workspace';
  const tenantCompanyId = normalizeId(currentUser?.tenantCompanyId || currentUser?.workspaceMembership?.tenantCompanyId || getStoredTenantCompanyId() || '');
  const currentUserId = getCurrentUserId(currentUser);
  const currentUserName = getCurrentUserName(currentUser);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [issueSuggestions, setIssueSuggestions] = useState<IssueSuggestion[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);

  useEffect(() => {
    let active = true;

    const loadTickets = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const [ticketsResult, suggestionsResult] = await Promise.allSettled([
          getTickets({ page: 1, limit: 50 }),
          getTicketIssueSuggestions(),
        ]);
        if (!active) return;
        if (ticketsResult.status === 'fulfilled') {
          const data = ticketsResult.value;
          const list = Array.isArray(data) ? data : Array.isArray(data?.tickets) ? data.tickets : Array.isArray(data?.data) ? data.data : [];
          setTickets(list as TicketItem[]);
        }
        if (suggestionsResult.status === 'fulfilled') {
          const data = suggestionsResult.value;
          const list = Array.isArray(data) ? data : Array.isArray(data?.suggestions) ? data.suggestions : [];
          setIssueSuggestions(list as IssueSuggestion[]);
        }
      } catch (error: any) {
        if (active) setErrorMessage(error?.message || 'Unable to load tickets.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadTickets();
    return () => { active = false; };
  }, []);

  const tenantTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const ticketCompanyId = normalizeId(ticket?.tenantCompanyId || '');
      const ticketCompanyName = normalizeId(ticket?.tenantCompanyName || '');
      return (
        (tenantCompanyId && ticketCompanyId === tenantCompanyId) ||
        (normalizeId(tenantCompanyName) && ticketCompanyName === normalizeId(tenantCompanyName)) ||
        normalizeId(ticket?.requesterUserId || '') === currentUserId ||
        normalizeId(ticket?.submittedBy || '') === normalizeId(currentUserName)
      );
    });
  }, [tickets, tenantCompanyId, tenantCompanyName, currentUserId, currentUserName]);

  const isMyTicket = useCallback((ticket: TicketItem) =>
    normalizeId(ticket.requesterUserId || '') === currentUserId ||
    normalizeId(ticket.submittedBy || '') === normalizeId(currentUserName), [currentUserId, currentUserName]);

  const isClosedOrResolved = useCallback((ticket: TicketItem) =>
    ['closed', 'resolved'].includes(normalizeId(ticket.status)), []);

  // Main tabs: Company Tickets (managers only) → Raised Tickets → History.
  const mainTabs = useMemo(() => {
    const tabs: Array<{ key: string; label: string; openCount: number }> = [];
    if (canManageTenant) {
      tabs.push({
        key: 'company',
        label: 'Company Tickets',
        openCount: tenantTickets.filter((t) => !isClosedOrResolved(t) && ['open', 'new', 'pending'].includes(normalizeId(t.status))).length,
      });
    }
    tabs.push({
      key: 'raised',
      label: 'Raised Tickets',
      openCount: tenantTickets.filter((t) => isMyTicket(t) && !isClosedOrResolved(t) && ['open', 'new', 'pending'].includes(normalizeId(t.status))).length,
    });
    tabs.push({ key: 'history', label: 'History', openCount: 0 });
    return tabs;
  }, [canManageTenant, isClosedOrResolved, isMyTicket, tenantTickets]);

  const [activeTab, setActiveTab] = useState(canManageTenant ? 'company' : 'raised');

  const switchMainTab = (key: string) => { setActiveTab(key); setFilterStatus('all'); setSearchQuery(''); };

  const tabScopedTickets = useMemo(() => {
    if (activeTab === 'company') return tenantTickets.filter((t) => !isClosedOrResolved(t));
    if (activeTab === 'raised') return tenantTickets.filter((t) => isMyTicket(t) && !isClosedOrResolved(t));
    // History: resolved/closed tickets — company-wide for managers, own for everyone else.
    return tenantTickets.filter((t) => (canManageTenant || isMyTicket(t)) && isClosedOrResolved(t));
  }, [activeTab, canManageTenant, isClosedOrResolved, isMyTicket, tenantTickets]);

  const visibleTickets = useMemo(() => {
    const query = normalizeId(searchQuery);
    let scoped: TicketItem[];
    if (filterStatus === 'all') scoped = tabScopedTickets;
    else if (filterStatus === 'closed') {
      scoped = tabScopedTickets.filter((t) => ['closed', 'resolved'].includes(normalizeId(t.status)));
    } else if (filterStatus === 'in progress') {
      scoped = tabScopedTickets.filter((t) => ['in progress', 'assigned', 'progress'].includes(normalizeId(t.status)));
    } else {
      scoped = tabScopedTickets.filter((t) => ['open', 'new', 'pending'].includes(normalizeId(t.status)));
    }
    if (!query) return scoped;
    return scoped.filter((t) =>
      normalizeId(t.title).includes(query) ||
      normalizeId(t.description).includes(query) ||
      normalizeId(t.id).includes(query) ||
      normalizeId(t.category).includes(query) ||
      normalizeId(t.department).includes(query),
    );
  }, [tabScopedTickets, filterStatus, searchQuery]);

  const statusCounts = useMemo(() => ({
    all: tabScopedTickets.length,
    open: tabScopedTickets.filter((t) => ['open', 'new', 'pending'].includes(normalizeId(t.status))).length,
    progress: tabScopedTickets.filter((t) => ['in progress', 'assigned', 'progress'].includes(normalizeId(t.status))).length,
    closed: tabScopedTickets.filter((t) => ['closed', 'resolved'].includes(normalizeId(t.status))).length,
  }), [tabScopedTickets]);

  const openCreateModal = () => {
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setShowCreateForm(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = 'Issue title is required.';
    else if (formData.title.trim().length < 5) errors.title = 'Title must be at least 5 characters.';
    else if (formData.title.trim().length > 120) errors.title = 'Keep the title under 120 characters.';
    if (!formData.description.trim()) errors.description = 'Detailed description is required.';
    else if (formData.description.trim().length < 15) errors.description = 'Describe the issue in at least 15 characters.';
    if (!formData.priority) errors.priority = 'Select a priority.';
    if (!formData.department) errors.department = 'Select a target department.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateTicket = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const department = formData.department.trim() || 'Administration';
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        category: formData.category.trim(),
        department,
        assignedTo: `${department} Queue`,
        tenantCompanyId: tenantCompanyId || undefined,
        tenantCompanyName,
        requesterUserId: currentUserId || undefined,
        requesterName: currentUserName,
        submittedBy: currentUserName,
        submittedByDept: 'tenant-company-employee',
        source: 'Tenant Portal',
      };
      const createdTicket = await createTicket(payload);
      setTickets((current) => [createdTicket as TicketItem, ...current]);
      toast.success('Ticket created successfully.');
      setShowCreateForm(false);
      setFormData(EMPTY_FORM);
      setFormErrors({});
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to create ticket.');
      toast.error(error?.message || 'Unable to create ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <TicketsSkeleton />;

  const emptyStateMessage = activeTab === 'company'
    ? 'No active company tickets.'
    : activeTab === 'raised'
      ? 'You have not raised any active tickets yet.'
      : 'No resolved or closed tickets in history yet.';

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-pmedium text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ── Header ── */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h1 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Tickets
              </h1>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Raise and track support tickets for {tenantCompanyName}.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-pmedium text-red-600">
              {errorMessage}
            </div>
          )}

          {/* ── Main Tabs: Company / Raised / History ── */}
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm" data-tour="tenant-tickets-tabs">
            {mainTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => switchMainTab(tab.key)}
                className={`flex-1 min-w-[120px] rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.key ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
                {tab.openCount > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-pmedium leading-none border ${activeTab === tab.key ? 'bg-white/20 text-white border-white/30' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {tab.openCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0" data-tour="tenant-tickets-summary">
            {[
              { key: 'total', label: 'Total Tickets', value: statusCounts.all, borderClass: '', iconClass: 'bg-slate-50 text-slate-600', icon: <Ticket size={16} /> },
              { key: 'open', label: 'Open (Raised)', value: statusCounts.open, borderClass: 'border-l-4 border-l-amber-500', iconClass: 'bg-amber-50 text-amber-600', icon: <AlertCircle size={16} /> },
              { key: 'progress', label: 'In Progress', value: statusCounts.progress, borderClass: 'border-l-4 border-l-blue-500', iconClass: 'bg-blue-50 text-blue-600', icon: <Clock size={16} /> },
              { key: 'closed', label: 'Closed / Resolved', value: statusCounts.closed, borderClass: 'border-l-4 border-l-emerald-500', iconClass: 'bg-emerald-50 text-emerald-600', icon: <CheckCircle2 size={16} /> },
            ].map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => setFilterStatus(card.key === 'total' ? 'all' : card.key)}
                className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md cursor-pointer ${card.borderClass} ${filterStatus === (card.key === 'total' ? 'all' : card.key) ? 'ring-2 ring-[#2563EB]/30' : ''}`}
              >
                <div className="min-w-0 text-left">
                  <p className={`text-[10px] font-pmedium uppercase tracking-widest mb-1 ${card.borderClass ? card.iconClass.split(' ').find((cls) => cls.startsWith('text-')) || 'text-slate-400' : 'text-slate-400'}`}>{card.label}</p>
                  <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
                </div>
                <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}>{card.icon}</div>
              </button>
            ))}
          </div>

          {/* ── Data Panel ── */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

            {/* Panel header row: status pills → search → add */}
            <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:gap-4 sm:p-4 xl:flex-row xl:items-center lg:p-5">
              <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden" data-tour="tenant-tickets-status-filters">
                {STATUS_PILLS.map((pill) => (
                  <button
                    key={pill.key}
                    onClick={() => setFilterStatus(pill.key)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] sm:text-[12px] font-pmedium transition-all ${
                      filterStatus === pill.key ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200' : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <div className="flex w-full flex-wrap items-center gap-3 sm:flex-nowrap xl:w-auto">
                <div className="relative min-w-[180px] flex-1" data-tour="tenant-tickets-search">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-200/60 bg-white py-2.5 pl-9 pr-4 text-[12px] font-pmedium text-[#0F172A] outline-none transition-all placeholder:text-slate-500 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                  />
                </div>
                <button
                  onClick={openCreateModal}
                  data-tour="tenant-tickets-raise-btn"
                  className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap uppercase tracking-widest"
                >
                  <Plus size={13} strokeWidth={3} /> Raise Ticket
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1 bg-white/20" data-tour="tenant-tickets-table">
              <table className="hidden lg:table w-full text-left font-pmedium">
                <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-5 py-4">Ticket Details</th>
                    <th className="px-5 py-4">Raised By</th>
                    <th className="px-5 py-4">Routing</th>
                    <th className="px-5 py-4">Priority</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Updated</th>
                    <th className="px-5 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {visibleTickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center font-pmedium text-slate-400">{emptyStateMessage}</td>
                    </tr>
                  ) : visibleTickets.map((ticket) => (
                    <tr key={ticket.recordId || ticket.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4 align-top max-w-[300px]">
                        <span className="text-[10px] font-pmedium text-slate-500 mb-1 inline-block">{ticket.id}</span>
                        <div className="font-pmedium text-[#0F172A] text-[13px]" title={ticket.title}>{ticket.title}</div>
                        <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">{ticket.description}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 font-pmedium text-slate-900 text-[12px]">
                          <UserCheck size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate">{ticket.requesterName || ticket.submittedBy || 'Unknown'}</span>
                        </div>
                        <p className="mt-0.5 text-[10px] font-pmedium text-slate-400">{tenantCompanyName}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-center gap-1.5 text-[11px] font-pmedium text-[#2563EB]">
                          <Building2 size={12} />
                          {ticket.department || 'Administration'}
                        </div>
                        {ticket.category && <p className="mt-1 text-[10px] font-pmedium text-slate-400">{ticket.category}</p>}
                      </td>
                      <td className="px-5 py-4 align-top">{getPriorityBadge(ticket.priority)}</td>
                      <td className="px-5 py-4 align-top">{getStatusBadge(ticket.status)}</td>
                      <td className="px-5 py-4 align-top">
                        <span className="text-[11px] font-pmedium text-slate-600 whitespace-nowrap">{formatDate(ticket.updatedAt || ticket.createdAt)}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                          title="View details"
                          aria-label={`View details for ${ticket.id || ticket.title}`}
                        >
                          <Eye size={15} strokeWidth={2.5} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="flex flex-col gap-3 lg:hidden p-3 bg-slate-50/30">
                {visibleTickets.length === 0 ? (
                  <div className="py-16 text-center font-pmedium text-slate-400">{emptyStateMessage}</div>
                ) : visibleTickets.map((ticket) => (
                  <div key={ticket.recordId || ticket.id} className="bg-white border p-4 rounded-[20px] shadow-sm flex flex-col gap-3 transition-all border-slate-200/60">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                        <span className="font-pmedium text-[10px] text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded w-max border border-blue-100">{ticket.id}</span>
                        <h3 className="font-pmedium text-[#0F172A] text-[13px]">{ticket.title}</h3>
                        <p className="text-[12px] text-slate-500 line-clamp-2">{ticket.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100 mt-1">
                      <div>
                        <span className={statusPillClass('raised by')}>Raised By</span>
                        <span className="text-[11px] font-pmedium text-[#0F172A] truncate block" title={ticket.submittedBy}>{ticket.requesterName || ticket.submittedBy || 'Unknown'}</span>
                      </div>
                      <div>
                        <span className={statusPillClass('routed to')}>Routed To</span>
                        <span className="text-[11px] font-pmedium text-[#2563EB] truncate block">{ticket.department || 'Administration'}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-1 border-t border-slate-100/60 pt-3">
                      <span className="font-pmedium text-slate-700 text-[11px] flex items-center gap-1.5"><Calendar size={12} /> {formatDate(ticket.createdAt)}</span>
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                        aria-label={`View details for ${ticket.id || ticket.title}`}
                      >
                        <Eye size={15} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Create ticket modal ── */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-3 animate-in fade-in duration-200">
            <form onSubmit={handleCreateTicket} noValidate className="bg-white rounded-t-[2rem] sm:rounded-[2rem] max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70 max-h-[92vh] sm:max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                    <MessageSquarePlus size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">Raise a Support Ticket</h2>
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mt-0.5">Submitted on behalf of {tenantCompanyName}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowCreateForm(false)} disabled={isSubmitting} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"><X size={16} /></button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-white">
                {issueSuggestions.length > 0 && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-blue-700 mb-2 flex items-center gap-1.5"><FileText size={13} /> Suggested issues — tap to autofill</p>
                    <div className="flex flex-wrap gap-2">
                      {issueSuggestions.map((suggestion) => (
                        <button key={suggestion.id} type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, title: suggestion.title, category: suggestion.category || prev.category }));
                            setFormErrors((prev) => ({ ...prev, title: '' }));
                          }}
                          className="cursor-pointer rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-pmedium text-blue-700 hover:bg-blue-100 active:scale-95 transition-all">
                          {suggestion.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                  <WebsiteFormField
                    label="Issue Title"
                    required
                    value={formData.title}
                    maxLength={120}
                    error={!!formErrors.title}
                    helperText={formErrors.title || `${formData.title.trim().length}/120 characters`}
                    placeholder="Brief summary of the issue"
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, title: e.target.value }));
                      if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: '' }));
                    }}
                  />
                  <WebsiteFormField
                    label="Detailed Description"
                    multiline
                    minRows={4}
                    required
                    value={formData.description}
                    error={!!formErrors.description}
                    helperText={formErrors.description || 'Include what happened, where, and since when.'}
                    placeholder="Describe the issue in detail..."
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, description: e.target.value }));
                      if (formErrors.description) setFormErrors((prev) => ({ ...prev, description: '' }));
                    }}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <WebsiteFormField
                      label="Priority"
                      select
                      required
                      value={formData.priority}
                      error={!!formErrors.priority}
                      helperText={formErrors.priority}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, priority: e.target.value }));
                        if (formErrors.priority) setFormErrors((prev) => ({ ...prev, priority: '' }));
                      }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </WebsiteFormField>
                    <WebsiteFormField
                      label="Category"
                      value={formData.category}
                      placeholder="e.g. IT, Facilities"
                      onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    />
                    <WebsiteFormField
                      label="Target Department"
                      select
                      required
                      value={formData.department}
                      error={!!formErrors.department}
                      helperText={formErrors.department}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, department: e.target.value }));
                        if (formErrors.department) setFormErrors((prev) => ({ ...prev, department: '' }));
                      }}
                    >
                      <option value="Administration">Administration</option>
                      <option value="super_admin">Super Admin</option>
                    </WebsiteFormField>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 sm:p-6 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button type="button" onClick={() => setShowCreateForm(false)} disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest disabled:opacity-60">Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-primary/95 active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70">
                  {isSubmitting ? 'Creating...' : 'Create Ticket'} {!isSubmitting && <Plus size={13} strokeWidth={3} />}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── View ticket modal ── */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70 max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                    <Ticket size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">{selectedTicket.title}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-pmedium text-[10px] text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">#{selectedTicket.id}</span>
                      {getPriorityBadge(selectedTicket.priority)}
                      {getStatusBadge(selectedTicket.status)}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"><X size={16} /></button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-white">
                <div>
                  <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                    <FileText size={14} /> Issue Details
                  </h3>
                  <div className="grid grid-cols-1 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1 flex items-center gap-1"><Calendar size={10} /> Raised On</p>
                      <p className="text-[12px] font-pmedium text-slate-900">{formatDateTime(selectedTicket.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Issue Description</p>
                      <p className="text-[12px] font-pmedium text-slate-900 leading-relaxed whitespace-pre-wrap">{selectedTicket.description || 'No description provided.'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                    <UserCheck size={14} /> Routing &amp; People
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Requested By</p>
                      <p className="text-[12px] font-pmedium text-slate-900 break-words">{selectedTicket.requesterName || selectedTicket.submittedBy || 'Unknown'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Assigned To</p>
                      <p className="text-[12px] font-pmedium text-slate-900 break-words">{selectedTicket.assignedToName || selectedTicket.assignedTo || 'Unassigned'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Category</p>
                      <p className="text-[12px] font-pmedium text-slate-900">{selectedTicket.category || selectedTicket.issueType || 'General'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Department</p>
                      <p className="text-[12px] font-pmedium text-slate-900">{selectedTicket.department || 'Administration'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Created</p>
                      <p className="text-[12px] font-pmedium text-slate-900">{formatDateTime(selectedTicket.createdAt)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Last Updated</p>
                      <p className="text-[12px] font-pmedium text-slate-900">{formatDateTime(selectedTicket.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 sm:p-6 border-t border-slate-100 bg-white flex justify-end">
                <button onClick={() => setSelectedTicket(null)} className="px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest">Close</button>
              </div>
            </div>
          </div>
        )}
      </PageFrame>
    </div>
  );
}
