export const VERTICAL_KEYS = [
  "co-working",
  "co-living",
  "workation",
  "hostel",
  "meeting-rooms",
  "cafe",
] as const;

export type VerticalType = (typeof VERTICAL_KEYS)[number];

export const BUSINESS_TYPE_TO_VERTICAL_KEY: Record<string, VerticalType> = {
  "Co-Working": "co-working",
  "Co-Living": "co-living",
  Hostels: "hostel",
  Workation: "workation",
  "Meeting Rooms": "meeting-rooms",
  Cafe: "cafe",
};

export const VERTICAL_KEY_TO_LABEL: Record<string, string> = {
  "co-working": "Co-Working",
  "co-living": "Co-Living",
  hostel: "Hostels",
  workation: "Workation",
  "meeting-rooms": "Meeting Rooms",
  cafe: "Cafe",
};

type VerticalConfigEntry = {
  label: string;
  pages: string[];
  sections: string[];
  themeId: string;
  copyPresets: {
    heroCTA: string;
    contactCTA: string;
    navLabel: string;
  };
};

export const VERTICAL_CONFIG: Record<VerticalType, VerticalConfigEntry> = {
  "co-working": {
    label: "Co-Working",
    pages: [
      "hero",
      "about",
      "products",
      "gallery",
      "testimonials",
      "contact",
      "footer",
    ],
    sections: [
      "hero",
      "about",
      "products",
      "gallery",
      "testimonials",
      "contact",
      "footer",
    ],
    themeId: "co-working-default",
    copyPresets: {
      heroCTA: "Book a desk",
      contactCTA: "Get in touch",
      navLabel: "Co-Working Space",
    },
  },
  "co-living": {
    label: "Co-Living",
    pages: [
      "hero",
      "about",
      "rooms",
      "amenities",
      "gallery",
      "testimonials",
      "contact",
      "footer",
    ],
    sections: [
      "hero",
      "about",
      "rooms",
      "amenities",
      "gallery",
      "testimonials",
      "contact",
      "footer",
    ],
    themeId: "co-living-default",
    copyPresets: {
      heroCTA: "View rooms",
      contactCTA: "Apply now",
      navLabel: "Co-Living Space",
    },
  },
  workation: {
    label: "Workation",
    pages: [
      "hero",
      "about",
      "packages",
      "spaces",
      "gallery",
      "testimonials",
      "contact",
      "footer",
    ],
    sections: [
      "hero",
      "about",
      "packages",
      "spaces",
      "gallery",
      "testimonials",
      "contact",
      "footer",
    ],
    themeId: "workation-default",
    copyPresets: {
      heroCTA: "See packages",
      contactCTA: "Plan your stay",
      navLabel: "Workation Space",
    },
  },
  hostel: {
    label: "Hostel",
    pages: [
      "hero",
      "about",
      "dorms",
      "facilities",
      "gallery",
      "testimonials",
      "contact",
      "footer",
    ],
    sections: [
      "hero",
      "about",
      "dorms",
      "facilities",
      "gallery",
      "testimonials",
      "contact",
      "footer",
    ],
    themeId: "hostel-default",
    copyPresets: {
      heroCTA: "Book a bed",
      contactCTA: "Contact us",
      navLabel: "Hostel",
    },
  },
  "meeting-rooms": {
    label: "Meeting Rooms",
    pages: [
      "hero",
      "about",
      "rooms",
      "pricing",
      "gallery",
      "testimonials",
      "contact",
      "footer",
    ],
    sections: [
      "hero",
      "about",
      "rooms",
      "pricing",
      "gallery",
      "testimonials",
      "contact",
      "footer",
    ],
    themeId: "meeting-rooms-default",
    copyPresets: {
      heroCTA: "Book a room",
      contactCTA: "Check availability",
      navLabel: "Meeting Rooms",
    },
  },
  cafe: {
    label: "Cafe",
    pages: [
      "hero",
      "about",
      "menu",
      "gallery",
      "testimonials",
      "contact",
      "footer",
    ],
    sections: [
      "hero",
      "about",
      "menu",
      "gallery",
      "testimonials",
      "contact",
      "footer",
    ],
    themeId: "cafe-default",
    copyPresets: {
      heroCTA: "View menu",
      contactCTA: "Find us",
      navLabel: "Cafe",
    },
  },
};
