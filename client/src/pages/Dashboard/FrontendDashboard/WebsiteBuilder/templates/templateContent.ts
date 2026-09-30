// What an owner can edit on the newer templates (Savor, Wayfarer, Haven, Commons) beyond the
// fields the builder already has: section headings and lines, button wording, which photos fill
// the template's own photo spots, "how it works" steps, and on/off switches for the template's
// extra sections.
//
// The owner's choices are stored on the site as `templateContent`:
//   { copy: { "home.spaces.title": "..." }, images: { "home.community.image1": "<url>" }, steps: [...] }
// Anything left empty falls back to the wording written in the template, so a site that never
// touches this looks exactly as it did before. The placeholders below are that default wording,
// shown greyed in the builder, so they must match the wording written in the templates.
export type SlotType = "text" | "image";

export interface ContentSlot {
  key: string;
  label: string;
  group: string;
  type: SlotType;
  /** The template's own wording (or a description of the default), shown as a placeholder. */
  placeholder: string;
  hint?: string;
}

export interface SectionSwitch {
  key: string; // stored under sectionOverrides.<key>
  label: string;
  hint?: string;
}

export interface StepsDef {
  label: string;
  hint: string;
  withImage: boolean;
  max: number;
  /** The default steps, so the builder can show what the site uses today. */
  defaults: { title: string; body: string }[];
}

export interface TemplateContentDef {
  slots: ContentSlot[];
  switches: SectionSwitch[];
  steps?: StepsDef;
}

export interface ContentStep {
  title: string;
  body: string;
  image: string;
}

export interface TemplateContent {
  copy: Record<string, string>;
  images: Record<string, string>;
  steps: ContentStep[];
}

/* ───────────────────────── slot helpers ───────────────────────── */

const HOME = "Home page";
const SERVICES = "Service pages";
const OTHER = "About and contact pages";
const FOOTER = "Footer";

const text = (key: string, group: string, label: string, placeholder: string, hint?: string): ContentSlot => ({ key, group, label, placeholder, hint, type: "text" });
const image = (key: string, group: string, label: string, hint = "Leave on Automatic to use one of your gallery photos."): ContentSlot => ({ key, group, label, placeholder: "Automatic", hint, type: "image" });

const SAME = "Leave empty to use the wording that fits your business type.";

/* ───────────────────────── per template ───────────────────────── */

