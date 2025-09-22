import { Router } from "express";
import upload from "../config/multerConfig.js";

import {
  createTemplate,
  getTemplate,
  editTemplate,
  getTemplates,
  getInActiveTemplates,
  activateTemplate,
  getInActiveTemplate,
} from "../controllers/websiteControllers/websiteTemplateControllers.js";

const router = Router();
router.post("/create-website", upload.any(), createTemplate);
router.patch("/edit-website", upload.any(), editTemplate);
router.patch("/activate-website", activateTemplate);
router.get("/get-website/:companyName", getTemplate);
router.get("/get-websites", getTemplates);
router.get("/get-inactive-website", getInActiveTemplate);
router.get("/get-inactive-websites", getInActiveTemplates);

export default router;
