/**
 * Renew-the-current-plan popup — same self-serve flow Plan & Billing's own
 * "Renew Now" button uses (MasterPanel mints a real Stripe Payment Link on
 * the spot). Shared so the dashboard's PlanExpiringNotice banner can open it
 * in place instead of navigating to Plan & Billing first.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Loader2, X } from "lucide-react";
import useAxiosPrivate from "../hooks/useAxiosPrivate";

const MASTER_PANEL_BASE_URL =
  String(import.meta.env.VITE_MASTER_PANEL_BE_URL || "").trim() || "https://masterpanel.wono.co";

const formatDate = (value?: string | Date | null) => {
  if (!value) return "--";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

interface PlanRenewModalProps {
  planId: string;
  planLabel: string;
  companyId?: string | null;
  planExpiryDate?: string | null;
  onClose: () => void;
}

const PlanRenewModal = ({ planId, planLabel, companyId, planExpiryDate, onClose }: PlanRenewModalProps) => {
  const axiosPrivate = useAxiosPrivate();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: pricing } = useQuery({
    queryKey: ["professionalPlanPrice"],
    queryFn: async () => (await axiosPrivate.get("/api/plan-billing/professional-price")).data,
  });

  // Same rule MasterPanel's computeProjectedPeriod uses when previewing a
  // payment-link email: extend from the current expiry if it's still in the
  // future (no paid time lost), otherwise start today.
  const renewPeriod = (() => {
    const currentExpiry = planExpiryDate ? new Date(planExpiryDate) : null;
    const start = currentExpiry && currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
    const end = new Date(start);
    if (billingCycle === "annual") {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    return { start, end };
  })();

  const handleSubmit = async () => {
    if (!companyId) {
      toast.error("Company id not found. Please refresh and try again.");
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await axiosPrivate.post(
        `${MASTER_PANEL_BASE_URL}/api/hosts/plan-payments/send`,
        { companyId, plan: planId, billingCycle },
      );
      if (response?.data?.paymentLinkUrl) {
        window.location.href = response.data.paymentLinkUrl;
      } else {
        toast.error("Payment link wasn't returned — please try again.");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to start the payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600">Renew Plan</p>
            <h3 className="mt-1 text-sm font-pmedium text-slate-900">Renew {planLabel}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close renew plan"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
          >
            <X size={15} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[12px] text-slate-500">Choose a billing cycle to continue on this plan.</p>
          <div className="grid grid-cols-2 gap-3">
            {(["monthly", "annual"] as const).map((cycle) => {
              const isSelected = billingCycle === cycle;
              const rate =
                cycle === "annual"
                  ? pricing?.professionalAnnualPlanPriceUsd
                  : pricing?.professionalPlanPriceUsd;
              const priceLabel =
                rate != null
                  ? cycle === "annual"
                    ? `$${Number(rate).toLocaleString("en-US")} /year`
                    : `$${rate} /month`
                  : "";
              return (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setBillingCycle(cycle)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-[#2563EB] bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <p className="text-[12px] font-pmedium text-slate-900 capitalize">{cycle}</p>
                  {priceLabel ? <p className="text-[11px] text-slate-500 mt-0.5">{priceLabel}</p> : null}
                </button>
              );
            })}
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 flex items-center justify-between gap-3 text-[12px]">
            <div>
              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Starts</p>
              <p className="font-pmedium text-slate-800 mt-0.5">{formatDate(renewPeriod.start)}</p>
            </div>
            <ArrowRight size={14} className="text-slate-300 shrink-0" />
            <div className="text-right">
              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Ends</p>
              <p className="font-pmedium text-slate-800 mt-0.5">{formatDate(renewPeriod.end)}</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            You'll be taken to a secure Stripe payment page to complete this renewal.
          </p>
        </div>
        <div className="border-t border-slate-100 px-5 py-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-[11px] font-pmedium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-[11px] font-pmedium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
            {isSubmitting ? "Redirecting..." : "Continue to Payment"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanRenewModal;
