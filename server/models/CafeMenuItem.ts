import mongoose, { Schema, Document } from "mongoose";

export interface ICafeMenuItem extends Document {
    workspaceId: mongoose.Types.ObjectId;
    name: string;
    category: string;
    description: string;
    price: number;
    isAvailable: boolean;
    sortOrder: number;
    createdBy?: mongoose.Types.ObjectId | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const cafeMenuItemSchema = new Schema<ICafeMenuItem>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        category: {
            type: String,
            trim: true,
            maxlength: 60,
            default: "Uncategorised",
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        isAvailable: {
            type: Boolean,
            default: true,
            index: true,
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
        },
    },
    { timestamps: true }
);

export const CafeMenuItem =
    (mongoose.models.CafeMenuItem as mongoose.Model<ICafeMenuItem>) ||
    mongoose.model<ICafeMenuItem>("CafeMenuItem", cafeMenuItemSchema);
