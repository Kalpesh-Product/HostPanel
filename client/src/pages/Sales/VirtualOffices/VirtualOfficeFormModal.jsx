import React, { useEffect, useMemo, useState } from "react";
import { Building2, Users, LayoutGrid, Banknote, CreditCard, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createVirtualOffice, updateVirtualOffice } from "../../../services/virtual-offices";
import useWorkspacePreferences from "../../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../../lib/workspaceLocalization";
import {
  EMPTY_FORM,
  buildFormFromRecord,
  computeCalculations,
  validateForm,
  buildSavePayload,
  parseDateForInput,
  computeTermEnd,
  formatDisplayDate,
} from "./virtualOfficeFormUtils";

function Field({ label, required = false, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      {children}
      {error ? <p className="mt-0.5 text-[10px] font-pmedium text-rose-600">{error}</p> : null}
    </label>
  );
}

const inputClass =
  "w-full px-3.5 py-2.5 bg-white border border-slate-200/60 rounded-xl text-[13px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400";

export default function VirtualOfficeFormModal({ open, mode = "create", initialRecord = null, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const workspacePreferences = useWorkspacePreferences();
  const currency = workspacePreferences.currency;
  const fmt = (v) => formatWorkspaceCurrency(Math.round(Number(v || 0)), currency, { maximumFractionDigits: 0 });

  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    setForm(mode === "edit" ? buildFormFromRecord(initialRecord) : { ...EMPTY_FORM });
  }, [open, mode, initialRecord]);

  const recalc = useMemo(() => {
    try {
      return computeCalculations(form);
    } catch {
      return computeCalculations(EMPTY_FORM);
    }
  }, [form]);

  const termEndPreview = useMemo(
    () => computeTermEnd(form.rentDate, form.totalTerm),
    [form.rentDate, form.totalTerm],
  );

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const settlePoc = (key, field, value) => setForm((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));

  const handleSave = async () => {
    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = buildSavePayload(form);
      const response = mode === "edit"
        ? await updateVirtualOffice(initialRecord._id || initialRecord.recordId, payload)
        : await createVirtualOffice(payload);
      const saved = response?.data?.record;
      toast.success(mode === "edit" ? "Virtual office company updated." : "Virtual office company onboarded successfully.");
      onSaved?.(saved);
      onClose?.();
    } catch (error) {
      toast.error(error.message || (mode === "edit" ? "Failed to update virtual office company." : "Failed to onboard virtual office company."));
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-[#0F172A]/40 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-4xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl border border-white/70">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-pmedium text-primary uppercase">
              {mode === "edit" ? "Edit Virtual Office Company" : "Onboard Virtual Office Company"}
            </h2>
            <p className="text-xs font-pmedium text-slate-500 mt-1">Enter company details and rental plan; amounts are calculated automatically.</p>
          </div>
          <button onClick={onClose} type="button" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            <section>
              <h3 className="mb-3 text-xs font-pmedium uppercase tracking-wider text-slate-900 flex items-center gap-2"><Building2 size={14} /> Company Profile</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Client Name" required error={fieldErrors.clientName}>
                  <input className={inputClass} value={form.clientName} onChange={(e) => setField("clientName", e.target.value)} placeholder="e.g. AKIRA BUSINESS SERVICES" />
                </Field>
                <Field label="Brand Name">
                  <input className={inputClass} value={form.brandName} onChange={(e) => setField("brandName", e.target.value)} placeholder="Brand name" />
                </Field>
                <Field label="Sector">
                  <input className={inputClass} value={form.sector} onChange={(e) => setField("sector", e.target.value)} placeholder="e.g. Consulting" />
                </Field>
                <Field label="Service / Package">
                  <input className={inputClass} value={form.serviceName} onChange={(e) => setField("serviceName", e.target.value)} placeholder="e.g. Virtual Office Basic" />
                </Field>
                <Field label="Email">
                  <input className={inputClass} value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="company@example.com" />
                </Field>
                <Field label="Phone">
                  <input className={inputClass} value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+91..." />
                </Field>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-xs font-pmedium uppercase tracking-wider text-slate-900 flex items-center gap-2"><Users size={14} /> Points of Contact</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 p-4">
                  <p className="mb-3 text-[10px] font-pmedium uppercase tracking-widest text-blue-600">HO POC</p>
                  <div className="space-y-3">
                    <Field label="Name" required error={fieldErrors.hoPocName}>
                      <input className={inputClass} value={form.hoPoc.name} onChange={(e) => settlePoc("hoPoc", "name", e.target.value)} />
                    </Field>
                    <Field label="Email"><input className={inputClass} value={form.hoPoc.email} onChange={(e) => settlePoc("hoPoc", "email", e.target.value)} /></Field>
                    <Field label="Phone"><input className={inputClass} value={form.hoPoc.phone} onChange={(e) => settlePoc("hoPoc", "phone", e.target.value)} /></Field>
                    <Field label="Address"><input className={inputClass} value={form.hoPoc.address} onChange={(e) => settlePoc("hoPoc", "address", e.target.value)} /></Field>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 p-4">
                  <p className="mb-3 text-[10px] font-pmedium uppercase tracking-widest text-emerald-600">Local POC</p>
                  <div className="space-y-3">
                    <Field label="Name" required error={fieldErrors.localPocName}>
                      <input className={inputClass} value={form.localPoc.name} onChange={(e) => settlePoc("localPoc", "name", e.target.value)} />
                    </Field>
                    <Field label="Email"><input className={inputClass} value={form.localPoc.email} onChange={(e) => settlePoc("localPoc", "email", e.target.value)} /></Field>
                    <Field label="Phone"><input className={inputClass} value={form.localPoc.phone} onChange={(e) => settlePoc("localPoc", "phone", e.target.value)} /></Field>
                    <Field label="Address"><input className={inputClass} value={form.localPoc.address} onChange={(e) => settlePoc("localPoc", "address", e.target.value)} /></Field>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-xs font-pmedium uppercase tracking-wider text-slate-900 flex items-center gap-2"><LayoutGrid size={14} /> Rental Plan &amp; Calculations</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Open Desks">
                  <input type="number" min="0" className={inputClass} value={form.openDesks} onChange={(e) => setField("openDesks", e.target.value)} />
                </Field>
                <Field label="Open Desk Rate (per day)">
                  <input type="number" min="0" className={inputClass} value={form.openDeskRate} onChange={(e) => setField("openDeskRate", e.target.value)} />
                </Field>
                <Field label="Cabin Desks">
                  <input type="number" min="0" className={inputClass} value={form.cabinDesks} onChange={(e) => setField("cabinDesks", e.target.value)} />
                </Field>
                <Field label="Cabin Desk Rate (per day)">
                  <input type="number" min="0" className={inputClass} value={form.cabinDeskRate} onChange={(e) => setField("cabinDeskRate", e.target.value)} />
                </Field>
                <Field label="Monthly Rent" required error={fieldErrors.monthlyRent}>
                  <input type="number" min="0" className={inputClass} value={form.monthlyRent} onChange={(e) => setField("monthlyRent", e.target.value)} />
                </Field>
                <Field label="Term (months)" required error={fieldErrors.totalTerm}>
                  <input type="number" min="1" className={inputClass} value={form.totalTerm} onChange={(e) => setField("totalTerm", e.target.value)} />
                </Field>
              </div>

              <div className="mt-4 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Open Desks Total", value: fmt(recalc.openTotal) },
                  { label: "Cabin Total", value: fmt(recalc.cabinTotal) },
                  { label: "Total Desks", value: recalc.totalDesks },
                  { label: "Contract Total", value: fmt(recalc.totalContract) },
                  { label: "Security Deposit (25%)", value: fmt(recalc.securityDeposit) },
                  { label: "Advance (rent × months)", value: fmt(recalc.advanceAmount) },
                  { label: "Initial Amount", value: fmt(recalc.initialAmount) },
                  { label: "Meeting Credits", value: recalc.totalMeetingCredits },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-white p-3 shadow-sm">
                    <p className="text-[10px] font-pmedium uppercase tracking-wide text-slate-400">{item.label}</p>
                    <p className="mt-1 text-base font-pmedium text-blue-700">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Annual Increment (%)">
                  <input type="number" min="0" className={inputClass} value={form.annualIncrement} onChange={(e) => setField("annualIncrement", e.target.value)} />
                </Field>
                <Field label="Advance Rent (months)">
                  <input type="number" min="0" className={inputClass} value={form.advanceMonths} onChange={(e) => setField("advanceMonths", e.target.value)} />
                </Field>
                <Field label="Rent Start Date" required error={fieldErrors.rentDate}>
                  <input type="date" className={inputClass} value={parseDateForInput(form.rentDate)} onChange={(e) => setField("rentDate", e.target.value)} />
                </Field>
                <Field label="Term End Date (auto-calculated)">
                  <input
                    type="text"
                    readOnly
                    className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-500`}
                    value={termEndPreview ? formatDisplayDate(termEndPreview) : "Set start date & term"}
                  />
                </Field>
                <Field label="Per-Desk Meeting Credits">
                  <input type="number" min="0" className={inputClass} value={form.perDeskMeetingCredits} onChange={(e) => setField("perDeskMeetingCredits", e.target.value)} />
                </Field>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-xs font-pmedium uppercase tracking-wider text-slate-900 flex items-center gap-2"><Banknote size={14} /> Security Deposit &amp; Notes</h3>
              <label className="flex items-center gap-2 text-sm font-pmedium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.securityDepositPaid}
                  onChange={(e) => setField("securityDepositPaid", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#2563EB] accent-[#2563EB]"
                />
                Security deposit received
              </label>
              <div className="mt-3">
                <Field label="Notes">
                  <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
                </Field>
              </div>
            </section>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} type="button" className="rounded-xl px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 transition hover:bg-slate-100" disabled={isSaving}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {isSaving ? "Saving..." : mode === "edit" ? "Save Changes" : "Onboard Company"}
          </button>
        </div>
      </div>
    </div>
  );
}
