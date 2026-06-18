import mongoose, { Document, Schema } from "mongoose";

export interface IClient extends Document {
    workspaceId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    clientCode: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    source: string;
    sourceVisitorId?: mongoose.Types.ObjectId | null;
    lastBookingId?: mongoose.Types.ObjectId | null;
    lastBookingAt?: Date | null;
    bookingCount: number;
    totalBookedAmount: number;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const clientSchema = new Schema<IClient>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            required: true,
            index: true,
        },
        clientCode: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 140,
            index: true,
        },
        email: {
            type: String,
            default: "",
            trim: true,
            lowercase: true,
            maxlength: 160,
            index: true,
        },
        phone: {
            type: String,
            default: "",
            trim: true,
            maxlength: 40,
            index: true,
        },
        company: {
            type: String,
            default: "",
            trim: true,
            maxlength: 160,
            index: true,
        },
        source: {
            type: String,
            default: "booking",
            trim: true,
            maxlength: 60,
            index: true,
        },
        sourceVisitorId: {
            type: Schema.Types.ObjectId,
            ref: "VisitorLog",
            default: null,
            index: true,
        },
        lastBookingId: {
            type: Schema.Types.ObjectId,
            ref: "MeetingRoomBooking",
            default: null,
            index: true,
        },
        lastBookingAt: {
            type: Date,
            default: null,
            index: true,
        },
        bookingCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalBookedAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        notes: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000,
        },
    },
    {
        timestamps: true,
    }
);

clientSchema.index({ workspaceId: 1, clientCode: 1 }, { unique: true });
clientSchema.index(
    { workspaceId: 1, email: 1 },
    {
        unique: true,
        partialFilterExpression: {
            email: { $type: "string", $ne: "" },
        },
    }
);
clientSchema.index({ workspaceId: 1, phone: 1 });
clientSchema.index({ workspaceId: 1, name: 1, createdAt: -1 });

export const Client = (mongoose.models.Client as mongoose.Model<IClient>) ||
    mongoose.model<IClient>("Client", clientSchema);
export default Client;
