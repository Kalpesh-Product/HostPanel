import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Monitor,
  Tag,
  Users,
  XCircle,
} from "lucide-react";
import PageFrame from "../../../components/Pages/PageFrame";
import DashboardModuleCard from "../../../components/DashboardModuleCard";
import DonutChart from "../../../components/graphs/DonutChart";
import resourcePricingBannerImage from "../../../assets/coworking-banner.jpg";
import useWorkspacePreferences from "../../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../../lib/workspaceLocalization";
import { getResources } from "../../../services/resources";
import { getPricingPackages } from "../../../services/pricing-packages";

type ResourceRecord = {
  resourceCategory?: string;
  status?: string;
};

type PackageRecord = {
  category?: string;
  status?: string;
  price?: number;
  totalContractValue?: number;
  assignedTenantCompanyId?: string | null;
};

const RESOURCE_CATEGORY_LABELS: Record<string, string> = {
  open_desk: "Open Desk",
  cabin_desk: "Cabin Desk",
  meeting_room: "Meeting Room",
  conference_room: "Conference Room",
  virtual_office: "Virtual Office",
  room: "Room",
  dorm: "Dorm",
};

const DONUT_PALETTE = ["#1E3D73", "#2563EB", "#3b82f6", "#60a5fa", "#93c5fd", "#64748B", "#7C3AED"];

const normalize = (value: unknown) => String(value || "").trim().toLowerCase();

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[320px] items-center justify-center px-6 text-center text-[11px] text-[#7B89A6]">
      {children}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">{title}</h2>
        {subtitle ? <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
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
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${statuses[status]}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-1 text-[22px] font-pmedium leading-none text-slate-900">{value}</p>
        {sub ? <p className="mt-2 truncate text-[10px] text-slate-500">{sub}</p> : null}
      </div>
    </div>
  );
}

