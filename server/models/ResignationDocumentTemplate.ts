import mongoose, { Document, Schema } from "mongoose";

export interface IResignationDocumentTemplate extends Document {
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

const resignationDocumentTemplateSchema = new Schema<IResignationDocumentTemplate>(
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

resignationDocumentTemplateSchema.index({ workspaceId: 1, normalizedLabel: 1 }, { unique: true });

export const ResignationDocumentTemplate = (mongoose.models.ExitDocumentTemplate as mongoose.Model<IResignationDocumentTemplate>) ||
    mongoose.model<IResignationDocumentTemplate>("ExitDocumentTemplate", resignationDocumentTemplateSchema);
export default ResignationDocumentTemplate;
