/**
 * TechDashboardOverview — the Tech manager's dashboard at /dashboard. Uses the
 * same visual language as the plan-wise and employee dashboards: the slate
 * outer shell + bordered inner frame, a blue-gradient greeting masthead,
 * today's attendance as the hero card, a "Tech Pulse" metric row, quick
 * actions, and the Tech activity panels below.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Globe,
  LayoutDashboard,
  Magnet,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import BarGraph from "@/components/graphs/BarGraph";
import InsightDonutChart from "@/pages/Dashboard/FrontendDashboard/dashboard/InsightDonutChart";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { useFreshCurrentUser } from "@/hooks/useFreshCurrentUser";
import {
  ActivityPanel,
  EmptyState,
  MetricTile,
  PlanBadge,
  QuickActionTile,
  RecentItem,
  getGreeting,
  humanRelTime,
  statusBadgeColor,
} from "@/pages/Dashboard/FrontendDashboard/dashboard/DashboardShared";
import TodayAttendanceCard from "@/pages/Dashboard/FrontendDashboard/dashboard/TodayAttendanceCard";
import DepartmentBudgetPanel from "@/pages/Dashboard/FrontendDashboard/dashboard/DepartmentBudgetPanel";
import { TeamLiveStatusCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/TeamLiveStatusCard";
import { DepartmentVisitorsCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/DepartmentVisitorsCard";
import { getWebsiteLeads } from "@/services/sales-leads";

/* ───────────────────────────── Types ───────────────────────────── */

interface WebsiteLeadRecord {
  id?: string;
  _id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  status?: string;
  createdAt?: string;
}

interface DashboardState {
  leads: WebsiteLeadRecord[];
}

const DEFAULT_DASHBOARD: DashboardState = {
  leads: [],
};

/* ───────────────────────────── Helpers ───────────────────────────── */

function normalizeText(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function leadStatusLabel(status: unknown): string {
  const label = String(status || "").trim();
  return label || "Pending";
}

function leadContactLabel(lead: WebsiteLeadRecord): string {
  return lead.email || lead.phone || "No contact details";
}

/* ───────────────────────────── Component ───────────────────────────── */

const WorkspaceClock = ({ timezone, location }: { timezone: string; location: string }) => {
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

  if (!timeLabel) return null;

  return (
    <>
      {` | `}
      <span className="inline-block whitespace-nowrap" aria-label={timeLabel}>
        {timeLabel.split("").map((ch, i) =>
          /[0-9]/.test(ch) ? (
            <span key={i} className="inline-block w-[0.665em] text-center">
              {ch}
            </span>
          ) : (
            <span key={i}>{ch}</span>
          )
        )}
      </span>
      {location ? ` - ${location}` : ""}
    </>
  );
};

const ViewAllButton = ({ route }: { route: string }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(route)}
      className="group inline-flex items-center gap-1 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]"
    >
      View all
      <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
    </button>
  );
};

/**
 * Stat cards, charts, and quick links for the Tech dashboard — split out from
 * TechDashboardOverview so AdminDashboardOverview can render this same
 * content for an Admin assigned to the Tech department, without the
 * department's own greeting/header banner.
 */
