// @ts-nocheck
import axios from "axios";
import HostCompany from "../models/Company.js";
import HostUser from "../models/HostUser.js";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import { deleteFileFromS3ByUrl, uploadFileToS3 } from "../config/s3config.js";
import { getContinentForCountry } from "../utils/countryContinent.js";

const activeListingSubmissions = new Set<string>();

const normalizeListingType = (value: unknown) =>
  String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

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
      cost,
      description,
      latitude,
      longitude,
      inclusions,
      about,
      address,
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

    // Workspace Setup never asks the host for a continent, so most Host
    // Company records have it blank — Nomads requires it on every listing,
    // so derive it from country when it's missing.
    const resolvedContinent =
      company.companyContinent || getContinentForCountry(company.companyCountry);

    if (!resolvedContinent) {
      return res.status(400).json({
        message:
          "Could not determine continent for this listing — please set the company's country in Workspace Settings first.",
      });
    }

    // If staff have already linked this Host Company to an existing Nomads
    // company (via Transfer), new products must attach to that same Nomads
    // company — not create a second, disconnected one under this record's
    // own companyId.
    const effectiveNomadsCompanyId = company.linkedNomadsCompanyId || company.companyId;

    const selectedPlan = await getNomadListingPlan(userId);
    const listingLimit = selectedPlan === "custom" ? null : selectedPlan === "professional" ? 4 : 2;
    let existingListings = [];
    try {
      const listingsResponse = await axios.get(
        `https://wononomadsbe.vercel.app/api/company/get-listings/${encodeURIComponent(effectiveNomadsCompanyId)}`,
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
    if (
      normalizedRequestedType &&
      existingListings.some(
        (listing) => normalizeListingType(listing?.companyType) === normalizedRequestedType,
      )
    ) {
      return res.status(409).json({
        code: "NOMAD_LISTING_TYPE_EXISTS",
        message: "This Nomad listing type has already been added.",
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
      city: company.companyCity,
      state: company.companyState,
      country: company.companyCountry,
      continent: resolvedContinent,
      website: company.websiteLink,
      companyType: companyType,
      ratings: ratings,
      totalReviews: totalReviews,
      // productName: productName,
      cost: cost,
      description: description,
      latitude: latitude,
      longitude: longitude,
      inclusions: inclusions,
      about: about,
      address: address,
      reviews: parsedReviews,
      images: [],
    };

    //Upload images

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

    const folderPath = `nomads/${pathCompanyType}/${company.companyCountry}/${safeCompanyName}`;

    if (req.files?.length > 0) {
      const imageFiles = req.files.filter((f) => f.fieldname === "images");

      if (imageFiles.length > 10) {
        return res.status(400).json({ message: "Maximum 10 images allowed" });
      }

      if (imageFiles.length > 0) {
        const startIndex = listingData.images.length;

        const sanitizeFileName = (name) =>
          String(name || "file")
            .replace(/[/\\?%*:|"<>]/g, "_")
            .replace(/\s+/g, "_");

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
        "https://wononomadsbe.vercel.app/api/company/create-company",
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
            "https://wononomadsbe.vercel.app/api/company/activate-product",
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
      companyType,
      ratings,
      totalReviews,
      productName,
      cost,
      description,
      latitude,
      longitude,
      inclusions,
      about,
      address,
      reviews,
      existingImages = [],
    } = req.body;

    console.log("listing hit🔥");

    if (!companyId || !businessId || !companyType) {
      return res.status(404).json({ message: "Missing required fields" });
    }

    const parsedReviews =
      typeof reviews === "string" ? JSON.parse(reviews) : reviews;

    // FIX: Search by both businessId and companyId
    const company = await HostCompany.findOne({
      companyId: companyId?.trim(),
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const updateData = {
      businessId,
      companyType,
      companyTitle,
      ratings,
      totalReviews,
      companyName: company.companyName,
      cost,
      description,
      latitude,
      longitude,
      inclusions,
      about,
      address,
      reviews: parsedReviews,
      images: [...existingImages], // Start with existing images
    };

    // ---------- IMAGE UPLOAD (NO DELETION HERE) ----------
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

    if (req.files?.length) {
      const imageFiles = req.files.filter((f) => f.fieldname === "images");

      const totalImages = imageFiles.length + existingImages.length;
      if (totalImages > 10) {
        return res.status(400).json({ message: "Maximum 10 images allowed" });
      }

      if (imageFiles.length) {
        const sanitize = (name) =>
          String(name || "file")
            .replace(/[/\\?%*:|"<>]/g, "_")
            .replace(/\s+/g, "_");

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
        "https://wononomadsbe.vercel.app/api/company/update-company",
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
      "https://wononomadsbe.vercel.app/api/company/activate-product",
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

export const getAllCompanyListings = async (req, res) => {
  try {
    const response = await axios.get(
      "https://wononomadsbe.vercel.app/api/company/companies",
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
      "https://wononomadsbe.vercel.app/api/company/companies",
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

    company.companiesListingRequestedAt = new Date();
    await company.save();

    return res.status(200).json({
      message: "Request sent — our team will review and get back to you.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

