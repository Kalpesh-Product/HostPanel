import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getWorkspaceMembers = async () => {
  const response = await axiosPrivate.get("/api/workspace/members");
  return unwrap(response);
};
