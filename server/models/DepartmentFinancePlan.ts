import mongoose, { Document, Schema } from "mongoose";

export interface IFinanceApprovalStep {
    status: "Pending" | "Approved" | "Rejected" | "Discuss";
    approverUserId?: mongoose.Types.ObjectId | null;
    approverName?: string;
    decidedAt?: Date | null;
    decidedAtLabel?: string;
    note?: string;
}

export interface IFinanceApprovalDecision {
    role?: string;
    status?: "Pending" | "Approved" | "Rejected" | "Discuss";
    userId?: string;
    userName?: string;
    decidedAt?: Date | null;
    decidedAtLabel?: string;
    note?: string;
}

export interface IFinanceApprovalFlow {
    owner: IFinanceApprovalStep;
    financeManager: IFinanceApprovalStep;
    finalStatus: "Pending" | "Approved" | "Rejected" | "Discuss";
    lastDecisionByRole?: string;
    lastDecisionAt?: Date | null;
    lastDecisionAtLabel?: string;
    decisionHistory: IFinanceApprovalDecision[];
}

export interface IFinanceReminder {
    id: string;
    importKey?: string;
    monthKey?: string;
    message: string;
    status: "Sent" | "Read" | "Actioned";
    sentAtLabel?: string;
}

export interface IDepartmentFinanceMonthNormalized {
    month: string;
    monthKey: string;
    displayOrder: number;
    status?: "Draft" | "Upcoming" | "Current" | "Completed" | "Approved" | "Pending" | string;
    projectedBudget: number;
    actualSpent: number;
    savings: number;
    details?: string;
    title?: string;
    dueDate?: string;
}

export interface IDepartmentFinancePlan extends Document {
    snapshotId: mongoose.Types.ObjectId;
    workspaceId: mongoose.Types.ObjectId;
    planKey: string; // matches original 'id' string field
    department: string;
    managerName?: string;
    fiscalYear: string;
    requestId?: string;
    status?: "Draft" | "Pending" | "Approved" | "Rejected" | string;
    previousSpend: number;
    annualBudgetRequested: number;
    approvedAnnualBudget: number;
    notes?: string;
    submittedByUserId?: mongoose.Types.ObjectId | null;
    submittedByName?: string;
    submittedAt?: Date | null;
    submittedAtLabel?: string;
    approvalFlow: IFinanceApprovalFlow;
    monthlyPlan: IDepartmentFinanceMonthNormalized[];
    reminders: IFinanceReminder[];
    createdAt?: Date;
    updatedAt?: Date;
}

const financeApprovalStepSchema = new Schema<IFinanceApprovalStep>(
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

const financeApprovalDecisionSchema = new Schema<IFinanceApprovalDecision>(
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

const financeApprovalFlowSchema = new Schema<IFinanceApprovalFlow>(
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

const financeReminderSchema = new Schema<IFinanceReminder>(
    {
        id: { type: String, trim: true, required: true, maxlength: 60 },
        importKey: { type: String, trim: true, default: "", maxlength: 120 },
        monthKey: { type: String, trim: true, default: "", maxlength: 32 },
        message: { type: String, trim: true, required: true, maxlength: 300 },
        status: { type: String, trim: true, enum: ["Sent", "Read", "Actioned"], default: "Sent" },
        sentAtLabel: { type: String, trim: true, default: "", maxlength: 40 },
    },
    { _id: false }
);

const departmentFinanceMonthSchema = new Schema<IDepartmentFinanceMonthNormalized>(
    {
        month: { type: String, trim: true, required: true, maxlength: 16 },
        monthKey: { type: String, trim: true, required: true, maxlength: 32 },
        displayOrder: { type: Number, required: true, min: 0, default: 0 },
        status: { type: String, trim: true, default: "Upcoming" },
        projectedBudget: { type: Number, required: true, min: 0, default: 0 },
        actualSpent: { type: Number, required: true, min: 0, default: 0 },
        savings: { type: Number, required: true, default: 0 },
        details: { type: String, trim: true, default: "", maxlength: 600 },
        title: { type: String, trim: true, default: "", maxlength: 200 },
        dueDate: { type: String, trim: true, default: "", maxlength: 40 },
    },
    { _id: false }
);

const departmentFinancePlanSchema = new Schema<IDepartmentFinancePlan>(
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
        planKey: { type: String, trim: true, required: true, maxlength: 60, index: true },
        department: { type: String, trim: true, required: true, maxlength: 120, index: true },
        managerName: { type: String, trim: true, default: "", maxlength: 120 },
        fiscalYear: { type: String, trim: true, required: true, maxlength: 20, index: true },
        requestId: { type: String, trim: true, default: "", maxlength: 60 },
        status: { type: String, trim: true, default: "Draft" },
        previousSpend: { type: Number, required: true, min: 0, default: 0 },
        annualBudgetRequested: { type: Number, required: true, min: 0, default: 0 },
        approvedAnnualBudget: { type: Number, required: true, min: 0, default: 0 },
        notes: { type: String, trim: true, default: "", maxlength: 600 },
        submittedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
        submittedByName: { type: String, trim: true, default: "", maxlength: 120 },
        submittedAt: { type: Date, default: null },
        submittedAtLabel: { type: String, trim: true, default: "", maxlength: 40 },
        approvalFlow: { type: financeApprovalFlowSchema, default: () => ({}) },
        monthlyPlan: { type: [departmentFinanceMonthSchema], default: [] },
        reminders: { type: [financeReminderSchema], default: [] },
    },
    {
        timestamps: true,
    }
);

departmentFinancePlanSchema.index({ workspaceId: 1, fiscalYear: 1, department: 1 }, { unique: true });
departmentFinancePlanSchema.index({ snapshotId: 1 });

export const DepartmentFinancePlan = (mongoose.models.DepartmentFinancePlan as mongoose.Model<IDepartmentFinancePlan>) ||
    mongoose.model<IDepartmentFinancePlan>("DepartmentFinancePlan", departmentFinancePlanSchema);
export default DepartmentFinancePlan;
