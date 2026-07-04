// @ts-nocheck
import { Router } from "express";
import {
  completeFounderSignup,
  getRegisterPrefill,
  forgotPassword,
  getFounderSignupPrefill,
  login,
  logout,
  resetPassword,
  resetPasswordWithOtpSession,
  startForgotPasswordWithOtp,
  verifyForgotPasswordOtp,
  startRegisterDirect,
  startRegisterWithOtp,
  sendFounderSignupOtp,
  verifyRegisterOtpDirect,
  verifyRegisterOtpAndComplete,
  getTenantRegisterPrefill,
  registerTenantEmployee,
  sendTenantRegisterOtp,
  verifyTenantRegisterOtpAndComplete,
  getTenantProfile,
  consumeStaffViewToken,
} from "../controllers/authControllers.js";
import refreshTokenController from "../controllers/refreshTokenController.js";
import verifyJwt from "../middlewares/verifyJwt.js";
const router = Router();

router.post("/login", login);
router.get("/refresh", refreshTokenController);
router.get("/logout", logout);
router.patch("/forgot-password", forgotPassword);
router.patch("/reset-password/:token", resetPassword);
router.post("/forgot-password/start", startForgotPasswordWithOtp);
router.post("/forgot-password/verify-otp", verifyForgotPasswordOtp);
router.post("/forgot-password/reset", resetPasswordWithOtpSession);
router.get("/signup/:token/prefill", getFounderSignupPrefill);
router.post("/signup/:token/send-otp", sendFounderSignupOtp);
router.post("/signup/:token/complete", completeFounderSignup);
router.get("/register/:token/prefill", getRegisterPrefill);
router.post("/register/:token/start", startRegisterWithOtp);
router.post("/register/:token/verify-otp", verifyRegisterOtpAndComplete);
router.post("/register/start", startRegisterDirect);
router.post("/register/verify-otp", verifyRegisterOtpDirect);

// Staff "View As" — master-panel-issued short-lived impersonation token.
router.post("/staff-view/:token", consumeStaffViewToken);

// Tenant employee registration (invite-based, raw token)
router.get("/tenant-register/prefill", getTenantRegisterPrefill);
router.post("/tenant-register/send-otp", sendTenantRegisterOtp);
router.post("/tenant-register/verify-otp", verifyTenantRegisterOtpAndComplete);
// Legacy endpoint kept for backward compatibility
router.post("/tenant-register/complete", registerTenantEmployee);

// Tenant employee profile (authenticated)
router.get("/tenant/profile", verifyJwt, getTenantProfile);

export default router;

