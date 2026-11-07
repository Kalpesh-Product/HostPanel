import { Router } from "express";
import { handlePaymentWebhook } from "../controllers/leadsControllers.js";
import { verifyMasterPanelServiceKey } from "../middlewares/verifyMasterPanelServiceKey.js";

// Server-to-server calls FROM MasterPanel — must NOT sit behind verifyJwt
// (no host user is logged in on this call), gated by the shared service
// key instead. Kept as its own router/mount so it never accidentally
// inherits the host-auth middleware chain /api/leads carries.
const router = Router();
router.post("/payment-webhook", verifyMasterPanelServiceKey, handlePaymentWebhook);

export default router;
