import express from "express";
import upload from "../config/multerConfig.js";
import {
    createMeetingRoom,
    getMeetingRooms,
    getMeetingRoomById,
    updateMeetingRoom,
    deleteMeetingRoom,
} from "../controllers/meetingRoomController.js";

import {
    createBooking,
    getBookings,
    getMyBookings,
    getBookingById,
    getBookingsByTenantCompany,
    cancelBooking,
    updateBooking,
    respondToInvite,
    getExternalClients,
    createExternalClient,
    sendExternalBookingConfirmation,
} from "../controllers/meetingRoomBookingController.js";

const router = express.Router();

// ======================
// MEETING ROOMS ROUTES
// ======================

// Room Management — named/prefixed routes first
router.post("/", createMeetingRoom);                    // Create new room
router.get("/workspace/:workspaceId", getMeetingRooms); // Get all rooms in workspace

// ======================
// MEETING ROOM BOOKINGS ROUTES
// ======================

// Client lookup for External Bookings — must come before /:id to avoid route conflict
router.get("/clients", getExternalClients);             // Get external clients (with optional search)
router.post("/clients", createExternalClient);          // Create external client (or return existing)

// Booking Management — all /bookings/* routes before /:id wildcard
router.post("/bookings", upload.single("paymentProof"), createBooking); // Create booking
router.get("/bookings/workspace/:workspaceId", getBookings); // All bookings in workspace
router.get("/bookings/my", getMyBookings);                  // Current user's bookings
router.get("/bookings/tenant-company/:tenantCompanyId", getBookingsByTenantCompany); // Bookings by tenant company
router.get("/bookings/:id", getBookingById);                // Single booking details
router.patch("/bookings/:id", updateBooking);                  // Reschedule or extend booking
router.patch("/bookings/:id/cancel", cancelBooking);           // Cancel booking
router.post("/bookings/:id/respond", respondToInvite);         // Accept or reject invite
router.post("/bookings/:id/send-confirmation", sendExternalBookingConfirmation); // Email confirmation to external client

// Room Management — wildcard /:id routes last to avoid shadowing named routes above
router.get("/:id", getMeetingRoomById);                 // Get single room
router.put("/:id", updateMeetingRoom);                  // Update room
router.delete("/:id", deleteMeetingRoom);               // Soft delete room

export default router;
