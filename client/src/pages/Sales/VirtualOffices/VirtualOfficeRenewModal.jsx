import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { updateVirtualOffice } from "../../../services/virtual-offices";
import { parseDateForInput, computeTermEnd, formatDisplayDate } from "./virtualOfficeFormUtils";
import useWorkspacePreferences from "../../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../../lib/workspaceLocalization";

function dayAfter(dateValue) {
  const base = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(base.getTime())) return parseDateForInput(new Date());
  base.setDate(base.getDate() + 1);
  return parseDateForInput(base);
}

const inputClass =
  "w-full px-3.5 py-2.5 bg-white border border-slate-200/60 rounded-xl text-[13px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400";

export default function VirtualOfficeRenewModal({ open, record, onClose, onRenewed }) {
  const [rentDate, setRentDate] = useState("");
  const [totalTerm, setTotalTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const workspacePreferences = useWorkspacePreferences();
  const fmt = (v) => formatWorkspaceCurrency(Math.round(Number(v || 0)), workspacePreferences.currency, { maximumFractionDigits: 0 });
  const termEndPreview = useMemo(() => computeTermEnd(rentDate, totalTerm), [rentDate, totalTerm]);

  useEffect(() => {
    if (!open || !record) return;
    setRentDate(dayAfter(record.termEnd));
    setTotalTerm(String(record.totalTerm || ""));
  }, [open, record]);

  const handleRenew = async () => {
    if (!rentDate) {
      toast.error("Choose the new rent start date.");
      return;
    }
    if (!Number(totalTerm) || Number(totalTerm) <= 0) {
      toast.error("Enter the new contract term in months.");
      return;
    }
    setIsSaving(true);
    try {
      const response = await updateVirtualOffice(record._id || record.recordId, {
        rentDate: new Date(rentDate).toISOString(),
        totalTerm: Number(totalTerm),
        status: "Active",
        rentStatus: "Active",
      });
      toast.success("Contract renewed.");
      onRenewed?.(response?.data?.record);
      onClose?.();
    } catch (error) {
      toast.error(error.message || "Failed to renew contract.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] bg-white shadow-2xl border border-white/70">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-pmedium text-slate-800">Renew Contract</h2>
          <button onClick={onClose} type="button" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <p className="text-xs font-pmedium text-slate-500">
            Sets a new rent start date and term for {record.clientName || record.brandName}. The current monthly rent
            of {record.monthlyRent ? fmt(record.monthlyRent) : "the existing amount"} carries over — adjust it separately via Edit if needed.
          </p>
          <label className="block">
            <span className="mb-1 block text-[10px] font-pmedium uppercase tracking-widest text-slate-500">New Rent Start Date</span>
            <input type="date" className={inputClass} value={rentDate} onChange={(e) => setRentDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-pmedium uppercase tracking-widest text-slate-500">New Term (months)</span>
            <input type="number" min="1" className={inputClass} value={totalTerm} onChange={(e) => setTotalTerm(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-pmedium uppercase tracking-widest text-slate-500">New Term End Date (auto-calculated)</span>
            <input
              type="text"
              readOnly
              className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-500`}
              value={termEndPreview ? formatDisplayDate(termEndPreview) : "Set start date & term"}
            />
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} disabled={isSaving} type="button" className="rounded-xl px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 transition hover:bg-slate-100">
            Cancel
          </button>
          <button onClick={handleRenew} disabled={isSaving} type="button" className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {isSaving ? "Renewing..." : "Renew"}
          </button>
        </div>
      </div>
    </div>
  );
}
