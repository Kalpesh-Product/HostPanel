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

// Proof documents for a verification request: at least 1, at most this many.
// They start from the business documents the host already uploaded while
// creating their first business location, and the host can add more.
const MAX_PROOF_DOCUMENTS = 5;

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

// A host can request verification once they have at least one active, public
// listing — OR once their request to bring existing wono.co listings into this
// account has been approved (those listings then belong to them even if some
// are still switched off).
const isExistingListingsClaimApproved = (company) =>
  Boolean(company?.linkedNomadsCompanyId) ||
  company?.existingCompanyClaim?.status === "approved";

const resolveVerificationEligibility = (company, listings) => {
  const activeListings = listings.filter((l) => l.isActive && l.isPublic);
  const claimApproved = isExistingListingsClaimApproved(company);
  return {
    eligible: activeListings.length > 0 || (claimApproved && listings.length > 0),
    // Listings the request is about; falls back to all of them when eligibility
    // came from an approved claim rather than from active listings.
    requestListings: activeListings.length ? activeListings : listings,
    claimApproved,
  };
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

    const { eligible, requestListings } = resolveVerificationEligibility(
      company,
      listings,
    );

    let verification = null;
    try {
      verification = await fetchVerificationStatus(effectiveNomadsCompanyId);
    } catch (error) {
      console.error("Failed to fetch verification status:", error.message);
    }

    const industry = [
      ...new Set(
        requestListings
          .map((l) => COMPANY_TYPE_TO_INDUSTRY[l.companyType])
          .filter(Boolean),
      ),
    ];

    return res.status(200).json({
      companyId: effectiveNomadsCompanyId,
      companyName: company.companyName,
      listings,
      eligible,
      verification,
      // Pulled from onboarding so the host isn't asked for them again.
      onboardingDocuments: (company.agreementAcceptance?.businessDocuments || [])
        .filter((doc) => doc?.url)
        .map((doc) => ({ url: doc.url, id: doc.id || "", name: doc.name || "Document" })),
      maxDocuments: MAX_PROOF_DOCUMENTS,
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

// GET /api/verify-business/summary — just the verification record, for
// dashboard banners (free period ending / badge expired). Deliberately skips
// the Nomads listings fetch the full overview does.
export const getVerifyBusinessSummary = async (req, res) => {
  try {
    const authedUser = await HostUser.findById(req.user).lean().exec();
    if (!authedUser) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const company =
      (authedUser.companyId &&
        (await HostCompany.findOne({ companyId: authedUser.companyId }).lean())) ||
      (authedUser.company && (await HostCompany.findById(authedUser.company).lean()));
    if (!company) return res.status(200).json({ verification: null });

    let verification = null;
    try {
      verification = await fetchVerificationStatus(
        company.linkedNomadsCompanyId || company.companyId,
      );
    } catch (error) {
      console.error("Failed to fetch verification status:", error.message);
    }
    return res.status(200).json({
      verification: verification
        ? {
            status: verification.status,
            paymentStatus: verification.paymentStatus,
            isFreePeriod: Boolean(verification.isFreePeriod),
            activeTier: verification.activeTier || null,
            verificationStartsAt: verification.verificationStartsAt || null,
            verificationExpiresAt: verification.verificationExpiresAt || null,
          }
        : null,
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

    const { eligible, requestListings: eligibleListings } =
      resolveVerificationEligibility(company, listings);
    if (!eligible) {
      return res.status(400).json({
        message:
          "Add and activate at least one listing (or get your existing wono.co listings approved) before requesting verification.",
      });
    }

    const body = req.body || {};
    // The badge is free for the first 3 months, so no plan is chosen up front;
    // "1m" is just the default renewal plan recorded on the request.
    const requestedTier = ["1m", "1y"].includes(body.requestedTier)
      ? body.requestedTier
      : "1m";

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

    // Documents already on file — the onboarding ones, or those from an earlier
    // submission — come back as references. Only files this company itself
    // uploaded are accepted, since the client sends them back verbatim.
    let existingDocuments = [];
    try {
      existingDocuments = JSON.parse(body.existingDocuments || "[]");
    } catch {
      existingDocuments = [];
    }
    const allowedPrefixes = [
      `host-setup-documents/${company.companyId}/`,
      `verification-documents/${effectiveNomadsCompanyId}/`,
      `company-claim-documents/${company.companyId}/`,
    ];
    const keptDocuments = (Array.isArray(existingDocuments) ? existingDocuments : [])
      .filter(
        (doc) =>
          doc &&
          typeof doc.id === "string" &&
          typeof doc.url === "string" &&
          allowedPrefixes.some((prefix) => doc.id.startsWith(prefix)) &&
          doc.url.endsWith(`/${doc.id}`),
      )
      .map((doc) => ({
        label: String(doc.name || "Document").slice(0, 200),
        url: doc.url,
        id: doc.id,
      }));
    const newFiles = (req.files || []).filter((f) => f.fieldname === "documents");

    const totalDocuments = keptDocuments.length + newFiles.length;
    if (totalDocuments < 1) {
      return res.status(400).json({
        message: "Add at least one document that verifies your business.",
      });
    }
    if (totalDocuments > MAX_PROOF_DOCUMENTS) {
      return res.status(400).json({
        message: `You can submit up to ${MAX_PROOF_DOCUMENTS} documents.`,
      });
    }

    const proofDocuments = [...keptDocuments];
    for (const file of newFiles) {
      const safeName = String(file.originalname || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
      const uploaded = await uploadFileToS3(
        `verification-documents/${effectiveNomadsCompanyId}/document-${Date.now()}-${safeName}`,
        file,
      );
      proofDocuments.push({
        label: String(file.originalname || "Document").slice(0, 200),
        url: uploaded.url,
        id: uploaded.id,
      });
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
    if (!["1m", "1y"].includes(requestedTier)) {
      return res
        .status(400)
        .json({ message: "requestedTier must be one of 1m, 1y" });
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
