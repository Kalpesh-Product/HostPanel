// @ts-nocheck
import express from "express";
import upload from "../config/multerConfig.js";
import {
  getDepartmentFinance,
  submitBudgetRequest,
  addMonthlyExpense,
  updateMonthlyExpenseStatus,
  recordAdditionalExpensePayment,
  upsertReminder,
  importFinanceSnapshot,
  submitVendor,
  submitExtraBudget,
  uploadInvoice,
  sendReminder,
  resetRejectedAnnualBudget,
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
  listVendors,
  createVendorQuick,
  getTenantRentRecords,
  markTenantRentPaid,
  returnTenantRentProof,
  getVirtualOfficeRentRecords,
  markVirtualOfficeRentPaid,
  getIncomeLedgerRecords,
  listRevenueEntries,
  createRevenueEntry,
  confirmRevenueEntry,
  reverseRevenueEntry,
} from "../controllers/financeController.js";

const router = express.Router();

router.get("/vendors", listVendors);
router.post("/vendors", createVendorQuick);

router.get("/department", getDepartmentFinance);
router.post("/department/budget-request", submitBudgetRequest);
router.post("/department/month-expense", addMonthlyExpense);
router.patch("/department/month-expense/status", updateMonthlyExpenseStatus);
router.patch("/department/expense/additional-payment", recordAdditionalExpensePayment);
router.post("/department/reminder", upsertReminder);
router.post("/department/import-snapshot", importFinanceSnapshot);
router.post("/department/vendor", submitVendor);
router.post("/department/extra-budget-request", submitExtraBudget);
router.post("/department/invoice", upload.single("file"), uploadInvoice);
router.post("/department/send-reminder", sendReminder);
router.post("/department/reset-rejected", resetRejectedAnnualBudget);

router.get("/snapshot", listFinanceSnapshot);

router.get("/tenant-billing", getTenantBillingSnapshot);
router.patch("/tenant-billing/:tenantCompanyId", markTenantSecurityDepositPaid);
router.post("/tenant-billing/:tenantCompanyId/invoice/generate", generateTenantSecurityDepositInvoice);
router.post("/tenant-billing/:tenantCompanyId/invoice/send", sendTenantSecurityDepositInvoice);
router.post("/tenant-billing/:tenantCompanyId/invoice/reset", resetTenantSecurityDepositInvoice);

// Tenant rent receivables (monthly) — list for the finance tab + verify/close.
router.get("/tenant-rent", getTenantRentRecords);
router.patch("/tenant-rent/:rentId/mark-paid", markTenantRentPaid);
router.patch("/tenant-rent/:rentId/return-proof", returnTenantRentProof);

// Virtual office rent — snapshot of each contract's current billing period.
router.get("/virtual-office-rent", getVirtualOfficeRentRecords);
router.patch("/virtual-office-rent/:recordId/mark-paid", markVirtualOfficeRentPaid);

// Income ledger — append-only revenue register read by Accounting/P&L & History.
router.get("/income-ledger", getIncomeLedgerRecords);

// Manual revenue (Workation / Alternate) — finance-created, Pending → Received,
// corrections via reversal entries.
router.get("/revenue-entries", listRevenueEntries);
router.post("/revenue-entries", upload.single("document"), createRevenueEntry);
router.patch("/revenue-entries/:entryId/confirm", confirmRevenueEntry);
router.post("/revenue-entries/:entryId/reverse", reverseRevenueEntry);

router.post("/approval/decision", applyFinanceApprovalDecision);

router.get("/payroll/snapshot", getPayrollSnapshot);
router.get("/payroll/my-payslips", getMyPayslips);
router.post("/payroll/process-payment", processPayrollPayment);
router.post("/payroll/generate-payslip", generatePayslip);
router.post("/payroll/send-payslip", sendPayslip);

export default router;
