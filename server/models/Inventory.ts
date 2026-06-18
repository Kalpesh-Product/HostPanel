import mongoose, { Document, Schema } from "mongoose";

export interface IInventoryLedger {
    dateLabel: string;
    qty: number;
    target: string;
    action: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IInventory extends Document {
    workspaceId?: mongoose.Types.ObjectId | null;
    ownerId: mongoose.Types.ObjectId;
    inventoryNumber: number;
    inventoryCode: string;
    name: string;
    category: "Physical" | "Digital" | "Other" | "Office Supplies" | "Pantry" | "Facilities" | "Branding" | "Hardware" | "Safety Equipment";
    trackingType: "Consumable" | "Returnable Asset";
    departmentId?: mongoose.Types.ObjectId | null;
    totalQuantity: number;
    availableQuantity: number;
    ledger: IInventoryLedger[];
    createdAt?: Date;
    updatedAt?: Date;
}

const inventoryLedgerSchema = new Schema<IInventoryLedger>(
    {
        dateLabel: { type: String, default: "Today", trim: true, maxlength: 60 },
        qty: { type: Number, required: true, min: 1 },
        target: { type: String, required: true, trim: true, maxlength: 120 },
        action: { type: String, required: true, trim: true, maxlength: 180 },
    },
    { _id: false, timestamps: true }
);

const inventorySchema = new Schema<IInventory>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            default: null,
            index: true,
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            required: true,
            index: true,
        },
        inventoryNumber: {
            type: Number,
            required: true,
        },
        inventoryCode: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 180,
        },
        category: {
            type: String,
            enum: [
                "Physical",
                "Digital",
                "Other",
                "Office Supplies",
                "Pantry",
                "Facilities",
                "Branding",
                "Hardware",
                "Safety Equipment",
            ],
            default: "Physical",
            required: true,
            index: true,
        },
        trackingType: {
            type: String,
            enum: ["Consumable", "Returnable Asset"],
            default: "Consumable",
            required: true,
            index: true,
        },
        departmentId: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            default: null,
            index: true,
        },
        totalQuantity: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        availableQuantity: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        ledger: {
            type: [inventoryLedgerSchema],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

inventorySchema.index({ ownerId: 1, inventoryNumber: 1 }, { unique: true });
inventorySchema.index({ workspaceId: 1, inventoryNumber: 1 }, { unique: true, sparse: true });
inventorySchema.index({ workspaceId: 1, departmentId: 1, name: 1 });
inventorySchema.index({ workspaceId: 1, createdAt: -1 });
inventorySchema.index({ workspaceId: 1, departmentId: 1, createdAt: -1 });
inventorySchema.index({ workspaceId: 1, category: 1, createdAt: -1 });
inventorySchema.index({ workspaceId: 1, trackingType: 1, createdAt: -1 });

export const Inventory = (mongoose.models.Inventory as mongoose.Model<IInventory>) ||
    mongoose.model<IInventory>("Inventory", inventorySchema);
export default Inventory;
