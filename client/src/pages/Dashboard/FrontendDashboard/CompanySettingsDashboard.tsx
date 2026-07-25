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
import PlanDashboardSkeleton from "./dashboard/PlanDashboardSkeleton";
import { UpgradePlanModal } from "./ModuleCardsLanding";
import { Building2, Clock } from "lucide-react";

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

  const founderName = useMemo(() => {
    const user = (auth?.user || {}) as { firstName?: string; lastName?: string; name?: string };
    const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return full || user.name || "Founder";
  }, [auth?.user]);

  const greeting = `${getGreeting(now.getHours())}, ${founderName}`;
  const todayLabel = now.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const isCompanySettings = location.pathname.startsWith("/company-settings");
  const pageTitle = isCompanySettings ? "Company Settings" : "Dashboard";

  // Custom plan has no upgrade path
  const canUpgrade = access.plan !== "custom";

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
              <button
                type="button"
                onClick={canUpgrade ? () => setShowUpgradeModal(true) : undefined}
                className={canUpgrade ? "cursor-pointer" : "cursor-default"}
                title={canUpgrade ? "Click to upgrade your plan" : undefined}
              >
                <PlanBadge plan={access.plan} clickable={canUpgrade} />
              </button>
            </div>
            <p className="text-subtitle font-pmedium text-gray-700">{greeting} 👋</p>
            <p className="text-content text-gray-400">{todayLabel}</p>
          </div>

          <div className="mt-1 sm:mt-0">
            <WorkspaceClock workspaceName={access.workspaceName} timezone={workspacePreferences.timezone} />
          </div>
        </div>
      </PageFrame>

      {/* Plan-tier dashboard */}
      {access.plan === "basic" && (
        <BasicDashboard onUpgradeClick={() => setShowUpgradeModal(true)} />
      )}
      {access.plan === "professional" && (
        <ProfessionalDashboard onUpgradeClick={() => setShowUpgradeModal(true)} />
      )}
      {access.plan === "custom" && <CustomDashboard access={access} />}

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
