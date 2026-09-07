import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  Users,
  X,
} from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import TimePicker12h, { formatTime12hLabel } from "../../components/ui/TimePicker12h";
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
import { getCountryIsoCode } from "../../utils/locationApi";
import WorkspaceEditModal, { EMPTY_EDIT_FORM, type EditUnitForm } from "./WorkspaceEditModal";

const TIMEZONE_OPTIONS: string[] = (() => {
  try {
    const supported = (Intl as any).supportedValuesOf?.("timeZone");
    if (Array.isArray(supported) && supported.length > 0) return supported;
  } catch {
    // fall through to the curated list below
  }
  return [
    "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "America/Anchorage", "America/Adak", "Pacific/Honolulu",
    "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Asia/Shanghai",
    "Europe/London", "Europe/Paris", "Europe/Berlin",
    "Australia/Sydney", "UTC",
  ];
})();

function formatTimeInZone(timeZone: string): string {
  if (!timeZone) return "-";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone, hour: "2-digit", minute: "2-digit", hour12: true,
    }).format(new Date());
  } catch {
    return "-";
  }
}

function unitStatusPillClass(workspace: WorkspaceItem): string {
  const base = "inline-flex px-2 py-0.5 rounded-md text-[9px] font-pmedium uppercase tracking-wider border";
  if (workspace.isDeleted) return `${base} bg-rose-50 text-rose-700 border-rose-200`;
  if (workspace.isActiveWorkspace) return `${base} bg-blue-50 text-[#2563EB] border-blue-200`;
  if (workspace.isDisabled) return `${base} bg-amber-50 text-amber-700 border-amber-200`;
  return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
}

