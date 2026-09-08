import mongoose from "mongoose";
import { Resource } from "../models/Resource.js";
import Workspace from "../models/Workspace.js";
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
    MAX_DESK_SEATS,
} from "./resourceSyncService.js";
import {
    createSeatsForResource,
    deleteAllSeatsForResource,
    deleteExcessSeatsForResource,
    findBlockingSeatForCapacityReduction,
    getBulkSeatSummaries,
    getSeatSummaryForResource,
    isSeatTrackedCategory,
} from "./resourceSeatService.js";

// Fallback bookable-day span when a workspace has no business hours saved
// (default 09:00–22:00 = 13 hours).
const DEFAULT_BOOKING_SPAN_HOURS = 13;

function timeStringToMinutes(value: string): number {
    const [hours, minutes] = String(value || "").split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
}

export async function getWorkspaceBookingSpanHours(workspaceId: string): Promise<number> {
    try {
        const workspace = await Workspace.findById(workspaceId).select("preferences.businessHours").lean().exec();
        const bh = (workspace as any)?.preferences?.businessHours;
        if (bh?.start && bh?.end) {
            const span = (timeStringToMinutes(bh.end) - timeStringToMinutes(bh.start)) / 60;
            if (span > 0) return Math.round(span * 100) / 100;
        }
    } catch {
        // fall through to default
    }
    return DEFAULT_BOOKING_SPAN_HOURS;
}

// Open desk / cabin desk are assigned per-seat (see resourceSeatService.ts);
// virtual_office is the only category still assigned as a whole resource.
const assignableResourceCategories = new Set(["virtual_office"]);

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
    if (input.assignmentType && !["tenant", "virtualOffice", "department"].includes(input.assignmentType))
        errors.push("Assignment type must be 'tenant', 'virtualOffice' or 'department'");
    if ((!input.assignmentType || input.assignmentType === "tenant") && !input.tenantCompanyId && !input.tenantCompanyName)
        errors.push("Choose a tenant company or department to assign this resource.");
    if (input.assignmentType === "virtualOffice" && !input.virtualOfficeId && !input.virtualOfficeName)
        errors.push("Choose a virtual office company to assign this resource.");
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

    if (allowedCapacities.length > 0) {
        if (allowedCapacities.includes(normalizedCapacity)) return normalizedCapacity;
        const error: any = new Error("Choose a valid capacity for this resource.");
        error.statusCode = 400;
        throw error;
    }

    if ((normalizedCategory === "open_desk" || normalizedCategory === "cabin_desk") && normalizedCapacity > MAX_DESK_SEATS) {
        const error: any = new Error(`Seats must be ${MAX_DESK_SEATS} or fewer.`);
        error.statusCode = 400;
        throw error;
    }

    return normalizedCapacity;
}

