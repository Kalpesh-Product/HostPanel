// @ts-nocheck
import mongoose from "mongoose";

// Activity trail for host panel users. Written by the host panel on every
// mutating request and read by the master panel (same database), so field
// names must stay in sync with WoNoMasterPanel/server/models/HostActivityLog.js.
const hostActivityLogSchema = new mongoose.Schema(
  {
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HostUser",
      required: true,
    },
    fullName: {
      type: String,
      trim: true,
      default: "Unknown",
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    module: {
      type: String,
      trim: true,
      default: "",
    },
    companyId: {
      type: String,
      trim: true,
      default: "",
    },
    companyName: {
      type: String,
      trim: true,
      default: "",
    },
    workspaceId: {
      type: String,
      trim: true,
      default: "",
    },
    workspaceName: {
      type: String,
      trim: true,
      default: "",
    },
    method: {
      type: String,
    },
    statusCode: {
      type: Number,
    },
    success: {
      type: Boolean,
    },
    payload: {
      type: Object,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: "",
    },
    responseTime: {
      type: Number, // milliseconds
    },
  },
  { timestamps: true },
);

hostActivityLogSchema.index({ companyId: 1, createdAt: -1 });
hostActivityLogSchema.index({ workspaceId: 1, createdAt: -1 });
hostActivityLogSchema.index({ createdAt: -1 });

const HostActivityLog = mongoose.model(
  "HostActivityLog",
  hostActivityLogSchema,
);

export default HostActivityLog;
