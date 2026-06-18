import mongoose from "mongoose";
import { Role } from "../models/Role.js";

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
const migrateLegacyStringRoles = async () => {
  try {
    const col = mongoose.connection.collection("workspacemembers");
    // Use the raw collection so Mongoose doesn't try to cast "founder" → ObjectId
    const legacyDocs = await col.find({ role: { $type: "string" } }).toArray();

    if (legacyDocs.length === 0) return;

    console.log(`Migrating ${legacyDocs.length} WorkspaceMember(s) with legacy string roles…`);

    const roleCache = new Map<string, mongoose.Types.ObjectId>();

    for (const doc of legacyDocs) {
      const roleName = String(doc.role);
      if (!roleCache.has(roleName)) {
        const roleDoc = await Role.findOne({ name: roleName, workspaceId: null }).lean().exec();
        if (roleDoc) roleCache.set(roleName, roleDoc._id as mongoose.Types.ObjectId);
      }

      const roleId = roleCache.get(roleName);
      if (!roleId) {
        console.warn(`No system Role found for legacy string "${roleName}" — skipping member ${doc._id}`);
        continue;
      }

      await col.updateOne({ _id: doc._id }, { $set: { role: roleId } });
    }

    console.log(`Legacy string role migration complete. Fixed ${legacyDocs.length} member(s).`);
  } catch (error) {
    console.error("Error migrating legacy string roles:", error);
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
  } catch (error) {
    console.error("Error seeding system roles:", error);
  }
};

