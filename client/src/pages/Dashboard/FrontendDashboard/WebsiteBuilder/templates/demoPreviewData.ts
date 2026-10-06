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
  commons: "workspace",
  huddle: "meeting",
};

const photo = (id: string, width = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=78`;
const photoValue = (id: string, width = 1000) => ({ url: photo(id, width) });

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

const demoBusinessFor = (kind: ServiceKind, themeVariant: string) =>
  themeVariant === "travigo" && kind === "hostel" ? TRAVIGO_DEMO_BUSINESS : DEMO_BUSINESSES[kind];

/** The kind of business a template is previewed with when no services are chosen. */
export const defaultKindForTemplate = (themeVariant: string): ServiceKind => TEMPLATE_KIND[themeVariant] || "workspace";

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
    founders: primary.founders,
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
