import mongoose, { Schema, Document } from "mongoose";

export const ROOM_STAY_STATUSES = ["Booked", "Checked-in", "Checked-out", "Cancelled"] as const;
export type RoomStayStatus = (typeof ROOM_STAY_STATUSES)[number];
export const ROOM_STAY_OPEN_STATUSES: RoomStayStatus[] = ["Booked", "Checked-in"];
export const ROOM_STAY_BOOKING_SOURCES = ["Walk-in", "Phone", "Website", "Partner"] as const;
export type RoomStayBookingSource = (typeof ROOM_STAY_BOOKING_SOURCES)[number];

export interface IRoomStayBooking extends Document {
    workspaceId: mongoose.Types.ObjectId;
    bookingNumber: number;
    roomId: mongoose.Types.ObjectId;
    roomType: "Room" | "Dorm";
    bookingSource: RoomStayBookingSource;
    bedNumber?: number | null;
    bedCount: number;
    bedNumbers: number[];
    guestName: string;
    guestPhone: string;
    guestEmail: string;
    guestAge?: number | null;
    guestCountry: string;
    guestState: string;
    guestCity: string;
    guestNationality: string;
    guestDateOfBirth?: Date | null;
    guestGender: string;
    guestAddress: string;
    additionalGuests: Array<{
        name: string;
        age: number;
        gender: string;
    }>;
    emergencyContactName: string;
    emergencyContactPhone: string;
    checkIn: Date;
    checkOut: Date;
    nights: number;
    ratePerNight: number;
    subtotalBeforeDiscount: number;
    discountType: "amount" | "percent";
    discountValue: number;
    discountAmount: number;
    taxApplied: boolean;
    taxLabel: string;
    taxRatePercent: number;
    taxAmount: number;
    total: number;
    status: RoomStayStatus;
    notes: string;
    cancelReason: string;
    idProofType: string;
    idProofNumber: string;
    idProofFile?: {
        fileName: string;
        fileUrl: string;
        publicId: string;
    } | null;
    paymentMethod: string;
    paymentTransactionNumber: string;
    amountPaid: number;
    securityDepositRequired: boolean;
    securityDepositAmount: number;
    securityDepositCollected: number;
    securityDepositPaymentMethod: string;
    securityDepositProof?: {
        fileName: string;
        fileUrl: string;
        publicId: string;
    } | null;
    securityDepositRefunded: boolean;
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
        roomId: { type: Schema.Types.ObjectId, ref: "Resource", required: true, index: true },
        roomType: { type: String, required: true, enum: ["Room", "Dorm"] },
        bookingSource: { type: String, enum: ROOM_STAY_BOOKING_SOURCES, default: "Walk-in", index: true },
        // bedNumber keeps the first/primary bed for backward compatibility
        // (older bookings, single-room bookings); bedNumbers holds every bed
        // in this booking when a guest/group reserves more than one dorm bed.
        bedNumber: { type: Number, default: null },
        bedCount: { type: Number, default: 1, min: 1 },
        bedNumbers: { type: [Number], default: [] },
        guestName: { type: String, required: true, trim: true, maxlength: 160 },
        guestPhone: { type: String, trim: true, default: "", maxlength: 40 },
        guestEmail: { type: String, trim: true, lowercase: true, default: "", maxlength: 160 },
        guestAge: { type: Number, min: 1, max: 120, default: null },
        guestCountry: { type: String, trim: true, default: "", maxlength: 100 },
        guestState: { type: String, trim: true, default: "", maxlength: 100 },
        guestCity: { type: String, trim: true, default: "", maxlength: 100 },
        guestNationality: { type: String, trim: true, default: "", maxlength: 80 },
        guestDateOfBirth: { type: Date, default: null },
        guestGender: { type: String, trim: true, default: "", maxlength: 40 },
        guestAddress: { type: String, trim: true, default: "", maxlength: 300 },
        additionalGuests: {
            type: [
                new Schema(
                    {
                        name: { type: String, required: true, trim: true, maxlength: 160 },
                        age: { type: Number, required: true, min: 1, max: 120 },
                        gender: { type: String, required: true, trim: true, maxlength: 40 },
                    },
                    { _id: false }
                ),
            ],
            default: [],
        },
        emergencyContactName: { type: String, trim: true, default: "", maxlength: 160 },
        emergencyContactPhone: { type: String, trim: true, default: "", maxlength: 40 },
        checkIn: { type: Date, required: true },
        checkOut: { type: Date, required: true },
        nights: { type: Number, required: true, min: 1 },
        ratePerNight: { type: Number, required: true, min: 0 },
        // Pricing breakdown — mirrors the discount/tax model used for walk-in
        // bookings elsewhere (Visitor Management): subtotal -> discount ->
        // taxable base -> tax -> total. Stored so historical bookings keep
        // showing the breakdown even if workspace tax settings change later.
        subtotalBeforeDiscount: { type: Number, min: 0, default: 0 },
        discountType: { type: String, enum: ["amount", "percent"], default: "amount" },
        discountValue: { type: Number, min: 0, default: 0 },
        discountAmount: { type: Number, min: 0, default: 0 },
        taxApplied: { type: Boolean, default: false },
        taxLabel: { type: String, trim: true, default: "", maxlength: 40 },
        taxRatePercent: { type: Number, min: 0, max: 100, default: 0 },
        taxAmount: { type: Number, min: 0, default: 0 },
        total: { type: Number, required: true, min: 0 },
        status: { type: String, enum: ROOM_STAY_STATUSES, default: "Booked", index: true },
        notes: { type: String, trim: true, default: "", maxlength: 500 },
        cancelReason: { type: String, trim: true, default: "", maxlength: 500 },
        idProofType: { type: String, trim: true, default: "", maxlength: 60 },
        idProofNumber: { type: String, trim: true, default: "", maxlength: 60 },
        idProofFile: {
            type: new Schema(
                {
                    fileName: { type: String, trim: true, default: "" },
                    fileUrl: { type: String, trim: true, default: "" },
                    publicId: { type: String, trim: true, default: "" },
                },
                { _id: false }
            ),
            default: null,
        },
        paymentMethod: { type: String, trim: true, default: "", maxlength: 40 },
        paymentTransactionNumber: { type: String, trim: true, default: "", maxlength: 120 },
        amountPaid: { type: Number, min: 0, default: 0 },
        // Security deposit — set from the room's configured deposit at the time
        // of booking, so later changes to the room's deposit setting don't
        // retroactively change what an existing booking owes/collected.
        securityDepositRequired: { type: Boolean, default: false },
        securityDepositAmount: { type: Number, min: 0, default: 0 },
        securityDepositCollected: { type: Number, min: 0, default: 0 },
        securityDepositPaymentMethod: { type: String, trim: true, default: "", maxlength: 40 },
        securityDepositProof: {
            type: new Schema(
                {
                    fileName: { type: String, trim: true, default: "" },
                    fileUrl: { type: String, trim: true, default: "" },
                    publicId: { type: String, trim: true, default: "" },
                },
                { _id: false }
            ),
            default: null,
        },
        securityDepositRefunded: { type: Boolean, default: false },
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
