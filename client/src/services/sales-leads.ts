import { axiosPrivate } from "../utils/axios";

export const getSalesTourLeads = async (params?: Record<string, any>) => {
  return axiosPrivate.get("/api/v1/sales-leads", { params });
};

export const getWebsiteLeads = async (params?: Record<string, any>) => {
  return axiosPrivate.get("/api/leads/get-leads", { params });
};

export const updateWebsiteLeadHostStatus = async (leadId: string, hostPanelStatus: string) => {
  return axiosPrivate.patch("/api/leads/update-lead", { leadId, hostPanelStatus });
};
