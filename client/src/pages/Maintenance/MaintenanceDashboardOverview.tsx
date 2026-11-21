/**
 * MaintenanceDashboardOverview — the Maintenance manager's dashboard at
 * /dashboard. Uses the same visual language as the plan-wise and employee
 * dashboards: the slate outer shell + bordered inner frame, a blue-gradient
 * greeting masthead, today's attendance as the hero card, a "Maintenance Pulse"
 * metric row, quick actions, and the Maintenance activity panels below.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Clock,
  Gauge,
  LayoutDashboard,
  ScanSearch,
  Wrench,
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
  getGreeting,
  humanRelTime,
  statusBadgeColor,
} from "@/pages/Dashboard/FrontendDashboard/dashboard/DashboardShared";
import TodayAttendanceCard from "@/pages/Dashboard/FrontendDashboard/dashboard/TodayAttendanceCard";
import DepartmentBudgetPanel from "@/pages/Dashboard/FrontendDashboard/dashboard/DepartmentBudgetPanel";
import { TeamLiveStatusCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/TeamLiveStatusCard";
import { DepartmentVisitorsCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/DepartmentVisitorsCard";
import { getMaintenanceOverview } from "@/services/maintenance";
import { getRepairLogs } from "@/services/repair-logs";

/* ───────────────────────────── Types ───────────────────────────── */

interface MaintenanceOverviewSummary {
  uptimePercentage?: number;
  overdueSchedules?: number;
  openRepairLogs?: number;
  totalSchedules?: number;
  healthySchedules?: number;
  dueSoonSchedules?: number;
}

