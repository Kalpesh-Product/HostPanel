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

  // Camelia is a Haven page-for-page: same JSX, same content keys, only the theme differs.
  // Camelia's own layout (boutique-hotel reference), distinct from Haven's — different content
  // keys for the sections that don't exist on Haven (intro band, highlights, location, offers).
  camelia: {
    slots: [
      text("home.intro.eyebrow", HOME, "Intro band: small label", "Welcome"),
      text("home.intro.title", HOME, "Intro band: heading", "Indulge in exquisite comfort", SAME),
      text("home.amenities.eyebrow", HOME, "Amenities: small label", "Amenities", SAME),
      text("home.amenities.title", HOME, "Amenities: heading", "Elevate your stay with our amenities"),
      text("home.location.eyebrow", HOME, "Location band: small label", "Location"),
      text("home.location.title", HOME, "Location band: heading", "Nestled amidst breathtaking natural beauty"),
      text("home.location.button", HOME, "Location band: button", "Show location"),
      text("home.rooms.eyebrow", HOME, "Stay section: small label", "Stay"),
      text("home.rooms.title", HOME, "Stay section: heading", "Enjoy a personalised and tailored stay", SAME),
      text("home.rooms.link", HOME, "Stay section: \"show all\" button", "Show all suites"),
      text("home.steps.eyebrow", HOME, "How it works: small label", "How it works"),
      text("home.offers.eyebrow", HOME, "Offers band: small label", "Special offers"),
      text("home.offers.title", HOME, "Offers band: heading", "Pamper yourself with our promotions", SAME),
      text("home.offers.sub", HOME, "Offers band: line under the heading", "Uses your subtitle"),
      text("home.contact.button", HOME, "Offers band: button (when there's no booking form)", "Book now"),
      text("home.gallery.eyebrow", HOME, "Gallery: small label", "Gallery"),
      text("home.gallery.title", HOME, "Gallery: heading", "A look around"),
      text("home.gallery.link", HOME, "Gallery: link", "All photos"),
      text("home.reviews.write", HOME, "Reviews: write-a-review button", "Write a review"),
      text("home.services.eyebrow", HOME, "Other services: small label", "Also from us"),
      text("home.services.title", HOME, "Other services: heading", "More under one roof"),
      image("home.highlights.image1", HOME, "Highlights band: first photo"),
      image("home.highlights.image2", HOME, "Highlights band: second photo"),
      text("services.index.eyebrow", SERVICES, "Services page: small label", "What we offer"),
      text("services.index.sub", SERVICES, "Services page: line under the title", "Pick where you'd like to start."),
      text("services.cta.title", SERVICES, "Rooms page: help box title", "Not sure which one is right?"),
      text("services.cta.sub", SERVICES, "Rooms page: help box line", "Tell us what you're after and we'll help you choose."),
      text("services.other.eyebrow", SERVICES, "Service page: other services small label", "Also from us"),
      text("services.other.title", SERVICES, "Service page: other services heading", "More under one roof"),
      text("services.related.title", SERVICES, "Service page: more items heading", "More rooms"),
      text("about.eyebrow", OTHER, "About page: small label", "Our story"),
      text("about.values.title", OTHER, "About page: values heading", "The way we do things"),
      text("about.values.eyebrow", OTHER, "About page: values small label", "What we stand for"),
      text("about.founders.title", OTHER, "About page: founders heading", "Meet the founders"),
      text("about.founders.eyebrow", OTHER, "About page: founders small label", "Your hosts"),
      text("about.team.eyebrow", OTHER, "About page: team small label", "The team"),
      text("gallery.eyebrow", OTHER, "Gallery page: small label", "Gallery"),
      text("reviews.eyebrow", OTHER, "Reviews page: small label", "Reviews"),
      text("reviews.write", OTHER, "Reviews page: write-a-review button", "Write a review"),
      text("partner.eyebrow", OTHER, "Partner page: small label", "Partnerships"),
      text("partner.intro", OTHER, "Partner page: text when your own is empty", "Businesses, communities and local partners — tell us how we could work together."),
      text("contact.eyebrow", OTHER, "Contact page: small label", "Get in touch"),
      text("contact.formSub", OTHER, "Contact page: line under the form title", "We usually reply within a day."),
    ],
    switches: [
      { key: "home_services", label: "Other services on the home page", hint: "Cards for your other service pages. Their photo, heading and line come from each service page's Home card settings." },
      { key: "home_inclusions", label: "Highlights band and amenities columns" },
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

  tulum: {
    slots: [
      image("home.hero.image", HOME, "Hero: photo when there is no video"),
      text("home.hero.spec1", HOME, "Hero: first spec", "Front beach", "Shown under the price, with a building icon."),
      text("home.hero.spec2", HOME, "Hero: second spec", "2 guests"),
      text("home.hero.spec3", HOME, "Hero: third spec", "Concierge, 24 hours"),
      text("home.hero.caption", HOME, "Hero: line under the price", "Price per night for a double bed room"),
      text("home.contact.button", HOME, "Hero: button when there is no booking", "Contact us"),
      text("home.sidetab", HOME, "Side tab on the left edge", "Contact us"),
      text("home.intro.eyebrow", HOME, "Intro: small label", "Welcome to paradise"),
      text("home.intro.title", HOME, "Intro: heading", "Enjoy a stay made for slow days"),
      text("home.intro.col1.title", HOME, "Intro: first column heading", "Luxury"),
      text("home.intro.col1.text", HOME, "Intro: first column text", "Designed for slow mornings, with fine linens, natural light and a kitchen that works."),
      text("home.intro.col2.title", HOME, "Intro: second column heading", "Comfort"),
      text("home.intro.col2.text", HOME, "Intro: second column text", "Furnished homes, fast Wi-Fi and a workspace that feels calm, so you can work or rest."),
      text("home.intro.col3.title", HOME, "Intro: third column heading", "Experience"),
      text("home.intro.col3.text", HOME, "Intro: third column text", "Local guides, beach walks and sunset plans, arranged by a team that knows the area."),
      text("home.intro.button", HOME, "Intro: outline button under each column", "Learn more"),
      image("home.band.image", HOME, "Beach band: photo"),
      text("home.band.eyebrow", HOME, "Beach band: small label", "Access to the beach"),
      text("home.band.title", HOME, "Beach band: heading", "Steps from the water"),
      text("home.band.text", HOME, "Beach band: text", "A short walk takes you to the sand, the restaurants and the market, so the day is yours to plan."),
      text("home.band.button", HOME, "Beach band: button", "Read our story"),
      text("home.amenities.eyebrow", HOME, "Amenities: small label", "Amenities"),
      text("home.amenities.title", HOME, "Amenities: heading", "Find the best amenities"),
      text("home.amenities.tile1.label", HOME, "Amenities: first tile label", "Amenities"),
      text("home.amenities.tile1.text", HOME, "Amenities: first tile text", "Your family will enjoy a safe and comfortable environment."),
      text("home.amenities.tile2.label", HOME, "Amenities: second tile label", "Living"),
      text("home.amenities.tile2.text", HOME, "Amenities: second tile text", "Open spaces, shade and green corners for slow afternoons."),
      text("home.amenities.tile3.label", HOME, "Amenities: third tile label", "Luxury"),
      text("home.amenities.tile3.text", HOME, "Amenities: third tile text", "Well-designed apartments with the details that make a stay easy."),
      image("home.amenities.image1", HOME, "Amenities: first tile photo"),
      image("home.amenities.image2", HOME, "Amenities: second tile photo"),
      image("home.amenities.image3", HOME, "Amenities: third tile photo"),
      text("home.units.title", HOME, "Units: heading", "Units available for booking"),
      text("home.units.sub", HOME, "Units: line under the heading", "With more than 20 years of experience"),
      text("home.units.sleeps", HOME, "Units: guest count label", "Sleeps"),
      text("home.units.button", HOME, "Units: view button", "View unit"),
      text("home.units.book", HOME, "Units: book link", "Book"),
      text("home.units.all", HOME, "Units: link to all units", "See all units"),
      text("home.gallery.eyebrow", HOME, "Gallery: small label", "Gallery"),
      text("home.gallery.title", HOME, "Gallery: heading", "A look around"),
      text("home.gallery.sub", HOME, "Gallery: line under the heading", "The units, the shared spaces and the beach just outside."),
      image("home.gallery.image1", HOME, "Gallery: first photo (tall, left)"),
      image("home.gallery.image2", HOME, "Gallery: second photo"),
      image("home.gallery.image3", HOME, "Gallery: third photo"),
      image("home.gallery.image4", HOME, "Gallery: fourth photo"),
      image("home.gallery.image5", HOME, "Gallery: fifth photo"),
      text("home.team.eyebrow", HOME, "Team: small label", "Our team"),
      text("home.team.title", HOME, "Team: heading", "Meet the team"),
      text("home.team.sub", HOME, "Team: line under the heading", "The people who look after every stay"),
      text("home.reviews.count", HOME, "Reviews: line above the count", "Based on"),
      text("home.units.area", HOME, "Units: total area label", "Total area"),
      text("home.pricing.eyebrow", HOME, "Pricing: small label", "Pricing"),
      text("home.pricing.title", HOME, "Pricing: heading", "Simple, transparent pricing"),
      text("home.pricing.sub", HOME, "Pricing: line under the heading", "With more than 20 years of experience"),
      text("home.pricing.badge", HOME, "Pricing: badge on the middle card", "Popular!"),
      text("home.pricing.includes", HOME, "Pricing: list label", "Includes"),
      text("home.pricing.button", HOME, "Pricing: booking button", "Book now"),
      text("home.pricing.details", HOME, "Pricing: view details button", "View details"),
      text("home.reviews.eyebrow", HOME, "Reviews: small label", "Reviews"),
      text("home.reviews.title", HOME, "Reviews: heading", "What people say about us"),
      text("home.reviews.all", HOME, "Reviews: all reviews button", "All reviews"),
      text("home.reviews.write", HOME, "Reviews: write-a-review button", "Write a review"),
      text("home.distances.eyebrow", HOME, "Review sites strip: label", "As seen on exclusive review sites"),
      text("home.distance1.label", HOME, "Strip: first place", "Airport"),
      text("home.distance1.value", HOME, "Strip: first distance", "5 minutes away"),
      text("home.distance2.label", HOME, "Strip: second place", "Beach"),
      text("home.distance2.value", HOME, "Strip: second distance", "Front beach"),
      text("home.distance3.label", HOME, "Strip: third place", "Downtown"),
      text("home.distance3.value", HOME, "Strip: third distance", "15 minutes away"),
      text("home.distance4.label", HOME, "Strip: fourth place", "Restaurants"),
      text("home.distance4.value", HOME, "Strip: fourth distance", "10 minutes away"),
      text("home.cta.title", HOME, "Closing band: heading", "Ready for your stay?"),
      text("home.cta.sub", HOME, "Closing band: line under the heading", "Tell us your dates and we will find the unit that suits you."),
      text("home.cta.button", HOME, "Closing band: button", "Book now"),
      text("services.eyebrow", SERVICES, "Units page: small label", "Units"),
      text("services.about.title", SERVICES, "Unit page: about heading", "About this unit"),
      text("services.amenities.title", SERVICES, "Unit page: amenities heading", "Amenities"),
      text("services.related.title", SERVICES, "Unit page: more units heading", "More units"),
      text("services.book.title", SERVICES, "Unit page: booking card label", "Reserve"),
      text("about.eyebrow", OTHER, "About page: small label", "Our story"),
      text("about.team.eyebrow", OTHER, "About page: team small label", "Our team"),
      text("about.founders.title", OTHER, "About page: team heading", "Meet the team"),
      text("gallery.eyebrow", OTHER, "Gallery page: small label", "Gallery"),
      text("reviews.eyebrow", OTHER, "Reviews page: small label", "Reviews"),
      text("reviews.write", OTHER, "Reviews page: write-a-review button", "Write a review"),
      text("contact.eyebrow", OTHER, "Contact page: small label", "Get in touch"),
      text("partner.eyebrow", OTHER, "Partner page: small label", "Partnerships"),
    ],
    switches: [
      { key: "home_about", label: "Intro, beach band and story" },
      { key: "home_inclusions", label: "Amenities tiles" },
      { key: "home_products", label: "Units and pricing" },
      { key: "home_gallery", label: "Photo gallery" },
      { key: "home_team", label: "Team with three members" },
      { key: "home_testimonials", label: "Reviews" },
      { key: "home_stats", label: "Review-site strip (distances)" },
    ],
  },

  grindelwald: {
    slots: [
      image("home.hero.image", HOME, "Hero: round photo"),
      text("home.hero.line1", HOME, "Hero: first title line", "Cozy"),
      text("home.hero.line2", HOME, "Hero: second title line (neon)", "Cabin"),
      text("home.hero.line3", HOME, "Hero: third title line (small)", "In The"),
      text("home.hero.line4", HOME, "Hero: fourth title line", "Woods!"),
      text("home.hero.sub", HOME, "Hero: line under the title", "Escape the stresses of everyday life and reconnect with nature."),
      text("home.intro.text", HOME, "Intro: welcome text beside the oval", "Welcome to our cosy cabin in the woods! Our rental home, nestled in the heart of the forest, is the ideal retreat for nature lovers and anyone looking for a peaceful escape from the hustle and bustle of city life."),
      text("home.intro.stat1.label", HOME, "Intro: first stat label", "Dense forest"),
      text("home.intro.stat1.value", HOME, "Intro: first stat value", "20.291m2", "Number first, then the unit."),
      text("home.intro.stat2.label", HOME, "Intro: second stat label", "Living space"),
      text("home.intro.stat2.value", HOME, "Intro: second stat value", "324m2"),
      text("home.intro.stat3.label", HOME, "Intro: third stat label", "Proximity to nearest town"),
      text("home.intro.stat3.value", HOME, "Intro: third stat value", "30 minutes"),
      image("home.parallax.image", HOME, "Parallax: full-width photo"),
      text("home.about.eyebrow", HOME, "About band: small label", "About us"),
      text("home.about.text", HOME, "About band: capital-letter paragraph", "At The Wilderness Retreat, We Pride Ourselves On Offering A Peaceful, Serene Atmosphere That Allows Our Guests To Truly Disconnect From The Stresses Of Everyday Life."),
      image("home.about.image1", HOME, "About band: first photo (tallest offset)"),
      image("home.about.image2", HOME, "About band: second photo"),
      image("home.about.image3", HOME, "About band: third photo"),
      image("home.about.image4", HOME, "About band: fourth photo"),
      text("home.rooms.title", HOME, "Rooms: heading", "Our unique rooms within the retreat"),
      text("home.rooms.link", HOME, "Rooms: link under each room", "View room"),
      text("home.gallery.title", HOME, "Slider: heading", "Experience the magic of the wilderness retreat"),
      text("home.gallery.text", HOME, "Slider: text under the heading", "Welcome to our cosy cabin in the woods! Our rental home, nestled in the heart of the forest."),
      image("home.gallery.image1", HOME, "Slider: first photo"),
      image("home.gallery.image2", HOME, "Slider: second photo"),
      image("home.gallery.image3", HOME, "Slider: third photo"),
      image("home.gallery.image4", HOME, "Slider: fourth photo"),
      image("home.gallery.image5", HOME, "Slider: fifth photo"),
      text("home.reviews.title", HOME, "Reviews: heading", "What guests say"),
      text("home.reviews.count", HOME, "Reviews: line above the count", "Based on"),
      text("home.reviews.all", HOME, "Reviews: all reviews button", "All reviews"),
      text("home.reviews.write", HOME, "Reviews: write-a-review button", "Write a review"),
      text("home.cta.title", HOME, "Closing band: heading", "It's Time To Get To Know Each Other!"),
      text("home.cta.sub", HOME, "Closing band: line under the heading", "Grab a cup of coffee and..."),
      text("home.cta.talk", HOME, "Closing band: neon line", "Let's talk!"),
      text("home.cta.col1.title", HOME, "Closing band: first link heading", "About Us"),
      text("home.cta.col1.sub", HOME, "Closing band: first link line", "in a true way"),
      text("home.cta.col2.title", HOME, "Closing band: second link heading", "Rooms"),
      text("home.cta.col2.sub", HOME, "Closing band: second link line", "See our"),
      text("home.cta.col3.title", HOME, "Closing band: third link heading", "Reserve"),
      text("home.cta.col3.sub", HOME, "Closing band: third link line", "You can"),
      text("services.eyebrow", SERVICES, "Rooms page: small label", "Rooms"),
      text("services.about.title", SERVICES, "Room page: about heading", "About this room"),
      text("services.amenities.title", SERVICES, "Room page: amenities heading", "Amenities"),
      text("services.related.title", SERVICES, "Room page: more rooms heading", "More rooms"),
      text("services.book.title", SERVICES, "Room page: booking card label", "Reserve"),
      text("home.units.sleeps", HOME, "Rooms: guest count label", "Sleeps"),
      text("home.units.area", HOME, "Rooms: total area label", "Total area"),
      text("home.units.button", HOME, "Rooms: view button", "View room"),
      text("home.units.book", HOME, "Rooms: book link", "Book"),
      text("about.eyebrow", OTHER, "About page: small label", "Our story"),
      text("about.team.eyebrow", OTHER, "About page: team small label", "Our team"),
      text("about.founders.title", OTHER, "About page: team heading", "Meet the team"),
      text("gallery.eyebrow", OTHER, "Gallery page: small label", "Gallery"),
      text("reviews.eyebrow", OTHER, "Reviews page: small label", "Reviews"),
      text("reviews.write", OTHER, "Reviews page: write-a-review button", "Write a review"),
      text("contact.eyebrow", OTHER, "Contact page: small label", "Get in touch"),
      text("partner.eyebrow", OTHER, "Partner page: small label", "Partnerships"),
    ],
    switches: [
      { key: "home_hero", label: "Hero with the round photo and title" },
      { key: "home_about", label: "Intro stats, parallax photo and about band" },
      { key: "home_products", label: "Room cards" },
      { key: "home_gallery", label: "Photo slider" },
      { key: "home_testimonials", label: "Reviews" },
      { key: "home_contact", label: "Closing band with links" },
    ],
  },

  travigo: {
    slots: [
      image("home.hero.image1", HOME, "Hero: first circle photo"),
      image("home.hero.image2", HOME, "Hero: second circle photo"),
      image("home.hero.image3", HOME, "Hero: third circle photo"),
      image("home.hero.image4", HOME, "Hero: fourth circle photo"),
      image("home.hero.pill", HOME, "Hero: photo inside the title"),
      image("home.explore.image", HOME, "Explore section photo"),
      image("home.gallery.image1", HOME, "Budget travel: large left photo"),
      image("home.gallery.image2", HOME, "Budget travel: small top photo"),
      image("home.gallery.image3", HOME, "Budget travel: large right photo"),
      image("home.gallery.image4", HOME, "Budget travel: small bottom photo"),
      image("home.cta.image", HOME, "Journey band: round photo"),
    ],
    switches: [],
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
