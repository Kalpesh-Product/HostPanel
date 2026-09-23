import React, { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import useAxiosPrivate from "../hooks/useAxiosPrivate";

const MASTER_PANEL_BASE_URL =
  String(import.meta.env.VITE_MASTER_PANEL_BE_URL || "").trim() || "https://masterpanel.wono.co";

type PricingRow = {
  itemId: string;
  itemType: "module" | "department";
  label: string;
  priceUsd: number;
  includesModuleIds?: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (selectedModuleIds: string[]) => void;
  isSubmitting?: boolean;
};

// Lets a host pick which add-on modules they want when requesting the
// Custom plan, instead of MasterPanel staff having to guess and ask
// separately. The catalog of selectable modules/departments comes from
// MasterPanel's Plan Pricing settings, but pricing itself is deliberately
// NOT shown here — the host just picks what they want; staff see the
// computed price on their side when reviewing the request.
//
// Sized and framed to match the plan-cards modal it replaces (same dimmed
// backdrop, same max-w-4xl rounded card — see UpgradePlanModal above) rather
// than taking over the full screen, with a back arrow standing in for the
// plan cards' close button.
const CustomPlanModuleSelectionModal: React.FC<Props> = ({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const axios = useAxiosPrivate();
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedModuleIds([]);
    setIsLoading(true);
    axios
      .get(`${MASTER_PANEL_BASE_URL}/api/hosts/plan-pricing`)
      .then((res) => {
        setRows(res?.data?.rows || []);
      })
      .catch(() => {
        setRows([]);
      })
      .finally(() => setIsLoading(false));
  }, [open, axios]);

  const toggleModule = (itemId: string) => {
    setSelectedModuleIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1400] bg-[#0f172a]/45 backdrop-blur-[2px] px-4 py-6 flex items-center justify-center">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] border border-[#dbe5f2] shadow-[0_20px_80px_rgba(15,23,42,0.28)] flex flex-col">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-[#dbe5f2] flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            title="Back"
            className="w-9 h-9 shrink-0 bg-white border border-[#dbe5f2] rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-[#0f1b35]">Choose Your Custom Plan Modules</h1>
            <p className="text-[12px] font-medium text-[#667791] mt-0.5">
              Select the extra modules or departments you want on top of
              everything in Professional. Your request goes to our team for
              review before you're asked to pay.
            </p>
          </div>
        </div>

        {/* Module grid */}
        <div className="px-5 sm:px-6 py-5 overflow-y-auto flex-1">
          {isLoading ? (
            <p className="text-[13px] text-slate-400">Loading modules…</p>
          ) : rows.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {rows.map((row) => {
                const isSelected = selectedModuleIds.includes(row.itemId);
                return (
                  <button
                    key={row.itemId}
                    type="button"
                    onClick={() => toggleModule(row.itemId)}
                    className={`relative flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-[#2563EB] bg-blue-50/60 shadow-sm ring-1 ring-[#2563EB]/30"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                        isSelected
                          ? "bg-[#2563EB] border-[#2563EB] text-white"
                          : "border-slate-300 text-transparent"
                      }`}
                    >
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {row.itemType === "department" && (
                      <span className="text-[9px] uppercase tracking-wider text-blue-500 font-semibold">
                        Department
                      </span>
                    )}
                    <span className="text-[13px] font-medium text-slate-800 pr-5">{row.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] text-slate-400">
              No add-on modules are configured yet — contact our team.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-[#dbe5f2] shrink-0 flex justify-end">
          <button
            type="button"
            onClick={() => onSubmit(selectedModuleIds)}
            disabled={isSubmitting || !selectedModuleIds.length}
            className="px-8 py-2.5 bg-[#2563EB] text-white rounded-xl font-medium text-[13px] shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Sending..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomPlanModuleSelectionModal;
