import { axiosPrivate } from "../utils/axios";

export const updateEmployeeAccess = (
  axiosPrivate: any,
  employeeId: string,
  payload: { accessModules: string[]; accessFeatures?: string[] },
) => axiosPrivate.patch(`/api/organization/members/${employeeId}/access`, payload);

export const getEmployeeManagementOverview = async () => {
  return axiosPrivate.get("/api/hr/employee-management/overview");
};

export const createEmployeeRecord = async (payload: Record<string, any>) => {
  return axiosPrivate.post("/api/hr/employees", payload);
};

export const uploadEmployeeDocuments = async (formData: FormData) => {
  return axiosPrivate.post("/api/hr/employees/documents/upload", formData);
};

export const updateEmployeeRecord = async (employeeId: string, payload: Record<string, any>) => {
  return axiosPrivate.patch(`/api/hr/employees/${employeeId}`, payload);
};

export const updateMyEmployeeProfile = async (payload: Record<string, any>) => {
  return axiosPrivate.patch("/api/hr/my-profile", payload);
};

export const updateMyProfilePicture = async (formData: FormData) => {
  return axiosPrivate.patch("/api/hr/my-profile/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const toggleEmployeeStatus = async (employeeId: string) => {
  return axiosPrivate.patch(`/api/hr/employees/${employeeId}/toggle-status`);
};

export const updateEmployeeAccessRequest = async (employeeId: string, payload: Record<string, any>) => {
  return axiosPrivate.patch(`/api/organization/members/${employeeId}/access`, payload);
};

export const getEmployeeDocumentsVault = async () => {
  return axiosPrivate.get("/api/hr/documents/vault");
};

export const getPayrollSnapshot = async (params?: Record<string, any>) => {
  return axiosPrivate.get("/api/hr/payroll/snapshot", { params });
};

export const preparePayrollCycle = async (payload: Record<string, any>) => {
  return axiosPrivate.post("/api/hr/payroll/prepare", payload);
};

export const updatePayrollCycleStatus = async (cycleId: string, payload: Record<string, any>) => {
  return axiosPrivate.patch(`/api/hr/payroll/cycles/${cycleId}/status`, payload);
};

export const addPayrollAdjustment = async (cycleId: string, profileId: string, payload: Record<string, any>) => {
  return axiosPrivate.post(`/api/hr/payroll/cycles/${cycleId}/employees/${profileId}/adjustments`, payload);
};
