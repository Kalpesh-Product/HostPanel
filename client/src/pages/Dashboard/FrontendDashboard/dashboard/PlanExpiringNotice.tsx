/**
 * Dashboard banner for a paid (non-trial) plan whose current billing cycle
 * is about to lapse. The free-trial equivalent lives inline in
 * ProfessionalDashboard itself (trialDaysLeft/isTrialExpiringSoon props,
 * driven by the separate hostleadcompanies trial fields) — this only fires
 * once that trial is over and it's a real paid renewal, via
 * workspace.planStatus/planExpiryDate, so the two never show at once.
 *
 * Opens the renew popup in place (PlanRenewModal) instead of navigating to
 * Plan & Billing first — only the actual payment step leaves to Stripe.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock } from "lucide-react";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import PlanRenewModal from "../../../../components/PlanRenewModal";

const PLAN_LABELS: Record<string, string> = {
  professional: "Professional",
  custom: "Custom",
};

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

const PlanExpiringNotice = () => {
  const axiosPrivate = useAxiosPrivate();
  const [modalOpen, setModalOpen] = useState(false);

  // Same queryKey CompanySettingsDashboard's own plan-summary fetch uses —
  // shares its cache instead of firing a second request for this data.
  const { data } = useQuery({
    queryKey: ["planBillingSummary"],
    queryFn: async () => (await axiosPrivate.get("/api/plan-billing/summary")).data?.data,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (!data || data.isTrialing) return null;
  if (data.planStatus !== "expiring_soon" || !data.planExpiryDate) return null;

  const planLabel = PLAN_LABELS[String(data.selectedPlan || "").toLowerCase()];
  if (!planLabel) return null;

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(data.planExpiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );
  const lostModules: string[] = Array.isArray(data.modulesLostOnDowngrade)
    ? data.modulesLostOnDowngrade
    : [];
  const lostModulesLabel =
    lostModules.length > 3
      ? `${lostModules.slice(0, 3).join(", ")} and ${lostModules.length - 3} more`
      : lostModules.join(", ");

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        data-tour="dashboard-plan-expiring-notice"
        className="flex w-full items-center gap-3 rounded-xl border-2 border-indigo-300/60 bg-indigo-50 p-4 text-left text-indigo-800 transition-colors hover:bg-indigo-100"
      >
        <Clock size={18} className="flex-shrink-0 text-indigo-600" />
        <p className="min-w-0 text-content font-pmedium">
          Your <strong>{planLabel} Plan</strong> ends on {formatDate(data.planExpiryDate)} (
          {daysLeft} day{daysLeft === 1 ? "" : "s"} left). Renew to avoid being downgraded to Basic
          {lostModules.length > 0 ? (
            <>
              {" "}
              and losing <strong>{lostModulesLabel}</strong>
            </>
          ) : null}
          .
        </p>
        <span className="ml-auto flex-shrink-0 whitespace-nowrap rounded-full border border-indigo-500 bg-indigo-500 px-3 py-1 text-[10px] font-pmedium uppercase tracking-widest text-white">
          Renew
        </span>
        <ArrowRight size={14} className="flex-shrink-0 text-indigo-600" />
      </button>

      {modalOpen ? (
        <PlanRenewModal
          planId={String(data.selectedPlan || "")}
          planLabel={`${planLabel} Plan`}
          companyId={data.companyId}
          planExpiryDate={data.planExpiryDate}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </>
  );
};

export default PlanExpiringNotice;
