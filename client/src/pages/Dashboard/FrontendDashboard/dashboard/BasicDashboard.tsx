/**
 * BasicDashboard — shown for workspaces on the Basic plan.
 * Focus: Website leads, visitors (from real visitor API), org, quick links.
 * Upgrade nudge → opens the upgrade modal (Professional only).
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import WidgetSection from "../../../../components/WidgetSection";
import BarGraph from "../../../../components/graphs/BarGraph";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import {
  Globe, Users, Eye, UserPlus, LayoutGrid, ArrowRight,
  FileText, Zap, Map,
} from "lucide-react";
import {
  StatCard, QuickLink, SectionCard, RecentItem, DonutWidget,
} from "./DashboardShared";
import type { QuickLinkItem } from "./DashboardShared";
import { statusBadgeColor, humanRelTime } from "./dashboardUtils";
import dayjs from "dayjs";

interface BasicDashboardProps {
  onUpgradeClick: () => void;
}

// FY month labels Apr–Mar
const FY_MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const fyMonthIndex = (date: Date) => (date.getMonth() + 9) % 12;

const BasicDashboard = ({ onUpgradeClick }: BasicDashboardProps) => {
  const axiosPrivate = useAxiosPrivate();

  // ── Visitors (same endpoint as VisitorDashboard / ManageVisitors) ────────────
  const { data: visitorsRaw = [] } = useQuery({
    queryKey: ["dashboard-visitors-full"],
    queryFn: async () => {
      const res = await axiosPrivate.get("/api/visitors/fetch-visitors");
      // This endpoint returns the array directly on res.data
      return Array.isArray(res?.data) ? res.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Website leads ──────────────────────────────────────────────────────────
  const { data: leadsRaw = [] } = useQuery({
    queryKey: ["dashboard-leads-basic"],
    queryFn: async () => {
      const res = await axiosPrivate.get("/api/v1/website-leads");
      const d = res?.data?.data ?? res?.data ?? [];
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Org overview ───────────────────────────────────────────────────────────
  const { data: orgOverview } = useQuery({
    queryKey: ["dashboard-org-basic"],
    queryFn: async () => {
      const res = await axiosPrivate.get("/api/organization/overview");
      return res?.data?.data ?? res?.data ?? {};
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Derived: visitor stats ─────────────────────────────────────────────────
  const visitorStats = useMemo(() => {
    const todayStr = dayjs().format("YYYY-MM-DD");
    const todayVisitors = visitorsRaw.filter((v: any) => {
      const d = v.dateOfVisit || v.checkInTime || v.createdAt || "";
      return d && d.startsWith(todayStr);
    });
    const checkedIn = visitorsRaw.filter((v: any) => v.isCheckedIn || v.checkedIn || false).length;
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
      const d = new Date(v.dateOfVisit || v.checkInTime || v.createdAt || "");
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

  // ── Derived: lead stats ────────────────────────────────────────────────────
  const leadStats = useMemo(() => {
    const newLeads = leadsRaw.filter((l: any) => !l.isContacted && !l.contacted).length;
    const contacted = leadsRaw.filter((l: any) => l.isContacted || l.contacted).length;
    return { total: leadsRaw.length, newLeads, contacted };
  }, [leadsRaw]);

  const orgStats = useMemo(() => {
    const ov = orgOverview as any;
    return {
      members: ov?.totalMembers ?? ov?.memberCount ?? 0,
      departments: ov?.totalDepartments ?? ov?.departmentCount ?? 0,
    };
  }, [orgOverview]);

  // ── Visitor type donut ─────────────────────────────────────────────────────
  const visitorTypeDonut = useMemo(() => {
    const map: Record<string, number> = {};
    visitorsRaw.forEach((v: any) => {
      const type = v.visitorType || v.type || "Unknown";
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

  // ── Lead status donut ──────────────────────────────────────────────────────
  const leadDonutSeries = [leadStats.newLeads, leadStats.contacted];
  const leadDonutLabels = ["New Leads", "Contacted"];
  const leadDonutColors = ["#1E3D73", "#80bf01"];

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
        new Date(b.dateOfVisit || b.checkInTime || b.createdAt || 0).getTime() -
        new Date(a.dateOfVisit || a.checkInTime || a.createdAt || 0).getTime()
      )
      .slice(0, 5),
    [visitorsRaw],
  );

  // ── Quick links ────────────────────────────────────────────────────────────
  const quickLinks: QuickLinkItem[] = [
    { icon: Map, label: "Wono Nomad Listings", description: "Manage nomad space listings", route: "/company-settings/nomad-listings", color: "#059669" },
    { icon: Globe, label: "Website Builder", description: "Build & publish your site", route: "/company-settings/website-builder", color: "#7c3aed" },
    { icon: FileText, label: "Website Leads", description: "Manage incoming leads", route: "/company-settings/website-builder/leads", color: "#1E3D73" },
    { icon: Eye, label: "Visitor Management", description: "Log & track visitors", route: "/visitors/visitor-management", color: "#80bf01" },
    { icon: Users, label: "Organization", description: "Manage team & departments", route: "/company-settings/organization-management", color: "#0891b2" },
    { icon: LayoutGrid, label: "Access Grants", description: "Control role permissions", route: "/company-settings/access-grants", color: "#f59e0b" },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* Upgrade nudge — opens modal for Professional plan */}
      <div
        className="flex items-center gap-3 p-4 rounded-xl border-2 border-accent/30 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={onUpgradeClick}
      >
        <Zap size={18} className="text-accent flex-shrink-0" />
        <div>
          <p className="text-content font-pmedium text-blue-800">
            You're on the <strong>Basic Plan</strong> — Upgrade to{" "}
            <strong>Professional Plan</strong> for Meeting Room Bookings, Ticketing, Sales Modules & more.
          </p>
        </div>
        <span className="ml-auto flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-accent text-white border-accent whitespace-nowrap">
          Upgrade ↑
        </span>
        <ArrowRight size={14} className="text-accent flex-shrink-0" />
      </div>

      {/* Top stat cards */}
      <WidgetSection layout={4} title="Overview" border normalCase>
        <StatCard icon={Eye} label="Visitors Today" value={visitorStats.todayCount} sub={`${visitorStats.checkedIn} currently in`} color="#80bf01" route="/visitors/visitor-management" />
        <StatCard icon={UserPlus} label="Website Leads" value={leadStats.total} sub={`${leadStats.newLeads} new`} color="#1E3D73" route="/company-settings/website-builder/leads" />
        <StatCard icon={Users} label="Team Members" value={orgStats.members} sub={`${orgStats.departments} departments`} color="#0891b2" route="/company-settings/organization-management" />
        <StatCard icon={Eye} label="All-Time Visitors" value={visitorStats.totalCount} sub="Total logged visitors" color="#7c3aed" route="/visitors/visitor-management" />
      </WidgetSection>

      {/* Donuts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DonutWidget
          title="Visitor Types"
          series={visitorTypeDonut.series}
          labels={visitorTypeDonut.labels}
          colors={visitorTypeDonut.colors}
          centerLabel="Visitors"
          emptyText="No visitor data yet"
        />
        <DonutWidget
          title="Lead Status"
          series={leadDonutSeries}
          labels={leadDonutLabels}
          colors={leadDonutColors}
          centerLabel="Leads"
          emptyText="No leads yet"
        />
      </div>

      {/* Monthly visitor bar chart */}
      <div className="border-default border-borderGray rounded-xl overflow-hidden">
        <div className="p-4 border-b-2 border-borderGray uppercase">
          <span className="text-mobileTitle lg:text-widgetTitle text-primary font-pmedium">Monthly Visitor Trend (FY)</span>
        </div>
        <div className="p-2">
          <BarGraph
            chartId="basic-monthly-visitors"
            data={visitorsByMonth}
            options={visitorBarOptions}
            height={240}
          />
        </div>
      </div>

      {/* Recent visitors + recent leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Recent Visitors" linkLabel="View all" linkRoute="/visitors/visitor-management">
          {recentVisitors.length > 0 ? (
            recentVisitors.map((v: any, i: number) => (
              <RecentItem
                key={i}
                title={v.visitorName || v.name || v.fullName || "Visitor"}
                sub={v.visitorType || v.purpose || v.type || "—"}
                badge={v.isCheckedIn || v.checkedIn ? "Checked In" : v.checkOutTime ? "Checked Out" : "Logged"}
                badgeColor={statusBadgeColor(v.isCheckedIn || v.checkedIn ? "active" : "completed")}
                time={humanRelTime(v.dateOfVisit || v.checkInTime || v.createdAt)}
              />
            ))
          ) : (
            <p className="text-content text-gray-400 text-center py-6">No visitors logged yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Recent Leads" linkLabel="View all" linkRoute="/company-settings/website-builder/leads">
          {recentLeads.length > 0 ? (
            recentLeads.map((l: any, i: number) => (
              <RecentItem
                key={i}
                title={l.name || l.fullName || "Lead"}
                sub={l.email || l.phone || "—"}
                badge={l.isContacted || l.contacted ? "Contacted" : "New"}
                badgeColor={statusBadgeColor(l.isContacted || l.contacted ? "active" : "pending")}
                time={humanRelTime(l.createdAt)}
              />
            ))
          ) : (
            <p className="text-content text-gray-400 text-center py-6">No leads yet — publish your website to start receiving leads.</p>
          )}
        </SectionCard>
      </div>

      {/* Quick links */}
      <WidgetSection layout={3} title="Quick Links" border normalCase>
        {quickLinks.map((ql, i) => <QuickLink key={i} {...ql} />)}
      </WidgetSection>

    </div>
  );
};

export default BasicDashboard;
