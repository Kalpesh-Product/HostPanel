/**
 * One-off repair script: rewrites WorkspaceMember.role values that are still
 * stored as plain strings (e.g. "founder", "owner", "super_admin") into the
 * real system Role ObjectId. This is the same logic the server runs at boot
 * via `seedSystemRoles().migrateLegacyStringRoles()`, exposed here so it can
 * be run on demand against an existing DB — useful when a founder's own
 * membership is the broken row and is blocking org invites.
 *
 * Run with:
 *   cd server
 *   npx tsx scripts/fix-legacy-roles.ts
 *
 * Safe to run multiple times — it only touches documents whose `role` field
 * is a string (`{ $type: "string" }`), and uses the raw Mongo collection so
 * Mongoose never tries to cast the string value to an ObjectId.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Role } from "../models/Role.js";

dotenv.config();

const MONGO_URL = process.env.DB_URL;
if (!MONGO_URL) {
  console.error("DB_URL is not set in the environment.");
  process.exit(1);
}

const canonicalRoleName = (raw: string): string => {
  const lower = String(raw || "").trim().toLowerCase();
  if (lower === "owner") return "founder";
  if (lower === "superadmin") return "super_admin";
  return lower;
};

const run = async () => {
  await mongoose.connect(MONGO_URL!);
  console.log("Connected to MongoDB.");

  const col = mongoose.connection.collection("workspacemembers");
  const legacyDocs = await col.find({ role: { $type: "string" } }).toArray();

  if (legacyDocs.length === 0) {
    console.log("No WorkspaceMember documents with a legacy string role. Nothing to fix.");
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${legacyDocs.length} member(s) with legacy string roles. Fixing…`);

  const roleCache = new Map<string, mongoose.Types.ObjectId>();
  let fixed = 0;
  let skipped = 0;

  for (const doc of legacyDocs) {
    const roleName = canonicalRoleName(doc.role);
    if (!roleCache.has(roleName)) {
      // Prefer global system role; fall back to any matching role doc.
      const roleDoc =
        (await Role.findOne({ name: roleName, workspaceId: null }).lean().exec()) ||
        (await Role.findOne({ name: roleName }).lean().exec());
      if (roleDoc) roleCache.set(roleName, roleDoc._id as mongoose.Types.ObjectId);
    }

    const roleId = roleCache.get(roleName);
    if (!roleId) {
      console.warn(`  - No Role found for "${doc.role}" -> member ${doc._id} (skipped)`);
      skipped += 1;
      continue;
    }

    await col.updateOne({ _id: doc._id }, { $set: { role: roleId } });
    console.log(`  - Fixed member ${doc._id}: "${doc.role}" -> ${roleId}`);
    fixed += 1;
  }

  console.log(`\nDone. Fixed ${fixed}, skipped ${skipped}.`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Repair failed:", err);
  process.exit(1);
});
