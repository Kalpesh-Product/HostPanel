import { axiosPrivate } from "../utils/axios";

export const getTenantCompanies = async () => {
  return axiosPrivate.get("/api/v1/tenant-companies");
};

export const createTenantCompany = async (payload: Record<string, any>) => {
  return axiosPrivate.post("/api/v1/tenant-companies", payload);
};

export const updateTenantCompany = async (id: string, payload: Record<string, any>) => {
  return axiosPrivate.patch(`/api/v1/tenant-companies/${id}`, payload);
};

export const renewTenantCompany = async (id: string, payload: Record<string, any>) => {
  return axiosPrivate.post(`/api/v1/tenant-companies/${id}/renew`, payload);
};

export const addTenantCompanyEmployee = async (id: string, payload: Record<string, any>) => {
  return axiosPrivate.post(`/api/v1/tenant-companies/${id}/employees`, payload);
};

export const uploadTenantCompanyAgreementDocuments = async (id: string, files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("documents", file));
  return axiosPrivate.post(`/api/v1/tenant-companies/${id}/agreement-documents`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const updateTenantCompanyCreditRequest = async (
  tenantCompanyId: string,
  requestId: string,
  payload: Record<string, any>
) => {
  return axiosPrivate.patch(
    `/api/v1/tenant-companies/${tenantCompanyId}/credit-requests/${requestId}`,
    payload
  );
};
