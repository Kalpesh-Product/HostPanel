import mongoose, { Document, Schema } from "mongoose";

export interface IAssetCategory extends Document {
    workspaceId: mongoose.Types.ObjectId;
    departmentId: mongoose.Types.ObjectId;
    categoryName: string;
    categoryCode: string;
    requiresSerialNumber: boolean;
    unitSequence: number;
    isActive: boolean;
    createdBy: mongoose.Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

const assetCategorySchema = new Schema<IAssetCategory>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        departmentId: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            required: true,
            index: true,
        },
        categoryName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        categoryCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            maxlength: 12,
            index: true,
        },
        requiresSerialNumber: {
            type: Boolean,
            default: false,
        },
        unitSequence: {
            type: Number,
            default: 0,
            min: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
        },
    },
    { timestamps: true }
);

assetCategorySchema.index({ workspaceId: 1, departmentId: 1, categoryName: 1 }, { unique: true });
assetCategorySchema.index({ workspaceId: 1, categoryCode: 1 }, { unique: true });

export const AssetCategory =
    (mongoose.models.AssetCategory as mongoose.Model<IAssetCategory>) ||
    mongoose.model<IAssetCategory>("AssetCategory", assetCategorySchema);
export default AssetCategory;
