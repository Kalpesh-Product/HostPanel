// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { MeetingRoomBooking } from "../models/MeetingRoomBooking.js";
import { Resource } from "../models/Resource.js";
import HostUser from "../models/HostUser.js";
import TenantEmployee from "../models/TenantEmployee.js";
import { TenantCompany } from "../models/TenantCompany.js";
import TenantCreditLedger from "../models/TenantCreditLedger.js";

interface AuthenticatedRequest extends Request {
    user?: string;
    workspaceMembership?: { workspace: string; role: string; isPrimary: boolean };
}

const getValidObjectId = (id: any): string | null =>
    typeof id === "string" && mongoose.Types.ObjectId.isValid(id) ? id : null;

const workspaceIdFor = (req: AuthenticatedRequest) => req.workspaceMembership?.workspace || "";
const ACTIVE_BOOKING_STATUSES = { $nin: ["cancelled", "completed"] };
// const MEETING_ROOM_RESOURCE_FILTER = {
//     $or: [
//         { resourceCategory: { $in: ["meeting_room", "conference_room", "desk", "cabin", "virtual_office"] } },
//         { type: { $in: ["Meeting Room", "Conference Room", "Desk", "Cabin", "Virtual Office"] } },
//     ],
// };

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

/**
 * Pure normalization of the create-booking request body. Accepts either the
 * ISO payload shape ({ roomId, start, end }) or the host-panel form shape
 * ({ roomName, date, startTime, endTime }) and returns a unified result.
 *
 * - roomIdCandidate: body.roomId when it is a valid Mongo ObjectId, else null.
 * - roomNameCandidate: trimmed body.roomName (empty string when absent) — used
 *   to resolve the room by name when no roomId is supplied.
 * - range: parseDateRange(start, end) when both are present; otherwise built
 *   from date + startTime + endTime. Null when neither shape yields a valid range.
 */
export const normalizeCreateBookingInput = (body: any = {}) => {
    const roomIdCandidate = getValidObjectId(body?.roomId);
    const roomNameCandidate = typeof body?.roomName === "string" ? body.roomName.trim() : "";

    let range = null;
    if (body?.start != null && body?.end != null) {
        range = parseDateRange(body.start, body.end);
    } else if (body?.date && body?.startTime && body?.endTime) {
        range = parseDateRange(`${body.date}T${body.startTime}:00`, `${body.date}T${body.endTime}:00`);
    }

    return { roomIdCandidate, roomNameCandidate, range };
};

const normalizeEmail = (e: any): string => String(e || "").trim().toLowerCase();

/**
 * Pure resolution of the booker name for a booking, preserving the on-behalf
 * booker name supplied by the form over the logged-in actor's name.
 *
 * Precedence:
 *   1. Trimmed body.bookedByName when it is a non-empty string.
 *   2. hostUser.name (the logged-in access holder).
 *   3. "User" as a final fallback.
 *
 * No DB access: safe to unit-test without a live MongoDB.
 */
export const resolveBookedByName = (body: any = {}, hostUser: any = null): string =>
    (typeof body?.bookedByName === "string" && body.bookedByName.trim())
        ? body.bookedByName.trim()
        : (hostUser?.name || "User");

/**
 * Pure extraction of a tenant company id candidate from the request body.
 *
 * Resolution order (first match wins):
 *   1. body.tenantCompanyId when it is a valid Mongo ObjectId.
 *   2. body.sourceReference of the form `tenant-room-booking:<id>` — the parsed
 *      `<id>` when it is a valid Mongo ObjectId.
 * Returns the candidate id string, or null when neither yields a valid id.
 *
 * No DB access: safe to unit-test without a live MongoDB.
 */
export const parseTenantCompanyIdFromBody = (body: any = {}): string | null => {
    const explicit = getValidObjectId(body?.tenantCompanyId);
    if (explicit) return explicit;

    const sourceReference = typeof body?.sourceReference === "string" ? body.sourceReference.trim() : "";
    const prefix = "tenant-room-booking:";
    if (sourceReference.startsWith(prefix)) {
        const parsed = sourceReference.slice(prefix.length).trim();
        const valid = getValidObjectId(parsed);
        if (valid) return valid;
    }

    return null;
};

