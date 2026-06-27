// @ts-nocheck
import mongoose from "mongoose";
import { HousekeepingTask } from "../models/HousekeepingTask.js";
import { HousekeepingStaff } from "../models/HousekeepingStaff.js";

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

const generateTaskCode = (number) => `HKT-${String(number).padStart(4, "0")}`;

export const createHousekeepingTask = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!userId) return res.status(401).json({ message: "User is required" });

        const last = await HousekeepingTask.findOne({ workspaceId })
            .sort({ taskNumber: -1 })
            .select("taskNumber")
            .lean()
            .exec();

        const taskNumber = (last?.taskNumber || 0) + 1;
        const taskCode = req.body.taskCode || generateTaskCode(taskNumber);

        const task = await HousekeepingTask.create({
            ...req.body,
            workspaceId,
            ownerId: userId,
            taskNumber,
            taskCode,
        });

        return res.status(201).json({ message: "Housekeeping task created successfully", data: { task } });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: "Task number or code already exists" });
        }
        next(error);
    }
};

export const getHousekeepingTasks = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

        const { status, taskType, area, assignedTo, search, page = 1, limit = 20 } = req.query;
        const filter = { workspaceId };

        if (status) filter.status = status;
        if (taskType) filter.taskType = taskType;
        if (area) filter.area = { $regex: area, $options: "i" };
        if (assignedTo) filter.assignedTo = { $regex: assignedTo, $options: "i" };
        if (search) {
            filter.$or = [
                { taskCode: { $regex: search, $options: "i" } },
                { taskName: { $regex: search, $options: "i" } },
                { assignedTo: { $regex: search, $options: "i" } },
            ];
        }

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.max(Number(limit) || 20, 1);
        const skip = (pageNumber - 1) * limitNumber;

        const [tasks, total] = await Promise.all([
            HousekeepingTask.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNumber)
                .lean()
                .exec(),
            HousekeepingTask.countDocuments(filter),
        ]);

        return res.status(200).json({
            message: "Tasks loaded successfully",
            data: {
                tasks,
                pagination: { total, page: pageNumber, limit: limitNumber, totalPages: Math.ceil(total / limitNumber) },
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getHousekeepingTaskById = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const { taskId } = req.params;

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: "Invalid task id" });
        }

        const task = await HousekeepingTask.findOne({ _id: taskId, workspaceId })
            .lean()
            .exec();

        if (!task) return res.status(404).json({ message: "Task not found" });

        return res.status(200).json({ message: "Task loaded successfully", data: { task } });
    } catch (error) {
        next(error);
    }
};

export const updateHousekeepingTask = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const { taskId } = req.params;

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: "Invalid task id" });
        }

        delete req.body.workspaceId;
        delete req.body.ownerId;
        delete req.body.taskNumber;

        const task = await HousekeepingTask.findOneAndUpdate(
            { _id: taskId, workspaceId },
            req.body,
            { new: true, runValidators: true }
        )
            .lean()
            .exec();

        if (!task) return res.status(404).json({ message: "Task not found" });

        return res.status(200).json({ message: "Task updated successfully", data: { task } });
    } catch (error) {
        next(error);
    }
};

export const completeHousekeepingTask = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const { taskId } = req.params;

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: "Invalid task id" });
        }

        const task = await HousekeepingTask.findOneAndUpdate(
            { _id: taskId, workspaceId },
            {
                status: "Completed",
                completionNote: req.body.completionNote || "",
                completedBy: req.body.completedBy || "System",
                completedByUserId: getCurrentUserId(req),
                completedVia: req.body.completedVia || "software",
                completedAt: new Date(),
            },
            { new: true, runValidators: true }
        )
            .lean()
            .exec();

        if (!task) return res.status(404).json({ message: "Task not found" });

        return res.status(200).json({ message: "Task completed successfully", data: { task } });
    } catch (error) {
        next(error);
    }
};

