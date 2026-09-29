/**
 * Dashboard banner for a staff-granted extra Professional trial window,
 * specific to this company (Master Panel > Plan Pricing > trial companies).
 * Only appears while bonusTrialOffer.active is true and it hasn't been
 * claimed yet. Claiming reuses the same confirm step as the first-time free
 * trial, then reloads the page so the newly-unlocked plan/modules are
 * reflected everywhere (same convention AddModulesPage's handleStartTrial
 * uses).
 *
 * Polls every 30s and refetches on tab focus so a staff-side toggle shows up
 * here on its own — the host doesn't have to refresh the page to see it.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gift, ArrowRight } from "lucide-react";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import StartTrialConfirmModal from "../../../../components/StartTrialConfirmModal";

const BonusTrialOfferNotice = () => {
  const axiosPrivate = useAxiosPrivate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const { data: offer } = useQuery({
    queryKey: ["bonus-trial-offer"],
    queryFn: async () => {
      const { data } = await axiosPrivate.get("/api/plan-billing/summary");
      return data?.data?.bonusTrialOffer || null;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  if (!offer?.active || offer?.claimedAt) return null;

  const days = offer.durationDays;

  const handleClaim = async () => {
    try {
      setIsClaiming(true);
      await axiosPrivate.post("/api/plan-billing/claim-bonus-trial");
      toast.success("Bonus trial claimed!");
      window.location.reload();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to claim the bonus trial");
      setIsClaiming(false);
    }
  };

  return (
    <>
      <div
        data-tour="dashboard-bonus-trial-notice"
        role="button"
        tabIndex={0}
        onClick={() => setIsConfirmOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter") setIsConfirmOpen(true);
        }}
        className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-violet-300/60 bg-violet-50 p-4 transition-colors hover:bg-violet-100"
      >
        <Gift size={18} className="flex-shrink-0 text-violet-600" />
        <p className="min-w-0 text-content font-pmedium text-violet-800">
          You've been offered <strong>{days ? `${days} extra day${days === 1 ? "" : "s"}` : "an extra trial window"}</strong> of the Professional plan — claim it before it's gone.
        </p>
        <span className="ml-auto flex-shrink-0 whitespace-nowrap rounded-full border bg-violet-600 border-violet-600 px-3 py-1 text-[10px] font-pmedium uppercase tracking-widest text-white">
          Claim
        </span>
        <ArrowRight size={14} className="flex-shrink-0 text-violet-600" />
      </div>

      <StartTrialConfirmModal
        open={isConfirmOpen}
        durationDays={days}
        isStarting={isClaiming}
        onConfirm={handleClaim}
        onLater={() => !isClaiming && setIsConfirmOpen(false)}
        title={`Claim your ${days ? `${days}-day ` : ""}bonus trial?`}
        subtitle="Your company has been offered an extra Professional trial window."
        confirmLabel="Claim now"
        confirmingLabel="Claiming..."
        bullets={[
          "Professional modules unlock across all your business locations right away.",
          "This bonus trial offer can only be claimed once.",
          "Renew before it ends to keep Professional — otherwise you go back to the Basic plan.",
        ]}
      />
    </>
  );
};

export default BonusTrialOfferNotice;
