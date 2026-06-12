import mongoose from "mongoose";
import { PlansPricing } from "../models/PlansPricing.js";

const TENANT_PACKAGE_MIN_DURATION_MONTHS = 3;

const tenantLocationCatalog = [
    { floor: "501", wing: "A", locationCode: "501A", label: "501 A" },
    { floor: "501", wing: "B", locationCode: "501B", label: "501 B" },
    { floor: "601", wing: "A", locationCode: "601A", label: "601 A" },
    { floor: "601", wing: "B", locationCode: "601B", label: "601 B" },
    { floor: "701", wing: "A", locationCode: "701A", label: "701 A" },
    { floor: "701", wing: "B", locationCode: "701B", label: "701 B" },
];

// ---- Validation ----

function validateCreateInput(input: any) {
    const errors: string[] = [];
    if (!input.name || typeof input.name !== "string" || input.name.trim().length < 2)
        errors.push("Package name must be at least 2 characters");
    if (input.name && input.name.length > 160) errors.push("Name must be at most 160 characters");
    if (input.category && !["Membership", "Tenant"].includes(input.category))
        errors.push("Category must be 'Membership' or 'Tenant'");
    if (input.creditsIncluded != null && (isNaN(Number(input.creditsIncluded)) || Number(input.creditsIncluded) < 0))
        errors.push("Credits must be a non-negative number");
    if (input.price != null && (isNaN(Number(input.price)) || Number(input.price) < 0))
        errors.push("Price must be a non-negative number");
    if (input.durationMonths != null && (isNaN(Number(input.durationMonths)) || Number(input.durationMonths) < 1))
        errors.push("Duration must be at least 1 month");
    if (input.durationMonths != null && Number(input.durationMonths) > 120)
        errors.push("Duration must be at most 120 months");
    if (input.description && input.description.length > 1000) errors.push("Description must be at most 1000 characters");
    if (input.status && !["Active", "Disabled"].includes(input.status))
        errors.push("Status must be 'Active' or 'Disabled'");
    if (input.category === "Tenant" && Number(input.durationMonths || 0) < TENANT_PACKAGE_MIN_DURATION_MONTHS)
        errors.push(`Tenant package duration must be at least ${TENANT_PACKAGE_MIN_DURATION_MONTHS} months`);
    return errors.length > 0 ? errors.join("; ") : null;
}

function validateUpdateInput(input: any) {
    const errors: string[] = [];
    if (Object.keys(input).length === 0) errors.push("At least one field is required to update");
    if (input.name != null && (typeof input.name !== "string" || input.name.trim().length < 2))
        errors.push("Package name must be at least 2 characters");
    if (input.name && input.name.length > 160) errors.push("Name must be at most 160 characters");
    if (input.category && !["Membership", "Tenant"].includes(input.category))
        errors.push("Category must be 'Membership' or 'Tenant'");
    if (input.creditsIncluded != null && (isNaN(Number(input.creditsIncluded)) || Number(input.creditsIncluded) < 0))
        errors.push("Credits must be a non-negative number");
    if (input.price != null && (isNaN(Number(input.price)) || Number(input.price) < 0))
        errors.push("Price must be a non-negative number");
    if (input.durationMonths != null && (isNaN(Number(input.durationMonths)) || Number(input.durationMonths) < 1))
        errors.push("Duration must be at least 1 month");
    if (input.durationMonths != null && Number(input.durationMonths) > 120)
        errors.push("Duration must be at most 120 months");
    if (input.description && input.description.length > 1000) errors.push("Description must be at most 1000 characters");
    if (input.status && !["Active", "Disabled"].includes(input.status))
        errors.push("Status must be 'Active' or 'Disabled'");
    if (input.category === "Tenant" && input.durationMonths != null && Number(input.durationMonths) < TENANT_PACKAGE_MIN_DURATION_MONTHS)
        errors.push(`Tenant package duration must be at least ${TENANT_PACKAGE_MIN_DURATION_MONTHS} months`);
    return errors.length > 0 ? errors.join("; ") : null;
}

// ---- Helpers ----

function normalizeText(value: any) {
    return String(value || "").trim();
}

function roundWholeNumber(value: any) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function normalizeLocationCode(value: any) {
    return normalizeText(value).toUpperCase().replace(/[\s_-]+/g, "");
}

