/**
 * Returns the current fiscal year string in the format "FY YYYY-YY".
 * Indian fiscal year runs April – March.
 */
export const getFiscalYearStartMonth = (): number => {
  if (typeof window === "undefined") return 4;
  const value = Number(window.localStorage.getItem("workspaceFiscalYearStartMonth"));
  return Number.isInteger(value) && value >= 1 && value <= 12 ? value : 4;
};

export const getCurrentFiscalYear = (): string => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // April (month=3) onwards → new FY starts
  const fyStartYear = month >= getFiscalYearStartMonth() ? year : year - 1;
  const fyEndYear = fyStartYear + 1;
  return `FY ${fyStartYear}-${String(fyEndYear).slice(2)}`;
};

export const DEFAULT_FISCAL_YEAR = getCurrentFiscalYear();

/**
 * Returns a list of fiscal year options for the dropdown selector.
 * Includes 4 years back (covers historical/imported records) and 1 year ahead.
 */
export const getFiscalYearOptions = (): string[] => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const currentFyStart = month >= getFiscalYearStartMonth() ? year : year - 1;

  const options: string[] = [];
  for (let offset = -4; offset <= 1; offset++) {
    const start = currentFyStart + offset;
    const end = start + 1;
    options.push(`FY ${start}-${String(end).slice(2)}`);
  }
  return options;
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
 * "FY 2026-27" style label.
 */
export const deriveMonthLifecycle = (monthKey: string, fiscalYear: string): MonthLifecycle => {
  const monthIndex = MONTH_KEY_TO_INDEX[String(monthKey || "").trim().toLowerCase().slice(0, 3)];
  const match = /fy\s*(\d{4})\s*-\s*\d{2,4}/i.exec(String(fiscalYear || ""));
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
