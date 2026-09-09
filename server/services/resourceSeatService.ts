import mongoose from "mongoose";
import { Resource } from "../models/Resource.js";
import { ResourceSeat } from "../models/ResourceSeat.js";
import { reserveNextResourceSeatNumbers } from "../models/ResourceSeatCounter.js";
import { buildSeatPrefix, normalizeResourceFloor, normalizeResourceWing } from "./resourceSyncService.js";

const seatAssignableCategories = new Set(["open_desk", "cabin_desk"]);

export function isSeatTrackedCategory(resourceCategory = "") {
    return seatAssignableCategories.has(String(resourceCategory || "").trim().toLowerCase());
}

function buildSeatLabel(resourceCategory: string, floor: string, wing: string, seatNumber: number) {
    const prefix = buildSeatPrefix(resourceCategory);
    const normalizedFloor = normalizeResourceFloor(floor);
    const normalizedWing = normalizeResourceWing(wing);
    const locationPart = [normalizedFloor, normalizedWing].filter(Boolean).join("-");
    return locationPart ? `${prefix}-${locationPart}-${seatNumber}` : `${prefix}-${seatNumber}`;
}

export function formatSeat(seatDoc: any) {
    const seat = seatDoc?.toObject ? seatDoc.toObject() : seatDoc || {};
    const assignmentLabel = seat.assignedTenantCompanyName || seat.assignedDepartmentName || "";
    const assignmentType = seat.assignedTenantCompanyId ? "tenant" : seat.assignedDepartmentName ? "department" : "";
    return {
        recordId: seat._id,
        resourceId: seat.resourceId,
        resourceCategory: seat.resourceCategory,
        floor: seat.floor || "",
        wing: seat.wing || "",
        seatNumber: seat.seatNumber,
        seatLabel: seat.seatLabel,
        assignedTenantCompanyId: seat.assignedTenantCompanyId || null,
        assignedTenantCompanyName: seat.assignedTenantCompanyName || "",
        assignedDepartmentId: seat.assignedDepartmentId || "",
        assignedDepartmentName: seat.assignedDepartmentName || "",
        assignedAt: seat.assignedAt || null,
        assignmentLabel,
        assignmentType,
        isVacant: !assignmentLabel,
    };
}

// Creates `count` new seats for a resource, continuing the global seat-number
// sequence for that workspace+floor+wing+resourceCategory (see ResourceSeatCounter).
export async function createSeatsForResource(resource: any, count: number) {
    if (!count || count <= 0) return [];
    if (!isSeatTrackedCategory(resource.resourceCategory)) return [];

    const seatNumbers = await reserveNextResourceSeatNumbers(
        String(resource.workspaceId),
        resource.floor,
        resource.wing,
        resource.resourceCategory,
        count,
    );

    const docs = seatNumbers.map((seatNumber) => ({
        workspaceId: resource.workspaceId,
        resourceId: resource._id,
        ownerId: resource.ownerId,
        resourceCategory: resource.resourceCategory,
        floor: normalizeResourceFloor(resource.floor),
        wing: normalizeResourceWing(resource.wing),
        seatNumber,
        seatLabel: buildSeatLabel(resource.resourceCategory, resource.floor, resource.wing, seatNumber),
    }));

    return ResourceSeat.insertMany(docs);
}

export async function listSeatsForResource(workspaceId: string, resourceId: string) {
    const resource = await Resource.findById(resourceId).lean().exec();
    if (!resource || String(resource.workspaceId) !== String(workspaceId)) {
        const error: any = new Error("Resource not found.");
        error.statusCode = 404;
        throw error;
    }

    const seats = await ResourceSeat.find({ workspaceId: new mongoose.Types.ObjectId(workspaceId), resourceId: new mongoose.Types.ObjectId(resourceId) })
        .sort({ seatNumber: 1 })
        .exec();

    return seats.map(formatSeat);
}

// Highest-numbered assigned seat that would be dropped by reducing capacity to
// `newCapacity`, or null if the reduction is safe.
export async function findBlockingSeatForCapacityReduction(resourceId: string, newCapacity: number) {
    const seat = await ResourceSeat.findOne({
        resourceId: new mongoose.Types.ObjectId(resourceId),
        seatNumber: { $gt: newCapacity },
        $or: [{ assignedTenantCompanyId: { $ne: null } }, { assignedDepartmentId: { $ne: "" } }],
    })
        .sort({ seatNumber: -1 })
        .lean()
        .exec();
    return seat ? formatSeat(seat) : null;
}

