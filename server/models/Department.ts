import mongoose, { Document, Schema } from "mongoose";

export interface IDepartment extends Document {
    name: string;
    workspaceId: mongoose.Types.ObjectId; // Crucial for multi-tenant HostPanel
    headUserId?: mongoose.Types.ObjectId | null; // Optional: Department manager
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const departmentSchema = new Schema<IDepartment>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
        },
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        headUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

// Ensure department names are unique per workspace
departmentSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export const Department = (mongoose.models.Department as mongoose.Model<IDepartment>) ||
    mongoose.model<IDepartment>("Department", departmentSchema);
