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

const buildTemplateLookupByCompanyAndVertical = (searchKey, vertical) => {
  const normalizedSearchKey = String(searchKey || "").trim().toLowerCase();
  const hasVertical =
    typeof vertical === "string" && String(vertical).trim().length > 0;
  const normalizedVertical = hasVertical
    ? normalizeVertical(vertical)
    : null;

  if (!hasVertical) {
    return { searchKey: normalizedSearchKey };
  }

  return {
    searchKey: normalizedSearchKey,
    $or: [
      { vertical: normalizedVertical },
      // Backward compatibility for legacy records where vertical was not set.
      { vertical: { $exists: false } },
      { vertical: null },
      { vertical: "" },
    ],
  };
};

const buildStrictTemplateLookupByCompanyAndVertical = (searchKey, vertical) => {
  const normalizedSearchKey = String(searchKey || "").trim().toLowerCase();
  const hasVertical =
    typeof vertical === "string" && String(vertical).trim().length > 0;

  if (!hasVertical) {
    return { searchKey: normalizedSearchKey };
  }

  return {
    searchKey: normalizedSearchKey,
    vertical: normalizeVertical(vertical),
  };
};

const deductWorkspaceCreditOnSuccess = async (workspaceId) => {
  if (!workspaceId) return;
  const subscription = await WorkspaceSubscription.findOne({
    $or: [{ workspaceId }, { companyId: workspaceId }],
  });
  if (!subscription) return;
  subscription.creditsUsed = Number(subscription.creditsUsed || 0) + 1;
  await subscription.save();
};

const NOMADS_BASE_URL = "https://wononomadsbe.vercel.app";

