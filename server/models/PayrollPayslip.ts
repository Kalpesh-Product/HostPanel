import mongoose, { Document, Schema } from "mongoose";

export interface IPayslipSummary {
    baseSalary: number;
    benefits: number;
    standardDeductions: number;
    attendanceDeductions: number;
    hrBonus: number;
    hrDeductions: number;
    netPayable: number;
    currency: string;
}

export interface IPayrollPayslip extends Document {
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
    fileName: string;
    fileUrl: string;
    filePublicId?: string;
    fileFormat: string;
    summary: IPayslipSummary;
    generatedBy?: mongoose.Types.ObjectId | null;
    generatedAt: Date;
    sentToEmployeeAt?: Date | null;
    sentToEmployeeBy?: mongoose.Types.ObjectId | null;
    emailDeliveryStatus: "Pending" | "Sent" | "Failed";
    emailDeliveryErrorMessage?: string;
    metadata?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}

const payslipSummarySchema = new Schema<IPayslipSummary>(
    {
        baseSalary: { type: Number, default: 0, min: 0 },
        benefits: { type: Number, default: 0, min: 0 },
        standardDeductions: { type: Number, default: 0, min: 0 },
        attendanceDeductions: { type: Number, default: 0, min: 0 },
        hrBonus: { type: Number, default: 0, min: 0 },
        hrDeductions: { type: Number, default: 0, min: 0 },
        netPayable: { type: Number, default: 0, min: 0 },
        currency: { type: String, trim: true, default: "INR" },
    },
    { _id: false }
);

const payrollPayslipSchema = new Schema<IPayrollPayslip>(
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
            index: true,
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
        fileName: {
            type: String,
            trim: true,
            required: true,
            maxlength: 180,
        },
        fileUrl: {
            type: String,
            trim: true,
            required: true,
        },
        filePublicId: {
            type: String,
            trim: true,
            default: "",
        },
        fileFormat: {
            type: String,
            trim: true,
            default: "pdf",
        },
        summary: {
            type: payslipSummarySchema,
            default: () => ({}),
        },
        generatedBy: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        generatedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        sentToEmployeeAt: {
            type: Date,
            default: null,
            index: true,
        },
        sentToEmployeeBy: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        emailDeliveryStatus: {
            type: String,
            enum: ["Pending", "Sent", "Failed"],
            default: "Pending",
            index: true,
        },
        emailDeliveryErrorMessage: {
            type: String,
            trim: true,
            default: "",
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: () => ({}),
        },
    },
    {
        timestamps: true,
    }
);

payrollPayslipSchema.index({ workspaceId: 1, employeeProfileId: 1, cycleKey: 1 }, { unique: true });
payrollPayslipSchema.index({ workspaceId: 1, generatedAt: -1 });

export const PayrollPayslip = (mongoose.models.PayrollPayslip as mongoose.Model<IPayrollPayslip>) ||
    mongoose.model<IPayrollPayslip>("PayrollPayslip", payrollPayslipSchema);
export default PayrollPayslip;
