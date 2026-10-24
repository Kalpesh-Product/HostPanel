/**
 * CompanySettingsDashboard — main dashboard orchestrator (/dashboard index).
 * Picks the correct plan-tier dashboard and wires up the upgrade-plan modal.
 */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PageFrame from "../../../components/Pages/PageFrame";
import useAuth from "../../../hooks/useAuth";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
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
  const isFounderOrSuperAdmin = access.roleBand === "owner" || access.roleBand === "super_admin";
  const workspacePreferences = useWorkspacePreferences();
  const axiosPrivate = useAxiosPrivate();
  const [now, setNow] = useState(new Date());
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);

  // Drives the free-trial day-count callout below the greeting banner's plan
  // badge — this dashboard is where founders actually land, so the trial
  // status belongs here rather than tucked away in Company Profile.
  const { data: planSummary } = useQuery({
    queryKey: ["planBillingSummary"],
    queryFn: async () => {
      const res = await axiosPrivate.get("/api/plan-billing/summary");
      return res?.data?.data;
    },
  });
  const trialDaysLeft = (() => {
    if (!planSummary?.isTrialing || !planSummary?.trialEndAt) return null;
    const diffMs = new Date(planSummary.trialEndAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  })();

  const downgradedPlanLabel =
    String(planSummary?.purchasedPlan || "").toLowerCase() === "custom"
      ? "Custom"
      : String(planSummary?.purchasedPlan || "").toLowerCase() === "professional"
        ? "Professional"
        : "Paid";

  const downgradeAcknowledgementKey = useMemo(() => {
    if (planSummary?.planStatus !== "expired_downgraded") return "";
    const user = (auth?.user || {}) as { _id?: string; id?: string; email?: string };
    const userId = String(user._id || user.id || user.email || "").trim().toLowerCase();
    if (!userId) return "";
    const companyId = String(planSummary?.companyId || "workspace");
    const expiryDate = String(planSummary?.planExpiryDate || "expired").slice(0, 10);
    return `hostpanel_plan_downgrade_acknowledged:${companyId}:${userId}:${expiryDate}`;
  }, [auth?.user, planSummary?.companyId, planSummary?.planExpiryDate, planSummary?.planStatus]);

  useEffect(() => {
    if (!isFounderOrSuperAdmin) return;
    if (planSummary?.planStatus !== "expired_downgraded") return;
    if (!downgradeAcknowledgementKey) return;
    try {
      if (localStorage.getItem(downgradeAcknowledgementKey) === "1") return;
    } catch {
      // If storage is unavailable, still show the important downgrade notice.
    }
    setShowDowngradeModal(true);
  }, [downgradeAcknowledgementKey, isFounderOrSuperAdmin, planSummary?.planStatus]);

  const acknowledgeDowngradeModal = () => {
    try {
      if (downgradeAcknowledgementKey) {
        localStorage.setItem(downgradeAcknowledgementKey, "1");
      }
    } catch {
      // Closing still works when browser storage is unavailable.
    }
    setShowDowngradeModal(false);
  };

  const openUpgradeModal = () => {
    setShowUpgradeModal(true);
  };

  const closeUpgradeModal = () => {
    setShowUpgradeModal(false);
  };

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
              <h2 className="inline-flex items-center text-title font-pmedium text-primary uppercase">
                {pageTitle}
              </h2>
              {isFounderOrSuperAdmin && (
                <button
                  type="button"
                  onClick={canUpgrade ? () => openUpgradeModal() : undefined}
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
              onUpgradeClick={() => openUpgradeModal()}
              isExpiredDowngrade={planSummary?.planStatus === "expired_downgraded"}
              downgradedPlanLabel={downgradedPlanLabel}
              activeMembers={access.metrics.activeMembers}
              totalMembers={access.metrics.totalMembers}
              moduleMap={access.moduleMap}
              grantedModuleIds={access.grantedModuleIds}
              enabledModuleIds={access.enabledModuleIds}
            />
          )}
          {access.plan === "professional" && (
            <ProfessionalDashboard
              onUpgradeClick={() => openUpgradeModal()}
              enabledModuleIds={access.enabledModuleIds}
              grantedModuleIds={access.grantedModuleIds}
              trialDaysLeft={trialDaysLeft}
              isTrialExpiringSoon={planSummary?.planStatus === "expiring_soon"}
            />
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
          onClose={closeUpgradeModal}
        />
      )}

      {isFounderOrSuperAdmin && showDowngradeModal && planSummary?.planStatus === "expired_downgraded" && (
        <div className="fixed inset-0 z-[1350] flex items-center justify-center bg-[#0f172a]/45 px-4 py-6 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-downgraded-title"
            className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-blue-200 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.32)]"
          >
            <div className="bg-gradient-to-br from-[#1E3D73] via-[#2563EB] to-[#60A5FA] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30">
                    <AlertTriangle size={23} />
                  </div>
                  <div>
                    <p className="text-[10px] font-pmedium uppercase tracking-[0.2em] text-white/80">
                      Plan update
                    </p>
                    <h2 id="plan-downgraded-title" className="mt-1 text-xl font-pmedium">
                      Your {downgradedPlanLabel} Plan expired
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={acknowledgeDowngradeModal}
                  aria-label="Close plan expiry notice"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-center">
                <p className="text-[10px] font-pmedium uppercase tracking-[0.18em] text-[#2563EB]">
                  Your unit is now on
                </p>
                <p className="mt-1 text-2xl font-pmedium text-slate-900">Basic Plan</p>
                <p className="mt-2 text-sm font-pmedium text-slate-600">
                  Paid modules are paused. Your data and setup are safe.
                </p>
              </div>

              <p className="mt-4 text-center text-sm font-pmedium text-slate-700">
                Upgrade now to regain paid-module access and keep your team moving.
              </p>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={acknowledgeDowngradeModal}
                  className="rounded-full border border-slate-200 px-4 py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-slate-600 transition hover:bg-slate-50"
                >
                  Continue on Basic
                </button>
                <button
                  type="button"
                  onClick={() => {
                    acknowledgeDowngradeModal();
                    openUpgradeModal();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2563EB] px-4 py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
                >
                  Upgrade Now
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CompanySettingsDashboard;
