import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Banknote,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  IndianRupee,
  Landmark,
  PiggyBank,
  Receipt,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import financeBannerImage from "../../assets/finance-dashboard-banner.png";
import { DEFAULT_FISCAL_YEAR } from "../../features/finance/utils/fiscalYear";
import useDashboardAccess from "../../hooks/useDashboardAccess";
import {
  getFinanceIncomeLedger,
  getFinanceRevenueEntries,
  getFinanceSnapshot,
  getPayrollSnapshot,
  getTenantBillingSnapshot,
  getTenantRentRecords,
  getVirtualOfficeRentRecords,
} from "../../services/finance";
import { DepartmentVisitorsCard } from "../Dashboard/FrontendDashboard/dashboard/DepartmentVisitorsCard";
import { TeamLiveStatusCard } from "../Dashboard/FrontendDashboard/dashboard/TeamLiveStatusCard";

type Row = Record<string, any>;
type DashboardData = {
  snapshot: Row;
  billing: Row[];
  rents: Row[];
  income: Row[];
  revenue: Row[];
  payroll: Row[];
};

const EMPTY: DashboardData = {
  snapshot: {},
  billing: [],
  rents: [],
  income: [],
  revenue: [],
  payroll: [],
};
const MODULES = [
  {
    id: "finance-budget",
    label: "Expenses & Budget",
    icon: PiggyBank,
    route: "/department-accesses/finance-department/expenses-budget",
    description: "Plan budgets and track department expenses",
    color: "#2563EB",
  },
  {
    id: "billing-payments",
    label: "Billing & Payments",
    icon: Receipt,
    route: "/department-accesses/finance-department/billing-payments",
    description: "Manage collections, deposits, rent, and payroll",
    color: "#0D9488",
  },
  {
    id: "accounting",
    label: "Accounting",
    icon: Calculator,
    route: "/department-accesses/finance-department/accounting",
    description: "Review ledgers, entries, and financial records",
    color: "#7C3AED",
  },
] as const;
const PALETTE = [
  "#1E3D73",
  "#2563EB",
  "#22C55E",
  "#F59E0B",
  "#7C3AED",
  "#EF4444",
];
const list = (value: unknown): Row[] => (Array.isArray(value) ? value : []);
const number = (value: unknown) =>
  Number(String(value ?? "0").replace(/,/g, "")) || 0;
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: Math.abs(value) >= 100000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 100000 ? 1 : 0,
  }).format(value || 0);
const label = (value: unknown) =>
  String(value || "Pending")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const status = (row: Row) =>
  row.status ||
  row.paymentStatus ||
  row.paidStatus ||
  row.securityDepositPaidStatus ||
  row.payment?.status ||
  row.financials?.paymentStatus ||
  "Pending";
const amount = (row: Row) =>
  number(
    row.amount ??
      row.totalAmount ??
      row.receivedAmount ??
      row.paidAmount ??
      row.rentAmount ??
      row.monthlyRent ??
      row.securityDepositAmount ??
      row.netAmount,
  );
const rowDate = (row: Row) =>
  row.paymentDate ||
  row.paidAt ||
  row.receivedAt ||
  row.invoiceDate ||
  row.dueDate ||
  row.createdAt ||
  row.updatedAt;
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
const isPaid = (value: unknown) =>
  /paid|confirmed|received|processed|complete/i.test(String(value || ""));
