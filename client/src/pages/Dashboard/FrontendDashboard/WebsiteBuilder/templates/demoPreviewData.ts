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
  tastyc: "menu",
  grandbar: "menu",
  aromatica: "menu",
  flowspace: "meeting",
  workscape: "meeting",
  brixspace: "meeting",
  worpace: "workspace",
  qerja: "workspace",
  wayfarer: "hostel",
  travigo: "hostel",
  lodge: "hostel",
  "cali-hostel": "hostel",
  haven: "coLiving",
  camelia: "coLiving",
  tulum: "coLiving",
  grindelwald: "coLiving",
  commons: "workspace",
  huddle: "meeting",
};

const photo = (id: string, width = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=78`;
const photoValue = (id: string, width = 1000) => ({ url: photo(id, width) });
// Portrait crops centred on the face, for team photos (4:5, matching the team cards).
const faceCrop = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&crop=faces&w=700&h=875&q=78`;

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
  [
    TRAVIGO_PHOTOS.privateRoom[1],
    TRAVIGO_PHOTOS.privateRoom[2],
    TRAVIGO_PHOTOS.explore[4],
  ],
];

const TRAVIGO_DEMO_BUSINESS: DemoBusiness = {
  ...hostelDemo,
  companyName: "Travigo Hostel",
  title: "Find your ideal stay",
  subTitle:
    "Design-led rooms, a social rooftop and the best of the coast just outside.",
  heroImages: TRAVIGO_PHOTOS.hero.map((id) => photo(id, 1600)),
  gallery: [
    ...TRAVIGO_PHOTOS.social,
    ...TRAVIGO_PHOTOS.explore,
    ...TRAVIGO_PHOTOS.dorm,
    ...TRAVIGO_PHOTOS.privateRoom,
  ].map((id) => photo(id, 1200)),
  aboutImages: [
    TRAVIGO_PHOTOS.social[0],
    TRAVIGO_PHOTOS.explore[2],
    TRAVIGO_PHOTOS.explore[4],
  ].map((id) => photo(id, 1000)),
  address: "House 14, Anjuna Beach Road, Goa 403509",
  page: {
    ...hostelDemo.page,
    heroHeading: "Rooms & suites",
    heroSubHeading:
      "Social dorms and calm private rooms, designed for good sleep and easy connections.",
    heroImage: photo(TRAVIGO_PHOTOS.dorm[0], 1600),
    cardImage: photo(TRAVIGO_PHOTOS.privateRoom[0], 1000),
  },
  extra: {
    ...hostelDemo.extra,
    dorms: hostelDorms.map((room, index) => ({
      ...room,
      images: (roomPhotos[index] || TRAVIGO_PHOTOS.dorm).map((id) =>
        photoValue(id),
      ),
    })),
  },
};

// Tulum has its own co-living photo set, so its preview never shares images with Haven or Camelia.
const TULUM_PHOTOS = {
  hero: [
    "photo-1721222203415-69033eaf3bd1",
    "photo-1668854084710-386c7d25f771",
    "photo-1668277280345-f3949c1b6aa2",
    "photo-1752769041878-f24e37fd6aea",
  ],
  interiors: [
    "photo-1738168279272-c08d6dd22002",
    "photo-1738168246881-40f35f8aba0a",
    "photo-1680416124510-5eae1beca412",
    "photo-1638454668466-e8dbd5462f20",
    "photo-1715985160053-d339e8b6eb94",
    "photo-1741764014072-68953e93cd48",
    "photo-1757924461488-ef9ad0670978",
    "photo-1611094016919-36b65678f3d6",
  ],
  villas: [
    "photo-1668277280358-a9b7f09c1cc5",
    "photo-1668277157922-ecd8330ea809",
    "photo-1512914890251-2f96a9b0bbe2",
    "photo-1759389964108-1940ff61db0e",
    "photo-1668277156357-3e174dff9f1a",
    "photo-1668277155898-704a26a5cfa3",
  ],
  extra: [
    "photo-1668277155756-0ebb2801f6b4",
    "photo-1668277155881-9d3bccb1683a",
    "photo-1643867144950-a2af9f6d5dc8",
    "photo-1668277156355-08d083dcfea4",
  ],
};
// Four units, four photos each: two apartments from the interiors set, two villas.
const TULUM_ROOM_PHOTOS = [
  TULUM_PHOTOS.interiors.slice(0, 4),
  TULUM_PHOTOS.interiors.slice(4, 8),
  TULUM_PHOTOS.villas.slice(0, 4),
  TULUM_PHOTOS.villas.slice(2, 6),
];
const TULUM_DEMO_VIDEO =
  "https://videos.pexels.com/video-files/4010511/4010511-hd_1920_1080_25fps.mp4";

const tulumDemo: DemoBusiness = (() => {
  const base = DEMO_BUSINESSES.coLiving;
  const rooms = ((base.extra as any).coLivingRooms || []) as any[];
  return {
    ...base,
    companyName: "Tulum Residences",
    title: "Live by the sea, slow and easy.",
    subTitle:
      "Furnished apartments steps from the beach, with a terrace, fast Wi-Fi and a concierge on call.",
    heroImages: TULUM_PHOTOS.hero.map((id) => photo(id, 1600)),
    gallery: [
      ...TULUM_PHOTOS.interiors.slice(4),
      ...TULUM_PHOTOS.villas.slice(0, 2),
      ...TULUM_PHOTOS.extra,
    ].map((id) => photo(id, 1200)),
    aboutImages: [
      TULUM_PHOTOS.villas[0],
      TULUM_PHOTOS.interiors[2],
      TULUM_PHOTOS.extra[1],
    ].map((id) => photo(id, 1000)),
    address: "Calle Playa 14, Tulum, Quintana Roo",
    // Three team members, as in the reference's team block.
    founders: [
      {
        name: "Ana Morales",
        role: "CEO",
        bio: "Ana started Tulum Residences after a decade of hosting travellers on the Yucatán coast. She still walks every new unit before a guest moves in.",
        highlights: "10 years in hospitality\nFounded Tulum Residences in 2019",
        image: faceCrop("photo-1573496359142-b8d87734a5a2"),
      },
      {
        name: "Sofia Bennett",
        role: "CFO",
        bio: "Sofia looks after the numbers and the long-term plans for each building. She is proudest of guests who return season after season.",
        highlights: "Former hotel finance lead\nChartered accountant",
        image: faceCrop("photo-1580894732444-8ecded7900cd"),
      },
      {
        name: "Lucas Ortega",
        role: "CTO",
        bio: "Lucas built the booking and check-in systems the team uses today, and keeps the apartments connected, comfortable and secure.",
        highlights:
          "Smart-building specialist\nLed three property tech launches",
        image: faceCrop("photo-1551836022-deb4988cc6c0"),
      },
    ],
    aboutTitle: "A stay made for slow days",
    aboutPageStory:
      "We started with one apartment near the beach and a simple goal: a home where guests can work, rest and wake up to the sea. Today we look after a small group of apartments and villas, each run with the same care.",
    about: [
      "Tulum Residences is a small collection of furnished apartments and villas a short walk from the beach.",
      "Every unit has a terrace, fast Wi-Fi and a concierge who can help with local plans, from cenote trips to the best place for dinner.",
    ],
    partnerHeading: "Partner with Tulum Residences",
    page: {
      ...base.page,
      heroHeading: "Units",
      heroSubHeading:
        "Apartments and villas, each with its own terrace and everything you need for a long stay.",
      heroImage: photo(TULUM_PHOTOS.villas[0], 1600),
      cardImage: photo(TULUM_PHOTOS.interiors[0], 1000),
    },
    extra: {
      ...base.extra,
      coLivingRooms: rooms.slice(0, 4).map((room, index) => ({
        ...room,
        // Named units and nightly rates, to match the hero's "price per night" line.
        title: [
          "Apartment Kaan",
          "Apartment Maktu",
          "Villa Sian",
          "Villa Tankah",
        ][index],
        area: ["340 ft", "240 ft", "420 ft", "310 ft"][index],
        // Eight lines per unit, so the list fills the same height as the photo beside it.
        features: [
          [
            "Wi-Fi",
            "Housekeeping",
            "Study desk",
            "Wardrobe",
            "Air conditioning",
            "Private terrace",
            "Kitchen",
            "Laundry",
          ],
          [
            "Smart TV",
            "Housekeeping",
            "Dining area",
            "Walk-in shower",
            "Air conditioning",
            "Private balcony",
            "Kitchen",
            "Laundry",
          ],
          [
            "Plunge pool",
            "Concierge",
            "Outdoor shower",
            "Two bedrooms",
            "Dining room",
            "Living room",
            "Kitchen",
            "Terrace",
          ],
          [
            "Rooftop deck",
            "Concierge",
            "Two bathrooms",
            "Office nook",
            "Dining room",
            "Living room",
            "Kitchen",
            "Terrace",
          ],
        ][index],
        price: ["₹4,200", "₹5,600", "₹9,800", "₹12,500"][index],
        priceUnit: "per night",
        images: TULUM_ROOM_PHOTOS[index].map((id) => photoValue(id)),
        image: photo(TULUM_ROOM_PHOTOS[index][0], 1000),
      })),
    },
  };
})();

