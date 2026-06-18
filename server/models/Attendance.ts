import mongoose, { Document, Schema } from "mongoose";

export interface IAttendanceBreak {
    startAt: Date;
    endAt?: Date | null;
    durationSeconds: number;
}

export interface ICorrectionRequest {
    requestedCheckInAt?: Date | null;
    requestedCheckOutAt?: Date | null;
    originalCheckInAt?: Date | null;
    originalCheckOutAt?: Date | null;
    reason?: string;
    status: "pending" | "approved" | "rejected";
    reviewedByUserId?: mongoose.Types.ObjectId | null;
    reviewedByName?: string;
    requestedAt: Date;
    reviewedAt?: Date | null;
    reviewedReason?: string;
}

export interface IAttendancePunchSelfie {
    action: "check_in" | "break_start" | "break_end" | "check_out";
    url: string;
    publicId: string;
    folder: string;
    uploadedAt?: Date | null;
}

export interface IAttendance extends Document {
    workspaceId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    employeeUserId: mongoose.Types.ObjectId;
    employeeName: string;
    employeeRole: mongoose.Types.ObjectId;
    department?: mongoose.Types.ObjectId | null;
    attendanceDate: Date;
    dateKey: string; // YYYY-MM-DD
    mode: "office" | "wfh";
    status: "present" | "present_late" | "wfh" | "on_break" | "shortfall" | "half_day" | "absent" | "overtime" | "sunday_off";
    checkInAt?: Date | null;
    checkInSelfieUrl?: string;
    checkInSelfiePublicId?: string;
    checkInSelfieFolder?: string;
    checkInSelfieUploadedAt?: Date | null;
    checkOutAt?: Date | null;
    autoCheckoutAt?: Date | null;
    punchSelfies: IAttendancePunchSelfie[];
    isActiveBreak: boolean;
    activeBreakStartedAt?: Date | null;
    breakSeconds: number;
    workedSeconds: number;
    breakLogs: IAttendanceBreak[];
    correctionRequest?: ICorrectionRequest | null;
    reviewedReason?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const attendanceBreakSchema = new Schema<IAttendanceBreak>(
    {
        startAt: { type: Date, required: true },
        endAt: { type: Date, default: null },
        durationSeconds: { type: Number, min: 0, default: 0 },
    },
    { _id: false }
);

const correctionRequestSchema = new Schema<ICorrectionRequest>(
    {
        requestedCheckInAt: { type: Date, default: null },
        requestedCheckOutAt: { type: Date, default: null },
        originalCheckInAt: { type: Date, default: null },
        originalCheckOutAt: { type: Date, default: null },
        reason: { type: String, trim: true, default: "", maxlength: 1200 },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        reviewedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
        reviewedByName: { type: String, trim: true, default: "", maxlength: 140 },
        requestedAt: { type: Date, default: Date.now },
        reviewedAt: { type: Date, default: null },
        reviewedReason: { type: String, trim: true, default: "", maxlength: 1200 },
    },
    { _id: false }
);

const attendancePunchSelfieSchema = new Schema<IAttendancePunchSelfie>(
    {
        action: {
            type: String,
            required: true,
            trim: true,
            enum: ["check_in", "break_start", "break_end", "check_out"],
            index: true,
        },
        url: { type: String, trim: true, default: "" },
        publicId: { type: String, trim: true, default: "" },
        folder: { type: String, trim: true, default: "" },
        uploadedAt: { type: Date, default: null },
    },
    { _id: false }
);

const attendanceSchema = new Schema<IAttendance>(
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
        employeeUserId: {
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
            index: true,
        },
        employeeRole: {
            type: Schema.Types.ObjectId,
            ref: "Role",
            required: true,
            index: true,
        },
        department: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            default: null,
            index: true,
        },
        attendanceDate: {
            type: Date,
            required: true,
            index: true,
        },
        dateKey: {
            type: String,
            required: true,
            trim: true,
            match: /^\d{4}-\d{2}-\d{2}$/,
            index: true,
        },
        mode: {
            type: String,
            enum: ["office", "wfh"],
            default: "office",
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: [
                "present",
                "present_late",
                "wfh",
                "on_break",
                "shortfall",
                "half_day",
                "absent",
                "overtime",
                "sunday_off",
            ],
            default: "absent",
            required: true,
            index: true,
        },
        checkInAt: { type: Date, default: null },
        checkInSelfieUrl: { type: String, trim: true, default: "" },
        checkInSelfiePublicId: { type: String, trim: true, default: "" },
        checkInSelfieFolder: { type: String, trim: true, default: "" },
        checkInSelfieUploadedAt: { type: Date, default: null },
        checkOutAt: { type: Date, default: null },
        autoCheckoutAt: { type: Date, default: null },
        punchSelfies: { type: [attendancePunchSelfieSchema], default: [] },
        isActiveBreak: { type: Boolean, default: false },
        activeBreakStartedAt: { type: Date, default: null },
        breakSeconds: { type: Number, min: 0, default: 0 },
        workedSeconds: { type: Number, min: 0, default: 0 },
        breakLogs: { type: [attendanceBreakSchema], default: [] },
        correctionRequest: { type: correctionRequestSchema, default: null },
        reviewedReason: { type: String, trim: true, default: "", maxlength: 1200 },
    },
    {
        timestamps: true,
    }
);

attendanceSchema.index(
    { workspaceId: 1, employeeUserId: 1, dateKey: 1 },
    { unique: true }
);
attendanceSchema.index({ workspaceId: 1, dateKey: -1, employeeName: 1 });

export const Attendance = (mongoose.models.Attendance as mongoose.Model<IAttendance>) ||
    mongoose.model<IAttendance>("Attendance", attendanceSchema);
export default Attendance;
