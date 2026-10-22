import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Armchair,
  Receipt,
  CheckCircle2,
  Edit2,
  Eye,
  FileDown,
  ListChecks,
  Loader2,
  Plus,
  Printer,
  Search,
  Settings2,
  Tag,
  Tags,
  Trash2,
  UtensilsCrossed,
  Users,
  X,
  XCircle,
} from "lucide-react";
import PageFrame from "../../../components/Pages/PageFrame";
import WebsiteFormField from "../../../components/WebsiteFormField";
import BulkUploadModal from "../../../components/BulkUploadModal";
import ReservationsPanel from "../CafeShared/ReservationsPanel";
import { useAppConfirm } from "../../../components/app/AppConfirmProvider";
import useWorkspacePreferences from "../../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../../lib/workspaceLocalization";
import {
  createCafeCategory,
  bulkCreateCafeMenuItems,
  createCafeMenuItem,
  createCafeTable,
  deleteCafeCategory,
  deleteCafeMenuItem,
  deleteCafeTable,
  getCafeCategories,
  getCafeMenuItems,
  getCafeOrders,
  getCafeSettings,
  getCafeAnalytics,
  getCafeTables,
  updateCafeMenuItem,
  updateCafeOrderRoundItem,
  updateCafeOrderStatus,
  updateCafeSettings,
  updateCafeTable,
  billCafeOrder,
  type CafeCategory,
  type CafeMenuItem,
  type CafeTable,
  type CafeOrder,
  type CafeOrderLine,
  type CafeSettings,
} from "../../../services/cafe";

type Tab = "reservations" | "orders" | "tables" | "menu" | "history" | "reports" | "settings";
type TableFilter = "All" | "Free" | "Occupied" | "Inactive";
type MenuFilter = "All" | "Available" | "Unavailable";

const baseCardClass =
  "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md";
const FIELD =
  "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all";
const LABEL = "mb-1.5 block text-[10px] font-pmedium uppercase tracking-widest text-slate-400";
const ACTION_BUTTON =
  "rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600";
const DELETE_BUTTON =
  "rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600";
const ACTION_BUTTON_LABELLED =
  "bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-slate-50 active:scale-95 transition-all whitespace-nowrap";
const ADD_BUTTON =
  "bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap";
const SAVE_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest text-white shadow-sm hover:bg-blue-700 disabled:opacity-50";
const CANCEL_BUTTON =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 hover:bg-slate-50";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

type DateScope = "today" | "yesterday" | "custom";

const getLocalDateInput = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

const emptyRow = (colSpan: number, message: string) => (
  <tr>
    <td colSpan={colSpan} className="bg-slate-50/50 py-20 text-center text-slate-400">
      <p className="text-sm font-pmedium">{message}</p>
    </td>
  </tr>
);

