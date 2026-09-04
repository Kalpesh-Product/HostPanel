import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getTaskTypes = async () => {
  const response = await axiosPrivate.get("/api/task-types");
  return unwrap(response);
};

export const createTaskType = async (payload: { name: string; workflowKind: "progress" | "approval" }) => {
  const response = await axiosPrivate.post("/api/task-types", payload);
  return unwrap(response);
};