interface RepairLogRecord {
  _id?: string;
  repairLogCode?: string;
  assetId?: string;
  assetCode?: string;
  assetName?: string;
  issueType?: string;
  issueDescription?: string;
  assignedTo?: string;
  requestedBy?: string;
  status?: "Open" | "In Progress" | "Resolved" | "Closed" | string;
  resolutionNote?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DashboardState {
  overview: MaintenanceOverviewSummary;
  repairLogs: RepairLogRecord[];
}

const DEFAULT_DASHBOARD: DashboardState = {
  overview: {},
  repairLogs: [],
};

/* ───────────────────────────── Helpers ───────────────────────────── */

function normalizeText(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function truncateText(value: string, max: number): string {
  const trimmed = String(value || "").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}...`;
}

function repairStatusLabel(log: RepairLogRecord = {}): string {
  return log.status || "Open";
}

/* ───────────────────────────── Component ───────────────────────────── */

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
          )
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

/**
 * Stat cards, charts, and quick links for the Maintenance dashboard — split
 * out from MaintenanceDashboardOverview so AdminDashboardOverview can render
 * this same content for an Admin assigned to the Maintenance department,
 * without the department's own greeting/header banner.
 */
export function MaintenanceDashboardWidgets() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardState>(DEFAULT_DASHBOARD);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const [overviewResponse, repairLogsResponse] = await Promise.allSettled([
          getMaintenanceOverview(),
          getRepairLogs({ limit: 200 }),
        ]);

        if (!isMounted) {
          return;
        }

        const overviewData = overviewResponse.status === "fulfilled" ? (overviewResponse.value as MaintenanceOverviewSummary) || {} : {};

        const repairLogsPayload = repairLogsResponse.status === "fulfilled" ? (repairLogsResponse.value as Record<string, unknown>) : null;
        const repairLogsList = Array.isArray(repairLogsPayload?.repairLogs)
          ? (repairLogsPayload?.repairLogs as RepairLogRecord[])
          : Array.isArray(repairLogsPayload?.items)
            ? (repairLogsPayload?.items as RepairLogRecord[])
            : [];

        setDashboard({
          overview: overviewData,
          repairLogs: Array.isArray(repairLogsList) ? repairLogsList : [],
        });

        const failures = [overviewResponse, repairLogsResponse].filter((result) => result.status === "rejected");
        setError(failures.length > 0 ? ((failures[0] as PromiseRejectedResult).reason?.message || "Some maintenance data could not be loaded.") : "");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError((loadError as Error)?.message || "Unable to load maintenance overview.");
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

  const overview = dashboard.overview;
  const repairLogs = dashboard.repairLogs;

  const uptimePercentage = Number(overview.uptimePercentage || 0);
  const openRepairLogs = Number(overview.openRepairLogs || 0);
  const overdueSchedules = Number(overview.overdueSchedules || 0);
  const dueSoonSchedules = Number(overview.dueSoonSchedules || 0);
  const healthySchedules = Number(overview.healthySchedules || 0);
  const totalSchedules = Number(overview.totalSchedules || 0);

  const recentRepairLogs = useMemo(
    () =>
      [...repairLogs]
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
        .slice(0, 5),
    [repairLogs],
  );


  const activeRepairLogs = useMemo(
    () =>
      repairLogs
        .filter((log) => ["Open", "In Progress"].includes(repairStatusLabel(log)))
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
        .slice(0, 5),
    [repairLogs],
  );

  const resolvedRepairLogs = useMemo(
    () =>
      repairLogs
        .filter((log) => ["Resolved", "Closed"].includes(repairStatusLabel(log)))
        .sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime())
        .slice(0, 5),
    [repairLogs],
  );

  const repairLogStatusDonut = useMemo(() => {
    const counts = { Open: 0, "In Progress": 0, Resolved: 0, Closed: 0 };
    repairLogs.forEach((log) => {
      const label = repairStatusLabel(log);
      if (label in counts) {
        counts[label as keyof typeof counts] += 1;
      }
    });
    return {
      series: [counts.Open, counts["In Progress"], counts.Resolved, counts.Closed],
      labels: ["Open", "In Progress", "Resolved", "Closed"],
      colors: ["#ef4444", "#f59e0b", "#22c55e", "#64748b"],
    };
  }, [repairLogs]);

  const repairCompletionRate = useMemo(
    () =>
      repairLogs.length
        ? Math.round(
            (repairLogs.filter((log) => ["Resolved", "Closed"].includes(repairStatusLabel(log))).length /
              repairLogs.length) *
              100,
          )
        : 0,
    [repairLogs],
  );

  const monthLabels = useMemo(() => {
    const labels: string[] = [];
    const anchor = new Date();
    for (let i = 11; i >= 0; i -= 1) {
      const monthStart = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      labels.push(monthStart.toLocaleDateString("en-US", { month: "short" }));
    }
    return labels;
  }, []);

  const repairLogsByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    const anchor = new Date();
    repairLogs.forEach((log) => {
      const parsed = new Date(String(log.createdAt || ""));
      if (Number.isNaN(parsed.getTime())) return;
      const diffMonths = (anchor.getFullYear() - parsed.getFullYear()) * 12 + (anchor.getMonth() - parsed.getMonth());
      const index = 11 - diffMonths;
      if (index >= 0 && index < 12) counts[index] += 1;
    });
    return counts;
  }, [repairLogs]);

  const monthlyBarSeries = useMemo(
    () => [{ name: "Repair Logs", data: repairLogsByMonth }],
    [repairLogsByMonth],
  );

  const monthlyBarOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
      plotOptions: { bar: { borderRadius: 4, columnWidth: "40%" } },
      dataLabels: { enabled: false },
      grid: { borderColor: "#f0f0f0" },
      xaxis: { categories: monthLabels },
      colors: ["#ef4444"],
      stroke: { show: true, width: 2, colors: ["transparent"] },
      tooltip: { theme: "light" },
    }),
    [monthLabels],
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

      {/* Maintenance Pulse — the metrics that matter most */}
      <div data-tour="maintenance-overview">
        <section className="rounded-[1.75rem] border border-blue-100 bg-[#F8FAFD] p-5 shadow-[0_12px_34px_rgba(30,61,115,0.06)] sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E3D73] text-white shadow-sm">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
                Asset care
              </p>
              <h3 className="mt-0.5 text-lg font-pmedium text-[#1E3D73]">
                Maintenance Pulse
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MetricTile icon={Activity} label="Uptime" value={`${uptimePercentage}%`} sub={`${totalSchedules} schedules tracked`} route="/department-accesses/maintenance-department/amc-scheduler" color="#1E3D73" />
            <MetricTile icon={Wrench} label="Open Repair Logs" value={openRepairLogs} sub={`${repairLogs.length} logged total`} route="/department-accesses/maintenance-department/repair-logs" color="#ef4444" />
            <MetricTile icon={AlertTriangle} label="Overdue Schedules" value={overdueSchedules} sub={`${dueSoonSchedules} due soon`} route="/department-accesses/maintenance-department/amc-scheduler" color="#dc2626" />
            <MetricTile icon={Clock} label="Due Soon Schedules" value={dueSoonSchedules} sub={`${healthySchedules} healthy`} route="/department-accesses/maintenance-department/amc-scheduler" color="#f59e0b" />
            <MetricTile icon={Gauge} label="Repair Completion" value={`${repairCompletionRate}%`} sub="Resolved or closed" route="/department-accesses/maintenance-department/repair-logs" color="#0d9488" />
          </div>
        </section>
      </div>

      {/* Repair log queue, AMC schedule pipeline and recently completed service —
          three unrelated widgets sharing a row purely for layout, so each gets
          its own bounded anchor instead of the tour highlighting the whole row. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div data-tour="maintenance-team-status">
          <TeamLiveStatusCard department="maintenance" viewAllRoute="/department-accesses/maintenance-department/amc-scheduler" />
        </div>

        <div data-tour="maintenance-department-visitors">
          <DepartmentVisitorsCard department="maintenance" title="Maintenance Visitors" />
        </div>

        <div data-tour="maintenance-recent-repair-logs">
          <ActivityPanel
            eyebrow="Service queue"
            title="Recent Repair Logs"
            action={<ViewAllButton route="/department-accesses/maintenance-department/repair-logs" />}
          >
            {recentRepairLogs.length > 0 ? recentRepairLogs.map((log, index) => (
              <RecentItem
                key={log._id || log.repairLogCode || index}
                title={log.assetName || "Asset"}
                sub={truncateText(log.issueDescription || log.issueType || "Issue reported", 60)}
                badge={repairStatusLabel(log)}
                badgeColor={statusBadgeColor(repairStatusLabel(log))}
                time={humanRelTime(log.createdAt || "")}
              />
            )) : (
              <EmptyState icon={Wrench} title="No repair logs yet" description="New repair logs will show up here as they are raised." actionLabel="Open Repair Logs" route="/department-accesses/maintenance-department/repair-logs" />
            )}
          </ActivityPanel>
        </div>
      </div>

      {/* Quick actions */}
      <div data-tour="maintenance-quick-links">
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
              The Maintenance modules you use most, one click away.
            </p>
          </div>
          <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <QuickActionTile icon={ScanSearch} label="Repair Logs" description="Log & track repairs" route="/department-accesses/maintenance-department/repair-logs" color="#ef4444" />
            <QuickActionTile icon={CalendarClock} label="AMC Scheduler" description="Preventive servicing & alerts" route="/department-accesses/maintenance-department/amc-scheduler" color="#f59e0b" />
          </div>
        </section>
      </div>

      {/* Active repair logs + schedule health, and resolved/closed logs +
          repair-log-status each get their own bounded row/anchor instead of
          being combined into one grid, so a tour step never spans two
          unrelated recent-activity pairs. */}
      <div data-tour="maintenance-active-repair-logs" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ActivityPanel
          eyebrow="In progress"
          title="Active Repair Logs"
          action={<ViewAllButton route="/department-accesses/maintenance-department/repair-logs" />}
        >
          {activeRepairLogs.length > 0 ? activeRepairLogs.map((log, index) => (
            <RecentItem
              key={log._id || log.repairLogCode || index}
              title={log.assetName || "Asset"}
              sub={truncateText(log.issueDescription || log.issueType || "Issue reported", 60)}
              badge={repairStatusLabel(log)}
              badgeColor={statusBadgeColor(repairStatusLabel(log))}
              time={humanRelTime(log.createdAt || "")}
            />
          )) : (
            <EmptyState icon={Wrench} title="No active repair logs" description="Open and in-progress repairs will show up here." actionLabel="Open Repair Logs" route="/department-accesses/maintenance-department/repair-logs" />
          )}
        </ActivityPanel>

        <ActivityPanel eyebrow="Breakdown" title="Schedule Health">
          <div className="flex min-h-48 flex-1 items-center justify-center">
            {[healthySchedules, dueSoonSchedules, overdueSchedules].some((value) => value > 0) ? (
              <InsightDonutChart centerLabel="Schedules" labels={["Healthy", "Due Soon", "Overdue"]} colors={["#22c55e", "#f59e0b", "#ef4444"]} series={[healthySchedules, dueSoonSchedules, overdueSchedules]} tooltipValue={[healthySchedules, dueSoonSchedules, overdueSchedules].map(String)} />
            ) : (
              <p className="text-content font-pmedium text-slate-400">No schedules yet</p>
            )}
          </div>
        </ActivityPanel>
      </div>

      {repairLogs.length > 0 ? (
        <div data-tour="maintenance-resolved-repair-logs" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ActivityPanel
            eyebrow="Completed"
            title="Resolved & Closed Logs"
            action={<ViewAllButton route="/department-accesses/maintenance-department/repair-logs" />}
          >
            {resolvedRepairLogs.length > 0 ? resolvedRepairLogs.map((log, index) => (
              <RecentItem
                key={log._id || log.repairLogCode || index}
                title={log.assetName || "Asset"}
                sub={truncateText(log.resolutionNote || log.issueDescription || log.issueType || "Issue reported", 60)}
                badge={repairStatusLabel(log)}
                badgeColor={statusBadgeColor(repairStatusLabel(log))}
                time={humanRelTime(log.updatedAt || log.createdAt || "")}
              />
            )) : (
              <EmptyState icon={ScanSearch} title="No resolved logs yet" description="Repairs that are closed out will show up here." actionLabel="Open Repair Logs" route="/department-accesses/maintenance-department/repair-logs" />
            )}
          </ActivityPanel>

          <ActivityPanel eyebrow="Breakdown" title="Repair Log Status">
            <div className="flex min-h-48 flex-1 items-center justify-center">
              {repairLogStatusDonut.series.some((value) => value > 0) ? (
                <InsightDonutChart centerLabel="Logs" labels={repairLogStatusDonut.labels} colors={repairLogStatusDonut.colors} series={repairLogStatusDonut.series} tooltipValue={repairLogStatusDonut.series.map(String)} />
              ) : (
                <p className="text-content font-pmedium text-slate-400">No logs yet</p>
              )}
            </div>
          </ActivityPanel>
        </div>
      ) : null}

      <div data-tour="maintenance-repair-log-trend">
        <ActivityPanel eyebrow="Year at a glance" title="Monthly Repair Log Trend">
          <BarGraph chartId="maintenance-monthly-trends" data={monthlyBarSeries} options={monthlyBarOptions} height={260} />
        </ActivityPanel>
      </div>

      <DepartmentBudgetPanel department="Maintenance" title="Maintenance Budget vs Spend" />
    </div>
  );
}

export function MaintenanceDashboardOverview() {
  const currentUser = useFreshCurrentUser();
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

  const managerName = useMemo(() => {
    const full = `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim();
    return full || currentUser?.fullName || currentUser?.name || currentUser?.displayName || "Maintenance Manager";
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
        greeting: `${getGreeting(Number.isFinite(workspaceHour) ? workspaceHour : now.getHours())}, ${managerName}`,
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
        greeting: `${getGreeting(now.getHours())}, ${managerName}`,
        todayLabel: now.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      };
    }
  }, [managerName, now, workspacePreferences.timezone]);

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <div className="flex flex-col gap-5 rounded-xl border-default p-4">

        {/* Greeting card — same blue plan-card style used across the plan
            dashboards and the employee dashboard. */}
        <section
          data-tour="maintenance-greeting"
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
                  Maintenance Unit dashboard
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
        <div data-tour="maintenance-attendance">
          <TodayAttendanceCard variant="hero" />
        </div>

        <MaintenanceDashboardWidgets />
      </div>
    </div>
  );
}

export default MaintenanceDashboardOverview;
