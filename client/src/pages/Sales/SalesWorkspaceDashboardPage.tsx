import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CircleGauge,
  Layers3,
  Magnet,
  IndianRupee,
  PackageCheck,
  ReceiptIndianRupee,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import PageFrame from "../../components/Pages/PageFrame";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import salesBannerImage from "../../assets/sales-dashboard-banner.webp";
import useDashboardAccess from "../../hooks/useDashboardAccess";
import { getCafeTables } from "../../services/cafe";
import { getPricingPackages } from "../../services/pricing-packages";
import { getResources } from "../../services/resources";
import { getWebsiteLeads } from "../../services/sales-leads";
import { getTenantCompanies } from "../../services/tenant-companies";
import { getVirtualOffices } from "../../services/virtual-offices";
import {
  getFinanceIncomeLedger,
  getFinanceRevenueEntries,
  getTenantBillingSnapshot,
  getTenantRentRecords,
  getVirtualOfficeRentRecords,
} from "../../services/finance";
import {
  SALES_DASHBOARD_MODULES,
  type SalesDashboardModule,
} from "./salesDashboardModules";
import { DepartmentVisitorsCard } from "../Dashboard/FrontendDashboard/dashboard/DepartmentVisitorsCard";
import { TeamLiveStatusCard } from "../Dashboard/FrontendDashboard/dashboard/TeamLiveStatusCard";

type LeadRecord = {
  id?: string;
  _id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  status?: string;
  createdAt?: string;
  leadSource?: string;
  source?: string;
  category?: string;
};

type TenantRecord = {
  id?: string;
  _id?: string;
  recordId?: string;
  companyName?: string;
  name?: string;
  companyCode?: string;
  sector?: string;
  customerDetails?: { sector?: string };
  status?: string;
  createdAt?: string;
};

type PackageRecord = { status?: string; price?: number; monthlyRent?: number };
type ResourceRecord = {
  resourceCategory?: string;
  status?: string;
};
type CafeTableRecord = { isActive?: boolean };
type FinanceRecord = Record<string, any>;

type DashboardData = {
  leads: LeadRecord[];
  tenants: TenantRecord[];
  packages: PackageRecord[];
  resources: ResourceRecord[];
  cafeTables: CafeTableRecord[];
  virtualOffices: unknown[];
  tenantBills: FinanceRecord[];
  rentRecords: FinanceRecord[];
  virtualOfficeRentRecords: FinanceRecord[];
  incomeEntries: FinanceRecord[];
  revenueEntries: FinanceRecord[];
};

const EMPTY_DATA: DashboardData = {
  leads: [],
  tenants: [],
  packages: [],
  resources: [],
  cafeTables: [],
  virtualOffices: [],
  tenantBills: [],
  rentRecords: [],
  virtualOfficeRentRecords: [],
  incomeEntries: [],
  revenueEntries: [],
};

const DONUT_PALETTE = [
  "#1E3D73",
  "#2563EB",
  "#3B82F6",
  "#60A5FA",
  "#93C5FD",
  "#64748B",
];

const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();

const numeric = (value: unknown) =>
  Number(String(value ?? "0").replace(/,/g, "")) || 0;

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: Math.abs(value) >= 100000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 100000 ? 1 : 0,
  }).format(value || 0);

const listFrom = (payload: any, keys: string[] = []) => {
  const candidates = [payload?.data?.data, payload?.data, payload];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    for (const key of keys) {
      if (Array.isArray(candidate?.[key])) return candidate[key];
    }
  }
  return [];
};

