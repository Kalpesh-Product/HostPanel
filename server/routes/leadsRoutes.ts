// @ts-nocheck
import { Router } from "express";
import {
  getLeads,
  updateLeads,
  finalizeLeadBooking,
  previewLeadPayment,
  previewLeadBookingPrefill,
  notifySlotUnavailable,
  getLeadPlanLimit,
  requestMoreLeads,
  sendInvoiceToWono,
  previewPayoutInvoice,
  getHostInvoices,
} from "../controllers/leadsControllers.js";
import {
  getDayPassAvailability,
  getDayPassBookings,
  createWalkInDayPass,
  updateDayPassStatus,
} from "../controllers/dayPassBookingController.js";
const router = Router();

router.patch("/update-lead", updateLeads);
router.get("/get-leads", getLeads);
router.get("/preview-payment", previewLeadPayment);
router.get("/booking-prefill", previewLeadBookingPrefill);
router.post("/finalize-booking", finalizeLeadBooking);
router.post("/notify-slot-unavailable", notifySlotUnavailable);
router.get("/plan-limit", getLeadPlanLimit);
router.post("/request-more-leads", requestMoreLeads);
router.post("/send-invoice-to-wono", sendInvoiceToWono);
router.post("/preview-payout-invoice", previewPayoutInvoice);
router.get("/invoices", getHostInvoices);
// Coworking Day Pass (Daily Flexi Desk) — dedicated subsystem, isolated from
// meeting-room bookings (separate DayPassBooking collection + DP- codes).
router.get("/day-pass-availability", getDayPassAvailability);
router.get("/day-pass-bookings", getDayPassBookings);
router.post("/day-pass-walkin", createWalkInDayPass);
router.patch("/day-pass-status", updateDayPassStatus);

export default router;

