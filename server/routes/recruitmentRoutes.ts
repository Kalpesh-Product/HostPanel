// @ts-nocheck
import { Router } from "express";
import upload from "../config/multerConfig.js";
import {
  bulkUploadRecruitmentJobOpenings,
  createRecruitmentCandidate,
  createRecruitmentJobOpening,
  getRecruitmentJobOpenings,
  getRecruitmentOverview,
  sendRecruitmentCandidateEmail,
  updateRecruitmentCandidate,
  updateRecruitmentJobOpening,
} from "../controllers/recruitmentController.js";

const router = Router();

router.get("/", getRecruitmentOverview);
router.get("/jobs", getRecruitmentJobOpenings);
router.post("/jobs", createRecruitmentJobOpening);
router.post("/jobs/bulk-upload", upload.single("file"), bulkUploadRecruitmentJobOpenings);
router.patch("/jobs/:jobCode", updateRecruitmentJobOpening);
router.post("/candidates", upload.single("resumeFile"), createRecruitmentCandidate);
router.patch("/candidates/:candidateId", upload.single("resumeFile"), updateRecruitmentCandidate);
router.post("/candidates/:candidateId/send-email", sendRecruitmentCandidateEmail);

export default router;
