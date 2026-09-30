// Sample content used only by the template picker's "Preview" action — never persisted to a
// real WebsiteTemplate record. It lets someone compare templates before any real company
// content exists.
//
// Each template previews the kind of business it is made for (Savor a café, Wayfarer a
// hostel, Haven a co-living home, Commons a co-working space), with that business's own photos
// and text (see demoContent.ts), and every other service added alongside it so the preview shows
// how a multi-service business looks. When the picker has services selected, the sample is built
// from those services instead.
import type { ServiceKind } from "./verticalProfiles";
import { serviceNameToKind } from "./serviceChoices";
import { DEMO_BUSINESSES, withFaqs, type DemoBusiness } from "./demoContent";

const TEMPLATE_KIND: Record<string, ServiceKind> = {
  savor: "menu",
  wayfarer: "hostel",
  haven: "coLiving",
  commons: "workspace",
  huddle: "meeting",
};

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

const ALL_KINDS: ServiceKind[] = ["workspace", "hostel", "menu", "coLiving", "meeting", "workation"];

export const buildDemoPreviewDraft = (themeVariant: string, serviceNames: string[] = []) => {
  const main = defaultKindForTemplate(themeVariant);
  const kinds: ServiceKind[] = serviceNames.length ? serviceNames.map(serviceNameToKind) : [main, ...ALL_KINDS.filter((kind) => kind !== main)];
  const primary = DEMO_BUSINESSES[kinds[0]];

  const pages = kinds.map((kind, index) => {
    const business = DEMO_BUSINESSES[kind];
    // Keep pages distinct when the same kind is picked twice.
    const slug = index > 0 && kinds.indexOf(kind) !== index ? `${business.page.slug}-${index + 1}` : business.page.slug;
    return pageFor(kind, business, slug);
  });

  // Data lists and settings from every chosen service, so a multi-service business previews fully.
  const extra = kinds.reduce<Record<string, unknown>>((acc, kind) => ({ ...DEMO_BUSINESSES[kind].extra, ...acc }), {});
  const settings = kinds.reduce<Record<string, unknown>>((acc, kind) => ({ ...(DEMO_BUSINESSES[kind].settings || {}), ...acc }), {});
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
