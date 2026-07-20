// @ts-nocheck
import mongoose from "mongoose";

const websiteLeadSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, trim: true, index: true, default: "" },
    companyId: { type: String, trim: true, index: true, default: "" },
    companyName: { type: String, trim: true, default: "" },
    fullName: { type: String, trim: true, required: true },
    email: { type: String, trim: true, default: "" },
    mobileNumber: { type: String, trim: true, default: "" },
    message: { type: String, trim: true, default: "" },
    source: { type: String, trim: true, default: "website" },
    vertical: { type: String, trim: true, default: "co-working" },
    productType: { type: String, trim: true, default: "" },
    noOfPeople: { type: String, trim: true, default: "" },
    leadMeta: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, trim: true, default: "Pending" },
    hostPanelStatus: {
      type: String,
      trim: true,
      enum: ["Pending", "Closed"],
      default: "Pending",
    },
    hostPanelStatusUpdatedAt: { type: Date, default: null },
    comment: { type: String, trim: true, default: "" },
    upstreamSynced: { type: Boolean, default: false },
    upstreamError: { type: String, default: "" },
    isEscalated: { type: Boolean, default: false, index: true },
    escalatedWorkspaceId: { type: String, trim: true, default: "", index: true },
    escalatedHostCompanyId: { type: String, trim: true, default: "", index: true },
    escalatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const WebsiteLead =
  mongoose.models.WebsiteLead ||
  mongoose.model("WebsiteLead", websiteLeadSchema);

export default WebsiteLead;
