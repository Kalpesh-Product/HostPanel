import { axiosPrivate } from "../utils/axios";

export type CafeMenuItem = {
  _id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
};

export type CafeTable = {
  _id: string;
  name: string;
  seats: number;
  isActive: boolean;
  openOrder: {
    _id: string;
    orderNumber: number;
    status: CafeOrderStatus;
    total: number;
    itemCount: number;
  } | null;
};

export type CafeOrderStatus = "Placed" | "Preparing" | "Ready" | "Served" | "Paid" | "Cancelled";

export const CAFE_OPEN_STATUSES: CafeOrderStatus[] = ["Placed", "Preparing", "Ready", "Served"];

export type CafeOrderLine = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type CafeOrderRound = {
  roundNumber: number;
  label: string;
  items: CafeOrderLine[];
  status: "Draft" | "Sent" | "Served";
  sentToKitchenAt: string | null;
  servedAt: string | null;
};

export type CafeOrderVoidLogEntry = {
  roundNumber: number;
  itemName: string;
  quantity: number;
  reason: string;
  voidedAt: string;
};

export type CafeOrder = {
  _id: string;
  orderNumber: number;
  tableId: string | null;
  customerName: string;
  tableLabel: string;
  notes: string;
  items: CafeOrderLine[];
  rounds: CafeOrderRound[];
  voidLog: CafeOrderVoidLogEntry[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discountType: "none" | "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
  total: number;
  status: CafeOrderStatus;
  billedAt: string | null;
  paidAt: string | null;
  waiterName: string;
  paymentMethod: string;
  cancelReason: string;
  createdAt: string;
};

export type CafeSettings = {
  companyName: string;
  googleReviewUrl: string;
  showReviewQr: boolean;
  taxPercent: number;
  cafeStartTime: string;
};

export const getCafeMenuItems = async () => axiosPrivate.get("/api/v1/cafe/menu-items");

export const createCafeMenuItem = async (payload: Partial<CafeMenuItem>) =>
  axiosPrivate.post("/api/v1/cafe/menu-items", payload);

export const bulkCreateCafeMenuItems = async (items: Array<Partial<CafeMenuItem>>) =>
  axiosPrivate.post("/api/v1/cafe/menu-items/bulk", { items });

export const updateCafeMenuItem = async (itemId: string, payload: Partial<CafeMenuItem>) =>
  axiosPrivate.patch(`/api/v1/cafe/menu-items/${itemId}`, payload);

export const deleteCafeMenuItem = async (itemId: string) =>
  axiosPrivate.delete(`/api/v1/cafe/menu-items/${itemId}`);

export type CafeCategory = {
  _id: string;
  name: string;
  sortOrder: number;
};

export const getCafeCategories = async () => axiosPrivate.get("/api/v1/cafe/categories");

export const createCafeCategory = async (name: string) =>
  axiosPrivate.post("/api/v1/cafe/categories", { name });

export const deleteCafeCategory = async (categoryId: string) =>
  axiosPrivate.delete(`/api/v1/cafe/categories/${categoryId}`);

export const getCafeTables = async () => axiosPrivate.get("/api/v1/cafe/tables");

export const createCafeTable = async (payload: { name: string; seats: number }) =>
  axiosPrivate.post("/api/v1/cafe/tables", payload);

export const updateCafeTable = async (tableId: string, payload: Partial<Pick<CafeTable, "name" | "seats" | "isActive">>) =>
  axiosPrivate.patch(`/api/v1/cafe/tables/${tableId}`, payload);

export const deleteCafeTable = async (tableId: string) =>
  axiosPrivate.delete(`/api/v1/cafe/tables/${tableId}`);

export const getCafeOrders = async (params: { scope?: "open" | "history"; from?: string; to?: string } = {}) =>
  axiosPrivate.get("/api/v1/cafe/orders", { params });

export const updateCafeOrderDetails = async (orderId: string, payload: { customerName?: string; notes?: string }) =>
  axiosPrivate.patch(`/api/v1/cafe/orders/${orderId}/details`, payload);

export const getCafeAnalytics = async (days: number) =>
  axiosPrivate.get("/api/v1/cafe/analytics", {
    params: { days, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  });

export const getCafeSettings = async () => axiosPrivate.get("/api/v1/cafe/settings");

export const updateCafeSettings = async (payload: CafeSettings) =>
  axiosPrivate.put("/api/v1/cafe/settings", payload);

export const createCafeOrder = async (payload: {
  tableId?: string;
  customerName?: string;
  tableLabel?: string;
  notes?: string;
  items: Array<{ menuItemId: string; quantity: number }>;
}) => axiosPrivate.post("/api/v1/cafe/orders", payload);

export const updateCafeOrderStatus = async (orderId: string, status: CafeOrderStatus, reason?: string) =>
  axiosPrivate.patch(`/api/v1/cafe/orders/${orderId}/status`, { status, reason });

export const updateCafeOrderRound = async (orderId: string, roundNumber: number, status: "Sent" | "Served") =>
  axiosPrivate.patch(`/api/v1/cafe/orders/${orderId}/rounds/${roundNumber}`, { status });

export const updateCafeOrderRoundItem = async (orderId: string, roundNumber: number, menuItemId: string, quantity: number, reason: string) =>
  axiosPrivate.patch(`/api/v1/cafe/orders/${orderId}/rounds/${roundNumber}/items/${menuItemId}`, { quantity, reason });

export const billCafeOrder = async (
  orderId: string,
  payload: { discountType: "none" | "percentage" | "fixed"; discountValue: number; paymentMethod: string },
) => axiosPrivate.patch(`/api/v1/cafe/orders/${orderId}/bill`, payload);

export type CafeReservationStatus = "Confirmed" | "Seated" | "No-show" | "Cancelled";

export type CafeReservation = {
  _id: string;
  reservationNumber: number;
  guestName: string;
  guestPhone: string;
  partySize: number;
  reservationAt: string;
  lockStartsAt: string;
  tableId: string | null;
  status: CafeReservationStatus;
  notes: string;
  cancelReason: string;
  createdAt: string;
};

export const getCafeReservations = async (date: string) =>
  axiosPrivate.get("/api/v1/cafe/reservations", { params: { date } });

export const createCafeReservation = async (payload: {
  guestName: string;
  guestPhone?: string;
  partySize: number;
  date: string;
  time: string;
  tableId?: string;
  notes?: string;
}) => axiosPrivate.post("/api/v1/cafe/reservations", payload);

export const seatCafeReservation = async (reservationId: string, tableId?: string) =>
  axiosPrivate.patch(`/api/v1/cafe/reservations/${reservationId}/seat`, { tableId });

export const updateCafeReservationStatus = async (reservationId: string, status: "No-show" | "Cancelled", reason?: string) =>
  axiosPrivate.patch(`/api/v1/cafe/reservations/${reservationId}/status`, { status, reason });
