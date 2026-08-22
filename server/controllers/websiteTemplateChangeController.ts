// @ts-nocheck
import mongoose from "mongoose";
import HostUser from "../models/HostUser.js";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import WebsiteTemplate from "../models/website/WebsiteTemplate.js";
import WebsiteTemplateChangeRequest from "../models/WebsiteTemplateChangeRequest.js";
import WebsiteTemplateSettings from "../models/WebsiteTemplateSettings.js";
import { resolveWorkspacePlan } from "./subscriptionHelpers.js";

const DEFAULT_TEMPLATE_SETTINGS = {
  limitPeriod: "monthly",
  planChangeLimits: { basic: 1, professional: 2, custom: 3 },
  templates: [
    { templateId: "default", enabled: true, visible: true, allowedPlans: ["basic", "professional", "custom"] },
    { templateId: "fresh-studio", enabled: true, visible: true, allowedPlans: ["basic", "professional", "custom"] },
    { templateId: "warm-organic", enabled: true, visible: true, allowedPlans: ["professional", "custom"] },
    { templateId: "emerald-studio", enabled: true, visible: true, allowedPlans: ["custom"] },
    { templateId: "minimal-swiss", enabled: false, visible: true, allowedPlans: ["basic", "professional", "custom"], disabledReason: "Coming soon" },
    { templateId: "figma-make", enabled: false, visible: false, allowedPlans: [] },
  ],
};

const normalizeId = (value: unknown) => String(value || "").trim();
const normalizeTemplateId = (value: unknown) => normalizeId(value).toLowerCase();

const actorName = (user: any) => {
  const fullName = `${normalizeId(user?.firstName)} ${normalizeId(user?.lastName)}`.trim();
  return fullName || normalizeId(user?.name) || normalizeId(user?.email) || "HostPanel user";
};

const getWorkspaceAndAssertAccess = async ({ req, workspaceId, companyId }) => {
  const clauses: Array<Record<string, unknown>> = [];
  if (workspaceId && mongoose.isValidObjectId(workspaceId)) clauses.push({ _id: workspaceId });
  if (companyId) clauses.push({ companyId });
  if (!clauses.length) return { error: { status: 400, message: "workspaceId or companyId is required" } };

  const workspace = await Workspace.findOne({ $or: clauses }).lean().exec();
  if (!workspace) return { error: { status: 404, message: "Workspace not found" } };
  const userId = normalizeId(req.user);
  const isOwner = normalizeId(workspace.owner) === userId;
  const membership = isOwner
    ? true
    : await WorkspaceMember.exists({ workspace: workspace._id, user: userId, isActive: true });
  if (!membership) return { error: { status: 403, message: "You do not have workspace access." } };
  return { workspace };
};

const findWebsite = async ({ websiteId, workspace }) => {
  const ownershipClauses: Array<Record<string, string>> = [];
  const normalizedCompanyId = normalizeId(workspace?.companyId);
  if (normalizedCompanyId) ownershipClauses.push({ companyId: normalizedCompanyId });
  if (workspace?._id) ownershipClauses.push({ workspaceId: normalizeId(workspace._id) });

  if (websiteId && mongoose.isValidObjectId(websiteId)) {
    return WebsiteTemplate.findOne({
      _id: websiteId,
      isDeleted: { $ne: true },
      ...(ownershipClauses.length ? { $or: ownershipClauses } : {}),
    }).exec();
  }
  if (!ownershipClauses.length) return null;
  return WebsiteTemplate.findOne({ isDeleted: { $ne: true }, $or: ownershipClauses })
    .sort({ updatedAt: -1 })
    .exec();
};

