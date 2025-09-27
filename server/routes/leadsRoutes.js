import { Router } from "express";
import { getLeads, updateLeads } from "../controllers/leadsControllers.js";
const router = Router();

router.patch("/update-lead", updateLeads);
router.get("/get-leads", getLeads);

export default router;