function normalizeLocationLabel(value: any) {
    const normalized = normalizeText(value).replace(/[\s_-]+/g, " ").toUpperCase();
    if (!normalized) return "";
    const compact = normalized.replace(/\s+/g, "");
    const match = compact.match(/^(\d{3})([AB])$/);
    if (match) return `${match[1]} ${match[2]}`;
    return normalized;
}

function buildLocationMatchKeys(value: any) {
    const keys = new Set<string>();
    const floor = normalizeText(value.floor || "");
    const wing = normalizeText(value.wing || "").toUpperCase();
    const locationCode = normalizeLocationCode(value.locationCode || "");
    const label = normalizeLocationLabel(value.label || "");

    if (floor || wing) {
        const combined = normalizeLocationLabel(`${floor} ${wing}`);
        if (combined) keys.add(combined);
        const compact = normalizeLocationCode(`${floor}${wing}`);
        if (compact) keys.add(compact);
    }
    if (locationCode) keys.add(locationCode);
    if (label) keys.add(label);

    return Array.from(keys);
}

function parseLocationMappingEntry(entry: any): any {
    if (!entry) return null;

    if (typeof entry === "string") {
        const label = normalizeLocationLabel(entry);
        const compact = normalizeLocationCode(entry);
        const catalogMatch = tenantLocationCatalog.find(
            (loc) => loc.locationCode === compact || loc.label === label,
        );
        if (catalogMatch) return { ...catalogMatch, seatType: "mixed", seatsAllocated: 0 };
        if (!label) return null;
        return {
            floor: label.replace(/\s+[AB]$/, "").trim(),
            wing: label.slice(-1),
            locationCode: compact || label.replace(/\s+/g, ""),
            label,
            seatType: "mixed" as const,
            seatsAllocated: 0,
        };
    }

    if (typeof entry === "object") {
        const label = normalizeLocationLabel(entry.label || entry.locationCode || "");
        const locationCode = normalizeLocationCode(entry.locationCode || label);
        const catalogMatch = tenantLocationCatalog.find(
            (loc) => loc.locationCode === locationCode || loc.label === label,
        );
        if (catalogMatch) {
            return {
                ...catalogMatch,
                seatType: entry.seatType || "mixed",
                seatsAllocated: Math.max(0, Number(entry.seatsAllocated || 0)),
            };
        }
        if (!label && !locationCode) return null;
        return {
            floor: normalizeText(entry.floor || label.replace(/\s+[AB]$/, "")),
            wing: normalizeText(entry.wing || label.slice(-1)),
            locationCode,
            label: label || locationCode,
            seatType: entry.seatType || "mixed",
            seatsAllocated: Math.max(0, Number(entry.seatsAllocated || 0)),
        };
    }

    return null;
}

function normalizeTenantPackageLocationMappings(value: any) {
    const entries = Array.isArray(value) ? value : [];
    const normalized = entries.map((e: any) => parseLocationMappingEntry(e)).filter(Boolean);
    if (normalized.length > 0) return normalized;
    return tenantLocationCatalog.map((loc) => ({ ...loc, seatType: "mixed", seatsAllocated: 0 }));
}

function deriveSeatTotals(payload: any) {
    const openDesks = Number(payload.openDesks || 0);
    const cabinDesks = Number(payload.cabinDesks || 0);
    const breakdownSeats = openDesks + cabinDesks;
    const isTenant = String(payload.category || "").toLowerCase() === "tenant";
    const totalSeats = isTenant && breakdownSeats > 0 ? breakdownSeats : (Number(payload.totalSeats || 0) || breakdownSeats);
    return { openDesks, cabinDesks, totalSeats };
}

function deriveMonthlyCredits(payload: any) {
    const seats = deriveSeatTotals(payload);
    const creditsPerSeat = roundWholeNumber(payload.creditsPerSeat || 0);
    const monthlyCredits = seats.totalSeats > 0 && creditsPerSeat > 0
        ? roundWholeNumber(seats.totalSeats * creditsPerSeat)
        : roundWholeNumber(payload.monthlyCredits || 0);
    return { ...seats, creditsPerSeat, monthlyCredits };
}

function deriveTenantPackagePricing(payload: any, seats: { openDesks: number; cabinDesks: number }) {
    const durationMonths = Math.max(1, roundWholeNumber(payload.durationMonths || 1));
    const ratePerOpenDesk = roundWholeNumber(payload.ratePerOpenDesk || 0);
    const ratePerCabinDesk = roundWholeNumber(payload.ratePerCabinDesk || 0);
    const dailyRent = Math.max(0, (seats.openDesks * ratePerOpenDesk) + (seats.cabinDesks * ratePerCabinDesk));
    const monthlyRent = dailyRent * 30;
    const price = monthlyRent * durationMonths;
    return { ratePerOpenDesk, ratePerCabinDesk, dailyRent, monthlyRent, price };
}

