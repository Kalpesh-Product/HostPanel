import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import ReactApexChart from "react-apexcharts";
import {
  Store,
  Building2,
  Tag,
  ShoppingCart,
  LayoutGrid,
  CircleGauge,
  MapPinned,
  AlertTriangle,
  ArrowRight,
  IndianRupee,
  CalendarClock,
  PackageCheck,
  Users,
  ShieldCheck,
} from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import coworkingBannerImage from "../../assets/coworking-banner.jpg";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import { getResources } from "../../services/resources";
import { getAllTenantCompanies } from "../../services/tenant-companies";
import { getPricingPackages } from "../../services/pricing-packages";

type SeatSummary = { total: number; assigned: number; vacant: number } | null;

type ResourceRecord = {
  recordId?: string;
  name?: string;
  resourceCategory: string;
  status: string;
  capacity: number;
  floor: string;
  wing?: string;
  location?: string;
  seatSummary: SeatSummary;
  assignedTenantCompanyName: string;
  assignedVirtualOfficeNames: string[];
};

type TenantRecord = {
  _id?: string;
  recordId?: string;
  companyName?: string;
  status?: string;
  contractStart?: string;
  contractDurationMonths?: number;
  customerDetails?: { clientName?: string; sector?: string };
  companyDetails?: {
    floor?: string;
    openDesks?: number;
    cabinDesks?: number;
    ratePerOpenDesk?: number;
    ratePerCabinDesk?: number;
  };
  agreementDetails?: { startDate?: string; endDate?: string };
  billingDetails?: {
    monthlyRent?: number;
    securityDepositAmount?: number;
    securityDepositPaidStatus?: string;
  };
};

type PackageRecord = {
  _id?: string;
  recordId?: string;
  packageCode?: string;
  name?: string;
  status?: string;
  category?: string;
  price?: number;
  durationMonths?: number;
  ratePerOpenDesk?: number;
  ratePerCabinDesk?: number;
};

// Last color ("Other"/catch-all) stays a visible mid-tone slate, not a pale
// grey — a pale grey slice (and its white percentage label) disappears
// against this page's white card background.
const DONUT_PALETTE = ["#1E3D73", "#2563EB", "#3b82f6", "#60a5fa", "#93c5fd", "#64748B"];

const numeric = (value: unknown) =>
  Number(String(value ?? "0").replace(/,/g, "")) || 0;

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: value >= 100000 ? "compact" : "standard",
    maximumFractionDigits: value >= 100000 ? 1 : 0,
  }).format(Number(value) || 0);

const tenantName = (tenant: TenantRecord) =>
  tenant.companyName || tenant.customerDetails?.clientName || "Unnamed tenant";

const savedMonthlyRent = (tenant: TenantRecord) =>
  numeric(tenant.billingDetails?.monthlyRent);

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

const readableLabel = (value?: string) =>
  String(value || "Not recorded")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[320px] items-center justify-center px-6 text-center text-[11px] text-[#7B89A6]">
      {children}
    </div>
  );
}

