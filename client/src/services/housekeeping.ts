import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T =>
  response?.data?.data ?? response?.data ?? response;

export const getHousekeepingOverview = async () => {
  const [tasksRes, staffRes] = await Promise.allSettled([
    axiosPrivate.get("/api/housekeeping/tasks", { params: { limit: 1000 } }),
    axiosPrivate.get("/api/housekeeping/staff", { params: { limit: 1000 } }),
  ]);

  const tasks = tasksRes.status === "fulfilled"
    ? (tasksRes.value?.data?.data?.tasks || tasksRes.value?.data?.tasks || [])
    : [];

  const staff = staffRes.status === "fulfilled"
    ? (staffRes.value?.data?.data?.staff || staffRes.value?.data?.staff || [])
    : [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const pendingTasks = tasks.filter(
    (t: any) => t.sourceType !== "booking" && t.status === "Pending"
  ).length;

  const activeTasks = tasks.filter(
    (t: any) => t.status === "In Progress" || t.status === "Assigned"
  ).length;

  const completedToday = tasks.filter((t: any) => {
    if (t.status !== "Completed" || !t.completedAt) return false;
    const d = new Date(t.completedAt);
    return d >= todayStart;
  }).length;

  const bookingTriggers = tasks.filter(
    (t: any) => t.sourceType === "booking" && t.status !== "Completed" && t.status !== "Cancelled"
  ).length;

  const summary = { pendingTasks, activeTasks, completedToday, bookingTriggers };

  return { data: { tasks, staff, summary } };
};

export const getHousekeepingTasks = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/housekeeping/tasks", { params });
  return unwrap(response);
};

export const createHousekeepingTask = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/housekeeping/tasks", payload);
  return unwrap(response);
};

export const updateHousekeepingTask = async (taskId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/housekeeping/tasks/${taskId}`, payload);
  return unwrap(response);
};

export const completeHousekeepingTask = async (taskId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/housekeeping/tasks/${taskId}/complete`, payload);
  return unwrap(response);
};

export const deleteHousekeepingTask = async (taskId: string) => {
  const response = await axiosPrivate.delete(`/api/housekeeping/tasks/${taskId}`);
  return unwrap(response);
};

export const getHousekeepingStaff = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/housekeeping/staff", { params });
  return unwrap(response);
};

export const createHousekeepingStaff = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/housekeeping/staff", payload);
  return unwrap(response);
};

export const updateHousekeepingStaffAttendance = async (staffId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/housekeeping/staff/${staffId}/attendance`, payload);
  return unwrap(response);
};

export const bulkUploadHousekeepingWorkbook = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosPrivate.post("/api/housekeeping/bulk-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(response);
};
