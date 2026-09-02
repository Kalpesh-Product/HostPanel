// @ts-nocheck
import axios from "axios";
import HostCompany from "../models/Company.js";
import HostUser from "../models/HostUser.js";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import { deleteFileFromS3ByUrl, uploadFileToS3 } from "../config/s3config.js";
import { getContinentForCountry } from "../utils/countryContinent.js";

// Same Nomads backend host reviewControllers.ts/leadsControllers.ts already
// read via REVIEW_API_BASE_URL — reused here rather than a second env var,
// so switching to a local Nomads backend for dev only means setting it once.
const NOMADS_API_BASE_URL = `${String(
  process.env.REVIEW_API_BASE_URL || "https://wono.co",
).replace(/\/+$/, "")}/api/company`;

const activeListingSubmissions = new Set<string>();

const normalizeListingType = (value: unknown) =>
  String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

// Shared by every host-facing action that operates on one existing listing
// (delete, recovery request, ...) — confirms the businessId actually
// belongs to this host's company before anything touches it, the same way
// setListingVisibility does inline. Returns either `{ listing }` or
// `{ error: { status, body } }`, never both.
const resolveOwnedListing = async (companyId: unknown, businessId: unknown) => {
  const normalizedCompanyId = String(companyId || "").trim();
  const normalizedBusinessId = String(businessId || "").trim();

  if (!normalizedCompanyId) {
    return { error: { status: 400, body: { message: "Company is required" } } };
  }
  if (!normalizedBusinessId) {
    return { error: { status: 400, body: { message: "Business Id missing" } } };
  }

  const company = await HostCompany.findOne({ companyId: normalizedCompanyId });
  if (!company) {
    return { error: { status: 404, body: { message: "Company not found" } } };
  }

  const effectiveNomadsCompanyId = company.linkedNomadsCompanyId || company.companyId;

  let existingListings = [];
  try {
    const listingsResponse = await axios.get(
      `${NOMADS_API_BASE_URL}/get-listings/${encodeURIComponent(effectiveNomadsCompanyId)}`,
      { params: { t: Date.now() } },
    );
    existingListings = Array.isArray(listingsResponse.data) ? listingsResponse.data : [];
  } catch (error) {
    console.error(
      "Failed to load listings for ownership check:",
      axios.isAxiosError(error)
        ? { status: error.response?.status, data: error.response?.data }
        : error,
    );
    return {
      error: { status: 502, body: { message: "Unable to verify this listing. Please try again." } },
    };
  }

  const listing = existingListings.find(
    (l) => String(l?.businessId || "") === normalizedBusinessId,
  );
  if (!listing) {
    return { error: { status: 404, body: { message: "Listing not found for this company." } } };
  }

  return { listing, normalizedBusinessId };
};

// Nomads review records key the rating off `starCount`. Add/Edit forms have
// historically sent the rating under different keys (`rating` vs `starCount`),
// so normalize every incoming review to carry starCount/rating/rate together
// — otherwise a 5-star review is stored with starCount 1 and renders as 1 star.
const normalizeListingReviews = (reviews: unknown) =>
  (Array.isArray(reviews) ? reviews : []).map((review: any) => {
    const rating = Number(
      review?.starCount ?? review?.rating ?? review?.rate ?? 0,
    );
    return {
      ...review,
      name: String(review?.name || "").trim(),
      review: String(review?.review || "").trim(),
      starCount: rating,
      rating,
      rate: rating,
    };
  });

// Placeholder listing website when the host doesn't provide one — a
// generated "companyname.wono.co" subdomain rather than the host's own
// (often unreliable/unset) registered website.
const buildDefaultListingWebsite = (companyName: unknown) =>
  `${String(companyName || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "")}.wono.co`;

