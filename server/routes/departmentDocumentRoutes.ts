// @ts-nocheck
import { Router } from "express";
import {
  getDepartmentDocuments,
  uploadDepartmentDocument,
  updateDepartmentDocument,
  toggleDepartmentDocumentStatus,
  updateDepartmentDocumentVisibility,
  downloadDepartmentDocument,
} from "../controllers/departmentDocumentControllers.js";
import upload from "../config/multerConfig.js";

const router = Router();

router.get("/", getDepartmentDocuments);
router.get("/:documentId/download", downloadDepartmentDocument);
router.post("/", upload.single("file"), uploadDepartmentDocument);
router.patch("/:documentId", upload.single("file"), updateDepartmentDocument);
router.patch("/:documentId/status", toggleDepartmentDocumentStatus);
router.patch("/:documentId/visibility", updateDepartmentDocumentVisibility);

export default router;
