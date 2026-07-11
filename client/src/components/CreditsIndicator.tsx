// @ts-nocheck
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import useAuth from "../hooks/useAuth";
import { getUpgradePlanOptions } from "../pages/WorkspaceSetup/workspaceSetupPlans";
import type { PlanType } from "../pages/WorkspaceSetup/workspaceSetupPlans";

const formatResetDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}, 12:00 AM`;
};

const getDaysLeft = (value) => {
  if (!value) return null;
  const reset = new Date(value);
  if (Number.isNaN(reset.getTime())) return null;
  const now = new Date();
  const resetStart = new Date(
    reset.getFullYear(),
    reset.getMonth(),
    reset.getDate(),
    0,
    0,
    0,
    0,
  );
  const nowStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const diff = resetStart.getTime() - nowStart.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
};

const readCurrentPlan = (): PlanType => {
  try {
    const raw = localStorage.getItem("workspace_setup");
    if (!raw) return "basic";
    const parsed = JSON.parse(raw);
    return parsed?.selectedPlan || "basic";
  } catch {
    return "basic";
  }
};

const CreditsIndicator = ({ workspaceId, companyId }) => {
  const axios = useAxiosPrivate();
  const { auth } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subscriptionRefreshKey, setSubscriptionRefreshKey] = useState(0);
  const [hasPendingCreditRequest, setHasPendingCreditRequest] = useState(false);
  const [pendingRequestedCredits, setPendingRequestedCredits] = useState(0);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpgradeSubmitting, setIsUpgradeSubmitting] = useState(false);
  const [requestedUpgradePlan, setRequestedUpgradePlan] = useState("");
  // localStorage.workspace_setup is only ever written once, at initial
  // workspace-setup time — it never reflects a later plan change made from
  // master panel. Use it as the instant-first-paint fallback only; the live
  // fetch below (same endpoint Sidebar.tsx/ModuleCardsLanding.tsx poll)
  // overrides it once it resolves, so an upgraded host actually sees their
  // new plan here instead of being stuck on "basic" forever.
  const [currentPlan, setCurrentPlan] = useState<PlanType>(readCurrentPlan());
  const subscriptionId = companyId || workspaceId;
  const upgradePlanCards = getUpgradePlanOptions(currentPlan);

  useEffect(() => {
    let mounted = true;
    axios
      .get("/api/workspaces/module-access-map")
      .then((res) => {
        const plan = res?.data?.data?.selectedPlan;
        if (mounted && plan) setCurrentPlan(plan);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [axios, subscriptionRefreshKey]);

  const handleUpgradePlanRequest = async (plan: string) => {
    if (requestedUpgradePlan === plan) {
      toast.info(`${plan.toUpperCase()} plan already requested.`);
      return;
    }
    try {
      setIsUpgradeSubmitting(true);
      if (!companyId) {
        toast.error("Company id not found. Please re-login and try again.");
        return;
      }
      const response = await axios.patch("/api/hosts/request-upgrade-plan", {
        companyId,
        requestedPlan: plan,
      });
      toast.success(response?.data?.message || "Request sent. Sales team will contact you soon.");
      setRequestedUpgradePlan(plan);
      setIsUpgradeModalOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send upgrade request.");
    } finally {
      setIsUpgradeSubmitting(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchSubscription = async () => {
      if (!subscriptionId) return;
      setLoading(true);
      try {
        const res = await axios.get(`/api/subscription/${subscriptionId}`, {
          params: {
            companyId: String(companyId || "").trim(),
            workspaceId: String(workspaceId || "").trim(),
          },
          headers: {
            Authorization: `Bearer ${auth?.accessToken || ""}`,
          },
        });
        if (mounted) setSubscription(res.data);
      } catch (error) {
        if (mounted) setSubscription(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSubscription();
    return () => {
      mounted = false;
    };
  }, [axios, subscriptionId, subscriptionRefreshKey]);

  useEffect(() => {
    const handleCreditsRefresh = () => {
      setSubscriptionRefreshKey((prev) => prev + 1);
    };
    window.addEventListener("credits:refresh", handleCreditsRefresh);
    return () => {
      window.removeEventListener("credits:refresh", handleCreditsRefresh);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchPendingRequestStatus = async () => {
      if (!companyId) return;
      try {
        const res = await axios.get("/api/website-credits/requests", {
          params: {
            companyId,
            status: "pending",
          },
          headers: {
            Authorization: `Bearer ${auth?.accessToken || ""}`,
          },
        });
        if (mounted) {
          const pendingRequest = Array.isArray(res?.data) ? res.data?.[0] : null;
          const hasPending = Boolean(pendingRequest);
          setHasPendingCreditRequest(hasPending);
          setPendingRequestedCredits(Number(pendingRequest?.requestedCredits || 0));
        }
      } catch {
        if (mounted) {
          setHasPendingCreditRequest(false);
          setPendingRequestedCredits(0);
        }
      }
    };

    fetchPendingRequestStatus();
    return () => {
      mounted = false;
    };
  }, [axios, auth?.accessToken, companyId, subscriptionRefreshKey]);

  const monthlyCreditsLimit = Number(
    subscription?.monthlyCreditsLimit || subscription?.creditsLimit || 5,
  );
  const creditsUsed = Number(subscription?.creditsUsed || 0);
  const totalCreditsRemaining = Math.max(
    0,
    Number(
      subscription?.creditsRemaining ??
        Math.max(0, monthlyCreditsLimit - creditsUsed),
    ),
  );
  const monthlyCreditsRemaining = Math.max(
    0,
    Number(
      subscription?.monthlyCreditsRemaining ??
        Math.max(0, monthlyCreditsLimit - creditsUsed),
    ),
  );
  const addOnCreditsPurchased = Math.max(
    0,
    Number(subscription?.addOnCreditsPurchased || 0),
  );
  const addOnCreditsRemaining = Math.max(
    0,
    Number(
      subscription?.addOnCreditsRemaining ??
        Math.max(0, totalCreditsRemaining - monthlyCreditsRemaining),
    ),
  );

  const effectiveLimit = Math.max(
    0,
    Number(subscription?.effectiveCreditsLimit ?? monthlyCreditsLimit + addOnCreditsPurchased),
  );
  const remaining = Math.max(
    0,
    Number(subscription?.creditsRemaining ?? effectiveLimit - creditsUsed),
  );
  const progress = effectiveLimit > 0 ? (remaining / effectiveLimit) * 100 : 0;

  const resetText = formatResetDate(subscription?.creditsResetDate);
  const daysLeft = getDaysLeft(subscription?.creditsResetDate);

  const tone = useMemo(() => {
    if (remaining <= 0) {
      return {
        wrapper: "border-red-200 bg-red-50",
        text: "text-red-700",
        bar: "bg-red-500",
        status: `No credits left. Resets on ${resetText}`,
      };
    }
    if (remaining === 1) {
      return {
        wrapper: "border-amber-200 bg-amber-50",
        text: "text-amber-700",
        bar: "bg-amber-500",
        status: null,
      };
    }
    return {
      wrapper: "border-green-200 bg-green-50",
      text: "text-green-700",
      bar: "bg-green-500",
      status: null,
    };
  }, [remaining, resetText]);

  if (!subscriptionId) return null;

  return (
    <div className={`rounded-2xl border px-4 py-3 w-full max-w-xl ${tone.wrapper}`}>
      <div className={`text-sm font-medium ${tone.text}`}>
        {loading ? "Loading credits..." : `${creditsUsed} / ${effectiveLimit} credits`}
      </div>
      {!loading ? (
        <div className="mt-1 text-xs text-black/60">
          Base: {monthlyCreditsLimit} | Add-on: {addOnCreditsPurchased} | Used: {creditsUsed} | Remaining: {remaining}
        </div>
      ) : null}
      <div className="mt-2 h-2 w-full rounded-full bg-black/10 overflow-hidden">
        <div
          className={`h-full ${tone.bar} transition-all duration-300`}
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
      {tone.status ? (
        <div className="mt-2 text-xs text-red-700">{tone.status}</div>
      ) : null}
      <div className="mt-1 text-xs text-black/50">Resets on {resetText}</div>
      {daysLeft !== null ? (
        <div className="mt-1 text-xs text-black/50">{daysLeft} day(s) left for renew</div>
      ) : null}
      {remaining <= 0 && (
        <>
          {hasPendingCreditRequest ? (
            <button
              type="button"
              disabled
              className="mt-2 inline-flex items-center rounded-xl bg-[#2563EB] px-8 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white opacity-60 cursor-not-allowed"
            >
              Request for {pendingRequestedCredits || 0} credits submitted
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(true)}
              className="mt-2 flex w-fit mx-auto items-center gap-1.5 rounded-xl bg-[#2563EB] px-8 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white shadow-sm hover:bg-blue-700"
            >
              Upgrade Plan
            </button>
          )}
        </>
      )}

      {isUpgradeModalOpen && createPortal(
        <div className="fixed inset-0 z-[1400] bg-[#0f172a]/45 backdrop-blur-[2px] px-4 py-6 flex items-center justify-center">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] border border-[#dbe5f2] shadow-[0_20px_80px_rgba(15,23,42,0.28)] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="font-['Poppins'] text-[22px] sm:text-[26px] md:text-[30px] font-bold text-[#111b33] uppercase mb-2 tracking-normal">
                  Upgrade Plan
                </h2>
                <p className="text-[14px] text-[#63738d] mt-1">
                  Choose the plan you want and send the upgrade request to master panel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="h-9 w-9 rounded-full border border-[#d7dfeb] text-[#5c6d84] inline-flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div
              className={`grid grid-cols-1 ${upgradePlanCards.length > 1 ? "md:grid-cols-2" : ""} gap-4 mx-auto ${upgradePlanCards.length > 1 ? "max-w-[700px]" : "max-w-[320px]"}`}
            >
              {upgradePlanCards.map((plan) => (
                <div
                  key={plan.key}
                  className="w-full max-w-[300px] rounded-[30px] bg-[#eef2f7] p-4 border border-[#d9e1ec] shadow-[0_4px_18px_rgba(15,27,53,0.05)] flex flex-col"
                >
                  <h3 className="text-[18px] font-bold text-[#0f1b35] text-center mt-1">
                    {plan.title}
                  </h3>
                  <p className="text-[11px] text-[#667791] text-center mt-2 min-h-[30px]">
                    {plan.subtitle}
                  </p>
                  <p className="text-center mt-3 mb-3 text-[#0f1b35] font-bold text-[18px]">
                    {plan.priceLabel}
                  </p>

                  <div className="h-px bg-[#d8e0ea] mb-3" />

                  <div className="space-y-2 flex-1 rounded-2xl border border-[#dce4ee] bg-[#f7f9fc] px-3 py-2">
                    {plan.moduleGroups.flatMap((group) => group.items || []).map((item) => (
                      <div key={`${plan.key}-${item}`} className="flex items-start gap-2">
                        <CheckCircle2 size={12} className="text-[#23c35c] mt-0.5" />
                        <span className="text-[11px] text-[#4f627d]">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="h-px bg-[#d8e0ea] mt-3 mb-2" />
                  <p className="text-[11px] text-[#9aa8bc] text-center mb-2">{plan.note}</p>

                  <div className="w-full">
                    <button
                      type="button"
                      onClick={() => handleUpgradePlanRequest(plan.key)}
                      disabled={isUpgradeSubmitting || requestedUpgradePlan === plan.key}
                      className="w-full rounded-xl bg-[#2563EB] px-8 py-2.5 text-white font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {requestedUpgradePlan === plan.key
                        ? "Requested"
                        : isUpgradeSubmitting
                          ? "Sending..."
                          : `Upgrade to ${plan.title}`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default CreditsIndicator;
