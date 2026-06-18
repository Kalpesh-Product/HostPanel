import mongoose, { Document, Schema } from "mongoose";

export interface IMonthlyDataEntry {
    month: string;
    metric: string;
    value: string;
}

export interface IReportRow {
    label: string;
    value: string;
}

export interface IReport extends Document {
    workspaceId?: mongoose.Types.ObjectId | null;
    ownerId: mongoose.Types.ObjectId;
    reportNumber: number;
    reportCode: string;
    title: string;
    department: string;
    departmentId?: mongoose.Types.ObjectId | null;
    category: "Attendance" | "Employee" | "Financial" | "Task" | "Ticket" | "Other";
    dataWindow: "Monthly" | "Quarterly" | "Annual" | "Custom";
    reportMonth?: string;
    sourceType: "employee-profile" | "attendance-summary" | "department-roster" | "custom";
    sourceRef?: string;
    generatedBy: string;
    generatedByUserId?: mongoose.Types.ObjectId | null;
    generatedByEmployeeId?: string;
    generatedAt: Date;
    period: string;
    size: string;
    format: "PDF" | "Excel";
    status: "completed" | "generating" | "failed";
    description?: string;
    monthlyData: IMonthlyDataEntry[];
    reportRows: IReportRow[];
    fileUrl?: string;
    filePublicId?: string;
    fileResourceType: string;
    fileMimeType: string;
    fileName?: string;
    downloadCount: number;
    lastDownloadedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const monthlyDataEntrySchema = new Schema<IMonthlyDataEntry>(
    {
        month: { type: String, trim: true, maxlength: 20, required: true },
        metric: { type: String, trim: true, maxlength: 120, required: true },
        value: { type: String, trim: true, maxlength: 120, required: true },
    },
    { _id: false }
);

const reportRowSchema = new Schema<IReportRow>(
    {
        label: { type: String, trim: true, maxlength: 120, required: true },
        value: { type: String, trim: true, maxlength: 500, required: true },
    },
    { _id: false }
);

const reportSchema = new Schema<IReport>(
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
        reportNumber: {
            type: Number,
            required: true,
        },
        reportCode: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 220,
        },
        department: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
            default: "General",
            index: true,
        },
        departmentId: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            default: null,
            index: true,
        },
        category: {
            type: String,
            enum: ["Attendance", "Employee", "Financial", "Task", "Ticket", "Other"],
            default: "Other",
            required: true,
            index: true,
        },
        dataWindow: {
            type: String,
            enum: ["Monthly", "Quarterly", "Annual", "Custom"],
            default: "Monthly",
            required: true,
            index: true,
        },
        reportMonth: {
            type: String,
            trim: true,
            maxlength: 20,
            default: "",
            index: true,
        },
        sourceType: {
            type: String,
            enum: ["employee-profile", "attendance-summary", "department-roster", "custom"],
            default: "custom",
            index: true,
        },
        sourceRef: {
            type: String,
            trim: true,
            maxlength: 120,
            default: "",
            index: true,
        },
        generatedBy: {
            type: String,
            required: true,
            trim: true,
            maxlength: 140,
        },
        generatedByUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        generatedByEmployeeId: {
            type: String,
            default: "",
            trim: true,
            maxlength: 120,
            index: true,
        },
        generatedAt: {
            type: Date,
            required: true,
            index: true,
        },
        period: {
            type: String,
            required: true,
            trim: true,
            maxlength: 60,
        },
        size: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },
        format: {
            type: String,
            enum: ["PDF", "Excel"],
            default: "PDF",
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["completed", "generating", "failed"],
            default: "completed",
            required: true,
            index: true,
        },
        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 2000,
        },
        monthlyData: { type: [monthlyDataEntrySchema], default: [] },
        reportRows: { type: [reportRowSchema], default: [] },
        fileUrl: { type: String, default: "", trim: true },
        filePublicId: { type: String, default: "", trim: true },
        fileResourceType: { type: String, default: "raw", trim: true },
        fileMimeType: { type: String, default: "application/pdf", trim: true },
        fileName: { type: String, default: "", trim: true },
        downloadCount: { type: Number, default: 0, min: 0 },
        lastDownloadedAt: { type: Date, default: null },
    },
    {
        timestamps: true,
    }
);

reportSchema.index({ ownerId: 1, reportNumber: 1 }, { unique: true });
reportSchema.index({ workspaceId: 1, reportNumber: 1 }, { unique: true, sparse: true });
reportSchema.index({ workspaceId: 1, generatedAt: -1 });
reportSchema.index({ workspaceId: 1, generatedByUserId: 1, generatedAt: -1 });
reportSchema.index({ workspaceId: 1, department: 1, generatedAt: -1 });
reportSchema.index({ workspaceId: 1, category: 1, generatedAt: -1 });
reportSchema.index({ workspaceId: 1, dataWindow: 1, generatedAt: -1 });
reportSchema.index({ workspaceId: 1, reportMonth: 1, generatedAt: -1 });

export const Report = (mongoose.models.Report as mongoose.Model<IReport>) ||
    mongoose.model<IReport>("Report", reportSchema);
export default Report;
