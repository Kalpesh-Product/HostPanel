// @ts-nocheck
import mongoose from "mongoose";
import { HousekeepingTask } from "../models/HousekeepingTask.js";
import { HousekeepingStaff } from "../models/HousekeepingStaff.js";
import EmployeeProfile from "../models/EmployeeProfile.js";

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

// Lean queries (and plain mongoose documents serialized as-is) only carry
// `_id`, but the client reads `.id` everywhere — mirror the `id` mapping
// `transformBooking` does for meeting room bookings so task/staff actions
// (edit, cancel, assign, mark done, attendance) actually resolve a real id
// instead of silently calling the API with `undefined`.
const withId = (doc) => {
    if (!doc) return doc;
    const obj = typeof doc.toObject === "function" ? doc.toObject() : doc;
    return { ...obj, id: String(obj._id) };
};

const withStaffLabel = (doc) => {
    const obj = withId(doc);
    // Every record in this collection is a direct registry entry today (no
    // merge with legacy EmployeeProfile records exists yet), so sourceType
    // is always "registry" — the client uses it to decide whether the
    // Present/Absent attendance controls apply to a given row.
    return obj ? { ...obj, label: obj.fullName, sourceType: "registry" } : obj;
};

const startOfToday = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

// Recurring daily tasks are created from a native <input type="time">, so
// startTaskTime is always "HH:MM" (24h). Parse defensively in case older
// data ever carries a "h:mm AM/PM" string instead.
const parseTimeToMinutes = (value) => {
    if (!value || typeof value !== "string") return null;
    const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return null;
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const period = match[3]?.toUpperCase();
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
};

const MIN_RECURRING_TASK_GAP_MINUTES = 30;

// A staff member can't be in two places at once, so their recurring daily
// tasks (the fixed schedule, not one-off "additional" tasks) must be at
// least 30 minutes apart. Returns the clashing task, or null.
const findRecurringTimeConflict = async (workspaceId, assigneeEmployeeProfileId, startTaskTime, excludeTaskId) => {
    const newMinutes = parseTimeToMinutes(startTaskTime);
    if (!assigneeEmployeeProfileId || newMinutes === null) return null;

    const filter = {
        workspaceId,
        assigneeEmployeeProfileId,
        sourceType: { $ne: "booking" },
        isRecurring: true,
        status: { $ne: "Cancelled" },
    };
    if (excludeTaskId) filter._id = { $ne: excludeTaskId };

    const candidates = await HousekeepingTask.find(filter)
        .select("taskName startTaskTime")
        .lean()
        .exec();

    for (const candidate of candidates) {
        const candidateMinutes = parseTimeToMinutes(candidate.startTaskTime);
        if (candidateMinutes === null) continue;
        const diff = Math.abs(candidateMinutes - newMinutes);
        const wrappedDiff = Math.min(diff, 1440 - diff);
        if (wrappedDiff < MIN_RECURRING_TASK_GAP_MINUTES) return candidate;
    }
    return null;
};

const nextTaskNumber = async (workspaceId) => {
    const last = await HousekeepingTask.findOne({ workspaceId })
        .sort({ taskNumber: -1 })
        .select("taskNumber")
        .lean()
        .exec();
    return (last?.taskNumber || 0) + 1;
};

// For every recurring series, if its latest instance is from a prior day
// (and that instance wasn't cancelled, which discontinues the series),
// clone it forward into a fresh "today" instance. The stale instance is left
// exactly as it is — if it was never completed it keeps showing up as
// overdue in the Daily Scheduled Tasks tab instead of silently vanishing.
const ensureDailyTaskInstances = async (workspaceId) => {
    const today = startOfToday();

    const latestPerSeries = await HousekeepingTask.aggregate([
        { $match: { workspaceId, isRecurring: true, templateId: { $ne: null } } },
        { $sort: { scheduledDate: -1, createdAt: -1 } },
        { $group: { _id: "$templateId", latest: { $first: "$$ROOT" } } },
    ]);

    for (const { latest } of latestPerSeries) {
        if (latest.status === "Cancelled") continue;
        const latestDay = latest.scheduledDate ? new Date(latest.scheduledDate) : null;
        if (latestDay && latestDay.getTime() >= today.getTime()) continue;

        const taskNumber = await nextTaskNumber(workspaceId);
        await HousekeepingTask.create({
            workspaceId,
            ownerId: latest.ownerId,
            taskNumber,
            taskCode: generateTaskCode(taskNumber),
            taskName: latest.taskName,
            taskType: latest.taskType,
            area: latest.area,
            floor: latest.floor,
            wing: latest.wing,
            assignedTo: latest.assignedTo,
            assigneeEmployeeProfileId: latest.assigneeEmployeeProfileId,
            startTaskTime: latest.startTaskTime,
            timeSlotLabel: latest.timeSlotLabel,
            sourceType: "manual",
            status: "Pending",
            isAutoGenerated: true,
            isRecurring: true,
            templateId: latest.templateId,
            scheduledDate: today,
        });
    }
};

