/**
 * ITDashboardOverview — the IT manager's dashboard at /dashboard. Uses the
 * same visual language as the plan-wise and employee dashboards: the slate
 * outer shell + bordered inner frame, a blue-gradient greeting masthead,
 * today's attendance as the hero card, an "IT Pulse" metric row, quick
 * actions, and the IT activity panels below.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Clock3,
  FileSearch,
  Hourglass,
  KeyRound,
  LayoutDashboard,
  MonitorCog,
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
import { getITOverview } from "@/services/it";
import { getRepairLogs } from "@/services/repair-logs";

/* ───────────────────────────── Types ───────────────────────────── */

interface ITOverviewSummary {
  resolutionRate?: number;
  openLogs?: number;
  totalLogs?: number;
  inProgressLogs?: number;
  resolvedLogs?: number;
  closedLogs?: number;
}

interface RepairLogRecord {
  id?: string;
  _id?: string;
  repairLogCode?: string;
  assetName?: string;
  assetCode?: string;
  issueType?: string;
  issueDescription?: string;
  assignedTo?: string;
  requestedBy?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
}

interface DashboardState {
  overview: ITOverviewSummary;
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
 * Stat cards, charts, and quick links for the IT dashboard — split out from
 * ITDashboardOverview so AdminDashboardOverview can render this same content
 * for an Admin assigned to the IT department, without the department's own
 * greeting/header banner.
 */
export function ITDashboardWidgets() {
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
          getITOverview(),
          getRepairLogs({ limit: 200 }),
        ]);

        if (!isMounted) {
          return;
        }

        const overviewData = overviewResponse.status === "fulfilled" ? (overviewResponse.value as ITOverviewSummary) || {} : {};

        const repairLogsData = repairLogsResponse.status === "fulfilled"
          ? (repairLogsResponse.value as Record<string, unknown>)?.repairLogs ?? repairLogsResponse.value
          : [];

        setDashboard({
          overview: overviewData,
          repairLogs: Array.isArray(repairLogsData) ? (repairLogsData as RepairLogRecord[]) : [],
        });

        const failures = [overviewResponse, repairLogsResponse].filter((result) => result.status === "rejected");
        setError(failures.length > 0 ? ((failures[0] as PromiseRejectedResult).reason?.message || "Some IT data could not be loaded.") : "");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError((loadError as Error)?.message || "Unable to load IT overview.");
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

  const resolutionRate = Number(overview.resolutionRate || 0);
  const openLogs = Number(overview.openLogs || 0);
  const inProgressLogs = Number(overview.inProgressLogs || 0);
  const totalLogs = Number(overview.totalLogs || 0);
  const resolvedLogs = Number(overview.resolvedLogs || 0);
  const closedLogs = Number(overview.closedLogs || 0);

  const recentRepairLogs = useMemo(
    () =>
      [...repairLogs]
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
        .slice(0, 5),
    [repairLogs],
  );

  const recentlyResolvedLogs = useMemo(
    () =>
      repairLogs
        .filter((log) => log.status === "Resolved" || log.status === "Closed")
        .sort(
          (left, right) =>
            new Date(right.resolvedAt || right.updatedAt || right.createdAt || 0).getTime() -
            new Date(left.resolvedAt || left.updatedAt || left.createdAt || 0).getTime(),
        )
        .slice(0, 5),
    [repairLogs],
  );

  const agingLogs = useMemo(
    () =>
      repairLogs.filter((log) => {
        const status = String(log.status || "").toLowerCase();
        if (status === "resolved" || status === "closed") return false;
        const created = new Date(String(log.createdAt || "")).getTime();
        return Number.isFinite(created) && Date.now() - created > 7 * 24 * 60 * 60 * 1000;
      }).length,
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

  const loggedByMonth = useMemo(() => {
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

  const resolvedByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    const anchor = new Date();
    repairLogs.forEach((log) => {
      if (log.status !== "Resolved" && log.status !== "Closed") return;
      const parsed = new Date(String(log.resolvedAt || log.updatedAt || log.createdAt || ""));
      if (Number.isNaN(parsed.getTime())) return;
      const diffMonths = (anchor.getFullYear() - parsed.getFullYear()) * 12 + (anchor.getMonth() - parsed.getMonth());
      const index = 11 - diffMonths;
      if (index >= 0 && index < 12) counts[index] += 1;
    });
    return counts;
  }, [repairLogs]);

  const monthlyBarSeries = useMemo(
    () => [
      { name: "Logged", data: loggedByMonth },
      { name: "Resolved", data: resolvedByMonth },
    ],
    [loggedByMonth, resolvedByMonth],
  );

  const monthlyBarOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
      plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
      dataLabels: { enabled: false },
      grid: { borderColor: "#f0f0f0" },
      xaxis: { categories: monthLabels },
      colors: ["#2563EB", "#22c55e"],
      stroke: { show: true, width: 2, colors: ["transparent"] },
      tooltip: { theme: "light" },
    }),
    [monthLabels],
  );

  const repairLogStatusDonut = useMemo(
    () => ({
      series: [openLogs, inProgressLogs, resolvedLogs, closedLogs],
      labels: ["Open", "In Progress", "Resolved", "Closed"],
      colors: ["#ef4444", "#f59e0b", "#22c55e", "#64748b"],
    }),
    [openLogs, inProgressLogs, resolvedLogs, closedLogs],
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

      {/* IT Pulse — the metrics that matter most */}
      <div data-tour="it-overview">
        <section className="rounded-[1.75rem] border border-blue-100 bg-[#F8FAFD] p-5 shadow-[0_12px_34px_rgba(30,61,115,0.06)] sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E3D73] text-white shadow-sm">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
                Support desk
              </p>
              <h3 className="mt-0.5 text-lg font-pmedium text-[#1E3D73]">
                IT Pulse
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MetricTile icon={MonitorCog} label="Resolution Rate" value={`${resolutionRate}%`} sub={`${totalLogs} total logs`} route="/department-accesses/it-department/repair-logs" color="#0891b2" />
            <MetricTile icon={AlertCircle} label="Open Logs" value={openLogs} sub={`${inProgressLogs} in progress`} route="/department-accesses/it-department/repair-logs" color="#ef4444" />
            <MetricTile icon={Clock3} label="In Progress Logs" value={inProgressLogs} sub={`${resolvedLogs} resolved`} route="/department-accesses/it-department/repair-logs" color="#f59e0b" />
            <MetricTile icon={FileSearch} label="Total Logs" value={totalLogs} sub={`${closedLogs} closed`} route="/department-accesses/it-department/repair-logs" color="#7c3aed" />
            <MetricTile icon={Hourglass} label="Aging Logs" value={agingLogs} sub="Active repairs over 7 days" route="/department-accesses/it-department/repair-logs" color="#ea580c" />
          </div>
        </section>
      </div>

      {/* Team status, visitors and the latest repair logs — a fixed trio */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div data-tour="it-team-status">
          <TeamLiveStatusCard department="it" viewAllRoute="/department-accesses/it-department/repair-logs" />
        </div>

        <div data-tour="it-visitors">
          <DepartmentVisitorsCard department="it" title="IT Visitors" />
        </div>

        <div data-tour="it-recent-repair-logs">
          <ActivityPanel
            eyebrow="Support queue"
            title="Recent IT Repair Logs"
            action={<ViewAllButton route="/department-accesses/it-department/repair-logs" />}
          >
            {recentRepairLogs.length > 0 ? recentRepairLogs.map((log, index) => (
              <RecentItem
                key={log.id || log._id || index}
                title={log.assetName || log.repairLogCode || "Asset"}
                sub={log.issueType || log.issueDescription || "Repair"}
                badge={log.status || "Open"}
                badgeColor={statusBadgeColor(log.status || "")}
                time={humanRelTime(log.createdAt || log.updatedAt || "")}
              />
            )) : (
              <EmptyState icon={FileSearch} title="No repair logs yet" description="New repair logs will show up here as they are raised." actionLabel="Open Repair Logs" route="/department-accesses/it-department/repair-logs" />
            )}
          </ActivityPanel>
        </div>
      </div>

      {/* Quick actions */}
      <div data-tour="it-quick-links">
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
              The IT modules you use most, one click away.
            </p>
          </div>
          <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <QuickActionTile icon={FileSearch} label="IT Repair Logs" description="Log & track repairs" route="/department-accesses/it-department/repair-logs" color="#2563EB" />
            <QuickActionTile icon={KeyRound} label="System Access" description="Manage software access" route="/department-accesses/it-department/system-access" color="#7c3aed" />
          </div>
        </section>
      </div>

      <div data-tour="it-resolved-logs" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ActivityPanel
          eyebrow="Completed"
          title="Recently Resolved Logs"
          action={<ViewAllButton route="/department-accesses/it-department/repair-logs" />}
        >
          {recentlyResolvedLogs.length > 0 ? recentlyResolvedLogs.map((log, index) => (
            <RecentItem
              key={log.id || log._id || index}
              title={log.assetName || log.repairLogCode || "Asset"}
              sub={log.issueType || "Repair"}
              badge={log.status || "Resolved"}
              badgeColor={statusBadgeColor(log.status || "")}
              time={humanRelTime(log.resolvedAt || log.updatedAt || log.createdAt || "")}
            />
          )) : (
            <EmptyState icon={MonitorCog} title="No resolved logs yet" description="Repairs that are closed out will show up here." actionLabel="Open Repair Logs" route="/department-accesses/it-department/repair-logs" />
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

      <div data-tour="it-monthly-trend">
        <ActivityPanel eyebrow="Year at a glance" title="Monthly Repair Log Trend">
          <BarGraph chartId="it-monthly-trends" data={monthlyBarSeries} options={monthlyBarOptions} height={260} />
        </ActivityPanel>
      </div>

      <DepartmentBudgetPanel department="IT" title="IT Budget vs Spend" />
    </div>
  );
}

export function ITDashboardOverview() {
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

  const itManagerName = useMemo(() => {
    const full = `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim();
    return full || currentUser?.fullName || currentUser?.name || currentUser?.displayName || "IT Manager";
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
        greeting: `${getGreeting(Number.isFinite(workspaceHour) ? workspaceHour : now.getHours())}, ${itManagerName}`,
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
        greeting: `${getGreeting(now.getHours())}, ${itManagerName}`,
        todayLabel: now.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      };
    }
  }, [itManagerName, now, workspacePreferences.timezone]);

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <div className="flex flex-col gap-5 rounded-xl border-default p-4">

        {/* Greeting card — same blue plan-card style used across the plan
            dashboards and the employee dashboard. */}
        <section
          data-tour="it-greeting"
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
                  IT Unit dashboard
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
        <div data-tour="it-attendance">
          <TodayAttendanceCard variant="hero" />
        </div>

        <ITDashboardWidgets />
      </div>
    </div>
  );
}

export default ITDashboardOverview;
