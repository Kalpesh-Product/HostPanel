import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Eye, X, Clock, CheckCircle2, XCircle, AlertCircle,
  AlertTriangle, Users, Building2, ChevronDown, Calendar,
  Filter, Check, Ban, Loader2, User, MapPin, Navigation,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import PageFrame from "@/components/Pages/PageFrame";
import { HRAttendanceReviewSkeleton } from "@/components/ui/Skeleton";
import { getEmployeeManagementOverview } from "@/services/hr";
import {
  getHrAttendanceReview,
  getAttendanceGeofence,
  resolveAttendanceGeofenceUrl,
  reviewAttendanceCorrection,
  updateAttendanceGeofence,
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

interface GeofenceConfig {
  enabled: boolean;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  updatedAt?: string | null;
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

function formatLongDate(value?: string): string {
  if (!value) return "--";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.getDate();
  const suffix = day % 10 === 1 && day !== 11
    ? "st"
    : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
        ? "rd"
        : "th";
  return `${day}${suffix} ${date.toLocaleDateString("en-US", { month: "long" })} ${date.getFullYear()}`;
}

function getEmployeeInitials(name: string = ""): string {
  return name.split(" ").filter(Boolean).map((p) => p[0]).join("").substring(0, 2).toUpperCase() || "E";
}

function formatGeofenceCoverage(radiusMeters: number): string {
  const safeRadius = Math.max(25, Number(radiusMeters) || 150);
  const areaSqMeters = Math.PI * safeRadius * safeRadius;
  if (areaSqMeters >= 1_000_000) {
    return `${(areaSqMeters / 1_000_000).toFixed(2)} km²`;
  }
  return `${Math.round(areaSqMeters).toLocaleString()} m²`;
}

function buildGeofenceShareUrl(latitude: number | null, longitude: number | null): string {
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return "";
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function decodeGeofenceValue(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function parseGeofenceUrl(input: string): { latitude: number; longitude: number } | null {
  const value = String(input || "").trim();
  if (!value) return null;

  const coordinateMatch =
    value.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i) ||
    value.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i) ||
    value.match(/!4d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/i) ||
    value.match(/(?:^|[?&/])q=(-?\d+(?:\.\d+)?)%2C(-?\d+(?:\.\d+)?)/i) ||
    value.match(/(?:^|[?&/])q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i) ||
    value.match(/(?:^|[?&/])ll=(-?\d+(?:\.\d+)?)%2C(-?\d+(?:\.\d+)?)/i) ||
    value.match(/(?:^|[?&/])center=(-?\d+(?:\.\d+)?)%2C(-?\d+(?:\.\d+)?)/i) ||
    value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);

  if (coordinateMatch) {
    const latitude = Number(coordinateMatch[1]);
    const longitude = Number(coordinateMatch[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  try {
    const url = new URL(value);
    const query = url.searchParams.get("q") || url.searchParams.get("ll") || url.searchParams.get("center");
    if (query) {
      const parts = query.split(",").map((item) => Number(item.trim()));
      if (parts.length >= 2 && parts.every((part) => Number.isFinite(part))) {
        return { latitude: parts[0], longitude: parts[1] };
      }
    }

    const pathMatch = url.href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
    if (pathMatch) {
      const latitude = Number(pathMatch[1]);
      const longitude = Number(pathMatch[2]);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    }
  } catch {
    // ignore invalid URL parsing and fall through to null
  }

  return null;
}

function extractGeofenceSearchTerm(input: string): string {
  const value = String(input || "").trim();
  if (!value) return "";

  try {
    const url = new URL(value);
    const query =
      url.searchParams.get("q") ||
      url.searchParams.get("query") ||
      url.searchParams.get("destination") ||
      url.searchParams.get("daddr") ||
      url.searchParams.get("ll") ||
      url.searchParams.get("center");

    if (query) return decodeGeofenceValue(query);

    const pathname = decodeGeofenceValue(url.pathname);
    const packedCoordinateMatch = pathname.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i) || pathname.match(/!4d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/i);
    if (packedCoordinateMatch) return `${packedCoordinateMatch[1]},${packedCoordinateMatch[2]}`;

    const placeMatch = pathname.match(/\/place\/([^/]+)/i);
    if (placeMatch?.[1]) return decodeGeofenceValue(placeMatch[1]);

    const searchMatch = pathname.match(/\/search\/([^/]+)/i);
    if (searchMatch?.[1]) return decodeGeofenceValue(searchMatch[1]);

    const dirMatch = pathname.match(/\/dir\/([^/]+)/i);
    if (dirMatch?.[1]) return decodeGeofenceValue(dirMatch[1]);

    const coordinateMatch = pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
    if (coordinateMatch) return `${coordinateMatch[1]},${coordinateMatch[2]}`;
  } catch {
    // ignore invalid URL parsing and fall back to raw text below
  }

  return value;
}

function buildGeofenceEmbedUrlFromInput(input: string): string {
  const parsed = parseGeofenceUrl(input);
  if (parsed) {
    return buildGeofenceIframeUrl(parsed.latitude, parsed.longitude);
  }

  const searchTerm = extractGeofenceSearchTerm(input);
  if (!searchTerm) return "";
  return `https://www.google.com/maps?q=${encodeURIComponent(searchTerm)}&output=embed`;
}

function buildGeofenceIframeUrl(latitude: number | null, longitude: number | null): string {
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return "";
  return `https://www.google.com/maps?q=${latitude},${longitude}&output=embed`;
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
      .then((data: any) => {
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
  const navigate = useNavigate();
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
  const [geofenceConfig, setGeofenceConfig] = useState<GeofenceConfig>({
    enabled: false,
    latitude: null,
    longitude: null,
    radiusMeters: 150,
    updatedAt: null,
  });
  const [geofenceSaving, setGeofenceSaving] = useState(false);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [geofenceMapUrl, setGeofenceMapUrl] = useState("");
  const [geofenceMapError, setGeofenceMapError] = useState("");
  const [geofencePreviewUrl, setGeofencePreviewUrl] = useState("");

  const geofenceMapEmbed = useMemo(() => geofencePreviewUrl, [geofencePreviewUrl]);

  const geofenceCoverage = useMemo(
    () => formatGeofenceCoverage(geofenceConfig.radiusMeters),
    [geofenceConfig.radiusMeters],
  );

  const geofenceCircleSize = useMemo(() => {
    const minRadius = 25;
    const maxRadius = 5000;
    const minSize = 96;
    const maxSize = 240;
    const radius = Math.max(minRadius, Math.min(maxRadius, Number(geofenceConfig.radiusMeters) || 150));
    const ratio = (radius - minRadius) / (maxRadius - minRadius);
    return Math.round(minSize + ratio * (maxSize - minSize));
  }, [geofenceConfig.radiusMeters]);

  /* Fetch data */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getHrAttendanceReview({ date: selectedDate }),
      getAttendanceGeofence().catch(() => null),
      getEmployeeManagementOverview().catch(() => null),
    ] as const)
      .then(([data, geofenceResult, overviewResult]: [any, any, any]) => {
        if (cancelled) return;
        const d = data || {};
        const attendanceList = Array.isArray(d.records) ? d.records : Array.isArray(data) ? data : [];
        const correctionList = Array.isArray(d.corrections) ? d.corrections : [];
        setRecords(attendanceList);
        setCorrections(correctionList);
        const nextGeofence = geofenceResult?.data?.geofence || geofenceResult?.geofence || geofenceResult || null;
        if (nextGeofence) {
          setGeofenceConfig({
            enabled: Boolean(nextGeofence.enabled),
            latitude: nextGeofence.latitude != null ? Number(nextGeofence.latitude) : null,
            longitude: nextGeofence.longitude != null ? Number(nextGeofence.longitude) : null,
            radiusMeters: Number(nextGeofence.radiusMeters || 150),
            updatedAt: nextGeofence.updatedAt || null,
          });
        }
        setStats({
          present: d.present ?? 0,
          absent: d.absent ?? 0,
          late: d.late ?? 0,
          halfDay: d.halfDay ?? 0,
          totalRecords: attendanceList.length,
          pendingCorrections: d.pendingCorrections ?? correctionList.filter((c: CorrectionRecord) => c.status?.toLowerCase() === "pending").length,
          approvedCorrections: d.approvedCorrections ?? correctionList.filter((c: CorrectionRecord) => c.status?.toLowerCase() === "approved").length,
          rejectedCorrections: d.rejectedCorrections ?? correctionList.filter((c: CorrectionRecord) => c.status?.toLowerCase() === "rejected").length,
          totalEmployees: overviewResult?.data?.summary?.totalEmployees ?? overviewResult?.data?.employees?.length ?? d.totalEmployees ?? attendanceList.length,
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
    let list = records.filter((record) => record.date === selectedDate);
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
    const deduped = new Map<string, AttendanceRecord>();
    list.forEach((record) => {
      const key = [
        String(record.userId || "").trim().toLowerCase(),
        String(record.employeeId || "").trim().toLowerCase(),
        String(record.employeeName || "").trim().toLowerCase(),
      ].filter(Boolean).join("|");
      const current = deduped.get(key);
      if (!current) {
        deduped.set(key, record);
        return;
      }
      const currentCheckIn = String(current.checkIn || "");
      const nextCheckIn = String(record.checkIn || "");
      if (nextCheckIn && (!currentCheckIn || nextCheckIn < currentCheckIn)) {
        deduped.set(key, record);
      }
    });
    return Array.from(deduped.values());
  }, [records, statusFilter, searchQuery, selectedDate]);

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
    if (!record.userId) {
      toast.error("Employee id not found.");
      return;
    }
    const params = new URLSearchParams({
      month: selectedDate.substring(0, 7),
      date: record.date || selectedDate,
      name: record.employeeName || "Unknown",
      department: record.department || "--",
      employeeId: record.employeeId || "",
    });
    navigate(`/hr/attendance-review/${record.userId}?${params.toString()}`);
  };

  useEffect(() => {
    if (!showGeofenceModal) return;
    const hasSavedGeofence =
      Number.isFinite(Number(geofenceConfig.latitude)) &&
      Number.isFinite(Number(geofenceConfig.longitude));
    if (hasSavedGeofence) {
      setGeofenceMapUrl(buildGeofenceShareUrl(geofenceConfig.latitude, geofenceConfig.longitude));
      setGeofencePreviewUrl(buildGeofenceIframeUrl(geofenceConfig.latitude, geofenceConfig.longitude));
    } else {
      setGeofenceMapUrl("");
      setGeofencePreviewUrl("");
    }
    setGeofenceMapError("");
  }, [showGeofenceModal, geofenceConfig.latitude, geofenceConfig.longitude]);

  const handleGeofenceMapUrlChange = (value: string) => {
    setGeofenceMapUrl(value);
    if (!String(value || "").trim()) {
      setGeofenceMapError("");
    }
  };

  const handleCheckGeofenceUrl = () => {
    const rawValue = geofenceMapUrl.trim();
    if (!rawValue) {
      setGeofenceMapError("Paste a Google Maps link or latitude,longitude pair.");
      setGeofencePreviewUrl("");
      return;
    }

    resolveAttendanceGeofenceUrl({ url: rawValue })
      .then((result: any) => {
        const latitude = result?.latitude != null ? Number(result.latitude) : null;
        const longitude = result?.longitude != null ? Number(result.longitude) : null;
        const embedUrl = result?.embedUrl || "";
        const shareUrl = result?.shareUrl || rawValue;

        if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
          setGeofenceConfig((current) => ({
            ...current,
            latitude,
            longitude,
          }));
        }

        setGeofenceMapError("");
        setGeofencePreviewUrl(embedUrl || (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
          ? buildGeofenceIframeUrl(latitude, longitude)
          : ""));
        setGeofenceMapUrl(shareUrl);

        if (!embedUrl && (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude)))) {
          toast.error("The link opened, but it did not resolve to map coordinates.");
        }
      })
      .catch((error: any) => {
        const fallbackParsed = parseGeofenceUrl(rawValue);
        if (fallbackParsed) {
          const latitude = Number(fallbackParsed.latitude.toFixed(6));
          const longitude = Number(fallbackParsed.longitude.toFixed(6));
          setGeofenceMapError("");
          setGeofenceConfig((current) => ({
            ...current,
            latitude,
            longitude,
          }));
          setGeofencePreviewUrl(buildGeofenceIframeUrl(latitude, longitude));
          setGeofenceMapUrl(buildGeofenceShareUrl(latitude, longitude));
          return;
        }

        setGeofenceMapError(error?.response?.data?.message || error?.message || "Paste a valid Google Maps link or location name.");
        setGeofencePreviewUrl("");
      });
  };

  const adjustGeofenceRadius = (delta: number) => {
    setGeofenceConfig((current) => ({
      ...current,
      radiusMeters: Math.max(25, Math.min(5000, Math.round((current.radiusMeters || 150) + delta))),
    }));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        setGeofenceConfig((current) => ({
          ...current,
          latitude,
          longitude,
        }));
        setGeofenceMapError("");
        setGeofenceMapUrl(buildGeofenceShareUrl(latitude, longitude));
        setGeofencePreviewUrl(buildGeofenceIframeUrl(latitude, longitude));
        toast.success("Current location added to geofence.");
      },
      (error) => {
        toast.error(error?.message || "Unable to fetch the current location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const handleSaveGeofence = async () => {
    setGeofenceSaving(true);
    try {
      const response = await updateAttendanceGeofence({
        enabled: true,
        latitude: geofenceConfig.latitude,
        longitude: geofenceConfig.longitude,
        radiusMeters: geofenceConfig.radiusMeters,
      });
      const nextGeofence = response?.data?.geofence || response?.geofence || response || null;
      if (nextGeofence) {
        setGeofenceConfig({
          enabled: Boolean(nextGeofence.enabled),
          latitude: nextGeofence.latitude != null ? Number(nextGeofence.latitude) : null,
          longitude: nextGeofence.longitude != null ? Number(nextGeofence.longitude) : null,
          radiusMeters: Number(nextGeofence.radiusMeters || 150),
          updatedAt: nextGeofence.updatedAt || null,
        });
        setGeofenceMapUrl(buildGeofenceShareUrl(nextGeofence.latitude, nextGeofence.longitude));
        setGeofencePreviewUrl(buildGeofenceIframeUrl(nextGeofence.latitude, nextGeofence.longitude));
      }
      toast.success("Attendance geofence updated.");
      setShowGeofenceModal(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update geofence.");
    } finally {
      setGeofenceSaving(false);
    }
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
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Monitor employee attendance and manage correction requests.
              </p>
            </div>
          </div>

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
                <button
                  type="button"
                  onClick={() => setShowGeofenceModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  <MapPin size={13} />
                  Geofence
                </button>
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
                      <th className="px-5 py-4 text-left">Emp ID</th>
                      <th className="px-5 py-4 text-left">Employee</th>
                      <th className="px-5 py-4 text-left">Department</th>
                      <th className="px-5 py-4 text-left">Role</th>
                      <th className="px-5 py-4 text-left">Date</th>
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
                        <td colSpan={10} className="text-center py-20 text-slate-400 font-semibold">
                          No attendance records found.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map((record, idx) => (
                        <tr key={record.id || record.recordId || idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4 text-[11px] font-black text-slate-700">
                            {record.employeeId || "--"}
                          </td>
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
                          <td className="px-5 py-4 text-[11px] text-slate-600">{record.employeeRole || "--"}</td>
                          <td className="px-5 py-4 text-[11px] font-semibold text-slate-700">{formatLongDate(record.date)}</td>
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

      <AnimatePresence>
        {showGeofenceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 px-3 py-4 backdrop-blur-md"
            onClick={() => !geofenceSaving && setShowGeofenceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="w-full max-w-2xl overflow-hidden rounded-[1.4rem] bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:px-5">
                <div className="max-w-2xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Geofencing</p>
                  <h3 className="mt-1.5 text-lg font-black tracking-tight text-slate-900">Define the office boundary</h3>
                  <p className="mt-1.5 text-[12px] leading-5 text-slate-500">
                    Paste a map link, check it, and the preview will update.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGeofenceModal(false)}
                  className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[74vh] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 space-y-3">
                <div className="relative overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-sm">
                  <div className="relative">
                    {geofenceMapEmbed ? (
                      <iframe
                        title="Attendance geofence map preview"
                        src={geofenceMapEmbed}
                        className="h-[240px] w-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    ) : (
                      <div className="flex h-[240px] items-center justify-center px-5 text-center bg-slate-50">
                        <div>
                          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <MapPin size={18} />
                          </div>
                          <p className="mt-3 text-sm font-bold text-slate-900">Geofence map</p>
                          <p className="mt-1 text-[12px] leading-5 text-slate-500">
                            The map stays blank until you check a URL or use current location.
                          </p>
                        </div>
                      </div>
                    )}

                    {geofenceMapEmbed && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div
                          className="relative rounded-full border-2 border-red-500/80 bg-red-500/15"
                          style={{ width: `${geofenceCircleSize}px`, height: `${geofenceCircleSize}px` }}
                        >
                          <div className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-600 shadow-lg" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Map URL</p>
                    <input
                      type="text"
                      value={geofenceMapUrl}
                      onChange={(e) => handleGeofenceMapUrlChange(e.target.value)}
                      className={`mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-[13px] font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/15 ${geofenceMapError ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-blue-500"}`}
                      placeholder="Paste a Google Maps link or lat,lng"
                    />
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600">
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Latitude</span>
                        <span className="mt-1 block truncate text-slate-900">
                          {geofenceConfig.latitude != null ? geofenceConfig.latitude.toFixed(6) : "--"}
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Longitude</span>
                        <span className="mt-1 block truncate text-slate-900">
                          {geofenceConfig.longitude != null ? geofenceConfig.longitude.toFixed(6) : "--"}
                        </span>
                      </div>
                    </div>
                    {geofenceMapError ? (
                      <p className="mt-2 text-[11px] font-semibold text-red-600">{geofenceMapError}</p>
                    ) : (
                      <p className="mt-2 text-[11px] font-semibold text-slate-500">Check the URL to update the preview and location automatically.</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCheckGeofenceUrl}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-700"
                    >
                      <MapPin size={13} />
                      Check
                    </button>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      <Navigation size={13} />
                      Use current location
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Radius</p>
                        <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{Math.round(geofenceConfig.radiusMeters || 150)}m</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustGeofenceRadius(-100)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        -100m
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustGeofenceRadius(-25)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        -25m
                      </button>
                      <input
                        type="range"
                        min={25}
                        max={5000}
                        step={25}
                        value={geofenceConfig.radiusMeters}
                        onChange={(e) => setGeofenceConfig((current) => ({ ...current, radiusMeters: Math.max(25, Math.min(5000, Number(e.target.value))) }))}
                        className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => adjustGeofenceRadius(25)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        +25m
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustGeofenceRadius(100)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        +100m
                      </button>
                    </div>
                    <p className="mt-3 text-[11px] font-semibold text-slate-500">
                      Coverage: {geofenceCoverage}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1 pb-0.5">
                    <button
                      type="button"
                      onClick={() => setShowGeofenceModal(false)}
                      className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveGeofence}
                      disabled={geofenceSaving}
                      className="flex-1 rounded-2xl bg-[#2563EB] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.28em] text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
                    >
                      {geofenceSaving ? "Saving..." : "Save geofence"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
