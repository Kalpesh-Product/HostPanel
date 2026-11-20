import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getMyCalendar = async () => {
  const response = await axiosPrivate.get("/api/calendar/my-calendar");
  return unwrap(response);
};

export const createCalendarEvent = async (payload: {
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  inviteeUserIds?: string[];
  guestEmails?: string[];
}) => {
  const response = await axiosPrivate.post("/api/calendar/events", payload);
  return unwrap(response);
};

export const respondToCalendarEvent = async (eventId: string, status: "accepted" | "rejected") => {
  const response = await axiosPrivate.post(`/api/calendar/events/${eventId}/respond`, { status });
  return unwrap(response);
};
