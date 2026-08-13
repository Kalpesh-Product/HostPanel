import { useEffect, useMemo, useState } from "react";
import {
  MonitorCog,
  AlertCircle,
  Clock3,
  FileSearch,
  KeyRound,
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

export function ITDashboardOverview() {
  const currentUser = useFreshCurrentUser();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardState>(DEFAULT_DASHBOARD);

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
    <div className="p-4 flex flex-col gap-5">
      <PageFrame>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-title font-pmedium text-primary uppercase">IT Dashboard</h2>
              <PlanBadge plan={access.plan} />
            </div>
            <p className="text-subtitle font-pmedium text-gray-700">{greeting} 👋</p>
            <p className="text-content font-pmedium text-gray-700">{todayLabel}<WorkspaceClock timezone={workspacePreferences.timezone} location={workspacePreferences.location} /></p>
          </div>
        </div>
      </PageFrame>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700">
          {error}
        </div>
      ) : null}

      <DashboardAttendanceCard />

      <WidgetSection layout={4} title="Overview" border normalCase>
        <StatCard icon={MonitorCog} label="Resolution Rate" value={`${resolutionRate}%`} sub={`${totalLogs} total logs`} color="#0891b2" route="/it/repair-logs" />
        <StatCard icon={AlertCircle} label="Open Logs" value={openLogs} sub={`${inProgressLogs} in progress`} color="#ef4444" route="/it/repair-logs" />
        <StatCard icon={Clock3} label="In Progress Logs" value={inProgressLogs} sub={`${resolvedLogs} resolved`} color="#f59e0b" route="/it/repair-logs" />
        <StatCard icon={FileSearch} label="Total Logs" value={totalLogs} sub={`${closedLogs} closed`} color="#7c3aed" route="/it/repair-logs" />
      </WidgetSection>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TeamLiveStatusCard department="it" viewAllRoute="/it/repair-logs" />

        <DepartmentVisitorsCard department="it" title="IT Visitors" />

        <SectionCard title="Recent IT Repair Logs" linkLabel="View all" linkRoute="/it/repair-logs">
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
            <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No repair logs yet</p></div>
          )}
        </SectionCard>
      </div>

      <WidgetSection layout={4} title="Quick Links" border normalCase>
        <QuickLink icon={FileSearch} label="IT Repair Logs" description="Log & track repairs" route="/it/repair-logs" color="#2563EB" />
        <QuickLink icon={KeyRound} label="System Access" description="Manage software access" route="/it/system-access" color="#7c3aed" />
      </WidgetSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Recently Resolved Logs" linkLabel="View all" linkRoute="/it/repair-logs">
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
            <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No resolved logs yet</p></div>
          )}
        </SectionCard>

        <DonutWidget
          title="Repair Log Status"
          series={repairLogStatusDonut.series}
          labels={repairLogStatusDonut.labels}
          colors={repairLogStatusDonut.colors}
          centerLabel="Logs"
        />
      </div>

      <BarWidget
        title="Monthly Repair Log Trend"
        chartId="it-monthly-trends"
        series={monthlyBarSeries}
        options={monthlyBarOptions}
        height={260}
      />
    </div>
  );
}

export default ITDashboardOverview;
