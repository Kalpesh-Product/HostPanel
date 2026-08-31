// @ts-nocheck
import mongoose from "mongoose";
import { Asset } from "../models/Asset.js";
import Department from "../models/Department.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import { AssetCategory } from "../models/AssetCategory.js";
import { AssetSubCategory } from "../models/AssetSubCategory.js";
import FinanceVendor from "../models/FinanceVendor.js";
import { uploadFileToS3 } from "../config/s3config.js";

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
    const ownsAssetDepartment = isDeptAllowed(asset.departmentId, assignedDepartmentIds);

    if (!assignedToUserId) {
        // Pure department-to-department transfer (no employee involved): only the department
        // that actually owns this asset may send its stock elsewhere — mirrors what Founder/
        // Super Admin can do for any asset, but scoped to departments this admin/manager runs.
        if (!ownsAssetDepartment) {
            return { status: 403, message: "Only the department that owns this asset can transfer it to another department." };
        }
        if (String(assignedToDepartmentId) === idString(asset.departmentId)) {
            return { status: 400, message: "The remaining quantity is already held by the owning department." };
        }
        return { targetDepartment, operation: "transfer" };
    }

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

function computeWarrantyExpiry(purchaseDate, warrantyMonths) {
    if (!purchaseDate || !warrantyMonths) return null;
    const parsed = new Date(purchaseDate);
    if (Number.isNaN(parsed.getTime())) return null;
    if (!Number.isFinite(warrantyMonths) || warrantyMonths <= 0) return null;
    const result = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
    result.setUTCMonth(result.getUTCMonth() + warrantyMonths);
    return result;
}

function padUnitSequence(n) {
    return String(n).padStart(4, "0");
}

async function resolveCategoryForAsset({ workspaceId, categoryId, roleBand, assignedDepartmentIds, departmentId }) {
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
        return { error: "A valid category is required" };
    }
    const category = await AssetCategory.findOne({ _id: categoryId, workspaceId }).exec();
    if (!category) return { error: "Category not found" };
    if (departmentId && String(category.departmentId) !== String(departmentId)) {
        return { error: "Selected category does not belong to the selected department." };
    }
    if (roleBand !== "owner" && roleBand !== "super_admin") {
        if (!assignedDepartmentIds.some((d) => d === String(category.departmentId))) {
            return { error: "You do not have access to this category." };
        }
    }
    return { category };
}

function uploadedFileFields(files) {
    return {
        assetImageFile: files?.assetImage?.[0] || null,
        warrantyDocumentFile: files?.warrantyDocument?.[0] || null,
    };
}

async function uploadAssetFile(workspaceId, file, kind) {
    const safeName = String(file.originalname || kind).replace(/[^a-zA-Z0-9._-]/g, "-");
    const uploaded = await uploadFileToS3(`assets/${workspaceId}/${Date.now()}-${kind}-${safeName}`, file);
    return { url: uploaded.url, id: uploaded.id };
}

