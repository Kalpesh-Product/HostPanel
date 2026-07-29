import mongoose, { Document, Schema } from "mongoose";

export interface IAssetRequest extends Document {
    workspaceId: mongoose.Types.ObjectId;
    requestNumber: number;
    requestCode: string;
    requestedByUserId: mongoose.Types.ObjectId;
    requestingDepartmentId: mongoose.Types.ObjectId;
    owningDepartmentId: mongoose.Types.ObjectId;
    assetName: string;
    category: string;
    quantity: number;
    employeeName: string;
    purpose: string;
    neededBy?: Date | null;
    priority: "Low" | "Medium" | "High";
    status: "Pending" | "Approved" | "Rejected" | "Fulfilled" | "Cancelled";
    reviewedByUserId?: mongoose.Types.ObjectId | null;
    reviewNote: string;
    fulfilledByUserId?: mongoose.Types.ObjectId | null;
    fulfilledAssetId?: mongoose.Types.ObjectId | null;
    fulfilledAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const assetRequestSchema = new Schema<IAssetRequest>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
        requestNumber: { type: Number, required: true },
        requestCode: { type: String, required: true, trim: true, uppercase: true, index: true },
        requestedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", required: true, index: true },
        requestingDepartmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true, index: true },
        owningDepartmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true, index: true },
        assetName: { type: String, required: true, trim: true, maxlength: 180 },
        category: { type: String, default: "Hardware", trim: true, maxlength: 120, index: true },
        quantity: { type: Number, required: true, min: 1 },
        employeeName: { type: String, default: "", trim: true, maxlength: 120 },
        purpose: { type: String, required: true, trim: true, maxlength: 2000 },
        neededBy: { type: Date, default: null },
        priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium", index: true },
        status: { type: String, enum: ["Pending", "Approved", "Rejected", "Fulfilled", "Cancelled"], default: "Pending", index: true },
        reviewedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
        reviewNote: { type: String, default: "", trim: true, maxlength: 1000 },
        fulfilledByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
        fulfilledAssetId: { type: Schema.Types.ObjectId, ref: "Asset", default: null },
        fulfilledAt: { type: Date, default: null },
    },
    { timestamps: true }
);

assetRequestSchema.index({ workspaceId: 1, requestNumber: 1 }, { unique: true });
assetRequestSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
assetRequestSchema.index({ workspaceId: 1, requestingDepartmentId: 1, createdAt: -1 });
assetRequestSchema.index({ workspaceId: 1, owningDepartmentId: 1, createdAt: -1 });

export const AssetRequest = (mongoose.models.AssetRequest as mongoose.Model<IAssetRequest>) ||
    mongoose.model<IAssetRequest>("AssetRequest", assetRequestSchema);