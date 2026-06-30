import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getMaintenanceSchedules = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/maintenance/schedules", { params });
  return unwrap(response);
};

export const getMaintenanceScheduleById = async (scheduleId: string) => {
  const response = await axiosPrivate.get(`/api/maintenance/schedules/${scheduleId}`);
  return unwrap(response);
};

export const createMaintenanceSchedule = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/maintenance/schedules", payload);
  return unwrap(response);
};

export const updateMaintenanceSchedule = async (scheduleId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/maintenance/schedules/${scheduleId}`, payload);
  return unwrap(response);
};

export const deleteMaintenanceSchedule = async (scheduleId: string) => {
  const response = await axiosPrivate.delete(`/api/maintenance/schedules/${scheduleId}`);
  return unwrap(response);
};

export const completeMaintenanceSchedule = async (scheduleId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/maintenance/schedules/${scheduleId}/complete`, payload);
  return unwrap(response);
};

export const getMaintenanceOptions = async () => {
  const [assetsRes, overviewRes] = await Promise.allSettled([
    axiosPrivate.get("/api/assets"),
    axiosPrivate.get("/api/organization/overview"),
  ]);

  const assets = assetsRes.status === "fulfilled"
    ? (assetsRes.value?.data?.data?.assets || assetsRes.value?.data?.assets || [])
    : [];

  const overview = overviewRes.status === "fulfilled"
    ? (overviewRes.value?.data?.data || overviewRes.value?.data || {})
    : {};

  const members = Array.isArray(overview.teamMembers) ? overview.teamMembers : [];

  return { assets, members };
};
