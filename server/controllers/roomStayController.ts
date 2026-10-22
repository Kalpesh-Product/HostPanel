import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { GuestRoom } from "../models/GuestRoom.js";
import { RoomStaySettings } from "../models/RoomStaySettings.js";
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
        const filter: Record<string, unknown> = { workspaceId };
        if (type === "Room" || type === "Dorm") filter.type = type;
        const rooms = await GuestRoom.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
        res.status(200).json({ success: true, message: "Rooms loaded successfully.", data: rooms });
    } catch (error) {
        next(error);
    }
}

export async function createGuestRoom(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const { name, type, capacity, pricePerNight, location, floor, wing, status, description, amenities } = req.body || {};
        if (!String(name || "").trim()) throw badRequest("Room name is required.");
        if (!["Room", "Dorm"].includes(String(type))) throw badRequest("Choose a valid room type.");
        const numericCapacity = Number(capacity || 1);
        if (!Number.isInteger(numericCapacity) || numericCapacity < 1) throw badRequest("Capacity must be at least 1.");
        const numericPrice = Number(pricePerNight);
        if (!Number.isFinite(numericPrice) || numericPrice < 0) throw badRequest("Enter a valid nightly rate.");
        if (status !== undefined && !["Active", "Under Maintenance", "Disabled"].includes(String(status))) {
            throw badRequest("Choose a valid status.");
        }

        const room = await GuestRoom.create({
            workspaceId,
            name: String(name).trim(),
            type,
            capacity: type === "Room" ? 1 : numericCapacity,
            pricePerNight: roundMoney(numericPrice),
            location: String(location || "").trim(),
            floor: String(floor || "").trim(),
            wing: String(wing || "").trim(),
            status: status || "Active",
            description: String(description || "").trim(),
            amenities: Array.isArray(amenities) ? amenities.map((entry: unknown) => String(entry).trim()).filter(Boolean) : [],
            createdBy: getOptionalUserObjectId(req),
        });

        res.status(201).json({ success: true, message: "Room added successfully.", data: room });
    } catch (error: any) {
        if (error?.code === 11000) return next(conflict("A room with this name already exists."));
        next(error);
    }
}

export async function updateGuestRoom(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const roomId = parseObjectId(req.params.roomId, "Invalid room.");
        const { name, capacity, pricePerNight, location, floor, wing, description, amenities, isActive, status } = req.body || {};

        const updates: Record<string, unknown> = {};
        if (name !== undefined) {
            if (!String(name).trim()) throw badRequest("Room name is required.");
            updates.name = String(name).trim();
        }
        if (capacity !== undefined) {
            const numericCapacity = Number(capacity);
            if (!Number.isInteger(numericCapacity) || numericCapacity < 1) throw badRequest("Capacity must be at least 1.");
            updates.capacity = numericCapacity;
        }
        if (pricePerNight !== undefined) {
            const numericPrice = Number(pricePerNight);
            if (!Number.isFinite(numericPrice) || numericPrice < 0) throw badRequest("Enter a valid nightly rate.");
            updates.pricePerNight = roundMoney(numericPrice);
        }
        if (location !== undefined) updates.location = String(location).trim();
        if (floor !== undefined) updates.floor = String(floor).trim();
        if (wing !== undefined) updates.wing = String(wing).trim();
        if (description !== undefined) updates.description = String(description).trim();
        if (amenities !== undefined) {
            updates.amenities = Array.isArray(amenities) ? amenities.map((entry: unknown) => String(entry).trim()).filter(Boolean) : [];
        }
        if (isActive !== undefined) updates.isActive = Boolean(isActive);
        if (status !== undefined) {
            if (!["Active", "Under Maintenance", "Disabled"].includes(String(status))) throw badRequest("Choose a valid status.");
            updates.status = status;
        }

        const room = await GuestRoom.findOneAndUpdate(
            { _id: roomId, workspaceId },
            { $set: updates },
            { new: true, runValidators: true }
        ).lean();
        if (!room) throw notFound("Room not found.");

        res.status(200).json({ success: true, message: "Room updated successfully.", data: room });
    } catch (error: any) {
        if (error?.code === 11000) return next(conflict("A room with this name already exists."));
        next(error);
    }
}

export async function deleteGuestRoom(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const roomId = parseObjectId(req.params.roomId, "Invalid room.");

        const hasOpenBooking = await RoomStayBooking.exists({
            workspaceId,
            roomId,
            status: { $in: ROOM_STAY_OPEN_STATUSES },
        });
        if (hasOpenBooking) throw conflict("This room has active bookings. Resolve them before removing the room.");

        const deleted = await GuestRoom.findOneAndDelete({ _id: roomId, workspaceId }).lean();
        if (!deleted) throw notFound("Room not found.");

        res.status(200).json({ success: true, message: "Room removed successfully.", data: { _id: roomId } });
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

        const rooms = await GuestRoom.find({ workspaceId, type, isActive: true, status: "Active" })
            .sort({ sortOrder: 1, name: 1 })
            .lean();

        const bookings = await RoomStayBooking.find({
            workspaceId,
            roomId: { $in: rooms.map((room) => room._id) },
            status: { $in: ROOM_STAY_OPEN_STATUSES },
            checkIn: { $lt: checkOut },
            checkOut: { $gt: checkIn },
        })
            .select("roomId bedNumber checkOut")
            .lean();

        const takenByRoom = new Map<string, number[]>();
        const nextFreeByRoom = new Map<string, Date>();
        for (const booking of bookings) {
            const key = String(booking.roomId);
            const list = takenByRoom.get(key) || [];
            if (booking.bedNumber !== null && booking.bedNumber !== undefined) list.push(booking.bedNumber);
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

        const room = await GuestRoom.findOne({ _id: roomId, workspaceId }).lean();
        if (!room) throw notFound("Room not found.");
        if (!room.isActive || room.status !== "Active") throw conflict("This room is not available for booking.");

        let bedNumber: number | null = null;
        if (room.type === "Dorm") {
            const taken = await RoomStayBooking.find({
                workspaceId,
                roomId,
                status: { $in: ROOM_STAY_OPEN_STATUSES },
                checkIn: { $lt: checkOut },
                checkOut: { $gt: checkIn },
            })
                .select("bedNumber")
                .lean();
            const takenSet = new Set(taken.map((entry) => entry.bedNumber));
            for (let bed = 1; bed <= room.capacity; bed += 1) {
                if (!takenSet.has(bed)) {
                    bedNumber = bed;
                    break;
                }
            }
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
        const latest = await RoomStayBooking.findOne({ workspaceId }).sort({ bookingNumber: -1 }).select("bookingNumber").lean();

        const booking = await RoomStayBooking.create({
            workspaceId,
            bookingNumber: (latest?.bookingNumber || 0) + 1,
            roomId,
            roomType: room.type,
            bedNumber,
            guestName: String(guestName).trim(),
            guestPhone: String(guestPhone || "").trim(),
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

        const overlap = await RoomStayBooking.exists({
            _id: { $ne: booking._id },
            workspaceId,
            roomId: booking.roomId,
            bedNumber: booking.bedNumber,
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

        const rooms = await GuestRoom.find({ workspaceId, type, isActive: true, status: "Active" }).select("capacity").lean();
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
