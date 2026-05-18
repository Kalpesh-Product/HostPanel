// @ts-nocheck
import { Router } from "express";
import {
  completeWorkspaceSetup,
  getCurrentHostCompanyIdentity,
  getWorkspaceManagementOverview,
  getWorkspaceSettings,
  switchWorkspace,
  validateWorkspaceName,
  updateManagedWorkspace,
  updateWorkspaceSettings,
} from "../controllers/workspaceControllers.js";

const router = Router();

router.post("/setup", completeWorkspaceSetup);
router.get("/validate-name", validateWorkspaceName);
router.get("/management", getWorkspaceManagementOverview);
router.patch("/management/:workspaceId", updateManagedWorkspace);
router.post("/management/switch", switchWorkspace);
router.get("/settings", getWorkspaceSettings);
router.patch("/settings", updateWorkspaceSettings);
router.get("/host-company", getCurrentHostCompanyIdentity);

export default router;
