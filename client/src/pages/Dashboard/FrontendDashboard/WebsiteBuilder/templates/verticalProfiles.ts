// What "kind of service" a page is, and how every template should talk about it.
//
// A template controls page STRUCTURE; the profile below controls the wording, the
// call-to-action, the lead flow and the default palette for whichever service a
// business sells. That lets any template serve any vertical: a co-working space
// on the cafe-style template still says "Book a room", not "Reserve a table".

export type ServiceKind = "menu" | "hostel" | "coLiving" | "workation" | "meeting" | "workspace";

// How a service's items are laid out inside a template.
export type Presenter = "menu" | "booking" | "stay" | "workspace";

export type LeadKind =
  | "table-reservation"
  | "stay-enquiry"
  | "tour-visit"
  | "package-enquiry"
  | "meeting-booking"
  | "workspace-enquiry"
  | "general";

export interface ServiceProfile {
  kind: ServiceKind;
  presenter: Presenter;
  leadKind: LeadKind;
  /** Value sent as `inquiryType` with the lead. */
  inquiryType: string;
  labels: {
    /** Section / page heading, e.g. "Menu", "Dorms". */
    listing: string;
    /** Short tag for service cards ("Stay", "Eat & drink"), so cards don't repeat the title. */
    tag: string;
    /** Singular / plural noun for one offering. */
    item: string;
    items: string;
    /** Primary call to action, e.g. "Reserve a table". */
    cta: string;
    /** Button on an individual card. */
    itemCta: string;
    leadTitle: string;
    leadSubmit: string;
    leadSuccess: string;
  };
  /** Shown after a price when the item has no `priceUnit` of its own. */
  defaultPriceUnit: string;
  /** Default palette when the business hasn't picked colours. */
  palette: { bg: string; text: string; accent: string; secondary?: string };
  /** Template id we recommend for this kind of service. */
  recommendedTemplate: string;
}

