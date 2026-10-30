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
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import {
  Building2,
  CalendarCheck,
  Ticket,
  Eye,
  UserPlus,
  Globe,
  LayoutGrid,
  Calendar,
  AlertCircle,
  ArrowRight,
  Zap,
  Activity,
} from "lucide-react";
import {
  MetricTile,
  QuickActionTile,
  ActivityPanel,
  RecentItem,
  EmptyState,
} from "./DashboardShared";
import type { QuickLinkItem } from "./DashboardShared";
import DonutChart from "../../../../components/graphs/DonutChart";
import BarGraph from "../../../../components/graphs/BarGraph";
import WonoListingsCard from "./WonoListingsCard";
import VerifiedBadgeNotice from "./VerifiedBadgeNotice";
import PlanExpiringNotice from "./PlanExpiringNotice";
import BonusTrialOfferNotice from "./BonusTrialOfferNotice";
import { statusBadgeColor, humanRelTime, hasModuleUse } from "./dashboardUtils";
import { getStoredUser } from "../../../../lib/auth-session";
import { getTenantCompanies } from "../../../../services/tenant-companies";
import { getMeetingRoomBookings } from "../../../../services/meeting-room-bookings";
import { getTickets } from "../../../../services/tickets";
import dayjs from "dayjs";
import PlanDashboardSkeleton from "./PlanDashboardSkeleton";

interface ProfessionalDashboardProps {
  onUpgradeClick?: () => void;
  /** Modules included in the plan + enabled for this workspace (from useDashboardAccess). */
  enabledModuleIds: Set<string>;
  /** Per-member module grants — a denied module's card is never rendered. */
  grantedModuleIds: Set<string>;
  /** Set only while this Professional plan is an active free trial. */
  trialDaysLeft?: number | null;
  isTrialExpiringSoon?: boolean;
}

// Shown instead of the four activity rows until the workspace has real data
// in any of tenants, bookings, tickets, or visitors.
const GETTING_STARTED_STEPS = [
  {
    icon: Building2,
    label: "Add your first tenant",
    description: "Onboard a tenant company and its agreement.",
    route: "/department-accesses/sales-department/tenant-companies",
    color: "#1E3D73",
  },
  {
    icon: CalendarCheck,
    label: "Book a meeting room",
    description: "Reserve a room and see it here.",
    route: "/common-modules/meeting-room-booking",
    color: "#2563EB",
  },
  {
    icon: Ticket,
    label: "Raise a support ticket",
    description: "Track issues through to resolution.",
    route: "/common-modules/customer-support",
    color: "#ef4444",
  },
  {
    icon: Eye,
    label: "Log your first visitor",
    description: "Track walk-ins and guests as they check in.",
    route: "/visitors/visitor-management",
    color: "#80bf01",
  },
];

const GettingStartedCard = ({
  steps,
}: {
  steps: typeof GETTING_STARTED_STEPS;
}) => {
  const navigate = useNavigate();
  return (
    <ActivityPanel eyebrow="First steps" title="Getting Started">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => (
          <button
            type="button"
            key={step.route}
            onClick={() => navigate(step.route)}
            className="group flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB] transition group-hover:bg-[#2563EB] group-hover:text-white">
              <step.icon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-content font-pmedium text-slate-900">
                {step.label}
              </p>
              <p className="mt-1 text-small leading-relaxed text-slate-500">
                {step.description}
              </p>
            </div>
            <ArrowRight
              size={13}
              className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#2563EB]"
            />
          </button>
        ))}
      </div>
    </ActivityPanel>
  );
};

// Small "View all" link used in several ActivityPanel headers below.
const ViewAllLink = ({ route }: { route: string }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(route)}
      className="group inline-flex items-center gap-1 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]"
    >
      View all{" "}
      <ArrowRight
        size={12}
        className="transition group-hover:translate-x-0.5"
      />
    </button>
  );
};

