// @ts-nocheck
import mongoose, { Schema } from "mongoose";

// One document per landlord per contract month — the monthly rent PAYABLE that
// Finance settles with the property owner. Mirrors TenantRent (the receivable
// side) so both directions of rent behave the same in reports: the payable row
// is frozen at generation time, and payments are appended, never overwritten.
//
// Lifecycle: Due → Partial → Paid. "Overdue" is DERIVED for display
// (dueDate passed && status !== "Paid") and is never stored, so a background
// job can never write a wrong status.
//
// Corrections are append-only: a mistyped payment is VOIDED (kept with actor,
// timestamp and reason) instead of deleted, because rent is an audit-sensitive
// number that an external auditor may ask to reconstruct.

const rentPaymentSchema = new Schema(
  {
    id: { type: String, default: () => `LPM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paidOn: { type: Date, default: Date.now },
    method: { type: String, default: "", trim: true, maxlength: 60 },
    reference: { type: String, default: "", trim: true, maxlength: 120 },
    note: { type: String, default: "", trim: true, maxlength: 300 },
    recordedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    recordedByName: { type: String, default: "", trim: true, maxlength: 140 },
    recordedAt: { type: Date, default: Date.now },
    // Append-only reversal marker.
    voided: { type: Boolean, default: false },
    voidedAt: { type: Date, default: null },
    voidedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    voidedByName: { type: String, default: "", trim: true, maxlength: 140 },
    voidReason: { type: String, default: "", trim: true, maxlength: 300 },
  },
  { _id: false },
);

const landlordRentSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    landlordId: { type: Schema.Types.ObjectId, ref: "FinanceLandlord", required: true, index: true },
    // Denormalized so the payables list never joins and a renamed landlord
    // cannot rewrite history.
    landlordName: { type: String, default: "", trim: true, maxlength: 160 },
    propertyName: { type: String, default: "", trim: true, maxlength: 160 },
    unitLabel: { type: String, default: "", trim: true, maxlength: 80 },

    id: { type: String, default: () => `LPR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, trim: true, index: true },
    // "2026-03" — idempotency key: one payable per landlord per month.
    periodKey: { type: String, required: true, trim: true, maxlength: 7 },
    periodLabel: { type: String, default: "", trim: true, maxlength: 40 },
    dueDate: { type: Date, required: true, index: true },

    // Rent stays separate from tax so a TDS/GST line can be explained without
    // recomputing the base figure.
    amount: { type: Number, required: true, min: 0, default: 0 },
    taxLabel: { type: String, default: "", trim: true, maxlength: 40 },
    taxPercent: { type: Number, default: 0, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    // Denormalized sum of non-voided payments; recomputed on every mutation.
    paidAmount: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      default: "Due",
      trim: true,
      enum: ["Due", "Partial", "Paid"],
      index: true,
    },
    payments: { type: [rentPaymentSchema], default: [] },
    notes: { type: String, default: "", trim: true, maxlength: 500 },

    createdByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    createdByName: { type: String, default: "", trim: true, maxlength: 140 },
  },
  { timestamps: true },
);

// The generation sweep is idempotent: a landlord can never end up with two
// payables for the same month, even under concurrent requests.
landlordRentSchema.index({ landlordId: 1, periodKey: 1 }, { unique: true });
landlordRentSchema.index({ workspaceId: 1, status: 1, dueDate: 1 });
landlordRentSchema.index({ workspaceId: 1, periodKey: 1 });

export const FinanceLandlordRent =
  (mongoose.models.FinanceLandlordRent as mongoose.Model<any>) ||
  mongoose.model<any>("FinanceLandlordRent", landlordRentSchema);

export default FinanceLandlordRent;
