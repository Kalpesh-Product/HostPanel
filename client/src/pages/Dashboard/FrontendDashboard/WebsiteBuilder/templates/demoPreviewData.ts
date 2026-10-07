// Sample content used only by the template picker's "Preview" action — never persisted to a
// real WebsiteTemplate record. It lets someone compare templates before any real company
// content exists.
//
// Each template previews the kind of business it is made for (Savor a café, Wayfarer a
// hostel, Haven a co-living home, Commons a co-working space), with that business's own photos
// and text (see demoContent.ts). When the picker has services explicitly selected, the sample is
// built from those services instead — that's the only way unrelated verticals (e.g. Meeting
// Rooms) end up mixed into a preview; by default a template only shows its own kind.
import type { ServiceKind } from "./verticalProfiles";
import { serviceNameToKind } from "./serviceChoices";
import { DEMO_BUSINESSES, withFaqs, type DemoBusiness } from "./demoContent";

const TEMPLATE_KIND: Record<string, ServiceKind> = {
  savor: "menu",
  wayfarer: "hostel",
  travigo: "hostel",
  haven: "coLiving",
  camelia: "coLiving",
  tulum: "coLiving",
  commons: "workspace",
  huddle: "meeting",
};

const photo = (id: string, width = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=78`;
const photoValue = (id: string, width = 1000) => ({ url: photo(id, width) });
// Portrait crops centred on the face, for team photos (4:5, matching the team cards).
const faceCrop = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&crop=faces&w=700&h=875&q=78`;

// Travigo intentionally has its own photo direction instead of inheriting Wayfarer's
// hostel library. These images lean into tropical rooms, real traveller moments and
// local exploration so the two hostel templates remain visually distinct in previews.
const TRAVIGO_PHOTOS = {
  hero: [
    "photo-1581258601964-0e8879fdeb08",
    "photo-1740841317942-41849351b149",
    "photo-1778411602745-5db9ca798215",
  ],
  dorm: [
    "photo-1709805619372-40de3f158e83",
    "photo-1722247520369-7f1495e79245",
    "photo-1646236731457-18f0c8a6d188",
    "photo-1750271334785-4f6008035021",
  ],
  privateRoom: [
    "photo-1750271334785-4f6008035021",
    "photo-1643867144950-a2af9f6d5dc8",
    "photo-1646236731457-18f0c8a6d188",
  ],
  social: [
    "photo-1761798949068-1dfa7fbf89b8",
    "photo-1758272133417-011aebb36018",
    "photo-1764966366801-85c92e8d2bc2",
    "photo-1759108749177-f8dc6277738a",
    "photo-1758275557348-23950a3ddeae",
    "photo-1753351057455-b13182da4d03",
  ],
  explore: [
    "photo-1683049339644-3f820ec2c71c",
    "photo-1761884594876-2a6721170ff7",
    "photo-1752008427168-cc66aea75575",
    "photo-1761435763578-bddab4eb7686",
    "photo-1740841317942-41849351b149",
    "photo-1589428204722-69d25279f75a",
    "photo-1581258601964-0e8879fdeb08",
    "photo-1778411602745-5db9ca798215",
  ],
};

const hostelDemo = DEMO_BUSINESSES.hostel;
const hostelDorms = ((hostelDemo.extra as any).dorms || []) as any[];
const roomPhotos = [
  TRAVIGO_PHOTOS.dorm.slice(0, 3),
  [TRAVIGO_PHOTOS.dorm[1], TRAVIGO_PHOTOS.dorm[3], TRAVIGO_PHOTOS.social[3]],
  TRAVIGO_PHOTOS.privateRoom,
  [TRAVIGO_PHOTOS.privateRoom[1], TRAVIGO_PHOTOS.privateRoom[2], TRAVIGO_PHOTOS.explore[4]],
];

const TRAVIGO_DEMO_BUSINESS: DemoBusiness = {
  ...hostelDemo,
  companyName: "Travigo Hostel",
  title: "Find your ideal stay",
  subTitle: "Design-led rooms, a social rooftop and the best of the coast just outside.",
  heroImages: TRAVIGO_PHOTOS.hero.map((id) => photo(id, 1600)),
  gallery: [
    ...TRAVIGO_PHOTOS.social,
    ...TRAVIGO_PHOTOS.explore,
    ...TRAVIGO_PHOTOS.dorm,
    ...TRAVIGO_PHOTOS.privateRoom,
  ].map((id) => photo(id, 1200)),
  aboutImages: [TRAVIGO_PHOTOS.social[0], TRAVIGO_PHOTOS.explore[2], TRAVIGO_PHOTOS.explore[4]].map((id) => photo(id, 1000)),
  address: "House 14, Anjuna Beach Road, Goa 403509",
  page: {
    ...hostelDemo.page,
    heroHeading: "Rooms & suites",
    heroSubHeading: "Social dorms and calm private rooms, designed for good sleep and easy connections.",
    heroImage: photo(TRAVIGO_PHOTOS.dorm[0], 1600),
    cardImage: photo(TRAVIGO_PHOTOS.privateRoom[0], 1000),
  },
  extra: {
    ...hostelDemo.extra,
    dorms: hostelDorms.map((room, index) => ({
      ...room,
      images: (roomPhotos[index] || TRAVIGO_PHOTOS.dorm).map((id) => photoValue(id)),
    })),
  },
};

// Tulum has its own co-living photo set, so its preview never shares images with Haven or Camelia.
const TULUM_PHOTOS = {
  hero: ["photo-1721222203415-69033eaf3bd1", "photo-1668854084710-386c7d25f771", "photo-1668277280345-f3949c1b6aa2", "photo-1752769041878-f24e37fd6aea"],
  interiors: [
    "photo-1738168279272-c08d6dd22002", "photo-1738168246881-40f35f8aba0a", "photo-1680416124510-5eae1beca412", "photo-1638454668466-e8dbd5462f20",
    "photo-1715985160053-d339e8b6eb94", "photo-1741764014072-68953e93cd48", "photo-1757924461488-ef9ad0670978", "photo-1611094016919-36b65678f3d6",
  ],
  villas: ["photo-1668277280358-a9b7f09c1cc5", "photo-1668277157922-ecd8330ea809", "photo-1512914890251-2f96a9b0bbe2", "photo-1759389964108-1940ff61db0e", "photo-1668277156357-3e174dff9f1a", "photo-1668277155898-704a26a5cfa3"],
  extra: ["photo-1668277155756-0ebb2801f6b4", "photo-1668277155881-9d3bccb1683a", "photo-1643867144950-a2af9f6d5dc8", "photo-1668277156355-08d083dcfea4"],
};
// Four units, four photos each: two apartments from the interiors set, two villas.
const TULUM_ROOM_PHOTOS = [
  TULUM_PHOTOS.interiors.slice(0, 4),
  TULUM_PHOTOS.interiors.slice(4, 8),
  TULUM_PHOTOS.villas.slice(0, 4),
  TULUM_PHOTOS.villas.slice(2, 6),
];
const TULUM_DEMO_VIDEO = "https://videos.pexels.com/video-files/4010511/4010511-hd_1920_1080_25fps.mp4";

const tulumDemo: DemoBusiness = (() => {
  const base = DEMO_BUSINESSES.coLiving;
  const rooms = ((base.extra as any).coLivingRooms || []) as any[];
  return {
    ...base,
    companyName: "Tulum Residences",
    title: "Live by the sea, slow and easy.",
    subTitle: "Furnished apartments steps from the beach, with a terrace, fast Wi-Fi and a concierge on call.",
    heroImages: TULUM_PHOTOS.hero.map((id) => photo(id, 1600)),
    gallery: [...TULUM_PHOTOS.interiors.slice(4), ...TULUM_PHOTOS.villas.slice(0, 2), ...TULUM_PHOTOS.extra].map((id) => photo(id, 1200)),
    aboutImages: [TULUM_PHOTOS.villas[0], TULUM_PHOTOS.interiors[2], TULUM_PHOTOS.extra[1]].map((id) => photo(id, 1000)),
    address: "Calle Playa 14, Tulum, Quintana Roo",
    // Three team members, as in the reference's team block.
    founders: [
      { name: "Ana Morales", role: "CEO", bio: "Ana started Tulum Residences after a decade of hosting travellers on the Yucatán coast. She still walks every new unit before a guest moves in.", highlights: "10 years in hospitality\nFounded Tulum Residences in 2019", image: faceCrop("photo-1573496359142-b8d87734a5a2") },
      { name: "Sofia Bennett", role: "CFO", bio: "Sofia looks after the numbers and the long-term plans for each building. She is proudest of guests who return season after season.", highlights: "Former hotel finance lead\nChartered accountant", image: faceCrop("photo-1580894732444-8ecded7900cd") },
      { name: "Lucas Ortega", role: "CTO", bio: "Lucas built the booking and check-in systems the team uses today, and keeps the apartments connected, comfortable and secure.", highlights: "Smart-building specialist\nLed three property tech launches", image: faceCrop("photo-1551836022-deb4988cc6c0") },
    ],
    aboutTitle: "A stay made for slow days",
    aboutPageStory: "We started with one apartment near the beach and a simple goal: a home where guests can work, rest and wake up to the sea. Today we look after a small group of apartments and villas, each run with the same care.",
    about: [
      "Tulum Residences is a small collection of furnished apartments and villas a short walk from the beach.",
      "Every unit has a terrace, fast Wi-Fi and a concierge who can help with local plans, from cenote trips to the best place for dinner.",
    ],
    partnerHeading: "Partner with Tulum Residences",
    page: {
      ...base.page,
      heroHeading: "Units",
      heroSubHeading: "Apartments and villas, each with its own terrace and everything you need for a long stay.",
      heroImage: photo(TULUM_PHOTOS.villas[0], 1600),
      cardImage: photo(TULUM_PHOTOS.interiors[0], 1000),
    },
    extra: {
      ...base.extra,
      coLivingRooms: rooms.slice(0, 4).map((room, index) => ({
        ...room,
        // Named units and nightly rates, to match the hero's "price per night" line.
        title: ["Apartment Kaan", "Apartment Maktu", "Villa Sian", "Villa Tankah"][index],
        area: ["340 ft", "240 ft", "420 ft", "310 ft"][index],
        // Eight lines per unit, so the list fills the same height as the photo beside it.
        features: [
          ["Wi-Fi", "Housekeeping", "Study desk", "Wardrobe", "Air conditioning", "Private terrace", "Kitchen", "Laundry"],
          ["Smart TV", "Housekeeping", "Dining area", "Walk-in shower", "Air conditioning", "Private balcony", "Kitchen", "Laundry"],
          ["Plunge pool", "Concierge", "Outdoor shower", "Two bedrooms", "Dining room", "Living room", "Kitchen", "Terrace"],
          ["Rooftop deck", "Concierge", "Two bathrooms", "Office nook", "Dining room", "Living room", "Kitchen", "Terrace"],
        ][index],
        price: ["₹4,200", "₹5,600", "₹9,800", "₹12,500"][index],
        priceUnit: "per night",
        images: TULUM_ROOM_PHOTOS[index].map((id) => photoValue(id)),
        image: photo(TULUM_ROOM_PHOTOS[index][0], 1000),
      })),
    },
  };
})();

const demoBusinessFor = (kind: ServiceKind, themeVariant: string): DemoBusiness => {
  if (themeVariant === "travigo" && kind === "hostel") return TRAVIGO_DEMO_BUSINESS;
  if (themeVariant === "tulum" && kind === "coLiving") return tulumDemo;
  return DEMO_BUSINESSES[kind];
};

/** The kind of business a template is previewed with when no services are chosen. */
export const defaultKindForTemplate = (themeVariant: string): ServiceKind => TEMPLATE_KIND[themeVariant] || "workspace";

// Pexels "Video of a House Interior" (free to use, no attribution needed); 2K file, 21 seconds.
const CAMELIA_DEMO_VIDEO = "https://videos.pexels.com/video-files/7578546/7578546-uhd_2560_1440_30fps.mp4";

const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "");

