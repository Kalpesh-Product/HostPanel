// @ts-nocheck
import { Router } from "express";
import { listTaskTypes, createTaskType } from "../controllers/taskTypeController.js";

const router = Router();

router.get("/", listTaskTypes);
router.post("/", createTaskType);

export default router;
