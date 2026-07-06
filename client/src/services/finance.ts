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
  payload: { status: string; fiscalYear?: string },
) => {
  const response = await axiosPrivate.patch(
    `/api/finance/requests/${type}/${id}/decision`,
    payload,
  );
  return unwrap(response);
};

/**
 * Mark a monthly expense as paid (or update its payment status).
 */
export const updateMonthlyExpenseStatus = async (payload: {
  fiscalYear: string;
  monthKey: string;
  expenseId: string;
  status: string;
}) => {
  const response = await axiosPrivate.patch(
    '/api/finance/monthly-expense/status',
    payload,
  );
  return unwrap(response);
};

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

export const processPayrollPayment = async (cycleId: string, profileId: string, payload: Record<string, any>) => {
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
