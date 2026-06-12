import mongoose, { Schema, Document } from "mongoose";

export interface ILocationMapping {
    floor: string;
    wing: string;
    locationCode: string;
    label: string;
    seatType: "open" | "cabin" | "mixed";
    seatsAllocated: number;
}

export interface IPlansPricing extends Document {
    workspaceId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    packageNumber: number;
    packageCode: string;
    category: "Membership" | "Tenant";
    name: string;
    creditsIncluded: number;
    price: number;
    durationMonths: number;
    seatsIncluded: number;
    totalSeats: number;
    openDesks: number;
    cabinDesks: number;
    ratePerOpenDesk: number;
    ratePerCabinDesk: number;
    creditsPerSeat: number;
    monthlyCredits: number;
    locationMappings: ILocationMapping[];
    assignedTenantCompanyId?: mongoose.Types.ObjectId | null;
    assignedTenantCompanyName: string;
    assignedAt: Date | null;
    isCustom: boolean;
    sourceTenantCompanyId?: mongoose.Types.ObjectId | null;
    source: string;
    description: string;
    features: string[];
    isRecommended: boolean;
    status: "Active" | "Disabled";
    sortOrder: number;
    createdAt?: Date;
    updatedAt?: Date;
}

const locationMappingSchema = new Schema<ILocationMapping>(
    {
        floor: { type: String, default: "", trim: true, maxlength: 20 },
        wing: { type: String, default: "", trim: true, maxlength: 20 },
        locationCode: { type: String, default: "", trim: true, maxlength: 20, index: true },
        label: { type: String, default: "", trim: true, maxlength: 40 },
        seatType: { type: String, default: "mixed", trim: true, enum: ["open", "cabin", "mixed"] },
        seatsAllocated: { type: Number, default: 0, min: 0 },
    },
    { _id: false }
);

const plansPricingSchema = new Schema<IPlansPricing>(
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
        packageNumber: { type: Number, required: true, index: true },
        packageCode: { type: String, required: true, trim: true, index: true },
        category: {
            type: String,
            required: true,
            trim: true,
            enum: ["Membership", "Tenant"],
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160,
            index: true,
        },
        creditsIncluded: { type: Number, required: true, min: 0 },
        price: { type: Number, required: true, min: 0 },
        durationMonths: { type: Number, required: true, min: 1 },
        seatsIncluded: { type: Number, default: 0, min: 0 },
        totalSeats: { type: Number, default: 0, min: 0 },
        openDesks: { type: Number, default: 0, min: 0 },
        cabinDesks: { type: Number, default: 0, min: 0 },
        ratePerOpenDesk: { type: Number, default: 0, min: 0 },
        ratePerCabinDesk: { type: Number, default: 0, min: 0 },
        creditsPerSeat: { type: Number, default: 0, min: 0 },
        monthlyCredits: { type: Number, default: 0, min: 0 },
        locationMappings: { type: [locationMappingSchema], default: [] },
        assignedTenantCompanyId: {
            type: Schema.Types.ObjectId,
            ref: "TenantCompany",
            default: null,
            index: true,
        },
        assignedTenantCompanyName: { type: String, default: "", trim: true, maxlength: 160 },
        assignedAt: { type: Date, default: null },
        isCustom: { type: Boolean, default: false, index: true },
        sourceTenantCompanyId: {
            type: Schema.Types.ObjectId,
            ref: "TenantCompany",
            default: null,
            index: true,
        },
        source: { type: String, default: "standard", trim: true, maxlength: 40, index: true },
        description: { type: String, default: "", trim: true, maxlength: 1000 },
        features: { type: [String], default: [] },
        isRecommended: { type: Boolean, default: false },
        status: {
            type: String,
            required: true,
            trim: true,
            enum: ["Active", "Disabled"],
            index: true,
        },
        sortOrder: { type: Number, default: 0, index: true },
    },
    { timestamps: true }
);

plansPricingSchema.index({ workspaceId: 1, packageNumber: 1 }, { unique: true });
plansPricingSchema.index({ workspaceId: 1, packageCode: 1 }, { unique: true });
plansPricingSchema.index({ workspaceId: 1, category: 1, name: 1 }, { unique: true });

export const PlansPricing =
    (mongoose.models.PlansPricing as mongoose.Model<IPlansPricing>) ||
    mongoose.model<IPlansPricing>("PlansPricing", plansPricingSchema);