export default function ResourcePricingDashboard() {
  const workspacePreferences = useWorkspacePreferences();
  const currency = (value: number) =>
    formatWorkspaceCurrency(Number(value || 0), workspacePreferences.currency, { maximumFractionDigits: 0 });

  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([getResources(), getPricingPackages()])
      .then(([resourceResponse, packageResponse]) => {
        if (cancelled) return;
        setResources(resourceResponse?.data?.data?.resources || resourceResponse?.data?.resources || []);
        setPackages(packageResponse?.data?.data?.packages || packageResponse?.data?.packages || []);
        setLoadError("");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("Resource and pricing data could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const active = resources.filter((resource) => normalize(resource.status) === "active").length;
    const maintenance = resources.filter((resource) => normalize(resource.status) === "under maintenance").length;
    const disabled = resources.filter((resource) => normalize(resource.status) === "disabled").length;
    const activePackages = packages.filter((pkg) => normalize(pkg.status) === "active").length;
    const tenantPackages = packages.filter((pkg) => pkg.category === "Tenant").length;
    const assignedTenantPackages = packages.filter((pkg) => pkg.category === "Tenant" && pkg.assignedTenantCompanyId).length;
    return { active, maintenance, disabled, activePackages, tenantPackages, assignedTenantPackages };
  }, [resources, packages]);

  const resourceCategoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    resources.forEach((resource) => {
      const label = RESOURCE_CATEGORY_LABELS[resource.resourceCategory || ""] || "Unassigned";
      map.set(label, (map.get(label) || 0) + 1);
    });
    return [...map.entries()].sort((left, right) => right[1] - left[1]);
  }, [resources]);

  const resourceStatusBreakdown = useMemo(() => {
    const buckets = { Active: 0, "Under Maintenance": 0, Disabled: 0 };
    resources.forEach((resource) => {
      const status = normalize(resource.status);
      if (status === "active") buckets.Active += 1;
      else if (status === "under maintenance") buckets["Under Maintenance"] += 1;
      else buckets.Disabled += 1;
    });
    return Object.entries(buckets).filter(([, value]) => value > 0);
  }, [resources]);

  const packageCategoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    packages.forEach((pkg) => {
      const label = pkg.category || "Membership";
      map.set(label, (map.get(label) || 0) + 1);
    });
    return [...map.entries()].sort((left, right) => right[1] - left[1]);
  }, [packages]);

  const averagePackagePrice = useMemo(() => {
    const prices = packages.map((pkg) => Number(pkg.price ?? pkg.totalContractValue ?? 0)).filter((value) => value > 0);
    return prices.length ? prices.reduce((sum, value) => sum + value, 0) / prices.length : 0;
  }, [packages]);

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={resourcePricingBannerImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 h-full w-full object-cover object-center sm:w-[64%]"
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 w-full overflow-hidden bg-gradient-to-br from-[#2563EB]/55 via-[#3b82f6]/35 to-[#60a5fa]/20 sm:w-[64%]"
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            >
              <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-full bg-white/90 sm:w-[66%]"
              style={{
                WebkitMaskImage: "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
                maskImage: "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
              }}
            />
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[58%]">
              <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[22px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[28px]">
                <span className="text-primary">Resource & Pricing</span> <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
                Inventory, pricing, credits, and tenant packages across every resource category.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Resources", "Pricing", "Credits", "Packages"].map((tag) => (
                  <span key={tag} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="absolute right-6 top-5 z-10 rounded-lg border border-white/25 bg-white/15 px-3 py-2 backdrop-blur-sm">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">Total resources</p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">{resources.length}</p>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-pmedium text-amber-800">
            <AlertTriangle size={16} />
            {loadError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }, (_, key) => (
              <div key={key} className="h-[112px] animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatTile icon={<Monitor size={20} />} label="Total resources" value={resources.length} sub="Every priced resource in the workspace" />
            <StatTile icon={<CheckCircle2 size={20} />} label="Active resources" value={stats.active} sub="Available for booking or assignment" status="success" />
            <StatTile icon={<AlertTriangle size={20} />} label="Under maintenance" value={stats.maintenance} sub="Temporarily unavailable" status={stats.maintenance ? "attention" : "success"} />
            <StatTile icon={<XCircle size={20} />} label="Disabled resources" value={stats.disabled} sub="Removed from availability" status={stats.disabled ? "attention" : "success"} />
            <StatTile icon={<Tag size={20} />} label="Active packages" value={stats.activePackages} sub={`${packages.length} total packages`} />
            <StatTile icon={<Users size={20} />} label="Tenant packages assigned" value={`${stats.assignedTenantPackages} / ${stats.tenantPackages}`} sub="Tenant packages currently assigned to a company" />
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3">
            <p className="text-sm font-pmedium text-slate-900">Manage resources & pricing</p>
            <p className="mt-1 text-[10px] font-pmedium text-slate-500">Open the full resource register or the tenant package list.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <DashboardModuleCard
              icon={<Monitor size={19} />}
              title="Resources"
              route="/department-accesses/sales-department/resource-pricing/list"
              state={{ tab: "resource" }}
              description="Pricing, credits, and availability by category"
              color="#2563EB"
            />
            <DashboardModuleCard
              icon={<Tag size={19} />}
              title="Tenant Packages"
              route="/department-accesses/sales-department/resource-pricing/list"
              state={{ tab: "tenant" }}
              description="Membership and tenant package plans"
              color="#7C3AED"
            />
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard title="Resources by Category" subtitle="Every priced resource grouped by category.">
                {resourceCategoryBreakdown.length ? (
                  <DonutChart
                    centerLabel="Resources"
                    labels={resourceCategoryBreakdown.map(([label]) => label)}
                    series={resourceCategoryBreakdown.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, resourceCategoryBreakdown.length)}
                    tooltipValue={resourceCategoryBreakdown.map(([, value]) => `${value} resources`)}
                    wrapLabels
                  />
                ) : (
                  <Empty>No resources are available yet.</Empty>
                )}
              </ChartCard>
              <ChartCard title="Resource Status" subtitle="Every resource grouped by availability status.">
                {resourceStatusBreakdown.length ? (
                  <DonutChart
                    centerLabel="Resources"
                    labels={resourceStatusBreakdown.map(([label]) => label)}
                    series={resourceStatusBreakdown.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, resourceStatusBreakdown.length)}
                    tooltipValue={resourceStatusBreakdown.map(([, value]) => `${value} resources`)}
                  />
                ) : (
                  <Empty>No resource-status data is available yet.</Empty>
                )}
              </ChartCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard title="Packages by Category" subtitle="Every pricing package grouped by category.">
                {packageCategoryBreakdown.length ? (
                  <DonutChart
                    centerLabel="Packages"
                    labels={packageCategoryBreakdown.map(([label]) => label)}
                    series={packageCategoryBreakdown.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, packageCategoryBreakdown.length)}
                    tooltipValue={packageCategoryBreakdown.map(([, value]) => `${value} packages`)}
                  />
                ) : (
                  <Empty>No packages are available yet.</Empty>
                )}
              </ChartCard>
              <ChartCard title="Pricing Snapshot">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                    <span className="text-[11px] font-pmedium text-slate-600">Average package price</span>
                    <span className="text-[13px] font-pmedium text-slate-900">{currency(averagePackagePrice)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                    <span className="text-[11px] font-pmedium text-slate-600">Active packages</span>
                    <span className="text-[13px] font-pmedium text-slate-900">{stats.activePackages} / {packages.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                    <span className="text-[11px] font-pmedium text-slate-600">Tenant packages assigned</span>
                    <span className="text-[13px] font-pmedium text-slate-900">{stats.assignedTenantPackages} / {stats.tenantPackages}</span>
                  </div>
                </div>
              </ChartCard>
            </div>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