// Grindelwald has its own forest photo set: the hero is a lake, the cabins are exteriors and the slider shows interiors.
const GRINDELWALD_PHOTOS = {
  hero: [
    "photo-1473448912268-2022ce9509d8",
    "photo-1786962904165-ec070af23a64",
    "photo-1557456170-0cf4f4d0d362",
  ],
  cabins: [
    [
      "photo-1449158743715-0a90ebb6d2d8",
      "photo-1570793005386-840846445fed",
      "photo-1518107784960-eb57c673a7ba",
      "photo-1537197518227-a36efeafd477",
    ],
    [
      "photo-1601919051950-bb9f3ffb3fee",
      "photo-1702959638073-3fa29ddb6a98",
      "photo-1772955543023-a6e99819e161",
      "photo-1759675001595-7b1e5ff997f0",
    ],
    [
      "photo-1510798831971-661eb04b3739",
      "photo-1621771674545-849014cf91fa",
      "photo-1767711384997-6804f4b54997",
      "photo-1566754844421-9bc834baf4a3",
    ],
  ],
  interiors: [
    "photo-1631630259742-c0f0b17c6c10",
    "photo-1773579089983-50348cc9abd0",
    "photo-1645242075656-e4e435b7a5f5",
    "photo-1631941392209-70cad44ecfb7",
    "photo-1697807713040-b5fb60d6f012",
    "photo-1787755144917-cbcf31e44f26",
    "photo-1761782791727-3994283faa88",
    "photo-1591825729269-caeb344f6df2",
    "photo-1726090401458-7abb00f7450c",
    "photo-1680703486830-1b5af60635d7",
  ],
  extra: [
    "photo-1786962904165-ec070af23a64",
    "photo-1557456170-0cf4f4d0d362",
    "photo-1473448912268-2022ce9509d8",
  ],
};
// Pexels "Cabin in the woods" (free to use, no attribution needed); 720p, 18 seconds.
const GRINDELWALD_DEMO_VIDEO =
  "https://videos.pexels.com/video-files/7664024/7664024-hd_1366_720_24fps.mp4";

const grindelwaldDemo: DemoBusiness = (() => {
  const base = DEMO_BUSINESSES.coLiving;
  const rooms = ((base.extra as any).coLivingRooms || []) as any[];
  return {
    ...base,
    companyName: "Cedar Ridge Cabins",
    title: "Cozy cabins in the woods.",
    subTitle:
      "Peaceful cabins among the pines, a short drive from town, with a hot tub, trails and a fire pit.",
    heroImages: GRINDELWALD_PHOTOS.hero.map((id) => photo(id, 1600)),
    gallery: [...GRINDELWALD_PHOTOS.interiors, ...GRINDELWALD_PHOTOS.extra].map(
      (id) => photo(id, 1200),
    ),
    aboutImages: [
      GRINDELWALD_PHOTOS.cabins[0][0],
      GRINDELWALD_PHOTOS.cabins[1][0],
      GRINDELWALD_PHOTOS.extra[0],
    ].map((id) => photo(id, 1000)),
    address: "Forest Road 9, Pine Ridge Valley, Himachal Pradesh",
    founders: [
      {
        name: "Maya Forrest",
        role: "Host and founder",
        bio: "Maya opened Cedar Ridge Cabins to share quiet mornings in the pines. She still greets every guest at the gate.",
        highlights:
          "12 years hosting in the mountains\nFounded Cedar Ridge Cabins in 2018",
        image: faceCrop("photo-1580489944761-15a19d654956"),
      },
      {
        name: "Ravi Menon",
        role: "Operations",
        bio: "Ravi keeps the cabins warm, stocked and ready for every arrival, and plans the trail and fire-pit schedule each week.",
        highlights:
          "Former resort operations lead\nCertified outdoor first-aid",
        image: faceCrop("photo-1507003211169-0a1dd7228f2d"),
      },
      {
        name: "Elena Brooks",
        role: "Guest experience",
        bio: "Elena designs the stay from the first enquiry to the last morning, with local guides and quiet corners for each guest.",
        highlights: "Ten years in guest services\nLocal trail guide",
        image: faceCrop("photo-1699899657680-421c2c2d5064"),
      },
    ],
    aboutTitle: "A cabin for slow days",
    aboutPageStory:
      "We started with one cabin among the pines and a simple wish: a place where guests can switch off, breathe and listen to the forest. Today we look after three cabins, each run with the same care.",
    about: [
      "Cedar Ridge Cabins is a small set of cabins among the pines, a short drive from town.",
      "Every cabin has a wood stove, a hot tub and a deck, plus trail maps and a host who can point you to the best views.",
    ],
    partnerHeading: "Partner with Cedar Ridge Cabins",
    page: {
      ...base.page,
      heroHeading: "Rooms",
      heroSubHeading:
        "Three cabins, each with its own deck, wood stove and a view of the trees.",
      heroImage: photo(GRINDELWALD_PHOTOS.cabins[2][0], 1600),
      cardImage: photo(GRINDELWALD_PHOTOS.cabins[0][0], 1000),
    },
    extra: {
      ...base.extra,
      coLivingRooms: rooms.slice(0, 3).map((room, index) => ({
        ...room,
        title: ["Cedar Cabin", "Pine Hollow", "Ridge Lodge"][index],
        description: [
          "For the times when life is too much, quit everything and enjoy the woods.",
          "A snug cabin under the trees, with a deck for morning coffee and a wood stove for the evenings.",
          "Our largest cabin, with a hot tub on the deck and views across the valley.",
        ][index],
        area: ["320 sq ft", "410 sq ft", "560 sq ft"][index],
        // Eight lines per cabin, so the list fills the same height as the photo beside it.
        features: [
          [
            "Wood stove",
            "Hot tub",
            "Private deck",
            "Fire pit",
            "Wi-Fi",
            "Kitchenette",
            "Heating",
            "Parking",
          ],
          [
            "Wood stove",
            "Reading nook",
            "Private deck",
            "Fire pit",
            "Wi-Fi",
            "Kitchenette",
            "Heating",
            "Parking",
          ],
          [
            "Hot tub",
            "Two bedrooms",
            "Panoramic deck",
            "Fire pit",
            "Wi-Fi",
            "Full kitchen",
            "Heating",
            "Parking",
          ],
        ][index],
        price: ["₹6,500", "₹8,200", "₹11,400"][index],
        priceUnit: "per night",
        images: GRINDELWALD_PHOTOS.cabins[index].map((id) => photoValue(id)),
        image: photo(GRINDELWALD_PHOTOS.cabins[index][0], 1000),
      })),
    },
  };
})();

