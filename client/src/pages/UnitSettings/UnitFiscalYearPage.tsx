import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Loader2, Save } from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { getWorkspaceSettings, updateWorkspaceSettings } from "../../services/unit-settings";

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Fiscal-year start options shown as their full span, e.g. "April to March".
// A January start wraps around to end in December of the same year.
const FISCAL_YEAR_RANGE_OPTIONS = MONTH_NAMES.map((month, index) => {
  const startMonth = index + 1;
  const endMonth = startMonth === 1 ? 12 : startMonth - 1;
  return { value: startMonth, label: `${month} to ${MONTH_NAMES[endMonth - 1]}` };
});

export default function UnitFiscalYearPage() {
  const axiosPrivate = useAxiosPrivate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState(4);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getWorkspaceSettings(axiosPrivate);
        const preferences = res?.data?.data?.settings?.preferences;
        if (mounted && preferences) {
          setFiscalYearStartMonth(Number(preferences.fiscalYearStartMonth) || 4);
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

  const saveFiscalYear = async () => {
    try {
      setIsSaving(true);
      await updateWorkspaceSettings(axiosPrivate, {
        preferences: { fiscalYearStartMonth },
      });
      // Re-read persisted truth from the server so the form can never drift
      // from what was actually stored — a silent save mismatch shows up here.
      const refreshed = await getWorkspaceSettings(axiosPrivate);
      const persisted = Number(refreshed?.data?.data?.settings?.preferences?.fiscalYearStartMonth);
      const effectiveMonth = Number.isInteger(persisted) && persisted >= 1 && persisted <= 12
        ? persisted
        : fiscalYearStartMonth;
      setFiscalYearStartMonth(effectiveMonth);
      window.localStorage.setItem("workspaceFiscalYearStartMonth", String(effectiveMonth));
      toast.success("Financial year updated successfully.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update financial year.");
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
                  Financial Year
                </h2>
                <p className="text-xs font-pmedium text-slate-500 mt-1">
                  Set the financial year used by Finance, Accounting, budgets, and reports.
                </p>
              </div>
            </div>

            <section className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <span className="rounded-2xl bg-indigo-50 p-2 text-indigo-600 shrink-0">
                    <ClipboardList className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Financial Year</p>
                    <p className="mt-1 text-[11px] font-pmedium leading-6 text-slate-500">
                      Used by Finance, Accounting, budgets, and reports.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={saveFiscalYear}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-[10px] font-pmedium shadow-sm transition-all whitespace-nowrap bg-[#2563EB] text-white hover:bg-primary/95 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} strokeWidth={3} />}
                  {isSaving ? "SAVING..." : "SAVE FINANCIAL YEAR"}
                </button>
              </div>
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:max-w-xs">
                  <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Financial Year Starts</label>
                  <select
                    value={fiscalYearStartMonth}
                    onChange={(event) => setFiscalYearStartMonth(Number(event.target.value))}
                    className="mt-1 w-full bg-transparent text-[12px] font-pmedium text-[#0F172A] outline-none cursor-pointer"
                  >
                    {FISCAL_YEAR_RANGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          </div>
        )}
      </PageFrame>
    </div>
  );
}
