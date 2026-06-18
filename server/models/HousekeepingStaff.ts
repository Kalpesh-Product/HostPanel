import mongoose, { Document, Schema } from "mongoose";

export interface IHousekeepingStaff extends Document {
    workspaceId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    fullName: string;
    address: string;
    email: string;
    phone?: string;
    jobTitle: string;
    notes?: string;
    isActive: boolean;
    attendanceStatus: "Present" | "Absent";
    attendanceDayKey?: string;
    attendanceUpdatedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const housekeepingStaffSchema = new Schema<IHousekeepingStaff>(
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
        fullName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 140,
            index: true,
        },
        address: {
            type: String,
            required: true,
            trim: true,
            maxlength: 240,
        },
        email: {
            type: String,
            default: "",
            trim: true,
            lowercase: true,
            maxlength: 160,
            index: true,
        },
        phone: {
            type: String,
            default: "",
            trim: true,
            maxlength: 40,
        },
        jobTitle: {
            type: String,
            default: "Housekeeping Staff",
            trim: true,
            maxlength: 120,
        },
        notes: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        attendanceStatus: {
            type: String,
            enum: ["Present", "Absent"],
            default: "Absent",
            index: true,
        },
        attendanceDayKey: {
            type: String,
            default: "",
            trim: true,
            index: true,
        },
        attendanceUpdatedAt: {
            type: Date,
            default: null,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

housekeepingStaffSchema.index({ workspaceId: 1, fullName: 1, createdAt: -1 });
housekeepingStaffSchema.index({ workspaceId: 1, email: 1 }, { sparse: true });
housekeepingStaffSchema.index({ workspaceId: 1, attendanceStatus: 1 });
housekeepingStaffSchema.index({ workspaceId: 1, attendanceDayKey: 1 });

export const HousekeepingStaff = (mongoose.models.HousekeepingStaff as mongoose.Model<IHousekeepingStaff>) ||
    mongoose.model<IHousekeepingStaff>("HousekeepingStaff", housekeepingStaffSchema);
export default HousekeepingStaff;
