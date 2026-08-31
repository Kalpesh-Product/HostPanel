// Parses a "FY 2026-27" style label into a date range, anchored to the
// workspace's fiscal-year start month (fyStartMonth 1-12, default 4 = April).
// A fiscal year always spans exactly 12 months from its start month:
//   - start 4, "FY 2026-27" -> Apr 1 2026 – Mar 31 2027
//   - start 10, "FY 2026-27" -> Oct 1 2026 – Sep 30 2027
//   - start 1, "FY 2026" (single-year label) -> Jan 1 2026 – Dec 31 2026
// The label's end year is decorative; the start year + start month define the range.
export function parseFiscalYearRange(
  fiscalYear?: string | null,
  fyStartMonth = 4,
): { start: Date; end: Date } | null {
  const raw = String(fiscalYear || "").trim();
  const match = raw.match(/FY\s*(\d{2,4})(?:\s*-\s*(\d{2,4}))?/i);
  if (!match) return null;

  const startMonth = Number.isInteger(fyStartMonth) && fyStartMonth >= 1 && fyStartMonth <= 12 ? fyStartMonth : 4;
  const startYear = Number(match[1].length === 2 ? `20${match[1]}` : match[1]);
  if (!Number.isFinite(startYear)) return null;

  const start = new Date(startYear, startMonth - 1, 1, 0, 0, 0, 0);
  const end = new Date(startYear, startMonth - 1 + 12, 0, 23, 59, 59, 999);
  return { start, end };
}
