import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bed,
  Calendar,
  CheckCircle2,
  Clock,
  IdCard,
  LogIn,
  LogOut,
  Phone,
  PlusCircle,
  Search,
  TrendingUp,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import { useAppConfirm } from "../../components/app/AppConfirmProvider";
import useWorkspacePreferences from "../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../lib/workspaceLocalization";
import RoomReservationsPanel from "./RoomReservationsPanel";
import {
  createRoomBooking,
  extendRoomBooking,
  getRoomAvailability,
  getRoomBookings,
  getRoomStayCheckTimes,
  updateRoomBookingStatus,
  type GuestRoomType,
  type RoomAvailability,
  type RoomStayBooking,
  type RoomStayStatus,
} from "../../services/roomStays";

type Tab = "availability" | "reservations" | "guests" | "history";
type CheckTimes = { checkInTime: string; checkOutTime: string };

const ID_PROOF_TYPES = ["Aadhaar", "Passport", "Driving License", "Voter ID", "Other"];
const PAYMENT_METHODS = ["Cash", "Card", "UPI", "Bank Transfer"];

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

const baseCardClass =
  "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md";
const FIELD =
  "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all";
const LABEL = "mb-1.5 block text-[10px] font-pmedium uppercase tracking-widest text-slate-400";
const SEARCH_INPUT =
  "w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-500";
const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50";
const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50";
const TOOLBAR =
  "p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50";
const TH = "px-3.5 py-2";
const TD = "px-3.5 py-2 text-[12px] font-pmedium text-slate-900";

const STATUS_TONE: Record<RoomStayStatus, "sky" | "emerald" | "slate" | "rose"> = {
  Booked: "sky",
  "Checked-in": "emerald",
  "Checked-out": "slate",
  Cancelled: "rose",
};
const TONE_CLASS: Record<string, string> = {
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  slate: "border-slate-200 bg-slate-100 text-slate-600",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
};
const pill = (tone: string) =>
  `inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-pmedium uppercase tracking-widest ${TONE_CLASS[tone]}`;

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

const todayInput = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="bg-slate-50/50 py-20 text-center text-slate-400">
        <p className="text-sm font-pmedium">{message}</p>
      </td>
    </tr>
  );
}

function SummaryCards({ cards }: { cards: Array<{ key: string; icon: typeof Bed; label: string; value: string; cardClass: string; iconClass: string }> }) {
  return (
    <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4 shrink-0">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className={card.cardClass}>
            <div className="min-w-0">
              <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
              <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
            </div>
            <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}><Icon size={16} /></div>
          </div>
        );
      })}
    </div>
  );
}

export default function RoomStayBookingPage({ roomType, title, noun }: { roomType: GuestRoomType; title: string; noun: string }) {
  const workspacePreferences = useWorkspacePreferences();
  const formatCurrency = (value = 0) =>
    formatWorkspaceCurrency(Number(value || 0), workspacePreferences.currency, { maximumFractionDigits: 2 });

  const [tab, setTab] = useState<Tab>("availability");
  const [checkTimes, setCheckTimes] = useState<CheckTimes>({ checkInTime: "09:00", checkOutTime: "22:00" });

  useEffect(() => {
    getRoomStayCheckTimes()
      .then((res) => {
        if (res?.data?.data) setCheckTimes(res.data.data);
      })
      .catch(() => {
        // keep defaults
      });
  }, []);

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">{title}</h2>
            <p className="text-xs font-pmedium text-slate-500 mt-1">Check availability, book a stay, and manage guests.</p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
          {(
            [
              { key: "availability", label: "Availability" },
              { key: "reservations", label: "Reservations" },
              { key: "guests", label: "Current Guests" },
              { key: "history", label: "History" },
            ] as Array<{ key: Tab; label: string }>
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
                tab === item.key ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "availability" && <AvailabilityTab roomType={roomType} noun={noun} formatCurrency={formatCurrency} checkTimes={checkTimes} />}
        {tab === "reservations" && <RoomReservationsPanel roomType={roomType} noun={noun} formatCurrency={formatCurrency} />}
        {tab === "guests" && <CurrentGuestsTab roomType={roomType} noun={noun} formatCurrency={formatCurrency} />}
        {tab === "history" && <HistoryTab roomType={roomType} noun={noun} formatCurrency={formatCurrency} />}
      </PageFrame>
    </div>
  );
}

