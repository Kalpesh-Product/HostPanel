// @ts-nocheck
import mongoose from "mongoose";
import { AssetCategory } from "../models/AssetCategory.js";
import { AssetSubCategory } from "../models/AssetSubCategory.js";
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

const getCurrentUserId = (req) => req.user?._id || req.user?.id || req.user || null;

function getRoleBand(role) {
    const r = String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (r === "founder" || r === "owner") return "owner";
    if (r === "super_admin" || r === "superadmin") return "super_admin";
    if (r === "admin" || r === "admin_manager") return "admin";
    if (r === "manager") return "manager";
    return "employee";
}

function isTopManagement(roleBand) {
    return roleBand === "owner" || roleBand === "super_admin";
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
    return assignedDepartmentIds.some((d) => d === String(departmentId));
}

function slugifyToCode(name) {
    const cleaned = String(name || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
    return (cleaned.slice(0, 3) || "AST").padEnd(3, "X");
}

async function generateCategoryCode(workspaceId, categoryName) {
    const base = slugifyToCode(categoryName);
    let code = base;
    let suffix = 1;
    while (await AssetCategory.exists({ workspaceId, categoryCode: code })) {
        suffix += 1;
        code = `${base}${suffix}`;
    }
    return code;
}

export const getCategories = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);
        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

        const roleBand = getRoleBand(req.workspaceMembership?.role);
        const filter = { workspaceId };
        const requestedDepartmentId = req.query?.departmentId;
        if (requestedDepartmentId) {
            if (!mongoose.Types.ObjectId.isValid(requestedDepartmentId)) {
                return res.status(400).json({ message: "A valid department is required" });
            }
            filter.departmentId = new mongoose.Types.ObjectId(requestedDepartmentId);
        }

        if (!isTopManagement(roleBand)) {
            const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
            const deptObjectIds = assignedDepartmentIds
                .filter((id) => mongoose.Types.ObjectId.isValid(id))
                .map((id) => new mongoose.Types.ObjectId(id));
            if (requestedDepartmentId && !isDeptAllowed(requestedDepartmentId, assignedDepartmentIds)) {
                return res.status(403).json({ message: "You can only view categories for your own department." });
            }
            if (!requestedDepartmentId) filter.departmentId = { $in: deptObjectIds.length > 0 ? deptObjectIds : [null] };
        }

        const categories = await AssetCategory.find(filter)
            .sort({ categoryName: 1 })
            .populate("departmentId", "name")
            .lean()
            .exec();

        const categoryIds = categories.map((c) => c._id);
        const subCategories = await AssetSubCategory.find({ workspaceId, categoryId: { $in: categoryIds } })
            .select("subCategoryName categoryId")
            .lean()
            .exec();

        const subCategoriesByCategory = new Map();
        for (const sub of subCategories) {
            const key = String(sub.categoryId);
            if (!subCategoriesByCategory.has(key)) subCategoriesByCategory.set(key, []);
            subCategoriesByCategory.get(key).push({ subCategoryName: sub.subCategoryName });
        }

        const result = categories.map((cat) => ({
            _id: cat._id,
            categoryName: cat.categoryName,
            categoryCode: cat.categoryCode,
            requiresSerialNumber: !!cat.requiresSerialNumber,
            isActive: cat.isActive,
            department: cat.departmentId ? { _id: cat.departmentId._id, name: cat.departmentId.name } : null,
            subCategories: subCategoriesByCategory.get(String(cat._id)) || [],
        }));

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const createCategory = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);
        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

        const roleBand = getRoleBand(req.workspaceMembership?.role);
        const { assetCategoryName, departmentId, requiresSerialNumber } = req.body;

        if (!assetCategoryName || !String(assetCategoryName).trim()) {
            return res.status(400).json({ message: "Category name is required" });
        }
        if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
            return res.status(400).json({ message: "A valid department is required" });
        }

        if (!isTopManagement(roleBand)) {
            const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
            if (!isDeptAllowed(departmentId, assignedDepartmentIds)) {
                return res.status(403).json({ message: "You can only create categories for your own department." });
            }
        }

        const categoryCode = await generateCategoryCode(workspaceId, assetCategoryName);

        const category = await AssetCategory.create({
            workspaceId,
            departmentId,
            categoryName: String(assetCategoryName).trim(),
            categoryCode,
            requiresSerialNumber: requiresSerialNumber === true || requiresSerialNumber === "true",
            createdBy: userId,
        });

        return res.status(201).json({ message: "Category created successfully", data: category });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: "A category with this name already exists for this department." });
        }
        next(error);
    }
};

