import type { AxiosInstance } from "axios";
import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const updateEmployeeAccess = (
  axiosPrivate: AxiosInstance,
  employeeId: string,
  payload: { accessModules: string[]; accessFeatures?: string[] },
) => axiosPrivate.patch(`/api/organization/members/${employeeId}/access`, payload);

export const getEmployeeManagementOverview = async () => {
  const response = await axiosPrivate.get("/api/hr/employee-management/overview");
  return unwrap(response);
};

export const createEmployeeRecord = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/hr/employees", payload);
  return unwrap(response);
};

export const updateEmployeeRecord = async (employeeId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/hr/employees/${employeeId}`, payload);
  return unwrap(response);
};

export const toggleEmployeeStatus = async (employeeId: string) => {
  const response = await axiosPrivate.patch(`/api/hr/employees/${employeeId}/toggle-status`);
  return unwrap(response);
};

export const updateEmployeeAccessRequest = async (employeeId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/organization/members/${employeeId}/access`, payload);
  return unwrap(response);
};

export const getEmployeeDocumentsVault = async () => {
  const response = await axiosPrivate.get("/api/hr/documents/vault");
  return unwrap(response);
};

export const getPayrollSnapshot = async (params?: Record<string, any>) => {
  const response = await axiosPrivate.get("/api/hr/payroll/snapshot", { params });
  return unwrap(response);
};

export const preparePayrollCycle = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/hr/payroll/prepare", payload);
  return unwrap(response);
};

export const updatePayrollCycleStatus = async (cycleId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/hr/payroll/cycles/${cycleId}/status`, payload);
  return unwrap(response);
};

export const addPayrollAdjustment = async (cycleId: string, profileId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.post(`/api/hr/payroll/cycles/${cycleId}/employees/${profileId}/adjustments`, payload);
  return unwrap(response);
};