/**
 * Resolve the tenant company for a booking, preferring the explicitly supplied
 * company over the logged-in actor's identity (so on-behalf bookings link to the
 * intended company). Resolution order:
 *   1. body.tenantCompanyId / parsed body.sourceReference (via parseTenantCompanyIdFromBody)
 *      -> TenantCompany.findById(...)
 *   2. Fallback: Active TenantEmployee by normalized hostUser.email -> its TenantCompany.
 * Returns { tenantBookingCompanyId, tenantBookingCompanyName } for the first that
 * resolves to an existing company, else null.
 */
const resolveTenantCompany = async (
    body: any = {},
    hostUser: any,
): Promise<{ tenantBookingCompanyId: string; tenantBookingCompanyName: string } | null> => {
    const fromBody = parseTenantCompanyIdFromBody(body);
    if (fromBody) {
        const company = await TenantCompany.findById(fromBody).lean().exec();
        if (company) {
            return { tenantBookingCompanyId: String(company._id), tenantBookingCompanyName: company.companyName || "" };
        }
    }

    if (hostUser?.email) {
        const tenantEmp = await TenantEmployee.findOne({ email: normalizeEmail(hostUser.email), status: "Active" }).lean().exec();
        if (tenantEmp) {
            const company = await TenantCompany.findById(tenantEmp.tenantCompanyId).lean().exec();
            if (company) {
                return { tenantBookingCompanyId: String(company._id), tenantBookingCompanyName: company.companyName || "" };
            }
        }
    }

    return null;
};

/**
 * Resolve the tenant company that a booking's credits should be charged to,
 * returning a loaded (non-lean, save-able) TenantCompany document or null.
 *
 * Unlike resolveTenantCompany (which reads the request body for create), this
 * resolves from the booking itself so that on-behalf bookings deduct/refund
 * against the linked company regardless of who performs the update/cancel.
 *
 * Resolution order:
 *   1. booking.bookedByTenantCompanyId when it is a valid ObjectId ->
 *      TenantCompany.findById(...) (the company the booking is linked to).
 *   2. Fallback: HostUser.findById(reqUserId) -> Active TenantEmployee by
 *      normalized email -> TenantCompany.findById(tenantEmp.tenantCompanyId).
 * Returns the save-able document, or null when none resolve.
 */
const getBookingTenantCompany = async (booking: any, reqUserId: any): Promise<any | null> => {
    const linkedId = getValidObjectId(String(booking?.bookedByTenantCompanyId || ""));
    if (linkedId) {
        return TenantCompany.findById(linkedId).exec();
    }

    if (reqUserId) {
        const hostUser = await HostUser.findById(reqUserId).lean().exec();
        if (hostUser?.email) {
            const tenantEmp = await TenantEmployee.findOne({ email: normalizeEmail(hostUser.email), status: "Active" }).lean().exec();
            if (tenantEmp) {
                return TenantCompany.findById(tenantEmp.tenantCompanyId).exec();
            }
        }
    }

    return null;
};

/**
 * Pure merge/dedup/skip of resolved invitees. Given already-fetched HostUser
 * docs and Active TenantEmployee docs (plus the requested id list, preserving
 * order), returns the final invite entries:
 *   { invitedUserId, invitedName, invitedEmail, status: "pending" }
 *
 * Rules:
 *   - Iterate the requested ids in order.
 *   - A host match (by _id) maps to { invitedUserId: user._id, ... }.
 *   - Otherwise a tenant match (by emp._id OR emp.userId) maps to
 *     { invitedUserId: emp.userId || emp._id, ... }.
 *   - Ids resolving to neither are skipped (never throws).
 *   - De-duplicate by invitedUserId string (first resolution wins).
 *
 * No DB access: safe to unit-test without a live MongoDB.
 */