export const createHousekeepingTask = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!userId) return res.status(401).json({ message: "User is required" });

        const taskNumber = await nextTaskNumber(workspaceId);
        const taskCode = req.body.taskCode || generateTaskCode(taskNumber);
        // Manually created scheduled tasks repeat daily by default; the
        // client sends isRecurring: false for an explicit one-time task.
        const isRecurring = req.body.sourceType !== "booking" && req.body.isRecurring !== false;
        const { isRecurring: _ignored, applyToToday: _ignored2, ...rest } = req.body;

        if (isRecurring && rest.assigneeEmployeeProfileId && rest.startTaskTime) {
            const conflict = await findRecurringTimeConflict(workspaceId, rest.assigneeEmployeeProfileId, rest.startTaskTime);
            if (conflict) {
                return res.status(409).json({
                    message: `This staff member already has "${conflict.taskName}" at ${conflict.startTaskTime} — daily tasks need at least a ${MIN_RECURRING_TASK_GAP_MINUTES}-minute gap.`,
                });
            }
        }

        const task = await HousekeepingTask.create({
            ...rest,
            workspaceId,
            ownerId: userId,
            taskNumber,
            taskCode,
            isRecurring,
            scheduledDate: startOfToday(),
        });

        if (isRecurring) {
            task.templateId = task._id;
            await task.save();
        }

        return res.status(201).json({ message: "Housekeeping task created successfully", data: { task: withId(task) } });
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

        await ensureDailyTaskInstances(workspaceId);

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
                tasks: tasks.map(withId),
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

        return res.status(200).json({ message: "Task loaded successfully", data: { task: withId(task) } });
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
        delete req.body.templateId;
        delete req.body.scheduledDate;

        const existingTask = await HousekeepingTask.findOne({ _id: taskId, workspaceId }).lean().exec();
        if (!existingTask) return res.status(404).json({ message: "Task not found" });

        const effectiveIsRecurring = req.body.isRecurring !== undefined ? req.body.isRecurring : existingTask.isRecurring;
        const effectiveAssignee = req.body.assigneeEmployeeProfileId !== undefined ? req.body.assigneeEmployeeProfileId : existingTask.assigneeEmployeeProfileId;
        const effectiveStartTime = req.body.startTaskTime !== undefined ? req.body.startTaskTime : existingTask.startTaskTime;

        if (effectiveIsRecurring && effectiveAssignee && effectiveStartTime) {
            const conflict = await findRecurringTimeConflict(workspaceId, effectiveAssignee, effectiveStartTime, taskId);
            if (conflict) {
                return res.status(409).json({
                    message: `This staff member already has "${conflict.taskName}" at ${conflict.startTaskTime} — daily tasks need at least a ${MIN_RECURRING_TASK_GAP_MINUTES}-minute gap.`,
                });
            }
        }

        // Any path that flips a task to Completed (the status dropdown, not
        // just the dedicated complete endpoint) needs to stamp completedAt,
        // or the task never gets an end time. Reopening it clears that stamp.
        if (req.body.status === "Completed" && existingTask.status !== "Completed") {
            req.body.completedAt = new Date();
            if (!req.body.completedBy) req.body.completedBy = existingTask.assignedTo || "Admin";
            if (!req.body.completedVia) req.body.completedVia = "software";
        } else if (req.body.status && req.body.status !== "Completed" && existingTask.status === "Completed") {
            req.body.completedAt = null;
        }

        const task = await HousekeepingTask.findOneAndUpdate(
            { _id: taskId, workspaceId },
            req.body,
            { new: true, runValidators: true }
        )
            .lean()
            .exec();

        if (!task) return res.status(404).json({ message: "Task not found" });

        return res.status(200).json({ message: "Task updated successfully", data: { task: withId(task) } });
    } catch (error) {
        next(error);
    }
};

export const updateHousekeepingTaskRequirements = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const { taskId } = req.params;
        const { index, fulfilled } = req.body;

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: "Invalid task id" });
        }
        if (!Number.isInteger(index) || index < 0) {
            return res.status(400).json({ message: "A valid requirement index is required" });
        }

        const task = await HousekeepingTask.findOne({ _id: taskId, workspaceId }).exec();
        if (!task) return res.status(404).json({ message: "Task not found" });
        if (!task.requirements?.[index]) {
            return res.status(404).json({ message: "Requirement not found" });
        }

        task.requirements[index].fulfilled = Boolean(fulfilled);
        await task.save();

        return res.status(200).json({ message: "Requirement updated successfully", data: { task: withId(task) } });
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

        return res.status(200).json({ message: "Task completed successfully", data: { task: withId(task) } });
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

