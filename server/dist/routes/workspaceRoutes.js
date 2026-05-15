// @ts-nocheck
import { Router } from "express";
import { completeWorkspaceSetup } from "../controllers/workspaceControllers.js";
const router = Router();
router.post("/setup", completeWorkspaceSetup);
export default router;
