import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Armchair,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  Printer,
  Receipt,
  Search,
  Tag,
  Users,
  X,
} from "lucide-react";
import PageFrame from "../../../components/Pages/PageFrame";
import { useAppConfirm } from "../../../components/app/AppConfirmProvider";
import useWorkspacePreferences from "../../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../../lib/workspaceLocalization";
import ReservationsPanel from "../CafeShared/ReservationsPanel";
import {
  billCafeOrder,
  CAFE_OPEN_STATUSES,
  createCafeOrder,
  getCafeAnalytics,
  getCafeMenuItems,
  getCafeOrders,
  getCafeReservations,
  getCafeSettings,
  getCafeTables,
  updateCafeOrderDetails,
  updateCafeOrderRoundItem,
  updateCafeOrderStatus,
  type CafeMenuItem,
  type CafeOrder,
  type CafeOrderLine,
  type CafeOrderStatus,
  type CafeReservation,
  type CafeSettings,
  type CafeTable,
} from "../../../services/cafe";

type Tab = "live" | "reservations" | "insights" | "history";

const todayInput = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const TONE: Record<CafeOrderStatus, "sky" | "amber" | "violet" | "emerald" | "slate" | "rose"> = {
  Placed: "sky",
  Preparing: "amber",
  Ready: "violet",
  Served: "emerald",
  Paid: "emerald",
  Cancelled: "rose",
};

const TONE_CLASS: Record<string, string> = {
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  slate: "border-slate-200 bg-slate-100 text-slate-600",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
};

const pill = (tone: string) =>
  `inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-pmedium uppercase tracking-widest ${TONE_CLASS[tone]}`;

const TONE_BORDER: Record<string, string> = {
  sky: "border-l-sky-500",
  amber: "border-l-amber-500",
  violet: "border-l-violet-500",
  emerald: "border-l-emerald-500",
  slate: "border-l-slate-400",
  rose: "border-l-rose-500",
};

