import mongoose, { Schema, Document } from "mongoose";

export interface ITenantCreditLedger extends Document {
  tenantCompanyId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  id: string;
  date: Date;
  type: string;
  resource: string;
  bookedBy: string;
  bookingCode: string;
  roomName: string;
  location: string;
  wing: string;
  startTime: string;
  endTime: string;
  status: string;
  remainingCredits: number;
  used: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const tenantCreditLedgerSchema = new Schema<ITenantCreditLedger>(
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
    id: { type: String, required: true, trim: true, index: true },
    date: { type: Date, required: true, index: true },
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
  { timestamps: true }
);

export const TenantCreditLedger =
  (mongoose.models.TenantCreditLedger as mongoose.Model<ITenantCreditLedger>) ||
  mongoose.model<ITenantCreditLedger>("TenantCreditLedger", tenantCreditLedgerSchema);

export default TenantCreditLedger;
