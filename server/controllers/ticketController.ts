import { Request, Response } from "express";
import { Ticket, ITicket } from "../models/Ticket.js";

// Create a new ticket
export const createTicket = async (req: Request, res: Response): Promise<void> => {
    try {
        const newTicket = new Ticket(req.body);
        const savedTicket = await newTicket.save();
        res.status(201).json({ success: true, data: savedTicket });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get all tickets (with optional filtering)
export const getTickets = async (req: Request, res: Response): Promise<void> => {
    try {
        const { workspaceId, status, department, assigneeUserId } = req.query;
        const filter: any = {};
        // const filter: Partial<ITicket> = {};

        if (workspaceId) filter.workspaceId = workspaceId as any;
        if (status) filter.status = status as any;
        if (department) filter.department = department as string;
        if (assigneeUserId) filter.assigneeUserId = assigneeUserId as any;

        const tickets = await Ticket.find(filter)
            .sort({ createdAt: -1 })
            .populate("ownerId", "name email")
            .populate("assigneeUserId", "name email");

        res.status(200).json({ success: true, data: tickets });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get a single ticket by ID
export const getTicketById = async (req: Request, res: Response): Promise<void> => {
    try {
        const ticket = await Ticket.findById(req.params.id).populate("ownerId assigneeUserId");
        if (!ticket) {
            res.status(404).json({ success: false, message: "Ticket not found" });
            return;
        }
        res.status(200).json({ success: true, data: ticket });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update a ticket
export const updateTicket = async (req: Request, res: Response): Promise<void> => {
    try {
        const updatedTicket = await Ticket.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!updatedTicket) {
            res.status(404).json({ success: false, message: "Ticket not found" });
            return;
        }
        res.status(200).json({ success: true, data: updatedTicket });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Delete a ticket
export const deleteTicket = async (req: Request, res: Response): Promise<void> => {
    try {
        const deletedTicket = await Ticket.findByIdAndDelete(req.params.id);
        if (!deletedTicket) {
            res.status(404).json({ success: false, message: "Ticket not found" });
            return;
        }
        res.status(200).json({ success: true, message: "Ticket deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};