import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock,
  ContactRound,
  Lock,
  Users,
} from "lucide-react";
import visitorBannerImage from "../../assets/administration-dashboard-banner.webp";
import PageFrame from "../../components/Pages/PageFrame";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import useAuth from "../../hooks/useAuth";
import useDashboardAccess from "../../hooks/useDashboardAccess";
import {
  getMeetingRoomBookings,
} from "../../services/meeting-room-bookings";
import {
  getVisitorManagementOverview,
} from "../../services/visitors";
import {
  VISITOR_DASHBOARD_MODULES,
  type VisitorDashboardModule,
} from "./visitorDashboardModules";

const DONUT_PALETTE = [
  "#1E3D73",
  "#2563EB",
  "#3B82F6",
  "#60A5FA",
  "#93C5FD",
  "#64748B",
];

const normalize = (value: unknown) =>
  String(value || "").trim().toLowerCase();

const readableLabel = (value?: string) =>
  String(value || "Unspecified")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const dateOf = (visitor: any) =>
  visitor?.checkInAt ||
  visitor?.checkIn ||
  visitor?.createdAt ||
  visitor?.date;

const dateLabel = (value?: unknown) => {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const visitorName = (visitor: any) =>
  visitor?.name ||
  visitor?.fullName ||
  [visitor?.firstName, visitor?.lastName].filter(Boolean).join(" ").trim() ||
  "Unnamed visitor";

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[280px] items-center justify-center px-6 text-center text-[11px] text-[#7B89A6]">
      {children}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  action,
  bodyClassName = "p-5",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {action ?? null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

function RecordCountChip({ count }: { count: number }) {
  return (
    <span className="shrink-0 rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-pmedium text-blue-700">
      {count} records
    </span>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  status = "default",
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  status?: "default" | "success" | "attention";
}) {
  const statuses = {
    default: "border-l-blue-600 bg-blue-50 text-blue-700",
    success: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
    attention: "border-l-amber-500 bg-amber-50 text-amber-700",
  };

  return (
    <div className="flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:border-l-blue-600 hover:shadow-md">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${statuses[status]}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-[22px] font-pmedium leading-none text-slate-900">
          {value}
        </p>
        {sub ? (
          <p className="mt-2 truncate text-[10px] text-slate-500">{sub}</p>
        ) : null}
      </div>
    </div>
  );
}

function LockedVisitorModuleCard({
  module,
  isBasicPlan,
}: {
  module: VisitorDashboardModule;
  isBasicPlan: boolean;
}) {
  const Icon = module.icon;
  const reason = isBasicPlan
    ? "Available on Professional and eligible Custom plans"
    : "This tab has not been granted for your access";

  return (
    <button
      type="button"
      disabled
      title={reason}
      className="relative flex min-h-[154px] min-w-0 cursor-not-allowed flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-5 text-center opacity-75 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-slate-300"
      />
      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[9px] font-pmedium text-slate-500">
        <Lock size={11} />
        Locked
      </span>
      <span className="mb-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-200/70 text-slate-500">
        <Icon size={19} />
      </span>
      <span className="max-w-full text-[13px] font-pmedium leading-[1.35] text-slate-600 [overflow-wrap:anywhere]">
        {module.label}
      </span>
      <span className="mt-1.5 line-clamp-2 max-w-[210px] text-[9px] font-pmedium leading-4 text-slate-400">
        {reason}
      </span>
    </button>
  );
}

const statusTone = (visitor: any) => {
  const value = normalize(
    visitor?.statusKey ||
      visitor?.status ||
      visitor?.approvalStatus ||
      visitor?.hostPanelStatus,
  );
  if (
    value.includes("approve") ||
    value.includes("live") ||
    value.includes("check in") ||
    value.includes("checkin") ||
    value.includes("checked in") ||
    value.includes("completed") ||
    value.includes("confirm")
  )
    return "bg-emerald-50 text-emerald-700";
  if (
    value.includes("reject") ||
    value.includes("cancel") ||
    value.includes("loss")
  )
    return "bg-rose-50 text-rose-700";
  if (value.includes("progress") || value.includes("scheduled"))
    return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
};

export default function VisitorsWorkspaceDashboard() {
  const { auth } = useAuth();
  const access = useDashboardAccess();
  const user = auth?.user;
  const visitorGrantIds = new Set(
    [
      ...Array.from(access.grantedModuleIds),
      ...((user?.workspaceMembership as { grantedModules?: string[] } | undefined)
        ?.grantedModules || []),
      ...(((user as { grantedModules?: string[] } | undefined)?.grantedModules) || []),
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean),
  );
  const rolePermissionIds = new Set(
    (((user?.permissions as { permissions?: string[] } | undefined)
      ?.permissions || []) as string[])
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean),
  );
  const hasVisitorModuleGrant =
    visitorGrantIds.has("visitor-management") ||
    visitorGrantIds.has("visitors-management");
  const hasExplicitVisitorTabGrants = VISITOR_DASHBOARD_MODULES.some(
    (module) => visitorGrantIds.has(module.permission),
  );
  const isVisitorTabEnabled = (module: VisitorDashboardModule) => {
    if (
      access.plan === "basic" &&
      !["visitor-daily", "visitor-history"].includes(module.id)
    ) {
      return false;
    }
    return (
      visitorGrantIds.has(module.permission) ||
      rolePermissionIds.has(module.permission) ||
      (hasVisitorModuleGrant && !hasExplicitVisitorTabGrants)
    );
  };
  const enabledVisitorModules = VISITOR_DASHBOARD_MODULES.filter(
    isVisitorTabEnabled,
  );
  const canUseBookings = enabledVisitorModules.some(
    (module) => module.id === "visitor-bookings",
  );

  // Overview endpoint — same source the frontdesk terminal polls, so the
  // live/pending/approved/history lists always agree with it.
  const { data: overview, isPending: isOverviewPending, isError: isOverviewError } = useQuery({
    queryKey: ["visitor-overview-dashboard"],
    queryFn: getVisitorManagementOverview,
    retry: false,
  });

  // Meeting-room walks/booking pipeline for the walk-in tile.
  const workspaceId = String(
    user?.primaryWorkspace ||
      (user?.workspaceMembership as { workspace?: string } | undefined)
        ?.workspace ||
      user?.workspaceId ||
      "",
  );
  const { data: bookings = [], isPending: isBookingsPending } = useQuery({
    queryKey: ["visitor-bookings-dashboard", workspaceId],
    enabled: Boolean(workspaceId) && !access.isLoading && canUseBookings,
    queryFn: async () => {
      const result = await getMeetingRoomBookings(workspaceId);
      const data = result?.data || result || {};
      return Array.isArray(data.bookings) ? data.bookings : [];
    },
  });

  const isLoading =
    isOverviewPending ||
    access.isLoading ||
    (canUseBookings && isBookingsPending);
  const isError = isOverviewError;

  const lists = useMemo(() => {
    const pull = (value: unknown) =>
      Array.isArray(value) ? value : [];
    return {
      liveVisitors: pull(overview?.liveVisitors),
      pendingVisitors: pull(overview?.pendingVisitors),
      approvedVisitors: pull(overview?.approvedVisitors),
      visitorHistory: pull(overview?.visitorHistory),
      clients: pull(overview?.clients),
      tenantCompanies: pull(overview?.tenantCompanies),
      employeeRoster: pull(overview?.employeeRoster),
    };
  }, [overview]);

  const allTrackedVisitors = useMemo(
    () => [
      ...lists.visitorHistory,
      ...lists.liveVisitors,
      ...lists.pendingVisitors,
      ...lists.approvedVisitors,
    ],
    [lists],
  );

  const purposeMix = useMemo(() => {
    const map = new Map<string, number>();
    allTrackedVisitors.forEach((visitor) => {
      const label = readableLabel(
        visitor?.purpose || visitor?.purposeOfVisit || "Unspecified",
      );
      map.set(label, (map.get(label) || 0) + 1);
    });
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);
  }, [allTrackedVisitors]);

  const hostMix = useMemo(() => {
    const map = new Map<string, number>();
    allTrackedVisitors.forEach((visitor) => {
      const host =
        visitor?.host?.firstName ||
        (typeof visitor?.host === "string" ? visitor.host : "") ||
        visitor?.hostName ||
        visitor?.toMeet?.firstName ||
        "Unassigned";
      const label = readableLabel(host);
      map.set(label, (map.get(label) || 0) + 1);
    });
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);
  }, [allTrackedVisitors]);

  const monthlyVisitors = useMemo(() => {
    const anchor = new Date();
    const counts = new Array(12).fill(0);
    allTrackedVisitors.forEach((visitor) => {
      const created = new Date(String(dateOf(visitor) || ""));
      if (Number.isNaN(created.getTime())) return;
      const difference =
        (anchor.getFullYear() - created.getFullYear()) * 12 +
        anchor.getMonth() -
        created.getMonth();
      const index = 11 - difference;
      if (index >= 0 && index < 12) counts[index] += 1;
    });
    return counts;
  }, [allTrackedVisitors]);

  const recentVisitors = useMemo(
    () =>
      [...allTrackedVisitors]
        .sort(
          (left, right) =>
            new Date(String(dateOf(right) || 0)).getTime() -
            new Date(String(dateOf(left) || 0)).getTime(),
        )
        .slice(0, 8),
    [allTrackedVisitors],
  );

  const monthLabels = useMemo(() => {
    const anchor = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(
        anchor.getFullYear(),
        anchor.getMonth() - (11 - index),
        1,
      );
      return date.toLocaleDateString("en-US", { month: "short" });
    });
  }, []);

  const moduleMetric = (moduleId: string) => {
    if (moduleId === "visitor-daily") return lists.liveVisitors.length;
    if (moduleId === "visitor-history") return lists.visitorHistory.length;
    if (moduleId === "visitor-bookings") return bookings.length;
    if (moduleId === "visitor-clients") return lists.clients.length;
    return "—";
  };

  const chartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "44%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: monthLabels },
    colors: ["#2563EB"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={visitorBannerImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 h-full w-full object-cover object-center sm:w-[64%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 w-full overflow-hidden bg-gradient-to-br from-[#2563EB]/55 via-[#3b82f6]/35 to-[#60a5fa]/20 sm:w-[64%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            >
              <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-full bg-white/90 sm:w-[66%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
                maskImage:
                  "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
              }}
            />
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[68%]">
              <h1 className="text-[30px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[38px]">
                <span className="text-primary">Visitor Management</span>{" "}
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
                Live check-ins, approvals, visitor history, bookings, and client
                activity across the front desk workspace.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Daily Visitors", "History", "Bookings", "Clients"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="absolute right-6 top-5 z-10 rounded-lg border border-white/25 bg-white/15 px-3 py-2 backdrop-blur-sm">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">
                Active modules
              </p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">
                {enabledVisitorModules.length}
              </p>
            </div>
          </div>
        </div>

        {isError && !isLoading ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-pmedium text-amber-800">
            <AlertTriangle size={16} />
            Visitor data could not be refreshed just now — existing values may be
            incomplete.
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, key) => (
              <div
                key={key}
                className="h-[112px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={<ContactRound size={20} />}
              label="Live visitors"
              value={lists.liveVisitors.length}
              sub="Currently checked in"
              status={lists.liveVisitors.length ? "success" : "default"}
            />
            <StatTile
              icon={<Clock size={20} />}
              label="Pending approvals"
              value={lists.pendingVisitors.length}
              sub="Requests awaiting a decision"
              status={lists.pendingVisitors.length ? "attention" : "success"}
            />
            <StatTile
              icon={<CheckCircle2 size={20} />}
              label="Approved upcoming"
              value={lists.approvedVisitors.length}
              sub="Scheduled visits ahead"
            />
            <StatTile
              icon={<Users size={20} />}
              label="Visitor history"
              value={lists.visitorHistory.length}
              sub="Completed visitor logs"
            />
            <StatTile
              icon={<Building2 size={20} />}
              label="External clients"
              value={lists.clients.length}
              sub="Client companies on record"
            />
            <StatTile
              icon={<Building2 size={20} />}
              label="Tenant companies"
              value={lists.tenantCompanies.length}
              sub="Host companies mapped"
            />
            <StatTile
              icon={<BadgeCheck size={20} />}
              label="Meeting bookings"
              value={bookings.length}
              sub="Walk-in and booked meetings"
            />
            <StatTile
              icon={<Users size={20} />}
              label="Available hosts"
              value={lists.employeeRoster.length}
              sub="Employees available for visits"
            />
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3">
            <p className="text-sm font-pmedium text-slate-900">
              Manage visitor operations
            </p>
            <p className="mt-1 text-[10px] font-pmedium text-slate-500">
              Open the Visitor Management sections enabled for your plan and
              access.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {VISITOR_DASHBOARD_MODULES.map((module) => {
              if (!isVisitorTabEnabled(module)) {
                return (
                  <LockedVisitorModuleCard
                    key={module.id}
                    module={module}
                    isBasicPlan={access.plan === "basic"}
                  />
                );
              }
              const Icon = module.icon;
              return (
                <DashboardModuleCard
                  key={module.id}
                  icon={<Icon size={19} />}
                  title={module.label}
                  route={module.route}
                  description={module.description}
                  color={module.color}
                  state={{
                    fromSection: "visitors-dashboard",
                  }}
                />
              );
            })}
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <ChartCard
                title="Monthly Visitor Trend"
                subtitle="All tracked visitor logs created during the last 12 calendar months."
              >
                <GroupedBarGraph
                  options={chartOptions}
                  series={[{ name: "Visitors", data: monthlyVisitors }]}
                />
              </ChartCard>
              <ChartCard
                title="Visit Purposes"
                subtitle="Tracked visitors grouped by their recorded purpose of visit."
              >
                {purposeMix.length ? (
                  <DonutChart
                    centerLabel="Visitors"
                    labels={purposeMix.map((item) => item.label)}
                    series={purposeMix.map((item) => item.value)}
                    colors={DONUT_PALETTE.slice(0, purposeMix.length)}
                    tooltipValue={purposeMix.map(
                      (item) => `${item.value} visitors`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No visitor logs are recorded yet.</Empty>
                )}
              </ChartCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard
                title="Visitors by Host"
                subtitle="Tracked visitors grouped by the member hosting them."
              >
                {hostMix.length ? (
                  <DonutChart
                    centerLabel="Visitors"
                    labels={hostMix.map((item) => item.label)}
                    series={hostMix.map((item) => item.value)}
                    colors={DONUT_PALETTE.slice(0, hostMix.length)}
                    tooltipValue={hostMix.map(
                      (item) => `${item.value} visitors`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No hosted visits are recorded yet.</Empty>
                )}
              </ChartCard>
              <ChartCard title="Module Snapshot">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {VISITOR_DASHBOARD_MODULES.map((module, index) => {
                    const Icon = module.icon;
                    return (
                      <div
                        key={module.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                            style={{
                              backgroundColor:
                                DONUT_PALETTE[index % DONUT_PALETTE.length],
                            }}
                          >
                            <Icon size={14} />
                          </span>
                          <span className="truncate text-[11px] font-pmedium text-slate-600">
                            {module.label}
                          </span>
                        </div>
                        <span className="ml-3 text-[13px] font-pmedium text-slate-900">
                          {moduleMetric(module.id)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4">
              <ChartCard
                title="Recent Visitors"
                subtitle="The latest visitor logs across history, live, and upcoming lists."
                action={<RecordCountChip count={allTrackedVisitors.length} />}
                bodyClassName=""
              >
                {recentVisitors.length ? (
                  <div className="min-h-[240px] max-h-[360px] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="w-[24%] px-5 py-3">Visitor</th>
                          <th className="w-[20%] px-4 py-3">Company</th>
                          <th className="w-[18%] px-4 py-3">Host</th>
                          <th className="w-[18%] px-4 py-3">Purpose</th>
                          <th className="w-[12%] px-4 py-3">Date</th>
                          <th className="w-[16%] px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentVisitors.map((visitor, index) => (
                          <tr
                            key={
                              visitor?.recordId ||
                              visitor?.id ||
                              visitor?._id ||
                              `${visitorName(visitor)}-${index}`
                            }
                            className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                          >
                            <td className="truncate px-5 py-3 text-slate-900">
                              {visitorName(visitor)}
                            </td>
                            <td className="truncate px-4 py-3">
                              {visitor?.company ||
                                visitor?.visitorCompany ||
                                "Not recorded"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {visitor?.host?.firstName ||
                                (typeof visitor?.host === "string"
                                  ? visitor.host
                                  : "") ||
                                visitor?.hostName ||
                                "Unassigned"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {visitor?.purpose || visitor?.purposeOfVisit || "—"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {dateLabel(dateOf(visitor))}
                            </td>
                            <td className="truncate px-5 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${statusTone(visitor)}`}
                              >
                                {readableLabel(
                                  visitor?.statusKey ||
                                    visitor?.status ||
                                    visitor?.approvalStatus,
                                )}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                    No visitor logs have been recorded yet.
                  </div>
                )}
              </ChartCard>

              <ChartCard
                title="Pending Approvals"
                subtitle="Visitor requests waiting for a host or manager decision."
                action={<RecordCountChip count={lists.pendingVisitors.length} />}
                bodyClassName=""
              >
                {lists.pendingVisitors.length ? (
                  <div className="min-h-[200px] max-h-[360px] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="w-[26%] px-5 py-3">Visitor</th>
                          <th className="w-[22%] px-4 py-3">Company</th>
                          <th className="w-[18%] px-4 py-3">Host</th>
                          <th className="w-[16%] px-4 py-3">Purpose</th>
                          <th className="w-[18%] px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lists.pendingVisitors.map((visitor, index) => (
                          <tr
                            key={
                              visitor?.recordId ||
                              visitor?.id ||
                              visitor?._id ||
                              `${visitorName(visitor)}-${index}`
                            }
                            className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                          >
                            <td className="truncate px-5 py-3 text-slate-900">
                              {visitorName(visitor)}
                            </td>
                            <td className="truncate px-4 py-3">
                              {visitor?.company ||
                                visitor?.visitorCompany ||
                                "Not recorded"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {visitor?.host?.firstName ||
                                (typeof visitor?.host === "string"
                                  ? visitor.host
                                  : "") ||
                                visitor?.hostName ||
                                "Unassigned"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {visitor?.purpose || visitor?.purposeOfVisit || "—"}
                            </td>
                            <td className="truncate px-5 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${statusTone(visitor)}`}
                              >
                                {readableLabel(
                                  visitor?.statusKey ||
                                    visitor?.status ||
                                    visitor?.approvalStatus,
                                )}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                    No visitor requests are awaiting approval — you're all clear.
                  </div>
                )}
              </ChartCard>
            </div>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
