// @ts-nocheck
import mongoose, { Schema } from "mongoose";

const tenantEmployeeSchema = new Schema(
  {
    id: { type: String, default: () => `TE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, trim: true },
    name: { type: String, default: "", trim: true, maxlength: 140 },
    email: { type: String, default: "", trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    designation: { type: String, default: "", trim: true, maxlength: 120 },
    userId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
    inviteId: { type: Schema.Types.ObjectId, ref: "MemberInvite", default: null, index: true },
    inviteToken: { type: String, default: null, trim: true, index: true },
    inviteTokenExpiresAt: { type: Date, default: null },
    inviteStatus: { type: String, default: "Invited", trim: true, maxlength: 40 },
    invitedAt: { type: Date, default: null },
    inviteSentAt: { type: Date, default: null },
    inviteAcceptedAt: { type: Date, default: null },
    registeredAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    tenantRole: { type: String, default: "", trim: true, maxlength: 40 },
    tenantCompanyName: { type: String, default: "", trim: true, maxlength: 160 },
    role: { type: String, default: "Employee", trim: true, enum: ["Employee", "Manager"] },
    status: { type: String, default: "Active", trim: true, enum: ["Active", "Inactive"] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const tenantCustomerDetailsSchema = new Schema(
  {
    clientName: { type: String, default: "", trim: true, maxlength: 160 },
    sector: { type: String, default: "", trim: true, maxlength: 120 },
    hoCountry: { type: String, default: "", trim: true, maxlength: 120 },
    hoState: { type: String, default: "", trim: true, maxlength: 120 },
    hoCity: { type: String, default: "", trim: true, maxlength: 120 },
  },
  { _id: false },
);

const tenantCompanyDetailsSchema = new Schema(
  {
    buildingName: { type: String, default: "", trim: true, maxlength: 160 },
    unitNo: { type: String, default: "", trim: true, maxlength: 60 },
    cabinDesks: { type: Number, default: 0, min: 0 },
    ratePerCabinDesk: { type: Number, default: 0, min: 0 },
    openDesks: { type: Number, default: 0, min: 0 },
    ratePerOpenDesk: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const tenantAgreementDetailsSchema = new Schema(
  {
    annualIncrement: { type: Number, default: 0, min: 0 },
    perDeskMeetingCredits: { type: Number, default: 0, min: 0 },
    totalMeetingCredits: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    lockInPeriod: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const tenantBillingDetailsSchema = new Schema(
  {
    contractDurationMonths: { type: Number, default: 0, min: 0 },
    monthlyRent: { type: Number, default: 0, min: 0 },
    totalContractAmount: { type: Number, default: 0, min: 0 },
    securityDepositAmount: { type: Number, default: 0, min: 0 },
    securityDepositPaidStatus: { type: String, default: "Pending", trim: true, enum: ["Pending", "Paid"] },
  },
  { _id: false },
);

const tenantPocDetailsSchema = new Schema(
  {
    localPocName: { type: String, default: "", trim: true, maxlength: 140 },
    localPocEmail: { type: String, default: "", trim: true, lowercase: true, maxlength: 160 },
    localPocPhone: { type: String, default: "", trim: true, maxlength: 40 },
    hoPocName: { type: String, default: "", trim: true, maxlength: 140 },
    hoPocEmail: { type: String, default: "", trim: true, lowercase: true, maxlength: 160 },
    hoPocPhone: { type: String, default: "", trim: true, maxlength: 40 },
  },
  { _id: false },
);

const tenantPackageDetailsSchema = new Schema(
  {
    packageName: { type: String, default: "", trim: true, maxlength: 120 },
    totalSeats: { type: Number, default: 0, min: 0 },
    openDesks: { type: Number, default: 0, min: 0 },
    cabinDesks: { type: Number, default: 0, min: 0 },
    ratePerOpenDesk: { type: Number, default: 0, min: 0 },
    ratePerCabinDesk: { type: Number, default: 0, min: 0 },
    seatTypeVariants: { type: [String], default: [] },
    creditsPerSeat: { type: Number, default: 0, min: 0 },
    monthlyTotalCredits: { type: Number, default: 0, min: 0 },
    creditResetCycle: { type: String, default: "Monthly", trim: true, maxlength: 40 },
    creditUsageTracking: { type: String, default: "", trim: true, maxlength: 240 },
  },
  { _id: false },
);

const tenantAddOnCreditsSchema = new Schema(
  {
    purchasedCredits: { type: Number, default: 0, min: 0 },
    remainingCredits: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const tenantCreditRequestActionSchema = new Schema(
  {
    action: { type: String, default: "", trim: true, maxlength: 80 },
    status: { type: String, default: "", trim: true, maxlength: 80 },
    note: { type: String, default: "", trim: true, maxlength: 500 },
    actorUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    actorName: { type: String, default: "", trim: true, maxlength: 140 },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const tenantCreditRequestSchema = new Schema(
  {
    id: { type: String, default: () => `CRQ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, trim: true },
    requestedCredits: { type: Number, default: 0, min: 0 },
    approvedCredits: { type: Number, default: 0, min: 0 },
    ratePerCredit: { type: Number, default: 10, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String, default: "PENDING_SALES_APPROVAL", trim: true,
      enum: [
        "LOW_CREDITS_ALERT", "PENDING_SALES_APPROVAL", "APPROVED_AWAITING_PAYMENT",
        "PAYMENT_SUBMITTED", "PAYMENT_CONFIRMED", "INVOICE_GENERATED",
        "CREDITS_ADDED", "COMPLETED", "REJECTED", "PAYMENT_FAILED", "PAYMENT_REJECTED",
      ],
    },
    invoiceStatus: { type: String, default: "Pending", trim: true, enum: ["Pending", "Generated", "Sent", "Paid", "Failed"] },
    requestedReason: { type: String, default: "", trim: true, maxlength: 500 },
    requestedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
    requestedByName: { type: String, default: "", trim: true, maxlength: 140 },
    requestedByEmail: { type: String, default: "", trim: true, lowercase: true, maxlength: 160 },
    reviewedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
    reviewedByName: { type: String, default: "", trim: true, maxlength: 140 },
    salesNote: { type: String, default: "", trim: true, maxlength: 500 },
    financeNote: { type: String, default: "", trim: true, maxlength: 500 },
    paymentTransactionId: { type: String, default: "", trim: true, maxlength: 160 },
    paymentProofFileName: { type: String, default: "", trim: true, maxlength: 200 },
    paymentProofFileUrl: { type: String, default: "", trim: true, maxlength: 2048 },
    paymentProofPublicId: { type: String, default: "", trim: true, maxlength: 255 },
    paymentSubmittedAt: { type: Date, default: null },
    financeVerifiedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
    financeVerifiedByName: { type: String, default: "", trim: true, maxlength: 140 },
    financeVerifiedAt: { type: Date, default: null },
    paymentFailureReason: { type: String, default: "", trim: true, maxlength: 500 },
    invoiceNumber: { type: String, default: "", trim: true, maxlength: 120 },
    invoiceFileName: { type: String, default: "", trim: true, maxlength: 200 },
    invoiceFileUrl: { type: String, default: "", trim: true, maxlength: 2048 },
    invoiceFilePublicId: { type: String, default: "", trim: true, maxlength: 255 },
    invoiceGeneratedAt: { type: Date, default: null },
    invoiceGeneratedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
    invoiceEmailSentAt: { type: Date, default: null },
    invoiceEmailSentTo: { type: String, default: "", trim: true, maxlength: 500 },
    invoiceEmailStatus: { type: String, default: "Not Sent", trim: true, enum: ["Not Sent", "Sent", "Failed"] },
    creditsAddedAt: { type: Date, default: null },
    creditsAddedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
    creditsAddedByName: { type: String, default: "", trim: true, maxlength: 140 },
    completedAt: { type: Date, default: null },
    actionHistory: { type: [tenantCreditRequestActionSchema], default: [] },
    requestedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date, default: null },
    financeSentAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const tenantAgreementDocumentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    type: { type: String, default: "document", trim: true, maxlength: 80 },
    mimeType: { type: String, default: "", trim: true, maxlength: 120 },
    size: { type: String, default: "", trim: true, maxlength: 40 },
    url: { type: String, default: "", trim: true, maxlength: 2048 },
    publicId: { type: String, default: "", trim: true, maxlength: 255 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const tenantCreditHistorySchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    type: { type: String, default: "", trim: true, maxlength: 120 },
    resource: { type: String, default: "", trim: true, maxlength: 160 },
    bookedBy: { type: String, default: "", trim: true, maxlength: 140 },
    bookingCode: { type: String, default: "", trim: true, maxlength: 120 },
    roomName: { type: String, default: "", trim: true, maxlength: 120 },
    location: { type: String, default: "", trim: true, maxlength: 160 },
    wing: { type: String, default: "", trim: true, maxlength: 40 },
    startTime: { type: String, default: "", trim: true, maxlength: 12 },
    endTime: { type: String, default: "", trim: true, maxlength: 12 },
    status: { type: String, default: "", trim: true, maxlength: 40 },
    remainingCredits: { type: Number, default: 0, min: 0 },
    used: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const tenantCreditConfigurationSchema = new Schema(
  {
    monthlyTotalCredits: { type: Number, default: 0, min: 0 },
    creditResetCycle: { type: String, default: "Monthly", trim: true, maxlength: 40 },
    creditUsageTracking: { type: String, default: "", trim: true, maxlength: 240 },
  },
  { _id: false },
);

const tenantInvoiceDetailsSchema = new Schema(
  {
    invoiceNumber: { type: String, default: "", trim: true, maxlength: 80 },
    invoiceFileName: { type: String, default: "", trim: true, maxlength: 180 },
    invoiceFileUrl: { type: String, default: "", trim: true, maxlength: 2048 },
    invoiceFilePublicId: { type: String, default: "", trim: true, maxlength: 255 },
    invoiceStatus: { type: String, default: "Pending", trim: true, enum: ["Pending", "Generated", "Sent"] },
    invoiceGeneratedAt: { type: Date, default: null },
    invoiceGeneratedBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
    invoiceSentAt: { type: Date, default: null },
    invoiceSentBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
    invoiceSentToEmail: { type: String, default: "", trim: true, maxlength: 500 },
  },
  { _id: false },
);

const tenantSpaceSchema = new Schema(
  {
    floor: { type: String, default: "", trim: true, maxlength: 60 },
    seats: { type: [String], default: [] },
    assignedDate: { type: Date, default: null },
  },
  { _id: false },
);

const tenantCompanySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "HostUser", required: true, index: true },
    tenantNumber: { type: Number, required: true, index: true },
    tenantCode: { type: String, required: true, trim: true, index: true },
    companyName: { type: String, required: true, trim: true, maxlength: 160, index: true },
    contactName: { type: String, required: true, trim: true, maxlength: 140 },
    email: { type: String, default: "", trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    businessType: { type: String, default: "", trim: true, maxlength: 120, index: true },
    customerDetails: { type: tenantCustomerDetailsSchema, default: () => ({}) },
    companyDetails: { type: tenantCompanyDetailsSchema, default: () => ({}) },
    agreementDetails: { type: tenantAgreementDetailsSchema, default: () => ({}) },
    billingDetails: { type: tenantBillingDetailsSchema, default: () => ({}) },
    invoiceDetails: { type: tenantInvoiceDetailsSchema, default: () => ({}) },
    pocDetails: { type: tenantPocDetailsSchema, default: () => ({}) },
    pricingPackageId: { type: Schema.Types.ObjectId, ref: "PricingPackage", default: null, index: true },
    planType: { type: String, default: "Pending Setup", trim: true, maxlength: 80, index: true },
    contractStart: { type: Date, default: null, index: true },
    contractEnd: { type: Date, default: null, index: true },
    contractDurationMonths: { type: Number, default: 0, min: 0 },
    creditsAllocated: { type: Number, default: 0, min: 0 },
    creditsUsed: { type: Number, default: 0, min: 0 },
    packageDetails: { type: tenantPackageDetailsSchema, default: () => ({}) },
    creditConfiguration: { type: tenantCreditConfigurationSchema, default: () => ({}) },
    addOnCredits: { type: tenantAddOnCreditsSchema, default: () => ({}) },
    managerEmployeeId: { type: String, default: null, trim: true, index: true },
    status: {
      type: String, required: true, trim: true,
      enum: ["Pending Setup", "Pending Space Assignment", "Active", "Expiring Soon", "Expired"],
      index: true,
    },
    notes: { type: String, default: "", trim: true, maxlength: 1000 },
    space: { type: tenantSpaceSchema, default: () => ({}) },
  },
  { timestamps: true },
);

tenantCompanySchema.index({ workspaceId: 1, tenantNumber: 1 }, { unique: true });
tenantCompanySchema.index({ workspaceId: 1, tenantCode: 1 }, { unique: true });
tenantCompanySchema.index({ workspaceId: 1, companyName: 1 }, { unique: true });
tenantCompanySchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
tenantCompanySchema.index({ workspaceId: 1, createdAt: -1, tenantNumber: -1 });
tenantCompanySchema.index({ workspaceId: 1, managerEmployeeId: 1 });

export const TenantCompany = mongoose.models.TenantCompany || mongoose.model("TenantCompany", tenantCompanySchema);
