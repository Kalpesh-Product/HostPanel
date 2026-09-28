/**
 * Dashboard banner for the verified badge's lifecycle. Only appears when there
 * is something to act on:
 *  - the free 3-month period has about a month (30 days) or less left,
 *  - a paid period is within 5 days of ending,
 *  - the badge has expired.
 * Clicking it opens Verify Business with the renew picker already open.
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, BadgeCheck } from "lucide-react";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";

const FREE_PERIOD_NOTICE_DAYS = 30;
const PAID_PERIOD_NOTICE_DAYS = 5;

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

const VerifiedBadgeNotice = () => {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();

  const { data } = useQuery({
    queryKey: ["verify-business-summary"],
    queryFn: async () => (await axiosPrivate.get("/api/verify-business/summary")).data,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const verification = data?.verification;
  const endsAt: string | null = verification?.verificationExpiresAt || null;
  if (
    !verification ||
    verification.status !== "approved" ||
    verification.paymentStatus !== "paid" ||
    !endsAt
  ) {
    return null;
  }

  const daysLeft = Math.ceil((new Date(endsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const expired = daysLeft <= 0;
  const isFree = Boolean(verification.isFreePeriod);
  const showEnding =
    !expired && daysLeft <= (isFree ? FREE_PERIOD_NOTICE_DAYS : PAID_PERIOD_NOTICE_DAYS);
  if (!expired && !showEnding) return null;

  const message = expired ? (
    <>
      Your <strong>verified badge expired</strong> on {formatDate(endsAt)}. Renew to bring it back on
      your listings.
    </>
  ) : isFree ? (
    <>
      Your <strong>free verified badge ends on {formatDate(endsAt)}</strong> ({daysLeft} day
      {daysLeft === 1 ? "" : "s"} left). Renew for 1 month or 1 year to keep it.
    </>
  ) : (
    <>
      Your <strong>verified badge ends on {formatDate(endsAt)}</strong> ({daysLeft} day
      {daysLeft === 1 ? "" : "s"} left). Renew to keep it.
    </>
  );

  const tone = expired
    ? "border-rose-300/60 bg-rose-50 hover:bg-rose-100 text-rose-800"
    : "border-amber-400/50 bg-amber-50 hover:bg-amber-100 text-amber-800";
  const pill = expired ? "bg-rose-500 border-rose-500" : "bg-amber-500 border-amber-500";
  const iconClass = expired ? "text-rose-600" : "text-amber-600";

  return (
    <div
      data-tour="dashboard-verified-badge-notice"
      role="button"
      tabIndex={0}
      onClick={() => navigate("/key-apps/verify-business?action=renew")}
      onKeyDown={(event) => {
        if (event.key === "Enter") navigate("/key-apps/verify-business?action=renew");
      }}
      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-colors ${tone}`}
    >
      {expired ? (
        <AlertTriangle size={18} className={`flex-shrink-0 ${iconClass}`} />
      ) : (
        <BadgeCheck size={18} className={`flex-shrink-0 ${iconClass}`} />
      )}
      <p className="min-w-0 text-content font-pmedium">{message}</p>
      <span
        className={`ml-auto flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-pmedium uppercase tracking-widest text-white ${pill}`}
      >
        Renew
      </span>
      <ArrowRight size={14} className={`flex-shrink-0 ${iconClass}`} />
    </div>
  );
};

export default VerifiedBadgeNotice;
