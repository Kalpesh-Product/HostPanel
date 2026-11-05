// @ts-nocheck
// Builds the PDF a host company sends to WONO when they click "Send
// Invoice to WONO" — the host is the ISSUER here (their name/logo at the
// top, "Bill To: WONO"), not the other way around. This documents the
// host's payout claim for a finalized, paid website booking; it is not a
// Stripe object and never touches Stripe.
import PDFDocument from "pdfkit";
import axios from "axios";

const NAVY = "#0f172a";
const SLATE = "#475569";
const LIGHT = "#94a3b8";
const BORDER = "#e2e8f0";

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

/**
 * @param {object} data
 * @param {object} data.host - { businessName, brandName, address, city, state, country, logoUrl }
 * @param {object} data.booking - { bookingCode, bookingType, resourceName, startDate, endDate, guestName, companyName }
 * @param {object} data.payment - { subtotal, discountAmount, grossTotal, platformFeeAmount, platformFeePercent, amount, currency }
 *   grossTotal = full amount WONO collected from the client (what it owes the host, before its own cut)
 *   platformFeeAmount/Percent = WONO's cut, already retained at source
 *   amount = grossTotal - platformFeeAmount — the final net payable (bold "Total")
 * @param {string} data.invoiceNumber
 */
export async function buildHostInvoicePdfBuffer(data) {
  const { host = {}, booking = {}, payment = {}, invoiceNumber } = data || {};
  const logoBuffer = await fetchLogoBuffer(host.logoUrl);

  const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });

  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header: logo (if any) + issuer block on the left, "INVOICE" on the right
    let headerY = 50;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 50, headerY, { fit: [120, 60] });
      } catch {
        // Not a renderable image format — skip silently.
      }
    }
    const issuerX = logoBuffer ? 50 : 50;
    const issuerY = logoBuffer ? headerY + 65 : headerY;
    doc.fontSize(16).fillColor(NAVY).text(host.brandName || host.businessName || "Host Company", issuerX, issuerY);
    doc.fontSize(9).fillColor(SLATE);
    const addressLine = [host.address, host.city, host.state, host.country].filter(Boolean).join(", ");
    if (addressLine) doc.text(addressLine, issuerX, doc.y + 2, { width: 300 });

    doc.fontSize(22).fillColor(NAVY).text("INVOICE", 350, 50, { width: 195, align: "right" });
    doc.fontSize(9).fillColor(SLATE);
    doc.text(`Invoice #: ${invoiceNumber}`, 350, 80, { width: 195, align: "right" });
    doc.text(`Date: ${fmtDate(new Date())}`, 350, 94, { width: 195, align: "right" });
    doc.text(`Booking Code: ${booking.bookingCode || ""}`, 350, 108, { width: 195, align: "right" });

    doc.moveDown(3);
    const billToY = Math.max(doc.y, 150);
    doc.fontSize(9).fillColor(LIGHT).text("BILL TO", 50, billToY);
    doc.fontSize(12).fillColor(NAVY).text("WONO", 50, billToY + 14);
    doc.fontSize(9).fillColor(SLATE).text("response@wono.co", 50, billToY + 30);

    // Booking details table
    const tableTop = billToY + 60;
    doc.fontSize(9).fillColor(LIGHT);
    doc.text("BOOKING DETAIL", 50, tableTop);
    doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).strokeColor(BORDER).stroke();

    const rows = [
      ["Guest / Company", booking.guestName || booking.companyName || "-"],
      ["Booking Type", { MeetingRoom: "Meeting Room", CoLiving: "Co-Living", Hostel: "Hostel" }[booking.bookingType] || booking.bookingType],
      ["Resource", booking.resourceName || "-"],
      booking.startDate && booking.endDate
        ? ["Dates", `${fmtDate(booking.startDate)} – ${fmtDate(booking.endDate)}`]
        : null,
    ].filter(Boolean);

    let rowY = tableTop + 22;
    rows.forEach(([label, value]) => {
      doc.fontSize(10).fillColor(SLATE).text(label, 50, rowY, { width: 180 });
      doc.fontSize(10).fillColor(NAVY).text(value, 240, rowY, { width: 305 });
      rowY += 18;
    });

    // Payment summary — full-width rows, same column layout as the booking
    // detail table above, so the divider lines actually line up with the
    // label/value columns instead of floating as a disconnected mini-table.
    const summaryTop = rowY + 20;
    doc.fontSize(9).fillColor(LIGHT).text("PAYMENT SUMMARY", 50, summaryTop);
    doc.moveTo(50, summaryTop + 14).lineTo(545, summaryTop + 14).strokeColor(BORDER).stroke();

    let summaryY = summaryTop + 24;
    const summaryRow = (label, value, { bold = false, color = NAVY } = {}) => {
      doc.fontSize(bold ? 13 : 10.5).fillColor(bold ? NAVY : SLATE).text(label, 50, summaryY, { width: 300 });
      doc.fontSize(bold ? 13 : 10.5).fillColor(color).text(value, 350, summaryY, { width: 195, align: "right" });
      summaryY += bold ? 24 : 20;
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

    doc.moveTo(50, summaryY + 2).lineTo(545, summaryY + 2).strokeColor(BORDER).stroke();
    summaryY += 10;
    summaryRow("Total Payable", fmtMoney(payment.amount, payment.currency), { bold: true });

    doc.fontSize(8).fillColor(LIGHT).text(
      "Net amount payable to the host — the WoNo platform fee shown above was already retained at source from the client's payment.",
      50,
      summaryY + 14,
      { width: 495 },
    );

    doc.end();
  });
}
