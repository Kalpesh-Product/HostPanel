import mongoose, { Document, Schema } from "mongoose";

export interface IExitChecklistItem {
    key: string;
    label: string;
    description?: string;
    required: boolean;
    completed: boolean;
    completedAt?: Date | null;
    completedBy?: string;
    completedByUserId?: mongoose.Types.ObjectId | null;
    notes?: string;
}

export interface IExitRequest extends Document {
    workspaceId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    exitNumber: number;
    exitCode: string;
    requesterUserId: mongoose.Types.ObjectId;
    employeeName: string;
    employeeId: string;
    email: string;
    jobTitle?: string;
    department?: string;
    departmentId?: mongoose.Types.ObjectId | null;
    departments: mongoose.Types.ObjectId[];
    requesterRole: string;
    roleId?: mongoose.Types.ObjectId | null;
    managerName?: string;
    managerUserId?: mongoose.Types.ObjectId | null;
    joiningDate?: Date | null;
    noticePeriodDays: number;
    reason: string;
    requestedDocuments: string[];
    requestedDocumentNotes?: string;
    status: "pending" | "approved" | "rejected" | "completed";
    noticeStartAt?: Date | null;
    noticeEndAt?: Date | null;
    approvedAt?: Date | null;
    approvedByUserId?: mongoose.Types.ObjectId | null;
    approvedBy?: string;
    rejectedAt?: Date | null;
    rejectedByUserId?: mongoose.Types.ObjectId | null;
    rejectedBy?: string;
    rejectionReason?: string;
    checklist: IExitChecklistItem[];
    completedAt?: Date | null;
    completedByUserId?: mongoose.Types.ObjectId | null;
    completedBy?: string;
    completionNotes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const exitChecklistItemSchema = new Schema<IExitChecklistItem>(
    {
        key: { type: String, required: true, trim: true, maxlength: 80 },
        label: { type: String, required: true, trim: true, maxlength: 180 },
        description: { type: String, default: "", trim: true, maxlength: 500 },
        required: { type: Boolean, default: true },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date, default: null },
        completedBy: { type: String, default: "", trim: true, maxlength: 140 },
        completedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
        notes: { type: String, default: "", trim: true, maxlength: 1000 },
    },
    { _id: false }
);

const exitRequestSchema = new Schema<IExitRequest>(
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
        exitNumber: {
            type: Number,
            required: true,
        },
        exitCode: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        requesterUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            required: true,
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
            index: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 160,
            index: true,
        },
        jobTitle: {
            type: String,
            default: "",
            trim: true,
            maxlength: 140,
        },
        department: {
            type: String,
            default: "",
            trim: true,
            maxlength: 120,
            index: true,
        },
        departmentId: {
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
            required: true,
            trim: true,
            maxlength: 80,
            index: true,
        },
        roleId: {
            type: Schema.Types.ObjectId,
            ref: "Role",
            default: null,
            index: true,
        },
        managerName: {
            type: String,
            default: "",
            trim: true,
            maxlength: 140,
        },
        managerUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        joiningDate: {
            type: Date,
            default: null,
        },
        noticePeriodDays: {
            type: Number,
            default: 30,
            min: 0,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2500,
        },
        requestedDocuments: {
            type: [String],
            default: [],
        },
        requestedDocumentNotes: {
            type: String,
            default: "",
            trim: true,
            maxlength: 2000,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "completed"],
            default: "pending",
            required: true,
            index: true,
        },
        noticeStartAt: {
            type: Date,
            default: null,
            index: true,
        },
        noticeEndAt: {
            type: Date,
            default: null,
            index: true,
        },
        approvedAt: {
            type: Date,
            default: null,
        },
        approvedByUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        approvedBy: {
            type: String,
            default: "",
            trim: true,
            maxlength: 140,
        },
        rejectedAt: {
            type: Date,
            default: null,
        },
        rejectedByUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        rejectedBy: {
            type: String,
            default: "",
            trim: true,
            maxlength: 140,
        },
        rejectionReason: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1200,
        },
        checklist: {
            type: [exitChecklistItemSchema],
            default: [],
        },
        completedAt: {
            type: Date,
            default: null,
            index: true,
        },
        completedByUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        completedBy: {
            type: String,
            default: "",
            trim: true,
            maxlength: 140,
        },
        completionNotes: {
            type: String,
            default: "",
            trim: true,
            maxlength: 2000,
        },
    },
    {
        timestamps: true,
    }
);

exitRequestSchema.index({ workspaceId: 1, exitNumber: 1 }, { unique: true });
exitRequestSchema.index({ workspaceId: 1, exitCode: 1 }, { unique: true });
exitRequestSchema.index({ workspaceId: 1, requesterUserId: 1, status: 1, createdAt: -1 });
exitRequestSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
exitRequestSchema.index({ workspaceId: 1, noticeEndAt: 1, status: 1 });

export const ExitRequest = (mongoose.models.ExitRequest as mongoose.Model<IExitRequest>) ||
    mongoose.model<IExitRequest>("ExitRequest", exitRequestSchema);
export default ExitRequest;
