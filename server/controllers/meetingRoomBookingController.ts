// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { MeetingRoomBooking } from "../models/MeetingRoomBooking.js";
import { MeetingRoom } from "../models/MeetingRoom.js";
import HostUser from "../models/HostUser.js";

interface AuthenticatedRequest extends Request {
    user?: string;
    workspaceMembership?: { workspace: string; role: string; isPrimary: boolean };
}

const getValidObjectId = (id: any): string | null =>
    typeof id === "string" && mongoose.Types.ObjectId.isValid(id) ? id : null;

const workspaceIdFor = (req: AuthenticatedRequest) => req.workspaceMembership?.workspace || "";
const ACTIVE_BOOKING_STATUSES = { $nin: ["cancelled", "completed"] };

const dateTimeParts = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(new Date(date));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
};

const transformBooking = (booking: any, currentUserId?: string) => {
    const room = booking.roomId && typeof booking.roomId === "object" ? booking.roomId : null;
    const owner = booking.ownerId && typeof booking.ownerId === "object" ? booking.ownerId : null;
    const start = booking.start ? dateTimeParts(booking.start) : { date: "", time: "" };
    const end = booking.end ? dateTimeParts(booking.end) : { date: "", time: "" };
    const ownerId = String(owner?._id || booking.ownerId || "");
    return {
        ...booking,
        recordId: String(booking._id || booking.id || ""),
        id: String(booking._id || booking.id || ""),
        date: start.date,
        startTime: start.time,
        endTime: end.time,
        roomName: booking.roomName || room?.name || "",
        floor: room?.floor || "",
        wing: room?.wing || "",
        roomType: room?.type || "Meeting Room",
        roomCapacity: room?.capacity || 0,
        bookedByName: booking.bookedByName || owner?.name || "",
        isMe: Boolean(currentUserId && ownerId === String(currentUserId)),
        storedStatus: booking.status,
    };
};

const parseDateRange = (start: any, end: any) => {
    const parsedStart = new Date(start);
    const parsedEnd = new Date(end);
    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime()) || parsedEnd <= parsedStart) return null;
    return { start: parsedStart, end: parsedEnd };
};

const findOverlap = (roomId: any, start: Date, end: Date, excludeId?: string) => MeetingRoomBooking.findOne({
    roomId,
    status: ACTIVE_BOOKING_STATUSES,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    start: { $lt: end },
    end: { $gt: start },
});

export const createBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const workspaceId = workspaceIdFor(req);
        const { roomId, start, end, purpose, attendees, inviteeUserIds = [] } = req.body;
        const range = parseDateRange(start, end);
        if (!workspaceId || !req.user) return res.status(401).json({ message: "An active workspace is required" });
        if (!roomId || !purpose?.trim() || !range) return res.status(400).json({ message: "Room, valid start/end times, and purpose are required" });

        const room = await MeetingRoom.findOne({ _id: roomId, workspaceId, isActive: true, status: "Active" }).lean().exec();
        if (!room) return res.status(404).json({ message: "Meeting room not found or inactive" });
        const attendeeCount = Math.max(1, Number(attendees || inviteeUserIds.length + 1));
        if (attendeeCount > Number(room.capacity || 0)) return res.status(400).json({ message: "Attendee count exceeds room capacity" });
        if (await findOverlap(roomId, range.start, range.end)) return res.status(409).json({ message: "Room is already booked for the selected time slot" });

        const [lastBooking, hostUser, invitedUsers] = await Promise.all([
            MeetingRoomBooking.findOne({ workspaceId }).sort({ bookingNumber: -1 }).lean().exec(),
            HostUser.findById(req.user).lean().exec(),
            HostUser.find({ _id: { $in: Array.isArray(inviteeUserIds) ? inviteeUserIds : [] } }).lean().exec(),
        ]);
        const bookingNumber = lastBooking ? Number(lastBooking.bookingNumber) + 1 : 1001;
        const booking = await MeetingRoomBooking.create({
            workspaceId,
            roomId,
            roomName: room.name,
            bookingNumber,
            bookingCode: `MRB-${Date.now()}-${bookingNumber}`,
            start: range.start,
            end: range.end,
            originalStart: range.start,
            originalEnd: range.end,
            ownerId: req.user,
            bookedByUserId: req.user,
            bookedByName: hostUser?.name || req.body.bookedByName || "User",
            bookedByEmail: hostUser?.email || req.body.bookedByEmail || "",
            purpose: purpose.trim(),
            attendees: attendeeCount,
            department: req.body.department,
            invites: invitedUsers.map((user: any) => ({ invitedUserId: user._id, invitedName: user.name || user.email || "User", invitedEmail: user.email, status: "pending" })),
            status: "confirmed",
        });
        return res.status(201).json({ message: "Meeting room booking created successfully", data: { booking } });
    } catch (error: any) { next(error); }
};

