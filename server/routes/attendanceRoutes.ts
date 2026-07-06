import { Router } from "express";
import {
  checkIn,
  checkOut,
  createCorrectionRequest,
  endBreak,
  getAttendanceGeofenceConfig,
  getEmployeeAttendanceHistoryForTeam,
  getHrAttendanceReview,
  getMyAttendance,
  getTeamAttendance,
  reviewCorrectionRequest,
  resolveAttendanceGeofenceUrl,
  updateAttendanceGeofenceConfig,
  startBreak,
} from "../controllers/attendanceController.js";
import { attendanceSelfieUpload } from "../middlewares/attendance-upload.middleware.js";

const router = Router();

router.get("/my", getMyAttendance);
router.get("/team", getTeamAttendance);
router.get("/hr/review", getHrAttendanceReview);
router.get("/geofence", getAttendanceGeofenceConfig);
router.post("/geofence/resolve", resolveAttendanceGeofenceUrl);
router.patch("/geofence", updateAttendanceGeofenceConfig);
router.get("/employee/:userId", getEmployeeAttendanceHistoryForTeam);
router.get("/team/:userId/history", getEmployeeAttendanceHistoryForTeam);
router.post("/check-in", attendanceSelfieUpload.single("selfie"), checkIn);
router.post("/check-out", attendanceSelfieUpload.single("selfie"), checkOut);
router.patch("/start-break", attendanceSelfieUpload.single("selfie"), startBreak);
router.patch("/end-break", attendanceSelfieUpload.single("selfie"), endBreak);
router.post("/correction/:recordId", createCorrectionRequest);
router.post("/:recordId/corrections", createCorrectionRequest);
router.patch("/correction/:recordId/review", reviewCorrectionRequest);
router.patch("/hr/corrections/:recordId", reviewCorrectionRequest);

export default router;
