// @ts-nocheck
import { Router } from "express";
import { createReport, downloadReport, listReports } from "../controllers/reportController.js";

const router = Router();

router.get("/", listReports);
router.post("/", createReport);
router.post("/:reportId/download", downloadReport);

export default router;

