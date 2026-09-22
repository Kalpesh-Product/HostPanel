// @ts-nocheck
// Minimal read-only mirror of MasterPanel's real model
// (WoNoMasterPanel/server/models/hostCompany/hostLeadCompany.js) — both
// point at the same physical "hostleadcompanies" collection (default
// pluralization of the "HostLeadCompany" model name), since HostPanel and
// MasterPanel share one MongoDB database. Only the fields HostPanel actually
// reads are declared here; MasterPanel's schema remains authoritative for
// writes.
import mongoose from "mongoose";

const hostLeadCompanySchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true },
    plan: { type: String, trim: true },
    paymentStatus: { type: Boolean, default: false },
    paymentConfirmedAt: { type: Date, default: null },
    customPlanModuleIds: { type: [String], default: [] },
  },
  { timestamps: true, strict: false },
);

const HostLeadCompany =
  mongoose.models.HostLeadCompany || mongoose.model("HostLeadCompany", hostLeadCompanySchema);

export default HostLeadCompany;
