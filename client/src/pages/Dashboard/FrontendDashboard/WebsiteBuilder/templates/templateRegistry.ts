import type { ComponentType } from "react";
import ClassicTemplate from "../ClassicTemplate";
import MinimalSwissTemplate from "./MinimalSwissTemplate";
import FreshStudioTemplate from "./FreshStudioTemplate";
import WarmOrganicTemplate from "./WarmOrganicTemplate";
import EmeraldStudioTemplate from "./EmeraldStudioTemplate";

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  component: ComponentType;
  // Lightweight CSS-based thumbnail swatch (no real screenshot asset yet) —
  // used by the template picker card, not the rendered site itself.
  swatch: { bg: string; fg: string; accent: string; font: string };
  /** If true, the template is still available for rendering but hidden from the picker UI. */
  hidden?: boolean;
}

export const DEFAULT_TEMPLATE_ID = "default";

// Keyed by the `themeVariant` value stored on WebsiteTemplate documents.
// Any themeVariant not present here falls back to DEFAULT_TEMPLATE_ID.
export const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = {
  [DEFAULT_TEMPLATE_ID]: {
    id: DEFAULT_TEMPLATE_ID,
    name: "Classic",
    description: "The original WoNo layout — clean, spacious, corporate.",
    component: ClassicTemplate,
    swatch: {
      bg: "#e9e9e9",
      fg: "#1f1f1f",
      accent: "#3b82f6",
      font: "'Poppins', sans-serif",
    },
  },
  "minimal-swiss": {
    id: "minimal-swiss",
    name: "Minimal Swiss",
    description:
      "Whitespace-heavy, hairline dividers, monochrome + one accent color.",
    component: MinimalSwissTemplate,
    swatch: {
      bg: "#ffffff",
      fg: "#000000",
      accent: "#D7263D",
      font: "'Inter', sans-serif",
    },
    hidden: true,
  },
  "fresh-studio": {
    id: "fresh-studio",
    name: "Fresh Studio",
    description:
      "Clean, structured, and accessible — near-black text on white with a fresh green accent, pill buttons.",
    component: FreshStudioTemplate,
    swatch: {
      bg: "#ffffff",
      fg: "#0e0e0e",
      accent: "#45a57a",
      font: "'Proxima Nova', sans-serif",
    },
  },
  "warm-organic": {
    id: "warm-organic",
    name: "Warm Organic",
    description:
      "Serif headings, blob-cropped imagery, rust/forest/sand palette, soft rounded cards.",
    component: WarmOrganicTemplate,
    swatch: {
      bg: "#F1E6D3",
      fg: "#2B211A",
      accent: "#B85C38",
      font: "Georgia, serif",
    },
  },
  "emerald-studio": {
    id: "emerald-studio",
    name: "Emerald Studio",
    description:
      "Dark emerald canvas, amber gold accents, Fraunces serif headings — elegant and bold.",
    component: EmeraldStudioTemplate,
    swatch: {
      bg: "#052e21",
      fg: "#e7e5e4",
      accent: "#d4a843",
      font: "'Fraunces', Georgia, serif",
    },
  },
  // Backward-compatible renderer alias for previews saved before the rename.
  "figma-make": {
    id: "figma-make",
    name: "Emerald Studio",
    description:
      "Dark emerald canvas, amber gold accents, Fraunces serif headings — elegant and bold.",
    component: EmeraldStudioTemplate,
    swatch: {
      bg: "#052e21",
      fg: "#e7e5e4",
      accent: "#d4a843",
      font: "'Fraunces', Georgia, serif",
    },
    hidden: true,
  },
};

export const resolveTemplate = (
  themeVariant?: string | null,
): TemplateDefinition => {
  const key = String(themeVariant || "").trim();
  return TEMPLATE_REGISTRY[key] || TEMPLATE_REGISTRY[DEFAULT_TEMPLATE_ID];
};
