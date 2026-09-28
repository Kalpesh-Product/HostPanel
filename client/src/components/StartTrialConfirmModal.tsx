import { createPortal } from "react-dom";
import { CalendarCheck, CheckCircle2, Loader2, X } from "lucide-react";

interface StartTrialConfirmModalProps {
  open: boolean;
  // Trial length from Plan Pricing (Master Panel); null if not configured.
  durationDays: number | null;
  isStarting: boolean;
  onConfirm: () => void;
  onLater: () => void;
}

const formatLongDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

// "Are you sure?" step before a free trial starts. Shows what the trial is and,
// if started now, exactly when it ends. Starts the same way the server does:
// the end is the start time plus the trial length.
const StartTrialConfirmModal = ({
  open,
  durationDays,
  isStarting,
  onConfirm,
  onLater,
}: StartTrialConfirmModalProps) => {
  if (!open) return null;

  const days = durationDays && durationDays > 0 ? durationDays : null;
  const startsOn = new Date();
  const endsOn = days ? new Date(startsOn.getTime() + days * 24 * 60 * 60 * 1000) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center bg-[#0f172a]/55 px-4 py-6 backdrop-blur-[2px]"
      onClick={() => !isStarting && onLater()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#dbe5f2] bg-white p-6 shadow-[0_20px_80px_rgba(15,23,42,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[18px] font-bold text-[#111b33]">
              Start your {days ? `${days}-day ` : ""}free trial?
            </h3>
            <p className="mt-1 text-[13px] text-[#63738d]">
              Try the Professional plan free — no payment needed to begin.
            </p>
          </div>
          <button
            type="button"
            onClick={onLater}
            disabled={isStarting}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d7dfeb] text-[#5c6d84] disabled:opacity-50"
          >
            <X size={15} />
          </button>
        </div>

        {endsOn && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#c8d6f2] bg-[#eef4ff] p-3.5">
            <CalendarCheck size={18} className="mt-0.5 shrink-0 text-[#2d67f0]" />
            <div className="text-[13px] text-[#35507d]">
              <p>
                If you start now, your trial begins <b className="text-[#111b33]">today</b> (
                {formatLongDate(startsOn)}) and ends on{" "}
                <b className="text-[#111b33]">{formatLongDate(endsOn)}</b>.
              </p>
            </div>
          </div>
        )}

        <ul className="mb-5 space-y-2 text-[13px] text-[#4f627d]">
          {[
            "Professional modules unlock across all your business locations straight away.",
            "The trial can be started only once per company.",
            "Renew before it ends to keep Professional — otherwise you go back to the Basic plan.",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#23c35c]" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onLater}
            disabled={isStarting}
            className="h-10 rounded-xl border border-[#d0d8e5] px-5 text-[13px] font-medium text-[#5b6b83] hover:bg-slate-50 disabled:opacity-50"
          >
            Maybe later
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isStarting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2d67f0] px-6 text-[13px] font-medium text-white hover:bg-[#2558d5] disabled:opacity-60"
          >
            {isStarting ? <Loader2 size={14} className="animate-spin" /> : null}
            {isStarting ? "Starting..." : "Start now"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default StartTrialConfirmModal;
