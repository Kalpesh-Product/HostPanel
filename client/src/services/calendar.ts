import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getMyCalendar = async () => {
  const response = await axiosPrivate.get("/api/calendar/my-calendar");
  return unwrap(response);
};
