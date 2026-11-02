import { Router } from "express";
import {
  checkPublicBookingAvailability,
  listPublicBookingsForNomad,
  reschedulePublicNomadBooking,
  checkPublicNomadRescheduleAvailability,
} from "../controllers/leadsControllers.js";

const router = Router();
router.post("/availability", checkPublicBookingAvailability);
router.get("/nomad-bookings", listPublicBookingsForNomad);
router.patch("/nomad-bookings/:id/reschedule", reschedulePublicNomadBooking);
router.post("/nomad-bookings/:id/reschedule-availability", checkPublicNomadRescheduleAvailability);

export default router;
