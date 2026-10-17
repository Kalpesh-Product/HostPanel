import type { ComponentType } from "react";
import ClassicTemplate from "../ClassicTemplate";
import MinimalSwissTemplate from "./MinimalSwissTemplate";
import FreshStudioTemplate from "./FreshStudioTemplate";
import WarmOrganicTemplate from "./WarmOrganicTemplate";
import EmeraldStudioTemplate from "./EmeraldStudioTemplate";
import SavorTemplate from "./savor/SavorTemplate";
import WayfarerTemplate from "./wayfarer/WayfarerTemplate";
import HavenTemplate from "./haven/HavenTemplate";
import CameliaTemplate from "./camelia/CameliaTemplate";
import CommonsTemplate from "./commons/CommonsTemplate";
import HuddleTemplate from "./huddle/HuddleTemplate";
import TravigoTemplate from "./travigo/TravigoTemplate";
import TulumTemplate from "./tulum/TulumTemplate";
import GrindelwaldTemplate from "./grindelwald/GrindelwaldTemplate";
import LodgeTemplate from "./lodge/LodgeTemplate";
import CaliHostelTemplate from "./caliHostel/CaliHostelTemplate";
import TastycTemplate from "./tastyc/TastycTemplate";
import GrandBarTemplate from "./grandbar/GrandBarTemplate";
import FlowspaceTemplate from "./flowspace/FlowspaceTemplate";
import WorpaceTemplate from "./worpace/WorpaceTemplate";
import WorkscapeTemplate from "./workscape/WorkscapeTemplate";
import QerjaTemplate from "./qerja/QerjaTemplate";
import type { ServiceKind } from "./verticalProfiles";

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
  /**
   * Service kinds this template is recommended for. Purely a suggestion — every template
   * can render every kind of service; the picker just sorts and badges by this.
   */
  recommendedFor?: ServiceKind[];
  /**
   * True when the template can take table reservations / bookings for every service
   * (rich lead forms). The builder then leaves lead capture on for cafe pages too.
   */
  supportsBooking?: boolean;
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
      accent: "#D94B4B",
      font: "'Proxima Nova', sans-serif",
    },
  },
  savor: {
    id: "savor",
    name: "Savor",
    description:
      "Photo-first and menu-led — category browsing, filters and a built-in reservation flow. Made for cafés, works for any service.",
    component: SavorTemplate,
    swatch: {
      bg: "#fff7ed",
      fg: "#2a1a12",
      accent: "#e4572e",
      font: "'Bricolage Grotesque', sans-serif",
    },
    recommendedFor: ["menu"],
    supportsBooking: true,
  },
  tastyc: {
    id: "tastyc",
    name: "Tastyc",
    description:
      "Dark editorial coffee-house style — full-screen roast photography, elegant serif type, menu lists, reservations, working hours and gallery storytelling.",
    component: TastycTemplate,
    swatch: {
      bg: "#06191b",
      fg: "#fffdf8",
      accent: "#cf7736",
      font: "'Playfair Display', Georgia, serif",
    },
    recommendedFor: ["menu"],
    supportsBooking: true,
  },
  grandbar: {
    id: "grandbar",
    name: "Grand Bar",
    description:
      "Nocturnal cocktail-bar design — centered seal, oversized serif typography, arched photography, menu discovery, location storytelling and polished reservations.",
    component: GrandBarTemplate,
    swatch: {
      bg: "#0b1b22",
      fg: "#f2eee7",
      accent: "#aa8867",
      font: "'Cormorant Garamond', Georgia, serif",
    },
    recommendedFor: ["menu"],
    supportsBooking: true,
  },
  wayfarer: {
    id: "wayfarer",
    name: "Wayfarer",
    description:
      "Booking-led — a search bar in the hero, results-style stay lists with filters and a sticky booking card. Made for hostels, works for any service.",
    component: WayfarerTemplate,
    swatch: {
      bg: "#f3fbfa",
      fg: "#0c2a2e",
      accent: "#f26b3a",
      font: "'Sora', sans-serif",
    },
    recommendedFor: ["hostel"],
    supportsBooking: true,
  },
  travigo: {
    id: "travigo",
    name: "Travigo",
    description:
      "Editorial travel style — oversized typography, circular destination photography, room-led browsing and direct hostel booking.",
    component: TravigoTemplate,
    swatch: {
      bg: "#f5f3ed",
      fg: "#111111",
      accent: "#d8ff48",
      font: "'Manrope', sans-serif",
    },
    recommendedFor: ["hostel"],
    supportsBooking: true,
  },
  tulum: {
    id: "tulum",
    name: "Tulum",
    description:
      "Quiet editorial co-living style: a full-bleed video hero with a nightly price, serif headings, sage bands, unit rows and pricing cards. Made for co-living and workation stays, works for any service.",
    component: TulumTemplate,
    swatch: {
      bg: "#f1f1ed",
      fg: "#4f5a53",
      accent: "#8a968f",
      font: "'Cormorant Upright', serif",
    },
    recommendedFor: ["coLiving", "workation"],
    supportsBooking: true,
  },
  grindelwald: {
    id: "grindelwald",
    name: "Grindelwald",
    description:
      "Forest-retreat style: a deep green hero with a round photo and dashed neon rings, a pale intro with stats, a parallax photo, room cards, a photo slider and a closing band. Made for co-living and cabin stays, works for any service.",
    component: GrindelwaldTemplate,
    swatch: {
      bg: "#f8f8f8",
      fg: "#1b3936",
      accent: "#75ff69",
      font: "'Bodoni Moda', serif",
    },
    recommendedFor: ["coLiving", "workation"],
    supportsBooking: true,
  },
  lodge: {
    id: "lodge",
    name: "Lodge",
    description:
      "Rental-house style: a full-bleed photo slider, pill-shaped amenity chips, rolling counters and a dark guest-quote band. Made for hostels and short rentals, works for any service.",
    component: LodgeTemplate,
    swatch: {
      bg: "#ffffff",
      fg: "#1c1f21",
      accent: "#7fa388",
      font: "'Inter', sans-serif",
    },
    recommendedFor: ["hostel"],
    supportsBooking: true,
  },
  "cali-hostel": {
    id: "cali-hostel",
    name: "Cali Hostel",
    description:
      "Cinematic social-hostel style — floating pill navigation, immersive photography, editorial room rows, sticky story scenes and a playful hostel-stamp loader.",
    component: CaliHostelTemplate,
    swatch: {
      bg: "#f2eadb",
      fg: "#171711",
      accent: "#e86d43",
      font: "'Instrument Serif', Georgia, serif",
    },
    recommendedFor: ["hostel"],
    supportsBooking: true,
  },
  haven: {
    id: "haven",
    name: "Haven",
    description:
      "Residence-led — arch-framed photos, room cards with a side-by-side compare view and a visit form on the home page. Made for co-living and workation stays, works for any service.",
    component: HavenTemplate,
    swatch: {
      bg: "#f4f1ea",
      fg: "#26312b",
      accent: "#5b7f6a",
      font: "'Fraunces', Georgia, serif",
    },
    recommendedFor: ["coLiving", "workation"],
    supportsBooking: true,
  },
  camelia: {
    id: "camelia",
    name: "Camelia",
    description:
      "Boutique-resort style — a plain top bar (not a floating pill), a full-bleed hero and a bold geometric sans paired with a light editorial serif. A calmer, quieter alternative to Haven. Made for co-living and workation stays, works for any service.",
    component: CameliaTemplate,
    swatch: {
      bg: "#f6f3ec",
      fg: "#2b2a26",
      accent: "#8a9a86",
      font: "'Poppins', ui-sans-serif, sans-serif",
    },
    recommendedFor: ["coLiving", "workation"],
    supportsBooking: true,
  },
  commons: {
    id: "commons",
    name: "Commons",
    description:
      "Co-working style — a bold headline over a bento grid, an interactive space explorer and a visit form on the home page. Enquiry-led, no plan tables. Made for co-working, works for any service.",
    component: CommonsTemplate,
    swatch: {
      bg: "#f6f7f9",
      fg: "#0b1f3a",
      accent: "#ffc21a",
      font: "'Plus Jakarta Sans', sans-serif",
    },
    recommendedFor: ["workspace"],
    supportsBooking: true,
  },
  huddle: {
    id: "huddle",
    name: "Huddle",
    description:
      "Booking-led — a date, time and duration panel on the home page that filters the rooms, room rows with hourly rates and a rate table. Made for meeting rooms, works for any service.",
    component: HuddleTemplate,
    swatch: {
      bg: "#f5f6f8",
      fg: "#14161a",
      accent: "#3b6cf0",
      font: "'Sora', sans-serif",
    },
    recommendedFor: ["meeting"],
    supportsBooking: true,
  },
  flowspace: {
    id: "flowspace",
    name: "Flowspace",
    description:
      "Warm editorial meeting-room design — oversized typography, cinematic room photography, lime accents, flowing space discovery and booking-led pages.",
    component: FlowspaceTemplate,
    swatch: {
      bg: "#f2efe6",
      fg: "#10110f",
      accent: "#d9ff4f",
      font: "'Inter', sans-serif",
    },
    recommendedFor: ["meeting"],
    supportsBooking: true,
  },
  workscape: {
    id: "workscape",
    name: "Workscape",
    description:
      "Bright editorial meeting-space design — modular photography, oversized offset headings, flexible room discovery and a polished booking flow.",
    component: WorkscapeTemplate,
    swatch: {
      bg: "#ffffff",
      fg: "#20201f",
      accent: "#a99d93",
      font: "'Inter', sans-serif",
    },
    recommendedFor: ["meeting"],
    supportsBooking: true,
  },
  worpace: {
    id: "worpace",
    name: "Worpace",
    description:
      "High-contrast editorial co-working design — oversized typography, warm workspace photography, reservation-led hero, space discovery, community proof and refined motion.",
    component: WorpaceTemplate,
    swatch: {
      bg: "#f7f7e8",
      fg: "#11110f",
      accent: "#11110f",
      font: "'Inter', sans-serif",
    },
    recommendedFor: ["workspace"],
    supportsBooking: true,
  },
  qerja: {
    id: "qerja",
    name: "Qerja",
    description:
      "Confident modern coworking design — deep teal, bright yellow accents, image-led storytelling, flexible space discovery, community proof and polished enquiry flows.",
    component: QerjaTemplate,
    swatch: {
      bg: "#ffffff",
      fg: "#003f3a",
      accent: "#f3c441",
      font: "'Manrope', sans-serif",
    },
    recommendedFor: ["workspace"],
    supportsBooking: true,
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
      "Light steel-blue canvas, frosted panels, white accents and Fraunces serif headings — calm, clean and modern.",
    component: EmeraldStudioTemplate,
    swatch: {
      bg: "#4a6b96",
      fg: "#ffffff",
      accent: "#dbeafe",
      font: "'Fraunces', Georgia, serif",
    },
  },
  // Backward-compatible renderer alias for previews saved before the rename.
  "figma-make": {
    id: "figma-make",
    name: "Emerald Studio",
    description:
      "Light steel-blue canvas, frosted panels, white accents and Fraunces serif headings — calm, clean and modern.",
    component: EmeraldStudioTemplate,
    swatch: {
      bg: "#4a6b96",
      fg: "#ffffff",
      accent: "#dbeafe",
      font: "'Fraunces', Georgia, serif",
    },
    hidden: true,
  },
};

/** Picker-visible template ids recommended for any of the given service kinds, in order. */
export const getRecommendedTemplateIds = (kinds: ServiceKind[]): string[] => {
  const ids: string[] = [];
  kinds.forEach((kind) => {
    Object.values(TEMPLATE_REGISTRY).forEach((template) => {
      if (!template.hidden && template.recommendedFor?.includes(kind) && !ids.includes(template.id)) ids.push(template.id);
    });
  });
  return ids;
};

export const resolveTemplate = (
  themeVariant?: string | null,
): TemplateDefinition => {
  const key = String(themeVariant || "").trim();
  return TEMPLATE_REGISTRY[key] || TEMPLATE_REGISTRY[DEFAULT_TEMPLATE_ID];
};
