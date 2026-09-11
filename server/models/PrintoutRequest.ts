import mongoose, { Document, Schema } from "mongoose";

// A printout request: any internal employee or tenant-company user submits a
// document to be printed; Administration/frontdesk fulfils it. Frontdesk can
// also log a request directly for someone who walks up to the desk
// (sourceType: "walk-in") without that person needing an account.
export interface IPrintoutRequest extends Document {
    workspaceId?: mongoose.Types.ObjectId | null;
    ownerId: mongoose.Types.ObjectId;
    requestNumber: number;
    requestCode: string;

    title: string;
    notes: string;
    copies: number;
    colorMode: "Color" | "Black & White";
    paperSize: string;
    doubleSided: boolean;
    priority: "Low" | "Medium" | "High";

    requestedByUserId?: mongoose.Types.ObjectId | null;
    requestedByName: string;
    requestedByType: "internal" | "tenant";
    requestedByDepartment: string;

    tenantCompanyId?: mongoose.Types.ObjectId | null;
    tenantCompanyName: string;

    sourceType: "self" | "walk-in";
    loggedByUserId?: mongoose.Types.ObjectId | null;
    loggedByName: string;

    // Pending (editable/cancellable by the requester) -> In Progress (frontdesk
    // accepted it) -> Completed (printed, ready for collection). Or Pending ->
    // Rejected. Cancelled only ever happens from Pending, by the requester —
    // once accepted the requester can no longer edit or cancel it.
    status: "Pending" | "In Progress" | "Completed" | "Rejected" | "Cancelled";
    cancelReason: string;
    acceptedByUserId?: mongoose.Types.ObjectId | null;
    acceptedByName: string;
    acceptedAt?: Date | null;
    rejectedByUserId?: mongoose.Types.ObjectId | null;
    rejectedByName: string;
    rejectedAt?: Date | null;
    rejectionReason: string;
    printedByUserId?: mongoose.Types.ObjectId | null;
    printedByName: string;
    completedAt?: Date | null;

    attachments: { id: string; url: string; name: string }[];
    createdAt?: Date;
    updatedAt?: Date;
}

const printoutRequestSchema = new Schema<IPrintoutRequest>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", default: null, index: true },
        ownerId: { type: Schema.Types.ObjectId, ref: "HostUser", required: true, index: true },
        requestNumber: { type: Number, required: true },
        requestCode: { type: String, required: true, trim: true, index: true },

        title: { type: String, required: true, trim: true, maxlength: 180 },
        notes: { type: String, default: "", trim: true, maxlength: 1000 },
        copies: { type: Number, default: 1, min: 1, max: 999 },
        colorMode: { type: String, enum: ["Color", "Black & White"], default: "Black & White" },
        paperSize: { type: String, default: "A4", trim: true, maxlength: 20 },
        doubleSided: { type: Boolean, default: false },
        priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },

        requestedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null, index: true },
        requestedByName: { type: String, required: true, trim: true, maxlength: 120 },
        requestedByType: { type: String, enum: ["internal", "tenant"], required: true },
        requestedByDepartment: { type: String, default: "", trim: true, maxlength: 120 },

        tenantCompanyId: { type: Schema.Types.ObjectId, ref: "TenantCompany", default: null, index: true },
        tenantCompanyName: { type: String, default: "", trim: true, maxlength: 180 },

        sourceType: { type: String, enum: ["self", "walk-in"], default: "self" },
        loggedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
        loggedByName: { type: String, default: "", trim: true, maxlength: 120 },

        status: {
            type: String,
            enum: ["Pending", "In Progress", "Completed", "Rejected", "Cancelled"],
            default: "Pending",
            index: true,
        },
        cancelReason: { type: String, default: "", trim: true, maxlength: 500 },
        acceptedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
        acceptedByName: { type: String, default: "", trim: true, maxlength: 120 },
        acceptedAt: { type: Date, default: null },
        rejectedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
        rejectedByName: { type: String, default: "", trim: true, maxlength: 120 },
        rejectedAt: { type: Date, default: null },
        rejectionReason: { type: String, default: "", trim: true, maxlength: 500 },
        printedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
        printedByName: { type: String, default: "", trim: true, maxlength: 120 },
        completedAt: { type: Date, default: null },

        attachments: {
            type: [
                {
                    _id: false,
                    id: { type: String, default: "" },
                    url: { type: String, default: "" },
                    name: { type: String, default: "" },
                },
            ],
            default: [],
        },
    },
    { timestamps: true }
);

printoutRequestSchema.index({ ownerId: 1, requestNumber: 1 }, { unique: true });
printoutRequestSchema.index({ workspaceId: 1, requestNumber: 1 }, { unique: true, sparse: true });
printoutRequestSchema.index({ workspaceId: 1, createdAt: -1 });
printoutRequestSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
printoutRequestSchema.index({ workspaceId: 1, tenantCompanyId: 1, createdAt: -1 });
printoutRequestSchema.index({ workspaceId: 1, requestedByUserId: 1, createdAt: -1 });

export const PrintoutRequest =
    (mongoose.models.PrintoutRequest as mongoose.Model<IPrintoutRequest>) ||
    mongoose.model<IPrintoutRequest>("PrintoutRequest", printoutRequestSchema);
