import mongoose, { Schema, Document } from "mongoose";

// Coworking Day Pass (Daily Flexi Desk) — a DEDICATED booking model, kept
// completely separate from MeetingRoomBooking. A day pass is not a meeting
// room booking: it has no hourly start/end slot, no seat number, no invites.
// It books one "sit anywhere" unit of the open coworking floor for a single
// calendar date, against an Open Desk resource only (never Meeting Rooms),
// and carries its own DP-XXXX code series.
//
// Capacity math (see dayPassBookingController.getDayPassAvailability):
//   total Open Desk capacity
//   − desks held long-term by active TenantCompany members
//   − passes already issued for that date (attendees sum, non-cancelled)
export interface IDayPassBooking extends Document {
    workspaceId: mongoose.Types.ObjectId;
    resourceId: mongoose.Types.ObjectId;

    bookingNumber: number;
    bookingCode: string; // "DP-1001"

    guestName: string;
    guestEmail: string;
    guestPhone: string;
    company: string;

    // Calendar date only — no hourly slot. Day passes cover the workspace's
    // standard full-day business hours (09:00 AM – 07:00 PM) by definition.
    date: Date;

    passType: "Full-Day" | "Half-Day";
    attendees: number;

    ratePerPass: number;
    subtotal: number;
    platformFeeAmount: number;
    totalAmount: number;
    currency: string;

    paymentStatus: "Pending" | "Paid" | "Failed";
    paymentMode: "Stripe" | "Cash" | "UPI" | "Card";
    transactionId: string;

    status: "Booked" | "Checked-in" | "Completed" | "Cancelled";
    source: "Website" | "Frontdesk" | "ConvertedVisitor";
    sourceVisitorId: mongoose.Types.ObjectId | null;

    checkedInAt: Date | null;
    checkedOutAt: Date | null;
    notes: string;
}

const dayPassBookingSchema = new Schema<IDayPassBooking>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        resourceId: {
            type: Schema.Types.ObjectId,
            ref: "Resource",
            required: true,
            index: true,
        },
        bookingNumber: {
            type: Number,
            required: true,
            index: true,
        },
        bookingCode: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        guestName: { type: String, required: true, trim: true, maxlength: 160 },
        guestEmail: { type: String, required: true, lowercase: true, trim: true },
        guestPhone: { type: String, default: "", trim: true, maxlength: 40 },
        company: { type: String, default: "", trim: true, maxlength: 160 },

        date: {
            type: Date,
            required: true,
            index: true,
        },

        passType: {
            type: String,
            enum: ["Full-Day", "Half-Day"],
            default: "Full-Day",
        },
        attendees: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
        },

        ratePerPass: { type: Number, required: true, min: 0 },
        subtotal: { type: Number, required: true, min: 0 },
        platformFeeAmount: { type: Number, default: 0, min: 0 },
        totalAmount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: "INR", trim: true, uppercase: true },

        paymentStatus: {
            type: String,
            enum: ["Pending", "Paid", "Failed"],
            default: "Pending",
        },
        paymentMode: {
            type: String,
            enum: ["Stripe", "Cash", "UPI", "Card"],
            default: "Stripe",
        },
        transactionId: { type: String, default: "", trim: true },

        status: {
            type: String,
            enum: ["Booked", "Checked-in", "Completed", "Cancelled"],
            default: "Booked",
            index: true,
        },
        source: {
            type: String,
            enum: ["Website", "Frontdesk", "ConvertedVisitor"],
            default: "Website",
        },
        sourceVisitorId: {
            type: Schema.Types.ObjectId,
            ref: "VisitorLog",
            default: null,
        },

        checkedInAt: { type: Date, default: null },
        checkedOutAt: { type: Date, default: null },
        notes: { type: String, default: "", trim: true, maxlength: 1000 },
    },
    { timestamps: true }
);

// Fast lookups for the availability engine and the daily flexi register.
dayPassBookingSchema.index({ workspaceId: 1, date: 1, status: 1 });
dayPassBookingSchema.index({ workspaceId: 1, bookingNumber: -1 });

export const DayPassBooking =
    mongoose.models.DayPassBooking ||
    mongoose.model<IDayPassBooking>("DayPassBooking", dayPassBookingSchema, "daypassbookings");
