import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Briefcase, Shield } from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { getWorkspaceManagementOverview } from "../../services/unit-management";

type DepartmentItem = {
  name?: string;
  totalEmployees?: number;
  totalTickets?: number;
  totalTasks?: number;
  totalMeetingBookings?: number;
};

type Workspace = {
  id: string;
  workspaceName?: string;
  businessName?: string;
  isDeleted?: boolean;
  selectedPlan?: string;
  details?: { departments?: DepartmentItem[] };
};

type Summary = { totalDepartments?: number };
type Overview = { workspaces?: Workspace[]; summary?: Summary };

function StatusPill({ label, value, tone = "slate" }) {
  const toneClassName = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-100 bg-blue-50 text-[#2563EB]",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
  }[tone];

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClassName}`}>
      <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="mt-1 text-[15px] font-pmedium text-slate-900">{value}</p>
    </div>
  );
}

export default function UnitDepartmentsPage() {
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
        if (mounted) toast.error(error?.response?.data?.message || "Unable to load department data.");
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
  const totalDepartments = Number(overview?.summary?.totalDepartments || 0);

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
                  Departments
                </h2>
                <p className="text-xs font-pmedium text-slate-500 mt-1">
                  Department structure and staffing compared across every linked unit.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="flex min-h-[96px] items-center gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-l-2 border-l-emerald-500 bg-emerald-50 text-emerald-700">
                  <Briefcase size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Total departments</p>
                  <p className="mt-1 truncate text-[20px] font-pmedium leading-none text-slate-900">{totalDepartments}</p>
                  <p className="mt-1.5 truncate text-[10px] text-slate-500">Combined organization structure</p>
                </div>
              </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">Departments by unit</h3>
                <p className="mt-1 text-[11px] text-slate-500">Compare department staffing and workload per unit.</p>
              </div>
              <div className="max-h-[600px] overflow-y-auto p-5 space-y-5">
                {workspaceList.length ? (
                  workspaceList.map((workspace) => {
                    const isWorkspaceProfessional = String(workspace.selectedPlan || "basic").trim().toLowerCase() === "professional";
                    const departments = workspace.details?.departments || [];
                    return (
                      <div key={workspace.id}>
                        <h4 className="text-sm font-pmedium text-slate-950">
                          {workspace.workspaceName || workspace.businessName || "Unnamed unit"}
                        </h4>
                        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {departments.length ? (
                            departments.map((departmentItem) => (
                              <article
                                key={`${workspace.id}-${departmentItem.name}`}
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                              >
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4 text-emerald-600" />
                                  <h5 className="text-sm font-pmedium text-slate-950">{departmentItem.name}</h5>
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
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-slate-400 font-pmedium md:col-span-2 xl:col-span-3">
                              No department data is available for this unit yet.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
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
