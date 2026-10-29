/**
 * BasicDashboard — shown for workspaces on the Basic plan.
 * Simplified, glanceable layout: plan strip → today's key numbers → quick
 * actions → one row per topic (leads, visitors). Built only from the shared
 * dashboard widgets so it stays consistent with the other plan dashboards.
 * Upgrade nudge → opens the upgrade modal (Professional only).
 */
import { useMemo } from "react";
import type { ElementType, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import useAuth from "../../../../hooks/useAuth";
import {
  Globe,
  Users,
  Eye,
  UserPlus,
  FileText,
  ArrowRight,
  LayoutGrid,
  Activity,
  Sparkles,
  Check,
} from "lucide-react";
import { RecentItem } from "./DashboardShared";
import type { QuickLinkItem } from "./DashboardShared";
import DonutChart from "../../../../components/graphs/DonutChart";
import BarGraph from "../../../../components/graphs/BarGraph";
import WonoListingsCard from "./WonoListingsCard";
import VerifiedBadgeNotice from "./VerifiedBadgeNotice";
import BonusTrialOfferNotice from "./BonusTrialOfferNotice";
import FreeTrialOfferNotice from "./FreeTrialOfferNotice";
import { statusBadgeColor, humanRelTime, hasModuleUse } from "./dashboardUtils";
import { ICON_BY_ID, DEFAULT_SECTION_ROUTES } from "../ModuleCardsLanding";
import { isSameCompanyWebsite } from "../WebsiteBuilder/WebsiteBuilderReviews.helpers";
import type { WorkspaceModuleSection } from "../../../../hooks/useDashboardAccess";
import dayjs from "dayjs";
import PlanDashboardSkeleton from "./PlanDashboardSkeleton";

interface BasicDashboardProps {
  onUpgradeClick: () => void;
  isExpiredDowngrade: boolean;
  downgradedPlanLabel: string;
  /** Org member counts — passed down from useDashboardAccess() so this component
   * doesn't re-fetch /api/organization/overview a second time on the same page load. */
  activeMembers: number;
  totalMembers: number;
  /** The workspace's real module catalog + this member's actual grants, so Quick
   * Actions reflects what the workspace has instead of a hand-picked subset. */
  moduleMap: { sections: WorkspaceModuleSection[] };
  grantedModuleIds: Set<string>;
  enabledModuleIds: Set<string>;
}

// The shared module catalog (ModuleCardsLanding) doesn't carry a route for
// "visitor-management" — only its plural department-tab alias
// "visitors-management" — so it's added here rather than touching the
// shared file for one dashboard's sake.
const BASIC_ROUTE_BY_ID: Record<string, string> = {
  ...DEFAULT_SECTION_ROUTES,
  "visitor-management": "/visitors/visitor-management",
};

const BASIC_MODULE_COPY: Record<
  string,
  { description: string; color: string }
> = {
  "customer-support": {
    description: "Raise issues to the WoNo team",
    color: "#ef4444",
  },
  "visitor-management": {
    description: "Log & track visitors",
    color: "#80bf01",
  },
  "tech-website-builder": {
    description: "Build & publish your site",
    color: "#7c3aed",
  },
  "website-leads": {
    description: "Follow up on every enquiry",
    color: "#1E3D73",
  },
  "website-review": {
    description: "See what visitors are saying",
    color: "#059669",
  },
  "organization-management": {
    description: "Members, roles & departments",
    color: "#0891b2",
  },
  "access-grants": {
    description: "Control who can access what",
    color: "#f59e0b",
  },
};

// FY month labels Apr–Mar
const FY_MONTHS = [
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
];

const fyMonthIndex = (date: Date) => (date.getMonth() + 9) % 12;

// Lead pipeline stages — mirrors the statuses on the Website Leads page.
const LEAD_STAGES = [
  { key: "Pending", label: "Pending", color: "#f59e0b" },
  { key: "Contacted", label: "Contacted", color: "#2563EB" },
  { key: "Closed", label: "Closed", color: "#059669" },
  { key: "Rejected", label: "Rejected", color: "#ef4444" },
] as const;

const WorkspaceProgress = ({
  totalMembers,
  leadCount,
  visitorCount,
  isWebsitePublished,
  showWebsite,
  showLeads,
  showVisitors,
  showOrg,
}: {
  totalMembers: number;
  leadCount: number;
  visitorCount: number;
  isWebsitePublished: boolean;
  showWebsite: boolean;
  showLeads: boolean;
  showVisitors: boolean;
  showOrg: boolean;
}) => {
  const navigate = useNavigate();
  const steps = [
    {
      icon: Globe,
      label: "Build your unit website",
      description: "Set up and publish the website for your unit.",
      route: "/key-apps/website-builder",
      complete: isWebsitePublished,
      visible: showWebsite,
    },
    {
      icon: FileText,
      label: "Capture your first lead",
      description:
        "Publish your website, share it, and receive the first enquiry.",
      route: "/key-apps/website-builder/leads",
      complete: leadCount > 0,
      visible: showLeads,
    },
    {
      icon: Eye,
      label: "Log your first visitor",
      description: "Start tracking arrivals and front-desk activity.",
      route: "/visitors/visitor-management",
      complete: visitorCount > 0,
      visible: showVisitors,
    },
    {
      icon: Users,
      label: "Invite a team member",
      description: "Bring your team into the unit with the right access.",
      route: "/core-modules/organization-management",
      complete: totalMembers > 1,
      visible: showOrg,
    },
  ].filter((step) => step.visible);

  const completedCount = steps.filter((step) => step.complete).length;
  if (steps.length === 0 || completedCount === steps.length) return null;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50/80 p-5 shadow-[0_12px_34px_rgba(30,61,115,0.08)] sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[10px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
            <Sparkles size={12} /> Unit progress
          </p>
          <h3 className="mt-1 text-lg font-pmedium text-[#1E3D73]">
            Finish the essentials
          </h3>
          <p className="mt-1 text-xs font-pmedium text-slate-500">
            Complete the first actions that make this dashboard useful.
          </p>
        </div>
        <div className="min-w-[170px]">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-pmedium uppercase tracking-widest">
            <span className="text-slate-400">Setup</span>
            <span className="text-[#2563EB]">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1E3D73] to-[#2563EB] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => {
          const StepIcon = step.icon;
          return (
            <button
              type="button"
              key={step.route}
              className={`group flex items-start gap-3 rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                step.complete
                  ? "border-emerald-100 bg-emerald-50/60"
                  : "border-slate-100 bg-white shadow-sm hover:border-blue-200"
              }`}
              onClick={() => navigate(step.route)}
            >
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${step.complete ? "bg-emerald-500 text-white" : "bg-blue-50 text-[#2563EB]"}`}
              >
                {step.complete ? <Check size={16} /> : <StepIcon size={16} />}
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
                className="mt-1 flex-shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#2563EB]"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
};

type BasicMetricProps = {
  icon: ElementType;
  label: string;
  value: string | number;
  sub: string;
  route: string;
};

const BasicMetric = ({
  icon: Icon,
  label,
  value,
  sub,
  route,
}: BasicMetricProps) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(route)}
      className="group flex min-w-0 items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] transition group-hover:bg-[#2563EB] group-hover:text-white">
        <Icon size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-pmedium uppercase tracking-[0.18em] text-slate-400">
          {label}
        </p>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-2xl font-pmedium leading-none text-[#1E3D73]">
            {value}
          </span>
          <span className="truncate pb-0.5 text-[10px] font-pmedium text-slate-500">
            {sub}
          </span>
        </div>
      </div>
      <ArrowRight
        size={13}
        className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#2563EB]"
      />
    </button>
  );
};

const BasicQuickAction = ({
  icon: Icon,
  label,
  description,
  route,
}: QuickLinkItem) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(route)}
      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-blue-100 bg-white p-3.5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB] transition group-hover:bg-[#2563EB] group-hover:text-white">
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-pmedium text-[#1E3D73]">
          {label}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-500">
          {description}
        </p>
      </div>
      <ArrowRight
        size={13}
        className="shrink-0 text-blue-300 transition group-hover:translate-x-0.5 group-hover:text-[#2563EB]"
      />
    </button>
  );
};

const BasicActivityPanel = ({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <section className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-[0_10px_30px_rgba(30,61,115,0.07)]">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
          {eyebrow}
        </p>
        <h3 className="mt-1 text-[15px] font-pmedium text-[#1E3D73]">
          {title}
        </h3>
      </div>
      {action}
    </div>
    <div className="flex flex-1 flex-col p-5">{children}</div>
  </section>
);

const BasicEmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  route,
}: {
  icon: ElementType;
  title: string;
  description: string;
  actionLabel: string;
  route: string;
}) => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-52 flex-1 flex-col items-center justify-center px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
        <Icon size={20} />
      </div>
      <p className="mt-3 text-sm font-pmedium text-[#1E3D73]">{title}</p>
      <p className="mt-1 max-w-xs text-[11px] font-pmedium leading-relaxed text-slate-500">
        {description}
      </p>
      <button
        type="button"
        onClick={() => navigate(route)}
        className="group mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#2563EB] px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest text-white transition hover:bg-[#1E3D73]"
      >
        {actionLabel}
        <ArrowRight
          size={12}
          className="transition group-hover:translate-x-0.5"
        />
      </button>
    </div>
  );
};

const BasicDashboard = ({
  onUpgradeClick,
  isExpiredDowngrade,
  downgradedPlanLabel,
  activeMembers,
  totalMembers,
  moduleMap,
  grantedModuleIds,
  enabledModuleIds,
}: BasicDashboardProps) => {
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const selectedCompany = useSelector(
    (state: any) => state.company.selectedCompany,
  );
  const { auth } = useAuth();

  const workspaceId =
    selectedCompany?.workspaceId ||
    auth?.user?.primaryWorkspace ||
    auth?.user?.workspaceMembership?.workspace ||
    auth?.user?.workspaceId ||
    "";
  const companyId = selectedCompany?.companyId || auth?.user?.companyId || "";
  const companyName =
    selectedCompany?.companyName || auth?.user?.companyName || "";

  // A card only renders when its module is both included in the plan/
  // workspace (enabled axis) AND granted to the current member (access axis).
  const canUse = (id: string) =>
    hasModuleUse(grantedModuleIds, enabledModuleIds, id);
  const showWebsite = canUse("tech-website-builder");
  const showVisitors = canUse("visitors-management");
  const showLeads = canUse("website-leads");
  const showOrg = canUse("organization-management");

  // ── Published website state — uses the same source and identity matching as
  // Website Leads. The subscription fallback covers older published sites.
  const { data: isWebsitePublished = false, isLoading: websiteLoading } =
    useQuery({
      queryKey: [
        "dashboard-website-published",
        companyId,
        workspaceId,
        companyName,
      ],
      enabled: showWebsite && !!(companyId || workspaceId || companyName),
      queryFn: async () => {
        const response = await axiosPrivate.get("/api/editor/get-websites", {
          params: { companyId, workspaceId, businessName: companyName },
        });
        const websites = Array.isArray(response?.data) ? response.data : [];
        const website = websites.find((item: any) =>
          isSameCompanyWebsite(item, companyId, workspaceId, companyName),
        );
        if (website) {
          return Boolean(
            website?.isPublished === true ||
            String(
              website?.deployedUrl || website?.publishedProjectUrl || "",
            ).trim(),
          );
        }

        const subscriptionId = companyId || workspaceId;
        if (!subscriptionId) return false;
        try {
          const subscriptionResponse = await axiosPrivate.get(
            `/api/subscription/${subscriptionId}`,
            {
              params: { companyId, workspaceId },
            },
          );
          const subscription = subscriptionResponse?.data || {};
          return Boolean(
            String(subscription?.publishedProjectId || "").trim() ||
            String(subscription?.publishedProjectUrl || "").trim(),
          );
        } catch {
          return false;
        }
      },
      staleTime: 60 * 1000,
    });

  // ── Visitors (same endpoint as the Visitor Management terminal) ──────────────
  const { data: visitorsRaw = [], isLoading: visitorsLoading } = useQuery({
    queryKey: ["dashboard-visitors-basic"],
    queryFn: async () => {
      const res = await axiosPrivate.get("/api/v1/visitors", {
        params: { limit: 100 },
      });
      const visitors = res?.data?.data?.visitors ?? [];
      return Array.isArray(visitors) ? visitors : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: showVisitors,
  });

  // ── Website leads (same endpoint as CompanyLeads) ──────────────────────────
  const { data: leadsRaw = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["dashboard-leads-basic", companyId, workspaceId],
    enabled: showLeads && !!(companyId || workspaceId),
    queryFn: async () => {
      const res = await axiosPrivate.get(
        `/api/leads/get-leads?companyId=${encodeURIComponent(companyId)}&workspaceId=${encodeURIComponent(workspaceId)}`,
      );
      return Array.isArray(res?.data) ? res.data : [];
    },
    staleTime: 5 * 60 * 1000,
    // Public website enquiries can arrive while the dashboard is already open.
    // Keep the first-lead milestone current without requiring a manual refresh.
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  // ── Derived: visitor stats ─────────────────────────────────────────────────
  const visitorStats = useMemo(() => {
    const today = dayjs();
    const todayVisitors = visitorsRaw.filter((v: any) => {
      const d = v.checkInAt || v.createdAt || "";
      return d && dayjs(d).isSame(today, "day");
    });
    const checkedIn = visitorsRaw.filter(
      (v: any) => String(v.status || "").toLowerCase() === "checked_in",
    ).length;
    return {
      todayCount: todayVisitors.length,
      totalCount: visitorsRaw.length,
      checkedIn,
    };
  }, [visitorsRaw]);

  // ── Derived: monthly visitor trend (FY) ────────────────────────────────────
  const visitorsByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    visitorsRaw.forEach((v: any) => {
      const d = new Date(v.checkInAt || v.createdAt || "");
      if (!isNaN(d.getTime())) counts[fyMonthIndex(d)]++;
    });
    return [{ name: "Visitors", data: counts }];
  }, [visitorsRaw]);

  const visitorBarOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    colors: ["#80bf01"],
    xaxis: { categories: FY_MONTHS },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#f0f0f0" },
    tooltip: { theme: "light" },
  };

  // ── Derived: lead stats (lead.status: Pending / Contacted / Closed / Rejected) ──
  const leadStats = useMemo(() => {
    const newLeads = leadsRaw.filter(
      (l: any) => (l.status || "Pending") === "Pending",
    ).length;
    return { total: leadsRaw.length, newLeads };
  }, [leadsRaw]);

  // Lead status donut — shows every stage that actually has leads so the
  // follow-up workload is visible at a glance.
  const leadDonut = useMemo(() => {
    const counts: Record<string, number> = {};
    leadsRaw.forEach((l: any) => {
      const status = String(l.status || "Pending").trim();
      counts[status] = (counts[status] || 0) + 1;
    });
    const present = LEAD_STAGES.filter((s) => (counts[s.key] || 0) > 0);
    return {
      series: present.map((s) => counts[s.key] || 0),
      labels: present.map((s) => s.label),
      colors: present.map((s) => s.color),
    };
  }, [leadsRaw]);

  const orgStats = useMemo(
    () => ({ activeMembers, totalMembers }),
    [activeMembers, totalMembers],
  );

  // ── Recent leads ───────────────────────────────────────────────────────────
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

  // ── Recent visitors ────────────────────────────────────────────────────────
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

  // ── Quick actions — built from what this workspace actually has, not a
  // hand-picked subset. Walks the real module catalog, keeps only top-level
  // (non-department-group) items this member is granted, resolves each to
  // its route/icon via the shared module registry, and drops "dashboard"
  // (this page) plus anything without a resolvable route (sub-permission
  // flags like org_tab_users aren't real pages).
  const quickLinks: QuickLinkItem[] = useMemo(() => {
    const seenIds = new Set<string>();
    const candidates: { id: string; label: string }[] = [];
    for (const section of moduleMap?.sections || []) {
      for (const item of section.items || []) {
        const id = String(item?.id || "").trim();
        if (!id || id === "dashboard" || seenIds.has(id)) continue;
        if (item.isGroup || (item.tabs && item.tabs.length)) continue;
        if (!grantedModuleIds.has(id)) continue;
        seenIds.add(id);
        candidates.push({ id, label: item.label || id });
      }
    }

    const seenRoutes = new Set<string>();
    const links: QuickLinkItem[] = [];
    for (const { id, label } of candidates) {
      const route = BASIC_ROUTE_BY_ID[id];
      if (!route || seenRoutes.has(route)) continue;
      seenRoutes.add(route);
      const copy = BASIC_MODULE_COPY[id];
      links.push({
        icon: ICON_BY_ID[id] || LayoutGrid,
        label,
        description: copy?.description || "Open this module",
        route,
        color: copy?.color || "#1E3D73",
      });
    }
    return links;
  }, [moduleMap, grantedModuleIds]);

  if (
    (showWebsite && websiteLoading) ||
    (showVisitors && visitorsLoading) ||
    (showLeads && leadsLoading)
  ) {
    return <PlanDashboardSkeleton plan="basic" />;
  }

  const hasOverviewMetrics = showVisitors || showLeads || showOrg;

  return (
    <div className="flex flex-col gap-5">
      <FreeTrialOfferNotice
        onUpgradeClick={onUpgradeClick}
        isExpiredDowngrade={isExpiredDowngrade}
        downgradedPlanLabel={downgradedPlanLabel}
      />
      <WonoListingsCard />

      <VerifiedBadgeNotice />
      <BonusTrialOfferNotice suppressed={isExpiredDowngrade} />

      <div data-tour="dashboard-getting-started">
        <WorkspaceProgress
          totalMembers={totalMembers}
          leadCount={leadStats.total}
          visitorCount={visitorStats.totalCount}
          isWebsitePublished={isWebsitePublished}
          showWebsite={showWebsite}
          showLeads={showLeads}
          showVisitors={showVisitors}
          showOrg={showOrg}
        />
      </div>

      {hasOverviewMetrics && (
        <section
          data-tour="dashboard-overview"
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {showVisitors && (
              <BasicMetric
                icon={Eye}
                label="Visitors Today"
                value={visitorStats.todayCount}
                sub={`${visitorStats.checkedIn} on-site`}
                route="/visitors/visitor-management"
              />
            )}
            {showLeads && (
              <BasicMetric
                icon={UserPlus}
                label="Website Leads"
                value={leadStats.total}
                sub={`${leadStats.newLeads} need follow-up`}
                route="/key-apps/website-builder/leads"
              />
            )}
            {showOrg && (
              <BasicMetric
                icon={Users}
                label="Active Members"
                value={orgStats.activeMembers}
                sub={`${orgStats.totalMembers} total`}
                route="/core-modules/organization-management"
              />
            )}
          </div>
        </section>
      )}

      {quickLinks.length > 0 && (
        <section
          data-tour="dashboard-quick-links"
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
              <BasicQuickAction key={ql.route} {...ql} />
            ))}
          </div>
        </section>
      )}

      {/* Operational activity stays visible; empty states provide the next action. */}
      <>
        {/* Leads — recent enquiries + stage breakdown */}
        {showLeads && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div data-tour="dashboard-recent-leads">
              <BasicActivityPanel
                eyebrow="Lead activity"
                title="Recent Leads"
                action={
                  <button
                    type="button"
                    onClick={() => navigate("/key-apps/website-builder/leads")}
                    className="group inline-flex items-center gap-1 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]"
                  >
                    View all{" "}
                    <ArrowRight
                      size={12}
                      className="transition group-hover:translate-x-0.5"
                    />
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
                  <BasicEmptyState
                    icon={Globe}
                    title="Your first lead starts with your website"
                    description="Publish a template, share the link, and new enquiries will appear here automatically."
                    actionLabel="Open Website Builder"
                    route="/key-apps/website-builder"
                  />
                )}
              </BasicActivityPanel>
            </div>

            <div data-tour="dashboard-lead-status">
              <BasicActivityPanel eyebrow="Pipeline" title="Lead Status">
                <div className="flex min-h-48 flex-1 items-center justify-center">
                  {leadDonut.series.some((value) => value > 0) ? (
                    <DonutChart
                      centerLabel="Leads"
                      labels={leadDonut.labels}
                      colors={leadDonut.colors}
                      series={leadDonut.series}
                      tooltipValue={leadDonut.series.map(String)}
                    />
                  ) : (
                    <p className="text-content text-slate-400">No leads yet</p>
                  )}
                </div>
              </BasicActivityPanel>
            </div>
          </div>
        )}

        {/* Visitors — recent activity + monthly trend (FY) */}
        {showVisitors && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div data-tour="dashboard-recent-visitors">
              <BasicActivityPanel
                eyebrow="Front desk"
                title="Recent Visitors"
                action={
                  <button
                    type="button"
                    onClick={() => navigate("/visitors/visitor-management")}
                    className="group inline-flex items-center gap-1 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]"
                  >
                    View all{" "}
                    <ArrowRight
                      size={12}
                      className="transition group-hover:translate-x-0.5"
                    />
                  </button>
                }
              >
                {recentVisitors.length > 0 ? (
                  recentVisitors.map((v: any, i: number) => {
                    const status = String(v.status || "").toLowerCase();
                    return (
                      <RecentItem
                        key={v.id || i}
                        title={v.fullName || v.visitorCode || "Visitor"}
                        sub={v.purpose || v.visitorType || "—"}
                        badge={
                          status === "checked_in"
                            ? "Checked In"
                            : status === "checked_out"
                              ? "Checked Out"
                              : status === "pending"
                                ? "Pending"
                                : "Logged"
                        }
                        badgeColor={statusBadgeColor(
                          status === "checked_in"
                            ? "active"
                            : status === "pending"
                              ? "pending"
                              : "completed",
                        )}
                        time={humanRelTime(v.checkInAt || v.createdAt)}
                      />
                    );
                  })
                ) : (
                  <BasicEmptyState
                    icon={Eye}
                    title="No visitors logged yet"
                    description="Create the first visitor entry to start tracking front-desk activity."
                    actionLabel="Log a Visitor"
                    route="/visitors/visitor-management"
                  />
                )}
              </BasicActivityPanel>
            </div>

            <div data-tour="dashboard-visitor-trend">
              <BasicActivityPanel
                eyebrow="Fiscal year"
                title="Monthly Visitor Trend"
              >
                <BarGraph
                  chartId="basic-monthly-visitors"
                  data={visitorsByMonth}
                  options={visitorBarOptions}
                  height={260}
                />
              </BasicActivityPanel>
            </div>
          </div>
        )}
      </>
    </div>
  );
};

export default BasicDashboard;
