import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getPrintoutRequests = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/printouts", { params });
  return unwrap(response);
};

export const createPrintoutRequest = async (payload: Record<string, any>, files?: File[]) => {
  if (files && files.length > 0) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    files.forEach((file) => formData.append("attachments", file));

    const response = await axiosPrivate.post("/api/printouts", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap(response);
  }

  const response = await axiosPrivate.post("/api/printouts", payload);
  return unwrap(response);
};

export const updatePrintoutRequest = async (requestId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/printouts/${requestId}`, payload);
  return unwrap(response);
};