// Removes the now out-of-range vacant seats when capacity is reduced. Assumes
// findBlockingSeatForCapacityReduction() already confirmed none of them are assigned.
export async function deleteExcessSeatsForResource(resourceId: string, newCapacity: number) {
    await ResourceSeat.deleteMany({
        resourceId: new mongoose.Types.ObjectId(resourceId),
        seatNumber: { $gt: newCapacity },
    }).exec();
}

// Used when a resource's category changes away from open_desk/cabin_desk —
// its seats are no longer meaningful. Callers must check for assigned seats
// (findBlockingSeatForCapacityReduction with newCapacity 0) before calling this.
export async function deleteAllSeatsForResource(resourceId: string) {
    await ResourceSeat.deleteMany({ resourceId: new mongoose.Types.ObjectId(resourceId) }).exec();
}

function ensureSeatAssignInput(input: any) {
    const assignmentType = input?.assignmentType || "tenant";
    if (assignmentType === "tenant") {
        if (!input?.tenantCompanyId) {
            const error: any = new Error("Tenant company is required to assign a seat.");
            error.statusCode = 400;
            throw error;
        }
    } else if (assignmentType === "department") {
        if (!input?.departmentId && !input?.departmentName) {
            const error: any = new Error("Choose a department to assign this seat.");
            error.statusCode = 400;
            throw error;
        }
    } else {
        const error: any = new Error("Assignment type must be 'tenant' or 'department'.");
        error.statusCode = 400;
        throw error;
    }
    return assignmentType;
}

async function findOwnedSeat(workspaceId: string, resourceId: string, seatNumber: number) {
    const resource = await Resource.findById(resourceId).lean().exec();
    if (!resource || String(resource.workspaceId) !== String(workspaceId)) {
        const error: any = new Error("Resource not found.");
        error.statusCode = 404;
        throw error;
    }
    if (!isSeatTrackedCategory(resource.resourceCategory)) {
        const error: any = new Error("Only open desk and cabin desk seats can be assigned.");
        error.statusCode = 400;
        throw error;
    }

    const seat = await ResourceSeat.findOne({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        resourceId: new mongoose.Types.ObjectId(resourceId),
        seatNumber: Number(seatNumber),
    }).exec();
    if (!seat) {
        const error: any = new Error("Seat not found.");
        error.statusCode = 404;
        throw error;
    }
    return seat;
}

export async function assignSeatForOwner(workspaceId: string, ownerId: string, resourceId: string, seatNumber: number, input: any) {
    const assignmentType = ensureSeatAssignInput(input);
    const seat = await findOwnedSeat(workspaceId, resourceId, seatNumber);

    const currentAssigneeId = seat.assignedTenantCompanyId || seat.assignedDepartmentId;
    if (currentAssigneeId) {
        const requestedId = assignmentType === "tenant" ? input.tenantCompanyId : input.departmentId || input.departmentName;
        const isSameAssignee = requestedId && String(currentAssigneeId) === String(requestedId);
        if (!isSameAssignee) {
            const currentAssigneeName = seat.assignedTenantCompanyName || seat.assignedDepartmentName || "another company or department";
            const error: any = new Error(`Seat ${seat.seatLabel} is already assigned to ${currentAssigneeName}. Release it before assigning it elsewhere.`);
            error.statusCode = 409;
            throw error;
        }
    }

    if (assignmentType === "tenant") {
        seat.assignedTenantCompanyId = new mongoose.Types.ObjectId(input.tenantCompanyId) as any;
        seat.assignedTenantCompanyName = String(input.tenantCompanyName || input.tenantCompanyId || "").trim();
        seat.assignedDepartmentId = "";
        seat.assignedDepartmentName = "";
    } else {
        const departmentId = input.departmentId || input.departmentName || "";
        const departmentName = input.departmentName || input.departmentId || "";
        seat.assignedTenantCompanyId = null as any;
        seat.assignedTenantCompanyName = "";
        seat.assignedDepartmentId = String(departmentId).trim();
        seat.assignedDepartmentName = String(departmentName).trim();
    }
    seat.assignedAt = new Date();

    await seat.save();
    return formatSeat(seat);
}

