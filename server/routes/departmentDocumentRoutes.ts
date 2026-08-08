// @ts-nocheck
import { Router } from "express";
import {
  getDepartmentDocuments,
  uploadDepartmentDocument,
  updateDepartmentDocument,
  toggleDepartmentDocumentStatus,
} from "../controllers/departmentDocumentControllers.js";
import upload from "../config/multerConfig.js";

const router = Router();

router.get("/", getDepartmentDocuments);
router.post("/", upload.single("file"), uploadDepartmentDocument);
router.patch("/:documentId", updateDepartmentDocument);
router.patch("/:documentId/status", toggleDepartmentDocumentStatus);

export default router;
