import mongoose, { Document, Schema } from "mongoose";

export type LeaveTypeKey = "Casual" | "Sick" | "Vacation";

export interface ILeaveQuota extends Document {
    workspaceId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    year: number;
    Casual: number;
    Sick: number;
    Vacation: number;
    balances: Map<string, number>;
    annualBalances: Map<string, number>;
    assignedLeaveTypeIds: mongoose.Types.ObjectId[];
    cycleType: "calendar_year" | "financial_year";
    carryForward: boolean;
    carryForwardLimit?: number | null;
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
        balances: {
            type: Map,
            of: { type: Number, min: 0 },
            default: {},
        },
        annualBalances: {
            type: Map,
            of: { type: Number, min: 0 },
            default: {},
        },
        assignedLeaveTypeIds: {
            type: [{ type: Schema.Types.ObjectId, ref: "LeaveType" }],
            default: [],
        },
        cycleType: {
            type: String,
            enum: ["calendar_year", "financial_year"],
            default: "calendar_year",
        },
        carryForward: {
            type: Boolean,
            default: false,
        },
        carryForwardLimit: {
            type: Number,
            default: null,
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
