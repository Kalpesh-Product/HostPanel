import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  Eye,
  Layers,
  Loader2,
  LockKeyhole,
  MapPin,
  PanelsTopLeft,
  Pencil,
  Plus,
  Power,
  PowerOff,
  ReceiptText,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../../hooks/useAuth";
import {
  getWorkspaceManagementOverview,
  updateManagedWorkspace,
  setWorkspaceStatus,
  deleteManagedWorkspace,
  requestWorkspaceRecovery,
} from "../../services/unit-management";
import { switchWorkspaceSession } from "../../services/workspace-session";
import { getWorkspaceSettings, updateWorkspaceSettings } from "../../services/unit-settings";
import {
  PAYMENT_METHOD_CATALOG,
  getCountryBillingDefaults,
  normalizeBillingConfig,
  type WorkspaceBillingConfig,
} from "../../lib/workspaceBilling";

type WorkspaceItem = {
  id: string;
  workspaceName: string;
  businessName?: string;
  location?: string;
  selectedPlan?: string;
  status?: string;
  isActiveWorkspace?: boolean;
  isMain?: boolean;
  isDisabled?: boolean;
  isDeleted?: boolean;
  canDisable?: boolean;
  canEnable?: boolean;
  canDelete?: boolean;
  canRequestRecovery?: boolean;
  recoveryRequested?: boolean;
  createdAt?: string;
  metrics?: { totalEmployees?: number };
};

type Overview = {
  workspaceCount: number;
  workspaceManagement?: { enabled?: boolean };
  accountPlan?: string;
  workspaceLimit?: number | null;
  activeWorkspaceLimit?: number | null;
  keptWorkspaceCount?: number;
  activeWorkspaceCount?: number;
  canAddWorkspace?: boolean;
  summary?: {
    totalEmployees?: number;
    totalTickets?: number;
    totalTasks?: number;
    totalDepartments?: number;
    performance?: { overallScore?: number };
  };
  workspaces?: WorkspaceItem[];
};

function CardsGridSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
        {Array.from({ length: 4 }).map((_, i) => (
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

export default function WorkspaceSettingsPage() {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const { auth, setAuth } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState("");
  const [mutatingWorkspaceId, setMutatingWorkspaceId] = useState("");
  const [deletingWorkspace, setDeletingWorkspace] = useState<WorkspaceItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingWorkspace, setViewingWorkspace] = useState<WorkspaceItem | null>(null);
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceItem | null>(null);
  const [editName, setEditName] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [businessStart, setBusinessStart] = useState("09:00");
  const [businessEnd, setBusinessEnd] = useState("22:00");
  const [workspaceTimezone, setWorkspaceTimezone] = useState("Asia/Kolkata");
  const [workspaceCurrency, setWorkspaceCurrency] = useState("INR");
  const [billing, setBilling] = useState<WorkspaceBillingConfig>(() => getCountryBillingDefaults("IN"));
  const [isSavingHours, setIsSavingHours] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setIsLoadingOverview(true);
        const response = await getWorkspaceManagementOverview(axiosPrivate);
        if (!mounted) return;
        setOverview(response?.data?.data || null);
      } catch (error: any) {
        if (mounted) toast.error(error?.response?.data?.message || "Unable to load unit information.");
      } finally {
        if (mounted) setIsLoadingOverview(false);
      }
    };
    void load();

    (async () => {
      try {
        const res = await getWorkspaceSettings(axiosPrivate);
        const preferences = res?.data?.data?.settings?.preferences;
        const bh = preferences?.businessHours;
        if (mounted && preferences) {
          setBusinessStart(bh?.start || "09:00");
          setBusinessEnd(bh?.end || "22:00");
          setWorkspaceTimezone(preferences.timezone || "Asia/Kolkata");
          setWorkspaceCurrency(preferences.currency || "INR");
          setBilling(normalizeBillingConfig(preferences.billing));
        }
      } catch {
        // keep defaults
      }
    })();

    return () => {
      mounted = false;
    };
  }, [axiosPrivate]);

  const workspaceList = useMemo(
    () => (Array.isArray(overview?.workspaces) ? overview.workspaces : []),
    [overview?.workspaces],
  );
  const workspaceCount = Number(overview?.workspaceCount || 0);
  const activeWorkspace = useMemo(
    () => workspaceList.find((workspace) => workspace.isActiveWorkspace),
    [workspaceList],
  );
  const currentRole = String(
    (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)?.workspaceMembership?.role ||
      (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)?.role ||
      "",
  )
    .trim()
    .toLowerCase();
  const isFounder = currentRole === "founder" || currentRole === "owner";
  const accountPlan = String(overview?.accountPlan || "").trim().toLowerCase();
  const workspaceLimit = overview?.workspaceLimit ?? null; // kept cap; null == unlimited (custom)
  const activeWorkspaceLimit = overview?.activeWorkspaceLimit ?? null; // active-at-once cap
  const keptWorkspaceCount = Number(overview?.keptWorkspaceCount ?? workspaceCount);
  const activeWorkspaceCount = Number(overview?.activeWorkspaceCount ?? workspaceCount);
  // Default to allowed if the server didn't send the flag (older responses).
  const atWorkspaceLimit = overview?.canAddWorkspace === false;
  const atKeptLimit = workspaceLimit !== null && keptWorkspaceCount >= Number(workspaceLimit);
  const atActiveLimit = activeWorkspaceLimit !== null && activeWorkspaceCount >= Number(activeWorkspaceLimit);
  const canCreateWorkspace = isFounder && !atWorkspaceLimit;
  const canOpenWorkspaceManagement = isFounder;
  const activeWorkspaceName = activeWorkspace?.workspaceName || "Unit";
  const activeWorkspaceLocation = activeWorkspace?.location || "Location not set";

  const unitsRemainingValue =
    workspaceLimit === null
      ? "Unlimited"
      : Math.max(0, Number(workspaceLimit) - keptWorkspaceCount);
  const planLabel = accountPlan
    ? accountPlan.charAt(0).toUpperCase() + accountPlan.slice(1)
    : "—";

  // Summary cards (DESIGN.md: 4-col grid, white rounded-[2rem] with colored border-l-4 accents)
  const summaryCards = [
    {
      key: "total",
      icon: Layers,
      label: "Total Units",
      value: keptWorkspaceCount,
      cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-slate-400",
      iconClass: "bg-slate-50 text-slate-600",
    },
    {
      key: "active",
      icon: Building2,
      label: "Active Unit",
      value: activeWorkspaceName,
      cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500",
      iconClass: "bg-blue-50 text-blue-600",
    },
    {
      key: "remaining",
      icon: PanelsTopLeft,
      label: "Units Remaining",
      value: unitsRemainingValue,
      cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500",
      iconClass: "bg-amber-50 text-amber-600",
    },
    {
      key: "plan",
      icon: CreditCard,
      label: "Plan",
      value: planLabel,
      cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500",
      iconClass: "bg-emerald-50 text-emerald-600",
    },
  ];

  const openPasswordGate = () => {
    setCurrentPassword("");
    setPasswordError("");
    setIsPasswordModalOpen(true);
  };

  const closePasswordGate = () => {
    if (isSubmitting) return;
    setIsPasswordModalOpen(false);
    setCurrentPassword("");
    setPasswordError("");
  };

  const startAdditionalWorkspaceFlow = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      setPasswordError("");
      const userId = String((auth.user as { _id?: string; id?: string } | null)?._id || (auth.user as { _id?: string; id?: string } | null)?.id || "");
      if (!userId) throw new Error("Unable to verify current user.");
      await axiosPrivate.patch(`/api/profile/verify-password/${userId}`, { currentPassword });
      const profileResponse = await axiosPrivate.get("/api/profile/me");
      const workspace = profileResponse?.data?.data?.workspace || {};
      const companyNameFromAuth = String(
        (auth.user as { companyName?: string } | null)?.companyName || "",
      ).trim();
      const businessName = String(
        workspace?.businessName || companyNameFromAuth || "",
      ).trim();
      const brandName = String(
        workspace?.brandName || workspace?.workspaceName || businessName || "",
      ).trim();
      closePasswordGate();
      navigate("/create-workspace", {
        state: {
          additionalWorkspaceMode: true,
          selectedPlan: String(workspace?.selectedPlan || "basic"),
          workspaceDetails: {
            workspaceName: "",
            businessName,
            brandName,
            country: "",
            state: "",
            city: "",
            timezone: "",
            currency: "",
            address: "",
            businessTypes: [],
          },
        },
      });
    } catch (error: any) {
      setPasswordError(error?.response?.data?.message || error?.message || "Current password is incorrect.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePaymentMethod = (code: string) => {
    if (code === "cash") return;
    setBilling((current) => {
      const exists = current.paymentMethods.some((method) => method.code === code);
      return {
        ...current,
        paymentMethods: exists
          ? current.paymentMethods.filter((method) => method.code !== code)
          : [...current.paymentMethods, PAYMENT_METHOD_CATALOG[code]].filter(Boolean),
      };
    });
  };

  const saveBusinessHours = async () => {
    if (!businessStart || !businessEnd) {
      toast.error("Please set both start and end times.");
      return;
    }
    if (businessStart >= businessEnd) {
      toast.error("Start time must be before end time.");
      return;
    }
    try {
      setIsSavingHours(true);
      await updateWorkspaceSettings(axiosPrivate, {
        profile: {
          workspaceName: activeWorkspace?.workspaceName || "",
        },
        preferences: {
          timezone: workspaceTimezone,
          currency: workspaceCurrency,
          dateFormat: "DD MMM YYYY",
          timeFormat: "12h",
          weekStartsOn: "monday",
          businessHours: { start: businessStart, end: businessEnd },
          billing,
        },
        branding: { primaryColor: "#2563EB" },
      });
      toast.success("Business hours and billing preferences updated successfully.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update business hours.");
    } finally {
      setIsSavingHours(false);
    }
  };

  // Keep the header switcher + login selection in sync immediately after a
  // status/delete change: they read auth.user.accessibleWorkspaces, which must
  // only contain enabled, non-deleted units.
  const syncAccessibleWorkspaces = (data: Overview | null) => {
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
  };

  const reloadOverview = async () => {
    const refreshed = await getWorkspaceManagementOverview(axiosPrivate);
    const data = (refreshed?.data?.data || null) as Overview | null;
    setOverview(data);
    syncAccessibleWorkspaces(data);
  };

  const openEditWorkspace = (workspace: WorkspaceItem) => {
    setEditingWorkspace(workspace);
    setEditName(workspace.workspaceName || "");
  };

  const handleSaveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingWorkspace?.id) return;
    const nextName = editName.trim();
    if (!nextName) {
      toast.error("Unit name is required.");
      return;
    }
    try {
      setIsSavingEdit(true);
      await updateManagedWorkspace(axiosPrivate, editingWorkspace.id, {
        profile: { workspaceName: nextName },
      });
      await reloadOverview();
      toast.success("Unit updated successfully.");
      setEditingWorkspace(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to update unit.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSwitchWorkspace = async (workspace: WorkspaceItem) => {
    if (!workspace?.id || workspace.isActiveWorkspace || switchingWorkspaceId) return;
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
      window.location.reload();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to switch unit.");
      setSwitchingWorkspaceId("");
    }
  };

  const handleToggleWorkspaceStatus = async (workspace: WorkspaceItem) => {
    if (!workspace?.id || mutatingWorkspaceId) return;
    const nextActive = Boolean(workspace.isDisabled);
    try {
      setMutatingWorkspaceId(workspace.id);
      await setWorkspaceStatus(axiosPrivate, workspace.id, nextActive);
      toast.success(
        nextActive
          ? `Enabled ${workspace.workspaceName || "unit"}.`
          : `Disabled ${workspace.workspaceName || "unit"}.`,
      );
      // Disabling the unit you're currently in moves you to the main unit —
      // reload so the whole app picks up the new active unit.
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
  };

  const handleConfirmDeleteWorkspace = async () => {
    if (!deletingWorkspace?.id) return;
    const wasActive = Boolean(deletingWorkspace.isActiveWorkspace);
    try {
      setIsDeleting(true);
      await deleteManagedWorkspace(axiosPrivate, deletingWorkspace.id);
      toast.success(`Deleted ${deletingWorkspace.workspaceName || "unit"}.`);
      setDeletingWorkspace(null);
      // Deleting the unit you're currently in moves you to the main unit.
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
  };

  const handleRequestRecovery = async (workspace: WorkspaceItem) => {
    if (!workspace?.id || mutatingWorkspaceId) return;
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
  };

  return (
    <>
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
    <PageFrame>
        {isLoadingOverview ? (
          <CardsGridSkeleton />
        ) : (
        <div className="flex flex-col gap-4 text-slate-700 font-sans">

          {/* 1. HEADER */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Unit Settings
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Manage the founder-level unit flow. Create new unit branches securely and unlock unit management once you have more than one unit.
              </p>
            </div>
          </div>

          {/* 2. STAT CARDS (4-col grid, border-l-4 accents per DESIGN.md) */}
          <div data-tour="unit-settings-summary" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.key} className={card.cardClass}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                    <p className="text-[15px] font-pmedium text-slate-900 truncate">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}><Icon size={16} /></div>
                </div>
              );
            })}
          </div>

        <div className="space-y-4">
            <section data-tour="unit-settings-create" className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              {/* Header row */}
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <span className="rounded-2xl bg-blue-50 p-2 text-[#2563EB] shrink-0">
                    <Plus className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Create New Unit</p>
                    <p className="mt-1 text-[11px] font-pmedium leading-6 text-slate-500">
                      Keep the same founder onboarding flow and create a new branch unit under the same business.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-start xl:items-end gap-1.5">
                  <button
                    data-tour="unit-settings-create-button"
                    type="button"
                    onClick={() => {
                      if (!isFounder) return;
                      if (atKeptLimit) {
                        toast.error(
                          `Your ${accountPlan || "current"} plan allows up to ${workspaceLimit} unit${
                            workspaceLimit === 1 ? "" : "s"
                          }. Delete a unit to add a new one.`,
                        );
                        return;
                      }
                      if (atActiveLimit) {
                        toast.error(
                          `Only ${activeWorkspaceLimit} unit${
                            activeWorkspaceLimit === 1 ? "" : "s"
                          } can be active at a time. Disable an active unit before adding another.`,
                        );
                        return;
                      }
                      openPasswordGate();
                    }}
                    disabled={!canCreateWorkspace}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-[10px] font-pmedium shadow-sm transition-all whitespace-nowrap ${
                      canCreateWorkspace
                        ? "bg-[#2563EB] text-white hover:bg-primary/95 active:scale-95"
                        : "cursor-not-allowed bg-slate-200 text-slate-500"
                    }`}
                  >
                    <LockKeyhole size={13} strokeWidth={3} />
                    CREATE UNIT
                  </button>
                  {isFounder && workspaceLimit !== null ? (
                    <span
                      className={`text-[10px] font-pmedium ${
                        atWorkspaceLimit ? "text-rose-600" : "text-slate-500"
                      }`}
                    >
                      {keptWorkspaceCount}/{workspaceLimit} units kept
                      {activeWorkspaceLimit !== null
                        ? ` · ${activeWorkspaceCount}/${activeWorkspaceLimit} active`
                        : ""}
                      {atKeptLimit
                        ? " — delete one to add more"
                        : atActiveLimit
                        ? " — disable one to add more"
                        : ""}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="p-3 sm:p-4 lg:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Linked Units</p>
                  <p className="text-[10px] font-pmedium text-slate-400">
                    Switch, enable/disable or delete units. The main unit is protected.
                  </p>
                </div>
                {workspaceList.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-slate-400 font-pmedium">
                    No linked units found.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full min-w-[760px] border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">
                          <th className="px-4 py-3">Unit</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Plan</th>
                          <th className="px-4 py-3">Location</th>
                          <th className="px-4 py-3">Employees</th>
                          <th className="px-4 py-3">Created</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {workspaceList.map((workspace) => (
                          <tr key={workspace.id} className="text-[12px] font-pmedium text-slate-700 align-top">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-950">{workspace.workspaceName}</span>
                                {workspace.isMain ? (
                                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-widest text-[#2563EB]">
                                    Main
                                  </span>
                                ) : null}
                              </div>
                              {workspace.businessName ? (
                                <p className="mt-0.5 text-[10px] text-slate-400">{workspace.businessName}</p>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              {workspace.isDeleted ? (
                                <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-widest text-rose-700">
                                  Deleted
                                </span>
                              ) : workspace.isActiveWorkspace ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Current
                                </span>
                              ) : workspace.isDisabled ? (
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-widest text-amber-700">
                                  Disabled
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-widest text-emerald-700">
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 capitalize">{workspace.selectedPlan || "—"}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <MapPin className="h-3 w-3" />
                                {workspace.location || "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3">{workspace.metrics?.totalEmployees ?? 0}</td>
                            <td className="px-4 py-3 text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {workspace.createdAt ? new Date(workspace.createdAt).toLocaleDateString() : "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  title="View details"
                                  onClick={() => setViewingWorkspace(workspace)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                {!workspace.isDeleted ? (
                                  <button
                                    type="button"
                                    title="Rename unit"
                                    onClick={() => openEditWorkspace(workspace)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                ) : null}
                                {!workspace.isActiveWorkspace && !workspace.isDisabled && !workspace.isDeleted ? (
                                  <button
                                    type="button"
                                    title="Switch to this unit"
                                    onClick={() => handleSwitchWorkspace(workspace)}
                                    disabled={Boolean(switchingWorkspaceId)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-[#2563EB] transition hover:bg-blue-100 disabled:opacity-60"
                                  >
                                    {switchingWorkspaceId === workspace.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <ArrowLeftRight className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                ) : null}
                                {workspace.canEnable ? (
                                  <button
                                    type="button"
                                    title="Enable unit"
                                    onClick={() => handleToggleWorkspaceStatus(workspace)}
                                    disabled={Boolean(mutatingWorkspaceId)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                                  >
                                    {mutatingWorkspaceId === workspace.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Power className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                ) : null}
                                {workspace.canDisable ? (
                                  <button
                                    type="button"
                                    title="Disable unit"
                                    onClick={() => handleToggleWorkspaceStatus(workspace)}
                                    disabled={Boolean(mutatingWorkspaceId)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                                  >
                                    {mutatingWorkspaceId === workspace.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <PowerOff className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                ) : null}
                                {workspace.canDelete ? (
                                  <button
                                    type="button"
                                    title="Delete unit"
                                    onClick={() => setDeletingWorkspace(workspace)}
                                    disabled={Boolean(mutatingWorkspaceId)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                ) : null}
                                {workspace.canRequestRecovery ? (
                                  <button
                                    type="button"
                                    title="Request recovery from the WONO team"
                                    onClick={() => handleRequestRecovery(workspace)}
                                    disabled={Boolean(mutatingWorkspaceId)}
                                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-[11px] font-pmedium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
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
                                  <span className="text-[10px] font-pmedium text-indigo-600">
                                    Recovery requested
                                  </span>
                                ) : null}
                                {workspace.isMain ? (
                                  <span className="text-[10px] font-pmedium text-slate-400">Protected</span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            <section data-tour="unit-settings-business-hours" className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <span className="rounded-2xl bg-amber-50 p-2 text-amber-600 shrink-0">
                    <Clock className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Business Hours</p>
                    <p className="mt-1 text-[11px] font-pmedium leading-6 text-slate-500">
                      Set operating hours for meeting rooms, walk-ins, and bookings. Applied across all resources.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={saveBusinessHours}
                  disabled={isSavingHours}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-[10px] font-pmedium shadow-sm transition-all whitespace-nowrap bg-[#2563EB] text-white hover:bg-primary/95 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingHours ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} strokeWidth={3} />}
                  {isSavingHours ? "SAVING..." : "SAVE HOURS"}
                </button>
              </div>
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Opening Time</label>
                    <input
                      type="time"
                      value={businessStart}
                      onChange={(e) => setBusinessStart(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Closing Time</label>
                    <input
                      type="time"
                      value={businessEnd}
                      onChange={(e) => setBusinessEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                  </div>
                </div>
                <p className="mt-3 text-[10px] font-pmedium text-slate-400">
                  Current: {businessStart ? (() => { const [h, m] = businessStart.split(':'); const hr = parseInt(h); return hr <= 12 ? `${hr || 12}:${m} AM` : `${hr - 12}:${m} PM`; })() : '--'} – {businessEnd ? (() => { const [h, m] = businessEnd.split(':'); const hr = parseInt(h); return hr <= 12 ? `${hr || 12}:${m} AM` : `${hr - 12}:${m} PM`; })() : '--'}
                </p>
              </div>
            </section>

            

            <section data-tour="unit-settings-billing" className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <span className="rounded-2xl bg-emerald-50 p-2 text-emerald-600 shrink-0">
                    <ReceiptText className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Tax & Payment Preferences</p>
                    <p className="mt-1 text-[11px] font-pmedium leading-6 text-slate-500">
                      These location-level rules drive external and walk-in booking totals, payment evidence, details, and emails.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={saveBusinessHours}
                  disabled={isSavingHours}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-[10px] font-pmedium shadow-sm transition-all whitespace-nowrap bg-[#2563EB] text-white hover:bg-primary/95 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingHours ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} strokeWidth={3} />}
                  {isSavingHours ? "SAVING..." : "SAVE PREFERENCES"}
                </button>
              </div>
              <div className="p-3 sm:p-4 lg:p-5 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span>
                      <span className="block text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Apply tax</span>
                      <span className="text-[10px] text-slate-400">Disable for tax-free or externally handled locations.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={billing.tax.enabled}
                      onChange={(event) => setBilling((current) => ({ ...current, tax: { ...current.tax, enabled: event.target.checked } }))}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span>
                      <span className="block text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Prices include tax</span>
                      <span className="text-[10px] text-slate-400">Extract tax from the entered price instead of adding it.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={billing.tax.priceIncludesTax}
                      onChange={(event) => setBilling((current) => ({ ...current, tax: { ...current.tax, priceIncludesTax: event.target.checked } }))}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Tax label</span>
                    <input
                      type="text"
                      maxLength={40}
                      value={billing.tax.label}
                      onChange={(event) => setBilling((current) => ({ ...current, tax: { ...current.tax, label: event.target.value } }))}
                      placeholder="VAT, GST, Sales Tax..."
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Tax rate (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={billing.tax.ratePercent}
                      onChange={(event) => setBilling((current) => ({ ...current, tax: { ...current.tax, ratePercent: Math.min(100, Math.max(0, Number(event.target.value) || 0)) } }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                  </label>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <CreditCard size={14} className="text-[#2563EB]" />
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Accepted payment methods</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.values(PAYMENT_METHOD_CATALOG).map((method) => {
                      const checked = billing.paymentMethods.some((entry) => entry.code === method.code);
                      return (
                        <label key={method.code} className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition ${checked ? 'border-blue-200 bg-blue-50/60' : 'border-slate-200 bg-white'} ${method.code === 'cash' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={method.code === "cash"}
                            onChange={() => togglePaymentMethod(method.code)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                          <span>
                            <span className="block text-[11px] font-pmedium text-slate-800">{method.label}</span>
                            <span className="text-[9px] font-pmedium text-slate-400">
                              {method.requiresReference ? 'Reference required' : 'No reference required'} · {method.requiresProof ? 'Proof required' : 'No proof required'}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400">Cash remains available as the universal fallback. Local methods are preselected when a new location is created.</p>
                </div>
              </div>
            </section>

            {/* <section className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
                <div>
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Unit Snapshot</p>
                  <p className="mt-1 text-[11px] font-pmedium leading-6 text-slate-500">
                    Current founder-level view of active unit and shared totals.
                  </p>
                </div>
                {overview?.workspaceManagement?.enabled && canOpenWorkspaceManagement ? (
                  <button
                    type="button"
                    onClick={() => navigate("/company-settings/workspace-management")}
                    className="inline-flex h-8.5 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-pmedium text-slate-700 transition hover:bg-slate-50 whitespace-nowrap"
                  >
                    <PanelsTopLeft className="h-4 w-4" />
                    OPEN MANAGEMENT
                  </button>
                ) : null}
              </div>

              <div className="p-3 sm:p-4 lg:p-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[11px] font-pmedium uppercase tracking-[0.16em] text-slate-400">Active unit</p>
                    <p className="mt-1 text-[16px] leading-none font-pmedium text-slate-950">{activeWorkspaceName}</p>
                    <p className="mt-1 text-[11px] font-pmedium text-slate-500">{activeWorkspaceLocation}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[11px] font-pmedium uppercase tracking-[0.16em] text-slate-400">Total tasks</p>
                    <p className="mt-1 text-[16px] leading-none font-pmedium text-slate-950">{overview?.summary?.totalTasks || 0}</p>
                    <p className="mt-1 text-[11px] font-pmedium text-slate-500">Across Linked Units</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[11px] font-pmedium uppercase tracking-[0.16em] text-slate-400">Departments</p>
                    <p className="mt-1 text-[16px] leading-none font-pmedium text-slate-950">{overview?.summary?.totalDepartments || 0}</p>
                    <p className="mt-1 text-[11px] font-pmedium text-slate-500">Founder-wide active departments</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[11px] font-pmedium uppercase tracking-[0.16em] text-slate-400">Overall performance</p>
                    <p className="mt-1 text-[16px] leading-none font-pmedium text-slate-950">{overview?.summary?.performance?.overallScore || 0}%</p>
                    <p className="mt-1 text-[11px] font-pmedium text-slate-500">Tickets and tasks combined</p>
                  </div>
                </div>
              </div>
            </section> */}
        </div>
        </div>
        )}
    </PageFrame>
    </div>

      {viewingWorkspace ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Unit Details</p>
                <p className="mt-1 text-[16px] font-pmedium text-slate-950">{viewingWorkspace.workspaceName}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingWorkspace(null)}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 px-3 text-[12px] font-pmedium text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Business Name", value: viewingWorkspace.businessName || "—" },
                { label: "Plan", value: (viewingWorkspace.selectedPlan || "—").toString() },
                { label: "Location", value: viewingWorkspace.location || "—" },
                { label: "Employees", value: String(viewingWorkspace.metrics?.totalEmployees ?? 0) },
                {
                  label: "Status",
                  value: viewingWorkspace.isDeleted
                    ? "Deleted"
                    : viewingWorkspace.isDisabled
                    ? "Disabled"
                    : viewingWorkspace.isActiveWorkspace
                    ? "Active (current)"
                    : "Active",
                },
                {
                  label: "Created",
                  value: viewingWorkspace.createdAt
                    ? new Date(viewingWorkspace.createdAt).toLocaleDateString()
                    : "—",
                },
              ].map((row) => (
                <div key={row.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{row.label}</p>
                  <p className="mt-1 text-[13px] font-pmedium text-slate-900 capitalize break-words">{row.value}</p>
                </div>
              ))}
            </div>
            {viewingWorkspace.isMain ? (
              <p className="mt-3 text-[11px] font-pmedium text-slate-500">
                This is your main unit created at registration — it can't be disabled or deleted.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {editingWorkspace ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-50 p-2 text-[#2563EB] shrink-0">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[14px] font-pmedium text-slate-950">Rename unit</p>
                <p className="mt-1 text-[12px] font-pmedium text-slate-500">
                  Update the unit name. Other details stay unchanged.
                </p>
              </div>
            </div>
            <form onSubmit={handleSaveEdit} className="mt-5 space-y-4">
              <label className="grid gap-2">
                <span className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Unit Name</span>
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  maxLength={120}
                  autoFocus
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-pmedium text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-50"
                  required
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isSavingEdit) setEditingWorkspace(null);
                  }}
                  disabled={isSavingEdit}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-[12px] font-pmedium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-[12px] font-pmedium text-white shadow-sm transition hover:bg-[#1e4fd1] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

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

      {isPasswordModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-blue-50 p-2 text-[#2563EB]">
                <LockKeyhole className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-pmedium text-primary">Confirm password</h2>
                <p className="mt-1 text-sm font-pmedium leading-6 text-slate-500">
                  Enter your current password to start a new workspace under this founder account.
                </p>
              </div>
            </div>

            <form onSubmit={startAdditionalWorkspaceFlow} className="mt-6 space-y-4">
              <label className="grid gap-2">
                <span className="text-[11px] font-pmedium uppercase tracking-[0.16em] text-slate-500">Current password</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Enter your current password"
                  autoFocus
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-pmedium text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-50"
                  required
                />
              </label>
              {passwordError ? <p className="text-sm font-pmedium text-red-500">{passwordError}</p> : null}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closePasswordGate}
                  disabled={isSubmitting}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-pmedium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 text-sm font-pmedium text-white shadow-sm transition hover:bg-[#1e4fd1] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {isSubmitting ? "Verifying..." : "Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
