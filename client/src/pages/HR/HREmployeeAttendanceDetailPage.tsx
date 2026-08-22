import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Building2,
  Clock,
  Coffee,
  Eye,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  Timer,
  TrendingUp,
  User,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageFrame from "@/components/Pages/PageFrame";
import { AttendanceSkeleton } from "@/components/ui/Skeleton";
import { getEmployeeAttendanceHistory } from "@/services/attendance";
import { getEmployeeManagementOverview } from "@/services/hr";
import { formatTime12h } from "@/utils/time";

type PunchSelfie = {
  action?: string;
  url?: string;
  uploadedAt?: string;
};

type AttendanceRecord = {
  recordId?: string;
  id?: string;
  userId?: string;
  employeeName?: string;
  employeeId?: string;
  employeeRole?: string;
  department?: string;
  date?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  source?: string;
  checkInLocation?: string;
  checkOutLocation?: string;
  checkInSelfie?: string;
  checkOutSelfie?: string;
  punchSelfies?: PunchSelfie[];
  totalHours?: number;
  workingHours?: string;
  overtime?: number;
  lateMinutes?: number;
  earlyMinutes?: number;
  breaks?: Array<{
    startTime?: string;
    endTime?: string;
    duration?: number;
    type?: string;
  }>;
  correction?: {
    requestedAt?: string;
    status?: string;
    reason?: string;
    originalCheckIn?: string;
    originalCheckOut?: string;
    requestedCheckIn?: string;
    requestedCheckOut?: string;
    actionedBy?: string;
    rejectionReason?: string;
  } | null;
};

const monthOptions = () => {
  const options: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    options.push({ label, value: `${year}-${month}` });
  }
  return options;
};

const monthLabel = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const formatLongDate = (value?: string) => {
  if (!value) return "--";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
};

