// @ts-nocheck
import { Router } from "express";
import { getSubscription, resetCredits, } from "../controllers/subscriptionController.js";
const router = Router();
router.get("/:workspaceId", getSubscription);
router.post("/:workspaceId/reset", resetCredits);
export default router;