const getNomadListingPlan = async (userId: string) => {
  const user = await HostUser.findById(userId).select("primaryWorkspace").lean();
  let workspace = user?.primaryWorkspace
    ? await Workspace.findById(user.primaryWorkspace).select("selectedPlan").lean()
    : null;

  if (!workspace && user?._id) {
    const membership = await WorkspaceMember.findOne({ user: user._id, isActive: true })
      .sort({ isPrimary: -1, createdAt: 1 })
      .select("workspace")
      .lean();
    if (membership?.workspace) {
      workspace = await Workspace.findById(membership.workspace).select("selectedPlan").lean();
    }
  }

  return String(workspace?.selectedPlan || "basic").trim().toLowerCase();
};

export const createCompanyListing = async (req, res) => {
  let submissionKey = "";
  let hasSubmissionLock = false;
  try {
    // const payload = req.body.data ? JSON.parse(req.body.data) : req.body;

    // const {
    //   companyId,
    //   companyType,
    //   ratings,
    //   totalReviews,
    //   companyName,
    //   cost,
    //   description,
    //   latitude,
    //   longitude,
    //   inclusions,
    //   about,
    //   address,
    //   reviews,
    // } = payload;

    const {
      companyId,
      companyType,
      ratings,
      totalReviews,
      companyName,
      companyTitle,
      website,
      totalSeats,
      units,
      services,
      latitude,
      longitude,
      city,
      state,
      country,
      inclusions,
      about,
      address,
      googleMap,
      reviews,
    } = req.body;

    const normalizedCompanyId = String(companyId || "").trim();
    if (!normalizedCompanyId) {
      return res.status(400).json({ message: "Company is required" });
    }

    const userId = String(req.user?.id || req.user?._id || req.user || "").trim();
    submissionKey = `${userId}:${normalizedCompanyId}`;
    if (activeListingSubmissions.has(submissionKey)) {
      return res.status(409).json({
        code: "NOMAD_LISTING_SUBMISSION_IN_PROGRESS",
        message: "A Nomad listing is already being submitted. Please wait.",
      });
    }
    activeListingSubmissions.add(submissionKey);
    hasSubmissionLock = true;

    let parsedReviews;

    const company = await HostCompany.findOne({ companyId: normalizedCompanyId });

    if (!company) {
      return res.status(400).json({ message: "Company not found" });
    }

    if (typeof reviews === "string") {
      parsedReviews = JSON.parse(reviews);
    }

    parsedReviews = normalizeListingReviews(parsedReviews);

    // Each listing has its own location — a host can run several locations
    // of the same product type in different cities — so prefer whatever the
    // listing form submitted, only falling back to the host's registered
    // company address when the form left it blank.
    const resolvedCity = String(city || "").trim() || company.companyCity;
    const resolvedState = String(state || "").trim() || company.companyState;
    const resolvedCountry = String(country || "").trim() || company.companyCountry;

    // Workspace Setup never asks the host for a continent, so most Host
    // Company records have it blank — Nomads requires it on every listing,
    // so derive it from the listing's own country.
    const resolvedContinent =
      getContinentForCountry(resolvedCountry) ||
      (resolvedCountry === company.companyCountry ? company.companyContinent : null);

    if (!resolvedContinent) {
      return res.status(400).json({
        message:
          "Could not determine continent for this listing — please check the selected country.",
      });
    }

    // If staff have already linked this Host Company to an existing Nomads
    // company (via Transfer), new products must attach to that same Nomads
    // company — not create a second, disconnected one under this record's
    // own companyId.
    const effectiveNomadsCompanyId = company.linkedNomadsCompanyId || company.companyId;

    const selectedPlan = await getNomadListingPlan(userId);
    // Basic: 2 product types, 4 listings total. Professional: 3 product
    // types, 9 listings total. Listings can be distributed across the
    // allowed product types however the host likes (e.g. 3+1, or 3+3+3) —
    // the type limit only gates adding a BRAND NEW product type, not adding
    // another location under a type that's already in use.
    const listingLimit = selectedPlan === "custom" ? null : selectedPlan === "professional" ? 9 : 4;
    const productTypeLimit = selectedPlan === "custom" ? null : selectedPlan === "professional" ? 3 : 2;
    let existingListings = [];
    try {
      const listingsResponse = await axios.get(
        `${NOMADS_API_BASE_URL}/get-listings/${encodeURIComponent(effectiveNomadsCompanyId)}`,
        { params: { t: Date.now() } },
      );
      existingListings = Array.isArray(listingsResponse.data) ? listingsResponse.data : [];
    } catch (error) {
      // Before a host creates their first listing, Nomads has no company
      // record yet and returns 404. That is a valid zero-listing state.
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        existingListings = [];
      } else {
        console.error(
          "Failed to verify Nomad listing allowance:",
          axios.isAxiosError(error)
            ? { status: error.response?.status, data: error.response?.data }
            : error,
        );
        return res.status(502).json({
          message: "Unable to verify your Nomad listing allowance. Please try again.",
        });
      }
    }

    // A deleted listing frees its plan slot immediately — it no longer
    // counts toward the limit, product-type usage, or the duplicate-city
    // check, so a host can add a replacement right away.
    existingListings = existingListings.filter((listing) => !listing?.isDeleted);

    if (listingLimit !== null && existingListings.length >= listingLimit) {
      const planName = selectedPlan === "professional" ? "Professional" : "Basic";
      return res.status(403).json({
        code: "NOMAD_LISTING_LIMIT_REACHED",
        message: `${planName} plan allows only ${listingLimit} Nomad listings. Delete one to add another.`,
        limit: listingLimit,
        used: existingListings.length,
      });
    }

    const normalizedRequestedType = normalizeListingType(companyType);
    const existingTypes = new Set(
      existingListings
        .map((listing) => normalizeListingType(listing?.companyType))
        .filter(Boolean),
    );
    const isBrandNewType = normalizedRequestedType && !existingTypes.has(normalizedRequestedType);

    if (isBrandNewType && productTypeLimit !== null && existingTypes.size >= productTypeLimit) {
      const planName = selectedPlan === "professional" ? "Professional" : "Basic";
      return res.status(409).json({
        code: "NOMAD_LISTING_TYPE_LIMIT_REACHED",
        message: `${planName} plan allows only ${productTypeLimit} product types. Add another listing under an existing type, or upgrade your plan.`,
        typeLimit: productTypeLimit,
        usedTypes: existingTypes.size,
      });
    }

    const listingData = {
      // Always use the logged-in host's own registered company name —
      // don't depend on the client sending a valid one (it was previously
      // read from `auth.user.companyName`, which is fragile/can be blank).
      companyName: company.companyName,
      companyTitle: companyTitle ? companyTitle : company.companyName,
      registeredEntityName: company.registeredEntityName,
      companyId: effectiveNomadsCompanyId,
      logo: company.logo,
      city: resolvedCity,
      state: resolvedState,
      country: resolvedCountry,
      continent: resolvedContinent,
      // Optional per-listing override — falls back to a generated
      // "companyname.wono.co" placeholder when left blank.
      website: String(website || "").trim() || buildDefaultListingWebsite(company.companyName),
      companyType: companyType,
      ratings: ratings,
      totalReviews: totalReviews,
      totalSeats: totalSeats,
      units: units,
      services: services,
      latitude: latitude,
      longitude: longitude,
      inclusions: inclusions,
      about: about,
      address: address,
      googleMap: googleMap,
      reviews: parsedReviews,
      images: [],
    };

    //Upload logo/images

    const formatCompanyType = (type) => {
      const map = {
        hostel: "hostels",
        privatestay: "private-stay",
        meetingroom: "meetingroom",
        coworking: "coworking",
        cafe: "cafe",
        coliving: "coliving",
        workation: "workation",
      };
      const key = String(type || "").toLowerCase();
      return map[key] || "unknown";
    };

    const pathCompanyType = formatCompanyType(companyType);

    const safeCompanyName =
      (company.companyName || "unnamed").replace(/[^\w\- ]+/g, "").trim() ||
      "unnamed";

    const folderPath = `nomads/${pathCompanyType}/${resolvedCountry}/${safeCompanyName}`;

    const sanitizeFileName = (name) =>
      String(name || "file")
        .replace(/[/\\?%*:|"<>]/g, "_")
        .replace(/\s+/g, "_");

    // Optional per-listing logo — falls back to the host's own profile logo
    // (already set as listingData.logo above) when none is sent.
    if (req.files?.length > 0) {
      const logoFile = req.files.find((f) => f.fieldname === "logo");
      if (logoFile) {
        const logoKey = `${folderPath}/logo/${sanitizeFileName(logoFile.originalname)}`;
        const logoData = await uploadFileToS3(logoKey, logoFile);
        listingData.logo = { url: logoData.url, id: logoData.id };
      }
    }

    if (req.files?.length > 0) {
      const imageFiles = req.files.filter((f) => f.fieldname === "images");

      if (imageFiles.length > 10) {
        return res.status(400).json({ message: "Maximum 10 images allowed" });
      }

      if (imageFiles.length > 0) {
        const startIndex = listingData.images.length;

        const results = await Promise.allSettled(
          imageFiles.map((file, i) => {
            const uniqueKey = `${folderPath}/images/${sanitizeFileName(
              file.originalname,
            )}`;
            return uploadFileToS3(uniqueKey, file).then((data) => ({
              url: data.url,
              id: data.id,
              index: startIndex + i + 1,
            }));
          }),
        );

        const successes = results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value);
        listingData.images.push(...successes);
      }
    }

    try {
      const response = await axios.post(
        `${NOMADS_API_BASE_URL}/create-company`,
        listingData,
      );

      // const response = await axios.post(
      //   "http://localhost:3000/api/company/create-company",
      //   listingData,
      // );

      if (response.status !== 201) {
        return res.status(400).json({ message: "Failed to add listing" });
      }

      // Nomads' create-company endpoint doesn't accept an initial isActive
      // flag — it always creates the product active. Products added by hosts
      // must start inactive until master panel staff review and activate
      // them, so immediately deactivate it as a follow-up call.
      const newBusinessId = response.data?.company?.businessId;
      if (newBusinessId) {
        try {
          await axios.patch(
            `${NOMADS_API_BASE_URL}/activate-product`,
            { businessId: newBusinessId, status: false },
          );
        } catch (deactivateErr) {
          console.error(
            "⚠️ Failed to auto-deactivate new listing:",
            deactivateErr.response?.data || deactivateErr.message,
          );
        }
      }
    } catch (err) {
      throw err.response?.data || err.message;
    }

    return res
      .status(201)
      .json({ message: "Listing added successfully", data: listingData });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: error.message });
  } finally {
    if (hasSubmissionLock && submissionKey) {
      activeListingSubmissions.delete(submissionKey);
    }
  }
};

