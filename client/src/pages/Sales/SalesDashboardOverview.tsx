import { useEffect, useMemo, useState } from "react";
import {
  Magnet,
  Building2,
  Tag,
  ShoppingCart,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import PageFrame from "@/components/Pages/PageFrame";
import { DashboardAttendanceCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/TodayAttendanceCard";
import WidgetSection from "@/components/WidgetSection";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { useFreshCurrentUser } from "@/hooks/useFreshCurrentUser";
import {
  PlanBadge,
  StatCard,
  SectionCard,
  RecentItem,
  DonutWidget,
  BarWidget,
  QuickLink,
  getGreeting,
  humanRelTime,
  statusBadgeColor,
} from "@/pages/Dashboard/FrontendDashboard/dashboard/DashboardShared";
import { TeamLiveStatusCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/TeamLiveStatusCard";
import { DepartmentVisitorsCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/DepartmentVisitorsCard";
import { getWebsiteLeads } from "@/services/sales-leads";
import { getTenantCompanies } from "@/services/tenant-companies";
import { getPricingPackages } from "@/services/pricing-packages";
import { getVisitorManagementOverview } from "@/services/visitors";

/* ───────────────────────────── Types ───────────────────────────── */

interface WebsiteLeadRecord {
  id?: string;
  _id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  status?: string;
  createdAt?: string;
}

interface TenantCompanyRecord {
  id?: string;
  _id?: string;
  recordId?: string;
  companyName?: string;
  name?: string;
  companyCode?: string;
  sector?: string;
  status?: string;
  createdAt?: string;
}

interface PricingPackageRecord {
  id?: string;
  _id?: string;
  recordId?: string;
  packageCode?: string;
  name?: string;
  category?: string;
  price?: number;
  status?: string;
  durationMonths?: number;
  createdAt?: string;
}

interface VisitorRecord {
  id?: string;
  recordId?: string;
  fullName?: string;
  name?: string;
  purpose?: string;
  visitorType?: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  dateOfVisit?: string;
  createdAt?: string;
}

interface DashboardState {
  leads: WebsiteLeadRecord[];
  tenants: TenantCompanyRecord[];
  packages: PricingPackageRecord[];
  dailyVisitors: VisitorRecord[];
  liveVisitors: VisitorRecord[];
}

const DEFAULT_DASHBOARD: DashboardState = {
  leads: [],
  tenants: [],
  packages: [],
  dailyVisitors: [],
  liveVisitors: [],
};

/* ───────────────────────────── Helpers ───────────────────────────── */

function normalizeText(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

/* ───────────────────────────── Component ───────────────────────────── */

const WorkspaceClock = ({ timezone, location }: { timezone: string; location: string }) => {
  const [tick, setTick] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(tick);
    } catch {
      return "";
    }
  }, [tick, timezone]);

  if (!timeLabel) return null;

  return (
    <>
      {` | `}
      <span className="inline-block whitespace-nowrap" aria-label={timeLabel}>
        {timeLabel.split("").map((ch, i) =>
          /[0-9]/.test(ch) ? (
            <span key={i} className="inline-block w-[0.665em] text-center">
              {ch}
            </span>
          ) : (
            <span key={i}>{ch}</span>
          )
        )}
      </span>
      {location ? ` - ${location}` : ""}
    </>
  );
};

/**
 * Stat cards, charts, and quick links for the Sales dashboard — split out
 * from SalesDashboardOverview so AdminDashboardOverview can render this same
 * content for an Admin assigned to the Sales department, without the
 * department's own greeting/header banner.
 */
export function SalesDashboardWidgets() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardState>(DEFAULT_DASHBOARD);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const [leadsResponse, tenantsResponse, packagesResponse, visitorsResponse] = await Promise.allSettled([
          getWebsiteLeads(),
          getTenantCompanies(),
          getPricingPackages(),
          getVisitorManagementOverview(),
        ]);

        if (!isMounted) {
          return;
        }

        // getWebsiteLeads returns a raw axios response whose payload is the leads array itself.
        const leadsData = leadsResponse.status === "fulfilled" ? leadsResponse.value?.data : [];

        // listTenantCompanies responds with { tenants: [...] } at the top level.
        const tenantsPayload = tenantsResponse.status === "fulfilled" ? (tenantsResponse.value?.data as Record<string, unknown>) : null;
        const tenantsData = tenantsPayload
          ? (tenantsPayload as { tenants?: unknown; data?: { tenants?: unknown } | unknown }).tenants
            ?? (tenantsPayload as { data?: { tenants?: unknown } }).data?.tenants
            ?? (tenantsPayload as { data?: unknown }).data
            ?? tenantsPayload
          : [];

        const packagesPayload = packagesResponse.status === "fulfilled" ? (packagesResponse.value?.data as Record<string, unknown>) : null;
        const packagesData = packagesPayload
          ? (packagesPayload as { data?: { packages?: unknown } }).data?.packages
            ?? (packagesPayload as { packages?: unknown }).packages
          : [];

        const visitorsOverview = visitorsResponse.status === "fulfilled" ? (visitorsResponse.value as Record<string, unknown>) : undefined;

        setDashboard({
          leads: Array.isArray(leadsData) ? (leadsData as WebsiteLeadRecord[]) : [],
          tenants: Array.isArray(tenantsData) ? (tenantsData as TenantCompanyRecord[]) : [],
          packages: Array.isArray(packagesData) ? (packagesData as PricingPackageRecord[]) : [],
          dailyVisitors: Array.isArray(visitorsOverview?.dailyVisitors) ? (visitorsOverview.dailyVisitors as VisitorRecord[]) : [],
          liveVisitors: Array.isArray(visitorsOverview?.liveVisitors) ? (visitorsOverview.liveVisitors as VisitorRecord[]) : [],
        });

        const failures = [leadsResponse, tenantsResponse, packagesResponse, visitorsResponse].filter((result) => result.status === "rejected");
        setError(
          failures.length > 0
            ? ((failures[0] as PromiseRejectedResult).reason?.message || "Some sales data could not be loaded.")
            : "",
        );
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError((loadError as Error)?.message || "Unable to load sales overview.");
        setDashboard(DEFAULT_DASHBOARD);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const leads = dashboard.leads;
  const tenants = dashboard.tenants;
  const packages = dashboard.packages;
  const dailyVisitors = dashboard.dailyVisitors;
  const liveVisitors = dashboard.liveVisitors;

  const recentVisitors = useMemo(
    () => [...dailyVisitors]
      .sort((left, right) => new Date(right.checkInAt || right.dateOfVisit || right.createdAt || 0).getTime() - new Date(left.checkInAt || left.dateOfVisit || left.createdAt || 0).getTime())
      .slice(0, 5),
    [dailyVisitors],
  );

  const visitorTypeDonut = useMemo(() => {
    const map: Record<string, number> = {};
    dailyVisitors.forEach((v) => {
      const raw = String(v.visitorType || "standard");
      const type = raw.charAt(0).toUpperCase() + raw.slice(1);
      map[type] = (map[type] || 0) + 1;
    });
    const entries = Object.entries(map);
    const COLORS = ["#1E3D73", "#80bf01", "#2563EB", "#f59e0b", "#7c3aed"];
    return {
      series: entries.map(([, n]) => n),
      labels: entries.map(([t]) => t),
      colors: entries.map((_, i) => COLORS[i % COLORS.length]),
    };
  }, [dailyVisitors]);

  const totalLeads = leads.length;
  const newLeadsCount = leads.filter((lead) => normalizeText(lead.status || "Pending") === "pending").length;
  const contactedLeadsCount = leads.filter((lead) => normalizeText(lead.status).includes("contacted")).length;
  const contactedPercent = totalLeads > 0 ? Math.round((contactedLeadsCount / totalLeads) * 100) : 0;

  const totalTenants = tenants.length;
  const activeTenantsCount = tenants.filter((tenant) => normalizeText(tenant.status) === "active").length;

  const totalPackages = packages.length;
  const activePackagesCount = packages.filter((pkg) => normalizeText(pkg.status) === "active").length;

  const recentLeads = useMemo(
    () =>
      [...leads]
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
        .slice(0, 5),
    [leads],
  );


  const uncontactedLeads = useMemo(
    () =>
      leads
        .filter((lead) => normalizeText(lead.status || "Pending") === "pending")
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
        .slice(0, 5),
    [leads],
  );

  const attentionTenants = useMemo(
    () =>
      tenants
        .filter((tenant) => normalizeText(tenant.status) !== "active")
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
        .slice(0, 5),
    [tenants],
  );

  const leadStatusDonut = useMemo(() => {
    const buckets = { New: 0, Contacted: 0, Closed: 0, Rejected: 0 };
    leads.forEach((lead) => {
      const status = normalizeText(lead.status || "Pending");
      if (status.includes("contacted")) buckets.Contacted += 1;
      else if (status.includes("closed")) buckets.Closed += 1;
      else if (status.includes("rejected")) buckets.Rejected += 1;
      else buckets.New += 1;
    });
    return {
      series: [buckets.New, buckets.Contacted, buckets.Closed, buckets.Rejected],
      labels: ["New", "Contacted", "Closed", "Rejected"],
      colors: ["#2563EB", "#f59e0b", "#22c55e", "#ef4444"],
    };
  }, [leads]);

  const tenantStatusDonut = useMemo(() => {
    const buckets = { Active: 0, "Expiring Soon": 0, "Pending/Expired": 0 };
    tenants.forEach((tenant) => {
      const status = normalizeText(tenant.status);
      if (status === "active") buckets.Active += 1;
      else if (status.includes("expiring")) buckets["Expiring Soon"] += 1;
      else buckets["Pending/Expired"] += 1;
    });
    return {
      series: [buckets.Active, buckets["Expiring Soon"], buckets["Pending/Expired"]],
      labels: ["Active", "Expiring Soon", "Pending/Expired"],
      colors: ["#22c55e", "#f59e0b", "#94a3b8"],
    };
  }, [tenants]);

  const monthLabels = useMemo(() => {
    const labels: string[] = [];
    const anchor = new Date();
    for (let i = 11; i >= 0; i -= 1) {
      const monthStart = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      labels.push(monthStart.toLocaleDateString("en-US", { month: "short" }));
    }
    return labels;
  }, []);

  const leadsByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    const anchor = new Date();
    leads.forEach((lead) => {
      const parsed = new Date(String(lead.createdAt || ""));
      if (Number.isNaN(parsed.getTime())) return;
      const diffMonths = (anchor.getFullYear() - parsed.getFullYear()) * 12 + (anchor.getMonth() - parsed.getMonth());
      const index = 11 - diffMonths;
      if (index >= 0 && index < 12) counts[index] += 1;
    });
    return counts;
  }, [leads]);

  const monthlyBarSeries = useMemo(() => [{ name: "Website Leads", data: leadsByMonth }], [leadsByMonth]);

  const monthlyBarOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
      plotOptions: { bar: { borderRadius: 4, columnWidth: "45%" } },
      dataLabels: { enabled: false },
      grid: { borderColor: "#f0f0f0" },
      xaxis: { categories: monthLabels },
      colors: ["#2563EB"],
      stroke: { show: true, width: 2, colors: ["transparent"] },
      tooltip: { theme: "light" },
    }),
    [monthLabels],
  );

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700">
          {error}
        </div>
      ) : null}

      {/* Overview — only the metrics that matter */}
      <WidgetSection layout={5} title="Overview" border normalCase>
        <StatCard icon={Magnet} label="Website Leads" value={totalLeads} sub={`${newLeadsCount} new · uncontacted`} color="#2563EB" route="/department-accesses/sales-department/leads-management" />
        <StatCard icon={Building2} label="Tenant Companies" value={totalTenants} sub={`${activeTenantsCount} active`} color="#0891b2" route="/department-accesses/sales-department/tenant-companies" />
        <StatCard icon={Tag} label="Pricing Packages" value={totalPackages} sub={`${activePackagesCount} active`} color="#7c3aed" route="/department-accesses/sales-department/resource-pricing" />
        <StatCard icon={CheckCircle2} label="Contacted Leads" value={contactedLeadsCount} sub={`${contactedPercent}% of total leads`} color="#22c55e" route="/department-accesses/sales-department/leads-management" />
        <StatCard icon={Eye} label="Visitors Today" value={dailyVisitors.length} sub={`${liveVisitors.length} checked in`} color="#80bf01" route="/visitors/visitor-management" />
      </WidgetSection>

      {/* Team status, live visitors and recent leads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TeamLiveStatusCard department="sales" viewAllRoute="/department-accesses/sales-department/leads-management" />

        <DepartmentVisitorsCard department="sales" title="Sales Visitors" />

        <SectionCard title="Recent Website Leads" linkLabel="View all" linkRoute="/department-accesses/sales-department/leads-management">
          <div className="space-y-3">
            {recentLeads.length > 0 ? recentLeads.map((lead, index) => (
              <RecentItem
                key={lead.id || lead._id || index}
                title={lead.name || lead.fullName || "Lead"}
                sub={lead.email || lead.phone || "No contact info"}
                badge={lead.status || "Pending"}
                badgeColor={statusBadgeColor(lead.status || "Pending")}
                time={humanRelTime(lead.createdAt || "")}
              />
            )) : (
              <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No website leads yet</p></div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Quick links */}
      <WidgetSection layout={4} title="Quick Links" border normalCase>
        <QuickLink icon={Magnet} label="Leads Management" description="Track & convert leads" route="/department-accesses/sales-department/leads-management" color="#2563EB" />
        <QuickLink icon={Building2} label="Tenant Companies" description="Manage tenant accounts" route="/department-accesses/sales-department/tenant-companies" color="#0891b2" />
        <QuickLink icon={Tag} label="Resource & Pricing" description="Packages & resource rates" route="/department-accesses/sales-department/resource-pricing" color="#7c3aed" />
        <QuickLink icon={ShoppingCart} label="Sales Architecture" description="Space & resource assignment" route="/department-accesses/sales-department/sales-architecture" color="#f59e0b" />
      </WidgetSection>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Uncontacted Leads" linkLabel="View all" linkRoute="/department-accesses/sales-department/leads-management">
          {uncontactedLeads.length > 0 ? uncontactedLeads.map((lead, index) => (
            <RecentItem
              key={lead.id || lead._id || index}
              title={lead.name || lead.fullName || "Lead"}
              sub={lead.email || lead.phone || "No contact info"}
              badge={lead.status || "Pending"}
              badgeColor={statusBadgeColor(lead.status || "Pending")}
              time={humanRelTime(lead.createdAt || "")}
            />
          )) : (
            <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No uncontacted leads</p></div>
          )}
        </SectionCard>

        <DonutWidget
          title="Lead Status"
          series={leadStatusDonut.series}
          labels={leadStatusDonut.labels}
          colors={leadStatusDonut.colors}
          centerLabel="Leads"
        />

        <SectionCard title="Tenants Needing Attention" linkLabel="View all" linkRoute="/department-accesses/sales-department/tenant-companies">
          {attentionTenants.length > 0 ? attentionTenants.map((tenant, index) => (
            <RecentItem
              key={tenant.recordId || tenant.id || tenant._id || index}
              title={tenant.companyName || tenant.name || "Tenant"}
              sub={tenant.companyCode || tenant.sector || "Tenant company"}
              badge={tenant.status || "Pending"}
              badgeColor={statusBadgeColor(tenant.status || "")}
              time={humanRelTime(tenant.createdAt || "")}
            />
          )) : (
            <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No tenants pending action</p></div>
          )}
        </SectionCard>

        <DonutWidget
          title="Tenant Status"
          series={tenantStatusDonut.series}
          labels={tenantStatusDonut.labels}
          colors={tenantStatusDonut.colors}
          centerLabel="Tenants"
        />

        <SectionCard title="Recent Visitors" linkLabel="View all" linkRoute="/visitors/visitor-management">
          {recentVisitors.length > 0 ? recentVisitors.map((v, index) => (
            <RecentItem
              key={v.id || v.recordId || index}
              title={v.fullName || v.name || "Visitor"}
              sub={v.purpose || v.visitorType || "—"}
              badge={v.checkInAt && !v.checkOutAt ? "Checked In" : v.checkOutAt ? "Checked Out" : "Logged"}
              badgeColor={statusBadgeColor(v.checkInAt && !v.checkOutAt ? "active" : "completed")}
              time={humanRelTime(v.checkInAt || v.dateOfVisit || v.createdAt || "")}
            />
          )) : (
            <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No visitors logged today</p></div>
          )}
        </SectionCard>

        <DonutWidget
          title="Visitor Type"
          series={visitorTypeDonut.series}
          labels={visitorTypeDonut.labels}
          colors={visitorTypeDonut.colors}
          centerLabel="Visitors"
        />
      </div>

      <BarWidget
        title="Monthly Lead Trend (FY)"
        chartId="sales-monthly-leads"
        series={monthlyBarSeries}
        options={monthlyBarOptions}
        height={260}
      />
    </div>
  );
}

