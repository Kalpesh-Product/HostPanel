import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import Footer from "../../components/Footer";
import logo from "../../assets/WONO_LOGO_Black_TP.svg";

const MASTER_PANEL_BASE_URL =
  String(import.meta.env.VITE_MASTER_PANEL_BE_URL || "").trim() ||
  "https://masterpanel.wono.co";

const POLL_MS = 3000;
const MAX_WAIT_MS = 90_000;

type PaymentStatus = {
  status: "confirmed" | "processing" | "unpaid";
  companyName: string;
  planLabel: string;
  billingCycle: "monthly" | "annual";
  changeType: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  periodEnd: string | null;
  hostedInvoiceUrl: string | null;
  hasWorkspace: boolean;
  email: string;
};

type ViewState = "confirming" | "confirmed" | "timed-out" | "not-found" | "unpaid";

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
};

const formatAmount = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "usd").toUpperCase(),
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
};

// Stripe's payment-link redirect lands here (see the master panel's
// createAndSendPlanPaymentLink). The plan is only switched on by a webhook a
// moment after the redirect, so this page polls our own records instead of
// trusting the redirect alone. Public on purpose: a first-time payer has no
// account yet.
export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id") || "";

  const [view, setView] = useState<ViewState>(sessionId ? "confirming" : "not-found");
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [attempt, setAttempt] = useState(0);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!sessionId || view !== "confirming") return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      try {
        const response = await axios.get<PaymentStatus>(
          `${MASTER_PANEL_BASE_URL}/api/public/plan-payment-status`,
          { params: { session_id: sessionId } },
        );
        if (cancelled) return;
        setPayment(response.data);
        if (response.data.status === "confirmed") {
          setView("confirmed");
          return;
        }
        if (response.data.status === "unpaid") {
          setView("unpaid");
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

  // Leaving mid-confirmation is safe (the payment is already taken) but
  // confusing, so ask the browser to confirm a reload/close.
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

  const rows: Array<[string, string]> = payment
    ? [
        ["Company", payment.companyName || "--"],
        ["Plan", payment.planLabel],
        ["Billing", payment.billingCycle === "annual" ? "Annual" : "Monthly"],
        ["Amount paid", formatAmount(payment.amount, payment.currency)],
        ["Paid on", formatDate(payment.paidAt)],
        ["Valid until", formatDate(payment.periodEnd)],
      ]
    : [];

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
              <h1 className={headingClass}>Awaiting payment confirmation</h1>
              <p className={bodyClass}>
                We&apos;re confirming your payment with our payment provider. This usually takes a few
                seconds.
              </p>
              <p className="mt-4 text-[13px] font-semibold text-[#b45309]">
                Please don&apos;t press the back button, refresh, or close this page.
              </p>
            </>
          ) : null}

          {view === "confirmed" && payment ? (
            <>
              <div className={`${iconWrap} bg-emerald-50`}>
                <CheckCircle2 className="text-emerald-600" size={36} strokeWidth={2.5} />
              </div>
              <h1 className={headingClass}>Payment Successful</h1>
              <p className={bodyClass}>
                Thank you! Your payment has been received
                {payment.email ? ` and a receipt is on its way to ${payment.email}` : ""}.
              </p>

              <dl className="mt-6 divide-y divide-[#e4ecf8] rounded-2xl border border-[#e4ecf8] bg-white px-5 text-left text-[13px]">
                {rows.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 py-3">
                    <dt className="text-[#6b7fa7]">{label}</dt>
                    <dd className="font-semibold text-[#102a56] text-right">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 rounded-2xl bg-[#eef4ff] px-5 py-4 text-left text-[13px] leading-relaxed text-[#35507d]">
                <p className="font-semibold text-[#102a56] mb-1">What happens next</p>
                {payment.hasWorkspace ? (
                  <p>Your plan is active. You can review it any time under Plan &amp; Billing.</p>
                ) : (
                  <p>
                    Our team will now send you an invitation email to complete your WONO signup.
                    Keep an eye on your inbox.
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                {payment.hostedInvoiceUrl ? (
                  <a
                    href={payment.hostedInvoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#c8d6f2] bg-white px-5 text-[13px] font-semibold text-[#2d67f0] hover:bg-[#eef3ff]"
                  >
                    View invoice <ExternalLink size={14} />
                  </a>
                ) : null}
                {payment.hasWorkspace ? (
                  <button
                    type="button"
                    onClick={() => navigate("/profile/plan-billing", { replace: true })}
                    className="h-10 rounded-xl bg-[#2d67f0] px-6 text-[13px] font-semibold text-white hover:bg-[#2558d5]"
                  >
                    Go to Plan &amp; Billing
                  </button>
                ) : (
                  <a
                    href="https://host.wono.co"
                    className="inline-flex h-10 items-center rounded-xl bg-[#2d67f0] px-6 text-[13px] font-semibold text-white hover:bg-[#2558d5]"
                  >
                    Back to WONO
                  </a>
                )}
              </div>
            </>
          ) : null}

          {view === "timed-out" ? (
            <>
              <div className={`${iconWrap} bg-amber-50`}>
                <AlertTriangle className="text-amber-600" size={32} />
              </div>
              <h1 className={headingClass}>Still confirming your payment</h1>
              <p className={bodyClass}>
                Your payment went through, but confirmation is taking longer than usual. You&apos;ll get
                an email as soon as it&apos;s confirmed, so it&apos;s safe to close this page.
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

          {view === "unpaid" ? (
            <>
              <div className={`${iconWrap} bg-amber-50`}>
                <AlertTriangle className="text-amber-600" size={32} />
              </div>
              <h1 className={headingClass}>Payment not completed</h1>
              <p className={bodyClass}>
                We haven&apos;t received a completed payment for this checkout. If you were charged,
                contact our team and we&apos;ll sort it out.
              </p>
            </>
          ) : null}

          {view === "not-found" ? (
            <>
              <div className={`${iconWrap} bg-amber-50`}>
                <AlertTriangle className="text-amber-600" size={32} />
              </div>
              <h1 className={headingClass}>We couldn&apos;t find this payment</h1>
              <p className={bodyClass}>
                This link is invalid or has expired. If you&apos;ve just paid, check your email for the
                receipt or contact our team.
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex h-10 items-center rounded-xl bg-[#2d67f0] px-6 text-[13px] font-semibold text-white hover:bg-[#2558d5]"
              >
                Go to login
              </Link>
            </>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
