/**
 * CustomDashboard — shown for workspaces on the Custom plan.
 *
 * Renders widgets dynamically based on which modules are enabled.
 * Each section only appears when the relevant module IDs are present.
 *
 * Sections gated by module:
 *  • "tenants"          → tenant-companies-admin
 *  • "meeting-rooms"    → meeting-room-system / bookings
 *  • "tickets"          → tickets
 *  • "visitors"         → visitors-management / visitor-management
 *  • "finance"          → billing-payments / finance-budget
 *  • "hr"               → employee-management / payroll-management
 *  • "sales"            → leads-management / sales-architecture
 *  • "website"          → website-builder
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import WidgetSection from "../../../../components/WidgetSection";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import type { DashboardAccessResult } from "../../../../hooks/useDashboardAccess";
import {
  Building2, CalendarCheck, Ticket, Eye, UserPlus,
  Banknote, UserCheck, TrendingUp, Globe, Settings,
  LayoutGrid, BarChart3, Users, AlertCircle, ArrowRight,
  CreditCard, FileText, Briefcase, Wrench, Map,
} from "lucide-react";
import {
  StatCard, QuickLink, SectionCard, RecentItem, DonutWidget, BarWidget,
} from "./DashboardShared";
import type { QuickLinkItem } from "./DashboardShared";
import { statusBadgeColor, humanRelTime, fmtINR } from "./dashboardUtils";
import { getTenantCompanies } from "../../../../services/tenant-companies";
import { getMeetingRoomBookings } from "../../../../services/meeting-room-bookings";
import { getTickets } from "../../../../services/tickets";
import { getTenantBillingSnapshot, getPayrollSnapshot } from "../../../../services/finance";

interface CustomDashboardProps {
  access: DashboardAccessResult;
}

const BAR_BASE_OPTIONS = {
  chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
  plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
  dataLabels: { enabled: false },
  grid: { borderColor: "#f0f0f0" },
  xaxis: { categories: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"] },
  tooltip: { theme: "light" },
};

const CustomDashboard = ({ access }: CustomDashboardProps) => {
  const { hasModule } = access;
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();

  const showTenants = hasModule("tenant-companies-admin");
  const showBookings = hasModule("meeting-room-system") || hasModule("bookings");
  const showTickets = hasModule("tickets");
  const showVisitors = hasModule("visitors-management") || hasModule("visitor-management");
  const showFinance = hasModule("billing-payments") || hasModule("finance-budget");
  const showHR = hasModule("employee-management") || hasModule("payroll-management");
  const showSales = hasModule("leads-management") || hasModule("sales-architecture");
  const showWebsite = hasModule("website-builder");

  // ── Data fetching (conditional, but hooks must always run) ────────────────

  const { data: tenantsRaw = [] } = useQuery({
    queryKey: ["dashboard-tenants"],
    queryFn: async () => {
      if (!showTenants) return [];
      const res = await getTenantCompanies();
      const d = res?.data?.data ?? res?.data ?? res;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: showTenants,
  });

  const { data: bookingsRaw = [] } = useQuery({
    queryKey: ["dashboard-bookings"],
    queryFn: async () => {
      const d = await getMeetingRoomBookings();
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: showBookings,
  });

  const { data: ticketsRaw = [] } = useQuery({
    queryKey: ["dashboard-tickets"],
    queryFn: async () => {
      const d = await getTickets({ limit: 100 });
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: showTickets,
  });

  const { data: visitorsRaw = [] } = useQuery({
    queryKey: ["dashboard-visitors-full"],
    queryFn: async () => {
      const res = await axiosPrivate.get("/api/visitors/fetch-visitors");
      return Array.isArray(res?.data) ? res.data : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: showVisitors,
  });

  const { data: billingRaw } = useQuery({
    queryKey: ["dashboard-billing"],
    queryFn: async () => {
      const d = await getTenantBillingSnapshot();
      return Array.isArray(d) ? d : (Array.isArray((d as any)?.data) ? (d as any).data : []);
    },
    staleTime: 5 * 60 * 1000,
    enabled: showFinance,
  });

  const { data: payrollSnap } = useQuery({
    queryKey: ["dashboard-payroll"],
    queryFn: () => getPayrollSnapshot(),
    staleTime: 5 * 60 * 1000,
    enabled: showHR,
  });

  const { data: leadsRaw = [] } = useQuery({
    queryKey: ["dashboard-leads"],
    queryFn: async () => {
      const res = await axiosPrivate.get("/api/v1/website-leads");
      const d = res?.data?.data ?? res?.data ?? [];
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: showSales || showWebsite,
  });

  // ── Derived stats ──────────────────────────────────────────────────────────

  const tenantStats = useMemo(() => {
    const active = tenantsRaw.filter((t: any) => /active/i.test(t.status || "")).length;
    const expiringSoon = tenantsRaw.filter((t: any) => {
      if (!t.endDate) return false;
      const days = Math.ceil((new Date(t.endDate).getTime() - Date.now()) / 86400000);
      return days >= 0 && days <= 30;
    }).length;
    return { total: tenantsRaw.length, active, expiringSoon };
  }, [tenantsRaw]);

  const bookingStats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayCount = bookingsRaw.filter((b: any) => (b.date || b.startDate || b.createdAt || "").startsWith(today)).length;
    const confirmed = bookingsRaw.filter((b: any) => /confirmed/i.test(b.status || "")).length;
    const pending = bookingsRaw.filter((b: any) => /pending/i.test(b.status || "")).length;
    const cancelled = bookingsRaw.filter((b: any) => /cancelled/i.test(b.status || "")).length;
    const revenue = bookingsRaw.reduce((s: number, b: any) => s + (b.totalAmount || b.amount || 0), 0);
    return { total: bookingsRaw.length, todayCount, confirmed, pending, cancelled, revenue };
  }, [bookingsRaw]);

  const ticketStats = useMemo(() => {
    const open = ticketsRaw.filter((t: any) => /open/i.test(t.status || "")).length;
    const resolved = ticketsRaw.filter((t: any) => /resolved|closed/i.test(t.status || "")).length;
    const inProgress = ticketsRaw.filter((t: any) => /progress/i.test(t.status || "")).length;
    return { total: ticketsRaw.length, open, resolved, inProgress };
  }, [ticketsRaw]);

  const visitorStats = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayCount = visitorsRaw.filter((v: any) =>
      (v.dateOfVisit || v.checkInTime || v.createdAt || "").startsWith(todayStr)
    ).length;
    const checkedIn = visitorsRaw.filter((v: any) => v.isCheckedIn || v.checkedIn || false).length;
    return { todayCount, checkedIn };
  }, [visitorsRaw]);

  const billingStats = useMemo(() => {
    const bills = Array.isArray(billingRaw) ? billingRaw : [];
    const paid = bills.filter((b: any) => /paid/i.test(b.securityDepositPaidStatus || "")).length;
    const pending = bills.length - paid;
    return { total: bills.length, paid, pending };
  }, [billingRaw]);

  const hrStats = useMemo(() => {
    const cycle = (payrollSnap as any)?.currentCycle;
    const employees: any[] = cycle?.employees ?? [];
    const netPayable = employees.reduce((s: number, e: any) => s + (e.financials?.netSalary || 0), 0);
    const paid = employees.filter((e: any) => /paid/i.test(e.payment?.status || e.financials?.paymentStatus || "")).length;
    return { totalEmployees: employees.length, netPayable, paid };
  }, [payrollSnap]);

  const leadStats = useMemo(() => {
    const newLeads = leadsRaw.filter((l: any) => !l.isContacted && !l.contacted).length;
    return { total: leadsRaw.length, newLeads };
  }, [leadsRaw]);

  // ── Chart data ─────────────────────────────────────────────────────────────

  const bookingsByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    bookingsRaw.forEach((b: any) => {
      const d = new Date(b.date || b.startDate || b.createdAt || "");
      if (!isNaN(d.getTime())) counts[(d.getMonth() + 9) % 12]++;
    });
    return [{ name: "Bookings", data: counts }];
  }, [bookingsRaw]);

  // ── Top-level stat cards (only enabled modules show up) ───────────────────

  const statCards = useMemo(() => {
    const cards = [];
    if (showTenants) cards.push({ icon: Building2, label: "Total Tenants", value: tenantStats.total, sub: `${tenantStats.active} active`, color: "#1E3D73", route: "/company-settings/companies" });
    if (showBookings) cards.push({ icon: CalendarCheck, label: "Total Bookings", value: bookingStats.total, sub: `${bookingStats.todayCount} today`, color: "#2563EB", route: "/app/meeting-rooms" });
    if (showTickets) cards.push({ icon: Ticket, label: "Support Tickets", value: ticketStats.total, sub: `${ticketStats.open} open`, color: "#ef4444", route: "/app/tickets" });
    if (showVisitors) cards.push({ icon: Eye, label: "Visitors Today", value: visitorStats.todayCount, sub: `${visitorStats.checkedIn} checked in`, color: "#80bf01", route: "/visitors/visitor-management" });
    if (showFinance) cards.push({ icon: Banknote, label: "Booking Revenue", value: fmtINR(bookingStats.revenue), sub: "Meeting room revenue", color: "#f59e0b", route: "/app/finance/billing-payments" });
    if (showHR) cards.push({ icon: Users, label: "Payroll Employees", value: hrStats.totalEmployees, sub: `${hrStats.paid} paid`, color: "#7c3aed", route: "/app/finance/billing-payments" });
    if (showSales) cards.push({ icon: FileText, label: "Website Leads", value: leadStats.total, sub: `${leadStats.newLeads} new`, color: "#059669", route: "/company-settings/website-builder/leads" });
    return cards;
  }, [showTenants, showBookings, showTickets, showVisitors, showFinance, showHR, showSales,
    tenantStats, bookingStats, ticketStats, visitorStats, billingStats, hrStats, leadStats]);

  // ── Quick links (only for enabled modules) ────────────────────────────────

  const quickLinks = useMemo(() => {
    const links: QuickLinkItem[] = [];
    links.push({ icon: Map, label: "Wono Nomad Listings", description: "Manage nomad space listings", route: "/company-settings/nomad-listings", color: "#059669" });
    if (showWebsite) links.push({ icon: Globe, label: "Website Builder", description: "Build & manage your site", route: "/company-settings/website-builder", color: "#7c3aed" });
    if (showTenants) links.push({ icon: Building2, label: "Tenant Companies", description: "Manage tenants & agreements", route: "/company-settings/companies", color: "#1E3D73" });
    if (showBookings) links.push({ icon: CalendarCheck, label: "Meeting Rooms", description: "View & manage bookings", route: "/app/meeting-rooms", color: "#2563EB" });
    if (showTickets) links.push({ icon: Ticket, label: "Support Tickets", description: "Handle open tickets", route: "/app/tickets", color: "#ef4444" });
    if (showVisitors) links.push({ icon: UserPlus, label: "Visitor Management", description: "Check-in / check-out", route: "/visitors/visitor-management", color: "#80bf01" });
    if (showFinance) links.push({ icon: Banknote, label: "Billing & Finance", description: "Invoices, deposits & payroll", route: "/app/finance/billing-payments", color: "#f59e0b" });
    if (showHR) links.push({ icon: Users, label: "HR Management", description: "Employees, payroll & leaves", route: "/app/hr", color: "#7c3aed" });
    if (showSales) links.push({ icon: FileText, label: "Sales CRM", description: "Leads & sales architecture", route: "/app/sales-crm", color: "#059669" });
    links.push({ icon: LayoutGrid, label: "Organization", description: "Departments & members", route: "/company-settings/organization-management", color: "#0891b2" });
    links.push({ icon: BarChart3, label: "Reports", description: "Analytics & export", route: "/app/reports", color: "#059669" });
    return links;
  }, [showTenants, showBookings, showTickets, showVisitors, showFinance, showHR, showSales, showWebsite]);

  // ── Recent items ──────────────────────────────────────────────────────────

  const recentBookings = useMemo(() =>
    [...bookingsRaw].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5),
    [bookingsRaw]);
  const recentTickets = useMemo(() =>
    [...ticketsRaw].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5),
    [ticketsRaw]);
  const recentTenants = useMemo(() =>
    [...tenantsRaw].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 6),
    [tenantsRaw]);

  // ── Layout ────────────────────────────────────────────────────────────────

  const cardCols = Math.min(statCards.length, 4) as 1 | 2 | 3 | 4;

  return (
    <div className="flex flex-col gap-5">

      {/* Dynamic stat cards */}
      {statCards.length > 0 && (
        <WidgetSection layout={cardCols} title="Overview" border normalCase>
          {statCards.map((c, i) => <StatCard key={i} {...c} />)}
        </WidgetSection>
      )}

      {/* Finance highlight row */}
      {showFinance && (
        <WidgetSection layout={3} title="Financial Snapshot" border normalCase>
          <StatCard icon={Banknote} label="Booking Revenue" value={fmtINR(bookingStats.revenue)} sub="Meeting room revenue" color="#f59e0b" route="/app/finance/billing-payments" />
          <StatCard icon={CreditCard} label="Security Deposits" value={billingStats.total} sub={`${billingStats.paid} paid · ${billingStats.pending} pending`} color="#1E3D73" route="/app/finance/billing-payments" />
          {showHR && <StatCard icon={Users} label="Net Payable" value={fmtINR(hrStats.netPayable)} sub={`${hrStats.paid}/${hrStats.totalEmployees} employees paid`} color="#7c3aed" route="/app/finance/billing-payments" />}
          {!showHR && <StatCard icon={UserCheck} label="Confirmed Bookings" value={bookingStats.confirmed} sub={`${bookingStats.pending} pending`} color="#059669" route="/app/meeting-rooms" />}
        </WidgetSection>
      )}

      {/* Charts — donuts */}
      {(showTenants || showBookings || showTickets) && (
        <div className={`grid grid-cols-1 gap-4 ${[showTenants, showBookings, showTickets].filter(Boolean).length === 3 ? "lg:grid-cols-3" : [showTenants, showBookings, showTickets].filter(Boolean).length === 2 ? "lg:grid-cols-2" : ""}`}>
          {showTenants && (
            <DonutWidget title="Tenant Status" series={[tenantStats.active, tenantsRaw.filter((t: any) => /pending/i.test(t.status || "")).length, tenantStats.expiringSoon]} labels={["Active", "Pending", "Expiring"]} colors={["#1E3D73", "#80bf01", "#f59e0b"]} centerLabel="Tenants" />
          )}
          {showBookings && (
            <DonutWidget title="Booking Status" series={[bookingStats.confirmed, bookingStats.pending, bookingStats.cancelled]} labels={["Confirmed", "Pending", "Cancelled"]} colors={["#1E3D73", "#f59e0b", "#ef4444"]} centerLabel="Bookings" />
          )}
          {showTickets && (
            <DonutWidget title="Ticket Status" series={[ticketStats.open, ticketStats.inProgress, ticketStats.resolved]} labels={["Open", "In Progress", "Resolved"]} colors={["#ef4444", "#f59e0b", "#22c55e"]} centerLabel="Tickets" />
          )}
        </div>
      )}

      {/* Monthly bookings bar */}
      {showBookings && (
        <BarWidget title="Monthly Booking Trend (FY)" chartId="custom-monthly-bookings" series={bookingsByMonth} options={{ ...BAR_BASE_OPTIONS, colors: ["#1E3D73"] }} height={260} />
      )}

      {/* Recent activity grid */}
      {(showBookings || showTickets) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {showBookings && (
            <SectionCard title="Recent Bookings" linkLabel="View all" linkRoute="/app/meeting-rooms">
              {recentBookings.length > 0 ? recentBookings.map((b: any, i: number) => (
                <RecentItem key={i} title={b.bookedByName || b.clientName || "Guest"} sub={b.roomName || b.resourceName || "Meeting Room"} badge={b.status || "Pending"} badgeColor={statusBadgeColor(b.status || "")} time={humanRelTime(b.createdAt)} />
              )) : <p className="text-content text-gray-400 text-center py-6">No recent bookings</p>}
            </SectionCard>
          )}
          {showTickets && (
            <SectionCard title="Recent Tickets" linkLabel="View all" linkRoute="/app/tickets">
              {recentTickets.length > 0 ? recentTickets.map((t: any, i: number) => (
                <RecentItem key={i} title={t.title || t.subject || `Ticket #${i + 1}`} sub={t.category || t.issueType || "Support"} badge={t.status || "Open"} badgeColor={statusBadgeColor(t.status || "")} time={humanRelTime(t.createdAt)} />
              )) : <p className="text-content text-gray-400 text-center py-6">No recent tickets</p>}
            </SectionCard>
          )}
        </div>
      )}

      {/* Recent tenants */}
      {showTenants && (
        <>
          <SectionCard title="Recent Tenants" linkLabel="View all" linkRoute="/company-settings/companies">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentTenants.length > 0 ? recentTenants.map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-pbold text-content flex-shrink-0">
                    {(t.companyName || t.name || "T").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-content font-pmedium text-gray-900 truncate">{t.companyName || t.name || "Tenant"}</p>
                    <p className="text-small text-gray-500 truncate">{t.companyCode || t.sector || "—"}</p>
                  </div>
                  <span className={`ml-auto flex-shrink-0 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${statusBadgeColor(t.status || "")}`}>{t.status || "—"}</span>
                </div>
              )) : <p className="col-span-3 text-content text-gray-400 text-center py-6">No tenant data</p>}
            </div>
          </SectionCard>
          {tenantStats.expiringSoon > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-amber-300 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => navigate("/company-settings/companies")}>
              <AlertCircle size={20} className="text-amber-600 flex-shrink-0" />
              <p className="text-content font-pmedium text-amber-800">{tenantStats.expiringSoon} tenant agreement{tenantStats.expiringSoon > 1 ? "s" : ""} expiring within 30 days</p>
              <ArrowRight size={14} className="ml-auto text-amber-600 flex-shrink-0" />
            </div>
          )}
        </>
      )}

      {/* Quick links — dynamic */}
      <WidgetSection layout={Math.min(quickLinks.length, 4) as 1 | 2 | 3 | 4} title="Quick Links" border normalCase>
        {quickLinks.map((ql, i) => <QuickLink key={i} {...ql} />)}
      </WidgetSection>

    </div>
  );
};

export default CustomDashboard;
