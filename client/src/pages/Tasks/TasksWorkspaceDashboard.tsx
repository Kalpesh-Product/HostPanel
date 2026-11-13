import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ListTodo,
  UserCheck,
  Users,
} from "lucide-react";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import taskBannerImage from "../../assets/module-banners/unit-operations-banner.webp";
import {
  canAccessAdminDashboard,
  canAccessAdministrationDashboard,
  canAccessFinanceDashboard,
  canAccessHRDashboard,
  canAccessITDashboard,
  canAccessMaintenanceDashboard,
  canAccessSalesDashboard,
  canAccessTechDashboard,
  getStoredUser,
} from "../../lib/auth-session";
import { statusPillClass } from "../../lib/status-pill";
import { getTasks } from "../../services/tasks";

type TaskRecord = Record<string, any>;
type Tone = "blue" | "green" | "amber" | "violet" | "rose" | "slate";

const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const readable = (value: unknown, fallback = "Not recorded") => {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return text
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDate = (value: unknown) => {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function SectionCard({
  title,
  subtitle,
  children,
  bodyClassName = "p-5",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
          {title}
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
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
  tone?: Tone;
}) {
  const tones: Record<Tone, { icon: string; hover: string }> = {
    blue: {
      icon: "border-l-blue-600 bg-blue-50 text-blue-700",
      hover: "hover:border-blue-200 hover:border-l-blue-600",
    },
    green: {
      icon: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
      hover: "hover:border-emerald-200 hover:border-l-emerald-500",
    },
    amber: {
      icon: "border-l-amber-500 bg-amber-50 text-amber-700",
      hover: "hover:border-amber-200 hover:border-l-amber-500",
    },
    violet: {
      icon: "border-l-violet-500 bg-violet-50 text-violet-700",
      hover: "hover:border-violet-200 hover:border-l-violet-500",
    },
    rose: {
      icon: "border-l-rose-500 bg-rose-50 text-rose-700",
      hover: "hover:border-rose-200 hover:border-l-rose-500",
    },
    slate: {
      icon: "border-l-slate-500 bg-slate-100 text-slate-700",
      hover: "hover:border-slate-300 hover:border-l-slate-500",
    },
  };

  return (
    <div
      className={`flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 border-l-transparent bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md ${tones[tone].hover}`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${tones[tone].icon}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-[22px] font-pmedium leading-none text-slate-900">
          {value}
        </p>
        <p className="mt-2 truncate text-[10px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

export default function TasksWorkspaceDashboard() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const user = useMemo(() => getStoredUser(), []);
  const role = normalize(user?.workspaceMembership?.role || user?.role);
  const isOwner = role === "owner" || role === "founder";
  const isSuperAdmin = role === "super_admin";
  const isAdmin = canAccessAdminDashboard(user) || role === "admin";
  const isDepartmentManager =
    !isOwner &&
    !isSuperAdmin &&
    !isAdmin &&
    (role === "manager" ||
      role.endsWith("_manager") ||
      canAccessHRDashboard(user) ||
      canAccessAdministrationDashboard(user) ||
      canAccessSalesDashboard(user) ||
      canAccessFinanceDashboard(user) ||
      canAccessTechDashboard(user) ||
      canAccessITDashboard(user) ||
      canAccessMaintenanceDashboard(user));

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getTasks({ page: 1, limit: 1000 })
      .then((response) => {
        if (cancelled) return;
        setTasks(Array.isArray(response?.tasks) ? response.tasks : []);
        setLoadError("");
      })
      .catch(() => {
        if (!cancelled) {
          setTasks([]);
          setLoadError("Task data could not be refreshed just now.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const now = useMemo(() => new Date(), []);
  const stats = useMemo(() => {
    const countStatus = (statuses: string[]) =>
      tasks.filter((task) => statuses.includes(normalize(task.status))).length;
    const overdue = tasks.filter((task) => {
      const dueDate = new Date(String(task.dueDate || ""));
      return (
        !Number.isNaN(dueDate.getTime()) &&
        dueDate < now &&
        !["completed", "approved"].includes(normalize(task.status))
      );
    }).length;

    return {
      total: tasks.length,
      pending: countStatus(["pending"]),
      inProgress: countStatus(["in_progress"]),
      completed: countStatus(["completed", "approved"]),
      overdue,
      highPriority: tasks.filter((task) =>
        ["high", "urgent", "critical"].includes(normalize(task.priority)),
      ).length,
      unassigned: tasks.filter(
        (task) =>
          !task.assigneeUserId &&
          (!task.assignee || normalize(task.assignee) === "unassigned"),
      ).length,
      departments: new Set(
        tasks
          .map((task) => String(task.department || "").trim())
          .filter(Boolean),
      ).size,
    };
  }, [now, tasks]);

  const modules = useMemo(() => {
    const companyTasks = {
      id: "company-tasks",
      title: "Company Tasks",
      description: "Monitor task activity and workload across the company",
      icon: Building2,
      color: "#7C3AED",
      route: "/common-modules/tasks/company-tasks",
    };
    const myTasks = {
      id: "my-tasks",
      title: "My Tasks",
      description: "Work through tasks currently assigned to you",
      icon: UserCheck,
      color: "#2563EB",
      route: "/common-modules/tasks/my-tasks",
    };
    const myAssignedTasks = {
      id: "my-assigned-tasks",
      title: "My Assigned Tasks",
      description: "Track tasks you raised and assigned to other people",
      icon: ClipboardCheck,
      color: "#059669",
      route: "/common-modules/tasks/my-assigned-tasks",
    };
    const assignedDepartmentTasks = {
      id: "assigned-department-tasks",
      title: "Assigned Department Tasks",
      description:
        "Manage work across departments assigned to your admin profile",
      icon: Users,
      color: "#EA580C",
      route: "/common-modules/tasks/assigned-department-tasks",
    };
    const departmentTasks = {
      id: "department-tasks",
      title: "Department Tasks",
      description: "Review tasks routed through your department",
      icon: ListTodo,
      color: "#D97706",
      route: "/common-modules/tasks/department-tasks",
    };

    if (isOwner) return [companyTasks, myAssignedTasks];
    if (isSuperAdmin) return [companyTasks, myTasks, myAssignedTasks];
    if (isAdmin) return [assignedDepartmentTasks, myTasks, myAssignedTasks];
    if (isDepartmentManager) return [departmentTasks, myTasks, myAssignedTasks];
    return [departmentTasks, myTasks];
  }, [isAdmin, isDepartmentManager, isOwner, isSuperAdmin]);

  const statusRows = useMemo(() => {
    const groups = new Map<string, number>();
    tasks.forEach((task) => {
      const label = readable(task.status, "Pending");
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [tasks]);

  const monthLabels = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
        return date.toLocaleDateString("en-US", { month: "short" });
      }),
    [now],
  );
  const monthlyTrend = useMemo(() => {
    const created = new Array(6).fill(0);
    const completed = new Array(6).fill(0);
    tasks.forEach((task) => {
      const date = new Date(String(task.createdAt || task.startDate || ""));
      if (Number.isNaN(date.getTime())) return;
      const monthsAgo =
        (now.getFullYear() - date.getFullYear()) * 12 +
        now.getMonth() -
        date.getMonth();
      if (monthsAgo < 0 || monthsAgo > 5) return;
      const index = 5 - monthsAgo;
      created[index] += 1;
      if (["completed", "approved"].includes(normalize(task.status))) {
        completed[index] += 1;
      }
    });
    return { created, completed };
  }, [now, tasks]);

  const trendOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "52%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: monthLabels },
    colors: ["#2563EB", "#10B981"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  const recentTasks = useMemo(
    () =>
      [...tasks]
        .sort(
          (left, right) =>
            new Date(right.createdAt || 0).getTime() -
            new Date(left.createdAt || 0).getTime(),
        )
        .slice(0, 10),
    [tasks],
  );

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={taskBannerImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-center"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/45 via-[#3B82F6]/25 to-[#60A5FA]/15"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)",
              }}
            />
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
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[76%]">
              <h1 className="flex flex-wrap items-center gap-x-2 text-[22px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[28px]">
                <span className="text-primary">Tasks</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-lg text-[11px] font-pmedium leading-5 text-slate-500">
                Live workload, progress, priority, overdue tasks, and assignment
                coverage for your current role.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Workload", "Progress", "Priorities", "Assignments"].map(
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
                Active modules
              </p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">
                {modules.length}
              </p>
            </div>
          </div>
        </div>

        {loadError && !isLoading ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            <AlertTriangle size={16} /> {loadError}
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
            <StatTile
              icon={<ListTodo size={20} />}
              label="Total tasks"
              value={stats.total}
              sub="Tasks visible within your role scope"
            />
            <StatTile
              icon={<CalendarClock size={20} />}
              label="Pending"
              value={stats.pending}
              sub="Tasks waiting to be started or accepted"
              tone="amber"
            />
            <StatTile
              icon={<Clock3 size={20} />}
              label="In progress"
              value={stats.inProgress}
              sub="Tasks currently being worked on"
              tone="blue"
            />
            <StatTile
              icon={<CheckCircle2 size={20} />}
              label="Completed"
              value={stats.completed}
              sub="Completed and approved task outcomes"
              tone="green"
            />
            <StatTile
              icon={<AlertTriangle size={20} />}
              label="Overdue"
              value={stats.overdue}
              sub="Open tasks past their due date"
              tone="rose"
            />
            <StatTile
              icon={<ClipboardCheck size={20} />}
              label="High priority"
              value={stats.highPriority}
              sub="High, urgent, and critical task workload"
              tone="violet"
            />
            <StatTile
              icon={<Users size={20} />}
              label="Unassigned"
              value={stats.unassigned}
              sub="Department queue tasks without an assignee"
              tone="amber"
            />
            <StatTile
              icon={<Building2 size={20} />}
              label="Departments"
              value={stats.departments}
              sub="Departments represented in visible tasks"
              tone="slate"
            />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">Manage tasks</p>
          <p className="mt-1 text-[10px] text-slate-500">
            Open the task workspace curated for your role and assignment scope.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <DashboardModuleCard
                  key={module.id}
                  icon={<Icon size={19} />}
                  title={module.title}
                  route={module.route}
                  description={module.description}
                  color={module.color}
                  state={{
                    fromSection: "tasks-dashboard",
                    moduleTitle: module.title,
                  }}
                />
              );
            })}
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4">
              <SectionCard
                title="Task activity trend"
                subtitle="Tasks created versus completed across the last six months."
              >
                {tasks.length ? (
                  <GroupedBarGraph
                    options={trendOptions}
                    series={[
                      { name: "Created", data: monthlyTrend.created },
                      { name: "Completed", data: monthlyTrend.completed },
                    ]}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No task activity recorded yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard
                title="Task status"
                subtitle="Current task workload grouped by operational status."
              >
                {statusRows.length ? (
                  <DonutChart
                    centerLabel="Tasks"
                    labels={statusRows.map(([label]) => label)}
                    series={statusRows.map(([, value]) => value)}
                    colors={[
                      "#2563EB",
                      "#F59E0B",
                      "#10B981",
                      "#EF4444",
                      "#7C3AED",
                      "#64748B",
                    ].slice(0, statusRows.length)}
                    tooltipValue={statusRows.map(
                      ([, value]) => `${value} tasks`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No task status data yet.
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Operational attention"
                subtitle="Work that needs assignment, prioritisation, or due-date follow-up."
              >
                <div className="space-y-3">
                  {[
                    {
                      label: "Overdue tasks",
                      value: stats.overdue,
                      color: "bg-rose-500",
                    },
                    {
                      label: "High-priority tasks",
                      value: stats.highPriority,
                      color: "bg-violet-500",
                    },
                    {
                      label: "Unassigned tasks",
                      value: stats.unassigned,
                      color: "bg-amber-500",
                    },
                  ].map((item) => {
                    const percentage = stats.total
                      ? Math.round((item.value / stats.total) * 100)
                      : 0;
                    return (
                      <div key={item.label}>
                        <div className="mb-1.5 flex items-center justify-between text-[11px]">
                          <span className="font-pmedium text-slate-700">
                            {item.label}
                          </span>
                          <span className="text-slate-500">
                            {item.value} · {percentage}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${item.color}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            </div>

            <SectionCard
              title="Recent tasks"
              subtitle="Latest task records visible within your current role scope."
              bodyClassName="max-h-[390px] overflow-y-auto p-0"
            >
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="w-[31%] px-5 py-3 font-pmedium">Task</th>
                    <th className="w-[18%] px-4 py-3 font-pmedium">
                      Department
                    </th>
                    <th className="w-[18%] px-4 py-3 font-pmedium">Assignee</th>
                    <th className="w-[14%] px-4 py-3 font-pmedium">Due date</th>
                    <th className="w-[19%] px-4 py-3 font-pmedium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTasks.length ? (
                    recentTasks.map((task, index) => (
                      <tr
                        key={task.id || task._id || `${task.title}-${index}`}
                        className="bg-white text-[11px] text-slate-600"
                      >
                        <td className="truncate px-5 py-3 font-pmedium text-slate-900">
                          {task.title || "Untitled task"}
                        </td>
                        <td className="truncate px-4 py-3">
                          {task.department || "Unassigned"}
                        </td>
                        <td className="truncate px-4 py-3">
                          {task.assignee || "Unassigned"}
                        </td>
                        <td className="px-4 py-3">
                          {formatDate(task.dueDate)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={statusPillClass(
                              task.status || "Pending",
                            )}
                          >
                            {readable(task.status, "Pending")}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-12 text-center text-[11px] text-slate-500"
                      >
                        No task records are available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </SectionCard>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
