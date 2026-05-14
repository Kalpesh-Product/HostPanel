// @ts-nocheck
import { Router } from "express";
import { completeFounderSignup, getRegisterPrefill, forgotPassword, getFounderSignupPrefill, login, logout, resetPassword, startRegisterDirect, startRegisterWithOtp, sendFounderSignupOtp, verifyRegisterOtpDirect, verifyRegisterOtpAndComplete, } from "../controllers/authControllers.js";
import refreshTokenController from "../controllers/refreshTokenController.js";
const router = Router();
router.post("/login", login);
router.get("/refresh", refreshTokenController);
router.get("/logout", logout);
router.patch("/forgot-password", forgotPassword);
router.patch("/reset-password/:token", resetPassword);
router.get("/signup/:token/prefill", getFounderSignupPrefill);
router.post("/signup/:token/send-otp", sendFounderSignupOtp);
router.post("/signup/:token/complete", completeFounderSignup);
router.get("/register/:token/prefill", getRegisterPrefill);
router.post("/register/:token/start", startRegisterWithOtp);
router.post("/register/:token/verify-otp", verifyRegisterOtpAndComplete);
router.post("/register/start", startRegisterDirect);
router.post("/register/verify-otp", verifyRegisterOtpDirect);
export default router;
