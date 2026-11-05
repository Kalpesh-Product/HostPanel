import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import { Resource } from "../models/Resource.js";
import { RoomStaySettings } from "../models/RoomStaySettings.js";
import { RoomStayNightAllocation } from "../models/RoomStayNightAllocation.js";
import {
    ROOM_STAY_OPEN_STATUSES,
    ROOM_STAY_STATUSES,
    RoomStayBooking,
    type RoomStayStatus,
} from "../models/RoomStayBooking.js";

interface AuthenticatedRequest extends Request {
    user?: string;
    workspaceMembership?: {
        workspace: string;
        role: string;
        isPrimary: boolean;
    };
}

const badRequest = (message: string) => {
    const error: any = new Error(message);
    error.statusCode = 400;
    return error;
};

const notFound = (message: string) => {
    const error: any = new Error(message);
    error.statusCode = 404;
    return error;
};

const conflict = (message: string) => {
    const error: any = new Error(message);
    error.statusCode = 409;
    return error;
};

export const occupiedDormBeds = (bookings: any[] = []) => {
    const occupied = new Set<number>();
    for (const booking of bookings) {
        const numbers = Array.isArray(booking?.bedNumbers) && booking.bedNumbers.length
            ? booking.bedNumbers
            : [booking?.bedNumber];
        for (const value of numbers) {
            const bed = Number(value);
            if (Number.isInteger(bed) && bed > 0) occupied.add(bed);
        }
    }
    return occupied;
};

export const allocateDormBeds = (capacity: number, bookings: any[] = [], requested = 1) => {
    const occupied = occupiedDormBeds(bookings);
    const available: number[] = [];
    for (let bed = 1; bed <= Math.max(0, Number(capacity) || 0); bed += 1) {
        if (!occupied.has(bed)) available.push(bed);
        if (available.length === requested) break;
    }
    return available;
};

const isDuplicateBookingCodeError = (error: any) =>
    Number(error?.code) === 11000 && Boolean(error?.keyPattern?.bookingCode || error?.keyValue?.bookingCode);

// Global-unique bookingCode + per-workspace bookingNumber, with retry on a
// collision — mirrors meetingRoomBookingController.ts's
// createBookingWithUniqueCode so RoomStayBooking (co-living/hostel) gets the
// same "RS-xxxx" guarantee MeetingRoomBooking gets for "MRB-xxxx".
export async function createRoomStayWithUniqueCode(payload: Record<string, any>) {
    const maxAttempts = 5;
    // "HS-" for hostel dorm beds, "CL-" for co-living rooms — distinct from
    // each other (and from meeting rooms' "MRB-") so a bare code is
    // self-identifying wherever it shows up (invoices, payment records,
    // emails), not ambiguous. Both still draw from the same global
    // bookingNumber counter, so uniqueness is unaffected.
    const codePrefix = payload.roomType === "Dorm" ? "HS" : "CL";

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const lastBooking = await RoomStayBooking.findOne({})
            .sort({ bookingNumber: -1 })
            .select("bookingNumber")
            .lean()
            .exec();
        const lastBookingNumber = Number(lastBooking?.bookingNumber);
        const bookingNumber = Number.isFinite(lastBookingNumber)
            ? Math.max(1001, lastBookingNumber + 1)
            : 1001;

        try {
            return await RoomStayBooking.create({
                ...payload,
                bookingNumber,
                bookingCode: `${codePrefix}-${bookingNumber}`,
            });
        } catch (error: any) {
            if (!isDuplicateBookingCodeError(error) || attempt === maxAttempts - 1) {
                throw error;
            }
        }
    }

    throw new Error("Unable to allocate a unique room-stay booking code");
}

