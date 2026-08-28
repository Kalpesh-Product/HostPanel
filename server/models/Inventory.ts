import mongoose, { Document, Schema } from "mongoose";

export interface IInventoryLedger {
    _id?: mongoose.Types.ObjectId;
    type?: "Initial" | "Purchase" | "Consumption" | "Allocation" | "Transfer Out" | "Transfer In" | "Return" | "Maintenance" | "Adjustment";
    dateLabel: string;
    date?: Date;
    qty: number;
    unitPrice?: number;
    source?: string;
    target: string;
    action: string;
    addedByUserId?: mongoose.Types.ObjectId | null;
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
    status?: "active" | "maintenance" | "retired";
    departmentId?: mongoose.Types.ObjectId | null;
    departmentName?: string;
    location?: string;
    unit?: string;
    unitPrice?: number;
    totalValue?: number;
    totalQuantity: number;
    availableQuantity: number;
    addedByRole?: string;
    addedByUserId?: mongoose.Types.ObjectId | null;
    ledger: IInventoryLedger[];
    createdAt?: Date;
    updatedAt?: Date;
}

const inventoryLedgerSchema = new Schema<IInventoryLedger>(
    {
        type: {
            type: String,
            enum: ["Initial", "Purchase", "Consumption", "Allocation", "Transfer Out", "Transfer In", "Return", "Maintenance", "Adjustment"],
            default: "Adjustment",
        },
        dateLabel: { type: String, default: "Today", trim: true, maxlength: 60 },
        date: { type: Date, default: Date.now },
        qty: { type: Number, required: true, min: 0 },
        unitPrice: { type: Number, default: 0, min: 0 },
        source: { type: String, default: "", trim: true, maxlength: 120 },
        target: { type: String, required: true, trim: true, maxlength: 120 },
        action: { type: String, required: true, trim: true, maxlength: 180 },
        addedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
    },
    { timestamps: true }
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
        status: {
            type: String,
            enum: ["active", "maintenance", "retired"],
            default: "active",
            trim: true,
        },
        departmentId: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            default: null,
            index: true,
        },
        departmentName: {
            type: String,
            default: "",
            trim: true,
        },
        location: {
            type: String,
            default: "",
            trim: true,
            maxlength: 120,
        },
        unit: {
            type: String,
            default: "",
            trim: true,
            maxlength: 40,
        },
        unitPrice: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalValue: {
            type: Number,
            default: 0,
            min: 0,
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
        addedByRole: {
            type: String,
            default: "",
            trim: true,
            index: true,
        },
        addedByUserId: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
            index: true,
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
