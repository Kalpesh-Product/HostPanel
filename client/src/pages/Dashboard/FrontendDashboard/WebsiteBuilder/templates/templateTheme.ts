// Per-business colours for the templates that support them.
//
// A business can pick a background, text and accent colour in the builder
// (stored in the site's `styleConfig`). Templates that read colours from CSS
// variables (Fresh Studio, Warm Organic) get them from `buildThemeVars`, which
// returns nothing when no custom colour is set, so their own defaults (the
// `var(--t-x, <default>)` fallbacks in the template) stay untouched.
// Emerald Studio and Classic re-point their fixed utility classes instead;
// see emeraldTheme.ts / classicTheme.ts.
import { contrastRatio, luminance, mix, normalizeHex } from "./emeraldTheme";

export type ThemeConfig = {
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
};

type ThemeDefaults = {
  bg: string;
  text: string;
  accent: string;
  // Cards sit lighter than the page on light backgrounds (Warm Organic) or
  // slightly darker (Fresh Studio).
  surfaceUp?: boolean;
};

// The colours each template ships with; shown in the picker as placeholders.
export const THEME_DEFAULTS: Record<string, ThemeDefaults> = {
  "emerald-studio": { bg: "#4a6b96", text: "#ffffff", accent: "#ffffff" },
  "figma-make": { bg: "#4a6b96", text: "#ffffff", accent: "#ffffff" },
  "fresh-studio": { bg: "#0a0a12", text: "#ffffff", accent: "#d94b4b" },
  default: { bg: "#efefef", text: "#1f1f1f", accent: "#3b82f6" },
  "warm-organic": { bg: "#f1e6d3", text: "#2b211a", accent: "#b85c38", surfaceUp: true },
};

export const supportsThemeColors = (templateId?: string | null) =>
  Boolean(THEME_DEFAULTS[String(templateId || "").trim() || "default"]);

export const getThemeDefaults = (templateId?: string | null): ThemeDefaults =>
  THEME_DEFAULTS[String(templateId || "").trim() || "default"] || THEME_DEFAULTS.default;

export const hasCustomTheme = (config?: ThemeConfig | null) =>
  Boolean(
    normalizeHex(config?.bgColor) ||
      normalizeHex(config?.textColor) ||
      normalizeHex(config?.accentColor),
  );

// Nudge `hex` toward the text colour until it reads on `bg` (4.5:1).
const readableAgainst = (hex: string, bg: string, text: string) => {
  let out = hex;
  for (let i = 1; i <= 10 && contrastRatio(out, bg) < 4.5; i++) out = mix(hex, text, i / 10);
  return out;
};

const readableOn = (hex: string) =>
  contrastRatio(hex, "#111111") >= contrastRatio(hex, "#ffffff") ? "#111111" : "#ffffff";

// The colours actually in effect: what the business picked, else the template's
// own, with a readable text colour chosen when only the background was changed.
export const resolveThemeColors = (
  templateId: string | null | undefined,
  config?: ThemeConfig | null,
) => {
  const d = getThemeDefaults(templateId);
  const bgC = normalizeHex(config?.bgColor);
  const bg = bgC || d.bg;
  const text =
    normalizeHex(config?.textColor) ||
    (bgC && contrastRatio(d.text, bgC) < 4.5 ? readableOn(bgC) : d.text);
  return { bg, text, accent: normalizeHex(config?.accentColor) || d.accent };
};

// CSS custom properties for a variable-driven template, or undefined when the
// business has not picked any colour. Only roles that follow from a chosen
// colour are set; everything else keeps the template's own fallback.
export const buildThemeVars = (
  templateId: string | null | undefined,
  config?: ThemeConfig | null,
): Record<string, string> | undefined => {
  if (!hasCustomTheme(config)) return undefined;
  const d = getThemeDefaults(templateId);
  const bgC = normalizeHex(config?.bgColor);
  const textC = normalizeHex(config?.textColor);
  const accC = normalizeHex(config?.accentColor);
  const { bg, text } = resolveThemeColors(templateId, config);
  const vars: Record<string, string> = {};

  if (bgC) {
    const dark = luminance(bgC) < 0.45;
    vars["--t-bg"] = bgC;
    if (d.surfaceUp) {
      vars["--t-surface"] = mix(bgC, "#ffffff", dark ? 0.07 : 0.5);
      vars["--t-surface2"] = mix(bgC, "#ffffff", dark ? 0.12 : 0.3);
      vars["--t-raised"] = mix(bgC, "#ffffff", dark ? 0.1 : 0.75);
    } else {
      vars["--t-surface"] = mix(bgC, dark ? "#ffffff" : "#000000", dark ? 0.06 : 0.05);
      vars["--t-surface2"] = mix(bgC, dark ? "#ffffff" : "#000000", dark ? 0.1 : 0.08);
      vars["--t-raised"] = vars["--t-surface"];
    }
    vars["--t-line"] = mix(bgC, text, 0.2);
  }
  if (textC || text !== d.text) vars["--t-text"] = text;
  // Fresh Studio's translucent body text is tuned for a dark page; give it more
  // weight on a light custom background.
  if (bgC && luminance(bgC) >= 0.45 && !d.surfaceUp) vars["--t-k"] = "1.22";
  if (bgC || textC) vars["--t-muted"] = mix(text, bg, 0.3);
  if (accC) {
    const secondary = mix(accC, "#000000", 0.45);
    vars["--t-accent"] = accC;
    vars["--t-accent-text"] = readableOn(accC);
    vars["--t-accent-light"] = mix(accC, "#ffffff", 0.2);
    vars["--t-accent-dark"] = mix(accC, "#000000", 0.3);
    vars["--t-secondary"] = secondary;
    vars["--t-secondary-text"] = readableOn(secondary);
    vars["--t-secondary-fg"] = readableAgainst(secondary, bg, text);
    vars["--t-tint3"] = mix(secondary, accC, 0.5);
  } else if (bgC || textC) {
    // The default green still has to read on a custom background.
    vars["--t-secondary-fg"] = readableAgainst("#3e5641", bg, text);
    // Same for the template's own accent colour.
    const accent = readableAgainst(d.accent, bg, text);
    if (accent !== d.accent) {
      vars["--t-accent"] = accent;
      vars["--t-accent-text"] = readableOn(accent);
      vars["--t-accent-light"] = mix(accent, "#ffffff", 0.2);
      vars["--t-accent-dark"] = mix(accent, "#000000", 0.3);
    }
  }
  return vars;
};
