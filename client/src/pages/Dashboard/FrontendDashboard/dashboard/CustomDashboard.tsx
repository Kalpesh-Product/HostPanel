/**
 * CustomDashboard — shown for workspaces on the Custom plan (founder / owner
 * / super_admin view). Renders widgets dynamically based on which modules
 * are enabled for the workspace, mirroring the layout used by Basic and
 * Professional but built from the workspace's actual module selection
 * instead of a fixed feature set:
 *
 *  1. Attendance clock in/out (if the founder has the attendance module)
 *  2. Overview stat cards — bespoke cards for tenants/bookings/tickets/
 *     visitors/leads/leave-requests/finance where real data exists
 *  3. Team Live Status (workspace-wide) + Recent Visitors + Visitor Type
 *  4. Quick Links — built from the workspace's module catalog, not hardcoded
 *  5. Profile shortcuts
 *  6. Recent + status pairs (tenants, bookings/tickets, leads/leave requests)
 *  7. Monthly trend bar charts
 */
import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import DashboardModuleCard from "../../../../components/DashboardModuleCard";
import DonutChart from "../../../../components/graphs/DonutChart";
import BarGraph from "../../../../components/graphs/BarGraph";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import type { DashboardAccessResult } from "../../../../hooks/useDashboardAccess";
import {
  Building2,
  CalendarCheck,
  Ticket,
  Eye,
  UserPlus,
  Banknote,
  UserCheck,
  Globe,
  LayoutGrid,
  BarChart3,
  Users,
  AlertCircle,
  ArrowRight,
  CreditCard,
  Map as MapIcon,
  Activity,
  Boxes,
  SlidersHorizontal,
} from "lucide-react";
import {
  RecentItem,
  MetricTile,
  QuickActionTile,
  ActivityPanel,
} from "./DashboardShared";
import type { QuickLinkItem, MetricTileProps } from "./DashboardShared";
import VerifiedBadgeNotice from "./VerifiedBadgeNotice";
import PlanDowngradedNotice from "./PlanDowngradedNotice";
import PlanExpiringNotice from "./PlanExpiringNotice";
import BonusTrialOfferNotice from "./BonusTrialOfferNotice";
import {
  statusBadgeColor,
  humanRelTime,
  fmtINR,
  hasModuleUse,
  resolveWorkspaceId,
} from "./dashboardUtils";
import { getStoredUser } from "../../../../lib/auth-session";
import useWorkspacePreferences from "../../../../hooks/useWorkspacePreferences";
import { getTenantCompanies } from "../../../../services/tenant-companies";
import { getMeetingRoomBookings } from "../../../../services/meeting-room-bookings";
import { getTickets } from "../../../../services/tickets";
import {
  getTenantBillingSnapshot,
  getPayrollSnapshot,
} from "../../../../services/finance";
import { getLeaveRequests } from "../../../../services/leave-requests";
import TodayAttendanceCard from "./TodayAttendanceCard";
import TeamLiveStatusCard from "./TeamLiveStatusCard";
import WonoListingsCard from "./WonoListingsCard";
import { ICON_BY_ID, DEFAULT_SECTION_ROUTES } from "../ModuleCardsLanding";

interface CustomDashboardProps {
  access: DashboardAccessResult;
}

const BAR_BASE_OPTIONS = {
  chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
  plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
  dataLabels: { enabled: false },
  grid: { borderColor: "#f0f0f0" },
  xaxis: {
    categories: [
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
      "Jan",
      "Feb",
      "Mar",
    ],
  },
  tooltip: { theme: "light" },
};

// Modules CustomDashboard fetches and renders bespoke (recent lists + donuts +
// bar trends).
const CUSTOM_MODULE_COPY: Record<string, string> = {
  "customer-support": "Raise and follow up workspace support requests",
  tickets: "Track raised, assigned and company tickets",
  "meeting-room-system": "Manage rooms, bookings and live availability",
  bookings: "Manage rooms, bookings and live availability",
  "visitors-management": "Run front-desk check-ins and visitor approvals",
  "visitor-management": "Run front-desk check-ins and visitor approvals",
  "organization-management": "Manage members, roles and departments",
  attendance: "Monitor attendance and team live status",
  "leave-requests": "Review leave balances, requests and approvals",
  "billing-payments": "Track invoices, collections and payment activity",
  "finance-budget": "Monitor budgets, expenses and utilisation",
  "employee-management": "Manage employee records and workforce activity",
  "payroll-management": "Run payroll cycles and payment tracking",
  "website-builder": "Build and publish the unit website",
  "tech-website-builder": "Build and publish the unit website",
  "website-leads": "Follow up enquiries captured from the website",
  "wono-nomad": "Manage public nomad space listings",
  reports: "Review workspace analytics and exports",
};

const toQuickLink = (id: string, label: string): QuickLinkItem | null => {
  const route = DEFAULT_SECTION_ROUTES[id];
  if (!route) return null;
  const icon = ICON_BY_ID[id] || LayoutGrid;
  return {
    icon,
    label,
    description:
      CUSTOM_MODULE_COPY[id] || `Open and manage ${label.toLowerCase()}`,
    route,
  };
};

