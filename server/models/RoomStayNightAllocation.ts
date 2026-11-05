import mongoose, { Schema } from "mongoose";

const roomStayNightAllocationSchema = new Schema({
    holdId: { type: String, required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: "WebsiteLead", default: null, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Resource", required: true },
    bedNumber: { type: Number, required: true },
    dateKey: { type: String, required: true },
    expiresAt: { type: Date, required: true },
}, { timestamps: true });

roomStayNightAllocationSchema.index({ roomId: 1, bedNumber: 1, dateKey: 1 }, { unique: true });
roomStayNightAllocationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RoomStayNightAllocation =
    mongoose.models.RoomStayNightAllocation ||
    mongoose.model("RoomStayNightAllocation", roomStayNightAllocationSchema);