const tone = (value: unknown) => {
  const text = String(value || "").toLowerCase();
  if (isPaid(text) || text.includes("approve"))
    return "bg-emerald-50 text-emerald-700";
  if (/reject|overdue|failed|reverse/.test(text))
    return "bg-rose-50 text-rose-700";
  if (/process|review/.test(text)) return "bg-blue-50 text-blue-700";
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
              key={row.id || row._id || row.recordId || index}
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

export default function FinanceWorkspaceDashboardPage() {
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
      getFinanceSnapshot(DEFAULT_FISCAL_YEAR),
      getTenantBillingSnapshot({ fiscalYear: DEFAULT_FISCAL_YEAR }),
      getTenantRentRecords({ fiscalYear: DEFAULT_FISCAL_YEAR }),
      getVirtualOfficeRentRecords({ fiscalYear: DEFAULT_FISCAL_YEAR }),
      getFinanceIncomeLedger({ fiscalYear: DEFAULT_FISCAL_YEAR }),
      getFinanceRevenueEntries({ fiscalYear: DEFAULT_FISCAL_YEAR }),
      getPayrollSnapshot(),
    ]).then((results) => {
      if (cancelled) return;
      const get = (index: number) =>
        results[index].status === "fulfilled"
          ? (results[index] as PromiseFulfilledResult<any>).value || {}
          : {};
      const rent = get(2);
      const virtualRent = get(3);
      const payroll = get(6);
      setData({
        snapshot: get(0),
        billing: list(get(1)?.records || get(1)?.billing || get(1)),
        rents: [
          ...list(rent?.records || rent?.rents || rent),
          ...list(virtualRent?.records || virtualRent?.rents || virtualRent),
        ],
        income: list(get(4)?.entries || get(4)?.records || get(4)),
        revenue: list(get(5)?.entries || get(5)?.records || get(5)),
        payroll: list(payroll?.currentCycle?.employees || payroll?.employees),
      });
      setError(
        results.some((result) => result.status === "rejected")
          ? "Some budget, billing, revenue, or payroll data could not be refreshed."
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
  const plans = useMemo(
    () => list(data.snapshot.departmentFinance),
    [data.snapshot.departmentFinance],
  );
  const budget = useMemo(() => {
    const months = new Map<
      string,
      { label: string; projected: number; actual: number }
    >();
    plans.forEach((plan) =>
      list(plan.monthlyPlan).forEach((month, index) => {
        const monthLabel = String(
          month.month || month.monthLabel || month.monthKey || `M${index + 1}`,
        ).slice(0, 3);
        const expenses = list(month.expenses);
        const current = months.get(monthLabel) || {
          label: monthLabel,
          projected: 0,
          actual: 0,
        };
        current.projected +=
          expenses.reduce(
            (sum, expense) =>
              sum + number(expense.projectedAmount ?? expense.amount),
            0,
          ) || number(month.projectedBudget ?? month.allocatedBudget);
        current.actual +=
          expenses.reduce(
            (sum, expense) =>
              sum + number(expense.actualAmount ?? expense.actualSpent),
            0,
          ) || number(month.actualSpent ?? month.actualAmount);
        months.set(monthLabel, current);
      }),
    );
    const rows = [...months.values()];
    const projected = rows.reduce((sum, row) => sum + row.projected, 0);
    const actual = rows.reduce((sum, row) => sum + row.actual, 0);
    return {
      rows,
      projected,
      actual,
      remaining: Math.max(0, projected - actual),
      utilization: projected ? Math.round((actual / projected) * 100) : 0,
    };
  }, [plans]);
  const ledger = useMemo(
    () => [...data.income, ...data.revenue],
    [data.income, data.revenue],
  );
  const collected = useMemo(
    () =>
      data.income.reduce((sum, row) => sum + amount(row), 0) +
      data.revenue
        .filter((row) => isPaid(status(row)))
        .reduce((sum, row) => sum + amount(row), 0),
    [data.income, data.revenue],
  );
  const pendingRent = useMemo(
    () =>
      data.rents
        .filter((row) => !isPaid(status(row)))
        .reduce((sum, row) => sum + amount(row), 0),
    [data.rents],
  );
  const paidDeposits = useMemo(
    () => data.billing.filter((row) => isPaid(status(row))),
    [data.billing],
  );
  const depositAmount = useMemo(
    () => paidDeposits.reduce((sum, row) => sum + amount(row), 0),
    [paidDeposits],
  );
  const payroll = useMemo(() => {
    const total = data.payroll.reduce(
      (sum, row) =>
        sum +
        number(row.financials?.netSalary ?? row.netSalary ?? row.netPayable),
      0,
    );
    const paid = data.payroll.filter((row) => isPaid(status(row))).length;
    return { total, paid, pending: Math.max(0, data.payroll.length - paid) };
  }, [data.payroll]);
  const pendingApprovals = useMemo(
    () =>
      [
        ...list(data.snapshot.annualRequests),
        ...list(data.snapshot.extraRequests),
      ].filter((row) => /pending|discuss|review/i.test(row.status || "Pending"))
        .length,
    [data.snapshot],
  );
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const rows = Array.from({ length: 12 }, (_, offset) => {
      const item = new Date(now.getFullYear(), now.getMonth() - 11 + offset, 1);
      return {
        key: `${item.getFullYear()}-${item.getMonth()}`,
        label: item.toLocaleDateString("en-IN", { month: "short" }),
        value: 0,
      };
    });
    ledger.forEach((entry) => {
      const item = new Date(String(rowDate(entry) || ""));
      const target = rows.find(
        (row) => row.key === `${item.getFullYear()}-${item.getMonth()}`,
      );
      if (!Number.isNaN(item.getTime()) && target)
        target.value += amount(entry);
    });
    return rows;
  }, [ledger]);
  const revenueSources = useMemo(() => {
    const values = new Map<string, number>();
    ledger.forEach((row) => {
      const name = label(
        row.source || row.category || row.vertical || row.type || "Other",
      );
      values.set(name, (values.get(name) || 0) + amount(row));
    });
    return [...values.entries()]
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [ledger]);
  const rentPaid = data.rents.filter((row) => isPaid(status(row))).length;
  const recent = (rows: Row[]) =>
    [...rows]
      .sort(
        (a, b) =>
          new Date(rowDate(b) || 0).getTime() -
          new Date(rowDate(a) || 0).getTime(),
      )
      .slice(0, 8);
  const chartBase = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "48%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    yaxis: { labels: { formatter: (value: number) => money(value) } },
    tooltip: {
      theme: "light",
      y: { formatter: (value: number) => money(value) },
    },
  };
  const budgetOptions = {
    ...chartBase,
    xaxis: { categories: budget.rows.map((row) => row.label) },
    colors: ["#2563EB", "#22C55E"],
  };
  const revenueOptions = {
    ...chartBase,
    xaxis: { categories: monthlyRevenue.map((row) => row.label) },
    colors: ["#2563EB"],
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={financeBannerImage}
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
                <span className="text-primary">Finance</span>{" "}
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-md text-[11px] font-pmedium leading-5 text-slate-500">
                Budget control, collections, payroll, accounting, and approval
                visibility across the workspace.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Budgets", "Collections", "Payroll", "Accounting"].map(
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
              icon={<PiggyBank size={20} />}
              label="Projected budget"
              value={money(budget.projected)}
              sub={`${DEFAULT_FISCAL_YEAR} department plans`}
            />
            <Stat
              icon={<TrendingDown size={20} />}
              label="Actual spent"
              value={money(budget.actual)}
              sub={`${budget.utilization}% of projected budget used`}
              state={budget.utilization > 90 ? "attention" : "default"}
            />
            <Stat
              icon={<WalletCards size={20} />}
              label="Budget remaining"
              value={money(budget.remaining)}
              sub="Projected less actual spend"
              state={budget.remaining ? "success" : "attention"}
            />
            <Stat
              icon={<IndianRupee size={20} />}
              label="Revenue collected"
              value={money(collected)}
              sub={`${ledger.length} finance entries`}
              state="success"
            />
            <Stat
              icon={<Clock3 size={20} />}
              label="Receivables pending"
              value={money(pendingRent)}
              sub={`${data.rents.length} current rent records`}
              state={pendingRent ? "attention" : "success"}
            />
            <Stat
              icon={<CreditCard size={20} />}
              label="Deposits received"
              value={money(depositAmount)}
              sub={`${paidDeposits.length}/${data.billing.length} deposits paid`}
              state={
                paidDeposits.length < data.billing.length
                  ? "attention"
                  : "success"
              }
            />
            <Stat
              icon={<Banknote size={20} />}
              label="Payroll payable"
              value={money(payroll.total)}
              sub={`${payroll.paid}/${data.payroll.length} employees processed`}
              state={payroll.pending ? "attention" : "success"}
            />
            <Stat
              icon={<CircleDollarSign size={20} />}
              label="Approval queue"
              value={pendingApprovals}
              sub="Annual and extra-budget requests"
              state={pendingApprovals ? "attention" : "success"}
            />
          </div>
        )}
        {!loading ? (
          <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TeamLiveStatusCard
              department="finance"
              viewAllRoute="/common-modules/attendance"
            />
            <DepartmentVisitorsCard
              department="finance"
              title="Finance Visitors"
            />
          </section>
        ) : null}
        <div className="mb-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-pmedium text-slate-900">
                Manage finance operations
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Open the same enabled modules available in the Finance Dashboard
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
                  state={{ fromSection: "finance-department" }}
                />
              );
            })}
          </div>
        </div>
        {!loading && !access.isLoading ? (
          <>
            <div className="mb-4">
              <Panel
                title="Workspace Budget: Projected vs Actual Spent"
                subtitle={`${DEFAULT_FISCAL_YEAR} monthly Finance Management plans across all departments.`}
                action={
                  <Link
                    to="/department-accesses/finance-department/expenses-budget"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-[9px] uppercase tracking-[0.06em] text-slate-600 hover:text-blue-700"
                  >
                    Expenses & Budget
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
                    No approved department budget is available for{" "}
                    {DEFAULT_FISCAL_YEAR}.
                  </Empty>
                )}
              </Panel>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <Panel
                title="Revenue Collection Trend"
                subtitle="Finance ledger and confirmed revenue posted during the last 12 months."
              >
                <GroupedBarGraph
                  options={revenueOptions}
                  series={[
                    {
                      name: "Collected revenue",
                      data: monthlyRevenue.map((row) => row.value),
                    },
                  ]}
                />
              </Panel>
              <Panel
                title="Revenue Sources"
                subtitle="Collected finance entries grouped by source."
              >
                {revenueSources.length ? (
                  <DonutChart
                    centerLabel="Revenue"
                    labels={revenueSources.map(([name]) => name)}
                    series={revenueSources.map(([, value]) => value)}
                    colors={PALETTE.slice(0, revenueSources.length)}
                    tooltipValue={revenueSources.map(([, value]) =>
                      money(value),
                    )}
                    isMonetary
                    wrapLabels
                  />
                ) : (
                  <Empty>No collected revenue source data is available.</Empty>
                )}
              </Panel>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Panel
                title="Rent Collection Status"
                subtitle="Tenant and virtual-office rent records by payment state."
              >
                {data.rents.length ? (
                  <DonutChart
                    centerLabel="Rent cycles"
                    labels={["Paid", "Pending"]}
                    series={[rentPaid, data.rents.length - rentPaid]}
                    colors={["#22C55E", "#F59E0B"]}
                    tooltipValue={[
                      `${rentPaid} records`,
                      `${data.rents.length - rentPaid} records`,
                    ]}
                    wrapLabels
                  />
                ) : (
                  <Empty>No rent collection records are available.</Empty>
                )}
              </Panel>
              <Panel
                title="Payroll Status"
                subtitle="Current payroll cycle grouped by processing state."
              >
                {data.payroll.length ? (
                  <DonutChart
                    centerLabel="Employees"
                    labels={["Processed", "Pending"]}
                    series={[payroll.paid, payroll.pending]}
                    colors={["#22C55E", "#F59E0B"]}
                    tooltipValue={[
                      `${payroll.paid} employees`,
                      `${payroll.pending} employees`,
                    ]}
                    wrapLabels
                  />
                ) : (
                  <Empty>No payroll cycle data is available.</Empty>
                )}
              </Panel>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Panel
                title="Recent Revenue Entries"
                subtitle="Latest ledger and manual revenue activity."
                bodyClassName=""
              >
                <Table
                  rows={recent(ledger)}
                  empty="No revenue entries are available."
                  columns={[
                    {
                      label: "Source",
                      render: (row) => (
                        <span className="text-slate-900">
                          {label(
                            row.source ||
                              row.category ||
                              row.vertical ||
                              row.type ||
                              "Revenue",
                          )}
                        </span>
                      ),
                    },
                    { label: "Amount", render: (row) => money(amount(row)) },
                    { label: "Date", render: (row) => date(rowDate(row)) },
                    {
                      label: "Status",
                      render: (row) => (
                        <span
                          className={`rounded-md px-2 py-1 text-[9px] ${tone(status(row))}`}
                        >
                          {label(status(row))}
                        </span>
                      ),
                    },
                  ]}
                />
              </Panel>
              <Panel
                title="Outstanding Receivables"
                subtitle="Latest tenant and virtual-office rent cycles."
                bodyClassName=""
              >
                <Table
                  rows={recent(data.rents)}
                  empty="No receivable records are available."
                  columns={[
                    {
                      label: "Account",
                      render: (row) => (
                        <span className="text-slate-900">
                          {row.companyName ||
                            row.tenantCompanyName ||
                            row.company ||
                            row.clientName ||
                            "Tenant account"}
                        </span>
                      ),
                    },
                    { label: "Amount", render: (row) => money(amount(row)) },
                    {
                      label: "Due / paid",
                      render: (row) => date(rowDate(row)),
                    },
                    {
                      label: "Status",
                      render: (row) => (
                        <span
                          className={`rounded-md px-2 py-1 text-[9px] ${tone(status(row))}`}
                        >
                          {label(status(row))}
                        </span>
                      ),
                    },
                  ]}
                />
              </Panel>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Panel
                title="Current Payroll Cycle"
                subtitle="Employee net payable and payment processing state."
                bodyClassName=""
              >
                <Table
                  rows={data.payroll.slice(0, 8)}
                  empty="No payroll records are available."
                  columns={[
                    {
                      label: "Employee",
                      render: (row) => (
                        <span className="text-slate-900">
                          {row.name ||
                            row.fullName ||
                            row.employeeName ||
                            "Employee"}
                        </span>
                      ),
                    },
                    {
                      label: "Department",
                      render: (row) => row.department || "Not recorded",
                    },
                    {
                      label: "Net payable",
                      render: (row) =>
                        money(
                          number(
                            row.financials?.netSalary ??
                              row.netSalary ??
                              row.netPayable,
                          ),
                        ),
                    },
                    {
                      label: "Status",
                      render: (row) => (
                        <span
                          className={`rounded-md px-2 py-1 text-[9px] ${tone(status(row))}`}
                        >
                          {label(status(row))}
                        </span>
                      ),
                    },
                  ]}
                />
              </Panel>
              <Panel
                title="Finance Control Snapshot"
                subtitle="Immediate operational checks for the finance team."
              >
                <div className="divide-y divide-slate-100">
                  {[
                    {
                      icon: Landmark,
                      name: "Approved department plans",
                      value: plans.length,
                      style: "bg-blue-50 text-blue-700",
                    },
                    {
                      icon: CheckCircle2,
                      name: "Security deposits paid",
                      value: `${paidDeposits.length}/${data.billing.length}`,
                      style: "bg-emerald-50 text-emerald-700",
                    },
                    {
                      icon: TrendingUp,
                      name: "Budget utilization",
                      value: `${budget.utilization}%`,
                      style: "bg-amber-50 text-amber-700",
                    },
                    {
                      icon: WalletCards,
                      name: "Active rent cycles",
                      value: data.rents.length,
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
                        <span className="text-[14px] font-pmedium text-slate-900">
                          {item.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
