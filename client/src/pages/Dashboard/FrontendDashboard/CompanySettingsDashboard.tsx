/**
 * CompanySettingsDashboard — main dashboard orchestrator (/dashboard index).
 * Picks the correct plan-tier dashboard and wires up the upgrade-plan modal.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PageFrame from "../../../components/Pages/PageFrame";
import useAuth from "../../../hooks/useAuth";
import useDashboardAccess from "../../../hooks/useDashboardAccess";
import { PlanBadge } from "./dashboard/DashboardShared";
import { getGreeting } from "./dashboard/dashboardUtils";
import BasicDashboard from "./dashboard/BasicDashboard";
import ProfessionalDashboard from "./dashboard/ProfessionalDashboard";
import CustomDashboard from "./dashboard/CustomDashboard";
import PlanDashboardSkeleton from "./dashboard/PlanDashboardSkeleton";
import { UpgradePlanModal } from "./ModuleCardsLanding";
import { CheckCircle2, CalendarCheck, AlertCircle, Building2 } from "lucide-react";

const CompanySettingsDashboard = () => {
  const { auth } = useAuth();
  const location = useLocation();
  const access = useDashboardAccess();
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
              {access.workspaceName && (
                <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-small font-pmedium text-slate-600">
                  <Building2 size={13} />
                  {access.workspaceName}
                </span>
              )}
            </div>
            <p className="text-subtitle font-pmedium text-gray-700">{greeting} 👋</p>
            <p className="text-content text-gray-400">{todayLabel}</p>
          </div>

          {/* Live status chips */}
          {access.plan !== "basic" && (
            <div className="flex flex-wrap gap-2 mt-1 sm:mt-0">
              {access.hasModule("tenant-companies-admin") && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <CheckCircle2 size={13} />
                  <span className="text-small font-pmedium">Tenants Active</span>
                </div>
              )}
              {access.hasModule("meeting-room-system") && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700">
                  <CalendarCheck size={13} />
                  <span className="text-small font-pmedium">Bookings Active</span>
                </div>
              )}
              {access.hasModule("tickets") && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                  <AlertCircle size={13} />
                  <span className="text-small font-pmedium">Tickets Active</span>
                </div>
              )}
            </div>
          )}
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
