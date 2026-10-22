/**
 * Verify-business tier picker + "Continue to Payment" popup. Shared so the
 * dashboard's VerifiedBadgeNotice banner can open it in place instead of
 * navigating to the Verify Business module first — only the actual payment
 * step leaves to Stripe, same as everywhere else this flow is used.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { TIER_OPTIONS } from "../pages/Dashboard/FrontendDashboard/verifyBusinessTiers";

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

// Same rule the server applies when the payment lands: a renewal / plan
// change starts when the current plan ends (so no paid days are lost), or
// today if it has already expired.
const projectPeriod = (currentExpiry?: string | null, tier?: string) => {
  const months = TIER_OPTIONS.find((t) => t.value === tier)?.months || 1;
  const expiry = currentExpiry ? new Date(currentExpiry) : null;
  const stillActive = Boolean(expiry && expiry.getTime() > Date.now());
  const start = stillActive ? new Date(expiry as Date) : new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return { start, end, stillActive };
};

interface VerifyBusinessPlanModalProps {
  companyName?: string | null;
  verification?: {
    paymentStatus?: string | null;
    verificationExpiresAt?: string | null;
    activeTier?: string | null;
    requestedTier?: string | null;
  } | null;
  onClose: () => void;
}

const VerifyBusinessPlanModal = ({ companyName, verification, onClose }: VerifyBusinessPlanModalProps) => {
  const axiosPrivate = useAxiosPrivate();
  const isPaid = verification?.paymentStatus === "paid";
  // Retired plans (3m / 6m) on older records fall back to the first plan.
  const preferredTier = verification?.activeTier || verification?.requestedTier;
  const [selectedTier, setSelectedTier] = useState(
    TIER_OPTIONS.some((t) => t.value === preferredTier) ? (preferredTier as string) : TIER_OPTIONS[0].value,
  );

  const payMutation = useMutation({
    mutationFn: async (tier: string) => {
      const response = await axiosPrivate.post("/api/verify-business/pay", { requestedTier: tier });
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.paymentLinkUrl) {
        window.location.href = data.paymentLinkUrl;
      } else {
        toast.error("Payment link wasn't returned — please try again.");
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to start payment");
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-[14px] font-pmedium text-slate-950">
          {isPaid ? "Renew / Change Plan" : "Choose a Plan"}
        </p>
        <p className="mt-1 text-[12px] font-pmedium text-slate-500">
          This covers every active, public listing under {companyName || "this company"}.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {TIER_OPTIONS.map((tier) => (
            <button
              key={tier.value}
              type="button"
              onClick={() => setSelectedTier(tier.value)}
              className={`rounded-xl border py-3 px-2 text-center transition-colors ${
                selectedTier === tier.value ? "border-[#2563EB] bg-blue-50" : "border-slate-200"
              }`}
            >
              <div className="font-pmedium text-slate-900">${tier.price}</div>
              <div className="text-[10px] font-pmedium text-slate-500">{tier.label}</div>
            </button>
          ))}
        </div>
        {isPaid ? (
          (() => {
            const period = projectPeriod(verification?.verificationExpiresAt, selectedTier);
            return (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-[12px] font-pmedium text-slate-700">
                {period.stillActive ? (
                  <p>
                    Your current plan is valid till{" "}
                    <span className="text-slate-900">
                      {formatDate(verification?.verificationExpiresAt)}
                    </span>
                    . This renewal / plan change will start after your current plan ends, so you
                    won't lose any days.
                  </p>
                ) : (
                  <p>Your previous plan has expired, so this plan will start today.</p>
                )}
                <div className="mt-2 flex justify-between gap-3 text-[11px]">
                  <span>
                    Starts: <span className="text-slate-900">{formatDate(period.start.toISOString())}</span>
                  </span>
                  <span>
                    Valid till:{" "}
                    <span className="text-emerald-700">{formatDate(period.end.toISOString())}</span>
                  </span>
                </div>
              </div>
            );
          })()
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-[12px] font-pmedium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={payMutation.isPending}
            onClick={() => payMutation.mutate(selectedTier)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-[12px] font-pmedium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {payMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {payMutation.isPending ? "Redirecting..." : "Continue to Payment"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyBusinessPlanModal;
