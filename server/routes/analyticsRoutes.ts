import { Router } from "express";
import { getAnalyticsOverview } from "../controllers/analyticsController.js";

const router = Router();

router.get("/overview", getAnalyticsOverview);

export default router;
