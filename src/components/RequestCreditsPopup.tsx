import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import useAxiosPrivate from "../../client/src/hooks/useAxiosPrivate";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  workspaceId: string;
  onSuccess: () => void;
}

const CREDIT_PRICE = 50;

export default function RequestCreditsPopup({
  isOpen,
  onClose,
  companyId,
  workspaceId,
  onSuccess,
}: Props) {
  const axios = useAxiosPrivate();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "">("");

  const total = useMemo(() => selectedQty * CREDIT_PRICE, [selectedQty]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedQty(1);
      setStatusMessage("");
      setStatusType("");
      setIsSubmitting(false);
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setStatusMessage("");
      setStatusType("");

      await axios.post("/api/website-credits/request", {
        companyId,
        workspaceId,
        requestedCredits: selectedQty,
      });

      setStatusType("success");
      setStatusMessage("Request submitted!");
      onSuccess();

      closeTimerRef.current = setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      const rawMessage = String(error?.response?.data?.message || error?.message || "");
      const lowered = rawMessage.toLowerCase();
      setStatusType("error");
      if (lowered.includes("pending")) {
        setStatusMessage("You already have a pending request");
      } else {
        setStatusMessage("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: { borderRadius: 3, overflow: "hidden" },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <span className="text-lg font-semibold text-slate-900">Request Additional Credits</span>
      </DialogTitle>

      <DialogContent>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">?50 per credit</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((qty) => {
              const isSelected = selectedQty === qty;
              return (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setSelectedQty(qty)}
                  className={`min-w-[44px] rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                    isSelected
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {qty}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-900">Total: ?{total}</p>

          <p className="mt-2 text-xs text-slate-600">
            Your request will be reviewed and credits will be added within 24 hours
          </p>

          {statusMessage ? (
            <p
              className={`mt-3 text-sm font-medium ${
                statusType === "success" ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {statusMessage}
            </p>
          ) : null}
        </div>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={isSubmitting}
          sx={{
            borderRadius: "6px",
            textTransform: "none",
            px: 3,
            py: 1,
            backgroundColor: "#e5e7eb",
            color: "#111111",
            "&:hover": {
              backgroundColor: "#d1d5db",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting}
          sx={{
            borderRadius: "6px",
            textTransform: "none",
            px: 3,
            py: 1,
            backgroundColor: "#2563eb",
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "#1d4ed8",
            },
          }}
        >
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
