import { Router } from "express";
import { updateReviewStatus } from "../controllers/reviewControllers.js";

const router = Router();
router.patch("/:reviewId", updateReviewStatus);

export default router;
