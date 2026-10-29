import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  CircleGauge,
  Code2,
  Eye,
  Globe2,
  MessageSquareText,
  NotebookText,
  RefreshCw,
  Star,
  Target,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import techBannerImage from "../../assets/tech-dashboard-banner.webp";
import { DEFAULT_FISCAL_YEAR } from "../../features/finance/utils/fiscalYear";
import useDashboardAccess from "../../hooks/useDashboardAccess";
import { getDepartmentFinanceData } from "../../services/finance";
import { getWebsiteLeads } from "../../services/sales-leads";
import { axiosPrivate } from "../../utils/axios";
import { DepartmentVisitorsCard } from "../Dashboard/FrontendDashboard/dashboard/DepartmentVisitorsCard";
import { TeamLiveStatusCard } from "../Dashboard/FrontendDashboard/dashboard/TeamLiveStatusCard";

type Row = Record<string, any>;
type DashboardData = { leads: Row[]; reviews: Row[]; finance: Row | null };
const EMPTY: DashboardData = { leads: [], reviews: [], finance: null };
const MODULES = [
  {
    id: "tech-website-builder",
    accessId: "website-builder",
    label: "Website Builder",
    icon: Code2,
    route: "/key-apps/website-builder",
    description: "Build, publish, and maintain the workspace website",
    color: "#2563EB",
  },
  {
    id: "website-leads",
    label: "Website Leads",
    icon: NotebookText,
    route: "/key-apps/website-builder/leads",
    description: "Track enquiries, follow-ups, and lead conversions",
    color: "#0D9488",
  },
  {
    id: "website-review",
    label: "Website Review",
    icon: MessageSquareText,
    route: "/key-apps/website-builder/dynamic/reviews",
    description: "Moderate ratings and publish customer feedback",
    color: "#7C3AED",
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
const leadStatus = (row: Row) =>
  row.hostPanelStatus || row.status || row.stage || "New";
const reviewStatus = (row: Row) =>
  row.status || (row.isEnabled ? "Approved" : "Pending");
const tone = (value: unknown) => {
  const text = normalize(value);
  if (/approved|converted|closed|won|published|live/.test(text))
    return "bg-emerald-50 text-emerald-700";
  if (/rejected|lost|spam|disabled/.test(text))
    return "bg-rose-50 text-rose-700";
  if (/contact|progress|follow/.test(text)) return "bg-blue-50 text-blue-700";
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

export default function TechWorkspaceDashboardPage() {
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
      getWebsiteLeads({ limit: 250 }),
      axiosPrivate.get("/api/review", { params: { reviewScope: "website" } }),
      getDepartmentFinanceData(DEFAULT_FISCAL_YEAR, "Technology"),
    ]).then((results) => {
      if (cancelled) return;
      const get = (index: number) =>
        results[index].status === "fulfilled"
          ? (results[index] as PromiseFulfilledResult<any>).value
          : {};
      const finance = get(2);
      setData({
        leads: unwrapRows(get(0), ["leads", "items", "results"]),
        reviews: unwrapRows(get(1), ["reviews", "items", "results"]),
        finance: finance?.data?.data || finance?.data || finance || null,
      });
      setError(
        results.some((result) => result.status === "rejected")
          ? "Some website, review, or budget data could not be refreshed."
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
    const enabled = MODULES.filter((module) =>
      access.hasModule(module.accessId || module.id),
    );
    return enabled.length ? enabled : [...MODULES];
  }, [access]);
  const stats = useMemo(() => {
    const newLeads = data.leads.filter((row) =>
      /new|pending|open/i.test(leadStatus(row)),
    ).length;
    const progressing = data.leads.filter((row) =>
      /contact|progress|follow|qualified/i.test(leadStatus(row)),
    ).length;
    const converted = data.leads.filter((row) =>
      /convert|closed|won|booked/i.test(leadStatus(row)),
    ).length;
    const approvedReviews = data.reviews.filter(
      (row) =>
        /approved|published|live/i.test(reviewStatus(row)) ||
        row.isEnabled === true,
    ).length;
    const pendingReviews = data.reviews.filter((row) =>
      /pending/i.test(reviewStatus(row)),
    ).length;
    const ratings = data.reviews
      .map((row) => number(row.rating || row.stars))
      .filter(Boolean);
    return {
      newLeads,
      progressing,
      converted,
      approvedReviews,
      pendingReviews,
      conversion: data.leads.length
        ? Math.round((converted / data.leads.length) * 100)
        : 0,
      averageRating: ratings.length
        ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
        : 0,
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
  const leadStatuses = useMemo(
    () => group(data.leads, leadStatus),
    [data.leads],
  );
  const reviewStatuses = useMemo(
    () => group(data.reviews, reviewStatus),
    [data.reviews],
  );
  const monthlyLeads = useMemo(() => {
    const now = new Date();
    const rows = Array.from({ length: 12 }, (_, offset) => {
      const item = new Date(now.getFullYear(), now.getMonth() - 11 + offset, 1);
      return {
        key: `${item.getFullYear()}-${item.getMonth()}`,
        label: item.toLocaleDateString("en-IN", { month: "short" }),
        value: 0,
      };
    });
    data.leads.forEach((lead) => {
      const item = new Date(
        String(lead.createdAt || lead.submittedAt || lead.date || ""),
      );
      const target = rows.find(
        (row) => row.key === `${item.getFullYear()}-${item.getMonth()}`,
      );
      if (!Number.isNaN(item.getTime()) && target) target.value += 1;
    });
    return rows;
  }, [data.leads]);
  const recentLeads = useMemo(
    () =>
      [...data.leads]
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.submittedAt || 0).getTime() -
            new Date(a.createdAt || a.submittedAt || 0).getTime(),
        )
        .slice(0, 10),
    [data.leads],
  );
  const recentReviews = useMemo(
    () =>
      [...data.reviews]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 10),
    [data.reviews],
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
  const leadOptions = {
    ...chartBase,
    xaxis: { categories: monthlyLeads.map((row) => row.label) },
    colors: ["#2563EB"],
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={techBannerImage}
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
                <span className="text-primary">Tech</span>{" "}
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-md text-[11px] font-pmedium leading-5 text-slate-500">
                Live website delivery, digital lead conversion, review
                moderation, and technology spending.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Website", "Leads", "Reviews", "Budget"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600"
                  >
                    {item}
                  </span>
                ))}
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
              icon={<NotebookText size={20} />}
              label="Website leads"
              value={data.leads.length}
              sub="All captured website enquiries"
            />
            <Stat
              icon={<Target size={20} />}
              label="New leads"
              value={stats.newLeads}
              sub="New enquiries awaiting action"
              state={stats.newLeads ? "attention" : "success"}
            />
            <Stat
              icon={<TrendingUp size={20} />}
              label="In follow-up"
              value={stats.progressing}
              sub="Contacted and qualified leads"
            />
            <Stat
              icon={<CheckCircle2 size={20} />}
              label="Converted leads"
              value={stats.converted}
              sub={`${stats.conversion}% overall conversion`}
              state="success"
            />
            <Stat
              icon={<MessageSquareText size={20} />}
              label="Website reviews"
              value={data.reviews.length}
              sub={`${stats.pendingReviews} awaiting moderation`}
            />
            <Stat
              icon={<BadgeCheck size={20} />}
              label="Published reviews"
              value={stats.approvedReviews}
              sub="Approved or visible on website"
              state="success"
            />
            <Stat
              icon={<Star size={20} />}
              label="Average rating"
              value={stats.averageRating ? stats.averageRating.toFixed(1) : "—"}
              sub="Across submitted website reviews"
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
              department="tech"
              viewAllRoute="/common-modules/attendance"
            />
            <DepartmentVisitorsCard department="tech" title="Tech Visitors" />
          </section>
        ) : null}

        {!loading ? (
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="text-sm font-pmedium text-slate-900">
                Tech operations overview
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">
                Website demand, customer feedback, and Technology budget
                position.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Summary
                title="Lead pipeline"
                icon={<NotebookText size={18} />}
                rows={[
                  { label: "Total website leads", value: data.leads.length },
                  {
                    label: "New / awaiting action",
                    value: stats.newLeads,
                    tone: stats.newLeads
                      ? "text-amber-700"
                      : "text-emerald-700",
                  },
                  { label: "In follow-up", value: stats.progressing },
                  {
                    label: "Converted",
                    value: stats.converted,
                    tone: "text-emerald-700",
                  },
                ]}
              />
              <Summary
                title="Review health"
                icon={<MessageSquareText size={18} />}
                rows={[
                  { label: "Total reviews", value: data.reviews.length },
                  {
                    label: "Published",
                    value: stats.approvedReviews,
                    tone: "text-emerald-700",
                  },
                  {
                    label: "Pending moderation",
                    value: stats.pendingReviews,
                    tone: stats.pendingReviews
                      ? "text-amber-700"
                      : "text-emerald-700",
                  },
                  {
                    label: "Average rating",
                    value: stats.averageRating
                      ? `${stats.averageRating.toFixed(1)} / 5`
                      : "No ratings",
                  },
                ]}
              />
              <Summary
                title="Technology budget"
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
                Manage tech operations
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">
                Open the same enabled modules available in the Tech Dashboard
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
                  state={{ fromSection: "tech-department" }}
                />
              );
            })}
          </div>
        </section>

        {!loading && !access.isLoading ? (
          <>
            <div className="mb-4">
              <Panel
                title="Technology Budget: Projected vs Actual Spent"
                subtitle={`${DEFAULT_FISCAL_YEAR} monthly Finance Management plan for Technology.`}
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
                    No approved Technology monthly budget is available for{" "}
                    {DEFAULT_FISCAL_YEAR}.
                  </Empty>
                )}
              </Panel>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <Panel
                title="Monthly Website Lead Trend"
                subtitle="Website enquiries captured during the last 12 calendar months."
              >
                <GroupedBarGraph
                  options={leadOptions}
                  series={[
                    {
                      name: "Website leads",
                      data: monthlyLeads.map((row) => row.value),
                    },
                  ]}
                />
              </Panel>
              <Panel
                title="Lead Pipeline Status"
                subtitle="Website leads grouped by current workflow stage."
              >
                {leadStatuses.length ? (
                  <DonutChart
                    centerLabel="Leads"
                    labels={leadStatuses.map(([name]) => name)}
                    series={leadStatuses.map(([, value]) => value)}
                    colors={COLORS.slice(0, leadStatuses.length)}
                    tooltipValue={leadStatuses.map(
                      ([, value]) => `${value} leads`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No website lead status data is available.</Empty>
                )}
              </Panel>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Panel
                title="Website Review Status"
                subtitle="Customer reviews grouped by moderation state."
              >
                {reviewStatuses.length ? (
                  <DonutChart
                    centerLabel="Reviews"
                    labels={reviewStatuses.map(([name]) => name)}
                    series={reviewStatuses.map(([, value]) => value)}
                    colors={COLORS.slice(0, reviewStatuses.length)}
                    tooltipValue={reviewStatuses.map(
                      ([, value]) => `${value} reviews`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No website review data is available.</Empty>
                )}
              </Panel>
              <Panel
                title="Digital Operations Snapshot"
                subtitle="Immediate operating signals for the Tech team."
              >
                <div className="divide-y divide-slate-100">
                  {[
                    {
                      icon: Globe2,
                      name: "Active digital modules",
                      value: modules.length,
                      style: "bg-blue-50 text-blue-700",
                    },
                    {
                      icon: Target,
                      name: "Lead conversion rate",
                      value: `${stats.conversion}%`,
                      style: "bg-emerald-50 text-emerald-700",
                    },
                    {
                      icon: Eye,
                      name: "Reviews awaiting moderation",
                      value: stats.pendingReviews,
                      style: "bg-amber-50 text-amber-700",
                    },
                    {
                      icon: CircleGauge,
                      name: "Technology budget remaining",
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
                title="Recent Website Leads"
                subtitle="Latest enquiries and their current follow-up state."
                bodyClassName=""
              >
                <RecordsTable
                  rows={recentLeads}
                  empty="No website leads are available yet."
                  columns={[
                    {
                      label: "Lead",
                      width: "32%",
                      render: (row) => (
                        <div className="min-w-0">
                          <p className="truncate text-slate-900">
                            {row.name ||
                              row.fullName ||
                              row.customerName ||
                              "Unnamed lead"}
                          </p>
                          <p className="truncate text-[9px] text-slate-400">
                            {row.email || row.phone || "No contact"}
                          </p>
                        </div>
                      ),
                    },
                    {
                      label: "Source",
                      width: "22%",
                      render: (row) =>
                        title(
                          row.source || row.sourceType || row.formName,
                          "Website",
                        ),
                    },
                    {
                      label: "Received",
                      width: "23%",
                      render: (row) =>
                        date(row.createdAt || row.submittedAt || row.date),
                    },
                    {
                      label: "Status",
                      width: "23%",
                      render: (row) => (
                        <span
                          className={`inline-flex max-w-full truncate rounded-full px-2 py-1 text-[9px] ${tone(leadStatus(row))}`}
                        >
                          {title(leadStatus(row))}
                        </span>
                      ),
                    },
                  ]}
                />
              </Panel>
              <Panel
                title="Recent Website Reviews"
                subtitle="Latest feedback submitted for moderation or publishing."
                bodyClassName=""
              >
                <RecordsTable
                  rows={recentReviews}
                  empty="No website reviews are available yet."
                  columns={[
                    {
                      label: "Reviewer",
                      width: "30%",
                      render: (row) => (
                        <div className="min-w-0">
                          <p className="truncate text-slate-900">
                            {row.name || row.customerName || "Anonymous"}
                          </p>
                          <p className="truncate text-[9px] text-slate-400">
                            {row.email || "Website review"}
                          </p>
                        </div>
                      ),
                    },
                    {
                      label: "Rating",
                      width: "18%",
                      render: (row) =>
                        row.rating || row.stars
                          ? `${number(row.rating || row.stars)} / 5`
                          : "—",
                    },
                    {
                      label: "Received",
                      width: "27%",
                      render: (row) => date(row.createdAt || row.date),
                    },
                    {
                      label: "Status",
                      width: "25%",
                      render: (row) => (
                        <span
                          className={`inline-flex max-w-full truncate rounded-full px-2 py-1 text-[9px] ${tone(reviewStatus(row))}`}
                        >
                          {title(reviewStatus(row))}
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
