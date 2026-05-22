// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import useAuth from "../hooks/useAuth";
import RequestCreditsPopup from "./RequestCreditsPopup";

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

const CreditsIndicator = ({ workspaceId, companyId }) => {
  const axios = useAxiosPrivate();
  const { auth } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRequestPopup, setShowRequestPopup] = useState(false);
  const [subscriptionRefreshKey, setSubscriptionRefreshKey] = useState(0);
  const subscriptionId = companyId || workspaceId;

  useEffect(() => {
    let mounted = true;

    const fetchSubscription = async () => {
      if (!subscriptionId) return;
      setLoading(true);
      try {
        const res = await axios.get(`/api/subscription/${subscriptionId}`, {
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

  const creditsLimit = Number(subscription?.creditsLimit || 5);
  const creditsUsed = Number(subscription?.creditsUsed || 0);
  const creditsRemaining = Math.max(
    0,
    Number(
      subscription?.creditsRemaining ?? Math.max(0, creditsLimit - creditsUsed),
    ),
  );
  const progress = creditsLimit > 0 ? (creditsRemaining / creditsLimit) * 100 : 0;
  const resetText = formatResetDate(subscription?.creditsResetDate);
  const daysLeft = getDaysLeft(subscription?.creditsResetDate);

  const tone = useMemo(() => {
    if (creditsRemaining <= 0) {
      return {
        wrapper: "border-red-200 bg-red-50",
        text: "text-red-700",
        bar: "bg-red-500",
        status: `No credits left. Resets on ${resetText}`,
      };
    }
    if (creditsRemaining === 1) {
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
  }, [creditsRemaining, resetText]);

  if (!subscriptionId) return null;

  return (
    <div className={`rounded-2xl border px-4 py-3 w-full max-w-xl ${tone.wrapper}`}>
      <div className={`text-sm font-medium ${tone.text}`}>
        {loading
          ? "Loading credits..."
          : `${creditsRemaining} / ${creditsLimit} credits`}
      </div>
      {!loading ? (
        <div className="mt-1 text-xs text-black/60">
          Used: {creditsUsed} • Remaining: {creditsRemaining}
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
      {creditsRemaining === 0 && (
        <button
          type="button"
          onClick={() => setShowRequestPopup(true)}
          className="mt-2 inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Request Credits
        </button>
      )}
      <RequestCreditsPopup
        isOpen={showRequestPopup}
        onClose={() => setShowRequestPopup(false)}
        companyId={companyId}
        workspaceId={workspaceId}
        onSuccess={() => {
          setShowRequestPopup(false);
          setSubscriptionRefreshKey((prev) => prev + 1);
        }}
      />
    </div>
  );
};

export default CreditsIndicator;
