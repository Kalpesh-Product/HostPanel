import { axiosPrivate } from "../utils/axios";

export const createReport = async (payload: Record<string, any>) => {
  return axiosPrivate.post("/api/v1/reports", payload);
};
