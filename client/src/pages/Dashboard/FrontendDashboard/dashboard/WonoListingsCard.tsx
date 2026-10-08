/**
 * Dashboard card under the plan strip about listing the business on wono.co
 * (leads, reviews, bookings). Its message follows where the host is:
 *  - no listings yet        -> the full "get discovered" pitch
 *  - listings, none live    -> "under review by our team"
 *  - listings live          -> progress against the plan limit + Add Listings
 *  - plan limit reached     -> a "Plan limit reached" badge instead of Add
 *    Listings (hover explains; the plan strip above already has Upgrade)
 * "Verify Existing Listings" stays until the host's existing wono.co listings
 * are linked (or approved) — but once the host already manages listings of
 * their own, it only still shows while a claim is actually in flight
 * (pending/rejected), not as a standing invite. Every button opens the
 * Listings page; "verify" also opens the claim dialog, pre-searched with the
 * company name.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Building2, Globe, Plus, X } from "lucide-react";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import useAuth from "../../../../hooks/useAuth";
import useNomadListingCapacity, {
  EXISTING_COMPANY_CLAIM_QUERY_KEY,
} from "../../../../hooks/useNomadListingCapacity";

const LISTINGS_ROUTE = "/key-apps/nomad-listings";

const PLAN_NAMES: Record<string, string> = {
  basic: "Basic",
  professional: "Professional",
  custom: "Custom",
};

const WonoListingsCard = () => {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const user = auth.user as { effectiveNomadsCompanyId?: string; companyId?: string } | null;
  const companyId = user?.effectiveNomadsCompanyId || user?.companyId || "";

  // Same query (and cache entry) the Listings page uses.
  const { data: claim } = useQuery({
    queryKey: EXISTING_COMPANY_CLAIM_QUERY_KEY,
    queryFn: async () => (await axiosPrivate.get("/api/listings/existing-company/status")).data,
    retry: false,
  });

  const { plan, limit, used, isAtLimit, listings, isPending } = useNomadListingCapacity(companyId);

  const alreadyLinked = Boolean(claim?.linked) || claim?.status === "approved";
  const verifyLabel =
    claim?.status === "pending" ? "Verification Pending" : "Verify Existing Listings";

  // "Live" = shown on wono.co: switched on by our team (isActive) AND by the host (isPublic).
  const liveCount = (listings as Array<{ isDeleted?: boolean; isActive?: boolean; isPublic?: boolean }>)
    .filter((l) => !l?.isDeleted && l?.isActive && l?.isPublic).length;
  const planName = PLAN_NAMES[plan] || "current";

  // While the listing count loads, show the full pitch rather than flashing.
  const hasListings = !isPending && used > 0;
  // Once the host already manages listings of their own, there's nothing to
  // "bring in" by default — only still offer this while an actual claim
  // (pending/rejected) is in flight, so its status stays visible.
  const showVerifyCta = Boolean(claim?.status) || !hasListings;

  // Dismiss is keyed to which message is currently showing, not to the card
  // in general — so once the status actually changes (reviewing -> live,
  // live -> limit reached, etc.) it's a different key and the new message
  // shows up again. Nothing the host still needs to see stays hidden.
  const statusKey = !hasListings ? "pitch" : liveCount === 0 ? "reviewing" : isAtLimit ? "limit" : "live";
  const dismissStorageKey = `hostpanel_dashboard_listings_banner_dismissed:${companyId}:${statusKey}`;
  const [dismissVersion, setDismissVersion] = useState(0);
  const isDismissed = useMemo(() => {
    try {
      return localStorage.getItem(dismissStorageKey) === "1";
    } catch {
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissStorageKey, dismissVersion]);
  const dismissBanner = () => {
    try {
      localStorage.setItem(dismissStorageKey, "1");
    } catch {
      // Best-effort only; worst case it reappears next visit.
    }
    setDismissVersion((v) => v + 1);
  };

  let message;
  if (!hasListings) {
    message = (
      <>
        Get your business discovered on{" "}
        <a
          href="https://wono.co"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-accent underline underline-offset-2 hover:opacity-80"
        >
          wono.co
        </a>{" "}
        — receive leads &amp; reviews and grow your business.
      </>
    );
  } else if (liveCount === 0) {
    message = (
      <>
        Your {used === 1 ? "listing is" : `${used} listings are`} being reviewed by our team — it
        will appear on <strong>wono.co</strong> once approved.
      </>
    );
  } else if (isAtLimit) {
    message = (
      <>
        <strong>
          {used} of {limit} listings
        </strong>{" "}
        added — you&apos;ve reached your {planName} plan limit.
      </>
    );
  } else {
    message = (
      <>
        <strong>
          {liveCount}
          {limit !== null ? ` of ${limit}` : ""} listing{liveCount === 1 && limit === null ? "" : "s"}
        </strong>{" "}
        live on{" "}
        <a
          href="https://wono.co"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-accent underline underline-offset-2 hover:opacity-80"
        >
          wono.co
        </a>{" "}
        — bringing you leads &amp; reviews.
      </>
    );
  }

  if (isDismissed) {
    return null;
  }

  return (
    <div
      data-tour="dashboard-wono-listings"
      className={`flex flex-col gap-3 rounded-xl border-2 border-accent/40 bg-gradient-to-r from-blue-50 via-white to-blue-50 shadow-sm md:flex-row md:items-center ${
        hasListings ? "p-3" : "p-4"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white">
          <Globe size={18} />
        </span>
        <p className="text-content font-pmedium text-slate-700">{message}</p>
      </div>
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 md:ml-auto">
        {hasListings && isAtLimit ? (
          <span
            title="Upgrade your plan to get more listings on wono.co"
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3.5 py-1.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-500 whitespace-nowrap"
          >
            Plan limit reached
          </span>
        ) : (
          <button
            type="button"
            onClick={() => navigate(LISTINGS_ROUTE)}
            className="inline-flex items-center gap-1.5 rounded-full border border-accent bg-accent px-3.5 py-1.5 text-[10px] font-pmedium uppercase tracking-widest text-white whitespace-nowrap hover:opacity-90"
          >
            <Plus size={12} strokeWidth={3} /> Add Listings
          </button>
        )}
        {!alreadyLinked && showVerifyCta && (
          <button
            type="button"
            onClick={() => navigate(LISTINGS_ROUTE, { state: { openVerify: true } })}
            className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-white px-3.5 py-1.5 text-[10px] font-pmedium uppercase tracking-widest text-accent whitespace-nowrap hover:bg-blue-50"
          >
            <Building2 size={12} strokeWidth={3} /> {verifyLabel}
          </button>
        )}
        <button
          type="button"
          onClick={dismissBanner}
          title="Dismiss"
          aria-label="Dismiss listings banner"
          className="flex-shrink-0 p-1.5 text-accent/50 hover:text-accent hover:bg-blue-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default WonoListingsCard;
