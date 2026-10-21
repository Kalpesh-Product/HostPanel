import { Link } from "react-router-dom";
import { X } from "lucide-react";

type PlanExpiryBannerProps = {
  expiryDate?: string | null;
  modulesAtRisk?: string[];
  reminderKey: string;
  canDismiss?: boolean;
  isExpired?: boolean;
  onDismiss?: () => void;
};

// The layout decides when a reminder milestone is due. This component only
// renders the message and lets the current milestone be snoozed.
const PlanExpiryBanner = ({
  expiryDate,
  modulesAtRisk = [],
  reminderKey,
  canDismiss = true,
  isExpired = false,
  onDismiss,
}: PlanExpiryBannerProps) => {
  const formattedDate = expiryDate
    ? new Date(expiryDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "soon";

  return (
    <div className="w-full bg-amber-500 text-white text-xs sm:text-sm font-semibold py-1.5 px-3 flex items-center justify-center gap-2 flex-wrap">
      <div className="flex flex-1 items-center justify-center gap-2 flex-wrap">
        <span>
          {isExpired
            ? `Your plan expired on ${formattedDate}`
            : `Your plan expires on ${formattedDate}. You'll be downgraded to Basic`}
          {modulesAtRisk.length ? ` and lose access to: ${modulesAtRisk.join(", ")}` : ""}.
        </span>
        <Link
          to="/profile/plan-billing"
          className="underline underline-offset-2 hover:text-amber-100"
        >
          Renew now
        </Link>
      </div>
      {canDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Remind me later about plan expiry ${reminderKey}`}
          title="Remind me at the next expiry milestone"
          className="rounded p-1 hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};

export default PlanExpiryBanner;
