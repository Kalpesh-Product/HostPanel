import mongoose, { Document, Schema } from "mongoose";

export interface IFinanceVendor extends Document {
    workspaceId: mongoose.Types.ObjectId;
    vendorKey: string; // matches the unique string 'id' from original
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    paymentTerms?: string;
    category?: string;
    gstin?: string;
    panNumber?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
    website?: string;
    notes?: string;
    createdAtLabel?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const financeVendorSchema = new Schema<IFinanceVendor>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        vendorKey: {
            type: String,
            trim: true,
            required: true,
            maxlength: 60,
            index: true,
        },
        name: { type: String, trim: true, required: true, maxlength: 160, index: true },
        contactPerson: { type: String, trim: true, default: "", maxlength: 120 },
        phone: { type: String, trim: true, default: "", maxlength: 40 },
        email: { type: String, trim: true, default: "", maxlength: 180 },
        address: { type: String, trim: true, default: "", maxlength: 300 },
        paymentTerms: { type: String, trim: true, default: "", maxlength: 120 },
        category: { type: String, trim: true, default: "", maxlength: 100 },
        gstin: { type: String, trim: true, default: "", maxlength: 40 },
        panNumber: { type: String, trim: true, default: "", maxlength: 40 },
        bankName: { type: String, trim: true, default: "", maxlength: 120 },
        accountName: { type: String, trim: true, default: "", maxlength: 120 },
        accountNumber: { type: String, trim: true, default: "", maxlength: 80 },
        ifscCode: { type: String, trim: true, default: "", maxlength: 40 },
        upiId: { type: String, trim: true, default: "", maxlength: 120 },
        website: { type: String, trim: true, default: "", maxlength: 180 },
        notes: { type: String, trim: true, default: "", maxlength: 300 },
        createdAtLabel: { type: String, trim: true, default: "", maxlength: 40 },
    },
    {
        timestamps: true,
    }
);

financeVendorSchema.index({ workspaceId: 1, vendorKey: 1 }, { unique: true });

export const FinanceVendor = (mongoose.models.FinanceVendor as mongoose.Model<IFinanceVendor>) ||
    mongoose.model<IFinanceVendor>("FinanceVendor", financeVendorSchema);
export default FinanceVendor;
