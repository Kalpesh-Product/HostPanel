import { useState } from "react";
import { Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import useAuth from "../hooks/useAuth";
import { switchWorkspaceSession } from "../services/workspace-session";

type WorkspaceOption = {
  id: string;
  workspaceName: string;
};

export default function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const { auth, setAuth } = useAuth();
  const [isSwitching, setIsSwitching] = useState(false);

  const currentUser = (auth.user as {
    accessibleWorkspaces?: WorkspaceOption[];
    primaryWorkspace?: string;
  } | null);
  const accessibleWorkspaces = Array.isArray(currentUser?.accessibleWorkspaces)
    ? currentUser.accessibleWorkspaces
    : [];
  const canSwitch = accessibleWorkspaces.length > 1;
  const activeWorkspaceId = String(currentUser?.primaryWorkspace || "");
  const activeWorkspaceName =
    accessibleWorkspaces.find((workspace) => workspace.id === activeWorkspaceId)?.workspaceName || "Unit";
  const switcherWidthCh = Math.min(Math.max(activeWorkspaceName.length + 10, 22), 46);

  const handleSwitch = async (workspaceId: string) => {
    if (!workspaceId || workspaceId === activeWorkspaceId) return;
    try {
      setIsSwitching(true);
      const response = await switchWorkspaceSession(axiosPrivate, workspaceId);
      const switchedWorkspaceId = String(response?.data?.data?.activeWorkspaceId || workspaceId);
      const nextAccessible = Array.isArray(response?.data?.data?.accessibleWorkspaces)
        ? response.data.data.accessibleWorkspaces
        : accessibleWorkspaces;
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
      toast.success("Unit switched.");
      navigate("/company-settings", { replace: true });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to switch unit.");
    } finally {
      setIsSwitching(false);
    }
  };

  if (!canSwitch) return null;

  return (
    <div
      data-tour="workspace-switcher"
      style={{ width: `${switcherWidthCh}ch` }}
      className="flex items-center gap-2 rounded-[16px] border border-white/80 bg-white/60 px-2.5 py-2 sm:px-3 shadow-[0_2px_8px_rgba(15,23,42,0.03)]"
    >
      <Building2 className="h-4 w-4 shrink-0 text-slate-500" />
      <select
        value={activeWorkspaceId}
        onChange={(event) => {
          void handleSwitch(event.target.value);
        }}
        disabled={isSwitching}
        title={accessibleWorkspaces.find((workspace) => workspace.id === activeWorkspaceId)?.workspaceName || ""}
        className="w-full bg-transparent pr-5 text-[12px] font-semibold text-slate-700 outline-none disabled:opacity-60 sm:text-[13px]"
      >
        {accessibleWorkspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.workspaceName || "Unit"}
          </option>
        ))}
      </select>
    </div>
  );
}
