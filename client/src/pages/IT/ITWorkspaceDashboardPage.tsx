import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleGauge,
  Clock3,
  FileSearch,
  KeyRound,
  Laptop,
  MonitorCog,
  RefreshCw,
  Server,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import itBannerImage from "../../assets/it-dashboard-banner.webp";
import { DEFAULT_FISCAL_YEAR } from "../../features/finance/utils/fiscalYear";
import useDashboardAccess from "../../hooks/useDashboardAccess";
import { getDepartmentFinanceData } from "../../services/finance";
import { getAssets } from "../../services/assets";
import { getITOverview } from "../../services/it";
import { getRepairLogs } from "../../services/repair-logs";
import { DepartmentVisitorsCard } from "../Dashboard/FrontendDashboard/dashboard/DepartmentVisitorsCard";
import { TeamLiveStatusCard } from "../Dashboard/FrontendDashboard/dashboard/TeamLiveStatusCard";

type Row = Record<string, any>;
type DashboardData = {
  overview: Row;
  repairs: Row[];
  assets: Row[];
  finance: Row | null;
};
const EMPTY: DashboardData = {
  overview: {},
  repairs: [],
  assets: [],
  finance: null,
};
const MODULES = [
  {
    id: "it-repair-logs",
    label: "IT Repair Logs",
    icon: FileSearch,
    route: "/department-accesses/it-department/repair-logs",
    description: "Track device and system repair requests",
    color: "#2563EB",
  },
  {
    id: "it-system-access",
    label: "System Access",
    icon: ShieldCheck,
    route: "/department-accesses/it-department/system-access",
    description: "Manage software access, assignment, and security",
    color: "#0D9488",
  },
] as const;
const COLORS = [
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
const title = (value: unknown, fallback = "Not recorded") =>
  String(value || fallback)
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
const assetStatus = (row: Row) =>
  row.status ||
  (row.assignedTo || row.assignedToUserId ? "Assigned" : "Available");
const tone = (value: unknown) => {
  const text = normalize(value);
  if (/active|assigned|resolved|closed|complete|valid/.test(text))
    return "bg-emerald-50 text-emerald-700";
  if (/failed|expired|decommissioned|disabled/.test(text))
    return "bg-rose-50 text-rose-700";
  if (/progress|maintenance/.test(text)) return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
};
const unwrapRows = (response: any, keys: string[]) => {
  const root = response?.data?.data ?? response?.data ?? response;
  for (const key of keys) if (Array.isArray(root?.[key])) return root[key];
  return list(root);
};

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[300px] items-center justify-center px-6 text-center text-[11px] text-slate-500">
      {children}
    </div>
  );
}

