import { Request, Response, NextFunction } from "express";
import { DayPassBooking } from "../models/DayPassBooking.js";
import { Resource } from "../models/Resource.js";
import { TenantCompany } from "../models/TenantCompany.js";
import VisitorLog from "../models/VisitorLog.js";

// Same workspace resolution the rest of the controllers use — the JWT
// middleware stamps the caller's active workspace membership on the request.
const workspaceIdFor = (req: any) => req.workspaceMembership?.workspace || "";

// ── Coworking Day Pass (Daily Flexi Desk) controller ────────────────────────
// A day pass is NOT a meeting-room booking — it lives in the dedicated
// DayPassBooking collection, never touches MeetingRoomBooking, and can only
// ever bind to an Open Desk resource. Time is stored as a bare calendar date
// (no hourly slot); a pass covers the workspace's standard business day.

const DEFAULT_PRICE_PER_DAY = 500;
// Half-Day Pass pricing — a fixed fraction of the day rate, not a negotiable
// amount: the front desk toggles the pass type, the math stays server-side.
const HALF_DAY_RATE_PERCENT = 0.6;

const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

const sanitize = (value: unknown) => String(value ?? "").trim();

const parseMoney = (value: unknown) => {
  const match = String(value ?? "").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : NaN;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);

// 1. ── Unique DP-XXXX code allocator ─────────────────────────────────────────
// bookingNumber is unique per workspace in MeetingRoomBooking but this model
// has its own sequence: query the highest DP number and continue from there,
// with retry-on-collision for concurrent issuances.
export async function createDayPassWithUniqueCode(payload: Record<string, any>, maxAttempts = 5) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const lastPass: any = await DayPassBooking.findOne({})
      .sort({ bookingNumber: -1 })
      .select("bookingNumber")
      .lean()
      .exec();
    const lastNum = Number(lastPass?.bookingNumber);
    const bookingNumber = Number.isFinite(lastNum) ? Math.max(1001, lastNum + 1) : 1001;
    try {
      return await DayPassBooking.create({
        ...payload,
        bookingNumber,
        bookingCode: `DP-${bookingNumber}`,
      });
    } catch (error: any) {
      // E11000 — another allocation took the number between the read and the
      // write; re-read and try again instead of failing the issuance.
      if (Number(error?.code) !== 11000 || attempt === maxAttempts - 1) throw error;
    }
  }
  throw new Error("Unable to allocate unique Day Pass booking code");
}

// 2. ── Real-time floor availability ──────────────────────────────────────────
//   availableCount =
//     total Open Desk capacity
//     − desks held long-term by active tenant companies
//     − passes already issued for that calendar date (attendees, non-cancelled)
// Shared by the availability endpoint, the walk-in endpoint, and the online
// lead finalize path so every channel counts exactly the same way.
export const resolveDayPassAvailability = async (workspaceId: string, dateInput: unknown) => {
  const targetDate =
    dateInput instanceof Date && !Number.isNaN(dateInput.getTime())
      ? dateInput
      : new Date(String(dateInput || ""));
  if (!sanitize(workspaceId) || Number.isNaN(targetDate.getTime())) return null;

  const dayStart = startOfDay(targetDate);
  const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

  // 1. Total Open Desk capacity — Open Desk resources ONLY. A day pass can
  // never be bound to a Meeting Room resource.
  const openDeskResources = await Resource.find({
    workspaceId,
    type: "Open Desk",
    status: "Active",
    isActive: true,
  })
    .select("name pricePerDay pricePerHour capacity")
    .lean()
    .exec();
  const totalCapacity = openDeskResources.reduce((sum, r) => sum + (Number(r.capacity) || 1), 0);
  const defaultResource = openDeskResources[0] || null;
  if (!defaultResource) return null;

  // 2. Desks locked long-term by active monthly TenantCompany members.
  const tenantCompanies = await TenantCompany.find({
    workspaceId,
    status: "Active",
  })
    .select("companyDetails")
    .lean()
    .exec();
  const tenantAssignedDesks = tenantCompanies.reduce(
    (sum, t) => sum + (Number(t?.companyDetails?.openDesks) || 0),
    0,
  );

  // 3. Passes already issued for this calendar date.
  const existingPasses = await DayPassBooking.find({
    workspaceId,
    status: { $nin: ["Cancelled"] },
    date: { $gte: dayStart, $lte: dayEnd },
  })
    .select("attendees")
    .lean()
    .exec();
  const bookedPassesCount = existingPasses.reduce((sum, p) => sum + (Number(p.attendees) || 1), 0);

  const availableCount = Math.max(0, totalCapacity - tenantAssignedDesks - bookedPassesCount);
  return {
    date: targetDate,
    totalCapacity,
    tenantAssignedDesks,
    bookedPassesCount,
    availableCount,
    isAvailable: availableCount > 0,
    isLimited: availableCount > 0 && availableCount <= 3,
    isSoldOut: availableCount <= 0,
    resourceId: defaultResource._id,
    resourceName: defaultResource.name || "Open Desk Area",
    pricePerDay:
      Number(defaultResource.pricePerDay) > 0
        ? Number(defaultResource.pricePerDay)
        : DEFAULT_PRICE_PER_DAY,
  };
};

