// @ts-nocheck
import sharp from "sharp";
import WebsiteTemplate from "../../models/website/WebsiteTemplate.js";
import mongoose from "mongoose";
import {
  deleteFileFromS3ByUrl,
  uploadFileToS3,
} from "../../config/s3config.js";
import HostCompany from "../../models/Company.js";
import Workspace from "../../models/Workspace.js";
import axios from "axios";
import { VERTICAL_CONFIG } from "../../config/verticalConfig.js";
import { THEME_TOKENS } from "../../config/themeTokens.js";
import WorkspaceSubscription from "../../models/WorkspaceSubscription.js";

const VALID_VERTICALS = new Set([
  "co-working",
  "co-living",
  "workation",
  "hostel",
  "meeting-rooms",
  "cafe",
]);

const normalizeVertical = (value) => {
  if (typeof value !== "string") return "co-working";
  const raw = String(value).trim().toLowerCase();
  if (!raw) return "co-working";

  const compact = raw.replace(/\s+/g, "");
  const withHyphen = raw.replace(/\s+/g, "-");
  const aliasMap = {
    coworking: "co-working",
    "co-working": "co-working",
    coliving: "co-living",
    "co-living": "co-living",
    meetingrooms: "meeting-rooms",
    "meeting-rooms": "meeting-rooms",
    workation: "workation",
    hostel: "hostel",
    cafe: "cafe",
  };

  const canonical =
    aliasMap[raw] || aliasMap[compact] || aliasMap[withHyphen] || withHyphen;
  return VALID_VERTICALS.has(canonical) ? canonical : "co-working";
};
const businessTypeLabelByVertical = {
  "co-working": "Co-Working",
  "co-living": "Co-Living",
  workation: "Workation",
  hostel: "Hostels",
  "meeting-rooms": "Meetings",
  cafe: "Cafe",
};

const sectionTitleByVertical = {
  "co-working": "Our Products",
  "co-living": "Our Rooms",
  "meeting-rooms": "Our Meeting Rooms",
  workation: "Our Packages",
  hostel: "Our Dorms",
  cafe: "Our Menu",
};

const normalizeMapUrl = (rawValue) => {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  const lowered = raw.toLowerCase();
  if (["n/a", "na", "none", "null", "undefined", "-"].includes(lowered)) {
    return "";
  }

  const iframeSrc = raw.match(/src=["']([^"']+)["']/i)?.[1];
  const normalized = (iframeSrc || raw).trim().replace(/&amp;/g, "&");
  const safeCandidate = normalized.toLowerCase();
  const isGoogleMapsEmbed =
    safeCandidate.includes("google.com/maps/embed") ||
    safeCandidate.includes("google.co.in/maps/embed") ||
    safeCandidate.includes("www.google.com/maps/embed") ||
    safeCandidate.includes("maps.google.com/maps/embed");

  if (!isGoogleMapsEmbed) return "";

  return normalized;
};

const resolveUsableCompanyName = (...candidates) => {
  const invalid = new Set(["n/a", "na", "none", "undefined", "null", "-", "unknown"]);
  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (!value) continue;
    if (invalid.has(value.toLowerCase())) continue;
    return value;
  }
  return "";
};

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeSearchKeyFromName = (name = "") =>
  String(name).toLowerCase().split("-")[0].replace(/\s+/g, "");

const toBool = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return fallback;
};

const toNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const SOCIAL_PLATFORM_KEYS = [
  "instagram",
  "facebook",
  "twitter",
  "linkedin",
  "whatsapp",
];

const normalizeSocials = (value = {}) =>
  SOCIAL_PLATFORM_KEYS.reduce((socials, key) => {
    socials[key] = {
      enabled: value?.[key]?.enabled === true,
      link: String(value?.[key]?.link || "").trim(),
    };
    return socials;
  }, {});

const normalizePageNavItems = (items = []) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    name: String(item?.name || "").trim(),
    slug: String(item?.slug || "").trim().toLowerCase(),
    enabled: toBool(item?.enabled, true),
    pageHeading: String(item?.pageHeading || "").trim(),
    pageIntro: String(item?.pageIntro || "").trim(),
    metaTitle: String(item?.metaTitle || "").trim(),
    metaDescription: String(item?.metaDescription || "").trim(),
  }));

const normalizeProductDropdownPages = (items = []) =>
  (Array.isArray(items) ? items : []).map((item) => {
    const page = {
      name: String(item?.name || "").trim(),
      slug: String(item?.slug || "").trim().toLowerCase(),
      enabled: toBool(item?.enabled, true),
      heroHeading: String(item?.heroHeading || "").trim(),
      heroSubHeading: String(item?.heroSubHeading || "").trim(),
      heroMode: String(item?.heroMode || "single").trim().toLowerCase(),
      heroImages: Array.isArray(item?.heroImages)
        ? item.heroImages
            .map((img) => ({
              id: String(img?.id || "").trim(),
              url: String(img?.url || "").trim(),
            }))
            .filter((img) => img.id || img.url)
        : [],
      heroButtonText: String(item?.heroButtonText || "").trim(),
      homeCardHeading: String(item?.homeCardHeading || "").trim(),
      homeCardSubText: String(item?.homeCardSubText || "").trim(),
      leadEnabled: toBool(item?.leadEnabled, true),
      leadFormLabel: String(item?.leadFormLabel || "").trim(),
      faqs: Array.isArray(item?.faqs) ? item.faqs : [],
      inclusions: Array.isArray(item?.inclusions) ? item.inclusions : [],
    };

    if (item?.heroImage && typeof item.heroImage === "object") {
      page.heroImage = {
        id: String(item.heroImage.id || "").trim(),
        url: String(item.heroImage.url || "").trim(),
      };
    }

    if (item?.homeCardImage && typeof item.homeCardImage === "object") {
      page.homeCardImage = {
        id: String(item.homeCardImage.id || "").trim(),
        url: String(item.homeCardImage.url || "").trim(),
      };
    }

    return page;
  });

const sanitizeProductDropdownPagesForPersistence = (items = []) =>
  (Array.isArray(items) ? items : []).map((item) => {
    const page = { ...item };
    if (!page.heroImage) delete page.heroImage;
    if (!page.homeCardImage) delete page.homeCardImage;
    return page;
  });

const sanitizeMenuItemsForPersistence = (items = []) =>
  (Array.isArray(items) ? items : []).map((item) => {
    const menuItem = { ...item };
    if (!menuItem.image) delete menuItem.image;
    return menuItem;
  });

const productImageUrlAt = (products = [], index) => {
  const product = Array.isArray(products) ? products[index] : null;
  const images = Array.isArray(product?.images) ? product.images : [];
  return String(images[0]?.url || "").trim();
};

const slugifyForMatch = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const buildProductImageBySlug = (products = []) => {
  const map = {};
  (Array.isArray(products) ? products : []).forEach((p) => {
    const url = String(p?.images?.[0]?.url || "").trim();
    if (!url) return;
    [slugifyForMatch(p?.type), slugifyForMatch(p?.name)]
      .filter(Boolean)
      .forEach((s) => {
        if (!map[s]) map[s] = url;
      });
  });
  return map;
};

const serializeProductDropdownPagesForClient = (items = [], products = []) => {
  const productImageBySlug = buildProductImageBySlug(products);
  return normalizeProductDropdownPages(items).map((page, index) => {
    // Match the product page to its product by slug/name first, then fall back to
    // the product at the same index â€” so the product photo shows as the page's
    // cover on the home cards and on the products page.
    const fallbackProductImage =
      productImageBySlug[slugifyForMatch(page?.slug || page?.name || "")] ||
      productImageUrlAt(products, index);
    return {
      ...page,
      heading: String(page?.homeCardHeading || page?.name || "").trim(),
      subText: String(page?.homeCardSubText || "").trim(),
      cardImage: page?.homeCardImage?.url || fallbackProductImage || "",
      heroImage: page?.heroImage?.url || fallbackProductImage || "",
      heroImages: Array.isArray(page?.heroImages)
        ? page.heroImages.map((img) => img?.url || "").filter(Boolean)
        : [],
    };
  });
};

const serializeWebsiteTemplateForClient = (template) => {
  const payload = template?.toObject ? template.toObject() : { ...template };
  payload.mapUrl = normalizeMapUrl(payload.mapUrl);
    payload.companyName =
    resolveUsableCompanyName(payload.companyName, payload.registeredCompanyName) ||
    payload.searchKey ||
    "";
  payload.socials = normalizeSocials(payload.socials);
  payload.pageNavItems = Array.isArray(payload.pageNavItems)
    ? normalizePageNavItems(payload.pageNavItems)
    : [];
  payload.navItems = payload.pageNavItems;
  payload.productDropdownPages = Array.isArray(payload.productDropdownPages)
    ? normalizeProductDropdownPages(payload.productDropdownPages)
    : [];
  const serializedProductPages = serializeProductDropdownPagesForClient(
    payload.productDropdownPages,
    payload.products,
  );
  // Older websites have no productDropdownPages but do have a products list with
  // images â€” derive product cards from products so their images still show on the
  // home "Our Products" section and each product opens as a product page.
  payload.productPages =
    serializedProductPages.length > 0
      ? serializedProductPages
      : (Array.isArray(payload.products) ? payload.products : [])
          .map((product, index) => {
            const name = String(product?.name || product?.type || "").trim();
            if (!name) return null;
            const image = String(product?.images?.[0]?.url || "").trim();
            return {
              name,
              slug: slugifyForMatch(name || `product-${index + 1}`),
              enabled: true,
              heading: name,
              subText: String(product?.description || "").trim(),
              cardImage: image,
              heroImage: image,
              heroImages: image ? [image] : [],
            };
          })
          .filter(Boolean);
  return payload;
};

const buildTemplateLookupByCompanyAndVertical = (searchKey, vertical) => {
  const normalizedSearchKey = String(searchKey || "").trim().toLowerCase();
  return { searchKey: normalizedSearchKey };
};

const buildStrictTemplateLookupByCompanyAndVertical = (searchKey, vertical) => {
  const normalizedSearchKey = String(searchKey || "").trim().toLowerCase();
  return { searchKey: normalizedSearchKey };
};

const getFirstDayOfNextMonthUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
};

const deductWorkspaceCreditOnSuccess = async ({ workspaceId, companyId } = {}) => {
  const normalizedWorkspaceId = String(workspaceId || "").trim();
  const normalizedCompanyId = String(companyId || "").trim();
  if (!normalizedWorkspaceId && !normalizedCompanyId) return;

  const lookupClauses = [];
  if (normalizedWorkspaceId) lookupClauses.push({ workspaceId: normalizedWorkspaceId });
  if (normalizedCompanyId) lookupClauses.push({ companyId: normalizedCompanyId });

  await WorkspaceSubscription.findOneAndUpdate(
    { $or: lookupClauses },
    {
      $setOnInsert: {
        workspaceId: normalizedWorkspaceId || normalizedCompanyId || undefined,
        companyId: normalizedCompanyId || normalizedWorkspaceId || undefined,
        plan: "static-free",
        creditsLimit: 5,
        creditsResetDate: getFirstDayOfNextMonthUtc(),
      },
      $inc: { creditsUsed: 1 },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  ).exec();
};

const NOMADS_BASE_URL = "https://wononomadsbe.vercel.app";

const safeNum = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const sanitizeDraftData = (value = {}) => {
  if (!value || typeof value !== "object") return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return {};
  }
};

const extractDraftTextList = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => {
      if (typeof item === "string") return item.trim();
      return String(item?.text || "").trim();
    })
    .filter(Boolean);

const ensureNomadsCompanyRecord = async ({
  template,
  hostCompany,
  companyId,
  companyName,
  vertical = "co-working",
}) => {
  const resolvedCompanyName = String(companyName || "").trim();
  if (!resolvedCompanyName) return;

  try {
    const companyDataUrl = `${NOMADS_BASE_URL}/api/company/get-company-data/${encodeURIComponent(
      resolvedCompanyName,
    )}`;
    await axios.get(companyDataUrl, { timeout: 10000 });
    return;
  } catch (error) {
    const status = error?.response?.status;
    if (status && status !== 404) {
      console.warn("Nomads company lookup failed", {
        companyName: resolvedCompanyName,
        status,
      });
      return;
    }
  }

  const workspace = await Workspace.findOne({
    companyId: String(companyId || "").trim(),
    isActive: true,
  })
    .sort({ createdAt: 1 })
    .lean()
    .exec();

  const country = String(
    workspace?.country || hostCompany?.companyCountry || "India",
  ).trim();
  const state = String(
    workspace?.state || hostCompany?.companyState || "",
  ).trim();
  const city = String(workspace?.city || hostCompany?.companyCity || "").trim();
  const address = String(workspace?.address || "").trim();
  const aboutText = Array.isArray(template?.about)
    ? template.about.filter(Boolean).join(" ")
    : String(template?.about || "").trim();

  const nomadsPayload = {
    businessId: `WoNo_world_coworking_${city || "city"}_${Date.now()}`,
    companyName: resolvedCompanyName,
    companyTitle: resolvedCompanyName,
    registeredEntityName: String(
      template?.registeredCompanyName || resolvedCompanyName,
    ).trim(),
    website: `https://${template?.searchKey || normalizeSearchKeyFromName(resolvedCompanyName)}.wono.co/`,
    address,
    city,
    state,
    country,
    continent: String(hostCompany?.companyContinent || "Asia").trim() || "Asia",
    about: aboutText,
    latitude: safeNum(hostCompany?.latitude, 0),
    longitude: safeNum(hostCompany?.longitude, 0),
    ratings: 0,
    totalReviews: 0,
    totalSeats: 0,
    inclusions: "",
    services: "",
    companyType:
      vertical === "co-working"
        ? "coworking"
        : String(vertical || "coworking").replace(/-/g, ""),
    companyId: String(companyId || "").trim(),
    isActive: true,
    isRegistered: true,
    isPublic: true,
    websiteTemplateLink: `https://${template?.searchKey || normalizeSearchKeyFromName(resolvedCompanyName)}.wono.co/`,
    images: [],
  };

  try {
    await axios.post(`${NOMADS_BASE_URL}/api/company/create-company`, nomadsPayload, {
      timeout: 15000,
    });
    console.log("Nomads company auto-created", {
      companyName: resolvedCompanyName,
      companyId: nomadsPayload.companyId,
    });
  } catch (error) {
    const status = error?.response?.status;
    console.warn("Nomads company auto-create failed", {
      companyName: resolvedCompanyName,
      status,
      message: error?.response?.data?.message || error?.message || "unknown",
    });
  }
};

