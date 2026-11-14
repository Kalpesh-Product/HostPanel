import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CalendarCheck, CalendarClock, IdCard, Loader2, LogIn, Phone, Plus, Search, ShieldCheck, Upload, Wallet, X, XCircle } from "lucide-react";
import { useAppConfirm } from "../../components/app/AppConfirmProvider";
import { getCities, getCountries, getStates } from "../../utils/locationApi";
import {
  checkInRoomStayBooking,
  createRoomBooking,
  getGuestRooms,
  getRoomBookings,
  updateRoomBookingStatus,
  type GuestRoom,
  type GuestRoomType,
  type RoomStayBooking,
  type RoomStayBookingRoom,
  type RoomStayStatus,
} from "../../services/roomStays";

const GENDERS = ["Male", "Female", "Other"];
const roomOf = (booking: RoomStayBooking): RoomStayBookingRoom | null =>
  booking.roomId && typeof booking.roomId === "object" ? booking.roomId : null;

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-pmedium uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className="mt-1 text-[11px] font-pmedium text-slate-900">{value}</p>
    </div>
  );
}

const ID_PROOF_TYPES = ["Aadhaar", "Passport", "Driving License", "Voter ID", "Other"];
const PAYMENT_METHODS = ["Cash", "Card", "UPI", "Bank Transfer"];

const baseCardClass =
  "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md";
const FIELD =
  "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all";
const LABEL = "mb-1.5 block text-[10px] font-pmedium uppercase tracking-widest text-slate-400";
const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50";
const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50";
const TOOLBAR =
  "p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50";
const TH = "px-3.5 py-2";
const TD = "px-3.5 py-2 text-[12px] font-pmedium text-slate-900";

const STATUS_TONE: Record<RoomStayStatus, "blue" | "emerald" | "slate" | "red"> = {
  Booked: "blue",
  "Checked-in": "emerald",
  "Checked-out": "slate",
  Cancelled: "red",
};

const pillClass = (tone: "emerald" | "amber" | "red" | "slate" | "blue") => {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-100 text-slate-600",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
  };
  return `inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-pmedium uppercase tracking-widest ${tones[tone]}`;
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

const todayInput = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const emptyRow = (colSpan: number, message: string) => (
  <tr>
    <td colSpan={colSpan} className="bg-slate-50/50 py-20 text-center text-slate-400">
      <p className="text-sm font-pmedium">{message}</p>
    </td>
  </tr>
);

