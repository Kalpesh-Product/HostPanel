// @ts-nocheck
import mongoose from "mongoose";
import { Task } from "../models/Task.js";
import { createNotification } from "../utils/notify.js";

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

    // Notify assignee if task is assigned to someone else
    if (assigneeUserId && String(assigneeUserId) !== String(userId)) {
      createNotification({
        workspaceId,
        recipientUserId: String(assigneeUserId),
        actorUserId: userId,
        type: "task_assigned",
        category: "task",
        title: "New Task Assigned",
        description: `Task ${doc.taskCode} "${doc.title}" has been assigned to you.`,
        entityType: "task",
        entityId: String(doc._id),
        entityCode: doc.taskCode,
        targetUrl: `/app/tasks`,
        data: { taskCode: doc.taskCode, title: doc.title, priority: doc.priority, dueDate: doc.dueDate },
        priority: doc.priority === "High" ? "high" : "normal",
        isActionRequired: true,
        dedupeKey: `task-assigned:${doc._id}:${assigneeUserId}`,
      });
    }

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

    const existingTask = await Task.findOne({ _id: taskId, workspaceId }).lean().exec();

    const update = sanitizeTaskUpdate(req.body);

    const task = await Task.findOneAndUpdate(
      { _id: taskId, workspaceId, ownerId: userId },
      update,
      { new: true, runValidators: true }
    ).lean().exec();

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Notify assignee on status change or reassignment
    if (existingTask) {
      const statusChanged = req.body.status && req.body.status !== existingTask.status;
      const assigneeChanged = req.body.assigneeUserId && String(req.body.assigneeUserId) !== String(existingTask.assigneeUserId);
      const progressChanged = req.body.progress !== undefined && req.body.progress !== existingTask.progress;

      // Notify new assignee if reassigned
      if (assigneeChanged && task.assigneeUserId) {
        createNotification({
          workspaceId,
          recipientUserId: String(task.assigneeUserId),
          actorUserId: userId,
          type: "task_assigned",
          category: "task",
          title: "Task Reassigned to You",
          description: `Task ${task.taskCode} "${task.title}" has been assigned to you.`,
          entityType: "task",
          entityId: String(task._id),
          entityCode: task.taskCode,
          targetUrl: `/app/tasks`,
          data: { taskCode: task.taskCode, title: task.title, priority: task.priority },
          priority: task.priority === "High" ? "high" : "normal",
          isActionRequired: true,
          dedupeKey: `task-reassigned:${task._id}:${task.assigneeUserId}:${Date.now()}`,
        });
      }

      // Notify task owner of status change
      if (statusChanged && existingTask.ownerId && String(existingTask.ownerId) !== String(userId)) {
        createNotification({
          workspaceId,
          recipientUserId: String(existingTask.ownerId),
          actorUserId: userId,
          type: "task_status_changed",
          category: "task",
          title: "Task Status Updated",
          description: `Task ${task.taskCode} status changed from "${existingTask.status}" to "${task.status}".`,
          entityType: "task",
          entityId: String(task._id),
          entityCode: task.taskCode,
          targetUrl: `/app/tasks`,
          data: { taskCode: task.taskCode, title: task.title, oldStatus: existingTask.status, newStatus: task.status },
          priority: task.status === "Completed" ? "normal" : "low",
          dedupeKey: `task-status:${task._id}:${existingTask.ownerId}:${Date.now()}`,
        });
      }

      // Notify task owner of progress update
      if (progressChanged && !statusChanged && existingTask.ownerId && String(existingTask.ownerId) !== String(userId)) {
        createNotification({
          workspaceId,
          recipientUserId: String(existingTask.ownerId),
          actorUserId: userId,
          type: "task_progress_updated",
          category: "task",
          title: "Task Progress Updated",
          description: `Task ${task.taskCode} progress updated to ${task.progress}%.`,
          entityType: "task",
          entityId: String(task._id),
          entityCode: task.taskCode,
          targetUrl: `/app/tasks`,
          data: { taskCode: task.taskCode, title: task.title, progress: task.progress },
          priority: "low",
          dedupeKey: `task-progress:${task._id}:${existingTask.ownerId}:${Date.now()}`,
        });
      }
    }

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

    const existingTask = await Task.findOne({ _id: taskId, workspaceId }).lean().exec();

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

    // Notify task owner and assignee of new comment (excluding commenter)
    if (existingTask) {
      const commentAuthorName = author || "Someone";
      const recipients = new Set<string>();
      if (existingTask.ownerId) recipients.add(String(existingTask.ownerId));
      if (existingTask.assigneeUserId) recipients.add(String(existingTask.assigneeUserId));
      recipients.delete(String(userId));

      for (const recipientId of recipients) {
        createNotification({
          workspaceId,
          recipientUserId: recipientId,
          actorUserId: userId,
          type: "task_comment",
          category: "task",
          title: "New Comment on Task",
          description: `${commentAuthorName} commented on task ${task.taskCode}: "${String(text).trim().slice(0, 100)}"`,
          entityType: "task",
          entityId: String(task._id),
          entityCode: task.taskCode,
          targetUrl: `/app/tasks`,
          data: { taskCode: task.taskCode, title: task.title, comment: String(text).trim().slice(0, 200) },
          priority: "normal",
          dedupeKey: `task-comment:${task._id}:${recipientId}:${Date.now()}`,
        });
      }
    }

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

