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

