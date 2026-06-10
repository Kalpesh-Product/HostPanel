import { axiosPrivate } from "../utils/axios";

export const getResources = async () => {
  return axiosPrivate.get("/api/v1/resources");
};

export const updateResource = async (recordId: string, data: Record<string, unknown>) => {
  return axiosPrivate.patch(`/api/v1/resources/${recordId}`, data);
};

export const assignResource = async (recordId: string, payload: Record<string, any>) => {
  return axiosPrivate.post(`/api/v1/resources/${recordId}/assign`, payload);
};

export const releaseResourceAssignment = async (recordId: string) => {
  return axiosPrivate.post(`/api/v1/resources/${recordId}/release`);
};
