// @ts-nocheck
import mongoose from "mongoose";
import { Asset } from "../models/Asset.js";
import Department from "../models/Department.js";
import WorkspaceMember from "../models/WorkspaceMember.js";

const getCurrentWorkspaceId = (req) => {
    return (
        req.workspaceMembership?.workspace ||
        req.user?.activeWorkspaceId ||
        req.user?.activeWorkspace ||
        req.user?.primaryWorkspace ||
        req.user?.workspaceId ||
        req.body?.workspaceId ||
        req.query?.workspaceId
    );
};

const getCurrentUserId = (req) => {
    return req.user?._id || req.user?.id || req.user || null;
};

const generateAssetCode = (assetNumber) => {
    return `AST-${String(assetNumber).padStart(4, "0")}`;
};

function getRoleBand(role) {
    const r = String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (r === "founder" || r === "owner") return "owner";
    if (r === "super_admin" || r === "superadmin") return "super_admin";
    if (r === "admin" || r === "admin_manager") return "admin";
    if (r === "manager") return "manager";
    return "employee";
}

async function resolveAssignedDepartmentIds(workspaceId, userId) {
    if (!workspaceId || !userId) return [];
    try {
        const membership = await WorkspaceMember.findOne({ workspace: workspaceId, user: userId })
            .select("departments")
            .lean()
            .exec();
        if (!membership?.departments || !Array.isArray(membership.departments)) return [];
        return membership.departments.map((d) => String(d));
    } catch {
        return [];
    }
}

function isDeptAllowed(departmentId, assignedDepartmentIds) {
    if (!departmentId) return false;
    const id = String(departmentId);
    return assignedDepartmentIds.some((d) => d === id);
}

function getPopulatedId(value) {
    return value?._id || value || null;
}

function getUserLabel(user) {
    if (!user || typeof user !== "object") return "";
    return String(
        user.name ||
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.email ||
        ""
    ).trim();
}

function idString(value) {
    return String(getPopulatedId(value) || "");
}

function hasLegacyAllocation(asset) {
    const ownerId = idString(asset.departmentId);
    const assignedDepartmentId = idString(asset.assignedToDepartmentId);
    return Boolean(asset.assignedToUserId || (assignedDepartmentId && assignedDepartmentId !== ownerId));
}

function getEffectiveAllocations(asset) {
    if (Array.isArray(asset.allocations) && asset.allocations.length > 0) return asset.allocations;
    if (!hasLegacyAllocation(asset)) return [];
    return [{
        _id: `legacy-${asset._id}`,
        departmentId: asset.assignedToDepartmentId || asset.departmentId,
        userId: asset.assignedToUserId || null,
        quantity: Math.max(1, Number(asset.quantity) || 1),
        note: asset.transferReason || "Legacy assignment",
        assignedAt: asset.transferDate || asset.updatedAt || asset.createdAt,
    }];
}

function ensureAllocationState(asset) {
    if (!Array.isArray(asset.allocations)) asset.allocations = [];
    if (asset.allocations.length === 0 && hasLegacyAllocation(asset)) {
        asset.allocations.push({
            departmentId: getPopulatedId(asset.assignedToDepartmentId) || getPopulatedId(asset.departmentId),
            userId: getPopulatedId(asset.assignedToUserId) || null,
            quantity: Math.max(1, Number(asset.quantity) || 1),
            note: asset.transferReason || "Legacy assignment",
            assignedAt: asset.transferDate || asset.updatedAt || asset.createdAt || new Date(),
        });
    }
    asset.assignedToDepartmentId = null;
    asset.assignedToUserId = null;
}

