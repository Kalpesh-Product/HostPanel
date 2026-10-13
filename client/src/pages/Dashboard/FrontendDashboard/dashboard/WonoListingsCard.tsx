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
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, CheckCircle2, Clock3, Globe, Plus } from "lucide-react";
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

  const statusKey = !hasListings ? "pitch" : liveCount === 0 ? "reviewing" : isAtLimit ? "limit" : "live";

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

  const statusHeading = statusKey === "reviewing"
    ? "Listing review in progress"
    : statusKey === "live"
      ? "Your business is live"
      : statusKey === "limit"
        ? "Listing plan limit reached"
        : "Create your first listing";
  const nextActionLabel = statusKey === "reviewing"
    ? "Complete Company Profile"
    : statusKey === "live"
      ? "Manage Listings"
      : statusKey === "limit"
        ? "Review Your Listings"
        : "Create Your First Listing";
  const nextActionRoute = statusKey === "reviewing" ? "/profile/company-profile" : LISTINGS_ROUTE;
  const StatusIcon = statusKey === "reviewing" ? Clock3 : statusKey === "live" ? CheckCircle2 : Globe;

  return (
    <div
      data-tour="dashboard-wono-listings"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-l-4 border-l-amber-500 p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <StatusIcon size={19} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-pmedium uppercase tracking-widest text-amber-600">Account Status</p>
            <h2 className="mt-0.5 text-sm font-pmedium text-slate-900 sm:text-base">{statusHeading}</h2>
          </div>
        </div>
        <p className="mt-3 text-content font-pmedium leading-relaxed text-slate-600">{message}</p>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Recommended Next Action</p>
            <p className="mt-0.5 text-content font-pmedium text-slate-800">{nextActionLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(nextActionRoute)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[11px] font-pmedium uppercase tracking-wider text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {nextActionLabel} <ArrowRight size={14} />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5">
        {hasListings && !isAtLimit && statusKey !== "reviewing" && (
          <button type="button" onClick={() => navigate(LISTINGS_ROUTE)} className="inline-flex items-center gap-1.5 text-[10px] font-pmedium uppercase tracking-wider text-primary hover:underline">
            <Plus size={12} strokeWidth={3} /> Add Listings
          </button>
        )}
        {!alreadyLinked && showVerifyCta && (
          <button
            type="button"
            onClick={() => navigate(LISTINGS_ROUTE, { state: { openVerify: true } })}
            className="inline-flex items-center gap-1.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-500 hover:text-primary"
          >
            <Building2 size={12} strokeWidth={3} /> {verifyLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default WonoListingsCard;
