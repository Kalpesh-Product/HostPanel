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

async function resolveDepartmentId(workspaceId, name) {
    if (!name) return null;
    const dept = await Department.findOne({ workspaceId, name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } }).select("_id").lean().exec();
    return dept?._id || null;
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
                message: "You do not have permission to create assets.",
            });
        }

        const { department, assignedTo, assignedToUserId, assignedToDepartment, expiryDate, warrantyExpiry, value, ...rest } = req.body;

        const departmentId = await resolveDepartmentId(workspaceId, department || assignedToDepartment);

        if (roleBand === "admin" || roleBand === "manager") {
            const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
            if (!isDeptAllowed(departmentId, assignedDepartmentIds)) {
                return res.status(403).json({
                    message: "You can only create assets for your assigned departments.",
                });
            }
        }

        let assignedToDepartmentId = null;
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
            assignedToDepartmentId,
            assignedToUserId: assignedToUserId || null,
            expiryDate: resolvedExpiry,
            warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : resolvedExpiry,
            value: normalizeMoneyValue(value),
        });

        const asset = await Asset.findById(created._id)
            .populate("departmentId", "name")
            .populate("assignedToDepartmentId", "name")
            .lean()
            .exec();

        return res.status(201).json({
            message: "Asset created successfully",
            data: {
                asset: {
                    ...asset,
                    department: asset.departmentId?.name || department || "",
                    assignedTo: asset.assignedToDepartmentId?.name || asset.assignedToUserId || assignedTo || "Unassigned",
                },
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
            }
            if (userId) {
                scopeConditions.push({ assignedToUserId: userId });
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
                .lean()
                .exec(),

            Asset.countDocuments(filter),
        ]);

        return res.status(200).json({
            message: "Assets loaded successfully",
            data: {
                assets: assets.map((a) => ({
                    ...a,
                    department: a.departmentId?.name || "",
                    assignedTo: a.assignedToDepartmentId?.name || a.assignedToUserId || "Unassigned",
                })),
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
            .lean()
            .exec();

        if (!asset) {
            return res.status(404).json({
                message: "Asset not found",
            });
        }

        const roleBand = getRoleBand(req.workspaceMembership?.role);
        if (roleBand !== "owner" && roleBand !== "super_admin") {
            const isAssignedToMe = String(asset.assignedToUserId || "") === String(userId || "");
            if (!isAssignedToMe) {
                const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
                const allowed =
                    isDeptAllowed(asset.departmentId?._id || asset.departmentId, assignedDepartmentIds) ||
                    isDeptAllowed(asset.assignedToDepartmentId?._id || asset.assignedToDepartmentId, assignedDepartmentIds);
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
                asset: {
                    ...asset,
                    department: asset.departmentId?.name || "",
                    assignedTo: asset.assignedToDepartmentId?.name || asset.assignedToUserId || "Unassigned",
                },
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

        const existingAsset = await Asset.findOne({ _id: assetId, workspaceId }).select("departmentId assignedToDepartmentId").lean().exec();
        if (!existingAsset) {
            return res.status(404).json({
                message: "Asset not found",
            });
        }

        delete req.body.workspaceId;
        delete req.body.createdBy;
        delete req.body.assetNumber;

        const { department, assignedTo, expiryDate, warrantyExpiry, value, ...updateBody } = req.body;

        if (department) {
            updateBody.departmentId = await resolveDepartmentId(workspaceId, department);
        }
        if (assignedTo && !updateBody.assignedToUserId) {
            updateBody.assignedToDepartmentId = await resolveDepartmentId(workspaceId, assignedTo);
        }

        if (roleBand === "admin" || roleBand === "manager") {
            const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
            const currentlyAllowed =
                isDeptAllowed(existingAsset.departmentId, assignedDepartmentIds) ||
                isDeptAllowed(existingAsset.assignedToDepartmentId, assignedDepartmentIds);
            if (!currentlyAllowed) {
                return res.status(403).json({
                    message: "You can only update assets in your assigned departments.",
                });
            }
            // Only re-validate the owning department when it is actually being changed —
            // assigning to an employee/department doesn't touch departmentId, and re-checking
            // it against the (unchanged) existing value here would falsely block admins/managers
            // who can only reach this asset via assignedToDepartmentId, not departmentId.
            if (updateBody.departmentId !== undefined && !isDeptAllowed(updateBody.departmentId, assignedDepartmentIds)) {
                return res.status(403).json({
                    message: "You can only move assets into your assigned departments.",
                });
            }
        }

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
                asset: {
                    ...asset,
                    department: asset.departmentId?.name || department || "",
                    assignedTo: asset.assignedToDepartmentId?.name || asset.assignedToUserId || assignedTo || "Unassigned",
                },
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

export const transferAsset = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);
        const { assetId } = req.params;

        const {
            assignedToUserId = null,
            assignedToDepartmentId = null,
            transferReason = "",
            transferDate = new Date(),
        } = req.body;

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

        if (assignedToUserId && !mongoose.Types.ObjectId.isValid(assignedToUserId)) {
            return res.status(400).json({
                message: "Invalid assigned user id",
            });
        }

        const roleBand = getRoleBand(req.workspaceMembership?.role);
        if (roleBand === "employee") {
            return res.status(403).json({
                message: "You do not have permission to transfer assets.",
            });
        }

        if (roleBand === "admin" || roleBand === "manager") {
            const existingAsset = await Asset.findOne({ _id: assetId, workspaceId }).select("departmentId assignedToDepartmentId").lean().exec();
            if (!existingAsset) {
                return res.status(404).json({ message: "Asset not found" });
            }
            const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
            const currentlyAllowed =
                isDeptAllowed(existingAsset.departmentId, assignedDepartmentIds) ||
                isDeptAllowed(existingAsset.assignedToDepartmentId, assignedDepartmentIds);
            const targetAllowed = !assignedToDepartmentId || isDeptAllowed(assignedToDepartmentId, assignedDepartmentIds);
            if (!currentlyAllowed || !targetAllowed) {
                return res.status(403).json({
                    message: "You can only transfer assets within your assigned departments.",
                });
            }
        }

        const asset = await Asset.findOneAndUpdate(
            {
                _id: assetId,
                workspaceId,
            },
            {
                assignedToUserId,
                assignedToDepartmentId,
                transferReason,
                transferDate,
            },
            {
                new: true,
                runValidators: true,
            }
        )
            .lean()
            .exec();

        if (!asset) {
            return res.status(404).json({
                message: "Asset not found",
            });
        }

        return res.status(200).json({
            message: "Asset transferred successfully",
            data: { asset },
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
        if (roleBand === "employee") {
            return res.status(403).json({
                message: "You do not have permission to delete assets.",
            });
        }

        if (roleBand === "admin" || roleBand === "manager") {
            const existingAsset = await Asset.findOne({ _id: assetId, workspaceId }).select("departmentId assignedToDepartmentId").lean().exec();
            if (!existingAsset) {
                return res.status(404).json({ message: "Asset not found" });
            }
            const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
            const allowed =
                isDeptAllowed(existingAsset.departmentId, assignedDepartmentIds) ||
                isDeptAllowed(existingAsset.assignedToDepartmentId, assignedDepartmentIds);
            if (!allowed) {
                return res.status(403).json({
                    message: "You can only delete assets in your assigned departments.",
                });
            }
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