import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeftRight,
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
  Power,
  PowerOff,
  RefreshCcw,
  RotateCcw,
  Shield,
  Ticket,
  Trash2,
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
  setWorkspaceStatus,
  deleteManagedWorkspace,
  requestWorkspaceRecovery,
} from "../../services/unit-management";
import { switchWorkspaceSession } from "../../services/workspace-session";
import PageFrame from "../../components/Pages/PageFrame";

// Type definitions
interface Workspace {
  id: string;
  workspaceName: string;
  selectedPlan?: string;
  [key: string]: any;
}

interface Department {
  name: string;
  [key: string]: any;
}

interface Summary {
  totalEmployees: number;
  totalDepartments: number;
  totalTickets: number;
  totalTasks: number;
  totalAssets: number;
  totalInventory: number;
  totalMeetingBookings: number;
  performance: {
    overallScore: number;
  };
}

interface Overview {
  workspaces?: Workspace[];
  departments?: string[] | Department[];
  summary?: Summary;
  [key: string]: any;
}

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
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
    cyan: "bg-cyan-50 text-cyan-600",
    orange: "bg-orange-50 text-orange-600",
    indigo: "bg-indigo-50 text-indigo-600",
    slate: "bg-slate-50 text-slate-600",
  }[tone];

  const accentClassName = {
    blue: "border-l-4 border-l-blue-500",
    emerald: "border-l-4 border-l-emerald-500",
    amber: "border-l-4 border-l-amber-500",
    violet: "border-l-4 border-l-violet-500",
    rose: "border-l-4 border-l-rose-500",
    cyan: "border-l-4 border-l-cyan-500",
    orange: "border-l-4 border-l-orange-500",
    indigo: "border-l-4 border-l-indigo-500",
    slate: "",
  }[tone];

  return (
    <div className={`w-full bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${accentClassName}`}>
      <div className="min-w-0">
        <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">
          {label}
        </p>
        <p className="text-[15px] font-pmedium text-slate-900 truncate">{value}</p>
      </div>
      <div className={`p-2 rounded-2xl ${toneClassName} shrink-0`}>
        <Icon size={16} />
      </div>
    </div>
  );
}

