import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { getWorkspaceManagementOverview } from "../../services/unit-management";

type RoleItem = { role?: string; label?: string; count?: number };

type Workspace = {
  id: string;
  workspaceName?: string;
  businessName?: string;
  isDeleted?: boolean;
  details?: { roles?: RoleItem[] };
};

type Overview = { workspaces?: Workspace[] };

function StatusPill({ label, value, tone = "slate" }) {
  const toneClassName = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-100 bg-blue-50 text-[#2563EB]",
  }[tone];

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClassName}`}>
      <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="mt-1 text-[15px] font-pmedium text-slate-900">{value}</p>
    </div>
  );
}

export default function UnitRolesPage() {
  const axiosPrivate = useAxiosPrivate();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await getWorkspaceManagementOverview(axiosPrivate);
        if (mounted) setOverview(response?.data?.data || null);
      } catch (error: any) {
        if (mounted) toast.error(error?.response?.data?.message || "Unable to load role data.");
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

  const combinedRoles = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    workspaceList.forEach((workspace) => {
      (workspace.details?.roles || []).forEach((item) => {
        const key = String(item.role || item.label || "unknown");
        const label = item.label || item.role || "Unknown";
        const existing = counts.get(key);
        counts.set(key, { label, count: (existing?.count || 0) + Number(item.count || 0) });
      });
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [workspaceList]);

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
                  Roles &amp; Access
                </h2>
                <p className="text-xs font-pmedium text-slate-500 mt-1">
                  Role coverage and responsibility across every linked unit.
                </p>
              </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2">
                <span className="rounded-2xl bg-blue-50 p-2 text-[#2563EB]">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">Combined role coverage</h3>
                  <p className="mt-1 text-[11px] text-slate-500">Role totals merged across all linked units.</p>
                </div>
              </div>
              <div className="p-5">
                {combinedRoles.length ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {combinedRoles.map((item) => (
                      <StatusPill key={item.label} label={item.label} value={item.count} tone="blue" />
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-[11px] text-slate-500">
                    No role data is available yet.
                  </div>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">Roles by unit</h3>
                <p className="mt-1 text-[11px] text-slate-500">Breakdown per linked unit.</p>
              </div>
              <div className="max-h-[480px] overflow-y-auto p-5 space-y-4">
                {workspaceList.length ? (
                  workspaceList.map((workspace) => (
                    <div key={workspace.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-sm font-pmedium text-slate-950">
                        {workspace.workspaceName || workspace.businessName || "Unnamed unit"}
                      </h4>
                      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {(workspace.details?.roles || []).length ? (
                          workspace.details!.roles!.map((item) => (
                            <StatusPill
                              key={`${workspace.id}-${item.role}`}
                              label={item.label || item.role || "Unknown"}
                              value={item.count || 0}
                            />
                          ))
                        ) : (
                          <p className="text-xs font-pmedium text-slate-500 md:col-span-2 xl:col-span-4">
                            No role data for this unit yet.
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-slate-400 font-pmedium">
                    No linked units found.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </PageFrame>
    </div>
  );
}
