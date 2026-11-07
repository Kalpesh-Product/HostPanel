// @ts-nocheck
import axios from "axios";
import crypto from "crypto";
import Company from "../models/Company.js";
import WebsiteTemplate from "../models/website/WebsiteTemplate.js";
import Workspace from "../models/Workspace.js";
import WebsiteLead from "../models/WebsiteLead.js";
import HostUser from "../models/HostUser.js";
import { Resource } from "../models/Resource.js";
import { MeetingRoomBooking } from "../models/MeetingRoomBooking.js";
import { RoomStayBooking, ROOM_STAY_OPEN_STATUSES } from "../models/RoomStayBooking.js";
import {
  createBookingWithUniqueCode,
  sendExternalLifecycleEmail,
} from "./meetingRoomBookingController.js";
import {
  allocateDormBeds,
  createRoomStayAtomically,
  createRoomStayPaymentHold,
  releaseRoomStayPaymentHold,
} from "./roomStayController.js";
import { RoomStayNightAllocation } from "../models/RoomStayNightAllocation.js";
import { HostInvoiceRequest } from "../models/HostInvoiceRequest.js";
import { buildHostInvoicePdfBuffer } from "../utils/hostInvoicePdfGenerator.js";
import { uploadFileToS3 } from "../config/s3config.js";
import WorkspaceSubscription from "../models/WorkspaceSubscription.js";
import { sendMail } from "../config/mailer.js";
import {
  sendLeadBookingAcceptedEmail,
  sendLeadRejectedEmail,
  sendLeadSlotUnavailableEmail,
} from "../utils/leadPaymentEmails.js";

// Website-lead visibility cap, by subscription plan — staff-editable from
// Master Panel's Plan Pricing page, not a code constant. Fetched from
// MasterPanel's public pricing endpoint (no auth needed, same one the
// pricing cards use); these fallbacks only apply if that call fails.
const FALLBACK_WEBSITE_LEAD_PLAN_LIMITS = { "static-free": 5, basic: 5, professional: 25, custom: null };
const fetchLeadLimitsFromMasterPanel = async () => {
  try {
    const response = await axios.get(`${MASTER_PANEL_BASE_URL}/api/public/plan-pricing`, {
      timeout: 5000,
    });
    const leadLimits = response?.data?.leadLimits;
    if (leadLimits && typeof leadLimits === "object") {
      return { "static-free": leadLimits.basic, ...leadLimits };
    }
  } catch (error) {
    console.warn("Could not fetch lead limits from Master Panel, using fallback:", error?.message || error);
  }
  return FALLBACK_WEBSITE_LEAD_PLAN_LIMITS;
};
const leadLimitForPlan = (limits, plan) =>
  Object.prototype.hasOwnProperty.call(limits, plan) ? limits[plan] : limits.basic;