function serializeAsset(asset, fallbacks = {}) {
    if (!asset) return asset;
    const allocations = getEffectiveAllocations(asset).map((allocation) => ({
        id: String(allocation._id || ""),
        departmentId: getPopulatedId(allocation.departmentId),
        department: allocation.departmentId?.name || "",
        userId: getPopulatedId(allocation.userId),
        user: getUserLabel(allocation.userId),
        quantity: Math.max(0, Number(allocation.quantity) || 0),
        note: allocation.note || "",
        assignedAt: allocation.assignedAt || null,
    }));
    const totalQuantity = Math.max(1, Number(asset.quantity) || 1);
    const allocatedQuantity = allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
    const onlyAllocation = allocations.length === 1 ? allocations[0] : null;
    const assignedLabel = onlyAllocation
        ? onlyAllocation.user || onlyAllocation.department
        : allocatedQuantity > 0 ? `${allocatedQuantity} of ${totalQuantity} allocated` : "Unassigned";
    return {
        ...asset,
        departmentId: getPopulatedId(asset.departmentId),
        department: asset.departmentId?.name || fallbacks.department || "",
        allocations,
        allocatedQuantity,
        availableQuantity: Math.max(0, totalQuantity - allocatedQuantity),
        assignedToDepartmentId: onlyAllocation?.departmentId || null,
        assignedToDepartment: onlyAllocation?.department || "",
        assignedToUserId: onlyAllocation?.userId || null,
        assignedTo: assignedLabel || fallbacks.assignedTo || "Unassigned",
    };
}

async function resolveDepartmentId(workspaceId, name) {
    if (!name) return null;
    const dept = await Department.findOne({ workspaceId, name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } }).select("_id").lean().exec();
    return dept?._id || null;
}


async function validateAssetTransfer({
    workspaceId,
    userId,
    roleBand,
    asset,
    assignedToDepartmentId,
    assignedToUserId,
}) {
    if (!assignedToDepartmentId || !mongoose.Types.ObjectId.isValid(assignedToDepartmentId)) {
        return { status: 400, message: "A valid target department is required." };
    }

    const targetDepartment = await Department.findOne({
        _id: assignedToDepartmentId,
        workspaceId,
        isActive: true,
    }).select("_id name").lean().exec();
    if (!targetDepartment) return { status: 400, message: "Target department was not found in this workspace." };

    if (assignedToUserId) {
        if (!mongoose.Types.ObjectId.isValid(assignedToUserId)) {
            return { status: 400, message: "Invalid assigned user id." };
        }
        const targetMembership = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: assignedToUserId,
            isActive: true,
            departments: targetDepartment._id,
        }).select("_id role").populate("role", "name").lean().exec();
        if (!targetMembership) {
            return { status: 400, message: "The selected employee does not belong to the target department." };
        }
        const targetRoleBand = getRoleBand(targetMembership.role?.name || targetMembership.role);
        if (targetRoleBand === "owner" || targetRoleBand === "super_admin") {
            return { status: 400, message: "Founder and Super Admin accounts cannot be selected as department employees." };
        }
    }

    if (roleBand === "owner" || roleBand === "super_admin") {
        return { targetDepartment, operation: "transfer" };
    }
    if (roleBand !== "admin" && roleBand !== "manager") {
        return { status: 403, message: "You do not have permission to assign or transfer assets." };
    }

    const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
    if (!isDeptAllowed(assignedToDepartmentId, assignedDepartmentIds)) {
        return { status: 403, message: "Department admins can assign assets only inside their own department." };
    }
    const targetId = String(assignedToDepartmentId);
    const ownsAsset = idString(asset.departmentId) === targetId;
    const hasDepartmentAllocation = getEffectiveAllocations(asset).some((allocation) =>
        idString(allocation.departmentId) === targetId
    );
    if (!ownsAsset && !hasDepartmentAllocation) {
        return { status: 403, message: "This asset has no quantity allocated to your department." };
    }
    return { targetDepartment, operation: "assignment" };
}
function computeExpiryDate(purchaseDate, ownershipType, rentDurationMonths) {
    if (!purchaseDate) return null;
    const parsed = new Date(purchaseDate);
    if (Number.isNaN(parsed.getTime())) return null;
    const months = String(ownershipType || "Owned").trim() === "Rented"
        ? Number(rentDurationMonths)
        : 12;
    if (!Number.isFinite(months) || months <= 0) return null;
    const result = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
    result.setUTCMonth(result.getUTCMonth() + months);
    return result;
}

