import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getTickets = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/tickets", { params });
  return unwrap(response);
};

export const createTicket = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/tickets", payload);
  return unwrap(response);
};

export const updateTicket = async (ticketId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/tickets/${ticketId}`, payload);
  return unwrap(response);
};

export const getTicketIssueSuggestions = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/tickets/issue-suggestions", { params });
  return unwrap(response);
};