const deriveFullName = (body) => {
    if (body.fullName) return body.fullName;
    return [body.firstName, body.middleName, body.lastName].filter(Boolean).join(" ").trim();
};

export const createHousekeepingStaff = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        const userId = getCurrentUserId(req);

        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
        if (!userId) return res.status(401).json({ message: "User is required" });

        const staff = await HousekeepingStaff.create({
            ...req.body,
            fullName: deriveFullName(req.body),
            phone: req.body.phone || req.body.mobilePhone || "",
            workspaceId,
            ownerId: userId,
        });

        return res.status(201).json({ message: "Staff created successfully", data: { staff: withStaffLabel(staff) } });
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
                staff: staffList.map(withStaffLabel),
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

        return res.status(200).json({ message: "Staff loaded successfully", data: { staff: withStaffLabel(staff) } });
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

        const updates = { ...req.body };
        if (updates.firstName || updates.middleName || updates.lastName) {
            updates.fullName = deriveFullName(updates);
        }
        if (updates.mobilePhone && !updates.phone) {
            updates.phone = updates.mobilePhone;
        }

        const staff = await HousekeepingStaff.findOneAndUpdate(
            { _id: staffId, workspaceId },
            updates,
            { new: true, runValidators: true }
        )
            .lean()
            .exec();

        if (!staff) return res.status(404).json({ message: "Staff not found" });

        return res.status(200).json({ message: "Staff updated successfully", data: { staff: withStaffLabel(staff) } });
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

        return res.status(200).json({ message: "Attendance updated successfully", data: { staff: withStaffLabel(staff) } });
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

export const getHousekeepingStaffPerformance = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

        const [staffList, tasks] = await Promise.all([
            EmployeeProfile.find({ workspaceId, isHousekeepingStaff: true, status: "active" }).lean().exec(),
            HousekeepingTask.find({
                workspaceId,
                assigneeEmployeeProfileId: { $ne: null },
                status: { $ne: "Cancelled" },
            }).lean().exec(),
        ]);

        const tasksByStaffId = new Map();
        for (const task of tasks) {
            const key = String(task.assigneeEmployeeProfileId);
            if (!tasksByStaffId.has(key)) tasksByStaffId.set(key, []);
            tasksByStaffId.get(key).push(task);
        }

        const performance = staffList.map((staff) => {
            const staffTasks = tasksByStaffId.get(String(staff._id)) || [];
            const tasksAssigned = staffTasks.length;
            const completedTasks = staffTasks.filter((t) => t.status === "Completed");
            const tasksCompleted = completedTasks.length;
            const onTimeTasks = completedTasks.filter(
                (t) => t.dueAt && t.completedAt && new Date(t.completedAt) <= new Date(t.dueAt)
            );
            const pendingCount = staffTasks.filter(
                (t) => t.status === "Pending" || t.status === "Assigned" || t.status === "In Progress"
            ).length;

            return {
                staffId: String(staff._id),
                fullName: staff.fullName,
                tasksAssigned,
                tasksCompleted,
                completionRate: tasksAssigned ? Math.round((tasksCompleted / tasksAssigned) * 100) : 0,
                onTimeRate: tasksCompleted ? Math.round((onTimeTasks.length / tasksCompleted) * 100) : 0,
                pendingCount,
            };
        });

        return res.status(200).json({ message: "Performance loaded successfully", data: { performance } });
    } catch (error) {
        next(error);
    }
};

// HR-onboarded housekeeping staff — EmployeeProfile records flagged
// isHousekeepingStaff, created via HR's Add Employee flow with the
// Housekeeping job role (no login/invite). Distinct from the legacy
// HousekeepingStaff collection above, which the other tabs still use.
export const getHousekeepingEmployees = async (req, res, next) => {
    try {
        const workspaceId = getCurrentWorkspaceId(req);
        if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

        const employees = await EmployeeProfile.find({ workspaceId, isHousekeepingStaff: true })
            .sort({ fullName: 1 })
            .populate("departments", "name")
            .lean()
            .exec();

        return res.status(200).json({
            message: "Housekeeping employees loaded successfully",
            data: {
                employees: employees.map((employee) => {
                    const departmentNames = (employee.departments || [])
                        .map((dept) => (dept && typeof dept === "object" ? dept.name : ""))
                        .filter(Boolean);
                    return {
                        ...withId(employee),
                        department: departmentNames[0] || "Administration",
                        departments: departmentNames,
                        phone: employee.phone || "",
                        currentAddress: employee.currentAddress || "",
                    };
                }),
            },
        });
    } catch (error) {
        next(error);
    }
};
