import { Router } from "express";
import {
  changePassword,
  updateProfile,
} from "../controllers/hostUserControllers.js";

const router = Router();

router.patch("/update-profile/:userId", updateProfile);
router.patch("/change-password/:userId", changePassword);

export default router;