// Lodge has its own rental-house photos (slider, intro cards, feature band, rooms) so it never
// previews with the hostel library Wayfarer and Travigo use.
// Lodge's own hostel-flavoured photo set — a hostel entrance, dorm bunks and hotel-style twin
// rooms — instead of the shared IMG.hostel/IMG.coliving pools other templates already draw
// from, so its preview doesn't look like a reshuffled Wayfarer/Haven.
const LODGE_PHOTOS = {
  hero: [
    "photo-1783254877023-f27a32c7e8bb",
    "photo-1776763255235-046cd40f3093",
    "photo-1762195804066-2fece9b24496",
    "photo-1789175095779-631b03bccdc8",
  ],
  // Four photos for each rental, in the order of the dorms list: 6-bed mixed, 4-bed female,
  // private double, private twin.
  rooms: [
    [
      "photo-1721299417031-de890ff33b26",
      "photo-1574716236621-87d2be17b3a3",
      "photo-1767884162402-683fdd430046",
      "photo-1781415980730-bfcf192e38bc",
    ],
    [
      "photo-1790774877815-5358d88f4c52",
      "photo-1790774881068-06250724c951",
      "photo-1790774888379-dd545dfa3343",
      "photo-1790774868320-64fd572a7aa7",
    ],
    [
      "photo-1631844820835-e698dc518bc6",
      "photo-1631844820822-caeca853b27d",
      "photo-1675409145919-277c0fc2aa7d",
      "photo-1790774868084-32fb1a98cd85",
    ],
    [
      "photo-1785486250394-868889952dcd",
      "photo-1763419161907-1e00b2f883c5",
      "photo-1781004672179-9790a9623a77",
      "photo-1744187170998-368291b6e16e",
    ],
  ],
  gallery: [
    "photo-1770991921455-f83141f4665a",
    "photo-1627024195483-145aea7809d7",
    "photo-1486591511419-0c7056604f63",
    "photo-1777113310184-140ff530f4dd",
    "photo-1785486250446-b048054c8484",
    "photo-1578608609519-8ce68e5211a4",
    "photo-1668884405041-aa8963908538",
    "photo-1558942594-0f34b1d36599",
  ],
};

const LODGE_DEMO_BUSINESS: DemoBusiness = {
  ...hostelDemo,
  companyName: "Lodge Stays",
  title: "Find a place you'll love to stay",
  subTitle:
    "Comfortable rooms, a friendly community and everything you need close by.",
  heroImages: LODGE_PHOTOS.hero.map((id) => photo(id, 1600)),
  gallery: LODGE_PHOTOS.gallery.map((id) => photo(id, 1200)),
  aboutImages: [
    LODGE_PHOTOS.gallery[0],
    LODGE_PHOTOS.gallery[2],
    LODGE_PHOTOS.gallery[4],
  ].map((id) => photo(id, 1000)),
  address: "Riverside 25, Anjuna Beach Road, Goa 403509",
  aboutTitle: "A home base for people on the move",
  aboutPageStory: "Made for comfortable, easy stays.",
  about: [
    "Lodge Stays began with a simple idea: a place to stay should feel like home from the first night.",
    "Our rooms are quiet and well kept, the shared spaces are warm and friendly, and our team is always a message away.",
  ],
  page: {
    ...hostelDemo.page,
    heroHeading: "Latest rentals",
    heroSubHeading: "Quiet rooms and shared spaces, set up for easy stays.",
    heroImage: photo(LODGE_PHOTOS.rooms[3][0], 1600),
    cardImage: photo(LODGE_PHOTOS.rooms[0][0], 1000),
  },
  extra: {
    ...hostelDemo.extra,
    dorms: hostelDorms.map((room, index) => ({
      ...room,
      images: (LODGE_PHOTOS.rooms[index] || LODGE_PHOTOS.rooms[0]).map((id) =>
        photoValue(id),
      ),
    })),
  },
};

// Tastyc has a separate coffee-house photo direction so its preview never looks like Savor.
// Dark roast details, moody interiors and close-up pastry photography mirror the reference's
// cinematic coffee-house mood while keeping every image replaceable in the builder.
const TASTYC_PHOTOS = {
  hero: [
    "photo-1528605248644-14dd04022da1",
    "photo-1498804103079-a6351b050096",
    "photo-1501339847302-ac426a4a7cbb",
  ],
  interior: [
    "photo-1554118811-1e0d58224f24",
    "photo-1501339847302-ac426a4a7cbb",
    "photo-1559925393-8be0ec4767c8",
    "photo-1493857671505-72967e2e2760",
  ],
  coffee: [
    "photo-1512568400610-62da28bc8a13",
    "photo-1509042239860-f550ce710b93",
    "photo-1514432324607-a09d9b4aefdd",
    "photo-1461023058943-07fcbe16d735",
  ],
  food: [
    "photo-1555507036-ab1f4038808a",
    "photo-1567620905732-2d1ec7ab7445",
    "photo-1541519227354-08fa5d50c44d",
    "photo-1578985545062-69928b1d9587",
    "photo-1621996346565-e3dbc646d9a9",
    "photo-1513104890138-7c749659a591",
    "photo-1512621776951-a57141f2eefd",
    "photo-1568901346375-23c9450c58cd",
  ],
};

const TASTYC_DEMO_BUSINESS: DemoBusiness = (() => {
  const base = DEMO_BUSINESSES.menu;
  const menuItems = ((base.extra as any).menuItems || []) as any[];
  const menuPhotos = [...TASTYC_PHOTOS.coffee, ...TASTYC_PHOTOS.food];
  return {
    ...base,
    companyName: "Ember & Oak",
    title: "Coffee & chocolate",
    subTitle:
      "Small-batch coffee, handmade pastries and a room worth staying in.",
    cta: "Book a table",
    heroImages: TASTYC_PHOTOS.hero.map((id) => photo(id, 1800)),
    gallery: [
      ...TASTYC_PHOTOS.interior,
      ...TASTYC_PHOTOS.coffee,
      ...TASTYC_PHOTOS.food,
    ].map((id) => photo(id, 1200)),
    aboutImages: TASTYC_PHOTOS.interior
      .slice(0, 3)
      .map((id) => photo(id, 1000)),
    aboutTitle: "We invite you to visit our coffee house",
    aboutPageStory:
      "We roast in small batches, bake before sunrise and keep a table ready for people who like their coffee with a little more time.",
    about: [
      "Ember & Oak began with one espresso machine, a small oven and the belief that a coffee house should feel memorable before the first sip.",
      "Today our baristas work with carefully sourced beans, our kitchen bakes throughout the morning and every plate is made to order.",
    ],
    address: "18 Roastery Lane, Indiranagar, Bengaluru 560038",
    page: {
      ...base.page,
      heroHeading: "Coffee menu",
      heroSubHeading:
        "Espresso, slow brews, breakfast plates and pastries baked every morning.",
      heroImage: photo(TASTYC_PHOTOS.interior[1], 1800),
      cardImage: photo(TASTYC_PHOTOS.coffee[0], 1000),
    },
    extra: {
      ...base.extra,
      menuItems: menuItems.map((item, index) => ({
        ...item,
        image: photoValue(menuPhotos[index % menuPhotos.length]),
      })),
    },
  };
})();

const GRAND_BAR_PHOTOS = {
  hero: [
    "photo-1572116469696-31de0f17cc34",
    "photo-1470337458703-46ad1756a1875",
    "photo-1543007630-9710e4a00a20",
  ],
  interior: [
    "photo-1514933651103-005eec06c04b",
    "photo-1552566626-52f8b828add9",
    "photo-1527761939622-911909463c76",
    "photo-1541544741938-0af808871cc0",
  ],
  drinks: [
    "photo-1536935338788-846bb9981813",
    "photo-1513558161293-cdaf765ed2fd",
    "photo-1544145945-f90425340c7e",
    "photo-1551024709-8f23befc6f87",
    "photo-1510812431401-41d2bd2722f3",
    "photo-1560512823-829485b8bf24",
  ],
  plates: [
    "photo-1515003197210-e0cd71810b5f",
    "photo-1547592180-85f173990554",
    "photo-1551024506-0bccd828d307",
    "photo-1547592166-23ac45744acd",
    "photo-1559847844-5315695dadae",
    "photo-1504674900247-0877df9cc836",
  ],
};

