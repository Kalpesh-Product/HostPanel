import mongoose, { Document, Schema } from "mongoose";

export interface IFinanceAuditTrail extends Document {
    snapshotId: mongoose.Types.ObjectId;
    workspaceId: mongoose.Types.ObjectId;
    auditKey: string; // matches original 'id' string field
    dept: string;
    item: string;
    amount: number;
    approved: boolean;
    poAttached: boolean;
    receiptAttached: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const financeAuditTrailSchema = new Schema<IFinanceAuditTrail>(
    {
        snapshotId: {
            type: Schema.Types.ObjectId,
            ref: "FinanceSnapshot",
            required: true,
            index: true,
        },
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        auditKey: { type: String, trim: true, required: true, maxlength: 40, index: true },
        dept: { type: String, trim: true, required: true, maxlength: 120, index: true },
        item: { type: String, trim: true, required: true, maxlength: 240 },
        amount: { type: Number, required: true, min: 0, default: 0 },
        approved: { type: Boolean, default: true, index: true },
        poAttached: { type: Boolean, default: true },
        receiptAttached: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

export const FinanceAuditTrail = (mongoose.models.FinanceAuditTrail as mongoose.Model<IFinanceAuditTrail>) ||
    mongoose.model<IFinanceAuditTrail>("FinanceAuditTrail", financeAuditTrailSchema);
export default FinanceAuditTrail;
