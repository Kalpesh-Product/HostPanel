import express from "express";
import upload from "../config/multerConfig.js";
import {
    checkInRoomStayBooking,
    checkOutRoomStayBooking,
    createRoomBooking,
    extendRoomBooking,
    getRoomAvailability,
    getRoomStayAnalytics,
    getRoomStayCheckTimes,
    listGuestRooms,
    listRoomBookings,
    sendRoomStayConfirmation,
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
router.post(
    "/bookings",
    upload.fields([
        { name: "idProofFile", maxCount: 1 },
        { name: "securityDepositProof", maxCount: 1 },
    ]),
    createRoomBooking
);
router.post("/bookings/:bookingId/send-confirmation", sendRoomStayConfirmation);
router.patch("/bookings/:bookingId/status", updateRoomBookingStatus);
router.patch(
    "/bookings/:bookingId/check-in",
    upload.fields([
        { name: "idProofFile", maxCount: 1 },
        { name: "securityDepositProof", maxCount: 1 },
    ]),
    checkInRoomStayBooking
);
router.patch("/bookings/:bookingId/check-out", checkOutRoomStayBooking);
router.patch("/bookings/:bookingId/extend", extendRoomBooking);

export default router;