export function TechDashboardWidgets() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardState>(DEFAULT_DASHBOARD);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const [leadsResponse] = await Promise.allSettled([getWebsiteLeads()]);

        if (!isMounted) {
          return;
        }

        const leadsData = leadsResponse.status === "fulfilled" ? leadsResponse.value?.data : [];

        setDashboard({
          leads: Array.isArray(leadsData) ? (leadsData as WebsiteLeadRecord[]) : [],
        });

        const failures = [leadsResponse].filter((result) => result.status === "rejected");
        setError(failures.length > 0 ? (failures[0] as PromiseRejectedResult).reason?.message || "Some Tech data could not be loaded." : "");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError((loadError as Error)?.message || "Unable to load Tech overview.");
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

  const leads = dashboard.leads;

  const pendingLeads = useMemo(() => leads.filter((lead) => normalizeText(leadStatusLabel(lead.status)) === "pending"), [leads]);
  const contactedLeads = useMemo(() => leads.filter((lead) => normalizeText(leadStatusLabel(lead.status)) === "contacted"), [leads]);
  const closedLeads = useMemo(() => leads.filter((lead) => normalizeText(leadStatusLabel(lead.status)) === "closed"), [leads]);
  const rejectedLeads = useMemo(() => leads.filter((lead) => normalizeText(leadStatusLabel(lead.status)) === "rejected"), [leads]);
  const leadConversionRate = useMemo(
    () => (leads.length ? Math.round((closedLeads.length / leads.length) * 100) : 0),
    [closedLeads.length, leads.length],
  );

  const recentLeads = useMemo(
    () =>
      [...leads]
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
        .slice(0, 5),
    [leads],
  );

  const leadStatusDonut = useMemo(
    () => ({
      series: [pendingLeads.length, contactedLeads.length, closedLeads.length, rejectedLeads.length],
      labels: ["Pending", "Contacted", "Closed", "Rejected"],
      colors: ["#f59e0b", "#2563EB", "#22c55e", "#ef4444"],
    }),
    [pendingLeads, contactedLeads, closedLeads, rejectedLeads],
  );

  const monthLabels = useMemo(() => {
    const labels: string[] = [];
    const anchor = new Date();
    for (let i = 11; i >= 0; i -= 1) {
      const monthStart = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      labels.push(monthStart.toLocaleDateString("en-US", { month: "short" }));
    }
    return labels;
  }, []);

  const leadsByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    const anchor = new Date();
    leads.forEach((lead) => {
      const parsed = new Date(String(lead.createdAt || ""));
      if (Number.isNaN(parsed.getTime())) return;
      const diffMonths = (anchor.getFullYear() - parsed.getFullYear()) * 12 + (anchor.getMonth() - parsed.getMonth());
      const index = 11 - diffMonths;
      if (index >= 0 && index < 12) counts[index] += 1;
    });
    return counts;
  }, [leads]);

  const monthlyBarSeries = useMemo(() => [{ name: "Website Leads", data: leadsByMonth }], [leadsByMonth]);

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

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700">
          {error}
        </div>
      ) : null}

      {/* Tech Pulse — the metrics that matter most */}
      <div data-tour="tech-overview">
        <section className="rounded-[1.75rem] border border-blue-100 bg-[#F8FAFD] p-5 shadow-[0_12px_34px_rgba(30,61,115,0.06)] sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E3D73] text-white shadow-sm">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
                Web presence
              </p>
              <h3 className="mt-0.5 text-lg font-pmedium text-[#1E3D73]">
                Tech Pulse
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile icon={Magnet} label="Website Leads" value={leads.length} sub={`${pendingLeads.length} new/uncontacted`} route="/key-apps/website-builder/leads" color="#2563EB" />
            <MetricTile icon={UserCheck} label="Contacted Leads" value={contactedLeads.length} sub={`${closedLeads.length} closed`} route="/key-apps/website-builder/leads" color="#f59e0b" />
            <MetricTile icon={CheckCircle2} label="Closed Leads" value={closedLeads.length} sub={`${rejectedLeads.length} rejected`} route="/key-apps/website-builder/leads" color="#22c55e" />
            <MetricTile icon={TrendingUp} label="Lead Conversion" value={`${leadConversionRate}%`} sub="Closed out of all leads" route="/key-apps/website-builder/leads" color="#0d9488" />
          </div>
        </section>
      </div>

      {/* Team status and live visitors — a fixed pair */}
      <div data-tour="tech-team-status" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TeamLiveStatusCard department="tech" viewAllRoute="/key-apps/website-builder/leads" />

        <DepartmentVisitorsCard department="tech" title="Tech Visitors" />
      </div>

      {/* Quick actions */}
      <div data-tour="tech-quick-links">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 shadow-[0_12px_34px_rgba(37,99,235,0.08)] sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70" />
          <div className="relative mb-5">
            <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
              Jump back in
            </p>
            <h3 className="mt-1 text-lg font-pmedium text-[#1E3D73]">
              Quick Actions
            </h3>
            <p className="mt-1 text-xs font-pmedium text-slate-500">
              The Tech modules you use most, one click away.
            </p>
          </div>
          <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <QuickActionTile icon={Globe} label="Website Builder" description="Build & manage websites" route="/key-apps/website-builder" color="#2563EB" />
            <QuickActionTile icon={Magnet} label="Website Leads" description="Track & follow up leads" route="/key-apps/website-builder/leads" color="#f59e0b" />
            <QuickActionTile icon={CheckCircle2} label="Website Review" description="Visitor-submitted reviews" route="/key-apps/website-builder/dynamic/reviews" color="#22c55e" />
          </div>
        </section>
      </div>

      <div data-tour="tech-leads" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ActivityPanel
          eyebrow="Enquiries"
          title="Recent Website Leads"
          action={<ViewAllButton route="/key-apps/website-builder/leads" />}
        >
          {recentLeads.length > 0 ? recentLeads.map((lead, index) => (
            <RecentItem
              key={lead.id || lead._id || index}
              title={lead.name || lead.fullName || "Website Lead"}
              sub={leadContactLabel(lead)}
              badge={leadStatusLabel(lead.status)}
              badgeColor={statusBadgeColor(leadStatusLabel(lead.status))}
              time={humanRelTime(lead.createdAt || "")}
            />
          )) : (
            <EmptyState icon={Magnet} title="No website leads yet" description="New enquiries will show up here as they arrive." actionLabel="Open Leads" route="/key-apps/website-builder/leads" />
          )}
        </ActivityPanel>

        <ActivityPanel eyebrow="Breakdown" title="Lead Status">
          <div className="flex min-h-48 flex-1 items-center justify-center">
            {leadStatusDonut.series.some((value) => value > 0) ? (
              <InsightDonutChart centerLabel="Leads" labels={leadStatusDonut.labels} colors={leadStatusDonut.colors} series={leadStatusDonut.series} tooltipValue={leadStatusDonut.series.map(String)} />
            ) : (
              <p className="text-content font-pmedium text-slate-400">No leads yet</p>
            )}
          </div>
        </ActivityPanel>
      </div>

      <div data-tour="tech-leads-trend">
        <ActivityPanel eyebrow="Year at a glance" title="Monthly Website Leads Trend">
          <BarGraph chartId="tech-monthly-leads" data={monthlyBarSeries} options={monthlyBarOptions} height={260} />
        </ActivityPanel>
      </div>

      <DepartmentBudgetPanel department="Technology" title="Technology Budget vs Spend" />
    </div>
  );
}