function normalizeMoneyValue(value) {
    if (value === undefined || value === null || value === "") return 0;
    const numeric = Number(String(value).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
}

export const createAsset = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);

        if (!workspaceId) {
            return res.status(400).json({
                message: "Workspace is required",
            });
        }

        if (!userId) {
            return res.status(401).json({
                message: "User is required",
            });
        }

        const roleBand = getRoleBand(req.workspaceMembership?.role);
        if (roleBand === "employee") {
            return res.status(403).json({
                message: "You do not have permission to add assets.",
            });
        }

        const { department, assignedTo, assignedToUserId, assignedToDepartment, expiryDate, warrantyExpiry, value, ...rest } = req.body;

        const departmentId = await resolveDepartmentId(workspaceId, department || assignedToDepartment);

        if (roleBand === "admin" || roleBand === "manager") {
            const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
            if (!isDeptAllowed(departmentId, assignedDepartmentIds)) {
                return res.status(403).json({
                    message: "Department admins can only add assets to their own department.",
                });
            }
        }

        let assignedToDepartmentId = departmentId;
        if (!assignedToUserId && assignedTo) {
            assignedToDepartmentId = await resolveDepartmentId(workspaceId, assignedTo);
        }

        const lastAsset = await Asset.findOne({ workspaceId })
            .sort({ assetNumber: -1 })
            .select("assetNumber")
            .lean()
            .exec();

        const assetNumber = (lastAsset?.assetNumber || 0) + 1;
        const assetCode = req.body.assetCode || generateAssetCode(assetNumber);

        const resolvedExpiry = expiryDate
            ? new Date(expiryDate)
            : computeExpiryDate(rest.purchaseDate, rest.ownershipType, rest.rentDurationMonths);

        const created = await Asset.create({
            ...rest,
            workspaceId,
            createdBy: userId,
            assetNumber,
            assetCode,
            departmentId,
            assignedToDepartmentId: null,
            assignedToUserId: null,
            allocations: [],
            expiryDate: resolvedExpiry,
            warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : resolvedExpiry,
            value: normalizeMoneyValue(value),
        });

        const asset = await Asset.findById(created._id)
            .populate("departmentId", "name")
            .populate("assignedToDepartmentId", "name")
            .populate("assignedToUserId", "name firstName lastName email")
            .populate("allocations.departmentId", "name")
            .populate("allocations.userId", "name firstName lastName email")
            .lean()
            .exec();

        return res.status(201).json({
            message: "Asset created successfully",
            data: {
                asset: serializeAsset(asset, { department, assignedTo }),
            },
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({
                message: "Asset number or asset code already exists in this workspace",
            });
        }

        next(error);
    }
};

