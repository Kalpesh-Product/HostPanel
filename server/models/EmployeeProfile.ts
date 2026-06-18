import mongoose, { Document, Schema } from "mongoose";

export interface IEmployeeHistoryEntry {
    effectiveAt: Date;
    note?: string;
    changedBy?: mongoose.Types.ObjectId | null;
}

export interface IEmployeeSalaryHistory {
    amount: number;
    currency: string;
    payFrequency: string;
    effectiveAt: Date;
    note?: string;
    changedBy?: mongoose.Types.ObjectId | null;
}

export interface IEmployeeDocument {
    name: string;
    type: string;
    url: string;
    publicId: string;
    uploadedAt: Date;
}

export interface IEmployeeProfile extends Document {
    workspaceId: mongoose.Types.ObjectId;
    linkedUserId?: mongoose.Types.ObjectId | null;
    linkedWorkspaceMemberId?: mongoose.Types.ObjectId | null;
    employeeId: string;
    fullName: string;
    email: string;
    phone?: string;
    dateOfBirth?: Date | null;
    currentAddress?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    jobTitle?: string;
    jobCode?: string;
    departments: mongoose.Types.ObjectId[];
    workLocation?: string;
    workMode: "office" | "remote" | "hybrid";
    managerName?: string;
    managerUserId?: mongoose.Types.ObjectId | null;
    workspaceRole: mongoose.Types.ObjectId;
    isHousekeepingStaff: boolean;
    employmentType: "full_time" | "part_time" | "intern" | "contractor" | "trainee";
    internshipIsUnpaid: boolean;
    status: "pending" | "invite_sent" | "registered" | "joined" | "active" | "inactive" | "probation" | "terminated";
    joiningDate?: Date | null;
    internshipDurationMonths: number;
    internshipEndDate?: Date | null;
    noticePeriodDays: number;
    probationDays: number;
    salaryPackage: {
        amount: number;
        grossAnnual: number;
        currency: string;
        payFrequency: "monthly" | "weekly" | "biweekly" | "annual";
        allowances: number;
        deductions: number;
    };
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    nationalIdType?: string;
    nationalIdNumber?: string;
    taxId?: string;
    providentFundNumber?: string;
    accessModules: string[];
    accessFeatures: string[];
    documents: IEmployeeDocument[];
    notes?: string;
    lastLoginAt?: Date | null;
    salaryHistory: IEmployeeSalaryHistory[];
    lifecycleHistory: IEmployeeHistoryEntry[];
    isActive: boolean;
    archivedAt?: Date | null;
    createdBy?: mongoose.Types.ObjectId | null;
    updatedBy?: mongoose.Types.ObjectId | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const employeeHistoryEntrySchema = new Schema<IEmployeeHistoryEntry>(
    {
        effectiveAt: { type: Date, default: Date.now },
        note: { type: String, trim: true, default: "" },
        changedBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    },
    { _id: false }
);

const employeeSalaryHistorySchema = new Schema<IEmployeeSalaryHistory>(
    {
        amount: { type: Number, default: 0 },
        currency: { type: String, trim: true, default: "INR" },
        payFrequency: { type: String, trim: true, default: "annual" },
        effectiveAt: { type: Date, default: Date.now },
        note: { type: String, trim: true, default: "" },
        changedBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    },
    { _id: false }
);

const employeeDocumentSchema = new Schema<IEmployeeDocument>(
    {
        name: { type: String, trim: true, required: true },
        type: { type: String, trim: true, default: "document" },
        url: { type: String, trim: true, default: "" },
        publicId: { type: String, trim: true, default: "" },
        uploadedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const employeeProfileSchema = new Schema<IEmployeeProfile>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        linkedUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        linkedWorkspaceMemberId: {
            type: Schema.Types.ObjectId,
            ref: "WorkspaceMember",
            default: null,
            index: true,
        },
        employeeId: {
            type: String,
            trim: true,
            uppercase: true,
            required: true,
            index: true,
        },
        fullName: {
            type: String,
            trim: true,
            required: true,
            maxlength: 120,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            required: true,
            maxlength: 160,
            index: true,
        },
        phone: {
            type: String,
            trim: true,
            default: "",
        },
        dateOfBirth: {
            type: Date,
            default: null,
        },
        currentAddress: {
            type: String,
            trim: true,
            default: "",
        },
        emergencyContactName: {
            type: String,
            trim: true,
            default: "",
        },
        emergencyContactPhone: {
            type: String,
            trim: true,
            default: "",
        },
        jobTitle: {
            type: String,
            trim: true,
            default: "",
        },
        jobCode: {
            type: String,
            trim: true,
            default: "",
            index: true,
        },
        departments: {
            type: [{ type: Schema.Types.ObjectId, ref: "Department" }],
            default: [],
        },
        workLocation: {
            type: String,
            trim: true,
            default: "",
        },
        workMode: {
            type: String,
            enum: ["office", "remote", "hybrid"],
            default: "office",
            index: true,
        },
        managerName: {
            type: String,
            trim: true,
            default: "",
        },
        managerUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        workspaceRole: {
            type: Schema.Types.ObjectId,
            ref: "Role",
            required: true,
            index: true,
        },
        isHousekeepingStaff: {
            type: Boolean,
            default: false,
            index: true,
        },
        employmentType: {
            type: String,
            enum: ["full_time", "part_time", "intern", "contractor", "trainee"],
            default: "full_time",
            index: true,
        },
        internshipIsUnpaid: {
            type: Boolean,
            default: false,
            index: true,
        },
        status: {
            type: String,
            enum: ["pending", "invite_sent", "registered", "joined", "active", "inactive", "probation", "terminated"],
            default: "pending",
            index: true,
        },
        joiningDate: {
            type: Date,
            default: null,
            index: true,
        },
        internshipDurationMonths: {
            type: Number,
            default: 0,
        },
        internshipEndDate: {
            type: Date,
            default: null,
            index: true,
        },
        noticePeriodDays: {
            type: Number,
            default: 0,
        },
        probationDays: {
            type: Number,
            default: 0,
        },
        salaryPackage: {
            amount: { type: Number, default: 0 },
            grossAnnual: { type: Number, default: 0 },
            currency: { type: String, trim: true, default: "INR" },
            payFrequency: {
                type: String,
                enum: ["monthly", "weekly", "biweekly", "annual"],
                default: "annual",
            },
            allowances: { type: Number, default: 0 },
            deductions: { type: Number, default: 0 },
        },
        bankName: { type: String, trim: true, default: "" },
        accountHolderName: { type: String, trim: true, default: "" },
        accountNumber: { type: String, trim: true, default: "" },
        ifscCode: { type: String, trim: true, default: "" },
        nationalIdType: { type: String, trim: true, default: "" },
        nationalIdNumber: { type: String, trim: true, default: "" },
        taxId: { type: String, trim: true, default: "" },
        providentFundNumber: { type: String, trim: true, default: "" },
        accessModules: { type: [String], default: [] },
        accessFeatures: { type: [String], default: [] },
        documents: { type: [employeeDocumentSchema], default: [] },
        notes: { type: String, trim: true, default: "" },
        lastLoginAt: { type: Date, default: null },
        salaryHistory: { type: [employeeSalaryHistorySchema], default: [] },
        lifecycleHistory: { type: [employeeHistoryEntrySchema], default: [] },
        isActive: { type: Boolean, default: true, index: true },
        archivedAt: { type: Date, default: null },
        createdBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
    },
    {
        timestamps: true,
    }
);

employeeProfileSchema.index({ workspaceId: 1, email: 1 }, { unique: true });
employeeProfileSchema.index({ workspaceId: 1, employeeId: 1 }, { unique: true });
employeeProfileSchema.index({ workspaceId: 1, fullName: 1 });

export const EmployeeProfile = (mongoose.models.EmployeeProfile as mongoose.Model<IEmployeeProfile>) ||
    mongoose.model<IEmployeeProfile>("EmployeeProfile", employeeProfileSchema);
export default EmployeeProfile;
