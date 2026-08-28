import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getAssets = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/assets", { params });
  return unwrap(response);
};

export const getAssetSummary = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/assets/summary", { params });
  return unwrap(response);
};

export const createAsset = async (payload: Record<string, any> | FormData) => {
  const response = await axiosPrivate.post("/api/assets", payload);
  return unwrap(response);
};

export const updateAsset = async (assetId: string, payload: Record<string, any> | FormData) => {
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

export const releaseAssetAllocation = async (assetId: string, allocationId: string, payload: Record<string, any> = {}) => {
  const response = await axiosPrivate.patch(`/api/assets/${assetId}/allocations/${allocationId}/release`, payload);
  return unwrap(response);
};
export const getAssetRequests = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/assets/requests", { params });
  return unwrap(response);
};

export const createAssetRequest = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/assets/requests", payload);
  return unwrap(response);
};

export const updateAssetRequestStatus = async (requestId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/assets/requests/${requestId}/status`, payload);
  return unwrap(response);
};

export const fulfillAssetRequest = async (requestId: string, assetId: string) => {
  const response = await axiosPrivate.post(`/api/assets/requests/${requestId}/fulfill`, { assetId });
  return unwrap(response);
};
export const getDepartments = async () => {
  const response = await axiosPrivate.get("/api/organization/departments");
  return unwrap(response);
};

export const createAssetCategory = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/assets/create-asset-category", payload);
  return unwrap(response);
};

export const createAssetSubCategory = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/assets/create-asset-subcategory", payload);
  return unwrap(response);
};
