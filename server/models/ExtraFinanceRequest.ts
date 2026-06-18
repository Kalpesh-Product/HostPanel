import mongoose, { Document, Schema } from "mongoose";

export interface IExtraFinanceRequest extends Document {
    snapshotId: mongoose.Types.ObjectId;
    workspaceId: mongoose.Types.ObjectId;
    requestKey: string; // matches original 'id' string field
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
    approvalFlow: any; // reuse schema or mixed
    currentRemaining: number;
    status: "Pending" | "Approved" | "Rejected" | "Discuss";
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

const extraFinanceRequestSchema = new Schema<IExtraFinanceRequest>(
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
        importKey: { type: String, trim: true, default: "", maxlength: 120 },
        date: { type: String, trim: true, required: true, maxlength: 40 },
        department: { type: String, trim: true, required: true, maxlength: 120, index: true },
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
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

export const ExtraFinanceRequest = (mongoose.models.ExtraFinanceRequest as mongoose.Model<IExtraFinanceRequest>) ||
    mongoose.model<IExtraFinanceRequest>("ExtraFinanceRequest", extraFinanceRequestSchema);
export default ExtraFinanceRequest;