export const getAssets = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);

        if (!workspaceId) {
            return res.status(400).json({
                message: "Workspace is required",
            });
        }

        const {
            status,
            category,
            departmentId,
            assignedToUserId,
            assignedToDepartmentId,
            vendor,
            ownershipType,
            condition,
            search,
            page = 1,
            limit = 20,
        } = req.query;

        const filter = { workspaceId };

        const roleBand = getRoleBand(req.workspaceMembership?.role);
        if (roleBand !== "owner" && roleBand !== "super_admin") {
            const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
            const deptObjectIds = assignedDepartmentIds
                .filter((id) => mongoose.Types.ObjectId.isValid(id))
                .map((id) => new mongoose.Types.ObjectId(id));

            const scopeConditions = [];
            if (deptObjectIds.length > 0) {
                scopeConditions.push({ departmentId: { $in: deptObjectIds } });
                scopeConditions.push({ assignedToDepartmentId: { $in: deptObjectIds } });
                scopeConditions.push({ "allocations.departmentId": { $in: deptObjectIds } });
            }
            if (userId) {
                scopeConditions.push({ assignedToUserId: userId });
                scopeConditions.push({ "allocations.userId": userId });
            }
            filter.$and = [{ $or: scopeConditions.length > 0 ? scopeConditions : [{ _id: null }] }];
        }

        if (status) filter.status = status;
        if (category) filter.category = category;
        if (departmentId) filter.departmentId = departmentId;
        if (assignedToUserId) filter.assignedToUserId = assignedToUserId;
        if (assignedToDepartmentId) filter.assignedToDepartmentId = assignedToDepartmentId;
        if (vendor) filter.vendor = vendor;
        if (ownershipType) filter.ownershipType = ownershipType;
        if (condition) filter.condition = condition;

        if (search) {
            filter.$or = [
                { assetCode: { $regex: search, $options: "i" } },
                { name: { $regex: search, $options: "i" } },
                { serialNumber: { $regex: search, $options: "i" } },
                { brandModel: { $regex: search, $options: "i" } },
                { vendor: { $regex: search, $options: "i" } },
                { invoiceNumber: { $regex: search, $options: "i" } },
            ];
        }

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.max(Number(limit) || 20, 1);
        const skip = (pageNumber - 1) * limitNumber;

        const [assets, total] = await Promise.all([
            Asset.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNumber)
                .populate("departmentId", "name")
                .populate("assignedToDepartmentId", "name")
                .populate("assignedToUserId", "name firstName lastName email")
            .populate("allocations.departmentId", "name")
            .populate("allocations.userId", "name firstName lastName email")
                .lean()
                .exec(),

            Asset.countDocuments(filter),
        ]);

        return res.status(200).json({
            message: "Assets loaded successfully",
            data: {
                assets: assets.map((a) => serializeAsset(a)),
                pagination: {
                    total,
                    page: pageNumber,
                    limit: limitNumber,
                    totalPages: Math.ceil(total / limitNumber),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getAssetById = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);
        const { assetId } = req.params;

        if (!workspaceId) {
            return res.status(400).json({
                message: "Workspace is required",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(assetId)) {
            return res.status(400).json({
                message: "Invalid asset id",
            });
        }

        const asset = await Asset.findOne({
            _id: assetId,
            workspaceId,
        })
            .populate("departmentId", "name")
            .populate("assignedToDepartmentId", "name")
            .populate("assignedToUserId", "name firstName lastName email")
            .populate("allocations.departmentId", "name")
            .populate("allocations.userId", "name firstName lastName email")
            .lean()
            .exec();

        if (!asset) {
            return res.status(404).json({
                message: "Asset not found",
            });
        }

        const roleBand = getRoleBand(req.workspaceMembership?.role);
        if (roleBand !== "owner" && roleBand !== "super_admin") {
            const isAssignedToMe = String(asset.assignedToUserId || "") === String(userId || "") ||
                getEffectiveAllocations(asset).some((allocation) => idString(allocation.userId) === String(userId || ""));
            if (!isAssignedToMe) {
                const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
                const allowed =
                    isDeptAllowed(asset.departmentId?._id || asset.departmentId, assignedDepartmentIds) ||
                    isDeptAllowed(asset.assignedToDepartmentId?._id || asset.assignedToDepartmentId, assignedDepartmentIds) ||
                    getEffectiveAllocations(asset).some((allocation) => isDeptAllowed(allocation.departmentId, assignedDepartmentIds));
                if (!allowed) {
                    return res.status(404).json({
                        message: "Asset not found",
                    });
                }
            }
        }

        return res.status(200).json({
            message: "Asset loaded successfully",
            data: {
                asset: serializeAsset(asset),
            },
        });
    } catch (error) {
        next(error);
    }
};

export const updateAsset = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);
        const { assetId } = req.params;

        if (!workspaceId) {
            return res.status(400).json({
                message: "Workspace is required",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(assetId)) {
            return res.status(400).json({
                message: "Invalid asset id",
            });
        }

        const roleBand = getRoleBand(req.workspaceMembership?.role);
        if (roleBand === "employee") {
            return res.status(403).json({
                message: "You do not have permission to update assets.",
            });
        }

        const existingAsset = await Asset.findOne({ _id: assetId, workspaceId }).select("departmentId assignedToDepartmentId allocations quantity").lean().exec();
        if (!existingAsset) {
            return res.status(404).json({
                message: "Asset not found",
            });
        }

        delete req.body.workspaceId;
        delete req.body.createdBy;
        delete req.body.assetNumber;

        const { department, assignedTo, assignedToUserId, assignedToDepartmentId, transferReason, transferDate, expiryDate, warrantyExpiry, value, ...updateBody } = req.body;

        if (department) {
            updateBody.departmentId = await resolveDepartmentId(workspaceId, department);
        }

        if (roleBand === "admin" || roleBand === "manager") {
            const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
            const currentlyAllowed =
                isDeptAllowed(existingAsset.assignedToDepartmentId, assignedDepartmentIds) ||
                (!existingAsset.assignedToDepartmentId && isDeptAllowed(existingAsset.departmentId, assignedDepartmentIds)) ||
                getEffectiveAllocations(existingAsset).some((allocation) => isDeptAllowed(allocation.departmentId, assignedDepartmentIds));
            if (!currentlyAllowed) {
                return res.status(403).json({
                    message: "Department admins can only edit assets assigned to their own department.",
                });
            }
            // Only re-validate the owning department when it is actually being changed —
            // assigning to an employee/department doesn't touch departmentId, and re-checking
            // it against the (unchanged) existing value here would falsely block admins/managers
            // who can only reach this asset via assignedToDepartmentId, not departmentId.
            if (updateBody.departmentId !== undefined && String(updateBody.departmentId) !== String(existingAsset.departmentId || "")) {
                return res.status(403).json({
                    message: "Only Founder and Super Admin can change an asset owning department.",
                });
            }
        }

        const allocatedQuantity = getEffectiveAllocations(existingAsset).reduce((sum, allocation) => sum + Number(allocation.quantity || 0), 0);
        if (updateBody.quantity !== undefined && Number(updateBody.quantity) < allocatedQuantity) {
            return res.status(400).json({ message: `Quantity cannot be lower than the ${allocatedQuantity} unit(s) already allocated.` });
        }
        delete updateBody.allocations;
        if (expiryDate !== undefined) updateBody.expiryDate = expiryDate ? new Date(expiryDate) : null;
        if (warrantyExpiry !== undefined) updateBody.warrantyExpiry = warrantyExpiry ? new Date(warrantyExpiry) : null;
        if (value !== undefined) updateBody.value = normalizeMoneyValue(value);

        const asset = await Asset.findOneAndUpdate(
            {
                _id: assetId,
                workspaceId,
            },
            updateBody,
            {
                new: true,
                runValidators: true,
            }
        )
            .populate("departmentId", "name")
            .populate("assignedToDepartmentId", "name")
            .populate("assignedToUserId", "name firstName lastName email")
            .populate("allocations.departmentId", "name")
            .populate("allocations.userId", "name firstName lastName email")
            .lean()
            .exec();

        if (!asset) {
            return res.status(404).json({
                message: "Asset not found",
            });
        }

        return res.status(200).json({
            message: "Asset updated successfully",
            data: {
                asset: serializeAsset(asset, { department, assignedTo }),
            },
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({
                message: "Asset code already exists in this workspace",
            });
        }

        next(error);
    }
};

function allocationQuantity(value) {
    const quantity = Number(value);
    return Number.isInteger(quantity) && quantity > 0 ? quantity : 0;
}

function findAllocation(asset, departmentId, userId = null) {
    return asset.allocations.find((allocation) =>
        idString(allocation.departmentId) === String(departmentId) &&
        idString(allocation.userId) === String(userId || "")
    );
}

function addAllocation(asset, { departmentId, userId = null, quantity, note = "" }) {
    const existing = findAllocation(asset, departmentId, userId);
    if (existing) {
        existing.quantity += quantity;
        if (note) existing.note = note;
        existing.assignedAt = new Date();
        return existing;
    }
    asset.allocations.push({ departmentId, userId, quantity, note, assignedAt: new Date() });
    return asset.allocations[asset.allocations.length - 1];
}

async function populatedAsset(assetId, workspaceId) {
    return Asset.findOne({ _id: assetId, workspaceId })
        .populate("departmentId", "name")
        .populate("assignedToDepartmentId", "name")
        .populate("assignedToUserId", "name firstName lastName email")
        .populate("allocations.departmentId", "name")
        .populate("allocations.userId", "name firstName lastName email")
        .lean()
        .exec();
}

export const transferAsset = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);
        const { assetId } = req.params;
        const {
            assignedToUserId = null,
            assignedToDepartmentId = null,
            quantity: requestedQuantity = 1,
            transferReason = "",
        } = req.body;

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(assetId)) return res.status(400).json({ message: "Invalid asset id" });
        const quantity = allocationQuantity(requestedQuantity);
        if (!quantity) return res.status(400).json({ message: "Quantity must be a whole number greater than zero." });
        if (assignedToUserId && quantity !== 1) {
            return res.status(400).json({ message: "Each employee can be assigned exactly one unit of an asset." });
        }

        const roleBand = getRoleBand(req.workspaceMembership?.role);
        if (roleBand === "employee") return res.status(403).json({ message: "You do not have permission to assign or transfer assets." });

        const asset = await Asset.findOne({ _id: assetId, workspaceId });
        if (!asset) return res.status(404).json({ message: "Asset not found" });
        ensureAllocationState(asset);
        if (assignedToUserId && asset.allocations.some((allocation) => idString(allocation.userId) === String(assignedToUserId))) {
            return res.status(400).json({ message: "This employee already has one unit of this asset assigned." });
        }

        const validation = await validateAssetTransfer({ workspaceId, userId, roleBand, asset, assignedToDepartmentId, assignedToUserId });
        if (validation.message) return res.status(validation.status).json({ message: validation.message });

        const ownerDepartmentId = idString(asset.departmentId);
        const targetDepartmentId = String(assignedToDepartmentId);
        const totalAllocated = asset.allocations.reduce((sum, allocation) => sum + Number(allocation.quantity || 0), 0);
        const owningDepartmentAvailable = Math.max(0, Number(asset.quantity || 1) - totalAllocated);

        if (roleBand === "owner" || roleBand === "super_admin") {
            if (!assignedToUserId && targetDepartmentId === ownerDepartmentId) {
                return res.status(400).json({ message: "The remaining quantity is already held by the owning department." });
            }
            if (quantity > owningDepartmentAvailable) {
                return res.status(400).json({ message: `Only ${owningDepartmentAvailable} unallocated unit(s) remain in the owning department.` });
            }
            addAllocation(asset, {
                departmentId: assignedToDepartmentId,
                userId: assignedToUserId || null,
                quantity,
                note: transferReason,
            });
        } else {
            if (!assignedToUserId) {
                return res.status(403).json({ message: "Department admins can assign allocated units only to employees in their own department." });
            }
            if (targetDepartmentId === ownerDepartmentId) {
                if (quantity > owningDepartmentAvailable) {
                    return res.status(400).json({ message: `Only ${owningDepartmentAvailable} unit(s) are available in the owning department.` });
                }
            } else {
                const departmentPool = findAllocation(asset, targetDepartmentId, null);
                const departmentAvailable = Number(departmentPool?.quantity || 0);
                if (quantity > departmentAvailable) {
                    return res.status(400).json({ message: `Only ${departmentAvailable} unit(s) are available for this department.` });
                }
                departmentPool.quantity -= quantity;
                if (departmentPool.quantity === 0) {
                    asset.allocations.splice(asset.allocations.indexOf(departmentPool), 1);
                }
            }
            addAllocation(asset, {
                departmentId: assignedToDepartmentId,
                userId: assignedToUserId,
                quantity,
                note: transferReason,
            });
        }

        asset.transferReason = transferReason;
        asset.transferDate = new Date();
        await asset.save();
        const updated = await populatedAsset(assetId, workspaceId);
        return res.status(200).json({
            message: assignedToUserId ? "Asset quantity assigned successfully" : "Asset quantity transferred successfully",
            data: { asset: serializeAsset(updated) },
        });
    } catch (error) {
        next(error);
    }
};

