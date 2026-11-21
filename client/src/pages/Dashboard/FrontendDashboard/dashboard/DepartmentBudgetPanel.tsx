/**
 * DepartmentBudgetPanel — a compact "Projected vs Actual spend" panel shared by
 * every department manager dashboard. It mirrors the budget chart that each
 * department's workspace dashboard already exposes, so the manager overview can
 * surface the same financial control information without duplicating the whole
 * workspace dashboard.
 */
import { useEffect, useMemo, useState } from "react";
import { WalletCards } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GroupedBarGraph from "@/components/graphs/GroupedBarGraph";
import { DEFAULT_FISCAL_YEAR } from "@/features/finance/utils/fiscalYear";
import { getDepartmentFinanceData } from "@/services/finance";
import { ActivityPanel, EmptyState } from "./DashboardShared";

type BudgetPanelProps = {
  /** Department plan label used by the finance API (e.g. "Technology", "IT"). */
  department: string;
  eyebrow?: string;
  title?: string;
  route?: string;
};

type BudgetRow = { label: string; projected: number; actual: number };

const list = (value: unknown): Record<string, any>[] =>
  Array.isArray(value) ? (value as Record<string, any>[]) : [];

const numeric = (value: unknown) => {
  const parsed = Number(String(value ?? "0").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: Math.abs(value) >= 100000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 100000 ? 1 : 0,
  }).format(value || 0);

export default function DepartmentBudgetPanel({
  department,
  eyebrow = "Financial control",
  title = "Budget vs Actual Spend",
  route = "/extra-common-modules/finance-management",
}: BudgetPanelProps) {
  const [finance, setFinance] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setFinance(null);

    getDepartmentFinanceData(DEFAULT_FISCAL_YEAR, department)
      .then((response: any) => {
        if (!isMounted) return;
        setFinance(response?.data?.data ?? response?.data ?? response ?? null);
      })
      .catch(() => {
        if (isMounted) setFinance(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [department]);

  const budget = useMemo(() => {
    const rows: BudgetRow[] = list(finance?.monthlyPlan).map((month, index) => {
      const expenses = list(month.expenses);
      return {
        label: String(
          month.month || month.monthLabel || month.monthKey || `M${index + 1}`,
        ).slice(0, 3),
        projected:
          expenses.reduce(
            (sum, expense) =>
              sum + numeric(expense.projectedAmount ?? expense.amount),
            0,
          ) || numeric(month.projectedBudget ?? month.allocatedBudget),
        actual:
          expenses.reduce(
            (sum, expense) =>
              sum + numeric(expense.actualAmount ?? expense.actualSpent),
            0,
          ) || numeric(month.actualSpent ?? month.actualAmount),
      };
    });
    const projected = rows.reduce((sum, row) => sum + row.projected, 0);
    const actual = rows.reduce((sum, row) => sum + row.actual, 0);
    return {
      rows,
      projected,
      actual,
      remaining: Math.max(0, projected - actual),
      utilization: projected ? Math.round((actual / projected) * 100) : 0,
    };
  }, [finance]);

  const options = useMemo(
    () => ({
      chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
      plotOptions: { bar: { borderRadius: 4, columnWidth: "48%" } },
      dataLabels: { enabled: false },
      grid: { borderColor: "#EEF2F7" },
      xaxis: { categories: budget.rows.map((row) => row.label) },
      colors: ["#2563EB", "#22C55E"],
      yaxis: { labels: { formatter: (value: number) => money(value) } },
      tooltip: {
        theme: "light",
        y: { formatter: (value: number) => money(value) },
      },
    }),
    [budget.rows],
  );

  const series = useMemo(
    () => [
      { name: "Projected budget", data: budget.rows.map((row) => row.projected) },
      { name: "Actual spent", data: budget.rows.map((row) => row.actual) },
    ],
    [budget.rows],
  );

  return (
    <ActivityPanel
      eyebrow={eyebrow}
      title={title}
      action={
        <button
          type="button"
          onClick={() => navigate(route)}
          className="group inline-flex items-center gap-1 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]"
        >
          Budget details
          <span className="transition group-hover:translate-x-0.5">→</span>
        </button>
      }
    >
      {isLoading ? (
        <div className="h-[280px] animate-pulse rounded-xl bg-slate-100" />
      ) : budget.rows.length ? (
        <div className="flex flex-1 flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">
                Projected
              </p>
              <p className="mt-1 text-sm font-pmedium text-[#1E3D73]">
                {money(budget.projected)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">
                Actual
              </p>
              <p className="mt-1 text-sm font-pmedium text-[#1E3D73]">
                {money(budget.actual)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-emerald-50/70 px-3 py-2.5">
              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">
                Remaining
              </p>
              <p className="mt-1 text-sm font-pmedium text-emerald-700">
                {money(budget.remaining)}
              </p>
              <p className="mt-0.5 text-[9px] text-slate-400">
                {budget.utilization}% used
              </p>
            </div>
          </div>
          <GroupedBarGraph options={options} series={series} />
        </div>
      ) : (
        <EmptyState
          icon={WalletCards}
          title="No approved budget yet"
          description="Once the department's annual budget is approved, its monthly projected and actual spend will appear here."
          actionLabel="Open Finance"
          route={route}
        />
      )}
    </ActivityPanel>
  );
}
