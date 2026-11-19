import { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calculator,
  Landmark,
  Receipt,
  TrendingUp,
} from "lucide-react";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import DonutChart from "@/components/graphs/DonutChart";
import GroupedBarGraph from "@/components/graphs/GroupedBarGraph";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "@/lib/workspaceLocalization";
import accountingBannerImage from "@/assets/module-banners/accounting-finance-banner.png";
import {
  DashboardBanner,
  DashboardSection,
  DashboardStatTile,
} from "../Administration/AdministrationModuleDashboardShared";
import {
  FinanceDashboardEmpty,
  FinanceDashboardFrame,
  FinanceDashboardLoading,
  financeAmount,
  financeDate,
  financeStatus,
  formatDashboardDate,
  isSettled,
  numeric,
  prettyLabel,
  recentRows,
  rows,
  useFinanceModuleDashboardData,
} from "./FinanceModuleDashboardShared";

type LedgerRow = Record<string, any> & {
  ledgerType: "Income" | "Expense";
  ledgerSource: string;
  ledgerAmount: number;
  ledgerDate: string;
};

export default function AccountingWorkspaceDashboard() {
  const { data, isLoading, loadError, refresh } =
    useFinanceModuleDashboardData();
  const preferences = useWorkspacePreferences();
  const money = (value: number) =>
    formatWorkspaceCurrency(value, preferences.currency, {
      maximumFractionDigits: 0,
    });

  const departmentRows = useMemo(
    () =>
      rows(data.snapshot.departmentFinance).map((plan) => {
        const expenses = rows(plan.monthlyPlan).flatMap((month) =>
          rows(month.expenses),
        );
        const projected = expenses.reduce(
          (sum, expense) =>
            sum + numeric(expense.projectedAmount ?? expense.amount),
          0,
        );
        const actual = expenses.reduce(
          (sum, expense) =>
            sum + numeric(expense.actualAmount ?? expense.actualSpent),
          0,
        );
        return {
          name: String(plan.department || plan.departmentName || "Department"),
          projected,
          actual,
        };
      }),
    [data.snapshot],
  );

  const ledger = useMemo<LedgerRow[]>(() => {
    const income = [...data.income, ...data.revenue]
      .filter(
        (entry) =>
          data.income.includes(entry) || isSettled(financeStatus(entry)),
      )
      .map((entry) => ({
        ...entry,
        ledgerType: "Income" as const,
        ledgerSource: prettyLabel(
          entry.source || entry.category || entry.type || "Revenue",
        ),
        ledgerAmount: financeAmount(entry),
        ledgerDate: financeDate(entry),
      }));
    const budgetExpenses = rows(data.snapshot.departmentFinance).flatMap(
      (plan) =>
        rows(plan.monthlyPlan).flatMap((month) =>
          rows(month.expenses)
            .filter(
              (expense) =>
                numeric(expense.actualAmount ?? expense.actualSpent) > 0,
            )
            .map((expense) => ({
              ...expense,
              department: plan.department || plan.departmentName,
              ledgerType: "Expense" as const,
              ledgerSource: prettyLabel(
                expense.expenseTag || expense.category || "Department Expense",
              ),
              ledgerAmount: numeric(
                expense.actualAmount ?? expense.actualSpent,
              ),
              ledgerDate: String(
                expense.paidAt ||
                  expense.invoiceDate ||
                  expense.dueDate ||
                  month.monthKey ||
                  "",
              ),
            })),
        ),
    );
    const payrollExpenses = data.payroll
      .filter((employee) => isSettled(financeStatus(employee)))
      .map((employee) => ({
        ...employee,
        ledgerType: "Expense" as const,
        ledgerSource: "Payroll Expense",
        ledgerAmount: numeric(
          employee.financials?.netSalary ??
            employee.netSalary ??
            employee.netPayable,
        ),
        ledgerDate: financeDate(employee),
      }));
    return [...income, ...budgetExpenses, ...payrollExpenses];
  }, [data.income, data.payroll, data.revenue, data.snapshot]);

  const totalRevenue = ledger
    .filter((entry) => entry.ledgerType === "Income")
    .reduce((sum, entry) => sum + entry.ledgerAmount, 0);
  const totalExpenses = ledger
    .filter((entry) => entry.ledgerType === "Expense")
    .reduce((sum, entry) => sum + entry.ledgerAmount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue
    ? Math.round((netProfit / totalRevenue) * 100)
    : 0;
  const payrollExpense = ledger
    .filter((entry) => /payroll/i.test(entry.ledgerSource))
    .reduce((sum, entry) => sum + entry.ledgerAmount, 0);
  const departmentExpense = departmentRows.reduce(
    (sum, department) => sum + department.actual,
    0,
  );
  const pendingPayables = [...data.rents, ...data.virtualOffice]
    .filter((entry) => !isSettled(financeStatus(entry)))
    .reduce(
      (sum, entry) =>
        sum +
        numeric(
          entry.remaining ??
            entry.currentPeriod?.remaining ??
            financeAmount(entry),
        ),
      0,
    );

  const monthly = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - (11 - index),
        1,
      );
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString("en-IN", { month: "short" }),
        income: 0,
        expense: 0,
      };
    });
    ledger.forEach((entry) => {
      const date = new Date(entry.ledgerDate);
      const target = months.find(
        (month) => month.key === `${date.getFullYear()}-${date.getMonth()}`,
      );
      if (!Number.isNaN(date.getTime()) && target)
        target[entry.ledgerType === "Income" ? "income" : "expense"] +=
          entry.ledgerAmount;
    });
    return months;
  }, [ledger]);

  const trendOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins, sans-serif" },
    colors: ["#10B981", "#EF4444"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "48%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
    xaxis: {
      categories: monthly.map((month) => month.label),
      labels: { style: { colors: "#64748B", fontSize: "10px" } },
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
  };
  const departmentOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins, sans-serif" },
    colors: ["#2563EB", "#F59E0B"],
    plotOptions: {
      bar: { horizontal: true, borderRadius: 4, barHeight: "52%" },
    },
    dataLabels: { enabled: false },
    grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
    xaxis: {
      categories: departmentRows.slice(0, 8).map((row) => row.name),
      labels: {
        style: { colors: "#64748B", fontSize: "10px" },
        formatter: (value: string) => money(Number(value)),
      },
    },
    yaxis: {
      labels: { maxWidth: 145, style: { colors: "#475569", fontSize: "10px" } },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (value: number) => money(value) },
    },
  };
  const recentLedger = recentRows(
    ledger.map((entry) => ({ ...entry, createdAt: entry.ledgerDate })),
    10,
  ) as LedgerRow[];

  return (
    <FinanceDashboardFrame loadError={loadError} onRefresh={refresh}>
      <DashboardBanner
        title="Accounting"
        description="A reconciled view of revenue, expenses, departmental spend, payroll costs, ledger movement, and profit performance."
        tags={["Ledger", "Departments", "Profit & Loss", "Reconciliation"]}
        image={accountingBannerImage}
      />
      {isLoading ? (
        <FinanceDashboardLoading />
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardStatTile
            icon={<ArrowUpRight size={20} />}
            label="Revenue"
            value={money(totalRevenue)}
            sub="Posted and confirmed income"
            tone="green"
          />
          <DashboardStatTile
            icon={<ArrowDownRight size={20} />}
            label="Expenses"
            value={money(totalExpenses)}
            sub="Department and payroll costs"
            tone="rose"
          />
          <DashboardStatTile
            icon={<TrendingUp size={20} />}
            label="Net Profit"
            value={money(netProfit)}
            sub="Revenue less recorded expenses"
            tone={netProfit >= 0 ? "green" : "rose"}
          />
          <DashboardStatTile
            icon={<BarChart3 size={20} />}
            label="Margin"
            value={`${margin}%`}
            sub="Net profit as share of revenue"
            tone={margin >= 0 ? "blue" : "rose"}
          />
          <DashboardStatTile
            icon={<Receipt size={20} />}
            label="Ledger Entries"
            value={ledger.length}
            sub="Income and expense postings"
            tone="violet"
          />
          <DashboardStatTile
            icon={<Landmark size={20} />}
            label="Payroll Expense"
            value={money(payrollExpense)}
            sub="Processed employee payroll"
            tone="amber"
          />
          <DashboardStatTile
            icon={<Building2 size={20} />}
            label="Department Spend"
            value={money(departmentExpense)}
            sub={`${departmentRows.length} department plans`}
            tone="cyan"
          />
          <DashboardStatTile
            icon={<Calculator size={20} />}
            label="Pending Payables"
            value={money(pendingPayables)}
            sub="Outstanding rent obligations"
            tone={pendingPayables ? "amber" : "green"}
          />
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm font-pmedium text-slate-900">
          Accounting modules
        </p>
        <p className="mt-1 text-[10px] text-slate-500">
          Open the ledger, department reconciliation, or profit-and-loss
          workspace.
        </p>
        <div className="mt-3 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          <DashboardModuleCard
            icon={<Receipt size={19} />}
            title="General Ledger"
            route="/department-accesses/finance-department/accounting/ledger"
            description="Review income and expense entries with source references"
            color="#2563EB"
          />
          <DashboardModuleCard
            icon={<Building2 size={19} />}
            title="Department Review"
            route="/department-accesses/finance-department/accounting/departments"
            description="Compare allocated budgets, spend, and utilisation"
            color="#F59E0B"
          />
          <DashboardModuleCard
            icon={<TrendingUp size={19} />}
            title="Profit & Loss"
            route="/department-accesses/finance-department/accounting/pnl"
            description="Understand revenue, COGS, OPEX, margin, and net profit"
            color="#10B981"
          />
        </div>
      </div>

      {!isLoading ? (
        <>
          <div className="mb-4">
            <DashboardSection
              title="Monthly revenue and expenses"
              subtitle="Twelve-month accounting movement from posted finance records."
            >
              <GroupedBarGraph
                options={trendOptions}
                series={[
                  {
                    name: "Revenue",
                    data: monthly.map((month) => month.income),
                  },
                  {
                    name: "Expenses",
                    data: monthly.map((month) => month.expense),
                  },
                ]}
              />
            </DashboardSection>
          </div>
          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DashboardSection
              title="Entry mix"
              subtitle="Accounting ledger split between income and expense postings."
            >
              {ledger.length ? (
                <DonutChart
                  centerLabel="Entries"
                  labels={["Income", "Expenses"]}
                  series={[
                    ledger.filter((entry) => entry.ledgerType === "Income")
                      .length,
                    ledger.filter((entry) => entry.ledgerType === "Expense")
                      .length,
                  ]}
                  colors={["#10B981", "#EF4444"]}
                  tooltipValue={[
                    `${ledger.filter((entry) => entry.ledgerType === "Income").length} entries`,
                    `${ledger.filter((entry) => entry.ledgerType === "Expense").length} entries`,
                  ]}
                  wrapLabels
                />
              ) : (
                <FinanceDashboardEmpty>
                  No accounting entries are available yet.
                </FinanceDashboardEmpty>
              )}
            </DashboardSection>
            <DashboardSection
              title="Department budget position"
              subtitle="Projected versus actual spend for the busiest department plans."
            >
              {departmentRows.length ? (
                <GroupedBarGraph
                  options={departmentOptions}
                  series={[
                    {
                      name: "Projected",
                      data: departmentRows
                        .slice(0, 8)
                        .map((row) => row.projected),
                    },
                    {
                      name: "Actual",
                      data: departmentRows.slice(0, 8).map((row) => row.actual),
                    },
                  ]}
                />
              ) : (
                <FinanceDashboardEmpty>
                  No department budget records are available yet.
                </FinanceDashboardEmpty>
              )}
            </DashboardSection>
          </div>
          <DashboardSection
            title="Recent ledger activity"
            subtitle="Latest posted income and expense entries across finance sources."
            bodyClassName="max-h-[430px] overflow-y-auto p-0"
          >
            {recentLedger.length ? (
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="w-[28%] px-5 py-3">Source</th>
                    <th className="w-[18%] px-3 py-3">Type</th>
                    <th className="w-[20%] px-3 py-3">Account</th>
                    <th className="w-[18%] px-3 py-3">Amount</th>
                    <th className="w-[16%] px-3 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentLedger.map((entry, index) => (
                    <tr
                      key={entry.id || entry._id || index}
                      className="bg-white text-[11px] text-slate-600"
                    >
                      <td className="truncate px-5 py-3 font-pmedium text-slate-900">
                        {entry.ledgerSource}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-[9px] ${entry.ledgerType === "Income" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                        >
                          {entry.ledgerType}
                        </span>
                      </td>
                      <td className="truncate px-3 py-3">
                        {entry.department ||
                          entry.entityName ||
                          entry.companyName ||
                          entry.employeeName ||
                          entry.name ||
                          "Workspace"}
                      </td>
                      <td className="truncate px-3 py-3">
                        {money(entry.ledgerAmount)}
                      </td>
                      <td className="truncate px-3 py-3">
                        {formatDashboardDate(entry.ledgerDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <FinanceDashboardEmpty>
                No recent accounting activity is available.
              </FinanceDashboardEmpty>
            )}
          </DashboardSection>
        </>
      ) : null}
    </FinanceDashboardFrame>
  );
}
