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
import { useEffect, useMemo, useState } from "react";
import { Building2, Clock } from "lucide-react";
import PageFrame from "@/components/Pages/PageFrame";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { useFreshCurrentUser } from "@/hooks/useFreshCurrentUser";
import { PlanBadge, getGreeting } from "@/pages/Dashboard/FrontendDashboard/dashboard/DashboardShared";
import { DashboardAttendanceCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/TodayAttendanceCard";
import ModuleAccessDashboard from "@/pages/Dashboard/FrontendDashboard/dashboard/ModuleAccessDashboard";

const WorkspaceClock = ({ workspaceName, timezone }: { workspaceName: string; timezone: string }) => {
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

  if (!workspaceName && !timeLabel) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
      {workspaceName && (
        <span className="flex items-center gap-1.5 text-small font-pmedium text-slate-600">
          <Building2 size={13} />
          {workspaceName}
        </span>
      )}
      {workspaceName && timeLabel && <span className="h-3.5 w-px bg-slate-300" />}
      {timeLabel && (
        <span className="flex items-center gap-1.5 text-small font-pmedium text-slate-600 tabular-nums">
          <Clock size={13} />
          {timeLabel}
        </span>
      )}
    </div>
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
            <p className="text-content font-pmedium text-gray-700">{todayLabel}</p>
          </div>

          <div className="mt-1 sm:mt-0">
            <WorkspaceClock workspaceName={access.workspaceName} timezone={workspacePreferences.timezone} />
          </div>
        </div>
      </PageFrame>

      <DashboardAttendanceCard />

      {/* Cards/charts/quick links, built per department this admin is assigned to */}
      <ModuleAccessDashboard
        moduleMap={access.moduleMap}
        grantedModuleIds={access.grantedModuleIds}
        roleBand={access.roleBand}
        departments={access.departments}
      />
    </div>
  );
}

export default AdminDashboardOverview;
