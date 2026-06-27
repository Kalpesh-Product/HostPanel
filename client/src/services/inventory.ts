import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getInventory = async () => {
  const response = await axiosPrivate.get("/api/inventory");
  return unwrap(response);
};

export const createInventory = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/inventory", payload);
  return unwrap(response);
};

export const updateInventory = async (itemId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/inventory/${itemId}`, payload);
  return unwrap(response);
};

export const allocateInventory = async (itemId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/inventory/${itemId}/allocate`, payload);
  return unwrap(response);
};

export const transferInventory = async (itemId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/inventory/${itemId}/transfer`, payload);
  return unwrap(response);
};

export const deleteInventory = async (itemId: string) => {
  const response = await axiosPrivate.delete(`/api/inventory/${itemId}`);
  return unwrap(response);
};
