/**
 * Pure utility functions for dashboard pages.
 * Kept separate from DashboardShared.tsx so fast-refresh doesn't complain
 * about a file mixing component exports with non-component exports.
 */

export const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

export const getGreeting = (hours: number) => {
  if (hours < 12) return "Good Morning";
  if (hours < 17) return "Good Afternoon";
  if (hours < 20) return "Good Evening";
  return "Good Night";
};

export const statusBadgeColor = (status: string) => {
  const s = (status || "").toLowerCase();
  if (["confirmed", "active", "resolved", "completed", "paid"].some((k) => s.includes(k)))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (["pending", "in_progress", "inprogress"].some((k) => s.includes(k)))
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (["cancelled", "rejected", "failed", "closed"].some((k) => s.includes(k)))
    return "bg-red-50 text-red-700 border-red-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
};

export const humanRelTime = (iso: string) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};