const stayNightKeys = (checkIn: Date, checkOut: Date) => {
    const keys: string[] = [];
    const cursor = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
    const end = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
    while (cursor < end) {
        keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`);
        cursor.setDate(cursor.getDate() + 1);
    }
    return keys;
};

// A short-lived unique allocation closes the check-then-create race: two
// requests cannot claim the same room/bed night even if they arrive together.
export async function createRoomStayAtomically(payload: Record<string, any>) {
    const holdId = String(payload.holdId || new mongoose.Types.ObjectId());
    const bedNumbers = payload.roomType === "Dorm"
        ? (Array.isArray(payload.bedNumbers) && payload.bedNumbers.length ? payload.bedNumbers : [payload.bedNumber])
        : [0];
    const nightKeys = stayNightKeys(new Date(payload.checkIn), new Date(payload.checkOut));
    try {
        if (payload.holdId) {
            const expected = bedNumbers.length * nightKeys.length;
            const held = await RoomStayNightAllocation.countDocuments({
                holdId,
                roomId: payload.roomId,
                expiresAt: { $gt: new Date() },
            });
            if (held !== expected) throw conflict("The payment hold expired. Check availability before confirming this stay.");
        } else {
            await RoomStayNightAllocation.insertMany(
                bedNumbers.flatMap((bedNumber) => nightKeys.map((dateKey) => ({
                    holdId,
                    roomId: payload.roomId,
                    bedNumber,
                    dateKey,
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
                }))),
                { ordered: true },
            );
        }
        const { holdId: _holdId, ...bookingPayload } = payload;
        return await createRoomStayWithUniqueCode(bookingPayload);
    } catch (error: any) {
        if (Number(error?.code) === 11000) throw conflict("That room or bed was just reserved by another booking. Refresh availability and try again.");
        throw error;
    } finally {
        await RoomStayNightAllocation.deleteMany({ holdId }).catch(() => undefined);
    }
}

export async function createRoomStayPaymentHold({
    leadId,
    room,
    checkIn,
    checkOut,
    requestedBeds = 1,
    expiresAt,
}: {
    leadId: any;
    room: any;
    checkIn: Date;
    checkOut: Date;
    requestedBeds?: number;
    expiresAt: Date;
}) {
    const now = new Date();
    const existing: any[] = await RoomStayNightAllocation.find({ leadId, expiresAt: { $gt: now } }).lean();
    if (existing.length) {
        return {
            holdId: existing[0].holdId,
            bedNumbers: [...new Set(existing.map((entry) => Number(entry.bedNumber)))].filter((bed) => bed > 0),
            expiresAt: existing[0].expiresAt,
        };
    }

    await RoomStayNightAllocation.deleteMany({ leadId });
    const nightKeys = stayNightKeys(checkIn, checkOut);
    if (!nightKeys.length) throw badRequest("Choose a valid check-in and check-out date.");

    const bookings: any[] = await RoomStayBooking.find({
        roomId: room._id,
        status: { $in: ROOM_STAY_OPEN_STATUSES },
        checkIn: { $lt: checkOut },
        checkOut: { $gt: checkIn },
    }).select("bedNumber bedNumbers").lean();
    const activeHolds: any[] = await RoomStayNightAllocation.find({
        roomId: room._id,
        dateKey: { $in: nightKeys },
        expiresAt: { $gt: now },
    }).select("bedNumber").lean();

    const bedNumbers = room.type === "Dorm"
        ? allocateDormBeds(room.capacity || 1, [
            ...bookings,
            ...activeHolds.map((entry) => ({ bedNumber: entry.bedNumber })),
        ], requestedBeds)
        : [];
    if (room.type === "Dorm" && bedNumbers.length !== requestedBeds) {
        throw conflict(`${room.name} does not have ${requestedBeds} beds available for that date range.`);
    }
    if (room.type !== "Dorm" && (bookings.length || activeHolds.some((entry) => Number(entry.bedNumber) === 0))) {
        throw conflict(`${room.name} is not available for that date range.`);
    }

    const holdId = new mongoose.Types.ObjectId().toString();
    const heldBeds = room.type === "Dorm" ? bedNumbers : [0];
    try {
        await RoomStayNightAllocation.insertMany(
            heldBeds.flatMap((bedNumber) => nightKeys.map((dateKey) => ({
                holdId,
                leadId,
                roomId: room._id,
                bedNumber,
                dateKey,
                expiresAt,
            }))),
            { ordered: true },
        );
    } catch (error: any) {
        await RoomStayNightAllocation.deleteMany({ holdId });
        if (Number(error?.code) === 11000) throw conflict("Those beds were just held by another guest. Refresh availability and try again.");
        throw error;
    }
    return { holdId, bedNumbers, expiresAt };
}

export const releaseRoomStayPaymentHold = (holdId: string) =>
    holdId ? RoomStayNightAllocation.deleteMany({ holdId }) : Promise.resolve();

const getWorkspaceObjectId = (req: AuthenticatedRequest) => {
    const id = req.workspaceMembership?.workspace;
    if (!id || !mongoose.isValidObjectId(id)) throw badRequest("Workspace ID is required");
    return new mongoose.Types.ObjectId(id);
};

const getOptionalUserObjectId = (req: AuthenticatedRequest) =>
    req.user && mongoose.isValidObjectId(req.user) ? new mongoose.Types.ObjectId(req.user) : null;

const parseObjectId = (value: unknown, message: string) => {
    if (!mongoose.isValidObjectId(String(value || ""))) throw badRequest(message);
    return new mongoose.Types.ObjectId(String(value));
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

// Rooms/Dorms live in the shared Resource collection (resourceCategory
// "room"/"dorm"), the same inventory used by Resource & Pricing for every
// other category — there is no separate GuestRoom collection any more.
const roomResourceCategory = (type: string) => (type === "Room" ? "room" : "dorm");

const parseDate = (value: unknown) => {
    const date = new Date(String(value || ""));
    return Number.isNaN(date.getTime()) ? null : date;
};

// Nights are counted from the plain dates only, so the standard check-in/check-out
// time of day (below) never skews the night count, regardless of which way round it is.
const nightsBetween = (checkInDateOnly: Date, checkOutDateOnly: Date) =>
    Math.round((checkOutDateOnly.getTime() - checkInDateOnly.getTime()) / (24 * 60 * 60 * 1000));

const combineDateAndTime = (dateOnly: string, time: string) => {
    const [hours, minutes] = String(time || "").split(":").map(Number);
    const date = new Date(`${dateOnly}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const isValidTime = (value: unknown) => TIME_PATTERN.test(String(value || ""));

// Rooms/dorms get their own standard check-in/check-out time, separate from Resource &
// Pricing's meeting-room booking hours (a hotel check-in is typically later in the day
// than checkout, which would break that field's start-before-end assumption).
export async function getWorkspaceCheckTimes(workspaceId: mongoose.Types.ObjectId) {
    const settings = await RoomStaySettings.findOne({ workspaceId }).lean();
    return {
        checkInTime: settings?.standardCheckInTime || "12:00",
        checkOutTime: settings?.standardCheckOutTime || "11:00",
    };
}

export async function getRoomStayCheckTimes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const times = await getWorkspaceCheckTimes(workspaceId);
        res.status(200).json({ success: true, message: "Check-in/out times loaded.", data: times });
    } catch (error) {
        next(error);
    }
}