export function SalesDashboardOverview() {
  const currentUser = useFreshCurrentUser();
  const access = useDashboardAccess();
  const workspacePreferences = useWorkspacePreferences();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setNow(new Date());
  }, [workspacePreferences.timezone]);

  const managerName = useMemo(() => {
    const full = `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim();
    return full || currentUser?.fullName || currentUser?.name || currentUser?.displayName || "Sales Manager";
  }, [currentUser]);

  const { greeting, todayLabel } = useMemo(() => {
    const timezone = workspacePreferences.timezone;

    try {
      const hourPart = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(now)
        .find((part) => part.type === "hour")?.value;
      const workspaceHour = Number(hourPart);

      return {
        greeting: `${getGreeting(Number.isFinite(workspaceHour) ? workspaceHour : now.getHours())}, ${managerName}`,
        todayLabel: new Intl.DateTimeFormat("en-IN", {
          timeZone: timezone,
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(now),
      };
    } catch {
      return {
        greeting: `${getGreeting(now.getHours())}, ${managerName}`,
        todayLabel: now.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      };
    }
  }, [managerName, now, workspacePreferences.timezone]);

  return (
    <div className="p-4 flex flex-col gap-5">
      {/* Greeting banner */}
      <PageFrame>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-title font-pmedium text-primary uppercase">Sales Dashboard</h2>
              <PlanBadge plan={access.plan} />
            </div>
            <p className="text-subtitle font-pmedium text-gray-700">{greeting} 👋</p>
            <p className="text-content font-pmedium text-gray-700">{todayLabel}<WorkspaceClock timezone={workspacePreferences.timezone} location={workspacePreferences.location} /></p>
          </div>
        </div>
      </PageFrame>

      <DashboardAttendanceCard />

      <SalesDashboardWidgets />
    </div>
  );
}

export default SalesDashboardOverview;
