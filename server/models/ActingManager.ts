import mongoose, { Schema, Document } from "mongoose";

export interface IActingManager extends Document {
  workspaceId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  assignedUser: mongoose.Types.ObjectId;
  note?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const actingManagerSchema = new Schema<IActingManager>(
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
    assignedUser: {
      type: Schema.Types.ObjectId,
      ref: "HostUser",
      required: true,
      index: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const ActingManager =
  (mongoose.models.ActingManager as mongoose.Model<IActingManager>) ||
  mongoose.model<IActingManager>("ActingManager", actingManagerSchema);

export default ActingManager;
