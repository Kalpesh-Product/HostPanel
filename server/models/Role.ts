import mongoose, { Document, Schema } from "mongoose";

export interface IRole extends Document {
    name: string;
    workspaceId: mongoose.Types.ObjectId | null; // Null means it's a global/system role
    permissions: string[];
    isSystemRole: boolean; // Prevents deletion of default roles like "Admin"
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const roleSchema = new Schema<IRole>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50,
        },
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            default: null, // Null = Global/Platform level role
            index: true,
        },
        permissions: {
            type: [String],
            default: [],
        },
        isSystemRole: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

// Ensure role names are unique per workspace (or globally if workspaceId is null)
roleSchema.index({ workspaceId: 1, name: 1 }, { unique: true, sparse: true });

export const Role = (mongoose.models.Role as mongoose.Model<IRole>) ||
    mongoose.model<IRole>("Role", roleSchema);