// @ts-nocheck
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import useAuth from "../hooks/useAuth";

const RequestCreditsPopup = ({
  isOpen,
  onClose,
  companyId,
  workspaceId,
  onSuccess,
}) => {
  const axios = useAxiosPrivate();
  const { auth } = useAuth();
  const selectedCompany = useSelector((state) => state.company.selectedCompany);
  const [submitting, setSubmitting] = useState(false);
  const [creditsToPurchase, setCreditsToPurchase] = useState(1);
  const [isRequestAlreadySubmitted, setIsRequestAlreadySubmitted] = useState(false);
  const [checkingRequestStatus, setCheckingRequestStatus] = useState(false);
  const [pendingRequestedCredits, setPendingRequestedCredits] = useState(0);

  const finalCompanyId =
    companyId || selectedCompany?.companyId || auth?.user?.companyId || "";
  const finalWorkspaceId =
    workspaceId ||
    selectedCompany?.workspaceId ||
    auth?.user?.primaryWorkspace ||
    auth?.user?.workspaceId ||
    "";

  useEffect(() => {
    let mounted = true;

    const checkExistingRequest = async () => {
      if (!isOpen || !finalCompanyId) return;

      try {
        setCheckingRequestStatus(true);
        const response = await axios.get("/api/website-credits/requests", {
          params: {
            companyId: finalCompanyId,
            status: "pending",
          },
        });
        const pendingRequest = Array.isArray(response?.data) ? response.data?.[0] : null;
        const hasPendingRequest = Boolean(pendingRequest);
        if (mounted) {
          setIsRequestAlreadySubmitted(hasPendingRequest);
          setPendingRequestedCredits(Number(pendingRequest?.requestedCredits || 0));
        }
      } catch {
        if (mounted) {
          setIsRequestAlreadySubmitted(false);
          setPendingRequestedCredits(0);
        }
      } finally {
        if (mounted) {
          setCheckingRequestStatus(false);
        }
      }
    };

    checkExistingRequest();

    return () => {
      mounted = false;
    };
  }, [axios, finalCompanyId, isOpen]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      if (!finalCompanyId || !finalWorkspaceId) {
        toast.error("Company or unit details are missing.");
        return;
      }

      if (isRequestAlreadySubmitted) {
        toast.error("Request already submitted for this company.");
        return;
      }

      await axios.post("/api/website-credits/request", {
        companyId: finalCompanyId,
        workspaceId: finalWorkspaceId,
        requestedCredits: Number(creditsToPurchase || 1),
      });

      toast.success("Credit request submitted successfully.");
      setIsRequestAlreadySubmitted(true);
      if (typeof onSuccess === "function") {
        onSuccess();
      }
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit credit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const pricePerCredit = 50;
  const totalPrice = Number(creditsToPurchase || 0) * pricePerCredit;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h3 className="text-base font-semibold text-gray-900">Request Credits</h3>
        <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Pricing: <span className="font-semibold">Rs 50 = 1 Credit</span>
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
          Total Pricing: <span className="font-semibold">Rs {totalPrice}</span>
        </div>
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
            disabled={submitting || checkingRequestStatus || isRequestAlreadySubmitted}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkingRequestStatus
              ? "Checking..."
              : submitting
                ? "Submitting..."
                : isRequestAlreadySubmitted
                  ? `Request for ${pendingRequestedCredits || 0} credits submitted`
                  : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestCreditsPopup;
