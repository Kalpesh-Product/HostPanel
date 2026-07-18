/**
 * externalBookingHelpers.ts
 *
 * Pure helper functions for the External Bookings feature.
 * Extracted from MeetingRoomsPage.tsx so they can be independently
 * imported and property-tested.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const BOOKING_SLOT_STEP_MINUTES = 5;
export const BOOKING_MIN_DURATION_MINUTES = 30;
export const BOOKING_DAY_START_MINUTES = 9 * 60;
export const BOOKING_DAY_END_MINUTES = 22 * 60;

// ---------------------------------------------------------------------------
// Time utilities (replicated exactly from MeetingRoomsPage.tsx)
// ---------------------------------------------------------------------------

/**
 * Converts a "HH:MM" string to total minutes from midnight.
 * Returns null for any input that doesn't match the HH:MM format.
 */
export function timeToMinutes(value?: string): number | null {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts a total-minutes-from-midnight number to a "HH:MM" string.
 * Wraps around at 1440 (24 h). Returns '' for invalid input.
 */
export function minutesToTimeString(value: number): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '';
  }

  const normalized = ((Number(value) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{10,13}$/;

/**
 * Returns true when `v` is a syntactically valid email address.
 * Uses the same regex as the ExternalBookingDialog client form.
 */
export function validateEmail(v: string): boolean {
  return EMAIL_REGEX.test(v);
}

/**
 * Returns true when `v` is a valid phone number:
 * optional leading "+", then 10–13 digits, no spaces.
 */
export function validatePhone(v: string): boolean {
  return PHONE_REGEX.test(v);
}

// ---------------------------------------------------------------------------
// Slot conflict detection
// ---------------------------------------------------------------------------

/**
 * Returns true if any non-cancelled booking for `resourceName` on `date`
 * overlaps the interval [startTime, endTime) using the standard interval
 * overlap test: b.startTime < endTime AND b.endTime > startTime.
 */
export function hasSlotConflict(
  bookings: any[],
  resourceName: string,
  date: string,
  startTime: string,
  endTime: string,
): boolean {
  return bookings.some(
    (b) =>
      (b.roomName === resourceName || b.resourceName === resourceName) &&
      b.date === date &&
      b.status !== 'cancelled' &&
      b.startTime < endTime &&
      b.endTime > startTime,
  );
}

// ---------------------------------------------------------------------------
// Available slot computation
// ---------------------------------------------------------------------------

/**
 * Computes all free time windows for `resourceName` on `date` that can fit
 * `desiredDurationMinutes`, stepping through the day in
 * BOOKING_SLOT_STEP_MINUTES (5-minute) increments from 09:00 to 22:00.
 *
 * Cancelled bookings are excluded from conflict consideration.
 */
export function computeAvailableSlots(
  bookings: any[],
  resourceName: string,
  date: string,
  desiredDurationMinutes: number,
  dayStartMinutes?: number,
  dayEndMinutes?: number,
  minStartMinutes?: number,
): Array<{ startTime: string; endTime: string }> {
  // Collect all confirmed / in-progress bookings for this resource on this date
  const dayBookings = bookings
    .filter(
      (b) =>
        (b.roomName === resourceName || b.resourceName === resourceName) &&
        b.date === date &&
        b.status !== 'cancelled',
    )
    .sort(
      (a, b) =>
        (timeToMinutes(a.startTime) ?? 0) - (timeToMinutes(b.startTime) ?? 0),
    );

  const DAY_START = Math.max(dayStartMinutes ?? BOOKING_DAY_START_MINUTES, minStartMinutes ?? -Infinity);
  const DAY_END = dayEndMinutes ?? BOOKING_DAY_END_MINUTES;

  // Build free windows between booked intervals
  const freeWindows: Array<{ start: number; end: number }> = [];
  let cursor = DAY_START;

  for (const booking of dayBookings) {
    const bStart = timeToMinutes(booking.startTime) ?? 0;
    const bEnd = timeToMinutes(booking.endTime) ?? 0;
    if (bStart > cursor) {
      freeWindows.push({ start: cursor, end: bStart });
    }
    cursor = Math.max(cursor, bEnd);
  }
  if (cursor < DAY_END) {
    freeWindows.push({ start: cursor, end: DAY_END });
  }

  // From each free window enumerate start points at BOOKING_SLOT_STEP_MINUTES steps
  const suggestions: Array<{ startTime: string; endTime: string }> = [];

  for (const window of freeWindows) {
    const windowDuration = window.end - window.start;
    if (windowDuration < desiredDurationMinutes) continue;

    for (
      let s = window.start;
      s + desiredDurationMinutes <= window.end;
      s += BOOKING_SLOT_STEP_MINUTES
    ) {
      suggestions.push({
        startTime: minutesToTimeString(s),
        endTime: minutesToTimeString(s + desiredDurationMinutes),
      });
    }
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// External pricing computation
// ---------------------------------------------------------------------------

export interface ExternalPricingResult {
  basePriceRaw: number;
  discountAmount: number;
  gstAmount: number;
  totalAmount: number;
  noRateSet: boolean;
}

const ZERO_PRICING: ExternalPricingResult = {
  basePriceRaw: 0,
  discountAmount: 0,
  gstAmount: 0,
  totalAmount: 0,
  noRateSet: false,
};

/**
 * A multi-day booking reserves the SAME start–end time window on each
 * calendar day between startDate and endDate (inclusive), so the billed
 * duration is (endTime − startTime) × number of days — e.g. 10 AM–12 PM
 * across 3 days = 6 hours, never full business days in between. The window
 * is clamped to business hours before multiplying. When startDate ===
 * endDate this reduces to the plain same-day duration.
 *
 * Returns hours (may be fractional), or 0 for any invalid/empty input
 * (including endTime ≤ startTime — the per-day window must be positive).
 */
export function computeBusinessHoursDuration(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
  dayStartMinutes: number = BOOKING_DAY_START_MINUTES,
  dayEndMinutes: number = BOOKING_DAY_END_MINUTES,
): number {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (!startDate || !endDate || startMinutes === null || endMinutes === null) {
    return 0;
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  const dayCount = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  if (dayCount <= 0) {
    return 0;
  }

  const dailyStart = Math.max(startMinutes, dayStartMinutes);
  const dailyEnd = Math.min(endMinutes, dayEndMinutes);
  if (dailyEnd <= dailyStart) {
    return 0;
  }

  return ((dailyEnd - dailyStart) * dayCount) / 60;
}

function applyDiscountAndGst(basePriceRaw: number, discountType: 'flat' | 'percent', discountValue: number | string): ExternalPricingResult {
  const rawDiscountInput = Number(discountValue) || 0;
  let discountAmount = 0;

  if (rawDiscountInput > 0) {
    if (discountType === 'percent') {
      const pct = Math.min(Math.max(rawDiscountInput, 0), 100);
      discountAmount = Math.round(basePriceRaw * (pct / 100) * 100) / 100;
    } else {
      discountAmount = Math.min(Math.max(rawDiscountInput, 0), basePriceRaw);
      discountAmount = Math.round(discountAmount * 100) / 100;
    }
  }

  const discountedBase = Math.max(basePriceRaw - discountAmount, 0);
  const gstAmount = Math.round(discountedBase * 0.18 * 100) / 100;
  const totalAmount = Math.round((discountedBase + gstAmount) * 100) / 100;

  return { basePriceRaw, discountAmount, gstAmount, totalAmount, noRateSet: false };
}

/**
 * Same pricing model as computeExternalPricing, but for a booking that may
 * span multiple calendar days. Only the business-hours portion of each day
 * in [startDate, endDate] is billed (see computeBusinessHoursDuration).
 */
export function computeExternalPricingMultiDay(
  pricePerHour: number,
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
  discountType: 'flat' | 'percent',
  discountValue: number | string,
  dayStartMinutes?: number,
  dayEndMinutes?: number,
): ExternalPricingResult {
  const priceNum = Number(pricePerHour ?? 0);
  const noRateSet = pricePerHour === 0 || pricePerHour === null || pricePerHour === undefined;

  if (noRateSet || !startDate || !startTime || !endDate || !endTime) {
    return { ...ZERO_PRICING, noRateSet };
  }

  const durationHours = computeBusinessHoursDuration(startDate, startTime, endDate, endTime, dayStartMinutes, dayEndMinutes);
  if (durationHours <= 0) {
    return { ...ZERO_PRICING, noRateSet };
  }

  const basePriceRaw = Math.round(priceNum * durationHours * 100) / 100;
  return applyDiscountAndGst(basePriceRaw, discountType, discountValue);
}

/**
 * Computes the full external booking price breakdown.
 *
 * Formula (all monetary values rounded to 2 decimal places):
 *   basePriceRaw    = pricePerHour × ((endMinutes − startMinutes) / 60)
 *   discountAmount  = flat:    min(max(discountValue, 0), basePriceRaw)
 *                     percent: basePriceRaw × (min(max(discountValue, 0), 100) / 100)
 *   discountedBase  = max(basePriceRaw − discountAmount, 0)
 *   gstAmount       = discountedBase × 0.18
 *   totalAmount     = discountedBase + gstAmount
 *
 * Returns all-zero result when:
 *   - pricePerHour is 0, null, or undefined
 *   - endMinutes ≤ startMinutes (invalid duration)
 *   - startTime or endTime cannot be parsed
 */
export function computeExternalPricing(
  pricePerHour: number,
  startTime: string,
  endTime: string,
  discountType: 'flat' | 'percent',
  discountValue: number | string,
): ExternalPricingResult {
  const priceNum = Number(pricePerHour ?? 0);
  const noRateSet = pricePerHour === 0 || pricePerHour === null || pricePerHour === undefined;

  if (noRateSet || !startTime || !endTime) {
    return { ...ZERO_PRICING, noRateSet };
  }

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return { ...ZERO_PRICING, noRateSet };
  }

  const durationHours = (endMinutes - startMinutes) / 60;
  const basePriceRaw = Math.round(priceNum * durationHours * 100) / 100;

  // Discount
  const rawDiscountInput = Number(discountValue) || 0;
  let discountAmount = 0;

  if (rawDiscountInput > 0) {
    if (discountType === 'percent') {
      const pct = Math.min(Math.max(rawDiscountInput, 0), 100);
      discountAmount = Math.round(basePriceRaw * (pct / 100) * 100) / 100;
    } else {
      // flat
      discountAmount = Math.min(Math.max(rawDiscountInput, 0), basePriceRaw);
      discountAmount = Math.round(discountAmount * 100) / 100;
    }
  }

  const discountedBase = Math.max(basePriceRaw - discountAmount, 0);
  const gstAmount = Math.round(discountedBase * 0.18 * 100) / 100;
  const totalAmount = Math.round((discountedBase + gstAmount) * 100) / 100;

  return { basePriceRaw, discountAmount, gstAmount, totalAmount, noRateSet };
}
