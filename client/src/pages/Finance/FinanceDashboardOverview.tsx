/**
 * FinanceDashboardOverview — the Finance manager's dashboard at /dashboard.
 * Uses the same visual language as the plan-wise and employee dashboards: the
 * slate outer shell + bordered inner frame, a blue-gradient greeting masthead,
 * today's attendance as the hero card, a "Finance Pulse" metric row, quick
 * actions, and the Finance activity panels below.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Calculator,
  CreditCard,
  LayoutDashboard,
  Receipt,
  UserCheck,
  Wallet,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import InsightDonutChart from "@/pages/Dashboard/FrontendDashboard/dashboard/InsightDonutChart";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { useFreshCurrentUser } from "@/hooks/useFreshCurrentUser";
import {
  ActivityPanel,
  EmptyState,
  MetricTile,
  PlanBadge,
  QuickActionTile,
  RecentItem,
  fmtINR,
  getGreeting,
  statusBadgeColor,
} from "@/pages/Dashboard/FrontendDashboard/dashboard/DashboardShared";
import TodayAttendanceCard from "@/pages/Dashboard/FrontendDashboard/dashboard/TodayAttendanceCard";
import DepartmentBudgetPanel from "@/pages/Dashboard/FrontendDashboard/dashboard/DepartmentBudgetPanel";
import { TeamLiveStatusCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/TeamLiveStatusCard";
import { DepartmentVisitorsCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/DepartmentVisitorsCard";
import { getTenantBillingSnapshot, getPayrollSnapshot } from "@/services/finance";
import { DEFAULT_FISCAL_YEAR } from "@/features/finance/utils/fiscalYear";

/* ───────────────────────────── Types ───────────────────────────── */

interface BillingRecord {
  id?: string;
  recordId?: string;
  company?: string;
  securityDepositAmount?: number;
  securityDepositPaidStatus?: string;
}

interface PayrollEmployeeRecord {
  id?: string;
  employeeId?: string;
  name?: string;
  department?: string;
  financials?: {
    netSalary?: number;
    paymentStatus?: string;
  };
  payment?: {
    status?: string;
  };
}

interface PayrollSnapshotRecord {
  currentCycle?: {
    employees?: PayrollEmployeeRecord[];
  } | null;
}

interface DashboardState {
  billing: BillingRecord[];
  payrollEmployees: PayrollEmployeeRecord[];
}

const DEFAULT_DASHBOARD: DashboardState = {
  billing: [],
  payrollEmployees: [],
};

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

const ViewAllButton = ({ route }: { route: string }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(route)}
      className="group inline-flex items-center gap-1 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]"
    >
      View all
      <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
    </button>
  );
};

/**
 * Stat cards, charts, and quick links for the Finance dashboard — split out
 * from FinanceDashboardOverview so AdminDashboardOverview can render this
 * same content for an Admin assigned to the Finance department, without the
 * department's own greeting/header banner.
 */
