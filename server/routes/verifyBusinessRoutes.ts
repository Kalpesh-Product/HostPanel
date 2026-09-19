// @ts-nocheck
import { Router } from "express";
import upload from "../config/multerConfig.js";

import {
  getVerifyBusinessOverview,
  submitVerifyBusinessRequest,
  payVerifyBusiness,
  setVerifyBusinessBadgeVisibility,
  getVerifyBusinessHistory,
} from "../controllers/verifyBusinessControllers.js";

const router = Router();

router.get("/overview", getVerifyBusinessOverview);
router.post("/request", upload.any(), submitVerifyBusinessRequest);
router.post("/pay", payVerifyBusiness);
router.patch("/badge-visibility", setVerifyBusinessBadgeVisibility);
router.get("/history", getVerifyBusinessHistory);

export default router;
