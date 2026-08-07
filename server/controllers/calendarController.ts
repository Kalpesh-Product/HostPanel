// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { MeetingRoomBooking } from "../models/MeetingRoomBooking.js";
import Workspace from "../models/Workspace.js";
import Holiday from "../models/Holiday.js";
import LeaveRequest from "../models/LeaveRequest.js";
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

        const bookingEvents = bookings.filter((booking: any) => {
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

        const holidays = await Holiday.find({ workspaceId, isActive: true })
            .sort({ date: 1 })
            .lean()
            .exec();
        const holidayEvents = holidays.map((holiday: any) => ({
            id: `holiday-${String(holiday._id)}`,
            type: holiday.entryKind === "event" ? "event" : "holiday",
            title: holiday.name || "Holiday",
            description: holiday.description || "",
            date: holiday.dateKey,
            endDate: holiday.dateKey,
            startTime: holiday.entryKind === "event" ? holiday.time || "" : "",
            time: holiday.entryKind === "event" && holiday.time ? holiday.time : "All day",
            location: holiday.entryKind === "event" ? holiday.location || "" : "",
            reference: "",
            attendees: [],
            details: {
                holidayType: holiday.type,
                entryKind: holiday.entryKind || "holiday",
                source: holiday.source || "manual",
                recurring: Boolean(holiday.recurring),
            },
        }));

        const approvedLeaves = await LeaveRequest.find({
            workspaceId,
            requesterUserId: req.user,
            status: "approved",
            startDate: { $gte: new Date(`${new Date().getFullYear()}-01-01T00:00:00.000Z`) },
        }).sort({ startDate: 1 }).lean().exec();
        const leaveEvents = approvedLeaves.map((leave: any) => {
            const timezone = normalizeTimeZone(leave.timezone || workspaceTimeZone);
            return {
                id: `leave-${String(leave._id)}`,
                type: "leave",
                title: `${leave.leaveType} leave`,
                description: leave.reason || "",
                date: dateParts(leave.startDate, timezone).date,
                endDate: dateParts(leave.endDate, timezone).date,
                startTime: "",
                time: "All day",
                location: "",
                reference: leave.leaveCode,
                status: leave.status,
                attendees: [],
                details: {
                    leaveType: leave.leaveType,
                    leaveMode: leave.leaveMode,
                    halfDaySession: leave.halfDaySession,
                    leaveHours: Number(leave.leaveHours || 0),
                },
            };
        });

        const events = [...holidayEvents, ...leaveEvents, ...bookingEvents];

        return res.status(200).json({
            data: {
                events,
                summary: {
                    total: events.length,
                    tasks: 0,
                    tickets: 0,
                    leaveRequests: leaveEvents.length,
                    holidays: holidayEvents.filter((event) => event.type === "holiday").length,
                    events: holidayEvents.filter((event) => event.type === "event").length,
                    bookings: bookingEvents.length,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};
