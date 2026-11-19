import { useMemo } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileWarning,
  History,
  PiggyBank,
  Receipt,
  TrendingDown,
  Wallet,
} from "lucide-react";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import DonutChart from "@/components/graphs/DonutChart";
import GroupedBarGraph from "@/components/graphs/GroupedBarGraph";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "@/lib/workspaceLocalization";
import financeBannerImage from "@/assets/finance-dashboard-banner.png";
import {
  DashboardBanner,
  DashboardSection,
  DashboardStatTile,
} from "../Administration/AdministrationModuleDashboardShared";
import {
  FinanceDashboardEmpty,
  FinanceDashboardFrame,
  FinanceDashboardLoading,
  numeric,
  rows,
  useFinanceModuleDashboardData,
} from "./FinanceModuleDashboardShared";

type DepartmentBudget = {
  name: string;
  projected: number;
  actual: number;
  requests: number;
};

export default function ExpensesBudgetWorkspaceDashboard() {
  const { data, isLoading, loadError, refresh } =
    useFinanceModuleDashboardData();
  const preferences = useWorkspacePreferences();
  const money = (value: number) =>
    formatWorkspaceCurrency(value, preferences.currency, {
      maximumFractionDigits: 0,
    });

  const budget = useMemo(() => {
    const departments: DepartmentBudget[] = rows(
      data.snapshot.departmentFinance,
    ).map((plan) => {
      const months = rows(plan.monthlyPlan);
      const expenses = months.flatMap((month) => rows(month.expenses));
      const projected = months.reduce(
        (sum, month) =>
          sum +
          (rows(month.expenses).reduce(
            (value, expense) =>
              value + numeric(expense.projectedAmount ?? expense.amount),
            0,
          ) || numeric(month.projectedBudget ?? month.allocatedBudget)),
        0,
      );
      const actual = months.reduce(
        (sum, month) =>
          sum +
          (rows(month.expenses).reduce(
            (value, expense) =>
              value + numeric(expense.actualAmount ?? expense.actualSpent),
            0,
          ) || numeric(month.actualSpent ?? month.actualAmount)),
        0,
      );
      return {
        name: String(plan.department || plan.departmentName || "Department"),
        projected,
        actual,
        requests: expenses.length,
      };
    });
    const projected = departments.reduce(
      (sum, department) => sum + department.projected,
      0,
    );
    const actual = departments.reduce(
      (sum, department) => sum + department.actual,
      0,
    );
    return {
      departments,
      projected,
      actual,
      remaining: projected - actual,
      utilization: projected ? Math.round((actual / projected) * 100) : 0,
    };
  }, [data.snapshot]);

  const annualRequests = rows(data.snapshot.annualRequests);
  const extraRequests = rows(data.snapshot.extraRequests);
  const allRequests = [...annualRequests, ...extraRequests];
  const pendingRequests = allRequests.filter((request) =>
    /pending|review|discuss|changes requested/i.test(
      String(request.status || ""),
    ),
  );
  const approvedRequests = allRequests.filter((request) =>
    /approved|active/i.test(String(request.status || "")),
  );
  const rejectedRequests = allRequests.filter((request) =>
    /rejected/i.test(String(request.status || "")),
  );
  const expenseRows = rows(data.snapshot.departmentFinance).flatMap((plan) =>
    rows(plan.monthlyPlan).flatMap((month) =>
      rows(month.expenses).map((expense) => ({
        ...expense,
        department: plan.department || plan.departmentName,
        month: month.monthLabel || month.month || month.monthKey,
      })),
    ),
  );
  const invoicePending = expenseRows.filter(
    (expense) =>
      !expense.invoiceNumber &&
      !expense.invoiceUrl &&
      numeric(expense.actualAmount) > 0,
  ).length;

  const chartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins, sans-serif" },
    colors: ["#2563EB", "#10B981"],
    dataLabels: { enabled: false },
    grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
    plotOptions: { bar: { borderRadius: 5, columnWidth: "46%" } },
    xaxis: {
      categories: budget.departments.map((department) => department.name),
      labels: { rotate: -30, style: { colors: "#64748B", fontSize: "10px" } },
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
  };

  return (
    <FinanceDashboardFrame loadError={loadError} onRefresh={refresh}>
      <DashboardBanner
        title="Expenses & Budget"
        description="Projected budgets, approval queues, actual spending, invoice readiness, and department utilisation in one working view."
        tags={[
          "Projected Budget",
          "Extra Requests",
          "Expense History",
          "Invoices",
        ]}
        image={financeBannerImage}
      />
      {isLoading ? (
        <FinanceDashboardLoading />
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardStatTile
            icon={<PiggyBank size={20} />}
            label="Projected Budget"
            value={money(budget.projected)}
            sub="Approved department plans"
            tone="blue"
          />
          <DashboardStatTile
            icon={<TrendingDown size={20} />}
            label="Actual Spend"
            value={money(budget.actual)}
            sub={`${budget.utilization}% of projected budget`}
            tone={budget.utilization > 90 ? "rose" : "violet"}
          />
          <DashboardStatTile
            icon={<Wallet size={20} />}
            label="Budget Remaining"
            value={money(budget.remaining)}
            sub="Projected less actual spend"
            tone={budget.remaining >= 0 ? "green" : "rose"}
          />
          <DashboardStatTile
            icon={<Building2 size={20} />}
            label="Departments"
            value={budget.departments.length}
            sub="Departments with finance plans"
            tone="cyan"
          />
          <DashboardStatTile
            icon={<Receipt size={20} />}
            label="Annual Requests"
            value={annualRequests.length}
            sub="Submitted projected budgets"
            tone="slate"
          />
          <DashboardStatTile
            icon={<AlertCircle size={20} />}
            label="Extra Requests"
            value={extraRequests.length}
            sub="Additional budget requests"
            tone="amber"
          />
          <DashboardStatTile
            icon={<CheckCircle2 size={20} />}
            label="Pending Approval"
            value={pendingRequests.length}
            sub="Requests needing finance action"
            tone={pendingRequests.length ? "amber" : "green"}
          />
          <DashboardStatTile
            icon={<FileWarning size={20} />}
            label="Invoice Pending"
            value={invoicePending}
            sub="Spent entries without an invoice"
            tone={invoicePending ? "rose" : "green"}
          />
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm font-pmedium text-slate-900">
          Expenses & Budget modules
        </p>
        <p className="mt-1 text-[10px] text-slate-500">
          Open each finance working area directly from this dashboard.
        </p>
        <div className="mt-3 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          <DashboardModuleCard
            icon={<PiggyBank size={19} />}
            title="Projected Annual Budget"
            route="/department-accesses/finance-department/expenses-budget/estimated"
            description="Review department annual plans and monthly projections"
            color="#2563EB"
          />
          <DashboardModuleCard
            icon={<AlertCircle size={19} />}
            title="Extra Budget Requests"
            route="/department-accesses/finance-department/expenses-budget/extra"
            description="Approve or return additional funding requests"
            color="#F59E0B"
          />
          <DashboardModuleCard
            icon={<History size={19} />}
            title="Expense History & Invoices"
            route="/department-accesses/finance-department/expenses-budget/ledger"
            description="Track actual spend, payment state, and invoices"
            color="#0D9488"
          />
        </div>
      </div>

      {!isLoading ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
            <DashboardSection
              title="Department budget control"
              subtitle="Projected versus actual spending for every department plan."
            >
              {budget.departments.length ? (
                <GroupedBarGraph
                  options={chartOptions}
                  series={[
                    {
                      name: "Projected",
                      data: budget.departments.map(
                        (department) => department.projected,
                      ),
                    },
                    {
                      name: "Actual",
                      data: budget.departments.map(
                        (department) => department.actual,
                      ),
                    },
                  ]}
                />
              ) : (
                <FinanceDashboardEmpty>
                  No department budget plan is available yet.
                </FinanceDashboardEmpty>
              )}
            </DashboardSection>
            <DashboardSection
              title="Request decisions"
              subtitle="Annual and extra-budget requests grouped by finance outcome."
            >
              {allRequests.length ? (
                <DonutChart
                  centerLabel="Requests"
                  labels={["Approved", "Pending", "Rejected"]}
                  series={[
                    approvedRequests.length,
                    pendingRequests.length,
                    rejectedRequests.length,
                  ]}
                  colors={["#10B981", "#F59E0B", "#EF4444"]}
                  tooltipValue={[
                    `${approvedRequests.length} requests`,
                    `${pendingRequests.length} requests`,
                    `${rejectedRequests.length} requests`,
                  ]}
                  wrapLabels
                />
              ) : (
                <FinanceDashboardEmpty>
                  No budget requests are available yet.
                </FinanceDashboardEmpty>
              )}
            </DashboardSection>
          </div>
          <DashboardSection
            title="Department utilisation"
            subtitle="Budget position, utilisation, and expense-entry volume by department."
            bodyClassName="max-h-[420px] overflow-y-auto p-0"
          >
            {budget.departments.length ? (
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="w-[28%] px-5 py-3">Department</th>
                    <th className="w-[18%] px-3 py-3">Projected</th>
                    <th className="w-[18%] px-3 py-3">Actual</th>
                    <th className="w-[18%] px-3 py-3">Remaining</th>
                    <th className="w-[10%] px-3 py-3 text-center">Entries</th>
                    <th className="w-[8%] px-3 py-3 text-center">Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {budget.departments.map((department) => {
                    const usage = department.projected
                      ? Math.round(
                          (department.actual / department.projected) * 100,
                        )
                      : 0;
                    return (
                      <tr
                        key={department.name}
                        className="bg-white text-[11px] text-slate-600"
                      >
                        <td className="truncate px-5 py-3 font-pmedium text-slate-900">
                          {department.name}
                        </td>
                        <td className="truncate px-3 py-3">
                          {money(department.projected)}
                        </td>
                        <td className="truncate px-3 py-3">
                          {money(department.actual)}
                        </td>
                        <td className="truncate px-3 py-3">
                          {money(department.projected - department.actual)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {department.requests}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`rounded-full px-2 py-1 text-[9px] ${usage >= 100 ? "bg-rose-50 text-rose-700" : usage >= 75 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
                          >
                            {usage}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <FinanceDashboardEmpty>
                No department budget utilisation is available yet.
              </FinanceDashboardEmpty>
            )}
          </DashboardSection>
        </>
      ) : null}
    </FinanceDashboardFrame>
  );
}
