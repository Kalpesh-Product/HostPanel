import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getAssets = async () => {
  const response = await axiosPrivate.get("/api/assets");
  return unwrap(response);
};

export const createAsset = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/assets", payload);
  return unwrap(response);
};

export const updateAsset = async (assetId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/assets/${assetId}`, payload);
  return unwrap(response);
};

export const deleteAsset = async (assetId: string) => {
  const response = await axiosPrivate.delete(`/api/assets/${assetId}`);
  return unwrap(response);
};

export const getAssetById = async (assetId: string) => {
  const response = await axiosPrivate.get(`/api/assets/${assetId}`);
  return unwrap(response);
};

export const transferAsset = async (assetId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/assets/${assetId}/transfer`, payload);
  return unwrap(response);
};

export const getDepartments = async () => {
  const response = await axiosPrivate.get("/api/organization/departments");
  return unwrap(response);
};
