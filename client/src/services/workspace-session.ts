import type { AxiosInstance } from "axios";

export const switchWorkspaceSession = (
  axiosPrivate: AxiosInstance,
  workspaceId: string,
) => axiosPrivate.post("/api/workspaces/management/switch", { workspaceId });
