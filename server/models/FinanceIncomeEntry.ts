// @ts-nocheck
import mongoose, { Schema } from "mongoose";

// Append-only income ledger: one entry per closed revenue event (tenant rent,
// virtual-office rent), posted automatically when Finance marks the
// receivable as Paid. Nothing here is ever PATCH/DELETE'd — the point is a
// durable, auditable income register that Accounting/P&L and Billing →
// Transaction History read from.

const financeIncomeEntrySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    // Which revenue stream produced this income.
    source: {
      type: String,
      required: true,
      trim: true,
      enum: ["tenant-rent", "virtual-office-rent"],
      index: true,
    },
    // Back-reference to the source receivable: TenantRent.id (RNT-...) or the
    // VirtualOffice recordId. Combined with the unique index below this makes
    // posting idempotent — a period can never be double-counted.
    referredId: { type: String, default: "", trim: true, maxlength: 120, index: true },
    // Billing period this income belongs to, e.g. "2026-09".
    periodKey: { type: String, required: true, trim: true, maxlength: 7 },
    periodLabel: { type: String, default: "", trim: true, maxlength: 40 },
    entityName: { type: String, default: "", trim: true, maxlength: 160 },
    amount: { type: Number, required: true, min: 0 },
    // When finance confirmed the payment (the recognition date).
    postedAt: { type: Date, default: Date.now, index: true },
    postedById: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    postedByName: { type: String, default: "", trim: true, maxlength: 140 },
    note: { type: String, default: "", trim: true, maxlength: 400 },
    status: { type: String, default: "Confirmed", trim: true, enum: ["Confirmed"], index: true },
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