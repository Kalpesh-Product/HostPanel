// @ts-nocheck
import mongoose from "mongoose";

const workspaceMemberSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HostUser",
      required: true,
    },
    role: {
      type: String,
      default: "founder",
      trim: true,
    },
    status: {
      type: String,
      default: "active",
      trim: true,
    },
    departments: {
      type: [String],
      default: [],
    },
    grantedModules: {
      type: [String],
      default: [],
    },
    transferHistory: {
      type: [
        {
          fromWorkspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", default: null },
          toWorkspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", default: null },
          previousRole: { type: String, default: "", trim: true },
          nextRole: { type: String, default: "", trim: true },
          note: { type: String, default: "", trim: true },
          transferredAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    isPrimary: {
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

workspaceMemberSchema.index({ workspace: 1, user: 1 }, { unique: true });

const WorkspaceMember = mongoose.model("WorkspaceMember", workspaceMemberSchema);
export default WorkspaceMember;