const assetPopulateFields = [
    { path: "departmentId", select: "name" },
    { path: "assignedToDepartmentId", select: "name" },
    { path: "assignedToUserId", select: "name firstName lastName email" },
    { path: "allocations.departmentId", select: "name" },
    { path: "allocations.userId", select: "name firstName lastName email" },
    { path: "categoryId", select: "categoryName categoryCode requiresSerialNumber" },
    { path: "subCategoryId", select: "subCategoryName" },
    { path: "vendorId", select: "name contactPerson phone email" },
];

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

        const {
            department, assignedTo, assignedToUserId, assignedToDepartment,
            expiryDate, warrantyExpiry, value, price, unitPrice,
            categoryId, subCategoryId, vendorId,
            quantity: rawQuantity, warrantyMonths: rawWarrantyMonths,
            serialNumber, serialNumbers: rawSerialNumbers,
            isTangible, tangable, departmentId: bodyDepartmentId,
            ...rest
        } = req.body;

        const departmentId = bodyDepartmentId && mongoose.Types.ObjectId.isValid(bodyDepartmentId)
            ? bodyDepartmentId
            : await resolveDepartmentId(workspaceId, department || assignedToDepartment);

        if (roleBand === "admin" || roleBand === "manager") {
            const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
            if (!isDeptAllowed(departmentId, assignedDepartmentIds)) {
                return res.status(403).json({
                    message: "Department admins can only add assets to their own department.",
                });
            }
        }

        const assignedDepartmentIdsForCategory = await resolveAssignedDepartmentIds(workspaceId, userId);
        const categoryResult = await resolveCategoryForAsset({
            workspaceId,
            categoryId,
            roleBand,
            assignedDepartmentIds: assignedDepartmentIdsForCategory,
        departmentId,
        });
        if (categoryResult.error) return res.status(400).json({ message: categoryResult.error });
        const category = categoryResult.category;

        let subCategoryDoc = null;
        if (!subCategoryId || !mongoose.Types.ObjectId.isValid(subCategoryId)) {
            return res.status(400).json({ message: "A valid sub category is required" });
        }
        subCategoryDoc = await AssetSubCategory.findOne({
                _id: subCategoryId,
                workspaceId,
                categoryId: category._id,
                departmentId: category.departmentId,
            }).lean().exec();
            if (!subCategoryDoc) {
                return res.status(400).json({ message: "Sub category not found for the selected category." });
            }

        let vendorDoc = null;
        if (vendorId) {
            if (!mongoose.Types.ObjectId.isValid(vendorId)) {
                return res.status(400).json({ message: "A valid vendor is required" });
            }
            vendorDoc = await FinanceVendor.findOne({ _id: vendorId, workspaceId }).lean().exec();
            if (!vendorDoc) return res.status(400).json({ message: "Vendor not found" });
        }

        const quantity = Math.max(1, Number(rawQuantity) || 1);

        const unitPriceNum = unitPrice !== undefined
            ? normalizeMoneyValue(unitPrice)
            : normalizeMoneyValue(value ?? price) / quantity;

        let serialNumbers = [];
        if (rawSerialNumbers) {
            try {
                const parsed = typeof rawSerialNumbers === "string" ? JSON.parse(rawSerialNumbers) : rawSerialNumbers;
                if (Array.isArray(parsed)) serialNumbers = parsed.map((s) => String(s || "").trim());
            } catch {
                serialNumbers = [];
            }
        }
        if (serialNumbers.length === 0 && serialNumber) serialNumbers = [String(serialNumber).trim()];

        if (category.requiresSerialNumber) {
            const hasAllSerials = serialNumbers.length === quantity && serialNumbers.every((s) => s);
            if (!hasAllSerials) {
                return res.status(400).json({
                    message: `This category requires a serial number for each of the ${quantity} unit(s).`,
                });
            }
        }

        const updatedCategory = await AssetCategory.findByIdAndUpdate(
            category._id,
            { $inc: { unitSequence: quantity } },
            { new: true }
        ).exec();
        const startSeq = updatedCategory.unitSequence - quantity + 1;
        const units = Array.from({ length: quantity }, (_, i) => ({
            unitCode: `${category.categoryCode}-${padUnitSequence(startSeq + i)}`,
            serialNumber: serialNumbers[i] || "",
        }));

        const { assetImageFile, warrantyDocumentFile } = uploadedFileFields(req.files);
        const assetImage = assetImageFile ? await uploadAssetFile(workspaceId, assetImageFile, "image") : undefined;
        const warrantyDocument = warrantyDocumentFile
            ? await uploadAssetFile(workspaceId, warrantyDocumentFile, "warranty")
            : undefined;

        const lastAsset = await Asset.findOne({ workspaceId })
            .sort({ assetNumber: -1 })
            .select("assetNumber")
            .lean()
            .exec();

        const assetNumber = (lastAsset?.assetNumber || 0) + 1;
        const assetCode = req.body.assetCode || generateAssetCode(assetNumber);

        const warrantyMonthsNum = rawWarrantyMonths !== undefined && rawWarrantyMonths !== ""
            ? Number(rawWarrantyMonths)
            : null;

        const resolvedExpiry = expiryDate
            ? new Date(expiryDate)
            : computeExpiryDate(rest.purchaseDate, rest.ownershipType, rest.rentDurationMonths);

        const resolvedWarrantyExpiry = warrantyExpiry
            ? new Date(warrantyExpiry)
            : computeWarrantyExpiry(rest.purchaseDate, warrantyMonthsNum);

        const isTangibleValue = !(isTangible === "false" || isTangible === false || tangable === "false" || tangable === false);

        const created = await Asset.create({
            ...rest,
            workspaceId,
            createdBy: userId,
            assetNumber,
            assetCode,
            departmentId,
            categoryId: category._id,
            category: category.categoryName,
            subCategoryId: subCategoryDoc?._id || null,
            vendorId: vendorDoc?._id || null,
            vendor: vendorDoc?.name || rest.vendor || "",
            units,
            serialNumber: quantity === 1 ? (serialNumbers[0] || "") : "",
            quantity,
            warrantyMonths: warrantyMonthsNum,
            isTangible: isTangibleValue,
            assignedToDepartmentId: null,
            assignedToUserId: null,
            allocations: [],
            expiryDate: resolvedExpiry,
            warrantyExpiry: resolvedWarrantyExpiry,
            unitPrice: unitPriceNum,
            value: unitPriceNum * quantity,
            ...(assetImage ? { assetImage } : {}),
            ...(warrantyDocument ? { warrantyDocument } : {}),
        });

        const asset = await Asset.findById(created._id)
            .populate(assetPopulateFields)
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

