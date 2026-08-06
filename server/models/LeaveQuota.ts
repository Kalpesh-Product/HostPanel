import mongoose, { Document, Schema } from "mongoose";

export type LeaveTypeKey = "Casual" | "Sick" | "Vacation";

export interface ILeaveQuota extends Document {
    workspaceId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    year: number;
    Casual: number;
    Sick: number;
    Vacation: number;
    createdBy?: mongoose.Types.ObjectId | null;
    updatedBy?: mongoose.Types.ObjectId | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const leaveQuotaSchema = new Schema<ILeaveQuota>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            required: true,
            index: true,
        },
        year: {
            type: Number,
            required: true,
            min: 2000,
            max: 2200,
            index: true,
        },
        Casual: {
            type: Number,
            default: 0,
            min: 0,
        },
        Sick: {
            type: Number,
            default: 0,
            min: 0,
        },
        Vacation: {
            type: Number,
            default: 0,
            min: 0,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

leaveQuotaSchema.index({ workspaceId: 1, userId: 1, year: 1 }, { unique: true });
leaveQuotaSchema.index({ workspaceId: 1, year: 1 });

export const LeaveQuota = (mongoose.models.LeaveQuota as mongoose.Model<ILeaveQuota>) ||
    mongoose.model<ILeaveQuota>("LeaveQuota", leaveQuotaSchema);
export default LeaveQuota;
