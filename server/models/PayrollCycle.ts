import mongoose, { Document, Schema } from "mongoose";

export interface IPayrollAdjustment {
    type: "bonus" | "deduction";
    amount: number;
    reason?: string;
    createdBy?: mongoose.Types.ObjectId | null;
    createdAt: Date;
}

export interface IPayrollEmployee {
    profileId: mongoose.Types.ObjectId;
    linkedUserId?: mongoose.Types.ObjectId | null;
    employeeId: string;
    employeeName: string;
    department?: string;
    departmentId?: mongoose.Types.ObjectId | null;
    role?: string;
    roleId?: mongoose.Types.ObjectId | null;
    salaryPackage: {
        annualCtc: number;
        grossAnnual: number;
        monthlyCtc: number;
        grossMonthly: number;
        currency: string;
        benefits: number;
        deductions: number;
    };
    attendance: {
        totalDays: number;
        workingDays: number;
        payableDays: number;
        present: number;
        paidLeaves: number;
        unpaidLeaves: number;
        dailyRate: number;
        presentPay: number;
        leavePay: number;
        halfDayPay: number;
    };
    financials: {
        baseSalary: number;
        benefits: number;
        standardDeductions: number;
        attendanceDeductions: number;
        attendanceGrossPay: number;
        monthlyGrossSalary: number;
        hrBonus: number;
        hrDeductions: number;
        netSalary: number;
        currency: string;
        prorationFactor: number;
        paymentStatus: "Pending" | "Processing" | "Paid" | "Failed";
        paymentRecordId?: mongoose.Types.ObjectId | null;
        paymentTransactionId?: string;
        paidAt?: Date | null;
        paymentMethod?: string;
        paymentErrorMessage?: string;
        paymentHistory: string[];
        payslipId?: mongoose.Types.ObjectId | null;
        payslipUrl?: string;
        payslipFileName?: string;
        payslipGeneratedAt?: Date | null;
        payslipSentAt?: Date | null;
    };
    manualAdjustments: IPayrollAdjustment[];
    adjustmentReason?: string;
    hasSalaryPackage: boolean;
}

export interface IPayrollSummary {
    totalEmployees: number;
    totalWorkingDays: number;
    totalGross: number;
    totalBenefits: number;
    totalStandardDeductions: number;
    totalAttendanceDeductions: number;
    totalManualBonuses: number;
    totalManualDeductions: number;
    totalNetPayable: number;
}

export interface IPayrollCycle extends Document {
    workspaceId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    cycleKey: string;
    month: number;
    year: number;
    monthLabel: string;
    status: "Pending" | "Prepared" | "Sent to Finance" | "Paid";
    processedOn?: Date | null;
    preparedAt?: Date | null;
    sentToFinanceAt?: Date | null;
    paidAt?: Date | null;
    preparedBy?: mongoose.Types.ObjectId | null;
    sentToFinanceBy?: mongoose.Types.ObjectId | null;
    paidBy?: mongoose.Types.ObjectId | null;
    employeeEntries: IPayrollEmployee[];
    summary: IPayrollSummary;
    createdAt?: Date;
    updatedAt?: Date;
}