const getSettings = async () => {
  const stored = await WebsiteTemplateSettings.findOne({ key: "global" }).lean().exec();
  const storedTemplates = Array.isArray(stored?.templates) ? stored.templates : [];
  return {
    limitPeriod: stored?.limitPeriod === "lifetime" ? "lifetime" : "monthly",
    planChangeLimits: {
      basic: Number(stored?.planChangeLimits?.basic ?? DEFAULT_TEMPLATE_SETTINGS.planChangeLimits.basic),
      professional: Number(stored?.planChangeLimits?.professional ?? DEFAULT_TEMPLATE_SETTINGS.planChangeLimits.professional),
      custom: Number(stored?.planChangeLimits?.custom ?? DEFAULT_TEMPLATE_SETTINGS.planChangeLimits.custom),
    },
    templates: (storedTemplates.length ? storedTemplates : DEFAULT_TEMPLATE_SETTINGS.templates).map((item: any) => ({
      templateId: normalizeTemplateId(item?.templateId),
      enabled: item?.enabled === true,
      visible: item?.visible !== false,
      allowedPlans: Array.isArray(item?.allowedPlans)
        ? item.allowedPlans.map((plan: unknown) => normalizeId(plan).toLowerCase())
        : ["basic", "professional", "custom"],
      disabledReason: normalizeId(item?.disabledReason) || "Coming soon",
    })),
  };
};

const getPeriodStart = (limitPeriod: string) => {
  if (limitPeriod !== "monthly") return null;
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
};

const getQuota = async ({ websiteId, plan, settings }) => {
  const rawLimit = Number(settings.planChangeLimits?.[plan] ?? 0);
  const limit = Number.isFinite(rawLimit) ? Math.max(0, Math.floor(rawLimit)) : 0;
  const completedFilter: Record<string, unknown> = { websiteId, status: "completed" };
  const periodStart = getPeriodStart(settings.limitPeriod);
  if (periodStart) completedFilter.completedAt = { $gte: periodStart };
  const used = await WebsiteTemplateChangeRequest.countDocuments(completedFilter).exec();
  return { period: settings.limitPeriod, limit, used, remaining: Math.max(0, limit - used), periodStartedAt: periodStart };
};

const serializeRequest = (request: any) => {
  if (!request) return null;
  const value = request?.toObject ? request.toObject() : request;
  return {
    _id: normalizeId(value?._id),
    websiteId: normalizeId(value?.websiteId),
    companyId: normalizeId(value?.companyId),
    workspaceId: normalizeId(value?.workspaceId),
    companyName: normalizeId(value?.companyName),
    currentTemplateId: normalizeTemplateId(value?.currentTemplateId) || "default",
    requestedTemplateId: normalizeTemplateId(value?.requestedTemplateId),
    status: normalizeId(value?.status).toLowerCase(),
    rejectionReason: normalizeId(value?.rejectionReason),
    requestedAt: value?.createdAt || null,
    reviewedAt: value?.reviewedAt || null,
    completedAt: value?.completedAt || null,
    updatedAt: value?.updatedAt || null,
  };
};

export const getTemplateChangeSummary = async (req, res, next) => {
  try {
    const workspaceId = normalizeId(req.query?.workspaceId);
    const companyId = normalizeId(req.query?.companyId);
    const websiteId = normalizeId(req.query?.websiteId);
    const access = await getWorkspaceAndAssertAccess({ req, workspaceId, companyId });
    if (access.error) return res.status(access.error.status).json({ message: access.error.message });
    const website = await findWebsite({ websiteId, workspace: access.workspace });
    if (!website) return res.status(404).json({ message: "Website not found" });

    const resolvedCompanyId = normalizeId(website.companyId || companyId || access.workspace.companyId);
    const resolvedWorkspaceId = normalizeId(website.workspaceId || access.workspace._id);
    const [settings, plan] = await Promise.all([
      getSettings(),
      resolveWorkspacePlan({ workspaceId: resolvedWorkspaceId, companyId: resolvedCompanyId }),
    ]);
    const [quota, activeRequest, history] = await Promise.all([
      getQuota({ websiteId: website._id, plan, settings }),
      WebsiteTemplateChangeRequest.findOne({ websiteId: website._id, isActive: true }).sort({ createdAt: -1 }).lean().exec(),
      WebsiteTemplateChangeRequest.find({ websiteId: website._id }).sort({ createdAt: -1 }).limit(20).lean().exec(),
    ]);

    return res.status(200).json({
      websiteId: normalizeId(website._id),
      companyId: resolvedCompanyId,
      workspaceId: resolvedWorkspaceId,
      plan,
      currentTemplateId: normalizeTemplateId(website.themeVariant) || "default",
      quota,
      templates: settings.templates.map((template: any) => ({ ...template, allowedForPlan: template.allowedPlans.includes(plan) })),
      activeRequest: serializeRequest(activeRequest),
      history: history.map(serializeRequest),
    });
  } catch (error) {
    return next(error);
  }
};

