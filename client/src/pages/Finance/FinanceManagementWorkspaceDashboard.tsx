import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileBarChart,
  FileText,
  History,
  PiggyBank,
  Receipt,
  ShieldCheck,
  TrendingDown,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import GroupedBarGraph from "@/components/graphs/GroupedBarGraph";
import financeBannerImage from "@/assets/finance-dashboard-banner.webp";
import { DEFAULT_FISCAL_YEAR } from "@/features/finance/utils/fiscalYear";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { getStoredUser } from "@/lib/auth-session";
import { statusPillClass } from "@/lib/status-pill";
import {
  DEFAULT_WORKSPACE_CURRENCY,
  formatWorkspaceCurrency,
} from "@/lib/workspaceLocalization";
import { getDepartmentFinanceData, getFinanceSnapshot } from "@/services/finance";
import { extractDepartmentLabel } from "@/utils/user-helpers";
import {
  DashboardBanner,
  DashboardSection,
  DashboardStatTile,
} from "../Administration/AdministrationModuleDashboardShared";
import InsightDonutChart from "../Dashboard/FrontendDashboard/dashboard/InsightDonutChart";
import {
  FinanceDashboardEmpty,
  FinanceDashboardFrame,
  FinanceDashboardLoading,
  numeric,
  rows,
} from "./FinanceModuleDashboardShared";

type FinanceRow = Record<string, any>;
type RequestRow = FinanceRow & {
  requestType?: string;
  department?: string;
  status?: unknown;
};
type AccessType = "founder" | "department";

type DepartmentSnapshot = {
  department: string;
  data: FinanceRow | null;
  failed?: boolean;
};

type ModuleCard = {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  route: string;
};

type DonutRow = {
  label: string;
  value: number;
};

type MonthlyRow = DonutRow & {
  actual: number;
};

const BASE_ROUTE = "/extra-common-modules/finance-management";

const FOUNDER_MODULES: ModuleCard[] = [
  {
    key: "approvals",
    title: "Approval Center",
    description: "Decide on annual budgets and extra-fund requests",
    icon: ClipboardList,
    color: "#2563EB",
    route: `${BASE_ROUTE}/approvals`,
  },
  {
    key: "overview",
    title: "Budget Overview",
    description: "Audit department budget health and spending",
    icon: FileBarChart,
    color: "#0D9488",
    route: `${BASE_ROUTE}/overview`,
  },
];

const DEPARTMENT_MODULES: ModuleCard[] = [
  {
    key: "projected",
    title: "Projected Budget",
    description: "Plan monthly budget lines and track actual spend",
    icon: Wallet,
    color: "#2563EB",
    route: `${BASE_ROUTE}/projected`,
  },
  {
    key: "extra",
    title: "Extra Requested",
    description: "Ask founders for additional budget and follow approvals",
    icon: Receipt,
    color: "#F59E0B",
    route: `${BASE_ROUTE}/extra`,
  },
  {
    key: "history",
    title: "Expense History",
    description: "Review paid expenses, invoices, and payment progress",
    icon: History,
    color: "#10B981",
    route: `${BASE_ROUTE}/history`,
  },
];

const PIE_COLORS = [
  "#2563EB",
  "#10B981",
  "#F59E0B",
  "#7C3AED",
  "#0D9488",
  "#EF4444",
  "#94A3B8",
];
const STATUS_COLORS = ["#10B981", "#F59E0B", "#EF4444", "#94A3B8"];

/** The same role split the finance pages already use: founders see company-wide
 *  finance, everyone else works inside their own department scope. */
export function isFounderFinanceRole(rawRole: string): boolean {
  const role = String(rawRole || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "_");
  return (
    role === "owner" ||
    role === "founder" ||
    role === "super_admin" ||
    role === "super-admin"
  );
}

function getStoredFinanceRole(): string {
  const user = getStoredUser() as any;
  return String(
    user?.workspaceMembership?.role || user?.role || user?.designation || "",
  );
}

