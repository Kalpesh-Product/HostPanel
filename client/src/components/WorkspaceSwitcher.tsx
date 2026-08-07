import { useState } from "react";
import { Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import useAuth from "../hooks/useAuth";
import useRefresh from "../hooks/useRefresh";
import { switchWorkspaceSession } from "../services/workspace-session";

type WorkspaceOption = {
  id: string;
  workspaceName: string;
  location?: string;
  isMain?: boolean;
};

const getWorkspaceLabel = (workspace: WorkspaceOption) => {
  const label = [workspace.workspaceName || "Unit", workspace.location]
    .filter(Boolean)
    .join(" - ");
  return workspace.isMain ? `${label} (Main)` : label;
};

export default function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const refresh = useRefresh();
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
  const activeWorkspace = accessibleWorkspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const activeWorkspaceLabel = activeWorkspace ? getWorkspaceLabel(activeWorkspace) : "Unit";
  const switcherWidthCh = Math.min(Math.max(activeWorkspaceLabel.length + 10, 22), 46);

  const handleSwitch = async (workspaceId: string) => {
    if (!workspaceId || workspaceId === activeWorkspaceId) return;
    try {
      setIsSwitching(true);
      await switchWorkspaceSession(axiosPrivate, workspaceId);
      // The switch endpoint only returns the active workspace id + list. Re-fetch
      // the full session so the header role badge and the sidebar nav pick up the
      // new unit's role / granted modules instead of showing the previous unit's.
      try {
        await refresh();
      } catch {
        // Session refresh errors are handled inside useRefresh (token rotation,
        // session clearing). The switch itself already succeeded.
      }
      toast.success("Unit switched.");
      navigate("/dashboard", { replace: true });
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
      className="flex items-center gap-2 rounded-[16px] border border-white/80 bg-white/60 px-2.5 py-2 sm:px-3 shadow-[0_4px_14px_rgba(15,23,42,0.10)]"
    >
      <Building2 className="h-4 w-4 shrink-0 text-slate-500" />
      <select
        value={activeWorkspaceId}
        onChange={(event) => {
          void handleSwitch(event.target.value);
        }}
        disabled={isSwitching}
        title={activeWorkspace ? getWorkspaceLabel(activeWorkspace) : "Unit"}
        className="w-full bg-transparent pr-5 text-[12px] font-semibold text-slate-700 outline-none disabled:opacity-60 sm:text-[13px]"
      >
        {accessibleWorkspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {getWorkspaceLabel(workspace)}
          </option>
        ))}
      </select>
    </div>
  );
}
