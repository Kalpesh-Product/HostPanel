import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Building2,
  Database,
  ListTodo,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import WidgetSection from "../../components/WidgetSection";
import BarGraph from "../../components/graphs/BarGraph";
import DonutChart from "../../components/graphs/DonutChart";
import useDashboardAccess from "../../hooks/useDashboardAccess";
import { getAnalyticsOverview } from "../../services/analytics";
import type { AnalyticsBreakdownSegment, AnalyticsModuleEntry } from "../../services/analytics";

const CHART_COLORS = ["#1E3D73", "#80bf01", "#2563EB", "#f59e0b", "#7c3aed", "#0891b2", "#e11d48", "#059669"];

const formatNumber = (value: number | null | undefined) =>
  value === null || value === undefined ? "--" : Number(value).toLocaleString("en-IN");

const activityTone = (score: number) => {
  if (score >= 70) return { bar: "bg-[#80bf01]", text: "text-green-700" };
  if (score >= 40) return { bar: "bg-amber-500", text: "text-amber-700" };
  return { bar: "bg-rose-500", text: "text-rose-700" };
};

const planChipClass = (availability?: string) => {
  switch (availability) {
    case "All Plans":
      return "bg-green-50 text-green-700";
    case "Professional +":
      return "bg-blue-50 text-blue-700";
    case "Custom":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-50 text-slate-500";
  }
};

const SkeletonBlock = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />
);

