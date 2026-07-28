// @ts-nocheck
import mongoose from "mongoose";
import { Asset } from "../models/Asset.js";
import { AssetRequest } from "../models/AssetRequest.js";
import Department from "../models/Department.js";
import WorkspaceMember from "../models/WorkspaceMember.js";

const workspaceIdOf = (req) => req.workspaceMembership?.workspace || req.user?.activeWorkspaceId || req.user?.workspaceId;
const userIdOf = (req) => req.user?._id || req.user?.id || req.user;
const roleBandOf = (role) => {
    const value = String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (value === "founder" || value === "owner") return "owner";
    if (value === "super_admin" || value === "superadmin") return "super_admin";
    if (value === "admin" || value === "admin_manager") return "admin";
    if (value === "manager") return "manager";
    return "employee";
};
const idOf = (value) => String(value?._id || value || "");
const userLabel = (value) => String(value?.name || [value?.firstName, value?.lastName].filter(Boolean).join(" ") || value?.email || "").trim();

async function memberDepartmentContext(workspaceId, userId) {
    const membership = await WorkspaceMember.findOne({ workspace: workspaceId, user: userId, isActive: true })
        .select("departments")
        .populate("departments", "name")
        .lean()
        .exec();
    const departments = membership?.departments || [];
    return { ids: departments.map(idOf), names: departments.map((department) => String(department?.name || "").trim()) };
}

async function memberDepartmentIds(workspaceId, userId) {
    return (await memberDepartmentContext(workspaceId, userId)).ids;
}

const isHrDepartmentName = (name) => ["hr", "human resources", "human resource"].includes(String(name || "").trim().toLowerCase());

const populateRequest = (query) => query
    .populate("requestedByUserId", "name firstName lastName email")
    .populate("requestingDepartmentId", "name")
    .populate("owningDepartmentId", "name")
    .populate("reviewedByUserId", "name firstName lastName email")
    .populate("fulfilledByUserId", "name firstName lastName email")
    .populate("fulfilledAssetId", "name assetCode quantity");

function serializeRequest(request) {
    return {
        ...request,
        id: idOf(request._id),
        requestedByUserId: idOf(request.requestedByUserId),
        requestedBy: userLabel(request.requestedByUserId),
        requestingDepartmentId: idOf(request.requestingDepartmentId),
        requestingDepartment: request.requestingDepartmentId?.name || "",
        owningDepartmentId: idOf(request.owningDepartmentId),
        owningDepartment: request.owningDepartmentId?.name || "",
        reviewedByUserId: idOf(request.reviewedByUserId) || null,
        reviewedBy: userLabel(request.reviewedByUserId),
        fulfilledByUserId: idOf(request.fulfilledByUserId) || null,
        fulfilledBy: userLabel(request.fulfilledByUserId),
        fulfilledAssetId: idOf(request.fulfilledAssetId) || null,
        fulfilledAsset: request.fulfilledAssetId?.name || "",
        fulfilledAssetCode: request.fulfilledAssetId?.assetCode || "",
    };
}

