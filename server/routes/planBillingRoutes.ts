// @ts-nocheck
import { Router } from "express";
import {
  getPlanBillingSummary,
  getPlanBillingInvoices,
  getProfessionalPlanPrice,
  startTrial,
  startTrialCheckout,
  claimBonusTrial,
  createBillingPortalSession,
} from "../controllers/planBillingControllers.js";

const router = Router();

router.get("/summary", getPlanBillingSummary);
router.get("/invoices", getPlanBillingInvoices);
router.get("/professional-price", getProfessionalPlanPrice);
router.post("/start-trial", startTrial);
router.post("/start-trial-checkout", startTrialCheckout);
router.post("/claim-bonus-trial", claimBonusTrial);
router.post("/billing-portal", createBillingPortalSession);

export default router;
