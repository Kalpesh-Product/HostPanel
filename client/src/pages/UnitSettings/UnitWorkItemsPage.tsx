import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Boxes, CalendarDays, ClipboardList, Package, Ticket } from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import DonutChart from "../../components/graphs/DonutChart";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { getWorkspaceManagementOverview } from "../../services/unit-management";

type StatusEntry = { status?: string; count?: number };
type RecentItem = Record<string, any>;

type WorkspaceDetails = {
  tickets?: { byStatus?: StatusEntry[]; recent?: RecentItem[] };
  tasks?: { byStatus?: StatusEntry[]; recent?: RecentItem[] };
  assets?: { byStatus?: StatusEntry[]; recent?: RecentItem[] };
  inventory?: { byCategory?: StatusEntry[]; byTrackingType?: StatusEntry[]; recent?: RecentItem[] };
  bookings?: { byStatus?: StatusEntry[]; recent?: RecentItem[] };
};

type Workspace = {
  id: string;
  workspaceName?: string;
  businessName?: string;
  isDeleted?: boolean;
  selectedPlan?: string;
  details?: WorkspaceDetails;
};

type Summary = {
  totalTickets?: number;
  totalTasks?: number;
  totalAssets?: number;
  totalInventory?: number;
  totalMeetingBookings?: number;
};

type Overview = { workspaces?: Workspace[]; summary?: Summary };

const WORKLOAD_COLORS = ["#2563EB", "#F59E0B", "#7C3AED", "#0F766E", "#64748B"];
const COMBINED_RECENT_LIMIT = 12;

function StatTile({ icon: Icon, label, value, tone = "amber" }) {
  const toneClassName = {
    amber: "border-l-amber-500 bg-amber-50 text-amber-700",
    violet: "border-l-violet-500 bg-violet-50 text-violet-700",
    rose: "border-l-rose-500 bg-rose-50 text-rose-700",
    cyan: "border-l-cyan-500 bg-cyan-50 text-cyan-700",
    orange: "border-l-orange-500 bg-orange-50 text-orange-700",
  }[tone];

  return (
    <div className="flex min-h-[96px] items-center gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-l-2 ${toneClassName}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">{label}</p>
        <p className="mt-1 truncate text-[20px] font-pmedium leading-none text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function StatusPill({ label, value, tone = "slate" }) {
  const toneClassName = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    blue: "border-blue-100 bg-blue-50 text-[#2563EB]",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClassName}`}>
      <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="mt-1 text-[15px] font-pmedium text-slate-900">{value}</p>
    </div>
  );
}

function TabButton({ label, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-1.5 text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${isActive
        ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
        : "bg-transparent text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
        }`}
    >
      {label}
    </button>
  );
}

