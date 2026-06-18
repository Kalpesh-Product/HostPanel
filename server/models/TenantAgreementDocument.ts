import mongoose, { Schema, Document } from "mongoose";

export interface ITenantAgreementDocument extends Document {
  tenantCompanyId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  type: string;
  mimeType: string;
  size: string;
  url: string;
  publicId: string;
  uploadedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const tenantAgreementDocumentSchema = new Schema<ITenantAgreementDocument>(
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
    name: { type: String, required: true, trim: true, maxlength: 200 },
    type: { type: String, default: "document", trim: true, maxlength: 80 },
    mimeType: { type: String, default: "", trim: true, maxlength: 120 },
    size: { type: String, default: "", trim: true, maxlength: 40 },
    url: { type: String, default: "", trim: true, maxlength: 2048 },
    publicId: { type: String, default: "", trim: true, maxlength: 255 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const TenantAgreementDocument =
  (mongoose.models.TenantAgreementDocument as mongoose.Model<ITenantAgreementDocument>) ||
  mongoose.model<ITenantAgreementDocument>("TenantAgreementDocument", tenantAgreementDocumentSchema);

export default TenantAgreementDocument;
