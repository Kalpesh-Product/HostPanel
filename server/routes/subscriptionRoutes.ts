// @ts-nocheck
import { Router } from "express";
import {
  getSubscription,
  resetCredits,
  devResetCredits,
} from "../controllers/subscriptionController.js";

const router = Router();

router.get("/:workspaceId", getSubscription);
router.post("/:workspaceId/reset", resetCredits);
router.post("/:workspaceId/dev-reset", devResetCredits);

export default router;
