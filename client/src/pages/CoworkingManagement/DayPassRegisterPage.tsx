import { useEffect, useMemo, useState, type ElementType } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BadgeCheck,
  Loader2,
  Printer,
  Search,
  Ticket,
  UserCheck,
  Users,
} from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import {
  getDayPassAvailability,
  getDayPassBookings,
  updateDayPassStatus,
  type DayPassAvailability,
  type DayPassRecord,
} from "../../services/day-passes";
import DayPassBookingModal, { printDayPassBadge } from "../../components/DayPassBookingModal";
import useAuth from "../../hooks/useAuth";
import { toast } from "sonner";

const STATUS_TABS = ["All", "Booked", "Checked-in", "Completed", "Cancelled"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const DATE_PILLS = ["Today", "Upcoming", "All"] as const;
type DatePill = (typeof DATE_PILLS)[number];

const dateKey = (value?: string | Date) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const dateLabel = (value?: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const readableLabel = (value?: string) =>
  String(value || "Not recorded")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const statusPillClass = (value?: string) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "checked-in")
    return "rounded-md bg-blue-50 px-2 py-1 text-[9px] font-pmedium text-blue-700";
  if (normalized === "booked")
    return "rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-pmedium text-emerald-700";
  if (normalized === "completed")
    return "rounded-md bg-slate-100 px-2 py-1 text-[9px] font-pmedium text-slate-600";
  if (normalized === "cancelled")
    return "rounded-md bg-rose-50 px-2 py-1 text-[9px] font-pmedium text-rose-700";
  return "rounded-md bg-slate-100 px-2 py-1 text-[9px] font-pmedium text-slate-600";
};

const paymentPillClass = (value?: string) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "paid")
    return "rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-pmedium text-emerald-700";
  if (normalized === "failed")
    return "rounded-md bg-rose-50 px-2 py-1 text-[9px] font-pmedium text-rose-700";
  return "rounded-md bg-amber-50 px-2 py-1 text-[9px] font-pmedium text-amber-700";
};

// Same summary-card markup as the Resource & Pricing subpage (Resource&Pricing.tsx).
const baseCardClass = "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md";

function StatCard({
  icon: Icon,
  label,
  value,
  status = "default",
}: {
  icon: ElementType<{ size?: number }>;
  label: string;
  value: number | string;
  status?: "default" | "success" | "attention" | "danger";
}) {
  const borderClass = {
    default: "",
    success: "border-l-4 border-l-emerald-500",
    attention: "border-l-4 border-l-amber-500",
    danger: "border-l-4 border-l-red-500",
  }[status];
  const iconClass = {
    default: "bg-blue-50 text-blue-600",
    success: "bg-emerald-50 text-emerald-600",
    attention: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
  }[status];
  const labelToneClass = status === "default" ? "text-slate-400" : iconClass.split(" ")[1];
  return (
    <div className={`${baseCardClass} ${borderClass}`}>
      <div className="min-w-0">
        <p className={`text-[10px] font-pmedium ${labelToneClass} uppercase tracking-widest mb-1`}>{label}</p>
        <p className="text-[15px] font-pmedium text-slate-900">{value}</p>
      </div>
      <div className={`p-2 rounded-2xl ${iconClass} shrink-0`}>
        <Icon size={16} />
      </div>
    </div>
  );
}

