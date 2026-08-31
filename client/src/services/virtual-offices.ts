import { axiosPrivate } from "../utils/axios";

export const getVirtualOffices = async (params?: Record<string, any>) => {
  return axiosPrivate.get("/api/v1/virtual-offices", { params });
};

export const getVirtualOffice = async (id: string) => {
  return axiosPrivate.get(`/api/v1/virtual-offices/${id}`);
};

export const createVirtualOffice = async (payload: Record<string, any>) => {
  return axiosPrivate.post("/api/v1/virtual-offices", payload);
};

export const updateVirtualOffice = async (id: string, payload: Record<string, any>) => {
  return axiosPrivate.patch(`/api/v1/virtual-offices/${id}`, payload);
};

export const deleteVirtualOffice = async (id: string) => {
  return axiosPrivate.delete(`/api/v1/virtual-offices/${id}`);
};

export const recordVirtualOfficeRentPayment = async (id: string, payload: Record<string, any>) => {
  return axiosPrivate.post(`/api/v1/virtual-offices/${id}/rent-payments`, payload);
};
