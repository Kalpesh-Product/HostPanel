import type { AxiosInstance } from "axios";

export const getWorkspaceManagementOverview = (
  axiosPrivate: AxiosInstance,
  department = "",
) =>
  axiosPrivate.get(`/api/workspaces/management${department ? `?department=${encodeURIComponent(department)}` : ""}`);

export const updateManagedWorkspace = (
  axiosPrivate: AxiosInstance,
  workspaceId: string,
  payload: {
    profile: {
      workspaceName: string;
      businessName?: string;
      location?: string;
      industry?: string;
      businessType?: string;
    };
  },
) => axiosPrivate.patch(`/api/workspaces/management/${workspaceId}`, payload);

export const switchWorkspace = (
  axiosPrivate: AxiosInstance,
  workspaceId: string,
) => axiosPrivate.post("/api/workspaces/management/switch", { workspaceId });

export const setWorkspaceStatus = (
  axiosPrivate: AxiosInstance,
  workspaceId: string,
  isActive: boolean,
) => axiosPrivate.patch(`/api/workspaces/management/${workspaceId}/status`, { isActive });

export const deleteManagedWorkspace = (
  axiosPrivate: AxiosInstance,
  workspaceId: string,
) => axiosPrivate.delete(`/api/workspaces/management/${workspaceId}`);

export const requestWorkspaceRecovery = (
  axiosPrivate: AxiosInstance,
  workspaceId: string,
) => axiosPrivate.post(`/api/workspaces/management/${workspaceId}/recovery-request`, {});