export default function DayPassRegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();
  const workspaceId = String(
    auth?.user?.workspaceMembership?.workspaceId ||
      auth?.user?.workspaceMembership?.workspace ||
      auth?.user?.primaryWorkspace ||
      auth?.user?.workspaceId ||
      "",
  ).trim();

  const [selectedDate, setSelectedDate] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("date") ?? dateKey();
  });
  const [availability, setAvailability] = useState<DayPassAvailability | null>(null);
  const [rows, setRows] = useState<DayPassRecord[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [search, setSearch] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("search") || "";
  });
  const [statusTab, setStatusTab] = useState<StatusTab>("All");
  const [datePill, setDatePill] = useState<DatePill>("Today");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionId, setActionId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Read URL search params (e.g. from CompanyLeads "View in Coworking Register")
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dateParam = params.get("date");
    const searchParam = params.get("search");
    if (dateParam !== null) setSelectedDate(dateParam);
    if (searchParam !== null) setSearch(searchParam);
    if (params.get("action") === "day-pass") {
      setModalOpen(true);
      navigate(location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    getDayPassAvailability({ workspaceId: workspaceId || undefined, date: selectedDate || dateKey() })
      .then((result) => setAvailability(result || null))
      .catch(() => setAvailability(null));
  }, [workspaceId, selectedDate, refreshKey]);

  // The register's own feed — never date-scoped, so a future online booking
  // stays visible instead of hiding until its date arrives. The date picker
  // above only drives the availability tiles; Today/Upcoming/All here is a
  // client-side filter over this same list.
  useEffect(() => {
    setRowsLoading(true);
    getDayPassBookings({ workspaceId: workspaceId || undefined })
      .then((result: any) => {
        const list = Array.isArray(result?.bookings) ? result.bookings : [];
        setRows(list);
      })
      .catch(() => setRows([]))
      .finally(() => setRowsLoading(false));
  }, [workspaceId, refreshKey]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const today = dateKey();
    return rows.filter((row) => {
      const rowDateKey = dateKey(row.date);
      if (datePill === "Today" && rowDateKey !== today) return false;
      if (datePill === "Upcoming" && rowDateKey < today) return false;
      if (statusTab !== "All" && String(row.status || "") !== statusTab) return false;
      if (!query) return true;
      return [row.guestName, row.guestPhone, row.guestEmail, row.company, row.bookingCode]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [rows, search, statusTab, datePill]);

  // Guests already paid/booked for today or any future date — independent of
  // the availability date picker, so a payment for e.g. Nov 17 still shows up
  // here while the tiles above are checking a different date (today).
  const upcomingPasses = useMemo(() => {
    const today = dateKey();
    return rows.reduce((sum, row) => {
      if (String(row.status) === "Cancelled") return sum;
      if (dateKey(row.date) < today) return sum;
      return sum + (Number(row.attendees) || 1);
    }, 0);
  }, [rows]);

  const handleLifecycle = async (row: DayPassRecord, status: "Checked-in" | "Completed") => {
    const bookingId = row._id;
    if (!bookingId || actionId) return;
    setActionId(bookingId);
    try {
      await updateDayPassStatus(bookingId, status);
      toast.success(`Day pass ${row.bookingCode || ""} ${status === "Checked-in" ? "checked in" : "completed"}.`);
      setRefreshKey((value) => value + 1);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Could not update this day pass.");
    } finally {
      setActionId("");
    }
  };

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Day Pass &amp; Daily Flexi Register
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Live open desk floor availability, daily flexi bookings, walk-in passes, and guest badges.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-2 text-[11px] font-pmedium text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
            >
              <Ticket size={13} /> + Issue Day Pass
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard
              icon={Ticket}
              label="Total Open Desks"
              value={availability?.totalCapacity ?? "—"}
            />
            <StatCard
              icon={Users}
              label="Leased by Tenants"
              value={availability?.tenantAssignedDesks ?? "—"}
            />
            <StatCard
              icon={BadgeCheck}
              label={`Booked for ${dateLabel(selectedDate)}`}
              value={availability?.bookedPassesCount ?? "—"}
            />
            <StatCard
              icon={Users}
              label="Upcoming Day Passes"
              value={upcomingPasses}
              status={upcomingPasses > 0 ? "attention" : "default"}
            />
            <StatCard
              icon={Ticket}
              label={
                availability?.isSoldOut
                  ? "Sold Out"
                  : availability?.isLimited
                    ? "Limited Availability"
                    : `Available for ${dateLabel(selectedDate)}`
              }
              value={availability?.availableCount ?? "—"}
              status={
                availability?.isSoldOut
                  ? "danger"
                  : availability?.isLimited
                    ? "attention"
                    : "success"
              }
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Check stock for</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value || dateKey())}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-pmedium text-slate-700 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </div>
              <div className="flex gap-1">
                {DATE_PILLS.map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => setDatePill(pill)}
                    className={`rounded-lg px-3 py-2 text-[10px] font-pmedium uppercase tracking-wider transition ${
                      datePill === pill
                        ? "bg-[#2563EB] text-white shadow-sm"
                        : "bg-white text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {pill}
                  </button>
                ))}
              </div>
              <div className="relative min-w-[180px] flex-1">
                <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search guest, phone, email, company, or DP- code…"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-[11px] font-pmedium text-slate-700 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </div>
              <div className="flex gap-1">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusTab(tab)}
                    className={`rounded-lg px-3 py-2 text-[10px] font-pmedium uppercase tracking-wider transition ${
                      statusTab === tab
                        ? "bg-[#2563EB] text-white shadow-sm"
                        : "bg-white text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {rowsLoading ? (
              <div className="flex h-[200px] items-center justify-center gap-2 text-[11px] font-pmedium text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Loading day passes…
              </div>
            ) : filteredRows.length ? (
              <div className="max-h-[560px] overflow-auto">
                <table className="w-full min-w-[980px] border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Pass Code</th>
                      <th className="px-4 py-3">Guest Details</th>
                      <th className="px-4 py-3">Pass Type & Date</th>
                      <th className="px-4 py-3 text-right">Attendees / Desks</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-5 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row, index) => {
                      const statusLabel = String(row.status || "");
                      const isCheckedIn = statusLabel === "Checked-in";
                      const guestCompany = row.company || "Individual";
                      return (
                        <tr
                          key={row._id || `${row.bookingCode || "pass"}-${index}`}
                          className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                        >
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1.5 text-[#1E3D73]">
                              <BadgeCheck size={13} className="text-blue-600" />
                              {row.bookingCode || "DP-----"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-[12px] text-slate-900">{row.guestName || "Day Pass Guest"}</p>
                            <p className="mt-0.5 text-[9px] text-slate-400">
                              {[row.guestPhone, row.guestEmail, guestCompany].filter(Boolean).join(" · ") || "No contact recorded"}
                            </p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {row.passType || "Full-Day"} ·{" "}
                            <span className="text-slate-500">{dateLabel(row.date)}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900">
                            {Number(row.attendees) || 1}
                          </td>
                          <td className="px-4 py-3">
                            <span className={paymentPillClass(row.paymentStatus)}>
                              {row.paymentStatus || "Pending"}
                            </span>
                            <p className="mt-1 text-[9px] text-slate-400">
                              {[row.paymentMode || "Walk-in", row.totalAmount ? `₹${row.totalAmount}` : ""]
                                .filter(Boolean)
                                .join(" · ") || "Amount not recorded"}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={statusPillClass(row.status)}>{readableLabel(row.status)}</span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => printDayPassBadge(row)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-pmedium uppercase tracking-wider text-slate-600 transition hover:bg-slate-50"
                              >
                                <Printer size={11} /> Print Badge
                              </button>
                              {statusLabel === "Booked" ? (
                                <button
                                  type="button"
                                  disabled={actionId === row._id}
                                  onClick={() => handleLifecycle(row, "Checked-in")}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[9px] font-pmedium uppercase tracking-wider text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  {actionId === row._id ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    <UserCheck size={11} />
                                  )}
                                  Check In
                                </button>
                              ) : null}
                              {isCheckedIn ? (
                                <button
                                  type="button"
                                  disabled={actionId === row._id}
                                  onClick={() => handleLifecycle(row, "Completed")}
                                  className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-2.5 py-1.5 text-[9px] font-pmedium uppercase tracking-wider text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                                >
                                  {actionId === row._id ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    <UserCheck size={11} />
                                  )}
                                  Complete / Check Out
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
                <p className="text-[11px] font-pmedium text-slate-500">
                  No {datePill === "All" ? "" : datePill.toLowerCase() + " "}day passes found{search ? " for this search" : ""}.
                </p>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-2 text-[11px] font-pmedium text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Ticket size={13} /> + Issue Day Pass
                </button>
              </div>
            )}
          </div>
        </div>

        <DayPassBookingModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          workspaceId={workspaceId}
          onSuccess={() => setRefreshKey((value) => value + 1)}
        />
      </PageFrame>
    </div>
  );
}
