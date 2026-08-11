import { axiosPrivate } from '../utils/axios';

const unwrap = <T = any>(response: any): T =>
  response?.data?.data ?? response?.data ?? response;

/**
 * Get the full finance snapshot for a given fiscal year.
 */
export const getFinanceSnapshot = async (fiscalYear: string) => {
  const response = await axiosPrivate.get('/api/finance/snapshot', {
    params: { fiscalYear },
  });
  return unwrap(response);
};

/**
 * Apply an approval decision (Approved / Rejected / Discuss) on an annual or extra finance request.
 */
export const applyFinanceApprovalDecision = async (
  type: string,
  id: string,
  payload: { status: string; fiscalYear?: string; scope?: 'owner' | 'financeManager'; note?: string },
) => {
  const response = await axiosPrivate.post('/api/finance/approval/decision', {
    requestId: id,
    requestType: type,
    decision: payload.status,
    scope: payload.scope,
    comment: payload.note,
    fiscalYear: payload.fiscalYear,
  });
  return unwrap(response);
};

/**
 * Mark a monthly expense as paid (or update its payment status).
 */
export const updateMonthlyExpenseStatus = async (payload: {
  planId?: string;
  fiscalYear: string;
  monthKey: string;
  expenseId: string;
  expenseKey?: string;
  department?: string;
  status: string;
  paymentStatus?: string;
}) => {
  const response = await axiosPrivate.patch(
    '/api/finance/department/month-expense/status',
    payload,
  );
  return unwrap(response);
};

// --- Department Finance Page V2 ---

export const getDepartmentFinanceData = async (fiscalYear: string, department: string) => {
  const response = await axiosPrivate.get('/api/finance/department', {
    params: { fiscalYear, department },
  });
  return unwrap(response);
};

export const importFinanceSnapshot = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post('/api/finance/department/import-snapshot', payload);
  return unwrap(response);
};

export const resetRejectedAnnualBudget = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post('/api/finance/department/reset-rejected', payload);
  return unwrap(response);
};

export const sendReminder = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post('/api/finance/department/send-reminder', payload);
  return unwrap(response);
};

export const submitBudgetRequest = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post('/api/finance/department/budget-request', payload);
  return unwrap(response);
};

export const submitVendor = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post('/api/finance/department/vendor', payload);
  return unwrap(response);
};

export const submitExtraBudget = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post('/api/finance/department/extra-budget-request', payload);
  return unwrap(response);
};

export const uploadInvoice = async (formData: FormData) => {
  const response = await axiosPrivate.post('/api/finance/department/invoice', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response);
};

// --- Existing Services ---

export const getMyPayslips = async () => {
  const response = await axiosPrivate.get("/api/finance/payroll/my-payslips");
  return unwrap(response);
};

export const getTenantBillingSnapshot = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/finance/tenant-billing", { params });
  return unwrap(response);
};

export const markTenantSecurityDepositPaid = async (recordId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/finance/tenant-billing/mark-deposit-paid", { recordId, ...payload });
  return unwrap(response);
};

export const generateTenantSecurityDepositInvoice = async (recordId: string) => {
  const response = await axiosPrivate.post("/api/finance/tenant-billing/generate-deposit-invoice", { recordId });
  return unwrap(response);
};

export const sendTenantSecurityDepositInvoice = async (recordId: string) => {
  const response = await axiosPrivate.post("/api/finance/tenant-billing/send-deposit-invoice", { recordId });
  return unwrap(response);
};

export const resetTenantSecurityDepositInvoice = async (recordId: string) => {
  const response = await axiosPrivate.post("/api/finance/tenant-billing/reset-deposit-invoice", { recordId });
  return unwrap(response);
};

export const getPayrollSnapshot = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/finance/payroll/snapshot", { params });
  return unwrap(response);
};

export const processPayrollPayment = async (cycleId: string, profileId: string, payload: Record<string, any> = {}) => {
  const response = await axiosPrivate.post("/api/finance/payroll/process-payment", { cycleId, profileId, ...payload });
  return unwrap(response);
};

export const generatePayrollPayslip = async (cycleId: string, profileId: string) => {
  const response = await axiosPrivate.post("/api/finance/payroll/generate-payslip", { cycleId, profileId });
  return unwrap(response);
};

export const sendPayrollPayslip = async (payslipId: string) => {
  const response = await axiosPrivate.post("/api/finance/payroll/send-payslip", { payslipId });
  return unwrap(response);
};
