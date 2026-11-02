import { axiosPrivate } from "../utils/axios";

export type GuestRoomType = "Room" | "Dorm";

export type GuestRoom = {
  _id: string;
  name: string;
  type: GuestRoomType;
  capacity: number;
  pricePerNight: number;
  location: string;
  floor: string;
  wing: string;
  description: string;
  amenities: string[];
  status: "Active" | "Under Maintenance" | "Disabled";
  isActive: boolean;
};

export type RoomAvailability = GuestRoom & {
  totalBeds: number;
  availableBeds: number;
  nextAvailableAt: string | null;
};

export type RoomStayStatus = "Booked" | "Checked-in" | "Checked-out" | "Cancelled";

export const ROOM_STAY_OPEN_STATUSES: RoomStayStatus[] = ["Booked", "Checked-in"];

export type RoomStayBooking = {
  _id: string;
  bookingNumber: number;
  roomId: string;
  roomType: GuestRoomType;
  bedNumber: number | null;
  guestName: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  ratePerNight: number;
  total: number;
  status: RoomStayStatus;
  notes: string;
  cancelReason: string;
  idProofType: string;
  idProofNumber: string;
  paymentMethod: string;
  amountPaid: number;
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
  lateFeeAmount: number;
  createdAt: string;
};

// Inventory itself (add/edit/delete a Room/Dorm) is managed through the
// shared Resource & Pricing endpoints (services/resources.ts) now — this stays
// read-only, used by the room picker when creating a reservation/booking.
export const getGuestRooms = async (type?: GuestRoomType) =>
  axiosPrivate.get("/api/v1/room-stays/rooms", { params: type ? { type } : {} });

export const getRoomAvailability = async (type: GuestRoomType, checkIn: string, checkOut: string) =>
  axiosPrivate.get("/api/v1/room-stays/availability", { params: { type, checkIn, checkOut } });

export const getRoomBookings = async (params: {
  scope?: "open" | "history";
  roomType?: GuestRoomType;
  from?: string;
  to?: string;
} = {}) => axiosPrivate.get("/api/v1/room-stays/bookings", { params });

export const createRoomBooking = async (payload: {
  roomId: string;
  guestName: string;
  guestPhone?: string;
  checkIn: string;
  checkOut: string;
  notes?: string;
  idProofType?: string;
  idProofNumber?: string;
  paymentMethod?: string;
  amountPaid?: number;
}) => axiosPrivate.post("/api/v1/room-stays/bookings", payload);

export const updateRoomBookingStatus = async (bookingId: string, status: RoomStayStatus, reason?: string) =>
  axiosPrivate.patch(`/api/v1/room-stays/bookings/${bookingId}/status`, { status, reason });

export const extendRoomBooking = async (bookingId: string, checkOut: string) =>
  axiosPrivate.patch(`/api/v1/room-stays/bookings/${bookingId}/extend`, { checkOut });

export const getRoomStayCheckTimes = async () => axiosPrivate.get("/api/v1/room-stays/check-times");

export const updateRoomStayCheckTimes = async (payload: { checkInTime: string; checkOutTime: string }) =>
  axiosPrivate.put("/api/v1/room-stays/check-times", payload);

export const getRoomStayAnalytics = async (type: GuestRoomType, days: number) =>
  axiosPrivate.get("/api/v1/room-stays/analytics", { params: { type, days } });
