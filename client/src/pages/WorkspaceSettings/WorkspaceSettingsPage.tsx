import { FormEvent, useEffect, useMemo, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  Briefcase,
  Building2,
  ClipboardList,
  Loader2,
  LockKeyhole,
  MapPin,
  PanelsTopLeft,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../../hooks/useAuth";
import { getWorkspaceManagementOverview } from "../../services/workspace-management";

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

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-1.5 text-[20px] leading-none font-black text-slate-950">{value}</p>
        </div>
        <span className="rounded-xl bg-blue-50 p-1.5 text-[#2563EB]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
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
        if (mounted) toast.error(error?.response?.data?.message || "Unable to load workspace information.");
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
  const activeWorkspaceName = activeWorkspace?.workspaceName || "Workspace";
  const activeWorkspaceLocation = activeWorkspace?.location || "Location not set";

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
    <div className="min-h-full w-full bg-slate-50 p-4 text-slate-900 sm:p-5 lg:p-6">
      <div className="w-full space-y-4">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">
            <Sparkles className="h-3.5 w-3.5" />
            Workspace setting and creation
          </div>
          <h1 className="mt-2.5 text-[28px] leading-none font-black tracking-tight text-slate-950">Workspace Settings</h1>
          <p className="mt-2 max-w-3xl text-[11px] font-medium leading-6 text-slate-500">
            Manage the founder-level workspace flow. Create new workspace branches securely and unlock workspace management once you have more than one workspace.
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <StatCard label="Owned Workspaces" value={workspaceCount} icon={Briefcase} />
          <StatCard label="Active Workspace" value={activeWorkspaceName} icon={Building2} />
          <StatCard label="Combined Employees" value={overview?.summary?.totalEmployees || 0} icon={Users} />
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="rounded-2xl bg-blue-50 p-2 text-[#2563EB]">
                  <Plus className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-[22px] leading-none font-bold text-slate-950">Create New Workspace</h2>
                  <p className="mt-1 text-[11px] font-medium leading-6 text-slate-500">
                    Keep the same founder onboarding flow and create a new branch workspace under the same business.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-blue-100 bg-blue-50/70 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/70 bg-white px-5 py-5 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Prefilled business data</p>
                    <p className="mt-1 text-[14px] font-bold text-slate-950">
                      {(auth.user as { companyName?: string } | null)?.companyName || "Business name"}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">Brand from current workspace</p>
                  </div>
                  <div className="rounded-2xl border border-dashed border-blue-200 bg-white/80 px-5 py-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">New branch identity</p>
                    <p className="mt-1 text-[14px] font-bold text-slate-950">Workspace name starts empty</p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                      Location, address and vertical are entered fresh for the new branch.
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-white px-5 py-4">
                  <div className="text-[11px] font-medium leading-6 text-slate-600">
                    Founder password verification runs first, then branch workspace onboarding opens.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canCreateWorkspace) return;
                      openPasswordGate();
                    }}
                    disabled={!canCreateWorkspace}
                    className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl px-3.5 text-[11px] font-semibold shadow-sm transition ${
                      canCreateWorkspace
                        ? "bg-[#2563EB] text-white hover:bg-[#1e4fd1]"
                        : "cursor-not-allowed bg-slate-200 text-slate-500"
                    }`}
                  >
                    <LockKeyhole className="h-4 w-4" />
                    Create Workspace
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[22px] leading-none font-bold text-slate-950">Workspace Snapshot</h2>
                  <p className="mt-1 text-[11px] font-medium leading-6 text-slate-500">
                    Current founder-level view of active workspace and shared totals.
                  </p>
                </div>
                {overview?.workspaceManagement?.enabled && canOpenWorkspaceManagement ? (
                  <button
                    type="button"
                    onClick={() => navigate("/company-settings/workspace-management")}
                    className="inline-flex h-8.5 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <PanelsTopLeft className="h-4 w-4" />
                    Open Management
                  </button>
                ) : null}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Active workspace</p>
                  <p className="mt-1 text-[16px] leading-none font-black text-slate-950">{activeWorkspaceName}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">{activeWorkspaceLocation}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Total tasks</p>
                  <p className="mt-1 text-[16px] leading-none font-black text-slate-950">{overview?.summary?.totalTasks || 0}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">Across linked Workspaces</p>
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
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-[14px] font-bold text-slate-950">Linked Workspaces</h2>
              {isLoadingOverview ? (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading workspaces...
                </div>
              ) : (
                <div className="mt-4 space-y-3">
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
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-[14px] font-bold text-slate-950">Creation flow notes</h2>
              <div className="mt-4 grid gap-3.5">
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
            </section>
          </aside>
        </div>
      </div>

      {isPasswordModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-blue-50 p-2 text-[#2563EB]">
                <LockKeyhole className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-950">Confirm password</h2>
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
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1e4fd1] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {isSubmitting ? "Verifying..." : "Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