// Full-page skeleton shown while the analytics payload loads.
const AnalyticsSkeleton = () => (
  <>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
      {[0, 1, 2, 3].map((index) => (
        <SkeletonBlock key={index} className="h-24 border border-slate-100 bg-white" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <SkeletonBlock className="h-80 border border-slate-100 bg-white" />
      <SkeletonBlock className="h-80 border border-slate-100 bg-white" />
    </div>
    <div className="mb-4 space-y-4">
      <SkeletonBlock className="h-64 border border-slate-100 bg-white" />
      <SkeletonBlock className="h-64 border border-slate-100 bg-white" />
    </div>
  </>
);

// Mounts heavy chart sections only once they approach the viewport so the
// top of the page paints fast and the rest streams in while scrolling.
const LazyMount = ({
  children,
  minHeight = 320,
}: {
  children: ReactNode;
  minHeight?: number;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible ? (
        children
      ) : (
        <div style={{ minHeight }}>
          <SkeletonBlock className="h-full min-h-[240px] w-full border border-slate-100 bg-white" />
        </div>
      )}
    </div>
  );
};

const MODULE_DESCRIPTIONS: Record<string, string> = {
  tickets: "Internal support queue — volume, resolution speed and priority mix.",
  "customer-support": "Customer-facing helpdesk tickets and resolution pipeline health.",
  "meeting-room-system": "Room bookings across internal, external and tenant guests.",
  calendar: "Holidays and leave requests driving the workspace calendar.",
  assets: "Physical asset inventory, category mix and repair lifecycle.",
  "team-management": "Team roster and sidebar access, plus department SOPs and policies.",
  "website-builder": "Published websites plus every edit/push logged by the builder.",
  "website-leads": "Leads captured from the public website pipeline.",
  "website-review": "Guest reviews with rating spread and moderation queue.",
  "organization-management": "Workspace membership growth and department structure.",
  "access-grants": "Roles shaping who can access what inside the unit.",
  "visitors-management": "Visitor passes by type with live check-in status.",
  "leads-management": "Sales CRM lead pipeline and conversion rate.",
  "tenant-companies-sales": "Tenant companies managed by the sales desk.",
  "resource-pricing": "Bookable resources and their availability state.",
  "exit-management": "Resignation requests moving through the exit pipeline.",
  tasks: "Task board throughput across departments and priorities.",
  attendance: "Attendance entries and their review approvals.",
  "leave-requests": "Leave requests with duration patterns.",
  inventory: "Inventory items split into consumables and returnables.",
  "finance-management": "Finance transactions, expenses and vendor records.",
  reports: "Generated reports by category and outcome.",
  "hr-documents": "SOP and policy documents by scope.",
  recruitment: "Job openings and the candidate pipeline.",
  "payroll-management": "Payroll cycles and payslip processing stages.",
  "house-keeping": "Housekeeping task flow and staff attendance.",
  "finance-budget": "Department budget plans and approval flow.",
  "billing-payments": "Tenant credit requests and invoice outcomes.",
  accounting: "Accounting transactions, expenses and vendors.",
  "maintenance-repair-logs": "Repair logs and preventive maintenance schedules.",
  "amc-maintenance-scheduler": "AMC service schedule adherence and overdue work.",
  "employee-management": "Company Management — employees, departments and the onboarding pipeline.",
};

const BREAKDOWN_TITLES: Record<string, [string, string]> = {
  tickets: ["By Status", "By Priority"],
  "customer-support": ["By Status", "Resolution"],
  "meeting-room-system": ["By Booking Type", "By Status"],
  calendar: ["Leave Status", "Leave Duration"],
  assets: ["By Category", "By Status"],
  "team-management": ["Member Status", "SOPs & Policies"],
  "website-builder": ["Publish State", "Coverage"],
  "website-leads": ["Pipeline", "Conversion"],
  "website-review": ["Rating Spread", "Moderation"],
  "organization-management": ["Membership", "Engagement"],
  "access-grants": ["Role Mix", "Freshness"],
  "visitors-management": ["Visitor Types", "Pass Status"],
  "leads-management": ["Pipeline", "Conversion"],
  "tenant-companies-sales": ["Company Status", "Growth"],
  "resource-pricing": ["Resource Status", "Utilisation"],
  "exit-management": ["Exit Pipeline", "Outcomes"],
  tasks: ["By Status", "By Priority"],
  attendance: ["Review Status", "Trend"],
  "leave-requests": ["Request Status", "Duration"],
  inventory: ["Item Status", "Tracking Type"],
  "finance-management": ["Record Types", "Transaction Status"],
  reports: ["By Category", "By Outcome"],
  "hr-documents": ["By Type", "By Scope"],
  recruitment: ["Volume Split", "Candidate Stages"],
  "payroll-management": ["Cycle Status", "Volume"],
  "house-keeping": ["Task Status", "Staff Attendance"],
  "finance-budget": ["Approval Status", "Requests"],
  "billing-payments": ["Invoice Status", "Flow"],
  accounting: ["Record Types", "Movement"],
  "maintenance-repair-logs": ["Repair Status", "Service Schedule"],
  "amc-maintenance-scheduler": ["Schedule Status", "Adherence"],
  "employee-management": ["Employee Status", "Onboarding"],
};

const STAT_CARDS = [
  { key: "modules", label: "Modules Tracked", color: "#1E3D73", borderClass: "" },
  { key: "activity", label: "Avg Activity Score", color: "#80bf01", borderClass: "border-l-4 border-l-[#80bf01]" },
  { key: "records", label: "Total Records", color: "#2563EB", borderClass: "border-l-4 border-l-blue-500" },
  { key: "open", label: "Open Items", color: "#f59e0b", borderClass: "border-l-4 border-l-amber-500" },
] as const;

const ChartTile = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 flex flex-col min-w-0">
    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mb-1">{title}</p>
    <div className="flex-1 min-w-0">{children}</div>
  </div>
);

const MAX_DONUT_SEGMENTS = 5;

const BreakdownDonut = ({
  segments,
  centerLabel,
}: {
  segments: AnalyticsBreakdownSegment[];
  centerLabel: string;
}) => {
  const sorted = [...segments].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, MAX_DONUT_SEGMENTS);
  const restValue = sorted.slice(MAX_DONUT_SEGMENTS).reduce((sum, segment) => sum + segment.value, 0);
  const display = restValue > 0 ? [...top, { label: "Others", value: restValue }] : top;
  return (
    <DonutChart
      centerLabel={centerLabel}
      labels={display.map((segment) => segment.label)}
      colors={display.map((_, index) => CHART_COLORS[index % CHART_COLORS.length])}
      series={display.map((segment) => segment.value)}
      tooltipValue={display.map((segment) => formatNumber(segment.value))}
      wrapLabels
    />
  );
};

