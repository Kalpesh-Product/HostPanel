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
 * Includes 2 years back and 1 year ahead.
 */
export const getFiscalYearOptions = (): string[] => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const currentFyStart = month >= getFiscalYearStartMonth() ? year : year - 1;

  const options: string[] = [];
  for (let offset = -2; offset <= 1; offset++) {
    const start = currentFyStart + offset;
    const end = start + 1;
    options.push(`FY ${start}-${String(end).slice(2)}`);
  }
  return options;
};
