import { Router } from "express";
import { login } from "../controllers/authControllers.js";
import refreshTokenController from "../controllers/refreshTokenController.js";
const router = Router();

router.post("/login", login);
router.get("/refresh", refreshTokenController);
export default router;