export const releaseAssetAllocation = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);
        const { assetId, allocationId } = req.params;
        const quantity = allocationQuantity(req.body?.quantity || 1);
        const isLegacyAllocation = String(allocationId || "").startsWith("legacy-");
        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(assetId) || (!isLegacyAllocation && !mongoose.Types.ObjectId.isValid(allocationId))) {
            return res.status(400).json({ message: "Invalid asset allocation." });
        }
        if (!quantity) return res.status(400).json({ message: "Quantity must be a whole number greater than zero." });

        const asset = await Asset.findOne({ _id: assetId, workspaceId });
        if (!asset) return res.status(404).json({ message: "Asset not found" });
        ensureAllocationState(asset);
        // Legacy assets carry their pre-migration assignment on assignedToDepartmentId/assignedToUserId
        // instead of a real allocations subdocument, so the client is shown a synthetic
        // "legacy-<assetId>" id (see getEffectiveAllocations). ensureAllocationState converts that
        // legacy assignment into the sole real allocation just above, so resolve it positionally here.
        const allocation = isLegacyAllocation ? asset.allocations[0] : asset.allocations.id(allocationId);
        if (!allocation) return res.status(404).json({ message: "Asset allocation not found." });
        if (quantity > Number(allocation.quantity || 0)) {
            return res.status(400).json({ message: `Only ${allocation.quantity} unit(s) are assigned in this allocation.` });
        }

        const roleBand = getRoleBand(req.workspaceMembership?.role);
        const isTopManagement = roleBand === "owner" || roleBand === "super_admin";
        if (!isTopManagement) {
            if (roleBand !== "admin" && roleBand !== "manager") {
                return res.status(403).json({ message: "You do not have permission to unassign assets." });
            }
            const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
            if (!isDeptAllowed(allocation.departmentId, assignedDepartmentIds)) {
                return res.status(403).json({ message: "You can unassign or return assets only for your own department." });
            }
        }

        const allocationDepartmentId = idString(allocation.departmentId);
        const ownerDepartmentId = idString(asset.departmentId);
        const wasEmployeeAssignment = Boolean(allocation.userId);
        allocation.quantity -= quantity;
        if (allocation.quantity === 0) allocation.deleteOne();

        if (wasEmployeeAssignment && allocationDepartmentId !== ownerDepartmentId) {
            addAllocation(asset, {
                departmentId: allocationDepartmentId,
                userId: null,
                quantity,
                note: req.body?.reason || "Returned to department pool",
            });
        }

        asset.transferReason = req.body?.reason || (wasEmployeeAssignment ? "Employee assignment removed" : "Returned to owning department");
        asset.transferDate = new Date();
        await asset.save();
        const updated = await populatedAsset(assetId, workspaceId);
        return res.status(200).json({
            message: wasEmployeeAssignment
                ? "Asset quantity unassigned and returned to the department pool"
                : "Asset quantity returned to the owning department",
            data: { asset: serializeAsset(updated) },
        });
    } catch (error) {
        next(error);
    }
};
export const deleteAsset = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);
        const { assetId } = req.params;

        if (!workspaceId) {
            return res.status(400).json({
                message: "Workspace is required",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(assetId)) {
            return res.status(400).json({
                message: "Invalid asset id",
            });
        }

        const roleBand = getRoleBand(req.workspaceMembership?.role);
        if (roleBand !== "owner" && roleBand !== "super_admin") {
            return res.status(403).json({ message: "Only Founder and Super Admin can delete assets." });
        }

        const asset = await Asset.findOneAndDelete({
            _id: assetId,
            workspaceId,
        })
            .lean()
            .exec();

        if (!asset) {
            return res.status(404).json({
                message: "Asset not found",
            });
        }

        return res.status(200).json({
            message: "Asset deleted successfully",
            data: { assetId },
        });
    } catch (error) {
        next(error);
    }
};

