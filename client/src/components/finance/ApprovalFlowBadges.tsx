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
 * - Both approved        -> green "Approved".
 */
export function ApprovalFlowBadges({ flow }: { flow?: ApprovalFlowLike | null }) {
  const ownerState = String(flow?.owner?.status || "").toLowerCase();
  const fmState = String(flow?.financeManager?.status || "").toLowerCase();
  const ownerApproved = ownerState === "approved";
  const fmApproved = fmState === "approved";
  const rejected = ownerState === "rejected" || fmState === "rejected";
  const changesRequested = ownerState === "discuss" || fmState === "discuss";

  if (!ownerApproved && !fmApproved && !rejected && !changesRequested) return null;

  const tips = [stepTip("Founder", flow?.owner), stepTip("Finance Manager", flow?.financeManager)].filter(Boolean);

  let cls: string;
  let text: string;
  if (rejected) {
    cls = "border-red-200 bg-red-50 text-red-700";
    text = "Rejected";
  } else if (changesRequested) {
    cls = "border-blue-200 bg-blue-50 text-blue-700";
    text = "Changes Requested";
  } else if (ownerApproved && fmApproved) {
    cls = "border-emerald-200 bg-emerald-50 text-emerald-700";
    text = "Approved";
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
      {ownerApproved && fmApproved && !rejected && !changesRequested ? <Check size={9} strokeWidth={3} /> : <Clock size={9} />}
      {text}
    </span>
  );
}

export default ApprovalFlowBadges;