function ensureTenantPackage(pkg: any, workspaceId: string) {
    if (!pkg || !pkg.workspaceId || pkg.workspaceId.toString() !== workspaceId.toString()) {
        const error: any = new Error("Package not found.");
        error.statusCode = 404;
        throw error;
    }
}

function isRateOnlyUpdate(input: any) {
    const keys = Object.keys(input || {});
    if (keys.length === 0) return false;
    const allowed = new Set(["ratePerOpenDesk", "ratePerCabinDesk"]);
    return keys.every((k) => allowed.has(k));
}

async function getNextPackageNumber(workspaceId: string) {
    const latest = await PlansPricing.findOne({ workspaceId: new mongoose.Types.ObjectId(workspaceId) })
        .sort({ packageNumber: -1, createdAt: -1 })
        .lean()
        .exec();
    return (latest?.packageNumber || 0) + 1;
}

function getDurationLabel(months: number) {
    const m = Number(months || 0);
    if (m === 1) return "1 Month";
    if (m === 6) return "6 Months";
    if (m === 12) return "1 Year";
    if (m === 24) return "2 Years";
    return `${m} Months`;
}

function formatDateLabel(value: any) {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        month: "short",
        day: "2-digit",
        year: "numeric",
    }).format(date);
}

function formatPackage(doc: any) {
    const pkg = doc?.toObject ? doc.toObject() : doc || {};
    const openDesks = Number(pkg.openDesks || 0);
    const cabinDesks = Number(pkg.cabinDesks || 0);
    const breakdownSeats = openDesks + cabinDesks;
    const totalSeats = breakdownSeats > 0 ? breakdownSeats : (Number(pkg.totalSeats || pkg.seatsIncluded || 0));
    const creditsPerSeat = roundWholeNumber(pkg.creditsPerSeat || 0);
    const monthlyCredits = Number(
        (pkg.monthlyCredits || pkg.creditsIncluded || 0) ||
        (totalSeats > 0 && creditsPerSeat > 0 ? roundWholeNumber(totalSeats * creditsPerSeat) : 0),
    );
    const ratePerOpenDesk = roundWholeNumber(pkg.ratePerOpenDesk || 0);
    const ratePerCabinDesk = roundWholeNumber(pkg.ratePerCabinDesk || 0);
    const dailyRateTotal = (openDesks * ratePerOpenDesk) + (cabinDesks * ratePerCabinDesk);
    const durationMonths = Number(pkg.durationMonths || 0);
    const monthlyRent = dailyRateTotal > 0
        ? dailyRateTotal * 30
        : (Number(pkg.price || 0) > 0 && durationMonths > 0 ? Number(pkg.price) / durationMonths : 0);
    const price = Number(pkg.price || 0) || (monthlyRent > 0 && durationMonths > 0 ? monthlyRent * durationMonths : 0);
    const status = pkg.assignedTenantCompanyId && pkg.status === "Disabled" ? "Active" : (pkg.status || "Active");

    return {
        recordId: pkg._id,
        id: pkg.packageCode,
        packageCode: pkg.packageCode,
        category: pkg.category,
        name: pkg.name,
        creditsIncluded: roundWholeNumber(pkg.creditsIncluded || 0),
        price,
        durationMonths: Number(pkg.durationMonths || 0),
        durationLabel: getDurationLabel(pkg.durationMonths),
        seatsIncluded: Number(pkg.seatsIncluded || 0),
        totalSeats,
        openDesks,
        cabinDesks,
        ratePerOpenDesk,
        ratePerCabinDesk,
        dailyRateTotal,
        monthlyRate: monthlyRent,
        monthlyRent,
        creditsPerSeat,
        monthlyCredits,
        locationMappings: Array.isArray(pkg.locationMappings) ? pkg.locationMappings.map((m: any) => ({
            floor: normalizeText(m.floor || ""),
            wing: normalizeText(m.wing || ""),
            locationCode: normalizeText(m.locationCode || ""),
            label: normalizeText(m.label || ""),
            seatType: m.seatType || "mixed",
            seatsAllocated: Number(m.seatsAllocated || 0),
        })) : [],
        description: pkg.description || "",
        features: Array.isArray(pkg.features) ? pkg.features : [],
        isRecommended: Boolean(pkg.isRecommended),
        isCustom: Boolean(pkg.isCustom),
        sourceTenantCompanyId: pkg.sourceTenantCompanyId || null,
        assignedTenantCompanyId: pkg.assignedTenantCompanyId || null,
        assignedTenantCompanyName: normalizeText(pkg.assignedTenantCompanyName || ""),
        assignedAt: pkg.assignedAt || null,
        source: pkg.source || "standard",
        status,
        sortOrder: Number(pkg.sortOrder || 0),
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt,
        createdAtLabel: formatDateLabel(pkg.createdAt),
        updatedAtLabel: formatDateLabel(pkg.updatedAt),
    };
}

