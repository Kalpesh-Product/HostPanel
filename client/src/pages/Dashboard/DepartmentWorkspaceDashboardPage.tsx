import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import {
  Banknote,
  Bed,
  Building2,
  Calculator,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Code2,
  ContactRound,
  FileSearch,
  FileText,
  HandCoins,
  IndianRupee,
  Laptop,
  NotebookText,
  PiggyBank,
  Printer,
  Receipt,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  UserMinus,
  UserPlus,
  Users,
  UserSquare,
  WalletCards,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import { DEFAULT_FISCAL_YEAR } from "../../features/finance/utils/fiscalYear";
import useDashboardAccess from "../../hooks/useDashboardAccess";
import { getDepartmentFinanceData } from "../../services/finance";
import salesBannerImage from "../../assets/coworking-banner.jpg";

type DepartmentModule = {
  id: string;
  accessId?: string;
  label: string;
  description: string;
  icon: ElementType;
  route: string;
  color: string;
};

type DepartmentDashboardConfig = {
  id: string;
  title: string;
  financeLabel: string;
  description: string;
  icon: ElementType;
  modules: DepartmentModule[];
};

type FinanceRecord = Record<string, any>;

const DEPARTMENT_DASHBOARDS = {
  "hr-department": {
    id: "hr-department",
    title: "HR Dashboard",
    financeLabel: "HR",
    description: "People operations, attendance, payroll, recruitment, and employee lifecycle.",
    icon: Users,
    modules: [
      { id: "employee-management", label: "Company Management", description: "Manage employees, teams, and company records", icon: UserSquare, route: "/department-accesses/hr-department/company-management", color: "#2563EB" },
      { id: "hr-documents", label: "Documents", description: "Organize HR documents and employee files", icon: FileText, route: "/department-accesses/hr-department/documents", color: "#7C3AED" },
      { id: "recruitment", label: "Recruitment", description: "Track openings, candidates, and hiring progress", icon: UserPlus, route: "/department-accesses/hr-department/recruitment", color: "#0D9488" },
      { id: "leave-request-processing", label: "Leave Request Processing", description: "Review and process employee leave requests", icon: CalendarCheck, route: "/department-accesses/hr-department/leave-request-processing", color: "#EA580C" },
      { id: "attendance-review", label: "Attendance Review", description: "Monitor team attendance and corrections", icon: ClipboardCheck, route: "/department-accesses/hr-department/attendance-review", color: "#0891B2" },
      { id: "payroll-management", label: "Payroll Management", description: "Run payroll and manage employee payouts", icon: Banknote, route: "/department-accesses/hr-department/payroll-management", color: "#16A34A" },
      { id: "exit-management", label: "Resignation Management", description: "Coordinate resignations and employee exits", icon: UserMinus, route: "/department-accesses/hr-department/resignation-management", color: "#DC2626" },
    ],
  },
  "administration-department": {
    id: "administration-department",
    title: "Administration Dashboard",
    financeLabel: "Administration",
    description: "Workspace administration, visitors, bookings, resources, and daily operations.",
    icon: Building2,
    modules: [
      { id: "tenant-companies-admin", label: "Tenant Companies", description: "Manage tenant companies and workspace records", icon: Store, route: "/department-accesses/administration-department/tenant-companies", color: "#2563EB" },
      { id: "bookings", label: "Bookings", description: "Review and coordinate workspace bookings", icon: Bed, route: "/department-accesses/administration-department/bookings", color: "#7C3AED" },
      { id: "visitors-management", accessId: "visitor-management", label: "Visitors Management", description: "Register visitors and manage front-desk activity", icon: ContactRound, route: "/visitors/visitor-management", color: "#0D9488" },
      { id: "resource-management", label: "Resource Management", description: "Track shared resources and administrative inventory", icon: HandCoins, route: "/department-accesses/administration-department/resource-management", color: "#EA580C" },
      { id: "house-keeping", label: "House Keeping", description: "Plan and monitor housekeeping operations", icon: Sparkles, route: "/department-accesses/administration-department/house-keeping", color: "#0891B2" },
      { id: "printout-management", label: "Printout Management", description: "Manage print requests, attachments, and completion", icon: Printer, route: "/department-accesses/administration-department/printouts", color: "#1E3D73" },
    ],
  },
  "finance-department": {
    id: "finance-department",
    title: "Finance Dashboard",
    financeLabel: "Finance",
    description: "Department budgets, billing, payments, accounting, and financial control.",
    icon: WalletCards,
    modules: [
      { id: "Expenses-budget", accessId: "finance-budget", label: "Expenses & Budget", description: "Plan budgets and track department expenses", icon: PiggyBank, route: "/department-accesses/finance-department/expenses-budget", color: "#2563EB" },
      { id: "billing-payments", label: "Billing & Payments", description: "Manage billing cycles, collections, and payments", icon: Receipt, route: "/department-accesses/finance-department/billing-payments", color: "#0D9488" },
      { id: "accounting", label: "Accounting", description: "Review ledgers, entries, and financial records", icon: Calculator, route: "/department-accesses/finance-department/accounting", color: "#7C3AED" },
    ],
  },
  "maintenance-department": {
    id: "maintenance-department",
    title: "Maintenance Dashboard",
    financeLabel: "Maintenance",
    description: "Repairs, preventive schedules, asset uptime, and maintenance spending.",
    icon: Wrench,
    modules: [
      { id: "maintenance-repair-logs", label: "Maintenance Repair Logs", description: "Record issues, repairs, ownership, and completion", icon: ClipboardList, route: "/department-accesses/maintenance-department/repair-logs", color: "#EA580C" },
      { id: "amc-maintenance-scheduler", label: "AMC Maintenance Scheduler", description: "Schedule preventive and contract maintenance", icon: CalendarClock, route: "/department-accesses/maintenance-department/amc-scheduler", color: "#2563EB" },
    ],
  },
  "tech-department": {
    id: "tech-department",
    title: "Tech Dashboard",
    financeLabel: "Technology",
    description: "Website delivery, incoming digital leads, reviews, and technology spending.",
    icon: Laptop,
    modules: [
      { id: "tech-website-builder", accessId: "website-builder", label: "Website Builder", description: "Build and maintain the workspace website", icon: Code2, route: "/key-apps/website-builder", color: "#2563EB" },
      { id: "website-leads", label: "Website Leads", description: "Review enquiries received through the website", icon: NotebookText, route: "/key-apps/website-builder/leads", color: "#0D9488" },
      { id: "website-review", label: "Website Review", description: "Manage website reviews and published feedback", icon: CheckCircle2, route: "/key-apps/website-builder/dynamic/reviews", color: "#7C3AED" },
    ],
  },
  "it-department": {
    id: "it-department",
    title: "IT Dashboard",
    financeLabel: "IT",
    description: "IT repairs, system access, service continuity, and technology costs.",
    icon: Server,
    modules: [
      { id: "it-repair-logs", label: "IT Repair Logs", description: "Track device and system repair requests", icon: FileSearch, route: "/department-accesses/it-department/repair-logs", color: "#2563EB" },
      { id: "it-system-access", label: "System Access", description: "Manage application access and security requests", icon: ShieldCheck, route: "/department-accesses/it-department/system-access", color: "#0D9488" },
    ],
  },
} satisfies Record<string, DepartmentDashboardConfig>;

export type DepartmentWorkspaceDashboardId = keyof typeof DEPARTMENT_DASHBOARDS;

const numeric = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const monthLabel = (value: unknown, index: number) => {
  const raw = String(value || `Month ${index + 1}`).trim();
  return raw.length > 3 ? raw.slice(0, 3) : raw;
};

function ChartCard({ title, subtitle, action, children }: { title: string; subtitle: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">{title}</h2>
          <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
        </div>
        {action ?? null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function StatTile({ icon, label, value, sub, tone = "blue" }: { icon: ReactNode; label: string; value: string | number; sub: string; tone?: "blue" | "green" | "amber" | "violet" }) {
  const tones = {
    blue: "border-l-blue-600 bg-blue-50 text-blue-700",
    green: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
    amber: "border-l-amber-500 bg-amber-50 text-amber-700",
    violet: "border-l-violet-500 bg-violet-50 text-violet-700",
  };
  return (
    <div className="flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${tones[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-1 text-[20px] font-pmedium leading-none text-slate-900">{value}</p>
        <p className="mt-2 truncate text-[9px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

export default function DepartmentWorkspaceDashboardPage({
  departmentId,
  operationalContent,
}: {
  departmentId: DepartmentWorkspaceDashboardId;
  operationalContent: ReactNode;
}) {
  const config = DEPARTMENT_DASHBOARDS[departmentId];
  const access = useDashboardAccess();
  const [financeData, setFinanceData] = useState<FinanceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    setIsLoading(true);
    setLoadError("");
    getDepartmentFinanceData(DEFAULT_FISCAL_YEAR, config.financeLabel)
      .then((response) => {
        if (cancelled) return;
        setFinanceData(response?.data?.data || response?.data || response || null);
      })
      .catch(() => {
        if (cancelled) return;
        setFinanceData(null);
        setLoadError("Department finance data could not be refreshed.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [config, refreshKey]);

  const enabledModules = useMemo(() => {
    if (!config) return [];
    if (access.isLoading) return config.modules;
    const filtered = config.modules.filter((module) =>
      access.hasModule(module.accessId || module.id),
    );
    return filtered.length ? filtered : config.modules;
  }, [access, config]);

  const budget = useMemo(() => {
    const monthlyPlan = Array.isArray(financeData?.monthlyPlan)
      ? financeData.monthlyPlan
      : [];
    const rows = monthlyPlan.map((month: FinanceRecord, index: number) => {
      const expenses = Array.isArray(month.expenses) ? month.expenses : [];
      const expenseProjected = expenses.reduce(
        (sum: number, expense: FinanceRecord) =>
          sum + numeric(expense.projectedAmount ?? expense.amount),
        0,
      );
      const expenseActual = expenses.reduce(
        (sum: number, expense: FinanceRecord) =>
          sum + numeric(expense.actualSpent ?? expense.actualAmount),
        0,
      );
      return {
        label: monthLabel(month.month || month.monthLabel || month.monthKey, index),
        projected:
          expenseProjected ||
          numeric(month.projectedBudget ?? month.projectedAmount ?? month.amount),
        actual:
          expenseActual || numeric(month.actualSpent ?? month.actualAmount),
      };
    });
    const totalProjected = rows.reduce((sum, row) => sum + row.projected, 0);
    const totalActual = rows.reduce((sum, row) => sum + row.actual, 0);
    return {
      rows,
      totalProjected,
      totalActual,
      remaining: Math.max(0, totalProjected - totalActual),
      utilization:
        totalProjected > 0
          ? Math.min(100, Math.round((totalActual / totalProjected) * 100))
          : 0,
      hasData: rows.some((row) => row.projected > 0 || row.actual > 0),
    };
  }, [financeData]);

  const DepartmentIcon = config.icon;
  const chartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 3, columnWidth: "52%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    colors: ["#2563EB", "#22C55E"],
    xaxis: { categories: budget.rows.map((row) => row.label) },
    yaxis: { labels: { formatter: (value: number) => currency(value) } },
    tooltip: {
      theme: "light",
      y: { formatter: (value: number) => currency(value) },
    },
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <header className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 sm:h-[12rem]">
            <img src={salesBannerImage} alt="" aria-hidden="true" className="absolute inset-y-0 right-0 h-full w-full object-cover object-center opacity-45 sm:w-[64%]" style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 28%, black 100%)", maskImage: "linear-gradient(to right, transparent 0%, black 28%, black 100%)" }} />
            <div aria-hidden="true" className="absolute inset-y-0 right-0 w-full bg-gradient-to-br from-blue-600/50 via-blue-500/30 to-cyan-400/20 sm:w-[64%]" style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 28%, black 100%)", maskImage: "linear-gradient(to right, transparent 0%, black 28%, black 100%)" }} />
            <div className="relative z-10 flex h-full max-w-2xl flex-col justify-center px-6 sm:px-8">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><DepartmentIcon size={22} /></span>
              <h1 className="text-[22px] font-pmedium text-slate-950 sm:text-[26px]">{config.title}</h1>
              <p className="mt-2 max-w-xl text-[11px] leading-5 text-slate-600">{config.description}</p>
            </div>
          </div>
        </header>

        {loadError ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[10px] text-amber-800">{loadError}</div>
        ) : null}

        <section className="mb-6">
          <div className="mb-3">
            <h2 className="text-sm font-pmedium text-slate-900">Department overview</h2>
            <p className="mt-1 text-[10px] font-pmedium text-slate-500">Live operational data from the modules managed by {config.financeLabel}.</p>
          </div>
          {operationalContent}
        </section>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile icon={<Tag size={19} />} label="Enabled modules" value={enabledModules.length} sub="Available from this dashboard" />
          <StatTile icon={<PiggyBank size={19} />} label="Projected budget" value={isLoading ? "—" : currency(budget.totalProjected)} sub={DEFAULT_FISCAL_YEAR} tone="violet" />
          <StatTile icon={<IndianRupee size={19} />} label="Actual spent" value={isLoading ? "—" : currency(budget.totalActual)} sub={`${budget.utilization}% of projection`} tone="green" />
          <StatTile icon={<WalletCards size={19} />} label="Remaining" value={isLoading ? "—" : currency(budget.remaining)} sub="Projected balance" tone="amber" />
        </div>

        <div className="mb-6">
          <ChartCard
            title="Projected vs Actual Spent"
            subtitle={`${DEFAULT_FISCAL_YEAR} monthly Finance Management plan for ${config.financeLabel}.`}
            action={access.hasModule("finance-management") ? (
              <Link to="/extra-common-modules/finance-management" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-pmedium uppercase tracking-[0.06em] text-slate-600 transition hover:border-blue-200 hover:text-blue-700">Finance Management</Link>
            ) : undefined}
          >
            {isLoading ? (
              <div className="h-[280px] animate-pulse rounded-lg bg-slate-50" />
            ) : budget.hasData ? (
              <GroupedBarGraph
                options={chartOptions}
                series={[
                  { name: "Projected budget", data: budget.rows.map((row) => row.projected) },
                  { name: "Actual spent", data: budget.rows.map((row) => row.actual) },
                ]}
              />
            ) : (
              <div className="flex h-[280px] flex-col items-center justify-center px-6 text-center">
                <PiggyBank size={25} className="mb-3 text-blue-600" />
                <p className="text-[11px] font-pmedium text-slate-700">No approved monthly budget data is available for {DEFAULT_FISCAL_YEAR}.</p>
                <p className="mt-1 max-w-md text-[10px] leading-4 text-slate-500">Once the department plan is submitted in Finance Management, projected and actual spending will appear here.</p>
              </div>
            )}
          </ChartCard>
        </div>

        <section className="mb-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-pmedium text-slate-900">Manage {config.financeLabel.toLowerCase()} operations</h2>
              <p className="mt-1 text-[10px] font-pmedium text-slate-500">Open the same enabled modules available in the {config.title} dropdown.</p>
            </div>
            <button type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={isLoading} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-pmedium uppercase tracking-[0.06em] text-slate-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />Refresh</button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {enabledModules.map((module) => {
              const ModuleIcon = module.icon;
              return <DashboardModuleCard key={module.id} icon={<ModuleIcon size={22} />} title={module.label} description={module.description} route={module.route} color={module.color} />;
            })}
          </div>
        </section>
      </PageFrame>
    </div>
  );
}

