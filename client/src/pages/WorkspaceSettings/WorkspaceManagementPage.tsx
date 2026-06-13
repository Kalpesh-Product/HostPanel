// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MapPin,
  Pencil,
  RefreshCcw,
  Shield,
  Ticket,
  Users,
  Package,
  Boxes,
} from "lucide-react";

import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../../hooks/useAuth";
import { getWorkspaceCount } from "../../utils/workspacePlanAccess";
import {
  getWorkspaceManagementOverview,
  updateManagedWorkspace,
} from "../../services/workspace-management";
import PageFrame from "../../components/Pages/PageFrame";

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const updateStoredUser = (user) => {
  if (!user) return;
  localStorage.setItem("user", JSON.stringify(user));
};

const EMPTY_EDIT_FORM = {
  workspaceName: "",
};

const COMBINED_RECENT_LIMIT = 12;

function MetricCard({ icon: Icon, label, value, tone = "blue" }) {
  const toneClassName = {
    blue: "bg-blue-50 text-[#2563EB]",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  }[tone];

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-[20px] leading-none font-black text-slate-950">{value}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center justify-center rounded-xl p-1.5 ${toneClassName}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

function TabButton({ label, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
        isActive
          ? "bg-[#2563EB] text-white shadow-sm"
          : "bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function StatusPill({ label, value, tone = "slate" }) {
  const toneClassName = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-100 bg-blue-50 text-[#2563EB]",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
  }[tone];

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClassName}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">
        {label}
      </p>
      <p className="mt-1 text-base font-black">{value}</p>
    </div>
  );
}

