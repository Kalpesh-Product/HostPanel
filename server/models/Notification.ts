import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
    workspaceId: mongoose.Types.ObjectId;
    recipientUserId: mongoose.Types.ObjectId;
    actorUserId?: mongoose.Types.ObjectId | null;
    type: string;
    category: "task" | "ticket" | "leave" | "meeting" | "system";
    title: string;
    description: string;
    entityType: string;
    entityId?: mongoose.Types.ObjectId | null;
    entityCode?: string;
    targetUrl?: string;
    data: Record<string, any>;
    priority: "low" | "normal" | "high";
    isActionRequired: boolean;
    dedupeKey?: string;
    scheduledFor?: Date | null;
    deliveredAt: Date;
    readAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        recipientUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            required: true,
            index: true,
        },
        actorUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        type: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
            index: true,
        },
        category: {
            type: String,
            enum: ["task", "ticket", "leave", "meeting", "system"],
            default: "system",
            required: true,
            index: true,
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
            maxlength: 1000,
        },
        entityType: {
            type: String,
            default: "",
            trim: true,
            maxlength: 80,
            index: true,
        },
        entityId: {
            type: Schema.Types.ObjectId,
            default: null,
            index: true,
        },
        entityCode: {
            type: String,
            default: "",
            trim: true,
            maxlength: 40,
            index: true,
        },
        targetUrl: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500,
        },
        data: {
            type: Schema.Types.Mixed,
            default: {},
        },
        priority: {
            type: String,
            enum: ["low", "normal", "high"],
            default: "normal",
            required: true,
            index: true,
        },
        isActionRequired: {
            type: Boolean,
            default: false,
            index: true,
        },
        dedupeKey: {
            type: String,
            default: undefined,
            trim: true,
            index: true,
        },
        scheduledFor: {
            type: Date,
            default: null,
            index: true,
        },
        deliveredAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        readAt: {
            type: Date,
            default: null,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

notificationSchema.index({ workspaceId: 1, recipientUserId: 1, createdAt: -1 });
notificationSchema.index({ workspaceId: 1, recipientUserId: 1, readAt: 1 });
notificationSchema.index(
    { workspaceId: 1, recipientUserId: 1, dedupeKey: 1 },
    { unique: true, sparse: true }
);

export const Notification = (mongoose.models.Notification as mongoose.Model<INotification>) ||
    mongoose.model<INotification>("Notification", notificationSchema);
export default Notification;
