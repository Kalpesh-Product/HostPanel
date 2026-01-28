import sharp from "sharp";
import WebsiteTemplate from "../../models/website/WebsiteTemplate.js";
import mongoose from "mongoose";
import {
  deleteFileFromS3ByUrl,
  uploadFileToS3,
} from "../../config/s3config.js";
import HostCompany from "../../models/Company.js";
import axios from "axios";

export const createTemplate = async (req, res, next) => {
  try {
    const { company } = req.query;

    // `products` might arrive as a JSON string in multipart. Normalize it.

    let { products, testimonials, about, source = "Host Panel" } = req.body;

    const safeParse = (val, fallback) => {
      try {
        return typeof val === "string" ? JSON.parse(val) : val || fallback;
      } catch {
        return fallback;
      }
    };

    about = safeParse(about, []);
    products = safeParse(products, []);
    testimonials = safeParse(testimonials, []);

    const hostCompanyExists = await HostCompany.findOne(
      { companyName: req.body.companyName } //can't use company Id as the host signup form can't send any company Id
    );

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

    const searchKey = formatCompanyName(req.body.companyName);
    const baseFolder = `hosts/template/${searchKey}`;

    if (searchKey === "") {
      return res.status(400).json({ message: "Provide a valid company name" });
    }

    let template = await WebsiteTemplate.findOne({ searchKey });

    if (template) {
      return res
        .status(400)
        .json({ message: "Template for this company already exists" });
    }

    template = new WebsiteTemplate({
      searchKey,
      companyId: req.body?.companyId,
      companyName: req.body.companyName,
      title: req.body.title,
      subTitle: req.body.subTitle,
      CTAButtonText: req.body.CTAButtonText,
      about: about,
      productTitle: req.body?.productTitle,
      galleryTitle: req.body?.galleryTitle,
      testimonialTitle: req.body.testimonialTitle,
      contactTitle: req.body.contactTitle,
      mapUrl: req.body.mapUrl,
      email: req.body.websiteEmail,
      phone: req.body.phone,
      address: req.body.address,
      registeredCompanyName: req.body.registeredCompanyName,
      copyrightText: req.body.copyrightText,
      isWebsiteTemplate: true,
      products: [],
      testimonials: [],
    });

    const uploadImages = async (files = [], folder) => {
      const arr = [];

      for (const file of files) {
        const buffer = await sharp(file.buffer)
          .webp({ quality: 80 })
          .toBuffer();

        const route = `${folder}/${Date.now()}_${file.originalname.replace(
          /\s+/g,
          "_"
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
        t?.url ? { url: t.url, id: t.id } : {}
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
        `${baseFolder}/heroImages`
      );
    }

    // gallery
    if (filesByField.gallery?.length) {
      template.gallery = await uploadImages(
        filesByField.gallery,
        `${baseFolder}/gallery`
      );
    }

    if (Array.isArray(products) && products.length) {
      for (let i = 0; i < products.length; i++) {
        const p = products[i] || {};
        const pFiles = filesByField[`productImages_${i}`] || [];
        const uploaded = await uploadImages(
          pFiles,
          `${baseFolder}/productImages/${i}`
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

    // TESTIMONIALS: objects + flat testimonialImages array (zip by index)
    let tUploads = [];
    if (filesByField.testimonialImages?.length) {
      // Preferred new path: single field 'testimonialImages' with N files in order
      tUploads = await uploadImages(
        filesByField.testimonialImages,
        `${baseFolder}/testimonialImages`
      );
    } else {
      // Back-compat: testimonialImages_${i}
      for (let i = 0; i < testimonials.length; i++) {
        const tFiles = filesByField[`testimonialImages_${i}`] || [];
        const uploaded = await uploadImages(
          tFiles,
          `${baseFolder}/testimonialImages/${i}`
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
      const updateHostCompany = await HostCompany.findOneAndUpdate(
        { companyName: req.body.companyName }, //can't use company Id as the host signup form can't send any company Id
        {
          isWebsiteTemplate: true,
        }
      );

      if (!updateHostCompany) {
        return res.status(400).json({ message: "Company not found" });
      }

      try {
        const updatedCompany = await axios.patch(
          "https://wononomadsbe.vercel.app/api/company/add-template-link",
          {
            companyName: req.body.companyName,
            link: `https://${savedTemplate.searchKey}.wono.co/`,
          }
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
          });
        }
      }
    }

    console.log("template created!!");
    return res.status(201).json({ message: "Template created", template });
  } catch (error) {
    next(error);
  }
};