export const deleteHousekeepingTask = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const { taskId } = req.params;

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: "Invalid task id" });
        }

        const task = await HousekeepingTask.findOneAndDelete({ _id: taskId, workspaceId })
            .lean()
            .exec();

        if (!task) return res.status(404).json({ message: "Task not found" });

        return res.status(200).json({ message: "Task deleted successfully", data: { taskId } });
    } catch (error) {
        next(error);
    }
};

export const createHousekeepingStaff = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!userId) return res.status(401).json({ message: "User is required" });

        const staff = await HousekeepingStaff.create({
            ...req.body,
            workspaceId,
            ownerId: userId,
        });

        return res.status(201).json({ message: "Staff created successfully", data: { staff } });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: "Staff record already exists" });
        }
        next(error);
    }
};

export const getHousekeepingStaff = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

        const { isActive, attendanceStatus, search, page = 1, limit = 50 } = req.query;
        const filter = { workspaceId };

        if (isActive !== undefined) filter.isActive = isActive === "true";
        if (attendanceStatus) filter.attendanceStatus = attendanceStatus;
        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { jobTitle: { $regex: search, $options: "i" } },
            ];
        }

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.max(Number(limit) || 50, 1);
        const skip = (pageNumber - 1) * limitNumber;

        const [staffList, total] = await Promise.all([
            HousekeepingStaff.find(filter)
                .sort({ fullName: 1 })
                .skip(skip)
                .limit(limitNumber)
                .lean()
                .exec(),
            HousekeepingStaff.countDocuments(filter),
        ]);

        return res.status(200).json({
            message: "Staff loaded successfully",
            data: {
                staff: staffList,
                pagination: { total, page: pageNumber, limit: limitNumber, totalPages: Math.ceil(total / limitNumber) },
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getHousekeepingStaffById = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const { staffId } = req.params;

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(staffId)) {
            return res.status(400).json({ message: "Invalid staff id" });
        }

        const staff = await HousekeepingStaff.findOne({ _id: staffId, workspaceId })
            .lean()
            .exec();

        if (!staff) return res.status(404).json({ message: "Staff not found" });

        return res.status(200).json({ message: "Staff loaded successfully", data: { staff } });
    } catch (error) {
        next(error);
    }
};

export const updateHousekeepingStaff = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const { staffId } = req.params;

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(staffId)) {
            return res.status(400).json({ message: "Invalid staff id" });
        }

        delete req.body.workspaceId;
        delete req.body.ownerId;

        const staff = await HousekeepingStaff.findOneAndUpdate(
            { _id: staffId, workspaceId },
            req.body,
            { new: true, runValidators: true }
        )
            .lean()
            .exec();

        if (!staff) return res.status(404).json({ message: "Staff not found" });

        return res.status(200).json({ message: "Staff updated successfully", data: { staff } });
    } catch (error) {
        next(error);
    }
};

export const toggleHousekeepingStaffAttendance = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const { staffId } = req.params;

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(staffId)) {
            return res.status(400).json({ message: "Invalid staff id" });
        }

        const today = new Date().toISOString().split("T")[0];
        const { attendanceStatus } = req.body;

        if (!["Present", "Absent"].includes(attendanceStatus)) {
            return res.status(400).json({ message: "Attendance status must be 'Present' or 'Absent'" });
        }

        const staff = await HousekeepingStaff.findOneAndUpdate(
            { _id: staffId, workspaceId },
            {
                attendanceStatus,
                attendanceDayKey: today,
                attendanceUpdatedAt: new Date(),
            },
            { new: true, runValidators: true }
        )
            .lean()
            .exec();

        if (!staff) return res.status(404).json({ message: "Staff not found" });

        return res.status(200).json({ message: "Attendance updated successfully", data: { staff } });
    } catch (error) {
        next(error);
    }
};

export const deleteHousekeepingStaff = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const { staffId } = req.params;

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(staffId)) {
            return res.status(400).json({ message: "Invalid staff id" });
        }

        const staff = await HousekeepingStaff.findOneAndDelete({ _id: staffId, workspaceId })
            .lean()
            .exec();

        if (!staff) return res.status(404).json({ message: "Staff not found" });

        return res.status(200).json({ message: "Staff deleted successfully", data: { staffId } });
    } catch (error) {
        next(error);
    }
};
