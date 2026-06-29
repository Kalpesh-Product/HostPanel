// @ts-nocheck
import mongoose from "mongoose";
import WorkspaceMember from "../models/WorkspaceMember.js";
import Department from "../models/Department.js";
import HostUser from "../models/HostUser.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function debugUserModules() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to MongoDB\n");

    // Get the email from command line argument
    const email = process.argv[2];
    if (!email) {
      console.log("Usage: npx tsx scripts/debug-user-modules.ts <email>");
      process.exit(1);
    }

    const user = await HostUser.findOne({ email }).lean();
    if (!user) {
      console.log(`User not found: ${email}`);
      process.exit(1);
    }

    console.log(`User: ${user.name} (${user.email})`);
    console.log(`User ID: ${user._id}\n`);

    const member = await WorkspaceMember.findOne({
      user: user._id,
      isActive: true,
    })
      .populate("role")
      .populate("departments")
      .lean();

    if (!member) {
      console.log("No active workspace membership found");
      process.exit(1);
    }

    console.log("Workspace Member Info:");
    console.log(`- Role: ${member.role?.name || "N/A"}`);
    console.log(`- Departments: ${member.departments?.map((d) => d.name).join(", ") || "None"}`);
    console.log(`- Explicit grantedModules: ${member.grantedModules?.length || 0} modules`);
    if (member.grantedModules?.length) {
      console.log(`  ${member.grantedModules.join(", ")}`);
    }

    // Check departments they manage
    const managedDepts = await Department.find({
      managerUser: user._id,
      isActive: true,
    }).lean();

    console.log(`\nManaged Departments: ${managedDepts.length}`);
    managedDepts.forEach((d) => {
      console.log(`- ${d.name}: ${d.moduleIds?.length || 0} modules`);
      if (d.moduleIds?.length) {
        console.log(`  ${d.moduleIds.join(", ")}`);
      }
    });

    // Check assigned departments
    if (member.departments?.length) {
      console.log(`\nAssigned Departments: ${member.departments.length}`);
      member.departments.forEach((d) => {
        console.log(`- ${d.name}: ${d.moduleIds?.length || 0} modules`);
        if (d.moduleIds?.length) {
          console.log(`  ${d.moduleIds.join(", ")}`);
        }
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

debugUserModules();
