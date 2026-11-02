import mongoose, { Schema, Document } from "mongoose";

export interface ICafeTable extends Document {
    workspaceId: mongoose.Types.ObjectId;
    name: string;
    seats: number;
    isActive: boolean;
    sortOrder: number;
    createdBy?: mongoose.Types.ObjectId | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const cafeTableSchema = new Schema<ICafeTable>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        name: { type: String, required: true, trim: true, maxlength: 60 },
        seats: { type: Number, default: 4, min: 1 },
        isActive: { type: Boolean, default: true, index: true },
        sortOrder: { type: Number, default: 0 },
        createdBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    },
    { timestamps: true }
);

cafeTableSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export const CafeTable =
    (mongoose.models.CafeTable as mongoose.Model<ICafeTable>) ||
    mongoose.model<ICafeTable>("CafeTable", cafeTableSchema);
