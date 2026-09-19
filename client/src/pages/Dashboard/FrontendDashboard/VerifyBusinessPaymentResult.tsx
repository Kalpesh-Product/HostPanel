import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import PageFrame from "../../../components/Pages/PageFrame";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { TIER_OPTIONS } from "./verifyBusinessTiers";

const POLL_MS = 3000;
const MAX_WAIT_MS = 45000;
// A payment counts as "just now" if it was recorded shortly before this page
// opened (the webhook can beat the redirect) or at any time after.
const RECENT_PAYMENT_WINDOW_MS = 5 * 60 * 1000;

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
};

// Stripe only redirects here after a completed payment, but the verified
// status is switched on by a webhook a moment later — so this page confirms
// the payment against our own records instead of trusting the redirect.
const VerifyBusinessPaymentResult = () => {
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const openedAt = useRef(Date.now());
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const { data: overview, refetch } = useQuery({
    queryKey: ["verify-business-payment-result", attempt],
    queryFn: async () => {
      const response = await axiosPrivate.get("/api/verify-business/overview");
      return response.data;
    },
    refetchInterval: (query) => {
      const v = query.state.data?.verification;
      const confirmed =
        v?.paymentStatus === "paid" &&
        v?.paidAt &&
        new Date(v.paidAt).getTime() >=
          openedAt.current - RECENT_PAYMENT_WINDOW_MS;
      return confirmed || timedOut ? false : POLL_MS;
    },
  });

  const verification = overview?.verification;
  const confirmed = Boolean(
    verification?.paymentStatus === "paid" &&
      verification?.paidAt &&
      new Date(verification.paidAt).getTime() >=
        openedAt.current - RECENT_PAYMENT_WINDOW_MS,
  );

  useEffect(() => {
    if (confirmed) return;
    const timer = setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, [confirmed, attempt]);

  const { data: history = [] } = useQuery({
    queryKey: ["verify-business-history", "payment-result"],
    queryFn: async () => {
      const response = await axiosPrivate.get("/api/verify-business/history");
      return response.data?.data || [];
    },
    enabled: confirmed,
  });
  const latestInvoice = history.find(
    (h: any) => h.status === "paid" && (h.hostedInvoiceUrl || h.invoicePdfUrl),
  );

  const planLabel =
    TIER_OPTIONS.find((t) => t.value === verification?.activeTier)?.label ||
    verification?.activeTier ||
    "--";

  const goBack = () => navigate("/key-apps/verify-business", { replace: true });

  const checkAgain = () => {
    openedAt.current = Date.now();
    setTimedOut(false);
    setAttempt((n) => n + 1);
    refetch();
  };

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="mx-auto flex max-w-lg flex-col items-center py-10 text-center">
          {confirmed ? (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-[18px] font-pmedium text-slate-900">
                Payment successful
              </h2>
              <p className="mt-1 text-[12px] font-pmedium text-slate-500">
                Your business is now verified. The blue badge is live on your
                active, public listings.
              </p>

              <div className="mt-6 w-full rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm">
                <div className="flex items-center gap-2 pb-3">
                  <BadgeCheck size={16} className="text-sky-500" />
                  <p className="text-[13px] font-pmedium text-slate-900">
                    {overview?.companyName}
                  </p>
                </div>
                <dl className="divide-y divide-slate-100/70 text-[12px] font-pmedium">
                  <div className="flex justify-between py-2.5">
                    <dt className="text-slate-500">Plan</dt>
                    <dd className="text-slate-900">{planLabel}</dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-slate-500">Amount paid</dt>
                    <dd className="text-slate-900">
                      {verification?.activeAmountUsd != null
                        ? `$${verification.activeAmountUsd}`
                        : "--"}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-slate-500">Paid on</dt>
                    <dd className="text-slate-900">{formatDate(verification?.paidAt)}</dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-slate-500">Valid till</dt>
                    <dd className="text-emerald-700">
                      {formatDate(verification?.verificationExpiresAt)}
                    </dd>
                  </div>
                </dl>
              </div>

              <p className="mt-4 text-[11px] font-pmedium text-slate-400">
                A confirmation with your invoice has been emailed to{" "}
                {verification?.email || "you"}.
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {latestInvoice ? (
                  <a
                    href={latestInvoice.hostedInvoiceUrl || latestInvoice.invoicePdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 text-[12px] font-pmedium text-slate-700 hover:bg-slate-50"
                  >
                    View Invoice <ExternalLink size={12} />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#2563EB] px-4 text-[12px] font-pmedium text-white shadow-sm hover:bg-blue-700"
                >
                  Back to Verify Business
                </button>
              </div>
            </>
          ) : timedOut ? (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <AlertTriangle size={34} />
              </div>
              <h2 className="text-[18px] font-pmedium text-slate-900">
                We couldn't confirm your payment
              </h2>
              <p className="mt-1 text-[12px] font-pmedium text-slate-500">
                If you were charged, your verified badge will switch on
                automatically within a few minutes and you'll get a confirmation
                email. If the payment didn't go through, you can try again.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={checkAgain}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-[12px] font-pmedium text-slate-700 hover:bg-slate-50"
                >
                  Check Again
                </button>
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#2563EB] px-4 text-[12px] font-pmedium text-white shadow-sm hover:bg-blue-700"
                >
                  Back to Verify Business
                </button>
              </div>
            </>
          ) : (
            <>
              <Loader2 className="mb-4 animate-spin text-slate-300" size={40} />
              <h2 className="text-[16px] font-pmedium text-slate-900">
                Confirming your payment...
              </h2>
              <p className="mt-1 text-[12px] font-pmedium text-slate-500">
                Please don't close this page. This only takes a few seconds.
              </p>
            </>
          )}
        </div>
      </PageFrame>
    </div>
  );
};

export default VerifyBusinessPaymentResult;
