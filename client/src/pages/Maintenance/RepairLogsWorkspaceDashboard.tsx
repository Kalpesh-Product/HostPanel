import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock3,
  History,
  ListChecks,
  PlayCircle,
  UserCog,
  Wrench,
} from "lucide-react";
import ReactApexChart from "react-apexcharts";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import DonutChart from "@/components/graphs/DonutChart";
import PageFrame from "@/components/Pages/PageFrame";
import useAuth from "@/hooks/useAuth";
import maintenanceBannerImage from "@/assets/maintenance-dashboard-banner.webp";
import { getRepairLogOptions, getRepairLogs } from "@/services/repair-logs";
import {
  DashboardBanner,
  DashboardSection,
  DashboardStatTile,
} from "../Administration/AdministrationModuleDashboardShared";

type RepairRow = Record<string, any>;

type RepairLogsDashboardData = {
  logs: RepairRow[];
  assets: RepairRow[];
};

const EMPTY: RepairLogsDashboardData = { logs: [], assets: [] };

const MODULES = [
  {
    title: "Team Active Logs",
    section: "team-active",
    icon: ListChecks,
    color: "#2563EB",
    description: "Review all open and in-progress repairs across the team",
    managerOnly: true,
  },
  {
    title: "My Work",
    section: "my-work",
    icon: UserCog,
    color: "#0D9488",
    description: "Focus on repair work orders assigned to or raised by you",
    managerOnly: false,
  },
  {
    title: "History",
    section: "history",
    icon: History,
    color: "#475569",
    description: "Search the complete archive of resolved and closed logs",
    managerOnly: false,
  },
] as const;

const rows = (value: unknown): RepairRow[] => (Array.isArray(value) ? value : []);

const normalize = (value: unknown) => String(value || "").trim().toLowerCase();

const titleCase = (value: unknown, fallback = "Unspecified") =>
  String(value || fallback)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value: unknown) => {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const monthKey = (value: unknown) => {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const daysSince = (value: unknown) => {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)),
  );
};

const statusOf = (row: RepairRow) => titleCase(row?.status, "Open");
const issueTypeOf = (row: RepairRow) => titleCase(row?.issueType || row?.type, "Other");
const assetOf = (row: RepairRow) =>
  row?.assetName || row?.asset?.name || row?.assetCode || "Unassigned asset";

const statusClass = (status: string) => {
  const value = normalize(status);
  if (value === "resolved" || value === "closed")
    return "bg-emerald-50 text-emerald-700";
  if (value === "in progress") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
};

