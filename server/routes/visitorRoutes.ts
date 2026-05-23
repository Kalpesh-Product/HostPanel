// @ts-nocheck
import { Router } from "express";
import {
  checkInVisitor,
  checkOutVisitor,
  createVisitor,
  getVisitorsOverview,
  listVisitors,
  reviewVisitorDecision,
} from "../controllers/visitorControllers.js";

const router = Router();

router.get("/overview", getVisitorsOverview);
router.get("/", listVisitors);
router.post("/", createVisitor);
router.patch("/:visitorId/decision", reviewVisitorDecision);
router.patch("/:visitorId/check-in", checkInVisitor);
router.patch("/:visitorId/check-out", checkOutVisitor);

export default router;