function AvailabilityTab({
  roomType,
  noun,
  formatCurrency,
  checkTimes,
}: {
  roomType: GuestRoomType;
  noun: string;
  formatCurrency: (value?: number) => string;
  checkTimes: CheckTimes;
}) {
  const [checkIn, setCheckIn] = useState(todayInput());
  const [checkOut, setCheckOut] = useState(todayInput(1));
  const [rooms, setRooms] = useState<RoomAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<RoomAvailability | null>(null);

  const load = async () => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return;
    setIsLoading(true);
    try {
      const res = await getRoomAvailability(roomType, checkIn, checkOut);
      setRooms(Array.isArray(res?.data?.data?.rooms) ? res.data.data.rooms : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load availability."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomType]);

  const totalRooms = rooms.length;
  const available = rooms.filter((room) => room.availableBeds > 0).length;
  const avgRate = totalRooms ? rooms.reduce((sum, room) => sum + Number(room.pricePerNight || 0), 0) / totalRooms : 0;

  return (
    <>
      <SummaryCards
        cards={[
          { key: "total", icon: Bed, label: `Total ${noun}s`, value: String(totalRooms), cardClass: baseCardClass, iconClass: "bg-blue-50 text-blue-600" },
          { key: "available", icon: CheckCircle2, label: "Available", value: String(available), cardClass: `${baseCardClass} border-l-4 border-l-emerald-500`, iconClass: "bg-emerald-50 text-emerald-600" },
          { key: "booked", icon: Users, label: "Booked", value: String(totalRooms - available), cardClass: `${baseCardClass} border-l-4 border-l-amber-500`, iconClass: "bg-amber-50 text-amber-600" },
          { key: "rate", icon: TrendingUp, label: "Avg Nightly Rate", value: formatCurrency(avgRate), cardClass: `${baseCardClass} border-l-4 border-l-indigo-500`, iconClass: "bg-indigo-50 text-indigo-600" },
        ]}
      />

      <div className="flex min-h-110 flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className={TOOLBAR}>
          <div className="flex flex-wrap items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <input type="date" className={`${FIELD} w-auto`} value={checkIn} min={todayInput()} onChange={(event) => setCheckIn(event.target.value)} aria-label="Check-in date" />
            <span className="text-slate-400">to</span>
            <input type="date" className={`${FIELD} w-auto`} value={checkOut} min={checkIn} onChange={(event) => setCheckOut(event.target.value)} aria-label="Check-out date" />
            <span
              className="flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-500"
              title="Set from Resource & Pricing's booking hours"
            >
              <Clock size={12} /> Check-in {checkTimes.checkInTime} · Check-out {checkTimes.checkOutTime}
            </span>
          </div>
          <button type="button" onClick={() => void load()} className={PRIMARY_BUTTON}>
            <Search size={14} /> Search
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-[900px] w-full text-left">
            <thead className="sticky top-0 z-10 text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
              <tr>
                <th className={TH}>{noun}</th>
                <th className={TH}>Location</th>
                <th className={`${TH} text-right`}>Rate / Night</th>
                <th className={`${TH} text-center`}>Status</th>
                <th className={TH}>Frees Up</th>
                <th className={`${TH} text-center`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <EmptyRow colSpan={6} message="Loading availability..." />
              ) : rooms.length === 0 ? (
                <EmptyRow colSpan={6} message={`No ${noun.toLowerCase()}s set up yet. Add them in Resource & Pricing first.`} />
              ) : (
                rooms.map((room) => {
                  const free = room.availableBeds > 0;
                  return (
                    <tr key={room._id} className="transition-all hover:bg-blue-50/30">
                      <td className={TD}>
                        {room.name}
                        {roomType === "Dorm" && <span className="block text-[10px] font-pmedium text-slate-400">{room.availableBeds} / {room.totalBeds} beds free</span>}
                        {room.amenities && room.amenities.length > 0 && (
                          <span className="block text-[10px] text-slate-400 truncate max-w-[220px]">{room.amenities.join(" · ")}</span>
                        )}
                      </td>
                      <td className={`${TD} text-slate-500`}>{[room.location, room.floor, room.wing].filter(Boolean).join(" · ") || "—"}</td>
                      <td className={`${TD} text-right`}>{formatCurrency(room.pricePerNight)}</td>
                      <td className="px-3.5 py-2 text-center"><span className={pill(free ? "emerald" : "slate")}>{free ? "Available" : "Booked"}</span></td>
                      <td className={`${TD} text-slate-500`}>{free ? "—" : formatDateTime(room.nextAvailableAt)}</td>
                      <td className="px-3.5 py-2 text-center">
                        <button type="button" disabled={!free} onClick={() => setSelected(room)} className={`${SECONDARY_BUTTON} disabled:opacity-40`}>
                          Book
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <BookingDialog
          room={selected}
          roomType={roomType}
          checkIn={checkIn}
          checkOut={checkOut}
          formatCurrency={formatCurrency}
          onClose={() => setSelected(null)}
          onBooked={async () => {
            setSelected(null);
            await load();
          }}
        />
      )}
    </>
  );
}

function BookingDialog({
  room,
  roomType,
  checkIn,
  checkOut,
  formatCurrency,
  onClose,
  onBooked,
}: {
  room: RoomAvailability;
  roomType: GuestRoomType;
  checkIn: string;
  checkOut: string;
  formatCurrency: (value?: number) => string;
  onClose: () => void;
  onBooked: () => Promise<void>;
}) {
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [idProofType, setIdProofType] = useState(ID_PROOF_TYPES[0]);
  const [idProofNumber, setIdProofNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [amountPaid, setAmountPaid] = useState("");
  const [busy, setBusy] = useState(false);

  const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (24 * 60 * 60 * 1000)));
  const total = room.pricePerNight * nights;

  const handleConfirm = async () => {
    if (!guestName.trim()) return toast.error("Guest name is required.");
    if (!idProofNumber.trim()) return toast.error("ID proof number is required.");
    setBusy(true);
    try {
      await createRoomBooking({
        roomId: room._id,
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
      toast.success("Booking confirmed.");
      await onBooked();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to create this booking."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-w-lg sm:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-[13px] font-pmedium uppercase tracking-widest text-slate-900">Book {room.name}</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-4 p-6">
          <div className="rounded-xl bg-slate-50 p-3 text-[12px] font-pmedium text-slate-600">
            {checkIn} → {checkOut} · {nights} night{nights === 1 ? "" : "s"}
            {roomType === "Dorm" && <span className="block text-[11px] text-slate-400">A bed will be auto-assigned from {room.availableBeds} available.</span>}
            {room.amenities && room.amenities.length > 0 && (
              <span className="mt-1 flex flex-wrap gap-1">
                {room.amenities.map((amenity) => (
                  <span key={amenity} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-pmedium text-slate-500">{amenity}</span>
                ))}
              </span>
            )}
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
          <div className="flex justify-between border-t border-slate-100 pt-3 text-[13px] font-pmedium text-slate-900">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>Cancel</button>
          <button type="button" onClick={handleConfirm} disabled={busy} className={PRIMARY_BUTTON}>Confirm booking</button>
        </div>
      </div>
    </div>
  );
}

function CurrentGuestsTab({ roomType, noun, formatCurrency }: { roomType: GuestRoomType; noun: string; formatCurrency: (value?: number) => string }) {
  const { prompt } = useAppConfirm();
  const [bookings, setBookings] = useState<RoomStayBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await getRoomBookings({ scope: "open", roomType });
      setBookings(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load guests."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomType]);

  const [extending, setExtending] = useState<RoomStayBooking | null>(null);

  const changeStatus = async (booking: RoomStayBooking, status: RoomStayStatus) => {
    setBusyId(booking._id);
    try {
      const res = await updateRoomBookingStatus(booking._id, status);
      toast.success(res?.data?.message || `Marked ${status}.`);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update this booking."));
    } finally {
      setBusyId(null);
    }
  };

  const cancelBooking = async (booking: RoomStayBooking) => {
    const result = await prompt({
      title: "Cancel booking",
      message: `Cancel booking #${booking.bookingNumber} for ${booking.guestName}?`,
      fields: [{ name: "reason", label: "Reason", placeholder: "e.g. Guest cancelled" }],
      confirmLabel: "Cancel booking",
    });
    if (!result) return;
    setBusyId(booking._id);
    try {
      await updateRoomBookingStatus(booking._id, "Cancelled", result.reason);
      toast.success("Booking cancelled.");
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to cancel this booking."));
    } finally {
      setBusyId(null);
    }
  };

  const checkedIn = bookings.filter((booking) => booking.status === "Checked-in").length;
  const upcoming = bookings.filter((booking) => booking.status === "Booked").length;
  const totalValue = bookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0);

  return (
    <>
      <SummaryCards
        cards={[
          { key: "total", icon: Users, label: "Current Guests", value: String(bookings.length), cardClass: baseCardClass, iconClass: "bg-blue-50 text-blue-600" },
          { key: "checkedin", icon: LogIn, label: "Checked-in", value: String(checkedIn), cardClass: `${baseCardClass} border-l-4 border-l-emerald-500`, iconClass: "bg-emerald-50 text-emerald-600" },
          { key: "upcoming", icon: Calendar, label: "Upcoming", value: String(upcoming), cardClass: `${baseCardClass} border-l-4 border-l-sky-500`, iconClass: "bg-sky-50 text-sky-600" },
          { key: "value", icon: TrendingUp, label: "Total Value", value: formatCurrency(totalValue), cardClass: `${baseCardClass} border-l-4 border-l-indigo-500`, iconClass: "bg-indigo-50 text-indigo-600" },
        ]}
      />
      <div className="flex min-h-110 flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-[900px] w-full text-left">
          <thead className="sticky top-0 z-10 text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
            <tr>
              <th className={TH}>Booking</th>
              <th className={TH}>Guest</th>
              <th className={TH}>{noun}</th>
              <th className={TH}>Dates</th>
              <th className={TH}>Checked-in At</th>
              <th className={`${TH} text-right`}>Total</th>
              <th className={`${TH} text-center`}>Status</th>
              <th className={`${TH} text-center`}>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <EmptyRow colSpan={8} message="Loading..." />
            ) : bookings.length === 0 ? (
              <EmptyRow colSpan={8} message="No current guests." />
            ) : (
              bookings.map((booking) => (
                <tr key={booking._id} className="transition-all hover:bg-blue-50/30">
                  <td className={TD}>#{booking.bookingNumber}</td>
                  <td className={TD}>
                    {booking.guestName}
                    {booking.guestPhone && <span className="flex items-center gap-1 text-[10px] font-pmedium text-slate-400"><Phone size={10} /> {booking.guestPhone}</span>}
                  </td>
                  <td className={`${TD} text-slate-600`}>#{booking.bedNumber ? `Bed ${booking.bedNumber}` : "—"}</td>
                  <td className={`${TD} text-slate-500`}>{booking.checkIn.slice(0, 10)} → {booking.checkOut.slice(0, 10)} ({booking.nights}n)</td>
                  <td className={`${TD} text-slate-500`}>{formatDateTime(booking.actualCheckInAt)}</td>
                  <td className={`${TD} text-right`}>{formatCurrency(booking.total)}</td>
                  <td className="px-3.5 py-2 text-center"><span className={pill(STATUS_TONE[booking.status])}>{booking.status}</span></td>
                  <td className="px-3.5 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {booking.status === "Booked" && (
                        <button type="button" onClick={() => changeStatus(booking, "Checked-in")} disabled={busyId === booking._id} className={SECONDARY_BUTTON} title="Check in">
                          <LogIn size={13} />
                        </button>
                      )}
                      {booking.status === "Checked-in" && (
                        <button type="button" onClick={() => changeStatus(booking, "Checked-out")} disabled={busyId === booking._id} className={SECONDARY_BUTTON} title="Check out">
                          <LogOut size={13} />
                        </button>
                      )}
                      {booking.status === "Checked-in" && (
                        <button type="button" onClick={() => setExtending(booking)} disabled={busyId === booking._id} className={SECONDARY_BUTTON} title="Extend stay">
                          <PlusCircle size={13} />
                        </button>
                      )}
                      {booking.status === "Booked" && (
                        <button type="button" onClick={() => cancelBooking(booking)} disabled={busyId === booking._id} className="rounded-2xl px-3 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-rose-600 hover:bg-rose-50">
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>

      {extending && (
        <ExtendStayDialog
          booking={extending}
          formatCurrency={formatCurrency}
          onClose={() => setExtending(null)}
          onExtended={async () => {
            setExtending(null);
            await load();
          }}
        />
      )}
    </>
  );
}

function ExtendStayDialog({
  booking,
  formatCurrency,
  onClose,
  onExtended,
}: {
  booking: RoomStayBooking;
  formatCurrency: (value?: number) => string;
  onClose: () => void;
  onExtended: () => Promise<void>;
}) {
  const [checkOut, setCheckOut] = useState(todayInput());
  const [busy, setBusy] = useState(false);

  const handleExtend = async () => {
    setBusy(true);
    try {
      await extendRoomBooking(booking._id, checkOut);
      toast.success("Stay extended successfully.");
      await onExtended();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to extend this stay."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-w-md sm:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-[13px] font-pmedium uppercase tracking-widest text-slate-900">Extend Stay — #{booking.bookingNumber}</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-4 p-6">
          <div className="rounded-xl bg-slate-50 p-3 text-[12px] font-pmedium text-slate-600">
            Current check-out: {booking.checkOut.slice(0, 10)} · {formatCurrency(booking.ratePerNight)} / night
          </div>
          <div>
            <label className={LABEL}>New check-out date</label>
            <input type="date" className={FIELD} value={checkOut} min={booking.checkOut.slice(0, 10)} onChange={(event) => setCheckOut(event.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>Cancel</button>
          <button type="button" onClick={handleExtend} disabled={busy} className={PRIMARY_BUTTON}>Extend Stay</button>
        </div>
      </div>
    </div>
  );
}

function HistoryTab({ roomType, noun, formatCurrency }: { roomType: GuestRoomType; noun: string; formatCurrency: (value?: number) => string }) {
  const [bookings, setBookings] = useState<RoomStayBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getRoomBookings({
      scope: "history",
      roomType,
      from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
    })
      .then((res) => {
        if (!cancelled) setBookings(Array.isArray(res?.data?.data) ? res.data.data : []);
      })
      .catch((error) => {
        if (!cancelled) toast.error(getErrorMessage(error, "Unable to load history."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roomType, from, to]);

  const filtered = bookings.filter((booking) => {
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    return String(booking.bookingNumber).includes(needle) || booking.guestName.toLowerCase().includes(needle);
  });

  const checkedOut = bookings.filter((booking) => booking.status === "Checked-out").length;
  const cancelled = bookings.filter((booking) => booking.status === "Cancelled").length;
  const revenue = bookings
    .filter((booking) => booking.status === "Checked-out")
    .reduce((sum, booking) => sum + Number(booking.total || 0), 0);

  return (
    <>
      <SummaryCards
        cards={[
          { key: "total", icon: Bed, label: "Total Bookings", value: String(bookings.length), cardClass: baseCardClass, iconClass: "bg-blue-50 text-blue-600" },
          { key: "checkedout", icon: LogOut, label: "Checked-out", value: String(checkedOut), cardClass: `${baseCardClass} border-l-4 border-l-slate-400`, iconClass: "bg-slate-100 text-slate-600" },
          { key: "cancelled", icon: XCircle, label: "Cancelled", value: String(cancelled), cardClass: `${baseCardClass} border-l-4 border-l-rose-500`, iconClass: "bg-rose-50 text-rose-600" },
          { key: "revenue", icon: TrendingUp, label: "Revenue", value: formatCurrency(revenue), cardClass: `${baseCardClass} border-l-4 border-l-indigo-500`, iconClass: "bg-indigo-50 text-indigo-600" },
        ]}
      />
    <div className="flex min-h-110 flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
      <div className={TOOLBAR}>
        <div className="relative w-full xl:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input className={SEARCH_INPUT} placeholder="Search booking # or guest..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <input type="date" className={`${FIELD} w-auto`} value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" />
          <input type="date" className={`${FIELD} w-auto`} value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-[900px] w-full text-left">
          <thead className="sticky top-0 z-10 text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
            <tr>
              <th className={TH}>Booking</th>
              <th className={TH}>Guest</th>
              <th className={TH}>{noun}</th>
              <th className={TH}>Dates</th>
              <th className={TH}>Actual Check-in / Out</th>
              <th className={`${TH} text-right`}>Total</th>
              <th className={`${TH} text-center`}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <EmptyRow colSpan={7} message="Loading..." />
            ) : filtered.length === 0 ? (
              <EmptyRow colSpan={7} message="No bookings match these filters." />
            ) : (
              filtered.map((booking) => (
                <tr key={booking._id} className="transition-all hover:bg-blue-50/30">
                  <td className={TD}>#{booking.bookingNumber}</td>
                  <td className={TD}>{booking.guestName}</td>
                  <td className={`${TD} text-slate-600`}>{booking.bedNumber ? `Bed ${booking.bedNumber}` : "—"}</td>
                  <td className={`${TD} text-slate-500`}>{booking.checkIn.slice(0, 10)} → {booking.checkOut.slice(0, 10)}</td>
                  <td className={`${TD} text-slate-500`}>
                    {formatDateTime(booking.actualCheckInAt)} → {formatDateTime(booking.actualCheckOutAt)}
                    {booking.lateFeeAmount > 0 && <span className="block text-[10px] text-amber-600">Late fee: {formatCurrency(booking.lateFeeAmount)}</span>}
                  </td>
                  <td className={`${TD} text-right`}>{formatCurrency(booking.total)}</td>
                  <td className="px-3.5 py-2 text-center">
                    <span className={pill(STATUS_TONE[booking.status])} title={booking.status === "Cancelled" && booking.cancelReason ? `Reason: ${booking.cancelReason}` : undefined}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}
