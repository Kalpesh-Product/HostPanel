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
  UserCheck, Globe, Map,
  LayoutGrid, Calendar, AlertCircle, ArrowRight, Zap,
} from "lucide-react";
import {
  StatCard, QuickLink, SectionCard, RecentItem, DonutWidget, BarWidget,
} from "./DashboardShared";
import type { QuickLinkItem } from "./DashboardShared";
import { statusBadgeColor, humanRelTime } from "./dashboardUtils";
import { getTenantCompanies } from "../../../../services/tenant-companies";
import { getMeetingRoomBookings } from "../../../../services/meeting-room-bookings";
import { getTickets } from "../../../../services/tickets";
import dayjs from "dayjs";

interface ProfessionalDashboardProps {
  onUpgradeClick?: () => void;
}

const ProfessionalDashboard = ({ onUpgradeClick }: ProfessionalDashboardProps) => {
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();

  const { data: tenantsRaw = [] } = useQuery({
    queryKey: ["dashboard-tenants"],
    queryFn: async () => {
      const res = await getTenantCompanies();
      const d = res?.data?.data ?? res?.data ?? res;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: bookingsRaw = [] } = useQuery({
    queryKey: ["dashboard-bookings"],
    queryFn: async () => {
      const d = await getMeetingRoomBookings();
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: ticketsRaw = [] } = useQuery({
    queryKey: ["dashboard-tickets"],
    queryFn: async () => {
      const d = await getTickets({ limit: 100 });
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: visitorsRaw = [] } = useQuery({
    queryKey: ["dashboard-visitors-full"],
    queryFn: async () => {
      const res = await axiosPrivate.get("/api/visitors/fetch-visitors");
      return Array.isArray(res?.data) ? res.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Derived stats ──────────────────────────────────────────────────────────

  const tenantStats = useMemo(() => {
    const active = tenantsRaw.filter((t: any) => ["active", "Active", "ACTIVE"].includes(t.status)).length;
    const expiringSoon = tenantsRaw.filter((t: any) => {
      if (!t.endDate) return false;
      const daysLeft = Math.ceil((new Date(t.endDate).getTime() - Date.now()) / 86400000);
      return daysLeft >= 0 && daysLeft <= 30;
    }).length;
    const pending = tenantsRaw.filter((t: any) => ["pending", "Pending", "PENDING"].includes(t.status)).length;
    return { total: tenantsRaw.length, active, expiringSoon, pending };
  }, [tenantsRaw]);

  const bookingStats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayBookings = bookingsRaw.filter((b: any) => (b.date || b.startDate || b.createdAt || "").startsWith(today));
    const confirmed = bookingsRaw.filter((b: any) => ["confirmed", "Confirmed"].includes(b.status)).length;
    const cancelled = bookingsRaw.filter((b: any) => ["cancelled", "Cancelled"].includes(b.status)).length;
    const pending = bookingsRaw.filter((b: any) => ["pending", "Pending"].includes(b.status)).length;
    return { total: bookingsRaw.length, todayCount: todayBookings.length, confirmed, cancelled, pending };
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
      (v.dateOfVisit || v.checkInTime || v.createdAt || "").startsWith(todayStr)
    ).length;
    const checkedIn = visitorsRaw.filter((v: any) => v.isCheckedIn || v.checkedIn || false).length;
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
        tenant.renewedAt || tenant.renewalDate || tenant.contractStart || tenant.agreementDetails?.startDate || ""
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
    labels: ["Active", "Pending", "Expiring"],
    colors: ["#1E3D73", "#80bf01", "#f59e0b"],
  };
  const bookingDonut = {
    series: [bookingStats.confirmed, bookingStats.pending, bookingStats.cancelled],
    labels: ["Confirmed", "Pending", "Cancelled"],
    colors: ["#1E3D73", "#f59e0b", "#ef4444"],
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

  const quickLinks: QuickLinkItem[] = [
    { icon: Map, label: "Wono Nomad Listings", description: "Manage nomad space listings", route: "/company-settings/nomad-listings", color: "#059669" },
    { icon: Globe, label: "Website Builder", description: "Build & manage your site", route: "/company-settings/website-builder", color: "#7c3aed" },
    { icon: Building2, label: "Tenant Companies", description: "Manage tenants & agreements", route: "/administration/tenant-companies", color: "#1E3D73" },
    { icon: CalendarCheck, label: "Meeting Rooms", description: "View & manage bookings", route: "/meetings/meeting-rooms", color: "#2563EB" },
    { icon: Ticket, label: "Support Tickets", description: "Handle open tickets", route: "/tickets", color: "#ef4444" },
    { icon: UserPlus, label: "Visitor Management", description: "Check-in / check-out", route: "/visitors/visitor-management", color: "#80bf01" },
    { icon: LayoutGrid, label: "Organization", description: "Departments & members", route: "/company-settings/organization-management", color: "#0891b2" },
    { icon: Calendar, label: "Calendar", description: "View events & schedules", route: "/calendar", color: "#059669" },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* Upgrade nudge — opens modal for Custom plan */}
      <div
        className="flex items-center gap-3 p-4 rounded-xl border-2 border-blue-300/50 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={onUpgradeClick}
      >
        <Zap size={18} className="text-blue-600 flex-shrink-0" />
        <div>
          <p className="text-content font-pmedium text-blue-800">
            You're on the <strong>Professional Plan</strong> — Upgrade to{" "}
            <strong>Custom Plan</strong> for Finance, HR, AI tools, Maintenance, IT & More.
          </p>
        </div>
        <span className="ml-auto flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-pmedium uppercase tracking-widest border bg-blue-600 text-white border-blue-600 whitespace-nowrap">
          Upgrade ↑
        </span>
        <ArrowRight size={14} className="text-blue-600 flex-shrink-0" />
      </div>

      {/* Professional-plan module overview */}
      <WidgetSection layout={3} title="Overview" border normalCase>
        <StatCard icon={Building2} label="Total Tenants" value={tenantStats.total} sub={`${tenantStats.active} active`} color="#1E3D73" route="/administration/tenant-companies" />
        <StatCard icon={CalendarCheck} label="Total Bookings" value={bookingStats.total} sub={`${bookingStats.todayCount} today`} color="#2563EB" route="/meetings/meeting-rooms" />
        <StatCard icon={UserCheck} label="Confirmed Bookings" value={bookingStats.confirmed} sub={`${bookingStats.pending} pending`} color="#059669" route="/meetings/meeting-rooms" />
        <StatCard icon={Ticket} label="Support Tickets" value={ticketStats.total} sub={`${ticketStats.open} open`} color="#ef4444" route="/tickets" />
        <StatCard icon={UserCheck} label="Resolved Tickets" value={ticketStats.resolved} sub={`${ticketStats.inProgress} in progress`} color="#7c3aed" route="/tickets" />
        <StatCard icon={Eye} label="Visitors Today" value={visitorStats.todayCount} sub={`${visitorStats.checkedIn} checked in`} color="#80bf01" route="/visitors/visitor-management" />
      </WidgetSection>

      {/* Quick links */}
      <WidgetSection layout={4} title="Quick Links" border normalCase>
        {quickLinks.map((ql, i) => <QuickLink key={i} {...ql} />)}
      </WidgetSection>

      {/* Recent bookings and booking status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Recent Bookings" linkLabel="View all" linkRoute="/meetings/meeting-rooms">
          {recentBookings.length > 0 ? recentBookings.map((b: any, i: number) => (
            <RecentItem key={i} title={b.bookedByName || b.clientName || "Guest"} sub={b.roomName || b.resourceName || "Meeting Room"} badge={b.status || "Pending"} badgeColor={statusBadgeColor(b.status || "")} time={humanRelTime(b.createdAt)} />
          )) : <p className="text-content text-gray-400 text-center py-6">No recent bookings</p>}
        </SectionCard>
        <DonutWidget title="Booking Status" series={bookingDonut.series} labels={bookingDonut.labels} colors={bookingDonut.colors} centerLabel="Bookings" />
      </div>

      {/* Recent tickets and ticket status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Recent Tickets" linkLabel="View all" linkRoute="/tickets">
          {recentTickets.length > 0 ? recentTickets.map((t: any, i: number) => (
            <RecentItem key={i} title={t.title || t.subject || `Ticket #${i + 1}`} sub={t.category || t.issueType || "Support"} badge={t.status || "Open"} badgeColor={statusBadgeColor(t.status || "")} time={humanRelTime(t.createdAt)} />
          )) : <p className="text-content text-gray-400 text-center py-6">No recent tickets</p>}
        </SectionCard>
        <DonutWidget title="Ticket Status" series={ticketDonut.series} labels={ticketDonut.labels} colors={ticketDonut.colors} centerLabel="Tickets" />
      </div>

      {/* Recent tenants and tenant status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Recent Tenants" linkLabel="View all" linkRoute="/administration/tenant-companies">
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
            )) : <p className="col-span-2 text-content text-gray-400 text-center py-6">No tenant data</p>}
          </div>
        </SectionCard>
        <DonutWidget title="Tenant Status" series={tenantDonut.series} labels={tenantDonut.labels} colors={tenantDonut.colors} centerLabel="Tenants" />
      </div>

      {/* Expiry alert */}
      {tenantStats.expiringSoon > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-amber-300 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => navigate("/administration/tenant-companies")}>
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-content font-pmedium text-amber-800">{tenantStats.expiringSoon} tenant agreement{tenantStats.expiringSoon > 1 ? "s" : ""} expiring within 30 days</p>
            <p className="text-small text-amber-600">Review and renew before they lapse.</p>
          </div>
          <ArrowRight size={14} className="ml-auto text-amber-600 flex-shrink-0" />
        </div>
      )}

      {/* Monthly operational trends */}
      <BarWidget title="Monthly Booking Trend (FY)" chartId="pro-monthly-bookings" series={bookingsByMonth} options={bookingBarOptions} height={260} />
      <BarWidget title="Monthly Ticket Trend (FY)" chartId="pro-monthly-tickets" series={ticketsByMonth} options={ticketBarOptions} height={260} />
      <BarWidget title="Monthly Tenant Trend (FY)" chartId="pro-monthly-tenants" series={tenantsByMonth} options={tenantBarOptions} height={260} />

    </div>
  );
};

export default ProfessionalDashboard;
