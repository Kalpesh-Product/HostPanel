import express from "express";
import {
    createTicket,
    getTickets,
    getTicketById,
    updateTicket,
    deleteTicket,
    getIssueSuggestions,
    createTicketIssue,
    recordIssueUsage,
} from "../controllers/ticketController.js";
import verifyJwt from "../middlewares/verifyJwt.js";
import upload from "../config/multerConfig.js";

const router = express.Router();

// Apply auth middleware to all ticket routes
router.use(verifyJwt);

router.post("/", upload.array("attachments", 5), createTicket); // POST /api/tickets
router.get("/", getTickets);                                 // GET /api/tickets
router.get("/issue-suggestions", getIssueSuggestions);       // GET /api/tickets/issue-suggestions
router.post("/issues", createTicketIssue);                   // POST /api/tickets/issues (custom issue)
router.post("/issues/usage", recordIssueUsage);              // POST /api/tickets/issues/usage
router.get("/:id", getTicketById);                           // GET /api/tickets/:id
router.put("/:id", updateTicket);                            // PUT /api/tickets/:id
router.patch("/:id", updateTicket);                          // PATCH /api/tickets/:id
router.delete("/:id", deleteTicket);                         // DELETE /api/tickets/:id

export default router;