const TONE_ICON: Record<string, string> = {
  sky: "bg-sky-50 text-sky-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  slate: "bg-slate-100 text-slate-500",
  rose: "bg-rose-50 text-rose-600",
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

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

const isOpenStatus = (status: CafeOrderStatus) => CAFE_OPEN_STATUSES.includes(status);

export default function CafeOrdersPage() {
  const workspacePreferences = useWorkspacePreferences();
  const formatCurrency = (value = 0) =>
    formatWorkspaceCurrency(Number(value || 0), workspacePreferences.currency, { maximumFractionDigits: 2 });

  const [tab, setTab] = useState<Tab>("live");
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [menuItems, setMenuItems] = useState<CafeMenuItem[]>([]);
  const [openOrders, setOpenOrders] = useState<CafeOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<CafeSettings>({ companyName: "", googleReviewUrl: "", showReviewQr: false, taxPercent: 0, cafeStartTime: "06:00" });
  const [dialog, setDialog] = useState<{ table: CafeTable; order: CafeOrder | null; readOnly: boolean; initialCustomerName?: string } | null>(null);
  const [reservations, setReservations] = useState<CafeReservation[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const loadLive = async () => {
    try {
      const [tablesRes, menuRes, openRes, settingsRes, reservationsRes] = await Promise.all([
        getCafeTables(),
        getCafeMenuItems(),
        getCafeOrders({ scope: "open" }),
        getCafeSettings(),
        getCafeReservations(todayInput()),
      ]);
      setTables(Array.isArray(tablesRes?.data?.data) ? tablesRes.data.data : []);
      setMenuItems(Array.isArray(menuRes?.data?.data) ? menuRes.data.data : []);
      const nextOpenOrders = Array.isArray(openRes?.data?.data) ? openRes.data.data : [];
      setOpenOrders(nextOpenOrders);
      setDialog((current) => {
        if (!current?.order) return current;
        const refreshed = nextOpenOrders.find((entry: CafeOrder) => entry._id === current.order?._id);
        return refreshed ? { ...current, order: refreshed } : null;
      });
      setSettings(settingsRes?.data?.data || settings);
      setReservations(Array.isArray(reservationsRes?.data?.data) ? reservationsRes.data.data : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load cafe data."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLive();
  }, []);

  // The Reservations tab keeps its own copy of today's reservations and calls
  // this after any create/seat/no-show/cancel, so the Live Tables lock map
  // (computed from this page's own `reservations` state) stays in sync
  // instead of going stale until a full reload.
  const refreshReservations = async () => {
    try {
      const res = await getCafeReservations(todayInput());
      setReservations(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch {
      // Live Tables just keeps showing the previous lock state until the next reload.
    }
  };

  // Ticks every 30s purely to re-evaluate which tables have crossed into their
  // reservation lock window — the reservation list itself doesn't change just
  // because time passes.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const openOrderByTable = useMemo(() => {
    const map = new Map<string, CafeOrder>();
    for (const order of openOrders) {
      if (order.tableId && isOpenStatus(order.status)) map.set(String(order.tableId), order);
    }
    return map;
  }, [openOrders]);

  const lockedReservationByTable = useMemo(() => {
    const map = new Map<string, CafeReservation>();
    for (const reservation of reservations) {
      if (reservation.status !== "Confirmed" || !reservation.tableId) continue;
      if (now >= new Date(reservation.lockStartsAt).getTime()) map.set(String(reservation.tableId), reservation);
    }
    return map;
  }, [reservations, now]);

  const openValue = openOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const occupiedCount = openOrderByTable.size;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">Cafe Orders</h2>
            <p className="text-xs font-pmedium text-slate-500 mt-1">Take orders by table, track what sells, and review settled bills.</p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
          {(
            [
              { key: "live", label: "Live Tables" },
              { key: "reservations", label: "Reservations" },
              { key: "insights", label: "Insights" },
              { key: "history", label: "Order History" },
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

        {tab === "live" && (
          <LiveTablesTab
            isLoading={isLoading}
            tables={tables}
            occupiedCount={occupiedCount}
            openValue={openValue}
            openOrderByTable={openOrderByTable}
            lockedReservationByTable={lockedReservationByTable}
            formatCurrency={formatCurrency}
            onSelect={(table) => setDialog({ table, order: openOrderByTable.get(table._id) || null, readOnly: false })}
          />
        )}
        {tab === "reservations" && (
          <ReservationsPanel
            tables={tables}
            allowCreate={false}
            onChanged={refreshReservations}
            onTakeOrder={(reservation, tableId) => {
              const table = tables.find((entry) => entry._id === tableId);
              if (!table) return toast.error("That table could not be found.");
              setDialog({ table, order: openOrderByTable.get(tableId) || null, readOnly: false, initialCustomerName: reservation.guestName });
              setTab("live");
            }}
          />
        )}
        {tab === "insights" && <InsightsTab formatCurrency={formatCurrency} />}
        {tab === "history" && (
          <OrderHistoryTab
            tables={tables}
            formatCurrency={formatCurrency}
            onView={(table, order) => setDialog({ table, order, readOnly: true })}
          />
        )}
      </PageFrame>

      {dialog && (
        <OrderDialog
          table={dialog.table}
          order={dialog.order}
          readOnly={dialog.readOnly}
          initialCustomerName={dialog.initialCustomerName}
          menuItems={menuItems}
          formatCurrency={formatCurrency}
          settings={settings}
          onClose={() => setDialog(null)}
          onChanged={loadLive}
        />
      )}
    </div>
  );
}

function SummaryCards({
  cards,
}: {
  cards: Array<{ key: string; icon: typeof Armchair; label: string; value: string; cardClass: string; iconClass: string }>;
}) {
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
            <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}>
              <Icon size={16} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusPills<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label?: (value: T) => string;
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          onClick={() => onChange(option)}
          className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${
            value === option
              ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
              : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
          }`}
        >
          {label ? label(option) : option}
        </button>
      ))}
    </div>
  );
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="bg-slate-50/50 py-20 text-center text-slate-400">
        <p className="text-sm font-pmedium">{message}</p>
      </td>
    </tr>
  );
}

function LiveTablesTab({
  isLoading,
  tables,
  occupiedCount,
  openValue,
  openOrderByTable,
  lockedReservationByTable,
  formatCurrency,
  onSelect,
}: {
  isLoading: boolean;
  tables: CafeTable[];
  occupiedCount: number;
  openValue: number;
  openOrderByTable: Map<string, CafeOrder>;
  lockedReservationByTable: Map<string, CafeReservation>;
  formatCurrency: (value?: number) => string;
  onSelect: (table: CafeTable) => void;
}) {
  const [status, setStatus] = useState<"All" | "Free" | "Occupied">("All");
  const [query, setQuery] = useState("");

  const filtered = tables.filter((table) => {
    if (query.trim() && !table.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    const occupied = openOrderByTable.has(table._id);
    if (status === "Free") return !occupied && table.isActive;
    if (status === "Occupied") return occupied;
    return true;
  });

  return (
    <>
      <SummaryCards
        cards={[
          { key: "tables", icon: Armchair, label: "Tables", value: String(tables.length), cardClass: baseCardClass, iconClass: "bg-blue-50 text-blue-600" },
          { key: "free", icon: CheckCircle2, label: "Free", value: String(tables.length - occupiedCount), cardClass: `${baseCardClass} border-l-4 border-l-emerald-500`, iconClass: "bg-emerald-50 text-emerald-600" },
          { key: "occupied", icon: Users, label: "Occupied", value: `${occupiedCount} / ${tables.length}`, cardClass: `${baseCardClass} border-l-4 border-l-amber-500`, iconClass: "bg-amber-50 text-amber-600" },
          { key: "value", icon: Receipt, label: "Open bill value", value: formatCurrency(openValue), cardClass: `${baseCardClass} border-l-4 border-l-indigo-500`, iconClass: "bg-indigo-50 text-indigo-600" },
        ]}
      />

      <div className="flex min-h-110 flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className={TOOLBAR}>
          <StatusPills options={["All", "Free", "Occupied"] as const} value={status} onChange={setStatus} />
          <div className="relative w-full xl:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input className={SEARCH_INPUT} placeholder="Search tables..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Loading tables...
            </div>
          ) : tables.length === 0 ? (
            <p className="p-10 text-center text-sm font-pmedium text-slate-400">No tables yet. Add tables in Cafe Management first.</p>
          ) : filtered.length === 0 ? (
            <p className="p-10 text-center text-sm font-pmedium text-slate-400">No tables match these filters.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((table) => {
                const order = openOrderByTable.get(table._id);
                const lockedReservation = !order ? lockedReservationByTable.get(table._id) : undefined;
                const tone = !table.isActive ? "slate" : order ? TONE[order.status] : "emerald";
                const borderClass = lockedReservation ? "border-l-orange-500" : TONE_BORDER[tone];
                const iconClass = lockedReservation ? "bg-orange-50 text-orange-600" : TONE_ICON[tone];
                return (
                  <button
                    key={table._id}
                    type="button"
                    disabled={!table.isActive || Boolean(lockedReservation)}
                    onClick={() => onSelect(table)}
                    title={lockedReservation ? `Reserved ${new Date(lockedReservation.reservationAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — ${lockedReservation.guestName}, party of ${lockedReservation.partySize}` : undefined}
                    className={`flex flex-col gap-3 rounded-[2rem] border border-slate-100 border-l-4 ${borderClass} bg-white p-5 text-left shadow-sm transition-all hover:shadow-md disabled:opacity-50`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-pmedium text-slate-900">{table.name}</p>
                        <p className="text-[11px] font-pmedium text-slate-500">{table.seats} seats</p>
                      </div>
                      <div className={`rounded-2xl p-2 shrink-0 ${iconClass}`}>
                        <Armchair size={16} />
                      </div>
                    </div>
                    <div>
                      {!table.isActive ? (
                        <span className={pill("slate")}>Inactive</span>
                      ) : lockedReservation ? (
                        <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[10px] font-pmedium uppercase tracking-widest text-orange-700">
                          Reserved {new Date(lockedReservation.reservationAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : order ? (
                        <span className={pill(TONE[order.status])}>{order.status}</span>
                      ) : (
                        <span className={pill("emerald")}>Free</span>
                      )}
                    </div>
                    {order ? (
                      <div className="flex items-end justify-between text-[11px] font-pmedium text-slate-500">
                        <span>
                          Order #{order.orderNumber} · {order.items.reduce((sum, line) => sum + line.quantity, 0)} items
                        </span>
                        <span className="text-sm font-pmedium text-slate-900">{formatCurrency(order.total)}</span>
                      </div>
                    ) : lockedReservation ? (
                      <span className="text-[11px] font-pmedium text-slate-500">{lockedReservation.guestName} · party of {lockedReservation.partySize}</span>
                    ) : (
                      <span className="text-[11px] font-pmedium text-slate-400">Tap to take an order</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function OrderDialog({
  table,
  order,
  readOnly,
  initialCustomerName,
  menuItems,
  formatCurrency,
  settings,
  onClose,
  onChanged,
}: {
  table: CafeTable;
  order: CafeOrder | null;
  readOnly: boolean;
  initialCustomerName?: string;
  menuItems: CafeMenuItem[];
  formatCurrency: (value?: number) => string;
  settings: CafeSettings;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const { prompt } = useAppConfirm();
  const [customerName, setCustomerName] = useState(order?.customerName || initialCustomerName || "");
  const [notes, setNotes] = useState(order?.notes || "");
  const [category, setCategory] = useState("All");
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [discountType, setDiscountType] = useState<"none" | "percentage" | "fixed">("none");
  const [discountValue, setDiscountValue] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const printReceipt = (title: string, body: string) => {
    const printWindow = window.open("", "_blank", "width=420,height=720");
    if (!printWindow) return toast.error("Allow pop-ups to print this receipt.");
    printWindow.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#111}h1{font-size:18px;text-align:center;margin:0 0 4px}.meta{text-align:center;font-size:12px;color:#555;margin-bottom:16px}.line{display:flex;justify-content:space-between;border-bottom:1px dashed #bbb;padding:6px 0}.total{font-weight:700;border-top:2px solid #111;margin-top:10px;padding-top:8px}.qr{text-align:center;margin-top:18px}.qr img{width:120px;height:120px}</style></head><body>${body}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  useEffect(() => {
    setCustomerName(order?.customerName || initialCustomerName || "");
    setNotes(order?.notes || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?._id]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(menuItems.map((item) => item.category || "Uncategorised")))],
    [menuItems],
  );

  const visibleItems = menuItems.filter(
    (item) => item.isAvailable && (category === "All" || (item.category || "Uncategorised") === category),
  );

  const draftLines = menuItems
    .filter((item) => (draft[item._id] || 0) > 0)
    .map((item) => ({ item, quantity: draft[item._id], lineTotal: item.price * draft[item._id] }));
  const draftTotal = draftLines.reduce((sum, line) => sum + line.lineTotal, 0);

  const adjust = (itemId: string, delta: number) =>
    setDraft((prev) => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] || 0) + delta) }));

  const run = async (action: () => Promise<any>, successMessage: string, closeAfter = false) => {
    setBusy(true);
    try {
      await action();
      toast.success(successMessage);
      await onChanged();
      if (closeAfter) onClose();
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Something went wrong."));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleAddItems = async () => {
    if (draftLines.length === 0) return;
    setBusy(true);
    try {
      const response = await createCafeOrder({
        tableId: table._id,
        customerName,
        notes,
        items: draftLines.map((line) => ({ menuItemId: line.item._id, quantity: line.quantity })),
      });
      toast.success(response?.data?.message || "Round sent to the kitchen.");
      setDraft({});
      await onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to send this round."));
    } finally {
      setBusy(false);
    }
  };

  const handlePrintKot = (round: { roundNumber: number; label: string; items: CafeOrder["items"] }) => {
    if (!order) return;
    printReceipt(
      `KOT ${order.orderNumber}-${round.roundNumber}`,
      `<h1>KITCHEN ORDER TICKET</h1><div class="meta">Order #${order.orderNumber} · ${table.name}<br>${round.label} · ${order.waiterName || "Waiter"}</div>${round.items.map((line) => `<div class="line"><span>${line.quantity} × ${line.name}</span></div>`).join("")}${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ""}`,
    );
  };

  const handleVoidItem = async (roundNumber: number, line: CafeOrderLine) => {
    if (!order) return;
    const result = await prompt({
      title: "Void item",
      message: `Void units of "${line.name}" from this order.`,
      fields: [
        { name: "quantity", label: `Quantity to void (1–${line.quantity})`, type: "number", min: 1, max: line.quantity, defaultValue: String(line.quantity) },
        { name: "reason", label: "Reason", placeholder: "e.g. Customer changed order" },
      ],
      confirmLabel: "Void item",
    });
    if (!result) return;
    const voidQty = Number(result.quantity);
    if (!Number.isInteger(voidQty) || voidQty < 1 || voidQty > line.quantity) {
      toast.error(`Enter a whole number between 1 and ${line.quantity}.`);
      return;
    }
    void run(
      () => updateCafeOrderRoundItem(order._id, roundNumber, line.menuItemId, line.quantity - voidQty, result.reason),
      `Voided ${voidQty} × ${line.name}.`,
    );
  };

  const handleSaveDetails = () => {
    if (!order) return;
    void run(() => updateCafeOrderDetails(order._id, { customerName, notes }), "Order details saved.");
  };

  const handleStatus = (status: CafeOrderStatus) => {
    if (!order) return;
    void run(() => updateCafeOrderStatus(order._id, status), `Marked ${status}.`);
  };

  const handlePrintBill = () => {
    if (!order) return;
    const qr = settings.showReviewQr && settings.googleReviewUrl
      ? `<div class="qr"><p>Review us on Google</p><img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(settings.googleReviewUrl)}"></div>`
      : "";
    printReceipt(
      `Bill ${order.orderNumber}`,
      `<h1>${settings.companyName || "Cafe Bill"}</h1><div class="meta">Order #${order.orderNumber} · ${table.name}<br>${new Date().toLocaleString()}${order.waiterName ? `<br>Waiter: ${order.waiterName}` : ""}</div>${order.items.map((line) => `<div class="line"><span>${line.quantity} × ${line.name}</span><span>${formatCurrency(line.lineTotal)}</span></div>`).join("")}<div class="line"><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div>${order.discountAmount ? `<div class="line"><span>Discount</span><span>−${formatCurrency(order.discountAmount)}</span></div>` : ""}${order.taxAmount ? `<div class="line"><span>Tax (${order.taxPercent}%)</span><span>${formatCurrency(order.taxAmount)}</span></div>` : ""}<div class="line total"><span>Total</span><span>${formatCurrency(order.total)}</span></div>${order.paymentMethod ? `<div class="meta">Paid via ${order.paymentMethod}</div>` : ""}${qr}`,
    );
  };

  const handleVoid = async () => {
    if (!order) return;
    const result = await prompt({
      title: "Void order",
      message: `Void order #${order.orderNumber}? This cannot be undone.`,
      fields: [{ name: "reason", label: "Reason", placeholder: "e.g. Customer walked out" }],
      confirmLabel: "Void order",
    });
    if (!result) return;
    void run(() => updateCafeOrderStatus(order._id, "Cancelled", result.reason), "Order voided.", true);
  };

  const handlePaidAndDone = () => {
    if (!order) return;
    const numericDiscount = Number(discountValue || 0);
    if (!Number.isFinite(numericDiscount) || numericDiscount < 0) return toast.error("Enter a valid discount.");
    void run(
      () => billCafeOrder(order._id, { discountType, discountValue: discountType === "none" ? 0 : numericDiscount, paymentMethod }),
      "Payment settled. Table is free.",
      true,
    );
  };

  const previewDiscount = discountType === "percentage"
    ? Math.min(order?.subtotal || 0, (order?.subtotal || 0) * Math.min(100, Number(discountValue || 0)) / 100)
    : discountType === "fixed"
      ? Math.min(order?.subtotal || 0, Number(discountValue || 0))
      : 0;
  const previewTax = Math.max(0, (order?.subtotal || 0) - previewDiscount) * (order?.taxPercent || 0) / 100;
  const previewTotal = Math.max(0, (order?.subtotal || 0) - previewDiscount) + previewTax;

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem] ${readOnly ? "sm:max-w-2xl" : "sm:max-w-4xl"}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-[13px] font-pmedium uppercase tracking-widest text-slate-900">{table.name}</h3>
            <p className="text-[11px] font-pmedium text-slate-500">
              {order ? `Order #${order.orderNumber}` : "No open order"} · {table.seats} seats
            </p>
          </div>
          <div className="flex items-center gap-3">
            {order && <span className={pill(TONE[order.status])}>{order.status}</span>}
            <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 overflow-y-auto md:grid-cols-5">
          <div className={`flex flex-col gap-4 border-b border-slate-100 p-6 md:border-b-0 ${readOnly ? "md:col-span-5" : "md:col-span-2 md:border-r"}`}>
            <div>
              <label className={LABEL}>Customer</label>
              <input className={FIELD} disabled={readOnly} placeholder="Customer name (optional)" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Notes</label>
              <textarea className={FIELD} disabled={readOnly} rows={2} placeholder="Allergies, seating, special requests" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            {order && !readOnly && (
              <button type="button" onClick={handleSaveDetails} disabled={busy} className={SECONDARY_BUTTON}>
                Save details
              </button>
            )}

            <div>
              <p className={LABEL}>Order rounds</p>
              {!order || order.items.length === 0 ? (
                <p className="text-[11px] font-pmedium text-slate-400">No items yet.</p>
              ) : (
                <div className="space-y-2">
                  {(order.rounds?.length ? order.rounds : [{ roundNumber: 1, label: "Round 1", status: order.status === "Served" ? "Served" : "Sent", items: order.items }]).map((round) => (
                    <div key={round.roundNumber} className="overflow-hidden rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between bg-slate-50 px-3 py-2">
                        <div>
                          <p className="text-[11px] font-pmedium text-slate-900">{round.label || `Round ${round.roundNumber}`}</p>
                          <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{round.status}</p>
                        </div>
                        {round.status !== "Served" && (
                          <button type="button" onClick={() => handlePrintKot(round)} aria-label={`Print KOT for ${round.label || `Round ${round.roundNumber}`}`} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                            <Printer size={12} />
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-slate-50">
                        {round.items.map((line) => {
                          const canVoidLine = !readOnly && Boolean(order?.rounds?.length) && round.status !== "Served";
                          return (
                            <div key={`${round.roundNumber}-${line.menuItemId}`} className="flex items-center justify-between px-3 py-2 text-[11px] font-pmedium">
                              <span>{line.quantity} × {line.name}</span>
                              <div className="flex items-center gap-2">
                                <span>{formatCurrency(line.lineTotal)}</span>
                                {canVoidLine && (
                                  <button
                                    type="button"
                                    onClick={() => handleVoidItem(round.roundNumber, line)}
                                    disabled={busy}
                                    aria-label={`Void ${line.name}`}
                                    title="Void quantity"
                                    className="rounded border border-slate-200 p-1 text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                                  >
                                    <X size={11} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {order && (
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-[12px]">
                <p className="text-center font-pmedium text-slate-900">{settings.companyName || "Cafe Bill"}</p>
                <p className="text-center text-[11px] text-slate-500">Bill · Order #{order.orderNumber}</p>
                <p className="text-center text-[11px] text-slate-500">
                  {table.name} · {new Date().toLocaleString()}
                  {order.customerName ? ` · ${order.customerName}` : ""}
                </p>
                <div className="my-2 divide-y divide-slate-100 border-y border-slate-100">
                  {order.items.map((line) => (
                    <div key={line.menuItemId} className="flex justify-between py-1">
                      <span>
                        {line.quantity} × {line.name}
                      </span>
                      <span>{formatCurrency(line.lineTotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-pmedium text-slate-900">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>−{formatCurrency(order.discountAmount)}</span></div>}
                {order.taxAmount > 0 && <div className="flex justify-between text-slate-600"><span>Tax ({order.taxPercent}%)</span><span>{formatCurrency(order.taxAmount)}</span></div>}
                <div className="flex justify-between font-pmedium text-slate-900">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
                {order.waiterName && <p className="mt-2 text-center text-[10px] text-slate-500">Waiter: {order.waiterName}</p>}
                {order.paymentMethod && <p className="text-center text-[10px] text-slate-500">Paid via {order.paymentMethod}</p>}
              </div>
            )}

            {order && !readOnly && (
              <div className="mt-auto flex flex-wrap gap-2">
                {!["Served", "Paid"].includes(order.status) && (
                  <button type="button" onClick={() => handleStatus("Served")} disabled={busy} className={PRIMARY_BUTTON}>
                    Mark as served
                  </button>
                )}
                {!["Served", "Paid"].includes(order.status) && (
                  <button type="button" onClick={handleVoid} disabled={busy} className="inline-flex items-center rounded-2xl px-3 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-rose-600 hover:bg-rose-50">Void order</button>
                )}
              </div>
            )}
          </div>

          <div className={`flex flex-col gap-3 p-6 md:col-span-3 ${readOnly ? "hidden" : ""}`}>
            <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-pmedium text-blue-700">
              <span>Next kitchen ticket</span><span>Round {(order?.rounds?.length || 0) + 1}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`rounded-full px-3 py-1 text-[10px] font-pmedium uppercase tracking-widest ${
                    category === item ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {visibleItems.length === 0 && (
                <p className="col-span-full text-[11px] font-pmedium text-slate-400">No available items in this category.</p>
              )}
              {visibleItems.map((item) => {
                const quantity = draft[item._id] || 0;
                return (
                  <div key={item._id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-pmedium text-slate-900">{item.name}</p>
                      <p className="text-[11px] font-pmedium text-slate-500">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => adjust(item._id, -1)} disabled={quantity === 0} aria-label={`Remove one ${item.name}`} className="rounded-lg border border-slate-200 p-1 disabled:opacity-40">
                        <Minus size={13} />
                      </button>
                      <span className="w-5 text-center text-[12px] font-pmedium">{quantity}</span>
                      <button type="button" onClick={() => adjust(item._id, 1)} aria-label={`Add one ${item.name}`} className="rounded-lg border border-slate-200 p-1">
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <span className="text-[11px] font-pmedium text-slate-500">
                {draftLines.length === 0 ? "Pick items to add" : `${draftLines.length} item(s) · ${formatCurrency(draftTotal)}`}
              </span>
              <button type="button" onClick={handleAddItems} disabled={busy || draftLines.length === 0} className={PRIMARY_BUTTON}>
                {busy && <Loader2 size={13} className="animate-spin" />}
                {order ? "Send next round" : "Send round 1"}
              </button>
            </div>
          </div>
        </div>

        {order && showSettlement && order.status === "Served" && (
          <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <label className={LABEL}>Discount</label>
                <select className={FIELD} value={discountType} onChange={(event) => setDiscountType(event.target.value as typeof discountType)}>
                  <option value="none">No discount</option><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>{discountType === "percentage" ? "Discount %" : "Discount amount"}</label>
                <input className={FIELD} type="number" min="0" max={discountType === "percentage" ? 100 : undefined} disabled={discountType === "none"} value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Payment method</label>
                <select className={FIELD} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                  <option>Cash</option><option>Card</option><option>UPI</option><option>Bank Transfer</option><option>Other</option>
                </select>
              </div>
              <div className="flex items-end justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div><p className={LABEL}>Amount to collect</p><p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(previewTotal)}</p></div>
                <button type="button" onClick={handlePaidAndDone} disabled={busy} className={PRIMARY_BUTTON}>{busy && <Loader2 size={13} className="animate-spin" />} Settle</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
            Close
          </button>
          {order && (
            <button type="button" onClick={handlePrintBill} className={SECONDARY_BUTTON}>
              <Printer size={13} /> Print bill
            </button>
          )}
          {order && !readOnly && order.status === "Served" && (
            <button type="button" onClick={() => setShowSettlement((value) => !value)} disabled={busy} className={PRIMARY_BUTTON}>
              Discount &amp; settle
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightsTab({ formatCurrency }: { formatCurrency: (value?: number) => string }) {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getCafeAnalytics(days)
      .then((res) => {
        if (!cancelled) setData(res?.data?.data || null);
      })
      .catch((error) => {
        if (!cancelled) toast.error(getErrorMessage(error, "Unable to load insights."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const maxQuantity = Math.max(1, ...(data?.topItems || []).map((item: any) => item.quantity));
  const maxHourOrders = Math.max(1, ...(data?.peakHours || []).map((hour: any) => hour.orders));
  const busiestHour = [...(data?.peakHours || [])].sort((a: any, b: any) => b.orders - a.orders)[0];
  const hourBuckets = Array.from({ length: 24 }, (_, hour) => {
    const match = (data?.peakHours || []).find((entry: any) => entry.hour === hour);
    return { hour, orders: match?.orders || 0 };
  });

  return (
    <>
      {isLoading || !data ? (
        <div className="flex items-center gap-2 p-4 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" /> Loading insights...
        </div>
      ) : (
        <>
          <SummaryCards
            cards={[
              { key: "revenue", icon: Receipt, label: "Revenue", value: formatCurrency(data.summary.revenue), cardClass: baseCardClass, iconClass: "bg-blue-50 text-blue-600" },
              { key: "bills", icon: CheckCircle2, label: "Bills settled", value: String(data.summary.billedOrders), cardClass: `${baseCardClass} border-l-4 border-l-emerald-500`, iconClass: "bg-emerald-50 text-emerald-600" },
              { key: "avg", icon: Tag, label: "Average bill", value: formatCurrency(data.summary.averageBill), cardClass: `${baseCardClass} border-l-4 border-l-indigo-500`, iconClass: "bg-indigo-50 text-indigo-600" },
              { key: "busy", icon: Users, label: "Busiest hour", value: busiestHour && busiestHour.orders > 0 ? `${String(busiestHour.hour).padStart(2, "0")}:00` : "—", cardClass: `${baseCardClass} border-l-4 border-l-amber-500`, iconClass: "bg-amber-50 text-amber-600" },
            ]}
          />

          <div className="flex min-h-110 flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
            <div className={TOOLBAR}>
              <p className="text-[11px] font-pmedium text-slate-500">Based on settled bills in the selected period.</p>
              <StatusPills options={[7, 30, 90] as const} value={days} onChange={(value) => setDays(value)} label={(value) => `${value} days`} />
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-2">
              <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-[11px] font-pmedium uppercase tracking-widest text-slate-500">Most ordered</h3>
                {data.topItems.length === 0 ? (
                  <p className="text-[11px] font-pmedium text-slate-400">No settled bills in this period.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.topItems.map((item: any, index: number) => (
                      <div key={item.menuItemId} className="flex flex-col gap-1">
                        <div className="flex justify-between text-[12px] font-pmedium text-slate-900">
                          <span>
                            {index + 1}. {item.name}
                          </span>
                          <span className="text-slate-500">
                            {item.quantity} sold · {formatCurrency(item.revenue)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100">
                          <div className="h-1.5 rounded-full bg-[#2563EB]" style={{ width: `${(item.quantity / maxQuantity) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-[11px] font-pmedium uppercase tracking-widest text-slate-500">Peak hours</h3>
                <div className="flex h-40 items-end gap-1">
                  {hourBuckets.map((bucket) => (
                    <div key={bucket.hour} className="flex flex-1 flex-col items-center" title={`${bucket.hour}:00 — ${bucket.orders} bills`}>
                      <div
                        className={`w-full rounded-t ${bucket.orders === maxHourOrders && bucket.orders > 0 ? "bg-[#2563EB]" : "bg-slate-200"}`}
                        style={{ height: `${(bucket.orders / maxHourOrders) * 100}%`, minHeight: bucket.orders ? 4 : 2 }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[9px] font-pmedium text-slate-400">
                  <span>00</span>
                  <span>06</span>
                  <span>12</span>
                  <span>18</span>
                  <span>23</span>
                </div>
              </section>
            </div>

            <div className="min-h-0 flex-1 overflow-auto border-t border-slate-100">
              <table className="min-w-[480px] w-full text-left">
                <thead className="sticky top-0 z-10 text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
                  <tr>
                    <th className={TH}>Date</th>
                    <th className={`${TH} text-center`}>Bills</th>
                    <th className={`${TH} text-right`}>Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.daily.length === 0 ? (
                    <EmptyRow colSpan={3} message="No settled bills in this period." />
                  ) : (
                    [...data.daily].reverse().map((day: any) => (
                      <tr key={day.date} className="transition-all hover:bg-blue-50/30">
                        <td className={TD}>{day.date}</td>
                        <td className={`${TD} text-center`}>{day.orders}</td>
                        <td className={`${TD} text-right`}>{formatCurrency(day.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function OrderHistoryTab({
  tables,
  formatCurrency,
  onView,
}: {
  tables: CafeTable[];
  formatCurrency: (value?: number) => string;
  onView: (table: CafeTable, order: CafeOrder) => void;
}) {
  const [orders, setOrders] = useState<CafeOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | "Paid" | "Cancelled">("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getCafeOrders({
      scope: "history",
      from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
    })
      .then((res) => {
        if (!cancelled) setOrders(Array.isArray(res?.data?.data) ? res.data.data : []);
      })
      .catch((error) => {
        if (!cancelled) toast.error(getErrorMessage(error, "Unable to load order history."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const tableName = (tableId: string | null) => tables.find((table) => table._id === tableId)?.name || "—";

  const filtered = orders.filter((order) => {
    if (status !== "All" && order.status !== status) return false;
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    return (
      String(order.orderNumber).includes(needle) ||
      order.customerName.toLowerCase().includes(needle) ||
      tableName(order.tableId).toLowerCase().includes(needle)
    );
  });

  const billedTotal = filtered.filter((order) => order.status === "Paid").reduce((sum, order) => sum + order.total, 0);

  return (
    <>
      <SummaryCards
        cards={[
          { key: "orders", icon: Receipt, label: "Orders", value: String(filtered.length), cardClass: baseCardClass, iconClass: "bg-blue-50 text-blue-600" },
          { key: "billed", icon: CheckCircle2, label: "Paid", value: String(filtered.filter((o) => o.status === "Paid").length), cardClass: `${baseCardClass} border-l-4 border-l-emerald-500`, iconClass: "bg-emerald-50 text-emerald-600" },
          { key: "cancelled", icon: X, label: "Cancelled", value: String(filtered.filter((o) => o.status === "Cancelled").length), cardClass: `${baseCardClass} border-l-4 border-l-red-500`, iconClass: "bg-red-50 text-red-600" },
          { key: "revenue", icon: Tag, label: "Revenue", value: formatCurrency(billedTotal), cardClass: `${baseCardClass} border-l-4 border-l-indigo-500`, iconClass: "bg-indigo-50 text-indigo-600" },
        ]}
      />

      <div className="flex min-h-110 flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className={TOOLBAR}>
          <StatusPills options={["All", "Paid", "Cancelled"] as const} value={status} onChange={setStatus} />
          <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input className={SEARCH_INPUT} placeholder="Search order #, customer or table..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <input type="date" className={`${FIELD} w-auto`} value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" />
            <input type="date" className={`${FIELD} w-auto`} value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Loading history...
            </div>
          ) : (
            <table className="min-w-[960px] w-full text-left">
              <thead className="sticky top-0 z-10 text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
                <tr>
                  <th className={TH}>Order</th>
                  <th className={TH}>Table</th>
                  <th className={TH}>Customer</th>
                  <th className={`${TH} text-center`}>Items</th>
                  <th className={TH}>Date</th>
                  <th className={`${TH} text-right`}>Total</th>
                  <th className={`${TH} text-center`}>Status</th>
                  <th className={`${TH} text-center`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <EmptyRow colSpan={8} message="No orders match these filters." />
                ) : (
                  filtered.map((order) => {
                    const table = tables.find((entry) => entry._id === String(order.tableId));
                    return (
                      <tr key={order._id} className="transition-all hover:bg-blue-50/30">
                        <td className={TD}>#{order.orderNumber}</td>
                        <td className={TD}>{tableName(order.tableId)}</td>
                        <td className={`${TD} text-slate-600`}>{order.customerName || "—"}</td>
                        <td className={`${TD} text-center text-slate-600`}>{order.items.reduce((sum, line) => sum + line.quantity, 0)}</td>
                        <td className={`${TD} text-slate-500`}>{new Date(order.billedAt || order.createdAt || "").toLocaleString()}</td>
                        <td className={`${TD} text-right`}>{formatCurrency(order.total)}</td>
                        <td className="px-3.5 py-2 text-center">
                          <span className={pill(TONE[order.status])} title={order.status === "Cancelled" && order.cancelReason ? `Void reason: ${order.cancelReason}` : undefined}>{order.status}</span>
                        </td>
                        <td className="px-3.5 py-2 text-center">
                          {table && (
                            <button type="button" onClick={() => onView(table, order)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600">
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
