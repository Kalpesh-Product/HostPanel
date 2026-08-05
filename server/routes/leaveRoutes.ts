import { Router } from "express";
import {
  createHoliday,
  createLeaveRequest,
  deleteHoliday,
  listHolidays,
  listLeaveQuotas,
  listLeaveRequests,
  updateHoliday,
  updateLeaveQuota,
  updateLeaveRequest,
  uploadLeaveCertificate,
} from "../controllers/leaveControllers.js";
import upload from "../config/multerConfig.js";

const router = Router();

router.get("/", listLeaveRequests);
router.post("/", createLeaveRequest);
router.post("/certificate", upload.single("file"), uploadLeaveCertificate);

router.get("/quotas", listLeaveQuotas);
router.patch("/quotas/:userId", updateLeaveQuota);

router.get("/holidays", listHolidays);
router.post("/holidays", createHoliday);
router.patch("/holidays/:holidayId", updateHoliday);
router.delete("/holidays/:holidayId", deleteHoliday);

router.patch("/:leaveRequestId", updateLeaveRequest);

export default router;