const safeNum = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

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
      packages,
      dorms,
      testimonials,
      about,
      enabledSections,
      sectionOverrides,
      styleConfig,
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
    packages = safeParse(packages, []);
    dorms = safeParse(dorms, []);
    testimonials = safeParse(testimonials, []);
    enabledSections = safeParse(enabledSections, []);
    sectionOverrides = safeParse(sectionOverrides, {});
    styleConfig = safeParse(styleConfig, {});

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

    if (template) {
      return res
        .status(400)
        .json({
          message: "Template for this company already exists",
          duplicateKey: {
            searchKey,
            vertical,
            existingTemplateId: String(template?._id || ""),
            existingVertical: template?.vertical || "",
          },
        });
    }

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
      verticalType: normalizeVertical(req.body.verticalType || vertical),
      heroVariant: req.body.heroVariant || "text-image",
      themeVariant: req.body.themeVariant || "default",
      vertical,
      themeId,
      activeSections,
      enabledSections: Array.isArray(enabledSections) ? enabledSections : [],
      sectionOverrides,
      styleConfig,
      isWebsiteTemplate: true,
      isActive: true,
      products: [],
      menuItems: [],
      rooms: [],
      packages: [],
      dorms: [],
      testimonials: [],
    });
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
        const imageFile = (filesByField[`productImages_${i}`] || [])[0];
        let uploadedImage = null;
        if (imageFile) {
          const uploaded = await uploadImages(
            [imageFile],
            `${baseFolder}/menuItems/${i}`,
          );
          uploadedImage = uploaded[0] || null;
        }
        template.menuItems.push({
          category: item.category || "",
          name: item.name || "",
          description: item.description || "",
          price: item.price || "",
          image: uploadedImage,
        });
      }
    }

    if (Array.isArray(rooms) && rooms.length) {
      for (let i = 0; i < rooms.length; i++) {
        const item = rooms[i] || {};
        const uploaded = await uploadImages(
          filesByField[`productImages_${i}`] || [],
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

    if (Array.isArray(packages) && packages.length) {
      for (let i = 0; i < packages.length; i++) {
        const item = packages[i] || {};
        const uploaded = await uploadImages(
          filesByField[`productImages_${i}`] || [],
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
          filesByField[`productImages_${i}`] || [],
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
            verticalType: req.body.verticalType || vertical,
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

      await ensureNomadsCompanyRecord({
        template: savedTemplate,
        hostCompany: updateHostCompany,
        companyId: req.body.companyId,
        companyName: req.body.companyName,
        vertical,
      });

      try {
        const updatedCompany = await axios.patch(
          "https://wononomadsbe.vercel.app/api/company/add-template-link",
          {
            companyName: req.body.companyName,
            link: `https://${savedTemplate.searchKey}.wono.co/`,
          },
        );

        if (!updatedCompany) {
          return res
            .status(400)
            .json({ message: "Failed to add website template link" });
        }
      } catch (error) {
        if (error.response?.status !== 200) {
          return res.status(201).json({
            message:
              "Failed to add link.Check if the company is listed in Nomads.",
            error: error.message,
            template: savedTemplate,
          });
        }
      }
    }

    return res.status(201).json({ message: "Template created", template: savedTemplate });
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
    const payload = template.toObject ? template.toObject() : template;
    payload.mapUrl = normalizeMapUrl(payload.mapUrl);
    payload.companyName =
      resolveUsableCompanyName(
        payload.companyName,
        payload.registeredCompanyName,
      ) || payload.searchKey || "";
    res.json(payload);
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
    res.json(template);
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
      const payload = template.toObject ? template.toObject() : template;
      payload.mapUrl = normalizeMapUrl(payload.mapUrl);
      payload.companyName =
        resolveUsableCompanyName(
          payload.companyName,
          payload.registeredCompanyName,
        ) || payload.searchKey || "";
      return payload;
    });

    if (normalizedRequestedVertical) {
      sanitizedTemplates = sanitizedTemplates.filter(
        (template) =>
          normalizeVertical(template?.vertical || template?.verticalType) ===
          normalizedRequestedVertical,
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

    res.json(templates);
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

    return res.status(400).json({ message: "Website activated successfully" });
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
      packages,
      dorms,
      testimonials,
      about,
      enabledSections,
      sectionOverrides,
      styleConfig,
      companyName,
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
    packages = safeParse(packages, []);
    dorms = safeParse(dorms, []);
    testimonials = safeParse(testimonials, []);
    enabledSections = safeParse(enabledSections, null);
    sectionOverrides = safeParse(sectionOverrides, null);
    styleConfig = safeParse(styleConfig, null);

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
        sectionTitleByVertical[
          String(normalizedVertical || template?.vertical || "").trim()
        ] ||
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
      verticalType: normalizeVertical(
        req.body.verticalType ??
          req.body.vertical ??
          template.verticalType ??
          template.vertical ??
          "co-working",
      ),
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
      menuItems:
        String(normalizedVertical || template?.vertical || "").trim() === "cafe"
          ? template.menuItems
          : Array.isArray(menuItems)
            ? menuItems
            : template.menuItems,
      rooms: Array.isArray(rooms) ? rooms : template.rooms,
      packages: Array.isArray(packages) ? packages : template.packages,
      dorms: Array.isArray(dorms) ? dorms : template.dorms,
    });

    if (hasVerticalInBody && normalizedVertical) {
      template.vertical = normalizedVertical;
      template.themeId =
        derivedThemeId && THEME_TOKENS?.[derivedThemeId]
          ? derivedThemeId
          : "co-working-default";
      template.activeSections = Array.isArray(derivedActiveSections)
        ? derivedActiveSections
        : template.activeSections;
    }

    // === 🏢 COMPANY LOGO (limit 1) ===
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

    // === 🖼 HERO IMAGES (max 5 total) ===
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

    // === 🏞 GALLERY (max 40 total) ===
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

    // === 🛍 PRODUCTS (max 10 per product) ===
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
    if (String(template.vertical || "").trim() === "cafe") {
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

    // === 💬 TESTIMONIALS (max 1 per testimonial) ===
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
          existing.image = null;
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
          image: uploaded[0] || null,
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

    // Validate before saving to catch schema validation errors
    await template.validate();

    await template.save({ session });
    await session.commitTransaction();
    session.endSession();

    await deductWorkspaceCreditOnSuccess(
      req.body?.workspaceId || req.body?.companyId || template?.workspaceId || template?.companyId,
    );

    res
      .status(200)
      .json({ message: "Template updated successfully", template });
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

    const subscription = await WorkspaceSubscription.findOne({ workspaceId });

    if (!subscription) {
      return res.status(404).json({ error: "Workspace subscription not found" });
    }

    const template = await WebsiteTemplate.findById(websiteId);
    if (!template) {
      return res.status(404).json({ error: "Website template not found" });
    }

    const deployedUrl = `https://${template.searchKey}.wono.co/`;
    const deployedAt = new Date();

    template.isPublished = true;
    template.deployedAt = deployedAt;
    template.deployedUrl = deployedUrl;
    await template.save();

    subscription.publishedProjectId = websiteId;
    subscription.publishedProjectUrl = deployedUrl;
    await subscription.save();

    return res.status(200).json({
      success: true,
      deployedUrl,
      deployedAt,
    });
  } catch (error) {
    return next(error);
  }
};

