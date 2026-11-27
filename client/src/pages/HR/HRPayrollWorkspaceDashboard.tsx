import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  History,
  MinusCircle,
  PlusCircle,
  ReceiptText,
  Send,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import ReactApexChart from "react-apexcharts";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import DonutChart from "@/components/graphs/DonutChart";
import PageFrame from "@/components/Pages/PageFrame";
import hrBannerImage from "@/assets/hr-dashboard-banner.webp";
import { getPayrollSnapshot } from "@/services/hr";
import { DEFAULT_WORKSPACE_CURRENCY } from "@/lib/workspaceLocalization";
import {
  DashboardBanner,
  DashboardSection,
  DashboardStatTile,
} from "../Administration/AdministrationModuleDashboardShared";

type PayrollRow = Record<string, any>;

type PayrollDashboardData = {
  cycle: PayrollRow | null;
  history: PayrollRow[];
  currency: string;
};

const EMPTY: PayrollDashboardData = {
  cycle: null,
  history: [],
  currency: DEFAULT_WORKSPACE_CURRENCY,
};

const MODULES = [
  {
    title: "Payroll Master",
    section: "master",
    icon: ReceiptText,
    color: "#2563EB",
    description: "Run the current cycle, apply adjustments, and prepare handoff",
  },
  {
    title: "Payroll History",
    section: "history",
    icon: History,
    color: "#16A34A",
    description: "Review every past cycle handed over to Finance",
  },
] as const;

const rows = (value: unknown): PayrollRow[] => (Array.isArray(value) ? value : []);
const normalize = (value: unknown) => String(value || "").trim().toLowerCase();
const numeric = (value: unknown) =>
  Number(String(value ?? "0").replace(/[^0-9.-]/g, "")) || 0;

