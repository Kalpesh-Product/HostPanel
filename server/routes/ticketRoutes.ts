import express from "express";
import {
    createTicket,
    getTickets,
    getTicketById,
    updateTicket,
    deleteTicket
} from "../controllers/ticketController.js";

const router = express.Router();

// Note: If you have auth middleware, add it here. 
// Example: router.post("/", verifyToken, createTicket);

router.post("/", createTicket);           // POST /api/tickets
router.get("/", getTickets);              // GET /api/tickets
router.get("/:id", getTicketById);        // GET /api/tickets/:id
router.put("/:id", updateTicket);         // PUT /api/tickets/:id
router.delete("/:id", deleteTicket);      // DELETE /api/tickets/:id

export default router;