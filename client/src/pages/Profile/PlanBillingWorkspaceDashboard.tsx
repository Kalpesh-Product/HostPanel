import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CreditCard,
  FileText,
  Layers,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import ReactApexChart from "react-apexcharts";
import DonutChart from "@/components/graphs/DonutChart";
import PageFrame from "@/components/Pages/PageFrame";
import useAxiosPrivate from "@/hooks/useAxiosPrivate";
import financeDashboardBannerImage from "@/assets/finance-dashboard-banner.webp";
import {
  DashboardBanner,
  DashboardSection,
  DashboardStatTile,
} from "../Administration/AdministrationModuleDashboardShared";

type IncludedModule = {
  id?: string;
  label?: string;
  section?: string;
  source?: string;
};

type Invoice = {
  _id?: string;
  id?: string;
  plan?: string;
  amount?: number | string;
  currency?: string;
  paidAt?: string;
  createdAt?: string;
  status?: string;
  invoiceNumber?: string;
};

const PLAN_LABELS: Record<string, string> = {
  basic: "Basic Plan",
  professional: "Professional Plan",
  custom: "Custom Plan",
};

const SECTION_ORDER = [
  "Common Modules",
  "Extra Common Modules",
  "Key Apps",
  "Core Modules",
  "HR Department",
  "Administration Department",
  "Sales Department",
  "Finance Department",
  "Maintenance Department",
  "Tech Department",
  "IT Department",
];
const sectionOrderIndex = (section: string) => {
  const index = SECTION_ORDER.indexOf(section);
  return index === -1 ? SECTION_ORDER.length : index;
};

const MODULES = [
  {
    title: "Included Modules",
    section: "modules",
    icon: Layers,
    color: "#7C3AED",
    description: "Review every module and add-on your plan includes",
  },
  {
    title: "Payment History",
    section: "payments",
    icon: Receipt,
    color: "#0D9488",
    description: "Inspect invoices, payment status, and plan charges",
  },
] as const;

const planLabel = (value?: string) =>
  PLAN_LABELS[String(value || "basic").toLowerCase()] ||
  String(value || "Basic Plan");

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const titleCase = (value?: string, fallback = "Unspecified") =>
  String(value || fallback)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const invoiceStatus = (value?: string) => titleCase(value || "Paid");

const statusClass = (value?: string) => {
  const key = String(value || "paid").toLowerCase();
  if (key === "paid") return "bg-emerald-50 text-emerald-700";
  if (key === "pending") return "bg-amber-50 text-amber-700";
  if (key === "failed") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
};

const currencyOf = (invoice: Invoice) => invoice.currency || "USD";

const amountOf = (invoice: Invoice) => Number(invoice.amount || 0) || 0;

function PlanBillingModuleCard({
  icon,
  title,
  description,
  footer,
  route,
  color,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  footer: string;
  route: string;
  color: string;
}) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(route)}
      className="group relative flex min-h-[168px] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-5 text-left shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_24px_rgba(37,99,235,0.12)]"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 opacity-80"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}12`, color }}
        >
          {icon}
        </span>
        <ArrowRight
          size={16}
          className="mt-1 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
        />
      </div>
      <p className="mt-4 text-[13px] font-pmedium text-slate-900">{title}</p>
      <p className="mt-1 text-[10px] leading-4 text-slate-500">{description}</p>
      <p
        className="mt-auto pt-4 text-[10px] font-pmedium uppercase tracking-[0.08em]"
        style={{ color }}
      >
        {footer}
      </p>
    </button>
  );
}

