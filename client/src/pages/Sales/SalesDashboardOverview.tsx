/**
 * SalesDashboardOverview — the Sales manager's dashboard at /dashboard. Uses
 * the same visual language as the plan-wise and employee dashboards: the slate
 * outer shell + bordered inner frame, a blue-gradient greeting masthead,
 * today's attendance as the hero card, a "Sales Pulse" metric row, quick
 * actions, and the Sales activity panels below.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  LayoutDashboard,
  Magnet,
  ShoppingCart,
  Tag,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import BarGraph from "@/components/graphs/BarGraph";
import InsightDonutChart from "@/pages/Dashboard/FrontendDashboard/dashboard/InsightDonutChart";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { useFreshCurrentUser } from "@/hooks/useFreshCurrentUser";
import {
  ActivityPanel,
  EmptyState,
  MetricTile,
  PlanBadge,
  QuickActionTile,
  RecentItem,
  getGreeting,
  humanRelTime,
  statusBadgeColor,
} from "@/pages/Dashboard/FrontendDashboard/dashboard/DashboardShared";
import TodayAttendanceCard from "@/pages/Dashboard/FrontendDashboard/dashboard/TodayAttendanceCard";
import DepartmentBudgetPanel from "@/pages/Dashboard/FrontendDashboard/dashboard/DepartmentBudgetPanel";
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

const ViewAllButton = ({ route }: { route: string }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(route)}
      className="group inline-flex items-center gap-1 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]"
    >
      View all
      <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
    </button>
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

      {/* Sales Pulse — the metrics that matter most */}
      <div data-tour="sales-overview">
        <section className="rounded-[1.75rem] border border-blue-100 bg-[#F8FAFD] p-5 shadow-[0_12px_34px_rgba(30,61,115,0.06)] sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E3D73] text-white shadow-sm">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
                Pipeline
              </p>
              <h3 className="mt-0.5 text-lg font-pmedium text-[#1E3D73]">
                Sales Pulse
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile icon={Magnet} label="Website Leads" value={totalLeads} sub={`${newLeadsCount} new · uncontacted`} route="/department-accesses/sales-department/leads-management" color="#2563EB" />
            <MetricTile icon={Building2} label="Tenant Companies" value={totalTenants} sub={`${activeTenantsCount} active`} route="/department-accesses/sales-department/tenant-companies" color="#0891b2" />
            <MetricTile icon={Tag} label="Pricing Packages" value={totalPackages} sub={`${activePackagesCount} active`} route="/department-accesses/sales-department/resource-pricing" color="#7c3aed" />
            <MetricTile icon={CheckCircle2} label="Contacted Leads" value={contactedLeadsCount} sub={`${contactedPercent}% of total leads`} route="/department-accesses/sales-department/leads-management" color="#22c55e" />
            <MetricTile icon={Eye} label="Visitors Today" value={dailyVisitors.length} sub={`${liveVisitors.length} checked in`} route="/visitors/visitor-management" color="#80bf01" />
          </div>
        </section>
      </div>

      {/* Team status, live visitors and recent leads — a fixed trio */}
      <div data-tour="sales-team-activity" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TeamLiveStatusCard department="sales" viewAllRoute="/department-accesses/sales-department/leads-management" />

        <DepartmentVisitorsCard department="sales" title="Sales Visitors" />

        <ActivityPanel
          eyebrow="New enquiries"
          title="Recent Website Leads"
          action={<ViewAllButton route="/department-accesses/sales-department/leads-management" />}
        >
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
            <EmptyState icon={Magnet} title="No website leads yet" description="New enquiries will show up here as they arrive." actionLabel="Open Leads" route="/department-accesses/sales-department/leads-management" />
          )}
        </ActivityPanel>
      </div>

      {/* Quick actions */}
      <div data-tour="sales-quick-links">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 shadow-[0_12px_34px_rgba(37,99,235,0.08)] sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70" />
          <div className="relative mb-5">
            <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
              Jump back in
            </p>
            <h3 className="mt-1 text-lg font-pmedium text-[#1E3D73]">
              Quick Actions
            </h3>
            <p className="mt-1 text-xs font-pmedium text-slate-500">
              The Sales modules you use most, one click away.
            </p>
          </div>
          <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <QuickActionTile icon={Magnet} label="Leads Management" description="Track & convert leads" route="/department-accesses/sales-department/leads-management" color="#2563EB" />
            <QuickActionTile icon={Building2} label="Tenant Companies" description="Manage tenant accounts" route="/department-accesses/sales-department/tenant-companies" color="#0891b2" />
            <QuickActionTile icon={Tag} label="Resource & Pricing" description="Packages & resource rates" route="/department-accesses/sales-department/resource-pricing" color="#7c3aed" />
            <QuickActionTile icon={ShoppingCart} label="Sales Architecture" description="Space & resource assignment" route="/department-accesses/sales-department/sales-architecture" color="#f59e0b" />
          </div>
        </section>
      </div>

      {/* Recent activity — uncontacted leads, tenants needing attention, and
          recent visitors each get their own bounded row so a highlight never
          spans more than one pair. */}
      <div data-tour="sales-uncontacted-leads" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ActivityPanel
          eyebrow="Follow-ups"
          title="Uncontacted Leads"
          action={<ViewAllButton route="/department-accesses/sales-department/leads-management" />}
        >
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
            <EmptyState icon={Magnet} title="No uncontacted leads" description="Leads awaiting a first follow-up will show up here." actionLabel="Open Leads" route="/department-accesses/sales-department/leads-management" />
          )}
        </ActivityPanel>

        <ActivityPanel eyebrow="Breakdown" title="Lead Status">
          <div className="flex min-h-48 flex-1 items-center justify-center">
            {leadStatusDonut.series.some((value) => value > 0) ? (
              <InsightDonutChart centerLabel="Leads" labels={leadStatusDonut.labels} colors={leadStatusDonut.colors} series={leadStatusDonut.series} tooltipValue={leadStatusDonut.series.map(String)} />
            ) : (
              <p className="text-content font-pmedium text-slate-400">No leads yet</p>
            )}
          </div>
        </ActivityPanel>
      </div>

      <div data-tour="sales-tenant-attention" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ActivityPanel
          eyebrow="Renewals"
          title="Tenants Needing Attention"
          action={<ViewAllButton route="/department-accesses/sales-department/tenant-companies" />}
        >
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
            <EmptyState icon={Building2} title="No tenants pending action" description="Tenants needing renewal or attention will show up here." actionLabel="Open Tenants" route="/department-accesses/sales-department/tenant-companies" />
          )}
        </ActivityPanel>

        <ActivityPanel eyebrow="Breakdown" title="Tenant Status">
          <div className="flex min-h-48 flex-1 items-center justify-center">
            {tenantStatusDonut.series.some((value) => value > 0) ? (
              <InsightDonutChart centerLabel="Tenants" labels={tenantStatusDonut.labels} colors={tenantStatusDonut.colors} series={tenantStatusDonut.series} tooltipValue={tenantStatusDonut.series.map(String)} />
            ) : (
              <p className="text-content font-pmedium text-slate-400">No tenants yet</p>
            )}
          </div>
        </ActivityPanel>
      </div>

      <div data-tour="sales-visitor-activity" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ActivityPanel
          eyebrow="Front desk"
          title="Recent Visitors"
          action={<ViewAllButton route="/visitors/visitor-management" />}
        >
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
            <EmptyState icon={Eye} title="No visitors logged today" description="Today's visitor check-ins will show up here." actionLabel="Open Visitors" route="/visitors/visitor-management" />
          )}
        </ActivityPanel>

        <ActivityPanel eyebrow="Breakdown" title="Visitor Type">
          <div className="flex min-h-48 flex-1 items-center justify-center">
            {visitorTypeDonut.series.some((value) => value > 0) ? (
              <InsightDonutChart centerLabel="Visitors" labels={visitorTypeDonut.labels} colors={visitorTypeDonut.colors} series={visitorTypeDonut.series} tooltipValue={visitorTypeDonut.series.map(String)} />
            ) : (
              <p className="text-content font-pmedium text-slate-400">No visitors yet</p>
            )}
          </div>
        </ActivityPanel>
      </div>

      <div data-tour="sales-lead-trend">
        <ActivityPanel eyebrow="Year at a glance" title="Monthly Lead Trend (FY)">
          <BarGraph chartId="sales-monthly-leads" data={monthlyBarSeries} options={monthlyBarOptions} height={260} />
        </ActivityPanel>
      </div>

      <DepartmentBudgetPanel department="Sales" title="Sales Budget vs Spend" />
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
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <div className="flex flex-col gap-5 rounded-xl border-default p-4">

        {/* Greeting card — same blue plan-card style used across the plan
            dashboards and the employee dashboard. */}
        <section
          data-tour="sales-greeting"
          className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 shadow-[0_12px_34px_rgba(37,99,235,0.08)] sm:p-6"
        >
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70" />
          <div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-blue-50/70" />
          <div className="relative flex min-w-0 items-start gap-4">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] ring-1 ring-blue-100 sm:flex">
              <LayoutDashboard size={21} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[9px] font-pmedium uppercase tracking-[0.22em] text-[#2563EB]">
                  Sales Unit dashboard
                </p>
                <PlanBadge plan={access.plan} />
              </div>
              <h2 className="mt-2 text-xl font-pmedium text-[#1E3D73] sm:text-2xl">
                {greeting} 👋
              </h2>
              <p className="mt-1 text-xs font-pmedium text-slate-500 sm:text-sm">
                {todayLabel}
                <WorkspaceClock
                  timezone={workspacePreferences.timezone}
                  location={workspacePreferences.location}
                />
              </p>
            </div>
          </div>
        </section>

        {/* Today's attendance — the hero card, same as the plan dashboards */}
        <div data-tour="sales-attendance">
          <TodayAttendanceCard variant="hero" />
        </div>

        <SalesDashboardWidgets />
      </div>
    </div>
  );
}

export default SalesDashboardOverview;
