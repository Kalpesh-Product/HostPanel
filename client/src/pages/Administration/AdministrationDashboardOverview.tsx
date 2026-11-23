/**
 * AdministrationDashboardOverview — the Administration manager's dashboard at
 * /dashboard. Uses the same visual language as the plan-wise and employee
 * dashboards: the slate outer shell + bordered inner frame, a blue-gradient
 * greeting masthead, today's attendance as the hero card, an "Administration
 * Pulse" metric row, quick actions, and the Administration activity panels.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarCheck,
  ContactRound,
  Eye,
  HandCoins,
  LayoutDashboard,
  Wrench,
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
import { getStoredUser } from "@/lib/auth-session";
import { getTenantCompanies } from "@/services/tenant-companies";
import { getMeetingRoomBookings } from "@/services/meeting-room-bookings";
import { getResources } from "@/services/resources";
import { getHousekeepingOverview } from "@/services/housekeeping";
import { getVisitorManagementOverview } from "@/services/visitors";

/* ───────────────────────────── Types ───────────────────────────── */

interface TenantRecord {
  id?: string;
  recordId?: string;
  _id?: string;
  companyName?: string;
  name?: string;
  companyCode?: string;
  status?: string;
  createdAt?: string;
  endDate?: string;
}

interface BookingRecord {
  id?: string;
  recordId?: string;
  _id?: string;
  bookedByName?: string;
  clientName?: string;
  roomName?: string;
  resourceName?: string;
  status?: string;
  date?: string;
  startDate?: string;
  createdAt?: string;
}

interface ResourceRecord {
  id?: string;
  recordId?: string;
  _id?: string;
  name?: string;
  resourceCode?: string;
  type?: string;
  resourceCategory?: string;
  status?: string;
  currentlyBooked?: boolean;
  assignedTenantCompanyId?: string | null;
  assignedTenantCompanyName?: string;
  createdAt?: string;
}

interface HousekeepingTaskRecord {
  id?: string;
  taskCode?: string;
  taskName?: string;
  taskType?: string;
  sourceType?: string;
  area?: string;
  floor?: string;
  wing?: string;
  assignedTo?: string;
  status?: string;
  roomName?: string;
  completedAt?: string;
  createdAt?: string;
}

interface HousekeepingSummary {
  pendingTasks?: number;
  activeTasks?: number;
  completedToday?: number;
  bookingTriggers?: number;
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
  statusKey?: string;
  status?: string;
}

interface DashboardState {
  tenants: TenantRecord[];
  bookings: BookingRecord[];
  resources: ResourceRecord[];
  housekeepingTasks: HousekeepingTaskRecord[];
  housekeepingSummary: HousekeepingSummary;
  dailyVisitors: VisitorRecord[];
  liveVisitors: VisitorRecord[];
}

const DEFAULT_DASHBOARD: DashboardState = {
  tenants: [],
  bookings: [],
  resources: [],
  housekeepingTasks: [],
  housekeepingSummary: {},
  dailyVisitors: [],
  liveVisitors: [],
};

/* ───────────────────────────── Helpers ───────────────────────────── */

