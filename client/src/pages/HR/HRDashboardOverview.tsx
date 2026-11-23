/**
 * HRDashboardOverview — the HR manager's dashboard at /dashboard. Uses the
 * same visual language as the plan-wise and employee dashboards: the slate
 * outer shell + bordered inner frame, a blue-gradient greeting masthead,
 * today's attendance as the hero card, an "HR Pulse" metric row, quick actions,
 * and the HR activity panels below.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Briefcase,
  Cake,
  CalendarDays,
  Clock,
  FileText,
  LayoutDashboard,
  LogOut,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import BarGraph from "@/components/graphs/BarGraph";
import InsightDonutChart from "@/pages/Dashboard/FrontendDashboard/dashboard/InsightDonutChart";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { useFreshCurrentUser } from "@/hooks/useFreshCurrentUser";
import {
  ActivityPanel,
  EmptyState,
  MetricTile,
  PlanBadge,
  QuickActionTile,
  RecentItem,
  fmtINR,
  getGreeting,
  humanRelTime,
  statusBadgeColor,
} from "@/pages/Dashboard/FrontendDashboard/dashboard/DashboardShared";
import TodayAttendanceCard from "@/pages/Dashboard/FrontendDashboard/dashboard/TodayAttendanceCard";
import DepartmentBudgetPanel from "@/pages/Dashboard/FrontendDashboard/dashboard/DepartmentBudgetPanel";
import { TeamLiveStatusCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/TeamLiveStatusCard";
import { DepartmentVisitorsCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/DepartmentVisitorsCard";
import { getEmployeeManagementOverview, getPayrollSnapshot } from "@/services/hr";
import { getRecruitmentOverview } from "@/services/recruitment";
import { getLeaveRequests } from "@/services/leave-requests";
import { getHrAttendanceReview, getTeamAttendance } from "@/services/attendance";
import { getResignationRequests } from "@/services/resignation-management";

/* ───────────────────────────── Types ───────────────────────────── */

interface EmployeeRecord {
  id?: string;
  employeeId?: string;
  name?: string;
  fullName?: string;
  email?: string;
  department?: string;
  workspaceRole?: string;
  rawRole?: string;
  role?: string;
  dateOfBirth?: string | null;
  status?: string;
  source?: string;
  joiningDate?: string;
  joiningDateValue?: string;
  createdAt?: string;
}

interface ResignationRecord {
  id?: string;
  recordId?: string;
  employeeName?: string;
  employeeId?: string;
  department?: string;
  requesterRole?: string;
  role?: string;
  exitCode?: string;
  status?: string;
  statusLabel?: string;
  reason?: string;
  noticeEndAt?: string;
  noticeEndDate?: string;
  createdAt?: string;
  updatedAt?: string;
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
  payrollCycle: Record<string, unknown>;
  resignations: ResignationRecord[];
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
  payrollCycle: {},
  resignations: [],
};

/* ───────────────────────────── Helpers ───────────────────────────── */

function normalizeText(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

/* Ticking workspace clock used on the greeting masthead. Digits are
   fixed-width so the card doesn't jitter every second. */
const WorkspaceClock = ({ timezone, location }: { timezone: string; location: string }) => {
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

  if (!timeLabel) return null;

  return (
    <>
      {` | `}
      <span className="inline-block whitespace-nowrap" aria-label={timeLabel}>
        {timeLabel.split("").map((ch, i) =>
          /[0-9]/.test(ch) ? (
            <span key={i} className="inline-block w-[0.665em] text-center">
              {ch}
            </span>
          ) : (
            <span key={i}>{ch}</span>
          ),
        )}
      </span>
      {location ? ` - ${location}` : ""}
    </>
  );
};

const ViewAllButton = ({ route }: { route: string }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(route)}
      className="group inline-flex items-center gap-1 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]"
    >
      View all
      <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
    </button>
  );
};

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

/* ───────────────────────────── Birthday helpers ───────────────────────────── */

const BIRTHDAY_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface ParsedBirthdayRow {
  month: number;
  day: number;
  year: number;
}

function parseBirthdayRow(employee: EmployeeRecord): ParsedBirthdayRow | null {
  const dob = String(employee.dateOfBirth || "").trim();
  if (!dob) return null;
  const date = new Date(dob.length <= 10 ? `${dob}T00:00:00` : dob);
  if (Number.isNaN(date.getTime())) return null;

  return {
    month: date.getMonth() + 1,
    day: date.getDate(),
    year: date.getFullYear(),
  };
}

