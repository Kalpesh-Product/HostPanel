import mongoose, { Schema, Document } from "mongoose";

export interface ICafeCategory extends Document {
    workspaceId: mongoose.Types.ObjectId;
    name: string;
    sortOrder: number;
    createdAt?: Date;
    updatedAt?: Date;
}

const cafeCategorySchema = new Schema<ICafeCategory>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        name: { type: String, required: true, trim: true, maxlength: 60 },
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
);

cafeCategorySchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export const CafeCategory =
    (mongoose.models.CafeCategory as mongoose.Model<ICafeCategory>) ||
    mongoose.model<ICafeCategory>("CafeCategory", cafeCategorySchema);

export const DEFAULT_CAFE_CATEGORIES = [
    "Coffee",
    "Tea",
    "Cold Drinks",
    "Smoothies & Shakes",
    "Juices",
    "Breakfast",
    "Sandwiches & Wraps",
    "Salads",
    "Pasta & Mains",
    "Snacks",
    "Bakery",
    "Desserts",
    "Ice Cream",
];
