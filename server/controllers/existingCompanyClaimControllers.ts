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
      suggestedNomadsCompanyId: company.suggestedNomadsCompanyId || "",
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
      nomadsCompanyId: claim.nomadsCompanyId || "",
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

// POST /api/listings/existing-company/claim
// Body: nomadsCompanyId. Contact details and proof documents are taken from the
// account and from Create Business Location, so nothing else is sent.
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

    // No form or uploads any more: contact details come from the signed-in
    // account (a body value still wins if one is sent), and the proof
    // documents are the ones already collected on Create Business Location.
    const { authedUser } = context;
    const contact = {
      fullName: String(body.fullName || authedUser?.name || "").trim(),
      email: String(body.email || authedUser?.email || "").trim(),
      mobile: String(body.mobile || authedUser?.phone || "").trim(),
      role: String(body.role || authedUser?.designation || "Founder / Co-Founder").trim(),
      registeredCompanyName: String(
        body.registeredCompanyName || company.registeredEntityName || company.companyName || "",
      ).trim(),
    };

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

    const acceptance = company.agreementAcceptance || {};
    const documents = [];
    if (acceptance.signedDocument?.url) {
      documents.push({
        label: "Signed Agreement",
        url: acceptance.signedDocument.url,
        id: acceptance.signedDocument.id,
      });
    }
    (acceptance.businessDocuments || []).forEach((doc, index) => {
      if (!doc?.url) return;
      documents.push({
        label: doc.name || `Business Document ${index + 1}`,
        url: doc.url,
        id: doc.id,
      });
    });

    company.existingCompanyClaim = {
      status: "pending",
      nomadsCompanyId,
      nomadsCompanyName: target?.companyName || "",
      listingCount: Array.isArray(target?.listings) ? target.listings.length : 0,
      ...contact,
      documents,
      requestedAt: new Date(),
      reviewedAt: null,
      rejectionReason: "",
    };
    await company.save();

    return res.status(200).json({
      message: "Request submitted — our team will verify it and transfer the listings.",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
