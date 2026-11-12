import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Building2,
  Crown,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import organizationBannerImage from "../../assets/WONO_images/img/website-builder/emerald-studio-professional-team.png";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import useAuth from "../../hooks/useAuth";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useDashboardAccess from "../../hooks/useDashboardAccess";
import { statusPillClass } from "../../lib/status-pill";
import { getOrganizationOverview } from "../../services/organization";
import { isDepartmentAllowedForPlan } from "../../utils/workspacePlanAccess";
import {
  ORGANIZATION_DASHBOARD_MODULES,
  type OrganizationDashboardModule,
} from "./organizationDashboardModules";

type OrganizationMember = {
  id?: string;
  _id?: string;
  userId?: string;
  name?: string;
  fullName?: string;
  email?: string;
  employeeId?: string;
  role?: string;
  status?: string;
  departmentNames?: string[];
  joinedAt?: string;
  createdAt?: string;
};

type OrganizationDepartment = {
  id?: string;
  _id?: string;
  name?: string;
  employeeCount?: number;
  managerName?: string;
  managerId?: string;
  managerUserId?: string;
  employees?: OrganizationMember[];
  isActive?: boolean;
};

type OrganizationOverview = {
  teamMembers?: OrganizationMember[];
  departments?: OrganizationDepartment[];
  workspace?: {
    selectedPlan?: string;
  };
  accountUserLimits?: {
    limit?: number | null;
    activeCount?: number;
    canAddUser?: boolean;
  };
};

const ROLE_COLORS = ["#1E3D73", "#2563EB", "#7C3AED", "#0D9488", "#F59E0B"];

const normalize = (value: unknown) => String(value || "").trim().toLowerCase();

