import express from "express";
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
    cancelBooking,
} from "../controllers/meetingRoomBookingController.js";

const router = express.Router();

// ======================
// MEETING ROOMS ROUTES
// ======================

// Room Management
router.post("/", createMeetingRoom);                    // Create new room
router.get("/workspace/:workspaceId", getMeetingRooms); // Get all rooms in workspace
router.get("/:id", getMeetingRoomById);                 // Get single room
router.put("/:id", updateMeetingRoom);                  // Update room
router.delete("/:id", deleteMeetingRoom);               // Soft delete room

// ======================
// MEETING ROOM BOOKINGS ROUTES
// ======================

// Booking Management
router.post("/bookings", createBooking);                    // Create booking
router.get("/bookings/workspace/:workspaceId", getBookings); // All bookings in workspace
router.get("/bookings/my", getMyBookings);                  // Current user's bookings
router.get("/bookings/:id", getBookingById);                // Single booking details
router.patch("/bookings/:id/cancel", cancelBooking);        // Cancel booking

export default router;