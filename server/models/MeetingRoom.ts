import mongoose, { Schema, Document } from "mongoose";

export interface IMeetingRoom extends Document {
    workspaceId: mongoose.Types.ObjectId;
    name: string;
    capacity: number;
    type: "Desk" | "Meeting Room" | "Conference Room" | "Cabin" | "Other";
    floor?: string;
    wing?: string;
    location?: string;
    description?: string;
    amenities: string[];
    images: Array<{
        url: string;
        publicId?: string;
        fileName?: string;
    }>;
    creditsPerHour: number;
    maxBookingDurationHours: number;
    status: "Active" | "Under Maintenance" | "Disabled";
    isActive: boolean;
    sortOrder: number;
}

const meetingRoomSchema = new Schema<IMeetingRoom>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        capacity: {
            type: Number,
            required: true,
            min: 1,
        },
        type: {
            type: String,
            enum: ["Desk", "Meeting Room", "Conference Room", "Cabin", "Other"],
            default: "Meeting Room",
        },
        floor: {
            type: String,
            trim: true,
            maxlength: 60,
        },
        wing: {
            type: String,
            trim: true,
            maxlength: 60,
        },
        location: {
            type: String,
            trim: true,
            maxlength: 200,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        amenities: {
            type: [String],
            default: [],
        },
        images: [
            {
                url: { type: String, required: true },
                publicId: String,
                fileName: String,
            },
        ],
        creditsPerHour: {
            type: Number,
            default: 1,
            min: 0,
        },
        maxBookingDurationHours: {
            type: Number,
            default: 8,
            min: 1,
        },
        status: {
            type: String,
            enum: ["Active", "Under Maintenance", "Disabled"],
            default: "Active",
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
meetingRoomSchema.index({ workspaceId: 1, name: 1 }, { unique: true });
meetingRoomSchema.index({ workspaceId: 1, status: 1, isActive: 1 });
meetingRoomSchema.index({ workspaceId: 1, sortOrder: 1 });

export const MeetingRoom =
    mongoose.models.MeetingRoom || mongoose.model<IMeetingRoom>("MeetingRoom", meetingRoomSchema);