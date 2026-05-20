import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getMeetingRoomBookings = async () => {
  const response = await axiosPrivate.get("/api/meeting-room-bookings");
  return unwrap(response);
};

export const getMeetingRoomClients = async () => {
  const response = await axiosPrivate.get("/api/meeting-room-bookings/clients");
  return unwrap(response);
};

export const createMeetingRoomBooking = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/meeting-room-bookings", payload);
  return unwrap(response);
};

export const updateMeetingRoomBooking = async (bookingId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/meeting-room-bookings/${bookingId}`, payload);
  return unwrap(response);
};
