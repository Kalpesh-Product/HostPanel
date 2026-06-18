import mongoose, { Document, Schema } from "mongoose";

export interface IMemberInvite extends Document {
    email: string;
    invitedName?: string;
    role: mongoose.Types.ObjectId;
    departments: mongoose.Types.ObjectId[];
    invitedBy: mongoose.Types.ObjectId;
    workspaceId?: mongoose.Types.ObjectId | null;
    contextType: "workspace" | "tenant";
    tenantCompanyId?: mongoose.Types.ObjectId | null;
    tenantRole?: string;
    tenantCompanyName?: string;
    tokenHash: string;
    expiresAt: Date;
    status: "pending" | "accepted" | "revoked" | "expired";
    acceptedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const memberInviteSchema = new Schema<IMemberInvite>(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        invitedName: {
            type: String,
            trim: true,
            default: "",
        },
        role: {
            type: Schema.Types.ObjectId,
            ref: "Role",
            required: true,
        },
        departments: {
            type: [{ type: Schema.Types.ObjectId, ref: "Department" }],
            default: [],
        },
        invitedBy: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            required: true,
            index: true,
        },
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            default: null,
            index: true,
        },
        contextType: {
            type: String,
            enum: ["workspace", "tenant"],
            default: "workspace",
            index: true,
        },
        tenantCompanyId: {
            type: Schema.Types.ObjectId,
            ref: "TenantCompany",
            default: null,
            index: true,
        },
        tenantRole: {
            type: String,
            default: "",
            trim: true,
            maxlength: 40,
        },
        tenantCompanyName: {
            type: String,
            default: "",
            trim: true,
            maxlength: 160,
        },
        tokenHash: {
            type: String,
            required: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "revoked", "expired"],
            default: "pending",
            index: true,
        },
        acceptedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

memberInviteSchema.index({ email: 1, status: 1 });
memberInviteSchema.index({ workspaceId: 1, status: 1 });

export const MemberInvite = (mongoose.models.MemberInvite as mongoose.Model<IMemberInvite>) ||
    mongoose.model<IMemberInvite>("MemberInvite", memberInviteSchema);
export default MemberInvite;
