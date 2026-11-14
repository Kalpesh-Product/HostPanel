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

export type RoomStayBookingRoom = {
  _id: string;
  name: string;
  capacity: number;
  pricePerNight: number;
  floor: string;
  wing: string;
  chargesSecurityDeposit: boolean;
  securityDepositAmount: number;
};

export type RoomStayBooking = {
  _id: string;
  bookingNumber: number;
  bookingCode?: string;
  // Populated by listRoomBookings — a plain id string only if that room was
  // since deleted (Mongoose leaves the raw ObjectId when populate finds nothing).
  roomId: RoomStayBookingRoom | string;
  roomType: GuestRoomType;
  bookingSource: RoomStayBookingSource;
  bedNumber: number | null;
  bedCount: number;
  bedNumbers: number[];
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  attendees: number;
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
  securityDepositTxn: string;
  securityDepositProof: RoomStayFileAttachment | null;
  securityDepositDeductions: number;
  securityDepositDeductionReason: string;
  securityDepositRefunded: number;
  securityDepositRefundMethod: string;
  securityDepositRefundTxn: string;
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

export const checkInRoomStayBooking = async (
  bookingId: string,
  payload: {
    idProofType: string;
    idProofNumber: string;
    // Optional when the booking already has an ID proof file on record
    // (a walk-in booking collects it at creation) — only a website booking
    // needs one uploaded here.
    idProofFile?: File | null;
    guestAge: number;
    guestGender: string;
    guestCountry: string;
    guestState: string;
    guestCity: string;
    guestAddress: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    securityDepositCollected?: number;
    securityDepositPaymentMethod?: string;
    securityDepositTxn?: string;
    securityDepositProof?: File | null;
  },
) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (value instanceof File) formData.append(key, value);
    else formData.append(key, String(value));
  });
  return axiosPrivate.patch(`/api/v1/room-stays/bookings/${bookingId}/check-in`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const checkOutRoomStayBooking = async (
  bookingId: string,
  payload: {
    deductions?: number;
    deductionReason?: string;
    refundMethod?: string;
    refundTxn?: string;
  },
) => axiosPrivate.patch(`/api/v1/room-stays/bookings/${bookingId}/check-out`, payload);

export const extendRoomBooking = async (bookingId: string, checkOut: string) =>
  axiosPrivate.patch(`/api/v1/room-stays/bookings/${bookingId}/extend`, { checkOut });

export const sendRoomStayConfirmationEmail = async (bookingId: string) =>
  axiosPrivate.post(`/api/v1/room-stays/bookings/${bookingId}/send-confirmation`);

export const getRoomStayCheckTimes = async () => axiosPrivate.get("/api/v1/room-stays/check-times");

export const updateRoomStayCheckTimes = async (payload: { checkInTime: string; checkOutTime: string }) =>
  axiosPrivate.put("/api/v1/room-stays/check-times", payload);

export const getRoomStayAnalytics = async (type: GuestRoomType, days: number) =>
  axiosPrivate.get("/api/v1/room-stays/analytics", { params: { type, days } });