export async function updateRoomStayCheckTimes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const { checkInTime, checkOutTime } = req.body || {};
        if (!isValidTime(checkInTime) || !isValidTime(checkOutTime)) {
            throw badRequest("Enter valid check-in and check-out times (HH:MM).");
        }
        const settings = await RoomStaySettings.findOneAndUpdate(
            { workspaceId },
            { $set: { standardCheckInTime: checkInTime, standardCheckOutTime: checkOutTime } },
            { new: true, upsert: true }
        );
        res.status(200).json({
            success: true,
            message: "Check-in/out times updated successfully.",
            data: { checkInTime: settings.standardCheckInTime, checkOutTime: settings.standardCheckOutTime },
        });
    } catch (error) {
        next(error);
    }
}

export async function listGuestRooms(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const type = String(req.query.type || "").trim();
        const filter: Record<string, unknown> = { workspaceId, resourceCategory: { $in: ["room", "dorm"] } };
        if (type === "Room" || type === "Dorm") filter.resourceCategory = roomResourceCategory(type);
        const rooms = await Resource.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
        res.status(200).json({ success: true, message: "Rooms loaded successfully.", data: rooms });
    } catch (error) {
        next(error);
    }
}

export async function getRoomAvailability(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const type = String(req.query.type || "").trim();
        const checkIn = parseDate(req.query.checkIn);
        const checkOut = parseDate(req.query.checkOut);
        if (!["Room", "Dorm"].includes(type)) throw badRequest("Choose a valid room type.");
        if (!checkIn || !checkOut || checkOut <= checkIn) throw badRequest("Enter a valid check-in/check-out range.");

        const rooms = await Resource.find({ workspaceId, resourceCategory: roomResourceCategory(type), isActive: true, status: "Active" })
            .sort({ sortOrder: 1, name: 1 })
            .lean();

        const bookings = await RoomStayBooking.find({
            workspaceId,
            roomId: { $in: rooms.map((room) => room._id) },
            status: { $in: ROOM_STAY_OPEN_STATUSES },
            checkIn: { $lt: checkOut },
            checkOut: { $gt: checkIn },
        })
            .select("roomId bedNumber bedNumbers checkOut")
            .lean();

        const takenByRoom = new Map<string, number[]>();
        const nextFreeByRoom = new Map<string, Date>();
        for (const booking of bookings) {
            const key = String(booking.roomId);
            const list = takenByRoom.get(key) || [];
            const occupied = booking.bedNumbers?.length ? booking.bedNumbers : [booking.bedNumber];
            const numberedBeds = occupied.filter((bed): bed is number => typeof bed === "number");
            if (numberedBeds.length) list.push(...numberedBeds);
            else list.push(0);
            takenByRoom.set(key, list);
            const current = nextFreeByRoom.get(key);
            if (!current || booking.checkOut < current) nextFreeByRoom.set(key, booking.checkOut);
        }

        const data = rooms.map((room) => {
            const taken = takenByRoom.get(String(room._id)) || [];
            const totalBeds = room.type === "Room" ? 1 : room.capacity;
            const availableBeds = room.type === "Room" ? (taken.length > 0 ? 0 : 1) : Math.max(0, room.capacity - taken.length);
            const nextAvailableAt = availableBeds > 0 ? null : nextFreeByRoom.get(String(room._id)) || null;
            return { ...room, totalBeds, availableBeds, nextAvailableAt };
        });

        data.sort((a, b) => {
            if (a.availableBeds > 0 !== b.availableBeds > 0) return a.availableBeds > 0 ? -1 : 1;
            if (a.nextAvailableAt && b.nextAvailableAt) return a.nextAvailableAt.getTime() - b.nextAvailableAt.getTime();
            return a.name.localeCompare(b.name);
        });

        res.status(200).json({
            success: true,
            message: "Availability loaded.",
            data: { checkIn, checkOut, rooms: data },
        });
    } catch (error) {
        next(error);
    }
}

