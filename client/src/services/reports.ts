import { axiosPrivate } from "../utils/axios";

interface GetReportsParams {
  page?: number;
  limit?: number;
  department?: string;
  category?: string;
  dataWindow?: string;
  month?: string;
  status?: string;
}

// The backend always wraps payloads as { success, message, data: <payload> },
// same as every other service in this codebase (see finance.ts's unwrap()).
// Callers here were written expecting response.data.<field> to be the real
// payload — i.e. one level of unwrapping already done — so we unwrap and
// re-wrap as { data: <payload> } to match that existing call-site shape
// rather than touching every caller.
const unwrap = (response: any) => ({ data: response?.data?.data ?? response?.data ?? response });

export const createReport = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/reports", payload);
  return unwrap(response);
};

export const getReports = async (params?: GetReportsParams) => {
  const response = await axiosPrivate.get("/api/reports", { params });
  return unwrap(response);
};

export const getReportsFiltered = async (params?: GetReportsParams) => {
  const response = await axiosPrivate.get("/api/reports", { params });
  return unwrap(response);
};

export const downloadReport = async (recordId: string, options?: { format?: string }) => {
  const response = await axiosPrivate.post(`/api/reports/${recordId}/download`, {
    format: options?.format,
  });
  return unwrap(response);
};
