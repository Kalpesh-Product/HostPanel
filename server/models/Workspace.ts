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
        end: { type: String, default: "18:00" },
      },
    },
    branding: {
      primaryColor: { type: String, default: "#2563EB" },
      logoUrl: { type: String, default: "" },
    },
    organizationDepartments: {
      type: [
        {
          name: { type: String, required: true, trim: true },
          description: { type: String, default: "", trim: true },
          isActive: { type: Boolean, default: true },
          managerUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
          },
        },
      ],
      default: [],
    },
    actingManagerAssignments: {
      type: [
        {
          departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
          },
          assignedUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
          },
          note: {
            type: String,
            default: "",
            trim: true,
          },
          isActive: {
            type: Boolean,
            default: true,
          },
        },
      ],
      default: [],
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