export async function releaseSeatAssignmentForOwner(workspaceId: string, ownerId: string, resourceId: string, seatNumber: number) {
    const seat = await findOwnedSeat(workspaceId, resourceId, seatNumber);

    seat.assignedTenantCompanyId = null as any;
    seat.assignedTenantCompanyName = "";
    seat.assignedDepartmentId = "";
    seat.assignedDepartmentName = "";
    seat.assignedAt = null as any;

    await seat.save();
    return formatSeat(seat);
}

function emptySummary() {
    return { total: 0, assigned: 0, vacant: 0 };
}

// { total, assigned, vacant } for one resource.
export async function getSeatSummaryForResource(resourceId: string) {
    const [total, assigned] = await Promise.all([
        ResourceSeat.countDocuments({ resourceId: new mongoose.Types.ObjectId(resourceId) }),
        ResourceSeat.countDocuments({
            resourceId: new mongoose.Types.ObjectId(resourceId),
            $or: [{ assignedTenantCompanyId: { $ne: null } }, { assignedDepartmentId: { $ne: "" } }],
        }),
    ]);
    return { total, assigned, vacant: Math.max(0, total - assigned) };
}

const SEAT_AGGREGATE_COUNTS = {
    total: { $sum: 1 },
    assignedToTenant: { $sum: { $cond: [{ $ne: ["$assignedTenantCompanyId", null] }, 1, 0] } },
    assignedToDepartment: { $sum: { $cond: [{ $ne: ["$assignedDepartmentId", ""] }, 1, 0] } },
};

function withDerivedSeatCounts(row: any) {
    const total = row.total;
    const assignedToTenant = row.assignedToTenant;
    const assignedToDepartment = row.assignedToDepartment;
    const assigned = assignedToTenant + assignedToDepartment;
    return { total, assigned, assignedToTenant, assignedToDepartment, vacant: Math.max(0, total - assigned) };
}

// Map<resourceId string, {total, assigned, assignedToTenant, assignedToDepartment, vacant}>
// for every seat-tracked resource in the workspace, computed with a single
// aggregation (no N+1).
export async function getBulkSeatSummaries(workspaceId: string) {
    const rows = await ResourceSeat.aggregate([
        { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
        { $group: { _id: "$resourceId", ...SEAT_AGGREGATE_COUNTS } },
    ]).exec();

    const map = new Map<string, ReturnType<typeof withDerivedSeatCounts>>();
    rows.forEach((row: any) => {
        map.set(String(row._id), withDerivedSeatCounts(row));
    });
    return map;
}

// Total/assigned/vacant (split by tenant vs department) grouped by
// floor+wing+resourceCategory, for the Sales Architecture dashboard.
// Optionally scoped to a single floor and/or wing.
export async function getSeatSummaryByLocation(workspaceId: string, filters: { floor?: string; wing?: string; resourceCategory?: string } = {}) {
    const match: any = { workspaceId: new mongoose.Types.ObjectId(workspaceId) };
    if (filters.floor) match.floor = normalizeResourceFloor(filters.floor);
    if (filters.wing) match.wing = normalizeResourceWing(filters.wing);
    if (filters.resourceCategory) match.resourceCategory = filters.resourceCategory;

    const rows = await ResourceSeat.aggregate([
        { $match: match },
        { $group: { _id: { floor: "$floor", wing: "$wing", resourceCategory: "$resourceCategory" }, ...SEAT_AGGREGATE_COUNTS } },
        { $sort: { "_id.floor": 1, "_id.wing": 1, "_id.resourceCategory": 1 } },
    ]).exec();

    return rows.map((row: any) => ({
        floor: row._id.floor || "",
        wing: row._id.wing || "",
        resourceCategory: row._id.resourceCategory,
        ...withDerivedSeatCounts(row),
    }));
}

// Seats-per-resource grouped by tenant/department assignee, for the Sales
// Architecture Tenants/Departments tabs — those tabs previously grouped
// whole resources by their single assignedTenantCompanyId/assignedDepartmentId,
// which no longer applies to open_desk/cabin_desk now that seats within one
// resource can belong to different assignees. The client merges this with its
// already-loaded resource list (for name/floor/wing/etc.) rather than us
// duplicating that lookup here.
export async function getSeatResourceGroupsByAssignee(workspaceId: string) {
    const [tenantRows, departmentRows] = await Promise.all([
        ResourceSeat.aggregate([
            { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId), assignedTenantCompanyId: { $ne: null } } },
            {
                $group: {
                    _id: { tenantCompanyId: "$assignedTenantCompanyId", resourceId: "$resourceId" },
                    tenantCompanyName: { $first: "$assignedTenantCompanyName" },
                    seatCount: { $sum: 1 },
                },
            },
        ]).exec(),
        ResourceSeat.aggregate([
            { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId), assignedDepartmentId: { $ne: "" } } },
            {
                $group: {
                    _id: { departmentId: "$assignedDepartmentId", resourceId: "$resourceId" },
                    departmentName: { $first: "$assignedDepartmentName" },
                    seatCount: { $sum: 1 },
                },
            },
        ]).exec(),
    ]);

    return {
        tenant: tenantRows.map((row: any) => ({
            tenantCompanyId: String(row._id.tenantCompanyId),
            tenantCompanyName: row.tenantCompanyName,
            resourceId: String(row._id.resourceId),
            seatCount: row.seatCount,
        })),
        department: departmentRows.map((row: any) => ({
            departmentId: row._id.departmentId,
            departmentName: row.departmentName,
            resourceId: String(row._id.resourceId),
            seatCount: row.seatCount,
        })),
    };
}