export const getTemplate = async (req, res) => {
  try {
    const { companyName } = req.params;

    const formatCompanyName = (name) => {
      if (!name) return "";
      return name.toLowerCase().split("-")[0].replace(/\s+/g, "");
    };

    const searchKey = formatCompanyName(companyName);

    const template = await WebsiteTemplate.findOne({
      searchKey,
    });

    if (!template) {
      return res.status(200).json([]);
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getInActiveTemplate = async (req, res) => {
  try {
    const { company } = req.params;

    const template = await WebsiteTemplate.findOne({
      searchKey: company,
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
    const templates = await WebsiteTemplate.find({ isActive: true });

    if (!templates.length) {
      return res.status(200).json([]);
    }

    res.json(templates);
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
      }
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
    let { products, testimonials, about, companyName } = req.body;

    const safeParse = (val, fallback) => {
      try {
        return typeof val === "string" ? JSON.parse(val) : val || fallback;
      } catch {
        return fallback;
      }
    };

    about = safeParse(about, []);
    products = safeParse(products, []);
    testimonials = safeParse(testimonials, []);

    const formatCompanyName = (name) =>
      (name || "").toLowerCase().split("-")[0].replace(/\s+/g, "");
    const searchKey = formatCompanyName(companyName);
    const baseFolder = `hosts/template/${searchKey}`;

    const template = await WebsiteTemplate.findOne({ searchKey }).session(
      session
    );
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
          "_"
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
        })
      );
    };

    const filesByField = {};
    for (const f of req.files || []) (filesByField[f.fieldname] ||= []).push(f);

    Object.assign(template, {
      title: req.body.title ?? template.title,
      subTitle: req.body.subTitle ?? template.subTitle,
      CTAButtonText: req.body.CTAButtonText ?? template.CTAButtonText,
      about: Array.isArray(about) ? about : template.about,
      productTitle: req.body.productTitle ?? template.productTitle,
      galleryTitle: req.body.galleryTitle ?? template.galleryTitle,
      testimonialTitle: req.body.testimonialTitle ?? template.testimonialTitle,
      contactTitle: req.body.contactTitle ?? template.contactTitle,
      mapUrl: req.body.mapUrl ?? template.mapUrl,
      email: req.body.email ?? template.email,
      phone: req.body.phone ?? template.phone,
      address: req.body.address ?? template.address,
      registeredCompanyName:
        req.body.registeredCompanyName ?? template.registeredCompanyName,
      copyrightText: req.body.copyrightText ?? template.copyrightText,
    });

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
        1
      );
      template.companyLogo = uploaded[0];
    }

    // === 🖼 HERO IMAGES (max 5 total) ===
    const heroKeepIds = safeParse(req.body.heroImageIds, []);

    if (req.body.heroImageIds !== undefined) {
      const toDelete = template.heroImages.filter(
        (img) => !heroKeepIds.includes(img.id)
      );
      await deleteImagesFromS3(toDelete);
      template.heroImages = template.heroImages.filter((img) =>
        heroKeepIds.includes(img.id)
      );
    }

    const newHeroFiles = filesByField.heroImages || [];
    const totalHeroCount = template.heroImages.length + newHeroFiles.length;
    // const totalHeroCount = heroKeepIds.length + newHeroFiles.length;
    if (totalHeroCount > 5) {
      throw new Error(
        `Cannot exceed 5 hero images (currently ${template.heroImages.length}).`
      );
    }
    if (newHeroFiles.length) {
      const newHero = await uploadImages(
        newHeroFiles,
        `${baseFolder}/heroImages`,
        5
      );
      template.heroImages.push(...newHero);
    }

    // === 🏞 GALLERY (max 40 total) ===
    const galleryKeepIds = safeParse(req.body.galleryImageIds, []);
    if (req.body.galleryImageIds !== undefined) {
      const toDelete = template.gallery.filter(
        (img) => !galleryKeepIds.includes(img.id)
      );
      await deleteImagesFromS3(toDelete);
      template.gallery = template.gallery.filter((img) =>
        galleryKeepIds.includes(img.id)
      );
    }

    const newGalleryFiles = filesByField.gallery || [];
    const totalGalleryCount = template.gallery.length + newGalleryFiles.length;
    if (totalGalleryCount > 40) {
      throw new Error(
        `Cannot exceed 40 gallery images (currently ${template.gallery.length}).`
      );
    }
    if (newGalleryFiles.length) {
      const newGallery = await uploadImages(
        newGalleryFiles,
        `${baseFolder}/gallery`,
        40
      );
      template.gallery.push(...newGallery);
    }

    // === 🛍 PRODUCTS (max 10 per product) ===
    const existingMap = new Map(
      (template.products || []).map((p) => [String(p._id), p])
    );
    const idxById = new Map(
      (template.products || []).map((p, i) => [String(p._id), i])
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
          `Max 10 images allowed per product (${p.name || "Unnamed product"}).`
        );
      }

      const uploaded = newFiles.length
        ? await uploadImages(
            newFiles,
            `${baseFolder}/productImages/${p._id || fieldIdx}`,
            10
          )
        : [];

      if (existing) {
        const keepIds = new Set(p.imageIds || []);

        if (p.imageIds !== undefined) {
          const toDelete = (existing.images || []).filter(
            (img) => !keepIds.has(img.id)
          );
          await deleteImagesFromS3(toDelete);
          const kept = (existing.images || []).filter((img) =>
            keepIds.has(img.id)
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
      updatedProducts.map((p) => String(p._id)).filter(Boolean)
    );
    const removedProducts = (template.products || []).filter(
      (p) => !updatedIds.has(String(p._id))
    );
    for (const removed of removedProducts)
      await deleteImagesFromS3(removed.images || []);
    template.products = updatedProducts;

    // === 💬 TESTIMONIALS (max 1 per testimonial) ===
    const testimonialMap = new Map(
      (template.testimonials || []).map((t) => [String(t._id), t])
    );
    const tIdxById = new Map(
      (template.testimonials || []).map((t, i) => [String(t._id), i])
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
      updatedTestimonials.map((t) => String(t._id)).filter(Boolean)
    );
    const removedT = (template.testimonials || []).filter(
      (t) => !updatedTIds.has(String(t._id))
    );
    for (const r of removedT)
      if (r.image?.url) await deleteImagesFromS3([r.image]);
    template.testimonials = updatedTestimonials;

    // Validate before saving to catch schema validation errors
    await template.validate();

    await template.save({ session });
    await session.commitTransaction();
    session.endSession();

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
