// @ts-nocheck
// WONO lead-payment notification emails ("Your Booking Is Accepted" and the
// matching rejection note). Template mirrors the reference design: gradient
// top bar, WONO logo band, blue banner with check badge, booking summary
// rows, TOTAL PAYABLE card, Complete Payment button, checklist, security and
// assistance boxes, navy footer. Sent best-effort from the host panel lead
// accept flow -- mail failures log and never block the API response.
import { sendMail } from "../config/mailer.js";

const NAVY = "#16325c";
const BLUE = "#2e86eb";
const LIGHT_BLUE_BG = "#eaf3fd";
const PAGE_BG = "#e9eff7";
const ROW_BORDER = "#e8eef5";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmtMoney = (value, currency) => {
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(currency || "USD").toUpperCase(),
      currencyDisplay: "narrowSymbol",
    }).format(amount);
  } catch {
    return `${String(currency || "USD").toUpperCase()} ${amount.toFixed(2)}`;
  }
};

const checkIcon = (size = 18) =>
  `<img alt="" src="data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#e3effc"/><path d="M7 12.5l3.2 3.2L17 9" stroke="#2e86eb" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  )}" width="${size}" height="${size}" style="display:inline-block;vertical-align:middle;border:0;"/>`;

const checkBadge = (size = 46, fontSize = 20) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" style="width:${size}px;height:${size}px;border-radius:9999px;background:linear-gradient(180deg,#56b1f7,#2f8ff2);font-size:${fontSize}px;font-weight:700;color:#ffffff;">&#10003;</td>
</tr></table>`;

const summaryRow = (label, value) =>
  `<tr>
<td style="padding:10px 0;border-bottom:1px solid ${ROW_BORDER};font-size:12px;color:#8ca3bf;font-family:Arial,Helvetica,sans-serif;">${label}</td>
<td align="right" style="padding:10px 0;border-bottom:1px solid ${ROW_BORDER};font-size:12px;font-weight:700;color:${NAVY};font-family:Arial,Helvetica,sans-serif;">${value}</td>
</tr>`;

const checklistItem = (text) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td style="padding:5px 0;font-size:13px;color:#2c4a68;font-family:Arial,Helvetica,sans-serif;">${checkIcon(17)}&nbsp;&nbsp;${text}</td>
</tr></table>`;

const infoBox = (innerHtml) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:10px;">
<tr><td style="background:#f7fafd;border:1px solid #e4edf7;border-radius:10px;padding:14px 16px;font-size:12px;color:#6b7f99;font-family:Arial,Helvetica,sans-serif;">${innerHtml}</td></tr>
</table>`;

const pageHeading = (text) =>
  `<p style="margin:26px 0 10px;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${BLUE};font-family:Arial,Helvetica,sans-serif;">${text}</p>`;

const humanDate = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const readLeadMeta = (lead) =>
  lead?.leadMeta && typeof lead.leadMeta === "object" && !Array.isArray(lead.leadMeta)
    ? lead.leadMeta
    : {};

const slotRangeFromMeta = (meta) => {
  const slot = String(meta.timeSlot || meta.slot || meta.preferredTime || "").trim();
  if (!slot) return { start: "", end: "" };
  const inline = slot.match(
    /(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|a\.m|p\.m)?)\s*(?:-|to|->)\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|a\.m|p\.m)?)/i,
  );
  if (inline) return { start: inline[1], end: inline[2] };
  const unicodeRange = slot.match(
    /(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|a\.m|p\.m)?)\s*[\u2013\u2014]\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|a\.m|p\.m)?)/i,
  );
  return unicodeRange
    ? { start: unicodeRange[1], end: unicodeRange[2] }
    : { start: meta.startTime || slot || "", end: meta.endTime || "" };
};

const guestsLabel = (meta) => {
  const raw = String(meta.attendees || meta.noOfPeople || "").trim();
  if (!raw) return "";
  return /^\d+$/.test(raw) ? `${raw} people` : raw;
};

const durationLabel = (hours, meta) => {
  const explicit = String(meta.duration || meta.meetingLength || "").trim();
  if (explicit) return explicit;
  if (Number(hours) > 0) {
    const h = Number(hours);
    return `${h} ${h === 1 ? "hour" : "hours"}`;
  }
  return "";
};

const serviceLabel = (lead, meta) => {
  const bookingType = String(
    meta.inquiryType || meta.roomType || meta.roomName || lead.productType || "",
  ).toLowerCase();
  if (bookingType.includes("meeting")) return "Meeting Room";
  const raw = String(meta.vertical || lead.vertical || "").toLowerCase();
  if (raw.includes("meeting")) return "Meeting Room";
  if (raw) return raw.replace(/\b\w/g, (c) => c.toUpperCase());
  return "Meeting Room";
};

const emailShell = (inner) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${PAGE_BG};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PAGE_BG};">
<tr><td align="center" style="padding:26px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;">
${inner}
</table>
</td></tr></table>
</body></html>`;

const buildBookingAcceptedHtml = (lead, payment) => {
  const meta = readLeadMeta(lead);
  const currency = payment.currency || "USD";
  const slots = slotRangeFromMeta(meta);
  const timeLabel = slots.end ? `${slots.start} \u2013 ${slots.end}` : slots.start;
  const paymentUrl = String(payment.paymentLinkUrl || "").trim();

  const rows = [
    ["Workspace", escapeHtml(lead.companyName || lead.companyId || "N/A")],
    ["Service", escapeHtml(serviceLabel(lead, meta))],
    ["Product", escapeHtml(meta.roomType || meta.room || meta.roomName || meta.packageName || meta.productType || "N/A")],
    ["Guests", escapeHtml(guestsLabel(meta) || "N/A")],
    ["Date", escapeHtml(humanDate(meta.startDate || meta.checkIn || meta.bookingDate || meta.preferredDate) || "N/A")],
    timeLabel ? ["Time", escapeHtml(timeLabel)] : null,
    ["Duration", escapeHtml(durationLabel(payment.hours, meta) || "N/A")],
    ["Hourly rate", `${escapeHtml(fmtMoney(payment.rate, currency))} / hour`],
    ["Booking subtotal", escapeHtml(fmtMoney(payment.base, currency))],
    ["Platform fee", `${payment.platformFeePercent ?? 7}% &mdash; ${escapeHtml(fmtMoney(payment.platformFeeAmount, currency))}`],
    ["Booking status", "Awaiting Payment"],
  ].filter(Boolean);

  const paymentButton = paymentUrl
    ? `<a href="${escapeHtml(paymentUrl)}" style="display:block;background:${BLUE};border-radius:10px;padding:14px 28px;text-decoration:none;font-size:14px;font-weight:700;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">Complete Payment &mdash; ${escapeHtml(fmtMoney(payment.total, currency))}&nbsp;&nbsp;&rarr;</a>`
    : `<div style="background:${BLUE};border-radius:10px;padding:14px 28px;text-align:center;font-size:14px;font-weight:700;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">Complete Payment &mdash; ${escapeHtml(fmtMoney(payment.total, currency))}&nbsp;&rarr;</div>
<div style="margin-top:8px;text-align:center;font-size:11px;color:#96a3b8;font-family:Arial,Helvetica,sans-serif;">You will receive a secure payment link shortly.</div>`;

  return emailShell(`
<tr><td style="height:6px;background:linear-gradient(90deg,#79b2f2,#1e6fe0);">&nbsp;</td></tr>
<tr><td align="center" style="padding:22px 40px 18px;background:#ffffff;">
<span style="font-size:26px;font-weight:800;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;"><span style="color:${NAVY};">WO</span><span style="color:#3b9df0;">NO</span></span>
</td></tr>
<tr><td align="center" style="background:${LIGHT_BLUE_BG};padding:26px 40px 24px;">
${checkBadge()}
<p style="margin:12px 0 0;font-size:22px;font-weight:700;color:${NAVY};font-family:Arial,Helvetica,sans-serif;">Your Booking Is Accepted</p>
<p style="margin:6px 0 0;font-size:13px;color:#3b5a7d;font-family:Arial,Helvetica,sans-serif;">Complete your payment to confirm your booking.</p>
</td></tr>
<tr><td style="padding:26px 40px 30px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 14px;font-size:13px;font-weight:700;color:${NAVY};">Hello ${escapeHtml(lead.fullName || "there")},</p>
<p style="margin:0 0 8px;font-size:13px;color:#33475c;line-height:1.6;">Good news! The host has accepted your booking request. Please complete payment to confirm your reservation.</p>
${pageHeading("Booking Summary")}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${rows.map(([label, value]) => summaryRow(label, value)).join("")}
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:18px;">
<tr><td align="center" style="background:#f7fbff;border:1px solid #e4edf7;border-radius:10px;padding:16px 20px;">
<p style="margin:0;font-size:10px;font-weight:700;letter-spacing:2px;color:#7e93b0;font-family:Arial,Helvetica,sans-serif;">TOTAL PAYABLE</p>
<p style="margin:6px 0 0;font-size:26px;font-weight:700;color:${NAVY};font-family:Arial,Helvetica,sans-serif;">${escapeHtml(fmtMoney(payment.total, currency))} ${escapeHtml(String(currency).toUpperCase())}</p>
</td></tr></table>
<div style="margin-top:20px;">
${paymentButton}
</div>
<p style="margin:10px 0 0;text-align:center;font-size:11px;color:#96a3b8;font-family:Arial,Helvetica,sans-serif;">Securely complete payment to confirm your booking.</p>
${pageHeading("What Happens Next?")}
${checklistItem("Complete your payment")}
${checklistItem("Your payment will be verified")}
${checklistItem("Your booking will be confirmed")}
${checklistItem("You'll receive a booking confirmation email")}
${pageHeading("Payment Security")}
${infoBox(`<strong style="color:#33475c;">&#128274;</strong>&nbsp; Payments are processed securely through our payment partner.`)}
${infoBox(`<span style="color:#33475c;">Need assistance?</span><br><a href="mailto:response@wono.co" style="color:${BLUE};font-weight:700;text-decoration:none;">response@wono.co</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="https://wono.co" style="color:${BLUE};font-weight:700;text-decoration:none;">www.wono.co</a>`)}
</td></tr>
<tr><td align="center" style="background:${NAVY};padding:16px 40px;">
<p style="margin:0;font-size:11px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">&copy; ${new Date().getFullYear()} WONO. All rights reserved.</p>
<p style="margin:6px 0 0;font-size:11px;font-family:Arial,Helvetica,sans-serif;"><a href="https://wono.co/privacy-policy" style="color:#ffffff;text-decoration:underline;">Privacy Policy</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="https://wono.co/terms" style="color:#ffffff;text-decoration:underline;">Terms &amp; Conditions</a></p>
</td></tr>`);
};

const buildLeadRejectedHtml = (lead) =>
  emailShell(`
<tr><td style="height:6px;background:linear-gradient(90deg,#79b2f2,#1e6fe0);">&nbsp;</td></tr>
<tr><td align="center" style="padding:22px 40px 18px;background:#ffffff;">
<span style="font-size:26px;font-weight:800;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;"><span style="color:${NAVY};">WO</span><span style="color:#3b9df0;">NO</span></span>
</td></tr>
<tr><td align="center" style="background:${LIGHT_BLUE_BG};padding:26px 40px 24px;">
<p style="margin:0;font-size:22px;font-weight:700;color:${NAVY};font-family:Arial,Helvetica,sans-serif;">Your Booking Request Was Not Accepted</p>
<p style="margin:6px 0 0;font-size:13px;color:#3b5a7d;font-family:Arial,Helvetica,sans-serif;">Please try another date or contact the host directly.</p>
</td></tr>
<tr><td style="padding:26px 40px 30px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 14px;font-size:13px;font-weight:700;color:${NAVY};">Hello ${escapeHtml(lead.fullName || "there")},</p>
<p style="margin:0;font-size:13px;color:#33475c;line-height:1.6;">Unfortunately the host could not accept your booking request${lead.companyName ? ` at ${escapeHtml(lead.companyName)}` : ""}. You can submit a new request for another date &mdash; we'll be glad to host you.</p>
${infoBox(`<span style="color:#33475c;">Need assistance?</span><br><a href="mailto:response@wono.co" style="color:${BLUE};font-weight:700;text-decoration:none;">response@wono.co</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="https://wono.co" style="color:${BLUE};font-weight:700;text-decoration:none;">www.wono.co</a>`)}
</td></tr>
<tr><td align="center" style="background:${NAVY};padding:16px 40px;">
<p style="margin:0;font-size:11px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">&copy; ${new Date().getFullYear()} WONO. All rights reserved.</p>
<p style="margin:6px 0 0;font-size:11px;font-family:Arial,Helvetica,sans-serif;"><a href="https://wono.co/privacy-policy" style="color:#ffffff;text-decoration:underline;">Privacy Policy</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="https://wono.co/terms" style="color:#ffffff;text-decoration:underline;">Terms &amp; Conditions</a></p>
</td></tr>`);

const WONO_SIGNUP_URL = "https://wono.co/signup";
const nomadSignupUrl = (lead) => {
  const params = new URLSearchParams();
  if (lead?.email) params.set("email", String(lead.email).trim());
  if (lead?.fullName) params.set("name", String(lead.fullName).trim());
  if (lead?.mobileNumber) params.set("mobile", String(lead.mobileNumber).trim());
  const query = params.toString();
  return query ? `${WONO_SIGNUP_URL}?${query}` : WONO_SIGNUP_URL;
};

const ctaButton = (href, label, bg) =>
  `<a href="${escapeHtml(href)}" style="display:block;background:${bg};border-radius:10px;padding:14px 28px;text-decoration:none;text-align:center;font-size:14px;font-weight:700;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(label)}</a>`;

const fmtSlotTime = (date) =>
  date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
const fmtSlotDate = (date) =>
  date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const slotLabel = (slot) =>
  `${fmtSlotDate(new Date(slot.start))}, ${fmtSlotTime(new Date(slot.start))} – ${fmtSlotTime(new Date(slot.end))}`;

const slotsListHtml = (suggestedSlots) => {
  if (!Array.isArray(suggestedSlots) || !suggestedSlots.length) return "";
  const rows = suggestedSlots
    .map(
      (slot) =>
        `<div style="padding:10px 14px;border:1px solid #e4edf7;border-radius:10px;margin-bottom:8px;font-size:13px;font-weight:700;color:${NAVY};font-family:Arial,Helvetica,sans-serif;">${escapeHtml(slotLabel(slot))}</div>`,
    )
    .join("");
  return `${pageHeading("Other Open Slots")}${rows}`;
};

const slotsListText = (suggestedSlots) => {
  if (!Array.isArray(suggestedSlots) || !suggestedSlots.length) return "";
  const lines = suggestedSlots.map((slot) => `- ${slotLabel(slot)}`).join("\n");
  return `\n\nOther open slots:\n${lines}`;
};

const buildSlotUnavailableHtml = (lead, suggestedSlots = []) => {
  const meta = readLeadMeta(lead);
  const enquiryUrl = String(meta.websiteUrl || lead.websiteUrl || "https://wono.co").trim();
  const signupUrl = nomadSignupUrl(lead);
  return emailShell(`
<tr><td style="height:6px;background:linear-gradient(90deg,#79b2f2,#1e6fe0);">&nbsp;</td></tr>
<tr><td align="center" style="padding:22px 40px 18px;background:#ffffff;">
<span style="font-size:26px;font-weight:800;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;"><span style="color:${NAVY};">WO</span><span style="color:#3b9df0;">NO</span></span>
</td></tr>
<tr><td align="center" style="background:${LIGHT_BLUE_BG};padding:26px 40px 24px;">
<p style="margin:0;font-size:22px;font-weight:700;color:${NAVY};font-family:Arial,Helvetica,sans-serif;">That Slot Is Already Booked</p>
<p style="margin:6px 0 0;font-size:13px;color:#3b5a7d;font-family:Arial,Helvetica,sans-serif;">Please choose another available slot for the same date.</p>
</td></tr>
<tr><td style="padding:26px 40px 30px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 14px;font-size:13px;font-weight:700;color:${NAVY};">Hello ${escapeHtml(lead.fullName || "there")},</p>
<p style="margin:0 0 20px;font-size:13px;color:#33475c;line-height:1.6;">Someone booked this room/slot just before the host could confirm your request. No payment was taken. Pick another time on the same date, or explore WONO to book instantly next time.</p>
${slotsListHtml(suggestedSlots)}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:6px;"><tr><td>
${ctaButton(enquiryUrl, "Choose Another Slot", BLUE)}
</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;"><tr><td>
${ctaButton(signupUrl, "Sign Up on Wono.co", NAVY)}
</td></tr></table>
${infoBox(`<span style="color:#33475c;">Need assistance?</span><br><a href="mailto:response@wono.co" style="color:${BLUE};font-weight:700;text-decoration:none;">response@wono.co</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="https://wono.co" style="color:${BLUE};font-weight:700;text-decoration:none;">www.wono.co</a>`)}
</td></tr>
<tr><td align="center" style="background:${NAVY};padding:16px 40px;">
<p style="margin:0;font-size:11px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">&copy; ${new Date().getFullYear()} WONO. All rights reserved.</p>
<p style="margin:6px 0 0;font-size:11px;font-family:Arial,Helvetica,sans-serif;"><a href="https://wono.co/privacy-policy" style="color:#ffffff;text-decoration:underline;">Privacy Policy</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="https://wono.co/terms" style="color:#ffffff;text-decoration:underline;">Terms &amp; Conditions</a></p>
</td></tr>`);
};

export const buildLeadSlotUnavailableEmail = (lead, suggestedSlots = []) =>
  buildSlotUnavailableHtml(lead, suggestedSlots);

export const sendLeadSlotUnavailableEmail = async (lead, suggestedSlots = []) => {
  const to = String(lead?.email || "").trim();
  if (!to) {
    console.warn("Slot unavailable email skipped -- lead has no email address", {
      leadId: String(lead?._id || ""),
    });
    return { sent: false, reason: "no-email" };
  }
  const meta = readLeadMeta(lead);
  const enquiryUrl = String(meta.websiteUrl || lead.websiteUrl || "https://wono.co").trim();
  const signupUrl = nomadSignupUrl(lead);
  try {
    await sendMail({
      to,
      subject: "That slot is already booked - choose another time",
      html: buildSlotUnavailableHtml(lead, suggestedSlots),
      text: `Hello ${lead.fullName || "there"},\n\nSomeone booked this room/slot just before the host could confirm your request. No payment was taken.${slotsListText(suggestedSlots)}\n\nChoose another slot: ${enquiryUrl}\nOr sign up on WONO to book instantly next time: ${signupUrl}`,
    });
    return { sent: true };
  } catch (error) {
    console.error("Slot unavailable email failed:", error?.message || error);
    return { sent: false, reason: error?.message || "mail-error" };
  }
};

// HTML builders (exported for previews/tests) and best-effort senders.
export const buildLeadBookingAcceptedEmail = (lead, payment) =>
  buildBookingAcceptedHtml(lead, payment);

export const buildLeadRejectedEmail = (lead) => buildLeadRejectedHtml(lead);

export const sendLeadBookingAcceptedEmail = async (lead, payment) => {
  const to = String(lead?.email || "").trim();
  if (!to) {
    console.warn("Lead accepted email skipped -- lead has no email address", {
      leadId: String(lead?._id || ""),
    });
    return { sent: false, reason: "no-email" };
  }
  try {
    await sendMail({
      to,
      subject: "Your Booking Is Accepted - Complete your payment to confirm your booking",
      html: buildBookingAcceptedHtml(lead, payment),
      text: `Hello ${lead.fullName || "there"},\n\nThe host has accepted your booking request. Please complete payment to confirm your reservation.\n\nBooking subtotal: ${fmtMoney(payment.base, payment.currency)}\nPlatform fee (${payment.platformFeePercent ?? 7}%): ${fmtMoney(payment.platformFeeAmount, payment.currency)}\nTotal payable: ${fmtMoney(payment.total, payment.currency)} ${String(payment.currency || "USD").toUpperCase()}\n\n${String(payment.paymentLinkUrl || "https://wono.co")}`,
    });
    return { sent: true };
  } catch (error) {
    console.error("Lead accepted email failed:", error?.message || error);
    return { sent: false, reason: error?.message || "mail-error" };
  }
};

export const sendLeadRejectedEmail = async (lead) => {
  const to = String(lead?.email || "").trim();
  if (!to) {
    console.warn("Lead rejected email skipped -- lead has no email address", {
      leadId: String(lead?._id || ""),
    });
    return { sent: false, reason: "no-email" };
  }
  try {
    await sendMail({
      to,
      subject: "Update on your booking request",
      html: buildLeadRejectedHtml(lead),
      text: `Hello ${lead.fullName || "there"},\n\nUnfortunately the host could not accept your booking request${lead.companyName ? ` at ${lead.companyName}` : ""}. You can submit a new request for another date.\n\nNeed assistance? response@wono.co`,
    });
    return { sent: true };
  } catch (error) {
    console.error("Lead rejected email failed:", error?.message || error);
    return { sent: false, reason: error?.message || "mail-error" };
  }
};
