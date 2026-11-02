import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CalendarCheck, CalendarClock, Loader2, LogIn, Plus, Users, X, XCircle } from "lucide-react";
import { useAppConfirm } from "../../../components/app/AppConfirmProvider";
import {
  createCafeReservation,
  getCafeReservations,
  seatCafeReservation,
  updateCafeReservationStatus,
  type CafeReservation,
  type CafeReservationStatus,
  type CafeTable,
} from "../../../services/cafe";

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

const STATUS_TONE: Record<CafeReservationStatus, "blue" | "emerald" | "amber" | "red"> = {
  Confirmed: "blue",
  Seated: "emerald",
  "No-show": "amber",
  Cancelled: "red",
};
const TONE_CLASS: Record<string, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-red-700",
};
const pill = (tone: string) =>
  `inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-pmedium uppercase tracking-widest ${TONE_CLASS[tone]}`;

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

const todayInput = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const emptyRow = (colSpan: number, message: string) => (
  <tr>
    <td colSpan={colSpan} className="bg-slate-50/50 py-20 text-center text-slate-400">
      <p className="text-sm font-pmedium">{message}</p>
    </td>
  </tr>
);

export default function ReservationsPanel({
  tables,
  allowCreate,
  onChanged,
  onTakeOrder,
}: {
  tables: CafeTable[];
  allowCreate: boolean;
  // Called after any reservation is created or its status changes, so a parent
  // page holding its own copy of today's reservations (e.g. Cafe Orders' Live
  // Tables lock map) can refresh in step instead of going stale until reload.
  onChanged?: () => void;
  // When provided (Cafe Orders only — Cafe Management has no order-taking UI),
  // the row action becomes "Take Order": this panel marks the reservation
  // Seated and assigns the table itself, then hands off to the parent to open
  // its order dialog pre-filled with the guest's name. Omit it to fall back to
  // a plain "Seat" action that only marks the reservation seated.
  onTakeOrder?: (reservation: CafeReservation, tableId: string) => void;
}) {
  const { prompt } = useAppConfirm();
  const [date, setDate] = useState(todayInput());
  const [reservations, setReservations] = useState<CafeReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [seatPicker, setSeatPicker] = useState<CafeReservation | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await getCafeReservations(date);
      setReservations(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load reservations."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const tableName = (id: string | null) => tables.find((table) => table._id === id)?.name || "Any table";

  const confirmedCount = reservations.filter((r) => r.status === "Confirmed").length;
  const seatedCount = reservations.filter((r) => r.status === "Seated").length;
  const closedCount = reservations.filter((r) => r.status === "No-show" || r.status === "Cancelled").length;

  const seat = async (reservation: CafeReservation, tableId?: string) => {
    const finalTableId = reservation.tableId || tableId;
    setBusyId(reservation._id);
    try {
      await seatCafeReservation(reservation._id, finalTableId);
      if (!onTakeOrder) toast.success("Guest seated.");
      setSeatPicker(null);
      await load();
      onChanged?.();
      if (onTakeOrder && finalTableId) onTakeOrder(reservation, finalTableId);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to seat this reservation."));
    } finally {
      setBusyId(null);
    }
  };

  const handleSeatClick = (reservation: CafeReservation) => {
    if (!reservation.tableId) {
      setSeatPicker(reservation);
      return;
    }
    void seat(reservation);
  };

  const markNoShow = async (reservation: CafeReservation) => {
    setBusyId(reservation._id);
    try {
      await updateCafeReservationStatus(reservation._id, "No-show");
      toast.success("Marked no-show.");
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update this reservation."));
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (reservation: CafeReservation) => {
    const result = await prompt({
      title: "Cancel reservation",
      message: `Cancel ${reservation.guestName}'s reservation?`,
      fields: [{ name: "reason", label: "Reason", placeholder: "e.g. Guest called to cancel" }],
      confirmLabel: "Cancel reservation",
    });
    if (!result) return;
    setBusyId(reservation._id);
    try {
      await updateCafeReservationStatus(reservation._id, "Cancelled", result.reason);
      toast.success("Reservation cancelled.");
      await load();
      onChanged?.();
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
          { key: "total", label: "Reservations", value: String(reservations.length), icon: CalendarClock, cardClass: baseCardClass, iconClass: "bg-blue-50 text-blue-600" },
          { key: "confirmed", label: "Upcoming", value: String(confirmedCount), icon: CalendarCheck, cardClass: `${baseCardClass} border-l-4 border-l-blue-500`, iconClass: "bg-blue-50 text-blue-600" },
          { key: "seated", label: "Seated", value: String(seatedCount), icon: LogIn, cardClass: `${baseCardClass} border-l-4 border-l-emerald-500`, iconClass: "bg-emerald-50 text-emerald-600" },
          { key: "closed", label: "No-show / Cancelled", value: String(closedCount), icon: XCircle, cardClass: `${baseCardClass} border-l-4 border-l-red-500`, iconClass: "bg-red-50 text-red-600" },
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
          <input type="date" className={`${FIELD} w-auto`} value={date} onChange={(event) => setDate(event.target.value)} aria-label="Reservation date" />
          {allowCreate && (
            <button type="button" onClick={() => setShowCreate(true)} className={PRIMARY_BUTTON}>
              <Plus size={14} /> New Reservation
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-[900px] w-full text-left">
            <thead className="sticky top-0 z-10 text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
              <tr>
                <th className={TH}>Time</th>
                <th className={TH}>Guest</th>
                <th className={`${TH} text-center`}>Party</th>
                <th className={TH}>Table</th>
                <th className={`${TH} text-center`}>Status</th>
                <th className={`${TH} text-center`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                emptyRow(6, "Loading...")
              ) : reservations.length === 0 ? (
                emptyRow(6, "No reservations for this date.")
              ) : (
                reservations.map((reservation) => (
                  <tr key={reservation._id} className="transition-all hover:bg-blue-50/30">
                    <td className={TD}>{new Date(reservation.reservationAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className={TD}>
                      {reservation.guestName}
                      {reservation.guestPhone && <span className="block text-[10px] font-pmedium text-slate-400">{reservation.guestPhone}</span>}
                    </td>
                    <td className={`${TD} text-center`}><Users size={11} className="inline mr-1 text-slate-400" />{reservation.partySize}</td>
                    <td className={`${TD} text-slate-500`}>{tableName(reservation.tableId)}</td>
                    <td className="px-3.5 py-2 text-center">
                      <span className={pill(STATUS_TONE[reservation.status])} title={reservation.status === "Cancelled" && reservation.cancelReason ? `Reason: ${reservation.cancelReason}` : undefined}>
                        {reservation.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      {reservation.status === "Confirmed" && (
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => handleSeatClick(reservation)} disabled={busyId === reservation._id} className={onTakeOrder ? PRIMARY_BUTTON : SECONDARY_BUTTON} title={onTakeOrder ? "Seat and take their order" : "Seat guest"}>
                            <LogIn size={13} /> {onTakeOrder ? "Take Order" : ""}
                          </button>
                          <button type="button" onClick={() => markNoShow(reservation)} disabled={busyId === reservation._id} className="rounded-2xl px-3 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-amber-600 hover:bg-amber-50">
                            No-show
                          </button>
                          <button type="button" onClick={() => cancel(reservation)} disabled={busyId === reservation._id} className="rounded-2xl px-3 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-rose-600 hover:bg-rose-50">
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreateReservationDialog
          tables={tables}
          defaultDate={date}
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false);
            await load();
            onChanged?.();
          }}
        />
      )}

      {seatPicker && (
        <SeatTablePickerDialog
          reservation={seatPicker}
          tables={tables}
          busy={busyId === seatPicker._id}
          onClose={() => setSeatPicker(null)}
          onConfirm={(tableId) => seat(seatPicker, tableId)}
        />
      )}
    </>
  );
}

function CreateReservationDialog({
  tables,
  defaultDate,
  onClose,
  onCreated,
}: {
  tables: CafeTable[];
  defaultDate: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("19:00");
  const [tableId, setTableId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!guestName.trim()) return toast.error("Guest name is required.");
    const numericPartySize = Number(partySize);
    if (!Number.isInteger(numericPartySize) || numericPartySize < 1) return toast.error("Enter a valid party size.");

    setBusy(true);
    try {
      await createCafeReservation({
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        partySize: numericPartySize,
        date,
        time,
        tableId: tableId || undefined,
        notes: notes.trim(),
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
      <div className="flex w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-w-lg sm:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-[13px] font-pmedium uppercase tracking-widest text-slate-900">New Reservation</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
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
              <label className={LABEL}>Party size</label>
              <input type="number" min={1} className={FIELD} value={partySize} onChange={(event) => setPartySize(event.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Table (optional)</label>
              <select className={FIELD} value={tableId} onChange={(event) => setTableId(event.target.value)}>
                <option value="">Any table</option>
                {tables.filter((table) => table.isActive).map((table) => (
                  <option key={table._id} value={table._id}>{table.name} ({table.seats} seats)</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Date</label>
              <input type="date" className={FIELD} value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Time</label>
              <input type="time" className={FIELD} value={time} onChange={(event) => setTime(event.target.value)} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Notes (optional)</label>
            <textarea className={FIELD} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>Cancel</button>
            <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>{busy ? <Loader2 size={13} className="animate-spin" /> : "Create Reservation"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SeatTablePickerDialog({
  reservation,
  tables,
  busy,
  onClose,
  onConfirm,
}: {
  reservation: CafeReservation;
  tables: CafeTable[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (tableId: string) => void;
}) {
  const [tableId, setTableId] = useState("");
  const eligible = tables.filter((table) => table.isActive && table.seats >= reservation.partySize);

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-w-sm sm:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-[13px] font-pmedium uppercase tracking-widest text-slate-900">Seat {reservation.guestName}</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-4 p-6">
          <div>
            <label className={LABEL}>Choose a table ({reservation.partySize} guests)</label>
            <select className={FIELD} value={tableId} onChange={(event) => setTableId(event.target.value)}>
              <option value="">Select table</option>
              {eligible.map((table) => (
                <option key={table._id} value={table._id}>{table.name} ({table.seats} seats)</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>Cancel</button>
          <button type="button" disabled={!tableId || busy} onClick={() => onConfirm(tableId)} className={PRIMARY_BUTTON}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : "Seat Guest"}
          </button>
        </div>
      </div>
    </div>
  );
}
