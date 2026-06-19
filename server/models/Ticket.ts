import mongoose, { Document, Schema } from "mongoose";

// 1. Define the TypeScript Interface for the Ticket Document
export interface ITicket extends Document {
    workspaceId?: mongoose.Types.ObjectId | null;
    ownerId: mongoose.Types.ObjectId;
    ticketNumber: number;
    ticketCode: string;
    title: string;
    description: string;
    tenantCompanyId?: mongoose.Types.ObjectId | null;
    tenantCompanyName: string;
    assetId?: mongoose.Types.ObjectId | null;
    assetCode: string;
    assetName: string;
    assetDepartmentId?: mongoose.Types.ObjectId | null;
    assetAssignedTo: string;
    dueDate?: Date | null;
    department?: string;
    departmentId?: mongoose.Types.ObjectId | null;
    submittedBy: string;
    submittedByDept?: string;
    requesterUserId?: mongoose.Types.ObjectId | null;
    submittedByDeptId?: mongoose.Types.ObjectId | null;
    assignedTo: string;
    assigneeUserId?: mongoose.Types.ObjectId | null;
    acceptedBy?: string | null;
    acceptedByUserId?: mongoose.Types.ObjectId | null;
    priority: "Low" | "Medium" | "High";
    status: "Open" | "In Progress" | "Resolved" | "Closed";
    resolutionNote: string;
    repairLogCode: string;
    repairLogAssignedTo: string;
    repairLogAssignedToUserId?: mongoose.Types.ObjectId | null;
    repairLogStatus: string;
    isFollowUp: boolean;
    followUpOfTicketId?: mongoose.Types.ObjectId | null;
    followUpOfTicketCode: string;
    followUpMessage: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// 2. Define the Mongoose Schema with the Interface
const ticketSchema = new Schema<ITicket>(
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
        ticketNumber: { type: Number, required: true },
        ticketCode: { type: String, required: true, trim: true, index: true },
        title: { type: String, required: true, trim: true, maxlength: 180 },
        description: { type: String, required: true, trim: true, maxlength: 3000 },
        tenantCompanyId: { type: Schema.Types.ObjectId, ref: "TenantCompany", default: null, index: true },
        tenantCompanyName: { type: String, default: "", trim: true, maxlength: 180 },
        assetId: { type: Schema.Types.ObjectId, ref: "Asset", default: null, index: true },
        assetCode: { type: String, default: "", trim: true, maxlength: 64 },
        assetName: { type: String, default: "", trim: true, maxlength: 180 },
        assetDepartmentId: { type: Schema.Types.ObjectId, ref: "Department", default: null, index: true },
        assetAssignedTo: { type: String, default: "", trim: true, maxlength: 120 },
        dueDate: { type: Date, default: null, index: true },
        department: { type: String, default: "", trim: true, maxlength: 120, index: true },
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", default: null, index: true },
        submittedBy: { type: String, required: true, trim: true, maxlength: 120 },
        submittedByDept: { type: String, default: "", trim: true, maxlength: 120, index: true },
        requesterUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
        submittedByDeptId: { type: Schema.Types.ObjectId, ref: "Department", default: null, index: true },
        assignedTo: { type: String, required: true, trim: true, maxlength: 120 },
        assigneeUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
        acceptedBy: { type: String, default: null, trim: true, maxlength: 120 },
        acceptedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
        priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium", required: true, index: true },
        status: { type: String, enum: ["Open", "In Progress", "Resolved", "Closed"], default: "Open", required: true, index: true },
        resolutionNote: { type: String, default: "", trim: true, maxlength: 2000 },
        repairLogCode: { type: String, default: "", trim: true, maxlength: 40, index: true },
        repairLogAssignedTo: { type: String, default: "", trim: true, maxlength: 120 },
        repairLogAssignedToUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
        repairLogStatus: { type: String, default: "", trim: true, maxlength: 40, index: true },
        isFollowUp: { type: Boolean, default: false, index: true },
        followUpOfTicketId: { type: Schema.Types.ObjectId, ref: "Ticket", default: null, index: true },
        followUpOfTicketCode: { type: String, default: "", trim: true, maxlength: 40 },
        followUpMessage: { type: String, default: "", trim: true, maxlength: 2000 },
    },
    {
        timestamps: true,
    }
);

// 3. Add Indexes
ticketSchema.index({ ownerId: 1, ticketNumber: 1 }, { unique: true });
ticketSchema.index({ workspaceId: 1, ticketNumber: 1 }, { unique: true, sparse: true });
ticketSchema.index({ ownerId: 1, createdAt: -1 });
ticketSchema.index({ workspaceId: 1, createdAt: -1 });
ticketSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
ticketSchema.index({ workspaceId: 1, departmentId: 1, status: 1, createdAt: -1 });
ticketSchema.index({ workspaceId: 1, assigneeUserId: 1, createdAt: -1 });
ticketSchema.index({ workspaceId: 1, requesterUserId: 1, createdAt: -1 });
ticketSchema.index({ workspaceId: 1, tenantCompanyId: 1, createdAt: -1 });

// 4. Export the Model (Cast to avoid TS errors if model already exists)
export const Ticket = (mongoose.models.Ticket as mongoose.Model<ITicket>) || mongoose.model<ITicket>("Ticket", ticketSchema);
