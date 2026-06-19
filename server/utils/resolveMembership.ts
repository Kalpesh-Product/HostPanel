// @ts-nocheck
import WorkspaceMember from "../models/WorkspaceMember.js";
import { Role } from "../models/Role.js";

/**
 * Safely find and return the most relevant active WorkspaceMember for a user,
 * with the `role` field populated.
 *
 * Falls back gracefully when legacy documents store `role` as a plain string
 * (e.g. "founder") instead of an ObjectId, which would otherwise throw a
 * Mongoose CastError during populate and bubble up as an unhandled rejection
 * or a 500 response.
 */
export const resolveActiveWorkspaceMembership = async (user: any) => {
  const primaryFilter = {
    user: user._id,
    isActive: true,
    ...(user?.primaryWorkspace ? { workspace: user.primaryWorkspace } : {}),
  };
  const fallbackFilter = { user: user._id, isActive: true };

  // Try the fast path — populate role in a single query.
  try {
    const preferred = await WorkspaceMember.findOne(primaryFilter)
      .sort({ isPrimary: -1, createdAt: 1 })
      .populate("role")
      .lean()
      .exec();
    if (preferred) return preferred;

    return await WorkspaceMember.findOne(fallbackFilter)
      .sort({ isPrimary: -1, createdAt: 1 })
      .populate("role")
      .lean()
      .exec();
  } catch (err: any) {
    // CastError: legacy WorkspaceMember has role stored as a plain string
    // (e.g. "founder") not a valid ObjectId.  Fall back to an unpopulated
    // query and manually resolve the Role document.
    if (err?.name !== "CastError" && err?.kind !== "ObjectId") throw err;
  }

  // Safe fallback — no populate, manual role resolution.
  const raw =
    (await WorkspaceMember.findOne(primaryFilter)
      .sort({ isPrimary: -1, createdAt: 1 })
      .lean()
      .exec()) ||
    (await WorkspaceMember.findOne(fallbackFilter)
      .sort({ isPrimary: -1, createdAt: 1 })
      .lean()
      .exec());

  if (raw?.role) {
    try {
      const roleDoc = await Role.findById(raw.role).lean().exec();
      if (roleDoc) (raw as any).role = roleDoc;
    } catch {
      // role is an invalid ObjectId (legacy string) — leave the raw value;
      // callers extract role.name with a string fallback so this is safe.
    }
  }

  return raw;
};

/**
 * Safely return every active workspace membership for a user. Legacy rows may
 * still store `role` as a plain string, so we avoid failing the whole query
 * when populate hits one invalid ObjectId.
 */
export const resolveAccessibleWorkspaceMemberships = async (userId: any) => {
  const filter = {
    user: userId,
    isActive: true,
  };

  try {
    return await WorkspaceMember.find(filter)
      .sort({ isPrimary: -1, createdAt: 1 })
      .populate("workspace")
      .populate("role")
      .lean()
      .exec();
  } catch (err: any) {
    if (err?.name !== "CastError" && err?.kind !== "ObjectId") throw err;
  }

  const memberships = await WorkspaceMember.find(filter)
    .sort({ isPrimary: -1, createdAt: 1 })
    .populate("workspace")
    .lean()
    .exec();

  for (const membership of memberships) {
    if (!membership?.role || typeof membership.role !== "string") continue;

    try {
      const roleDoc = await Role.findById(membership.role).lean().exec();
      if (roleDoc) membership.role = roleDoc as any;
    } catch {
      // Legacy string role such as "founder" is safe to leave as-is.
    }
  }

  return memberships;
};

/**
 * Resolve a single WorkspaceMember for a specific (workspace, user) pair with
 * the `role` field populated, while tolerating legacy rows where `role` is
 * still stored as a plain string (e.g. "founder"). Such legacy values would
 * otherwise throw a Mongoose CastError during `.populate("role")` and bubble
 * up as a 500 — which is exactly what blocked founder → super_admin invites.
 *
 * Callers receive a membership whose `role` is either a populated Role doc or
 * the original string; downstream helpers (getRoleBand / normalizeRoleForStorage)
 * already handle both shapes.
 */
export const resolveMembershipByWorkspace = async (
  workspaceId: any,
  userId: any,
  select = "",
) => {
  const baseFilter = { workspace: workspaceId, user: userId, isActive: true };

  // Fast path — populate role in a single query.
  try {
    const query = WorkspaceMember.findOne(baseFilter).sort({
      isPrimary: -1,
      createdAt: 1,
    });
    if (select) query.select(select);
    return await query.populate("role").lean().exec();
  } catch (err: any) {
    if (err?.name !== "CastError" && err?.kind !== "ObjectId") throw err;
  }

  // Safe fallback — no populate, manual role resolution.
  const rawQuery = WorkspaceMember.findOne(baseFilter).sort({
    isPrimary: -1,
    createdAt: 1,
  });
  if (select) rawQuery.select(select);
  const raw = await rawQuery.lean().exec();

  if (raw?.role) {
    try {
      const roleDoc = await Role.findById(raw.role).lean().exec();
      if (roleDoc) (raw as any).role = roleDoc;
    } catch {
      // role is a legacy string (e.g. "founder") — leave as-is; callers fall
      // back to string-based role normalization so the request still succeeds.
    }
  }

  return raw;
};