function CardsGridSkeleton({ count = 8 }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center animate-pulse">
            <div className="min-w-0">
              <div className="h-3 w-20 bg-slate-200 rounded mb-2" />
              <div className="h-5 w-12 bg-slate-200 rounded" />
            </div>
            <div className="p-2 rounded-2xl bg-slate-100 shrink-0">
              <div className="h-4 w-4 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white/80 rounded-2xl border border-slate-100 shadow-sm min-h-[400px] animate-pulse" />
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
      <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">
        {label}
      </p>
      <p className="mt-1 text-[15px] font-pmedium text-slate-900">{value}</p>
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
      <div className="w-full max-w-xl rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Edit Unit</p>
            <p className="mt-1 text-[12px] font-pmedium text-slate-500">
              Update the unit identity without changing unrelated founder settings.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-[12px] font-pmedium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 md:col-span-2">
            <span className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">
              Unit Name
            </span>
            <input
              value={form.workspaceName}
              onChange={(event) => onChange("workspaceName", event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-pmedium text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-50"
              required
              maxLength={120}
            />
          </label>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 text-sm font-pmedium text-white shadow-sm transition hover:bg-primary/95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
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

function CombinedDataModal({ isOpen, onClose, summary, combinedData, isProfessional }) {
  const [activeTab, setActiveTab] = useState(isProfessional ? "tickets" : "tasks");

  useEffect(() => {
    if (isOpen) {
      setActiveTab(isProfessional ? "tickets" : "tasks");
    }
  }, [isOpen, isProfessional]);

  if (!isOpen) {
    return null;
  }

  const tabs = isProfessional
    ? [
        { key: "tickets", label: "Tickets" },
        { key: "bookings", label: "Meeting Room Bookings" },
        { key: "employees", label: "Employees" },
      ]
    : [
        { key: "tasks", label: "Tasks" },
        { key: "tickets", label: "Tickets" },
        { key: "assets", label: "Assets" },
        { key: "inventory", label: "Inventory" },
        { key: "bookings", label: "Meeting Room Bookings" },
        { key: "employees", label: "Employees" },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div>
            <h2 className="text-lg font-pmedium text-slate-950">Combined Units Data</h2>
            <p className="mt-1 text-[12px] font-pmedium text-slate-500">
              Unified founder view across tasks, tickets, assets, inventory, bookings, and employees.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-pmedium text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Users} label="Employees" value={summary.totalEmployees || 0} tone="blue" />
            {!isProfessional ? (
              <MetricCard icon={Briefcase} label="Departments" value={summary.totalDepartments || 0} tone="emerald" />
            ) : null}
            <MetricCard icon={Ticket} label="Tickets" value={summary.totalTickets || 0} tone="amber" />
            {!isProfessional ? (
              <>
                <MetricCard icon={CheckCircle2} label="Tasks" value={summary.totalTasks || 0} tone="violet" />
                <MetricCard icon={Package} label="Assets" value={summary.totalAssets || 0} tone="rose" />
                <MetricCard icon={Boxes} label="Inventory" value={summary.totalInventory || 0} tone="cyan" />
              </>
            ) : null}
            <MetricCard icon={CalendarDays} label="Meeting Room Bookings" value={summary.totalMeetingBookings || 0} tone="orange" />
            <MetricCard icon={BarChart3} label="Performance" value={`${summary.performance?.overallScore || 0}%`} tone="indigo" />
          </div>

          <div className="mt-5 rounded-2xl border border-slate-100 bg-white/80 backdrop-blur-md p-3.5">
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

            {activeTab === "employees" ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-pmedium uppercase tracking-[0.16em] text-slate-500">Total Employees</p>
                  <p className="mt-2 text-2xl font-pmedium text-slate-950">{summary.totalEmployees || 0}</p>
                </div>
                <div className="space-y-3">
                  {combinedData.employees.recent.length > 0 ? combinedData.employees.recent.map((employee) => (
                    <div key={`employee-${employee.workspaceId}-${employee.id}-${employee.email}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-pmedium text-slate-950">{employee.fullName || "Member"}</p>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-pmedium uppercase tracking-[0.16em] text-slate-600">{employee.roleLabel || "Member"}</span>
                      </div>
                      <p className="mt-1 text-sm font-pmedium text-slate-700">{employee.email || "No email"}</p>
                      <p className="mt-2 text-xs font-pmedium text-slate-500">{employee.workspaceName}</p>
                    </div>
                  )) : <p className="text-sm font-pmedium text-slate-500">No employees found.</p>}
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
  const { auth, setAuth } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const workspaceCount = getWorkspaceCount(
    (auth?.user as { workspaceCount?: number } | null)?.workspaceCount ??
    (currentUser as { workspaceCount?: number } | null)?.workspaceCount,
  );
  const isWorkspaceManagementLocked = !(workspaceCount > 1);
  const [departmentFilter, setDepartmentFilter] = useState("All departments");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTabs, setActiveTabs] = useState({});
  const [expandedWorkspaceId, setExpandedWorkspaceId] = useState("");
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isCombinedModalOpen, setIsCombinedModalOpen] = useState(false);
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState("");
  const [mutatingWorkspaceId, setMutatingWorkspaceId] = useState("");
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isWorkspaceManagementLocked) {
      toast.error("Add one More Units from Unit Settings to access Unit Management.");
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
      } catch (error: unknown) {
        if (isMounted) {
          const errorMessage = error instanceof Error ? error.message : "Unable to load unit management.";
          toast.error(errorMessage);
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
    interface StatusEntry {
      status?: string;
      count?: number;
    }
    
    const byStatus = (entries: any[] = []): Array<{ status: string; count: number }> => {
      const counts = new Map<string, number>();
      entries.forEach((entry: StatusEntry) => {
        const key = String(entry?.status || "").trim() || "Unknown";
        counts.set(key, (counts.get(key) || 0) + Number(entry?.count || 0));
      });
      return Array.from(counts.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
    };

    const normalizeRecentWithWorkspace = (detailsKey: string, mapper: (item: any, workspace: Workspace) => any) => (
      workspaceList.flatMap((workspace) =>
        (workspace?.details?.[detailsKey]?.recent || []).map((item: any) => mapper(item, workspace)),
      ).slice(0, COMBINED_RECENT_LIMIT)
    );

    const taskByStatusEntries: any[] = workspaceList.flatMap((workspace) => workspace?.details?.tasks?.byStatus || []);
    const ticketByStatusEntries: any[] = workspaceList.flatMap((workspace) => workspace?.details?.tickets?.byStatus || []);
    const assetByStatusEntries: any[] = workspaceList.flatMap((workspace) => workspace?.details?.assets?.byStatus || []);
    const bookingByStatusEntries: any[] = workspaceList.flatMap((workspace) => workspace?.details?.bookings?.byStatus || []);
    const inventoryByCategoryEntries: any[] = workspaceList.flatMap((workspace) => workspace?.details?.inventory?.byCategory || []);
    const inventoryByTrackingEntries: any[] = workspaceList.flatMap((workspace) => workspace?.details?.inventory?.byTrackingType || []);

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
  const activeWorkspacePlan = useMemo(
    () =>
      String(
        workspaceList.find((workspace) => workspace.isActiveWorkspace)?.selectedPlan || "basic",
      )
        .trim()
        .toLowerCase(),
    [workspaceList],
  );
  const isActiveWorkspaceProfessional = activeWorkspacePlan === "professional";

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

  async function handleSwitchWorkspace(workspace) {
    if (!workspace?.id || workspace.isActiveWorkspace || switchingWorkspaceId) {
      return;
    }
    try {
      setSwitchingWorkspaceId(workspace.id);
      const response = await switchWorkspaceSession(axiosPrivate, workspace.id);
      const switchedWorkspaceId = String(response?.data?.data?.activeWorkspaceId || workspace.id);
      const nextAccessible = Array.isArray(response?.data?.data?.accessibleWorkspaces)
        ? response.data.data.accessibleWorkspaces
        : undefined;
      setAuth((prev) => ({
        ...prev,
        user: prev.user
          ? {
              ...(prev.user as Record<string, unknown>),
              primaryWorkspace: switchedWorkspaceId,
              ...(nextAccessible ? { accessibleWorkspaces: nextAccessible } : {}),
            }
          : prev.user,
      }));
      toast.success(`Switched to ${workspace.workspaceName || "unit"}.`);
      // Full reload so this page's overview, the header switcher, and every
      // other "which unit am I in" read across the app pick up the new
      // active workspace consistently, same as the header switcher does by
      // navigating to a fresh page.
      window.location.reload();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to switch unit.");
      setSwitchingWorkspaceId("");
    }
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unable to update unit.";
      toast.error(errorMessage);
    } finally {
      setIsSavingEdit(false);
    }
  }

  function syncAccessibleWorkspaces(data) {
    const list = Array.isArray(data?.workspaces) ? data.workspaces : [];
    const accessible = list
      .filter((ws) => !ws.isDeleted && !ws.isDisabled)
      .map((ws) => ({
        id: ws.id,
        workspaceName: ws.workspaceName,
        businessName: ws.businessName || "",
        location: ws.location || "",
        isPrimary: Boolean(ws.isActiveWorkspace),
      }));
    setAuth((prev) =>
      prev.user
        ? {
            ...prev,
            user: {
              ...(prev.user as Record<string, unknown>),
              accessibleWorkspaces: accessible,
            },
          }
        : prev,
    );
  }

  async function reloadOverview() {
    const refreshed = await getWorkspaceManagementOverview(
      axiosPrivate,
      departmentFilter === "All departments" ? "" : departmentFilter,
    );
    const data = refreshed?.data?.data || null;
    setOverview(data);
    syncAccessibleWorkspaces(data);
  }

  async function handleToggleWorkspaceStatus(workspace) {
    if (!workspace?.id || mutatingWorkspaceId) {
      return;
    }
    const nextActive = Boolean(workspace.isDisabled);
    try {
      setMutatingWorkspaceId(workspace.id);
      await setWorkspaceStatus(axiosPrivate, workspace.id, nextActive);
      toast.success(
        nextActive
          ? `Enabled ${workspace.workspaceName || "unit"}.`
          : `Disabled ${workspace.workspaceName || "unit"}.`,
      );
      if (!nextActive && workspace.isActiveWorkspace) {
        window.location.reload();
        return;
      }
      await reloadOverview();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to update unit status.");
    } finally {
      setMutatingWorkspaceId("");
    }
  }

  async function handleConfirmDeleteWorkspace() {
    if (!deletingWorkspace?.id) {
      return;
    }
    const wasActive = Boolean(deletingWorkspace.isActiveWorkspace);
    try {
      setIsDeleting(true);
      await deleteManagedWorkspace(axiosPrivate, deletingWorkspace.id);
      toast.success(`Deleted ${deletingWorkspace.workspaceName || "unit"}.`);
      setDeletingWorkspace(null);
      if (wasActive) {
        window.location.reload();
        return;
      }
      await reloadOverview();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to delete unit.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleRequestRecovery(workspace) {
    if (!workspace?.id || mutatingWorkspaceId) {
      return;
    }
    try {
      setMutatingWorkspaceId(workspace.id);
      await requestWorkspaceRecovery(axiosPrivate, workspace.id);
      await reloadOverview();
      toast.success("Recovery requested. The WONO team will review and restore this unit.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to request recovery.");
    } finally {
      setMutatingWorkspaceId("");
    }
  }

  return (
    <>
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          {isLoading ? (
            <CardsGridSkeleton />
          ) : (
            <div className="flex flex-col gap-4 text-slate-700 font-sans">

              {/* 1. HEADER */}
              <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
                <div>
                  <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                    Unit Management
                  </h2>
                  <p className="text-xs font-pmedium text-slate-500 mt-1">
                    Review every unit linked to this founder account and compare operational health from one place.
                  </p>
                </div>
                <div className="h-9 inline-flex items-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-500 shadow-sm whitespace-nowrap">
                  Current Unit: <span className="text-[#0F172A] ml-1.5">{activeWorkspaceName}</span>
                </div>
              </div>

              {/* 2. STAT CARDS (4-col grid, border-l-4 accents per DESIGN.md) */}
              <div data-tour="unit-management-summary" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
                <MetricCard icon={Users} label="Employees" value={summary.totalEmployees} tone="blue" />
                {!isActiveWorkspaceProfessional ? (
                  <MetricCard icon={Briefcase} label="Departments" value={summary.totalDepartments} tone="emerald" />
                ) : null}
                <MetricCard icon={Ticket} label="Tickets" value={summary.totalTickets} tone="amber" />
                {!isActiveWorkspaceProfessional ? (
                  <>
                    <MetricCard icon={CheckCircle2} label="Tasks" value={summary.totalTasks} tone="violet" />
                    <MetricCard icon={Package} label="Assets" value={summary.totalAssets || 0} tone="rose" />
                    <MetricCard icon={Boxes} label="Inventory" value={summary.totalInventory || 0} tone="cyan" />
                  </>
                ) : null}
                <MetricCard icon={CalendarDays} label="Meeting Room Bookings" value={summary.totalMeetingBookings || 0} tone="orange" />
                <MetricCard icon={BarChart3} label="Performance" value={`${summary.performance?.overallScore || 0}%`} tone="indigo" />
              </div>

              {/* 3. DATA PANEL */}
              <section className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                {/* Header row: inner title + filters + action */}
                <div data-tour="unit-management-controls" className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">All Units</p>
                    <p className="mt-1 text-[11px] font-pmedium leading-6 text-slate-500">
                      {departmentFilter === "All departments"
                        ? "Founder-level combined view across every active unit."
                        : `Metrics filtered to ${departmentFilter}.`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                    {/* Unit filter */}
                    <div className="relative flex-1 min-w-[140px]">
                      <select
                        value={workspaceFilter}
                        onChange={(event) => {
                          setWorkspaceFilter(event.target.value);
                          setExpandedWorkspaceId("");
                        }}
                        className="w-full pl-4 pr-9 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="all">All units</option>
                        {workspaceList.map((workspace) => (
                          <option key={workspace.id} value={workspace.id}>
                            {workspace.workspaceName}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    {/* Department filter */}
                    <div className="relative flex-1 min-w-[160px]">
                      <select
                        value={departmentFilter}
                        onChange={(event) => setDepartmentFilter(event.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none"
                      >
                        {departmentOptions.map((departmentName) => (
                          <option key={departmentName} value={departmentName}>
                            {departmentName}
                          </option>
                        ))}
                      </select>
                      <RefreshCcw size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2563EB]" />
                    </div>
                    {/* Action button */}
                    <button
                      data-tour="unit-management-view-data"
                      type="button"
                      onClick={() => setIsCombinedModalOpen(true)}
                      className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                    >
                      <BarChart3 size={13} strokeWidth={3} />
                      VIEW DATA
                    </button>
                  </div>
                </div>

                <div className="p-3 sm:p-4 lg:p-5">
                  {displayedWorkspaces.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 font-pmedium">
                      No units found.
                    </div>
                  ) : (
                    <div data-tour="unit-management-list" className="grid gap-3.5">
                      {displayedWorkspaces.map((workspace) => {
                        const isWorkspaceProfessional =
                          String(workspace.selectedPlan || "basic").trim().toLowerCase() === "professional";
                        return (
                        <article
                          key={workspace.id}
                          className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden"
                        >
                          <div className="p-4 sm:p-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <h3 className="text-[16px] font-pmedium text-slate-950">
                                  {workspace.workspaceName}
                                </h3>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                                  {workspace.status}
                                </span>
                              </div>
                              <p className="mt-1.5 text-[12px] font-pmedium text-slate-600">
                                {workspace.businessName || "Business name not set"}
                              </p>
                              <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[12px] font-pmedium text-slate-500">
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
                                className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-pmedium ${workspace.isActiveWorkspace
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
                                data-tour="unit-management-view-details"
                                type="button"
                                onClick={() => handleToggleWorkspace(workspace.id)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-pmedium text-slate-700 shadow-sm transition hover:bg-slate-50"
                              >
                                {expandedWorkspaceId === workspace.id ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                                {expandedWorkspaceId === workspace.id ? "Hide Details" : "View Details"}
                              </button>
                              <button
                                data-tour="unit-management-edit-unit"
                                type="button"
                                onClick={() => handleOpenEdit(workspace)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-pmedium text-slate-700 shadow-sm transition hover:bg-slate-50"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit Unit
                              </button>
                              {!workspace.isActiveWorkspace && !workspace.isDisabled && !workspace.isDeleted ? (
                                <button
                                  data-tour="unit-management-switch-unit"
                                  type="button"
                                  onClick={() => handleSwitchWorkspace(workspace)}
                                  disabled={Boolean(switchingWorkspaceId)}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-[12px] font-pmedium text-[#2563EB] shadow-sm transition hover:bg-blue-100 disabled:opacity-60"
                                >
                                  {switchingWorkspaceId === workspace.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <ArrowLeftRight className="h-3.5 w-3.5" />
                                  )}
                                  {switchingWorkspaceId === workspace.id ? "Switching..." : "Switch"}
                                </button>
                              ) : null}
                              {workspace.canRequestRecovery ? (
                                <button
                                  type="button"
                                  onClick={() => handleRequestRecovery(workspace)}
                                  disabled={Boolean(mutatingWorkspaceId)}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-[12px] font-pmedium text-indigo-700 shadow-sm transition hover:bg-indigo-100 disabled:opacity-60"
                                >
                                  {mutatingWorkspaceId === workspace.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  )}
                                  Request Recovery
                                </button>
                              ) : null}
                              {workspace.isDeleted && workspace.recoveryRequested ? (
                                <span className="inline-flex h-9 items-center rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 text-[11px] font-pmedium text-indigo-600">
                                  Recovery requested
                                </span>
                              ) : null}
                              {workspace.canEnable ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleWorkspaceStatus(workspace)}
                                  disabled={Boolean(mutatingWorkspaceId)}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-pmedium text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:opacity-60"
                                >
                                  {mutatingWorkspaceId === workspace.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Power className="h-3.5 w-3.5" />
                                  )}
                                  Enable
                                </button>
                              ) : null}
                              {workspace.canDisable ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleWorkspaceStatus(workspace)}
                                  disabled={Boolean(mutatingWorkspaceId)}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-[12px] font-pmedium text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:opacity-60"
                                >
                                  {mutatingWorkspaceId === workspace.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <PowerOff className="h-3.5 w-3.5" />
                                  )}
                                  Disable
                                </button>
                              ) : null}
                              {workspace.canDelete ? (
                                <button
                                  type="button"
                                  onClick={() => setDeletingWorkspace(workspace)}
                                  disabled={Boolean(mutatingWorkspaceId)}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-[12px] font-pmedium text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:opacity-60"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <div className="px-4 sm:px-5 pb-4 sm:pb-5 grid gap-3 grid-cols-2 md:grid-cols-4">
                            <MetricCard icon={Users} label="Employees" value={workspace.metrics.totalEmployees} tone="blue" />
                            {!isWorkspaceProfessional ? (
                              <MetricCard icon={Briefcase} label="Departments" value={workspace.metrics.totalDepartments} tone="emerald" />
                            ) : null}
                            <MetricCard icon={Ticket} label="Tickets" value={workspace.metrics.totalTickets} tone="amber" />
                            {!isWorkspaceProfessional ? (
                              <>
                                <MetricCard icon={CheckCircle2} label="Tasks" value={workspace.metrics.totalTasks} tone="violet" />
                                <MetricCard icon={Package} label="Assets" value={workspace.metrics.totalAssets || 0} tone="rose" />
                                <MetricCard icon={Boxes} label="Inventory" value={workspace.metrics.totalInventory || 0} tone="cyan" />
                              </>
                            ) : null}
                            <MetricCard icon={CalendarDays} label="Meeting Room Bookings" value={workspace.metrics.totalMeetingBookings || 0} tone="orange" />
                            <MetricCard icon={BarChart3} label="Performance" value={`${workspace.metrics.performance?.overallScore || 0}%`} tone="indigo" />
                          </div>

                          {expandedWorkspaceId === workspace.id ? (
                            <div className="border-t border-slate-100/60 bg-slate-50/50 p-4 sm:p-5">
                              <div className="flex items-center gap-1 rounded-2xl bg-slate-100/70 p-1 flex-wrap">
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
                                            <p className="truncate text-sm font-pmedium text-slate-950">
                                              {employee.fullName}
                                            </p>
                                            <p className="mt-1 truncate text-xs font-pmedium text-slate-500">
                                              {employee.email}
                                            </p>
                                          </div>
                                          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-pmedium uppercase tracking-[0.16em] text-slate-600 shadow-sm">
                                            {employee.roleLabel}
                                          </span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-pmedium text-slate-500">
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
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-slate-400 font-pmedium md:col-span-2">
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
                                        <h4 className="text-sm font-pmedium text-slate-950">Ticket Status</h4>
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

                                    {isWorkspaceProfessional ? (
                                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex items-center gap-2">
                                          <CalendarDays className="h-4 w-4 text-orange-600" />
                                          <h4 className="text-sm font-pmedium text-slate-950">Meeting Room Bookings</h4>
                                        </div>
                                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                          {(workspace.details?.bookings?.byStatus || []).map((item) => (
                                            <StatusPill
                                              key={`${workspace.id}-booking-${item.status}`}
                                              label={item.status}
                                              value={item.count}
                                              tone="amber"
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex items-center gap-2">
                                          <ClipboardList className="h-4 w-4 text-violet-600" />
                                          <h4 className="text-sm font-pmedium text-slate-950">Task Status</h4>
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
                                    )}
                                  </div>

                                  <div className="grid gap-4 xl:grid-cols-2">
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                      <h4 className="text-sm font-pmedium text-slate-950">Recent Tickets</h4>
                                      <div className="mt-3 space-y-3">
                                        {(workspace.details?.tickets?.recent || []).length > 0 ? (
                                          workspace.details.tickets.recent.map((ticketItem) => (
                                            <div
                                              key={ticketItem.id || ticketItem.code}
                                              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                                            >
                                              <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm font-pmedium text-slate-950">{ticketItem.code}</p>
                                                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-pmedium uppercase tracking-[0.16em] text-slate-600">
                                                  {ticketItem.status}
                                                </span>
                                              </div>
                                              <p className="mt-1 text-sm font-pmedium text-slate-600">
                                                {ticketItem.title}
                                              </p>
                                              <p className="mt-2 text-xs font-pmedium text-slate-500">
                                                {ticketItem.department || "No department"} · {ticketItem.assignedTo || "Unassigned"}
                                              </p>
                                            </div>
                                          ))
                                        ) : (
                                          <p className="text-sm font-pmedium text-slate-500">No tickets yet.</p>
                                        )}
                                      </div>
                                    </div>

                                    {isWorkspaceProfessional ? (
                                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <h4 className="text-sm font-pmedium text-slate-950">Recent Meeting Room Bookings</h4>
                                        <div className="mt-3 space-y-3">
                                          {(workspace.details?.bookings?.recent || []).length > 0 ? (
                                            workspace.details.bookings.recent.map((bookingItem) => (
                                              <div
                                                key={bookingItem.id || bookingItem.code}
                                                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                                              >
                                                <div className="flex items-center justify-between gap-3">
                                                  <p className="text-sm font-pmedium text-slate-950">{bookingItem.roomName || "Meeting room"}</p>
                                                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-pmedium uppercase tracking-[0.16em] text-slate-600">
                                                    {bookingItem.status}
                                                  </span>
                                                </div>
                                                <p className="mt-1 text-sm font-pmedium text-slate-600">
                                                  {bookingItem.startTime} - {bookingItem.endTime}
                                                </p>
                                                <p className="mt-2 text-xs font-pmedium text-slate-500">
                                                  {bookingItem.department || "No department"} · {bookingItem.bookedByName || "Unassigned"}
                                                </p>
                                              </div>
                                            ))
                                          ) : (
                                            <p className="text-sm font-pmedium text-slate-500">No meeting room bookings yet.</p>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <h4 className="text-sm font-pmedium text-slate-950">Recent Tasks</h4>
                                        <div className="mt-3 space-y-3">
                                          {(workspace.details?.tasks?.recent || []).length > 0 ? (
                                            workspace.details.tasks.recent.map((taskItem) => (
                                              <div
                                                key={taskItem.id || taskItem.code}
                                                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                                              >
                                                <div className="flex items-center justify-between gap-3">
                                                  <p className="text-sm font-pmedium text-slate-950">{taskItem.code}</p>
                                                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-pmedium uppercase tracking-[0.16em] text-slate-600">
                                                    {taskItem.status}
                                                  </span>
                                                </div>
                                                <p className="mt-1 text-sm font-pmedium text-slate-600">
                                                  {taskItem.title}
                                                </p>
                                                <p className="mt-2 text-xs font-pmedium text-slate-500">
                                                  {taskItem.department || "No department"} · {taskItem.assignee || "Unassigned"}
                                                </p>
                                              </div>
                                            ))
                                          ) : (
                                            <p className="text-sm font-pmedium text-slate-500">No tasks yet.</p>
                                          )}
                                        </div>
                                      </div>
                                    )}
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
                                          <h4 className="text-sm font-pmedium text-slate-950">
                                            {departmentItem.name}
                                          </h4>
                                        </div>
                                        <div className="mt-4 grid gap-3">
                                          <StatusPill label="Employees" value={departmentItem.totalEmployees} tone="blue" />
                                          <StatusPill label="Tickets" value={departmentItem.totalTickets} tone="amber" />
                                          {isWorkspaceProfessional ? (
                                            <StatusPill label="Meeting Room Bookings" value={departmentItem.totalMeetingBookings} tone="violet" />
                                          ) : (
                                            <StatusPill label="Tasks" value={departmentItem.totalTasks} tone="violet" />
                                          )}
                                        </div>
                                      </article>
                                    ))
                                  ) : (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-slate-400 font-pmedium md:col-span-2 xl:col-span-3">
                                      No department data is available for this workspace yet.
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </article>
                      );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </PageFrame>
      </div>

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
        isProfessional={isActiveWorkspaceProfessional}
      />

      {deletingWorkspace ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-rose-50 p-2 text-rose-600 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[14px] font-pmedium text-slate-950">
                  Delete {deletingWorkspace.workspaceName || "this unit"}?
                </p>
                <p className="mt-1 text-[12px] font-pmedium text-slate-500">
                  This permanently removes the unit and frees a slot so you can add a new one.
                  Members lose access to it. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!isDeleting) setDeletingWorkspace(null);
                }}
                disabled={isDeleting}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-[12px] font-pmedium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteWorkspace}
                disabled={isDeleting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-[12px] font-pmedium text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {isDeleting ? "Deleting..." : "Delete Unit"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
