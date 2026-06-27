import { axiosPrivate } from "../utils/axios";

interface GetReportsParams {
  page?: number;
  limit?: number;
}

interface GetReportsFilteredParams {
  department?: string;
  dataWindow?: string;
  month?: string;
}

export const createReport = async (payload: Record<string, any>) => {
  return axiosPrivate.post("/api/v1/reports", payload);
};

export const getReports = async (params?: GetReportsParams) => {
  const response = await axiosPrivate.get("/api/v1/reports", { params });
  return response;
};

export const getReportsFiltered = async (params?: GetReportsFilteredParams) => {
  const response = await axiosPrivate.get("/api/v1/reports/filtered", { params });
  return response;
};

export const downloadReport = async (recordId: string, options?: { format?: string }) => {
  const response = await axiosPrivate.get(`/api/v1/reports/${recordId}/download`, {
    params: { format: options?.format },
  });
  return response;
};
