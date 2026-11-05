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
  getHostInvoices,
} from "../controllers/leadsControllers.js";
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
router.get("/invoices", getHostInvoices);

export default router;

