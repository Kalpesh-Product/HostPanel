// Optional, vertical-specific fields on website-builder offerings (menu items,
// dorms, co-living rooms, packages, meeting rooms). One definition drives both the
// builder form (ItemExtraFields.tsx) and the preview-draft mapper, so adding a field
// means: schema (server) + sanitizer (server/utils/websiteOfferingFields.ts) + here.

export type OfferingKind =
  | "menu"
  | "dorm"
  | "coLiving"
  | "package"
  | "meeting"
  | "room"
  | "subProduct";

export type OfferingFieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean" | "list" | "date";
  options?: { value: string; label: string }[];
  placeholder?: string;
  /** For "list" fields: one-tap suggestions shown as chips (owners can still add their own). */
  suggestions?: string[];
};

// Description length limits (characters). The templates are laid out for these.
export const DESCRIPTION_LIMITS = { menu: 250, offering: 800 } as const;

// Suggested highlights per kind of offering. Purely a convenience — any text can be added.
export const HIGHLIGHT_SUGGESTIONS: Record<string, string[]> = {
  menu: ["Gluten-free", "Contains nuts", "Sugar-free option", "Oat milk available", "Made to order", "Serves 2"],
  dorm: ["Locker", "AC", "Reading light", "Power socket at every bed", "Privacy curtains", "Linen included", "Towel included", "Balcony", "Desk", "Wi-Fi", "Breakfast included"],
  coLiving: ["Wi-Fi", "Housekeeping", "Laundry", "Power backup", "Fridge", "Wardrobe", "Study desk", "Meals included", "Geyser", "TV"],
  package: ["Wi-Fi", "Breakfast", "Airport pickup", "Laundry", "Desk", "Gym access", "Excursions"],
  meeting: ["Projector", "Whiteboard", "Video conferencing", "Wi-Fi", "Tea & coffee", "Printer"],
  room: ["Wi-Fi", "Locker", "Coffee", "Air conditioning"],
  subProduct: ["Wi-Fi", "Locker", "Coffee", "Air conditioning", "Power backup", "Printing", "Lounge access", "Meeting-room credits", "Mail handling", "24×7 access"],
};

export const DIETARY_OPTIONS = [
  { value: "veg", label: "Vegetarian" },
  { value: "non-veg", label: "Non-vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "egg", label: "Contains egg" },
];

export const WEEKDAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const commonFields = (kind: OfferingKind): OfferingFieldDef[] => [
  { key: "badge", label: "Badge", type: "text", placeholder: "e.g. Best seller, New" },
  { key: "priceUnit", label: "Price unit", type: "text", placeholder: "e.g. per night, per month" },
  { key: "features", label: "Highlights", type: "list", placeholder: "Add your own", suggestions: HIGHLIGHT_SUGGESTIONS[kind] },
  { key: "featured", label: "Feature on home page", type: "boolean" },
];

const BATHROOM_OPTIONS = [
  { value: "ensuite", label: "Attached bathroom" },
  { value: "shared", label: "Shared bathroom" },
];

const KIND_FIELDS: Record<OfferingKind, OfferingFieldDef[]> = {
  menu: [
    { key: "dietary", label: "Dietary type", type: "select", options: DIETARY_OPTIONS },
    {
      key: "spiceLevel",
      label: "Spice level",
      type: "select",
      options: [
        { value: "0", label: "Not spicy" },
        { value: "1", label: "Mild" },
        { value: "2", label: "Medium" },
        { value: "3", label: "Hot" },
      ],
    },
    { key: "popular", label: "Mark as popular", type: "boolean" },
  ],
  dorm: [
    {
      key: "roomKind",
      label: "Room type",
      type: "select",
      options: [
        { value: "dorm", label: "Shared dorm" },
        { value: "private", label: "Private room" },
      ],
    },
    {
      key: "bedType",
      label: "Bed type",
      type: "select",
      options: [
        { value: "bunk", label: "Bunk bed" },
        { value: "single", label: "Single bed" },
      ],
    },
    {
      key: "genderPolicy",
      label: "Who can book",
      type: "select",
      options: [
        { value: "mixed", label: "Mixed" },
        { value: "female", label: "Female only" },
        { value: "male", label: "Male only" },
      ],
    },
    { key: "bathroom", label: "Bathroom", type: "select", options: BATHROOM_OPTIONS },
  ],
  coLiving: [
    {
      key: "occupancy",
      label: "Occupancy",
      type: "select",
      options: [
        { value: "single", label: "Single" },
        { value: "double", label: "Double sharing" },
        { value: "triple", label: "Triple sharing" },
      ],
    },
    { key: "bathroom", label: "Bathroom", type: "select", options: BATHROOM_OPTIONS },
    { key: "deposit", label: "Security deposit", type: "text", placeholder: "e.g. 1 month rent" },
    { key: "minStayMonths", label: "Minimum stay (months)", type: "number" },
    { key: "availableFrom", label: "Available from", type: "date" },
    { key: "furnished", label: "Furnished", type: "boolean" },
    { key: "ac", label: "Air conditioned", type: "boolean" },
  ],
  package: [
    { key: "inclusions", label: "What's included", type: "list", placeholder: "Add your own", suggestions: HIGHLIGHT_SUGGESTIONS.package },
    { key: "perPerson", label: "Price is per person", type: "boolean" },
  ],
  meeting: [{ key: "capacity", label: "Capacity (people)", type: "number" }],
  room: [],
  // Co-working spaces (desks, cabins, offices...).
  subProduct: [
    { key: "seats", label: "Seats (team size)", type: "number" },
    { key: "accessHours", label: "Access hours", type: "text", placeholder: "e.g. 24×7, Mon–Sat 9 AM–9 PM" },
  ],
};

export const getOfferingFields = (kind: OfferingKind): OfferingFieldDef[] => [
  ...KIND_FIELDS[kind],
  ...commonFields(kind),
];

const asString = (value: unknown) => String(value ?? "").trim();
const asBool = (value: unknown) => value === true || value === "true";
const asList = (value: unknown): string[] =>
  (Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\n,]/) : [])
    .map(asString)
    .filter(Boolean);
