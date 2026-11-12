import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CreditCard, Loader2, ReceiptText, Save } from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { getWorkspaceSettings, updateWorkspaceSettings } from "../../services/unit-settings";
import {
  PAYMENT_METHOD_CATALOG,
  getCountryBillingDefaults,
  normalizeBillingConfig,
  type WorkspaceBillingConfig,
} from "../../lib/workspaceBilling";

export default function UnitBillingPage() {
  const axiosPrivate = useAxiosPrivate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [billing, setBilling] = useState<WorkspaceBillingConfig>(() => getCountryBillingDefaults("IN"));

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getWorkspaceSettings(axiosPrivate);
        const preferences = res?.data?.data?.settings?.preferences;
        if (mounted && preferences) {
          setBilling(normalizeBillingConfig(preferences.billing));
        }
      } catch {
        // keep defaults
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [axiosPrivate]);

  const togglePaymentMethod = (code: string) => {
    if (code === "cash") return;
    setBilling((current) => {
      const exists = current.paymentMethods.some((method) => method.code === code);
      return {
        ...current,
        paymentMethods: exists
          ? current.paymentMethods.filter((method) => method.code !== code)
          : [...current.paymentMethods, PAYMENT_METHOD_CATALOG[code]].filter(Boolean),
      };
    });
  };

  const savePreferences = async () => {
    try {
      setIsSaving(true);
      await updateWorkspaceSettings(axiosPrivate, {
        preferences: { billing },
      });
      toast.success("Tax and payment preferences updated successfully.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update tax and payment preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        {isLoading ? (
          <div className="bg-white/80 rounded-2xl border border-slate-100 shadow-sm min-h-[400px] animate-pulse" />
        ) : (
          <div className="flex flex-col gap-4 text-slate-700 font-sans">
            <div className="mb-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
              <div>
                <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                  Billing & Payments
                </h2>
                <p className="text-xs font-pmedium text-slate-500 mt-1">
                  Manage tax rules and accepted payment methods for the active unit.
                </p>
              </div>
            </div>

            <section className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <span className="rounded-2xl bg-emerald-50 p-2 text-emerald-600 shrink-0">
                    <ReceiptText className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Tax & Payment Preferences</p>
                    <p className="mt-1 text-[11px] font-pmedium leading-6 text-slate-500">
                      These location-level rules drive external and walk-in booking totals, payment evidence, details, and emails.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={savePreferences}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-[10px] font-pmedium shadow-sm transition-all whitespace-nowrap bg-[#2563EB] text-white hover:bg-primary/95 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} strokeWidth={3} />}
                  {isSaving ? "SAVING..." : "SAVE PREFERENCES"}
                </button>
              </div>
              <div className="p-3 sm:p-4 lg:p-5 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span>
                      <span className="block text-xs font-pmedium uppercase tracking-widest text-slate-700">Apply tax</span>
                      <span className="text-xs font-pmedium text-slate-400">Disable for tax-free or externally handled locations.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={billing.tax.enabled}
                      onChange={(event) => setBilling((current) => ({ ...current, tax: { ...current.tax, enabled: event.target.checked } }))}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span>
                      <span className="block text-xs font-pmedium uppercase tracking-widest text-slate-700">Prices include tax</span>
                      <span className="text-xs font-pmedium text-slate-400">Extract tax from the entered price instead of adding it.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={billing.tax.priceIncludesTax}
                      onChange={(event) => setBilling((current) => ({ ...current, tax: { ...current.tax, priceIncludesTax: event.target.checked } }))}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Tax label</span>
                    <input
                      type="text"
                      maxLength={40}
                      value={billing.tax.label}
                      onChange={(event) => setBilling((current) => ({ ...current, tax: { ...current.tax, label: event.target.value } }))}
                      placeholder="VAT, GST, Sales Tax..."
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Tax rate (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={billing.tax.ratePercent}
                      onChange={(event) => setBilling((current) => ({ ...current, tax: { ...current.tax, ratePercent: Math.min(100, Math.max(0, Number(event.target.value) || 0)) } }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                  </label>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <CreditCard size={14} className="text-[#2563EB]" />
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Accepted payment methods</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.values(PAYMENT_METHOD_CATALOG).map((method) => {
                      const checked = billing.paymentMethods.some((entry) => entry.code === method.code);
                      return (
                        <label key={method.code} className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition ${checked ? 'border-blue-200 bg-blue-50/60' : 'border-slate-200 bg-white'} ${method.code === 'cash' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={method.code === "cash"}
                            onChange={() => togglePaymentMethod(method.code)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                          <span>
                            <span className="block text-[11px] font-pmedium text-slate-800">{method.label}</span>
                            <span className="text-[9px] font-pmedium text-slate-400">
                              {method.requiresReference ? 'Reference required' : 'No reference required'} · {method.requiresProof ? 'Proof required' : 'No proof required'}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs font-pmedium text-slate-400">Cash remains available as the universal fallback. Local methods are preselected when a new location is created.</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </PageFrame>
    </div>
  );
}