export const createAssetRequest = async (req, res, next) => {
    try {
        const workspaceId = workspaceIdOf(req);
        const userId = userIdOf(req);
        const roleBand = roleBandOf(req.workspaceMembership?.role);
        if (!workspaceId || !userId) return res.status(400).json({ message: "Workspace and user are required." });
        if (!["owner", "super_admin", "admin", "manager"].includes(roleBand)) {
            return res.status(403).json({ message: "Asset requests can be raised by department managers and administrators." });
        }
        const { requestingDepartmentId, owningDepartmentId, assetName, category = "Hardware", quantity, employeeName = "", purpose, neededBy = null, priority = "Medium" } = req.body || {};
        if (![requestingDepartmentId, owningDepartmentId].every((id) => mongoose.Types.ObjectId.isValid(id))) {
            return res.status(400).json({ message: "Valid requesting and owning departments are required." });
        }
        if (!String(assetName || "").trim() || !String(purpose || "").trim()) {
            return res.status(400).json({ message: "Asset name and purpose are required." });
        }
        const numericQuantity = Number(quantity);
        if (!Number.isInteger(numericQuantity) || numericQuantity < 1) {
            return res.status(400).json({ message: "Quantity must be a whole number greater than zero." });
        }
        const departments = await Department.find({
            _id: { $in: [requestingDepartmentId, owningDepartmentId] },
            workspaceId,
            isActive: true,
        }).select("_id").lean().exec();
        if (departments.length !== 2 && String(requestingDepartmentId) !== String(owningDepartmentId)) {
            return res.status(400).json({ message: "One or more selected departments were not found." });
        }
        if (roleBand !== "owner" && roleBand !== "super_admin") {
            const departmentContext = await memberDepartmentContext(workspaceId, userId);
            const canRequestForOtherDepartment = departmentContext.names.some(isHrDepartmentName);
            if (!departmentContext.ids.includes(String(requestingDepartmentId)) && !canRequestForOtherDepartment) {
                return res.status(403).json({ message: "Only HR, Founder, and Super Admin can request for another department." });
            }
        }
        const latest = await AssetRequest.findOne({ workspaceId }).sort({ requestNumber: -1 }).select("requestNumber").lean().exec();
        const requestNumber = Number(latest?.requestNumber || 0) + 1;
        const created = await AssetRequest.create({
            workspaceId,
            requestNumber,
            requestCode: `AR-${String(requestNumber).padStart(4, "0")}`,
            requestedByUserId: userId,
            requestingDepartmentId,
            owningDepartmentId,
            assetName: String(assetName).trim(),
            category,
            quantity: numericQuantity,
            employeeName: String(employeeName || "").trim(),
            purpose: String(purpose).trim(),
            neededBy: neededBy ? new Date(neededBy) : null,
            priority,
        });
        const request = await populateRequest(AssetRequest.findById(created._id)).lean().exec();
        return res.status(201).json({ message: "Asset request raised successfully.", data: { request: serializeRequest(request) } });
    } catch (error) {
        next(error);
    }
};

export const getAssetRequests = async (req, res, next) => {
    try {
        const workspaceId = workspaceIdOf(req);
        const userId = userIdOf(req);
        if (!workspaceId) return res.status(400).json({ message: "Workspace is required." });
        const roleBand = roleBandOf(req.workspaceMembership?.role);
        const filter = { workspaceId };
        if (roleBand !== "owner" && roleBand !== "super_admin") {
            const departmentIds = (await memberDepartmentIds(workspaceId, userId))
                .filter((id) => mongoose.Types.ObjectId.isValid(id))
                .map((id) => new mongoose.Types.ObjectId(id));
            filter.$or = [
                { requestedByUserId: userId },
                { requestingDepartmentId: { $in: departmentIds } },
                { owningDepartmentId: { $in: departmentIds } },
            ];
        }
        if (req.query?.status) filter.status = req.query.status;
        const requests = await populateRequest(AssetRequest.find(filter).sort({ createdAt: -1 })).lean().exec();
        return res.status(200).json({ message: "Asset requests loaded successfully.", data: { requests: requests.map(serializeRequest) } });
    } catch (error) {
        next(error);
    }
};