export function FinanceDashboardWidgets() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardState>(DEFAULT_DASHBOARD);
  const workspacePreferences = useWorkspacePreferences();

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const [billingResponse, payrollResponse] = await Promise.allSettled([
          getTenantBillingSnapshot({ fiscalYear: DEFAULT_FISCAL_YEAR }),
          getPayrollSnapshot(),
        ]);

        if (!isMounted) {
          return;
        }

        const billingData = billingResponse.status === "fulfilled" ? billingResponse.value : [];
        const billing = Array.isArray(billingData)
          ? (billingData as BillingRecord[])
          : Array.isArray((billingData as any)?.data)
            ? ((billingData as any).data as BillingRecord[])
            : [];

        const payrollData = payrollResponse.status === "fulfilled" ? (payrollResponse.value as PayrollSnapshotRecord) : null;
        const payrollEmployees = Array.isArray(payrollData?.currentCycle?.employees)
          ? (payrollData?.currentCycle?.employees as PayrollEmployeeRecord[])
          : [];

        setDashboard({ billing, payrollEmployees });

        const failures = [billingResponse, payrollResponse].filter((result) => result.status === "rejected");
        setError(failures.length > 0 ? ((failures[0] as PromiseRejectedResult).reason?.message || "Some finance data could not be loaded.") : "");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError((loadError as Error)?.message || "Unable to load Finance overview.");
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

  const billing = dashboard.billing;
  const payrollEmployees = dashboard.payrollEmployees;

  const depositsPaid = useMemo(() => billing.filter((b) => /paid/i.test(b.securityDepositPaidStatus || "")).length, [billing]);
  const depositsPending = billing.length - depositsPaid;

  const netPayable = useMemo(() => payrollEmployees.reduce((sum, e) => sum + Number(e.financials?.netSalary || 0), 0), [payrollEmployees]);
  const employeesPaid = useMemo(
    () => payrollEmployees.filter((e) => /paid/i.test(e.payment?.status || e.financials?.paymentStatus || "")).length,
    [payrollEmployees],
  );
  const employeesPending = payrollEmployees.length - employeesPaid;

  const pendingDeposits = useMemo(
    () => billing.filter((b) => !/paid/i.test(b.securityDepositPaidStatus || "")).slice(0, 5),
    [billing],
  );

  const recentBillingRecords = useMemo(() => billing.slice(0, 5), [billing]);

  const topPayrollEarners = useMemo(
    () => [...payrollEmployees].sort((a, b) => Number(b.financials?.netSalary || 0) - Number(a.financials?.netSalary || 0)).slice(0, 5),
    [payrollEmployees],
  );

  const depositStatusDonut = useMemo(
    () => ({
      series: [depositsPaid, depositsPending],
      labels: ["Paid", "Pending"],
      colors: ["#22c55e", "#f59e0b"],
    }),
    [depositsPaid, depositsPending],
  );

  const payrollStatusDonut = useMemo(
    () => ({
      series: [employeesPaid, employeesPending],
      labels: ["Paid", "Pending"],
      colors: ["#22c55e", "#f59e0b"],
    }),
    [employeesPaid, employeesPending],
  );

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700">
          {error}
        </div>
      ) : null}

      {/* Finance Pulse — the metrics that matter most */}
      <div data-tour="finance-overview">
        <section className="rounded-[1.75rem] border border-blue-100 bg-[#F8FAFD] p-5 shadow-[0_12px_34px_rgba(30,61,115,0.06)] sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E3D73] text-white shadow-sm">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
                Ledger
              </p>
              <h3 className="mt-0.5 text-lg font-pmedium text-[#1E3D73]">
                Finance Pulse
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile icon={Wallet} label="Net Payable" value={fmtINR(netPayable, workspacePreferences.currency)} sub={`${employeesPaid}/${payrollEmployees.length} employees paid`} route="/department-accesses/finance-department/billing-payments" color="#7c3aed" />
            <MetricTile icon={UserCheck} label="Employees Paid" value={`${employeesPaid}/${payrollEmployees.length}`} sub={`${employeesPending} pending`} route="/department-accesses/finance-department/billing-payments" color="#22c55e" />
            <MetricTile icon={CreditCard} label="Security Deposits" value={`${depositsPaid}/${billing.length}`} sub={`${depositsPending} pending`} route="/department-accesses/finance-department/billing-payments" color="#1E3D73" />
          </div>
        </section>
      </div>

      {/* Team status, live visitors and the pending deposits queue — a fixed
          trio (always rendered together) so it shares one bounded row. */}
      <div data-tour="finance-team-status" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TeamLiveStatusCard department="finance" viewAllRoute="/department-accesses/finance-department/billing-payments" />

        <DepartmentVisitorsCard department="finance" title="Finance Visitors" />

        <ActivityPanel
          eyebrow="Today's queue"
          title="Pending Security Deposits"
          action={<ViewAllButton route="/department-accesses/finance-department/billing-payments" />}
        >
          {pendingDeposits.length > 0 ? pendingDeposits.map((record, index) => (
            <RecentItem
              key={record.id || record.recordId || index}
              title={record.company || "Tenant"}
              sub={`${fmtINR(Number(record.securityDepositAmount || 0), workspacePreferences.currency)} • ${DEFAULT_FISCAL_YEAR}`}
              badge="Pending"
              badgeColor={statusBadgeColor("pending")}
            />
          )) : (
            <EmptyState icon={CreditCard} title="No pending deposits" description="Tenants still owing a security deposit will show up here." actionLabel="Open Billing" route="/department-accesses/finance-department/billing-payments" />
          )}
        </ActivityPanel>
      </div>

      {/* Quick actions */}
      <div data-tour="finance-quick-links">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 shadow-[0_12px_34px_rgba(37,99,235,0.08)] sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70" />
          <div className="relative mb-5">
            <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
              Jump back in
            </p>
            <h3 className="mt-1 text-lg font-pmedium text-[#1E3D73]">
              Quick Actions
            </h3>
            <p className="mt-1 text-xs font-pmedium text-slate-500">
              The Finance modules you use most, one click away.
            </p>
          </div>
          <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <QuickActionTile icon={Wallet} label="Expenses & Budget" description="Departmental budgets & spend" route="/department-accesses/finance-department/expenses-budget" color="#f59e0b" />
            <QuickActionTile icon={Receipt} label="Billing & Payments" description="Deposits, bookings & payroll" route="/department-accesses/finance-department/billing-payments" color="#1E3D73" />
            <QuickActionTile icon={Calculator} label="Accounting" description="Ledgers & reconciliation" route="/department-accesses/finance-department/accounting" color="#7c3aed" />
          </div>
        </section>
      </div>

      <div data-tour="finance-deposits" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ActivityPanel
          eyebrow="Tenancy"
          title="Security Deposits"
          action={<ViewAllButton route="/department-accesses/finance-department/billing-payments" />}
        >
          {recentBillingRecords.length > 0 ? recentBillingRecords.map((record, index) => {
            const status = /paid/i.test(record.securityDepositPaidStatus || "") ? "Paid" : "Pending";
            return (
              <RecentItem
                key={record.id || record.recordId || index}
                title={record.company || "Tenant"}
                sub={`${fmtINR(Number(record.securityDepositAmount || 0), workspacePreferences.currency)} • ${DEFAULT_FISCAL_YEAR}`}
                badge={status}
                badgeColor={statusBadgeColor(status)}
              />
            );
          }) : (
            <EmptyState icon={CreditCard} title="No security deposits yet" description="Tenant deposit records will show up here." actionLabel="Open Billing" route="/department-accesses/finance-department/billing-payments" />
          )}
        </ActivityPanel>

        <ActivityPanel eyebrow="Breakdown" title="Security Deposit Status">
          <div className="flex min-h-48 flex-1 items-center justify-center">
            {depositStatusDonut.series.some((value) => value > 0) ? (
              <InsightDonutChart centerLabel="Deposits" labels={depositStatusDonut.labels} colors={depositStatusDonut.colors} series={depositStatusDonut.series} tooltipValue={depositStatusDonut.series.map(String)} />
            ) : (
              <p className="text-content font-pmedium text-slate-400">No deposits yet</p>
            )}
          </div>
        </ActivityPanel>
      </div>

      <div data-tour="finance-payroll" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ActivityPanel
          eyebrow="Current cycle"
          title="Top Payroll Earners"
          action={<ViewAllButton route="/department-accesses/finance-department/billing-payments" />}
        >
          {topPayrollEarners.length > 0 ? topPayrollEarners.map((employee, index) => {
            const status = /paid/i.test(employee.payment?.status || employee.financials?.paymentStatus || "") ? "Paid" : "Pending";
            return (
              <RecentItem
                key={employee.id || employee.employeeId || index}
                title={employee.name || "Employee"}
                sub={fmtINR(Number(employee.financials?.netSalary || 0), workspacePreferences.currency)}
                badge={status}
                badgeColor={statusBadgeColor(status)}
              />
            );
          }) : (
            <EmptyState icon={Wallet} title="No payroll data yet" description="Employee payroll records will show up here." actionLabel="Open Billing" route="/department-accesses/finance-department/billing-payments" />
          )}
        </ActivityPanel>

        <ActivityPanel eyebrow="Breakdown" title="Payroll Status">
          <div className="flex min-h-48 flex-1 items-center justify-center">
            {payrollStatusDonut.series.some((value) => value > 0) ? (
              <InsightDonutChart centerLabel="Employees" labels={payrollStatusDonut.labels} colors={payrollStatusDonut.colors} series={payrollStatusDonut.series} tooltipValue={payrollStatusDonut.series.map(String)} />
            ) : (
              <p className="text-content font-pmedium text-slate-400">No payroll yet</p>
            )}
          </div>
        </ActivityPanel>
      </div>

      <DepartmentBudgetPanel department="Finance" title="Finance Budget vs Spend" />
    </div>
  );
}

