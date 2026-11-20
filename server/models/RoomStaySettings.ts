import mongoose, { Document, Schema } from "mongoose";

export interface IRoomStaySettings extends Document {
    workspaceId: mongoose.Types.ObjectId;
    standardCheckInTime: string;
    standardCheckOutTime: string;
}

const roomStaySettingsSchema = new Schema<IRoomStaySettings>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, unique: true, index: true },
        standardCheckInTime: { type: String, trim: true, default: "12:00" },
        standardCheckOutTime: { type: String, trim: true, default: "11:00" },
    },
    { timestamps: true }
);

export const RoomStaySettings =
    (mongoose.models.RoomStaySettings as mongoose.Model<IRoomStaySettings>) ||
    mongoose.model<IRoomStaySettings>("RoomStaySettings", roomStaySettingsSchema);
