export const DEFAULT_WORKSPACE_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_WORKSPACE_CURRENCY = "INR";

export function normalizeWorkspaceTimeZone(value: unknown): string {
  const timeZone = String(value || "").trim();
  if (!timeZone) return DEFAULT_WORKSPACE_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(0));
    return timeZone;
  } catch {
    return DEFAULT_WORKSPACE_TIMEZONE;
  }
}

export function normalizeWorkspaceCurrency(value: unknown): string {
  const currency = String(value || "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return DEFAULT_WORKSPACE_CURRENCY;
  try {
    new Intl.NumberFormat("en", { style: "currency", currency }).format(0);
    return currency;
  } catch {
    return DEFAULT_WORKSPACE_CURRENCY;
  }
}

export function getWorkspaceDateKey(value: Date | string | number = new Date(), timeZone?: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizeWorkspaceTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getWorkspaceTime(value: Date | string | number = new Date(), timeZone?: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: normalizeWorkspaceTimeZone(timeZone),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}

export function formatWorkspaceCurrency(
  value: number | string | null | undefined,
  currency?: string,
  options: Intl.NumberFormatOptions = {},
): string {
  const amount = Number(value || 0);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: normalizeWorkspaceCurrency(currency),
    ...options,
  }).format(Number.isFinite(amount) ? amount : 0);
}
