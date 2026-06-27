// @ts-nocheck
import { Router } from "express";
import {
    createITRepairLog,
    getITRepairLogs,
    getITRepairLogById,
    updateITRepairLog,
    deleteITRepairLog,
    getITOverview,
} from "../controllers/itController.js";

const router = Router();

// ─── Overview ───────────────────────────────────────────────────────────────
router.get("/overview", getITOverview);

// ─── Repair Logs ────────────────────────────────────────────────────────────
router.get("/repair-logs", getITRepairLogs);
router.post("/repair-logs", createITRepairLog);
router.get("/repair-logs/:repairLogId", getITRepairLogById);
router.patch("/repair-logs/:repairLogId", updateITRepairLog);
router.delete("/repair-logs/:repairLogId", deleteITRepairLog);

export default router;
