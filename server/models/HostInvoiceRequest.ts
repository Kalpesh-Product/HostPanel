import mongoose, { Schema, Document } from "mongoose";

// A host-initiated "pay me out" request to WONO for a finalized website
// booking (meeting room or co-living/hostel stay). The amount is always
// the host's NET take — paymentBaseAmount, excluding the WoNo platform fee
// and Stripe processing fee the client's payment already covered — since
// that's what WONO owes the host after already having taken its cut.
//
// This collection lives in the same shared DB MasterPanel reads from
// (WonoMasterData) — HostPanel writes the request here; MasterPanel's own
// payout UI (not built yet — staff will say where it goes) reads/updates it.
export const HOST_INVOICE_STATUSES = ["Requested", "Paid", "Rejected"] as const;
export type HostInvoiceStatus = (typeof HOST_INVOICE_STATUSES)[number];

export interface IHostInvoiceRequest extends Document {
    workspaceId: mongoose.Types.ObjectId;
    companyId: string;
    companyName: string;
    leadId: mongoose.Types.ObjectId;
    bookingId?: mongoose.Types.ObjectId | null;
    bookingCode: string;
    bookingType: "MeetingRoom" | "CoLiving" | "Hostel";
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

const hostInvoiceRequestSchema = new Schema<IHostInvoiceRequest>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
        companyId: { type: String, trim: true, default: "", index: true },
        companyName: { type: String, trim: true, default: "" },
        leadId: { type: Schema.Types.ObjectId, ref: "WebsiteLead", required: true, index: true, unique: true },
        bookingId: { type: Schema.Types.ObjectId, default: null },
        bookingCode: { type: String, trim: true, required: true, index: true },
        bookingType: { type: String, required: true, enum: ["MeetingRoom", "CoLiving", "Hostel"] },
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
