import mongoose from "mongoose";
import { Resource } from "../models/Resource.js";
import {
    formatResource,
    normalizeResourceName,
    normalizeResourceCategory,
    normalizeResourceFloor,
    normalizeResourceLocation,
    normalizeResourceInventoryMode,
    getResourceCapacityOptions,
    normalizeResourceType,
    normalizeResourceWing,
    resourceStatuses,
    resourceTypes,
    hasResourcePricingAndCredits,
} from "./resourceSyncService.js";

const RESOURCE_FULL_DAY_HOURS = 24;

const assignableResourceCategories = new Set(["open_desk", "cabin_desk"]);

// ---- Validation helpers (replacing Zod) ----

function validateCreateInput(input: any) {
    const errors: string[] = [];
    if (!input.name || typeof input.name !== "string" || input.name.trim().length < 3)
        errors.push("Name must be at least 3 characters");
    if (input.name && input.name.length > 120) errors.push("Name must be at most 120 characters");
    if (input.type && !resourceTypes.includes(input.type)) errors.push(`Type must be one of: ${resourceTypes.join(", ")}`);
    if (input.resourceCategory && !["open_desk", "cabin_desk", "meeting_room", "conference_room", "virtual_office"].includes(input.resourceCategory))
        errors.push("Invalid resource category");
    if (input.inventoryMode && !["area", "single"].includes(input.inventoryMode))
        errors.push("Inventory mode must be 'area' or 'single'");
    if (!input.location || typeof input.location !== "string" || !input.location.trim())
        errors.push("Location is required");
    if (input.location && input.location.length > 120) errors.push("Location must be at most 120 characters");
    if (input.floor && input.floor.length > 60) errors.push("Floor must be at most 60 characters");
    if (input.wing && input.wing.length > 10) errors.push("Wing must be at most 10 characters");
    if (input.capacity == null || isNaN(Number(input.capacity)) || Number(input.capacity) < 1)
        errors.push("Capacity is required and must be at least 1");
    if (input.pricePerHour != null && (isNaN(Number(input.pricePerHour)) || Number(input.pricePerHour) < 0))
        errors.push("Price per hour must be a non-negative number");
    if (input.pricePerDay != null && (isNaN(Number(input.pricePerDay)) || Number(input.pricePerDay) < 0))
        errors.push("Price per day must be a non-negative number");
    if (input.credits != null && (isNaN(Number(input.credits)) || Number(input.credits) < 0))
        errors.push("Credits must be a non-negative number");
    if (input.description && input.description.length > 500) errors.push("Description must be at most 500 characters");
    if (input.status && !resourceStatuses.includes(input.status))
        errors.push(`Status must be one of: ${resourceStatuses.join(", ")}`);
    return errors.length > 0 ? errors.join("; ") : null;
}

function validateUpdateInput(input: any) {
    const errors: string[] = [];
    if (Object.keys(input).length === 0) errors.push("At least one field is required to update resource");
    if (input.name != null && (typeof input.name !== "string" || input.name.trim().length < 3))
        errors.push("Name must be at least 3 characters");
    if (input.name && input.name.length > 120) errors.push("Name must be at most 120 characters");
    if (input.type && !resourceTypes.includes(input.type)) errors.push(`Type must be one of: ${resourceTypes.join(", ")}`);
    if (input.resourceCategory && !["open_desk", "cabin_desk", "meeting_room", "conference_room", "virtual_office"].includes(input.resourceCategory))
        errors.push("Invalid resource category");
    if (input.inventoryMode && !["area", "single"].includes(input.inventoryMode))
        errors.push("Inventory mode must be 'area' or 'single'");
    if (input.location != null && (!input.location.trim() || input.location.length > 120))
        errors.push("Location must be 1-120 characters");
    if (input.floor && input.floor.length > 60) errors.push("Floor must be at most 60 characters");
    if (input.wing && input.wing.length > 10) errors.push("Wing must be at most 10 characters");
    if (input.capacity != null && (isNaN(Number(input.capacity)) || Number(input.capacity) < 1))
        errors.push("Capacity must be at least 1");
    if (input.pricePerHour != null && (isNaN(Number(input.pricePerHour)) || Number(input.pricePerHour) < 0))
        errors.push("Price per hour must be a non-negative number");
    if (input.pricePerDay != null && (isNaN(Number(input.pricePerDay)) || Number(input.pricePerDay) < 0))
        errors.push("Price per day must be a non-negative number");
    if (input.credits != null && (isNaN(Number(input.credits)) || Number(input.credits) < 0))
        errors.push("Credits must be a non-negative number");
    if (input.description && input.description.length > 500) errors.push("Description must be at most 500 characters");
    if (input.status && !resourceStatuses.includes(input.status))
        errors.push(`Status must be one of: ${resourceStatuses.join(", ")}`);
    return errors.length > 0 ? errors.join("; ") : null;
}

