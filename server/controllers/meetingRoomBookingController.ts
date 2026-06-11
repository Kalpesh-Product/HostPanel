import { Request, Response, NextFunction } from "express";
import { MeetingRoomBooking } from "../models/MeetingRoomBooking.js";
import { MeetingRoom } from "../models/MeetingRoom.js";
import mongoose from "mongoose";
import HostUser from "../models/HostUser.js";

interface AuthenticatedRequest extends Request {
    user?: string; // userId string from verifyJwt
    workspaceMembership?: {
        workspace: string;
        role: string;
        isPrimary: boolean;
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

        // Look up user name/email from DB
        let bookedByName = req.body.bookedByName || "";
        let bookedByEmail = req.body.bookedByEmail || "";
        if (req.user && (!bookedByName || !bookedByEmail)) {
            try {
                const hostUser = await HostUser.findById(req.user).lean().exec();
                if (hostUser) {
                    if (!bookedByName) bookedByName = hostUser.name || "";
                    if (!bookedByEmail) bookedByEmail = hostUser.email || "";
                }
            } catch (e) {
                // HostUser model may not exist — continue without name/email
            }
        }

        const booking = await MeetingRoomBooking.create({
            ...req.body,
            workspaceId,
            roomId,
            roomName: room.name,
            bookingNumber,
            bookingCode,
            start: new Date(start),
            end: new Date(end),
            ownerId: req.user,
            bookedByUserId: req.user,
            bookedByName,
            bookedByEmail,
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

// Helper: format Date to "HH:mm" string
const formatTime = (date: Date): string => {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
};

// Helper: format Date to "YYYY-MM-DD" string
const formatDate = (date: Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Get All Bookings (Workspace level) — also returns roomDetails
export const getBookings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const workspaceId = req.params.workspaceId || req.workspaceMembership?.workspace;

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

        // Fetch bookings and rooms in parallel
        const [bookings, rooms] = await Promise.all([
            MeetingRoomBooking.find(query)
                .populate("roomId", "name type capacity floor")
                .populate("ownerId", "name email")
                .sort({ start: -1 })
                .lean()
                .exec(),
            MeetingRoom.find({ workspaceId, isActive: true })
                .sort({ sortOrder: 1, name: 1 })
                .lean()
                .exec(),
        ]);

        // Get current user ID for isMe flag
        const currentUserId = req.user || null;

        // Transform bookings for frontend compatibility
        const transformedBookings = bookings.map((booking: any) => {
            const room = booking.roomId as any;
            const owner = booking.ownerId as any;
            return {
                ...booking,
                // Frontend expects separate date/startTime/endTime
                date: booking.start ? formatDate(booking.start) : "",
                startTime: booking.start ? formatTime(booking.start) : "",
                endTime: booking.end ? formatTime(booking.end) : "",
                // Flatten room info
                roomName: booking.roomName || room?.name || "",
                floor: room?.floor || booking.roomName || "",
                roomType: room?.type || "Meeting Room",
                roomCapacity: room?.capacity || 0,
                // Flatten owner info
                bookedByName: booking.bookedByName || owner?.name || "",
                bookedByRole: owner?.workspaceMembership?.role || "",
                // isMe flag for frontend filtering
                isMe: String(booking.ownerId?._id || booking.ownerId) === String(currentUserId),
            };
        });

        // Transform rooms for frontend compatibility
        const transformedRooms = rooms.map((room: any) => ({
            ...room,
            credits: room.creditsPerHour || 0,
            pricePerHour: room.creditsPerHour || 0,
            pricePerDay: 0,
            activationReady: room.isActive && room.status === "Active",
        }));

        return res.status(200).json({
            message: "Bookings fetched successfully",
            count: transformedBookings.length,
            data: {
                roomDetails: transformedRooms,
                bookings: transformedBookings,
            },
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
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const bookings = await MeetingRoomBooking.find({
            ownerId: req.user,
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