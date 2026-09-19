// @ts-nocheck
import axios from "axios";
import HostCompany from "../models/Company.js";
import HostUser from "../models/HostUser.js";
import { getContinentForCountry } from "../utils/countryContinent.js";
import { uploadFileToS3 } from "../config/s3config.js";

// Same Nomads backend listingControllers.ts already reads via
// REVIEW_API_BASE_URL — reused here rather than a second env var.
const NOMADS_API_BASE_URL = `${String(
  process.env.REVIEW_API_BASE_URL || "https://wono.co",
).replace(/\/+$/, "")}/api/company`;

const MASTER_PANEL_BASE_URL = String(
  process.env.MASTER_PANEL_BASE_URL || "http://localhost:5007",
).replace(/\/+$/, "");

// Server-to-server shared secret — see
// D:\WoNoMasterPanel\server\middlewares\verifyHostPanelServiceKey.js.
const masterPanelHeaders = () => ({
  "x-hostpanel-service-key": process.env.HOSTPANEL_SERVICE_API_KEY,
});

// Same mapping Nomads' own VerifyBusiness.jsx uses to derive Industry / Type
// of Vertical from a company's actual listings.
const COMPANY_TYPE_TO_INDUSTRY = {
  coworking: "Co-working",
  coliving: "Co-living",
  hostel: "Hostel",
  workation: "Workation",
  meetingroom: "Meetings",
  cafe: "Cafe",
};

// Proof-of-registration documents a host can attach. The first two are
// mandatory - staff need at least a registration certificate plus a tax ID to
// check the business (and so its listings) is real.
const VERIFICATION_DOCUMENT_TYPES = [
  { key: "business_registration", label: "Business Registration Certificate", required: true },
  { key: "tax_id", label: "Tax / GST Registration", required: true },
  { key: "address_proof", label: "Business Address Proof", required: false },
  { key: "signatory_id", label: "Authorized Signatory ID", required: false },
];

// Shared by every handler below: resolves the logged-in host's HostCompany
// and their live Nomads listings, mirroring resolveOwnedListing's shape in
// listingControllers.ts. Returns either the context or `{ error }`, never both.
const resolveHostContext = async (req) => {
  const authedUser = await HostUser.findById(req.user).lean().exec();
  if (!authedUser) {
    return { error: { status: 401, body: { message: "Not authenticated" } } };
  }

  const company =
    (authedUser.companyId &&
      (await HostCompany.findOne({ companyId: authedUser.companyId }))) ||
    (authedUser.company && (await HostCompany.findById(authedUser.company)));

  if (!company) {
    return { error: { status: 404, body: { message: "Company not found" } } };
  }

  const effectiveNomadsCompanyId =
    company.linkedNomadsCompanyId || company.companyId;

  let listings = [];
  try {
    const response = await axios.get(
      `${NOMADS_API_BASE_URL}/get-listings/${encodeURIComponent(effectiveNomadsCompanyId)}`,
      { params: { t: Date.now() } },
    );
    listings = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    // No listings yet (Nomads 404s when a companyId has none) — not fatal,
    // the caller just sees an empty/ineligible state.
    listings = [];
  }

  return { authedUser, company, effectiveNomadsCompanyId, listings };
};

const fetchVerificationStatus = async (companyId: string) => {
  const response = await axios.get(
    `${MASTER_PANEL_BASE_URL}/api/hostpanel/verification-requests`,
    { headers: masterPanelHeaders(), params: { companyId } },
  );
  return response.data?.data || null;
};

