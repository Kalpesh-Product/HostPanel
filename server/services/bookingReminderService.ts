import { MeetingRoomBooking } from "../models/MeetingRoomBooking.js";

const CHECK_INTERVAL_MS = 60 * 1000;
const REMINDER_LEAD_MINUTES = 30;

const istParts = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
};

const sendReminderEmail = async (booking: any) => {
    const recipientEmail = String(booking.bookedByEmail || "").trim();
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) return;

    const clientName = booking.bookedForName || booking.bookedByName || "Guest";
    const roomName = booking.roomName || "Meeting Room";
    const bookingCode = booking.bookingCode || String(booking._id);
    const start = booking.start ? istParts(new Date(booking.start)) : { date: "", time: "" };
    const end = booking.end ? istParts(new Date(booking.end)) : { date: "", time: "" };

    const subject = `Reminder — your booking in ${roomName} starts at ${start.time}`;
    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
        <tr><td style="background:#2563EB;padding:32px 40px;">
          <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">Starting Soon ⏰</p>
          <p style="margin:8px 0 0;font-size:13px;color:#bfdbfe;">Your meeting room booking begins in about ${REMINDER_LEAD_MINUTES} minutes</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 24px;font-size:15px;color:#334155;">Hi <strong>${clientName}</strong>, this is a reminder for your upcoming booking (ID <strong>${bookingCode}</strong>):</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:16px;">
            <tr style="background:#f1f5f9;"><td style="padding:12px 16px;font-size:13px;font-weight:700;color:#64748b;">Meeting Room</td><td style="padding:12px 16px;font-size:13px;font-weight:800;color:#0f172a;">${roomName}</td></tr>
            <tr style="border-top:1px solid #f1f5f9;"><td style="padding:12px 16px;font-size:13px;font-weight:700;color:#64748b;">Starts</td><td style="padding:12px 16px;font-size:13px;font-weight:800;color:#0f172a;">${start.date} · ${start.time}</td></tr>
            <tr style="background:#f8fafc;border-top:1px solid #f1f5f9;"><td style="padding:12px 16px;font-size:13px;font-weight:700;color:#64748b;">Ends</td><td style="padding:12px 16px;font-size:13px;font-weight:800;color:#0f172a;">${end.date} · ${end.time}</td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">Show your booking ID at the front desk when you arrive. We look forward to seeing you!</p>
        </td></tr>
        <tr><td style="background:#f1f5f9;padding:20px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">This is an automated reminder. Please do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const { sendMail } = await import("../config/mailer.js");
    await sendMail({
        to: recipientEmail,
        subject,
        html,
        text: `Reminder: your booking (${bookingCode}) in ${roomName} starts at ${start.time} on ${start.date}.`,
    });
};

const runReminderSweep = async () => {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_LEAD_MINUTES * 60 * 1000);

    // Claim one booking at a time atomically (set reminderSentAt before
    // emailing) so overlapping sweeps or restarts never double-send.
    // Only external bookings carry a client email worth reminding.
    for (;;) {
        const booking = await MeetingRoomBooking.findOneAndUpdate(
            {
                bookingType: "External",
                status: { $nin: ["cancelled", "completed"] },
                start: { $gte: now, $lte: windowEnd },
                reminderSentAt: null,
            },
            { $set: { reminderSentAt: now } },
            { new: true },
        ).lean().exec();

        if (!booking) break;

        try {
            await sendReminderEmail(booking);
        } catch (err) {
            console.error(`Booking reminder email failed for ${booking.bookingCode || booking._id}:`, err);
        }
    }
};

/**
 * Emails every external client a reminder ~30 minutes before their booking
 * starts. Runs inside the long-lived Express process; safe to call once at
 * startup after MongoDB is connected.
 */
export const startBookingReminderScheduler = () => {
    const tick = () => {
        runReminderSweep().catch((err) => {
            console.error("Booking reminder sweep failed:", err?.message || err);
        });
    };

    tick();
    const timer = setInterval(tick, CHECK_INTERVAL_MS);
    timer.unref?.();
    return timer;
};
