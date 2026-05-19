// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import useAuth from "../hooks/useAuth";

const formatResetDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const CreditsIndicator = ({ workspaceId }) => {
  const axios = useAxiosPrivate();
  const { auth } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchSubscription = async () => {
      if (!workspaceId) return;
      setLoading(true);
      try {
        const res = await axios.get(`/api/subscription/${workspaceId}`, {
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
  }, [axios, workspaceId]);

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

  if (!workspaceId) return null;

  return (
    <div className={`rounded-full border px-4 py-2 w-fit ${tone.wrapper}`}>
      <div className={`text-sm font-medium ${tone.text}`}>
        {loading
          ? "Loading credits..."
          : `${creditsRemaining} / ${creditsLimit} credits`}
      </div>
      <div className="mt-2 h-1.5 w-44 rounded-full bg-black/10 overflow-hidden">
        <div
          className={`h-full ${tone.bar} transition-all duration-300`}
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
      {tone.status ? (
        <div className="mt-2 text-xs text-red-700">{tone.status}</div>
      ) : null}
      <div className="mt-1 text-xs text-black/50">Resets on {resetText}</div>
    </div>
  );
};

export default CreditsIndicator;
