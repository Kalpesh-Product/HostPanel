// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import {
  getDepartmentFinanceForManagerInternal,
  submitBudgetRequestForDepartmentInternal,
  addMonthlyExpenseInternal,
  updateMonthlyExpenseStatusInternal,
  upsertReminderInternal,
  recordAdditionalExpensePaymentInternal,
  importFinanceSnapshotForDepartmentInternal,
  submitVendorForDepartmentInternal,
  submitExtraBudgetForDepartmentInternal,
  uploadInvoiceForDepartmentInternal,
  sendReminderForDepartmentInternal,
  resetRejectedAnnualBudgetForDepartmentInternal,
  listFinanceSnapshotForManagerInternal,
  getTenantBillingSnapshotForCurrentUser,
  markTenantSecurityDepositPaidForCurrentUser,
  generateTenantSecurityDepositInvoiceForCurrentUser,
  sendTenantSecurityDepositInvoiceForCurrentUser,
  resetTenantSecurityDepositInvoiceForCurrentUser,
  applyFinanceApprovalDecisionInternal,
} from "../services/financeService.js";
import {
  getPayrollSnapshotForCurrentUser,
  listPayslipsForCurrentUser,
  processPayrollPaymentForCurrentUser,
  generatePayslipForCurrentUser,
  sendPayslipToEmployeeForCurrentUser,
} from "../services/payrollService.js";
import { uploadFileToS3 } from "../config/s3config.js";
import {
  listTenantRentForWorkspace,
  markTenantRentPaidForWorkspace,
  returnTenantRentProofForWorkspace,
} from "../services/tenantRentService.js";
import {
  listVirtualOfficeRentForWorkspace,
  markVirtualOfficeRentPaidForWorkspace,
} from "../services/virtualOffice.service.js";
import { listIncomeEntriesForWorkspace } from "../services/incomeLedgerService.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import Workspace from "../models/Workspace.js";
import FinanceVendor from "../models/FinanceVendor.js";

function getWorkspaceId(req: Request) {
  return (req as any)?.workspaceMembership?.workspace ? (req as any).workspaceMembership.workspace : null;
}

function getUserId(req: Request) {
  const user = (req as any).user;
  if (!user) return null;
  return user.id || user._id || user;
}

export async function getDepartmentFinance(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    let department = String(req.query.department || "").trim();
    const fiscalYear = String(req.query.fiscalYear || "").trim();

    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });

    const membership: any = await WorkspaceMember.findOne({ workspace: workspaceId, user: getUserId(req) })
      .populate("departments", "name")
      .lean()
      .exec();
    const ownDepartments = (membership?.departments || []).map((d: any) => String(d?.name || "").trim().toLowerCase()).filter(Boolean);

    if (!department) {
      department = String(membership?.departments?.[0]?.name || "").trim();
    } else {
      const roleValue = String((req as any).workspaceMembership?.role?.name || (req as any).workspaceMembership?.role || "")
        .trim().toLowerCase().replace(/[\s-]+/g, "_");
      const canViewAnyDepartment = ["owner", "founder", "super_admin", "admin", "finance_manager", "finance"].includes(roleValue);
      if (!canViewAnyDepartment && !ownDepartments.includes(department.trim().toLowerCase())) {
        return res.status(403).json({ message: "You do not have access to this department's finance data." });
      }
    }
    if (!department) return res.status(400).json({ message: "department is required" });
    if (!fiscalYear) return res.status(400).json({ message: "fiscalYear is required" });

    const result = await getDepartmentFinanceForManagerInternal({
      workspaceId,
      department,
      fiscalYear,
      ownerId: null,
    });

    return res.status(200).json({
      success: true,
      message: "Department finance data loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function submitBudgetRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);

    const { department, fiscalYear, managerName, annualBudgetRequested, previousSpend, notes, monthlyPlan } =
      (req.body || {}) as any;

    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });
    if (!department) return res.status(400).json({ message: "department is required" });
    if (!fiscalYear) return res.status(400).json({ message: "fiscalYear is required" });

    const plan = await submitBudgetRequestForDepartmentInternal({
      workspaceId,
      ownerId: null,
      userId,
      department: String(department),
      fiscalYear: String(fiscalYear),
      managerName,
      annualBudgetRequested: Number(annualBudgetRequested || 0),
      previousSpend: Number(previousSpend || 0),
      notes,
      monthlyPlan,
    });

    return res.status(201).json({
      success: true,
      message: "Budget request submitted successfully.",
      data: plan,
    });
  } catch (error) {
    next(error);
  }
}

