/**
 * ProfessionalDashboard — shown for workspaces on the Professional plan.
 *
 * Adds on top of Basic:
 *   tickets, meeting-room-system, calendar,
 *   workspace-settings, workspace-management,
 *   tenant-companies-admin, bookings, resource-management,
 *   leads-management, tenant-companies-sales, resource-pricing, sales-architecture
 *
 * Focus: Tenants, meeting room bookings, tickets, visitors and organization.
 * Upgrade nudge → opens the upgrade modal (Custom plan only).
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import WidgetSection from "../../../../components/WidgetSection";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import {
  Building2, CalendarCheck, Ticket, Eye, UserPlus,
  Globe,
  LayoutGrid, Calendar, AlertCircle, ArrowRight, Zap,
} from "lucide-react";
import {
  StatCard, QuickLink, SectionCard, RecentItem, DonutWidget, BarWidget,
} from "./DashboardShared";
import type { QuickLinkItem } from "./DashboardShared";
import { statusBadgeColor, humanRelTime } from "./dashboardUtils";
import { getStoredUser } from "../../../../lib/auth-session";
import { getTenantCompanies } from "../../../../services/tenant-companies";
import { getMeetingRoomBookings } from "../../../../services/meeting-room-bookings";
import { getTickets } from "../../../../services/tickets";
import dayjs from "dayjs";
import PlanDashboardSkeleton from "./PlanDashboardSkeleton";

interface ProfessionalDashboardProps {
  onUpgradeClick?: () => void;
}

// Shown instead of the four activity rows until the workspace has real data
// in any of tenants, bookings, tickets, or visitors.
const GETTING_STARTED_STEPS = [
  { icon: Building2, label: "Add your first tenant", description: "Onboard a tenant company and its agreement.", route: "/department-accesses/sales-department/tenant-companies", color: "#1E3D73" },
  { icon: CalendarCheck, label: "Book a meeting room", description: "Reserve a room and see it here.", route: "/common-modules/meeting-room-booking", color: "#2563EB" },
  { icon: Ticket, label: "Raise a support ticket", description: "Track issues through to resolution.", route: "/common-modules/customer-support", color: "#ef4444" },
  { icon: Eye, label: "Log your first visitor", description: "Track walk-ins and guests as they check in.", route: "/visitors/visitor-management", color: "#80bf01" },
];

const GettingStartedCard = () => {
  const navigate = useNavigate();
  return (
    <div className="border-default rounded-xl overflow-hidden">
      <div className="p-4 border-b-2 border-borderGray uppercase">
        <span className="text-mobileTitle lg:text-widgetTitle text-primary font-pmedium">Getting Started</span>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {GETTING_STARTED_STEPS.map((step, i) => (
          <div
            key={step.route}
            className="flex items-start gap-3 p-3 rounded-xl border border-borderGray bg-white hover:border-primary hover:shadow-md cursor-pointer transition-all duration-200"
            onClick={() => navigate(step.route)}
          >
            <div
              className="flex items-center justify-center h-7 w-7 rounded-full text-white text-content font-pmedium flex-shrink-0"
              style={{ backgroundColor: step.color }}
            >
              {i + 1}
            </div>
            <div className="min-w-0">
              <p className="text-content font-pmedium text-gray-900">{step.label}</p>
              <p className="text-small text-gray-500 mt-0.5">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProfessionalDashboard = ({ onUpgradeClick }: ProfessionalDashboardProps) => {
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();

  // Bookings are fetched per-workspace; resolve it the same way the meeting rooms page does.
  const storedUser = getStoredUser();
  const dashboardWorkspaceId = String(
    storedUser?.workspaceMembership?.workspaceId ||
    storedUser?.workspaceMembership?.workspace ||
    storedUser?.primaryWorkspace ||
    storedUser?.workspace?.id ||
    storedUser?.workspaceId ||
    "",
  );

  const { data: tenantsRaw = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ["dashboard-tenants"],
    queryFn: async () => {
      const res = await getTenantCompanies();
      // listTenantCompanies responds with { tenants: [...] } at the top level.
      const d = res?.data?.tenants ?? res?.data?.data?.tenants ?? res?.data?.data ?? res?.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: bookingsRaw = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["dashboard-bookings", dashboardWorkspaceId],
    queryFn: async () => {
      if (!dashboardWorkspaceId) return [];
      const d = await getMeetingRoomBookings(dashboardWorkspaceId);
      // Service unwraps to { roomDetails, bookings, receivedInvites }.
      const list = (d as any)?.bookings ?? d;
      return Array.isArray(list) ? list : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: ticketsRaw = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["dashboard-tickets"],
    queryFn: async () => {
      const d = await getTickets({ limit: 100 });
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: visitorsRaw = [], isLoading: visitorsLoading } = useQuery({
    queryKey: ["dashboard-visitors-full"],
    queryFn: async () => {
      // Real endpoint is /api/v1/visitors → { data: { visitors: [...] } }.
      const res = await axiosPrivate.get("/api/v1/visitors", { params: { limit: 200 } });
      const d = res?.data?.data?.visitors ?? res?.data?.visitors;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Derived stats ──────────────────────────────────────────────────────────

  const tenantStats = useMemo(() => {
    // Server derives tenant status from contract end: Active / Expiring Soon /
    // Expired / Pending Space Assignment.
    const statusOf = (t: any) => String(t.status || "").toLowerCase();
    const active = tenantsRaw.filter((t: any) => statusOf(t) === "active").length;
    const expiringSoon = tenantsRaw.filter((t: any) => statusOf(t).includes("expiring")).length;
    const pending = tenantsRaw.filter((t: any) => statusOf(t).includes("pending") || statusOf(t) === "expired").length;
    return { total: tenantsRaw.length, active, expiringSoon, pending };
  }, [tenantsRaw]);

  const bookingStats = useMemo(() => {
    const today = dayjs().format("YYYY-MM-DD");
    const now = Date.now();
    const todayBookings = bookingsRaw.filter((b: any) => String(b.date || b.startDate || b.createdAt || "").startsWith(today));
    const statusOf = (b: any) => String(b.status || "").toLowerCase();
    const cancelled = bookingsRaw.filter((b: any) => statusOf(b) === "cancelled").length;
    // A confirmed booking whose end time has passed counts as completed.
    const isCompleted = (b: any) =>
      statusOf(b) === "completed" ||
      (statusOf(b) !== "cancelled" && b.end && new Date(b.end).getTime() < now);
    const completed = bookingsRaw.filter(isCompleted).length;
    const confirmed = bookingsRaw.filter((b: any) => statusOf(b) === "confirmed" && !isCompleted(b)).length;
    return { total: bookingsRaw.length, todayCount: todayBookings.length, confirmed, cancelled, completed };
  }, [bookingsRaw]);

  const ticketStats = useMemo(() => {
    const open = ticketsRaw.filter((t: any) => ["open", "Open"].includes(t.status)).length;
    const resolved = ticketsRaw.filter((t: any) => ["resolved", "Resolved", "closed", "Closed"].includes(t.status)).length;
    const inProgress = ticketsRaw.filter((t: any) => ["in_progress", "In Progress"].includes(t.status)).length;
    return { total: ticketsRaw.length, open, resolved, inProgress };
  }, [ticketsRaw]);

  const visitorStats = useMemo(() => {
    const todayStr = dayjs().format("YYYY-MM-DD");
    const todayCount = visitorsRaw.filter((v: any) =>
      String(v.checkInAt || v.createdAt || "").startsWith(todayStr)
    ).length;
    // Visitor status is stored as checked_in / checked_out; a live visitor has
    // a check-in without a check-out.
    const checkedIn = visitorsRaw.filter((v: any) =>
      String(v.status || "").toLowerCase() === "checked_in" || (v.checkInAt && !v.checkOutAt)
    ).length;
    return { todayCount, checkedIn };
  }, [visitorsRaw]);

  // ── Chart data ─────────────────────────────────────────────────────────────

  const bookingsByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    bookingsRaw.forEach((b: any) => {
      const d = new Date(b.date || b.startDate || b.createdAt || "");
      if (isNaN(d.getTime())) return;
      counts[(d.getMonth() + 9) % 12]++;
    });
    return [{ name: "Bookings", data: counts }];
  }, [bookingsRaw]);

  const ticketsByMonth = useMemo(() => {
    const received = new Array(12).fill(0);
    const pending = new Array(12).fill(0);
    const resolved = new Array(12).fill(0);

    ticketsRaw.forEach((ticket: any) => {
      const date = new Date(ticket.createdAt || ticket.receivedAt || "");
      if (isNaN(date.getTime())) return;
      const monthIndex = (date.getMonth() + 9) % 12;
      const isResolved = /resolved|closed/i.test(ticket.status || "");
      received[monthIndex]++;
      if (isResolved) resolved[monthIndex]++;
      else pending[monthIndex]++;
    });

    return [
      { name: "Total Received", data: received },
      { name: "Pending", data: pending },
      { name: "Resolved", data: resolved },
    ];
  }, [ticketsRaw]);

  const tenantsByMonth = useMemo(() => {
    const joined = new Array(12).fill(0);
    const renewed = new Array(12).fill(0);

    tenantsRaw.forEach((tenant: any) => {
      const joinedAt = new Date(tenant.createdAt || "");
      if (!isNaN(joinedAt.getTime())) joined[(joinedAt.getMonth() + 9) % 12]++;

      const renewedAt = new Date(
        tenant.renewedAt || tenant.renewalDate || tenant.contractStartAt || tenant.contractStart || tenant.agreementDetails?.startDate || ""
      );
      // Contract renewal resets contractStart, while the original createdAt remains unchanged.
      if (
        !isNaN(renewedAt.getTime()) &&
        !isNaN(joinedAt.getTime()) &&
        renewedAt.getTime() - joinedAt.getTime() > 86400000
      ) {
        renewed[(renewedAt.getMonth() + 9) % 12]++;
      }
    });

    return [
      { name: "Joined", data: joined },
      { name: "Renewed", data: renewed },
    ];
  }, [tenantsRaw]);

  const bookingBarOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    colors: ["#1E3D73"],
    xaxis: { categories: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"] },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#f0f0f0" },
    tooltip: { theme: "light" },
  };

  const ticketBarOptions = {
    ...bookingBarOptions,
    colors: ["#2563EB", "#f59e0b", "#22c55e"],
  };

  const tenantBarOptions = {
    ...bookingBarOptions,
    colors: ["#1E3D73", "#80bf01"],
  };

  // Donut data
  const tenantDonut = {
    series: [tenantStats.active, tenantStats.pending, tenantStats.expiringSoon],
    labels: ["Active", "Pending/Expired", "Expiring Soon"],
    colors: ["#1E3D73", "#80bf01", "#f59e0b"],
  };
  const bookingDonut = {
    series: [bookingStats.confirmed, bookingStats.completed, bookingStats.cancelled],
    labels: ["Confirmed", "Completed", "Cancelled"],
    colors: ["#1E3D73", "#22c55e", "#ef4444"],
  };
  const ticketDonut = {
    series: [ticketStats.open, ticketStats.inProgress, ticketStats.resolved],
    labels: ["Open", "In Progress", "Resolved"],
    colors: ["#ef4444", "#f59e0b", "#22c55e"],
  };

  // Recent items
  const recentBookings = useMemo(() =>
    [...bookingsRaw].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5),
    [bookingsRaw]);
  const recentTickets = useMemo(() =>
    [...ticketsRaw].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5),
    [ticketsRaw]);
  const recentTenants = useMemo(() =>
    [...tenantsRaw].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 6),
    [tenantsRaw]);
  const recentVisitors = useMemo(() =>
    [...visitorsRaw].sort((a: any, b: any) => new Date(b.checkInAt || b.createdAt || 0).getTime() - new Date(a.checkInAt || a.createdAt || 0).getTime()).slice(0, 5),
    [visitorsRaw]);

  // Visitor types come from the VisitorLog enum: standard / department / tenant.
  const visitorDonut = useMemo(() => {
    const typeOf = (v: any) => String(v.visitorType || "standard").toLowerCase();
    return {
      series: [
        visitorsRaw.filter((v: any) => typeOf(v) === "standard").length,
        visitorsRaw.filter((v: any) => typeOf(v) === "department").length,
        visitorsRaw.filter((v: any) => typeOf(v) === "tenant").length,
      ],
      labels: ["Standard", "Department", "Tenant"],
      colors: ["#2563EB", "#7c3aed", "#80bf01"],
    };
  }, [visitorsRaw]);

  const prettifyVisitorStatus = (status: string) =>
    String(status || "Pending").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Quick links — the Professional-tier essentials. Nomad listings is a
  // niche side feature, not core to what this plan unlocks, so it's left
  // off the dashboard (still reachable from the sidebar).
  const quickLinks: QuickLinkItem[] = [
    { icon: Building2, label: "Tenant Companies", description: "Manage tenants & agreements", route: "/department-accesses/sales-department/tenant-companies", color: "#1E3D73" },
    { icon: CalendarCheck, label: "Meeting Rooms", description: "View & manage bookings", route: "/common-modules/meeting-room-booking", color: "#2563EB" },
    { icon: Ticket, label: "Customer Support", description: "Handle open tickets", route: "/common-modules/customer-support", color: "#ef4444" },
    { icon: UserPlus, label: "Visitor Management", description: "Check-in / check-out", route: "/visitors/visitor-management", color: "#80bf01" },
    { icon: Globe, label: "Website Builder", description: "Build & manage your site", route: "/key-apps/website-builder", color: "#7c3aed" },
    { icon: LayoutGrid, label: "Organization", description: "Departments & members", route: "/core-modules/organization-management", color: "#0891b2" },
    { icon: Calendar, label: "Calendar", description: "View events & schedules", route: "/common-modules/calendar", color: "#059669" },
  ];

  // Nothing logged yet anywhere — show a getting-started checklist instead
  // of four empty "no data" rows.
  const isNewWorkspace =
    tenantsRaw.length === 0 && bookingsRaw.length === 0 &&
    ticketsRaw.length === 0 && visitorsRaw.length === 0;

  if (tenantsLoading || bookingsLoading || ticketsLoading || visitorsLoading) {
    return <PlanDashboardSkeleton plan="professional" />;
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Upgrade nudge — opens modal for Custom plan */}
      <div
        data-tour="professional-plan"
        className="flex items-center gap-3 p-4 rounded-xl border-2 border-accent/30 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={onUpgradeClick}
      >
        <Zap size={18} className="text-accent flex-shrink-0" />
        <p className="text-content font-pmedium text-blue-800 min-w-0 truncate">
          You're on the <strong>Professional Plan</strong> — Upgrade to{" "}
          <strong>Custom Plan</strong> for Finance, HR, AI tools, Maintenance, IT & More.
        </p>
        <span className="ml-auto flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-pmedium uppercase tracking-widest border bg-accent text-white border-accent whitespace-nowrap">
          Upgrade ↑
        </span>
        <ArrowRight size={14} className="text-accent flex-shrink-0" />
      </div>

      {/* Professional-plan module overview — one actionable number per domain */}
      <div data-tour="professional-overview">
        <WidgetSection layout={4} title="Overview" border normalCase>
          <StatCard icon={Building2} label="Total Tenants" value={tenantStats.total} sub={`${tenantStats.active} active`} color="#1E3D73" route="/department-accesses/sales-department/tenant-companies" />
          <StatCard icon={CalendarCheck} label="Bookings Today" value={bookingStats.todayCount} sub={`${bookingStats.confirmed} confirmed overall`} color="#2563EB" route="/common-modules/meeting-room-booking" />
          <StatCard icon={Ticket} label="Open Tickets" value={ticketStats.open} sub={`${ticketStats.inProgress} in progress`} color="#ef4444" route="/common-modules/customer-support" />
          <StatCard icon={Eye} label="Visitors Today" value={visitorStats.todayCount} sub={`${visitorStats.checkedIn} checked in`} color="#80bf01" route="/visitors/visitor-management" />
        </WidgetSection>
      </div>

      {/* Quick links */}
      <div data-tour="professional-quick-links">
        <WidgetSection layout={4} title="Quick Links" border normalCase>
          {quickLinks.map((ql, i) => <QuickLink key={i} {...ql} />)}
        </WidgetSection>
      </div>

      {isNewWorkspace ? (
        /* First run — one checklist beats four empty activity rows */
        <div data-tour="professional-getting-started">
          <GettingStartedCard />
        </div>
      ) : (
        <>
          {/* Recent visitors and visitor type */}
          <div data-tour="professional-visitors" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Recent Visitors" linkLabel="View all" linkRoute="/visitors/visitor-management">
              {recentVisitors.length > 0 ? recentVisitors.map((v: any, i: number) => (
                <RecentItem
                  key={i}
                  title={v.fullName || v.firstName || "Visitor"}
                  sub={v.purpose || v.company || "Visit"}
                  badge={prettifyVisitorStatus(v.status)}
                  badgeColor={statusBadgeColor(v.status || "")}
                  time={humanRelTime(v.checkInAt || v.createdAt)}
                />
              )) : <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No recent visitors</p></div>}
            </SectionCard>
            <DonutWidget title="Visitor Type" series={visitorDonut.series} labels={visitorDonut.labels} colors={visitorDonut.colors} centerLabel="Visitors" />
          </div>

          {/* Recent bookings and booking status */}
          <div data-tour="professional-bookings" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Recent Bookings" linkLabel="View all" linkRoute="/common-modules/meeting-room-booking">
              {recentBookings.length > 0 ? recentBookings.map((b: any, i: number) => (
                <RecentItem key={i} title={b.bookedByName || b.clientName || "Guest"} sub={b.roomName || b.resourceName || "Meeting Room"} badge={b.status || "Pending"} badgeColor={statusBadgeColor(b.status || "")} time={humanRelTime(b.createdAt)} />
              )) : <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No recent bookings</p></div>}
            </SectionCard>
            <DonutWidget title="Booking Status" series={bookingDonut.series} labels={bookingDonut.labels} colors={bookingDonut.colors} centerLabel="Bookings" />
          </div>

          {/* Recent tickets and ticket status */}
          <div data-tour="professional-tickets" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Recent Tickets" linkLabel="View all" linkRoute="/common-modules/customer-support">
              {recentTickets.length > 0 ? recentTickets.map((t: any, i: number) => (
                <RecentItem key={i} title={t.title || t.subject || `Ticket #${i + 1}`} sub={t.category || t.issueType || "Support"} badge={t.status || "Open"} badgeColor={statusBadgeColor(t.status || "")} time={humanRelTime(t.createdAt)} />
              )) : <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No recent tickets</p></div>}
            </SectionCard>
            <DonutWidget title="Ticket Status" series={ticketDonut.series} labels={ticketDonut.labels} colors={ticketDonut.colors} centerLabel="Tickets" />
          </div>

          {/* Recent tenants and tenant status */}
          <div data-tour="professional-tenants" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Recent Tenants" linkLabel="View all" linkRoute="/department-accesses/sales-department/tenant-companies">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentTenants.length > 0 ? recentTenants.map((t: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-pbold text-content flex-shrink-0">
                      {(t.companyName || t.name || "T").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-content font-pmedium text-gray-900 truncate">{t.companyName || t.name || "Tenant"}</p>
                      <p className="text-small text-gray-500 truncate">{t.companyCode || t.sector || "—"}</p>
                    </div>
                    <span className={`ml-auto flex-shrink-0 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${statusBadgeColor(t.status || "")}`}>
                      {t.status || "—"}
                    </span>
                  </div>
                )) : <div className="col-span-2 min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No tenant data</p></div>}
              </div>
            </SectionCard>
            <DonutWidget title="Tenant Status" series={tenantDonut.series} labels={tenantDonut.labels} colors={tenantDonut.colors} centerLabel="Tenants" />
          </div>

          {/* Expiry alert */}
          {tenantStats.expiringSoon > 0 && (
            <div data-tour="professional-expiry-alert" className="flex items-center gap-3 p-4 rounded-xl border-2 border-amber-300 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => navigate("/department-accesses/sales-department/tenant-companies")}>
              <AlertCircle size={20} className="text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-content font-pmedium text-amber-800">{tenantStats.expiringSoon} tenant agreement{tenantStats.expiringSoon > 1 ? "s" : ""} expiring within 30 days</p>
                <p className="text-small text-amber-600">Review and renew before they lapse.</p>
              </div>
              <ArrowRight size={14} className="ml-auto text-amber-600 flex-shrink-0" />
            </div>
          )}

          {/* Monthly operational trends — side by side instead of stacked full-width */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div data-tour="professional-booking-trend">
              <BarWidget title="Monthly Bookings (FY)" chartId="pro-monthly-bookings" series={bookingsByMonth} options={bookingBarOptions} height={220} />
            </div>
            <div data-tour="professional-ticket-trend">
              <BarWidget title="Monthly Tickets (FY)" chartId="pro-monthly-tickets" series={ticketsByMonth} options={ticketBarOptions} height={220} />
            </div>
            <div data-tour="professional-tenant-trend">
              <BarWidget title="Monthly Tenants (FY)" chartId="pro-monthly-tenants" series={tenantsByMonth} options={tenantBarOptions} height={220} />
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default ProfessionalDashboard;
