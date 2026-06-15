import mongoose, { Schema, Document } from "mongoose";

export interface IResource extends Document {
    workspaceId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    resourceNumber: number;
    resourceCode: string;
    name: string;
    type: "Open Desk" | "Meeting Room" | "Conference Room" | "Cabin Desk" | "Virtual Office";
    resourceCategory: string;
    inventoryMode: string;
    assignedTenantCompanyId?: mongoose.Types.ObjectId | null;
    assignedTenantCompanyName: string;
    assignedDepartmentId: string;
    assignedDepartmentName: string;
    assignedAt: Date | null;
    floor: string;
    location: string;
    wing: string;
    capacity: number;
    pricing: string;
    pricePerHour: number;
    pricePerDay: number;
    pricingUpdatedAt: Date | null;
    credits: number;
    description: string;
    status: "Active" | "Under Maintenance" | "Disabled";
    isActive: boolean;
    sortOrder: number;
    currentlyBooked: boolean;
    history: Array<{
        date: string;
        bookedBy: string;
        hours: number;
        status: string;
    }>;
    createdAt?: Date;
    updatedAt?: Date;
}

const resourceHistoryEntrySchema = new Schema(
    {
        date: { type: String, trim: true, default: "" },
        bookedBy: { type: String, trim: true, default: "" },
        hours: { type: Number, default: 0, min: 0 },
        status: { type: String, trim: true, default: "" },
    },
    { _id: false }
);

const resourceSchema = new Schema<IResource>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            required: true,
            index: true,
        },
        resourceNumber: {
            type: Number,
            required: true,
            index: true,
        },
        resourceCode: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
            index: true,
        },
        type: {
            type: String,
            required: true,
            trim: true,
            enum: ["Open Desk", "Meeting Room", "Conference Room", "Cabin Desk", "Virtual Office"],
            index: true,
        },
        resourceCategory: {
            type: String,
            trim: true,
            default: "",
            index: true,
        },
        inventoryMode: {
            type: String,
            trim: true,
            default: "area",
            enum: ["area", "single"],
            index: true,
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
            index: true,
        },
        assignedDepartmentId: {
            type: String,
            trim: true,
            default: "",
            maxlength: 120,
            index: true,
        },
        assignedDepartmentName: {
            type: String,
            trim: true,
            default: "",
            maxlength: 160,
            index: true,
        },
        assignedAt: {
            type: Date,
            default: null,
        },
        floor: {
            type: String,
            required: true,
            trim: true,
            maxlength: 60,
            index: true,
        },
        location: {
            type: String,
            trim: true,
            default: "",
            maxlength: 120,
            index: true,
        },
        wing: {
            type: String,
            trim: true,
            default: "",
            maxlength: 10,
            index: true,
        },
        capacity: {
            type: Number,
            required: true,
            min: 1,
        },
        pricing: {
            type: String,
            default: "",
            trim: true,
            maxlength: 120,
        },
        pricePerHour: {
            type: Number,
            default: 0,
            min: 0,
        },
        pricePerDay: {
            type: Number,
            default: 0,
            min: 0,
        },
        pricingUpdatedAt: {
            type: Date,
            default: null,
        },
        credits: {
            type: Number,
            default: 0,
            min: 0,
        },
        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500,
        },
        status: {
            type: String,
            default: "Active",
            trim: true,
            enum: ["Active", "Under Maintenance", "Disabled"],
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        sortOrder: {
            type: Number,
            default: 0,
            index: true,
        },
        currentlyBooked: {
            type: Boolean,
            default: false,
            index: true,
        },
        history: {
            type: [resourceHistoryEntrySchema],
            default: [],
        },
    },
    { timestamps: true }
);

resourceSchema.index({ workspaceId: 1, name: 1 }, { unique: true });
resourceSchema.index({ workspaceId: 1, resourceNumber: 1 }, { unique: true });
resourceSchema.index({ workspaceId: 1, resourceCode: 1 }, { unique: true });

export const Resource =
    (mongoose.models.Resource as mongoose.Model<IResource>) ||
    mongoose.model<IResource>("Resource", resourceSchema);
