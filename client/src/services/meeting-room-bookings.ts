import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

const BASE = "/api/meeting-rooms";

// ======================
// MEETING ROOMS
// ======================
export const getMeetingRooms = async (workspaceId: string) => {
  const response = await axiosPrivate.get(`${BASE}/workspace/${workspaceId}`);
  return unwrap(response);
};

export const getMeetingRoomById = async (id: string) => {
  const response = await axiosPrivate.get(`${BASE}/${id}`);
  return unwrap(response);
};

// ======================
// BOOKINGS
// ======================
export const getMeetingRoomBookings = async (workspaceId: string) => {
  const response = await axiosPrivate.get(`${BASE}/bookings/workspace/${workspaceId}`);
  return unwrap(response);
};

export const getMyBookings = async () => {
  const response = await axiosPrivate.get(`${BASE}/bookings/my`);
  return unwrap(response);
};

export const createMeetingRoomBooking = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post(`${BASE}/bookings`, payload);
  return unwrap(response);
};

export const updateMeetingRoomBooking = async (bookingId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`${BASE}/bookings/${bookingId}`, payload);
  return unwrap(response);
};

export const cancelBooking = async (bookingId: string) => {
  const response = await axiosPrivate.patch(`${BASE}/bookings/${bookingId}/cancel`);
  return unwrap(response);
};

export const respondToMeetingRoomInvite = async (bookingId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.post(`${BASE}/bookings/${bookingId}/respond`, payload);
  return unwrap(response);
};

// ======================
// CLIENTS / OTHER (Added for VisitorManagement.tsx)
// ======================
export const getMeetingRoomClients = async () => {
  // TODO: Add this route in backend if it doesn't exist yet
  const response = await axiosPrivate.get("/api/meeting-rooms/bookings/clients");
  return unwrap(response);
};