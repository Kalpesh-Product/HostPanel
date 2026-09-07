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
router.post("/", upload.array("images", 5), createSupportTicket);
router.patch("/:ticketId", upload.array("images", 5), updateSupportTicket);
router.patch("/:ticketId/close", closeSupportTicket);
router.post("/:ticketId/follow-up", createFollowUpTicket);

export default router;

