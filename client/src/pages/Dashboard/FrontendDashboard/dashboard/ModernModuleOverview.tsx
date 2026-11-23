/**
 * ModernModuleOverview — the new visual-language replacement for the legacy
 * ModuleAccessDashboard overview. It renders verified module data with
 * MetricTile / QuickActionTile / ActivityPanel / InsightDonutChart, matching
 * every other role dashboard.
 *
 * Two modes:
 *  - default: "everything else granted to you" — common/personal modules that
 *    aren't scoped to any assigned department.
 *  - scopeDepartmentId: only the modules belonging to one (custom) department.
 */
import { useMemo } from "react";
import { Activity, LayoutGrid } from "lucide-react";
import {
  ActivityPanel,
  MetricTile,
  QuickActionTile,
} from "./DashboardShared";
import InsightDonutChart from "./InsightDonutChart";
import { ICON_BY_ID, DEFAULT_SECTION_ROUTES } from "../ModuleCardsLanding";
import { useModuleStats } from "./moduleStatProviders";
import type {
  RoleBand,
  WorkspaceModuleSection,
} from "../../../../hooks/useDashboardAccess";
import type { QuickLinkItem } from "./DashboardShared";

interface ModernModuleOverviewProps {
  moduleMap: { sections: WorkspaceModuleSection[] };
  grantedModuleIds: Set<string>;
  roleBand: RoleBand;
  departments: { id: string; name: string; moduleIds: string[] }[];
  /** When set, render only this department's modules instead of common ones. */
  scopeDepartmentId?: string;
  /** Eyebrow/title for the metrics panel. */
  eyebrow?: string;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ModernModuleOverview({
  moduleMap,
  grantedModuleIds,
  departments,
  scopeDepartmentId,
  eyebrow = "Personal",
  title = "Your Overview",
  emptyTitle = "No modules assigned",
  emptyDescription = "Modules granted to you will appear here.",
}: ModernModuleOverviewProps) {
  const sections = Array.isArray(moduleMap?.sections) ? moduleMap.sections : [];

  const { cards: statCards, charts } = useModuleStats(grantedModuleIds);

  const allDepartmentModuleIds = useMemo(
    () => new Set(departments.flatMap((dept) => dept.moduleIds)),
    [departments],
  );

  const scopedDepartment = scopeDepartmentId
    ? departments.find((dept) => dept.id === scopeDepartmentId)
    : undefined;
  const scopedModuleIds = useMemo(
    () => new Set(scopedDepartment?.moduleIds || []),
    [scopedDepartment],
  );

  const includeModule = (moduleId: string) =>
    scopeDepartmentId
      ? scopedModuleIds.has(moduleId)
      : !allDepartmentModuleIds.has(moduleId);

  const visibleStatCards = useMemo(
    () => statCards.filter((card) => includeModule(card.moduleId)),
    [statCards, scopeDepartmentId, scopedModuleIds, allDepartmentModuleIds],
  );

  const visibleCharts = useMemo(
    () => charts.filter((chart) => includeModule(chart.moduleId)),
    [charts, scopeDepartmentId, scopedModuleIds, allDepartmentModuleIds],
  );

  const visibleLinks = useMemo(() => {
    const sourceSections = scopeDepartmentId
      ? sections
      : sections.filter(
          (section) =>
            section.sectionId === "common-modules" ||
            section.sectionId === "extra-common-modules",
        );

    const links: QuickLinkItem[] = [];
    const seenRoutes = new Set<string>();

    for (const section of sourceSections) {
      for (const item of section.items || []) {
        if (item.isGroup || item.id === "attendance") continue;
        if (!grantedModuleIds.has(item.id)) continue;
        if (!includeModule(item.id)) continue;
        const route = DEFAULT_SECTION_ROUTES[item.id];
        if (!route || seenRoutes.has(route)) continue;
        seenRoutes.add(route);
        links.push({
          icon: ICON_BY_ID[item.id] || LayoutGrid,
          label: item.label || item.id,
          description: route.replace(/^\//, "").replace(/[-/]/g, " "),
          route,
          color: "#1E3D73",
        });
      }
    }

    return links;
  }, [
    sections,
    grantedModuleIds,
    scopeDepartmentId,
    scopedModuleIds,
    allDepartmentModuleIds,
  ]);

  const isEmpty =
    visibleStatCards.length === 0 &&
    visibleLinks.length === 0 &&
    visibleCharts.length === 0;

  if (isEmpty) {
    return (
      <ActivityPanel eyebrow={eyebrow} title={title}>
        <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
            <LayoutGrid size={20} />
          </div>
          <p className="mt-2 text-sm font-pmedium text-[#1E3D73]">{emptyTitle}</p>
          <p className="max-w-xs text-[11px] font-pmedium leading-relaxed text-slate-500">
            {emptyDescription}
          </p>
        </div>
      </ActivityPanel>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {visibleStatCards.length > 0 && (
        <section className="rounded-[1.75rem] border border-blue-100 bg-[#F8FAFD] p-5 shadow-[0_12px_34px_rgba(30,61,115,0.06)] sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E3D73] text-white shadow-sm">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
                {eyebrow}
              </p>
              <h3 className="mt-0.5 text-lg font-pmedium text-[#1E3D73]">{title}</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {visibleStatCards.map((card, index) => (
              <MetricTile
                key={`${card.moduleId}-${index}`}
                icon={card.icon}
                label={card.label}
                value={card.value}
                sub={card.sub}
                route={card.route}
                color={card.color}
              />
            ))}
          </div>
        </section>
      )}

      {visibleLinks.length > 0 && (
        <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 shadow-[0_12px_34px_rgba(37,99,235,0.08)] sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70" />
          <div className="relative mb-5">
            <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
              Jump back in
            </p>
            <h3 className="mt-1 text-lg font-pmedium text-[#1E3D73]">
              {scopeDepartmentId ? "Department Modules" : "Your Modules"}
            </h3>
            <p className="mt-1 text-xs font-pmedium text-slate-500">
              {scopeDepartmentId
                ? "The modules granted to this department, one click away."
                : "Everything else granted to you, one click away."}
            </p>
          </div>
          <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleLinks.map((link) => (
              <QuickActionTile
                key={link.route}
                icon={link.icon}
                label={link.label}
                description={link.description}
                route={link.route}
              />
            ))}
          </div>
        </section>
      )}

      {visibleCharts.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {visibleCharts.map((chart) => (
            <ActivityPanel
              key={chart.moduleId}
              eyebrow="Breakdown"
              title={chart.title}
            >
              <div className="flex min-h-48 flex-1 items-center justify-center">
                {chart.series.some((value) => value > 0) ? (
                  <InsightDonutChart
                    centerLabel={chart.centerLabel}
                    labels={chart.labels}
                    colors={chart.colors}
                    series={chart.series}
                    tooltipValue={chart.series.map(String)}
                  />
                ) : (
                  <p className="text-content font-pmedium text-slate-400">
                    No data yet
                  </p>
                )}
              </div>
            </ActivityPanel>
          ))}
        </div>
      )}
    </div>
  );
}

export default ModernModuleOverview;