export default function RepairLogsWorkspaceDashboard() {
  const [data, setData] = useState<RepairLogsDashboardData>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const { auth } = useAuth();
  const currentUser: any = auth?.user;
  const isManager = [
    "owner",
    "super_admin",
    "admin",
    "maintenance_manager",
    "maintenance-manager",
    "maintenance",
  ].includes(
    String(
      currentUser?.workspaceMembership?.role || currentUser?.role || "",
    ).toLowerCase(),
  );
  const visibleModules = MODULES.filter(
    (module) => !module.managerOnly || isManager,
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError("");
    Promise.allSettled([
      getRepairLogs({ limit: 500 }),
      getRepairLogOptions(),
    ]).then(([logsResult, optionsResult]) => {
      if (cancelled) return;

      const logsPayload: any =
        logsResult.status === "fulfilled" ? logsResult.value : {};
      const optionsPayload: any =
        optionsResult.status === "fulfilled" ? optionsResult.value : {};

      const logs = rows(
        logsPayload?.repairLogs || logsPayload?.items || logsPayload,
      );
      setData({
        logs,
        assets: rows(optionsPayload?.assets),
      });
      if (logsResult.status === "rejected") {
        setLoadError("Repair log records could not be refreshed just now.");
      } else if (optionsResult.status === "rejected") {
        setLoadError(
          "Some maintenance context could not be refreshed. Available repair logs are shown below.",
        );
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const count = (status: string) =>
      data.logs.filter((log) => normalize(log.status) === status).length;
    const open = count("open");
    const inProgress = count("in progress");
    const resolved = count("resolved");
    const closed = count("closed");
    const active = open + inProgress;
    const aging = data.logs.filter(
      (log) =>
        ["open", "in progress"].includes(normalize(log.status)) &&
        daysSince(log.createdAt) > 7,
    ).length;
    const affectedAssets = new Set(
      data.logs
        .map((log) => String(log.assetId || log.assetCode || log.assetName || ""))
        .filter(Boolean),
    ).size;

    return {
      total: data.logs.length,
      open,
      inProgress,
      resolved,
      closed,
      active,
      aging,
      affectedAssets,
      completionRate: data.logs.length
        ? Math.round(((resolved + closed) / data.logs.length) * 100)
        : 0,
    };
  }, [data.logs]);

  const statusRows = useMemo(
    () =>
      [
        ["Open", stats.open],
        ["In Progress", stats.inProgress],
        ["Resolved", stats.resolved],
        ["Closed", stats.closed],
      ].filter(([, value]) => Number(value) > 0) as Array<[string, number]>,
    [stats.closed, stats.inProgress, stats.open, stats.resolved],
  );

  const issueTypeRows = useMemo(() => {
    const groups = new Map<string, number>();
    data.logs.forEach((log) => {
      const type = issueTypeOf(log);
      groups.set(type, (groups.get(type) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [data.logs]);

  const assigneeRows = useMemo(() => {
    const groups = new Map<string, number>();
    data.logs
      .filter((log) => normalize(log.status) === "open" || normalize(log.status) === "in progress")
      .forEach((log) => {
        const name = titleCase(log.assignedTo, "Unassigned");
        groups.set(name, (groups.get(name) || 0) + 1);
      });
    return [...groups.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6);
  }, [data.logs]);

  const monthlyActivity = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: date.toLocaleDateString("en-IN", { month: "short" }),
        raised: 0,
        completed: 0,
      };
    });
    const byMonth = new Map(months.map((month) => [month.key, month]));

    data.logs.forEach((log) => {
      const raised = byMonth.get(monthKey(log.createdAt));
      if (raised) raised.raised += 1;

      if (["resolved", "closed"].includes(normalize(log.status))) {
        const completed = byMonth.get(
          monthKey(log.updatedAt || log.resolvedAt || log.closedAt || log.createdAt),
        );
        if (completed) completed.completed += 1;
      }
    });

    return months;
  }, [data.logs]);

  const recentLogs = useMemo(
    () =>
      [...data.logs]
        .sort(
          (left, right) =>
            new Date(right.createdAt || right.updatedAt || 0).getTime() -
            new Date(left.createdAt || left.updatedAt || 0).getTime(),
        )
        .slice(0, 10),
    [data.logs],
  );

  const agingLogs = useMemo(
    () =>
      data.logs
        .filter(
          (log) =>
            ["open", "in progress"].includes(normalize(log.status)) &&
            daysSince(log.createdAt) > 7,
        )
        .sort(
          (left, right) =>
            daysSince(right.createdAt) - daysSince(left.createdAt),
        )
        .slice(0, 6),
    [data.logs],
  );

  const activityOptions = useMemo(
    () => ({
      chart: {
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "Poppins, sans-serif",
      },
      colors: ["#EA580C", "#10B981"],
      dataLabels: { enabled: false },
      stroke: { curve: "smooth" as const, width: 3 },
      fill: {
        type: "gradient",
        gradient: { opacityFrom: 0.26, opacityTo: 0.04, stops: [0, 95, 100] },
      },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
      legend: { position: "top" as const, horizontalAlign: "right" as const },
      xaxis: {
        categories: monthlyActivity.map((month) => month.label),
        labels: { style: { colors: "#64748B", fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          style: { colors: "#64748B", fontSize: "10px" },
          formatter: (value: number) => String(Math.round(value)),
        },
      },
      tooltip: { shared: true, intersect: false },
    }),
    [monthlyActivity],
  );

  const workloadOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false }, fontFamily: "Poppins, sans-serif" },
      colors: ["#2563EB"],
      plotOptions: {
        bar: { horizontal: true, borderRadius: 5, barHeight: "48%" },
      },
      dataLabels: {
        enabled: true,
        offsetX: 14,
        formatter: (value: number) => `${value}`,
        style: { colors: ["#475569"], fontSize: "10px", fontWeight: 500 },
      },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
      xaxis: {
        categories: assigneeRows.map(([name]) => name),
        min: 0,
        labels: { style: { colors: "#64748B", fontSize: "10px" } },
      },
      yaxis: {
        labels: { maxWidth: 135, style: { colors: "#475569", fontSize: "10px" } },
      },
      tooltip: { y: { formatter: (value: number) => `${value} active repairs` } },
    }),
    [assigneeRows],
  );

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <DashboardBanner
          title="Maintenance Repair Logs"
          description="Track repair work orders from reporting to closure, monitor technician workload, and keep aging issues in view."
          tags={["Work Orders", "Issue Tracking", "Team Workload", "History"]}
          image={maintenanceBannerImage}
        />

        {loadError && !isLoading ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            {loadError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="h-[112px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStatTile
              icon={<ClipboardList size={20} />}
              label="Total Logs"
              value={stats.total}
              sub="Repair work orders recorded"
              tone="blue"
            />
            <DashboardStatTile
              icon={<AlertTriangle size={20} />}
              label="Open"
              value={stats.open}
              sub="Reported and awaiting action"
              tone={stats.open ? "amber" : "green"}
            />
            <DashboardStatTile
              icon={<PlayCircle size={20} />}
              label="In Progress"
              value={stats.inProgress}
              sub="Active repairs being worked on"
              tone="violet"
            />
            <DashboardStatTile
              icon={<Wrench size={20} />}
              label="Active Workload"
              value={stats.active}
              sub="Open and in-progress repairs"
              tone="cyan"
            />
            <DashboardStatTile
              icon={<CheckCircle2 size={20} />}
              label="Resolved"
              value={stats.resolved}
              sub="Repairs awaiting final closure"
              tone="green"
            />
            <DashboardStatTile
              icon={<History size={20} />}
              label="Completion Rate"
              value={`${stats.completionRate}%`}
              sub="Resolved or closed out of all logs"
              tone="slate"
            />
            <DashboardStatTile
              icon={<Clock3 size={20} />}
              label="Aging Logs"
              value={stats.aging}
              sub="Active repairs older than 7 days"
              tone={stats.aging ? "rose" : "green"}
            />
            <DashboardStatTile
              icon={<Boxes size={20} />}
              label="Assets Affected"
              value={stats.affectedAssets}
              sub={
                data.assets.length
                  ? `of ${data.assets.length} registered assets with a log`
                  : "Distinct assets with a repair log"
              }
              tone="blue"
            />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">
            Repair log modules
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Open the exact repair-log workspace required for the current task.
          </p>
          <div
            className="mt-3 grid w-full grid-cols-1 gap-4 md:grid-cols-[repeat(var(--module-cols),minmax(0,1fr))]"
            style={{ "--module-cols": visibleModules.length } as CSSProperties}
          >
            {visibleModules.map((module) => {
              const Icon = module.icon;
              return (
                <DashboardModuleCard
                  key={module.section}
                  icon={<Icon size={19} />}
                  title={module.title}
                  route={`/department-accesses/maintenance-department/repair-logs/${module.section}`}
                  description={module.description}
                  color={module.color}
                />
              );
            })}
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
              <DashboardSection
                title="Six-month repair activity"
                subtitle="Repairs raised versus repairs completed each month."
              >
                <ReactApexChart
                  type="area"
                  height={320}
                  options={activityOptions}
                  series={[
                    {
                      name: "Raised",
                      data: monthlyActivity.map((month) => month.raised),
                    },
                    {
                      name: "Completed",
                      data: monthlyActivity.map((month) => month.completed),
                    },
                  ]}
                />
              </DashboardSection>
              <DashboardSection
                title="Repair log status"
                subtitle="Current mix of open, active, resolved, and closed work orders."
              >
                {statusRows.length ? (
                  <DonutChart
                    centerLabel="Logs"
                    labels={statusRows.map(([name]) => name)}
                    series={statusRows.map(([, value]) => value)}
                    colors={["#F59E0B", "#2563EB", "#10B981", "#94A3B8"]}
                    tooltipValue={statusRows.map(
                      ([, value]) => `${value} logs`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No repair logs recorded yet.
                  </div>
                )}
              </DashboardSection>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DashboardSection
                title="Issues by type"
                subtitle="Repair volume grouped by the reported issue category."
              >
                {issueTypeRows.length ? (
                  <DonutChart
                    centerLabel="Logs"
                    labels={issueTypeRows.map(([name]) => name)}
                    series={issueTypeRows.map(([, value]) => value)}
                    colors={[
                      "#EA580C",
                      "#2563EB",
                      "#0D9488",
                      "#7C3AED",
                      "#F59E0B",
                      "#0891B2",
                    ]}
                    tooltipValue={issueTypeRows.map(
                      ([, value]) => `${value} logs`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No issue-type activity recorded yet.
                  </div>
                )}
              </DashboardSection>
              <DashboardSection
                title="Active workload by assignee"
                subtitle="Open and in-progress repairs assigned to each technician."
              >
                {assigneeRows.length ? (
                  <ReactApexChart
                    type="bar"
                    height={310}
                    options={workloadOptions}
                    series={[
                      {
                        name: "Active repairs",
                        data: assigneeRows.map(([, value]) => value),
                      },
                    ]}
                  />
                ) : (
                  <div className="flex h-[310px] items-center justify-center text-[11px] text-slate-500">
                    No active repairs are assigned yet.
                  </div>
                )}
              </DashboardSection>
            </div>

            {agingLogs.length ? (
              <div className="mb-4">
                <DashboardSection
                  title="Aging repair logs"
                  subtitle="Active work orders open for more than seven days."
                  bodyClassName="max-h-[360px] overflow-y-auto p-0"
                >
                  <table className="w-full table-fixed border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                      <tr>
                        <th className="w-[17%] px-5 py-3">Log</th>
                        <th className="w-[26%] px-3 py-3">Asset</th>
                        <th className="w-[22%] px-3 py-3">Issue</th>
                        <th className="w-[18%] px-3 py-3">Assigned to</th>
                        <th className="w-[17%] px-3 py-3 text-center">Age / status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {agingLogs.map((log, index) => (
                        <tr
                          key={log._id || log.repairLogCode || index}
                          className="bg-white text-[11px] text-slate-600"
                        >
                          <td className="truncate px-5 py-3 font-pmedium text-slate-900">
                            {log.repairLogCode || `LOG-${index + 1}`}
                          </td>
                          <td className="truncate px-3 py-3">{assetOf(log)}</td>
                          <td className="truncate px-3 py-3">
                            {titleCase(log.issueType, "Other")}
                          </td>
                          <td className="truncate px-3 py-3">
                            {titleCase(log.assignedTo, "Unassigned")}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <p className="text-[10px] font-pmedium text-rose-600">
                              {daysSince(log.createdAt)} days
                            </p>
                            <span
                              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] ${statusClass(statusOf(log))}`}
                            >
                              {statusOf(log)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DashboardSection>
              </div>
            ) : null}

            <DashboardSection
              title="Recent repair logs"
              subtitle="Latest repair work orders raised across the workspace."
              bodyClassName="max-h-[430px] overflow-y-auto p-0"
            >
              {recentLogs.length ? (
                <table className="w-full table-fixed border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="w-[18%] px-5 py-3">Log</th>
                      <th className="w-[24%] px-3 py-3">Asset</th>
                      <th className="w-[21%] px-3 py-3">Issue</th>
                      <th className="w-[17%] px-3 py-3">Raised</th>
                      <th className="w-[20%] px-3 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentLogs.map((log, index) => (
                      <tr
                        key={log._id || log.repairLogCode || index}
                        className="bg-white text-[11px] text-slate-600"
                      >
                        <td className="px-5 py-3">
                          <p className="truncate font-pmedium text-slate-900">
                            {log.repairLogCode || `LOG-${index + 1}`}
                          </p>
                          <p className="mt-0.5 truncate text-[9px] text-slate-400">
                            {titleCase(log.assignedTo, "Unassigned")}
                          </p>
                        </td>
                        <td className="truncate px-3 py-3">{assetOf(log)}</td>
                        <td className="truncate px-3 py-3">
                          {issueTypeOf(log)}
                        </td>
                        <td className="truncate px-3 py-3">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`rounded-full px-2 py-1 text-[9px] ${statusClass(statusOf(log))}`}
                          >
                            {statusOf(log)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex h-[300px] items-center justify-center px-6 text-center text-[11px] text-slate-500">
                  No repair logs recorded yet.
                </div>
              )}
            </DashboardSection>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