function validateAssignInput(input: any) {
    const errors: string[] = [];
    if (input.assignmentType && !["tenant", "department"].includes(input.assignmentType))
        errors.push("Assignment type must be 'tenant' or 'department'");
    if ((!input.assignmentType || input.assignmentType === "tenant") && !input.tenantCompanyId && !input.tenantCompanyName)
        errors.push("Choose a tenant company or department to assign this resource.");
    if (input.assignmentType === "department" && !input.departmentId && !input.departmentName)
        errors.push("Choose a tenant company or department to assign this resource.");
    return errors.length > 0 ? errors.join("; ") : null;
}

// ---- Helper functions ----

function assertCabinDeskAreaMode(resourceCategory: string, inventoryMode: string) {
    if (
        normalizeResourceCategory(resourceCategory) === "cabin_desk" &&
        String(inventoryMode || "").trim().toLowerCase() === "single"
    ) {
        const error: any = new Error("Cabin desks can only be saved as area blocks.");
        error.statusCode = 400;
        throw error;
    }
}

function validateResourceCapacity(resourceCategory: string, inventoryMode: string, capacity: number) {
    const normalizedCategory = normalizeResourceCategory(resourceCategory);
    const normalizedMode = normalizeResourceInventoryMode(inventoryMode, normalizedCategory, capacity);
    const normalizedCapacity = Math.max(1, Number(capacity || 0));
    const allowedCapacities = getResourceCapacityOptions(normalizedCategory, normalizedMode);

    if (allowedCapacities.length === 0) return normalizedCapacity;
    if (allowedCapacities.includes(normalizedCapacity)) return normalizedCapacity;

    const error: any = new Error(
        normalizedCategory === "open_desk"
            ? "Open desk areas must be saved as 1 through 10 seat blocks."
            : normalizedCategory === "cabin_desk"
                ? "Cabin desk areas must be saved as 4, 6, 8, or 10 seat blocks."
                : "Choose a valid capacity for this resource.",
    );
    error.statusCode = 400;
    throw error;
}

function resolveResourcePricePerDay(pricePerHour = 0, pricePerDay = 0) {
    const hour = Number(pricePerHour || 0);
    const day = Number(pricePerDay || 0);
    if (hour > 0) return hour * RESOURCE_FULL_DAY_HOURS;
    if (day > 0) return day;
    return 0;
}

function formatPricingSummary(pricePerHour = 0, pricePerDay = 0, fallback = "") {
    const hour = Number(pricePerHour || 0);
    const day = resolveResourcePricePerDay(hour, pricePerDay);
    const formatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
    const parts: string[] = [];
    if (hour > 0) parts.push(`₹${formatter.format(hour)}/hour`);
    if (day > 0) parts.push(`₹${formatter.format(day)}/day`);
    return parts.length > 0 ? parts.join(" • ") : String(fallback || "");
}

