// "Start from sample content": when someone begins a new website with one of the vertical
// templates, the builder opens already filled with the template's demo business (text, photos,
// rooms or menu items, reviews, FAQs, team) so the site looks finished from the first minute.
// Everything is ordinary form content: text is editable, and photos are real File objects, so the
// builder's normal upload path stores them and the user can replace or remove any of them.
//
// Deliberately NOT filled in: the business's own identity (company name, address, phone, email,
// map, social links, contact person, logo) and the "trusted by" logos. Those must be the user's own.
import { DEMO_BUSINESSES } from "./demoContent";
import { buildDemoPreviewDraft, defaultKindForTemplate } from "./demoPreviewData";
import { SERVICE_CHOICES, serviceNameToKind } from "./serviceChoices";

export const SAMPLE_TEMPLATE_IDS = ["savor", "wayfarer", "haven", "commons", "huddle"];

export const hasSampleContent = (themeVariant?: string | null) =>
  SAMPLE_TEMPLATE_IDS.includes(String(themeVariant || "").trim());

// The builder rejects images over 1 MB, so anything larger is skipped rather than failing a save.
const MAX_IMAGE_BYTES = 1024 * 1024 - 2048;
const FETCH_TIMEOUT_MS = 15000;
const PARALLEL_FETCHES = 6;

// Photo counts are trimmed so the first autosave stays light; the user can add more.
const LIMITS = { hero: 3, gallery: 12, about: 3, itemImages: 5, pageHero: 1 };

const urlOf = (value: any): string =>
  typeof value === "string" ? value : typeof value?.url === "string" ? value.url : "";

const createImageLoader = () => {
  const blobs = new Map<string, Promise<Blob | null>>();
  let running = 0;
  const waiting: Array<() => void> = [];

  const slot = () =>
    new Promise<void>((resolve) => {
      const start = () => {
        running += 1;
        resolve();
      };
      if (running < PARALLEL_FETCHES) start();
      else waiting.push(start);
    });
  const release = () => {
    running -= 1;
    waiting.shift()?.();
  };

  const fetchOnce = async (url: string): Promise<Blob | null> => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return null;
      const blob = await response.blob();
      if (!/^image\/(jpeg|png|webp)$/.test(blob.type) || blob.size > MAX_IMAGE_BYTES) return null;
      return blob;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  };

  const fetchBlob = async (url: string): Promise<Blob | null> => {
    await slot();
    try {
      // A slow or busy image host can fail once and work a moment later; a photo that silently
      // drops out leaves a room or team member without one.
      return (await fetchOnce(url)) || (await fetchOnce(url));
    } finally {
      release();
    }
  };

  return async (source: any): Promise<File | null> => {
    const url = urlOf(source);
    if (!/^https?:\/\//i.test(url)) return null;
    if (!blobs.has(url)) blobs.set(url, fetchBlob(url));
    const blob = await blobs.get(url)!;
    if (!blob) return null;
    const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
    const base = (url.match(/photo-[\w-]+/)?.[0] || `sample-${blobs.size}`).slice(0, 40);
    // A fresh File per use, so the same photo can sit in two places without sharing one object.
    return new File([blob], `${base}.${extension}`, { type: blob.type, lastModified: 1700000000000 });
  };
};

const compact = <T,>(list: Array<T | null | undefined>): T[] => list.filter(Boolean) as T[];

// The demo business has a made-up name; swap it for the user's own so no fake company shows up.
const rebrand = <T,>(value: T, from: string, to: string): T => {
  if (!from || !to || from === to) return value;
  if (typeof value === "string") {
    return (/^(https?:|data:)/i.test(value) ? value : value.split(from).join(to)) as unknown as T;
  }
  if (Array.isArray(value)) return value.map((item) => rebrand(item, from, to)) as unknown as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rebrand(item, from, to)])) as T;
  }
  return value;
};

/** The service names a new site starts with: the picker's choice, else the template's own kind. */
export const resolveSampleServices = (themeVariant: string, chosen: string[]): string[] => {
  if (chosen.length) return chosen;
  const kind = defaultKindForTemplate(themeVariant);
  const match = SERVICE_CHOICES.find((choice) => serviceNameToKind(choice.name) === kind);
  return [match?.name || "Co-Working"];
};

const SHORT_NAMES: Record<string, string[]> = { "Nimbus Coworks": ["Nimbus"] };

const ITEM_LISTS = ["menuItems", "rooms", "meetingRooms", "coLivingRooms", "packages", "dorms"] as const;

export interface SampleContent {
  /** Top-level form values to merge into the builder form. */
  values: Record<string, any>;
  /** Content for each service page, in the same order as the services passed in. */
  pages: Array<Record<string, any>>;
}

