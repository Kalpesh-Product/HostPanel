import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  LayoutList,
  Store,
  Users,
  XCircle,
} from "lucide-react";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import DonutChart from "@/components/graphs/DonutChart";
import GroupedBarGraph from "@/components/graphs/GroupedBarGraph";
import PageFrame from "@/components/Pages/PageFrame";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "@/lib/workspaceLocalization";
import { getAllTenantCompanies } from "@/services/tenant-companies";
import tenantBannerImage from "@/assets/tenant-companies-dashboard-banner.png";
import {
  DashboardBanner,
  DashboardSection,
  DashboardStatTile,
} from "../AdministrationModuleDashboardShared";
import { normalizeDashboardLabel } from "../AdministrationDashboardUtils";

type TenantRecord = Record<string, any>;

const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

const tenantName = (tenant: TenantRecord) =>
  tenant.name ||
  tenant.customerDetails?.clientName ||
  tenant.companyName ||
  "Tenant company";

const tenantSector = (tenant: TenantRecord) =>
  tenant.businessType ||
  tenant.customerDetails?.sector ||
  tenant.sector ||
  "Other";

const tenantStatus = (tenant: TenantRecord) =>
  tenant.status || tenant.companyDetails?.status || "Unknown";

const tenantMonthlyRent = (tenant: TenantRecord) =>
  Number(
    tenant.billingDetails?.monthlyRent ||
      tenant.livePricingSummary?.monthlyRent ||
      tenant.monthlyRent ||
      0,
  );

const tenantSeats = (tenant: TenantRecord) =>
  Number(
    tenant.packageDetails?.totalSeats ||
      tenant.spaceAssigned?.totalSeats ||
      Number(tenant.companyDetails?.openDesks || 0) +
        Number(tenant.companyDetails?.cabinDesks || 0),
  );

const tenantEmployees = (tenant: TenantRecord) =>
  Array.isArray(tenant.employees) ? tenant.employees.length : 0;