export const updateCategory = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);
        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

        const { assetCategoryId, categoryName, status, requiresSerialNumber } = req.body;
        if (!assetCategoryId || !mongoose.Types.ObjectId.isValid(assetCategoryId)) {
            return res.status(400).json({ message: "A valid category id is required" });
        }

        const existing = await AssetCategory.findOne({ _id: assetCategoryId, workspaceId }).lean().exec();
        if (!existing) return res.status(404).json({ message: "Category not found" });

        const roleBand = getRoleBand(req.workspaceMembership?.role);
        if (!isTopManagement(roleBand)) {
            const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
            if (!isDeptAllowed(existing.departmentId, assignedDepartmentIds)) {
                return res.status(403).json({ message: "You can only edit categories for your own department." });
            }
        }

        const update = {};
        if (categoryName !== undefined) update.categoryName = String(categoryName).trim();
        if (status !== undefined) update.isActive = status === true || status === "true";
        if (requiresSerialNumber !== undefined) {
            update.requiresSerialNumber = requiresSerialNumber === true || requiresSerialNumber === "true";
        }

        const category = await AssetCategory.findOneAndUpdate(
            { _id: assetCategoryId, workspaceId },
            update,
            { new: true, runValidators: true }
        ).exec();

        return res.status(200).json({ message: "Category updated successfully", data: category });
    } catch (error) {
        next(error);
    }
};

export const getSubCategories = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);
        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

        const roleBand = getRoleBand(req.workspaceMembership?.role);
        const filter = { workspaceId };
        const requestedDepartmentId = req.query?.departmentId;
        if (requestedDepartmentId) {
            if (!mongoose.Types.ObjectId.isValid(requestedDepartmentId)) {
                return res.status(400).json({ message: "A valid department is required" });
            }
            filter.departmentId = new mongoose.Types.ObjectId(requestedDepartmentId);
        }

        if (!isTopManagement(roleBand)) {
            const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
            const deptObjectIds = assignedDepartmentIds
                .filter((id) => mongoose.Types.ObjectId.isValid(id))
                .map((id) => new mongoose.Types.ObjectId(id));
            if (requestedDepartmentId && !isDeptAllowed(requestedDepartmentId, assignedDepartmentIds)) {
                return res.status(403).json({ message: "You can only view sub categories for your own department." });
            }
            if (!requestedDepartmentId) filter.departmentId = { $in: deptObjectIds.length > 0 ? deptObjectIds : [null] };
        }

        const subCategories = await AssetSubCategory.find(filter)
            .sort({ subCategoryName: 1 })
            .populate("categoryId", "categoryName")
            .populate("departmentId", "name")
            .lean()
            .exec();

        const result = subCategories.map((sub) => ({
            _id: sub._id,
            subCategoryName: sub.subCategoryName,
            isActive: sub.isActive,
            category: sub.categoryId ? { _id: sub.categoryId._id, categoryName: sub.categoryId.categoryName } : null,
            department: sub.departmentId ? { _id: sub.departmentId._id, name: sub.departmentId.name } : null,
        }));

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const createSubCategory = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);
        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

        const { assetSubCategoryName, assetCategoryId } = req.body;
        if (!assetSubCategoryName || !String(assetSubCategoryName).trim()) {
            return res.status(400).json({ message: "Sub category name is required" });
        }
        if (!assetCategoryId || !mongoose.Types.ObjectId.isValid(assetCategoryId)) {
            return res.status(400).json({ message: "A valid category is required" });
        }

        const parentCategory = await AssetCategory.findOne({ _id: assetCategoryId, workspaceId }).lean().exec();
        if (!parentCategory) return res.status(404).json({ message: "Category not found" });

        const roleBand = getRoleBand(req.workspaceMembership?.role);
        if (!isTopManagement(roleBand)) {
            const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
            if (!isDeptAllowed(parentCategory.departmentId, assignedDepartmentIds)) {
                return res.status(403).json({ message: "You can only add sub categories for your own department." });
            }
        }

        const subCategory = await AssetSubCategory.create({
            workspaceId,
            departmentId: parentCategory.departmentId,
            categoryId: assetCategoryId,
            subCategoryName: String(assetSubCategoryName).trim(),
            createdBy: userId,
        });

        return res.status(201).json({ message: "Sub category created successfully", data: subCategory });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: "A sub category with this name already exists for this category." });
        }
        next(error);
    }
};

export const updateSubCategory = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);
        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

        const { assetSubCategoryId, subCategoryName, status } = req.body;
        if (!assetSubCategoryId || !mongoose.Types.ObjectId.isValid(assetSubCategoryId)) {
            return res.status(400).json({ message: "A valid sub category id is required" });
        }

        const existing = await AssetSubCategory.findOne({ _id: assetSubCategoryId, workspaceId }).lean().exec();
        if (!existing) return res.status(404).json({ message: "Sub category not found" });

        const roleBand = getRoleBand(req.workspaceMembership?.role);
        if (!isTopManagement(roleBand)) {
            const assignedDepartmentIds = await resolveAssignedDepartmentIds(workspaceId, userId);
            if (!isDeptAllowed(existing.departmentId, assignedDepartmentIds)) {
                return res.status(403).json({ message: "You can only edit sub categories for your own department." });
            }
        }

        const update = {};
        if (subCategoryName !== undefined) update.subCategoryName = String(subCategoryName).trim();
        if (status !== undefined) update.isActive = status === true || status === "true";

        const subCategory = await AssetSubCategory.findOneAndUpdate(
            { _id: assetSubCategoryId, workspaceId },
            update,
            { new: true, runValidators: true }
        ).exec();

        return res.status(200).json({ message: "Sub category updated successfully", data: subCategory });
    } catch (error) {
        next(error);
    }
};
