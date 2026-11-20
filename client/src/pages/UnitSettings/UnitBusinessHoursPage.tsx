import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, Loader2, Save } from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import TimePicker12h, { formatTime12hLabel } from "../../components/ui/TimePicker12h";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { getWorkspaceSettings, updateWorkspaceSettings } from "../../services/unit-settings";

const TIMEZONE_OPTIONS: string[] = (() => {
  try {
    const supported = (Intl as any).supportedValuesOf?.("timeZone");
    if (Array.isArray(supported) && supported.length > 0) return supported;
  } catch {
    // fall through to the curated list below
  }
  return [
    "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "America/Anchorage", "America/Adak", "Pacific/Honolulu",
    "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Asia/Shanghai",
    "Europe/London", "Europe/Paris", "Europe/Berlin",
    "Australia/Sydney", "UTC",
  ];
})();

function formatTimeInZone(timeZone: string): string {
  if (!timeZone) return "-";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone, hour: "2-digit", minute: "2-digit", hour12: true,
    }).format(new Date());
  } catch {
    return "-";
  }
}

export default function UnitBusinessHoursPage() {
  const axiosPrivate = useAxiosPrivate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [businessStart, setBusinessStart] = useState("09:00");
  const [businessEnd, setBusinessEnd] = useState("22:00");
  const [is24Hours, setIs24Hours] = useState(false);
  const [workspaceTimezone, setWorkspaceTimezone] = useState("Asia/Kolkata");
  const [workspaceCurrency, setWorkspaceCurrency] = useState("INR");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getWorkspaceSettings(axiosPrivate);
        const preferences = res?.data?.data?.settings?.preferences;
        const bh = preferences?.businessHours;
        if (mounted && preferences) {
          setBusinessStart(bh?.start || "09:00");
          setBusinessEnd(bh?.end || "22:00");
          setIs24Hours(Boolean(bh?.is24Hours));
          setWorkspaceTimezone(preferences.timezone || "Asia/Kolkata");
          setWorkspaceCurrency(preferences.currency || "INR");
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

  const saveBusinessHours = async () => {
    if (!is24Hours) {
      if (!businessStart || !businessEnd) {
        toast.error("Please set both start and end times.");
        return;
      }
      if (businessStart >= businessEnd) {
        toast.error("Start time must be before end time.");
        return;
      }
    }
    try {
      setIsSaving(true);
      await updateWorkspaceSettings(axiosPrivate, {
        preferences: {
          timezone: workspaceTimezone,
          businessHours: { start: businessStart, end: businessEnd, is24Hours },
        },
      });
      toast.success("Business hours updated successfully.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update business hours.");
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
                  Business Hours
                </h2>
                <p className="text-xs font-pmedium text-slate-500 mt-1">
                  Set operating hours and timezone for the active unit's resources.
                </p>
              </div>
            </div>

            <section className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <span className="rounded-2xl bg-amber-50 p-2 text-amber-600 shrink-0">
                    <Clock className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Business Hours</p>
                    <p className="mt-1 text-[11px] font-pmedium leading-6 text-slate-500">
                      Set operating hours for meeting rooms, walk-ins, and bookings. Applied across all resources.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={saveBusinessHours}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-[10px] font-pmedium shadow-sm transition-all whitespace-nowrap bg-[#2563EB] text-white hover:bg-primary/95 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} strokeWidth={3} />}
                  {isSaving ? "SAVING..." : "SAVE HOURS"}
                </button>
              </div>
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="grid gap-3 sm:grid-cols-2 mb-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Workspace Timezone</label>
                    <select
                      value={workspaceTimezone}
                      onChange={(e) => setWorkspaceTimezone(e.target.value)}
                      className="w-full bg-transparent text-[12px] font-pmedium text-[#0F172A] outline-none cursor-pointer"
                    >
                      {!TIMEZONE_OPTIONS.includes(workspaceTimezone) && workspaceTimezone && (
                        <option value={workspaceTimezone}>{workspaceTimezone}</option>
                      )}
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                    <p className="text-[10px] font-pmedium text-slate-400">Current time there: {formatTimeInZone(workspaceTimezone)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Workspace Currency</p>
                    <p className="mt-1 text-[12px] font-pmedium text-[#0F172A]">{workspaceCurrency || "-"}</p>
                  </div>
                </div>
                <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={is24Hours}
                    onChange={(e) => setIs24Hours(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]/30"
                  />
                  <span className="text-[11px] font-pmedium text-[#0F172A]">Open 24 hours</span>
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Opening Time</label>
                    <TimePicker12h
                      value={businessStart}
                      onChange={setBusinessStart}
                      disabled={is24Hours}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Closing Time</label>
                    <TimePicker12h
                      value={businessEnd}
                      onChange={setBusinessEnd}
                      disabled={is24Hours}
                    />
                  </div>
                </div>
                <p className="mt-3 text-[10px] font-pmedium text-slate-400">
                  Current: {is24Hours ? "Open 24 hours" : `${formatTime12hLabel(businessStart)} – ${formatTime12hLabel(businessEnd)}`}
                </p>
              </div>
            </section>
          </div>
        )}
      </PageFrame>
    </div>
  );
}
