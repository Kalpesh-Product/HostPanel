import mongoose, { Schema, Document } from "mongoose";

export const CAFE_RESERVATION_STATUSES = ["Confirmed", "Seated", "No-show", "Cancelled"] as const;
export type CafeReservationStatus = (typeof CAFE_RESERVATION_STATUSES)[number];
export const CAFE_RESERVATION_OPEN_STATUSES: CafeReservationStatus[] = ["Confirmed"];

export interface ICafeReservation extends Document {
    workspaceId: mongoose.Types.ObjectId;
    reservationNumber: number;
    guestName: string;
    guestPhone: string;
    partySize: number;
    reservationAt: Date;
    tableId: mongoose.Types.ObjectId | null;
    status: CafeReservationStatus;
    notes: string;
    cancelReason: string;
    createdBy?: mongoose.Types.ObjectId | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const cafeReservationSchema = new Schema<ICafeReservation>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
        reservationNumber: { type: Number, required: true, index: true },
        guestName: { type: String, required: true, trim: true, maxlength: 160 },
        guestPhone: { type: String, trim: true, default: "", maxlength: 40 },
        partySize: { type: Number, required: true, min: 1 },
        reservationAt: { type: Date, required: true, index: true },
        tableId: { type: Schema.Types.ObjectId, ref: "CafeTable", default: null },
        status: { type: String, enum: CAFE_RESERVATION_STATUSES, default: "Confirmed", index: true },
        notes: { type: String, trim: true, default: "", maxlength: 500 },
        cancelReason: { type: String, trim: true, default: "", maxlength: 500 },
        createdBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    },
    { timestamps: true }
);

cafeReservationSchema.index({ workspaceId: 1, reservationNumber: 1 }, { unique: true });

export const CafeReservation =
    (mongoose.models.CafeReservation as mongoose.Model<ICafeReservation>) ||
    mongoose.model<ICafeReservation>("CafeReservation", cafeReservationSchema);