const readableLabel = (value?: string) =>
  String(value || "Pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const dateLabel = (value?: string) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[320px] items-center justify-center px-6 text-center text-[11px] text-[#7B89A6]">
      {children}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  action,
  bodyClassName = "p-5",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {action ?? null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

function RecordCountChip({ count }: { count: number }) {
  return (
    <span className="shrink-0 rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-pmedium text-blue-700">
      {count} records
    </span>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  status = "default",
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  status?: "default" | "success" | "attention";
}) {
  const statuses = {
    default: "border-l-blue-600 bg-blue-50 text-blue-700",
    success: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
    attention: "border-l-amber-500 bg-amber-50 text-amber-700",
  };

  return (
    <div className="flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:border-l-blue-600 hover:shadow-md">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${statuses[status]}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-[22px] font-pmedium leading-none text-slate-900">
          {value}
        </p>
        {sub ? (
          <p className="mt-2 truncate text-[10px] text-slate-500">{sub}</p>
        ) : null}
      </div>
    </div>
  );
}

function FinanceSummaryCard({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: ReactNode;
  rows: Array<{ label: string; value: string | number; tone?: string }>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          {icon}
        </span>
        <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
          {title}
        </h2>
      </div>
      <div className="divide-y divide-slate-100 px-5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 py-3.5"
          >
            <span className="text-[10px] font-pmedium text-slate-500">
              {row.label}
            </span>
            <span
              className={`text-right text-[13px] font-pmedium ${row.tone || "text-slate-900"}`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const leadName = (lead: LeadRecord) =>
  lead.name || lead.fullName || "Unnamed lead";

const tenantName = (tenant: TenantRecord) =>
  tenant.companyName || tenant.name || "Unnamed tenant";

const statusTone = (status?: string) => {
  const value = normalize(status);
  if (value.includes("convert") || value.includes("won") || value === "active")
    return "bg-emerald-50 text-emerald-700";
  if (
    value.includes("lost") ||
    value.includes("reject") ||
    value.includes("closed")
  )
    return "bg-rose-50 text-rose-700";
  if (value.includes("contact") || value.includes("progress"))
    return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
};

export default function SalesWorkspaceDashboardPage() {
  const access = useDashboardAccess();
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError("");

    Promise.allSettled([
      getWebsiteLeads(),
      getTenantCompanies(),
      getPricingPackages(),
      getResources(),
      getCafeTables(),
      getVirtualOffices({ page: 1, limit: 200 }),
      getTenantBillingSnapshot(),
      getTenantRentRecords(),
      getVirtualOfficeRentRecords(),
      getFinanceIncomeLedger(),
      getFinanceRevenueEntries(),
    ]).then((results) => {
      if (cancelled) return;
      const [
        leads,
        tenants,
        packages,
        resources,
        cafeTables,
        virtualOffices,
        tenantBills,
        rentRecords,
        virtualOfficeRentRecords,
        incomeEntries,
        revenueEntries,
      ] = results;

      setData({
        leads:
          leads.status === "fulfilled" ? listFrom(leads.value, ["leads"]) : [],
        tenants:
          tenants.status === "fulfilled"
            ? listFrom(tenants.value, ["tenants"])
            : [],
        packages:
          packages.status === "fulfilled"
            ? listFrom(packages.value, ["packages"])
            : [],
        resources:
          resources.status === "fulfilled"
            ? listFrom(resources.value, ["resources"])
            : [],
        cafeTables:
          cafeTables.status === "fulfilled"
            ? listFrom(cafeTables.value, ["tables"])
            : [],
        virtualOffices:
          virtualOffices.status === "fulfilled"
            ? listFrom(virtualOffices.value, ["records", "virtualOffices"])
            : [],
        tenantBills:
          tenantBills.status === "fulfilled"
            ? listFrom(tenantBills.value, ["tenantBills", "records"])
            : [],
        rentRecords:
          rentRecords.status === "fulfilled"
            ? listFrom(rentRecords.value, ["records"])
            : [],
        virtualOfficeRentRecords:
          virtualOfficeRentRecords.status === "fulfilled"
            ? listFrom(virtualOfficeRentRecords.value, ["records"])
            : [],
        incomeEntries:
          incomeEntries.status === "fulfilled"
            ? listFrom(incomeEntries.value, ["entries", "records"])
            : [],
        revenueEntries:
          revenueEntries.status === "fulfilled"
            ? listFrom(revenueEntries.value, ["records", "entries"])
            : [],
      });

      const failures = results.filter((result) => result.status === "rejected");
      setLoadError(
        failures.length
          ? "Some pipeline, tenant, pricing, or inventory data could not be refreshed."
          : "",
      );
      setLastUpdated(new Date());
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const enabledModules = useMemo(
    () =>
      SALES_DASHBOARD_MODULES.filter((module) => access.hasModule(module.id)),
    [access],
  );

  const stats = useMemo(() => {
    const activeTenants = data.tenants.filter(
      (tenant) => normalize(tenant.status) === "active",
    ).length;
    const activePackages = data.packages.filter(
      (item) => normalize(item.status) === "active",
    ).length;
    const activeResources = data.resources.filter(
      (resource) =>
        !["disabled", "inactive", "under maintenance"].includes(
          normalize(resource.status),
        ),
    ).length;
    const newLeads = data.leads.filter((lead) =>
      ["", "new", "pending"].includes(normalize(lead.status)),
    ).length;
    const convertedLeads = data.leads.filter((lead) => {
      const status = normalize(lead.status);
      return status.includes("convert") || status.includes("won");
    }).length;

    return {
      activeTenants,
      activePackages,
      activeResources,
      newLeads,
      convertedLeads,
      conversionRate: data.leads.length
        ? Math.round((convertedLeads / data.leads.length) * 100)
        : 0,
      portfolioRecords: data.resources.length + data.cafeTables.length,
    };
  }, [data]);

  const finance = useMemo(() => {
    const receivedManualRevenue = data.revenueEntries.filter((entry) => {
      const status = normalize(entry.status || entry.paymentStatus);
      return ["received", "paid", "confirmed", "completed"].some((value) =>
        status.includes(value),
      );
    });
    const revenueRows = data.incomeEntries.length
      ? data.incomeEntries.filter(
          (entry) =>
            !["pending", "reversed", "cancelled"].includes(
              normalize(entry.status),
            ),
        )
      : receivedManualRevenue;

    const amountOf = (entry: FinanceRecord) =>
      numeric(entry.amount ?? entry.totalAmount ?? entry.paidAmount);
    const dateOf = (entry: FinanceRecord) =>
      entry.postedAt ||
      entry.revenueDate ||
      entry.paidAt ||
      entry.date ||
      entry.createdAt;
    const sourceOf = (entry: FinanceRecord) => {
      const source = normalize(entry.source || entry.type || entry.category);
      if (source.includes("virtual")) return "Virtual office";
      if (source.includes("workation")) return "Workation";
      if (source.includes("alternate")) return "Alternate revenue";
      if (source.includes("meeting")) return "Meeting rooms";
      if (source.includes("cafe")) return "Cafe";
      return "Tenant rent";
    };

    const now = new Date();
    const fiscalStartYear =
      now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fiscalStart = new Date(fiscalStartYear, 3, 1);
    const fiscalMonthsElapsed =
      (now.getFullYear() - fiscalStartYear) * 12 + now.getMonth() - 3 + 1;
    const currentFiscalRevenue = revenueRows.reduce((sum, entry) => {
      const date = new Date(String(dateOf(entry) || ""));
      return !Number.isNaN(date.getTime()) && date >= fiscalStart
        ? sum + amountOf(entry)
        : sum;
    }, 0);

    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthRevenue = revenueRows.reduce((sum, entry) => {
      const date = new Date(String(dateOf(entry) || ""));
      return !Number.isNaN(date.getTime()) &&
        date.getFullYear() === previousMonth.getFullYear() &&
        date.getMonth() === previousMonth.getMonth()
        ? sum + amountOf(entry)
        : sum;
    }, 0);

    const monthlyRevenue = new Array(12).fill(0);
    revenueRows.forEach((entry) => {
      const date = new Date(String(dateOf(entry) || ""));
      if (Number.isNaN(date.getTime())) return;
      const difference =
        (now.getFullYear() - date.getFullYear()) * 12 +
        now.getMonth() -
        date.getMonth();
      const index = 11 - difference;
      if (index >= 0 && index < 12) monthlyRevenue[index] += amountOf(entry);
    });

    const sourceMap = new Map<string, number>();
    revenueRows.forEach((entry) => {
      const label = sourceOf(entry);
      sourceMap.set(label, (sourceMap.get(label) || 0) + amountOf(entry));
    });
    const revenueSources = [...sourceMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .filter((item) => item.value > 0)
      .sort((left, right) => right.value - left.value);

    const recurringRent =
      data.tenantBills.reduce(
        (sum, bill) => sum + numeric(bill.monthlyRent ?? bill.amount),
        0,
      ) +
      data.virtualOfficeRentRecords.reduce(
        (sum, record) => sum + numeric(record.monthlyRent),
        0,
      );

    const openTenantRent = data.rentRecords.filter((record) => {
      const status = normalize(record.status || record.displayStatus);
      return !["paid", "completed", "verified"].some((value) =>
        status.includes(value),
      );
    });
    const openVirtualRent = data.virtualOfficeRentRecords.filter((record) => {
      const status = normalize(
        record.currentPeriod?.status || record.rentStatus,
      );
      return !["paid", "completed", "verified"].some((value) =>
        status.includes(value),
      );
    });
    const outstandingReceivables =
      openTenantRent.reduce(
        (sum, record) =>
          sum + numeric(record.remaining ?? record.amount ?? record.dueAmount),
        0,
      ) +
      openVirtualRent.reduce(
        (sum, record) =>
          sum +
          numeric(
            record.currentPeriod?.dueAmount ??
              record.dueAmount ??
              record.monthlyRent,
          ),
        0,
      );

    const rentCycles =
      data.rentRecords.length + data.virtualOfficeRentRecords.length;
    const paidCycles =
      data.rentRecords.length -
      openTenantRent.length +
      data.virtualOfficeRentRecords.length -
      openVirtualRent.length;
    const collectionRate = rentCycles
      ? Math.round((paidCycles / rentCycles) * 100)
      : 0;

    const pendingDeposits = data.tenantBills.filter(
      (bill) => normalize(bill.securityDepositPaidStatus) !== "paid",
    );
    const pendingDepositAmount = pendingDeposits.reduce(
      (sum, bill) => sum + numeric(bill.securityDepositAmount),
      0,
    );
    const packagePrices = data.packages
      .map((item) => numeric(item.price ?? item.monthlyRent))
      .filter((value) => value > 0);

    return {
      fiscalYear: `FY ${fiscalStartYear}-${String(fiscalStartYear + 1).slice(-2)}`,
      currentFiscalRevenue,
      previousMonthRevenue,
      monthlyRevenue,
      revenueSources,
      recurringRent,
      outstandingReceivables,
      collectionRate,
      paidCycles,
      rentCycles,
      pendingDeposits: pendingDeposits.length,
      pendingDepositAmount,
      averageMonthlyRevenue:
        currentFiscalRevenue / Math.max(1, fiscalMonthsElapsed),
      revenuePerTenant: currentFiscalRevenue / Math.max(1, stats.activeTenants),
      averagePackagePrice: packagePrices.length
        ? packagePrices.reduce((sum, value) => sum + value, 0) /
          packagePrices.length
        : 0,
      pendingManualRevenue: data.revenueEntries.filter((entry) =>
        ["", "pending", "submitted"].includes(
          normalize(entry.status || entry.paymentStatus),
        ),
      ).length,
    };
  }, [data, stats.activeTenants]);

  const leadSources = useMemo(() => {
    const map = new Map<string, number>();
    data.leads.forEach((lead) => {
      const raw =
        lead.leadSource || lead.source || lead.category || "Unspecified";
      const label = readableLabel(raw);
      map.set(label, (map.get(label) || 0) + 1);
    });
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);
  }, [data.leads]);

  const tenantSectors = useMemo(() => {
    const map = new Map<string, number>();
    data.tenants.forEach((tenant) => {
      const label = tenant.sector || tenant.customerDetails?.sector || "Other";
      map.set(label, (map.get(label) || 0) + 1);
    });
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);
  }, [data.tenants]);

  const leadStatus = useMemo(() => {
    const buckets = { New: 0, Contacted: 0, Converted: 0, Closed: 0 };
    data.leads.forEach((lead) => {
      const status = normalize(lead.status);
      if (status.includes("contact") || status.includes("progress"))
        buckets.Contacted += 1;
      else if (status.includes("convert") || status.includes("won"))
        buckets.Converted += 1;
      else if (
        status.includes("closed") ||
        status.includes("reject") ||
        status.includes("lost")
      )
        buckets.Closed += 1;
      else buckets.New += 1;
    });
    return Object.entries(buckets).filter(([, value]) => value > 0);
  }, [data.leads]);

  const resourcePortfolio = useMemo(() => {
    const categoryCount = (...categories: string[]) =>
      data.resources.filter((resource) =>
        categories.includes(normalize(resource.resourceCategory)),
      ).length;
    return [
      {
        label: "Coworking",
        value: categoryCount("open_desk", "cabin_desk", "virtual_office"),
      },
      {
        label: "Meeting rooms",
        value: categoryCount("meeting_room", "conference_room"),
      },
      { label: "Cafe tables", value: data.cafeTables.length },
      { label: "Hostel dorms", value: categoryCount("dorm") },
      { label: "Co-living rooms", value: categoryCount("room") },
    ].filter((item) => item.value > 0);
  }, [data.cafeTables.length, data.resources]);

  const monthLabels = useMemo(() => {
    const anchor = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(
        anchor.getFullYear(),
        anchor.getMonth() - (11 - index),
        1,
      );
      return date.toLocaleDateString("en-US", { month: "short" });
    });
  }, []);

  const monthlyLeads = useMemo(() => {
    const anchor = new Date();
    const counts = new Array(12).fill(0);
    data.leads.forEach((lead) => {
      const created = new Date(String(lead.createdAt || ""));
      if (Number.isNaN(created.getTime())) return;
      const difference =
        (anchor.getFullYear() - created.getFullYear()) * 12 +
        anchor.getMonth() -
        created.getMonth();
      const index = 11 - difference;
      if (index >= 0 && index < 12) counts[index] += 1;
    });
    return counts;
  }, [data.leads]);

  const recentLeads = useMemo(
    () =>
      [...data.leads]
        .sort(
          (left, right) =>
            new Date(right.createdAt || 0).getTime() -
            new Date(left.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [data.leads],
  );

  const attentionTenants = useMemo(
    () =>
      data.tenants
        .filter((tenant) => normalize(tenant.status) !== "active")
        .sort(
          (left, right) =>
            new Date(right.createdAt || 0).getTime() -
            new Date(left.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [data.tenants],
  );

  const moduleMetric = (module: SalesDashboardModule) => {
    if (module.id === "leads-management") return data.leads.length;
    if (module.id === "resource-pricing") return data.packages.length;
    if (module.id === "cafe-management") return data.cafeTables.length;
    if (module.id === "virtual-office-sales") return data.virtualOffices.length;
    if (module.id === "sales-architecture") return stats.portfolioRecords;
    return data.resources.length;
  };

  const chartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "44%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: monthLabels },
    colors: ["#2563EB"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  const revenueChartOptions = {
    ...chartOptions,
    colors: ["#1E3D73"],
    yaxis: {
      labels: {
        formatter: (value: number) => currency(value),
      },
    },
    tooltip: {
      theme: "light",
      y: { formatter: (value: number) => currency(value) },
    },
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={salesBannerImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 h-full w-full object-cover object-center sm:w-[64%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 w-full overflow-hidden bg-gradient-to-br from-[#2563EB]/55 via-[#3b82f6]/35 to-[#60a5fa]/20 sm:w-[64%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            >
              <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-full bg-white/90 sm:w-[66%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
                maskImage:
                  "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
              }}
            />
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[58%]">
              <h1 className="text-[30px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[38px]">
                <span className="text-primary">Sales</span>{" "}
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
                Live lead pipeline, tenant conversion, pricing, and vertical
                inventory visibility across the complete sales workspace.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Leads", "Tenants", "Pricing", "Verticals"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="absolute right-6 top-5 z-10 rounded-lg border border-white/25 bg-white/15 px-3 py-2 backdrop-blur-sm">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">
                Active modules
              </p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">
                {enabledModules.length}
              </p>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-pmedium text-amber-800">
            <AlertTriangle size={16} />
            {loadError} Existing dashboard values may be incomplete.
          </div>
        ) : null}

        {isLoading || access.isLoading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, key) => (
              <div
                key={key}
                className="h-[112px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={<Magnet size={20} />}
              label="Total leads"
              value={data.leads.length}
              sub={`${stats.newLeads} awaiting first action`}
            />
            <StatTile
              icon={<Target size={20} />}
              label="Lead conversion"
              value={`${stats.conversionRate}%`}
              sub={`${stats.convertedLeads} leads converted`}
              status={stats.convertedLeads ? "success" : "default"}
            />
            <StatTile
              icon={<Building2 size={20} />}
              label="Active tenants"
              value={stats.activeTenants}
              sub={`${data.tenants.length} total tenant companies`}
            />
            <StatTile
              icon={<PackageCheck size={20} />}
              label="Active pricing"
              value={stats.activePackages}
              sub={`${data.packages.length} total pricing packages`}
            />
            <StatTile
              icon={<Layers3 size={20} />}
              label="Vertical inventory"
              value={stats.portfolioRecords}
              sub="Resources and cafe tables mapped"
            />
            <StatTile
              icon={<CheckCircle2 size={20} />}
              label="Active resources"
              value={stats.activeResources}
              sub={`${data.resources.length} resources in the sales portfolio`}
              status="success"
            />
            <StatTile
              icon={<CircleGauge size={20} />}
              label="Virtual offices"
              value={data.virtualOffices.length}
              sub="Saved virtual-office records"
            />
            <StatTile
              icon={<Users size={20} />}
              label="Tenant attention"
              value={Math.max(0, data.tenants.length - stats.activeTenants)}
              sub="Tenant records not currently active"
              status={
                data.tenants.length - stats.activeTenants > 0
                  ? "attention"
                  : "success"
              }
            />
          </div>
        )}

        {!isLoading ? (
          <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TeamLiveStatusCard
              department="sales"
              viewAllRoute="/common-modules/attendance"
            />
            <DepartmentVisitorsCard department="sales" title="Sales Visitors" />
          </section>
        ) : null}

        {!isLoading && !access.isLoading ? (
          <div className="mb-6">
            <div className="mb-3">
              <p className="text-sm font-pmedium text-slate-900">
                Sales finance overview
              </p>
              <p className="mt-1 text-[10px] font-pmedium text-slate-500">
                Collected revenue, recurring rent, receivables, and sales
                averages from Finance records.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <FinanceSummaryCard
                title="Revenue"
                icon={<IndianRupee size={18} />}
                rows={[
                  {
                    label: finance.fiscalYear,
                    value: currency(finance.currentFiscalRevenue),
                  },
                  {
                    label: "Previous month",
                    value: currency(finance.previousMonthRevenue),
                  },
                  {
                    label: "Recurring monthly rent",
                    value: currency(finance.recurringRent),
                  },
                  {
                    label: "Pending revenue",
                    value: finance.pendingManualRevenue,
                    tone: finance.pendingManualRevenue
                      ? "text-amber-700"
                      : "text-emerald-700",
                  },
                ]}
              />
              <FinanceSummaryCard
                title="Key stats"
                icon={<ReceiptIndianRupee size={18} />}
                rows={[
                  {
                    label: "Outstanding receivables",
                    value: currency(finance.outstandingReceivables),
                    tone: finance.outstandingReceivables
                      ? "text-amber-700"
                      : "text-emerald-700",
                  },
                  {
                    label: "Collection rate",
                    value: `${finance.collectionRate}%`,
                  },
                  {
                    label: "Paid rent cycles",
                    value: `${finance.paidCycles} / ${finance.rentCycles}`,
                  },
                  {
                    label: "Pending deposits",
                    value: `${currency(finance.pendingDepositAmount)}`,
                    tone: finance.pendingDeposits
                      ? "text-amber-700"
                      : "text-emerald-700",
                  },
                ]}
              />
              <FinanceSummaryCard
                title="Average"
                icon={<TrendingUp size={18} />}
                rows={[
                  {
                    label: "Monthly revenue",
                    value: currency(finance.averageMonthlyRevenue),
                  },
                  {
                    label: "Revenue / active tenant",
                    value: currency(finance.revenuePerTenant),
                  },
                  {
                    label: "Published package price",
                    value: currency(finance.averagePackagePrice),
                  },
                  {
                    label: "Lead conversion",
                    value: `${stats.conversionRate}%`,
                  },
                ]}
              />
            </div>
          </div>
        ) : null}

        <div className="mb-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-pmedium text-slate-900">
                Manage sales operations
              </p>
              <p className="mt-1 text-[10px] font-pmedium text-slate-500">
                Open the same enabled modules available in the Sales Dashboard
                dropdown.
                {/* {lastUpdated ? ` Last refreshed ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.` : ""} */}
              </p>
            </div>
            {/* <button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-600 transition hover:border-blue-200 hover:text-blue-700">
              <RefreshCw size={13} /> Refresh
            </button> */}
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {enabledModules.map((module) => {
              const Icon = module.icon;
              return (
                <DashboardModuleCard
                  key={module.id}
                  icon={<Icon size={19} />}
                  title={module.label}
                  route={module.route}
                  description={module.description}
                  color={module.color}
                  state={{ fromSection: "sales-department" }}
                />
              );
            })}
          </div>
        </div>

        {!isLoading && !access.isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <ChartCard
                title="Sales Revenue Trend"
                subtitle="Collected revenue posted during the last 12 calendar months."
              >
                <GroupedBarGraph
                  options={revenueChartOptions}
                  series={[
                    { name: "Collected revenue", data: finance.monthlyRevenue },
                  ]}
                />
              </ChartCard>
              <ChartCard
                title="Revenue Sources"
                subtitle="Collected revenue grouped by sales service."
              >
                {finance.revenueSources.length ? (
                  <DonutChart
                    centerLabel="Revenue"
                    labels={finance.revenueSources.map((item) => item.label)}
                    series={finance.revenueSources.map((item) => item.value)}
                    colors={DONUT_PALETTE.slice(
                      0,
                      finance.revenueSources.length,
                    )}
                    tooltipValue={finance.revenueSources.map((item) =>
                      currency(item.value),
                    )}
                    isMonetary
                    wrapLabels
                  />
                ) : (
                  <Empty>No collected sales revenue is available yet.</Empty>
                )}
              </ChartCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <ChartCard
                title="Monthly Lead Trend"
                subtitle="Website leads created during the last 12 calendar months."
              >
                <GroupedBarGraph
                  options={chartOptions}
                  series={[{ name: "Website leads", data: monthlyLeads }]}
                />
              </ChartCard>
              <ChartCard
                title="Lead Pipeline"
                subtitle="Current lead distribution by sales stage."
              >
                {leadStatus.length ? (
                  <DonutChart
                    centerLabel="Leads"
                    labels={leadStatus.map(([label]) => label)}
                    series={leadStatus.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, leadStatus.length)}
                    tooltipValue={leadStatus.map(
                      ([, value]) => `${value} leads`,
                    )}
                  />
                ) : (
                  <Empty>No lead pipeline data is available yet.</Empty>
                )}
              </ChartCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard
                title="Sourcing Channels"
                subtitle="Website leads grouped by their recorded acquisition source."
              >
                {leadSources.length ? (
                  <DonutChart
                    centerLabel="Leads"
                    labels={leadSources.map((item) => item.label)}
                    series={leadSources.map((item) => item.value)}
                    colors={DONUT_PALETTE.slice(0, leadSources.length)}
                    tooltipValue={leadSources.map(
                      (item) => `${item.value} leads`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No lead-source data is available yet.</Empty>
                )}
              </ChartCard>
              <ChartCard
                title="Tenant Sectors"
                subtitle="Tenant companies grouped by their recorded business sector."
              >
                {tenantSectors.length ? (
                  <DonutChart
                    centerLabel="Tenants"
                    labels={tenantSectors.map((item) => item.label)}
                    series={tenantSectors.map((item) => item.value)}
                    colors={DONUT_PALETTE.slice(0, tenantSectors.length)}
                    tooltipValue={tenantSectors.map(
                      (item) => `${item.value} tenants`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No tenant-sector data is available yet.</Empty>
                )}
              </ChartCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard
                title="Inventory by Vertical"
                subtitle="Saved resources and cafe tables grouped by operating vertical."
              >
                {resourcePortfolio.length ? (
                  <DonutChart
                    centerLabel="Records"
                    labels={resourcePortfolio.map((item) => item.label)}
                    series={resourcePortfolio.map((item) => item.value)}
                    colors={DONUT_PALETTE.slice(0, resourcePortfolio.length)}
                    tooltipValue={resourcePortfolio.map(
                      (item) => `${item.value} records`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No vertical inventory is available yet.</Empty>
                )}
              </ChartCard>
              <ChartCard title="Module Snapshot">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {enabledModules.map((module, index) => {
                    const Icon = module.icon;
                    return (
                      <div
                        key={module.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                            style={{
                              backgroundColor:
                                DONUT_PALETTE[index % DONUT_PALETTE.length],
                            }}
                          >
                            <Icon size={14} />
                          </span>
                          <span className="truncate text-[11px] font-pmedium text-slate-600">
                            {module.label}
                          </span>
                        </div>
                        <span className="ml-3 text-[13px] font-pmedium text-slate-900">
                          {moduleMetric(module)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <ChartCard
                title="Recent Leads"
                subtitle="The latest sales enquiries with contact and pipeline status."
                action={<RecordCountChip count={data.leads.length} />}
                bodyClassName=""
              >
                {recentLeads.length ? (
                  <div className="min-h-[240px] max-h-[360px] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="w-[28%] px-5 py-3">Lead</th>
                          <th className="w-[32%] px-4 py-3">Contact</th>
                          <th className="w-[20%] px-4 py-3">Created</th>
                          <th className="w-[20%] px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentLeads.map((lead, index) => (
                          <tr
                            key={
                              lead.id ||
                              lead._id ||
                              `${leadName(lead)}-${index}`
                            }
                            className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                          >
                            <td className="truncate px-5 py-3 text-slate-900">
                              {leadName(lead)}
                            </td>
                            <td className="truncate px-4 py-3">
                              {lead.email || lead.phone || "Not recorded"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {dateLabel(lead.createdAt)}
                            </td>
                            <td className="truncate px-5 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${statusTone(lead.status)}`}
                              >
                                {readableLabel(lead.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                    No sales leads are available yet.
                  </div>
                )}
              </ChartCard>

              <ChartCard
                title="Tenants Needing Attention"
                subtitle="Tenant companies not currently marked active."
                action={<RecordCountChip count={attentionTenants.length} />}
                bodyClassName=""
              >
                {attentionTenants.length ? (
                  <div className="min-h-[240px] max-h-[360px] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="w-[28%] px-5 py-3">Tenant company</th>
                          <th className="w-[17%] px-4 py-3">Company code</th>
                          <th className="w-[18%] px-4 py-3">Sector</th>
                          <th className="w-[17%] px-4 py-3">Created</th>
                          <th className="w-[20%] px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attentionTenants.map((tenant, index) => (
                          <tr
                            key={
                              tenant.recordId ||
                              tenant.id ||
                              tenant._id ||
                              `${tenantName(tenant)}-${index}`
                            }
                            className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                          >
                            <td className="truncate px-5 py-3 text-slate-900">
                              {tenantName(tenant)}
                            </td>
                            <td className="truncate px-4 py-3">
                              {tenant.companyCode || "Not recorded"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {tenant.sector || "Not recorded"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {dateLabel(tenant.createdAt)}
                            </td>
                            <td className="truncate px-5 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${statusTone(tenant.status)}`}
                              >
                                {readableLabel(tenant.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                    No tenant companies currently need attention.
                  </div>
                )}
              </ChartCard>
            </div>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