function Panel({
  title: heading,
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
            {heading}
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
  label,
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

function Summary({
  title: heading,
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
          {heading}
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

function RecordsTable({
  rows,
  empty,
  columns,
}: {
  rows: Row[];
  empty: string;
  columns: Array<{
    label: string;
    width?: string;
    render: (row: Row) => ReactNode;
  }>;
}) {
  if (!rows.length)
    return (
      <div className="flex min-h-[240px] items-center justify-center px-6 text-center text-[11px] text-slate-500">
        {empty}
      </div>
    );
  return (
    <div className="min-h-[240px] max-h-[360px] overflow-y-auto overflow-x-hidden">
      <table className="w-full table-fixed border-collapse">
        <thead className="sticky top-0 z-10 bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.label}
                style={{ width: column.width }}
                className="px-5 py-3 text-left text-[9px] font-pmedium uppercase tracking-[0.08em] text-slate-500"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr
              key={row._id || row.id || index}
              className="text-[11px] text-slate-600 hover:bg-blue-50/30"
            >
              {columns.map((column) => (
                <td key={column.label} className="truncate px-5 py-3">
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

export default function ITWorkspaceDashboardPage() {
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
      getITOverview(),
      getRepairLogs({ limit: 250 }),
      getAssets({ limit: 250 }),
      getDepartmentFinanceData(DEFAULT_FISCAL_YEAR, "IT"),
    ]).then((results) => {
      if (cancelled) return;
      const get = (index: number) =>
        results[index].status === "fulfilled"
          ? (results[index] as PromiseFulfilledResult<any>).value
          : {};
      const finance = get(3);
      setData({
        overview: get(0) || {},
        repairs: unwrapRows(get(1), ["repairLogs", "items", "results"]),
        assets: unwrapRows(get(2), ["assets", "items", "results"]).filter(
          (row) =>
            /software|hardware|computer|laptop|network|server/i.test(
              String(row.category || row.assetType || row.type || ""),
            ),
        ),
        finance: finance?.data?.data || finance?.data || finance || null,
      });
      setError(
        results.some((result) => result.status === "rejected")
          ? "Some repair, system access, asset, or budget data could not be refreshed."
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
      /open|pending/i.test(repairStatus(row)),
    ).length;
    const inProgress = data.repairs.filter((row) =>
      /progress|assigned/i.test(repairStatus(row)),
    ).length;
    const resolved = data.repairs.filter((row) =>
      /resolved|closed|complete/i.test(repairStatus(row)),
    ).length;
    const assignedAssets = data.assets.filter((row) =>
      Boolean(
        row.assignedTo ||
        row.assignedToUserId ||
        row.assignedToDepartment ||
        row.assignedToRole,
      ),
    ).length;
    const expiring = data.assets.filter((row) => {
      const raw = row.expiryDate || row.warrantyExpiry;
      if (!raw) return false;
      const days = Math.ceil((new Date(raw).getTime() - Date.now()) / 86400000);
      return days >= 0 && days <= 30;
    }).length;
    const resolutionRate = data.repairs.length
      ? Math.round((resolved / data.repairs.length) * 100)
      : number(data.overview.resolutionRate);
    return {
      open,
      inProgress,
      resolved,
      assignedAssets,
      expiring,
      resolutionRate,
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
  const group = (rows: Row[], resolver: (row: Row) => unknown) => {
    const values = new Map<string, number>();
    rows.forEach((row) => {
      const key = title(resolver(row), "Unknown");
      values.set(key, (values.get(key) || 0) + 1);
    });
    return [...values.entries()].slice(0, 6);
  };
  const repairStatuses = useMemo(
    () => group(data.repairs, repairStatus),
    [data.repairs],
  );
  const assetStatuses = useMemo(
    () => group(data.assets, assetStatus),
    [data.assets],
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
      const item = new Date(
        String(repair.createdAt || repair.submittedAt || repair.date || ""),
      );
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
            new Date(b.createdAt || b.submittedAt || 0).getTime() -
            new Date(a.createdAt || a.submittedAt || 0).getTime(),
        )
        .slice(0, 10),
    [data.repairs],
  );
  const recentAssets = useMemo(
    () =>
      [...data.assets]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 10),
    [data.assets],
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
    colors: ["#2563EB"],
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={itBannerImage}
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
                <span className="text-primary">IT</span>{" "}
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-md text-[11px] font-pmedium leading-5 text-slate-500">
                Live repair activity, system access health, service continuity,
                and IT spending.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Repairs", "System access", "Assets", "Budget"].map(
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
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, key) => (
              <div
                key={key}
                className="h-[112px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              icon={<MonitorCog size={20} />}
              label="Resolution rate"
              value={`${stats.resolutionRate}%`}
              sub={`${data.repairs.length} total repair logs`}
              state={stats.resolutionRate >= 80 ? "success" : "attention"}
            />
            <Stat
              icon={<FileSearch size={20} />}
              label="Total repair logs"
              value={data.repairs.length}
              sub="All device and system incidents"
            />
            <Stat
              icon={<AlertTriangle size={20} />}
              label="Open repairs"
              value={stats.open}
              sub="Incidents awaiting assignment"
              state={stats.open ? "attention" : "success"}
            />
            <Stat
              icon={<Clock3 size={20} />}
              label="In progress"
              value={stats.inProgress}
              sub="Repairs currently being handled"
              state={stats.inProgress ? "attention" : "success"}
            />
            <Stat
              icon={<CheckCircle2 size={20} />}
              label="Resolved repairs"
              value={stats.resolved}
              sub="Resolved, completed, or closed logs"
              state="success"
            />
            <Stat
              icon={<Laptop size={20} />}
              label="IT assets"
              value={data.assets.length}
              sub="Software, devices, and infrastructure"
            />
            <Stat
              icon={<KeyRound size={20} />}
              label="Assigned access"
              value={stats.assignedAssets}
              sub={`${stats.expiring} licenses expiring soon`}
              state={stats.expiring ? "attention" : "success"}
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
              department="it"
              viewAllRoute="/common-modules/attendance"
            />
            <DepartmentVisitorsCard department="it" title="IT Visitors" />
          </section>
        ) : null}

        {!loading ? (
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="text-sm font-pmedium text-slate-900">
                IT operations overview
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">
                Incident resolution, software access, infrastructure assets, and
                IT budget position.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Summary
                title="Repair workload"
                icon={<Wrench size={18} />}
                rows={[
                  { label: "Total repair logs", value: data.repairs.length },
                  {
                    label: "Open / awaiting action",
                    value: stats.open,
                    tone: stats.open ? "text-amber-700" : "text-emerald-700",
                  },
                  { label: "In progress", value: stats.inProgress },
                  {
                    label: "Resolved / closed",
                    value: stats.resolved,
                    tone: "text-emerald-700",
                  },
                ]}
              />
              <Summary
                title="System access health"
                icon={<ShieldCheck size={18} />}
                rows={[
                  {
                    label: "IT assets and licenses",
                    value: data.assets.length,
                  },
                  {
                    label: "Assigned access",
                    value: stats.assignedAssets,
                    tone: "text-emerald-700",
                  },
                  {
                    label: "Unassigned / available",
                    value: Math.max(
                      0,
                      data.assets.length - stats.assignedAssets,
                    ),
                  },
                  {
                    label: "Expiring within 30 days",
                    value: stats.expiring,
                    tone: stats.expiring
                      ? "text-amber-700"
                      : "text-emerald-700",
                  },
                ]}
              />
              <Summary
                title="IT budget"
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
                Manage IT operations
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">
                Open the same enabled modules available in the IT Dashboard
                dropdown.
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                  state={{ fromSection: "it-department" }}
                />
              );
            })}
          </div>
        </section>

        {!loading && !access.isLoading ? (
          <>
            <div className="mb-4">
              <Panel
                title="IT Budget: Projected vs Actual Spent"
                subtitle={`${DEFAULT_FISCAL_YEAR} monthly Finance Management plan for IT.`}
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
                    No approved IT monthly budget is available for{" "}
                    {DEFAULT_FISCAL_YEAR}.
                  </Empty>
                )}
              </Panel>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <Panel
                title="Monthly IT Repair Trend"
                subtitle="IT repair requests captured during the last 12 calendar months."
              >
                <GroupedBarGraph
                  options={repairOptions}
                  series={[
                    {
                      name: "IT repair logs",
                      data: monthlyRepairs.map((row) => row.value),
                    },
                  ]}
                />
              </Panel>
              <Panel
                title="Repair Log Status"
                subtitle="IT repair logs grouped by current workflow status."
              >
                {repairStatuses.length ? (
                  <DonutChart
                    centerLabel="Repairs"
                    labels={repairStatuses.map(([name]) => name)}
                    series={repairStatuses.map(([, value]) => value)}
                    colors={COLORS.slice(0, repairStatuses.length)}
                    tooltipValue={repairStatuses.map(
                      ([, value]) => `${value} logs`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No IT repair status data is available.</Empty>
                )}
              </Panel>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Panel
                title="System Access Status"
                subtitle="IT assets and software licenses grouped by access state."
              >
                {assetStatuses.length ? (
                  <DonutChart
                    centerLabel="Assets"
                    labels={assetStatuses.map(([name]) => name)}
                    series={assetStatuses.map(([, value]) => value)}
                    colors={COLORS.slice(0, assetStatuses.length)}
                    tooltipValue={assetStatuses.map(
                      ([, value]) => `${value} assets`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No system access data is available.</Empty>
                )}
              </Panel>
              <Panel
                title="IT Operations Snapshot"
                subtitle="Immediate operating signals for the IT team."
              >
                <div className="divide-y divide-slate-100">
                  {[
                    {
                      icon: Server,
                      name: "Active IT modules",
                      value: modules.length,
                      style: "bg-blue-50 text-blue-700",
                    },
                    {
                      icon: MonitorCog,
                      name: "Repair resolution rate",
                      value: `${stats.resolutionRate}%`,
                      style: "bg-emerald-50 text-emerald-700",
                    },
                    {
                      icon: KeyRound,
                      name: "Licenses expiring soon",
                      value: stats.expiring,
                      style: "bg-amber-50 text-amber-700",
                    },
                    {
                      icon: CircleGauge,
                      name: "IT budget remaining",
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
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Panel
                title="Recent IT Repair Logs"
                subtitle="Latest device and system incidents with ownership status."
                bodyClassName=""
              >
                <RecordsTable
                  rows={recentRepairs}
                  empty="No repair logs are available yet."
                  columns={[
                    {
                      label: "Asset / log",
                      width: "32%",
                      render: (row) => (
                        <div className="min-w-0">
                          <p className="truncate text-slate-900">
                            {row.assetName ||
                              row.repairLogCode ||
                              row.assetCode ||
                              "IT repair"}
                          </p>
                          <p className="truncate text-[9px] text-slate-400">
                            {row.issueType ||
                              row.issueDescription ||
                              "Issue not described"}
                          </p>
                        </div>
                      ),
                    },
                    {
                      label: "Assigned to",
                      width: "22%",
                      render: (row) =>
                        title(row.assignedTo || row.requestedBy, "Unassigned"),
                    },
                    {
                      label: "Received",
                      width: "23%",
                      render: (row) =>
                        date(row.createdAt || row.requestedAt || row.updatedAt),
                    },
                    {
                      label: "Status",
                      width: "23%",
                      render: (row) => (
                        <span
                          className={`inline-flex max-w-full truncate rounded-full px-2 py-1 text-[9px] ${tone(repairStatus(row))}`}
                        >
                          {title(repairStatus(row))}
                        </span>
                      ),
                    },
                  ]}
                />
              </Panel>
              <Panel
                title="Recent System Access Assets"
                subtitle="Latest software and infrastructure records used for access control."
                bodyClassName=""
              >
                <RecordsTable
                  rows={recentAssets}
                  empty="No IT system access assets are available yet."
                  columns={[
                    {
                      label: "Asset",
                      width: "30%",
                      render: (row) => (
                        <div className="min-w-0">
                          <p className="truncate text-slate-900">
                            {row.name || row.assetName || "Unnamed asset"}
                          </p>
                          <p className="truncate text-[9px] text-slate-400">
                            {row.assetCode ||
                              row.serialNumber ||
                              "System access"}
                          </p>
                        </div>
                      ),
                    },
                    {
                      label: "Assigned to",
                      width: "18%",
                      render: (row) =>
                        row.assignedTo ||
                        row.assignedToDepartment ||
                        row.assignedToRole ||
                        "Unassigned",
                    },
                    {
                      label: "Expiry",
                      width: "27%",
                      render: (row) =>
                        date(row.expiryDate || row.warrantyExpiry),
                    },
                    {
                      label: "Status",
                      width: "25%",
                      render: (row) => (
                        <span
                          className={`inline-flex max-w-full truncate rounded-full px-2 py-1 text-[9px] ${tone(assetStatus(row))}`}
                        >
                          {title(assetStatus(row))}
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
