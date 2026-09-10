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
  const tipText = tips.join(" | ") || undefined;

  if (rejected) {
    return (
      <span title={tipText} className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[8px] font-pmedium uppercase tracking-widest text-red-700">
        <Clock size={9} /> Rejected
      </span>
    );
  }
  if (changesRequested) {
    return (
      <span title={tipText} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[8px] font-pmedium uppercase tracking-widest text-blue-700">
        <Clock size={9} /> Changes Requested
      </span>
    );
  }
  if (ownerApproved && fmApproved) {
    return (
      <span title={tipText} className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[8px] font-pmedium uppercase tracking-widest text-emerald-700">
        <Check size={9} strokeWidth={3} /> Approved
      </span>
    );
  }
  // One side has approved and the other hasn't — show the approved half in
  // green so it's immediately clear WHO has already signed off, and the
  // still-waiting half in amber so it's clear who hasn't.
  const [approvedLabel, pendingLabel] = ownerApproved
    ? ["Founder Approved", "Finance Manager Pending"]
    : ["Finance Manager Approved", "Founder Pending"];
  return (
    <span title={tipText} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] font-pmedium uppercase tracking-widest">
      <Clock size={9} className="text-amber-500 shrink-0" />
      <span className="text-emerald-600">{approvedLabel}</span>
      <span className="text-slate-300">•</span>
      <span className="text-amber-600">{pendingLabel}</span>
    </span>
  );
}

export default ApprovalFlowBadges;