export async function listRoomBookings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const scope = String(req.query.scope || "").trim();
        const roomType = String(req.query.roomType || "").trim();
        const from = req.query.from ? parseDate(req.query.from) : null;
        const to = req.query.to ? parseDate(req.query.to) : null;

        const filter: Record<string, unknown> = { workspaceId };
        if (roomType === "Room" || roomType === "Dorm") filter.roomType = roomType;
        if (scope === "open") filter.status = { $in: ROOM_STAY_OPEN_STATUSES };
        else if (scope === "history") filter.status = { $in: ["Checked-out", "Cancelled"] };

        const dateFilter: Record<string, Date> = {};
        if (from) dateFilter.$gte = from;
        if (to) dateFilter.$lte = to;
        if (Object.keys(dateFilter).length) filter.createdAt = dateFilter;

        const bookings = await RoomStayBooking.find(filter).sort({ bookingNumber: -1 }).limit(500).lean();
        res.status(200).json({ success: true, message: "Bookings loaded successfully.", data: bookings });
    } catch (error) {
        next(error);
    }
}

export async function createRoomBooking(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const {
            roomId: rawRoomId,
            guestName,
            guestPhone,
            checkIn: rawCheckIn,
            checkOut: rawCheckOut,
            notes,
            idProofType,
            idProofNumber,
            paymentMethod,
            amountPaid,
        } = req.body || {};
        const roomId = parseObjectId(rawRoomId, "Invalid room.");
        if (!String(guestName || "").trim()) throw badRequest("Guest name is required.");

        const checkInDateOnly = parseDate(rawCheckIn);
        const checkOutDateOnly = parseDate(rawCheckOut);
        if (!checkInDateOnly || !checkOutDateOnly || checkOutDateOnly <= checkInDateOnly) {
            throw badRequest("Enter a valid check-in/check-out range.");
        }
        const nights = nightsBetween(checkInDateOnly, checkOutDateOnly);
        if (nights < 1) throw badRequest("Stay must be at least 1 night.");

        const { checkInTime, checkOutTime } = await getWorkspaceCheckTimes(workspaceId);
        const checkIn = combineDateAndTime(String(rawCheckIn || ""), checkInTime) as Date;
        const checkOut = combineDateAndTime(String(rawCheckOut || ""), checkOutTime) as Date;

        const numericAmountPaid = Number(amountPaid);
        if (amountPaid !== undefined && (!Number.isFinite(numericAmountPaid) || numericAmountPaid < 0)) {
            throw badRequest("Enter a valid amount paid.");
        }

        const room = await Resource.findOne({ _id: roomId, workspaceId, resourceCategory: { $in: ["room", "dorm"] } }).lean();
        if (!room) throw notFound("Room not found.");
        if (!room.isActive || room.status !== "Active") throw conflict("This room is not available for booking.");

        let bedNumber: number | null = null;
        let bedNumbers: number[] = [];
        if (room.type === "Dorm") {
            const taken = await RoomStayBooking.find({
                workspaceId,
                roomId,
                status: { $in: ROOM_STAY_OPEN_STATUSES },
                checkIn: { $lt: checkOut },
                checkOut: { $gt: checkIn },
            })
                .select("bedNumber bedNumbers")
                .lean();
            bedNumbers = allocateDormBeds(room.capacity, taken, 1);
            bedNumber = bedNumbers[0] ?? null;
            if (bedNumber === null) throw conflict("No beds available in this dorm for the selected dates.");
        } else {
            const overlap = await RoomStayBooking.exists({
                workspaceId,
                roomId,
                bedNumber: null,
                status: { $in: ROOM_STAY_OPEN_STATUSES },
                checkIn: { $lt: checkOut },
                checkOut: { $gt: checkIn },
            });
            if (overlap) throw conflict("This room is already booked for the selected dates.");
        }

        const ratePerNight = roundMoney(Number(room.pricePerNight) || 0);
        const total = roundMoney(ratePerNight * nights);

        const booking = await createRoomStayAtomically({
            workspaceId,
            roomId,
            roomType: room.type,
            bedNumber,
            bedNumbers,
            guestName: String(guestName).trim(),
            guestEmail: "",
            guestPhone: String(guestPhone || "").trim(),
            attendees: 1,
            checkIn,
            checkOut,
            nights,
            ratePerNight,
            total,
            notes: String(notes || "").trim(),
            idProofType: String(idProofType || "").trim(),
            idProofNumber: String(idProofNumber || "").trim(),
            paymentMethod: String(paymentMethod || "").trim(),
            amountPaid: amountPaid !== undefined ? roundMoney(numericAmountPaid) : 0,
            createdBy: getOptionalUserObjectId(req),
        });

        res.status(201).json({ success: true, message: "Booking created successfully.", data: booking });
    } catch (error) {
        next(error);
    }
}

