import mongoose, { Document, Schema } from "mongoose";

export interface IAssetSubCategory extends Document {
    workspaceId: mongoose.Types.ObjectId;
    departmentId: mongoose.Types.ObjectId;
    categoryId: mongoose.Types.ObjectId;
    subCategoryName: string;
    isActive: boolean;
    createdBy: mongoose.Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

const assetSubCategorySchema = new Schema<IAssetSubCategory>(
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
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: "AssetCategory",
            required: true,
            index: true,
        },
        subCategoryName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
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

assetSubCategorySchema.index({ workspaceId: 1, categoryId: 1, subCategoryName: 1 }, { unique: true });

export const AssetSubCategory =
    (mongoose.models.AssetSubCategory as mongoose.Model<IAssetSubCategory>) ||
    mongoose.model<IAssetSubCategory>("AssetSubCategory", assetSubCategorySchema);
export default AssetSubCategory;
