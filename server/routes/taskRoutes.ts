// @ts-nocheck
import { Router } from "express";
import {
  createTask,
  listTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addTaskComment,
  addTaskAttachment,
  acceptTask,
  completeTask,
  uploadTaskAttachmentFiles,
} from "../controllers/taskController.js";
import upload from "../config/multerConfig.js";

const router = Router();

// Base CRUD
router.get("/", listTasks);
router.post("/", createTask);
router.get("/:taskId", getTaskById);
router.patch("/:taskId", updateTask);
router.delete("/:taskId", deleteTask);

// Sub-resources
router.post("/attachments", upload.array("files", 5), uploadTaskAttachmentFiles);
router.post("/:taskId/comments", addTaskComment);
router.post("/:taskId/attachments", addTaskAttachment);

// Workflow actions
router.post("/:taskId/accept", acceptTask);
router.post("/:taskId/complete", completeTask);

export default router;