function pretty(value: unknown, fallback = "Pending"): string {
  return String(value || fallback)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isActionableStatus(value: unknown): boolean {
  return /pending|discuss|review|waiting/i.test(String(value || ""));
}

function isApprovedStatus(value: unknown): boolean {
  return /approved/i.test(String(value || ""));
}

function isRejectedStatus(value: unknown): boolean {
  return /rejected|declined/i.test(String(value || ""));
}

function statusGroups(items: Array<{ status?: unknown }>): DonutRow[] {
  const actionable = items.filter((item) =>
    isActionableStatus(item.status),
  ).length;
  const approved = items.filter((item) =>
    isApprovedStatus(item.status),
  ).length;
  const rejected = items.filter((item) =>
    isRejectedStatus(item.status),
  ).length;
  const other = Math.max(0, items.length - actionable - approved - rejected);
  return [
    { label: "Approved", value: approved },
    { label: "Needs action", value: actionable },
    { label: "Rejected", value: rejected },
    { label: "Draft / other", value: other },
  ].filter((row) => row.value > 0);
}

function planAmounts(plan: FinanceRow | null) {
  const monthly = rows(plan?.monthlyPlan);
  const projected = monthly.reduce((sum, month) => {
    const expenses = rows(month.expenses);
    return (
      sum +
      (expenses.reduce(
        (value, expense) =>
          value + numeric(expense.projectedAmount ?? expense.amount),
        0,
      ) || numeric(month.projectedAmount ?? month.projectedBudget))
    );
  }, 0);
  const actual = monthly.reduce((sum, month) => {
    const expenses = rows(month.expenses);
    return (
      sum +
      (expenses.reduce(
        (value, expense) =>
          value + numeric(expense.actualAmount ?? expense.actualSpent),
        0,
      ) || numeric(month.actualSpent ?? month.actualAmount))
    );
  }, 0);
  const approved = numeric(
    plan?.approvedAnnualBudget ?? plan?.annualBudgetRequested ?? plan?.requestedBudget,
  );
  const spent = numeric(plan?.totalSpentYTD) || actual;
  return {
    projected,
    actual,
    approved,
    spent,
    remaining: Math.max(0, approved - spent),
    utilization: approved ? Math.round((spent / approved) * 100) : 0,
    expenses: monthly.reduce(
      (sum, month) => sum + rows(month.expenses).length,
      0,
    ),
  };
}

function monthlySeries(sources: FinanceRow[]): MonthlyRow[] {
  const months = new Map<string, { label: string; projected: number; actual: number; order: number }>();
  sources.forEach((plan) => {
    rows(plan?.monthlyPlan).forEach((month, index) => {
      const key = String(
        month.monthKey || month.month || month.monthLabel || `m-${index + 1}`,
      )
        .trim()
        .toLowerCase();
      const entry = months.get(key) || {
        label: String(month.monthLabel || month.month || month.monthKey || `M${index + 1}`).slice(0, 3),
        projected: 0,
        actual: 0,
        order: index,
      };
      const expenses = rows(month.expenses);
      entry.projected +=
        expenses.reduce(
          (sum, expense) =>
            sum + numeric(expense.projectedAmount ?? expense.amount),
          0,
        ) || numeric(month.projectedAmount ?? month.projectedBudget);
      entry.actual +=
        expenses.reduce(
          (sum, expense) =>
            sum + numeric(expense.actualAmount ?? expense.actualSpent),
          0,
        ) || numeric(month.actualSpent ?? month.actualAmount);
      months.set(key, entry);
    });
  });
  return [...months.values()]
    .sort((left, right) => left.order - right.order)
    .map((entry) => ({
      label: entry.label,
      value: entry.projected,
      actual: entry.actual,
    }));
}

function topDonutRows(rowsIn: DonutRow[], limit = 6): DonutRow[] {
  const sorted = [...rowsIn]
    .filter((row) => row.value > 0)
    .sort((left, right) => right.value - left.value);
  const head = sorted.slice(0, limit);
  const tail = sorted.slice(limit).reduce((sum, row) => sum + row.value, 0);
  if (tail > 0) head.push({ label: "Other", value: tail });
  return head;
}

function getMemberDepartments(accessNames: string[]): string[] {
  const fromAccess = Array.isArray(accessNames)
    ? accessNames
        .map((name) => extractDepartmentLabel(String(name || "")))
        .filter(Boolean)
    : [];
  if (fromAccess.length) return Array.from(new Set(fromAccess));

  const user = getStoredUser() as any;
  const rawList = user?.workspaceMembership?.departments;
  const fromList = Array.isArray(rawList)
    ? rawList
        .map((department: any) =>
          typeof department === "string"
            ? department
            : department?.name || department?.label || "",
        )
        .filter(Boolean)
        .map((name: string) => extractDepartmentLabel(name))
    : [];
  if (fromList.length) return Array.from(new Set(fromList));

  const single =
    user?.department ||
    user?.workspaceMembership?.department ||
    user?.departmentName ||
    "";
  const label = extractDepartmentLabel(
    typeof single === "string" ? single : single?.name || single?.label || "",
  );
  return label ? [label] : [];
}

export default function FinanceManagementWorkspaceDashboard() {
  const access = useDashboardAccess();
  const preferences = useWorkspacePreferences();
  const currency = preferences.currency || DEFAULT_WORKSPACE_CURRENCY;
  const money = (value: number) =>
    formatWorkspaceCurrency(Number(value || 0), currency, {
      maximumFractionDigits: 0,
    });

  const accessType: AccessType = isFounderFinanceRole(getStoredFinanceRole())
    ? "founder"
    : "department";
  const modules = accessType === "founder" ? FOUNDER_MODULES : DEPARTMENT_MODULES;

  const departments = useMemo(
    () => getMemberDepartments(access.departmentNames),
    [access.departmentNames],
  );
  const departmentKey = departments.join("|");

  const [snapshot, setSnapshot] = useState<FinanceRow>({});
  const [departmentData, setDepartmentData] = useState<DepartmentSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError("");

    if (accessType === "founder") {
      getFinanceSnapshot(DEFAULT_FISCAL_YEAR)
        .then((response: any) => {
          if (cancelled) return;
          setSnapshot((response as FinanceRow) || {});
        })
        .catch(() => {
          if (cancelled) return;
          setSnapshot({});
          setLoadError(
            "The company-wide finance snapshot could not be refreshed. Existing values may be incomplete.",
          );
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    const assigned = departmentKey
      ? departmentKey.split("|").filter(Boolean)
      : [];
    if (!assigned.length) {
      setDepartmentData([]);
      setIsLoading(false);
      setLoadError(
        "No department is assigned to your account, so department finance data cannot be loaded yet.",
      );
      return () => {
        cancelled = true;
      };
    }

    Promise.allSettled(
      assigned.map((department) =>
        getDepartmentFinanceData(DEFAULT_FISCAL_YEAR, department),
      ),
    ).then((results) => {
      if (cancelled) return;
      setDepartmentData(
        assigned.map((department, index) => {
          const result = results[index];
          return result.status === "fulfilled"
            ? {
                department,
                data: ((result.value as any) || {}) as FinanceRow,
              }
            : { department, data: null, failed: true };
        }),
      );
      if (results.some((result) => result.status === "rejected")) {
        setLoadError(
          "Some department finance records could not be refreshed. Available values are shown below.",
        );
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [accessType, departmentKey, refreshKey]);

  const founderSummary = useMemo(() => {
    const plans = rows(snapshot.departmentFinance);
    const planRows = plans.map((plan) => {
      const amounts = planAmounts(plan);
      return {
        department: String(
          plan.department || plan.departmentName || "Department",
        ),
        ...amounts,
        health: String(plan.healthStatus || plan.health || "Healthy"),
      };
    });
    const annual = rows(snapshot.annualRequests);
    const extra = rows(snapshot.extraRequests);
    const requestRows: RequestRow[] = [
      ...annual.map((request) => ({
        ...request,
        requestType: "Annual Budget",
      })),
      ...extra.map((request) => ({
        ...request,
        requestType: "Extra Budget",
      })),
    ];
    const approvedExtra = extra
      .filter((request) => isApprovedStatus(request.status))
      .reduce((sum, request) => sum + numeric(request.amount), 0);
    const approvedBudget = planRows.reduce(
      (sum, plan) => sum + plan.approved,
      0,
    );
    const spent = planRows.reduce((sum, plan) => sum + plan.spent, 0);
    const budget = approvedBudget + approvedExtra;
    const recentRequests = [...requestRows]
      .sort((left, right) => {
        const leftTime = new Date(
          String(left.createdAt || left.updatedAt || ""),
        ).getTime();
        const rightTime = new Date(
          String(right.createdAt || right.updatedAt || ""),
        ).getTime();
        return (rightTime || 0) - (leftTime || 0);
      })
      .slice(0, 6);
    return {
      planRows,
      requestRows,
      recentRequests,
      approvedBudget,
      approvedExtra,
      budget,
      spent,
      remaining: Math.max(0, budget - spent),
      utilization: budget ? Math.round((spent / budget) * 100) : 0,
      actionable: requestRows.filter((request) =>
        isActionableStatus(request.status),
      ).length,
      approved: requestRows.filter((request) =>
        isApprovedStatus(request.status),
      ).length,
      requestStatus: statusGroups(requestRows),
      distribution: topDonutRows(
        planRows.map((plan) => ({
          label: plan.department,
          value: plan.approved,
        })),
      ),
      monthly: monthlySeries(plans),
    };
  }, [snapshot]);

  const departmentSummary = useMemo(() => {
    const planRows = departmentData.map(({ department, data }) => {
      const amounts = planAmounts(data);
      const extra = rows(data?.extraRequests);
      const expenses = rows(data?.monthlyPlan).flatMap((month) =>
        rows(month.expenses),
      );
      return {
        department,
        ...amounts,
        health: String(data?.healthStatus || data?.status || "Pending"),
        annualStatus: String(
          data?.annualRequest?.status || data?.status || "Pending",
        ),
        pendingExtra: extra.filter((request) =>
          isActionableStatus(request.status),
        ).length,
        approvedExtra: extra
          .filter((request) => isApprovedStatus(request.status))
          .reduce((sum, request) => sum + numeric(request.amount), 0),
        vendors: rows(data?.vendors).length,
        invoicePending: expenses.filter((expense) => {
          const paid = numeric(expense.actualAmount ?? expense.actualSpent) > 0;
          const invoice = expense.invoiceNumber || expense.invoiceUrl;
          return paid && !invoice;
        }).length,
      };
    });
    const approvedBudget = planRows.reduce(
      (sum, plan) => sum + plan.approved,
      0,
    );
    const extraApproved = planRows.reduce(
      (sum, plan) => sum + plan.approvedExtra,
      0,
    );
    const spent = planRows.reduce((sum, plan) => sum + plan.spent, 0);
    const requestRows: Array<{ status?: unknown }> = [
      ...planRows.map((plan) => ({ status: plan.annualStatus })),
      ...departmentData.flatMap(({ data }) => rows(data?.extraRequests)),
    ];
    const recentRequests: RequestRow[] = departmentData
      .flatMap(({ department, data }) =>
        rows(data?.extraRequests).map(
          (request): RequestRow => ({
            ...request,
            department,
            requestType: "Extra Budget",
          }),
        ),
      )
      .sort((left, right) => {
        const leftTime = new Date(
          String(left.createdAt || left.updatedAt || ""),
        ).getTime();
        const rightTime = new Date(
          String(right.createdAt || right.updatedAt || ""),
        ).getTime();
        return (rightTime || 0) - (leftTime || 0);
      })
      .slice(0, 6);
    return {
      planRows,
      recentRequests,
      approvedBudget,
      extraApproved,
      budget: approvedBudget + extraApproved,
      spent,
      remaining: Math.max(0, approvedBudget + extraApproved - spent),
      utilization: approvedBudget
        ? Math.round((spent / approvedBudget) * 100)
        : 0,
      pendingExtra: planRows.reduce(
        (sum, plan) => sum + plan.pendingExtra,
        0,
      ),
      invoicePending: planRows.reduce(
        (sum, plan) => sum + plan.invoicePending,
        0,
      ),
      vendors: planRows.reduce((sum, plan) => sum + plan.vendors, 0),
      requestStatus: statusGroups(requestRows),
      distribution: topDonutRows(
        planRows.map((plan) => ({
          label: plan.department,
          value: plan.spent,
        })),
      ),
      monthly: monthlySeries(
        departmentData
          .map(({ data }) => data)
          .filter((data): data is FinanceRow => Boolean(data)),
      ),
    };
  }, [departmentData]);

  const isFounder = accessType === "founder";
  const summary = isFounder ? founderSummary : departmentSummary;
  const monthly = summary.monthly;
  const barOptions = useMemo(
    () => ({
      chart: {
        toolbar: { show: false },
        fontFamily: "Poppins, sans-serif",
      },
      colors: ["#2563EB", "#22C55E"],
      dataLabels: { enabled: false },
      stroke: { width: 0 },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
      plotOptions: { bar: { borderRadius: 5, columnWidth: "48%" } },
      legend: {
        position: "top" as const,
        horizontalAlign: "right" as const,
      },
      xaxis: {
        categories: monthly.map((month) => month.label),
        labels: {
          rotate: -30,
          style: { colors: "#64748B", fontSize: "10px" },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: "#64748B", fontSize: "10px" },
          formatter: (value: number) => money(value),
        },
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: { formatter: (value: number) => money(value) },
      },
    }),
    [monthly, currency],
  );

  const hasBarData = monthly.some(
    (month) => month.value > 0 || Number(month.actual || 0) > 0,
  );
  const isMonetary = currency === "INR";

  return (
    <FinanceDashboardFrame
      loadError={loadError}
      onRefresh={() => setRefreshKey((key) => key + 1)}
    >
      <div data-tour="finance-management-banner">
        <DashboardBanner
          title="Finance Management"
          description={
            isFounder
              ? "Company-wide budget control, approval queues, department audits, and spending decisions in one working view."
              : `Your department's projected budget, extra-fund requests, paid expenses, and approval progress. Scope: ${
                  departments.length ? departments.join(", ") : "your departments"
                }.`
          }
          tags={
            isFounder
              ? ["Approval Center", "Budget Overview", "Department Audit", "Financial Year"]
              : ["Projected Budget", "Extra Requests", "Expense History", "Department Scope"]
          }
          image={financeBannerImage}
        />
      </div>

      {isLoading || access.isLoading ? (
        <FinanceDashboardLoading />
      ) : (
        <div
          data-tour="finance-management-summary"
          className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <DashboardStatTile
            icon={<Wallet size={20} />}
            label={isFounder ? "Approved Budget" : "Approved Budget"}
            value={money(summary.approvedBudget)}
            sub={
              isFounder
                ? `${founderSummary.planRows.length} department plans`
                : `${departmentSummary.planRows.length} department plan(s)`
            }
            tone="blue"
          />
          <DashboardStatTile
            icon={<TrendingDown size={20} />}
            label="Actual Spend"
            value={money(summary.spent)}
            sub={`${summary.utilization}% of approved budget used`}
            tone={summary.utilization > 90 ? "amber" : "slate"}
          />
          <DashboardStatTile
            icon={<PiggyBank size={20} />}
            label="Remaining Balance"
            value={money(summary.remaining)}
            sub="Approved budget less recorded spend"
            tone={summary.remaining ? "green" : "amber"}
          />
          <DashboardStatTile
            icon={<AlertCircle size={20} />}
            label={isFounder ? "Requests Needing Action" : "Extra Requests Pending"}
            value={isFounder ? founderSummary.actionable : departmentSummary.pendingExtra}
            sub={
              isFounder
                ? "Annual and extra-fund decisions waiting"
                : "Extra-fund requests awaiting a decision"
            }
            tone={
              isFounder
                ? founderSummary.actionable
                  ? "amber"
                  : "green"
                : departmentSummary.pendingExtra
                  ? "amber"
                  : "green"
            }
          />
          <DashboardStatTile
            icon={<CheckCircle2 size={20} />}
            label="Approved Requests"
            value={
              isFounder
                ? founderSummary.approved
                : Math.round(
                    departmentSummary.requestStatus.find(
                      (row) => row.label === "Approved",
                    )?.value || 0,
                  )
            }
            sub="Annual and extra budget approvals"
            tone="green"
          />
          <DashboardStatTile
            icon={<Building2 size={20} />}
            label={isFounder ? "Departments Audited" : "Vendors On Record"}
            value={
              isFounder
                ? founderSummary.planRows.length
                : departmentSummary.vendors
            }
            sub={
              isFounder
                ? "Plans included in this financial year"
                : "Vendors linked to your finance plan"
            }
            tone="slate"
          />
          <DashboardStatTile
            icon={<FileText size={20} />}
            label="Invoices Pending"
            value={
              isFounder
                ? founderSummary.planRows.reduce(
                    (sum, plan) => sum + plan.expenses,
                    0,
                  )
                : departmentSummary.invoicePending
            }
            sub={
              isFounder
                ? "Budget lines across all departments"
                : "Paid lines still awaiting an invoice"
            }
            tone="violet"
          />
          <DashboardStatTile
            icon={<CalendarDays size={20} />}
            label="Financial Year"
            value={DEFAULT_FISCAL_YEAR}
            sub={
              isFounder
                ? `Budget overview · ${money(founderSummary.approvedExtra)} approved extras`
                : `Extra funds approved · ${money(departmentSummary.extraApproved)}`
            }
            tone="cyan"
          />
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-sm font-pmedium text-slate-900">
          {isFounder ? "Founder finance modules" : "Department finance modules"}
        </h2>
        <p className="mt-1 text-[10px] text-slate-500">
          {isFounder
            ? "Open the approval queue or the company-wide budget audit. Approval sub-tabs and filters stay inside the module page."
            : "Open the department budget area you need. Request filters and expense history controls stay inside each module page."}
        </p>
        <div
          data-tour="finance-management-modules"
          className="mt-3 grid w-full grid-cols-1 gap-4 md:grid-cols-[repeat(var(--module-cols),minmax(0,1fr))]"
          style={{ "--module-cols": modules.length } as CSSProperties}
        >
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <DashboardModuleCard
                key={module.key}
                icon={<Icon size={19} />}
                title={module.title}
                route={module.route}
                description={module.description}
                color={module.color}
              />
            );
          })}
        </div>
      </div>

      {!isLoading && !access.isLoading ? (
        <>
          <div
            data-tour="finance-management-charts"
            className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]"
          >
            <DashboardSection
              title="Monthly budget vs actual"
              subtitle="Aggregated projected and recorded spend for the selected financial year."
            >
              {hasBarData ? (
                <GroupedBarGraph
                  options={barOptions}
                  series={[
                    {
                      name: "Projected",
                      data: monthly.map((month) => month.value),
                    },
                    {
                      name: "Actual",
                      data: monthly.map((month) => Number(month.actual || 0)),
                    },
                  ]}
                />
              ) : (
                <FinanceDashboardEmpty>
                  No monthly budget lines have been recorded for this year yet.
                </FinanceDashboardEmpty>
              )}
            </DashboardSection>
            <DashboardSection
              title="Request workflow"
              subtitle="Approved, needing action, and rejected finance requests."
            >
              {summary.requestStatus.length ? (
                <InsightDonutChart
                  centerLabel="Requests"
                  labels={summary.requestStatus.map((row) => row.label)}
                  series={summary.requestStatus.map((row) => row.value)}
                  colors={STATUS_COLORS}
                  tooltipValue={summary.requestStatus.map(
                    (row) => `${row.value} requests`,
                  )}
                  isMonetary={false}
                  wrapLabels
                />
              ) : (
                <FinanceDashboardEmpty>
                  No finance requests are recorded for this scope yet.
                </FinanceDashboardEmpty>
              )}
            </DashboardSection>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DashboardSection
              title={
                isFounder
                  ? "Budget allocation by department"
                  : "Actual spend by department"
              }
              subtitle={
                isFounder
                  ? "Approved annual budget share across departments."
                  : "How recorded spend is distributed across your assigned departments."
              }
            >
              {summary.distribution.length ? (
                <InsightDonutChart
                  centerLabel={isFounder ? "Budget" : "Spend"}
                  labels={summary.distribution.map((row) => row.label)}
                  series={summary.distribution.map((row) => row.value)}
                  colors={PIE_COLORS}
                  tooltipValue={summary.distribution.map((row) =>
                    money(row.value),
                  )}
                  isMonetary={isMonetary}
                  wrapLabels
                />
              ) : (
                <FinanceDashboardEmpty>
                  No department budget data is available yet.
                </FinanceDashboardEmpty>
              )}
            </DashboardSection>

            <DashboardSection
              title={
                isFounder ? "Department budget health" : "Department plan status"
              }
              subtitle={
                isFounder
                  ? "Approved budget, recorded spend, and utilisation by department."
                  : "Plan status and budget position for each assigned department."
              }
              bodyClassName="max-h-[360px] overflow-y-auto p-0"
            >
              {summary.planRows.length ? (
                <table className="w-full table-fixed border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="w-[32%] px-5 py-3">Department</th>
                      <th className="w-[20%] px-3 py-3 text-right">Budget</th>
                      <th className="w-[20%] px-3 py-3 text-right">Spent</th>
                      <th className="w-[12%] px-3 py-3 text-center">Used</th>
                      <th className="w-[16%] px-3 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.planRows.map((plan) => (
                      <tr
                        key={plan.department}
                        className="bg-white text-[11px] text-slate-600"
                      >
                        <td className="truncate px-5 py-3 font-pmedium text-slate-900">
                          {plan.department}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {money(plan.approved)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {money(plan.spent)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {plan.utilization}%
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={statusPillClass(plan.health)}>
                            {pretty(plan.health)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <FinanceDashboardEmpty>
                  No department budget rows are available yet.
                </FinanceDashboardEmpty>
              )}
            </DashboardSection>
          </div>

          <div data-tour="finance-management-table">
            <DashboardSection
              title={isFounder ? "Recent finance requests" : "Recent extra budget requests"}
              subtitle={
                isFounder
                  ? "Latest annual and extra-fund submissions across departments."
                  : "Latest additional-fund submissions from your assigned departments."
              }
              bodyClassName="max-h-[380px] overflow-y-auto p-0"
            >
              {summary.recentRequests.length ? (
                <table className="w-full table-fixed border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="w-[22%] px-5 py-3">Request</th>
                      <th className="w-[22%] px-3 py-3">Department</th>
                      {!isFounder ? (
                        <th className="w-[14%] px-3 py-3">Month</th>
                      ) : null}
                      <th className="w-[18%] px-3 py-3 text-right">Amount</th>
                      <th className="w-[24%] px-3 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.recentRequests.map((request: any, index: number) => (
                      <tr
                        key={`${request.id || request._id || "request"}-${index}`}
                        className="bg-white text-[11px] text-slate-600"
                      >
                        <td className="truncate px-5 py-3 font-pmedium text-slate-900">
                          {pretty(
                            request.requestType ||
                              request.type ||
                              (isFounder ? "Finance Request" : "Extra Budget"),
                          )}
                        </td>
                        <td className="truncate px-3 py-3">
                          {pretty(
                            request.department ||
                              request.departmentName ||
                              "Department",
                          )}
                        </td>
                        {!isFounder ? (
                          <td className="truncate px-3 py-3">
                            {pretty(request.month || request.monthKey, "—")}
                          </td>
                        ) : null}
                        <td className="px-3 py-3 text-right font-pmedium text-slate-900">
                          {money(
                            numeric(
                              request.amount ??
                                request.requestedBudget ??
                                request.projectedAmount,
                            ),
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={statusPillClass(request.status)}>
                            {pretty(request.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <FinanceDashboardEmpty>
                  No recent requests are available in this scope yet.
                </FinanceDashboardEmpty>
              )}
            </DashboardSection>
          </div>
        </>
      ) : null}
    </FinanceDashboardFrame>
  );
}
