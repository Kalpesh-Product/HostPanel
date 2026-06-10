import { Request, Response, NextFunction } from "express";
import { MeetingRoomBooking } from "../models/MeetingRoomBooking.js";
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

// Helper function to safely validate ObjectId
const getValidObjectId = (id: any): string | null => {
    if (typeof id === "string" && mongoose.Types.ObjectId.isValid(id)) {
        return id;
    }
    return null;
};

// Create New Booking
export const createBooking = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const { workspaceId, roomId, start, end, purpose, attendees } = req.body;

        if (!workspaceId || !roomId || !start || !end || !purpose) {
            return res.status(400).json({
                message: "Workspace ID, Room ID, start, end, and purpose are required",
            });
        }

        // Check if room exists and is active
        const room = await MeetingRoom.findById(roomId);
        if (!room || !room.isActive) {
            return res.status(404).json({
                message: "Meeting room not found or inactive",
            });
        }

        // Check for overlapping bookings
        const overlapping = await MeetingRoomBooking.findOne({
            roomId,
            status: { $nin: ["cancelled", "completed"] },
            $or: [
                {
                    start: { $lt: new Date(end) },
                    end: { $gt: new Date(start) },
                },
            ],
        });

        if (overlapping) {
            return res.status(400).json({
                message: "Room is already booked for the selected time slot",
            });
        }

        // Generate booking number and code
        const lastBooking = await MeetingRoomBooking.findOne({ workspaceId })
            .sort({ bookingNumber: -1 });

        const bookingNumber = lastBooking ? lastBooking.bookingNumber + 1 : 1001;
        const bookingCode = `MRB-${Date.now().toString().slice(-6)}-${bookingNumber}`;

        const booking = await MeetingRoomBooking.create({
            ...req.body,
            workspaceId,
            roomId,
            roomName: room.name,
            bookingNumber,
            bookingCode,
            start: new Date(start),
            end: new Date(end),
            ownerId: req.user?.id,
            bookedByUserId: req.user?.id,
            bookedByName: req.user?.name || req.body.bookedByName,
            bookedByEmail: req.user?.email || req.body.bookedByEmail,
            status: "confirmed",
        });

        return res.status(201).json({
            message: "Meeting room booking created successfully",
            data: { booking },
        });
    } catch (error: any) {
        next(error);
    }
};

// Get All Bookings (Workspace level)
export const getBookings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const workspaceId = req.params.workspaceId || req.user?.activeWorkspaceId;

        if (!workspaceId) {
            return res.status(400).json({ message: "Workspace ID is required" });
        }

        const { startDate, endDate, status } = req.query;

        const query: any = { workspaceId };

        if (startDate && endDate) {
            query.start = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string),
            };
        }

        if (status) query.status = status;

        const bookings = await MeetingRoomBooking.find(query)
            .populate("roomId", "name type capacity")
            .populate("ownerId", "name email")
            .sort({ start: -1 })
            .lean()
            .exec();

        return res.status(200).json({
            message: "Bookings fetched successfully",
            count: bookings.length,
            data: { bookings },
        });
    } catch (error: any) {
        next(error);
    }
};

// Get My Bookings (Current User)
export const getMyBookings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const bookings = await MeetingRoomBooking.find({
            ownerId: req.user.id,
        })
            .populate("roomId", "name type")
            .sort({ start: -1 })
            .lean()
            .exec();

        return res.status(200).json({
            message: "My bookings fetched successfully",
            data: { bookings },
        });
    } catch (error: any) {
        next(error);
    }
};

// Cancel Booking
export const cancelBooking = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params;
        const { cancelReason } = req.body;

        const bookingId = getValidObjectId(id);
        if (!bookingId) {
            return res.status(400).json({ message: "Invalid booking ID" });
        }

        const booking = await MeetingRoomBooking.findByIdAndUpdate(
            bookingId,
            {
                status: "cancelled",
                cancelReason: cancelReason || "Cancelled by user",
            },
            { new: true }
        ).lean().exec();

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        return res.status(200).json({
            message: "Booking cancelled successfully",
            data: { booking },
        });
    } catch (error: any) {
        next(error);
    }
};

// Get Single Booking by ID
export const getBookingById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = getValidObjectId(req.params.id);
        if (!id) {
            return res.status(400).json({ message: "Invalid booking ID" });
        }

        const booking = await MeetingRoomBooking.findById(id)
            .populate("roomId", "name type capacity floor")
            .populate("ownerId", "name email")
            .lean()
            .exec();

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        return res.status(200).json({
            message: "Booking fetched successfully",
            data: { booking },
        });
    } catch (error: any) {
        next(error);
    }
};