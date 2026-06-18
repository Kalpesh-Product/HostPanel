import { Request, Response } from "express";
import mongoose from "mongoose";
import { Ticket } from "../models/Ticket.js";
import { TicketIssueCatalog } from "../models/TicketIssueCatalog.js";

const nullableObjectIdFields = [
    "assigneeUserId",
    "acceptedByUserId",
    "repairLogAssignedToUserId",
    "tenantCompanyId",
    "followUpOfTicketId",
    "assetId",
    "departmentId",
    "submittedByDeptId",
    "assetDepartmentId",
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
        
        // Strip out department: '' if present so it doesn't try to save as empty string
        const payload = sanitizeTicketPayload(req.body);
        if (payload.department === "") {
            delete payload.department;
        }

        const newTicket = new Ticket({
            ...payload,
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

        if (status) filter.status = status as any;
        
        if (department) {
            const deptStr = String(department).trim();
            if (mongoose.Types.ObjectId.isValid(deptStr)) {
                filter.departmentId = new mongoose.Types.ObjectId(deptStr);
            } else if (deptStr !== "") {
                filter.department = deptStr;
            }
        }

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
            .populate("assigneeUserId", "name email")
            .populate("assetId");

        res.status(200).json({ success: true, data: tickets });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get a single ticket by ID
export const getTicketById = async (req: Request, res: Response): Promise<void> => {
    try {
        const requestWorkspaceId = (req as any).workspaceMembership?.workspace;
        const queryFilter = requestWorkspaceId
            ? { _id: req.params.id, workspaceId: requestWorkspaceId }
            : { _id: req.params.id, ownerId: (req as any).user };

        const ticket = await Ticket.findOne(queryFilter).populate("ownerId assigneeUserId assetId");
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
        const requestWorkspaceId = (req as any).workspaceMembership?.workspace;
        const queryFilter = requestWorkspaceId
            ? { _id: req.params.id, workspaceId: requestWorkspaceId }
            : { _id: req.params.id, ownerId: (req as any).user };

        const updatedTicket = await Ticket.findOneAndUpdate(
            queryFilter,
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
        const requestWorkspaceId = (req as any).workspaceMembership?.workspace;
        const queryFilter = requestWorkspaceId
            ? { _id: req.params.id, workspaceId: requestWorkspaceId }
            : { _id: req.params.id, ownerId: (req as any).user };

        const deletedTicket = await Ticket.findOneAndDelete(queryFilter);
        if (!deletedTicket) {
            res.status(404).json({ success: false, message: "Ticket not found" });
            return;
        }
        res.status(200).json({ success: true, message: "Ticket deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get issue suggestions from TicketIssueCatalog
export const getIssueSuggestions = async (req: Request, res: Response): Promise<void> => {
    try {
        const workspaceId = (req as any).workspaceMembership?.workspace;
        const { department, q } = req.query;

        if (!workspaceId) {
            res.status(401).json({ success: false, message: "Workspace ID is required" });
            return;
        }

        const filter: any = {
            workspaceId,
            isActive: { $ne: false },
        };

        if (department) {
            const deptStr = String(department).trim();
            if (mongoose.Types.ObjectId.isValid(deptStr)) {
                filter.departmentId = new mongoose.Types.ObjectId(deptStr);
            } else if (deptStr !== "") {
                filter.$or = [
                    { department: deptStr },
                    { departmentKey: deptStr.toLowerCase() }
                ];
            }
        }

        if (q) {
            const queryStr = String(q).trim().toLowerCase();
            if (queryStr !== "") {
                filter.$or = filter.$or || [];
                filter.$or.push(
                    { normalizedTitle: { $regex: queryStr, $options: "i" } },
                    { keywords: { $in: [queryStr] } }
                );
            }
        }

        const suggestions = await TicketIssueCatalog.find(filter)
            .sort({ usageCount: -1, lastUsedAt: -1 })
            .limit(20)
            .lean()
            .exec();

        res.status(200).json({ success: true, data: suggestions });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};