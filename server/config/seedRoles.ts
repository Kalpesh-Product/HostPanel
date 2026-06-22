import mongoose from "mongoose";
import { Role } from "../models/Role.js";
import Department from "../models/Department.js";

const dropLegacyIndexes = async () => {
  try {
    const departmentCollection = mongoose.connection.collection("departments");
    await departmentCollection.dropIndex("departmentId_1");
    console.log("Dropped legacy departmentId_1 index from departments collection.");
  } catch (err: any) {
    // IndexNotFound means the index was already removed — that's fine.
    if (err?.codeName !== "IndexNotFound" && err?.code !== 27) {
      console.warn("Could not drop departmentId_1 index:", err?.message);
    }
  }
};

/**
 * Finds WorkspaceMember documents where `role` is still stored as a plain
 * string (e.g. "founder") from before the Role ObjectId system was introduced,
 * and replaces each string value with the matching Role document's ObjectId.
 * Safe to run multiple times — skips docs that already have a valid ObjectId.
 */
export const migrateLegacyStringRoles = async () => {
  try {
    const col = mongoose.connection.collection("workspacemembers");
    // Use the raw collection so Mongoose doesn't try to cast "founder" → ObjectId
    const legacyDocs = await col.find({ role: { $type: "string" } }).toArray();

    if (legacyDocs.length === 0) return;

    console.log(`Migrating ${legacyDocs.length} WorkspaceMember(s) with legacy string roles…`);

    // Normalize legacy labels to their canonical system-role names so that
    // values like "owner" (legacy alias for founder) still resolve correctly.
    const canonicalRoleName = (raw: string): string => {
      const lower = String(raw || "").trim().toLowerCase();
      if (lower === "owner") return "founder";
      if (lower === "superadmin") return "super_admin";
      return lower;
    };

    const roleCache = new Map<string, mongoose.Types.ObjectId>();

    for (const doc of legacyDocs) {
      const roleName = canonicalRoleName(doc.role);
      if (!roleCache.has(roleName)) {
        // Prefer the global system role; fall back to any matching role
        // (per-workspace) so members aren't skipped when the global seed
        // is missing or stored under a non-null workspaceId.
        const roleDoc =
          (await Role.findOne({ name: roleName, workspaceId: null }).lean().exec()) ||
          (await Role.findOne({ name: roleName }).lean().exec());
        if (roleDoc) roleCache.set(roleName, roleDoc._id as mongoose.Types.ObjectId);
      }

      const roleId = roleCache.get(roleName);
      if (!roleId) {
        console.warn(`No system Role found for legacy string "${doc.role}" — skipping member ${doc._id}`);
        continue;
      }

      await col.updateOne({ _id: doc._id }, { $set: { role: roleId } });
    }

    console.log(`Legacy string role migration complete. Fixed ${legacyDocs.length} member(s).`);
  } catch (error) {
    console.error("Error migrating legacy string roles:", error);
  }
};

/**
 * Finds WorkspaceMember documents where the `departments` array still contains
 * legacy plain-string values (e.g. "HR") instead of Department ObjectIds. Such
 * values cause `.populate("departments")` to throw a CastError:
 *   Cast to ObjectId failed for value "HR" at path "_id" for model "Department".
 *
 * For each string value it tries to resolve a matching Department by name within
 * the member's workspace and replaces it with the ObjectId. Unresolvable strings
 * are dropped so the array only ever holds valid ObjectIds. Safe to run repeatedly.
 */
export const migrateLegacyStringDepartments = async () => {
  try {
    const col = mongoose.connection.collection("workspacemembers");
    // Matches documents whose departments array contains at least one string element.
    const legacyDocs = await col.find({ departments: { $type: "string" } }).toArray();

    if (legacyDocs.length === 0) return;

    console.log(
      `Migrating ${legacyDocs.length} WorkspaceMember(s) with legacy string departments…`,
    );

    for (const doc of legacyDocs) {
      const rawDepartments = Array.isArray(doc.departments) ? doc.departments : [];
      const cleaned = [];

      for (const value of rawDepartments) {
        if (value instanceof mongoose.Types.ObjectId) {
          cleaned.push(value);
          continue;
        }
        if (mongoose.isValidObjectId(value)) {
          cleaned.push(new mongoose.Types.ObjectId(String(value)));
          continue;
        }

        // Legacy string like "HR" — resolve to a Department by name in this workspace.
        const name = String(value || "").trim();
        if (!name) continue;
        const dept = await Department.findOne({
          name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
          ...(doc.workspace ? { workspaceId: doc.workspace } : {}),
        })
          .lean()
          .exec();
        if (dept?._id) {
          cleaned.push(dept._id);
        }
        // Unresolvable strings are intentionally dropped.
      }

      // De-duplicate by string id.
      const uniqueIds = Array.from(new Set(cleaned.map((id) => String(id)))).map(
        (id) => new mongoose.Types.ObjectId(id),
      );

      await col.updateOne({ _id: doc._id }, { $set: { departments: uniqueIds } });
    }

    console.log(
      `Legacy string department migration complete. Fixed ${legacyDocs.length} member(s).`,
    );
  } catch (error) {
    console.error("Error migrating legacy string departments:", error);
  }
};

export const seedSystemRoles = async () => {
  try {
    await dropLegacyIndexes();
    const defaultRoles = [
      { name: "founder", isSystemRole: true, workspaceId: null, permissions: ["*"] },
      { name: "super_admin", isSystemRole: true, workspaceId: null, permissions: ["*"] },
      { name: "admin", isSystemRole: true, workspaceId: null, permissions: [] },
      { name: "manager", isSystemRole: true, workspaceId: null, permissions: [] },
      { name: "employee", isSystemRole: true, workspaceId: null, permissions: [] },
    ];

    for (const r of defaultRoles) {
      const exists = await Role.findOne({ name: r.name, workspaceId: null });
      if (!exists) {
        await Role.create(r);
        console.log(`System role seeded: ${r.name}`);
      }
    }

    // Must run after roles are seeded so the ObjectIds are available
    await migrateLegacyStringRoles();
    // Clean legacy string values out of WorkspaceMember.departments so that
    // .populate("departments") no longer throws CastError on values like "HR".
    await migrateLegacyStringDepartments();
  } catch (error) {
    console.error("Error seeding system roles:", error);
  }
};

