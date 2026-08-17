// @ts-nocheck
import { Router } from "express";
import {
  createEmployeeRecord,
  getEmployeeDocumentsVault,
  getEmployeeManagementOverview,
  getEmployeeBankDirectory,
  verifyEmployeeBankAccount,
  uploadEmployeeDocuments,
  toggleEmployeeStatus,
  resendInviteToEmployee,
  updateEmployeeRecord,
  updateMyEmployeeProfile,
  updateMyProfilePicture,
  getPayrollSnapshot,
  previewPayrollPayslipTemplate,
  selectPayrollPayslipTemplate,
  preparePayroll,
  updatePayrollStatus,
  createPayrollAdjustment,
} from "../controllers/hrControllers.js";
import recruitmentRoutes from "./recruitmentRoutes.js";
import resignationManagementRoutes from "./resignationManagementRoutes.js";
import upload from "../config/multerConfig.js";

const router = Router();

router.get("/company-management/overview", getEmployeeManagementOverview);
router.get("/employees/banks", getEmployeeBankDirectory);
router.post("/employees/bank-account/verify", verifyEmployeeBankAccount);
router.patch("/my-profile", updateMyEmployeeProfile);
router.patch("/my-profile/avatar", upload.single("avatar"), updateMyProfilePicture);
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
router.post("/employees/:employeeId/resend-invite", resendInviteToEmployee);
router.get("/payroll/snapshot", getPayrollSnapshot);
router.get("/payroll/payslip-template-preview/:templateId", previewPayrollPayslipTemplate);
router.post("/payroll/payslip-template", selectPayrollPayslipTemplate);
router.post("/payroll/prepare", preparePayroll);
router.patch("/payroll/cycles/:cycleId/status", updatePayrollStatus);
router.post("/payroll/cycles/:cycleId/employees/:profileId/adjustments", createPayrollAdjustment);
router.use("/resignation-management", resignationManagementRoutes);
router.use("/exit-management", resignationManagementRoutes); // Legacy API compatibility.
router.use("/recruitment", recruitmentRoutes);

export default router;
