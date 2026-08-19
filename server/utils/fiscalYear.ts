// Parses a "FY 2026-27" style label into its Apr 1 – Mar 31 date range.
// Mirrors the client's parseFiscalYearRange (client/src/pages/Finance/AccountingPage.tsx).
export function parseFiscalYearRange(fiscalYear?: string | null): { start: Date; end: Date } | null {
  const raw = String(fiscalYear || "").trim();
  const match = raw.match(/FY\s*(\d{2,4})-(\d{2,4})/i);
  if (!match) return null;

  const startYear = Number(match[1].length === 2 ? `20${match[1]}` : match[1]);
  const endYear = Number(match[2].length === 2 ? `20${match[2]}` : match[2]);
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return null;

  return {
    start: new Date(startYear, 3, 1, 0, 0, 0, 0),
    end: new Date(endYear, 2, 31, 23, 59, 59, 999),
  };
}
