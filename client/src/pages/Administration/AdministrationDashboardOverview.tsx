import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarCheck,
  HandCoins,
  Wrench,
  ContactRound,
  Clock,
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

const WorkspaceClock = ({ workspaceName, timezone }: { workspaceName: string; timezone: string }) => {
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

  if (!workspaceName && !timeLabel) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
      {workspaceName && (
        <span className="flex items-center gap-1.5 text-small font-pmedium text-slate-600">
          <Building2 size={13} />
          {workspaceName}
        </span>
      )}
      {workspaceName && timeLabel && <span className="h-3.5 w-px bg-slate-300" />}
      {timeLabel && (
        <span className="flex items-center gap-1.5 text-small font-pmedium text-slate-600 tabular-nums">
          <Clock size={13} />
          {timeLabel}
        </span>
      )}
    </div>
  );
};

export function AdministrationDashboardOverview() {
  const currentUser = useFreshCurrentUser();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardState>(DEFAULT_DASHBOARD);

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
    <div className="p-4 flex flex-col gap-5">

      <PageFrame>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-title font-pmedium text-primary uppercase">Administration Dashboard</h2>
              <PlanBadge plan={access.plan} />
            </div>
            <p className="text-subtitle font-pmedium text-gray-700">{greeting} 👋</p>
            <p className="text-content font-pmedium text-gray-700">{todayLabel}</p>
          </div>

          <div className="mt-1 sm:mt-0">
            <WorkspaceClock workspaceName={access.workspaceName} timezone={workspacePreferences.timezone} />
          </div>
        </div>
      </PageFrame>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700">
          {error}
        </div>
      ) : null}

      <DashboardAttendanceCard />

      <WidgetSection layout={4} title="Overview" border normalCase>
        <StatCard icon={Eye} label="Visitors Today" value={dailyVisitors.length} sub={`${liveVisitors.length} checked in`} color="#80bf01" route="/visitors/visitor-management" />
        <StatCard icon={Building2} label="Total Tenants" value={tenantStats.total} sub={`${tenantStats.active} active`} color="#1E3D73" route="/administration/tenant-companies" />
        <StatCard icon={CalendarCheck} label="Meeting Room Bookings" value={bookingStats.total} sub={`${bookingStats.confirmedToday} confirmed today`} color="#2563EB" route="/administration/bookings" />
        <StatCard icon={HandCoins} label="Resources" value={resourceStats.total} sub={`${resourceStats.inUse} in use · ${resourceStats.active} active`} color="#7c3aed" route="/administration/resource-management" />
        <StatCard icon={Wrench} label="Housekeeping Tasks" value={pendingHousekeeping} sub={`${activeHousekeeping} active`} color="#f59e0b" route="/administration/house-keeping" />
      </WidgetSection>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TeamLiveStatusCard department="administration" viewAllRoute="/administration/bookings" />

        <DepartmentVisitorsCard department="administration" title="Administration Visitors" />

        <SectionCard title="Housekeeping Queue" linkLabel="View all" linkRoute="/administration/house-keeping">
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
            <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No pending housekeeping tasks</p></div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

      <WidgetSection layout={4} title="Quick Links" border normalCase>
        <QuickLink icon={Building2} label="Tenant Companies" description="Manage tenants & agreements" route="/administration/tenant-companies" color="#1E3D73" />
        <QuickLink icon={CalendarCheck} label="Bookings" description="Meeting room bookings" route="/administration/bookings" color="#2563EB" />
        <QuickLink icon={HandCoins} label="Resource Management" description="Desks, rooms & assets" route="/administration/resource-management" color="#7c3aed" />
        <QuickLink icon={Wrench} label="Housekeeping" description="Tasks & staff attendance" route="/administration/house-keeping" color="#f59e0b" />
        <QuickLink icon={ContactRound} label="Visitor Management" description="Check-in / check-out" route="/visitors/visitor-management" color="#80bf01" />
      </WidgetSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Recent Tenants" linkLabel="View all" linkRoute="/administration/tenant-companies">
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
            <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No tenant data</p></div>
          )}
        </SectionCard>

        <DonutWidget
          title="Tenant Status"
          series={tenantStatusDonut.series}
          labels={tenantStatusDonut.labels}
          colors={tenantStatusDonut.colors}
          centerLabel="Tenants"
        />

        <SectionCard title="Resource Directory" linkLabel="View all" linkRoute="/administration/resource-management">
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
            <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No resources yet</p></div>
          )}
        </SectionCard>

        <DonutWidget
          title="Booking Status"
          series={bookingStatusDonut.series}
          labels={bookingStatusDonut.labels}
          colors={bookingStatusDonut.colors}
          centerLabel="Bookings"
        />
      </div>

      <BarWidget
        title="Monthly Booking Trend (FY)"
        chartId="administration-monthly-bookings"
        series={monthlyBarSeries}
        options={monthlyBarOptions}
        height={260}
      />
    </div>
  );
}

export default AdministrationDashboardOverview;
