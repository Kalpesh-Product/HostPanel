import { axiosPrivate } from "../utils/axios";

export const getResources = async () => {
  return axiosPrivate.get("/api/v1/resources");
};

export const createResource = async (payload: Record<string, unknown>) => {
  return axiosPrivate.post("/api/v1/resources", payload);
};

export const updateResource = async (recordId: string, data: Record<string, unknown>) => {
  return axiosPrivate.patch(`/api/v1/resources/${recordId}`, data);
};

export const deleteResource = async (recordId: string) => {
  return axiosPrivate.delete(`/api/v1/resources/${recordId}`);
};

export const assignResource = async (recordId: string, payload: Record<string, any>) => {
  return axiosPrivate.patch(`/api/v1/resources/${recordId}/assignment`, payload);
};

export const releaseResourceAssignment = async (recordId: string, virtualOfficeId?: string) => {
  const params = virtualOfficeId ? { params: { virtualOfficeId } } : {};
  return axiosPrivate.delete(`/api/v1/resources/${recordId}/assignment`, params);
};

export const getResourceSeats = async (recordId: string) => {
  return axiosPrivate.get(`/api/v1/resources/${recordId}/seats`);
};

export const assignResourceSeat = async (recordId: string, seatNumber: number, payload: Record<string, any>) => {
  return axiosPrivate.patch(`/api/v1/resources/${recordId}/seats/${seatNumber}/assignment`, payload);
};

export const releaseResourceSeatAssignment = async (recordId: string, seatNumber: number) => {
  return axiosPrivate.delete(`/api/v1/resources/${recordId}/seats/${seatNumber}/assignment`);
};

export const getResourceSeatSummary = async (params: { floor?: string; wing?: string; resourceCategory?: string } = {}) => {
  return axiosPrivate.get("/api/v1/resources/seat-summary", { params });
};

export const getResourceSeatAssignments = async () => {
  return axiosPrivate.get("/api/v1/resources/seat-assignments");
};