export async function sendRoomStayConfirmation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const bookingId = parseObjectId(req.params.bookingId, "Invalid booking.");
        const booking: any = await RoomStayBooking.findOne({ _id: bookingId, workspaceId })
            .populate("roomId", "name location floor wing")
            .lean();
        if (!booking) throw notFound("Booking not found.");
        const recipient = String(booking.guestEmail || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
            throw badRequest("No valid guest email is attached to this booking.");
        }
        const roomName = String(booking.roomId?.name || (booking.roomType === "Dorm" ? "Dorm" : "Room"));
        const checkIn = new Date(booking.checkIn).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const checkOut = new Date(booking.checkOut).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const bedLabel = booking.roomType === "Dorm" && booking.bedNumbers?.length
            ? `<p><strong>Beds:</strong> ${booking.bedNumbers.join(", ")}</p>`
            : "";
        const secret = String(process.env.BOOKING_SYNC_SECRET || "").trim();
        let viewUrl = "";
        if (secret) {
            const payload = Buffer.from(JSON.stringify({ bookingId: String(booking._id), email: recipient, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 })).toString("base64url");
            const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
            const base = String(process.env.NOMADS_APP_URL || "http://localhost:5173").replace(/\/+$/, "");
            viewUrl = `${base}/profile?tab=bookings&booking=${encodeURIComponent(`${payload}.${signature}`)}`;
        }
        const { sendMail } = await import("../config/mailer.js");
        await sendMail({
            to: recipient,
            subject: `${booking.roomType === "Dorm" ? "Hostel" : "Co-living"} Booking Confirmed — ${booking.bookingCode}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><h1>Booking Confirmed</h1><p>Hi <strong>${booking.guestName}</strong>, your ${booking.roomType === "Dorm" ? "hostel beds" : "co-living room"} are reserved.</p><div style="border:1px solid #dbe3ef;border-radius:12px;padding:18px"><p><strong>Booking ID:</strong> ${booking.bookingCode}</p><p><strong>${booking.roomType === "Dorm" ? "Dorm" : "Room"}:</strong> ${roomName}</p>${bedLabel}<p><strong>Stay:</strong> ${checkIn} – ${checkOut} (${booking.nights} night${booking.nights === 1 ? "" : "s"})</p><p><strong>Guests:</strong> ${booking.attendees}</p><p><strong>Paid:</strong> ${booking.amountPaid}</p></div>${viewUrl ? `<p style="margin-top:24px"><a href="${viewUrl}" style="background:#111;color:white;padding:12px 18px;border-radius:999px;text-decoration:none">View booking on WONO</a></p>` : ""}</div>`,
            text: `Booking confirmed. ID: ${booking.bookingCode}. ${roomName}, ${checkIn} to ${checkOut}.`,
        });
        return res.status(200).json({ success: true, message: "Confirmation email sent." });
    } catch (error) {
        next(error);
    }
}

