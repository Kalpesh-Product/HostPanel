import mongoose from "mongoose";
import { MeetingRoom } from "../models/MeetingRoom.js";
import { Resource } from "../models/Resource.js";

export const resourceCategories = [
    "open_desk",
    "cabin_desk",
    "meeting_room",
    "conference_room",
    "virtual_office",
];
export const resourceTypes = ["Open Desk", "Meeting Room", "Conference Room", "Cabin Desk", "Virtual Office"];
export const resourceStatuses = ["Active", "Under Maintenance", "Disabled"];
export const floorFallbacks = ["501", "601", "701"];
export const wingFallbacks = ["A", "B"];
export const areaCapacityCatalog: Record<string, number[]> = {
    open_desk: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    cabin_desk: [4, 6, 8, 10],
};
const RESOURCE_FULL_DAY_HOURS = 24;

export function normalizeResourceFloor(value = "") {
    const normalized = String(value || "").trim();
    return normalized || "501";
}

export function normalizeResourceLocation(value = "") {
    return String(value || "").trim();
}

export function normalizeResourceWing(value = "") {
    const normalized = String(value || "").trim().toUpperCase();
    return normalized;
}

export function normalizeResourceInventoryMode(value = "", category = "", capacity = 1) {
    const resourceCategory = normalizeResourceCategory(category);
    if (resourceCategory === "virtual_office") return "single";
    if (resourceCategory === "cabin_desk") return "area";

    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "area" || normalized === "single") return normalized;

    const seatCount = Number(capacity || 0);
    if (resourceCategory === "open_desk") return seatCount > 1 ? "area" : "single";
    return "area";
}

export function getResourceCapacityOptions(category = "", inventoryMode = "area") {
    const resourceCategory = normalizeResourceCategory(category);
    if (resourceCategory === "cabin_desk") return areaCapacityCatalog[resourceCategory] || [1];
    if (resourceCategory === "open_desk") {
        if (inventoryMode === "single") return [1];
        return areaCapacityCatalog[resourceCategory] || [1];
    }
    return [];
}

export function normalizeResourceCapacity(value = 1, category = "", inventoryMode = "area") {
    const parsedCapacity = Math.max(1, Number.parseInt(String(value || "1"), 10) || 1);
    const options = getResourceCapacityOptions(category, inventoryMode);
    if (options.length === 0) return parsedCapacity;
    if (options.includes(parsedCapacity)) return parsedCapacity;
    return options[0];
}

export function normalizeResourceCategory(value = "", fallbackName = "") {
    const normalized = String(value || fallbackName || "").trim().toLowerCase();
    if (normalized.includes("open") || normalized === "desk") return "open_desk";
    if (normalized.includes("cabin")) return "cabin_desk";
    if (normalized.includes("conference") || normalized.includes("board")) return "conference_room";
    if (normalized.includes("meeting")) return "meeting_room";
    if (normalized.includes("virtual")) return "virtual_office";
    return "meeting_room";
}

export function normalizeResourceType(value = "", fallbackName = "") {
    const category = normalizeResourceCategory(value, fallbackName);
    if (category === "open_desk") return "Desk";
    if (category === "cabin_desk") return "Cabin";
    if (category === "conference_room") return "Conference Room";
    if (category === "virtual_office") return "Virtual Office";
    return "Meeting Room";
}

export function normalizeResourceStatus(resource: any = {}) {
    if (resource?.status) return resource.status;
    if (resource?.isActive === false) return "Disabled";
    return "Active";
}

export function hasResourcePricingAndCredits(resource: any = {}) {
    const hourly = Number(resource?.pricePerHour || 0);
    const daily = Number(resource?.pricePerDay || 0);
    const credits = Number(resource?.credits || 0);
    return (hourly > 0 || daily > 0) && credits > 0;
}

function resolveResourcePricePerDay(pricePerHour = 0, pricePerDay = 0) {
    const hour = Number(pricePerHour || 0);
    const day = Number(pricePerDay || 0);
    if (hour > 0) return hour * RESOURCE_FULL_DAY_HOURS;
    if (day > 0) return day;
    return 0;
}

function resolveActivationStatus(status = "Active", resource: any = {}) {
    if (!hasResourcePricingAndCredits(resource)) return "Disabled";
    return status || "Active";
}

export function normalizeResourceName(name = "") {
    return String(name || "").trim();
}

function buildSeatPrefix(resourceCategory = "", type = "") {
    const normalizedCategory = String(resourceCategory || "").trim().toLowerCase();
    const normalizedType = String(type || "").trim().toLowerCase();
    if (normalizedCategory === "open_desk" || normalizedType === "desk") return "ODS";
    if (normalizedCategory === "cabin_desk" || normalizedType === "cabin") return "CDS";
    return "S";
}

function buildSeatLabels(resourceCategory = "", capacity = 0, type = "") {
    const seatCount = Math.max(0, Number(capacity || 0));
    if (seatCount <= 0) return [];
    const prefix = buildSeatPrefix(resourceCategory, type);
    return Array.from({ length: seatCount }, (_, index) => `${prefix}${index + 1}`);
}

