import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Printer, Plus, X, Paperclip, Clock, Search, Pencil, Eye, XCircle as CancelIcon,
  ListChecks, Hourglass, XCircle, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import PageFrame from '@/components/Pages/PageFrame';
import AttachmentDropzone from '@/components/AttachmentDropzone';
import { CardsGridSkeleton } from '@/components/ui/Skeleton';
import { statusPillClass } from '@/lib/status-pill';
import humanDate from '@/utils/humanDateForamt';
import { createPrintoutRequest, getPrintoutRequests, updatePrintoutRequest } from '@/services/printouts';

const DOCUMENT_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'text/csv', 'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Completed', 'Rejected', 'Cancelled'];
const REFRESH_INTERVAL_MS = 15000;

interface PrintoutRequestRecord {
  _id: string;
  requestCode: string;
  title: string;
  notes?: string;
  copies: number;
  colorMode?: string;
  paperSize?: string;
  doubleSided?: boolean;
  priority: 'Low' | 'Medium' | 'High';
  status: string;
  requestedByName: string;
  printedByName?: string;
  rejectionReason?: string;
  attachments?: { id: string; url: string; name: string }[];
  createdAt: string;
}

const emptyForm = {
  title: '',
  notes: '',
  copies: '1',
  colorMode: 'Black & White',
  paperSize: 'A4',
  doubleSided: false,
  priority: 'Medium',
};