const CountBars = ({
  chartId,
  points,
  color = "#1E3D73",
  height = 280,
}: {
  chartId: string;
  points: { label: string; count: number }[];
  color?: string;
  height?: number;
}) => (
  <BarGraph
    chartId={chartId}
    data={[{ name: "Count", data: points.map((point) => point.count) }]}
    options={{
      chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
      colors: [color],
      xaxis: {
        categories: points.map((point) => point.label),
        labels: { rotate: points.length > 10 ? -50 : 0, style: { fontSize: "10px" } },
      },
      plotOptions: { bar: { borderRadius: 4, columnWidth: "60%" } },
      dataLabels: { enabled: false },
      grid: { borderColor: "#ececec" },
      tooltip: { theme: "light" },
    }}
    height={height}
  />
);

const DeepDiveCard = ({ entry }: { entry: AnalyticsModuleEntry }) => {
  const navigate = useNavigate();
  const stats = entry.stats;
  const kpis = Array.isArray(stats?.kpis) ? stats.kpis : [];
  const breakdown = Array.isArray(stats?.breakdown) ? stats.breakdown : [];
  const secondary = Array.isArray(stats?.secondaryBreakdown) ? stats.secondaryBreakdown : [];
  const monthly = Array.isArray(stats?.monthly) ? stats.monthly : [];
  const deptSplit = Array.isArray(stats?.deptBreakdown) ? stats.deptBreakdown : [];
  const insights = stats?.insights;
  const hasMonthly = monthly.some((point) => (point?.count ?? 0) > 0);
  const titles = BREAKDOWN_TITLES[entry.id] ?? ["Distribution", "Breakdown"];
  const description = MODULE_DESCRIPTIONS[entry.id];

  const tiles: { key: string; title: string; donut?: AnalyticsBreakdownSegment[]; bars?: { label: string; count: number }[]; color?: string }[] = [];
  if (breakdown.length > 0) tiles.push({ key: "primary", title: titles[0] || "Distribution", donut: breakdown });
  if (secondary.length > 0) tiles.push({ key: "secondary", title: titles[1] || "Breakdown", donut: secondary });
  if (deptSplit.length > 0) tiles.push({ key: "dept", title: "Dept-wise", donut: deptSplit });
  if (hasMonthly) tiles.push({ key: "monthly", title: "Monthly Trend", bars: monthly.map((point) => ({ label: point.label, count: point.count })), color: "#80bf01" });
  if ((insights?.byDay ?? []).some((point) => point.count > 0))
    tiles.push({ key: "peakDay", title: "Peak Days (last 90d)", bars: insights!.byDay, color: "#2563EB" });

  return (
    <div className="border-default rounded-xl overflow-hidden bg-white">
      <div className="p-5 pb-3 border-b-2 border-borderGray flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <span className="text-mobileTitle lg:text-widgetTitle text-primary font-pmedium block truncate">
            {entry.label}
          </span>
          {description ? (
            <p className="text-small font-pmedium text-slate-400 mt-1 normal-case max-w-2xl">{description}</p>
          ) : null}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {entry.sectionLabel ? (
              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">
                {entry.sectionLabel}
              </span>
            ) : null}
            {entry.enabled === false ? (
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-widest text-rose-600">
                Not Enabled
              </span>
            ) : null}
            {entry.planAvailability ? (
              <span className={`rounded-full px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-widest ${planChipClass(entry.planAvailability)}`}>
                {entry.planAvailability}
              </span>
            ) : null}
          </div>
        </div>
        {entry.route ? (
          <button
            type="button"
            onClick={() => navigate(entry.route)}
            className="inline-flex items-center gap-1 bg-primary/5 text-primary px-3 py-1.5 rounded-xl font-pmedium text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white active:scale-95 transition-all whitespace-nowrap"
          >
            Open
          </button>
        ) : null}
      </div>

      {kpis.length > 0 ? (
        <div className="px-5 pt-3 pb-1 flex flex-wrap gap-2">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-full bg-slate-50 border border-slate-100 px-3 py-1.5 flex items-baseline gap-1.5">
              <span className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{kpi.label}</span>
              <span className="text-[11px] font-pmedium text-slate-900">
                {typeof kpi.value === "number" ? formatNumber(kpi.value) : kpi.value}
                {kpi.suffix || ""}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {tiles.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3">
          {tiles.map((tile) => (
            <ChartTile key={`${entry.id}-${tile.key}`} title={tile.title}>
              {tile.donut ? (
                <BreakdownDonut segments={tile.donut} centerLabel="Records" />
              ) : (
                <CountBars
                  chartId={`analytics-${entry.id}-${tile.key}`}
                  points={tile.bars ?? []}
                  color={tile.color}
                  height={300}
                />
              )}
            </ChartTile>
          ))}
        </div>
      ) : (
        <div className="h-40 flex items-center justify-center text-gray-400 text-content">No activity recorded yet</div>
      )}
    </div>
  );
};

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const [unitId, setUnitId] = useState("");
  const { roleBand, plan, isLoading: isAccessLoading } = useDashboardAccess();

  const isAllowed = roleBand === "owner" || roleBand === "super_admin";

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ["analytics-overview", unitId],
    queryFn: () => getAnalyticsOverview(unitId || undefined),
    enabled: isAllowed,
    staleTime: 2 * 60 * 1000,
  });

  const modules = useMemo(() => (Array.isArray(data?.modules) ? data.modules : []), [data]);
  const trend = useMemo(() => (Array.isArray(data?.trend) ? data.trend : []), [data]);

  const activityBars = useMemo(() => {
    const sorted = [...modules]
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 10);
    return {
      categories: sorted.map((entry) => entry.label),
      values: sorted.map((entry) => entry.activityScore),
    };
  }, [modules]);

  const trendSummary = useMemo(() => {
    const counts = trend.map((point) => point.count ?? 0);
    const labels = trend.map((point) => point.label);
    const total = counts.reduce((sum, value) => sum + value, 0);
    const bestIndex = counts.length ? counts.indexOf(Math.max(...counts)) : -1;
    return {
      thisMonth: counts[counts.length - 1] ?? 0,
      lastMonth: counts[counts.length - 2] ?? 0,
      bestLabel: bestIndex >= 0 ? labels[bestIndex] : "--",
      bestValue: bestIndex >= 0 ? counts[bestIndex] : 0,
      avg: counts.length ? Math.round(total / counts.length) : 0,
    };
  }, [trend]);

  const trendSeries = useMemo(
    () => [{ name: "New records", data: trend.map((point) => point.count) }],
    [trend],
  );

  const trendOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    colors: ["#80bf01"],
    xaxis: { categories: trend.map((point) => point.label) },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#f0f0f0" },
    tooltip: { theme: "light" },
  };

  const activityOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    colors: ["#80bf01"],
    xaxis: { categories: activityBars.categories },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "55%" } },
    dataLabels: { enabled: true },
    grid: { borderColor: "#f0f0f0" },
    tooltip: { theme: "light", y: { formatter: (value: number) => `${value}/100` } },
  };

  const statValues: Record<string, string | number> = {
    modules: data?.totals?.trackedModules ?? 0,
    activity: `${data?.totals?.avgActivityScore ?? 0}/100`,
    records: formatNumber(data?.totals?.totalRecords ?? 0),
    open: formatNumber(data?.totals?.openItems ?? 0),
  };

  if (!isAllowed && !isAccessLoading) {
    return (
      <PageFrame>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div className="p-3 rounded-full bg-rose-50">
            <ShieldAlert size={26} className="text-rose-600" />
          </div>
          <h2 className="text-subtitle font-pmedium text-primary uppercase">Restricted</h2>
          <p className="text-content font-pmedium text-slate-500">
            Only founders and super admins can view workspace analytics.
          </p>
        </div>
      </PageFrame>
    );
  }

  if (isAccessLoading || (isAllowed && isLoading)) {
    return (
      <PageFrame>
        <div className="mb-3">
          <SkeletonBlock className="h-9 w-56" />
          <SkeletonBlock className="h-4 w-96 mt-2" />
        </div>
        <AnalyticsSkeleton />
      </PageFrame>
    );
  }

  const requestFailed = Boolean(error);
  const units = Array.isArray(data?.units) ? data.units : [];

  return (
    <PageFrame>
      {/* 1. Page header */}
      <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
        <div>
          <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
            <BarChart3 size={22} /> Analytics
          </h2>
          <p className="text-xs font-pmedium text-slate-500 mt-1">
            Performance across every module enabled for{" "}
            <span>{data?.workspaceName || "this workspace"}</span> on the{" "}
            <span className="capitalize">{data?.plan || plan || "current"}</span> plan.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {units.length > 1 ? (
            <label className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2.5 shadow-sm cursor-pointer">
              <Building2 size={13} className="text-primary shrink-0" />
              <select
                value={unitId || data?.workspaceId || ""}
                onChange={(event) => setUnitId(event.target.value)}
                className="bg-transparent font-pmedium text-[10px] uppercase tracking-widest text-slate-600 focus:outline-none cursor-pointer max-w-[180px]"
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {data?.generatedAt ? (
            <span className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">
              Updated {new Date(data.generatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap disabled:opacity-60"
          >
            <RefreshCw size={13} strokeWidth={3} className={isRefetching ? "animate-spin" : ""} />
            REFRESH
          </button>
        </div>
      </div>

      {requestFailed ? (
        <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-content font-pmedium text-rose-700">
          Unable to load analytics right now. Please try refreshing in a moment.
        </div>
      ) : null}

      {/* 2. Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${card.borderClass}`}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-pmedium uppercase tracking-widest mb-1 text-slate-400">{card.label}</p>
              <p className="text-[15px] font-pmedium text-slate-900">{statValues[card.key]}</p>
            </div>
            <div className="p-2 rounded-2xl shrink-0" style={{ backgroundColor: `${card.color}18` }}>
              {card.key === "modules" ? (
                <BarChart3 size={18} style={{ color: card.color }} />
              ) : card.key === "activity" ? (
                <Activity size={18} style={{ color: card.color }} />
              ) : card.key === "records" ? (
                <Database size={18} style={{ color: card.color }} />
              ) : (
                <ListTodo size={18} style={{ color: card.color }} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Overview charts — two per line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="border-default rounded-xl overflow-hidden bg-white">
          <div className="p-4 border-b-2 border-borderGray uppercase">
            <span className="text-mobileTitle lg:text-widgetTitle text-primary font-pmedium">Platform Activity Trend</span>
            <p className="text-small font-pmedium text-slate-400 normal-case mt-0.5">How much new work your unit creates each month (last 6 months)</p>
          </div>
          <div className="p-2">
            <BarGraph chartId="analytics-trend" data={trendSeries} options={trendOptions} height={260} />
          </div>
          <div className="px-3 pb-3 grid grid-cols-2 gap-2">
            {[
              { label: "This month", value: formatNumber(trendSummary.thisMonth) },
              { label: "Last month", value: formatNumber(trendSummary.lastMonth) },
              { label: "Best month", value: `${trendSummary.bestLabel} · ${formatNumber(trendSummary.bestValue)}` },
              { label: "Monthly avg", value: formatNumber(trendSummary.avg) },
            ].map((chip) => (
              <div
                key={chip.label}
                className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 flex items-baseline justify-between gap-2"
              >
                <span className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{chip.label}</span>
                <span className="text-[11px] font-pmedium text-slate-900">{chip.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-default rounded-xl overflow-hidden bg-white">
          <div className="p-4 border-b-2 border-borderGray uppercase">
            <span className="text-mobileTitle lg:text-widgetTitle text-primary font-pmedium">Module Activity Scores</span>
            <p className="text-small font-pmedium text-slate-400 normal-case mt-0.5">Which modules your team actually uses — score out of 100 (top 10)</p>
          </div>
          <div className="p-2">
            {activityBars.categories.length > 0 ? (
              <BarGraph
                chartId="analytics-activity"
                data={[{ name: "Activity score", data: activityBars.values }]}
                options={activityOptions}
                height={Math.max(260, activityBars.categories.length * 42)}
              />
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-content">No tracked modules yet</div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Module deep dive — one module per line, two charts per line inside.
          Cards mount lazily as they approach the viewport. */}
      {modules.length > 0 ? (
        <WidgetSection title="Module Deep Dive" border normalCase layout={1}>
          <div className="grid grid-cols-1 gap-4">
            {modules.map((entry) => (
              <LazyMount key={`deep-${entry.id}`} minHeight={420}>
                <DeepDiveCard entry={entry} />
              </LazyMount>
            ))}
          </div>
        </WidgetSection>
      ) : null}

      {/* 6. Module performance table */}
      <WidgetSection title="Module Performance" border normalCase layout={1}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left font-pmedium">
            <thead className="border-b border-slate-100/60 bg-slate-50/50 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-5 py-4">Module</th>
                <th className="px-5 py-4">Section</th>
                <th className="px-5 py-4">Plan</th>
                <th className="px-5 py-4 text-right">Records</th>
                <th className="px-5 py-4 text-right">Last 30 Days</th>
                <th className="px-5 py-4 text-right">Open Items</th>
                <th className="px-5 py-4 text-right">Completion</th>
                <th className="px-5 py-4">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {modules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center font-pmedium text-slate-400">
                    No modules with trackable data are enabled for this workspace yet.
                  </td>
                </tr>
              ) : (
                modules.map((entry: AnalyticsModuleEntry) => {
                  const tone = activityTone(entry.activityScore);
                  return (
                    <tr
                      key={entry.id}
                      className={`group transition-colors hover:bg-slate-50/50 ${entry.route ? "cursor-pointer" : ""}`}
                      onClick={() => entry.route && navigate(entry.route)}
                    >
                      <td className="px-5 py-4">
                        <div className="font-pmedium text-slate-900 capitalize">{entry.label}</div>
                        <div className="text-[10px] font-pmedium text-slate-400">{entry.id}</div>
                      </td>
                      <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600">{entry.sectionLabel || "--"}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-widest ${planChipClass(entry.planAvailability)}`}>
                          {entry.planAvailability || "--"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-[12px] font-pmedium text-slate-900">{formatNumber(entry.stats?.totalRecords)}</td>
                      <td className="px-5 py-4 text-right text-[12px] font-pmedium text-slate-700">{formatNumber(entry.stats?.activeLast30Days)}</td>
                      <td className="px-5 py-4 text-right text-[12px] font-pmedium text-slate-700">{formatNumber(entry.stats?.openItems)}</td>
                      <td className="px-5 py-4 text-right text-[12px] font-pmedium text-slate-700">
                        {entry.stats?.completionRate === null || entry.stats?.completionRate === undefined ? "--" : `${entry.stats.completionRate}%`}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-[140px]">
                          <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-2 rounded-full ${tone.bar}`} style={{ width: `${Math.max(4, Math.min(100, entry.activityScore))}%` }} />
                          </div>
                          <span className={`text-[11px] font-pmedium ${tone.text}`}>{entry.activityScore}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </WidgetSection>

      {/* 7. Enabled modules without trackable data */}
      {data?.alsoEnabled?.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mr-1">Also enabled:</span>
          {data.alsoEnabled.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => item.route && navigate(item.route)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-500 shadow-sm transition-colors hover:border-blue-200 hover:text-blue-700"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </PageFrame>
  );
};

export default AnalyticsPage;