function resolveResourceStatusForActivation({
    requestedStatus = "Active",
    pricePerHour = 0,
    pricePerDay = 0,
    credits = 0,
}: any = {}) {
    if (!hasResourcePricingAndCredits({ pricePerHour, pricePerDay, credits })) return "Disabled";
    return requestedStatus || "Active";
}

function ensureResourceTenant(resource: any, workspaceId: string) {
    if (!resource || !resource.workspaceId || resource.workspaceId.toString() !== workspaceId.toString()) {
        const error: any = new Error("Resource not found.");
        error.statusCode = 404;
        throw error;
    }
}

function normalizeAssignmentScopeKey(value = "") {
    return String(value || "").trim().toUpperCase().replace(/[\s_-]+/g, "");
}

function getTenantPackageLocationKeys(company: any = {}) {
    const packageDetails = company.packageDetails || {};
    const mappings = Array.isArray(packageDetails.locationMappings) ? packageDetails.locationMappings : [];
    const keys = new Set<string>();
    mappings.forEach((mapping: any) => {
        [mapping?.locationCode, mapping?.label, mapping?.resourceCode, mapping?.id]
            .map((v: any) => normalizeAssignmentScopeKey(v))
            .filter(Boolean)
            .forEach((v: string) => keys.add(v));
    });
    return keys;
}

function resourceMatchesTenantPackageScope(resource: any = {}, allowedKeys: Set<string> = new Set()) {
    if (!(allowedKeys instanceof Set) || allowedKeys.size === 0) return false;
    const candidates = [
        resource.locationLabel,
        [resource.floor, resource.wing].filter(Boolean).join(" "),
        resource.resourceCode,
        resource.id,
    ]
        .map((v: any) => normalizeAssignmentScopeKey(v))
        .filter(Boolean);
    return candidates.some((candidate) => allowedKeys.has(candidate));
}

async function getNextResourceNumber(workspaceId: string) {
    const latest = await Resource.findOne({ workspaceId: new mongoose.Types.ObjectId(workspaceId) })
        .sort({ resourceNumber: -1, createdAt: -1 })
        .lean()
        .exec();
    return (latest?.resourceNumber || 0) + 1;
}

// ---- Main service functions ----

export async function listResourcesForOwner(workspaceId: string, ownerId: string) {
    const resources = await Resource.find({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
    })
        .sort({ sortOrder: 1, resourceNumber: 1, name: 1 })
        .exec();

    return {
        resources: resources.map(formatResource),
    };
}

export async function createResourceForOwner(workspaceId: string, ownerId: string, input: any) {
    const validationError = validateCreateInput(input);
    if (validationError) {
        const error: any = new Error(validationError);
        error.statusCode = 400;
        throw error;
    }

    const resourceNumber = await getNextResourceNumber(workspaceId);
    const resourceCode = `RES-${String(resourceNumber).padStart(4, "0")}`;
    const sortOrder = resourceNumber;
    const resourceCategory = normalizeResourceCategory(input.resourceCategory || input.type, input.name);
    const type = input.type || normalizeResourceType(resourceCategory, input.name);
    assertCabinDeskAreaMode(resourceCategory, input.inventoryMode);
    const inventoryMode = normalizeResourceInventoryMode(input.inventoryMode, resourceCategory, input.capacity);
    const capacity = validateResourceCapacity(resourceCategory, inventoryMode, input.capacity);
    const pricePerHour = typeof input.pricePerHour === "number" ? input.pricePerHour : 0;
    const pricePerDay = resolveResourcePricePerDay(
        pricePerHour,
        typeof input.pricePerDay === "number" ? input.pricePerDay : 0,
    );
    const credits = Number(input.credits || 0);
    const status = resolveResourceStatusForActivation({
        requestedStatus: input.status || "Active",
        pricePerHour,
        pricePerDay,
        credits,
    });

    const resource = await Resource.create({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        ownerId: new mongoose.Types.ObjectId(ownerId),
        resourceNumber,
        resourceCode,
        name: normalizeResourceName(input.name),
        type,
        resourceCategory,
        inventoryMode,
        location: normalizeResourceLocation(input.location),
        floor: normalizeResourceFloor(input.floor),
        wing: normalizeResourceWing(input.wing),
        capacity,
        pricePerHour,
        pricePerDay,
        pricing: formatPricingSummary(pricePerHour, pricePerDay, input.pricing || ""),
        pricingUpdatedAt: hasResourcePricingAndCredits({ pricePerHour, pricePerDay, credits }) ? new Date() : null,
        credits,
        description: input.description || "",
        status,
        isActive: status === "Active",
        currentlyBooked: false,
        history: [],
        sortOrder,
    });

    return {
        resource: formatResource(resource),
    };
}