function formatBirthdayShort(month: number, day: number): string {
  return `${BIRTHDAY_MONTH_NAMES[month - 1].slice(0, 3)} ${day}`;
}

/* ───────────────────────────── Dashboard birthday card ───────────────────────────── */

function DashboardBirthdaysCard({ employees }: { employees: EmployeeRecord[] }) {
  const currentMonthKey = useMemo(() => String(new Date().getMonth() + 1), []);
  const currentMonthName = useMemo(() => BIRTHDAY_MONTH_NAMES[Number(currentMonthKey) - 1] || "", [currentMonthKey]);

  const visible = useMemo(() => {
    return employees
      .map((employee) => ({ employee, birthday: parseBirthdayRow(employee) }))
      .filter((item): item is { employee: EmployeeRecord; birthday: ParsedBirthdayRow } => item.birthday !== null && String(item.birthday.month) === currentMonthKey)
      .sort((a, b) => String(a.birthday.day).padStart(2, "0").localeCompare(String(b.birthday.day).padStart(2, "0")))
      .slice(0, 8);
  }, [employees, currentMonthKey]);

  return (
    <ActivityPanel
      eyebrow="Celebrations"
      title={`${currentMonthName} Birthdays`}
      action={<ViewAllButton route="/department-accesses/hr-department/company-management" />}
    >
      {visible.length > 0 ? visible.map(({ employee, birthday }) => {
        const empName = employee.name || employee.fullName || "Employee";
        return (
          <RecentItem
            key={employee.id || empName}
            title={empName}
            sub={employee.department || "General"}
            badge={formatBirthdayShort(birthday.month, birthday.day)}
            badgeColor="bg-pink-50 text-pink-700 border-pink-200"
          />
        );
      }) : (
        <EmptyState
          icon={Cake}
          title="No birthdays this month"
          description="Team birthdays will show up here when they fall in the current month."
          actionLabel="Open Directory"
          route="/department-accesses/hr-department/company-management"
        />
      )}
    </ActivityPanel>
  );
}

/* ───────────────────────────── Dashboard resignations card ───────────────────────────── */

function DashboardResignationsCard({ requests }: { requests: ResignationRecord[] }) {
  const visible = useMemo(
    () =>
      [...requests]
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
        .slice(0, 5),
    [requests],
  );

  return (
    <ActivityPanel
      eyebrow="Exit workflow"
      title="Recent Resignations"
      action={<ViewAllButton route="/department-accesses/hr-department/resignation-management" />}
    >
      {visible.length > 0 ? visible.map((request) => (
        <RecentItem
          key={request.id || request.recordId || request.employeeName}
          title={request.employeeName || "Employee"}
          sub={`${request.department || "General"}${request.requesterRole ? ` · ${request.requesterRole}` : ""}`}
          badge={request.status || "pending"}
          badgeColor={statusBadgeColor(request.status || "pending")}
          time={humanRelTime(request.createdAt || "")}
        />
      )) : (
        <EmptyState
          icon={UserMinus}
          title="No resignation requests"
          description="Employee exit requests will appear here for review."
          actionLabel="Open Resignations"
          route="/department-accesses/hr-department/resignation-management"
        />
      )}
    </ActivityPanel>
  );
}

/* ───────────────────────────── Component ───────────────────────────── */

/**
 * Stat cards, charts, and quick links for the HR dashboard — split out from
 * HRDashboardOverview so AdminDashboardOverview can render this same content
 * for an Admin assigned to the HR department, without the department's own
 * greeting/header banner.
 */
