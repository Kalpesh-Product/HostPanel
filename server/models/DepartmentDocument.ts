import mongoose, { Document, Schema } from "mongoose";

export interface IDepartmentDocument extends Document {
    workspaceId: mongoose.Types.ObjectId;
    departmentId?: mongoose.Types.ObjectId;
    // Other departments this doc is shared/assigned to, beyond its owning
    // departmentId (e.g. Finance sharing a billing SOP with Tech + Maintenance).
    assignedDepartmentIds: mongoose.Types.ObjectId[];
    // Specific WorkspaceMember _ids (across the owner dept + assigned depts)
    // granted employee-level visibility. Managers/owner/super_admin of a
    // stakeholder department always see the doc regardless of this list —
    // it only gates plain-employee visibility.
    visibleEmployeeIds: mongoose.Types.ObjectId[];
    scope: "department" | "company";
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
            index: true,
        },
        assignedDepartmentIds: {
            type: [{ type: Schema.Types.ObjectId, ref: "Department" }],
            default: [],
            index: true,
        },
        visibleEmployeeIds: {
            type: [{ type: Schema.Types.ObjectId, ref: "WorkspaceMember" }],
            default: [],
        },
        // "department" documents (the original behaviour) require departmentId and
        // are scoped to one department's manager. "company" documents are
        // workspace-wide (e.g. Company Management's SOPs/Policies, surfaced on
        // every member's Company Profile page) and have no departmentId.
        scope: {
            type: String,
            enum: ["department", "company"],
            default: "department",
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
departmentDocumentSchema.index({ workspaceId: 1, scope: 1, docType: 1, isActive: 1 });

export const DepartmentDocument = (mongoose.models.DepartmentDocument as mongoose.Model<IDepartmentDocument>) ||
    mongoose.model<IDepartmentDocument>("DepartmentDocument", departmentDocumentSchema);
export default DepartmentDocument;
