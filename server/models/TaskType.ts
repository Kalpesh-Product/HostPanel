import mongoose, { Document, Schema } from "mongoose";

export interface ITaskType extends Document {
    workspaceId: mongoose.Types.ObjectId;
    name: string;
    workflowKind: "progress" | "approval";
    isSystem: boolean;
    isActive: boolean;
    createdByUserId?: mongoose.Types.ObjectId | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const taskTypeSchema = new Schema<ITaskType>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
        },
        workflowKind: {
            type: String,
            enum: ["progress", "approval"],
            default: "progress",
            required: true,
        },
        isSystem: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        createdByUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
        },
    },
    { timestamps: true }
);

// Case-insensitive uniqueness per workspace so "Standard" and "standard" can't coexist.
taskTypeSchema.index(
    { workspaceId: 1, name: 1 },
    { unique: true, collation: { locale: "en", strength: 2 } }
);

export const TaskType = (mongoose.models.TaskType as mongoose.Model<ITaskType>) ||
    mongoose.model<ITaskType>("TaskType", taskTypeSchema);
export default TaskType;
