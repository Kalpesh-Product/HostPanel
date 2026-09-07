// @ts-nocheck
import mongoose from "mongoose";
import { Task } from "../models/Task.js";
import { Department } from "../models/Department.js";
import HostUser from "../models/HostUser.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import { createNotification, notifyMultipleRecipients } from "../utils/notify.js";
import { uploadFileToS3 } from "../config/s3config.js";

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

// req.user is just the raw user id (see verifyJwt), not a populated
// document — this must look the name up rather than read it off req.user
// directly, or it always falls through to the "A team member" fallback.
const getCurrentUserName = async (req) => {
  const userId = getCurrentUserId(req);
  if (!userId) return "A team member";
  const user = await HostUser.findById(userId).select("name email").lean().exec();
  return user?.name || user?.email || "A team member";
};

// Lean queries bypass mongoose toJSON transforms, so documents reach the
// client with only `_id`. TasksPage addresses every task through `task.id`
// (view drawer, accept/complete calls, React keys), so expose `id` — plus a
// readable `department` name and comment `time` — alongside the raw fields.
const serializeTask = (task) => {
  if (!task) return task;

  const departmentDoc = task.departmentId;
  const departmentName =
    typeof departmentDoc === "object" && departmentDoc !== null
      ? departmentDoc.name || ""
      : "";

  return {
    ...task,
    id: String(task._id),
    department: departmentName,
    comments: (task.comments || []).map((comment) => ({
      ...comment,
      time: comment.time || comment.timeLabel || "",
    })),
  };
};

const serializeTasks = (tasks) => (Array.isArray(tasks) ? tasks.map(serializeTask) : []);

const TASKS_ROUTE_URL = "/extra-common-modules/tasks";

const formatFileSize = (sizeInBytes) => {
  const bytes = Number(sizeInBytes) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// The Delegate Task form submits a department NAME (dropdown label); resolve
// it to the workspace's Department document so department-scoped queues work.
const resolveDepartmentId = async (workspaceId, departmentId, departmentName) => {
  if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
    const department = await Department.findOne({
      _id: departmentId,
      workspaceId,
    })
      .select("_id")
      .lean();
    if (department) return department._id;
  }

  const name = String(departmentName || "").trim();
  if (!name) return null;

  const department = await Department.findOne({ workspaceId, name })
    .collation({ locale: "en", strength: 2 })
    .select("_id")
    .lean();
  return department?._id || null;
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
      department,
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

    const resolvedDepartmentId = await resolveDepartmentId(workspaceId, departmentId, department);

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
      departmentId: resolvedDepartmentId || null,
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
        targetUrl: TASKS_ROUTE_URL,
        data: { taskCode: doc.taskCode, title: doc.title, priority: doc.priority, dueDate: doc.dueDate },
        priority: doc.priority === "High" ? "high" : "normal",
        isActionRequired: true,
        dedupeKey: `task-assigned:${doc._id}:${assigneeUserId}`,
      });
    } else if (resolvedDepartmentId) {
      // Routed to a department queue with no specific person yet — let
      // every member of that department (admin/manager/employee) know a
      // new task has arrived so any of them can accept and assign it.
      const departmentMembers = await WorkspaceMember.find({
        workspace: workspaceId,
        departments: resolvedDepartmentId,
        isActive: true,
      })
        .select("user")
        .lean();
      const recipientIds = departmentMembers
        .map((member) => String(member.user))
        .filter((id) => id !== String(userId));

      if (recipientIds.length > 0) {
        notifyMultipleRecipients(recipientIds, {
          workspaceId,
          actorUserId: userId,
          type: "task_department_queue",
          category: "task",
          title: "New Task for Your Department",
          description: `Task ${doc.taskCode} "${doc.title}" was assigned by ${doc.raisedBy} and is waiting to be accepted.`,
          entityType: "task",
          entityId: String(doc._id),
          entityCode: doc.taskCode,
          targetUrl: TASKS_ROUTE_URL,
          data: { taskCode: doc.taskCode, title: doc.title, priority: doc.priority, dueDate: doc.dueDate },
          priority: doc.priority === "High" ? "high" : "normal",
          isActionRequired: true,
          dedupeKey: `task-dept-queue:${doc._id}`,
        });
      }
    }

    return res.status(201).json({ message: "Task created successfully", data: { task: serializeTask(doc) } });
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
        .populate("departmentId", "name")
        .lean()
        .exec(),
      Task.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Tasks loaded successfully",
      data: {
        tasks: serializeTasks(tasks),
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

    const task = await Task.findOne({ _id: taskId, workspaceId })
      .populate("departmentId", "name")
      .lean()
      .exec();
    if (!task) return res.status(404).json({ message: "Task not found" });

    return res.status(200).json({ message: "Task loaded successfully", data: { task: serializeTask(task) } });
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

    const existingTask = await Task.findOne({ _id: taskId, workspaceId })
      .populate("departmentId", "name")
      .lean()
      .exec();

    const update = sanitizeTaskUpdate(req.body);

    // Task detail fields (title/description/type/priority/dueDate) can only
    // be edited while the task is still Pending — once someone has accepted
    // it, its details are locked in.
    const DETAIL_FIELDS = ["title", "description", "type", "priority", "dueDate"];
    const isEditingDetails = DETAIL_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(update, field));
    if (isEditingDetails && existingTask && existingTask.status !== "Pending") {
      return res
        .status(409)
        .json({ message: "This task has already been accepted and its details can no longer be edited." });
    }

    // An Approval-type task's Approved/Rejected decision is final — once
    // made, the status can't be flipped to something else.
    const TERMINAL_APPROVAL_STATUSES = ["Approved", "Rejected"];
    if (
      Object.prototype.hasOwnProperty.call(update, "status") &&
      existingTask &&
      TERMINAL_APPROVAL_STATUSES.includes(existingTask.status)
    ) {
      return res
        .status(409)
        .json({ message: "A final decision has already been made on this task and cannot be changed." });
    }

    // Workspace-scoped, not owner-restricted: assignees update progress and
    // raisers act on approval requests from the task drawer.
    const task = await Task.findOneAndUpdate({ _id: taskId, workspaceId }, update, {
      new: true,
      runValidators: true,
    })
      .populate("departmentId", "name")
      .lean()
      .exec();

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
          targetUrl: TASKS_ROUTE_URL,
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
          targetUrl: TASKS_ROUTE_URL,
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
          targetUrl: TASKS_ROUTE_URL,
          data: { taskCode: task.taskCode, title: task.title, progress: task.progress },
          priority: "low",
          dedupeKey: `task-progress:${task._id}:${existingTask.ownerId}:${Date.now()}`,
        });
      }
    }

    return res.status(200).json({ message: "Task updated successfully", data: { task: serializeTask(task) } });
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

    // Workspace-scoped so assignees can comment too, not just the owner.
    const task = await Task.findOneAndUpdate(
      { _id: taskId, workspaceId },
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
    )
      .populate("departmentId", "name")
      .lean()
      .exec();

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
          targetUrl: TASKS_ROUTE_URL,
          data: { taskCode: task.taskCode, title: task.title, comment: String(text).trim().slice(0, 200) },
          priority: "normal",
          dedupeKey: `task-comment:${task._id}:${recipientId}:${Date.now()}`,
        });
      }
    }

    return res.status(200).json({ message: "Comment added successfully", data: { task: serializeTask(task) } });
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

    // Workspace-scoped so assignees can attach files too.
    const task = await Task.findOneAndUpdate(
      { _id: taskId, workspaceId },
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
    )
      .populate("departmentId", "name")
      .lean()
      .exec();

    if (!task) return res.status(404).json({ message: "Task not found" });

    return res
      .status(200)
      .json({ message: "Attachment added successfully", data: { task: serializeTask(task) } });
  } catch (error) {
    next(error);
  }
}