// An explicitly supplied daily price always wins (the client keeps it in sync
// with hourly × booking span); we only derive it when missing.
function resolveResourcePricePerDay(pricePerHour = 0, pricePerDay = 0, spanHours = DEFAULT_BOOKING_SPAN_HOURS) {
    const hour = Number(pricePerHour || 0);
    const day = Number(pricePerDay || 0);
    if (day > 0) return day;
    if (hour > 0) return Math.round(hour * spanHours * 100) / 100;
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

const validResourceTypes = ["Open Desk", "Meeting Room", "Conference Room", "Cabin Desk", "Virtual Office"];

// Legacy MeetingRoom-synced data can carry `type` values ("Desk", "Cabin",
// "Other") that predate the current schema enum. Any save on a document that
// still has one of those fails Mongoose validation even when `type` itself
// isn't being changed by this request — heal it first so unrelated edits
// (assign, release, capacity/status updates) don't get blocked by stale data.
function healStaleResourceType(resource: any) {
    if (!validResourceTypes.includes(resource.type as string)) {
        resource.type = normalizeResourceType(resource.resourceCategory, resource.name) as any;
    }
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

    const seatSummaries = await getBulkSeatSummaries(workspaceId);

    return {
        resources: resources.map((resource) => formatResource(resource, seatSummaries.get(String(resource._id)))),
    };
}

// Called after a workspace's business hours change: daily prices are defined
// as hourly × bookable span, so every priced resource is re-derived from its
// hourly rate against the new span.
export async function recalcResourceDailyPricesForWorkspace(workspaceId: string) {
    const spanHours = await getWorkspaceBookingSpanHours(workspaceId);
    const resources = await Resource.find({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        pricePerHour: { $gt: 0 },
    })
        .select("pricePerHour pricePerDay pricing")
        .lean()
        .exec();

    // Targeted $set updates instead of document save(): legacy resources can
    // carry values that fail current schema validation on unrelated fields
    // (e.g. retired `type` enum entries), which must not block a price recalc.
    const operations = [];
    for (const resource of resources) {
        const newDaily = Math.round(Number(resource.pricePerHour) * spanHours * 100) / 100;
        if (Number(resource.pricePerDay) === newDaily) continue;
        operations.push({
            updateOne: {
                filter: { _id: resource._id },
                update: {
                    $set: {
                        pricePerDay: newDaily,
                        pricing: formatPricingSummary(resource.pricePerHour, newDaily, resource.pricing || ""),
                        pricingUpdatedAt: new Date(),
                    },
                },
            },
        });
    }
    if (operations.length > 0) {
        await Resource.bulkWrite(operations);
    }
    return operations.length;
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
    const floor = normalizeResourceFloor(input.floor);
    const wing = normalizeResourceWing(input.wing);

    // Desk inventory is meant to be one Resource block per floor+wing+category
    // — tenant onboarding assigns seats out of that single block. Block a
    // second block for the same location instead of splitting the inventory.
    if (isSeatTrackedCategory(resourceCategory)) {
        const duplicateBlock = await Resource.findOne({
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            floor,
            wing,
            resourceCategory,
        }).lean().exec();
        if (duplicateBlock) {
            const label = resourceCategory === "cabin_desk" ? "cabin desk" : "open desk";
            const location = `Floor ${floor}${wing ? ` Wing ${wing}` : ""}`;
            const error: any = new Error(`An ${label} block already exists on ${location} — edit its capacity instead of creating a new one.`);
            error.statusCode = 409;
            throw error;
        }
    }
    const pricePerHour = typeof input.pricePerHour === "number" ? input.pricePerHour : 0;
    const bookingSpanHours = await getWorkspaceBookingSpanHours(workspaceId);
    const pricePerDay = resolveResourcePricePerDay(
        pricePerHour,
        typeof input.pricePerDay === "number" ? input.pricePerDay : 0,
        bookingSpanHours,
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
        floor,
        wing,
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

    let seatSummary;
    if (isSeatTrackedCategory(resourceCategory)) {
        await createSeatsForResource(resource, capacity);
        seatSummary = await getSeatSummaryForResource(String(resource._id));
    }

    return {
        resource: formatResource(resource, seatSummary),
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

    const previousCategory = resource!.resourceCategory;
    const previousCapacity = resource!.capacity;
    const previousFloor = resource!.floor;
    const previousWing = resource!.wing;

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
            await getWorkspaceBookingSpanHours(workspaceId),
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

    const wasSeatTracked = isSeatTrackedCategory(previousCategory);
    const isNowSeatTracked = isSeatTrackedCategory(resource!.resourceCategory);
    let seatWarning: string | null = null;

    if (isNowSeatTracked && !wasSeatTracked) {
        // Category just became open_desk/cabin_desk — seed seats for the full capacity.
        await createSeatsForResource(resource, resource!.capacity);
    } else if (!isNowSeatTracked && wasSeatTracked) {
        // Category moved away from open_desk/cabin_desk — its seats no longer apply.
        const blockingSeat = await findBlockingSeatForCapacityReduction(String(resource!._id), 0);
        if (blockingSeat) {
            const error: any = new Error(`Seat ${blockingSeat.seatLabel} is assigned to ${blockingSeat.assignmentLabel}. Release it before changing this resource's category.`);
            error.statusCode = 409;
            throw error;
        }
        await deleteAllSeatsForResource(String(resource!._id));
    } else if (isNowSeatTracked && wasSeatTracked) {
        if (resource!.capacity > previousCapacity) {
            await createSeatsForResource(resource, resource!.capacity - previousCapacity);
        } else if (resource!.capacity < previousCapacity) {
            const blockingSeat = await findBlockingSeatForCapacityReduction(String(resource!._id), resource!.capacity);
            if (blockingSeat) {
                const error: any = new Error(`Seat ${blockingSeat.seatLabel} is assigned to ${blockingSeat.assignmentLabel}. Release it before reducing seats below ${blockingSeat.seatNumber}.`);
                error.statusCode = 409;
                throw error;
            }
            await deleteExcessSeatsForResource(String(resource!._id), resource!.capacity);
        }

        if (previousFloor !== resource!.floor || previousWing !== resource!.wing) {
            const { total } = await getSeatSummaryForResource(String(resource!._id));
            if (total > 0) {
                seatWarning = "This resource's floor/wing changed, but its existing seat labels stay as originally assigned for stable tracking. New seats will use the updated floor/wing.";
            }
        }
    }

    healStaleResourceType(resource);
    await resource!.save();

    const seatSummary = isNowSeatTracked ? await getSeatSummaryForResource(String(resource!._id)) : undefined;

    return {
        resource: formatResource(resource, seatSummary),
        ...(seatWarning ? { warning: seatWarning } : {}),
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

    if (isSeatTrackedCategory(resource!.resourceCategory)) {
        const error: any = new Error("Open desk and cabin desk resources are assigned seat by seat. Use the seat picker for this resource.");
        error.statusCode = 400;
        throw error;
    }
    if (!assignableResourceCategories.has(resource!.resourceCategory)) {
        const error: any = new Error("Only virtual offices can be assigned as a whole resource.");
        error.statusCode = 400;
        throw error;
    }

    const assignmentType = input.assignmentType || "tenant";

    // Once a resource is assigned to a tenant, virtual office, or department
    // it can't be silently handed off to someone else — release it first.
    // Re-submitting the same assignee (e.g. re-saving) is a no-op, not a conflict.
    const currentAssigneeId = resource!.assignedTenantCompanyId || resource!.assignedVirtualOfficeId || resource!.assignedDepartmentId;
    if (currentAssigneeId) {
        const requestedId = assignmentType === "tenant" ? input.tenantCompanyId
            : assignmentType === "virtualOffice" ? input.virtualOfficeId
            : input.departmentId || input.departmentName;
        const isSameAssignee = requestedId && String(currentAssigneeId) === String(requestedId);
        if (!isSameAssignee) {
            const currentAssigneeName = resource!.assignedTenantCompanyName || resource!.assignedVirtualOfficeName || resource!.assignedDepartmentName || "another department or company";
            const error: any = new Error(`This resource is already assigned to ${currentAssigneeName}. Release it before assigning it elsewhere.`);
            error.statusCode = 409;
            throw error;
        }
    }

    if (assignmentType === "tenant") {
        if (!input.tenantCompanyId) {
            const error: any = new Error("Tenant company is required for tenant assignment.");
            error.statusCode = 400;
            throw error;
        }

        resource!.assignedTenantCompanyId = input.tenantCompanyId
            ? (new mongoose.Types.ObjectId(input.tenantCompanyId) as any)
            : null;
        resource!.assignedTenantCompanyName = normalizeResourceName(
            input.tenantCompanyName || input.tenantCompanyId || "",
        );
        resource!.assignedVirtualOfficeId = null as any;
        resource!.assignedVirtualOfficeName = "";
        resource!.assignedDepartmentId = "";
        resource!.assignedDepartmentName = "";
    } else if (assignmentType === "virtualOffice") {
        if (!input.virtualOfficeId) {
            const error: any = new Error("Virtual office company is required for virtual office assignment.");
            error.statusCode = 400;
            throw error;
        }

        resource!.assignedVirtualOfficeId = input.virtualOfficeId
            ? (new mongoose.Types.ObjectId(input.virtualOfficeId) as any)
            : null;
        resource!.assignedVirtualOfficeName = normalizeResourceName(
            input.virtualOfficeName || input.virtualOfficeId || "",
        );
        resource!.assignedTenantCompanyId = null as any;
        resource!.assignedTenantCompanyName = "";
        resource!.assignedDepartmentId = "";
        resource!.assignedDepartmentName = "";
    } else {
        const departmentId = input.departmentId || input.departmentName || "";
        const departmentName = input.departmentName || input.departmentId || "";

        resource!.assignedTenantCompanyId = null as any;
        resource!.assignedTenantCompanyName = "";
        resource!.assignedVirtualOfficeId = null as any;
        resource!.assignedVirtualOfficeName = "";
        resource!.assignedDepartmentId = normalizeResourceName(departmentId);
        resource!.assignedDepartmentName = normalizeResourceName(departmentName);
    }

    resource!.assignedAt = new Date();

    healStaleResourceType(resource);
    await resource!.save();

    return {
        resource: formatResource(resource),
    };
}

export async function releaseResourceAssignmentForOwner(workspaceId: string, ownerId: string, resourceId: string) {
    const resource = await Resource.findById(resourceId).exec();
    ensureResourceTenant(resource, workspaceId);

    if (isSeatTrackedCategory(resource!.resourceCategory)) {
        const error: any = new Error("Open desk and cabin desk resources are released seat by seat. Use the seat picker for this resource.");
        error.statusCode = 400;
        throw error;
    }

    resource!.assignedTenantCompanyId = null as any;
    resource!.assignedTenantCompanyName = "";
    resource!.assignedVirtualOfficeId = null as any;
    resource!.assignedVirtualOfficeName = "";
    resource!.assignedDepartmentId = "";
    resource!.assignedDepartmentName = "";
    resource!.assignedAt = null as any;

    healStaleResourceType(resource);
    await resource!.save();

    return {
        resource: formatResource(resource),
    };
}

export async function deleteResourceForOwner(workspaceId: string, ownerId: string, resourceId: string) {
    const resource = await Resource.findById(resourceId).exec();
    ensureResourceTenant(resource, workspaceId);

    if (isSeatTrackedCategory(resource!.resourceCategory)) {
        const blockingSeat = await findBlockingSeatForCapacityReduction(String(resource!._id), 0);
        if (blockingSeat) {
            const error: any = new Error(`Seat ${blockingSeat.seatLabel} is assigned to ${blockingSeat.assignmentLabel}. Release every seat before deleting this resource.`);
            error.statusCode = 409;
            throw error;
        }
        await deleteAllSeatsForResource(resourceId);
    }

    await resource!.deleteOne();

    return {
        deletedResourceId: resourceId,
    };
}
