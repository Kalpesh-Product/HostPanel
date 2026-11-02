// @ts-nocheck
import mongoose from "mongoose";

const websiteLeadSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, trim: true, index: true, default: "" },
    companyId: { type: String, trim: true, index: true, default: "" },
    companyName: { type: String, trim: true, default: "" },
    fullName: { type: String, trim: true, required: true },
    email: { type: String, trim: true, default: "" },
    mobileNumber: { type: String, trim: true, default: "" },
    message: { type: String, trim: true, default: "" },
    source: { type: String, trim: true, default: "website" },
    vertical: { type: String, trim: true, default: "co-working" },
    productType: { type: String, trim: true, default: "" },
    noOfPeople: { type: String, trim: true, default: "" },
    leadMeta: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, trim: true, default: "Pending" },
    hostPanelStatus: {
      type: String,
      trim: true,
      enum: ["Pending", "Accepted", "Rejected", "Closed"],
      default: "Pending",
    },
    hostPanelStatusUpdatedAt: { type: Date, default: null },
    // Host panel pricing snapshot, computed at accept time from leadMeta
    // (rate x duration) + the 5% HostPanel platform fee. Amounts stay in the
    // lead until the payment completes and the booking is finalized below.
    paymentStatus: {
      type: String,
      trim: true,
      // "Rejected" belongs here too: a rejected lead can never be paid.
      enum: ["Pending", "Paid", "Failed", "Rejected"],
      default: "Pending",
    },
    paymentCurrency: { type: String, trim: true, uppercase: true, default: "USD" },
    // Subtotal = the price before any host-given discount; paymentBaseAmount
    // (below) is what's left after the discount, and what fees/total are
    // actually computed from.
    paymentSubtotalAmount: { type: Number, default: 0, min: 0 },
    discountType: { type: String, trim: true, enum: ["amount", "percent"], default: "amount" },
    discountValue: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    paymentBaseAmount: { type: Number, default: 0, min: 0 },
    paymentPlatformFeePercent: { type: Number, default: 5, min: 0, max: 100 },
    paymentPlatformFeeAmount: { type: Number, default: 0, min: 0 },
    paymentStripeFeePercent: { type: Number, default: 2, min: 0, max: 100 },
    paymentStripeFeeAmount: { type: Number, default: 0, min: 0 },
    paymentTotalAmount: { type: Number, default: 0, min: 0 },
    paymentStatusUpdatedAt: { type: Date, default: null },
    paymentTransactionId: { type: String, trim: true, default: "" },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "MeetingRoomBooking", default: null },
    bookingCode: { type: String, trim: true, default: "" },
    comment: { type: String, trim: true, default: "" },
    upstreamSynced: { type: Boolean, default: false },
    upstreamError: { type: String, default: "" },
    isEscalated: { type: Boolean, default: false, index: true },
    escalatedWorkspaceId: { type: String, trim: true, default: "", index: true },
    escalatedHostCompanyId: { type: String, trim: true, default: "", index: true },
    escalatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const WebsiteLead =
  mongoose.models.WebsiteLead ||
  mongoose.model("WebsiteLead", websiteLeadSchema);

export default WebsiteLead;
