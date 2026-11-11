import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  History,
  Hourglass,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import PageFrame from "../../../components/Pages/PageFrame";
import DashboardModuleCard from "../../../components/DashboardModuleCard";
import DonutChart from "../../../components/graphs/DonutChart";
import GroupedBarGraph from "../../../components/graphs/GroupedBarGraph";
import administrationBannerImage from "../../../assets/administration-dashboard-banner.webp";
import {
  getHousekeepingOverview,
  getHousekeepingStaffPerformance,
} from "../../../services/housekeeping";
import { statusPillClass } from "../../../lib/status-pill";

type HousekeepingTask = {
  id?: string;
  _id?: string;
  taskCode?: string;
  taskName?: string;
  sourceType?: string;
  area?: string;
  floor?: string;
  wing?: string;
  assignedTo?: string;
  status?: string;
  createdAt?: string;
  completedAt?: string;
};

type HousekeepingStaffRecord = {
  id?: string;
  _id?: string;
  fullName?: string;
  name?: string;
  isActive?: boolean;
  attendanceStatus?: string;
};

type HousekeepingSummary = {
  pendingTasks?: number;
  activeTasks?: number;
  completedToday?: number;
  bookingTriggers?: number;
};

type StaffPerformanceRow = {
  staffId?: string;
  fullName?: string;
  tasksAssigned?: number;
  tasksCompleted?: number;
  completionRate?: number;
  onTimeRate?: number;
  pendingCount?: number;
};

// Same colour language as the other module dashboards.
const DONUT_PALETTE = ["#F59E0B", "#2563EB", "#10B981", "#EF4444", "#64748B"];

const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();

const asDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateLabel = (value?: string | null) => {
  const date = asDate(value);
  if (!date) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const locationOf = (task: HousekeepingTask) =>
  [task.area, task.floor, task.wing].filter(Boolean).join(", ") || task.area || "Unassigned area";

// The five console views live on dedicated routes so each module card opens
// its own page locked to that view — no tab switching after the click.
const modules = [
  {
    id: "staff",
    title: "Housekeeping Staff",
    description: "Employee list, daily attendance, and leave requests",
    icon: Users,
    color: "#2563EB",
    path: "/department-accesses/administration-department/house-keeping/staff",
  },
  {
    id: "scheduled",
    title: "Daily Scheduled Tasks",
    description: "Plan recurring cleaning jobs by location and start time",
    icon: CalendarDays,
    color: "#0F766E",
    path: "/department-accesses/administration-department/house-keeping/scheduled-tasks",
  },
  {
    id: "auto",
    title: "Booking-Based Tasks",
    description: "Cleaning tasks generated automatically from bookings",
    icon: Zap,
    color: "#D97706",
    path: "/department-accesses/administration-department/house-keeping/booking-tasks",
  },
  {
    id: "history",
    title: "Task History",
    description: "Archived completed work by month and year",
    icon: History,
    color: "#7C3AED",
    path: "/department-accesses/administration-department/house-keeping/history",
  },
  {
    id: "performance",
    title: "Staff Performance",
    description: "Completion and on-time rates for every employee",
    icon: TrendingUp,
    color: "#DB2777",
    path: "/department-accesses/administration-department/house-keeping/performance",
  },
];

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[320px] items-center justify-center px-6 text-center text-[11px] font-pmedium text-[#7B89A6]">
      {children}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  bodyClassName = "p-5",
  children,
}: {
  title: string;
  subtitle?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-[11px] font-pmedium text-slate-500">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  tone = "blue",
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  sub: string;
  tone?: "blue" | "amber" | "violet" | "emerald" | "orange";
}) {
  // Sales-module KPI convention: the tile stays neutral at rest, and on
  // hover the KPI's own colour shows on the left border.
  const tones = {
    blue: {
      card: "hover:border-l-blue-600",
      icon: "border-l-blue-600 bg-blue-50 text-blue-700",
    },
    amber: {
      card: "hover:border-l-amber-500",
      icon: "border-l-amber-500 bg-amber-50 text-amber-700",
    },
    violet: {
      card: "hover:border-l-violet-500",
      icon: "border-l-violet-500 bg-violet-50 text-violet-700",
    },
    emerald: {
      card: "hover:border-l-emerald-500",
      icon: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
    },
    orange: {
      card: "hover:border-l-orange-500",
      icon: "border-l-orange-500 bg-orange-50 text-orange-700",
    },
  };

  return (
    <div
      className={`flex min-h-[108px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 border-l-transparent bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:shadow-md ${tones[tone].card}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-l-2 ${tones[tone].icon}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 truncate text-[20px] font-pmedium leading-none text-slate-900">
          {value}
        </p>
        <p className="mt-2 truncate text-[9px] font-pmedium text-slate-500">
          {sub}
        </p>
      </div>
    </div>
  );
}

export default function HousekeepingDashboard() {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [staff, setStaff] = useState<HousekeepingStaffRecord[]>([]);
  const [summary, setSummary] = useState<HousekeepingSummary>({});
  const [performance, setPerformance] = useState<StaffPerformanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    Promise.allSettled([
      getHousekeepingOverview(),
      getHousekeepingStaffPerformance(),
    ]).then(([overviewResult, performanceResult]) => {
      if (cancelled) return;

      if (overviewResult.status === "fulfilled") {
        const data = overviewResult.value?.data || {};
        setTasks(Array.isArray(data.tasks) ? data.tasks : []);
        setStaff(Array.isArray(data.staff) ? data.staff : []);
        setSummary(data.summary || {});
      }
      if (performanceResult.status === "fulfilled") {
        const rows =
          performanceResult.value?.data?.performance ||
          performanceResult.value?.performance ||
          [];
        setPerformance(Array.isArray(rows) ? rows : []);
      }
      if (
        overviewResult.status === "rejected" ||
        performanceResult.status === "rejected"
      ) {
        setLoadError("Some housekeeping data could not be refreshed.");
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const openBookingTasks = tasks.filter(
      (task) =>
        task.sourceType === "booking" &&
        !["Completed", "Cancelled"].includes(task.status || ""),
    ).length;

    return {
      total: tasks.length,
      pending: Number(summary.pendingTasks || 0),
      active: Number(summary.activeTasks || 0),
      completedToday: Number(summary.completedToday || 0),
      bookingTriggers:
        Number(summary.bookingTriggers || 0) || openBookingTasks,
      staff: staff.length,
      activeStaff: staff.filter(
        (member) => member.isActive !== false,
      ).length,
    };
  }, [tasks, staff, summary]);

  const statusBreakdown = useMemo(() => {
    const buckets = new Map<string, number>();
    tasks.forEach((task) => {
      const rawStatus = String(task.status || "Pending").replace(/_/g, " ");
      const label = rawStatus.replace(/\b\w/g, (character) =>
        character.toUpperCase(),
      );
      buckets.set(label, (buckets.get(label) || 0) + 1);
    });
    return [...buckets.entries()].sort((left, right) => right[1] - left[1]);
  }, [tasks]);

  const sourceBreakdown = useMemo(() => {
    const manual = tasks.filter(
      (task) => task.sourceType !== "booking",
    ).length;
    const booking = tasks.length - manual;
    return [
      ["Scheduled", manual],
      ["Booking-based", booking],
    ].filter(([, value]) => Number(value) > 0) as [string, number][];
  }, [tasks]);

  const areaRows = useMemo(() => {
    const buckets = new Map<string, number>();
    tasks.forEach((task) => {
      const label = task.area || task.floor || "Unassigned area";
      buckets.set(label, (buckets.get(label) || 0) + 1);
    });
    return [...buckets.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 8);
  }, [tasks]);

  const performanceRows = useMemo(
    () =>
      [...performance]
        .sort(
          (left, right) =>
            Number(right.tasksCompleted || 0) -
            Number(left.tasksCompleted || 0),
        )
        .slice(0, 8),
    [performance],
  );

  const recentTasks = useMemo(
    () =>
      [...tasks]
        .sort(
          (left, right) =>
            new Date(right.createdAt || 0).getTime() -
            new Date(left.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [tasks],
  );

  const areaChartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 4, barHeight: "55%" },
    },
    dataLabels: {
      enabled: true,
      formatter: (value: number) => String(value),
      style: { fontSize: "11px", colors: ["#1E3D73"] },
      offsetX: 6,
    },
    colors: ["#2563EB"],
    xaxis: {
      categories: areaRows.map((row) => row.label),
      min: 0,
      labels: { style: { fontSize: "10px" } },
    },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    grid: { borderColor: "#EEF2F7" },
    tooltip: { theme: "light" },
  };

  const performanceChartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 4, barHeight: "55%" },
    },
    dataLabels: {
      enabled: true,
      formatter: (value: number) => `${value}%`,
      style: { fontSize: "11px", colors: ["#1E3D73"] },
      offsetX: 6,
    },
    colors: ["#10B981"],
    xaxis: {
      categories: performanceRows.map(
        (row) => row.fullName || "Unnamed staff",
      ),
      min: 0,
      max: 100,
      labels: {
        style: { fontSize: "10px" },
        formatter: (value: string) => `${value}%`,
      },
    },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    grid: { borderColor: "#EEF2F7" },
    tooltip: { theme: "light" },
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={administrationBannerImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 h-full w-full object-cover object-center sm:w-[64%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 w-full overflow-hidden bg-gradient-to-br from-[#2563EB]/55 via-[#3b82f6]/35 to-[#60a5fa]/20 sm:w-[64%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            >
              <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-full bg-white/90 sm:w-[66%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
                maskImage:
                  "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
              }}
            />
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[70%]">
              <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[30px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[38px]">
                <span className="text-primary">Housekeeping</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
                The full housekeeping picture — scheduled work, booking-driven
                cleaning, staff attendance, and performance.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Staff", "Scheduled", "Booking", "History", "Performance"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600"
                    >
                      {tag}
                    </span>
                  ),
                )}
              </div>
            </div>
            <div className="absolute right-6 top-5 z-10 rounded-lg border border-white/25 bg-white/15 px-3 py-2 backdrop-blur-sm">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">
                Completed today
              </p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">
                {stats.completedToday}
              </p>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-pmedium text-amber-800">
            <AlertTriangle size={16} />
            {loadError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }, (_, key) => (
              <div
                key={key}
                className="h-[108px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div
            data-tour="admin-housekeeping-dashboard-summary"
            className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3"
          >
            <StatTile
              icon={<ClipboardList size={18} />}
              label="Total tasks"
              value={stats.total}
              sub="Every housekeeping task on record"
            />
            <StatTile
              icon={<Hourglass size={18} />}
              label="Pending"
              value={stats.pending}
              sub="Scheduled tasks waiting to start"
              tone="amber"
            />
            <StatTile
              icon={<Clock3 size={18} />}
              label="Active tasks"
              value={stats.active}
              sub="Assigned or in progress right now"
              tone="violet"
            />
            <StatTile
              icon={<CheckCircle2 size={18} />}
              label="Completed today"
              value={stats.completedToday}
              sub="Finished since midnight"
              tone="emerald"
            />
            <StatTile
              icon={<Zap size={18} />}
              label="Booking tasks open"
              value={stats.bookingTriggers}
              sub="Auto-generated from bookings"
              tone="orange"
            />
            <StatTile
              icon={<Users size={18} />}
              label="Housekeeping staff"
              value={stats.staff}
              sub={`${stats.activeStaff} currently active`}
            />
          </div>
        )}

        <div className="mb-6" data-tour="admin-housekeeping-dashboard-modules">
          <div className="mb-3">
            <p className="text-sm font-pmedium text-slate-900">
              Manage housekeeping
            </p>
            <p className="mt-1 text-[10px] font-pmedium text-slate-500">
              Each console view opens directly — staff, scheduled work,
              booking-driven tasks, history, and performance.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <DashboardModuleCard
                  key={module.id}
                  icon={<Icon size={19} />}
                  title={module.title}
                  route={module.path}
                  description={module.description}
                  color={module.color}
                />
              );
            })}
          </div>
        </div>

        {!isLoading ? (
          <>
            <div
              className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2"
              data-tour="admin-housekeeping-dashboard-status"
            >
              <ChartCard
                title="Task Status Breakdown"
                subtitle="Every housekeeping task grouped by its current status."
              >
                {statusBreakdown.length ? (
                  <DonutChart
                    centerLabel="Tasks"
                    labels={statusBreakdown.map(([label]) => label)}
                    series={statusBreakdown.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, statusBreakdown.length)}
                    tooltipValue={statusBreakdown.map(
                      ([, value]) => `${value} tasks`,
                    )}
                  />
                ) : (
                  <Empty>No task-status data is available yet.</Empty>
                )}
              </ChartCard>
              <ChartCard
                title="Task Sources"
                subtitle="Manually scheduled work versus booking-generated cleaning."
              >
                {sourceBreakdown.length ? (
                  <DonutChart
                    centerLabel="Tasks"
                    labels={sourceBreakdown.map(([label]) => label)}
                    series={sourceBreakdown.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, sourceBreakdown.length)}
                    tooltipValue={sourceBreakdown.map(
                      ([, value]) => `${value} tasks`,
                    )}
                  />
                ) : (
                  <Empty>No task-source data is available yet.</Empty>
                )}
              </ChartCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div data-tour="admin-housekeeping-dashboard-areas">
                <ChartCard
                  title="Tasks by Area"
                  subtitle="Where the workload concentrates across the property."
                >
                  {areaRows.length ? (
                    <GroupedBarGraph
                      options={areaChartOptions}
                      series={[
                        { name: "Tasks", data: areaRows.map((row) => row.value) },
                      ]}
                    />
                  ) : (
                    <Empty>No task-area data is available yet.</Empty>
                  )}
                </ChartCard>
              </div>
              <div data-tour="admin-housekeeping-dashboard-performance">
                <ChartCard
                  title="Top Staff Completion"
                  subtitle="Completion rate of the busiest housekeeping employees."
                >
                  {performanceRows.length ? (
                    <GroupedBarGraph
                      options={performanceChartOptions}
                      series={[
                        {
                          name: "Completion rate",
                          data: performanceRows.map((row) =>
                            Math.round(Number(row.completionRate || 0)),
                          ),
                        },
                      ]}
                    />
                  ) : (
                    <Empty>No staff-performance data is available yet.</Empty>
                  )}
                </ChartCard>
              </div>
            </div>

            <div
              className="mb-4"
              data-tour="admin-housekeeping-dashboard-table"
            >
              <ChartCard
                title="Recent Housekeeping Tasks"
                subtitle="The latest tasks created across scheduled and booking work."
                bodyClassName=""
              >
                {recentTasks.length ? (
                  <div className="max-h-[360px] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="w-[14%] px-5 py-3">Task ID</th>
                          <th className="w-[26%] px-4 py-3">Task</th>
                          <th className="w-[20%] px-4 py-3">Area</th>
                          <th className="w-[14%] px-4 py-3">Assignee</th>
                          <th className="w-[12%] px-4 py-3">Created</th>
                          <th className="w-[14%] px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentTasks.map((task, index) => (
                          <tr
                            key={task.id || task._id || `${task.taskCode}-${index}`}
                            className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                          >
                            <td className="truncate px-5 py-3 text-slate-900">
                              {task.taskCode || "Task"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {task.taskName || "Housekeeping task"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {locationOf(task)}
                            </td>
                            <td className="truncate px-4 py-3">
                              {task.assignedTo || "Unassigned"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {dateLabel(task.createdAt)}
                            </td>
                            <td className="truncate px-5 py-3">
                              <span
                                className={statusPillClass(
                                  task.status || "Pending",
                                )}
                              >
                                {task.status || "Pending"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                    No housekeeping tasks are available yet.
                  </div>
                )}
              </ChartCard>
            </div>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
