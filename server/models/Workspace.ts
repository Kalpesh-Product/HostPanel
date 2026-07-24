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
      // When false (default), tax + payment methods are derived from the
      // location's country/state at read time so each country charges its own
      // tax and shows its own payment methods. A founder editing billing in
      // Unit Settings flips this to true, after which the stored config wins.
      billingCustomized: { type: Boolean, default: false },
      billing: {
        tax: {
          enabled: { type: Boolean },
          label: { type: String, trim: true, maxlength: 40 },
          ratePercent: { type: Number, min: 0, max: 100 },
          priceIncludesTax: { type: Boolean, default: false },
        },
        paymentMethods: {
          type: [{
            code: { type: String, required: true, trim: true, lowercase: true },
            label: { type: String, required: true, trim: true, maxlength: 80 },
            requiresReference: { type: Boolean, default: false },
            requiresProof: { type: Boolean, default: false },
          }],
          default: undefined,
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
    // Soft-delete flag. A deleted workspace stays visible (locked) but cannot
    // be accessed or re-enabled by the founder; only the WONO team can recover
    // it. Disabling, by contrast, just flips isActive and is reversible by the
    // founder.
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    // Set when the founder requests the WONO team to recover a deleted unit.
    recoveryRequestedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const Workspace = mongoose.model("Workspace", workspaceSchema);
export default Workspace;