export const mergeResolvedInvites = (
    hostMatches: any[] = [],
    tenantMatches: any[] = [],
    requestedIds: any[] = [],
): Array<{ invitedUserId: any; invitedName: string; invitedEmail: any; status: "pending" }> => {
    const ids = (Array.isArray(requestedIds) ? requestedIds : []).map((x) => String(x || "")).filter(Boolean);

    const hostById = new Map<string, any>();
    for (const user of Array.isArray(hostMatches) ? hostMatches : []) {
        if (user?._id != null) hostById.set(String(user._id), user);
    }

    // Tenant employees can be requested by their own _id or by their userId (a HostUser ref).
    const tenantByKey = new Map<string, any>();
    for (const emp of Array.isArray(tenantMatches) ? tenantMatches : []) {
        if (emp?._id != null) tenantByKey.set(String(emp._id), emp);
        if (emp?.userId != null) tenantByKey.set(String(emp.userId), emp);
    }

    const entries: Array<{ invitedUserId: any; invitedName: string; invitedEmail: any; status: "pending" }> = [];
    const seen = new Set<string>();
    const pushEntry = (invitedUserId: any, invitedName: any, invitedEmail: any) => {
        const key = String(invitedUserId || "");
        if (!key || seen.has(key)) return;
        seen.add(key);
        entries.push({ invitedUserId, invitedName: invitedName || invitedEmail || "User", invitedEmail, status: "pending" });
    };

    for (const id of ids) {
        const host = hostById.get(id);
        if (host) {
            pushEntry(host._id, host.name, host.email);
            continue;
        }
        const emp = tenantByKey.get(id);
        if (emp) {
            pushEntry(emp.userId || emp._id, emp.name, emp.email);
        }
        // Unresolved id: skipped (no throw).
    }

    return entries;
};

/**
 * Resolve invitee ids across HostUser and TenantEmployee into invite entries.
 *   1. Normalize input to an array of id strings; empty -> [].
 *   2. Filter to valid Mongo ObjectIds (guards $in against cast errors).
 *   3. Query HostUser by _id; for the unmatched rest, query Active TenantEmployee
 *      by userId OR _id.
 *   4. Merge/dedup/skip via the pure `mergeResolvedInvites` helper.
 */