const pageFor = (kind: ServiceKind, business: DemoBusiness, slug: string) => ({
  name: business.page.name,
  slug,
  enabled: true,
  heroHeading: business.page.heroHeading,
  heroSubHeading: business.page.heroSubHeading,
  heroImages: [business.page.heroImage],
  homeCardHeading: business.page.homeCardHeading,
  homeCardSubText: business.page.homeCardSubText,
  homeCardImage: { url: business.page.cardImage },
  leadEnabled: true,
  faqs: withFaqs(business.page.faqs),
  inclusions: business.page.inclusions.map((key) => ({ key, enabled: true })),
  subProducts: kind === "workspace" ? business.pageItems || [] : [],
});

export const buildDemoPreviewDraft = (themeVariant: string, serviceNames: string[] = []) => {
  const main = defaultKindForTemplate(themeVariant);
  // Only the services explicitly picked in the picker widen this beyond the template's own kind
  // — otherwise a co-living template like Camelia would preview with meeting-room/cafe/hostel
  // content bolted on by default, which reads as broken rather than "multi-service".
  const kinds: ServiceKind[] = serviceNames.length ? serviceNames.map(serviceNameToKind) : [main];
  const primary = demoBusinessFor(kinds[0], themeVariant);

  const pages = kinds.map((kind, index) => {
    const business = demoBusinessFor(kind, themeVariant);
    // Keep pages distinct when the same kind is picked twice.
    const slug = index > 0 && kinds.indexOf(kind) !== index ? `${business.page.slug}-${index + 1}` : business.page.slug;
    return pageFor(kind, business, slug);
  });

  // Data lists and settings from every chosen service, so a multi-service business previews fully.
  const extra = kinds.reduce<Record<string, unknown>>((acc, kind) => ({ ...demoBusinessFor(kind, themeVariant).extra, ...acc }), {});
  const settings = kinds.reduce<Record<string, unknown>>((acc, kind) => ({ ...(demoBusinessFor(kind, themeVariant).settings || {}), ...acc }), {});
  const handle = slugOf(primary.companyName);

  return {
    searchKey: "demo-preview",
    companyId: "demo",
    workspaceId: "",
    themeVariant,
    // Camelia's hero plays a looping video when one is linked (see the builder's "Hero Video URL").
    // The sample clip is a placeholder for previews only; a real site sets its own link.
    heroVideoUrl: themeVariant === "camelia" ? CAMELIA_DEMO_VIDEO : themeVariant === "tulum" ? TULUM_DEMO_VIDEO : "",
    styleConfig: {},
    sectionOverrides: {},
    vertical: primary.vertical,
    companyName: primary.companyName,
    registeredCompanyName: `${primary.companyName} Pvt Ltd`,
    copyrightText: `© ${primary.companyName}`,
    title: primary.title,
    subTitle: primary.subTitle,
    CTAButtonText: primary.cta,
    ctaText: primary.cta,
    heroImages: primary.heroImages,
    gallery: primary.gallery.map((url) => ({ url, enabled: true })),
    galleryTitle: "Gallery",
    about: primary.about.map((text) => ({ text })),
    aboutTitle: primary.aboutTitle,
    aboutPageStory: primary.aboutPageStory,
    aboutPageMission: primary.aboutPageMission,
    aboutPageValues: primary.aboutPageValues,
    aboutPageTeamHeading: primary.aboutPageTeamHeading,
    aboutPageImages: primary.aboutImages.map((url) => ({ url })),
    aboutPageImageCards: primary.team.map((member) => ({ ...member, enabled: true })),
    // Tulum always shows its own three team members, whichever services were picked.
    founders: themeVariant === "tulum" ? tulumDemo.founders : primary.founders,
    testimonials: primary.testimonials,
    testimonialsEnableWriteReview: true,
    testimonialsHomePreviewCount: 3,
    faqs: withFaqs(primary.faqs),
    inclusions: primary.inclusions.map((key) => ({ key, enabled: true })),
    partnerPageHeading: primary.partnerHeading,
    partnerPageContent: primary.partnerContent,
    productTitle: "What we do",
    contactTitle: "Come say hello",
    email: `hello@${handle}.com`,
    phone: "+91 98765 43210",
    address: primary.address,
    mapUrl: "https://www.openstreetmap.org/export/embed.html?bbox=77.58%2C12.96%2C77.65%2C12.99&layer=mapnik",
    contactPersonName: primary.contactPersonName,
    contactPersonRole: primary.contactPersonRole,
    contactPersonEmail: `${primary.contactPersonName.split(" ")[0].toLowerCase()}@${handle}.com`,
    contactPersonPhone: "+91 98765 00000",
    contactEnableInquiryForm: true,
    openingHours: primary.openingHours,
    socials: {
      instagram: { enabled: true, link: `https://instagram.com/${handle}` },
      facebook: { enabled: true, link: `https://facebook.com/${handle}` },
      twitter: { enabled: false, link: "" },
      linkedin: { enabled: false, link: "" },
      whatsapp: { enabled: true, link: "919876543210" },
    },
    logoCarousel: { enabled: false, title: "", logos: [] },
    tourBooking: { enabled: true },
    // The older templates list a business's offerings from `products`.
    products: kinds[0] === "workspace" ? (primary.pageItems || []).map((item: any) => ({ name: item.name, slug: slugOf(item.name), description: item.description, images: item.images })) : [],
    ...extra,
    ...settings,
    productDropdownPages: pages,
    productPages: pages,
  };
};