const formatDate = (value: unknown) => {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function TenantCompaniesWorkspaceDashboard() {
  const workspacePreferences = useWorkspacePreferences();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [summary, setSummary] = useState({
    totalTenants: 0,
    activeContracts: 0,
    expiringSoon: 0,
    expired: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getAllTenantCompanies()
      .then((response: any) => {
        if (cancelled) return;
        const payload = response?.data || {};
        const records = Array.isArray(payload.tenants) ? payload.tenants : [];
        setTenants(records);
        setSummary({
          totalTenants: Number(payload.summary?.totalTenants ?? records.length),
          activeContracts: Number(
            payload.summary?.activeContracts ??
              records.filter(
                (tenant: TenantRecord) =>
                  normalize(tenantStatus(tenant)) === "active",
              ).length,
          ),
          expiringSoon: Number(payload.summary?.expiringSoon || 0),
          expired: Number(payload.summary?.expired || 0),
        });
        setLoadError("");
      })
      .catch((error: any) => {
        if (!cancelled) {
          setLoadError(
            error?.message ||
              "Tenant company data could not be refreshed just now.",
          );
          setTenants([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const money = (value: number) =>
    formatWorkspaceCurrency(value, workspacePreferences.currency, {
      maximumFractionDigits: 0,
    });

  const stats = useMemo(() => {
    const employees = tenants.reduce(
      (total, tenant) => total + tenantEmployees(tenant),
      0,
    );
    const seats = tenants.reduce(
      (total, tenant) => total + tenantSeats(tenant),
      0,
    );
    const monthlyRent = tenants.reduce(
      (total, tenant) => total + tenantMonthlyRent(tenant),
      0,
    );
    const creditsRemaining = tenants.reduce((total, tenant) => {
      const allocated = Number(
        tenant.totalCreditsAllocated || tenant.creditsAllocated || 0,
      );
      const used = Number(tenant.creditsUsed || 0);
      return total + Math.max(0, allocated - used);
    }, 0);
    return { employees, seats, monthlyRent, creditsRemaining };
  }, [tenants]);

  const sectorRows = useMemo(() => {
    const groups = new Map<string, number>();
    tenants.forEach((tenant) => {
      const label = tenantSector(tenant);
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [tenants]);

  const statusRows = useMemo(() => {
    const groups = new Map<string, number>();
    tenants.forEach((tenant) => {
      const label = normalizeDashboardLabel(tenantStatus(tenant)) || "Unknown";
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [tenants]);

  const topRentTenants = useMemo(
    () =>
      [...tenants]
        .sort(
          (left, right) => tenantMonthlyRent(right) - tenantMonthlyRent(left),
        )
        .slice(0, 8),
    [tenants],
  );

  const recentTenants = useMemo(
    () =>
      [...tenants]
        .sort(
          (left, right) =>
            new Date(right.createdAt || right.contractStart || 0).getTime() -
            new Date(left.createdAt || left.contractStart || 0).getTime(),
        )
        .slice(0, 10),
    [tenants],
  );

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <DashboardBanner
          title="Tenant Companies"
          description="Company occupancy, contract health, tenant workforce, allocated seats, credits, and monthly receivables."
          tags={["Companies", "Contracts", "Occupancy", "Billing"]}
          image={tenantBannerImage}
        />

        {loadError && !isLoading ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            {loadError}
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
              icon={<Building2 size={20} />}
              label="Tenant Companies"
              value={summary.totalTenants}
              sub="Companies registered in the workspace"
              tone="blue"
            />
            <DashboardStatTile
              icon={<CheckCircle2 size={20} />}
              label="Active Contracts"
              value={summary.activeContracts}
              sub="Contracts currently in force"
              tone="green"
            />
            <DashboardStatTile
              icon={<AlertTriangle size={20} />}
              label="Expiring Soon"
              value={summary.expiringSoon}
              sub="Contracts ending within 30 days"
              tone="amber"
            />
            <DashboardStatTile
              icon={<XCircle size={20} />}
              label="Expired"
              value={summary.expired}
              sub="Contracts requiring action"
              tone="rose"
            />
            <DashboardStatTile
              icon={<Users size={20} />}
              label="Tenant Employees"
              value={stats.employees}
              sub="People attached to tenant companies"
              tone="violet"
            />
            <DashboardStatTile
              icon={<Store size={20} />}
              label="Allocated Seats"
              value={stats.seats}
              sub="Seats committed across tenants"
              tone="cyan"
            />
            <DashboardStatTile
              icon={<CircleDollarSign size={20} />}
              label="Monthly Rent"
              value={money(stats.monthlyRent)}
              sub="Current monthly tenant receivables"
              tone="green"
            />
            <DashboardStatTile
              icon={<CreditCard size={20} />}
              label="Credits Remaining"
              value={stats.creditsRemaining}
              sub="Available meeting credits"
              tone="slate"
            />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">
            Manage tenant companies
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Open the tenant register to review contracts, employees, spaces,
            billing, and credits.
          </p>
          <div className="mt-3 grid w-full grid-cols-1 gap-4">
            <DashboardModuleCard
              icon={<LayoutList size={19} />}
              title="Tenant Companies"
              route="/department-accesses/administration-department/tenant-companies/manage"
              description="Manage tenant profiles, contracts, workspace allocation, employees, and renewals"
              color="#2563EB"
            />
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4">
              <DashboardSection
                title="Monthly rent by tenant"
                subtitle="Highest current monthly rent commitments across tenant companies."
              >
                {topRentTenants.length ? (
                  <GroupedBarGraph
                    options={{
                      chart: { toolbar: { show: false } },
                      xaxis: { categories: topRentTenants.map(tenantName) },
                      colors: ["#2563EB"],
                      dataLabels: { enabled: false },
                      legend: { show: false },
                      tooltip: {
                        y: { formatter: (value: number) => money(value) },
                      },
                    }}
                    series={[
                      {
                        name: "Monthly rent",
                        data: topRentTenants.map(tenantMonthlyRent),
                      },
                    ]}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No tenant billing data recorded yet.
                  </div>
                )}
              </DashboardSection>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DashboardSection
                title="Sector distribution"
                subtitle="Tenant companies grouped by their business sector."
              >
                {sectorRows.length ? (
                  <DonutChart
                    centerLabel="Tenants"
                    labels={sectorRows.map(([label]) => label)}
                    series={sectorRows.map(([, value]) => value)}
                    colors={[
                      "#2563EB",
                      "#10B981",
                      "#7C3AED",
                      "#F59E0B",
                      "#06B6D4",
                      "#94A3B8",
                    ]}
                    tooltipValue={sectorRows.map(
                      ([, value]) => `${value} tenants`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No sector data recorded yet.
                  </div>
                )}
              </DashboardSection>
              <DashboardSection
                title="Contract status"
                subtitle="Current tenant-company status across the workspace."
              >
                {statusRows.length ? (
                  <DonutChart
                    centerLabel="Tenants"
                    labels={statusRows.map(([label]) => label)}
                    series={statusRows.map(([, value]) => value)}
                    colors={[
                      "#10B981",
                      "#F59E0B",
                      "#EF4444",
                      "#2563EB",
                      "#94A3B8",
                    ]}
                    tooltipValue={statusRows.map(
                      ([, value]) => `${value} tenants`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No contract status data recorded yet.
                  </div>
                )}
              </DashboardSection>
            </div>

            <DashboardSection
              title="Recent tenant companies"
              subtitle="Latest tenant companies and their current operational position."
              bodyClassName="max-h-[420px] overflow-auto p-0"
            >
              <table className="w-full min-w-[860px] table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="w-[28%] px-5 py-3 font-pmedium">Company</th>
                    <th className="w-[18%] px-3 py-3 font-pmedium">Sector</th>
                    <th className="w-[16%] px-3 py-3 text-center font-pmedium">
                      Employees
                    </th>
                    <th className="w-[18%] px-3 py-3 font-pmedium">
                      Contract End
                    </th>
                    <th className="w-[20%] px-3 py-3 text-center font-pmedium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTenants.length ? (
                    recentTenants.map((tenant, index) => (
                      <tr
                        key={
                          tenant.recordId || tenant._id || tenant.id || index
                        }
                        className="bg-white text-[11px] text-slate-600"
                      >
                        <td className="px-5 py-3">
                          <p className="truncate font-pmedium text-slate-900">
                            {tenantName(tenant)}
                          </p>
                          <p className="mt-0.5 truncate text-[9px] text-slate-400">
                            {tenant.email ||
                              tenant.pocDetails?.localPocEmail ||
                              "No email recorded"}
                          </p>
                        </td>
                        <td className="px-3 py-3">{tenantSector(tenant)}</td>
                        <td className="px-3 py-3 text-center">
                          {tenantEmployees(tenant)}
                        </td>
                        <td className="px-3 py-3">
                          {formatDate(
                            tenant.contractEndAt ||
                              tenant.contractEnd ||
                              tenant.agreementDetails?.endDate,
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-pmedium uppercase text-slate-600">
                            {normalizeDashboardLabel(tenantStatus(tenant)) ||
                              "Unknown"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-12 text-center text-[11px] text-slate-500"
                      >
                        No tenant companies recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </DashboardSection>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