const PROFILES: Record<ServiceKind, ServiceProfile> = {
  menu: {
    kind: "menu",
    presenter: "menu",
    leadKind: "table-reservation",
    inquiryType: "Table Reservation",
    labels: {
      listing: "Menu",
      tag: "Eat & drink",
      item: "dish",
      items: "dishes",
      cta: "Reserve a table",
      itemCta: "Reserve a table",
      leadTitle: "Reserve a table",
      leadSubmit: "Request reservation",
      leadSuccess: "Thanks! We've received your reservation request and will confirm shortly.",
    },
    defaultPriceUnit: "",
    palette: { bg: "#fff7ed", text: "#2a1a12", accent: "#e4572e" },
    recommendedTemplate: "savor",
  },
  hostel: {
    kind: "hostel",
    presenter: "booking",
    leadKind: "stay-enquiry",
    inquiryType: "Stay Enquiry",
    labels: {
      listing: "Rooms & Dorms",
      tag: "Stay",
      item: "room",
      items: "rooms",
      cta: "Book your stay",
      itemCta: "Book now",
      leadTitle: "Book your stay",
      leadSubmit: "Send booking request",
      leadSuccess: "Thanks! We've received your booking request and will confirm availability shortly.",
    },
    defaultPriceUnit: "per night",
    palette: { bg: "#f3fbfa", text: "#0c2a2e", accent: "#f26b3a" },
    recommendedTemplate: "wayfarer",
  },
  coLiving: {
    kind: "coLiving",
    presenter: "stay",
    leadKind: "stay-enquiry",
    inquiryType: "Stay Enquiry",
    labels: {
      listing: "Rooms",
      tag: "Live",
      item: "room",
      items: "rooms",
      cta: "Schedule a visit",
      itemCta: "Enquire",
      leadTitle: "Enquire about this room",
      leadSubmit: "Send enquiry",
      leadSuccess: "Thanks! Our team will get back to you shortly.",
    },
    defaultPriceUnit: "per month",
    palette: { bg: "#f4f1ea", text: "#26312b", accent: "#5b7f6a" },
    recommendedTemplate: "haven",
  },
  workation: {
    kind: "workation",
    presenter: "stay",
    leadKind: "package-enquiry",
    inquiryType: "Workation Enquiry",
    labels: {
      listing: "Packages",
      tag: "Work & stay",
      item: "package",
      items: "packages",
      cta: "Plan your workation",
      itemCta: "Enquire",
      leadTitle: "Plan your workation",
      leadSubmit: "Send enquiry",
      leadSuccess: "Thanks! We'll share package details and availability shortly.",
    },
    defaultPriceUnit: "",
    palette: { bg: "#eef6f7", text: "#10292f", accent: "#e0803c" },
    recommendedTemplate: "haven",
  },
  meeting: {
    kind: "meeting",
    presenter: "workspace",
    leadKind: "meeting-booking",
    inquiryType: "Meeting Room",
    labels: {
      listing: "Meeting Rooms",
      tag: "Meet",
      item: "room",
      items: "rooms",
      cta: "Book a room",
      itemCta: "Book this room",
      leadTitle: "Book a meeting room",
      leadSubmit: "Request booking",
      leadSuccess: "Thanks! We'll confirm your booking shortly.",
    },
    defaultPriceUnit: "per hour",
    palette: { bg: "#f5f6f8", text: "#14161a", accent: "#3b6cf0" },
    recommendedTemplate: "default",
  },
  workspace: {
    kind: "workspace",
    presenter: "workspace",
    leadKind: "workspace-enquiry",
    inquiryType: "Workspace Enquiry",
    labels: {
      listing: "Spaces",
      tag: "Work",
      item: "space",
      items: "spaces",
      cta: "Book a visit",
      itemCta: "Enquire",
      leadTitle: "Enquire about this space",
      leadSubmit: "Send enquiry",
      leadSuccess: "Thanks! Our team will get back to you shortly.",
    },
    defaultPriceUnit: "",
    palette: { bg: "#f6f7f9", text: "#0b1f3a", accent: "#ffc21a" },
    recommendedTemplate: "commons",
  },
};

export const getServiceProfile = (kind: ServiceKind): ServiceProfile => PROFILES[kind] || PROFILES.workspace;

const norm = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();

/** Same slug rules the builder uses to pick a section form for a service page. */
export const resolveServiceKind = (slugOrName: unknown): ServiceKind => {
  const s = norm(slugOrName);
  if (s.includes("cafe") || s.includes("menu")) return "menu";
  if (s.includes("meeting")) return "meeting";
  if (s.includes("co-living") || s.includes("coliving")) return "coLiving";
  if (s.includes("workation")) return "workation";
  if (s.includes("hostel")) return "hostel";
  return "workspace";
};

/** Maps the site-level `vertical` enum onto a service kind. */
export const kindFromVertical = (vertical: unknown): ServiceKind => {
  const v = norm(vertical);
  if (v === "cafe") return "menu";
  if (v === "hostel") return "hostel";
  if (v === "co-living") return "coLiving";
  if (v === "workation") return "workation";
  if (v === "meeting-rooms") return "meeting";
  return "workspace";
};

/** Human label for a kind, used in "Recommended for your cafe" badges. */
export const KIND_LABEL: Record<ServiceKind, string> = {
  menu: "cafe",
  hostel: "hostel",
  coLiving: "co-living space",
  workation: "workation stay",
  meeting: "meeting rooms",
  workspace: "workspace",
};

/**
 * The template we'd suggest for a set of services. The first kind is treated as the
 * primary one; ties resolve in that order.
 */
export const recommendTemplateForKinds = (kinds: ServiceKind[]): string => {
  const first = kinds.find((k) => k !== "workspace") || kinds[0] || "workspace";
  return getServiceProfile(first).recommendedTemplate;
};