export const buildSampleContent = async ({
  themeVariant,
  services,
  companyName,
  serviceOnly = false,
}: {
  themeVariant: string;
  services: string[];
  companyName: string;
  /** Only the services' own content (page text, photos, items, settings), not the site-wide text and photos. */
  serviceOnly?: boolean;
}): Promise<SampleContent> => {
  const names = resolveSampleServices(themeVariant, services);
  const primaryKind = serviceNameToKind(names[0]);
  const fromName = DEMO_BUSINESSES[primaryKind].companyName;
  let draft: any = rebrand(buildDemoPreviewDraft(themeVariant, names), fromName, companyName);
  // Some sample text uses a short form of the made-up name ("Nimbus fills three floors").
  (SHORT_NAMES[fromName] || []).forEach((short) => {
    draft = rebrand(draft, short, companyName);
  });
  const load = createImageLoader();
  const loadMany = async (list: any[] = [], limit = 99) => compact(await Promise.all(list.slice(0, limit).map(load)));

  const loadItem = async (item: any) => {
    const { image, images, ...rest } = item || {};
    const next: Record<string, any> = { ...rest };
    if ("image" in (item || {})) next.image = image ? await load(image) : null;
    if ("images" in (item || {})) next.images = await loadMany(images, LIMITS.itemImages);
    return next;
  };

  const values: Record<string, any> = serviceOnly ? {} : {
    title: draft.title,
    subTitle: draft.subTitle,
    CTAButtonText: draft.CTAButtonText,
    about: draft.about,
    aboutTitle: draft.aboutTitle,
    aboutPageStory: draft.aboutPageStory,
    aboutPageMission: draft.aboutPageMission,
    aboutPageValues: draft.aboutPageValues,
    aboutPageTeamHeading: draft.aboutPageTeamHeading,
    partnerPageHeading: draft.partnerPageHeading,
    partnerPageContent: draft.partnerPageContent,
    productTitle: draft.productTitle,
    contactTitle: draft.contactTitle,
    galleryTitle: draft.galleryTitle,
    faqs: draft.faqs,
    inclusions: draft.inclusions,
  };
  values.openingHours = draft.openingHours;
  (["reservation", "stayPolicy", "tourBooking"] as const).forEach((key) => {
    if (draft[key] !== undefined) values[key] = draft[key];
  });

  const [heroImages, gallery, aboutPageImages, aboutPageImageCards, founders, testimonials, pages] = await Promise.all([
    serviceOnly ? [] : loadMany(draft.heroImages, LIMITS.hero),
    serviceOnly ? [] : loadMany(draft.gallery, LIMITS.gallery),
    serviceOnly ? [] : loadMany(draft.aboutPageImages, LIMITS.about),
    Promise.all((serviceOnly ? [] : draft.aboutPageImageCards || []).map(async (card: any) => ({ title: card.title, description: card.description, enabled: true, image: await load(card.image) }))),
    Promise.all((serviceOnly ? [] : draft.founders || []).map(async (founder: any) => ({ name: founder.name, role: founder.role, bio: founder.bio, highlights: founder.highlights, image: await load(founder.image) }))),
    Promise.all((serviceOnly ? [] : draft.testimonials || []).map(async (item: any) => ({ name: item.name, jobPosition: item.jobPosition, testimony: item.testimony, rating: Number(item.rating) || 5, file: await load(item.image) }))),
    Promise.all(
      (draft.productDropdownPages || []).map(async (page: any) => ({
        heroHeading: page.heroHeading,
        heroSubHeading: page.heroSubHeading,
        heroImages: await loadMany(page.heroImages, LIMITS.pageHero),
        homeCardHeading: page.homeCardHeading,
        homeCardSubText: page.homeCardSubText,
        homeCardImage: await load(page.homeCardImage),
        faqs: page.faqs,
        inclusions: page.inclusions,
        // Co-working keeps its spaces on the service page itself.
        ...(Array.isArray(page.subProducts) && page.subProducts.length ? { subProducts: await Promise.all(page.subProducts.map(loadItem)) } : {}),
      })),
    ),
  ]);
  if (!serviceOnly) Object.assign(values, { heroImages, gallery, aboutPageImages, aboutPageImageCards, founders, testimonials });

  await Promise.all(
    ITEM_LISTS.map(async (key) => {
      if (Array.isArray(draft[key]) && draft[key].length) values[key] = await Promise.all(draft[key].map(loadItem));
    }),
  );

  return { values, pages };
};

export interface ServiceSample {
  /** Content for the service page itself (headings, photos, FAQs, inclusions, co-working spaces). */
  page: Record<string, any>;
  /** The list of items this kind of service keeps (menu items, dorms, rooms, packages...). */
  lists: Record<string, any[]>;
  /** Opening hours and booking settings that go with the service. */
  settings: Record<string, any>;
}

/** Sample content for one service page added later, in the same shape the site-wide sample uses. */
export const buildServiceSample = async ({
  themeVariant,
  serviceName,
  companyName,
}: {
  themeVariant: string;
  serviceName: string;
  companyName: string;
}): Promise<ServiceSample> => {
  const sample = await buildSampleContent({ themeVariant, services: [serviceName], companyName, serviceOnly: true });
  const lists: Record<string, any[]> = {};
  ITEM_LISTS.forEach((key) => {
    if (Array.isArray(sample.values[key]) && sample.values[key].length) lists[key] = sample.values[key];
  });
  const settings: Record<string, any> = {};
  (["openingHours", "reservation", "stayPolicy", "tourBooking"] as const).forEach((key) => {
    if (sample.values[key] !== undefined) settings[key] = sample.values[key];
  });
  return { page: sample.pages[0] || {}, lists, settings };
};

/** True when the page name is one of the predefined services the sample content covers. */
export const isSampleService = (name: string) =>
  SERVICE_CHOICES.some((choice) => choice.name.toLowerCase() === String(name || "").trim().toLowerCase());
