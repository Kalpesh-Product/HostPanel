import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getMyNotifications = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/notifications/get-my-notifications", { params });
  return unwrap(response);
};

export const getUnreadCount = async () => {
  const response = await axiosPrivate.get("/api/notifications/unread-count");
  return response?.data?.count ?? 0;
};

export const markNotificationAsRead = async (notificationId: string) => {
  const response = await axiosPrivate.patch(`/api/notifications/mark-as-read/${notificationId}`);
  return unwrap(response);
};

export const markAllNotificationsAsRead = async () => {
  const response = await axiosPrivate.patch("/api/notifications/mark-all-read");
  return unwrap(response);
};

export const deleteNotification = async (notificationId: string) => {
  const response = await axiosPrivate.delete(`/api/notifications/${notificationId}`);
  return unwrap(response);
};

export const createNotification = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/notifications", payload);
  return unwrap(response);
};
