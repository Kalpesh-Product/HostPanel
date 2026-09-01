/**
 * Pure utility functions for dashboard pages.
 * Kept separate from DashboardShared.tsx so fast-refresh doesn't complain
 * about a file mixing component exports with non-component exports.
 */

import { formatWorkspaceCurrency } from "../../../../lib/workspaceLocalization";

export const fmtINR = (n: number, currency = "INR") =>
  formatWorkspaceCurrency(Number(n || 0), currency, {
    style: "currency",
    maximumFractionDigits: 0,
  });

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

/**
 * Card/link grids on module-driven dashboards (Custom, and every
 * per-department/per-role view) render a count that depends on which
 * modules are enabled — a fixed 4-column grid leaves an ugly gap unless the
 * count happens to be a multiple of 4 (e.g. 6 cards in 4 columns strands 2
 * empty slots on row two). Pick whichever column count (2/3/4) leaves the
 * fewest empty slots for the actual count instead.
 */
export const pickCardCols = (count: number): 1 | 2 | 3 | 4 => {
  if (count <= 1) return 1;
  let best: 1 | 2 | 3 | 4 = Math.min(count, 4) as 1 | 2 | 3 | 4;
  let bestGap = Infinity;
  for (const cols of [4, 3, 2] as const) {
    if (cols > count) continue;
    const gap = (cols - (count % cols)) % cols;
    if (gap < bestGap) {
      bestGap = gap;
      best = cols;
    }
  }
  return best;
};
