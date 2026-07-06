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
export const getMeetingRoomBookings = async (workspaceIdOrParams?: string | Record<string, any>) => {
  if (typeof workspaceIdOrParams === 'string') {
    const response = await axiosPrivate.get(`${BASE}/bookings/workspace/${workspaceIdOrParams}`);
    return unwrap(response);
  }
  const response = await axiosPrivate.get("/api/meeting-rooms/bookings", { params: workspaceIdOrParams });
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

export const cancelBooking = async (bookingId: string, cancelReason?: string) => {
  const response = await axiosPrivate.patch(`${BASE}/bookings/${bookingId}/cancel`, { cancelReason });
  return unwrap(response);
};

export const respondToMeetingRoomInvite = async (bookingId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.post(`${BASE}/bookings/${bookingId}/respond`, payload);
  return unwrap(response);
};

// ======================
// CLIENTS / OTHER (Added for VisitorManagement.tsx)
// ======================
export const getBookingsByTenantCompany = async (tenantCompanyId: string) => {
  const response = await axiosPrivate.get(`/api/meeting-rooms/bookings/tenant-company/${tenantCompanyId}`);
  return unwrap(response);
};

export const getMeetingRoomClients = async () => {
  // TODO: Add this route in backend if it doesn't exist yet
  const response = await axiosPrivate.get("/api/meeting-rooms/bookings/clients");
  return unwrap(response);
};

// ======================
// EXTERNAL CLIENTS
// ======================
export const getExternalClients = async (workspaceId: string, search?: string) => {
  const params: Record<string, string> = { workspaceId };
  if (search && search.length >= 2) params.search = search;
  const response = await axiosPrivate.get(`${BASE}/clients`, { params });
  return response?.data?.data || response?.data || [];
};

export const createExternalClient = async (payload: {
  workspaceId: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
}) => {
  const response = await axiosPrivate.post(`${BASE}/clients`, payload);
  return response?.data?.data || response?.data;
};

export const sendExternalBookingConfirmationEmail = async (bookingId: string) => {
  const response = await axiosPrivate.post(`${BASE}/bookings/${bookingId}/send-confirmation`);
  return response?.data;
};

// ======================
// INVOICES (for Finance module)
// ======================
export const generateMeetingRoomInvoice = async (bookingId: string) => {
  const response = await axiosPrivate.post(`/api/meeting-rooms/bookings/${bookingId}/generate-invoice`);
  return unwrap(response);
};

export const resetMeetingRoomInvoice = async (bookingId: string) => {
  const response = await axiosPrivate.post(`/api/meeting-rooms/bookings/${bookingId}/reset-invoice`);
  return unwrap(response);
};

export const sendMeetingRoomInvoice = async (bookingId: string) => {
  const response = await axiosPrivate.post(`/api/meeting-rooms/bookings/${bookingId}/send-invoice`);
  return unwrap(response);
};
