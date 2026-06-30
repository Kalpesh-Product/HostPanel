import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getExitRequests = async () => {
  const response = await axiosPrivate.get("/api/hr/exit-management/requests");
  return unwrap(response);
};

export const reviewExitRequest = async (requestId: string, payload: { status: string; rejectionReason?: string }) => {
  const response = await axiosPrivate.patch(`/api/hr/exit-management/requests/${requestId}/review`, payload);
  return unwrap(response);
};

export const updateExitChecklist = async (requestId: string, payload: { itemKey: string; completed: boolean }) => {
  const response = await axiosPrivate.patch(`/api/hr/exit-management/requests/${requestId}/checklist`, payload);
  return unwrap(response);
};

export const completeExitRequest = async (requestId: string, payload: Record<string, any> = {}) => {
  const response = await axiosPrivate.post(`/api/hr/exit-management/requests/${requestId}/complete`, payload);
  return unwrap(response);
};


