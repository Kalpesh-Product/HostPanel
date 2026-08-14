// @ts-nocheck
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";

function findServerRoot() {
  // Works both in source (server/utils) and compiled (server/dist/utils) layouts
  // by walking up until the directory that ships server/assets/fonts is found.
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i += 1) {
    if (existsSync(path.join(dir, "assets", "fonts", "Poppins-Regular.ttf"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

const SERVER_ROOT = findServerRoot();

function fontFile(name) {
  const resolved = path.join(SERVER_ROOT, "assets", "fonts", name);

  return resolved;
}

const FONTS = {
  regular: fontFile("Poppins-Regular.ttf"),
  medium: fontFile("Poppins-Medium.ttf"),
  semibold: fontFile("Poppins-SemiBold.ttf"),
  bold: fontFile("Poppins-Bold.ttf"),
};

// The WONO wordmark (black, transparent bg) bundled with the server so the
// footer branding never depends on a network fetch. 140x40 source aspect ratio.
const WONO_LOGO_PATH = path.join(SERVER_ROOT, "assets", "branding", "wono-logo.png");
const WONO_LOGO_ASPECT = 140 / 40;
let WONO_LOGO_BUFFER = null;
try {
  WONO_LOGO_BUFFER = readFileSync(WONO_LOGO_PATH);
} catch {
  WONO_LOGO_BUFFER = null;
}

// WONO Host Panel theme tokens (mirrors client/tailwind.config.cjs + email shell).
const THEME = {
  primary: "#1E3D73",
  accent: "#2563EB",
  wonoGreen: "#80bf01",
  gradientStart: "#0BA9EF",
  gradientEnd: "#1E40AF",
  ink: "#0F172A",
  muted: "#64748B",
  border: "#D1D5DB",
  softBg: "#F1F5F9",
  softAccentBg: "#EEF4FB",
  white: "#FFFFFF",
};

const PAGE = { width: 595.28, height: 841.89, marginX: 40, contentWidth: 515.28 };

function safeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeCurrency(value, fallback = "INR") {
  const resolved = String(value ?? fallback).trim().toUpperCase() || fallback;
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: resolved }).format(0);
    return resolved;
  } catch {
    return fallback;
  }
}

function formatMoney(value, currency) {
  const amount = Number(value) || 0;
  const resolved = normalizeCurrency(currency);
  try {
    const locale = resolved === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: resolved,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${resolved} ${amount.toLocaleString("en-US")}`;
  }
}

function formatDateLabel(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatPayPeriod(input) {
  const month = safeText(input?.monthLabel);
  const year = input?.year ? String(input.year) : "";
  return [month, year].filter(Boolean).join(" ") || safeText(input?.cycleKey, "—");
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Total calendar days in the pay period's month (including weekends), used
// alongside "working days" so the payslip shows both figures.
function totalDaysInMonth(payPeriod) {
  const monthIndex = MONTH_NAMES.indexOf(safeText(payPeriod?.monthLabel));
  const year = Number(payPeriod?.year);
  if (monthIndex < 0 || !Number.isFinite(year)) return null;
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

// Some existing workspaces have their free-text "address" already containing
// the city/state (e.g. entered as "Panaji, Goa" before the Address field
// existed in Company Profile) — drop any city/state/country that's already
// present in the address text so it doesn't render twice. The street address
// gets its own line, with city/state/country combined onto a second line
// (rather than one line per part, which pushed 4-part addresses past the
// space templates have for the header).
function buildAddress(workspace = {}) {
  const address = safeText(workspace.address);
  const addressLower = address.toLowerCase();
  const locationLine = [workspace.city, workspace.state, workspace.country]
    .map((value) => safeText(value))
    .filter(Boolean)
    .filter((value) => !addressLower.includes(value.toLowerCase()))
    .join(", ");
  return [address, locationLine].filter(Boolean).join("\n");
}

async function fetchLogoBuffer(url) {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 32 || bytes.length > 8 * 1024 * 1024) return null;
    return bytes;
  } catch {
    return null;
  }
}

async function normalizeLogoBuffer(buffer) {
  if (!buffer) return null;
  try {
    // sharp rasterizes PNG/JPEG/WebP/SVG into a clean transparent PNG that
    // pdfkit can always embed, resized to a reasonable header footprint.
    return await sharp(buffer)
      .resize(340, 340, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

async function resolveLogo(logoUrl) {
  const raw = await fetchLogoBuffer(logoUrl);
  if (!raw) return null;
  return normalizeLogoBuffer(raw);
}

export async function buildPayslipPdfBuffer(payload) {
  const workspace = payload?.workspace || {};
  const employee = payload?.employee || {};
  const payPeriod = payload?.payPeriod || {};
  const summary = payload?.summary || {};
  const attendance = payload?.attendance || {};
  const leaveSummary = Array.isArray(payload?.leaveSummary) ? payload.leaveSummary : [];
  const currency = normalizeCurrency(payload?.currency);
  const primaryColor = /^#[0-9a-fA-F]{6}$/.test(String(workspace?.branding?.primaryColor || ""))
    ? String(workspace.branding.primaryColor)
    : THEME.primary;

  const logoBuffer = await resolveLogo(workspace?.branding?.logoUrl);
  const companyName = safeText(workspace?.businessName || workspace?.brandName, "Company");
  const companyAddress = buildAddress(workspace);
  const monthLabel = formatPayPeriod(payPeriod);
  const totalDays = totalDaysInMonth(payPeriod);

  const baseSalary = Number(summary.baseSalary) || 0;
  const benefits = Number(summary.benefits) || 0;
  const hrBonus = Number(summary.hrBonus) || 0;
  const standardDeductions = Number(summary.standardDeductions) || 0;
  const attendanceDeductions = Number(summary.attendanceDeductions) || 0;
  const hrDeductions = Number(summary.hrDeductions) || 0;
  const totalEarnings = baseSalary + benefits + hrBonus;
  const totalDeductions = standardDeductions + attendanceDeductions + hrDeductions;
  const netPayable = Number(summary.netPayable) || Math.max(0, totalEarnings - totalDeductions);

  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    bufferPages: true,
    info: {
      Title: `Pay Slip - ${employee?.name || ""} - ${monthLabel}`.trim(),
      Author: companyName,
      Subject: "Employee Pay Slip",
      Producer: "WONO Host Panel",
    },
  });

  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("Poppins", FONTS.regular);
    doc.registerFont("Poppins-Regular", FONTS.regular);
    doc.registerFont("Poppins-Medium", FONTS.medium);
    doc.registerFont("Poppins-SemiBold", FONTS.semibold);
    doc.registerFont("Poppins-Bold", FONTS.bold);

    const templateId = ["classic-mono", "modern-blue", "aqua-wave", "indigo-banner"].includes(String(payload?.templateId))
      ? String(payload.templateId)
      : "modern-blue";

    if (templateId !== "modern-blue") {
      drawReferencePayslip(doc, {
        templateId,
        workspace,
        companyName,
        companyAddress,
        logoBuffer,
        primaryColor,
        employee,
        payPeriod,
        monthLabel,
        currency,
        attendance,
        totalDays,
        leaveSummary,
        earningsRows: [
          { label: "Basic Pay", amount: baseSalary },
          { label: "Allowances & Benefits", amount: benefits },
          ...(hrBonus > 0 ? [{ label: "Bonus / Special Allowance", amount: hrBonus }] : []),
        ],
        deductionRows: [
          ...(standardDeductions > 0 ? [{ label: "Standard Deductions", amount: standardDeductions }] : []),
          ...(attendanceDeductions > 0 ? [{ label: "Attendance Deductions", amount: attendanceDeductions }] : []),
          ...(hrDeductions > 0 ? [{ label: "Other Deductions", amount: hrDeductions }] : []),
        ],
        totalEarnings,
        totalDeductions,
        netPayable,
      });
      doc.end();
      return;
    }

    const { marginX, contentWidth } = PAGE;
    const rightX = marginX + contentWidth;
    let y = 0;

    // ── Header band ──────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE.width, 7).fill(THEME.gradientStart);

    const headerHeight = 104;
    doc.rect(0, 7, PAGE.width, headerHeight).fill(primaryColor);

    // Logo (company) or empty-logo-slot placeholder.
    const logoSize = 64;
    const logoX = marginX;
    const logoY = 7 + (headerHeight - logoSize) / 2;
    let logoDrawn = false;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, logoX, logoY, { fit: [logoSize, logoSize], align: "center", valign: "center" });
        logoDrawn = true;
      } catch {
        logoDrawn = false;
      }
    }
    if (!logoDrawn) {
      drawLogoPlaceholder(doc, {
        x: logoX, y: logoY, size: logoSize,
        borderColor: "#FFFFFF", iconColor: "#FFFFFF",
        fillColor: "#FFFFFF", fillOpacity: 0.14,
      });
    }

    // Company identity.
    const companyTextX = logoX + logoSize + 16;
    const companyTextWidth = rightX - companyTextX - 150;
    doc.font("Poppins-Bold").fontSize(19).fillColor(THEME.white).text(companyName, companyTextX, 26, {
      width: companyTextWidth,
      lineBreak: true,
    });
    doc.font("Poppins-Regular").fontSize(8.5).fillColor("#D7E6F9").text(companyAddress || "WONO Host Panel Partner", companyTextX, 50, {
      width: companyTextWidth,
      height: 56,
      lineGap: 1,
      lineBreak: true,
    });

    // Right-aligned title block.
    doc.font("Poppins-Bold").fontSize(26).fillColor(THEME.white).text("PAY SLIP", rightX - 150, 26, {
      width: 150,
      align: "right",
    });
    doc.font("Poppins-Medium").fontSize(11).fillColor("#CFE3FB").text(monthLabel, rightX - 150, 60, {
      width: 150,
      align: "right",
    });

    doc.rect(0, 7 + headerHeight, PAGE.width, 4).fill(THEME.wonoGreen);
    y = 7 + headerHeight + 4 + 22;

    // ── Employee details ──────────────────────────────────────────────────
    const fieldPairs = [
      [
        { label: "EMPLOYEE NAME", value: safeText(employee?.name, "—") },
        { label: "EMPLOYEE ID", value: safeText(employee?.employeeId, "—") },
        { label: "DESIGNATION", value: safeText(employee?.designation, "—") },
        { label: "DEPARTMENT", value: safeText(employee?.department, "—") },
      ],
      [
        { label: "PAY PERIOD", value: monthLabel },
        { label: "DATE OF ISSUE", value: formatDateLabel(payPeriod?.generatedAt) || "—" },
        { label: "JOINING DATE", value: formatDateLabel(employee?.joiningDate) || "—" },
        { label: "PAY STATUS", value: "Paid" },
      ],
    ];
    const colWidth = (contentWidth - 20) / 4;
    const rowHeight = 44;
    fieldPairs.forEach((row) => {
      doc.save();
      doc.roundedRect(marginX, y, contentWidth, rowHeight, 8).fill(THEME.softBg);
      doc.restore();
      row.forEach((field, index) => {
        const fieldX = marginX + 10 + index * colWidth;
        doc.font("Poppins-SemiBold").fontSize(6.5).fillColor(THEME.muted).text(field.label, fieldX, y + 8, {
          width: colWidth - 12,
          height: 10,
        });
        doc.font("Poppins-SemiBold").fontSize(9.5).fillColor(THEME.ink).text(field.value, fieldX, y + 21, {
          width: colWidth - 12,
          height: 16,
        });
      });
      y += rowHeight + 10;
    });

    // ── Earnings ──────────────────────────────────────────────────────────
    const earningsRows = [
      { label: "Basic Pay", amount: baseSalary },
      { label: "Allowances & Benefits", amount: benefits },
    ];
    if (hrBonus > 0) {
      earningsRows.push({ label: "Bonus / Special Allowance", amount: hrBonus });
    }

    y = drawMoneyTable(doc, {
      y,
      title: "EARNINGS",
      rows: earningsRows,
      totalLabel: "Total Earnings",
      total: totalEarnings,
      currency,
    });

    // ── Deductions ────────────────────────────────────────────────────────
    const deductionRows = [];
    if (standardDeductions > 0) deductionRows.push({ label: "Standard Deductions", amount: standardDeductions });
    if (attendanceDeductions > 0) deductionRows.push({ label: "Attendance Deductions", amount: attendanceDeductions });
    if (hrDeductions > 0) deductionRows.push({ label: "Other Deductions", amount: hrDeductions });
    if (deductionRows.length === 0) {
      deductionRows.push({ label: "Tax & Other Deductions", amount: 0 });
    }

    y = drawMoneyTable(doc, {
      y,
      title: "DEDUCTIONS",
      rows: deductionRows,
      totalLabel: "Total Deductions",
      total: totalDeductions,
      currency,
    });

    // ── Net pay ───────────────────────────────────────────────────────────
    doc.save();
    doc.roundedRect(marginX, y, contentWidth, 46, 8).fill(primaryColor);
    doc.restore();
    doc.font("Poppins-Bold").fontSize(12).fillColor(THEME.white).text("NET PAY", marginX + 20, y + 16);
    doc.font("Poppins-Bold").fontSize(17).fillColor(THEME.white).text(formatMoney(netPayable, currency), rightX - 220, y + 10, {
      width: 200,
      align: "right",
    });
    y += 46 + 18;

    // ── Attendance summary strip ──────────────────────────────────────────
    if (attendance && typeof attendance.workingDays === "number") {
      const attendanceItems = [
        ...(totalDays ? [{ label: "Total Days", value: totalDays }] : []),
        { label: "Working Days", value: attendance.workingDays },
        { label: "Present", value: attendance.present },
        { label: "Paid Leaves", value: attendance.paidLeaves },
        { label: "Holidays", value: attendance.holidayDays },
        { label: "Half Days", value: attendance.halfDays },
        { label: "Unpaid Days", value: attendance.unpaidLeaves },
      ];
      const itemWidth = contentWidth / attendanceItems.length;
      doc.save();
      doc.roundedRect(marginX, y, contentWidth, 40, 8).fill(THEME.softAccentBg);
      doc.restore();
      attendanceItems.forEach((item, index) => {
        const itemX = marginX + index * itemWidth;
        doc.font("Poppins-SemiBold").fontSize(12).fillColor(THEME.accent).text(String(item.value ?? 0), itemX, y + 7, {
          width: itemWidth,
          align: "center",
        });
        doc.font("Poppins-Medium").fontSize(6.5).fillColor(THEME.muted).text(item.label.toUpperCase(), itemX, y + 24, {
          width: itemWidth,
          align: "center",
        });
      });
      y += 40 + 18;
    }

    // ── Leave summary ───────────────────────────────────────────────────
    y = drawLeaveTable(doc, {
      x: marginX,
      y,
      width: contentWidth,
      rows: leaveSummary,
      maxY: PAGE.height - 52 - 14,
      ink: THEME.ink,
      muted: THEME.muted,
      titleColor: THEME.primary,
      headerBg: THEME.accent,
      headerText: THEME.white,
      stripeBg: THEME.softBg,
    });

    // ── Footer / WONO branding ────────────────────────────────────────────
    const footerY = PAGE.height - 52;
    doc.save();
    doc.rect(0, footerY - 14, PAGE.width, 1).fillColor(THEME.border).fill();
    doc.restore();

    // WONO logo.
    drawWonoLogo(doc, { x: marginX, y: footerY + 1, height: 15 });

    doc.font("Poppins-Medium").fontSize(6.5).fillColor(THEME.muted).text(
      "This is a computer-generated payslip and does not require a signature.",
      rightX - 300, footerY + 2,
      { width: 300, align: "right" }
    );
    doc.font("Poppins-Regular").fontSize(6.5).fillColor(THEME.muted).text(
      "response@wono.co  |  wono.co",
      rightX - 300, footerY + 12,
      { width: 300, align: "right" }
    );

    doc.end();
  });
}

function drawMoneyTable(doc, { y, title, rows, totalLabel, total, currency }) {
  const { marginX, contentWidth } = PAGE;
  const rightX = marginX + contentWidth;

  // Section title.
  doc.font("Poppins-Bold").fontSize(12).fillColor(THEME.primary).text(title, marginX, y);
  y += 12 + 8;

  const labelWidth = contentWidth - 150;
  const amountWidth = 150 - 20;

  // Header row.
  doc.save();
  doc.rect(marginX, y, contentWidth, 22).fill(THEME.accent);
  doc.restore();
  doc.font("Poppins-SemiBold").fontSize(8).fillColor(THEME.white).text("COMPONENT", marginX + 14, y + 7);
  doc.font("Poppins-SemiBold").fontSize(8).fillColor(THEME.white).text("AMOUNT", rightX - 14 - amountWidth, y + 7, {
    width: amountWidth,
    align: "right",
  });
  y += 22;

  // Data rows.
  rows.forEach((row, index) => {
    if (index % 2 === 1) {
      doc.save();
      doc.rect(marginX, y, contentWidth, 22).fill(THEME.softBg);
      doc.restore();
    }
    doc.font("Poppins-Regular").fontSize(9).fillColor(THEME.ink).text(row.label, marginX + 14, y + 6, {
      width: labelWidth - 14,
    });
    doc.font("Poppins-Medium").fontSize(9).fillColor(THEME.ink).text(formatMoney(row.amount, currency), rightX - 14 - amountWidth, y + 6, {
      width: amountWidth,
      align: "right",
    });
    y += 22;
  });

  // Total row.
  doc.save();
  doc.rect(marginX, y, contentWidth, 24).fill(THEME.primary);
  doc.restore();
  doc.font("Poppins-Bold").fontSize(9).fillColor(THEME.white).text(totalLabel, marginX + 14, y + 7);
  doc.font("Poppins-Bold").fontSize(9).fillColor(THEME.white).text(formatMoney(total, currency), rightX - 14 - amountWidth, y + 7, {
    width: amountWidth,
    align: "right",
  });
  y += 24 + 20;

  return y;
}

function formatDays(value) {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

// Renders a compact LEAVE SUMMARY table (Total / Availed this month / Balance).
// `maxY` caps how many rows are drawn so the table never overlaps a fixed-position
// footer band on the reference templates.
function drawLeaveTable(doc, { x, y, width, rows, maxY, ink, muted, titleColor, headerBg, headerText, stripeBg }) {
  if (!rows || rows.length === 0) return y;

  const titleH = 16;
  const headerH = 18;
  const rowH = 15;
  const bottomMargin = 8;
  const ceiling = typeof maxY === "number" ? maxY : y + titleH + headerH + rowH * rows.length + bottomMargin;
  const fittableRows = Math.floor((ceiling - y - titleH - headerH - bottomMargin) / rowH);
  const visibleRows = rows.slice(0, Math.max(0, Math.min(rows.length, fittableRows, 6)));
  if (visibleRows.length === 0) return y;

  const columns = [
    { label: "LEAVE TYPE", width: width * 0.4, align: "left" },
    { label: "TOTAL", width: width * 0.18, align: "right" },
    { label: "AVAILED (MONTH)", width: width * 0.22, align: "right" },
    { label: "BALANCE", width: width * 0.2, align: "right" },
  ];

  doc.font("Poppins-Bold").fontSize(11).fillColor(titleColor).text("LEAVE SUMMARY", x, y);
  y += titleH;

  doc.save();
  doc.rect(x, y, width, headerH).fill(headerBg);
  doc.restore();
  let colX = x;
  columns.forEach((col) => {
    doc.font("Poppins-SemiBold").fontSize(6.5).fillColor(headerText).text(col.label, colX + (col.align === "left" ? 12 : 0), y + 5.5, {
      width: col.width - 12,
      align: col.align,
    });
    colX += col.width;
  });
  y += headerH;

  visibleRows.forEach((row, index) => {
    if (index % 2 === 1) {
      doc.save();
      doc.rect(x, y, width, rowH).fill(stripeBg);
      doc.restore();
    }
    const values = [safeText(row.name, "Leave"), formatDays(row.total), formatDays(row.availedThisMonth), formatDays(row.remaining)];
    colX = x;
    columns.forEach((col, colIndex) => {
      doc.font(colIndex === 0 ? "Poppins-Medium" : "Poppins-Regular").fontSize(7.5).fillColor(ink).text(
        values[colIndex],
        colX + (col.align === "left" ? 12 : 0),
        y + 3.5,
        { width: col.width - 12, align: col.align },
      );
      colX += col.width;
    });
    y += rowH;
  });

  return y + bottomMargin;
}

function drawReferencePayslip(doc, context) {
  const {
    templateId, companyName, companyAddress, logoBuffer, employee,
    payPeriod, monthLabel, currency, attendance, totalDays, earningsRows, deductionRows,
    totalEarnings, totalDeductions, netPayable,
  } = context;
  const isMono = templateId === "classic-mono";
  const isWave = templateId === "aqua-wave";
  const palette = isMono
    ? { accent: "#111827", soft: "#F3F4F6", pale: "#FFFFFF", ink: "#111827", muted: "#4B5563" }
    : isWave
      ? { accent: "#16A9C7", soft: "#DFF7FB", pale: "#F2FCFE", ink: "#103A46", muted: "#52737B" }
      : { accent: "#5878F7", soft: "#E9EDFF", pale: "#F7F8FF", ink: "#151B35", muted: "#667085" };

  doc.rect(0, 0, PAGE.width, PAGE.height).fill("#FFFFFF");

  if (isMono) {
    drawCompanyMark(doc, logoBuffer, companyName, companyAddress, 42, 36, 52, palette);
    doc.font("Poppins-Bold").fontSize(21).fillColor(palette.ink).text("PAYSLIP", 360, 40, { width: 193, align: "right" });
    doc.font("Poppins-Medium").fontSize(9).fillColor(palette.muted).text(monthLabel, 360, 69, { width: 193, align: "right" });
    doc.moveTo(42, 105).lineTo(553, 105).lineWidth(1.5).strokeColor(palette.accent).stroke();
  } else if (isWave) {
    doc.save();
    doc.path("M 0 0 L 64 0 L 0 64 Z").fill(palette.accent);
    doc.restore();
    drawCompanyMark(doc, logoBuffer, companyName, companyAddress, 56, 34, 58, palette);
    doc.font("Poppins-Bold").fontSize(17).fillColor(palette.ink).text(`${monthLabel.toUpperCase()} PAY SLIP`, 42, 126, { width: 511, align: "center" });
    doc.moveTo(138, 154).lineTo(457, 154).lineWidth(1.5).strokeColor(palette.accent).stroke();
  } else {
    doc.roundedRect(20, 18, 555, 98, 8).fill(palette.accent);
    drawCompanyMark(doc, logoBuffer, companyName, companyAddress, 44, 37, 58, { ...palette, ink: "#FFFFFF", muted: "#E5EAFE" });
    doc.font("Poppins-Bold").fontSize(23).fillColor("#FFFFFF").text("PAYSLIP", 390, 42, { width: 150, align: "right" });
    doc.font("Poppins-Medium").fontSize(9).fillColor("#E5EAFE").text(monthLabel, 390, 74, { width: 150, align: "right" });
  }

  let y = isWave ? 174 : isMono ? 126 : 142;
  y = drawEmployeeGrid(doc, {
    x: 42, y, width: 511, employee, monthLabel, payPeriod,
    fill: isMono ? "#FFFFFF" : palette.pale,
    border: isMono ? "#D1D5DB" : palette.soft,
    ink: palette.ink,
    muted: palette.muted,
  });

  if (templateId === "indigo-banner") {
    doc.save().opacity(0.08);
    doc.circle(298, 430, 52).fill(palette.accent);
    doc.roundedRect(270, 390, 58, 160, 28).fill(palette.accent);
    doc.restore();
    y = drawWideTable(doc, { x: 78, y: y + 22, width: 439, title: "EARNINGS", rows: earningsRows, totalLabel: "TOTAL EARNINGS", total: totalEarnings, currency, palette, mono: false });
    y = drawWideTable(doc, { x: 78, y: y + 22, width: 439, title: "DEDUCTIONS", rows: deductionRows.length ? deductionRows : [{ label: "Tax & Other Deductions", amount: 0 }], totalLabel: "TOTAL DEDUCTIONS", total: totalDeductions, currency, palette, mono: false });
  } else {
    const gap = 18;
    const tableWidth = (511 - gap) / 2;
    const resolvedDeductionRows = deductionRows.length ? deductionRows : [{ label: "Tax & Other Deductions", amount: 0 }];
    const rowCount = Math.max(earningsRows.length, resolvedDeductionRows.length);
    const leftEnd = drawWideTable(doc, { x: 42, y: y + 22, width: tableWidth, title: "EARNINGS", rows: earningsRows, totalLabel: "TOTAL EARNINGS", total: totalEarnings, currency, palette, mono: isMono, minRows: rowCount });
    const rightEnd = drawWideTable(doc, { x: 42 + tableWidth + gap, y: y + 22, width: tableWidth, title: "DEDUCTIONS", rows: resolvedDeductionRows, totalLabel: "TOTAL DEDUCTIONS", total: totalDeductions, currency, palette, mono: isMono, minRows: rowCount });
    y = Math.max(leftEnd, rightEnd);
  }

  const netY = Math.min(y + 24, 650);
  doc.save();
  if (isMono) {
    doc.rect(42, netY, 511, 46).lineWidth(1.5).strokeColor(palette.accent).stroke();
  } else {
    doc.roundedRect(42, netY, 511, 46, 8).fill(palette.accent);
  }
  doc.restore();
  doc.font("Poppins-Bold").fontSize(11).fillColor(isMono ? palette.ink : "#FFFFFF").text("NET SALARY", 58, netY + 16);
  doc.font("Poppins-Bold").fontSize(16).fillColor(isMono ? palette.ink : "#FFFFFF").text(formatMoney(netPayable, currency), 330, netY + 11, { width: 205, align: "right" });

  let contentEndY = netY + 46;
  if (attendance && typeof attendance.workingDays === "number" && netY < 610) {
    const labels = [
      ...(totalDays ? [["TOTAL DAYS", totalDays]] : []),
      ["WORKING DAYS", attendance.workingDays],
      ["PRESENT", attendance.present],
      ["PAID LEAVES", attendance.paidLeaves],
      ["HALF DAYS", attendance.halfDays],
      ["UNPAID DAYS", attendance.unpaidLeaves],
    ];
    const stripY = netY + 60;
    doc.roundedRect(42, stripY, 511, 38, 7).fill(palette.pale);
    labels.forEach(([label, value], index) => {
      const itemWidth = 511 / labels.length;
      const itemX = 42 + index * itemWidth;
      doc.font("Poppins-Bold").fontSize(10).fillColor(palette.accent).text(String(value ?? 0), itemX, stripY + 5, { width: itemWidth, align: "center" });
      doc.font("Poppins-Medium").fontSize(5.8).fillColor(palette.muted).text(String(label), itemX, stripY + 21, { width: itemWidth, align: "center" });
    });
    contentEndY = stripY + 38;
  }

  const footerCeiling = isWave ? 782 : templateId === "indigo-banner" ? 790 : 778;
  drawLeaveTable(doc, {
    x: 42,
    y: contentEndY + 16,
    width: 511,
    rows: context.leaveSummary,
    maxY: footerCeiling,
    ink: palette.ink,
    muted: palette.muted,
    titleColor: palette.ink,
    headerBg: isMono ? "#F3F4F6" : palette.soft,
    headerText: palette.ink,
    stripeBg: isMono ? "#FFFFFF" : palette.pale,
  });

  if (isWave) {
    doc.save();
    doc.path("M 0 790 C 150 735, 280 845, 595 754 L 595 842 L 0 842 Z").fill(palette.accent);
    doc.restore();
  } else if (templateId === "indigo-banner") {
    doc.rect(20, 795, 555, 29).fill(palette.accent);
  } else {
    doc.moveTo(42, 785).lineTo(553, 785).lineWidth(1).strokeColor("#D1D5DB").stroke();
  }

  const onColorBand = isWave || templateId === "indigo-banner";
  const footerColor = onColorBand ? "#FFFFFF" : palette.muted;
  const footerY = isWave ? 800 : templateId === "indigo-banner" ? 799 : 796;
  const logoHeight = 12;
  const chipPadding = onColorBand ? 4 : 0;
  drawWonoLogo(doc, { x: 42, y: footerY, height: logoHeight, chipPadding });
  doc.font("Poppins-Medium").fontSize(7).fillColor(footerColor).text(
    "response@wono.co  |  wono.co",
    42, footerY + chipPadding + 3,
    { width: 511, align: "right" }
  );
}

// Generic "no logo uploaded yet" placeholder: a dashed outline box with a
// simple image glyph inside, so it reads as an empty logo slot rather than
// a monogram/initial that could be mistaken for a real mark.
function drawLogoPlaceholder(doc, { x, y, size, borderColor, iconColor, fillColor, fillOpacity = 1 }) {
  if (fillColor) {
    doc.save();
    if (fillOpacity < 1) doc.fillOpacity(fillOpacity);
    doc.roundedRect(x, y, size, size, size * 0.18).fill(fillColor);
    doc.restore();
  }

  doc.save();
  doc.roundedRect(x, y, size, size, size * 0.18).lineWidth(1.2).dash(3, { space: 2.5 }).strokeColor(borderColor).stroke();
  doc.undash();
  doc.restore();

  const pad = size * 0.27;
  const iconX = x + pad;
  const iconY = y + pad;
  const iconSize = size - pad * 2;
  doc.save();
  doc.circle(iconX + iconSize * 0.24, iconY + iconSize * 0.24, iconSize * 0.11).fill(iconColor);
  doc.moveTo(iconX, iconY + iconSize)
    .lineTo(iconX + iconSize * 0.34, iconY + iconSize * 0.5)
    .lineTo(iconX + iconSize * 0.56, iconY + iconSize * 0.7)
    .lineTo(iconX + iconSize * 0.74, iconY + iconSize * 0.42)
    .lineTo(iconX + iconSize, iconY + iconSize)
    .closePath()
    .fill(iconColor);
  doc.restore();
}

// Draws the bundled WONO wordmark image. Pass chipPadding > 0 to sit it on a
// white rounded chip so it stays legible on colored footer bands.
function drawWonoLogo(doc, { x, y, height = 14, chipPadding = 0, chipColor = "#FFFFFF", chipRadius = 6 }) {
  if (!WONO_LOGO_BUFFER) return 0;
  const width = height * WONO_LOGO_ASPECT;
  if (chipPadding > 0) {
    doc.save();
    doc.roundedRect(x, y, width + chipPadding * 2, height + chipPadding * 2, chipRadius).fill(chipColor);
    doc.restore();
    doc.image(WONO_LOGO_BUFFER, x + chipPadding, y + chipPadding, { height });
    return width + chipPadding * 2;
  }
  doc.image(WONO_LOGO_BUFFER, x, y, { height });
  return width;
}

function drawCompanyMark(doc, logoBuffer, name, address, x, y, size, palette) {
  let drawn = false;
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, x, y, { fit: [size, size], align: "center", valign: "center" });
      drawn = true;
    } catch {
      drawn = false;
    }
  }
  if (!drawn) {
    drawLogoPlaceholder(doc, { x, y, size, borderColor: palette.muted, iconColor: palette.muted });
  }
  doc.font("Poppins-Bold").fontSize(16).fillColor(palette.ink).text(name, x + size + 13, y + 7, { width: 275 });
  doc.font("Poppins-Regular").fontSize(7.5).fillColor(palette.muted).text(address || "Company address", x + size + 13, y + 31, { width: 275, height: 34, lineGap: 1 });
}

function drawEmployeeGrid(doc, { x, y, width, employee, monthLabel, payPeriod, fill, border, ink, muted }) {
  const fields = [
    ["EMPLOYEE NAME", safeText(employee?.name, "-")],
    ["EMPLOYEE ID", safeText(employee?.employeeId, "-")],
    ["DESIGNATION", safeText(employee?.designation, "-")],
    ["DEPARTMENT", safeText(employee?.department, "-")],
    ["PAY PERIOD", monthLabel],
    ["JOINING DATE", formatDateLabel(employee?.joiningDate) || "-"],
  ];
  const cols = 3;
  const rowHeight = 48;
  const colWidth = width / cols;
  const totalHeight = rowHeight * 2;
  doc.rect(x, y, width, totalHeight).fillAndStroke(fill, border);
  fields.forEach(([label, value], index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cellX = x + col * colWidth;
    const cellY = y + row * rowHeight;
    if (col > 0) doc.moveTo(cellX, cellY).lineTo(cellX, cellY + rowHeight).lineWidth(0.6).strokeColor(border).stroke();
    if (row > 0) doc.moveTo(cellX, cellY).lineTo(cellX + colWidth, cellY).lineWidth(0.6).strokeColor(border).stroke();
    doc.font("Poppins-SemiBold").fontSize(6).fillColor(muted).text(label, cellX + 12, cellY + 9, { width: colWidth - 24 });
    doc.font("Poppins-SemiBold").fontSize(9).fillColor(ink).text(value, cellX + 12, cellY + 23, { width: colWidth - 24, height: 17 });
  });
  return y + totalHeight;
}

function drawWideTable(doc, { x, y, width, title, rows, totalLabel, total, currency, palette, mono, minRows = 0 }) {
  doc.font("Poppins-Bold").fontSize(11).fillColor(palette.ink).text(title, x, y);
  y += 20;
  const headerFill = mono ? "#F3F4F6" : palette.soft;
  doc.rect(x, y, width, 23).fillAndStroke(headerFill, mono ? "#111827" : palette.soft);
  doc.font("Poppins-SemiBold").fontSize(7).fillColor(palette.ink).text("COMPONENT", x + 11, y + 8);
  doc.font("Poppins-SemiBold").fontSize(7).fillColor(palette.ink).text("AMOUNT", x + width - 103, y + 8, { width: 92, align: "right" });
  y += 23;
  rows.forEach((row, index) => {
    doc.rect(x, y, width, 25).fillAndStroke(index % 2 ? palette.pale : "#FFFFFF", mono ? "#D1D5DB" : palette.soft);
    doc.font("Poppins-Regular").fontSize(7.5).fillColor(palette.ink).text(row.label, x + 11, y + 8, { width: width - 125 });
    doc.font("Poppins-Medium").fontSize(7.5).fillColor(palette.ink).text(formatMoney(row.amount, currency), x + width - 112, y + 8, { width: 101, align: "right" });
    y += 25;
  });
  // Pad with blank spacer rows so this table's total bar lands on the same
  // line as its counterpart even when one side has fewer components.
  for (let index = rows.length; index < minRows; index += 1) {
    doc.rect(x, y, width, 25).fillAndStroke(index % 2 ? palette.pale : "#FFFFFF", mono ? "#D1D5DB" : palette.soft);
    y += 25;
  }
  doc.rect(x, y, width, 27).fill(mono ? "#111827" : palette.accent);
  doc.font("Poppins-Bold").fontSize(7.5).fillColor("#FFFFFF").text(totalLabel, x + 11, y + 9);
  doc.font("Poppins-Bold").fontSize(7.5).fillColor("#FFFFFF").text(formatMoney(total, currency), x + width - 112, y + 9, { width: 101, align: "right" });
  return y + 27;
}