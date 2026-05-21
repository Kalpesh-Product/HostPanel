// @ts-nocheck
import axios from "axios";
import WebsiteTemplate from "../models/website/WebsiteTemplate.js";

export const getLeads = async (req, res, next) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const leads = await axios.get(
      `https://wononomadsbe.vercel.app/api/company/leads?companyId=${companyId}`
    );

    // If successful, return the data
    return res.status(200).json(leads.data);
  } catch (error) {
    console.error("Get Leads Error:", error);

    // Handle Axios errors (from external API)
    if (error.response) {
      // The external API responded with an error status code
      const statusCode = error.response.status;
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        "Failed to fetch leads";

      console.error(`External API error (${statusCode}):`, errorMessage);

      return res.status(statusCode).json({
        message: errorMessage,
        error: "External API error",
      });
    } else if (error.request) {
      // The request was made but no response was received (network error, timeout, etc.)
      console.error("No response from external API:", error.message);

      return res.status(503).json({
        message: "External API is not responding. Please try again later.",
        error: "Service unavailable",
      });
    } else {
      // Something else happened
      // console.error("Unexpected error:", error.message);

      return res.status(500).json({
        message: "An unexpected error occurred",
        error: error.message,
      });
    }
  }
};

export const updateLeads = async (req, res, next) => {
  try {
    const { status = "", comment = "", leadId } = req.body;

    if ((!leadId && typeof status !== boolean) || (!leadId && !comment)) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const leads = await axios.patch(
      `https://wononomadsbe.vercel.app/api/company/update-lead`,
      req.body
    );

    if (leads.status !== 200)
      return res.status(200).json({ message: "No leads found" });

    return res
      .status(200)
      .json({ message: `Lead ${comment ? "comment" : "status"} updated` });
  } catch (error) {
    next(error);
  }
};

const sanitizeValue = (value) => String(value || "").trim();

const resolveTemplateFromRequest = async (req) => {
  const body = req.body || {};
  const query = req.query || {};

  const searchKeyCandidates = [
    body.searchKey,
    query.searchKey,
    body.websiteSlug,
    query.websiteSlug,
    body.companySlug,
    query.companySlug,
  ]
    .map(sanitizeValue)
    .filter(Boolean)
    .map((v) => v.toLowerCase());

  for (const searchKey of searchKeyCandidates) {
    const template = await WebsiteTemplate.findOne({ searchKey }).lean().exec();
    if (template) return template;
  }

  const hostHeader = sanitizeValue(req.headers?.host || "").toLowerCase();
  const hostSubdomain = hostHeader.split(":")[0].split(".")[0];
  if (hostSubdomain && !["www", "wono"].includes(hostSubdomain)) {
    const template = await WebsiteTemplate.findOne({
      searchKey: hostSubdomain,
    })
      .lean()
      .exec();
    if (template) return template;
  }

  const companyId = sanitizeValue(body.companyId || query.companyId);
  if (companyId) {
    const template = await WebsiteTemplate.findOne({ companyId }).lean().exec();
    if (template) return template;
  }

  const companyName = sanitizeValue(body.companyName || query.companyName);
  if (companyName) {
    const escaped = companyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const template = await WebsiteTemplate.findOne({
      companyName: { $regex: new RegExp(`^${escaped}$`, "i") },
    })
      .lean()
      .exec();
    if (template) return template;
  }

  return null;
};

export const createWebsiteLead = async (req, res) => {
  try {
    const body = req.body || {};
    const template = await resolveTemplateFromRequest(req);

    const visitorName = sanitizeValue(body.name || body.fullName || body.leadName);
    const visitorEmail = sanitizeValue(body.email);
    const visitorPhone = sanitizeValue(body.phone || body.mobile || body.contactNumber);
    const visitorMessage = sanitizeValue(body.message || body.comments || body.comment);

    const resolvedCompanyName = sanitizeValue(
      body.companyName ||
        template?.companyName ||
        template?.registeredCompanyName ||
        template?.searchKey,
    );
    const resolvedCompanyId = sanitizeValue(body.companyId || template?.companyId);
    const resolvedSource = sanitizeValue(body.source) || "website";

    if (!visitorName || !visitorEmail || !visitorPhone) {
      return res.status(400).json({
        message: "name, email and phone are required",
      });
    }

    if (!resolvedCompanyName) {
      return res.status(400).json({
        message: "Unable to resolve companyName for this website lead",
      });
    }

    const payload = {
      ...body,
      name: visitorName,
      email: visitorEmail,
      phone: visitorPhone,
      mobile: visitorPhone,
      message: visitorMessage,
      comments: visitorMessage,
      companyName: resolvedCompanyName,
      companyId: resolvedCompanyId,
      source: resolvedSource,
    };

    const upstreamEndpoints = [
      "https://wononomadsbe.vercel.app/api/company/create-lead",
      "https://wononomadsbe.vercel.app/api/company/createLead",
      "https://wononomadsbe.vercel.app/api/company/leads",
    ];

    let lastError = null;
    for (const endpoint of upstreamEndpoints) {
      try {
        const upstream = await axios.post(endpoint, payload);
        return res.status(upstream.status || 201).json(upstream.data);
      } catch (error) {
        lastError = error;
      }
    }

    const status = lastError?.response?.status || 500;
    const message =
      lastError?.response?.data?.message ||
      lastError?.response?.data?.error ||
      lastError?.message ||
      "Failed to create website lead";

    return res.status(status).json({ message });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Failed to create website lead",
    });
  }
};

