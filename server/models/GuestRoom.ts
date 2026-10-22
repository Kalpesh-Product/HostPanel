import mongoose, { Schema, Document } from "mongoose";

export interface IGuestRoom extends Document {
    workspaceId: mongoose.Types.ObjectId;
    name: string;
    type: "Room" | "Dorm";
    capacity: number;
    pricePerNight: number;
    location: string;
    floor: string;
    wing: string;
    description: string;
    amenities: string[];
    status: "Active" | "Under Maintenance" | "Disabled";
    isActive: boolean;
    sortOrder: number;
    createdBy?: mongoose.Types.ObjectId | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const guestRoomSchema = new Schema<IGuestRoom>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        name: { type: String, required: true, trim: true, maxlength: 120 },
        type: { type: String, required: true, enum: ["Room", "Dorm"], index: true },
        capacity: { type: Number, required: true, min: 1, default: 1 },
        pricePerNight: { type: Number, required: true, min: 0, default: 0 },
        location: { type: String, trim: true, default: "", maxlength: 120 },
        floor: { type: String, trim: true, default: "", maxlength: 60 },
        wing: { type: String, trim: true, default: "", maxlength: 10 },
        description: { type: String, trim: true, default: "", maxlength: 500 },
        amenities: { type: [String], default: [] },
        status: {
            type: String,
            default: "Active",
            enum: ["Active", "Under Maintenance", "Disabled"],
            index: true,
        },
        isActive: { type: Boolean, default: true, index: true },
        sortOrder: { type: Number, default: 0 },
        createdBy: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    },
    { timestamps: true }
);

guestRoomSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export const GuestRoom =
    (mongoose.models.GuestRoom as mongoose.Model<IGuestRoom>) ||
    mongoose.model<IGuestRoom>("GuestRoom", guestRoomSchema);
