export const DEFAULT_WORKSPACE_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_WORKSPACE_CURRENCY = "INR";

export type ZonedDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;
const EXPLICIT_OFFSET_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i;

export function isValidTimeZone(value: unknown): value is string {
  const timeZone = String(value || "").trim();
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(value: unknown, fallback = DEFAULT_WORKSPACE_TIMEZONE): string {
  const timeZone = String(value || "").trim();
  return isValidTimeZone(timeZone) ? timeZone : fallback;
}

export function isValidCurrency(value: unknown): value is string {
  const currency = String(value || "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return false;
  try {
    new Intl.NumberFormat("en", { style: "currency", currency }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function normalizeCurrency(value: unknown, fallback = DEFAULT_WORKSPACE_CURRENCY): string {
  const currency = String(value || "").trim().toUpperCase();
  return isValidCurrency(currency) ? currency : fallback;
}

export function getZonedDateTimeParts(
  value: Date | string | number = new Date(),
  requestedTimeZone = DEFAULT_WORKSPACE_TIMEZONE,
): ZonedDateTimeParts {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid date value");
  const timeZone = normalizeTimeZone(requestedTimeZone);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

export function getZonedDateKey(
  value: Date | string | number = new Date(),
  timeZone = DEFAULT_WORKSPACE_TIMEZONE,
): string {
  const parts = getZonedDateTimeParts(value, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function getZonedTime(
  value: Date | string | number = new Date(),
  timeZone = DEFAULT_WORKSPACE_TIMEZONE,
): string {
  const parts = getZonedDateTimeParts(value, timeZone);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

/**
 * Converts a workspace-local wall-clock value into an absolute UTC Date.
 * This never depends on the Node/Vercel process timezone. Explicit ISO offsets
 * are respected, while timezone-less values are interpreted in `timeZone`.
 */
export function parseWorkspaceDateTime(
  value: unknown,
  requestedTimeZone = DEFAULT_WORKSPACE_TIMEZONE,
): Date {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value !== "string") return new Date(value as any);

  const normalized = value.trim();
  if (EXPLICIT_OFFSET_PATTERN.test(normalized)) return new Date(normalized);

  const match = normalized.match(LOCAL_DATE_TIME_PATTERN);
  if (!match) return new Date(normalized);

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "0", millisecondText = "0"] = match;
  const desired: ZonedDateTimeParts = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
    second: Number(secondText),
  };
  const milliseconds = Number(millisecondText.padEnd(3, "0"));
  if (
    desired.month < 1 || desired.month > 12 || desired.day < 1 || desired.day > 31 ||
    desired.hour < 0 || desired.hour > 23 || desired.minute < 0 || desired.minute > 59 ||
    desired.second < 0 || desired.second > 59
  ) return new Date(Number.NaN);

  const timeZone = normalizeTimeZone(requestedTimeZone);
  const desiredAsUtc = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
    desired.second,
    milliseconds,
  );
  let candidateMillis = desiredAsUtc;

  // Iteratively remove the zone offset. This works with fractional offsets and
  // Vercel's UTC runtime; the verification below rejects DST-skipped wall times.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const observed = getZonedDateTimeParts(new Date(candidateMillis), timeZone);
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
      milliseconds,
    );
    const correction = desiredAsUtc - observedAsUtc;
    if (correction === 0) break;
    candidateMillis += correction;
  }

  const candidate = new Date(candidateMillis);
  const verified = getZonedDateTimeParts(candidate, timeZone);
  const isExact = (Object.keys(desired) as Array<keyof ZonedDateTimeParts>)
    .every((key) => verified[key] === desired[key]);
  return isExact ? candidate : new Date(Number.NaN);
}

export function formatWorkspaceCurrency(
  amount: number,
  currency = DEFAULT_WORKSPACE_CURRENCY,
  locale?: string,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalizeCurrency(currency),
    ...options,
  }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0);
}
