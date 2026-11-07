// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { MeetingRoomBooking } from "../models/MeetingRoomBooking.js";
import { CalendarEvent } from "../models/CalendarEvent.js";
import Workspace from "../models/Workspace.js";
import Holiday from "../models/Holiday.js";
import LeaveRequest from "../models/LeaveRequest.js";
import HostUser from "../models/HostUser.js";
import { getZonedDateTimeParts, normalizeTimeZone } from "../utils/workspaceLocalization.js";
import { resolveInvites } from "./meetingRoomBookingController.js";
import { createNotification } from "../utils/notify.js";

const EMAIL_FONT = "'Poppins','Segoe UI',Arial,sans-serif";
const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

        const calendarEventDocs = await CalendarEvent.find({
            workspaceId,
            status: "active",
            $or: [{ ownerId: req.user }, { "invites.invitedUserId": req.user }],
        }).sort({ date: 1 }).lean().exec();
        const userCalendarEvents = calendarEventDocs.map((event: any) => ({
            id: `calendar-event-${String(event._id)}`,
            type: "personal",
            title: event.title,
            description: event.description || "",
            date: event.date,
            endDate: event.date,
            startTime: event.startTime || "",
            time: event.startTime ? `${event.startTime}${event.endTime ? ` - ${event.endTime}` : ""}` : "All day",
            location: "",
            reference: "",
            attendees: (event.invites || []).map((invite: any) => invite.invitedName).filter(Boolean),
            details: {
                organizerName: event.ownerName,
                invites: event.invites || [],
            },
        }));

        const events = [...holidayEvents, ...leaveEvents, ...bookingEvents, ...userCalendarEvents];

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
                    personalEvents: userCalendarEvents.length,
                    bookings: bookingEvents.length,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

