// @ts-nocheck
import { TaskType } from "../models/TaskType.js";

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

const DEFAULT_TASK_TYPES = [
  { name: "Standard", workflowKind: "progress", isSystem: true },
  { name: "Approval", workflowKind: "approval", isSystem: true },
];

const serializeTaskType = (taskType) => {
  if (!taskType) return taskType;
  return { ...taskType, id: String(taskType._id) };
};

// Lazily backfills the two built-in types for a workspace the first time its
// task types are requested, mirroring how default departments are seeded.
async function ensureWorkspaceTaskTypes(workspaceId) {
  const existing = await TaskType.find({ workspaceId }).select("name").lean();
  const haveNames = new Set(existing.map((doc) => String(doc.name || "").toLowerCase()));
  const toCreate = DEFAULT_TASK_TYPES.filter((doc) => !haveNames.has(doc.name.toLowerCase())).map((doc) => ({
    ...doc,
    workspaceId,
  }));
  if (toCreate.length) {
    await TaskType.insertMany(toCreate, { ordered: false }).catch(() => {});
  }
}

export async function listTaskTypes(req, res, next) {
  try {
    const workspaceId = getCurrentWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });

    await ensureWorkspaceTaskTypes(workspaceId);

    const taskTypes = await TaskType.find({ workspaceId, isActive: true })
      .sort({ isSystem: -1, name: 1 })
      .lean()
      .exec();

    return res.status(200).json({
      message: "Task types loaded successfully",
      data: { taskTypes: taskTypes.map(serializeTaskType) },
    });
  } catch (error) {
    next(error);
  }
}

export async function createTaskType(req, res, next) {
  try {
    const workspaceId = getCurrentWorkspaceId(req);
    const userId = getCurrentUserId(req);
    if (!workspaceId) return res.status(400).json({ message: "Workspace is required" });
    if (!userId) return res.status(401).json({ message: "User is required" });

    const { name, workflowKind } = req.body || {};
    const trimmedName = String(name || "").trim();

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      return res.status(400).json({ message: "Type name must be between 2 and 80 characters" });
    }
    if (!["progress", "approval"].includes(workflowKind)) {
      return res.status(400).json({ message: "workflowKind must be 'progress' or 'approval'" });
    }

    const existing = await TaskType.findOne({ workspaceId, name: trimmedName })
      .collation({ locale: "en", strength: 2 })
      .lean()
      .exec();
    if (existing) {
      return res.status(200).json({ message: "Task type already exists", data: { taskType: serializeTaskType(existing) } });
    }

    const created = await TaskType.create({
      workspaceId,
      name: trimmedName,
      workflowKind,
      isSystem: false,
      createdByUserId: userId,
    });

    return res.status(201).json({ message: "Task type created successfully", data: { taskType: serializeTaskType(created.toObject()) } });
  } catch (error) {
    if (error?.code === 11000) {
      const workspaceId = getCurrentWorkspaceId(req);
      const trimmedName = String(req.body?.name || "").trim();
      const existing = await TaskType.findOne({ workspaceId, name: trimmedName })
        .collation({ locale: "en", strength: 2 })
        .lean()
        .exec();
      if (existing) {
        return res.status(200).json({ message: "Task type already exists", data: { taskType: serializeTaskType(existing) } });
      }
      return res.status(409).json({ message: "A task type with this name already exists" });
    }
    next(error);
  }
}
