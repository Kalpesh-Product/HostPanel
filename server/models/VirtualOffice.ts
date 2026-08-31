// @ts-nocheck
import mongoose, { Schema } from "mongoose";

const virtualOfficePocSchema = new Schema(
  {
    name: { type: String, default: "", trim: true, maxlength: 140 },
    email: { type: String, default: "", trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    address: { type: String, default: "", trim: true, maxlength: 300 },
  },
  { _id: false },
);

const virtualOfficeRentPaymentSchema = new Schema(
  {
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
    monthLabel: { type: String, default: "", trim: true, maxlength: 40 },
    amount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      default: "Pending",
      trim: true,
      enum: ["Pending", "Paid", "Overdue", "Partially Paid"],
    },
    transactionId: { type: String, default: "", trim: true, maxlength: 160 },
    paymentDate: { type: Date, default: null },
    paymentMethod: { type: String, default: "", trim: true, maxlength: 80 },
    notes: { type: String, default: "", trim: true, maxlength: 400 },
  },
  { _id: false },
);

const virtualOfficeSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "HostUser", required: true, index: true },
    recordNumber: { type: Number, required: true, index: true },
    recordCode: { type: String, required: true, trim: true, index: true },

    // Company association + profile
    company: { type: Schema.Types.ObjectId, ref: "Client", default: null, index: true },
    clientName: { type: String, default: "", trim: true, maxlength: 160, index: true },
    brandName: { type: String, default: "", trim: true, maxlength: 160, index: true },
    sector: { type: String, default: "", trim: true, maxlength: 120 },
    email: { type: String, default: "", trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    country: { type: String, default: "", trim: true, maxlength: 120 },
    state: { type: String, default: "", trim: true, maxlength: 120 },
    city: { type: String, default: "", trim: true, maxlength: 120 },

    // Registered / service product (virtual office package)
    service: { type: Schema.Types.ObjectId, ref: "Service", default: null, index: true },
    serviceName: { type: String, default: "", trim: true, maxlength: 160 },

    // Space allocation — which workspace location/floor/wing this virtual
    // office's desks sit in, picked from what Resource Management has on
    // file. Physical desk-by-desk assignment happens separately in Sales
    // Architecture (Resource.assignedVirtualOfficeId).
    spaceLocation: { type: String, default: "", trim: true, maxlength: 120 },
    spaceFloor: { type: String, default: "", trim: true, maxlength: 60 },
    spaceWing: { type: String, default: "", trim: true, maxlength: 10 },

    // Points of contact
    hoPoc: { type: virtualOfficePocSchema, default: () => ({}) },
    localPoc: { type: virtualOfficePocSchema, default: () => ({}) },

    // Rental plan / desk calculations. Monthly rent is desk-driven:
    // openDesks x openDeskMonthlyRate. openDeskRate (per day), cabinDesks,
    // cabinDeskRate and cabinTotal are kept only so pre-existing records
    // retain their historical data — new records no longer populate them.
    openDesks: { type: Number, default: 0, min: 0 },
    openDeskRate: { type: Number, default: 0, min: 0 },
    openDeskMonthlyRate: { type: Number, default: 0, min: 0 },
    openTotal: { type: Number, default: 0, min: 0 },
    cabinDesks: { type: Number, default: 0, min: 0 },
    cabinDeskRate: { type: Number, default: 0, min: 0 },
    cabinTotal: { type: Number, default: 0, min: 0 },
    totalDesks: { type: Number, default: 0, min: 0 },

    // Meeting / credit allocation
    perDeskMeetingCredits: { type: Number, default: 0, min: 0 },
    totalMeetingCredits: { type: Number, default: 0, min: 0 },

    // Contract / rent terms & calculations. termStart is when the lease
    // itself begins (can fall mid-month); rentDate is the separate recurring
    // day-of-month rent is due each billing cycle — the two are often the
    // same but aren't required to be.
    termStart: { type: Date, default: null, index: true },
    rentDate: { type: Date, default: null, index: true },
    rentStatus: { type: String, default: "Active", trim: true, enum: ["Active", "Overdue", "Pending", "Cancelled"], index: true },
    annualIncrement: { type: Number, default: 0, min: 0 },
    totalTerm: { type: Number, default: 0, min: 0 },
    termEnd: { type: Date, default: null, index: true },
    nextIncrementDate: { type: Date, default: null },
    lockInMonths: { type: Number, default: 0, min: 0 },
    lockInEnd: { type: Date, default: null },
    pastDueDate: { type: Date, default: null },
    securityDeposit: { type: Number, default: 0, min: 0 },
    securityDepositPercent: { type: Number, default: 0, min: 0, max: 100 },
    securityDepositPaid: { type: Boolean, default: false },
    advanceMonths: { type: Number, default: 1, min: 0 },
    advanceAmount: { type: Number, default: 0, min: 0 },
    monthlyRent: { type: Number, default: 0, min: 0 },
    initialAmount: { type: Number, default: 0, min: 0 },

    // Rent collection / payment tracking
    paymentRecords: { type: [virtualOfficeRentPaymentSchema], default: [] },

    status: {
      type: String,
      required: true,
      trim: true,
      enum: ["Onboarding", "Onboarded", "Active", "Expiring Soon", "Expired", "Cancelled"],
      index: true,
    },
    notes: { type: String, default: "", trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

virtualOfficeSchema.index({ workspaceId: 1, recordNumber: 1 }, { unique: true });
virtualOfficeSchema.index({ workspaceId: 1, recordCode: 1 }, { unique: true });
virtualOfficeSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
virtualOfficeSchema.index({ workspaceId: 1, rentStatus: 1 });

export const VirtualOffice = mongoose.models.VirtualOffice || mongoose.model("VirtualOffice", virtualOfficeSchema);
