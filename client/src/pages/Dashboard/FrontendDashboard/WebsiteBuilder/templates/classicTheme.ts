// Per-business colours for the Classic template.
//
// Classic is built from fixed Tailwind classes (light grey page, white header,
// black bands, navy buttons, blue nav underline, yellow highlights). When a
// business picks its own colours (stored in `styleConfig`), this emits CSS that
// re-points those same classes at the chosen background / text / accent. With
// nothing picked it emits nothing, so the existing look is untouched.
import {
  contrastRatio,
  luminance,
  mix,
  normalizeHex,
  rgba,
} from "./emeraldTheme";
import type { ThemeConfig } from "./templateTheme";
import { resolveThemeColors } from "./templateTheme";

const esc = (cls: string) => cls.replace(/([^a-zA-Z0-9_-])/g, "\\$1");

export const CLASSIC_SCOPE = ".classic-scope";

export const buildClassicThemeCss = (
  config?: ThemeConfig | null,
  scope: string = CLASSIC_SCOPE,
): string => {
  if (
    !normalizeHex(config?.bgColor) &&
    !normalizeHex(config?.textColor) &&
    !normalizeHex(config?.accentColor)
  ) {
    return "";
  }
  const { bg, text, accent } = resolveThemeColors("default", config);
  const lightBg = luminance(bg) >= 0.45;

  const raised = lightBg ? mix(bg, "#ffffff", 0.8) : mix(bg, "#ffffff", 0.08);
  const line = mix(bg, text, 0.18);
  const soft = (t: number) => mix(bg, text, t);
  const body = mix(text, bg, 0.2);
  const muted = mix(text, bg, 0.35);
  const faint = mix(text, bg, 0.55);
  // Dark bands (services strip, testimonials, hero fallback) stay dark.
  const deep = lightBg ? mix(text, "#000000", 0.35) : mix(bg, "#000000", 0.4);
  const deepAlt = lightBg ? mix(deep, "#ffffff", 0.08) : mix(deep, "#ffffff", 0.08);
  // Highlights that sit on the dark bands.
  let hl = accent;
  for (let i = 1; i <= 10 && contrastRatio(hl, deep) < 4.5; i++) hl = mix(accent, "#ffffff", i / 10);
  const accentText = contrastRatio(accent, "#111111") >= contrastRatio(accent, "#ffffff") ? "#111111" : "#ffffff";
  const accentHover = luminance(accent) > 0.5 ? mix(accent, "#000000", 0.1) : mix(accent, "#ffffff", 0.15);

  const out: string[] = [];
  const add = (cls: string, decl: string, pseudo = "") =>
    out.push(`${scope} .${esc(cls)}${pseudo}{${decl}}`);
  const both = (cls: string, decl: string, pseudo = "") =>
    out.push(`${scope}.${esc(cls)}${pseudo}{${decl}}`);
  const setText = (...cls: string[]) => cls.forEach((c) => add(c, `color:${text}`));

  // Page + surfaces
  out.push(`${scope}{background-color:${bg};color:${text}}`);
  both("bg-[#efefef]", `background-color:${bg}`);
  add("bg-[#efefef]", `background-color:${bg}`);
  both("bg-[#e9e9e9]", `background-color:${bg}`);
  add("bg-[#e9e9e9]", `background-color:${bg}`);
  add("bg-white", `background-color:${raised}`);
  add("bg-[#ffffff]", `background-color:${raised}`);
  add("bg-white/90", `background-color:${rgba(raised, 0.9)}`);
  add("hover:bg-white", `background-color:${raised}`, ":hover");
  add("bg-slate-50", `background-color:${soft(0.03)}`);
  add("bg-slate-100", `background-color:${soft(0.06)}`);
  add("hover:bg-slate-50", `background-color:${soft(0.03)}`, ":hover");
  add("hover:bg-slate-100", `background-color:${soft(0.06)}`, ":hover");
  add("bg-slate-200", `background-color:${soft(0.1)}`);
  add("bg-slate-300", `background-color:${soft(0.16)}`);
  add("bg-gray-100", `background-color:${soft(0.06)}`);
  add("hover:bg-gray-100", `background-color:${soft(0.06)}`, ":hover");
  add("bg-gray-300", `background-color:${soft(0.16)}`);
  add("border-gray-200", `border-color:${line}`);
  add("border-gray-300", `border-color:${line}`);
  add("border-slate-200", `border-color:${line}`);
  add("border-slate-300", `border-color:${line}`);
  add("border-slate-400", `border-color:${mix(bg, text, 0.3)}`);
  add("border-slate-500", `border-color:${mix(bg, text, 0.4)}`);
  add("hover:border-slate-300", `border-color:${line}`, ":hover");

  // Text
  setText("text-[#1f1f1f]", "text-[#111827]", "text-[#111]", "text-[#000]", "text-[#000000]", "text-black", "text-[#222]", "text-slate-900", "text-gray-800", "text-slate-800");
  add("text-[#374151]", `color:${body}`);
  add("text-slate-700", `color:${body}`);
  add("text-[#6b7280]", `color:${muted}`);
  add("text-slate-600", `color:${muted}`);
  add("text-slate-500", `color:${muted}`);
  add("text-gray-600", `color:${muted}`);
  add("text-gray-500", `color:${muted}`);
  add("text-slate-400", `color:${faint}`);
  add("text-gray-700", `color:${body}`);
  add("text-gray-400", `color:${faint}`);
  add("hover:text-gray-900", `color:${text}`, ":hover");
  add("hover:text-[#000]", `color:${text}`, ":hover");
  add("hover:text-[#111827]", `color:${text}`, ":hover");
  add("hover:text-gray-800", `color:${text}`, ":hover");
  add("hover:text-black", `color:${text}`, ":hover");
  add("placeholder:text-slate-500", `color:${muted}`, "::placeholder");

  // Accent: nav underline, focus borders, buttons, badges
  add("border-[#3b82f6]", `border-color:${accent}`);
  add("hover:border-[#3b82f6]", `border-color:${accent}`, ":hover");
  add("border-[#111827]", `border-color:${accent}`);
  add("focus:border-[#111827]", `border-color:${accent}`, ":focus");
  add("focus:border-black", `border-color:${accent}`, ":focus");
  add("bg-[#111827]", `background-color:${accent};color:${accentText}`);
  add("bg-[#6f6f6f]", `background-color:${accent};color:${accentText}`);
  both("bg-[#111827]", `background-color:${accent};color:${accentText}`);
  add("bg-[#374151]", `background-color:${mix(accent, text, 0.3)}`);
  add("hover:bg-[#1f2937]", `background-color:${accentHover}`, ":hover");
  add("hover:bg-[#111827]", `background-color:${accent};color:${accentText}`, ":hover");
  // Buttons that were plain black (rounded pill) vs black section bands.
  add("bg-black", `background-color:${deep}`);
  out.push(`${scope} .bg-black.rounded-full{background-color:${accent};color:${accentText}}`);
  add("bg-[#1a1a1a]", `background-color:${deepAlt}`);
  add("bg-[#111111]", `background-color:${deepAlt}`);
  add("bg-[#242424]", `background-color:${deep}`);
  add("from-[#232323]", `--tw-gradient-from:${deep} var(--tw-gradient-from-position);--tw-gradient-to:${rgba(deep, 0)} var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)`);
  add("via-[#2d2d2d]", `--tw-gradient-to:${rgba(deepAlt, 0)} var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from),${deepAlt} var(--tw-gradient-via-position),var(--tw-gradient-to)`);
  add("to-[#1a1a1a]", `--tw-gradient-to:${deepAlt} var(--tw-gradient-to-position)`);

  // Yellow highlights on the dark bands
  add("text-[#f7e53f]", `color:${hl}`);
  add("text-[#f1c40f]", `color:${hl}`);
  add("border-[#f7e53f]", `border-color:${hl}`);
  add("border-[#f1dc3a]", `border-color:${accent}`);
  add("border-[#60a5fa]", `border-color:${hl}`);
  out.push(`${scope} .${esc("[&>div]:border-[#f7e53f]")}>div{border-color:${hl}}`);
  out.push(`${scope} .${esc("[&>h2]:text-[#f7e53f]")}>h2{color:${hl}}`);
  for (const y of ["#f4e01a", "#f1dc3a", "#f1c40f"]) {
    out.push(`${scope} .${esc(`[&>div]:border-[${y}]`)}>div{border-color:${hl}}`);
    out.push(`${scope} .${esc(`[&>h2]:text-[${y}]`)}>h2{color:${hl}}`);
  }


  // Less common shades used in a few sections
  setText("text-[#1f2937]", "text-[#2f3b58]", "text-[#1a1a1a]");
  add("hover:text-[#1a1a1a]", `color:${text}`, ":hover");
  add("text-[#4b5563]", `color:${body}`);
  add("text-[#5b6472]", `color:${muted}`);
  add("text-[#9ca3af]", `color:${faint}`);
  add("placeholder:text-gray-400", `color:${faint}`, "::placeholder");
  add("fill-gray-300", `fill:${soft(0.2)}`);
  add("bg-[#f8f8f8]", `background-color:${soft(0.03)}`);
  add("bg-[#f4f4f4]", `background-color:${soft(0.04)}`);
  add("bg-gray-200", `background-color:${soft(0.1)}`);
  add("hover:bg-gray-200", `background-color:${soft(0.1)}`, ":hover");
  add("bg-slate-700", `background-color:${mix(accent, text, 0.3)}`);
  add("border-slate-100", `border-color:${mix(bg, text, 0.1)}`);
  add("border-[#7d7d7d]", `border-color:${mix(bg, text, 0.4)}`);
  add("focus:border-slate-500", `border-color:${accent}`, ":focus");
  add("focus-within:border-[#111827]", `border-color:${accent}`, ":focus-within");
  add("focus:ring-[#111827]", `--tw-ring-color:${accent}`, ":focus");
  add("bg-[#6b7280]", `background-color:${accent};color:${accentText}`);
  add("bg-[#7a7a7a]", `background-color:${accent};color:${accentText}`);
  add("hover:bg-[#656565]", `background-color:${accentHover}`, ":hover");
  add("bg-[#1f1f1f]", `background-color:${deepAlt}`);
  add("text-[#f4e01a]", `color:${hl}`);
  add("border-[#f4e01a]", `border-color:${hl}`);

  return out.join("\n");
};