export function TechDashboardOverview() {
  const currentUser = useFreshCurrentUser();
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
    return full || currentUser?.fullName || currentUser?.name || currentUser?.displayName || "Tech Manager";
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

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <div className="flex flex-col gap-5 rounded-xl border-default p-4">

        {/* Greeting card — same blue plan-card style used across the plan
            dashboards and the employee dashboard. */}
        <section
          data-tour="tech-greeting"
          className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 shadow-[0_12px_34px_rgba(37,99,235,0.08)] sm:p-6"
        >
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70" />
          <div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-blue-50/70" />
          <div className="relative flex min-w-0 items-start gap-4">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] ring-1 ring-blue-100 sm:flex">
              <LayoutDashboard size={21} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[9px] font-pmedium uppercase tracking-[0.22em] text-[#2563EB]">
                  Tech Unit dashboard
                </p>
                <PlanBadge plan={access.plan} />
              </div>
              <h2 className="mt-2 text-xl font-pmedium text-[#1E3D73] sm:text-2xl">
                {greeting} 👋
              </h2>
              <p className="mt-1 text-xs font-pmedium text-slate-500 sm:text-sm">
                {todayLabel}
                <WorkspaceClock
                  timezone={workspacePreferences.timezone}
                  location={workspacePreferences.location}
                />
              </p>
            </div>
          </div>
        </section>

        {/* Today's attendance — the hero card, same as the plan dashboards */}
        <div data-tour="tech-attendance">
          <TodayAttendanceCard variant="hero" />
        </div>

        <TechDashboardWidgets />
      </div>
    </div>
  );
}

export default TechDashboardOverview;
