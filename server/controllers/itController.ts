// @ts-nocheck
import mongoose from "mongoose";
import { RepairLog } from "../models/RepairLog.js";
import { Asset } from "../models/Asset.js";

const getCurrentWorkspaceId = (req) => {
    return (
        req.workspaceMembership?.workspace ||
        req.user?.activeWorkspaceId ||
        req.user?.activeWorkspace ||
        req.user?.primaryWorkspace ||
        req.user?.workspaceId ||
        req.query?.workspaceId ||
        req.body?.workspaceId
    );
};

const getCurrentUserId = (req) => {
    return req.user?._id || req.user?.id || req.user || null;
};

const generateRepairLogCode = (number) => `IT-RPL-${String(number).padStart(4, "0")}`;

// ─── IT Repair Logs ─────────────────────────────────────────────────────────

export const createITRepairLog = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!userId) return res.status(401).json({ message: "User is required" });

        const last = await RepairLog.findOne({ workspaceId })
            .sort({ repairLogNumber: -1 })
            .select("repairLogNumber")
            .lean()
            .exec();

        const repairLogNumber = (last?.repairLogNumber || 0) + 1;
        const repairLogCode = req.body.repairLogCode || generateRepairLogCode(repairLogNumber);

        const repairLog = await RepairLog.create({
            ...req.body,
            workspaceId,
            ownerId: userId,
            repairLogNumber,
            repairLogCode,
        });

        return res.status(201).json({
            message: "IT repair log created successfully",
            data: { repairLog },
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: "Repair log number or code already exists" });
        }
        next(error);
    }
};

export const getITRepairLogs = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

        const { status, departmentId, assetId, search, page = 1, limit = 20 } = req.query;
        const filter = { workspaceId };

        if (status) filter.status = status;
        if (departmentId) filter.departmentId = departmentId;
        if (assetId) filter.assetId = assetId;
        if (search) {
            filter.$or = [
                { repairLogCode: { $regex: search, $options: "i" } },
                { assetName: { $regex: search, $options: "i" } },
                { assignedTo: { $regex: search, $options: "i" } },
                { issueType: { $regex: search, $options: "i" } },
            ];
        }

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.max(Number(limit) || 20, 1);
        const skip = (pageNumber - 1) * limitNumber;

        const [repairLogs, total] = await Promise.all([
            RepairLog.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNumber)
                .lean()
                .exec(),
            RepairLog.countDocuments(filter),
        ]);

        return res.status(200).json({
            message: "IT repair logs loaded successfully",
            data: {
                repairLogs,
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

export const getITRepairLogById = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const { repairLogId } = req.params;

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(repairLogId)) {
            return res.status(400).json({ message: "Invalid repair log id" });
        }

        const repairLog = await RepairLog.findOne({ _id: repairLogId, workspaceId })
            .lean()
            .exec();

        if (!repairLog) return res.status(404).json({ message: "Repair log not found" });

        return res.status(200).json({ message: "Repair log loaded successfully", data: { repairLog } });
    } catch (error) {
        next(error);
    }
};

export const updateITRepairLog = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const { repairLogId } = req.params;

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(repairLogId)) {
            return res.status(400).json({ message: "Invalid repair log id" });
        }

        delete req.body.workspaceId;
        delete req.body.ownerId;
        delete req.body.repairLogNumber;

        const repairLog = await RepairLog.findOneAndUpdate(
            { _id: repairLogId, workspaceId },
            req.body,
            { new: true, runValidators: true }
        )
            .lean()
            .exec();

        if (!repairLog) return res.status(404).json({ message: "Repair log not found" });

        return res.status(200).json({ message: "Repair log updated successfully", data: { repairLog } });
    } catch (error) {
        next(error);
    }
};

export const deleteITRepairLog = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const { repairLogId } = req.params;

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(repairLogId)) {
            return res.status(400).json({ message: "Invalid repair log id" });
        }

        const repairLog = await RepairLog.findOneAndDelete({ _id: repairLogId, workspaceId })
            .lean()
            .exec();

        if (!repairLog) return res.status(404).json({ message: "Repair log not found" });

        return res.status(200).json({ message: "Repair log deleted successfully", data: { repairLogId } });
    } catch (error) {
        next(error);
    }
};

export const getITOverview = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

        const { departmentId } = req.query;
        const filter = { workspaceId };
        if (departmentId) filter.departmentId = departmentId;

        const [openLogs, inProgressLogs, resolvedLogs, closedLogs, totalLogs] = await Promise.all([
            RepairLog.countDocuments({ ...filter, status: "Open" }),
            RepairLog.countDocuments({ ...filter, status: "In Progress" }),
            RepairLog.countDocuments({ ...filter, status: "Resolved" }),
            RepairLog.countDocuments({ ...filter, status: "Closed" }),
            RepairLog.countDocuments(filter),
        ]);

        return res.status(200).json({
            message: "IT overview loaded successfully",
            data: {
                totalLogs,
                openLogs,
                inProgressLogs,
                resolvedLogs,
                closedLogs,
                resolutionRate: totalLogs > 0 ? Math.round((resolvedLogs / totalLogs) * 100) : 0,
            },
        });
    } catch (error) {
        next(error);
    }
};

