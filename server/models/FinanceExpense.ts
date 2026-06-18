import mongoose, { Document, Schema } from "mongoose";

export interface IFinanceExpense extends Document {
    workspaceId: mongoose.Types.ObjectId;
    planId: mongoose.Types.ObjectId;
    expenseKey: string; // matches original 'id' string field
    importKey?: string;
    title: string;
    description?: string;
    monthKey: string;
    month: string;
    date?: string;
    dueDate?: string;
    projectedAmount: number;
    actualAmount: number;
    savings: number;
    paymentStatus?: "Planned" | "Payment Pending" | "Payment Done - Invoice Pending" | "Invoice Shared" | string;
    invoiceNumber?: string;
    invoiceFile?: string;
    invoiceUrl?: string;
    invoicePublicId?: string;
    sourceSheet?: string;
    sourceRowNumber: number;
    expenseTag?: string;
    vendorId?: string; // string key
    vendorObjectId?: mongoose.Types.ObjectId | null; // object id reference
    vendorName?: string;
    vendorContactPerson?: string;
    vendorEmail?: string;
    vendorPhone?: string;
    vendorAddress?: string;
    vendorPaymentTerms?: string;
    vendorCategory?: string;
    vendorGstin?: string;
    vendorPanNumber?: string;
    vendorBankName?: string;
    vendorAccountName?: string;
    vendorAccountNumber?: string;
    vendorIfscCode?: string;
    vendorUpiId?: string;
    vendorWebsite?: string;
    vendorImportKey?: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const financeExpenseSchema = new Schema<IFinanceExpense>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        planId: {
            type: Schema.Types.ObjectId,
            ref: "DepartmentFinancePlan",
            required: true,
            index: true,
        },
        expenseKey: { type: String, trim: true, required: true, maxlength: 60, index: true },
        importKey: { type: String, trim: true, default: "", maxlength: 120 },
        title: { type: String, trim: true, required: true, maxlength: 200 },
        description: { type: String, trim: true, default: "", maxlength: 500 },
        monthKey: { type: String, trim: true, required: true, maxlength: 32, index: true },
        month: { type: String, trim: true, required: true, maxlength: 16 },
        date: { type: String, trim: true, default: "", maxlength: 40 },
        dueDate: { type: String, trim: true, default: "", maxlength: 40 },
        projectedAmount: { type: Number, required: true, min: 0, default: 0 },
        actualAmount: { type: Number, required: true, min: 0, default: 0 },
        savings: { type: Number, required: true, default: 0 },
        paymentStatus: {
            type: String,
            trim: true,
            default: "Planned",
            index: true,
        },
        invoiceNumber: { type: String, trim: true, default: "", maxlength: 120 },
        invoiceFile: { type: String, trim: true, default: "", maxlength: 180 },
        invoiceUrl: { type: String, trim: true, default: "", maxlength: 300 },
        invoicePublicId: { type: String, trim: true, default: "", maxlength: 180 },
        sourceSheet: { type: String, trim: true, default: "", maxlength: 80 },
        sourceRowNumber: { type: Number, min: 0, default: 0 },
        expenseTag: { type: String, trim: true, default: "", maxlength: 80, index: true },
        vendorId: { type: String, trim: true, default: "", maxlength: 60, index: true },
        vendorObjectId: { type: Schema.Types.ObjectId, ref: "FinanceVendor", default: null, index: true },
        vendorName: { type: String, trim: true, default: "", maxlength: 160 },
        vendorContactPerson: { type: String, trim: true, default: "", maxlength: 120 },
        vendorEmail: { type: String, trim: true, default: "", maxlength: 180 },
        vendorPhone: { type: String, trim: true, default: "", maxlength: 40 },
        vendorAddress: { type: String, trim: true, default: "", maxlength: 300 },
        vendorPaymentTerms: { type: String, trim: true, default: "", maxlength: 120 },
        vendorCategory: { type: String, trim: true, default: "", maxlength: 100 },
        vendorGstin: { type: String, trim: true, default: "", maxlength: 40 },
        vendorPanNumber: { type: String, trim: true, default: "", maxlength: 40 },
        vendorBankName: { type: String, trim: true, default: "", maxlength: 120 },
        vendorAccountName: { type: String, trim: true, default: "", maxlength: 120 },
        vendorAccountNumber: { type: String, trim: true, default: "", maxlength: 80 },
        vendorIfscCode: { type: String, trim: true, default: "", maxlength: 40 },
        vendorUpiId: { type: String, trim: true, default: "", maxlength: 120 },
        vendorWebsite: { type: String, trim: true, default: "", maxlength: 180 },
        vendorImportKey: { type: String, trim: true, default: "", maxlength: 120 },
        notes: { type: String, trim: true, default: "", maxlength: 500 },
    },
    {
        timestamps: true,
    }
);

financeExpenseSchema.index({ planId: 1, monthKey: 1 });
financeExpenseSchema.index({ workspaceId: 1, expenseKey: 1 }, { unique: true });

export const FinanceExpense = (mongoose.models.FinanceExpense as mongoose.Model<IFinanceExpense>) ||
    mongoose.model<IFinanceExpense>("FinanceExpense", financeExpenseSchema);
export default FinanceExpense;
