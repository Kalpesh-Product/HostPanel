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
