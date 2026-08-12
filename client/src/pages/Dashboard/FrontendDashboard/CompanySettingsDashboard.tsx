/**
 * CompanySettingsDashboard — main dashboard orchestrator (/dashboard index).
 * Picks the correct plan-tier dashboard and wires up the upgrade-plan modal.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PageFrame from "../../../components/Pages/PageFrame";
import useAuth from "../../../hooks/useAuth";
import useDashboardAccess from "../../../hooks/useDashboardAccess";
import useWorkspacePreferences from "../../../hooks/useWorkspacePreferences";
import { PlanBadge } from "./dashboard/DashboardShared";
import { getGreeting } from "./dashboard/dashboardUtils";
import BasicDashboard from "./dashboard/BasicDashboard";
import ProfessionalDashboard from "./dashboard/ProfessionalDashboard";
import CustomDashboard from "./dashboard/CustomDashboard";
import ModuleAccessDashboard from "./dashboard/ModuleAccessDashboard";
import PlanDashboardSkeleton from "./dashboard/PlanDashboardSkeleton";
import { UpgradePlanModal } from "./ModuleCardsLanding";

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

  return <>{` | ${timeLabel}`}{location ? ` - ${location}` : ""}</>;
};

const DEFAULT_WORKSPACE_DEPARTMENT_NAMES = new Set([
  "hr",
  "administration",
  "sales",
  "finance",
  "maintenance",
  "technology",
  "it",
]);
const CompanySettingsDashboard = () => {
  const { auth } = useAuth();
  const location = useLocation();
  const access = useDashboardAccess();
  const workspacePreferences = useWorkspacePreferences();
  const [now, setNow] = useState(new Date());
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setNow(new Date());
  }, [workspacePreferences.timezone, access.workspaceName]);

  const founderName = useMemo(() => {
    const user = (auth?.user || {}) as { firstName?: string; lastName?: string; name?: string };
    const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return full || user.name || "Founder";
  }, [auth?.user]);

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
        greeting: `${getGreeting(Number.isFinite(workspaceHour) ? workspaceHour : now.getHours())}, ${founderName}`,
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
        greeting: `${getGreeting(now.getHours())}, ${founderName}`,
        todayLabel: now.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      };
    }
  }, [founderName, now, workspacePreferences.timezone]);

  const isCompanySettings = location.pathname.startsWith("/company-settings");
  const pageTitle = isCompanySettings ? "Company Settings" : "Dashboard";

  // Only founder/super_admin see the plan-tier dashboard and the upgrade nudge.
  const isFounderOrSuperAdmin = access.roleBand === "owner" || access.roleBand === "super_admin";
  const customDepartments = useMemo(
    () =>
      access.departments.filter(
        (department) =>
          !DEFAULT_WORKSPACE_DEPARTMENT_NAMES.has(
            String(department.name || "").trim().toLowerCase(),
          ),
      ),
    [access.departments],
  );
  const customDepartmentGrantedModuleIds = useMemo(
    () =>
      new Set([
        ...access.grantedModuleIds,
        ...customDepartments.flatMap((department) => department.moduleIds),
      ]),
    [access.grantedModuleIds, customDepartments],
  );
  // Custom plan has no upgrade path
  const canUpgrade = isFounderOrSuperAdmin && access.plan !== "custom";

  if (access.isLoading) {
    return <PlanDashboardSkeleton plan={access.plan === "professional" ? "professional" : "basic"} includeHeader />;
  }

  return (
    <div className="p-4 flex flex-col gap-5">

      {/* Greeting banner */}
      <PageFrame>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-title font-pmedium text-primary uppercase">{pageTitle}</h2>
              {isFounderOrSuperAdmin && (
                <button
                  type="button"
                  onClick={canUpgrade ? () => setShowUpgradeModal(true) : undefined}
                  className={canUpgrade ? "cursor-pointer" : "cursor-default"}
                  title={canUpgrade ? "Click to upgrade your plan" : undefined}
                >
                  <PlanBadge plan={access.plan} clickable={canUpgrade} />
                </button>
              )}
            </div>
            <p className="text-subtitle font-pmedium text-gray-700">{greeting} 👋</p>
            <p className="text-content font-pmedium text-gray-700">{todayLabel}<WorkspaceClock timezone={workspacePreferences.timezone} location={workspacePreferences.location} /></p>
          </div>
        </div>
      </PageFrame>

      {/* Founder/Super Admin: plan-tier dashboard. Everyone else: their own granted modules. */}
      {isFounderOrSuperAdmin ? (
        <>
          {access.plan === "basic" && (
            <BasicDashboard
              onUpgradeClick={() => setShowUpgradeModal(true)}
              activeMembers={access.metrics.activeMembers}
              totalMembers={access.metrics.totalMembers}
            />
          )}
          {access.plan === "professional" && (
            <ProfessionalDashboard onUpgradeClick={() => setShowUpgradeModal(true)} />
          )}
          {access.plan === "custom" && <CustomDashboard access={access} />}
          {access.plan !== "basic" && customDepartments.length > 0 && (
            <ModuleAccessDashboard
              moduleMap={access.moduleMap}
              grantedModuleIds={customDepartmentGrantedModuleIds}
              roleBand={access.roleBand}
              departments={customDepartments}
              showCommonModules={false}
            />
          )}
        </>
      ) : (
        <ModuleAccessDashboard
          moduleMap={access.moduleMap}
          grantedModuleIds={access.grantedModuleIds}
          roleBand={access.roleBand}
          departments={access.departments}
        />
      )}

      {/* Upgrade plan modal */}
      {showUpgradeModal && canUpgrade && (
        <UpgradePlanModal
          currentPlan={access.plan}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

    </div>
  );
};

export default CompanySettingsDashboard;
