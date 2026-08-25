// @ts-nocheck
import { Router } from "express";
import { createReport, downloadReport, listReports, getReportFile } from "../controllers/reportController.js";

const router = Router();

router.get("/", listReports);
router.post("/", createReport);
router.get("/file/:reportId", getReportFile);
router.post("/:reportId/download", downloadReport);

export default router;

