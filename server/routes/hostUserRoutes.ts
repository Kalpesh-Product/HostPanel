// @ts-nocheck
import { Router } from "express";
import {
  changePassword,
  deleteMyAccount,
  getMyProfile,
  updateCompanyLogo,
  updateProfile,
  verifyPassword,
} from "../controllers/hostUserControllers.js";
import upload from "../config/multerConfig.js";

const router = Router();

router.get("/me", getMyProfile);
router.patch("/update-profile/:userId", updateProfile);
router.patch("/company-logo", upload.single("logo"), updateCompanyLogo);
router.patch("/verify-password/:userId", verifyPassword);
router.patch("/change-password/:userId", changePassword);
router.post("/delete-account", deleteMyAccount);

export default router;

