import axios from "axios";
import HostCompany from "../models/Company.js";
import { uploadFileToS3 } from "../config/s3config.js";

export const createCompanyListing = async (req, res) => {
  try {
    const {
      companyId,
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
      companyName: company.companyName,
      companyId: company.companyId,
      logo: company.logo,
      city: company.companyCity,
      state: company.companyState,
      country: company.companyCountry,
      website: company.websiteLink,
      companyType: companyType,
      ratings: ratings,
      totalReviews: totalReviews,
      productName: productName,
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

      if (imageFiles.length > 0) {
        const startIndex = listingData.images.length;

        const sanitizeFileName = (name) =>
          String(name || "file")
            .replace(/[/\\?%*:|"<>]/g, "_")
            .replace(/\s+/g, "_");

        const results = await Promise.allSettled(
          imageFiles.map((file, i) => {
            const uniqueKey = `${folderPath}/images/${sanitizeFileName(
              file.originalname
            )}`;
            return uploadFileToS3(uniqueKey, file).then((url) => ({
              url,
              index: startIndex + i + 1,
            }));
          })
        );

        const successes = results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value);
        listingData.images.push(...successes);
      }
    }

    const response = await axios.post(
      "https://wononomadsbe.vercel.app/api/company/create-company",
      listingData
    );

    if (!response.data) {
      return res.status(400).json({ message: "Failed to add listing" });
    }

    return res
      .status(201)
      .json({ message: "Listing added successfully", data: listingData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const editCompanyListing = async (req, res) => {
  try {
    const {
      businessId,
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

    if (!businessId) {
      return res.status(400).json({ message: "Business ID missing" });
    }
    let parsedReviews;
    if (typeof reviews === "string") {
      parsedReviews = JSON.parse(reviews);
    }

    // Fetch base company info
    const company = await HostCompany.findOne({
      companyId: req.body.companyId?.trim(),
    });

    if (!company) {
      return res.status(400).json({ message: "Company not found" });
    }

    const updateData = {
      businessId,
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
      reviews: parsedReviews,
      images: [...existingImages], // start with existing images
    };

    /** ---------------- IMAGE UPLOAD LOGIC ---------------- **/
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

      if (imageFiles.length > 0) {
        const sanitizeFileName = (name) =>
          String(name || "file")
            .replace(/[/\\?%*:|"<>]/g, "_")
            .replace(/\s+/g, "_");

        const results = await Promise.allSettled(
          imageFiles.map((file) => {
            const uniqueKey = `${folderPath}/images/${sanitizeFileName(
              file.originalname
            )}`;
            return uploadFileToS3(uniqueKey, file).then((url) => ({
              url,
            }));
          })
        );

        const uploaded = results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value);

        updateData.images.push(...uploaded);
      }
    }

    /** ---------------- CALL REMOTE EDIT CONTROLLER ---------------- **/
    const response = await axios.patch(
      `https://wononomadsbe.vercel.app/api/company/update-company`,
      updateData
    );

    if (!response.data) {
      return res.status(400).json({ message: "Failed to update listing" });
    }

    return res.status(200).json({
      message: "Listing updated successfully",
      data: updateData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const getAllCompanyListings = async (req, res) => {
  try {
    const response = await axios.get(
      "https://wononomadsbe.vercel.app/api/company/companies"
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
      "https://wononomadsbe.vercel.app/api/company/companies"
    );

    if (!response.data) {
      return res.status(200).json([]);
    }

    return res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
