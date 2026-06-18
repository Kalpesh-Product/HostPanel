import mongoose, { Document, Schema } from "mongoose";
import { IFinanceApprovalFlow } from "./DepartmentFinancePlan.js";

export interface IFinanceExpenseItem {
    expenseKey?: string;
    title: string;
    amount: number;
    date?: Date | null;
    category?: string;
    note?: string;
}

export interface IMonthlyBreakdown {
    monthKey?: string;
    month: string;
    title?: string;
    amount: number;
    note?: string;
    details?: string;
    projectedBudget: number;
    actualSpent: number;
    savings: number;
    expenses: IFinanceExpenseItem[]; // inline expenses
}

export interface IAnnualFinanceRequest extends Document {
    snapshotId: mongoose.Types.ObjectId;
    workspaceId: mongoose.Types.ObjectId;
    requestKey: string; // matches original 'id' string field
    department: string;
    requestedBudget: number;
    previousSpend: number;
    status: "Draft" | "Pending" | "Approved" | "Rejected" | "Discuss";
    breakdown?: string;
    appliedExpenseId?: string;
    appliedMonthKey?: string;
    appliedExpenseTag?: string;
    expenseTag?: string;
    submittedByUserId?: mongoose.Types.ObjectId | null;
    submittedByName?: string;
    submittedAt?: Date | null;
    submittedAtLabel?: string;
    approvalFlow: IFinanceApprovalFlow;
    monthlyBreakdown: IMonthlyBreakdown[];
    createdAt?: Date;
    updatedAt?: Date;
}

const financeApprovalStepSchema = new Schema(
    {
        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected", "Discuss"],
            default: "Pending",
            required: true,
        },
        approverUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
        approverName: { type: String, trim: true, default: "", maxlength: 120 },
        decidedAt: { type: Date, default: null },
        decidedAtLabel: { type: String, trim: true, default: "", maxlength: 40 },
        note: { type: String, trim: true, default: "", maxlength: 300 },
    },
    { _id: false }
);

const financeApprovalDecisionSchema = new Schema(
    {
        role: { type: String, trim: true, default: "", maxlength: 40 },
        status: { type: String, enum: ["Pending", "Approved", "Rejected", "Discuss"], default: "Pending" },
        userId: { type: String, trim: true, default: "", maxlength: 80 },
        userName: { type: String, trim: true, default: "", maxlength: 120 },
        decidedAt: { type: Date, default: null },
        decidedAtLabel: { type: String, trim: true, default: "", maxlength: 40 },
        note: { type: String, trim: true, default: "", maxlength: 300 },
    },
    { _id: false }
);

const financeApprovalFlowSchema = new Schema(
    {
        owner: { type: financeApprovalStepSchema, default: () => ({}) },
        financeManager: { type: financeApprovalStepSchema, default: () => ({}) },
        finalStatus: {
            type: String,
            enum: ["Pending", "Approved", "Rejected", "Discuss"],
            default: "Pending",
            required: true,
        },
        lastDecisionByRole: { type: String, trim: true, default: "", maxlength: 40 },
        lastDecisionAt: { type: Date, default: null },
        lastDecisionAtLabel: { type: String, trim: true, default: "", maxlength: 40 },
        decisionHistory: { type: [financeApprovalDecisionSchema], default: [] },
    },
    { _id: false }
);

const financeExpenseItemSchema = new Schema<IFinanceExpenseItem>(
    {
        expenseKey: { type: String, trim: true, default: "" },
        title: { type: String, trim: true, required: true, maxlength: 180 },
        amount: { type: Number, required: true, min: 0, default: 0 },
        date: { type: Date, default: null },
        category: { type: String, trim: true, default: "" },
        note: { type: String, trim: true, default: "", maxlength: 300 },
    },
    { _id: false }
);

const monthlyBreakdownSchema = new Schema<IMonthlyBreakdown>(
    {
        monthKey: { type: String, trim: true, maxlength: 32, default: "" },
        month: { type: String, trim: true, maxlength: 16, required: true },
        title: { type: String, trim: true, maxlength: 200, default: "" },
        amount: { type: Number, required: true, min: 0, default: 0 },
        note: { type: String, trim: true, maxlength: 300, default: "" },
        details: { type: String, trim: true, maxlength: 600, default: "" },
        projectedBudget: { type: Number, required: true, min: 0, default: 0 },
        actualSpent: { type: Number, required: true, min: 0, default: 0 },
        savings: { type: Number, required: true, default: 0 },
        expenses: { type: [financeExpenseItemSchema], default: [] },
    },
    { _id: false }
);

const annualFinanceRequestSchema = new Schema<IAnnualFinanceRequest>(
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
        requestKey: { type: String, trim: true, required: true, maxlength: 40, index: true },
        department: { type: String, trim: true, required: true, maxlength: 120, index: true },
        requestedBudget: { type: Number, required: true, min: 0, default: 0 },
        previousSpend: { type: Number, required: true, min: 0, default: 0 },
        status: {
            type: String,
            enum: ["Draft", "Pending", "Approved", "Rejected", "Discuss"],
            default: "Pending",
            required: true,
            index: true,
        },
        breakdown: { type: String, trim: true, maxlength: 1000, default: "" },
        appliedExpenseId: { type: String, trim: true, default: "", maxlength: 60 },
        appliedMonthKey: { type: String, trim: true, default: "", maxlength: 32 },
        appliedExpenseTag: { type: String, trim: true, default: "", maxlength: 80 },
        expenseTag: { type: String, trim: true, default: "", maxlength: 80 },
        submittedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
        submittedByName: { type: String, trim: true, default: "", maxlength: 120 },
        submittedAt: { type: Date, default: null },
        submittedAtLabel: { type: String, trim: true, default: "", maxlength: 40 },
        approvalFlow: { type: financeApprovalFlowSchema, default: () => ({}) },
        monthlyBreakdown: { type: [monthlyBreakdownSchema], default: [] },
    },
    {
        timestamps: true,
    }
);

export const AnnualFinanceRequest = (mongoose.models.AnnualFinanceRequest as mongoose.Model<IAnnualFinanceRequest>) ||
    mongoose.model<IAnnualFinanceRequest>("AnnualFinanceRequest", annualFinanceRequestSchema);
export default AnnualFinanceRequest;
