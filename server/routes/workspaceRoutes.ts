// @ts-nocheck
import { Router } from "express";
import {
  completeWorkspaceSetup,
  backfillWorkspaceModules,
  getCurrentHostCompanyIdentity,
  getWorkspaceManagementOverview,
  getWorkspaceModuleAccessMap,
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
router.get("/module-access-map", getWorkspaceModuleAccessMap);
router.post("/dev/backfill-modules", backfillWorkspaceModules);
router.patch("/settings", updateWorkspaceSettings);
router.get("/host-company", getCurrentHostCompanyIdentity);

export default router;
