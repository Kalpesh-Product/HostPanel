export const normalizeDashboardLabel = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
