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
  flowspace: "meeting",
  workscape: "meeting",
  worpace: "workspace",
  wayfarer: "hostel",
  travigo: "hostel",
  lodge: "hostel",
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

// Grindelwald has its own forest photo set: the hero is a lake, the cabins are exteriors and the slider shows interiors.
const GRINDELWALD_PHOTOS = {
  hero: ["photo-1473448912268-2022ce9509d8", "photo-1786962904165-ec070af23a64", "photo-1557456170-0cf4f4d0d362"],
  cabins: [
    ["photo-1449158743715-0a90ebb6d2d8", "photo-1570793005386-840846445fed", "photo-1518107784960-eb57c673a7ba", "photo-1537197518227-a36efeafd477"],
    ["photo-1601919051950-bb9f3ffb3fee", "photo-1702959638073-3fa29ddb6a98", "photo-1772955543023-a6e99819e161", "photo-1759675001595-7b1e5ff997f0"],
    ["photo-1510798831971-661eb04b3739", "photo-1621771674545-849014cf91fa", "photo-1767711384997-6804f4b54997", "photo-1566754844421-9bc834baf4a3"],
  ],
  interiors: [
    "photo-1631630259742-c0f0b17c6c10", "photo-1773579089983-50348cc9abd0", "photo-1645242075656-e4e435b7a5f5", "photo-1631941392209-70cad44ecfb7", "photo-1697807713040-b5fb60d6f012",
    "photo-1787755144917-cbcf31e44f26", "photo-1761782791727-3994283faa88", "photo-1591825729269-caeb344f6df2", "photo-1726090401458-7abb00f7450c", "photo-1680703486830-1b5af60635d7",
  ],
  extra: ["photo-1786962904165-ec070af23a64", "photo-1557456170-0cf4f4d0d362", "photo-1473448912268-2022ce9509d8"],
};
// Pexels "Cabin in the woods" (free to use, no attribution needed); 720p, 18 seconds.
const GRINDELWALD_DEMO_VIDEO = "https://videos.pexels.com/video-files/7664024/7664024-hd_1366_720_24fps.mp4";

