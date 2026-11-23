// @ts-nocheck
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // your Gmail
    pass: process.env.EMAIL_PASS, // app password
  },
});

// Transient Gmail/network failures are the common case (socket resets, Gmail
// 4xx throttling, DNS blips). Without a retry the customer simply never gets
// the email and only a console line remains. Retry those a couple of times
// with backoff, then fail loudly so the caller can surface it.
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 3000];
const RETRYABLE_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ESOCKET",
  "EDNS",
  "EAI_AGAIN",
  "ENOTFOUND",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (error) => {
  const code = String(error?.code || "").toUpperCase();
  if (RETRYABLE_CODES.has(code)) return true;
  const status = Number(error?.responseCode || error?.statusCode || 0);
  // 4xx from Gmail during delivery is usually rate limiting; auth failures
  // (535 etc.) are permanent and must not be retried.
  return status === 421 || status === 429 || status >= 500;
};

export const sendMail = async ({ to, subject, text, html, attachments = [] }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("[mail] EMAIL_USER / EMAIL_PASS not configured — email not sent", { to, subject });
    throw new Error("Email is not configured (EMAIL_USER / EMAIL_PASS missing)");
  }

  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await transporter.sendMail({
        from: `"WONO Nomads" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html,
        ...(Array.isArray(attachments) && attachments.length ? { attachments } : {}),
      });
    } catch (error) {
      lastError = error;
      const retryable = isRetryable(error) && attempt < MAX_ATTEMPTS;
      console.error("[mail] send failed", {
        to,
        subject,
        attempt,
        maxAttempts: MAX_ATTEMPTS,
        retryable,
        code: error?.code || null,
        responseCode: error?.responseCode || null,
        message: error?.message || String(error),
      });
      if (!retryable) break;
      await wait(RETRY_DELAYS_MS[attempt - 1] || 3000);
    }
  }

  console.error("[mail] giving up — email NOT delivered", { to, subject });
  throw lastError;
};