function buildResourceCode(resourceNumber: number) {
    return `RES-${String(resourceNumber).padStart(4, "0")}`;
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

export function formatResource(roomDoc: any) {
    const room = roomDoc?.toObject ? roomDoc.toObject() : roomDoc || {};
    const resourceCategory = room.resourceCategory || normalizeResourceCategory(room.type, room.name);
    const type = room.type || normalizeResourceType(resourceCategory, room.name);
    const status = resolveActivationStatus(normalizeResourceStatus(room), room);
    const floor = normalizeResourceFloor(room.floor);
    const location = normalizeResourceLocation(room.location);
    const wing = normalizeResourceWing(room.wing);
    const inventoryMode = normalizeResourceInventoryMode(room.inventoryMode, resourceCategory, room.capacity);
    const locationArea = [floor, wing].filter(Boolean).join(" ").trim();
    const locationLabel = [location, locationArea].filter(Boolean).join(" • ").trim();
    const assignmentLabel = room.assignedTenantCompanyName || room.assignedDepartmentName || "";
    const assignmentType = room.assignedTenantCompanyId
        ? "tenant"
        : room.assignedDepartmentName
            ? "department"
            : "";

    return {
        recordId: room._id,
        id: room.name,
        resourceCode: room.resourceCode || room.name,
        name: room.name,
        type,
        resourceCategory,
        inventoryMode,
        assignedTenantCompanyId: room.assignedTenantCompanyId || null,
        assignedTenantCompanyName: room.assignedTenantCompanyName || "",
        assignedDepartmentId: room.assignedDepartmentId || "",
        assignedDepartmentName: room.assignedDepartmentName || "",
        assignmentLabel,
        assignmentType,
        location,
        floor,
        wing,
        locationLabel,
        capacity: Number(room.capacity || 1),
        seatLabels: buildSeatLabels(resourceCategory, room.capacity, type),
        pricing: formatPricingSummary(room.pricePerHour, room.pricePerDay, room.pricing || ""),
        pricePerHour: Number(room.pricePerHour || 0),
        pricePerDay: resolveResourcePricePerDay(room.pricePerHour, room.pricePerDay),
        pricingUpdatedAt: room.pricingUpdatedAt || null,
        credits: Number(room.credits || 0),
        description: room.description || "",
        status,
        currentlyBooked: Boolean(room.currentlyBooked),
        sortOrder: Number(room.sortOrder || 0),
        isActive: status === "Active",
        activationReady: hasResourcePricingAndCredits(room),
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        history: Array.isArray(room.history) ? room.history : [],
    };
}

function buildSyncedResourceDoc(workspace: any, room: any, index: number) {
    const resourceNumber = index + 1;
    const resourceCategory = room.resourceCategory || normalizeResourceCategory(room.type, room.name);
    const type = room.type || normalizeResourceType(resourceCategory, room.name);
    const floor = normalizeResourceFloor(room.floor);
    const location = normalizeResourceLocation(room.location);
    const wing = normalizeResourceWing(room.wing);
    const inventoryMode = normalizeResourceInventoryMode(room.inventoryMode, resourceCategory, room.capacity);
    const pricingReady = hasResourcePricingAndCredits(room);
    const status = resolveActivationStatus(normalizeResourceStatus(room), room);
    const assignmentLabel = room.assignedTenantCompanyName || room.assignedDepartmentName || "";
    const assignmentType = room.assignedTenantCompanyId
        ? "tenant"
        : room.assignedDepartmentName
            ? "department"
            : "";

    return {
        workspaceId: workspace._id,
        ownerId: workspace.ownerId,
        resourceNumber,
        resourceCode: buildResourceCode(resourceNumber),
        name: normalizeResourceName(room.name),
        type,
        resourceCategory,
        inventoryMode,
        assignedTenantCompanyId: room.assignedTenantCompanyId || null,
        assignedTenantCompanyName: room.assignedTenantCompanyName || "",
        assignedDepartmentId: room.assignedDepartmentId || "",
        assignedDepartmentName: room.assignedDepartmentName || "",
        assignedAt: room.assignedAt || null,
        assignmentLabel,
        assignmentType,
        location,
        floor,
        wing,
        capacity: Number(room.capacity || 1),
        seatLabels: buildSeatLabels(resourceCategory, room.capacity, type),
        pricePerHour: Number(room.pricePerHour || 0),
        pricePerDay: resolveResourcePricePerDay(room.pricePerHour, room.pricePerDay),
        pricing: formatPricingSummary(room.pricePerHour, room.pricePerDay, room.pricing || ""),
        pricingUpdatedAt: room.pricingUpdatedAt || null,
        credits: Number(room.credits || 0),
        description: room.description || "",
        status,
        currentlyBooked: Boolean(room.currentlyBooked),
        history: Array.isArray(room.history) ? room.history : [],
        sortOrder: Number(room.sortOrder || resourceNumber),
        isActive: room.isActive !== false && status === "Active" && pricingReady,
    };
}

export async function syncResourcesFromLegacyMeetingRooms(workspace: any) {
    if (!workspace?._id) return [];

    const legacyRooms = await MeetingRoom.find({ workspaceId: workspace._id })
        .sort({ sortOrder: 1, name: 1 })
        .lean()
        .exec();

    if (legacyRooms.length === 0) {
        return Resource.find({ workspaceId: workspace._id })
            .sort({ sortOrder: 1, name: 1 })
            .lean()
            .exec();
    }

    const syncedRooms = legacyRooms.map((room, index) => buildSyncedResourceDoc(workspace, room, index));

    await Resource.deleteMany({ workspaceId: workspace._id }).exec();
    await Resource.insertMany(syncedRooms);
    await MeetingRoom.deleteMany({ workspaceId: workspace._id }).exec();

    return Resource.find({ workspaceId: workspace._id })
        .sort({ sortOrder: 1, name: 1 })
        .lean()
        .exec();
}
