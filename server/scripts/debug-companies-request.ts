// @ts-nocheck
import mongoose from "mongoose";
import HostUser from "../models/HostUser.js";
import Company from "../models/Company.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to MongoDB\n");

    const email = process.argv[2];
    if (!email) {
      console.log("Usage: npx tsx scripts/debug-companies-request.ts <email>");
      process.exit(1);
    }

    const user = await HostUser.findOne({ email }).lean();
    if (!user) {
      console.log(`HostUser not found for email: ${email}`);
      process.exit(1);
    }

    console.log("HostUser:", {
      _id: user._id,
      email: user.email,
      companyId: user.companyId,
      company: user.company,
    });

    const company =
      (user.companyId && (await Company.findOne({ companyId: user.companyId }).lean())) ||
      (user.company && (await Company.findById(user.company).lean()));

    if (!company) {
      console.log("\nNo Company (hostleadcompanies) record found for this user.");
      process.exit(0);
    }

    console.log("\nCompany (hostleadcompanies):", {
      companyId: company.companyId,
      companyName: company.companyName,
      companyCity: company.companyCity,
      companyState: company.companyState,
      companyCountry: company.companyCountry,
      companyContinent: company.companyContinent,
      linkedNomadsCompanyId: company.linkedNomadsCompanyId,
      companiesListingRequestedAt: company.companiesListingRequestedAt,
    });

    // Check the Companies-side collection (hostcompanies) directly, since
    // its model lives in master panel's codebase, not here — same DB though.
    const hostCompaniesColl = mongoose.connection.db.collection("hostcompanies");
    const linkedEntry = await hostCompaniesColl.findOne({
      linkedHostCompanyId: company.companyId,
    });
    console.log(
      "\nMatching Companies-page entry (linkedHostCompanyId):",
      linkedEntry
        ? { companyId: linkedEntry.companyId, companyName: linkedEntry.companyName }
        : null,
    );

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
