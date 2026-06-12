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

export const releaseResourceAssignment = async (recordId: string) => {
  return axiosPrivate.delete(`/api/v1/resources/${recordId}/assignment`);
};