const GRAND_BAR_MENU_ITEMS = [
  {
    category: "Cocktails",
    name: "Blackberry Citrus Smash",
    price: "₹850",
    description:
      "Crushed blackberries, dry gin, fresh lemon, mint and a splash of soda over pebble ice.",
    image: GRAND_BAR_PHOTOS.drinks[0],
  },
  {
    category: "Cocktails",
    name: "Garden Mojito",
    price: "₹780",
    description:
      "White rum, muddled mint, lime, cane sugar and chilled soda in a tall glass.",
    image: GRAND_BAR_PHOTOS.drinks[1],
  },
  {
    category: "Cocktails",
    name: "Blood Orange Margarita",
    price: "₹720",
    description:
      "Reposado tequila, blood orange, lime and agave, served bright with a citrus wheel.",
    image: GRAND_BAR_PHOTOS.drinks[2],
  },
  {
    category: "Cocktails",
    name: "House Cocktail Flight",
    price: "₹690",
    description:
      "Three seasonal signatures — tropical, herbaceous and berry-led — made for tasting together.",
    image: GRAND_BAR_PHOTOS.drinks[3],
  },
  {
    category: "Wine & Champagne",
    name: "Cabernet Table Pour",
    price: "₹650",
    description:
      "A generous pour of full-bodied cabernet with dark fruit, gentle oak and a smooth finish.",
    image: GRAND_BAR_PHOTOS.drinks[4],
  },
  {
    category: "Wine & Champagne",
    name: "Sunset Aperol Spritz",
    price: "₹750",
    description:
      "Aperol, sparkling wine, soda and fresh orange poured over ice.",
    image: GRAND_BAR_PHOTOS.drinks[5],
  },
  {
    category: "Desserts",
    name: "Salted Caramel Brownie",
    price: "₹420",
    description:
      "Warm chocolate brownie, vanilla ice cream, crisp wafer and salted caramel sauce.",
    image: GRAND_BAR_PHOTOS.plates[2],
  },
  {
    category: "Food & Bites",
    name: "Truffle Egg Tagliatelle",
    price: "₹480",
    description:
      "Handmade pasta, soft egg, wild mushrooms, parmesan and a touch of truffle.",
    image: GRAND_BAR_PHOTOS.plates[0],
  },
  {
    category: "Food & Bites",
    name: "Charred Salmon Grain Bowl",
    price: "₹520",
    description:
      "Grilled salmon, herb couscous, green beans, cherry tomatoes and toasted seeds.",
    image: GRAND_BAR_PHOTOS.plates[1],
  },
  {
    category: "Food & Bites",
    name: "Coastal Prawn Curry",
    price: "₹680",
    description:
      "Tiger prawns in a gently spiced coconut curry with steamed rice and fresh herbs.",
    image: GRAND_BAR_PHOTOS.plates[4],
  },
  {
    category: "Food & Bites",
    name: "Thai Beef Salad",
    price: "₹890",
    description:
      "Sliced grilled beef, crisp lettuce, red onion, toasted cashews and chilli-lime dressing.",
    image: GRAND_BAR_PHOTOS.plates[5],
  },
];

const GRAND_BAR_FAQS = [
  {
    question: "Do you take walk-ins?",
    answer:
      "We hold half the bar for walk-ins every night, but a booking guarantees your table.",
  },
  {
    question: "Is there a dress code?",
    answer: "Smart casual after 7 PM — think elevated, not formal.",
  },
  {
    question: "Can I book the bar for a private event?",
    answer:
      "Yes, we host private parties and corporate evenings. Send us a note and we'll build a menu around it.",
  },
  {
    question: "Do you have a non-alcoholic menu?",
    answer: "Absolutely — ask your server for our zero-proof cocktail list.",
  },
];

const GRAND_BAR_DEMO_BUSINESS: DemoBusiness = (() => {
  const base = DEMO_BUSINESSES.menu;
  const galleryPhotos = [
    GRAND_BAR_PHOTOS.interior[0],
    GRAND_BAR_PHOTOS.interior[1],
    GRAND_BAR_PHOTOS.drinks[2],
    GRAND_BAR_PHOTOS.drinks[0],
    GRAND_BAR_PHOTOS.plates[0],
    GRAND_BAR_PHOTOS.hero[0],
    GRAND_BAR_PHOTOS.drinks[3],
    GRAND_BAR_PHOTOS.interior[0],
    GRAND_BAR_PHOTOS.plates[1],
    GRAND_BAR_PHOTOS.drinks[4],
    GRAND_BAR_PHOTOS.interior[3],
    ...GRAND_BAR_PHOTOS.drinks.slice(1),
    ...GRAND_BAR_PHOTOS.plates.slice(2),
  ];
  return {
    ...base,
    companyName: "Grand Bar",
    title: "A Mixologist's Paradise",
    subTitle:
      "World-class cocktails, vibrant plates and an evening atmosphere worth dressing up for.",
    cta: "Book a table",
    heroImages: GRAND_BAR_PHOTOS.hero.map((id) => photo(id, 1900)),
    gallery: galleryPhotos.map((id) => photo(id, 1400)),
    aboutImages: [
      GRAND_BAR_PHOTOS.interior[0],
      GRAND_BAR_PHOTOS.interior[2],
      GRAND_BAR_PHOTOS.hero[1],
    ].map((id) => photo(id, 1200)),
    aboutTitle: "A room shaped by flavor, music and generous hospitality",
    aboutPageStory:
      "Grand Bar brings classic technique, seasonal ingredients and after-dark energy together under one roof.",
    about: [
      "We built Grand Bar for evenings that unfold slowly: a first drink at the counter, a plate shared across the table and one last round before home.",
      "Our bartenders respect the classics while the kitchen follows the seasons, keeping every visit familiar enough to relax and surprising enough to remember.",
    ],
    founders: [
      {
        name: "Maya D'Souza",
        role: "Founder & Creative Director",
        bio: "Maya shapes the room, the music and the small details that turn service into an experience.",
        image: photoValue("photo-1534528741775-53994a69daeb", 900),
      },
      {
        name: "Armaan Khanna",
        role: "Head Mixologist",
        bio: "Armaan pairs classic technique with Indian botanicals and a restless curiosity for new flavor.",
        image: photoValue("photo-1507003211169-0a1dd7228f2d", 900),
      },
    ],
    address: "42 Lavelle Road, Ashok Nagar, Bengaluru 560001",
    faqs: GRAND_BAR_FAQS,
    page: {
      ...base.page,
      name: "Our Menus",
      slug: "our-menus",
      heroHeading: "Cocktails, plates and late-night favorites",
      heroSubHeading:
        "Explore signature drinks, wine, desserts and food made for sharing.",
      homeCardHeading: "Our Menus",
      homeCardSubText: "Cocktails, wine, desserts and food made for sharing.",
      heroImage: photo(GRAND_BAR_PHOTOS.hero[2], 1900),
      cardImage: photo(GRAND_BAR_PHOTOS.drinks[0], 1100),
      faqs: GRAND_BAR_FAQS.slice(0, 2),
    },
    extra: {
      ...base.extra,
      menuItems: GRAND_BAR_MENU_ITEMS.map((item) => ({
        category: item.category,
        name: item.name,
        price: item.price,
        description: item.description,
        image: photoValue(item.image),
        dietary: "veg",
        spiceLevel: 0,
        popular: false,
        badge: "",
        features: [],
        enabled: true,
        priceUnit: "",
        featured: false,
      })),
    },
  };
})();