export const createTemplateChangeRequest = async (req, res, next) => {
  try {
    const workspaceId = normalizeId(req.body?.workspaceId);
    const companyId = normalizeId(req.body?.companyId);
    const websiteId = normalizeId(req.body?.websiteId);
    const requestedTemplateId = normalizeTemplateId(req.body?.requestedTemplateId);
    if (!requestedTemplateId) return res.status(400).json({ message: "requestedTemplateId is required" });

    const access = await getWorkspaceAndAssertAccess({ req, workspaceId, companyId });
    if (access.error) return res.status(access.error.status).json({ message: access.error.message });
    const website = await findWebsite({ websiteId, workspace: access.workspace });
    if (!website) return res.status(404).json({ message: "Website not found" });
    const currentTemplateId = normalizeTemplateId(website.themeVariant) || "default";
    if (requestedTemplateId === currentTemplateId) {
      return res.status(400).json({ message: "Choose a template different from the current template" });
    }

    const resolvedCompanyId = normalizeId(website.companyId || companyId || access.workspace.companyId);
    const resolvedWorkspaceId = normalizeId(website.workspaceId || access.workspace._id);
    const [settings, plan, actor] = await Promise.all([
      getSettings(),
      resolveWorkspacePlan({ workspaceId: resolvedWorkspaceId, companyId: resolvedCompanyId }),
      HostUser.findById(req.user).select("name firstName lastName email").lean().exec(),
    ]);
    const targetTemplate = settings.templates.find((template: any) => template.templateId === requestedTemplateId);
    if (!targetTemplate || targetTemplate.visible === false) return res.status(400).json({ message: "That template is not available" });
    if (!targetTemplate.enabled) return res.status(400).json({ message: targetTemplate.disabledReason || "That template is not ready yet" });
    if (!targetTemplate.allowedPlans.includes(plan)) {
      return res.status(403).json({ message: `That template is not available on the ${plan} plan` });
    }

    const existingActive = await WebsiteTemplateChangeRequest.findOne({ websiteId: website._id, isActive: true }).lean().exec();
    if (existingActive) {
      return res.status(409).json({ message: "A template change request is already pending or approved", request: serializeRequest(existingActive) });
    }
    const quota = await getQuota({ websiteId: website._id, plan, settings });
    if (quota.remaining <= 0) {
      return res.status(403).json({ message: `Your ${plan} plan template-change limit has been reached`, quota });
    }

    const created = await WebsiteTemplateChangeRequest.create({
      websiteId: website._id,
      companyId: resolvedCompanyId,
      workspaceId: resolvedWorkspaceId,
      companyName: normalizeId(website.companyName || access.workspace.businessName),
      currentTemplateId,
      requestSource: "host",
      requestedTemplateId,
      status: "pending",
      isActive: true,
      planAtRequest: plan,
      limitPeriodAtRequest: settings.limitPeriod,
      requestedByUserId: req.user || null,
      requestedByName: actorName(actor),
      requestedByEmail: normalizeId(actor?.email),
      statusHistory: [{ status: "pending", changedAt: new Date(), changedBy: normalizeId(req.user), note: "Template change requested from HostPanel" }],
    });
    return res.status(201).json({ message: "Template change request submitted", request: serializeRequest(created), quota });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "A template change request is already pending or approved" });
    return next(error);
  }
};
