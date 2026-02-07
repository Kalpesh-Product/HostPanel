import { Router } from "express";
import {
  getReviewsByCompany,
  updateReviewStatus,
} from "../controllers/reviewControllers.js";

const router = Router();
router.patch("/:reviewId", updateReviewStatus);
router.get("/", getReviewsByCompany);

export default router;
