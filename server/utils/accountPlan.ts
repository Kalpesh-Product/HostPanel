// @ts-nocheck
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import {
  buildWorkspaceModulesStructure,
  getEffectiveEnabledModuleIds,
} from "../config/workspaceModuleCatalog.js";

// Plan tiers ordered low → high. This is the product's inherent plan hierarchy
// (basic < professional < custom), used only to compare tiers — no plan value
// is ever hardcoded onto an account here.
const PLAN_RANK: Record<string, number> = { basic: 1, professional: 2, custom: 3 };
const VALID_PLANS = ["basic", "professional", "custom"];

// Two per-plan caps (plan configuration, never hardcoded onto an account):
//
//  • ACTIVE limit  — how many workspaces can be ENABLED at once.
//  • KEPT  limit   — how many workspaces can exist total (active + disabled),
//                    excluding soft-deleted ones.
//
// For professional: at most 2 active at a time, but up to 5 kept — so a founder
// disables some (staying within 2 active) to add more, up to 5 total. Deleting
// (soft) does not count and frees a kept slot. Basic keeps only the
// registration workspace; custom is unlimited on both.
export const WORKSPACE_ACTIVE_LIMIT_BY_PLAN: Record<string, number> = {
  basic: 1,
  professional: 2,
  custom: Number.POSITIVE_INFINITY,
};
export const WORKSPACE_LIMIT_BY_PLAN: Record<string, number> = {
  basic: 1,
  professional: 5,
  custom: Number.POSITIVE_INFINITY,
};

// The Professional plan's user cap is an ACCOUNT-wide entitlement ("up to 5
// users" on the pricing page), not a per-unit one — a founder can spread up to
// 5 distinct people across as many of their (up to 5, up to 2 active) units as
// they like. Moving a person between units, or granting an already-active
// person access to another unit, never consumes a new slot; only a person who
// isn't active in any unit yet does. Basic plan's cap is handled separately
// (founder + one Super Admin); custom has no cap.
export const ACCOUNT_ACTIVE_USER_LIMIT_BY_PLAN: Record<string, number> = {
  basic: Number.POSITIVE_INFINITY,
  professional: 5,
  custom: Number.POSITIVE_INFINITY,
};

export const getActiveUserLimitForPlan = (plan: unknown) => {
  const key = normalizeAccountPlan(plan) || "basic";
  return ACCOUNT_ACTIVE_USER_LIMIT_BY_PLAN[key] ?? Number.POSITIVE_INFINITY;
};

export const rankPlan = (plan: unknown) =>
  PLAN_RANK[String(plan || "").trim().toLowerCase()] || 0;

export const normalizeAccountPlan = (plan: unknown) => {
  const value = String(plan || "").trim().toLowerCase();
  return VALID_PLANS.includes(value) ? value : "";
};

// Total number of workspaces the account may KEEP (active + disabled).
export const getWorkspaceLimitForPlan = (plan: unknown) => {
  const key = normalizeAccountPlan(plan) || "basic";
  return WORKSPACE_LIMIT_BY_PLAN[key] ?? 1;
};

// Number of workspaces that may be ENABLED (active) at the same time.
export const getActiveWorkspaceLimitForPlan = (plan: unknown) => {
  const key = normalizeAccountPlan(plan) || "basic";
  return WORKSPACE_ACTIVE_LIMIT_BY_PLAN[key] ?? 1;
};

/**
 * Count the account's ENABLED workspaces (active, non-deleted) — measured
 * against the ACTIVE limit. Disabling a workspace lowers this count.
 */
export const countActiveAccountWorkspaces = async (userId: any): Promise<number> => {
  if (!userId) return 0;
  return Workspace.countDocuments({
    owner: userId,
    isActive: true,
    isDeleted: { $ne: true },
  }).exec();
};

/**
 * Count the account's KEPT workspaces — every non-deleted workspace, whether
 * enabled or disabled. Measured against the KEPT limit; only soft-deleting one
 * frees a slot.
 */
export const countAccountWorkspaces = async (userId: any): Promise<number> => {
  if (!userId) return 0;
  return Workspace.countDocuments({
    owner: userId,
    isDeleted: { $ne: true },
  }).exec();
};

/**
 * The account's "main" workspace is the one created first (at registration).
 * It can never be disabled or deleted. Identified as the earliest-created
 * non-deleted workspace owned by the user (stable even though the user's
 * "primary"/active workspace drifts as they switch).
 */
export const resolveMainWorkspaceId = async (userId: any): Promise<string> => {
  if (!userId) return "";
  const main = await Workspace.findOne({ owner: userId, isDeleted: { $ne: true } })
    .sort({ createdAt: 1 })
    .select("_id")
    .lean()
    .exec();
  return main?._id ? String(main._id) : "";
};

