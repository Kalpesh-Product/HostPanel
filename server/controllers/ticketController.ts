import { Request, Response } from "express";
import mongoose from "mongoose";
import { Ticket } from "../models/Ticket.js";

const nullableObjectIdFields = [
    "assigneeUserId",
    "acceptedByUserId",
    "repairLogAssignedToUserId",
    "tenantCompanyId",
    "followUpOfTicketId",
] as const;

const toNullableObjectId = (value: unknown): mongoose.Types.ObjectId | null | undefined => {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;

    const normalizedValue = String(value);
    return mongoose.Types.ObjectId.isValid(normalizedValue)
        ? new mongoose.Types.ObjectId(normalizedValue)
        : null;
};

const sanitizeTicketPayload = (payload: Record<string, any>) => {
    const sanitizedPayload = { ...payload };

    for (const field of nullableObjectIdFields) {
        if (Object.prototype.hasOwnProperty.call(sanitizedPayload, field)) {
            sanitizedPayload[field] = toNullableObjectId(sanitizedPayload[field]);
        }
    }

    return sanitizedPayload;
};


// Create a new ticket
export const createTicket = async (req: Request, res: Response): Promise<void> => {
    try {
        const ownerId = (req as any).user;
        const workspaceId = (req as any).workspaceMembership?.workspace || null;
        const latestTicket = await Ticket.findOne({ ownerId }).sort({ ticketNumber: -1 }).select("ticketNumber").lean();
        const ticketNumber = Number(latestTicket?.ticketNumber || 0) + 1;
        const newTicket = new Ticket({
            ...sanitizeTicketPayload(req.body),
            ownerId,
            workspaceId,
            requesterUserId: ownerId,
            ticketNumber,
            ticketCode: `TCK-${String(ticketNumber).padStart(4, "0")}`,
            status: "Open",
        });
        const savedTicket = await newTicket.save();
        res.status(201).json({ success: true, data: savedTicket });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get all tickets (with optional filtering)
export const getTickets = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status, department, assigneeUserId } = req.query;
        const requestWorkspaceId = (req as any).workspaceMembership?.workspace;
        const filter: any = requestWorkspaceId
            ? { workspaceId: requestWorkspaceId }
            : { ownerId: (req as any).user };
        // const filter: Partial<ITicket> = {};

        if (status) filter.status = status as any;
        if (department) filter.department = department as string;
        if (assigneeUserId) {
            const normalizedAssigneeUserId = String(assigneeUserId);
            if (!mongoose.Types.ObjectId.isValid(normalizedAssigneeUserId)) {
                res.status(400).json({ success: false, message: "Invalid assignee user id" });
                return;
            }
            filter.assigneeUserId = new mongoose.Types.ObjectId(normalizedAssigneeUserId);
        }

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
            { $set: sanitizeTicketPayload(req.body) },
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