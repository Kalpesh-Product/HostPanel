/**
 * Dashboard banner for when a paid plan (Professional/Custom) lapsed and the
 * workspace was auto-downgraded to Basic. Only appears while
 * workspace.planStatus is "expired_downgraded" (see Workspace.ts) — once the
 * founder picks a new plan, MasterPanel's payment webhook updates planStatus
 * and this banner stops matching on its own.
 */
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight } from "lucide-react";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";

const PLAN_LABELS: Record<string, string> = {
  professional: "Professional",
  custom: "Custom",
};

const PlanDowngradedNotice = () => {
  const axiosPrivate = useAxiosPrivate();

  // Same queryKey CompanySettingsDashboard's own plan-summary fetch uses —
  // shares its cache instead of firing a second request for this data.
  const { data } = useQuery({
    queryKey: ["planBillingSummary"],
    queryFn: async () => (await axiosPrivate.get("/api/plan-billing/summary")).data?.data,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (!data || data.planStatus !== "expired_downgraded") return null;

  const purchasedPlanLabel =
    PLAN_LABELS[String(data.purchasedPlan || "").toLowerCase()] || "paid";
  const lostModules: string[] = Array.isArray(data.modulesLostOnDowngrade)
    ? data.modulesLostOnDowngrade
    : [];
  const lostModulesLabel =
    lostModules.length > 3
      ? `${lostModules.slice(0, 3).join(", ")} and ${lostModules.length - 3} more`
      : lostModules.join(", ");

  return (
    <a
      href="/profile/plan-billing"
      data-tour="dashboard-plan-downgraded-notice"
      className="flex items-center gap-3 rounded-xl border-2 border-orange-300/60 bg-orange-50 p-4 text-orange-800 transition-colors hover:bg-orange-100"
    >
      <AlertTriangle size={18} className="flex-shrink-0 text-orange-600" />
      <p className="min-w-0 text-content font-pmedium">
        Your <strong>{purchasedPlanLabel} plan</strong> expired and this workspace was downgraded
        to Basic{lostModules.length > 0 ? (
          <>
            {" "}
            — you lost access to <strong>{lostModulesLabel}</strong>
          </>
        ) : null}
        .
      </p>
      <span className="ml-auto flex-shrink-0 whitespace-nowrap rounded-full border border-orange-500 bg-orange-500 px-3 py-1 text-[10px] font-pmedium uppercase tracking-widest text-white">
        Upgrade
      </span>
      <ArrowRight size={14} className="flex-shrink-0 text-orange-600" />
    </a>
  );
};

export default PlanDowngradedNotice;
