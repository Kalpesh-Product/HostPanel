import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface UploadLimitWarningProps {
  message: string | null;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 7000;

// Inline, in-form warning for upload validation (file size / count / type) —
// deliberately not a browser alert() or a toast, since those get missed or
// look like a generic app error unrelated to the specific field.
const UploadLimitWarning = ({ message, onDismiss }: UploadLimitWarningProps) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-800"
    >
      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss warning"
        className="shrink-0 text-amber-500 hover:text-amber-700"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default UploadLimitWarning;
