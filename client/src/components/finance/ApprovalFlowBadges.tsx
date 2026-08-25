import { Check, Clock } from "lucide-react";

interface ApprovalFlowStep {
  status?: string;
  approverName?: string;
  decidedAtLabel?: string;
}

interface ApprovalFlowLike {
  owner?: ApprovalFlowStep;
  financeManager?: ApprovalFlowStep;
}

function stepTip(label: string, step?: ApprovalFlowStep) {
  const parts = [step?.approverName, step?.decidedAtLabel].filter(Boolean);
  return parts.length ? `${label}: ${parts.join(" • ")}` : "";
}

/**
 * True once at least one approval step has been completed (or discussed).
 * Used to decide whether pages should show this chip instead of their
 * generic status pill.
 */
export function hasApprovalProgress(flow?: ApprovalFlowLike | null): boolean {
  return [flow?.owner?.status, flow?.financeManager?.status]
    .some((s) => ["approved", "rejected", "discuss"].includes(String(s || "").toLowerCase()));
}

/**
 * Single compact chip describing where the two-step budget approval stands.
 * - Nobody approved yet  -> renders nothing (pages fall back to the plain
 *   status pill, e.g. "Pending Review").
 * - One step approved    -> e.g. "Finance Mgr Approved".
 * - Both approved        -> green "Approved by Founder & Finance Mgr".
 */
export function ApprovalFlowBadges({ flow }: { flow?: ApprovalFlowLike | null }) {
  const ownerState = String(flow?.owner?.status || "").toLowerCase();
  const fmState = String(flow?.financeManager?.status || "").toLowerCase();
  const ownerApproved = ownerState === "approved";
  const fmApproved = fmState === "approved";

  if ((!ownerApproved && !fmApproved) || ownerState === "rejected" || fmState === "rejected") return null;

  const tips = [stepTip("Founder", flow?.owner), stepTip("Finance Manager", flow?.financeManager)].filter(Boolean);

  let cls: string;
  let text: string;
  if (ownerApproved && fmApproved) {
    cls = "border-emerald-200 bg-emerald-50 text-emerald-700";
    text = "Approved by Founder & Finance Mgr";
  } else if (ownerApproved) {
    cls = "border-amber-200 bg-amber-50 text-amber-700";
    text = "Founder Approved";
  } else {
    cls = "border-amber-200 bg-amber-50 text-amber-700";
    text = "Finance Mgr Approved";
  }

  return (
    <span
      title={tips.join(" | ") || undefined}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-pmedium uppercase tracking-widest ${cls}`}
    >
      {ownerApproved && fmApproved ? <Check size={9} strokeWidth={3} /> : <Clock size={9} />}
      {text}
    </span>
  );
}

export default ApprovalFlowBadges;
