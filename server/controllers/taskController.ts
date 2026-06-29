// @ts-nocheck
import mongoose from "mongoose";
import { Task } from "../models/Task.js";

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

const sanitizeTaskUpdate = (body = {}) => {
  const update = {};

  const fields = [
    "title",
    "description",
    "departmentId",
    "raisedBy",
    "raisedByUserId",
    "raisedByDeptId",
    "assignee",
    "assigneeUserId",
    "acceptedBy",
    "acceptedByUserId",
    "completionNote",
    "priority",
    "status",
    "progress",
    "dueDate",
    "acceptedAt",
    "startedAt",
    "completedAt",
    "type",
    "workspaceId",
  ];

  for (const k of fields) {
    if (body[k] !== undefined) update[k] = body[k];
  }

  // Do not allow changing these identity/ownership fields via patch
  delete update.workspaceId;
  delete update.taskNumber;
  delete update.ownerId;
  delete update.taskCode;

  return update;
};

export async function createTask(req, res, next) {
  try {
    const workspaceId = getCurrentWorkspaceId(req);
    const userId = getCurrentUserId(req);

    if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
    if (!userId) return res.status(401).json({ message: "User is required" });

    const {
      taskNumber,
      taskCode,
      type,
      title,
      description,
      departmentId,
      raisedBy,
      raisedByUserId,
      raisedByDeptId,
      assignee,
      assigneeUserId,
      priority,
      status,
      progress,
      dueDate,
      attachments,
      comments,
    } = req.body || {};

    // Required minimums for your Task schema
    if (title === undefined || title === "") return res.status(400).json({ message: "title is required" });
    if (description === undefined || description === "")
      return res.status(400).json({ message: "description is required" });
    if (raisedBy === undefined || raisedBy === "")
      return res.status(400).json({ message: "raisedBy is required" });
    if (dueDate === undefined || dueDate === null)
      return res.status(400).json({ message: "dueDate is required" });

    // If taskNumber/taskCode not provided, auto-generate within workspace.
    let resolvedTaskNumber = taskNumber;
    let resolvedTaskCode = taskCode;

    if (!resolvedTaskNumber) {
      const last = await Task.findOne({ workspaceId }).sort({ taskNumber: -1 }).select("taskNumber").lean();
      resolvedTaskNumber = (last?.taskNumber || 0) + 1;
    }

    if (!resolvedTaskCode) {
      resolvedTaskCode = `TSK-${String(resolvedTaskNumber).padStart(4, "0")}`;
    }

    const doc = await Task.create({
      workspaceId,
      ownerId: userId,
      taskNumber: resolvedTaskNumber,
      taskCode: resolvedTaskCode,
      type: type || "Standard",
      title: String(title).trim(),
      description: String(description).trim(),
      departmentId: departmentId || null,
      raisedBy: String(raisedBy).trim(),
      raisedByUserId: raisedByUserId || null,
      raisedByDeptId: raisedByDeptId || null,
      assignee: assignee || "Unassigned",
      assigneeUserId: assigneeUserId || null,
      priority: priority || "Medium",
      status: status || "Pending",
      progress: progress ?? 0,
      dueDate: new Date(dueDate),
      attachments: Array.isArray(attachments) ? attachments : [],
      comments: Array.isArray(comments) ? comments : [],
    });

    return res.status(201).json({ message: "Task created successfully", data: { task: doc } });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Task number or code already exists in this workspace" });
    }
    next(error);
  }
}