export default function CafeManagementPage() {
  const workspacePreferences = useWorkspacePreferences();
  const formatCurrency = (value = 0) =>
    formatWorkspaceCurrency(Number(value || 0), workspacePreferences.currency, { maximumFractionDigits: 2 });

  const [tab, setTab] = useState<Tab>("orders");
  const { confirm } = useAppConfirm();
  const [tableFilter, setTableFilter] = useState<TableFilter>("All");
  const [menuFilter, setMenuFilter] = useState<MenuFilter>("All");
  const [menuCategory, setMenuCategory] = useState("All Categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [menuItems, setMenuItems] = useState<CafeMenuItem[]>([]);
  const [categoryList, setCategoryList] = useState<CafeCategory[]>([]);
  const [openOrders, setOpenOrders] = useState<CafeOrder[]>([]);
  const [settings, setSettings] = useState<CafeSettings>({ companyName: "", googleReviewUrl: "", showReviewQr: false, taxPercent: 0, cafeStartTime: "06:00" });
  const [isLoading, setIsLoading] = useState(true);
  const [dialog, setDialog] = useState<{ kind: "tables" | "menu" | "categories" | "bulk" | "order"; table?: CafeTable; item?: CafeMenuItem; order?: CafeOrder } | null>(null);

  const [floorOrders, setFloorOrders] = useState<CafeOrder[]>([]);
  const [isFloorLoading, setIsFloorLoading] = useState(true);
  const [floorDateScope, setFloorDateScope] = useState<DateScope>("today");
  const [floorCustomDate, setFloorCustomDate] = useState(getLocalDateInput());

  const loadAll = async () => {
    try {
      const [tablesRes, menuRes, categoriesRes, openRes, settingsRes] = await Promise.all([getCafeTables(), getCafeMenuItems(), getCafeCategories(), getCafeOrders({ scope: "open" }), getCafeSettings()]);
      setTables(Array.isArray(tablesRes?.data?.data) ? tablesRes.data.data : []);
      setMenuItems(Array.isArray(menuRes?.data?.data) ? menuRes.data.data : []);
      setCategoryList(Array.isArray(categoriesRes?.data?.data) ? categoriesRes.data.data : []);
      setOpenOrders(Array.isArray(openRes?.data?.data) ? openRes.data.data : []);
      setSettings(settingsRes?.data?.data || settings);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load cafe management data."));
    } finally {
      setIsLoading(false);
    }
  };

  const loadFloorOrders = async () => {
    setIsFloorLoading(true);
    try {
      const dateInput = floorDateScope === "today" ? getLocalDateInput() : floorDateScope === "yesterday" ? getLocalDateInput(-1) : floorCustomDate;
      const res = await getCafeOrders({
        from: new Date(`${dateInput}T00:00:00`).toISOString(),
        to: new Date(`${dateInput}T23:59:59`).toISOString(),
      });
      setFloorOrders(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load floor orders."));
    } finally {
      setIsFloorLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    void loadFloorOrders();
  }, [floorDateScope, floorCustomDate]);

  const refreshAfterOrderChange = async () => {
    setDialog(null);
    await Promise.all([loadAll(), loadFloorOrders()]);
  };

  const refreshListsOnly = async () => {
    await Promise.all([loadAll(), loadFloorOrders()]);
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setSearchQuery("");
  };

  const search = searchQuery.trim().toLowerCase();

  const tableStatus = (table: CafeTable): "Inactive" | "Occupied" | "Free" =>
    !table.isActive ? "Inactive" : table.openOrder ? "Occupied" : "Free";

  const filteredTables = tables.filter((table) => {
    if (search && !table.name.toLowerCase().includes(search)) return false;
    return tableFilter === "All" || tableStatus(table) === tableFilter;
  });

  const categoryNames = useMemo(
    () => Array.from(new Set([...categoryList.map((category) => category.name), ...menuItems.map((item) => item.category).filter(Boolean)])),
    [categoryList, menuItems],
  );
  const categories = ["All Categories", ...categoryNames];

  const filteredMenu = menuItems.filter((item) => {
    if (search && !`${item.name} ${item.category}`.toLowerCase().includes(search)) return false;
    if (menuCategory !== "All Categories" && (item.category || "Uncategorised") !== menuCategory) return false;
    if (menuFilter === "Available") return item.isAvailable;
    if (menuFilter === "Unavailable") return !item.isAvailable;
    return true;
  });

  const summaryCards =
    tab === "tables"
      ? [
          { key: "total", icon: Armchair, label: "Total Tables", value: tables.length, cardClass: baseCardClass, iconClass: "bg-blue-50 text-blue-600" },
          { key: "free", icon: CheckCircle2, label: "Free", value: tables.filter((t) => tableStatus(t) === "Free").length, cardClass: `${baseCardClass} border-l-4 border-l-emerald-500`, iconClass: "bg-emerald-50 text-emerald-600" },
          { key: "occupied", icon: Users, label: "Occupied", value: tables.filter((t) => tableStatus(t) === "Occupied").length, cardClass: `${baseCardClass} border-l-4 border-l-amber-500`, iconClass: "bg-amber-50 text-amber-600" },
          { key: "inactive", icon: XCircle, label: "Inactive", value: tables.filter((t) => tableStatus(t) === "Inactive").length, cardClass: `${baseCardClass} border-l-4 border-l-red-500`, iconClass: "bg-red-50 text-red-600" },
        ]
      : [
          { key: "total", icon: UtensilsCrossed, label: "Total Items", value: menuItems.length, cardClass: baseCardClass, iconClass: "bg-blue-50 text-blue-600" },
          { key: "available", icon: CheckCircle2, label: "Available", value: menuItems.filter((i) => i.isAvailable).length, cardClass: `${baseCardClass} border-l-4 border-l-emerald-500`, iconClass: "bg-emerald-50 text-emerald-600" },
          { key: "unavailable", icon: XCircle, label: "Unavailable", value: menuItems.filter((i) => !i.isAvailable).length, cardClass: `${baseCardClass} border-l-4 border-l-red-500`, iconClass: "bg-red-50 text-red-600" },
          { key: "categories", icon: Tag, label: "Categories", value: Math.max(0, categories.length - 1), cardClass: `${baseCardClass} border-l-4 border-l-indigo-500`, iconClass: "bg-indigo-50 text-indigo-600" },
        ];

  const handleToggleTable = async (table: CafeTable) => {
    if (table.isActive && table.openOrder) {
      toast.error("An occupied table cannot be disabled. Settle its order first.");
      return;
    }
    try {
      await updateCafeTable(table._id, { isActive: !table.isActive });
      await loadAll();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update the table."));
    }
  };

  const handleDeleteTable = async (table: CafeTable) => {
    const approved = await confirm({ title: "Delete table?", message: `Remove ${table.name}? This cannot be undone.`, confirmLabel: "Delete" });
    if (!approved) return;
    try {
      await deleteCafeTable(table._id);
      toast.success("Table removed.");
      await loadAll();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to remove the table."));
    }
  };

  const handleToggleItem = async (item: CafeMenuItem) => {
    try {
      await updateCafeMenuItem(item._id, { isAvailable: !item.isAvailable });
      await loadAll();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update availability."));
    }
  };

  const handleDeleteItem = async (item: CafeMenuItem) => {
    const approved = await confirm({ title: "Delete menu item?", message: `Remove “${item.name}” from the menu? This cannot be undone.`, confirmLabel: "Delete" });
    if (!approved) return;
    try {
      await deleteCafeMenuItem(item._id);
      toast.success("Menu item removed.");
      await loadAll();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to remove the menu item."));
    }
  };

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">Cafe Management</h2>
            <p className="text-xs font-pmedium text-slate-500 mt-1">Track floor orders, payments, menu, reports, and cafe controls.</p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
          {(
            [
              { key: "reservations", label: "Reservations" },
              { key: "orders", label: "Orders Management" },
              { key: "tables", label: "Tables" },
              { key: "menu", label: "Menu Items" },
              { key: "history", label: "Order History" },
              { key: "reports", label: "Reports" },
              { key: "settings", label: "Settings" },
            ] as Array<{ key: Tab; label: string }>
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => switchTab(item.key)}
              className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
                tab === item.key ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "orders" && (
          <FloorOrdersPanel
            orders={floorOrders}
            isLoading={isFloorLoading}
            dateScope={floorDateScope}
            customDate={floorCustomDate}
            onDateScopeChange={setFloorDateScope}
            onCustomDateChange={setFloorCustomDate}
            tables={tables}
            formatCurrency={formatCurrency}
            onView={(order) => setDialog({ kind: "order", order })}
          />
        )}
        {tab === "reservations" && <ReservationsPanel tables={tables} allowCreate />}
        {tab === "history" && <OrderHistoryPanel tables={tables} formatCurrency={formatCurrency} onView={(order) => setDialog({ kind: "order", order })} />}
        {tab === "reports" && <CafeReportsPanel formatCurrency={formatCurrency} />}
        {tab === "settings" && <CafeSettingsPanel value={settings} onSaved={async () => { await loadAll(); }} />}

        {(tab === "tables" || tab === "menu") && <>
        <div className="mb-3 mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 shrink-0">
          {summaryCards.map((card) => {
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

        <div className="flex min-h-110 flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
          <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
            <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {(tab === "tables"
                ? (["All", "Free", "Occupied", "Inactive"] as const)
                : (["All", "Available", "Unavailable"] as const)
              ).map((status) => {
                const isSelected = tab === "tables" ? tableFilter === status : menuFilter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => (tab === "tables" ? setTableFilter(status as TableFilter) : setMenuFilter(status as MenuFilter))}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${
                      isSelected
                        ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                        : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder={tab === "tables" ? "Search tables..." : "Search menu items..."}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-500"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              {tab === "menu" && (
                <>
                  <button type="button" onClick={() => setDialog({ kind: "bulk" })} className={ACTION_BUTTON_LABELLED} title="Bulk add menu items">
                    <ListChecks size={13} /> BULK ADD
                  </button>
                  <button type="button" onClick={() => setDialog({ kind: "categories" })} className={ACTION_BUTTON_LABELLED} title="Manage Categories">
                    <Tags size={13} /> CATEGORIES
                  </button>
                </>
              )}
              <button type="button" onClick={() => setDialog({ kind: tab })} className={ADD_BUTTON}>
                <Plus size={13} strokeWidth={3} /> {tab === "tables" ? "ADD TABLE" : "ADD MENU ITEM"}
              </button>
            </div>
          </div>

          {tab === "menu" && (
            <div className="border-b border-slate-100 bg-white p-3">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 items-end">
                <div>
                  <label className={LABEL}>Category</label>
                  <select className={`${FIELD} cursor-pointer`} value={menuCategory} onChange={(event) => setMenuCategory(event.target.value)}>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuCategory("All Categories");
                    setMenuFilter("All");
                    setSearchQuery("");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <X size={14} /> Reset Filters
                </button>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" /> Loading...
              </div>
            ) : tab === "tables" ? (
              <table className="min-w-[760px] w-full text-left">
                <thead className="sticky top-0 z-10 text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
                  <tr>
                    <th className="px-3.5 py-2 w-8 text-center">#</th>
                    <th className="px-3.5 py-2">Table</th>
                    <th className="px-3.5 py-2 text-center">Seats</th>
                    <th className="px-3.5 py-2">Current Order</th>
                    <th className="px-3.5 py-2 text-center">Status</th>
                    <th className="px-3.5 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTables.length === 0
                    ? emptyRow(6, tables.length === 0 ? "No tables yet. Add your first table to start taking orders." : "No tables match these filters.")
                    : filteredTables.map((table, index) => {
                        const status = tableStatus(table);
                        const tone = status === "Free" ? "emerald" : status === "Occupied" ? "amber" : "slate";
                        return (
                          <tr key={table._id} className="transition-all hover:bg-blue-50/30">
                            <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-500 text-center">{index + 1}</td>
                            <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-900">{table.name}</td>
                            <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-700 text-center">{table.seats}</td>
                            <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-500">
                              {table.openOrder ? `#${table.openOrder.orderNumber} · ${table.openOrder.itemCount} items · ${formatCurrency(table.openOrder.total)}` : "—"}
                            </td>
                            <td className="px-3.5 py-2 text-center">
                              <span className={pillClass(tone)}>{status}</span>
                            </td>
                            <td className="px-3.5 py-2">
                              <div className="flex items-center justify-center gap-2">
                                {table.openOrder && (
                                  <button type="button" onClick={() => {
                                    const current = openOrders.find((entry) => entry._id === table.openOrder?._id);
                                    if (current) setDialog({ kind: "order", order: current });
                                  }} className={ACTION_BUTTON} title="View Order">
                                    <Eye size={14} />
                                  </button>
                                )}
                                <button type="button" onClick={() => setDialog({ kind: "tables", table })} className={ACTION_BUTTON} title="Edit Table">
                                  <Edit2 size={14} />
                                </button>
                                {(!table.isActive || !table.openOrder) && (
                                  <button type="button" onClick={() => handleToggleTable(table)} className={table.isActive ? DELETE_BUTTON : ACTION_BUTTON} title={table.isActive ? "Disable Table" : "Enable Table"}>
                                    {table.isActive ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                                  </button>
                                )}
                                <button type="button" onClick={() => handleDeleteTable(table)} className={DELETE_BUTTON} title="Remove Table">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            ) : (
              <table className="min-w-[760px] w-full text-left">
                <thead className="sticky top-0 z-10 text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
                  <tr>
                    <th className="px-3.5 py-2 w-8 text-center">#</th>
                    <th className="px-3.5 py-2">Item</th>
                    <th className="px-3.5 py-2">Category</th>
                    <th className="px-3.5 py-2 text-right">Price</th>
                    <th className="px-3.5 py-2 text-center">Availability</th>
                    <th className="px-3.5 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredMenu.length === 0
                    ? emptyRow(6, menuItems.length === 0 ? "No menu items yet. Add your first item to start taking orders." : "No menu items match these filters.")
                    : filteredMenu.map((item, index) => (
                        <tr key={item._id} className="transition-all hover:bg-blue-50/30">
                          <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-500 text-center">{index + 1}</td>
                          <td className="px-3.5 py-2">
                            <p className="text-[12px] font-pmedium text-slate-900">{item.name}</p>
                            {item.description && <p className="text-[11px] text-slate-500">{item.description}</p>}
                          </td>
                          <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-600">{item.category}</td>
                          <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-900 text-right">{formatCurrency(item.price)}</td>
                          <td className="px-3.5 py-2 text-center">
                            <button type="button" onClick={() => handleToggleItem(item)}>
                              <span className={pillClass(item.isAvailable ? "emerald" : "slate")}>{item.isAvailable ? "Available" : "Unavailable"}</span>
                            </button>
                          </td>
                          <td className="px-3.5 py-2">
                            <div className="flex items-center justify-center gap-2">
                              <button type="button" onClick={() => setDialog({ kind: "menu", item })} className={ACTION_BUTTON} title="Edit Item">
                                <Edit2 size={14} />
                              </button>
                              <button type="button" onClick={() => handleDeleteItem(item)} className={DELETE_BUTTON} title="Remove Item">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        </>}
      </PageFrame>

      {dialog?.kind === "tables" && (
        <TableDialog
          table={dialog.table}
          onClose={() => setDialog(null)}
          onSaved={async () => {
            setDialog(null);
            await loadAll();
          }}
        />
      )}
      {dialog?.kind === "menu" && (
        <MenuItemDialog
          item={dialog.item}
          categoryNames={categoryNames}
          onClose={() => setDialog(null)}
          onSaved={async () => {
            setDialog(null);
            await loadAll();
          }}
        />
      )}
      {dialog?.kind === "categories" && (
        <CategoriesDialog
          categories={categoryList}
          usage={(name) => menuItems.filter((item) => item.category === name).length}
          onClose={() => setDialog(null)}
          onChanged={loadAll}
        />
      )}
      {dialog?.kind === "bulk" && (
        <BulkMenuSheetModal categories={categoryNames} onClose={() => setDialog(null)} onSaved={async () => { await loadAll(); }} />
      )}
      {dialog?.kind === "order" && dialog.order && (
        <OwnerOrderDialog order={dialog.order} table={tables.find((entry) => entry._id === dialog.order?.tableId)} settings={settings} formatCurrency={formatCurrency} onClose={() => setDialog(null)} onChanged={refreshAfterOrderChange} onSilentChange={refreshListsOnly} />
      )}
    </div>
  );
}

function ModalShell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-w-lg sm:rounded-[2rem]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-[13px] font-pmedium uppercase tracking-widest text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto p-6">{children}</div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}

function TableDialog({ table, onClose, onSaved }: { table?: CafeTable; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(table?.name || "");
  const [seats, setSeats] = useState(String(table?.seats ?? 4));
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Table name is required.");
    const numericSeats = Number(seats);
    if (!Number.isInteger(numericSeats) || numericSeats < 1) return toast.error("Seats must be at least 1.");

    setBusy(true);
    try {
      if (table) {
        await updateCafeTable(table._id, { name: name.trim(), seats: numericSeats });
        toast.success("Table updated.");
      } else {
        await createCafeTable({ name: name.trim(), seats: numericSeats });
        toast.success("Table added.");
      }
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save the table."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title={table ? "Edit Table" : "Add Table"}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={CANCEL_BUTTON}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={busy} className={SAVE_BUTTON}>
            {busy && <Loader2 size={13} className="animate-spin" />} Save
          </button>
        </>
      }
    >
      <div>
        <label className={LABEL}>Table name</label>
        <input className={FIELD} placeholder="e.g. T1, Window 2" value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div>
        <label className={LABEL}>Seats</label>
        <input className={FIELD} type="number" min="1" value={seats} onChange={(event) => setSeats(event.target.value)} />
      </div>
    </ModalShell>
  );
}

function CategoriesDialog({
  categories,
  usage,
  onClose,
  onChanged,
}: {
  categories: CafeCategory[];
  usage: (name: string) => number;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const { confirm } = useAppConfirm();
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return toast.error("Enter a category name.");
    setBusy(true);
    try {
      await createCafeCategory(newName.trim());
      toast.success("Category added.");
      setNewName("");
      await onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add the category."));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (category: CafeCategory) => {
    const approved = await confirm({ title: "Delete category?", message: `Remove “${category.name}”? Existing menu items keep their category text.`, confirmLabel: "Delete" });
    if (!approved) return;
    try {
      await deleteCafeCategory(category._id);
      toast.success("Category removed.");
      await onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to remove the category."));
    }
  };

  return (
    <ModalShell
      title="Menu Categories"
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={CANCEL_BUTTON}>
          Done
        </button>
      }
    >
      <div className="flex gap-2">
        <input
          className={FIELD}
          placeholder="Add a category (e.g. Breakfast Specials)"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleAdd();
          }}
        />
        <button type="button" onClick={handleAdd} disabled={busy} className={SAVE_BUTTON}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-100">
        {categories.length === 0 ? (
          <p className="p-6 text-center text-[12px] font-pmedium text-slate-400">No categories yet.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {categories.map((category) => {
              const count = usage(category.name);
              return (
                <div key={category._id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-[12px] font-pmedium text-slate-900">{category.name}</p>
                    <p className="text-[10px] font-pmedium text-slate-400">
                      {count} menu item{count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(category)}
                    aria-label={`Remove ${category.name}`}
                    className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function MenuItemDialog({
  item,
  categoryNames,
  onClose,
  onSaved,
}: {
  item?: CafeMenuItem;
  categoryNames: string[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(item?.name || "");
  const [category, setCategory] = useState(item?.category || categoryNames[0] || "");
  const [description, setDescription] = useState(item?.description || "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [isAvailable, setIsAvailable] = useState(item?.isAvailable ?? true);
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Item name is required.");
    if (price === "" || Number(price) < 0) return toast.error("Enter a valid price.");

    const payload = {
      name: name.trim(),
      category: category.trim() || "Uncategorised",
      description: description.trim(),
      price: Number(price),
      isAvailable,
    };

    setBusy(true);
    try {
      if (item) {
        await updateCafeMenuItem(item._id, payload);
        toast.success("Menu item updated.");
      } else {
        await createCafeMenuItem(payload);
        toast.success("Menu item added.");
      }
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save the menu item."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title={item ? "Edit Menu Item" : "Add Menu Item"}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={CANCEL_BUTTON}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={busy} className={SAVE_BUTTON}>
            {busy && <Loader2 size={13} className="animate-spin" />} Save
          </button>
        </>
      }
    >
      <div>
        <label className={LABEL}>Item name</label>
        <input className={FIELD} placeholder="e.g. Flat white" value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Category</label>
          <select className={`${FIELD} cursor-pointer`} value={category} onChange={(event) => setCategory(event.target.value)}>
            {categoryNames.length === 0 && <option value="">No categories yet</option>}
            {categoryNames.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Price</label>
          <input className={FIELD} type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
        </div>
      </div>
      <div>
        <label className={LABEL}>Description</label>
        <textarea className={FIELD} rows={2} placeholder="Optional" value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-[12px] font-pmedium text-slate-700">
        <input type="checkbox" checked={isAvailable} onChange={(event) => setIsAvailable(event.target.checked)} />
        Available to order
      </label>
    </ModalShell>
  );
}

function FloorOrdersPanel({
  orders,
  isLoading,
  dateScope,
  customDate,
  onDateScopeChange,
  onCustomDateChange,
  tables,
  formatCurrency,
  onView,
}: {
  orders: CafeOrder[];
  isLoading: boolean;
  dateScope: DateScope;
  customDate: string;
  onDateScopeChange: (scope: DateScope) => void;
  onCustomDateChange: (value: string) => void;
  tables: CafeTable[];
  formatCurrency: (value?: number) => string;
  onView: (order: CafeOrder) => void;
}) {
  const [filter, setFilter] = useState("All");
  const visible = orders.filter((order) => filter === "All" || order.status === filter);
  const open = orders.filter((order) => !["Paid", "Cancelled"].includes(order.status));
  return (
    <>
      <div className="mb-3 mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { key: "open", label: "Open orders", value: open.length, icon: ListChecks, cardClass: baseCardClass, iconClass: "bg-blue-50 text-blue-600" },
          { key: "ready", label: "Ready", value: orders.filter((order) => order.status === "Ready").length, icon: CheckCircle2, cardClass: `${baseCardClass} border-l-4 border-l-violet-500`, iconClass: "bg-violet-50 text-violet-600" },
          { key: "served", label: "Served", value: orders.filter((order) => order.status === "Served").length, icon: UtensilsCrossed, cardClass: `${baseCardClass} border-l-4 border-l-emerald-500`, iconClass: "bg-emerald-50 text-emerald-600" },
          { key: "value", label: "Open value", value: formatCurrency(open.reduce((sum, order) => sum + order.total, 0)), icon: Tag, cardClass: `${baseCardClass} border-l-4 border-l-amber-500`, iconClass: "bg-amber-50 text-amber-600" },
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
          <div className="flex flex-wrap gap-1.5">
            {(["today", "yesterday"] as const).map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => {
                  onDateScopeChange(scope);
                  onCustomDateChange(getLocalDateInput(scope === "yesterday" ? -1 : 0));
                }}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-pmedium capitalize ${dateScope === scope ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-500"}`}
              >
                {scope}
              </button>
            ))}
            <input
              type="date"
              value={customDate}
              onChange={(event) => {
                onCustomDateChange(event.target.value);
                onDateScopeChange("custom");
              }}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-pmedium border ${dateScope === "custom" ? "bg-[#2563EB] text-white border-[#2563EB]" : "bg-slate-100 text-slate-500 border-transparent"}`}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["All", "Placed", "Served", "Paid", "Cancelled"].map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-3 py-1.5 text-[11px] font-pmedium ${filter === value ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-500"}`}>{value}</button>)}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading floor orders...</div>
          ) : (
          <table className="min-w-[900px] w-full text-left">
            <thead className="sticky top-0 z-10 text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
              <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Table</th><th className="px-4 py-3">Waiter</th><th className="px-4 py-3">Rounds</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-center">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visible.length === 0
                ? emptyRow(7, orders.length === 0 ? "No orders for this day." : "No orders match these filters.")
                : visible.map((order) => <tr key={order._id} className="transition-all hover:bg-blue-50/30"><td className="px-4 py-3 text-[12px] font-pmedium text-slate-900">#{order.orderNumber}</td><td className="px-4 py-3 text-[12px] font-pmedium text-slate-900">{tables.find((table) => table._id === order.tableId)?.name || order.tableLabel || "Walk-in"}</td><td className="px-4 py-3 text-[12px] font-pmedium text-slate-600">{order.waiterName || "—"}</td><td className="px-4 py-3 text-[12px] font-pmedium text-slate-600">{order.rounds?.length || 1}</td><td className="px-4 py-3"><span className={pillClass(order.status === "Cancelled" ? "red" : order.status === "Paid" ? "emerald" : order.status === "Served" ? "blue" : "amber")}>{order.status}</span></td><td className="px-4 py-3 text-right text-[12px] font-pmedium text-slate-900">{formatCurrency(order.total)}</td><td className="px-4 py-3 text-center">{order.status === "Served" ? <button type="button" onClick={() => onView(order)} className="inline-flex items-center rounded-xl bg-[#2563EB] px-3 py-2 text-[9px] font-pmedium uppercase tracking-widest text-white shadow-sm hover:bg-blue-700">Discount &amp; settle</button> : <button type="button" onClick={() => onView(order)} className={ACTION_BUTTON} title="View order"><Eye size={14} /></button>}</td></tr>)}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </>
  );
}

function OrderHistoryPanel({
  tables,
  formatCurrency,
  onView,
}: {
  tables: CafeTable[];
  formatCurrency: (value?: number) => string;
  onView: (order: CafeOrder) => void;
}) {
  const [orders, setOrders] = useState<CafeOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
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

  const tableName = (tableId: string | null) => tables.find((table) => table._id === tableId)?.name || "Walk-in";

  const filtered = orders.filter((order) => {
    if (status !== "All" && order.status !== status) return false;
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    return (
      String(order.orderNumber).includes(needle) ||
      (order.customerName || "").toLowerCase().includes(needle) ||
      tableName(order.tableId).toLowerCase().includes(needle)
    );
  });

  const revenue = filtered.filter((order) => order.status === "Paid").reduce((sum, order) => sum + order.total, 0);

  return (
    <>
      <div className="mb-3 mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { key: "orders", label: "Orders", value: String(filtered.length), icon: Receipt, cardClass: baseCardClass, iconClass: "bg-blue-50 text-blue-600" },
          { key: "paid", label: "Paid", value: String(filtered.filter((o) => o.status === "Paid").length), icon: CheckCircle2, cardClass: `${baseCardClass} border-l-4 border-l-emerald-500`, iconClass: "bg-emerald-50 text-emerald-600" },
          { key: "cancelled", label: "Cancelled", value: String(filtered.filter((o) => o.status === "Cancelled").length), icon: XCircle, cardClass: `${baseCardClass} border-l-4 border-l-red-500`, iconClass: "bg-red-50 text-red-600" },
          { key: "revenue", label: "Revenue", value: formatCurrency(revenue), icon: Tag, cardClass: `${baseCardClass} border-l-4 border-l-indigo-500`, iconClass: "bg-indigo-50 text-indigo-600" },
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
          <div className="flex flex-wrap gap-1.5">
            {["All", "Paid", "Cancelled"].map((value) => (
              <button key={value} type="button" onClick={() => setStatus(value)} className={`rounded-lg px-3 py-1.5 text-[11px] font-pmedium ${status === value ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-500"}`}>{value}</button>
            ))}
          </div>
          <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input className={`${FIELD} pl-9`} placeholder="Search order #, customer or table..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <input type="date" className={`${FIELD} w-auto`} value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" />
            <input type="date" className={`${FIELD} w-auto`} value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading history...</div>
          ) : (
            <table className="min-w-[960px] w-full text-left">
              <thead className="sticky top-0 z-10 text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Table</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0
                  ? emptyRow(8, "No orders match these filters.")
                  : filtered.map((order) => (
                      <tr key={order._id} className="transition-all hover:bg-blue-50/30">
                        <td className="px-4 py-3 text-[12px] font-pmedium text-slate-900">#{order.orderNumber}</td>
                        <td className="px-4 py-3 text-[12px] font-pmedium text-slate-900">{tableName(order.tableId)}</td>
                        <td className="px-4 py-3 text-[12px] font-pmedium text-slate-600">{order.customerName || "—"}</td>
                        <td className="px-4 py-3 text-center text-[12px] font-pmedium text-slate-600">{order.items.reduce((sum, line) => sum + line.quantity, 0)}</td>
                        <td className="px-4 py-3 text-[12px] font-pmedium text-slate-500">{new Date(order.billedAt || order.createdAt || "").toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-[12px] font-pmedium text-slate-900">{formatCurrency(order.total)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={pillClass(order.status === "Cancelled" ? "red" : "emerald")} title={order.status === "Cancelled" && order.cancelReason ? `Void reason: ${order.cancelReason}` : undefined}>{order.status}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button type="button" onClick={() => onView(order)} className={ACTION_BUTTON} title="View order"><Eye size={14} /></button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function CafeReportsPanel({ formatCurrency }: { formatCurrency: (value?: number) => string }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  useEffect(() => { getCafeAnalytics(days).then((response) => setData(response?.data?.data)).catch((error) => toast.error(getErrorMessage(error, "Unable to load reports."))); }, [days]);
  const download = () => {
    if (!data) return;
    const rows = [["Date", "Paid orders", "Revenue"], ...data.daily.map((row: any) => [row.date, row.orders, row.revenue])];
    const blob = new Blob([rows.map((row: any[]) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `cafe-report-${days}-days.csv`; anchor.click(); URL.revokeObjectURL(url);
  };
  if (!data) return <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading reports...</div>;

  const cards = [
    { key: "revenue", label: "Revenue", value: formatCurrency(data.summary.revenue), icon: Receipt, cardClass: baseCardClass, iconClass: "bg-blue-50 text-blue-600" },
    { key: "orders", label: "Paid orders", value: data.summary.billedOrders, icon: CheckCircle2, cardClass: `${baseCardClass} border-l-4 border-l-emerald-500`, iconClass: "bg-emerald-50 text-emerald-600" },
    { key: "average", label: "Average bill", value: formatCurrency(data.summary.averageBill), icon: Tag, cardClass: `${baseCardClass} border-l-4 border-l-indigo-500`, iconClass: "bg-indigo-50 text-indigo-600" },
  ];

  return (
    <>
      <div className="mb-3 mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
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
              <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-center">Paid orders</th><th className="px-4 py-3 text-right">Revenue</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.daily.length === 0
                ? emptyRow(3, "No settled bills in this period.")
                : [...data.daily].reverse().map((row: any) => (
                    <tr key={row.date} className="transition-all hover:bg-blue-50/30">
                      <td className="px-4 py-3 text-[12px] font-pmedium text-slate-900">{row.date}</td>
                      <td className="px-4 py-3 text-center text-[12px] font-pmedium text-slate-600">{row.orders}</td>
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

function CafeSettingsPanel({ value, onSaved }: { value: CafeSettings; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState(value); const [busy, setBusy] = useState(false);
  useEffect(() => setForm(value), [value]);
  const save = async () => { setBusy(true); try { await updateCafeSettings(form); toast.success("Cafe settings saved."); await onSaved(); } catch (error) { toast.error(getErrorMessage(error, "Unable to save settings.")); } finally { setBusy(false); } };
  return <div className="mt-8 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 p-5"><div className="rounded-2xl bg-blue-50 p-2 text-blue-600"><Settings2 size={18} /></div><div><h3 className="font-pmedium text-slate-900">Cafe controls</h3><p className="text-[11px] text-slate-500">Bill identity, tax, review QR, and the daily order start time.</p></div></div><div className="grid gap-5 p-6 md:grid-cols-2"><WebsiteFormField label="Company name on bill" value={form.companyName} onChange={(event: any) => setForm({ ...form, companyName: event.target.value })} placeholder="Cafe or company name" /><WebsiteFormField label="Cafe start time" type="time" value={form.cafeStartTime} onChange={(event: any) => setForm({ ...form, cafeStartTime: event.target.value })} /><WebsiteFormField label="Tax percentage" type="number" value={String(form.taxPercent)} onChange={(event: any) => setForm({ ...form, taxPercent: Number(event.target.value) })} /><WebsiteFormField label="Google review link" value={form.googleReviewUrl} onChange={(event: any) => setForm({ ...form, googleReviewUrl: event.target.value })} placeholder="https://g.page/r/..." /><label className="flex items-center gap-2 text-[12px] font-pmedium text-slate-700"><input type="checkbox" checked={form.showReviewQr} onChange={(event) => setForm({ ...form, showReviewQr: event.target.checked })} />Show Google review QR on printed bills</label></div><div className="flex justify-end border-t border-slate-100 p-5"><button type="button" onClick={save} disabled={busy} className={SAVE_BUTTON}>{busy && <Loader2 size={13} className="animate-spin" />} Save settings</button></div></div>;
}

function BulkMenuSheetModal({ categories, onClose, onSaved }: { categories: string[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Array<Partial<CafeMenuItem>>>([]);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<{ created: number; failed: number; fileName: string; errors: string[] } | null>(null);

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const menuSheet = XLSX.utils.aoa_to_sheet([
      ["Item Name", "Category", "Price", "Description", "Available", "Sort Order"],
      ["Classic Cappuccino", categories[0] || "Beverages", 180, "Double espresso with steamed milk", "Yes", 1],
    ]);
    const instructions = XLSX.utils.aoa_to_sheet([
      ["Field", "Required", "Instructions"],
      ["Item Name", "Yes", "Unique display name, maximum 120 characters."],
      ["Category", "Yes", "Use an existing category or enter a new category name."],
      ["Price", "Yes", "Number greater than or equal to zero."],
      ["Description", "No", "Optional description, maximum 500 characters."],
      ["Available", "No", "Yes or No. Defaults to Yes."],
      ["Sort Order", "No", "Whole number controlling display order."],
    ]);
    const categorySheet = XLSX.utils.aoa_to_sheet([["Existing Categories"], ...categories.map((category) => [category])]);
    XLSX.utils.book_append_sheet(workbook, menuSheet, "Menu Items");
    XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
    XLSX.utils.book_append_sheet(workbook, categorySheet, "Category Reference");
    XLSX.writeFile(workbook, "cafe-menu-items-bulk-template.xlsx");
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setRows([]); setError(""); setErrors([]); setSummary(null);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames.includes("Menu Items") ? "Menu Items" : workbook.SheetNames[0];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName], { defval: "" });
      const issues: string[] = [];
      const parsed = rawRows.map((row, index) => {
        const line = index + 2;
        const name = String(row["Item Name"] || row.name || "").trim();
        const category = String(row.Category || row.category || "").trim();
        const rawPrice = row.Price ?? row.price;
        const price = Number(rawPrice);
        const availableText = String(row.Available ?? row.isAvailable ?? "Yes").trim().toLowerCase();
        const sortOrderText = row["Sort Order"] ?? row.sortOrder ?? index;
        if (!name) issues.push(`Row ${line}: Item Name is required.`);
        if (!category) issues.push(`Row ${line}: Category is required.`);
        if (rawPrice === "" || !Number.isFinite(price) || price < 0) issues.push(`Row ${line}: Price must be zero or more.`);
        if (availableText && !["yes", "no", "true", "false", "1", "0"].includes(availableText)) issues.push(`Row ${line}: Available must be Yes or No.`);
        return { name, category, price, description: String(row.Description || row.description || "").trim(), isAvailable: !["no", "false", "0"].includes(availableText), sortOrder: Number.isFinite(Number(sortOrderText)) ? Number(sortOrderText) : index };
      });
      if (!rawRows.length) setError("No menu rows were found in the spreadsheet.");
      setRows(parsed); setErrors(issues);
    } catch {
      setError("The spreadsheet could not be read. Use the downloaded template and keep its column names unchanged.");
    }
  };

  const importRows = async () => {
    if (!rows.length || errors.length) return;
    setBusy(true);
    try {
      await bulkCreateCafeMenuItems(rows);
      setSummary({ created: rows.length, failed: 0, fileName, errors: [] });
      toast.success(`${rows.length} menu items added.`);
      await onSaved();
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, "Unable to import the menu spreadsheet."));
    } finally { setBusy(false); }
  };

  return <BulkUploadModal open title="Bulk Upload Menu Items" description="Download the workbook, complete the required columns, then upload it for validation." fileInputRef={inputRef} accept=".xlsx,.xls,.csv" onClose={onClose} onFileChange={handleFile} onDownloadTemplate={downloadTemplate} downloadLabel="Download Sheets Template" rules={["Required: Item Name, Category, and Price.", "Available accepts Yes or No and defaults to Yes.", "Do not rename the Menu Items sheet or its column headers.", "Up to 500 menu items can be imported at once."]} fileName={fileName} isImporting={busy} staged={Boolean(fileName) && rows.length > 0 && !summary} stagedInfo={errors.length ? `${rows.length} rows detected · ${errors.length} issue${errors.length === 1 ? "" : "s"}` : `${rows.length} validated row${rows.length === 1 ? "" : "s"}`} onConfirmImport={importRows} onChangeFile={() => { setFileName(""); setRows([]); setError(""); setErrors([]); if (inputRef.current) inputRef.current.value = ""; }} importLabel={`Import ${rows.length} Item${rows.length === 1 ? "" : "s"}`} summary={summary} error={error} errors={errors} />;
}

function OwnerOrderDialog({
  order,
  table,
  settings,
  formatCurrency,
  onClose,
  onChanged,
  onSilentChange,
}: {
  order: CafeOrder;
  table?: CafeTable;
  settings: CafeSettings;
  formatCurrency: (value?: number) => string;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onSilentChange: () => Promise<void>;
}) {
  const { prompt } = useAppConfirm();
  const [liveOrder, setLiveOrder] = useState(order);
  const [busy, setBusy] = useState(false);
  const [discountType, setDiscountType] = useState<"none" | "percentage" | "fixed">("none");
  const [discountValue, setDiscountValue] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  useEffect(() => {
    setLiveOrder(order);
  }, [order._id]);

  const discountAmount =
    discountType === "percentage"
      ? Math.min(liveOrder.subtotal, (liveOrder.subtotal * Math.min(100, Number(discountValue || 0))) / 100)
      : discountType === "fixed"
        ? Math.min(liveOrder.subtotal, Number(discountValue || 0))
        : 0;
  const taxableAmount = Math.max(0, liveOrder.subtotal - discountAmount);
  const taxAmount = taxableAmount * (liveOrder.taxPercent / 100);
  const settlementTotal = taxableAmount + taxAmount;

  const markPaid = async () => {
    setBusy(true);
    try {
      await billCafeOrder(liveOrder._id, { discountType, discountValue: discountType === "none" ? 0 : Number(discountValue || 0), paymentMethod });
      toast.success("Payment settled. Table is now free.");
      await onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to settle payment."));
    } finally {
      setBusy(false);
    }
  };

  const print = () => {
    const popup = window.open("", "_blank", "width=420,height=720");
    if (!popup) return toast.error("Allow pop-ups to print the bill.");
    const qr = settings.showReviewQr && settings.googleReviewUrl
      ? `<p style="text-align:center">Review us on Google</p><img style="display:block;width:120px;margin:auto" src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(settings.googleReviewUrl)}">`
      : "";
    popup.document.write(`<h2 style="text-align:center">${settings.companyName || "Cafe Bill"}</h2><p style="text-align:center">Order #${liveOrder.orderNumber} · ${table?.name || liveOrder.tableLabel || "Walk-in"}<br>Waiter: ${liveOrder.waiterName || "—"}</p>${liveOrder.items.map((line) => `<p style="display:flex;justify-content:space-between"><span>${line.quantity} × ${line.name}</span><span>${formatCurrency(line.lineTotal)}</span></p>`).join("")}<hr><p style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${formatCurrency(liveOrder.subtotal)}</span></p>${liveOrder.taxAmount ? `<p style="display:flex;justify-content:space-between"><span>Tax (${liveOrder.taxPercent}%)</span><span>${formatCurrency(liveOrder.taxAmount)}</span></p>` : ""}<h3 style="display:flex;justify-content:space-between"><span>Total</span><span>${formatCurrency(liveOrder.total)}</span></h3>${qr}`);
    popup.document.close();
    popup.print();
  };

  const printKot = (round: { roundNumber: number; label: string; items: CafeOrder["items"] }) => {
    const popup = window.open("", "_blank", "width=420,height=720");
    if (!popup) return toast.error("Allow pop-ups to print this receipt.");
    popup.document.write(`<!doctype html><html><head><title>KOT ${liveOrder.orderNumber}-${round.roundNumber}</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#111}h1{font-size:18px;text-align:center;margin:0 0 4px}.meta{text-align:center;font-size:12px;color:#555;margin-bottom:16px}.line{display:flex;justify-content:space-between;border-bottom:1px dashed #bbb;padding:6px 0}</style></head><body><h1>KITCHEN ORDER TICKET</h1><div class="meta">Order #${liveOrder.orderNumber} · ${table?.name || liveOrder.tableLabel || "Walk-in"}<br>${round.label} · ${liveOrder.waiterName || "Waiter"}</div>${round.items.map((line) => `<div class="line"><span>${line.quantity} × ${line.name}</span></div>`).join("")}${liveOrder.notes ? `<p><strong>Notes:</strong> ${liveOrder.notes}</p>` : ""}</body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const canVoidOrder = !["Served", "Paid"].includes(liveOrder.status);

  const voidOrder = async () => {
    const result = await prompt({
      title: "Void order",
      message: `Void order #${liveOrder.orderNumber}? This cannot be undone.`,
      fields: [{ name: "reason", label: "Reason", placeholder: "e.g. Customer walked out" }],
      confirmLabel: "Void order",
    });
    if (!result) return;
    setBusy(true);
    try {
      await updateCafeOrderStatus(liveOrder._id, "Cancelled", result.reason);
      toast.success("Order voided.");
      await onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to void the order."));
    } finally {
      setBusy(false);
    }
  };

  const voidRoundItem = async (roundNumber: number, line: CafeOrderLine) => {
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

    setBusy(true);
    try {
      const response = await updateCafeOrderRoundItem(liveOrder._id, roundNumber, line.menuItemId, line.quantity - voidQty, result.reason);
      const updated = response?.data?.data as CafeOrder;
      if (updated) setLiveOrder(updated);
      toast.success(`Voided ${voidQty} × ${line.name}.`);
      void onSilentChange();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to void this item."));
    } finally {
      setBusy(false);
    }
  };

  const displayRounds = liveOrder.rounds?.length
    ? liveOrder.rounds
    : [{ roundNumber: 1, label: "Round 1", status: liveOrder.status, items: liveOrder.items }];
  const canVoidItems = !["Served", "Paid", "Cancelled"].includes(liveOrder.status) && Boolean(liveOrder.rounds?.length);

  return (
    <ModalShell
      title={`Order #${liveOrder.orderNumber}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={print} className={CANCEL_BUTTON}>
            <Printer size={13} /> Print bill
          </button>
          {canVoidOrder && (
            <button onClick={voidOrder} disabled={busy} className="inline-flex items-center rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest text-rose-600 hover:bg-rose-50">
              Void order
            </button>
          )}
          {liveOrder.status === "Served" && (
            <button onClick={markPaid} disabled={busy} className={SAVE_BUTTON}>
              {busy && <Loader2 size={13} className="animate-spin" />} Discount &amp; settle bill
            </button>
          )}
          <button onClick={onClose} className={CANCEL_BUTTON}>
            Close
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
        <div><p className={LABEL}>Table</p><p className="font-pmedium text-slate-900">{table?.name || liveOrder.tableLabel || "Walk-in"}</p></div>
        <div><p className={LABEL}>Waiter</p><p className="font-pmedium text-slate-900">{liveOrder.waiterName || "—"}</p></div>
        <div><p className={LABEL}>Status</p><p className="font-pmedium text-slate-900">{liveOrder.status}</p></div>
        <div><p className={LABEL}>Total</p><p className="font-pmedium text-slate-900">{formatCurrency(liveOrder.total)}</p></div>
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto">
        {displayRounds.map((round) => (
          <div key={round.roundNumber} className="rounded-xl border border-slate-100 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-pmedium text-slate-900">{round.label}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">{round.status}</span>
                {round.status !== "Served" && (
                  <button type="button" onClick={() => printKot(round)} aria-label={`Print KOT for ${round.label}`} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                    <Printer size={12} />
                  </button>
                )}
              </div>
            </div>
            {round.items.map((line) => (
              <div key={line.menuItemId} className="flex items-center justify-between py-1 text-[11px] font-pmedium text-slate-900">
                <span>{line.quantity} × {line.name}</span>
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(line.lineTotal)}</span>
                  {canVoidItems && round.status !== "Served" && (
                    <button
                      type="button"
                      onClick={() => voidRoundItem(round.roundNumber, line)}
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
            ))}
          </div>
        ))}
      </div>

      {liveOrder.status === "Served" && (
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
          <WebsiteFormField label="Discount type" select value={discountType} onChange={(event: any) => setDiscountType(event.target.value)}>
            <option value="none">No discount</option>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </WebsiteFormField>
          <WebsiteFormField
            label={discountType === "percentage" ? "Discount %" : "Discount amount"}
            type="number"
            min={0}
            max={discountType === "percentage" ? 100 : undefined}
            disabled={discountType === "none"}
            value={discountValue}
            onChange={(event: any) => setDiscountValue(event.target.value)}
          />
          <WebsiteFormField label="Payment method" select value={paymentMethod} onChange={(event: any) => setPaymentMethod(event.target.value)}>
            <option>Cash</option>
            <option>Card</option>
            <option>UPI</option>
            <option>Bank Transfer</option>
            <option>Other</option>
          </WebsiteFormField>
          <div className="col-span-2 space-y-1 rounded-xl border border-slate-200 bg-white p-3 text-[12px]">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(liveOrder.subtotal)}</span></div>
            {discountAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>−{formatCurrency(discountAmount)}</span></div>}
            <div className="flex justify-between text-slate-600"><span>Tax ({liveOrder.taxPercent}%)</span><span>{formatCurrency(taxAmount)}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-1 font-pmedium text-slate-900"><span>Amount to collect</span><span className="text-[15px]">{formatCurrency(settlementTotal)}</span></div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
