import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Plus,
  Search,
  X,
  AlertCircle,
  Wrench,
  User,
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
import PageFrame from "../../components/Pages/PageFrame";

type RepairLog = {
  _id: string;
  repairLogNumber: number;
  repairLogCode: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  issueType: string;
  issueDescription: string;
  assignedTo: string;
  assigneeUserId?: string;
  requestedBy: string;
  requestedByUserId?: string;
  sourceTicketCode?: string;
  sourceTicketTitle?: string;
  notes?: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  assetId: string;
  assetCode: string;
  assetName: string;
  issueType: string;
  issueDescription: string;
  assignedTo: string;
  notes: string;
};

type AssetOption = {
  _id: string;
  name: string;
  assetCode: string;
  department?: string;
};

type MemberOption = {
  id: string;
  userId: string;
  name: string;
  departmentNames: string[];
};

const ISSUE_TYPES = ["Electrical", "Mechanical", "Plumbing", "Furniture", "HVAC", "Housekeeping", "Other"];

const initialForm: FormState = {
  assetId: "",
  assetCode: "",
  assetName: "",
  issueType: "Electrical",
  issueDescription: "",
  assignedTo: "",
  notes: "",
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const isDone = status === "Resolved" || status === "Closed";
  const isActive = status === "In Progress";
  const base =
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-pbold font-bold uppercase tracking-widest";

  if (isDone)
    return (
      <span className={`${base} border border-emerald-200 bg-emerald-50 text-emerald-700`}>
        <CheckCircle2 size={12} /> {status}
      </span>
    );
  if (isActive)
    return (
      <span className={`${base} border border-blue-200 bg-blue-50 text-blue-700`}>
        <Clock3 size={12} /> {status}
      </span>
    );
  return (
    <span className={`${base} border border-amber-200 bg-amber-50 text-amber-700`}>
      <AlertCircle size={12} /> {status}
    </span>
  );
}