/**
 * The plan is an account-level entitlement, but HostPanel stores it per
 * workspace (Workspace.selectedPlan). The account's effective plan is the
 * HIGHEST tier among the founder's active workspaces — e.g. if any workspace
 * is "professional", the whole account is professional. This is derived from
 * live data (not hardcoded) and is resilient to the fact that a user's
 * "primary" workspace drifts to whatever they last switched to.
 */
export const resolveAccountPlan = async (userId: any): Promise<string> => {
  if (!userId) return "";
  const workspaces = await Workspace.find({ owner: userId, isActive: true })
    .select("selectedPlan")
    .lean()
    .exec();
  return workspaces.reduce(
    (best: string, ws: any) =>
      rankPlan(ws?.selectedPlan) > rankPlan(best)
        ? normalizeAccountPlan(ws.selectedPlan)
        : best,
    "",
  );
};

/**
 * Bring every one of the founder's active workspaces up to the account plan.
 *
 * UPGRADE-ONLY: a workspace already at or above the account plan is left
 * untouched, so this can never strip a workspace's access — it only fixes
 * workspaces that were created/reset to a lower tier (e.g. additional
 * workspaces that landed on "basic" while the account is "professional").
 * Enabled modules are re-derived by MERGING the new plan's defaults with the
 * workspace's existing enabled ids, so any per-workspace custom grants are
 * preserved while the upgraded plan's modules are unlocked.
 *
 * Returns the resolved account plan (or "" when the account has no workspaces).
 */
export const syncAccountWorkspacePlans = async (userId: any): Promise<string> => {
  const accountPlan = await resolveAccountPlan(userId);
  if (!accountPlan) return "";

  const workspaces = await Workspace.find({ owner: userId, isActive: true }).exec();
  for (const workspace of workspaces) {
    if (rankPlan(workspace.selectedPlan) >= rankPlan(accountPlan)) continue;

    const enabledModuleIds = getEffectiveEnabledModuleIds({
      selectedPlan: accountPlan,
      existingEnabledModuleIds: Array.isArray(workspace.enabledModuleIds)
        ? workspace.enabledModuleIds
        : [],
    });
    workspace.selectedPlan = accountPlan;
    workspace.enabledModuleIds = enabledModuleIds;
    workspace.modules = buildWorkspaceModulesStructure({
      selectedPlan: accountPlan,
      enabledModuleIds,
    });
    await workspace.save();
  }

  return accountPlan;
};

const getAccountWorkspaceIds = async (userId: any): Promise<any[]> => {
  if (!userId) return [];
  const workspaces = await Workspace.find({ owner: userId, isDeleted: { $ne: true } })
    .select("_id")
    .lean()
    .exec();
  return workspaces.map((ws: any) => ws._id);
};

/**
 * Count the account's ACTIVE, DISTINCT users — every person with at least one
 * active WorkspaceMember across any of the founder's (non-deleted) units,
 * counted once no matter how many units they're active in. Measured against
 * the ACCOUNT_ACTIVE_USER_LIMIT_BY_PLAN cap. Pass `excludeMembershipId` to see
 * the count as it would be with one particular membership row removed (e.g.
 * before deciding whether re-enabling it would add a new person).
 */
export const countActiveAccountUsers = async (
  userId: any,
  options: { excludeMembershipId?: any } = {},
): Promise<number> => {
  const workspaceIds = await getAccountWorkspaceIds(userId);
  if (!workspaceIds.length) return 0;
  const match: any = { workspace: { $in: workspaceIds }, isActive: true };
  if (options.excludeMembershipId) match._id = { $ne: options.excludeMembershipId };
  const distinctUserIds = await WorkspaceMember.distinct("user", match);
  return distinctUserIds.length;
};

/**
 * True if `targetUserId` already has active access to some other unit in the
 * account. Used to tell "reactivating/linking an existing active person"
 * (never blocked by the user cap) apart from "activating a person who isn't
 * active anywhere in the account yet" (consumes a cap slot).
 */
export const isAccountUserAlreadyActive = async (
  userId: any,
  targetUserId: any,
  options: { excludeMembershipId?: any } = {},
): Promise<boolean> => {
  const workspaceIds = await getAccountWorkspaceIds(userId);
  if (!workspaceIds.length) return false;
  const match: any = { workspace: { $in: workspaceIds }, user: targetUserId, isActive: true };
  if (options.excludeMembershipId) match._id = { $ne: options.excludeMembershipId };
  return Boolean(await WorkspaceMember.exists(match));
};