export const editCompanyListing = async (req, res) => {
  try {
    // const payload = req.body.data ? JSON.parse(req.body.data) : req.body;

    // const {
    //   businessId,
    //   companyId,
    //   companyType,
    //companyTitle,
    //   ratings,
    //   totalReviews,
    //   productName,
    //   cost,
    //   description,
    //   latitude,
    //   longitude,
    //   inclusions,
    //   about,
    //   address,
    //   reviews,
    //   existingImages = [],
    // } = payload;

    const {
      businessId,
      companyId,
      companyTitle,
      website,
      companyType,
      ratings,
      totalReviews,
      totalSeats,
      units,
      services,
      latitude,
      longitude,
      city,
      state,
      country,
      inclusions,
      about,
      address,
      googleMap,
      reviews,
      existingImages = [],
    } = req.body;

    console.log("listing hit🔥");

    if (!companyId || !businessId || !companyType) {
      return res.status(404).json({ message: "Missing required fields" });
    }

    const parsedReviews = normalizeListingReviews(
      typeof reviews === "string" ? JSON.parse(reviews) : reviews,
    );

    // FIX: Search by both businessId and companyId
    const company = await HostCompany.findOne({
      companyId: companyId?.trim(),
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const normalizedCountry = String(country || "").trim();
    // Only recompute continent when the country actually changed — leaves
    // the listing's stored continent untouched otherwise.
    const resolvedContinent = normalizedCountry
      ? getContinentForCountry(normalizedCountry)
      : undefined;

    const updateData = {
      businessId,
      companyType,
      companyTitle,
      website,
      ratings,
      totalReviews,
      totalSeats,
      units,
      services,
      companyName: company.companyName,
      latitude,
      longitude,
      city,
      state,
      country,
      continent: resolvedContinent,
      inclusions,
      about,
      address,
      googleMap,
      reviews: parsedReviews,
      images: [...existingImages], // Start with existing images
    };

    // ---------- LOGO / IMAGE UPLOAD (NO DELETION HERE) ----------
    const formatCompanyType = (type) => {
      const map = {
        hostel: "hostels",
        privatestay: "private-stay",
        meetingroom: "meetingroom",
        coworking: "coworking",
        cafe: "cafe",
        coliving: "coliving",
        workation: "workation",
      };
      return map[String(type).toLowerCase()] || "unknown";
    };

    const pathCompanyType = formatCompanyType(companyType);
    const safeCompanyName =
      (company.companyName || "unnamed").replace(/[^\w\- ]+/g, "").trim() ||
      "unnamed";

    const folderPath = `nomads/${pathCompanyType}/${company.companyCountry}/${safeCompanyName}`;
    const sanitize = (name) =>
      String(name || "file")
        .replace(/[/\\?%*:|"<>]/g, "_")
        .replace(/\s+/g, "_");

    // Optional per-listing logo replacement — omitted entirely (stays
    // undefined, dropped by JSON.stringify) when no new file was sent, so
    // Nomads' editCompany keeps whatever logo the listing already had.
    if (req.files?.length) {
      const logoFile = req.files.find((f) => f.fieldname === "logo");
      if (logoFile) {
        const logoKey = `${folderPath}/logo/${sanitize(logoFile.originalname)}`;
        const logoData = await uploadFileToS3(logoKey, logoFile);
        updateData.logo = { url: logoData.url, id: logoData.id };
      }
    }

    if (req.files?.length) {
      const imageFiles = req.files.filter((f) => f.fieldname === "images");

      const totalImages = imageFiles.length + existingImages.length;
      if (totalImages > 10) {
        return res.status(400).json({ message: "Maximum 10 images allowed" });
      }

      if (imageFiles.length) {
        const results = await Promise.allSettled(
          imageFiles.map(async (file) => {
            const key = `${folderPath}/images/${sanitize(file.originalname)}`;
            const data = await uploadFileToS3(key, file);
            return { url: data.url, id: data.id };
          }),
        );

        const uploaded = results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value);
        updateData.images.push(...uploaded);

        console.log("✅ Total images after upload:", updateData.images.length);
      }
    }

    // ---------- REMOTE UPDATE (NO DELETION YET) ----------
    try {
      const response = await axios.patch(
        `${NOMADS_API_BASE_URL}/update-company`,
        updateData,
      );

      // const response = await axios.patch(
      //   "http://localhost:3000/api/company/update-company",
      //   updateData,
      // );
      console.log("✅ Remote update success:", response.data);
    } catch (err) {
      console.error(
        "❌ Remote update failed:",
        err.response?.data || err.message,
      );

      // If remote update fails, delete the newly uploaded images to maintain consistency
      if (req.files?.length) {
        const imageFiles = req.files.filter((f) => f.fieldname === "images");
        if (imageFiles.length) {
          console.log(
            "🧹 Cleaning up newly uploaded images due to remote failure...",
          );
          const newlyUploadedUrls = updateData.images.slice(
            existingImages.length,
          );
          await Promise.allSettled(
            newlyUploadedUrls.map((img) => deleteFileFromS3ByUrl(img.url)),
          );
        }
      }

      //Remote company update failed
      return res.status(err.response?.status || 500).json({
        message: err.response?.data.message || err.message,
      });
    }

    return res.status(200).json({
      message: "Listing updated successfully",
      data: updateData,
    });
  } catch (error) {
    console.error("❌ Internal error:", error);
    return res.status(500).json({
      message: "Internal server error",
      detail: error.message,
    });
  }
};

export const activateProduct = async (req, res, next) => {
  try {
    const { businessId, status } = req.body;

    if (!businessId) {
      return res.status(400).json({
        message: "Business Id missing",
      });
    }

    if (typeof status !== "boolean") {
      return res.status(400).json({
        message: "Status must be true/false",
      });
    }

    const response = await axios.patch(
      `${NOMADS_API_BASE_URL}/activate-product`,
      {
        businessId,
        status,
      },
    );

    if (response.status !== 200) {
      return res.status(400).json({ message: "Failed to activate product" });
    }

    const activeStatus = status ? "active" : "inactive";
    return res.status(200).json({ message: "Status updated" });
  } catch (error) {
    next(error);
  }
};

// Nomads tracks two independent flags per listing: `isActive` (our team's
// internal review/approval — "Master Status") and `isPublic` (whether it's
// actually shown on the public Nomads website — "Host Status"). Only staff
// could flip isPublic before; this lets a host control it for their own
// listings, gated so they can only switch it ON once we've activated the
// listing (turning it OFF is always allowed).
export const setListingVisibility = async (req, res) => {
  try {
    const { businessId, companyId, isPublic } = req.body;

    const normalizedBusinessId = String(businessId || "").trim();
    if (!normalizedBusinessId) {
      return res.status(400).json({ message: "Business Id missing" });
    }
    if (typeof isPublic !== "boolean") {
      return res.status(400).json({ message: "isPublic must be true/false" });
    }

    const normalizedCompanyId = String(companyId || "").trim();
    if (!normalizedCompanyId) {
      return res.status(400).json({ message: "Company is required" });
    }

    const company = await HostCompany.findOne({ companyId: normalizedCompanyId });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const effectiveNomadsCompanyId = company.linkedNomadsCompanyId || company.companyId;

    let existingListings = [];
    try {
      const listingsResponse = await axios.get(
        `${NOMADS_API_BASE_URL}/get-listings/${encodeURIComponent(effectiveNomadsCompanyId)}`,
        { params: { t: Date.now() } },
      );
      existingListings = Array.isArray(listingsResponse.data) ? listingsResponse.data : [];
    } catch (error) {
      console.error(
        "Failed to load listings before visibility toggle:",
        axios.isAxiosError(error)
          ? { status: error.response?.status, data: error.response?.data }
          : error,
      );
      return res.status(502).json({
        message: "Unable to verify this listing. Please try again.",
      });
    }

    // Confirms the listing actually belongs to this host's company before
    // touching it — businessId alone isn't scoped to a company upstream.
    const listing = existingListings.find(
      (l) => String(l?.businessId || "") === normalizedBusinessId,
    );
    if (!listing) {
      return res.status(404).json({ message: "Listing not found for this company." });
    }

    if (isPublic && !listing.isActive) {
      return res.status(409).json({
        code: "NOMAD_LISTING_NOT_ACTIVATED",
        message:
          "This listing must be activated by our team before you can make it visible on Nomads.",
      });
    }

    try {
      await axios.patch(`${NOMADS_API_BASE_URL}/set-public-status`, {
        businessId: normalizedBusinessId,
        isPublic,
      });
    } catch (err) {
      throw err.response?.data || err.message;
    }

    return res.status(200).json({
      message: `Listing ${isPublic ? "shown on" : "hidden from"} the Nomads website.`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update listing visibility" });
  }
};

// Soft delete — gated on Visibility (isPublic), not Master Status
// (isActive): deleting is a host action, so it's gated on the flag the
// host themselves controls, not staff's. Nomads enforces the same rule
// server-side; checking it here too just avoids a round trip.
export const deleteListing = async (req, res) => {
  try {
    const { businessId, companyId } = req.body;
    const { listing, normalizedBusinessId, error } = await resolveOwnedListing(
      companyId,
      businessId,
    );
    if (error) return res.status(error.status).json(error.body);

    if (listing.isPublic) {
      return res.status(409).json({
        code: "NOMAD_LISTING_PUBLIC",
        message: "Turn off this listing's visibility before deleting it.",
      });
    }

    try {
      await axios.patch(`${NOMADS_API_BASE_URL}/soft-delete-product`, {
        businessId: normalizedBusinessId,
        deletedBy: "host",
      });
    } catch (err) {
      if (err.response?.status) {
        return res.status(err.response.status).json(err.response.data);
      }
      throw err;
    }

    return res.status(200).json({ message: "Listing deleted." });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete listing" });
  }
};

// Host asks staff to restore a listing they deleted — doesn't restore it
// itself, just flags it so Master Panel's Recover action shows up.
export const requestNomadListingRecovery = async (req, res) => {
  try {
    const { businessId, companyId } = req.body;
    const { listing, normalizedBusinessId, error } = await resolveOwnedListing(
      companyId,
      businessId,
    );
    if (error) return res.status(error.status).json(error.body);

    if (!listing.isDeleted) {
      return res.status(409).json({ message: "This listing isn't deleted." });
    }
    if (listing.recoveryRequested) {
      return res.status(200).json({ message: "Recovery already requested." });
    }

    try {
      await axios.patch(`${NOMADS_API_BASE_URL}/request-listing-recovery`, {
        businessId: normalizedBusinessId,
      });
    } catch (err) {
      if (err.response?.status) {
        return res.status(err.response.status).json(err.response.data);
      }
      throw err;
    }

    return res.status(200).json({
      message: "Recovery requested — our team will review it.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to request recovery" });
  }
};

export const getAllCompanyListings = async (req, res) => {
  try {
    const response = await axios.get(
      `${NOMADS_API_BASE_URL}/companies`,
    );

    if (!response.data) {
      return res.status(200).json([]);
    }

    return res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCompanyListings = async (req, res) => {
  try {
    const response = await axios.get(
      `${NOMADS_API_BASE_URL}/companies`,
    );

    if (!response.data) {
      return res.status(200).json([]);
    }

    return res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Host asks master panel staff to create a matching Companies-page entry
// for the listing(s) they've already added themselves — reviewed manually,
// never auto-matched (company names aren't unique enough to trust).
export const requestCompaniesListing = async (req, res) => {
  try {
    const authedUser = await HostUser.findById(req.user)
      .select("companyId company")
      .lean()
      .exec();

    if (!authedUser) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const company =
      (authedUser.companyId &&
        (await HostCompany.findOne({ companyId: authedUser.companyId }))) ||
      (authedUser.company && (await HostCompany.findById(authedUser.company)));

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    if (company.linkedNomadsCompanyId) {
      return res.status(400).json({
        message: "This company is already linked to an existing Companies entry.",
      });
    }

    if (company.companiesListingRequestedAt) {
      return res.status(200).json({
        message: "A request is already pending review by our team.",
      });
    }

    const requestedTypes = Array.isArray(req.body?.types)
      ? [...new Set(req.body.types.map((t) => normalizeListingType(t)).filter(Boolean))]
      : [];

    if (!requestedTypes.length) {
      return res.status(400).json({
        message: "Select at least one product type to request.",
      });
    }

    const selectedPlan = await getNomadListingPlan(String(req.user));
    const productTypeLimit =
      selectedPlan === "custom" ? null : selectedPlan === "professional" ? 3 : 2;

    if (productTypeLimit !== null && requestedTypes.length > productTypeLimit) {
      const planName = selectedPlan === "professional" ? "Professional" : "Basic";
      return res.status(409).json({
        code: "NOMAD_LISTING_TYPE_LIMIT_REACHED",
        message: `${planName} plan allows only ${productTypeLimit} product types. Select up to ${productTypeLimit}, or upgrade your plan.`,
        typeLimit: productTypeLimit,
      });
    }

    company.companiesListingRequestedAt = new Date();
    company.companiesListingRequestedTypes = requestedTypes;
    await company.save();

    return res.status(200).json({
      message: "Request sent — our team will review and get back to you.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

