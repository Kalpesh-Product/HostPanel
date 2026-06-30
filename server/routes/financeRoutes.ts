// @ts-nocheck
import express from "express";
import {
  getDepartmentFinance,
  submitBudgetRequest,
  addMonthlyExpense,
  updateMonthlyExpenseStatus,
  upsertReminder,
  importFinanceSnapshot,
  submitVendor,
  submitExtraBudget,
  uploadInvoice,
  sendReminder,
  listFinanceSnapshot,
  getTenantBillingSnapshot,
  markTenantSecurityDepositPaid,
  generateTenantSecurityDepositInvoice,
  sendTenantSecurityDepositInvoice,
  resetTenantSecurityDepositInvoice,
  applyFinanceApprovalDecision,
  getPayrollSnapshot,
  getMyPayslips,
  processPayrollPayment,
  generatePayslip,
  sendPayslip,
} from "../controllers/financeController.js";

const router = express.Router();

router.get("/department", getDepartmentFinance);
router.post("/department/budget-request", submitBudgetRequest);
router.post("/department/month-expense", addMonthlyExpense);
router.patch("/department/month-expense/status", updateMonthlyExpenseStatus);
router.post("/department/reminder", upsertReminder);
router.post("/department/import-snapshot", importFinanceSnapshot);
router.post("/department/vendor", submitVendor);
router.post("/department/extra-budget-request", submitExtraBudget);
router.post("/department/invoice", uploadInvoice);
router.post("/department/send-reminder", sendReminder);

router.get("/snapshot", listFinanceSnapshot);

router.get("/tenant-billing", getTenantBillingSnapshot);
router.post("/tenant-billing/mark-deposit-paid", markTenantSecurityDepositPaid);
router.post("/tenant-billing/generate-deposit-invoice", generateTenantSecurityDepositInvoice);
router.post("/tenant-billing/send-deposit-invoice", sendTenantSecurityDepositInvoice);
router.post("/tenant-billing/reset-deposit-invoice", resetTenantSecurityDepositInvoice);

router.post("/approval/decision", applyFinanceApprovalDecision);

router.get("/payroll/snapshot", getPayrollSnapshot);
router.get("/payroll/my-payslips", getMyPayslips);
router.post("/payroll/process-payment", processPayrollPayment);
router.post("/payroll/generate-payslip", generatePayslip);
router.post("/payroll/send-payslip", sendPayslip);

export default router;