const payrollAdjustmentSchema = new Schema<IPayrollAdjustment>(
    {
        type: {
            type: String,
            enum: ["bonus", "deduction"],
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        reason: {
            type: String,
            trim: true,
            maxlength: 1200,
            default: "",
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: false }
);

const payrollEmployeeSchema = new Schema<IPayrollEmployee>(
    {
        profileId: {
            type: Schema.Types.ObjectId,
            ref: "EmployeeProfile",
            required: true,
            index: true,
        },
        linkedUserId: {
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
        role: {
            type: String,
            trim: true,
            default: "Employee",
            maxlength: 80,
            index: true,
        },
        roleId: {
            type: Schema.Types.ObjectId,
            ref: "Role",
            default: null,
            index: true,
        },
        salaryPackage: {
            annualCtc: { type: Number, required: true, min: 0, default: 0 },
            grossAnnual: { type: Number, required: true, min: 0, default: 0 },
            monthlyCtc: { type: Number, required: true, min: 0, default: 0 },
            grossMonthly: { type: Number, required: true, min: 0, default: 0 },
            currency: { type: String, trim: true, default: "INR" },
            benefits: { type: Number, required: true, min: 0, default: 0 },
            deductions: { type: Number, required: true, min: 0, default: 0 },
        },
        attendance: {
            totalDays: { type: Number, required: true, min: 0, default: 0 },
            workingDays: { type: Number, required: true, min: 0, default: 0 },
            payableDays: { type: Number, required: true, min: 0, default: 0 },
            present: { type: Number, required: true, min: 0, default: 0 },
            paidLeaves: { type: Number, required: true, min: 0, default: 0 },
            unpaidLeaves: { type: Number, required: true, min: 0, default: 0 },
            dailyRate: { type: Number, required: true, min: 0, default: 0 },
            presentPay: { type: Number, required: true, min: 0, default: 0 },
            leavePay: { type: Number, required: true, min: 0, default: 0 },
            halfDayPay: { type: Number, required: true, min: 0, default: 0 },
        },
        financials: {
            baseSalary: { type: Number, required: true, min: 0, default: 0 },
            benefits: { type: Number, required: true, min: 0, default: 0 },
            standardDeductions: { type: Number, required: true, min: 0, default: 0 },
            attendanceDeductions: { type: Number, required: true, min: 0, default: 0 },
            attendanceGrossPay: { type: Number, required: true, min: 0, default: 0 },
            monthlyGrossSalary: { type: Number, required: true, min: 0, default: 0 },
            hrBonus: { type: Number, required: true, min: 0, default: 0 },
            hrDeductions: { type: Number, required: true, min: 0, default: 0 },
            netSalary: { type: Number, required: true, min: 0, default: 0 },
            currency: { type: String, trim: true, default: "INR" },
            prorationFactor: { type: Number, required: true, min: 0, default: 0 },
            paymentStatus: {
                type: String,
                enum: ["Pending", "Processing", "Paid", "Failed"],
                default: "Pending",
                index: true,
            },
            paymentRecordId: { type: Schema.Types.ObjectId, ref: "PayrollPayment", default: null, index: true },
            paymentTransactionId: { type: String, trim: true, default: "", index: true },
            paidAt: { type: Date, default: null },
            paymentMethod: { type: String, trim: true, default: "" },
            paymentErrorMessage: { type: String, trim: true, default: "" },
            paymentHistory: { type: [String], default: [] },
            payslipId: { type: Schema.Types.ObjectId, ref: "PayrollPayslip", default: null, index: true },
            payslipUrl: { type: String, trim: true, default: "" },
            payslipFileName: { type: String, trim: true, default: "" },
            payslipGeneratedAt: { type: Date, default: null },
            payslipSentAt: { type: Date, default: null },
        },
        manualAdjustments: { type: [payrollAdjustmentSchema], default: [] },
        adjustmentReason: { type: String, trim: true, default: "", maxlength: 1200 },
        hasSalaryPackage: { type: Boolean, default: true, index: true },
    },
    { timestamps: false }
);

const payrollSummarySchema = new Schema<IPayrollSummary>(
    {
        totalEmployees: { type: Number, required: true, min: 0, default: 0 },
        totalWorkingDays: { type: Number, required: true, min: 0, default: 0 },
        totalGross: { type: Number, required: true, min: 0, default: 0 },
        totalBenefits: { type: Number, required: true, min: 0, default: 0 },
        totalStandardDeductions: { type: Number, required: true, min: 0, default: 0 },
        totalAttendanceDeductions: { type: Number, required: true, min: 0, default: 0 },
        totalManualBonuses: { type: Number, required: true, min: 0, default: 0 },
        totalManualDeductions: { type: Number, required: true, min: 0, default: 0 },
        totalNetPayable: { type: Number, required: true, min: 0, default: 0 },
    },
    { _id: false }
);

const payrollCycleSchema = new Schema<IPayrollCycle>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            required: true,
            index: true,
        },
        cycleKey: {
            type: String,
            trim: true,
            required: true,
            maxlength: 16,
            index: true,
        },
        month: {
            type: Number,
            required: true,
            min: 0,
            max: 11,
            index: true,
        },
        year: {
            type: Number,
            required: true,
            min: 2000,
            max: 3000,
            index: true,
        },
        monthLabel: {
            type: String,
            trim: true,
            required: true,
            maxlength: 20,
        },
        status: {
            type: String,
            enum: ["Pending", "Prepared", "Sent to Finance", "Paid"],
            default: "Pending",
            required: true,
            index: true,
        },
        processedOn: { type: Date, default: null },
        preparedAt: { type: Date, default: null },
        sentToFinanceAt: { type: Date, default: null },
        paidAt: { type: Date, default: null },
        preparedBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
        sentToFinanceBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
        paidBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
        employeeEntries: { type: [payrollEmployeeSchema], default: [] },
        summary: { type: payrollSummarySchema, default: () => ({}) },
    },
    {
        timestamps: true,
    }
);

payrollCycleSchema.index({ workspaceId: 1, cycleKey: 1 }, { unique: true });
payrollCycleSchema.index({ workspaceId: 1, status: 1, updatedAt: -1 });

export const PayrollCycle = (mongoose.models.PayrollCycle as mongoose.Model<IPayrollCycle>) ||
    mongoose.model<IPayrollCycle>("PayrollCycle", payrollCycleSchema);
export default PayrollCycle;
