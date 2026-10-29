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
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Building2, Globe, Plus, X } from "lucide-react";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import useAuth from "../../../../hooks/useAuth";
import useNomadListingCapacity, {
  EXISTING_COMPANY_CLAIM_QUERY_KEY,
} from "../../../../hooks/useNomadListingCapacity";

const LISTINGS_ROUTE = "/key-apps/nomad-listings";
const LISTING_REMINDER_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

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

  const statusKey = !hasListings ? "pitch" : liveCount === 0 ? "reviewing" : isAtLimit ? "limit" : "live";
  const dismissStorageKey = `hostpanel_dashboard_listings_banner_dismissed:${companyId}:${statusKey}`;
  const [, setDismissVersion] = useState(0);
  const isDismissed = (() => {
    try {
      const dismissedAt = Number(localStorage.getItem(dismissStorageKey));
      return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < LISTING_REMINDER_SNOOZE_MS;
    } catch {
      return false;
    }
  })();
  const dismissBanner = () => {
    try {
      localStorage.setItem(dismissStorageKey, String(Date.now()));
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
          className="font-bold text-[#2563EB] underline underline-offset-2 hover:opacity-80"
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
          className="font-bold text-[#2563EB] underline underline-offset-2 hover:opacity-80"
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
      className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 shadow-[0_12px_34px_rgba(37,99,235,0.08)] sm:p-6"
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70" />
      <button
        type="button"
        onClick={dismissBanner}
        title="Dismiss"
        aria-label="Dismiss listings banner"
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-blue-300 transition hover:bg-white hover:text-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
      >
        <X size={15} strokeWidth={2.5} />
      </button>

      <div className="relative flex flex-col gap-5 pr-8 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] ring-1 ring-blue-100">
            <Globe size={21} />
          </span>
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">Wono listings</p>
              <span className="rounded-full border border-blue-100 bg-white px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-widest text-[#2563EB] shadow-sm">
                {!hasListings ? "Get discovered" : liveCount === 0 ? "Under review" : isAtLimit ? "Plan limit" : "Live"}
              </span>
            </div>
            <p className="text-sm font-pmedium leading-relaxed text-[#1E3D73] sm:text-base">{message}</p>
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center gap-2 md:justify-end">
          {hasListings && isAtLimit ? (
            <span
              title="Upgrade your plan to get more listings on wono.co"
              className="inline-flex cursor-not-allowed items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-slate-100 px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-500"
            >
              Plan limit reached
            </span>
          ) : (
            <button
              type="button"
              onClick={() => navigate(LISTINGS_ROUTE)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
            >
              <Plus size={12} strokeWidth={3} /> Add Listings
            </button>
          )}
          {!alreadyLinked && showVerifyCta && (
            <button
              type="button"
              onClick={() => navigate(LISTINGS_ROUTE, { state: { openVerify: true } })}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-blue-200 bg-white px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB] transition hover:bg-blue-50"
            >
              <Building2 size={12} strokeWidth={3} /> {verifyLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WonoListingsCard;
