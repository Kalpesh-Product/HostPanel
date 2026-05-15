import type { AxiosInstance } from "axios";

export const getOrganizationOverview = (axiosPrivate: AxiosInstance) =>
  axiosPrivate.get("/api/organization/overview");

export const saveOrganizationDepartment = (
  axiosPrivate: AxiosInstance,
  payload: { departmentId?: string; name: string; description?: string; isActive?: boolean },
) => {
  const hasDepartmentId = Boolean(payload.departmentId);
  const path = hasDepartmentId
    ? `/api/organization/departments/${payload.departmentId}`
    : "/api/organization/departments";

  return axiosPrivate.request({
    url: path,
    method: hasDepartmentId ? "put" : "post",
    data: payload,
  });
};

export const assignOrganizationDepartmentManager = (
  axiosPrivate: AxiosInstance,
  departmentId: string,
  managerUserId: string,
) =>
  axiosPrivate.patch(`/api/organization/departments/${departmentId}/manager`, {
    managerUserId,
  });

export const inviteOrganizationMember = (
  axiosPrivate: AxiosInstance,
  payload: {
    fullName: string;
    email: string;
    role: string;
    departments: string[];
  },
) => axiosPrivate.post("/api/organization/members/invite", payload);

export const toggleOrganizationMemberStatus = (
  axiosPrivate: AxiosInstance,
  memberId: string,
) => axiosPrivate.patch(`/api/organization/members/${memberId}/status`);

export const assignOrganizationActingManager = (
  axiosPrivate: AxiosInstance,
  departmentId: string,
  payload: { assignedUserId: string; note?: string },
) =>
  axiosPrivate.post(`/api/organization/departments/${departmentId}/acting-manager`, payload);

export const removeOrganizationActingManager = (
  axiosPrivate: AxiosInstance,
  departmentId: string,
  assignedUserId: string,
) =>
  axiosPrivate.delete(
    `/api/organization/departments/${departmentId}/acting-manager/${assignedUserId}`,
  );
