// @ts-nocheck
import { Router } from "express";
import upload from "../config/multerConfig.js";
import { closeSupportTicketByUser, createSupportTicket, followUpSupportTicket, getSupportTickets, } from "../controllers/supportTicketControllers.js";
const router = Router();
router.get("/", getSupportTickets);
router.post("/", upload.single("image"), createSupportTicket);
router.patch("/:ticketId/close", closeSupportTicketByUser);
router.post("/:ticketId/follow-up", followUpSupportTicket);
export default router;
