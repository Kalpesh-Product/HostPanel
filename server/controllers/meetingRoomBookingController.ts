// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { MeetingRoomBooking } from "../models/MeetingRoomBooking.js";
import { Resource } from "../models/Resource.js";
import HostUser from "../models/HostUser.js";
import TenantEmployee from "../models/TenantEmployee.js";
import { TenantCompany } from "../models/TenantCompany.js";
import TenantCreditLedger from "../models/TenantCreditLedger.js";
import { Client } from "../models/Client.js";
import Workspace from "../models/Workspace.js";
import { uploadFileToS3 } from "../config/s3config.js";
import { createNotification } from "../utils/notify.js";

interface AuthenticatedRequest extends Request {
    user?: string;
    workspaceMembership?: { workspace: string; role: string; isPrimary: boolean };
}

const getValidObjectId = (id: any): string | null =>
    typeof id === "string" && mongoose.Types.ObjectId.isValid(id) ? id : null;

const workspaceIdFor = (req: AuthenticatedRequest) => req.workspaceMembership?.workspace || "";
const ACTIVE_BOOKING_STATUSES = { $nin: ["cancelled", "completed"] };
const BOOKING_DAY_START_MINUTES = 9 * 60;
const BOOKING_DAY_END_MINUTES = 22 * 60;
// const MEETING_ROOM_RESOURCE_FILTER = {
//     $or: [
//         { resourceCategory: { $in: ["meeting_room", "conference_room", "desk", "cabin", "virtual_office"] } },
//         { type: { $in: ["Meeting Room", "Conference Room", "Desk", "Cabin", "Virtual Office"] } },
//     ],
// };

function toMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
}

async function getWorkspaceBusinessHours(workspaceId: string): Promise<{ startMinutes: number; endMinutes: number }> {
    try {
        const workspace = await Workspace.findById(workspaceId).select("preferences.businessHours").lean();
        const bh = workspace?.preferences?.businessHours;
        if (bh?.start && bh?.end) {
            return { startMinutes: toMinutes(bh.start), endMinutes: toMinutes(bh.end) };
        }
    } catch {
        // fall through to defaults
    }
    return { startMinutes: BOOKING_DAY_START_MINUTES, endMinutes: BOOKING_DAY_END_MINUTES };
}

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

// ── Email formatting helpers ────────────────────────────────────────────────
// Emails use a friendly date + 12-hour IST time (the app's 24h/ISO internal
// format stays untouched). Poppins mirrors the app's "pmedium" font, with a
// safe fallback since email clients can't load the local Poppins TTF.
const EMAIL_FONT = "'Poppins','Segoe UI',Arial,sans-serif";

const emailDateParts = (date: Date) => {
    const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
    const time = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(date));
    const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
    return { day, time, dayKey };
};

// Same-day: "20 Jul 2026, 10:00 AM – 12:00 PM"
// Multi-day: "20 Jul 2026, 10:00 AM  →  22 Jul 2026, 12:00 PM"
const emailSlotLabel = (start?: Date | null, end?: Date | null) => {
    if (!start || !end) return "—";
    const s = emailDateParts(start);
    const e = emailDateParts(end);
    return s.dayKey === e.dayKey
        ? `${s.day}, ${s.time} &ndash; ${e.time}`
        : `${s.day}, ${s.time} &nbsp;&rarr;&nbsp; ${e.day}, ${e.time}`;
};

