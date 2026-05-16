import type { AxiosInstance } from "axios";

export const updateEmployeeAccess = (
  axiosPrivate: AxiosInstance,
  employeeId: string,
  payload: { accessModules: string[]; accessFeatures?: string[] },
) => axiosPrivate.patch(`/api/organization/members/${employeeId}/access`, payload);
