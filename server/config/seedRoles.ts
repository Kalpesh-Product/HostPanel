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
  } catch (error) {
    console.error("Error seeding system roles:", error);
  }
};

