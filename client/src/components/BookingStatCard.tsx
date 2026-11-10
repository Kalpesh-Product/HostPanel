import type { ReactNode } from "react";

export type BookingStatTone = "slate" | "blue" | "green" | "amber" | "violet" | "rose" | "teal" | "indigo";

const TONE_CLASSES: Record<BookingStatTone, { border: string; icon: string; label: string }> = {
  slate: { border: "", icon: "bg-slate-50 text-slate-600", label: "text-slate-400" },
  blue: { border: "border-l-4 border-l-blue-500", icon: "bg-blue-50 text-blue-600", label: "text-blue-600" },
  green: { border: "border-l-4 border-l-emerald-500", icon: "bg-emerald-50 text-emerald-600", label: "text-emerald-600" },
  amber: { border: "border-l-4 border-l-amber-500", icon: "bg-amber-50 text-amber-600", label: "text-amber-600" },
  violet: { border: "border-l-4 border-l-violet-500", icon: "bg-violet-50 text-violet-600", label: "text-violet-600" },
  rose: { border: "border-l-4 border-l-rose-500", icon: "bg-rose-50 text-rose-600", label: "text-rose-600" },
  teal: { border: "border-l-4 border-l-teal-500", icon: "bg-teal-50 text-teal-600", label: "text-teal-600" },
  indigo: { border: "border-l-4 border-l-indigo-500", icon: "bg-indigo-50 text-indigo-600", label: "text-indigo-600" },
};

/**
 * Shared KPI stat card for the Bookings module's vertical pages (Meeting
 * Rooms tabs in BookingsPage.tsx, Cafe Orders, Hostel, Co-living, All
 * Booking History). This matches BookingsPage.tsx's existing stat card
 * exactly — rounded-[2rem], a thin colored left accent, icon on the right,
 * and the label tinted to match the accent color — so every vertical's
 * "inside page" cards read the same way as the Meeting Room Bookings tabs.
 */
export default function BookingStatCard({
  icon,
  label,
  value,
  sub,
  tone = "slate",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: BookingStatTone;
}) {
  const toneClasses = TONE_CLASSES[tone];

  return (
    <div
      className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${toneClasses.border}`}
    >
      <div className="min-w-0">
        <p className={`text-[10px] font-pmedium uppercase tracking-widest mb-1 ${toneClasses.label}`}>{label}</p>
        <p className="text-[15px] font-pmedium text-slate-900 truncate">{value}</p>
        {sub ? <p className="mt-1 truncate text-[9px] font-pmedium text-slate-400">{sub}</p> : null}
      </div>
      <div className={`p-2 rounded-2xl shrink-0 ${toneClasses.icon}`}>{icon}</div>
    </div>
  );
}