export const getAssetSummary = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);

        if (!workspaceId) {
            return res.status(400).json({
                message: "Workspace is required",
            });
        }

        const [
            totalAssets,
            activeAssets,
            inactiveAssets,
            disposedAssets,
            repairAssets,
            ownedAssets,
            rentedAssets,
            totalValueResult,
            categorySummary,
            departmentSummary,
        ] = await Promise.all([
            Asset.countDocuments({ workspaceId }),

            Asset.countDocuments({ workspaceId, status: "Active" }),

            Asset.countDocuments({ workspaceId, status: "Inactive" }),

            Asset.countDocuments({ workspaceId, status: "Disposed" }),

            Asset.countDocuments({ workspaceId, status: "Repair" }),

            Asset.countDocuments({ workspaceId, ownershipType: "Owned" }),

            Asset.countDocuments({ workspaceId, ownershipType: "Rented" }),

            Asset.aggregate([
                { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
                {
                    $group: {
                        _id: null,
                        totalValue: { $sum: "$value" },
                    },
                },
            ]),

            Asset.aggregate([
                { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
                {
                    $group: {
                        _id: "$category",
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
            ]),

            Asset.aggregate([
                { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
                {
                    $group: {
                        _id: "$departmentId",
                        count: { $sum: 1 },
                    },
                },
                {
                    $lookup: {
                        from: "departments",
                        localField: "_id",
                        foreignField: "_id",
                        as: "departmentInfo",
                    },
                },
                {
                    $project: {
                        _id: 1,
                        count: 1,
                        departmentName: { $arrayElemAt: ["$departmentInfo.name", 0] },
                    },
                },
                { $sort: { count: -1 } },
            ]),
        ]);

        return res.status(200).json({
            message: "Asset summary loaded successfully",
            data: {
                totalAssets,
                activeAssets,
                inactiveAssets,
                disposedAssets,
                repairAssets,
                ownedAssets,
                rentedAssets,
                totalValue: totalValueResult?.[0]?.totalValue || 0,
                categorySummary,
                departmentSummary,
            },
        });
    } catch (error) {
        next(error);
    }
};