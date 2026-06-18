import express from "express";
import {
    createTicket,
    getTickets,
    getTicketById,
    updateTicket,
    deleteTicket,
    getIssueSuggestions
} from "../controllers/ticketController.js";
import verifyJwt from "../middlewares/verifyJwt.js";

const router = express.Router();

// Apply auth middleware to all ticket routes
router.use(verifyJwt);

router.post("/", createTicket);                              // POST /api/tickets
router.get("/", getTickets);                                 // GET /api/tickets
router.get("/issue-suggestions", getIssueSuggestions);       // GET /api/tickets/issue-suggestions
router.get("/:id", getTicketById);                           // GET /api/tickets/:id
router.put("/:id", updateTicket);                            // PUT /api/tickets/:id
router.patch("/:id", updateTicket);                          // PATCH /api/tickets/:id
router.delete("/:id", deleteTicket);                         // DELETE /api/tickets/:id

export default router;