// Mongoose auto-casts query filter values for find()/countDocuments(), but NOT for
// aggregate()'s $match stage — so any filter built here must already carry real ObjectId
// instances wherever it's going to be reused inside an aggregation pipeline (getAssetSummary).
function toObjectId(value) {
    return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : value;
}

// Shared by getAssets and getAssetSummary so list results and summary totals always agree:
// a Founder/Super Admin sees everything in the workspace, everyone else only sees assets
// their own department(s) own, have been allocated, or that are assigned to them personally.
async function buildAssetScopeFilter(req, workspaceId) {
    const userId = getCurrentUserId(req);
    const filter = { workspaceId: toObjectId(workspaceId) };

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
            const userObjectId = toObjectId(userId);
            scopeConditions.push({ assignedToUserId: userObjectId });
            scopeConditions.push({ "allocations.userId": userObjectId });
        }
        filter.$and = [{ $or: scopeConditions.length > 0 ? scopeConditions : [{ _id: null }] }];
    }

    return filter;
}

export const getAssets = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);

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

        const filter = await buildAssetScopeFilter(req, workspaceId);

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
                .populate(assetPopulateFields)
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
            .populate(assetPopulateFields)
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

        const existingAsset = await Asset.findOne({ _id: assetId, workspaceId }).select("departmentId assignedToDepartmentId allocations quantity categoryId unitPrice").lean().exec();
        if (!existingAsset) {
            return res.status(404).json({
                message: "Asset not found",
            });
        }

        delete req.body.workspaceId;
        delete req.body.createdBy;
        delete req.body.assetNumber;

        const { department, assignedTo, assignedToUserId, assignedToDepartmentId, transferReason, transferDate, expiryDate, warrantyExpiry, value, unitPrice, ...updateBody } = req.body;

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
        delete updateBody.units;

        let newUnits = [];
        if (updateBody.quantity !== undefined) {
            const newQuantity = Math.max(1, Number(updateBody.quantity) || 1);
            const currentQuantity = Math.max(1, Number(existingAsset.quantity) || 1);
            if (newQuantity > currentQuantity && existingAsset.categoryId) {
                const delta = newQuantity - currentQuantity;
                const categoryForUnits = await AssetCategory.findByIdAndUpdate(
                    existingAsset.categoryId,
                    { $inc: { unitSequence: delta } },
                    { new: true }
                ).exec();
                if (categoryForUnits) {
                    const startSeq = categoryForUnits.unitSequence - delta + 1;
                    newUnits = Array.from({ length: delta }, (_, i) => ({
                        unitCode: `${categoryForUnits.categoryCode}-${padUnitSequence(startSeq + i)}`,
                        serialNumber: "",
                    }));
                }
            }
            updateBody.quantity = newQuantity;
        }
        if (expiryDate !== undefined) updateBody.expiryDate = expiryDate ? new Date(expiryDate) : null;
        if (warrantyExpiry !== undefined) updateBody.warrantyExpiry = warrantyExpiry ? new Date(warrantyExpiry) : null;
        const targetQuantity = updateBody.quantity !== undefined
            ? Number(updateBody.quantity)
            : Math.max(1, Number(existingAsset.quantity) || 1);
        if (unitPrice !== undefined) {
            updateBody.unitPrice = normalizeMoneyValue(unitPrice);
            updateBody.value = updateBody.unitPrice * targetQuantity;
        } else if (value !== undefined || updateBody.price !== undefined) {
            updateBody.value = normalizeMoneyValue(value ?? updateBody.price);
            updateBody.unitPrice = updateBody.value / targetQuantity;
        } else if (updateBody.quantity !== undefined) {
            updateBody.value = Number(existingAsset.unitPrice || 0) * targetQuantity;
        }
        delete updateBody.price;

        const targetDepartmentId = updateBody.departmentId || existingAsset.departmentId;

        if (updateBody.categoryId !== undefined) {
            const assignedDepartmentIdsForCategory = await resolveAssignedDepartmentIds(workspaceId, userId);
            const categoryResult = await resolveCategoryForAsset({
                workspaceId,
                categoryId: updateBody.categoryId,
                roleBand,
                assignedDepartmentIds: assignedDepartmentIdsForCategory,
                departmentId: targetDepartmentId,
            });
            if (categoryResult.error) return res.status(400).json({ message: categoryResult.error });
            updateBody.categoryId = categoryResult.category._id;
            updateBody.category = categoryResult.category.categoryName;
        }

        if (updateBody.categoryId !== undefined && updateBody.subCategoryId === undefined) {
            return res.status(400).json({ message: "Select a sub category for the selected category." });
        }

        if (updateBody.subCategoryId !== undefined && updateBody.subCategoryId) {
            if (!mongoose.Types.ObjectId.isValid(updateBody.subCategoryId)) {
                return res.status(400).json({ message: "A valid sub category is required" });
            }
            const targetCategoryId = updateBody.categoryId || existingAsset.categoryId;
            const subCategoryFilter = { _id: updateBody.subCategoryId, workspaceId, categoryId: targetCategoryId };
            const subCategoryDoc = await AssetSubCategory.findOne(subCategoryFilter).lean().exec();
            if (!subCategoryDoc) return res.status(400).json({ message: "Sub category not found for the selected category." });
            if (String(subCategoryDoc.departmentId) !== String(targetDepartmentId)) {
                return res.status(400).json({ message: "Selected sub category does not belong to the selected department." });
            }
            updateBody.subCategoryId = subCategoryDoc._id;
        }

        if (updateBody.vendorId !== undefined && updateBody.vendorId) {
            if (!mongoose.Types.ObjectId.isValid(updateBody.vendorId)) {
                return res.status(400).json({ message: "A valid vendor is required" });
            }
            const vendorDoc = await FinanceVendor.findOne({ _id: updateBody.vendorId, workspaceId }).lean().exec();
            if (!vendorDoc) return res.status(400).json({ message: "Vendor not found" });
            updateBody.vendorId = vendorDoc._id;
            updateBody.vendor = vendorDoc.name;
        }

        if (updateBody.warrantyMonths !== undefined) {
            updateBody.warrantyMonths = updateBody.warrantyMonths !== "" ? Number(updateBody.warrantyMonths) : null;
        }

        if (updateBody.isTangible !== undefined || updateBody.tangable !== undefined) {
            const tangibleRaw = updateBody.isTangible !== undefined ? updateBody.isTangible : updateBody.tangable;
            updateBody.isTangible = !(tangibleRaw === "false" || tangibleRaw === false);
            delete updateBody.tangable;
        }

        const { assetImageFile, warrantyDocumentFile } = uploadedFileFields(req.files);
        if (assetImageFile) updateBody.assetImage = await uploadAssetFile(workspaceId, assetImageFile, "image");
        if (warrantyDocumentFile) updateBody.warrantyDocument = await uploadAssetFile(workspaceId, warrantyDocumentFile, "warranty");

        const mongoUpdate = newUnits.length > 0
            ? { $set: updateBody, $push: { units: { $each: newUnits } } }
            : updateBody;

        const asset = await Asset.findOneAndUpdate(
            {
                _id: assetId,
                workspaceId,
            },
            mongoUpdate,
            {
                new: true,
                runValidators: true,
            }
        )
            .populate(assetPopulateFields)
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
        .populate(assetPopulateFields)
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

        if (validation.operation === "transfer") {
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

        const { departmentId } = req.query;
        const filter = await buildAssetScopeFilter(req, workspaceId);
        if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
            filter.departmentId = new mongoose.Types.ObjectId(departmentId);
        }
        const matchStage = { $match: filter };

        const [
            totalAssets,
            activeAssets,
            inactiveAssets,
            disposedAssets,
            repairAssets,
            ownedAssets,
            rentedAssets,
            totalValueResult,
            quantityResult,
            categorySummary,
            departmentSummary,
        ] = await Promise.all([
            Asset.countDocuments(filter),

            Asset.countDocuments({ ...filter, status: "Active" }),

            Asset.countDocuments({ ...filter, status: "Inactive" }),

            Asset.countDocuments({ ...filter, status: "Disposed" }),

            Asset.countDocuments({ ...filter, status: "Repair" }),

            Asset.countDocuments({ ...filter, ownershipType: "Owned" }),

            Asset.countDocuments({ ...filter, ownershipType: "Rented" }),

            Asset.aggregate([
                matchStage,
                {
                    $group: {
                        _id: null,
                        totalValue: { $sum: "$value" },
                    },
                },
            ]),

            Asset.aggregate([
                matchStage,
                {
                    $group: {
                        _id: null,
                        totalQuantity: { $sum: "$quantity" },
                        totalAllocatedQuantity: {
                            $sum: {
                                $reduce: {
                                    input: { $ifNull: ["$allocations", []] },
                                    initialValue: 0,
                                    in: { $add: ["$$value", { $ifNull: ["$$this.quantity", 0] }] },
                                },
                            },
                        },
                    },
                },
            ]),

            Asset.aggregate([
                matchStage,
                {
                    $group: {
                        _id: "$category",
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
            ]),

            Asset.aggregate([
                matchStage,
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
                totalQuantity: quantityResult?.[0]?.totalQuantity || 0,
                totalAllocatedQuantity: quantityResult?.[0]?.totalAllocatedQuantity || 0,
                categorySummary,
                departmentSummary,
            },
        });
    } catch (error) {
        next(error);
    }
};