export async function updateResourceForOwner(workspaceId: string, ownerId: string, resourceId: string, input: any) {
    const validationError = validateUpdateInput(input);
    if (validationError) {
        const error: any = new Error(validationError);
        error.statusCode = 400;
        throw error;
    }

    const resource = await Resource.findById(resourceId).exec();
    ensureResourceTenant(resource, workspaceId);

    if (typeof input.name === "string") resource!.name = normalizeResourceName(input.name);
    if (typeof input.type === "string") resource!.type = input.type as any;
    if (typeof input.location === "string") resource!.location = normalizeResourceLocation(input.location);
    if (typeof input.resourceCategory === "string") {
        resource!.resourceCategory = input.resourceCategory;
        resource!.type = normalizeResourceType(input.resourceCategory, resource!.name) as any;
    } else if (typeof input.type === "string") {
        resource!.resourceCategory = normalizeResourceCategory(input.type, resource!.name);
    }
    assertCabinDeskAreaMode(resource!.resourceCategory, input.inventoryMode ?? resource!.inventoryMode);
    resource!.inventoryMode = normalizeResourceInventoryMode(
        input.inventoryMode ?? resource!.inventoryMode,
        resource!.resourceCategory,
        typeof input.capacity === "number" ? input.capacity : resource!.capacity,
    );
    resource!.capacity = validateResourceCapacity(
        resource!.resourceCategory,
        resource!.inventoryMode,
        typeof input.capacity === "number" ? input.capacity : resource!.capacity,
    );
    if (typeof input.floor === "string") resource!.floor = normalizeResourceFloor(input.floor);
    if (typeof input.wing === "string") resource!.wing = normalizeResourceWing(input.wing);
    if (typeof input.pricing === "string") resource!.pricing = input.pricing;
    if (typeof input.pricePerHour === "number") resource!.pricePerHour = input.pricePerHour;
    if (typeof input.pricePerHour === "number" || typeof input.pricePerDay === "number") {
        resource!.pricePerDay = resolveResourcePricePerDay(
            typeof input.pricePerHour === "number" ? input.pricePerHour : resource!.pricePerHour,
            typeof input.pricePerDay === "number" ? input.pricePerDay : resource!.pricePerDay,
        );
    }
    if (typeof input.credits === "number") resource!.credits = input.credits;
    if (typeof input.description === "string") resource!.description = input.description;
    if (typeof input.status === "string") {
        resource!.status = input.status as any;
        resource!.isActive = input.status !== "Disabled";
    }

    if (
        typeof input.pricePerHour === "number" ||
        typeof input.pricePerDay === "number" ||
        typeof input.pricing === "string" ||
        typeof input.credits === "number"
    ) {
        resource!.pricing = formatPricingSummary(
            input.pricePerHour ?? resource!.pricePerHour,
            input.pricePerDay ?? resource!.pricePerDay,
            input.pricing ?? resource!.pricing,
        );
        resource!.pricingUpdatedAt = new Date();
    }

    const resolvedStatus = resolveResourceStatusForActivation({
        requestedStatus: resource!.status,
        pricePerHour: resource!.pricePerHour,
        pricePerDay: resource!.pricePerDay,
        credits: resource!.credits,
    });
    resource!.status = resolvedStatus as any;
    resource!.isActive = resolvedStatus === "Active";

    await resource!.save();

    return {
        resource: formatResource(resource),
    };
}