// Shown identically on both the Management (owner) page and the Booking (front
// desk) page for a vertical, the same way Cafe's reservations tab appears on
// both Cafe Management and Cafe Orders — "Booked" with a future check-in date
// already acts as a reservation, so this reuses the existing booking API rather
// than a parallel reservation model.
export default function RoomReservationsPanel({
  roomType,
  noun,
  formatCurrency,
}: {
  roomType: GuestRoomType;
  noun: string;
  formatCurrency: (value?: number) => string;
}) {
  const { prompt } = useAppConfirm();
  const [bookings, setBookings] = useState<RoomStayBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"All" | RoomStayStatus>("All");
  const [checkingIn, setCheckingIn] = useState<RoomStayBooking | null>(null);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await getRoomBookings({ roomType });
      setBookings(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load reservations."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomType]);

  const filtered = bookings.filter((booking) => {
    if (statusFilter !== "All" && booking.status !== statusFilter) return false;
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    return String(booking.bookingNumber).includes(needle) || booking.guestName.toLowerCase().includes(needle);
  });

  const upcoming = bookings.filter((booking) => booking.status === "Booked").length;
  const checkedIn = bookings.filter((booking) => booking.status === "Checked-in").length;
  const cancelled = bookings.filter((booking) => booking.status === "Cancelled").length;

  const cancelReservation = async (booking: RoomStayBooking) => {
    const result = await prompt({
      title: "Cancel reservation",
      message: `Cancel booking #${booking.bookingNumber} for ${booking.guestName}?`,
      fields: [{ name: "reason", label: "Reason", placeholder: "e.g. Guest cancelled" }],
      confirmLabel: "Cancel reservation",
    });
    if (!result) return;
    setBusyId(booking._id);
    try {
      await updateRoomBookingStatus(booking._id, "Cancelled", result.reason);
      toast.success("Reservation cancelled.");
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to cancel this reservation."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="mb-3 mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { key: "total", label: "Reservations", value: String(bookings.length), icon: CalendarClock, cardClass: baseCardClass, iconClass: "bg-blue-50 text-blue-600" },
          { key: "upcoming", label: "Upcoming", value: String(upcoming), icon: CalendarCheck, cardClass: `${baseCardClass} border-l-4 border-l-blue-500`, iconClass: "bg-blue-50 text-blue-600" },
          { key: "checkedin", label: "Checked-in", value: String(checkedIn), icon: LogIn, cardClass: `${baseCardClass} border-l-4 border-l-emerald-500`, iconClass: "bg-emerald-50 text-emerald-600" },
          { key: "cancelled", label: "Cancelled", value: String(cancelled), icon: XCircle, cardClass: `${baseCardClass} border-l-4 border-l-red-500`, iconClass: "bg-red-50 text-red-600" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className={card.cardClass}>
              <div><p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mb-1">{card.label}</p><p className="text-[15px] font-pmedium text-slate-900">{card.value}</p></div>
              <div className={`rounded-2xl p-2 shrink-0 ${card.iconClass}`}><Icon size={16} /></div>
            </div>
          );
        })}
      </div>

      <div className="flex min-h-110 flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className={TOOLBAR}>
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <div className="relative flex-1 min-w-[180px] xl:min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input className={`${FIELD} pl-9`} placeholder="Search booking # or guest..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["All", "Booked", "Checked-in", "Cancelled"] as const).map((value) => (
                <button key={value} type="button" onClick={() => setStatusFilter(value)} className={`rounded-lg px-3 py-1.5 text-[11px] font-pmedium ${statusFilter === value ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-500"}`}>
                  {value}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => setShowCreate(true)} className={PRIMARY_BUTTON}>
            <Plus size={14} /> New Reservation
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-[900px] w-full text-left">
            <thead className="sticky top-0 z-10 text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
              <tr>
                <th className={TH}>Booking</th>
                <th className={TH}>Guest</th>
                <th className={TH}>{noun}</th>
                <th className={TH}>Dates</th>
                <th className={`${TH} text-right`}>Total</th>
                <th className={`${TH} text-center`}>Status</th>
                <th className={`${TH} text-center`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? emptyRow(7, "Loading...")
                : filtered.length === 0
                  ? emptyRow(7, bookings.length === 0 ? "No reservations yet." : "No reservations match these filters.")
                  : filtered.map((booking) => (
                      <tr key={booking._id} className="transition-all hover:bg-blue-50/30">
                        <td className={TD}>#{booking.bookingNumber}</td>
                        <td className={TD}>
                          {booking.guestName}
                          {booking.guestPhone && <span className="flex items-center gap-1 text-[10px] font-pmedium text-slate-400"><Phone size={10} /> {booking.guestPhone}</span>}
                        </td>
                        <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-600">{booking.bedNumber ? `Bed ${booking.bedNumber}` : "—"}</td>
                        <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-500">{booking.checkIn.slice(0, 10)} → {booking.checkOut.slice(0, 10)} ({booking.nights}n)</td>
                        <td className={`${TD} text-right`}>{formatCurrency(booking.total)}</td>
                        <td className="px-3.5 py-2 text-center">
                          <span className={pillClass(STATUS_TONE[booking.status])} title={booking.status === "Cancelled" && booking.cancelReason ? `Reason: ${booking.cancelReason}` : undefined}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-2 text-center">
                          {booking.status === "Booked" && (
                            <div className="flex items-center justify-center gap-2">
                              <button type="button" onClick={() => setCheckingIn(booking)} disabled={busyId === booking._id} className={SECONDARY_BUTTON} title="Check in">
                                <LogIn size={13} /> Check-in
                              </button>
                              <button type="button" onClick={() => cancelReservation(booking)} disabled={busyId === booking._id} className="rounded-2xl px-3 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-rose-600 hover:bg-rose-50">
                                Cancel
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreateRoomReservationDialog
          roomType={roomType}
          noun={noun}
          formatCurrency={formatCurrency}
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false);
            await load();
          }}
        />
      )}

      {checkingIn && (
        <CheckInDialog
          booking={checkingIn}
          noun={noun}
          formatCurrency={formatCurrency}
          onClose={() => setCheckingIn(null)}
          onCheckedIn={async () => {
            setCheckingIn(null);
            await load();
          }}
        />
      )}
    </>
  );
}

