/**
 * BasicDashboard — shown for workspaces on the Basic plan.
 * Simplified, glanceable layout: plan strip → today's key numbers → quick
 * actions → one row per topic (leads, visitors). Built only from the shared
 * dashboard widgets so it stays consistent with the other plan dashboards.
 * Upgrade nudge → opens the upgrade modal (Professional only).
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import WidgetSection from "../../../../components/WidgetSection";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import useAuth from "../../../../hooks/useAuth";
import {
  Globe, Users, Eye, UserPlus, FileText, Zap, ArrowRight, LayoutGrid,
} from "lucide-react";
import {
  StatCard, QuickLink, SectionCard, RecentItem, DonutWidget, BarWidget,
} from "./DashboardShared";
import type { QuickLinkItem } from "./DashboardShared";
import { statusBadgeColor, humanRelTime } from "./dashboardUtils";
import { ICON_BY_ID, DEFAULT_SECTION_ROUTES } from "../ModuleCardsLanding";
import type { WorkspaceModuleSection } from "../../../../hooks/useDashboardAccess";
import dayjs from "dayjs";
import PlanDashboardSkeleton from "./PlanDashboardSkeleton";

interface BasicDashboardProps {
  onUpgradeClick: () => void;
  /** Org member counts — passed down from useDashboardAccess() so this component
   * doesn't re-fetch /api/organization/overview a second time on the same page load. */
  activeMembers: number;
  totalMembers: number;
  /** The workspace's real module catalog + this member's actual grants, so Quick
   * Actions reflects what the workspace has instead of a hand-picked subset. */
  moduleMap: { sections: WorkspaceModuleSection[] };
  grantedModuleIds: Set<string>;
}

// The shared module catalog (ModuleCardsLanding) doesn't carry a route for
// "visitor-management" — only its plural department-tab alias
// "visitors-management" — so it's added here rather than touching the
// shared file for one dashboard's sake.
const BASIC_ROUTE_BY_ID: Record<string, string> = {
  ...DEFAULT_SECTION_ROUTES,
  "visitor-management": "/visitors/visitor-management",
};

const BASIC_MODULE_COPY: Record<string, { description: string; color: string }> = {
  "customer-support": { description: "Raise issues to the WoNo team", color: "#ef4444" },
  "visitor-management": { description: "Log & track visitors", color: "#80bf01" },
  "tech-website-builder": { description: "Build & publish your site", color: "#7c3aed" },
  "website-leads": { description: "Follow up on every enquiry", color: "#1E3D73" },
  "website-review": { description: "See what visitors are saying", color: "#059669" },
  "organization-management": { description: "Members, roles & departments", color: "#0891b2" },
  "access-grants": { description: "Control who can access what", color: "#f59e0b" },
};

// FY month labels Apr–Mar
const FY_MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const fyMonthIndex = (date: Date) => (date.getMonth() + 9) % 12;

// Lead pipeline stages — mirrors the statuses on the Website Leads page.
const LEAD_STAGES = [
  { key: "Pending", label: "Pending", color: "#f59e0b" },
  { key: "Contacted", label: "Contacted", color: "#2563EB" },
  { key: "Closed", label: "Closed", color: "#059669" },
  { key: "Rejected", label: "Rejected", color: "#ef4444" },
] as const;

// Shown instead of the leads/visitors rows until the workspace has real
// activity — four empty "No data yet" panels teach a first-time user
// nothing, one ordered checklist does.
const GETTING_STARTED_STEPS = [
  { icon: Globe, label: "Build & publish your website", description: "Pick a template and go live in minutes.", route: "/key-apps/website-builder", color: "#7c3aed" },
  { icon: FileText, label: "Share your website link", description: "Every enquiry that comes in becomes a lead here automatically.", route: "/key-apps/website-builder/leads", color: "#1E3D73" },
  { icon: Eye, label: "Log your first visitor", description: "Track walk-ins and guests as they check in.", route: "/visitors/visitor-management", color: "#80bf01" },
];

