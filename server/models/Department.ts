import mongoose, { Document, Schema } from "mongoose";

export interface IDepartment extends Document {
    name: string;
    description?: string;
    workspaceId: mongoose.Types.ObjectId; // Crucial for multi-tenant HostPanel
    managerUser?: mongoose.Types.ObjectId | null;
    adminUsers: mongoose.Types.ObjectId[];
    employeeUsers: mongoose.Types.ObjectId[];
    moduleIds: string[];
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
        description: {
            type: String,
            default: "",
            trim: true,
        },
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        managerUser: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
        },
        adminUsers: {
            type: [{ type: Schema.Types.ObjectId, ref: "HostUser" }],
            default: [],
        },
        employeeUsers: {
            type: [{ type: Schema.Types.ObjectId, ref: "HostUser" }],
            default: [],
        },
        moduleIds: {
            type: [String],
            default: [],
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
export default Department;