export async function listTasks(req, res, next) {
  try {
    const workspaceId = getCurrentWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

    const {
      status,
      type,
      departmentId,
      assigneeUserId,
      priority,
      from,
      to,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { workspaceId };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (departmentId) filter.departmentId = departmentId;
    if (assigneeUserId) filter.assigneeUserId = assigneeUserId;
    if (priority) filter.priority = priority;

    // dueDate range
    if (from || to) {
      const d: any = {};
      if (from) d.$gte = new Date(String(from));
      if (to) d.$lte = new Date(String(to));
      filter.dueDate = d;
    }

    if (search) {
      const s = String(search);
      filter.$or = [
        { taskCode: { $regex: s, $options: "i" } },
        { title: { $regex: s, $options: "i" } },
        { description: { $regex: s, $options: "i" } },
        { raisedBy: { $regex: s, $options: "i" } },
        { assignee: { $regex: s, $options: "i" } },
      ];
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean()
        .exec(),
      Task.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Tasks loaded successfully",
      data: {
        tasks,
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
}

export async function getTaskById(req, res, next) {
  try {
    const workspaceId = getCurrentWorkspaceId(req);
    const { taskId } = req.params;

    if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
    if (!mongoose.Types.ObjectId.isValid(taskId)) return res.status(400).json({ message: "Invalid task id" });

    const task = await Task.findOne({ _id: taskId, workspaceId }).lean().exec();
    if (!task) return res.status(404).json({ message: "Task not found" });

    return res.status(200).json({ message: "Task loaded successfully", data: { task } });
  } catch (error) {
    next(error);
  }
}

export async function updateTask(req, res, next) {
  try {
    const workspaceId = getCurrentWorkspaceId(req);
    const userId = getCurrentUserId(req);
    const { taskId } = req.params;

    if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
    if (!mongoose.Types.ObjectId.isValid(taskId)) return res.status(400).json({ message: "Invalid task id" });
    if (!userId) return res.status(401).json({ message: "User is required" });

    const update = sanitizeTaskUpdate(req.body);

    const task = await Task.findOneAndUpdate(
      { _id: taskId, workspaceId, ownerId: userId },
      update,
      { new: true, runValidators: true }
    ).lean().exec();

    if (!task) return res.status(404).json({ message: "Task not found" });

    return res.status(200).json({ message: "Task updated successfully", data: { task } });
  } catch (error) {
    next(error);
  }
}

export async function deleteTask(req, res, next) {
  try {
    const workspaceId = getCurrentWorkspaceId(req);
    const userId = getCurrentUserId(req);
    const { taskId } = req.params;

    if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
    if (!mongoose.Types.ObjectId.isValid(taskId)) return res.status(400).json({ message: "Invalid task id" });
    if (!userId) return res.status(401).json({ message: "User is required" });

    const task = await Task.findOneAndDelete({ _id: taskId, workspaceId, ownerId: userId }).lean().exec();
    if (!task) return res.status(404).json({ message: "Task not found" });

    return res.status(200).json({ message: "Task deleted successfully", data: { taskId } });
  } catch (error) {
    next(error);
  }
}

export async function addTaskComment(req, res, next) {
  try {
    const workspaceId = getCurrentWorkspaceId(req);
    const userId = getCurrentUserId(req);
    const { taskId } = req.params;

    if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
    if (!mongoose.Types.ObjectId.isValid(taskId)) return res.status(400).json({ message: "Invalid task id" });
    if (!userId) return res.status(401).json({ message: "User is required" });

    const { text, author, timeLabel } = req.body || {};
    if (!text || !String(text).trim()) return res.status(400).json({ message: "text is required" });

    const task = await Task.findOneAndUpdate(
      { _id: taskId, workspaceId, ownerId: userId },
      {
        $push: {
          comments: {
            author: author || "User",
            text: String(text).trim(),
            timeLabel: timeLabel || "Just now",
          },
        },
      },
      { new: true, runValidators: true }
    ).lean().exec();

    if (!task) return res.status(404).json({ message: "Task not found" });

    return res.status(200).json({ message: "Comment added successfully", data: { task } });
  } catch (error) {
    next(error);
  }
}

export async function addTaskAttachment(req, res, next) {
  try {
    const workspaceId = getCurrentWorkspaceId(req);
    const userId = getCurrentUserId(req);
    const { taskId } = req.params;

    if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
    if (!mongoose.Types.ObjectId.isValid(taskId)) return res.status(400).json({ message: "Invalid task id" });
    if (!userId) return res.status(401).json({ message: "User is required" });

    const { name, size, url, publicId, mimeType } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ message: "name is required" });

    const task = await Task.findOneAndUpdate(
      { _id: taskId, workspaceId, ownerId: userId },
      {
        $push: {
          attachments: {
            name: String(name).trim(),
            size: size || "",
            url: url || "",
            publicId: publicId || "",
            mimeType: mimeType || "",
          },
        },
      },
      { new: true, runValidators: true }
    ).lean().exec();

    if (!task) return res.status(404).json({ message: "Task not found" });

    return res.status(200).json({ message: "Attachment added successfully", data: { task } });
  } catch (error) {
    next(error);
  }
}

