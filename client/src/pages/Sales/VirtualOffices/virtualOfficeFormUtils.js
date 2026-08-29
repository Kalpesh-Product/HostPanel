export const BILLING_MONTH_DAYS = 30;

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

export const EMPTY_FORM = {
  clientName: "",
  brandName: "",
  sector: "",
  email: "",
  phone: "",
  serviceName: "",
  hoPoc: { name: "", email: "", phone: "", address: "" },
  localPoc: { name: "", email: "", phone: "", address: "" },
  openDesks: "",
  openDeskRate: "",
  cabinDesks: "",
  cabinDeskRate: "",
  monthlyRent: "",
  perDeskMeetingCredits: "",
  totalMeetingCredits: "",
  totalTerm: "",
  annualIncrement: "",
  rentDate: "",
  rentStatus: "Active",
  advanceMonths: "1",
  securityDeposit: "",
  securityDepositPaid: false,
  notes: "",
};

// Maps a fetched virtual office record back into the editable form shape.
export function buildFormFromRecord(record) {
  if (!record) return { ...EMPTY_FORM };
  return {
    ...EMPTY_FORM,
    clientName: record.clientName || "",
    brandName: record.brandName || "",
    sector: record.sector || "",
    email: record.email || "",
    phone: record.phone || "",
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
    cabinDesks: record.cabinDesks ?? "",
    cabinDeskRate: record.cabinDeskRate ?? "",
    monthlyRent: record.monthlyRent ?? "",
    perDeskMeetingCredits: record.perDeskMeetingCredits ?? "",
    totalMeetingCredits: record.totalMeetingCredits ?? "",
    totalTerm: record.totalTerm ?? "",
    annualIncrement: record.annualIncrement ?? "",
    rentDate: parseDateForInput(record.rentDate),
    rentStatus: record.rentStatus || "Active",
    advanceMonths: record.advanceMonths ?? "1",
    securityDeposit: record.securityDeposit ?? "",
    securityDepositPaid: Boolean(record.securityDepositPaid),
    notes: record.notes || "",
  };
}

export function computeCalculations(form) {
  const openDesks = Math.max(0, toNumber(form.openDesks));
  const openDeskRate = Math.max(0, toNumber(form.openDeskRate));
  const cabinDesks = Math.max(0, toNumber(form.cabinDesks));
  const cabinDeskRate = Math.max(0, toNumber(form.cabinDeskRate));

  const openTotal = Math.round(openDesks * openDeskRate * BILLING_MONTH_DAYS);
  const cabinTotal = Math.round(cabinDesks * cabinDeskRate * BILLING_MONTH_DAYS);
  const totalDesks = openDesks + cabinDesks;
  const computedMonthly = Math.round(openTotal + cabinTotal);

  const monthlyRent = Math.max(0, toNumber(form.monthlyRent)) || computedMonthly;
  const totalTerm = Math.max(0, toNumber(form.totalTerm));
  const annualIncrement = Math.max(0, toNumber(form.annualIncrement));
  const advanceMonths = Math.max(0, toNumber(form.advanceMonths) || 1);
  const totalContract = monthlyRent * totalTerm;
  const securityDeposit = Math.max(0, toNumber(form.securityDeposit)) || Math.round(totalContract * 0.25);
  const advanceAmount = Math.round(monthlyRent * advanceMonths);
  const initialAmount = securityDeposit + advanceAmount;
  const perDeskMeetingCredits = Math.max(0, toNumber(form.perDeskMeetingCredits));
  const totalMeetingCredits = Math.max(0, toNumber(form.totalMeetingCredits)) || Math.round(perDeskMeetingCredits * totalDesks);

  return {
    openTotal,
    cabinTotal,
    totalDesks,
    monthlyRent,
    totalContract,
    securityDeposit,
    advanceAmount,
    initialAmount,
    totalMeetingCredits,
  };
}

export function validateForm(form) {
  const errors = {};
  if (!form.clientName.trim() && !form.brandName.trim()) errors.clientName = "Client / brand name is required.";
  if (!form.localPoc.name.trim()) errors.localPocName = "Local POC name is required.";
  if (!form.hoPoc.name.trim()) errors.hoPocName = "HO POC name is required.";
  if (!Number.isFinite(toNumber(form.monthlyRent)) || toNumber(form.monthlyRent) <= 0) errors.monthlyRent = "Monthly rent is required.";
  if (!Number.isFinite(toNumber(form.totalTerm)) || toNumber(form.totalTerm) <= 0) errors.totalTerm = "Contract term is required.";
  if (!form.rentDate) errors.rentDate = "Rent start date is required.";
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
    cabinDesks: toNumber(form.cabinDesks),
    cabinDeskRate: toNumber(form.cabinDeskRate),
    totalTerm: toNumber(form.totalTerm),
    annualIncrement: toNumber(form.annualIncrement),
    advanceMonths: toNumber(form.advanceMonths),
    perDeskMeetingCredits: toNumber(form.perDeskMeetingCredits),
    rentDate: form.rentDate ? new Date(form.rentDate).toISOString() : null,
  };
}