const grindelwaldDemo: DemoBusiness = (() => {
  const base = DEMO_BUSINESSES.coLiving;
  const rooms = ((base.extra as any).coLivingRooms || []) as any[];
  return {
    ...base,
    companyName: "Cedar Ridge Cabins",
    title: "Cozy cabins in the woods.",
    subTitle: "Peaceful cabins among the pines, a short drive from town, with a hot tub, trails and a fire pit.",
    heroImages: GRINDELWALD_PHOTOS.hero.map((id) => photo(id, 1600)),
    gallery: [...GRINDELWALD_PHOTOS.interiors, ...GRINDELWALD_PHOTOS.extra].map((id) => photo(id, 1200)),
    aboutImages: [GRINDELWALD_PHOTOS.cabins[0][0], GRINDELWALD_PHOTOS.cabins[1][0], GRINDELWALD_PHOTOS.extra[0]].map((id) => photo(id, 1000)),
    address: "Forest Road 9, Pine Ridge Valley, Himachal Pradesh",
    founders: [
      { name: "Maya Forrest", role: "Host and founder", bio: "Maya opened Cedar Ridge Cabins to share quiet mornings in the pines. She still greets every guest at the gate.", highlights: "12 years hosting in the mountains\nFounded Cedar Ridge Cabins in 2018", image: faceCrop("photo-1580489944761-15a19d654956") },
      { name: "Ravi Menon", role: "Operations", bio: "Ravi keeps the cabins warm, stocked and ready for every arrival, and plans the trail and fire-pit schedule each week.", highlights: "Former resort operations lead\nCertified outdoor first-aid", image: faceCrop("photo-1507003211169-0a1dd7228f2d") },
      { name: "Elena Brooks", role: "Guest experience", bio: "Elena designs the stay from the first enquiry to the last morning, with local guides and quiet corners for each guest.", highlights: "Ten years in guest services\nLocal trail guide", image: faceCrop("photo-1699899657680-421c2c2d5064") },
    ],
    aboutTitle: "A cabin for slow days",
    aboutPageStory: "We started with one cabin among the pines and a simple wish: a place where guests can switch off, breathe and listen to the forest. Today we look after three cabins, each run with the same care.",
    about: [
      "Cedar Ridge Cabins is a small set of cabins among the pines, a short drive from town.",
      "Every cabin has a wood stove, a hot tub and a deck, plus trail maps and a host who can point you to the best views.",
    ],
    partnerHeading: "Partner with Cedar Ridge Cabins",
    page: {
      ...base.page,
      heroHeading: "Rooms",
      heroSubHeading: "Three cabins, each with its own deck, wood stove and a view of the trees.",
      heroImage: photo(GRINDELWALD_PHOTOS.cabins[2][0], 1600),
      cardImage: photo(GRINDELWALD_PHOTOS.cabins[0][0], 1000),
    },
    extra: {
      ...base.extra,
      coLivingRooms: rooms.slice(0, 3).map((room, index) => ({
        ...room,
        title: ["Cedar Cabin", "Pine Hollow", "Ridge Lodge"][index],
        description: ["For the times when life is too much, quit everything and enjoy the woods.", "A snug cabin under the trees, with a deck for morning coffee and a wood stove for the evenings.", "Our largest cabin, with a hot tub on the deck and views across the valley."][index],
        area: ["320 sq ft", "410 sq ft", "560 sq ft"][index],
        // Eight lines per cabin, so the list fills the same height as the photo beside it.
        features: [
          ["Wood stove", "Hot tub", "Private deck", "Fire pit", "Wi-Fi", "Kitchenette", "Heating", "Parking"],
          ["Wood stove", "Reading nook", "Private deck", "Fire pit", "Wi-Fi", "Kitchenette", "Heating", "Parking"],
          ["Hot tub", "Two bedrooms", "Panoramic deck", "Fire pit", "Wi-Fi", "Full kitchen", "Heating", "Parking"],
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
    ["photo-1721299417031-de890ff33b26", "photo-1574716236621-87d2be17b3a3", "photo-1767884162402-683fdd430046", "photo-1781415980730-bfcf192e38bc"],
    ["photo-1790774877815-5358d88f4c52", "photo-1790774881068-06250724c951", "photo-1790774888379-dd545dfa3343", "photo-1790774868320-64fd572a7aa7"],
    ["photo-1631844820835-e698dc518bc6", "photo-1631844820822-caeca853b27d", "photo-1675409145919-277c0fc2aa7d", "photo-1790774868084-32fb1a98cd85"],
    ["photo-1785486250394-868889952dcd", "photo-1763419161907-1e00b2f883c5", "photo-1781004672179-9790a9623a77", "photo-1744187170998-368291b6e16e"],
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
  subTitle: "Comfortable rooms, a friendly community and everything you need close by.",
  heroImages: LODGE_PHOTOS.hero.map((id) => photo(id, 1600)),
  gallery: LODGE_PHOTOS.gallery.map((id) => photo(id, 1200)),
  aboutImages: [LODGE_PHOTOS.gallery[0], LODGE_PHOTOS.gallery[2], LODGE_PHOTOS.gallery[4]].map((id) => photo(id, 1000)),
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
      images: (LODGE_PHOTOS.rooms[index] || LODGE_PHOTOS.rooms[0]).map((id) => photoValue(id)),
    })),
  },
};

// Tastyc has a separate coffee-house photo direction so its preview never looks like Savor.
// Dark roast details, moody interiors and close-up pastry photography mirror the reference's
// cinematic coffee-house mood while keeping every image replaceable in the builder.
const TASTYC_PHOTOS = {
  hero: [
    "photo-1442512595331-e89e73853f31",
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
    subTitle: "Small-batch coffee, handmade pastries and a room worth staying in.",
    cta: "Book a table",
    heroImages: TASTYC_PHOTOS.hero.map((id) => photo(id, 1800)),
    gallery: [...TASTYC_PHOTOS.interior, ...TASTYC_PHOTOS.coffee, ...TASTYC_PHOTOS.food].map((id) => photo(id, 1200)),
    aboutImages: TASTYC_PHOTOS.interior.slice(0, 3).map((id) => photo(id, 1000)),
    aboutTitle: "We invite you to visit our coffee house",
    aboutPageStory: "We roast in small batches, bake before sunrise and keep a table ready for people who like their coffee with a little more time.",
    about: [
      "Ember & Oak began with one espresso machine, a small oven and the belief that a coffee house should feel memorable before the first sip.",
      "Today our baristas work with carefully sourced beans, our kitchen bakes throughout the morning and every plate is made to order.",
    ],
    address: "18 Roastery Lane, Indiranagar, Bengaluru 560038",
    page: {
      ...base.page,
      heroHeading: "Coffee menu",
      heroSubHeading: "Espresso, slow brews, breakfast plates and pastries baked every morning.",
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

// Flowspace keeps a separate photo library from Huddle: warmer materials, more daylight and
// a high-end editorial direction that mirrors the reference without repeating another template.
const pexels = (id: string, width = 1600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
const pexelsValue = (id: string, width = 1200) => ({ url: pexels(id, width) });
const FLOWSPACE_PHOTOS = {
  hero: ["3184465", "32800582", "20390771"],
  rooms: ["1181406", "3184292", "3184339", "3184360", "3182773", "2451566", "380769", "3184418", "3184431", "3184460", "3183197", "1181354"],
};
const FLOWSPACE_DEMO_BUSINESS: DemoBusiness = (() => {
  const base = DEMO_BUSINESSES.meeting;
  const rooms = ((base.extra as any).meetingRooms || []) as any[];
  return {
    ...base,
    companyName: "Lumen Rooms",
    title: "Your next meeting starts here.",
    subTitle: "Design-led meeting rooms with everything ready—from quick calls to full-day workshops.",
    cta: "Find your desk",
    heroImages: FLOWSPACE_PHOTOS.hero.map((id) => pexels(id, 1800)),
    gallery: [...FLOWSPACE_PHOTOS.hero, ...FLOWSPACE_PHOTOS.rooms].map((id) => pexels(id, 1400)),
    aboutImages: [FLOWSPACE_PHOTOS.hero[1], FLOWSPACE_PHOTOS.hero[2], FLOWSPACE_PHOTOS.rooms[8]].map((id) => pexels(id, 1100)),
    aboutTitle: "Spaces built around better conversations",
    aboutPageStory: "We make finding a polished, fully equipped meeting room feel effortless.",
    about: [
      "Lumen Rooms began with one simple observation: teams do better work when the room is calm, considered and ready before they arrive.",
      "Every space combines natural light, reliable technology and thoughtful support, with clear hourly pricing and a real person on hand.",
    ],
    address: "12 Museum Road, Ashok Nagar, Bengaluru 560001",
    page: {
      ...base.page,
      heroHeading: "Rooms for work that matters",
      heroSubHeading: "Private, fully equipped spaces for interviews, workshops, presentations and team decisions.",
      heroImage: pexels(FLOWSPACE_PHOTOS.hero[0], 1800),
      cardImage: pexels(FLOWSPACE_PHOTOS.hero[1], 1000),
    },
    extra: {
      ...base.extra,
      meetingRooms: rooms.map((room, index) => ({
        ...room,
        images: FLOWSPACE_PHOTOS.rooms.slice(index * 3, index * 3 + 3).map((id) => pexelsValue(id)),
      })),
    },
  };
})();

// Workscape uses a bright, architectural photo direction with clean timber, plants and daylight.
// These images are intentionally separate from Flowspace and the other meeting-room templates.
const WORKSCAPE_PHOTOS = {
  hero: ["photo-1521737711867-e3b97375f902", "photo-1497366754035-f200968a6e72", "photo-1524758631624-e2822e304c36"],
  rooms: ["photo-1497215842964-222b430dc094", "photo-1517502884422-41eaead166d4", "photo-1556761175-b413da4baf72", "photo-1497366216548-37526070297c", "photo-1568992687947-868a62a9f521", "photo-1600508774634-4e11d34730e2", "photo-1521737711867-e3b97375f902", "photo-1551836022-d5d88e9218df", "photo-1556761175-4b46a572b786", "photo-1504384308090-c894fdcc538d", "photo-1542744173-8e7e53415bb0", "photo-1552664730-d307ca884978"],
};
const WORKSCAPE_DEMO_BUSINESS: DemoBusiness = (() => {
  const base = DEMO_BUSINESSES.meeting;
  const rooms = ((base.extra as any).meetingRooms || []) as any[];
  return {
    ...base,
    companyName: "Atrium Rooms",
    title: "Work Better, Together",
    subTitle: "Bright, fully equipped meeting rooms for teams that value calm thinking and useful conversations.",
    cta: "Book Room",
    heroImages: WORKSCAPE_PHOTOS.hero.map((id) => photo(id, 1900)),
    gallery: [...WORKSCAPE_PHOTOS.hero, ...WORKSCAPE_PHOTOS.rooms].map((id) => photo(id, 1450)),
    aboutImages: [WORKSCAPE_PHOTOS.hero[1], WORKSCAPE_PHOTOS.rooms[6], WORKSCAPE_PHOTOS.rooms[9]].map((id) => photo(id, 1200)),
    aboutTitle: "About Atrium Rooms",
    aboutPageStory: "Atrium Rooms brings flexible meeting spaces, reliable technology and thoughtful hospitality together in one calm place.",
    about: [
      "We believe the room affects the work. Natural light, practical layouts and a team that prepares everything before you arrive make better meetings possible.",
      "From a private interview to a thirty-person workshop, every space can flex around the people and purpose in it.",
    ],
    founders: [
      { name: "Rhea Kapoor", role: "Founder & Space Director", bio: "Rhea designs adaptable rooms that make collaboration feel natural.", image: photoValue("photo-1494790108377-be9c29b29330", 900) },
      { name: "Karan Rao", role: "Guest Experience Lead", bio: "Karan and his team make sure every meeting starts ready and runs smoothly.", image: photoValue("photo-1500648767791-00dcc994a43e", 900) },
    ],
    address: "27 Residency Road, Ashok Nagar, Bengaluru 560025",
    page: {
      ...base.page,
      heroHeading: "Work in Workscape",
      heroSubHeading: "Flexible rooms for interviews, workshops, presentations and team decisions.",
      heroImage: photo(WORKSCAPE_PHOTOS.hero[0], 1900),
      cardImage: photo(WORKSCAPE_PHOTOS.hero[1], 1100),
    },
    extra: {
      ...base.extra,
      meetingRooms: rooms.map((room, index) => ({
        ...room,
        images: WORKSCAPE_PHOTOS.rooms.slice(index * 3, index * 3 + 3).map((id) => photoValue(id)),
      })),
    },
  };
})();

// Worpace uses a distinct, natural-light editorial photo direction rather than Commons' bento imagery.
const worpacePhoto = (id: string, width = 1600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
const worpaceValue = (id: string, width = 1200) => ({ url: worpacePhoto(id, width) });
const WORPACE_PHOTOS = {
  hero: ["36631703", "7534224", "5825371"],
  spaces: ["26966416", "15465916", "18513001", "33393712", "1170412", "1181396", "31709069", "29284287", "1181345", "3760093", "2608517", "3184431"],
};
const WORPACE_DEMO_BUSINESS: DemoBusiness = (() => {
  const base = DEMO_BUSINESSES.workspace;
  const items = (base.pageItems || []) as any[];
  return {
    ...base,
    companyName: "Northline Works",
    title: "CREATIVE WORKSPACE",
    subTitle: "Flexible desks, private offices and a useful community for people building what comes next.",
    cta: "Get Started",
    heroImages: WORPACE_PHOTOS.hero.map((id) => worpacePhoto(id, 1900)),
    gallery: [...WORPACE_PHOTOS.hero, ...WORPACE_PHOTOS.spaces].map((id) => worpacePhoto(id, 1450)),
    aboutImages: [WORPACE_PHOTOS.spaces[6], WORPACE_PHOTOS.spaces[2], WORPACE_PHOTOS.spaces[7]].map((id) => worpacePhoto(id, 1200)),
    aboutTitle: "Where productivity meets comfort",
    aboutPageStory: "Northline Works brings focused desks, private rooms and an open community together under one carefully run roof.",
    founders: [
      { name: "Mira Shah", role: "Founder & Workplace Director", bio: "Mira shapes calm, useful spaces where independent people and growing teams can do their best work.", image: worpaceValue("3769021", 900) },
      { name: "Arjun Mehta", role: "Community Lead", bio: "Arjun connects members, hosts thoughtful events and makes every new arrival feel at home.", image: worpaceValue("2379004", 900) },
    ],
    address: "18 Residency Road, Ashok Nagar, Bengaluru 560025",
    page: {
      ...base.page,
      heroHeading: "Workspace options that fit you",
      heroSubHeading: "Choose a desk, office or team suite and shape it around the way you work.",
      heroImage: worpacePhoto(WORPACE_PHOTOS.hero[0], 1900),
      cardImage: worpacePhoto(WORPACE_PHOTOS.hero[1], 1100),
    },
    pageItems: items.map((item, index) => ({
      ...item,
      images: WORPACE_PHOTOS.spaces.slice(index * 2, index * 2 + 3).map((id) => worpaceValue(id)),
    })),
  };
})();

const demoBusinessFor = (kind: ServiceKind, themeVariant: string): DemoBusiness => {
  if (themeVariant === "tastyc" && kind === "menu") return TASTYC_DEMO_BUSINESS;
  if (themeVariant === "flowspace" && kind === "meeting") return FLOWSPACE_DEMO_BUSINESS;
  if (themeVariant === "workscape" && kind === "meeting") return WORKSCAPE_DEMO_BUSINESS;
  if (themeVariant === "worpace" && kind === "workspace") return WORPACE_DEMO_BUSINESS;
  if (themeVariant === "travigo" && kind === "hostel") return TRAVIGO_DEMO_BUSINESS;
  if (themeVariant === "lodge" && kind === "hostel") return LODGE_DEMO_BUSINESS;
  if (themeVariant === "tulum" && kind === "coLiving") return tulumDemo;
  if (themeVariant === "grindelwald" && kind === "coLiving") return grindelwaldDemo;
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
    heroVideoUrl: themeVariant === "camelia" ? CAMELIA_DEMO_VIDEO : themeVariant === "tulum" ? TULUM_DEMO_VIDEO : themeVariant === "grindelwald" ? GRINDELWALD_DEMO_VIDEO : "",
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
    founders: themeVariant === "tulum" ? tulumDemo.founders : themeVariant === "grindelwald" ? grindelwaldDemo.founders : primary.founders,
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