export async function updateRoomBookingStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const bookingId = parseObjectId(req.params.bookingId, "Invalid booking.");
        const status = String(req.body?.status || "") as RoomStayStatus;
        const reason = String(req.body?.reason || "").trim();
        if (!ROOM_STAY_STATUSES.includes(status)) throw badRequest("Invalid status.");
        if (status === "Cancelled" && !reason) throw badRequest("A reason is required to cancel a booking.");

        const booking = await RoomStayBooking.findOne({ _id: bookingId, workspaceId });
        if (!booking) throw notFound("Booking not found.");
        if (status === "Cancelled" && booking.status === "Checked-out") throw conflict("A completed stay cannot be cancelled.");
        if (status === "Checked-in" && booking.status !== "Booked") throw conflict("Only a booked stay can be checked in.");
        if (status === "Checked-out" && booking.status !== "Checked-in") throw conflict("Guest must be checked in before checking out.");

        const now = new Date();
        let message = `Booking marked ${status}.`;

        if (status === "Checked-in") {
            if (now < booking.checkIn) {
                throw conflict(`Check-in isn't allowed before ${booking.checkIn.toLocaleString()}.`);
            }
            booking.actualCheckInAt = now;
        }

        if (status === "Checked-out") {
            booking.actualCheckOutAt = now;
            if (now > booking.checkOut) {
                booking.lateFeeAmount = roundMoney(Number(booking.ratePerNight) || 0);
                booking.total = roundMoney(Number(booking.total) + booking.lateFeeAmount);
                message = `Booking marked Checked-out. A late check-out fee of ${booking.lateFeeAmount} was added for checking out after ${booking.checkOut.toLocaleString()}.`;
            }
        }

        booking.status = status;
        if (status === "Cancelled") booking.cancelReason = reason;
        await booking.save();

        res.status(200).json({ success: true, message, data: booking });
    } catch (error) {
        next(error);
    }
}