function WorkspaceEditModal({
  form,
  isSaving,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Edit Unit</h2>
            <p className="mt-1 text-[12px] font-medium text-slate-500">
              Update the unit identity without changing unrelated founder settings.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 md:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Unit Name
            </span>
            <input
              value={form.workspaceName}
              onChange={(event) => onChange("workspaceName", event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-50"
              required
              maxLength={120}
            />
          </label>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#1e4fd1] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CombinedDataModal({ isOpen, onClose, summary, combinedData }) {
  const [activeTab, setActiveTab] = useState("tasks");

  useEffect(() => {
    if (isOpen) {
      setActiveTab("tasks");
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const tabs = [
    { key: "tasks", label: "Tasks" },
    { key: "tickets", label: "Tickets" },
    { key: "assets", label: "Assets" },
    { key: "inventory", label: "Inventory" },
    { key: "bookings", label: "Bookings" },
    { key: "employees", label: "Employees" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div>
            <h2 className="text-lg font-black text-slate-950">Combined Units Data</h2>
            <p className="mt-1 text-[12px] font-medium text-slate-500">
              Unified founder view across tasks, tickets, assets, inventory, bookings, and employees.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Users} label="Employees" value={summary.totalEmployees || 0} tone="blue" />
            <MetricCard icon={Briefcase} label="Departments" value={summary.totalDepartments || 0} tone="emerald" />
            <MetricCard icon={Ticket} label="Tickets" value={summary.totalTickets || 0} tone="amber" />
            <MetricCard icon={CheckCircle2} label="Tasks" value={summary.totalTasks || 0} tone="violet" />
            <MetricCard icon={Package} label="Assets" value={summary.totalAssets || 0} tone="blue" />
            <MetricCard icon={Boxes} label="Inventory" value={summary.totalInventory || 0} tone="emerald" />
            <MetricCard icon={CalendarDays} label="Meeting Bookings" value={summary.totalMeetingBookings || 0} tone="amber" />
            <MetricCard icon={BarChart3} label="Performance" value={`${summary.performance?.overallScore || 0}%`} tone="violet" />
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-3.5">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <TabButton
                  key={tab.key}
                  label={tab.label}
                  isActive={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                />
              ))}
            </div>

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
                        <p className="text-sm font-black text-slate-950">{task.code || "Task"}</p>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">{task.status || "Pending"}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{task.title || "Untitled task"}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">{task.workspaceName} · {task.department || "No department"} · {task.assignee || "Unassigned"}</p>
                    </div>
                  )) : <p className="text-sm font-medium text-slate-500">No tasks found.</p>}
                </div>
              </div>
            ) : null}

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
                        <p className="text-sm font-black text-slate-950">{ticket.code || "Ticket"}</p>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">{ticket.status || "Open"}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{ticket.title || "Untitled ticket"}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">{ticket.workspaceName} · {ticket.department || "No department"} · {ticket.assignedTo || "Unassigned"}</p>
                    </div>
                  )) : <p className="text-sm font-medium text-slate-500">No tickets found.</p>}
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
                        <p className="text-sm font-black text-slate-950">{asset.code || "Asset"}</p>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">{asset.status || "Active"}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{asset.name || "Unnamed asset"}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">{asset.workspaceName} · {asset.department || "No department"} · {asset.category || "Other"} · {asset.assignedTo || "Unassigned"}</p>
                    </div>
                  )) : <p className="text-sm font-medium text-slate-500">No assets found.</p>}
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
                        <p className="text-sm font-black text-slate-950">{item.code || "Inventory"}</p>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">{item.trackingType || "Consumable"}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{item.name || "Unnamed inventory"}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">{item.workspaceName} · {item.department || "No department"} · {item.category || "Other"} · {item.availableQuantity}/{item.totalQuantity} available</p>
                    </div>
                  )) : <p className="text-sm font-medium text-slate-500">No inventory records found.</p>}
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
                        <p className="text-sm font-black text-slate-950">{booking.code || "Booking"}</p>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">{booking.status || "booked"}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{booking.roomName || "Meeting room"} · {booking.startTime || "--:--"} - {booking.endTime || "--:--"}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">{booking.workspaceName} · {booking.department || "No department"} · {booking.bookingType || "Internal"} · {booking.bookedByName || "Unknown"}</p>
                    </div>
                  )) : <p className="text-sm font-medium text-slate-500">No meeting room bookings found.</p>}
                </div>
              </div>
            ) : null}

            {activeTab === "employees" ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total Employees</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{summary.totalEmployees || 0}</p>
                </div>
                <div className="space-y-3">
                  {combinedData.employees.recent.length > 0 ? combinedData.employees.recent.map((employee) => (
                    <div key={`employee-${employee.workspaceId}-${employee.id}-${employee.email}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black text-slate-950">{employee.fullName || "Member"}</p>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">{employee.roleLabel || "Member"}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-700">{employee.email || "No email"}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">{employee.workspaceName}</p>
                    </div>
                  )) : <p className="text-sm font-medium text-slate-500">No employees found.</p>}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceManagementPage() {
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const workspaceCount = getWorkspaceCount(
    (auth?.user as { workspaceCount?: number } | null)?.workspaceCount ??
      (currentUser as { workspaceCount?: number } | null)?.workspaceCount,
  );
  const planLabel = String(
    (auth?.user as { workspace?: { selectedPlan?: string }; selectedPlan?: string } | null)?.workspace
      ?.selectedPlan ||
      (auth?.user as { selectedPlan?: string } | null)?.selectedPlan ||
      "basic",
  )
    .trim()
    .toLowerCase();
  const isWorkspaceManagementLocked = !(planLabel === "professional" && workspaceCount > 1);
  const [departmentFilter, setDepartmentFilter] = useState("All departments");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTabs, setActiveTabs] = useState({});
  const [expandedWorkspaceId, setExpandedWorkspaceId] = useState("");
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isCombinedModalOpen, setIsCombinedModalOpen] = useState(false);

  useEffect(() => {
    if (isWorkspaceManagementLocked) {
      toast.error("Upgrade plan to unlock this");
      navigate("/company-settings/workspace-settings", { replace: true });
      return;
    }
  }, [isWorkspaceManagementLocked, navigate]);

  useEffect(() => {
    let isMounted = true;

    async function loadOverview() {
      setIsLoading(true);

      try {
        const response = await getWorkspaceManagementOverview(
          axiosPrivate,
          departmentFilter === "All departments" ? "" : departmentFilter,
        );

        if (isMounted) {
          setOverview(response?.data?.data || null);
        }
      } catch (error) {
        if (isMounted) {
          toast.error(error.message || "Unable to load unit management.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (!isWorkspaceManagementLocked) {
      loadOverview();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [axiosPrivate, departmentFilter, isWorkspaceManagementLocked]);

  const workspaceList = Array.isArray(overview?.workspaces) ? overview.workspaces : [];
  const displayedWorkspaces =
    workspaceFilter === "all"
      ? workspaceList
      : workspaceList.filter((workspace) => workspace.id === workspaceFilter);
  const departmentOptions = Array.isArray(overview?.departments)
    ? overview.departments
    : ["All departments"];
  const summary = overview?.summary || {
    totalEmployees: 0,
    totalDepartments: 0,
    totalTickets: 0,
    totalTasks: 0,
    totalAssets: 0,
    totalInventory: 0,
    totalMeetingBookings: 0,
    performance: {
      overallScore: 0,
    },
  };

  const combinedData = useMemo(() => {
    const byStatus = (entries = []) => {
      const counts = new Map();
      entries.forEach((entry) => {
        const key = String(entry?.status || "").trim() || "Unknown";
        counts.set(key, (counts.get(key) || 0) + Number(entry?.count || 0));
      });
      return Array.from(counts.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
    };

    const normalizeRecentWithWorkspace = (detailsKey, mapper) => (
      workspaceList.flatMap((workspace) =>
        (workspace?.details?.[detailsKey]?.recent || []).map((item) => mapper(item, workspace)),
      ).slice(0, COMBINED_RECENT_LIMIT)
    );

    const taskByStatusEntries = workspaceList.flatMap((workspace) => workspace?.details?.tasks?.byStatus || []);
    const ticketByStatusEntries = workspaceList.flatMap((workspace) => workspace?.details?.tickets?.byStatus || []);
    const assetByStatusEntries = workspaceList.flatMap((workspace) => workspace?.details?.assets?.byStatus || []);
    const bookingByStatusEntries = workspaceList.flatMap((workspace) => workspace?.details?.bookings?.byStatus || []);
    const inventoryByCategoryEntries = workspaceList.flatMap((workspace) => workspace?.details?.inventory?.byCategory || []);
    const inventoryByTrackingEntries = workspaceList.flatMap((workspace) => workspace?.details?.inventory?.byTrackingType || []);

    return {
      tasks: {
        byStatus: byStatus(taskByStatusEntries),
        recent: normalizeRecentWithWorkspace("tasks", (item, workspace) => ({ ...item, workspaceName: workspace.workspaceName, workspaceId: workspace.id })),
      },
      tickets: {
        byStatus: byStatus(ticketByStatusEntries),
        recent: normalizeRecentWithWorkspace("tickets", (item, workspace) => ({ ...item, workspaceName: workspace.workspaceName, workspaceId: workspace.id })),
      },
      assets: {
        byStatus: byStatus(assetByStatusEntries),
        recent: normalizeRecentWithWorkspace("assets", (item, workspace) => ({ ...item, workspaceName: workspace.workspaceName, workspaceId: workspace.id })),
      },
      inventory: {
        byCategory: byStatus(inventoryByCategoryEntries),
        byTrackingType: byStatus(inventoryByTrackingEntries),
        recent: normalizeRecentWithWorkspace("inventory", (item, workspace) => ({ ...item, workspaceName: workspace.workspaceName, workspaceId: workspace.id })),
      },
      bookings: {
        byStatus: byStatus(bookingByStatusEntries),
        recent: normalizeRecentWithWorkspace("bookings", (item, workspace) => ({ ...item, workspaceName: workspace.workspaceName, workspaceId: workspace.id })),
      },
      employees: {
        recent: workspaceList
          .flatMap((workspace) =>
            (workspace?.details?.employees || []).map((employee) => ({
              ...employee,
              workspaceName: workspace.workspaceName,
              workspaceId: workspace.id,
            })),
          )
          .slice(0, COMBINED_RECENT_LIMIT),
      },
    };
  }, [workspaceList]);

  const canManageModule = currentUser?.workspaceCapabilities?.canManageWorkspaces;

  useEffect(() => {
    if (canManageModule === false) {
      navigate("/dashboard/core/settings", { replace: true });
    }
  }, [canManageModule, navigate]);

  const activeWorkspaceName = useMemo(
    () => workspaceList.find((workspace) => workspace.isActiveWorkspace)?.workspaceName || "Unit",
    [workspaceList],
  );

  function getActiveTab(workspaceId) {
    return activeTabs[workspaceId] || "employees";
  }

  function setActiveTab(workspaceId, nextTab) {
    setActiveTabs((current) => ({
      ...current,
      [workspaceId]: nextTab,
    }));
  }

  function handleToggleWorkspace(workspaceId) {
    setExpandedWorkspaceId((current) => (current === workspaceId ? "" : workspaceId));
  }

  function handleOpenEdit(workspace) {
    setEditingWorkspace(workspace);
    setEditForm({
      workspaceName: workspace.workspaceName || "",
    });
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    if (!editingWorkspace?.id) {
      return;
    }

    setIsSavingEdit(true);

    try {
      await updateManagedWorkspace(
        axiosPrivate,
        editingWorkspace.id,
        {
          profile: { workspaceName: editForm.workspaceName },
        },
      );
      const refreshed = await getWorkspaceManagementOverview(
        axiosPrivate,
        departmentFilter === "All departments" ? "" : departmentFilter,
      );
      if (refreshed?.data?.currentUser) {
        updateStoredUser(refreshed.data.currentUser);
      }
      setOverview(refreshed?.data?.data || null);
      setEditingWorkspace(null);
      setEditForm(EMPTY_EDIT_FORM);
      toast.success("Unit updated successfully.");
    } catch (error) {
      toast.error(error.message || "Unable to update unit.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  return (
    <>
        <PageFrame>
        <div className="w-full space-y-5 p-2 lg:p-2.5">
          <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase">
                Unit Management
              </h2>
              <p className="mt-2 max-w-3xl text-[12px] font-medium leading-6 text-slate-500">
                Review every unit linked to this founder account and compare operational health from one place.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="h-11 inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-600 whitespace-nowrap">
                Current unit: <span className="text-slate-950 ml-1">{activeWorkspaceName}</span>
              </div>
              <label className="grid gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Unit Filter
                </span>
                <select
                  value={workspaceFilter}
                  onChange={(event) => {
                    setWorkspaceFilter(event.target.value);
                    setExpandedWorkspaceId("");
                  }}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-50"
                >
                  <option value="all">All units</option>
                  {workspaceList.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.workspaceName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Department Filter
                </span>
                <select
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-50"
                >
                  {departmentOptions.map((departmentName) => (
                    <option key={departmentName} value={departmentName}>
                      {departmentName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
            <MetricCard icon={Users} label="Employees" value={summary.totalEmployees} tone="blue" />
            <MetricCard icon={Briefcase} label="Departments" value={summary.totalDepartments} tone="emerald" />
            <MetricCard icon={Ticket} label="Tickets" value={summary.totalTickets} tone="amber" />
            <MetricCard icon={CheckCircle2} label="Tasks" value={summary.totalTasks} tone="violet" />
            <MetricCard icon={Package} label="Assets" value={summary.totalAssets || 0} tone="blue" />
            <MetricCard icon={Boxes} label="Inventory" value={summary.totalInventory || 0} tone="emerald" />
            <MetricCard icon={CalendarDays} label="Meeting Bookings" value={summary.totalMeetingBookings || 0} tone="amber" />
            <MetricCard icon={BarChart3} label="Performance" value={`${summary.performance?.overallScore || 0}%`} tone="blue" />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-bold text-slate-950">All Units</h2>
                <p className="mt-1 text-[12px] font-medium text-slate-500">
                  {departmentFilter === "All departments"
                    ? "Founder-level combined view across every active unit."
                    : `Metrics filtered to ${departmentFilter}.`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCombinedModalOpen(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-[12px] font-semibold text-[#2563EB] transition hover:bg-blue-100"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  View Units Data
                </button>
                <button
                  type="button"
                  onClick={() => setDepartmentFilter("All departments")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Reset Filter
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="mt-6 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading unit management...
              </div>
            ) : (
              <div className="mt-5 grid gap-3.5">
                {displayedWorkspaces.map((workspace) => (
                  <article
                    key={workspace.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-[16px] font-black text-slate-950">
                            {workspace.workspaceName}
                          </h3>
                          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                            {workspace.status}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[12px] font-semibold text-slate-600">
                          {workspace.businessName || "Business name not set"}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[12px] font-medium text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {workspace.location || "Location not set"}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {workspace.createdAt ? new Date(workspace.createdAt).toLocaleDateString() : "Date unavailable"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <div
                          className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-semibold ${
                            workspace.isActiveWorkspace
                              ? "border-blue-200 bg-blue-50 text-[#2563EB]"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {workspace.isActiveWorkspace ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Building2 className="h-3.5 w-3.5" />
                          )}
                          {workspace.isActiveWorkspace ? "Current Unit" : "Linked Unit"}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleWorkspace(workspace.id)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          {expandedWorkspaceId === workspace.id ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                          {expandedWorkspaceId === workspace.id ? "Hide Details" : "View Details"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(workspace)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit Unit
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-8">
                      <MetricCard icon={Users} label="Employees" value={workspace.metrics.totalEmployees} tone="blue" />
                      <MetricCard icon={Briefcase} label="Departments" value={workspace.metrics.totalDepartments} tone="emerald" />
                      <MetricCard icon={Ticket} label="Tickets" value={workspace.metrics.totalTickets} tone="amber" />
                      <MetricCard icon={CheckCircle2} label="Tasks" value={workspace.metrics.totalTasks} tone="violet" />
                      <MetricCard icon={Package} label="Assets" value={workspace.metrics.totalAssets || 0} tone="blue" />
                      <MetricCard icon={Boxes} label="Inventory" value={workspace.metrics.totalInventory || 0} tone="emerald" />
                      <MetricCard icon={CalendarDays} label="Meeting Bookings" value={workspace.metrics.totalMeetingBookings || 0} tone="amber" />
                      <MetricCard icon={BarChart3} label="Performance" value={`${workspace.metrics.performance?.overallScore || 0}%`} tone="blue" />
                    </div>

                    {expandedWorkspaceId === workspace.id ? (
                    <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap gap-2">
                        <TabButton
                          label="Employees"
                          isActive={getActiveTab(workspace.id) === "employees"}
                          onClick={() => setActiveTab(workspace.id, "employees")}
                        />
                        <TabButton
                          label="Roles"
                          isActive={getActiveTab(workspace.id) === "roles"}
                          onClick={() => setActiveTab(workspace.id, "roles")}
                        />
                        <TabButton
                          label="Work Items"
                          isActive={getActiveTab(workspace.id) === "work"}
                          onClick={() => setActiveTab(workspace.id, "work")}
                        />
                        <TabButton
                          label="Departments"
                          isActive={getActiveTab(workspace.id) === "departments"}
                          onClick={() => setActiveTab(workspace.id, "departments")}
                        />
                      </div>

                      {getActiveTab(workspace.id) === "employees" ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {(workspace.details?.employees || []).length > 0 ? (
                            workspace.details.employees.map((employee) => (
                              <article
                                key={employee.id || `${workspace.id}-${employee.email}`}
                                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-950">
                                      {employee.fullName}
                                    </p>
                                    <p className="mt-1 truncate text-xs font-medium text-slate-500">
                                      {employee.email}
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 shadow-sm">
                                    {employee.roleLabel}
                                  </span>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                                  {employee.employeeId ? (
                                    <span className="rounded-full bg-white px-3 py-1">
                                      {employee.employeeId}
                                    </span>
                                  ) : null}
                                  {(employee.departments || []).map((departmentName) => (
                                    <span
                                      key={`${employee.id}-${departmentName}`}
                                      className="rounded-full bg-blue-50 px-3 py-1 text-[#2563EB]"
                                    >
                                      {departmentName}
                                    </span>
                                  ))}
                                </div>
                              </article>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-500 md:col-span-2">
                              No workspace members found yet.
                            </div>
                          )}
                        </div>
                      ) : null}

                      {getActiveTab(workspace.id) === "roles" ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          {(workspace.details?.roles || []).map((roleItem) => (
                            <StatusPill
                              key={`${workspace.id}-${roleItem.role}`}
                              label={roleItem.label}
                              value={roleItem.count}
                              tone="blue"
                            />
                          ))}
                        </div>
                      ) : null}

                      {getActiveTab(workspace.id) === "work" ? (
                        <div className="mt-4 space-y-4">
                          <div className="grid gap-4 xl:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex items-center gap-2">
                                <Ticket className="h-4 w-4 text-amber-600" />
                                <h4 className="text-sm font-bold text-slate-950">Ticket Status</h4>
                              </div>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {(workspace.details?.tickets?.byStatus || []).map((item) => (
                                  <StatusPill
                                    key={`${workspace.id}-ticket-${item.status}`}
                                    label={item.status}
                                    value={item.count}
                                    tone="amber"
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex items-center gap-2">
                                <ClipboardList className="h-4 w-4 text-violet-600" />
                                <h4 className="text-sm font-bold text-slate-950">Task Status</h4>
                              </div>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {(workspace.details?.tasks?.byStatus || []).map((item) => (
                                  <StatusPill
                                    key={`${workspace.id}-task-${item.status}`}
                                    label={item.status}
                                    value={item.count}
                                    tone="violet"
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 xl:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <h4 className="text-sm font-bold text-slate-950">Recent Tickets</h4>
                              <div className="mt-3 space-y-3">
                                {(workspace.details?.tickets?.recent || []).length > 0 ? (
                                  workspace.details.tickets.recent.map((ticketItem) => (
                                    <div
                                      key={ticketItem.id || ticketItem.code}
                                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-bold text-slate-950">{ticketItem.code}</p>
                                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                                          {ticketItem.status}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-sm font-medium text-slate-600">
                                        {ticketItem.title}
                                      </p>
                                      <p className="mt-2 text-xs font-semibold text-slate-500">
                                        {ticketItem.department || "No department"} · {ticketItem.assignedTo || "Unassigned"}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm font-medium text-slate-500">No tickets yet.</p>
                                )}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <h4 className="text-sm font-bold text-slate-950">Recent Tasks</h4>
                              <div className="mt-3 space-y-3">
                                {(workspace.details?.tasks?.recent || []).length > 0 ? (
                                  workspace.details.tasks.recent.map((taskItem) => (
                                    <div
                                      key={taskItem.id || taskItem.code}
                                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-bold text-slate-950">{taskItem.code}</p>
                                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                                          {taskItem.status}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-sm font-medium text-slate-600">
                                        {taskItem.title}
                                      </p>
                                      <p className="mt-2 text-xs font-semibold text-slate-500">
                                        {taskItem.department || "No department"} · {taskItem.assignee || "Unassigned"}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm font-medium text-slate-500">No tasks yet.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {getActiveTab(workspace.id) === "departments" ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {(workspace.details?.departments || []).length > 0 ? (
                            workspace.details.departments.map((departmentItem) => (
                              <article
                                key={`${workspace.id}-${departmentItem.name}`}
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                              >
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4 text-emerald-600" />
                                  <h4 className="text-sm font-bold text-slate-950">
                                    {departmentItem.name}
                                  </h4>
                                </div>
                                <div className="mt-4 grid gap-3">
                                  <StatusPill label="Employees" value={departmentItem.totalEmployees} tone="blue" />
                                  <StatusPill label="Tickets" value={departmentItem.totalTickets} tone="amber" />
                                  <StatusPill label="Tasks" value={departmentItem.totalTasks} tone="violet" />
                                </div>
                              </article>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-500 md:col-span-2 xl:col-span-3">
                              No department data is available for this workspace yet.
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
        </PageFrame>

      {editingWorkspace ? (
        <WorkspaceEditModal
          form={editForm}
          isSaving={isSavingEdit}
          onChange={(field, value) =>
            setEditForm((current) => ({ ...current, [field]: value }))
          }
          onClose={() => {
            if (isSavingEdit) {
              return;
            }
            setEditingWorkspace(null);
            setEditForm(EMPTY_EDIT_FORM);
          }}
          onSubmit={handleSaveEdit}
        />
      ) : null}

      <CombinedDataModal
        isOpen={isCombinedModalOpen}
        onClose={() => setIsCombinedModalOpen(false)}
        summary={summary}
        combinedData={combinedData}
      />
    </>
  );
}
