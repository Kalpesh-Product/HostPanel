// @ts-nocheck
import { Router } from "express";
import upload from "../config/multerConfig.js";
import {
  closeSupportTicketProxy,
  createSupportTicketProxy,
  followUpSupportTicketProxy,
  getSupportTicketsProxy,
} from "../controllers/supportTicketProxyControllers.js";

const router = Router();

router.get("/", getSupportTicketsProxy);
router.post("/", upload.single("image"), createSupportTicketProxy);
router.patch("/:ticketId/close", closeSupportTicketProxy);
router.post("/:ticketId/follow-up", followUpSupportTicketProxy);

export default router;

