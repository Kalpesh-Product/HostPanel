import mongoose, { Document, Schema } from "mongoose";

export interface ILeaveType extends Document {
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  requiresBalance: boolean;
  medicalCertificateAfterDays?: number | null;
  color?: string;
  sortOrder: number;
  createdBy?: mongoose.Types.ObjectId | null;
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const leaveTypeSchema = new Schema<ILeaveType>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    code: { type: String, required: true, trim: true, lowercase: true, maxlength: 100 },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true, index: true },
    requiresBalance: { type: Boolean, default: true },
    medicalCertificateAfterDays: { type: Number, default: null, min: 0.5 },
    color: { type: String, default: "#2563EB", trim: true, maxlength: 20 },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
  },
  { timestamps: true },
);

leaveTypeSchema.index({ workspaceId: 1, code: 1 }, { unique: true });
leaveTypeSchema.index({ workspaceId: 1, isActive: 1, sortOrder: 1, name: 1 });

export const LeaveType = (mongoose.models.LeaveType as mongoose.Model<ILeaveType>) ||
  mongoose.model<ILeaveType>("LeaveType", leaveTypeSchema);
export default LeaveType;