// ---- Main service functions ----

export async function listPlansPricingForOwner(workspaceId: string, ownerId: string) {
    const packages = await PlansPricing.find({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
    })
        .sort({ sortOrder: 1, packageNumber: 1, name: 1 })
        .exec();

    const formatted = packages.map(formatPackage);

    return {
        packages: formatted,
    };
}

export async function createPlansPricingForOwner(workspaceId: string, ownerId: string, input: any) {
    const validationError = validateCreateInput(input);
    if (validationError) {
        const error: any = new Error(validationError);
        error.statusCode = 400;
        throw error;
    }

    const category = input.category || "Membership";
    const packageNumber = await getNextPackageNumber(workspaceId);
    const packageCode = `PKG-${String(packageNumber).padStart(4, "0")}`;
    const sortOrder = packageNumber;
    const seatTotals = deriveMonthlyCredits(input);
    const locationMappings = normalizeTenantPackageLocationMappings(input.locationMappings);
    const tenantPricing = category === "Tenant" ? deriveTenantPackagePricing(input, seatTotals) : null;
    const ratePerOpenDesk = tenantPricing?.ratePerOpenDesk || roundWholeNumber(input.ratePerOpenDesk || 0);
    const ratePerCabinDesk = tenantPricing?.ratePerCabinDesk || roundWholeNumber(input.ratePerCabinDesk || 0);
    const price = category === "Tenant" ? (tenantPricing?.price || 0) : Number(input.price || 0);

    if (category === "Tenant") {
        if (ratePerOpenDesk <= 0 || ratePerCabinDesk <= 0) {
            const error: any = new Error("Tenant package requires both open desk and cabin desk rates.");
            error.statusCode = 400;
            throw error;
        }
    }

    const pkg = await PlansPricing.create({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        ownerId: new mongoose.Types.ObjectId(ownerId),
        packageNumber,
        packageCode,
        category,
        name: normalizeText(input.name),
        creditsIncluded: roundWholeNumber(input.creditsIncluded || seatTotals.monthlyCredits || 0),
        price,
        durationMonths: Math.max(1, Number(input.durationMonths || 1)),
        seatsIncluded: Number(input.seatsIncluded || 0),
        totalSeats: seatTotals.totalSeats,
        openDesks: seatTotals.openDesks,
        cabinDesks: seatTotals.cabinDesks,
        ratePerOpenDesk,
        ratePerCabinDesk,
        creditsPerSeat: seatTotals.creditsPerSeat,
        monthlyCredits: roundWholeNumber(seatTotals.monthlyCredits || input.creditsIncluded || 0),
        locationMappings,
        description: input.description || "",
        features: Array.isArray(input.features) ? input.features : [],
        isRecommended: Boolean(input.isRecommended),
        isCustom: Boolean(input.isCustom),
        sourceTenantCompanyId: input.sourceTenantCompanyId || null,
        source: input.source || "standard",
        status: input.status || "Active",
        sortOrder,
    });

    return { package: formatPackage(pkg) };
}

