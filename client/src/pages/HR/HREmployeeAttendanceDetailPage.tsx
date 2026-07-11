import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Building2,
  Clock,
  Eye,
  Image as ImageIcon,
  MapPin,
  RefreshCw,
  Timer,
  TrendingUp,
  User,
  XCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import PageFrame from "@/components/Pages/PageFrame";
import { AttendanceSkeleton } from "@/components/ui/Skeleton";
import { getEmployeeAttendanceHistory } from "@/services/attendance";
import { getEmployeeManagementOverview } from "@/services/hr";
import { formatTime12h } from "@/utils/time";

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
  const day = date.getDate();
  const suffix = day % 10 === 1 && day !== 11
    ? "st"
    : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
        ? "rd"
        : "th";
  return `${day}${suffix} ${date.toLocaleDateString("en-US", { month: "long" })} ${date.getFullYear()}`;
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

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  hint?: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-pmedium uppercase tracking-[0.24em] text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</p>
          {hint ? <p className="mt-1 text-[11px] font-medium text-slate-500">{hint}</p> : null}
        </div>
        <div className="rounded-2xl bg-slate-50 p-2.5 text-slate-500">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export default function HREmployeeAttendanceDetailPage() {
  const navigate = useNavigate();
  const { userId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const selectedDate = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const employeeName = searchParams.get("name") || "Employee";
  const employeeId = searchParams.get("employeeId") || "";
  const department = searchParams.get("department") || "--";

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employeeLabel, setEmployeeLabel] = useState(employeeName);
  const [employeeCode, setEmployeeCode] = useState(employeeId);
  const [employeeDept, setEmployeeDept] = useState(department);
  const [employeeRole, setEmployeeRole] = useState("");
  const [employeeProfile, setEmployeeProfile] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      getEmployeeAttendanceHistory(userId, { month }),
      getEmployeeManagementOverview(),
    ])
      .then(([historyResult, overviewResult]) => {
        if (cancelled) return;

        const historyData = historyResult.status === "fulfilled" ? historyResult.value : null;
        const nextRecords = Array.isArray(historyData?.records) ? historyData.records : Array.isArray(historyData) ? historyData : [];
        setRecords(nextRecords);

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
  }, [userId, month, employeeName, employeeId, department]);

  const totals = useMemo(() => {
    const presentStatuses = new Set(["present", "late", "half-day", "half_day"]);
    const presentCount = records.filter((r) => presentStatuses.has(String(r.status || "").toLowerCase())).length;
    const absentCount = records.filter((r) => String(r.status || "").toLowerCase() === "absent").length;
    const lateCount = records.filter((r) => String(r.status || "").toLowerCase() === "late").length;
    const breakMinutes = records.reduce((sum, record) => (
      sum + (Array.isArray(record.breaks) ? record.breaks.reduce((bSum, b) => bSum + (Number(b.duration) || 0), 0) : 0)
    ), 0);
    const monthlyHours = records.reduce((sum, record) => sum + (Number(record.totalHours) || 0), 0);
    const weeklyHours = records.slice(-7).reduce((sum, record) => sum + (Number(record.totalHours) || 0), 0);
    return {
      presentCount,
      absentCount,
      lateCount,
      breakMinutes,
      monthlyHours,
      weeklyHours,
      totalDays: records.length,
    };
  }, [records]);

  const highlightedRecord = useMemo(
    () => records.find((record) => record.date === selectedDate) || null,
    [records, selectedDate],
  );

  const employeeDepartments = useMemo(() => {
    const rawDepartments =
      employeeProfile?.departmentNames ||
      employeeProfile?.departments ||
      employeeProfile?.department ||
      [];
    const list = Array.isArray(rawDepartments) ? rawDepartments : [rawDepartments];
    return list.filter(Boolean).map((value) => String(value)).slice(0, 4);
  }, [employeeProfile]);

  const employeeMetaItems = useMemo(() => {
    if (!employeeProfile) return [];
    return [
      { label: "Email", value: String(employeeProfile.email || "--") },
      { label: "Role", value: String(employeeProfile.workspaceRole?.name || employeeProfile.role || employeeProfile.rawRole || "--") },
      { label: "Work Mode", value: String(employeeProfile.workMode || "--") },
      { label: "Joining Date", value: String(employeeProfile.joiningDate || employeeProfile.joinDate || "--") },
    ];
  }, [employeeProfile]);

  const profileSummaryCards = [
    { label: "Weekly Hours", value: formatHours(totals.weeklyHours), hint: "Last 7 records", icon: Clock },
    { label: "Monthly Hours", value: formatHours(totals.monthlyHours), hint: "Selected month total", icon: TrendingUp },
    { label: "Present Days", value: totals.presentCount, hint: "Present, late, half-day", icon: CheckCircle2 },
    { label: "Absent Days", value: totals.absentCount, hint: "No attendance records", icon: XCircle },
  ];

  return (
    <PageFrame>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
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
            <div className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-pmedium uppercase tracking-[0.28em] text-blue-700">
              {formatLongDate(selectedDate)}
            </div>
          </div>

          <div className="mb-6 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-pmedium uppercase tracking-[0.3em] text-blue-600">Employee Profile</p>
                  <h1 className="mt-2 truncate text-2xl font-black tracking-tight text-slate-900">{employeeLabel}</h1>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-slate-500">
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1">
                      <Calendar size={13} />
                      {monthLabel(month)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    {employeeDepartments.length > 0 ? employeeDepartments.map((dept) => (
                      <span key={dept} className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
                        {dept}
                      </span>
                    )) : null}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-pmedium uppercase tracking-[0.28em] text-slate-400">Selected Date</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{formatLongDate(selectedDate)}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">Attendance timeline for the chosen day and month.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-4">
              {profileSummaryCards.map((card) => (
                <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} hint={card.hint} />
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-[10px] font-pmedium uppercase tracking-[0.28em] text-slate-400">Monthly Timeline</p>
                  <h2 className="mt-1 text-lg font-black text-slate-900">Daily attendance records</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  <Timer size={13} />
                  {totals.totalDays} days
                </div>
              </div>

              <div className="max-h-[72vh] overflow-y-auto p-5">
                {loading ? (
                  <AttendanceSkeleton />
                ) : records.length === 0 ? (
                  <div className="flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 text-center">
                    <div>
                      <RefreshCw size={22} className="mx-auto animate-spin text-slate-400" />
                      <p className="mt-3 text-sm font-bold text-slate-700">No attendance records found.</p>
                      <p className="mt-1 text-[12px] text-slate-500">The selected month does not have attendance entries yet.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {records.map((record, idx) => {
                      const isFocus = record.date === selectedDate;
                      return (
                        <motion.div
                          key={record.recordId || record.id || idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.02, 0.18) }}
                          className={`rounded-[1.5rem] border p-4 shadow-sm transition-all ${isFocus ? "border-blue-200 bg-blue-50/40" : "border-slate-100 bg-white hover:border-slate-200"}`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-pmedium uppercase tracking-[0.28em] text-slate-400">
                                {formatLongDate(record.date)}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <StatusBadge status={record.status} />
                                {record.source ? (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-wider text-slate-600">
                                    {record.source}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-pmedium uppercase tracking-[0.24em] text-slate-400">Hours</p>
                              <p className="mt-1 text-xl font-black text-slate-900">{formatHours(record.totalHours)}</p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-100 bg-white p-3">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Check In</p>
                              <p className="mt-1 text-sm font-black text-slate-900">{record.checkIn ? formatTime12h(record.checkIn) : "--"}</p>
                              {record.checkInLocation ? (
                                <p className="mt-1 text-[11px] text-slate-500">
                                  <MapPin size={11} className="inline" /> {record.checkInLocation}
                                </p>
                              ) : null}
                              {record.checkInSelfie ? (
                                <a
                                  href={record.checkInSelfie}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-3 block overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
                                >
                                  <img src={record.checkInSelfie} alt="Check in selfie" className="h-36 w-full object-cover" />
                                </a>
                              ) : (
                                <div className="mt-3 flex h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                                  <div className="text-center">
                                    <ImageIcon size={18} className="mx-auto" />
                                    <p className="mt-2 text-[11px] font-semibold">No check-in selfie</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-white p-3">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Check Out</p>
                              <p className="mt-1 text-sm font-black text-slate-900">{record.checkOut ? formatTime12h(record.checkOut) : "--"}</p>
                              {record.checkOutLocation ? (
                                <p className="mt-1 text-[11px] text-slate-500">
                                  <MapPin size={11} className="inline" /> {record.checkOutLocation}
                                </p>
                              ) : null}
                              {record.checkOutSelfie ? (
                                <a
                                  href={record.checkOutSelfie}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-3 block overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
                                >
                                  <img src={record.checkOutSelfie} alt="Check out selfie" className="h-36 w-full object-cover" />
                                </a>
                              ) : (
                                <div className="mt-3 flex h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                                  <div className="text-center">
                                    <ImageIcon size={18} className="mx-auto" />
                                    <p className="mt-2 text-[11px] font-semibold">No check-out selfie</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {Array.isArray(record.breaks) && record.breaks.length > 0 ? (
                            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Break Timeline</p>
                              <div className="mt-2 space-y-2">
                                {record.breaks.map((breakEntry, breakIndex) => (
                                  <div key={breakIndex} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-[12px] font-semibold text-slate-700">
                                    <span>
                                      Break {breakIndex + 1}: {breakEntry.startTime ? formatTime12h(breakEntry.startTime) : "--"} to {breakEntry.endTime ? formatTime12h(breakEntry.endTime) : "--"}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-pmedium uppercase tracking-wider text-slate-500">
                                      {breakEntry.duration ? `${breakEntry.duration}m` : "--"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {record.correction ? (
                            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[9px] font-pmedium uppercase tracking-widest text-amber-500">Correction</p>
                                <StatusBadge status={record.correction.status} />
                              </div>
                              <p className="mt-1 text-[11px] font-semibold text-amber-800">{record.correction.reason || "No correction reason provided."}</p>
                            </div>
                          ) : null}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-pmedium uppercase tracking-[0.28em] text-slate-400">Employee Snapshot</p>
                <div className="mt-4 space-y-3">
                  {employeeMetaItems.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="text-sm font-semibold text-slate-600">{item.label}</span>
                      <span className="max-w-[52%] truncate text-sm font-black text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-pmedium uppercase tracking-[0.28em] text-slate-400">Quick Summary</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-600">Selected Month</span>
                    <span className="text-sm font-black text-slate-900">{monthLabel(month)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-600">Late Days</span>
                    <span className="text-sm font-black text-amber-700">{totals.lateCount}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-600">Absent Days</span>
                    <span className="text-sm font-black text-rose-700">{totals.absentCount}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-600">Break Minutes</span>
                    <span className="text-sm font-black text-slate-900">{formatClockDuration(totals.breakMinutes)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-pmedium uppercase tracking-[0.28em] text-slate-400">Today</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{formatLongDate(selectedDate)}</p>
                  </div>
                  <Eye size={18} className="text-slate-400" />
                </div>
                {highlightedRecord ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Status</p>
                      <div className="mt-2"><StatusBadge status={highlightedRecord.status} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Check In</p>
                        <p className="mt-2 text-sm font-black text-slate-900">{highlightedRecord.checkIn ? formatTime12h(highlightedRecord.checkIn) : "--"}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Check Out</p>
                        <p className="mt-2 text-sm font-black text-slate-900">{highlightedRecord.checkOut ? formatTime12h(highlightedRecord.checkOut) : "--"}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-[12px] text-slate-500">No record is available for the selected day.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
