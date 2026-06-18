import mongoose, { Schema, Document } from "mongoose";

export interface ITenantCreditRequestAction {
  action: string;
  status: string;
  note: string;
  actorUserId?: mongoose.Types.ObjectId | null;
  actorName: string;
  at: Date;
}

export interface ITenantCreditRequest extends Document {
  tenantCompanyId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  id: string;
  requestedCredits: number;
  approvedCredits: number;
  ratePerCredit: number;
  totalAmount: number;
  status: string;
  invoiceStatus: string;
  requestedReason: string;
  requestedByUserId?: mongoose.Types.ObjectId | null;
  requestedByName: string;
  requestedByEmail: string;
  reviewedByUserId?: mongoose.Types.ObjectId | null;
  reviewedByName: string;
  salesNote: string;
  financeNote: string;
  paymentTransactionId: string;
  paymentProofFileName: string;
  paymentProofFileUrl: string;
  paymentProofPublicId: string;
  paymentSubmittedAt?: Date | null;
  financeVerifiedByUserId?: mongoose.Types.ObjectId | null;
  financeVerifiedByName: string;
  financeVerifiedAt?: Date | null;
  paymentFailureReason: string;
  invoiceNumber: string;
  invoiceFileName: string;
  invoiceFileUrl: string;
  invoiceFilePublicId: string;
  invoiceGeneratedAt?: Date | null;
  invoiceGeneratedByUserId?: mongoose.Types.ObjectId | null;
  invoiceEmailSentAt?: Date | null;
  invoiceEmailSentTo: string;
  invoiceEmailStatus: string;
  creditsAddedAt?: Date | null;
  creditsAddedByUserId?: mongoose.Types.ObjectId | null;
  creditsAddedByName: string;
  completedAt?: Date | null;
  actionHistory: ITenantCreditRequestAction[];
  requestedAt: Date;
  reviewedAt?: Date | null;
  financeSentAt?: Date | null;
  paidAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const tenantCreditRequestActionSchema = new Schema<ITenantCreditRequestAction>(
  {
    action: { type: String, default: "", trim: true, maxlength: 80 },
    status: { type: String, default: "", trim: true, maxlength: 80 },
    note: { type: String, default: "", trim: true, maxlength: 500 },
    actorUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    actorName: { type: String, default: "", trim: true, maxlength: 140 },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const tenantCreditRequestSchema = new Schema<ITenantCreditRequest>(
  {
    tenantCompanyId: {
      type: Schema.Types.ObjectId,
      ref: "TenantCompany",
      required: true,
      index: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    id: {
      type: String,
      default: () => `CRQ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      trim: true,
      index: true,
    },
    requestedCredits: { type: Number, default: 0, min: 0 },
    approvedCredits: { type: Number, default: 0, min: 0 },
    ratePerCredit: { type: Number, default: 10, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      default: "PENDING_SALES_APPROVAL",
      trim: true,
      enum: [
        "LOW_CREDITS_ALERT",
        "PENDING_SALES_APPROVAL",
        "APPROVED_AWAITING_PAYMENT",
        "PAYMENT_SUBMITTED",
        "PAYMENT_CONFIRMED",
        "INVOICE_GENERATED",
        "CREDITS_ADDED",
        "COMPLETED",
        "REJECTED",
        "PAYMENT_FAILED",
        "PAYMENT_REJECTED",
      ],
      index: true,
    },
    invoiceStatus: {
      type: String,
      default: "Pending",
      trim: true,
      enum: ["Pending", "Generated", "Sent", "Paid", "Failed"],
    },
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
  },
  { timestamps: true }
);

export const TenantCreditRequest =
  (mongoose.models.TenantCreditRequest as mongoose.Model<ITenantCreditRequest>) ||
  mongoose.model<ITenantCreditRequest>("TenantCreditRequest", tenantCreditRequestSchema);

export default TenantCreditRequest;
