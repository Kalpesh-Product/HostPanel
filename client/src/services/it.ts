import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getITOverview = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/it/overview", { params });
  return unwrap(response);
};
