// @ts-nocheck
// Builds the PDF a host company sends to WONO when they click "Request
// Payout" — the host is the ISSUER here (their name/logo at the top,
// "Bill To: WONO"), not the other way around. This documents the host's
// consolidated payout claim across every finalized, paid booking not yet
// invoiced (not one PDF per booking — a busy host can have 15+ bookings a
// day; 15 separate wire transfers would eat the margin in fees alone).
// Each booking still gets its own full detail + payment-summary section —
// just inside one document — followed by one grand total at the end. Not
// a Stripe object, never touches Stripe.
import PDFDocument from "pdfkit";
import axios from "axios";

const NAVY = "#0f172a";
const SLATE = "#475569";
const LIGHT = "#94a3b8";
const BORDER = "#e2e8f0";
const PAGE_BOTTOM = 792 - 50; // A4 height in points minus the bottom margin

const fmtMoney = (value, currency) => {
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(currency || "USD").toUpperCase(),
    }).format(amount);
  } catch {
    return `${String(currency || "USD").toUpperCase()} ${amount.toFixed(2)}`;
  }
};

const fmtDate = (value) => {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

const BOOKING_TYPE_LABELS = { MeetingRoom: "Meeting Room", CoLiving: "Co-Living", Hostel: "Hostel" };

// Best-effort logo fetch — invoice still renders fine without it.
const fetchLogoBuffer = async (logoUrl) => {
  if (!logoUrl) return null;
  try {
    const response = await axios.get(logoUrl, { responseType: "arraybuffer", timeout: 8000 });
    return Buffer.from(response.data);
  } catch {
    return null;
  }
};

// Each booking section (detail + summary) is a fixed, predictable height —
// start a fresh page for it instead of letting pdfkit's auto-flow split a
// booking's rows across a page break.
const ensureSpace = (doc, y, neededHeight) => {
  if (y + neededHeight <= PAGE_BOTTOM) return y;
  doc.addPage();
  return 50;
};

/**
 * @param {object} data
 * @param {object} data.host - { businessName, brandName, address, city, state, country, logoUrl }
 * @param {object} data.invoiceNumber
 * @param {Array} data.entries - one per booking: { booking, payment }
 *   booking: { bookingCode, bookingType, resourceName, startDate, endDate, guestName }
 *   payment: { discountAmount, grossTotal, platformFeeAmount, platformFeePercent, amount, currency }
 *     grossTotal = full amount WONO collected from the client for that booking
 *     amount = grossTotal - platformFeeAmount — that booking's net payable
 * @param {object} data.grandTotal - { amount, currency } — sum of every entry's net amount
 */
export async function buildHostInvoicePdfBuffer(data) {
  const { host = {}, invoiceNumber, entries = [], grandTotal = {} } = data || {};
  const logoBuffer = await fetchLogoBuffer(host.logoUrl);

  const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });

  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header: logo (if any) + issuer block on the left, "INVOICE" on the right
    const headerY = 50;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 50, headerY, { fit: [120, 60] });
      } catch {
        // Not a renderable image format — skip silently.
      }
    }
    const issuerY = logoBuffer ? headerY + 65 : headerY;
    doc.fontSize(16).fillColor(NAVY).text(host.brandName || host.businessName || "Host Company", 50, issuerY);
    doc.fontSize(9).fillColor(SLATE);
    const addressLine = [host.address, host.city, host.state, host.country].filter(Boolean).join(", ");
    if (addressLine) doc.text(addressLine, 50, doc.y + 2, { width: 300 });

    doc.fontSize(22).fillColor(NAVY).text("PAYOUT INVOICE", 320, 50, { width: 225, align: "right" });
    doc.fontSize(9).fillColor(SLATE);
    doc.text(`Invoice #: ${invoiceNumber}`, 320, 80, { width: 225, align: "right" });
    doc.text(`Date: ${fmtDate(new Date())}`, 320, 94, { width: 225, align: "right" });
    doc.text(`Bookings included: ${entries.length}`, 320, 108, { width: 225, align: "right" });

    doc.moveDown(3);
    const billToY = Math.max(doc.y, 150);
    doc.fontSize(9).fillColor(LIGHT).text("BILL TO", 50, billToY);
    doc.fontSize(12).fillColor(NAVY).text("WONO", 50, billToY + 14);
    doc.fontSize(9).fillColor(SLATE).text("response@wono.co", 50, billToY + 30);

    let y = billToY + 60;

    entries.forEach(({ booking = {}, payment = {} }, index) => {
      // Detail (4 rows) + summary (up to 4 rows + total) + heading/spacing
      y = ensureSpace(doc, y, 230);

      doc.fontSize(10).fillColor(NAVY).text(`Booking ${index + 1} of ${entries.length} — ${booking.bookingCode || ""}`, 50, y);
      y += 18;

      doc.fontSize(9).fillColor(LIGHT).text("BOOKING DETAIL", 50, y);
      doc.moveTo(50, y + 14).lineTo(545, y + 14).strokeColor(BORDER).stroke();
      y += 22;

      const rows = [
        ["Guest / Company", booking.guestName || "-"],
        ["Booking Type", BOOKING_TYPE_LABELS[booking.bookingType] || booking.bookingType || "-"],
        ["Resource", booking.resourceName || "-"],
        booking.startDate && booking.endDate
          ? ["Dates", `${fmtDate(booking.startDate)} – ${fmtDate(booking.endDate)}`]
          : null,
      ].filter(Boolean);
      rows.forEach(([label, value]) => {
        doc.fontSize(10).fillColor(SLATE).text(label, 50, y, { width: 180 });
        doc.fontSize(10).fillColor(NAVY).text(value, 240, y, { width: 305 });
        y += 18;
      });

      y += 6;
      doc.fontSize(9).fillColor(LIGHT).text("PAYMENT SUMMARY", 50, y);
      doc.moveTo(50, y + 14).lineTo(545, y + 14).strokeColor(BORDER).stroke();
      y += 24;

      const summaryRow = (label, value, { bold = false, color = NAVY } = {}) => {
        doc.fontSize(bold ? 12 : 10).fillColor(bold ? NAVY : SLATE).text(label, 50, y, { width: 300 });
        doc.fontSize(bold ? 12 : 10).fillColor(color).text(value, 350, y, { width: 195, align: "right" });
        y += bold ? 20 : 18;
      };

      const platformFeePercent = Number(payment.platformFeePercent) || 0;
      summaryRow("Amount Due from WONO", fmtMoney(payment.grossTotal, payment.currency));
      if (Number(payment.discountAmount) > 0) {
        summaryRow("Discount", `-${fmtMoney(payment.discountAmount, payment.currency)}`, { color: "#dc2626" });
      }
      summaryRow(
        `WoNo Platform Fee${platformFeePercent ? ` (${platformFeePercent}%)` : ""}`,
        `-${fmtMoney(payment.platformFeeAmount, payment.currency)}`,
        { color: "#dc2626" },
      );
      doc.moveTo(50, y + 2).lineTo(545, y + 2).strokeColor(BORDER).stroke();
      y += 10;
      summaryRow("Booking Total", fmtMoney(payment.amount, payment.currency), { bold: true });

      y += 16;
    });

    // Grand total across every booking in this payout request
    y = ensureSpace(doc, y, 70);
    doc.moveTo(50, y).lineTo(545, y).strokeColor(NAVY).lineWidth(1.5).stroke();
    y += 14;
    doc.fontSize(14).fillColor(NAVY).text("TOTAL PAYABLE", 50, y, { width: 300 });
    doc.fontSize(16).fillColor(NAVY).text(fmtMoney(grandTotal.amount, grandTotal.currency), 350, y, { width: 195, align: "right" });
    y += 30;

    doc.fontSize(8).fillColor(LIGHT).text(
      "Net amount payable to the host for every booking above — the WoNo platform fee shown per booking was already retained at source from each client's payment.",
      50,
      y,
      { width: 495 },
    );

    doc.end();
  });
}
