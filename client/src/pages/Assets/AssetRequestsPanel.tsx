import { useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Plus, X, Check, Ban, PackageCheck, Loader2, Search, Eye } from 'lucide-react';
import { getStoredUser } from '@/lib/auth-session';
import {
  createAssetRequest,
  fulfillAssetRequest,
  getAssetRequests,
  getAssets,
  getDepartments,
  updateAssetRequestStatus,
} from '@/services/assets';
import PageFrame from '../../components/Pages/PageFrame';

interface DepartmentOption { id: string; name: string }
interface RequestRecord {
  id: string;
  requestCode: string;
  assetName: string;
  category: string;
  quantity: number;
  employeeName?: string;
  purpose: string;
  neededBy?: string;
  priority: string;
  status: string;
  requestedBy?: string;
  requestedByUserId?: string;
  requestingDepartmentId: string;
  requestingDepartment?: string;
  owningDepartmentId: string;
  owningDepartment?: string;
  reviewNote?: string;
  fulfilledAsset?: string;
  fulfilledAssetCode?: string;
  createdAt?: string;
}
interface AssetRecord {
  recordId?: string;
  _id?: string;
  id?: string;
  name: string;
  assetCode?: string;
  departmentId?: string;
  availableQuantity?: number;
  department?: string;
}

const roleBandFn = (role: string) => {
  const value = String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (value === 'founder' || value === 'owner') return 'owner';
  if (value === 'super_admin' || value === 'superadmin') return 'super_admin';
  if (value === 'admin' || value === 'admin_manager') return 'admin';
  if (value === 'manager') return 'manager';
  return 'employee';
};

const dateOnly = (value?: string) => String(value || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] || '--';

function displayDate(value?: string): string {
  const raw = dateOnly(value);
  if (!raw || raw === '--') return '--';
  const [year, month, day] = raw.split('-');
  return `${day}/${month}/${year}`;
}

function getStatusBadge(status: string) {
  const base = 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-widest';
  switch (status) {
    case 'Pending': return <span className={`${base} bg-amber-50 text-amber-700 border border-amber-200`}>{status}</span>;
    case 'Approved': return <span className={`${base} bg-blue-50 text-blue-700 border border-blue-200`}>{status}</span>;
    case 'Fulfilled': return <span className={`${base} bg-emerald-50 text-emerald-700 border border-emerald-200`}>{status}</span>;
    case 'Rejected': return <span className={`${base} bg-red-50 text-red-700 border border-red-200`}>{status}</span>;
    case 'Cancelled': return <span className={`${base} bg-slate-100 text-slate-600 border border-slate-200`}>{status}</span>;
    default: return <span className={`${base} bg-slate-50 text-slate-600 border border-slate-200`}>{status}</span>;
  }
}

function RequestsSkeleton() {
  return (
    <div className="space-y-4 w-full animate-pulse">
      <div className="h-8 bg-slate-100 rounded-xl w-1/4" />
      <div className="h-4 bg-slate-100 rounded-xl w-1/2" />
      <div className="grid grid-cols-4 gap-3 mt-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-24 bg-slate-100 rounded-[2rem]" />
        ))}
      </div>
      <div className="h-64 bg-slate-100 rounded-2xl mt-4" />
    </div>
  );
}

