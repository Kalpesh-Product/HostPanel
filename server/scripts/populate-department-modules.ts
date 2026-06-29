// @ts-nocheck
import mongoose from "mongoose";
import Department from "../models/Department.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DEPARTMENT_MODULE_MAP = {
  HR: [
    "employee-management",
    "hr-documents",
    "recruitment",
    "leave-request-processing",
    "attendance-review",
    "payroll-management",
    "exit-management",
  ],
  Finance: [
    "finance-budget",
    "billing-payments",
    "accounting",
  ],
  Sales: [
    "tenant-companies-sales",
    "leads-management",
    "visitor-management",
    "resource-pricing",
    "sales-architecture",
  ],
  Administration: [
    "tenant-companies-admin",
    "bookings",
    "resource-management",
    "house-keeping",
  ],
  Maintenance: [
    "maintenance-repair-logs",
    "amc-maintenance-scheduler",
  ],
  Technology: [
    "tech-website-builder",
  ],
  IT: [
    "it-repair-logs",
  ],
};

async function populateDepartmentModules() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to MongoDB");

    const departments = await Department.find({ isActive: true });
    console.log(`Found ${departments.length} departments`);

    let updated = 0;
    for (const dept of departments) {
      const normalizedName = dept.name.trim();
      const moduleIds = DEPARTMENT_MODULE_MAP[normalizedName];

      if (moduleIds) {
        dept.moduleIds = moduleIds;
        await dept.save();
        console.log(`✓ Updated ${normalizedName} with ${moduleIds.length} modules`);
        updated++;
      } else {
        console.log(`- Skipped ${normalizedName} (no module mapping)`);
      }
    }

    console.log(`\nDone. Updated ${updated} departments.`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

populateDepartmentModules();