// Flowspace keeps a separate photo library from Huddle: warmer materials, more daylight and
// a high-end editorial direction that mirrors the reference without repeating another template.
const pexels = (id: string, width = 1600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
const pexelsValue = (id: string, width = 1200) => ({ url: pexels(id, width) });
const FLOWSPACE_PHOTOS = {
  hero: ["3184465", "32800582", "20390771"],
  rooms: [
    "1181406",
    "3184292",
    "3184339",
    "3184360",
    "3182773",
    "2451566",
    "380769",
    "3184418",
    "3184431",
    "3184460",
    "3183197",
    "1181354",
  ],
};
const FLOWSPACE_DEMO_BUSINESS: DemoBusiness = (() => {
  const base = DEMO_BUSINESSES.meeting;
  const rooms = ((base.extra as any).meetingRooms || []) as any[];
  return {
    ...base,
    companyName: "Lumen Rooms",
    title: "Your next meeting starts here.",
    subTitle:
      "Design-led meeting rooms with everything ready—from quick calls to full-day workshops.",
    cta: "Find your desk",
    heroImages: FLOWSPACE_PHOTOS.hero.map((id) => pexels(id, 1800)),
    gallery: [...FLOWSPACE_PHOTOS.hero, ...FLOWSPACE_PHOTOS.rooms].map((id) =>
      pexels(id, 1400),
    ),
    aboutImages: [
      FLOWSPACE_PHOTOS.hero[1],
      FLOWSPACE_PHOTOS.hero[2],
      FLOWSPACE_PHOTOS.rooms[8],
    ].map((id) => pexels(id, 1100)),
    aboutTitle: "Spaces built around better conversations",
    aboutPageStory:
      "We make finding a polished, fully equipped meeting room feel effortless.",
    about: [
      "Lumen Rooms began with one simple observation: teams do better work when the room is calm, considered and ready before they arrive.",
      "Every space combines natural light, reliable technology and thoughtful support, with clear hourly pricing and a real person on hand.",
    ],
    address: "12 Museum Road, Ashok Nagar, Bengaluru 560001",
    page: {
      ...base.page,
      heroHeading: "Rooms for work that matters",
      heroSubHeading:
        "Private, fully equipped spaces for interviews, workshops, presentations and team decisions.",
      heroImage: pexels(FLOWSPACE_PHOTOS.hero[0], 1800),
      cardImage: pexels(FLOWSPACE_PHOTOS.hero[1], 1000),
    },
    extra: {
      ...base.extra,
      meetingRooms: rooms.map((room, index) => ({
        ...room,
        images: FLOWSPACE_PHOTOS.rooms
          .slice(index * 3, index * 3 + 3)
          .map((id) => pexelsValue(id)),
      })),
    },
  };
})();

// Workscape uses a bright, architectural photo direction with clean timber, plants and daylight.
// These images are intentionally separate from Flowspace and the other meeting-room templates.
const WORKSCAPE_PHOTOS = {
  hero: [
    "photo-1521737711867-e3b97375f902",
    "photo-1497366754035-f200968a6e72",
    "photo-1524758631624-e2822e304c36",
  ],
  rooms: [
    "photo-1497215842964-222b430dc094",
    "photo-1517502884422-41eaead166d4",
    "photo-1556761175-b413da4baf72",
    "photo-1497366216548-37526070297c",
    "photo-1568992687947-868a62a9f521",
    "photo-1600508774634-4e11d34730e2",
    "photo-1521737711867-e3b97375f902",
    "photo-1551836022-d5d88e9218df",
    "photo-1556761175-4b46a572b786",
    "photo-1504384308090-c894fdcc538d",
    "photo-1542744173-8e7e53415bb0",
    "photo-1552664730-d307ca884978",
  ],
};
const WORKSCAPE_DEMO_BUSINESS: DemoBusiness = (() => {
  const base = DEMO_BUSINESSES.meeting;
  const rooms = ((base.extra as any).meetingRooms || []) as any[];
  return {
    ...base,
    companyName: "Atrium Rooms",
    title: "Work Better, Together",
    subTitle:
      "Bright, fully equipped meeting rooms for teams that value calm thinking and useful conversations.",
    cta: "Book Room",
    heroImages: WORKSCAPE_PHOTOS.hero.map((id) => photo(id, 1900)),
    gallery: [...WORKSCAPE_PHOTOS.hero, ...WORKSCAPE_PHOTOS.rooms].map((id) =>
      photo(id, 1450),
    ),
    aboutImages: [
      WORKSCAPE_PHOTOS.hero[1],
      WORKSCAPE_PHOTOS.rooms[6],
      WORKSCAPE_PHOTOS.rooms[9],
    ].map((id) => photo(id, 1200)),
    aboutTitle: "About Atrium Rooms",
    aboutPageStory:
      "Atrium Rooms brings flexible meeting spaces, reliable technology and thoughtful hospitality together in one calm place.",
    about: [
      "We believe the room affects the work. Natural light, practical layouts and a team that prepares everything before you arrive make better meetings possible.",
      "From a private interview to a thirty-person workshop, every space can flex around the people and purpose in it.",
    ],
    founders: [
      {
        name: "Rhea Kapoor",
        role: "Founder & Space Director",
        bio: "Rhea designs adaptable rooms that make collaboration feel natural.",
        image: photoValue("photo-1494790108377-be9c29b29330", 900),
      },
      {
        name: "Karan Rao",
        role: "Guest Experience Lead",
        bio: "Karan and his team make sure every meeting starts ready and runs smoothly.",
        image: photoValue("photo-1500648767791-00dcc994a43e", 900),
      },
    ],
    address: "27 Residency Road, Ashok Nagar, Bengaluru 560025",
    page: {
      ...base.page,
      heroHeading: "Work in Workscape",
      heroSubHeading:
        "Flexible rooms for interviews, workshops, presentations and team decisions.",
      heroImage: photo(WORKSCAPE_PHOTOS.hero[0], 1900),
      cardImage: photo(WORKSCAPE_PHOTOS.hero[1], 1100),
    },
    extra: {
      ...base.extra,
      meetingRooms: rooms.map((room, index) => ({
        ...room,
        images: WORKSCAPE_PHOTOS.rooms
          .slice(index * 3, index * 3 + 3)
          .map((id) => photoValue(id)),
      })),
    },
  };
})();

// Brixspace uses a people-first, green-accented photo set that is separate from the
// architectural Workscape and warm Flowspace meeting-room libraries.
const BRIXSPACE_PHOTOS = {
  hero: [
    "photo-1521737711867-e3b97375f902",
    "photo-1552664730-d307ca884978",
    "photo-1522071820081-009f0129c71c",
  ],
  rooms: [
    "photo-1497366811353-6870744d04b2",
    "photo-1497366754035-f200968a6e72",
    "photo-1497366216548-37526070297c",
    "photo-1524758631624-e2822e304c36",
    "photo-1497215728101-856f4ea42174",
    "photo-1505409859467-3a796fd5798e",
    "photo-1517245386807-bb43f82c33c4",
    "photo-1556761175-b413da4baf72",
    "photo-1556761175-4b46a572b786",
    "photo-1556761175-5973dc0f32e7",
    "photo-1497366412874-3415097a27e7",
    "photo-1522202176988-66273c2fd55f",
    "photo-1524178232363-1fb2b075b655",
    "photo-1542744173-8e7e53415bb0",
    "photo-1551836022-d5d88e9218df",
    "photo-1568992687947-868a62a9f521",
    "photo-1600508774634-4e11d34730e2",
    "photo-1504384308090-c894fdcc538d",
    "photo-1552664730-d307ca884978",
    "photo-1521737711867-e3b97375f902",
    "photo-1517502884422-41eaead166d4",
    "photo-1524758631624-e2822e304c36",
    "photo-1497215842964-222b430dc094",
    "photo-1551836022-d5d88e9218df",
    "photo-1542744173-8e7e53415bb0",
  ],
};
const BRIXSPACE_DEMO_BUSINESS: DemoBusiness = (() => {
  const base = DEMO_BUSINESSES.meeting;
  const rooms = ((base.extra as any).meetingRooms || []) as any[];
  const names = [
    "Focus Room",
    "Huddle Studio",
    "Strategy Suite",
    "Boardroom",
    "Training Loft",
  ];
  const descriptions = [
    "A calm two-to-four person room for interviews, one-to-ones and focused decisions.",
    "A bright team room with a screen and whiteboard for quick workshops and weekly syncs.",
    "A flexible collaboration suite for planning sessions, client reviews and project kick-offs.",
    "A polished boardroom with dependable video conferencing for important presentations.",
    "An adaptable studio for training days, facilitated workshops and larger team sessions.",
  ];
  return {
    ...base,
    companyName: "Brix Rooms",
    title: "Connect, Collaborate, Grow Together",
    subTitle:
      "Thoughtful meeting rooms, reliable technology and hospitality that helps every conversation move forward.",
    cta: "Book Space",
    heroImages: BRIXSPACE_PHOTOS.hero.map((id) => photo(id, 2000)),
    gallery: [...BRIXSPACE_PHOTOS.hero, ...BRIXSPACE_PHOTOS.rooms].map((id) =>
      photo(id, 1500),
    ),
    aboutImages: [
      BRIXSPACE_PHOTOS.hero[1],
      BRIXSPACE_PHOTOS.rooms[7],
      BRIXSPACE_PHOTOS.rooms[12],
    ].map((id) => photo(id, 1300)),
    aboutTitle: "A better room for work that matters",
    aboutPageStory:
      "Brix Rooms makes it easier for teams to gather, focus and make progress in spaces that feel considered from the moment they arrive.",
    about: [
      "We believe useful work starts with the right environment: calm, comfortable and ready before the first guest walks in.",
      "Our team combines flexible layouts, reliable technology and genuine hospitality so every meeting can stay focused on its purpose.",
    ],
    founders: [
      {
        name: "Anika Shah",
        role: "Founder & Space Director",
        bio: "Anika designs rooms around the way people actually meet, think and decide.",
        image: photoValue("photo-1494790108377-be9c29b29330", 900),
      },
      {
        name: "Rohan Mehta",
        role: "Guest Experience Lead",
        bio: "Rohan makes sure every room, screen and coffee is ready before the team arrives.",
        image: photoValue("photo-1500648767791-00dcc994a43e", 900),
      },
      {
        name: "Maya Iyer",
        role: "Community & Partnerships",
        bio: "Maya connects Brix Rooms with facilitators, local teams and growing businesses.",
        image: photoValue("photo-1534528741775-53994a69daeb", 900),
      },
    ],
    address: "42 Residency Road, Ashok Nagar, Bengaluru 560025",
    page: {
      ...base.page,
      heroHeading: "Meeting spaces built for momentum",
      heroSubHeading:
        "Choose a focused room, flexible studio or polished boardroom and make it yours for the hour.",
      heroImage: photo(BRIXSPACE_PHOTOS.hero[0], 1900),
      cardImage: photo(BRIXSPACE_PHOTOS.hero[1], 1100),
    },
    extra: {
      ...base.extra,
      meetingRooms: rooms
        .slice(0, 5)
        .map((room, index) => ({
          ...room,
          title: names[index],
          description: descriptions[index],
          price: ["650", "950", "1,400", "2,200", "3,200"][index],
          priceUnit: "hour",
          capacity: [4, 8, 12, 16, 30][index],
          images: BRIXSPACE_PHOTOS.rooms
            .slice(index * 5, index * 5 + 5)
            .map((id) => photoValue(id)),
        })),
    },
  };
})();

// Worpace uses a distinct, natural-light editorial photo direction rather than Commons' bento imagery.
const worpacePhoto = (id: string, width = 1600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
const worpaceValue = (id: string, width = 1200) => ({
  url: worpacePhoto(id, width),
});
const WORPACE_PHOTOS = {
  hero: ["36631703", "7534224", "5825371"],
  spaces: [
    "26966416",
    "15465916",
    "18513001",
    "33393712",
    "1170412",
    "1181396",
    "31709069",
    "29284287",
    "1181345",
    "3760093",
    "2608517",
    "3184431",
  ],
};
const WORPACE_DEMO_BUSINESS: DemoBusiness = (() => {
  const base = DEMO_BUSINESSES.workspace;
  const items = (base.pageItems || []) as any[];
  return {
    ...base,
    companyName: "Northline Works",
    title: "CREATIVE WORKSPACE",
    subTitle:
      "Flexible desks, private offices and a useful community for people building what comes next.",
    cta: "Get Started",
    heroImages: WORPACE_PHOTOS.hero.map((id) => worpacePhoto(id, 1900)),
    gallery: [...WORPACE_PHOTOS.hero, ...WORPACE_PHOTOS.spaces].map((id) =>
      worpacePhoto(id, 1450),
    ),
    aboutImages: [
      WORPACE_PHOTOS.spaces[6],
      WORPACE_PHOTOS.spaces[2],
      WORPACE_PHOTOS.spaces[7],
    ].map((id) => worpacePhoto(id, 1200)),
    aboutTitle: "Where productivity meets comfort",
    aboutPageStory:
      "Northline Works brings focused desks, private rooms and an open community together under one carefully run roof.",
    founders: [
      {
        name: "Mira Shah",
        role: "Founder & Workplace Director",
        bio: "Mira shapes calm, useful spaces where independent people and growing teams can do their best work.",
        image: worpaceValue("3769021", 900),
      },
      {
        name: "Arjun Mehta",
        role: "Community Lead",
        bio: "Arjun connects members, hosts thoughtful events and makes every new arrival feel at home.",
        image: worpaceValue("2379004", 900),
      },
    ],
    address: "18 Residency Road, Ashok Nagar, Bengaluru 560025",
    page: {
      ...base.page,
      heroHeading: "Workspace options that fit you",
      heroSubHeading:
        "Choose a desk, office or team suite and shape it around the way you work.",
      heroImage: worpacePhoto(WORPACE_PHOTOS.hero[0], 1900),
      cardImage: worpacePhoto(WORPACE_PHOTOS.hero[1], 1100),
    },
    pageItems: items.map((item, index) => ({
      ...item,
      images: WORPACE_PHOTOS.spaces
        .slice(index * 2, index * 2 + 3)
        .map((id) => worpaceValue(id)),
    })),
  };
})();

// Qerja uses a crisp, people-first photo direction with brighter communal spaces and teal/yellow branding.
const qerjaPhoto = (id: string, width = 1600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
const qerjaValue = (id: string, width = 1200) => ({
  url: qerjaPhoto(id, width),
});
const QERJA_PHOTOS = {
  hero: ["3182759", "3183190", "3182827"],
  spaces: [
    "3182812",
    "3184416",
    "3182811",
    "3182765",
    "3182826",
    "3182833",
    "3184287",
    "3205570",
    "3768904",
    "3861958",
    "4348404",
    "7654118",
  ],
};
const QERJA_DEMO_BUSINESS: DemoBusiness = (() => {
  const base = DEMO_BUSINESSES.workspace;
  const items = (base.pageItems || []) as any[];
  return {
    ...base,
    companyName: "Qerja",
    title: "We’re the Perfect Working Space for You",
    subTitle:
      "Thoughtfully designed workspaces, useful services and a community that helps every workday flow better.",
    cta: "Learn more",
    heroImages: QERJA_PHOTOS.hero.map((id) => qerjaPhoto(id, 1900)),
    gallery: [...QERJA_PHOTOS.hero, ...QERJA_PHOTOS.spaces].map((id) =>
      qerjaPhoto(id, 1450),
    ),
    aboutImages: [
      QERJA_PHOTOS.spaces[1],
      QERJA_PHOTOS.spaces[5],
      QERJA_PHOTOS.spaces[8],
    ].map((id) => qerjaPhoto(id, 1200)),
    aboutTitle: "We help businesses feel at home while they grow",
    aboutPageStory:
      "Qerja Collective combines practical workspaces, thoughtful hospitality and an active professional community in one bright, welcoming place.",
    about: [
      "We designed Qerja for people who want the freedom of flexible work without giving up the energy and support of a shared workplace.",
      "Every desk, room and service is shaped around useful workdays: comfortable, reliable and ready to change as your team changes.",
    ],
    founders: [
      {
        name: "Aanya Mehta",
        role: "Founder & Community Director",
        bio: "Aanya builds useful spaces and the connections that make them feel alive.",
        image: qerjaValue("6893942", 900),
      },
      {
        name: "Dev Malhotra",
        role: "Workspace Experience Lead",
        bio: "Dev makes sure every member and guest has what they need for a productive day.",
        image: qerjaValue("4348404", 900),
      },
      {
        name: "Maya Rao",
        role: "Partnerships Lead",
        bio: "Maya brings teams, local businesses and the wider creative community together.",
        image: qerjaValue("774909", 900),
      },
    ],
    address: "42 Residency Road, Ashok Nagar, Bengaluru 560025",
    page: {
      ...base.page,
      heroHeading: "Find Your Ideal Workspace",
      heroSubHeading:
        "Choose a flexible desk, private office or team suite and make the workday your own.",
      heroImage: qerjaPhoto(QERJA_PHOTOS.hero[0], 1900),
      cardImage: qerjaPhoto(QERJA_PHOTOS.hero[1], 1100),
    },
    pageItems: items.map((item, index) => ({
      ...item,
      images: QERJA_PHOTOS.spaces
        .slice(index * 2, index * 2 + 3)
        .map((id) => qerjaValue(id)),
    })),
  };
})();

// Cali Hostel has its own sun-washed, people-first photo library so it never
// repeats the room imagery or travel tone of Wayfarer, Travigo or Lodge.
const caliPhoto = (id: string, width = 1600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
const caliValue = (id: string, width = 1200) => ({ url: caliPhoto(id, width) });
const CALI_HOSTEL_PHOTOS = {
  hero: ["4907181", "5158948", "7969104"],
  rooms: [
    "5137980",
    "7969098",
    "4907181",
    "7969104",
    "4907199",
    "4907207",
    "4907208",
    "4907229",
    "4907175",
    "5158948",
    "4907190",
    "4907236",
    "4907235",
    "4907429",
    "5158945",
    "7969106",
    "7969099",
    "4907179",
    "4907183",
    "4907617",
  ],
  life: [
    "5158948",
    "4907175",
    "4907179",
    "4907183",
    "4907617",
    "7969106",
    "7969099",
    "7969104",
    "4907207",
    "4907199",
    "4907181",
    "4907229",
  ],
};
const CALI_HOSTEL_DEMO_BUSINESS: DemoBusiness = (() => {
  const base = DEMO_BUSINESSES.hostel;
  const rooms = ((base.extra as any).dorms || []) as any[];
  const roomNames = [
    "Sunset Social Dorm",
    "The Quiet Six",
    "Women’s Garden Dorm",
    "Private Hideaway",
  ];
  const roomCopy = [
    "An airy mixed dorm with privacy curtains, reading lights and room for easy conversation before the day begins.",
    "Six calm bunks, generous lockers and a quieter position in the house for travellers who take sleep seriously.",
    "A light-filled women-only dorm beside the garden, with ensuite access and thoughtful personal storage.",
    "A warm private room for two with a queen bed, its own bathroom and all the energy of the hostel just downstairs.",
  ];
  return {
    ...base,
    companyName: "Marea House",
    title: "Come for the coast. Stay for the people.",
    subTitle:
      "Social rooms, deep sleep and good stories in the middle of everything.",
    cta: "Find Your Bed",
    heroImages: CALI_HOSTEL_PHOTOS.hero.map((id) => caliPhoto(id, 2000)),
    gallery: [...CALI_HOSTEL_PHOTOS.life, ...CALI_HOSTEL_PHOTOS.rooms].map(
      (id) => caliPhoto(id, 1500),
    ),
    aboutImages: [
      CALI_HOSTEL_PHOTOS.life[0],
      CALI_HOSTEL_PHOTOS.life[4],
      CALI_HOSTEL_PHOTOS.life[6],
    ].map((id) => caliPhoto(id, 1300)),
    address: "18 Palm Grove Road, Anjuna, Goa 403509",
    aboutTitle: "A house made for crossing paths",
    aboutPageStory:
      "Marea House began with a simple idea: travelling alone should never feel lonely. We turned a sun-washed old house into a relaxed base for people who want proper rest, honest local tips and new company when they want it.",
    about: [
      "Our rooms are designed for sleep first—solid bunks, privacy curtains, quiet corners and space for your things.",
      "Downstairs, the long table, garden and rooftop make it easy to meet without forcing the moment. Join in, head out, or take the afternoon for yourself.",
    ],
    founders: [
      {
        name: "Nina D'Souza",
        role: "Founder & Host",
        bio: "Nina built Marea as the hostel she always hoped to find on the road: warm, useful and full of local character.",
        image: caliValue("3763188", 900),
      },
      {
        name: "Kabir Menon",
        role: "House & Experience Lead",
        bio: "Kabir knows every beach bus, late-night food stop and sunrise route worth taking.",
        image: caliValue("2379004", 900),
      },
      {
        name: "Lena Costa",
        role: "Community Host",
        bio: "Lena runs the shared table, walking plans and the little rituals that turn arrivals into friendships.",
        image: caliValue("733872", 900),
      },
    ],
    page: {
      ...base.page,
      heroHeading: "Beds made for real rest",
      heroSubHeading:
        "Social dorms, quiet bunks and a private room—each with thoughtful details and no hotel stiffness.",
      heroImage: caliPhoto(CALI_HOSTEL_PHOTOS.rooms[0], 1900),
      cardImage: caliPhoto(CALI_HOSTEL_PHOTOS.rooms[4], 1200),
    },
    extra: {
      ...base.extra,
      // roomKind/genderPolicy/capacity/bedType/bathroom drive the listing chips (see
      // buildChips in serviceAdapter.ts) — set explicitly per room instead of inheriting
      // the base hostel's values, which belonged to differently-named rooms at these indexes
      // and produced chips that contradicted these rooms' own names and descriptions.
      dorms: rooms.slice(0, 4).map((room, index) => ({
        ...room,
        title: roomNames[index],
        description: roomCopy[index],
        price: ["850", "1,050", "1,150", "3,200"][index],
        priceUnit: "night",
        badge: index === 0 ? "Most social" : index === 2 ? "Women only" : "",
        images: CALI_HOSTEL_PHOTOS.rooms
          .slice(index * 5, index * 5 + 5)
          .map((id) => caliValue(id)),
        features: [
          "Privacy curtain",
          "Personal reading light",
          "Lockable storage",
          "Fast Wi-Fi",
          index === 3 ? "Private bathroom" : "Hot shared showers",
          "Fresh linen",
        ],
        roomKind: index === 3 ? "private" : "dorm",
        genderPolicy: index === 2 ? "female" : "mixed",
        capacity: [6, 6, 4, 2][index],
        bedType: index === 3 ? "queen" : "bunk",
        bathroom: index === 2 || index === 3 ? "ensuite" : "shared",
      })),
    },
  };
})();

const AROMATICA_PHOTOS = {
  hero: [
    "photo-1528605248644-14dd04022da1",
    "photo-1447933601403-0c6688de566e",
    "photo-1501339847302-ac426a4a7cbb",
  ],
  roast: [
    "photo-1511081692775-05d0f180a065",
    "photo-1461988091159-192b6df7054f",
    "photo-1495474472287-4d71bcdd2085",
  ],
  drinks: [
    "photo-1512568400610-62da28bc8a13",
    "photo-1498804103079-a6351b050096",
    "photo-1509042239860-f550ce710b93",
    "photo-1517701604599-bb29b565090c",
  ],
  cafe: [
    "photo-1459755486867-b55449bb39ff",
    "photo-1554118811-1e0d58224f24",
    "photo-1521017432531-fbd92d768814",
    "photo-1511537190424-bbbab87ac5eb",
  ],
};

const AROMATICA_DEMO_BUSINESS: DemoBusiness = (() => {
  const base = DEMO_BUSINESSES.menu;
  const items = [
    {
      category: "Espresso bar",
      name: "Honey Cortado",
      price: "₹240",
      description:
        "Double espresso, warm textured milk and a touch of wildflower honey.",
      image: AROMATICA_PHOTOS.drinks[0],
      badge: "House favourite",
    },
    {
      category: "Espresso bar",
      name: "Orange Blossom Latte",
      price: "₹280",
      description:
        "Silky milk, house espresso and fragrant orange blossom syrup.",
      image: AROMATICA_PHOTOS.drinks[1],
      badge: "Seasonal",
    },
    {
      category: "Slow coffee",
      name: "Ethiopia Guji Pour",
      price: "₹320",
      description:
        "A floral single origin with notes of peach, bergamot and cocoa nib.",
      image: AROMATICA_PHOTOS.drinks[2],
      badge: "Single origin",
    },
    {
      category: "Slow coffee",
      name: "Roastery Cold Brew",
      price: "₹260",
      description:
        "Eighteen-hour cold brew, bright and clean with a chocolate finish.",
      image: AROMATICA_PHOTOS.drinks[3],
      badge: "All day",
    },
    {
      category: "Roasted beans",
      name: "Morning Ritual Blend",
      price: "₹720",
      description:
        "Caramel, roasted almond and orange zest. Balanced for espresso or moka pot.",
      image: AROMATICA_PHOTOS.roast[0],
      badge: "250 g",
    },
    {
      category: "Roasted beans",
      name: "Monsoon Estate",
      price: "₹780",
      description:
        "A rich Indian single estate coffee with spice, cacao and a round body.",
      image: AROMATICA_PHOTOS.roast[1],
      badge: "250 g",
    },
    {
      category: "Roasted beans",
      name: "Sunday Filter",
      price: "₹690",
      description:
        "Soft stone fruit, panela sweetness and a tea-like finish for filter brewing.",
      image: AROMATICA_PHOTOS.roast[2],
      badge: "250 g",
    },
  ];
  const toMenuItem = (item: any, index: number) => ({
    ...item,
    enabled: true,
    dietary: "vegan",
    spiceLevel: 0,
    popular: index < 2,
    featured: index < 4,
    priceUnit: "",
    images: [
      item.image,
      AROMATICA_PHOTOS.cafe[index % AROMATICA_PHOTOS.cafe.length],
    ].map((id) => photoValue(id)),
    image: photo(item.image, 1200),
  });
  return {
    ...base,
    companyName: "Emberline Coffee Roasters",
    title: "Coffee, transformed by fire and patience",
    subTitle:
      "Traceable beans, small-batch roasting and an open coffee bar in the heart of Bengaluru.",
    heroImages: AROMATICA_PHOTOS.hero.map((id) => photo(id, 1900)),
    gallery: [
      ...AROMATICA_PHOTOS.cafe,
      ...AROMATICA_PHOTOS.roast,
      ...AROMATICA_PHOTOS.drinks,
      ...AROMATICA_PHOTOS.hero,
    ].map((id) => photo(id, 1300)),
    aboutImages: [
      AROMATICA_PHOTOS.roast[0],
      AROMATICA_PHOTOS.cafe[0],
      AROMATICA_PHOTOS.cafe[3],
    ].map((id) => photo(id, 1200)),
    aboutTitle: "A roastery built around flavour",
    aboutPageStory:
      "Emberline began with a sample roaster, a borrowed table and weekly cuppings for friends. We now roast every batch in view of the café, still guided by taste rather than volume.",
    aboutPageMission:
      "To make exceptional, traceable coffee approachable — from the farmer who grew it to the guest drinking it.",
    aboutPageValues:
      "Buy thoughtfully. Roast transparently. Brew precisely. Welcome generously.",
    partnerHeading: "Build a better coffee programme",
    partnerContent:
      "We supply offices, restaurants and independent cafés with freshly roasted coffee, training and practical equipment support.",
    address: "18 Museum Road, Ashok Nagar, Bengaluru 560025",
    page: {
      ...base.page,
      heroHeading: "Coffee roasted for clarity",
      heroSubHeading:
        "Espresso, slow coffee and fresh retail beans — each selected and roasted in small batches.",
      heroImage: photo(AROMATICA_PHOTOS.hero[1], 1900),
      cardImage: photo(AROMATICA_PHOTOS.drinks[0], 1100),
    },
    extra: {
      ...base.extra,
      menuItems: items.map(toMenuItem),
    },
  };
})();

const demoBusinessFor = (
  kind: ServiceKind,
  themeVariant: string,
): DemoBusiness => {
  if (themeVariant === "tastyc" && kind === "menu") return TASTYC_DEMO_BUSINESS;
  if (themeVariant === "grandbar" && kind === "menu")
    return GRAND_BAR_DEMO_BUSINESS;
  if (themeVariant === "aromatica" && kind === "menu")
    return AROMATICA_DEMO_BUSINESS;
  if (themeVariant === "flowspace" && kind === "meeting")
    return FLOWSPACE_DEMO_BUSINESS;
  if (themeVariant === "workscape" && kind === "meeting")
    return WORKSCAPE_DEMO_BUSINESS;
  if (themeVariant === "brixspace" && kind === "meeting")
    return BRIXSPACE_DEMO_BUSINESS;
  if (themeVariant === "worpace" && kind === "workspace")
    return WORPACE_DEMO_BUSINESS;
  if (themeVariant === "qerja" && kind === "workspace")
    return QERJA_DEMO_BUSINESS;
  if (themeVariant === "travigo" && kind === "hostel")
    return TRAVIGO_DEMO_BUSINESS;
  if (themeVariant === "lodge" && kind === "hostel") return LODGE_DEMO_BUSINESS;
  if (themeVariant === "cali-hostel" && kind === "hostel")
    return CALI_HOSTEL_DEMO_BUSINESS;
  if (themeVariant === "tulum" && kind === "coLiving") return tulumDemo;
  if (themeVariant === "grindelwald" && kind === "coLiving")
    return grindelwaldDemo;
  return DEMO_BUSINESSES[kind];
};

/** The kind of business a template is previewed with when no services are chosen. */
export const defaultKindForTemplate = (themeVariant: string): ServiceKind =>
  TEMPLATE_KIND[themeVariant] || "workspace";

// Pexels "Video of a House Interior" (free to use, no attribution needed); 2K file, 21 seconds.
const CAMELIA_DEMO_VIDEO =
  "https://videos.pexels.com/video-files/7578546/7578546-uhd_2560_1440_30fps.mp4";
// Pexels "A Bartender Making A Cocktail Drink" (free to use, no attribution needed); HD, portrait.
const GRAND_BAR_DEMO_VIDEO =
  "https://videos.pexels.com/video-files/7608984/7608984-hd_720_1280_25fps.mp4";

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

export const buildDemoPreviewDraft = (
  themeVariant: string,
  serviceNames: string[] = [],
) => {
  const main = defaultKindForTemplate(themeVariant);
  // Only the services explicitly picked in the picker widen this beyond the template's own kind
  // — otherwise a co-living template like Camelia would preview with meeting-room/cafe/hostel
  // content bolted on by default, which reads as broken rather than "multi-service".
  const kinds: ServiceKind[] = serviceNames.length
    ? serviceNames.map(serviceNameToKind)
    : [main];
  const primary = demoBusinessFor(kinds[0], themeVariant);

  const pages = kinds.map((kind, index) => {
    const business = demoBusinessFor(kind, themeVariant);
    // Keep pages distinct when the same kind is picked twice.
    const slug =
      index > 0 && kinds.indexOf(kind) !== index
        ? `${business.page.slug}-${index + 1}`
        : business.page.slug;
    return pageFor(kind, business, slug);
  });

  // Data lists and settings from every chosen service, so a multi-service business previews fully.
  const extra = kinds.reduce<Record<string, unknown>>(
    (acc, kind) => ({ ...demoBusinessFor(kind, themeVariant).extra, ...acc }),
    {},
  );
  const settings = kinds.reduce<Record<string, unknown>>(
    (acc, kind) => ({
      ...(demoBusinessFor(kind, themeVariant).settings || {}),
      ...acc,
    }),
    {},
  );
  const handle = slugOf(primary.companyName);

  return {
    searchKey: "demo-preview",
    companyId: "demo",
    workspaceId: "",
    // Demo previews always show USD, independent of whoever's browsing the template
    // gallery — a real company's own currency only kicks in once they've started
    // building their own site (see useWebsiteTemplateData's workspace-currency fallback).
    currency: "USD",
    themeVariant,
    // Camelia's hero plays a looping video when one is linked (see the builder's "Hero Video URL").
    // The sample clip is a placeholder for previews only; a real site sets its own link.
    heroVideoUrl:
      themeVariant === "camelia"
        ? CAMELIA_DEMO_VIDEO
        : themeVariant === "tulum"
          ? TULUM_DEMO_VIDEO
          : themeVariant === "grindelwald"
            ? GRINDELWALD_DEMO_VIDEO
            : themeVariant === "grandbar"
              ? GRAND_BAR_DEMO_VIDEO
              : "",
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
    aboutPageImageCards: primary.team.map((member) => ({
      ...member,
      enabled: true,
    })),
    // Tulum always shows its own three team members, whichever services were picked.
    founders:
      themeVariant === "tulum"
        ? tulumDemo.founders
        : themeVariant === "grindelwald"
          ? grindelwaldDemo.founders
          : primary.founders,
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
    mapUrl:
      themeVariant === "qerja" || themeVariant === "cali-hostel"
        ? `https://www.google.com/maps?q=${encodeURIComponent(primary.address)}&output=embed`
        : "https://www.openstreetmap.org/export/embed.html?bbox=77.58%2C12.96%2C77.65%2C12.99&layer=mapnik",
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
    products:
      kinds[0] === "workspace"
        ? (primary.pageItems || []).map((item: any) => ({
            name: item.name,
            slug: slugOf(item.name),
            description: item.description,
            images: item.images,
          }))
        : [],
    ...extra,
    ...settings,
    productDropdownPages: pages,
    productPages: pages,
  };
};
