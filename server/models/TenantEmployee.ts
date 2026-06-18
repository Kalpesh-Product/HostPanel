import mongoose, { Schema, Document } from "mongoose";

export interface ITenantEmployee extends Document {
  tenantCompanyId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  userId?: mongoose.Types.ObjectId | null;
  inviteId?: mongoose.Types.ObjectId | null;
  inviteToken?: string | null;
  inviteTokenExpiresAt?: Date | null;
  inviteStatus: string;
  invitedAt?: Date | null;
  inviteSentAt?: Date | null;
  inviteAcceptedAt?: Date | null;
  registeredAt?: Date | null;
  lastLoginAt?: Date | null;
  tenantRole: string;
  tenantCompanyName: string;
  role: "Employee" | "Manager";
  status: "Active" | "Inactive";
  createdAt?: Date;
  updatedAt?: Date;
}

const tenantEmployeeSchema = new Schema<ITenantEmployee>(
  {
    tenantCompanyId: {
      type: Schema.Types.ObjectId,
      ref: "TenantCompany",
      required: true,
      index: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    id: {
      type: String,
      default: () => `TE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      trim: true,
      index: true,
    },
    name: { type: String, default: "", trim: true, maxlength: 140 },
    email: { type: String, default: "", trim: true, lowercase: true, maxlength: 160, index: true },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    designation: { type: String, default: "", trim: true, maxlength: 120 },
    userId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
    inviteId: { type: Schema.Types.ObjectId, ref: "MemberInvite", default: null, index: true },
    inviteToken: { type: String, default: null, trim: true, index: true },
    inviteTokenExpiresAt: { type: Date, default: null },
    inviteStatus: { type: String, default: "Invited", trim: true, maxlength: 40 },
    invitedAt: { type: Date, default: null },
    inviteSentAt: { type: Date, default: null },
    inviteAcceptedAt: { type: Date, default: null },
    registeredAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    tenantRole: { type: String, default: "", trim: true, maxlength: 40 },
    tenantCompanyName: { type: String, default: "", trim: true, maxlength: 160 },
    role: { type: String, default: "Employee", trim: true, enum: ["Employee", "Manager"] },
    status: { type: String, default: "Active", trim: true, enum: ["Active", "Inactive"] },
  },
  { timestamps: true }
);

tenantEmployeeSchema.index({ workspaceId: 1, email: 1 });

export const TenantEmployee =
  (mongoose.models.TenantEmployee as mongoose.Model<ITenantEmployee>) ||
  mongoose.model<ITenantEmployee>("TenantEmployee", tenantEmployeeSchema);

export default TenantEmployee;
