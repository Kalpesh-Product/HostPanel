import * as XLSX from "xlsx";
import {
  EMPTY_FORM,
  computeCalculations,
  validateForm,
  buildSavePayload,
  getWorkingDaysInMonth,
  toNumber,
} from "./virtualOfficeFormUtils";

// ---------------------------------------------------------------------------
// Shared spreadsheet plumbing (mirrors the pattern used on the Tenant
// Companies bulk upload: client generates the template, client parses the
// upload with `xlsx`, no dedicated backend bulk route — every row is posted
// through the normal single-record create/record-payment API call).
// ---------------------------------------------------------------------------

export function normalizeBulkHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function resolveBulkCellValue(row, aliases = []) {
  const entries = Object.entries(row || {});
  const normalizedEntries = entries.map(([key, value]) => [normalizeBulkHeader(key), value]);

  for (const alias of aliases) {
    const normalizedAlias = normalizeBulkHeader(alias);
    const match = normalizedEntries.find(([key]) => key === normalizedAlias);
    if (match && String(match[1] ?? "").trim()) {
      return match[1];
    }
  }
  return "";
}

export function isBulkRowEmpty(row = {}) {
  return !Object.values(row).some((value) => String(value ?? "").trim());
}

export async function readSpreadsheetRows(file) {
  const fileName = String(file?.name || "").toLowerCase();
  const isCsv = fileName.endsWith(".csv");
  const workbook = isCsv
    ? XLSX.read(await file.text(), { type: "string", cellDates: true })
    : XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

// Accepts a parsed Excel date cell (already a JS Date thanks to cellDates:true),
// a yyyy-mm-dd string, or a dd/mm/yyyy-ish string — whatever the user typed.
export function toBulkDateInputValue(value) {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function boolFromYesNo(value, fallback = false) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return fallback;
  return ["yes", "y", "true", "1"].includes(normalized);
}

// ---------------------------------------------------------------------------
// Virtual Office Companies — template + row parsing
// ---------------------------------------------------------------------------

export const VO_COMPANY_TEMPLATE_HEADERS = [
  "Client Name",
  "Brand Name",
  "Sector",
  "Email",
  "Phone",
  "Country",
  "State",
  "City",
  "Location",
  "Floor",
  "Wing",
  "HO POC Name",
  "HO POC Email",
  "HO POC Phone",
  "HO POC Address",
  "Local POC Name",
  "Local POC Email",
  "Local POC Phone",
  "Local POC Address",
  "Open Desks",
  "Open Desk Rate (Per Day)",
  "Open Desk Rate (Per Month)",
  "Per Desk Meeting Credits",
  "Total Meeting Credits",
  "Term (Months)",
  "Term Start Date",
  "Rent Due Date",
  "Lock-in Period (Months)",
  "Annual Increment (%)",
  "Advance Rent (Months)",
  "Security Deposit (%)",
  "Security Deposit Amount",
  "Security Deposit Paid (Yes/No)",
  "Rent Status",
  "Notes",
];

const VO_COMPANY_ALIASES = {
  clientName: ["client name", "company name", "company", "tenant"],
  brandName: ["brand name", "brand"],
  sector: ["sector", "industry", "business type"],
  email: ["email", "company email"],
  phone: ["phone", "company phone", "mobile"],
  country: ["country"],
  state: ["state"],
  city: ["city"],
  location: ["location", "space location"],
  floor: ["floor", "space floor"],
  wing: ["wing", "space wing"],
  hoPocName: ["ho poc name", "head office poc name", "ho contact"],
  hoPocEmail: ["ho poc email", "head office poc email"],
  hoPocPhone: ["ho poc phone", "head office poc phone"],
  hoPocAddress: ["ho poc address", "head office poc address", "ho address"],
  localPocName: ["local poc name", "local contact", "local point of contact"],
  localPocEmail: ["local poc email", "local email"],
  localPocPhone: ["local poc phone", "local phone"],
  localPocAddress: ["local poc address", "local address"],
  openDesks: ["open desks", "desks"],
  openDeskRateDay: ["open desk rate (per day)", "open desk rate per day", "desk rate per day"],
  openDeskRateMonth: ["open desk rate (per month)", "open desk rate per month", "desk rate per month", "monthly desk rate"],
  perDeskMeetingCredits: ["per desk meeting credits", "per-desk meeting credits"],
  totalMeetingCredits: ["total meeting credits"],
  totalTerm: ["term (months)", "term months", "total term", "contract term"],
  termStart: ["term start date", "term start", "contract start"],
  rentDate: ["rent due date", "rent date", "due date"],
  lockInMonths: ["lock-in period (months)", "lock in period (months)", "lock-in months"],
  annualIncrement: ["annual increment (%)", "annual increment"],
  advanceMonths: ["advance rent (months)", "advance months", "advance rent"],
  securityDepositPercent: ["security deposit (%)", "security deposit percent"],
  securityDeposit: ["security deposit amount", "security deposit"],
  securityDepositPaid: ["security deposit paid (yes/no)", "security deposit paid", "deposit received"],
  rentStatus: ["rent status"],
  notes: ["notes", "remarks", "comments"],
};

function cell(row, key) {
  return String(resolveBulkCellValue(row, VO_COMPANY_ALIASES[key]) ?? "").trim();
}

export function buildBulkVirtualOfficePayload(row) {
  const form = {
    ...EMPTY_FORM,
    clientName: cell(row, "clientName"),
    brandName: cell(row, "brandName"),
    sector: cell(row, "sector"),
    email: cell(row, "email"),
    phone: cell(row, "phone"),
    country: cell(row, "country"),
    state: cell(row, "state"),
    city: cell(row, "city"),
    spaceLocation: cell(row, "location"),
    spaceFloor: cell(row, "floor"),
    spaceWing: cell(row, "wing"),
    hoPoc: {
      name: cell(row, "hoPocName"),
      email: cell(row, "hoPocEmail"),
      phone: cell(row, "hoPocPhone"),
      address: cell(row, "hoPocAddress"),
    },
    localPoc: {
      name: cell(row, "localPocName"),
      email: cell(row, "localPocEmail"),
      phone: cell(row, "localPocPhone"),
      address: cell(row, "localPocAddress"),
    },
    openDesks: cell(row, "openDesks"),
    perDeskMeetingCredits: cell(row, "perDeskMeetingCredits"),
    totalMeetingCredits: cell(row, "totalMeetingCredits"),
    totalTerm: cell(row, "totalTerm"),
    termStart: toBulkDateInputValue(resolveBulkCellValue(row, VO_COMPANY_ALIASES.termStart)),
    rentDate: toBulkDateInputValue(resolveBulkCellValue(row, VO_COMPANY_ALIASES.rentDate)),
    lockInMonths: cell(row, "lockInMonths"),
    annualIncrement: cell(row, "annualIncrement"),
    advanceMonths: cell(row, "advanceMonths") || "1",
    securityDepositPercent: cell(row, "securityDepositPercent"),
    securityDeposit: cell(row, "securityDeposit"),
    securityDepositPaid: boolFromYesNo(cell(row, "securityDepositPaid")),
    rentStatus: cell(row, "rentStatus") || "Active",
    notes: cell(row, "notes"),
  };

  // Open desk monthly rate is the field the backend actually requires. Accept
  // either column; derive the month rate from the day rate (using the same
  // working-days conversion the manual form uses) when only the day rate was
  // filled in.
  const monthRateInput = cell(row, "openDeskRateMonth");
  const dayRateInput = cell(row, "openDeskRateDay");
  if (monthRateInput) {
    form.openDeskMonthlyRate = monthRateInput;
    form.openDeskRate = dayRateInput || String(Math.round(toNumber(monthRateInput) / (getWorkingDaysInMonth(form.termStart) || 1)));
  } else if (dayRateInput) {
    const workingDays = getWorkingDaysInMonth(form.termStart || undefined);
    form.openDeskRate = dayRateInput;
    form.openDeskMonthlyRate = String(Math.round(toNumber(dayRateInput) * workingDays));
  }

  // Security deposit: the server derives the stored amount from the percent
  // field only, so a row that supplies just a flat amount needs that amount
  // converted to a percent of the contract total before it's sent.
  if (!form.securityDepositPercent && form.securityDeposit) {
    const calcs = computeCalculations(form);
    form.securityDepositPercent = calcs.totalContract > 0
      ? String(Math.round((toNumber(form.securityDeposit) / calcs.totalContract) * 100))
      : "0";
  }

  const errors = validateForm(form);
  if (Object.keys(errors).length > 0) {
    return { payload: null, error: Object.values(errors)[0] };
  }

  return { payload: buildSavePayload(form) };
}

export function downloadVirtualOfficeCompanyTemplate() {
  const workbook = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.aoa_to_sheet([
    VO_COMPANY_TEMPLATE_HEADERS,
    Array(VO_COMPANY_TEMPLATE_HEADERS.length).fill(""),
  ]);

  const requiredFieldsSheet = XLSX.utils.json_to_sheet([
    { Field: "Client Name", Requirement: "Required", Notes: "Company / client display name." },
    { Field: "HO POC Name", Requirement: "Required", Notes: "Head office point of contact name." },
    { Field: "Local POC Name", Requirement: "Required", Notes: "Local point of contact name." },
    { Field: "Open Desks", Requirement: "Required", Notes: "Number of open desks allotted, whole number > 0." },
    { Field: "Open Desk Rate (Per Month)", Requirement: "Required", Notes: "Monthly rate per open desk. You may fill only the day rate instead and the month rate will be derived." },
    { Field: "Term (Months)", Requirement: "Required", Notes: "Contract length in months." },
    { Field: "Term Start Date", Requirement: "Required", Notes: "Format YYYY-MM-DD." },
    { Field: "Rent Due Date", Requirement: "Required", Notes: "Recurring monthly rent due date. Format YYYY-MM-DD." },
    { Field: "Brand Name", Requirement: "Optional", Notes: "Falls back to Client Name." },
    { Field: "Sector", Requirement: "Optional", Notes: "" },
    { Field: "Email / Phone", Requirement: "Optional", Notes: "General company contact details." },
    { Field: "Country / State / City", Requirement: "Optional", Notes: "" },
    { Field: "Location / Floor / Wing", Requirement: "Optional", Notes: "Descriptive space allocation; can be edited later against Resource Management." },
    { Field: "POC Email / Phone / Address", Requirement: "Optional", Notes: "For both HO and Local POC." },
    { Field: "Open Desk Rate (Per Day)", Requirement: "Optional", Notes: "Only needed if you did not supply the per-month rate." },
    { Field: "Per Desk Meeting Credits / Total Meeting Credits", Requirement: "Optional", Notes: "Total is derived from per-desk credits x open desks if left blank." },
    { Field: "Lock-in Period (Months)", Requirement: "Optional", Notes: "0 = no lock-in." },
    { Field: "Annual Increment (%)", Requirement: "Optional", Notes: "Only applies once term exceeds 12 months." },
    { Field: "Advance Rent (Months)", Requirement: "Optional", Notes: "Defaults to 1 month." },
    { Field: "Security Deposit (%) / Security Deposit Amount", Requirement: "Optional", Notes: "Fill either one — percent takes priority; amount is converted to a percent of the contract total." },
    { Field: "Security Deposit Paid (Yes/No)", Requirement: "Optional", Notes: "Defaults to No." },
    { Field: "Rent Status", Requirement: "Optional", Notes: "One of Active, Overdue, Pending, Cancelled. Defaults to Active." },
    { Field: "Notes", Requirement: "Optional", Notes: "Free-text remarks." },
  ], { header: ["Field", "Requirement", "Notes"] });

  const formatGuideSheet = XLSX.utils.json_to_sheet([
    { Field: "Client Name", Format: "Text", Example: "AKIRA BUSINESS SERVICES" },
    { Field: "Term Start Date", Format: "Date (YYYY-MM-DD)", Example: "2026-04-01" },
    { Field: "Rent Due Date", Format: "Date (YYYY-MM-DD)", Example: "2026-04-01" },
    { Field: "Open Desks", Format: "Number", Example: "1" },
    { Field: "Open Desk Rate (Per Month)", Format: "Number", Example: "24000" },
    { Field: "Term (Months)", Format: "Number", Example: "12" },
    { Field: "Security Deposit Paid (Yes/No)", Format: "Yes or No", Example: "Yes" },
    { Field: "Rent Status", Format: "Active | Overdue | Pending | Cancelled", Example: "Active" },
  ], { header: ["Field", "Format", "Example"] });

  XLSX.utils.book_append_sheet(workbook, dataSheet, "Virtual Office Companies");
  XLSX.utils.book_append_sheet(workbook, requiredFieldsSheet, "Required Fields");
  XLSX.utils.book_append_sheet(workbook, formatGuideSheet, "Format Guide");
  XLSX.writeFile(workbook, "virtual-office-companies-bulk-template.xlsx");
}

// ---------------------------------------------------------------------------
// Rent Collections & Payments — template + row parsing
// ---------------------------------------------------------------------------

export const VO_PAYMENT_TEMPLATE_HEADERS = [
  "Company (Client Name or Record Code)",
  "Month Label",
  "Amount",
  "Period Start",
  "Period End",
  "Payment Method",
  "Transaction ID",
  "Status",
  "Notes",
];

const VO_PAYMENT_ALIASES = {
  company: ["company (client name or record code)", "company", "client name", "record code"],
  monthLabel: ["month label", "month"],
  amount: ["amount"],
  periodStart: ["period start", "billing period start"],
  periodEnd: ["period end", "billing period end"],
  paymentMethod: ["payment method", "method"],
  transactionId: ["transaction id", "transaction", "reference"],
  status: ["status", "payment status"],
  notes: ["notes", "remarks", "comments"],
};

function paymentCell(row, key) {
  return String(resolveBulkCellValue(row, VO_PAYMENT_ALIASES[key]) ?? "").trim();
}

function findVirtualOfficeByLabel(records, label) {
  const normalized = normalizeBulkHeader(label);
  if (!normalized) return null;
  return (
    records.find((r) => normalizeBulkHeader(r.recordCode) === normalized) ||
    records.find((r) => normalizeBulkHeader(r.clientName) === normalized) ||
    records.find((r) => normalizeBulkHeader(r.brandName) === normalized) ||
    records.find((r) => normalizeBulkHeader(r.clientName).includes(normalized) || normalized.includes(normalizeBulkHeader(r.clientName))) ||
    null
  );
}

const PAYMENT_STATUS_VALUES = new Set(["Paid", "Partially Paid", "Pending", "Overdue"]);

export function buildBulkVirtualOfficePaymentRow(row, records = []) {
  const companyLabel = paymentCell(row, "company");
  if (!companyLabel) {
    return { companyId: null, payload: null, error: "Missing company (client name or record code)." };
  }

  const matched = findVirtualOfficeByLabel(records, companyLabel);
  if (!matched) {
    return { companyId: null, payload: null, error: `No virtual office company matches "${companyLabel}".` };
  }

  const amount = toNumber(paymentCell(row, "amount"));
  if (!amount || amount <= 0) {
    return { companyId: null, payload: null, error: `Missing/invalid amount for "${companyLabel}".` };
  }

  const statusRaw = paymentCell(row, "status");
  const status = PAYMENT_STATUS_VALUES.has(statusRaw) ? statusRaw : "Paid";

  return {
    companyId: matched._id || matched.recordId,
    companyLabel: matched.clientName || matched.brandName,
    payload: {
      monthLabel: paymentCell(row, "monthLabel"),
      periodStart: toBulkDateInputValue(resolveBulkCellValue(row, VO_PAYMENT_ALIASES.periodStart)) || null,
      periodEnd: toBulkDateInputValue(resolveBulkCellValue(row, VO_PAYMENT_ALIASES.periodEnd)) || null,
      amount,
      transactionId: paymentCell(row, "transactionId"),
      paymentMethod: paymentCell(row, "paymentMethod"),
      status,
      notes: paymentCell(row, "notes"),
    },
  };
}

export function downloadVirtualOfficeRentTemplate(records = []) {
  const workbook = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.aoa_to_sheet([
    VO_PAYMENT_TEMPLATE_HEADERS,
    Array(VO_PAYMENT_TEMPLATE_HEADERS.length).fill(""),
  ]);

  const requiredFieldsSheet = XLSX.utils.json_to_sheet([
    { Field: "Company (Client Name or Record Code)", Requirement: "Required", Notes: "Must match an existing virtual office company exactly, e.g. \"VO-1001\" or the client name." },
    { Field: "Amount", Requirement: "Required", Notes: "Payment amount, number > 0." },
    { Field: "Month Label", Requirement: "Optional", Notes: "e.g. \"April 2026\"." },
    { Field: "Period Start / Period End", Requirement: "Optional", Notes: "Billing period this payment covers. Format YYYY-MM-DD." },
    { Field: "Payment Method", Requirement: "Optional", Notes: "e.g. Bank Transfer, UPI, Cheque." },
    { Field: "Transaction ID", Requirement: "Optional", Notes: "" },
    { Field: "Status", Requirement: "Optional", Notes: "One of Paid, Partially Paid, Pending, Overdue. Defaults to Paid." },
    { Field: "Notes", Requirement: "Optional", Notes: "Free-text remarks." },
  ], { header: ["Field", "Requirement", "Notes"] });

  const companyReferenceSheet = XLSX.utils.json_to_sheet(
    records.map((r) => ({ "Record Code": r.recordCode, "Client Name": r.clientName || r.brandName })),
    { header: ["Record Code", "Client Name"] },
  );

  XLSX.utils.book_append_sheet(workbook, dataSheet, "Rent Collections");
  XLSX.utils.book_append_sheet(workbook, requiredFieldsSheet, "Required Fields");
  XLSX.utils.book_append_sheet(workbook, companyReferenceSheet, "Company Reference");
  XLSX.writeFile(workbook, "virtual-office-rent-collections-bulk-template.xlsx");
}
