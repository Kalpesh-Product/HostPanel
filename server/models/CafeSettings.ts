import mongoose, { Document, Schema } from "mongoose";

export interface ICafeSettings extends Document {
    workspaceId: mongoose.Types.ObjectId;
    companyName: string;
    googleReviewUrl: string;
    showReviewQr: boolean;
    taxPercent: number;
    cafeStartTime: string;
}

const cafeSettingsSchema = new Schema<ICafeSettings>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, unique: true, index: true },
        companyName: { type: String, trim: true, maxlength: 160, default: "" },
        googleReviewUrl: { type: String, trim: true, maxlength: 1000, default: "" },
        showReviewQr: { type: Boolean, default: false },
        taxPercent: { type: Number, min: 0, max: 100, default: 0 },
        cafeStartTime: { type: String, trim: true, default: "06:00" },
    },
    { timestamps: true },
);

export const CafeSettings =
    (mongoose.models.CafeSettings as mongoose.Model<ICafeSettings>) ||
    mongoose.model<ICafeSettings>("CafeSettings", cafeSettingsSchema);
