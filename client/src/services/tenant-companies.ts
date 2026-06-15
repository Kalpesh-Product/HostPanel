import { axiosPrivate } from "../utils/axios";

export const getTenantCompanies = async () => {
  return axiosPrivate.get("/api/v1/tenant-companies");
};

export const getTenantCompanySectors = async () => {
  return axiosPrivate.get("/api/v1/tenant-companies/sectors");
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

export const getTenantCompany = async (id: string) => {
  return axiosPrivate.get(`/api/v1/tenant-companies/${id}`);
};

export const deleteTenantCompanyEmployee = async (tenantCompanyId: string, employeeId: string) => {
  return axiosPrivate.delete(`/api/v1/tenant-companies/${tenantCompanyId}/employees/${employeeId}`);
};

export const updateTenantCompanyEmployee = async (tenantCompanyId: string, employeeId: string, payload: Record<string, any>) => {
  return axiosPrivate.patch(`/api/v1/tenant-companies/${tenantCompanyId}/employees/${employeeId}`, payload);
};

export const updateTenantCompanyEmployeeStatus = async (tenantCompanyId: string, employeeId: string, payload: Record<string, any>) => {
  return axiosPrivate.patch(`/api/v1/tenant-companies/${tenantCompanyId}/employees/${employeeId}/status`, payload);
};

export const updateTenantCompanyManager = async (tenantCompanyId: string, payload: Record<string, any>) => {
  return axiosPrivate.patch(`/api/v1/tenant-companies/${tenantCompanyId}/manager`, payload);
};

export const assignTenantCompanySpace = async (tenantCompanyId: string, payload: Record<string, any>) => {
  return axiosPrivate.post(`/api/v1/tenant-companies/${tenantCompanyId}/space`, payload);
};

export const getMyTenantCompanyCreditRequests = async () => {
  return axiosPrivate.get("/api/v1/tenant-companies/my/credit-requests");
};

export const createMyTenantCompanyCreditRequest = async (payload: Record<string, any>) => {
  return axiosPrivate.post("/api/v1/tenant-companies/my/credit-requests", payload);
};

export const submitMyTenantCompanyCreditRequestPayment = async (requestId: string, payload: Record<string, any>) => {
  return axiosPrivate.post(`/api/v1/tenant-companies/my/credit-requests/${requestId}/payment`, payload);
};
