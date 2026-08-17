import { Router } from "express";
import {
  completeResignationRequest,
  createResignationRequest,
  extendResignationNotice,
  getResignationRequest,
  getResignationSettings,
  getMyResignationRequests,
  listResignationRequests,
  reviewResignationRequest,
  updateResignationChecklist,
  updateResignationRequest,
  updateResignationSettings,
} from "../controllers/resignationManagementController.js";

const router = Router();

router.get("/settings", getResignationSettings);
router.patch("/settings", updateResignationSettings);
router.get("/requests", listResignationRequests);
router.get("/requests/me", getMyResignationRequests);
router.get("/requests/:requestId", getResignationRequest);
router.post("/requests", createResignationRequest);
router.patch("/requests/:requestId", updateResignationRequest);
router.patch("/requests/:requestId/review", reviewResignationRequest);
router.patch("/requests/:requestId/decision", reviewResignationRequest);
router.patch("/requests/:requestId/checklist", updateResignationChecklist);
router.patch("/requests/:requestId/extend-notice", extendResignationNotice);
router.post("/requests/:requestId/complete", completeResignationRequest);

export default router;
