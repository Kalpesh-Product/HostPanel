// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { MeetingRoomBooking } from "../models/MeetingRoomBooking.js";

interface AuthenticatedRequest extends Request {
    user?: string;
    workspaceMembership?: { workspace: string };
}

const dateParts = (value: Date) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(new Date(value));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
        date: `${values.year}-${values.month}-${values.day}`,
        time: `${values.hour}:${values.minute}`,
    };
};

export const getMyCalendar = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const workspaceId = req.workspaceMembership?.workspace;
        if (!req.user || !workspaceId) {
            return res.status(401).json({ message: "An active workspace is required" });
        }

        const bookings = await MeetingRoomBooking.find({
            workspaceId,
            bookingType: "Internal",
            status: { $ne: "cancelled" },
            $or: [
                { ownerId: req.user },
                { "invites.invitedUserId": req.user },
            ],
        }).sort({ start: 1 }).lean().exec();

        const events = bookings.filter((booking: any) => {
            const currentInvite = (booking.invites || []).find(
                (invite: any) => String(invite.invitedUserId || "") === String(req.user),
            );
            return !currentInvite || !["rejected", "cancelled"].includes(String(currentInvite.status || "").toLowerCase());
        }).map((booking: any) => {
            const start = dateParts(booking.start);
            const end = dateParts(booking.end);
            const currentInvite = (booking.invites || []).find(
                (invite: any) => String(invite.invitedUserId || "") === String(req.user),
            );

            return {
                id: String(booking._id),
                type: "booking",
                title: booking.purpose || `Meeting in ${booking.roomName}`,
                description: booking.bookingNotes || booking.purpose || "",
                date: start.date,
                endDate: end.date,
                startTime: start.time,
                time: `${start.time} - ${end.time}`,
                location: booking.roomName,
                reference: booking.bookingCode,
                status: booking.status,
                attendees: (booking.invites || []).map((invite: any) => invite.invitedName).filter(Boolean),
                details: {
                    roomName: booking.roomName,
                    bookedByName: booking.bookedByName,
                    bookedForName: booking.bookedForName,
                    department: booking.department,
                    currentInviteStatus: currentInvite?.status,
                    invites: booking.invites || [],
                },
            };
        });

        return res.status(200).json({
            data: {
                events,
                summary: {
                    total: events.length,
                    tasks: 0,
                    tickets: 0,
                    leaveRequests: 0,
                    bookings: events.length,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};