export function HRDashboardWidgets() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardState>(DEFAULT_DASHBOARD);
  const [monthlyAttendance, setMonthlyAttendance] = useState<number[]>(() => new Array(12).fill(0));
  const workspacePreferences = useWorkspacePreferences();

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const [employeeResponse, recruitmentResponse, leaveResponse, attendanceResponse, teamAttendanceResponse, payrollResponse, resignationResponse] = await Promise.allSettled([
          getEmployeeManagementOverview(),
          getRecruitmentOverview(),
          getLeaveRequests(),
          getHrAttendanceReview(),
          getTeamAttendance({ date: new Date().toISOString().slice(0, 10) }),
          getPayrollSnapshot(),
          getResignationRequests(),
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
        const payrollData = payrollResponse.status === "fulfilled" ? (payrollResponse.value as unknown as Record<string, unknown>) || {} : {};
        const resignationData = resignationResponse.status === "fulfilled" ? (resignationResponse.value as Record<string, unknown>) || {} : {};

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
          payrollCycle: (payrollData.currentCycle as Record<string, unknown>) || {},
          resignations: Array.isArray(resignationData.exitRequests)
            ? (resignationData.exitRequests as ResignationRecord[])
            : [
                ...(Array.isArray(resignationData.pendingRequests) ? (resignationData.pendingRequests as ResignationRecord[]) : []),
                ...(Array.isArray(resignationData.activeNoticeRequests) ? (resignationData.activeNoticeRequests as ResignationRecord[]) : []),
              ],
        });

        const failures = [employeeResponse, recruitmentResponse, leaveResponse, attendanceResponse, teamAttendanceResponse, payrollResponse, resignationResponse].filter((result) => result.status === "rejected");
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

  const payrollStats = useMemo(() => {
    const employees = Array.isArray(dashboard.payrollCycle?.employees) ? (dashboard.payrollCycle.employees as any[]) : [];
    const netPayable = employees.reduce((sum, e) => sum + (e?.financials?.netSalary || 0), 0);
    const paid = employees.filter((e) => normalizeText(e?.payment?.status || e?.financials?.paymentStatus) === "paid").length;
    return { totalEmployees: employees.length, netPayable, paid };
  }, [dashboard.payrollCycle]);

  const thisMonthBirthdays = useMemo(() => {
    const month = new Date().getMonth() + 1;
    return employees.filter((employee) => {
      const parsed = parseBirthdayRow(employee);
      return parsed !== null && parsed.month === month;
    }).length;
  }, [employees]);

  const pendingResignations = useMemo(
    () => dashboard.resignations.filter((request) => normalizeText(request.status) === "pending").length,
    [dashboard.resignations],
  );

  const activeNoticeCount = useMemo(
    () => dashboard.resignations.filter((request) => normalizeText(request.status) === "approved").length,
    [dashboard.resignations],
  );

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700">
          {error}
        </div>
      ) : null}

      {/* HR Pulse — the metrics that matter to an HR manager */}
      <div data-tour="hr-overview">
        <section className="rounded-[1.75rem] border border-blue-100 bg-[#F8FAFD] p-5 shadow-[0_12px_34px_rgba(30,61,115,0.06)] sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E3D73] text-white shadow-sm">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
                Workforce
              </p>
              <h3 className="mt-0.5 text-lg font-pmedium text-[#1E3D73]">
                HR Pulse
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile icon={Users} label="Total Employees" value={totalEmployees} sub={`${presentEmployees} present today`} route="/department-accesses/hr-department/company-management" color="#1E3D73" />
            <MetricTile icon={CalendarDays} label="Pending Leaves" value={pendingLeaves} sub={`${formatPercentage(attendanceRate)} attendance rate`} route="/department-accesses/hr-department/leave-request-processing" color="#f59e0b" />
            <MetricTile icon={Clock} label="Correction Requests" value={pendingCorrections} sub="Awaiting HR review" route="/department-accesses/hr-department/attendance-review" color="#ef4444" />
            <MetricTile icon={Briefcase} label="Open Positions" value={openPositions} sub={`${selectedCandidates} shortlisted · ${onboardedCount} onboarded`} route="/department-accesses/hr-department/recruitment" color="#7c3aed" />
            <MetricTile icon={Wallet} label="Payroll" value={fmtINR(payrollStats.netPayable, workspacePreferences.currency)} sub={`${payrollStats.paid}/${payrollStats.totalEmployees} employees paid`} route="/department-accesses/hr-department/payroll-management" color="#0ea5e9" />
            <MetricTile icon={Cake} label={`${BIRTHDAY_MONTH_NAMES[new Date().getMonth()] || ""} Birthdays`} value={thisMonthBirthdays} sub="Celebrations this month" route="/department-accesses/hr-department/company-management" color="#ec4899" />
            <MetricTile icon={UserMinus} label="Pending Resignations" value={pendingResignations} sub="Awaiting HR review" route="/department-accesses/hr-department/resignation-management" color="#ef4444" />
            <MetricTile icon={LogOut} label="On Notice" value={activeNoticeCount} sub="Active notice periods" route="/department-accesses/hr-department/resignation-management" color="#f97316" />
          </div>
        </section>
      </div>

      {/* Team status, live visitors and today's correction queue — a fixed
          trio (always rendered together) so it shares one bounded anchor. */}
      <div data-tour="hr-team-status" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TeamLiveStatusCard department="hr" viewAllRoute="/department-accesses/hr-department/attendance-review" />

        <DepartmentVisitorsCard department="hr" title="HR Visitors" />

        <ActivityPanel
          eyebrow="Today's queue"
          title="Correction Requests"
          action={<ViewAllButton route="/department-accesses/hr-department/attendance-review" />}
        >
          {correctionsToday.length > 0 ? correctionsToday.map((request) => {
            const requestKey = request.correctionId || request.recordId || request.id;
            const isPending = normalizeText(request.status).includes("pending");
            return (
              <div
                key={requestKey}
                role="button"
                tabIndex={0}
                onClick={() => request.userId && navigate(`/department-accesses/hr-department/attendance-review/${request.userId}`)}
                className="flex cursor-pointer items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 transition-colors hover:border-blue-200"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-white text-amber-600">
                    <Clock size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-content font-pmedium text-[#1E3D73] truncate">{request.employeeName || request.name || "Employee"}</p>
                    <p className="text-small text-slate-500 truncate">In {request.requestedCheckIn || "--"} • Out {request.requestedCheckOut || "--"}</p>
                  </div>
                </div>
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[9px] font-pmedium uppercase tracking-wider border ${statusBadgeColor(request.status || "")}`}>
                  {isPending ? "Pending" : request.status}
                </span>
              </div>
            );
          }) : (
            <EmptyState
              icon={Clock}
              title="No corrections today"
              description="Attendance correction requests filed today will show up here."
              actionLabel="Open Review"
              route="/department-accesses/hr-department/attendance-review"
            />
          )}
        </ActivityPanel>
      </div>

      {/* Quick actions */}
      <div data-tour="hr-quick-links">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 shadow-[0_12px_34px_rgba(37,99,235,0.08)] sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70" />
          <div className="relative mb-5">
            <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
              Jump back in
            </p>
            <h3 className="mt-1 text-lg font-pmedium text-[#1E3D73]">
              Quick Actions
            </h3>
            <p className="mt-1 text-xs font-pmedium text-slate-500">
              The HR modules you use most, one click away.
            </p>
          </div>
          <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <QuickActionTile icon={Users} label="Company Management" description="Directory & records" route="/department-accesses/hr-department/company-management" color="#2563EB" />
            <QuickActionTile icon={UserCheck} label="Attendance Review" description="Review team punches" route="/department-accesses/hr-department/attendance-review" color="#f59e0b" />
            <QuickActionTile icon={CalendarDays} label="Leave Requests" description="Approve or reject leaves" route="/department-accesses/hr-department/leave-request-processing" color="#22c55e" />
            <QuickActionTile icon={UserPlus} label="Recruitment" description="Candidates & job openings" route="/department-accesses/hr-department/recruitment" color="#8b5cf6" />
            <QuickActionTile icon={Wallet} label="Payroll" description="Payroll management" route="/department-accesses/hr-department/payroll-management" color="#0ea5e9" />
            <QuickActionTile icon={FileText} label="HR Documents" description="Policies & documents" route="/department-accesses/hr-department/documents" color="#64748b" />
            <QuickActionTile icon={UserMinus} label="Resignation Management" description="Offboarding workflow" route="/department-accesses/hr-department/resignation-management" color="#ef4444" />
          </div>
        </section>
      </div>

      {/* Recent activity — each recent-list + donut pair gets its own
          bounded row/anchor so a highlight never spans more than one pair. */}
      <div data-tour="hr-leave-requests" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ActivityPanel
          eyebrow="Time off"
          title="Recent Leave Requests"
          action={<ViewAllButton route="/department-accesses/hr-department/leave-request-processing" />}
        >
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
            <EmptyState icon={CalendarDays} title="No leave requests yet" description="New time-off submissions will show up here." actionLabel="Open Leaves" route="/department-accesses/hr-department/leave-request-processing" />
          )}
        </ActivityPanel>

        <ActivityPanel eyebrow="Breakdown" title="Leave Status">
          <div className="flex min-h-48 flex-1 items-center justify-center">
            {leaveStatusDonut.series.some((value) => value > 0) ? (
              <InsightDonutChart centerLabel="Leaves" labels={leaveStatusDonut.labels} colors={leaveStatusDonut.colors} series={leaveStatusDonut.series} tooltipValue={leaveStatusDonut.series.map(String)} />
            ) : (
              <p className="text-content font-pmedium text-slate-400">No leaves yet</p>
            )}
          </div>
        </ActivityPanel>
      </div>

      <div data-tour="hr-recent-attendance" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ActivityPanel
          eyebrow="Front desk"
          title="Recent Attendance"
          action={<ViewAllButton route="/department-accesses/hr-department/attendance-review" />}
        >
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
            <EmptyState icon={Clock} title="No attendance records yet" description="Today's team punches will show up here." actionLabel="Open Review" route="/department-accesses/hr-department/attendance-review" />
          )}
        </ActivityPanel>

        <ActivityPanel eyebrow="Breakdown" title="Attendance Status">
          <div className="flex min-h-48 flex-1 items-center justify-center">
            {attendanceStatusDonut.series.some((value) => value > 0) ? (
              <InsightDonutChart centerLabel="Today" labels={attendanceStatusDonut.labels} colors={attendanceStatusDonut.colors} series={attendanceStatusDonut.series} tooltipValue={attendanceStatusDonut.series.map(String)} />
            ) : (
              <p className="text-content font-pmedium text-slate-400">No attendance yet</p>
            )}
          </div>
        </ActivityPanel>
      </div>

      <div data-tour="hr-candidates" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ActivityPanel
          eyebrow="Hiring"
          title="Recent Candidates"
          action={<ViewAllButton route="/department-accesses/hr-department/recruitment" />}
        >
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
            <EmptyState icon={UserPlus} title="No candidates yet" description="New applicants will show up here as they apply." actionLabel="Open Recruitment" route="/department-accesses/hr-department/recruitment" />
          )}
        </ActivityPanel>

        <ActivityPanel eyebrow="Breakdown" title="Recruitment Funnel">
          <div className="flex min-h-48 flex-1 items-center justify-center">
            {recruitmentFunnel.series.some((value) => value > 0) ? (
              <InsightDonutChart centerLabel="Candidates" labels={recruitmentFunnel.labels} colors={recruitmentFunnel.colors} series={recruitmentFunnel.series} tooltipValue={recruitmentFunnel.series.map(String)} />
            ) : (
              <p className="text-content font-pmedium text-slate-400">No candidates yet</p>
            )}
          </div>
        </ActivityPanel>
      </div>

      {/* Monthly Birthdays + Recent Resignations — a fixed pair (always
          rendered together), so it shares one bounded anchor. */}
      <div data-tour="hr-birthdays-resignations" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DashboardBirthdaysCard employees={employees} />
        <DashboardResignationsCard requests={dashboard.resignations} />
      </div>

      <div data-tour="hr-monthly-trends">
        <ActivityPanel eyebrow="Year at a glance" title="Monthly HR Trends (FY)">
          <BarGraph chartId="hr-monthly-trends" data={monthlyBarSeries} options={monthlyBarOptions} height={260} />
        </ActivityPanel>
      </div>

      <DepartmentBudgetPanel department="HR" title="HR Budget vs Spend" />
    </div>
  );
}

export function HRDashboardOverview() {
  const currentUser = useFreshCurrentUser();
  const access = useDashboardAccess();
  const workspacePreferences = useWorkspacePreferences();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
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

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <div className="flex flex-col gap-5 rounded-xl border-default p-4">

        {/* Greeting card — same blue plan-card style used across the plan
            dashboards and the employee dashboard. */}
        <section
          data-tour="hr-greeting"
          className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 shadow-[0_12px_34px_rgba(37,99,235,0.08)] sm:p-6"
        >
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70" />
          <div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-blue-50/70" />
          <div className="relative flex min-w-0 items-start gap-4">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] ring-1 ring-blue-100 sm:flex">
              <LayoutDashboard size={21} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[9px] font-pmedium uppercase tracking-[0.22em] text-[#2563EB]">
                  HR Unit dashboard
                </p>
                <PlanBadge plan={access.plan} />
              </div>
              <h2 className="mt-2 text-xl font-pmedium text-[#1E3D73] sm:text-2xl">
                {greeting} 👋
              </h2>
              <p className="mt-1 text-xs font-pmedium text-slate-500 sm:text-sm">
                {todayLabel}
                <WorkspaceClock
                  timezone={workspacePreferences.timezone}
                  location={workspacePreferences.location}
                />
              </p>
            </div>
          </div>
        </section>

        {/* Today's attendance — the hero card, same as the plan dashboards */}
        <div data-tour="hr-attendance">
          <TodayAttendanceCard variant="hero" />
        </div>

        <HRDashboardWidgets />
      </div>
    </div>
  );
}

export default HRDashboardOverview;
