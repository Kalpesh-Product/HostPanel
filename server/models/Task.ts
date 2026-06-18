import mongoose, { Document, Schema } from "mongoose";

export interface ITaskComment {
    author: string;
    text: string;
    timeLabel: string;
}

export interface ITaskAttachment {
    name: string;
    size: string;
    url: string;
    publicId: string;
    mimeType: string;
}

export interface ITask extends Document {
    workspaceId?: mongoose.Types.ObjectId | null;
    ownerId: mongoose.Types.ObjectId;
    taskNumber: number;
    taskCode: string;
    type: "Standard" | "Approval";
    title: string;
    description: string;
    department: string;
    departmentId?: mongoose.Types.ObjectId | null;
    raisedBy: string;
    raisedByUserId?: mongoose.Types.ObjectId | null;
    raisedByDept: string;
    raisedByDeptId?: mongoose.Types.ObjectId | null;
    assignee: string;
    assigneeUserId?: mongoose.Types.ObjectId | null;
    acceptedBy?: string;
    acceptedByUserId?: mongoose.Types.ObjectId | null;
    acceptedAt?: Date | null;
    startedAt?: Date | null;
    completedAt?: Date | null;
    completionNote?: string;
    priority: "Low" | "Medium" | "High";
    status: "Pending" | "In Progress" | "Completed" | "Approved" | "Rejected";
    progress: number;
    dueDate: Date;
    attachments: ITaskAttachment[];
    comments: ITaskComment[];
    createdAt?: Date;
    updatedAt?: Date;
}

const taskCommentSchema = new Schema<ITaskComment>(
    {
        author: { type: String, required: true, trim: true },
        text: { type: String, required: true, trim: true },
        timeLabel: { type: String, default: "Just now", trim: true },
    },
    { _id: false, timestamps: true }
);

const taskAttachmentSchema = new Schema<ITaskAttachment>(
    {
        name: { type: String, required: true, trim: true },
        size: { type: String, default: "", trim: true },
        url: { type: String, default: "", trim: true },
        publicId: { type: String, default: "", trim: true },
        mimeType: { type: String, default: "", trim: true },
    },
    { _id: false }
);

const taskSchema = new Schema<ITask>(
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
        taskNumber: {
            type: Number,
            required: true,
        },
        taskCode: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["Standard", "Approval"],
            default: "Standard",
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 180,
        },
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
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
        raisedBy: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        raisedByUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        raisedByDept: {
            type: String,
            default: "Executive",
            trim: true,
            maxlength: 80,
        },
        raisedByDeptId: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            default: null,
            index: true,
        },
        assignee: {
            type: String,
            default: "Unassigned",
            trim: true,
            maxlength: 120,
        },
        assigneeUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        acceptedBy: {
            type: String,
            default: "",
            trim: true,
            maxlength: 120,
        },
        acceptedByUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        acceptedAt: { type: Date, default: null },
        startedAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
        completionNote: { type: String, default: "", trim: true, maxlength: 2000 },
        priority: {
            type: String,
            enum: ["Low", "Medium", "High"],
            default: "Medium",
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["Pending", "In Progress", "Completed", "Approved", "Rejected"],
            default: "Pending",
            required: true,
            index: true,
        },
        progress: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
        },
        dueDate: {
            type: Date,
            required: true,
            index: true,
        },
        attachments: { type: [taskAttachmentSchema], default: [] },
        comments: { type: [taskCommentSchema], default: [] },
    },
    {
        timestamps: true,
    }
);

taskSchema.index({ ownerId: 1, taskNumber: 1 }, { unique: true });
taskSchema.index({ workspaceId: 1, taskNumber: 1 }, { unique: true, sparse: true });
taskSchema.index({ ownerId: 1, createdAt: -1 });
taskSchema.index({ workspaceId: 1, createdAt: -1 });
taskSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
taskSchema.index({ workspaceId: 1, department: 1, status: 1, createdAt: -1 });
taskSchema.index({ workspaceId: 1, assigneeUserId: 1, createdAt: -1 });
taskSchema.index({ workspaceId: 1, raisedByUserId: 1, createdAt: -1 });

export const Task = (mongoose.models.Task as mongoose.Model<ITask>) ||
    mongoose.model<ITask>("Task", taskSchema);
export default Task;
