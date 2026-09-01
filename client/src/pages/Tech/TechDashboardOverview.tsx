import { useEffect, useMemo, useState } from "react";
import {
  Magnet,
  UserCheck,
  CheckCircle2,
  Globe,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import PageFrame from "@/components/Pages/PageFrame";
import { DashboardAttendanceCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/TodayAttendanceCard";
import WidgetSection from "@/components/WidgetSection";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { useFreshCurrentUser } from "@/hooks/useFreshCurrentUser";
import {
  PlanBadge,
  StatCard,
  SectionCard,
  RecentItem,
  DonutWidget,
  BarWidget,
  QuickLink,
  getGreeting,
  humanRelTime,
  statusBadgeColor,
} from "@/pages/Dashboard/FrontendDashboard/dashboard/DashboardShared";
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

        {/* Overview — only the metrics that matter */}
        <WidgetSection layout={3} title="Overview" border normalCase>
          <StatCard icon={Magnet} label="Website Leads" value={leads.length} sub={`${pendingLeads.length} new/uncontacted`} color="#2563EB" route="/key-apps/website-builder/leads" />
          <StatCard icon={UserCheck} label="Contacted Leads" value={contactedLeads.length} sub={`${closedLeads.length} closed`} color="#f59e0b" route="/key-apps/website-builder/leads" />
          <StatCard icon={CheckCircle2} label="Closed Leads" value={closedLeads.length} sub={`${rejectedLeads.length} rejected`} color="#22c55e" route="/key-apps/website-builder/leads" />
        </WidgetSection>

        {/* Team status and live visitors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TeamLiveStatusCard department="tech" viewAllRoute="/key-apps/website-builder/leads" />

          <DepartmentVisitorsCard department="tech" title="Tech Visitors" />
        </div>

        {/* Quick links */}
        <WidgetSection layout={3} title="Quick Links" border normalCase>
          <QuickLink icon={Globe} label="Website Builder" description="Build & manage websites" route="/key-apps/website-builder" color="#2563EB" />
          <QuickLink icon={Magnet} label="Website Leads" description="Track & follow up leads" route="/key-apps/website-builder/leads" color="#f59e0b" />
          <QuickLink icon={CheckCircle2} label="Website Review" description="Visitor-submitted reviews" route="/key-apps/website-builder/dynamic/reviews" color="#22c55e" />
        </WidgetSection>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="Recent Website Leads" linkLabel="View all" linkRoute="/key-apps/website-builder/leads">
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
              <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No website leads yet</p></div>
            )}
          </SectionCard>

          <DonutWidget
            title="Lead Status"
            series={leadStatusDonut.series}
            labels={leadStatusDonut.labels}
            colors={leadStatusDonut.colors}
            centerLabel="Leads"
          />
        </div>

        <BarWidget
          title="Monthly Website Leads Trend"
          chartId="tech-monthly-leads"
          series={monthlyBarSeries}
          options={monthlyBarOptions}
          height={260}
        />
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
    <div className="p-4 flex flex-col gap-5">
      <PageFrame>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-title font-pmedium text-primary uppercase">Tech Dashboard</h2>
              <PlanBadge plan={access.plan} />
            </div>
            <p className="text-subtitle font-pmedium text-gray-700">{greeting} 👋</p>
            <p className="text-content font-pmedium text-gray-700">{todayLabel}<WorkspaceClock timezone={workspacePreferences.timezone} location={workspacePreferences.location} /></p>
          </div>
        </div>
      </PageFrame>

      <DashboardAttendanceCard />

      <TechDashboardWidgets />
    </div>
  );
}

export default TechDashboardOverview;
