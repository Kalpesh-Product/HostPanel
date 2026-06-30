import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock3,
  Plus,
  Search,
  X,
  AlertCircle,
  Wrench,
  FileText,
  Loader2,
  Calendar,
} from "lucide-react";
import {
  getMaintenanceSchedules,
  createMaintenanceSchedule,
  completeMaintenanceSchedule,
  getMaintenanceOptions,
} from "../../services/maintenance";

type MaintenanceSchedule = {
  _id?: string;
  scheduleId?: string;
  recordId?: string;
  id?: string;
  scheduleCode?: string;
  assetId?: string;
  assetCode?: string;
  assetName?: string;
  assetCategory?: string;
  departmentId?: string;
  department?: string;
  maintenanceType?: string;
  type?: string;
  frequency?: string;
  lastServiceDate?: string;
  nextServiceDate?: string;
  technician?: string;
  notes?: string;
  enableReminders?: boolean;
  currentStatus?: "Scheduled" | "Due Soon" | "Overdue" | "Completed";
  status?: "Scheduled" | "Due Soon" | "Overdue" | "Completed";
  history?: { date: string; note: string; actionType: string; performedBy?: string }[];
  createdAt?: string;
  updatedAt?: string;
};

type FormData = {
  assetId: string;
  assetCode: string;
  assetName: string;
  assetCategory: string;
  maintenanceType: string;
  frequency: string;
  technician: string;
  nextServiceDate: string;
  lastServiceDate: string;
  notes: string;
  enableReminders: boolean;
};

