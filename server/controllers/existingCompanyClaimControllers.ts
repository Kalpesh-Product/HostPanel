// @ts-nocheck
import axios from "axios";
import HostCompany from "../models/Company.js";
import HostUser from "../models/HostUser.js";
import { uploadFileToS3 } from "../config/s3config.js";

const MASTER_PANEL_BASE_URL = String(
  process.env.MASTER_PANEL_BASE_URL || "http://localhost:5007",
).replace(/\/+$/, "");

// Server-to-server shared secret — see verifyHostPanelServiceKey.js in the
// master panel.
const masterPanelHeaders = () => ({
  "x-hostpanel-service-key": process.env.HOSTPANEL_SERVICE_API_KEY,
});

// One shared document set covers every listing under the claimed company, so
// the first two are mandatory: staff need a registration certificate plus a
// tax ID to trust that the business (and so all its listings) is really theirs.
const CLAIM_DOCUMENT_TYPES = [
  { key: "business_registration", label: "Business Registration Certificate", required: true },
  { key: "tax_id", label: "Tax / GST Registration", required: true },
  { key: "address_proof", label: "Business Address Proof", required: false },
  { key: "signatory_id", label: "Authorized Signatory ID", required: false },
];

const resolveHostCompany = async (req) => {
  const authedUser = await HostUser.findById(req.user)
    .select("companyId company name email phone designation")
    .lean()
    .exec();
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
  return { company, authedUser };
};

const forwardMasterError = (res, error) =>
  res.status(error?.response?.status || 500).json({
    message: error?.response?.data?.message || error?.message || "Request failed",
  });

// GET /api/listings/existing-company/search?q=
export const searchExistingCompanies = async (req, res) => {
  try {
    const context = await resolveHostCompany(req);
    if (context.error) return res.status(context.error.status).json(context.error.body);

    const response = await axios.get(
      `${MASTER_PANEL_BASE_URL}/api/hostpanel/nomad-companies/search`,
      { headers: masterPanelHeaders(), params: { q: req.query.q || "" }, timeout: 10000 },
    );
    return res.status(200).json(response.data);
  } catch (error) {
    return forwardMasterError(res, error);
  }
};

// GET /api/listings/existing-company/:nomadsCompanyId/listings
export const getExistingCompanyListings = async (req, res) => {
  try {
    const context = await resolveHostCompany(req);
    if (context.error) return res.status(context.error.status).json(context.error.body);

    const response = await axios.get(
      `${MASTER_PANEL_BASE_URL}/api/hostpanel/nomad-companies/${encodeURIComponent(req.params.nomadsCompanyId)}/listings`,
      { headers: masterPanelHeaders(), timeout: 10000 },
    );
    return res.status(200).json(response.data);
  } catch (error) {
    return forwardMasterError(res, error);
  }
};

// GET /api/listings/existing-company/status
export const getExistingCompanyClaimStatus = async (req, res) => {
  try {
    const context = await resolveHostCompany(req);
    if (context.error) return res.status(context.error.status).json(context.error.body);
    const { company, authedUser } = context;

    const claim = company.existingCompanyClaim || {};
    return res.status(200).json({
      linked: Boolean(company.linkedNomadsCompanyId),
      reviewedAt: claim.reviewedAt || null,
      // Whoever is submitting (the workspace founder or any member) - the
      // modal starts from their own details instead of a blank form.
      prefill: {
        fullName: authedUser?.name || "",
        email: authedUser?.email || "",
        mobile: authedUser?.phone || "",
        role: authedUser?.designation || "",
        registeredCompanyName:
          company.registeredEntityName || company.companyName || "",
      },
      status: claim.status || "",
      nomadsCompanyName: claim.nomadsCompanyName || "",
      listingCount: claim.listingCount || 0,
      requestedAt: claim.requestedAt || null,
      rejectionReason: claim.rejectionReason || "",
      documents: claim.documents || [],
      contact: {
        fullName: claim.fullName || "",
        email: claim.email || "",
        mobile: claim.mobile || "",
        role: claim.role || "",
        registeredCompanyName: claim.registeredCompanyName || "",
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/listings/existing-company/claim (multipart)
// Body: nomadsCompanyId, fullName, email, mobile, role, registeredCompanyName,
// plus one file per CLAIM_DOCUMENT_TYPES key.
export const submitExistingCompanyClaim = async (req, res) => {
  try {
    const context = await resolveHostCompany(req);
    if (context.error) return res.status(context.error.status).json(context.error.body);
    const { company } = context;

    if (company.linkedNomadsCompanyId) {
      return res.status(400).json({ message: "This company is already linked to an existing company." });
    }
    if (company.existingCompanyClaim?.status === "pending") {
      return res.status(400).json({ message: "A claim is already pending review by our team." });
    }

    const body = req.body || {};
    const nomadsCompanyId = String(body.nomadsCompanyId || "").trim();
    if (!nomadsCompanyId) {
      return res.status(400).json({ message: "Select the company that owns your listings." });
    }

    const missing = ["fullName", "email", "mobile", "role", "registeredCompanyName"].find(
      (k) => !String(body[k] || "").trim(),
    );
    if (missing) {
      return res.status(400).json({ message: `${missing} is required` });
    }

    const filesByKey = {};
    (req.files || []).forEach((f) => {
      filesByKey[f.fieldname] = f;
    });
    const priorDocs = company.existingCompanyClaim?.documents || [];
    const missingDoc = CLAIM_DOCUMENT_TYPES.find(
      (d) => d.required && !filesByKey[d.key] && !priorDocs.some((p) => p.label === d.label),
    );
    if (missingDoc) {
      return res.status(400).json({ message: `${missingDoc.label} is required` });
    }

    // Re-verify the target server-side: it must still exist and be unlinked,
    // and we snapshot its name + listing count for staff. Never trust the client.
    let target;
    try {
      const response = await axios.get(
        `${MASTER_PANEL_BASE_URL}/api/hostpanel/nomad-companies/${encodeURIComponent(nomadsCompanyId)}/listings`,
        { headers: masterPanelHeaders(), timeout: 10000 },
      );
      target = response.data;
    } catch (error) {
      return forwardMasterError(res, error);
    }

    const documents = [];
    for (const docType of CLAIM_DOCUMENT_TYPES) {
      const file = filesByKey[docType.key];
      if (file) {
        const safeName = String(file.originalname || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
        const uploaded = await uploadFileToS3(
          `company-claim-documents/${company.companyId}/${docType.key}-${Date.now()}-${safeName}`,
          file,
        );
        documents.push({ label: docType.label, url: uploaded.url, id: uploaded.id });
      } else {
        // Resubmission after a rejection: keep the document already on file.
        const prior = priorDocs.find((p) => p.label === docType.label);
        if (prior) documents.push({ label: prior.label, url: prior.url, id: prior.id });
      }
    }

    company.existingCompanyClaim = {
      status: "pending",
      nomadsCompanyId,
      nomadsCompanyName: target?.companyName || "",
      listingCount: Array.isArray(target?.listings) ? target.listings.length : 0,
      fullName: String(body.fullName).trim(),
      email: String(body.email).trim(),
      mobile: String(body.mobile).trim(),
      role: String(body.role).trim(),
      registeredCompanyName: String(body.registeredCompanyName).trim(),
      documents,
      requestedAt: new Date(),
      reviewedAt: null,
      rejectionReason: "",
    };
    await company.save();

    return res.status(200).json({
      message: "Claim submitted — our team will verify your documents and transfer the listings.",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
