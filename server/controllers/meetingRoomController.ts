import { Request, Response, NextFunction } from "express";
import { MeetingRoom } from "../models/MeetingRoom.js";
import mongoose from "mongoose";

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        name?: string;
        email?: string;
        activeWorkspaceId?: string;
    };
}

// Helper function to safely get ID
const getValidObjectId = (id: any): string | null => {
    if (typeof id === "string" && mongoose.Types.ObjectId.isValid(id)) {
        return id;
    }
    return null;
};

// Create New Meeting Room
export const createMeetingRoom = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const { workspaceId, name } = req.body;

        if (!workspaceId || !name) {
            return res.status(400).json({
                message: "Workspace ID and name are required",
            });
        }

        const existingRoom = await MeetingRoom.findOne({
            workspaceId,
            name: name.trim(),
        });

        if (existingRoom) {
            return res.status(400).json({
                message: "Room with this name already exists in this workspace",
            });
        }

        const room = await MeetingRoom.create({
            ...req.body,
            workspaceId,
        });

        return res.status(201).json({
            message: "Meeting room created successfully",
            data: { room },
        });
    } catch (error: any) {
        next(error);
    }
};

// Get All Meeting Rooms
export const getMeetingRooms = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const workspaceId = req.params.workspaceId || req.user?.activeWorkspaceId;

        if (!workspaceId) {
            return res.status(400).json({
                message: "Workspace ID is required",
            });
        }

        const { status, type } = req.query;

        const query: any = { workspaceId, isActive: true };

        if (status) query.status = status;
        if (type) query.type = type;

        const rooms = await MeetingRoom.find(query)
            .sort({ sortOrder: 1, name: 1 })
            .lean()
            .exec();

        return res.status(200).json({
            message: "Meeting rooms fetched successfully",
            count: rooms.length,
            data: { rooms },
        });
    } catch (error: any) {
        next(error);
    }
};

// Get Single Room by ID
export const getMeetingRoomById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = getValidObjectId(req.params.id);

        if (!id) {
            return res.status(400).json({ message: "Invalid room ID" });
        }

        const room = await MeetingRoom.findById(id).lean().exec();

        if (!room) {
            return res.status(404).json({ message: "Meeting room not found" });
        }

        return res.status(200).json({
            message: "Meeting room fetched successfully",
            data: { room },
        });
    } catch (error: any) {
        next(error);
    }
};

// Update Room
export const updateMeetingRoom = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = getValidObjectId(req.params.id);

        if (!id) {
            return res.status(400).json({ message: "Invalid room ID" });
        }

        const room = await MeetingRoom.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        ).lean().exec();

        if (!room) {
            return res.status(404).json({ message: "Meeting room not found" });
        }

        return res.status(200).json({
            message: "Meeting room updated successfully",
            data: { room },
        });
    } catch (error: any) {
        next(error);
    }
};

// Delete Room (Soft Delete)
export const deleteMeetingRoom = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = getValidObjectId(req.params.id);

        if (!id) {
            return res.status(400).json({ message: "Invalid room ID" });
        }

        const room = await MeetingRoom.findByIdAndUpdate(
            id,
            { isActive: false, status: "Disabled" },
            { new: true }
        ).lean().exec();

        if (!room) {
            return res.status(404).json({ message: "Meeting room not found" });
        }

        return res.status(200).json({
            message: "Meeting room deleted successfully",
        });
    } catch (error: any) {
        next(error);
    }
};

// export const getClients = async (req: Request, res: Response) => {
//     try {
//         // TODO: Add your logic to fetch and return clients
//         const clients = []; // Replace with actual DB query
//         res.status(200).json({ success: true, data: clients });
//     } catch (error) {
//         res.status(500).json({ success: false, message: "Server Error" });
//     }
// };

export const respondToInvite = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // e.g., 'accepted', 'declined'

        // TODO: Add logic to update the booking status in the DB
        // const booking = await MeetingRoomBooking.findByIdAndUpdate(id, { status }, { new: true });

        res.status(200).json({ success: true, message: "Response recorded" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

export const updateBooking = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // TODO: Add logic to update booking details in the DB
        // const booking = await MeetingRoomBooking.findByIdAndUpdate(id, updateData, { new: true });

        res.status(200).json({ success: true, message: "Booking updated" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};