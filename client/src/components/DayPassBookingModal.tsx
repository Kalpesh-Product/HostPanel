import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  X,
  CalendarDays,
  Users,
  Wallet,
  Printer,
  BadgeCheck,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Loader2,
  Sun,
  Sunset,
} from "lucide-react";
import {
  getDayPassAvailability,
  createDayPassWalkIn,
  type DayPassAvailability,
} from "../services/day-passes";

// Reusable Coworking Day Pass (Daily Flexi Desk) booking modal.
// Used from three places: the coworking register ("+ Issue Day Pass"), the
// visitor front desk ("+ Walk-in Day Pass" / "Issue Day Pass" row action —
// with visitor details pre-filled), and anywhere else day passes are sold.
// Availability is fetched live per selected date; stock badges drive whether
// checkout is allowed at all. Passes are stored against the dedicated
// DayPassBooking collection (DP-XXXX codes) — never meeting-room bookings.

// Half-Day Pass pricing — fixed 60% of the day rate, mirrored server-side.
const HALF_DAY_RATE_PERCENT = 0.6;

const formatDateKey = (value: Date) => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const todayKey = () => formatDateKey(new Date());

const prettyDate = (key: string) => {
  const date = new Date(`${key}T00:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// Standalone badge print (hidden-iframe print preview, same trick the
// visitor badge + booking badge printers use).
export const printDayPassBadge = (booking: any) => {
  const code = String(booking?.bookingCode || "DP-----");
  const guestName = String(booking?.guestName || booking?.bookedByName || "Day Pass Guest");
  const company = String(booking?.company || "Individual");
  const passes = String(booking?.attendees || 1);
  const passType = String(booking?.passType || "Full-Day");
  const dateRaw = booking?.date ? new Date(booking.date) : null;
  const dateLabel = dateRaw && !Number.isNaN(dateRaw.getTime())
    ? dateRaw.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "--";
  const resource =
    typeof booking?.resourceId === "object" && booking?.resourceId
      ? booking.resourceId?.name
      : booking?.resourceName;
  const area = String(resource || "Open Desk Area");

  const printHtml = `
    <html>
      <head>
        <title>Day Pass Badge</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
          @page { margin: 30px 0 0 0; }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; }
          body {
            padding: 20px;
            font-family: "Poppins", "Segoe UI", Arial, sans-serif;
            background: #f8fafc;
            color: #111827;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sheet {
            max-width: 350px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 18px;
            border: 1px solid #bae6fd;
            box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
            overflow: hidden;
          }
          .header { background: linear-gradient(180deg, #2563EB 0%, #1E3D73 100%); color: #ffffff; padding: 14px 16px; }
          .header h1 { margin: 0; font-size: 18px; line-height: 1.15; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; text-align: center; }
          .content { padding: 14px 16px 16px 16px; }
          .name { margin: 0 0 2px 0; font-size: 20px; font-weight: 500; line-height: 1.2; color: #111827; text-align: center; }
          .company { margin: 0 0 12px 0; color: #6b7280; font-size: 11px; font-weight: 500; text-align: center; }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 10px 12px;
            background: #f9fafb;
          }
          .field-label { margin: 0; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: #9ca3af; font-weight: 500; }
          .field-value { margin: 2px 0 0 0; font-size: 12px; font-weight: 500; color: #1f2937; word-break: break-word; }
          .code { margin: 10px 0 0 0; text-align: center; font-size: 18px; font-weight: 700; letter-spacing: 0.12em; color: #1E3D73; }
          .span-2 { grid-column: span 2; }
          @media print {
            html, body { width: 100%; height: 100%; }
            body { background: #ffffff !important; padding: 0; }
            .sheet { box-shadow: none; border-color: #bae6fd; }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header"><h1>Day Pass</h1></div>
          <div class="content">
            <p class="name">${guestName}</p>
            <p class="company">${company}</p>
            <div class="grid">
              <div><p class="field-label">Pass Code</p><p class="field-value">${code}</p></div>
              <div><p class="field-label">Pass Type</p><p class="field-value">${passType}</p></div>
              <div><p class="field-label">Date</p><p class="field-value">${dateLabel}</p></div>
              <div><p class="field-label">Passes</p><p class="field-value">${passes}</p></div>
              <div class="span-2"><p class="field-label">Workspace Area</p><p class="field-value">${area}</p></div>
            </div>
            <p class="code">${code}</p>
          </div>
        </div>
        <script>window.onload = function () { window.focus(); setTimeout(function(){ window.print(); }, 120); };</script>
      </body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    toast.error("Unable to open the badge print preview right now. Please try again.");
    return;
  }
  iframeDoc.open();
  iframeDoc.write(printHtml);
  iframeDoc.close();
  window.setTimeout(() => {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
  }, 8000);
};

export interface DayPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (booking: any) => void;
  initialData?: {
    name?: string;
    phone?: string;
    email?: string;
    company?: string;
    attendees?: number;
    sourceVisitorId?: string;
  };
  workspaceId: string;
}

const PAYMENT_MODES = ["Cash", "UPI", "Card"] as const;

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 placeholder:text-slate-400";

export default function DayPassBookingModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  workspaceId,
}: DayPassModalProps) {
  const [date, setDate] = useState(todayKey());
  const [passType, setPassType] = useState<"Full-Day" | "Half-Day">("Full-Day");
  const [attendees, setAttendees] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [paymentMode, setPaymentMode] = useState<(typeof PAYMENT_MODES)[number]>("Cash");
  const [cashCollected, setCashCollected] = useState(true);

  const [availability, setAvailability] = useState<DayPassAvailability | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [formError, setFormError] = useState("");

  // Pre-fill + reset each time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setDate(todayKey());
    setPassType("Full-Day");
    setAttendees(Math.max(1, Number(initialData?.attendees) || 1));
    setName(initialData?.name || "");
    setPhone(initialData?.phone || "");
    setEmail(initialData?.email || "");
    setCompany(initialData?.company || "");
    setPaymentMode("Cash");
    setCashCollected(true);
    setAvailability(null);
    setAvailabilityError("");
    setCreatedBooking(null);
    setFormError("");
  }, [isOpen, initialData]);

  const fetchAvailability = useCallback(
    async (targetDate: string) => {
      setIsLoadingAvailability(true);
      setAvailabilityError("");
      try {
        // workspaceId is optional — the backend falls back to the
        // authenticated user's active workspace membership when omitted.
        const result = await getDayPassAvailability({
          workspaceId: workspaceId || undefined,
          date: targetDate,
        });
        setAvailability(result || null);
      } catch (error: any) {
        setAvailability(null);
        setAvailabilityError(
          error?.response?.data?.message || "Could not load day pass availability.",
        );
      } finally {
        setIsLoadingAvailability(false);
      }
    },
    [workspaceId],
  );

  // Live re-check whenever the chosen date changes.
  useEffect(() => {
    if (!isOpen) return;
    fetchAvailability(date);
  }, [isOpen, date, fetchAvailability]);

  const availableCount = availability?.availableCount ?? 0;
  const isSoldOut = Boolean(availability) && availableCount <= 0;
  const isLimited = Boolean(availability) && availableCount > 0 && availableCount <= 3;
  const exceedsAvailability = !isSoldOut && attendees > availableCount;
  const pricePerDay = Number(availability?.pricePerDay) || 0;
  const ratePerPass = useMemo(
    () => (passType === "Half-Day" ? pricePerDay * HALF_DAY_RATE_PERCENT : pricePerDay),
    [passType, pricePerDay],
  );
  const total = useMemo(
    () => Math.round(ratePerPass * attendees * 100) / 100,
    [ratePerPass, attendees],
  );

  const canSubmit = Boolean(
    name.trim() &&
      availability &&
      !isSoldOut &&
      !exceedsAvailability &&
      !isLoadingAvailability &&
      !isSubmitting,
  );

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      setFormError("Guest name is required.");
      return;
    }
    if (!availability) {
      setFormError(availabilityError || "Availability could not be loaded for this date.");
      return;
    }
    if (isSoldOut) {
      setFormError("🛑 Sold Out for this Date — pick another day.");
      return;
    }
    if (exceedsAvailability) {
      setFormError(`Only ${availableCount} desk${availableCount === 1 ? "" : "s"} remaining for this date.`);
      return;
    }
    setFormError("");
    setIsSubmitting(true);
    try {
      const result = await createDayPassWalkIn({
        workspaceId: workspaceId || undefined,
        date,
        passType,
        attendees,
        guestName: name.trim(),
        guestPhone: phone.trim(),
        guestEmail: email.trim(),
        company: company.trim(),
        paymentMode,
        cashCollected,
        sourceVisitorId: initialData?.sourceVisitorId || undefined,
      });
      const booking = result?.booking || result;
      setCreatedBooking(booking);
      toast.success(result?.message || `Day pass issued — ${booking?.bookingCode || ""}`);
      onSuccess?.(booking);
      // Pop the Day Pass badge print preview right away.
      printDayPassBadge(booking);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || "Could not issue the day pass.";
      toast.error(message);
      setFormError(message);
      // Availability may have shifted — refresh for the next attempt.
      fetchAvailability(date);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-[#0F172A]/85 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-[14px] font-pmedium text-slate-900">Issue Coworking Day Pass</h2>
            <p className="mt-0.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
              Daily Flexi Desk · Full-Day 09:00 AM – 07:00 PM
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 shrink-0 rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close day pass modal"
          >
            <X size={15} className="mx-auto" />
          </button>
        </div>

        {createdBooking ? (
          /* ── Success screen ─────────────────────────────────────────── */
          <div className="px-5 py-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 size={30} className="text-emerald-500" />
            </div>
            <h3 className="text-[15px] font-pmedium text-slate-900">Day Pass Issued</h3>
            <p className="mt-1 text-[11px] font-pmedium text-slate-500">
              {prettyDate(date)} · {createdBooking?.passType || passType} ·{" "}
              {createdBooking?.attendees || attendees} pass
              {(createdBooking?.attendees || attendees) > 1 ? "es" : ""} · Checked-in
            </p>
            <div className="mx-auto mt-4 w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4">
              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Pass Code</p>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-xl font-pmedium tracking-[0.12em] text-[#1E3D73]">
                <BadgeCheck size={18} className="text-blue-600" />
                {createdBooking?.bookingCode || "DP-----"}
              </p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => printDayPassBadge(createdBooking)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#2563EB] py-3 text-[11px] font-pmedium uppercase tracking-widest text-white shadow-sm transition hover:bg-blue-700"
              >
                <Printer size={14} /> Print Badge
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 py-3 text-[11px] font-pmedium uppercase tracking-widest text-slate-600 transition hover:bg-slate-50"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ── Booking form ───────────────────────────────────────────── */
          <div className="px-5 py-4">
            {/* Stock badge */}
            <div className="mb-4">
              {isLoadingAvailability ? (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-pmedium text-slate-500">
                  <Loader2 size={14} className="animate-spin" /> Checking desk availability…
                </div>
              ) : availabilityError ? (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-pmedium text-amber-700">
                  <AlertTriangle size={14} /> {availabilityError}
                </div>
              ) : availability ? (
                <div
                  className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-[11px] font-pmedium ${
                    isSoldOut
                      ? "border-red-200 bg-red-50 text-red-700"
                      : isLimited
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {isSoldOut ? (
                    <>
                      <Ban size={14} /> 🛑 Sold Out for this Date
                    </>
                  ) : isLimited ? (
                    <>
                      <AlertTriangle size={14} /> ⚠️ Limited Availability: Only {availableCount} desk
                      {availableCount === 1 ? "" : "s"} remaining!
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />● Available ({availableCount} desk
                      {availableCount === 1 ? "" : "s"} free)
                    </>
                  )}
                </div>
              ) : null}
              {availability ? (
                <p className="mt-1.5 text-[10px] font-pmedium text-slate-400">
                  {availability.totalCapacity} open desks · {availability.tenantAssignedDesks} held by tenants ·{" "}
                  {availability.bookedPassesCount} pass{availability.bookedPassesCount === 1 ? "" : "es"} booked
                </p>
              ) : null}
            </div>

            {/* Date + pass type */}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[9px] font-pmedium uppercase tracking-widest text-slate-500">
                  Date
                </span>
                <div className="relative">
                  <CalendarDays size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    min={todayKey()}
                    value={date}
                    onChange={(e) => setDate(e.target.value || todayKey())}
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </label>
              <div>
                <span className="mb-1 block text-[9px] font-pmedium uppercase tracking-widest text-slate-500">
                  Pass Type
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPassType("Full-Day")}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-pmedium transition ${
                      passType === "Full-Day"
                        ? "border-[#2563EB] bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Sun size={11} /> Full-Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setPassType("Half-Day")}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-pmedium transition ${
                      passType === "Half-Day"
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Sunset size={11} /> Half-Day
                  </button>
                </div>
              </div>
            </div>

            {/* Attendees */}
            <label className="mt-3 block">
              <span className="mb-1 block text-[9px] font-pmedium uppercase tracking-widest text-slate-500">
                Passes / Guests
              </span>
              <div className="relative">
                <Users size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min={1}
                  value={attendees}
                  onChange={(e) => setAttendees(Math.max(1, Number(e.target.value) || 1))}
                  className={`${inputClass} pl-8`}
                />
              </div>
            </label>

            {/* Guest details */}
            <div className="mt-3 grid grid-cols-1 gap-3">
              <label className="block">
                <span className="mb-1 block text-[9px] font-pmedium uppercase tracking-widest text-slate-500">
                  Full Name *
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Guest full name"
                  className={inputClass}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[9px] font-pmedium uppercase tracking-widest text-slate-500">
                    Phone
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[9px] font-pmedium uppercase tracking-widest text-slate-500">
                    Email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-[9px] font-pmedium uppercase tracking-widest text-slate-500">
                  Company
                </span>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company (optional)"
                  className={inputClass}
                />
              </label>
            </div>

            {/* Payment */}
            <div className="mt-3">
              <span className="mb-1 block text-[9px] font-pmedium uppercase tracking-widest text-slate-500">
                Payment Mode
              </span>
              <div className="flex gap-1.5">
                {PAYMENT_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-[11px] font-pmedium transition ${
                      paymentMode === mode
                        ? "border-[#2563EB] bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <label className="mt-2 flex items-center gap-2 text-[11px] font-pmedium text-slate-600">
                <input
                  type="checkbox"
                  checked={cashCollected}
                  onChange={(e) => setCashCollected(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-[#2563EB]"
                />
                Payment collected at the desk
              </label>
            </div>

            {/* Amount summary */}
            <div className="mt-4 space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between text-[11px] font-pmedium text-slate-600">
                <span>
                  Rate ({passType === "Half-Day" ? "60% of day rate" : "full day rate"})
                </span>
                <span>₹{ratePerPass} / pass</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-pmedium text-slate-600">
                <span>Passes × {attendees}</span>
                <span>₹{total}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
                <span className="flex items-center gap-1.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                  <Wallet size={13} /> Total payable
                </span>
                <span className="text-[15px] font-pmedium text-slate-900">₹{total}</span>
              </div>
            </div>

            {formError ? (
              <p className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-pmedium text-rose-600">
                {formError}
              </p>
            ) : null}

            {/* Footer */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 py-3 text-[11px] font-pmedium uppercase tracking-widest text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                title={isSoldOut ? "🛑 Sold Out for this Date" : undefined}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-3 text-[11px] font-pmedium uppercase tracking-widest shadow-sm transition ${
                  canSubmit
                    ? "bg-[#2563EB] text-white hover:bg-blue-700 active:scale-[0.98]"
                    : "cursor-not-allowed bg-slate-200 text-slate-500"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Issuing…
                  </>
                ) : (
                  <>
                    <BadgeCheck size={14} /> Confirm Pass
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
