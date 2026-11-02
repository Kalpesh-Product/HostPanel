import express from "express";
import {
    createRoomBooking,
    extendRoomBooking,
    getRoomAvailability,
    getRoomStayAnalytics,
    getRoomStayCheckTimes,
    listGuestRooms,
    listRoomBookings,
    updateRoomBookingStatus,
    updateRoomStayCheckTimes,
} from "../controllers/roomStayController.js";

const router = express.Router();

// Room/Dorm inventory itself (add/edit/delete) is managed through the shared
// Resource & Pricing endpoints (/api/v1/resources) now — this route stays
// read-only, used by the room picker when creating a reservation/booking.
router.get("/rooms", listGuestRooms);
router.get("/availability", getRoomAvailability);
router.get("/analytics", getRoomStayAnalytics);
router.get("/check-times", getRoomStayCheckTimes);
router.put("/check-times", updateRoomStayCheckTimes);
router.get("/bookings", listRoomBookings);
router.post("/bookings", createRoomBooking);
router.patch("/bookings/:bookingId/status", updateRoomBookingStatus);
router.patch("/bookings/:bookingId/extend", extendRoomBooking);

export default router;