export const createCalendarEvent = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const workspaceId = req.workspaceMembership?.workspace;
        if (!req.user || !workspaceId) {
            return res.status(401).json({ message: "An active workspace is required" });
        }

        const title = String(req.body?.title || "").trim();
        const date = String(req.body?.date || "").trim();
        if (!title) return res.status(400).json({ message: "A title is required" });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: "A valid date is required" });

        const startTime = String(req.body?.startTime || "").trim();
        const endTime = String(req.body?.endTime || "").trim();
        const description = String(req.body?.description || "").trim();

        // A backdated slot can never be booked — checked in the workspace's own
        // timezone, not the server's or the caller's, so it matches what the
        // calendar UI already filtered out.
        const workspaceTimeZone = await getWorkspaceTimeZone(workspaceId);
        const nowParts = dateParts(new Date(), workspaceTimeZone);
        if (date < nowParts.date || (date === nowParts.date && startTime && startTime < nowParts.time)) {
            return res.status(400).json({ message: "A past date or time cannot be booked" });
        }

        const owner = await HostUser.findById(req.user).select("name email").lean().exec();
        const ownerName = owner?.name || owner?.email || "Someone";
        const ownerEmail = String(owner?.email || "").trim().toLowerCase();

        const rawInvites = await resolveInvites(req.body?.inviteeUserIds);
        const memberInvites = rawInvites.filter(
            (invite: any) => String(invite.invitedUserId || "") !== String(req.user),
        );
        const memberInviteEmails = new Set(
            memberInvites.map((invite: any) => String(invite.invitedEmail || "").toLowerCase()).filter(Boolean),
        );

        const uniqueGuestEmails = [
            ...new Set(
                (Array.isArray(req.body?.guestEmails) ? req.body.guestEmails : [])
                    .map((email: any) => String(email || "").trim().toLowerCase())
                    .filter((email: string) => EMAIL_FORMAT_RE.test(email)),
            ),
        ];
        const guestInvites = uniqueGuestEmails
            .filter((email) => email !== ownerEmail && !memberInviteEmails.has(email))
            .map((email) => ({
                invitedName: email.split("@")[0] || "Guest",
                invitedEmail: email,
                status: "pending" as const,
            }));

        const invites = [...memberInvites, ...guestInvites];

        const event = await CalendarEvent.create({
            workspaceId,
            ownerId: req.user,
            ownerName,
            title,
            description,
            date,
            startTime,
            endTime,
            invites,
        });

        if (invites.length > 0) {
            const { sendMail } = await import("../config/mailer.js");
            const timeLabel = startTime ? `${startTime}${endTime ? ` - ${endTime}` : ""}` : "All day";

            for (const invite of invites) {
                if (invite.invitedUserId && String(invite.invitedUserId) !== String(req.user)) {
                    createNotification({
                        workspaceId,
                        recipientUserId: String(invite.invitedUserId),
                        actorUserId: req.user,
                        type: "calendar_event_invitation",
                        category: "calendar",
                        title: "Calendar Invitation",
                        description: `${ownerName} invited you to "${title}" on ${date}${startTime ? ` at ${startTime}` : ""}.`,
                        entityType: "calendar_event",
                        entityId: String(event._id),
                        targetUrl: "/common-modules/calendar",
                        data: { title, date, startTime, endTime },
                        priority: "normal",
                        isActionRequired: true,
                        dedupeKey: `calendar-event-invite:${event._id}:${invite.invitedUserId}`,
                    });
                }

                if (invite.invitedEmail) {
                    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:${EMAIL_FONT};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);font-family:${EMAIL_FONT};">
        <tr><td style="background:#2563EB;padding:32px 40px;">
          <p style="margin:0;font-size:22px;font-weight:600;color:#ffffff;font-family:${EMAIL_FONT};">Calendar Invitation</p>
          <p style="margin:8px 0 0;font-size:13px;font-weight:500;color:#dbeafe;font-family:${EMAIL_FONT};">${ownerName} invited you to an event</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 24px;font-size:15px;font-weight:500;color:#334155;font-family:${EMAIL_FONT};">Hi <strong>${invite.invitedName || "there"}</strong>, you've been invited to the event below.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
            <tr><td style="padding:10px 16px;font-size:13px;font-weight:500;color:#64748b;font-family:${EMAIL_FONT};">Title</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;font-family:${EMAIL_FONT};">${title}</td></tr>
            <tr style="border-top:1px solid #f1f5f9;background:#f8fafc;"><td style="padding:10px 16px;font-size:13px;font-weight:500;color:#64748b;font-family:${EMAIL_FONT};">Date</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;font-family:${EMAIL_FONT};">${date}</td></tr>
            <tr style="border-top:1px solid #f1f5f9;"><td style="padding:10px 16px;font-size:13px;font-weight:500;color:#64748b;font-family:${EMAIL_FONT};">Time</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;font-family:${EMAIL_FONT};">${timeLabel}</td></tr>
            ${description ? `<tr style="border-top:1px solid #f1f5f9;background:#f8fafc;"><td style="padding:10px 16px;font-size:13px;font-weight:500;color:#64748b;font-family:${EMAIL_FONT};">Agenda</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;font-family:${EMAIL_FONT};">${description}</td></tr>` : ""}
          </table>
          <p style="margin:0;font-size:13px;font-weight:500;color:#94a3b8;line-height:1.6;font-family:${EMAIL_FONT};">Open the WoNo app to view this on your calendar.</p>
        </td></tr>
        <tr><td style="background:#f1f5f9;padding:20px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;font-weight:500;color:#94a3b8;font-family:${EMAIL_FONT};">This is an automated notice. Please do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
                    sendMail({
                        to: invite.invitedEmail,
                        subject: `Calendar Invitation — ${title} on ${date}`,
                        html,
                        text: `${ownerName} invited you to "${title}" on ${date}${startTime ? ` at ${timeLabel}` : ""}.${description ? ` Agenda: ${description}.` : ""}`,
                    }).catch((err: any) => console.error("Calendar event invite email failed:", err?.message || err));
                }
            }
        }

        return res.status(201).json({ message: "Event created successfully", data: event });
    } catch (error) {
        next(error);
    }
};
