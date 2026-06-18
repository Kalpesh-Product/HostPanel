import mongoose, { Document, Schema } from "mongoose";

export interface ITicketIssueCatalog extends Document {
    workspaceId: mongoose.Types.ObjectId;
    department: string;
    departmentId?: mongoose.Types.ObjectId | null;
    departmentKey: string;
    title: string;
    normalizedTitle: string;
    description?: string;
    keywords: string[];
    usageCount: number;
    lastUsedAt?: Date | null;
    createdByUserId?: mongoose.Types.ObjectId | null;
    source: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const ticketIssueCatalogSchema = new Schema<ITicketIssueCatalog>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
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
        departmentKey: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 180,
        },
        normalizedTitle: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 3000,
        },
        keywords: {
            type: [String],
            default: [],
        },
        usageCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        lastUsedAt: {
            type: Date,
            default: null,
            index: true,
        },
        createdByUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
        source: {
            type: String,
            default: "seed",
            trim: true,
            maxlength: 40,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

ticketIssueCatalogSchema.index(
    { workspaceId: 1, departmentKey: 1, normalizedTitle: 1 },
    { unique: true }
);
ticketIssueCatalogSchema.index({ workspaceId: 1, departmentKey: 1, lastUsedAt: -1 });
ticketIssueCatalogSchema.index({ workspaceId: 1, departmentKey: 1, usageCount: -1 });

export const TicketIssueCatalog = (mongoose.models.TicketIssueCatalog as mongoose.Model<ITicketIssueCatalog>) ||
    mongoose.model<ITicketIssueCatalog>("TicketIssueCatalog", ticketIssueCatalogSchema);
export default TicketIssueCatalog;