const GettingStartedCard = () => {
  const navigate = useNavigate();
  return (
    <div className="border-default rounded-xl overflow-hidden">
      <div className="p-4 border-b-2 border-borderGray uppercase">
        <span className="text-mobileTitle lg:text-widgetTitle text-primary font-pmedium">Getting Started</span>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
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

const BasicDashboard = ({ onUpgradeClick, activeMembers, totalMembers, moduleMap, grantedModuleIds }: BasicDashboardProps) => {
  const axiosPrivate = useAxiosPrivate();
  const selectedCompany = useSelector((state: any) => state.company.selectedCompany);
  const { auth } = useAuth();

  const workspaceId = selectedCompany?.workspaceId || auth?.user?.primaryWorkspace || auth?.user?.workspaceMembership?.workspace || auth?.user?.workspaceId || "";
  const companyId = selectedCompany?.companyId || auth?.user?.companyId || "";

  // ── Visitors (same endpoint as the Visitor Management terminal) ──────────────
  const { data: visitorsRaw = [], isLoading: visitorsLoading } = useQuery({
    queryKey: ["dashboard-visitors-basic"],
    queryFn: async () => {
      const res = await axiosPrivate.get("/api/v1/visitors", { params: { limit: 100 } });
      const visitors = res?.data?.data?.visitors ?? [];
      return Array.isArray(visitors) ? visitors : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Website leads (same endpoint as CompanyLeads) ──────────────────────────
  const { data: leadsRaw = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["dashboard-leads-basic", companyId, workspaceId],
    enabled: !!(companyId || workspaceId),
    queryFn: async () => {
      const res = await axiosPrivate.get(
        `/api/leads/get-leads?companyId=${encodeURIComponent(companyId)}&workspaceId=${encodeURIComponent(workspaceId)}`,
      );
      return Array.isArray(res?.data) ? res.data : [];
    },
    staleTime: 5 * 60 * 1000,
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
    const newLeads = leadsRaw.filter((l: any) => (l.status || "Pending") === "Pending").length;
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

  // Nothing logged yet in either feed — show a getting-started checklist
  // instead of four empty "No data yet" panels.
  const isNewWorkspace = leadStats.total === 0 && visitorStats.totalCount === 0;

  // ── Recent leads ───────────────────────────────────────────────────────────
  const recentLeads = useMemo(
    () => [...leadsRaw]
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5),
    [leadsRaw],
  );

  // ── Recent visitors ────────────────────────────────────────────────────────
  const recentVisitors = useMemo(
    () => [...visitorsRaw]
      .sort((a: any, b: any) =>
        new Date(b.checkInAt || b.createdAt || 0).getTime() -
        new Date(a.checkInAt || a.createdAt || 0).getTime()
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

  if (visitorsLoading || leadsLoading) {
    return <PlanDashboardSkeleton plan="basic" />;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Plan strip — compact, opens the upgrade modal */}
      <div
        data-tour="dashboard-plan"
        className="flex items-center gap-3 p-4 rounded-xl border-2 border-accent/30 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={onUpgradeClick}
      >
        <Zap size={18} className="text-accent flex-shrink-0" />
        <p className="text-content font-pmedium text-blue-800 min-w-0 truncate">
          You're on the <strong>Basic Plan</strong> — Upgrade to{" "}
          <strong>Professional Plan</strong> for Meeting Room Bookings, Ticketing, Sales Modules & more.
        </p>
        <span className="ml-auto flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-pmedium uppercase tracking-widest border bg-accent text-white border-accent whitespace-nowrap">
          Upgrade ↑
        </span>
        <ArrowRight size={14} className="text-accent flex-shrink-0" />
      </div>

      {/* Today at a glance — one card per key question */}
      <div data-tour="dashboard-overview">
        <WidgetSection layout={3} title="Overview" border normalCase>
          <StatCard icon={Eye} label="Visitors Today" value={visitorStats.todayCount} sub={`${visitorStats.checkedIn} currently on-site`} color="#80bf01" route="/visitors/visitor-management" />
          <StatCard icon={UserPlus} label="Website Leads" value={leadStats.total} sub={`${leadStats.newLeads} awaiting follow-up`} color="#1E3D73" route="/key-apps/website-builder/leads" />
          <StatCard icon={Users} label="Active Members" value={orgStats.activeMembers} sub={`${orgStats.totalMembers} total members`} color="#0891b2" route="/core-modules/organization-management" />
        </WidgetSection>
      </div>

      {/* Quick actions — the four essentials, one row */}
      <div data-tour="dashboard-quick-links">
        <WidgetSection layout={4} title="Quick Actions" border normalCase>
          {quickLinks.map((ql, i) => <QuickLink key={i} {...ql} />)}
        </WidgetSection>
      </div>

      {isNewWorkspace ? (
        /* First run — one checklist beats four empty "No data yet" panels */
        <div data-tour="dashboard-getting-started">
          <GettingStartedCard />
        </div>
      ) : (
        <>
          {/* Leads — recent enquiries + stage breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div data-tour="dashboard-recent-leads">
              <SectionCard title="Recent Leads" linkLabel="View all" linkRoute="/key-apps/website-builder/leads">
              {recentLeads.length > 0 ? (
                recentLeads.map((l: any, i: number) => (
                  <RecentItem
                    key={l._id || i}
                    title={l.name || l.fullName || "Lead"}
                    sub={l.email || l.phone || "—"}
                    badge={(l.status || "Pending") === "Pending" ? "New" : l.status}
                    badgeColor={statusBadgeColor(l.status === "Contacted" || l.status === "Closed" ? "active" : "pending")}
                    time={humanRelTime(l.createdAt)}
                  />
                ))
              ) : (
                <div className="min-h-48 flex items-center justify-center">
                  <p className="text-content text-gray-400 text-center">No leads yet — publish your website to start receiving leads.</p>
                </div>
              )}
              </SectionCard>
            </div>

            <div data-tour="dashboard-lead-status">
              <DonutWidget
                title="Lead Status"
                series={leadDonut.series}
                labels={leadDonut.labels}
                colors={leadDonut.colors}
                centerLabel="Leads"
                emptyText="No leads yet"
              />
            </div>
          </div>

          {/* Visitors — recent activity + monthly trend (FY) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div data-tour="dashboard-recent-visitors">
              <SectionCard title="Recent Visitors" linkLabel="View all" linkRoute="/visitors/visitor-management">
              {recentVisitors.length > 0 ? (
                recentVisitors.map((v: any, i: number) => {
                  const status = String(v.status || "").toLowerCase();
                  return (
                    <RecentItem
                      key={v.id || i}
                      title={v.fullName || v.visitorCode || "Visitor"}
                      sub={v.purpose || v.visitorType || "—"}
                      badge={status === "checked_in" ? "Checked In" : status === "checked_out" ? "Checked Out" : status === "pending" ? "Pending" : "Logged"}
                      badgeColor={statusBadgeColor(status === "checked_in" ? "active" : status === "pending" ? "pending" : "completed")}
                      time={humanRelTime(v.checkInAt || v.createdAt)}
                    />
                  );
                })
              ) : (
                <div className="min-h-48 flex items-center justify-center">
                  <p className="text-content text-gray-400 text-center">No visitors logged yet.</p>
                </div>
              )}
              </SectionCard>
            </div>

            <div data-tour="dashboard-visitor-trend">
              <BarWidget
                title="Monthly Visitor Trend (FY)"
                chartId="basic-monthly-visitors"
                series={visitorsByMonth}
                options={visitorBarOptions}
                height={260}
              />
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default BasicDashboard;
