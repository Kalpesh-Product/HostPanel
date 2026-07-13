// @ts-nocheck
import { Router } from "express";
import upload from "../config/multerConfig.js";
import {
  closeSupportTicket,
  createFollowUpTicket,
  createSupportTicket,
  getSupportTickets,
  updateSupportTicket,
} from "../controllers/supportTicketControllers.js";

const router = Router();

router.get("/", getSupportTickets);
router.post("/", upload.single("image"), createSupportTicket);
router.patch("/:ticketId", upload.single("image"), updateSupportTicket);
router.patch("/:ticketId/close", closeSupportTicket);
router.post("/:ticketId/follow-up", createFollowUpTicket);

export default router;

