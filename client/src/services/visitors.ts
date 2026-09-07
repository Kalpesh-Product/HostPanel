import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getVisitorManagementOverview = async () => {
  const response = await axiosPrivate.get("/api/v1/visitors/overview");
  return unwrap(response);
};

// Requests routed to the current user (via VisitorLog.hostUser) — a
// department manager's approval queue on their own dashboard. Lighter
// than the overview endpoint: only requires workspace membership.
export const getMyVisitorRequests = async () => {
  const response = await axiosPrivate.get("/api/v1/visitors/my-requests");
  return unwrap(response);
};

export const createVisitorLog = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/v1/visitors", payload);
  return unwrap(response);
};

export const checkInVisitorLog = async (visitorId: string, payload: Record<string, any> = {}) => {
  const response = await axiosPrivate.patch(`/api/v1/visitors/${visitorId}/check-in`, payload);
  return unwrap(response);
};

export const checkOutVisitorLog = async (visitorId: string, payload: Record<string, any> = {}) => {
  const response = await axiosPrivate.patch(`/api/v1/visitors/${visitorId}/check-out`, payload);
  return unwrap(response);
};

export const reviewVisitorDecision = async (
  visitorId: string,
  payload: { decision: "approved" | "rejected"; reason?: string },
) => {
  const response = await axiosPrivate.patch(`/api/v1/visitors/${visitorId}/decision`, payload);
  return unwrap(response);
};

// Fetch unit tour leads from visitor logs (visitors with 'Workspace Tour' purpose)
export const getUnitTourLeads = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/v1/visitors", {
    params: { limit: 100, purpose: "Workspace Tour", ...params },
  });
  return unwrap(response);
};

export const updateUnitTourLeadStatus = async (visitorId: string, leadStatus: string) => {
  const response = await axiosPrivate.patch(`/api/v1/visitors/${visitorId}/lead-status`, { leadStatus });
  return unwrap(response);
};
