import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  Briefcase,
  Building2,
  ClipboardList,
  ListChecks,
  Loader2,
  LockKeyhole,
  MapPin,
  PanelsTopLeft,
  Plus,
  Users,
} from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../../hooks/useAuth";
import { getWorkspaceManagementOverview } from "../../services/unit-management";

type WorkspaceItem = {
  id: string;
  workspaceName: string;
  location?: string;
  isActiveWorkspace?: boolean;
  metrics?: { totalEmployees?: number };
};

type Overview = {
  workspaceCount: number;
  workspaceManagement?: { enabled?: boolean };
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
  const { auth } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const canCreateWorkspace = currentRole === "founder" || currentRole === "owner";
  const canOpenWorkspaceManagement = currentRole === "founder" || currentRole === "owner";
  const activeWorkspaceName = activeWorkspace?.workspaceName || "Unit";
  const activeWorkspaceLocation = activeWorkspace?.location || "Location not set";

  // Summary cards (DESIGN.md: 4-col grid, white rounded-[2rem] with colored border-l-4 accents)
  const summaryCards = [
    {
      key: "units",
      icon: Briefcase,
      label: "Owned Units",
      value: workspaceCount,
      cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md",
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
      key: "employees",
      icon: Users,
      label: "Combined Employees",
      value: overview?.summary?.totalEmployees || 0,
      cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500",
      iconClass: "bg-amber-50 text-amber-600",
    },
    {
      key: "tasks",
      icon: ListChecks,
      label: "Total Tasks",
      value: overview?.summary?.totalTasks || 0,
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.key} className={card.cardClass}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                    <p className="text-[15px] font-black text-slate-900 truncate">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}><Icon size={16} /></div>
                </div>
              );
            })}
          </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-4">
            <section className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              {/* Header row */}
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <span className="rounded-2xl bg-blue-50 p-2 text-[#2563EB] shrink-0">
                    <Plus className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Create New Unit</p>
                    <p className="mt-1 text-[11px] font-medium leading-6 text-slate-500">
                      Keep the same founder onboarding flow and create a new branch unit under the same business.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!canCreateWorkspace) return;
                    openPasswordGate();
                  }}
                  disabled={!canCreateWorkspace}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-[10px] font-bold shadow-sm transition-all whitespace-nowrap ${
                    canCreateWorkspace
                      ? "bg-[#2563EB] text-white hover:bg-primary/95 active:scale-95"
                      : "cursor-not-allowed bg-slate-200 text-slate-500"
                  }`}
                >
                  <LockKeyhole size={13} strokeWidth={3} />
                  CREATE UNIT
                </button>
              </div>

              <div className="p-3 sm:p-4 lg:p-5">
                <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-10">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/70 bg-white px-5 py-5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Prefilled business data</p>
                      <p className="mt-1 text-[14px] font-bold text-slate-950">
                        {(auth.user as { companyName?: string } | null)?.companyName || "Business name"}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">Brand from current unit</p>
                    </div>
                    <div className="rounded-2xl border border-dashed border-blue-200 bg-white/80 px-5 py-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">New branch identity</p>
                      <p className="mt-1 text-[14px] font-bold text-slate-950">Unit name starts empty</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                        Location, address and vertical are entered fresh for the new branch.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-white px-5 py-4">
                    <div className="text-[11px] font-medium leading-6 text-slate-600">
                      Founder password verification runs first, then branch unit onboarding opens.
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#2563EB] flex items-center gap-1.5">
                      <LockKeyhole size={13} strokeWidth={3} />
                      Password Gated
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* <section className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit Snapshot</p>
                  <p className="mt-1 text-[11px] font-medium leading-6 text-slate-500">
                    Current founder-level view of active unit and shared totals.
                  </p>
                </div>
                {overview?.workspaceManagement?.enabled && canOpenWorkspaceManagement ? (
                  <button
                    type="button"
                    onClick={() => navigate("/company-settings/workspace-management")}
                    className="btn-pill inline-flex h-8.5 items-center justify-center gap-2 border border-slate-200 bg-white px-3 text-slate-700 transition hover:bg-slate-50 whitespace-nowrap"
                  >
                    <PanelsTopLeft className="h-4 w-4" />
                    OPEN MANAGEMENT
                  </button>
                ) : null}
              </div>

              <div className="p-3 sm:p-4 lg:p-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Active unit</p>
                    <p className="mt-1 text-[16px] leading-none font-black text-slate-950">{activeWorkspaceName}</p>
                    <p className="mt-1 text-[11px] font-medium text-slate-500">{activeWorkspaceLocation}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Total tasks</p>
                    <p className="mt-1 text-[16px] leading-none font-black text-slate-950">{overview?.summary?.totalTasks || 0}</p>
                    <p className="mt-1 text-[11px] font-medium text-slate-500">Across Linked Units</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Departments</p>
                    <p className="mt-1 text-[16px] leading-none font-black text-slate-950">{overview?.summary?.totalDepartments || 0}</p>
                    <p className="mt-1 text-[11px] font-medium text-slate-500">Founder-wide active departments</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Overall performance</p>
                    <p className="mt-1 text-[16px] leading-none font-black text-slate-950">{overview?.summary?.performance?.overallScore || 0}%</p>
                    <p className="mt-1 text-[11px] font-medium text-slate-500">Tickets and tasks combined</p>
                  </div>
                </div>
              </div>
            </section> */}
          </div>

          <aside className="space-y-4">
            <section className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 bg-slate-50/50">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Linked Units</p>
              </div>
              <div className="p-3 sm:p-4 lg:p-5">
                {isLoadingOverview ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading workspaces...
                  </div>
                ) : workspaceList.length === 0 ? (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-8 text-center text-slate-400 font-semibold">
                    No linked units found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workspaceList.slice(0, 4).map((workspace) => (
                      <article key={workspace.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-bold text-slate-950">{workspace.workspaceName}</p>
                            <p className="mt-1 truncate text-[10px] font-medium text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {workspace.location || "Location not set"}
                              </span>
                            </p>
                            <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                              {workspace.metrics?.totalEmployees || 0} employees
                            </p>
                          </div>
                          {workspace.isActiveWorkspace ? (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#2563EB]">
                            Active
                          </span>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              </div>
            </section>

            <section className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 bg-slate-50/50">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Creation flow notes</p>
              </div>
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="grid gap-3.5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <LockKeyhole className="h-4 w-4 text-[#2563EB]" />
                      <p className="text-[12px] font-bold text-slate-950">Password check first</p>
                    </div>
                    <p className="mt-1.5 text-[10px] font-medium text-slate-500">Founders must confirm password before branch setup starts.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-violet-600" />
                      <p className="text-[12px] font-bold text-slate-950">Same onboarding UI</p>
                    </div>
                    <p className="mt-1.5 text-[10px] font-medium text-slate-500">Business identity is prefilled, branch-specific fields are entered fresh.</p>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
        </div>
        )}
    </PageFrame>
    </div>

      {isPasswordModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-blue-50 p-2 text-[#2563EB]">
                <LockKeyhole className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-pmedium text-primary">Confirm password</h2>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                  Enter your current password to start a new workspace under this founder account.
                </p>
              </div>
            </div>

            <form onSubmit={startAdditionalWorkspaceFlow} className="mt-6 space-y-4">
              <label className="grid gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Current password</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Enter your current password"
                  autoFocus
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-50"
                  required
                />
              </label>
              {passwordError ? <p className="text-sm font-semibold text-red-500">{passwordError}</p> : null}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closePasswordGate}
                  disabled={isSubmitting}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-pill inline-flex h-11 items-center justify-center gap-2 bg-[#2563EB] px-5 text-white shadow-sm transition hover:bg-[#1e4fd1] disabled:cursor-not-allowed disabled:opacity-60"
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
