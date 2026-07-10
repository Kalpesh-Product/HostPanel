import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CheckCircle2, Sparkles, MapPin } from "lucide-react";
import { toast } from "sonner";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../../hooks/useAuth";
import useLogout from "../../hooks/useLogout";
import { switchWorkspaceSession } from "../../services/workspace-session";
import Footer from "../../components/Footer";
import logo from "../../assets/WONO_LOGO_Black_TP.png";

type WorkspaceOption = {
  id: string;
  workspaceName: string;
  businessName?: string;
  location?: string;
  isPrimary?: boolean;
};

export default function FounderWorkspaceSelectionPage() {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const { auth, setAuth } = useAuth();
  const logout = useLogout();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = (auth.user as {
    accessibleWorkspaces?: WorkspaceOption[];
    primaryWorkspace?: string;
  } | null);

  const workspaces = useMemo(
    () => (Array.isArray(user?.accessibleWorkspaces) ? user.accessibleWorkspaces : []),
    [user?.accessibleWorkspaces],
  );
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(
    String(user?.primaryWorkspace || workspaces.find((workspace) => workspace.isPrimary)?.id || workspaces[0]?.id || ""),
  );
  const lastActiveWorkspaceId = String(
    user?.primaryWorkspace || workspaces.find((workspace) => workspace.isPrimary)?.id || "",
  );

  useEffect(() => {
    if (workspaces.length <= 1) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, workspaces.length]);

  const submitSelection = async () => {
    if (!selectedWorkspaceId) {
      toast.error("Select a unit to continue.");
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await switchWorkspaceSession(axiosPrivate, selectedWorkspaceId);
      const switchedWorkspaceId = String(response?.data?.data?.activeWorkspaceId || selectedWorkspaceId);
      const nextAccessible = Array.isArray(response?.data?.data?.accessibleWorkspaces)
        ? response.data.data.accessibleWorkspaces
        : workspaces;
      setAuth((prev) => ({
        ...prev,
        user: prev.user
          ? {
              ...(prev.user as Record<string, unknown>),
              primaryWorkspace: switchedWorkspaceId,
              accessibleWorkspaces: nextAccessible,
            }
          : prev.user,
      }));
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to open the selected unit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-200">
      <div className="bg-white/80 shadow-md backdrop-blur-md">
        <div className="mx-auto flex max-w-[80rem] items-center justify-between px-6 py-3 lg:px-0">
          <a href="https://wono.co">
            <img src={logo} alt="wono" className="h-10 w-36" />
          </a>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate("/", { replace: true });
            }}
            className="group relative cursor-pointer border-none bg-transparent pb-1 text-sm font-bold uppercase transition-all duration-300"
          >
            Sign out
            <span className="absolute bottom-0 left-0 block h-[2px] w-0 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
          </button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[38rem] flex-1 px-3 py-5 sm:px-5">
        <div className="grid w-full min-h-[56vh] grid-rows-[auto_1fr_auto] rounded-[2.2rem] border border-slate-200 bg-[#f5f7fb] p-4 shadow-[0_14px_28px_rgba(15,23,42,0.08)] sm:p-5">
          <div className="self-start">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8edf8] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#2563EB]">
              <Sparkles className="h-2.5 w-2.5" />
              Unit Selection
            </span>
            <h1 className="mt-2.5 text-2xl font-black leading-tight text-slate-950">Choose your unit</h1>
            <p className="mt-1 max-w-lg text-sm font-semibold text-slate-500">
              This account has access to multiple units. Pick the one you want to open for this session.
            </p>
          </div>

          <div className="mt-4 self-stretch space-y-2.5">
            {workspaces.map((workspace) => {
              const selected = selectedWorkspaceId === workspace.id;
              return (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => setSelectedWorkspaceId(workspace.id)}
                  className={`w-full rounded-[1.6rem] border px-3.5 py-3 text-left transition sm:px-4 ${
                    selected
                      ? "border-[#2563EB] bg-[#eaf0fb] shadow-[0_8px_26px_rgba(37,99,235,0.18)]"
                      : "border-slate-300 bg-[#f8f9fc] hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#2563EB]">
                          <Building2 className="h-3 w-3" />
                        </span>
                        <p className="truncate text-base font-black text-slate-900">{workspace.workspaceName || "Unit"}</p>
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-600">
                        {workspace.businessName || "Business name not set"}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <MapPin className="h-3 w-3" />
                        {workspace.location || "Location required"}
                      </p>
                    </div>
                    {workspace.id === lastActiveWorkspaceId ? (
                      <span className="whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#2563EB] shadow-sm">
                        Last Active
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 self-end">
            <button
              type="button"
              onClick={() => {
                void submitSelection();
              }}
              disabled={!selectedWorkspaceId || isSubmitting}
              className="btn-pill flex w-full items-center justify-center gap-1.5 bg-[#2563EB] py-2.5 tracking-[0.11em] text-white disabled:opacity-60"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isSubmitting ? "Opening..." : "Open Unit"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}