const ProfessionalDashboard = ({
  onUpgradeClick,
  enabledModuleIds,
  grantedModuleIds,
  trialDaysLeft,
  isTrialExpiringSoon,
}: ProfessionalDashboardProps) => {
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();

  // A card only renders when its module is both included in the plan/
  // workspace (enabled axis) AND granted to the current member (access axis).
  const canUse = (id: string) =>
    hasModuleUse(grantedModuleIds, enabledModuleIds, id);
  const canUseAny = (ids: string[]) => ids.some(canUse);
  const showTenants = canUseAny([
    "tenant-companies-admin",
    "tenant-companies-sales",
  ]);
  const showBookings = canUse("meeting-room-system");
  const showTickets = canUse("tickets");
  const showVisitors = canUseAny(["visitors-management", "visitor-management"]);
  const showWebsite = canUse("website-builder");
  const showOrg = canUse("organization-management");
  const showCalendar = canUse("calendar");

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
      const d =
        res?.data?.tenants ??
        res?.data?.data?.tenants ??
        res?.data?.data ??
        res?.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: showTenants,
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
    enabled: showBookings && Boolean(dashboardWorkspaceId),
  });

  const { data: ticketsRaw = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["dashboard-tickets"],
    queryFn: async () => {
      const d = await getTickets({ limit: 100 });
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: showTickets,
  });

  const { data: visitorsRaw = [], isLoading: visitorsLoading } = useQuery({
    queryKey: ["dashboard-visitors-full"],
    queryFn: async () => {
      // Real endpoint is /api/v1/visitors → { data: { visitors: [...] } }.
      const res = await axiosPrivate.get("/api/v1/visitors", {
        params: { limit: 200 },
      });
      const d = res?.data?.data?.visitors ?? res?.data?.visitors;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: showVisitors,
  });

  // ── Derived stats ──────────────────────────────────────────────────────────

  const tenantStats = useMemo(() => {
    // Server derives tenant status from contract end: Active / Expiring Soon /
    // Expired / Pending Space Assignment.
    const statusOf = (t: any) => String(t.status || "").toLowerCase();
    const active = tenantsRaw.filter(
      (t: any) => statusOf(t) === "active",
    ).length;
    const expiringSoon = tenantsRaw.filter((t: any) =>
      statusOf(t).includes("expiring"),
    ).length;
    const pending = tenantsRaw.filter(
      (t: any) => statusOf(t).includes("pending") || statusOf(t) === "expired",
    ).length;
    return { total: tenantsRaw.length, active, expiringSoon, pending };
  }, [tenantsRaw]);

  const bookingStats = useMemo(() => {
    const today = dayjs().format("YYYY-MM-DD");
    const now = Date.now();
    const todayBookings = bookingsRaw.filter((b: any) =>
      String(b.date || b.startDate || b.createdAt || "").startsWith(today),
    );
    const statusOf = (b: any) => String(b.status || "").toLowerCase();
    const cancelled = bookingsRaw.filter(
      (b: any) => statusOf(b) === "cancelled",
    ).length;
    // A confirmed booking whose end time has passed counts as completed.
    const isCompleted = (b: any) =>
      statusOf(b) === "completed" ||
      (statusOf(b) !== "cancelled" && b.end && new Date(b.end).getTime() < now);
    const completed = bookingsRaw.filter(isCompleted).length;
    const confirmed = bookingsRaw.filter(
      (b: any) => statusOf(b) === "confirmed" && !isCompleted(b),
    ).length;
    return {
      total: bookingsRaw.length,
      todayCount: todayBookings.length,
      confirmed,
      cancelled,
      completed,
    };
  }, [bookingsRaw]);

  const ticketStats = useMemo(() => {
    const open = ticketsRaw.filter((t: any) =>
      ["open", "Open"].includes(t.status),
    ).length;
    const resolved = ticketsRaw.filter((t: any) =>
      ["resolved", "Resolved", "closed", "Closed"].includes(t.status),
    ).length;
    const inProgress = ticketsRaw.filter((t: any) =>
      ["in_progress", "In Progress"].includes(t.status),
    ).length;
    return { total: ticketsRaw.length, open, resolved, inProgress };
  }, [ticketsRaw]);

  const visitorStats = useMemo(() => {
    const todayStr = dayjs().format("YYYY-MM-DD");
    const todayCount = visitorsRaw.filter((v: any) =>
      String(v.checkInAt || v.createdAt || "").startsWith(todayStr),
    ).length;
    // Visitor status is stored as checked_in / checked_out; a live visitor has
    // a check-in without a check-out.
    const checkedIn = visitorsRaw.filter(
      (v: any) =>
        String(v.status || "").toLowerCase() === "checked_in" ||
        (v.checkInAt && !v.checkOutAt),
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
        tenant.renewedAt ||
          tenant.renewalDate ||
          tenant.contractStartAt ||
          tenant.contractStart ||
          tenant.agreementDetails?.startDate ||
          "",
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
    series: [
      bookingStats.confirmed,
      bookingStats.completed,
      bookingStats.cancelled,
    ],
    labels: ["Confirmed", "Completed", "Cancelled"],
    colors: ["#1E3D73", "#22c55e", "#ef4444"],
  };
  const ticketDonut = {
    series: [ticketStats.open, ticketStats.inProgress, ticketStats.resolved],
    labels: ["Open", "In Progress", "Resolved"],
    colors: ["#ef4444", "#f59e0b", "#22c55e"],
  };

  // Recent items
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

  // Visitor types come from the VisitorLog enum: standard / department / tenant.
  const visitorDonut = useMemo(() => {
    const typeOf = (v: any) =>
      String(v.visitorType || "standard").toLowerCase();
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
    String(status || "Pending")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  // Quick links — the Professional-tier essentials. Nomad listings is a
  // niche side feature, not core to what this plan unlocks, so it's left
  // off the dashboard (still reachable from the sidebar).
  const quickLinks: QuickLinkItem[] = [
    ...(showTenants
      ? [
          {
            icon: Building2,
            label: "Tenant Companies",
            description: "Manage tenants & agreements",
            route: "/department-accesses/sales-department/tenant-companies",
            color: "#1E3D73",
          },
        ]
      : []),
    ...(showBookings
      ? [
          {
            icon: CalendarCheck,
            label: "Meeting Rooms",
            description: "View & manage bookings",
            route: "/common-modules/meeting-room-booking",
            color: "#2563EB",
          },
        ]
      : []),
    ...(showTickets
      ? [
          {
            icon: Ticket,
            label: "Customer Support",
            description: "Handle open tickets",
            route: "/common-modules/customer-support",
            color: "#ef4444",
          },
        ]
      : []),
    ...(showVisitors
      ? [
          {
            icon: UserPlus,
            label: "Visitor Management",
            description: "Check-in / check-out",
            route: "/visitors/visitor-management",
            color: "#80bf01",
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
    ...(showOrg
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
    ...(showCalendar
      ? [
          {
            icon: Calendar,
            label: "Calendar",
            description: "View events & schedules",
            route: "/common-modules/calendar",
            color: "#059669",
          },
        ]
      : []),
  ];

  const gettingStartedSteps = GETTING_STARTED_STEPS.filter((step) => {
    if (step.route.includes("tenant-companies")) return showTenants;
    if (step.route.includes("meeting-room-booking")) return showBookings;
    if (step.route.includes("customer-support")) return showTickets;
    if (step.route.includes("visitor-management")) return showVisitors;
    return false;
  });

  // Nothing logged yet anywhere — show a getting-started checklist instead
  // of four empty "no data" rows.
  const isNewWorkspace =
    tenantsRaw.length === 0 &&
    bookingsRaw.length === 0 &&
    ticketsRaw.length === 0 &&
    visitorsRaw.length === 0;

  if (
    (showTenants && tenantsLoading) ||
    (showBookings && bookingsLoading) ||
    (showTickets && ticketsLoading) ||
    (showVisitors && visitorsLoading)
  ) {
    return <PlanDashboardSkeleton plan="professional" />;
  }

  const overviewCardCount = [
    showTenants,
    showBookings,
    showTickets,
    showVisitors,
  ].filter(Boolean).length;
  const trendCardCount = [showBookings, showTickets, showTenants].filter(
    Boolean,
  ).length;
  const trendGridClass =
    trendCardCount <= 1
      ? "grid-cols-1"
      : trendCardCount === 2
        ? "grid-cols-1 lg:grid-cols-2"
        : "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3";
  const showCustomUpgradeNudge = trialDaysLeft == null && !isTrialExpiringSoon;

  return (
    <div className="flex flex-col gap-5">
      {/* Upgrade nudge — opens modal for Custom plan */}
      {showCustomUpgradeNudge && (
        <button
          type="button"
          data-tour="professional-plan"
          className="flex w-full flex-wrap items-center gap-3 rounded-xl border-2 border-accent/30 bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100 sm:flex-nowrap"
          onClick={onUpgradeClick}
        >
          <Zap size={18} className="flex-shrink-0 text-accent" />
          <p className="min-w-0 flex-1 text-content font-pmedium text-blue-800">
            You're on the <strong>Professional Plan</strong> — upgrade to the{" "}
            <strong>Custom Plan</strong> for Finance, HR, AI tools, Maintenance,
            IT and more.
          </p>
          <span className="ml-7 flex-shrink-0 whitespace-nowrap rounded-full border border-accent bg-accent px-3 py-1 text-[10px] font-pmedium uppercase tracking-widest text-white sm:ml-auto">
            Upgrade
          </span>
          <ArrowRight size={14} className="flex-shrink-0 text-accent" />
        </button>
      )}

      <PlanExpiringNotice />
      <VerifiedBadgeNotice />
      <BonusTrialOfferNotice />

      {overviewCardCount > 0 && (
        <section
          data-tour="professional-overview"
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
            {showTenants && (
              <MetricTile
                icon={Building2}
                label="Total Tenants"
                value={tenantStats.total}
                sub={`${tenantStats.active} active`}
                color="#1E3D73"
                route="/department-accesses/sales-department/tenant-companies"
              />
            )}
            {showBookings && (
              <MetricTile
                icon={CalendarCheck}
                label="Bookings Today"
                value={bookingStats.todayCount}
                sub={`${bookingStats.confirmed} confirmed overall`}
                color="#2563EB"
                route="/common-modules/meeting-room-booking"
              />
            )}
            {showTickets && (
              <MetricTile
                icon={Ticket}
                label="Open Tickets"
                value={ticketStats.open}
                sub={`${ticketStats.inProgress} in progress`}
                color="#ef4444"
                route="/common-modules/customer-support"
              />
            )}
            {showVisitors && (
              <MetricTile
                icon={Eye}
                label="Visitors Today"
                value={visitorStats.todayCount}
                sub={`${visitorStats.checkedIn} checked in`}
                color="#80bf01"
                route="/visitors/visitor-management"
              />
            )}
          </div>
        </section>
      )}

      {/* Quick links */}
      {quickLinks.length > 0 && (
        <section
          data-tour="professional-quick-links"
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
            <p className="mt-1 text-xs text-slate-500">
              Open the tools included in your unit.
            </p>
          </div>
          <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {quickLinks.map((ql) => (
              <QuickActionTile key={ql.route} {...ql} />
            ))}
          </div>
        </section>
      )}

      {isNewWorkspace ? (
        /* First run — one checklist beats four empty activity rows */
        <div data-tour="professional-getting-started">
          <GettingStartedCard steps={gettingStartedSteps} />
        </div>
      ) : (
        <>
          {/* Recent visitors and visitor type */}
          {showVisitors && (
            <div
              data-tour="professional-visitors"
              className="grid grid-cols-1 lg:grid-cols-2 gap-5"
            >
              <ActivityPanel
                eyebrow="Front desk"
                title="Recent Visitors"
                action={<ViewAllLink route="/visitors/visitor-management" />}
              >
                {recentVisitors.length > 0 ? (
                  recentVisitors.map((v: any, i: number) => (
                    <RecentItem
                      key={i}
                      title={v.fullName || v.firstName || "Visitor"}
                      sub={v.purpose || v.company || "Visit"}
                      badge={prettifyVisitorStatus(v.status)}
                      badgeColor={statusBadgeColor(v.status || "")}
                      time={humanRelTime(v.checkInAt || v.createdAt)}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon={Eye}
                    title="No visitors logged yet"
                    description="Visitor check-ins will show up here as your front desk logs them."
                    actionLabel="Log a Visitor"
                    route="/visitors/visitor-management"
                  />
                )}
              </ActivityPanel>
              <ActivityPanel eyebrow="Breakdown" title="Visitor Type">
                <div className="flex min-h-48 flex-1 items-center justify-center">
                  {visitorDonut.series.some((v) => v > 0) ? (
                    <DonutChart
                      centerLabel="Visitors"
                      labels={visitorDonut.labels}
                      colors={visitorDonut.colors}
                      series={visitorDonut.series}
                      tooltipValue={visitorDonut.series.map(String)}
                    />
                  ) : (
                    <p className="text-content text-slate-400">No data yet</p>
                  )}
                </div>
              </ActivityPanel>
            </div>
          )}

          {/* Recent bookings and booking status */}
          {showBookings && (
            <div
              data-tour="professional-bookings"
              className="grid grid-cols-1 lg:grid-cols-2 gap-5"
            >
              <ActivityPanel
                eyebrow="Meeting rooms"
                title="Recent Bookings"
                action={
                  <ViewAllLink route="/common-modules/meeting-room-booking" />
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
                  <EmptyState
                    icon={CalendarCheck}
                    title="No bookings yet"
                    description="Reserve a meeting room to see it here."
                    actionLabel="Book a Room"
                    route="/common-modules/meeting-room-booking"
                  />
                )}
              </ActivityPanel>
              <ActivityPanel eyebrow="Breakdown" title="Booking Status">
                <div className="flex min-h-48 flex-1 items-center justify-center">
                  {bookingDonut.series.some((v) => v > 0) ? (
                    <DonutChart
                      centerLabel="Bookings"
                      labels={bookingDonut.labels}
                      colors={bookingDonut.colors}
                      series={bookingDonut.series}
                      tooltipValue={bookingDonut.series.map(String)}
                    />
                  ) : (
                    <p className="text-content text-slate-400">No data yet</p>
                  )}
                </div>
              </ActivityPanel>
            </div>
          )}

          {/* Recent tickets and ticket status */}
          {showTickets && (
            <div
              data-tour="professional-tickets"
              className="grid grid-cols-1 lg:grid-cols-2 gap-5"
            >
              <ActivityPanel
                eyebrow="Support"
                title="Recent Tickets"
                action={
                  <ViewAllLink route="/common-modules/customer-support" />
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
                  <EmptyState
                    icon={Ticket}
                    title="No tickets yet"
                    description="Support tickets will appear here as they're raised."
                    actionLabel="Raise a Ticket"
                    route="/common-modules/customer-support"
                  />
                )}
              </ActivityPanel>
              <ActivityPanel eyebrow="Breakdown" title="Ticket Status">
                <div className="flex min-h-48 flex-1 items-center justify-center">
                  {ticketDonut.series.some((v) => v > 0) ? (
                    <DonutChart
                      centerLabel="Tickets"
                      labels={ticketDonut.labels}
                      colors={ticketDonut.colors}
                      series={ticketDonut.series}
                      tooltipValue={ticketDonut.series.map(String)}
                    />
                  ) : (
                    <p className="text-content text-slate-400">No data yet</p>
                  )}
                </div>
              </ActivityPanel>
            </div>
          )}

          {/* Recent tenants and tenant status */}
          {showTenants && (
            <div
              data-tour="professional-tenants"
              className="grid grid-cols-1 lg:grid-cols-2 gap-5"
            >
              <ActivityPanel
                eyebrow="Sales"
                title="Recent Tenants"
                action={
                  <ViewAllLink route="/department-accesses/sales-department/tenant-companies" />
                }
              >
                {recentTenants.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {recentTenants.map((t: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100"
                      >
                        <div className="w-9 h-9 rounded-full bg-[#1E3D73] flex items-center justify-center text-white font-pbold text-content flex-shrink-0">
                          {(t.companyName || t.name || "T")
                            .charAt(0)
                            .toUpperCase()}
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
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Building2}
                    title="No tenants yet"
                    description="Onboard your first tenant company to see it here."
                    actionLabel="Add a Tenant"
                    route="/department-accesses/sales-department/tenant-companies"
                  />
                )}
              </ActivityPanel>
              <ActivityPanel eyebrow="Breakdown" title="Tenant Status">
                <div className="flex min-h-48 flex-1 items-center justify-center">
                  {tenantDonut.series.some((v) => v > 0) ? (
                    <DonutChart
                      centerLabel="Tenants"
                      labels={tenantDonut.labels}
                      colors={tenantDonut.colors}
                      series={tenantDonut.series}
                      tooltipValue={tenantDonut.series.map(String)}
                    />
                  ) : (
                    <p className="text-content text-slate-400">No data yet</p>
                  )}
                </div>
              </ActivityPanel>
            </div>
          )}

          {/* Expiry alert */}
          {showTenants && tenantStats.expiringSoon > 0 && (
            <div
              data-tour="professional-expiry-alert"
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-amber-300 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors"
              onClick={() =>
                navigate(
                  "/department-accesses/sales-department/tenant-companies",
                )
              }
            >
              <AlertCircle size={20} className="text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-content font-pmedium text-amber-800">
                  {tenantStats.expiringSoon} tenant agreement
                  {tenantStats.expiringSoon > 1 ? "s" : ""} expiring within 30
                  days
                </p>
                <p className="text-small text-amber-600">
                  Review and renew before they lapse.
                </p>
              </div>
              <ArrowRight
                size={14}
                className="ml-auto text-amber-600 flex-shrink-0"
              />
            </div>
          )}

          {/* Monthly operational trends — side by side instead of stacked full-width */}
          <div className={`grid gap-5 ${trendGridClass}`}>
            {showBookings && (
              <div data-tour="professional-booking-trend">
                <ActivityPanel eyebrow="Fiscal year" title="Monthly Bookings">
                  <BarGraph
                    chartId="pro-monthly-bookings"
                    data={bookingsByMonth}
                    options={bookingBarOptions}
                    height={220}
                  />
                </ActivityPanel>
              </div>
            )}
            {showTickets && (
              <div data-tour="professional-ticket-trend">
                <ActivityPanel eyebrow="Fiscal year" title="Monthly Tickets">
                  <BarGraph
                    chartId="pro-monthly-tickets"
                    data={ticketsByMonth}
                    options={ticketBarOptions}
                    height={220}
                  />
                </ActivityPanel>
              </div>
            )}
            {showTenants && (
              <div data-tour="professional-tenant-trend">
                <ActivityPanel eyebrow="Fiscal year" title="Monthly Tenants">
                  <BarGraph
                    chartId="pro-monthly-tenants"
                    data={tenantsByMonth}
                    options={tenantBarOptions}
                    height={220}
                  />
                </ActivityPanel>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProfessionalDashboard;
