import mongoose, { Document, Schema } from "mongoose";

export interface IDepartmentFinance {
    id: number;
    name: string;
    approvedBudget: number;
    spentYTD: number;
    extraGrantedYTD: number;
    health: "Healthy" | "Warning" | "Over Budget";
}

export interface IFinanceSnapshot extends Document {
    workspaceId?: mongoose.Types.ObjectId | null;
    ownerId: mongoose.Types.ObjectId;
    fiscalYear: string;
    departments: IDepartmentFinance[];
    createdAt?: Date;
    updatedAt?: Date;
}

function getFiscalYearLabel(startYear: number): string {
    const safeStartYear = Number(startYear);
    if (!Number.isFinite(safeStartYear)) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const startYearFallback = now.getMonth() >= 3 ? currentYear : currentYear - 1;
        const nextYearFallback = startYearFallback + 1;
        return `FY ${String(startYearFallback).slice(-2)}-${String(nextYearFallback).slice(-2)}`;
    }
    const nextYear = safeStartYear + 1;
    return `FY ${String(safeStartYear).slice(-2)}-${String(nextYear).slice(-2)}`;
}

function getCurrentFiscalYearLabel(): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
    return getFiscalYearLabel(startYear);
}

const departmentFinanceSchema = new Schema<IDepartmentFinance>(
    {
        id: { type: Number, required: true, min: 1 },
        name: { type: String, trim: true, required: true, maxlength: 120 },
        approvedBudget: { type: Number, required: true, min: 0, default: 0 },
        spentYTD: { type: Number, required: true, min: 0, default: 0 },
        extraGrantedYTD: { type: Number, required: true, min: 0, default: 0 },
        health: { type: String, enum: ["Healthy", "Warning", "Over Budget"], default: "Healthy", required: true },
    },
    { _id: false }
);

const financeSnapshotSchema = new Schema<IFinanceSnapshot>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            default: null,
            index: true,
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            required: true,
            index: true,
        },
        fiscalYear: {
            type: String,
            trim: true,
            required: true,
            maxlength: 20,
            default: getCurrentFiscalYearLabel,
            index: true,
        },
        departments: { type: [departmentFinanceSchema], default: [] },
    },
    {
        timestamps: true,
    }
);

financeSnapshotSchema.index({ ownerId: 1, fiscalYear: 1 }, { unique: true });
financeSnapshotSchema.index({ workspaceId: 1, fiscalYear: 1 }, { unique: true, sparse: true });

export const FinanceSnapshot = (mongoose.models.FinanceSnapshot as mongoose.Model<IFinanceSnapshot>) ||
    mongoose.model<IFinanceSnapshot>("FinanceSnapshot", financeSnapshotSchema);
export default FinanceSnapshot;