function matchesSearch(log: RepairLog, query: string) {
  if (!query) return true;
  const hay = [
    log.repairLogCode,
    log.assetCode,
    log.assetName,
    log.issueType,
    log.issueDescription,
    log.assignedTo,
    log.requestedBy,
    log.sourceTicketCode,
    log.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(query.toLowerCase());
}

export default function RepairLogsPage() {
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const currentUser: any = auth?.user;
  const currentUserId = String(currentUser?._id || currentUser?.id || "");
  const currentUserName = String(
    currentUser?.fullName ||
      [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
      currentUser?.name ||
      ""
  ).toLowerCase();
  const isManager = ["owner", "super_admin", "admin", "maintenance_manager", "maintenance-manager", "maintenance"].includes(
    String(currentUser?.workspaceMembership?.role || currentUser?.role || "").toLowerCase()
  );

  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<RepairLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeTab, setActiveTab] = useState(isManager ? "team-active" : "my-work");
  const [selectedLog, setSelectedLog] = useState<RepairLog | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formState, setFormState] = useState<FormState>(initialForm);
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([]);
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  async function loadLogs() {
    setInitialLoading(true);
    setError("");
    try {
      const res = await getRepairLogs({ limit: 200 });
      const list = Array.isArray(res?.repairLogs) ? res.repairLogs : Array.isArray(res?.items) ? res.items : [];
      setLogs(list);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load repair logs");
      setLogs([]);
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    setActiveTab(isManager ? "team-active" : "my-work");
  }, [isManager]);

  async function openFormModal() {
    setIsFormOpen(true);
    setFormError("");
    setFormState(initialForm);
    setIsLoadingOptions(true);
    try {
      const { assets, members } = await getRepairLogOptions();
      setAssetOptions(Array.isArray(assets) ? assets : []);
      setMemberOptions(Array.isArray(members) ? members : []);
    } catch {
      setAssetOptions([]);
      setMemberOptions([]);
    } finally {
      setIsLoadingOptions(false);
    }
  }

  const visibleLogs = useMemo(() => {
    return logs.filter((log) => {
      const assignedUserId = String(log.assigneeUserId || "").trim();
      const assignedToName = String(log.assignedTo || "").trim().toLowerCase();
      const requestedByUserId = String(log.requestedByUserId || "").trim();
      const requestedByName = String(log.requestedBy || "").trim().toLowerCase();
      const isMyLog =
        (assignedUserId && assignedUserId === currentUserId) ||
        (assignedToName && assignedToName === currentUserName) ||
        requestedByUserId === currentUserId ||
        (requestedByName && requestedByName === currentUserName);

      const matchesTab =
        activeTab === "team-active"
          ? log.status === "Open" || log.status === "In Progress"
          : activeTab === "my-work"
            ? isMyLog && (log.status === "Open" || log.status === "In Progress")
            : log.status === "Resolved" || log.status === "Closed";

      const matchesStatus = statusFilter === "All" || log.status === statusFilter;

      return matchesTab && matchesStatus && matchesSearch(log, searchQuery);
    });
  }, [activeTab, currentUserId, currentUserName, logs, searchQuery, statusFilter]);

  const allDepartmentLogs = useMemo(() => logs, [logs]);

  const stats = useMemo(
    () => ({
      total: allDepartmentLogs.length,
      open: allDepartmentLogs.filter((l) => l.status === "Open").length,
      active: allDepartmentLogs.filter((l) => l.status === "In Progress").length,
      done: allDepartmentLogs.filter((l) => l.status === "Resolved" || l.status === "Closed").length,
    }),
    [allDepartmentLogs]
  );

  const tabs = isManager
    ? [
        { id: "team-active", label: "Team Active Logs" },
        { id: "my-work", label: "My Work" },
        { id: "history", label: "History" },
      ]
    : [
        { id: "my-work", label: "My Work" },
        { id: "history", label: "History" },
      ];

  const activeTabLabel = tabs.find((t) => t.id === activeTab)?.label || "Logs";

  function getStatusActions(log: RepairLog) {
    if (!log || log.status === "Closed") return [];

    if (log.status === "Open") return [{ label: "Start Work", nextStatus: "In Progress" as const }];
    if (log.status === "In Progress")
      return [
        { label: "Mark Resolved", nextStatus: "Resolved" as const },
        { label: "Close Log", nextStatus: "Closed" as const },
      ];
    if (log.status === "Resolved") return [{ label: "Close Log", nextStatus: "Closed" as const }];
    return [];
  }

  async function handleStatusChange(nextStatus: RepairLog["status"]) {
    if (!selectedLog || isUpdating) return;
    const logId = selectedLog._id || selectedLog.repairLogCode;
    if (!logId) return;

    setIsUpdating(true);
    try {
      const response = await updateRepairLog(selectedLog._id, { status: nextStatus });
      const updatedLog = response?.repairLog || null;
      if (updatedLog) {
        setLogs((prev) => prev.map((l) => ((l._id || l.repairLogCode) === (updatedLog._id || updatedLog.repairLogCode) ? updatedLog : l)));
        setSelectedLog(updatedLog);
      } else {
        setLogs((prev) => prev.map((l) => ((l._id || l.repairLogCode) === logId ? { ...l, status: nextStatus } : l)));
        setSelectedLog((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      }
      toast.success(`Repair log ${nextStatus.toLowerCase()}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  }

  function handleAssetSelect(assetId: string) {
    const asset = assetOptions.find((a) => a._id === assetId || a.assetCode === assetId);
    setFormState((prev) => ({
      ...prev,
      assetId: asset?._id || assetId,
      assetCode: asset?.assetCode || "",
      assetName: asset?.name || "",
    }));
  }

  async function handleCreateLog(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!formState.assetId) {
      setFormError("Please select an asset.");
      return;
    }
    if (!formState.issueDescription.trim()) {
      setFormError("Please describe the issue.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, any> = {
        assetId: formState.assetId,
        assetCode: formState.assetCode,
        assetName: formState.assetName,
        issueType: formState.issueType,
        issueDescription: formState.issueDescription.trim(),
        assignedTo: formState.assignedTo.trim() || currentUser?.fullName || currentUser?.name || "Unassigned",
        requestedBy: currentUser?.fullName || currentUser?.name || "Employee",
        notes: formState.notes.trim(),
      };

      await createRepairLog(payload);
      toast.success("Repair log created successfully");
      setIsFormOpen(false);
      setFormState(initialForm);
      await loadLogs();
    } catch (e: any) {
      setFormError(e?.response?.data?.message || e?.message || "Failed to create repair log");
    } finally {
      setIsSaving(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="p-2 lg:p-2.5 animate-pulse">
        <PageFrame>
          <div className="flex flex-col gap-4">
            <div className="h-7 w-48 bg-slate-100 rounded-xl" />
            <div className="h-4 w-72 bg-slate-100 rounded-xl" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-[2rem]" />
              ))}
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100/60">
                <div className="h-3 w-full bg-slate-100 rounded-lg" />
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4 px-5 py-4 border-b border-slate-100/60">
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <div key={j} className="h-3 flex-1 bg-slate-100 rounded-lg" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </PageFrame>
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-2.5">
      <PageFrame>
        <div className="flex flex-col gap-4">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700 flex items-center justify-between gap-4">
              <span>{error}</span>
              <button type="button" onClick={loadLogs} className="text-xs font-pmedium uppercase tracking-widest text-red-600 hover:text-red-700">
                Retry
              </button>
            </div>
          ) : null}

          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-title font-pmedium text-primary uppercase">Repair Logs</h1>
              <p className="text-xs font-pmedium text-slate-500 mt-1">Maintenance Department &bull; Repair work orders</p>
            </div>
          </div>

          {/* Pill Tabs */}
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {[
              { key: 'total', label: 'Total Logs', value: String(stats.total), icon: Wrench },
              { key: 'open', label: 'Open', value: String(stats.open), icon: AlertCircle },
              { key: 'active', label: 'In Progress', value: String(stats.active), icon: Clock3 },
              { key: 'done', label: 'Resolved / Closed', value: String(stats.done), icon: CheckCircle2 },
            ].map((card, idx) => {
              const Icon = card.icon;
              const borderColors = ['', 'border-l-4 border-l-amber-500', 'border-l-4 border-l-blue-500', 'border-l-4 border-l-emerald-500'];
              const iconClasses = ['bg-slate-50 text-slate-600', 'bg-amber-50 text-amber-600', 'bg-blue-50 text-blue-600', 'bg-emerald-50 text-emerald-600'];
              return (
                <div key={card.key} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${borderColors[idx] || ''}`}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                    <p className="text-[15px] font-black text-slate-900">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${iconClasses[idx] || 'bg-slate-50 text-slate-600'} shrink-0`}>
                    <Icon size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Data Panel */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            {/* Panel Header */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="All">All Status</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div className="flex items-center gap-3 w-full xl:w-auto">
                
                <div className="relative flex-1 xl:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${activeTabLabel.toLowerCase()}...`}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                  />
                </div>
                <button
                  onClick={openFormModal}
                  className="btn-pill inline-flex items-center justify-center gap-1.5 bg-[#2563EB] px-4 py-2.5 text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 whitespace-nowrap"
                >
                  <Plus size={14} />
                  Log Repair
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-3 py-4 whitespace-nowrap">Log</th>
                    <th className="px-3 py-4 whitespace-nowrap">Asset</th>
                    <th className="px-3 py-4 whitespace-nowrap">Issue</th>
                    <th className="px-3 py-4 whitespace-nowrap">Assigned</th>
                    <th className="px-3 py-4 whitespace-nowrap text-center">Status</th>
                    <th className="px-3 py-4 whitespace-nowrap text-center">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {visibleLogs.map((log) => (
                    <tr key={log._id || log.repairLogCode} className="transition hover:bg-cyan-50/30">
                      <td className="px-3 py-4">
                        <div className="font-mono text-[11px] font-black uppercase tracking-widest text-cyan-700">
                          {log.repairLogCode || log._id?.slice(-6).toUpperCase()}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{log.requestedBy}</div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-bold text-slate-900">{log.assetName}</div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          <Building2 size={12} />
                          {log.assetCode}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700">
                          {log.issueType}
                        </div>
                        <div className="mt-2 line-clamp-2 text-sm text-slate-600">{log.issueDescription}</div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm font-semibold text-slate-900">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">To: </span>
                          {log.assignedTo || "--"}
                        </div>
                        {log.sourceTicketCode ? (
                          <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-cyan-700">
                            From ticket {log.sourceTicketCode}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-4 text-center">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="btn-pill inline-flex items-center gap-1 border border-slate-200 bg-white px-3 py-1.5 text-slate-700 transition hover:bg-slate-50"
                        >
                          View <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visibleLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-16 text-center text-sm font-semibold text-slate-400">
                        No repair logs found in this view.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </PageFrame>

      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="bg-white rounded-t-4xl sm:rounded-4xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-start justify-between gap-4 bg-slate-900 px-5 py-4 text-white shrink-0">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">Repair Log Detail</p>
                  <h3 className="mt-1 text-xl font-black">{selectedLog.repairLogCode || selectedLog._id?.slice(-6).toUpperCase()}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 space-y-4 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Asset</div>
                    <div className="mt-1 font-bold text-slate-900">{selectedLog.assetName}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {selectedLog.assetCode}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned To</div>
                    <div className="mt-1 font-bold text-slate-900 flex items-center gap-1.5">
                      <User size={14} /> {selectedLog.assignedTo || "Unassigned"}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Requested by {selectedLog.requestedBy}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-white p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Issue Type</div>
                  <div className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700">
                    {selectedLog.issueType}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-white p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Issue Description</div>
                  <div className="mt-2 text-sm leading-6 text-slate-700">{selectedLog.issueDescription}</div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-white p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Created</div>
                    <div className="mt-2 text-sm font-semibold text-slate-700">{formatDate(selectedLog.createdAt)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</div>
                    <div className="mt-2">
                      <StatusBadge status={selectedLog.status} />
                    </div>
                    {getStatusActions(selectedLog).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {getStatusActions(selectedLog).map((action) => (
                          <button
                            key={action.nextStatus}
                            type="button"
                            onClick={() => handleStatusChange(action.nextStatus)}
                            disabled={isUpdating}
                            className="btn-pill inline-flex items-center border border-slate-200 bg-white px-3 py-1.5 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isUpdating ? "Updating..." : action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {selectedLog.sourceTicketCode ? (
                  <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-cyan-700">Source Ticket</div>
                    <div className="mt-1 text-sm font-semibold text-cyan-900">
                      {selectedLog.sourceTicketCode}
                      {selectedLog.sourceTicketTitle ? ` - ${selectedLog.sourceTicketTitle}` : ""}
                    </div>
                  </div>
                ) : null}

                {selectedLog.notes ? (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Notes</div>
                    <div className="mt-2 text-sm leading-6 text-indigo-950">{selectedLog.notes}</div>
                  </div>
                ) : null}

                {selectedLog.resolutionNote ? (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Resolution</div>
                    <div className="mt-2 text-sm leading-6 text-emerald-950">{selectedLog.resolutionNote}</div>
                  </div>
                ) : null}
              </div>

              <div className="flex gap-3 border-t border-slate-100 bg-slate-50 p-5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="btn-pill flex-1 border border-slate-200 bg-white py-3 text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/70"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-5 shrink-0">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-pmedium text-primary tracking-tight">
                    <Wrench size={20} />
                    Maintenance Repair Log
                  </h2>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Log the issue, choose the asset, and assign it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateLog} className="overflow-y-auto flex-1 space-y-4 p-5">
                {formError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 flex items-center gap-2">
                    <AlertCircle size={14} />
                    {formError}
                  </div>
                )}

                {isLoadingOptions ? (
                  <div className="flex items-center justify-center py-12 text-slate-400">
                    <Loader2 size={20} className="animate-spin mr-2" /> Loading form data...
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Asset *</span>
                        <select
                          required
                          value={formState.assetId}
                          onChange={(e) => handleAssetSelect(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select asset</option>
                          {assetOptions.map((asset) => (
                            <option key={asset._id} value={asset._id}>
                              {asset.name} ({asset.assetCode})
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500">Asset Code</span>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                            {formState.assetCode || "Auto"}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500">Department</span>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                            Maintenance
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Issue Type *</span>
                        <select
                          required
                          value={formState.issueType}
                          onChange={(e) => setFormState((prev) => ({ ...prev, issueType: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          {ISSUE_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Assign To</span>
                        <input
                          type="text"
                          value={formState.assignedTo}
                          onChange={(e) => setFormState((prev) => ({ ...prev, assignedTo: e.target.value }))}
                          placeholder="Technician name"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </label>
                    </div>

                    <label className="block space-y-2">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">Issue Description *</span>
                      <textarea
                        required
                        rows={4}
                        value={formState.issueDescription}
                        onChange={(e) => setFormState((prev) => ({ ...prev, issueDescription: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Describe the AC issue, electrical fault, furniture damage, or any maintenance problem..."
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">Notes</span>
                      <textarea
                        rows={2}
                        value={formState.notes}
                        onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Optional internal note"
                      />
                    </label>
                  </>
                )}

                <div className="flex gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="btn-pill flex flex-1 items-center justify-center gap-2 border border-slate-200 bg-white py-4 text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoadingOptions || isSaving}
                    className="btn-pill flex flex-1 items-center justify-center gap-2 bg-blue-600 py-4 text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                    {isSaving ? "Saving..." : "Submit Repair Log"}
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
