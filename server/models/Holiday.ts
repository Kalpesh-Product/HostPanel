import mongoose, { Document, Schema } from "mongoose";

export interface IHoliday extends Document {
    workspaceId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    date: Date;
    dateKey: string;
    year: number;
    type: "public" | "company";
    recurring: boolean;
    isActive: boolean;
    createdBy?: mongoose.Types.ObjectId | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const holidaySchema = new Schema<IHoliday>(
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
            maxlength: 160,
        },
        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000,
        },
        date: {
            type: Date,
            required: true,
            index: true,
        },
        dateKey: {
            type: String,
            required: true,
            trim: true,
            maxlength: 10,
            index: true,
        },
        year: {
            type: Number,
            required: true,
            min: 2000,
            max: 2200,
            index: true,
        },
        type: {
            type: String,
            enum: ["public", "company"],
            default: "company",
            index: true,
        },
        recurring: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

holidaySchema.index({ workspaceId: 1, dateKey: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
holidaySchema.index({ workspaceId: 1, year: 1 });

export const Holiday = (mongoose.models.Holiday as mongoose.Model<IHoliday>) ||
    mongoose.model<IHoliday>("Holiday", holidaySchema);
export default Holiday;
