import mongoose, { Document, Schema } from "mongoose";

export interface IExitDocumentTemplate extends Document {
    workspaceId: mongoose.Types.ObjectId;
    label: string;
    normalizedLabel: string;
    description?: string;
    sortOrder: number;
    isActive: boolean;
    createdByUserId?: mongoose.Types.ObjectId | null;
    updatedByUserId?: mongoose.Types.ObjectId | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const exitDocumentTemplateSchema = new Schema<IExitDocumentTemplate>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        label: {
            type: String,
            required: true,
            trim: true,
            maxlength: 180,
        },
        normalizedLabel: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500,
        },
        sortOrder: {
            type: Number,
            default: 0,
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
            index: true,
        },
        updatedByUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

exitDocumentTemplateSchema.index({ workspaceId: 1, normalizedLabel: 1 }, { unique: true });

export const ExitDocumentTemplate = (mongoose.models.ExitDocumentTemplate as mongoose.Model<IExitDocumentTemplate>) ||
    mongoose.model<IExitDocumentTemplate>("ExitDocumentTemplate", exitDocumentTemplateSchema);
export default ExitDocumentTemplate;
