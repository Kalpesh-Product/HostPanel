// @ts-nocheck
import { Router } from "express";
import { uploadImages } from "../config/multerConfig.js";
import { checkAndDeductCredit } from "../middlewares/creditCheck.js";
import { createTemplate, getTemplate, editTemplate, getTemplates, getInActiveTemplates, activateTemplate, getInActiveTemplate, publishWebsite, } from "../controllers/websiteControllers/websiteTemplateControllers.js";
const router = Router();
router.post("/create-website", uploadImages.any(), checkAndDeductCredit, createTemplate);
router.patch("/edit-website", uploadImages.any(), checkAndDeductCredit, editTemplate);
router.patch("/activate-website", activateTemplate);
router.get("/get-website/:companyName", getTemplate);
router.get("/get-websites", getTemplates);
router.get("/get-inactive-website", getInActiveTemplate);
router.get("/get-inactive-websites", getInActiveTemplates);
router.post("/publish-website", publishWebsite);
export default router;