export const TEMPLATE_CONTENT: Record<string, TemplateContentDef> = {
  huddle: {
    slots: [
      text("home.finder.title", HOME, "Booking panel: title", "Find a room"),
      text("home.finder.sub", HOME, "Booking panel: line under the title", "Tell us when and how many. We'll show the rooms that fit."),
      text("home.finder.button", HOME, "Booking panel: button", "Show available rooms"),
      text("home.hero.secondaryCta", HOME, "Hero: second button", "See all rooms"),
      text("home.spaces.title", HOME, "Rooms: heading", "Pick a room"),
      text("home.spaces.sub", HOME, "Rooms: line under the heading", "Uses your service description"),
      text("home.steps.title", HOME, "How it works: heading", "Booked in three steps"),
      text("home.rates.title", HOME, "Rates: heading", "Rates at a glance"),
      text("home.rates.sub", HOME, "Rates: line under the heading", "Clear per-hour pricing. Longer bookings are quoted on request."),
      text("home.amenities.title", HOME, "Amenities: heading", "Every room comes ready"),
      text("home.amenities.sub", HOME, "Amenities: line under the heading", "No setup, no surprises. Everything you need for the meeting is already in the room."),
      text("home.reviews.title", HOME, "Reviews: heading", "What teams say", "Shown when you have no ratings yet."),
      text("home.visit.title", HOME, "Booking desk: heading", "Book a meeting room", SAME),
      text("home.visit.formTitle", HOME, "Booking desk: form title", "Request a booking"),
      text("home.visit.formSub", HOME, "Booking desk: line under the form title", "Share the date and time. We'll confirm the room shortly."),
      image("home.community.image1", HOME, "About section: first photo"),
      image("home.community.image2", HOME, "About section: second photo"),
      text("home.about.link", HOME, "About section: link", "Read our story"),
      text("home.reviews.link", HOME, "Reviews: link to all reviews", "All reviews"),
      text("home.reviews.write", HOME, "Reviews: write-a-review button", "Write a review"),
      text("home.contact.button", HOME, "Booking desk: contact button", "Contact us"),
      text("home.services.title", HOME, "Other services: heading", "More under one roof"),
      text("services.index.sub", SERVICES, "Services page: line under the title", "Pick where you'd like to start."),
      text("services.cta.title", SERVICES, "Rooms page: help box title", "Not sure which room you need?"),
      text("services.cta.sub", SERVICES, "Rooms page: help box line", "Tell us the number of people and what the meeting is for. We'll suggest a room."),
      text("services.other.title", SERVICES, "Service page: other services heading", "More under one roof"),
      text("services.related.title", SERVICES, "Room page: more rooms heading", "More rooms"),
      text("about.values.title", OTHER, "About page: values heading", "How we do things"),
      text("about.founders.title", OTHER, "About page: founders heading", "Meet the founders"),
      text("contact.formSub", OTHER, "Contact page: line under the form title", "We usually reply within a day."),
      text("reviews.write", OTHER, "Reviews page: write-a-review button", "Write a review"),
      text("partner.intro", OTHER, "Partner page: text when your own is empty", "Companies, communities and local businesses — tell us how we could work together."),
      text("footer.cta", FOOTER, "Footer: call-to-action line", "Your next meeting starts here."),
    ],
    switches: [
      { key: "home_finder", label: "Booking panel next to the headline", hint: "The date, time, duration and people panel that filters the rooms." },
      { key: "home_rates", label: "Rates table", hint: "An hourly price list. Shown only when at least two rooms have a price." },
      { key: "home_steps", label: "How it works steps" },
      { key: "home_stats", label: "Numbers band (rooms, capacity, hours, rating)" },
      { key: "home_services", label: "Other services on the home page", hint: "Cards for your other service pages. Their photo, heading and line come from each service page's Home card settings." },
    ],
    steps: {
      label: "How it works steps",
      hint: "The three steps shown under the rooms. Leave empty to use the standard three.",
      withImage: false,
      max: 4,
      defaults: [
        { title: "Pick a time", body: "Choose a date, a start time and how long you need the room." },
        { title: "Choose a room", body: "Filter by the number of people and pick the one that fits." },
        { title: "Show up and start", body: "We confirm by phone or email. On the day the screen is on and the room is ready." },
      ],
    },
  },

  commons: {
    slots: [
      text("home.finder.title", HOME, "Search card: title", "Find your space"),
      text("home.finder.sub", HOME, "Search card: line under the title", "Tell us what you need and we'll confirm availability."),
      text("home.finder.button", HOME, "Search card: button", "Find my space"),
      text("home.spaces.title", HOME, "Spaces: heading", "Find your space", SAME),
      text("home.spaces.sub", HOME, "Spaces: line under the heading", "Uses your service description"),
      text("home.amenities.title", HOME, "Amenities: heading", "Everything included, from day one"),
      text("home.amenities.sub", HOME, "Amenities: line under the heading", "The things that make a working day easy, ready when you arrive."),
      text("home.steps.title", HOME, "Tour steps: heading", "From first visit to your own desk"),
      text("home.reviews.title", HOME, "Reviews: heading", "What members say", "Shown when you have no ratings yet."),
      text("home.visit.title", HOME, "Visit panel: heading", "Come and work from here for a day", SAME),
      text("home.visit.formTitle", HOME, "Visit panel: form title", "Schedule a visit"),
      text("home.visit.formSub", HOME, "Visit panel: line under the form title", "Pick a day and we'll show you around."),
      image("home.community.image1", HOME, "About section: large photo"),
      image("home.community.image2", HOME, "About section: second photo"),
      image("home.community.image3", HOME, "About section: third photo"),
      text("services.index.sub", SERVICES, "Services page: line under the title", "Pick where you'd like to start."),
      text("services.cta.title", SERVICES, "Service page: help box title", "Not sure which space fits?"),
      text("services.cta.sub", SERVICES, "Service page: help box line", "Tell us about your team and we'll suggest the best option."),
      text("about.values.title", OTHER, "About page: values heading", "How we do things"),
      text("about.founders.title", OTHER, "About page: founders heading", "Meet the founders"),
      text("contact.formSub", OTHER, "Contact page: line under the form title", "We usually reply within a day."),
      text("footer.cta", FOOTER, "Footer: call-to-action line", "Ready to work from somewhere better?"),
      text("home.hero.secondaryCta", HOME, "Hero: second button", "Explore spaces"),
      text("home.about.link", HOME, "About section: link", "Read our story"),
      text("home.reviews.link", HOME, "Reviews: link to all reviews", "All reviews"),
      text("home.reviews.write", HOME, "Reviews: write-a-review button", "Write a review"),
      text("home.contact.button", HOME, "Visit panel: contact button", "Contact us"),
      text("reviews.write", OTHER, "Reviews page: write-a-review button", "Write a review"),
      text("partner.intro", OTHER, "Partner page: text when your own is empty", "Companies, communities and local businesses — tell us how we could work together."),
      text("services.other.title", SERVICES, "Service page: other services heading", "More under one roof"),
      text("services.related.title", SERVICES, "Service page: more items heading", "More spaces"),
      text("home.services.title", HOME, "Other services: heading", "More under one roof"),
    ],
    switches: [
      { key: "home_services", label: "Other services on the home page", hint: "Cards for your other service pages. Their photo, heading and line come from each service page's Home card settings." },
      { key: "home_finder", label: "Search card on the hero photo" },
      { key: "home_stats", label: "Numbers band (spaces, seats, hours, rating)" },
      { key: "home_steps", label: "Tour steps" },
    ],
    steps: {
      label: "Tour steps",
      hint: "The three steps shown under \"Take a tour\". Leave empty to use the standard three.",
      withImage: true,
      max: 4,
      defaults: [
        { title: "Book a visit", body: "Pick a day and a time that suits you. It takes a minute." },
        { title: "Take a tour", body: "Walk the floor, meet the team and try a desk for yourself." },
        { title: "Pick your space", body: "Choose the desk, cabin or suite that fits, and move in when you're ready." },
      ],
    },
  },

  haven: {
    slots: [
      text("home.rooms.title", HOME, "Rooms: heading", "Find your room", SAME),
      text("home.rooms.sub", HOME, "Rooms: line under the heading", "Uses your service description"),
      text("home.amenities.title", HOME, "Amenities: heading", "Everything you need, already here"),
      text("home.amenities.sub", HOME, "Amenities: line under the heading", "The small things that make everyday life easy, included from day one."),
      text("home.steps.title", HOME, "How it works: heading", "From hello to home", SAME),
      text("home.gallery.title", HOME, "Gallery: heading", "A look around"),
      text("home.visit.title", HOME, "Visit panel: heading", "Come and see it for yourself", SAME),
      text("home.visit.formTitle", HOME, "Visit panel: form title", "Schedule a visit"),
      text("home.visit.formSub", HOME, "Visit panel: line under the form title", "Pick a day and we'll show you around."),
      image("home.community.image1", HOME, "Community section: first photo"),
      image("home.community.image2", HOME, "Community section: second photo"),
      text("services.index.sub", SERVICES, "Services page: line under the title", "Pick where you'd like to start."),
      text("services.cta.title", SERVICES, "Rooms page: help box title", "Not sure which one is right?"),
      text("services.cta.sub", SERVICES, "Rooms page: help box line", "Tell us what you're after and we'll help you choose."),
      text("about.values.title", OTHER, "About page: values heading", "The way we do things"),
      text("about.founders.title", OTHER, "About page: founders heading", "Meet the founders"),
      text("contact.formSub", OTHER, "Contact page: line under the form title", "We usually reply within a day."),
      text("home.hero.secondaryCta", HOME, "Hero: second button", "Explore rooms"),
      text("home.rooms.eyebrow", HOME, "Rooms: small label above the heading", "Rooms"),
      text("home.about.link", HOME, "About section: link", "Read our story"),
      text("home.steps.eyebrow", HOME, "How it works: small label", "How it works"),
      text("home.gallery.eyebrow", HOME, "Gallery: small label", "Gallery"),
      text("home.gallery.link", HOME, "Gallery: link", "All photos"),
      text("home.reviews.link", HOME, "Reviews: link to all reviews", "Read all reviews"),
      text("home.reviews.write", HOME, "Reviews: write-a-review button", "Write a review"),
      text("home.contact.button", HOME, "Visit panel: contact button", "Contact us"),
      text("about.eyebrow", OTHER, "About page: small label", "Our story"),
      text("about.values.eyebrow", OTHER, "About page: values small label", "What we stand for"),
      text("about.founders.eyebrow", OTHER, "About page: founders small label", "Your hosts"),
      text("about.team.eyebrow", OTHER, "About page: team small label", "The team"),
      text("gallery.eyebrow", OTHER, "Gallery page: small label", "Gallery"),
      text("reviews.eyebrow", OTHER, "Reviews page: small label", "Reviews"),
      text("reviews.write", OTHER, "Reviews page: write-a-review button", "Write a review"),
      text("partner.eyebrow", OTHER, "Partner page: small label", "Partnerships"),
      text("partner.intro", OTHER, "Partner page: text when your own is empty", "Businesses, communities and local partners — tell us how we could work together."),
      text("contact.eyebrow", OTHER, "Contact page: small label", "Get in touch"),
      text("services.other.eyebrow", SERVICES, "Service page: other services small label", "Also from us"),
      text("services.other.title", SERVICES, "Service page: other services heading", "More under one roof"),
      text("services.related.title", SERVICES, "Service page: more items heading", "More rooms"),
      text("services.index.eyebrow", SERVICES, "Services page: small label", "What we offer"),
      text("home.services.eyebrow", HOME, "Other services: small label", "Also from us"),
      text("home.services.title", HOME, "Other services: heading", "More under one roof"),
    ],
    switches: [
      { key: "home_services", label: "Other services on the home page", hint: "Cards for your other service pages. Their photo, heading and line come from each service page's Home card settings." },
      { key: "home_facts", label: "Facts strip (rooms, price, minimum stay, next move-in)" },
      { key: "home_steps", label: "How it works" },
    ],
    steps: {
      label: "How it works",
      hint: "Three short steps from enquiry to moving in. Leave empty to use the standard steps.",
      withImage: false,
      max: 4,
      defaults: [
        { title: "Tell us what you need", body: "Share your move-in date and the kind of room you have in mind." },
        { title: "Come and see it", body: "Book a visit, walk through the rooms and meet the people who run the place." },
        { title: "Move in", body: "Confirm your room, settle the paperwork and unpack. We handle the rest." },
      ],
    },
  },

  wayfarer: {
    slots: [
      text("home.stays.title", HOME, "Stays: heading", "Choose your stay", SAME),
      text("home.stays.sub", HOME, "Stays: line under the heading", "Uses your service description"),
      text("home.amenities.title", HOME, "Amenities: heading", "Everything you need, already here"),
      text("home.amenities.sub", HOME, "Amenities: line under the heading", "The small things that make a stay easy, included with your booking."),
      text("home.gallery.title", HOME, "Gallery: heading", "Take a look around"),
      text("home.reviews.title", HOME, "Reviews: heading", "What guests say", "Shown when you have no ratings yet."),
      image("home.vibe.image1", HOME, "About section: large photo"),
      image("home.vibe.image2", HOME, "About section: small photo"),
      text("services.index.sub", SERVICES, "Services page: line under the title", "Pick where you'd like to start."),
      text("services.other.title", SERVICES, "Service page: other services heading", "More to explore"),
      text("services.cta.title", SERVICES, "Service page: help box title", "Can't find the right fit?"),
      text("services.cta.sub", SERVICES, "Service page: help box line", "Tell us what you need and we'll help."),
      text("about.values.title", OTHER, "About page: values heading", "The way we do things"),
      text("about.founders.title", OTHER, "About page: founders heading", "Meet the founders"),
      text("contact.formSub", OTHER, "Contact page: line under the form title", "We usually reply within a day."),
      text("home.hero.secondaryCta", HOME, "Hero: second button (shown when there is no booking bar)", "Explore rooms"),
      text("home.amenities.eyebrow", HOME, "Amenities: small label", "Amenities"),
      text("home.vibe.eyebrow", HOME, "The vibe: small label", "The vibe"),
      text("home.about.link", HOME, "The vibe: link to the story", "Read our story"),
      text("home.gallery.eyebrow", HOME, "Gallery: small label", "Gallery"),
      text("home.gallery.link", HOME, "Gallery: link", "All photos"),
      text("home.reviews.eyebrow", HOME, "Reviews: small label", "Reviews"),
      text("home.reviews.link", HOME, "Reviews: link to all reviews", "Read all reviews"),
      text("home.reviews.write", HOME, "Reviews: write-a-review button", "Write a review"),
      text("home.contact.eyebrow", HOME, "Find us: small label", "Find us"),
      text("home.contact.button", HOME, "Find us: contact button", "Contact us"),
      text("about.eyebrow", OTHER, "About page: small label", "Our story"),
      text("about.values.eyebrow", OTHER, "About page: values small label", "What we stand for"),
      text("about.founders.eyebrow", OTHER, "About page: founders small label", "Your hosts"),
      text("about.team.eyebrow", OTHER, "About page: team small label", "The crew"),
      text("gallery.eyebrow", OTHER, "Gallery page: small label", "Gallery"),
      text("reviews.eyebrow", OTHER, "Reviews page: small label", "Reviews"),
      text("reviews.write", OTHER, "Reviews page: write-a-review button", "Write a review"),
      text("partner.eyebrow", OTHER, "Partner page: small label", "Partnerships"),
      text("partner.intro", OTHER, "Partner page: text when your own is empty", "Travel agents, tour operators and local businesses — tell us how we could work together."),
      text("contact.eyebrow", OTHER, "Contact page: small label", "Get in touch"),
      text("services.other.eyebrow", SERVICES, "Service page: other services small label", "Also from us"),
      text("services.related.title", SERVICES, "Service page: more items heading", "More rooms"),
      text("services.index.eyebrow", SERVICES, "Services page: small label", "What we offer"),
      text("home.services.eyebrow", HOME, "Other services: small label", "Also from us"),
      text("home.services.title", HOME, "Other services: heading", "More ways to stay with us"),
    ],
    switches: [{ key: "home_facts", label: "Facts strip (check-in, check-out, minimum stay, prices from)" }, { key: "home_services", label: "Other services on the home page", hint: "Cards for your other service pages. Their photo, heading and line come from each service page's Home card settings." }],
  },

  savor: {
    slots: [
      text("home.browse.title", HOME, "Menu tiles: heading", "Pick your craving"),
      text("home.reviews.title", HOME, "Reviews: heading", "Rated 4.8 by people like you", "Leave empty to show your average rating."),
      text("home.gallery.title", HOME, "Gallery: heading", "A peek inside"),
      text("services.index.sub", SERVICES, "Services page: line under the title", "Pick where you'd like to start."),
      text("services.other.title", SERVICES, "Service page: other services heading", "Also here"),
      text("about.founders.title", OTHER, "About page: founders heading", "Meet the founders"),
      text("home.hero.secondaryCta", HOME, "Hero: second button", "See the menu"),
      text("home.browse.eyebrow", HOME, "Menu tiles: small label", "Browse"),
      text("home.menu.eyebrow", HOME, "Menu preview: small label", "From our kitchen"),
      text("home.menu.link", HOME, "Menu preview: link", "View the full menu"),
      text("home.about.eyebrow", HOME, "About section: small label", "Our story"),
      text("home.reserve.title", HOME, "Reserve panel: heading", "Book a table"),
      text("home.reserve.sub", HOME, "Reserve panel: line under the heading", "Pick a date and time and we'll keep a table ready for you."),
      text("home.reserve.hoursLabel", HOME, "Reserve panel: opening hours label", "Opening hours"),
      text("home.reviews.eyebrow", HOME, "Reviews: small label", "Kind words"),
      text("home.reviews.write", HOME, "Reviews: write-a-review button", "Write a review"),
      text("home.gallery.eyebrow", HOME, "Gallery: small label", "Gallery"),
      text("home.gallery.link", HOME, "Gallery: link", "See all photos"),
      text("home.contact.button", HOME, "Closing panel: contact button", "Contact us"),
      text("about.eyebrow", OTHER, "About page: small label", "Our story"),
      text("about.founders.eyebrow", OTHER, "About page: founders small label", "The people"),
      text("about.team.eyebrow", OTHER, "About page: team small label", "The crew"),
      text("gallery.eyebrow", OTHER, "Gallery page: small label", "Gallery"),
      text("reviews.eyebrow", OTHER, "Reviews page: small label", "Reviews"),
      text("reviews.write", OTHER, "Reviews page: write-a-review button", "Write a review"),
      text("partner.eyebrow", OTHER, "Partner page: small label", "Partnerships"),
      text("partner.intro", OTHER, "Partner page: text when your own is empty", "We love working with people who share our passion. Tell us a little about yourself and how we could work together."),
      text("contact.eyebrow", OTHER, "Contact page: small label", "Get in touch"),
      text("services.other.eyebrow", SERVICES, "Service page: other services small label", "More from us"),
      text("services.related.title", SERVICES, "Service page: more items heading", "You might also like"),
      text("services.index.eyebrow", SERVICES, "Services page: small label", "What we do"),
      text("services.policy.eyebrow", SERVICES, "Stay policy box: small label", "Before you book"),
      text("services.policy.title", SERVICES, "Stay policy box: heading", "Stay policy"),
      text("home.services.eyebrow", HOME, "Other services: small label", "More from us"),
      text("home.services.title", HOME, "Other services: heading", "Everything under one roof"),
    ],
    switches: [{ key: "home_services", label: "Other services on the home page", hint: "Cards for your other service pages. Their photo, heading and line come from each service page's Home card settings." }],
  },
};

