// @ts-nocheck
import { Router } from "express";
import upload from "../config/multerConfig.js";
import {
  applyRecruitmentJob,
  bulkUploadRecruitmentJobOpenings,
  createRecruitmentCandidate,
  createRecruitmentJobOpening,
  getPublicRecruitmentJobOpenings,
  getRecruitmentJobOpenings,
  getRecruitmentOverview,
  sendRecruitmentCandidateEmail,
  updateRecruitmentCandidate,
  updateRecruitmentJobOpening,
  getPostedRecruitmentJobOpenings,
} from "../controllers/recruitmentController.js";

const publicRouter = Router();
publicRouter.get("/jobs/public", getPublicRecruitmentJobOpenings);
publicRouter.post("/jobs/apply", upload.single("resumeFile"), applyRecruitmentJob);

const router = Router();

router.get("/", getRecruitmentOverview);
router.get("/jobs", getRecruitmentJobOpenings);
router.get("/jobs/posted", getPostedRecruitmentJobOpenings);
router.post("/jobs", createRecruitmentJobOpening);
router.post("/jobs/bulk-upload", upload.single("file"), bulkUploadRecruitmentJobOpenings);
router.patch("/jobs/:jobCode", updateRecruitmentJobOpening);
router.get("/jobs/posted", getPostedRecruitmentJobOpenings);
router.post("/candidates", upload.single("resumeFile"), createRecruitmentCandidate);
router.patch("/candidates/:candidateId", upload.single("resumeFile"), updateRecruitmentCandidate);
router.post("/candidates/:candidateId/send-email", sendRecruitmentCandidateEmail);

export { publicRouter };
export default router;
