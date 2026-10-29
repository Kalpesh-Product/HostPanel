/**
 * CompanySettingsDashboard — main dashboard orchestrator (/dashboard index).
 * Picks the correct plan-tier dashboard and wires up the upgrade-plan modal.
 */
import { useEffect, useMemo, useState } from "react";
import { LayoutDashboard } from "lucide-react";
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
  const workspacePreferences = useWorkspacePreferences();
  const axiosPrivate = useAxiosPrivate();
  const [now, setNow] = useState(new Date());
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
  const isBasicDashboardHome = !isCompanySettings && isFounderOrSuperAdmin && access.plan === "basic";
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

      {/* Basic gets a distinct dashboard masthead; other plans/routes keep the shared header. */}
      {isBasicDashboardHome ? (
        <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 shadow-[0_12px_34px_rgba(37,99,235,0.08)] sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70" />
          <div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-blue-50/70" />
          <div className="relative">
            <div className="flex min-w-0 items-start gap-4">
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] ring-1 ring-blue-100 sm:flex">
                <LayoutDashboard size={21} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[9px] font-pmedium uppercase tracking-[0.22em] text-[#2563EB]">Unit dashboard</p>
                  <span className="rounded-full border border-blue-100 bg-white px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-widest text-[#2563EB] shadow-sm">
                    Basic Plan
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-pmedium text-[#1E3D73] sm:text-2xl">{greeting} 👋</h2>
                <p className="mt-1 text-xs font-pmedium text-slate-500 sm:text-sm">
                  {todayLabel}<WorkspaceClock timezone={workspacePreferences.timezone} location={workspacePreferences.location} />
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : (
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
      )}

      {/* Founder/Super Admin: plan-tier dashboard. Everyone else: their own granted modules. */}
      {isFounderOrSuperAdmin ? (
        <>
          {access.plan === "basic" && (
            <BasicDashboard
              onUpgradeClick={() => setShowUpgradeModal(true)}
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
              onUpgradeClick={() => setShowUpgradeModal(true)}
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
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

    </div>
  );
};

export default CompanySettingsDashboard;