function formatDateDisplay(dateStr?: string) {
  if (!dateStr || dateStr === "--") return "--";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

const STATUSES = ["Scheduled", "Due Soon", "Overdue", "Completed"] as const;

function getStatusBadge(status?: string) {
  const s = status || "Scheduled";
  const base =
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest";

  if (s === "Scheduled") {
    return (
      <span className={`${base} bg-emerald-50 text-emerald-700`}>
        <CheckCircle2 className="w-3 h-3" />
        Scheduled
      </span>
    );
  }
  if (s === "Due Soon") {
    return (
      <span className={`${base} bg-amber-50 text-amber-700`}>
        <Clock3 className="w-3 h-3" />
        Due Soon
      </span>
    );
  }
  if (s === "Overdue") {
    return (
      <span className={`${base} bg-red-50 text-red-700`}>
        <AlertCircle className="w-3 h-3" />
        Overdue
      </span>
    );
  }
  if (s === "Completed") {
    return (
      <span className={`${base} bg-blue-50 text-blue-700`}>
        <CheckCircle2 className="w-3 h-3" />
        Completed
      </span>
    );
  }
  return <span className={`${base} bg-slate-50 text-slate-700`}>{s}</span>;
}

function getFrequencyBadge(freq?: string) {
  const base = "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest";
  switch (freq) {
    case "Monthly": return <span className={`${base} bg-indigo-50 text-indigo-700`}>Monthly</span>;
    case "Quarterly": return <span className={`${base} bg-violet-50 text-violet-700`}>Quarterly</span>;
    case "Half-Yearly": return <span className={`${base} bg-sky-50 text-sky-700`}>Half-Yearly</span>;
    case "Yearly": return <span className={`${base} bg-teal-50 text-teal-700`}>Yearly</span>;
    default: return <span className={`${base} bg-slate-50 text-slate-600`}>{freq || "--"}</span>;
  }
}

const initialFormData: FormData = {
  assetId: "",
  assetCode: "",
  assetName: "",
  assetCategory: "",
  maintenanceType: "",
  frequency: "Monthly",
  technician: "",
  nextServiceDate: "",
  lastServiceDate: "",
  notes: "",
  enableReminders: true,
};

export default function AMCMaintenanceSchedulerPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<"schedules" | "alerts">("schedules");
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);

  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formOptions, setFormOptions] = useState<{ assets: any[]; members: any[] }>({ assets: [], members: [] });
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getMaintenanceSchedules({ limit: 200 });
        const list = data?.schedules ?? data ?? [];
        if (!active) return;
        setSchedules(Array.isArray(list) ? list : []);
      } catch (e: any) {
        if (!active) return;
        setError(e?.response?.data?.message || e?.message || "Unable to load AMC schedules");
        setSchedules([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => {
      const dept = s.department || "";
      if (dept) set.add(dept);
    });
    return ["All Departments", ...Array.from(set).sort()];
  }, [schedules]);

  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => {
      const st = s.currentStatus || s.status || "";
      if (st) set.add(st);
    });
    return ["All Statuses", ...Array.from(set).sort()];
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    return schedules.filter((s) => {
      const st = s.currentStatus || s.status || "";

      const matchesSearch =
        !normalized ||
        [s.scheduleCode, s.assetCode, s.assetName, s.department, s.maintenanceType, s.type, s.frequency, s.technician, st, s.notes]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(normalized));

      const matchesDept = deptFilter === "All Departments" || s.department === deptFilter;
      const matchesStatus = statusFilter === "All Statuses" || st === statusFilter;

      if (activeTab === "alerts") {
        return matchesSearch && matchesDept && matchesStatus && (st === "Due Soon" || st === "Overdue");
      }

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [activeTab, deptFilter, statusFilter, searchQuery, schedules]);

  const stats = useMemo(() => {
    const total = schedules.length;
    const dueSoon = schedules.filter((s) => (s.currentStatus || s.status) === "Due Soon").length;
    const overdue = schedules.filter((s) => (s.currentStatus || s.status) === "Overdue").length;
    const healthy = schedules.filter((s) => (s.currentStatus || s.status) === "Scheduled").length;
    const completed = schedules.filter((s) => (s.currentStatus || s.status) === "Completed").length;
    return { total, dueSoon, overdue, healthy, completed };
  }, [schedules]);

  const handleSelectSchedule = (schedule: MaintenanceSchedule) => {
    setSelectedSchedule(schedule);
  };

  const handleCloseDetail = () => {
    setSelectedSchedule(null);
  };

  const handleOpenCreate = async () => {
    setShowCreateModal(true);
    setFormData(initialFormData);
    setFormErrors({});
    setLoadingOptions(true);
    const opts = await getMaintenanceOptions();
    setFormOptions(opts);
    setLoadingOptions(false);
  };

  const handleCloseCreate = () => {
    setShowCreateModal(false);
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.assetId) errors.assetId = "Asset is required";
    if (!formData.maintenanceType.trim()) errors.maintenanceType = "Maintenance type is required";
    if (!formData.frequency) errors.frequency = "Frequency is required";
    if (!formData.technician.trim()) errors.technician = "Technician is required";
    if (!formData.nextServiceDate) errors.nextServiceDate = "Next service date is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      await createMaintenanceSchedule(formData);
      toast.success("AMC schedule created successfully");
      setShowCreateModal(false);
      const data = await getMaintenanceSchedules({ limit: 200 });
      setSchedules(Array.isArray(data?.schedules ?? data ?? []) ? (data?.schedules ?? data ?? []) : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create schedule");
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async (schedule: MaintenanceSchedule) => {
    const id = schedule._id || schedule.scheduleId || schedule.recordId || schedule.id;
    if (!id) return;
    setIsUpdating(true);
    try {
      await completeMaintenanceSchedule(id, { note: `Service completed by ${formData.technician || "System"}.` });
      toast.success("Service marked as completed");
      const data = await getMaintenanceSchedules({ limit: 200 });
      setSchedules(Array.isArray(data?.schedules ?? data ?? []) ? (data?.schedules ?? data ?? []) : []);
      setSelectedSchedule(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to complete service");
    } finally {
      setIsUpdating(false);
    }
  };

  const getScheduleId = (s: MaintenanceSchedule) => s._id || s.scheduleId || s.recordId || s.id || "";

  if (loading) {
    return (
      <div className="w-full animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-lg mb-2" />
        <div className="h-4 w-96 bg-slate-100 rounded mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="h-10 bg-slate-50 rounded-xl mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-50 rounded-lg mb-2" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A]">AMC Maintenance Scheduler</h1>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">
            <Wrench className="w-3.5 h-3.5 inline mr-1" />
            Preventive Servicing & Alerts
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add AMC Schedule
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2 text-sm font-bold text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-2xl font-black">{stats.total}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Total Active AMCs</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-2xl font-black text-emerald-600">{stats.healthy}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mt-1">Healthy / Scheduled</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-2xl font-black text-amber-600">{stats.dueSoon}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mt-1">Due Soon</p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
          <p className="text-2xl font-black text-red-600">{stats.overdue}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 mt-1">Overdue</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <p className="text-2xl font-black text-blue-600">{stats.completed}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mt-1">Completed</p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("schedules")}
              className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
                activeTab === "schedules"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              Master AMC Schedule
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("alerts")}
              className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
                activeTab === "alerts"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              Upcoming Alerts
              {stats.dueSoon + stats.overdue > 0 ? (
                <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black">
                  {stats.dueSoon + stats.overdue}
                </span>
              ) : null}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <select
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              {availableDepartments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {availableStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search asset, code, technician..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-6 py-4">Schedule Code & Asset</th>
                <th className="px-6 py-4">Maintenance Type</th>
                <th className="px-6 py-4">Frequency</th>
                <th className="px-6 py-4">Technician</th>
                <th className="px-6 py-4">Last Serviced</th>
                <th className="px-6 py-4">Next Service Due</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400 font-bold">
                    No schedules found.
                  </td>
                </tr>
              ) : (
                filteredSchedules.map((s) => {
                  const id = getScheduleId(s);
                  const st = s.currentStatus || s.status || "Scheduled";
                  return (
                    <tr key={id || s.scheduleCode || s.assetCode} className="hover:bg-blue-50/30 transition-all">
                      <td className="px-6 py-4">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">
                          {s.scheduleCode || id}
                        </p>
                        <p className="font-bold text-slate-900 text-sm">{s.assetName || "--"}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5 tracking-widest">
                          {s.department || "--"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-800">{s.maintenanceType || s.type || "--"}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">{s.assetCategory || ""}</p>
                      </td>
                      <td className="px-6 py-4">{getFrequencyBadge(s.frequency)}</td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-800">{s.technician || "--"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-600">{formatDateDisplay(s.lastServiceDate)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className={`text-sm font-black flex items-center gap-1.5 ${
                          st === "Overdue" ? "text-red-600" : st === "Due Soon" ? "text-amber-600" : "text-slate-900"
                        }`}>
                          <Calendar className={`w-3.5 h-3.5 ${
                            st === "Overdue" ? "text-red-500" : st === "Due Soon" ? "text-amber-500" : "text-slate-400"
                          }`} />
                          {formatDateDisplay(s.nextServiceDate)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">{getStatusBadge(st)}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectSchedule(s)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 text-[10px] font-bold text-slate-400">
          Showing {filteredSchedules.length} of {schedules.length} schedules
        </div>
      </div>

      {/* ─── View Detail Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedSchedule ? (
          <motion.div
            key="detail-modal"
            className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={handleCloseDetail}
            />
            <motion.div
              className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white flex-shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">
                    {selectedSchedule.scheduleCode || "Schedule Detail"}
                  </span>
                </div>
                <button type="button" onClick={handleCloseDetail} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Asset</p>
                    <p className="font-bold text-slate-900">{selectedSchedule.assetName || "--"}</p>
                    <p className="text-[10px] text-slate-500">{selectedSchedule.assetCode || ""}</p>
                    {selectedSchedule.assetCategory ? (
                      <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">{selectedSchedule.assetCategory}</p>
                    ) : null}
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Department</p>
                    <p className="font-bold text-slate-900">{selectedSchedule.department || "--"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Maintenance Type</p>
                    <p className="font-bold text-slate-900">{selectedSchedule.maintenanceType || selectedSchedule.type || "--"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Frequency</p>
                    <p className="font-bold text-slate-900">{selectedSchedule.frequency || "--"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Technician</p>
                    <p className="font-bold text-slate-900">{selectedSchedule.technician || "--"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedSchedule.currentStatus || selectedSchedule.status)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Last Serviced</p>
                    <p className="font-bold text-slate-900">{formatDateDisplay(selectedSchedule.lastServiceDate)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Next Service Due</p>
                    <p className={`font-bold ${
                      (selectedSchedule.currentStatus || selectedSchedule.status) === "Overdue" ? "text-red-600" :
                      (selectedSchedule.currentStatus || selectedSchedule.status) === "Due Soon" ? "text-amber-600" : "text-slate-900"
                    }`}>
                      {formatDateDisplay(selectedSchedule.nextServiceDate)}
                    </p>
                  </div>
                </div>

                {selectedSchedule.notes ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Notes</p>
                    <p className="text-sm text-slate-700">{selectedSchedule.notes}</p>
                  </div>
                ) : null}

                {Array.isArray(selectedSchedule.history) && selectedSchedule.history.length > 0 ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Service History</p>
                    <div className="space-y-2">
                      {selectedSchedule.history.map((h, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-slate-800">{h.note}</p>
                            <p className="text-[10px] text-slate-500">{h.date} {h.performedBy ? `by ${h.performedBy}` : ""}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Close
                </button>
                {(selectedSchedule.currentStatus || selectedSchedule.status) === "Scheduled" ||
                 (selectedSchedule.currentStatus || selectedSchedule.status) === "Due Soon" ? (
                  <button
                    type="button"
                    onClick={() => handleComplete(selectedSchedule)}
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {isUpdating ? "Completing..." : "Complete Service"}
                  </button>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ─── Create Schedule Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal ? (
          <motion.div
            key="create-modal"
            className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={handleCloseCreate}
            />
            <motion.div
              className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">Add AMC Schedule</span>
                </div>
                <button type="button" onClick={handleCloseCreate} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingOptions ? (
                <div className="flex-1 flex items-center justify-center p-12">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                  {Object.keys(formErrors).length > 0 ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                      Please fill in all required fields.
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Asset *</label>
                      <select
                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-xs font-bold text-slate-700 outline-none ${
                          formErrors.assetId ? "border-rose-300" : "border-slate-200"
                        }`}
                        value={formData.assetId}
                        onChange={(e) => {
                          const asset = formOptions.assets.find((a: any) => a._id === e.target.value);
                          setFormData({
                            ...formData,
                            assetId: e.target.value,
                            assetCode: asset?.assetCode || asset?.code || "",
                            assetName: asset?.assetName || asset?.name || "",
                            assetCategory: asset?.assetCategory || asset?.category || "",
                          });
                          if (formErrors.assetId) setFormErrors({ ...formErrors, assetId: undefined });
                        }}
                      >
                        <option value="">Select asset...</option>
                        {formOptions.assets.map((a: any) => (
                          <option key={a._id} value={a._id}>
                            {a.assetName || a.name || a.assetCode || a.code}
                          </option>
                        ))}
                      </select>
                      {formErrors.assetId ? <p className="text-[10px] font-bold text-rose-500 mt-1">{formErrors.assetId}</p> : null}
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Maintenance Type *</label>
                      <input
                        type="text"
                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-xs font-bold text-slate-700 outline-none ${
                          formErrors.maintenanceType ? "border-rose-300" : "border-slate-200"
                        }`}
                        placeholder="e.g. HVAC, Electrical"
                        value={formData.maintenanceType}
                        onChange={(e) => {
                          setFormData({ ...formData, maintenanceType: e.target.value });
                          if (formErrors.maintenanceType) setFormErrors({ ...formErrors, maintenanceType: undefined });
                        }}
                      />
                      {formErrors.maintenanceType ? <p className="text-[10px] font-bold text-rose-500 mt-1">{formErrors.maintenanceType}</p> : null}
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Frequency *</label>
                      <select
                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-xs font-bold text-slate-700 outline-none ${
                          formErrors.frequency ? "border-rose-300" : "border-slate-200"
                        }`}
                        value={formData.frequency}
                        onChange={(e) => {
                          setFormData({ ...formData, frequency: e.target.value });
                          if (formErrors.frequency) setFormErrors({ ...formErrors, frequency: undefined });
                        }}
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Half-Yearly">Half-Yearly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                      {formErrors.frequency ? <p className="text-[10px] font-bold text-rose-500 mt-1">{formErrors.frequency}</p> : null}
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Technician *</label>
                      <input
                        type="text"
                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-xs font-bold text-slate-700 outline-none ${
                          formErrors.technician ? "border-rose-300" : "border-slate-200"
                        }`}
                        placeholder="Technician name"
                        value={formData.technician}
                        onChange={(e) => {
                          setFormData({ ...formData, technician: e.target.value });
                          if (formErrors.technician) setFormErrors({ ...formErrors, technician: undefined });
                        }}
                      />
                      {formErrors.technician ? <p className="text-[10px] font-bold text-rose-500 mt-1">{formErrors.technician}</p> : null}
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Next Service Date *</label>
                      <input
                        type="date"
                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-xs font-bold text-slate-700 outline-none ${
                          formErrors.nextServiceDate ? "border-rose-300" : "border-slate-200"
                        }`}
                        value={formData.nextServiceDate}
                        onChange={(e) => {
                          setFormData({ ...formData, nextServiceDate: e.target.value });
                          if (formErrors.nextServiceDate) setFormErrors({ ...formErrors, nextServiceDate: undefined });
                        }}
                      />
                      {formErrors.nextServiceDate ? <p className="text-[10px] font-bold text-rose-500 mt-1">{formErrors.nextServiceDate}</p> : null}
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Last Service Date</label>
                      <input
                        type="date"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                        value={formData.lastServiceDate}
                        onChange={(e) => setFormData({ ...formData, lastServiceDate: e.target.value })}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Notes</label>
                      <textarea
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none resize-none"
                        rows={2}
                        placeholder="Optional notes..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="enableReminders"
                        className="rounded border-slate-300"
                        checked={formData.enableReminders}
                        onChange={(e) => setFormData({ ...formData, enableReminders: e.target.checked })}
                      />
                      <label htmlFor="enableReminders" className="text-xs font-bold text-slate-600 cursor-pointer">
                        Enable reminders
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleCloseCreate}
                      className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      {isSaving ? "Creating..." : "Create Schedule"}
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
