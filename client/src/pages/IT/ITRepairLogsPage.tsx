import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Plus,
  Search,
  X,
  AlertCircle,
  Monitor,
  FileText,
  Loader2,
} from "lucide-react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../../hooks/useAuth";
import {
  getRepairLogs,
  createRepairLog,
  updateRepairLog,
  getRepairLogOptions,
} from "../../services/repair-logs";

const IT_ISSUE_TYPES = ["Hardware", "Software", "Network", "Peripheral", "Infrastructure", "Security", "Other"];

function formatDate(dateStr?: string) {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function getStatusBadge(status?: string) {
  const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest";
  switch (status) {
    case "Open":
      return <span className={`${base} bg-amber-50 text-amber-700`}><AlertCircle className="w-3 h-3" />Open</span>;
    case "In Progress":
      return <span className={`${base} bg-blue-50 text-blue-700`}><Clock3 className="w-3 h-3" />In Progress</span>;
    case "Resolved":
      return <span className={`${base} bg-emerald-50 text-emerald-700`}><CheckCircle2 className="w-3 h-3" />Resolved</span>;
    case "Closed":
      return <span className={`${base} bg-slate-100 text-slate-600`}><CheckCircle2 className="w-3 h-3" />Closed</span>;
    default:
      return <span className={`${base} bg-slate-50 text-slate-600`}>{status || "--"}</span>;
  }
}

type RepairLog = {
  _id?: string;
  repairLogCode?: string;
  assetId?: string;
  assetCode?: string;
  assetName?: string;
  issueType?: string;
  issueDescription?: string;
  assignedTo?: string;
  requestedBy?: string;
  status?: string;
  notes?: string;
  resolutionNote?: string;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
};

const initialForm = { assetId: "", assetName: "", assetCode: "", issueType: "", issueDescription: "", assignedTo: "", requestedBy: "", notes: "" };

export default function ITRepairLogsPage() {
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const currentUser: any = auth?.user;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<RepairLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [activeTab, setActiveTab] = useState<"active" | "my-work" | "history">("active");

  const [selectedLog, setSelectedLog] = useState<RepairLog | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<RepairLog | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<string, string>>>({});
  const [formOptions, setFormOptions] = useState<{ assets: any[]; members: any[] }>({ assets: [], members: [] });
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getRepairLogs({ limit: 200 });
        if (!active) return;
        setLogs(Array.isArray(data?.repairLogs ?? data) ? (data?.repairLogs ?? data) : []);
      } catch (e: any) {
        if (!active) return;
        setError(e?.response?.data?.message || e?.message || "Failed to load IT repair logs");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesSearch = !q || [log.repairLogCode, log.assetName, log.assetCode, log.issueType, log.issueDescription, log.assignedTo].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      const matchesStatus = statusFilter === "All Statuses" || log.status === statusFilter;

      if (activeTab === "my-work") {
        return matchesSearch && matchesStatus && (log.assignedTo === currentUser?.firstName + " " + currentUser?.lastName || log.assignedTo === currentUser?.email || log.assignedTo === currentUser?.name);
      }
      if (activeTab === "history") {
        return matchesSearch && matchesStatus && (log.status === "Resolved" || log.status === "Closed");
      }
      return matchesSearch && matchesStatus && log.status !== "Resolved" && log.status !== "Closed";
    });
  }, [activeTab, statusFilter, searchQuery, logs, currentUser]);

  const stats = useMemo(() => {
    const total = logs.length;
    const open = logs.filter((l) => l.status === "Open").length;
    const active = logs.filter((l) => l.status === "In Progress").length;
    const done = logs.filter((l) => l.status === "Resolved" || l.status === "Closed").length;
    return { total, open, active, done };
  }, [logs]);

  const refreshLogs = async () => {
    try {
      const data = await getRepairLogs({ limit: 200 });
      setLogs(Array.isArray(data?.repairLogs ?? data) ? (data?.repairLogs ?? data) : []);
    } catch { /* ignore */ }
  };

  const handleOpenCreate = async () => {
    setShowCreate(true);
    setForm(initialForm);
    setFormErrors({});
    setLoadingOptions(true);
    const opts = await getRepairLogOptions();
    setFormOptions(opts);
    setLoadingOptions(false);
  };

  const validate = () => {
    const e: Partial<Record<string, string>> = {};
    if (!form.assetId) e.assetId = "Required";
    if (!form.issueType) e.issueType = "Required";
    if (!form.issueDescription.trim()) e.issueDescription = "Required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    try {
      const selectedAsset = formOptions.assets.find((a) => a._id === form.assetId);
      const assignedTo = form.assignedTo || `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() || "IT Staff";
      await createRepairLog({
        ...form,
        assignedTo,
        assetName: selectedAsset?.assetName || selectedAsset?.name || form.assetName || "",
        assetCode: selectedAsset?.assetCode || selectedAsset?.code || form.assetCode || "",
        requestedBy: `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() || "IT Staff",
      });
      toast.success("IT repair log created");
      setShowCreate(false);
      await refreshLogs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async (log: RepairLog, newStatus: string) => {
    const id = log._id;
    if (!id) return;
    setIsUpdating(true);
    try {
      await updateRepairLog(id, { status: newStatus, resolutionNote: newStatus === "Resolved" ? `Resolved by ${currentUser?.firstName || "System"}` : undefined });
      toast.success(`Status updated to ${newStatus}`);
      await refreshLogs();
      setSelectedSchedule(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update");
    } finally {
      setIsUpdating(false);
    }
  };

  const viewLog = (log: RepairLog) => {
    setSelectedLog(log);
    setSelectedSchedule(log);
  };

  const nextAction = (status?: string) => {
    if (status === "Open") return { label: "Start Work", next: "In Progress" };
    if (status === "In Progress") return { label: "Mark Resolved", next: "Resolved" };
    if (status === "Resolved") return { label: "Close Log", next: "Closed" };
    return null;
  };

  if (loading) {
    return (
      <div className="w-full animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-lg mb-2" />
        <div className="h-4 w-96 bg-slate-100 rounded mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-slate-50 rounded-lg mb-2" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A]">IT Repair Logs</h1>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">
            <Monitor className="w-3.5 h-3.5 inline mr-1" />
            Track network, device, and system repairs for IT
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Log IT Repair
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2 text-sm font-bold text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-2xl font-black">{stats.total}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Total Logs</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-2xl font-black text-amber-600">{stats.open}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mt-1">Open</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <p className="text-2xl font-black text-blue-600">{stats.active}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mt-1">In Progress</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-2xl font-black text-emerald-600">{stats.done}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mt-1">Resolved / Closed</p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex gap-2">
            {(["active", "my-work", "history"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
                  activeTab === tab
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {tab === "active" ? "Active Logs" : tab === "my-work" ? "My Work" : "History"}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <select
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All Statuses</option>
              <option>Open</option>
              <option>In Progress</option>
              <option>Resolved</option>
              <option>Closed</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-6 py-4">Log & Asset</th>
                <th className="px-6 py-4">Issue Type</th>
                <th className="px-6 py-4">Assigned To</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400 font-bold">No repair logs found.</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log._id || log.repairLogCode} className="hover:bg-blue-50/30 transition-all">
                    <td className="px-6 py-4">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">{log.repairLogCode || "--"}</p>
                      <p className="font-bold text-slate-900 text-sm">{log.assetName || "--"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700">
                        {log.issueType || "--"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-800">{log.assignedTo || "Unassigned"}</p>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-500">{formatDate(log.createdAt)}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => viewLog(log)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 text-[10px] font-bold text-slate-400">
          Showing {filteredLogs.length} of {logs.length} logs
        </div>
      </div>

      {/* ─── View Detail Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedSchedule ? (
          <motion.div
            key="detail-modal"
            className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setSelectedSchedule(null); setSelectedLog(null); }} />
            <motion.div
              className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white flex-shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">{selectedSchedule.repairLogCode || "Log Detail"}</span>
                </div>
                <button type="button" onClick={() => { setSelectedSchedule(null); setSelectedLog(null); }} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Asset</p>
                    <p className="font-bold text-slate-900">{selectedSchedule.assetName || "--"}</p>
                    <p className="text-[10px] text-slate-500">{selectedSchedule.assetCode || ""}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Issue Type</p>
                    <p className="font-bold text-slate-900">{selectedSchedule.issueType || "--"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Assigned To</p>
                    <p className="font-bold text-slate-900">{selectedSchedule.assignedTo || "Unassigned"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedSchedule.status)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Created</p>
                    <p className="font-bold text-slate-900">{formatDate(selectedSchedule.createdAt)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Requested By</p>
                    <p className="font-bold text-slate-900">{selectedSchedule.requestedBy || "--"}</p>
                  </div>
                </div>

                {selectedSchedule.issueDescription ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Issue Description</p>
                    <p className="text-sm text-slate-700">{selectedSchedule.issueDescription}</p>
                  </div>
                ) : null}

                {selectedSchedule.resolutionNote ? (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Resolution Note</p>
                    <p className="text-sm text-emerald-800">{selectedSchedule.resolutionNote}</p>
                  </div>
                ) : null}

                {selectedSchedule.notes ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Notes</p>
                    <p className="text-sm text-slate-700">{selectedSchedule.notes}</p>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => { setSelectedSchedule(null); setSelectedLog(null); }}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Close
                </button>
                {nextAction(selectedSchedule.status) ? (
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(selectedSchedule, nextAction(selectedSchedule.status)!.next)}
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {isUpdating ? "Updating..." : nextAction(selectedSchedule.status)!.label}
                  </button>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ─── Create Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate ? (
          <motion.div
            key="create-modal"
            className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
            <motion.div
              className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">Log IT Repair</span>
                </div>
                <button type="button" onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingOptions ? (
                <div className="flex-1 flex items-center justify-center p-12">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-4">
                  {Object.keys(formErrors).length > 0 ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">Please fill in all required fields.</div>
                  ) : null}

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Asset *</label>
                    <select
                      className={`w-full px-4 py-2.5 bg-white border rounded-xl text-xs font-bold text-slate-700 outline-none ${formErrors.assetId ? "border-rose-300" : "border-slate-200"}`}
                      value={form.assetId}
                      onChange={(e) => {
                        const asset = formOptions.assets.find((a: any) => a._id === e.target.value);
                        setForm({ ...form, assetId: e.target.value, assetName: asset?.assetName || asset?.name || "", assetCode: asset?.assetCode || asset?.code || "" });
                        if (formErrors.assetId) setFormErrors({ ...formErrors, assetId: undefined });
                      }}
                    >
                      <option value="">Select asset...</option>
                      {formOptions.assets.map((a: any) => (
                        <option key={a._id} value={a._id}>{a.assetName || a.name || a.assetCode || a.code}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Issue Type *</label>
                    <select
                      className={`w-full px-4 py-2.5 bg-white border rounded-xl text-xs font-bold text-slate-700 outline-none ${formErrors.issueType ? "border-rose-300" : "border-slate-200"}`}
                      value={form.issueType}
                      onChange={(e) => { setForm({ ...form, issueType: e.target.value }); if (formErrors.issueType) setFormErrors({ ...formErrors, issueType: undefined }); }}
                    >
                      <option value="">Select issue type...</option>
                      {IT_ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Issue Description *</label>
                    <textarea
                      className={`w-full px-4 py-2.5 bg-white border rounded-xl text-xs font-bold text-slate-700 outline-none resize-none ${formErrors.issueDescription ? "border-rose-300" : "border-slate-200"}`}
                      rows={3}
                      placeholder="Describe the issue..."
                      value={form.issueDescription}
                      onChange={(e) => { setForm({ ...form, issueDescription: e.target.value }); if (formErrors.issueDescription) setFormErrors({ ...formErrors, issueDescription: undefined }); }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Assigned To</label>
                    <select
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                      value={form.assignedTo}
                      onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                    >
                      <option value="">Self (assign to me)</option>
                      {formOptions.members.map((m: any) => (
                        <option key={m._id} value={`${m.firstName || ""} ${m.lastName || ""}`.trim()}>
                          {m.firstName || ""} {m.lastName || ""} {m.email ? `(${m.email})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Notes</label>
                    <textarea
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none resize-none"
                      rows={2}
                      placeholder="Optional notes..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
                    <button type="submit" disabled={isSaving} className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      {isSaving ? "Creating..." : "Create Log"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
