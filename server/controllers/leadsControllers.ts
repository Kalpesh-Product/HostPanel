// @ts-nocheck
import axios from "axios";
import Company from "../models/Company.js";
import WebsiteTemplate from "../models/website/WebsiteTemplate.js";
import Workspace from "../models/Workspace.js";
import WebsiteLead from "../models/WebsiteLead.js";
import HostUser from "../models/HostUser.js";

const sanitizeValue = (value) => String(value || "").trim();
const NOMADS_API_BASE_URL = sanitizeValue(
  process.env.NOMADS_API_BASE_URL ||
    process.env.REVIEW_API_BASE_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://wononomadsbe.vercel.app"
      : "http://localhost:3000"),
).replace(/\/+$/, "").replace(/\/api$/i, "");
const nomadsApiUrl = (path) =>
  `${NOMADS_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
const isSyntheticCompanyId = (value) => sanitizeValue(value).includes("-dev-");
const isNomadLead = (lead) => sanitizeValue(lead?.source).toLowerCase() === "nomad";

const filterLeadsByScope = (leads, leadScope) => {
  const normalizedScope = sanitizeValue(leadScope).toLowerCase();
  if (normalizedScope === "nomads") return leads.filter(isNomadLead);
  if (normalizedScope === "website") return leads.filter((lead) => !isNomadLead(lead));
  return leads;
};

const filterEscalatedLeadsForWorkspace = (leads, workspaceId) => {
  const normalizedWorkspaceId = sanitizeValue(workspaceId);
  if (!normalizedWorkspaceId) return [];

  return leads.filter(
    (lead) =>
      lead?.isEscalated === true &&
      sanitizeValue(lead?.escalatedWorkspaceId) === normalizedWorkspaceId,
  );
};

const resolveCompanyIdFromWorkspace = async (workspaceId) => {
  const normalizedWorkspaceId = sanitizeValue(workspaceId);
  if (!normalizedWorkspaceId) return "";

  const template = await WebsiteTemplate.findOne({ workspaceId: normalizedWorkspaceId })
    .select("companyId")
    .lean()
    .exec();
  const templateCompanyId = sanitizeValue(template?.companyId);
  if (templateCompanyId && !isSyntheticCompanyId(templateCompanyId)) {
    return templateCompanyId;
  }

  const workspace = await Workspace.findById(normalizedWorkspaceId)
    .select("company companyId")
    .lean()
    .exec();
  if (workspace?.company) {
    const linkedCompany = await Company.findById(workspace.company)
      .select("companyId")
      .lean()
      .exec();
    const linkedCompanyId = sanitizeValue(linkedCompany?.companyId);
    if (linkedCompanyId) return linkedCompanyId;
  }

  return sanitizeValue(workspace?.companyId);
};

const resolveWorkspaceIdFromCompany = async (companyId) => {
  const normalizedCompanyId = sanitizeValue(companyId);
  if (!normalizedCompanyId) return "";

  const template = await WebsiteTemplate.findOne({ companyId: normalizedCompanyId })
    .select("workspaceId")
    .lean()
    .exec();
  if (template?.workspaceId) return sanitizeValue(template.workspaceId);

  const company = await Company.findOne({ companyId: normalizedCompanyId })
    .select("_id")
    .lean()
    .exec();
  if (company?._id) {
    const workspace = await Workspace.findOne({ company: company._id })
      .select("_id")
      .lean()
      .exec();
    if (workspace?._id) return sanitizeValue(workspace._id);
  }

  const workspaceByCompanyId = await Workspace.findOne({ companyId: normalizedCompanyId })
    .select("_id")
    .lean()
    .exec();
  return sanitizeValue(workspaceByCompanyId?._id);
};

export const getLeads = async (req, res, next) => {
  try {
    const leadScope = sanitizeValue(req.query?.leadScope).toLowerCase();
    const isNomadsScope = leadScope === "nomads";
    const requestedWorkspaceId =
      sanitizeValue(req.query?.workspaceId) ||
      sanitizeValue(req.workspaceMembership?.workspace);
    const requestedCompanyId = sanitizeValue(req.query?.companyId);

    // Website leads use workspace as the strongest tenant boundary. Nomads data,
    // like Nomads reviews, stays company-scoped because upstream records may not
    // carry a HostPanel workspace id.
    let companyId = isNomadsScope ? requestedCompanyId : "";
    if (!companyId && requestedWorkspaceId) {
      companyId = await resolveCompanyIdFromWorkspace(requestedWorkspaceId);
    }

    // Fallback to explicit companyId only when workspace context is unavailable.
    if (!companyId) {
      companyId = requestedCompanyId;
    }

    if (!companyId) {
      return res.status(400).json({
        message: "Company ID is required (or provide a valid workspaceId)",
      });
    }

    const targetWorkspaceId =
      requestedWorkspaceId || (await resolveWorkspaceIdFromCompany(companyId));

    if (!targetWorkspaceId) {
      return res.status(400).json({
        message: "A HostPanel workspace is required to fetch escalated leads",
      });
    }

    const localLeadQuery = {
      ...(!isNomadsScope
        ? { workspaceId: targetWorkspaceId }
        : { companyId }),
      isEscalated: true,
      escalatedWorkspaceId: targetWorkspaceId,
    };

    const localLeads = await WebsiteLead.find(localLeadQuery)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const mappedLocal = filterLeadsByScope(localLeads, leadScope).map((lead, index) => ({
      _id: String(lead._id),
      srNo: index + 1,
      fullName: lead.fullName,
      source: lead.source || "website",
      vertical: sanitizeValue(lead.vertical) || "co-working",
      productType: lead.productType || "",
      noOfPeople: lead.noOfPeople || "",
      mobileNumber: lead.mobileNumber || "",
      email: lead.email || "",
      status: lead.status || "Pending",
      hostPanelStatus: lead.hostPanelStatus || "Pending",
      hostPanelStatusUpdatedAt: lead.hostPanelStatusUpdatedAt || null,
      comment: lead.comment || "",
      recievedDate: lead.createdAt,
      companyName: lead.companyName || "",
      companyId: lead.companyId || "",
      isEscalated: lead.isEscalated === true,
      escalatedWorkspaceId: lead.escalatedWorkspaceId || "",
      escalatedHostCompanyId: lead.escalatedHostCompanyId || "",
      escalatedAt: lead.escalatedAt || null,
      ...(lead?.leadMeta && typeof lead.leadMeta === "object" ? lead.leadMeta : {}),
    }));

    try {
      const leads = await axios.get(
        nomadsApiUrl("/api/company/leads"),
        {
          params: {
            companyId,
            isEscalated: true,
            workspaceId: targetWorkspaceId,
          },
        },
      );
      const rawRemote = Array.isArray(leads?.data)
        ? leads.data
        : Array.isArray(leads?.data?.leads)
          ? leads.data.leads
          : [];
      const escalatedRemote = filterEscalatedLeadsForWorkspace(
        rawRemote,
        targetWorkspaceId,
      );
      const remote = filterLeadsByScope(escalatedRemote, leadScope).sort((a, b) => {
        const aDate = new Date(a?.recievedDate || a?.receivedDate || a?.createdAt || 0).getTime();
        const bDate = new Date(b?.recievedDate || b?.receivedDate || b?.createdAt || 0).getTime();
        return bDate - aDate;
      });
      if (remote.length > 0) {
        return res.status(200).json(remote);
      }
    } catch (error) {
      // fall back to local leads
    }

    return res.status(200).json(mappedLocal);
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
    const { hostPanelStatus = "", comment, leadId } = req.body || {};
    const normalizedHostStatus = sanitizeValue(hostPanelStatus);

    if (!leadId || (!normalizedHostStatus && typeof comment !== "string")) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    if (normalizedHostStatus && !["Pending", "Closed"].includes(normalizedHostStatus)) {
      return res.status(400).json({ message: "Invalid HostPanel lead status" });
    }

    let hostWorkspaceId = sanitizeValue(
      req.body?.workspaceId || req.workspaceMembership?.workspace,
    );
    if (normalizedHostStatus && !hostWorkspaceId) {
      const hostUser = await HostUser.findById(req.user)
        .select("primaryWorkspace workspaceId")
        .lean();
      hostWorkspaceId = sanitizeValue(hostUser?.primaryWorkspace || hostUser?.workspaceId);
    }
    if (normalizedHostStatus && !hostWorkspaceId) {
      return res.status(400).json({ message: "A HostPanel workspace is required" });
    }

    let sharedLead = null;
    try {
      const leads = await axios.patch(
        nomadsApiUrl("/api/company/update-lead"),
        {
          leadId,
          ...(hostWorkspaceId ? { workspaceId: hostWorkspaceId } : {}),
          ...(normalizedHostStatus ? { hostPanelStatus: normalizedHostStatus } : {}),
          ...(typeof comment === "string" ? { comment } : {}),
        }
      );
      const upstreamLead = leads?.data?.lead;
      if (
        upstreamLead &&
        (!normalizedHostStatus || upstreamLead.hostPanelStatus === normalizedHostStatus)
      ) {
        sharedLead = upstreamLead;
      }
    } catch (error) {
      return res.status(error?.response?.status || 502).json({
        message:
          error?.response?.data?.message ||
          "Unable to reach the configured Nomads lead service",
      });
    }

    if (!sharedLead) {
      const verification = await axios.get(nomadsApiUrl("/api/company/leads"), {
        params: { workspaceId: hostWorkspaceId, isEscalated: true },
      });
      const verifiedLeads = Array.isArray(verification?.data) ? verification.data : [];
      sharedLead = verifiedLeads.find(
        (lead) =>
          sanitizeValue(lead?._id) === sanitizeValue(leadId) &&
          (!normalizedHostStatus || lead?.hostPanelStatus === normalizedHostStatus),
      );
    }

    if (!sharedLead) {
      return res.status(502).json({
        message: "The configured Nomads backend did not persist the HostPanel status update",
      });
    }

    const localLead = await WebsiteLead.findById(leadId).exec();
    if (localLead) {
      if (normalizedHostStatus) {
        localLead.hostPanelStatus = normalizedHostStatus;
        localLead.hostPanelStatusUpdatedAt = new Date();
      }
      if (typeof comment === "string") localLead.comment = comment;
      await localLead.save();
    }

    return res
      .status(200)
      .json({
        message: `Lead ${typeof comment === "string" && !normalizedHostStatus ? "comment" : "status"} updated`,
        lead: sharedLead,
      });
  } catch (error) {
    next(error);
  }
};

const resolveHostCandidates = (req) => {
  const candidates = [];
  const collect = (raw) => {
    const value = sanitizeValue(raw).toLowerCase();
    if (!value) return;
    const cleaned = value.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
    if (!cleaned) return;
    candidates.push(cleaned);
  };

  collect(req.headers?.host);
  collect(req.headers?.origin);
  collect(req.headers?.referer);
  collect(req.body?.websiteUrl);
  collect(req.body?.siteUrl);
  collect(req.query?.websiteUrl);
  collect(req.query?.siteUrl);

  return Array.from(new Set(candidates));
};

const resolveSlugCandidates = (req) => {
  const values = [
    req.body?.searchKey,
    req.query?.searchKey,
    req.body?.websiteSlug,
    req.query?.websiteSlug,
    req.body?.companySlug,
    req.query?.companySlug,
    req.body?.slug,
    req.query?.slug,
  ]
    .map(sanitizeValue)
    .filter(Boolean);

  const urlLike = [
    req.headers?.referer,
    req.headers?.origin,
    req.body?.websiteUrl,
    req.body?.siteUrl,
    req.body?.pageUrl,
    req.body?.url,
    req.query?.websiteUrl,
    req.query?.siteUrl,
    req.query?.pageUrl,
    req.query?.url,
  ]
    .map(sanitizeValue)
    .filter(Boolean);

  for (const value of urlLike) {
    try {
      const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length > 0) values.push(parts[0]);
    } catch {
      // ignore parse failures
    }
  }

  return Array.from(
    new Set(
      values
        .map((v) => v.toLowerCase().trim())
        .filter(Boolean),
    ),
  );
};

const resolveTemplateFromRequest = async (req) => {
  const body = req.body || {};
  const query = req.query || {};

  const searchKeyCandidates = resolveSlugCandidates(req);

  for (const searchKey of searchKeyCandidates) {
    const template = await WebsiteTemplate.findOne({ searchKey }).lean().exec();
    if (template) return template;
  }

  const hostCandidates = resolveHostCandidates(req);
  for (const host of hostCandidates) {
    const hostSubdomain = host.split(".")[0];
    if (!hostSubdomain || ["www", "wono", "api"].includes(hostSubdomain)) continue;
    const template = await WebsiteTemplate.findOne({ searchKey: hostSubdomain })
      .lean()
      .exec();
    if (template) return template;
  }

  const workspaceId = sanitizeValue(body.workspaceId || query.workspaceId);
  if (workspaceId) {
    const template = await WebsiteTemplate.findOne({ workspaceId }).lean().exec();
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

    let resolvedCompanyName = sanitizeValue(
      body.companyName ||
        template?.companyName ||
        template?.registeredCompanyName ||
        template?.searchKey,
    );
    let resolvedWorkspaceId = sanitizeValue(body.workspaceId || template?.workspaceId);
    const resolvedCompanyId =
      (resolvedWorkspaceId
        ? await resolveCompanyIdFromWorkspace(resolvedWorkspaceId)
        : "") || sanitizeValue(body.companyId || template?.companyId);

    // Live-site submissions often only send companyId (resolved via the
    // companyId/companyName branches of resolveTemplateFromRequest above),
    // leaving resolvedWorkspaceId empty even though the lead itself saves
    // fine — that silently skips the admin notification block below since
    // it requires a workspaceId. Backfill it from the company as a last resort.
    if (!resolvedWorkspaceId && resolvedCompanyId) {
      resolvedWorkspaceId = await resolveWorkspaceIdFromCompany(resolvedCompanyId);
    }

    const resolvedSource = sanitizeValue(body.source) || "website";

    if (!visitorName || !visitorEmail || !visitorPhone) {
      console.warn("createWebsiteLead validation failed", {
        reason: "missing_required_contact",
        hasName: Boolean(visitorName),
        hasEmail: Boolean(visitorEmail),
        hasPhone: Boolean(visitorPhone),
        searchKeyCandidates: resolveSlugCandidates(req),
      });
      return res.status(400).json({
        message: "name, email and phone are required",
      });
    }

    if (!resolvedCompanyName && resolvedCompanyId) {
      const templateByCompany = await WebsiteTemplate.findOne({
        companyId: resolvedCompanyId,
      })
        .select("companyName registeredCompanyName searchKey")
        .lean()
        .exec();
      resolvedCompanyName = sanitizeValue(
        templateByCompany?.companyName ||
          templateByCompany?.registeredCompanyName ||
          templateByCompany?.searchKey,
      );
    }

    if (!resolvedCompanyName && resolvedWorkspaceId) {
      const workspace = await Workspace.findById(resolvedWorkspaceId)
        .select("businessName workspaceName")
        .lean()
        .exec();
      resolvedCompanyName = sanitizeValue(
        workspace?.businessName || workspace?.workspaceName,
      );
    }

    if (!resolvedCompanyName) {
      console.warn("createWebsiteLead validation failed", {
        reason: "unable_to_resolve_company_name",
        companyId: resolvedCompanyId,
        workspaceId: resolvedWorkspaceId,
        templateSearchKey: template?.searchKey || "",
        host: sanitizeValue(req.headers?.host),
        referer: sanitizeValue(req.headers?.referer),
        origin: sanitizeValue(req.headers?.origin),
        searchKeyCandidates: resolveSlugCandidates(req),
      });
      return res.status(400).json({
        message: "Unable to resolve companyName for this website lead",
      });
    }

    const payload = {
      ...body,
      name: visitorName,
      fullName: sanitizeValue(body.fullName || visitorName),
      email: visitorEmail,
      phone: visitorPhone,
      mobile: visitorPhone,
      mobileNumber: sanitizeValue(body.mobileNumber || visitorPhone),
      contactNumber: sanitizeValue(body.contactNumber || visitorPhone),
      message: visitorMessage,
      comments: visitorMessage,
      companyName: resolvedCompanyName,
      company: sanitizeValue(body.company || resolvedCompanyName),
      company_name: sanitizeValue(body.company_name || resolvedCompanyName),
      leadCompanyName: sanitizeValue(body.leadCompanyName || resolvedCompanyName),
      companyId: resolvedCompanyId,
      workspaceId: resolvedWorkspaceId,
      source: resolvedSource,
    };

    const resolvedVertical = sanitizeValue(
      body.vertical || body.websiteVertical || template?.vertical || "co-working",
    );

    const knownBaseKeys = new Set([
      "name", "fullName", "leadName", "email", "phone", "mobile", "mobileNumber",
      "contactNumber", "message", "comments", "comment", "companyName", "company",
      "company_name", "leadCompanyName", "companyId", "workspaceId", "source",
      "searchKey", "websiteSlug", "companySlug", "slug", "websiteUrl", "siteUrl",
      "pageUrl", "url", "vertical", "websiteVertical", "productType", "noOfPeople",
      "startDate", "endDate", "moveInDate", "checkIn", "checkOut", "bookingDate",
      "preferredDate", "roomType", "roomName", "room", "packageName", "package",
      "planName", "dormType", "bedType", "attendees", "teamSize", "guestCount",
      "inquiryType", "eventType", "timeSlot", "slot", "preferredTime",
      "stayDuration", "duration",
    ]);

    const leadMeta = {};
    for (const [key, value] of Object.entries(body || {})) {
      if (knownBaseKeys.has(key)) continue;
      if (value === null || value === undefined) continue;
      if (typeof value === "string" && !value.trim()) continue;
      leadMeta[key] = value;
    }

    const normalizedMeta = {
      ...leadMeta,
      startDate: sanitizeValue(
        body.startDate || body.moveInDate || body.checkIn || body.bookingDate || body.preferredDate,
      ),
      endDate: sanitizeValue(body.endDate || body.checkOut),
      roomType: sanitizeValue(body.roomType || body.roomName || body.room),
      packageName: sanitizeValue(body.packageName || body.package || body.planName),
      dormType: sanitizeValue(body.dormType || body.bedType),
      attendees: sanitizeValue(body.attendees || body.teamSize || body.guestCount),
      inquiryType: sanitizeValue(body.inquiryType || body.eventType),
      timeSlot: sanitizeValue(body.timeSlot || body.slot || body.preferredTime),
      stayDuration: sanitizeValue(body.stayDuration || body.duration),
    };

    for (const [k, v] of Object.entries(normalizedMeta)) {
      if (!sanitizeValue(v)) delete normalizedMeta[k];
    }

    const localLead = await WebsiteLead.create({
      workspaceId: resolvedWorkspaceId,
      companyId: resolvedCompanyId,
      companyName: resolvedCompanyName,
      fullName: payload.fullName || payload.name,
      email: payload.email,
      mobileNumber:
        payload.mobileNumber || payload.phone || payload.mobile || payload.contactNumber,
      message: payload.message || payload.comments || "",
      source: payload.source || "website",
      vertical: resolvedVertical || "co-working",
      productType: sanitizeValue(payload.productType),
      noOfPeople: sanitizeValue(payload.noOfPeople),
      leadMeta: normalizedMeta,
      status: "Pending",
      hostPanelStatus: "Pending",
    });

    // The enquiry remains Master Panel-only until staff explicitly escalate it.
    // HostPanel notifications must not fire during the initial public submission.

    const upstreamEndpoints = [
      nomadsApiUrl("/api/leads/create-lead"),
    ];

    let lastError = null;
    for (const endpoint of upstreamEndpoints) {
      try {
        const upstream = await axios.post(endpoint, payload);
        await WebsiteLead.findByIdAndUpdate(localLead._id, {
          $set: { upstreamSynced: true, upstreamError: "" },
        }).exec();
        return res.status(upstream.status || 201).json(upstream.data);
      } catch (error) {
        lastError = error;
        const rawMessage = String(
          error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.message ||
            "",
        ).toLowerCase();

        const companyNameMissing =
          rawMessage.includes("company name") && rawMessage.includes("provide");

        if (companyNameMissing) {
          try {
            const retryPayload = {
              ...payload,
              companyName: resolvedCompanyName,
              company: resolvedCompanyName,
              company_name: resolvedCompanyName,
              leadCompanyName: resolvedCompanyName,
            };
            const retryUpstream = await axios.post(endpoint, retryPayload);
            await WebsiteLead.findByIdAndUpdate(localLead._id, {
              $set: { upstreamSynced: true, upstreamError: "" },
            }).exec();
            return res.status(retryUpstream.status || 201).json(retryUpstream.data);
          } catch (retryError) {
            lastError = retryError;
          }
        }
      }
    }

    const message =
      lastError?.response?.data?.message ||
      lastError?.response?.data?.error ||
      lastError?.message ||
      "Lead saved locally. Upstream sync failed.";

    await WebsiteLead.findByIdAndUpdate(localLead._id, {
      $set: { upstreamSynced: false, upstreamError: String(message || "") },
    }).exec();

    return res.status(201).json({
      message: "Lead submitted successfully",
      leadId: String(localLead._id),
      upstreamSync: false,
      upstreamMessage: message,
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Failed to create website lead",
    });
  }
};

