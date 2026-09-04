// @ts-nocheck
import mongoose, { Schema } from "mongoose";

// One document per tenant company per contract month — the monthly rent
// receivable that Finance sees in Billing & Payments → "Tenant Rent".
// Lifecycle: Due → Proof Submitted (tenant uploads payment proof) → Paid
// (finance verifies and confirms). "Overdue" is DERIVED for display
// (dueDate passed && status !== "Paid") and is never stored.

const tenantRentActionSchema = new Schema(
  {
    action: { type: String, default: "", trim: true, maxlength: 80 },
    status: { type: String, default: "", trim: true, maxlength: 60 },
    note: { type: String, default: "", trim: true, maxlength: 500 },
    actorUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    actorName: { type: String, default: "", trim: true, maxlength: 140 },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const tenantRentProofSchema = new Schema(
  {
    fileName: { type: String, default: "", trim: true, maxlength: 200 },
    fileUrl: { type: String, default: "", trim: true, maxlength: 2048 },
    publicId: { type: String, default: "", trim: true, maxlength: 255 },
    mimeType: { type: String, default: "", trim: true, maxlength: 120 },
    size: { type: String, default: "", trim: true, maxlength: 40 },
  },
  { _id: false },
);

const tenantRentSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    tenantCompanyId: { type: Schema.Types.ObjectId, ref: "TenantCompany", required: true, index: true },
    // Denormalized snapshots so the finance list never needs a join.
    tenantCode: { type: String, default: "", trim: true, maxlength: 40 },
    companyName: { type: String, default: "", trim: true, maxlength: 160 },
    // Human code used in URLs / lookups (like TenantCreditRequest.id).
    id: { type: String, default: () => `RNT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, trim: true, index: true },
    // "2026-09" — the idempotency key: one rent record per company per month.
    periodKey: { type: String, required: true, trim: true, maxlength: 7 },
    periodLabel: { type: String, default: "", trim: true, maxlength: 40 },
    dueDate: { type: Date, required: true, index: true },
    // Rent frozen at generation time so later rent changes never rewrite history.
    amount: { type: Number, default: 0, min: 0 },
    status: {
      type: String, default: "Due", trim: true, enum: ["Due", "Proof Submitted", "Paid"], index: true,
    },
    paymentProof: { type: tenantRentProofSchema, default: () => ({}) },
    transactionReference: { type: String, default: "", trim: true, maxlength: 160 },
    submittedById: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
    submittedByName: { type: String, default: "", trim: true, maxlength: 140 },
    submittedAt: { type: Date, default: null },
    verifiedById: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
    verifiedByName: { type: String, default: "", trim: true, maxlength: 140 },
    verifiedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    // Set when finance returns a proof back to the tenant (Proof Submitted → Due).
    rejection: {
      reason: { type: String, default: "", trim: true, maxlength: 500 },
      rejectedById: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
      rejectedByName: { type: String, default: "", trim: true, maxlength: 140 },
      rejectedAt: { type: Date, default: null },
    },
    actionHistory: { type: [tenantRentActionSchema], default: [] },
    source: { type: String, default: "scheduler", trim: true, enum: ["scheduler", "manual"] },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Idempotency guard for the monthly generation sweep: a company can never
// end up with two rent records for the same month.
tenantRentSchema.index({ tenantCompanyId: 1, periodKey: 1 }, { unique: true });
tenantRentSchema.index({ workspaceId: 1, status: 1, dueDate: -1 });
tenantRentSchema.index({ workspaceId: 1, dueDate: -1 });

export const TenantRent =
  (mongoose.models.TenantRent as mongoose.Model<any>) ||
  mongoose.model<any>("TenantRent", tenantRentSchema);

export default TenantRent;
