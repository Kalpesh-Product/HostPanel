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
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    status: {
      type: String,
      default: "active",
      trim: true,
    },
    departments: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Department" }],
      default: [],
    },
    grantedModules: {
      type: [String],
      default: [],
    },
    tourProgress: {
      type: Map,
      of: new mongoose.Schema(
        {
          version: { type: Number, required: true, min: 1 },
          status: {
            type: String,
            enum: ["completed", "skipped"],
            required: true,
          },
          updatedAt: { type: Date, default: Date.now },
        },
        { _id: false },
      ),
      default: {},
    },
    transferHistory: {
      type: [
        {
          fromWorkspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", default: null },
          toWorkspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", default: null },
          previousRole: { type: mongoose.Schema.Types.ObjectId, ref: "Role", default: null },
          nextRole: { type: mongoose.Schema.Types.ObjectId, ref: "Role", default: null },
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
