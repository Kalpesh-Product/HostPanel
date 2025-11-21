import { Router } from "express";
import {
  forgotPassword,
  login,
  logout,
  resetPassword,
} from "../controllers/authControllers.js";
import refreshTokenController from "../controllers/refreshTokenController.js";
const router = Router();

router.post("/login", login);
router.get("/refresh", refreshTokenController);
router.get("/logout", logout);
router.patch("/forgot-password", forgotPassword);
router.patch("/reset-password/:token", resetPassword);
export default router;