function unitStatusLabel(workspace: WorkspaceItem): string {
  if (workspace.isDeleted) return "Deleted";
  if (workspace.isActiveWorkspace) return "Active (current)";
  if (workspace.isDisabled) return "Disabled";
  return "Active";
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Fiscal-year start options shown as their full span, e.g. "April to March".
// A January start wraps around to end in December of the same year.
const FISCAL_YEAR_RANGE_OPTIONS = MONTH_NAMES.map((month, index) => {
  const startMonth = index + 1;
  const endMonth = startMonth === 1 ? 12 : startMonth - 1;
  return { value: startMonth, label: `${month} to ${MONTH_NAMES[endMonth - 1]}` };
});

type WorkspaceItem = {
  id: string;
  workspaceName: string;
  businessName?: string;
  brandName?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  timezone?: string;
  currency?: string;
  businessType?: string;
  businessTypes?: string[];
  address?: string;
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
  const [editForm, setEditForm] = useState<EditUnitForm>(EMPTY_EDIT_FORM);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [businessStart, setBusinessStart] = useState("09:00");
  const [businessEnd, setBusinessEnd] = useState("22:00");
  const [is24Hours, setIs24Hours] = useState(false);
  const [workspaceTimezone, setWorkspaceTimezone] = useState("Asia/Kolkata");
  const [workspaceCurrency, setWorkspaceCurrency] = useState("INR");
  const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState(4);
  const [billing, setBilling] = useState<WorkspaceBillingConfig>(() => getCountryBillingDefaults("IN"));
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [isSavingFiscalYear, setIsSavingFiscalYear] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

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
          setIs24Hours(Boolean(bh?.is24Hours));
          setWorkspaceTimezone(preferences.timezone || "Asia/Kolkata");
          setWorkspaceCurrency(preferences.currency || "INR");
          setFiscalYearStartMonth(Number(preferences.fiscalYearStartMonth) || 4);
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
      labelClass: "text-slate-400",
    },
    {
      key: "active",
      icon: Building2,
      label: "Active Unit",
      value: activeWorkspaceName,
      cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500",
      iconClass: "bg-blue-50 text-blue-600",
      labelClass: "text-blue-600",
    },
    {
      key: "remaining",
      icon: PanelsTopLeft,
      label: "Units Remaining",
      value: unitsRemainingValue,
      cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500",
      iconClass: "bg-amber-50 text-amber-600",
      labelClass: "text-amber-600",
    },
    {
      key: "plan",
      icon: CreditCard,
      label: "Plan",
      value: planLabel,
      cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500",
      iconClass: "bg-emerald-50 text-emerald-600",
      labelClass: "text-emerald-600",
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

      closePasswordGate();
      navigate("/create-workspace", {
        state: {
          additionalWorkspaceMode: true,
          selectedPlan: String(workspace?.selectedPlan || "basic"),
          workspaceDetails: {
            workspaceName: "",
            businessName,
            brandName: "",
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
    if (!is24Hours) {
      if (!businessStart || !businessEnd) {
        toast.error("Please set both start and end times.");
        return;
      }
      if (businessStart >= businessEnd) {
        toast.error("Start time must be before end time.");
        return;
      }
    }
    try {
      setIsSavingHours(true);
      await updateWorkspaceSettings(axiosPrivate, {
        preferences: {
          timezone: workspaceTimezone,
          businessHours: { start: businessStart, end: businessEnd, is24Hours },
        },
      });
      toast.success("Business hours updated successfully.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update business hours.");
    } finally {
      setIsSavingHours(false);
    }
  };

  const saveFiscalYear = async () => {
    try {
      setIsSavingFiscalYear(true);
      await updateWorkspaceSettings(axiosPrivate, {
        preferences: { fiscalYearStartMonth },
      });
      // Re-read persisted truth from the server so the form can never drift
      // from what was actually stored — a silent save mismatch shows up here.
      const refreshed = await getWorkspaceSettings(axiosPrivate);
      const persisted = Number(refreshed?.data?.data?.settings?.preferences?.fiscalYearStartMonth);
      const effectiveMonth = Number.isInteger(persisted) && persisted >= 1 && persisted <= 12
        ? persisted
        : fiscalYearStartMonth;
      setFiscalYearStartMonth(effectiveMonth);
      window.localStorage.setItem("workspaceFiscalYearStartMonth", String(effectiveMonth));
      toast.success("Financial year updated successfully.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update financial year.");
    } finally {
      setIsSavingFiscalYear(false);
    }
  };

  const savePreferences = async () => {
    try {
      setIsSavingPreferences(true);
      await updateWorkspaceSettings(axiosPrivate, {
        preferences: { billing },
      });
      toast.success("Tax and payment preferences updated successfully.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update tax and payment preferences.");
    } finally {
      setIsSavingPreferences(false);
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
        isMain: Boolean(ws.isMain),
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
    setEditForm({
      workspaceName: workspace.workspaceName || "",
      brandName: workspace.brandName || "",
      address: workspace.address || "",
      city: workspace.city || "",
      state: workspace.state || "",
      country: workspace.country || "",
      countryCode: workspace.countryCode || getCountryIsoCode(workspace.country || ""),
      timezone: workspace.timezone || "",
      currency: workspace.currency || "",
      businessTypes: Array.isArray(workspace.businessTypes)
        ? workspace.businessTypes.map((item) => String(item || "").trim()).filter(Boolean)
        : String(workspace.businessType || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
    });
  };

  const handleSaveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingWorkspace?.id) return;
    const nextName = editForm.workspaceName.trim();
    if (!nextName) {
      toast.error("Unit name is required.");
      return;
    }
    try {
      setIsSavingEdit(true);
      await updateManagedWorkspace(axiosPrivate, editingWorkspace.id, {
        profile: {
          workspaceName: nextName,
          brandName: editForm.brandName,
          address: editForm.address,
          city: editForm.city,
          state: editForm.state,
          country: editForm.country,
          countryCode: editForm.countryCode,
          timezone: editForm.timezone,
          currency: editForm.currency,
          businessTypes: editForm.businessTypes,
        },
      });
      await reloadOverview();
      toast.success("Unit updated successfully.");
      setEditingWorkspace(null);
      setEditForm(EMPTY_EDIT_FORM);
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
                    <p className={`text-[10px] font-pmedium ${card.labelClass} uppercase tracking-widest mb-1`}>{card.label}</p>
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

              <div className="p-3 sm:p-4 lg:p-5" data-tour="unit-settings-linked-units">
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
                                <p className="mt-0.5 text-xs font-pmedium text-slate-400">{workspace.businessName}</p>
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
                                  title={workspace.isDeleted ? "Deleted units have no details to show" : "View details"}
                                  onClick={() => setViewingWorkspace(workspace)}
                                  disabled={Boolean(workspace.isDeleted)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                <div className="grid gap-3 sm:grid-cols-2 mb-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Workspace Timezone</label>
                    <select
                      value={workspaceTimezone}
                      onChange={(e) => setWorkspaceTimezone(e.target.value)}
                      className="w-full bg-transparent text-[12px] font-pmedium text-[#0F172A] outline-none cursor-pointer"
                    >
                      {!TIMEZONE_OPTIONS.includes(workspaceTimezone) && workspaceTimezone && (
                        <option value={workspaceTimezone}>{workspaceTimezone}</option>
                      )}
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                    <p className="text-[10px] font-pmedium text-slate-400">Current time there: {formatTimeInZone(workspaceTimezone)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Workspace Currency</p>
                    <p className="mt-1 text-[12px] font-pmedium text-[#0F172A]">{workspaceCurrency || "-"}</p>
                  </div>
                </div>
                <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={is24Hours}
                    onChange={(e) => setIs24Hours(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]/30"
                  />
                  <span className="text-[11px] font-pmedium text-[#0F172A]">Open 24 hours</span>
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Opening Time</label>
                    <TimePicker12h
                      value={businessStart}
                      onChange={setBusinessStart}
                      disabled={is24Hours}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Closing Time</label>
                    <TimePicker12h
                      value={businessEnd}
                      onChange={setBusinessEnd}
                      disabled={is24Hours}
                    />
                  </div>
                </div>
                <p className="mt-3 text-[10px] font-pmedium text-slate-400">
                  Current: {is24Hours ? "Open 24 hours" : `${formatTime12hLabel(businessStart)} – ${formatTime12hLabel(businessEnd)}`}
                </p>
              </div>
            </section>

            <section data-tour="unit-settings-fiscal-year" className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <span className="rounded-2xl bg-indigo-50 p-2 text-indigo-600 shrink-0">
                    <ClipboardList className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Financial Year</p>
                    <p className="mt-1 text-[11px] font-pmedium leading-6 text-slate-500">
                      Used by Finance, Accounting, budgets, and reports.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={saveFiscalYear}
                  disabled={isSavingFiscalYear}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-[10px] font-pmedium shadow-sm transition-all whitespace-nowrap bg-[#2563EB] text-white hover:bg-primary/95 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingFiscalYear ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} strokeWidth={3} />}
                  {isSavingFiscalYear ? "SAVING..." : "SAVE FINANCIAL YEAR"}
                </button>
              </div>
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:max-w-xs">
                  <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Financial Year Starts</label>
                  <select
                    value={fiscalYearStartMonth}
                    onChange={(event) => setFiscalYearStartMonth(Number(event.target.value))}
                    className="mt-1 w-full bg-transparent text-[12px] font-pmedium text-[#0F172A] outline-none cursor-pointer"
                  >
                    {FISCAL_YEAR_RANGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
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
                  onClick={savePreferences}
                  disabled={isSavingPreferences}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-[10px] font-pmedium shadow-sm transition-all whitespace-nowrap bg-[#2563EB] text-white hover:bg-primary/95 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingPreferences ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} strokeWidth={3} />}
                  {isSavingPreferences ? "SAVING..." : "SAVE PREFERENCES"}
                </button>
              </div>
              <div className="p-3 sm:p-4 lg:p-5 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span>
                      <span className="block text-xs font-pmedium uppercase tracking-widest text-slate-700">Apply tax</span>
                      <span className="text-xs font-pmedium text-slate-400">Disable for tax-free or externally handled locations.</span>
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
                      <span className="block text-xs font-pmedium uppercase tracking-widest text-slate-700">Prices include tax</span>
                      <span className="text-xs font-pmedium text-slate-400">Extract tax from the entered price instead of adding it.</span>
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
                  <p className="mt-2 text-xs font-pmedium text-slate-400">Cash remains available as the universal fallback. Local methods are preselected when a new location is created.</p>
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
                    onClick={() => navigate("/core-modules/workspace-management")}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingWorkspace(null)}
            className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-[2rem] max-w-xl w-full max-h-[90vh] shadow-2xl border border-white/70 relative z-[110] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                  <Building2 size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">Unit Details</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={unitStatusPillClass(viewingWorkspace)}>{unitStatusLabel(viewingWorkspace)}</span>
                    {viewingWorkspace.isMain ? (
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-pmedium uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                        Main Unit
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingWorkspace(null)}
                className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto bg-white">
              <div>
                <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                  <Building2 size={14} /> Unit Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Unit Name</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{viewingWorkspace.workspaceName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Company Name</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{viewingWorkspace.businessName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Brand Name</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{viewingWorkspace.brandName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Plan</p>
                    <p className="text-[12px] font-pmedium text-slate-900 capitalize">{viewingWorkspace.selectedPlan || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Employees</p>
                    <p className="text-[12px] font-pmedium text-slate-900 flex items-center gap-1.5">
                      <Users size={12} className="text-slate-400" />
                      {viewingWorkspace.metrics?.totalEmployees ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Created</p>
                    <p className="text-[12px] font-pmedium text-slate-900 flex items-center gap-1.5">
                      <CalendarDays size={12} className="text-slate-400" />
                      {viewingWorkspace.createdAt ? new Date(viewingWorkspace.createdAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                  <MapPin size={14} /> Location & Locale
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Country</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{viewingWorkspace.country || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">State</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{viewingWorkspace.state || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">City</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{viewingWorkspace.city || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Timezone</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{viewingWorkspace.timezone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Currency</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{viewingWorkspace.currency || "—"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Address</p>
                    <p className="text-[12px] font-pmedium text-slate-900 break-words">{viewingWorkspace.address || "—"}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                  <Layers size={14} /> Business
                </h3>
                <div className="grid grid-cols-1 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Type of Vertical</p>
                    <p className="text-[12px] font-pmedium text-slate-900">
                      {(Array.isArray(viewingWorkspace.businessTypes) && viewingWorkspace.businessTypes.length
                        ? viewingWorkspace.businessTypes.join(", ")
                        : viewingWorkspace.businessType) || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {viewingWorkspace.isMain ? (
                <p className="text-[11px] font-pmedium text-slate-500">
                  This is your main unit created at registration — it can't be disabled or deleted.
                </p>
              ) : null}
            </div>
          </motion.div>
        </div>
      ) : null}

      {editingWorkspace ? (
        <WorkspaceEditModal
          form={editForm}
          businessName={editingWorkspace.businessName}
          isSaving={isSavingEdit}
          onChange={(field, value) =>
            setEditForm((current) => ({ ...current, [field]: value }))
          }
          onClose={() => {
            if (isSavingEdit) return;
            setEditingWorkspace(null);
            setEditForm(EMPTY_EDIT_FORM);
          }}
          onSubmit={handleSaveEdit}
        />
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
