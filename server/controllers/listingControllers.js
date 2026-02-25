import axios from "axios";
import HostCompany from "../models/Company.js";
import { deleteFileFromS3ByUrl, uploadFileToS3 } from "../config/s3config.js";

export const createCompanyListing = async (req, res) => {
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

    let parsedReviews;

    const company = await HostCompany.findOne({ companyId: companyId.trim() });

    if (!company) {
      return res.status(400).json({ message: "Company not found" });
    }

    if (typeof reviews === "string") {
      parsedReviews = JSON.parse(reviews);
    }

    const listingData = {
      companyName: companyName,
      companyTitle: companyTitle ? companyTitle : company.companyName,
      registeredEntityName: company.registeredEntityName,
      companyId: company.companyId,
      logo: company.logo,
      city: company.companyCity,
      state: company.companyState,
      country: company.companyCountry,
      continent: company.companyContinent,
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
    } catch (err) {
      throw err.response?.data || err.message;
    }

    return res
      .status(201)
      .json({ message: "Listing added successfully", data: listingData });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: error.message });
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
