import { useMemo } from "react";
import {
  Banknote,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  FileText,
  ReceiptIndianRupee,
  Users,
} from "lucide-react";
import ReactApexChart from "react-apexcharts";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import DonutChart from "@/components/graphs/DonutChart";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "@/lib/workspaceLocalization";
import billingBannerImage from "@/assets/tenant-companies-dashboard-banner.png";
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
  useFinanceModuleDashboardData,
} from "./FinanceModuleDashboardShared";

const MODULES = [
  {
    title: "Tenant Security Deposits",
    tab: "tenant",
    icon: Building2,
    color: "#2563EB",
    description: "Issue invoices and verify company security deposits",
  },
  {
    title: "Tenant Rent",
    tab: "rent",
    icon: ReceiptIndianRupee,
    color: "#0D9488",
    description: "Review due cycles, proofs, and rent collections",
  },
  {
    title: "Virtual Office",
    tab: "virtualOffice",
    icon: Building2,
    color: "#7C3AED",
    description: "Track virtual-office rent and payment history",
  },
  {
    title: "Workation Revenue",
    tab: "workation",
    icon: Briefcase,
    color: "#0891B2",
    description: "Record workation packages and received revenue",
  },
  {
    title: "Alternate Revenue",
    tab: "alternateRevenue",
    icon: Coins,
    color: "#F59E0B",
    description: "Manage café, printing, parking, and other income",
  },
  {
    title: "Meeting Room Bookings",
    tab: "bookings",
    icon: Calendar,
    color: "#2563EB",
    description: "Generate booking invoices and track payment state",
  },
  {
    title: "Payroll",
    tab: "payroll",
    icon: Users,
    color: "#DC2626",
    description: "Review salary payable and process employee payments",
  },
  {
    title: "Extra Credit Requests",
    tab: "extraCredits",
    icon: CreditCard,
    color: "#7C3AED",
    description: "Invoice and verify tenant credit top-ups",
  },
  {
    title: "Transaction History",
    tab: "history",
    icon: Clock,
    color: "#475569",
    description: "Review consolidated billing and payment activity",
  },
] as const;

