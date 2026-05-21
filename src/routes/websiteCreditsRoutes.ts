// @ts-nocheck
import { Router } from "express";
import {
  requestCredits,
  getCreditsRequests,
  approveCreditsRequest,
} from "../controllers/websiteCreditsController";

const router = Router();

router.post("/request", requestCredits);
router.get("/requests", getCreditsRequests);
router.patch("/approve/:requestId", approveCreditsRequest);

export default router;
