// @ts-nocheck
import { Router } from "express";
import {
  changePassword,
  getMyProfile,
  updateProfile,
  verifyPassword,
} from "../controllers/hostUserControllers.js";

const router = Router();

router.get("/me", getMyProfile);
router.patch("/update-profile/:userId", updateProfile);
router.patch("/verify-password/:userId", verifyPassword);
router.patch("/change-password/:userId", changePassword);

export default router;

