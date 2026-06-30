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
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest";

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
        <div className="h-7 w-48 bg-slate-100 rounded-xl mb-3" />
        <div className="h-4 w-72 bg-slate-100 rounded-xl mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
          ))}
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="h-3 w-full bg-slate-100 rounded-lg" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 px-5 py-4 border-b border-slate-50">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <div key={j} className="h-3 flex-1 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-2.5 min-h-full">
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button type="button" onClick={loadLogs} className="text-xs font-black uppercase tracking-widest text-red-600 hover:text-red-700">
            Retry
          </button>
        </div>
      ) : null}

      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Repair Logs</h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">
            Maintenance Department &bull; Repair work orders
          </p>
        </div>
        <button
          onClick={openFormModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-slate-800"
        >
          <Plus size={14} />
          Log Repair
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="text-2xl font-black text-amber-700">{stats.open}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Open</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="text-2xl font-black text-blue-700">{stats.active}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Active</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="text-2xl font-black text-emerald-700">{stats.done}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Done</div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTabLabel.toLowerCase()}...`}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm font-semibold outline-none focus:border-cyan-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-cyan-500"
            >
              <option value="All">All Status</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <Wrench size={14} />
            Maintenance logs
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full text-left">
            <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-5 py-4">Log</th>
                <th className="px-5 py-4">Asset</th>
                <th className="px-5 py-4">Issue</th>
                <th className="px-5 py-4">Assigned</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-center">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibleLogs.map((log) => (
                <tr key={log._id || log.repairLogCode} className="transition hover:bg-cyan-50/30">
                  <td className="px-5 py-4">
                    <div className="font-mono text-[11px] font-black uppercase tracking-widest text-cyan-700">
                      {log.repairLogCode || log._id?.slice(-6).toUpperCase()}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{log.requestedBy}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-900">{log.assetName}</div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <Building2 size={12} />
                      {log.assetCode}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700">
                      {log.issueType}
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm text-slate-600">{log.issueDescription}</div>
                  </td>
                  <td className="px-5 py-4">
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
                  <td className="px-5 py-4 text-center">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
                    >
                      View <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              {visibleLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm font-semibold text-slate-400">
                    No repair logs found in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-xs font-black uppercase tracking-wider text-slate-700 transition hover:bg-slate-50"
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
              className="bg-white rounded-t-4xl sm:rounded-4xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-start justify-between gap-4 bg-slate-900 px-5 py-4 text-white shrink-0">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">Repair Log Form</p>
                  <h2 className="mt-1 text-xl font-black">Maintenance Repair Log</h2>
                  <p className="mt-1 text-xs text-slate-300">Log the issue, choose the asset, and assign it.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
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
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-500"
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
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-500"
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
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-500"
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
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-cyan-500"
                        placeholder="Describe the AC issue, electrical fault, furniture damage, or any maintenance problem..."
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">Notes</span>
                      <textarea
                        rows={2}
                        value={formState.notes}
                        onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-cyan-500"
                        placeholder="Optional internal note"
                      />
                    </label>
                  </>
                )}

                <div className="flex gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoadingOptions || isSaving}
                    className="flex-1 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
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
