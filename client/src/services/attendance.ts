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

export const getAttendanceGeofence = async () => {
  const response = await axiosPrivate.get("/api/attendance/geofence");
  return unwrap(response);
};

export const resolveAttendanceGeofenceUrl = async (data: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/attendance/geofence/resolve", data);
  return unwrap(response);
};

export const updateAttendanceGeofence = async (data: Record<string, any>) => {
  const response = await axiosPrivate.patch("/api/attendance/geofence", data);
  return unwrap(response);
};

export const getAttendanceSettings = async () => {
  const response = await axiosPrivate.get("/api/attendance/settings");
  return unwrap(response);
};

export const updateAttendanceSettings = async (data: Record<string, any>) => {
  const response = await axiosPrivate.patch("/api/attendance/settings", data);
  return unwrap(response);
};

export const reviewAttendanceCorrection = async (correctionId: string, action: string, reason?: string) => {
  const response = await axiosPrivate.patch(`/api/attendance/correction/${correctionId}/review`, { action, reason });
  return unwrap(response);
};

// Proxy attendance — for employees onboarded with no login (e.g. housekeeping
// staff). An admin marks the punch on their behalf.
export const getProxyAttendanceToday = async (employeeProfileId: string) => {
  const response = await axiosPrivate.get(`/api/attendance/proxy/${employeeProfileId}/today`);
  return unwrap(response);
};

export const proxyCheckInAttendance = async (employeeProfileId: string) => {
  const response = await axiosPrivate.post(`/api/attendance/proxy/${employeeProfileId}/check-in`);
  return unwrap(response);
};

export const proxyStartBreakAttendance = async (employeeProfileId: string) => {
  const response = await axiosPrivate.patch(`/api/attendance/proxy/${employeeProfileId}/start-break`);
  return unwrap(response);
};

export const proxyEndBreakAttendance = async (employeeProfileId: string) => {
  const response = await axiosPrivate.patch(`/api/attendance/proxy/${employeeProfileId}/end-break`);
  return unwrap(response);
};

export const proxyCheckOutAttendance = async (employeeProfileId: string) => {
  const response = await axiosPrivate.post(`/api/attendance/proxy/${employeeProfileId}/check-out`);
  return unwrap(response);
};

export const getProxyAttendanceMonth = async (employeeProfileId: string, month?: string) => {
  const response = await axiosPrivate.get(`/api/attendance/proxy/${employeeProfileId}/month`, { params: month ? { month } : undefined });
  return unwrap(response);
};

export const requestProxyAttendanceCorrection = async (employeeProfileId: string, recordId: string, input: Record<string, any>) => {
  const response = await axiosPrivate.post(`/api/attendance/proxy/${employeeProfileId}/${recordId}/correction`, input);
  return unwrap(response);
};
