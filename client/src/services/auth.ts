import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getWorkspaceMembers = async () => {
  const response = await axiosPrivate.get("/api/workspace/members");
  return unwrap(response);
};

export const sendMemberInvite = async (payload: {
  fullName: string;
  email: string;
  role: string;
  departments: string[];
}) => {
  const response = await axiosPrivate.post("/api/auth/invite", payload);
  return unwrap(response);
};
