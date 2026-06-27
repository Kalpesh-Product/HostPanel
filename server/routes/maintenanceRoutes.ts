// @ts-nocheck
import { Router } from "express";
import {
    createMaintenanceSchedule,
    getMaintenanceSchedules,
    getMaintenanceScheduleById,
    updateMaintenanceSchedule,
    deleteMaintenanceSchedule,
    completeMaintenanceSchedule,
    getMaintenanceOverview,
    createMaintenanceRepairLog,
    getMaintenanceRepairLogs,
    getMaintenanceRepairLogById,
    updateMaintenanceRepairLog,
    deleteMaintenanceRepairLog,
} from "../controllers/maintenanceController.js";

const router = Router();

router.get("/overview", getMaintenanceOverview);

router.get("/schedules", getMaintenanceSchedules);
router.post("/schedules", createMaintenanceSchedule);
router.get("/schedules/:scheduleId", getMaintenanceScheduleById);
router.patch("/schedules/:scheduleId", updateMaintenanceSchedule);
router.patch("/schedules/:scheduleId/complete", completeMaintenanceSchedule);
router.delete("/schedules/:scheduleId", deleteMaintenanceSchedule);

router.get("/repair-logs", getMaintenanceRepairLogs);
router.post("/repair-logs", createMaintenanceRepairLog);
router.get("/repair-logs/:repairLogId", getMaintenanceRepairLogById);
router.patch("/repair-logs/:repairLogId", updateMaintenanceRepairLog);
router.delete("/repair-logs/:repairLogId", deleteMaintenanceRepairLog);

export default router;
