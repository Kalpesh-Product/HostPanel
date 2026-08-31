/**
 * Fiscal-year utilities. The workspace can pick its fiscal-year start month in
 * Workspace Settings (preferences.fiscalYearStartMonth, 1-12; synced to
 * localStorage by useWorkspacePreferences). Default is April (4), the Indian FY.
 *
 * Label rules:
 *   - January start  -> single calendar year, e.g. "FY 2026" (Jan–Dec 2026)
 *   - Any other start -> spans two calendar years, e.g. "FY 2026-27" (Apr 2026–Mar 2027)
 */
export const getFiscalYearStartMonth = (): number => {
  if (typeof window === "undefined") return 4;
  const value = Number(window.localStorage.getItem("workspaceFiscalYearStartMonth"));
  return Number.isInteger(value) && value >= 1 && value <= 12 ? value : 4;
};

export const getCurrentFiscalYear = (): string => {
  const startMonth = getFiscalYearStartMonth();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const fyStartYear = month >= startMonth ? year : year - 1;
  if (startMonth === 1) return `FY ${fyStartYear}`;
  return `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;
};

export const DEFAULT_FISCAL_YEAR = getCurrentFiscalYear();

/**
 * Returns a list of fiscal year options for the dropdown selector.
 * Includes 4 years back (covers historical/imported records) and 1 year ahead.
 * Labels follow the workspace's FY start month ("FY 2026" for January starts,
 * "FY 2026-27" otherwise).
 */
export const getFiscalYearOptions = (): string[] => {
  const startMonth = getFiscalYearStartMonth();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const currentFyStart = month >= startMonth ? year : year - 1;

  const options: string[] = [];
  for (let offset = -4; offset <= 1; offset++) {
    const start = currentFyStart + offset;
    const end = start + 1;
    options.push(startMonth === 1 ? `FY ${start}` : `FY ${start}-${String(end).slice(2)}`);
  }
  return options;
};

const CALENDAR_MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * The 12 fiscal month keys ('jan'…'dec') in fiscal order, starting from the
 * workspace's fiscal-year start month — 'apr'-first for the April default,
 * 'jan'-first for a January start, etc. Pages use this to order month
 * dropdowns, draft month pickers and budget tables.
 */
export const getFiscalMonthSequence = (): string[] => {
  const start = getFiscalYearStartMonth() - 1;
  return Array.from({ length: 12 }, (_, i) => CALENDAR_MONTH_KEYS[(start + i) % 12]);
};

const MONTH_KEY_TO_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export type MonthLifecycle = "completed" | "current" | "upcoming";

/**
 * Lifecycle of a fiscal-year month relative to today's date.
 * The stored per-month `status` on DepartmentFinancePlan rows is seeded
 * "Upcoming" at creation and never advanced by the server, so the UI derives
 * the lifecycle from the calendar instead: months before the current calendar
 * month → "completed", the current calendar month → "current", later → "upcoming".
 * monthKey is the 3-letter lowercase key ('apr' … 'mar'); fiscalYear is the
 * "FY 2026-27" or "FY 2026" (January start) style label.
 */
export const deriveMonthLifecycle = (monthKey: string, fiscalYear: string): MonthLifecycle => {
  const monthIndex = MONTH_KEY_TO_INDEX[String(monthKey || "").trim().toLowerCase().slice(0, 3)];
  const match = /fy\s*(\d{4})(?:\s*-\s*\d{2,4})?/i.exec(String(fiscalYear || ""));
  if (monthIndex === undefined || !match) return "upcoming";

  const fyStartYear = Number(match[1]);
  const fyStartMonthIndex = getFiscalYearStartMonth() - 1;
  const calendarYear = monthIndex >= fyStartMonthIndex ? fyStartYear : fyStartYear + 1;

  const now = new Date();
  const nowValue = now.getFullYear() * 12 + now.getMonth();
  const monthValue = calendarYear * 12 + monthIndex;

  if (monthValue < nowValue) return "completed";
  if (monthValue === nowValue) return "current";
  return "upcoming";
};
