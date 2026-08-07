import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarClock,
  Clock,
  ScanSearch,
  Wrench,
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

export function MaintenanceDashboardOverview() {
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
    <div className="p-4 flex flex-col gap-5">

        {/* Greeting banner */}
        <PageFrame>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-title font-pmedium text-primary uppercase">Maintenance Dashboard</h2>
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
          <StatCard icon={Activity} label="Uptime" value={`${uptimePercentage}%`} sub={`${totalSchedules} schedules tracked`} color="#1E3D73" route="/maintenance/amc-scheduler" />
          <StatCard icon={Wrench} label="Open Repair Logs" value={openRepairLogs} sub={`${repairLogs.length} logged total`} color="#ef4444" route="/maintenance/repair-logs" />
          <StatCard icon={AlertTriangle} label="Overdue Schedules" value={overdueSchedules} sub={`${dueSoonSchedules} due soon`} color="#dc2626" route="/maintenance/amc-scheduler" />
          <StatCard icon={Clock} label="Due Soon Schedules" value={dueSoonSchedules} sub={`${healthySchedules} healthy`} color="#f59e0b" route="/maintenance/amc-scheduler" />
        </WidgetSection>

        {/* Repair log queue, AMC schedule pipeline and recently completed service */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TeamLiveStatusCard department="maintenance" viewAllRoute="/maintenance/amc-scheduler" />

          <DepartmentVisitorsCard department="maintenance" title="Maintenance Visitors" />

          <SectionCard title="Recent Repair Logs" linkLabel="View all" linkRoute="/maintenance/repair-logs">
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
              <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No repair logs yet</p></div>
            )}
          </SectionCard>
        </div>

        {/* Quick links */}
        <WidgetSection layout={4} title="Quick Links" border normalCase>
          <QuickLink icon={ScanSearch} label="Repair Logs" description="Log & track repairs" route="/maintenance/repair-logs" color="#ef4444" />
          <QuickLink icon={CalendarClock} label="AMC Scheduler" description="Preventive servicing & alerts" route="/maintenance/amc-scheduler" color="#f59e0b" />
        </WidgetSection>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="Active Repair Logs" linkLabel="View all" linkRoute="/maintenance/repair-logs">
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
              <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No active repair logs</p></div>
            )}
          </SectionCard>

          <DonutWidget
            title="Schedule Health"
            series={[healthySchedules, dueSoonSchedules, overdueSchedules]}
            labels={["Healthy", "Due Soon", "Overdue"]}
            colors={["#22c55e", "#f59e0b", "#ef4444"]}
            centerLabel="Schedules"
          />

          {repairLogs.length > 0 ? (
            <>
              <SectionCard title="Resolved & Closed Logs" linkLabel="View all" linkRoute="/maintenance/repair-logs">
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
            </>
          ) : null}
        </div>

        <BarWidget
          title="Monthly Repair Log Trend"
          chartId="maintenance-monthly-trends"
          series={monthlyBarSeries}
          options={monthlyBarOptions}
          height={260}
        />
    </div>
  );
}

export default MaintenanceDashboardOverview;
