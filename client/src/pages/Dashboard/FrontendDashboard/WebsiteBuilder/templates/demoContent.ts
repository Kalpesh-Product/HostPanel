// Full sample businesses for the template picker's "Preview". One per kind of service, each
// with its own photos and enough text and images that a template looks finished. Nothing here
// is saved anywhere: it only feeds the picker preview (see demoPreviewData.ts).
//
// Photos are Unsplash images (free to hot-link), chosen per kind so a hostel never shows an
// office and a cafe never shows a bunk bed.
import type { ServiceKind } from "./verticalProfiles";

const U = (id: string, w = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
const FACE = (id: string, w = 600, h = 720) => `https://images.unsplash.com/${id}?auto=format&fit=crop&crop=faces&w=${w}&h=${h}&q=70`;
const ph = (id: string, w = 800) => ({ url: U(id, w) });

/* ───────────────────────── photo library ───────────────────────── */

const PEOPLE = {
  w: ["photo-1573497019236-17f8177b81e8", "photo-1573496527892-904f897eb744", "photo-1590650213165-c1fef80648c4", "photo-1573496799515-eebbb63814f2", "photo-1615349719958-8e6381dd2f3e"],
  m: ["photo-1576558656222-ba66febe3dec", "photo-1758599543230-652cc6831d69", "photo-1651684215020-f7a5b6610f23", "photo-1758525589507-1d64a20415ac", "photo-1758518729058-b158e71c5a9b"],
};

const IMG = {
  cowork: {
    hero: ["photo-1604328727766-a151d1045ab4", "photo-1527192491265-7e15c55b1ed2", "photo-1604328698692-f76ea9498e76", "photo-1497366754035-f200968a6e72"],
    openPlan: ["photo-1631193816258-28b44b21e78b", "photo-1577412647305-991150c7d163", "photo-1560264280-88b68371db39"],
    desks: ["photo-1594235048794-fae8583a5af5", "photo-1680781336783-8382d382e892", "photo-1700809887584-0798672b1d48"],
    cabin: ["photo-1497366412874-3415097a27e7", "photo-1706074740295-d7a79c079562", "photo-1643267514395-b36b3f7e8281"],
    suite: ["photo-1746173097873-a4b6eb66ac13", "photo-1637665627832-dcd730049fbb", "photo-1703355685952-03ed19f70f51"],
    day: ["photo-1553028826-f4804a6dba3b", "photo-1521737604893-d14cc237f11d", "photo-1522202176988-66273c2fd55f"],
    lounge: ["photo-1765366417031-60bc8543189c", "photo-1721898944099-f6187c140845"],
    booth: ["photo-1756480089667-3db4864409ab", "photo-1756368881750-e9e065a1d1ec"],
    team: ["photo-1522071820081-009f0129c71c", "photo-1519389950473-47ba0277781c", "photo-1572021335469-31706a17aaef", "photo-1522071901873-411886a10004"],
    focus: ["photo-1765894359240-49b82f93b91a", "photo-1771627278482-dec14f5eda58"],
    reception: ["photo-1758448093806-88b2089068ab"],
  },
  meeting: {
    hero: ["photo-1745920770891-b46fc1799646", "photo-1431540015161-0bf868a2d407", "photo-1628062699790-7c45262b82b4"],
    huddle: ["photo-1661169399398-dd271af8f651", "photo-1698653223247-09aaf01166fc", "photo-1664464683233-2b7f9afc9f08"],
    workshop: ["photo-1573166364839-1bfe9196c23e", "photo-1624555130296-e551faf8969b", "photo-1573165759995-5865a394a1aa"],
    board: ["photo-1431540015161-0bf868a2d407", "photo-1517502884422-41eaead166d4", "photo-1573167507387-6b4b98cb7c13"],
    training: ["photo-1762176264161-09219da49794", "photo-1697059361461-b81d0e98c3af", "photo-1762176263996-a0713a49ee4d"],
    extra: ["photo-1694253988732-816ab6e60caa", "photo-1764810815228-b7f9432eec5c"],
  },
  hostel: {
    hero: ["photo-1709805619372-40de3f158e83", "photo-1752491027824-e9006cd14046", "photo-1785486250446-b048054c8484"],
    dorm: ["photo-1555854877-bab0e564b8d5", "photo-1721299417031-de890ff33b26", "photo-1767884162402-683fdd430046"],
    private: ["photo-1727706572437-4fcda0cbd66f", "photo-1611892440504-42a792e24d32", "photo-1773423391716-04e278b07b1b"],
    twin: ["photo-1635247049915-dff57098ea0f", "photo-1736940924904-0e026dccf4d6"],
    common: ["photo-1764006195843-e6f9a5781500", "photo-1579609702289-ecbad32c2cf6", "photo-1516197067152-381321bc78e1"],
    roof: ["photo-1774280898104-d329acaae7b7", "photo-1777950797674-8d73d0352d13", "photo-1785486249823-02fbb298c918"],
    building: ["photo-1575393382552-1b59de5f4f3a", "photo-1782479590739-cbb9147c20a3"],
    travel: ["photo-1521335751419-603f61523713", "photo-1464198016405-33fd4527b89d", "photo-1539635278303-d4002c07eae3"],
  },
  coliving: {
    hero: ["photo-1774186184495-dc059ef40c75", "photo-1743867840110-ee532b7c6fb9", "photo-1657040899606-b22f17a6afd5"],
    single: ["photo-1632119289059-793dd347950f", "photo-1679939153964-2b9bd027f6e3", "photo-1635321349302-f91724057317"],
    twin: ["photo-1743867840110-ee532b7c6fb9", "photo-1612152605347-f93296cb657d"],
    triple: ["photo-1588796460718-f457ad1e1a1f", "photo-1604307612848-fcb357b1360c"],
    studio: ["photo-1706074801692-65d1a1489068", "photo-1700809888988-8eee683cc758", "photo-1776363116182-51694a04a1d5"],
    living: ["photo-1651407825801-eec2dcbd86bd", "photo-1615876234886-fd9a39fda97f"],
    kitchen: ["photo-1721614664523-5e0d3fc786d0", "photo-1758523417133-41f21fb9f058"],
    community: ["photo-1772724317486-6e664a4e8bbb", "photo-1772724317667-afe2d40f6158", "photo-1661006117166-6227bfc9c8b0", "photo-1772724317595-eab4ab9ff42e"],
  },
  cafe: {
    hero: ["photo-1555396273-367ea4eb4db5", "photo-1760175445000-0e01e193d1cd", "photo-1555507036-ab1f4038808a"],
    interior: ["photo-1600093463592-8e36ae95ef56", "photo-1521017432531-fbd92d768814", "photo-1551887196-72e32bfc7bf3"],
    coffee: ["photo-1509042239860-f550ce710b93", "photo-1563311977-d285756282dc", "photo-1547240089-0b75465f8e80"],
    bakery: ["photo-1568254183919-78a4f43a2877", "photo-1483695028939-5bb13f8648b0", "photo-1643944471768-2d2eac3afb6d"],
    brunch: ["photo-1753351055855-b898a3aadb45", "photo-1764174861943-a7914825311f", "photo-1753351057311-8fd3c46bc4e2"],
    work: ["photo-1704770064557-416292d1f4bd", "photo-1534432295314-d934309ea09d", "photo-1649060718881-236572de3c7f"],
  },
  workation: {
    hero: ["photo-1727964600806-b3a2bb8048e6", "photo-1654355229863-95a8a7a779dd", "photo-1649269752878-d563bcfd94ef"],
    desk: ["photo-1678690832871-8b9993c76aa8", "photo-1653567461945-162426401322", "photo-1658747006893-469fa6fbea2a"],
    stay: ["photo-1773423391716-04e278b07b1b", "photo-1721989517058-ea332276a832"],
    beach: ["photo-1654355252504-42c1c9dd1fe0", "photo-1715210471871-590883e6a720"],
  },
};

const FOOD: Record<string, string> = {
  latte: "photo-1495474472287-4d71bcdd2085",
  iced: "photo-1461023058943-07fcbe16d735",
  coffee: "photo-1509042239860-f550ce710b93",
  toast: "photo-1541519227354-08fa5d50c44d",
  pancakes: "photo-1567620905732-2d1ec7ab7445",
  croissant: "photo-1555507036-ab1f4038808a",
  cake: "photo-1578985545062-69928b1d9587",
  burger: "photo-1568901346375-23c9450c58cd",
  pasta: "photo-1621996346565-e3dbc646d9a9",
  pizza: "photo-1513104890138-7c749659a591",
  salad: "photo-1512621776951-a57141f2eefd",
};

/** Every photo URL this module can produce, so a test can check they all still load. */
export const DEMO_PHOTO_IDS: string[] = Array.from(
  new Set([
    ...Object.values(IMG).flatMap((group) => Object.values(group).flat()),
    ...Object.values(FOOD),
    ...PEOPLE.w,
    ...PEOPLE.m,
  ]),
);

/* ───────────────────────── shared pieces ───────────────────────── */

const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const hours = (open: string, close: string, closedDay = "") => days.map((day) => ({ day, open, close, closed: day === closedDay }));

const wordmark = (name: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='170' height='40'><text x='0' y='28' font-family='Arial' font-weight='800' font-size='24' fill='#0b1f3a'>${name}</text></svg>`)}`;

const person = (gender: "w" | "m", index: number) => FACE(PEOPLE[gender][index % PEOPLE[gender].length]);
const avatar = (gender: "w" | "m", index: number) => FACE(PEOPLE[gender][index % PEOPLE[gender].length], 200, 200);

interface Testimonial { name: string; jobPosition: string; testimony: string; rating: number; gender: "w" | "m" }
const testimonials = (list: Testimonial[]) => list.map((t, i) => ({ name: t.name, jobPosition: t.jobPosition, testimony: t.testimony, rating: t.rating, image: avatar(t.gender, i) }));

export interface DemoBusiness {
  vertical: string;
  companyName: string;
  title: string;
  subTitle: string;
  cta: string;
  heroImages: string[];
  gallery: string[];
  about: string[];
  aboutTitle: string;
  aboutPageStory: string;
  aboutPageMission: string;
  aboutPageValues: string;
  aboutPageTeamHeading: string;
  aboutImages: string[];
  team: { title: string; description: string; image: string }[];
  founders: { name: string; role: string; bio: string; highlights: string; image: string }[];
  testimonials: ReturnType<typeof testimonials>;
  faqs: { question: string; answer: string }[];
  inclusions: string[];
  partnerHeading: string;
  partnerContent: string;
  address: string;
  openingHours: ReturnType<typeof hours>;
  contactPersonName: string;
  contactPersonRole: string;
  page: { name: string; slug: string; heroHeading: string; heroSubHeading: string; homeCardHeading: string; homeCardSubText: string; heroImage: string; cardImage: string; faqs: { question: string; answer: string }[]; inclusions: string[] };
  /** The lists this kind of service keeps its offerings in (menuItems, dorms...). */
  extra: Record<string, unknown>;
  /** Co-working keeps its spaces on the service page itself. */
  pageItems?: any[];
  settings?: Record<string, unknown>;
}

const withFaqs = (list: { question: string; answer: string }[]) => list.map((f) => ({ ...f, enabled: true }));
const on = (list: any[]) => list.map((item) => ({ enabled: true, ...item }));

/* ───────────────────────── co-working ───────────────────────── */

const workspace: DemoBusiness = {
  vertical: "co-working",
  companyName: "Nimbus Coworks",
  title: "Work somewhere that works for you.",
  subTitle: "Flexible desks, private cabins and a community of makers, in the middle of the city.",
  cta: "Book a visit",
  heroImages: IMG.cowork.hero.map((id) => U(id, 1600)),
  gallery: [...IMG.cowork.hero, ...IMG.cowork.lounge, ...IMG.cowork.openPlan.slice(0, 2), ...IMG.cowork.team.slice(0, 2), ...IMG.cowork.booth.slice(0, 1)].map((id) => U(id, 1000)),
  about: [
    "Nimbus Coworks began in 2019 with one floor, twenty desks and a simple idea: a workspace should make the day easier, not harder.",
    "Today more than ninety freelancers, startups and remote teams work across three floors, with quiet zones, phone booths, a sunlit lounge and a kitchen that never runs out of coffee.",
  ],
  aboutTitle: "A workspace with a real community",
  aboutPageStory: "We started with a borrowed floor above a bookshop and a shared spreadsheet of who needed a desk. Word spread, the waiting list grew, and today Nimbus fills three floors with people who like being around other people who are building things.",
  aboutPageMission: "To give independent professionals and small teams a place that feels professional, calm and welcoming, without the cost and commitment of running their own office.",
  aboutPageValues: "Quiet where it matters. Social where it counts. Flexible, always. We look after the details so you can look after your work.",
  aboutPageTeamHeading: "The people who keep it running",
  aboutImages: [IMG.cowork.team[0], IMG.cowork.lounge[0], IMG.cowork.reception[0]].map((id) => U(id, 900)),
  team: [
    { title: "Rhea Kapoor", description: "Community manager", image: person("w", 0) },
    { title: "Arjun Nair", description: "Operations lead", image: person("m", 0) },
    { title: "Neha Bhat", description: "Front desk", image: person("w", 1) },
    { title: "Vikram Rao", description: "IT and facilities", image: person("m", 1) },
    { title: "Sara Thomas", description: "Events and partnerships", image: person("w", 2) },
  ],
  founders: [
    { name: "Ananya Iyer", role: "Co-founder and CEO", bio: "Ananya spent ten years building product teams before deciding the best offices she had worked in were the ones with the best people around. Nimbus is her attempt to build that on purpose.", highlights: "10 years in product", image: person("w", 3) },
    { name: "Rohan Malhotra", role: "Co-founder and COO", bio: "Rohan runs everything you never have to think about: the lease, the Wi-Fi, the coffee order and the fire drill. He believes a great workspace is mostly logistics done quietly well.", highlights: "Ex-hospitality operations", image: person("m", 2) },
  ],
  testimonials: testimonials([
    { name: "Aditi Rao", jobPosition: "Freelance designer", testimony: "Best workspace I've used in the city. It's quiet when I need to focus, lively when I want company, and the Wi-Fi has never dropped once in eight months.", rating: 5, gender: "w" },
    { name: "Marcus Lee", jobPosition: "Founder, Kestrel", testimony: "We moved our whole team of six into a private cabin and haven't looked back. The community events alone brought us two clients.", rating: 5, gender: "m" },
    { name: "Priya Menon", jobPosition: "Product manager", testimony: "I work remotely for a company abroad and this is the first place that feels like a proper office without the politics. The team remembers your name.", rating: 5, gender: "w" },
    { name: "Daniel Fernandes", jobPosition: "Software engineer", testimony: "Phone booths, standing desks, decent coffee and a lounge where nobody minds if you take a walk-and-talk call. Exactly what I needed.", rating: 4, gender: "m" },
    { name: "Meera Krishnan", jobPosition: "Consultant", testimony: "Booking a visit took a minute and the tour was genuinely helpful. I signed up for a dedicated desk the same afternoon.", rating: 5, gender: "w" },
  ]),
  faqs: [
    { question: "Can I try the space before I commit?", answer: "Yes. Book a visit and we'll show you around, or take a day pass and work from any open desk for the day." },
    { question: "Is the space open 24 hours?", answer: "Dedicated desks, cabins and suites have 24-hour access with your own key card. Hot desks and day passes are available during opening hours." },
    { question: "Do you offer meeting rooms?", answer: "Yes, we have rooms from four to twelve seats. Members get monthly credits, and anyone can book by the hour." },
    { question: "Can I use your address for my business?", answer: "Yes. Members can use our address for registration and we'll handle post and parcels for you." },
    { question: "What's included?", answer: "Fast fibre Wi-Fi, filtered water, unlimited tea and coffee, printing credits, lounge access and access to every community event." },
  ],
  inclusions: ["fast-internet", "tea-coffee", "meeting-rooms", "air-condition", "receptionist", "community", "secure", "events"],
  partnerHeading: "Let's build something together",
  partnerContent: "We host workshops, founder meet-ups and product launches, and we love working with people who do the same.\nIf you run a community, a training business or a brand that suits a good room and a room full of makers, get in touch.",
  address: "4th Floor, Riverside Plaza, MG Road, Bengaluru 560001",
  openingHours: hours("08:00", "21:00", "sun"),
  contactPersonName: "Rhea Kapoor",
  contactPersonRole: "Community manager",
  page: {
    name: "Co-working",
    slug: "co-working",
    heroHeading: "Our spaces",
    heroSubHeading: "From a hot desk for the day to a private suite for your whole team.",
    homeCardHeading: "Co-working",
    homeCardSubText: "Desks, cabins and suites.",
    heroImage: U(IMG.cowork.openPlan[0], 1600),
    cardImage: U(IMG.cowork.hero[0], 900),
    faqs: [{ question: "Which space is right for me?", answer: "Freelancers usually start with a hot desk, small teams pick a private cabin. Tell us about your team and we'll suggest the best fit." }],
    inclusions: ["fast-internet", "tea-coffee", "air-condition", "secure"],
  },
  extra: {},
  pageItems: on([
    { name: "Hot desk", description: "Pick any open seat in the shared hall, plug in and get going. Ideal for freelancers and anyone who likes a change of scene. Includes fast Wi-Fi, unlimited coffee and lounge access.", cost: "", seats: 40, accessHours: "Mon–Sat, 8 AM–9 PM", features: ["Fast Wi-Fi", "Unlimited coffee", "Lounge access", "Printing"], badge: "Most popular", featured: true, images: IMG.cowork.openPlan.map((id) => ph(id)) },
    { name: "Dedicated desk", description: "Your own desk, your own storage and your things left just as you like them, every day.", cost: "₹9,000", priceUnit: "per month", seats: 25, accessHours: "24×7", features: ["Locker", "24×7 access", "Meeting-room credits"], images: IMG.cowork.desks.map((id) => ph(id)) },
    { name: "Private cabin", description: "A lockable cabin for two to six people, with the whole community just outside the door. Bring your own branding and pin your own whiteboard.", seats: 6, accessHours: "24×7", features: ["Lockable", "Air conditioning", "Whiteboard wall"], badge: "Teams", images: IMG.cowork.cabin.map((id) => ph(id)) },
    { name: "Team suite", description: "A full floor section for growing teams of ten to twenty, branded to you and fitted out your way, with its own meeting room and phone booth.", seats: 20, accessHours: "24×7", features: ["Branded entrance", "Own meeting room", "Dedicated phone booth"], images: IMG.cowork.suite.map((id) => ph(id)) },
    { name: "Day pass", description: "Try the space for a day, no commitment. Book a visit and we'll set you up with a desk, Wi-Fi and a coffee.", cost: "₹600", priceUnit: "per day", seats: 10, accessHours: "Mon–Sat, 9 AM–7 PM", features: ["Fast Wi-Fi", "Coffee and tea"], images: IMG.cowork.day.map((id) => ph(id)) },
  ]),
  settings: {
    logoCarousel: { enabled: true, title: "Trusted by teams at", logos: ["Northwind", "Lumen", "Brightside", "Kestrel", "Oakleaf", "Fathom"].map((name) => ({ url: wordmark(name) })) },
    tourBooking: { enabled: true },
  },
};

/* ───────────────────────── cafe ───────────────────────── */

const menu = (
  [
    ["Coffee", "Flat white", "₹220", "Double ristretto with silky steamed milk.", "latte", "veg", 0, true, "Best seller", ["Oat milk +₹40"]],
    ["Coffee", "Cardamom cold brew", "₹260", "Twelve-hour cold brew with roasted cardamom and a splash of cream.", "iced", "vegan", 0, false, "New", []],
    ["Coffee", "Filter coffee", "₹150", "South-Indian style, strong, sweet and served in a steel tumbler.", "coffee", "veg", 0, false, "", []],
    ["Breakfast", "Avocado sourdough", "₹420", "Smashed avocado, chilli flakes and a poached egg on toasted sourdough.", "toast", "egg", 1, true, "Popular", []],
    ["Breakfast", "Buttermilk pancakes", "₹380", "A stack of three with maple butter and seasonal berries.", "pancakes", "veg", 0, false, "", []],
    ["Bakery", "Butter croissant", "₹180", "Laminated in-house and baked at 6 AM, flaky and golden.", "croissant", "veg", 0, true, "Fresh", []],
    ["Bakery", "Basque cheesecake", "₹340", "Burnt top, creamy centre and a spoon of berry compote.", "cake", "veg", 0, false, "", []],
    ["Mains", "Smoked chicken burger", "₹520", "Brioche bun, chipotle mayo, house pickles and crisp fries.", "burger", "non-veg", 2, true, "Chef's pick", []],
    ["Mains", "Wild mushroom pasta", "₹480", "Cream, garlic, parmesan and thyme with hand-rolled pasta.", "pasta", "veg", 0, false, "", []],
    ["Mains", "Fire-roasted pizza", "₹560", "Margherita, wood-fired with fresh basil and buffalo mozzarella.", "pizza", "veg", 1, false, "", []],
    ["Mains", "Harvest salad", "₹390", "Seasonal greens, roasted pumpkin, feta and toasted seeds.", "salad", "veg", 0, false, "", []],
  ] as [string, string, string, string, string, string, number, boolean, string, string[]][]
).map(([category, name, price, description, k, dietary, spiceLevel, popular, badge, features]) => ({
  category, name, price, description, image: ph(FOOD[k]), dietary, spiceLevel, popular, badge, features, enabled: true, priceUnit: "", featured: false,
}));

const cafe: DemoBusiness = {
  vertical: "cafe",
  companyName: "Brew & Bloom",
  title: "Coffee, baked fresh every morning",
  subTitle: "A neighbourhood café for slow mornings, long lunches and everything in between.",
  cta: "Reserve a table",
  heroImages: IMG.cafe.hero.map((id) => U(id, 1600)),
  gallery: [...IMG.cafe.hero, ...IMG.cafe.interior, ...IMG.cafe.bakery.slice(0, 2), ...IMG.cafe.brunch.slice(0, 2), ...IMG.cafe.coffee.slice(0, 1)].map((id) => U(id, 1000)),
  about: [
    "We started as a tiny counter with one espresso machine and a big idea: make the neighbourhood's favourite corner.",
    "Today we run everything in-house, using ingredients from farms within a couple of hours of here, and we still bake before the sun comes up.",
  ],
  aboutTitle: "A neighbourhood corner, made with care",
  aboutPageStory: "It began in 2016 with a borrowed oven and a loyal handful of regulars. We kept the recipes honest and the door open, and the corner slowly turned into the place people meet, work and celebrate.",
  aboutPageMission: "To make every visit feel like coming home: good food, unhurried time and people who care.",
  aboutPageValues: "Fresh over fast. Local over convenient. People over process. Everything we serve is made here, from the bread to the jam.",
  aboutPageTeamHeading: "The people behind the counter",
  aboutImages: [IMG.cafe.interior[0], IMG.cafe.coffee[1], IMG.cafe.bakery[0]].map((id) => U(id, 900)),
  team: [
    { title: "Rhea", description: "Head barista", image: person("w", 0) },
    { title: "Karan", description: "Pastry chef", image: person("m", 0) },
    { title: "Isha", description: "Front of house", image: person("w", 1) },
    { title: "Dev", description: "Kitchen lead", image: person("m", 1) },
  ],
  founders: [
    { name: "Nikhil Rao", role: "Founder and head chef", bio: "A former restaurant chef who traded late nights for early mornings. Nikhil believes a good café is built on slow mornings, honest ingredients and remembering people's names.", highlights: "12 years in hospitality", image: person("m", 3) },
  ],
  testimonials: testimonials([
    { name: "Aarav Mehta", jobPosition: "Regular", testimony: "The flat white is the best in the city, and the staff remember your name. It has become my second office: quiet mornings, great light and unbeatable pastries.", rating: 5, gender: "m" },
    { name: "Priya Nair", jobPosition: "Freelance designer", testimony: "Booked a table for a birthday and everything was handled perfectly. The team even brought out a candle without being asked.", rating: 5, gender: "w" },
    { name: "Sam Carter", jobPosition: "Visitor", testimony: "Lovely space, slightly busy on weekends, but the pancakes made up for it. We'll be back.", rating: 4, gender: "m" },
    { name: "Meera Rao", jobPosition: "Neighbour", testimony: "Great value, warm service and the cardamom bun is unreal. I come in three times a week and I'm not sorry.", rating: 5, gender: "w" },
    { name: "Jay Kulkarni", jobPosition: "Photographer", testimony: "The light in here at 10 AM is honestly the best in the neighbourhood. Good coffee is a bonus.", rating: 5, gender: "m" },
  ]),
  faqs: [
    { question: "Do you take walk-ins?", answer: "Always, but reservations get priority on weekends." },
    { question: "Is there Wi-Fi?", answer: "Yes, free and fast. Laptops are welcome until 5 PM." },
    { question: "Are there vegan options?", answer: "Yes. Look for the green mark on the menu, and ask us about oat milk for any coffee." },
    { question: "Can I book the café for an event?", answer: "We host birthdays, small launches and supper clubs. Send us a note and we'll put together a menu." },
  ],
  inclusions: ["fast-internet", "tea-coffee", "cafe-dining", "community", "air-condition", "events"],
  partnerHeading: "Let us collaborate",
  partnerContent: "We host pop-ups, supper clubs and brand collaborations.\nIf you have an idea that suits a good room and a great coffee, we would love to hear it.",
  address: "12 Church Street, Indiranagar, Bengaluru 560001",
  openingHours: hours("08:00", "22:00", "mon"),
  contactPersonName: "Isha Kapoor",
  contactPersonRole: "Front of house",
  page: {
    name: "Cafe",
    slug: "cafe",
    heroHeading: "Our menu",
    heroSubHeading: "Everything is made in-house, every single day.",
    homeCardHeading: "The Café",
    homeCardSubText: "Coffee, breakfast, bakery and mains.",
    heroImage: U(IMG.cafe.interior[0], 1600),
    cardImage: U(FOOD.latte, 900),
    faqs: [{ question: "Are there vegan options?", answer: "Yes. Look for the green mark on the menu." }],
    inclusions: [],
  },
  extra: { menuItems: menu },
  settings: {
    reservation: { enabled: true, maxGuests: 8, slotIntervalMinutes: 30, seatingOptions: ["Indoor", "Outdoor", "Bar"], confirmationNote: "We'll call to confirm within the hour." },
  },
};

/* ───────────────────────── hostel ───────────────────────── */

const hostel: DemoBusiness = {
  vertical: "hostel",
  companyName: "Wanderer's Nest",
  title: "Sleep well. Meet everyone.",
  subTitle: "Clean beds, big common rooms and a rooftop that never quite closes.",
  cta: "Book your stay",
  heroImages: IMG.hostel.hero.map((id) => U(id, 1600)),
  gallery: [...IMG.hostel.hero, ...IMG.hostel.dorm.slice(0, 2), ...IMG.hostel.common.slice(0, 2), ...IMG.hostel.roof.slice(0, 2), ...IMG.hostel.building.slice(0, 1)].map((id) => U(id, 1000)),
  about: [
    "Wanderer's Nest is a hostel built by travellers who got tired of hostels that felt like waiting rooms.",
    "We keep the beds comfortable, the common room loud in the right way and the rooftop open late, so you meet people without trying.",
  ],
  aboutTitle: "A home base for people on the move",
  aboutPageStory: "We opened in 2018 in a converted townhouse with eight beds and a kettle. Travellers kept extending their stays, and the townhouse grew into a proper hostel with dorms, private rooms and a rooftop where the best stories get told.",
  aboutPageMission: "To make travelling feel less lonely and less expensive: a clean bed, a friendly crowd and honest local advice.",
  aboutPageValues: "Clean first. Friendly always. Local advice, not brochures. Everyone is a guest and everyone is welcome at the rooftop table.",
  aboutPageTeamHeading: "The crew who look after you",
  aboutImages: [IMG.hostel.common[0], IMG.hostel.roof[0], IMG.hostel.travel[0]].map((id) => U(id, 900)),
  team: [
    { title: "Kabir", description: "Reception and tours", image: person("m", 0) },
    { title: "Anjali", description: "Guest experience", image: person("w", 0) },
    { title: "Toby", description: "Bar and rooftop", image: person("m", 1) },
    { title: "Lakshmi", description: "Housekeeping lead", image: person("w", 1) },
    { title: "Sameer", description: "Night manager", image: person("m", 2) },
  ],
  founders: [
    { name: "Mira Desai", role: "Founder", bio: "Mira backpacked through thirty countries and slept in more hostels than she can count. She built Wanderer's Nest to be the one she always wished she'd found.", highlights: "30 countries, 200+ hostels", image: person("w", 2) },
    { name: "Jonas Weber", role: "Co-founder", bio: "Jonas moved from Berlin for a two-week trip and never left. He looks after the rooftop, the events calendar and the world's best pancake breakfast.", highlights: "Berlin to Bengaluru", image: person("m", 3) },
  ],
  testimonials: testimonials([
    { name: "Elena Rossi", jobPosition: "Solo traveller", testimony: "I came for two nights and stayed for six. The rooftop crowd is the friendliest I've met anywhere, and the dorm was spotless.", rating: 5, gender: "w" },
    { name: "Tom Becker", jobPosition: "Backpacker", testimony: "Best value in the city. Big lockers, proper reading lights and a kitchen where everybody cooks together on Sunday.", rating: 5, gender: "m" },
    { name: "Ishita Sen", jobPosition: "Weekend traveller", testimony: "The female dorm was calm and safe, and the staff sorted a last-minute train ticket for me. Would stay again.", rating: 5, gender: "w" },
    { name: "Liam O'Brien", jobPosition: "Digital nomad", testimony: "Fast Wi-Fi, a quiet corner in the common room and a rooftop for sunset calls. It ticks every box.", rating: 4, gender: "m" },
    { name: "Aarti Jain", jobPosition: "Group traveller", testimony: "We booked a private room for four friends and the team went out of their way to make it easy. Lovely place.", rating: 5, gender: "w" },
  ]),
  faqs: [
    { question: "What time is check-in?", answer: "Check-in is from 2 PM and check-out is by 11 AM. Early bag drop is always free." },
    { question: "Are the dorms mixed?", answer: "We have mixed dorms and a female-only dorm. You'll see the policy on every room." },
    { question: "Is breakfast included?", answer: "Private rooms include breakfast. Dorm guests can add it for a small charge." },
    { question: "Can I cancel my booking?", answer: "Yes, free cancellation up to 48 hours before check-in." },
  ],
  inclusions: ["fast-internet", "housekeeping", "laundry", "secure", "community", "tea-coffee", "air-condition", "events"],
  partnerHeading: "Work with the Nest",
  partnerContent: "We partner with local guides, tour operators and travel brands.\nIf you offer something travellers would love, tell us about it.",
  address: "27 Lavelle Road, Bengaluru 560001",
  openingHours: [],
  contactPersonName: "Kabir Shah",
  contactPersonRole: "Reception and tours",
  page: {
    name: "Hostel",
    slug: "hostel",
    heroHeading: "Rooms and dorms",
    heroSubHeading: "Pick a bed or a private room, book in a minute and we'll confirm availability.",
    homeCardHeading: "Stay with us",
    homeCardSubText: "Dorms from ₹599 a night.",
    heroImage: U(IMG.hostel.dorm[0], 1600),
    cardImage: U(IMG.hostel.dorm[1], 900),
    faqs: [],
    inclusions: ["fast-internet", "secure", "laundry", "housekeeping"],
  },
  extra: {
    dorms: on([
      { title: "6-bed mixed dorm", price: "₹599", capacity: 6, description: "Bunk beds with privacy curtains, reading lights, power sockets and a large locker for every guest.", images: IMG.hostel.dorm.map((id) => ph(id)), roomKind: "dorm", bedType: "bunk", genderPolicy: "mixed", bathroom: "shared", badge: "Best value", priceUnit: "per night", features: ["Locker", "Reading light", "AC", "Power socket"] },
      { title: "4-bed female dorm", price: "₹699", capacity: 4, description: "A calm, women-only space with ensuite bathroom, extra-wide bunks and a lockable vanity shelf.", images: [ph(IMG.hostel.dorm[1]), ph(IMG.hostel.dorm[2])], roomKind: "dorm", bedType: "bunk", genderPolicy: "female", bathroom: "ensuite", priceUnit: "per night", features: ["Ensuite", "Female only", "AC"] },
      { title: "Private double", price: "₹1,899", capacity: 2, description: "A double bed, a desk and a small balcony, with breakfast included. Perfect for couples and anyone who wants some quiet.", images: IMG.hostel.private.map((id) => ph(id)), roomKind: "private", bedType: "single", genderPolicy: "mixed", bathroom: "ensuite", badge: "Popular", priceUnit: "per night", features: ["Balcony", "Desk", "Breakfast included"] },
      { title: "Private twin", price: "₹1,699", capacity: 2, description: "Two single beds for friends travelling together, with a shared desk and a view of the rooftop.", images: IMG.hostel.twin.map((id) => ph(id)), roomKind: "private", bedType: "single", genderPolicy: "mixed", bathroom: "ensuite", priceUnit: "per night", features: ["Ensuite", "Desk", "AC"] },
    ]),
  },
  settings: {
    stayPolicy: { checkInTime: "14:00", checkOutTime: "11:00", minStayNights: 1, houseRules: ["No smoking indoors", "Quiet hours after 11 PM", "Valid photo ID at check-in", "No outside guests in dorms"], cancellationNote: "Free cancellation up to 48 hours before check-in." },
  },
};

/* ───────────────────────── co-living ───────────────────────── */

const coLiving: DemoBusiness = {
  vertical: "co-living",
  companyName: "Common Ground",
  title: "Live well, together.",
  subTitle: "Furnished rooms, a real community and everything included, in the heart of the city.",
  cta: "Schedule a visit",
  heroImages: IMG.coliving.hero.map((id) => U(id, 1600)),
  gallery: [...IMG.coliving.hero, ...IMG.coliving.single.slice(0, 2), ...IMG.coliving.living, ...IMG.coliving.kitchen, ...IMG.coliving.community.slice(0, 2)].map((id) => U(id, 1000)),
  about: [
    "Common Ground is a co-living home for people who want more than a room: a place to cook together, work quietly and end the day with good company.",
    "Every room is fully furnished, every bill is included and there is always someone to talk to in the kitchen.",
  ],
  aboutTitle: "A neighbourhood you move into",
  aboutPageStory: "We started with a single rented flat and five housemates who couldn't find anywhere that felt like home. Six years later we run four buildings, and the dinners in the shared kitchen are still the best part of every week.",
  aboutPageMission: "To make moving to a new city easy and human: a good room, fair terms and neighbours who become friends.",
  aboutPageValues: "Privacy in your room, community everywhere else. Fair, simple terms. Everyone cooks and everyone cleans.",
  aboutPageTeamHeading: "The people who look after the house",
  aboutImages: [IMG.coliving.community[0], IMG.coliving.kitchen[0], IMG.coliving.living[0]].map((id) => U(id, 900)),
  team: [
    { title: "Shreya", description: "Community host", image: person("w", 0) },
    { title: "Ravi", description: "House manager", image: person("m", 0) },
    { title: "Pooja", description: "Housekeeping", image: person("w", 1) },
    { title: "Amit", description: "Maintenance", image: person("m", 1) },
  ],
  founders: [
    { name: "Divya Menon", role: "Co-founder", bio: "Divya moved cities four times in six years and lived in more shared flats than she'd like to admit. She built Common Ground around the things she wished every landlord understood.", highlights: "Six years of co-living", image: person("w", 3) },
    { name: "Karthik Reddy", role: "Co-founder", bio: "Karthik looks after the buildings and the numbers. He is proudest of the fact that residents renew, on average, three times.", highlights: "Ex-real estate", image: person("m", 4) },
  ],
  testimonials: testimonials([
    { name: "Sneha Pillai", jobPosition: "Resident, 2 years", testimony: "I moved in knowing nobody and within a month I had a group for weekend hikes. The room is comfortable and the house team fixes things the same day.", rating: 5, gender: "w" },
    { name: "Rahul Verma", jobPosition: "Software engineer", testimony: "Everything is included, from Wi-Fi to laundry, and there's a quiet study nook when I need to focus. Best rent-to-comfort ratio I've found.", rating: 5, gender: "m" },
    { name: "Nisha Kapoor", jobPosition: "Designer", testimony: "The community dinners are the highlight. You can join or not, and nobody minds either way.", rating: 5, gender: "w" },
    { name: "Arun Nambiar", jobPosition: "Consultant", testimony: "Flexible terms mattered for my project, and the team was upfront about everything. No surprises at all.", rating: 4, gender: "m" },
    { name: "Tara Joseph", jobPosition: "Photographer", testimony: "Light-filled room, a proper kitchen and neighbours who feel like friends. I didn't expect to renew, and I have twice.", rating: 5, gender: "w" },
  ]),
  faqs: [
    { question: "What's included in the rent?", answer: "Furnished room, Wi-Fi, electricity, water, housekeeping and laundry. Meals are optional." },
    { question: "How long is the minimum stay?", answer: "One month for shared rooms and three months for single rooms." },
    { question: "Can I visit before I decide?", answer: "Yes. Schedule a visit and we'll show you the rooms and the shared spaces." },
    { question: "Is there a deposit?", answer: "One month of rent, fully refundable when you move out." },
  ],
  inclusions: ["furnished-office", "fast-internet", "housekeeping", "laundry", "air-condition", "secure", "community", "cafe-dining"],
  partnerHeading: "Partner with Common Ground",
  partnerContent: "We work with employers, relocation services and universities to house people in a new city.\nTell us about your team and we'll put together a plan.",
  address: "18 Koramangala 5th Block, Bengaluru 560095",
  openingHours: hours("10:00", "19:00"),
  contactPersonName: "Shreya Iyer",
  contactPersonRole: "Community host",
  page: {
    name: "Co-living",
    slug: "co-living",
    heroHeading: "Our rooms",
    heroSubHeading: "Move in with just a suitcase. Everything else is already here.",
    homeCardHeading: "Rooms",
    homeCardSubText: "Single, shared and studio rooms.",
    heroImage: U(IMG.coliving.single[0], 1600),
    cardImage: U(IMG.coliving.single[1], 900),
    faqs: [],
    inclusions: ["furnished-office", "fast-internet", "housekeeping", "laundry"],
  },
  extra: {
    coLivingRooms: on([
      { title: "Sunny single", price: "₹18,000", priceUnit: "per month", description: "Your own room with an attached bath, a proper desk and a window that catches the morning sun. Best for people who like their own space and a lively common area to come back to.", images: IMG.coliving.single.map((id) => ph(id)), occupancy: "single", bathroom: "ensuite", ac: true, furnished: true, minStayMonths: 3, deposit: "1 month", availableFrom: "2026-11-01", badge: "Available soon", features: ["Wi-Fi", "Housekeeping", "Study desk", "Wardrobe"], featured: true },
      { title: "Twin sharing", price: "₹11,000", priceUnit: "per month", description: "Two beds, two desks and one great view. Share with a friend or get matched with a housemate.", images: IMG.coliving.twin.map((id) => ph(id)), occupancy: "double", bathroom: "shared", ac: true, furnished: true, minStayMonths: 1, availableFrom: "2026-10-15", features: ["Wi-Fi", "Laundry", "Power backup"], popular: true },
      { title: "Triple sharing", price: "₹8,500", priceUnit: "per month", description: "The most affordable way to live here, with three beds and lots of shared laughs.", images: IMG.coliving.triple.map((id) => ph(id)), occupancy: "triple", bathroom: "shared", ac: false, furnished: true, minStayMonths: 1, features: ["Wi-Fi", "Laundry"] },
      { title: "Garden studio", price: "₹24,000", priceUnit: "per month", description: "A private studio opening onto the garden, with its own kitchenette and enough room to work from home.", images: IMG.coliving.studio.map((id) => ph(id)), occupancy: "single", bathroom: "ensuite", ac: true, furnished: true, minStayMonths: 6, deposit: "2 months", availableFrom: "2026-12-01", features: ["Kitchenette", "Garden access", "Wi-Fi"] },
    ]),
  },
  settings: {
    stayPolicy: { checkInTime: "12:00", checkOutTime: "10:00", houseRules: ["Guests until 10 PM", "Shared spaces stay tidy", "Quiet hours after 11 PM", "No smoking indoors"], cancellationNote: "One month notice before moving out." },
    tourBooking: { enabled: true },
  },
};

/* ───────────────────────── workation ───────────────────────── */

const workation: DemoBusiness = {
  vertical: "workation",
  companyName: "Coastline Workations",
  title: "Work from somewhere better.",
  subTitle: "Stay, work and unwind by the sea, with everything sorted.",
  cta: "Plan your workation",
  heroImages: IMG.workation.hero.map((id) => U(id, 1600)),
  gallery: [...IMG.workation.hero, ...IMG.workation.desk, ...IMG.workation.stay, ...IMG.workation.beach].map((id) => U(id, 1000)),
  about: [
    "Coastline Workations is a small seaside retreat for people who can work from anywhere and would rather do it by the water.",
    "You get a private room, a proper desk, fast internet and the kind of evenings that make Mondays easier.",
  ],
  aboutTitle: "A desk with a sea view",
  aboutPageStory: "We turned a family beach house into a workation home after friends kept asking to borrow it for 'a week of focus'. Now we host remote teams and solo workers all year, with a real desk in every room.",
  aboutPageMission: "To make remote work feel like a holiday you can afford to repeat: reliable internet, quiet mornings and the sea just outside.",
  aboutPageValues: "Reliable Wi-Fi before anything else. Slow evenings. Simple, all-inclusive pricing.",
  aboutPageTeamHeading: "Your hosts by the sea",
  aboutImages: [IMG.workation.hero[0], IMG.workation.stay[1], IMG.workation.beach[0]].map((id) => U(id, 900)),
  team: [
    { title: "Maya", description: "Head host", image: person("w", 0) },
    { title: "Leo", description: "Chef", image: person("m", 0) },
    { title: "Anita", description: "Guest care", image: person("w", 1) },
  ],
  founders: [{ name: "Samir Kulkarni", role: "Founder", bio: "Samir spent a decade in consulting before realising his best work happened on a beach in Goa with a laptop and a filter coffee. Coastline is his way of making that possible for everyone.", highlights: "Remote work advocate", image: person("m", 2) }],
  testimonials: testimonials([
    { name: "Nadia Rahman", jobPosition: "Product designer", testimony: "A week here got me through a deadline I'd been dreading. The desk was great, the Wi-Fi never dropped and lunch was always ready.", rating: 5, gender: "w" },
    { name: "Chris Andersen", jobPosition: "Engineering manager", testimony: "We brought our team of five for an offsite and it was the most productive week of the year.", rating: 5, gender: "m" },
    { name: "Ritu Agarwal", jobPosition: "Writer", testimony: "Quiet mornings, long walks and a room with a real desk. I finished my draft here.", rating: 5, gender: "w" },
    { name: "Pablo Diaz", jobPosition: "Freelancer", testimony: "The monthly package was excellent value and the airport pickup was a lovely touch.", rating: 4, gender: "m" },
  ]),
  faqs: [
    { question: "How fast is the internet?", answer: "We run a dedicated fibre line with a mobile backup, so calls stay stable." },
    { question: "Can my team come together?", answer: "Yes. We host groups of up to twelve and can set up a shared work room." },
    { question: "What's included in a package?", answer: "Your room, a desk, breakfast, Wi-Fi and laundry. Some packages add airport pickup and excursions." },
  ],
  inclusions: ["fast-internet", "cafe-dining", "laundry", "pickup-drop", "air-condition", "housekeeping", "secure", "tea-coffee"],
  partnerHeading: "Host your team offsite",
  partnerContent: "We host company offsites, writing retreats and remote team weeks.\nTell us how many people and for how long, and we'll plan the rest.",
  address: "Beach Road, Palolem, Goa 403702",
  openingHours: [],
  contactPersonName: "Maya Fernandes",
  contactPersonRole: "Head host",
  page: {
    name: "Workations",
    slug: "workations",
    heroHeading: "Packages",
    heroSubHeading: "Stay a week or a month, with your room, desk and breakfast sorted.",
    homeCardHeading: "Workation packages",
    homeCardSubText: "Room, desk and breakfast included.",
    heroImage: U(IMG.workation.hero[1], 1600),
    cardImage: U(IMG.workation.desk[0], 900),
    faqs: [],
    inclusions: ["fast-internet", "cafe-dining", "laundry", "pickup-drop"],
  },
  extra: {
    packages: on([
      { title: "One-week reset", price: "₹24,000", duration: "7 nights", description: "A private room, a proper desk and daily breakfast. Ideal for a focused week away from the usual.", images: IMG.workation.stay.map((id) => ph(id)), perPerson: true, inclusions: ["Breakfast", "Wi-Fi", "Airport pickup"], badge: "Popular", features: ["Sea view", "Desk"] },
      { title: "Month by the sea", price: "₹78,000", duration: "30 nights", description: "Everything you need to settle in for a month, with laundry, breakfast and a weekly excursion.", images: IMG.workation.desk.map((id) => ph(id)), perPerson: true, inclusions: ["Breakfast", "Laundry", "Weekly excursion"], features: ["Long-stay rate"] },
      { title: "Team week", price: "₹1,10,000", duration: "7 nights, up to 6", description: "A private work room, rooms for six and a chef for dinners. Built for team offsites.", images: [ph(IMG.workation.hero[2]), ph(IMG.workation.beach[1])], perPerson: false, inclusions: ["Breakfast", "Work room", "Dinners"], features: ["Team rate"] },
    ]),
  },
  settings: {},
};

/* ───────────────────────── meeting rooms ───────────────────────── */

const meeting: DemoBusiness = {
  vertical: "meeting-rooms",
  companyName: "Boardroom & Co",
  title: "Rooms made for good meetings.",
  subTitle: "Book a room by the hour, with everything already set up.",
  cta: "Book a room",
  heroImages: IMG.meeting.hero.map((id) => U(id, 1600)),
  gallery: [...IMG.meeting.hero, ...IMG.meeting.huddle.slice(0, 2), ...IMG.meeting.workshop.slice(0, 2), ...IMG.meeting.training.slice(0, 2), ...IMG.meeting.extra].map((id) => U(id, 1000)),
  about: [
    "Boardroom & Co rents meeting rooms by the hour to teams who don't have, or don't want, their own.",
    "Every room comes with a screen, a whiteboard, fast Wi-Fi and a team member on call, so the meeting starts on time.",
  ],
  aboutTitle: "Rooms that get out of the way",
  aboutPageStory: "We started as a single boardroom above a bank. Clients kept asking for the same thing: a room that just works. Now we run eight rooms across two floors, from huddle spaces to training halls.",
  aboutPageMission: "To make holding a good meeting the easiest part of the day.",
  aboutPageValues: "Ready on arrival. Clear pricing. A real person always on call.",
  aboutPageTeamHeading: "The team on call",
  aboutImages: [IMG.meeting.board[0], IMG.meeting.huddle[0], IMG.meeting.training[0]].map((id) => U(id, 900)),
  team: [
    { title: "Aisha", description: "Bookings", image: person("w", 0) },
    { title: "Ravi", description: "Tech support", image: person("m", 0) },
    { title: "Kiran", description: "Hospitality", image: person("m", 1) },
    { title: "Sonal", description: "Front desk", image: person("w", 1) },
  ],
  founders: [{ name: "Vijay Shetty", role: "Founder", bio: "Vijay ran a consulting firm for years and spent far too long hunting for a decent room. He built the room he wanted to book.", highlights: "8 rooms, 2 floors", image: person("m", 3) }],
  testimonials: testimonials([
    { name: "Farah Khan", jobPosition: "Operations lead", testimony: "We hold every client workshop here. The room is ready when we arrive and the screen just works.", rating: 5, gender: "w" },
    { name: "George Mathew", jobPosition: "Partner, law firm", testimony: "Professional, quiet and well located. Catering was on time and the staff were excellent.", rating: 5, gender: "m" },
    { name: "Ananya Das", jobPosition: "Founder", testimony: "The huddle room is perfect for investor calls. Booking takes two minutes.", rating: 5, gender: "w" },
    { name: "Kunal Shah", jobPosition: "Trainer", testimony: "The training hall fits thirty comfortably, and the AV team helped set everything up.", rating: 4, gender: "m" },
  ]),
  faqs: [
    { question: "What's the minimum booking?", answer: "One hour. Extensions are available if the room is free." },
    { question: "Is catering available?", answer: "Yes, tea, coffee and snacks can be added, and lunch on request." },
    { question: "Can I book recurring meetings?", answer: "Yes. Tell us the schedule and we'll hold the room for you." },
  ],
  inclusions: ["fast-internet", "meeting-rooms", "training-rooms", "it-support", "tea-coffee", "air-condition", "receptionist", "assist"],
  partnerHeading: "Corporate accounts",
  partnerContent: "We offer monthly plans and priority booking for teams that meet often.\nGet in touch and we'll set up a corporate account.",
  address: "9th Floor, Central Tower, Residency Road, Bengaluru 560025",
  openingHours: hours("08:00", "20:00", "sun"),
  contactPersonName: "Aisha Menon",
  contactPersonRole: "Bookings",
  page: {
    name: "Meeting Rooms",
    slug: "meeting-rooms",
    heroHeading: "Our rooms",
    heroSubHeading: "From huddles to boardrooms and training halls, bookable by the hour.",
    homeCardHeading: "Meeting rooms",
    homeCardSubText: "Bookable by the hour.",
    heroImage: U(IMG.meeting.board[0], 1600),
    cardImage: U(IMG.meeting.hero[0], 900),
    faqs: [],
    inclusions: ["fast-internet", "it-support", "tea-coffee"],
  },
  extra: {
    meetingRooms: on([
      { title: "Huddle room", price: "₹600", capacity: 4, description: "A compact room with a screen, whiteboard and fast Wi-Fi. Ideal for quick syncs and interviews.", images: IMG.meeting.huddle.map((id) => ph(id)), priceUnit: "per hour", features: ["Screen", "Whiteboard", "Wi-Fi"] },
      { title: "Workshop room", price: "₹1,100", capacity: 8, description: "A flexible room with movable tables and a wall of whiteboards for workshops and design sprints.", images: IMG.meeting.workshop.map((id) => ph(id)), priceUnit: "per hour", features: ["Whiteboard wall", "Flexible seating"] },
      { title: "Boardroom", price: "₹1,800", capacity: 12, description: "A formal room with video conferencing and catering on request. Made for client meetings and board updates.", images: IMG.meeting.board.map((id) => ph(id)), priceUnit: "per hour", badge: "Popular", features: ["Video conferencing", "Catering on request"] },
      { title: "Training hall", price: "₹3,200", capacity: 30, description: "A large hall with classroom seating, a projector and a sound system.", images: IMG.meeting.training.map((id) => ph(id)), priceUnit: "per hour", features: ["Projector", "Sound system"] },
    ]),
  },
  settings: {},
};

export const DEMO_BUSINESSES: Record<ServiceKind, DemoBusiness> = {
  workspace,
  menu: cafe,
  hostel,
  coLiving,
  workation,
  meeting,
};

export { withFaqs };
