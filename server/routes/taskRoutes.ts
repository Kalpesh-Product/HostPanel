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
} from "../controllers/taskController.js";

const router = Router();

// Base CRUD
router.get("/", listTasks);
router.post("/", createTask);
router.get("/:taskId", getTaskById);
router.patch("/:taskId", updateTask);
router.delete("/:taskId", deleteTask);

// Sub-resources
router.post("/:taskId/comments", addTaskComment);
router.post("/:taskId/attachments", addTaskAttachment);

export default router;