export const updateAssetRequestStatus = async (req, res, next) => {
    try {
        const workspaceId = workspaceIdOf(req);
        const userId = userIdOf(req);
        const roleBand = roleBandOf(req.workspaceMembership?.role);
        const { requestId } = req.params;
        const status = String(req.body?.status || "");
        const reviewNote = String(req.body?.reviewNote || "").trim();
        if (!mongoose.Types.ObjectId.isValid(requestId)) return res.status(400).json({ message: "Invalid asset request." });
        if (!["Approved", "Rejected", "Cancelled"].includes(status)) {
            return res.status(400).json({ message: "Status must be Approved, Rejected, or Cancelled." });
        }
        const request = await AssetRequest.findOne({ _id: requestId, workspaceId });
        if (!request) return res.status(404).json({ message: "Asset request not found." });
        if (request.status !== "Pending") return res.status(400).json({ message: "Only pending requests can be reviewed or cancelled." });

        const isTopManagement = roleBand === "owner" || roleBand === "super_admin";
        if (status === "Cancelled") {
            if (!isTopManagement && idOf(request.requestedByUserId) !== idOf(userId)) {
                return res.status(403).json({ message: "Only the requester can cancel this request." });
            }
        } else if (!isTopManagement) {
            if (roleBand !== "admin" && roleBand !== "manager") {
                return res.status(403).json({ message: "You do not have permission to review asset requests." });
            }
            const departmentIds = await memberDepartmentIds(workspaceId, userId);
            if (!departmentIds.includes(idOf(request.owningDepartmentId))) {
                return res.status(403).json({ message: "Only the owning department can approve or reject this request." });
            }
        }
        request.status = status;
        request.reviewNote = reviewNote;
        request.reviewedByUserId = status === "Cancelled" ? null : userId;
        await request.save();
        const updated = await populateRequest(AssetRequest.findById(request._id)).lean().exec();
        return res.status(200).json({ message: `Asset request ${status.toLowerCase()} successfully.`, data: { request: serializeRequest(updated) } });
    } catch (error) {
        next(error);
    }
};

export const fulfillAssetRequest = async (req, res, next) => {
    try {
        const workspaceId = workspaceIdOf(req);
        const userId = userIdOf(req);
        const roleBand = roleBandOf(req.workspaceMembership?.role);
        const { requestId } = req.params;
        const { assetId } = req.body || {};
        if (roleBand !== "owner" && roleBand !== "super_admin") {
            return res.status(403).json({ message: "Only Founder and Super Admin can fulfill cross-department requests." });
        }
        if (!mongoose.Types.ObjectId.isValid(requestId)) {
            return res.status(400).json({ message: "A valid request ID is required." });
        }
        const request = await AssetRequest.findOne({ _id: requestId, workspaceId });
        if (!request) return res.status(404).json({ message: "Request not found." });
        if (request.status !== "Approved") return res.status(400).json({ message: "Only approved requests can be fulfilled." });

        if (!mongoose.Types.ObjectId.isValid(assetId)) {
            return res.status(400).json({ message: "A valid asset is required." });
        }
        const asset = await Asset.findOne({ _id: assetId, workspaceId });
        if (!asset) return res.status(404).json({ message: "Asset not found." });
        if (idOf(asset.departmentId) !== idOf(request.owningDepartmentId)) {
            return res.status(400).json({ message: "The selected asset is not owned by the requested owning department." });
        }
        const allocated = (asset.allocations || []).reduce((sum, allocation) => sum + Number(allocation.quantity || 0), 0);
        const available = Math.max(0, Number(asset.quantity || 1) - allocated);
        if (request.quantity > available) {
            return res.status(400).json({ message: `Only ${available} unit(s) of the selected asset remain available.` });
        }
        const existingPool = (asset.allocations || []).find((allocation) =>
            !allocation.userId && idOf(allocation.departmentId) === idOf(request.requestingDepartmentId)
        );
        if (existingPool) {
            existingPool.quantity += request.quantity;
            existingPool.note = `Fulfilled ${request.requestCode}`;
            existingPool.assignedAt = new Date();
        } else {
            asset.allocations.push({
                departmentId: request.requestingDepartmentId,
                userId: null,
                quantity: request.quantity,
                note: `Fulfilled ${request.requestCode}`,
                assignedAt: new Date(),
            });
        }
        asset.transferReason = `Fulfilled asset request ${request.requestCode}`;
        asset.transferDate = new Date();
        await asset.save();

        request.status = "Fulfilled";
        request.fulfilledByUserId = userId;
        request.fulfilledAssetId = asset._id;
        request.fulfilledAt = new Date();
        await request.save();
        const updated = await populateRequest(AssetRequest.findById(request._id)).lean().exec();
        return res.status(200).json({ message: "Asset request fulfilled and quantity transferred successfully.", data: { request: serializeRequest(updated) } });
    } catch (error) {
        next(error);
    }
};