// POST /api/tasks/:taskId/accept — the assignee takes the task on. Moves a
// Pending task to In Progress and stamps who accepted it and when.
export async function acceptTask(req, res, next) {
  try {
    const workspaceId = getCurrentWorkspaceId(req);
    const userId = getCurrentUserId(req);
    const { taskId } = req.params;

    if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
    if (!mongoose.Types.ObjectId.isValid(taskId)) return res.status(400).json({ message: "Invalid task id" });
    if (!userId) return res.status(401).json({ message: "User is required" });

    const existingTask = await Task.findOne({ _id: taskId, workspaceId }).lean().exec();
    if (!existingTask) return res.status(404).json({ message: "Task not found" });

    // The current assignee or the task's owner (raiser) can always accept.
    // An unassigned task (routed to a department queue, not a specific
    // person) has no assignee yet, so it must also be acceptable by anyone
    // workspace-scoped who can see it — the client already limits who sees
    // the Accept UI to eligible department members (manager/admin/employee).
    const isAssignee =
      existingTask.assigneeUserId && String(existingTask.assigneeUserId) === String(userId);
    const isOwner = existingTask.ownerId && String(existingTask.ownerId) === String(userId);
    const isUnassignedQueueTask = !existingTask.assigneeUserId;
    if (!isAssignee && !isOwner && !isUnassignedQueueTask) {
      return res.status(403).json({ message: "Only the assigned user can accept this task" });
    }

    const terminalStatuses = ["Completed", "Approved", "Rejected"];
    if (terminalStatuses.includes(existingTask.status)) {
      return res
        .status(409)
        .json({ message: `Task is already ${existingTask.status.toLowerCase()} and cannot be accepted` });
    }

    // Accepting is just a claim — it does not decide who does the work.
    // Assigning a queue task to someone (self or a teammate) is a
    // deliberately separate step, done afterward via PATCH /api/tasks/:id.
    const now = new Date();
    const acceptedByName = await getCurrentUserName(req);
    const update = {
      acceptedBy: acceptedByName,
      acceptedByUserId: userId,
      acceptedAt: now,
      startedAt: existingTask.startedAt || now,
      status: existingTask.status === "Pending" ? "In Progress" : existingTask.status,
    };

    const task = await Task.findOneAndUpdate({ _id: taskId, workspaceId }, update, {
      new: true,
      runValidators: true,
    })
      .populate("departmentId", "name")
      .lean()
      .exec();

    // Let the raiser/owner know their task has been picked up.
    if (existingTask.ownerId && String(existingTask.ownerId) !== String(userId)) {
      createNotification({
        workspaceId,
        recipientUserId: String(existingTask.ownerId),
        actorUserId: userId,
        type: "task_accepted",
        category: "task",
        title: "Task Accepted",
        description: `${update.acceptedBy} accepted task ${task.taskCode} "${task.title}".`,
        entityType: "task",
        entityId: String(task._id),
        entityCode: task.taskCode,
        targetUrl: TASKS_ROUTE_URL,
        data: { taskCode: task.taskCode, title: task.title },
        priority: "normal",
        dedupeKey: `task-accepted:${task._id}:${existingTask.ownerId}`,
      });
    }

    return res.status(200).json({ message: "Task accepted successfully", data: { task: serializeTask(task) } });
  } catch (error) {
    next(error);
  }
}

