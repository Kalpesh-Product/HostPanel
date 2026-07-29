/**
 * ModuleAccessDashboard — dashboard for every role except owner/super_admin.
 *
 * Purely data-driven: renders one overview per department the member is
 * assigned to / manages (admin can have several, a department manager has
 * one, an employee has none), scoped to real stat cards + quick links +
 * a chart where real data supports it — mirroring the founder dashboards'
 * own layout (overview → quick links → charts) but built from the member's
 * actual grant instead of hardcoded per-role content.
 *
 * Department resolution is moduleIds-driven (department.moduleIds ∩
 * grantedModuleIds, resolved against the full module catalog), not keyed
 * off department name — so a brand-new (including custom) department shows
 * up automatically with no code change.
 */
import { useMemo } from "react";
import { LayoutGrid } from "lucide-react";
import WidgetSection from "../../../../components/WidgetSection";
import { StatCard, QuickLink, DonutWidget } from "./DashboardShared";
import type { QuickLinkItem } from "./DashboardShared";
import { ICON_BY_ID, DEFAULT_SECTION_ROUTES } from "../ModuleCardsLanding";
import TodayAttendanceCard from "./TodayAttendanceCard";
import { useModuleStats } from "./moduleStatProviders";
import type { RoleBand, WorkspaceModuleSection } from "../../../../hooks/useDashboardAccess";

const DEFAULT_COLOR = "#1E3D73";

interface ModuleAccessDashboardProps {
  moduleMap: { sections: WorkspaceModuleSection[] };
  grantedModuleIds: Set<string>;
  roleBand: RoleBand;
  departments: { id: string; name: string; moduleIds: string[] }[];
}

const toQuickLink = (id: string, label: string): QuickLinkItem | null => {
  const route = DEFAULT_SECTION_ROUTES[id];
  if (!route) return null;
  const icon = ICON_BY_ID[id] || LayoutGrid;
  return { icon, label, description: route.replace(/^\//, "").replace(/[-/]/g, " "), route, color: DEFAULT_COLOR };
};

const ModuleAccessDashboard = ({ moduleMap, grantedModuleIds, departments }: ModuleAccessDashboardProps) => {
  const sections = Array.isArray(moduleMap?.sections) ? moduleMap.sections : [];

  // Flattened id -> label, walking every section/tab so any module in the
  // catalog (not just the 7 static department groups) resolves correctly.
  const flatModuleLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const section of sections) {
      for (const item of section.items || []) {
        if (Array.isArray(item.tabs) && item.tabs.length) {
          for (const tab of item.tabs) map.set(tab.id, tab.label || tab.id);
        } else {
          map.set(item.id, item.label || item.id);
        }
      }
    }
    return map;
  }, [sections]);

  const { cards: statCards, charts, isLoading: isStatsLoading } = useModuleStats(grantedModuleIds);

  const allDeptModuleIds = useMemo(
    () => new Set(departments.flatMap((d) => d.moduleIds)),
    [departments],
  );

  const departmentSections = departments
    .map((dept) => {
      const grantedDeptModuleIds = dept.moduleIds.filter((id) => grantedModuleIds.has(id));
      const links = grantedDeptModuleIds
        .map((id) => toQuickLink(id, flatModuleLabels.get(id) || id))
        .filter((link): link is QuickLinkItem => Boolean(link));
      const deptStatCards = statCards.filter((c) => dept.moduleIds.includes(c.moduleId));
      const deptCharts = charts.filter((c) => dept.moduleIds.includes(c.moduleId));
      if (links.length === 0 && deptStatCards.length === 0) return null;
      return { name: dept.name, links, statCards: deptStatCards, charts: deptCharts };
    })
    .filter((group): group is { name: string; links: QuickLinkItem[]; statCards: typeof statCards; charts: typeof charts } => Boolean(group));

  const commonSections = sections.filter(
    (s) => s.sectionId === "common-modules" || s.sectionId === "extra-common-modules",
  );
  const commonLinks = commonSections
    .flatMap((s) => s.items || [])
    .filter((item) => !item.isGroup && item.id !== "attendance" && grantedModuleIds.has(item.id))
    .map((item) => toQuickLink(item.id, item.label || item.id))
    .filter((link): link is QuickLinkItem => Boolean(link));
  const seenRoutes = new Set<string>();
  const dedupedCommonLinks = commonLinks.filter((link) => {
    if (seenRoutes.has(link.route)) return false;
    seenRoutes.add(link.route);
    return true;
  });
  const commonStatCards = statCards.filter((c) => !allDeptModuleIds.has(c.moduleId));

  const showAttendanceCard = grantedModuleIds.has("attendance");
  const isEmpty = departmentSections.length === 0 && dedupedCommonLinks.length === 0 && commonStatCards.length === 0 && !showAttendanceCard;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-borderGray bg-white p-12 text-center">
        <LayoutGrid size={28} className="text-gray-300" />
        <p className="text-content font-pmedium text-gray-500">No modules assigned yet</p>
        <p className="text-small text-gray-400">Contact your admin to get access to your modules.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {showAttendanceCard && <TodayAttendanceCard />}

      {departmentSections.map((group) => (
        <div key={group.name} className="flex flex-col gap-4">
          {group.statCards.length > 0 && (
            <WidgetSection layout={Math.min(group.statCards.length, 4) as 1 | 2 | 3 | 4} title={`${group.name} Overview`} border normalCase>
              {group.statCards.map((c, i) => (
                <StatCard key={i} icon={c.icon} label={c.label} value={c.value} sub={c.sub} color={c.color} route={c.route} />
              ))}
            </WidgetSection>
          )}
          {group.links.length > 0 && (
            <WidgetSection layout={4} title={`${group.name} Modules`} border normalCase>
              {group.links.map((link, i) => (
                <QuickLink key={i} {...link} />
              ))}
            </WidgetSection>
          )}
          {group.charts.map((chart) => (
            <div key={chart.moduleId} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DonutWidget title={chart.title} series={chart.series} labels={chart.labels} colors={chart.colors} centerLabel={chart.centerLabel} />
            </div>
          ))}
        </div>
      ))}

      {(commonStatCards.length > 0 || dedupedCommonLinks.length > 0) && (
        <div className="flex flex-col gap-4">
          {commonStatCards.length > 0 && (
            <WidgetSection layout={Math.min(commonStatCards.length, 4) as 1 | 2 | 3 | 4} title="Your Overview" border normalCase>
              {commonStatCards.map((c, i) => (
                <StatCard key={i} icon={c.icon} label={c.label} value={c.value} sub={c.sub} color={c.color} route={c.route} />
              ))}
            </WidgetSection>
          )}
          {dedupedCommonLinks.length > 0 && (
            <WidgetSection layout={4} title="Your Modules" border normalCase>
              {dedupedCommonLinks.map((link, i) => (
                <QuickLink key={i} {...link} />
              ))}
            </WidgetSection>
          )}
        </div>
      )}

      {isStatsLoading && statCards.length === 0 && (
        <div className="h-16 rounded-xl border border-borderGray bg-white animate-pulse" />
      )}
    </div>
  );
};

export default ModuleAccessDashboard;
