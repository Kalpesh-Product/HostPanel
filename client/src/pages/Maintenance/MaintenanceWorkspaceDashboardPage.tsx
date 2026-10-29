import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  CircleGauge,
  Clock3,
  ClipboardList,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import maintenanceBannerImage from "../../assets/maintenance-dashboard-banner.png";
import { DEFAULT_FISCAL_YEAR } from "../../features/finance/utils/fiscalYear";
import useDashboardAccess from "../../hooks/useDashboardAccess";
import { getDepartmentFinanceData } from "../../services/finance";
import {
  getMaintenanceOverview,
  getMaintenanceSchedules,
} from "../../services/maintenance";
import { getRepairLogs } from "../../services/repair-logs";
import { DepartmentVisitorsCard } from "../Dashboard/FrontendDashboard/dashboard/DepartmentVisitorsCard";
import { TeamLiveStatusCard } from "../Dashboard/FrontendDashboard/dashboard/TeamLiveStatusCard";

type Row = Record<string, any>;
type DashboardData = {
  overview: Row;
  repairs: Row[];
  schedules: Row[];
  finance: Row | null;
};

const EMPTY: DashboardData = {
  overview: {},
  repairs: [],
  schedules: [],
  finance: null,
};
const MODULES = [
  {
    id: "maintenance-repair-logs",
    label: "Maintenance Repair Logs",
    icon: ClipboardList,
    route: "/department-accesses/maintenance-department/repair-logs",
    description: "Record issues, repairs, ownership, and completion",
    color: "#EA580C",
  },
  {
    id: "amc-maintenance-scheduler",
    label: "AMC Maintenance Scheduler",
    icon: CalendarClock,
    route: "/department-accesses/maintenance-department/amc-scheduler",
    description: "Schedule preventive and contract maintenance",
    color: "#2563EB",
  },
] as const;
const PALETTE = [
  "#1E3D73",
  "#2563EB",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#7C3AED",
];
const list = (value: unknown): Row[] => (Array.isArray(value) ? value : []);
const number = (value: unknown) =>
  Number(String(value ?? "0").replace(/,/g, "")) || 0;
const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();
const label = (value: unknown) =>
  String(value || "Pending")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: Math.abs(value) >= 100000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 100000 ? 1 : 0,
  }).format(value || 0);
const date = (value: unknown) => {
  const parsed = value ? new Date(String(value)) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Not recorded";
};
const repairStatus = (row: Row) => row.status || row.currentStatus || "Open";
const scheduleStatus = (row: Row) =>
  row.currentStatus || row.status || "Scheduled";
