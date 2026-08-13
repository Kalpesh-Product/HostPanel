import { Country } from "country-state-city";

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

const US_TIMEZONE_BY_STATE: Record<string, string> = {
  alabama: "America/Chicago",
  alaska: "America/Anchorage",
  arizona: "America/Phoenix",
  arkansas: "America/Chicago",
  california: "America/Los_Angeles",
  colorado: "America/Denver",
  connecticut: "America/New_York",
  delaware: "America/New_York",
  florida: "America/New_York",
  georgia: "America/New_York",
  hawaii: "Pacific/Honolulu",
  idaho: "America/Denver",
  illinois: "America/Chicago",
  indiana: "America/Indiana/Indianapolis",
  iowa: "America/Chicago",
  kansas: "America/Chicago",
  kentucky: "America/New_York",
  louisiana: "America/Chicago",
  maine: "America/New_York",
  maryland: "America/New_York",
  massachusetts: "America/New_York",
  michigan: "America/New_York",
  minnesota: "America/Chicago",
  mississippi: "America/Chicago",
  missouri: "America/Chicago",
  montana: "America/Denver",
  nebraska: "America/Chicago",
  nevada: "America/Los_Angeles",
  "new hampshire": "America/New_York",
  "new jersey": "America/New_York",
  "new mexico": "America/Denver",
  "new york": "America/New_York",
  "north carolina": "America/New_York",
  "north dakota": "America/Chicago",
  ohio: "America/New_York",
  oklahoma: "America/Chicago",
  oregon: "America/Los_Angeles",
  pennsylvania: "America/New_York",
  "rhode island": "America/New_York",
  "south carolina": "America/New_York",
  "south dakota": "America/Chicago",
  tennessee: "America/Chicago",
  texas: "America/Chicago",
  utah: "America/Denver",
  vermont: "America/New_York",
  virginia: "America/New_York",
  washington: "America/Los_Angeles",
  "west virginia": "America/New_York",
  wisconsin: "America/Chicago",
  wyoming: "America/Denver",
  "district of columbia": "America/New_York",
};

const CA_TIMEZONE_BY_PROVINCE: Record<string, string> = {
  alberta: "America/Edmonton",
  britishcolumbia: "America/Vancouver",
  manitoba: "America/Winnipeg",
  newbrunswick: "America/Moncton",
  newfoundlandandlabrador: "America/St_Johns",
  novascotia: "America/Halifax",
  ontario: "America/Toronto",
  princeedwardisland: "America/Halifax",
  quebec: "America/Toronto",
  saskatchewan: "America/Regina",
  yukon: "America/Whitehorse",
};

const AU_TIMEZONE_BY_STATE: Record<string, string> = {
  australiancapitalterritory: "Australia/Sydney",
  newsouthwales: "Australia/Sydney",
  northernterritory: "Australia/Darwin",
  queensland: "Australia/Brisbane",
  southaustralia: "Australia/Adelaide",
  tasmania: "Australia/Hobart",
  victoria: "Australia/Melbourne",
  westernaustralia: "Australia/Perth",
};

const COUNTRY_TIMEZONE_FALLBACKS: Record<string, string> = {
  BR: "America/Sao_Paulo",
  CA: "America/Toronto",
  DE: "Europe/Berlin",
  ES: "Europe/Madrid",
  FR: "Europe/Paris",
  GB: "Europe/London",
  ID: "Asia/Jakarta",
  IN: "Asia/Kolkata",
  JP: "Asia/Tokyo",
  MX: "America/Mexico_City",
  NZ: "Pacific/Auckland",
  RU: "Europe/Moscow",
  US: "America/New_York",
  ZA: "Africa/Johannesburg",
  AU: "Australia/Sydney",
};

function normalizeKey(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function resolveCountryCode(countryCodeOrName: unknown): string {
  const raw = String(countryCodeOrName || "").trim();
  if (!raw) return "";
  const allCountries = Country.getAllCountries();
  const byCode = allCountries.find((item) => item.isoCode.toLowerCase() === raw.toLowerCase());
  if (byCode) return byCode.isoCode;
  const byName = allCountries.find((item) => item.name.toLowerCase() === raw.toLowerCase());
  return byName?.isoCode || "";
}

function pickBestTimezone(availableTimeZones: string[] = [], preferred?: string) {
  const zones = Array.from(new Set((availableTimeZones || []).map((zone) => String(zone || "").trim()).filter(Boolean)));
  if (!zones.length) return preferred || DEFAULT_WORKSPACE_TIMEZONE;
  if (preferred && zones.includes(preferred)) return preferred;
  return zones[0];
}

export function inferWorkspaceTimeZone(options: {
  countryCode?: string;
  countryName?: string;
  stateName?: string;
  cityName?: string;
  availableTimeZones?: string[];
} = {}): string {
  const { countryCode, countryName, stateName, availableTimeZones = [] } = options;
  const resolvedCountryCode = resolveCountryCode(countryCode || countryName);
  const normalizedState = normalizeKey(stateName);
  const available = Array.from(new Set(availableTimeZones.map((zone) => String(zone || "").trim()).filter(Boolean)));

  if (available.length <= 1) {
    return pickBestTimezone(available, COUNTRY_TIMEZONE_FALLBACKS[resolvedCountryCode] || DEFAULT_WORKSPACE_TIMEZONE);
  }

  if (resolvedCountryCode === "US") {
    const matched = US_TIMEZONE_BY_STATE[normalizedState];
    return pickBestTimezone(available, matched || COUNTRY_TIMEZONE_FALLBACKS.US);
  }

  if (resolvedCountryCode === "CA") {
    const matched = CA_TIMEZONE_BY_PROVINCE[normalizedState];
    return pickBestTimezone(available, matched || COUNTRY_TIMEZONE_FALLBACKS.CA);
  }

  if (resolvedCountryCode === "AU") {
    const matched = AU_TIMEZONE_BY_STATE[normalizedState];
    return pickBestTimezone(available, matched || COUNTRY_TIMEZONE_FALLBACKS.AU);
  }

  const fallback = COUNTRY_TIMEZONE_FALLBACKS[resolvedCountryCode] || available[0] || DEFAULT_WORKSPACE_TIMEZONE;
  return pickBestTimezone(available, fallback);
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
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: normalizeWorkspaceCurrency(currency),
    ...options,
  }).format(Number.isFinite(amount) ? amount : 0);
}

// Returns just the currency symbol for the given ISO currency (e.g. "₹",
// "$", "£", "AED"), for use in field labels and prefixes.
export function getWorkspaceCurrencySymbol(currency?: string): string {
  const normalized = normalizeWorkspaceCurrency(currency);
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalized,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find((part) => part.type === "currency")?.value || normalized;
  } catch {
    return normalized;
  }
}
