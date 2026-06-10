import { axiosPrivate } from "../utils/axios";

export const getPricingPackages = async () => {
  return axiosPrivate.get("/api/v1/pricing-packages");
};

export const createPricingPackage = async (payload: Record<string, any>) => {
  return axiosPrivate.post("/api/v1/pricing-packages", payload);
};

export const updatePricingPackage = async (id: string, payload: Record<string, any>) => {
  return axiosPrivate.patch(`/api/v1/pricing-packages/${id}`, payload);
};

export const deletePricingPackage = async (id: string) => {
  return axiosPrivate.delete(`/api/v1/pricing-packages/${id}`);
};
