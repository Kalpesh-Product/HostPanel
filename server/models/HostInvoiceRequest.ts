import mongoose, { Schema, Document } from "mongoose";

// A host-initiated "pay me out" request to WONO, consolidating every
// finalized, paid website booking (meeting room or co-living/hostel stay)
// not yet invoiced — one payout request per click, not one per booking
// (a busy host can have 15+ bookings/day; 15 separate bank transfers would
// eat the margin in wire fees alone). `amount` is always the host's NET
// take — sum of each booking's paymentBaseAmount, excluding the WoNo
// platform fee already retained at source.
//
// Each booking's detail is snapshotted onto this record at request time
// (not just an id to join against WebsiteLead later) — an invoice is a
// record of what was billed at that moment; it shouldn't silently change
// if the underlying lead is later edited.
//
// This collection lives in the same shared DB MasterPanel reads from
// (WonoMasterData) — HostPanel writes the request here; MasterPanel's own
// payout UI reads/updates it (marks status Paid once wired out).
export const HOST_INVOICE_STATUSES = ["Requested", "Paid", "Rejected"] as const;
export type HostInvoiceStatus = (typeof HOST_INVOICE_STATUSES)[number];

export interface IHostInvoiceRequestBooking {
    leadId: mongoose.Types.ObjectId;
    bookingId?: mongoose.Types.ObjectId | null;
    bookingCode: string;
    bookingType: "MeetingRoom" | "CoLiving" | "Hostel";
    resourceName: string;
    guestName: string;
    startDate?: Date | null;
    endDate?: Date | null;
    amount: number;
}

export interface IHostInvoiceRequest extends Document {
    workspaceId: mongoose.Types.ObjectId;
    companyId: string;
    companyName: string;
    bookings: IHostInvoiceRequestBooking[];
    amount: number;
    currency: string;
    status: HostInvoiceStatus;
    invoicePdfUrl: string;
    requestedBy?: mongoose.Types.ObjectId | null;
    requestedAt: Date;
    paidAt?: Date | null;
    notes: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const hostInvoiceRequestBookingSchema = new Schema<IHostInvoiceRequestBooking>(
    {
        leadId: { type: Schema.Types.ObjectId, ref: "WebsiteLead", required: true },
        bookingId: { type: Schema.Types.ObjectId, default: null },
        bookingCode: { type: String, trim: true, required: true },
        bookingType: { type: String, required: true, enum: ["MeetingRoom", "CoLiving", "Hostel"] },
        resourceName: { type: String, trim: true, default: "" },
        guestName: { type: String, trim: true, default: "" },
        startDate: { type: Date, default: null },
        endDate: { type: Date, default: null },
        amount: { type: Number, required: true, min: 0 },
    },
    { _id: false },
);

const hostInvoiceRequestSchema = new Schema<IHostInvoiceRequest>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
        companyId: { type: String, trim: true, default: "", index: true },
        companyName: { type: String, trim: true, default: "" },
        bookings: { type: [hostInvoiceRequestBookingSchema], required: true, validate: (v: unknown[]) => Array.isArray(v) && v.length > 0 },
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, trim: true, uppercase: true, default: "USD" },
        status: { type: String, enum: HOST_INVOICE_STATUSES, default: "Requested", index: true },
        invoicePdfUrl: { type: String, trim: true, default: "" },
        requestedBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
        requestedAt: { type: Date, default: Date.now },
        paidAt: { type: Date, default: null },
        notes: { type: String, trim: true, default: "", maxlength: 500 },
    },
    { timestamps: true }
);

export const HostInvoiceRequest =
    (mongoose.models.HostInvoiceRequest as mongoose.Model<IHostInvoiceRequest>) ||
    mongoose.model<IHostInvoiceRequest>("HostInvoiceRequest", hostInvoiceRequestSchema);
