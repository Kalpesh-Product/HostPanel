import { Role } from "../models/Role.js";

export const seedSystemRoles = async () => {
  try {
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
