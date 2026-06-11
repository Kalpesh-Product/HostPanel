import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getMeetingRoomBookings = async (workspaceId: string) => {
  const response = await axiosPrivate.get(`/api/meeting-rooms/workspace/${workspaceId}`);
  return unwrap(response);
};

export const getMeetingRoomClients = async () => {
  const response = await axiosPrivate.get("/api/meeting-rooms/bookings/clients");
  return unwrap(response);
};

export const createMeetingRoomBooking = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/meeting-rooms/bookings", payload);
  return unwrap(response);
};

export const updateMeetingRoomBooking = async (bookingId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/meeting-room-bookings/${bookingId}`, payload);
  return unwrap(response);
};

export const respondToMeetingRoomInvite = async (bookingId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.post(`/api/meeting-room-bookings/${bookingId}/respond`, payload);
  return unwrap(response);
};
