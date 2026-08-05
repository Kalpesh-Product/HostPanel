import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getLeaveRequests = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/leave-requests", { params });
  return unwrap(response);
};

export const updateLeaveRequest = async (requestId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/leave-requests/${requestId}`, payload);
  return unwrap(response);
};

export const createLeaveRequest = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/leave-requests", payload);
  return unwrap(response);
};

export const uploadLeaveCertificate = async (formData: FormData) => {
  const response = await axiosPrivate.post("/api/leave-requests/certificate", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(response);
};

export const getLeaveQuotas = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/leave-requests/quotas", { params });
  return unwrap(response);
};

export const updateLeaveQuota = async (userId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/leave-requests/quotas/${userId}`, payload);
  return unwrap(response);
};

export const getHolidays = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/leave-requests/holidays", { params });
  return unwrap(response);
};

export const createHoliday = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/leave-requests/holidays", payload);
  return unwrap(response);
};

export const updateHoliday = async (holidayId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/leave-requests/holidays/${holidayId}`, payload);
  return unwrap(response);
};

export const deleteHoliday = async (holidayId: string) => {
  const response = await axiosPrivate.delete(`/api/leave-requests/holidays/${holidayId}`);
  return unwrap(response);
};
