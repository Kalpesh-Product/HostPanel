// @ts-nocheck
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt";

const workspaceAccessSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, trim: true, default: "" },
    workspaceName: { type: String, trim: true, default: "Main Workspace" },
    moduleAccess: { type: mongoose.Schema.Types.Mixed, default: {} },
    accessSource: {
      type: String,
      trim: true,
      enum: ["plan_role_preset", "custom_workspace_grant"],
      default: "custom_workspace_grant",
    },
  },
  { _id: false },
);

const hostUserSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HostCompany",
      required: true,
    },
    name: {
      type: String,
    },
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters long"],
      maxlength: [72, "Password cannot exceed 72 characters"],
    },
    passwordHistory: {
      type: [
        {
          hash: {
            type: String,
            required: true,
          },
          changedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    refreshToken: {
      type: String,
    },
    companyId: {
      type: String,
      // unique: true,
      required: true,
      trim: true,
    },
    primaryWorkspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
    },
    hasCompletedWorkspaceSetup: {
      type: Boolean,
      default: false,
    },
    designation: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
    },
    linkedInProfile: {
      type: String,
    },
    languages: {
      type: [String],
    },
    address: {
      type: String,
    },
    profileImage: {
      type: String,
    },
    profilePicture: {
      type: {
        url: { type: String, trim: true, default: "" },
        id: { type: String, trim: true, default: "" },
      },
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    inviteStatus: {
      type: String,
      enum: ["not_invited", "invite_sent", "registered", "joined"],
      default: "not_invited",
    },
    inviteSentAt: { type: Date, default: null },
    registeredAt: { type: Date, default: null },
    joinedAt: { type: Date, default: null },
    workspaceAccess: { type: [workspaceAccessSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
hostUserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare entered password
hostUserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate reset token
hostUserSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash and set to resetPasswordToken
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expiration time (15 min)
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

const HostUser = mongoose.model("HostUser", hostUserSchema);
export default HostUser;

