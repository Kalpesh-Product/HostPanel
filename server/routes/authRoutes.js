import { Router } from "express";
import { login, logout } from "../controllers/authControllers.js";
import refreshTokenController from "../controllers/refreshTokenController.js";
const router = Router();

router.post("/login", login);
router.get("/refresh", refreshTokenController);
router.get("/logout", logout);
export default router;
