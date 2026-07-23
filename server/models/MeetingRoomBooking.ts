import mongoose, { Schema, Document } from "mongoose";

export interface IMeetingRoomBooking extends Document {
    workspaceId: mongoose.Types.ObjectId;
    roomId: mongoose.Types.ObjectId;
    bookingNumber: number;
    bookingCode: string;

    ownerId: mongoose.Types.ObjectId;
    bookedByUserId?: mongoose.Types.ObjectId;

    roomName: string;
    bookedByName: string;
    bookedByEmail: string;
    bookedForName?: string;

    bookingType: "Internal" | "External" | "Tenant";
    timezone: string;
    currency: string;

    start: Date;
    end: Date;
    originalStart?: Date;
    originalEnd?: Date;

    attendees: number;
    // For shared desk-area resources (capacity > 1): which seat this booking
    // holds. Null for single-occupancy resources (meeting rooms, cabins).
    seatNumber?: number | null;
    purpose: string;
    department?: string;
    departmentId?: mongoose.Types.ObjectId | null;

    invites: Array<{
        invitedUserId?: mongoose.Types.ObjectId;
        invitedName: string;
        invitedEmail?: string;
        status: "pending" | "accepted" | "rejected" | "cancelled";
        respondedAt?: Date;
        responseReason?: string;
    }>;

    bookedByTenantCompanyId?: string;
    bookedByTenantCompanyName?: string;

    bookingCredits: number;
    subtotalBeforeDiscount: number;
    discountAmount: number;
    taxableBaseAfterDiscount: number;
    baseAmount: number;
    gstAmount: number;
    totalAmount: number;
    taxLabel?: string;
    taxRatePercent?: number;
    priceIncludesTax?: boolean;

    paymentStatus: string;
    paymentMode?: string;
    paymentMethodCode?: string;
    paymentMethodLabel?: string;
    paymentRequiresReference?: boolean;
    paymentRequiresProof?: boolean;
    transactionId?: string;
    paymentProofUrl?: string;

    status: "pending" | "confirmed" | "in-progress" | "completed" | "cancelled" | "rescheduled";
    cancelReason?: string;
    bookingNotes?: string;
    reminderSentAt?: Date;

    scheduleChangeType?: string;
    extensionAmount?: number;

    // External booking fields
    externalClientId?: mongoose.Types.ObjectId | null;
    discountType: "flat" | "percent";
    discountValue: number;

    // For recurring bookings (future extension)
    isRecurring?: boolean;
    recurrenceRule?: string; // e.g., "FREQ=WEEKLY;INTERVAL=1"
}

const meetingRoomBookingSchema = new Schema<IMeetingRoomBooking>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        roomId: {
            type: Schema.Types.ObjectId,
            ref: "Resource",
            required: true,
            index: true,
        },
        bookingNumber: {
            type: Number,
            required: true,
        },
        bookingCode: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },

        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            required: true,
        },
        bookedByUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
        },

        roomName: { type: String, required: true },
        bookedByName: { type: String, required: true },
        bookedByEmail: { type: String, lowercase: true, trim: true },

        bookingType: {
            type: String,
            enum: ["Internal", "External", "Tenant"],
            default: "Internal",
        },
        timezone: { type: String, required: true, default: "Asia/Kolkata", trim: true },
        currency: { type: String, required: true, default: "INR", trim: true, uppercase: true },

        start: {
            type: Date,
            required: true,
            index: true,
        },
        end: {
            type: Date,
            required: true,
            index: true,
        },
        originalStart: Date,
        originalEnd: Date,

        attendees: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
        },
        seatNumber: {
            type: Number,
            default: null,
        },
        purpose: {
            type: String,
            required: true,
            maxlength: 1000,
        },
        department: {
            type: String,
            trim: true,
            maxlength: 80,
        },
        departmentId: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            default: null,
            index: true,
        },

        invites: [
            {
                invitedUserId: { type: Schema.Types.ObjectId, ref: "HostUser" },
                invitedName: { type: String, required: true },
                invitedEmail: { type: String, lowercase: true, trim: true },
                status: {
                    type: String,
                    enum: ["pending", "accepted", "rejected", "cancelled"],
                    default: "pending",
                },
                respondedAt: Date,
                responseReason: { type: String, maxlength: 1000 },
            },
        ],

        bookedByTenantCompanyId: { type: String, trim: true, index: true },
        bookedByTenantCompanyName: { type: String, trim: true },
        bookedForName: { type: String, trim: true, default: "" },

        bookingCredits: { type: Number, default: 0, min: 0 },
        subtotalBeforeDiscount: { type: Number, default: 0, min: 0 },
        discountAmount: { type: Number, default: 0, min: 0 },
        taxableBaseAfterDiscount: { type: Number, default: 0, min: 0 },
        baseAmount: { type: Number, default: 0, min: 0 },
        gstAmount: { type: Number, default: 0, min: 0 },
        totalAmount: { type: Number, default: 0, min: 0 },
        taxLabel: { type: String, trim: true, default: "Tax", maxlength: 40 },
        taxRatePercent: { type: Number, default: 0, min: 0, max: 100 },
        priceIncludesTax: { type: Boolean, default: false },

        paymentStatus: { type: String, default: "Pending" },
        paymentMode: { type: String, trim: true, default: "" },
        paymentMethodCode: { type: String, trim: true, lowercase: true, default: "" },
        paymentMethodLabel: { type: String, trim: true, default: "", maxlength: 80 },
        paymentRequiresReference: { type: Boolean, default: false },
        paymentRequiresProof: { type: Boolean, default: false },
        transactionId: String,
        paymentProofUrl: String,

        status: {
            type: String,
            enum: ["pending", "confirmed", "in-progress", "completed", "cancelled", "rescheduled"],
            default: "confirmed",
            index: true,
        },

        cancelReason: { type: String, maxlength: 1000 },
        bookingNotes: { type: String, maxlength: 1000 },
        // Set once the 30-minutes-before-start reminder email has gone out,
        // so the scheduler never double-sends for the same booking.
        reminderSentAt: { type: Date, default: null },
        scheduleChangeType: { type: String, enum: ["rescheduled", "extended"] },
        extensionAmount: { type: Number, default: 0, min: 0 },

        isRecurring: { type: Boolean, default: false },
        recurrenceRule: String,

        // External booking fields
        externalClientId: {
            type: Schema.Types.ObjectId,
            ref: "Client",
            default: null,
            sparse: true,
            index: true,
        },
        discountType: {
            type: String,
            enum: ["flat", "percent"],
            default: "flat",
        },
        discountValue: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

// Important Indexes
meetingRoomBookingSchema.index({ workspaceId: 1, bookingNumber: 1 }, { unique: true });
meetingRoomBookingSchema.index({ roomId: 1, start: 1, end: 1 });           // Overlap detection
meetingRoomBookingSchema.index({ workspaceId: 1, start: 1, status: 1 });
meetingRoomBookingSchema.index({ workspaceId: 1, ownerId: 1, start: -1 });
meetingRoomBookingSchema.index({ workspaceId: 1, "invites.invitedUserId": 1 });

export const MeetingRoomBooking =
    mongoose.models.MeetingRoomBooking ||
    mongoose.model<IMeetingRoomBooking>("MeetingRoomBooking", meetingRoomBookingSchema);