function normalizeText(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function todayKeyLocal(): string {
  return new Date().toISOString().slice(0, 10);
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
 * Stat cards, charts, and quick links for the Administration dashboard —
 * split out from AdministrationDashboardOverview so AdminDashboardOverview
 * can render this same content for an Admin assigned to the Administration
 * department, without the department's own greeting/header banner.
 */
export function AdministrationDashboardWidgets() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardState>(DEFAULT_DASHBOARD);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const storedUser = getStoredUser();
        const dashboardWorkspaceId = String(
          storedUser?.workspaceMembership?.workspaceId ||
          storedUser?.workspaceMembership?.workspace ||
          storedUser?.primaryWorkspace ||
          storedUser?.workspace?.id ||
          storedUser?.workspaceId ||
          "",
        );

        const [tenantsResponse, bookingsResponse, resourcesResponse, housekeepingResponse, visitorsResponse] = await Promise.allSettled([
          getTenantCompanies(),
          dashboardWorkspaceId ? getMeetingRoomBookings(dashboardWorkspaceId) : Promise.resolve(null),
          getResources(),
          getHousekeepingOverview(),
          getVisitorManagementOverview(),
        ]);

        if (!isMounted) {
          return;
        }

        // getTenantCompanies returns a raw axios response -> tenants live under .data.tenants
        const tenantsBody = tenantsResponse.status === "fulfilled" ? (tenantsResponse.value as { data?: unknown })?.data : undefined;
        const tenantsBodyRecord = (tenantsBody || {}) as Record<string, unknown>;
        const tenantsNested = (tenantsBodyRecord.data || {}) as Record<string, unknown>;
        const tenants = Array.isArray(tenantsBodyRecord.tenants)
          ? tenantsBodyRecord.tenants
          : Array.isArray(tenantsNested.tenants)
            ? tenantsNested.tenants
            : Array.isArray(tenantsBodyRecord.data)
              ? tenantsBodyRecord.data
              : Array.isArray(tenantsBody)
                ? tenantsBody
                : [];

        const bookingsBody = bookingsResponse.status === "fulfilled" ? bookingsResponse.value : null;
        const bookingsBodyRecord = (bookingsBody || {}) as Record<string, unknown>;
        const bookings = Array.isArray(bookingsBodyRecord.bookings)
          ? bookingsBodyRecord.bookings
          : Array.isArray(bookingsBody)
            ? bookingsBody
            : [];

        // getResources returns a raw axios response -> resources live under .data.data.resources
        const resourcesBody = resourcesResponse.status === "fulfilled" ? (resourcesResponse.value as { data?: unknown })?.data : undefined;
        const resourcesBodyRecord = (resourcesBody || {}) as Record<string, unknown>;
        const resourcesNested = (resourcesBodyRecord.data || {}) as Record<string, unknown>;
        const resources = Array.isArray(resourcesNested.resources)
          ? resourcesNested.resources
          : Array.isArray(resourcesBodyRecord.resources)
            ? resourcesBodyRecord.resources
            : Array.isArray(resourcesBody)
              ? resourcesBody
              : [];

        const housekeepingData = housekeepingResponse.status === "fulfilled" ? (housekeepingResponse.value as { data?: Record<string, unknown> })?.data : undefined;

        const visitorsOverview = visitorsResponse.status === "fulfilled" ? (visitorsResponse.value as Record<string, unknown>) : undefined;

        setDashboard({
          tenants: (Array.isArray(tenants) ? tenants : []) as TenantRecord[],
          bookings: (Array.isArray(bookings) ? bookings : []) as BookingRecord[],
          resources: (Array.isArray(resources) ? resources : []) as ResourceRecord[],
          housekeepingTasks: Array.isArray(housekeepingData?.tasks) ? (housekeepingData.tasks as HousekeepingTaskRecord[]) : [],
          housekeepingSummary: (housekeepingData?.summary as HousekeepingSummary) || {},
          dailyVisitors: Array.isArray(visitorsOverview?.dailyVisitors) ? (visitorsOverview.dailyVisitors as VisitorRecord[]) : [],
          liveVisitors: Array.isArray(visitorsOverview?.liveVisitors) ? (visitorsOverview.liveVisitors as VisitorRecord[]) : [],
        });

        const failures = [tenantsResponse, bookingsResponse, resourcesResponse, housekeepingResponse, visitorsResponse].filter((result) => result.status === "rejected");
        setError(failures.length > 0 ? ((failures[0] as PromiseRejectedResult).reason?.message || "Some Administration data could not be loaded.") : "");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError((loadError as Error)?.message || "Unable to load Administration overview.");
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

  const tenants = dashboard.tenants;
  const bookings = dashboard.bookings;
  const resources = dashboard.resources;
  const housekeepingTasks = dashboard.housekeepingTasks;
  const housekeepingSummary = dashboard.housekeepingSummary;
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

  const tenantStats = useMemo(() => {
    const statusOf = (t: TenantRecord) => normalizeText(t.status);
    const active = tenants.filter((t) => statusOf(t) === "active").length;
    const expiringSoon = tenants.filter((t) => statusOf(t).includes("expiring")).length;
    const pending = tenants.filter((t) => statusOf(t).includes("pending") || statusOf(t) === "expired").length;
    return { total: tenants.length, active, expiringSoon, pending };
  }, [tenants]);

  const bookingStats = useMemo(() => {
    const todayStr = todayKeyLocal();
    const statusOf = (b: BookingRecord) => normalizeText(b.status);
    const confirmed = bookings.filter((b) => statusOf(b) === "confirmed").length;
    const pending = bookings.filter((b) => statusOf(b) === "pending").length;
    const cancelled = bookings.filter((b) => statusOf(b) === "cancelled").length;
    const confirmedToday = bookings.filter((b) => statusOf(b) === "confirmed" && String(b.date || b.startDate || b.createdAt || "").startsWith(todayStr)).length;
    return { total: bookings.length, confirmed, pending, cancelled, confirmedToday };
  }, [bookings]);

  const resourceStats = useMemo(() => {
    const statusOf = (r: ResourceRecord) => normalizeText(r.status);
    const active = resources.filter((r) => statusOf(r) === "active").length;
    const inUse = resources.filter((r) => Boolean(r.currentlyBooked) || Boolean(r.assignedTenantCompanyId)).length;
    const maintenance = resources.filter((r) => statusOf(r).includes("maintenance")).length;
    return { total: resources.length, active, inUse, maintenance };
  }, [resources]);

  const pendingHousekeeping = Number(housekeepingSummary.pendingTasks || 0);
  const activeHousekeeping = Number(housekeepingSummary.activeTasks || 0);

  const housekeepingQueue = useMemo(() => {
    const statusOrder: Record<string, number> = {
      pending: 0,
      assigned: 1,
      "in progress": 2,
      completed: 3,
      cancelled: 4,
    };
    return [...housekeepingTasks]
      .filter((task) => normalizeText(task.status) !== "cancelled")
      .sort((left, right) => {
        const leftOrder = statusOrder[normalizeText(left.status)] ?? 99;
        const rightOrder = statusOrder[normalizeText(right.status)] ?? 99;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
      })
      .slice(0, 5);
  }, [housekeepingTasks]);


  const monthLabels = useMemo(() => {
    const labels: string[] = [];
    const anchor = new Date();
    for (let i = 11; i >= 0; i -= 1) {
      const monthStart = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      labels.push(monthStart.toLocaleDateString("en-US", { month: "short" }));
    }
    return labels;
  }, []);

  const bookingsByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    const anchor = new Date();
    bookings.forEach((booking) => {
      const parsed = new Date(String(booking.date || booking.startDate || booking.createdAt || ""));
      if (Number.isNaN(parsed.getTime())) return;
      const diffMonths = (anchor.getFullYear() - parsed.getFullYear()) * 12 + (anchor.getMonth() - parsed.getMonth());
      const index = 11 - diffMonths;
      if (index >= 0 && index < 12) counts[index] += 1;
    });
    return counts;
  }, [bookings]);

  const monthlyBarSeries = useMemo(() => [{ name: "Bookings", data: bookingsByMonth }], [bookingsByMonth]);

  const monthlyBarOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
      plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
      dataLabels: { enabled: false },
      grid: { borderColor: "#f0f0f0" },
      xaxis: { categories: monthLabels },
      colors: ["#2563EB"],
      stroke: { show: true, width: 2, colors: ["transparent"] },
      tooltip: { theme: "light" },
    }),
    [monthLabels],
  );

  const tenantStatusDonut = useMemo(
    () => ({
      series: [tenantStats.active, tenantStats.pending, tenantStats.expiringSoon],
      labels: ["Active", "Pending/Expired", "Expiring Soon"],
      colors: ["#1E3D73", "#80bf01", "#f59e0b"],
    }),
    [tenantStats],
  );

  const bookingStatusDonut = useMemo(
    () => ({
      series: [bookingStats.confirmed, bookingStats.pending, bookingStats.cancelled],
      labels: ["Confirmed", "Pending", "Cancelled"],
      colors: ["#22c55e", "#f59e0b", "#ef4444"],
    }),
    [bookingStats],
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

      {/* Administration Pulse — the metrics that matter most */}
      <div data-tour="administration-overview">
        <section className="rounded-[1.75rem] border border-blue-100 bg-[#F8FAFD] p-5 shadow-[0_12px_34px_rgba(30,61,115,0.06)] sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E3D73] text-white shadow-sm">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
                Operations
              </p>
              <h3 className="mt-0.5 text-lg font-pmedium text-[#1E3D73]">
                Administration Pulse
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile icon={Eye} label="Visitors Today" value={dailyVisitors.length} sub={`${liveVisitors.length} checked in`} route="/visitors/visitor-management" color="#80bf01" />
            <MetricTile icon={Building2} label="Total Tenants" value={tenantStats.total} sub={`${tenantStats.active} active`} route="/department-accesses/administration-department/tenant-companies" color="#1E3D73" />
            <MetricTile icon={CalendarCheck} label="Meeting Room Bookings" value={bookingStats.total} sub={`${bookingStats.confirmedToday} confirmed today`} route="/department-accesses/administration-department/bookings" color="#2563EB" />
            <MetricTile icon={HandCoins} label="Resources" value={resourceStats.total} sub={`${resourceStats.inUse} in use · ${resourceStats.active} active`} route="/department-accesses/administration-department/resource-management" color="#7c3aed" />
            <MetricTile icon={Wrench} label="Housekeeping Tasks" value={pendingHousekeeping} sub={`${activeHousekeeping} active`} route="/department-accesses/administration-department/house-keeping" color="#f59e0b" />
          </div>
        </section>
      </div>

      {/* Team status, live visitors and the housekeeping queue — a fixed trio
          (always rendered together) so it shares one bounded row. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div data-tour="administration-team-status">
          <TeamLiveStatusCard department="administration" viewAllRoute="/department-accesses/administration-department/bookings" />
        </div>

        <div data-tour="administration-department-visitors">
          <DepartmentVisitorsCard department="administration" title="Administration Visitors" />
        </div>

        <div data-tour="administration-housekeeping-queue">
          <ActivityPanel
            eyebrow="Today's queue"
            title="Housekeeping Queue"
            action={<ViewAllButton route="/department-accesses/administration-department/house-keeping" />}
          >
            {housekeepingQueue.length > 0 ? housekeepingQueue.map((task, index) => (
              <RecentItem
                key={task.id || task.taskCode || index}
                title={task.taskName || task.taskType || "Housekeeping Task"}
                sub={task.area || task.assignedTo || "Unassigned"}
                badge={task.status || "Pending"}
                badgeColor={statusBadgeColor(task.status || "")}
                time={humanRelTime(task.createdAt || "")}
              />
            )) : (
              <EmptyState icon={Wrench} title="No housekeeping tasks" description="Pending housekeeping tasks will show up here in priority order." actionLabel="Open Housekeeping" route="/department-accesses/administration-department/house-keeping" />
            )}
          </ActivityPanel>
        </div>
      </div>

      <div data-tour="administration-visitors" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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

      {/* Quick actions */}
      <div data-tour="administration-quick-links">
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
              The Administration modules you use most, one click away.
            </p>
          </div>
          <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <QuickActionTile icon={Building2} label="Tenant Companies" description="Manage tenants & agreements" route="/department-accesses/administration-department/tenant-companies" color="#1E3D73" />
            <QuickActionTile icon={CalendarCheck} label="Bookings" description="Meeting room bookings" route="/department-accesses/administration-department/bookings" color="#2563EB" />
            <QuickActionTile icon={HandCoins} label="Resource Management" description="Desks, rooms & assets" route="/department-accesses/administration-department/resource-management" color="#7c3aed" />
            <QuickActionTile icon={Wrench} label="Housekeeping" description="Tasks & staff attendance" route="/department-accesses/administration-department/house-keeping" color="#f59e0b" />
            <QuickActionTile icon={ContactRound} label="Visitor Management" description="Check-in / check-out" route="/visitors/visitor-management" color="#80bf01" />
          </div>
        </section>
      </div>

      {/* Recent tenants / resources each get their own bounded row so a tour
          highlight never spans more than one pair. */}
      <div data-tour="administration-tenants" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ActivityPanel
          eyebrow="Tenancy"
          title="Recent Tenants"
          action={<ViewAllButton route="/department-accesses/administration-department/tenant-companies" />}
        >
          {tenants.length > 0 ? [...tenants]
            .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
            .slice(0, 5)
            .map((tenant, index) => (
              <RecentItem
                key={tenant.id || tenant.recordId || index}
                title={tenant.companyName || tenant.name || "Tenant"}
                sub={tenant.companyCode || "—"}
                badge={tenant.status || "—"}
                badgeColor={statusBadgeColor(tenant.status || "")}
                time={humanRelTime(tenant.createdAt || "")}
              />
            )) : (
              <EmptyState icon={Building2} title="No tenant data" description="Tenant companies will show up here once they are added." actionLabel="Open Tenants" route="/department-accesses/administration-department/tenant-companies" />
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

      <div data-tour="administration-resources" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ActivityPanel
          eyebrow="Inventory"
          title="Resource Directory"
          action={<ViewAllButton route="/department-accesses/administration-department/resource-management" />}
        >
          {resources.length > 0 ? [...resources]
            .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
            .slice(0, 5)
            .map((resource, index) => (
              <RecentItem
                key={resource.id || resource.recordId || index}
                title={resource.name || resource.resourceCode || "Resource"}
                sub={resource.resourceCategory || resource.type || "—"}
                badge={resource.status || "Active"}
                badgeColor={statusBadgeColor(resource.status || "")}
                time={humanRelTime(resource.createdAt || "")}
              />
            )) : (
              <EmptyState icon={HandCoins} title="No resources yet" description="Desks, rooms, and assets will show up here." actionLabel="Open Resources" route="/department-accesses/administration-department/resource-management" />
            )}
        </ActivityPanel>

        <ActivityPanel eyebrow="Breakdown" title="Booking Status">
          <div className="flex min-h-48 flex-1 items-center justify-center">
            {bookingStatusDonut.series.some((value) => value > 0) ? (
              <InsightDonutChart centerLabel="Bookings" labels={bookingStatusDonut.labels} colors={bookingStatusDonut.colors} series={bookingStatusDonut.series} tooltipValue={bookingStatusDonut.series.map(String)} />
            ) : (
              <p className="text-content font-pmedium text-slate-400">No bookings yet</p>
            )}
          </div>
        </ActivityPanel>
      </div>

      <div data-tour="administration-booking-trend">
        <ActivityPanel eyebrow="Year at a glance" title="Monthly Booking Trend (FY)">
          <BarGraph chartId="administration-monthly-bookings" data={monthlyBarSeries} options={monthlyBarOptions} height={260} />
        </ActivityPanel>
      </div>

      <DepartmentBudgetPanel department="Administration" title="Administration Budget vs Spend" />
    </div>
  );
}

export function AdministrationDashboardOverview() {
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
    return full || currentUser?.fullName || currentUser?.name || currentUser?.displayName || "Administration Manager";
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
          data-tour="administration-greeting"
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
                  Administration Unit dashboard
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
        <div data-tour="administration-attendance">
          <TodayAttendanceCard variant="hero" />
        </div>

        <AdministrationDashboardWidgets />
      </div>
    </div>
  );
}

export default AdministrationDashboardOverview;
