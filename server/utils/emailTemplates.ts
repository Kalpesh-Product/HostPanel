// @ts-nocheck
export function toDMY(isoDateOnly) {
  if (!isoDateOnly) return "-";
  const [yyyy, mm, dd] = isoDateOnly.split("-");
  if (!yyyy || !mm || !dd) return "-";
  return `${dd}-${mm}-${yyyy}`;
}

export function referenceDateStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  return `${get("year")}${get("month")}${get("day")}`;
}

export function formatSubmittedOn(date = new Date()) {
  const tz = "Asia/Kolkata";
  const submittedDate = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const submittedTime = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return { submittedDate, submittedTime };
}

export function formatLongDate(dateInput) {
  if (!dateInput) return "-";
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

const EMAIL_LOGO_URL = "https://www.wono.co/email-logo-wono.png";

/**
 * Shared shell for all WONO transactional emails: logo header, blue/white
 * checkmark hero, dark-mode-aware styling, contact band, and footer.
 * Only the hero copy and the sections you actually pass in vary per email
 * type — everything else (top logo bar and bottom footer) stays identical
 * across templates. Mirrors backend/utils/emailTemplates.js in the Nomads
 * repo and server/utils/emailTemplates.js in WoNoMasterPanel — keep all
 * three in sync when the shell changes.
 *
 * Every base (light-mode) color is set inline, not just via CSS class —
 * Gmail and several other clients strip <style> blocks in parts of their
 * rendering pipeline, so class-only colors can silently disappear. The
 * @media (prefers-color-scheme: dark) block layers dark-mode overrides on
 * top for clients that support it; clients that don't just keep the inline
 * light-mode colors, which is the correct fallback.
 */
export function renderNotificationEmail({
  heroTitle,
  heroSubtitle,
  greetingHtml,
  referenceLabel,
  referenceValue,
  detailsTitle = "Your Details",
  detailRows = [],
  otpCode,
  totalPayable,
  ctaButton,
  whatNextTitle = "What Happens Next?",
  whatNextItems = [],
  noteTitle,
  noteHtml,
  signOffHtml,
  bodyHtml,
}: {
  heroTitle: string;
  heroSubtitle: string;
  greetingHtml: string;
  referenceLabel?: string;
  referenceValue?: string;
  detailsTitle?: string;
  detailRows?: [string, string][];
  otpCode?: { code: string | number; expiryMinutes: number };
  totalPayable?: { label?: string; value: string };
  ctaButton?: { label: string; href: string; caption?: string };
  whatNextTitle?: string;
  whatNextItems?: string[];
  noteTitle?: string;
  noteHtml?: string;
  signOffHtml?: string;
  bodyHtml?: string;
}) {
  const detailRowsHtml = detailRows
    .map(
      ([label, value], index) => `
      <tr>
        <td class="email-label${index > 0 ? " email-divider" : ""}" style="padding:9px 0;width:45%;color:#8a93a3;${index > 0 ? "border-top:1px solid #eef2f8;" : ""}">${label}</td>
        <td class="email-value${index > 0 ? " email-divider" : ""}" style="padding:9px 0;font-weight:500;text-align:right;color:#16233b;${index > 0 ? "border-top:1px solid #eef2f8;" : ""}">${value}</td>
      </tr>`,
    )
    .join("");

  const whatNextHtml = whatNextItems
    .map(
      (item) => `
      <tr>
        <td style="padding:6px 0;width:26px;vertical-align:top;">
          <span class="email-badge" style="display:inline-block;width:18px;height:18px;line-height:18px;border-radius:50%;font-size:11px;text-align:center;background-color:#e5f4fd;color:#0BA9EF;">&#10003;</span>
        </td>
        <td style="padding:6px 0;">${item}</td>
      </tr>`,
    )
    .join("");

  const referenceBadgeHtml =
    referenceLabel && referenceValue
      ? `
            <tr>
              <td style="padding:20px 32px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-detail-bg" style="border-radius:10px;border-width:1px;border-style:solid;background-color:#f3f9fe;border-color:#dceafb;">
                  <tr>
                    <td class="email-badge" style="padding:14px 18px 0;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;background:none;color:#0BA9EF;">${referenceLabel}</td>
                  </tr>
                  <tr>
                    <td class="email-heading" style="padding:2px 18px 14px;font-size:16px;font-weight:700;color:#123a75;">${referenceValue}</td>
                  </tr>
                </table>
              </td>
            </tr>`
      : "";

  const otpCodeHtml = otpCode
    ? `
            <tr>
              <td style="padding:24px 32px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-detail-bg" style="border-radius:10px;border-width:1px;border-style:solid;background-color:#f3f9fe;border-color:#dceafb;">
                  <tr>
                    <td style="padding:18px 24px;text-align:center;">
                      <p class="email-subtext" style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#55617a;">Your Verification Code</p>
                      <p class="email-heading" style="margin:0 0 10px;font-size:32px;font-weight:700;letter-spacing:10px;color:#123a75;">${String(otpCode.code).split("").join(" ")}</p>
                      <p class="email-subtext" style="margin:0;font-size:12px;color:#55617a;">Expires in ${otpCode.expiryMinutes} minutes</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
    : "";

  const totalPayableHtml = totalPayable
    ? `
            <tr>
              <td style="padding:24px 32px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-detail-bg" style="border-radius:10px;border-width:1px;border-style:solid;background-color:#f3f9fe;border-color:#dceafb;">
                  <tr>
                    <td style="padding:18px 24px;text-align:center;">
                      <p class="email-subtext" style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#55617a;">${totalPayable.label || "Total Payable"}</p>
                      <p class="email-heading" style="margin:0;font-size:28px;font-weight:700;color:#123a75;">${totalPayable.value}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
    : "";

  const ctaButtonHtml = ctaButton
    ? `
            <tr>
              <td style="padding:28px 32px 4px;text-align:center;">
                <a href="${ctaButton.href}" style="display:inline-block;background:#0BA9EF;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;padding:13px 32px;border-radius:8px;">${ctaButton.label}</a>
                ${
                  ctaButton.caption
                    ? `<p class="email-subtext" style="margin:12px 0 0;font-size:12px;color:#55617a;">${ctaButton.caption}</p>`
                    : ""
                }
              </td>
            </tr>`
    : "";

  const noteBlockHtml = noteHtml
    ? `
            <tr>
              <td style="padding:28px 32px 4px;">
                ${
                  noteTitle
                    ? `<p style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:0.5px;color:#0BA9EF;text-transform:uppercase;">${noteTitle}</p>`
                    : ""
                }
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-detail-bg" style="border-radius:10px;border-width:1px;border-style:solid;background-color:#f3f9fe;border-color:#dceafb;">
                  <tr>
                    <td class="email-subtext" style="padding:14px 18px;font-size:12px;line-height:1.6;color:#55617a;">${noteHtml}</td>
                  </tr>
                </table>
              </td>
            </tr>`
    : "";

  const signOffHtmlBlock = signOffHtml
    ? `<p class="email-subtext" style="margin:14px 0 0;font-size:13px;color:#55617a;">${signOffHtml}</p>`
    : "";

  return `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="color-scheme" content="light dark" />
          <meta name="supported-color-schemes" content="light dark" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
            body { margin:0; padding:0; }
            .email-bg { background-color:#eef4fb; }
            .email-card { background-color:#ffffff; border-color:#dce7f5; }
            .email-hero-bg { background-color:#f3f9fe; }
            .email-detail-bg { background-color:#f3f9fe; border-color:#dceafb; }
            .email-heading { color:#123a75; }
            .email-text { color:#344054; }
            .email-subtext { color:#55617a; }
            .email-label { color:#8a93a3; }
            .email-value { color:#16233b; }
            .email-divider { border-top:1px solid #eef2f8; }
            .email-badge { background-color:#e5f4fd; color:#0BA9EF; }
            .email-footer-bg { background-color:#1d5fa8; }
            .email-footer-text { color:#cfe3fb; }
            .email-footer-link { color:#eaf4ff; }
            @media (prefers-color-scheme: dark) {
              .email-bg { background-color:#0b1220 !important; }
              .email-card { background-color:#111a2b !important; border-color:#1f2c46 !important; }
              .email-hero-bg { background-color:#0f1c33 !important; }
              .email-detail-bg { background-color:#0f1c33 !important; border-color:#1f3a63 !important; }
              .email-heading { color:#ffffff !important; }
              .email-text { color:#d7deea !important; }
              .email-subtext { color:#a9b6cc !important; }
              .email-label { color:#8493ad !important; }
              .email-value { color:#f1f5fb !important; }
              .email-divider { border-top:1px solid #22314d !important; }
              .email-badge { background-color:#12314f !important; color:#5fc4ff !important; }
              .email-footer-bg { background-color:#0c2b57 !important; }
              .email-footer-text { color:#a9c6ee !important; }
              .email-footer-link { color:#7db6f5 !important; }
            }
          </style>
        </head>
        <body class="email-bg" style="margin:0;padding:32px 16px;font-family:'Poppins',Arial,sans-serif;background-color:#eef4fb;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-card" style="max-width:580px;margin:0 auto;border-radius:14px;overflow:hidden;border-width:1px;border-style:solid;font-family:'Poppins',Arial,sans-serif;background-color:#ffffff;border-color:#dce7f5;">
            <tr>
              <td style="background:linear-gradient(90deg,#0BA9EF,#1e40af);height:5px;line-height:5px;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="background:#ffffff;padding:26px 32px;text-align:center;border-bottom:1px solid #eef2f8;">
                <img src="${EMAIL_LOGO_URL}" alt="WONO" width="140" height="40" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;height:40px;width:140px;" />
                <p style="margin:8px 0 0;font-size:12px;font-weight:500;letter-spacing:0.2px;color:#1f2733;">
                  <span style="color:#1f2733;">W</span><span style="color:#0BA9EF;">o</span><span style="color:#1f2733;">rld of N</span><span style="color:#0BA9EF;">o</span><span style="color:#1f2733;">mads</span>
                </p>
              </td>
            </tr>
            <tr>
              <td class="email-hero-bg" style="padding:40px 32px 28px;text-align:center;background-color:#f3f9fe;">
                <div style="width:60px;height:60px;line-height:60px;border-radius:50%;background:#0BA9EF;margin:0 auto 18px;">
                  <span style="font-size:28px;color:#ffffff;">&#10003;</span>
                </div>
                <h1 class="email-heading" style="margin:0 0 8px;font-size:22px;font-weight:700;color:#123a75;">${heroTitle}</h1>
                <p class="email-subtext" style="margin:0;font-size:14px;color:#55617a;">${heroSubtitle}</p>
              </td>
            </tr>
            <tr>
              <td class="email-text" style="padding:28px 32px 0;font-size:14px;line-height:1.6;color:#344054;">
                ${greetingHtml}
              </td>
            </tr>${bodyHtml || ""}${referenceBadgeHtml}${otpCodeHtml}
            ${
              detailRows.length
                ? `<tr>
              <td style="padding:28px 32px 4px;">
                <p style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:0.5px;color:#0BA9EF;text-transform:uppercase;">${detailsTitle}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-text" style="font-size:14px;color:#344054;">
                  ${detailRowsHtml}
                </table>
              </td>
            </tr>`
                : ""
            }${totalPayableHtml}${ctaButtonHtml}
            ${
              whatNextItems.length
                ? `<tr>
              <td style="padding:28px 32px 4px;">
                <p style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:0.5px;color:#0BA9EF;text-transform:uppercase;">${whatNextTitle}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-text" style="font-size:14px;color:#344054;">
                  ${whatNextHtml}
                </table>
              </td>
            </tr>`
                : ""
            }${noteBlockHtml}
            <tr>
              <td style="padding:28px 32px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-detail-bg" style="border-radius:10px;border-width:1px;border-style:solid;background-color:#f3f9fe;border-color:#dceafb;">
                  <tr>
                    <td style="padding:18px 24px;text-align:center;">
                      <p class="email-subtext" style="margin:0 0 6px;font-size:13px;color:#55617a;">Need Immediate Assistance?</p>
                      <p style="margin:0;font-size:14px;">
                        <a href="mailto:response@wono.co" style="color:#0BA9EF;text-decoration:none;font-weight:600;">response@wono.co</a>
                        &nbsp;|&nbsp;
                        <a href="https://www.wono.co" style="color:#0BA9EF;text-decoration:none;font-weight:600;">www.wono.co</a>
                      </p>
                      ${signOffHtmlBlock}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-footer-bg" style="background-color:#1d5fa8;padding:22px 32px;text-align:center;">
                <p class="email-footer-text" style="margin:0 0 6px;font-size:11px;color:#cfe3fb;">&copy; Copyright 2026-27 All Rights Reserved.<br/>WONOCO PRIVATE LIMITED - SINGAPORE.</p>
                <p style="margin:0;font-size:11px;">
                  <a href="https://www.wono.co/privacy" class="email-footer-link" style="color:#eaf4ff !important;text-decoration:underline;">Privacy Policy</a>
                  &nbsp;|&nbsp;
                  <a href="https://www.wono.co/terms-and-conditions" class="email-footer-link" style="color:#eaf4ff !important;text-decoration:underline;">Terms &amp; Conditions</a>
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
      `;
}
