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
  setWorkspaceActiveStatus,
  deleteManagedWorkspace,
  requestWorkspaceRecovery,
} from "../controllers/workspaceControllers.js";
import {
  getTourProgress,
  saveTourProgress,
} from "../controllers/tourControllers.js";

const router = Router();

router.post("/setup", completeWorkspaceSetup);
router.get("/validate-name", validateWorkspaceName);
router.get("/management", getWorkspaceManagementOverview);
router.patch("/management/:workspaceId/status", setWorkspaceActiveStatus);
router.post("/management/:workspaceId/recovery-request", requestWorkspaceRecovery);
router.patch("/management/:workspaceId", updateManagedWorkspace);
router.delete("/management/:workspaceId", deleteManagedWorkspace);
router.post("/management/switch", switchWorkspace);
router.get("/settings", getWorkspaceSettings);
router.get("/module-access-map", getWorkspaceModuleAccessMap);
router.post("/dev/backfill-modules", backfillWorkspaceModules);
router.patch("/settings", updateWorkspaceSettings);
router.get("/host-company", getCurrentHostCompanyIdentity);
router.get("/tour-progress", getTourProgress);
router.patch("/tour-progress/:tourKey", saveTourProgress);

export default router;
