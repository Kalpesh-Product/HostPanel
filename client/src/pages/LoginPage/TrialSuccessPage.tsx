import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import Footer from "../../components/Footer";
import logo from "../../assets/WONO_LOGO_Black_TP.svg";

const MASTER_PANEL_BASE_URL =
  String(import.meta.env.VITE_MASTER_PANEL_BE_URL || "").trim() ||
  "https://masterpanel.wono.co";

const POLL_MS = 3000;
const MAX_WAIT_MS = 90_000;

type TrialStatus = {
  status: "confirmed" | "pending";
  companyName?: string;
  trialEndAt?: string | null;
  hostedInvoiceUrl?: string | null;
};

type ViewState = "confirming" | "confirmed" | "timed-out" | "not-found";

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
};

// Stripe's trial-checkout redirect (startTrialCheckout, MasterPanel) lands
// here. The trial is only actually started by a webhook a moment after the
// redirect, so this polls MasterPanel's own record instead of trusting the
// redirect alone — mirrors PaymentSuccessPage.tsx's polling pattern.
export default function TrialSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id") || "";

  const [view, setView] = useState<ViewState>(sessionId ? "confirming" : "not-found");
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [attempt, setAttempt] = useState(0);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!sessionId || view !== "confirming") return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      try {
        const response = await axios.get<TrialStatus>(
          `${MASTER_PANEL_BASE_URL}/api/public/trial-checkout-status`,
          { params: { session_id: sessionId } },
        );
        if (cancelled) return;
        setTrial(response.data);
        if (response.data.status === "confirmed") {
          setView("confirmed");
          return;
        }
      } catch (error) {
        if (cancelled) return;
        if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
          setView("not-found");
          return;
        }
        // Network hiccup or 5xx: keep polling until the wait runs out.
      }
      if (Date.now() - startedAt.current >= MAX_WAIT_MS) {
        setView("timed-out");
        return;
      }
      timer = setTimeout(check, POLL_MS);
    };

    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId, view, attempt]);

  useEffect(() => {
    if (view !== "confirming") return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [view]);

  const checkAgain = useCallback(() => {
    startedAt.current = Date.now();
    setView("confirming");
    setAttempt((n) => n + 1);
  }, []);

  const iconWrap = "w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5";
  const headingClass = "text-[24px] md:text-[28px] font-bold text-[#102a56] mb-2";
  const bodyClass = "text-[14px] md:text-[15px] leading-relaxed text-[#4b5e80] max-w-[460px] mx-auto";

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 font-pregular">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-300 shadow-sm">
        <div className="min-w-[75%] max-w-[80rem] mx-0 md:mx-auto px-6 sm:px-6 lg:px-0 flex items-center justify-between py-4">
          <a href="https://wono.co">
            <img src={logo} alt="wono" className="w-36 h-10" />
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-[24px] border border-[#d9e6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] shadow-[0_16px_50px_rgba(23,73,182,0.14)] px-5 md:px-8 py-9 text-center">
          {view === "confirming" ? (
            <>
              <div className={`${iconWrap} bg-[#e8f1ff]`}>
                <Loader2 className="text-[#2d67f0] animate-spin" size={32} />
              </div>
              <h1 className={headingClass}>Starting your free trial</h1>
              <p className={bodyClass}>
                We&apos;re confirming your trial with our payment provider. This usually takes a few
                seconds.
              </p>
              <p className="mt-4 text-[13px] font-semibold text-[#b45309]">
                Please don&apos;t press the back button, refresh, or close this page.
              </p>
            </>
          ) : null}

          {view === "confirmed" && trial ? (
            <>
              <div className={`${iconWrap} bg-emerald-50`}>
                <CheckCircle2 className="text-emerald-600" size={36} strokeWidth={2.5} />
              </div>
              <h1 className={headingClass}>Your free trial has started!</h1>
              <p className={bodyClass}>
                Every Professional feature is unlocked for{" "}
                {trial.companyName || "your company"} right now — nothing has been charged.
              </p>

              <div className="mt-6 rounded-2xl bg-[#eef4ff] px-5 py-4 text-left text-[13px] leading-relaxed text-[#35507d]">
                <p className="font-semibold text-[#102a56] mb-1">What happens next</p>
                <p>
                  Your trial runs until <b className="text-[#102a56]">{formatDate(trial.trialEndAt)}</b>.
                  The card you entered will be charged automatically on that date unless you cancel
                  first — you can cancel anytime from Plan &amp; Billing in Profile.
                </p>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                {trial.hostedInvoiceUrl ? (
                  <a
                    href={trial.hostedInvoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#c8d6f2] bg-white px-5 text-[13px] font-semibold text-[#2d67f0] hover:bg-[#eef3ff]"
                  >
                    View $0 invoice <ExternalLink size={14} />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => navigate("/dashboard", { replace: true })}
                  className="h-10 rounded-xl bg-[#2d67f0] px-6 text-[13px] font-semibold text-white hover:bg-[#2558d5]"
                >
                  Go to Dashboard
                </button>
              </div>
            </>
          ) : null}

          {view === "timed-out" ? (
            <>
              <div className={`${iconWrap} bg-amber-50`}>
                <AlertTriangle className="text-amber-600" size={32} />
              </div>
              <h1 className={headingClass}>Still confirming your trial</h1>
              <p className={bodyClass}>
                Your trial checkout went through, but confirmation is taking longer than usual.
                You&apos;ll see Professional unlock shortly — it&apos;s safe to close this page.
              </p>
              <button
                type="button"
                onClick={checkAgain}
                className="mt-6 h-10 rounded-xl bg-[#2d67f0] px-6 text-[13px] font-semibold text-white hover:bg-[#2558d5]"
              >
                Check again
              </button>
            </>
          ) : null}

          {view === "not-found" ? (
            <>
              <div className={`${iconWrap} bg-amber-50`}>
                <AlertTriangle className="text-amber-600" size={32} />
              </div>
              <h1 className={headingClass}>We couldn&apos;t find this trial checkout</h1>
              <p className={bodyClass}>
                This link is invalid or has expired. If you just finished checkout, go back to your
                dashboard and check whether Professional is already unlocked.
              </p>
              <button
                type="button"
                onClick={() => navigate("/dashboard", { replace: true })}
                className="mt-6 inline-flex h-10 items-center rounded-xl bg-[#2d67f0] px-6 text-[13px] font-semibold text-white hover:bg-[#2558d5]"
              >
                Go to Dashboard
              </button>
            </>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
