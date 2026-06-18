import mongoose, { Document, Schema } from "mongoose";

export interface IMaintenanceHistory {
    date: string;
    note: string;
    actionType: string;
    performedBy?: string;
    performedByUserId?: mongoose.Types.ObjectId | null;
}

export interface IMaintenanceSchedule extends Document {
    workspaceId?: mongoose.Types.ObjectId | null;
    ownerId: mongoose.Types.ObjectId;
    scheduleNumber: number;
    scheduleCode: string;
    assetId: mongoose.Types.ObjectId;
    assetCode: string;
    assetName: string;
    assetCategory?: string;
    departmentId?: mongoose.Types.ObjectId | null;
    maintenanceType: string;
    frequency: string;
    lastServiceDate?: string;
    nextServiceDate: string;
    technician: string;
    status: "Scheduled" | "Due Soon" | "Overdue" | "Completed";
    enableReminders: boolean;
    notes?: string;
    linkedRepairLogId?: mongoose.Types.ObjectId | null;
    linkedRepairLogCode?: string;
    history: IMaintenanceHistory[];
    createdAt?: Date;
    updatedAt?: Date;
}

const maintenanceHistorySchema = new Schema<IMaintenanceHistory>(
    {
        date: { type: String, required: true, trim: true, maxlength: 30 },
        note: { type: String, required: true, trim: true, maxlength: 2000 },
        actionType: { type: String, default: "updated", trim: true, maxlength: 40 },
        performedBy: { type: String, default: "", trim: true, maxlength: 120 },
        performedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
    },
    { _id: false }
);

const maintenanceScheduleSchema = new Schema<IMaintenanceSchedule>(
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
        scheduleNumber: {
            type: Number,
            required: true,
        },
        scheduleCode: {
            type: String,
            required: true,
            trim: true,
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
        assetCategory: {
            type: String,
            default: "",
            trim: true,
            maxlength: 80,
        },
        departmentId: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            default: null,
            index: true,
        },
        maintenanceType: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
            index: true,
        },
        frequency: {
            type: String,
            required: true,
            trim: true,
            maxlength: 40,
            index: true,
        },
        lastServiceDate: {
            type: String,
            default: "",
            trim: true,
            maxlength: 30,
        },
        nextServiceDate: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
            index: true,
        },
        technician: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        status: {
            type: String,
            enum: ["Scheduled", "Due Soon", "Overdue", "Completed"],
            default: "Scheduled",
            required: true,
            index: true,
        },
        enableReminders: {
            type: Boolean,
            default: true,
        },
        notes: {
            type: String,
            default: "",
            trim: true,
            maxlength: 2000,
        },
        linkedRepairLogId: {
            type: Schema.Types.ObjectId,
            ref: "RepairLog",
            default: null,
            index: true,
        },
        linkedRepairLogCode: {
            type: String,
            default: "",
            trim: true,
            maxlength: 40,
        },
        history: {
            type: [maintenanceHistorySchema],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

maintenanceScheduleSchema.index({ workspaceId: 1, scheduleNumber: 1 }, { unique: true, sparse: true });
maintenanceScheduleSchema.index({ workspaceId: 1, nextServiceDate: 1 });
maintenanceScheduleSchema.index({ workspaceId: 1, createdAt: -1 });

export const MaintenanceSchedule = (mongoose.models.MaintenanceSchedule as mongoose.Model<IMaintenanceSchedule>) ||
    mongoose.model<IMaintenanceSchedule>("MaintenanceSchedule", maintenanceScheduleSchema);
export default MaintenanceSchedule;
