import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bed,
  Calendar,
  CheckCircle2,
  Clock,
  FileDown,
  Loader2,
  Percent,
  Receipt,
  Save,
  Search,
  Settings2,
  Tag,
  TrendingUp,
  XCircle,
} from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import useWorkspacePreferences from "../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../lib/workspaceLocalization";
import { formatTime12h } from "../../utils/time";
import TimePicker12h from "../../components/ui/TimePicker12h";
import RoomReservationsPanel from "../RoomStays/RoomReservationsPanel";
import {
  getRoomBookings,
  getRoomStayAnalytics,
  getRoomStayCheckTimes,
  updateRoomStayCheckTimes,
  type GuestRoomType,
  type RoomStayBooking,
  type RoomStayStatus,
} from "../../services/roomStays";

type Tab = "reservations" | "history" | "reports" | "settings";

const baseCardClass =
  "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md";
const FIELD =
  "w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-500";
const LABEL = "text-[10px] font-pmedium text-slate-500 uppercase tracking-widest";
const SEARCH_INPUT =
  "w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-500";
const ACTION_BUTTON_LABELLED =
  "bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-slate-50 active:scale-95 transition-all whitespace-nowrap";
const SAVE_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest text-white shadow-sm hover:bg-blue-700 disabled:opacity-50";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

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

const STATUS_TONE: Record<RoomStayStatus, "blue" | "emerald" | "slate" | "red"> = {
  Booked: "blue",
  "Checked-in": "emerald",
  "Checked-out": "slate",
  Cancelled: "red",
};

const emptyRow = (colSpan: number, message: string) => (
  <tr>
    <td colSpan={colSpan} className="bg-slate-50/50 py-20 text-center text-slate-400">
      <p className="text-sm font-pmedium">{message}</p>
    </td>
  </tr>
);

