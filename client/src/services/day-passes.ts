import { axiosPrivate } from "../utils/axios";

// Coworking Day Pass (Daily Flexi Desk) client. All calls hit the dedicated
// day-pass endpoints on the backend, which serve the separate DayPassBooking
// collection (DP-XXXX codes, Open Desk resources only) — never the
// meeting-room booking tables.

export type DayPassAvailability = {
  date?: string;
  totalCapacity: number;
  tenantAssignedDesks: number;
  bookedPassesCount: number;
  availableCount: number;
  isAvailable: boolean;
  isLimited: boolean;
  isSoldOut: boolean;
  resourceId: string | null;
  resourceName: string;
  pricePerDay: number;
};

export type DayPassRecord = {
  _id: string;
  bookingCode: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  company: string;
  date: string;
  passType: "Full-Day" | "Half-Day";
  attendees: number;
  ratePerPass: number;
  subtotal: number;
  platformFeeAmount: number;
  totalAmount: number;
  currency: string;
  paymentStatus: "Pending" | "Paid" | "Failed";
  paymentMode: "Stripe" | "Cash" | "UPI" | "Card";
  status: "Booked" | "Checked-in" | "Completed" | "Cancelled";
  source: "Website" | "Frontdesk" | "ConvertedVisitor";
  sourceVisitorId: string | null;
  resourceId: { _id?: string; name?: string; type?: string; floor?: string; wing?: string } | string | null;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  notes?: string;
  createdAt?: string;
};

export const getDayPassAvailability = async (params: {
  workspaceId?: string;
  date: string;
}) => {
  const response = await axiosPrivate.get("/api/leads/day-pass-availability", { params });
  return response?.data;
};

export const getDayPassBookings = async (params: {
  workspaceId?: string;
  date?: string;
  status?: string;
  search?: string;
}) => {
  const response = await axiosPrivate.get("/api/leads/day-pass-bookings", { params });
  return response?.data;
};

export const createDayPassWalkIn = async (payload: {
  workspaceId?: string;
  date: string;
  passType: "Full-Day" | "Half-Day";
  attendees: number;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  company?: string;
  paymentMode?: "Cash" | "UPI" | "Card";
  cashCollected?: boolean;
  sourceVisitorId?: string;
  notes?: string;
}) => {
  const response = await axiosPrivate.post("/api/leads/day-pass-walkin", payload);
  return response?.data;
};

// Front-desk lifecycle: Checked-in → Completed (checkout), or Cancelled.
// Only ever touches DayPassBooking rows server-side.
export const updateDayPassStatus = async (
  bookingId: string,
  status: "Checked-in" | "Completed" | "Cancelled",
  cancelReason?: string,
) => {
  const response = await axiosPrivate.patch("/api/leads/day-pass-status", {
    bookingId,
    status,
    cancelReason,
  });
  return response?.data;
};
