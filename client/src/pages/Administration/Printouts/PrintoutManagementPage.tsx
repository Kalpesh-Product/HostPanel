import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Printer, Plus, X, Paperclip, Building2, User as UserIcon, Clock,
  Search, ListChecks, Hourglass, XCircle, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import PageFrame from '@/components/Pages/PageFrame';
import { CardsGridSkeleton } from '@/components/ui/Skeleton';
import { statusPillClass } from '@/lib/status-pill';
import humanDate from '@/utils/humanDateForamt';
import { axiosPrivate } from '@/utils/axios';
import { canAccessAdminDashboard, canAccessAdministrationDashboard, getStoredUser } from '@/lib/auth-session';
import { getDepartments } from '@/services/organization';
import { getWorkspaceMembers } from '@/services/auth';
import { createPrintoutRequest, getPrintoutRequests, updatePrintoutRequest } from '@/services/printouts';
import { getAllTenantCompanies, getTenantCompany } from '@/services/tenant-companies';

// Cancelled is deliberately absent — a cancelled request only ever shows to
// the person who cancelled it (server excludes it from this page's fetch).
const ACTIVE_STATUSES = ['Pending', 'In Progress'];
const STATUS_OPTIONS = ['Pending', 'In Progress', 'Completed', 'Rejected'];

interface PrintoutRequestRecord {
  _id: string;
  requestCode: string;
  title: string;
  notes?: string;
  copies: number;
  colorMode: string;
  paperSize: string;
  doubleSided: boolean;
  priority: 'Low' | 'Medium' | 'High';
  status: string;
  requestedByName: string;
  requestedByType: 'internal' | 'tenant';
  requestedByDepartment?: string;
  tenantCompanyName?: string;
  sourceType: 'self' | 'walk-in';
  acceptedByName?: string;
  rejectedByName?: string;
  printedByName?: string;
  attachments?: { id: string; url: string; name: string }[];
  createdAt: string;
}

interface DepartmentOption { id: string; name: string }
interface MemberOption { userId: string; name: string; departments: string[] }
interface TenantEmployeeOption { id: string; name: string; department: string; status: string; userId?: string | null }

const emptyRequestForm = {
  title: '',
  notes: '',
  copies: '1',
  colorMode: 'Black & White',
  paperSize: 'A4',
  doubleSided: false,
  priority: 'Medium',
};

const emptyWalkInForm = {
  ...emptyRequestForm,
  requestedByType: 'internal' as 'internal' | 'tenant',
  // Keyed separately from requestedByUserId because a tenant employee may
  // not have a linked HostUser account yet — the select still needs a
  // stable, always-present value to stay controlled in that case.
  requestedByEmployeeKey: '',
  requestedByUserId: '',
  requestedByName: '',
  requestedByDepartment: '',
  tenantCompanyId: '',
  tenantCompanyName: '',
};

