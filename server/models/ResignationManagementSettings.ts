import mongoose, { Document, Schema } from "mongoose";

export interface IResignationReturnRequirement {
  key: string;
  label: string;
  description?: string;
  required: boolean;
  isActive: boolean;
}

export interface IResignationManagementSettings extends Document {
  workspaceId: mongoose.Types.ObjectId;
  returnRequirements: IResignationReturnRequirement[];
  instructions: string[];
  confirmationWarning: string;
  version: number;
  updatedByUserId?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const returnRequirementSchema = new Schema<IResignationReturnRequirement>(
  {
    key: { type: String, required: true, trim: true, maxlength: 80 },
    label: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    required: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const resignationManagementSettingsSchema = new Schema<IResignationManagementSettings>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      unique: true,
      index: true,
    },
    returnRequirements: {
      type: [returnRequirementSchema],
      default: [],
    },
    instructions: {
      type: [{ type: String, trim: true, maxlength: 500 }],
      default: [],
    },
    confirmationWarning: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: "",
    },
    version: {
      type: Number,
      min: 1,
      default: 1,
    },
    updatedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "HostUser",
      default: null,
    },
  },
  { timestamps: true },
);

export const ResignationManagementSettings =
  (mongoose.models.ExitManagementSettings as mongoose.Model<IResignationManagementSettings>) ||
  mongoose.model<IResignationManagementSettings>(
    "ExitManagementSettings",
    resignationManagementSettingsSchema,
  );

export default ResignationManagementSettings;