const asNumber = (value: unknown): number | undefined => {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Normalises the optional fields of one item for the preview draft / template
 * data. Mirrors server/utils/websiteOfferingFields.ts. Empty values are kept as
 * empty strings / [] / false so templates can rely on the shape.
 */
export const pickItemExtras = (kind: OfferingKind, item: any) => {
  const extras: Record<string, unknown> = {
    badge: asString(item?.badge),
    priceUnit: asString(item?.priceUnit),
    features: asList(item?.features),
    featured: asBool(item?.featured),
  };
  for (const field of KIND_FIELDS[kind]) {
    const raw = item?.[field.key];
    if (field.type === "boolean") extras[field.key] = asBool(raw);
    else if (field.type === "list") extras[field.key] = asList(raw);
    else if (field.type === "number") extras[field.key] = asNumber(raw);
    else if (field.key === "spiceLevel") extras[field.key] = asNumber(raw) ?? 0;
    else extras[field.key] = asString(raw);
  }
  return extras;
};

// ── Business-level settings ────────────────────────────────────────────────

export type OpeningHoursRow = { day: string; open: string; close: string; closed: boolean };

export const defaultOpeningHours = (): OpeningHoursRow[] =>
  WEEKDAYS.map(({ key }) => ({ day: key, open: "09:00", close: "21:00", closed: false }));

export const defaultReservation = () => ({
  enabled: true,
  maxGuests: 10,
  slotIntervalMinutes: 30,
  seatingOptions: [] as string[],
  confirmationNote: "",
});

export const defaultStayPolicy = () => ({
  checkInTime: "",
  checkOutTime: "",
  minStayNights: undefined as number | undefined,
  houseRules: [] as string[],
  cancellationNote: "",
});

export const normalizeOpeningHours = (value: any): OpeningHoursRow[] => {
  const rows = Array.isArray(value) ? value : [];
  return rows
    .map((row: any) => ({
      day: asString(row?.day).toLowerCase(),
      open: asString(row?.open),
      close: asString(row?.close),
      closed: asBool(row?.closed),
    }))
    .filter((row) => WEEKDAYS.some((d) => d.key === row.day));
};

export const normalizeReservation = (value: any) => ({
  enabled: value?.enabled === undefined ? true : asBool(value.enabled),
  maxGuests: Math.max(1, asNumber(value?.maxGuests) ?? 10),
  slotIntervalMinutes: Math.max(5, asNumber(value?.slotIntervalMinutes) ?? 30),
  seatingOptions: asList(value?.seatingOptions),
  confirmationNote: asString(value?.confirmationNote),
});

export const normalizeStayPolicy = (value: any) => ({
  checkInTime: asString(value?.checkInTime),
  checkOutTime: asString(value?.checkOutTime),
  minStayNights: asNumber(value?.minStayNights),
  houseRules: asList(value?.houseRules),
  cancellationNote: asString(value?.cancellationNote),
});

export const normalizeTourBooking = (value: any) => ({
  enabled: value?.enabled === undefined ? true : asBool(value.enabled),
});
