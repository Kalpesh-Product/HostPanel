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
import PageFrame from "../../components/Pages/PageFrame";

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
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-pbold font-bold uppercase tracking-widest";

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
      <div className="p-2 lg:p-2.5 animate-pulse">
        <PageFrame>
          <div className="flex flex-col gap-4">
            <div className="h-7 w-64 bg-slate-100 rounded-xl" />
            <div className="h-4 w-96 bg-slate-100 rounded-xl" />
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-[2rem]" />
              ))}
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white/80 overflow-hidden">
              <div className="h-10 bg-slate-50/50 rounded-xl m-4" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-slate-50/50 rounded-lg mx-4 mb-2" />
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
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-title font-pmedium text-primary uppercase">AMC Maintenance Scheduler</h1>
              <p className="text-xs font-pmedium text-slate-500 mt-1">Preventive Servicing & Alerts</p>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2 text-sm font-bold text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          ) : null}

          {/* Pill Tabs */}
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("schedules")}
              className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === "schedules"
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              Master AMC Schedule
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("alerts")}
              className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === "alerts"
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              Upcoming Alerts
              {stats.dueSoon + stats.overdue > 0 ? (
                <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px] font-pbold font-bold">
                  {stats.dueSoon + stats.overdue}
                </span>
              ) : null}
            </button>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3 shrink-0">
            {[
              { key: 'total', label: 'Total Active AMCs', value: String(stats.total), icon: Wrench },
              { key: 'healthy', label: 'Healthy / Scheduled', value: String(stats.healthy), icon: CheckCircle2 },
              { key: 'dueSoon', label: 'Due Soon', value: String(stats.dueSoon), icon: Clock3 },
              { key: 'overdue', label: 'Overdue', value: String(stats.overdue), icon: AlertCircle },
              { key: 'completed', label: 'Completed', value: String(stats.completed), icon: CheckCircle2 },
            ].map((card, idx) => {
              const Icon = card.icon;
              const borderColors = ['', 'border-l-4 border-l-emerald-500', 'border-l-4 border-l-amber-500', 'border-l-4 border-l-red-500', 'border-l-4 border-l-blue-500'];
              const iconClasses = ['bg-slate-50 text-slate-600', 'bg-emerald-50 text-emerald-600', 'bg-amber-50 text-amber-600', 'bg-red-50 text-red-600', 'bg-blue-50 text-blue-600'];
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
              <div className="flex flex-wrap items-center gap-3">
                <select
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                >
                  {availableDepartments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {availableStatuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 w-full xl:w-auto">
                
                <div className="relative flex-1 xl:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search asset, code, technician..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="btn-pill inline-flex items-center justify-center gap-1.5 bg-[#2563EB] px-4 py-2.5 text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Add AMC Schedule
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-3 py-4 whitespace-nowrap">Schedule Code & Asset</th>
                    <th className="px-3 py-4 whitespace-nowrap">Maintenance Type</th>
                    <th className="px-3 py-4 whitespace-nowrap">Frequency</th>
                    <th className="px-3 py-4 whitespace-nowrap">Technician</th>
                    <th className="px-3 py-4 whitespace-nowrap">Last Serviced</th>
                    <th className="px-3 py-4 whitespace-nowrap">Next Service Due</th>
                    <th className="px-3 py-4 whitespace-nowrap text-center">Status</th>
                    <th className="px-3 py-4 whitespace-nowrap text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {filteredSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-16 text-center text-sm font-semibold text-slate-400">
                        No schedules found.
                      </td>
                    </tr>
                  ) : (
                    filteredSchedules.map((s) => {
                      const id = getScheduleId(s);
                      const st = s.currentStatus || s.status || "Scheduled";
                      return (
                        <tr key={id || s.scheduleCode || s.assetCode} className="hover:bg-blue-50/30 transition-all">
                          <td className="px-3 py-4">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">
                              {s.scheduleCode || id}
                            </p>
                            <p className="font-bold text-slate-900 text-sm">{s.assetName || "--"}</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5 tracking-widest">
                              {s.department || "--"}
                            </p>
                          </td>
                          <td className="px-3 py-4">
                            <p className="text-xs font-bold text-slate-800">{s.maintenanceType || s.type || "--"}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">{s.assetCategory || ""}</p>
                          </td>
                          <td className="px-3 py-4">{getFrequencyBadge(s.frequency)}</td>
                          <td className="px-3 py-4">
                            <p className="text-xs font-bold text-slate-800">{s.technician || "--"}</p>
                          </td>
                          <td className="px-3 py-4">
                            <p className="text-xs font-bold text-slate-600">{formatDateDisplay(s.lastServiceDate)}</p>
                          </td>
                          <td className="px-3 py-4">
                            <p className={`text-sm font-black flex items-center gap-1.5 ${
                              st === "Overdue" ? "text-red-600" : st === "Due Soon" ? "text-amber-600" : "text-slate-900"
                            }`}>
                              <Calendar className={`w-3.5 h-3.5 ${
                                st === "Overdue" ? "text-red-500" : st === "Due Soon" ? "text-amber-500" : "text-slate-400"
                              }`} />
                              {formatDateDisplay(s.nextServiceDate)}
                            </p>
                          </td>
                          <td className="px-3 py-4 text-center">{getStatusBadge(st)}</td>
                          <td className="px-3 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleSelectSchedule(s)}
                              className="btn-pill border border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
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

            <div className="px-3 py-3 border-t border-slate-100/60 text-[10px] font-bold text-slate-400">
              Showing {filteredSchedules.length} of {schedules.length} schedules
            </div>
          </div>
        </div>
      </PageFrame>

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
                  className="px-4 py-2 text-xs font-pmedium uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Close
                </button>
                {(selectedSchedule.currentStatus || selectedSchedule.status) === "Scheduled" ||
                 (selectedSchedule.currentStatus || selectedSchedule.status) === "Due Soon" ? (
                  <button
                    type="button"
                    onClick={() => handleComplete(selectedSchedule)}
                    disabled={isUpdating}
                    className="btn-pill inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
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
              className="relative w-full sm:max-w-2xl bg-white rounded-[2.5rem] shadow-2xl max-h-[85vh] flex flex-col overflow-hidden border border-white/70"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-5 shrink-0">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-pmedium text-primary tracking-tight">
                    <Calendar size={20} />
                    Add AMC Schedule
                  </h2>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Create a preventive servicing schedule for an asset
                  </p>
                </div>
                <button type="button" onClick={handleCloseCreate} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:bg-slate-100">
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
                      className="btn-pill flex items-center gap-2 border border-slate-200 bg-white px-6 py-3 text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="btn-pill inline-flex items-center gap-1.5 px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm transition-colors"
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
