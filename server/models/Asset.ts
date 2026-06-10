import mongoose from "mongoose";

const assetSchema = new mongoose.Schema(
    {
        workspaceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HostUser",
            required: true,
            index: true,
        },

        assetNumber: {
            type: Number,
            required: true,
        },

        assetCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            index: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 180,
        },

        serialNumber: {
            type: String,
            default: "",
            trim: true,
            maxlength: 120,
        },

        brandModel: {
            type: String,
            default: "",
            trim: true,
            maxlength: 120,
        },

        category: {
            type: String,
            enum: ["Hardware", "Infrastructure", "Software", "Furniture", "Other"],
            required: true,
            trim: true,
            index: true,
        },

        department: {
            type: String,
            default: "",
            trim: true,
            maxlength: 80,
            index: true,
        },

        status: {
            type: String,
            enum: ["Active", "Inactive", "Disposed", "Repair"],
            default: "Active",
            required: true,
            index: true,
        },

        condition: {
            type: String,
            enum: ["New", "Good", "Damaged", "Needs Repair"],
            default: "Good",
            index: true,
        },

        assignedToUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },

        assignedToDepartment: {
            type: String,
            default: "",
            trim: true,
            maxlength: 80,
            index: true,
        },

        vendor: {
            type: String,
            default: "",
            trim: true,
            maxlength: 160,
            index: true,
        },

        invoiceNumber: {
            type: String,
            default: "",
            trim: true,
            maxlength: 120,
        },

        purchaseDate: {
            type: Date,
            default: null,
        },

        quantity: {
            type: Number,
            default: 1,
            min: 1,
        },

        ownershipType: {
            type: String,
            enum: ["Owned", "Rented"],
            default: "Owned",
            required: true,
            index: true,
        },

        location: { type: String, trim: true, maxlength: 120 },

        isDeleted: { type: Boolean, default: false, index: true },

        deletedAt: { type: Date, default: null },

        rentDurationMonths: {
            type: Number,
            default: null,
            min: 1,
        },

        expiryDate: {
            type: Date,
            default: null,
        },

        warrantyExpiry: {
            type: Date,
            default: null,
        },

        value: {
            type: Number,
            default: 0,
            min: 0,
        },

        notes: {
            type: String,
            default: "",
            trim: true,
            maxlength: 2000,
        },

        transferReason: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000,
        },

        transferDate: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

assetSchema.index({ workspaceId: 1, assetNumber: 1 }, { unique: true });
assetSchema.index({ workspaceId: 1, assetCode: 1 }, { unique: true });

assetSchema.index({ workspaceId: 1, createdAt: -1 });
assetSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
assetSchema.index({ workspaceId: 1, category: 1, createdAt: -1 });
assetSchema.index({ workspaceId: 1, department: 1, createdAt: -1 });
assetSchema.index({ workspaceId: 1, assignedToUserId: 1, createdAt: -1 });
assetSchema.index({ workspaceId: 1, assignedToDepartment: 1, createdAt: -1 });

export const Asset =
    mongoose.models.Asset || mongoose.model("Asset", assetSchema);