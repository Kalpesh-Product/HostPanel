import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CalendarDays,
  Clock,
  Briefcase,
  UserCheck,
  Building2,
  UserPlus,
  Wallet,
  UserMinus,
  FileText,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import PageFrame from "@/components/Pages/PageFrame";
import { DashboardAttendanceCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/TodayAttendanceCard";
import WidgetSection from "@/components/WidgetSection";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { useFreshCurrentUser } from "@/hooks/useFreshCurrentUser";
import {
  PlanBadge,
  StatCard,
  SectionCard,
  RecentItem,
  DonutWidget,
  BarWidget,
  QuickLink,
  getGreeting,
  humanRelTime,
  statusBadgeColor,
} from "@/pages/Dashboard/FrontendDashboard/dashboard/DashboardShared";
import { TeamLiveStatusCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/TeamLiveStatusCard";
import { DepartmentVisitorsCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/DepartmentVisitorsCard";
import { getEmployeeManagementOverview } from "@/services/hr";
import { getRecruitmentOverview } from "@/services/recruitment";
import { getLeaveRequests } from "@/services/leave-requests";
import { getHrAttendanceReview, getTeamAttendance } from "@/services/attendance";

/* ───────────────────────────── Types ───────────────────────────── */

interface EmployeeRecord {
  id?: string;
  name?: string;
  source?: string;
  joiningDate?: string;
  joiningDateValue?: string;
  createdAt?: string;
}

interface CandidateRecord {
  id?: string;
  recordId?: string;
  name?: string;
  fullName?: string;
  status?: string;
  positionApplied?: string;
  lastContact?: string;
  updatedAt?: string;
  createdAt?: string;
  appliedAt?: string;
}

interface JobOpeningRecord {
  id?: string;
  designation?: string;
  title?: string;
}

interface LeaveRequestRecord {
  id?: string;
  recordId?: string;
  employeeName?: string;
  name?: string;
  department?: string;
  leaveType?: string;
  reason?: string;
  leaveReason?: string;
  notes?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AttendanceRecord {
  id?: string;
  recordId?: string;
  userId?: string;
  employeeId?: string;
  employeeName?: string;
  employeeRole?: string;
  name?: string;
  role?: string;
  department?: string;
  departments?: string[];
  date?: string;
  dateKey?: string;
  attendanceDate?: string;
  recordDate?: string;
  createdAt?: string;
  checkIn?: string;
  checkInAt?: string | null;
  clockIn?: string;
  startedAt?: string;
  checkOut?: string;
  checkOutAt?: string | null;
  clockOut?: string;
  endedAt?: string;
  status?: string;
  displayStatus?: string;
  leaveMode?: string;
  mode?: string;
  workingHours?: string | number;
  hours?: number;
}

interface CorrectionRecord {
  id?: string;
  recordId?: string;
  correctionId?: string;
  userId?: string;
  employeeName?: string;
  name?: string;
  date?: string;
  reason?: string;
  status?: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  reviewedAt?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface DashboardState {
  employeeSummary: Record<string, unknown>;
  recruitmentSummary: Record<string, unknown>;
  attendanceSummary: Record<string, unknown>;
  employees: EmployeeRecord[];
  teamAttendance: AttendanceRecord[];
  candidates: CandidateRecord[];
  jobOpenings: JobOpeningRecord[];
  leaveRequests: LeaveRequestRecord[];
  correctionRequests: CorrectionRecord[];
}

const DEFAULT_DASHBOARD: DashboardState = {
  employeeSummary: {},
  recruitmentSummary: {},
  attendanceSummary: {},
  employees: [],
  teamAttendance: [],
  candidates: [],
  jobOpenings: [],
  leaveRequests: [],
  correctionRequests: [],
};

/* ───────────────────────────── Helpers ───────────────────────────── */

function normalizeText(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function formatAttendanceDate(value: unknown): string {
  if (!value) return "--";

  if (typeof value === "string") {
    const isoMatch = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);
      const parsedIso = new Date(year, month - 1, day);
      if (!Number.isNaN(parsedIso.getTime())) {
        return parsedIso.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
      }
    }
  }

  const parsed = new Date(value as string);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeOnly(value: unknown): string {
  if (!value) return "--";

  const text = String(value).trim();
  if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(text)) {
    return text.toUpperCase();
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return text;
  }

  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPunchSub(row: AttendanceRecord): string {
  const checkInLabel = formatTimeOnly(row?.checkInAt || row?.checkIn || row?.clockIn || row?.startedAt || null);
  const checkOutLabel = formatTimeOnly(row?.checkOutAt || row?.checkOut || row?.clockOut || row?.endedAt || null);
  if (checkInLabel === "--" && checkOutLabel === "--") {
    return "No punches recorded";
  }
  return `In ${checkInLabel} • Out ${checkOutLabel}`;
}

function getAttendanceBadgeColor(statusLabel: string): string {
  const label = normalizeText(statusLabel);
  if (label.includes("late") || label.includes("half")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (label.includes("leave")) return "bg-gray-100 text-gray-600 border-gray-200";
  if (label.includes("absent")) return "bg-red-50 text-red-700 border-red-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function getAttendanceStatusLabel(row: AttendanceRecord = {}): string {
  const normalized = normalizeText(row?.displayStatus || row?.status || row?.leaveMode || row?.mode || "");
  if (normalized.includes("present late")) return "Present Late";
  if (normalized === "late") return "Present Late";
  if (normalized === "half-day" || normalized === "half_day") return "Half Day";
  if (normalized.includes("on_leave") || normalized.includes("on leave") || normalized.includes("leave")) return "On Leave";
  if (normalized === "on_break" || normalized.includes("break")) return "On Break";
  if (normalized.includes("checked in") || normalized.includes("present")) return "Present";
  if (normalized.includes("absent")) return "Absent";
  if (row?.checkInAt || row?.checkIn) return "Present";
  return "Absent";
}

function formatPercentage(value: unknown): string {
  return `${Math.max(0, Math.min(100, Math.round(Number(value || 0))))}%`;
}

/* ───────────────────────────── Component ───────────────────────────── */

const WorkspaceClock = ({ workspaceName, timezone }: { workspaceName: string; timezone: string }) => {
  const [tick, setTick] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(tick);
    } catch {
      return "";
    }
  }, [tick, timezone]);

  if (!workspaceName && !timeLabel) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
      {workspaceName && (
        <span className="flex items-center gap-1.5 text-small font-pmedium text-slate-600">
          <Building2 size={13} />
          {workspaceName}
        </span>
      )}
      {workspaceName && timeLabel && <span className="h-3.5 w-px bg-slate-300" />}
      {timeLabel && (
        <span className="flex items-center gap-1.5 text-small font-pmedium text-slate-600 tabular-nums">
          <Clock size={13} />
          {timeLabel}
        </span>
      )}
    </div>
  );
};

export function HRDashboardOverview() {
  const currentUser = useFreshCurrentUser();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardState>(DEFAULT_DASHBOARD);
  const [monthlyAttendance, setMonthlyAttendance] = useState<number[]>(() => new Array(12).fill(0));

  const access = useDashboardAccess();
  const workspacePreferences = useWorkspacePreferences();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setNow(new Date());
  }, [workspacePreferences.timezone]);

  const founderName = useMemo(() => {
    const full = `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim();
    return full || currentUser?.fullName || currentUser?.name || currentUser?.displayName || "HR Manager";
  }, [currentUser]);

  const { greeting, todayLabel } = useMemo(() => {
    const timezone = workspacePreferences.timezone;

    try {
      const hourPart = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(now)
        .find((part) => part.type === "hour")?.value;
      const workspaceHour = Number(hourPart);

      return {
        greeting: `${getGreeting(Number.isFinite(workspaceHour) ? workspaceHour : now.getHours())}, ${founderName}`,
        todayLabel: new Intl.DateTimeFormat("en-IN", {
          timeZone: timezone,
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(now),
      };
    } catch {
      return {
        greeting: `${getGreeting(now.getHours())}, ${founderName}`,
        todayLabel: now.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      };
    }
  }, [founderName, now, workspacePreferences.timezone]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const [employeeResponse, recruitmentResponse, leaveResponse, attendanceResponse, teamAttendanceResponse] = await Promise.allSettled([
          getEmployeeManagementOverview(),
          getRecruitmentOverview(),
          getLeaveRequests(),
          getHrAttendanceReview(),
          getTeamAttendance({ date: new Date().toISOString().slice(0, 10) }),
        ]);

        if (!isMounted) {
          return;
        }

        // getEmployeeManagementOverview returns a raw axios response -> data lives on .data
        const employeeData = employeeResponse.status === "fulfilled" ? (employeeResponse.value?.data as Record<string, unknown>) || {} : {};
        const recruitmentData = recruitmentResponse.status === "fulfilled" ? (recruitmentResponse.value as Record<string, unknown>) || {} : {};
        const leaveData = leaveResponse.status === "fulfilled" ? (leaveResponse.value as Record<string, unknown>) || {} : {};
        const attendanceData = attendanceResponse.status === "fulfilled" ? (attendanceResponse.value as Record<string, unknown>) || {} : {};
        const teamAttendanceData = teamAttendanceResponse.status === "fulfilled"
          ? (teamAttendanceResponse.value as Record<string, unknown>)?.records || []
          : [];

        setDashboard({
          employeeSummary: (employeeData.summary as Record<string, unknown>) || {},
          recruitmentSummary: (recruitmentData.summary as Record<string, unknown>) || {},
          attendanceSummary: (attendanceData.stats as Record<string, unknown>) || (attendanceData.summary as Record<string, unknown>) || {},
          employees: Array.isArray(employeeData.employees) ? (employeeData.employees as EmployeeRecord[]) : [],
          teamAttendance: Array.isArray(teamAttendanceData) ? (teamAttendanceData as AttendanceRecord[]) : [],
          candidates: Array.isArray(recruitmentData.candidates) ? (recruitmentData.candidates as CandidateRecord[]) : [],
          jobOpenings: Array.isArray(recruitmentData.jobOpenings) ? (recruitmentData.jobOpenings as JobOpeningRecord[]) : [],
          leaveRequests: Array.isArray(leaveData.leaveRequests) ? (leaveData.leaveRequests as LeaveRequestRecord[]) : [],
          correctionRequests: Array.isArray(attendanceData.corrections)
            ? (attendanceData.corrections as CorrectionRecord[])
            : Array.isArray(attendanceData.correctionRequests)
              ? (attendanceData.correctionRequests as CorrectionRecord[])
              : [],
        });

        const failures = [employeeResponse, recruitmentResponse, leaveResponse, attendanceResponse, teamAttendanceResponse].filter((result) => result.status === "rejected");
        setError(failures.length > 0 ? (failures[0].reason?.message || "Some HR data could not be loaded.") : "");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError((loadError as Error)?.message || "Unable to load HR overview.");
        setDashboard(DEFAULT_DASHBOARD);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const months: string[] = [];
    const anchor = new Date();
    for (let i = 11; i >= 0; i -= 1) {
      const monthStart = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      months.push(`${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`);
    }

    void (async () => {
      const results = await Promise.allSettled(months.map((month) => getHrAttendanceReview({ month })));
      if (!isMounted) {
        return;
      }

      setMonthlyAttendance(
        results.map((result) => {
          if (result.status !== "fulfilled") return 0;
          const data = (result.value as Record<string, unknown>) || {};
          const stats = (data.stats as Record<string, unknown>) || {};
          return Math.max(0, Math.min(100, Math.round(Number(stats.attendancePercentage || 0))));
        }),
      );
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = dashboard.employeeSummary || {};
  const recruitmentSummary = dashboard.recruitmentSummary || {};
  const attendanceSummary = dashboard.attendanceSummary || {};
  const employees = dashboard.employees;
  const teamAttendance = dashboard.teamAttendance;
  const leaveRequests = dashboard.leaveRequests;
  const candidates = dashboard.candidates;
  const jobOpenings = dashboard.jobOpenings;
  const corrections = dashboard.correctionRequests;

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const correctionsToday = useMemo(
    () =>
      corrections
        .filter((request) => request.date === todayKey)
        .sort((left, right) => {
          const leftPending = normalizeText(left.status).includes("pending") ? 0 : 1;
          const rightPending = normalizeText(right.status).includes("pending") ? 0 : 1;
          if (leftPending !== rightPending) return leftPending - rightPending;
          return new Date(right.id || right.createdAt || 0).getTime() - new Date(left.id || left.createdAt || 0).getTime();
        })
        .slice(0, 4),
    [corrections, todayKey],
  );

  const pendingLeaves = leaveRequests.filter((request) => normalizeText(request.status).includes("pending")).length;
  const pendingCorrections = corrections.filter((request) => normalizeText(request.status).includes("pending")).length;
  const totalEmployees = Number(summary.totalEmployees || summary.totalDirectory || employees.length || 0);
  const presentEmployees = Number(attendanceSummary.present || summary.activeEmployees || summary.activeAccounts || 0);
  const attendanceRate = totalEmployees > 0 ? (presentEmployees / totalEmployees) * 100 : 0;
  const activeJobs = Number(recruitmentSummary.activeJobs || jobOpenings.length || 0);
  const selectedCandidates = Number(recruitmentSummary.selectedCount || 0);
  const onboardedCount = Number(recruitmentSummary.onboardedCount || 0);

  const monthLabels = useMemo(() => {
    const labels: string[] = [];
    const anchor = new Date();
    for (let i = 11; i >= 0; i -= 1) {
      const monthStart = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      labels.push(monthStart.toLocaleDateString("en-US", { month: "short" }));
    }
    return labels;
  }, []);

  const hiresByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    const anchor = new Date();
    employees.forEach((employee) => {
      const parsed = new Date(String(employee.joiningDateValue || employee.joiningDate || employee.createdAt || ""));
      if (Number.isNaN(parsed.getTime())) return;
      const diffMonths = (anchor.getFullYear() - parsed.getFullYear()) * 12 + (anchor.getMonth() - parsed.getMonth());
      const index = 11 - diffMonths;
      if (index >= 0 && index < 12) counts[index] += 1;
    });
    return counts;
  }, [employees]);

  const leavesByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    const anchor = new Date();
    leaveRequests.forEach((request) => {
      const parsed = new Date(String(request.createdAt || ""));
      if (Number.isNaN(parsed.getTime())) return;
      const diffMonths = (anchor.getFullYear() - parsed.getFullYear()) * 12 + (anchor.getMonth() - parsed.getMonth());
      const index = 11 - diffMonths;
      if (index >= 0 && index < 12) counts[index] += 1;
    });
    return counts;
  }, [leaveRequests]);

  const monthlyBarSeries = useMemo(
    () => [
      { name: "Hires", data: hiresByMonth },
      { name: "Leaves Taken", data: leavesByMonth },
      { name: "Attendance %", data: monthlyAttendance },
    ],
    [hiresByMonth, leavesByMonth, monthlyAttendance],
  );

  const monthlyBarOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
      plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
      dataLabels: { enabled: false },
      grid: { borderColor: "#f0f0f0" },
      xaxis: { categories: monthLabels },
      colors: ["#2563EB", "#f59e0b", "#22c55e"],
      stroke: { show: true, width: 2, colors: ["transparent"] },
      tooltip: { theme: "light" },
    }),
    [monthLabels],
  );

  const leaveStatusDonut = useMemo(() => {
    const approved = leaveRequests.filter((request) => normalizeText(request.status).includes("approved")).length;
    const pending = leaveRequests.filter((request) => normalizeText(request.status).includes("pending")).length;
    const rejected = leaveRequests.filter((request) => normalizeText(request.status).includes("rejected")).length;
    return {
      series: [approved, pending, rejected],
      labels: ["Approved", "Pending", "Rejected"],
      colors: ["#22c55e", "#f59e0b", "#ef4444"],
    };
  }, [leaveRequests]);

  const attendanceStatusDonut = useMemo(() => {
    const counts = { Present: 0, Late: 0, Leave: 0, Absent: 0 };
    teamAttendance.forEach((row) => {
      const label = getAttendanceStatusLabel(row);
      if (label === "Present") counts.Present += 1;
      else if (label === "Present Late") counts.Late += 1;
      else if (label === "On Leave" || label === "Half Day") counts.Leave += 1;
      else counts.Absent += 1;
    });
    return {
      series: [counts.Present, counts.Late, counts.Leave, counts.Absent],
      labels: ["Present", "Late", "On Leave", "Absent"],
      colors: ["#22c55e", "#f59e0b", "#94a3b8", "#ef4444"],
    };
  }, [teamAttendance]);

  const recruitmentFunnel = useMemo(() => {
    const buckets = { Applied: 0, Shortlisted: 0, Interviewing: 0, Selected: 0, Rejected: 0 };
    candidates.forEach((candidate) => {
      const status = normalizeText(candidate.status);
      if (status.includes("rejected")) buckets.Rejected += 1;
      else if (status.includes("selected") || status.includes("offer") || status.includes("onboard") || status.includes("hired")) buckets.Selected += 1;
      else if (status.includes("interview")) buckets.Interviewing += 1;
      else if (status.includes("shortlist")) buckets.Shortlisted += 1;
      else buckets.Applied += 1;
    });
    return {
      series: [buckets.Applied, buckets.Shortlisted, buckets.Interviewing, buckets.Selected, buckets.Rejected],
      labels: ["Applied", "Shortlisted", "Interviewing", "Selected", "Rejected"],
      colors: ["#2563EB", "#f59e0b", "#8b5cf6", "#22c55e", "#ef4444"],
    };
  }, [candidates]);

  const recentLeaves = useMemo(
    () =>
      [...leaveRequests]
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
        .slice(0, 5),
    [leaveRequests],
  );

  const recentAttendance = useMemo(
    () =>
      [...teamAttendance]
        .sort((left, right) => new Date(right.checkInAt || right.createdAt || 0).getTime() - new Date(left.checkInAt || left.createdAt || 0).getTime())
        .slice(0, 5),
    [teamAttendance],
  );

  const recentCandidates = useMemo(
    () =>
      [...candidates]
        .sort((left, right) => new Date(right.createdAt || right.appliedAt || 0).getTime() - new Date(left.createdAt || left.appliedAt || 0).getTime())
        .slice(0, 5),
    [candidates],
  );

  const openPositions = activeJobs || jobOpenings.length;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-4 flex flex-col gap-5">

        {/* Greeting banner */}
        <PageFrame>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-title font-pmedium text-primary uppercase">HR Dashboard</h2>
                <PlanBadge plan={access.plan} />
              </div>
              <p className="text-subtitle font-pmedium text-gray-700">{greeting} 👋</p>
              <p className="text-content font-pmedium text-gray-700">{todayLabel}</p>
            </div>

            <div className="mt-1 sm:mt-0">
              <WorkspaceClock workspaceName={access.workspaceName} timezone={workspacePreferences.timezone} />
            </div>
          </div>
        </PageFrame>

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700">
            {error}
          </div>
        ) : null}

        {/* Overview — only the metrics that matter */}
        <DashboardAttendanceCard />

        <WidgetSection layout={4} title="Overview" border normalCase>
          <StatCard icon={Users} label="Total Employees" value={totalEmployees} sub={`${presentEmployees} present today`} color="#1E3D73" route="/hr/employee-management" />
          <StatCard icon={CalendarDays} label="Pending Leaves" value={pendingLeaves} sub={`${formatPercentage(attendanceRate)} attendance rate`} color="#f59e0b" route="/hr/leave-request-processing" />
          <StatCard icon={Clock} label="Correction Requests" value={pendingCorrections} sub="Awaiting HR review" color="#ef4444" route="/hr/attendance-review" />
          <StatCard icon={Briefcase} label="Open Positions" value={openPositions} sub={`${selectedCandidates} shortlisted · ${onboardedCount} onboarded`} color="#7c3aed" route="/hr/recruitment" />
        </WidgetSection>

        {/* Team status, live visitors and today's correction queue */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TeamLiveStatusCard department="hr" viewAllRoute="/hr/attendance-review" />

          <DepartmentVisitorsCard department="hr" title="HR Visitors" />

          <SectionCard title="Correction Requests" linkLabel="View all" linkRoute="/hr/attendance-review">
            <div className="space-y-3">
              {correctionsToday.length > 0 ? correctionsToday.map((request) => {
                const requestKey = request.correctionId || request.recordId || request.id;
                const isPending = normalizeText(request.status).includes("pending");
                return (
                  <div
                    key={requestKey}
                    role="button"
                    tabIndex={0}
                    onClick={() => request.userId && navigate(`/hr/attendance-review/${request.userId}`)}
                    className="flex cursor-pointer items-start justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 transition-colors hover:border-primary"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-amber-600">
                        <Clock size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-content font-pmedium text-gray-900 truncate">{request.employeeName || request.name || "Employee"}</p>
                        <p className="text-small text-gray-500 truncate">In {request.requestedCheckIn || "--"} • Out {request.requestedCheckOut || "--"}</p>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[9px] font-pmedium uppercase tracking-wider border ${statusBadgeColor(request.status || "")}`}>
                      {isPending ? "Pending" : request.status}
                    </span>
                  </div>
                );
              }) : (
                <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No correction requests filed today</p></div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Quick links */}
        <WidgetSection layout={4} title="Quick Links" border normalCase>
          <QuickLink icon={Users} label="Employee Management" description="Directory & records" route="/hr/employee-management" color="#2563EB" />
          <QuickLink icon={UserCheck} label="Attendance Review" description="Review team punches" route="/hr/attendance-review" color="#f59e0b" />
          <QuickLink icon={CalendarDays} label="Leave Requests" description="Approve or reject leaves" route="/hr/leave-request-processing" color="#22c55e" />
          <QuickLink icon={UserPlus} label="Recruitment" description="Candidates & job openings" route="/hr/recruitment" color="#8b5cf6" />
          <QuickLink icon={Wallet} label="Payroll" description="Payroll management" route="/hr/payroll-management" color="#0ea5e9" />
          <QuickLink icon={FileText} label="HR Documents" description="Policies & documents" route="/hr/documents" color="#64748b" />
          <QuickLink icon={UserMinus} label="Exit Management" description="Offboarding workflow" route="/hr/exit-management" color="#ef4444" />
        </WidgetSection>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="Recent Leave Requests" linkLabel="View all" linkRoute="/hr/leave-request-processing">
            {recentLeaves.length > 0 ? recentLeaves.map((request, index) => (
              <RecentItem
                key={request.id || request.recordId || index}
                title={request.employeeName || request.name || "Employee"}
                sub={request.leaveType || "Leave"}
                badge={request.status || "Pending"}
                badgeColor={statusBadgeColor(request.status || "")}
                time={humanRelTime(request.createdAt || request.updatedAt || "")}
              />
            )) : (
              <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No leave requests yet</p></div>
            )}
          </SectionCard>

          <DonutWidget
            title="Leave Status"
            series={leaveStatusDonut.series}
            labels={leaveStatusDonut.labels}
            colors={leaveStatusDonut.colors}
            centerLabel="Leaves"
          />

          <SectionCard title="Recent Attendance" linkLabel="View all" linkRoute="/hr/attendance-review">
            {recentAttendance.length > 0 ? recentAttendance.map((row, index) => (
              <RecentItem
                key={row.id || row.recordId || index}
                title={row.name || row.employeeName || "Employee"}
                sub={formatPunchSub(row)}
                badge={getAttendanceStatusLabel(row)}
                badgeColor={getAttendanceBadgeColor(getAttendanceStatusLabel(row))}
                time={formatAttendanceDate(row.dateKey || row.date || row.attendanceDate || row.recordDate)}
              />
            )) : (
              <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No attendance records yet</p></div>
            )}
          </SectionCard>

          <DonutWidget
            title="Attendance Status"
            series={attendanceStatusDonut.series}
            labels={attendanceStatusDonut.labels}
            colors={attendanceStatusDonut.colors}
            centerLabel="Today"
          />

          <SectionCard title="Recent Candidates" linkLabel="View all" linkRoute="/hr/recruitment">
            {recentCandidates.length > 0 ? recentCandidates.map((candidate, index) => (
              <RecentItem
                key={candidate.id || candidate.recordId || index}
                title={candidate.name || candidate.fullName || "Candidate"}
                sub={candidate.positionApplied || "Application"}
                badge={candidate.status || "New"}
                badgeColor={statusBadgeColor(candidate.status || "")}
                time={humanRelTime(candidate.createdAt || candidate.appliedAt || candidate.lastContact || "")}
              />
            )) : (
              <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No candidates yet</p></div>
            )}
          </SectionCard>

          <DonutWidget
            title="Recruitment Funnel"
            series={recruitmentFunnel.series}
            labels={recruitmentFunnel.labels}
            colors={recruitmentFunnel.colors}
            centerLabel="Candidates"
          />
        </div>

        <BarWidget
          title="Monthly HR Trends (FY)"
          chartId="hr-monthly-trends"
          series={monthlyBarSeries}
          options={monthlyBarOptions}
          height={260}
        />
    </div>
  );
}

export default HRDashboardOverview;