export async function extendRoomBooking(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const bookingId = parseObjectId(req.params.bookingId, "Invalid booking.");
        const newCheckOutDateOnly = parseDate(req.body?.checkOut);
        if (!newCheckOutDateOnly) throw badRequest("Enter a valid new check-out date.");

        const booking = await RoomStayBooking.findOne({ _id: bookingId, workspaceId });
        if (!booking) throw notFound("Booking not found.");
        if (!ROOM_STAY_OPEN_STATUSES.includes(booking.status)) throw conflict("Only an open booking can be extended.");

        const currentCheckOutDateOnly = new Date(
            booking.checkOut.getFullYear(),
            booking.checkOut.getMonth(),
            booking.checkOut.getDate()
        );
        if (newCheckOutDateOnly <= currentCheckOutDateOnly) throw badRequest("New check-out date must be after the current one.");

        const { checkOutTime } = await getWorkspaceCheckTimes(workspaceId);
        const newCheckOut = combineDateAndTime(String(req.body.checkOut), checkOutTime) as Date;

        const allocatedBeds = booking.bedNumbers?.length ? booking.bedNumbers : [booking.bedNumber];
        const overlap = await RoomStayBooking.exists({
            _id: { $ne: booking._id },
            workspaceId,
            roomId: booking.roomId,
            ...(booking.roomType === "Dorm"
                ? { $or: [{ bedNumbers: { $in: allocatedBeds } }, { bedNumber: { $in: allocatedBeds } }] }
                : { bedNumber: null }),
            status: { $in: ROOM_STAY_OPEN_STATUSES },
            checkIn: { $lt: newCheckOut },
            checkOut: { $gt: booking.checkOut },
        });
        if (overlap) throw conflict("This bed/room is already booked during the extended period.");

        const checkInDateOnly = new Date(booking.checkIn.getFullYear(), booking.checkIn.getMonth(), booking.checkIn.getDate());
        const nights = nightsBetween(checkInDateOnly, newCheckOutDateOnly);

        booking.checkOut = newCheckOut;
        booking.nights = nights;
        booking.total = roundMoney(booking.ratePerNight * nights + (booking.lateFeeAmount || 0));
        await booking.save();

        res.status(200).json({ success: true, message: "Stay extended successfully.", data: booking });
    } catch (error) {
        next(error);
    }
}

export async function getRoomStayAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const type = String(req.query.type || "").trim();
        if (!["Room", "Dorm"].includes(type)) throw badRequest("Choose a valid room type.");
        const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
        const now = new Date();
        const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        const rooms = await Resource.find({ workspaceId, resourceCategory: roomResourceCategory(type), isActive: true, status: "Active" }).select("capacity").lean();
        const bedsPerDay = type === "Room" ? rooms.length : rooms.reduce((sum, room) => sum + (room.capacity || 0), 0);
        const availableRoomNights = bedsPerDay * days;

        const openBookings = await RoomStayBooking.find({
            workspaceId,
            roomType: type,
            status: { $ne: "Cancelled" },
            checkIn: { $lt: now },
            checkOut: { $gt: since },
        })
            .select("checkIn checkOut")
            .lean();

        let occupiedRoomNights = 0;
        for (const booking of openBookings) {
            const start = Math.max(booking.checkIn.getTime(), since.getTime());
            const end = Math.min(booking.checkOut.getTime(), now.getTime());
            if (end > start) occupiedRoomNights += (end - start) / (24 * 60 * 60 * 1000);
        }
        const occupancyRate = availableRoomNights > 0 ? Math.round((occupiedRoomNights / availableRoomNights) * 1000) / 10 : 0;

        const checkedOutBookings = await RoomStayBooking.find({
            workspaceId,
            roomType: type,
            status: "Checked-out",
            $or: [{ actualCheckOutAt: { $gte: since } }, { actualCheckOutAt: null, checkOut: { $gte: since } }],
        })
            .select("total nights actualCheckOutAt checkOut")
            .lean();

        const revenue = checkedOutBookings.reduce((sum, booking) => sum + (booking.total || 0), 0);
        const bookingsCount = checkedOutBookings.length;
        const avgNights = bookingsCount
            ? Math.round((checkedOutBookings.reduce((sum, booking) => sum + (booking.nights || 0), 0) / bookingsCount) * 10) / 10
            : 0;

        const dailyMap = new Map<string, { date: string; bookings: number; revenue: number }>();
        for (const booking of checkedOutBookings) {
            const checkoutAt = booking.actualCheckOutAt || booking.checkOut;
            const key = checkoutAt.toISOString().slice(0, 10);
            const entry = dailyMap.get(key) || { date: key, bookings: 0, revenue: 0 };
            entry.bookings += 1;
            entry.revenue = roundMoney(entry.revenue + (booking.total || 0));
            dailyMap.set(key, entry);
        }
        const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        res.status(200).json({
            success: true,
            message: "Analytics loaded.",
            data: {
                days,
                summary: {
                    revenue: roundMoney(revenue),
                    bookings: bookingsCount,
                    occupancyRate,
                    avgNights,
                },
                daily,
            },
        });
    } catch (error) {
        next(error);
    }
}
