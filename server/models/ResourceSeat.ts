import mongoose, { Schema, Document } from "mongoose";

export interface IResourceSeat extends Document {
    workspaceId: mongoose.Types.ObjectId;
    resourceId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    resourceCategory: "open_desk" | "cabin_desk";
    floor: string;
    wing: string;
    seatNumber: number;
    seatLabel: string;
    assignedTenantCompanyId?: mongoose.Types.ObjectId | null;
    assignedTenantCompanyName: string;
    assignedDepartmentId: string;
    assignedDepartmentName: string;
    assignedAt: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const resourceSeatSchema = new Schema<IResourceSeat>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        resourceId: {
            type: Schema.Types.ObjectId,
            ref: "Resource",
            required: true,
            index: true,
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            required: true,
        },
        resourceCategory: {
            type: String,
            required: true,
            trim: true,
            enum: ["open_desk", "cabin_desk"],
            index: true,
        },
        floor: {
            type: String,
            trim: true,
            default: "",
            index: true,
        },
        wing: {
            type: String,
            trim: true,
            default: "",
            index: true,
        },
        seatNumber: {
            type: Number,
            required: true,
            min: 1,
        },
        seatLabel: {
            type: String,
            required: true,
            trim: true,
        },
        assignedTenantCompanyId: {
            type: Schema.Types.ObjectId,
            ref: "TenantCompany",
            default: null,
            index: true,
        },
        assignedTenantCompanyName: {
            type: String,
            trim: true,
            default: "",
            maxlength: 160,
        },
        assignedDepartmentId: {
            type: String,
            trim: true,
            default: "",
            maxlength: 120,
        },
        assignedDepartmentName: {
            type: String,
            trim: true,
            default: "",
            maxlength: 160,
        },
        assignedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

resourceSeatSchema.index({ workspaceId: 1, seatLabel: 1 }, { unique: true });
resourceSeatSchema.index({ workspaceId: 1, resourceId: 1, seatNumber: 1 }, { unique: true });
resourceSeatSchema.index({ workspaceId: 1, floor: 1, wing: 1, resourceCategory: 1, assignedTenantCompanyId: 1 });

export const ResourceSeat =
    (mongoose.models.ResourceSeat as mongoose.Model<IResourceSeat>) ||
    mongoose.model<IResourceSeat>("ResourceSeat", resourceSeatSchema);
