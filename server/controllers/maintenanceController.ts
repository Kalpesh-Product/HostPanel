// @ts-nocheck
import mongoose from "mongoose";
import { MaintenanceSchedule } from "../models/MaintenanceSchedule.js";
import { RepairLog } from "../models/RepairLog.js";

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

// ─── Maintenance Schedules ──────────────────────────────────────────────────

const generateScheduleCode = (number) => `AMC-${String(number).padStart(4, "0")}`;

export const createMaintenanceSchedule = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!userId) return res.status(401).json({ message: "User is required" });

        const last = await MaintenanceSchedule.findOne({ workspaceId })
            .sort({ scheduleNumber: -1 })
            .select("scheduleNumber")
            .lean()
            .exec();

        const scheduleNumber = (last?.scheduleNumber || 0) + 1;
        const scheduleCode = req.body.scheduleCode || generateScheduleCode(scheduleNumber);

        const schedule = await MaintenanceSchedule.create({
            ...req.body,
            workspaceId,
            ownerId: userId,
            scheduleNumber,
            scheduleCode,
        });

        return res.status(201).json({
            message: "Maintenance schedule created successfully",
            data: { schedule },
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({
                message: "Schedule number or code already exists in this workspace",
            });
        }
        next(error);
    }
};

export const getMaintenanceSchedules = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

        const { status, departmentId, frequency, search, page = 1, limit = 20 } = req.query;
        const filter = { workspaceId };

        if (status) filter.status = status;
        if (departmentId) filter.departmentId = departmentId;
        if (frequency) filter.frequency = frequency;
        if (search) {
            filter.$or = [
                { scheduleCode: { $regex: search, $options: "i" } },
                { assetName: { $regex: search, $options: "i" } },
                { technician: { $regex: search, $options: "i" } },
                { assetCode: { $regex: search, $options: "i" } },
            ];
        }

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.max(Number(limit) || 20, 1);
        const skip = (pageNumber - 1) * limitNumber;

        const [schedules, total] = await Promise.all([
            MaintenanceSchedule.find(filter)
                .sort({ nextServiceDate: 1, createdAt: -1 })
                .skip(skip)
                .limit(limitNumber)
                .lean()
                .exec(),
            MaintenanceSchedule.countDocuments(filter),
        ]);

        return res.status(200).json({
            message: "Schedules loaded successfully",
            data: {
                schedules,
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

export const getMaintenanceScheduleById = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const { scheduleId } = req.params;

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
            return res.status(400).json({ message: "Invalid schedule id" });
        }

        const schedule = await MaintenanceSchedule.findOne({ _id: scheduleId, workspaceId })
            .lean()
            .exec();

        if (!schedule) return res.status(404).json({ message: "Schedule not found" });

        return res.status(200).json({ message: "Schedule loaded successfully", data: { schedule } });
    } catch (error) {
        next(error);
    }
};

export const updateMaintenanceSchedule = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const { scheduleId } = req.params;

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
            return res.status(400).json({ message: "Invalid schedule id" });
        }

        delete req.body.workspaceId;
        delete req.body.ownerId;
        delete req.body.scheduleNumber;

        const schedule = await MaintenanceSchedule.findOneAndUpdate(
            { _id: scheduleId, workspaceId },
            req.body,
            { new: true, runValidators: true }
        )
            .lean()
            .exec();

        if (!schedule) return res.status(404).json({ message: "Schedule not found" });

        return res.status(200).json({ message: "Schedule updated successfully", data: { schedule } });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: "Duplicate key error" });
        }
        next(error);
    }
};

export const deleteMaintenanceSchedule = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const { scheduleId } = req.params;

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
            return res.status(400).json({ message: "Invalid schedule id" });
        }

        const schedule = await MaintenanceSchedule.findOneAndDelete({ _id: scheduleId, workspaceId })
            .lean()
            .exec();

        if (!schedule) return res.status(404).json({ message: "Schedule not found" });

        return res.status(200).json({ message: "Schedule deleted successfully", data: { scheduleId } });
    } catch (error) {
        next(error);
    }
};

export const completeMaintenanceSchedule = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const { scheduleId } = req.params;

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
            return res.status(400).json({ message: "Invalid schedule id" });
        }

        const schedule = await MaintenanceSchedule.findOne({ _id: scheduleId, workspaceId });
        if (!schedule) return res.status(404).json({ message: "Schedule not found" });

        const today = new Date().toISOString().split("T")[0];
        schedule.lastServiceDate = today;

        const nextDate = new Date(today);
        switch (schedule.frequency) {
            case "Monthly": nextDate.setMonth(nextDate.getMonth() + 1); break;
            case "Quarterly": nextDate.setMonth(nextDate.getMonth() + 3); break;
            case "Half-Yearly": nextDate.setMonth(nextDate.getMonth() + 6); break;
            case "Yearly": nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        }
        schedule.nextServiceDate = nextDate.toISOString().split("T")[0];
        schedule.status = "Scheduled";

        schedule.history = [
            {
                date: today,
                note: req.body.note || `Service completed. Next scheduled for ${schedule.nextServiceDate}.`,
                actionType: "completed",
                performedBy: req.body.performedBy || "System",
            },
            ...(Array.isArray(schedule.history) ? schedule.history : []),
        ].slice(0, 12);

        await schedule.save();

        return res.status(200).json({ message: "Schedule completed successfully", data: { schedule } });
    } catch (error) {
        next(error);
    }
};

export const getMaintenanceOverview = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

        const [
            totalSchedules,
            dueSoonSchedules,
            overdueSchedules,
            completedSchedules,
            openRepairLogs,
        ] = await Promise.all([
            MaintenanceSchedule.countDocuments({ workspaceId }),
            MaintenanceSchedule.countDocuments({ workspaceId, status: "Due Soon" }),
            MaintenanceSchedule.countDocuments({ workspaceId, status: "Overdue" }),
            MaintenanceSchedule.countDocuments({ workspaceId, status: "Completed" }),
            RepairLog.countDocuments({ workspaceId, status: { $in: ["Open", "In Progress"] } }),
        ]);

        return res.status(200).json({
            message: "Overview loaded successfully",
            data: {
                totalSchedules,
                dueSoonSchedules,
                overdueSchedules,
                completedSchedules,
                openRepairLogs,
                healthySchedules: totalSchedules - (dueSoonSchedules + overdueSchedules),
                uptimePercentage: totalSchedules > 0
                    ? Math.round(((totalSchedules - overdueSchedules) / totalSchedules) * 100)
                    : 100,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─── Repair Logs (Maintenance) ──────────────────────────────────────────────

const generateRepairLogCode = (number) => `RPL-${String(number).padStart(4, "0")}`;

export const createMaintenanceRepairLog = async (req, res, next) => {
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
            message: "Repair log created successfully",
            data: { repairLog },
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: "Repair log number or code already exists" });
        }
        next(error);
    }
};

export const getMaintenanceRepairLogs = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

        const { status, departmentId, search, page = 1, limit = 20 } = req.query;
        const filter = { workspaceId };

        if (status) filter.status = status;
        if (departmentId) filter.departmentId = departmentId;
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
            message: "Repair logs loaded successfully",
            data: {
                repairLogs,
                pagination: { total, page: pageNumber, limit: limitNumber, totalPages: Math.ceil(total / limitNumber) },
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getMaintenanceRepairLogById = async (req, res, next) => {
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

export const updateMaintenanceRepairLog = async (req, res, next) => {
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

export const deleteMaintenanceRepairLog = async (req, res, next) => {
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

