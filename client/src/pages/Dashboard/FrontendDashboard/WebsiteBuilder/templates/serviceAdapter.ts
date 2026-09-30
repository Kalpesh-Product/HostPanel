// Turns every kind of offering (menu items, dorms, co-living rooms, packages,
// meeting rooms, generic sub-products) into one shape, so a template only has to
// know how to present a `ServiceItem` — never which vertical it came from.
import { getMediaSrc, getProductContentItems, normalizeSlug } from "./useWebsiteTemplateData";
import {
  getServiceProfile,
  resolveServiceKind,
  type ServiceKind,
  type ServiceProfile,
} from "./verticalProfiles";
import { DIETARY_OPTIONS } from "./offeringFields";

export interface ServiceItem {
  key: string;
  slug: string;
  title: string;
  description: string;
  price: string;
  priceUnit: string;
  images: string[];
  image: string;
  badge: string;
  features: string[];
  featured: boolean;
  /** Short spec chips derived from the vertical-specific fields ("Bunk bed", "AC"...). */
  chips: string[];
  category: string;
  dietary: string;
  spiceLevel: number;
  popular: boolean;
  capacity?: number;
  raw: any;
}

export interface Service {
  key: string;
  slug: string;
  name: string;
  /** Short label used on cards ("The Cafe"). */
  heading: string;
  subText: string;
  /** The service page's own banner copy, falling back to the card copy. */
  heroHeading: string;
  heroSubHeading: string;
  kind: ServiceKind;
  profile: ServiceProfile;
  items: ServiceItem[];
  heroImage: string;
  heroImages: string[];
  cardImage: string;
  leadEnabled: boolean;
  page: any;
}

const str = (value: unknown) => String(value ?? "").trim();

// The builder's preset service pages are plural / hyphen-cased ("Hostels", "Co-Living"). Cards and
// menus read better with the plain name. Custom page names are left exactly as the owner typed them.
const PRESET_NAMES: Record<string, string> = {
  hostels: "Hostel",
  hostel: "Hostel",
  workations: "Workation",
  workation: "Workation",
  "co-living": "Co-living",
  coliving: "Co-living",
  "co-working": "Co-working",
  coworking: "Co-working",
  "meeting-rooms": "Meeting rooms",
  cafe: "Cafe",
};

const imageList = (raw: any): string[] => {
  const list = Array.isArray(raw?.images) ? raw.images : raw?.image ? [raw.image] : [];
  return list.map((entry: any) => getMediaSrc(entry)).filter(Boolean);
};

const list = (value: unknown): string[] =>
  (Array.isArray(value) ? value : []).map((entry) => str(entry)).filter(Boolean);

const dietaryLabel = (value: string) => DIETARY_OPTIONS.find((o) => o.value === value)?.label || "";
const SPICE = ["", "Mild", "Medium", "Hot"];

const formatDate = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const buildChips = (kind: ServiceKind, raw: any): string[] => {
  const chips: string[] = [];
  if (kind === "menu") {
    if (raw?.dietary) chips.push(dietaryLabel(raw.dietary));
    const spice = Number(raw?.spiceLevel) || 0;
    if (spice > 0) chips.push(SPICE[Math.min(3, spice)]);
  } else if (kind === "hostel") {
    if (raw?.roomKind === "private") chips.push("Private room");
    else if (raw?.roomKind === "dorm") chips.push("Shared dorm");
    if (Number(raw?.capacity) > 0) chips.push(`${Number(raw.capacity)} beds`);
    if (raw?.genderPolicy === "female") chips.push("Female only");
    else if (raw?.genderPolicy === "male") chips.push("Male only");
    else if (raw?.genderPolicy === "mixed") chips.push("Mixed");
    if (raw?.bedType === "bunk") chips.push("Bunk beds");
    else if (raw?.bedType === "single") chips.push("Single beds");
    if (raw?.bathroom === "ensuite") chips.push("Attached bath");
    else if (raw?.bathroom === "shared") chips.push("Shared bath");
  } else if (kind === "coLiving") {
    if (raw?.occupancy === "single") chips.push("Single");
    else if (raw?.occupancy === "double") chips.push("Double sharing");
    else if (raw?.occupancy === "triple") chips.push("Triple sharing");
    if (raw?.bathroom === "ensuite") chips.push("Attached bath");
    else if (raw?.bathroom === "shared") chips.push("Shared bath");
    if (raw?.ac) chips.push("AC");
    if (raw?.furnished) chips.push("Furnished");
    if (Number(raw?.minStayMonths) > 0) chips.push(`Min ${Number(raw.minStayMonths)} months`);
    if (str(raw?.availableFrom)) chips.push(`Available ${formatDate(str(raw.availableFrom))}`);
  } else if (kind === "workation") {
    if (str(raw?.duration)) chips.push(str(raw.duration));
    if (raw?.perPerson) chips.push("Per person");
  } else if (kind === "meeting") {
    if (Number(raw?.capacity) > 0) chips.push(`Up to ${Number(raw.capacity)} people`);
  } else if (kind === "workspace") {
    if (Number(raw?.seats) > 0) chips.push(Number(raw.seats) === 1 ? "1 seat" : `${Number(raw.seats)} seats`);
    if (str(raw?.accessHours)) chips.push(str(raw.accessHours));
  }
  return chips.filter(Boolean);
};