export default function UnitWorkItemsPage() {
  const axiosPrivate = useAxiosPrivate();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tickets");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await getWorkspaceManagementOverview(axiosPrivate);
        if (mounted) setOverview(response?.data?.data || null);
      } catch (error: any) {
        if (mounted) toast.error(error?.response?.data?.message || "Unable to load work item data.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [axiosPrivate]);

  const workspaceList = useMemo(
    () => (Array.isArray(overview?.workspaces) ? overview.workspaces.filter((workspace) => !workspace.isDeleted) : []),
    [overview?.workspaces],
  );
  const summary = overview?.summary || {};

  const workloadRows = [
    { label: "Tickets", value: Number(summary.totalTickets || 0) },
    { label: "Tasks", value: Number(summary.totalTasks || 0) },
    { label: "Bookings", value: Number(summary.totalMeetingBookings || 0) },
    { label: "Assets", value: Number(summary.totalAssets || 0) },
    { label: "Inventory", value: Number(summary.totalInventory || 0) },
  ].filter((item) => item.value > 0);

  const combinedData = useMemo(() => {
    const byStatus = (entries: StatusEntry[] = []) => {
      const counts = new Map<string, number>();
      entries.forEach((entry) => {
        const key = String(entry?.status || "").trim() || "Unknown";
        counts.set(key, (counts.get(key) || 0) + Number(entry?.count || 0));
      });
      return Array.from(counts.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
    };

    const normalizeRecentWithWorkspace = (detailsKey: keyof WorkspaceDetails) =>
      workspaceList
        .flatMap((workspace) =>
          ((workspace.details?.[detailsKey] as any)?.recent || []).map((item: RecentItem) => ({
            ...item,
            workspaceName: workspace.workspaceName || workspace.businessName || "Unnamed unit",
            workspaceId: workspace.id,
          })),
        )
        .slice(0, COMBINED_RECENT_LIMIT);

    return {
      tickets: {
        byStatus: byStatus(workspaceList.flatMap((workspace) => workspace.details?.tickets?.byStatus || [])),
        recent: normalizeRecentWithWorkspace("tickets"),
      },
      tasks: {
        byStatus: byStatus(workspaceList.flatMap((workspace) => workspace.details?.tasks?.byStatus || [])),
        recent: normalizeRecentWithWorkspace("tasks"),
      },
      assets: {
        byStatus: byStatus(workspaceList.flatMap((workspace) => workspace.details?.assets?.byStatus || [])),
        recent: normalizeRecentWithWorkspace("assets"),
      },
      inventory: {
        byCategory: byStatus(workspaceList.flatMap((workspace) => workspace.details?.inventory?.byCategory || [])),
        byTrackingType: byStatus(workspaceList.flatMap((workspace) => workspace.details?.inventory?.byTrackingType || [])),
        recent: normalizeRecentWithWorkspace("inventory"),
      },
      bookings: {
        byStatus: byStatus(workspaceList.flatMap((workspace) => workspace.details?.bookings?.byStatus || [])),
        recent: normalizeRecentWithWorkspace("bookings"),
      },
    };
  }, [workspaceList]);

  const tabs = [
    { key: "tickets", label: "Tickets" },
    { key: "tasks", label: "Tasks" },
    { key: "assets", label: "Assets" },
    { key: "inventory", label: "Inventory" },
    { key: "bookings", label: "Meeting Room Bookings" },
  ];

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        {isLoading ? (
          <div className="bg-white/80 rounded-2xl border border-slate-100 shadow-sm min-h-[400px] animate-pulse" />
        ) : (
          <div className="flex flex-col gap-4 text-slate-700 font-sans">
            <div className="mb-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
              <div>
                <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                  Work Items
                </h2>
                <p className="text-xs font-pmedium text-slate-500 mt-1">
                  Tasks, tickets, assets, inventory, and bookings across every linked unit.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatTile icon={Ticket} label="Tickets" value={Number(summary.totalTickets || 0)} tone="amber" />
              <StatTile icon={ClipboardList} label="Tasks" value={Number(summary.totalTasks || 0)} tone="violet" />
              <StatTile icon={Package} label="Assets" value={Number(summary.totalAssets || 0)} tone="rose" />
              <StatTile icon={Boxes} label="Inventory" value={Number(summary.totalInventory || 0)} tone="cyan" />
              <StatTile icon={CalendarDays} label="Meeting Bookings" value={Number(summary.totalMeetingBookings || 0)} tone="orange" />
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">Operational workload</h3>
                <p className="mt-1 text-[11px] text-slate-500">Current work and resource records across all units.</p>
              </div>
              <div className="p-5">
                {workloadRows.length ? (
                  <DonutChart
                    centerLabel="Records"
                    labels={workloadRows.map((item) => item.label)}
                    series={workloadRows.map((item) => item.value)}
                    colors={WORKLOAD_COLORS.slice(0, workloadRows.length)}
                    tooltipValue={workloadRows.map((item) => `${item.value} records`)}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-[11px] text-slate-500">
                    No operational workload has been recorded yet.
                  </div>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">Work item detail</h3>
                <p className="mt-1 text-[11px] text-slate-500">Status breakdown and recent records across all units.</p>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-1 rounded-2xl bg-slate-100/70 p-1 flex-wrap">
                  {tabs.map((tab) => (
                    <TabButton
                      key={tab.key}
                      label={tab.label}
                      isActive={activeTab === tab.key}
                      onClick={() => setActiveTab(tab.key)}
                    />
                  ))}
                </div>

                {activeTab === "tickets" ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                      {combinedData.tickets.byStatus.map((item) => (
                        <StatusPill key={`ticket-${item.status}`} label={item.status} value={item.count} tone="amber" />
                      ))}
                    </div>
                    <div className="space-y-3">
                      {combinedData.tickets.recent.length > 0 ? combinedData.tickets.recent.map((ticket) => (
                        <div key={`ticket-${ticket.workspaceId}-${ticket.id}-${ticket.code}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-pmedium text-slate-950">{ticket.code || "Ticket"}</p>
                            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-pmedium uppercase tracking-[0.16em] text-slate-600">{ticket.status || "Open"}</span>
                          </div>
                          <p className="mt-1 text-sm font-pmedium text-slate-700">{ticket.title || "Untitled ticket"}</p>
                          <p className="mt-2 text-xs font-pmedium text-slate-500">{ticket.workspaceName} · {ticket.department || "No department"} · {ticket.assignedTo || "Unassigned"}</p>
                        </div>
                      )) : <p className="text-sm font-pmedium text-slate-500">No tickets found.</p>}
                    </div>
                  </div>
                ) : null}

                {activeTab === "tasks" ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                      {combinedData.tasks.byStatus.map((item) => (
                        <StatusPill key={`task-${item.status}`} label={item.status} value={item.count} tone="violet" />
                      ))}
                    </div>
                    <div className="space-y-3">
                      {combinedData.tasks.recent.length > 0 ? combinedData.tasks.recent.map((task) => (
                        <div key={`task-${task.workspaceId}-${task.id}-${task.code}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-pmedium text-slate-950">{task.code || "Task"}</p>
                            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-pmedium uppercase tracking-[0.16em] text-slate-600">{task.status || "Pending"}</span>
                          </div>
                          <p className="mt-1 text-sm font-pmedium text-slate-700">{task.title || "Untitled task"}</p>
                          <p className="mt-2 text-xs font-pmedium text-slate-500">{task.workspaceName} · {task.department || "No department"} · {task.assignee || "Unassigned"}</p>
                        </div>
                      )) : <p className="text-sm font-pmedium text-slate-500">No tasks found.</p>}
                    </div>
                  </div>
                ) : null}

                {activeTab === "assets" ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                      {combinedData.assets.byStatus.map((item) => (
                        <StatusPill key={`asset-${item.status}`} label={item.status} value={item.count} tone="blue" />
                      ))}
                    </div>
                    <div className="space-y-3">
                      {combinedData.assets.recent.length > 0 ? combinedData.assets.recent.map((asset) => (
                        <div key={`asset-${asset.workspaceId}-${asset.id}-${asset.code}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-pmedium text-slate-950">{asset.code || "Asset"}</p>
                            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-pmedium uppercase tracking-[0.16em] text-slate-600">{asset.status || "Active"}</span>
                          </div>
                          <p className="mt-1 text-sm font-pmedium text-slate-700">{asset.name || "Unnamed asset"}</p>
                          <p className="mt-2 text-xs font-pmedium text-slate-500">{asset.workspaceName} · {asset.department || "No department"} · {asset.category || "Other"} · {asset.assignedTo || "Unassigned"}</p>
                        </div>
                      )) : <p className="text-sm font-pmedium text-slate-500">No assets found.</p>}
                    </div>
                  </div>
                ) : null}

                {activeTab === "inventory" ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {combinedData.inventory.byCategory.map((item) => (
                        <StatusPill key={`inventory-category-${item.status}`} label={item.status} value={item.count} tone="emerald" />
                      ))}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {combinedData.inventory.byTrackingType.map((item) => (
                        <StatusPill key={`inventory-tracking-${item.status}`} label={item.status} value={item.count} tone="blue" />
                      ))}
                    </div>
                    <div className="space-y-3">
                      {combinedData.inventory.recent.length > 0 ? combinedData.inventory.recent.map((item) => (
                        <div key={`inventory-${item.workspaceId}-${item.id}-${item.code}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-pmedium text-slate-950">{item.code || "Inventory"}</p>
                            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-pmedium uppercase tracking-[0.16em] text-slate-600">{item.trackingType || "Consumable"}</span>
                          </div>
                          <p className="mt-1 text-sm font-pmedium text-slate-700">{item.name || "Unnamed inventory"}</p>
                          <p className="mt-2 text-xs font-pmedium text-slate-500">{item.workspaceName} · {item.department || "No department"} · {item.category || "Other"} · {item.availableQuantity}/{item.totalQuantity} available</p>
                        </div>
                      )) : <p className="text-sm font-pmedium text-slate-500">No inventory records found.</p>}
                    </div>
                  </div>
                ) : null}

                {activeTab === "bookings" ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                      {combinedData.bookings.byStatus.map((item) => (
                        <StatusPill key={`booking-${item.status}`} label={item.status} value={item.count} tone="amber" />
                      ))}
                    </div>
                    <div className="space-y-3">
                      {combinedData.bookings.recent.length > 0 ? combinedData.bookings.recent.map((booking) => (
                        <div key={`booking-${booking.workspaceId}-${booking.id}-${booking.code}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-pmedium text-slate-950">{booking.code || "Booking"}</p>
                            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-pmedium uppercase tracking-[0.16em] text-slate-600">{booking.status || "booked"}</span>
                          </div>
                          <p className="mt-1 text-sm font-pmedium text-slate-700">{booking.roomName || "Meeting room"} · {booking.startTime || "--:--"} - {booking.endTime || "--:--"}</p>
                          <p className="mt-2 text-xs font-pmedium text-slate-500">{booking.workspaceName} · {booking.department || "No department"} · {booking.bookingType || "Internal"} · {booking.bookedByName || "Unknown"}</p>
                        </div>
                      )) : <p className="text-sm font-pmedium text-slate-500">No meeting room bookings found.</p>}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        )}
      </PageFrame>
    </div>
  );
}
