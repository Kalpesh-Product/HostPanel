// Helpers shared by the new templates (Savor, Wayfarer, Haven).
import type { CSSProperties } from "react";
import { api } from "../../../../../utils/axios";
import { buildThemeVars, resolveThemeColors } from "./templateTheme";
import { contrastRatio, luminance, mix } from "./emeraldTheme";
import { formatTime12h } from "./leadForms";
import type { OpeningHoursRow } from "./offeringFields";
import { WEEKDAYS } from "./offeringFields";
import type { Service } from "./serviceAdapter";
import {
  getServiceProfile,
  kindFromVertical,
  type ServiceKind,
  type ServiceProfile,
} from "./verticalProfiles";

/** The service the site is "about": the one matching its `vertical`, else the first. */
export const resolvePrimaryService = (draft: any, services: Service[]): Service | null => {
  if (!services.length) return null;
  const wanted = kindFromVertical(draft?.vertical);
  return services.find((s) => s.kind === wanted) || services.find((s) => s.kind !== "workspace") || services[0];
};

export const resolvePrimaryKind = (draft: any, primary: Service | null): ServiceKind =>
  primary?.kind || kindFromVertical(draft?.vertical);

/** Colours for a template: what the business picked, else the vertical's own palette. */
export const buildTemplateVars = (
  templateId: string,
  draft: any,
  profile: ServiceProfile,
): CSSProperties => {
  const config = draft?.styleConfig || {};
  const merged = {
    bgColor: config.bgColor || profile.palette.bg,
    textColor: config.textColor || profile.palette.text,
    accentColor: config.accentColor || profile.palette.accent,
  };
  const vars: Record<string, string> = { ...(buildThemeVars(templateId, merged) || {}) };
  // Banners, footers and dark panels need a genuinely dark surface. On a light palette that is
  // the text colour; on a dark palette the text colour is light, so use a deeper shade of the
  // background instead (and the light text colour on top of it).
  const { bg, text } = resolveThemeColors(templateId, merged);
  const darkPalette = luminance(bg) < 0.45;
  vars["--t-ink"] = darkPalette ? mix(bg, "#000000", 0.45) : text;
  vars["--t-on-ink"] = darkPalette ? text : bg;
  // Bright accents (yellow, lime) are fine as button fills but unreadable as small text on a light
  // page. Labels, links and prices use this readable shade of the same colour instead.
  const { accent } = resolveThemeColors(templateId, merged);
  let accentFg = accent;
  if (contrastRatio(accent, bg) < 2.6) {
    for (let i = 1; i <= 10 && contrastRatio(accentFg, bg) < 4.5; i++) accentFg = mix(accent, text, i / 10);
  }
  vars["--t-accent-fg"] = accentFg;

  // A vertical's own second colour (hostel green). It is dropped as soon as the owner picks an
  // accent of their own, so a custom colour never fights a preset partner colour.
  const secondary = !config.accentColor ? profile.palette.secondary : undefined;
  if (secondary) {
    let secondaryFg = secondary;
    for (let i = 1; i <= 10 && contrastRatio(secondaryFg, bg) < 4.5; i++) secondaryFg = mix(secondary, text, i / 10);
    vars["--t-secondary"] = secondary;
    vars["--t-secondary-fg"] = secondaryFg;
    vars["--t-secondary-text"] = contrastRatio(secondary, "#111111") >= contrastRatio(secondary, "#ffffff") ? "#111111" : "#ffffff";
  }
  return vars as CSSProperties;
};

export const averageRating = (testimonials: any[]) => {
  const rated = (testimonials || []).filter((item) => Number(item?.rating) > 0);
  if (!rated.length) return { avg: 0, count: 0 };
  const sum = rated.reduce((total, item) => total + Number(item.rating), 0);
  return { avg: Math.round((sum / rated.length) * 10) / 10, count: rated.length };
};

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const toMinutes = (hhmm: string) => {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : NaN;
};

/** "Open now · until 9:00 PM" style status from structured opening hours. */
export const openStatus = (rows: OpeningHoursRow[] | undefined, now = new Date()) => {
  const row = (rows || []).find((r) => r.day === DAY_KEYS[now.getDay()]);
  if (!row) return null;
  if (row.closed) return { open: false, text: "Closed today" };
  const open = toMinutes(row.open);
  let close = toMinutes(row.close);
  if (!Number.isFinite(open) || !Number.isFinite(close)) return null;
  if (close <= open) close += 24 * 60;
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes >= open && minutes < close) return { open: true, text: `Open now · until ${formatTime12h(row.close)}` };
  if (minutes < open) return { open: false, text: `Opens today at ${formatTime12h(row.open)}` };
  return { open: false, text: "Closed for today" };
};

/** Consecutive days with identical hours are merged: "Mon – Fri  9:00 AM – 9:00 PM". */
export const groupOpeningHours = (rows: OpeningHoursRow[] | undefined) => {
  const label = (key: string) => WEEKDAYS.find((d) => d.key === key)?.label.slice(0, 3) || key;
  const text = (row: OpeningHoursRow) =>
    row.closed ? "Closed" : `${formatTime12h(row.open)} – ${formatTime12h(row.close)}`;
  const groups: { days: string[]; hours: string }[] = [];
  (rows || []).forEach((row) => {
    const hours = text(row);
    const last = groups[groups.length - 1];
    if (last && last.hours === hours) last.days.push(row.day);
    else groups.push({ days: [row.day], hours });
  });
  return groups.map((group) => ({
    days: group.days.length > 1 ? `${label(group.days[0])} – ${label(group.days[group.days.length - 1])}` : label(group.days[0]),
    hours: group.hours,
  }));
};

/** Posts a lead the same way the built-in lead form does. */
export const postWebsiteLead = (draft: any, fields: Record<string, unknown>) =>
  api.post("/api/leads/create-lead", {
    source: "Website Preview",
    companyName: draft?.companyName || "",
    companyId: draft?.companyId || "",
    workspaceId: draft?.workspaceId || "",
    searchKey: draft?.searchKey || "",
    vertical: draft?.vertical || "",
    websiteUrl: window.location.href,
    ...fields,
  });

/** "₹500" + "per night" -> "₹500 / night". */
export const priceWithUnit = (price: string, unit: string) => {
  if (!price) return "";
  const cleaned = String(unit || "").replace(/^per\s+/i, "").replace(/^\/\s*/, "").trim();
  return cleaned ? `${price} / ${cleaned}` : price;
};

/** Currency prefix of a free-text price ("₹1,200" -> "₹"). */
export const currencyPrefix = (price: string) => (String(price).match(/^[^\d]*/)?.[0] || "").trim();

/** Founder highlights as separate lines: accepts a list or text, splitting on new lines and commas. */
export const highlightLines = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value])
    .flatMap((entry) => String(entry ?? "").split(/[\n,]+/))
    .map((line) => line.trim())
    .filter(Boolean);

export { getServiceProfile };