// Exported — the Current Guests tab (RoomStayBookingPage.tsx) also has a
// Check-in action for its own "Booked" rows and reuses this same dialog, so
// ID/deposit collection can never be skipped by checking in from either tab.
export function CheckInDialog({
  booking,
  noun,
  formatCurrency,
  onClose,
  onCheckedIn,
}: {
  booking: RoomStayBooking;
  noun: string;
  formatCurrency: (value?: number) => string;
  onClose: () => void;
  onCheckedIn: () => Promise<void>;
}) {
  const room = roomOf(booking);
  const requiresDeposit = Boolean(room?.chargesSecurityDeposit);
  const expectedDeposit = requiresDeposit ? Number(room?.securityDepositAmount || 0) : 0;
  // Prefetch every field the booking already has (walk-ins collect this at
  // creation; a website booking won't) so the receptionist only fills gaps.
  const [idProofType, setIdProofType] = useState(booking.idProofType || ID_PROOF_TYPES[0]);
  const [idProofNumber, setIdProofNumber] = useState(booking.idProofNumber || "");
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [guestAge, setGuestAge] = useState(booking.guestAge ? String(booking.guestAge) : "");
  const [guestGender, setGuestGender] = useState(booking.guestGender || "");
  const [guestCountry, setGuestCountry] = useState(booking.guestCountry || "");
  const [guestState, setGuestState] = useState(booking.guestState || "");
  const [guestCity, setGuestCity] = useState(booking.guestCity || "");
  const [guestAddress, setGuestAddress] = useState(booking.guestAddress || "");
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [emergencyContactName, setEmergencyContactName] = useState(booking.emergencyContactName || "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(booking.emergencyContactPhone || "");
  const [collectDeposit, setCollectDeposit] = useState(Number(booking.securityDepositCollected || 0) > 0);
  const [depositCollected, setDepositCollected] = useState(
    booking.securityDepositCollected ? String(booking.securityDepositCollected) : "",
  );
  const [depositPaymentMethod, setDepositPaymentMethod] = useState(booking.securityDepositPaymentMethod || PAYMENT_METHODS[0]);
  const [depositTxn, setDepositTxn] = useState(booking.securityDepositTxn || "");
  const [depositProofFile, setDepositProofFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getCountries().then(setCountryOptions);
  }, []);

  useEffect(() => {
    if (!guestCountry) {
      setStateOptions([]);
      setGuestState("");
      return;
    }
    getStates(guestCountry).then((result) => {
      setStateOptions(result);
      setGuestState((current) => (result.includes(current) ? current : ""));
    });
  }, [guestCountry]);

  useEffect(() => {
    if (!guestCountry || !guestState) {
      setCityOptions([]);
      setGuestCity("");
      return;
    }
    getCities(guestCountry, guestState).then((result) => {
      setCityOptions(result);
      setGuestCity((current) => (result.includes(current) ? current : ""));
    });
  }, [guestCountry, guestState]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!idProofNumber.trim()) return toast.error("ID proof number is required.");
    if (!idProofFile && !booking.idProofFile) return toast.error("Attach the guest's ID proof document.");
    const numericAge = Number(guestAge);
    if (!Number.isInteger(numericAge) || numericAge < 1 || numericAge > 120) return toast.error("Enter a valid guest age.");
    if (!guestGender) return toast.error("Select the guest's gender.");
    if (!guestCountry.trim()) return toast.error("Guest country is required.");
    if (!guestState.trim()) return toast.error("Guest state is required.");
    if (!guestCity.trim()) return toast.error("Guest city is required.");
    if (!guestAddress.trim()) return toast.error("Guest address is required.");
    if (Boolean(emergencyContactName.trim()) !== Boolean(emergencyContactPhone.trim())) {
      return toast.error("Enter both emergency contact name and phone, or leave both blank.");
    }
    if (requiresDeposit && collectDeposit && !depositPaymentMethod) {
      return toast.error("Select how the security deposit was collected.");
    }

    setBusy(true);
    try {
      const res = await checkInRoomStayBooking(booking._id, {
        idProofType,
        idProofNumber: idProofNumber.trim(),
        idProofFile,
        guestAge: numericAge,
        guestGender,
        guestCountry: guestCountry.trim(),
        guestState: guestState.trim(),
        guestCity: guestCity.trim(),
        guestAddress: guestAddress.trim(),
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        ...(requiresDeposit && collectDeposit
          ? {
              securityDepositCollected: depositCollected.trim() ? Number(depositCollected) : expectedDeposit,
              securityDepositPaymentMethod: depositPaymentMethod,
              securityDepositTxn: depositTxn.trim(),
              securityDepositProof: depositProofFile,
            }
          : {}),
      });
      toast.success(res?.data?.message || "Guest checked in.");
      await onCheckedIn();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to check in this reservation."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-w-lg sm:rounded-[2rem]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-[13px] font-pmedium uppercase tracking-widest text-slate-900">Guest Check-In — #{booking.bookingNumber}</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col gap-4 overflow-y-auto p-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-500">Booking summary</p>
              <div className="grid gap-3 text-[12px] font-pmedium text-slate-600 sm:grid-cols-2">
                <ReviewItem label="Guest" value={booking.guestName} />
                <ReviewItem label="Phone / email" value={[booking.guestPhone, booking.guestEmail].filter(Boolean).join(" · ") || "No contact recorded"} />
                <ReviewItem label={noun} value={`${room?.name || "—"}${booking.bedNumber ? ` · Bed ${booking.bedNumber}` : ""}`} />
                <ReviewItem label="Stay dates" value={`${booking.checkIn.slice(0, 10)} → ${booking.checkOut.slice(0, 10)} (${booking.nights}n)`} />
              </div>
              <span className="mt-3 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-pmedium text-emerald-700">
                {formatCurrency(booking.total)} — {booking.paymentMethod || "Paid"}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-3 text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-500">Guest profile</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Age</label>
                  <input type="number" min={1} max={120} className={FIELD} value={guestAge} onChange={(event) => setGuestAge(event.target.value)} placeholder="Guest age" />
                </div>
                <div>
                  <label className={LABEL}>Gender</label>
                  <select className={FIELD} value={guestGender} onChange={(event) => setGuestGender(event.target.value)}>
                    <option value="">Select gender</option>
                    {GENDERS.map((gender) => (
                      <option key={gender} value={gender}>{gender}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Country</label>
                  <select className={FIELD} value={guestCountry} onChange={(event) => setGuestCountry(event.target.value)}>
                    <option value="">Select country</option>
                    {countryOptions.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>State</label>
                  <select className={FIELD} value={guestState} onChange={(event) => setGuestState(event.target.value)} disabled={!guestCountry || !stateOptions.length}>
                    <option value="">{!guestCountry ? "Select country first" : "Select state"}</option>
                    {stateOptions.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>City</label>
                  <select className={FIELD} value={guestCity} onChange={(event) => setGuestCity(event.target.value)} disabled={!guestState || !cityOptions.length}>
                    <option value="">{!guestState ? "Select state first" : "Select city"}</option>
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL}>Address</label>
                  <textarea className={FIELD} rows={2} value={guestAddress} onChange={(event) => setGuestAddress(event.target.value)} placeholder="House, building, street and postal code" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-3 text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-500">Identity and emergency contact</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={LABEL}><IdCard size={10} className="mr-1 inline" />ID proof type</label>
                  <select className={FIELD} value={idProofType} onChange={(event) => setIdProofType(event.target.value)}>
                    {ID_PROOF_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>ID proof number</label>
                  <input className={FIELD} value={idProofNumber} onChange={(event) => setIdProofNumber(event.target.value)} placeholder="ID number" />
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL}>ID proof attachment</label>
                  <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[11px] font-pmedium text-slate-500 hover:border-blue-300 hover:text-blue-700">
                    <Upload size={13} />
                    {idProofFile
                      ? idProofFile.name
                      : booking.idProofFile
                        ? `On file: ${booking.idProofFile.fileName} (click to replace)`
                        : "Upload photo / scan"}
                    <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf" className="hidden" onChange={(event) => setIdProofFile(event.target.files?.[0] || null)} />
                  </label>
                </div>
                <div>
                  <label className={LABEL}>Emergency contact name (optional)</label>
                  <input className={FIELD} value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value)} placeholder="Contact person" />
                </div>
                <div>
                  <label className={LABEL}>Emergency contact phone (optional)</label>
                  <input type="tel" className={FIELD} value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value)} placeholder="Emergency number" />
                </div>
              </div>
            </div>

            {requiresDeposit && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <ShieldCheck size={15} className="mt-0.5 text-amber-600" />
                    <div>
                      <p className="text-[11px] font-pmedium text-amber-900">
                        This {noun.toLowerCase()} charges a security deposit of {formatCurrency(expectedDeposit)}.
                      </p>
                      <p className="mt-0.5 text-[10px] text-amber-700">
                        Collecting it is optional — turn it off to skip straight to check-in.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={collectDeposit}
                    onClick={() => setCollectDeposit((value) => !value)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${collectDeposit ? "bg-amber-600" : "bg-slate-300"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${collectDeposit ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
                {collectDeposit && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={LABEL}>Deposit collected now</label>
                      <input type="number" min={0} max={expectedDeposit} className={FIELD} value={depositCollected} onChange={(event) => setDepositCollected(event.target.value)} placeholder={String(expectedDeposit)} />
                      <div className="mt-1.5 flex gap-2">
                        <button type="button" onClick={() => setDepositCollected("0")} className="text-[9px] font-pmedium text-slate-500 hover:text-blue-600">Collect later</button>
                        <button type="button" onClick={() => setDepositCollected(String(expectedDeposit))} className="text-[9px] font-pmedium text-blue-600 hover:text-blue-700">Collect full deposit</button>
                      </div>
                    </div>
                    <div>
                      <label className={LABEL}><Wallet size={10} className="mr-1 inline" />Deposit payment method</label>
                      <select className={FIELD} value={depositPaymentMethod} onChange={(event) => setDepositPaymentMethod(event.target.value)}>
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>Transaction ref (optional)</label>
                      <input className={FIELD} value={depositTxn} onChange={(event) => setDepositTxn(event.target.value)} placeholder="UPI / card ref" />
                    </div>
                    <div>
                      <label className={LABEL}>Deposit payment proof (optional)</label>
                      <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-[11px] font-pmedium text-slate-500 hover:border-blue-300 hover:text-blue-700">
                        <Upload size={13} />
                        {depositProofFile
                          ? depositProofFile.name
                          : booking.securityDepositProof
                            ? `On file: ${booking.securityDepositProof.fileName} (click to replace)`
                            : "Upload receipt / screenshot"}
                        <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf" className="hidden" onChange={(event) => setDepositProofFile(event.target.files?.[0] || null)} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>Cancel</button>
            <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
              {busy && <Loader2 size={13} className="animate-spin" />} Confirm Check-In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateRoomReservationDialog({
  roomType,
  noun,
  formatCurrency,
  onClose,
  onCreated,
}: {
  roomType: GuestRoomType;
  noun: string;
  formatCurrency: (value?: number) => string;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [rooms, setRooms] = useState<GuestRoom[]>([]);
  const [roomId, setRoomId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [checkIn, setCheckIn] = useState(todayInput());
  const [checkOut, setCheckOut] = useState(todayInput(1));
  const [idProofType, setIdProofType] = useState(ID_PROOF_TYPES[0]);
  const [idProofNumber, setIdProofNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getGuestRooms(roomType)
      .then((res) => {
        const list: GuestRoom[] = Array.isArray(res?.data?.data) ? res.data.data : [];
        setRooms(list.filter((room) => room.isActive && room.status === "Active"));
      })
      .catch(() => {
        // room picker just stays empty
      });
  }, [roomType]);

  const selectedRoom = rooms.find((room) => room._id === roomId);
  const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (24 * 60 * 60 * 1000)));
  const total = (selectedRoom?.pricePerNight || 0) * nights;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!roomId) return toast.error(`Choose a ${noun.toLowerCase()}.`);
    if (!guestName.trim()) return toast.error("Guest name is required.");
    if (!idProofNumber.trim()) return toast.error("ID proof number is required.");
    if (!checkOut || checkOut <= checkIn) return toast.error("Enter a valid check-in/check-out range.");

    setBusy(true);
    try {
      await createRoomBooking({
        roomId,
        bookingSource: "Phone",
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        checkIn,
        checkOut,
        notes: notes.trim(),
        idProofType,
        idProofNumber: idProofNumber.trim(),
        paymentMethod,
        amountPaid: amountPaid.trim() ? Number(amountPaid) : total,
      });
      toast.success("Reservation created.");
      await onCreated();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to create this reservation."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-w-lg sm:rounded-[2rem]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-[13px] font-pmedium uppercase tracking-widest text-slate-900">New Reservation</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col gap-4 overflow-y-auto p-6">
            <div>
              <label className={LABEL}>{noun}</label>
              <select className={FIELD} value={roomId} onChange={(event) => setRoomId(event.target.value)}>
                <option value="">Select a {noun.toLowerCase()}</option>
                {rooms.map((room) => (
                  <option key={room._id} value={room._id}>{room.name} · {formatCurrency(room.pricePerNight)}/night</option>
                ))}
              </select>
              {roomType === "Dorm" && selectedRoom && (
                <p className="mt-1 text-[10px] font-pmedium text-slate-400">A bed will be auto-assigned from {selectedRoom.capacity} in this dorm.</p>
              )}
              {selectedRoom && selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedRoom.amenities.map((amenity) => (
                    <span key={amenity} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-pmedium text-slate-500">{amenity}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Check-in date</label>
                <input type="date" className={FIELD} value={checkIn} min={todayInput()} onChange={(event) => setCheckIn(event.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Check-out date</label>
                <input type="date" className={FIELD} value={checkOut} min={checkIn} onChange={(event) => setCheckOut(event.target.value)} />
              </div>
            </div>
            <div>
              <label className={LABEL}>Guest name</label>
              <input className={FIELD} value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="Full name" />
            </div>
            <div>
              <label className={LABEL}>Phone (optional)</label>
              <input className={FIELD} value={guestPhone} onChange={(event) => setGuestPhone(event.target.value)} placeholder="Contact number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}><IdCard size={10} className="mr-1 inline" />ID proof type</label>
                <select className={FIELD} value={idProofType} onChange={(event) => setIdProofType(event.target.value)}>
                  {ID_PROOF_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>ID proof number</label>
                <input className={FIELD} value={idProofNumber} onChange={(event) => setIdProofNumber(event.target.value)} placeholder="ID number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}><Wallet size={10} className="mr-1 inline" />Payment method</label>
                <select className={FIELD} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Amount paid</label>
                <input type="number" min={0} className={FIELD} value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} placeholder={String(total)} />
              </div>
            </div>
            <div>
              <label className={LABEL}>Notes (optional)</label>
              <textarea className={FIELD} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            {selectedRoom && (
              <div className="flex justify-between border-t border-slate-100 pt-3 text-[13px] font-pmedium text-slate-900">
                <span>Total ({nights} night{nights === 1 ? "" : "s"})</span>
                <span>{formatCurrency(total)}</span>
              </div>
            )}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>Cancel</button>
            <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
              {busy && <Loader2 size={13} className="animate-spin" />} Create Reservation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
