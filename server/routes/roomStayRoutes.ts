import express from "express";
import {
    createGuestRoom,
    createRoomBooking,
    deleteGuestRoom,
    extendRoomBooking,
    getRoomAvailability,
    getRoomStayAnalytics,
    getRoomStayCheckTimes,
    listGuestRooms,
    listRoomBookings,
    updateGuestRoom,
    updateRoomBookingStatus,
    updateRoomStayCheckTimes,
} from "../controllers/roomStayController.js";

const router = express.Router();

router.get("/rooms", listGuestRooms);
router.post("/rooms", createGuestRoom);
router.patch("/rooms/:roomId", updateGuestRoom);
router.delete("/rooms/:roomId", deleteGuestRoom);
router.get("/availability", getRoomAvailability);
router.get("/analytics", getRoomStayAnalytics);
router.get("/check-times", getRoomStayCheckTimes);
router.put("/check-times", updateRoomStayCheckTimes);
router.get("/bookings", listRoomBookings);
router.post("/bookings", createRoomBooking);
router.patch("/bookings/:bookingId/status", updateRoomBookingStatus);
router.patch("/bookings/:bookingId/extend", extendRoomBooking);

export default router;