const readable = (value: unknown, fallback = "Unspecified") => {
  const text = String(value || fallback).replace(/[-_]+/g, " ");
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const memberName = (member: OrganizationMember) =>
  member.fullName || member.name || member.email || "Unnamed user";

const memberDate = (member: OrganizationMember) => {
  const value = member.joinedAt || member.createdAt;
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function StatTile({
  icon,
  label,
  value,
  sub,
  tone = "blue",
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  sub: string;
  tone?: "blue" | "green" | "amber" | "rose" | "violet";
}) {
  const tones = {
    blue: "border-l-blue-600 bg-blue-50 text-blue-700",
    green: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
    amber: "border-l-amber-500 bg-amber-50 text-amber-700",
    rose: "border-l-rose-500 bg-rose-50 text-rose-700",
    violet: "border-l-violet-500 bg-violet-50 text-violet-700",
  };
  const hoverBorders = {
    blue: "hover:border-blue-200 hover:border-l-blue-600",
    green: "hover:border-emerald-200 hover:border-l-emerald-500",
    amber: "hover:border-amber-200 hover:border-l-amber-500",
    rose: "hover:border-rose-200 hover:border-l-rose-500",
    violet: "hover:border-violet-200 hover:border-l-violet-500",
  };

  return (
    <div className={`flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 border-l-transparent bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md ${hoverBorders[tone]}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${tones[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-1 text-[22px] font-pmedium leading-none text-slate-900">{value}</p>
        <p className="mt-2 truncate text-[10px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  bodyClassName = "p-5",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">{title}</h2>
        <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function LockedModuleCard({
  module,
  isBasic,
}: {
  module: OrganizationDashboardModule;
  isBasic: boolean;
}) {
  const Icon = module.icon;
  const reason = isBasic
    ? "Available on Professional and eligible Custom plans"
    : "This section has not been granted for your access";

  return (
    <button
      type="button"
      disabled
      title={reason}
      className="relative flex min-h-[154px] min-w-0 cursor-not-allowed flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-5 text-center opacity-75 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-slate-300" />
      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[9px] font-pmedium text-slate-500">
        <Lock size={11} /> Locked
      </span>
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200/70 text-slate-500">
        <Icon size={19} />
      </span>
      <span className="text-[13px] font-pmedium text-slate-600">{module.label}</span>
      <span className="mt-1.5 max-w-[220px] text-[9px] font-pmedium leading-4 text-slate-400">{reason}</span>
    </button>
  );
}

export default function OrganizationWorkspaceDashboard() {
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const access = useDashboardAccess();
  const user = auth?.user as {
    workspaceMembership?: { grantedModules?: string[] };
    grantedModules?: string[];
    permissions?: { permissions?: string[] };
  } | null;

  const { data: overview, isPending, isError } = useQuery<OrganizationOverview>({
    queryKey: ["organization-workspace-dashboard"],
    queryFn: async () => {
      const response = await getOrganizationOverview(axiosPrivate);
      return response?.data?.data || response?.data || {};
    },
    retry: false,
  });

  const grantIds = new Set(
    [
      ...Array.from(access.grantedModuleIds),
      ...(user?.workspaceMembership?.grantedModules || []),
      ...(user?.grantedModules || []),
      ...(user?.permissions?.permissions || []),
    ]
      .map(normalize)
      .filter(Boolean),
  );
  const hasOrganizationGrant = grantIds.has("organization-management");
  const hasExplicitTabGrant = ORGANIZATION_DASHBOARD_MODULES.some((module) =>
    grantIds.has(module.permission),
  );
  const isModuleEnabled = (module: OrganizationDashboardModule) => {
    if (module.id === "organization-departments" && access.plan === "basic") return false;
    const workspaceEnabled = access.enabledModuleIds.has(module.permission);
    const roleEnabled =
      access.roleBand === "owner" ||
      access.roleBand === "super_admin" ||
      grantIds.has(module.permission) ||
      (hasOrganizationGrant && !hasExplicitTabGrant);
    return workspaceEnabled && roleEnabled;
  };
  const enabledModules = ORGANIZATION_DASHBOARD_MODULES.filter(isModuleEnabled);

  const members = useMemo(
    () => (Array.isArray(overview?.teamMembers) ? overview.teamMembers : []),
    [overview?.teamMembers],
  );
  const departments = useMemo(
    () =>
      (Array.isArray(overview?.departments) ? overview.departments : []).filter(
        (department) =>
          department.isActive !== false &&
          isDepartmentAllowedForPlan(access.plan, department.name || ""),
      ),
    [access.plan, overview?.departments],
  );

  const activeMembers = members.filter((member) => normalize(member.status) !== "disabled");
  const disabledMembers = members.filter((member) => normalize(member.status) === "disabled");
  const invitedMembers = members.filter((member) =>
    ["invited", "pending"].includes(normalize(member.status)),
  );
  const managersAssigned = departments.filter(
    (department) => department.managerName || department.managerId || department.managerUserId,
  ).length;
  const departmentsNeedingManager = Math.max(0, departments.length - managersAssigned);
  const departmentAssignments = departments.reduce(
    (sum, department) =>
      sum +
      (Number(department.employeeCount) ||
        (Array.isArray(department.employees) ? department.employees.length : 0)),
    0,
  );
  const activeCount = overview?.accountUserLimits?.activeCount ?? activeMembers.length;
  const userLimit = overview?.accountUserLimits?.limit;

  const roleMix = useMemo(() => {
    const counts = new Map<string, number>();
    members.forEach((member) => {
      const label = readable(member.role, "Unassigned");
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value);
  }, [members]);

  const statusMix = useMemo(() => {
    const counts = new Map<string, number>();
    members.forEach((member) => {
      const label = readable(member.status, "Active");
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value);
  }, [members]);

  const departmentRows = useMemo(
    () =>
      [...departments]
        .map((department) => ({
          label: department.name || "Unnamed",
          members:
            Number(department.employeeCount) ||
            (Array.isArray(department.employees) ? department.employees.length : 0),
        }))
        .sort((left, right) => right.members - left.members)
        .slice(0, 8),
    [departments],
  );

  const recentMembers = useMemo(
    () =>
      [...members]
        .sort(
          (left, right) =>
            new Date(right.joinedAt || right.createdAt || 0).getTime() -
            new Date(left.joinedAt || left.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [members],
  );

  const departmentChartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "44%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: departmentRows.map((department) => department.label) },
    colors: ["#2563EB"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  const loading = isPending || access.isLoading;

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={organizationBannerImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 h-full w-full object-cover object-center sm:w-[64%]"
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 w-full bg-gradient-to-br from-[#2563EB]/55 via-[#3b82f6]/35 to-[#60a5fa]/20 sm:w-[64%]"
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-full bg-white/90 sm:w-[66%]"
              style={{
                WebkitMaskImage: "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
                maskImage: "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
              }}
            />
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[78%]">
              <h1 className="flex flex-wrap items-center gap-x-1 text-[22px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[28px]">
                <span className="text-primary">Organization Management</span>{" "}
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-md text-[11px] font-pmedium leading-5 text-slate-500">
                Workspace users, roles, department ownership, and access health in one view.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Users", "Roles", "Departments", "Access"].map((tag) => (
                  <span key={tag} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="absolute right-6 top-5 z-10 rounded-lg border border-white/25 bg-white/15 px-3 py-2 backdrop-blur-sm">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">Active modules</p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">{enabledModules.length}</p>
            </div>
          </div>
        </div>

        {isError && !loading ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            <AlertTriangle size={16} /> Organization data could not be refreshed just now.
          </div>
        ) : null}

        {loading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="h-[112px] animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={<Users size={20} />} label="Total users" value={members.length} sub="All workspace user records" />
            <StatTile icon={<UserCheck size={20} />} label="Active users" value={activeCount} sub={userLimit ? `${activeCount}/${userLimit} account capacity used` : "Enabled workspace accounts"} tone="green" />
            <StatTile icon={<UserX size={20} />} label="Disabled users" value={disabledMembers.length} sub="Accounts without workspace access" tone="rose" />
            <StatTile icon={<Mail size={20} />} label="Pending invites" value={invitedMembers.length} sub="Invitations awaiting onboarding" tone="amber" />
            <StatTile icon={<Building2 size={20} />} label="Departments" value={isModuleEnabled(ORGANIZATION_DASHBOARD_MODULES[1]) ? departments.length : "—"} sub="Departments available on this plan" tone="violet" />
            <StatTile icon={<Crown size={20} />} label="Managers assigned" value={isModuleEnabled(ORGANIZATION_DASHBOARD_MODULES[1]) ? managersAssigned : "—"} sub="Departments with accountable managers" tone="green" />
            <StatTile icon={<AlertTriangle size={20} />} label="Need manager" value={isModuleEnabled(ORGANIZATION_DASHBOARD_MODULES[1]) ? departmentsNeedingManager : "—"} sub="Departments missing a manager" tone="amber" />
            <StatTile icon={<ShieldCheck size={20} />} label="Member assignments" value={isModuleEnabled(ORGANIZATION_DASHBOARD_MODULES[1]) ? departmentAssignments : "—"} sub="Department-linked member records" />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">Manage organization</p>
          <p className="mt-1 text-[10px] text-slate-500">Open the organization sections enabled for your plan and access.</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {ORGANIZATION_DASHBOARD_MODULES.map((module) => {
              if (!isModuleEnabled(module)) {
                return <LockedModuleCard key={module.id} module={module} isBasic={access.plan === "basic"} />;
              }
              const Icon = module.icon;
              return (
                <DashboardModuleCard
                  key={module.id}
                  icon={<Icon size={19} />}
                  title={module.label}
                  route={module.route}
                  description={module.description}
                  color={module.color}
                  state={{ fromSection: "organization-dashboard" }}
                />
              );
            })}
          </div>
        </div>

        {!loading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
              <SectionCard title="Users by role" subtitle="Current workspace users grouped by access role.">
                {roleMix.length ? (
                  <DonutChart centerLabel="Users" labels={roleMix.map((item) => item.label)} series={roleMix.map((item) => item.value)} colors={ROLE_COLORS.slice(0, roleMix.length)} tooltipValue={roleMix.map((item) => `${item.value} users`)} wrapLabels />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No users recorded yet.</div>
                )}
              </SectionCard>
              <SectionCard title="Account status" subtitle="Workspace users grouped by onboarding and access status.">
                {statusMix.length ? (
                  <DonutChart centerLabel="Users" labels={statusMix.map((item) => item.label)} series={statusMix.map((item) => item.value)} colors={["#22C55E", "#F59E0B", "#EF4444", "#2563EB"].slice(0, statusMix.length)} tooltipValue={statusMix.map((item) => `${item.value} users`)} wrapLabels />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No account status data yet.</div>
                )}
              </SectionCard>
              <SectionCard title="Department size" subtitle="Top enabled departments by assigned member count.">
                {isModuleEnabled(ORGANIZATION_DASHBOARD_MODULES[1]) && departmentRows.length ? (
                  <GroupedBarGraph options={departmentChartOptions} series={[{ name: "Members", data: departmentRows.map((department) => department.members) }]} />
                ) : (
                  <div className="flex h-[280px] items-center justify-center px-6 text-center text-[11px] text-slate-500">
                    {access.plan === "basic" ? "Department management is available on higher plans." : "No department assignments recorded yet."}
                  </div>
                )}
              </SectionCard>
            </div>

            <SectionCard title="Recent platform users" subtitle="Latest user and invitation records from Organization Management." bodyClassName="">
              {recentMembers.length ? (
                <div className="max-h-[360px] min-h-[240px] overflow-y-auto overflow-x-hidden">
                  <table className="w-full table-fixed border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="w-[24%] px-5 py-3">Platform user</th>
                        <th className="w-[26%] px-4 py-3">Email</th>
                        <th className="w-[15%] px-4 py-3">Role</th>
                        <th className="w-[18%] px-4 py-3">Department</th>
                        <th className="w-[10%] px-4 py-3">Status</th>
                        <th className="w-[12%] px-5 py-3">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentMembers.map((member, index) => (
                        <tr key={member.userId || member.id || member._id || `${member.email}-${index}`} className="text-[11px] text-slate-600 hover:bg-blue-50/30">
                          <td className="truncate px-5 py-3 font-pmedium text-slate-900">{memberName(member)}</td>
                          <td className="truncate px-4 py-3">{member.email || "Not recorded"}</td>
                          <td className="truncate px-4 py-3">{readable(member.role, "Unassigned")}</td>
                          <td className="truncate px-4 py-3">{member.departmentNames?.join(", ") || "All Departments"}</td>
                          <td className="truncate px-4 py-3">
                            <span className={statusPillClass(member.status || "active")}>{readable(member.status, "Active")}</span>
                          </td>
                          <td className="truncate px-5 py-3">{memberDate(member)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-[11px] text-slate-500">No organization users have been recorded yet.</div>
              )}
            </SectionCard>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
