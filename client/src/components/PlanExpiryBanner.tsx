import { Link } from "react-router-dom";

type PlanExpiryBannerProps = {
  expiryDate?: string | null;
  modulesAtRisk?: string[];
};

// Renders only when the server has already flagged the plan as
// "expiring_soon" (set by MasterPanel's planExpiryReminders cron job, the
// same 5-day-before check that also triggers the reminder email) — this
// component does no date math itself, so it can never drift out of sync
// with that email.
const PlanExpiryBanner = ({ expiryDate, modulesAtRisk = [] }: PlanExpiryBannerProps) => {
  const formattedDate = expiryDate
    ? new Date(expiryDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "soon";

  return (
    <div className="w-full bg-amber-500 text-white text-xs sm:text-sm font-semibold text-center py-1.5 px-3 flex items-center justify-center gap-2 flex-wrap">
      <span>
        Your plan expires on {formattedDate}. You'll be downgraded to Basic
        {modulesAtRisk.length ? ` and lose access to: ${modulesAtRisk.join(", ")}` : ""}.
      </span>
      <Link
        to="/profile/plan-billing"
        className="underline underline-offset-2 hover:text-amber-100"
      >
        Renew now
      </Link>
    </div>
  );
};

export default PlanExpiryBanner;
