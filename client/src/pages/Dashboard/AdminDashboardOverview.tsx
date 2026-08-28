/**
 * AdminDashboardOverview — shown to members with roleBand "admin" who don't
 * match any of the 7 named department dashboards (HR/Administration/Sales/
 * Finance/Maintenance/Tech/IT). Previously these users fell through silently
 * to the generic CompanySettingsDashboard/ModuleAccessDashboard path with no
 * admin-specific greeting.
 *
 * Content is identical in spirit to that fallback — cards/charts/quick links
 * are built per assigned department via ModuleAccessDashboard, which is
 * already granted-module-driven — this page just gives that same content a
 * proper admin-branded header, consistent with EmployeeDashboardOverview.
 */
import { useEffect, useMemo, useState, type ComponentType } from "react";
import PageFrame from "@/components/Pages/PageFrame";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { useFreshCurrentUser } from "@/hooks/useFreshCurrentUser";
import { PlanBadge, getGreeting } from "@/pages/Dashboard/FrontendDashboard/dashboard/DashboardShared";
import { DashboardAttendanceCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/TodayAttendanceCard";
import ModuleAccessDashboard from "@/pages/Dashboard/FrontendDashboard/dashboard/ModuleAccessDashboard";
import { matchDepartmentSlug, type DeptSlug } from "@/lib/departmentSlug";
import { HRDashboardWidgets } from "@/pages/HR/HRDashboardOverview";
import { AdministrationDashboardWidgets } from "@/pages/Administration/AdministrationDashboardOverview";
import { SalesDashboardWidgets } from "@/pages/Sales/SalesDashboardOverview";
import { FinanceDashboardWidgets } from "@/pages/Finance/FinanceDashboardOverview";
import { MaintenanceDashboardWidgets } from "@/pages/Maintenance/MaintenanceDashboardOverview";
import { TechDashboardWidgets } from "@/pages/Tech/TechDashboardOverview";
import { ITDashboardWidgets } from "@/pages/IT/ITDashboardOverview";

const RICH_WIDGETS_BY_SLUG: Record<DeptSlug, ComponentType> = {
  hr: HRDashboardWidgets,
  administration: AdministrationDashboardWidgets,
  sales: SalesDashboardWidgets,
  finance: FinanceDashboardWidgets,
  maintenance: MaintenanceDashboardWidgets,
  tech: TechDashboardWidgets,
  it: ITDashboardWidgets,
};

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

export function AdminDashboardOverview() {
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

  const adminName = useMemo(() => {
    const full = `${(currentUser as any)?.firstName || ""} ${(currentUser as any)?.lastName || ""}`.trim();
    return full || (currentUser as any)?.fullName || (currentUser as any)?.name || (currentUser as any)?.displayName || "there";
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
        greeting: `${getGreeting(Number.isFinite(workspaceHour) ? workspaceHour : now.getHours())}, ${adminName}`,
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
        greeting: `${getGreeting(now.getHours())}, ${adminName}`,
        todayLabel: now.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      };
    }
  }, [adminName, now, workspacePreferences.timezone]);

  const { richDepartments, otherDepartments } = useMemo(() => {
    const rich: { id: string; name: string; slug: DeptSlug }[] = [];
    const other: typeof access.departments = [];
    for (const dept of access.departments) {
      const slug = matchDepartmentSlug(dept.name);
      if (slug) rich.push({ id: dept.id, name: dept.name, slug });
      else other.push(dept);
    }
    return { richDepartments: rich, otherDepartments: other };
  }, [access.departments]);

  return (
    <div className="p-4 flex flex-col gap-5">

      {/* Greeting banner */}
      <PageFrame>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-title font-pmedium text-primary uppercase">Admin Dashboard</h2>
              <PlanBadge plan={access.plan} />
            </div>
            <p className="text-subtitle font-pmedium text-gray-700">{greeting} 👋</p>
            <p className="text-content font-pmedium text-gray-700">{todayLabel}<WorkspaceClock timezone={workspacePreferences.timezone} location={workspacePreferences.location} /></p>
          </div>
        </div>
      </PageFrame>

      <DashboardAttendanceCard />

      {/* Real department dashboards (stat cards, donuts, trend charts) for
          each of the 7 named departments this admin is assigned to */}
      {richDepartments.map((dept) => {
        const Widgets = RICH_WIDGETS_BY_SLUG[dept.slug];
        return (
          <div key={dept.id} className="flex flex-col gap-3">
            <h3 className="text-content font-pmedium text-slate-700 uppercase tracking-wide">{dept.name}</h3>
            <Widgets />
          </div>
        );
      })}

      {/* Granted-module-driven cards/charts/quick links for any assigned
          department that isn't one of the 7 named ones (custom departments) */}
      <ModuleAccessDashboard
        moduleMap={access.moduleMap}
        grantedModuleIds={access.grantedModuleIds}
        roleBand={access.roleBand}
        departments={otherDepartments}
        showAttendanceCard={false}
      />
    </div>
  );
}

export default AdminDashboardOverview;
