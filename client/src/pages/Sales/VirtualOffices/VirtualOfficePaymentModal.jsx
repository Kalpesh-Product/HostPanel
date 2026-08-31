import React, { useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { recordVirtualOfficeRentPayment } from "../../../services/virtual-offices";
import useWorkspacePreferences from "../../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../../lib/workspaceLocalization";

const EMPTY_PAYMENT = {
  monthLabel: "",
  periodStart: "",
  periodEnd: "",
  amount: "",
  transactionId: "",
  paymentMethod: "",
  status: "Paid",
  notes: "",
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-pmedium uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full px-3.5 py-2.5 bg-white border border-slate-200/60 rounded-xl text-[13px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400";

function companyId(record) {
  return record?._id || record?.recordId || "";
}

/**
 * open: whether the modal is visible
 * record: pre-selected company (row-level "Record Payment" action) — optional
 * records: full company list, used to populate the picker when record isn't
 *   pre-selected (main "+ Record Payment" button) — the picker stays editable
 *   either way, so a row-launched entry can still be redirected to another company
 * onClose / onRecorded(updatedRecord)
 */
export default function VirtualOfficePaymentModal({ open, record = null, records = [], onClose, onRecorded }) {
  const [selectedId, setSelectedId] = useState("");
  const [payment, setPayment] = useState(EMPTY_PAYMENT);
  const [saving, setSaving] = useState(false);
  const workspacePreferences = useWorkspacePreferences();
  const fmt = (v) => formatWorkspaceCurrency(Math.round(Number(v || 0)), workspacePreferences.currency, { maximumFractionDigits: 0 });

  const companyOptions = useMemo(
    () => (record ? [record, ...records.filter((r) => companyId(r) !== companyId(record))] : records),
    [record, records],
  );
  const activeRecord = companyOptions.find((r) => companyId(r) === selectedId) || null;

  useEffect(() => {
    if (!open) return;
    setSelectedId(companyId(record));
  }, [open, record]);

  useEffect(() => {
    if (!open || !activeRecord) return;
    setPayment({
      ...EMPTY_PAYMENT,
      amount: activeRecord.monthlyRent || "",
      monthLabel: new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedId]);

  const handleRecordPayment = async () => {
    if (!activeRecord) {
      toast.error("Select a company first.");
      return;
    }
    if (!Number(payment.amount)) {
      toast.error("Enter the payment amount.");
      return;
    }
    setSaving(true);
    try {
      const response = await recordVirtualOfficeRentPayment(companyId(activeRecord), {
        monthLabel: payment.monthLabel,
        periodStart: payment.periodStart || null,
        periodEnd: payment.periodEnd || null,
        amount: Number(payment.amount),
        transactionId: payment.transactionId,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        notes: payment.notes,
      });
      toast.success("Rent payment recorded.");
      onRecorded?.(response?.data?.record);
      onClose?.();
    } catch (error) {
      toast.error(error.message || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[2rem] bg-white shadow-2xl border border-white/70">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-pmedium text-slate-800">Record Rent Payment</h2>
            <p className="mt-0.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">
              {activeRecord ? `${activeRecord.clientName || activeRecord.brandName} · Monthly rent ${fmt(activeRecord.monthlyRent)}` : "Select a company to continue"}
            </p>
          </div>
          <button onClick={onClose} type="button" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <Field label="Company">
            <select className={inputClass} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">Select a company...</option>
              {companyOptions.map((r) => (
                <option key={companyId(r)} value={companyId(r)}>
                  {(r.clientName || r.brandName)} · {r.recordCode}
                </option>
              ))}
            </select>
          </Field>

          {activeRecord ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Month Label">
                <input className={inputClass} value={payment.monthLabel} onChange={(e) => setPayment({ ...payment, monthLabel: e.target.value })} />
              </Field>
              <Field label="Amount">
                <input type="number" min="0" className={inputClass} value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
              </Field>
              <Field label="Period Start">
                <input type="date" className={inputClass} value={payment.periodStart} onChange={(e) => setPayment({ ...payment, periodStart: e.target.value })} />
              </Field>
              <Field label="Period End">
                <input type="date" className={inputClass} value={payment.periodEnd} onChange={(e) => setPayment({ ...payment, periodEnd: e.target.value })} />
              </Field>
              <Field label="Payment Method">
                <input className={inputClass} value={payment.paymentMethod} onChange={(e) => setPayment({ ...payment, paymentMethod: e.target.value })} placeholder="e.g. Bank Transfer" />
              </Field>
              <Field label="Transaction ID">
                <input className={inputClass} value={payment.transactionId} onChange={(e) => setPayment({ ...payment, transactionId: e.target.value })} />
              </Field>
              <Field label="Status">
                <select className={inputClass} value={payment.status} onChange={(e) => setPayment({ ...payment, status: e.target.value })}>
                  <option value="Paid">Paid</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </Field>
              <Field label="Notes">
                <input className={inputClass} value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} />
              </Field>
            </div>
          ) : (
            <p className="py-6 text-center text-xs font-pmedium text-slate-400">Choose a company above to record its rent payment.</p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} disabled={saving} type="button" className="rounded-xl px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 transition hover:bg-slate-100">
            Cancel
          </button>
          <button onClick={handleRecordPayment} disabled={saving || !activeRecord} type="button" className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {saving ? "Saving..." : "Record Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
