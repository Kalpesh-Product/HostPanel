import { axiosPrivate } from "../utils/axios";

export const getSalesTourLeads = async (params?: Record<string, any>) => {
  return axiosPrivate.get("/api/v1/sales-leads", { params });
};

export const getWebsiteLeads = async (params?: Record<string, any>) => {
  return axiosPrivate.get("/api/leads/get-leads", { params });
};
