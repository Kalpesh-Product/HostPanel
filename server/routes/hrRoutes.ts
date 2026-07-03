// @ts-nocheck
import { Router } from "express";
import {
  createEmployeeRecord,
  getEmployeeDocumentsVault,
  getEmployeeManagementOverview,
  uploadEmployeeDocuments,
  toggleEmployeeStatus,
  updateEmployeeRecord,
} from "../controllers/hrControllers.js";
import upload from "../config/multerConfig.js";

const router = Router();

router.get("/employee-management/overview", getEmployeeManagementOverview);
router.get("/documents/vault", getEmployeeDocumentsVault);
router.post(
  "/employees/documents/upload",
  upload.fields([
    { name: "identityProof", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
    { name: "bankProof", maxCount: 1 },
    { name: "otherDocuments", maxCount: 10 },
  ]),
  uploadEmployeeDocuments,
);
router.post("/employees", createEmployeeRecord);
router.patch("/employees/:employeeId", updateEmployeeRecord);
router.patch("/employees/:employeeId/toggle-status", toggleEmployeeStatus);

export default router;
