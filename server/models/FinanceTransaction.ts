import mongoose, { Document, Schema } from "mongoose";

export interface IFinanceTransaction extends Document {
    snapshotId: mongoose.Types.ObjectId;
    workspaceId: mongoose.Types.ObjectId;
    transactionKey: string; // matches original 'id' string field
    dept: string;
    date: string;
    type: string;
    item: string;
    amount: number;
    po?: string | null;
    invoice?: string | null;
    status?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const financeTransactionSchema = new Schema<IFinanceTransaction>(
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
        transactionKey: { type: String, trim: true, required: true, maxlength: 40, index: true },
        dept: { type: String, trim: true, required: true, maxlength: 120, index: true },
        date: { type: String, trim: true, required: true, maxlength: 40 },
        type: { type: String, trim: true, required: true, maxlength: 60, index: true },
        item: { type: String, trim: true, required: true, maxlength: 240 },
        amount: { type: Number, required: true, min: 0, default: 0 },
        po: { type: String, trim: true, maxlength: 100, default: null },
        invoice: { type: String, trim: true, maxlength: 100, default: null },
        status: { type: String, trim: true, maxlength: 80, default: "Cleared", index: true },
    },
    {
        timestamps: true,
    }
);

export const FinanceTransaction = (mongoose.models.FinanceTransaction as mongoose.Model<IFinanceTransaction>) ||
    mongoose.model<IFinanceTransaction>("FinanceTransaction", financeTransactionSchema);
export default FinanceTransaction;
