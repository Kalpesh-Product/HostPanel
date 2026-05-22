// @ts-nocheck
import { useState } from "react";

const RequestCreditsPopup = ({
  isOpen,
  onClose,
  companyId,
  workspaceId,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [creditsToPurchase, setCreditsToPurchase] = useState(1);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      if (typeof onSuccess === "function") {
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled = true;
  const pricePerCredit = 50;
  const totalPrice = Number(creditsToPurchase || 0) * pricePerCredit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h3 className="text-base font-semibold text-gray-900">Request Credits</h3>
        <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Pricing: <span className="font-semibold">₹50 = 1 Credit</span>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Select Credits (max 5)
          </label>
          <select
            value={creditsToPurchase}
            onChange={(event) => setCreditsToPurchase(Number(event.target.value))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800"
          >
            {[1, 2, 3, 4, 5].map((count) => (
              <option key={count} value={count}>
                {count} Credit{count > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2 text-sm text-gray-700">
          Total Pricing: <span className="font-semibold">₹{totalPrice}</span>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Credit request flow is not configured yet. This placeholder keeps the app stable.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || isSubmitDisabled}
            className="cursor-not-allowed rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white opacity-60"
          >
            {submitting ? "Submitting..." : "Submit (Coming Soon)"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestCreditsPopup;
