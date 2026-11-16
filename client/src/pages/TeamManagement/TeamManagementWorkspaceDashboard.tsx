import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileCheck2,
  FileText,
  ShieldCheck,
  UserCheck,
  UserCog,
  Users,
  UsersRound,
} from "lucide-react";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import DonutChart from "@/components/graphs/DonutChart";
import GroupedBarGraph from "@/components/graphs/GroupedBarGraph";
import PageFrame from "@/components/Pages/PageFrame";
import useAxiosPrivate from "@/hooks/useAxiosPrivate";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import useManagedDepartment from "@/hooks/useManagedDepartment";
import { getOrganizationOverview } from "@/services/organization";
import teamBannerImage from "@/assets/hr-dashboard-banner.webp";

type RecordValue = Record<string, any>;

const normalize = (value: unknown) => String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");

const roleLabel = (value: unknown) => {
  const role = normalize(value);
  if (!role) return "Employee";
  return role.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};

function StatTile({ icon, label, value, sub, tone }: { icon: ReactNode; label: string; value: number; sub: string; tone: "blue" | "green" | "amber" | "violet" | "rose" | "slate" }) {
  const styles = {
    blue: { hover: "hover:border-blue-200 hover:border-l-blue-600", icon: "bg-blue-50 text-blue-700" },
    green: { hover: "hover:border-emerald-200 hover:border-l-emerald-500", icon: "bg-emerald-50 text-emerald-700" },
    amber: { hover: "hover:border-amber-200 hover:border-l-amber-500", icon: "bg-amber-50 text-amber-700" },
    violet: { hover: "hover:border-violet-200 hover:border-l-violet-500", icon: "bg-violet-50 text-violet-700" },
    rose: { hover: "hover:border-rose-200 hover:border-l-rose-500", icon: "bg-rose-50 text-rose-700" },
    slate: { hover: "hover:border-slate-300 hover:border-l-slate-500", icon: "bg-slate-100 text-slate-700" },
  }[tone];
  return (
    <div className={`flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 border-l-transparent bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md ${styles.hover}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-1 text-[22px] font-pmedium leading-none text-slate-900">{value}</p>
        <p className="mt-2 truncate text-[10px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">{title}</h2>
        <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function TeamManagementWorkspaceDashboard() {
  const axiosPrivate = useAxiosPrivate();
  const { isOwnerOrSuperAdmin, isManager, managedDepartment } = useManagedDepartment();
  const { roleBand, departments: assignedDepartments } = useDashboardAccess();
  const isAdmin = roleBand === "admin";
  const { data, isLoading } = useQuery({
    queryKey: ["team-management-dashboard"],
    queryFn: async () => {
      const response = await getOrganizationOverview(axiosPrivate);
      return response?.data?.data ?? response?.data ?? {};
    },
    staleTime: 60 * 1000,
  });

  const overviewDepartments = useMemo<RecordValue[]>(() => Array.isArray(data?.departments) ? data.departments : [], [data]);
  const departments = useMemo<RecordValue[]>(() => {
    if (isOwnerOrSuperAdmin) return overviewDepartments;
    if (isAdmin) {
      const assignedIds = new Set(assignedDepartments.map((item) => String(item.id)));
      const assignedNames = new Set(assignedDepartments.map((item) => String(item.name || "").trim().toLowerCase()));
      return overviewDepartments.filter((item) =>
        assignedIds.has(String(item?.id)) || assignedNames.has(String(item?.name || "").trim().toLowerCase()),
      );
    }
    return overviewDepartments.filter((item) => String(item?.id) === String(managedDepartment?.id || ""));
  }, [assignedDepartments, isAdmin, isOwnerOrSuperAdmin, managedDepartment?.id, overviewDepartments]);
  const members = useMemo<RecordValue[]>(() => {
    if (isOwnerOrSuperAdmin && Array.isArray(data?.teamMembers) && data.teamMembers.length) return data.teamMembers;
    const unique = new Map<string, RecordValue>();
    departments.forEach((department) => (department?.employees || []).forEach((member: RecordValue) => unique.set(String(member.id), member)));
    return [...unique.values()];
  }, [data, departments, isOwnerOrSuperAdmin]);

  const stats = useMemo(() => {
    const active = members.filter((member) => normalize(member.status) === "active").length;
    const managers = members.filter((member) => normalize(member.roleBand || member.role).includes("manager")).length;
    const admins = members.filter((member) => normalize(member.roleBand || member.role).includes("admin")).length;
    const employees = members.filter((member) => normalize(member.roleBand || member.role) === "employee").length;
    const assigned = members.filter((member) => (member.departmentNames || member.departments || []).length > 0).length;
    const shifts = new Set(members.map((member) => member.shiftId || member.shiftName).filter(Boolean)).size;
    return { total: members.length, active, inactive: Math.max(0, members.length - active), managers, admins, employees, assigned, shifts };
  }, [members]);

  const departmentRows = useMemo(() => departments.map((department) => ({
    name: department.name || "Department",
    members: Array.isArray(department.employees) ? department.employees.length : 0,
  })).sort((left, right) => right.members - left.members), [departments]);

  const roleRows = useMemo(() => {
    const groups = new Map<string, number>();
    members.forEach((member) => {
      const label = roleLabel(member.roleBand || member.role);
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [members]);

  const recentMembers = useMemo(() => [...members].sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()).slice(0, 8), [members]);
  const scopeLabel = isOwnerOrSuperAdmin
    ? "All departments"
    : isAdmin
      ? "Assigned departments"
      : managedDepartment?.name || "Managed department";

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <section className="relative mb-6 h-44 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)] sm:h-[12rem]">
          <img src={teamBannerImage} alt="Team collaboration" className="absolute inset-0 h-full w-full object-cover object-center" style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)", maskImage: "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)" }} />
          <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/45 via-[#3B82F6]/25 to-[#60A5FA]/15" style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)", maskImage: "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)" }} />
          <div className="absolute inset-y-0 left-0 w-full bg-white/90 sm:w-[66%]" style={{ WebkitMaskImage: "linear-gradient(to right, black 0%, black 76%, transparent 100%)", maskImage: "linear-gradient(to right, black 0%, black 76%, transparent 100%)" }} />
          <div className="absolute inset-y-0 left-0 z-10 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[76%]">
            <div className="flex items-center gap-2">
              <h1 className="flex flex-wrap items-center gap-x-2 text-[22px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[28px]"><span className="text-primary">Team Management</span> <span className="text-accent">Dashboard</span></h1>
            </div>
            <p className="max-w-lg text-[11px] font-pmedium leading-5 text-slate-500">Department teams, employee access, SOP distribution, and policy governance within your role scope.</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {[scopeLabel, "Access Control", "SOPs", "Policies"].map((label) => <span key={label} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600">{label}</span>)}
            </div>
          </div>
          <div className="absolute right-6 top-5 z-10 rounded-lg border border-white/25 bg-white/15 px-3 py-2 backdrop-blur-sm">
            <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">Departments in scope</p>
            <p className="mt-0.5 text-[15px] font-pmedium text-white">{departments.length}</p>
          </div>
        </section>

        {isLoading ? <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-[112px] animate-pulse rounded-xl bg-slate-100" />)}</div> : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={<Building2 size={20} />} label="Departments" value={departments.length} sub={scopeLabel} tone="blue" />
            <StatTile icon={<Users size={20} />} label="Team Members" value={stats.total} sub="People visible in your scope" tone="violet" />
            <StatTile icon={<UserCheck size={20} />} label="Active Members" value={stats.active} sub="Currently active accounts" tone="green" />
            <StatTile icon={<UsersRound size={20} />} label="Employees" value={stats.employees} sub="Department employee roster" tone="blue" />
            <StatTile icon={<UserCog size={20} />} label="Managers" value={stats.managers} sub="Department leadership" tone="amber" />
            <StatTile icon={<ShieldCheck size={20} />} label="Admins" value={stats.admins} sub="Administrative access holders" tone="rose" />
            <StatTile icon={<CheckCircle2 size={20} />} label="Assigned" value={stats.assigned} sub="Members mapped to departments" tone="green" />
            <StatTile icon={<BriefcaseBusiness size={20} />} label="Shifts" value={stats.shifts} sub="Distinct shifts assigned" tone="slate" />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">Manage team governance</p>
          <p className="mt-1 text-[10px] text-slate-500">Select a module, then choose the department you want to manage.</p>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            <DashboardModuleCard icon={<UsersRound size={19} />} title="Team Management" route="/extra-common-modules/team-management/access-control" description="Review department teams, grant module access, and manage shifts" color="#2563EB" />
            <DashboardModuleCard icon={<FileCheck2 size={19} />} title="SOPs" route="/extra-common-modules/team-management/sops" description="Publish and assign operating procedures by department" color="#10B981" />
            <DashboardModuleCard icon={<FileText size={19} />} title="Policies" route="/extra-common-modules/team-management/policies" description="Manage policy documents and department visibility" color="#7C3AED" />
          </div>
        </div>

        {!isLoading && <>
          <div className="mb-4"><SectionCard title="Department team strength" subtitle="Current roster size for each department in your access scope."><GroupedBarGraph options={{ chart: { toolbar: { show: false } }, xaxis: { categories: departmentRows.map((item) => item.name) }, colors: ["#2563EB"], dataLabels: { enabled: false }, legend: { show: false } }} series={[{ name: "Team members", data: departmentRows.map((item) => item.members) }]} /></SectionCard></div>
          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard title="Role distribution" subtitle="People grouped by their current workspace role.">{roleRows.length ? <DonutChart centerLabel="Members" labels={roleRows.map(([label]) => label)} series={roleRows.map(([, value]) => value)} colors={["#2563EB", "#10B981", "#F59E0B", "#7C3AED", "#94A3B8"]} tooltipValue={roleRows.map(([, value]) => `${value} members`)} wrapLabels /> : <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No role data available yet.</div>}</SectionCard>
            <SectionCard title="Account status" subtitle="Active and inactive members across the selected scope."><DonutChart centerLabel="Members" labels={["Active", "Inactive"]} series={[stats.active, stats.inactive]} colors={["#10B981", "#EF4444"]} tooltipValue={[`${stats.active} active`, `${stats.inactive} inactive`]} /></SectionCard>
          </div>
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">Recent team records</h2><p className="mt-1 text-[11px] text-slate-500">Latest people added within the departments visible to you.</p></div>
            <div className="max-h-[390px] overflow-auto"><table className="w-full min-w-[720px] text-left"><thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-5 py-3 font-pmedium">Member</th><th className="px-3 py-3 font-pmedium">Role</th><th className="px-3 py-3 font-pmedium">Department</th><th className="px-3 py-3 text-center font-pmedium">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{recentMembers.length ? recentMembers.map((member, index) => <tr key={member.id || index} className="text-[11px] text-slate-600"><td className="px-5 py-3"><p className="font-pmedium text-slate-900">{member.name || member.fullName || "Team member"}</p><p className="mt-0.5 text-[9px] text-slate-400">{member.email || member.employeeId || "No identifier"}</p></td><td className="px-3 py-3">{roleLabel(member.roleBand || member.role)}</td><td className="px-3 py-3">{Array.isArray(member.departmentNames) ? member.departmentNames.join(" / ") : member.departmentName || "Unassigned"}</td><td className="px-3 py-3 text-center"><span className={`rounded-full px-2 py-1 text-[9px] font-pmedium uppercase ${normalize(member.status) === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{member.status || "Unknown"}</span></td></tr>) : <tr><td colSpan={4} className="px-5 py-12 text-center text-[11px] text-slate-500">No team records available yet.</td></tr>}</tbody></table></div>
          </section>
        </>}
        {!isManager && !isOwnerOrSuperAdmin && !isAdmin ? <p className="mt-4 text-[10px] text-amber-600">Your account needs Team Management access to open these modules.</p> : null}
      </PageFrame>
    </div>
  );
}
