import mongoose, { Document, Schema } from "mongoose";

export interface IPayrollPaymentEvent {
    status: "Pending" | "Processing" | "Paid" | "Failed";
    note?: string;
    changedBy?: mongoose.Types.ObjectId | null;
    createdAt: Date;
}

export interface IPayrollPayment extends Document {
    workspaceId: mongoose.Types.ObjectId;
    payrollCycleId: mongoose.Types.ObjectId;
    employeeProfileId: mongoose.Types.ObjectId;
    employeeUserId?: mongoose.Types.ObjectId | null;
    employeeId: string;
    employeeName: string;
    department?: string;
    departmentId?: mongoose.Types.ObjectId | null;
    cycleKey: string;
    monthLabel: string;
    year: number;
    amount: number;
    currency: string;
    paymentStatus: "Pending" | "Processing" | "Paid" | "Failed";
    paymentMethod?: string;
    transactionId?: string;
    bankDetails: {
        bankName?: string;
        accountHolderName?: string;
        accountNumberMasked?: string;
        ifscCode?: string;
        branchName?: string;
    };
    paymentHistory: IPayrollPaymentEvent[];
    attemptedAt?: Date | null;
    paidAt?: Date | null;
    failedAt?: Date | null;
    paymentErrorMessage?: string;
    paymentErrorCode?: string;
    initiatedBy?: mongoose.Types.ObjectId | null;
    processedBy?: mongoose.Types.ObjectId | null;
    payrollSnapshot?: Record<string, any>;
    metadata?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}

const payrollPaymentEventSchema = new Schema<IPayrollPaymentEvent>(
    {
        status: {
            type: String,
            enum: ["Pending", "Processing", "Paid", "Failed"],
            required: true,
            default: "Pending",
        },
        note: {
            type: String,
            trim: true,
            default: "",
        },
        changedBy: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const payrollPaymentSchema = new Schema<IPayrollPayment>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        payrollCycleId: {
            type: Schema.Types.ObjectId,
            ref: "PayrollCycle",
            required: true,
            index: true,
        },
        employeeProfileId: {
            type: Schema.Types.ObjectId,
            ref: "EmployeeProfile",
            required: true,
            index: true,
        },
        employeeUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        employeeId: {
            type: String,
            trim: true,
            required: true,
            index: true,
        },
        employeeName: {
            type: String,
            trim: true,
            required: true,
            maxlength: 140,
            index: true,
        },
        department: {
            type: String,
            trim: true,
            default: "",
            maxlength: 120,
            index: true,
        },
        departmentId: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            default: null,
            index: true,
        },
        cycleKey: {
            type: String,
            trim: true,
            required: true,
            index: true,
        },
        monthLabel: {
            type: String,
            trim: true,
            required: true,
        },
        year: {
            type: Number,
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        currency: {
            type: String,
            trim: true,
            default: "INR",
        },
        paymentStatus: {
            type: String,
            enum: ["Pending", "Processing", "Paid", "Failed"],
            default: "Pending",
            required: true,
            index: true,
        },
        paymentMethod: {
            type: String,
            trim: true,
            default: "",
        },
        transactionId: {
            type: String,
            trim: true,
            default: "",
            index: true,
        },
        bankDetails: {
            bankName: { type: String, trim: true, default: "" },
            accountHolderName: { type: String, trim: true, default: "" },
            accountNumberMasked: { type: String, trim: true, default: "" },
            ifscCode: { type: String, trim: true, default: "" },
            branchName: { type: String, trim: true, default: "" },
        },
        paymentHistory: {
            type: [payrollPaymentEventSchema],
            default: [],
        },
        attemptedAt: { type: Date, default: null },
        paidAt: { type: Date, default: null },
        failedAt: { type: Date, default: null },
        paymentErrorMessage: { type: String, trim: true, default: "" },
        paymentErrorCode: { type: String, trim: true, default: "" },
        initiatedBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
        processedBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
        payrollSnapshot: { type: Schema.Types.Mixed, default: () => ({}) },
        metadata: { type: Schema.Types.Mixed, default: () => ({}) },
    },
    {
        timestamps: true,
    }
);

payrollPaymentSchema.index({ workspaceId: 1, payrollCycleId: 1, employeeProfileId: 1 }, { unique: true });
payrollPaymentSchema.index({ workspaceId: 1, paymentStatus: 1, updatedAt: -1 });

export const PayrollPayment = (mongoose.models.PayrollPayment as mongoose.Model<IPayrollPayment>) ||
    mongoose.model<IPayrollPayment>("PayrollPayment", payrollPaymentSchema);
export default PayrollPayment;