export function FinanceDashboardOverview() {
  const currentUser = useFreshCurrentUser();
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
    return full || currentUser?.fullName || currentUser?.name || currentUser?.displayName || "Finance Manager";
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

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <div className="flex flex-col gap-5 rounded-xl border-default p-4">

        {/* Greeting card — same blue plan-card style used across the plan
            dashboards and the employee dashboard. */}
        <section
          data-tour="finance-greeting"
          className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 shadow-[0_12px_34px_rgba(37,99,235,0.08)] sm:p-6"
        >
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70" />
          <div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-blue-50/70" />
          <div className="relative flex min-w-0 items-start gap-4">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] ring-1 ring-blue-100 sm:flex">
              <LayoutDashboard size={21} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[9px] font-pmedium uppercase tracking-[0.22em] text-[#2563EB]">
                  Finance Unit dashboard
                </p>
                <PlanBadge plan={access.plan} />
              </div>
              <h2 className="mt-2 text-xl font-pmedium text-[#1E3D73] sm:text-2xl">
                {greeting} 👋
              </h2>
              <p className="mt-1 text-xs font-pmedium text-slate-500 sm:text-sm">
                {todayLabel}
                <WorkspaceClock
                  timezone={workspacePreferences.timezone}
                  location={workspacePreferences.location}
                />
              </p>
            </div>
          </div>
        </section>

        {/* Today's attendance — the hero card, same as the plan dashboards */}
        <div data-tour="finance-attendance">
          <TodayAttendanceCard variant="hero" />
        </div>

        <FinanceDashboardWidgets />
      </div>
    </div>
  );
}

export default FinanceDashboardOverview;
