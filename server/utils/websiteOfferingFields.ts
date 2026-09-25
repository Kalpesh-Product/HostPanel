// @ts-nocheck
// Sanitizers for the optional, vertical-specific website-builder fields
// (menu dietary/spice, dorm bed type, co-living specs, opening hours, ...).
//
// The draft-save path rebuilds every offering item field by field, so any field
// that is not copied here is silently dropped on autosave. Keeping the list in
// one place means adding a field touches the schema + this file only.

const str = (value) => String(value ?? "").trim();
const bool = (value) => value === true || value === "true";
const numOrUndefined = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};
const oneOf = (value, allowed) => {
  const v = str(value).toLowerCase();
  return allowed.includes(v) ? v : "";
};
const strList = (value) => {
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/)
      : [];
  return list.map(str).filter(Boolean);
};

// Fields every offering type carries.
const commonExtras = (item) => ({
  badge: str(item?.badge),
  priceUnit: str(item?.priceUnit),
  features: strList(item?.features),
  featured: bool(item?.featured),
});

const KIND_EXTRAS = {
  menu: (item) => ({
    dietary: oneOf(item?.dietary, ["veg", "non-veg", "vegan", "egg"]),
    spiceLevel: Math.min(3, Math.max(0, numOrUndefined(item?.spiceLevel) ?? 0)),
    popular: bool(item?.popular),
  }),
  dorm: (item) => ({
    bedType: oneOf(item?.bedType, ["bunk", "single"]),
    genderPolicy: oneOf(item?.genderPolicy, ["mixed", "female", "male"]),
    roomKind: oneOf(item?.roomKind, ["dorm", "private"]),
    bathroom: oneOf(item?.bathroom, ["ensuite", "shared"]),
  }),
  coLiving: (item) => {
    const extras = {
      occupancy: oneOf(item?.occupancy, ["single", "double", "triple"]),
      furnished: bool(item?.furnished),
      ac: bool(item?.ac),
      bathroom: oneOf(item?.bathroom, ["ensuite", "shared"]),
      deposit: str(item?.deposit),
      availableFrom: str(item?.availableFrom),
    };
    const minStay = numOrUndefined(item?.minStayMonths);
    if (minStay !== undefined) extras.minStayMonths = minStay;
    return extras;
  },
  package: (item) => ({
    inclusions: strList(item?.inclusions),
    perPerson: bool(item?.perPerson),
  }),
  meeting: (item) => {
    const capacity = numOrUndefined(item?.capacity);
    return capacity === undefined ? {} : { capacity };
  },
  room: () => ({}),
  subProduct: (item) => {
    const extras = { accessHours: str(item?.accessHours) };
    const seats = numOrUndefined(item?.seats);
    if (seats !== undefined) extras.seats = seats;
    return extras;
  },
};

export const sanitizeItemExtras = (kind, item) => ({
  ...commonExtras(item),
  ...(KIND_EXTRAS[kind] ? KIND_EXTRAS[kind](item) : {}),
});

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const sanitizeOpeningHours = (value) =>
  (Array.isArray(value) ? value : [])
    .map((row) => ({
      day: oneOf(row?.day, WEEKDAYS),
      open: str(row?.open),
      close: str(row?.close),
      closed: bool(row?.closed),
    }))
    .filter((row) => row.day);

export const sanitizeReservation = (value) => ({
  enabled: value?.enabled === undefined ? true : bool(value.enabled),
  maxGuests: Math.max(1, numOrUndefined(value?.maxGuests) ?? 10),
  slotIntervalMinutes: Math.max(5, numOrUndefined(value?.slotIntervalMinutes) ?? 30),
  seatingOptions: strList(value?.seatingOptions),
  confirmationNote: str(value?.confirmationNote),
});

export const sanitizeStayPolicy = (value) => {
  const policy = {
    checkInTime: str(value?.checkInTime),
    checkOutTime: str(value?.checkOutTime),
    houseRules: strList(value?.houseRules),
    cancellationNote: str(value?.cancellationNote),
  };
  const minStay = numOrUndefined(value?.minStayNights);
  if (minStay !== undefined) policy.minStayNights = minStay;
  return policy;
};

export const sanitizeTourBooking = (value) => ({
  enabled: value?.enabled === undefined ? true : bool(value.enabled),
});

// Accepts either an already-parsed value or the JSON string sent in multipart forms.
export const parseJsonField = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