export const getBookings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const workspaceId = workspaceIdFor(req);
        if (!workspaceId || workspaceId !== req.params.workspaceId) return res.status(403).json({ message: "Workspace access denied" });
        const [bookings, rooms] = await Promise.all([
            MeetingRoomBooking.find({ workspaceId }).populate("roomId", "name type capacity floor wing").populate("ownerId", "name email").sort({ start: -1 }).lean().exec(),
            MeetingRoom.find({ workspaceId, isActive: true }).sort({ sortOrder: 1, name: 1 }).lean().exec(),
        ]);
        const transformedBookings = bookings.map((booking: any) => transformBooking(booking, req.user));
        const receivedInvites = transformedBookings.flatMap((booking: any) => (booking.invites || [])
            .filter((invite: any) => String(invite.invitedUserId || "") === String(req.user || ""))
            .map((invite: any) => ({ ...invite, bookingId: booking.recordId, roomName: booking.roomName, bookedByName: booking.bookedByName, date: booking.date, startTime: booking.startTime, endTime: booking.endTime })));
        const roomDetails = rooms.map((room: any) => ({ ...room, credits: room.creditsPerHour || 0, pricePerHour: room.creditsPerHour || 0, pricePerDay: 0, activationReady: room.isActive && room.status === "Active" }));
        return res.status(200).json({ message: "Bookings fetched successfully", data: { roomDetails, bookings: transformedBookings, receivedInvites } });
    } catch (error: any) { next(error); }
};

export const getMyBookings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) return res.status(401).json({ message: "User not authenticated" });
        const bookings = await MeetingRoomBooking.find({ ownerId: req.user, workspaceId: workspaceIdFor(req) }).populate("roomId", "name type capacity floor wing").sort({ start: -1 }).lean().exec();
        return res.status(200).json({ message: "My bookings fetched successfully", data: { bookings: bookings.map((booking: any) => transformBooking(booking, req.user)) } });
    } catch (error: any) { next(error); }
};

export const updateBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = getValidObjectId(req.params.id);
        if (!id) return res.status(400).json({ message: "Invalid booking ID" });
        const booking: any = await MeetingRoomBooking.findOne({ _id: id, workspaceId: workspaceIdFor(req) });
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        const range = parseDateRange(req.body.start || booking.start, req.body.end || booking.end);
        if (!range) return res.status(400).json({ message: "Valid start and end times are required" });
        if (await findOverlap(booking.roomId, range.start, range.end, id)) return res.status(409).json({ message: "Room is already booked for the selected time slot" });
        booking.start = range.start;
        booking.end = range.end;
        if (req.body.scheduleChangeType) booking.scheduleChangeType = req.body.scheduleChangeType;
        if (req.body.extensionAmount !== undefined) booking.extensionAmount = req.body.extensionAmount;
        if (req.body.totalAmount !== undefined) booking.totalAmount = req.body.totalAmount;
        await booking.save();
        return res.status(200).json({ message: "Booking updated successfully", data: { booking } });
    } catch (error: any) { next(error); }
};

export const cancelBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = getValidObjectId(req.params.id);
        if (!id) return res.status(400).json({ message: "Invalid booking ID" });
        const booking = await MeetingRoomBooking.findOneAndUpdate({ _id: id, workspaceId: workspaceIdFor(req) }, { status: "cancelled", cancelReason: req.body.cancelReason || "Cancelled by user" }, { new: true }).lean().exec();
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        return res.status(200).json({ message: "Booking cancelled successfully", data: { booking } });
    } catch (error: any) { next(error); }
};

export const respondToInvite = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = getValidObjectId(req.params.id);
        const status = req.body.status === "declined" ? "rejected" : req.body.status;
        if (!id || !["accepted", "rejected"].includes(status)) return res.status(400).json({ message: "A valid booking and response are required" });
        const booking: any = await MeetingRoomBooking.findOne({ _id: id, workspaceId: workspaceIdFor(req), "invites.invitedUserId": req.user });
        if (!booking) return res.status(404).json({ message: "Invite not found" });
        const invite = booking.invites.find((item: any) => String(item.invitedUserId) === String(req.user));
        invite.status = status;
        invite.responseReason = req.body.reason || "";
        invite.respondedAt = new Date();
        await booking.save();
        return res.status(200).json({ message: "Invite response saved", data: { booking } });
    } catch (error: any) { next(error); }
};

export const getBookingById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = getValidObjectId(req.params.id);
        if (!id) return res.status(400).json({ message: "Invalid booking ID" });
        const booking = await MeetingRoomBooking.findOne({ _id: id, workspaceId: workspaceIdFor(req) }).populate("roomId", "name type capacity floor wing").populate("ownerId", "name email").lean().exec();
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        return res.status(200).json({ message: "Booking fetched successfully", data: { booking: transformBooking(booking, req.user) } });
    } catch (error: any) { next(error); }
};