export const resolveInvites = async (
    inviteeUserIds: any,
): Promise<Array<{ invitedUserId: any; invitedName: string; invitedEmail: any; status: "pending" }>> => {
    const rawIds = Array.isArray(inviteeUserIds)
        ? inviteeUserIds
        : inviteeUserIds != null
            ? [inviteeUserIds]
            : [];
    const ids = rawIds.map((x: any) => String(x || "")).filter(Boolean);
    if (ids.length === 0) return [];

    // Guard against invalid ObjectId strings to avoid cast errors in $in.
    const validIds = ids.filter((id) => getValidObjectId(id));
    if (validIds.length === 0) return [];

    const hostMatches = await HostUser.find({ _id: { $in: validIds } }).lean().exec();
    const matchedHostIds = new Set(hostMatches.map((user: any) => String(user._id)));
    const rest = validIds.filter((id) => !matchedHostIds.has(id));

    let tenantMatches: any[] = [];
    if (rest.length > 0) {
        tenantMatches = await TenantEmployee.find({
            status: "Active",
            $or: [{ userId: { $in: rest } }, { _id: { $in: rest } }],
        }).lean().exec();
    }

    return mergeResolvedInvites(hostMatches, tenantMatches, validIds);
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
        const { purpose, attendees, inviteeUserIds = [] } = req.body;
        const { roomIdCandidate, roomNameCandidate, range } = normalizeCreateBookingInput(req.body);
        if (!workspaceId || !req.user) return res.status(401).json({ message: "An active workspace is required" });
        if ((!roomIdCandidate && !roomNameCandidate) || !purpose?.trim() || !range) return res.status(400).json({ message: "Room, valid start/end times, and purpose are required" });

        const room = await Resource.findOne(
            roomIdCandidate
                ? { _id: roomIdCandidate, workspaceId, isActive: true, status: "Active" }
                : { workspaceId, name: roomNameCandidate, isActive: true, status: "Active" }
        ).lean().exec();
        if (!room) return res.status(404).json({ message: "Meeting room not found or inactive" });
        const roomId = String(room._id);
        const attendeeCount = Math.max(1, Number(attendees || inviteeUserIds.length + 1));
        if (attendeeCount > Number(room.capacity || 0)) return res.status(400).json({ message: "Attendee count exceeds room capacity" });
        if (await findOverlap(roomId, range.start, range.end)) return res.status(409).json({ message: "Room is already booked for the selected time slot" });

        const [lastBooking, hostUser] = await Promise.all([
            MeetingRoomBooking.findOne({ workspaceId }).sort({ bookingNumber: -1 }).lean().exec(),
            HostUser.findById(req.user).lean().exec(),
        ]);
        const invites = await resolveInvites(inviteeUserIds);
        const bookingNumber = lastBooking ? Number(lastBooking.bookingNumber) + 1 : 1001;

        // Calculate credits for the booking
        const durationMinutes = (range.end.getTime() - range.start.getTime()) / 60000;
        const ratePerHour = Number(room.credits || 0);
        const bookingCredits = ratePerHour > 0 ? Number(((durationMinutes / 60) * ratePerHour).toFixed(2)) : 0;

        // Resolve tenant company for scope matching + credit deduction.
        // Prefer the explicitly supplied company (tenantCompanyId / sourceReference)
        // over the logged-in actor's identity so on-behalf bookings link correctly.
        let tenantBookingCompanyId = null;
        let tenantBookingCompanyName = null;
        if ((req.body.bookingType || "Internal") === "Tenant") {
            const resolved = await resolveTenantCompany(req.body, hostUser);
            if (!resolved) return res.status(400).json({ message: "A tenant company is required for tenant bookings" });
            tenantBookingCompanyId = resolved.tenantBookingCompanyId;
            tenantBookingCompanyName = resolved.tenantBookingCompanyName;
        }

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
            bookedByName: resolveBookedByName(req.body, hostUser),
            bookedByEmail: hostUser?.email || req.body.bookedByEmail || "",
            bookedByTenantCompanyId: tenantBookingCompanyId,
            bookedByTenantCompanyName: tenantBookingCompanyName,
            purpose: purpose.trim(),
            attendees: attendeeCount,
            bookingCredits,
            bookingType: req.body.bookingType || "Internal",
            department: req.body.department,
            departmentId: req.body.departmentId && mongoose.Types.ObjectId.isValid(req.body.departmentId) ? new mongoose.Types.ObjectId(String(req.body.departmentId)) : null,
            invites,
            status: "confirmed",
        });

        // Deduct credits for tenant bookings
        if (tenantBookingCompanyId && bookingCredits > 0) {
            try {
                const tenantCompany = await TenantCompany.findById(tenantBookingCompanyId).exec();
                if (tenantCompany) {
                    const creditsAllocated = Number(tenantCompany.creditsAllocated || 0);
                    const creditsUsed = Number(tenantCompany.creditsUsed || 0);
                    const creditsRemaining = Math.max(0, creditsAllocated - creditsUsed);
                    const newCreditsUsed = creditsUsed + bookingCredits;

                    if (creditsRemaining >= bookingCredits) {
                        tenantCompany.creditsUsed = newCreditsUsed;
                        await tenantCompany.save();

                        const startParts = dateTimeParts(range.start);
                        const endParts = dateTimeParts(range.end);
                        await TenantCreditLedger.create({
                            tenantCompanyId: tenantCompany._id,
                            workspaceId,
                            id: `CRD-${Date.now()}-${bookingNumber}`,
                            date: range.start,
                            type: "Booking",
                            resource: "Meeting Room",
                            bookedBy: hostUser.name || hostUser.email || "",
                            bookingCode: booking.bookingCode,
                            roomName: room.name,
                            location: `${room.floor || ""} ${room.wing || ""}`.trim(),
                            wing: room.wing || "",
                            startTime: startParts.time,
                            endTime: endParts.time,
                            status: "confirmed",
                            remainingCredits: Math.max(0, creditsAllocated - newCreditsUsed),
                            used: bookingCredits,
                        });
                    }
                }
            } catch (ledgerErr) {
                console.error("Credit deduction failed for tenant booking:", ledgerErr);
            }
        }

        return res.status(201).json({ message: "Meeting room booking created successfully", data: { booking } });
    } catch (error: any) { next(error); }
};

