import { Router } from "express";
import {
  createHoliday,
  createLeaveRequest,
  createLeaveType,
  deleteHoliday,
  listHolidays,
  listLeaveQuotas,
  listLeaveRequests,
  listLeaveTypes,
  updateHoliday,
  updateLeaveQuota,
  updateLeaveRequest,
  updateLeaveType,
  uploadLeaveCertificate,
} from "../controllers/leaveControllers.js";
import upload from "../config/multerConfig.js";

const router = Router();

router.get("/", listLeaveRequests);
router.post("/", createLeaveRequest);
router.post("/certificate", upload.single("file"), uploadLeaveCertificate);

router.get("/leave-types", listLeaveTypes);
router.post("/leave-types", createLeaveType);
router.patch("/leave-types/:leaveTypeId", updateLeaveType);

router.get("/quotas", listLeaveQuotas);
router.patch("/quotas/:userId", updateLeaveQuota);

router.get("/holidays", listHolidays);
router.post("/holidays", createHoliday);
router.patch("/holidays/:holidayId", updateHoliday);
router.delete("/holidays/:holidayId", deleteHoliday);

router.patch("/:leaveRequestId", updateLeaveRequest);

export default router;