const tone = (value: unknown) => {
  const text = normalize(value);
  if (/resolved|closed|complete|healthy|scheduled/.test(text))
    return "bg-emerald-50 text-emerald-700";
  if (/overdue|failed|critical|cancel/.test(text))
    return "bg-rose-50 text-rose-700";
  if (/progress|active/.test(text)) return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
};

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[300px] items-center justify-center px-6 text-center text-[11px] text-slate-500">
      {children}
    </div>
  );
}
function Panel({
  title,
  subtitle,
  action,
  bodyClassName = "p-5",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
function Stat({
  icon,
  label: title,
  value,
  sub,
  state = "default",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub: string;
  state?: "default" | "success" | "attention";
}) {
  const styles = {
    default: "border-l-blue-600 bg-blue-50 text-blue-700",
    success: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
    attention: "border-l-amber-500 bg-amber-50 text-amber-700",
  };
  return (
    <div className="flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:border-l-blue-600 hover:shadow-md">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${styles[state]}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-slate-500">
          {title}
        </p>
        <p className="mt-1 text-[22px] font-pmedium leading-none text-slate-900">
          {value}
        </p>
        <p className="mt-2 truncate text-[10px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}
function Summary({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: ReactNode;
  rows: Array<{ label: string; value: ReactNode; tone?: string }>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          {icon}
        </span>
        <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
          {title}
        </h2>
      </div>
      <div className="divide-y divide-slate-100 px-5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 py-3.5"
          >
            <span className="text-[10px] text-slate-500">{row.label}</span>
            <span
              className={`text-right text-[13px] font-pmedium ${row.tone || "text-slate-900"}`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
function Table({
  rows,
  columns,
  empty,
}: {
  rows: Row[];
  columns: Array<{ label: string; render: (row: Row) => ReactNode }>;
  empty: string;
}) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <div className="min-h-[240px] max-h-[360px] overflow-y-auto overflow-x-hidden">
      <table className="w-full table-fixed border-collapse text-left [&_td]:overflow-hidden [&_td]:text-ellipsis [&_td]:whitespace-nowrap [&_th]:overflow-hidden [&_th]:text-ellipsis [&_th]:whitespace-nowrap">
        <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-[0.06em] text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.label} className="px-5 py-3">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr
              key={row.id || row._id || row.recordId || row.scheduleId || index}
              className="text-[11px] text-slate-600 hover:bg-blue-50/30"
            >
              {columns.map((column) => (
                <td key={column.label} className="px-5 py-3">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MaintenanceWorkspaceDashboardPage() {
  const access = useDashboardAccess();
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.allSettled([
      getMaintenanceOverview(),
      getRepairLogs({ limit: 200 }),
      getMaintenanceSchedules({ limit: 200 }),
      getDepartmentFinanceData(DEFAULT_FISCAL_YEAR, "Maintenance"),
    ]).then((results) => {
      if (cancelled) return;
      const get = (index: number) =>
        results[index].status === "fulfilled"
          ? (results[index] as PromiseFulfilledResult<any>).value || {}
          : {};
      const repairs = get(1);
      const schedules = get(2);
      const finance = get(3);
      setData({
        overview: get(0),
        repairs: list(repairs.repairLogs || repairs.items || repairs),
        schedules: list(schedules.schedules || schedules.items || schedules),
        finance: finance?.data?.data || finance?.data || finance || null,
      });
      setError(
        results.some((result) => result.status === "rejected")
          ? "Some maintenance, schedule, or budget data could not be refreshed."
          : "",
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const modules = useMemo(() => {
    if (access.isLoading) return [...MODULES];
    const enabled = MODULES.filter((module) => access.hasModule(module.id));
    return enabled.length ? enabled : [...MODULES];
  }, [access]);
  const stats = useMemo(() => {
    const open = data.repairs.filter((row) =>
      /open/i.test(repairStatus(row)),
    ).length;
    const inProgress = data.repairs.filter((row) =>
      /progress/i.test(repairStatus(row)),
    ).length;
    const resolved = data.repairs.filter((row) =>
      /resolved|closed|complete/i.test(repairStatus(row)),
    ).length;
    const overdue = data.schedules.filter((row) =>
      /overdue/i.test(scheduleStatus(row)),
    ).length;
    const dueSoon = data.schedules.filter((row) =>
      /due soon|due_soon/i.test(scheduleStatus(row)),
    ).length;
    const healthy = data.schedules.filter((row) =>
      /scheduled|healthy|complete/i.test(scheduleStatus(row)),
    ).length;
    return {
      open,
      inProgress,
      resolved,
      overdue,
      dueSoon,
      healthy,
      uptime: number(
        data.overview.uptimePercentage ||
          (data.schedules.length
            ? Math.round((healthy / data.schedules.length) * 100)
            : 0),
      ),
    };
  }, [data]);
  const budget = useMemo(() => {
    const rows = list(data.finance?.monthlyPlan).map((month, index) => {
      const expenses = list(month.expenses);
      return {
        label: String(
          month.month || month.monthLabel || month.monthKey || `M${index + 1}`,
        ).slice(0, 3),
        projected:
          expenses.reduce(
            (sum, expense) =>
              sum + number(expense.projectedAmount ?? expense.amount),
            0,
          ) || number(month.projectedBudget ?? month.allocatedBudget),
        actual:
          expenses.reduce(
            (sum, expense) =>
              sum + number(expense.actualAmount ?? expense.actualSpent),
            0,
          ) || number(month.actualSpent ?? month.actualAmount),
      };
    });
    const projected = rows.reduce((sum, row) => sum + row.projected, 0);
    const actual = rows.reduce((sum, row) => sum + row.actual, 0);
    return {
      rows,
      projected,
      actual,
      remaining: Math.max(0, projected - actual),
    };
  }, [data.finance]);
  const grouped = (rows: Row[], value: (row: Row) => unknown) => {
    const values = new Map<string, number>();
    rows.forEach((row) => {
      const name = label(value(row));
      values.set(name, (values.get(name) || 0) + 1);
    });
    return [...values.entries()].slice(0, 6);
  };
  const repairStatuses = useMemo(
    () => grouped(data.repairs, repairStatus),
    [data.repairs],
  );
  const scheduleStatuses = useMemo(
    () => grouped(data.schedules, scheduleStatus),
    [data.schedules],
  );
  const monthlyRepairs = useMemo(() => {
    const now = new Date();
    const rows = Array.from({ length: 12 }, (_, offset) => {
      const item = new Date(now.getFullYear(), now.getMonth() - 11 + offset, 1);
      return {
        key: `${item.getFullYear()}-${item.getMonth()}`,
        label: item.toLocaleDateString("en-IN", { month: "short" }),
        value: 0,
      };
    });
    data.repairs.forEach((repair) => {
      const item = new Date(String(repair.createdAt || ""));
      const target = rows.find(
        (row) => row.key === `${item.getFullYear()}-${item.getMonth()}`,
      );
      if (!Number.isNaN(item.getTime()) && target) target.value += 1;
    });
    return rows;
  }, [data.repairs]);
  const recentRepairs = useMemo(
    () =>
      [...data.repairs]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [data.repairs],
  );
  const upcomingSchedules = useMemo(
    () =>
      [...data.schedules]
        .sort(
          (a, b) =>
            new Date(a.nextDueDate || a.dueDate || 0).getTime() -
            new Date(b.nextDueDate || b.dueDate || 0).getTime(),
        )
        .slice(0, 8),
    [data.schedules],
  );
  const overdueSchedules = useMemo(
    () =>
      data.schedules
        .filter((row) => /overdue/i.test(scheduleStatus(row)))
        .slice(0, 8),
    [data.schedules],
  );
  const chartBase = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "48%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    tooltip: { theme: "light" },
  };
  const budgetOptions = {
    ...chartBase,
    xaxis: { categories: budget.rows.map((row) => row.label) },
    colors: ["#2563EB", "#22C55E"],
    yaxis: { labels: { formatter: (value: number) => money(value) } },
    tooltip: {
      theme: "light",
      y: { formatter: (value: number) => money(value) },
    },
  };
  const repairOptions = {
    ...chartBase,
    xaxis: { categories: monthlyRepairs.map((row) => row.label) },
    colors: ["#EA580C"],
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={maintenanceBannerImage}
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
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[58%]">
              <h1 className="text-[30px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[38px]">
                <span className="text-primary">Maintenance</span>{" "}
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-md text-[11px] font-pmedium leading-5 text-slate-500">
                Live repair activity, AMC schedule health, asset uptime, and
                maintenance spending.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Repairs", "AMC schedules", "Uptime", "Budget"].map(
                  (item) => (
                    <span
                      key={item}
                      className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600"
                    >
                      {item}
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
        {error ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            <AlertTriangle size={16} />
            {error} Existing values may be incomplete.
          </div>
        ) : null}
        {loading || access.isLoading ? (
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, key) => (
              <div
                key={key}
                className="h-[112px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              icon={<Activity size={20} />}
              label="Asset uptime"
              value={`${stats.uptime}%`}
              sub={`${data.schedules.length} AMC schedules tracked`}
              state={stats.uptime >= 90 ? "success" : "attention"}
            />
            <Stat
              icon={<Wrench size={20} />}
              label="Total repair logs"
              value={data.repairs.length}
              sub="All recorded maintenance issues"
            />
            <Stat
              icon={<AlertTriangle size={20} />}
              label="Open repairs"
              value={stats.open}
              sub={`${stats.inProgress} currently in progress`}
              state={stats.open ? "attention" : "success"}
            />
            <Stat
              icon={<CheckCircle2 size={20} />}
              label="Resolved repairs"
              value={stats.resolved}
              sub="Resolved and closed repair logs"
              state="success"
            />
            <Stat
              icon={<CalendarClock size={20} />}
              label="Total AMCs"
              value={data.schedules.length}
              sub="Preventive maintenance schedules"
            />
            <Stat
              icon={<Clock3 size={20} />}
              label="Due soon"
              value={stats.dueSoon}
              sub={`${stats.healthy} schedules healthy`}
              state={stats.dueSoon ? "attention" : "success"}
            />
            <Stat
              icon={<TrendingDown size={20} />}
              label="Overdue AMCs"
              value={stats.overdue}
              sub="Schedules requiring immediate action"
              state={stats.overdue ? "attention" : "success"}
            />
            <Stat
              icon={<CircleGauge size={20} />}
              label="Actual spent"
              value={money(budget.actual)}
              sub={`${money(budget.remaining)} budget remaining`}
              state={budget.remaining ? "default" : "attention"}
            />
          </div>
        )}
        {!loading ? (
          <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TeamLiveStatusCard
              department="maintenance"
              viewAllRoute="/common-modules/attendance"
            />
            <DepartmentVisitorsCard
              department="maintenance"
              title="Maintenance Visitors"
            />
          </section>
        ) : null}
        {!loading ? (
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="text-sm font-pmedium text-slate-900">
                Maintenance operations overview
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">
                Repair workload, AMC health, and approved maintenance budget
                position.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Summary
                title="Repair workload"
                icon={<Wrench size={18} />}
                rows={[
                  { label: "Total repair logs", value: data.repairs.length },
                  {
                    label: "Open",
                    value: stats.open,
                    tone: stats.open ? "text-amber-700" : "text-emerald-700",
                  },
                  { label: "In progress", value: stats.inProgress },
                  { label: "Resolved / closed", value: stats.resolved },
                ]}
              />
              <Summary
                title="AMC health"
                icon={<ShieldCheck size={18} />}
                rows={[
                  { label: "Total schedules", value: data.schedules.length },
                  {
                    label: "Healthy",
                    value: stats.healthy,
                    tone: "text-emerald-700",
                  },
                  {
                    label: "Due soon",
                    value: stats.dueSoon,
                    tone: stats.dueSoon ? "text-amber-700" : "text-emerald-700",
                  },
                  {
                    label: "Overdue",
                    value: stats.overdue,
                    tone: stats.overdue ? "text-rose-700" : "text-emerald-700",
                  },
                ]}
              />
              <Summary
                title="Maintenance budget"
                icon={<CircleGauge size={18} />}
                rows={[
                  { label: "Projected budget", value: money(budget.projected) },
                  { label: "Actual spent", value: money(budget.actual) },
                  { label: "Remaining", value: money(budget.remaining) },
                  { label: "Financial year", value: DEFAULT_FISCAL_YEAR },
                ]}
              />
            </div>
          </section>
        ) : null}
        <section className="mb-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-pmedium text-slate-900">
                Manage maintenance operations
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">
                Open the same enabled modules available in the Maintenance
                Dashboard dropdown.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRefresh((value) => value + 1)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.06em] text-slate-600 hover:border-blue-200 hover:text-blue-700"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <DashboardModuleCard
                  key={module.id}
                  icon={<Icon size={19} />}
                  title={module.label}
                  route={module.route}
                  description={module.description}
                  color={module.color}
                  state={{ fromSection: "maintenance-department" }}
                />
              );
            })}
          </div>
        </section>
        {!loading && !access.isLoading ? (
          <>
            <div className="mb-4">
              <Panel
                title="Maintenance Budget: Projected vs Actual Spent"
                subtitle={`${DEFAULT_FISCAL_YEAR} monthly Finance Management plan for Maintenance.`}
                action={
                  <Link
                    to="/extra-common-modules/finance-management"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-[9px] uppercase tracking-[0.06em] text-slate-600 hover:text-blue-700"
                  >
                    Finance Management
                  </Link>
                }
              >
                {budget.rows.length ? (
                  <GroupedBarGraph
                    options={budgetOptions}
                    series={[
                      {
                        name: "Projected budget",
                        data: budget.rows.map((row) => row.projected),
                      },
                      {
                        name: "Actual spent",
                        data: budget.rows.map((row) => row.actual),
                      },
                    ]}
                  />
                ) : (
                  <Empty>
                    No approved Maintenance monthly budget is available for{" "}
                    {DEFAULT_FISCAL_YEAR}.
                  </Empty>
                )}
              </Panel>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <Panel
                title="Monthly Repair Trend"
                subtitle="Repair logs raised during the last 12 calendar months."
              >
                <GroupedBarGraph
                  options={repairOptions}
                  series={[
                    {
                      name: "Repair logs",
                      data: monthlyRepairs.map((row) => row.value),
                    },
                  ]}
                />
              </Panel>
              <Panel
                title="Repair Log Status"
                subtitle="Repair records grouped by current workflow status."
              >
                {repairStatuses.length ? (
                  <DonutChart
                    centerLabel="Repairs"
                    labels={repairStatuses.map(([name]) => name)}
                    series={repairStatuses.map(([, value]) => value)}
                    colors={PALETTE.slice(0, repairStatuses.length)}
                    tooltipValue={repairStatuses.map(
                      ([, value]) => `${value} logs`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No repair status data is available.</Empty>
                )}
              </Panel>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Panel
                title="AMC Schedule Health"
                subtitle="Preventive schedules grouped by operational state."
              >
                {scheduleStatuses.length ? (
                  <DonutChart
                    centerLabel="Schedules"
                    labels={scheduleStatuses.map(([name]) => name)}
                    series={scheduleStatuses.map(([, value]) => value)}
                    colors={PALETTE.slice(0, scheduleStatuses.length)}
                    tooltipValue={scheduleStatuses.map(
                      ([, value]) => `${value} schedules`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No AMC schedule data is available.</Empty>
                )}
              </Panel>
              <Panel
                title="Maintenance Control Snapshot"
                subtitle="Immediate operational checks for the maintenance team."
              >
                <div className="divide-y divide-slate-100">
                  {[
                    {
                      icon: Activity,
                      name: "Asset uptime",
                      value: `${stats.uptime}%`,
                      style: "bg-blue-50 text-blue-700",
                    },
                    {
                      icon: AlertTriangle,
                      name: "Open and in-progress repairs",
                      value: stats.open + stats.inProgress,
                      style: "bg-amber-50 text-amber-700",
                    },
                    {
                      icon: CalendarCheck,
                      name: "Healthy AMC schedules",
                      value: `${stats.healthy}/${data.schedules.length}`,
                      style: "bg-emerald-50 text-emerald-700",
                    },
                    {
                      icon: CircleGauge,
                      name: "Budget remaining",
                      value: money(budget.remaining),
                      style: "bg-violet-50 text-violet-700",
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.name}
                        className="flex items-center justify-between gap-4 py-3.5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.style}`}
                          >
                            <Icon size={16} />
                          </span>
                          <span className="truncate text-[11px] text-slate-600">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-[14px] text-slate-900">
                          {item.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Panel
                title="Recent Repair Logs"
                subtitle="Latest maintenance issues and ownership status."
                bodyClassName=""
              >
                <Table
                  rows={recentRepairs}
                  empty="No repair logs are available."
                  columns={[
                    {
                      label: "Asset",
                      render: (row) => (
                        <span className="text-slate-900">
                          {row.assetName || row.assetCode || "Asset"}
                        </span>
                      ),
                    },
                    {
                      label: "Issue",
                      render: (row) =>
                        row.issueType || row.issueDescription || "Not recorded",
                    },
                    {
                      label: "Assigned to",
                      render: (row) =>
                        row.assignedToName || row.assignedTo || "Unassigned",
                    },
                    {
                      label: "Status",
                      render: (row) => (
                        <span
                          className={`rounded-md px-2 py-1 text-[9px] ${tone(repairStatus(row))}`}
                        >
                          {label(repairStatus(row))}
                        </span>
                      ),
                    },
                  ]}
                />
              </Panel>
              <Panel
                title="Upcoming AMC Schedules"
                subtitle="Nearest preventive-service dates and technicians."
                bodyClassName=""
              >
                <Table
                  rows={upcomingSchedules}
                  empty="No AMC schedules are available."
                  columns={[
                    {
                      label: "Asset",
                      render: (row) => (
                        <span className="text-slate-900">
                          {row.assetName || row.assetCode || "Asset"}
                        </span>
                      ),
                    },
                    {
                      label: "Maintenance",
                      render: (row) =>
                        row.maintenanceType ||
                        row.type ||
                        row.frequency ||
                        "Scheduled service",
                    },
                    {
                      label: "Next due",
                      render: (row) => date(row.nextDueDate || row.dueDate),
                    },
                    {
                      label: "Status",
                      render: (row) => (
                        <span
                          className={`rounded-md px-2 py-1 text-[9px] ${tone(scheduleStatus(row))}`}
                        >
                          {label(scheduleStatus(row))}
                        </span>
                      ),
                    },
                  ]}
                />
              </Panel>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Panel
                title="Overdue AMC Attention"
                subtitle="Schedules requiring immediate maintenance follow-up."
                bodyClassName=""
              >
                <Table
                  rows={overdueSchedules}
                  empty="No AMC schedules are overdue."
                  columns={[
                    {
                      label: "Schedule",
                      render: (row) => (
                        <span className="text-slate-900">
                          {row.scheduleCode || row.assetName || "AMC schedule"}
                        </span>
                      ),
                    },
                    {
                      label: "Asset",
                      render: (row) =>
                        row.assetName || row.assetCode || "Not recorded",
                    },
                    {
                      label: "Due date",
                      render: (row) => date(row.nextDueDate || row.dueDate),
                    },
                    {
                      label: "Technician",
                      render: (row) =>
                        row.technicianName ||
                        row.technician ||
                        row.assignedTo ||
                        "Unassigned",
                    },
                  ]}
                />
              </Panel>
              <Panel
                title="Recently Resolved Repairs"
                subtitle="Latest completed maintenance work."
                bodyClassName=""
              >
                <Table
                  rows={recentRepairs.filter((row) =>
                    /resolved|closed|complete/i.test(repairStatus(row)),
                  )}
                  empty="No resolved repair logs are available."
                  columns={[
                    {
                      label: "Asset",
                      render: (row) => (
                        <span className="text-slate-900">
                          {row.assetName || row.assetCode || "Asset"}
                        </span>
                      ),
                    },
                    {
                      label: "Resolution",
                      render: (row) =>
                        row.resolutionNote ||
                        row.issueDescription ||
                        "Completed",
                    },
                    {
                      label: "Completed",
                      render: (row) =>
                        date(
                          row.resolvedAt || row.completedAt || row.updatedAt,
                        ),
                    },
                    {
                      label: "Status",
                      render: (row) => (
                        <span
                          className={`rounded-md px-2 py-1 text-[9px] ${tone(repairStatus(row))}`}
                        >
                          {label(repairStatus(row))}
                        </span>
                      ),
                    },
                  ]}
                />
              </Panel>
            </div>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
