// @ts-nocheck
import mongoose, { Schema } from "mongoose";

// Landlord (property owner) master for the rent PAYABLE side of finance.
//
// HostPanel already tracks rent RECEIVABLE (TenantRent, VirtualOfficeRent,
// workation revenue) but had no record of what the workspace itself owes to the
// owners of the spaces it operates. For co-living / hostel / workation
// verticals that rent is usually the single largest recurring cost, so the
// P&L understated COGS and there was nowhere to track lease expiry, deposits
// paid to owners, or escalation dates.
//
// This document is the landlord MASTER (commercial terms). Monthly payables
// live in FinanceLandlordRent so a historic month never changes when the
// agreement is later renegotiated here.

const landlordSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },

    // Display name is the only required field — everything else can be filled
    // in later, because Finance often records a payable before the signed
    // agreement copy reaches them.
    name: { type: String, required: true, trim: true, maxlength: 160 },
    legalName: { type: String, default: "", trim: true, maxlength: 200 },
    contactPerson: { type: String, default: "", trim: true, maxlength: 120 },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    email: { type: String, default: "", trim: true, maxlength: 180 },
    address: { type: String, default: "", trim: true, maxlength: 300 },

    // What is being rented FROM this landlord.
    propertyName: { type: String, default: "", trim: true, maxlength: 160 },
    unitLabel: { type: String, default: "", trim: true, maxlength: 80 },

    // Agreement / lease window. Expiry is surfaced in the UI so renewals are
    // never missed — a lapsed lease is an unbudgeted rent spike.
    agreementNumber: { type: String, default: "", trim: true, maxlength: 80 },
    agreementStartDate: { type: Date, default: null },
    agreementEndDate: { type: Date, default: null, index: true },

    // Defaults used when monthly payables are generated.
    monthlyRent: { type: Number, default: 0, min: 0 },
    // Refundable deposit the workspace has PAID to the owner (an asset, not an
    // expense) — kept so exit settlement can be reconciled.
    securityDepositHeld: { type: Number, default: 0, min: 0 },
    // Informational: applied manually at renewal, never auto-compounded, so a
    // mistyped rate can't silently rewrite historic payables.
    escalationPercent: { type: Number, default: 0, min: 0, max: 100 },
    // Day of month the rent falls due (clamped to 28 so every month has it).
    paymentDueDay: { type: Number, default: 5, min: 1, max: 28 },
    noticePeriodDays: { type: Number, default: 0, min: 0 },

    // Statutory deduction on rent (e.g. TDS). Stored on the landlord as the
    // default for future payables; each payable keeps its own copy.
    taxLabel: { type: String, default: "", trim: true, maxlength: 40 },
    taxPercent: { type: Number, default: 0, min: 0, max: 100 },

    status: {
      type: String,
      default: "Active",
      trim: true,
      enum: ["Active", "Inactive", "Archived"],
      index: true,
    },
    notes: { type: String, default: "", trim: true, maxlength: 600 },

    createdByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    createdByName: { type: String, default: "", trim: true, maxlength: 140 },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    updatedByName: { type: String, default: "", trim: true, maxlength: 140 },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Soft duplicates are legitimate (two owners can share a name), so this is a
// lookup index only — the UI warns on a similar name instead of blocking.
landlordSchema.index({ workspaceId: 1, status: 1, name: 1 });

export const FinanceLandlord =
  (mongoose.models.FinanceLandlord as mongoose.Model<any>) ||
  mongoose.model<any>("FinanceLandlord", landlordSchema);

export default FinanceLandlord;