export const normalizeServiceItem = (kind: ServiceKind, raw: any, index = 0): ServiceItem => {
  const profile = getServiceProfile(kind);
  const title = str(raw?.title || raw?.name || raw?.heading) || `${profile.labels.item} ${index + 1}`;
  const images = imageList(raw);
  const priceUnit = str(raw?.priceUnit) || (str(raw?.price || raw?.cost) ? profile.defaultPriceUnit : "");
  return {
    key: `${normalizeSlug(title)}-${index}`,
    slug: normalizeSlug(title),
    title,
    description: str(raw?.description || raw?.subText),
    price: str(raw?.price ?? raw?.cost),
    priceUnit,
    images,
    image: images[0] || "",
    badge: str(raw?.badge) || (raw?.popular ? "Popular" : ""),
    features: list(raw?.features),
    featured: raw?.featured === true,
    chips: buildChips(kind, raw),
    category: str(raw?.category),
    dietary: str(raw?.dietary),
    spiceLevel: Number(raw?.spiceLevel) || 0,
    popular: raw?.popular === true,
    capacity: Number(raw?.capacity) > 0 ? Number(raw.capacity) : undefined,
    raw,
  };
};

const itemsForPage = (draft: any, kind: ServiceKind, page: any): any[] => {
  if (kind === "menu") {
    return (Array.isArray(draft?.menuItems) ? draft.menuItems : []).filter((item: any) => item?.enabled !== false);
  }
  const raw = getProductContentItems(draft, page?.slug || page?.name || "", page);
  return raw.filter((item: any) => item?.enabled !== false);
};

/** One entry per enabled service page, each with its items already normalised. */
export const buildServices = (draft: any, productPages: any[]): Service[] =>
  (Array.isArray(productPages) ? productPages : []).map((page: any, index: number) => {
    const slug = normalizeSlug(page?.slug || page?.name || `service-${index + 1}`);
    const kind = resolveServiceKind(page?.slug || page?.name);
    const profile = getServiceProfile(kind);
    const heroImages = (Array.isArray(page?.heroImages) ? page.heroImages : [])
      .map((entry: any) => getMediaSrc(entry))
      .filter(Boolean);
    const cardImage = getMediaSrc(page?.cardImage);
    const items = itemsForPage(draft, kind, page).map((raw: any, i: number) => normalizeServiceItem(kind, raw, i));
    const displayName = PRESET_NAMES[normalizeSlug(str(page?.name))] || str(page?.name) || profile.labels.listing;
    // The service name is the card title, so "Hostel" is never labelled "Stay with us". To rename
    // a service, rename the page; the card's description line stays editable.
    const heading = displayName;
    return {
      key: `${slug}-${index}`,
      slug,
      name: displayName,
      heading,
      subText: str(page?.subText || page?.homeCardSubText),
      heroHeading: str(page?.heroHeading) || heading,
      heroSubHeading: str(page?.heroSubHeading) || str(page?.subText || page?.homeCardSubText),
      kind,
      profile,
      items,
      heroImage: heroImages[0] || getMediaSrc(page?.heroImage) || cardImage || items.find((i) => i.image)?.image || "",
      heroImages,
      cardImage: cardImage || items.find((i) => i.image)?.image || "",
      leadEnabled: page?.leadEnabled !== false,
      page,
    };
  });

/** Distinct kinds across the site's services, in page order. */
export const kindsOfServices = (services: Service[]): ServiceKind[] =>
  Array.from(new Set(services.map((s) => s.kind)));

/** Category → items, in first-seen order. Items without a category go under "". */
export const groupByCategory = (items: ServiceItem[]) => {
  const map = new Map<string, ServiceItem[]>();
  items.forEach((item) => {
    const bucket = map.get(item.category) || [];
    bucket.push(item);
    map.set(item.category, bucket);
  });
  return Array.from(map.entries()).map(([category, entries]) => ({ category, items: entries }));
};

export const uniqueCategories = (items: ServiceItem[]) =>
  Array.from(new Set(items.map((i) => i.category).filter(Boolean)));

/** Numeric price for sorting; items with no parsable price sort last. */
export const priceValue = (item: ServiceItem) => {
  const match = item.price.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
};
