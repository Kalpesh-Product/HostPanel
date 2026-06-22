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

    start: Date;
    end: Date;
    originalStart?: Date;
    originalEnd?: Date;

    attendees: number;
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
    baseAmount: number;
    gstAmount: number;
    totalAmount: number;

    paymentStatus: string;
    transactionId?: string;
    paymentProofUrl?: string;

    status: "pending" | "confirmed" | "in-progress" | "completed" | "cancelled" | "rescheduled";
    cancelReason?: string;
    bookingNotes?: string;

    scheduleChangeType?: string;
    extensionAmount?: number;

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
        baseAmount: { type: Number, default: 0, min: 0 },
        gstAmount: { type: Number, default: 0, min: 0 },
        totalAmount: { type: Number, default: 0, min: 0 },

        paymentStatus: { type: String, default: "Pending" },
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
        scheduleChangeType: { type: String, enum: ["rescheduled", "extended"] },
        extensionAmount: { type: Number, default: 0, min: 0 },

        isRecurring: { type: Boolean, default: false },
        recurrenceRule: String,
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