const StatusDonutPanel = ({
  eyebrow,
  title,
  series,
  labels,
  colors,
  centerLabel,
  emptyText = "No activity yet",
}: {
  eyebrow: string;
  title: string;
  series: number[];
  labels: string[];
  colors: string[];
  centerLabel: string;
  emptyText?: string;
}) => (
  <ActivityPanel eyebrow={eyebrow} title={title}>
    <div className="flex min-h-52 flex-1 items-center justify-center">
      {series.some((value) => value > 0) ? (
        <DonutChart
          centerLabel={centerLabel}
          labels={labels}
          colors={colors}
          series={series}
          tooltipValue={series.map(String)}
        />
      ) : (
        <p className="text-content font-pmedium text-slate-400">{emptyText}</p>
      )}
    </div>
  </ActivityPanel>
);

const CustomDashboard = ({ access }: CustomDashboardProps) => {
  const { enabledModuleIds, grantedModuleIds, moduleMap } = access;
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const workspacePreferences = useWorkspacePreferences();

  const storedUser = getStoredUser();
  const dashboardWorkspaceId = resolveWorkspaceId(storedUser);

  // A card only renders when its module is both included in the plan/
  // workspace (enabled axis) AND granted to the current member (access axis).
  // A plan-locked or access-denied module never surfaces a card here.
  const canUse = useCallback(
    (id: string) => hasModuleUse(grantedModuleIds, enabledModuleIds, id),
    [grantedModuleIds, enabledModuleIds],
  );
  const canUseAny = useCallback((ids: string[]) => ids.some(canUse), [canUse]);

  const showTenants = canUseAny([
    "tenant-companies-admin",
    "tenant-companies-sales",
  ]);
  const showBookings = canUseAny(["meeting-room-system", "bookings"]);
  const showTickets = canUse("tickets");
  const showVisitors = canUseAny(["visitors-management", "visitor-management"]);
  const showFinance = canUseAny(["billing-payments", "finance-budget"]);
  const showHR = canUseAny(["employee-management", "payroll-management"]);
  const showSales = canUseAny([
    "leads-management",
    "sales-architecture",
    "website-leads",
  ]);
  const showWebsite = canUseAny(["website-builder", "tech-website-builder"]);
  const showLeaveRequests = canUse("leave-requests");
  const showAttendance = canUse("attendance");

  // Bespoke cards link into the real module routes rather than hardcoded
  // guesses — each resolves to whichever of its module aliases the founder
  // actually has, falling back to the other when only one is enabled.
  const tenantsRoute = canUse("tenant-companies-sales")
    ? DEFAULT_SECTION_ROUTES["tenant-companies-sales"]
    : DEFAULT_SECTION_ROUTES["tenant-companies-admin"];
  const bookingsRoute = canUse("meeting-room-system")
    ? DEFAULT_SECTION_ROUTES["meeting-room-system"]
    : DEFAULT_SECTION_ROUTES["bookings"];
  const ticketsRoute = DEFAULT_SECTION_ROUTES["tickets"];
  const reportsRoute = DEFAULT_SECTION_ROUTES["reports"];
  const billingRoute = DEFAULT_SECTION_ROUTES["billing-payments"];

  // ── Data fetching (conditional, but hooks must always run) ────────────────

  const { data: tenantsRaw = [] } = useQuery({
    queryKey: ["dashboard-tenants"],
    queryFn: async () => {
      if (!showTenants) return [];
      const res = await getTenantCompanies();
      const d = res?.data?.tenants ?? res?.data?.data?.tenants ?? [];
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: showTenants,
  });

  const { data: bookingsRaw = [] } = useQuery({
    queryKey: ["dashboard-bookings", dashboardWorkspaceId],
    queryFn: async () => {
      if (!dashboardWorkspaceId) return [];
      const d = await getMeetingRoomBookings(dashboardWorkspaceId);
      const list = (d as any)?.bookings ?? d;
      return Array.isArray(list) ? list : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: showBookings && Boolean(dashboardWorkspaceId),
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
      // Real endpoint: /api/v1/visitors → { data: { visitors: [...] } }.
      const res = await axiosPrivate.get("/api/v1/visitors", {
        params: { limit: 200 },
      });
      const d = res?.data?.data?.visitors ?? res?.data?.visitors;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: showVisitors,
  });

  const { data: billingRaw } = useQuery({
    queryKey: ["dashboard-billing"],
    queryFn: async () => {
      const d = await getTenantBillingSnapshot();
      return Array.isArray(d)
        ? d
        : Array.isArray((d as any)?.data)
          ? (d as any).data
          : [];
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
    queryKey: ["dashboard-leads", dashboardWorkspaceId],
    queryFn: async () => {
      if (!dashboardWorkspaceId) return [];
      const res = await axiosPrivate.get("/api/leads/get-leads", {
        params: { workspaceId: dashboardWorkspaceId },
      });
      return Array.isArray(res?.data) ? res.data : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: (showSales || showWebsite) && Boolean(dashboardWorkspaceId),
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

  // ── Derived stats ──────────────────────────────────────────────────────────

  const tenantStats = useMemo(() => {
    const active = tenantsRaw.filter((t: any) =>
      /active/i.test(t.status || ""),
    ).length;
    const expiringSoon = tenantsRaw.filter((t: any) => {
      if (!t.endDate) return false;
      const days = Math.ceil(
        (new Date(t.endDate).getTime() - Date.now()) / 86400000,
      );
      return days >= 0 && days <= 30;
    }).length;
    return { total: tenantsRaw.length, active, expiringSoon };
  }, [tenantsRaw]);

  const bookingStats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayCount = bookingsRaw.filter((b: any) =>
      (b.date || b.startDate || b.createdAt || "").startsWith(today),
    ).length;
    const confirmed = bookingsRaw.filter((b: any) =>
      /confirmed/i.test(b.status || ""),
    ).length;
    const pending = bookingsRaw.filter((b: any) =>
      /pending/i.test(b.status || ""),
    ).length;
    const cancelled = bookingsRaw.filter((b: any) =>
      /cancelled/i.test(b.status || ""),
    ).length;
    const revenue = bookingsRaw.reduce(
      (s: number, b: any) => s + (b.totalAmount || b.amount || 0),
      0,
    );
    return {
      total: bookingsRaw.length,
      todayCount,
      confirmed,
      pending,
      cancelled,
      revenue,
    };
  }, [bookingsRaw]);

  const ticketStats = useMemo(() => {
    const open = ticketsRaw.filter((t: any) =>
      /open/i.test(t.status || ""),
    ).length;
    const resolved = ticketsRaw.filter((t: any) =>
      /resolved|closed/i.test(t.status || ""),
    ).length;
    const inProgress = ticketsRaw.filter((t: any) =>
      /progress/i.test(t.status || ""),
    ).length;
    return { total: ticketsRaw.length, open, resolved, inProgress };
  }, [ticketsRaw]);

  const visitorStats = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayCount = visitorsRaw.filter((v: any) =>
      (v.checkInAt || v.createdAt || "").startsWith(todayStr),
    ).length;
    const checkedIn = visitorsRaw.filter(
      (v: any) =>
        String(v.status || "").toLowerCase() === "checked_in" ||
        (v.checkInAt && !v.checkOutAt),
    ).length;
    return { todayCount, checkedIn };
  }, [visitorsRaw]);

  const billingStats = useMemo(() => {
    const bills = Array.isArray(billingRaw) ? billingRaw : [];
    const paid = bills.filter((b: any) =>
      /paid/i.test(b.securityDepositPaidStatus || ""),
    ).length;
    const pending = bills.length - paid;
    return { total: bills.length, paid, pending };
  }, [billingRaw]);

  const hrStats = useMemo(() => {
    const cycle = (payrollSnap as any)?.currentCycle;
    const employees: any[] = cycle?.employees ?? [];
    const netPayable = employees.reduce(
      (s: number, e: any) => s + (e.financials?.netSalary || 0),
      0,
    );
    const paid = employees.filter((e: any) =>
      /paid/i.test(e.payment?.status || e.financials?.paymentStatus || ""),
    ).length;
    return { totalEmployees: employees.length, netPayable, paid };
  }, [payrollSnap]);

  const leadStats = useMemo(() => {
    const newLeads = leadsRaw.filter(
      (l: any) => (l.status || "Pending") === "Pending",
    ).length;
    return { total: leadsRaw.length, newLeads };
  }, [leadsRaw]);

  const leaveStats = useMemo(() => {
    const pending = leaveRequestsRaw.filter(
      (l: any) => String(l.status || "").toLowerCase() === "pending",
    ).length;
    const approved = leaveRequestsRaw.filter(
      (l: any) => String(l.status || "").toLowerCase() === "approved",
    ).length;
    const rejected = leaveRequestsRaw.filter(
      (l: any) => String(l.status || "").toLowerCase() === "rejected",
    ).length;
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
    return [
      { name: "Received", data: received },
      { name: "Resolved", data: resolved },
    ];
  }, [ticketsRaw]);

  const tenantsByMonth = useMemo(() => {
    const joined = new Array(12).fill(0);
    tenantsRaw.forEach((t: any) => {
      const d = new Date(t.createdAt || "");
      if (!isNaN(d.getTime())) joined[(d.getMonth() + 9) % 12]++;
    });
    return [{ name: "Joined", data: joined }];
  }, [tenantsRaw]);

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
    const excludedSections = new Set([
      "add-ons",
      "department-accesses",
      "profile",
    ]);
    const links: QuickLinkItem[] = [];
    for (const section of moduleMap?.sections || []) {
      if (excludedSections.has(section.sectionId)) continue;
      for (const item of section.items || []) {
        if (item.isGroup) {
          for (const tab of item.tabs || []) {
            if (tab.id === "attendance" || !canUse(tab.id)) continue;
            const link = toQuickLink(tab.id, tab.label || tab.id);
            if (link) links.push(link);
          }
          continue;
        }
        if (item.id === "attendance" || !canUse(item.id)) continue;
        const link = toQuickLink(
          item.id,
          flatModuleLabels.get(item.id) || item.id,
        );
        if (link) links.push(link);
      }
    }
    return links;
  }, [moduleMap, canUse, flatModuleLabels]);

  const quickLinks = useMemo(() => {
    const links: QuickLinkItem[] = [
      ...(canUse("wono-nomad")
        ? [
            {
              icon: MapIcon,
              label: "Wono Nomad Listings",
              description: "Manage nomad space listings",
              route: "/key-apps/nomad-listings",
              color: "#059669",
            },
          ]
        : []),
      ...(canUse("organization-management")
        ? [
            {
              icon: LayoutGrid,
              label: "Organization",
              description: "Departments & members",
              route: "/core-modules/organization-management",
              color: "#0891b2",
            },
          ]
        : []),
      ...(canUse("reports")
        ? [
            {
              icon: BarChart3,
              label: "Reports",
              description: "Analytics & export",
              route: reportsRoute,
              color: "#059669",
            },
          ]
        : []),
      ...(showWebsite
        ? [
            {
              icon: Globe,
              label: "Website Builder",
              description: "Build & manage your site",
              route: "/key-apps/website-builder",
              color: "#7c3aed",
            },
          ]
        : []),
      ...dynamicQuickLinks,
    ];
    const seenRoutes = new Set<string>();
    return links.filter((link) => {
      if (seenRoutes.has(link.route)) return false;
      seenRoutes.add(link.route);
      return true;
    });
  }, [dynamicQuickLinks, showWebsite, canUse, reportsRoute]);

  const moduleCards = useMemo(() => {
    const palette = [
      "#2563EB",
      "#7C3AED",
      "#059669",
      "#EA580C",
      "#0891B2",
      "#DC2626",
    ];
    return quickLinks.map((link, index) => ({
      ...link,
      color: link.color || palette[index % palette.length],
    }));
  }, [quickLinks]);

  const quickActions = useMemo(
    () =>
      moduleCards
        .filter((link) =>
          [
            "/common-modules/attendance",
            "/common-modules/leave-requests",
            "/common-modules/customer-support",
            "/common-modules/tickets",
            "/common-modules/meeting-room-booking",
            "/core-modules/organization-management",
            "/profile/plan-billing",
          ].some((route) => link.route.startsWith(route)),
        )
        .slice(0, 6),
    [moduleCards],
  );

  const activeModuleCount = useMemo(() => {
    const usable = new Set<string>();
    enabledModuleIds.forEach((id) => {
      if (canUse(id)) usable.add(id);
    });
    return usable.size;
  }, [enabledModuleIds, canUse]);

  const overviewMetricCards = useMemo<MetricTileProps[]>(() => {
    const cards: MetricTileProps[] = [];
    if (showTenants) {
      cards.push({
        icon: Building2,
        label: "Total Tenants",
        value: tenantStats.total,
        sub: `${tenantStats.active} active`,
        color: "#1E3D73",
        route: tenantsRoute,
      });
    }
    if (showBookings) {
      cards.push({
        icon: CalendarCheck,
        label: "Bookings Today",
        value: bookingStats.todayCount,
        sub: `${bookingStats.confirmed} confirmed overall`,
        color: "#2563EB",
        route: bookingsRoute,
      });
    }
    if (showTickets) {
      cards.push({
        icon: Ticket,
        label: "Open Tickets",
        value: ticketStats.open,
        sub: `${ticketStats.inProgress} in progress`,
        color: "#DC2626",
        route: ticketsRoute,
      });
    }
    if (showVisitors) {
      cards.push({
        icon: Eye,
        label: "Visitors Today",
        value: visitorStats.todayCount,
        sub: `${visitorStats.checkedIn} checked in`,
        color: "#059669",
        route: "/visitors/visitor-management",
      });
    }
    if (showSales || showWebsite) {
      cards.push({
        icon: UserPlus,
        label: "Website Leads",
        value: leadStats.total,
        sub: `${leadStats.newLeads} need follow-up`,
        color: "#EA580C",
        route: "/key-apps/website-builder/leads",
      });
    }
    if (showLeaveRequests) {
      cards.push({
        icon: CalendarCheck,
        label: "Leave Requests",
        value: leaveStats.total,
        sub: `${leaveStats.pending} pending`,
        color: "#F59E0B",
        route: "/common-modules/leave-requests",
      });
    }
    cards.push(
      {
        icon: Users,
        label: "Active Members",
        value: access.metrics.activeMembers,
        sub: `${access.metrics.totalMembers} total members`,
        color: "#0891B2",
        route: "/core-modules/organization-management",
      },
      {
        icon: Boxes,
        label: "Active Modules",
        value: activeModuleCount,
        sub: `${access.verticalKeys.length} vertical${access.verticalKeys.length === 1 ? "" : "s"} enabled`,
        color: "#7C3AED",
        route: "/core-modules/workspace-settings",
      },
    );
    return cards.slice(0, 8);
  }, [
    access.metrics.activeMembers,
    access.metrics.totalMembers,
    access.verticalKeys.length,
    activeModuleCount,
    bookingStats,
    bookingsRoute,
    leadStats,
    leaveStats,
    showBookings,
    showLeaveRequests,
    showSales,
    showTenants,
    showTickets,
    showVisitors,
    showWebsite,
    tenantStats,
    tenantsRoute,
    ticketStats,
    ticketsRoute,
    visitorStats,
  ]);

  const attentionItems = useMemo(
    () =>
      [
        showTickets
          ? {
              label: "Open support tickets",
              value: ticketStats.open,
              detail: `${ticketStats.inProgress} already in progress`,
              route: ticketsRoute,
              color: "#DC2626",
            }
          : null,
        showBookings
          ? {
              label: "Bookings awaiting confirmation",
              value: bookingStats.pending,
              detail: `${bookingStats.confirmed} bookings confirmed`,
              route: bookingsRoute,
              color: "#F59E0B",
            }
          : null,
        showLeaveRequests
          ? {
              label: "Pending leave decisions",
              value: leaveStats.pending,
              detail: `${leaveStats.approved} approved requests`,
              route: "/common-modules/leave-requests",
              color: "#7C3AED",
            }
          : null,
        showFinance
          ? {
              label: "Pending security deposits",
              value: billingStats.pending,
              detail: `${billingStats.paid} deposits collected`,
              route: billingRoute,
              color: "#EA580C",
            }
          : null,
        showTenants
          ? {
              label: "Agreements expiring soon",
              value: tenantStats.expiringSoon,
              detail: "Due within the next 30 days",
              route: tenantsRoute,
              color: "#0891B2",
            }
          : null,
      ].filter(
        (
          item,
        ): item is {
          label: string;
          value: number;
          detail: string;
          route: string;
          color: string;
        } => Boolean(item && item.value > 0 && item.route),
      ),
    [
      billingRoute,
      billingStats,
      bookingStats,
      bookingsRoute,
      leaveStats,
      showBookings,
      showFinance,
      showLeaveRequests,
      showTenants,
      showTickets,
      tenantStats.expiringSoon,
      tenantsRoute,
      ticketStats,
      ticketsRoute,
    ],
  );

  // ── Recent items ──────────────────────────────────────────────────────────

  const recentBookings = useMemo(
    () =>
      [...bookingsRaw]
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 5),
    [bookingsRaw],
  );
  const recentTickets = useMemo(
    () =>
      [...ticketsRaw]
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 5),
    [ticketsRaw],
  );
  const recentTenants = useMemo(
    () =>
      [...tenantsRaw]
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 6),
    [tenantsRaw],
  );
  const recentVisitors = useMemo(
    () =>
      [...visitorsRaw]
        .sort(
          (a: any, b: any) =>
            new Date(b.checkInAt || b.createdAt || 0).getTime() -
            new Date(a.checkInAt || a.createdAt || 0).getTime(),
        )
        .slice(0, 5),
    [visitorsRaw],
  );
  const recentLeads = useMemo(
    () =>
      [...leadsRaw]
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 5),
    [leadsRaw],
  );
  const recentLeaveRequests = useMemo(
    () =>
      [...leaveRequestsRaw]
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt || b.startDate || 0).getTime() -
            new Date(a.createdAt || a.startDate || 0).getTime(),
        )
        .slice(0, 5),
    [leaveRequestsRaw],
  );

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

  const showTeamStatus = showAttendance;
  const teamRowCount = [showTeamStatus, showVisitors, showVisitors].filter(
    Boolean,
  ).length;

  return (
    <div className="flex flex-col gap-5">
      {showAttendance && (
        <div data-tour="custom-attendance">
          <TodayAttendanceCard variant="hero" />
        </div>
      )}

      <PlanDowngradedNotice />
      <PlanExpiringNotice />

      <WonoListingsCard />
      <VerifiedBadgeNotice />
      <BonusTrialOfferNotice />

      <section
        data-tour="custom-overview"
        className="rounded-[1.75rem] border border-blue-100 bg-[#F8FAFD] p-5 shadow-[0_12px_34px_rgba(30,61,115,0.06)] sm:p-6"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E3D73] text-white shadow-sm">
            <Activity size={18} />
          </div>
          <div>
            <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
              Live unit
            </p>
            <h3 className="mt-0.5 text-lg font-pmedium text-[#1E3D73]">
              Unit Pulse
            </h3>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {overviewMetricCards.map((card) => (
            <MetricTile key={card.label} {...card} />
          ))}
        </div>
      </section>

      {attentionItems.length > 0 && (
        <section className="rounded-[1.75rem] border border-amber-100 bg-amber-50/40 p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <AlertCircle size={18} />
            </div>
            <div>
              <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-amber-700">
                Action queue
              </p>
              <h3 className="mt-0.5 text-lg font-pmedium text-[#1E3D73]">
                Needs Attention
              </h3>
            </div>
          </div>
          <div className="divide-y divide-amber-100 overflow-hidden rounded-2xl border border-amber-100 bg-white">
            {attentionItems.map((item) => (
              <button
                type="button"
                key={item.label}
                onClick={() => navigate(item.route)}
                className="group flex w-full items-center gap-4 px-4 py-3.5 text-left transition hover:bg-amber-50/60"
              >
                <span
                  className="flex h-9 min-w-9 items-center justify-center rounded-xl text-sm font-pmedium text-white"
                  style={{ backgroundColor: item.color }}
                >
                  {item.value}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-pmedium text-[#1E3D73]">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-pmedium text-slate-500">
                    {item.detail}
                  </span>
                </span>
                <ArrowRight
                  size={14}
                  className="text-amber-300 transition group-hover:translate-x-0.5 group-hover:text-amber-600"
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {moduleCards.length > 0 && (
        <section className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-[0_12px_34px_rgba(30,61,115,0.06)] sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-violet-600">
                Selected for your workspace
              </p>
              <h3 className="mt-1 text-lg font-pmedium text-[#1E3D73]">
                Custom Modules
              </h3>
              <p className="mt-1 text-xs font-pmedium text-slate-500">
                Only enabled modules that are granted to you are shown here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/core-modules/workspace-settings")}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3.5 py-2 text-[9px] font-pmedium uppercase tracking-widest text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
            >
              <SlidersHorizontal size={13} /> Manage modules
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {moduleCards.map((module) => {
              const Icon = module.icon;
              return (
                <DashboardModuleCard
                  key={module.route}
                  icon={<Icon size={19} />}
                  title={module.label}
                  description={module.description}
                  route={module.route}
                  color={module.color}
                />
              );
            })}
          </div>
        </section>
      )}

      {quickActions.length > 0 && (
        <section
          data-tour="custom-quick-links"
          className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 shadow-[0_12px_34px_rgba(37,99,235,0.08)] sm:p-6"
        >
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70" />
          <div className="relative mb-5">
            <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
              Jump back in
            </p>
            <h3 className="mt-1 text-lg font-pmedium text-[#1E3D73]">
              Quick Actions
            </h3>
            <p className="mt-1 text-xs font-pmedium text-slate-500">
              Open the most-used tools in this unit.
            </p>
          </div>
          <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => (
              <QuickActionTile key={action.route} {...action} />
            ))}
          </div>
        </section>
      )}

      {showFinance && (
        <section
          data-tour="custom-finance-snapshot"
          className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50/30 p-5 sm:p-6"
        >
          <div className="mb-5">
            <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-emerald-700">
              Cash and commitments
            </p>
            <h3 className="mt-1 text-lg font-pmedium text-[#1E3D73]">
              Financial Health
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <MetricTile
              icon={Banknote}
              label="Booking Revenue"
              value={fmtINR(
                bookingStats.revenue,
                workspacePreferences.currency,
              )}
              sub="Meeting room revenue"
              color="#059669"
              route={billingRoute}
            />
            <MetricTile
              icon={CreditCard}
              label="Security Deposits"
              value={billingStats.total}
              sub={`${billingStats.paid} paid · ${billingStats.pending} pending`}
              color="#EA580C"
              route={billingRoute}
            />
            {showHR ? (
              <MetricTile
                icon={Users}
                label="Net Payable"
                value={fmtINR(
                  hrStats.netPayable,
                  workspacePreferences.currency,
                )}
                sub={`${hrStats.paid}/${hrStats.totalEmployees} employees paid`}
                color="#7C3AED"
                route={billingRoute}
              />
            ) : (
              <MetricTile
                icon={UserCheck}
                label="Confirmed Bookings"
                value={bookingStats.confirmed}
                sub={`${bookingStats.pending} pending`}
                color="#2563EB"
                route={bookingsRoute}
              />
            )}
          </div>
        </section>
      )}

      {/* Team live status + founder visitors */}
      {(showTeamStatus || showVisitors) && (
        <div
          data-tour="custom-team-status"
          className={`grid grid-cols-1 gap-4 ${teamRowCount >= 3 ? "lg:grid-cols-3" : teamRowCount === 2 ? "lg:grid-cols-2" : ""}`}
        >
          {showTeamStatus && (
            <TeamLiveStatusCard viewAllRoute="/common-modules/attendance" />
          )}
          {showVisitors && (
            <ActivityPanel
              eyebrow="Front desk"
              title="Recent Visitors"
              action={
                <button
                  type="button"
                  onClick={() => navigate("/visitors/visitor-management")}
                  className="inline-flex items-center gap-1 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]"
                >
                  View all <ArrowRight size={12} />
                </button>
              }
            >
              {recentVisitors.length > 0 ? (
                recentVisitors.map((v: any, i: number) => {
                  const vStatus = String(v.status || "").toLowerCase();
                  return (
                    <RecentItem
                      key={v.id || i}
                      title={v.fullName || v.firstName || "Visitor"}
                      sub={v.purpose || v.company || "Visit"}
                      badge={
                        vStatus === "checked_in"
                          ? "Checked In"
                          : vStatus === "checked_out"
                            ? "Checked Out"
                            : vStatus === "pending"
                              ? "Pending"
                              : "Logged"
                      }
                      badgeColor={statusBadgeColor(
                        vStatus === "checked_in"
                          ? "active"
                          : vStatus === "pending"
                            ? "pending"
                            : "completed",
                      )}
                      time={humanRelTime(v.checkInAt || v.createdAt)}
                    />
                  );
                })
              ) : (
                <div className="min-h-48 flex items-center justify-center">
                  <p className="text-content text-gray-400 text-center">
                    No visitors logged yet
                  </p>
                </div>
              )}
            </ActivityPanel>
          )}
          {showVisitors && (
            <ActivityPanel eyebrow="Visitor mix" title="Visitor Type">
              <div className="flex min-h-48 flex-1 items-center justify-center">
                {visitorTypeDonut.series.some((value) => value > 0) ? (
                  <DonutChart
                    centerLabel="Visitors"
                    labels={visitorTypeDonut.labels}
                    colors={visitorTypeDonut.colors}
                    series={visitorTypeDonut.series}
                    tooltipValue={visitorTypeDonut.series.map(String)}
                  />
                ) : (
                  <p className="text-content font-pmedium text-slate-400">
                    No visitor activity yet
                  </p>
                )}
              </div>
            </ActivityPanel>
          )}
        </div>
      )}

      {(showTenants || showBookings || showTickets) && (
        <div
          data-tour="custom-status-charts"
          className={`grid grid-cols-1 gap-4 ${[showTenants, showBookings, showTickets].filter(Boolean).length === 3 ? "lg:grid-cols-3" : [showTenants, showBookings, showTickets].filter(Boolean).length === 2 ? "lg:grid-cols-2" : ""}`}
        >
          {showTenants && (
            <StatusDonutPanel
              eyebrow="Occupancy base"
              title="Tenant Status"
              series={[
                tenantStats.active,
                tenantsRaw.filter((t: any) => /pending/i.test(t.status || ""))
                  .length,
                tenantStats.expiringSoon,
              ]}
              labels={["Active", "Pending", "Expiring"]}
              colors={["#1E3D73", "#80bf01", "#f59e0b"]}
              centerLabel="Tenants"
            />
          )}
          {showBookings && (
            <StatusDonutPanel
              eyebrow="Reservations"
              title="Booking Status"
              series={[
                bookingStats.confirmed,
                bookingStats.pending,
                bookingStats.cancelled,
              ]}
              labels={["Confirmed", "Pending", "Cancelled"]}
              colors={["#1E3D73", "#f59e0b", "#ef4444"]}
              centerLabel="Bookings"
            />
          )}
          {showTickets && (
            <StatusDonutPanel
              eyebrow="Support workload"
              title="Ticket Status"
              series={[
                ticketStats.open,
                ticketStats.inProgress,
                ticketStats.resolved,
              ]}
              labels={["Open", "In Progress", "Resolved"]}
              colors={["#ef4444", "#f59e0b", "#22c55e"]}
              centerLabel="Tickets"
            />
          )}
        </div>
      )}

      {/* Recent activity grid — bookings / tickets */}
      {(showBookings || showTickets) && (
        <div
          data-tour="custom-bookings-tickets"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {showBookings && (
            <ActivityPanel
              eyebrow="Reservations"
              title="Recent Bookings"
              action={
                <button
                  type="button"
                  onClick={() => navigate(bookingsRoute)}
                  className="inline-flex items-center gap-1 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]"
                >
                  View all <ArrowRight size={12} />
                </button>
              }
            >
              {recentBookings.length > 0 ? (
                recentBookings.map((b: any, i: number) => (
                  <RecentItem
                    key={i}
                    title={b.bookedByName || b.clientName || "Guest"}
                    sub={b.roomName || b.resourceName || "Meeting Room"}
                    badge={b.status || "Pending"}
                    badgeColor={statusBadgeColor(b.status || "")}
                    time={humanRelTime(b.createdAt)}
                  />
                ))
              ) : (
                <div className="min-h-48 flex items-center justify-center">
                  <p className="text-content text-gray-400 text-center">
                    No recent bookings
                  </p>
                </div>
              )}
            </ActivityPanel>
          )}
          {showTickets && (
            <ActivityPanel
              eyebrow="Support desk"
              title="Recent Tickets"
              action={
                <button
                  type="button"
                  onClick={() => navigate(ticketsRoute)}
                  className="inline-flex items-center gap-1 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]"
                >
                  View all <ArrowRight size={12} />
                </button>
              }
            >
              {recentTickets.length > 0 ? (
                recentTickets.map((t: any, i: number) => (
                  <RecentItem
                    key={i}
                    title={t.title || t.subject || `Ticket #${i + 1}`}
                    sub={t.category || t.issueType || "Support"}
                    badge={t.status || "Open"}
                    badgeColor={statusBadgeColor(t.status || "")}
                    time={humanRelTime(t.createdAt)}
                  />
                ))
              ) : (
                <div className="min-h-48 flex items-center justify-center">
                  <p className="text-content text-gray-400 text-center">
                    No recent tickets
                  </p>
                </div>
              )}
            </ActivityPanel>
          )}
        </div>
      )}

      {/* Recent activity — leads / leave requests each get their own bounded
          row (rather than one grid combining both) so their page-tour anchor
          highlights just that row instead of the full combined block. */}
      {(showSales || showWebsite) && (
        <div
          data-tour="custom-leads"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <ActivityPanel
            eyebrow="Lead pipeline"
            title="Recent Leads"
            action={
              <button
                type="button"
                onClick={() => navigate("/key-apps/website-builder/leads")}
                className="inline-flex items-center gap-1 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]"
              >
                View all <ArrowRight size={12} />
              </button>
            }
          >
            {recentLeads.length > 0 ? (
              recentLeads.map((l: any, i: number) => (
                <RecentItem
                  key={l._id || i}
                  title={l.name || l.fullName || "Lead"}
                  sub={l.email || l.phone || "—"}
                  badge={
                    (l.status || "Pending") === "Pending" ? "New" : l.status
                  }
                  badgeColor={statusBadgeColor(
                    l.status === "Contacted" || l.status === "Closed"
                      ? "active"
                      : "pending",
                  )}
                  time={humanRelTime(l.createdAt)}
                />
              ))
            ) : (
              <div className="min-h-48 flex items-center justify-center">
                <p className="text-content text-gray-400 text-center">
                  No leads yet
                </p>
              </div>
            )}
          </ActivityPanel>
          <StatusDonutPanel
            eyebrow="Pipeline mix"
            title="Lead Status"
            series={[leadStats.newLeads, leadStats.total - leadStats.newLeads]}
            labels={["New", "Contacted"]}
            colors={["#1E3D73", "#80bf01"]}
            centerLabel="Leads"
            emptyText="No leads yet"
          />
        </div>
      )}
      {showLeaveRequests && (
        <div
          data-tour="custom-leave-requests"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <ActivityPanel
            eyebrow="People operations"
            title="Recent Leave Requests"
            action={
              <button
                type="button"
                onClick={() => navigate("/common-modules/leave-requests")}
                className="inline-flex items-center gap-1 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]"
              >
                View all <ArrowRight size={12} />
              </button>
            }
          >
            {recentLeaveRequests.length > 0 ? (
              recentLeaveRequests.map((l: any, i: number) => (
                <RecentItem
                  key={l.recordId || l.id || i}
                  title={l.employeeName || "Employee"}
                  sub={`${l.leaveType || "Leave"} · ${l.days || 1}d`}
                  badge={l.status || "Pending"}
                  badgeColor={statusBadgeColor(
                    l.status === "approved"
                      ? "active"
                      : l.status === "rejected"
                        ? "completed"
                        : "pending",
                  )}
                  time={humanRelTime(l.startDate || l.createdAt)}
                />
              ))
            ) : (
              <div className="min-h-48 flex items-center justify-center">
                <p className="text-content text-gray-400 text-center">
                  No leave requests yet
                </p>
              </div>
            )}
          </ActivityPanel>
          <StatusDonutPanel
            eyebrow="Decision mix"
            title="Leave Status"
            series={[
              leaveStats.pending,
              leaveStats.approved,
              leaveStats.rejected,
            ]}
            labels={["Pending", "Approved", "Rejected"]}
            colors={["#f59e0b", "#22c55e", "#ef4444"]}
            centerLabel="Requests"
            emptyText="No leave requests yet"
          />
        </div>
      )}

      {/* Recent tenants */}
      {showTenants && (
        <div data-tour="custom-tenants">
          <ActivityPanel
            eyebrow="Workspace occupancy"
            title="Recent Tenants"
            action={
              <button
                type="button"
                onClick={() => navigate(tenantsRoute)}
                className="inline-flex items-center gap-1 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]"
              >
                View all <ArrowRight size={12} />
              </button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentTenants.length > 0 ? (
                recentTenants.map((t: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-pbold text-content flex-shrink-0">
                      {(t.companyName || t.name || "T").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-content font-pmedium text-gray-900 truncate">
                        {t.companyName || t.name || "Tenant"}
                      </p>
                      <p className="text-small text-gray-500 truncate">
                        {t.companyCode || t.sector || "—"}
                      </p>
                    </div>
                    <span
                      className={`ml-auto flex-shrink-0 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${statusBadgeColor(t.status || "")}`}
                    >
                      {t.status || "—"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="col-span-3 min-h-48 flex items-center justify-center">
                  <p className="text-content text-gray-400 text-center">
                    No tenant data
                  </p>
                </div>
              )}
            </div>
          </ActivityPanel>
          {tenantStats.expiringSoon > 0 && (
            <div
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-amber-300 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors"
              onClick={() => navigate(tenantsRoute)}
            >
              <AlertCircle size={20} className="text-amber-600 flex-shrink-0" />
              <p className="text-content font-pmedium text-amber-800">
                {tenantStats.expiringSoon} tenant agreement
                {tenantStats.expiringSoon > 1 ? "s" : ""} expiring within 30
                days
              </p>
              <ArrowRight
                size={14}
                className="ml-auto text-amber-600 flex-shrink-0"
              />
            </div>
          )}
        </div>
      )}

      {(showBookings || showTickets || showTenants) && (
        <div className="flex flex-col gap-5">
          {showBookings && (
            <div data-tour="custom-booking-trend">
              <ActivityPanel
                eyebrow="Financial year"
                title="Monthly Booking Trend"
              >
                <BarGraph
                  chartId="custom-monthly-bookings"
                  data={bookingsByMonth}
                  options={{ ...BAR_BASE_OPTIONS, colors: ["#1E3D73"] }}
                  height={250}
                />
              </ActivityPanel>
            </div>
          )}
          {showTickets && (
            <div data-tour="custom-ticket-trend">
              <ActivityPanel
                eyebrow="Financial year"
                title="Ticket Intake and Resolution"
              >
                <BarGraph
                  chartId="custom-monthly-tickets"
                  data={ticketsByMonth}
                  options={{
                    ...BAR_BASE_OPTIONS,
                    colors: ["#2563EB", "#22c55e"],
                  }}
                  height={250}
                />
              </ActivityPanel>
            </div>
          )}
          {showTenants && (
            <div data-tour="custom-tenant-trend">
              <ActivityPanel
                eyebrow="Financial year"
                title="Monthly Tenant Growth"
              >
                <BarGraph
                  chartId="custom-monthly-tenants"
                  data={tenantsByMonth}
                  options={{ ...BAR_BASE_OPTIONS, colors: ["#7c3aed"] }}
                  height={250}
                />
              </ActivityPanel>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomDashboard;
