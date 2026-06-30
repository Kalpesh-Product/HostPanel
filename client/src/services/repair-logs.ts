import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getRepairLogs = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/maintenance/repair-logs", { params });
  return unwrap(response);
};

export const getRepairLogById = async (repairLogId: string) => {
  const response = await axiosPrivate.get(`/api/maintenance/repair-logs/${repairLogId}`);
  return unwrap(response);
};

export const createRepairLog = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/maintenance/repair-logs", payload);
  return unwrap(response);
};

export const updateRepairLog = async (repairLogId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/maintenance/repair-logs/${repairLogId}`, payload);
  return unwrap(response);
};

export const deleteRepairLog = async (repairLogId: string) => {
  const response = await axiosPrivate.delete(`/api/maintenance/repair-logs/${repairLogId}`);
  return unwrap(response);
};

export const getRepairLogOptions = async () => {
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
