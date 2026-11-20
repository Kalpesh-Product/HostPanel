import mongoose, { Schema, Document } from "mongoose";

export const CAFE_ORDER_STATUSES = [
    "Placed",
    "Preparing",
    "Ready",
    "Served",
    "Paid",
    "Cancelled",
] as const;

export const CAFE_OPEN_ORDER_STATUSES: CafeOrderStatus[] = ["Placed", "Preparing", "Ready", "Served"];

export type CafeOrderStatus = (typeof CAFE_ORDER_STATUSES)[number];

export interface ICafeOrderItem {
    menuItemId: mongoose.Types.ObjectId;
    name: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
}

export interface ICafeOrderRound {
    roundNumber: number;
    label: string;
    items: ICafeOrderItem[];
    status: "Draft" | "Sent" | "Served";
    sentToKitchenAt?: Date | null;
    servedAt?: Date | null;
}

export interface ICafeOrderVoidLogEntry {
    roundNumber: number;
    itemName: string;
    quantity: number;
    reason: string;
    voidedAt: Date;
}

export interface ICafeOrder extends Document {
    workspaceId: mongoose.Types.ObjectId;
    orderNumber: number;
    tableId?: mongoose.Types.ObjectId | null;
    customerName: string;
    tableLabel: string;
    notes: string;
    items: ICafeOrderItem[];
    rounds: ICafeOrderRound[];
    voidLog: ICafeOrderVoidLogEntry[];
    subtotal: number;
    taxPercent: number;
    taxAmount: number;
    discountType: "none" | "percentage" | "fixed";
    discountValue: number;
    discountAmount: number;
    total: number;
    status: CafeOrderStatus;
    billedAt?: Date | null;
    paidAt?: Date | null;
    waiterName: string;
    paymentMethod: string;
    cancelReason: string;
    createdBy?: mongoose.Types.ObjectId | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const cafeOrderItemSchema = new Schema<ICafeOrderItem>(
    {
        menuItemId: {
            type: Schema.Types.ObjectId,
            ref: "CafeMenuItem",
            required: true,
        },
        name: { type: String, required: true, trim: true, maxlength: 120 },
        unitPrice: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
        lineTotal: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const cafeOrderRoundSchema = new Schema<ICafeOrderRound>(
    {
        roundNumber: { type: Number, required: true, min: 1 },
        label: { type: String, trim: true, maxlength: 80, default: "" },
        items: { type: [cafeOrderItemSchema], required: true },
        status: { type: String, enum: ["Draft", "Sent", "Served"], default: "Sent" },
        sentToKitchenAt: { type: Date, default: Date.now },
        servedAt: { type: Date, default: null },
    },
    { _id: false },
);

const cafeOrderVoidLogSchema = new Schema<ICafeOrderVoidLogEntry>(
    {
        roundNumber: { type: Number, required: true, min: 1 },
        itemName: { type: String, required: true, trim: true, maxlength: 120 },
        quantity: { type: Number, required: true, min: 1 },
        reason: { type: String, required: true, trim: true, maxlength: 500 },
        voidedAt: { type: Date, default: Date.now },
    },
    { _id: false },
);

const cafeOrderSchema = new Schema<ICafeOrder>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        orderNumber: {
            type: Number,
            required: true,
            index: true,
        },
        tableId: {
            type: Schema.Types.ObjectId,
            ref: "CafeTable",
            default: null,
            index: true,
        },
        billedAt: { type: Date, default: null },
        paidAt: { type: Date, default: null },
        customerName: { type: String, trim: true, maxlength: 120, default: "" },
        tableLabel: { type: String, trim: true, maxlength: 60, default: "" },
        notes: { type: String, trim: true, maxlength: 500, default: "" },
        items: {
            type: [cafeOrderItemSchema],
            validate: [(value: unknown[]) => value.length > 0, "An order needs at least one item."],
        },
        rounds: { type: [cafeOrderRoundSchema], default: [] },
        voidLog: { type: [cafeOrderVoidLogSchema], default: [] },
        subtotal: { type: Number, required: true, min: 0 },
        taxPercent: { type: Number, required: true, min: 0, max: 100, default: 0 },
        taxAmount: { type: Number, required: true, min: 0, default: 0 },
        discountType: { type: String, enum: ["none", "percentage", "fixed"], default: "none" },
        discountValue: { type: Number, min: 0, default: 0 },
        discountAmount: { type: Number, min: 0, default: 0 },
        total: { type: Number, required: true, min: 0 },
        waiterName: { type: String, trim: true, maxlength: 160, default: "" },
        paymentMethod: { type: String, trim: true, maxlength: 40, default: "" },
        cancelReason: { type: String, trim: true, maxlength: 500, default: "" },
        status: {
            type: String,
            enum: CAFE_ORDER_STATUSES,
            default: "Placed",
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "HostUser",
            default: null,
        },
    },
    { timestamps: true }
);

cafeOrderSchema.index({ workspaceId: 1, orderNumber: 1 }, { unique: true });

export const CafeOrder =
    (mongoose.models.CafeOrder as mongoose.Model<ICafeOrder>) ||
    mongoose.model<ICafeOrder>("CafeOrder", cafeOrderSchema);