// Vacant open_desk/cabin_desk counts at one floor+wing, plus the rate each
// category bills at (that block's Resource.pricePerDay — the same field
// tenantRentService treats as the per-desk daily rate). Used by tenant
// onboarding to show "X open desks / Y cabin desks available" before assigning.
export async function getVacantSeatCountsByLocation(workspaceId: string, floor: string, wing: string) {
    const emptyEntry = () => ({ vacant: 0, resourceId: null as string | null, rate: 0 });
    const result: Record<string, ReturnType<typeof emptyEntry>> = { open_desk: emptyEntry(), cabin_desk: emptyEntry() };

    const normalizedFloor = normalizeResourceFloor(floor);
    const normalizedWing = normalizeResourceWing(wing);
    if (!normalizedFloor) return result;

    const [summaryRows, resources] = await Promise.all([
        getSeatSummaryByLocation(workspaceId, { floor: normalizedFloor, wing: normalizedWing }),
        Resource.find({
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            floor: normalizedFloor,
            wing: normalizedWing,
            resourceCategory: { $in: ["open_desk", "cabin_desk"] },
        }).lean().exec(),
    ]);

    summaryRows.forEach((row: any) => {
        if (result[row.resourceCategory]) {
            result[row.resourceCategory].vacant = row.vacant;
        }
    });
    resources.forEach((resource: any) => {
        const entry = result[resource.resourceCategory];
        if (entry && !entry.resourceId) {
            entry.resourceId = String(resource._id);
            entry.rate = Number(resource.pricePerDay || 0);
        }
    });

    return result;
}

async function assignVacantSeats(workspaceId: string, tenantCompanyId: string, tenantCompanyName: string, floor: string, wing: string, resourceCategory: string, count: number) {
    if (count <= 0) return;
    const vacantSeats = await ResourceSeat.find({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        floor,
        wing,
        resourceCategory,
        assignedTenantCompanyId: null,
        assignedDepartmentId: "",
    }).sort({ seatNumber: 1 }).limit(count).exec();

    if (vacantSeats.length < count) {
        const label = resourceCategory === "cabin_desk" ? "cabin desks" : "open desks";
        const location = `Floor ${floor}${wing ? ` Wing ${wing}` : ""}`;
        const error: any = new Error(`Only ${vacantSeats.length} ${label} are vacant on ${location}.`);
        error.statusCode = 409;
        throw error;
    }

    await ResourceSeat.updateMany(
        { _id: { $in: vacantSeats.map((seat) => seat._id) } },
        {
            $set: {
                assignedTenantCompanyId: new mongoose.Types.ObjectId(tenantCompanyId),
                assignedTenantCompanyName: String(tenantCompanyName || "").trim(),
                assignedDepartmentId: "",
                assignedDepartmentName: "",
                assignedAt: new Date(),
            },
        },
    ).exec();
}

