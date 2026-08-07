import mongoose, { Document, Schema } from "mongoose";

export interface ILeaveRequest extends Document {
    workspaceId?: mongoose.Types.ObjectId | null;
    ownerId: mongoose.Types.ObjectId;
    leaveNumber: number;
    leaveCode: string;
    employeeName: string;
    employeeId: string;
    requesterUserId?: mongoose.Types.ObjectId | null;
    department?: mongoose.Types.ObjectId | null;
    departments: mongoose.Types.ObjectId[];
    requesterRole: "founder" | "super_admin" | "admin" | "manager" | "employee";
    leaveType: string;
    leaveTypeId?: mongoose.Types.ObjectId | null;
    leaveMode: "full_day" | "half_day" | "hours";
    halfDaySession?: "" | "morning" | "evening";
    leaveHours?: number;
    quotaYear?: number;
    startDate: Date;
    endDate: Date;
    days: number;
    balanceDeducted?: boolean;
    status: "pending" | "approved" | "rejected";
    reason: string;
    requesterBalance: number;
    medicalCertAttached: boolean;
    medicalCertName?: string;
    medicalCertUrl?: string;
    medicalCertPublicId?: string;
    medicalCertMimeType?: string;
    actionedByUserId?: mongoose.Types.ObjectId | null;
    actionedByName?: string;
    actionedByDesignation?: string;
    actionedByDepartment?: string;
    actionedAt?: Date | null;
    rejectionReason?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const leaveRequestSchema = new Schema<ILeaveRequest>(
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
        leaveNumber: {
            type: Number,
            required: true,
        },
        leaveCode: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        employeeName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 140,
        },
        employeeId: {
            type: String,
            required: true,
            trim: true,
            maxlength: 40,
        },
        requesterUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        department: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            default: null,
            index: true,
        },
        departments: {
            type: [{ type: Schema.Types.ObjectId, ref: "Department" }],
            default: [],
        },
        requesterRole: {
            type: String,
            enum: ["founder", "super_admin", "admin", "manager", "employee"],
            required: true,
            index: true,
        },
        leaveType: {
            type: String,
            trim: true,
            maxlength: 100,
            required: true,
            index: true,
        },
        leaveTypeId: {
            type: Schema.Types.ObjectId,
            ref: "LeaveType",
            default: null,
            index: true,
        },
        leaveMode: {
            type: String,
            enum: ["full_day", "half_day", "hours"],
            default: "full_day",
            index: true,
        },
        halfDaySession: {
            type: String,
            enum: ["", "morning", "evening"],
            default: "",
            trim: true,
            index: true,
        },
        leaveHours: {
            type: Number,
            default: 0,
            min: 0,
            index: true,
        },
        quotaYear: {
            type: Number,
            default: null,
            index: true,
        },
        startDate: {
            type: Date,
            required: true,
            index: true,
        },
        endDate: {
            type: Date,
            required: true,
            index: true,
        },
        days: {
            type: Number,
            required: true,
            min: 0.5,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
            required: true,
            index: true,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
        requesterBalance: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        balanceDeducted: {
            type: Boolean,
            default: false,
        },
        medicalCertAttached: {
            type: Boolean,
            default: false,
        },
        medicalCertName: {
            type: String,
            default: "",
            trim: true,
            maxlength: 240,
        },
        medicalCertUrl: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000,
        },
        medicalCertPublicId: {
            type: String,
            default: "",
            trim: true,
            maxlength: 240,
        },
        medicalCertMimeType: {
            type: String,
            default: "",
            trim: true,
            maxlength: 120,
        },
        actionedByUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
        },
        actionedByName: {
            type: String,
            default: "",
            trim: true,
            maxlength: 140,
        },
        actionedByDesignation: {
            type: String,
            default: "",
            trim: true,
            maxlength: 140,
        },
        actionedByDepartment: {
            type: String,
            default: "",
            trim: true,
            maxlength: 140,
        },
        actionedAt: {
            type: Date,
            default: null,
        },
        rejectionReason: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1200,
        },
    },
    {
        timestamps: true,
    }
);

leaveRequestSchema.index({ ownerId: 1, leaveNumber: 1 }, { unique: true });
leaveRequestSchema.index({ workspaceId: 1, leaveNumber: 1 }, { unique: true, sparse: true });
leaveRequestSchema.index({ workspaceId: 1, createdAt: -1 });
leaveRequestSchema.index({ workspaceId: 1, requesterUserId: 1, status: 1, leaveType: 1 });

export const LeaveRequest = (mongoose.models.LeaveRequest as mongoose.Model<ILeaveRequest>) ||
    mongoose.model<ILeaveRequest>("LeaveRequest", leaveRequestSchema);
export default LeaveRequest;