const emailCurrency = (n: number) => `&#8377;${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const computeDiscountAmount = (booking: any) => {
    const base = Number(booking.baseAmount || 0);
    const discountValue = Number(booking.discountValue || 0);
    if (discountValue <= 0 || base <= 0) return 0;
    return String(booking.discountType) === "percent"
        ? Math.round(base * (Math.min(discountValue, 100) / 100) * 100) / 100
        : Math.min(discountValue, base);
};

const isBookingPaid = (booking: any) => {
    const status = String(booking.paymentStatus || "").trim();
    return /paid|collected|not.?required|complete/i.test(status) || Number(booking.totalAmount || 0) <= 0;
};

// A pricing breakdown table (base, discount, GST, total) plus the payment
// status. Returns "" only when there is genuinely nothing to charge.
const emailPricingBlock = (booking: any) => {
    const base = Number(booking.baseAmount || 0);
    const gst = Number(booking.gstAmount || 0);
    const total = Number(booking.totalAmount || 0);
    if (total <= 0 && base <= 0) return "";
    const discountAmount = computeDiscountAmount(booking);
    const discountLabel = String(booking.discountType) === "percent" ? `Discount (${Number(booking.discountValue || 0)}%)` : "Discount";
    const paid = isBookingPaid(booking);
    const paymentMode = String(booking.paymentMode || "").trim();

    const row = (label: string, value: string, opts: { color?: string; strong?: boolean; bg?: string } = {}) =>
        `<tr style="border-top:1px solid #f1f5f9;background:${opts.bg || "#ffffff"};">
          <td style="padding:10px 16px;font-size:13px;font-weight:500;color:#64748b;font-family:${EMAIL_FONT};">${label}</td>
          <td style="padding:10px 16px;font-size:13px;font-weight:${opts.strong ? 700 : 600};color:${opts.color || "#0f172a"};text-align:right;font-family:${EMAIL_FONT};">${value}</td>
        </tr>`;

    return `
      <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;font-family:${EMAIL_FONT};">Pricing Breakdown</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
        ${row("Base Amount", emailCurrency(base))}
        ${discountAmount > 0 ? row(discountLabel, `&minus; ${emailCurrency(discountAmount)}`, { color: "#059669", bg: "#f0fdf4" }) : ""}
        ${row("GST (18%)", emailCurrency(gst))}
        ${row("Total", emailCurrency(total), { color: "#2563eb", strong: true, bg: "#f8fafc" })}
        ${row("Payment Status", paid ? "PAID" : "UNPAID &mdash; DUE", { color: paid ? "#059669" : "#d97706", strong: true, bg: paid ? "#f0fdf4" : "#fffbeb" })}
        ${paymentMode ? row("Payment Mode", paymentMode) : ""}
      </table>`;
};

const transformBooking = (booking: any, currentUserId?: string) => {
    const room = booking.roomId && typeof booking.roomId === "object" ? booking.roomId : null;
    const owner = booking.ownerId && typeof booking.ownerId === "object" ? booking.ownerId : null;
    const start = booking.start ? dateTimeParts(booking.start) : { date: "", time: "" };
    const end = booking.end ? dateTimeParts(booking.end) : { date: "", time: "" };
    const ownerId = String(owner?._id || booking.ownerId || "");
    const bookedByUserId = String(booking.bookedByUserId || "");
    // bookedForName: stored at creation time for on-behalf bookings (owner != booker).
    // Falls back to deriving from populated owner when not stored (legacy bookings).
    const ownerName = owner?.name || "";
    const isOnBehalf = ownerId && bookedByUserId && ownerId !== bookedByUserId;
    const bookedForName = booking.bookedForName || (isOnBehalf ? ownerName : "");

    // Surface the pre-change schedule for extended/rescheduled bookings so the
    // UI can show "old slot -> new slot". originalStart/originalEnd are set
    // once at creation time and only differ from start/end after a change.
    const originalStartDate = booking.originalStart ? new Date(booking.originalStart) : null;
    const originalEndDate = booking.originalEnd ? new Date(booking.originalEnd) : null;
    const hasScheduleChanged = Boolean(
        originalStartDate && originalEndDate && booking.start && booking.end &&
        (originalStartDate.getTime() !== new Date(booking.start).getTime() ||
            originalEndDate.getTime() !== new Date(booking.end).getTime())
    );
    const previousStartParts = hasScheduleChanged && originalStartDate ? dateTimeParts(originalStartDate) : null;
    const previousEndParts = hasScheduleChanged && originalEndDate ? dateTimeParts(originalEndDate) : null;

    // externalClientId is populated on list fetches so the booking detail view
    // can show the client's contact details (which aren't stored on the
    // booking itself). Fall back to whatever was captured on the booking.
    const externalClient = booking.externalClientId && typeof booking.externalClientId === "object"
        ? booking.externalClientId
        : null;
    const externalClientRawId = String(externalClient?._id || booking.externalClientId || "");

    return {
        ...booking,
        recordId: String(booking._id || booking.id || ""),
        id: String(booking._id || booking.id || ""),
        date: start.date,
        // endDate differs from date for multi-day bookings — start/end only
        // ever exposed endTime before, silently hiding the day span.
        endDate: end.date,
        startTime: start.time,
        endTime: end.time,
        previousDate: previousStartParts?.date || "",
        previousEndDate: previousEndParts?.date || "",
        previousStartTime: previousStartParts?.time || "",
        previousEndTime: previousEndParts?.time || "",
        roomName: booking.roomName || room?.name || "",
        floor: room?.floor || "",
        wing: room?.wing || "",
        roomType: room?.type || "Meeting Room",
        roomCapacity: room?.capacity || 0,
        bookedByName: booking.bookedByName || ownerName || "",
        bookedForName,
        bookedByUserId,
        // The workspace member who performed the frontdesk action (creator of the
        // booking), always the populated owner — independent of who the booking
        // is for (client, on-behalf member, etc).
        hostName: ownerName || "",
        // Expose externalClientId as clientId so client-tab booking matching works
        clientId: externalClientRawId,
        // Client contact for the booking detail view. bookedByEmail/phone come
        // straight off the booking; company/name prefer the linked Client record.
        clientName: externalClient?.name || bookedForName || booking.bookedByName || "",
        clientEmail: externalClient?.email || booking.bookedByEmail || "",
        clientPhone: externalClient?.phone || booking.bookedByPhone || "",
        clientCompany: externalClient?.company || booking.clientCompany || "",
        clientCode: externalClient?.clientCode || "",
        bookedByPhone: booking.bookedByPhone || externalClient?.phone || "",
        isMe: Boolean(currentUserId && ownerId === String(currentUserId)),
        storedStatus: booking.status,
    };
};

const INDIA_TIME_OFFSET = "+05:30";

/**
 * Meeting-room forms submit an India-local wall time such as
 * `2026-07-16T13:00:00`. JavaScript otherwise interprets that value in the
 * server's own timezone (UTC on Vercel), shifting it by +5:30 when displayed
 * back in India. Attach the IST offset to timezone-less inputs while leaving
 * real ISO instants (`Z` / explicit offsets) and Date values untouched.
 */
export const parseMeetingRoomDateTime = (value: any): Date => {
    if (value instanceof Date) return new Date(value.getTime());
    if (typeof value !== "string") return new Date(value);

    const normalized = value.trim();
    const hasExplicitTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
    const isLocalDateTime = /^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(normalized);
    return new Date(isLocalDateTime && !hasExplicitTimeZone ? `${normalized}${INDIA_TIME_OFFSET}` : normalized);
};

const parseDateRange = (start: any, end: any, dayStartMinutes?: number, dayEndMinutes?: number) => {
    const parsedStart = parseMeetingRoomDateTime(start);
    const parsedEnd = parseMeetingRoomDateTime(end);
    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime()) || parsedEnd <= parsedStart) return null;
    const startParts = dateTimeParts(parsedStart);
    const endParts = dateTimeParts(parsedEnd);
    const toMinutes = (time: string) => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
    };
    const startMinutes = toMinutes(startParts.time);
    const endMinutes = toMinutes(endParts.time);
    const DAY_START = dayStartMinutes ?? BOOKING_DAY_START_MINUTES;
    const DAY_END = dayEndMinutes ?? BOOKING_DAY_END_MINUTES;
    // A multi-day booking reserves the SAME start–end time window on each day
    // of the range (mirrors computeBusinessHoursDuration on the client), so
    // the end time must always be after the start time and the per-day window
    // must meet the 30-minute minimum — even when the dates differ.
    if (
        startParts.date > endParts.date ||
        startMinutes < DAY_START ||
        startMinutes >= DAY_END ||
        endMinutes < DAY_START ||
        endMinutes > DAY_END ||
        startMinutes % 5 !== 0 ||
        endMinutes % 5 !== 0 ||
        endMinutes - startMinutes < 30
    ) return null;
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
export const normalizeCreateBookingInput = (body: any = {}, businessHours?: { startMinutes: number; endMinutes: number }) => {
    const roomIdCandidate = getValidObjectId(body?.roomId);
    const roomNameCandidate = typeof body?.roomName === "string" ? body.roomName.trim() : "";

    let range = null;
    if (body?.start != null && body?.end != null) {
        range = parseDateRange(body.start, body.end, businessHours?.startMinutes, businessHours?.endMinutes);
    } else if (body?.date && body?.startTime && body?.endTime) {
        // endDate lets a multi-day booking end on a different calendar date
        // than it started; defaults to the same day when omitted.
        const endDateCandidate = typeof body?.endDate === "string" && body.endDate.trim() ? body.endDate.trim() : body.date;
        range = parseDateRange(`${body.date}T${body.startTime}:00`, `${endDateCandidate}T${body.endTime}:00`, businessHours?.startMinutes, businessHours?.endMinutes);
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

// Tenant users live in the tenant portal — their meeting notifications must
// deep-link there, not to the host panel's meeting rooms page.
const bookingTargetUrlFor = (bookingType: any) =>
    String(bookingType || "").toLowerCase() === "tenant"
        ? "/dashboard/tenant/booking-history"
        : "/meetings/meeting-rooms";

// Shared desk-area resources (capacity > 1) hold one booking per seat, so two
// bookings only clash when they share the SAME seat. When seatNumber is given
// the overlap check is scoped to that seat; otherwise (single-occupancy rooms)
// any time overlap on the resource clashes.
const findOverlap = (roomId: any, start: Date, end: Date, excludeId?: string, seatNumber?: number | null) => MeetingRoomBooking.findOne({
    roomId,
    status: ACTIVE_BOOKING_STATUSES,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    ...(seatNumber != null && Number(seatNumber) > 0 ? { seatNumber: Number(seatNumber) } : {}),
    start: { $lt: end },
    end: { $gt: start },
});

const isDuplicateBookingCodeError = (error: any) =>
    Number(error?.code) === 11000 && Boolean(error?.keyPattern?.bookingCode || error?.keyValue?.bookingCode);

async function createBookingWithUniqueCode(payload: Record<string, any>) {
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const lastBooking = await MeetingRoomBooking.findOne({})
            .sort({ bookingNumber: -1 })
            .select("bookingNumber")
            .lean()
            .exec();
        const lastBookingNumber = Number(lastBooking?.bookingNumber);
        const bookingNumber = Number.isFinite(lastBookingNumber)
            ? Math.max(1001, lastBookingNumber + 1)
            : 1001;

        try {
            return await MeetingRoomBooking.create({
                ...payload,
                bookingNumber,
                bookingCode: `MRB-${bookingNumber}`,
            });
        } catch (error: any) {
            if (!isDuplicateBookingCodeError(error) || attempt === maxAttempts - 1) {
                throw error;
            }
        }
    }

    throw new Error("Unable to allocate a unique meeting-room booking code");
}

export const createBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const workspaceId = workspaceIdFor(req);
        const { purpose, attendees, inviteeUserIds = [] } = req.body;
        const businessHours = await getWorkspaceBusinessHours(workspaceId);
        const { roomIdCandidate, roomNameCandidate, range } = normalizeCreateBookingInput(req.body, businessHours);
        if (!workspaceId || !req.user) return res.status(401).json({ message: "An active workspace is required" });
        if ((!roomIdCandidate && !roomNameCandidate) || !purpose?.trim() || !range) return res.status(400).json({ message: "Room, valid start/end times, and purpose are required" });

        const room = await Resource.findOne(
            roomIdCandidate
                ? { _id: roomIdCandidate, workspaceId, isActive: true, status: "Active" }
                : { workspaceId, name: roomNameCandidate, isActive: true, status: "Active" }
        ).lean().exec();
        if (!room) return res.status(404).json({ message: "Meeting room not found or inactive" });
        const roomId = String(room._id);
        const bookingType = String(req.body.bookingType || "Internal").toLowerCase();
        const resourceKind = `${String(room.resourceCategory || "")} ${String(room.type || "")}`.toLowerCase();
        const isMeetingOrConferenceRoom = resourceKind.includes("meeting") || resourceKind.includes("conference");
        if (bookingType !== "external" && !isMeetingOrConferenceRoom) {
            return res.status(400).json({ message: "Internal and tenant bookings can use Meeting Room or Conference Room resources only." });
        }

        // ── External booking branch ───────────────────────────────────────────
        if (req.body.bookingType === "External") {
            const {
                bookedForName: extBookedForName = "",
                externalClientId,
                baseAmount,
                gstAmount,
                totalAmount,
                discountType = "flat",
                discountValue = 0,
                paymentMode,
                paymentStatus = "Pending",
                transactionId = "",
            } = req.body;

            const normalizedPaymentMode = String(paymentMode || "").trim();
            const isOnlinePayment = normalizedPaymentMode !== "" && normalizedPaymentMode.toLowerCase() !== "cash";
            if (isOnlinePayment && !String(transactionId || "").trim()) {
                return res.status(400).json({ message: "Transaction / UTR number is required for GPay payments." });
            }
            if (isOnlinePayment && !req.file) {
                return res.status(400).json({ message: "Payment screenshot is required for GPay payments." });
            }

            let paymentProofUrl = "";
            if (req.file) {
                const safeFileName = String(req.file.originalname || "payment-proof")
                    .replace(/[^a-zA-Z0-9._-]+/g, "-");
                const uploadResult = await uploadFileToS3(
                    `meeting-room-payments/${workspaceId}/${Date.now()}-${safeFileName}`,
                    req.file,
                );
                paymentProofUrl = uploadResult.url || "";
            }

            // 1. Validate externalClientId if provided
            if (externalClientId) {
                const validClientId = getValidObjectId(externalClientId);
                if (!validClientId) return res.status(422).json({ message: "Client not found in this workspace." });
                const clientDoc = await Client.findOne({ _id: validClientId, workspaceId }).lean().exec();
                if (!clientDoc) return res.status(422).json({ message: "Client not found in this workspace." });
            }

            // 2. Overlap check (seat-aware for shared desk-area resources)
            const extSeatNumber = Number(req.body.seatNumber) > 0 ? Number(req.body.seatNumber) : null;
            if (await findOverlap(roomId, range.start, range.end, undefined, extSeatNumber)) {
                return res.status(409).json({ message: extSeatNumber ? "This seat is already booked for the selected time slot." : "This resource is already booked for the selected time slot." });
            }

            // 3. Resolve the host user. Booking codes are allocated globally because
            // the model's bookingCode index is globally unique across workspaces.
            const extHostUser = await HostUser.findById(req.user).lean().exec();

            // 4. Create the booking document
            const extBooking = await createBookingWithUniqueCode({
                workspaceId,
                roomId,
                roomName: room.name,
                bookingType: "External",
                ownerId: req.user,
                bookedByUserId: req.user,
                bookedByName: resolveBookedByName(req.body, extHostUser),
                bookedByEmail: req.body.bookedByEmail || extHostUser?.email || "",
                bookedForName: extBookedForName,
                externalClientId: externalClientId ? getValidObjectId(externalClientId) : null,
                start: range.start,
                end: range.end,
                originalStart: range.start,
                originalEnd: range.end,
                attendees: Math.max(1, Number(req.body.attendees || 1)),
                seatNumber: extSeatNumber,
                purpose: purpose.trim(),
                bookingNotes: req.body.bookingNotes || "",
                baseAmount: Number(baseAmount) || 0,
                gstAmount: Number(gstAmount) || 0,
                totalAmount: Number(totalAmount) || 0,
                discountType,
                discountValue: Number(discountValue) || 0,
                paymentMode: normalizedPaymentMode,
                // Online payments (proof required) are always Paid. Cash honors
                // the front desk's Paid/Unpaid choice so an unpaid booking can
                // be collected later at verify-booking.
                paymentStatus: isOnlinePayment ? "Paid" : (String(paymentStatus || "").trim() || "Paid"),
                transactionId: String(transactionId || "").trim(),
                paymentProofUrl,
                status: "confirmed",
            });

            // 5. Update the Client record if externalClientId present
            if (externalClientId && getValidObjectId(externalClientId)) {
                await Client.findByIdAndUpdate(externalClientId, {
                    $inc: { bookingCount: 1, totalBookedAmount: Number(totalAmount) || 0 },
                    $set: { lastBookingId: extBooking._id, lastBookingAt: extBooking.start },
                });
            }

            return res.status(201).json({ message: "External meeting room booking created successfully", data: { booking: extBooking } });
        }
        // ── End of External booking branch ───────────────────────────────────

        const attendeeCount = Math.max(1, Number(attendees || inviteeUserIds.length + 1));
        if (attendeeCount > Number(room.capacity || 0)) return res.status(400).json({ message: "Attendee count exceeds room capacity" });
        if (await findOverlap(roomId, range.start, range.end)) return res.status(409).json({ message: "Room is already booked for the selected time slot" });

        const hostUser = await HostUser.findById(req.user).lean().exec();

        // Resolve ownerId for Internal on-behalf bookings
        let resolvedOwnerId: any = req.user;
        let resolvedBookedByUserId: any = req.user;
        let resolvedBookedForName: string = "";
        if (
            String(req.body.bookingType || '').toLowerCase() === 'internal' &&
            typeof req.body.bookedForUserId === 'string' &&
            req.body.bookedForUserId.trim()
        ) {
            const candidateId = getValidObjectId(req.body.bookedForUserId.trim());
            if (candidateId) {
                const hostForMember = await HostUser.findById(candidateId).lean().exec();
                if (hostForMember) {
                    resolvedOwnerId = candidateId;
                    resolvedBookedForName = (hostForMember as any).name || (hostForMember as any).fullName || "";
                    // resolvedBookedByUserId stays as req.user (the admin)
                }
            }
        }

        const rawInvites = await resolveInvites(inviteeUserIds);
        const invites = rawInvites.filter(
            (inv: any) => String(inv.invitedUserId || '') !== String(resolvedOwnerId)
        );
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

        const booking = await createBookingWithUniqueCode({
            workspaceId,
            roomId,
            roomName: room.name,
            start: range.start,
            end: range.end,
            originalStart: range.start,
            originalEnd: range.end,
            ownerId: resolvedOwnerId,
            bookedByUserId: resolvedBookedByUserId,
            bookedByName: resolveBookedByName(req.body, hostUser),
            bookedForName: resolvedBookedForName,
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

        // Send confirmation notification to the booker
        const bookerStartParts = dateTimeParts(range.start);
        const bookerEndParts = dateTimeParts(range.end);
        createNotification({
            workspaceId,
            recipientUserId: String(resolvedOwnerId),
            actorUserId: resolvedOwnerId,
            type: "meeting_booked",
            category: "meeting",
            title: "Meeting Room Booking Confirmed",
            description: `Your booking for ${room.name} on ${bookerStartParts.date} from ${bookerStartParts.time} to ${bookerEndParts.time} has been confirmed.`,
            entityType: "meeting_booking",
            entityId: String(booking._id),
            entityCode: booking.bookingCode,
            targetUrl: bookingTargetUrlFor(req.body.bookingType),
            data: { roomName: room.name, date: bookerStartParts.date, startTime: bookerStartParts.time, endTime: bookerEndParts.time, purpose: purpose.trim() },
            priority: "normal",
            dedupeKey: `meeting-confirmed:${booking._id}:${resolvedOwnerId}`,
            allowSelf: true,
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
                            id: `CRD-${Date.now()}-${booking.bookingNumber}`,
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

        // Notify invitees about the meeting room booking
        if (invites && invites.length > 0) {
            const startParts = dateTimeParts(range.start);
            const endParts = dateTimeParts(range.end);
            const inviterName = hostUser?.name || "Someone";

            for (const invite of invites) {
                if (invite.invitedUserId && String(invite.invitedUserId) !== String(resolvedOwnerId)) {
                    createNotification({
                        workspaceId,
                        recipientUserId: String(invite.invitedUserId),
                        actorUserId: resolvedOwnerId,
                        type: "meeting_invitation",
                        category: "meeting",
                        title: "Meeting Room Invitation",
                        description: `${inviterName} has invited you to a meeting in ${room.name} on ${startParts.date} from ${startParts.time} to ${endParts.time}.`,
                        entityType: "meeting_booking",
                        entityId: String(booking._id),
                        entityCode: booking.bookingCode,
                        targetUrl: bookingTargetUrlFor(req.body.bookingType),
                        data: { roomName: room.name, date: startParts.date, startTime: startParts.time, endTime: endParts.time, purpose: purpose.trim() },
                        priority: "normal",
                        isActionRequired: true,
                        dedupeKey: `meeting-invite:${booking._id}:${invite.invitedUserId}`,
                    });
                }
            }
        }

        // Notify workspace admins about new booking
        if (workspaceId) {
            // `role` on WorkspaceMember is an ObjectId ref to Role — a plain
            // find() can't filter on "role.name" without populating first
            // (it's not an embedded subdocument), so populate then filter in
            // JS. Role names are "founder"/"super_admin"/"admin" (see
            // seedRoles.ts) — there is no role literally named "owner".
            const workspaceMembers = await mongoose.model("WorkspaceMember").find({
                workspace: workspaceId,
                isActive: true,
            }).select("user role").populate("role", "name").lean();

            const startParts = dateTimeParts(range.start);
            const endParts = dateTimeParts(range.end);
            const adminIds = workspaceMembers
                .filter((m: any) => ["founder", "super_admin", "admin"].includes(String(m.role?.name || "").toLowerCase()))
                .map((m: any) => String(m.user))
                .filter((id: string) => id !== String(resolvedOwnerId));

            for (const adminId of adminIds) {
                createNotification({
                    workspaceId,
                    recipientUserId: adminId,
                    actorUserId: resolvedOwnerId,
                    type: "meeting_booked",
                    category: "meeting",
                    title: "Meeting Room Booked",
                    description: `${hostUser?.name || "Someone"} booked ${room.name} for ${startParts.date} ${startParts.time}-${endParts.time}.`,
                    entityType: "meeting_booking",
                    entityId: String(booking._id),
                    entityCode: booking.bookingCode,
                    targetUrl: `/meetings/meeting-rooms`,
                    data: { roomName: room.name, date: startParts.date, startTime: startParts.time, endTime: endParts.time, purpose: purpose.trim() },
                    priority: "normal",
                    dedupeKey: `meeting-booked:${booking._id}:${adminId}`,
                });
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
            MeetingRoomBooking.find({ workspaceId }).populate("roomId", "name type capacity floor wing").populate("ownerId", "name email").populate("externalClientId", "name email phone company clientCode").sort({ start: -1 }).lean().exec(),
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
        const bookings = await MeetingRoomBooking.find({ ownerId: req.user, workspaceId: workspaceIdFor(req) }).populate("roomId", "name type capacity floor wing").populate("ownerId", "name email").sort({ start: -1 }).lean().exec();
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
        const businessHours = await getWorkspaceBusinessHours(workspaceId);
        const range = parseDateRange(req.body.start || booking.start, req.body.end || booking.end, businessHours.startMinutes, businessHours.endMinutes);
        if (!range) return res.status(400).json({ message: "Valid start and end times are required" });
        if (await findOverlap(booking.roomId, range.start, range.end, id, booking.seatNumber)) return res.status(409).json({ message: booking.seatNumber ? "This seat is already booked for the selected time slot" : "Room is already booked for the selected time slot" });

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
        const previousStart = booking.start;
        const previousEnd = booking.end;
        const previousTotal = Number(booking.totalAmount || 0);
        booking.start = range.start;
        booking.end = range.end;
        if (req.body.scheduleChangeType) booking.scheduleChangeType = req.body.scheduleChangeType;
        if (req.body.extensionAmount !== undefined) booking.extensionAmount = req.body.extensionAmount;
        if (req.body.baseAmount !== undefined) booking.baseAmount = req.body.baseAmount;
        if (req.body.gstAmount !== undefined) booking.gstAmount = req.body.gstAmount;
        if (req.body.totalAmount !== undefined) booking.totalAmount = req.body.totalAmount;
        // Extra charges collected at the frontdesk during extend/reschedule.
        if (typeof req.body.paymentMode === "string" && req.body.paymentMode.trim()) booking.paymentMode = req.body.paymentMode.trim();
        if (typeof req.body.paymentStatus === "string" && req.body.paymentStatus.trim()) booking.paymentStatus = req.body.paymentStatus.trim();
        if (typeof req.body.transactionId === "string" && req.body.transactionId.trim()) booking.transactionId = req.body.transactionId.trim();

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

        // Email the external client when their booking is genuinely rescheduled
        // (not for extensions, which are a routine slot bump, not a change of plan).
        if (req.body.scheduleChangeType === "rescheduled") {
            sendExternalLifecycleEmail(booking, "rescheduled", { previousStart, previousEnd, previousTotal });
        }

        // Notify invitees of schedule change
        const updateStartParts = dateTimeParts(range.start);
        const updateEndParts = dateTimeParts(range.end);
        const existingInvitees = (booking.invites || [])
            .filter((inv: any) => inv.invitedUserId && String(inv.invitedUserId) !== String(req.user) && inv.status !== "rejected");
        for (const inv of existingInvitees) {
            createNotification({
                workspaceId,
                recipientUserId: String(inv.invitedUserId),
                actorUserId: req.user,
                type: "meeting_updated",
                category: "meeting",
                title: "Meeting Room Booking Updated",
                description: `The meeting in ${booking.roomName} has been rescheduled to ${updateStartParts.date} ${updateStartParts.time}-${updateEndParts.time}.`,
                entityType: "meeting_booking",
                entityId: String(booking._id),
                entityCode: booking.bookingCode,
                targetUrl: bookingTargetUrlFor(booking.bookingType),
                data: { roomName: booking.roomName, date: updateStartParts.date, startTime: updateStartParts.time, endTime: updateEndParts.time },
                priority: "normal",
                dedupeKey: `meeting-updated:${booking._id}:${inv.invitedUserId}:${Date.now()}`,
            });
        }

        // Return the transformed shape (date/startTime/endTime/previous* etc.)
        // — the frontdesk UIs merge this straight into their booking lists.
        return res.status(200).json({ message: "Booking updated successfully", data: { booking: transformBooking(booking.toObject(), String(req.user || "")) } });
    } catch (error: any) { next(error); }
};

export const cancelBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = getValidObjectId(req.params.id);
        if (!id) return res.status(400).json({ message: "Invalid booking ID" });
        const workspaceId = workspaceIdFor(req);
        const booking = await MeetingRoomBooking.findOne({ _id: id, workspaceId }).exec();
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        // External bookings must be cancelled at least 30 minutes before the
        // start time — after that the slot is committed and the client has
        // already received their starting-soon reminder.
        if (String(booking.bookingType) === "External" && booking.start) {
            const minutesToStart = (new Date(booking.start).getTime() - Date.now()) / 60000;
            if (minutesToStart < 30) {
                return res.status(400).json({ message: "External bookings can only be cancelled at least 30 minutes before the start time." });
            }
        }

        booking.status = "cancelled";
        booking.cancelReason = req.body.cancelReason || "Cancelled by user";
        await booking.save();

        // The frontdesk cancel form appends the refund choice as "reason | Refund Type".
        const reasonParts = String(booking.cancelReason || "").split("|").map((s: string) => s.trim());
        const refundType = reasonParts.length > 1 ? reasonParts[reasonParts.length - 1] : "";
        const cleanReason = reasonParts.length > 1 ? reasonParts.slice(0, -1).join(" | ") : reasonParts[0];
        sendExternalLifecycleEmail(booking, "cancelled", { cancelReason: cleanReason, refundType });

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

        // Notify invitees of cancellation
        const cancelledInvitees = (booking.invites || [])
            .filter((inv: any) => inv.invitedUserId && String(inv.invitedUserId) !== String(req.user) && inv.status !== "rejected");
        for (const inv of cancelledInvitees) {
            createNotification({
                workspaceId,
                recipientUserId: String(inv.invitedUserId),
                actorUserId: req.user,
                type: "meeting_cancelled",
                category: "meeting",
                title: "Meeting Room Booking Cancelled",
                description: `The meeting in ${booking.roomName} scheduled for ${booking.start ? dateTimeParts(new Date(booking.start)).date : "the booked date"} has been cancelled.`,
                entityType: "meeting_booking",
                entityId: String(booking._id),
                entityCode: booking.bookingCode,
                targetUrl: bookingTargetUrlFor(booking.bookingType),
                data: { roomName: booking.roomName },
                priority: "high",
                dedupeKey: `meeting-cancelled:${booking._id}:${inv.invitedUserId}:${Date.now()}`,
            });
        }

        // Notify booking owner if canceller is not the owner
        if (booking.ownerId && String(booking.ownerId) !== String(req.user)) {
            createNotification({
                workspaceId,
                recipientUserId: String(booking.ownerId),
                actorUserId: req.user,
                type: "meeting_cancelled",
                category: "meeting",
                title: "Your Meeting Room Booking Was Cancelled",
                description: `Your booking for ${booking.roomName} has been cancelled by another user.`,
                entityType: "meeting_booking",
                entityId: String(booking._id),
                entityCode: booking.bookingCode,
                targetUrl: bookingTargetUrlFor(booking.bookingType),
                data: { roomName: booking.roomName },
                priority: "high",
                dedupeKey: `meeting-cancelled-owner:${booking._id}:${booking.ownerId}:${Date.now()}`,
            });
        }

        return res.status(200).json({ message: "Booking cancelled successfully", data: { booking: transformBooking(booking.toObject(), String(req.user || "")) } });
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

        // Notify booking owner of invite response
        if (booking.ownerId && String(booking.ownerId) !== String(req.user)) {
            const responderName = (await HostUser.findById(req.user).select("name").lean())?.name || "Someone";
            createNotification({
                workspaceId: workspaceIdFor(req),
                recipientUserId: String(booking.ownerId),
                actorUserId: req.user,
                type: "meeting_invite_response",
                category: "meeting",
                title: `Meeting Invite ${status === "accepted" ? "Accepted" : "Declined"}`,
                description: `${responderName} has ${status === "accepted" ? "accepted" : "declined"} your invitation to ${booking.roomName}.`,
                entityType: "meeting_booking",
                entityId: String(booking._id),
                entityCode: booking.bookingCode,
                targetUrl: bookingTargetUrlFor(booking.bookingType),
                data: { roomName: booking.roomName, response: status },
                priority: "normal",
                dedupeKey: `meeting-response:${booking._id}:${req.user}:${Date.now()}`,
            });
        }

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

export const getExternalClients = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { workspaceId, search } = req.query;
        if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

        const filter: any = { workspaceId };
        if (search && String(search).length >= 2) {
            const re = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ name: re }, { email: re }, { phone: re }];
        }

        const clients = await Client.find(filter).sort({ name: 1 }).limit(50).lean();
        return res.status(200).json({ success: true, data: clients });
    } catch (err: any) {
        return res.status(500).json({ message: err.message || 'Server error' });
    }
};

export const createExternalClient = async (req: Request, res: Response) => {
    try {
        const { workspaceId, name, email, phone, company } = req.body;
        if (!workspaceId || !name || !email) {
            return res.status(400).json({ message: 'workspaceId, name, and email are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existing = await Client.findOne({ workspaceId, email: normalizedEmail }).lean();
        if (existing) {
            return res.status(200).json({ success: true, data: existing, existed: true });
        }

        const client = await Client.create({
            workspaceId,
            ownerId: (req as any).user || null,
            clientCode: `EC-${Date.now()}`,
            name: name.trim(),
            email: normalizedEmail,
            phone: phone?.trim() || '',
            company: company?.trim() || '',
            source: 'external-booking',
            bookingCount: 0,
            totalBookedAmount: 0,
        });
        return res.status(201).json({ success: true, data: client });
    } catch (err: any) {
        if (err.code === 11000) {
            // Race condition duplicate — try to find and return existing
            try {
                const existing = await Client.findOne({ workspaceId: req.body.workspaceId, email: req.body.email?.toLowerCase().trim() }).lean();
                if (existing) return res.status(200).json({ success: true, data: existing, existed: true });
            } catch {}
        }
        return res.status(500).json({ message: err.message || 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// sendExternalLifecycleEmail — best-effort email to an external client when
// their booking is rescheduled or cancelled by the front desk. Never throws:
// email delivery failures must not block the underlying reschedule/cancel.
// ─────────────────────────────────────────────────────────────────────────────
const sendExternalLifecycleEmail = async (
    booking: any,
    kind: "rescheduled" | "cancelled",
    extra: { previousStart?: Date | null; previousEnd?: Date | null; previousTotal?: number; cancelReason?: string; refundType?: string } = {},
) => {
    try {
        if (String(booking?.bookingType) !== "External") return;
        const recipientEmail = String(booking.bookedByEmail || "").trim();
        if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) return;

        const clientName = booking.bookedForName || booking.bookedByName || "Guest";
        const roomName = booking.roomName || "Meeting Room";
        const bookingCode = booking.bookingCode || String(booking._id);
        const startDate = booking.start ? new Date(booking.start) : null;
        const endDate = booking.end ? new Date(booking.end) : null;
        const slotLabel = emailSlotLabel(startDate, endDate);
        const dayLabel = startDate ? emailDateParts(startDate).day : "";
        const paid = isBookingPaid(booking);

        const { sendMail } = await import("../config/mailer.js");

        const row = (label: string, value: string, opts: { color?: string; strong?: boolean; bg?: string; strike?: boolean } = {}) =>
            `<tr style="border-top:1px solid #f1f5f9;background:${opts.bg || "#ffffff"};">
              <td style="padding:11px 16px;font-size:13px;font-weight:500;color:#64748b;font-family:${EMAIL_FONT};">${label}</td>
              <td style="padding:11px 16px;font-size:13px;font-weight:${opts.strong ? 700 : 600};color:${opts.color || "#0f172a"};text-align:right;${opts.strike ? "text-decoration:line-through;" : ""}font-family:${EMAIL_FONT};">${value}</td>
            </tr>`;

        if (kind === "rescheduled") {
            const prevSlot = emailSlotLabel(extra.previousStart || null, extra.previousEnd || null);
            const newTotal = Number(booking.totalAmount || 0);
            const prevTotal = Number(extra.previousTotal ?? newTotal);
            const diff = Math.round((newTotal - prevTotal) * 100) / 100;
            const subject = `Booking Rescheduled — ${roomName} on ${dayLabel}`;
            const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:${EMAIL_FONT};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);font-family:${EMAIL_FONT};">
        <tr><td style="background:#d97706;padding:32px 40px;">
          <p style="margin:0;font-size:22px;font-weight:600;color:#ffffff;font-family:${EMAIL_FONT};">Booking Rescheduled</p>
          <p style="margin:8px 0 0;font-size:13px;font-weight:500;color:#fde68a;font-family:${EMAIL_FONT};">Your meeting room slot has changed</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 24px;font-size:15px;font-weight:500;color:#334155;font-family:${EMAIL_FONT};">Hi <strong>${clientName}</strong>, your booking (ID <strong>${bookingCode}</strong>) has been rescheduled. Here are the updated details:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
            ${row("Meeting Room", roomName)}
            ${row("Original Schedule", prevSlot, { color: "#94a3b8", strike: true, bg: "#f8fafc" })}
            ${row("New Schedule", slotLabel, { color: "#0f172a", strong: true })}
          </table>
          ${emailPricingBlock(booking)}
          ${diff > 0
                ? `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fecaca;border-radius:12px;background:#fef2f2;margin-bottom:24px;"><tr><td style="padding:14px 18px;font-size:12px;font-weight:600;color:#b91c1c;font-family:${EMAIL_FONT};">Additional ${emailCurrency(diff)} is due for the new slot &mdash; please pay this at the front desk.</td></tr></table>`
                : diff < 0
                    ? `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #a7f3d0;border-radius:12px;background:#f0fdf4;margin-bottom:24px;"><tr><td style="padding:14px 18px;font-size:12px;font-weight:600;color:#047857;font-family:${EMAIL_FONT};">A refund of ${emailCurrency(Math.abs(diff))} is due for the shorter slot &mdash; please collect this from the front desk.</td></tr></table>`
                    : ""}
          <p style="margin:0;font-size:13px;font-weight:500;color:#94a3b8;line-height:1.6;font-family:${EMAIL_FONT};">If this change doesn't work for you, please contact us directly.</p>
        </td></tr>
        <tr><td style="background:#f1f5f9;padding:20px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;font-weight:500;color:#94a3b8;font-family:${EMAIL_FONT};">This is an automated notice. Please do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
            await sendMail({
                to: recipientEmail,
                subject,
                html,
                text: `Your booking (${bookingCode}) for ${roomName} has been rescheduled. New schedule: ${slotLabel.replace(/&ndash;|&rarr;|&nbsp;/g, "-")}. Total: ${emailCurrency(newTotal)} (${paid ? "Paid" : "Unpaid"}).${diff > 0 ? ` Additional ${emailCurrency(diff)} due at the front desk.` : diff < 0 ? ` Refund of ${emailCurrency(Math.abs(diff))} at the front desk.` : ""}`,
            });
        } else {
            const subject = `Booking Cancelled — ${roomName} on ${dayLabel}`;
            const reasonLine = String(extra.cancelReason || "").trim();
            const refundType = String(extra.refundType || "").trim();
            const total = Number(booking.totalAmount || 0);
            // Only a previously-paid booking has money to refund on cancel.
            const showRefund = paid && total > 0 && refundType && !/no.?refund/i.test(refundType);
            const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:${EMAIL_FONT};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);font-family:${EMAIL_FONT};">
        <tr><td style="background:#dc2626;padding:32px 40px;">
          <p style="margin:0;font-size:22px;font-weight:600;color:#ffffff;font-family:${EMAIL_FONT};">Booking Cancelled</p>
          <p style="margin:8px 0 0;font-size:13px;font-weight:500;color:#fecaca;font-family:${EMAIL_FONT};">Your meeting room reservation was cancelled</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 24px;font-size:15px;font-weight:500;color:#334155;font-family:${EMAIL_FONT};">Hi <strong>${clientName}</strong>, your booking (ID <strong>${bookingCode}</strong>) below has been cancelled.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
            ${row("Meeting Room", roomName)}
            ${row("Was Scheduled For", slotLabel, { bg: "#f8fafc" })}
            ${total > 0 ? row("Amount", `${emailCurrency(total)} (${paid ? "Paid" : "Unpaid"})`) : ""}
            ${reasonLine ? row("Reason", reasonLine, { bg: "#f8fafc" }) : ""}
          </table>
          ${showRefund ? `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #a7f3d0;border-radius:12px;background:#f0fdf4;margin-bottom:24px;"><tr><td style="padding:14px 18px;font-size:12px;font-weight:600;color:#047857;font-family:${EMAIL_FONT};">Refund (${refundType}) is due for this cancellation &mdash; please collect it from the front desk.</td></tr></table>` : ""}
          <p style="margin:0;font-size:13px;font-weight:500;color:#94a3b8;line-height:1.6;font-family:${EMAIL_FONT};">If you have any questions or would like to rebook, please contact us directly.</p>
        </td></tr>
        <tr><td style="background:#f1f5f9;padding:20px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;font-weight:500;color:#94a3b8;font-family:${EMAIL_FONT};">This is an automated notice. Please do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
            await sendMail({
                to: recipientEmail,
                subject,
                html,
                text: `Your booking (${bookingCode}) for ${roomName}, ${slotLabel.replace(/&ndash;|&rarr;|&nbsp;/g, "-")} has been cancelled.${reasonLine ? ` Reason: ${reasonLine}.` : ""}${showRefund ? ` Refund (${refundType}) at the front desk.` : ""}`,
            });
        }
    } catch (err) {
        console.error(`sendExternalLifecycleEmail(${kind}) failed:`, err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// sendExternalBookingConfirmation — POST /api/meeting-rooms/bookings/:id/send-confirmation
// Sends an email to the external client with their booking details.
// ─────────────────────────────────────────────────────────────────────────────
export const sendExternalBookingConfirmation = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const validId = getValidObjectId(id);
        if (!validId) return res.status(422).json({ message: "Invalid booking ID." });

        const booking = await MeetingRoomBooking.findById(validId).populate("roomId").lean().exec();
        if (!booking) return res.status(404).json({ message: "Booking not found." });
        if (booking.bookingType !== "External") return res.status(400).json({ message: "Confirmation emails are only for external bookings." });

        const recipientEmail = booking.bookedByEmail || (booking as any).externalClientEmail;
        if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
            return res.status(422).json({ message: "No valid email address on this booking." });
        }

        // Friendly 12-hour slot label (handles multi-day date ranges).
        const startDate = booking.start ? new Date(booking.start) : null;
        const endDate = booking.end ? new Date(booking.end) : null;
        const slotLabel = emailSlotLabel(startDate, endDate);
        const room = booking.roomId && typeof booking.roomId === "object" ? (booking.roomId as any) : null;
        const roomName = booking.roomName || room?.name || "Meeting Room";
        const clientName = booking.bookedForName || booking.bookedByName || "Guest";
        const pricingBlock = emailPricingBlock(booking);
        const paidNow = isBookingPaid(booking);

        const subject = `Meeting Room Booking Confirmation — ${roomName} on ${startDate ? emailDateParts(startDate).day : ""}`;

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:${EMAIL_FONT};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);font-family:${EMAIL_FONT};">
        <!-- Header -->
        <tr><td style="background:#2563EB;padding:32px 40px;">
          <p style="margin:0;font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-0.3px;font-family:${EMAIL_FONT};">Booking Confirmed &#10003;</p>
          <p style="margin:8px 0 0;font-size:13px;font-weight:500;color:#bfdbfe;font-family:${EMAIL_FONT};">Your meeting room has been reserved</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 24px;font-size:15px;font-weight:500;color:#334155;font-family:${EMAIL_FONT};">Hi <strong>${clientName}</strong>, your booking is confirmed. Here are the details:</p>

          <!-- Booking ID banner: quote this at the front desk to verify the booking -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:2px dashed #2563EB;border-radius:12px;background:#eff6ff;margin-bottom:24px;">
            <tr><td style="padding:16px 20px;text-align:center;">
              <p style="margin:0;font-size:10px;font-weight:600;color:#2563EB;text-transform:uppercase;letter-spacing:0.1em;font-family:${EMAIL_FONT};">Your Booking ID</p>
              <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:1px;font-family:${EMAIL_FONT};">${booking.bookingCode || String(booking._id)}</p>
              <p style="margin:6px 0 0;font-size:11px;font-weight:500;color:#64748b;font-family:${EMAIL_FONT};">Show this ID at the front desk when you arrive to verify your booking.</p>
            </td></tr>
          </table>

          <!-- Details table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
            <tr style="border-top:1px solid #f1f5f9;">
              <td style="padding:12px 16px;font-size:13px;font-weight:500;color:#64748b;font-family:${EMAIL_FONT};">Meeting Room</td>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;font-family:${EMAIL_FONT};">${roomName}</td>
            </tr>
            <tr style="background:#f8fafc;border-top:1px solid #f1f5f9;">
              <td style="padding:12px 16px;font-size:13px;font-weight:500;color:#64748b;font-family:${EMAIL_FONT};">Schedule</td>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;font-family:${EMAIL_FONT};">${slotLabel}</td>
            </tr>
            <tr style="border-top:1px solid #f1f5f9;">
              <td style="padding:12px 16px;font-size:13px;font-weight:500;color:#64748b;font-family:${EMAIL_FONT};">Purpose</td>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;font-family:${EMAIL_FONT};">${(booking as any).purpose || "—"}</td>
            </tr>
          </table>

          ${pricingBlock}

          ${!paidNow ? `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fde68a;border-radius:12px;background:#fffbeb;margin-bottom:24px;"><tr><td style="padding:14px 18px;font-size:12px;font-weight:500;color:#b45309;font-family:${EMAIL_FONT};">Payment is pending. Please pay the amount due at the front desk when you arrive to confirm your entry.</td></tr></table>` : ""}

          <p style="margin:0;font-size:13px;font-weight:500;color:#94a3b8;line-height:1.6;font-family:${EMAIL_FONT};">If you have any questions please contact us directly. We look forward to seeing you!</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f1f5f9;padding:20px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;font-weight:500;color:#94a3b8;font-family:${EMAIL_FONT};">This is an automated confirmation. Please do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const { sendMail } = await import("../config/mailer.js");
        await sendMail({ to: recipientEmail, subject, html, text: `Booking confirmed: ${roomName}, ${slotLabel.replace(/&ndash;|&rarr;|&nbsp;/g, "-")}. Booking ID: ${booking.bookingCode || String(booking._id)} (show this at the front desk to verify). Total: ${emailCurrency(Number(booking.totalAmount || 0))} (${paidNow ? "Paid" : "Unpaid — due at front desk"}).` });

        return res.status(200).json({ success: true, message: "Confirmation email sent." });
    } catch (err: any) {
        console.error("sendExternalBookingConfirmation error:", err);
        return res.status(500).json({ message: err.message || "Failed to send confirmation email." });
    }
};