export async function addMonthlyExpense(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);

    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const {
      planId,
      title,
      description,
      monthKey,
      month,
      date,
      dueDate,
      projectedAmount,
      actualAmount,
      savings,
      paymentStatus,
      expenseTag,
      vendor,
      sourceSheet,
      sourceRowNumber,
      invoice,
    } = (req.body || {}) as any;

    if (!planId) return res.status(400).json({ message: "planId is required" });
    if (!title) return res.status(400).json({ message: "title is required" });
    if (!monthKey || !month) return res.status(400).json({ message: "monthKey and month are required" });
    if (projectedAmount === undefined || projectedAmount === null)
      return res.status(400).json({ message: "projectedAmount is required" });

    const expense = await addMonthlyExpenseInternal({
      workspaceId,
      planId,
      userId,
      title,
      description,
      monthKey,
      month,
      date,
      dueDate,
      projectedAmount: Number(projectedAmount),
      actualAmount: actualAmount !== undefined ? Number(actualAmount) : undefined,
      savings: savings !== undefined ? Number(savings) : undefined,
      paymentStatus,
      expenseTag,
      vendor,
      sourceSheet,
      sourceRowNumber,
      invoice,
    });

    return res.status(201).json({
      success: true,
      message: "Monthly expense saved successfully.",
      data: expense,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMonthlyExpenseStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);

    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const { planId, expenseKey, paymentStatus, actualAmount } = (req.body || {}) as any;

    if (!planId) return res.status(400).json({ message: "planId is required" });
    if (!expenseKey) return res.status(400).json({ message: "expenseKey is required" });
    if (!paymentStatus) return res.status(400).json({ message: "paymentStatus is required" });

    // Authorization is enforced inside the service: Finance/owner roles have full
    // control; owning-department members may pay under guardrails (approved budget,
    // forward-only status, invoice on record, within remaining budget).
    const updated = await updateMonthlyExpenseStatusInternal({
      workspaceId,
      userId,
      planId,
      expenseKey,
      paymentStatus,
      actualAmount: actualAmount !== undefined ? Number(actualAmount) : undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Expense status updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function recordAdditionalExpensePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);

    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const { planId, monthKey, expenseId, amount } = (req.body || {}) as any;

    if (!planId) return res.status(400).json({ message: "planId is required" });
    if (!monthKey) return res.status(400).json({ message: "monthKey is required" });
    if (!expenseId) return res.status(400).json({ message: "expenseId is required" });
    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return res.status(400).json({ message: "amount must be greater than zero" });
    }

    // Segregation of duties: the department records the additional payment
    // intent; the line re-enters "Payment Pending" until Finance executes it.
    const updated = await recordAdditionalExpensePaymentInternal({
      workspaceId,
      userId,
      planId,
      monthKey,
      expenseId,
      amount: Number(amount),
    });

    return res.status(200).json({
      success: true,
      message: "Additional payment recorded. The line is back in Payment Pending for Finance.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function upsertReminder(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);

    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const { planId, reminder } = (req.body || {}) as any;

    if (!planId) return res.status(400).json({ message: "planId is required" });
    if (!reminder?.id) return res.status(400).json({ message: "reminder.id is required" });

    const reminders = await upsertReminderInternal({
      workspaceId,
      userId,
      planId,
      reminder,
    });

    return res.status(200).json({
      success: true,
      message: "Reminder upserted successfully.",
      data: { reminders },
    });
  } catch (error) {
    next(error);
  }
}

export async function importFinanceSnapshot(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });

    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const result = await importFinanceSnapshotForDepartmentInternal({
      workspaceId,
      userId,
      input: req.body || {},
    });

    return res.status(201).json({
      success: true,
      message: "Finance snapshot imported successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function submitVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });

    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const { planId, monthKey, name, vendorId, contactPerson, phone, email, address, paymentTerms, category, gstin, panNumber, bankName, accountName, accountNumber, ifscCode, upiId, website, notes, expenseId, actualAmount } = req.body || {};

    const result = await submitVendorForDepartmentInternal({
      workspaceId,
      userId,
      input: {
        planId,
        monthKey,
        name,
        vendorId,
        expenseId,
        actualAmount: actualAmount !== undefined ? Number(actualAmount) : undefined,
        contactPerson,
        phone,
        email,
        address,
        paymentTerms,
        category,
        gstin,
        panNumber,
        bankName,
        accountName,
        accountNumber,
        ifscCode,
        upiId,
        website,
        notes,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Vendor saved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function submitExtraBudget(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });

    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const result = await submitExtraBudgetForDepartmentInternal({
      workspaceId,
      userId,
      input: req.body || {},
    });

    return res.status(201).json({
      success: true,
      message: "Extra budget request submitted successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });

    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const payload: any = { ...(req.body || {}) };
    if ((req as any).file) {
      const file = (req as any).file;
      const safeName = String(file.originalname || "invoice").replace(/[^a-zA-Z0-9._-]/g, "-");
      const uploaded = await uploadFileToS3(`finance/invoices/${workspaceId}/${Date.now()}-${safeName}`, file);
      payload.invoiceFile = uploaded.url;
      payload.invoiceUrl = uploaded.url;
      payload.invoicePublicId = uploaded.id;
    }

    const result = await uploadInvoiceForDepartmentInternal({
      workspaceId,
      userId,
      input: payload,
    });

    return res.status(201).json({
      success: true,
      message: "Invoice uploaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetRejectedAnnualBudget(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const department = String(req.body?.department || "").trim();
    const fiscalYear = String(req.body?.fiscalYear || "").trim();
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });
    if (!department) return res.status(400).json({ message: "department is required" });
    if (!fiscalYear) return res.status(400).json({ message: "fiscalYear is required" });

    const result = await resetRejectedAnnualBudgetForDepartmentInternal({ workspaceId, userId, department, fiscalYear });
    return res.status(200).json({ success: true, message: "Annual budget revision draft created successfully.", data: result });
  } catch (error) {
    next(error);
  }
}

export async function sendReminder(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });

    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const result = await sendReminderForDepartmentInternal({
      workspaceId,
      userId,
      input: req.body || {},
    });

    return res.status(201).json({
      success: true,
      message: "Reminder sent successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function listFinanceSnapshot(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });

    const fiscalYear = String(req.query.fiscalYear || "").trim() || undefined;
    const result = await listFinanceSnapshotForManagerInternal({ workspaceId, fiscalYear });

    return res.status(200).json({
      success: true,
      message: "Finance snapshot loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTenantBillingSnapshot(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const result = await getTenantBillingSnapshotForCurrentUser({ workspaceId, userId, query: req.query });

    return res.status(200).json({
      success: true,
      message: "Tenant billing snapshot loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function markTenantSecurityDepositPaid(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const tenantId = String(req.params.tenantCompanyId || "").trim();
    if (!tenantId) return res.status(400).json({ message: "tenantId is required" });

    const result = await markTenantSecurityDepositPaidForCurrentUser({ workspaceId, userId, tenantCompanyId: tenantId, body: req.body });

    return res.status(200).json({
      success: true,
      message: "Security deposit marked as paid.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function generateTenantSecurityDepositInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const tenantId = String(req.params.tenantCompanyId || "").trim();
    if (!tenantId) return res.status(400).json({ message: "tenantId is required" });

    const result = await generateTenantSecurityDepositInvoiceForCurrentUser({ workspaceId, userId, tenantCompanyId: tenantId });

    return res.status(201).json({
      success: true,
      message: "Security deposit invoice generated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function sendTenantSecurityDepositInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const tenantId = String(req.params.tenantCompanyId || "").trim();
    if (!tenantId) return res.status(400).json({ message: "tenantId is required" });

    const result = await sendTenantSecurityDepositInvoiceForCurrentUser({ workspaceId, userId, tenantCompanyId: tenantId });

    return res.status(200).json({
      success: true,
      message: "Security deposit invoice sent successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetTenantSecurityDepositInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const tenantId = String(req.params.tenantCompanyId || "").trim();
    if (!tenantId) return res.status(400).json({ message: "tenantId is required" });

    const result = await resetTenantSecurityDepositInvoiceForCurrentUser({ workspaceId, userId, tenantCompanyId: tenantId });

    return res.status(200).json({
      success: true,
      message: "Security deposit invoice reset successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTenantRentRecords(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });

    const result = await listTenantRentForWorkspace(workspaceId, req.query);

    return res.status(200).json({
      success: true,
      message: "Tenant rent records loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function markTenantRentPaid(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const rentId = String(req.params.rentId || "").trim();
    if (!rentId) return res.status(400).json({ message: "rentId is required" });

    const result = await markTenantRentPaidForWorkspace({ workspaceId, userId, rentId, body: req.body });

    return res.status(200).json({
      success: true,
      message: "Rent marked as paid.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function returnTenantRentProof(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const rentId = String(req.params.rentId || "").trim();
    if (!rentId) return res.status(400).json({ message: "rentId is required" });

    const result = await returnTenantRentProofForWorkspace({ workspaceId, userId, rentId, body: req.body });

    return res.status(200).json({
      success: true,
      message: "Payment proof returned to tenant.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getVirtualOfficeRentRecords(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });

    const result = await listVirtualOfficeRentForWorkspace(workspaceId, req.query);

    return res.status(200).json({
      success: true,
      message: "Virtual office rent records loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function markVirtualOfficeRentPaid(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const recordId = String(req.params.recordId || "").trim();
    if (!recordId) return res.status(400).json({ message: "recordId is required" });

    const result = await markVirtualOfficeRentPaidForWorkspace({ workspaceId, userId, recordId, body: req.body });

    return res.status(200).json({
      success: true,
      message: "Virtual office rent marked as paid.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getIncomeLedgerRecords(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });

    const result = await listIncomeEntriesForWorkspace(workspaceId, req.query);

    return res.status(200).json({
      success: true,
      message: "Income ledger loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function applyFinanceApprovalDecision(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const { requestId, requestType, decision, comment, scope, temporaryFounderOverride } = req.body || {};
    if (!requestId) return res.status(400).json({ message: "requestId is required" });
    if (!requestType) return res.status(400).json({ message: "requestType is required" });
    if (!decision) return res.status(400).json({ message: "decision is required" });

    const roleValue = String((req as any).workspaceMembership?.role?.name || (req as any).workspaceMembership?.role || "")
      .trim().toLowerCase().replace(/[\s-]+/g, "_");
    const isOwner = ["owner", "founder", "super_admin", "admin"].includes(roleValue);
    // Workspace members may be stored as the generic Manager role while their
    // Finance department assignment supplies the functional Finance Manager scope.
    const membershipDepartments = Array.isArray((req as any).workspaceMembership?.departments)
      ? (req as any).workspaceMembership.departments
      : [];
    const isFinanceDepartmentMember = membershipDepartments.some((department: any) =>
      String(department?.name || department?.label || department || "")
        .trim().toLowerCase().replace(/[\s-]+/g, "_") === "finance"
    );
    const isFinanceManager = ["finance_manager", "finance"].includes(roleValue) ||
      (roleValue === "manager" && isFinanceDepartmentMember);
    const effectiveScope = isOwner ? "owner" : isFinanceManager ? "financeManager" : null;
    if (!effectiveScope) return res.status(403).json({ message: "Only the owner or finance manager can decide finance requests." });
    if (scope && scope !== effectiveScope) return res.status(403).json({ message: "Approval scope does not match the authenticated role." });
    if (temporaryFounderOverride && (effectiveScope !== "financeManager" || decision !== "Approved")) {
      return res.status(403).json({ message: "Temporary founder override is available only to Finance Manager while approving a request." });
    }

    const body = {
      status: decision,
      scope: effectiveScope,
      note: comment || "",
      temporaryFounderOverride: temporaryFounderOverride === true,
    };

    const result = await applyFinanceApprovalDecisionInternal({
      workspaceId,
      userId,
      requestId,
      requestType,
      body,
    });

    return res.status(200).json({
      success: true,
      message: "Approval decision applied successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPayrollSnapshot(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found." });
    const result = await getPayrollSnapshotForCurrentUser({ workspace, userId, query: req.query });

    return res.status(200).json({
      success: true,
      message: "Payroll snapshot loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyPayslips(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found." });
    const result = await listPayslipsForCurrentUser({ workspace, userId, query: req.query });

    return res.status(200).json({
      success: true,
      message: "Payslips loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function processPayrollPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const { cycleId, profileId, ...body } = req.body || {};
    if (!cycleId || !profileId) return res.status(400).json({ message: "cycleId and profileId are required" });
    const result = await processPayrollPaymentForCurrentUser({ workspaceId, userId, cycleId, employeeProfileId: profileId, body });

    return res.status(200).json({
      success: true,
      message: "Payroll payment processed successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function generatePayslip(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const { cycleId, profileId } = req.body || {};
    if (!cycleId || !profileId) return res.status(400).json({ message: "cycleId and profileId are required" });
    const result = await generatePayslipForCurrentUser({ workspaceId, userId, cycleId, employeeProfileId: profileId });

    return res.status(201).json({
      success: true,
      message: "Payslip generated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function sendPayslip(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const { payslipId } = req.body || {};
    if (!payslipId) return res.status(400).json({ message: "payslipId is required" });

    const result = await sendPayslipToEmployeeForCurrentUser({ workspaceId, userId, payslipId });

    return res.status(200).json({
      success: true,
      message: "Payslip sent successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

function slugifyVendorKey(name: string) {
  const cleaned = String(name || "vendor")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (cleaned || "vendor").slice(0, 40);
}

export async function listVendors(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });

    const vendors = await FinanceVendor.find({ workspaceId }).sort({ name: 1 }).lean().exec();

    return res.status(200).json({
      message: "Vendors loaded successfully",
      data: { vendors },
    });
  } catch (error) {
    next(error);
  }
}

export async function createVendorQuick(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });

    const { name, contactPerson, phone, email, category } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Vendor name is required" });
    }

    const base = slugifyVendorKey(name);
    let vendorKey = base;
    let suffix = 1;
    while (await FinanceVendor.exists({ workspaceId, vendorKey })) {
      suffix += 1;
      vendorKey = `${base}-${suffix}`;
    }

    const vendor = await FinanceVendor.create({
      workspaceId,
      vendorKey,
      name: String(name).trim(),
      contactPerson: contactPerson || "",
      phone: phone || "",
      email: email || "",
      category: category || "",
    });

    return res.status(201).json({
      message: "Vendor created successfully",
      data: { vendor },
    });
  } catch (error) {
    next(error);
  }
}