// The one card shell every chart, list and table on this dashboard uses —
// same bordered title bar everywhere instead of each panel hand-rolling its own.
function ChartCard({
  title,
  subtitle,
  action,
  footer,
  bodyClassName = "p-5",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  footer?: ReactNode;
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
      {footer ? <div className="border-t border-slate-100">{footer}</div> : null}
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

export default function CoworkingManagementPage() {
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("All floors");
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError("");
    Promise.allSettled([
      getResources(),
      getAllTenantCompanies(),
      getPricingPackages(),
    ]).then((results) => {
      if (cancelled) return;
      const [resourcesResult, tenantsResult, packagesResult] = results;
      if (resourcesResult.status === "fulfilled") {
        const payload = resourcesResult.value?.data;
        const list = payload?.data?.resources || payload?.resources || [];
        setResources(Array.isArray(list) ? list : []);
      }
      if (tenantsResult.status === "fulfilled") {
        const list = tenantsResult.value?.data?.tenants || [];
        setTenants(Array.isArray(list) ? list : []);
      }
      if (packagesResult.status === "fulfilled") {
        const payload = packagesResult.value?.data;
        const list = payload?.data?.packages || payload?.packages || [];
        setPackages(Array.isArray(list) ? list : []);
      }
      const failures = results.filter((result) => result.status === "rejected");
      setLoadError(
        failures.length
          ? "Some commercial or inventory data could not be refreshed."
          : "",
      );
      setLastUpdated(new Date());
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const floorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          resources.map((resource) => resource.floor?.trim()).filter(Boolean),
        ),
      ).sort(),
    [resources],
  );

  const scopedResources = useMemo(
    () =>
      selectedFloor === "All floors"
        ? resources
        : resources.filter(
            (resource) =>
              (resource.floor?.trim() || "Unassigned") === selectedFloor,
          ),
    [resources, selectedFloor],
  );

  const scopedTenants = useMemo(
    () =>
      selectedFloor === "All floors"
        ? tenants
        : tenants.filter(
            (tenant) => tenant.companyDetails?.floor?.trim() === selectedFloor,
          ),
    [selectedFloor, tenants],
  );

  const stats = useMemo(() => {
    const deskResources = scopedResources.filter(
      (r) =>
        r.resourceCategory === "open_desk" ||
        r.resourceCategory === "cabin_desk",
    );
    const totalDesks = deskResources.reduce(
      (sum, r) => sum + (r.seatSummary?.total ?? r.capacity ?? 0),
      0,
    );
    const occupiedDesks = deskResources.reduce(
      (sum, r) => sum + (r.seatSummary?.assigned ?? 0),
      0,
    );
    const openDesks = deskResources
      .filter((r) => r.resourceCategory === "open_desk")
      .reduce((sum, r) => sum + (r.seatSummary?.total ?? r.capacity ?? 0), 0);
    const cabinDesks = deskResources
      .filter((r) => r.resourceCategory === "cabin_desk")
      .reduce((sum, r) => sum + (r.seatSummary?.total ?? r.capacity ?? 0), 0);
    const virtualOffices = scopedResources.filter(
      (r) => r.resourceCategory === "virtual_office",
    );
    const assignedVirtualOffices = virtualOffices.filter(
      (r) => (r.assignedVirtualOfficeNames?.length ?? 0) > 0,
    ).length;
    const tenantNames = new Set<string>();
    scopedResources.forEach((r) => {
      if (r.assignedTenantCompanyName)
        tenantNames.add(r.assignedTenantCompanyName);
      (r.assignedVirtualOfficeNames || []).forEach(
        (name) => name && tenantNames.add(name),
      );
    });
    const occupancyPercent =
      totalDesks > 0 ? (occupiedDesks / totalDesks) * 100 : 0;

    const byFloor = new Map<string, { total: number; occupied: number }>();
    deskResources.forEach((r) => {
      const floor = r.floor?.trim() || "Unassigned";
      const entry = byFloor.get(floor) || { total: 0, occupied: 0 };
      entry.total += r.seatSummary?.total ?? r.capacity ?? 0;
      entry.occupied += r.seatSummary?.assigned ?? 0;
      byFloor.set(floor, entry);
    });
    const floors = Array.from(byFloor.keys()).sort();
    const floorOccupied = floors.map((floor) => byFloor.get(floor)!.occupied);
    const floorVacant = floors.map((floor) =>
      Math.max(0, byFloor.get(floor)!.total - byFloor.get(floor)!.occupied),
    );
    const floorRows = floors
      .map((floor) => {
        const floorData = byFloor.get(floor)!;
        const vacant = Math.max(0, floorData.total - floorData.occupied);
        return {
          floor,
          total: floorData.total,
          occupied: floorData.occupied,
          vacant,
          occupancy:
            floorData.total > 0
              ? Math.round((floorData.occupied / floorData.total) * 100)
              : 0,
        };
      })
      .sort((a, b) => b.occupancy - a.occupancy);
    const resourceCategories = [
      {
        label: "Open desks",
        value: scopedResources.filter((r) => r.resourceCategory === "open_desk")
          .length,
      },
      {
        label: "Cabin desks",
        value: scopedResources.filter(
          (r) => r.resourceCategory === "cabin_desk",
        ).length,
      },
      { label: "Virtual offices", value: virtualOffices.length },
      {
        label: "Other",
        value: scopedResources.filter(
          (r) =>
            !["open_desk", "cabin_desk", "virtual_office"].includes(
              r.resourceCategory,
            ),
        ).length,
      },
    ].filter((item) => item.value > 0);
    const activeResources = scopedResources.filter(
      (resource) => String(resource.status || "").toLowerCase() === "active",
    ).length;

    return {
      totalDesks,
      occupiedDesks,
      openDesks,
      cabinDesks,
      totalVirtualOffices: virtualOffices.length,
      assignedVirtualOffices,
      activeTenants: tenantNames.size,
      occupancyPercent,
      vacantDesks: Math.max(0, totalDesks - occupiedDesks),
      floors,
      floorOccupied,
      floorVacant,
      floorRows,
      resourceCategories,
      activeResources,
      inactiveResources: Math.max(0, scopedResources.length - activeResources),
      totalResources: scopedResources.length,
    };
  }, [scopedResources]);

  const commercial = useMemo(() => {
    const activeTenants = scopedTenants.filter(
      (tenant) => String(tenant.status || "").toLowerCase() === "active",
    );
    const tenantsWithSavedRent = activeTenants.filter(
      (tenant) => savedMonthlyRent(tenant) > 0,
    );
    const monthlyRecurringRevenue = tenantsWithSavedRent.reduce(
      (sum, tenant) => sum + savedMonthlyRent(tenant),
      0,
    );
    const renewals = activeTenants
      .map((tenant) => {
        const rawEnd = tenant.agreementDetails?.endDate;
        const endDate = rawEnd ? new Date(rawEnd) : null;
        const days = endDate
          ? Math.ceil((endDate.getTime() - Date.now()) / 86400000)
          : null;
        return {
          id: tenant._id || tenant.recordId || tenantName(tenant),
          name: tenantName(tenant),
          floor: tenant.companyDetails?.floor || "Unassigned",
          desks:
            numeric(tenant.companyDetails?.openDesks) +
            numeric(tenant.companyDetails?.cabinDesks),
          monthlyRent: savedMonthlyRent(tenant),
          endDate,
          days,
        };
      })
      .filter(
        (tenant) =>
          tenant.endDate &&
          tenant.days !== null &&
          tenant.days >= 0 &&
          tenant.days <= 120,
      )
      .sort((a, b) => (a.days || 0) - (b.days || 0));

    const sectorMap = new Map<string, number>();
    activeTenants.forEach((tenant) => {
      const sector = tenant.customerDetails?.sector?.trim() || "Other";
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + 1);
    });
    const sectors = [...sectorMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    const topSectors = sectors.slice(0, 5);
    const otherSectorTenants = sectors
      .slice(5)
      .reduce((sum, sector) => sum + sector.value, 0);
    if (otherSectorTenants > 0) {
      topSectors.push({ label: "Other sectors", value: otherSectorTenants });
    }

    const tenantAllocation = activeTenants
      .map((tenant) => ({
        label: tenantName(tenant),
        value:
          numeric(tenant.companyDetails?.openDesks) +
          numeric(tenant.companyDetails?.cabinDesks),
      }))
      .filter((tenant) => tenant.value > 0)
      .sort((a, b) => b.value - a.value);
    const topTenants = tenantAllocation.slice(0, 5);
    const otherDesks = tenantAllocation
      .slice(5)
      .reduce((sum, tenant) => sum + tenant.value, 0);
    if (otherDesks > 0)
      topTenants.push({ label: "Other tenants", value: otherDesks });

    const now = new Date();
    const fiscalYearOf = (date: Date) =>
      date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
    const fiscalStartYear = fiscalYearOf(now);

    // Each tenant's monthlyRent spread across the months their agreement
    // (start -> end) actually overlaps the given fiscal year (Apr-Mar).
    const monthlyRevenueForFiscalYear = (yearStart: number) =>
      Array.from({ length: 12 }, (_, index) => {
        const monthDate = new Date(yearStart, index + 3, 1);
        return tenantsWithSavedRent.reduce((sum, tenant) => {
          const startRaw =
            tenant.agreementDetails?.startDate || tenant.contractStart;
          const endRaw = tenant.agreementDetails?.endDate;
          const start = startRaw ? new Date(startRaw) : null;
          const end = endRaw ? new Date(endRaw) : null;
          if (!start || Number.isNaN(start.getTime())) return sum;
          if (!end || Number.isNaN(end.getTime())) return sum;
          if (monthDate < new Date(start.getFullYear(), start.getMonth(), 1))
            return sum;
          if (monthDate > new Date(end.getFullYear(), end.getMonth(), 1))
            return sum;
          return sum + savedMonthlyRent(tenant);
        }, 0);
      });
    const revenueByMonth = monthlyRevenueForFiscalYear(fiscalStartYear);

    // Every fiscal year touched by a contract start or an agreement end,
    // so "every year" covers the tenant's actual history, not just this year.
    const fiscalYearsInData = new Set<number>([fiscalStartYear]);
    tenantsWithSavedRent.forEach((tenant) => {
      const startRaw = tenant.agreementDetails?.startDate || tenant.contractStart;
      const start = startRaw ? new Date(startRaw) : null;
      if (start && !Number.isNaN(start.getTime())) fiscalYearsInData.add(fiscalYearOf(start));
    });
    activeTenants.forEach((tenant) => {
      const endRaw = tenant.agreementDetails?.endDate;
      const end = endRaw ? new Date(endRaw) : null;
      if (end && !Number.isNaN(end.getTime())) fiscalYearsInData.add(fiscalYearOf(end));
    });
    const revenueByYear = Array.from(fiscalYearsInData)
      .sort((a, b) => a - b)
      .map((yearStart) => ({
        fiscalYear: `FY ${yearStart}-${String(yearStart + 1).slice(-2)}`,
        revenue: monthlyRevenueForFiscalYear(yearStart).reduce((sum, value) => sum + value, 0),
        renewals: activeTenants.filter((tenant) => {
          const endRaw = tenant.agreementDetails?.endDate;
          const end = endRaw ? new Date(endRaw) : null;
          return end && !Number.isNaN(end.getTime()) && fiscalYearOf(end) === yearStart;
        }).length,
      }));

    const securityDepositPaid = activeTenants.filter(
      (tenant) =>
        String(tenant.billingDetails?.securityDepositPaidStatus || "").toLowerCase() === "paid",
    );
    const securityDepositPendingAmount = activeTenants
      .filter(
        (tenant) =>
          String(tenant.billingDetails?.securityDepositPaidStatus || "").toLowerCase() !== "paid",
      )
      .reduce((sum, tenant) => sum + numeric(tenant.billingDetails?.securityDepositAmount), 0);

    return {
      activeTenants,
      tenantsWithSavedRent,
      agreementsWithEndDate: activeTenants.filter((tenant) => {
        const value = tenant.agreementDetails?.endDate;
        if (!value) return false;
        return !Number.isNaN(new Date(value).getTime());
      }).length,
      monthlyRecurringRevenue,
      renewals,
      sectors,
      topSectors,
      topTenants,
      revenueByMonth,
      revenueByYear,
      securityDepositPaid,
      securityDepositPendingAmount,
      activePackages: packages.filter(
        (item) => String(item.status || "").toLowerCase() === "active",
      ).length,
      fiscalYear: `FY ${fiscalStartYear}-${String(fiscalStartYear + 1).slice(-2)}`,
    };
  }, [packages, scopedTenants]);

  const lowestOccupancyFloor = stats.floorRows.length
    ? [...stats.floorRows].sort((a, b) => a.occupancy - b.occupancy)[0]
    : null;

  const tenantRows = useMemo(
    () =>
      [...scopedTenants].sort((left, right) =>
        tenantName(left).localeCompare(tenantName(right)),
      ),
    [scopedTenants],
  );

  const resourceRows = useMemo(
    () =>
      [...scopedResources].sort((left, right) =>
        String(left.name || left.recordId || "").localeCompare(
          String(right.name || right.recordId || ""),
        ),
      ),
    [scopedResources],
  );

  const packageRows = useMemo(
    () =>
      [...packages].sort((left, right) =>
        String(left.name || left.packageCode || "").localeCompare(
          String(right.name || right.packageCode || ""),
        ),
      ),
    [packages],
  );

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            {/* Photo area — a real coworking-space photo (Unsplash License,
                Adolfo Félix), faded into the white panel on the left via mask,
                with a blue theme-color tint over it. */}
            <img
              src={coworkingBannerImage}
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
            {/* White panel — same inverse mask, so it blends into the image
                instead of a hard edge. */}
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
                <span className="text-primary">Coworking</span>{" "}
                <span className="text-accent">Management</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
                Live capacity, tenant agreements, billing completeness, pricing,
                and renewal visibility across every coworking floor.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Desks", "Cabin desks", "Virtual offices", "Billing & renewals"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600"
                    >
                      {tag}
                    </span>
                  ),
                )}
              </div>
            </div>
            <div className="absolute right-6 top-5 z-10 flex items-center gap-2.5 rounded-lg border border-white/25 bg-white/15 px-3 py-2 backdrop-blur-sm">
              <MapPinned size={15} className="shrink-0 text-white/90" />
              <div>
                <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">
                  Scope
                </p>
                <select
                  value={selectedFloor}
                  onChange={(event) => setSelectedFloor(event.target.value)}
                  className="-mt-0.5 max-w-[140px] bg-transparent text-[12px] font-pmedium text-white outline-none [&>option]:text-slate-900"
                >
                  <option>All floors</option>
                  {floorOptions.map((floor) => (
                    <option key={floor}>{floor}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-pmedium text-amber-800">
            <AlertTriangle size={16} />
            {loadError} Existing dashboard values may be incomplete.
          </div>
        ) : null}

        {/* Banner above is header-only; every number lives here instead, once. */}
        {isLoading ? (
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, key) => (
              <div
                key={key}
                className="h-[112px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              icon={<LayoutGrid size={20} />}
              label="Total desks"
              value={stats.totalDesks}
              sub={`${stats.openDesks} open desks · ${stats.cabinDesks} cabin desks`}
            />
            <StatTile
              icon={<CircleGauge size={20} />}
              label="Desk occupancy"
              value={`${Math.round(stats.occupancyPercent)}%`}
              sub={`${stats.occupiedDesks} of ${stats.totalDesks} desks assigned`}
              status="success"
            />
            <StatTile
              icon={<Users size={20} />}
              label="Active tenants"
              value={commercial.activeTenants.length}
              sub="Tenant records currently marked active"
            />
            <StatTile
              icon={<CalendarClock size={20} />}
              label="Renewals due"
              value={commercial.renewals.length}
              sub="Agreements ending within 120 days"
              status={commercial.renewals.length ? "attention" : "success"}
            />
            <StatTile
              icon={<IndianRupee size={20} />}
              label="Saved monthly rent"
              value={currency(commercial.monthlyRecurringRevenue)}
              sub={`${commercial.tenantsWithSavedRent.length} of ${commercial.activeTenants.length} active tenants have billing values`}
            />
            <StatTile
              icon={<PackageCheck size={20} />}
              label="Active pricing packages"
              value={commercial.activePackages}
              sub="Published package records currently marked active"
            />
            <StatTile
              icon={<Building2 size={20} />}
              label="Virtual offices assigned"
              value={`${stats.assignedVirtualOffices} / ${stats.totalVirtualOffices}`}
              sub="Assigned records / total virtual office records"
            />
            <StatTile
              icon={<ShieldCheck size={20} />}
              label="Security deposits collected"
              value={`${commercial.securityDepositPaid.length} / ${commercial.activeTenants.length}`}
              sub={
                commercial.securityDepositPendingAmount > 0
                  ? `${currency(commercial.securityDepositPendingAmount)} pending`
                  : "Active tenants with deposit marked paid"
              }
              status={
                commercial.securityDepositPaid.length ===
                commercial.activeTenants.length
                  ? "success"
                  : "attention"
              }
            />
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-pmedium text-slate-900">
                Manage coworking operations
              </p>
              <p className="mt-1 text-[10px] font-pmedium text-slate-500">
                Open the underlying records used by this dashboard.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <DashboardModuleCard
              icon={<Tag />}
              title="Resource & Pricing"
              route="/key-apps/co-working-management/resource-pricing"
              description="Desk inventory, packages, and rates"
              color="#7C3AED"
            />
            <DashboardModuleCard
              icon={<Store />}
              title="Tenant Companies"
              route="/department-accesses/sales-department/tenant-companies"
              state={{ fromSection: "co-working-management" }}
              description="Tenant accounts, agreements, and billing"
              color="#0891B2"
            />
            <DashboardModuleCard
              icon={<Building2 />}
              title="Virtual Offices"
              route="/department-accesses/sales-department/virtual-offices"
              state={{ fromSection: "co-working-management" }}
              description="Virtual-office clients and assignments"
              color="#0F766E"
            />
            <DashboardModuleCard
              icon={<ShoppingCart />}
              title="Coworking Architecture"
              route="/department-accesses/sales-department/sales-architecture?vertical=coworking"
              state={{ fromSection: "co-working-management" }}
              description="Coworking resource and space structure"
              color="#F59E0B"
            />
          </div>
        </div>

        {/* ───────────────────────── Charts — everything visual lives here ───────────────────────── */}

        {!isLoading && (
          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <ChartCard
              title="Recorded Contract Value by Month"
              subtitle="Uses only saved monthly-rent values where both agreement start and end dates are recorded."
              action={
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-[0.08em] text-slate-400">
                    Reporting period
                  </p>
                  <p className="mt-1 text-[11px] font-pmedium text-slate-700">
                    {commercial.fiscalYear}
                  </p>
                </div>
              }
            >
              {commercial.revenueByMonth.some((value) => value > 0) ? (
                <ReactApexChart
                  type="area"
                  height={320}
                  series={[
                    {
                      name: "Saved monthly rent",
                      data: commercial.revenueByMonth,
                    },
                  ]}
                  options={{
                    chart: {
                      toolbar: { show: false },
                      fontFamily: "Poppins",
                      zoom: { enabled: false },
                    },
                    colors: ["#2563EB"],
                    stroke: { curve: "smooth", width: 3 },
                    fill: {
                      type: "gradient",
                      gradient: { opacityFrom: 0.22, opacityTo: 0.02 },
                    },
                    markers: {
                      size: 4,
                      colors: ["#ffffff"],
                      strokeColors: "#2563EB",
                      strokeWidth: 2,
                    },
                    dataLabels: { enabled: false },
                    grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
                    xaxis: {
                      categories: [
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dec",
                        "Jan",
                        "Feb",
                        "Mar",
                      ],
                      axisBorder: { show: false },
                      axisTicks: { show: false },
                      labels: {
                        style: { colors: "#64748b", fontSize: "11px" },
                      },
                    },
                    yaxis: {
                      labels: { formatter: (value: number) => currency(value) },
                    },
                    tooltip: {
                      y: { formatter: (value: number) => currency(value) },
                    },
                  }}
                />
              ) : (
                <Empty>
                  Add saved monthly rent plus agreement start and end dates to
                  populate this chart.
                </Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Agreements Ending Within 120 Days"
              subtitle="Derived from the saved end date on active tenant agreements, ordered by urgency."
              bodyClassName=""
              footer={
                <Link
                  to="/department-accesses/sales-department/tenant-companies"
                  state={{ fromSection: "co-working-management" }}
                  className="flex items-center justify-between px-5 py-3 text-[11px] font-pmedium text-blue-600 transition hover:bg-blue-50/50"
                >
                  Review tenant agreements <ArrowRight size={14} />
                </Link>
              }
            >
              {commercial.renewals.length ? (
                <div className="divide-y divide-slate-100">
                  {commercial.renewals.slice(0, 8).map((tenant) => (
                    <div
                      key={tenant.id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-pmedium text-slate-800">
                          {tenant.name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {tenant.floor} · {tenant.desks} desks
                          {tenant.monthlyRent > 0
                            ? ` · ${currency(tenant.monthlyRent)}/mo`
                            : " · Monthly rent not recorded"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-pmedium ${Number(tenant.days) <= 30 ? "bg-red-50 text-red-700" : Number(tenant.days) <= 60 ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}
                      >
                        {tenant.days === 0 ? "Today" : `${tenant.days} days`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[160px] items-center justify-center px-6 text-center text-[11px] text-slate-500">
                  No active agreement has a saved end date within the next 120
                  days.
                </div>
              )}
            </ChartCard>
          </div>
        )}

        {!isLoading && commercial.revenueByYear.length > 0 && (
          <div className="mb-4 grid grid-cols-1 gap-4">
            <ChartCard
              title="Yearly Revenue & Renewals"
              subtitle="Total recorded contract value per fiscal year, alongside how many agreements ended that year — every year on record, not just the current one."
            >
              <ReactApexChart
                type="bar"
                height={300}
                series={[
                  {
                    name: "Revenue",
                    data: commercial.revenueByYear.map((row) => row.revenue),
                  },
                  {
                    name: "Renewals",
                    data: commercial.revenueByYear.map((row) => row.renewals),
                  },
                ]}
                options={{
                  chart: { toolbar: { show: false }, fontFamily: "Poppins" },
                  colors: ["#2563EB", "#93c5fd"],
                  plotOptions: {
                    bar: { horizontal: false, columnWidth: "48%", borderRadius: 5 },
                  },
                  dataLabels: { enabled: false },
                  grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
                  xaxis: {
                    categories: commercial.revenueByYear.map((row) => row.fiscalYear),
                    labels: { style: { colors: "#64748b", fontSize: "11px" } },
                  },
                  yaxis: [
                    {
                      title: { text: "Revenue" },
                      labels: { formatter: (value: number) => currency(value) },
                    },
                    {
                      opposite: true,
                      title: { text: "Renewals" },
                      labels: { formatter: (value: number) => `${Math.round(value)}` },
                    },
                  ],
                  legend: { position: "top", fontSize: "11px", labels: { colors: "#64748b" } },
                  tooltip: {
                    shared: true,
                    intersect: false,
                    y: {
                      formatter: (value: number, { seriesIndex }: { seriesIndex: number }) =>
                        seriesIndex === 0 ? currency(value) : `${value} agreement${value === 1 ? "" : "s"}`,
                    },
                  },
                }}
              />
            </ChartCard>
          </div>
        )}

        {!isLoading && (
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title="Desk Utilization"
              subtitle="Assigned seats vs. total recorded desk capacity."
            >
              <DonutChart
                centerLabel="Desks"
                labels={["Occupied", "Vacant"]}
                colors={["#2563EB", "#64748B"]}
                series={[
                  stats.occupiedDesks,
                  Math.max(0, stats.totalDesks - stats.occupiedDesks),
                ]}
                tooltipValue={[
                  `${stats.occupiedDesks} occupied`,
                  `${Math.max(0, stats.totalDesks - stats.occupiedDesks)} vacant`,
                ]}
              />
            </ChartCard>

            <ChartCard
              title="Client-wise Occupancy"
              subtitle="Largest saved desk allocations, top 5 + other."
            >
              {commercial.topTenants.length ? (
                <DonutChart
                  centerLabel="Desks"
                  labels={commercial.topTenants.map((item) => item.label)}
                  colors={DONUT_PALETTE.slice(0, commercial.topTenants.length)}
                  series={commercial.topTenants.map((item) => item.value)}
                  tooltipValue={commercial.topTenants.map(
                    (item) => `${item.value} desks`,
                  )}
                />
              ) : (
                <Empty>No tenant desk assignments yet.</Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Sector-wise Occupancy"
              subtitle="Active tenant count by saved customer sector, top 5 + other."
            >
              {commercial.topSectors.length ? (
                <DonutChart
                  centerLabel="Tenants"
                  labels={commercial.topSectors.map((item) => item.label)}
                  colors={DONUT_PALETTE.slice(0, commercial.topSectors.length)}
                  series={commercial.topSectors.map((item) => item.value)}
                  tooltipValue={commercial.topSectors.map(
                    (item) => `${item.value} tenants`,
                  )}
                />
              ) : (
                <Empty>Add tenant sectors to see the portfolio mix.</Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Virtual Office Allocation"
              subtitle="Assignment names saved against virtual-office resource records."
            >
              <DonutChart
                centerLabel="Offices"
                labels={["Assigned", "Vacant"]}
                colors={["#2563EB", "#64748B"]}
                series={[
                  stats.assignedVirtualOffices,
                  Math.max(
                    0,
                    stats.totalVirtualOffices - stats.assignedVirtualOffices,
                  ),
                ]}
                tooltipValue={[
                  `${stats.assignedVirtualOffices} assigned`,
                  `${Math.max(0, stats.totalVirtualOffices - stats.assignedVirtualOffices)} vacant`,
                ]}
              />
            </ChartCard>

            <ChartCard
              title="Resource Status"
              subtitle="Active and inactive resource records in the selected floor scope."
            >
              <DonutChart
                centerLabel="Resources"
                labels={["Active", "Inactive"]}
                colors={["#2563EB", "#64748B"]}
                series={[stats.activeResources, stats.inactiveResources]}
                tooltipValue={[
                  `${stats.activeResources} active`,
                  `${stats.inactiveResources} inactive`,
                ]}
              />
            </ChartCard>

            <ChartCard
              title="Agreement Status"
              subtitle="Active tenant records vs. every other recorded status."
            >
              <DonutChart
                centerLabel="Agreements"
                labels={["Active", "Other status"]}
                colors={["#2563EB", "#64748B"]}
                series={[
                  commercial.activeTenants.length,
                  Math.max(
                    0,
                    scopedTenants.length - commercial.activeTenants.length,
                  ),
                ]}
                tooltipValue={[
                  `${commercial.activeTenants.length} active`,
                  `${Math.max(0, scopedTenants.length - commercial.activeTenants.length)} other status`,
                ]}
              />
            </ChartCard>

            <ChartCard
              title="Billing Data Completeness"
              subtitle="Active tenants with and without a saved monthly-rent value."
            >
              <DonutChart
                centerLabel="Tenants"
                labels={["Rent recorded", "Rent missing"]}
                colors={["#2563EB", "#F59E0B"]}
                series={[
                  commercial.tenantsWithSavedRent.length,
                  Math.max(
                    0,
                    commercial.activeTenants.length -
                      commercial.tenantsWithSavedRent.length,
                  ),
                ]}
                tooltipValue={[
                  `${commercial.tenantsWithSavedRent.length} recorded`,
                  `${Math.max(0, commercial.activeTenants.length - commercial.tenantsWithSavedRent.length)} missing`,
                ]}
              />
            </ChartCard>

            <ChartCard
              title="Resource Type Mix"
              subtitle="Resource-record distribution across coworking categories."
            >
              {stats.resourceCategories.length ? (
                <DonutChart
                  centerLabel="Resources"
                  labels={stats.resourceCategories.map((item) => item.label)}
                  colors={DONUT_PALETTE}
                  series={stats.resourceCategories.map((item) => item.value)}
                  tooltipValue={stats.resourceCategories.map(
                    (item) => `${item.value} records`,
                  )}
                />
              ) : (
                <Empty>No resource categories are available.</Empty>
              )}
            </ChartCard>
          </div>
        )}

        {!isLoading && stats.floors.length > 0 && (
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <ChartCard
              title="Desk Occupancy by Floor"
              subtitle="Assigned and available capacity, calculated from saved resource seat summaries."
              action={<CircleGauge size={18} className="text-blue-600" />}
            >
              <GroupedBarGraph
                series={[
                  { name: "Occupied", data: stats.floorOccupied },
                  { name: "Vacant", data: stats.floorVacant },
                ]}
                options={{
                  chart: {
                    type: "bar",
                    stacked: true,
                    toolbar: { show: false },
                    fontFamily: "inherit",
                  },
                  colors: ["#2563EB", "#dbeafe"],
                  plotOptions: {
                    bar: {
                      horizontal: false,
                      columnWidth: "40%",
                      borderRadius: 6,
                      borderRadiusApplication: "end",
                    },
                  },
                  dataLabels: { enabled: false },
                  xaxis: {
                    categories: stats.floors,
                    labels: { style: { colors: "#64748b", fontSize: "11px" } },
                  },
                  yaxis: {
                    labels: { style: { colors: "#94a3b8", fontSize: "11px" } },
                  },
                  legend: {
                    position: "top",
                    fontSize: "11px",
                    labels: { colors: "#64748b" },
                  },
                  grid: { borderColor: "#f1f5f9" },
                }}
              />
            </ChartCard>

            <ChartCard
              title="Floor Performance"
              subtitle="Recorded utilization ranked from highest to lowest."
              bodyClassName=""
            >
              <div className="max-h-[320px] divide-y divide-slate-100 overflow-y-auto">
                {stats.floorRows.map((row) => (
                  <div
                    key={row.floor}
                    className="px-5 py-4 transition hover:bg-slate-50/70"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-pmedium text-slate-800">
                          {row.floor}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {row.occupied} occupied · {row.vacant} available
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-pmedium ${row.occupancy >= 80 ? "bg-emerald-50 text-emerald-700" : row.occupancy >= 50 ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}
                      >
                        {row.occupancy}%
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${Math.min(100, row.occupancy)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        )}

        {!isLoading && (
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <ChartCard
              title="Operational Attention"
              bodyClassName="p-5"
              footer={
                <Link
                  to="/key-apps/co-working-management/resource-pricing"
                  className="flex items-center justify-between px-5 py-3 text-[11px] font-pmedium text-slate-700 transition hover:text-blue-700"
                >
                  Review resource and pricing setup <ArrowRight size={15} />
                </Link>
              }
            >
              <div className="flex items-start gap-3 rounded-2xl bg-blue-50/70 p-4">
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0 text-blue-600"
                />
                <div>
                  <p className="text-[11px] font-pmedium text-slate-800">
                    {lowestOccupancyFloor
                      ? `${lowestOccupancyFloor.floor} has the most available capacity`
                      : "Add resources to begin tracking capacity"}
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-slate-500">
                    {lowestOccupancyFloor
                      ? `${lowestOccupancyFloor.vacant} desks are available at ${lowestOccupancyFloor.occupancy}% occupancy. Review pricing or match open leads to this floor.`
                      : "Create open-desk or cabin-desk resources, then assign tenant seats to populate this dashboard."}
                  </p>
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Resource Mix">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {stats.resourceCategories.map((category, index) => (
                  <div
                    key={category.label}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: DONUT_PALETTE[index] }}
                      />
                      <span className="text-[11px] font-pmedium text-slate-600">
                        {category.label}
                      </span>
                    </div>
                    <span className="text-[13px] font-pmedium text-slate-900">
                      {category.value}
                    </span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        )}

        {/* ───────────────────────── Tables — raw records, always last ───────────────────────── */}

        {!isLoading && (
          <div className="grid grid-cols-1 gap-4">
            <ChartCard
              title="Tenant Agreement Register"
              subtitle="Every tenant record in the selected floor scope, including saved desk, billing, and agreement details."
              action={<RecordCountChip count={tenantRows.length} />}
              bodyClassName=""
            >
              {tenantRows.length ? (
                <div className="max-h-[430px] overflow-auto">
                  <table className="w-full min-w-[920px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Tenant</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Sector</th>
                        <th className="px-4 py-3">Floor</th>
                        <th className="px-4 py-3 text-right">Open desks</th>
                        <th className="px-4 py-3 text-right">Cabin desks</th>
                        <th className="px-4 py-3 text-right">Monthly rent</th>
                        <th className="px-5 py-3">Agreement ends</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tenantRows.map((tenant, index) => {
                        const status = String(tenant.status || "Not recorded");
                        const isActive = status.toLowerCase() === "active";
                        return (
                          <tr
                            key={
                              tenant._id ||
                              tenant.recordId ||
                              `${tenantName(tenant)}-${index}`
                            }
                            className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                          >
                            <td className="px-5 py-3 text-slate-900">
                              {tenantName(tenant)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {tenant.customerDetails?.sector || "Not recorded"}
                            </td>
                            <td className="px-4 py-3">
                              {tenant.companyDetails?.floor || "Not recorded"}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {numeric(tenant.companyDetails?.openDesks)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {numeric(tenant.companyDetails?.cabinDesks)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {savedMonthlyRent(tenant) > 0
                                ? currency(savedMonthlyRent(tenant))
                                : "Not recorded"}
                            </td>
                            <td className="px-5 py-3">
                              {dateLabel(tenant.agreementDetails?.endDate)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                  No tenant records are available for this floor scope.
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Resource Inventory Register"
              subtitle="Current resource status, location, capacity, and assignments from the resource service."
              action={<RecordCountChip count={resourceRows.length} />}
              bodyClassName=""
            >
              {resourceRows.length ? (
                <div className="max-h-[430px] overflow-auto">
                  <table className="w-full min-w-[860px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Resource</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Floor / wing</th>
                        <th className="px-4 py-3 text-right">Capacity</th>
                        <th className="px-4 py-3 text-right">Assigned</th>
                        <th className="px-4 py-3 text-right">Available</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resourceRows.map((resource, index) => {
                        const capacity =
                          resource.seatSummary?.total ?? resource.capacity ?? 0;
                        const assigned = resource.seatSummary?.assigned ?? 0;
                        const available =
                          resource.seatSummary?.vacant ??
                          Math.max(0, capacity - assigned);
                        const isActive =
                          String(resource.status || "").toLowerCase() ===
                          "active";
                        return (
                          <tr
                            key={
                              resource.recordId ||
                              `${resource.name || "resource"}-${index}`
                            }
                            className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                          >
                            <td className="px-5 py-3 text-slate-900">
                              {resource.name ||
                                resource.recordId ||
                                "Unnamed resource"}
                            </td>
                            <td className="px-4 py-3">
                              {readableLabel(resource.resourceCategory)}
                            </td>
                            <td className="px-4 py-3">
                              {resource.floor || "Not recorded"}
                              {resource.wing ? ` · ${resource.wing}` : ""}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {capacity}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {assigned}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {available}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                              >
                                {resource.status || "Not recorded"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                  No resource records are available for this floor scope.
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Pricing Package Register"
              subtitle="Saved package terms and desk rates. Blank values remain visibly unrecorded."
              action={<RecordCountChip count={packageRows.length} />}
              bodyClassName=""
            >
              {packageRows.length ? (
                <div className="max-h-[430px] overflow-auto">
                  <table className="w-full min-w-[940px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Package</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Duration</th>
                        <th className="px-4 py-3 text-right">Contract value</th>
                        <th className="px-4 py-3 text-right">
                          Open desk / day
                        </th>
                        <th className="px-4 py-3 text-right">
                          Cabin desk / day
                        </th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {packageRows.map((item, index) => {
                        const isActive =
                          String(item.status || "").toLowerCase() === "active";
                        return (
                          <tr
                            key={
                              item._id ||
                              item.recordId ||
                              item.packageCode ||
                              `${item.name || "package"}-${index}`
                            }
                            className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                          >
                            <td className="px-5 py-3">
                              <p className="text-slate-900">
                                {item.name || "Unnamed package"}
                              </p>
                              <p className="mt-0.5 text-[9px] text-slate-400">
                                {item.packageCode ||
                                  item.recordId ||
                                  "No code recorded"}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              {item.category || "Not recorded"}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {numeric(item.durationMonths) > 0
                                ? `${numeric(item.durationMonths)} months`
                                : "Not recorded"}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {numeric(item.price) > 0
                                ? currency(numeric(item.price))
                                : "Not recorded"}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {numeric(item.ratePerOpenDesk) > 0
                                ? currency(numeric(item.ratePerOpenDesk))
                                : "Not recorded"}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {numeric(item.ratePerCabinDesk) > 0
                                ? currency(numeric(item.ratePerCabinDesk))
                                : "Not recorded"}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                              >
                                {item.status || "Not recorded"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                  No pricing package records are available.
                </div>
              )}
            </ChartCard>
          </div>
        )}
      </PageFrame>
    </div>
  );
}
