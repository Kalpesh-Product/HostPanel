// Renders the lead-email templates to disk for visual review (no DB, no SMTP).
process.env.LEAD_PAYMENT_URL = "https://wono.co/pay";
const { buildLeadBookingAcceptedEmail, buildLeadRejectedEmail } = await import(
  "../utils/leadPaymentEmails.ts"
);

const lead = {
  _id: "507f1f77bcf86cd799439011",
  fullName: "Shreyash Parsekar",
  email: "shreyash.wono@gmail.com",
  companyName: "WONO Workspace",
  vertical: "meeting rooms",
  productType: "Huddle Room",
  leadMeta: {
    attendees: "4 people",
    startDate: "2026-10-22",
    timeSlot: "14:00",
    endTime: "17:00",
    duration: "3 hours",
    roomType: "Huddle Room",
  },
};
const payment = {
  currency: "USD",
  base: 300,
  platformFeePercent: 5,
  platformFeeAmount: 15,
  total: 315,
  rate: 100,
  hours: 3,
};

await import("node:fs/promises").then((fs) =>
  Promise.all([
    fs.writeFile("./email-preview-accepted.html", buildLeadBookingAcceptedEmail(lead, payment)),
    fs.writeFile("./email-preview-rejected.html", buildLeadRejectedEmail(lead)),
  ]),
);
console.log("rendered email previews");
