import React, { useEffect, useMemo, useState } from "react";
import {
  Search, Eye, X, Clock, CheckCircle2, XCircle, AlertCircle,
  AlertTriangle, Users, Building2, ChevronDown, Calendar,
  Filter, Check, Ban, Loader2, User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import PageFrame from "@/components/Pages/PageFrame";
import { HRAttendanceReviewSkeleton } from "@/components/ui/Skeleton";
import {
  getHrAttendanceReview,
  reviewAttendanceCorrection,
  getEmployeeAttendanceHistory,
} from "@/services/attendance";
import { formatTime12h } from "@/utils/time";

/* ───────────────────────────── Types ───────────────────────────── */

interface AttendanceRecord {
  id?: string;
  recordId?: string;
  userId?: string;
  employeeName?: string;
  employeeId?: string;
  department?: string;
  date?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  workingHours?: number;
  totalHours?: number;
  isLate?: boolean;
  isEarlyDeparture?: boolean;
  lateMinutes?: number;
  earlyMinutes?: number;
  source?: string;
}

interface CorrectionRecord {
  id?: string;
  correctionId?: string;
  userId?: string;
  employeeName?: string;
  employeeId?: string;
  department?: string;
  date?: string;
  type?: string;
  reason?: string;
  status?: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  requestedAt?: string;
  actionedBy?: string;
  rejectionReason?: string;
}

interface AttendanceStats {
  totalEmployees: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  totalRecords: number;
  pendingCorrections: number;
  approvedCorrections: number;
  rejectedCorrections: number;
}

interface TabOption {
  key: string;
  label: string;
}

interface PillOption {
  key: string;
  label: string;
}

interface StatCard {
  key: string;
  label: string;
  value: number | string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  cardClass: string;
  iconClass: string;
}

/* ───────────────────────────── Constants ───────────────────────────── */

const MAIN_TABS: TabOption[] = [
  { key: "attendance-master", label: "Attendance Master" },
  { key: "correction-requests", label: "Correction Requests" },
];

const ATTENDANCE_FILTER_PILLS: PillOption[] = [
  { key: "all", label: "All" },
  { key: "present", label: "Present" },
  { key: "late", label: "Late" },
  { key: "absent", label: "Absent" },
  { key: "half-day", label: "Half Day" },
];

const CORRECTION_FILTER_PILLS: PillOption[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

/* ───────────────────────────── Helpers ───────────────────────────── */

function getStatusColor(status?: string): string {
  switch (String(status || "").toLowerCase()) {
    case "present": case "approved": return "emerald";
    case "late": return "amber";
    case "absent": case "rejected": return "rose";
    case "half-day": case "half_day": return "orange";
    case "pending": return "blue";
    default: return "slate";
  }
}

function StatusBadge({ status }: { status?: string }) {
  const color = getStatusColor(status);
  const label = String(status || "Unknown").replace(/_/g, " ");
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${colorMap[color] || colorMap.slate}`}>
      {status && ["present", "approved"].includes(status.toLowerCase()) ? <CheckCircle2 size={12} /> : null}
      {status && status.toLowerCase() === "pending" ? <Clock size={12} /> : null}
      {status && ["absent", "rejected"].includes(status.toLowerCase()) ? <XCircle size={12} /> : null}
      {status && status.toLowerCase() === "late" ? <AlertTriangle size={12} /> : null}
      {label}
    </span>
  );
}

function formatDuration(hours?: number): string {
  if (hours == null || isNaN(hours)) return "--";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getEmployeeInitials(name: string = ""): string {
  return name.split(" ").filter(Boolean).map((p) => p[0]).join("").substring(0, 2).toUpperCase() || "E";
}

/* ──────────────────────────────────────────────────────────────── */
/*  EmployeeAttendanceDetailView (slide-in panel)                  */
/* ──────────────────────────────────────────────────────────────── */

interface EmployeeDetailViewProps {
  open: boolean;
  onClose: () => void;
  employeeName: string;
  department: string;
  userId: string;
  selectedDate: string;
}

function EmployeeAttendanceDetailView({
  open, onClose, employeeName, department, userId, selectedDate,
}: EmployeeDetailViewProps) {
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    setLoading(true);
    getEmployeeAttendanceHistory(userId, { month: selectedDate.substring(0, 7) })
      .then((data) => {
        if (!cancelled) {
          setHistory(Array.isArray(data) ? data : data?.records ? data.records : []);
        }
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, userId, selectedDate]);

  const dayRecords = useMemo(
    () => history.filter((r) => r.date?.startsWith(selectedDate)),
    [history, selectedDate],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="fixed right-0 top-0 h-full w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">{employeeName}</h3>
              <p className="text-[11px] text-slate-500">{department} &middot; {selectedDate}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="text-slate-400 animate-spin" />
              </div>
            ) : dayRecords.length === 0 ? (
              <div className="text-center py-20 text-slate-400 font-semibold text-[12px]">
                No attendance records for this date.
              </div>
            ) : (
              <div className="space-y-3">
                {dayRecords.map((record, idx) => (
                  <div key={record.id || record.recordId || idx} className="bg-slate-50 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <StatusBadge status={record.status} />
                      <span className="text-[11px] text-slate-400">{record.source || "Self"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[12px]">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check In</p>
                        <p className="font-semibold text-slate-800">{record.checkIn ? formatTime12h(record.checkIn) : "--"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check Out</p>
                        <p className="font-semibold text-slate-800">{record.checkOut ? formatTime12h(record.checkOut) : "--"}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-[10px] text-slate-400">Total Hours</span>
                      <span className="text-[12px] font-bold text-slate-800">{formatDuration(record.totalHours ?? record.workingHours)}</span>
                    </div>
                    {record.isLate && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5">
                        <AlertTriangle size={12} /> Late by {record.lateMinutes || 0} min
                      </div>
                    )}
                    {record.isEarlyDeparture && (
                      <div className="flex items-center gap-1.5 text-[11px] text-orange-600 bg-orange-50 rounded-lg px-2.5 py-1.5">
                        <AlertTriangle size={12} /> Early departure by {record.earlyMinutes || 0} min
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  Correction Detail Modal                                        */
/* ──────────────────────────────────────────────────────────────── */

interface CorrectionModalProps {
  record: CorrectionRecord | null;
  open: boolean;
  onClose: () => void;
  onAction: (correctionId: string, action: "approved" | "rejected", reason?: string) => Promise<void>;
  acting: boolean;
}

function CorrectionDetailModal({ record, open, onClose, onAction, acting }: CorrectionModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (open) setRejectionReason("");
  }, [open]);

  if (!record) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/45 backdrop-blur-[2px] px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Correction Request</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <User size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-900">{record.employeeName}</p>
                  <p className="text-[11px] text-slate-500">{record.department}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={record.status} />
                <span className="text-[11px] text-slate-400">{record.date}</span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason</p>
                <p className="text-[12px] text-slate-700">{record.reason || "No reason provided"}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Original Check In</p>
                  <p className="text-[13px] font-bold text-slate-600">{record.originalCheckIn ? formatTime12h(record.originalCheckIn) : "--"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Original Check Out</p>
                  <p className="text-[13px] font-bold text-slate-600">{record.originalCheckOut ? formatTime12h(record.originalCheckOut) : "--"}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Requested Check In</p>
                  <p className="text-[13px] font-bold text-amber-700">{record.requestedCheckIn ? formatTime12h(record.requestedCheckIn) : "--"}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Requested Check Out</p>
                  <p className="text-[13px] font-bold text-amber-700">{record.requestedCheckOut ? formatTime12h(record.requestedCheckOut) : "--"}</p>
                </div>
              </div>

              {record.status?.toLowerCase() === "pending" && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Rejection Reason <span className="text-slate-300">(required if rejecting)</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[12px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAction(record.correctionId || record.id || "", "approved")}
                      disabled={acting}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-[11px] font-bold hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {acting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        if (!rejectionReason.trim()) {
                          toast.error("Please provide a reason for rejection.");
                          return;
                        }
                        onAction(record.correctionId || record.id || "", "rejected", rejectionReason.trim());
                      }}
                      disabled={acting}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-rose-500 text-white px-4 py-2.5 rounded-xl text-[11px] font-bold hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {acting ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {record.status?.toLowerCase() === "rejected" && record.rejectionReason && (
                <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                  <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1">Rejection Reason</p>
                  <p className="text-[12px] text-rose-700">{record.rejectionReason}</p>
                </div>
              )}

              {record.status?.toLowerCase() === "approved" && record.actionedBy && (
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Approved By</p>
                  <p className="text-[12px] text-emerald-700">{record.actionedBy}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  Main Page Component                                            */
/* ──────────────────────────────────────────────────────────────── */

export default function HRAttendanceReviewPage() {
  const [activeTab, setActiveTab] = useState("attendance-master");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(getLocalDateString);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalEmployees: 0, present: 0, absent: 0, late: 0, halfDay: 0,
    totalRecords: 0, pendingCorrections: 0, approvedCorrections: 0, rejectedCorrections: 0,
  });

  /* Detail view state */
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEmployee, setDetailEmployee] = useState({ name: "", department: "", userId: "" });

  /* Correction modal state */
  const [correctionModal, setCorrectionModal] = useState<CorrectionRecord | null>(null);
  const [acting, setActing] = useState(false);

  /* Fetch data */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getHrAttendanceReview({ date: selectedDate })
      .then((data) => {
        if (cancelled) return;
        const d = data || {};
        const attendanceList = Array.isArray(d.records) ? d.records : Array.isArray(data) ? data : [];
        const correctionList = Array.isArray(d.corrections) ? d.corrections : [];
        setRecords(attendanceList);
        setCorrections(correctionList);
        setStats({
          totalEmployees: d.totalEmployees ?? attendanceList.length,
          present: d.present ?? 0,
          absent: d.absent ?? 0,
          late: d.late ?? 0,
          halfDay: d.halfDay ?? 0,
          totalRecords: attendanceList.length,
          pendingCorrections: d.pendingCorrections ?? correctionList.filter((c: CorrectionRecord) => c.status?.toLowerCase() === "pending").length,
          approvedCorrections: d.approvedCorrections ?? correctionList.filter((c: CorrectionRecord) => c.status?.toLowerCase() === "approved").length,
          rejectedCorrections: d.rejectedCorrections ?? correctionList.filter((c: CorrectionRecord) => c.status?.toLowerCase() === "rejected").length,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setRecords([]);
          setCorrections([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedDate]);

  /* Filtered data */
  const filteredAttendance = useMemo(() => {
    let list = records;
    if (statusFilter !== "all") {
      list = list.filter((r) => (r.status?.toLowerCase() || "") === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          (r.employeeName?.toLowerCase() || "").includes(q) ||
          (r.department?.toLowerCase() || "").includes(q) ||
          (r.employeeId?.toLowerCase() || "").includes(q),
      );
    }
    return list;
  }, [records, statusFilter, searchQuery]);

  const filteredCorrections = useMemo(() => {
    let list = corrections;
    if (statusFilter !== "all") {
      list = list.filter((c) => (c.status?.toLowerCase() || "") === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          (c.employeeName?.toLowerCase() || "").includes(q) ||
          (c.department?.toLowerCase() || "").includes(q),
      );
    }
    return list;
  }, [corrections, statusFilter, searchQuery]);

  /* Handle correction action */
  const handleCorrectionAction = async (correctionId: string, action: "approved" | "rejected", reason?: string) => {
    if (!correctionId) {
      toast.error("Correction ID not found.");
      return;
    }
    setActing(true);
    try {
      await reviewAttendanceCorrection(correctionId, action, reason);
      toast.success(`Correction ${action} successfully.`);
      setCorrectionModal(null);
      setCorrections((prev) =>
        prev.map((c) =>
          (c.correctionId || c.id) === correctionId ? { ...c, status: action } : c,
        ),
      );
      setStats((prev) => ({
        ...prev,
        pendingCorrections: Math.max(0, prev.pendingCorrections - 1),
        ...(action === "approved" ? { approvedCorrections: prev.approvedCorrections + 1 } : {}),
        ...(action === "rejected" ? { rejectedCorrections: prev.rejectedCorrections + 1 } : {}),
      }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to process correction.");
    } finally {
      setActing(false);
    }
  };

  /* Open detail view */
  const openDetail = (record: AttendanceRecord) => {
    setDetailEmployee({
      name: record.employeeName || "Unknown",
      department: record.department || "--",
      userId: record.userId || "",
    });
    setDetailOpen(true);
  };

  /* Build stat cards based on active tab */
  const statCards: StatCard[] = useMemo(() => {
    if (activeTab === "attendance-master") {
      return [
        {
          key: "total", label: "Total Employees", value: stats.totalEmployees,
          icon: Users, cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md",
          iconClass: "bg-slate-50 text-slate-600",
        },
        {
          key: "present", label: "Present", value: stats.present,
          icon: CheckCircle2, cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500",
          iconClass: "bg-emerald-50 text-emerald-600",
        },
        {
          key: "late", label: "Late", value: stats.late,
          icon: AlertTriangle, cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500",
          iconClass: "bg-amber-50 text-amber-600",
        },
        {
          key: "absent", label: "Absent", value: stats.absent,
          icon: XCircle, cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-rose-500",
          iconClass: "bg-rose-50 text-rose-600",
        },
      ];
    }
    return [
      {
        key: "total", label: "Total Requests", value: stats.pendingCorrections + stats.approvedCorrections + stats.rejectedCorrections,
        icon: Clock, cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md",
        iconClass: "bg-slate-50 text-slate-600",
      },
      {
        key: "pending", label: "Pending", value: stats.pendingCorrections,
        icon: AlertCircle, cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500",
        iconClass: "bg-amber-50 text-amber-600",
      },
      {
        key: "approved", label: "Approved", value: stats.approvedCorrections,
        icon: CheckCircle2, cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500",
        iconClass: "bg-blue-50 text-blue-600",
      },
      {
        key: "rejected", label: "Rejected", value: stats.rejectedCorrections,
        icon: XCircle, cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-rose-500",
        iconClass: "bg-rose-50 text-rose-600",
      },
    ];
  }, [activeTab, stats]);

  if (loading) return <HRAttendanceReviewSkeleton />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ── Header ── */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Attendance Review
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Monitor employee attendance and manage correction requests.
              </p>
            </div>
          </div>

          {/* ── Main Tabs (pill-style) ── */}
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            {MAIN_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setStatusFilter("all"); setSearchQuery(""); }}
                className={`flex-1 min-w-[120px] rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${
                  activeTab === tab.key
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.key} className={card.cardClass}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      {card.label}
                    </p>
                    <p className="text-[15px] font-black text-slate-900">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}>
                    <Icon size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Data Panel ── */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

            {/* Data panel header row */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              <div className="flex items-center gap-2 w-full xl:w-auto">
                {activeTab === "attendance-master" && (
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="pl-9 pr-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder={activeTab === "attendance-master" ? "Search employees..." : "Search requests..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Status sub-tabs (pill filters) */}
            <div className="px-3 sm:px-4 lg:px-5 py-2 border-b border-slate-100/40 bg-white flex items-center gap-1.5 overflow-x-auto">
              {(activeTab === "attendance-master" ? ATTENDANCE_FILTER_PILLS : CORRECTION_FILTER_PILLS).map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => setStatusFilter(pill.key)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all ${
                    statusFilter === pill.key
                      ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                      : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {activeTab === "attendance-master" ? (
                <table className="w-full">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4 text-left">Employee</th>
                      <th className="px-5 py-4 text-left">Department</th>
                      <th className="px-5 py-4 text-left">Check In</th>
                      <th className="px-5 py-4 text-left">Check Out</th>
                      <th className="px-5 py-4 text-left">Status</th>
                      <th className="px-5 py-4 text-left">Hours</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-20 text-slate-400 font-semibold">
                          No attendance records found.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map((record, idx) => (
                        <tr key={record.id || record.recordId || idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-[11px]">
                                {getEmployeeInitials(record.employeeName)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[12px] font-bold text-slate-800 truncate">{record.employeeName || "--"}</p>
                                <p className="text-[10px] text-slate-400">{record.employeeId || ""}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-[11px] text-slate-600">{record.department || "--"}</td>
                          <td className="px-5 py-4">
                            <span className="text-[12px] font-semibold text-slate-800">
                              {record.checkIn ? formatTime12h(record.checkIn) : "--"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[12px] font-semibold text-slate-800">
                              {record.checkOut ? formatTime12h(record.checkOut) : "--"}
                            </span>
                          </td>
                          <td className="px-5 py-4"><StatusBadge status={record.status} /></td>
                          <td className="px-5 py-4 text-[12px] font-semibold text-slate-700">
                            {formatDuration(record.totalHours ?? record.workingHours)}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => openDetail(record)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                            >
                              <Eye size={15} strokeWidth={2.5} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4 text-left">Employee</th>
                      <th className="px-5 py-4 text-left">Department</th>
                      <th className="px-5 py-4 text-left">Date</th>
                      <th className="px-5 py-4 text-left">Requested Change</th>
                      <th className="px-5 py-4 text-left">Status</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredCorrections.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-20 text-slate-400 font-semibold">
                          No correction requests found.
                        </td>
                      </tr>
                    ) : (
                      filteredCorrections.map((correction, idx) => (
                        <tr key={correction.id || correction.correctionId || idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-[11px]">
                                {getEmployeeInitials(correction.employeeName)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[12px] font-bold text-slate-800 truncate">{correction.employeeName || "--"}</p>
                                <p className="text-[10px] text-slate-400">{correction.employeeId || ""}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-[11px] text-slate-600">{correction.department || "--"}</td>
                          <td className="px-5 py-4 text-[12px] font-semibold text-slate-700">{correction.date || "--"}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-500">In:</span>
                              <span className="text-[11px] font-bold text-amber-600">
                                {correction.requestedCheckIn ? formatTime12h(correction.requestedCheckIn) : "--"}
                              </span>
                              <span className="text-[11px] text-slate-300 mx-0.5">|</span>
                              <span className="text-[11px] text-slate-500">Out:</span>
                              <span className="text-[11px] font-bold text-amber-600">
                                {correction.requestedCheckOut ? formatTime12h(correction.requestedCheckOut) : "--"}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4"><StatusBadge status={correction.status} /></td>
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => setCorrectionModal(correction)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                            >
                              <Eye size={15} strokeWidth={2.5} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </PageFrame>

      {/* Employee Detail Slide-In */}
      <EmployeeAttendanceDetailView
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        employeeName={detailEmployee.name}
        department={detailEmployee.department}
        userId={detailEmployee.userId}
        selectedDate={selectedDate}
      />

      {/* Correction Detail Modal */}
      <CorrectionDetailModal
        record={correctionModal}
        open={correctionModal !== null}
        onClose={() => setCorrectionModal(null)}
        onAction={handleCorrectionAction}
        acting={acting}
      />
    </div>
  );
}