// POST /api/tasks/:taskId/complete — the assignee marks the work done with an
// optional note + attachment entries. Sets progress to 100% and notifies the owner.
export async function completeTask(req, res, next) {
  try {
    const workspaceId = getCurrentWorkspaceId(req);
    const userId = getCurrentUserId(req);
    const { taskId } = req.params;

    if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
    if (!mongoose.Types.ObjectId.isValid(taskId)) return res.status(400).json({ message: "Invalid task id" });
    if (!userId) return res.status(401).json({ message: "User is required" });

    const existingTask = await Task.findOne({ _id: taskId, workspaceId }).lean().exec();
    if (!existingTask) return res.status(404).json({ message: "Task not found" });

    const isAssignee =
      existingTask.assigneeUserId && String(existingTask.assigneeUserId) === String(userId);
    const isOwner = existingTask.ownerId && String(existingTask.ownerId) === String(userId);
    if (!isAssignee && !isOwner) {
      return res.status(403).json({ message: "Only the assigned user can complete this task" });
    }

    if (["Completed", "Approved", "Rejected"].includes(existingTask.status)) {
      return res
        .status(409)
        .json({ message: `Task is already ${existingTask.status.toLowerCase()}` });
    }

    const { note, attachments } = req.body || {};

    const pushAttachments = Array.isArray(attachments)
      ? attachments
          .filter((item) => item?.name)
          .map((item) => ({
            name: String(item.name).trim(),
            size: item.size || "",
            url: item.url || "",
            publicId: item.publicId || "",
            mimeType: item.mimeType || "",
          }))
      : [];

    const update = {
      status: "Completed",
      progress: 100,
      completedAt: new Date(),
      ...(note && String(note).trim() ? { completionNote: String(note).trim().slice(0, 2000) } : {}),
      ...(pushAttachments.length ? { $push: { attachments: { $each: pushAttachments } } } : {}),
    };

    const task = await Task.findOneAndUpdate({ _id: taskId, workspaceId }, update, {
      new: true,
      runValidators: true,
    })
      .populate("departmentId", "name")
      .lean()
      .exec();

    if (existingTask.ownerId && String(existingTask.ownerId) !== String(userId)) {
      createNotification({
        workspaceId,
        recipientUserId: String(existingTask.ownerId),
        actorUserId: userId,
        type: "task_completed",
        category: "task",
        title: "Task Completed",
        description: `Task ${task.taskCode} "${task.title}" was marked completed by ${await getCurrentUserName(req)}.`,
        entityType: "task",
        entityId: String(task._id),
        entityCode: task.taskCode,
        targetUrl: TASKS_ROUTE_URL,
        data: { taskCode: task.taskCode, title: task.title },
        priority: "normal",
        dedupeKey: `task-completed:${task._id}:${existingTask.ownerId}:${Date.now()}`,
      });
    }

    return res.status(200).json({ message: "Task completed successfully", data: { task: serializeTask(task) } });
  } catch (error) {
    next(error);
  }
}

// POST /api/tasks/attachments — bulk file upload used before creating a task.
// Stores each file in S3 under tasks/<workspaceId>/ and returns attachment
// entries ready to be sent as createTask's `attachments` payload field.
export async function uploadTaskAttachmentFiles(req, res, next) {
  try {
    const workspaceId = getCurrentWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) return res.status(400).json({ message: "No files were uploaded" });

    const uploadedAttachments = [];
    for (const file of files) {
      const cleanName = String(file.originalname || "file").replace(/[/\\?%*:|"<>]/g, "_");
      const route = `tasks/${workspaceId}/${Date.now()}-${cleanName}`;
      const uploadResult = await uploadFileToS3(route, file);

      uploadedAttachments.push({
        name: cleanName,
        size: formatFileSize(file.size),
        url: uploadResult.url,
        publicId: route,
        mimeType: file.mimetype || "",
      });
    }

    return res
      .status(201)
      .json({ message: "Attachments uploaded successfully", data: { attachments: uploadedAttachments } });
  } catch (error) {
    next(error);
  }
}

