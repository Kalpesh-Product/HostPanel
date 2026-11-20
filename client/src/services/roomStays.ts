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
  chargesSecurityDeposit: boolean;
  securityDepositAmount: number;
  status: "Active" | "Under Maintenance" | "Disabled";
  isActive: boolean;
};

export type RoomAvailability = GuestRoom & {
  totalBeds: number;
  availableBeds: number;
  nextAvailableAt: string | null;
};

export type RoomStayStatus = "Booked" | "Checked-in" | "Checked-out" | "Cancelled";
export type RoomStayBookingSource = "Walk-in" | "Phone" | "Website" | "Partner";

export const ROOM_STAY_OPEN_STATUSES: RoomStayStatus[] = ["Booked", "Checked-in"];

export type RoomStayFileAttachment = {
  fileName: string;
  fileUrl: string;
  publicId: string;
};

export type RoomStayAdditionalGuest = {
  name: string;
  age: number;
  gender: string;
};

export type RoomStayBooking = {
  _id: string;
  bookingNumber: number;
  roomId: string;
  roomType: GuestRoomType;
  bookingSource: RoomStayBookingSource;
  bedNumber: number | null;
  bedCount: number;
  bedNumbers: number[];
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  guestAge: number | null;
  guestCountry: string;
  guestState: string;
  guestCity: string;
  guestNationality: string;
  guestDateOfBirth: string | null;
  guestGender: string;
  guestAddress: string;
  additionalGuests: RoomStayAdditionalGuest[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  ratePerNight: number;
  subtotalBeforeDiscount: number;
  discountType: "amount" | "percent";
  discountValue: number;
  discountAmount: number;
  taxApplied: boolean;
  taxLabel: string;
  taxRatePercent: number;
  taxAmount: number;
  total: number;
  status: RoomStayStatus;
  notes: string;
  cancelReason: string;
  idProofType: string;
  idProofNumber: string;
  idProofFile: RoomStayFileAttachment | null;
  paymentMethod: string;
  amountPaid: number;
  securityDepositRequired: boolean;
  securityDepositAmount: number;
  securityDepositCollected: number;
  securityDepositPaymentMethod: string;
  securityDepositProof: RoomStayFileAttachment | null;
  securityDepositRefunded: boolean;
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
  bookingSource: RoomStayBookingSource;
  bedCount?: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestAge?: number;
  guestCountry?: string;
  guestState?: string;
  guestCity?: string;
  guestNationality?: string;
  guestDateOfBirth?: string;
  guestGender?: string;
  guestAddress?: string;
  additionalGuests?: RoomStayAdditionalGuest[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  checkIn: string;
  checkOut: string;
  notes?: string;
  idProofType?: string;
  // idProofNumber is kept for the Reservations tab (out of scope for this
  // revamp), which still collects a plain ID number instead of a file.
  idProofNumber?: string;
  idProofFile?: File | null;
  paymentMethod?: string;
  paymentTransactionNumber?: string;
  discountType?: "amount" | "percent";
  discountValue?: number;
  applyTax?: boolean;
  amountPaid?: number;
  requireFullPayment?: boolean;
  securityDepositCollected?: number;
  securityDepositPaymentMethod?: string;
  securityDepositProof?: File | null;
}) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (value instanceof File) formData.append(key, value);
    else if (Array.isArray(value) || typeof value === "object") {
      formData.append(key, JSON.stringify(value));
    }
    else formData.append(key, String(value));
  });
  return axiosPrivate.post("/api/v1/room-stays/bookings", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const updateRoomBookingStatus = async (bookingId: string, status: RoomStayStatus, reason?: string) =>
  axiosPrivate.patch(`/api/v1/room-stays/bookings/${bookingId}/status`, { status, reason });

export const extendRoomBooking = async (bookingId: string, checkOut: string) =>
  axiosPrivate.patch(`/api/v1/room-stays/bookings/${bookingId}/extend`, { checkOut });

export const getRoomStayCheckTimes = async () => axiosPrivate.get("/api/v1/room-stays/check-times");

export const updateRoomStayCheckTimes = async (payload: { checkInTime: string; checkOutTime: string }) =>
  axiosPrivate.put("/api/v1/room-stays/check-times", payload);

export const getRoomStayAnalytics = async (type: GuestRoomType, days: number) =>
  axiosPrivate.get("/api/v1/room-stays/analytics", { params: { type, days } });
