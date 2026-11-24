import mongoose, { Document, Schema } from "mongoose";

export interface ICafeReservationPolicy {
    allowOnlineReservations: boolean;
    type: "free" | "cover_charge";
    chargeBasis: "per_table" | "per_person";
    coverChargeAmount: number;
    minimumSpend: boolean;
}

export interface ICafeSettings extends Document {
    workspaceId: mongoose.Types.ObjectId;
    companyName: string;
    googleReviewUrl: string;
    showReviewQr: boolean;
    taxPercent: number;
    cafeStartTime: string;
    reservationPolicy: ICafeReservationPolicy;
}

const cafeSettingsSchema = new Schema<ICafeSettings>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, unique: true, index: true },
        companyName: { type: String, trim: true, maxlength: 160, default: "" },
        googleReviewUrl: { type: String, trim: true, maxlength: 1000, default: "" },
        showReviewQr: { type: Boolean, default: false },
        taxPercent: { type: Number, min: 0, max: 100, default: 0 },
        cafeStartTime: { type: String, trim: true, default: "06:00" },
        reservationPolicy: {
            allowOnlineReservations: { type: Boolean, default: true },
            type: { type: String, enum: ["free", "cover_charge"], default: "free" },
            chargeBasis: { type: String, enum: ["per_table", "per_person"], default: "per_table" },
            coverChargeAmount: { type: Number, min: 0, default: 0 },
            minimumSpend: { type: Boolean, default: true },
        },
    },
    { timestamps: true },
);

export const CafeSettings =
    (mongoose.models.CafeSettings as mongoose.Model<ICafeSettings>) ||
    mongoose.model<ICafeSettings>("CafeSettings", cafeSettingsSchema);
