import mongoose, { Document, Schema } from "mongoose";

export interface IDepartmentDocument extends Document {
    workspaceId: mongoose.Types.ObjectId;
    departmentId: mongoose.Types.ObjectId;
    docType: "sop" | "policy";
    name: string;
    fileUrl: string;
    filePublicId: string;
    isActive: boolean;
    uploadedBy: mongoose.Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

const departmentDocumentSchema = new Schema<IDepartmentDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        departmentId: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            required: true,
            index: true,
        },
        docType: {
            type: String,
            enum: ["sop", "policy"],
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160,
        },
        fileUrl: {
            type: String,
            required: true,
        },
        filePublicId: {
            type: String,
            default: "",
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            required: true,
        },
    },
    { timestamps: true }
);

departmentDocumentSchema.index({ workspaceId: 1, departmentId: 1, docType: 1, isActive: 1 });

export const DepartmentDocument = (mongoose.models.DepartmentDocument as mongoose.Model<IDepartmentDocument>) ||
    mongoose.model<IDepartmentDocument>("DepartmentDocument", departmentDocumentSchema);
export default DepartmentDocument;
