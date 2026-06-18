import mongoose, { Document, Schema } from "mongoose";

export interface IFinanceExpense {
    id: string;
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
    vendorId?: string;
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
    expenses: IFinanceExpense[];
}

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

export interface IFinanceVendor {
    id: string;
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
}

export interface IFinanceReminder {
    id: string;
    importKey?: string;
    monthKey?: string;
    message: string;
    status: "Sent" | "Read" | "Actioned";
    sentAtLabel?: string;
}

export interface IDepartmentFinanceMonth {
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
    expenses: IFinanceExpense[];
}

export interface IDepartmentFinancePlan {
    id: string;
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
    monthlyPlan: IDepartmentFinanceMonth[];
    vendors: IFinanceVendor[];
    reminders: IFinanceReminder[];
}

export interface IDepartmentFinance {
    id: number;
    name: string;
    approvedBudget: number;
    spentYTD: number;
    extraGrantedYTD: number;
    health: "Healthy" | "Warning" | "Over Budget";
}

export interface IAnnualFinanceRequest {
    id: string;
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
}

export interface IExtraFinanceRequest {
    id: string;
    importKey?: string;
    date: string;
    department: string;
    amount: number;
    reason?: string;
    monthKey?: string;
    month?: string;
    dueDate?: string;
    submittedByUserId?: mongoose.Types.ObjectId | null;
    submittedByName?: string;
    submittedAt?: Date | null;
    submittedAtLabel?: string;
    approvalFlow: IFinanceApprovalFlow;
    currentRemaining: number;
    status: "Pending" | "Approved" | "Rejected" | "Discuss";
}

export interface IFinanceTransaction {
    id: string;
    dept: string;
    date: string;
    type: string;
    item: string;
    amount: number;
    po?: string | null;
    invoice?: string | null;
    status?: string;
}

export interface IFinanceAuditTrail {
    id: string;
    dept: string;
    item: string;
    amount: number;
    approved: boolean;
    poAttached: boolean;
    receiptAttached: boolean;
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

function trimToMaxLength(value: any, maxLength: number): string {
    const text = String(value || "").trim();
    if (!Number.isFinite(maxLength) || maxLength <= 0 || text.length <= maxLength) {
        return text;
    }
    return text.slice(0, maxLength).trimEnd();
}

const financeExpenseSchema = new Schema<IFinanceExpense>(
    {
        id: { type: String, trim: true, required: true, maxlength: 60 },
        importKey: { type: String, trim: true, default: "", maxlength: 120 },
        title: { type: String, trim: true, required: true, maxlength: 200 },
        description: { type: String, trim: true, default: "", maxlength: 500 },
        monthKey: { type: String, trim: true, required: true, maxlength: 32 },
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
        },
        invoiceNumber: { type: String, trim: true, default: "", maxlength: 120 },
        invoiceFile: { type: String, trim: true, default: "", maxlength: 180 },
        invoiceUrl: { type: String, trim: true, default: "", maxlength: 300 },
        invoicePublicId: { type: String, trim: true, default: "", maxlength: 180 },
        sourceSheet: { type: String, trim: true, default: "", maxlength: 80 },
        sourceRowNumber: { type: Number, min: 0, default: 0 },
        expenseTag: { type: String, trim: true, default: "", maxlength: 80 },
        vendorId: { type: String, trim: true, default: "", maxlength: 60 },
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
        expenses: { type: [financeExpenseSchema], default: [] },
    },
    { _id: false }
);

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

const financeVendorSchema = new Schema<IFinanceVendor>(
    {
        id: { type: String, trim: true, required: true, maxlength: 60 },
        name: { type: String, trim: true, required: true, maxlength: 160 },
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

const departmentFinanceMonthSchema = new Schema<IDepartmentFinanceMonth>(
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
        expenses: { type: [financeExpenseSchema], default: [] },
    },
    { _id: false }
);

const departmentFinancePlanSchema = new Schema<IDepartmentFinancePlan>(
    {
        id: { type: String, trim: true, required: true, maxlength: 60 },
        department: { type: String, trim: true, required: true, maxlength: 120 },
        managerName: { type: String, trim: true, default: "", maxlength: 120 },
        fiscalYear: { type: String, trim: true, required: true, maxlength: 20 },
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
        vendors: { type: [financeVendorSchema], default: [] },
        reminders: { type: [financeReminderSchema], default: [] },
    },
    { _id: false }
);

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

const annualFinanceRequestSchema = new Schema<IAnnualFinanceRequest>(
    {
        id: { type: String, trim: true, required: true, maxlength: 40 },
        department: { type: String, trim: true, required: true, maxlength: 120 },
        requestedBudget: { type: Number, required: true, min: 0, default: 0 },
        previousSpend: { type: Number, required: true, min: 0, default: 0 },
        status: {
            type: String,
            enum: ["Draft", "Pending", "Approved", "Rejected", "Discuss"],
            default: "Pending",
            required: true,
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
    { _id: false }
);

const extraFinanceRequestSchema = new Schema<IExtraFinanceRequest>(
    {
        id: { type: String, trim: true, required: true, maxlength: 40 },
        importKey: { type: String, trim: true, default: "", maxlength: 120 },
        date: { type: String, trim: true, required: true, maxlength: 40 },
        department: { type: String, trim: true, required: true, maxlength: 120 },
        amount: { type: Number, required: true, min: 0, default: 0 },
        reason: { type: String, trim: true, maxlength: 1000, default: "" },
        monthKey: { type: String, trim: true, default: "", maxlength: 32 },
        month: { type: String, trim: true, default: "", maxlength: 16 },
        dueDate: { type: String, trim: true, default: "", maxlength: 40 },
        submittedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
        submittedByName: { type: String, trim: true, default: "", maxlength: 120 },
        submittedAt: { type: Date, default: null },
        submittedAtLabel: { type: String, trim: true, default: "", maxlength: 40 },
        approvalFlow: { type: financeApprovalFlowSchema, default: () => ({}) },
        currentRemaining: { type: Number, required: true, default: 0 },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected", "Discuss"],
            default: "Pending",
            required: true,
        },
    },
    { _id: false }
);

const financeTransactionSchema = new Schema<IFinanceTransaction>(
    {
        id: { type: String, trim: true, required: true, maxlength: 40 },
        dept: { type: String, trim: true, required: true, maxlength: 120 },
        date: { type: String, trim: true, required: true, maxlength: 40 },
        type: { type: String, trim: true, required: true, maxlength: 60 },
        item: { type: String, trim: true, required: true, maxlength: 240 },
        amount: { type: Number, required: true, min: 0, default: 0 },
        po: { type: String, trim: true, maxlength: 100, default: null },
        invoice: { type: String, trim: true, maxlength: 100, default: null },
        status: { type: String, trim: true, maxlength: 80, default: "Cleared" },
    },
    { _id: false }
);

const financeAuditTrailSchema = new Schema<IFinanceAuditTrail>(
    {
        id: { type: String, trim: true, required: true, maxlength: 40 },
        dept: { type: String, trim: true, required: true, maxlength: 120 },
        item: { type: String, trim: true, required: true, maxlength: 240 },
        amount: { type: Number, required: true, min: 0, default: 0 },
        approved: { type: Boolean, default: true },
        poAttached: { type: Boolean, default: true },
        receiptAttached: { type: Boolean, default: true },
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