export const hasTemplateContent = (templateId?: string | null) => {
  const def = TEMPLATE_CONTENT[String(templateId || "").trim()];
  return Boolean(def && (def.slots.length || def.switches.length || def.steps));
};

/* ───────────────────────── reading and cleaning ───────────────────────── */

export const emptyTemplateContent = (): TemplateContent => ({ copy: {}, images: {}, steps: [] });

const cleanMap = (value: any): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  Object.entries(value).forEach(([key, item]) => {
    const textValue = String(item ?? "").trim();
    if (textValue) out[key] = textValue;
  });
  return out;
};

/** Mirrors the server's sanitizeTemplateContent, so the preview shows exactly what would be saved. */
export const normalizeTemplateContent = (value: any): TemplateContent => {
  const raw = value && typeof value === "object" ? value : {};
  return {
    copy: cleanMap(raw.copy),
    images: cleanMap(raw.images),
    steps: (Array.isArray(raw.steps) ? raw.steps : [])
      .map((step: any) => ({ title: String(step?.title ?? "").trim(), body: String(step?.body ?? "").trim(), image: String(step?.image ?? "").trim() }))
      .filter((step: ContentStep) => step.title || step.body)
      .slice(0, 8),
  };
};

const urlOf = (value: any): string => (typeof value === "string" ? value : value?.url || value?.preview || "");