// GET /api/leads/day-pass-availability — read-only availability snapshot that
// powers the stock badges: green "Available", amber "Limited", red "Sold Out".
export const getDayPassAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = sanitize(req.query?.workspaceId) || workspaceIdFor(req as any);
    if (!workspaceId) {
      return res.status(400).json({ message: "A workspace is required" });
    }
    const availability = await resolveDayPassAvailability(workspaceId, req.query?.date || new Date());
    if (!availability) {
      return res.status(404).json({
        message: "No active Open Desk resource is configured for this workspace — add one before issuing day passes",
        totalCapacity: 0,
        tenantAssignedDesks: 0,
        bookedPassesCount: 0,
        availableCount: 0,
        isAvailable: false,
        isLimited: false,
        isSoldOut: true,
        resourceId: null,
        resourceName: "Open Desk Area",
        pricePerDay: 0,
      });
    }
    return res.status(200).json({
      message: "Day pass availability fetched successfully",
      ...availability,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/leads/day-pass-bookings — the "Day Pass & Daily Flexi Register"
// feed: every DayPassBooking for the workspace, optionally filtered by date,
// lifecycle status, and a guest/code search term. Populates the bound Open
// Desk resource so the register can show the area name.
export const getDayPassBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = sanitize(req.query?.workspaceId) || workspaceIdFor(req as any);
    if (!workspaceId) {
      return res.status(400).json({ message: "A workspace is required" });
    }
    const filter: Record<string, any> = { workspaceId };

    if (req.query?.date) {
      const targetDate = new Date(String(req.query.date));
      if (!Number.isNaN(targetDate.getTime())) {
        filter.date = {
          $gte: startOfDay(targetDate),
          $lte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59),
        };
      }
    }
    const statusFilter = sanitize(req.query?.status);
    if (["Booked", "Checked-in", "Completed", "Cancelled"].includes(statusFilter)) {
      filter.status = statusFilter;
    }
    const search = sanitize(req.query?.search);
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { guestName: searchRegex },
        { guestPhone: searchRegex },
        { guestEmail: searchRegex },
        { company: searchRegex },
        { bookingCode: searchRegex },
      ];
    }

    const bookings = await DayPassBooking.find(filter)
      .populate("resourceId", "name type floor wing")
      .sort({ date: -1, bookingNumber: -1 })
      .lean()
      .exec();
    return res.status(200).json({
      message: "Day pass bookings fetched successfully",
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/leads/day-pass-walkin — front-desk issuance. Cash/UPI/Card
// collected at the desk (no Stripe), the guest is standing right there, so
// the pass is born Checked-in with checkedInAt stamped. source is
// "Frontdesk" for the blank walk-in form, "ConvertedVisitor" when the pass
// was issued from a visitor row (sourceVisitorId attached).
export const createWalkInDayPass = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = sanitize(req.body?.workspaceId) || workspaceIdFor(req as any);
    if (!workspaceId) {
      return res.status(400).json({ message: "A workspace is required" });
    }
    const guestName = sanitize(req.body?.guestName || req.body?.name);
    if (!guestName) {
      return res.status(400).json({ message: "Guest name is required" });
    }
    const attendeeCount = Math.max(1, Math.trunc(Number(parseMoney(req.body?.attendees ?? 1))) || 1);
    const passType = sanitize(req.body?.passType) === "Half-Day" ? "Half-Day" : "Full-Day";
    const paymentMode = ["Cash", "UPI", "Card"].includes(sanitize(req.body?.paymentMode))
      ? (sanitize(req.body?.paymentMode) as "Cash" | "UPI" | "Card")
      : "Cash";
    const cashCollected = req.body?.cashCollected !== false;

    const availability = await resolveDayPassAvailability(workspaceId, req.body?.date || new Date());
    if (!availability) {
      return res.status(400).json({
        message: "No active Open Desk resource is configured for this workspace — add one before issuing day passes",
      });
    }
    if (attendeeCount > availability.availableCount) {
      return res.status(409).json({
        message: `🛑 Sold out for this date — only ${availability.availableCount} desk${availability.availableCount === 1 ? "" : "s"} remaining`,
        ...availability,
      });
    }

    // Full-Day = 100% of the day rate; Half-Day = 60%. Server-side pricing
    // keeps the desk math honest even if the client sends a stale total.
    const ratePerPass = round2(
      passType === "Half-Day" ? availability.pricePerDay * HALF_DAY_RATE_PERCENT : availability.pricePerDay,
    );
    const subtotal = round2(ratePerPass * attendeeCount);
    const platformFeeAmount = 0;
    const totalAmount = round2(subtotal + platformFeeAmount);

    const sourceVisitorId = sanitize(req.body?.sourceVisitorId);
    const source = sourceVisitorId ? "ConvertedVisitor" : "Frontdesk";

    const dayPass = await createDayPassWithUniqueCode({
      workspaceId,
      resourceId: availability.resourceId,
      guestName,
      guestEmail: sanitize(req.body?.guestEmail || req.body?.email).toLowerCase(),
      guestPhone: sanitize(req.body?.guestPhone || req.body?.phone),
      company: sanitize(req.body?.company),
      date: startOfDay(availability.date),
      passType,
      attendees: attendeeCount,
      ratePerPass,
      subtotal,
      platformFeeAmount,
      totalAmount,
      currency: sanitize(req.body?.currency).toUpperCase() || "INR",
      paymentStatus: cashCollected ? "Paid" : "Pending",
      paymentMode,
      status: "Checked-in",
      source,
      sourceVisitorId: sourceVisitorId || null,
      checkedInAt: new Date(),
      notes: sanitize(req.body?.notes),
    });

    // Best-effort: leave the DP- code on the visitor log the pass came from
    // (Convert-to-Day-Pass flow) — never blocks the issuance itself.
    if (sourceVisitorId) {
      await attachDayPassNoteToVisitor(
        sourceVisitorId,
        `Day Pass ${dayPass.bookingCode} issued (${passType}, ${attendeeCount} pass${attendeeCount === 1 ? "" : "es"}, ${paymentMode})`,
      );
    }

    return res.status(201).json({
      message: `Day pass issued — confirmation code ${dayPass.bookingCode}`,
      booking: dayPass,
      availability,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/leads/day-pass-status — front-desk lifecycle: Booked →
// Checked-in (guest arrived), Checked-in → Completed (guest checked out),
// or Cancelled. Only touches DayPassBooking rows, so meeting-room bookings
// can never be flipped from here.
export const updateDayPassStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = sanitize(req.body?.workspaceId) || workspaceIdFor(req as any);
    if (!workspaceId) {
      return res.status(400).json({ message: "A workspace is required" });
    }
    const requestedStatus = sanitize(req.body?.status);
    if (!["Checked-in", "Completed", "Cancelled"].includes(requestedStatus)) {
      return res.status(400).json({
        message: "Unsupported status — use Checked-in, Completed, or Cancelled",
      });
    }

    const dayPass = await DayPassBooking.findOne({
      _id: sanitize(req.body?.bookingId || req.params?.id),
      workspaceId,
    }).exec();
    if (!dayPass) {
      return res.status(404).json({ message: "Day pass booking not found" });
    }
    if (dayPass.status === "Cancelled") {
      return res.status(400).json({ message: "A cancelled day pass cannot be reopened" });
    }
    if (requestedStatus === "Completed" && dayPass.status !== "Checked-in") {
      return res.status(400).json({ message: "Only a checked-in day pass can be completed" });
    }

    dayPass.status = requestedStatus as any;
    if (requestedStatus === "Checked-in") {
      dayPass.checkedInAt = new Date();
      dayPass.checkedOutAt = null;
    }
    if (requestedStatus === "Completed") {
      dayPass.checkedOutAt = new Date();
    }
    if (requestedStatus === "Cancelled") {
      dayPass.checkedInAt = null;
      dayPass.notes = [sanitize(dayPass.notes), sanitize(req.body?.cancelReason) || "Cancelled at the front desk"]
        .filter(Boolean)
        .join(" · ");
    }
    await dayPass.save();

    return res.status(200).json({
      message: `Day pass marked ${requestedStatus}`,
      booking: dayPass.toObject(),
    });
  } catch (error) {
    next(error);
  }
};

// Helper used by the visitor conversion flow — attaches a short note to the
// visitor log the pass was issued from (best-effort; the pass is already
// booked by the time this runs).
export const attachDayPassNoteToVisitor = async (sourceVisitorId: string, note: string) => {
  const visitorId = sanitize(sourceVisitorId);
  if (!visitorId) return false;
  try {
    const visitor = await VisitorLog.findById(visitorId).exec();
    if (!visitor) return false;
    visitor.notes = [sanitize(visitor.notes), sanitize(note)].filter(Boolean).join("\n");
    await visitor.save();
    return true;
  } catch {
    return false;
  }
};