export default function BillingPaymentsWorkspaceDashboard() {
  const { data, isLoading, loadError, refresh } =
    useFinanceModuleDashboardData();
  const preferences = useWorkspacePreferences();
  const money = (value: number) =>
    formatWorkspaceCurrency(value, preferences.currency, {
      maximumFractionDigits: 0,
    });
  const rentRows = useMemo(
    () => [...data.rents, ...data.virtualOffice],
    [data.rents, data.virtualOffice],
  );
  const revenueRows = useMemo(
    () => [...data.income, ...data.revenue],
    [data.income, data.revenue],
  );
  const payrollTotal = data.payroll.reduce(
    (sum, employee) =>
      sum +
      numeric(
        employee.financials?.netSalary ??
          employee.netSalary ??
          employee.netPayable,
      ),
    0,
  );
  const payrollPaid = data.payroll.filter((employee) =>
    isSettled(financeStatus(employee)),
  ).length;
  const depositPaid = data.billing.filter((bill) =>
    isSettled(financeStatus(bill)),
  );
  const outstandingRent = rentRows
    .filter((record) => !isSettled(financeStatus(record)))
    .reduce(
      (sum, record) =>
        sum +
        numeric(
          record.remaining ??
            record.currentPeriod?.remaining ??
            financeAmount(record),
        ),
      0,
    );
  const collectedRevenue = revenueRows
    .filter(
      (record) =>
        isSettled(financeStatus(record)) || data.income.includes(record),
    )
    .reduce((sum, record) => sum + financeAmount(record), 0);
  const pendingBookingInvoices = data.bookings.filter(
    (booking) =>
      !booking.invoiceNumber ||
      /pending/i.test(String(booking.invoiceStatus || "")),
  ).length;
  const pendingCredits = data.creditRequests.filter(
    (request) =>
      !/completed|rejected|credits added/i.test(String(request.status || "")),
  ).length;

  const paymentStates = useMemo(() => {
    const all = [
      ...rentRows,
      ...data.billing,
      ...data.bookings,
      ...data.creditRequests,
    ];
    const settled = all.filter((record) =>
      isSettled(financeStatus(record)),
    ).length;
    const failed = all.filter((record) =>
      /rejected|failed|overdue|reversal/i.test(financeStatus(record)),
    ).length;
    return {
      all,
      settled,
      attention: Math.max(0, all.length - settled - failed),
      failed,
    };
  }, [data.billing, data.bookings, data.creditRequests, rentRows]);

  const monthlyCollections = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString("en-IN", { month: "short" }),
        received: 0,
        pending: 0,
      };
    });
    [...revenueRows, ...rentRows].forEach((record) => {
      const date = new Date(financeDate(record));
      const month = months.find(
        (entry) => entry.key === `${date.getFullYear()}-${date.getMonth()}`,
      );
      if (!Number.isNaN(date.getTime()) && month) {
        if (isSettled(financeStatus(record)))
          month.received += financeAmount(record);
        else
          month.pending += numeric(
            record.remaining ??
              record.currentPeriod?.remaining ??
              financeAmount(record),
          );
      }
    });
    return months;
  }, [revenueRows, rentRows]);

  const activityOptions = {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "Poppins, sans-serif",
    },
    colors: ["#10B981", "#F59E0B"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth" as const, width: 3 },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.24, opacityTo: 0.03, stops: [0, 95, 100] },
    },
    grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
    legend: { position: "top" as const, horizontalAlign: "right" as const },
    xaxis: {
      categories: monthlyCollections.map((month) => month.label),
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

  const recentActivity = recentRows(
    [...revenueRows, ...rentRows, ...data.billing, ...data.bookings],
    10,
  );

  return (
    <FinanceDashboardFrame loadError={loadError} onRefresh={refresh}>
      <DashboardBanner
        title="Billing & Payments"
        description="Collections, invoices, rent, deposits, payroll, booking payments, and tenant credit workflows from one live control surface."
        tags={["Collections", "Invoices", "Payroll", "Transaction History"]}
        image={billingBannerImage}
      />
      {isLoading ? (
        <FinanceDashboardLoading />
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardStatTile
            icon={<Building2 size={20} />}
            label="Deposits Paid"
            value={`${depositPaid.length}/${data.billing.length}`}
            sub="Tenant security deposits verified"
            tone="green"
          />
          <DashboardStatTile
            icon={<ReceiptIndianRupee size={20} />}
            label="Rent Outstanding"
            value={money(outstandingRent)}
            sub={`${rentRows.filter((row) => !isSettled(financeStatus(row))).length} unpaid rent cycles`}
            tone={outstandingRent ? "amber" : "green"}
          />
          <DashboardStatTile
            icon={<Coins size={20} />}
            label="Revenue Received"
            value={money(collectedRevenue)}
            sub="Posted finance income entries"
            tone="cyan"
          />
          <DashboardStatTile
            icon={<Banknote size={20} />}
            label="Payroll Payable"
            value={money(payrollTotal)}
            sub="Current payroll cycle"
            tone="violet"
          />
          <DashboardStatTile
            icon={<CheckCircle2 size={20} />}
            label="Payroll Processed"
            value={`${payrollPaid}/${data.payroll.length}`}
            sub="Employees marked paid"
            tone={payrollPaid === data.payroll.length ? "green" : "amber"}
          />
          <DashboardStatTile
            icon={<FileText size={20} />}
            label="Booking Invoices"
            value={pendingBookingInvoices}
            sub="Bookings awaiting invoice action"
            tone={pendingBookingInvoices ? "amber" : "green"}
          />
          <DashboardStatTile
            icon={<CreditCard size={20} />}
            label="Credit Requests"
            value={pendingCredits}
            sub="Tenant top-ups awaiting completion"
            tone={pendingCredits ? "rose" : "green"}
          />
          <DashboardStatTile
            icon={<Clock size={20} />}
            label="Transactions"
            value={recentActivity.length}
            sub="Recent records available below"
            tone="slate"
          />
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm font-pmedium text-slate-900">
          Billing & Payments modules
        </p>
        <p className="mt-1 text-[10px] text-slate-500">
          Every working tab is available as a direct module entry.
        </p>
        <div className="mt-3 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <DashboardModuleCard
                key={module.tab}
                icon={<Icon size={19} />}
                title={module.title}
                route={`/department-accesses/finance-department/billing-payments/${module.tab}`}
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
              title="Six-month collection activity"
              subtitle="Received and pending values across revenue and rent records."
            >
              <ReactApexChart
                type="area"
                height={330}
                options={activityOptions}
                series={[
                  {
                    name: "Received",
                    data: monthlyCollections.map((month) => month.received),
                  },
                  {
                    name: "Pending",
                    data: monthlyCollections.map((month) => month.pending),
                  },
                ]}
              />
            </DashboardSection>
            <DashboardSection
              title="Payment workflow status"
              subtitle="Billing records grouped by settled, attention, and failed states."
            >
              {paymentStates.all.length ? (
                <DonutChart
                  centerLabel="Records"
                  labels={["Settled", "Needs attention", "Failed / overdue"]}
                  series={[
                    paymentStates.settled,
                    paymentStates.attention,
                    paymentStates.failed,
                  ]}
                  colors={["#10B981", "#F59E0B", "#EF4444"]}
                  tooltipValue={[
                    `${paymentStates.settled} records`,
                    `${paymentStates.attention} records`,
                    `${paymentStates.failed} records`,
                  ]}
                  wrapLabels
                />
              ) : (
                <FinanceDashboardEmpty>
                  No payment workflow records are available yet.
                </FinanceDashboardEmpty>
              )}
            </DashboardSection>
          </div>
          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DashboardSection
              title="Rent collection status"
              subtitle="Tenant and virtual-office rent cycles by settlement state."
            >
              {rentRows.length ? (
                <DonutChart
                  centerLabel="Rent cycles"
                  labels={["Paid", "Pending"]}
                  series={[
                    rentRows.filter((row) => isSettled(financeStatus(row)))
                      .length,
                    rentRows.filter((row) => !isSettled(financeStatus(row)))
                      .length,
                  ]}
                  colors={["#10B981", "#F59E0B"]}
                  tooltipValue={[
                    `${rentRows.filter((row) => isSettled(financeStatus(row))).length} cycles`,
                    `${rentRows.filter((row) => !isSettled(financeStatus(row))).length} cycles`,
                  ]}
                  wrapLabels
                />
              ) : (
                <FinanceDashboardEmpty>
                  No rent collection records are available yet.
                </FinanceDashboardEmpty>
              )}
            </DashboardSection>
            <DashboardSection
              title="Payroll payment status"
              subtitle="Current-cycle employees grouped by processed state."
            >
              {data.payroll.length ? (
                <DonutChart
                  centerLabel="Employees"
                  labels={["Processed", "Pending"]}
                  series={[payrollPaid, data.payroll.length - payrollPaid]}
                  colors={["#2563EB", "#F59E0B"]}
                  tooltipValue={[
                    `${payrollPaid} employees`,
                    `${data.payroll.length - payrollPaid} employees`,
                  ]}
                  wrapLabels
                />
              ) : (
                <FinanceDashboardEmpty>
                  No payroll cycle is available yet.
                </FinanceDashboardEmpty>
              )}
            </DashboardSection>
          </div>
          <DashboardSection
            title="Recent billing activity"
            subtitle="Latest collection, invoice, booking, and rent records."
            bodyClassName="max-h-[430px] overflow-y-auto p-0"
          >
            {recentActivity.length ? (
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="w-[30%] px-5 py-3">Account / source</th>
                    <th className="w-[21%] px-3 py-3">Type</th>
                    <th className="w-[18%] px-3 py-3">Amount</th>
                    <th className="w-[17%] px-3 py-3">Date</th>
                    <th className="w-[14%] px-3 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentActivity.map((record, index) => (
                    <tr
                      key={record.id || record._id || index}
                      className="bg-white text-[11px] text-slate-600"
                    >
                      <td className="truncate px-5 py-3 font-pmedium text-slate-900">
                        {record.companyName ||
                          record.tenantCompanyName ||
                          record.clientName ||
                          record.entityName ||
                          record.bookedByName ||
                          "Finance record"}
                      </td>
                      <td className="truncate px-3 py-3">
                        {prettyLabel(
                          record.source ||
                            record.category ||
                            record.type ||
                            "Billing",
                        )}
                      </td>
                      <td className="truncate px-3 py-3">
                        {money(financeAmount(record))}
                      </td>
                      <td className="truncate px-3 py-3">
                        {formatDashboardDate(financeDate(record))}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`rounded-full px-2 py-1 text-[9px] ${isSettled(financeStatus(record)) ? "bg-emerald-50 text-emerald-700" : /rejected|failed|overdue/i.test(financeStatus(record)) ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}
                        >
                          {prettyLabel(financeStatus(record))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <FinanceDashboardEmpty>
                No billing activity is available yet.
              </FinanceDashboardEmpty>
            )}
          </DashboardSection>
        </>
      ) : null}
    </FinanceDashboardFrame>
  );
}
