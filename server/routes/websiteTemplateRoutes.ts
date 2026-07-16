// @ts-nocheck
import { Router } from "express";
import upload, { uploadImages } from "../config/multerConfig.js";
import { checkAndDeductCredit } from "../middlewares/creditCheck.js";
import {
  acquireWebsiteEditLock,
  getWebsiteEditLock,
  releaseWebsiteEditLock,
} from "../controllers/websiteControllers/websiteEditLockControllers.js";

import {
  createTemplate,
  getTemplate,
  editTemplate,
  getTemplates,
  getInActiveTemplates,
  activateTemplate,
  getInActiveTemplate,
  saveTemplateDraft,
  publishWebsite,
} from "../controllers/websiteControllers/websiteTemplateControllers.js";

const router = Router();
router.post("/editing-lock/acquire", acquireWebsiteEditLock);
router.get("/editing-lock", getWebsiteEditLock);
router.post("/editing-lock/release", releaseWebsiteEditLock);
router.post(
  "/create-website",
  uploadImages.any(),
  createTemplate,
);
router.patch(
  "/edit-website",
  uploadImages.any(),
  checkAndDeductCredit,
  editTemplate,
);
router.patch("/activate-website", activateTemplate);
router.get("/get-website/:companyName", getTemplate);
router.get("/get-websites", getTemplates);
router.get("/get-inactive-website", getInActiveTemplate);
router.get("/get-inactive-websites", getInActiveTemplates);
router.post("/save-website-draft", uploadImages.any(), saveTemplateDraft);
router.post("/publish-website", publishWebsite);

export default router;