// GET /api/verify-business/overview — current listings + eligibility +
// verification status, so the frontend can decide which action to show
// (Get Verified / Pay Now / Renew / Change Plan).
export const getVerifyBusinessOverview = async (req, res) => {
  try {
    const context = await resolveHostContext(req);
    if (context.error) {
      return res.status(context.error.status).json(context.error.body);
    }
    const { authedUser, company, effectiveNomadsCompanyId, listings } =
      context;

    const eligibleListings = listings.filter((l) => l.isActive && l.isPublic);

    let verification = null;
    try {
      verification = await fetchVerificationStatus(effectiveNomadsCompanyId);
    } catch (error) {
      console.error("Failed to fetch verification status:", error.message);
    }

    const industry = [
      ...new Set(
        eligibleListings
          .map((l) => COMPANY_TYPE_TO_INDUSTRY[l.companyType])
          .filter(Boolean),
      ),
    ];

    return res.status(200).json({
      companyId: effectiveNomadsCompanyId,
      companyName: company.companyName,
      listings,
      eligible: eligibleListings.length > 0,
      verification,
      documentTypes: VERIFICATION_DOCUMENT_TYPES,
      prefill: {
        fullName: authedUser.name || "",
        email: authedUser.email || "",
        mobile: authedUser.phone || "",
        role: authedUser.designation || "",
        registeredCompanyName:
          company.registeredEntityName || company.companyName || "",
        companyCountry: company.companyCountry || "",
        companyState: company.companyState || "",
        companyCity: company.companyCity || "",
        websiteUrl: company.websiteURL || "",
        industry,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/verify-business/request - multipart. Submits the business for
// staff review with its proof documents. Text fields come in as strings;
// each document file is sent under its document-type key (see
// VERIFICATION_DOCUMENT_TYPES). Files go straight to S3 here and only their
// URLs travel on to the master panel / Nomads.
export const submitVerifyBusinessRequest = async (req, res) => {
  try {
    const context = await resolveHostContext(req);
    if (context.error) {
      return res.status(context.error.status).json(context.error.body);
    }
    const { company, effectiveNomadsCompanyId, listings } = context;

    const eligibleListings = listings.filter((l) => l.isActive && l.isPublic);
    if (!eligibleListings.length) {
      return res.status(400).json({
        message:
          "You need at least one active, public listing before requesting verification.",
      });
    }

    const body = req.body || {};
    const { requestedTier } = body;
    if (!["1m", "3m", "6m", "1y"].includes(requestedTier)) {
      return res
        .status(400)
        .json({ message: "requestedTier must be one of 1m, 3m, 6m, 1y" });
    }

    const requiredText = [
      "fullName",
      "email",
      "mobile",
      "role",
      "registeredCompanyName",
      "companyCountry",
      "companyState",
      "companyCity",
    ];
    const missing = requiredText.find((k) => !String(body[k] || "").trim());
    if (missing) {
      return res.status(400).json({ message: `${missing} is required` });
    }

    const filesByKey = {};
    (req.files || []).forEach((f) => {
      filesByKey[f.fieldname] = f;
    });
    const missingDoc = VERIFICATION_DOCUMENT_TYPES.find(
      (d) => d.required && !filesByKey[d.key] && !body[`existing_${d.key}`],
    );
    if (missingDoc) {
      return res
        .status(400)
        .json({ message: `${missingDoc.label} is required` });
    }

    const proofDocuments = [];
    for (const docType of VERIFICATION_DOCUMENT_TYPES) {
      const file = filesByKey[docType.key];
      if (file) {
        const safeName = String(file.originalname || "file").replace(
          /[^a-zA-Z0-9._-]/g,
          "_",
        );
        const uploaded = await uploadFileToS3(
          `verification-documents/${effectiveNomadsCompanyId}/${docType.key}-${Date.now()}-${safeName}`,
          file,
        );
        proofDocuments.push({
          label: docType.label,
          url: uploaded.url,
          id: uploaded.id,
        });
      } else if (body[`existing_${docType.key}`]) {
        // Resubmission after a rejection: keep the document already on file
        // for this slot instead of forcing the host to re-upload it.
        proofDocuments.push({
          label: docType.label,
          url: body[`existing_${docType.key}`],
          id: body[`existing_${docType.key}_id`] || "",
        });
      }
    }

    const industry = [
      ...new Set(
        eligibleListings
          .map((l) => COMPANY_TYPE_TO_INDUSTRY[l.companyType])
          .filter(Boolean),
      ),
    ];

    const payload = {
      companyId: effectiveNomadsCompanyId,
      companyName: company.companyName,
      businessName: company.companyName,
      verticalsSnapshot: eligibleListings.map((l) => ({
        businessId: l.businessId,
        companyType: l.companyType,
        city: l.city,
      })),
      fullName: body.fullName.trim(),
      email: body.email.trim(),
      mobile: body.mobile.trim(),
      role: body.role.trim(),
      country: body.companyCountry.trim(),
      industry,
      registeredCompanyName: body.registeredCompanyName.trim(),
      companyCountry: body.companyCountry.trim(),
      companyState: body.companyState.trim(),
      companyCity: body.companyCity.trim(),
      continent:
        company.companyContinent ||
        getContinentForCountry(body.companyCountry.trim()),
      websiteUrl: String(body.websiteUrl || company.websiteURL || "").trim(),
      requestedTier,
      proofDocuments,
    };

    const response = await axios.post(
      `${MASTER_PANEL_BASE_URL}/api/hostpanel/verification-requests`,
      payload,
      { headers: masterPanelHeaders() },
    );

    return res.status(200).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    return res
      .status(status)
      .json({ message: error.response?.data?.message || error.message });
  }
};

// POST /api/verify-business/pay - once staff have approved the request (or
// for renew / change plan on an already-verified company), returns a Stripe
// payment link to redirect the host to. Body: { requestedTier }.
export const payVerifyBusiness = async (req, res) => {
  try {
    const context = await resolveHostContext(req);
    if (context.error) {
      return res.status(context.error.status).json(context.error.body);
    }
    const { effectiveNomadsCompanyId } = context;

    const { requestedTier } = req.body || {};
    if (!["1m", "3m", "6m", "1y"].includes(requestedTier)) {
      return res
        .status(400)
        .json({ message: "requestedTier must be one of 1m, 3m, 6m, 1y" });
    }

    const response = await axios.post(
      `${MASTER_PANEL_BASE_URL}/api/hostpanel/verification-requests/pay`,
      { companyId: effectiveNomadsCompanyId, requestedTier },
      { headers: masterPanelHeaders() },
    );

    return res.status(200).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    return res
      .status(status)
      .json({ message: error.response?.data?.message || error.message });
  }
};

// PATCH /api/verify-business/badge-visibility — display-only toggle for one
// listing's blue badge. Body: { businessId, hidden }. Never touches the
// underlying paid verification/expiry, so it can be flipped back on for
// free once a listing has already been verified.
export const setVerifyBusinessBadgeVisibility = async (req, res) => {
  try {
    const { businessId, hidden } = req.body || {};
    if (!businessId) {
      return res.status(400).json({ message: "businessId is required" });
    }

    const context = await resolveHostContext(req);
    if (context.error) {
      return res.status(context.error.status).json(context.error.body);
    }
    const { listings } = context;
    const ownsListing = listings.some((l) => l.businessId === businessId);
    if (!ownsListing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    const response = await axios.patch(
      `${MASTER_PANEL_BASE_URL}/api/hostpanel/verification-requests/badge-visibility`,
      { businessId, hidden: Boolean(hidden) },
      { headers: masterPanelHeaders() },
    );

    return res.status(200).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    return res
      .status(status)
      .json({ message: error.response?.data?.message || error.message });
  }
};

// GET /api/verify-business/history — every past payment attempt (initial,
// renewals, upgrades/downgrades) for this host's company.
export const getVerifyBusinessHistory = async (req, res) => {
  try {
    const context = await resolveHostContext(req);
    if (context.error) {
      return res.status(context.error.status).json(context.error.body);
    }
    const { effectiveNomadsCompanyId } = context;

    let verification = null;
    try {
      verification = await fetchVerificationStatus(effectiveNomadsCompanyId);
    } catch (error) {
      console.error("Failed to fetch verification status:", error.message);
    }

    if (!verification?._id) {
      return res.status(200).json({ data: [] });
    }

    const historyResponse = await axios.get(
      `${MASTER_PANEL_BASE_URL}/api/hostpanel/verification-requests/${verification._id}/history`,
      { headers: masterPanelHeaders() },
    );

    return res.status(200).json(historyResponse.data);
  } catch (error) {
    const status = error.response?.status || 500;
    return res
      .status(status)
      .json({ message: error.response?.data?.message || error.message });
  }
};
