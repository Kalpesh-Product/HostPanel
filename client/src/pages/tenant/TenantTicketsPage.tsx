import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Clock,
  MessageSquare,
  Plus,
  RefreshCw,
  Ticket,
  User,
  X,
} from 'lucide-react';
// import { toast } from 'sonner';
import { TicketsSkeleton } from '@/components/ui/Skeleton';
import { getStoredTenantCompanyId, getStoredTenantCompanyName, getStoredUser } from '@/lib/auth-session';
import { getStoredTenantRole, isTenantAdminRole, isTenantManagerRole } from '@/lib/tenant-session';

// ─── Backend service imports (uncomment when backend ready) ───
// import { getTickets, createTicket, getTicketIssueSuggestions } from '@/services/tickets';

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

function getStatusTone(status: string): string {
  const n = normalizeId(status);
  if (n === 'closed' || n === 'resolved') return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  if (n === 'in progress' || n === 'assigned') return 'border-blue-200 bg-blue-100 text-blue-700';
  if (n === 'cancelled' || n === 'rejected') return 'border-slate-200 bg-slate-100 text-slate-500';
  return 'border-amber-200 bg-amber-100 text-amber-700';
}

function getPriorityTone(priority: string): string {
  const n = normalizeId(priority);
  if (n === 'high' || n === 'critical' || n === 'urgent') return 'border-rose-200 bg-rose-100 text-rose-700';
  if (n === 'medium') return 'border-amber-200 bg-amber-100 text-amber-700';
  return 'border-slate-200 bg-slate-100 text-slate-500';
}

function getCurrentUserId(user: Record<string, any>): string {
  return normalizeId(user?.id || user?._id || user?.recordId || '');
}

