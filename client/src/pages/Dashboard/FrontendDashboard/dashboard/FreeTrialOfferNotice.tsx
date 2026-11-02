import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Gift, Sparkles, Zap } from "lucide-react";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import StartTrialConfirmModal from "../../../../components/StartTrialConfirmModal";

type FreeTrialOfferNoticeProps = {
  onUpgradeClick: () => void;
  isExpiredDowngrade: boolean;
  downgradedPlanLabel: string;
};

const FreeTrialOfferNotice = ({
  onUpgradeClick,
  isExpiredDowngrade,
  downgradedPlanLabel,
}: FreeTrialOfferNoticeProps) => {
  const axiosPrivate = useAxiosPrivate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const { data: offer } = useQuery({
    queryKey: ["dashboard-free-trial-offer"],
    queryFn: async () => {
      const [priceResponse, summaryResponse] = await Promise.all([
        axiosPrivate.get("/api/plan-billing/professional-price"),
        axiosPrivate.get("/api/plan-billing/summary"),
      ]);
      const summary = summaryResponse?.data?.data;
      return {
        freeTrialEnabled: Boolean(priceResponse?.data?.freeTrialEnabled),
        durationDays:
          priceResponse?.data?.freeTrialDurationDays != null
            ? Number(priceResponse.data.freeTrialDurationDays)
            : null,
        hasUsedTrial: Boolean(summary?.hasUsedTrial),
        isTrialing: Boolean(summary?.isTrialing),
        selectedPlan: String(summary?.selectedPlan || "basic").toLowerCase(),
        bonusTrialActive: Boolean(
          summary?.bonusTrialOffer?.active &&
          !summary?.bonusTrialOffer?.claimedAt,
        ),
      };
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const isEligible =
    !isExpiredDowngrade &&
    offer?.freeTrialEnabled &&
    offer?.selectedPlan === "basic" &&
    !offer?.hasUsedTrial &&
    !offer?.isTrialing;

  const days =
    offer?.durationDays && offer.durationDays > 0 ? offer.durationDays : null;
  const offerLabel = days ? `${days} Days Free` : "Free Trial";

  // A staff-granted bonus trial is the more specific offer. Let its dedicated
  // notice own the plan-message slot instead of stacking two promotions.
  if (offer?.bonusTrialActive && !isExpiredDowngrade) return null;

  const handleStartTrial = async () => {
    try {
      setIsStarting(true);
      await axiosPrivate.post("/api/plan-billing/start-trial");
      toast.success("Your Professional trial has started!");
      window.location.reload();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to start the free trial.",
      );
      setIsStarting(false);
    }
  };

  return (
    <>
      {isEligible ? (
        <div
          data-tour="dashboard-free-trial-offer"
          className="relative w-full overflow-hidden rounded-[1.75rem] bg-gradient-to-r from-[#1E3D73] via-[#2563EB] to-[#3B82F6] p-5 text-left text-white shadow-[0_14px_35px_rgba(37,99,235,0.24)] sm:p-6"
        >
          <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-14 right-24 h-32 w-32 rounded-full bg-cyan-300/10" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Gift size={23} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.18em] ring-1 ring-white/20">
                  <Sparkles size={11} /> Limited-time offer
                </span>
                <span className="text-[10px] font-pmedium uppercase tracking-widest text-blue-100">
                  No payment needed
                </span>
              </div>
              <p className="text-lg font-pmedium sm:text-xl">
                Unlock Professional for{" "}
                <span className="text-cyan-200">{offerLabel}</span>
              </p>
              <p className="mt-1 text-xs font-pmedium leading-relaxed text-blue-100 sm:text-sm">
                Advanced sales, bookings, ticketing and more—free to explore
                before you decide.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={onUpgradeClick}
                className="inline-flex items-center justify-center rounded-full border border-white/35 bg-white/10 px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-white transition hover:bg-white/20"
              >
                View Plans
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB] shadow-lg transition hover:bg-blue-50"
              >
                Claim {offerLabel}
                <ArrowRight
                  size={14}
                  className="transition group-hover:translate-x-0.5"
                />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          data-tour="dashboard-plan"
          onClick={onUpgradeClick}
          className="group relative w-full overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-r from-white via-white to-blue-50 p-5 text-left shadow-[0_12px_34px_rgba(30,61,115,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg sm:p-6"
        >
          <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-blue-100/60" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1E3D73] text-white shadow-sm">
              <Zap size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
                {isExpiredDowngrade ? "Plan access paused" : "Basic unit"}
              </p>
              <p className="mt-1 text-base font-pmedium leading-relaxed text-[#1E3D73] sm:text-lg">
                {isExpiredDowngrade ? (
                  <>
                    Your {downgradedPlanLabel} Plan expired. Upgrade now to
                    regain paid-module access.
                  </>
                ) : (
                  <>
                    Ready for bookings, ticketing and advanced sales? Explore a
                    paid plan.
                  </>
                )}
              </p>
              <p className="mt-1 text-xs font-pmedium text-slate-500">
                {isExpiredDowngrade
                  ? "Your data and setup remain safe on Basic."
                  : "Compare Professional and Custom whenever your team is ready."}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-white shadow-lg shadow-blue-200 transition group-hover:bg-[#1E3D73] sm:self-center">
              {isExpiredDowngrade ? "Upgrade Now" : "View Plans"}
              <ArrowRight size={14} />
            </span>
          </div>
        </button>
      )}

      <StartTrialConfirmModal
        open={isConfirmOpen}
        durationDays={days}
        isStarting={isStarting}
        onConfirm={handleStartTrial}
        onLater={() => !isStarting && setIsConfirmOpen(false)}
        title={`Claim your ${days ? `${days}-day ` : ""}Professional trial?`}
        subtitle="Explore the Professional plan free — no payment needed to begin."
        confirmLabel="Claim free trial"
        confirmingLabel="Starting trial..."
      />
    </>
  );
};

export default FreeTrialOfferNotice;