export default function PrintoutManagementPage() {
  const storedUser = useMemo(() => getStoredUser(), []);
  // Role-string checks alone miss a plain employee/manager who is simply a
  // member of the Administration department (the common case) — mirror the
  // backend's rule exactly by also checking department membership, the same
  // way BudgetPage/Assets pages already do.
  const isAdministrationDeptMember = (storedUser?.departments || []).some(
    (d: any) => String(d?.name || '').trim().toLowerCase() === 'administration'
  );
  const isAuthorized = canAccessAdminDashboard(storedUser) || canAccessAdministrationDashboard(storedUser) || isAdministrationDeptMember;

  const [requests, setRequests] = useState<PrintoutRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'history'>('requests');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInForm, setWalkInForm] = useState(emptyWalkInForm);
  const [submitting, setSubmitting] = useState(false);

  const [internalDepartments, setInternalDepartments] = useState<DepartmentOption[]>([]);
  const [internalMembers, setInternalMembers] = useState<MemberOption[]>([]);
  const [tenantCompanies, setTenantCompanies] = useState<{ _id: string; companyName: string }[]>([]);
  const [tenantDepartments, setTenantDepartments] = useState<string[]>([]);
  const [tenantEmployees, setTenantEmployees] = useState<TenantEmployeeOption[]>([]);
  const [loadingTenantRoster, setLoadingTenantRoster] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getPrintoutRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load printout requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // Fetch the internal department + employee rosters and the tenant company
  // list once the walk-in popup opens — everything here is picked from real
  // records, never typed free-text.
  useEffect(() => {
    if (!showWalkInModal) return;
    if (internalDepartments.length === 0) {
      getDepartments(axiosPrivate)
        .then((res: any) => setInternalDepartments((res?.data?.data || []).map((d: any) => ({ id: String(d.id), name: d.name }))))
        .catch(() => {});
    }
    if (internalMembers.length === 0) {
      getWorkspaceMembers()
        .then((data: any) => {
          const members = data?.members || [];
          setInternalMembers(members.map((m: any) => ({ userId: m.userId, name: m.fullName || m.name || m.email, departments: m.departments || [] })));
        })
        .catch(() => {});
    }
    if (tenantCompanies.length === 0) {
      getAllTenantCompanies()
        .then((res: any) => {
          const tenants = res?.data?.tenants || [];
          setTenantCompanies(tenants.map((t: any) => ({ _id: t._id, companyName: t.companyName })));
        })
        .catch(() => {});
    }
  }, [showWalkInModal, internalDepartments.length, internalMembers.length, tenantCompanies.length]);

  // Once a tenant company is picked, fetch that company's own department +
  // employee roster so the next two dropdowns are scoped to it.
  useEffect(() => {
    if (!walkInForm.tenantCompanyId) {
      setTenantDepartments([]);
      setTenantEmployees([]);
      return;
    }
    setLoadingTenantRoster(true);
    getTenantCompany(walkInForm.tenantCompanyId)
      .then((res: any) => {
        const tenant = res?.data?.tenant || {};
        setTenantDepartments(Array.isArray(tenant.departments) ? tenant.departments : []);
        setTenantEmployees(
          (Array.isArray(tenant.employees) ? tenant.employees : []).map((e: any) => ({
            id: e.id,
            name: e.name,
            department: e.department || '',
            status: e.status || 'Active',
            userId: e.userId || null,
          })),
        );
      })
      .catch(() => {})
      .finally(() => setLoadingTenantRoster(false));
  }, [walkInForm.tenantCompanyId]);

  const activeRequests = useMemo(() => requests.filter((r) => ACTIVE_STATUSES.includes(r.status)), [requests]);
  const historyRequests = useMemo(() => requests.filter((r) => !ACTIVE_STATUSES.includes(r.status)), [requests]);
  const scopedRequests = activeTab === 'history' ? historyRequests : activeRequests;

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => r.status === 'Pending').length,
    inProgress: requests.filter((r) => r.status === 'In Progress').length,
    completed: requests.filter((r) => r.status === 'Completed').length,
    rejected: requests.filter((r) => r.status === 'Rejected').length,
  }), [requests]);

  const displayedRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedRequests.filter((r) => {
      const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchesSearch = !q
        || r.title.toLowerCase().includes(q)
        || r.requestCode.toLowerCase().includes(q)
        || r.requestedByName.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [scopedRequests, statusFilter, searchQuery]);

  const resetWalkInForm = () => setWalkInForm(emptyWalkInForm);

  const submitWalkIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!walkInForm.title.trim() || !walkInForm.requestedByName.trim()) {
      toast.error('Pick a requester and describe the document to print');
      return;
    }
    setSubmitting(true);
    try {
      await createPrintoutRequest({
        title: walkInForm.title.trim(),
        notes: walkInForm.notes.trim(),
        copies: walkInForm.copies,
        colorMode: walkInForm.colorMode,
        paperSize: walkInForm.paperSize,
        doubleSided: walkInForm.doubleSided,
        priority: walkInForm.priority,
        sourceType: 'walk-in',
        requestedByType: walkInForm.requestedByType,
        requestedByUserId: walkInForm.requestedByUserId || undefined,
        requestedByName: walkInForm.requestedByName.trim(),
        requestedByDepartment: walkInForm.requestedByDepartment.trim(),
        tenantCompanyId: walkInForm.requestedByType === 'tenant' ? walkInForm.tenantCompanyId : undefined,
        tenantCompanyName: walkInForm.requestedByType === 'tenant' ? walkInForm.tenantCompanyName : undefined,
      });
      toast.success('Printout logged — visible under Printout Requests');
      setShowWalkInModal(false);
      resetWalkInForm();
      loadRequests();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to log printout');
    } finally {
      setSubmitting(false);
    }
  };

  const STATUS_TOASTS: Record<string, string> = {
    'In Progress': 'Request accepted — now in progress',
    'Completed': 'Marked completed — ready for collection',
    'Rejected': 'Request rejected',
  };

  const changeStatus = async (requestId: string, status: string) => {
    try {
      await updatePrintoutRequest(requestId, { status });
      toast.success(STATUS_TOASTS[status] || `Marked as ${status}`);
      loadRequests();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    }
  };

  const requesterTypeBadge = (request: PrintoutRequestRecord) => (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-pmedium uppercase tracking-wide ${
      request.requestedByType === 'tenant' ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600'
    }`}>
      {request.requestedByType === 'tenant' ? <Building2 size={9} /> : <UserIcon size={9} />}
      {request.requestedByType === 'tenant' ? 'Tenant' : 'Internal'}
    </span>
  );

  const renderAttachments = (attachments?: { id: string; url: string; name: string }[]) => {
    if (!attachments || attachments.length === 0) return <span className="text-slate-400">—</span>;
    return (
      <div className="flex flex-col gap-1">
        {attachments.map((a) => (
          <a
            key={a.id || a.url}
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-pmedium text-blue-700 hover:underline truncate max-w-[180px]"
          >
            <Paperclip size={11} className="shrink-0" /> {a.name}
          </a>
        ))}
      </div>
    );
  };

  const statusActions = (request: PrintoutRequestRecord) => {
    if (request.status === 'Pending') {
      return (
        <div className="flex items-center gap-1.5 mt-1">
          <button
            onClick={() => changeStatus(request._id, 'In Progress')}
            className="text-[10px] font-pmedium uppercase tracking-wide px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={() => changeStatus(request._id, 'Rejected')}
            className="text-[10px] font-pmedium uppercase tracking-wide px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
          >
            Reject
          </button>
        </div>
      );
    }
    if (request.status === 'In Progress') {
      return (
        <button
          onClick={() => changeStatus(request._id, 'Completed')}
          className="mt-1 text-[10px] font-pmedium uppercase tracking-wide px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
        >
          Mark Completed
        </button>
      );
    }
    if (request.status === 'Completed' && request.printedByName) {
      return <p className="text-[10px] text-slate-400 mt-0.5">Printed by {request.printedByName}</p>;
    }
    if (request.status === 'Rejected' && request.rejectedByName) {
      return <p className="text-[10px] text-slate-400 mt-0.5">Rejected by {request.rejectedByName}</p>;
    }
    return null;
  };

  const statCards = [
    { key: 'total', label: 'Total', value: stats.total, icon: ListChecks, iconClass: 'bg-slate-50 text-slate-600', labelClass: 'text-slate-400', borderClass: '' },
    { key: 'pending', label: 'Pending', value: stats.pending, icon: Hourglass, iconClass: 'bg-amber-50 text-amber-600', labelClass: 'text-amber-600', borderClass: 'border-l-4 border-l-amber-500' },
    { key: 'inProgress', label: 'In Progress', value: stats.inProgress, icon: Printer, iconClass: 'bg-blue-50 text-blue-600', labelClass: 'text-blue-600', borderClass: 'border-l-4 border-l-blue-500' },
    { key: 'rejected', label: 'Rejected', value: stats.rejected, icon: XCircle, iconClass: 'bg-rose-50 text-rose-600', labelClass: 'text-rose-600', borderClass: 'border-l-4 border-l-rose-500' },
    { key: 'completed', label: 'Completed', value: stats.completed, icon: CheckCircle2, iconClass: 'bg-emerald-50 text-emerald-600', labelClass: 'text-emerald-600', borderClass: 'border-l-4 border-l-emerald-500' },
  ];

  const internalEmployeeOptions = walkInForm.requestedByDepartment
    ? internalMembers.filter((m) => m.departments.includes(walkInForm.requestedByDepartment))
    : internalMembers;

  const tenantEmployeeOptions = (walkInForm.requestedByDepartment
    ? tenantEmployees.filter((e) => e.department === walkInForm.requestedByDepartment)
    : tenantEmployees
  ).filter((e) => e.status === 'Active');

  // Printout requests are private between the requester and Administration —
  // nobody else (a manager of an unrelated department, a plain employee)
  // gets the full queue, no matter how they reach this URL.
  if (!isAuthorized) {
    return <Navigate to="/common-modules/printouts" replace />;
  }

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* HEADER */}
          <div className="mb-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-title font-pmedium text-primary uppercase">Printout Management</h2>
                <p className="text-xs font-pmedium text-slate-500 mt-1">
                  Every printout request submitted by internal staff and tenant companies.
                </p>
              </div>
            </div>
          </div>

          {/* PILL TABS */}
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            {(['requests', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setStatusFilter('All'); }}
                className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
                  activeTab === tab ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab === 'requests' ? `Printout Requests (${activeRequests.length})` : `Printout History (${historyRequests.length})`}
              </button>
            ))}
          </div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.key} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${card.borderClass}`}>
                  <div className="min-w-0">
                    <p className={`text-[10px] font-pmedium ${card.labelClass} uppercase tracking-widest mb-1`}>{card.label}</p>
                    <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}><Icon size={16} /></div>
                </div>
              );
            })}
          </div>

          {/* DATA PANEL */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">

            {/* Toolbar */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {['All', ...STATUS_OPTIONS].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${
                      statusFilter === status
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
                    type="text"
                    placeholder="Search by title, code, or requester..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => setShowWalkInModal(true)}
                  className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                >
                  <Plus size={13} strokeWidth={3} /> ADD REQUEST
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-4"><CardsGridSkeleton /></div>
            ) : (
              <div className="overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden bg-white/20">
                {/* DESKTOP TABLE */}
                <table className="hidden lg:table w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-4 py-3">Request</th>
                      <th className="px-4 py-3">Requested By</th>
                      <th className="px-4 py-3">Copies</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Attachments</th>
                      <th className="px-4 py-3">Submitted</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedRequests.map((request) => (
                      <tr key={request._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-[12px] font-pmedium text-[#0F172A]">{request.title}</p>
                          <p className="text-[10px] text-slate-400">{request.requestCode}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[12px] font-pmedium text-slate-800">{request.requestedByName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {requesterTypeBadge(request)}
                            <span className="text-[10px] text-slate-400">
                              {request.requestedByType === 'tenant' ? request.tenantCompanyName : request.requestedByDepartment}
                              {request.sourceType === 'walk-in' ? ' · Walk-in' : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-slate-700">{request.copies}</td>
                        <td className="px-4 py-3 text-[12px] text-slate-700">{request.priority}</td>
                        <td className="px-4 py-3">{renderAttachments(request.attachments)}</td>
                        <td className="px-4 py-3 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1"><Clock size={11} className="text-slate-400" /> {humanDate(request.createdAt)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-0.5">
                            <span className={statusPillClass(request.status)}>{request.status}</span>
                            {statusActions(request)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* MOBILE CARD VIEW */}
                <div className="flex flex-col gap-3 lg:hidden p-3 sm:p-4 bg-slate-50/30">
                  {displayedRequests.map((request) => (
                    <div key={request._id} className="bg-white border border-slate-200/60 p-4 sm:p-5 rounded-[20px] shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-[#0F172A] text-[13px] sm:text-[14px] truncate">{request.title}</h3>
                          <p className="text-[10px] text-slate-400">{request.requestCode}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className={statusPillClass(request.status)}>{request.status}</span>
                          {statusActions(request)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="col-span-2">
                          <span className="text-[9px] text-slate-400 uppercase font-pmedium tracking-widest block">Requested By</span>
                          <span className="text-[11px] font-semibold text-[#0F172A] truncate block">{request.requestedByName}</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            {requesterTypeBadge(request)}
                            <span className="text-[10px] text-slate-400">
                              {request.requestedByType === 'tenant' ? request.tenantCompanyName : request.requestedByDepartment}
                              {request.sourceType === 'walk-in' ? ' · Walk-in' : ''}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-pmedium tracking-widest block">Copies</span>
                          <span className="text-[11px] font-semibold text-[#0F172A] block">{request.copies}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-pmedium tracking-widest block">Priority</span>
                          <span className="text-[11px] font-semibold text-[#0F172A] block">{request.priority}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[9px] text-slate-400 uppercase font-pmedium tracking-widest block">Attachments</span>
                          {renderAttachments(request.attachments)}
                        </div>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100/60 pt-3">
                        <span className="font-semibold text-slate-500 text-[11px] flex items-center gap-1.5"><Clock size={12} /> {humanDate(request.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {displayedRequests.length === 0 && (
                  <div className="text-center py-20 text-slate-400 font-semibold">
                    No printout requests found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </PageFrame>

      {showWalkInModal && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => setShowWalkInModal(false)}>
          <div className="bg-white rounded-[2rem] max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                  <Printer size={16} />
                </div>
                <div>
                  <h2 className="text-base font-pmedium text-slate-800">Log a Front Desk Printout</h2>
                  <p className="text-[11px] text-slate-500">For someone who walked up to the desk with a document to print.</p>
                </div>
              </div>
              <button onClick={() => setShowWalkInModal(false)} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700"><X size={16} /></button>
            </div>
            <form onSubmit={submitWalkIn} className="p-5 space-y-4 overflow-y-auto">
              <div className="flex gap-2">
                {(['internal', 'tenant'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setWalkInForm((f) => ({
                      ...f,
                      requestedByType: type,
                      requestedByEmployeeKey: '',
                      requestedByUserId: '',
                      requestedByName: '',
                      requestedByDepartment: '',
                      tenantCompanyId: '',
                      tenantCompanyName: '',
                    }))}
                    className={`flex-1 rounded-xl py-2 text-[12px] font-pmedium border transition-colors ${
                      walkInForm.requestedByType === type ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {type === 'internal' ? 'Internal Employee' : 'Tenant Company'}
                  </button>
                ))}
              </div>

              {walkInForm.requestedByType === 'tenant' && (
                <div>
                  <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-wider">Tenant Company</label>
                  <select
                    value={walkInForm.tenantCompanyId}
                    onChange={(e) => {
                      const selected = tenantCompanies.find((t) => t._id === e.target.value);
                      setWalkInForm((f) => ({
                        ...f,
                        tenantCompanyId: e.target.value,
                        tenantCompanyName: selected?.companyName || '',
                        requestedByDepartment: '',
                        requestedByEmployeeKey: '',
                        requestedByUserId: '',
                        requestedByName: '',
                      }));
                    }}
                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px]"
                    required
                  >
                    <option value="">Select company</option>
                    {tenantCompanies.map((t) => (
                      <option key={t._id} value={t._id}>{t.companyName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-wider">Department</label>
                <select
                  value={walkInForm.requestedByDepartment}
                  onChange={(e) => setWalkInForm((f) => ({ ...f, requestedByDepartment: e.target.value, requestedByEmployeeKey: '', requestedByUserId: '', requestedByName: '' }))}
                  className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px]"
                  disabled={walkInForm.requestedByType === 'tenant' && !walkInForm.tenantCompanyId}
                  required
                >
                  <option value="">
                    {walkInForm.requestedByType === 'tenant'
                      ? (loadingTenantRoster ? 'Loading departments…' : 'Select department')
                      : 'Select department'}
                  </option>
                  {(walkInForm.requestedByType === 'tenant' ? tenantDepartments : internalDepartments.map((d) => d.name)).map((deptName) => (
                    <option key={deptName} value={deptName}>{deptName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-wider">Employee</label>
                <select
                  value={walkInForm.requestedByEmployeeKey}
                  onChange={(e) => {
                    if (walkInForm.requestedByType === 'tenant') {
                      const emp = tenantEmployeeOptions.find((x) => (x.userId || x.id) === e.target.value);
                      setWalkInForm((f) => ({ ...f, requestedByEmployeeKey: e.target.value, requestedByUserId: emp?.userId || '', requestedByName: emp?.name || '' }));
                    } else {
                      const emp = internalEmployeeOptions.find((x) => x.userId === e.target.value);
                      setWalkInForm((f) => ({ ...f, requestedByEmployeeKey: e.target.value, requestedByUserId: emp?.userId || '', requestedByName: emp?.name || '' }));
                    }
                  }}
                  className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px]"
                  disabled={!walkInForm.requestedByDepartment}
                  required
                >
                  <option value="">Select employee</option>
                  {walkInForm.requestedByType === 'tenant'
                    ? tenantEmployeeOptions.map((emp) => (
                      <option key={emp.id} value={emp.userId || emp.id}>{emp.name}</option>
                    ))
                    : internalEmployeeOptions.map((emp) => (
                      <option key={emp.userId} value={emp.userId}>{emp.name}</option>
                    ))}
                </select>
              </div>

              <PrintoutFormFields form={walkInForm} setForm={setWalkInForm as any} />

              <p className="text-[11px] text-slate-400 italic">No document upload here — the requester hands over the physical papers (or a USB copy) at the desk.</p>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#2563EB] text-white rounded-2xl py-2.5 text-[10px] font-pmedium uppercase tracking-widest shadow-sm hover:bg-primary/95 active:scale-95 transition-all disabled:opacity-60"
              >
                {submitting ? 'Logging…' : 'Log Printout Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PrintoutFormFields({ form, setForm }: { form: typeof emptyRequestForm; setForm: (updater: (f: any) => any) => void }) {
  return (
    <>
      <div>
        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-wider">What needs to be printed?</label>
        <input
          value={form.title}
          onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))}
          className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px]"
          placeholder="e.g. Signed offer letter"
          required
        />
      </div>
      <div>
        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-wider">Notes / Instructions</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))}
          className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px] min-h-[70px]"
          placeholder="Anything the front desk should know"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-wider">Copies</label>
          <input
            type="number"
            min={1}
            value={form.copies}
            onChange={(e) => setForm((f: any) => ({ ...f, copies: e.target.value }))}
            className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px]"
          />
        </div>
        <div>
          <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-wider">Priority</label>
          <select
            value={form.priority}
            onChange={(e) => setForm((f: any) => ({ ...f, priority: e.target.value }))}
            className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px]"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-wider">Color</label>
          <select
            value={form.colorMode}
            onChange={(e) => setForm((f: any) => ({ ...f, colorMode: e.target.value }))}
            className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px]"
          >
            <option value="Black & White">Black & White</option>
            <option value="Color">Color</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-wider">Paper Size</label>
          <select
            value={form.paperSize}
            onChange={(e) => setForm((f: any) => ({ ...f, paperSize: e.target.value }))}
            className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px]"
          >
            <option value="A4">A4</option>
            <option value="A3">A3</option>
            <option value="Letter">Letter</option>
            <option value="Legal">Legal</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-[12px] font-pmedium text-slate-600">
        <input
          type="checkbox"
          checked={form.doubleSided}
          onChange={(e) => setForm((f: any) => ({ ...f, doubleSided: e.target.checked }))}
        />
        Double-sided
      </label>
    </>
  );
}
