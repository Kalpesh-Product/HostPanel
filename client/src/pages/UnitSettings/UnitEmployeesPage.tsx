import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Briefcase, Building2, Users } from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { getWorkspaceManagementOverview } from "../../services/unit-management";

type Employee = {
  id?: string;
  fullName?: string;
  email?: string;
  roleLabel?: string;
  employeeId?: string;
  departments?: string[];
};

type Workspace = {
  id: string;
  workspaceName?: string;
  businessName?: string;
  isDeleted?: boolean;
  metrics?: { totalEmployees?: number };
  details?: { employees?: Employee[] };
};

type Overview = {
  workspaces?: Workspace[];
  summary?: { totalEmployees?: number };
};

function StatTile({ icon: Icon, label, value, sub, tone = "blue" }) {
  const toneClassName = {
    blue: "border-l-blue-500 bg-blue-50 text-blue-700",
    emerald: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <div className="flex min-h-[96px] items-center gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-l-2 ${toneClassName}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">{label}</p>
        <p className="mt-1 truncate text-[20px] font-pmedium leading-none text-slate-900">{value}</p>
        <p className="mt-1.5 truncate text-[10px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

export default function UnitEmployeesPage() {
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
        if (mounted) toast.error(error?.response?.data?.message || "Unable to load employee data.");
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
  const totalEmployees = Number(overview?.summary?.totalEmployees || 0);
  const unitsWithEmployees = workspaceList.filter((workspace) => Number(workspace.metrics?.totalEmployees || 0) > 0).length;

  const employeeRows = workspaceList
    .map((workspace) => ({
      label: workspace.workspaceName || workspace.businessName || "Unnamed unit",
      value: Number(workspace.metrics?.totalEmployees || 0),
    }))
    .sort((left, right) => right.value - left.value);

  const employeeChartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "55%" } },
    dataLabels: {
      enabled: true,
      formatter: (value: number) => String(value),
      style: { fontSize: "11px", colors: ["#1E3D73"] },
      offsetX: 6,
    },
    colors: ["#2563EB"],
    xaxis: {
      categories: employeeRows.map((row) => row.label),
      min: 0,
      labels: { style: { fontSize: "10px" } },
    },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    grid: { borderColor: "#EEF2F7" },
    tooltip: { theme: "light" },
  };

  const allEmployees = workspaceList.flatMap((workspace) =>
    (workspace.details?.employees || []).map((employee) => ({
      ...employee,
      workspaceName: workspace.workspaceName || workspace.businessName || "Unnamed unit",
      workspaceId: workspace.id,
    })),
  );

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
                  Employees
                </h2>
                <p className="text-xs font-pmedium text-slate-500 mt-1">
                  Employee allocation and people across every linked unit.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatTile icon={Users} label="Total employees" value={totalEmployees} sub="Across linked units" />
              <StatTile icon={Building2} label="Units with employees" value={unitsWithEmployees} sub={`of ${workspaceList.length} linked units`} tone="emerald" />
              <StatTile icon={Briefcase} label="Average per unit" value={workspaceList.length ? Math.round(totalEmployees / workspaceList.length) : 0} sub="Mean employee count" />
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">Employees by unit</h3>
                <p className="mt-1 text-[11px] text-slate-500">How the combined workforce is distributed.</p>
              </div>
              <div className="p-5">
                {employeeRows.length ? (
                  <GroupedBarGraph
                    options={employeeChartOptions}
                    series={[{ name: "Employees", data: employeeRows.map((item) => item.value) }]}
                  />
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-[11px] text-slate-500">
                    No employee allocation data is available yet.
                  </div>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">All employees</h3>
                <p className="mt-1 text-[11px] text-slate-500">Everyone across every linked unit.</p>
              </div>
              <div className="max-h-[480px] overflow-y-auto p-5">
                {allEmployees.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {allEmployees.map((employee) => (
                      <article
                        key={employee.id || `${employee.workspaceId}-${employee.email}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-pmedium text-slate-950">{employee.fullName}</p>
                            <p className="mt-1 truncate text-xs font-pmedium text-slate-500">{employee.email}</p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-pmedium uppercase tracking-[0.16em] text-slate-600 shadow-sm">
                            {employee.roleLabel}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-pmedium text-slate-500">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-[#2563EB]">{employee.workspaceName}</span>
                          {employee.employeeId ? (
                            <span className="rounded-full bg-white px-3 py-1">{employee.employeeId}</span>
                          ) : null}
                          {(employee.departments || []).map((departmentName) => (
                            <span key={`${employee.id}-${departmentName}`} className="rounded-full bg-white px-3 py-1">
                              {departmentName}
                            </span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-slate-400 font-pmedium">
                    No workspace members found yet.
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
