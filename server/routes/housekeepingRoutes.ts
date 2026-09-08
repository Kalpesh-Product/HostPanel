// @ts-nocheck
import { Router } from "express";
import {
    createHousekeepingTask,
    getHousekeepingTasks,
    getHousekeepingTaskById,
    updateHousekeepingTask,
    updateHousekeepingTaskRequirements,
    completeHousekeepingTask,
    deleteHousekeepingTask,
    createHousekeepingStaff,
    getHousekeepingStaff,
    getHousekeepingStaffById,
    updateHousekeepingStaff,
    toggleHousekeepingStaffAttendance,
    deleteHousekeepingStaff,
    getHousekeepingStaffPerformance,
    getHousekeepingEmployees,
} from "../controllers/housekeepingController.js";

const router = Router();

router.get("/employees", getHousekeepingEmployees);

router.get("/tasks", getHousekeepingTasks);
router.post("/tasks", createHousekeepingTask);
router.get("/tasks/:taskId", getHousekeepingTaskById);
router.patch("/tasks/:taskId", updateHousekeepingTask);
router.patch("/tasks/:taskId/requirements", updateHousekeepingTaskRequirements);
router.patch("/tasks/:taskId/complete", completeHousekeepingTask);
router.delete("/tasks/:taskId", deleteHousekeepingTask);

router.get("/staff/performance", getHousekeepingStaffPerformance);
router.get("/staff", getHousekeepingStaff);
router.post("/staff", createHousekeepingStaff);
router.get("/staff/:staffId", getHousekeepingStaffById);
router.patch("/staff/:staffId", updateHousekeepingStaff);
router.patch("/staff/:staffId/attendance", toggleHousekeepingStaffAttendance);
router.delete("/staff/:staffId", deleteHousekeepingStaff);

export default router;