const sanitizeValue = (value) => String(value || "").trim();
const NOMADS_API_BASE_URL = sanitizeValue(
  process.env.NOMADS_API_BASE_URL ||
    process.env.REVIEW_API_BASE_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://wono.co"
      : "http://localhost:3000"),
).replace(/\/+$/, "").replace(/\/api$/i, "");
const nomadsApiUrl = (path) =>
  `${NOMADS_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
const MASTER_PANEL_BASE_URL = sanitizeValue(
  process.env.MASTER_PANEL_BASE_URL || "http://localhost:5007",
).replace(/\/+$/, "");
const masterPanelHeaders = () => ({
  "x-hostpanel-service-key": process.env.HOSTPANEL_SERVICE_API_KEY,
});
const isSyntheticCompanyId = (value) => sanitizeValue(value).includes("-dev-");
const isNomadLead = (lead) => sanitizeValue(lead?.source).toLowerCase() === "nomad";

const filterLeadsByScope = (leads, leadScope) => {
  const normalizedScope = sanitizeValue(leadScope).toLowerCase();
  if (normalizedScope === "nomads") return leads.filter(isNomadLead);
  if (normalizedScope === "website") return leads.filter((lead) => !isNomadLead(lead));
  return leads;
};

// Global-search support: apply the same word-prefix matching the header
// palette uses, server-side, and cap the payload so a broad query can never
// return the entire tenant lead set. The tenant filters above (workspaceId /
// companyId / escalatedWorkspaceId) are always applied first, so this only
// ever narrows data the caller was already allowed to see.
const filterLeadSearchResults = (leads, search, limit) => {
  const query = sanitizeValue(search).toLowerCase();
  const requestedLimit = Number(limit);
  const cappedLimit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50)
    : null;
  const matches = (lead) =>
    !query ||
    [lead?.fullName, lead?.email, lead?.mobileNumber, lead?.companyName, lead?.productType, lead?.source]
      .some((value) =>
        sanitizeValue(value)
          .toLowerCase()
          .split(/[^a-z0-9@.+-]+/)
          .filter(Boolean)
          .some((word) => word.startsWith(query)),
      );
  const filtered = leads.filter(matches);
  return cappedLimit ? filtered.slice(0, cappedLimit) : filtered;
};

const filterEscalatedLeadsForWorkspace = (leads, workspaceId) => {
  const normalizedWorkspaceId = sanitizeValue(workspaceId);
  if (!normalizedWorkspaceId) return [];

  return leads.filter(
    (lead) =>
      lead?.isEscalated === true &&
      sanitizeValue(lead?.escalatedWorkspaceId) === normalizedWorkspaceId,
  );
};

// Shared by finalizeLeadBooking and previewLeadBookingPrefill: explicit
// start/end win, otherwise the lead meta's date (startDate, falling back to
// endDate) combined with the requested time slot (timeSlot "14:00", endTime
// "17:00").
const resolveLeadSchedule = (meta, bodyStart, bodyEnd) => {
  const resolveDate = (raw) => {
    const value = sanitizeValue(raw);
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  let startDate = bodyStart ? resolveDate(bodyStart) : null;
  let endDate = bodyEnd ? resolveDate(bodyEnd) : null;
  if (!startDate) {
    const dateOnly = resolveDate(meta.startDate || meta.checkIn || meta.bookingDate || meta.preferredDate) ||
      resolveDate(meta.endDate || meta.checkOut);
    const startHour = parseClockHour(resolveSlotRange(meta).start);
    const parts = dateOnly
      ? { y: dateOnly.getFullYear(), m: dateOnly.getMonth(), d: dateOnly.getDate() }
      : null;
    if (parts) {
      startDate = Number.isFinite(startHour)
        ? new Date(parts.y, parts.m, parts.d, Math.floor(startHour), Math.round((startHour % 1) * 60))
        : new Date(parts.y, parts.m, parts.d);
    }
  }
  if (!endDate && startDate) {
    const endHour = parseClockHour(resolveSlotRange(meta).end);
    const savedEndDate = resolveDate(meta.endDate || meta.checkOut);
    const endDay = savedEndDate || startDate;
    endDate = Number.isFinite(endHour)
      ? new Date(
          endDay.getFullYear(),
          endDay.getMonth(),
          endDay.getDate(),
          Math.floor(endHour),
          Math.round((endHour % 1) * 60),
        )
      : savedEndDate;
  }
  return { startDate, endDate };
};

// True for co-living/hostel leads — these book by night (checkIn/checkOut
// dates), not by hour slot like meeting rooms. `room` (from
// resolveRoomForLead) is the reliable signal — its `type` is the real
// Resource category ("Room"/"Dorm"), independent of lead.vertical/
// productType, which the website-builder/Nomads lead pipeline doesn't
// consistently populate. lead.vertical/productType/dormType are only a
// fallback for when no room could be matched yet.
const isStayVertical = (lead, room) => {
  if (room?.type === "Room" || room?.type === "Dorm") return true;
  if (room) return false;
  const vertical = sanitizeValue(lead?.vertical).toLowerCase();
  const productType = sanitizeValue(lead?.productType).toLowerCase();
  const meta = readLeadMeta(lead);
  if (sanitizeValue(meta.dormType)) return true;
  return ["co-living", "coliving", "hostel"].some(
    (needle) => vertical.includes(needle) || productType.includes(needle),
  );
};

const isNonBookingInquiry = (lead) => {
  const meta = readLeadMeta(lead);
  const inquiry = sanitizeValue(meta?.inquiryType || lead?.inquiryType).toLowerCase();
  return inquiry.includes("tour") || inquiry.includes("visit") || sanitizeValue(meta?.stayType).toLowerCase() === "monthly";
};

// Co-living/hostel version of resolveLeadSchedule — whole-day checkIn/
// checkOut (no hour-of-day component), falling back to the lead's
// stayDuration string (e.g. "6 nights") to derive checkOut when only
// checkIn was given.
const resolveStaySchedule = (meta, bodyCheckIn, bodyCheckOut) => {
  const parseDateOnly = (raw) => {
    const value = sanitizeValue(raw);
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  };

  const checkIn = bodyCheckIn
    ? parseDateOnly(bodyCheckIn)
    : parseDateOnly(meta.startDate || meta.checkIn || meta.bookingDate || meta.preferredDate);
  let checkOut = bodyCheckOut
    ? parseDateOnly(bodyCheckOut)
    : parseDateOnly(meta.endDate || meta.checkOut);
  if (checkIn && !checkOut) {
    const nightsFromDuration = parseInt(String(meta.stayDuration || "").match(/\d+/)?.[0] || "1", 10);
    checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + Math.max(1, nightsFromDuration));
  }
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return { checkIn: null, checkOut: null, nights: 0 };
  }
  const nights = Math.max(1, Math.round((checkOut - checkIn) / (24 * 60 * 60 * 1000)));
  return { checkIn, checkOut, nights };
};

// Shared by previewLeadPayment and the Accept flow's pre-payment guard —
// branches on vertical: meeting rooms check MeetingRoomBooking by hour
// overlap, co-living/hostel check RoomStayBooking by night overlap.
const checkLeadAvailability = async (lead, meta) => {
  const room = await resolveRoomForLead(lead);
  if (!room) return { checked: false, available: true, conflictBookingCode: "" };

  if (isStayVertical(lead, room)) {
    const { checkIn, checkOut } = resolveStaySchedule(meta, null, null);
    if (!checkIn || !checkOut) return { checked: false, available: true, conflictBookingCode: "" };
    const conflicts = await RoomStayBooking.find({
      roomId: room._id,
      status: { $in: ROOM_STAY_OPEN_STATUSES },
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn },
    })
      .select("bookingCode bedNumber bedNumbers")
      .lean()
      .exec();
    const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const activeHolds = await RoomStayNightAllocation.find({
      roomId: room._id,
      dateKey: { $gte: dateKey(checkIn), $lt: dateKey(checkOut) },
      expiresAt: { $gt: new Date() },
      ...(lead?._id ? { leadId: { $ne: lead._id } } : {}),
    }).select("bedNumber").lean().exec();
    if (room.type === "Dorm") {
      const requestedBeds = Math.max(1, Math.trunc(Number(parseMoney(meta.attendees ?? meta.noOfPeople ?? lead.noOfPeople ?? 1))) || 1);
      const availableBeds = allocateDormBeds(
        room.capacity || 1,
        [...conflicts, ...activeHolds.map((entry) => ({ bedNumber: entry.bedNumber }))],
        requestedBeds,
      );
      return {
        checked: true,
        available: availableBeds.length === requestedBeds,
        conflictBookingCode: availableBeds.length === requestedBeds ? "" : conflicts[0]?.bookingCode || "",
      };
    }
    // Private Room (co-living) — not split into beds like a Dorm, but the
    // host-set "Occupancy (Guests)" capacity still caps how many people can
    // stay in it at once. A date-free room is still unavailable if the
    // party is larger than it sleeps.
    const requestedGuests = Math.max(1, Math.trunc(Number(parseMoney(meta.attendees ?? meta.noOfPeople ?? lead.noOfPeople ?? 1))) || 1);
    const roomCapacity = Math.max(1, Number(room.capacity) || 1);
    if (requestedGuests > roomCapacity) {
      return {
        checked: true,
        available: false,
        conflictBookingCode: "",
        reason: "capacity_exceeded",
        message: `This room sleeps up to ${roomCapacity} guest${roomCapacity === 1 ? "" : "s"} — ${requestedGuests} requested.`,
      };
    }
    return {
      checked: true,
      available: conflicts.length === 0 && activeHolds.length === 0,
      conflictBookingCode: conflicts[0]?.bookingCode || "",
      reason: conflicts.length === 0 && activeHolds.length === 0 ? null : "date_conflict",
    };
  }

  const { startDate, endDate } = resolveLeadSchedule(meta, null, null);
  if (!startDate || !endDate || endDate <= startDate) {
    return { checked: false, available: true, conflictBookingCode: "" };
  }
  const conflict = await MeetingRoomBooking.findOne({
    roomId: room._id,
    status: { $nin: ["cancelled"] },
    start: { $lt: endDate },
    end: { $gt: startDate },
  })
    .select("bookingCode")
    .lean()
    .exec();
  return { checked: true, available: !conflict, conflictBookingCode: conflict?.bookingCode || "" };
};

// Open gaps of at least `durationMs` on the same calendar day as `dayDate`,
// within the workspace's business hours, for the given room.
const findAvailableSlotsOnDay = async (roomId, workspaceId, dayDate, durationMs) => {
  const workspace = await Workspace.findById(workspaceId)
    .select("preferences.businessHours")
    .lean()
    .exec();
  const businessHours = workspace?.preferences?.businessHours || {};
  const [startHour, startMin] = String(businessHours.start || "09:00").split(":").map(Number);
  const [endHour, endMin] = String(businessHours.end || "22:00").split(":").map(Number);

  const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), startHour || 9, startMin || 0);
  const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), endHour ?? 22, endMin || 0);
  const duration = Number(durationMs) > 0 ? Number(durationMs) : 60 * 60 * 1000;

  const bookings = await MeetingRoomBooking.find({
    roomId,
    status: { $nin: ["cancelled"] },
    start: { $lt: dayEnd },
    end: { $gt: dayStart },
  })
    .select("start end")
    .sort({ start: 1 })
    .lean()
    .exec();

  // Each free gap is sliced into back-to-back `duration`-sized starts (not
  // just one), so a mostly-empty day offers several same-day times instead
  // of immediately rolling over to the next day.
  const pushGapSlots = (slots, gapStart, gapEnd) => {
    let t = gapStart;
    while (gapEnd - t >= duration && slots.length < 3) {
      slots.push({ start: new Date(t), end: new Date(t.getTime() + duration) });
      t = new Date(t.getTime() + duration);
    }
  };

  const slots = [];
  let cursor = dayStart;
  for (const booking of bookings) {
    if (slots.length >= 3) break;
    pushGapSlots(slots, cursor, new Date(booking.start));
    if (booking.end > cursor) cursor = new Date(booking.end);
  }
  if (slots.length < 3) pushGapSlots(slots, cursor, dayEnd);
  return slots;
};

// At least 3 open slots for the room, starting on `dayDate` and rolling
// forward a day at a time (up to 2 weeks) if that day alone doesn't have
// enough gaps — used to recommend alternative slots in the "slot
// unavailable" email.
const findAvailableSlotsForDay = async (roomId, workspaceId, dayDate, durationMs) => {
  const slots = [];
  for (let offset = 0; offset < 14 && slots.length < 3; offset += 1) {
    const day = new Date(dayDate);
    day.setDate(day.getDate() + offset);
    const daySlots = await findAvailableSlotsOnDay(roomId, workspaceId, day, durationMs);
    slots.push(...daySlots);
  }
  return slots.slice(0, 3);
};

// POST /api/leads/finalize-booking — lock an accepted, paid lead in as a real
// meeting-room booking (MRB booking code). Gated behind paymentStatus "Paid":
// the Stripe Connect payment step flips that status when the guest pays, and
// this endpoint turns the lead into a MeetingRoomBooking record.
// Thrown by runFinalizeLeadBooking instead of writing to res directly, so
// the same logic works from both an HTTP request (finalizeLeadBooking) and
// the payment webhook (no req/res at all).
class FinalizeBookingError extends Error {
  statusCode: number;
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Shared by finalizeLeadBooking (manual "Create Booking" click) and
// handlePaymentWebhook (automatic, the instant Stripe confirms payment) —
// converting a paid, accepted lead into a real MeetingRoomBooking /
// RoomStayBooking is the SAME operation regardless of what triggered it.
// `actingUserId` is the HostUser to attribute the booking to — the real
// logged-in host for a manual click, the workspace owner for an automatic
// webhook finalize (nothing is "logged in" at that moment).
const runFinalizeLeadBooking = async (lead, { roomId, bodyStart, bodyEnd, bodyAttendees, actingUserId } = {}) => {
    if ((lead.hostPanelStatus || "Pending") !== "Accepted") {
      throw new FinalizeBookingError(400, "Only accepted leads can be finalized into a booking");
    }
    if ((lead.paymentStatus || "Pending") !== "Paid") {
      throw new FinalizeBookingError(400, "Payment has not been completed for this lead yet");
    }

    const meta = readLeadMeta(lead);
    const room = sanitizeValue(roomId)
      ? await Resource.findById(sanitizeValue(roomId)).select("name pricePerHour pricePerNight type capacity").lean().exec()
      : await resolveRoomForLead(lead);
    const isStay = isStayVertical(lead, room);

    // Already finalized: return the existing booking instead of creating a
    // duplicate (the modal action is idempotent).
    if (lead.bookingId) {
      const existing = isStay
        ? await RoomStayBooking.findById(lead.bookingId).lean().exec()
        : await MeetingRoomBooking.findById(lead.bookingId).lean().exec();
      if (existing) {
        return {
          alreadyFinalized: true,
          body: {
            message: "Booking already finalized",
            booking: existing,
            lead: { _id: String(lead._id), ...lead.toObject() },
          },
        };
      }
    }

    if (!room) {
      throw new FinalizeBookingError(
        400,
        isStay
          ? "No room/dorm resource matched this lead — add the resource first or pass roomId"
          : "No meeting room resource matched this lead — add the room resource first or pass roomId",
      );
    }

    // MeetingRoomBooking/RoomStayBooking.workspaceId are ObjectId refs; the
    // lead stores it as a string, so make the mismatch a clean 400 instead
    // of a CastError.
    if (!/^[a-f\d]{24}$/i.test(String(lead.workspaceId || ""))) {
      throw new FinalizeBookingError(400, "Lead has no valid workspace reference to attach a booking to");
    }
    const baseAmount = Number(lead.paymentBaseAmount) || 0;

    if (isStay) {
      const { checkIn, checkOut, nights } = resolveStaySchedule(meta, bodyStart, bodyEnd);
      if (!checkIn || !checkOut) {
        throw new FinalizeBookingError(400, "Could not resolve the check-in/check-out dates for this lead — pass start and end");
      }
      const attendeeCount = Math.max(
        1,
        Math.trunc(Number(parseMoney(bodyAttendees ?? meta.attendees ?? meta.noOfPeople ?? 1))) || 1,
      );

      let bedNumber = null;
      let bedNumbers = [];
      if (room.type === "Dorm") {
        if (lead.stayHoldId) {
          const held = await RoomStayNightAllocation.find({
            holdId: lead.stayHoldId,
            expiresAt: { $gt: new Date() },
          }).select("bedNumber").lean().exec();
          bedNumbers = [...new Set(held.map((entry) => Number(entry.bedNumber)))].filter((bed) => bed > 0);
        } else {
          const taken = await RoomStayBooking.find({
            roomId: room._id,
            status: { $in: ROOM_STAY_OPEN_STATUSES },
            checkIn: { $lt: checkOut },
            checkOut: { $gt: checkIn },
          })
            .select("bedNumber bedNumbers")
            .lean()
            .exec();
          bedNumbers = allocateDormBeds(room.capacity || 1, taken, attendeeCount);
        }
        bedNumber = bedNumbers[0] ?? null;
        if (bedNumbers.length !== attendeeCount) {
          throw new FinalizeBookingError(409, `${room.name} does not have ${attendeeCount} beds available for that date range`);
        }
      } else {
        const conflict = await RoomStayBooking.findOne({
          roomId: room._id,
          bedNumber: null,
          status: { $in: ROOM_STAY_OPEN_STATUSES },
          checkIn: { $lt: checkOut },
          checkOut: { $gt: checkIn },
        })
          .select("bookingCode")
          .lean()
          .exec();
        if (conflict) {
          throw new FinalizeBookingError(409, `${room.name} is already booked (${conflict.bookingCode || ""}) for that date range`);
        }
      }

      const booking = await createRoomStayAtomically({
        holdId: sanitizeValue(lead.stayHoldId) || undefined,
        workspaceId: lead.workspaceId,
        roomId: room._id,
        roomType: room.type || "Room",
        bedNumber,
        bedNumbers,
        guestName: lead.fullName || "Website lead",
        guestEmail: sanitizeValue(lead.email),
        guestPhone: sanitizeValue(lead.mobileNumber),
        attendees: attendeeCount,
        checkIn,
        checkOut,
        nights: nights || 1,
        // Dorms are priced per bed; baseAmount already includes the bed
        // count (computeLeadPayment), so divide it back out for a true
        // per-bed-per-night rate — not nights * beds lumped together.
        ratePerNight: round2(baseAmount / ((nights || 1) * (room.type === "Dorm" ? Math.max(1, attendeeCount) : 1))),
        total: baseAmount,
        currency: lead.paymentCurrency || "INR",
        paymentMethod: "Online (Stripe)",
        amountPaid: baseAmount,
        status: "Booked",
        createdBy: sanitizeValue(actingUserId) ? actingUserId : null,
      });

      lead.bookingId = booking._id;
      lead.bookingCode = booking.bookingCode;
      lead.stayHoldId = "";
      lead.stayHoldExpiresAt = null;
      await lead.save();

      return {
        alreadyFinalized: false,
        body: {
          message: `${room.type === "Dorm" ? "Bed" : "Room"} booked — confirmation code ${booking.bookingCode}`,
          booking: booking.toObject(),
          lead: { _id: String(lead._id), ...lead.toObject() },
        },
      };
    }

    const { startDate, endDate } = resolveLeadSchedule(meta, bodyStart, bodyEnd);
    if (!startDate || !endDate || endDate <= startDate) {
      throw new FinalizeBookingError(400, "Could not resolve the booking start/end for this lead — pass start and end");
    }

    const conflict = await MeetingRoomBooking.findOne({
      roomId: room._id,
      status: { $nin: ["cancelled"] },
      start: { $lt: endDate },
      end: { $gt: startDate },
    })
      .select("bookingCode roomName start end")
      .lean()
      .exec();
    if (conflict) {
      throw new FinalizeBookingError(409, `${room.name} is already booked (${conflict.bookingCode || ""}) for that time slot`);
    }

    const attendeeCount = Math.max(
      1,
      Math.trunc(Number(parseMoney(bodyAttendees ?? meta.attendees ?? meta.noOfPeople ?? 1))) || 1,
    );
    const purpose = (sanitizeValue(meta.inquiryType) || "Meeting").slice(0, 1000);

    // bookingNumber/bookingCode are allocated globally (the model's
    // bookingCode index is unique across workspaces, not per-workspace) —
    // reuse the same retry-on-collision allocator the regular booking
    // flow uses instead of computing one locally, which caused an E11000
    // once another workspace had already taken that number.
    const booking = await createBookingWithUniqueCode({
      workspaceId: lead.workspaceId,
      roomId: room._id,
      ownerId: actingUserId,
      roomName: room.name,
      bookedByName: lead.fullName || "Website lead",
      bookedByEmail: sanitizeValue(lead.email),
      bookedByPhone: sanitizeValue(lead.mobileNumber),
      bookingType: "External",
      start: startDate,
      end: endDate,
      attendees: attendeeCount,
      purpose,
      bookingCredits: 0,
      subtotalBeforeDiscount: baseAmount,
      discountAmount: 0,
      taxableBaseAfterDiscount: baseAmount,
      baseAmount,
      gstAmount: 0,
      taxApplied: false,
      totalAmount: baseAmount,
      paymentStatus: "Paid",
      transactionId: sanitizeValue(lead.paymentTransactionId) || undefined,
      status: "confirmed",
    });

    lead.bookingId = booking._id;
    lead.bookingCode = booking.bookingCode;
    await lead.save();

    return {
      alreadyFinalized: false,
      body: {
        message: `Meeting room booked — confirmation code ${booking.bookingCode}`,
        booking: booking.toObject(),
        lead: { _id: String(lead._id), ...lead.toObject() },
      },
    };
};

// POST /api/leads/finalize-booking — lock an accepted, paid lead in as a real
// meeting-room booking (MRB booking code), or a real co-living/hostel stay.
// Gated behind paymentStatus "Paid". Now largely a safety net/manual retry —
// handlePaymentWebhook runs the same logic automatically the instant
// payment is confirmed, so this almost always finds alreadyFinalized=true.
export const finalizeLeadBooking = async (req, res) => {
  try {
    const { leadId, roomId, start: bodyStart, end: bodyEnd, attendees: bodyAttendees } =
      req.body || {};
    if (!sanitizeValue(leadId)) {
      return res.status(400).json({ message: "leadId is required" });
    }

    const hostWorkspaceId = sanitizeValue(
      req.body?.workspaceId || req.workspaceMembership?.workspace,
    );
    const lead = await WebsiteLead.findById(sanitizeValue(leadId)).exec();
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }
    if (
      hostWorkspaceId &&
      sanitizeValue(lead.escalatedWorkspaceId) !== hostWorkspaceId &&
      sanitizeValue(lead.workspaceId) !== hostWorkspaceId
    ) {
      return res
        .status(403)
        .json({ message: "Lead does not belong to this HostPanel workspace" });
    }

    const result = await runFinalizeLeadBooking(lead, { roomId, bodyStart, bodyEnd, bodyAttendees, actingUserId: req.user });
    return res.status(result.alreadyFinalized ? 200 : 201).json(result.body);
  } catch (error) {
    if (error instanceof FinalizeBookingError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("Finalize lead booking error:", error);
    return res.status(500).json({
      message: error?.message || "Failed to finalize the booking",
    });
  }
};

// GET /api/leads/booking-prefill — read-only. For a paid+accepted website
// lead, returns the fields a frontdesk check-in/badge flow needs to prefill
// (visitor identity, room, schedule, payment already settled) without
// creating anything — the frontdesk page is the one deciding what to do with
// this data (e.g. issuing a visitor badge), not this endpoint.
export const previewLeadBookingPrefill = async (req, res, next) => {
  try {
    const leadId = sanitizeValue(req.query?.leadId);
    if (!leadId) {
      return res.status(400).json({ message: "leadId is required" });
    }
    const hostWorkspaceId = sanitizeValue(
      req.query?.workspaceId || req.workspaceMembership?.workspace,
    );
    if (!hostWorkspaceId) {
      return res.status(400).json({ message: "A HostPanel workspace is required" });
    }
    const lead = await resolveLocalLeadForWorkspace(leadId, hostWorkspaceId);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }
    const ownsLead =
      sanitizeValue(lead.escalatedWorkspaceId) === hostWorkspaceId ||
      sanitizeValue(lead.workspaceId) === hostWorkspaceId;
    if (!ownsLead) {
      return res
        .status(403)
        .json({ message: "Lead does not belong to this HostPanel workspace" });
    }
    if ((lead.paymentStatus || "Pending") !== "Paid") {
      return res.status(400).json({ message: "This lead has not been paid yet" });
    }

    const meta = readLeadMeta(lead);
    const room = await resolveRoomForLead(lead);
    const isStay = isStayVertical(lead, room);
    const { startDate, endDate } = isStay
      ? (() => {
          const stay = resolveStaySchedule(meta, null, null);
          return { startDate: stay.checkIn, endDate: stay.checkOut };
        })()
      : resolveLeadSchedule(meta, null, null);
    const attendeeCount = Math.max(
      1,
      Math.trunc(Number(parseMoney(meta.attendees ?? meta.noOfPeople ?? lead.noOfPeople ?? 1))) || 1,
    );

    return res.status(200).json({
      leadId: String(lead._id),
      fullName: lead.fullName || "",
      phone: lead.mobileNumber || "",
      email: lead.email || "",
      companyName: lead.companyName || "",
      purpose: sanitizeValue(meta.inquiryType) || (isStay ? "Stay" : "Meeting"),
      notes: lead.message || "",
      attendees: attendeeCount,
      resourceId: room?._id ? String(room._id) : "",
      resourceName:
        room?.name || sanitizeValue(meta.roomType || meta.dormType || meta.room || meta.roomName || meta.packageName) || "",
      spaceType: room?.type || (isStay ? "Room" : "Meeting Room"),
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
      // Already settled via Stripe at Accept time — frontdesk should not
      // collect payment again, just show it as paid.
      alreadyPaid: true,
      paymentStatus: "Paid",
      paymentMode: "Online (Stripe)",
      amount: Number(lead.paymentTotalAmount) || 0,
      baseAmount: Number(lead.paymentBaseAmount) || 0,
      currency: lead.paymentCurrency || "USD",
      transactionId: lead.paymentTransactionId || "",
      bookingCode: lead.bookingCode || "",
      invoiceSentToWono: Boolean(lead.invoiceSentToWono),
    });
  } catch (error) {
    next(error);
  }
};

const resolveCompanyIdFromWorkspace = async (workspaceId) => {
  const normalizedWorkspaceId = sanitizeValue(workspaceId);
  if (!normalizedWorkspaceId) return "";

  const template = await WebsiteTemplate.findOne({ workspaceId: normalizedWorkspaceId })
    .select("companyId")
    .lean()
    .exec();
  const templateCompanyId = sanitizeValue(template?.companyId);
  if (templateCompanyId && !isSyntheticCompanyId(templateCompanyId)) {
    return templateCompanyId;
  }

  const workspace = await Workspace.findById(normalizedWorkspaceId)
    .select("company companyId")
    .lean()
    .exec();
  if (workspace?.company) {
    const linkedCompany = await Company.findById(workspace.company)
      .select("companyId")
      .lean()
      .exec();
    const linkedCompanyId = sanitizeValue(linkedCompany?.companyId);
    if (linkedCompanyId) return linkedCompanyId;
  }

  return sanitizeValue(workspace?.companyId);
};

const resolveWorkspaceIdFromCompany = async (companyId) => {
  const normalizedCompanyId = sanitizeValue(companyId);
  if (!normalizedCompanyId) return "";

  const template = await WebsiteTemplate.findOne({ companyId: normalizedCompanyId })
    .select("workspaceId")
    .lean()
    .exec();
  if (template?.workspaceId) return sanitizeValue(template.workspaceId);

  const company = await Company.findOne({ companyId: normalizedCompanyId })
    .select("_id")
    .lean()
    .exec();
  if (company?._id) {
    const workspace = await Workspace.findOne({ company: company._id })
      .select("_id")
      .lean()
      .exec();
    if (workspace?._id) return sanitizeValue(workspace._id);
  }

  const workspaceByCompanyId = await Workspace.findOne({ companyId: normalizedCompanyId })
    .select("_id")
    .lean()
    .exec();
  return sanitizeValue(workspaceByCompanyId?._id);
};

// GET /api/leads/invoices — this workspace's own "Send Invoice to WONO"
// requests, for the stat cards (sum of Requested = invoiced, sum of Paid =
// received). "Paid" only ever flips when staff mark it so in Master Panel —
// WONO pays out by bank transfer, no automatic signal — so this can sit at
// $0 received for a long time; that's expected, not a bug.
export const getHostInvoices = async (req, res, next) => {
  try {
    const hostWorkspaceId = sanitizeValue(
      req.query?.workspaceId || req.workspaceMembership?.workspace,
    );
    if (!hostWorkspaceId) {
      return res.status(400).json({ message: "A HostPanel workspace is required" });
    }
    const invoices = await HostInvoiceRequest.find({ workspaceId: hostWorkspaceId })
      .sort({ requestedAt: -1 })
      .lean()
      .exec();
    return res.status(200).json({ invoices });
  } catch (error) {
    next(error);
  }
};

// GET /api/leads/plan-limit — how many website leads this workspace's plan
// lets the host see. The actual lead list is still fetched from getLeads;
// the frontend truncates it to this limit and shows a "request more" banner
// for the rest. null limit = unlimited (custom plan).
export const getLeadPlanLimit = async (req, res, next) => {
  try {
    const hostWorkspaceId = sanitizeValue(
      req.query?.workspaceId || req.workspaceMembership?.workspace,
    );
    if (!hostWorkspaceId) {
      return res.status(400).json({ message: "A HostPanel workspace is required" });
    }
    const companyId = await resolveCompanyIdFromWorkspace(hostWorkspaceId);
    const subscription = await WorkspaceSubscription.findOne({
      companyId,
      workspaceId: hostWorkspaceId,
    })
      .select("plan")
      .lean()
      .exec();
    const plan = subscription?.plan || "basic";
    const limits = await fetchLeadLimitsFromMasterPanel();
    return res.status(200).json({ plan, limit: leadLimitForPlan(limits, plan) });
  } catch (error) {
    next(error);
  }
};

// POST /api/leads/request-more-leads — host hit the plan's lead cap and
// wants to be contacted about upgrading. Best-effort email to the WONO
// sales inbox; never blocks on mail failure.
export const requestMoreLeads = async (req, res, next) => {
  try {
    const hostWorkspaceId = sanitizeValue(
      req.body?.workspaceId || req.workspaceMembership?.workspace,
    );
    if (!hostWorkspaceId) {
      return res.status(400).json({ message: "A HostPanel workspace is required" });
    }
    const companyId = await resolveCompanyIdFromWorkspace(hostWorkspaceId);
    const subscription = await WorkspaceSubscription.findOne({
      companyId,
      workspaceId: hostWorkspaceId,
    })
      .select("plan")
      .lean()
      .exec();
    const plan = subscription?.plan || "basic";
    const hostUser = await HostUser.findById(req.user).select("name email").lean().exec();
    const salesInbox = sanitizeValue(process.env.LEAD_UPGRADE_REQUEST_EMAIL) || "response@wono.co";

    sendMail({
      to: salesInbox,
      subject: `Lead quota upgrade request — ${companyId || hostWorkspaceId}`,
      text: `Host "${hostUser?.name || "Unknown"}" (${hostUser?.email || "no email"}) on workspace ${hostWorkspaceId} (company ${companyId || "n/a"}) is on the "${plan}" plan and wants more website leads.`,
    }).catch((error) => console.error("Lead quota upgrade request email failed:", error?.message || error));

    return res.status(200).json({ message: "Request sent — our team will reach out shortly." });
  } catch (error) {
    next(error);
  }
};

// POST /api/leads/payment-webhook — MasterPanel calls this the instant
// Stripe confirms a booking payment (checkout.session.completed), instead
// of HostPanel only finding out whenever someone next loads the Leads page
// (getLeads' pull below). Protected by verifyMasterPanelServiceKey, the
// reverse of masterPanelHeaders() used for the other direction.
export const handlePaymentWebhook = async (req, res, next) => {
  try {
    const leadId = sanitizeValue(req.body?.leadId);
    const status = sanitizeValue(req.body?.status).toLowerCase();
    if (!leadId) {
      return res.status(400).json({ message: "leadId is required" });
    }
    if (status !== "paid") {
      // Nothing else currently needs pushing (e.g. a failed/expired link) —
      // acknowledge so MasterPanel doesn't retry, just don't update anything.
      return res.status(200).json({ message: "Ignored — not a paid event" });
    }

    const lead = await WebsiteLead.findById(leadId).exec();
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Still set/refresh these even if already Paid (e.g. a Stripe webhook
    // retry) — but critically, do NOT early-return on that: a retry must
    // still reach the finalize call below, in case the first attempt set
    // paymentStatus but then finalize itself failed (hold race, etc.) —
    // this is the retry's only chance to actually create the booking.
    if (lead.paymentStatus !== "Paid") {
      lead.paymentStatus = "Paid";
      lead.paymentStatusUpdatedAt = new Date();
      const currency = sanitizeValue(req.body?.currency).toUpperCase();
      if (currency) lead.paymentCurrency = currency;
      const amount = Number(req.body?.amount);
      if (Number.isFinite(amount) && amount > 0) lead.paymentTotalAmount = amount;
      const transactionId = sanitizeValue(req.body?.transactionId);
      if (transactionId) lead.paymentTransactionId = transactionId;
      await lead.save();
    }

    // Convert the hold into a real, confirmed booking right now — a
    // customer must never be left charged with nothing actually locked in,
    // waiting on a host to notice and click "Create Booking" later (the
    // 35-minute hold can expire and lose the slot to someone else first).
    // Best-effort: if this fails (e.g. the slot was somehow taken in the
    // meantime), the payment status update above still stands, and staff
    // can retry finalize manually from CompanyLeads — but this should be
    // rare since the hold exists specifically to prevent that.
    let bookingResult = null;
    try {
      const workspaceDoc = await Workspace.findById(lead.workspaceId).select("owner").lean().exec();
      const result = await runFinalizeLeadBooking(lead, {
        actingUserId: workspaceDoc?.owner ? String(workspaceDoc.owner) : null,
      });
      bookingResult = result.body?.booking || null;
    } catch (error) {
      console.error(
        "Auto-finalize on payment webhook failed — lead is Paid but no booking was created automatically; finalize manually from CompanyLeads:",
        error?.message || error,
      );
    }

    return res.status(200).json({ message: "Lead payment status updated", booking: bookingResult });
  } catch (error) {
    next(error);
  }
};

export const getLeads = async (req, res, next) => {
  try {
    const leadScope = sanitizeValue(req.query?.leadScope).toLowerCase();
    const search = sanitizeValue(req.query?.search);
    const limit = req.query?.limit;
    const isNomadsScope = leadScope === "nomads";
    const requestedWorkspaceId =
      sanitizeValue(req.query?.workspaceId) ||
      sanitizeValue(req.workspaceMembership?.workspace);
    const requestedCompanyId = sanitizeValue(req.query?.companyId);

    // Website leads use workspace as the strongest tenant boundary. Nomads data,
    // like Nomads reviews, stays company-scoped because upstream records may not
    // carry a HostPanel workspace id.
    let companyId = isNomadsScope ? requestedCompanyId : "";
    if (!companyId && requestedWorkspaceId) {
      companyId = await resolveCompanyIdFromWorkspace(requestedWorkspaceId);
    }

    // Fallback to explicit companyId only when workspace context is unavailable.
    if (!companyId) {
      companyId = requestedCompanyId;
    }

    if (!companyId) {
      return res.status(400).json({
        message: "Company ID is required (or provide a valid workspaceId)",
      });
    }

    const targetWorkspaceId =
      requestedWorkspaceId || (await resolveWorkspaceIdFromCompany(companyId));

    if (!targetWorkspaceId) {
      return res.status(400).json({
        message: "A HostPanel workspace is required to fetch escalated leads",
      });
    }

    const localLeadQuery = {
      ...(!isNomadsScope
        ? { workspaceId: targetWorkspaceId }
        : { companyId }),
      isEscalated: true,
      escalatedWorkspaceId: targetWorkspaceId,
    };

    const localLeads = await WebsiteLead.find(localLeadQuery)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const mappedLocal = filterLeadsByScope(localLeads, leadScope).map((lead, index) => ({
      _id: String(lead._id),
      srNo: index + 1,
      fullName: lead.fullName,
      source: lead.source || "website",
      vertical: sanitizeValue(lead.vertical) || "co-working",
      productType: lead.productType || "",
      noOfPeople: lead.noOfPeople || "",
      mobileNumber: lead.mobileNumber || "",
      email: lead.email || "",
      status: lead.status || "Pending",
      hostPanelStatus: lead.hostPanelStatus || "Pending",
      hostPanelStatusUpdatedAt: lead.hostPanelStatusUpdatedAt || null,
      paymentStatus: lead.paymentStatus || "Pending",
      paymentCurrency: lead.paymentCurrency || "USD",
      paymentSubtotalAmount: Number(lead.paymentSubtotalAmount) || 0,
      discountType: lead.discountType || "amount",
      discountValue: Number(lead.discountValue) || 0,
      discountAmount: Number(lead.discountAmount) || 0,
      paymentBaseAmount: Number(lead.paymentBaseAmount) || 0,
      paymentPlatformFeePercent: Number(lead.paymentPlatformFeePercent) || PLATFORM_FEE_PERCENT,
      paymentPlatformFeeAmount: Number(lead.paymentPlatformFeeAmount) || 0,
      paymentStripeFeePercent: Number(lead.paymentStripeFeePercent) || STRIPE_PROCESSING_FEE_PERCENT,
      paymentStripeFeeAmount: Number(lead.paymentStripeFeeAmount) || 0,
      paymentTotalAmount: Number(lead.paymentTotalAmount) || 0,
      paymentTransactionId: lead.paymentTransactionId || "",
      bookingId: lead.bookingId ? String(lead.bookingId) : "",
      bookingCode: lead.bookingCode || "",
      invoiceSentToWono: Boolean(lead.invoiceSentToWono),
      comment: lead.comment || "",
      recievedDate: lead.createdAt,
      companyName: lead.companyName || "",
      companyId: lead.companyId || "",
      isEscalated: lead.isEscalated === true,
      escalatedWorkspaceId: lead.escalatedWorkspaceId || "",
      escalatedHostCompanyId: lead.escalatedHostCompanyId || "",
      escalatedAt: lead.escalatedAt || null,
      ...(lead?.leadMeta && typeof lead.leadMeta === "object" ? lead.leadMeta : {}),
    }));

    if (mappedLocal.length > 0) {
      try {
        const paymentResponse = await axios.get(
          `${MASTER_PANEL_BASE_URL}/api/hostpanel/booking-payment-links`,
          {
            headers: masterPanelHeaders(),
            params: { leadIds: mappedLocal.map((lead) => lead._id).join(",") },
            timeout: 5000,
          },
        );
        const statusByLeadId = paymentResponse?.data || {};
        const paidLeadIds = [];
        for (const lead of mappedLocal) {
          const paymentRecord = statusByLeadId[lead._id];
          if (paymentRecord?.status !== "paid") continue;
          lead.paymentStatus = "Paid";
          lead.paymentCurrency = sanitizeValue(paymentRecord.currency).toUpperCase() || lead.paymentCurrency;
          lead.paymentTotalAmount = Number(paymentRecord.amount) || lead.paymentTotalAmount;
          paidLeadIds.push(lead._id);
        }
        if (paidLeadIds.length > 0) {
          await WebsiteLead.updateMany(
            { _id: { $in: paidLeadIds }, paymentStatus: { $ne: "Paid" } },
            { $set: { paymentStatus: "Paid", paymentStatusUpdatedAt: new Date() } },
          ).exec();
        }
      } catch (error) {
        console.warn(
          "Unable to refresh lead payment statuses from Master Panel:",
          error?.response?.data?.message || error?.message || error,
        );
      }
    }

    try {
      // Nomads leads are company-scoped (see the note above): a listing that
      // was Transferred from an existing company carries the linked Nomads
      // companyId on its leads, while the escalation stamps this host's own
      // companyId as escalatedHostCompanyId — so ask for both. Workspace is
      // deliberately not a filter here: a host with several workspaces would
      // otherwise miss leads escalated to a different one than is open.
      const nomadsCompanyIds = [companyId];
      if (isNomadsScope) {
        const ownCompany = await Company.findOne({ companyId })
          .select("linkedNomadsCompanyId")
          .lean()
          .exec();
        const linkedId = sanitizeValue(ownCompany?.linkedNomadsCompanyId);
        if (linkedId && linkedId !== companyId) nomadsCompanyIds.push(linkedId);
      }

      const responses = await Promise.all(
        nomadsCompanyIds.map((id) =>
          axios.get(nomadsApiUrl("/api/company/leads"), {
            params: {
              companyId: id,
              isEscalated: true,
              ...(isNomadsScope ? {} : { workspaceId: targetWorkspaceId }),
            },
            // Without a bound, a slow/unresponsive Nomads backend blocks this
            // request indefinitely — already caught below and falls back to
            // mappedLocal, so a short timeout just makes that fallback fast.
            timeout: 5000,
          }),
        ),
      );

      const seen = new Set();
      const rawRemote = responses
        .flatMap((response) =>
          Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.data?.leads)
              ? response.data.leads
              : [],
        )
        .filter((lead) => {
          const key = String(lead?._id || "");
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });

      const escalatedRemote = isNomadsScope
        ? rawRemote.filter((lead) => lead?.isEscalated === true)
        : filterEscalatedLeadsForWorkspace(rawRemote, targetWorkspaceId);
      const remote = filterLeadsByScope(escalatedRemote, leadScope).sort((a, b) => {
        const aDate = new Date(a?.recievedDate || a?.receivedDate || a?.createdAt || 0).getTime();
        const bDate = new Date(b?.recievedDate || b?.receivedDate || b?.createdAt || 0).getTime();
        return bDate - aDate;
      });
      if (remote.length > 0) {
        const localById = new Map(mappedLocal.map((lead) => [sanitizeValue(lead._id), lead]));
        const mergedRemote = remote.map((lead) => {
          const local = localById.get(sanitizeValue(lead?._id));
          if (!local) return lead;
          return {
            ...lead,
            hostPanelStatus: local.hostPanelStatus,
            hostPanelStatusUpdatedAt: local.hostPanelStatusUpdatedAt,
            paymentStatus: local.paymentStatus,
            paymentCurrency: local.paymentCurrency,
            paymentSubtotalAmount: local.paymentSubtotalAmount,
            discountType: local.discountType,
            discountValue: local.discountValue,
            discountAmount: local.discountAmount,
            paymentBaseAmount: local.paymentBaseAmount,
            paymentPlatformFeePercent: local.paymentPlatformFeePercent,
            paymentPlatformFeeAmount: local.paymentPlatformFeeAmount,
            paymentStripeFeePercent: local.paymentStripeFeePercent,
            paymentStripeFeeAmount: local.paymentStripeFeeAmount,
            paymentTotalAmount: local.paymentTotalAmount,
            paymentTransactionId: local.paymentTransactionId,
            bookingId: local.bookingId,
            bookingCode: local.bookingCode,
            invoiceSentToWono: local.invoiceSentToWono,
            comment: local.comment,
          };
        });
        return res.status(200).json(filterLeadSearchResults(mergedRemote, search, limit));
      }
    } catch (error) {
      // fall back to local leads
    }

    return res.status(200).json(filterLeadSearchResults(mappedLocal, search, limit));
  } catch (error) {
    console.error("Get Leads Error:", error);

    // Handle Axios errors (from external API)
    if (error.response) {
      // The external API responded with an error status code
      const statusCode = error.response.status;
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        "Failed to fetch leads";

      console.error(`External API error (${statusCode}):`, errorMessage);

      return res.status(statusCode).json({
        message: errorMessage,
        error: "External API error",
      });
    } else if (error.request) {
      // The request was made but no response was received (network error, timeout, etc.)
      console.error("No response from external API:", error.message);

      return res.status(503).json({
        message: "External API is not responding. Please try again later.",
        error: "Service unavailable",
      });
    } else {
      // Something else happened
      // console.error("Unexpected error:", error.message);

      return res.status(500).json({
        message: "An unexpected error occurred",
        error: error.message,
      });
    }
  }
};

// ---------------------------------------------------------------------------
// Host panel accept/reject + payment step.
//
// Accepting a lead locks the booking price in on the lead itself:
//   base = room/service hourly rate x booked duration
//   platform fee = 5% of base (reference: $300 base + $15 fee = $315 total)
// The guest then pays the total through the payment flow (provider wiring is
// its own step), and once paymentStatus is "Paid" the lead can be finalized
// into a real MeetingRoomBooking (MRB booking code).
// "Accepted"/"Rejected" are HostPanel-local decisions: the upstream Nomads
// sync in updateLeads stays untouched for "Pending"/"Closed"/comments.
// ---------------------------------------------------------------------------

const PLATFORM_FEE_PERCENT = 7;
const STRIPE_PROCESSING_FEE_PERCENT = 0;
const LEAD_PAYMENT_CURRENCY = sanitizeValue(process.env.LEAD_PAYMENT_CURRENCY) || "USD";
const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
const NEW_HOST_PANEL_STATUSES = ["Accepted", "Rejected"];
const ALL_HOST_PANEL_STATUSES = ["Pending", "Accepted", "Rejected", "Closed"];

// WoNo platform fee (7% — folds in what used to be a separate 2% Stripe
// processing fee) on top of whatever base amount is being charged —
// host-entered or auto-calculated alike.
const applyFees = (base) => {
  const platformFeeAmount = round2((base * PLATFORM_FEE_PERCENT) / 100);
  const stripeFeeAmount = round2((base * STRIPE_PROCESSING_FEE_PERCENT) / 100);
  return {
    base,
    platformFeePercent: PLATFORM_FEE_PERCENT,
    platformFeeAmount,
    stripeFeePercent: STRIPE_PROCESSING_FEE_PERCENT,
    stripeFeeAmount,
    total: round2(base + platformFeeAmount + stripeFeeAmount),
  };
};

// Host-given discount, applied to the base BEFORE platform/Stripe fees are
// calculated (so fees are charged on what the client actually pays, not the
// pre-discount price). Clamped so a bad input can never make the base negative.
const computeDiscount = (base, discountType, discountValue) => {
  const type = discountType === "percent" ? "percent" : "amount";
  const value = Math.max(0, Number(discountValue) || 0);
  const discountAmount =
    type === "percent" ? round2((base * Math.min(value, 100)) / 100) : round2(Math.min(value, base));
  return { discountType: type, discountValue: value, discountAmount };
};

const parseMoney = (value) => {
  const match = String(value ?? "").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : NaN;
};

const resolveLeadCurrency = (meta) => {
  const explicit = sanitizeValue(meta.currency || meta.currencyCode).toUpperCase();
  if (/^[A-Z]{3}$/.test(explicit)) return explicit;
  const rawPrice = sanitizeValue(
    meta.price ?? meta.amount ?? meta.hourlyRate ?? meta.pricePerHour,
  );
  if (rawPrice.includes("₹")) return "INR";
  if (rawPrice.includes("€")) return "EUR";
  if (rawPrice.includes("£")) return "GBP";
  if (rawPrice.includes("$")) return "USD";
  return LEAD_PAYMENT_CURRENCY;
};

// "3 hours" -> 3, "90 min" -> 1.5, "2 days" -> 48, "3" -> 3
const parseDurationHours = (value) => {
  const raw = String(value ?? "").toLowerCase();
  if (!raw) return NaN;
  if (
    !/(min|hour|hr|day)/.test(raw) &&
    !/^\s*\d+(?:\.\d+)?\s*$/.test(raw)
  ) {
    return NaN;
  }
  const number = parseMoney(raw);
  if (!Number.isFinite(number)) return NaN;
  if (raw.includes("min")) return round2(number / 60);
  if (raw.includes("day")) return number * 24;
  return number;
};

// "14:00" -> 14, "2:30 pm" -> 14.5, "14" -> 14
const parseClockHour = (value) => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return NaN;
  const clock = raw.match(/(\d{1,2})(?:[:.](\d{2}))?/);
  let hour = clock ? Number(clock[1]) : NaN;
  if (!Number.isFinite(hour)) return NaN;
  if (/(pm|p\.m)/.test(raw) && hour < 12) hour += 12;
  if (/(am|a\.m)/.test(raw) && hour === 12) hour = 0;
  return hour + (Number(clock[2]) || 0) / 60;
};

// Hours between a "14:00" style start slot and an optional end slot.
const hoursFromSlots = (startSlot, endValue) => {
  const start = parseClockHour(startSlot);
  if (!Number.isFinite(start)) return NaN;
  let end = parseClockHour(endValue);
  // No explicit end: assume a 1-hour slot.
  if (!Number.isFinite(end)) end = start + 1;
  if (end <= start) end += 24;
  return round2(end - start);
};

const readLeadMeta = (lead) =>
  lead?.leadMeta && typeof lead.leadMeta === "object" && !Array.isArray(lead.leadMeta)
    ? lead.leadMeta
    : {};

// End slot may come as endTime directly or inside the slot label ("14:00 - 17:00").
const resolveSlotRange = (meta) => {
  const slot = sanitizeValue(meta.timeSlot || meta.slot || meta.preferredTime);
  if (!slot) return { start: "", end: "" };
  const inline = slot.match(
    /(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|a\.m|p\.m)?)\s*(?:-|–|—|to|→)\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|a\.m|p\.m)?)/i,
  );
  return inline
    ? { start: inline[1], end: inline[2] }
    : { start: sanitizeValue(meta.startTime) || slot, end: sanitizeValue(meta.endTime) };
};

const buildRoomNameRegex = (name) =>
  new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

// Hourly rate: prefer an explicit rate on the lead meta (public booking forms
// that price the session), otherwise fall back to the workspace's Resource
// (meeting room) whose name matches the requested room/product.
const resolveRoomForLead = async (lead) => {
  const meta = readLeadMeta(lead);
  const candidates = [
    meta.roomType, meta.room, meta.roomName, meta.packageName, meta.productType,
    meta.product, lead?.productType,
  ].map(sanitizeValue).filter(Boolean);
  const workspaceId = sanitizeValue(lead?.workspaceId);
  if (!workspaceId || candidates.length === 0) return null;

  // Exact name match first (e.g. "Huddle Room"), then a substring match.
  for (const mode of ["exact", "fuzzy"]) {
    try {
      const room = await Resource.findOne({
        workspaceId,
        status: "Active",
        isActive: { $ne: false },
        $or: candidates.map((name) =>
          mode === "exact" ? { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } : { name: buildRoomNameRegex(name) },
        ),
      })
        .sort({ _id: 1 })
        .select("name type pricePerHour pricePerDay pricePerNight capacity location floor wing")
        .lean()
        .exec();
      if (room) return room;
    } catch {
      try {
        // Fall back to fetching candidates and matching in memory if the
        // regex ever fails to build.
        const rooms = await Resource.find({ workspaceId, status: "Active" })
          .select("name type pricePerHour pricePerDay pricePerNight capacity location floor wing")
          .lean()
          .exec();
        const lower = candidates.map((name) => name.toLowerCase());
        const matched = rooms.find(
          (room) =>
            lower.includes(String(room.name).trim().toLowerCase()) ||
            lower.some((name) => String(room.name).toLowerCase().includes(name) || name.includes(String(room.name).toLowerCase())),
        );
        if (matched) return matched;
      } catch {
        return null;
      }
    }
  }
  return null;
};

const websiteSlotDate = (dateValue, timeValue) => {
  const date = sanitizeValue(dateValue).slice(0, 10);
  const time = sanitizeValue(timeValue).replace(/\s+/g, "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}$/.test(time)) return null;
  const parsed = new Date(`${date}T${time.padStart(5, "0")}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const checkPublicBookingAvailability = async (req, res) => {
  try {
    const workspaceId = sanitizeValue(req.body?.workspaceId || req.query?.workspaceId);
    const roomName = sanitizeValue(
      req.body?.roomName || req.body?.roomType || req.body?.productType || req.query?.roomName,
    );
    if (!workspaceId || !roomName) {
      return res.status(400).json({
        message: "workspaceId and roomName are required",
      });
    }

    const room = await Resource.findOne({
      workspaceId,
      status: "Active",
      isActive: { $ne: false },
      name: new RegExp(`^${roomName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    }).select("name type capacity").lean().exec();
    if (!room) return res.status(404).json({ message: "Bookable resource not found" });

    if (room.type === "Room" || room.type === "Dorm") {
      const stay = resolveStaySchedule({ startDate: req.body?.startDate, endDate: req.body?.endDate }, null, null);
      if (!stay.checkIn || !stay.checkOut) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }
      const overlaps = await RoomStayBooking.find({
        roomId: room._id,
        status: { $in: ROOM_STAY_OPEN_STATUSES },
        checkIn: { $lt: stay.checkOut },
        checkOut: { $gt: stay.checkIn },
      }).select("bookingCode bedNumber bedNumbers").lean().exec();
      const publicDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const activeHolds = await RoomStayNightAllocation.find({
        roomId: room._id,
        dateKey: { $gte: publicDateKey(stay.checkIn), $lt: publicDateKey(stay.checkOut) },
        expiresAt: { $gt: new Date() },
      }).select("bedNumber").lean().exec();
      const requestedBeds = Math.max(1, Math.trunc(Number(req.body?.attendees || req.body?.people || req.body?.noOfPeople || 1)) || 1);
      // Dorm: bed-count allocation. Room (co-living): not split into beds,
      // but the host-set occupancy capacity still caps how many guests can
      // stay in it at once — a date-free room is still unavailable if the
      // party is bigger than it sleeps.
      const available = room.type === "Dorm"
        ? allocateDormBeds(room.capacity || 1, [...overlaps, ...activeHolds.map((entry) => ({ bedNumber: entry.bedNumber }))], requestedBeds).length === requestedBeds
        : overlaps.length === 0 && activeHolds.length === 0 && requestedBeds <= Math.max(1, Number(room.capacity) || 1);
      return res.status(200).json({
        available,
        roomName: room.name,
        start: stay.checkIn.toISOString(),
        end: stay.checkOut.toISOString(),
        requestedBeds: room.type === "Dorm" ? requestedBeds : undefined,
        capacity: room.capacity,
      });
    }

    const date = req.body?.startDate || req.body?.date || req.query?.startDate;
    const start = websiteSlotDate(date, req.body?.startTime || req.body?.timeSlot || req.query?.startTime);
    const end = websiteSlotDate(date, req.body?.endTime || req.query?.endTime);
    if (!start || !end || end <= start) {
      return res.status(400).json({ message: "startDate, startTime and endTime are required" });
    }

    const conflict = await MeetingRoomBooking.findOne({
      roomId: room._id,
      status: { $nin: ["cancelled"] },
      start: { $lt: end },
      end: { $gt: start },
    }).select("_id").lean().exec();
    return res.status(200).json({
      available: !conflict,
      roomName: room.name,
      start: start.toISOString(),
      end: end.toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Unable to check availability" });
  }
};

export const listPublicBookingsForNomad = async (req, res) => {
  try {
  const configuredSecret = sanitizeValue(process.env.BOOKING_SYNC_SECRET);
  const suppliedSecret = sanitizeValue(req.headers?.["x-booking-sync-secret"]);
  if (!configuredSecret) {
    return res.status(503).json({ message: "Booking sync is not configured" });
  }
  if (!suppliedSecret || suppliedSecret !== configuredSecret) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = sanitizeValue(req.query?.token);
  const accountEmail = sanitizeValue(req.query?.email).toLowerCase();
  let access = null;
  if (token) {
    const [encodedPayload, suppliedSignature] = token.split(".");
    if (!encodedPayload || !suppliedSignature) {
      return res.status(400).json({ message: "Invalid booking link" });
    }
    const expectedSignature = crypto.createHmac("sha256", configuredSecret).update(encodedPayload).digest("base64url");
    const validSignature = suppliedSignature.length === expectedSignature.length &&
      crypto.timingSafeEqual(Buffer.from(suppliedSignature), Buffer.from(expectedSignature));
    if (!validSignature) return res.status(401).json({ message: "Invalid booking link" });
    try {
      access = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    } catch {
      return res.status(400).json({ message: "Invalid booking link" });
    }
    if (!access?.bookingId || Number(access.expiresAt || 0) < Date.now()) {
      return res.status(401).json({ message: "Booking link has expired" });
    }
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail)) {
    return res.status(400).json({ message: "A valid account email is required" });
  }

  const emailFilter = access ? sanitizeValue(access.email).toLowerCase() : accountEmail;
  const [meetingBookings, stayBookings] = await Promise.all([
    MeetingRoomBooking.find({
      ...(access?.bookingId ? { _id: access.bookingId } : {}),
      bookingType: "External",
      bookedByEmail: emailFilter,
    })
      .select("bookingCode roomName roomId start end attendees status paymentStatus totalAmount currency workspaceId createdAt")
      .populate("roomId", "name location floor wing")
      .limit(access ? 1 : 100)
      .lean()
      .exec(),
    RoomStayBooking.find({
      ...(access?.bookingId ? { _id: access.bookingId } : {}),
      guestEmail: emailFilter,
    })
      .select("bookingCode roomId roomType bedNumbers checkIn checkOut attendees status amountPaid total currency workspaceId createdAt")
      .populate("roomId", "name location floor wing")
      .limit(access ? 1 : 100)
      .lean()
      .exec(),
  ]);
  const bookings = [
    ...meetingBookings.map((booking: any) => ({ ...booking, serviceType: "meeting-room" })),
    ...stayBookings.map((booking: any) => ({
      ...booking,
      serviceType: booking.roomType === "Dorm" ? "hostel" : "co-living",
      roomName: booking.roomId?.name || booking.roomType,
      start: booking.checkIn,
      end: booking.checkOut,
      status: booking.status === "Checked-out" ? "completed" : booking.status === "Cancelled" ? "cancelled" : "confirmed",
      paymentStatus: Number(booking.amountPaid || 0) >= Number(booking.total || 0) ? "Paid" : "Pending",
      totalAmount: booking.total,
    })),
  ]
    .sort((a: any, b: any) => new Date(b.start || b.createdAt).getTime() - new Date(a.start || a.createdAt).getTime())
    .slice(0, access ? 1 : 100);

  const bookingIds = bookings.map((booking) => booking._id);
  const leads = bookingIds.length
    ? await WebsiteLead.find({ bookingId: { $in: bookingIds } })
        .select("bookingId companyName leadMeta")
        .lean()
        .exec()
    : [];
  const websiteByBookingId = new Map(
    leads.map((lead) => [
      String(lead.bookingId || ""),
      sanitizeValue(lead?.leadMeta?.websiteUrl || lead?.leadMeta?.siteUrl),
    ]),
  );
  const leadByBookingId = new Map(leads.map((lead) => [String(lead.bookingId || ""), lead]));

    return res.status(200).json({
    bookings: bookings.map((booking) => {
      const leadMeta = leadByBookingId.get(String(booking._id))?.leadMeta || {};
      const hostCompanyName = sanitizeValue(
        leadByBookingId.get(String(booking._id))?.companyName,
      );
      const firstImage = Array.isArray(leadMeta.images)
        ? leadMeta.images[0]
        : null;
      const imageUrl = sanitizeValue(
        leadMeta.roomImage ||
        leadMeta.imageUrl ||
        leadMeta.image ||
        (typeof firstImage === "string" ? firstImage : firstImage?.url),
      );
      const room = booking.roomId && typeof booking.roomId === "object" ? booking.roomId : {};
      const location = sanitizeValue(
        leadMeta.location ||
        room.location ||
        [room.floor, room.wing].filter(Boolean).join(", "),
      );
      return ({
      id: String(booking._id),
      bookingCode: booking.bookingCode,
      hostCompanyName,
      roomName: booking.roomName,
      start: booking.start,
      end: booking.end,
      attendees: booking.attendees,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      serviceType: booking.serviceType,
      bedNumbers: booking.bedNumbers || [],
      imageUrl,
      location,
      rescheduleUrl: websiteByBookingId.get(String(booking._id)) || "",
      });
    }),
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Unable to load bookings" });
  }
};

export const reschedulePublicNomadBooking = async (req, res) => {
  try {
    const configuredSecret = sanitizeValue(process.env.BOOKING_SYNC_SECRET);
    const suppliedSecret = sanitizeValue(req.headers?.["x-booking-sync-secret"]);
    if (!configuredSecret) return res.status(503).json({ message: "Booking sync is not configured" });
    if (!suppliedSecret || suppliedSecret !== configuredSecret) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const bookingId = sanitizeValue(req.params?.id);
    const email = sanitizeValue(req.body?.email).toLowerCase();
    const newStart = new Date(req.body?.start);
    const newEnd = new Date(req.body?.end);
    if (!bookingId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Booking and account email are required" });
    }
    if (
      Number.isNaN(newStart.getTime()) ||
      Number.isNaN(newEnd.getTime()) ||
      newStart.getTime() <= Date.now() ||
      newEnd <= newStart
    ) {
      return res.status(400).json({ message: "Choose a valid future start and end time" });
    }

    const booking = await MeetingRoomBooking.findOne({
      _id: bookingId,
      bookingType: "External",
      bookedByEmail: email,
      status: { $nin: ["cancelled", "completed"] },
    }).exec();
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const previousStart = new Date(booking.start);
    const previousEnd = new Date(booking.end);
    const durationMs = previousEnd.getTime() - previousStart.getTime();
    if (durationMs <= 0) return res.status(400).json({ message: "Booking duration is invalid" });
    if (newEnd.getTime() - newStart.getTime() !== durationMs) {
      const durationMinutes = Math.round(durationMs / 60000);
      return res.status(400).json({
        message: `This paid booking must keep its original ${durationMinutes}-minute duration`,
      });
    }
    const conflict = await MeetingRoomBooking.findOne({
      _id: { $ne: booking._id },
      roomId: booking.roomId,
      status: { $nin: ["cancelled"] },
      start: { $lt: newEnd },
      end: { $gt: newStart },
    }).select("bookingCode").lean().exec();
    if (conflict) {
      return res.status(409).json({ message: "That room is already booked for the selected time" });
    }

    if (!booking.originalStart) booking.originalStart = previousStart;
    if (!booking.originalEnd) booking.originalEnd = previousEnd;
    booking.start = newStart;
    booking.end = newEnd;
    booking.scheduleChangeType = "rescheduled";
    booking.status = "confirmed";
    await booking.save();
    sendExternalLifecycleEmail(
      booking,
      "rescheduled",
      { previousStart, previousEnd, previousTotal: Number(booking.totalAmount || 0) },
      booking.timezone,
    );

    return res.status(200).json({
      message: "Booking rescheduled successfully",
      booking: { id: String(booking._id), start: booking.start, end: booking.end },
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Unable to reschedule booking" });
  }
};

export const checkPublicNomadRescheduleAvailability = async (req, res) => {
  try {
    const configuredSecret = sanitizeValue(process.env.BOOKING_SYNC_SECRET);
    const suppliedSecret = sanitizeValue(req.headers?.["x-booking-sync-secret"]);
    if (!configuredSecret) return res.status(503).json({ message: "Booking sync is not configured" });
    if (!suppliedSecret || suppliedSecret !== configuredSecret) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const bookingId = sanitizeValue(req.params?.id);
    const email = sanitizeValue(req.body?.email).toLowerCase();
    const start = new Date(req.body?.start);
    const end = new Date(req.body?.end);
    if (
      !bookingId ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return res.status(400).json({ message: "Choose a valid date, start time, and end time" });
    }

    const booking = await MeetingRoomBooking.findOne({
      _id: bookingId,
      bookingType: "External",
      bookedByEmail: email,
      status: { $nin: ["cancelled", "completed"] },
    }).select("roomId start end").lean().exec();
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const originalDurationMs = new Date(booking.end).getTime() - new Date(booking.start).getTime();
    const selectedDurationMs = end.getTime() - start.getTime();
    if (selectedDurationMs !== originalDurationMs) {
      return res.status(200).json({
        available: false,
        reason: "duration",
        message: `Keep the original ${Math.round(originalDurationMs / 60000)}-minute duration`,
      });
    }
    if (start.getTime() <= Date.now()) {
      return res.status(200).json({ available: false, reason: "past", message: "Choose a future time" });
    }

    const conflict = await MeetingRoomBooking.findOne({
      _id: { $ne: booking._id },
      roomId: booking.roomId,
      status: { $nin: ["cancelled"] },
      start: { $lt: end },
      end: { $gt: start },
    }).select("_id").lean().exec();
    return res.status(200).json({
      available: !conflict,
      message: conflict
        ? "This room is already booked for the selected time"
        : "This room is available for the selected time",
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Unable to check availability" });
  }
};

const resolveWebsitePriceForLead = async (lead, meta) => {
  const workspaceId = sanitizeValue(lead?.workspaceId);
  const companyId = sanitizeValue(lead?.companyId);
  if (!workspaceId && !companyId) return null;

  const identityFilters = [
    ...(workspaceId ? [{ workspaceId }] : []),
    ...(companyId ? [{ companyId }] : []),
  ];
  const template = await WebsiteTemplate.findOne({ $or: identityFilters })
    .select(
      "products rooms meetingRooms coLivingRooms packages dorms menuItems pricing productDropdownPages.subProducts",
    )
    .lean()
    .exec();
  if (!template) return null;

  const offerings = [
    ...(template.products || []),
    ...(template.rooms || []),
    ...(template.meetingRooms || []),
    ...(template.coLivingRooms || []),
    ...(template.packages || []),
    ...(template.dorms || []),
    ...(template.menuItems || []),
    ...(template.pricing || []),
    ...(template.productDropdownPages || []).flatMap((page) => page?.subProducts || []),
  ];
  const requestedNames = [
    meta.roomType,
    meta.room,
    meta.roomName,
    meta.packageName,
    meta.productType,
    lead?.productType,
  ]
    .map((value) => sanitizeValue(value).toLowerCase())
    .filter(Boolean);
  if (requestedNames.length === 0) return null;

  const offering = offerings.find((item) => {
    const itemName = sanitizeValue(item?.title || item?.name || item?.heading).toLowerCase();
    return itemName && requestedNames.includes(itemName);
  });
  if (!offering) return null;

  const price = sanitizeValue(offering.price ?? offering.cost);
  return price
    ? {
        price,
        priceUnit: sanitizeValue(offering.priceUnit || offering.duration),
        duration: sanitizeValue(offering.duration),
      }
    : null;
};

const computeLeadPayment = async (lead) => {
  let meta = { ...readLeadMeta(lead) };
  if (isNonBookingInquiry(lead)) {
    return {
      currency: resolveLeadCurrency(meta),
      ...applyFees(0),
      rate: 0,
      resourceId: "",
      roomName: sanitizeValue(meta.roomType || meta.dormType || meta.packageName || lead?.productType),
      location: sanitizeValue(meta.location),
    };
  }
  if (!["hourlyRate", "hourly", "rate", "pricePerHour", "roomRate", "price", "amount"]
    .some((key) => Number.isFinite(parseMoney(meta[key])) && parseMoney(meta[key]) > 0)) {
    const websitePrice = await resolveWebsitePriceForLead(lead, meta);
    if (websitePrice) meta = { ...websitePrice, ...meta };
  }
  const rateKeys = ["hourlyRate", "hourly", "rate", "pricePerHour", "roomRate", "price", "amount"];
  let rate = NaN;
  for (const key of rateKeys) {
    const parsed = parseMoney(meta[key]);
    if (Number.isFinite(parsed) && parsed > 0) { rate = parsed; break; }
  }

  // Duration, in order: explicit duration fields, then the slot range.
  let hours = parseDurationHours(meta.duration ?? meta.meetingLength ?? meta.stayDuration);
  if (!Number.isFinite(hours)) {
    const slots = resolveSlotRange(meta);
    hours = slots.start ? hoursFromSlots(slots.start, slots.end) : NaN;
  }
  if (!Number.isFinite(hours)) {
    const startDate = new Date(meta.startDate || meta.checkIn || meta.bookingDate || "");
    const endDate = new Date(meta.endDate || meta.checkOut || "");
    const differenceHours = (endDate.getTime() - startDate.getTime()) / 3_600_000;
    if (
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime()) &&
      differenceHours > 0
    ) {
      hours = round2(differenceHours);
    }
  }

  // Resolve the room for its ID, name and location; its hourly price remains
  // the fallback when the form did not carry a rate.
  const room = await resolveRoomForLead(lead);

  // Co-living/hostel leads book by night, not by hour — nights x
  // pricePerNight, using resolveStaySchedule's whole-day checkIn/checkOut
  // instead of the hourly-slot math above.
  if (isStayVertical(lead, room)) {
    const { nights } = resolveStaySchedule(meta, null, null);
    let nightlyRate = parseMoney(meta.rate ?? meta.price ?? meta.amount ?? meta.pricePerNight);
    if (!Number.isFinite(nightlyRate) || nightlyRate <= 0) {
      nightlyRate = Number(room?.pricePerNight) > 0 ? Number(room.pricePerNight) : 0;
    }
    // Dorms are priced per bed, per night (matches the website's own
    // estimate — TplLead.jsx's estimateTotal: unit x nights x beds) — a
    // private Room/Co-Living space is priced per night regardless of
    // occupancy.
    const beds =
      room?.type === "Dorm"
        ? Math.max(1, Math.trunc(Number(parseMoney(meta.attendees ?? meta.noOfPeople ?? lead.noOfPeople ?? 1))) || 1)
        : 1;
    const stayBase = round2(nightlyRate * (nights || 0) * beds);
    return {
      currency: resolveLeadCurrency(meta),
      ...applyFees(stayBase),
      rate: nightlyRate,
      nights: nights || 0,
      beds,
      resourceId: room?._id ? String(room._id) : "",
      roomName: room?.name
        ? String(room.name)
        : sanitizeValue(meta.roomType || meta.dormType || meta.room || meta.roomName || meta.packageName),
      location:
        sanitizeValue(room?.location) ||
        [sanitizeValue(room?.floor), sanitizeValue(room?.wing)].filter(Boolean).join(", "),
    };
  }

  if (room) {
    if (!Number.isFinite(rate) && room?.pricePerHour > 0) rate = Number(room.pricePerHour);
    if (!Number.isFinite(hours)) {
      const slots = resolveSlotRange(meta);
      hours = slots.start ? hoursFromSlots(slots.start, slots.end) : NaN;
    }
  }

  const base = round2((Number.isFinite(rate) ? rate : 0) * (Number.isFinite(hours) ? hours : 0));
  return {
    currency: resolveLeadCurrency(meta),
    ...applyFees(base),
    rate: Number.isFinite(rate) ? rate : 0,
    hours: Number.isFinite(hours) ? hours : 0,
    resourceId: room?._id ? String(room._id) : "",
    roomName: room?.name
      ? String(room.name)
      : sanitizeValue(meta.roomType || meta.room || meta.roomName || meta.packageName),
    location:
      sanitizeValue(room?.location) ||
      [sanitizeValue(room?.floor), sanitizeValue(room?.wing)].filter(Boolean).join(", "),
  };
};

const leadPaymentSummary = (lead) => ({
  paymentStatus: lead?.paymentStatus || "Pending",
  paymentCurrency: lead?.paymentCurrency || LEAD_PAYMENT_CURRENCY,
  paymentSubtotalAmount: lead?.paymentSubtotalAmount || 0,
  discountType: lead?.discountType || "amount",
  discountValue: lead?.discountValue || 0,
  discountAmount: lead?.discountAmount || 0,
  paymentBaseAmount: lead?.paymentBaseAmount || 0,
  paymentPlatformFeePercent: lead?.paymentPlatformFeePercent ?? PLATFORM_FEE_PERCENT,
  paymentPlatformFeeAmount: lead?.paymentPlatformFeeAmount || 0,
  paymentStripeFeePercent: lead?.paymentStripeFeePercent ?? STRIPE_PROCESSING_FEE_PERCENT,
  paymentStripeFeeAmount: lead?.paymentStripeFeeAmount || 0,
  paymentTotalAmount: lead?.paymentTotalAmount || 0,
  bookingCode: lead?.bookingCode || "",
});

// Leads displayed to the host mostly come from the Nomads-side merge in
// getLeads (its own "_id", not HostPanel's local WebsiteLead one — the two
// are separate documents with separate auto-generated ids once escalated).
// So a leadId the host's UI hands back usually has no local WebsiteLead row
// yet. Mirror it in on first touch (same upsert-by-Nomads-id trick already
// used by updateLeads' accept/reject path) so computeLeadPayment has a real
// document — a plain findById alone 404s for most real leads.
const resolveLocalLeadForWorkspace = async (leadId, hostWorkspaceId) => {
  let localLead = await WebsiteLead.findById(leadId).exec();
  if (localLead) return localLead;

  const response = await axios.get(nomadsApiUrl("/api/company/leads"), {
    params: { workspaceId: hostWorkspaceId, isEscalated: true },
    timeout: 5000,
  });
  const remoteLeads = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response?.data?.leads)
      ? response.data.leads
      : [];
  const remoteLead = filterEscalatedLeadsForWorkspace(remoteLeads, hostWorkspaceId).find(
    (lead) => sanitizeValue(lead?._id) === sanitizeValue(leadId),
  );
  if (!remoteLead) return null;

  return WebsiteLead.findOneAndUpdate(
    { _id: leadId },
    {
      $setOnInsert: {
        workspaceId: hostWorkspaceId,
        companyId: sanitizeValue(remoteLead.companyId),
        companyName: sanitizeValue(remoteLead.companyName),
        fullName: sanitizeValue(remoteLead.fullName || remoteLead.name) || "Website lead",
        email: sanitizeValue(remoteLead.email),
        mobileNumber: sanitizeValue(
          remoteLead.mobileNumber || remoteLead.phone || remoteLead.mobile,
        ),
        message: sanitizeValue(remoteLead.message || remoteLead.comments),
        source: sanitizeValue(remoteLead.source) || "website",
        vertical: sanitizeValue(remoteLead.vertical) || "co-working",
        productType: sanitizeValue(remoteLead.productType),
        noOfPeople: sanitizeValue(remoteLead.noOfPeople),
        leadMeta: {
          ...(remoteLead.leadMeta && typeof remoteLead.leadMeta === "object"
            ? remoteLead.leadMeta
            : {}),
          ...Object.fromEntries(
            [
              "startDate", "endDate", "checkIn", "checkOut", "bookingDate",
              "preferredDate", "roomType", "roomName", "room", "packageName",
              "package", "planName", "timeSlot", "slot", "preferredTime",
              "startTime", "endTime", "duration", "meetingLength", "stayDuration",
              "hourlyRate", "hourly", "rate", "pricePerHour", "roomRate", "price",
              "amount", "priceUnit", "currency", "currencyCode", "attendees",
              "teamSize", "guestCount", "websiteUrl",
            ]
              .filter((key) => remoteLead[key] !== undefined && remoteLead[key] !== null)
              .map((key) => [key, remoteLead[key]]),
          ),
        },
        status: sanitizeValue(remoteLead.status) || "Pending",
        isEscalated: true,
        escalatedWorkspaceId: hostWorkspaceId,
        escalatedHostCompanyId: sanitizeValue(remoteLead.escalatedHostCompanyId),
        escalatedAt: remoteLead.escalatedAt || new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).exec();
};

// GET /api/leads/preview-payment — lets the host see (and the Accept modal
// prefill) the auto-calculated amount before actually accepting. Read-only:
// never writes, so the host can cancel out with no side effect.
export const previewLeadPayment = async (req, res, next) => {
  try {
    const leadId = sanitizeValue(req.query?.leadId);
    if (!leadId) {
      return res.status(400).json({ message: "leadId is required" });
    }
    const hostWorkspaceId = sanitizeValue(
      req.query?.workspaceId || req.workspaceMembership?.workspace,
    );
    if (!hostWorkspaceId) {
      return res.status(400).json({ message: "A HostPanel workspace is required" });
    }
    const lead = await resolveLocalLeadForWorkspace(leadId, hostWorkspaceId);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }
    const ownsLead =
      sanitizeValue(lead.escalatedWorkspaceId) === hostWorkspaceId ||
      sanitizeValue(lead.workspaceId) === hostWorkspaceId;
    if (!ownsLead) {
      return res
        .status(403)
        .json({ message: "Lead does not belong to this HostPanel workspace" });
    }
    const payment = await computeLeadPayment(lead);

    // Read-only availability check — same conflict query finalize-booking
    // runs, just surfaced BEFORE payment instead of after, so the host isn't
    // charging a client for a slot that's already taken.
    const meta = readLeadMeta(lead);
    const availability = await checkLeadAvailability(lead, meta);

    return res.status(200).json({ ...payment, availability });
  } catch (error) {
    next(error);
  }
};

// POST /api/leads/notify-slot-unavailable — host uses this instead of Accept
// when the Accept modal shows the slot is already booked. Rejects the lead
// and emails the client the "pick another slot / sign up" note instead of
// the normal payment-accepted email.
export const notifySlotUnavailable = async (req, res, next) => {
  try {
    const leadId = sanitizeValue(req.body?.leadId);
    if (!leadId) {
      return res.status(400).json({ message: "leadId is required" });
    }
    const hostWorkspaceId = sanitizeValue(
      req.body?.workspaceId || req.workspaceMembership?.workspace,
    );
    if (!hostWorkspaceId) {
      return res.status(400).json({ message: "A HostPanel workspace is required" });
    }
    const localLead = await resolveLocalLeadForWorkspace(leadId, hostWorkspaceId);
    if (!localLead) {
      return res.status(404).json({ message: "Lead not found" });
    }
    const ownsLead =
      sanitizeValue(localLead.escalatedWorkspaceId) === hostWorkspaceId ||
      sanitizeValue(localLead.workspaceId) === hostWorkspaceId;
    if (!ownsLead) {
      return res
        .status(403)
        .json({ message: "Lead does not belong to this HostPanel workspace" });
    }
    localLead.hostPanelStatus = "Rejected";
    localLead.paymentStatus = "Rejected";
    localLead.paymentStatusUpdatedAt = new Date();
    await localLead.save();

    // Suggested-slot recommendation only applies to hourly meeting-room
    // leads — co-living/hostel conflicts are resolved by picking a
    // different date range, which isn't a short list of time slots, so the
    // email just omits that section for those (sendLeadSlotUnavailableEmail
    // already renders nothing when suggestedSlots is empty).
    let suggestedSlots = [];
    try {
      const meta = readLeadMeta(localLead);
      const room = await resolveRoomForLead(localLead);
      if (!isStayVertical(localLead, room)) {
        const { startDate, endDate } = resolveLeadSchedule(meta, null, null);
        if (room && startDate && endDate && endDate > startDate) {
          suggestedSlots = await findAvailableSlotsForDay(room._id, hostWorkspaceId, startDate, endDate - startDate);
        }
      }
    } catch (error) {
      console.error("Could not compute suggested slots for slot-unavailable email:", error?.message || error);
    }
    sendLeadSlotUnavailableEmail(localLead, suggestedSlots);
    return res.status(200).json({
      message: "Client notified that the slot is unavailable",
      lead: {
        _id: String(localLead._id),
        ...localLead.toObject(),
        ...leadPaymentSummary(localLead),
        ...readLeadMeta(localLead),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Shared by `sendInvoiceToWono` (the real payout request) and
// `previewPayoutInvoice` (draft PDF below) — resolve the Paid + not-yet-
// invoiced bookings matching the request's selection (nothing = all,
// leadId = the per-row action, leadIds = the ticked boxes) and build the
// same entry/payment shape the HostInvoiceRequest + PDF pipeline expects.
// Eligibility is always decided here against the database; the client's
// tick boxes only narrow the selection, they can never make an unpaid or
// already-invoiced booking billable.
const resolveUnbilledLeadBundle = async (hostWorkspaceId, { leadId = "", leadIds = [] } = {}) => {
  const unbilledLeads = await WebsiteLead.find({
    workspaceId: hostWorkspaceId,
    ...(leadId ? { _id: leadId } : {}),
    ...(Array.isArray(leadIds) && leadIds.length ? { _id: { $in: leadIds } } : {}),
    paymentStatus: "Paid",
    bookingCode: { $nin: ["", null] },
    invoiceSentToWono: { $ne: true },
  }).exec();

  const entries = [];
  for (const lead of unbilledLeads) {
    const meta = readLeadMeta(lead);
    const room = await resolveRoomForLead(lead);
    const isStay = isStayVertical(lead, room);
    const bookingType = !isStay ? "MeetingRoom" : room?.type === "Dorm" ? "Hostel" : "CoLiving";
    const { startDate: bookingStart, endDate: bookingEnd } = isStay
      ? (() => {
          const stay = resolveStaySchedule(meta, null, null);
          return { startDate: stay.checkIn, endDate: stay.checkOut };
        })()
      : resolveLeadSchedule(meta, null, null);

    const payment = {
      discountAmount: Number(lead.discountAmount) || 0,
      grossTotal: Number(lead.paymentTotalAmount) || 0,
      platformFeeAmount: Number(lead.paymentPlatformFeeAmount) || 0,
      platformFeePercent: Number(lead.paymentPlatformFeePercent) || PLATFORM_FEE_PERCENT,
      amount: Number(lead.paymentBaseAmount) || 0,
      currency: lead.paymentCurrency || LEAD_PAYMENT_CURRENCY,
    };
    const resourceName = room?.name || sanitizeValue(meta.roomType || meta.dormType || meta.roomName);

    entries.push({
      lead,
      payment,
      booking: {
        bookingCode: lead.bookingCode,
        bookingType,
        resourceName,
        startDate: bookingStart,
        endDate: bookingEnd,
        guestName: lead.fullName,
      },
    });
  }

  // Single-currency assumption — same simplification the stat cards
  // already make elsewhere; a workspace realistically bills in one
  // currency throughout.
  const currency = entries[0]?.payment.currency;
  const grandTotalAmount = round2(entries.reduce((sum, e) => sum + (e.payment.amount || 0), 0));
  return { unbilledLeads, entries, grandTotalAmount, currency };
};

// Fetch the host's workspace identity block used at the top of the
// invoice PDF (name/logo/address) — identical for send and preview.
const fetchHostInvoiceHost = (hostWorkspaceId) =>
  Workspace.findById(hostWorkspaceId)
    .select("businessName brandName address city state country branding")
    .lean()
    .exec();

// POST /api/leads/request-payout — host requests one consolidated payout
// covering EVERY finalized, paid booking in this workspace not yet
// invoiced (not one request per booking — a busy host can have 15+
// bookings/day; 15 separate bank transfers would eat the margin in wire
// fees alone, same reasoning Stripe Connect/Airbnb-style payouts use).
// Creates ONE HostInvoiceRequest bundling all of them, with one PDF that
// still itemizes every booking's own detail + payment summary, plus a
// grand total. Marks every included lead invoiceSentToWono so it's never
// pulled into a later payout request again.
export const sendInvoiceToWono = async (req, res, next) => {
  try {
    const hostWorkspaceId = sanitizeValue(
      req.body?.workspaceId || req.workspaceMembership?.workspace,
    );
    if (!hostWorkspaceId) {
      return res.status(400).json({ message: "A HostPanel workspace is required" });
    }
    // Optional: scope to a single lead for the per-row "Send Invoice" action
    // instead of every unbilled booking (the consolidated "Request Payout").
    // Also optional: a `leadIds` selection for the checkbox-based payout
    // modal. Eligibility is NOT taken from the client — the query below
    // still only matches Paid + unbilled bookings, so a stale or tampered
    // selection can never bill an already-invoiced or unpaid booking.
    const leadId = sanitizeValue(req.body?.leadId);
    const requestedLeadIds = Array.isArray(req.body?.leadIds)
      ? req.body.leadIds.map((id) => sanitizeValue(id)).filter(Boolean)
      : [];

    const { unbilledLeads, entries, grandTotalAmount, currency } = await resolveUnbilledLeadBundle(
      hostWorkspaceId,
      { leadId, leadIds: requestedLeadIds },
    );

    if (!unbilledLeads.length) {
      return res.status(400).json({
        message: leadId
          ? "This booking is already invoiced or not eligible for a payout."
          : requestedLeadIds.length
            ? "None of the selected bookings are eligible — only paid, not-yet-invoiced bookings can be bundled."
            : "No unbilled, paid bookings to request a payout for.",
      });
    }

    let invoicePdfUrl = "";
    const invoiceNumber = `INV-${hostWorkspaceId.slice(-6)}-${Date.now()}`;
    try {
      const workspaceDoc = await fetchHostInvoiceHost(hostWorkspaceId);
      const pdfBuffer = await buildHostInvoicePdfBuffer({
        host: {
          businessName: workspaceDoc?.businessName,
          brandName: workspaceDoc?.brandName,
          address: workspaceDoc?.address,
          city: workspaceDoc?.city,
          state: workspaceDoc?.state,
          country: workspaceDoc?.country,
          logoUrl: workspaceDoc?.branding?.logoUrl,
        },
        entries: entries.map(({ booking, payment }) => ({ booking, payment })),
        grandTotal: { amount: grandTotalAmount, currency },
        invoiceNumber,
      });
      const route = `host-invoices/${hostWorkspaceId}/${invoiceNumber}.pdf`;
      const uploaded = await uploadFileToS3(route, { buffer: pdfBuffer, mimetype: "application/pdf" });
      invoicePdfUrl = uploaded.url;
    } catch (error) {
      console.error("Could not generate/upload consolidated host invoice PDF:", error?.message || error);
    }

    const invoice = await HostInvoiceRequest.create({
      workspaceId: hostWorkspaceId,
      companyId: sanitizeValue(entries[0].lead.companyId),
      companyName: sanitizeValue(entries[0].lead.companyName),
      bookings: entries.map(({ lead, booking, payment }) => ({
        leadId: lead._id,
        bookingId: lead.bookingId || null,
        bookingCode: booking.bookingCode,
        bookingType: booking.bookingType,
        resourceName: booking.resourceName,
        guestName: booking.guestName,
        startDate: booking.startDate,
        endDate: booking.endDate,
        amount: payment.amount,
      })),
      amount: grandTotalAmount,
      currency,
      invoicePdfUrl,
      requestedBy: sanitizeValue(req.user) ? req.user : null,
    });

    const now = new Date();
    await WebsiteLead.updateMany(
      { _id: { $in: entries.map((e) => e.lead._id) } },
      { $set: { invoiceSentToWono: true, invoiceSentAt: now } },
    ).exec();

    return res.status(201).json({
      message: `Payout requested for ${entries.length} booking${entries.length === 1 ? "" : "s"} — ${invoice.currency} ${invoice.amount.toFixed(2)}.`,
      invoice: invoice.toObject(),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/leads/preview-payout-invoice — render the EXACT same
// consolidated payout PDF that "Send Invoice to WONO" would emit: same
// eligibility query, same entry building, same `buildHostInvoicePdfBuffer`
// generator. Read-only by design — nothing is uploaded to S3, no
// HostInvoiceRequest is created, and no lead is marked invoiceSentToWono.
// The only difference is the number: a draft must never be mistaken for
// an issued invoice, so it's prefixed PREVIEW- instead of INV-.
export const previewPayoutInvoice = async (req, res, next) => {
  try {
    const hostWorkspaceId = sanitizeValue(
      req.body?.workspaceId || req.workspaceMembership?.workspace,
    );
    if (!hostWorkspaceId) {
      return res.status(400).json({ message: "A HostPanel workspace is required" });
    }
    const leadId = sanitizeValue(req.body?.leadId);
    const requestedLeadIds = Array.isArray(req.body?.leadIds)
      ? req.body.leadIds.map((id) => sanitizeValue(id)).filter(Boolean)
      : [];

    const { unbilledLeads, entries, grandTotalAmount, currency } = await resolveUnbilledLeadBundle(
      hostWorkspaceId,
      { leadId, leadIds: requestedLeadIds },
    );

    if (!unbilledLeads.length) {
      return res.status(400).json({
        message: leadId
          ? "This booking is already invoiced or not eligible for a payout."
          : "Only paid, not-yet-invoiced bookings can be previewed.",
      });
    }

    const workspaceDoc = await fetchHostInvoiceHost(hostWorkspaceId);
    const pdfBuffer = await buildHostInvoicePdfBuffer({
      host: {
        businessName: workspaceDoc?.businessName,
        brandName: workspaceDoc?.brandName,
        address: workspaceDoc?.address,
        city: workspaceDoc?.city,
        state: workspaceDoc?.state,
        country: workspaceDoc?.country,
        logoUrl: workspaceDoc?.branding?.logoUrl,
      },
      entries: entries.map(({ booking, payment }) => ({ booking, payment })),
      grandTotal: { amount: grandTotalAmount, currency },
      invoiceNumber: `PREVIEW-INV-${hostWorkspaceId.slice(-6)}-${Date.now()}`,
    });

    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `inline; filename="payout-invoice-preview.pdf"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const updateLeads = async (req, res, next) => {
  try {
    const { hostPanelStatus = "", comment, leadId } = req.body || {};
    const normalizedHostStatus = sanitizeValue(hostPanelStatus);

    if (!leadId || (!normalizedHostStatus && typeof comment !== "string")) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    if (
      normalizedHostStatus &&
      !ALL_HOST_PANEL_STATUSES.includes(normalizedHostStatus)
    ) {
      return res.status(400).json({ message: "Invalid HostPanel lead status" });
    }

    let hostWorkspaceId = sanitizeValue(
      req.body?.workspaceId || req.workspaceMembership?.workspace,
    );
    if (normalizedHostStatus && !hostWorkspaceId) {
      const hostUser = await HostUser.findById(req.user)
        .select("primaryWorkspace workspaceId")
        .lean();
      hostWorkspaceId = sanitizeValue(hostUser?.primaryWorkspace || hostUser?.workspaceId);
    }
    if (normalizedHostStatus && !hostWorkspaceId) {
      return res.status(400).json({ message: "A HostPanel workspace is required" });
    }

    // Accept/Reject are HostPanel-local decisions. The configured Nomads lead
    // service only persists the legacy "Pending"/"Closed" statuses, so these
    // update the local WebsiteLead only (with the pricing snapshot computed
    // below); the shared-sync block further down stays reserved for those.
    if (NEW_HOST_PANEL_STATUSES.includes(normalizedHostStatus)) {
      const localLead = await resolveLocalLeadForWorkspace(leadId, hostWorkspaceId);
      if (!localLead) {
        return res.status(404).json({ message: "Lead not found in HostPanel store" });
      }
      const ownsLead =
        (sanitizeValue(localLead.escalatedWorkspaceId) &&
          sanitizeValue(localLead.escalatedWorkspaceId) === sanitizeValue(hostWorkspaceId)) ||
        (sanitizeValue(localLead.workspaceId) &&
          sanitizeValue(localLead.workspaceId) === sanitizeValue(hostWorkspaceId));
      if (!ownsLead) {
        return res
          .status(403)
          .json({ message: "Lead does not belong to this HostPanel workspace" });
      }

      if (typeof comment === "string") localLead.comment = comment;

      if (normalizedHostStatus === "Accepted") {
        // Co-working (and anything else with no bookable Meeting Room /
        // Room / Dorm resource matched) isn't a payable, schedulable
        // booking — it's a plain enquiry the host follows up on manually
        // (tour, sign a tenancy, etc). Accept just marks it Accepted, no
        // Stripe link, no conflict check, no fees.
        const acceptRoomForTyping = isNonBookingInquiry(localLead) ? null : await resolveRoomForLead(localLead);
        if (!acceptRoomForTyping) {
          localLead.hostPanelStatus = "Accepted";
          localLead.paymentStatus = "Not Required";
          localLead.paymentStatusUpdatedAt = new Date();
          await localLead.save();
          return res.status(200).json({
            message: "Lead accepted — follow up with the client directly.",
            lead: {
              _id: String(localLead._id),
              ...localLead.toObject(),
              ...leadPaymentSummary(localLead),
              ...readLeadMeta(localLead),
            },
          });
        }

        // Block accept on a slot that's already taken — same conflict check
        // previewLeadPayment/finalizeLeadBooking use (meeting room OR
        // co-living/hostel, whichever this lead's vertical is). Tells the
        // client by email instead of charging them for a room they can't get.
        const acceptMeta = readLeadMeta(localLead);
        const acceptAvailability = await checkLeadAvailability(localLead, acceptMeta);
        if (acceptAvailability.checked && !acceptAvailability.available) {
          sendLeadSlotUnavailableEmail(localLead);
          return res.status(409).json({
            message: "That slot is already booked. The client has been emailed to pick another slot.",
            conflictBookingCode: acceptAvailability.conflictBookingCode,
          });
        }
        // computeLeadPayment resolves currency/resourceId/roomName metadata and
        // a best-effort auto base — the frontend shows that as a prefilled,
        // editable amount before confirming, so whichever base arrives here
        // (host-edited or left as the auto value) is the one actually charged.
        const autoPayment = await computeLeadPayment(localLead);
        const manualAmount = parseMoney(req.body?.manualAmount);
        const manualCurrency = sanitizeValue(req.body?.manualCurrency).toUpperCase();
        const base =
          Number.isFinite(manualAmount) && manualAmount > 0
            ? round2(manualAmount)
            : autoPayment.base;
        const discount = computeDiscount(base, req.body?.discountType, req.body?.discountValue);
        const payment = {
          ...autoPayment,
          currency: /^[A-Z]{3}$/.test(manualCurrency) ? manualCurrency : autoPayment.currency,
          subtotal: base,
          ...discount,
          ...applyFees(round2(base - discount.discountAmount)),
        };
        if (payment.total <= 0) {
          return res.status(400).json({
            message: "Enter the booking amount to continue.",
            requiresManualAmount: true,
          });
        }
        const meta = readLeadMeta(localLead);
        const paymentRoom = await resolveRoomForLead(localLead);
        const paymentServiceType = paymentRoom?.type === "Dorm"
          ? "hostel"
          : paymentRoom?.type === "Room"
            ? "co-living"
            : "meeting-room";
        let stayHold = null;
        if (isStayVertical(localLead, paymentRoom)) {
          const stay = resolveStaySchedule(meta, null, null);
          if (!stay.checkIn || !stay.checkOut) {
            return res.status(400).json({ message: "Check-in and check-out are required before accepting a short stay." });
          }
          const requestedBeds = paymentRoom?.type === "Dorm"
            ? Math.max(1, Math.trunc(Number(parseMoney(meta.attendees ?? localLead.noOfPeople ?? 1))) || 1)
            : 1;
          stayHold = await createRoomStayPaymentHold({
            leadId: localLead._id,
            room: paymentRoom,
            checkIn: stay.checkIn,
            checkOut: stay.checkOut,
            requestedBeds,
            expiresAt: new Date(Date.now() + 35 * 60 * 1000),
          });
        }
        let paymentLinkUrl = "";
        const paymentSlots = resolveSlotRange(meta);
        try {
          const paymentLinkResponse = await axios.post(
            `${MASTER_PANEL_BASE_URL}/api/hostpanel/booking-payment-links`,
            {
              leadId: String(localLead._id),
              customerName: localLead.fullName,
              customerEmail: localLead.email,
              companyName: localLead.companyName,
              productType:
                payment.roomName || localLead.productType || meta.roomType || "Booking",
              serviceType: paymentServiceType,
              startDate: meta.startDate || meta.checkIn || meta.bookingDate || null,
              endDate: meta.endDate || meta.checkOut || null,
              startTime: sanitizeValue(meta.startTime) || paymentSlots.start,
              endTime: sanitizeValue(meta.endTime) || paymentSlots.end,
              noOfPeople: localLead.noOfPeople || meta.attendees || meta.guestCount || null,
              location:
                payment.location || sanitizeValue(meta.location || meta.address || meta.venue),
              amount: payment.total,
              currency: payment.currency,
              unitRate: payment.rate,
              duration: paymentServiceType === "meeting-room" ? payment.hours : payment.nights,
              durationUnit: paymentServiceType === "meeting-room" ? "hours" : "nights",
              subtotalAmount: payment.subtotal,
              discountAmount: payment.discountAmount,
              baseAmount: payment.base,
              platformFeePercent: payment.platformFeePercent,
              platformFeeAmount: payment.platformFeeAmount,
              taxAmount: 0,
              description: `${payment.roomName || localLead.productType || "Booking"} payment`,
              paymentType: "booking",
              expiresAt: stayHold?.expiresAt || null,
              sendEmail: false,
            },
            { headers: masterPanelHeaders(), timeout: 10000 },
          );
          paymentLinkUrl = sanitizeValue(paymentLinkResponse?.data?.paymentLinkUrl);
        } catch (error) {
          if (stayHold?.holdId) await releaseRoomStayPaymentHold(stayHold.holdId);
          return res.status(error?.response?.status || 502).json({
            message:
              error?.response?.data?.message ||
              "Unable to create the Stripe payment link. The lead was not accepted.",
          });
        }
        if (!paymentLinkUrl) {
          if (stayHold?.holdId) await releaseRoomStayPaymentHold(stayHold.holdId);
          return res.status(502).json({
            message: "Master Panel did not return a Stripe payment link. The lead was not accepted.",
          });
        }
        payment.paymentLinkUrl = paymentLinkUrl;
        localLead.hostPanelStatus = "Accepted";
        localLead.paymentStatus = "Pending";
        localLead.paymentStatusUpdatedAt = new Date();
        localLead.paymentCurrency = payment.currency;
        localLead.paymentSubtotalAmount = payment.subtotal;
        localLead.discountType = payment.discountType;
        localLead.discountValue = payment.discountValue;
        localLead.discountAmount = payment.discountAmount;
        localLead.paymentBaseAmount = payment.base;
        localLead.paymentPlatformFeePercent = payment.platformFeePercent;
        localLead.paymentPlatformFeeAmount = payment.platformFeeAmount;
        localLead.paymentStripeFeePercent = payment.stripeFeePercent;
        localLead.paymentStripeFeeAmount = payment.stripeFeeAmount;
        localLead.paymentTotalAmount = payment.total;
        localLead.stayHoldId = stayHold?.holdId || "";
        localLead.stayHoldExpiresAt = stayHold?.expiresAt || null;
        await localLead.save();
        // Best-effort client notification ("Your Booking Is Accepted" with the
        // payment total); mail failures are logged, never fatal to the accept.
        sendLeadBookingAcceptedEmail(localLead, payment);
        return res.status(200).json({
          message: `Lead accepted — total payable ${payment.currency} ${payment.total.toFixed(2)} (base ${payment.base.toFixed(2)} + ${payment.platformFeePercent}% fee ${payment.platformFeeAmount.toFixed(2)})`,
          lead: {
            _id: String(localLead._id),
            ...localLead.toObject(),
            ...leadPaymentSummary(localLead),
            ...readLeadMeta(localLead),
          },
          payment,
        });
      }

      if (localLead.stayHoldId) await releaseRoomStayPaymentHold(localLead.stayHoldId);
      localLead.stayHoldId = "";
      localLead.stayHoldExpiresAt = null;
      localLead.hostPanelStatus = "Rejected";
      localLead.paymentStatus = "Rejected";
      localLead.paymentStatusUpdatedAt = new Date();
      await localLead.save();
      sendLeadRejectedEmail(localLead);
      return res.status(200).json({
        message: "Lead rejected",
        lead: {
          _id: String(localLead._id),
          ...localLead.toObject(),
          ...leadPaymentSummary(localLead),
          ...readLeadMeta(localLead),
        },
      });
    }

    let sharedLead = null;
    try {
      const leads = await axios.patch(
        nomadsApiUrl("/api/company/update-lead"),
        {
          leadId,
          ...(hostWorkspaceId ? { workspaceId: hostWorkspaceId } : {}),
          ...(normalizedHostStatus ? { hostPanelStatus: normalizedHostStatus } : {}),
          ...(typeof comment === "string" ? { comment } : {}),
        }
      );
      const upstreamLead = leads?.data?.lead;
      if (
        upstreamLead &&
        (!normalizedHostStatus || upstreamLead.hostPanelStatus === normalizedHostStatus)
      ) {
        sharedLead = upstreamLead;
      }
    } catch (error) {
      return res.status(error?.response?.status || 502).json({
        message:
          error?.response?.data?.message ||
          "Unable to reach the configured Nomads lead service",
      });
    }

    if (!sharedLead) {
      const verification = await axios.get(nomadsApiUrl("/api/company/leads"), {
        params: { workspaceId: hostWorkspaceId, isEscalated: true },
      });
      const verifiedLeads = Array.isArray(verification?.data) ? verification.data : [];
      sharedLead = verifiedLeads.find(
        (lead) =>
          sanitizeValue(lead?._id) === sanitizeValue(leadId) &&
          (!normalizedHostStatus || lead?.hostPanelStatus === normalizedHostStatus),
      );
    }

    if (!sharedLead) {
      return res.status(502).json({
        message: "The configured Nomads backend did not persist the HostPanel status update",
      });
    }

    const localLead = await WebsiteLead.findById(leadId).exec();
    if (localLead) {
      if (normalizedHostStatus) {
        localLead.hostPanelStatus = normalizedHostStatus;
        localLead.hostPanelStatusUpdatedAt = new Date();
      }
      if (typeof comment === "string") localLead.comment = comment;
      await localLead.save();
    }

    return res
      .status(200)
      .json({
        message: `Lead ${typeof comment === "string" && !normalizedHostStatus ? "comment" : "status"} updated`,
        lead: sharedLead,
      });
  } catch (error) {
    next(error);
  }
};

const resolveHostCandidates = (req) => {
  const candidates = [];
  const collect = (raw) => {
    const value = sanitizeValue(raw).toLowerCase();
    if (!value) return;
    const cleaned = value.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
    if (!cleaned) return;
    candidates.push(cleaned);
  };

  collect(req.headers?.host);
  collect(req.headers?.origin);
  collect(req.headers?.referer);
  collect(req.body?.websiteUrl);
  collect(req.body?.siteUrl);
  collect(req.query?.websiteUrl);
  collect(req.query?.siteUrl);

  return Array.from(new Set(candidates));
};

const resolveSlugCandidates = (req) => {
  const values = [
    req.body?.searchKey,
    req.query?.searchKey,
    req.body?.websiteSlug,
    req.query?.websiteSlug,
    req.body?.companySlug,
    req.query?.companySlug,
    req.body?.slug,
    req.query?.slug,
  ]
    .map(sanitizeValue)
    .filter(Boolean);

  const urlLike = [
    req.headers?.referer,
    req.headers?.origin,
    req.body?.websiteUrl,
    req.body?.siteUrl,
    req.body?.pageUrl,
    req.body?.url,
    req.query?.websiteUrl,
    req.query?.siteUrl,
    req.query?.pageUrl,
    req.query?.url,
  ]
    .map(sanitizeValue)
    .filter(Boolean);

  for (const value of urlLike) {
    try {
      const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length > 0) values.push(parts[0]);
    } catch {
      // ignore parse failures
    }
  }

  return Array.from(
    new Set(
      values
        .map((v) => v.toLowerCase().trim())
        .filter(Boolean),
    ),
  );
};

const resolveTemplateFromRequest = async (req) => {
  const body = req.body || {};
  const query = req.query || {};

  const searchKeyCandidates = resolveSlugCandidates(req);

  for (const searchKey of searchKeyCandidates) {
    const template = await WebsiteTemplate.findOne({ searchKey }).lean().exec();
    if (template) return template;
  }

  const hostCandidates = resolveHostCandidates(req);
  for (const host of hostCandidates) {
    const hostSubdomain = host.split(".")[0];
    if (!hostSubdomain || ["www", "wono", "api"].includes(hostSubdomain)) continue;
    const template = await WebsiteTemplate.findOne({ searchKey: hostSubdomain })
      .lean()
      .exec();
    if (template) return template;
  }

  const workspaceId = sanitizeValue(body.workspaceId || query.workspaceId);
  if (workspaceId) {
    const template = await WebsiteTemplate.findOne({ workspaceId }).lean().exec();
    if (template) return template;
  }

  const companyId = sanitizeValue(body.companyId || query.companyId);
  if (companyId) {
    const template = await WebsiteTemplate.findOne({ companyId }).lean().exec();
    if (template) return template;
  }

  const companyName = sanitizeValue(body.companyName || query.companyName);
  if (companyName) {
    const escaped = companyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const template = await WebsiteTemplate.findOne({
      companyName: { $regex: new RegExp(`^${escaped}$`, "i") },
    })
      .lean()
      .exec();
    if (template) return template;
  }

  return null;
};

export const createWebsiteLead = async (req, res) => {
  try {
    const body = req.body || {};
    const template = await resolveTemplateFromRequest(req);

    const visitorName = sanitizeValue(body.name || body.fullName || body.leadName);
    const visitorEmail = sanitizeValue(body.email);
    const visitorPhone = sanitizeValue(body.phone || body.mobile || body.contactNumber);
    const visitorMessage = sanitizeValue(body.message || body.comments || body.comment);

    let resolvedCompanyName = sanitizeValue(
      body.companyName ||
        template?.companyName ||
        template?.registeredCompanyName ||
        template?.searchKey,
    );
    let resolvedWorkspaceId = sanitizeValue(body.workspaceId || template?.workspaceId);
    const resolvedCompanyId =
      (resolvedWorkspaceId
        ? await resolveCompanyIdFromWorkspace(resolvedWorkspaceId)
        : "") || sanitizeValue(body.companyId || template?.companyId);

    // Live-site submissions often only send companyId (resolved via the
    // companyId/companyName branches of resolveTemplateFromRequest above),
    // leaving resolvedWorkspaceId empty even though the lead itself saves
    // fine — that silently skips the admin notification block below since
    // it requires a workspaceId. Backfill it from the company as a last resort.
    if (!resolvedWorkspaceId && resolvedCompanyId) {
      resolvedWorkspaceId = await resolveWorkspaceIdFromCompany(resolvedCompanyId);
    }

    const resolvedSource = sanitizeValue(body.source) || "website";

    if (!visitorName || !visitorEmail || !visitorPhone) {
      console.warn("createWebsiteLead validation failed", {
        reason: "missing_required_contact",
        hasName: Boolean(visitorName),
        hasEmail: Boolean(visitorEmail),
        hasPhone: Boolean(visitorPhone),
        searchKeyCandidates: resolveSlugCandidates(req),
      });
      return res.status(400).json({
        message: "name, email and phone are required",
      });
    }

    if (!resolvedCompanyName && resolvedCompanyId) {
      const templateByCompany = await WebsiteTemplate.findOne({
        companyId: resolvedCompanyId,
      })
        .select("companyName registeredCompanyName searchKey")
        .lean()
        .exec();
      resolvedCompanyName = sanitizeValue(
        templateByCompany?.companyName ||
          templateByCompany?.registeredCompanyName ||
          templateByCompany?.searchKey,
      );
    }

    if (!resolvedCompanyName && resolvedWorkspaceId) {
      const workspace = await Workspace.findById(resolvedWorkspaceId)
        .select("businessName workspaceName")
        .lean()
        .exec();
      resolvedCompanyName = sanitizeValue(
        workspace?.businessName || workspace?.workspaceName,
      );
    }

    if (!resolvedCompanyName) {
      console.warn("createWebsiteLead validation failed", {
        reason: "unable_to_resolve_company_name",
        companyId: resolvedCompanyId,
        workspaceId: resolvedWorkspaceId,
        templateSearchKey: template?.searchKey || "",
        host: sanitizeValue(req.headers?.host),
        referer: sanitizeValue(req.headers?.referer),
        origin: sanitizeValue(req.headers?.origin),
        searchKeyCandidates: resolveSlugCandidates(req),
      });
      return res.status(400).json({
        message: "Unable to resolve companyName for this website lead",
      });
    }

    const payload = {
      ...body,
      name: visitorName,
      fullName: sanitizeValue(body.fullName || visitorName),
      email: visitorEmail,
      phone: visitorPhone,
      mobile: visitorPhone,
      mobileNumber: sanitizeValue(body.mobileNumber || visitorPhone),
      contactNumber: sanitizeValue(body.contactNumber || visitorPhone),
      message: visitorMessage,
      comments: visitorMessage,
      companyName: resolvedCompanyName,
      company: sanitizeValue(body.company || resolvedCompanyName),
      company_name: sanitizeValue(body.company_name || resolvedCompanyName),
      leadCompanyName: sanitizeValue(body.leadCompanyName || resolvedCompanyName),
      companyId: resolvedCompanyId,
      workspaceId: resolvedWorkspaceId,
      source: resolvedSource,
    };

    const resolvedVertical = sanitizeValue(
      body.vertical || body.websiteVertical || template?.vertical || "co-working",
    );

    const knownBaseKeys = new Set([
      "name", "fullName", "leadName", "email", "phone", "mobile", "mobileNumber",
      "contactNumber", "message", "comments", "comment", "companyName", "company",
      "company_name", "leadCompanyName", "companyId", "workspaceId", "source",
      "searchKey", "websiteSlug", "companySlug", "slug", "websiteUrl", "siteUrl",
      "pageUrl", "url", "vertical", "websiteVertical", "productType", "noOfPeople",
      "startDate", "endDate", "moveInDate", "checkIn", "checkOut", "bookingDate",
      "preferredDate", "roomType", "roomName", "room", "packageName", "package",
      "planName", "dormType", "bedType", "attendees", "teamSize", "guestCount",
      "inquiryType", "eventType", "timeSlot", "slot", "preferredTime",
      "stayDuration", "duration",
    ]);

    const leadMeta = {};
    for (const [key, value] of Object.entries(body || {})) {
      if (knownBaseKeys.has(key)) continue;
      if (value === null || value === undefined) continue;
      if (typeof value === "string" && !value.trim()) continue;
      leadMeta[key] = value;
    }

    const normalizedMeta = {
      ...leadMeta,
      startDate: sanitizeValue(
        body.startDate || body.moveInDate || body.checkIn || body.bookingDate || body.preferredDate,
      ),
      endDate: sanitizeValue(body.endDate || body.checkOut),
      roomType: sanitizeValue(body.roomType || body.roomName || body.room),
      packageName: sanitizeValue(body.packageName || body.package || body.planName),
      dormType: sanitizeValue(body.dormType || body.bedType),
      attendees: sanitizeValue(body.attendees || body.teamSize || body.guestCount),
      inquiryType: sanitizeValue(body.inquiryType || body.eventType),
      timeSlot: sanitizeValue(body.timeSlot || body.slot || body.preferredTime),
      stayDuration: sanitizeValue(body.stayDuration || body.duration),
    };

    for (const [k, v] of Object.entries(normalizedMeta)) {
      if (!sanitizeValue(v)) delete normalizedMeta[k];
    }

    const localLead = await WebsiteLead.create({
      workspaceId: resolvedWorkspaceId,
      companyId: resolvedCompanyId,
      companyName: resolvedCompanyName,
      fullName: payload.fullName || payload.name,
      email: payload.email,
      mobileNumber:
        payload.mobileNumber || payload.phone || payload.mobile || payload.contactNumber,
      message: payload.message || payload.comments || "",
      source: payload.source || "website",
      vertical: resolvedVertical || "co-working",
      productType: sanitizeValue(payload.productType),
      noOfPeople: sanitizeValue(payload.noOfPeople),
      leadMeta: normalizedMeta,
      status: "Pending",
      hostPanelStatus: "Pending",
    });

    // Nomads auto-escalates website-source leads at creation (workspaceId
    // already known from the site), so they show up in both Master Panel and
    // this host's workspace immediately — no manual "Escalate" click needed.
    // Leads Nomads couldn't resolve a workspace for fall back to the old
    // Master-Panel-review-then-escalate flow.

    const upstreamEndpoints = [
      nomadsApiUrl("/api/leads/create-lead"),
    ];

    let lastError = null;
    for (const endpoint of upstreamEndpoints) {
      try {
        const upstream = await axios.post(endpoint, payload);
        await WebsiteLead.findByIdAndUpdate(localLead._id, {
          $set: { upstreamSynced: true, upstreamError: "" },
        }).exec();
        return res.status(upstream.status || 201).json(upstream.data);
      } catch (error) {
        lastError = error;
        const rawMessage = String(
          error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.message ||
            "",
        ).toLowerCase();

        const companyNameMissing =
          rawMessage.includes("company name") && rawMessage.includes("provide");

        if (companyNameMissing) {
          try {
            const retryPayload = {
              ...payload,
              companyName: resolvedCompanyName,
              company: resolvedCompanyName,
              company_name: resolvedCompanyName,
              leadCompanyName: resolvedCompanyName,
            };
            const retryUpstream = await axios.post(endpoint, retryPayload);
            await WebsiteLead.findByIdAndUpdate(localLead._id, {
              $set: { upstreamSynced: true, upstreamError: "" },
            }).exec();
            return res.status(retryUpstream.status || 201).json(retryUpstream.data);
          } catch (retryError) {
            lastError = retryError;
          }
        }
      }
    }

    const message =
      lastError?.response?.data?.message ||
      lastError?.response?.data?.error ||
      lastError?.message ||
      "Lead saved locally. Upstream sync failed.";

    await WebsiteLead.findByIdAndUpdate(localLead._id, {
      $set: { upstreamSynced: false, upstreamError: String(message || "") },
    }).exec();

    return res.status(201).json({
      message: "Lead submitted successfully",
      leadId: String(localLead._id),
      upstreamSync: false,
      upstreamMessage: message,
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Failed to create website lead",
    });
  }
};