function getCurrentUserName(user: Record<string, any>): string {
  return normalizeText(user?.fullName || user?.name || user?.email || '');
}

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
  const [noticeMessage, setNoticeMessage] = useState('');
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [issueSuggestions, setIssueSuggestions] = useState<IssueSuggestion[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: '',
    department: '',
  });
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);

  useEffect(() => {
    let active = true;

    const loadTickets = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        // ─── Backend calls (uncomment when backend ready) ───
        // const [ticketsResult, suggestionsResult] = await Promise.allSettled([
        //   getTickets({ page: 1, limit: 50 }),
        //   getTicketIssueSuggestions(),
        // ]);
        // if (!active) return;
        // if (ticketsResult.status === 'fulfilled') {
        //   const data = ticketsResult.value;
        //   const list = Array.isArray(data) ? data : Array.isArray(data?.tickets) ? data.tickets : Array.isArray(data?.data) ? data.data : [];
        //   setTickets(list as TicketItem[]);
        // }
        // if (suggestionsResult.status === 'fulfilled') {
        //   const data = suggestionsResult.value;
        //   const list = Array.isArray(data) ? data : Array.isArray(data?.suggestions) ? data.suggestions : [];
        //   setIssueSuggestions(list as IssueSuggestion[]);
        // }

        // ⚠️ Placeholder
        await new Promise((resolve) => setTimeout(resolve, 600));
        if (!active) return;
        setTickets([]);
        setIssueSuggestions([]);
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

  const visibleTickets = useMemo(() => {
    if (filterStatus === 'all') return tenantTickets;
    return tenantTickets.filter((t) => normalizeId(t.status) === filterStatus);
  }, [tenantTickets, filterStatus]);

  const statusCounts = useMemo(() => ({
    all: tenantTickets.length,
    open: tenantTickets.filter((t) => normalizeId(t.status) === 'open' || normalizeId(t.status) === 'new').length,
    progress: tenantTickets.filter((t) => normalizeId(t.status) === 'in progress' || normalizeId(t.status) === 'assigned').length,
    closed: tenantTickets.filter((t) => normalizeId(t.status) === 'closed' || normalizeId(t.status) === 'resolved').length,
  }), [tenantTickets]);

  const handleCreateTicket = async (event: FormEvent) => {
    event.preventDefault();
    if (!formData.title.trim()) { setErrorMessage('Title is required.'); return; }
    if (!formData.description.trim()) { setErrorMessage('Description is required.'); return; }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      // ─── Backend call (uncomment when backend ready) ───
      // const payload = {
      //   title: formData.title.trim(),
      //   description: formData.description.trim(),
      //   priority: formData.priority,
      //   category: formData.category.trim(),
      //   department: formData.department.trim() || 'Administration',
      //   tenantCompanyId: tenantCompanyId || undefined,
      //   tenantCompanyName,
      //   requesterUserId: currentUserId || undefined,
      //   requesterName: currentUserName,
      //   submittedBy: currentUserName,
      //   source: 'Tenant Portal',
      // };
      // await createTicket(payload);
      // toast.success('Ticket created successfully.');
      setNoticeMessage('Ticket created successfully.');
      setShowCreateForm(false);
      setFormData({ title: '', description: '', priority: 'medium', category: '', department: '' });
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to create ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <TicketsSkeleton />;

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] px-6 py-6 font-sans text-[#0F172A] lg:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-purple-600 to-indigo-800 text-white shadow-md">
            <Ticket size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Support Tickets</h1>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Raise and track support tickets for {tenantCompanyName}.
            </p>
          </div>
        </div>
        <button onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-slate-800">
          <Plus size={16} /> Raise Ticket
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{errorMessage}</div>
      )}
      {noticeMessage && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{noticeMessage}</div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <button onClick={() => setFilterStatus('all')} className={`rounded-2xl border p-4 text-left transition-all ${filterStatus === 'all' ? 'border-slate-900 bg-slate-900 text-white shadow-md' : 'border-slate-100 bg-white text-slate-900 shadow-sm hover:border-slate-200'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">All Tickets</p>
          <p className="mt-1 text-2xl font-black">{statusCounts.all}</p>
        </button>
        <button onClick={() => setFilterStatus('open')} className={`rounded-2xl border p-4 text-left transition-all ${filterStatus === 'open' ? 'border-amber-600 bg-amber-500 text-white shadow-md' : 'border-slate-100 bg-white text-slate-900 shadow-sm hover:border-slate-200'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest ${filterStatus === 'open' ? 'opacity-80' : 'text-amber-600'}`}>Open</p>
          <p className="mt-1 text-2xl font-black">{statusCounts.open}</p>
        </button>
        <button onClick={() => setFilterStatus('in progress')} className={`rounded-2xl border p-4 text-left transition-all ${filterStatus === 'in progress' ? 'border-blue-600 bg-blue-500 text-white shadow-md' : 'border-slate-100 bg-white text-slate-900 shadow-sm hover:border-slate-200'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest ${filterStatus === 'in progress' ? 'opacity-80' : 'text-blue-600'}`}>In Progress</p>
          <p className="mt-1 text-2xl font-black">{statusCounts.progress}</p>
        </button>
        <button onClick={() => setFilterStatus('closed')} className={`rounded-2xl border p-4 text-left transition-all ${filterStatus === 'closed' ? 'border-emerald-600 bg-emerald-500 text-white shadow-md' : 'border-slate-100 bg-white text-slate-900 shadow-sm hover:border-slate-200'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest ${filterStatus === 'closed' ? 'opacity-80' : 'text-emerald-600'}`}>Closed</p>
          <p className="mt-1 text-2xl font-black">{statusCounts.closed}</p>
        </button>
      </div>

      <div className="flex-1 rounded-[2.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-5">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <MessageSquare size={20} className="text-purple-600" /> {filterStatus === 'all' ? 'All Tickets' : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Tickets`}
          </h2>
          <button onClick={() => { setIsLoading(true); setTimeout(() => setIsLoading(false), 500); }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm transition-colors hover:bg-slate-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="divide-y divide-slate-50">
          {visibleTickets.length > 0 ? (
            visibleTickets.map((ticket) => (
              <div key={ticket.recordId || ticket.id} className="flex flex-col gap-4 p-6 transition-colors hover:bg-slate-50/60 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4 lg:w-3/5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${normalizeId(ticket.status) === 'closed' || normalizeId(ticket.status) === 'resolved' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                    <Ticket size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 truncate">{ticket.title}</h3>
                      <span className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${getPriorityTone(ticket.priority)}`}>
                        {normalizeText(ticket.priority || 'Medium')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-600 line-clamp-2">{ticket.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(ticket.createdAt)}</span>
                      {ticket.department && <span className="flex items-center gap-1">{ticket.department}</span>}
                      {ticket.assignedToName && <span className="flex items-center gap-1"><User size={12} /> {ticket.assignedToName}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 lg:w-2/5 lg:justify-end">
                  <span className={`rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusTone(ticket.status)}`}>
                    {normalizeText(ticket.status || 'Open')}
                  </span>
                  <button onClick={() => setSelectedTicket(ticket)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm transition-colors hover:bg-slate-50">
                    View <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Ticket size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-900">No tickets found</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {filterStatus !== 'all' ? 'No tickets match the current filter.' : 'Raise a ticket to report an issue or request support.'}
              </p>
              {filterStatus !== 'all' && (
                <button onClick={() => setFilterStatus('all')} className="mt-4 text-sm font-black text-[#2563EB] hover:underline">View all tickets</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create ticket modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateTicket} className="w-full max-w-2xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 px-6 py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Ticket</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Raise a Support Ticket</h2>
              </div>
              <button type="button" onClick={() => setShowCreateForm(false)} className="rounded-full bg-white p-2 text-slate-400 shadow-sm transition-colors hover:text-red-500">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-5 overflow-y-auto p-6">
              {issueSuggestions.length > 0 && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Suggested Issues</p>
                  <div className="flex flex-wrap gap-2">
                    {issueSuggestions.map((suggestion) => (
                      <button key={suggestion.id} type="button" onClick={() => setFormData((prev) => ({ ...prev, title: suggestion.title, category: suggestion.category }))}
                        className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors">
                        {suggestion.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Title</label>
                <input type="text" required value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Brief summary of the issue"
                  className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 font-bold text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Description</label>
                <textarea required value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} rows={4}
                  placeholder="Describe the issue in detail..."
                  className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 font-bold text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Priority</label>
                  <select value={formData.priority}
                    onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                    className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 font-bold text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Category</label>
                  <input type="text" value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g. IT, Facilities"
                    className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 font-bold text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Department</label>
                  <input type="text" value={formData.department}
                    onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g. Administration"
                    className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 font-bold text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-6 py-5">
              <button type="button" onClick={() => setShowCreateForm(false)} disabled={isSubmitting}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm transition-colors hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={isSubmitting}
                className="flex-2 rounded-xl bg-purple-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View ticket detail modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-5">
              <div>
                <h3 className="text-xl font-black text-slate-900">{selectedTicket.title}</h3>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Ticket #{selectedTicket.id}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="rounded-full bg-white p-2 text-slate-400 shadow-sm transition-colors hover:text-red-500">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-5 overflow-y-auto p-6">
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusTone(selectedTicket.status)}`}>
                  {normalizeText(selectedTicket.status || 'Open')}
                </span>
                <span className={`rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getPriorityTone(selectedTicket.priority)}`}>
                  {normalizeText(selectedTicket.priority || 'Medium')} Priority
                </span>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-medium leading-6 text-slate-700">{selectedTicket.description || 'No description provided.'}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requested By</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{selectedTicket.requesterName || selectedTicket.submittedBy || 'Unknown'}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned To</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{selectedTicket.assignedToName || selectedTicket.assignedTo || 'Unassigned'}</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{selectedTicket.category || selectedTicket.issueType || 'General'}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{selectedTicket.department || 'Administration'}</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Created</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{formatDateTime(selectedTicket.createdAt)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Updated</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{formatDateTime(selectedTicket.updatedAt)}</p>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">
              <button onClick={() => setSelectedTicket(null)} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-slate-800">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
