// @ts-nocheck
import { Router } from "express";
import {
  getPlanBillingSummary,
  getPlanBillingInvoices,
  getProfessionalPlanPrice,
  startTrial,
} from "../controllers/planBillingControllers.js";

const router = Router();

router.get("/summary", getPlanBillingSummary);
router.get("/invoices", getPlanBillingInvoices);
router.get("/professional-price", getProfessionalPlanPrice);
router.post("/start-trial", startTrial);

export default router;
