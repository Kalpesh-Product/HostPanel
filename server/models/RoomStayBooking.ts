import mongoose, { Schema, Document } from "mongoose";

export const ROOM_STAY_STATUSES = ["Booked", "Checked-in", "Checked-out", "Cancelled"] as const;
export type RoomStayStatus = (typeof ROOM_STAY_STATUSES)[number];
export const ROOM_STAY_OPEN_STATUSES: RoomStayStatus[] = ["Booked", "Checked-in"];

export interface IRoomStayBooking extends Document {
    workspaceId: mongoose.Types.ObjectId;
    bookingNumber: number;
    roomId: mongoose.Types.ObjectId;
    roomType: "Room" | "Dorm";
    bedNumber?: number | null;
    guestName: string;
    guestPhone: string;
    checkIn: Date;
    checkOut: Date;
    nights: number;
    ratePerNight: number;
    total: number;
    status: RoomStayStatus;
    notes: string;
    cancelReason: string;
    idProofType: string;
    idProofNumber: string;
    paymentMethod: string;
    amountPaid: number;
    actualCheckInAt?: Date | null;
    actualCheckOutAt?: Date | null;
    lateFeeAmount: number;
    createdBy?: mongoose.Types.ObjectId | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const roomStayBookingSchema = new Schema<IRoomStayBooking>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        bookingNumber: { type: Number, required: true, index: true },
        roomId: { type: Schema.Types.ObjectId, ref: "GuestRoom", required: true, index: true },
        roomType: { type: String, required: true, enum: ["Room", "Dorm"] },
        bedNumber: { type: Number, default: null },
        guestName: { type: String, required: true, trim: true, maxlength: 160 },
        guestPhone: { type: String, trim: true, default: "", maxlength: 40 },
        checkIn: { type: Date, required: true },
        checkOut: { type: Date, required: true },
        nights: { type: Number, required: true, min: 1 },
        ratePerNight: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
        status: { type: String, enum: ROOM_STAY_STATUSES, default: "Booked", index: true },
        notes: { type: String, trim: true, default: "", maxlength: 500 },
        cancelReason: { type: String, trim: true, default: "", maxlength: 500 },
        idProofType: { type: String, trim: true, default: "", maxlength: 60 },
        idProofNumber: { type: String, trim: true, default: "", maxlength: 60 },
        paymentMethod: { type: String, trim: true, default: "", maxlength: 40 },
        amountPaid: { type: Number, min: 0, default: 0 },
        actualCheckInAt: { type: Date, default: null },
        actualCheckOutAt: { type: Date, default: null },
        lateFeeAmount: { type: Number, min: 0, default: 0 },
        createdBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    },
    { timestamps: true }
);

roomStayBookingSchema.index({ workspaceId: 1, bookingNumber: 1 }, { unique: true });
roomStayBookingSchema.index({ roomId: 1, bedNumber: 1, checkIn: 1, checkOut: 1 });

export const RoomStayBooking =
    (mongoose.models.RoomStayBooking as mongoose.Model<IRoomStayBooking>) ||
    mongoose.model<IRoomStayBooking>("RoomStayBooking", roomStayBookingSchema);