/** Every photo URL the site has, so a saved pick that was later deleted quietly falls back. */
const draftPhotoUrls = (draft: any): Set<string> => {
  const urls = new Set<string>();
  [draft?.gallery, draft?.heroImages, draft?.aboutPageImages].forEach((list) => {
    (Array.isArray(list) ? list : []).forEach((item) => {
      const url = urlOf(item);
      if (url) urls.add(url);
    });
  });
  return urls;
};

/** The owner's wording for `key`, or the template's own `fallback`. */
export const contentCopy = (draft: any, key: string, fallback: string): string => {
  const value = draft?.templateContent?.copy?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

/** The photo the owner picked for `key` (if it is still on the site), or the template's `fallback`. */
export const contentImage = (draft: any, key: string, fallback: string): string => {
  const picked = draft?.templateContent?.images?.[key];
  return typeof picked === "string" && picked && draftPhotoUrls(draft).has(picked) ? picked : fallback;
};

/** The owner's steps, or the template's standard steps. A step's photo must still be on the site. */
export const contentSteps = <T extends { title: string; body: string }>(draft: any, fallback: T[]): (T & { image?: string })[] => {
  const steps = Array.isArray(draft?.templateContent?.steps) ? draft.templateContent.steps : [];
  if (!steps.length) return fallback;
  const photos = draftPhotoUrls(draft);
  return steps.map((step: any) => ({ title: String(step?.title || ""), body: String(step?.body || ""), image: step?.image && photos.has(step.image) ? step.image : "" })) as any;
};
