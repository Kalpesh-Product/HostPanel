// @ts-nocheck
import { Router } from "express";
import { uploadDocuments } from "../config/multerConfig.js";

import {
  getVerifyBusinessOverview,
  getVerifyBusinessSummary,
  submitVerifyBusinessRequest,
  payVerifyBusiness,
  setVerifyBusinessBadgeVisibility,
  getVerifyBusinessHistory,
} from "../controllers/verifyBusinessControllers.js";

const router = Router();

router.get("/overview", getVerifyBusinessOverview);
router.get("/summary", getVerifyBusinessSummary);
router.post("/request", uploadDocuments.any(), submitVerifyBusinessRequest);
router.post("/pay", payVerifyBusiness);
router.patch("/badge-visibility", setVerifyBusinessBadgeVisibility);
router.get("/history", getVerifyBusinessHistory);

export default router;