export default function PlanBillingWorkspaceDashboard() {
  const axios = useAxiosPrivate();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["planBillingSummary"],
    queryFn: async () => {
      const res = await axios.get("/api/plan-billing/summary");
      return res?.data?.data;
    },
  });

  const planId = String(summary?.selectedPlan || "basic");
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ["planBillingInvoices"],
    queryFn: async () => {
      const res = await axios.get("/api/plan-billing/invoices");
      return res?.data?.invoices || [];
    },
    enabled: Boolean(summary && planId !== "basic"),
  });

  const includedModules = useMemo<IncludedModule[]>(
    () => (Array.isArray(summary?.includedModules) ? summary.includedModules : []),
    [summary],
  );
  const invoices = useMemo<Invoice[]>(
    () => (Array.isArray(invoicesData) ? invoicesData : []),
    [invoicesData],
  );

  const stats = useMemo(() => {
    const planModules = includedModules.filter(
      (module) => String(module.source || "").toLowerCase() === "plan",
    ).length;
    const addOns = includedModules.length - planModules;
    const paidAmount = invoices
      .filter((invoice) => String(invoice.status || "paid").toLowerCase() === "paid")
      .reduce((total, invoice) => total + amountOf(invoice), 0);
    const paidCount = invoices.filter(
      (invoice) => String(invoice.status || "paid").toLowerCase() === "paid",
    ).length;

    return {
      plan: planLabel(planId),
      status: String(summary?.planStatus || "none"),
      isTrialing: Boolean(summary?.isTrialing),
      hasBillingPortal: Boolean(summary?.hasBillingPortal),
      planModules,
      addOns,
      totalModules: includedModules.length,
      invoiceCount: invoices.length,
      paidCount,
      paidAmount,
      startDate: summary?.planStartDate,
      expiryDate: summary?.planExpiryDate,
      lostOnDowngrade: Array.isArray(summary?.modulesLostOnDowngrade)
        ? summary.modulesLostOnDowngrade.length
        : 0,
    };
  }, [includedModules, invoices, planId, summary]);

  const subscriptionStatus = String(summary?.subscriptionStatus || "").toLowerCase();
  const isSubscriptionCancelled = ["canceling", "canceled"].includes(subscriptionStatus);
  const billingPortalLinked = stats.hasBillingPortal && !isSubscriptionCancelled;
  const downgradeModuleList = Array.isArray(summary?.modulesLostOnDowngrade)
    ? summary.modulesLostOnDowngrade.join(", ")
    : "";

  const moduleSectionRows = useMemo(() => {
    const groups = new Map<string, number>();
    includedModules.forEach((module) => {
      const section = String(module.section || "Other").trim() || "Other";
      groups.set(section, (groups.get(section) || 0) + 1);
    });
    return [...groups.entries()].sort(
      (left, right) =>
        sectionOrderIndex(left[0]) - sectionOrderIndex(right[0]) ||
        right[1] - left[1],
    );
  }, [includedModules]);

  const paymentStatusRows = useMemo(() => {
    const groups = new Map<string, number>();
    invoices.forEach((invoice) => {
      const status = invoiceStatus(invoice.status);
      groups.set(status, (groups.get(status) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [invoices]);

  const monthlyPayments = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: date.toLocaleDateString("en-IN", { month: "short" }),
        amount: 0,
      };
    });
    const byMonth = new Map(months.map((month) => [month.key, month]));
    invoices.forEach((invoice) => {
      const value = invoice.paidAt || invoice.createdAt;
      if (!value) return;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const month = byMonth.get(key);
      if (month) month.amount += amountOf(invoice);
    });
    return months;
  }, [invoices]);

  const recentInvoices = useMemo(
    () =>
      [...invoices]
        .sort(
          (left, right) =>
            new Date(right.paidAt || right.createdAt || 0).getTime() -
            new Date(left.paidAt || left.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [invoices],
  );

  const paymentOptions = useMemo(
    () => ({
      chart: {
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "Poppins, sans-serif",
      },
      colors: ["#2563EB"],
      dataLabels: { enabled: false },
      stroke: { curve: "smooth" as const, width: 3 },
      fill: {
        type: "gradient",
        gradient: { opacityFrom: 0.28, opacityTo: 0.04, stops: [0, 95, 100] },
      },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
      xaxis: {
        categories: monthlyPayments.map((month) => month.label),
        labels: { style: { colors: "#64748B", fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          style: { colors: "#64748B", fontSize: "10px" },
          formatter: (value: number) => String(Math.round(value)),
        },
      },
      tooltip: {
        y: { formatter: (value: number) => `${value} ${currencyOf(invoices[0] || {})}` },
      },
    }),
    [invoices, monthlyPayments],
  );

  const isLoading = summaryLoading || (planId !== "basic" && invoicesLoading);

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <DashboardBanner
          title="Plan & Billing"
          description="Review your current plan, the modules it includes, and every payment made for this workspace."
          tags={["Current Plan", "Included Modules", "Add-ons", "Payment History"]}
          image={financeDashboardBannerImage}
          dataTour="plan-billing-banner"
        />

        {isLoading ? (
          <div data-tour="plan-billing-stats" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="h-[112px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div data-tour="plan-billing-stats" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStatTile
              icon={<ShieldCheck size={20} />}
              label="Current Plan"
              value={stats.plan}
              sub={stats.isTrialing ? "Free trial in progress" : "Active subscription"}
              tone="blue"
            />
            <DashboardStatTile
              icon={<BadgeCheck size={20} />}
              label="Plan Status"
              value={titleCase(stats.status)}
              sub={
                isSubscriptionCancelled
                  ? "Payment cancelled — renewal off"
                  : stats.status === "active"
                    ? "Subscription running normally"
                    : stats.status === "expiring_soon"
                      ? "Action needed before expiry"
                      : stats.status === "expired_downgraded"
                        ? "Workspace on Basic plan"
                        : "No paid subscription"
              }
              tone={
                stats.status === "active"
                  ? "green"
                  : stats.status === "expiring_soon"
                    ? "amber"
                    : stats.status === "expired_downgraded"
                      ? "rose"
                      : "slate"
              }
            />
            <DashboardStatTile
              icon={<Layers size={20} />}
              label="Included Modules"
              value={stats.totalModules}
              sub={`${stats.planModules} plan modules, ${stats.addOns} add-ons`}
              tone="violet"
            />
            <DashboardStatTile
              icon={<CreditCard size={20} />}
              label="Payments Made"
              value={stats.paidCount}
              sub={`${stats.invoiceCount} invoices on record`}
              tone="cyan"
            />
            <DashboardStatTile
              icon={<Receipt size={20} />}
              label="Total Paid"
              value={`${currencyOf(invoices[0] || {})} ${stats.paidAmount.toLocaleString("en-IN")}`}
              sub="Across all paid invoices"
              tone="green"
            />
            <DashboardStatTile
              icon={<CalendarClock size={20} />}
              label="Plan Started"
              value={planId === "basic" ? "--" : formatDate(stats.startDate)}
              sub="When the current plan began"
              tone="slate"
            />
            <DashboardStatTile
              icon={<AlertCircle size={20} />}
              label="Plan Expires"
              value={planId === "basic" ? "--" : formatDate(stats.expiryDate)}
              sub={
                isSubscriptionCancelled
                  ? "Will not renew after this date"
                  : stats.lostOnDowngrade
                    ? `${stats.lostOnDowngrade} modules affected on downgrade`
                    : "Next renewal or expiry date"
              }
              tone={stats.status === "expiring_soon" ? "amber" : "blue"}
            />
            <DashboardStatTile
              icon={<FileText size={20} />}
              label="Billing Portal"
              value={billingPortalLinked ? "Available" : "Not linked"}
              sub={
                isSubscriptionCancelled
                  ? "Auto pay cancelled — portal unlinked"
                  : billingPortalLinked
                    ? "Manage card and subscription online"
                    : "Renew from within the workspace"
              }
              tone={billingPortalLinked ? "green" : "slate"}
            />
          </div>
        )}

        {!isLoading && isSubscriptionCancelled ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-[11px] leading-5 text-amber-800">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-[12px] font-pmedium text-amber-900">
                Payment cancelled — auto renewal is off.
              </p>
              <p className="mt-1">
                Your {stats.plan} plan is still active, but it will not renew after expiry on{" "}
                <b>{formatDate(stats.expiryDate)}</b>. Your workspace will then move to the Basic plan
                {downgradeModuleList ? (
                  <>
                    {" "}and lose access to All <b> Professional Plan Modules</b>.
                  </>
                ) : (
                  "."
                )}
              </p>
            </div>
          </div>
        ) : null}

        <div data-tour="plan-billing-modules" className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">
            Plan &amp; billing modules
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Open the exact billing workspace required for the current task.
          </p>
          <div className="mt-3 grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            {MODULES.map((module) => {
              const Icon = module.icon;
              const footer =
                module.section === "modules"
                  ? `${stats.totalModules} modules · ${stats.addOns} add-ons`
                  : `${stats.invoiceCount} invoices · ${stats.paidCount} paid`;
              return (
                <PlanBillingModuleCard
                  key={module.section}
                  icon={<Icon size={20} />}
                  title={module.title}
                  route={`/plan-billing/${module.section}`}
                  description={module.description}
                  color={module.color}
                  footer={footer}
                />
              );
            })}
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DashboardSection
                title="Modules by section"
                dataTour="plan-billing-section-mix"
                subtitle="How the included modules and add-ons are distributed."
              >
                {moduleSectionRows.length ? (
                  <DonutChart
                    centerLabel="Modules"
                    labels={moduleSectionRows.map(([name]) => name)}
                    series={moduleSectionRows.map(([, value]) => value)}
                    colors={[
                      "#2563EB",
                      "#0D9488",
                      "#7C3AED",
                      "#EA580C",
                      "#F59E0B",
                      "#0891B2",
                      "#10B981",
                    ]}
                    tooltipValue={moduleSectionRows.map(
                      ([, value]) => `${value} modules`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No modules are included in this plan yet.
                  </div>
                )}
              </DashboardSection>
              <DashboardSection
                title="Payment status mix"
                dataTour="plan-billing-payment-mix"
                subtitle="Current split of paid, pending, and failed invoices."
              >
                {paymentStatusRows.length ? (
                  <DonutChart
                    centerLabel="Invoices"
                    labels={paymentStatusRows.map(([name]) => name)}
                    series={paymentStatusRows.map(([, value]) => value)}
                    colors={["#10B981", "#F59E0B", "#EF4444", "#94A3B8"]}
                    tooltipValue={paymentStatusRows.map(
                      ([, value]) => `${value} invoices`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No payment history recorded yet.
                  </div>
                )}
              </DashboardSection>
            </div>

            {invoices.length ? (
              <div className="mb-4">
                <DashboardSection
                  title="Six-month payment trend"
                  dataTour="plan-billing-trend"
                  subtitle="Amount paid each month across all recorded invoices."
                >
                  <ReactApexChart
                    type="area"
                    height={300}
                    options={paymentOptions}
                    series={[{ name: "Paid", data: monthlyPayments.map((month) => month.amount) }]}
                  />
                </DashboardSection>
              </div>
            ) : null}

            <DashboardSection
                                title="Recent payments"
                  dataTour="plan-billing-recent"
              subtitle="Latest invoices and plan charges for this workspace."
              bodyClassName="max-h-[430px] overflow-y-auto p-0"
            >
              {recentInvoices.length ? (
                <table className="w-full table-fixed border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="w-[22%] px-5 py-3">Plan</th>
                      <th className="w-[22%] px-3 py-3">Invoice</th>
                      <th className="w-[18%] px-3 py-3">Amount</th>
                      <th className="w-[18%] px-3 py-3">Paid on</th>
                      <th className="w-[20%] px-3 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentInvoices.map((invoice, index) => (
                      <tr
                        key={invoice._id || invoice.id || `${invoice.plan}-${invoice.paidAt}` || index}
                        className="bg-white text-[11px] text-slate-600"
                      >
                        <td className="px-5 py-3 font-pmedium text-slate-900">
                          {planLabel(invoice.plan)}
                        </td>
                        <td className="truncate px-3 py-3">
                          {invoice.invoiceNumber || "—"}
                        </td>
                        <td className="truncate px-3 py-3">
                          {currencyOf(invoice)} {amountOf(invoice).toLocaleString("en-IN")}
                        </td>
                        <td className="truncate px-3 py-3">
                          {formatDate(invoice.paidAt || invoice.createdAt)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`rounded-full px-2 py-1 text-[9px] ${statusClass(invoice.status)}`}
                          >
                            {invoiceStatus(invoice.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex h-[300px] items-center justify-center px-6 text-center text-[11px] text-slate-500">
                  {planId === "basic"
                    ? "Basic plan has no payment history."
                    : "No payment history recorded yet."}
                </div>
              )}
            </DashboardSection>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
