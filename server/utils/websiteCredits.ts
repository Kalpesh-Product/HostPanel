// @ts-nocheck
import mongoose from "mongoose";
import Workspace from "../models/Workspace.js";
import WebsiteCreditsSettings from "../models/WebsiteCreditsSettings.js";

// Monthly website-edit credits per plan are NOT hardcoded — Master Panel
// (Website Credits -> Plan Credit Limits) writes the singleton
// website_credits_settings document and this side reads it. The numbers below
// are only the defaults used before that document has been read (and the
// fallback if it can never be read), so a cold process behaves exactly like it
// always did.
export const DEFAULT_PLAN_CREDITS = {
  basic: 5,
  "static-free": 5, // legacy label for the same plan as "basic"
  professional: 8,
  custom: 12,
};

// Legacy named exports — kept for existing imports. These are defaults, not
// the live values; always use creditsForPlan().
export const MONTHLY_BASE_CREDITS = DEFAULT_PLAN_CREDITS.basic;
export const PROFESSIONAL_MONTHLY_CREDITS = DEFAULT_PLAN_CREDITS.professional;
export const CUSTOM_MONTHLY_CREDITS = DEFAULT_PLAN_CREDITS.custom;

const toNonNegativeNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const normalizePlan = (plan) => {
  const value = String(plan || "").trim().toLowerCase();
  return value === "static-free" ? "basic" : value;
};

// creditsForPlan() is also called from synchronous places (the
// WorkspaceSubscription model's virtuals), so live values come from this
// in-process cache, refreshed from Mongo at most once per TTL.
const CACHE_TTL_MS = 30 * 1000;
let cachedPlanCredits = { ...DEFAULT_PLAN_CREDITS };
let cachedAt = 0;
let loadInFlight = null;

const applySettings = (settings) => {
  const basic = toNonNegativeNumber(
    settings?.basicCredits,
    DEFAULT_PLAN_CREDITS.basic,
  );
  cachedPlanCredits = {
    basic,
    "static-free": basic,
    professional: toNonNegativeNumber(
      settings?.professionalCredits,
      DEFAULT_PLAN_CREDITS.professional,
    ),
    custom: toNonNegativeNumber(
      settings?.customCredits,
      DEFAULT_PLAN_CREDITS.custom,
    ),
  };
  cachedAt = Date.now();
};

// Reads the Master-Panel-owned settings document and refreshes the cache,
// honoring the TTL unless `force` is set. Never creates the document — Master
// Panel owns it; a missing row simply means "use the defaults".
export const loadCreditsSettings = async ({ force = false }: { force?: boolean } = {}) => {
  if (!force && cachedAt && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedPlanCredits;
  }
  if (loadInFlight) return loadInFlight;

  loadInFlight = (async () => {
    try {
      const settings = await WebsiteCreditsSettings.findOne({
        singletonKey: "default",
      }).lean();
      if (settings) applySettings(settings);
      cachedAt = Date.now();
    } catch (error) {
      // Never fail a credit check because the settings row couldn't be read.
      console.error(
        "Failed to load website credit settings:",
        error?.message,
      );
      cachedAt = Date.now();
    } finally {
      loadInFlight = null;
    }
    return cachedPlanCredits;
  })();

  return loadInFlight;
};

export const getPlanCreditLimits = () => {
  const { basic, professional, custom } = cachedPlanCredits;
  return { basicCredits: basic, professionalCredits: professional, customCredits: custom };
};

export const creditsForPlan = (plan) => {
  const key = normalizePlan(plan);
  const cached = cachedPlanCredits[key];
  if (Number.isFinite(cached)) return cached;
  return DEFAULT_PLAN_CREDITS[key] ?? DEFAULT_PLAN_CREDITS.basic;
};

// The website builder is shared by every unit/workspace of a company, so the
// monthly credit pool is company-scoped: ONE website_credits document per
// company (one limit, one usage counter, one add-on balance). Legacy rows
// sometimes carry a "<companyId>-<timestamp>" suffix, so normalize before
// matching. Mirrors WoNoMasterPanel/server/utils/websiteCredits.js.
export const normalizeCompanyKey = (rawCompanyId = "") => {
  const normalized = String(rawCompanyId || "").trim();
  const match = normalized.match(/^(.*)-(\d{10,})$/);
  return match?.[1] || normalized;
};

export const buildCompanyCreditsFilter = ({ companyId, workspaceId } = {}) => {
  const companyKey = normalizeCompanyKey(companyId);
  if (companyKey) return { companyId: companyKey };
  const workspaceKey = String(workspaceId || "").trim();
  return workspaceKey ? { workspaceId: workspaceKey } : null;
};

// Maps the workspace's selectedPlan onto the website_credits plan field.
export const resolveWorkspacePlan = async ({ workspaceId, companyId } = {}) => {
  try {
    const clauses = [];
    const normalizedWorkspaceId = String(workspaceId || "").trim();
    const normalizedCompanyId = String(companyId || "").trim();

    if (
      normalizedWorkspaceId &&
      mongoose.isValidObjectId(normalizedWorkspaceId)
    ) {
      clauses.push({ _id: normalizedWorkspaceId });
    }
    if (normalizedCompanyId) {
      clauses.push({ companyId: normalizedCompanyId });
    }
    if (!clauses.length) return "basic";

    const workspace = await Workspace.findOne({ $or: clauses })
      .select("selectedPlan")
      .lean()
      .exec();

    const selectedPlan = String(workspace?.selectedPlan || "").trim();
    return ["basic", "professional", "custom"].includes(selectedPlan)
      ? selectedPlan
      : "basic";
  } catch {
    return "basic";
  }
};

// Keeps a website_credits doc's plan + creditsLimit in sync with the
// workspace's current plan AND the staff-editable plan limits, so
// upgrades/downgrades and Master Panel limit changes take effect immediately.
// Saves only when something changed; returns the subscription.
export const syncSubscriptionPlan = async (subscription) => {
  if (!subscription) return subscription;

  await loadCreditsSettings();

  const plan = await resolveWorkspacePlan({
    workspaceId: subscription.workspaceId,
    companyId: subscription.companyId,
  });
  const limit = creditsForPlan(plan);

  if (
    subscription.plan !== plan ||
    Number(subscription.creditsLimit || 0) !== limit
  ) {
    subscription.plan = plan;
    subscription.creditsLimit = limit;
    await subscription.save();
  }

  return subscription;
};
