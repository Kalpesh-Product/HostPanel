import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getTasks = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/tasks", { params });
  return unwrap(response);
};

export const createTask = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/tasks", payload);
  return unwrap(response);
};

export const updateTask = async (taskId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/tasks/${taskId}`, payload);
  return unwrap(response);
};

export const acceptTask = async (taskId: string, payload?: Record<string, any>) => {
  const response = await axiosPrivate.post(`/api/tasks/${taskId}/accept`, payload || {});
  return unwrap(response);
};

export const completeTask = async (taskId: string, payload?: Record<string, any>) => {
  const response = await axiosPrivate.post(`/api/tasks/${taskId}/complete`, payload || {});
  return unwrap(response);
};

export const addTaskComment = async (taskId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.post(`/api/tasks/${taskId}/comments`, payload);
  return unwrap(response);
};

export const uploadTaskAttachments = async (formData: FormData) => {
  const response = await axiosPrivate.post("/api/tasks/attachments", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(response);
};