export const getBookings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const workspaceId = workspaceIdFor(req);
        if (!workspaceId || workspaceId !== req.params.workspaceId) return res.status(403).json({ message: "Workspace access denied" });
        const [bookings, rooms] = await Promise.all([
            MeetingRoomBooking.find({ workspaceId }).populate("roomId", "name type capacity floor wing").populate("ownerId", "name email").sort({ start: -1 }).lean().exec(),
            Resource.find({
                workspaceId,
                isActive: true,
                status: "Active",
                // ...MEETING_ROOM_RESOURCE_FILTER,
            }).sort({ sortOrder: 1, name: 1 }).lean().exec(),
        ]);
        const transformedBookings = bookings.map((booking: any) => transformBooking(booking, req.user));
        const receivedInvites = transformedBookings.flatMap((booking: any) => (booking.invites || [])
            .filter((invite: any) => String(invite.invitedUserId || "") === String(req.user || ""))
            .map((invite: any) => ({ ...invite, bookingId: booking.recordId, roomName: booking.roomName, bookedByName: booking.bookedByName, date: booking.date, startTime: booking.startTime, endTime: booking.endTime })));
        const roomDetails = rooms.map((room: any) => ({ ...room, activationReady: room.isActive && room.status === "Active" }));
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
        const workspaceId = workspaceIdFor(req);
        const booking: any = await MeetingRoomBooking.findOne({ _id: id, workspaceId });
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        const range = parseDateRange(req.body.start || booking.start, req.body.end || booking.end);
        if (!range) return res.status(400).json({ message: "Valid start and end times are required" });
        if (await findOverlap(booking.roomId, range.start, range.end, id)) return res.status(409).json({ message: "Room is already booked for the selected time slot" });

        // Pre-check credit availability before modifying booking
        const bookingType = String(booking.bookingType || "").toLowerCase();
        let newBookingCredits = Number(booking.bookingCredits || 0);
        if (bookingType === "tenant" && req.user) {
            const oldCredits = Number(booking.bookingCredits || 0);
            const durationMinutes = (range.end.getTime() - range.start.getTime()) / 60000;
            const room = await Resource.findById(booking.roomId).lean().exec();
            const ratePerHour = Number(room?.credits || 0);
            newBookingCredits = ratePerHour > 0 ? Number(((durationMinutes / 60) * ratePerHour).toFixed(2)) : 0;
            const diff = Number((newBookingCredits - oldCredits).toFixed(2));

            if (diff > 0) {
                const tenantCompanyForCheck = await getBookingTenantCompany(booking, req.user);
                if (tenantCompanyForCheck) {
                    const creditsAllocated = Number(tenantCompanyForCheck.creditsAllocated || 0);
                    const creditsUsed = Number(tenantCompanyForCheck.creditsUsed || 0);
                    const creditsRemaining = Math.max(0, creditsAllocated - creditsUsed);
                    if (creditsRemaining < diff) {
                        return res.status(400).json({ message: `Not enough credits. Need ${diff.toFixed(2)} additional CR, have ${creditsRemaining.toFixed(2)} CR remaining.` });
                    }
                }
            }
        }

        // Apply schedule changes
        booking.start = range.start;
        booking.end = range.end;
        if (req.body.scheduleChangeType) booking.scheduleChangeType = req.body.scheduleChangeType;
        if (req.body.extensionAmount !== undefined) booking.extensionAmount = req.body.extensionAmount;
        if (req.body.totalAmount !== undefined) booking.totalAmount = req.body.totalAmount;

        // Merge new invitees if provided
        const inviteeUserIds = Array.isArray(req.body.inviteeUserIds) ? req.body.inviteeUserIds : [];
        if (inviteeUserIds.length > 0) {
            // Check room capacity before adding new invitees
            const room = await Resource.findById(booking.roomId).lean().exec();
            const roomCapacity = Number(room?.capacity || 0);
            if (roomCapacity > 0) {
                const existingCount = (booking.invites || []).filter(
                    (i: any) => i.status !== "rejected" && i.status !== "declined"
                ).length;
                const existingInvitedIds = new Set((booking.invites || []).map((i: any) => String(i.invitedUserId || "")));
                const newUniqueCount = inviteeUserIds.filter((uid: string) => !existingInvitedIds.has(uid)).length;
                if (existingCount + newUniqueCount + 1 > roomCapacity) {
                    return res.status(400).json({ message: `Room capacity reached. Maximum ${roomCapacity - 1} invitee(s) allowed.` });
                }
            }
            const existingInvitedIds = new Set((booking.invites || []).map((i: any) => String(i.invitedUserId || "")));
            const newIds = inviteeUserIds.filter((uid: string) => !existingInvitedIds.has(String(uid)));
            const resolvedNewInvites = await resolveInvites(newIds);
            for (const entry of resolvedNewInvites) {
                if (existingInvitedIds.has(String(entry.invitedUserId || ""))) continue;
                booking.invites.push(entry);
                existingInvitedIds.add(String(entry.invitedUserId || ""));
            }
        }

        // Apply credit adjustment after booking changes
        if (bookingType === "tenant" && req.user) {
            try {
                const oldCredits = Number(booking.bookingCredits || 0);
                const diff = Number((newBookingCredits - oldCredits).toFixed(2));

                if (diff !== 0) {
                    const tenantCompany = await getBookingTenantCompany(booking, req.user);
                    if (tenantCompany) {
                        const hostUser = await HostUser.findById(req.user).lean().exec();
                        const creditsAllocated = Number(tenantCompany.creditsAllocated || 0);
                        const creditsUsed = Number(tenantCompany.creditsUsed || 0);
                        const newCreditsUsed = Math.max(0, creditsUsed + diff);
                        tenantCompany.creditsUsed = newCreditsUsed;
                        await tenantCompany.save();
                        booking.bookingCredits = newBookingCredits;

                        await TenantCreditLedger.create({
                            tenantCompanyId: tenantCompany._id,
                            workspaceId,
                            id: `CRD-ADJ-${Date.now()}-${booking.bookingNumber || "0000"}`,
                            date: new Date(),
                            type: diff > 0 ? "Booking" : "Refund",
                            resource: "Meeting Room",
                            bookedBy: booking.bookedByName || hostUser?.name || hostUser?.email || "",
                            bookingCode: booking.bookingCode || "",
                            roomName: booking.roomName || "",
                            location: "",
                            status: diff > 0 ? "confirmed" : "refunded",
                            remainingCredits: Math.max(0, creditsAllocated - newCreditsUsed),
                            used: Math.abs(diff),
                        });
                    }
                }
            } catch (creditErr) {
                console.error("Credit recalculation failed for updated tenant booking:", creditErr);
            }
        }

        await booking.save();
        return res.status(200).json({ message: "Booking updated successfully", data: { booking } });
    } catch (error: any) { next(error); }
};

