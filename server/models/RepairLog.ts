import mongoose, { Document, Schema } from "mongoose";

export interface IRepairLog extends Document {
    workspaceId?: mongoose.Types.ObjectId | null;
    ownerId: mongoose.Types.ObjectId;
    repairLogNumber: number;
    repairLogCode: string;
    department: string;
    departmentId?: mongoose.Types.ObjectId | null;
    assetId: mongoose.Types.ObjectId;
    assetCode: string;
    assetName: string;
    issueType: string;
    issueDescription: string;
    assignedTo: string;
    assigneeUserId?: mongoose.Types.ObjectId | null;
    requestedBy: string;
    requestedByUserId?: mongoose.Types.ObjectId | null;
    requestedByDepartment?: string;
    requestedByDepartmentId?: mongoose.Types.ObjectId | null;
    sourceTicketId?: mongoose.Types.ObjectId | null;
    sourceTicketCode?: string;
    sourceTicketTitle?: string;
    notes?: string;
    status: "Open" | "In Progress" | "Resolved" | "Closed";
    resolutionNote?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const repairLogSchema = new Schema<IRepairLog>(
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
        repairLogNumber: {
            type: Number,
            required: true,
        },
        repairLogCode: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        department: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
            index: true,
        },
        departmentId: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            default: null,
            index: true,
        },
        assetId: {
            type: Schema.Types.ObjectId,
            ref: "Asset",
            required: true,
            index: true,
        },
        assetCode: {
            type: String,
            required: true,
            trim: true,
            maxlength: 40,
            index: true,
        },
        assetName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 180,
        },
        issueType: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
            index: true,
        },
        issueDescription: {
            type: String,
            required: true,
            trim: true,
            maxlength: 3000,
        },
        assignedTo: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        assigneeUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        requestedBy: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        requestedByUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        requestedByDepartment: {
            type: String,
            default: "",
            trim: true,
            maxlength: 80,
        },
        requestedByDepartmentId: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            default: null,
            index: true,
        },
        sourceTicketId: {
            type: Schema.Types.ObjectId,
            ref: "Ticket",
            default: null,
            index: true,
        },
        sourceTicketCode: {
            type: String,
            default: "",
            trim: true,
            maxlength: 40,
        },
        sourceTicketTitle: {
            type: String,
            default: "",
            trim: true,
            maxlength: 180,
        },
        notes: {
            type: String,
            default: "",
            trim: true,
            maxlength: 2000,
        },
        status: {
            type: String,
            enum: ["Open", "In Progress", "Resolved", "Closed"],
            default: "Open",
            required: true,
            index: true,
        },
        resolutionNote: {
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

repairLogSchema.index({ ownerId: 1, repairLogNumber: 1 }, { unique: true });
repairLogSchema.index({ workspaceId: 1, repairLogNumber: 1 }, { unique: true, sparse: true });
repairLogSchema.index({ workspaceId: 1, createdAt: -1 });

export const RepairLog = (mongoose.models.RepairLog as mongoose.Model<IRepairLog>) ||
    mongoose.model<IRepairLog>("RepairLog", repairLogSchema);
export default RepairLog;
