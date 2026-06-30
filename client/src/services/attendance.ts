import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const checkInAttendance = async (payload: FormData) => {
  const response = await axiosPrivate.post("/api/attendance/check-in", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(response);
};

export const checkOutAttendance = async (payload: FormData) => {
  const response = await axiosPrivate.post("/api/attendance/check-out", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(response);
};

export const startBreakAttendance = async () => {
  const response = await axiosPrivate.patch("/api/attendance/start-break");
  return unwrap(response);
};

export const endBreakAttendance = async () => {
  const response = await axiosPrivate.patch("/api/attendance/end-break");
  return unwrap(response);
};

export const getMyAttendance = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/attendance/my", { params });
  return unwrap(response);
};

export const getTeamAttendance = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/attendance/team", { params });
  return unwrap(response);
};

export const requestAttendanceCorrection = async (recordId: string, data: Record<string, any>) => {
  const response = await axiosPrivate.post(`/api/attendance/correction/${recordId}`, data);
  return unwrap(response);
};

export const getEmployeeAttendanceHistory = async (userId: string, params?: Record<string, any>) => {
  const response = await axiosPrivate.get(`/api/attendance/employee/${userId}`, { params });
  return unwrap(response);
};

export const getHrAttendanceReview = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/attendance/hr/review", { params });
  return unwrap(response);
};

export const reviewAttendanceCorrection = async (correctionId: string, action: string, reason?: string) => {
  const response = await axiosPrivate.patch(`/api/attendance/correction/${correctionId}/review`, { action, reason });
  return unwrap(response);
};
