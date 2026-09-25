// Lead-form definitions for the new templates. The older templates keep using
// `getLeadFieldsForProduct` in useWebsiteTemplateData.ts; this is separate so the
// richer field types (time slots, selects, notes) can't disturb them.
import { getServiceProfile, type ServiceKind } from "./verticalProfiles";
import type { OpeningHoursRow } from "./offeringFields";

export type LeadFieldType = "text" | "email" | "tel" | "number" | "date" | "time" | "select" | "textarea";

export interface LeadFieldDef {
  key: string;
  label: string;
  type: LeadFieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** "form" fields live on `leadForm`; "extra" fields on `leadExtras` (sent as-is). */
  target: "form" | "extra";
  /** Render at half width next to the following field. */
  half?: boolean;
  min?: number | string;
  max?: number | string;
}

export interface LeadFormDefinition {
  title: string;
  submitLabel: string;
  successMessage: string;
  inquiryType: string;
  fields: LeadFieldDef[];
}

export interface LeadFormContext {
  reservation?: { maxGuests?: number; slotIntervalMinutes?: number; seatingOptions?: string[]; confirmationNote?: string };
  openingHours?: OpeningHoursRow[];
  /** Selected date (YYYY-MM-DD) — used to pick the day's opening hours. */
  date?: string;
  /** "visit" swaps a co-living / co-working enquiry for a tour-booking form. */
  mode?: "enquiry" | "visit";
  /** Names of the spaces on offer, so a general co-working enquiry can say which one it is about. */
  spaces?: string[];
  today?: string;
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const toMinutes = (hhmm: string) => {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : NaN;
};
const fmt = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** 12-hour label for a HH:mm value, e.g. "18:30" -> "6:30 PM". */
export const formatTime12h = (hhmm: string) => {
  const minutes = toMinutes(hhmm);
  if (!Number.isFinite(minutes)) return hhmm;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
};

/**
 * Bookable time slots for a date. Returns [] when the place is closed that day, and
 * `null` when there are no structured hours at all (caller falls back to a free
 * time input).
 */
export const generateTimeSlots = (
  openingHours: OpeningHoursRow[] | undefined,
  date: string | undefined,
  intervalMinutes = 30,
): string[] | null => {
  const rows = Array.isArray(openingHours) ? openingHours : [];
  if (!rows.length) return null;
  if (!date) return null;
  const day = DAY_KEYS[new Date(`${date}T12:00:00`).getDay()];
  const row = rows.find((r) => r.day === day);
  if (!row || row.closed) return [];
  const open = toMinutes(row.open);
  let close = toMinutes(row.close);
  if (!Number.isFinite(open) || !Number.isFinite(close)) return null;
  if (close <= open) close += 24 * 60; // closes after midnight
  const step = Math.max(5, intervalMinutes);
  const slots: string[] = [];
  // Last seating a step before closing.
  for (let t = open; t <= close - step; t += step) slots.push(fmt(t % (24 * 60)));
  return slots;
};

const contactFields = (): LeadFieldDef[] => [
  { key: "fullName", label: "Full name", type: "text", required: true, target: "form", half: true },
  { key: "mobile", label: "Mobile number", type: "tel", required: true, target: "form", half: true },
  { key: "email", label: "Email", type: "email", required: true, target: "form" },
];

export const getLeadFormDefinition = (kind: ServiceKind, ctx: LeadFormContext = {}): LeadFormDefinition => {
  const profile = getServiceProfile(kind);
  const base = {
    title: profile.labels.leadTitle,
    submitLabel: profile.labels.leadSubmit,
    successMessage: profile.labels.leadSuccess,
    inquiryType: profile.inquiryType,
  };

  if (kind === "menu") {
    const maxGuests = Math.max(1, Number(ctx.reservation?.maxGuests) || 10);
    const slots = generateTimeSlots(ctx.openingHours, ctx.date, ctx.reservation?.slotIntervalMinutes || 30);
    const seating = (ctx.reservation?.seatingOptions || []).filter(Boolean);
    const hasHours = (ctx.openingHours || []).length > 0;
    // With structured hours the time is a pick-list for the chosen day; without any
    // hours there's nothing to derive slots from, so fall back to a free time input.
    const timeField: LeadFieldDef = !hasHours
      ? { key: "time", label: "Preferred time", type: "time", required: true, target: "extra", half: true }
      : {
          key: "time",
          label: "Time",
          type: "select",
          required: true,
          target: "extra",
          half: true,
          options: (slots || []).map((s) => ({ value: s, label: formatTime12h(s) })),
          placeholder: slots === null ? "Pick a date first" : slots.length ? "Select a time" : "Closed on this day",
        };
    return {
      ...base,
      fields: [
        ...contactFields(),
        { key: "people", label: "Guests", type: "number", required: true, target: "form", half: true, min: 1, max: maxGuests },
        { key: "startDate", label: "Date", type: "date", required: true, target: "form", half: true, min: ctx.today },
        timeField,
        ...(seating.length
          ? ([
              {
                key: "seating",
                label: "Seating",
                type: "select",
                target: "extra",
                half: true,
                options: seating.map((s) => ({ value: s, label: s })),
                placeholder: "No preference",
              },
            ] as LeadFieldDef[])
          : []),
        { key: "notes", label: "Special requests or occasion", type: "textarea", target: "extra" },
      ],
    };
  }

  if (kind === "hostel" || kind === "workation") {
    return {
      ...base,
      fields: [
        ...contactFields(),
        { key: "startDate", label: "Check-in", type: "date", required: true, target: "form", half: true, min: ctx.today },
        { key: "endDate", label: "Check-out", type: "date", required: true, target: "form", half: true, min: ctx.date || ctx.today },
        {
          key: "people",
          label: kind === "hostel" ? "Beds / guests" : "Guests",
          type: "number",
          required: true,
          target: "form",
          min: 1,
        },
        { key: "notes", label: "Anything we should know?", type: "textarea", target: "extra" },
      ],
    };
  }

  if (kind === "coLiving") {
    if (ctx.mode === "visit") {
      const slots = Array.from({ length: 9 }, (_, i) => fmt((10 + i) * 60)); // 10:00 – 18:00
      return {
        title: "Schedule a visit",
        submitLabel: "Request a visit",
        successMessage: "Thanks! We'll confirm your visit slot shortly.",
        inquiryType: "Tour Visit",
        fields: [
          ...contactFields(),
          { key: "startDate", label: "Visit date", type: "date", required: true, target: "form", half: true, min: ctx.today },
          {
            key: "time",
            label: "Time",
            type: "select",
            required: true,
            target: "extra",
            half: true,
            options: slots.map((s) => ({ value: s, label: formatTime12h(s) })),
            placeholder: "Select a time",
          },
          { key: "notes", label: "What would you like to see?", type: "textarea", target: "extra" },
        ],
      };
    }
    return {
      ...base,
      fields: [
        ...contactFields(),
        { key: "startDate", label: "Move-in date", type: "date", required: true, target: "form", half: true, min: ctx.today },
        { key: "endDate", label: "Staying until (optional)", type: "date", target: "form", half: true, min: ctx.date || ctx.today },
        { key: "people", label: "Occupants", type: "number", required: true, target: "form", min: 1 },
        { key: "notes", label: "Anything we should know?", type: "textarea", target: "extra" },
      ],
    };
  }

  if (kind === "workspace") {
    const spaces = (ctx.spaces || []).filter(Boolean);
    if (ctx.mode === "visit") {
      const slots = generateTimeSlots(ctx.openingHours, ctx.date, 60);
      const hasHours = (ctx.openingHours || []).length > 0;
      const fallback = Array.from({ length: 9 }, (_, i) => fmt((9 + i) * 60)); // 09:00 – 17:00
      const options = hasHours ? slots || [] : fallback;
      return {
        title: "Book a visit",
        submitLabel: "Request a visit",
        successMessage: "Thanks! We'll confirm your visit slot shortly.",
        inquiryType: "Tour Visit",
        fields: [
          ...contactFields(),
          { key: "startDate", label: "Visit date", type: "date", required: true, target: "form", half: true, min: ctx.today },
          {
            key: "time",
            label: "Time",
            type: "select",
            required: true,
            target: "extra",
            half: true,
            options: options.map((slot) => ({ value: slot, label: formatTime12h(slot) })),
            placeholder: hasHours && slots === null ? "Pick a date first" : options.length ? "Select a time" : "Closed on this day",
          },
          { key: "people", label: "People joining", type: "number", target: "form", min: 1 },
          { key: "notes", label: "What would you like to see?", type: "textarea", target: "extra" },
        ],
      };
    }
    return {
      ...base,
      fields: [
        ...contactFields(),
        ...(spaces.length
          ? ([
              {
                key: "roomType",
                label: "Interested in",
                type: "select",
                target: "extra",
                options: spaces.map((name) => ({ value: name, label: name })),
                placeholder: "Not sure yet",
              },
            ] as LeadFieldDef[])
          : []),
        { key: "people", label: "Team size", type: "number", required: true, target: "form", half: true, min: 1 },
        { key: "startDate", label: "Preferred start date", type: "date", target: "form", half: true, min: ctx.today },
        { key: "notes", label: "Tell us what you need", type: "textarea", target: "extra" },
      ],
    };
  }

  if (kind === "meeting") {
    return {
      ...base,
      fields: [
        ...contactFields(),
        { key: "people", label: "Attendees", type: "number", required: true, target: "form", half: true, min: 1 },
        { key: "startDate", label: "Meeting date", type: "date", required: true, target: "form", half: true, min: ctx.today },
        { key: "time", label: "Start time", type: "time", required: true, target: "extra", half: true },
        { key: "endTime", label: "End time", type: "time", target: "extra", half: true },
        { key: "notes", label: "Requirements", type: "textarea", target: "extra" },
      ],
    };
  }

  return {
    ...base,
    fields: [
      ...contactFields(),
      { key: "people", label: "No. of people", type: "number", target: "form", half: true, min: 1 },
      { key: "startDate", label: "Preferred date", type: "date", target: "form", half: true, min: ctx.today },
      { key: "notes", label: "Message", type: "textarea", target: "extra" },
    ],
  };
};

/** Nights between two YYYY-MM-DD dates, or 0 when either is missing / reversed. */
export const nightsBetween = (start?: string, end?: string) => {
  if (!start || !end) return 0;
  const ms = new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime();
  const nights = Math.round(ms / 86400000);
  return nights > 0 ? nights : 0;
};

/** First run of digits (with decimals) in a price string, e.g. "₹1,200 / night" -> 1200. */
export const parsePriceNumber = (price: unknown): number | null => {
  const match = String(price ?? "").replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