export default function TenantPrintoutsPage() {
  const [requests, setRequests] = useState<PrintoutRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [showNewRequest, setShowNewRequest] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [viewingRequest, setViewingRequest] = useState<PrintoutRequestRecord | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PrintoutRequestRecord | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadRequests = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getPrintoutRequests({ includeCancelled: 'true' });
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (!silent) toast.error(err?.response?.data?.message || 'Failed to load printout requests');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // Keep this list current with what Administration is doing to it (accept/
    // reject/complete) without requiring a manual page refresh.
    const interval = setInterval(() => loadRequests(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => r.status === 'Pending').length,
    inProgress: requests.filter((r) => r.status === 'In Progress').length,
    completed: requests.filter((r) => r.status === 'Completed').length,
    rejected: requests.filter((r) => r.status === 'Rejected').length,
  }), [requests]);

  const displayedRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((r) => {
      const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchesSearch = !q || r.title.toLowerCase().includes(q) || r.requestCode.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, searchQuery]);

  const closeRequestModal = () => {
    setShowNewRequest(false);
    setEditingRequestId(null);
    setForm(emptyForm);
    setFiles([]);
    setFileError('');
  };

  const openEditModal = (request: PrintoutRequestRecord) => {
    setEditingRequestId(request._id);
    setForm({
      title: request.title,
      notes: request.notes || '',
      copies: String(request.copies || 1),
      colorMode: request.colorMode || 'Black & White',
      paperSize: request.paperSize || 'A4',
      doubleSided: Boolean(request.doubleSided),
      priority: request.priority || 'Medium',
    });
    setShowNewRequest(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Please describe what needs to be printed');
      return;
    }
    setSubmitting(true);
    try {
      if (editingRequestId) {
        await updatePrintoutRequest(editingRequestId, {
          title: form.title.trim(),
          notes: form.notes.trim(),
          copies: form.copies,
          colorMode: form.colorMode,
          paperSize: form.paperSize,
          doubleSided: form.doubleSided,
          priority: form.priority,
        });
        toast.success('Printout request updated');
      } else {
        await createPrintoutRequest(
          {
            title: form.title.trim(),
            notes: form.notes.trim(),
            copies: form.copies,
            colorMode: form.colorMode,
            paperSize: form.paperSize,
            doubleSided: form.doubleSided,
            priority: form.priority,
          },
          files,
        );
        toast.success('Printout request submitted to the front desk');
      }
      closeRequestModal();
      loadRequests();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await updatePrintoutRequest(cancelTarget._id, { status: 'Cancelled' });
      toast.success('Request cancelled');
      setCancelTarget(null);
      loadRequests();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel request');
    } finally {
      setCancelling(false);
    }
  };

  const renderAttachments = (attachments?: { id: string; url: string; name: string }[]) => {
    if (!attachments || attachments.length === 0) return <span className="text-slate-400 font-pmedium">—</span>;
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

  const statCards = [
    { key: 'total', label: 'Total', value: stats.total, icon: ListChecks, iconClass: 'bg-slate-50 text-slate-600', labelClass: 'text-slate-400', borderClass: '' },
    { key: 'pending', label: 'Pending', value: stats.pending, icon: Hourglass, iconClass: 'bg-amber-50 text-amber-600', labelClass: 'text-amber-600', borderClass: 'border-l-4 border-l-amber-500' },
    { key: 'inProgress', label: 'In Progress', value: stats.inProgress, icon: Printer, iconClass: 'bg-blue-50 text-blue-600', labelClass: 'text-blue-600', borderClass: 'border-l-4 border-l-blue-500' },
    { key: 'rejected', label: 'Rejected', value: stats.rejected, icon: XCircle, iconClass: 'bg-rose-50 text-rose-600', labelClass: 'text-rose-600', borderClass: 'border-l-4 border-l-rose-500' },
    { key: 'completed', label: 'Completed', value: stats.completed, icon: CheckCircle2, iconClass: 'bg-emerald-50 text-emerald-600', labelClass: 'text-emerald-600', borderClass: 'border-l-4 border-l-emerald-500' },
  ];

  const statusFootnote = (request: PrintoutRequestRecord) => {
    if (request.status === 'Completed' && request.printedByName) {
      return <p className="text-[10px] font-pmedium text-slate-400 mt-0.5">Printed by {request.printedByName}</p>;
    }
    if (request.status === 'Rejected' && request.rejectionReason) {
      return <p className="text-[10px] font-pmedium text-slate-400 mt-0.5">{request.rejectionReason}</p>;
    }
    return null;
  };

  const rowActions = (request: PrintoutRequestRecord) => (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setViewingRequest(request)}
        className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
        title="View"
      >
        <Eye size={15} strokeWidth={2.5} />
      </button>
      {request.status === 'Pending' && (
        <>
          <button
            onClick={() => openEditModal(request)}
            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700 rounded-lg transition-all"
            title="Edit"
          >
            <Pencil size={15} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setCancelTarget(request)}
            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-all"
            title="Cancel"
          >
            <CancelIcon size={15} strokeWidth={2.5} />
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* HEADER */}
          <div className="mb-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-title font-pmedium text-primary uppercase">Printouts</h1>
                <p className="text-xs font-pmedium text-slate-500 mt-1">Send a document to the front desk to get it printed.</p>
              </div>
            </div>
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
                    placeholder="Search by title or code..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => setShowNewRequest(true)}
                  className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                >
                  <Plus size={13} strokeWidth={3} /> NEW REQUEST
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
                      <th className="px-4 py-3">Print ID</th>
                      <th className="px-4 py-3">Request</th>
                      <th className="px-4 py-3">Copies</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Attachments</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Submitted</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedRequests.map((request) => (
                      <tr key={request._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-[12px] font-pmedium text-slate-500">{request.requestCode}</td>
                        <td className="px-4 py-3 text-[12px] font-pmedium text-[#0F172A]">{request.title}</td>
                        <td className="px-4 py-3 text-[12px] font-pmedium text-slate-700">{request.copies}</td>
                        <td className="px-4 py-3 text-[12px] font-pmedium text-slate-700">{request.priority}</td>
                        <td className="px-4 py-3">{renderAttachments(request.attachments)}</td>
                        <td className="px-4 py-3">
                          <span className={statusPillClass(request.status)}>{request.status}</span>
                          {statusFootnote(request)}
                        </td>
                        <td className="px-4 py-3 text-[11px] font-pmedium text-slate-500">
                          <span className="flex items-center gap-1"><Clock size={11} className="text-slate-400" /> {humanDate(request.createdAt)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end">{rowActions(request)}</div>
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
                          <h3 className="font-pmedium text-[#0F172A] text-[13px] sm:text-[14px] truncate">{request.title}</h3>
                          <p className="text-[10px] font-pmedium text-slate-400">{request.requestCode}</p>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className={statusPillClass(request.status)}>{request.status}</span>
                          {statusFootnote(request)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-pmedium tracking-widest block">Copies</span>
                          <span className="text-[11px] font-pmedium text-[#0F172A] block">{request.copies}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-pmedium tracking-widest block">Priority</span>
                          <span className="text-[11px] font-pmedium text-[#0F172A] block">{request.priority}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[9px] text-slate-400 uppercase font-pmedium tracking-widest block">Attachments</span>
                          {renderAttachments(request.attachments)}
                        </div>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100/60 pt-3">
                        <span className="font-pmedium text-slate-500 text-[11px] flex items-center gap-1.5"><Clock size={12} /> {humanDate(request.createdAt)}</span>
                        {rowActions(request)}
                      </div>
                    </div>
                  ))}
                </div>

                {displayedRequests.length === 0 && (
                  <div className="text-center py-20 text-slate-400 font-pmedium">
                    No printout requests found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </PageFrame>

      {/* NEW / EDIT REQUEST MODAL */}
      {showNewRequest && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={closeRequestModal}>
          <div className="bg-white rounded-[2rem] max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                  <Printer size={16} />
                </div>
                <h2 className="text-base font-pmedium text-slate-800">{editingRequestId ? 'Edit Printout Request' : 'New Printout Request'}</h2>
              </div>
              <button onClick={closeRequestModal} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700"><X size={16} /></button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-wider">What needs to be printed?</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px] font-pmedium"
                  placeholder="e.g. Signed contract"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-wider">Notes / Instructions</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px] font-pmedium min-h-[70px]"
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
                    onChange={(e) => setForm((f) => ({ ...f, copies: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px] font-pmedium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-wider">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px] font-pmedium"
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
                    onChange={(e) => setForm((f) => ({ ...f, colorMode: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px] font-pmedium"
                  >
                    <option value="Black & White">Black & White</option>
                    <option value="Color">Color</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-wider">Paper Size</label>
                  <select
                    value={form.paperSize}
                    onChange={(e) => setForm((f) => ({ ...f, paperSize: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px] font-pmedium"
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
                  onChange={(e) => setForm((f) => ({ ...f, doubleSided: e.target.checked }))}
                />
                Double-sided
              </label>
              {editingRequestId ? (
                <p className="text-[11px] font-pmedium text-slate-400 italic">Attachments can't be changed here — cancel and resubmit if you need to swap the document.</p>
              ) : (
                <AttachmentDropzone
                  files={files}
                  onFilesChange={setFiles}
                  error={fileError}
                  onErrorChange={setFileError}
                  allowedTypes={DOCUMENT_TYPES}
                  maxFiles={5}
                  maxSizeMB={20}
                  label="Document(s) to print"
                  helperText="PDF, Word, Excel, PowerPoint, or images — up to 20MB each, max 5 files"
                />
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#2563EB] text-white rounded-2xl py-2.5 text-[10px] font-pmedium uppercase tracking-widest shadow-sm hover:bg-primary/95 active:scale-95 transition-all disabled:opacity-60"
              >
                {submitting ? 'Saving…' : editingRequestId ? 'Save Changes' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewingRequest && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => setViewingRequest(null)}>
          <div className="bg-white rounded-[2rem] max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                  <Eye size={16} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-pmedium text-slate-800 truncate">{viewingRequest.title}</h2>
                  <p className="text-[11px] font-pmedium text-slate-500">{viewingRequest.requestCode}</p>
                </div>
              </div>
              <button onClick={() => setViewingRequest(null)} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 shrink-0"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <span className={statusPillClass(viewingRequest.status)}>{viewingRequest.status}</span>
                {statusFootnote(viewingRequest)}
              </div>
              <div className="grid grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Copies</p>
                  <p className="text-[12px] font-pmedium text-slate-900">{viewingRequest.copies}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Priority</p>
                  <p className="text-[12px] font-pmedium text-slate-900">{viewingRequest.priority}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Color</p>
                  <p className="text-[12px] font-pmedium text-slate-900">{viewingRequest.colorMode || '—'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Paper Size</p>
                  <p className="text-[12px] font-pmedium text-slate-900">{viewingRequest.paperSize || '—'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Double-sided</p>
                  <p className="text-[12px] font-pmedium text-slate-900">{viewingRequest.doubleSided ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Submitted</p>
                  <p className="text-[12px] font-pmedium text-slate-900">{humanDate(viewingRequest.createdAt)}</p>
                </div>
              </div>
              {viewingRequest.notes ? (
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1.5">Notes / Instructions</p>
                  <p className="text-[12px] font-pmedium text-slate-900 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">{viewingRequest.notes}</p>
                </div>
              ) : null}
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1.5">Attachments</p>
                {renderAttachments(viewingRequest.attachments)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRM MODAL */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => !cancelling && setCancelTarget(null)}>
          <div className="bg-white rounded-[2rem] max-w-sm w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h2 className="text-[15px] font-pmedium text-slate-800">Cancel this request?</h2>
                <p className="text-[12px] font-pmedium text-slate-500 mt-1.5 leading-relaxed">
                  <span className="font-pmedium text-slate-700">{cancelTarget.title}</span> ({cancelTarget.requestCode}) will be cancelled and removed from Administration's queue. This can't be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 border-t border-slate-100 bg-slate-50/50 p-4">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="flex-1 rounded-2xl bg-white border border-slate-200 py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-60"
              >
                Keep Request
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelling}
                className="flex-1 rounded-2xl bg-rose-600 py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-white hover:bg-rose-700 transition-all disabled:opacity-60"
              >
                {cancelling ? 'Cancelling…' : 'Cancel Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
