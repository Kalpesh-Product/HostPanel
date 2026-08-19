// Generic, realistic sample content used only by the template picker's
// "Preview" action — never persisted to a real WebsiteTemplate record.
// Lets someone compare templates before any real company content exists.
export const buildDemoPreviewDraft = (themeVariant: string) => ({
  searchKey: "demo-preview",
  companyName: "Nimbus Coworks",
  vertical: "co-working",
  themeVariant,
  title: "Nimbus Coworks",
  subTitle: "A calm, well-equipped space to do your best work.",
  ctaText: "Book a Tour",
  heroImages: [],
  about: [
    "Nimbus Coworks is a boutique workspace built for small teams and independent professionals who want more than a desk.",
  ],
  aboutPageIntro:
    "Nimbus Coworks is a boutique workspace built for small teams and independent professionals who want more than a desk.",
  products: [
    { name: "Hot Desk", slug: "hot-desk", description: "Flexible daily seating with high-speed wifi.", images: [] },
    { name: "Private Cabin", slug: "private-cabin", description: "A lockable office for teams of 2-6.", images: [] },
    { name: "Meeting Room", slug: "meeting-room", description: "Bookable by the hour, seats up to 10.", images: [] },
  ],
  galleryTitle: "Gallery",
  gallery: [],
  testimonials: [
    { name: "Aditi Rao", text: "Best workspace I've used in the city — quiet, fast wifi, great coffee.", rating: 5 },
    { name: "Marcus Lee", text: "The team here genuinely cares about the member experience.", rating: 5 },
  ],
  contactTitle: "Contact Us",
  email: "hello@nimbuscoworks.com",
  phone: "9876543210",
  address: "4th Floor, Riverside Plaza, MG Road",
  registeredCompanyName: "Nimbus Coworks Pvt Ltd",
  copyrightText: "© Nimbus Coworks",
  socials: { instagram: { enabled: true, link: "nimbuscoworks" } },
  faqs: [],
});
