import { useEffect, useMemo, useState } from "react";
import { Wallet, UserCheck, CreditCard, Receipt, Calculator } from "lucide-react";
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
  QuickLink,
  getGreeting,
  statusBadgeColor,
  fmtINR,
} from "@/pages/Dashboard/FrontendDashboard/dashboard/DashboardShared";
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

      <WidgetSection layout={4} title="Overview" border normalCase>
        <StatCard
          icon={Wallet}
          label="Net Payable"
          value={fmtINR(netPayable, workspacePreferences.currency)}
          sub={`${employeesPaid}/${payrollEmployees.length} employees paid`}
          color="#7c3aed"
          route="/department-accesses/finance-department/billing-payments"
        />
        <StatCard
          icon={UserCheck}
          label="Employees Paid"
          value={`${employeesPaid}/${payrollEmployees.length}`}
          sub={`${employeesPending} pending`}
          color="#22c55e"
          route="/department-accesses/finance-department/billing-payments"
        />
        <StatCard
          icon={CreditCard}
          label="Security Deposits"
          value={`${depositsPaid}/${billing.length}`}
          sub={`${depositsPending} pending`}
          color="#1E3D73"
          route="/department-accesses/finance-department/billing-payments"
        />
      </WidgetSection>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TeamLiveStatusCard department="finance" viewAllRoute="/department-accesses/finance-department/billing-payments" />

        <DepartmentVisitorsCard department="finance" title="Finance Visitors" />

        <SectionCard title="Pending Security Deposits" linkLabel="View all" linkRoute="/department-accesses/finance-department/billing-payments">
          <div className="space-y-3">
            {pendingDeposits.length > 0 ? pendingDeposits.map((record, index) => (
              <RecentItem
                key={record.id || record.recordId || index}
                title={record.company || "Tenant"}
                sub={`${fmtINR(Number(record.securityDepositAmount || 0), workspacePreferences.currency)} • ${DEFAULT_FISCAL_YEAR}`}
                badge="Pending"
                badgeColor={statusBadgeColor("pending")}
              />
            )) : (
              <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No pending security deposits</p></div>
            )}
          </div>
        </SectionCard>
      </div>

      <WidgetSection layout={4} title="Quick Links" border normalCase>
        <QuickLink icon={Wallet} label="Expenses & Budget" description="Departmental budgets & spend" route="/department-accesses/finance-department/expenses-budget" color="#f59e0b" />
        <QuickLink icon={Receipt} label="Billing & Payments" description="Deposits, bookings & payroll" route="/department-accesses/finance-department/billing-payments" color="#1E3D73" />
        <QuickLink icon={Calculator} label="Accounting" description="Ledgers & reconciliation" route="/department-accesses/finance-department/accounting" color="#7c3aed" />
      </WidgetSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Security Deposits" linkLabel="View all" linkRoute="/department-accesses/finance-department/billing-payments">
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
            <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No security deposits yet</p></div>
          )}
        </SectionCard>

        <DonutWidget
          title="Security Deposit Status"
          series={depositStatusDonut.series}
          labels={depositStatusDonut.labels}
          colors={depositStatusDonut.colors}
          centerLabel="Deposits"
        />

        <SectionCard title="Top Payroll Earners" linkLabel="View all" linkRoute="/department-accesses/finance-department/billing-payments">
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
            <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No payroll data yet</p></div>
          )}
        </SectionCard>

        <DonutWidget
          title="Payroll Status"
          series={payrollStatusDonut.series}
          labels={payrollStatusDonut.labels}
          colors={payrollStatusDonut.colors}
          centerLabel="Employees"
        />
      </div>
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
    <div className="p-4 flex flex-col gap-5">
      <PageFrame>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-title font-pmedium text-primary uppercase">Finance Dashboard</h2>
              <PlanBadge plan={access.plan} />
            </div>
            <p className="text-subtitle font-pmedium text-gray-700">{greeting} 👋</p>
            <p className="text-content font-pmedium text-gray-700">{todayLabel}<WorkspaceClock timezone={workspacePreferences.timezone} location={workspacePreferences.location} /></p>
          </div>
        </div>
      </PageFrame>

      <DashboardAttendanceCard />

      <FinanceDashboardWidgets />
    </div>
  );
}

export default FinanceDashboardOverview;
