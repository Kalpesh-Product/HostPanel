/**
 * CustomDashboard — shown for workspaces on the Custom plan (founder / owner
 * / super_admin view). Renders widgets dynamically based on which modules
 * are enabled for the workspace, mirroring the layout used by Basic and
 * Professional but built from the workspace's actual module selection
 * instead of a fixed feature set:
 *
 *  1. Attendance clock in/out (if the founder has the attendance module)
 *  2. Overview stat cards — bespoke cards for tenants/bookings/tickets/
 *     visitors/leads/leave-requests/finance where real data exists, plus
 *     dynamic cards from useModuleStats for every other enabled module
 *     (resources, housekeeping, maintenance, IT, HR, recruitment, etc.)
 *  3. Team Live Status (workspace-wide) + Recent Visitors + Visitor Type
 *  4. Quick Links — built from the workspace's module catalog, not hardcoded
 *  5. Profile shortcuts
 *  6. Recent + status pairs (tenants, bookings/tickets, leads/leave requests)
 *  7. Monthly trend bar charts
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import WidgetSection from "../../../../components/WidgetSection";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import type { DashboardAccessResult } from "../../../../hooks/useDashboardAccess";
import {
  Building2, CalendarCheck, Ticket, Eye, UserPlus,
  Banknote, UserCheck, Globe,
  LayoutGrid, BarChart3, Users, AlertCircle, ArrowRight,
  CreditCard, FileText, Map as MapIcon, UserCog, KeyRound,
} from "lucide-react";
import {
  StatCard, QuickLink, SectionCard, RecentItem, DonutWidget, BarWidget,
} from "./DashboardShared";
import type { QuickLinkItem } from "./DashboardShared";
import { statusBadgeColor, humanRelTime, fmtINR } from "./dashboardUtils";
import useWorkspacePreferences from "../../../../hooks/useWorkspacePreferences";
import { getTenantCompanies } from "../../../../services/tenant-companies";
import { getMeetingRoomBookings } from "../../../../services/meeting-room-bookings";
import { getTickets } from "../../../../services/tickets";
import { getTenantBillingSnapshot, getPayrollSnapshot } from "../../../../services/finance";
import { getLeaveRequests } from "../../../../services/leave-requests";
import { useModuleStats } from "./moduleStatProviders";
import TodayAttendanceCard from "./TodayAttendanceCard";
import TeamLiveStatusCard from "./TeamLiveStatusCard";
import { canAccessCompanyProfile } from "../../../Profile/profileAccess";
import { ICON_BY_ID, DEFAULT_SECTION_ROUTES } from "../ModuleCardsLanding";

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

// Modules CustomDashboard fetches and renders bespoke (recent lists + donuts +
// bar trends) — excluded from useModuleStats' input so it never re-fetches
// the same data under a different query key.
const BESPOKE_MODULE_IDS = new Set([
  "tickets", "meeting-room-system", "bookings",
  "tenant-companies-admin", "tenant-companies-sales",
  "visitors-management", "visitor-management",
]);

const toQuickLink = (id: string, label: string): QuickLinkItem | null => {
  const route = DEFAULT_SECTION_ROUTES[id];
  if (!route) return null;
  const icon = ICON_BY_ID[id] || LayoutGrid;
  return { icon, label, description: route.replace(/^\//, "").replace(/[-/]/g, " "), route, color: "#1E3D73" };
};

const CustomDashboard = ({ access }: CustomDashboardProps) => {
  const { hasModule, enabledModuleIds, moduleMap, roleBand, departmentNames } = access;
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const workspacePreferences = useWorkspacePreferences();

  const showTenants = hasModule("tenant-companies-admin");
  const showBookings = hasModule("meeting-room-system") || hasModule("bookings");
  const showTickets = hasModule("tickets");
  const showVisitors = hasModule("visitors-management") || hasModule("visitor-management");
  const showFinance = hasModule("billing-payments") || hasModule("finance-budget");
  const showHR = hasModule("employee-management") || hasModule("payroll-management");
  const showSales = hasModule("leads-management") || hasModule("sales-architecture");
  const showWebsite = hasModule("website-builder");
  const showLeaveRequests = hasModule("leave-requests");
  const showAttendance = hasModule("attendance");

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

  const { data: leaveRequestsRaw = [] } = useQuery({
    queryKey: ["dashboard-leave-requests"],
    queryFn: async () => {
      const res: any = await getLeaveRequests();
      const d = res?.leaveRequests ?? res?.data?.leaveRequests ?? [];
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: showLeaveRequests,
  });

  // Long-tail modules (resources, housekeeping, maintenance, IT, HR mgmt,
  // recruitment, attendance review, pricing) get their overview cards from
  // the same hook ModuleAccessDashboard uses — no bespoke fetch needed here.
  const longTailModuleIds = useMemo(() => {
    const ids = new Set<string>();
    enabledModuleIds.forEach((id) => {
      if (!BESPOKE_MODULE_IDS.has(id)) ids.add(id);
    });
    return ids;
  }, [enabledModuleIds]);
  const { cards: longTailCards } = useModuleStats(longTailModuleIds);

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
    const newLeads = leadsRaw.filter((l: any) => !l.isContacted && !l.contacted && (l.status || "Pending") === "Pending").length;
    return { total: leadsRaw.length, newLeads };
  }, [leadsRaw]);

  const leaveStats = useMemo(() => {
    const pending = leaveRequestsRaw.filter((l: any) => String(l.status || "").toLowerCase() === "pending").length;
    const approved = leaveRequestsRaw.filter((l: any) => String(l.status || "").toLowerCase() === "approved").length;
    const rejected = leaveRequestsRaw.filter((l: any) => String(l.status || "").toLowerCase() === "rejected").length;
    return { total: leaveRequestsRaw.length, pending, approved, rejected };
  }, [leaveRequestsRaw]);

  // ── Chart data ─────────────────────────────────────────────────────────────

  const bookingsByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    bookingsRaw.forEach((b: any) => {
      const d = new Date(b.date || b.startDate || b.createdAt || "");
      if (!isNaN(d.getTime())) counts[(d.getMonth() + 9) % 12]++;
    });
    return [{ name: "Bookings", data: counts }];
  }, [bookingsRaw]);

  const ticketsByMonth = useMemo(() => {
    const received = new Array(12).fill(0);
    const resolved = new Array(12).fill(0);
    ticketsRaw.forEach((t: any) => {
      const d = new Date(t.createdAt || "");
      if (isNaN(d.getTime())) return;
      const idx = (d.getMonth() + 9) % 12;
      received[idx]++;
      if (/resolved|closed/i.test(t.status || "")) resolved[idx]++;
    });
    return [{ name: "Received", data: received }, { name: "Resolved", data: resolved }];
  }, [ticketsRaw]);

  const tenantsByMonth = useMemo(() => {
    const joined = new Array(12).fill(0);
    tenantsRaw.forEach((t: any) => {
      const d = new Date(t.createdAt || "");
      if (!isNaN(d.getTime())) joined[(d.getMonth() + 9) % 12]++;
    });
    return [{ name: "Joined", data: joined }];
  }, [tenantsRaw]);

  // ── Top-level stat cards (only enabled modules show up) ───────────────────

  const bespokeStatCards = useMemo(() => {
    const cards = [];
    if (showTenants) cards.push({ icon: Building2, label: "Total Tenants", value: tenantStats.total, sub: `${tenantStats.active} active`, color: "#1E3D73", route: "/company-settings/companies" });
    if (showBookings) cards.push({ icon: CalendarCheck, label: "Total Bookings", value: bookingStats.total, sub: `${bookingStats.todayCount} today`, color: "#2563EB", route: "/app/meeting-rooms" });
    if (showTickets) cards.push({ icon: Ticket, label: "Support Tickets", value: ticketStats.total, sub: `${ticketStats.open} open`, color: "#ef4444", route: "/app/tickets" });
    if (showVisitors) cards.push({ icon: Eye, label: "Visitors Today", value: visitorStats.todayCount, sub: `${visitorStats.checkedIn} checked in`, color: "#80bf01", route: "/visitors/visitor-management" });
    if (showFinance) cards.push({ icon: Banknote, label: "Booking Revenue", value: fmtINR(bookingStats.revenue, workspacePreferences.currency), sub: "Meeting room revenue", color: "#f59e0b", route: "/app/department-accesses/finance-department/billing-payments" });
    if (showHR) cards.push({ icon: Users, label: "Payroll Employees", value: hrStats.totalEmployees, sub: `${hrStats.paid} paid`, color: "#7c3aed", route: "/app/department-accesses/finance-department/billing-payments" });
    if (showSales) cards.push({ icon: FileText, label: "Website Leads", value: leadStats.total, sub: `${leadStats.newLeads} new`, color: "#059669", route: "/key-apps/website-builder/leads" });
    if (showLeaveRequests) cards.push({ icon: ICON_BY_ID["leave-requests"] || CalendarCheck, label: "Leave Requests", value: leaveStats.total, sub: `${leaveStats.pending} pending`, color: "#f59e0b", route: "/common-modules/leave-requests" });
    return cards;
  }, [showTenants, showBookings, showTickets, showVisitors, showFinance, showHR, showSales, showLeaveRequests,
    tenantStats, bookingStats, ticketStats, visitorStats, hrStats, leadStats, leaveStats, workspacePreferences.currency]);

  const statCards = useMemo(
    () => [...bespokeStatCards, ...longTailCards],
    [bespokeStatCards, longTailCards],
  );

  // ── Quick links — built from the workspace's actual module catalog ───────

  const flatModuleLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const section of moduleMap?.sections || []) {
      for (const item of section.items || []) {
        if (Array.isArray(item.tabs) && item.tabs.length) {
          for (const tab of item.tabs) map.set(tab.id, tab.label || tab.id);
        } else {
          map.set(item.id, item.label || item.id);
        }
      }
    }
    return map;
  }, [moduleMap]);

  const dynamicQuickLinks = useMemo(() => {
    const excludedSections = new Set(["add-ons", "department-accesses", "profile"]);
    const links: QuickLinkItem[] = [];
    for (const section of moduleMap?.sections || []) {
      if (excludedSections.has(section.sectionId)) continue;
      for (const item of section.items || []) {
        if (item.isGroup) {
          for (const tab of item.tabs || []) {
            if (tab.id === "attendance" || !enabledModuleIds.has(tab.id)) continue;
            const link = toQuickLink(tab.id, tab.label || tab.id);
            if (link) links.push(link);
          }
          continue;
        }
        if (item.id === "attendance" || !enabledModuleIds.has(item.id)) continue;
        const link = toQuickLink(item.id, flatModuleLabels.get(item.id) || item.id);
        if (link) links.push(link);
      }
    }
    return links;
  }, [moduleMap, enabledModuleIds, flatModuleLabels]);

  const quickLinks = useMemo(() => {
    const links: QuickLinkItem[] = [
      { icon: MapIcon, label: "Wono Nomad Listings", description: "Manage nomad space listings", route: "/key-apps/nomad-listings", color: "#059669" },
      { icon: LayoutGrid, label: "Organization", description: "Departments & members", route: "/core-modules/organization-management", color: "#0891b2" },
      { icon: BarChart3, label: "Reports", description: "Analytics & export", route: "/app/reports", color: "#059669" },
      ...(showWebsite ? [{ icon: Globe, label: "Website Builder", description: "Build & manage your site", route: "/key-apps/website-builder", color: "#7c3aed" }] : []),
      ...dynamicQuickLinks,
    ];
    const seenRoutes = new Set<string>();
    return links.filter((link) => {
      if (seenRoutes.has(link.route)) return false;
      seenRoutes.add(link.route);
      return true;
    });
  }, [dynamicQuickLinks, showWebsite]);

  const profileLinks: QuickLinkItem[] = [
    { icon: UserCog, label: "My Profile", description: "Your personal account details", route: "/profile/my-profile", color: "#1E3D73" },
    ...(canAccessCompanyProfile({ roleBand, departmentNames })
      ? [{ icon: Building2, label: "Company Profile", description: "Workspace & business details", route: "/profile/company-profile", color: "#7c3aed" }]
      : []),
    { icon: KeyRound, label: "Change Password", description: "Update your login credentials", route: "/profile/change-password", color: "#0891b2" },
  ];

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
  const recentVisitors = useMemo(() =>
    [...visitorsRaw].sort((a: any, b: any) =>
      new Date(b.checkInTime || b.dateOfVisit || b.createdAt || 0).getTime() -
      new Date(a.checkInTime || a.dateOfVisit || a.createdAt || 0).getTime()
    ).slice(0, 5),
    [visitorsRaw]);
  const recentLeads = useMemo(() =>
    [...leadsRaw].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5),
    [leadsRaw]);
  const recentLeaveRequests = useMemo(() =>
    [...leaveRequestsRaw].sort((a: any, b: any) => new Date(b.createdAt || b.startDate || 0).getTime() - new Date(a.createdAt || a.startDate || 0).getTime()).slice(0, 5),
    [leaveRequestsRaw]);

  const visitorTypeDonut = useMemo(() => {
    const map: Record<string, number> = {};
    visitorsRaw.forEach((v: any) => {
      const raw = String(v.visitorType || v.type || "standard");
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
  }, [visitorsRaw]);

  // ── Layout ────────────────────────────────────────────────────────────────

  const cardCols = Math.min(Math.max(statCards.length, 1), 4) as 1 | 2 | 3 | 4;
  const showTeamStatus = showAttendance;
  const teamRowCount = [showTeamStatus, showVisitors, showVisitors].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-5">

      {/* Clock in / out */}
      {showAttendance && <TodayAttendanceCard />}

      {/* Dynamic stat cards — common, extra-common, core & custom-selected modules */}
      {statCards.length > 0 && (
        <WidgetSection layout={cardCols} title="Overview" border normalCase>
          {statCards.map((c, i) => <StatCard key={i} {...c} />)}
        </WidgetSection>
      )}

      {/* Finance highlight row */}
      {showFinance && (
        <WidgetSection layout={3} title="Financial Snapshot" border normalCase>
          <StatCard icon={Banknote} label="Booking Revenue" value={fmtINR(bookingStats.revenue, workspacePreferences.currency)} sub="Meeting room revenue" color="#f59e0b" route="/app/department-accesses/finance-department/billing-payments" />
          <StatCard icon={CreditCard} label="Security Deposits" value={billingStats.total} sub={`${billingStats.paid} paid · ${billingStats.pending} pending`} color="#1E3D73" route="/app/department-accesses/finance-department/billing-payments" />
          {showHR && <StatCard icon={Users} label="Net Payable" value={fmtINR(hrStats.netPayable, workspacePreferences.currency)} sub={`${hrStats.paid}/${hrStats.totalEmployees} employees paid`} color="#7c3aed" route="/app/department-accesses/finance-department/billing-payments" />}
          {!showHR && <StatCard icon={UserCheck} label="Confirmed Bookings" value={bookingStats.confirmed} sub={`${bookingStats.pending} pending`} color="#059669" route="/app/meeting-rooms" />}
        </WidgetSection>
      )}

      {/* Team live status + founder visitors */}
      {(showTeamStatus || showVisitors) && (
        <div className={`grid grid-cols-1 gap-4 ${teamRowCount >= 3 ? "lg:grid-cols-3" : teamRowCount === 2 ? "lg:grid-cols-2" : ""}`}>
          {showTeamStatus && <TeamLiveStatusCard viewAllRoute="/common-modules/attendance" />}
          {showVisitors && (
            <SectionCard title="Recent Visitors" linkLabel="View all" linkRoute="/visitors/visitor-management">
              {recentVisitors.length > 0 ? recentVisitors.map((v: any, i: number) => (
                <RecentItem
                  key={v.id || i}
                  title={v.fullName || v.name || "Visitor"}
                  sub={v.purpose || v.visitorType || "—"}
                  badge={v.isCheckedIn || v.checkedIn ? "Checked In" : "Logged"}
                  badgeColor={statusBadgeColor(v.isCheckedIn || v.checkedIn ? "active" : "completed")}
                  time={humanRelTime(v.checkInTime || v.dateOfVisit || v.createdAt)}
                />
              )) : <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No visitors logged yet</p></div>}
            </SectionCard>
          )}
          {showVisitors && (
            <DonutWidget title="Visitor Type" series={visitorTypeDonut.series} labels={visitorTypeDonut.labels} colors={visitorTypeDonut.colors} centerLabel="Visitors" />
          )}
        </div>
      )}

      {/* Quick links — dynamic, based on the founder's module access */}
      <WidgetSection layout={Math.min(quickLinks.length, 4) as 1 | 2 | 3 | 4} title="Quick Links" border normalCase>
        {quickLinks.map((ql, i) => <QuickLink key={i} {...ql} />)}
      </WidgetSection>

      {/* Profile */}
      <WidgetSection layout={3} title="Profile" border normalCase>
        {profileLinks.map((pl, i) => <QuickLink key={i} {...pl} />)}
      </WidgetSection>

      {/* Charts — status donuts */}
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

      {/* Recent activity grid — bookings / tickets */}
      {(showBookings || showTickets) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {showBookings && (
            <SectionCard title="Recent Bookings" linkLabel="View all" linkRoute="/app/meeting-rooms">
              {recentBookings.length > 0 ? recentBookings.map((b: any, i: number) => (
                <RecentItem key={i} title={b.bookedByName || b.clientName || "Guest"} sub={b.roomName || b.resourceName || "Meeting Room"} badge={b.status || "Pending"} badgeColor={statusBadgeColor(b.status || "")} time={humanRelTime(b.createdAt)} />
              )) : <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No recent bookings</p></div>}
            </SectionCard>
          )}
          {showTickets && (
            <SectionCard title="Recent Tickets" linkLabel="View all" linkRoute="/app/tickets">
              {recentTickets.length > 0 ? recentTickets.map((t: any, i: number) => (
                <RecentItem key={i} title={t.title || t.subject || `Ticket #${i + 1}`} sub={t.category || t.issueType || "Support"} badge={t.status || "Open"} badgeColor={statusBadgeColor(t.status || "")} time={humanRelTime(t.createdAt)} />
              )) : <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No recent tickets</p></div>}
            </SectionCard>
          )}
        </div>
      )}

      {/* Recent activity grid — leads / leave requests */}
      {((showSales || showWebsite) || showLeaveRequests) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(showSales || showWebsite) && (
            <>
              <SectionCard title="Recent Leads" linkLabel="View all" linkRoute="/key-apps/website-builder/leads">
                {recentLeads.length > 0 ? recentLeads.map((l: any, i: number) => (
                  <RecentItem key={l._id || i} title={l.name || l.fullName || "Lead"} sub={l.email || l.phone || "—"} badge={(l.status || "Pending") === "Pending" ? "New" : l.status} badgeColor={statusBadgeColor(l.status === "Contacted" || l.status === "Closed" ? "active" : "pending")} time={humanRelTime(l.createdAt)} />
                )) : <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No leads yet</p></div>}
              </SectionCard>
              <DonutWidget title="Lead Status" series={[leadStats.newLeads, leadStats.total - leadStats.newLeads]} labels={["New", "Contacted"]} colors={["#1E3D73", "#80bf01"]} centerLabel="Leads" emptyText="No leads yet" />
            </>
          )}
          {showLeaveRequests && (
            <>
              <SectionCard title="Recent Leave Requests" linkLabel="View all" linkRoute="/common-modules/leave-requests">
                {recentLeaveRequests.length > 0 ? recentLeaveRequests.map((l: any, i: number) => (
                  <RecentItem key={l.recordId || l.id || i} title={l.employeeName || "Employee"} sub={`${l.leaveType || "Leave"} · ${l.days || 1}d`} badge={l.status || "Pending"} badgeColor={statusBadgeColor(l.status === "approved" ? "active" : l.status === "rejected" ? "completed" : "pending")} time={humanRelTime(l.startDate || l.createdAt)} />
                )) : <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No leave requests yet</p></div>}
              </SectionCard>
              <DonutWidget title="Leave Status" series={[leaveStats.pending, leaveStats.approved, leaveStats.rejected]} labels={["Pending", "Approved", "Rejected"]} colors={["#f59e0b", "#22c55e", "#ef4444"]} centerLabel="Requests" emptyText="No leave requests yet" />
            </>
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
              )) : <div className="col-span-3 min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No tenant data</p></div>}
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

      {/* Monthly trends */}
      {showBookings && (
        <BarWidget title="Monthly Booking Trend (FY)" chartId="custom-monthly-bookings" series={bookingsByMonth} options={{ ...BAR_BASE_OPTIONS, colors: ["#1E3D73"] }} height={260} />
      )}
      {showTickets && (
        <BarWidget title="Monthly Ticket Trend (FY)" chartId="custom-monthly-tickets" series={ticketsByMonth} options={{ ...BAR_BASE_OPTIONS, colors: ["#2563EB", "#22c55e"] }} height={260} />
      )}
      {showTenants && (
        <BarWidget title="Monthly Tenant Trend (FY)" chartId="custom-monthly-tenants" series={tenantsByMonth} options={{ ...BAR_BASE_OPTIONS, colors: ["#7c3aed"] }} height={260} />
      )}

    </div>
  );
};

export default CustomDashboard;