export function AssetRequestsPanel({ onShowAssets }: { onShowAssets: () => void }) {
  const user = getStoredUser();
  const band = roleBandFn(user?.workspaceMembership?.role || user?.role || '');
  const isTopManagement = band === 'owner' || band === 'super_admin';
  const canCreateRequest = isTopManagement || band === 'admin' || band === 'manager';
  const currentUserId = String(user?._id || user?.id || '');
  const departmentNameOf = (value: any): string => {
    if (!value) return '';
    return String(typeof value === 'string' ? value : value?.name || '');
  };
  const memberDepartments = [
    ...(Array.isArray(user?.workspaceMembership?.departments) ? user.workspaceMembership.departments : []),
    user?.workspaceMembership?.department,
    ...(Array.isArray(user?.departments) ? user.departments : []),
    user?.department,
  ].map((value) => departmentNameOf(value).trim().toLowerCase()).filter(Boolean);

  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<RequestRecord | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [fulfillmentAssets, setFulfillmentAssets] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    requestingDepartmentId: '', owningDepartmentId: '', assetName: '', category: 'Hardware', quantity: '1',
    employeeName: '', purpose: '', neededBy: '', priority: 'Medium',
  });

  async function loadData() {
    setIsLoading(true);
    try {
      const [requestResponse, departmentResponse, assetResponse] = await Promise.all([
        getAssetRequests(), getDepartments(), getAssets(),
      ]);
      setRequests(requestResponse?.requests || requestResponse?.data?.requests || []);
      const rawDepartments = Array.isArray(departmentResponse) ? departmentResponse : departmentResponse?.departments || departmentResponse?.data || [];
      setDepartments(rawDepartments.map((department: any) => ({ id: String(department.id || department._id || ''), name: String(department.name || '') })).filter((department: DepartmentOption) => department.id && department.name));
      const assetItems = (assetResponse?.assets || assetResponse?.data?.assets || []).map((asset: any) => ({ ...asset, recordId: asset.recordId || asset._id || asset.id }));
      setAssets(assetItems);
      setError('');
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || loadError?.message || 'Unable to load asset requests.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const isHrRequester = memberDepartments.some((department) => ['hr', 'human resources', 'human resource'].includes(department));
  const requestDepartmentOptions = isTopManagement || isHrRequester ? departments : departments.filter((department) =>
    memberDepartments.includes(department.id.toLowerCase()) || memberDepartments.includes(department.name.toLowerCase())
  );
  const owningDepartmentOptions = departments.filter((department) => department.id !== form.requestingDepartmentId);
  const visibleRequests = useMemo(() => requests.filter((request) => {
    const query = searchQuery.trim().toLowerCase();
    return (statusFilter === 'All' || request.status === statusFilter) &&
      (!query || [request.requestCode, request.assetName, request.requestingDepartment, request.owningDepartment, request.requestedBy].some((value) => String(value || '').toLowerCase().includes(query)));
  }), [requests, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => r.status === 'Pending').length,
    approved: requests.filter((r) => r.status === 'Approved').length,
    fulfilled: requests.filter((r) => r.status === 'Fulfilled').length,
  }), [requests]);

  function canReview(request: RequestRecord) {
    return request.status === 'Pending' && (isTopManagement || memberDepartments.includes(request.owningDepartmentId.toLowerCase()) || memberDepartments.includes(String(request.owningDepartment || '').toLowerCase()));
  }
  function availableAssets(request: RequestRecord) {
    return assets.filter((asset) =>
      (String(asset.departmentId || '') === request.owningDepartmentId || String(asset.department || '').toLowerCase() === String(request.owningDepartment || '').toLowerCase()) &&
      Number(asset.availableQuantity || 0) >= request.quantity);
  }

  async function submitRequest(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      await createAssetRequest({ ...form, quantity: Number(form.quantity), neededBy: form.neededBy || null });
      setShowCreate(false);
      setForm({ ...form, requestingDepartmentId: '', owningDepartmentId: '', assetName: '', category: 'Hardware', quantity: '1', employeeName: '', purpose: '', neededBy: '', priority: 'Medium' });
      await loadData();
    } catch (saveError: any) {
      setError(saveError?.response?.data?.message || saveError?.message || 'Unable to raise asset request.');
    } finally { setIsSaving(false); }
  }

  async function updateStatus(request: RequestRecord, status: string) {
    setIsSaving(true); setError('');
    try {
      await updateAssetRequestStatus(request.id, { status, reviewNote: reviewNotes[request.id] || '' });
      await loadData();
      setViewingRequest(null);
    } catch (saveError: any) {
      setError(saveError?.response?.data?.message || saveError?.message || 'Unable to update asset request.');
    } finally { setIsSaving(false); }
  }

  async function fulfill(request: RequestRecord) {
    const assetId = fulfillmentAssets[request.id];
    if (!assetId) return;
    setIsSaving(true); setError('');
    try {
      await fulfillAssetRequest(request.id, assetId);
      await loadData();
      setViewingRequest(null);
    } catch (saveError: any) {
      setError(saveError?.response?.data?.message || saveError?.message || 'Unable to fulfill asset request.');
    } finally { setIsSaving(false); }
  }

  if (isLoading) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-pmedium text-[12px]">
        <PageFrame>
          <RequestsSkeleton />
        </PageFrame>
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-pmedium text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* HEADER */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase">Asset Requests</h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">Request, approve, issue, and track department assets.</p>
            </div>
          </div>

          {/* TAB SWITCHER */}
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            <button type="button" onClick={onShowAssets} className="flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-900">Assets</button>
            <button type="button" className="flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all bg-[#2563EB] text-white shadow-sm">Asset Requests</button>
          </div>

          {/* ERROR */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-pmedium text-red-600">{error}</div>
          )}

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {[
              { key: 'total', label: 'Total Requests', value: stats.total, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', icon: ClipboardList, iconClass: 'bg-slate-50 text-slate-600' },
              { key: 'pending', label: 'Pending', value: stats.pending, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500', icon: ClipboardList, iconClass: 'bg-amber-50 text-amber-600' },
              { key: 'approved', label: 'Approved', value: stats.approved, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500', icon: Check, iconClass: 'bg-blue-50 text-blue-600' },
              { key: 'fulfilled', label: 'Fulfilled', value: stats.fulfilled, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', icon: PackageCheck, iconClass: 'bg-emerald-50 text-emerald-600' },
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
                  <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}><Icon size={16} /></div>
                </div>
              );
            })}
          </div>

          {/* DATA PANEL */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

            {/* Toolbar */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {['All', 'Pending', 'Approved', 'Fulfilled', 'Rejected', 'Cancelled'].map((status) => (
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
                    type="text"
                    placeholder="Search requests..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-500"
                    value={searchQuery}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  />
                </div>
                {canCreateRequest && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap"
                  >
                    <Plus size={13} strokeWidth={3} /> NEW REQUEST
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Table */}
            <div className="overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden bg-white/20">
              <table className="hidden lg:table w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-5 py-4">Request</th>
                    <th className="px-5 py-4">Asset</th>
                    <th className="px-5 py-4">Departments</th>
                    <th className="px-5 py-4">Priority</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {visibleRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-5 py-4">
                        <span className="text-[10px] font-pmedium text-[#2563EB] uppercase tracking-widest mb-1 inline-block">{request.requestCode}</span>
                        <div className="font-pmedium text-[#0F172A] text-[13px]">{request.assetName}</div>
                        <div className="text-[11px] text-slate-500 mt-1">{request.requestedBy || '--'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-[12px] font-pmedium text-slate-700">{request.quantity} unit(s)</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px]">{request.purpose}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-[12px] font-pmedium text-[#0F172A]">{request.requestingDepartment || '--'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">requests from</div>
                        <div className="text-[12px] font-pmedium text-[#2563EB]">{request.owningDepartment || '--'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-pmedium text-slate-700">
                          {request.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(request.status)}</td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => setViewingRequest(request)}
                          className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye size={15} strokeWidth={2.5} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visibleRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <ClipboardList className="text-slate-300" size={28} />
                          </div>
                          <p className="text-slate-500 font-pmedium text-sm">No asset requests found</p>
                          <p className="text-slate-400 text-[11px] max-w-xs">
                            {searchQuery || statusFilter !== 'All'
                              ? 'Try adjusting your filters or search query.'
                              : 'Click "NEW REQUEST" to create your first request.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="flex flex-col gap-3 lg:hidden p-3 sm:p-4 bg-slate-50/30">
                {visibleRequests.map((request) => (
                  <div key={request.id} className="bg-white border border-slate-200/60 shadow-sm rounded-[20px] p-4 sm:p-5 flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 flex flex-col gap-1.5">
                        <span className="text-[10px] font-pmedium text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded w-max border border-blue-100">{request.requestCode}</span>
                        <h3 className="font-pmedium text-[#0F172A] text-[13px] sm:text-[14px]">{request.assetName}</h3>
                        <p className="text-[12px] text-slate-500 font-pmedium">{request.quantity} unit(s)</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">{getStatusBadge(request.status)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-1">
                      <div>
                        <span className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest block mb-0.5">Requesting Dept</span>
                        <span className="text-[11px] font-pmedium text-[#0F172A] truncate block">{request.requestingDepartment || '--'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest block mb-0.5">Owning Dept</span>
                        <span className="text-[11px] font-pmedium text-[#2563EB] truncate block">{request.owningDepartment || '--'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span>{request.requestedBy || '--'}</span>
                      <span>{request.priority}</span>
                      <span>{displayDate(request.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 border-t border-slate-100/60 pt-3">
                      <button
                        onClick={() => setViewingRequest(request)}
                        className="flex-1 justify-center px-3 py-2 bg-white border border-slate-200 text-[#2563EB] rounded-xl font-pmedium text-[10px] uppercase shadow-sm hover:shadow-md hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center gap-1.5"
                      >
                        <Eye size={14} /> View
                      </button>
                    </div>
                  </div>
                ))}
                {visibleRequests.length === 0 && (
                  <div className="p-10 text-center text-slate-500 font-pmedium bg-white rounded-[20px] border border-slate-200/60 shadow-sm">
                    <ClipboardList size={24} className="mx-auto text-slate-300 mb-2" />
                    <p>No asset requests found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Click "NEW REQUEST" to get started.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-3 sm:px-5 py-3 border-t border-slate-100/60 text-[10px] font-pmedium text-slate-400">
              Showing {visibleRequests.length} of {requests.length} requests
            </div>
          </div>
        </div>
      </PageFrame>

      {/* VIEW DETAIL MODAL */}
      <AnimatePresence>
        {viewingRequest && (
          <motion.div
            key="detail-modal"
            className="fixed inset-0 z-[170] flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div
              className="relative w-full sm:max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl max-h-[85vh] flex flex-col overflow-hidden border border-white/70"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-5 shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-pmedium text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{viewingRequest.requestCode}</span>
                    {getStatusBadge(viewingRequest.status)}
                  </div>
                  <h2 className="text-xl font-pmedium text-primary tracking-tight">{viewingRequest.assetName}</h2>
                  <p className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Asset Request · {viewingRequest.quantity} unit(s)</p>
                </div>
                <button type="button" onClick={() => setViewingRequest(null)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500 mb-1">Requesting Department</p>
                    <p className="font-bold text-slate-900">{viewingRequest.requestingDepartment || '--'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500 mb-1">Owning Department</p>
                    <p className="font-bold text-[#2563EB]">{viewingRequest.owningDepartment || '--'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500 mb-1">Requested By</p>
                    <p className="font-bold text-slate-900">{viewingRequest.requestedBy || '--'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500 mb-1">Priority</p>
                    <p className="font-bold text-slate-900">{viewingRequest.priority}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500 mb-1">Needed By</p>
                    <p className="font-bold text-slate-900">{displayDate(viewingRequest.neededBy)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500 mb-1">Created</p>
                    <p className="font-bold text-slate-900">{displayDate(viewingRequest.createdAt)}</p>
                  </div>
                </div>

                {viewingRequest.employeeName && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500 mb-1">For Employee</p>
                    <p className="font-bold text-slate-900">{viewingRequest.employeeName}</p>
                  </div>
                )}

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500 mb-1">Purpose</p>
                  <p className="text-sm text-slate-700">{viewingRequest.purpose}</p>
                </div>

                {viewingRequest.reviewNote && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-blue-600 mb-1">Review Note</p>
                    <p className="text-sm text-blue-800">{viewingRequest.reviewNote}</p>
                  </div>
                )}

                {viewingRequest.status === 'Fulfilled' && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-emerald-600 mb-1">Fulfilled From</p>
                    <p className="text-sm text-emerald-800">{viewingRequest.fulfilledAsset || 'asset'} {viewingRequest.fulfilledAssetCode ? `(${viewingRequest.fulfilledAssetCode})` : ''}</p>
                  </div>
                )}

                {/* Review Actions */}
                {canReview(viewingRequest) && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Review Action</p>
                    <input
                      value={reviewNotes[viewingRequest.id] || ''}
                      onChange={(e) => setReviewNotes((current) => ({ ...current, [viewingRequest.id]: e.target.value }))}
                      placeholder="Review note (optional)"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[12px] font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                    <div className="flex gap-2">
                      <button disabled={isSaving} onClick={() => updateStatus(viewingRequest, 'Approved')} className="flex-1 rounded-xl bg-blue-600 px-3 py-2.5 text-[10px] font-pmedium uppercase text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60">
                        <Check size={13} /> Approve
                      </button>
                      <button disabled={isSaving} onClick={() => updateStatus(viewingRequest, 'Rejected')} className="flex-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[10px] font-pmedium uppercase text-red-700 hover:bg-red-100 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60">
                        <Ban size={13} /> Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Fulfillment Actions */}
                {isTopManagement && viewingRequest.status === 'Approved' && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Fulfill Request</p>
                    <select
                      value={fulfillmentAssets[viewingRequest.id] || ''}
                      onChange={(e) => setFulfillmentAssets((current) => ({ ...current, [viewingRequest.id]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[12px] font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    >
                      <option value="">Select available asset</option>
                      {availableAssets(viewingRequest).map((asset) => (
                        <option key={asset.recordId} value={asset.recordId}>{asset.name} ({asset.assetCode || asset.id}) / {asset.availableQuantity} available</option>
                      ))}
                    </select>
                    <button disabled={isSaving || !fulfillmentAssets[viewingRequest.id]} onClick={() => fulfill(viewingRequest)} className="w-full rounded-xl bg-emerald-600 px-3 py-2.5 text-[10px] font-pmedium uppercase text-white hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                      <PackageCheck size={13} /> Fulfill & Transfer
                    </button>
                  </div>
                )}

                {/* Cancel Action */}
                {viewingRequest.status === 'Pending' && (isTopManagement || viewingRequest.requestedByUserId === currentUserId) && (
                  <div className="pt-2">
                    <button disabled={isSaving} onClick={() => updateStatus(viewingRequest, 'Cancelled')} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[10px] font-pmedium uppercase text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-60">
                      Cancel Request
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewingRequest(null)}
                  className="px-4 py-2 text-xs font-pmedium uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            key="create-modal"
            className="fixed inset-0 z-[170] flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div
              className="relative w-full sm:max-w-2xl bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-white/70"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
              <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-pmedium text-slate-900">New Asset Request</h3>
                    <p className="text-[12px] text-slate-500">Request an asset for your department.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowCreate(false)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={submitRequest} className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 [&::-webkit-scrollbar]:hidden bg-slate-50/30">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                  <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                    <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><ClipboardList size={16} /></span>
                    <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Request Details</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Requesting Department <span className="text-red-400">*</span></label>
                      <select required value={form.requestingDepartmentId} onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm((current) => ({ ...current, requestingDepartmentId: e.target.value, owningDepartmentId: current.owningDepartmentId === e.target.value ? '' : current.owningDepartmentId }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer">
                        <option value="">Select department</option>
                        {requestDepartmentOptions.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Owning Department <span className="text-red-400">*</span></label>
                      <select required value={form.owningDepartmentId} onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm((current) => ({ ...current, owningDepartmentId: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer">
                        <option value="">Select department</option>
                        {owningDepartmentOptions.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Category</label>
                      <select value={form.category} onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm((current) => ({ ...current, category: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer">
                        {['Hardware', 'Infrastructure', 'Software', 'Furniture', 'Other'].map((category) => <option key={category}>{category}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Asset Required <span className="text-red-400">*</span></label>
                      <input required value={form.assetName} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, assetName: e.target.value }))} placeholder="e.g. Laptop, Printer Paper" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-500" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Quantity <span className="text-red-400">*</span></label>
                      <input required type="number" min={1} value={form.quantity} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, quantity: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">For Employee</label>
                      <input value={form.employeeName} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, employeeName: e.target.value }))} placeholder="Optional onboarding name" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-500" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Needed By</label>
                      <input type="date" value={form.neededBy} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, neededBy: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Priority</label>
                      <select value={form.priority} onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm((current) => ({ ...current, priority: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer">
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Purpose <span className="text-red-400">*</span></label>
                      <textarea required minLength={5} rows={3} value={form.purpose} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm((current) => ({ ...current, purpose: e.target.value }))} placeholder="Onboarding, replacement, project requirement..." className="w-full resize-none px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-500" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 sm:pt-6 flex gap-3 border-t border-slate-200/60 flex-col-reverse sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setShowCreate(false)} disabled={isSaving} className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase disabled:opacity-50">CANCEL</button>
                  <button type="submit" disabled={isSaving} className="w-full sm:w-auto px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-blue-700 active:scale-95 transition-all uppercase flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70">
                    {isSaving ? <><Loader2 size={13} className="animate-spin" /> SUBMITTING...</> : <>SUBMIT REQUEST <Plus size={13} strokeWidth={3} /></>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
