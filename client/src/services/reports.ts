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

export const createReport = async (payload: Record<string, any>) => {
  return axiosPrivate.post("/api/reports", payload);
};

export const getReports = async (params?: GetReportsParams) => {
  const response = await axiosPrivate.get("/api/reports", { params });
  return response;
};

export const getReportsFiltered = async (params?: GetReportsParams) => {
  const response = await axiosPrivate.get("/api/reports", { params });
  return response;
};

export const downloadReport = async (recordId: string, options?: { format?: string }) => {
  const response = await axiosPrivate.post(`/api/reports/${recordId}/download`, {
    format: options?.format,
  });
  return response;
};