export const cancelBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = getValidObjectId(req.params.id);
        if (!id) return res.status(400).json({ message: "Invalid booking ID" });
        const workspaceId = workspaceIdFor(req);
        const booking = await MeetingRoomBooking.findOne({ _id: id, workspaceId }).exec();
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        booking.status = "cancelled";
        booking.cancelReason = req.body.cancelReason || "Cancelled by user";
        await booking.save();

        // Refund credits for tenant bookings
        const bookingType = String(booking.bookingType || "").toLowerCase();
        const bookingCredits = Number(booking.bookingCredits || 0);
        if (bookingType === "tenant" && bookingCredits > 0 && req.user) {
            try {
                const tenantCompany = await getBookingTenantCompany(booking, req.user);
                if (tenantCompany) {
                    const hostUser = await HostUser.findById(req.user).lean().exec();
                    const creditsUsed = Number(tenantCompany.creditsUsed || 0);
                    tenantCompany.creditsUsed = Math.max(0, creditsUsed - bookingCredits);
                    await tenantCompany.save();

                    const creditsAllocated = Number(tenantCompany.creditsAllocated || 0);
                    const newCreditsUsed = Number(tenantCompany.creditsUsed || 0);
                    await TenantCreditLedger.create({
                        tenantCompanyId: tenantCompany._id,
                        workspaceId,
                        id: `CRD-REF-${Date.now()}-${booking.bookingNumber || "0000"}`,
                        date: new Date(),
                        type: "Refund",
                        resource: "Meeting Room",
                        bookedBy: booking.bookedByName || hostUser?.name || hostUser?.email || "",
                        bookingCode: booking.bookingCode || "",
                        roomName: booking.roomName || "",
                        location: "",
                        status: "refunded",
                        remainingCredits: Math.max(0, creditsAllocated - newCreditsUsed),
                        used: bookingCredits,
                    });
                }
            } catch (refundErr) {
                console.error("Credit refund failed for cancelled tenant booking:", refundErr);
            }
        }

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

export const getBookingsByTenantCompany = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const workspaceId = workspaceIdFor(req);
        if (!workspaceId) return res.status(401).json({ message: "An active workspace is required" });
        const { tenantCompanyId } = req.params;
        if (!tenantCompanyId) return res.status(400).json({ message: "Tenant company ID is required" });
        const bookings = await MeetingRoomBooking.find({
            workspaceId,
            bookedByTenantCompanyId: tenantCompanyId,
        }).populate("roomId", "name type capacity floor wing").populate("ownerId", "name email").sort({ start: -1 }).lean().exec();
        const transformedBookings = bookings.map((booking: any) => transformBooking(booking, req.user));
        return res.status(200).json({ message: "Bookings fetched successfully", data: { bookings: transformedBookings } });
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