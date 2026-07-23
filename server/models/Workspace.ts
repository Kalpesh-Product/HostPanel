// @ts-nocheck
import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HostUser",
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HostCompany",
      default: null,
    },
    companyId: {
      type: String,
      required: true,
      trim: true,
    },
    workspaceName: {
      type: String,
      required: true,
      trim: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    brandName: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    countryCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 2,
    },
    state: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    businessTypes: {
      type: [String],
      default: [],
    },
    selectedPlan: {
      type: String,
      enum: ["basic", "professional", "custom"],
      required: true,
    },
    enabledModuleIds: {
      type: [String],
      default: [],
    },
    modules: {
      type: [
        {
          category: { type: String, required: true },
          items: {
            type: [
              {
                id: { type: String, required: true },
                name: { type: String, required: true },
                active: { type: Boolean, default: false },
              },
            ],
            default: [],
          },
        },
      ],
      default: [],
    },
    preferences: {
      timezone: { type: String, default: "Asia/Kolkata" },
      currency: { type: String, default: "INR" },
      dateFormat: { type: String, default: "DD MMM YYYY" },
      timeFormat: { type: String, enum: ["12h", "24h"], default: "12h" },
      weekStartsOn: { type: String, enum: ["monday", "sunday"], default: "monday" },
      businessHours: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "22:00" },
      },
      billing: {
        tax: {
          enabled: { type: Boolean, default: true },
          label: { type: String, default: "GST", trim: true, maxlength: 40 },
          ratePercent: { type: Number, default: 18, min: 0, max: 100 },
          priceIncludesTax: { type: Boolean, default: false },
        },
        paymentMethods: {
          type: [{
            code: { type: String, required: true, trim: true, lowercase: true },
            label: { type: String, required: true, trim: true, maxlength: 80 },
            requiresReference: { type: Boolean, default: false },
            requiresProof: { type: Boolean, default: false },
          }],
          default: () => [
            { code: "cash", label: "Cash", requiresReference: false, requiresProof: false },
            { code: "card", label: "Card", requiresReference: false, requiresProof: false },
            { code: "bank_transfer", label: "Bank Transfer", requiresReference: true, requiresProof: true },
            { code: "upi", label: "UPI", requiresReference: true, requiresProof: true },
          ],
        },
      },
    },
    branding: {
      primaryColor: { type: String, default: "#2563EB" },
      logoUrl: { type: String, default: "" },
    },
    attendanceGeofence: {
      enabled: { type: Boolean, default: false },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      radiusMeters: { type: Number, default: 150, min: 25, max: 5000 },
      updatedAt: { type: Date, default: null },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "HostUser", default: null },
    },
    isSetupComplete: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const Workspace = mongoose.model("Workspace", workspaceSchema);
export default Workspace;
