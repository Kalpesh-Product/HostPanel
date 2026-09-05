// @ts-nocheck
import mongoose, { Schema } from "mongoose";

// Append-only income ledger: one entry per closed revenue event (tenant rent,
// virtual-office rent, workation revenue, alternate revenue), posted when the
// receivable is confirmed paid. Entries are NEVER edited or deleted —
// corrections are made with a linked Reversal entry (negative amount). Read by
// Accounting/P&L and Billing → Transaction History.

const financeIncomeEventSchema = new Schema(
  {
    action: { type: String, default: "", trim: true, maxlength: 80 },
    status: { type: String, default: "", trim: true, maxlength: 40 },
    note: { type: String, default: "", trim: true, maxlength: 500 },
    actorUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    actorName: { type: String, default: "", trim: true, maxlength: 140 },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const financeIncomeEntrySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    // Which revenue stream produced this income.
    source: {
      type: String,
      required: true,
      trim: true,
      enum: ["tenant-rent", "virtual-office-rent", "workation-revenue", "alternate-revenue"],
      index: true,
    },
    // Back-reference to the source receivable: TenantRent.id (RNT-...), the
    // VirtualOffice recordId, or the generated entryCode for manual entries.
    // Combined with the unique index below this makes posting idempotent — a
    // period can never be double-counted.
    referredId: { type: String, default: "", trim: true, maxlength: 120, index: true },
    // Billing period this income belongs to, e.g. "2026-09".
    periodKey: { type: String, required: true, trim: true, maxlength: 7 },
    periodLabel: { type: String, default: "", trim: true, maxlength: 40 },
    entityName: { type: String, default: "", trim: true, maxlength: 160 },
    // Negative ONLY for Reversal entries (corrections); validation lives in
    // the service layer, not the schema.
    amount: { type: Number, required: true },
    // When finance confirmed the payment (the recognition date).
    postedAt: { type: Date, default: Date.now, index: true },
    postedById: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    postedByName: { type: String, default: "", trim: true, maxlength: 140 },
    note: { type: String, default: "", trim: true, maxlength: 400 },

    // ── Manual revenue (workation / alternate) extras ──
    // Human reference code for manual entries (REV-...). For rent/VO entries
    // this stays empty (referredId carries the source id instead).
    entryCode: { type: String, default: "", trim: true, maxlength: 60, index: true },
    // Sub-type: alternate revenue requires one (events, cafe-food, printing,
    // parking, day-passes, commission, penalty-late-fee, miscellaneous);
    // workation may carry package/extension/add-on. Validation in service.
    category: { type: String, default: "", trim: true, maxlength: 60, index: true },
    // Business date the revenue was received (drives periodKey + P&L month).
    revenueDate: { type: Date, default: null, index: true },
    paymentMethod: { type: String, default: "", trim: true, maxlength: 80 },
    reference: { type: String, default: "", trim: true, maxlength: 160 },
    billingPeriodLabel: { type: String, default: "", trim: true, maxlength: 80 },
    documentName: { type: String, default: "", trim: true, maxlength: 200 },
    documentUrl: { type: String, default: "", trim: true, maxlength: 2048 },
    documentPublicId: { type: String, default: "", trim: true, maxlength: 255 },
    // Pending → Received transition audit (manual entries only).
    confirmedAt: { type: Date, default: null },
    confirmedById: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    confirmedByName: { type: String, default: "", trim: true, maxlength: 140 },
    // Reversals: this entry reverses another entry (one reversal per original).
    reversalOf: { type: Schema.Types.ObjectId, ref: "FinanceIncomeEntry", default: null, index: true },

    // Lifecycle: auto-posted rent/VO = "Confirmed"; manual = "Pending" →
    // "Received"; corrections = "Reversal" (negative amount). Only
    // Received/Confirmed/Reversal count toward Accounting/P&L.
    status: {
      type: String, default: "Confirmed", trim: true,
      enum: ["Pending", "Received", "Confirmed", "Reversal"], index: true,
    },
    events: { type: [financeIncomeEventSchema], default: [] },
  },
  { timestamps: true },
);

// Idempotency: at most one income entry per source-receivable per billing
// period, even if mark-paid is re-tried or a retry races a previous partial run.
financeIncomeEntrySchema.index({ workspaceId: 1, source: 1, referredId: 1, periodKey: 1 }, { unique: true });
financeIncomeEntrySchema.index({ workspaceId: 1, postedAt: -1 });

export const FinanceIncomeEntry =
  (mongoose.models.FinanceIncomeEntry as mongoose.Model<any>) ||
  mongoose.model<any>("FinanceIncomeEntry", financeIncomeEntrySchema);

export default FinanceIncomeEntry;