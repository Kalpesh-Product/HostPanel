import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;
export const getResignationSettings = async () => {
  const response = await axiosPrivate.get("/api/hr/resignation-management/settings");
  return unwrap(response);
};

export const updateResignationSettings = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(
    "/api/hr/resignation-management/settings",
    payload,
  );
  return unwrap(response);
};



export const getResignationRequests = async () => {
  const response = await axiosPrivate.get("/api/hr/resignation-management/requests");
  return unwrap(response);
};

export const reviewResignationRequest = async (requestId: string, payload: { status: string; rejectionReason?: string }) => {
  const response = await axiosPrivate.patch(`/api/hr/resignation-management/requests/${requestId}/review`, payload);
  return unwrap(response);
};

export const updateResignationChecklist = async (requestId: string, payload: { itemKey: string; completed: boolean }) => {
  const response = await axiosPrivate.patch(`/api/hr/resignation-management/requests/${requestId}/checklist`, payload);
  return unwrap(response);
};

export const completeResignationRequest = async (requestId: string, payload: Record<string, any> = {}) => {
  const response = await axiosPrivate.post(`/api/hr/resignation-management/requests/${requestId}/complete`, payload);
  return unwrap(response);
};


