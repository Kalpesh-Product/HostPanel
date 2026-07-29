// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { MeetingRoomBooking } from "../models/MeetingRoomBooking.js";
import Workspace from "../models/Workspace.js";
import { getZonedDateTimeParts, normalizeTimeZone } from "../utils/workspaceLocalization.js";

interface AuthenticatedRequest extends Request {
    user?: string;
    workspaceMembership?: { workspace: string };
}

const dateParts = (value: Date, timeZone: string) => {
    const parts = getZonedDateTimeParts(new Date(value), timeZone);
    return {
        date: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
        time: `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`,
    };
};

const getWorkspaceTimeZone = async (workspaceId: string) => {
    if (!workspaceId) return "";
    const workspace = await Workspace.findById(workspaceId).select("preferences.timezone").lean().exec();
    return normalizeTimeZone(workspace?.preferences?.timezone);
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

        const workspaceTimeZone = await getWorkspaceTimeZone(workspaceId);

        const bookings = await MeetingRoomBooking.find({
            workspaceId,
            bookingType: "Internal",
            $or: [
                { ownerId: req.user },
                { "invites.invitedUserId": req.user },
            ],
        }).sort({ start: 1 }).lean().exec();

        const events = bookings.filter((booking: any) => {
            const currentInvite = (booking.invites || []).find(
                (invite: any) => String(invite.invitedUserId || "") === String(req.user),
            );
            return !currentInvite || !["rejected"].includes(String(currentInvite.status || "").toLowerCase());
        }).map((booking: any) => {
            const timezone = normalizeTimeZone(booking.timezone || workspaceTimeZone);
            const start = dateParts(booking.start, timezone);
            const end = dateParts(booking.end, timezone);
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
                    status: booking.status,
                    scheduleChangeType: booking.scheduleChangeType,
                    previousDate: booking.previousDate,
                    previousStartTime: booking.previousStartTime,
                    previousEndTime: booking.previousEndTime,
                    cancelReason: booking.cancelReason,
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
