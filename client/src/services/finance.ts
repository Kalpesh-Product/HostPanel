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
