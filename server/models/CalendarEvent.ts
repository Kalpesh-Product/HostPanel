// @ts-nocheck
import mongoose, { Schema } from "mongoose";

const calendarEventSchema = new Schema(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
        ownerId: { type: Schema.Types.ObjectId, ref: "HostUser", required: true },
        ownerName: { type: String, default: "" },
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: "" },
        date: { type: String, required: true },
        startTime: { type: String, default: "" },
        endTime: { type: String, default: "" },
        invites: [
            {
                invitedUserId: { type: Schema.Types.ObjectId, ref: "HostUser" },
                invitedName: { type: String, required: true },
                invitedEmail: { type: String, lowercase: true, trim: true },
                status: {
                    type: String,
                    enum: ["pending", "accepted", "rejected"],
                    default: "pending",
                },
            },
        ],
        status: { type: String, enum: ["active", "cancelled"], default: "active" },
    },
    { timestamps: true },
);

calendarEventSchema.index({ workspaceId: 1, ownerId: 1, date: 1 });
calendarEventSchema.index({ workspaceId: 1, "invites.invitedUserId": 1 });

export const CalendarEvent =
    mongoose.models.CalendarEvent || mongoose.model("CalendarEvent", calendarEventSchema);