export async function assignResourceForOwner(workspaceId: string, ownerId: string, resourceId: string, input: any) {
    const validationError = validateAssignInput(input);
    if (validationError) {
        const error: any = new Error(validationError);
        error.statusCode = 400;
        throw error;
    }

    const resource = await Resource.findById(resourceId).exec();
    ensureResourceTenant(resource, workspaceId);

    if (!assignableResourceCategories.has(resource!.resourceCategory)) {
        const error: any = new Error("Only open desks and cabin desks can be assigned.");
        error.statusCode = 400;
        throw error;
    }

    const assignmentType = input.assignmentType || "tenant";

    if (assignmentType === "department" && String(resource!.inventoryMode || "area").trim().toLowerCase() === "area") {
        const error: any = new Error("Area blocks can only be assigned to tenant companies.");
        error.statusCode = 400;
        throw error;
    }

    if (assignmentType === "tenant") {
        if (!input.tenantCompanyId) {
            const error: any = new Error("Tenant company is required for tenant assignment.");
            error.statusCode = 400;
            throw error;
        }

        // TenantCompany model doesn't exist in this project - skip validation
        // const company = await TenantCompany.findOne({ ... }).lean();

        resource!.assignedTenantCompanyId = input.tenantCompanyId
            ? (new mongoose.Types.ObjectId(input.tenantCompanyId) as any)
            : null;
        resource!.assignedTenantCompanyName = normalizeResourceName(
            input.tenantCompanyName || input.tenantCompanyId || "",
        );
        resource!.assignedDepartmentId = "";
        resource!.assignedDepartmentName = "";
    } else {
        const departmentId = input.departmentId || input.departmentName || "";
        const departmentName = input.departmentName || input.departmentId || "";

        resource!.assignedTenantCompanyId = null as any;
        resource!.assignedTenantCompanyName = "";
        resource!.assignedDepartmentId = normalizeResourceName(departmentId);
        resource!.assignedDepartmentName = normalizeResourceName(departmentName);
    }

    resource!.assignedAt = new Date();

    // Heal stale type values from legacy data that don't match the schema enum.
    // e.g. "Desk" → "Open Desk", "Cabin" → "Cabin Desk"
    const validTypes = ["Open Desk", "Meeting Room", "Conference Room", "Cabin Desk", "Virtual Office"];
    if (!validTypes.includes(resource!.type as string)) {
        resource!.type = normalizeResourceType(resource!.resourceCategory, resource!.name) as any;
    }

    await resource!.save();

    return {
        resource: formatResource(resource),
    };
}

export async function releaseResourceAssignmentForOwner(workspaceId: string, ownerId: string, resourceId: string) {
    const resource = await Resource.findById(resourceId).exec();
    ensureResourceTenant(resource, workspaceId);

    resource!.assignedTenantCompanyId = null as any;
    resource!.assignedTenantCompanyName = "";
    resource!.assignedDepartmentId = "";
    resource!.assignedDepartmentName = "";
    resource!.assignedAt = null as any;

    // Heal stale type values from legacy data that don't match the schema enum.
    const validTypes = ["Open Desk", "Meeting Room", "Conference Room", "Cabin Desk", "Virtual Office"];
    if (!validTypes.includes(resource!.type as string)) {
        resource!.type = normalizeResourceType(resource!.resourceCategory, resource!.name) as any;
    }

    await resource!.save();

    return {
        resource: formatResource(resource),
    };
}

export async function deleteResourceForOwner(workspaceId: string, ownerId: string, resourceId: string) {
    const resource = await Resource.findById(resourceId).exec();
    ensureResourceTenant(resource, workspaceId);

    await resource!.deleteOne();

    return {
        deletedResourceId: resourceId,
    };
}
