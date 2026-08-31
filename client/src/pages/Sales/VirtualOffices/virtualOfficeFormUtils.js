export function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function parseDateForInput(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDisplayDate(value) {
  if (!value) return "--";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

// Mirrors buildTermEndDate() in server/services/virtualOffice.service.ts —
// term end = rent start date + term (months) - 1 day. Kept in sync so the
// form's live preview always matches what the server will actually store.
export function computeTermEnd(rentDateValue, totalTermMonths) {
  if (!rentDateValue) return null;
  const start = new Date(rentDateValue);
  if (Number.isNaN(start.getTime())) return null;
  const months = Math.max(0, toNumber(totalTermMonths));
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  end.setDate(end.getDate() - 1);
  return end;
}

// Annual increment only makes sense once the contract runs past a full year.
export function annualIncrementApplies(totalTermMonths) {
  return Math.max(0, toNumber(totalTermMonths)) > 12;
}

// Counts non-Sunday days in the month of `dateValue` (defaults to today).
// Used to convert between a per-day desk rate and its per-month equivalent —
// per-month is priced off actual working days, not a flat 30-day month.
export function getWorkingDaysInMonth(dateValue) {
  const parsed = dateValue ? new Date(dateValue) : new Date();
  const ref = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    if (new Date(year, month, day).getDay() !== 0) count++;
  }
  return count;
}

export const EMPTY_FORM = {
  clientName: "",
  brandName: "",
  sector: "",
  email: "",
  phone: "",
  country: "",
  state: "",
  city: "",
  spaceLocation: "",
  spaceFloor: "",
  spaceWing: "",
  serviceName: "",
  hoPoc: { name: "", email: "", phone: "", address: "" },
  localPoc: { name: "", email: "", phone: "", address: "" },
  openDesks: "",
  openDeskRate: "",
  openDeskMonthlyRate: "",
  perDeskMeetingCredits: "",
  totalMeetingCredits: "",
  totalTerm: "",
  annualIncrement: "",
  annualIncrementAmount: "",
  termStart: "",
  rentDate: "",
  lockInMonths: "",
  rentStatus: "Active",
  advanceMonths: "1",
  securityDepositPercent: "",
  securityDeposit: "",
  securityDepositPaid: false,
  notes: "",
};

// Maps a fetched virtual office record back into the editable form shape.
export function buildFormFromRecord(record) {
  if (!record) return { ...EMPTY_FORM };
  const monthlyRent = record.monthlyRent || 0;
  return {
    ...EMPTY_FORM,
    clientName: record.clientName || "",
    brandName: record.brandName || "",
    sector: record.sector || "",
    email: record.email || "",
    phone: record.phone || "",
    country: record.country || "",
    state: record.state || "",
    city: record.city || "",
    spaceLocation: record.spaceLocation || "",
    spaceFloor: record.spaceFloor || "",
    spaceWing: record.spaceWing || "",
    serviceName: record.serviceName || "",
    hoPoc: {
      name: record.hoPoc?.name || "",
      email: record.hoPoc?.email || "",
      phone: record.hoPoc?.phone || "",
      address: record.hoPoc?.address || "",
    },
    localPoc: {
      name: record.localPoc?.name || "",
      email: record.localPoc?.email || "",
      phone: record.localPoc?.phone || "",
      address: record.localPoc?.address || "",
    },
    openDesks: record.openDesks ?? "",
    openDeskRate: record.openDeskRate ?? "",
    openDeskMonthlyRate: record.openDeskMonthlyRate
      ?? (record.openDesks ? Math.round(monthlyRent / record.openDesks) : ""),
    perDeskMeetingCredits: record.perDeskMeetingCredits ?? "",
    totalMeetingCredits: record.totalMeetingCredits ?? "",
    totalTerm: record.totalTerm ?? "",
    annualIncrement: record.annualIncrement ?? "",
    annualIncrementAmount: record.annualIncrement && monthlyRent
      ? String(Math.round(monthlyRent * (record.annualIncrement / 100)))
      : "",
    termStart: parseDateForInput(record.termStart ?? record.rentDate),
    rentDate: parseDateForInput(record.rentDate),
    lockInMonths: record.lockInMonths ?? "",
    rentStatus: record.rentStatus || "Active",
    advanceMonths: record.advanceMonths ?? "1",
    securityDepositPercent: record.securityDepositPercent
      ?? (record.securityDeposit && record.totalContract
        ? Math.round((record.securityDeposit / record.totalContract) * 100)
        : ""),
    securityDeposit: record.securityDeposit ?? "",
    securityDepositPaid: Boolean(record.securityDepositPaid),
    notes: record.notes || "",
  };
}

// Monthly rent is fully desk-driven: open desks x the per-desk monthly rate.
// Everything downstream (contract total, deposit, advance, increment) flows
// from that single computed number. Security deposit and annual increment
// are each entered as EITHER a percent OR an amount — both are kept as real
// form fields (synced by the modal's onChange handlers) so this function
// just passes them through rather than re-deriving one from the other,
// which is what let the amount fields get overwritten while typing.
export function computeCalculations(form) {
  const openDesks = Math.max(0, toNumber(form.openDesks));
  const openDeskMonthlyRate = Math.max(0, toNumber(form.openDeskMonthlyRate));
  const totalDesks = openDesks;
  const monthlyRent = Math.round(openDesks * openDeskMonthlyRate);

  const totalTerm = Math.max(0, toNumber(form.totalTerm));
  const totalContract = monthlyRent * totalTerm;

  const incrementApplies = annualIncrementApplies(totalTerm);
  const annualIncrement = incrementApplies ? Math.max(0, toNumber(form.annualIncrement)) : 0;
  const annualIncrementAmount = incrementApplies ? Math.max(0, toNumber(form.annualIncrementAmount)) : 0;

  const advanceMonths = Math.max(0, toNumber(form.advanceMonths) || 1);

  const securityDepositPercent = Math.max(0, toNumber(form.securityDepositPercent));
  const securityDeposit = Math.max(0, toNumber(form.securityDeposit));

  const advanceAmount = Math.round(monthlyRent * advanceMonths);
  const initialAmount = securityDeposit + advanceAmount;

  const perDeskMeetingCredits = Math.max(0, toNumber(form.perDeskMeetingCredits));
  const totalMeetingCredits = Math.max(0, toNumber(form.totalMeetingCredits)) || Math.round(perDeskMeetingCredits * totalDesks);

  const lockInMonths = Math.max(0, toNumber(form.lockInMonths));
  const lockInEnd = lockInMonths > 0 ? computeTermEnd(form.termStart, lockInMonths) : null;

  return {
    totalDesks,
    monthlyRent,
    totalContract,
    incrementApplies,
    annualIncrement,
    annualIncrementAmount,
    securityDepositPercent,
    securityDeposit,
    advanceAmount,
    initialAmount,
    totalMeetingCredits,
    lockInMonths,
    lockInEnd,
  };
}

export function validateForm(form) {
  const errors = {};
  if (!form.clientName.trim() && !form.brandName.trim()) errors.clientName = "Client / brand name is required.";
  if (!form.localPoc.name.trim()) errors.localPocName = "Local POC name is required.";
  if (!form.hoPoc.name.trim()) errors.hoPocName = "HO POC name is required.";
  if (!Number.isFinite(toNumber(form.openDesks)) || toNumber(form.openDesks) <= 0) errors.openDesks = "Open desks is required.";
  if (!Number.isFinite(toNumber(form.openDeskMonthlyRate)) || toNumber(form.openDeskMonthlyRate) <= 0) errors.openDeskMonthlyRate = "Monthly rate per desk is required.";
  if (!Number.isFinite(toNumber(form.totalTerm)) || toNumber(form.totalTerm) <= 0) errors.totalTerm = "Contract term is required.";
  if (!form.termStart) errors.termStart = "Term start date is required.";
  if (!form.rentDate) errors.rentDate = "Rent due date is required.";
  return errors;
}

export function buildSavePayload(form) {
  const recalc = computeCalculations(form);
  return {
    ...form,
    ...recalc,
    clientName: form.clientName.trim(),
    brandName: form.brandName.trim(),
    openDesks: toNumber(form.openDesks),
    openDeskRate: toNumber(form.openDeskRate),
    openDeskMonthlyRate: toNumber(form.openDeskMonthlyRate),
    totalTerm: toNumber(form.totalTerm),
    advanceMonths: toNumber(form.advanceMonths),
    perDeskMeetingCredits: toNumber(form.perDeskMeetingCredits),
    termStart: form.termStart ? new Date(form.termStart).toISOString() : null,
    rentDate: form.rentDate ? new Date(form.rentDate).toISOString() : null,
  };
}