async function releaseTenantSeats(workspaceId: string, tenantCompanyId: string, floor: string, wing: string, resourceCategory: string, count: number) {
    if (count <= 0) return;
    const seatsToRelease = await ResourceSeat.find({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        assignedTenantCompanyId: new mongoose.Types.ObjectId(tenantCompanyId),
        floor,
        wing,
        resourceCategory,
    }).sort({ seatNumber: -1 }).limit(count).exec();

    await ResourceSeat.updateMany(
        { _id: { $in: seatsToRelease.map((seat) => seat._id) } },
        { $set: { assignedTenantCompanyId: null, assignedTenantCompanyName: "", assignedAt: null } },
    ).exec();
}

// Reconciles a tenant's assigned ResourceSeats against the desired open/cabin
// desk counts at one floor+wing — assigning more vacant seats when a count
// grows, releasing the highest-numbered ones when it shrinks. A tenant maps
// to a single floor+wing at a time: seats held elsewhere (a prior floor/wing,
// on an edit) are released first. Throws a 409 if a growing count exceeds
// what's actually vacant.
export async function reconcileTenantSeatAssignments(
    workspaceId: string,
    ownerId: string,
    tenantCompanyId: string,
    tenantCompanyName: string,
    floor: string,
    wing: string,
    desiredOpenDesks: number,
    desiredCabinDesks: number,
) {
    const normalizedFloor = normalizeResourceFloor(floor);
    const normalizedWing = normalizeResourceWing(wing);
    const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);
    const tenantObjectId = new mongoose.Types.ObjectId(tenantCompanyId);

    await ResourceSeat.updateMany(
        {
            workspaceId: workspaceObjectId,
            assignedTenantCompanyId: tenantObjectId,
            $or: [{ floor: { $ne: normalizedFloor } }, { wing: { $ne: normalizedWing } }],
        },
        { $set: { assignedTenantCompanyId: null, assignedTenantCompanyName: "", assignedAt: null } },
    ).exec();

    if (!normalizedFloor) return;

    const desiredByCategory: Record<string, number> = {
        open_desk: Math.max(0, Number(desiredOpenDesks || 0)),
        cabin_desk: Math.max(0, Number(desiredCabinDesks || 0)),
    };

    for (const resourceCategory of ["open_desk", "cabin_desk"]) {
        const currentCount = await ResourceSeat.countDocuments({
            workspaceId: workspaceObjectId,
            assignedTenantCompanyId: tenantObjectId,
            floor: normalizedFloor,
            wing: normalizedWing,
            resourceCategory,
        });
        const target = desiredByCategory[resourceCategory];
        if (target > currentCount) {
            await assignVacantSeats(workspaceId, tenantCompanyId, tenantCompanyName, normalizedFloor, normalizedWing, resourceCategory, target - currentCount);
        } else if (target < currentCount) {
            await releaseTenantSeats(workspaceId, tenantCompanyId, normalizedFloor, normalizedWing, resourceCategory, currentCount - target);
        }
    }
}

// Count of ResourceSeats currently assigned to a tenant, by category —
// used by formatTenantCompany to report live open/cabin desk counts.
export async function getAssignedSeatCountsForTenant(workspaceId: string, tenantCompanyId: string) {
    const rows = await ResourceSeat.aggregate([
        {
            $match: {
                workspaceId: new mongoose.Types.ObjectId(workspaceId),
                assignedTenantCompanyId: new mongoose.Types.ObjectId(tenantCompanyId),
            },
        },
        { $group: { _id: "$resourceCategory", count: { $sum: 1 } } },
    ]).exec();

    const counts = { open_desk: 0, cabin_desk: 0 };
    rows.forEach((row: any) => {
        if (row._id in counts) counts[row._id as "open_desk" | "cabin_desk"] = row.count;
    });
    return counts;
}

// Releases every seat currently assigned to a tenant, regardless of floor or
// wing — used when a tenant company becomes inactive (contract expired) so
// its desks go back to the vacant pool instead of permanently blocking new
// tenants from that location.
export async function releaseAllSeatsForTenant(workspaceId: string, tenantCompanyId: string) {
    const result = await ResourceSeat.updateMany(
        {
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            assignedTenantCompanyId: new mongoose.Types.ObjectId(tenantCompanyId),
        },
        { $set: { assignedTenantCompanyId: null, assignedTenantCompanyName: "", assignedAt: null } },
    ).exec();
    return result.modifiedCount;
}

export { emptySummary as emptySeatSummary };