export async function updatePlansPricingForOwner(workspaceId: string, ownerId: string, packageId: string, input: any) {
    const validationError = validateUpdateInput(input);
    if (validationError) {
        const error: any = new Error(validationError);
        error.statusCode = 400;
        throw error;
    }

    const pkg = await PlansPricing.findById(packageId).exec();
    ensureTenantPackage(pkg, workspaceId);

    if (input.category && isRateOnlyUpdate(input) === false) {
        if (pkg!.assignedTenantCompanyId && pkg!.category === "Tenant") {
            const error: any = new Error("This tenant package is locked to a tenant company and cannot be edited.");
            error.statusCode = 409;
            throw error;
        }
    }

    if (typeof input.category === "string") pkg!.category = input.category as any;
    if (typeof input.name === "string") pkg!.name = normalizeText(input.name);
    if (typeof input.description === "string") pkg!.description = input.description;
    if (typeof input.creditsIncluded === "number") pkg!.creditsIncluded = input.creditsIncluded;
    if (typeof input.price === "number") pkg!.price = input.price;
    if (typeof input.durationMonths === "number") pkg!.durationMonths = input.durationMonths;
    if (typeof input.seatsIncluded === "number") pkg!.seatsIncluded = input.seatsIncluded;
    if (typeof input.totalSeats === "number") pkg!.totalSeats = input.totalSeats;
    if (typeof input.openDesks === "number") pkg!.openDesks = input.openDesks;
    if (typeof input.cabinDesks === "number") pkg!.cabinDesks = input.cabinDesks;
    if (typeof input.ratePerOpenDesk === "number") pkg!.ratePerOpenDesk = input.ratePerOpenDesk;
    if (typeof input.ratePerCabinDesk === "number") pkg!.ratePerCabinDesk = input.ratePerCabinDesk;
    if (typeof input.creditsPerSeat === "number") pkg!.creditsPerSeat = input.creditsPerSeat;
    if (typeof input.monthlyCredits === "number") pkg!.monthlyCredits = input.monthlyCredits;
    if (typeof input.isRecommended === "boolean") pkg!.isRecommended = input.isRecommended;
    if (typeof input.isCustom === "boolean") pkg!.isCustom = input.isCustom;
    if (typeof input.source === "string") pkg!.source = input.source;
    if (typeof input.status === "string") pkg!.status = input.status as any;
    if (Array.isArray(input.features)) pkg!.features = input.features;
    if (Array.isArray(input.locationMappings)) {
        pkg!.locationMappings = normalizeTenantPackageLocationMappings(input.locationMappings);
    }

    const derivedSeats = deriveMonthlyCredits(pkg);
    pkg!.totalSeats = derivedSeats.totalSeats;
    pkg!.openDesks = derivedSeats.openDesks;
    pkg!.cabinDesks = derivedSeats.cabinDesks;

    if (pkg!.category === "Tenant") {
        const tenantPricing = deriveTenantPackagePricing(pkg, derivedSeats);
        if (tenantPricing.ratePerOpenDesk <= 0 || tenantPricing.ratePerCabinDesk <= 0) {
            const error: any = new Error("Tenant package requires both open desk and cabin desk rates.");
            error.statusCode = 400;
            throw error;
        }
        pkg!.ratePerOpenDesk = tenantPricing.ratePerOpenDesk;
        pkg!.ratePerCabinDesk = tenantPricing.ratePerCabinDesk;
        pkg!.price = tenantPricing.price;
    }

    pkg!.creditsPerSeat = derivedSeats.creditsPerSeat;
    pkg!.monthlyCredits = derivedSeats.monthlyCredits || pkg!.creditsIncluded || 0;
    pkg!.creditsIncluded = pkg!.monthlyCredits;

    if (!Array.isArray(pkg!.locationMappings) || pkg!.locationMappings.length === 0) {
        pkg!.locationMappings = normalizeTenantPackageLocationMappings(input.locationMappings || []);
    }

    await pkg!.save();

    return { package: formatPackage(pkg) };
}

export async function deletePlansPricingForOwner(workspaceId: string, ownerId: string, packageId: string) {
    const pkg = await PlansPricing.findById(packageId).exec();
    ensureTenantPackage(pkg, workspaceId);

    if (pkg!.assignedTenantCompanyId) {
        const error: any = new Error("Cannot delete a package that is assigned to a tenant company.");
        error.statusCode = 400;
        throw error;
    }

    await pkg!.deleteOne();

    return { deletedPackageId: packageId };
}

export async function getAvailableTenantResourcesForWorkspace(workspaceId: string, floor = "", wing = "") {
    const { Resource } = await import("../models/Resource.js");

    const query: any = {
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        status: "Active",
        inventoryMode: "area",
        resourceCategory: { $in: ["open_desk", "cabin_desk"] },
        assignedTenantCompanyId: null,
        assignedDepartmentId: "",
    };

    if (floor) query.floor = floor;
    if (wing) query.wing = { $regex: new RegExp(`^${wing.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") };

    const resources = await Resource.find(query)
        .sort({ floor: 1, wing: 1, resourceCode: 1 })
        .lean()
        .exec();

    return resources;
}
