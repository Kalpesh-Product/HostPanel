import mongoose, { Document, Schema } from "mongoose";

export interface IHoliday extends Document {
    workspaceId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    time?: string;
    location?: string;
    date: Date;
    dateKey: string;
    year: number;
    type: "public" | "company";
    entryKind: "holiday" | "event";
    source: "manual" | "public_api";
    externalId?: string;
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
        time: {
            type: String,
            default: "",
            trim: true,
            maxlength: 5,
        },
        location: {
            type: String,
            default: "",
            trim: true,
            maxlength: 240,
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
        entryKind: {
            type: String,
            enum: ["holiday", "event"],
            default: "holiday",
            index: true,
        },
        source: {
            type: String,
            enum: ["manual", "public_api"],
            default: "manual",
        },
        externalId: {
            type: String,
            default: "",
            trim: true,
            maxlength: 240,
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

holidaySchema.index({ workspaceId: 1, dateKey: 1, entryKind: 1, name: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
holidaySchema.index({ workspaceId: 1, year: 1 });

export const Holiday = (mongoose.models.Holiday as mongoose.Model<IHoliday>) ||
    mongoose.model<IHoliday>("Holiday", holidaySchema);
export default Holiday;

export async function migrateHolidayEntryIndexes(): Promise<void> {
    const collection = Holiday.collection;
    const indexes = await collection.indexes();
    const restrictiveIndexes = indexes.filter((index: any) =>
        index.unique && index.key?.workspaceId === 1 && index.key?.dateKey === 1 && index.key?.name === undefined,
    );
    for (const index of restrictiveIndexes) {
        if (index.name) await collection.dropIndex(index.name);
    }
    await collection.updateMany({ entryKind: { $exists: false } }, { $set: { entryKind: "holiday", source: "manual" } });
    await collection.createIndex(
        { workspaceId: 1, dateKey: 1, entryKind: 1, name: 1 },
        { unique: true, partialFilterExpression: { isActive: true }, name: "workspaceId_1_dateKey_1_entryKind_1_name_1" },
    );
}