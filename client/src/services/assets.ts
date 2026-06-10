import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getAssets = async () => {
  const response = await axiosPrivate.get("/api/assets");
  return unwrap(response);
};