const formatHours = (hours?: number) => {
  if (hours == null || Number.isNaN(Number(hours))) return "--";
  const h = Math.floor(Number(hours));
  const m = Math.round((Number(hours) - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const formatClockDuration = (minutes?: number) => {
  if (minutes == null || Number.isNaN(Number(minutes))) return "--";
  const value = Math.max(0, Number(minutes));
  if (value === 0) return "0m";
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const normalizeLookup = (value?: string | number | null) =>
  String(value ?? "").trim().toLowerCase();

const matchesAny = (value: string, candidates: Array<string | number | null | undefined>) =>
  candidates.some((candidate) => {
    const normalizedCandidate = normalizeLookup(candidate);
    return Boolean(value) && Boolean(normalizedCandidate) && normalizedCandidate === value;
  });

const getAttendanceEventLabel = (action = "") => {
  switch (String(action || "").toLowerCase()) {
    case "check_in":
      return "Check In";
    case "check_out":
      return "Check Out";
    case "break_start":
      return "Break Start";
    case "break_end":
      return "Break End";
    default:
      return String(action || "").replace(/_/g, " ");
  }
};

const getStatusTone = (status?: string) => {
  switch (String(status || "").toLowerCase()) {
    case "present":
    case "approved":
      return "emerald";
    case "late":
      return "amber";
    case "absent":
    case "rejected":
      return "rose";
    case "half-day":
    case "half_day":
      return "orange";
    case "pending":
      return "blue";
    default:
      return "slate";
  }
};

const toneStyles: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
};

function StatusBadge({ status }: { status?: string }) {
  const tone = getStatusTone(status);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-wider ${toneStyles[tone]}`}>
      {status && ["present", "approved"].includes(status.toLowerCase()) ? <CheckCircle2 size={11} /> : null}
      {status && status.toLowerCase() === "late" ? <AlertTriangle size={11} /> : null}
      {status && ["absent", "rejected"].includes(status.toLowerCase()) ? <XCircle size={11} /> : null}
      {status && status.toLowerCase() === "pending" ? <Clock size={11} /> : null}
      {String(status || "Unknown").replace(/_/g, " ")}
    </span>
  );
}

const statCardColorMap: Record<string, string> = {
  blue: "border-l-blue-500 bg-blue-50 text-blue-600",
  emerald: "border-l-emerald-500 bg-emerald-50 text-emerald-600",
  rose: "border-l-rose-500 bg-rose-50 text-rose-600",
  amber: "border-l-amber-500 bg-amber-50 text-amber-600",
};

function StatCard({
  label,
  value,
  icon: Icon,
  color = "blue",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color?: "blue" | "emerald" | "rose" | "amber";
}) {
  const iconClass = statCardColorMap[color] || statCardColorMap.blue;
  return (
    <div className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 ${iconClass.split(" ")[0]}`}>
      <div className="min-w-0">
        <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-[15px] font-pmedium text-slate-900">{value}</p>
      </div>
      <div className={`p-2 rounded-2xl ${iconClass.split(" ").slice(1).join(" ")}`}>
        <Icon size={16} />
      </div>
    </div>
  );
}

type GallerySelfie = { key: string; action: string; label: string; url: string; time: string };

function buildAttendanceDayImages(record: AttendanceRecord | null): GallerySelfie[] {
  if (!record) return [];
  const selfies = Array.isArray(record.punchSelfies) ? record.punchSelfies : [];
  const legacy: PunchSelfie[] = [
    record.checkInSelfie ? { action: "check_in", url: record.checkInSelfie, uploadedAt: "" } : null,
    record.checkOutSelfie ? { action: "check_out", url: record.checkOutSelfie, uploadedAt: "" } : null,
  ].filter(Boolean) as PunchSelfie[];

  const combined = [...selfies, ...legacy].filter((entry) => Boolean(entry?.url));
  const seen = new Set<string>();
  const normalized: GallerySelfie[] = [];
  combined.forEach((entry, idx) => {
    const action = String(entry?.action || "").toLowerCase();
    const url = String(entry?.url || "");
    const key = `${action}:${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push({
      key: `${action || "selfie"}-${idx}`,
      action,
      label: getAttendanceEventLabel(action),
      url,
      time: entry?.uploadedAt ? formatTime12h(entry.uploadedAt) : "",
    });
  });
  return normalized;
}

function AttendanceSelfieThumb({
  selfie,
  onClick,
  compact = false,
}: {
  selfie: GallerySelfie | null;
  onClick?: () => void;
  compact?: boolean;
}) {
  if (!selfie?.url) {
    return (
      <div className={`flex ${compact ? "h-28" : "h-36"} w-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[10px] font-pmedium uppercase tracking-wider text-slate-400`}>
        No image
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <img
        src={selfie.url}
        alt={selfie.label || "Attendance selfie"}
        className={`${compact ? "h-28" : "h-36"} w-full object-cover`}
        loading="lazy"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent px-3 py-2 text-[9px] font-pmedium uppercase tracking-wider text-white">
        {selfie.label}
      </div>
    </button>
  );
}

type TimelineItem = {
  key: string;
  type: "check_in" | "break" | "check_out";
  title: string;
  time: string;
  tone: "emerald" | "amber" | "blue";
  image?: GallerySelfie | null;
  duration?: number;
};

function buildAttendanceTimeline(record: AttendanceRecord, images: GallerySelfie[]): TimelineItem[] {
  const checkInImage = images.find((image) => image.action === "check_in") || null;
  const checkOutImage = images.find((image) => image.action === "check_out") || null;
  const breaks = Array.isArray(record.breaks) ? record.breaks : [];

  return [
    {
      key: "check-in",
      type: "check_in",
      title: "Check In",
      time: record.checkIn ? formatTime12h(record.checkIn) : "--:--",
      image: checkInImage,
      tone: "emerald",
    },
    ...breaks.map((entry, idx) => ({
      key: `break-${idx}`,
      type: "break" as const,
      title: `Break ${idx + 1}`,
      time: `${entry.startTime ? formatTime12h(entry.startTime) : "--:--"} - ${entry.endTime ? formatTime12h(entry.endTime) : "Active"}`,
      duration: entry.duration,
      tone: "amber" as const,
    })),
    {
      key: "check-out",
      type: "check_out",
      title: "Check Out",
      time: record.checkOut ? formatTime12h(record.checkOut) : "--:--",
      image: checkOutImage,
      tone: "blue",
    },
  ];
}

const toneIconClass: Record<TimelineItem["tone"], string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  blue: "bg-blue-50 text-blue-600",
};

export default function HREmployeeAttendanceDetailPage() {
  const navigate = useNavigate();
  const { userId = "" } = useParams();
  const location = useLocation();
  const navState = (location.state || {}) as Record<string, string | undefined>;
  const initialMonth = navState.month || new Date().toISOString().slice(0, 7);
  const employeeName = navState.name || "Employee";
  const employeeId = navState.employeeId || "";
  const department = navState.department || "--";

  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [weeklyHours, setWeeklyHours] = useState<{ workedHours?: number; targetHours?: number } | null>(null);
  const [employeeLabel, setEmployeeLabel] = useState(employeeName);
  const [employeeCode, setEmployeeCode] = useState(employeeId);
  const [employeeDept, setEmployeeDept] = useState(department);
  const [employeeRole, setEmployeeRole] = useState("");
  const [employeeProfile, setEmployeeProfile] = useState<Record<string, any> | null>(null);

  const [selectedDay, setSelectedDay] = useState<AttendanceRecord | null>(null);
  const [previewSelfie, setPreviewSelfie] = useState<GallerySelfie | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelectedDay(null);
    Promise.allSettled([
      getEmployeeAttendanceHistory(userId, { month: selectedMonth }),
      getEmployeeManagementOverview(),
    ])
      .then(([historyResult, overviewResult]) => {
        if (cancelled) return;

        const historyData = historyResult.status === "fulfilled" ? historyResult.value : null;
        const nextRecords = Array.isArray(historyData?.records) ? historyData.records : Array.isArray(historyData) ? historyData : [];
        setRecords(nextRecords);
        setWeeklyHours(historyData?.stats?.weeklyHours ?? null);

        const employees = overviewResult.status === "fulfilled" && Array.isArray(overviewResult.value?.data?.employees)
          ? overviewResult.value.data.employees
          : [];
        const targetUserId = normalizeLookup(userId);
        const targetEmployeeId = normalizeLookup(employeeId);
        const profile = employees.find((entry: Record<string, any>) => {
          const candidateUserId = normalizeLookup(entry?.userId || entry?.linkedUserId || entry?._id || entry?.id);
          const candidateEmployeeId = normalizeLookup(entry?.employeeId || entry?.employeeNumber || entry?.employeeCode);
          const candidateLinkedMember = normalizeLookup(entry?.linkedWorkspaceMemberId);
          return matchesAny(targetUserId, [candidateUserId, candidateLinkedMember]) ||
            matchesAny(targetEmployeeId, [candidateEmployeeId]);
        }) || null;

        const profileEmployee = historyData?.employee || profile;
        setEmployeeProfile(profileEmployee || null);
        if (profileEmployee) {
          setEmployeeLabel(profileEmployee.fullName || profileEmployee.name || employeeName);
          setEmployeeCode(profileEmployee.employeeId || profileEmployee.employeeNumber || employeeId);
          setEmployeeDept(profileEmployee.department || profileEmployee.departmentDisplay || department);
          setEmployeeRole(profileEmployee.role || profileEmployee.workspaceRole?.name || profileEmployee.rawRole || "");
        }
        if (!profileEmployee && nextRecords.length > 0) {
          setEmployeeRole(nextRecords[0]?.employeeRole || "");
        }
      })
      .catch(() => {
        if (!cancelled) setRecords([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, selectedMonth, employeeName, employeeId, department]);

  const totals = useMemo(() => {
    const presentStatuses = new Set(["present", "late", "half-day", "half_day"]);
    const presentCount = records.filter((r) => presentStatuses.has(String(r.status || "").toLowerCase())).length;
    const absentCount = records.filter((r) => String(r.status || "").toLowerCase() === "absent").length;
    const lateCount = records.filter((r) => String(r.status || "").toLowerCase() === "late").length;
    const breakMinutes = records.reduce((sum, record) => (
      sum + (Array.isArray(record.breaks) ? record.breaks.reduce((bSum, b) => bSum + (Number(b.duration) || 0), 0) : 0)
    ), 0);
    const monthlyHours = records.reduce((sum, record) => sum + (Number(record.totalHours) || 0), 0);
    return {
      presentCount,
      absentCount,
      lateCount,
      breakMinutes,
      monthlyHours,
      totalDays: records.length,
    };
  }, [records]);

  const employeeDepartments = useMemo(() => {
    const rawDepartments =
      employeeProfile?.departmentNames ||
      employeeProfile?.departments ||
      employeeProfile?.department ||
      [];
    const list = Array.isArray(rawDepartments) ? rawDepartments : [rawDepartments];
    return list.filter(Boolean).map((value) => String(value)).slice(0, 4);
  }, [employeeProfile]);

  // Founders/owners/super admins conceptually span every department, so
  // listing their individual department chips is redundant - show one badge.
  const isFullAccessRole = useMemo(() => {
    const normalized = String(employeeRole || "").trim().toLowerCase();
    return normalized.includes("founder") || normalized.includes("owner") || normalized.includes("super") && normalized.includes("admin");
  }, [employeeRole]);

  const employeeMetaItems = useMemo(() => {
    if (!employeeProfile) return [];
    return [
      { label: "Email", value: String(employeeProfile.email || "--") },
      { label: "Role", value: String(employeeProfile.workspaceRole?.name || employeeProfile.role || employeeProfile.rawRole || "--") },
      { label: "Work Mode", value: String(employeeProfile.workMode || "--") },
      { label: "Joining Date", value: String(employeeProfile.joiningDate || employeeProfile.joinDate || "--") },
    ];
  }, [employeeProfile]);

  const profileSummaryCards: Array<{ label: string; value: string | number; icon: React.ComponentType<{ size?: number; className?: string }>; color: "blue" | "emerald" | "rose" | "amber" }> = [
    {
      label: "Weekly Hours",
      value: weeklyHours?.targetHours != null
        ? `${formatHours(weeklyHours?.workedHours)} / ${formatHours(weeklyHours?.targetHours)}`
        : formatHours(weeklyHours?.workedHours),
      icon: Clock,
      color: "blue",
    },
    { label: "Monthly Hours", value: formatHours(totals.monthlyHours), icon: TrendingUp, color: "amber" },
    { label: "Present Days", value: totals.presentCount, icon: CheckCircle2, color: "emerald" },
    { label: "Absent Days", value: totals.absentCount, icon: XCircle, color: "rose" },
  ];

  const dayImages = useMemo(() => buildAttendanceDayImages(selectedDay), [selectedDay]);
  const dayTimeline = useMemo(() => (selectedDay ? buildAttendanceTimeline(selectedDay, dayImages) : []), [selectedDay, dayImages]);

  const openPreview = (selfie: GallerySelfie | null) => {
    if (!selfie?.url) return;
    setPreviewSelfie(selfie);
  };

  return (
    <PageFrame>
      <div className="min-h-screen from-slate-50 via-white to-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-pmedium uppercase tracking-widest text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600" size={13} />
              <select
                data-tour="hr-att-detail-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none rounded-full border border-blue-100 bg-blue-50/50 py-1.5 pl-9 pr-8 text-[10px] font-pmedium uppercase tracking-[0.24em] text-blue-700 outline-none cursor-pointer hover:bg-blue-50"
              >
                {monthOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-blue-600" size={12} />
            </div>
          </div>

          <div className="mb-6 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 from-slate-50 to-white px-6 py-5">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium uppercase tracking-[0.2em] text-blue-600">Employee Profile</p>
                <h1 className="mt-2 truncate text-2xl font-pmedium tracking-tight text-slate-900">{employeeLabel}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-pmedium text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1">
                    <User size={13} />
                    {employeeCode || "Employee ID missing"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1">
                    <Building2 size={13} />
                    {employeeDept}
                  </span>
                  {employeeRole ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                      <User size={13} />
                      {employeeRole}
                    </span>
                  ) : null}
                </div>
                {/* <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                  {isFullAccessRole ? (
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-pmedium text-slate-600">
                      All Departments
                    </span>
                  ) : employeeDepartments.length > 0 ? employeeDepartments.map((dept) => (
                    <span key={dept} className="rounded-full border border-slate-200 bg-white px-3 py-1 font-pmedium text-slate-600">
                      {dept}
                    </span>
                  )) : null}
                </div> */}
              </div>
            </div>

            <div data-tour="hr-att-detail-summary" className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-4">
              {profileSummaryCards.map((card) => (
                <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} color={card.color} />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm">
            <AnimatePresence mode="wait">
              {selectedDay ? (
                <motion.div
                  key="day-detail"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.2 }}
                  className="p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedDay(null)}
                      className="inline-flex items-center gap-2 text-[11px] font-pmedium uppercase tracking-widest text-blue-600 transition hover:underline"
                    >
                      <ArrowLeft size={14} /> Back to month attendance
                    </button>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-pmedium uppercase tracking-wider text-slate-500">
                      {dayImages.length} photos
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col gap-4 rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-pmedium uppercase tracking-[0.22em] text-slate-400">Attendance Day</p>
                      <h3 className="mt-1 text-xl font-pmedium text-slate-900">{formatLongDate(selectedDay.date)}</h3>
                      <p className="mt-1 text-xs font-pmedium text-slate-500">{selectedDay.department || employeeDept} &bull; {selectedDay.employeeRole || employeeRole}</p>
                    </div>
                    <StatusBadge status={selectedDay.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Check In</p>
                      <p className="mt-1 text-sm font-pmedium text-slate-900">{selectedDay.checkIn ? formatTime12h(selectedDay.checkIn) : "--:--"}</p>
                      {/* {selectedDay.checkInLocation ? (
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500"><MapPin size={10} /> {selectedDay.checkInLocation}</p>
                      ) : null} */}
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Check Out</p>
                      <p className="mt-1 text-sm font-pmedium text-slate-900">{selectedDay.checkOut ? formatTime12h(selectedDay.checkOut) : "--:--"}</p>
                      {/* {selectedDay.checkOutLocation ? (
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500"><MapPin size={10} /> {selectedDay.checkOutLocation}</p>
                      ) : null} */}
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Break Time</p>
                      <p className="mt-1 text-sm font-pmedium text-slate-900">
                        {formatClockDuration((selectedDay.breaks || []).reduce((sum, b) => sum + (Number(b.duration) || 0), 0))}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Worked</p>
                      <p className="mt-1 text-sm font-pmedium text-slate-900">{formatHours(selectedDay.totalHours)}</p>
                    </div>
                  </div>

                  {selectedDay.correction ? (
                    <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[9px] font-pmedium uppercase tracking-widest text-amber-500">Correction</p>
                        <StatusBadge status={selectedDay.correction.status} />
                      </div>
                      <p className="mt-1 text-[11px] font-pmedium text-amber-800">{selectedDay.correction.reason || "No correction reason provided."}</p>
                    </div>
                  ) : null}

                  <div className="mt-6">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-[11px] font-pmedium uppercase tracking-wider text-slate-400">Activity Feed</h4>
                      <span className="text-[10px] font-pmedium uppercase tracking-wider text-slate-400">Check-in, breaks, check-out</span>
                    </div>

                    <div className="mt-3 space-y-3">
                      {dayTimeline.map((item) => (
                        <div key={item.key} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneIconClass[item.tone]}`}>
                              {item.type === "break" ? <Coffee size={18} /> : item.type === "check_in" ? <LogIn size={18} /> : <LogOut size={18} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-pmedium uppercase tracking-[0.22em] text-slate-400">{item.title}</p>
                              <p className="mt-1 text-sm font-pmedium text-slate-900">{item.time}</p>
                              {item.type === "break" && item.duration ? (
                                <p className="mt-1 text-[11px] font-pmedium text-slate-500">{formatClockDuration(item.duration)}</p>
                              ) : null}
                            </div>
                          </div>

                          {item.type !== "break" && item.image ? (
                            <div className="mt-4 max-w-[220px]">
                              <AttendanceSelfieThumb selfie={item.image} onClick={() => openPreview(item.image || null)} compact />
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-[11px] font-pmedium uppercase tracking-wider text-slate-400">Selfie Gallery</h4>
                      <span className="text-[10px] font-pmedium uppercase tracking-wider text-slate-400">{dayImages.length} images</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {dayImages.map((selfie) => (
                        <AttendanceSelfieThumb key={selfie.key} selfie={selfie} onClick={() => openPreview(selfie)} />
                      ))}
                    </div>
                    {dayImages.length === 0 ? (
                      <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-[12px] font-pmedium text-slate-500">
                        No attendance selfies found for this day.
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="month-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div>
                      <p className="text-[10px] font-pmedium uppercase tracking-[0.28em] text-slate-400">Monthly Timeline</p>
                      <h2 className="mt-1 text-lg font-pmedium text-slate-900">Daily attendance records</h2>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-pmedium text-slate-600">
                      <Timer size={13} />
                      {totals.totalDays} days
                    </div>
                  </div>

                  <div className="max-h-[65vh] overflow-y-auto p-5">
                    {loading ? (
                      <AttendanceSkeleton />
                    ) : records.length === 0 ? (
                      <div className="flex min-h-[280px] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 text-center">
                        <div>
                          <RefreshCw size={22} className="mx-auto text-slate-400" />
                          <p className="mt-3 text-sm font-pmedium text-slate-700">No attendance records found.</p>
                          <p className="mt-1 text-[12px] font-pmedium text-slate-500">{monthLabel(selectedMonth)} does not have attendance entries yet.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-[1.5rem] border border-slate-100">
                        <div className="overflow-x-auto">
                          <table data-tour="hr-att-detail-table" className="w-full text-left">
                            <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/90 text-[10px] font-pmedium uppercase tracking-wider text-slate-500">
                              <tr>
                                <th className="px-5 py-4">Date</th>
                                <th className="px-5 py-4">In</th>
                                <th className="px-5 py-4">Out</th>
                                <th className="px-5 py-4 text-center">Break</th>
                                <th className="px-5 py-4 text-center">Hours</th>
                                <th className="px-5 py-4 text-center">Status</th>
                                <th className="px-5 py-4 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {records.map((record) => (
                                <tr key={record.recordId || record.id || record.date} className="hover:bg-slate-50/70">
                                  <td className="px-5 py-4 text-[12px] font-pmedium text-slate-900">{formatLongDate(record.date)}</td>
                                  <td className="px-5 py-4 text-[12px] font-pmedium text-slate-700">{record.checkIn ? formatTime12h(record.checkIn) : "--:--"}</td>
                                  <td className="px-5 py-4 text-[12px] font-pmedium text-slate-700">{record.checkOut ? formatTime12h(record.checkOut) : "--:--"}</td>
                                  <td className="px-5 py-4 text-center text-[12px] font-pmedium text-amber-600">
                                    {formatClockDuration((record.breaks || []).reduce((sum, b) => sum + (Number(b.duration) || 0), 0))}
                                  </td>
                                  <td className="px-5 py-4 text-center text-[12px] font-pmedium text-slate-900">{formatHours(record.totalHours)}</td>
                                  <td className="px-5 py-4 text-center"><StatusBadge status={record.status} /></td>
                                  <td className="px-5 py-4 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedDay(record)}
                                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                                    >
                                      <Eye size={12} /> View Log
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* {!selectedDay && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-pmedium uppercase tracking-[0.28em] text-slate-400">Employee Snapshot</p>
                <div className="mt-4 space-y-3">
                  {employeeMetaItems.length > 0 ? employeeMetaItems.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="text-sm font-pmedium text-slate-600">{item.label}</span>
                      <span className="max-w-[52%] truncate text-sm font-pmedium text-slate-900">{item.value}</span>
                    </div>
                  )) : (
                    <p className="text-[12px] font-pmedium text-slate-500">No profile details available.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-pmedium uppercase tracking-[0.28em] text-slate-400">Quick Summary</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-pmedium text-slate-600">Selected Month</span>
                    <span className="text-sm font-pmedium text-slate-900">{monthLabel(selectedMonth)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-pmedium text-slate-600">Late Days</span>
                    <span className="text-sm font-pmedium text-amber-700">{totals.lateCount}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-pmedium text-slate-600">Absent Days</span>
                    <span className="text-sm font-pmedium text-rose-700">{totals.absentCount}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-pmedium text-slate-600">Break Minutes</span>
                    <span className="text-sm font-pmedium text-slate-900">{formatClockDuration(totals.breakMinutes)}</span>
                  </div>
                </div>
              </div>
            </div>
          )} */}
        </div>
      </div>

      {/* Selfie lightbox */}
      <AnimatePresence>
        {previewSelfie && (
          <motion.div
            key="selfie-preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
            onClick={() => setPreviewSelfie(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              transition={{ duration: 0.16 }}
              className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-[10px] font-pmedium uppercase tracking-[0.22em] text-slate-400">
                    {previewSelfie.label || "Attendance selfie"}
                  </p>
                  <p className="mt-1 text-sm font-pmedium text-slate-500">{previewSelfie.time || "Captured selfie"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewSelfie(null)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 transition hover:bg-slate-50"
                >
                  <X size={14} />
                </button>
              </div>
              <img
                src={previewSelfie.url}
                alt={previewSelfie.label || "Attendance selfie preview"}
                className="max-h-[72vh] w-full object-contain bg-slate-900"
                loading="eager"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageFrame>
  );
}
