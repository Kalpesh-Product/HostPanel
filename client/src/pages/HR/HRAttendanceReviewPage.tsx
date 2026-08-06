import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Eye, X, Clock, CheckCircle2, XCircle, AlertCircle,
  AlertTriangle, Users, Building2, ChevronDown, Calendar,
  Filter, Check, Ban, Loader2, User, MapPin, Navigation, Coffee, Settings, Edit3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import PageFrame from "@/components/Pages/PageFrame";
import { HRAttendanceReviewSkeleton } from "@/components/ui/Skeleton";
import { getEmployeeManagementOverview } from "@/services/hr";
import {
  getHrAttendanceReview,
  getAttendanceGeofence,
  getAttendanceSettings,
  resolveAttendanceGeofenceUrl,
  reviewAttendanceCorrection,
  updateAttendanceGeofence,
  updateAttendanceSettings,
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

interface CorrectionBreakAdjustment {
  breakIndex: number;
  originalStart?: string;
  originalEnd?: string;
  requestedStart?: string;
  requestedEnd?: string;
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
  breaks?: CorrectionBreakAdjustment[];
  requestedAt?: string;
  submittedOn?: string;
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

interface AttendanceSettingsConfig {
  weeklyWorkingHours: number | null;
  workingHoursStart: string;
  workingHoursEnd: string;
  breakDurationMinutes: number | null;
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

const DATE_FILTER_OPTIONS: { key: "today" | "month" | "custom"; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom Range" },
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
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-pmedium uppercase tracking-wider border ${colorMap[color] || colorMap.slate}`}>
      {status && ["present", "approved"].includes(status.toLowerCase()) ? <CheckCircle2 size={12} /> : null}
      {status && status.toLowerCase() === "pending" ? <Clock size={12} /> : null}
      {status && ["absent", "rejected"].includes(status.toLowerCase()) ? <XCircle size={12} /> : null}
      {status && status.toLowerCase() === "late" ? <AlertTriangle size={12} /> : null}
      {label}
    </span>
  );
}

// Role names come back lowercase from the API (e.g. "super_admin") — display
// them Title_Cased ("Super_Admin") without touching acronyms that are
// already uppercase (e.g. "HR").
function formatRoleLabel(role?: string): string {
  const value = String(role || "").trim();
  if (!value) return "--";
  return value.replace(/(^|[_\s])([a-z])/g, (_match, sep, letter) => `${sep}${letter.toUpperCase()}`);
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
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
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
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-pbold text-slate-900 flex items-center gap-2">
                <Edit3 size={18} className="text-amber-500" />
                Correction Details
              </h2>
              <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm hover:scale-110 transition-transform"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[15px] font-pbold text-slate-700">{record.employeeName || "--"}</p>
                  <StatusBadge status={record.status} />
                  
                </div>
                <p className="text-[12px] font-pmedium m text-slate-800">{record.department || "--"} </p>
                <p className="text-[10px] font-pmedium text-slate-500">Attendance date: {formatLongDate(record.date)} </p>
                <p className="mt-1 text-[10px] font-pmedium text-slate-500">Submitted on {formatLongDate(record.submittedOn)}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Original Check In</p>
                  <p className="text-sm font-pbold text-slate-900">{record.originalCheckIn ? formatTime12h(record.originalCheckIn) : "--"}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Requested Check In</p>
                  <p className="text-sm font-pbold text-[#2563EB]">{record.requestedCheckIn ? formatTime12h(record.requestedCheckIn) : "--"}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Original Check Out</p>
                  <p className="text-sm font-pbold text-slate-900">{record.originalCheckOut ? formatTime12h(record.originalCheckOut) : "--"}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Requested Check Out</p>
                  <p className="text-sm font-pbold text-[#2563EB]">{record.requestedCheckOut ? formatTime12h(record.requestedCheckOut) : "--"}</p>
                </div>
              </div>

              {(record.breaks || []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Break Adjustments</p>
                  {record.breaks!.map((breakAdjustment) => (
                    <div key={breakAdjustment.breakIndex} className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-xl p-3 border border-slate-100">
                        <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Original Break {breakAdjustment.breakIndex + 1}</p>
                        <p className="text-sm font-pbold text-slate-900">{breakAdjustment.originalStart ? formatTime12h(breakAdjustment.originalStart) : "--"} – {breakAdjustment.originalEnd ? formatTime12h(breakAdjustment.originalEnd) : "--"}</p>
                      </div>
                      <div className="bg-white rounded-xl p-3 border border-slate-100">
                        <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Requested Break {breakAdjustment.breakIndex + 1}</p>
                        <p className="text-sm font-pbold text-[#2563EB]">{breakAdjustment.requestedStart ? formatTime12h(breakAdjustment.requestedStart) : "--"} – {breakAdjustment.requestedEnd ? formatTime12h(breakAdjustment.requestedEnd) : "--"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <p className="text-[9px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Reason</p>
                <p className="text-xs font-pbold text-amber-800">{record.reason || "No reason provided."}</p>
              </div>

              {record.rejectionReason && (
                <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
                  <p className="text-[9px] font-pmedium text-rose-600 uppercase tracking-widest mb-1">Rejection Reason</p>
                  <p className="text-xs font-pbold text-rose-800">{record.rejectionReason}</p>
                </div>
              )}

              {record.actionedBy && (
                <p className="text-[10px] font-pmedium text-slate-500 text-right">Actioned by: <span className="font-pbold">{record.actionedBy}</span></p>
              )}

              {record.status?.toLowerCase() === "pending" && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest block mb-1">
                      Rejection Reason <span className="text-slate-300 normal-case">(required if rejecting)</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      rows={2}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none placeholder:text-slate-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAction(record.correctionId || record.id || "", "approved")}
                      disabled={acting}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-[11px] font-pmedium uppercase tracking-wider hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50"
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
                      className="flex-1 flex items-center justify-center gap-1.5 bg-rose-500 text-white px-4 py-2.5 rounded-2xl text-[11px] font-pmedium uppercase tracking-wider hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {acting ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
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
  const [dateFilterMode, setDateFilterMode] = useState<"today" | "month" | "custom">("today");
  const [customFrom, setCustomFrom] = useState(getLocalDateString);
  const [customTo, setCustomTo] = useState(getLocalDateString);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalEmployees: 0, present: 0, absent: 0, late: 0, halfDay: 0,
    totalRecords: 0, pendingCorrections: 0, approvedCorrections: 0, rejectedCorrections: 0,
  });

  /* Detail view state */
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
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettingsConfig>({
    weeklyWorkingHours: null,
    workingHoursStart: "",
    workingHoursEnd: "",
    breakDurationMinutes: null,
  });

  const { rangeFrom, rangeTo } = useMemo(() => {
    const today = getLocalDateString();
    if (dateFilterMode === "month") {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { rangeFrom: getLocalDateString(first), rangeTo: getLocalDateString(last) };
    }
    if (dateFilterMode === "custom") {
      const from = customFrom || today;
      const to = customTo || from;
      return from <= to ? { rangeFrom: from, rangeTo: to } : { rangeFrom: to, rangeTo: from };
    }
    return { rangeFrom: today, rangeTo: today };
  }, [dateFilterMode, customFrom, customTo]);

  const isAttendanceFullyConfigured = useMemo(() => {
    const geofenceReady = geofenceConfig.enabled && geofenceConfig.latitude != null && geofenceConfig.longitude != null;
    const settingsReady = attendanceSettings.weeklyWorkingHours != null
      && Boolean(attendanceSettings.workingHoursStart)
      && Boolean(attendanceSettings.workingHoursEnd)
      && attendanceSettings.breakDurationMinutes != null;
    return geofenceReady && settingsReady;
  }, [geofenceConfig, attendanceSettings]);

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
      getHrAttendanceReview({ from: rangeFrom, to: rangeTo }),
      getAttendanceGeofence().catch(() => null),
      getAttendanceSettings().catch(() => null),
      getEmployeeManagementOverview().catch(() => null),
    ] as const)
      .then(([data, geofenceResult, settingsResult, overviewResult]: [any, any, any, any]) => {
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
        const nextSettings = settingsResult?.data?.settings || settingsResult?.settings || null;
        if (nextSettings) {
          setAttendanceSettings({
            weeklyWorkingHours: nextSettings.weeklyWorkingHours != null ? Number(nextSettings.weeklyWorkingHours) : null,
            workingHoursStart: nextSettings.workingHoursStart || "",
            workingHoursEnd: nextSettings.workingHoursEnd || "",
            breakDurationMinutes: nextSettings.breakDurationMinutes != null ? Number(nextSettings.breakDurationMinutes) : null,
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
        if (!cancelled) {
          setLoading(false);
          hasLoadedOnceRef.current = true;
        }
      });
    return () => { cancelled = true; };
  }, [rangeFrom, rangeTo]);

  /* Filtered data */
  const filteredAttendance = useMemo(() => {
    // `records` already comes scoped to [rangeFrom, rangeTo] from the API —
    // no extra date filtering needed here, and a range can legitimately span
    // many days, each with its own row per employee.
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
    const deduped = new Map<string, AttendanceRecord>();
    list.forEach((record) => {
      const key = [
        String(record.userId || "").trim().toLowerCase(),
        String(record.employeeId || "").trim().toLowerCase(),
        String(record.employeeName || "").trim().toLowerCase(),
        String(record.date || "").trim(),
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
    return Array.from(deduped.values()).sort((a, b) => {
      const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
      if (dateCompare !== 0) return dateCompare;
      return String(a.employeeName || "").localeCompare(String(b.employeeName || ""));
    });
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
    if (!record.userId) {
      toast.error("Employee id not found.");
      return;
    }
    const recordDate = record.date || rangeTo;
    navigate(`/hr/attendance-review/${record.userId}`, {
      state: {
        month: recordDate.substring(0, 7),
        date: recordDate,
        name: record.employeeName || "Unknown",
        department: record.department || "--",
        employeeId: record.employeeId || "",
      },
    });
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

  const handleSaveAttendanceSettings = async () => {
    if (attendanceSettings.weeklyWorkingHours == null || !attendanceSettings.workingHoursStart || !attendanceSettings.workingHoursEnd || attendanceSettings.breakDurationMinutes == null) {
      toast.error("Fill in weekly working hours, working hours start/end, and break duration.");
      return;
    }
    setGeofenceSaving(true);
    try {
      const geofenceResponse = await updateAttendanceGeofence({
        enabled: true,
        latitude: geofenceConfig.latitude,
        longitude: geofenceConfig.longitude,
        radiusMeters: geofenceConfig.radiusMeters,
      });
      const nextGeofence = geofenceResponse?.data?.geofence || geofenceResponse?.geofence || geofenceResponse || null;
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

      const settingsResponse = await updateAttendanceSettings({
        weeklyWorkingHours: attendanceSettings.weeklyWorkingHours,
        workingHoursStart: attendanceSettings.workingHoursStart,
        workingHoursEnd: attendanceSettings.workingHoursEnd,
        breakDurationMinutes: attendanceSettings.breakDurationMinutes,
      });
      const nextSettings = settingsResponse?.data?.settings || settingsResponse?.settings || null;
      if (nextSettings) {
        setAttendanceSettings({
          weeklyWorkingHours: nextSettings.weeklyWorkingHours != null ? Number(nextSettings.weeklyWorkingHours) : null,
          workingHoursStart: nextSettings.workingHoursStart || "",
          workingHoursEnd: nextSettings.workingHoursEnd || "",
          breakDurationMinutes: nextSettings.breakDurationMinutes != null ? Number(nextSettings.breakDurationMinutes) : null,
        });
      }

      toast.success("Attendance settings updated.");
      setShowGeofenceModal(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update attendance settings.");
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

  if (loading && !hasLoadedOnceRef.current) return <HRAttendanceReviewSkeleton />;

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
                className={`flex-1 min-w-[120px] rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
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
                    <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">
                      {card.label}
                    </p>
                    <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
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

            {/* Data panel header row — status sub-tabs first, then a gap,
                then the date-range sub-tabs, then search, then the button. */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-wrap items-center gap-3 sm:gap-4 bg-slate-50/50">
              <div className="flex items-center gap-1.5">
                {(activeTab === "attendance-master" ? ATTENDANCE_FILTER_PILLS : CORRECTION_FILTER_PILLS).map((pill) => (
                  <button
                    key={pill.key}
                    onClick={() => setStatusFilter(pill.key)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${
                      statusFilter === pill.key
                        ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                        : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 xl:ml-4">
                {DATE_FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setDateFilterMode(opt.key)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${
                      dateFilterMode === opt.key
                        ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                        : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {dateFilterMode === "custom" && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="pl-9 pr-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                    />
                  </div>
                  <span className="text-[11px] font-pmedium text-slate-400">to</span>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="pl-9 pr-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="relative flex-1 min-w-[180px] xl:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder={activeTab === "attendance-master" ? "Search employees..." : "Search requests..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {!isAttendanceFullyConfigured && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-pmedium uppercase tracking-widest text-amber-700">
                  <AlertTriangle size={12} />
                  Not configured
                </span>
              )}

              <button
                type="button"
                onClick={() => setShowGeofenceModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-2.5 text-xs font-pmedium uppercase text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                <Settings size={13} />
                Attendance Settings
              </button>

              {loading && hasLoadedOnceRef.current && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">
                  <Loader2 size={12} className="animate-spin" />
                  Updating
                </span>
              )}
            </div>

            {/* Table */}
            <div className={`overflow-x-auto transition-opacity duration-200 ${loading && hasLoadedOnceRef.current ? "opacity-50" : "opacity-100"}`}>
              {activeTab === "attendance-master" ? (
                <table className="w-full">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
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
                        <td colSpan={10} className="text-center py-20 text-slate-400 font-pmedium">
                          No attendance records found.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map((record, idx) => (
                        <tr key={record.id || record.recordId || idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4 text-[11px] font-pmedium text-slate-700">
                            {record.employeeId || "--"}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <User size={14} className="text-slate-400" />
                              <p className="text-[12px] font-pmedium text-slate-800 truncate">{record.employeeName || "--"}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600">{record.department || "--"}</td>
                          <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600">{formatRoleLabel(record.employeeRole)}</td>
                          <td className="px-5 py-4 text-[11px] font-pmedium text-slate-700">{formatLongDate(record.date)}</td>
                          <td className="px-5 py-4">
                            <span className="text-[12px] font-pmedium text-slate-800">
                              {record.checkIn ? formatTime12h(record.checkIn) : "--"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[12px] font-pmedium text-slate-800">
                              {record.checkOut ? formatTime12h(record.checkOut) : "--"}
                            </span>
                          </td>
                          <td className="px-5 py-4"><StatusBadge status={record.status} /></td>
                          <td className="px-5 py-4 text-[12px] font-pmedium text-slate-700">
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
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      {/* <th className="px-5 py-4 text-left">Emp ID</th> */}
                      <th className="px-5 py-4 text-left">Employee</th>
                      <th className="px-5 py-4 text-left">Department</th>
                      <th className="px-5 py-4 text-left">Attendance Date</th>
                      <th className="px-5 py-4 text-left">Submitted On</th>
                      <th className="px-5 py-4 text-left">Current</th>
                      <th className="px-5 py-4 text-left">Requested</th>
                      <th className="px-5 py-4 text-left">Status</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredCorrections.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-20 text-slate-400 font-pmedium">
                          No correction requests found.
                        </td>
                      </tr>
                    ) : (
                      filteredCorrections.map((correction, idx) => (
                        <tr key={correction.id || correction.correctionId || idx} className="hover:bg-slate-50/50 transition-colors group">
                          {/* <td className="px-5 py-4 text-[11px] font-pmedium text-slate-700">{correction.employeeId || "--"}</td> */}
                          <td className="px-5 py-4">
                            <div className="font-pmedium text-slate-900 flex items-center gap-2 text-[12px]">
                              <User size={14} className="text-slate-400" />
                              {correction.employeeName || "--"}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-[11px] font-pmedium text-slate-700">{correction.department || "--"}</td>
                          <td className="px-5 py-4 text-[12px] font-pmedium text-slate-700">{formatLongDate(correction.date)}</td>
                          <td className="px-5 py-4 text-[12px] font-pmedium text-slate-500">{formatLongDate(correction.submittedOn)}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-500">In:</span>
                              <span className="text-[11px] font-pmedium text-slate-600">
                                {correction.originalCheckIn ? formatTime12h(correction.originalCheckIn) : "--"}
                              </span>
                              <span className="text-[11px] text-slate-300 mx-0.5">|</span>
                              <span className="text-[11px] text-slate-500">Out:</span>
                              <span className="text-[11px] font-pmedium text-slate-600">
                                {correction.originalCheckOut ? formatTime12h(correction.originalCheckOut) : "--"}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-500">In:</span>
                              <span className="text-[11px] font-pmedium text-[#2563EB]">
                                {correction.requestedCheckIn ? formatTime12h(correction.requestedCheckIn) : "--"}
                              </span>
                              <span className="text-[11px] text-slate-300 mx-0.5">|</span>
                              <span className="text-[11px] text-slate-500">Out:</span>
                              <span className="text-[11px] font-pmedium text-[#2563EB]">
                                {correction.requestedCheckOut ? formatTime12h(correction.requestedCheckOut) : "--"}
                              </span>
                              {(correction.breaks || []).length > 0 && (
                                <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-[#2563EB] text-[10px] font-pmedium">
                                  <Coffee size={10} /> {correction.breaks!.length}
                                </span>
                              )}
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
            className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
            onClick={() => !geofenceSaving && setShowGeofenceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h2 className="text-lg font-pbold text-slate-900 flex items-center gap-2">
                    <Settings size={18} className="text-amber-500" />
                    Attendance Settings
                  </h2>
                  <p className="mt-1 text-[11px] font-pmedium text-slate-500">
                    Working hours, break duration and geofence — required before employees can clock in or out.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGeofenceModal(false)}
                  className="p-2 bg-white rounded-full shadow-sm hover:scale-110 transition-transform"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[74vh] overflow-y-auto p-6 space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <Clock size={12} /> Working Hours & Weekly Target
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <label className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Start</label>
                      <input
                        type="time"
                        value={attendanceSettings.workingHoursStart}
                        onChange={(e) => setAttendanceSettings((current) => ({ ...current, workingHoursStart: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-900 outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">End</label>
                      <input
                        type="time"
                        value={attendanceSettings.workingHoursEnd}
                        onChange={(e) => setAttendanceSettings((current) => ({ ...current, workingHoursEnd: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-900 outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400 flex items-center gap-1"><Coffee size={10} /> Break (min)</label>
                      <input
                        type="number"
                        min={0}
                        max={480}
                        value={attendanceSettings.breakDurationMinutes ?? ""}
                        onChange={(e) => setAttendanceSettings((current) => ({ ...current, breakDurationMinutes: e.target.value === "" ? null : Number(e.target.value) }))}
                        className="mt-1 w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-900 outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        placeholder="60"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Weekly hours</label>
                      <input
                        type="number"
                        min={1}
                        max={168}
                        value={attendanceSettings.weeklyWorkingHours ?? ""}
                        onChange={(e) => setAttendanceSettings((current) => ({ ...current, weeklyWorkingHours: e.target.value === "" ? null : Number(e.target.value) }))}
                        className="mt-1 w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-900 outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        placeholder="40"
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] font-pmedium text-slate-500">
                    Employees checking in after start time + a 30-minute grace period are marked late.
                  </p>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
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
                          <p className="mt-3 text-sm font-pmedium text-slate-900">Geofence map</p>
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
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Map URL</p>
                    <input
                      type="text"
                      value={geofenceMapUrl}
                      onChange={(e) => handleGeofenceMapUrlChange(e.target.value)}
                      className={`mt-2 w-full px-4 py-2.5 bg-white border rounded-lg text-[12px] font-pmedium text-slate-900 outline-none focus:ring-2 ${geofenceMapError ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-slate-200/60 focus:border-[#2563EB] focus:ring-[#2563EB]/20"}`}
                      placeholder="Paste a Google Maps link or lat,lng"
                    />
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-pmedium text-slate-600">
                      <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                        <span className="block text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Latitude</span>
                        <span className="mt-1 block truncate text-slate-900">
                          {geofenceConfig.latitude != null ? geofenceConfig.latitude.toFixed(6) : "--"}
                        </span>
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                        <span className="block text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Longitude</span>
                        <span className="mt-1 block truncate text-slate-900">
                          {geofenceConfig.longitude != null ? geofenceConfig.longitude.toFixed(6) : "--"}
                        </span>
                      </div>
                    </div>
                    {geofenceMapError ? (
                      <p className="mt-2 text-[11px] font-pmedium text-red-600">{geofenceMapError}</p>
                    ) : (
                      <p className="mt-2 text-[11px] font-pmedium text-slate-500">Check the URL to update the preview and location automatically.</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCheckGeofenceUrl}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-[11px] font-pmedium uppercase tracking-wider text-white transition-colors hover:bg-blue-700"
                    >
                      <MapPin size={13} />
                      Check
                    </button>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200/60 bg-white px-4 py-2 text-[11px] font-pmedium uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <Navigation size={13} />
                      Use current location
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Radius</p>
                        <p className="mt-1 text-2xl font-pbold text-slate-900">{Math.round(geofenceConfig.radiusMeters || 150)}m</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustGeofenceRadius(-100)}
                        className="rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        -100m
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustGeofenceRadius(-25)}
                        className="rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-50"
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
                        className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#2563EB]"
                      />
                      <button
                        type="button"
                        onClick={() => adjustGeofenceRadius(25)}
                        className="rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        +25m
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustGeofenceRadius(100)}
                        className="rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        +100m
                      </button>
                    </div>
                    <p className="mt-3 text-[11px] font-pmedium text-slate-500">
                      Coverage: {geofenceCoverage}
                    </p>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowGeofenceModal(false)}
                      className="flex-1 px-5 py-2.5 bg-slate-200 text-slate-700 rounded-2xl font-pmedium text-xs uppercase hover:bg-slate-300 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAttendanceSettings}
                      disabled={geofenceSaving}
                      className="flex-1 px-5 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-xs uppercase hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {geofenceSaving ? "Saving..." : "Save Attendance Settings"}
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