const titleCase = (value: unknown, fallback = "Pending") =>
  String(value || fallback)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const dateLabel = (value: unknown) => {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const statusClass = (status: string) => {
  const value = normalize(status);
  if (value === "paid" || value.includes("paid")) return "bg-emerald-50 text-emerald-700";
  if (value.includes("processing") || value.includes("prepared")) return "bg-blue-50 text-blue-700";
  if (value.includes("finance")) return "bg-violet-50 text-violet-700";
  return "bg-amber-50 text-amber-700";
};

export default function HRPayrollWorkspaceDashboard() {
  const [data, setData] = useState<PayrollDashboardData>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError("");

    getPayrollSnapshot()
      .then((response: any) => {
        if (cancelled) return;
        const envelope = response?.data || {};
        const payload = envelope?.data || envelope || {};
        setData({
          cycle: payload.currentCycle || null,
          history: rows(payload.history),
          currency: payload.settings?.currency || DEFAULT_WORKSPACE_CURRENCY,
        });
        setLoadError("");
      })
      .catch((error: any) => {
        if (cancelled) return;
        setData(EMPTY);
        setLoadError(
          error?.message || "Payroll data could not be refreshed just now.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const currency = useMemo(
    () =>
      (value: number) =>
        new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: data.currency || DEFAULT_WORKSPACE_CURRENCY,
          notation: Math.abs(value) >= 100000 ? "compact" : "standard",
          maximumFractionDigits: Math.abs(value) >= 100000 ? 1 : 0,
        }).format(value || 0),
    [data.currency],
  );

  const employees = useMemo(
    () => rows(data.cycle?.employees),
    [data.cycle],
  );

  const stats = useMemo(() => {
    const payableEmployees = employees.filter(
      (employee) =>
        Number(employee.salaryPackage?.annualCtc || employee.salaryPackage?.grossAnnual || 0) > 0 &&
        numeric(employee.financials?.netSalary) > 0,
    );
    const totalPayout = payableEmployees.reduce(
      (sum, employee) => sum + numeric(employee.financials?.netSalary),
      0,
    );
    const totalBonus = payableEmployees.reduce(
      (sum, employee) => sum + numeric(employee.financials?.hrBonus),
      0,
    );
    const totalDeductions = payableEmployees.reduce(
      (sum, employee) => sum + numeric(employee.financials?.hrDeductions),
      0,
    );
    const paid = employees.filter((employee) =>
      normalize(
        employee.financials?.paymentStatus || employee.payment?.status,
      ).includes("paid"),
    ).length;
    const processing = employees.filter((employee) => {
      const status = normalize(
        employee.financials?.paymentStatus || employee.payment?.status,
      );
      return status.includes("processing") || status.includes("prepared");
    }).length;
    const totalDisbursed = data.history.reduce(
      (sum, cycle) => sum + numeric(cycle.totalAmount),
      0,
    );
    return {
      totalEmployees: employees.length,
      payableEmployees: payableEmployees.length,
      totalPayout,
      totalBonus,
      totalDeductions,
      paid,
      processing,
      pending: Math.max(0, employees.length - paid - processing),
      cycleStatus: titleCase(data.cycle?.status, "Pending"),
      cyclesProcessed: data.history.length,
      totalDisbursed,
      completionRate: employees.length
        ? Math.round((paid / employees.length) * 100)
        : 0,
    };
  }, [data.cycle, data.history, employees]);

  const paymentStatusRows = useMemo(() => {
    const groups = new Map<string, number>();
    employees.forEach((employee) => {
      const status = titleCase(
        employee.financials?.paymentStatus || employee.payment?.status,
        "Pending",
      );
      groups.set(status, (groups.get(status) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [employees]);

  const departmentRows = useMemo(() => {
    const groups = new Map<string, { employees: number; payout: number; paid: number }>();
    employees.forEach((employee) => {
      const name = String(employee.department || "Not assigned");
      const current = groups.get(name) || { employees: 0, payout: 0, paid: 0 };
      current.employees += 1;
      current.payout += numeric(employee.financials?.netSalary);
      if (normalize(employee.financials?.paymentStatus || employee.payment?.status).includes("paid")) {
        current.paid += 1;
      }
      groups.set(name, current);
    });
    return [...groups.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((left, right) => right.payout - left.payout);
  }, [employees]);

  const payoutTrend = useMemo(() => {
    const sorted = [...data.history].sort((left, right) => {
      const leftDate = new Date(left.sentToFinanceAt || left.processedOn || 0).getTime();
      const rightDate = new Date(right.sentToFinanceAt || right.processedOn || 0).getTime();
      return rightDate - leftDate || Number(right.year || 0) - Number(left.year || 0);
    });
    return sorted
      .slice(0, 6)
      .reverse()
      .map((cycle) => ({
        label: String(
          cycle.monthLabel || cycle.displayMonth || `M${Number(cycle.month || 0) + 1}`,
        ).slice(0, 8),
        amount: numeric(cycle.totalAmount),
        employees: Number(cycle.totalEmployees || 0),
      }));
  }, [data.history]);

  const payoutOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false }, fontFamily: "Poppins, sans-serif" },
      colors: ["#2563EB"],
      dataLabels: { enabled: false },
      plotOptions: { bar: { borderRadius: 5, columnWidth: "48%" } },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
      xaxis: {
        categories: payoutTrend.map((item) => item.label),
        labels: { style: { colors: "#64748B", fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          style: { colors: "#64748B", fontSize: "10px" },
          formatter: (value: number) => currency(value),
        },
      },
      tooltip: {
        y: {
          formatter: (value: number) => currency(value),
        },
      },
    }),
    [currency, payoutTrend],
  );

  const recentCycles = useMemo(
    () =>
      [...data.history]
        .sort((left, right) => {
          const leftDate = new Date(left.sentToFinanceAt || left.processedOn || 0).getTime();
          const rightDate = new Date(right.sentToFinanceAt || right.processedOn || 0).getTime();
          return rightDate - leftDate || Number(right.year || 0) - Number(left.year || 0);
        })
        .slice(0, 6),
    [data.history],
  );

  const topEmployees = useMemo(
    () =>
      [...employees]
        .sort(
          (left, right) =>
            numeric(right.financials?.netSalary) -
            numeric(left.financials?.netSalary),
        )
        .slice(0, 6),
    [employees],
  );

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <DashboardBanner
          title="Payroll Management"
          description="Track the live salary cycle, monthly disbursement, payment progress, and every cycle handed over to Finance."
          tags={["Salary Cycle", "Payouts", "Adjustments", "History"]}
          image={hrBannerImage}
        />

        {loadError && !isLoading ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            {loadError} Existing values may be incomplete.
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="h-[112px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStatTile
              icon={<Users size={20} />}
              label="Employees In Cycle"
              value={stats.totalEmployees}
              sub={`${stats.payableEmployees} with payable CTC`}
              tone="blue"
            />
            <DashboardStatTile
              icon={<WalletCards size={20} />}
              label="Total Payout"
              value={currency(stats.totalPayout)}
              sub={`${data.cycle?.monthLabel || "Current"} ${data.cycle?.year || ""} net salary`.trim()}
              tone="green"
            />
            <DashboardStatTile
              icon={<CheckCircle2 size={20} />}
              label="Employees Paid"
              value={stats.paid}
              sub={`${stats.completionRate}% of the current cycle`}
              tone={stats.paid ? "green" : "amber"}
            />
            <DashboardStatTile
              icon={<Banknote size={20} />}
              label="Total Disbursed"
              value={currency(stats.totalDisbursed)}
              sub={`Across ${stats.cyclesProcessed} processed cycles`}
              tone="slate"
            />
            <DashboardStatTile
              icon={<PlusCircle size={20} />}
              label="Bonus Added"
              value={currency(stats.totalBonus)}
              sub="HR bonuses in the current cycle"
              tone="amber"
            />
            <DashboardStatTile
              icon={<MinusCircle size={20} />}
              label="HR Deductions"
              value={currency(stats.totalDeductions)}
              sub="Additional cycle deductions"
              tone="rose"
            />
            <DashboardStatTile
              icon={<ShieldCheck size={20} />}
              label="Cycle Status"
              value={stats.cycleStatus}
              sub={`${stats.processing} processing, ${stats.pending} pending`}
              tone="violet"
            />
            <DashboardStatTile
              icon={<Send size={20} />}
              label="Cycles Processed"
              value={stats.cyclesProcessed}
              sub="Cycles handed to Finance so far"
              tone="cyan"
            />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">
            Payroll modules
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Open the payroll area you need — the live salary sheet or the
            archived cycle history.
          </p>
          <div
            className="mt-3 grid w-full grid-cols-1 gap-4 md:grid-cols-[repeat(var(--module-cols),minmax(0,1fr))]"
            style={{ "--module-cols": MODULES.length } as CSSProperties}
          >
            {MODULES.map((module) => {
              const Icon = module.icon;
              return (
                <DashboardModuleCard
                  key={module.section}
                  icon={<Icon size={19} />}
                  title={module.title}
                  route={`/department-accesses/hr-department/payroll-management/${module.section}`}
                  description={module.description}
                  color={module.color}
                />
              );
            })}
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
              <DashboardSection
                title="Disbursement trend"
                subtitle="Amount handed to Finance for each of the latest processed cycles."
              >
                {payoutTrend.some((item) => item.amount > 0) ? (
                  <ReactApexChart
                    type="bar"
                    height={320}
                    options={payoutOptions}
                    series={[
                      {
                        name: "Disbursed",
                        data: payoutTrend.map((item) => item.amount),
                      },
                    ]}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No completed payroll cycles recorded yet.
                  </div>
                )}
              </DashboardSection>
              <DashboardSection
                title="Payment progress"
                subtitle="Paid, processing, and pending employees in the current cycle."
              >
                {paymentStatusRows.length ? (
                  <DonutChart
                    centerLabel="Employees"
                    labels={paymentStatusRows.map(([name]) => name)}
                    series={paymentStatusRows.map(([, value]) => value)}
                    colors={["#10B981", "#2563EB", "#F59E0B", "#94A3B8"]}
                    tooltipValue={paymentStatusRows.map(
                      ([, value]) => `${value} employees`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No payroll employees in this cycle yet.
                  </div>
                )}
              </DashboardSection>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DashboardSection
                title="Headcount by department"
                subtitle="Employees included in the current salary cycle."
              >
                {departmentRows.length ? (
                  <DonutChart
                    centerLabel="Employees"
                    labels={departmentRows.map((row) => row.name)}
                    series={departmentRows.map((row) => row.employees)}
                    colors={[
                      "#2563EB",
                      "#10B981",
                      "#7C3AED",
                      "#F59E0B",
                      "#0D9488",
                      "#EF4444",
                      "#94A3B8",
                    ]}
                    tooltipValue={departmentRows.map(
                      (row) => `${row.employees} employees`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No department payroll data recorded yet.
                  </div>
                )}
              </DashboardSection>

              <DashboardSection
                title="Payout by department"
                subtitle="Net salary and payment progress for each department."
                bodyClassName="max-h-[360px] overflow-y-auto p-0"
              >
                {departmentRows.length ? (
                  <table className="w-full table-fixed border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                      <tr>
                        <th className="w-[36%] px-5 py-3">Department</th>
                        <th className="w-[16%] px-3 py-3 text-center">Staff</th>
                        <th className="w-[24%] px-3 py-3 text-right">Net payout</th>
                        <th className="w-[24%] px-3 py-3 text-center">Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {departmentRows.map((row) => (
                        <tr
                          key={row.name}
                          className="bg-white text-[11px] text-slate-600"
                        >
                          <td className="truncate px-5 py-3 font-pmedium text-slate-900">
                            {row.name}
                          </td>
                          <td className="px-3 py-3 text-center">{row.employees}</td>
                          <td className="px-3 py-3 text-right font-pmedium text-slate-900">
                            {currency(row.payout)}
                          </td>
                          <td className="px-3 py-3 text-center text-emerald-700">
                            {row.paid}/{row.employees}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No department payroll data recorded yet.
                  </div>
                )}
              </DashboardSection>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DashboardSection
                title="Recent payroll cycles"
                subtitle="The latest cycles processed and sent to Finance."
                bodyClassName="max-h-[360px] overflow-y-auto p-0"
              >
                {recentCycles.length ? (
                  <table className="w-full table-fixed border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                      <tr>
                        <th className="w-[28%] px-5 py-3">Cycle</th>
                        <th className="w-[20%] px-3 py-3 text-center">Staff</th>
                        <th className="w-[24%] px-3 py-3 text-right">Amount</th>
                        <th className="w-[28%] px-3 py-3 text-center">Status / handoff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentCycles.map((cycle, index) => (
                        <tr
                          key={cycle.id || cycle.cycleKey || index}
                          className="bg-white text-[11px] text-slate-600"
                        >
                          <td className="truncate px-5 py-3 font-pmedium text-slate-900">
                            {cycle.displayMonth ||
                              cycle.monthLabel ||
                              `Cycle ${index + 1}`}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {cycle.totalEmployees || 0}
                          </td>
                          <td className="px-3 py-3 text-right font-pmedium text-slate-900">
                            {currency(numeric(cycle.totalAmount))}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[9px] ${statusClass(titleCase(cycle.status, "Pending"))}`}
                            >
                              {titleCase(cycle.status, "Pending")}
                            </span>
                            <p className="mt-1 text-[9px] text-slate-400">
                              {dateLabel(cycle.sentToFinanceAt || cycle.processedOn)}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No payroll cycles have been handed over yet.
                  </div>
                )}
              </DashboardSection>

              <DashboardSection
                title="Top net payouts"
                subtitle="Highest net salaries in the current salary cycle."
                bodyClassName="max-h-[360px] overflow-y-auto p-0"
              >
                {topEmployees.length ? (
                  <table className="w-full table-fixed border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                      <tr>
                        <th className="w-[44%] px-5 py-3">Employee</th>
                        <th className="w-[26%] px-3 py-3">Department</th>
                        <th className="w-[30%] px-3 py-3 text-right">Net salary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topEmployees.map((employee, index) => (
                        <tr
                          key={employee.profileId || employee.id || index}
                          className="bg-white text-[11px] text-slate-600"
                        >
                          <td className="truncate px-5 py-3 font-pmedium text-slate-900">
                            {employee.name || "Employee"}
                          </td>
                          <td className="truncate px-3 py-3">
                            {employee.department || "Not assigned"}
                          </td>
                          <td className="px-3 py-3 text-right font-pmedium text-slate-900">
                            {currency(numeric(employee.financials?.netSalary))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No employee payouts in this cycle yet.
                  </div>
                )}
              </DashboardSection>
            </div>

            <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-[10px] font-pmedium text-slate-600">
              <CalendarClock size={14} className="text-[#2563EB]" />
              Payroll figures reflect the latest snapshot for the selected cycle.
              Open Payroll Master to review the full salary sheet.
            </div>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