export const saveTemplateDraft = async (req, res) => {
  try {
    const parsedDraftData =
      typeof req.body?.draftData === "string"
        ? JSON.parse(req.body.draftData || "{}")
        : req.body?.draftData || {};
    const draftData = sanitizeDraftData(parsedDraftData);
    const vertical = normalizeVertical(
      req.body?.vertical ?? req.body?.verticalType ?? draftData?.vertical,
    );
    const resolvedCompanyName = resolveUsableCompanyName(
      req.body?.companyName,
      req.body?.registeredCompanyName,
      draftData?.companyName,
    );
    const searchKey = String(
      req.body?.searchKey ||
        draftData?.searchKey ||
        normalizeSearchKeyFromName(resolvedCompanyName),
    )
      .trim()
      .toLowerCase();

    if (!resolvedCompanyName || !searchKey) {
      return res.status(400).json({
        message: "Company name is required to save a website draft.",
      });
    }

    const themeIdFromConfig = VERTICAL_CONFIG?.[vertical]?.themeId;
    const themeId =
      themeIdFromConfig && THEME_TOKENS?.[themeIdFromConfig]
        ? themeIdFromConfig
        : "co-working-default";
    const activeSections = Array.isArray(VERTICAL_CONFIG?.[vertical]?.sections)
      ? VERTICAL_CONFIG[vertical].sections
      : [
          "hero",
          "about",
          "products",
          "gallery",
          "testimonials",
          "contact",
          "footer",
        ];

    let template = await WebsiteTemplate.findOne(
      buildStrictTemplateLookupByCompanyAndVertical(searchKey, vertical),
    );

    if (!template) {
      template = new WebsiteTemplate({
        searchKey,
        companyName: resolvedCompanyName,
        companyId: String(req.body?.companyId || "").trim() || undefined,
        workspaceId: String(req.body?.workspaceId || "").trim() || null,
        themeId,
        activeSections,
        isActive: true,
      });
    }

    template.searchKey = searchKey;
    template.companyName = resolvedCompanyName;
    template.companyId =
      String(req.body?.companyId || template.companyId || "").trim() || undefined;
    template.workspaceId =
      String(req.body?.workspaceId || template.workspaceId || "").trim() || null;
    template.themeId = themeId;
    template.activeSections = activeSections;
    template.isActive = true;
    template.isDraft = true;
    template.draftUpdatedAt = new Date();
    template.productDropdownPages = sanitizeProductDropdownPagesForPersistence(
      template.productDropdownPages,
    );
    template.menuItems = sanitizeMenuItemsForPersistence(template.menuItems);
    template.draftData = draftData;

    template.registeredCompanyName =
      resolveUsableCompanyName(
        req.body?.registeredCompanyName,
        draftData?.registeredCompanyName,
        resolvedCompanyName,
      ) || template.registeredCompanyName;

    template.title =
      draftData?.title !== undefined
        ? String(draftData.title || "").trim()
        : template.title;
    template.subTitle =
      draftData?.subTitle !== undefined
        ? String(draftData.subTitle || "").trim()
        : template.subTitle;
    template.CTAButtonText =
      draftData?.CTAButtonText !== undefined
        ? String(draftData.CTAButtonText || "").trim()
        : template.CTAButtonText;
    template.about =
      draftData?.about !== undefined
        ? extractDraftTextList(draftData.about)
        : template.about;
    template.productTitle =
      draftData?.productTitle !== undefined
        ? String(draftData.productTitle || "").trim()
        : template.productTitle;
    template.galleryTitle =
      draftData?.galleryTitle !== undefined
        ? String(draftData.galleryTitle || "").trim()
        : template.galleryTitle;
    template.testimonialTitle =
      draftData?.testimonialTitle !== undefined
        ? String(draftData.testimonialTitle || "").trim()
        : template.testimonialTitle;
    template.contactTitle =
      draftData?.contactTitle !== undefined
        ? String(draftData.contactTitle || "").trim()
        : template.contactTitle;
    template.mapUrl =
      draftData?.mapUrl !== undefined
        ? normalizeMapUrl(draftData.mapUrl)
        : template.mapUrl;
    template.email =
      draftData?.websiteEmail !== undefined || draftData?.email !== undefined
        ? String(draftData.websiteEmail || draftData.email || "").trim()
        : template.email;
    template.phone =
      draftData?.phone !== undefined
        ? String(draftData.phone || "").trim()
        : template.phone;
    template.address =
      draftData?.address !== undefined
        ? String(draftData.address || "").trim()
        : template.address;
    template.copyrightText =
      draftData?.copyrightText !== undefined
        ? String(draftData.copyrightText || "").trim()
        : template.copyrightText;
    if (draftData?.socials !== undefined) {
      template.socials = normalizeSocials(draftData.socials);
    }
    template.pageNavItems =
      draftData?.pageNavItems !== undefined
        ? normalizePageNavItems(draftData.pageNavItems)
        : template.pageNavItems;
    if (draftData?.productDropdownPages !== undefined) {
      const normalizedPages = normalizeProductDropdownPages(draftData.productDropdownPages);
      template.productDropdownPages = normalizedPages.map((page, index) => {
        const existing = template.productDropdownPages?.[index] || {};
        return {
          ...page,
          ...(page?.heroImage?.url
            ? { heroImage: page.heroImage }
            : existing?.heroImage
              ? { heroImage: existing.heroImage }
              : {}),
          heroImages:
            Array.isArray(page?.heroImages) && page.heroImages.length
              ? page.heroImages
              : existing?.heroImages || [],
          ...(page?.homeCardImage?.url
            ? { homeCardImage: page.homeCardImage }
            : existing?.homeCardImage
              ? { homeCardImage: existing.homeCardImage }
              : {}),
        };
      });
    }
    template.aboutPageIntro =
      draftData?.aboutPageIntro !== undefined
        ? String(draftData.aboutPageIntro || "").trim()
        : template.aboutPageIntro;
    template.aboutPageOverview =
      draftData?.aboutPageOverview !== undefined
        ? String(draftData.aboutPageOverview || "").trim()
        : template.aboutPageOverview;
    template.aboutPageStory =
      draftData?.aboutPageStory !== undefined
        ? String(draftData.aboutPageStory || "").trim()
        : template.aboutPageStory;
    template.aboutPageMission =
      draftData?.aboutPageMission !== undefined
        ? String(draftData.aboutPageMission || "").trim()
        : template.aboutPageMission;
    template.aboutPageVision =
      draftData?.aboutPageVision !== undefined
        ? String(draftData.aboutPageVision || "").trim()
        : template.aboutPageVision;
    template.aboutPageValues =
      draftData?.aboutPageValues !== undefined
        ? String(draftData.aboutPageValues || "").trim()
        : template.aboutPageValues;
    template.aboutPageTeamHeading =
      draftData?.aboutPageTeamHeading !== undefined
        ? String(draftData.aboutPageTeamHeading || "").trim()
        : template.aboutPageTeamHeading;
    template.aboutPageImageCards =
      draftData?.aboutPageImageCards !== undefined &&
      Array.isArray(draftData.aboutPageImageCards)
        ? draftData.aboutPageImageCards.map((card, index) => ({
            title: String(card?.title || "").trim(),
            description: String(card?.description || "").trim(),
            // Preserve the previously-uploaded team-member image. draftData only
            // carries text, so without this every autosave wiped the card image.
            image: template.aboutPageImageCards?.[index]?.image,
          }))
        : template.aboutPageImageCards;
    template.galleryPageHeading =
      draftData?.galleryPageHeading !== undefined
        ? String(draftData.galleryPageHeading || "").trim()
        : template.galleryPageHeading;
    template.testimonialsPageHeading =
      draftData?.testimonialsPageHeading !== undefined
        ? String(draftData.testimonialsPageHeading || "").trim()
        : template.testimonialsPageHeading;
    template.testimonialsPageIntro =
      draftData?.testimonialsPageIntro !== undefined
        ? String(draftData.testimonialsPageIntro || "").trim()
        : template.testimonialsPageIntro;
    template.testimonialsHomePreviewCount =
      draftData?.testimonialsHomePreviewCount !== undefined
        ? toNum(draftData.testimonialsHomePreviewCount, 3)
        : template.testimonialsHomePreviewCount;
    template.testimonialsEnableWriteReview =
      draftData?.testimonialsEnableWriteReview !== undefined
        ? toBool(draftData.testimonialsEnableWriteReview, true)
        : template.testimonialsEnableWriteReview;
    template.testimonialsSuccessMessage =
      draftData?.testimonialsSuccessMessage !== undefined
        ? String(draftData.testimonialsSuccessMessage || "").trim()
        : template.testimonialsSuccessMessage;
    template.contactPageHeading =
      draftData?.contactPageHeading !== undefined
        ? String(draftData.contactPageHeading || "").trim()
        : template.contactPageHeading;
    template.contactPageIntro =
      draftData?.contactPageIntro !== undefined
        ? String(draftData.contactPageIntro || "").trim()
        : template.contactPageIntro;
    template.contactEnableInquiryForm =
      draftData?.contactEnableInquiryForm !== undefined
        ? toBool(draftData.contactEnableInquiryForm, true)
        : template.contactEnableInquiryForm;
    template.contactInquirySuccessMessage =
      draftData?.contactInquirySuccessMessage !== undefined
        ? String(draftData.contactInquirySuccessMessage || "").trim()
        : template.contactInquirySuccessMessage;
    template.products = Array.isArray(draftData?.products)
      ? draftData.products.map((item, index) => {
          const existing = template.products?.[index];
          return {
          type: String(item?.type || "").trim(),
          name: String(item?.name || "").trim(),
          cost: String(item?.cost || "").trim(),
          description: String(item?.description || "").trim(),
          images: Array.isArray(existing?.images) ? existing.images : [],
          };
        })
      : template.products;
    template.menuItems = Array.isArray(draftData?.menuItems)
      ? draftData.menuItems.map((item, index) => {
          const existing = template.menuItems?.[index];
          const nextItem = {
            category: String(item?.category || "").trim(),
            name: String(item?.name || "").trim(),
            description: String(item?.description || "").trim(),
            price: String(item?.price || "").trim(),
          };
          if (existing?.image) nextItem.image = existing.image;
          return nextItem;
        })
      : template.menuItems;
    template.rooms = Array.isArray(draftData?.rooms)
      ? draftData.rooms.map((item, index) => {
          const existing = template.rooms?.[index];
          return {
          title: String(item?.title || "").trim(),
          description: String(item?.description || "").trim(),
          price: String(item?.price || "").trim(),
          images: Array.isArray(existing?.images) ? existing.images : [],
          };
        })
      : template.rooms;
    template.meetingRooms = Array.isArray(draftData?.meetingRooms)
      ? draftData.meetingRooms.map((item, index) => {
          const existing = template.meetingRooms?.[index];
          return {
          title: String(item?.title || "").trim(),
          description: String(item?.description || "").trim(),
          price: String(item?.price || "").trim(),
          images: Array.isArray(existing?.images) ? existing.images : [],
          };
        })
      : Array.isArray(draftData?.rooms)
        ? draftData.rooms.map((item, index) => {
            const existing = template.meetingRooms?.[index];
            return {
            title: String(item?.title || "").trim(),
            description: String(item?.description || "").trim(),
            price: String(item?.price || "").trim(),
            images: Array.isArray(existing?.images) ? existing.images : [],
            };
          })
        : template.meetingRooms;
    template.coLivingRooms = Array.isArray(draftData?.coLivingRooms)
      ? draftData.coLivingRooms.map((item, index) => {
          const existing = template.coLivingRooms?.[index];
          return {
          title: String(item?.title || "").trim(),
          description: String(item?.description || "").trim(),
          price: String(item?.price || "").trim(),
          images: Array.isArray(existing?.images) ? existing.images : [],
          };
        })
      : template.coLivingRooms;
    template.packages = Array.isArray(draftData?.packages)
      ? draftData.packages.map((item, index) => {
          const existing = template.packages?.[index];
          return {
          title: String(item?.title || "").trim(),
          description: String(item?.description || "").trim(),
          price: String(item?.price || "").trim(),
          duration: String(item?.duration || "").trim(),
          images: Array.isArray(existing?.images) ? existing.images : [],
          };
        })
      : template.packages;
    template.dorms = Array.isArray(draftData?.dorms)
      ? draftData.dorms.map((item, index) => {
          const existing = template.dorms?.[index];
          return {
          title: String(item?.title || "").trim(),
          description: String(item?.description || "").trim(),
          price: String(item?.price || "").trim(),
          capacity: toNum(item?.capacity, 0),
          images: Array.isArray(existing?.images) ? existing.images : [],
          };
        })
      : template.dorms;
    template.testimonials = Array.isArray(draftData?.testimonials)
      ? draftData.testimonials.map((item) => ({
          name: String(item?.name || "").trim(),
          jobPosition: String(
            item?.jobPosition || item?.role || "",
          ).trim(),
          testimony: String(item?.testimony || item?.text || "").trim(),
          rating: toNum(item?.rating, 5),
        }))
      : template.testimonials;

    if (Array.isArray(draftData?.faqs)) {
      template.faqs = draftData.faqs
        .map((faq) => ({
          question: String(faq?.question || "").trim(),
          answer: String(faq?.answer || "").trim(),
        }))
        .filter((faq) => faq.question);
    }

    if (Array.isArray(draftData?.inclusions)) {
      template.inclusions = draftData.inclusions;
    }

    if (draftData?.logoCarousel !== undefined) {
      template.logoCarousel = {
        enabled: toBool(draftData.logoCarousel?.enabled, false),
        title: String(draftData.logoCarousel?.title || "").trim(),
        logos: Array.isArray(template.logoCarousel?.logos) ? template.logoCarousel.logos : [],
      };
    }

    // Partner page fields
    if (draftData?.partnerPageHeading !== undefined) {
      template.partnerPageHeading = String(draftData.partnerPageHeading || "").trim();
    }
    if (draftData?.partnerPageContent !== undefined) {
      template.partnerPageContent = String(draftData.partnerPageContent || "").trim();
    }
    if (draftData?.partnerFormTitle !== undefined) {
      template.partnerFormTitle = String(draftData.partnerFormTitle || "").trim();
    }

    // Careers page
    if (draftData?.careersPageHeading !== undefined) {
      template.careersPageHeading = String(draftData.careersPageHeading || "").trim();
    }
    if (draftData?.careersPageIntro !== undefined) {
      template.careersPageIntro = String(draftData.careersPageIntro || "").trim();
    }
    if (draftData?.careersHeroButtonText !== undefined) {
      template.careersHeroButtonText = String(draftData.careersHeroButtonText || "").trim();
    }
    if (draftData?.careersClosingHeading !== undefined) {
      template.careersClosingHeading = String(draftData.careersClosingHeading || "").trim();
    }
    if (draftData?.careersClosingText !== undefined) {
      template.careersClosingText = String(draftData.careersClosingText || "").trim();
    }
    if (draftData?.careersApplyButtonText !== undefined) {
      template.careersApplyButtonText = String(draftData.careersApplyButtonText || "").trim();
    }
    if (draftData?.careersApplyButtonLink !== undefined) {
      template.careersApplyButtonLink = String(draftData.careersApplyButtonLink || "").trim();
    }
    if (draftData?.careersFormFields !== undefined) {
      template.careersFormFields = typeof draftData.careersFormFields === "string"
        ? String(draftData.careersFormFields || "[]").trim()
        : JSON.stringify(Array.isArray(draftData.careersFormFields) ? draftData.careersFormFields : []);
    }

    // Founders (text only — images handled via filesByField below)
    if (Array.isArray(draftData?.founders)) {
      template.founders = draftData.founders.map((f, index) => ({
        name: String(f?.name || "").trim(),
        role: String(f?.role || "").trim(),
        bio: String(f?.bio || "").trim(),
        highlights: String(f?.highlights || "").trim(),
        image: template.founders?.[index]?.image || undefined,
      }));
    }

    const filesByField = {};
    for (const file of req.files || []) {
      if (!filesByField[file.fieldname]) filesByField[file.fieldname] = [];
      filesByField[file.fieldname].push(file);
    }

    const uploadImagesForDraft = async (files = [], folder, limit = 10) => {
      const uploaded = [];
      for (const file of files.slice(0, limit)) {
        const buffer = await sharp(file.buffer).webp({ quality: 80 }).toBuffer();
        const route = `${folder}/${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`;
        const data = await uploadFileToS3(route, {
          buffer,
          mimetype: "image/webp",
        });
        uploaded.push({ id: data.id, url: data.url });
      }
      return uploaded;
    };

    const baseFolder = `hosts/template/${searchKey}`;

    if (filesByField.companyLogo?.[0]) {
      const uploaded = await uploadImagesForDraft(
        [filesByField.companyLogo[0]],
        `${baseFolder}/companyLogo`,
        1,
      );
      template.companyLogo = uploaded[0] || template.companyLogo;
    }

    if (filesByField.careersHeroImage?.[0]) {
      const uploaded = await uploadImagesForDraft(
        [filesByField.careersHeroImage[0]],
        `${baseFolder}/careersHeroImage`,
        1,
      );
      template.careersHeroImage = uploaded[0] || template.careersHeroImage;
    }

    if (filesByField.heroImages?.length) {
      const uploaded = await uploadImagesForDraft(
        filesByField.heroImages,
        `${baseFolder}/heroImages`,
        5,
      );
      template.heroImages = [...(template.heroImages || []), ...uploaded];
    }

    if (filesByField.gallery?.length) {
      const uploaded = await uploadImagesForDraft(
        filesByField.gallery,
        `${baseFolder}/gallery`,
        40,
      );
      template.gallery = [...(template.gallery || []), ...uploaded];
    }

    if (filesByField.logoCarouselLogos?.length) {
      const uploaded = await uploadImagesForDraft(
        filesByField.logoCarouselLogos,
        `${baseFolder}/logoCarousel`,
        12,
      );
      if (!template.logoCarousel) template.logoCarousel = { enabled: false, title: "", logos: [] };
      template.logoCarousel.logos = [...(template.logoCarousel.logos || []), ...uploaded];
    }

    if (filesByField.aboutPageImages?.length) {
      const uploaded = await uploadImagesForDraft(
        filesByField.aboutPageImages,
        `${baseFolder}/aboutPageImages`,
        20,
      );
      template.aboutPageImages = [...(template.aboutPageImages || []), ...uploaded];
    }

    // Upload team-member (about page) card images sent as aboutPageImageCardImage_<index>.
    // Without this the draft autosave never persisted these images to S3.
    if (Array.isArray(template.aboutPageImageCards)) {
      let cardImageChanged = false;
      for (let i = 0; i < template.aboutPageImageCards.length; i++) {
        const cardFile = (filesByField[`aboutPageImageCardImage_${i}`] || [])[0];
        if (cardFile) {
          const uploaded = await uploadImagesForDraft(
            [cardFile],
            `${baseFolder}/aboutPageImageCards/${i}`,
            1,
          );
          if (uploaded[0]) {
            template.aboutPageImageCards[i] = {
              ...(template.aboutPageImageCards[i] || {}),
              image: uploaded[0],
            };
            cardImageChanged = true;
          }
        }
      }
      if (cardImageChanged) template.markModified("aboutPageImageCards");
    }

    if (Array.isArray(template.productDropdownPages)) {
      for (let i = 0; i < template.productDropdownPages.length; i++) {
        const singleHero = (filesByField[`productPageHeroImage_${i}`] || [])[0];
        if (singleHero) {
          const uploaded = await uploadImagesForDraft(
            [singleHero],
            `${baseFolder}/productPageHeroImage/${i}`,
            1,
          );
          template.productDropdownPages[i].heroImage = uploaded[0] || undefined;
        }

        const heroImages = filesByField[`productPageHeroImages_${i}`] || [];
        if (heroImages.length) {
          template.productDropdownPages[i].heroImages = await uploadImagesForDraft(
            heroImages,
            `${baseFolder}/productPageHeroImages/${i}`,
            5,
          );
        }

        const homeCardImage = (filesByField[`productPageHomeCardImage_${i}`] || [])[0];
        if (homeCardImage) {
          const uploaded = await uploadImagesForDraft(
            [homeCardImage],
            `${baseFolder}/productPageHomeCardImage/${i}`,
            1,
          );
          template.productDropdownPages[i].homeCardImage = uploaded[0] || undefined;
        }
      }
    }

    const ensureArrayAt = (arr, index) => {
      while (arr.length <= index) arr.push({});
      return arr[index];
    };

    for (const fieldName of Object.keys(filesByField)) {
      let match = fieldName.match(/^draftMenuItemImage_(\d+)$/);
      if (match) {
        const idx = Number(match[1]);
        const uploaded = await uploadImagesForDraft(
          filesByField[fieldName],
          `${baseFolder}/menuItems/${idx}`,
          1,
        );
        if (!template.menuItems[idx]) template.menuItems[idx] = {};
        template.menuItems[idx].image = uploaded[0] || template.menuItems[idx].image;
        continue;
      }

      match = fieldName.match(/^draftRoomImages_(\d+)_(\d+)$/);
      if (match) {
        const itemIdx = Number(match[1]);
        const uploaded = await uploadImagesForDraft(
          filesByField[fieldName],
          `${baseFolder}/rooms/${itemIdx}`,
          1,
        );
        if (!template.rooms[itemIdx]) template.rooms[itemIdx] = {};
        const existing = Array.isArray(template.rooms[itemIdx].images)
          ? template.rooms[itemIdx].images
          : [];
        template.rooms[itemIdx].images = [...existing, ...uploaded];
        continue;
      }

      match = fieldName.match(/^draftMeetingRoomImages_(\d+)_(\d+)$/);
      if (match) {
        const itemIdx = Number(match[1]);
        const uploaded = await uploadImagesForDraft(
          filesByField[fieldName],
          `${baseFolder}/meetingRooms/${itemIdx}`,
          1,
        );
        const meetingRooms = Array.isArray(draftData?.meetingRooms)
          ? [...draftData.meetingRooms]
          : [];
        const target = ensureArrayAt(meetingRooms, itemIdx);
        const existing = Array.isArray(target?.images) ? target.images : [];
        target.images = [...existing, ...uploaded];
        draftData.meetingRooms = meetingRooms;
        if (!Array.isArray(template.meetingRooms)) template.meetingRooms = [];
        if (!template.meetingRooms[itemIdx]) template.meetingRooms[itemIdx] = {};
        const templateExisting = Array.isArray(template.meetingRooms[itemIdx].images)
          ? template.meetingRooms[itemIdx].images
          : [];
        template.meetingRooms[itemIdx].images = [...templateExisting, ...uploaded];
        continue;
      }

      match = fieldName.match(/^draftPackageImages_(\d+)_(\d+)$/);
      if (match) {
        const itemIdx = Number(match[1]);
        const uploaded = await uploadImagesForDraft(
          filesByField[fieldName],
          `${baseFolder}/packages/${itemIdx}`,
          1,
        );
        if (!template.packages[itemIdx]) template.packages[itemIdx] = {};
        const existing = Array.isArray(template.packages[itemIdx].images)
          ? template.packages[itemIdx].images
          : [];
        template.packages[itemIdx].images = [...existing, ...uploaded];
        continue;
      }

      match = fieldName.match(/^draftDormImages_(\d+)_(\d+)$/);
      if (match) {
        const itemIdx = Number(match[1]);
        const uploaded = await uploadImagesForDraft(
          filesByField[fieldName],
          `${baseFolder}/dorms/${itemIdx}`,
          1,
        );
        if (!template.dorms[itemIdx]) template.dorms[itemIdx] = {};
        const existing = Array.isArray(template.dorms[itemIdx].images)
          ? template.dorms[itemIdx].images
          : [];
        template.dorms[itemIdx].images = [...existing, ...uploaded];
        continue;
      }

      match = fieldName.match(/^draftProductImages_(\d+)_(\d+)$/);
      if (match) {
        const itemIdx = Number(match[1]);
        const uploaded = await uploadImagesForDraft(
          filesByField[fieldName],
          `${baseFolder}/products/${itemIdx}`,
          1,
        );
        if (!template.products[itemIdx]) template.products[itemIdx] = {};
        const existing = Array.isArray(template.products[itemIdx].images)
          ? template.products[itemIdx].images
          : [];
        template.products[itemIdx].images = [...existing, ...uploaded];
        continue;
      }

      match = fieldName.match(/^draftCoLivingRoomImages_(\d+)_(\d+)$/);
      if (match) {
        const itemIdx = Number(match[1]);
        const uploaded = await uploadImagesForDraft(
          filesByField[fieldName],
          `${baseFolder}/coLivingRooms/${itemIdx}`,
          1,
        );
        const coLivingRooms = Array.isArray(draftData?.coLivingRooms)
          ? [...draftData.coLivingRooms]
          : [];
        const target = ensureArrayAt(coLivingRooms, itemIdx);
        const existing = Array.isArray(target?.images) ? target.images : [];
        target.images = [...existing, ...uploaded];
        draftData.coLivingRooms = coLivingRooms;
        if (!Array.isArray(template.coLivingRooms)) template.coLivingRooms = [];
        if (!template.coLivingRooms[itemIdx]) template.coLivingRooms[itemIdx] = {};
        const templateExisting = Array.isArray(template.coLivingRooms[itemIdx].images)
          ? template.coLivingRooms[itemIdx].images
          : [];
        template.coLivingRooms[itemIdx].images = [...templateExisting, ...uploaded];
      }
    }

    // Founder images (uploaded from builder)
    for (const fieldName of Object.keys(filesByField)) {
      const founderMatch = fieldName.match(/^founderImage_(\d+)$/);
      if (founderMatch) {
        const idx = Number(founderMatch[1]);
        const uploaded = await uploadImagesForDraft(
          [filesByField[fieldName][0]],
          `${baseFolder}/founders/${idx}`,
          1,
        );
        if (!Array.isArray(template.founders)) template.founders = [];
        while (template.founders.length <= idx) template.founders.push({});
        template.founders[idx] = { ...(template.founders[idx] || {}), image: uploaded[0] || template.founders[idx]?.image };
      }
    }

    template.draftData = draftData;

    template.productDropdownPages = sanitizeProductDropdownPagesForPersistence(
      template.productDropdownPages,
    );
    template.menuItems = sanitizeMenuItemsForPersistence(template.menuItems);
    await template.save();

    return res.status(200).json({
      message: "Website draft saved successfully",
      template: serializeWebsiteTemplateForClient(template),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to save website draft" });
  }
};

export const createTemplate = async (req, res, next) => {
  try {
    console.log("REQ BODY VERTICAL:", req.body.vertical);
    console.log("REQ BODY COMPANY:", req.body.companyName);
    const { company } = req.query;

    // `products` might arrive as a JSON string in multipart. Normalize it.

    let {
      products,
      menuItems,
      rooms,
      meetingRooms,
      coLivingRooms,
      packages,
      dorms,
      testimonials,
      about,
      pageNavItems,
      productDropdownPages,
      aboutPageImageCards,
      enabledSections,
      sectionOverrides,
      styleConfig,
      inclusions,
      socials,
      source = "Host Panel",
    } = req.body;

    const safeParse = (val, fallback) => {
      try {
        return typeof val === "string" ? JSON.parse(val) : val || fallback;
      } catch {
        return fallback;
      }
    };

    about = safeParse(about, []);
    products = safeParse(products, []);
    menuItems = safeParse(menuItems, []);
    rooms = safeParse(rooms, []);
    meetingRooms = safeParse(meetingRooms, []);
    coLivingRooms = safeParse(coLivingRooms, []);
    packages = safeParse(packages, []);
    dorms = safeParse(dorms, []);
    testimonials = safeParse(testimonials, []);
    pageNavItems = safeParse(pageNavItems, []);
    productDropdownPages = safeParse(productDropdownPages, []);
    aboutPageImageCards = safeParse(aboutPageImageCards, []);
    enabledSections = safeParse(enabledSections, []);
    sectionOverrides = safeParse(sectionOverrides, {});
    styleConfig = safeParse(styleConfig, {});
    socials = normalizeSocials(safeParse(socials, {}));

    const vertical = normalizeVertical(
      req.body.vertical ?? req.body.verticalType,
    );
    const resolvedProductTitle =
      String(req.body?.productTitle || "").trim() ||
      sectionTitleByVertical[vertical] ||
      "Our Products";
    console.log("VERTICAL BEING SAVED:", req.body.vertical);
    const themeIdFromConfig = VERTICAL_CONFIG?.[vertical]?.themeId;
    const themeId =
      themeIdFromConfig && THEME_TOKENS?.[themeIdFromConfig]
        ? themeIdFromConfig
        : "co-working-default";
    const activeSections = Array.isArray(VERTICAL_CONFIG?.[vertical]?.sections)
      ? VERTICAL_CONFIG[vertical].sections
      : [
          "hero",
          "about",
          "products",
          "gallery",
          "testimonials",
          "contact",
          "footer",
        ];

    const TEXT_LIMITS = {
      title: 120,
      subTitle: 200,
      CTAButtonText: 50,
      productTitle: 120,
      galleryTitle: 120,
      testimonialTitle: 120,
      contactTitle: 120,
      mapUrl: 2048,
      email: 254,
      phone: 30,
      address: 200,
      registeredCompanyName: 150,
      copyrightText: 200,
      aboutItem: 500,
      productType: 50,
      productName: 120,
      productCost: 50,
      productDescription: 500,
      testimonialName: 120,
      testimonialJob: 120,
      testimonialText: 500,
    };

    const enforceMaxLength = (label, value, max) => {
      if (typeof value === "string" && value.length > max) {
        return `${label} cannot exceed ${max} characters.`;
      }

      return null;
    };

    const validateTextFields = () => {
      const fieldLimits = [
        ["Title", req.body.title, TEXT_LIMITS.title],
        ["Subtitle", req.body.subTitle, TEXT_LIMITS.subTitle],
        ["CTA button text", req.body.CTAButtonText, TEXT_LIMITS.CTAButtonText],
        ["Product title", req.body.productTitle, TEXT_LIMITS.productTitle],
        ["Gallery title", req.body.galleryTitle, TEXT_LIMITS.galleryTitle],
        [
          "Testimonial title",
          req.body.testimonialTitle,
          TEXT_LIMITS.testimonialTitle,
        ],
        ["Contact title", req.body.contactTitle, TEXT_LIMITS.contactTitle],
        ["Map URL", req.body.mapUrl, TEXT_LIMITS.mapUrl],
        ["Email", req.body.websiteEmail, TEXT_LIMITS.email],
        ["Phone", req.body.phone, TEXT_LIMITS.phone],
        ["Address", req.body.address, TEXT_LIMITS.address],
        [
          "Registered company name",
          req.body.registeredCompanyName,
          TEXT_LIMITS.registeredCompanyName,
        ],
        ["Copyright text", req.body.copyrightText, TEXT_LIMITS.copyrightText],
      ];

      for (const [label, value, max] of fieldLimits) {
        const error = enforceMaxLength(label, value, max);
        if (error) return error;
      }

      if (Array.isArray(about)) {
        for (const [index, item] of about.entries()) {
          const error = enforceMaxLength(
            `About item ${index + 1}`,
            item,
            TEXT_LIMITS.aboutItem,
          );
          if (error) return error;
        }
      }

      if (Array.isArray(products)) {
        for (const [index, product] of products.entries()) {
          const typeError = enforceMaxLength(
            `Product ${index + 1} type`,
            product?.type,
            TEXT_LIMITS.productType,
          );
          if (typeError) return typeError;

          const nameError = enforceMaxLength(
            `Product ${index + 1} name`,
            product?.name,
            TEXT_LIMITS.productName,
          );
          if (nameError) return nameError;

          const costError = enforceMaxLength(
            `Product ${index + 1} cost`,
            product?.cost,
            TEXT_LIMITS.productCost,
          );
          if (costError) return costError;

          const descriptionError = enforceMaxLength(
            `Product ${index + 1} description`,
            product?.description,
            TEXT_LIMITS.productDescription,
          );
          if (descriptionError) return descriptionError;
        }
      }

      if (Array.isArray(testimonials)) {
        for (const [index, testimonial] of testimonials.entries()) {
          const nameError = enforceMaxLength(
            `Testimonial ${index + 1} name`,
            testimonial?.name,
            TEXT_LIMITS.testimonialName,
          );
          if (nameError) return nameError;

          const jobError = enforceMaxLength(
            `Testimonial ${index + 1} job position`,
            testimonial?.jobPosition,
            TEXT_LIMITS.testimonialJob,
          );
          if (jobError) return jobError;

          const testimonyError = enforceMaxLength(
            `Testimonial ${index + 1} testimony`,
            testimonial?.testimony,
            TEXT_LIMITS.testimonialText,
          );
          if (testimonyError) return testimonyError;
        }
      }

      return null;
    };

    const validationError = validateTextFields();
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const hostCompanyExists = await HostCompany.findOne({
      $or: [
        {
          companyName: {
            $regex: new RegExp(`^${req.body.companyName}$`, "i"),
          },
        },
        { companyId: req.body.companyId },
      ],
    });

    if (!hostCompanyExists && source !== "Nomad") {
      return res.status(400).json({ message: "Company not found" });
    }

    for (const k of Object.keys(req.body)) {
      if (/^(products|testimonials)\.\d+\./.test(k)) delete req.body[k];
    }

    const formatCompanyName = (name) => {
      if (!name) return "";

      const trimmed = name.trim().toLowerCase();

      const invalids = ["n/a", "na", "none", "undefined", "null", "-"];
      if (invalids.includes(trimmed)) return "";

      return trimmed.split("-")[0].replace(/\s+/g, "");
    };

    const resolvedCompanyName = resolveUsableCompanyName(
      req.body.companyName,
      req.body.registeredCompanyName,
      hostCompanyExists?.companyName,
    );
    req.body.companyName = resolvedCompanyName;
    const searchKey = formatCompanyName(resolvedCompanyName);
    const baseFolder = `hosts/template/${searchKey}`;

    if (searchKey === "") {
      return res.status(400).json({ message: "Provide a valid company name" });
    }

    let template = await WebsiteTemplate.findOne(
      buildStrictTemplateLookupByCompanyAndVertical(searchKey, vertical),
    );

    const canPromoteExistingDraft =
      Boolean(template) && template.isDraft === true && template.isPublished !== true;

    if (template && !canPromoteExistingDraft) {
      return res
        .status(400)
        .json({
          message: "Template for this company already exists",
          duplicateKey: {
            searchKey,
            existingTemplateId: String(template?._id || ""),
          },
        });
    }

    if (!template || !canPromoteExistingDraft) {
      template = new WebsiteTemplate({
        searchKey,
        companyId: req.body?.companyId,
        workspaceId: req.body?.workspaceId || null,
        companyName: req.body.companyName,
        title: req.body.title,
        subTitle: req.body.subTitle,
        CTAButtonText: req.body.CTAButtonText,
        about: about,
        productTitle: resolvedProductTitle,
        galleryTitle: req.body?.galleryTitle,
        testimonialTitle: req.body.testimonialTitle,
        contactTitle: req.body.contactTitle,
        mapUrl: normalizeMapUrl(req.body.mapUrl),
        email: req.body.websiteEmail,
        phone: req.body.phone,
        address: req.body.address,
        registeredCompanyName:
          resolveUsableCompanyName(
            req.body.registeredCompanyName,
            req.body.companyName,
          ) || req.body.registeredCompanyName,
        copyrightText: req.body.copyrightText,
        socials,
        heroVariant: req.body.heroVariant || "text-image",
        themeVariant: req.body.themeVariant || "default",
        themeId,
        activeSections,
        enabledSections: Array.isArray(enabledSections) ? enabledSections : [],
        sectionOverrides,
        styleConfig,
        pageNavItems: normalizePageNavItems(pageNavItems),
        productDropdownPages: normalizeProductDropdownPages(productDropdownPages),
        inclusions: Array.isArray(inclusions) ? inclusions : (typeof inclusions === "string" ? JSON.parse(inclusions || "[]") : []),
        logoCarousel: {
          enabled: toBool(req.body?.logoCarouselEnabled, false),
          title: String(req.body?.logoCarouselTitle || "").trim(),
          logos: [],
        },
        aboutPageIntro: String(req.body?.aboutPageIntro || "").trim(),
        aboutPageOverview: String(req.body?.aboutPageOverview || "").trim(),
        aboutPageStory: String(req.body?.aboutPageStory || "").trim(),
        aboutPageMission: String(req.body?.aboutPageMission || "").trim(),
        aboutPageVision: String(req.body?.aboutPageVision || "").trim(),
        aboutPageValues: String(req.body?.aboutPageValues || "").trim(),
        aboutPageTeamHeading: String(req.body?.aboutPageTeamHeading || "").trim(),
        galleryPageHeading: String(req.body?.galleryPageHeading || "").trim(),
        testimonialsPageHeading: String(req.body?.testimonialsPageHeading || "").trim(),
        testimonialsPageIntro: String(req.body?.testimonialsPageIntro || "").trim(),
        testimonialsHomePreviewCount: toNum(req.body?.testimonialsHomePreviewCount, 3),
        testimonialsEnableWriteReview: toBool(req.body?.testimonialsEnableWriteReview, true),
        testimonialsSuccessMessage: String(req.body?.testimonialsSuccessMessage || "").trim(),
        contactPageHeading: String(req.body?.contactPageHeading || "").trim(),
        contactPageIntro: String(req.body?.contactPageIntro || "").trim(),
        contactEnableInquiryForm: toBool(req.body?.contactEnableInquiryForm, true),
        contactInquirySuccessMessage: String(req.body?.contactInquirySuccessMessage || "").trim(),
        contactBusinessHours: String(req.body?.contactBusinessHours || "").trim(),
        contactPersonName: String(req.body?.contactPersonName || "").trim(),
        contactPersonRole: String(req.body?.contactPersonRole || "").trim(),
        contactPersonEmail: String(req.body?.contactPersonEmail || "").trim(),
        contactPersonPhone: String(req.body?.contactPersonPhone || "").trim(),
        partnerPageHeading: String(req.body?.partnerPageHeading || "").trim(),
        partnerPageContent: String(req.body?.partnerPageContent || "").trim(),
        partnerFormTitle: String(req.body?.partnerFormTitle || "").trim(),
        careersPageHeading: String(req.body?.careersPageHeading || "").trim(),
        careersPageIntro: String(req.body?.careersPageIntro || "").trim(),
        careersHeroButtonText: String(req.body?.careersHeroButtonText || "").trim(),
        careersClosingHeading: String(req.body?.careersClosingHeading || "").trim(),
        careersClosingText: String(req.body?.careersClosingText || "").trim(),
        careersApplyButtonText: String(req.body?.careersApplyButtonText || "").trim(),
        careersApplyButtonLink: String(req.body?.careersApplyButtonLink || "").trim(),
        careersFormFields: Array.isArray(req.body?.careersFormFields)
          ? JSON.stringify(req.body.careersFormFields)
          : String(req.body?.careersFormFields || "[]").trim(),
        founders: (() => {
          try {
            const raw = typeof req.body?.founders === "string" ? JSON.parse(req.body.founders) : (Array.isArray(req.body?.founders) ? req.body.founders : []);
            return raw.map((f) => ({ name: String(f?.name || "").trim(), role: String(f?.role || "").trim(), bio: String(f?.bio || "").trim(), highlights: String(f?.highlights || "").trim() }));
          } catch { return []; }
        })(),
        isWebsiteTemplate: true,
        isActive: true,
        products: [],
        menuItems: [],
        rooms: [],
        meetingRooms: [],
        coLivingRooms: [],
        packages: [],
        dorms: [],
        testimonials: [],
      });
    } else {
      Object.assign(template, {
        companyId: req.body?.companyId,
        workspaceId: req.body?.workspaceId || null,
        companyName: req.body.companyName,
        title: req.body.title,
        subTitle: req.body.subTitle,
        CTAButtonText: req.body.CTAButtonText,
        about: about,
        productTitle: resolvedProductTitle,
        galleryTitle: req.body?.galleryTitle,
        testimonialTitle: req.body.testimonialTitle,
        contactTitle: req.body.contactTitle,
        mapUrl: normalizeMapUrl(req.body.mapUrl),
        email: req.body.websiteEmail,
        phone: req.body.phone,
        address: req.body.address,
        registeredCompanyName:
          resolveUsableCompanyName(
            req.body.registeredCompanyName,
            req.body.companyName,
          ) || req.body.registeredCompanyName,
        copyrightText: req.body.copyrightText,
        socials,
        heroVariant: req.body.heroVariant || "text-image",
        themeVariant: req.body.themeVariant || "default",
        themeId,
        activeSections,
        enabledSections: Array.isArray(enabledSections) ? enabledSections : [],
        sectionOverrides,
        styleConfig,
        pageNavItems: normalizePageNavItems(pageNavItems),
        productDropdownPages: normalizeProductDropdownPages(productDropdownPages),
        inclusions: Array.isArray(inclusions) ? inclusions : (typeof inclusions === "string" ? JSON.parse(inclusions || "[]") : []),
        logoCarousel: {
          enabled: toBool(req.body?.logoCarouselEnabled, false),
          title: String(req.body?.logoCarouselTitle || "").trim(),
          logos: [],
        },
        aboutPageIntro: String(req.body?.aboutPageIntro || "").trim(),
        aboutPageOverview: String(req.body?.aboutPageOverview || "").trim(),
        aboutPageStory: String(req.body?.aboutPageStory || "").trim(),
        aboutPageMission: String(req.body?.aboutPageMission || "").trim(),
        aboutPageVision: String(req.body?.aboutPageVision || "").trim(),
        aboutPageValues: String(req.body?.aboutPageValues || "").trim(),
        aboutPageTeamHeading: String(req.body?.aboutPageTeamHeading || "").trim(),
        galleryPageHeading: String(req.body?.galleryPageHeading || "").trim(),
        testimonialsPageHeading: String(req.body?.testimonialsPageHeading || "").trim(),
        testimonialsPageIntro: String(req.body?.testimonialsPageIntro || "").trim(),
        testimonialsHomePreviewCount: toNum(req.body?.testimonialsHomePreviewCount, 3),
        testimonialsEnableWriteReview: toBool(req.body?.testimonialsEnableWriteReview, true),
        testimonialsSuccessMessage: String(req.body?.testimonialsSuccessMessage || "").trim(),
        contactPageHeading: String(req.body?.contactPageHeading || "").trim(),
        contactPageIntro: String(req.body?.contactPageIntro || "").trim(),
        contactEnableInquiryForm: toBool(req.body?.contactEnableInquiryForm, true),
        contactInquirySuccessMessage: String(req.body?.contactInquirySuccessMessage || "").trim(),
        contactBusinessHours: String(req.body?.contactBusinessHours || "").trim(),
        contactPersonName: String(req.body?.contactPersonName || "").trim(),
        contactPersonRole: String(req.body?.contactPersonRole || "").trim(),
        contactPersonEmail: String(req.body?.contactPersonEmail || "").trim(),
        contactPersonPhone: String(req.body?.contactPersonPhone || "").trim(),
        partnerPageHeading: String(req.body?.partnerPageHeading || "").trim(),
        partnerPageContent: String(req.body?.partnerPageContent || "").trim(),
        partnerFormTitle: String(req.body?.partnerFormTitle || "").trim(),
        careersPageHeading: String(req.body?.careersPageHeading || "").trim(),
        careersPageIntro: String(req.body?.careersPageIntro || "").trim(),
        careersHeroButtonText: String(req.body?.careersHeroButtonText || "").trim(),
        careersClosingHeading: String(req.body?.careersClosingHeading || "").trim(),
        careersClosingText: String(req.body?.careersClosingText || "").trim(),
        careersApplyButtonText: String(req.body?.careersApplyButtonText || "").trim(),
        careersApplyButtonLink: String(req.body?.careersApplyButtonLink || "").trim(),
        careersFormFields: Array.isArray(req.body?.careersFormFields)
          ? JSON.stringify(req.body.careersFormFields)
          : String(req.body?.careersFormFields || "[]").trim(),
        founders: (() => {
          try {
            const raw = typeof req.body?.founders === "string" ? JSON.parse(req.body.founders) : (Array.isArray(req.body?.founders) ? req.body.founders : []);
            return raw.map((f) => ({ name: String(f?.name || "").trim(), role: String(f?.role || "").trim(), bio: String(f?.bio || "").trim(), highlights: String(f?.highlights || "").trim() }));
          } catch { return []; }
        })(),
        isWebsiteTemplate: true,
        isActive: true,
        products: [],
        menuItems: [],
        rooms: [],
        meetingRooms: [],
        coLivingRooms: [],
        packages: [],
        dorms: [],
        testimonials: [],
      });
    }
    template.isDraft = false;
    template.draftData = null;
    template.draftUpdatedAt = null;
    console.log("CREATING WEBSITE WITH:", {
      vertical: req.body.vertical,
      isActive: true,
      companyName: req.body.companyName,
    });

    const uploadImages = async (files = [], folder) => {
      const arr = [];

      for (const file of files) {
        const buffer = await sharp(file.buffer)
          .webp({ quality: 80 })
          .toBuffer();

        const route = `${folder}/${Date.now()}_${file.originalname.replace(
          /\s+/g,
          "_",
        )}`;
        const data = await uploadFileToS3(route, {
          buffer,
          mimetype: "image/webp",
        });
        arr.push({ url: data.url, id: data.id });
      }
      return arr;
    };

    if (req.body.companyLogo) {
      template.companyLogo = {
        url: req.body.companyLogo.url,
        id: req.body.companyLogo.id,
      };
    }

    if (req.body.heroImages) {
      template.heroImages = req.body.heroImages.map((img) => ({
        url: img.url,
        id: img.id,
      }));
    }

    if (req.body.gallery) {
      template.gallery = req.body.gallery.map((img) => ({
        url: img.url,
        id: img.id,
      }));
    }

    if (req.body.testimonials) {
      const parsedTestimonials = Array.isArray(req.body.testimonials)
        ? req.body.testimonials
        : safeParse(req.body.testimonials, []);

      template.testimonials = parsedTestimonials.map((t) =>
        t?.url ? { url: t.url, id: t.id } : {},
      );
    }

    // Multer.any puts files in req.files (array). Build a quick index by fieldname.
    const filesByField = {};
    for (const f of req.files || []) {
      if (!filesByField[f.fieldname]) filesByField[f.fieldname] = [];
      filesByField[f.fieldname].push(f);
    }

    // IMAGE LIMIT VALIDATION (same rules as editTemplate)

    const heroFiles = filesByField.heroImages || [];
    const galleryFiles = filesByField.gallery || [];
    const logoFiles = filesByField.companyLogo || [];

    // Company Logo: max 1
    if (logoFiles.length > 1) {
      return res.status(400).json({
        message: "Only one company logo is allowed.",
      });
    }

    // Hero Images: max 5
    if (heroFiles.length > 5) {
      return res.status(400).json({
        message: `Cannot exceed 5 hero images (received ${heroFiles.length}).`,
      });
    }

    // Product images: max 10 per product
    for (let i = 0; i < products.length; i++) {
      const pFiles = filesByField[`productImages_${i}`] || [];
      if (pFiles.length > 10) {
        return res.status(400).json({
          message: `Max 10 images allowed per product (${
            products[i].name || "Unnamed product"
          }).`,
        });
      }
    }

    const allowProductFallback = products.length === 0;

    for (let i = 0; i < rooms.length; i++) {
      const roomFiles = filesByField[`roomImages_${i}`] || (allowProductFallback ? filesByField[`productImages_${i}`] || [] : []);
      if (roomFiles.length > 10) {
        return res.status(400).json({
          message: `Max 10 images allowed per room (${rooms[i].title || "Room"}).`,
        });
      }
    }

    for (let i = 0; i < meetingRooms.length; i++) {
      const meetingRoomFiles =
        filesByField[`meetingRoomImages_${i}`] || (allowProductFallback ? filesByField[`productImages_${i}`] || [] : []);
      if (meetingRoomFiles.length > 10) {
        return res.status(400).json({
          message: `Max 10 images allowed per meeting room (${meetingRooms[i].title || "Room"}).`,
        });
      }
    }

    for (let i = 0; i < coLivingRooms.length; i++) {
      const coLivingFiles = filesByField[`coLivingRoomImages_${i}`] || [];
      if (coLivingFiles.length > 10) {
        return res.status(400).json({
          message: `Max 10 images allowed per co-living room (${coLivingRooms[i].title || "Room"}).`,
        });
      }
    }

    for (let i = 0; i < packages.length; i++) {
      const packageFiles = filesByField[`packageImages_${i}`] || (allowProductFallback ? filesByField[`productImages_${i}`] || [] : []);
      if (packageFiles.length > 10) {
        return res.status(400).json({
          message: `Max 10 images allowed per package (${packages[i].title || "Package"}).`,
        });
      }
    }

    for (let i = 0; i < dorms.length; i++) {
      const dormFiles = filesByField[`dormImages_${i}`] || (allowProductFallback ? filesByField[`productImages_${i}`] || [] : []);
      if (dormFiles.length > 10) {
        return res.status(400).json({
          message: `Max 10 images allowed per dorm (${dorms[i].title || "Dorm"}).`,
        });
      }
    }

    // Gallery: max 40
    if (galleryFiles.length > 40) {
      return res.status(400).json({
        message: `Cannot exceed 40 gallery images (received ${galleryFiles.length}).`,
      });
    }

    // Testimonials: max 1 image per testimonial
    for (let i = 0; i < testimonials.length; i++) {
      const tFiles = filesByField[`testimonialImages_${i}`] || [];
      if (tFiles.length > 1) {
        return res.status(400).json({
          message: "Only 1 image allowed per testimonial.",
        });
      }
    }

    // companyLogo
    // companyLogo (ensure it's a single file)
    if (filesByField.companyLogo && filesByField.companyLogo[0]) {
      const logoFile = filesByField.companyLogo[0];
      const buffer = await sharp(logoFile.buffer)
        .webp({ quality: 80 })
        .toBuffer();
      const route = `${baseFolder}/companyLogo/${Date.now()}_${
        logoFile.originalname
      }`;
      const data = await uploadFileToS3(route, {
        buffer,
        mimetype: "image/webp",
      });
      template.companyLogo = { id: data.id, url: data.url };
    }

    // careersHeroImage (single file)
    if (filesByField.careersHeroImage && filesByField.careersHeroImage[0]) {
      const uploaded = await uploadImages(
        [filesByField.careersHeroImage[0]],
        `${baseFolder}/careersHeroImage`,
      );
      template.careersHeroImage = uploaded[0] || template.careersHeroImage;
    }

    // heroImages
    if (filesByField.heroImages?.length) {
      template.heroImages = await uploadImages(
        filesByField.heroImages,
        `${baseFolder}/heroImages`,
      );
    }

    // gallery
    if (filesByField.gallery?.length) {
      template.gallery = await uploadImages(
        filesByField.gallery,
        `${baseFolder}/gallery`,
      );
    }

    if (filesByField.aboutPageImages?.length) {
      template.aboutPageImages = await uploadImages(
        filesByField.aboutPageImages,
        `${baseFolder}/aboutPageImages`,
      );
    }

    const normalizedAboutCards = Array.isArray(aboutPageImageCards)
      ? aboutPageImageCards.map((card) => ({
          title: String(card?.title || "").trim(),
          description: String(card?.description || "").trim(),
        }))
      : [];
    for (let i = 0; i < normalizedAboutCards.length; i++) {
      const cardFiles = filesByField[`aboutPageImageCardImage_${i}`] || [];
      if (cardFiles.length > 0) {
        const uploaded = await uploadImages(
          [cardFiles[0]],
          `${baseFolder}/aboutPageImageCards/${i}`,
        );
        normalizedAboutCards[i].image = uploaded[0] || normalizedAboutCards[i].image;
      }
    }
    if (normalizedAboutCards.length) {
      template.aboutPageImageCards = normalizedAboutCards;
      if (!Array.isArray(template.aboutPageImages) || template.aboutPageImages.length === 0) {
        template.aboutPageImages = normalizedAboutCards
          .map((card) => card.image)
          .filter(Boolean);
      }
    }

    const normalizedProductPages = normalizeProductDropdownPages(productDropdownPages);
    for (let i = 0; i < normalizedProductPages.length; i++) {
      const singleHeroFile = (filesByField[`productPageHeroImage_${i}`] || [])[0];
      if (singleHeroFile) {
        const uploaded = await uploadImages(
          [singleHeroFile],
          `${baseFolder}/productPageHeroImage/${i}`,
        );
        normalizedProductPages[i].heroImage = uploaded[0] || undefined;
      }
      const heroCarouselFiles = filesByField[`productPageHeroImages_${i}`] || [];
      if (heroCarouselFiles.length) {
        normalizedProductPages[i].heroImages = await uploadImages(
          heroCarouselFiles.slice(0, 5),
          `${baseFolder}/productPageHeroImages/${i}`,
        );
      } else {
        normalizedProductPages[i].heroImages = [];
      }
      const homeCardFile = (filesByField[`productPageHomeCardImage_${i}`] || [])[0];
      if (homeCardFile) {
        const uploaded = await uploadImages(
          [homeCardFile],
          `${baseFolder}/productPageHomeCardImage/${i}`,
        );
        normalizedProductPages[i].homeCardImage = uploaded[0] || undefined;
      }
    }
    if (normalizedProductPages.length) {
      template.productDropdownPages = normalizedProductPages;
    }

    if (Array.isArray(products) && products.length) {
      for (let i = 0; i < products.length; i++) {
        const p = products[i] || {};
        const pFiles = filesByField[`productImages_${i}`] || [];
        const uploaded = await uploadImages(
          pFiles,
          `${baseFolder}/productImages/${i}`,
        );

        template.products.push({
          type: p.type,
          name: p.name,
          cost: p.cost,
          description: p.description,
          images: uploaded,
        });
      }
    }

    if (Array.isArray(menuItems) && menuItems.length) {
      for (let i = 0; i < menuItems.length; i++) {
        const item = menuItems[i] || {};
        const imageFile = (filesByField[`menuItemImages_${i}`] || (allowProductFallback ? filesByField[`productImages_${i}`] || [] : []))[0];
        let uploadedImage;
        if (imageFile) {
          const uploaded = await uploadImages(
            [imageFile],
            `${baseFolder}/menuItems/${i}`,
          );
          uploadedImage = uploaded[0];
        }
        const menuItemRecord = {
          category: item.category || "",
          name: item.name || "",
          description: item.description || "",
          price: item.price || "",
        };
        if (uploadedImage) menuItemRecord.image = uploadedImage;
        template.menuItems.push(menuItemRecord);
      }
    }

    if (Array.isArray(rooms) && rooms.length) {
      for (let i = 0; i < rooms.length; i++) {
        const item = rooms[i] || {};
        const uploaded = await uploadImages(
          filesByField[`roomImages_${i}`] || (allowProductFallback ? filesByField[`productImages_${i}`] || [] : []),
          `${baseFolder}/rooms/${i}`,
        );
        template.rooms.push({
          title: item.title || "",
          description: item.description || "",
          price: item.price || "",
          images: uploaded,
        });
      }
    }

    if (Array.isArray(meetingRooms) && meetingRooms.length) {
      for (let i = 0; i < meetingRooms.length; i++) {
        const item = meetingRooms[i] || {};
        const uploaded = await uploadImages(
          filesByField[`meetingRoomImages_${i}`] || (allowProductFallback ? filesByField[`productImages_${i}`] || [] : []),
          `${baseFolder}/meetingRooms/${i}`,
        );
        template.meetingRooms.push({
          title: item.title || "",
          description: item.description || "",
          price: item.price || "",
          images: uploaded,
        });
      }
    }

    if (Array.isArray(coLivingRooms) && coLivingRooms.length) {
      for (let i = 0; i < coLivingRooms.length; i++) {
        const item = coLivingRooms[i] || {};
        const uploaded = await uploadImages(
          filesByField[`coLivingRoomImages_${i}`] || [],
          `${baseFolder}/coLivingRooms/${i}`,
        );
        template.coLivingRooms.push({
          title: item.title || "",
          description: item.description || "",
          price: item.price || "",
          images: uploaded,
        });
      }
    }

    if (Array.isArray(packages) && packages.length) {
      for (let i = 0; i < packages.length; i++) {
        const item = packages[i] || {};
        const uploaded = await uploadImages(
          filesByField[`packageImages_${i}`] || (allowProductFallback ? filesByField[`productImages_${i}`] || [] : []),
          `${baseFolder}/packages/${i}`,
        );
        template.packages.push({
          title: item.title || "",
          description: item.description || "",
          price: item.price || "",
          duration: item.duration || "",
          images: uploaded,
        });
      }
    }

    if (Array.isArray(dorms) && dorms.length) {
      for (let i = 0; i < dorms.length; i++) {
        const item = dorms[i] || {};
        const uploaded = await uploadImages(
          filesByField[`dormImages_${i}`] || (allowProductFallback ? filesByField[`productImages_${i}`] || [] : []),
          `${baseFolder}/dorms/${i}`,
        );
        template.dorms.push({
          title: item.title || "",
          description: item.description || "",
          capacity: Number(item.capacity) || 0,
          price: item.price || "",
          images: uploaded,
        });
      }
    }

    // TESTIMONIALS: objects + flat testimonialImages array (zip by index)
    let tUploads = [];
    if (filesByField.testimonialImages?.length) {
      // Preferred new path: single field 'testimonialImages' with N files in order
      tUploads = await uploadImages(
        filesByField.testimonialImages,
        `${baseFolder}/testimonialImages`,
      );
    } else {
      // Back-compat: testimonialImages_${i}
      for (let i = 0; i < testimonials.length; i++) {
        const tFiles = filesByField[`testimonialImages_${i}`] || [];
        const uploaded = await uploadImages(
          tFiles,
          `${baseFolder}/testimonialImages/${i}`,
        );
        tUploads[i] = uploaded[0]; // one file per testimonial
      }
    }

    // FOUNDER IMAGES
    if (Array.isArray(template.founders)) {
      for (let i = 0; i < template.founders.length; i++) {
        const founderFile = (filesByField[`founderImage_${i}`] || [])[0];
        if (founderFile) {
          const uploaded = await uploadImages([founderFile], `${baseFolder}/founders/${i}`);
          template.founders[i] = { ...(template.founders[i] || {}), image: uploaded[0] || template.founders[i]?.image };
        }
      }
    }

    // template.testimonials = (testimonials || []).map((t, i) => ({
    template.testimonials = (
      Array.isArray(testimonials) ? testimonials : []
    ).map((t, i) => ({
      image: tUploads[i], // may be undefined if fewer images provided
      name: t.name,
      jobPosition: t.jobPosition,
      testimony: t.testimony,
      rating: t.rating,
    }));

    const templateSnapshot = template.toObject({
      depopulate: true,
      versionKey: true,
    });
    delete templateSnapshot.__v;
    const latestTemplate = await WebsiteTemplate.findById(template._id).exec();
    if (latestTemplate) {
      latestTemplate.set(templateSnapshot);
      template = latestTemplate;
    }

    const savedTemplate = await template.save();

    if (!savedTemplate) {
      return res.status(400).json({ message: "Failed to create template" });
    }

    if (source !== "Nomad") {
      const derivedBusinessType = businessTypeLabelByVertical[vertical] || "Co-Working";
      const normalizedIndustry = [derivedBusinessType].filter(Boolean).join(", ");

      const updateHostCompany = await HostCompany.findOneAndUpdate(
        {
          $or: [
            { companyId: req.body.companyId },
            { companyName: new RegExp(`^${String(req.body.companyName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          ],
        },
        {
          $set: {
            isWebsiteTemplate: true,
            vertical,
            industry: normalizedIndustry,
          },
          $addToSet: {
            businessTypes: derivedBusinessType,
          },
        },
      );

      if (!updateHostCompany) {
        return res.status(400).json({ message: "Company not found" });
      }

      // Fire-and-forget: these external Nomads API calls must NOT block the response.
      // Previously awaited, causing 10-25s hangs when the Nomads API was slow or down.
      void ensureNomadsCompanyRecord({
        template: savedTemplate,
        hostCompany: updateHostCompany,
        companyId: req.body.companyId,
        companyName: req.body.companyName,
        vertical,
      }).catch(() => {});

      void axios.patch(
        "https://wononomadsbe.vercel.app/api/company/add-template-link",
        {
          companyName: req.body.companyName,
          link: `https://${savedTemplate.searchKey}.wono.co/`,
        },
      ).catch(() => {});
    }

    // First-time website creation is FREE â€” no credit deduction.
    // Credits are only deducted on edit (PATCH /edit-website), which goes through
    // the checkAndDeductCredit middleware and deductWorkspaceCreditOnSuccess in editTemplate.

    return res
      .status(201)
      .json({ message: "Template created", template: serializeWebsiteTemplateForClient(savedTemplate) });
  } catch (error) {
    next(error);
  }
};

export const getTemplate = async (req, res) => {
  try {
    const { companyName } = req.params;
    const vertical = req.query?.vertical || req.query?.verticalType;

    const formatCompanyName = (name) => {
      if (!name) return "";
      return name.toLowerCase().split("-")[0].replace(/\s+/g, "");
    };

    const searchKey = formatCompanyName(companyName);

    const template = await WebsiteTemplate.findOne(
      buildTemplateLookupByCompanyAndVertical(searchKey, vertical),
    );

    if (!template) {
      return res.status(200).json([]);
    }
    res.json(serializeWebsiteTemplateForClient(template));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getInActiveTemplate = async (req, res) => {
  try {
    const { company } = req.params;
    const vertical = req.query?.vertical || req.query?.verticalType;

    const template = await WebsiteTemplate.findOne({
      ...buildTemplateLookupByCompanyAndVertical(company, vertical),
      isActive: false,
    });

    if (!template) {
      return res.status(200).json([]);
    }
    res.json(serializeWebsiteTemplateForClient(template));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTemplates = async (req, res) => {
  try {
    const { companyId, companyName, businessName } = req.query;
    const requestedVertical = req.query?.vertical || req.query?.verticalType;
    const hasRequestedVertical =
      typeof requestedVertical === "string" &&
      String(requestedVertical).trim().length > 0;
    const normalizedRequestedVertical = hasRequestedVertical
      ? normalizeVertical(requestedVertical)
      : null;
    const workspaceId = String(req.query?.workspaceId || "").trim();
    const normalizedCompanyId = String(companyId || "").trim();
    const normalizedBusinessName = String(businessName || "").trim();
    const normalizedCompanyName = String(companyName || "").trim();

    const candidates = [];
    const seenIds = new Set();
    const appendUnique = (items = []) => {
      for (const item of items) {
        const id = String(item?._id || "");
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);
        candidates.push(item);
      }
    };

    if (workspaceId) {
      appendUnique(
        await WebsiteTemplate.find({ isActive: true, workspaceId }).lean().exec(),
      );
    }

    if (normalizedCompanyId) {
      appendUnique(
        await WebsiteTemplate.find({
          isActive: true,
          companyId: normalizedCompanyId,
        }).lean().exec(),
      );
    }

    if (normalizedBusinessName) {
      const safeBusiness = escapeRegex(normalizedBusinessName);
      appendUnique(
        await WebsiteTemplate.find({
          isActive: true,
          $or: [
            { companyName: { $regex: new RegExp(`^${safeBusiness}$`, "i") } },
            { searchKey: normalizeSearchKeyFromName(normalizedBusinessName) },
          ],
        }).lean().exec(),
      );
    }

    if (normalizedCompanyName) {
      const safeCompany = escapeRegex(normalizedCompanyName);
      appendUnique(
        await WebsiteTemplate.find({
          isActive: true,
          $or: [
            { companyName: { $regex: new RegExp(`^${safeCompany}$`, "i") } },
            { searchKey: normalizeSearchKeyFromName(normalizedCompanyName) },
          ],
        }).lean().exec(),
      );
    }

    if (!candidates.length) {
      appendUnique(await WebsiteTemplate.find({ isActive: true }).lean().exec());
    }

    if (!candidates.length) {
      return res.status(200).json([]);
    }

    let sanitizedTemplates = candidates.map((template) => {
      return serializeWebsiteTemplateForClient(template);
    });

    if (normalizedRequestedVertical) {
      sanitizedTemplates = sanitizedTemplates.filter(
        (template) => !template?.vertical || normalizeVertical(template?.vertical) === normalizedRequestedVertical,
      );
    }

    res.json(sanitizedTemplates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getInActiveTemplates = async (req, res) => {
  try {
    const templates = await WebsiteTemplate.find({ isActive: false });

    if (!templates.length) {
      return res.status(200).json([]);
    }

    res.json(templates.map((template) => serializeWebsiteTemplateForClient(template)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const activateTemplate = async (req, res) => {
  try {
    const { searchKey } = req.query;
    const template = await WebsiteTemplate.findOneAndUpdate(
      {
        searchKey,
      },
      {
        isActive: true,
      },
    );

    if (!template) {
      return res.status(400).json({ message: "Failed to activate website" });
    }

    return res.status(200).json({ message: "Website activated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const editTemplate = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let {
      products,
      menuItems,
      rooms,
      meetingRooms,
      coLivingRooms,
      packages,
      dorms,
      testimonials,
      about,
      pageNavItems,
      productDropdownPages,
      aboutPageImageCards,
      enabledSections,
      sectionOverrides,
      styleConfig,
      companyName,
      inclusions,
      socials,
    } = req.body;

    const safeParse = (val, fallback) => {
      try {
        return typeof val === "string" ? JSON.parse(val) : val || fallback;
      } catch {
        return fallback;
      }
    };

    about = safeParse(about, []);
    products = safeParse(products, []);
    menuItems = safeParse(menuItems, []);
    rooms = safeParse(rooms, []);
    meetingRooms = safeParse(meetingRooms, []);
    coLivingRooms = safeParse(coLivingRooms, []);
    packages = safeParse(packages, []);
    dorms = safeParse(dorms, []);
    testimonials = safeParse(testimonials, []);
    pageNavItems = safeParse(pageNavItems, null);
    productDropdownPages = safeParse(productDropdownPages, null);
    aboutPageImageCards = safeParse(aboutPageImageCards, null);
    enabledSections = safeParse(enabledSections, null);
    sectionOverrides = safeParse(sectionOverrides, null);
    styleConfig = safeParse(styleConfig, null);
    socials = socials === undefined ? null : normalizeSocials(safeParse(socials, {}));
    const parsedInclusions = safeParse(inclusions, null);

    const formatCompanyName = (name) =>
      (name || "").toLowerCase().split("-")[0].replace(/\s+/g, "");
    const bodySearchKey = String(req.body?.searchKey || "").trim().toLowerCase();
    const searchKey = bodySearchKey || formatCompanyName(companyName);
    const baseFolder = `hosts/template/${searchKey}`;
    const hasVerticalInBody =
      Object.prototype.hasOwnProperty.call(req.body, "vertical") ||
      Object.prototype.hasOwnProperty.call(req.body, "verticalType");
    const normalizedVertical = hasVerticalInBody
      ? normalizeVertical(req.body.vertical ?? req.body.verticalType)
      : null;
    const derivedThemeId = normalizedVertical
      ? VERTICAL_CONFIG?.[normalizedVertical]?.themeId
      : null;
    const derivedActiveSections = normalizedVertical
      ? VERTICAL_CONFIG?.[normalizedVertical]?.sections
      : null;

    const TEXT_LIMITS = {
      title: 120,
      subTitle: 200,
      CTAButtonText: 50,
      productTitle: 120,
      galleryTitle: 120,
      testimonialTitle: 120,
      contactTitle: 120,
      mapUrl: 2048,
      email: 254,
      phone: 30,
      address: 200,
      registeredCompanyName: 150,
      copyrightText: 200,
      aboutItem: 500,
      productType: 50,
      productName: 120,
      productCost: 50,
      productDescription: 500,
      testimonialName: 120,
      testimonialJob: 120,
      testimonialText: 500,
    };

    const enforceMaxLength = (label, value, max) => {
      if (typeof value === "string" && value.length > max) {
        throw new Error(`${label} cannot exceed ${max} characters.`);
      }
    };

    const validateTextFields = () => {
      const fieldLimits = [
        ["Title", req.body.title, TEXT_LIMITS.title],
        ["Subtitle", req.body.subTitle, TEXT_LIMITS.subTitle],
        ["CTA button text", req.body.CTAButtonText, TEXT_LIMITS.CTAButtonText],
        ["Product title", req.body.productTitle, TEXT_LIMITS.productTitle],
        ["Gallery title", req.body.galleryTitle, TEXT_LIMITS.galleryTitle],
        [
          "Testimonial title",
          req.body.testimonialTitle,
          TEXT_LIMITS.testimonialTitle,
        ],
        ["Contact title", req.body.contactTitle, TEXT_LIMITS.contactTitle],
        ["Map URL", req.body.mapUrl, TEXT_LIMITS.mapUrl],
        ["Email", req.body.email, TEXT_LIMITS.email],
        ["Phone", req.body.phone, TEXT_LIMITS.phone],
        ["Address", req.body.address, TEXT_LIMITS.address],
        [
          "Registered company name",
          req.body.registeredCompanyName,
          TEXT_LIMITS.registeredCompanyName,
        ],
        ["Copyright text", req.body.copyrightText, TEXT_LIMITS.copyrightText],
      ];

      fieldLimits.forEach(([label, value, max]) => {
        enforceMaxLength(label, value, max);
      });

      if (Array.isArray(about)) {
        about.forEach((item, index) => {
          enforceMaxLength(
            `About item ${index + 1}`,
            item,
            TEXT_LIMITS.aboutItem,
          );
        });
      }

      if (Array.isArray(products)) {
        products.forEach((product, index) => {
          enforceMaxLength(
            `Product ${index + 1} type`,
            product?.type,
            TEXT_LIMITS.productType,
          );
          enforceMaxLength(
            `Product ${index + 1} name`,
            product?.name,
            TEXT_LIMITS.productName,
          );
          enforceMaxLength(
            `Product ${index + 1} cost`,
            product?.cost,
            TEXT_LIMITS.productCost,
          );
          enforceMaxLength(
            `Product ${index + 1} description`,
            product?.description,
            TEXT_LIMITS.productDescription,
          );
        });
      }

      if (Array.isArray(testimonials)) {
        testimonials.forEach((testimonial, index) => {
          enforceMaxLength(
            `Testimonial ${index + 1} name`,
            testimonial?.name,
            TEXT_LIMITS.testimonialName,
          );
          enforceMaxLength(
            `Testimonial ${index + 1} job position`,
            testimonial?.jobPosition,
            TEXT_LIMITS.testimonialJob,
          );
          enforceMaxLength(
            `Testimonial ${index + 1} testimony`,
            testimonial?.testimony,
            TEXT_LIMITS.testimonialText,
          );
        });
      }
    };

    validateTextFields();

    const template = await WebsiteTemplate.findOne(
      buildTemplateLookupByCompanyAndVertical(
        searchKey,
        normalizedVertical || req.body?.vertical || req.body?.verticalType,
      ),
    ).session(session);
    if (!template) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Template not found" });
    }

    const uploadImages = async (files = [], folder, limit = Infinity) => {
      if (files.length > limit) {
        throw new Error(`Too many images for ${folder}. Max allowed: ${limit}`);
      }

      const arr = [];
      for (const file of files.slice(0, limit)) {
        const buffer = await sharp(file.buffer)
          .webp({ quality: 80 })
          .toBuffer();
        const route = `${folder}/${Date.now()}_${file.originalname.replace(
          /\s+/g,
          "_",
        )}`;
        const data = await uploadFileToS3(route, {
          buffer,
          mimetype: "image/webp",
        });
        arr.push({ id: data.id, url: data.url });
      }
      return arr;
    };

    const deleteImagesFromS3 = async (images = []) => {
      await Promise.all(
        images.map(async (img) => {
          if (img?.url) {
            try {
              await deleteFileFromS3ByUrl(img.url);
            } catch (err) {
              console.error(`Failed to delete ${img.url}:`, err);
            }
          }
        }),
      );
    };

    const filesByField = {};
    for (const f of req.files || []) (filesByField[f.fieldname] ||= []).push(f);

    Object.assign(template, {
      workspaceId: req.body?.workspaceId ?? template.workspaceId ?? null,
      companyName:
        resolveUsableCompanyName(
          req.body.companyName,
          req.body.registeredCompanyName,
          template.companyName,
        ) || template.companyName,
      title: req.body.title ?? template.title,
      subTitle: req.body.subTitle ?? template.subTitle,
      CTAButtonText: req.body.CTAButtonText ?? template.CTAButtonText,
      about: Array.isArray(about) ? about : template.about,
      productTitle:
        String(req.body?.productTitle || "").trim() ||
        sectionTitleByVertical[String(normalizedVertical || "").trim()] ||
        template.productTitle,
      galleryTitle: req.body.galleryTitle ?? template.galleryTitle,
      testimonialTitle: req.body.testimonialTitle ?? template.testimonialTitle,
      contactTitle: req.body.contactTitle ?? template.contactTitle,
      mapUrl:
        req.body.mapUrl !== undefined
          ? normalizeMapUrl(req.body.mapUrl)
          : template.mapUrl,
      email: req.body.email ?? template.email,
      phone: req.body.phone ?? template.phone,
      address: req.body.address ?? template.address,
      registeredCompanyName:
        resolveUsableCompanyName(
          req.body.registeredCompanyName,
          req.body.companyName,
          template.registeredCompanyName,
          template.companyName,
        ) || template.registeredCompanyName,
      copyrightText: req.body.copyrightText ?? template.copyrightText,
      socials: socials === null ? template.socials : socials,
      heroVariant: req.body.heroVariant ?? template.heroVariant ?? "text-image",
      themeVariant: req.body.themeVariant ?? template.themeVariant ?? "default",
      enabledSections:
        enabledSections === null
          ? template.enabledSections
          : Array.isArray(enabledSections)
            ? enabledSections
            : template.enabledSections,
      sectionOverrides:
        sectionOverrides === null ? template.sectionOverrides : sectionOverrides,
      styleConfig: styleConfig === null ? template.styleConfig : styleConfig,
      pageNavItems:
        pageNavItems === null
          ? template.pageNavItems
          : normalizePageNavItems(pageNavItems),
      productDropdownPages:
        productDropdownPages === null
          ? template.productDropdownPages
          : normalizeProductDropdownPages(productDropdownPages),
      inclusions:
        parsedInclusions === null ? template.inclusions : parsedInclusions,
      faqs: req.body?.faqs !== undefined
        ? (Array.isArray(req.body.faqs) ? req.body.faqs : (typeof req.body.faqs === "string" ? JSON.parse(req.body.faqs || "[]") : []))
        : template.faqs,
      logoCarousel: {
        enabled: req.body?.logoCarouselEnabled !== undefined
          ? toBool(req.body.logoCarouselEnabled, false)
          : template.logoCarousel?.enabled ?? false,
        title: req.body?.logoCarouselTitle !== undefined
          ? String(req.body.logoCarouselTitle || "").trim()
          : template.logoCarousel?.title ?? "",
        logos: Array.isArray(template.logoCarousel?.logos) ? template.logoCarousel.logos : [],
      },
      aboutPageIntro:
        req.body?.aboutPageIntro !== undefined
          ? String(req.body.aboutPageIntro || "").trim()
          : template.aboutPageIntro,
      aboutPageOverview:
        req.body?.aboutPageOverview !== undefined
          ? String(req.body.aboutPageOverview || "").trim()
          : template.aboutPageOverview,
      aboutPageStory:
        req.body?.aboutPageStory !== undefined
          ? String(req.body.aboutPageStory || "").trim()
          : template.aboutPageStory,
      aboutPageMission:
        req.body?.aboutPageMission !== undefined
          ? String(req.body.aboutPageMission || "").trim()
          : template.aboutPageMission,
      aboutPageVision:
        req.body?.aboutPageVision !== undefined
          ? String(req.body.aboutPageVision || "").trim()
          : template.aboutPageVision,
      aboutPageValues:
        req.body?.aboutPageValues !== undefined
          ? String(req.body.aboutPageValues || "").trim()
          : template.aboutPageValues,
      aboutPageTeamHeading:
        req.body?.aboutPageTeamHeading !== undefined
          ? String(req.body.aboutPageTeamHeading || "").trim()
          : template.aboutPageTeamHeading,
      galleryPageHeading:
        req.body?.galleryPageHeading !== undefined
          ? String(req.body.galleryPageHeading || "").trim()
          : template.galleryPageHeading,
      testimonialsPageHeading:
        req.body?.testimonialsPageHeading !== undefined
          ? String(req.body.testimonialsPageHeading || "").trim()
          : template.testimonialsPageHeading,
      testimonialsPageIntro:
        req.body?.testimonialsPageIntro !== undefined
          ? String(req.body.testimonialsPageIntro || "").trim()
          : template.testimonialsPageIntro,
      testimonialsHomePreviewCount:
        req.body?.testimonialsHomePreviewCount !== undefined
          ? toNum(req.body.testimonialsHomePreviewCount, 3)
          : template.testimonialsHomePreviewCount,
      testimonialsEnableWriteReview:
        req.body?.testimonialsEnableWriteReview !== undefined
          ? toBool(req.body.testimonialsEnableWriteReview, true)
          : template.testimonialsEnableWriteReview,
      testimonialsSuccessMessage:
        req.body?.testimonialsSuccessMessage !== undefined
          ? String(req.body.testimonialsSuccessMessage || "").trim()
          : template.testimonialsSuccessMessage,
      contactPageHeading:
        req.body?.contactPageHeading !== undefined
          ? String(req.body.contactPageHeading || "").trim()
          : template.contactPageHeading,
      contactPageIntro:
        req.body?.contactPageIntro !== undefined
          ? String(req.body.contactPageIntro || "").trim()
          : template.contactPageIntro,
      contactEnableInquiryForm:
        req.body?.contactEnableInquiryForm !== undefined
          ? toBool(req.body.contactEnableInquiryForm, true)
          : template.contactEnableInquiryForm,
      contactInquirySuccessMessage:
        req.body?.contactInquirySuccessMessage !== undefined
          ? String(req.body.contactInquirySuccessMessage || "").trim()
          : template.contactInquirySuccessMessage,
      contactBusinessHours:
        req.body?.contactBusinessHours !== undefined
          ? String(req.body.contactBusinessHours || "").trim()
          : template.contactBusinessHours,
      contactPersonName:
        req.body?.contactPersonName !== undefined
          ? String(req.body.contactPersonName || "").trim()
          : template.contactPersonName,
      contactPersonRole:
        req.body?.contactPersonRole !== undefined
          ? String(req.body.contactPersonRole || "").trim()
          : template.contactPersonRole,
      contactPersonEmail:
        req.body?.contactPersonEmail !== undefined
          ? String(req.body.contactPersonEmail || "").trim()
          : template.contactPersonEmail,
      contactPersonPhone:
        req.body?.contactPersonPhone !== undefined
          ? String(req.body.contactPersonPhone || "").trim()
          : template.contactPersonPhone,
      partnerPageHeading:
        req.body?.partnerPageHeading !== undefined
          ? String(req.body.partnerPageHeading || "").trim()
          : template.partnerPageHeading,
      partnerPageContent:
        req.body?.partnerPageContent !== undefined
          ? String(req.body.partnerPageContent || "").trim()
          : template.partnerPageContent,
      partnerFormTitle:
        req.body?.partnerFormTitle !== undefined
          ? String(req.body.partnerFormTitle || "").trim()
          : template.partnerFormTitle,
      careersPageHeading:
        req.body?.careersPageHeading !== undefined
          ? String(req.body.careersPageHeading || "").trim()
          : template.careersPageHeading,
      careersPageIntro:
        req.body?.careersPageIntro !== undefined
          ? String(req.body.careersPageIntro || "").trim()
          : template.careersPageIntro,
      careersHeroButtonText:
        req.body?.careersHeroButtonText !== undefined
          ? String(req.body.careersHeroButtonText || "").trim()
          : template.careersHeroButtonText,
      careersClosingHeading:
        req.body?.careersClosingHeading !== undefined
          ? String(req.body.careersClosingHeading || "").trim()
          : template.careersClosingHeading,
      careersClosingText:
        req.body?.careersClosingText !== undefined
          ? String(req.body.careersClosingText || "").trim()
          : template.careersClosingText,
      careersApplyButtonText:
        req.body?.careersApplyButtonText !== undefined
          ? String(req.body.careersApplyButtonText || "").trim()
          : template.careersApplyButtonText,
      careersApplyButtonLink:
        req.body?.careersApplyButtonLink !== undefined
          ? String(req.body.careersApplyButtonLink || "").trim()
          : template.careersApplyButtonLink,
      careersFormFields:
        req.body?.careersFormFields !== undefined
          ? Array.isArray(req.body.careersFormFields)
            ? JSON.stringify(req.body.careersFormFields)
            : String(req.body.careersFormFields || "[]").trim()
          : template.careersFormFields,
      founders: (() => {
        if (req.body?.founders === undefined) return template.founders;
        try {
          const raw = typeof req.body.founders === "string" ? JSON.parse(req.body.founders) : (Array.isArray(req.body.founders) ? req.body.founders : []);
          return raw.map((f, i) => ({
            name: String(f?.name || "").trim(),
            role: String(f?.role || "").trim(),
            bio: String(f?.bio || "").trim(),
            highlights: String(f?.highlights || "").trim(),
            image: template.founders?.[i]?.image || undefined,
          }));
        } catch { return template.founders; }
      })(),
      menuItems:
        String(normalizedVertical || template?.vertical || "").trim() === "cafe"
          ? template.menuItems
          : Array.isArray(menuItems)
            ? menuItems
            : template.menuItems,
      rooms: Array.isArray(rooms) ? rooms : template.rooms,
      meetingRooms: Array.isArray(meetingRooms)
        ? meetingRooms
        : Array.isArray(rooms)
          ? rooms
          : template.meetingRooms,
      coLivingRooms: Array.isArray(coLivingRooms)
        ? coLivingRooms
        : template.coLivingRooms,
      packages: Array.isArray(packages) ? packages : template.packages,
      dorms: Array.isArray(dorms) ? dorms : template.dorms,
    });
    template.isDraft = false;
    template.draftData = null;
    template.draftUpdatedAt = null;

    if (hasVerticalInBody && normalizedVertical) {
      template.themeId =
        derivedThemeId && THEME_TOKENS?.[derivedThemeId]
          ? derivedThemeId
          : "co-working-default";
      template.activeSections = Array.isArray(derivedActiveSections)
        ? derivedActiveSections
        : template.activeSections;
    }

    // === ðŸ¢ COMPANY LOGO (limit 1) ===
    if (filesByField.companyLogo?.length) {
      if (filesByField.companyLogo.length > 1) {
        throw new Error("Only one company logo is allowed.");
      }
      if (template.companyLogo?.url)
        await deleteImagesFromS3([template.companyLogo]);
      const uploaded = await uploadImages(
        [filesByField.companyLogo[0]],
        `${baseFolder}/companyLogo`,
        1,
      );
      template.companyLogo = uploaded[0];
    }

    // === CAREERS HERO IMAGE (limit 1) ===
    if (filesByField.careersHeroImage?.length) {
      if (filesByField.careersHeroImage.length > 1) {
        throw new Error("Only one careers hero image is allowed.");
      }
      if (template.careersHeroImage?.url)
        await deleteImagesFromS3([template.careersHeroImage]);
      const uploaded = await uploadImages(
        [filesByField.careersHeroImage[0]],
        `${baseFolder}/careersHeroImage`,
        1,
      );
      template.careersHeroImage = uploaded[0];
    }

    // === ðŸ–¼ HERO IMAGES (max 5 total) ===
    const heroKeepIds = safeParse(req.body.heroImageIds, []);

    if (req.body.heroImageIds !== undefined) {
      const toDelete = template.heroImages.filter(
        (img) => !heroKeepIds.includes(img.id),
      );
      await deleteImagesFromS3(toDelete);
      template.heroImages = template.heroImages.filter((img) =>
        heroKeepIds.includes(img.id),
      );
    }

    const newHeroFiles = filesByField.heroImages || [];
    const totalHeroCount = template.heroImages.length + newHeroFiles.length;
    // const totalHeroCount = heroKeepIds.length + newHeroFiles.length;
    if (totalHeroCount > 5) {
      throw new Error(
        `Cannot exceed 5 hero images (currently ${template.heroImages.length}).`,
      );
    }
    if (newHeroFiles.length) {
      const newHero = await uploadImages(
        newHeroFiles,
        `${baseFolder}/heroImages`,
        5,
      );
      template.heroImages.push(...newHero);
    }

    // === ðŸž GALLERY (max 40 total) ===
    const galleryKeepIds = safeParse(req.body.galleryImageIds, []);
    if (req.body.galleryImageIds !== undefined) {
      const toDelete = template.gallery.filter(
        (img) => !galleryKeepIds.includes(img.id),
      );
      await deleteImagesFromS3(toDelete);
      template.gallery = template.gallery.filter((img) =>
        galleryKeepIds.includes(img.id),
      );
    }

    const newGalleryFiles = filesByField.gallery || [];
    const totalGalleryCount = template.gallery.length + newGalleryFiles.length;
    if (totalGalleryCount > 40) {
      throw new Error(
        `Cannot exceed 40 gallery images (currently ${template.gallery.length}).`,
      );
    }
    if (newGalleryFiles.length) {
      const newGallery = await uploadImages(
        newGalleryFiles,
        `${baseFolder}/gallery`,
        40,
      );
      template.gallery.push(...newGallery);
    }

    const aboutPageImageKeepIds = safeParse(req.body.aboutPageImageIds, []);
    if (req.body.aboutPageImageIds !== undefined) {
      const toDelete = (template.aboutPageImages || []).filter(
        (img) => !aboutPageImageKeepIds.includes(img.id),
      );
      await deleteImagesFromS3(toDelete);
      template.aboutPageImages = (template.aboutPageImages || []).filter((img) =>
        aboutPageImageKeepIds.includes(img.id),
      );
    }
    const newAboutPageImages = filesByField.aboutPageImages || [];
    if (newAboutPageImages.length) {
      const uploadedAboutPageImages = await uploadImages(
        newAboutPageImages,
        `${baseFolder}/aboutPageImages`,
      );
      template.aboutPageImages = [
        ...(template.aboutPageImages || []),
        ...uploadedAboutPageImages,
      ];
    }

    if (aboutPageImageCards !== null) {
      const normalizedCards = (Array.isArray(aboutPageImageCards)
        ? aboutPageImageCards
        : []
      ).map((card, index) => {
        const existing = template.aboutPageImageCards?.[index];
        return {
          title: String(card?.title || "").trim(),
          description: String(card?.description || "").trim(),
          ...(existing?.image ? { image: existing.image } : {}),
        };
      });

      for (let i = 0; i < normalizedCards.length; i++) {
        const cardFile = (filesByField[`aboutPageImageCardImage_${i}`] || [])[0];
        if (cardFile) {
          if (normalizedCards[i]?.image?.url) {
            await deleteImagesFromS3([normalizedCards[i].image]);
          }
          const uploaded = await uploadImages(
            [cardFile],
            `${baseFolder}/aboutPageImageCards/${i}`,
            1,
          );
          normalizedCards[i].image = uploaded[0] || normalizedCards[i].image;
        }
      }
      template.aboutPageImageCards = normalizedCards;
      if (!Array.isArray(template.aboutPageImages) || template.aboutPageImages.length === 0) {
        template.aboutPageImages = normalizedCards
          .map((card) => card.image)
          .filter(Boolean);
      }
    }

    if (productDropdownPages !== null) {
      const normalizedPages = normalizeProductDropdownPages(productDropdownPages);
      for (let i = 0; i < normalizedPages.length; i++) {
        const existing = template.productDropdownPages?.[i];
        normalizedPages[i].heroImage = existing?.heroImage || undefined;
        normalizedPages[i].heroImages = existing?.heroImages || [];
        normalizedPages[i].homeCardImage = existing?.homeCardImage || undefined;

        const singleHeroFile = (filesByField[`productPageHeroImage_${i}`] || [])[0];
        if (singleHeroFile) {
          if (normalizedPages[i]?.heroImage?.url) {
            await deleteImagesFromS3([normalizedPages[i].heroImage]);
          }
          const uploaded = await uploadImages(
            [singleHeroFile],
            `${baseFolder}/productPageHeroImage/${i}`,
            1,
          );
          normalizedPages[i].heroImage = uploaded[0] || undefined;
        }

        const heroCarouselFiles = filesByField[`productPageHeroImages_${i}`] || [];
        if (heroCarouselFiles.length) {
          await deleteImagesFromS3(normalizedPages[i].heroImages || []);
          normalizedPages[i].heroImages = await uploadImages(
            heroCarouselFiles.slice(0, 5),
            `${baseFolder}/productPageHeroImages/${i}`,
            5,
          );
        }

        const homeCardFile = (filesByField[`productPageHomeCardImage_${i}`] || [])[0];
        if (homeCardFile) {
          if (normalizedPages[i]?.homeCardImage?.url) {
            await deleteImagesFromS3([normalizedPages[i].homeCardImage]);
          }
          const uploaded = await uploadImages(
            [homeCardFile],
            `${baseFolder}/productPageHomeCardImage/${i}`,
            1,
          );
          normalizedPages[i].homeCardImage = uploaded[0] || undefined;
        }
      }
      template.productDropdownPages = normalizedPages;
    }

    // === ðŸ› PRODUCTS (max 10 per product) ===
    const existingMap = new Map(
      (template.products || []).map((p) => [String(p._id), p]),
    );
    const idxById = new Map(
      (template.products || []).map((p, i) => [String(p._id), i]),
    );
    const baseLen = (template.products || []).length;
    let newCounter = 0;

    const updatedProducts = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const existing = p._id ? existingMap.get(String(p._id)) : null;
      const fieldIdx =
        p._id && idxById.has(String(p._id))
          ? idxById.get(String(p._id))
          : baseLen + newCounter++;

      const existingCount = existing?.images?.length || 0;
      const newFiles = filesByField[`productImages_${fieldIdx}`] || [];
      const total = existingCount + newFiles.length;
      if (total > 10) {
        throw new Error(
          `Max 10 images allowed per product (${p.name || "Unnamed product"}).`,
        );
      }

      const uploaded = newFiles.length
        ? await uploadImages(
            newFiles,
            `${baseFolder}/productImages/${p._id || fieldIdx}`,
            10,
          )
        : [];

      if (existing) {
        const keepIds = new Set(p.imageIds || []);

        if (p.imageIds !== undefined) {
          const toDelete = (existing.images || []).filter(
            (img) => !keepIds.has(img.id),
          );
          await deleteImagesFromS3(toDelete);
          const kept = (existing.images || []).filter((img) =>
            keepIds.has(img.id),
          );
          existing.images = [...kept, ...uploaded];
        } else {
          existing.images = [...(existing.images || []), ...uploaded];
        }
        existing.type = p.type ?? existing.type;
        existing.name = p.name ?? existing.name;
        existing.cost = p.cost ?? existing.cost;
        existing.description = p.description ?? existing.description;
        updatedProducts.push(existing);
      } else {
        updatedProducts.push({
          type: p.type,
          name: p.name,
          cost: p.cost,
          description: p.description,
          images: uploaded,
        });
      }
    }

    const updatedIds = new Set(
      updatedProducts.map((p) => String(p._id)).filter(Boolean),
    );
    const removedProducts = (template.products || []).filter(
      (p) => !updatedIds.has(String(p._id)),
    );
    for (const removed of removedProducts)
      await deleteImagesFromS3(removed.images || []);
    template.products = updatedProducts;

    // Keep cafe menu items synced with product cards so published menu images/titles stay consistent.
    if (String(normalizedVertical || "").trim() === "cafe") {
      const existingMenuByName = new Map(
        (template.menuItems || []).map((item) => [String(item?.name || "").trim(), item]),
      );
      template.menuItems = (template.products || []).map((p) => {
        const key = String(p?.name || "").trim();
        const existing = existingMenuByName.get(key);
        return {
          category: String(existing?.category || p?.type || "Menu"),
          name: String(p?.name || ""),
          description: String(p?.description || ""),
          price: String(p?.cost || ""),
          image:
            (Array.isArray(p?.images) && p.images.length ? p.images[0] : null) ||
            existing?.image ||
            null,
        };
      });
      template.productTitle =
        String(req.body?.productTitle || "").trim() ||
        sectionTitleByVertical.cafe;
      template.activeSections = Array.isArray(VERTICAL_CONFIG?.cafe?.sections)
        ? VERTICAL_CONFIG.cafe.sections
        : template.activeSections;
      template.enabledSections = Array.isArray(VERTICAL_CONFIG?.cafe?.sections)
        ? VERTICAL_CONFIG.cafe.sections
        : template.enabledSections;
    }

    // === ðŸ’¬ TESTIMONIALS (max 1 per testimonial) ===
    const testimonialMap = new Map(
      (template.testimonials || []).map((t) => [String(t._id), t]),
    );
    const tIdxById = new Map(
      (template.testimonials || []).map((t, i) => [String(t._id), i]),
    );
    const tBaseLen = (template.testimonials || []).length;
    let tNewCounter = 0;

    const updatedTestimonials = [];
    for (let i = 0; i < testimonials.length; i++) {
      const t = testimonials[i];
      const existing = t._id ? testimonialMap.get(String(t._id)) : null;
      const fieldIdx =
        t._id && tIdxById.has(String(t._id))
          ? tIdxById.get(String(t._id))
          : tBaseLen + tNewCounter++;

      const newFiles = filesByField[`testimonialImages_${fieldIdx}`] || [];
      if (newFiles.length > 1)
        throw new Error("Only 1 image allowed per testimonial.");

      const uploaded = newFiles.length
        ? await uploadImages(newFiles, `${baseFolder}/testimonialImages`, 1)
        : [];

        if (existing) {
          if (uploaded[0]) {
            if (existing.image?.url) await deleteImagesFromS3([existing.image]);
            existing.image = uploaded[0];
          } else if (t.imageId === null) {
            if (existing.image?.url) await deleteImagesFromS3([existing.image]);
            delete existing.image;
          }
        existing.name = t.name ?? existing.name;
        existing.jobPosition = t.jobPosition ?? existing.jobPosition;
        existing.testimony = t.testimony ?? existing.testimony;
        existing.rating = t.rating ?? existing.rating;
        updatedTestimonials.push(existing);
      } else {
        updatedTestimonials.push({
          name: t.name,
          jobPosition: t.jobPosition,
          testimony: t.testimony,
          rating: t.rating,
          ...(uploaded[0] ? { image: uploaded[0] } : {}),
        });
      }
    }

    const updatedTIds = new Set(
      updatedTestimonials.map((t) => String(t._id)).filter(Boolean),
    );
    const removedT = (template.testimonials || []).filter(
      (t) => !updatedTIds.has(String(t._id)),
    );
    for (const r of removedT)
      if (r.image?.url) await deleteImagesFromS3([r.image]);
    template.testimonials = updatedTestimonials;

    // FOUNDER IMAGES in editTemplate
    if (Array.isArray(template.founders)) {
      for (let i = 0; i < template.founders.length; i++) {
        const founderFile = (filesByField[`founderImage_${i}`] || [])[0];
        if (founderFile) {
          if (template.founders[i]?.image?.url) {
            await deleteImagesFromS3([template.founders[i].image]);
          }
          const uploaded = await uploadImages([founderFile], `${baseFolder}/founders/${i}`, 1);
          template.founders[i] = { ...(template.founders[i] || {}), image: uploaded[0] || template.founders[i]?.image };
        }
      }
    }

    // Validate before saving to catch schema validation errors
    await template.validate();

    await template.save({ session });
    await session.commitTransaction();
    session.endSession();

    await deductWorkspaceCreditOnSuccess({
      workspaceId: req.body?.workspaceId || template?.workspaceId,
      companyId: req.body?.companyId || template?.companyId,
    });

    res
      .status(200)
      .json({
        message: "Template updated successfully",
        template: serializeWebsiteTemplateForClient(template),
      });
  } catch (err) {
    // Capture the original error message before aborting
    const originalError = err.message || "Template update failed";

    console.error("Edit Template Error:", err);

    // Safely abort transaction if it's still active
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    // Return the original error, not the transaction abort error
    res.status(400).json({ message: originalError });
  }
};

export const publishWebsite = async (req, res, next) => {
  try {
    const { workspaceId, websiteId } = req.body || {};

    const template = await WebsiteTemplate.findById(websiteId);
    if (!template) {
      return res.status(404).json({ error: "Website template not found" });
    }

    const resolvedWorkspaceId = String(workspaceId || template.workspaceId || "").trim();
    const resolvedCompanyId = String(template.companyId || "").trim();

    let subscription = null;
    if (resolvedWorkspaceId) {
      subscription = await WorkspaceSubscription.findOne({
        $or: [
          { workspaceId: resolvedWorkspaceId },
          { companyId: resolvedCompanyId || resolvedWorkspaceId },
        ],
      }).exec();
    }

    if (!subscription) {
      subscription = await WorkspaceSubscription.create({
        companyId: resolvedCompanyId || resolvedWorkspaceId,
        workspaceId: resolvedWorkspaceId || resolvedCompanyId,
        creditsLimit: 5,
        creditsUsed: 0,
        addOnCreditsPurchased: 0,
      });
    }

    const deployedUrl = `https://${template.searchKey}.wono.co/`;
    const deployedAt = new Date();

    template.isPublished = true;
    template.deployedAt = deployedAt;
    template.deployedUrl = deployedUrl;
    template.productDropdownPages = sanitizeProductDropdownPagesForPersistence(
      template.productDropdownPages,
    );
    template.menuItems = sanitizeMenuItemsForPersistence(template.menuItems);
    await template.save();

    subscription.publishedProjectId = websiteId;
    subscription.publishedProjectUrl = deployedUrl;
    await subscription.save();

    return res.status(200).json({
      success: true,
      deployedUrl,
      deployedAt,
      template: serializeWebsiteTemplateForClient(template),
    });
  } catch (error) {
    return next(error);
  }
};