export default function RoomManagementPage({ roomType, title, noun }: { roomType: GuestRoomType; title: string; noun: string }) {
  const workspacePreferences = useWorkspacePreferences();
  const formatCurrency = (value = 0) =>
    formatWorkspaceCurrency(Number(value || 0), workspacePreferences.currency, { maximumFractionDigits: 2 });

  const [tab, setTab] = useState<Tab>("reservations");

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">{title}</h2>
            <p className="text-xs font-pmedium text-slate-500 mt-1">Manage {noun.toLowerCase()} inventory, booking history, reports, and controls.</p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
          {(
            [
              { key: "reservations", label: "Reservations" },
              { key: "history", label: "Booking History" },
              { key: "reports", label: "Reports" },
              { key: "settings", label: "Settings" },
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

        {tab === "reservations" && <RoomReservationsPanel roomType={roomType} noun={noun} formatCurrency={formatCurrency} />}
        {tab === "history" && <BookingHistoryPanel roomType={roomType} noun={noun} formatCurrency={formatCurrency} />}
        {tab === "reports" && <ReportsPanel roomType={roomType} formatCurrency={formatCurrency} />}
        {tab === "settings" && <SettingsPanel />}
      </PageFrame>
    </div>
  );
}

function BookingHistoryPanel({ roomType, noun, formatCurrency }: { roomType: GuestRoomType; noun: string; formatCurrency: (value?: number) => string }) {
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
        if (!cancelled) toast.error(getErrorMessage(error, "Unable to load booking history."));
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
      <div className="mb-3 mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { key: "total", label: "Total Bookings", value: String(bookings.length), icon: Bed, cardClass: baseCardClass, iconClass: "bg-blue-50 text-blue-600" },
          { key: "checkedout", label: "Checked-out", value: String(checkedOut), icon: CheckCircle2, cardClass: `${baseCardClass} border-l-4 border-l-slate-400`, iconClass: "bg-slate-100 text-slate-600" },
          { key: "cancelled", label: "Cancelled", value: String(cancelled), icon: XCircle, cardClass: `${baseCardClass} border-l-4 border-l-red-500`, iconClass: "bg-red-50 text-red-600" },
          { key: "revenue", label: "Revenue", value: formatCurrency(revenue), icon: TrendingUp, cardClass: `${baseCardClass} border-l-4 border-l-indigo-500`, iconClass: "bg-indigo-50 text-indigo-600" },
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
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-3 sm:p-4 lg:p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input className={`${FIELD} pl-9`} placeholder="Search booking # or guest..." value={query} onChange={(event) => setQuery(event.target.value)} />
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
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">{noun}</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? emptyRow(6, "Loading...")
                : filtered.length === 0
                  ? emptyRow(6, "No bookings match these filters.")
                  : filtered.map((booking) => (
                      <tr key={booking._id} className="transition-all hover:bg-blue-50/30">
                        <td className="px-4 py-3 text-[12px] font-pmedium text-slate-900">#{booking.bookingNumber}</td>
                        <td className="px-4 py-3 text-[12px] font-pmedium text-slate-900">{booking.guestName}</td>
                        <td className="px-4 py-3 text-[12px] font-pmedium text-slate-600">{booking.bedNumber ? `Bed ${booking.bedNumber}` : "—"}</td>
                        <td className="px-4 py-3 text-[12px] font-pmedium text-slate-500">{booking.checkIn.slice(0, 10)} → {booking.checkOut.slice(0, 10)}</td>
                        <td className="px-4 py-3 text-right text-[12px] font-pmedium text-slate-900">{formatCurrency(booking.total)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={pillClass(STATUS_TONE[booking.status])} title={booking.status === "Cancelled" && booking.cancelReason ? `Reason: ${booking.cancelReason}` : undefined}>
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ReportsPanel({ roomType, formatCurrency }: { roomType: GuestRoomType; formatCurrency: (value?: number) => string }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    getRoomStayAnalytics(roomType, days)
      .then((response) => setData(response?.data?.data))
      .catch((error) => toast.error(getErrorMessage(error, "Unable to load reports.")));
  }, [roomType, days]);

  const download = () => {
    if (!data) return;
    const rows = [["Date", "Checked-out bookings", "Revenue"], ...data.daily.map((row: any) => [row.date, row.bookings, row.revenue])];
    const blob = new Blob([rows.map((row: any[]) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${roomType.toLowerCase()}-report-${days}-days.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!data) return <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading reports...</div>;

  const cards = [
    { key: "revenue", label: "Revenue", value: formatCurrency(data.summary.revenue), icon: Receipt, cardClass: baseCardClass, iconClass: "bg-blue-50 text-blue-600" },
    { key: "bookings", label: "Checked-out", value: data.summary.bookings, icon: CheckCircle2, cardClass: `${baseCardClass} border-l-4 border-l-emerald-500`, iconClass: "bg-emerald-50 text-emerald-600" },
    { key: "occupancy", label: "Occupancy Rate", value: `${data.summary.occupancyRate}%`, icon: Percent, cardClass: `${baseCardClass} border-l-4 border-l-indigo-500`, iconClass: "bg-indigo-50 text-indigo-600" },
    { key: "avgnights", label: "Avg Nights / Stay", value: data.summary.avgNights, icon: Tag, cardClass: `${baseCardClass} border-l-4 border-l-amber-500`, iconClass: "bg-amber-50 text-amber-600" },
  ];

  return (
    <>
      <div className="mb-3 mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((card) => {
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
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-3 sm:p-4 lg:p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-1.5">
            {[7, 30, 90].map((value) => (
              <button key={value} type="button" onClick={() => setDays(value)} className={`rounded-lg px-3 py-1.5 text-[11px] font-pmedium ${days === value ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-500"}`}>
                {value} days
              </button>
            ))}
          </div>
          <button type="button" onClick={download} className={ACTION_BUTTON_LABELLED}>
            <FileDown size={14} /> Download CSV
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
              <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-center">Checked-out</th><th className="px-4 py-3 text-right">Revenue</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.daily.length === 0
                ? emptyRow(3, "No checked-out stays in this period.")
                : [...data.daily].reverse().map((row: any) => (
                    <tr key={row.date} className="transition-all hover:bg-blue-50/30">
                      <td className="px-4 py-3 text-[12px] font-pmedium text-slate-900">{row.date}</td>
                      <td className="px-4 py-3 text-center text-[12px] font-pmedium text-slate-600">{row.bookings}</td>
                      <td className="px-4 py-3 text-right text-[12px] font-pmedium text-slate-900">{formatCurrency(row.revenue)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function SettingsPanel() {
  const [form, setForm] = useState({ checkInTime: "12:00", checkOutTime: "11:00" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getRoomStayCheckTimes()
      .then((res) => {
        if (res?.data?.data) setForm(res.data.data);
      })
      .catch(() => {
        // keep defaults
      });
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      await updateRoomStayCheckTimes(form);
      toast.success("Check-in/check-out time updated.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save check-in/check-out time."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 p-5">
        <div className="rounded-2xl bg-blue-50 p-2 text-blue-600"><Settings2 size={18} /></div>
        <div>
          <h3 className="font-pmedium text-slate-900">Standard check-in / check-out time</h3>
          <p className="text-[11px] text-slate-500">Every booking uses these fixed times — guests pick dates only, and the time of day stays the same across all bookings.</p>
        </div>
      </div>
      <div className="grid gap-5 p-6 md:grid-cols-2 max-w-xl">
        <div className="space-y-1">
          <label className={LABEL}><Clock size={10} className="mr-1 inline" />Check-in time ({formatTime12h(form.checkInTime)})</label>
          <TimePicker12h value={form.checkInTime} onChange={(value) => setForm((prev) => ({ ...prev, checkInTime: value }))} />
        </div>
        <div className="space-y-1">
          <label className={LABEL}><Clock size={10} className="mr-1 inline" />Check-out time ({formatTime12h(form.checkOutTime)})</label>
          <TimePicker12h value={form.checkOutTime} onChange={(value) => setForm((prev) => ({ ...prev, checkOutTime: value }))} />
        </div>
      </div>
      <div className="flex justify-end border-t border-slate-100 p-5">
        <button type="button" onClick={save} disabled={busy} className={SAVE_BUTTON}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save settings
        </button>
      </div>
    </div>
  );
}
