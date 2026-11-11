import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  Layers3,
  Mail,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import organizationBannerImage from "../../assets/WONO_images/img/website-builder/emerald-studio-professional-team.png";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import PageFrame from "../../components/Pages/PageFrame";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { statusPillClass } from "../../lib/status-pill";
import { getOrganizationOverview } from "../../services/organization";

type AccessMember = {
  id?: string;
  userId?: string;
  name?: string;
  fullName?: string;
  email?: string;
  role?: string;
  status?: string;
  departmentNames?: string[];
  grantedModules?: string[];
  addOnGrantedModules?: string[];
  workspaceAccesses?: unknown[];
  joinedAt?: string;
  createdAt?: string;
};

type LinkedWorkspaceRecord = {
  id?: string;
  workspaceName?: string;
  isActive?: boolean;
  isDeleted?: boolean;
};

type OrganizationOverview = {
  teamMembers?: AccessMember[];
  linkedWorkspaces?: LinkedWorkspaceRecord[];
};

const FULL_ACCESS_ROLES = new Set(["owner", "founder", "super_admin", "superadmin"]);

const normalize = (value: unknown) => String(value || "").trim().toLowerCase();

const readable = (value: unknown, fallback = "Unspecified") => {
  const text = String(value || fallback).replace(/[-_]+/g, " ");
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const memberName = (member: AccessMember) => member.fullName || member.name || member.email || "Unnamed user";

const memberDate = (member: AccessMember) => {
  const value = member.joinedAt || member.createdAt;
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[280px] items-center justify-center px-6 text-center text-[11px] text-[#7B89A6]">
      {children}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  bodyClassName = "p-5",
  children,
}: {
  title: string;
  subtitle?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">{title}</h2>
        {subtitle ? <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p> : null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  status = "default",
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  status?: "default" | "success" | "attention";
}) {
  const statuses = {
    default: "border-l-blue-600 bg-blue-50 text-blue-700",
    success: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
    attention: "border-l-amber-500 bg-amber-50 text-amber-700",
  };

  return (
    <div className="flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:border-l-blue-600 hover:shadow-md">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${statuses[status]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-1 text-[22px] font-pmedium leading-none text-slate-900">{value}</p>
        {sub ? <p className="mt-2 truncate text-[10px] text-slate-500">{sub}</p> : null}
      </div>
    </div>
  );
}

const AccessGrantsDashboard = () => {
  const axiosPrivate = useAxiosPrivate();

  // Same source and payload shape AccessGrantsPage/Organization Management use,
  // so grant counts here always agree with the underlying tables.
  const { data: overview, isPending, isError } = useQuery<OrganizationOverview>({
    queryKey: ["organization-workspace-dashboard"],
    queryFn: async () => {
      const response = await getOrganizationOverview(axiosPrivate);
      return response?.data?.data || response?.data || {};
    },
    retry: false,
  });

  const members = useMemo(
    () => (Array.isArray(overview?.teamMembers) ? overview.teamMembers : []),
    [overview?.teamMembers],
  );
  const linkedWorkspaces = useMemo(
    () =>
      (Array.isArray(overview?.linkedWorkspaces) ? overview.linkedWorkspaces : []).filter(
        (workspace) => workspace?.isDeleted !== true,
      ),
    [overview?.linkedWorkspaces],
  );

  const stats = useMemo(() => {
    const activeMembers = members.filter((member) => normalize(member.status) !== "disabled");
    const pendingInvites = members.filter((member) =>
      ["invited", "pending"].includes(normalize(member.status)),
    );
    const fullAccess = members.filter((member) => FULL_ACCESS_ROLES.has(normalize(member.role)));
    const customModuleGrants = members.filter(
      (member) => Array.isArray(member.grantedModules) && member.grantedModules.length > 0,
    );
    const addOnGrants = members.filter(
      (member) => Array.isArray(member.addOnGrantedModules) && member.addOnGrantedModules.length > 0,
    );
    const crossUnitAccess = members.filter(
      (member) => Array.isArray(member.workspaceAccesses) && member.workspaceAccesses.length > 0,
    );

    return {
      total: members.length,
      active: activeMembers.length,
      pendingInvites: pendingInvites.length,
      fullAccess: fullAccess.length,
      customModuleGrants: customModuleGrants.length,
      addOnGrants: addOnGrants.length,
      crossUnitAccess: crossUnitAccess.length,
      linkedWorkspaces: linkedWorkspaces.length,
    };
  }, [members, linkedWorkspaces]);

  const roleMix = useMemo(() => {
    const counts = new Map<string, number>();
    members.forEach((member) => {
      const label = readable(member.role, "Unassigned");
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [members]);

  const statusMix = useMemo(() => {
    const counts = new Map<string, number>();
    members.forEach((member) => {
      const label = readable(member.status, "Active");
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [members]);

  const recentlyGranted = useMemo(
    () =>
      [...members]
        .filter(
          (member) =>
            (Array.isArray(member.grantedModules) && member.grantedModules.length > 0) ||
            (Array.isArray(member.addOnGrantedModules) && member.addOnGrantedModules.length > 0) ||
            (Array.isArray(member.workspaceAccesses) && member.workspaceAccesses.length > 0),
        )
        .sort(
          (left, right) =>
            new Date(right.joinedAt || right.createdAt || 0).getTime() -
            new Date(left.joinedAt || left.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [members],
  );

  const grantCountFor = (member: AccessMember) =>
    (member.grantedModules?.length || 0) + (member.addOnGrantedModules?.length || 0);

  const isLoading = isPending;

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
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[68%]">
              <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[22px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[28px]">
                <span className="text-primary">Access Grants</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
                Module access, add-on grants, and cross-unit permissions
                across every member in this workspace.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Module Grants", "Add-ons", "Cross-unit", "Roles"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="absolute right-6 top-5 z-10 rounded-lg border border-white/25 bg-white/15 px-3 py-2 backdrop-blur-sm">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">Total members</p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        {isError && !isLoading ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-pmedium text-amber-800">
            <AlertTriangle size={16} />
            Access data could not be refreshed just now — existing values may be incomplete.
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, key) => (
              <div key={key} className="h-[112px] animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={<Users size={20} />} label="Total members" value={stats.total} sub="All workspace member records" />
            <StatTile
              icon={<UserCog size={20} />}
              label="Full access"
              value={stats.fullAccess}
              sub="Founders / super-admins with full access"
            />
            <StatTile
              icon={<ShieldCheck size={20} />}
              label="Custom module grants"
              value={stats.customModuleGrants}
              sub="Members with specific module access"
              status={stats.customModuleGrants ? "success" : "default"}
            />
            <StatTile
              icon={<Layers3 size={20} />}
              label="Add-on grants"
              value={stats.addOnGrants}
              sub="Members with add-on module access"
              status={stats.addOnGrants ? "success" : "default"}
            />
            <StatTile
              icon={<Building2 size={20} />}
              label="Cross-unit access"
              value={stats.crossUnitAccess}
              sub={`${stats.linkedWorkspaces} linked workspace${stats.linkedWorkspaces === 1 ? "" : "s"}`}
            />
            <StatTile
              icon={<Mail size={20} />}
              label="Pending invites"
              value={stats.pendingInvites}
              sub="Invitations awaiting access setup"
              status={stats.pendingInvites > 0 ? "attention" : "success"}
            />
            <StatTile
              icon={<Users size={20} />}
              label="Active members"
              value={stats.active}
              sub="Members currently able to sign in"
              status={stats.active ? "success" : "default"}
            />
            <StatTile
              icon={<ShieldCheck size={20} />}
              label="Role types"
              value={roleMix.length}
              sub="Distinct roles in this workspace"
            />
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3">
            <p className="text-sm font-pmedium text-slate-900">Manage access grants</p>
            <p className="mt-1 text-[10px] font-pmedium text-slate-500">
              Open the access grants table to review, grant, or revoke module and
              workspace access for members.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-1">
            <DashboardModuleCard
              icon={<UserCog size={19} />}
              title="Access Grants"
              route="/core-modules/access-grants/list"
              description="Grant or revoke module, add-on, and workspace access per member"
              color="#2563EB"
              state={{ fromSection: "access-grants" }}
            />
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard title="Members by role" subtitle="Current workspace members grouped by access role.">
                {roleMix.length ? (
                  <DonutChart
                    centerLabel="Members"
                    labels={roleMix.map((item) => item.label)}
                    series={roleMix.map((item) => item.value)}
                    colors={["#1E3D73", "#2563EB", "#7C3AED", "#0D9488", "#F59E0B", "#64748B"].slice(0, roleMix.length)}
                    tooltipValue={roleMix.map((item) => `${item.value} members`)}
                    wrapLabels
                  />
                ) : (
                  <Empty>No members have been recorded yet.</Empty>
                )}
              </ChartCard>
              <ChartCard title="Account status" subtitle="Members grouped by onboarding and access status.">
                {statusMix.length ? (
                  <DonutChart
                    centerLabel="Members"
                    labels={statusMix.map((item) => item.label)}
                    series={statusMix.map((item) => item.value)}
                    colors={["#22C55E", "#F59E0B", "#EF4444", "#2563EB", "#64748B"].slice(0, statusMix.length)}
                    tooltipValue={statusMix.map((item) => `${item.value} members`)}
                    wrapLabels
                  />
                ) : (
                  <Empty>No account status data yet.</Empty>
                )}
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <ChartCard
                title="Members with custom access"
                subtitle="Members holding module, add-on, or cross-unit grants beyond their base role."
                bodyClassName=""
              >
                {recentlyGranted.length ? (
                  <div className="min-h-[240px] max-h-[360px] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="w-[26%] px-5 py-3">Member</th>
                          <th className="w-[18%] px-4 py-3">Role</th>
                          <th className="w-[18%] px-4 py-3">Module grants</th>
                          <th className="w-[20%] px-4 py-3">Cross-unit access</th>
                          <th className="w-[18%] px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentlyGranted.map((member, index) => (
                          <tr
                            key={member.userId || member.id || `${member.email}-${index}`}
                            className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                          >
                            <td className="truncate px-5 py-3 text-slate-900">{memberName(member)}</td>
                            <td className="truncate px-4 py-3">{readable(member.role, "Unassigned")}</td>
                            <td className="truncate px-4 py-3">
                              {grantCountFor(member)
                                ? `${grantCountFor(member)} module${grantCountFor(member) === 1 ? "" : "s"}`
                                : "None"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {member.workspaceAccesses?.length
                                ? `${member.workspaceAccesses.length} workspace${member.workspaceAccesses.length === 1 ? "" : "s"}`
                                : "None"}
                            </td>
                            <td className="truncate px-5 py-3">
                              <span className={statusPillClass(member.status || "active")}>
                                {readable(member.status, "Active")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                    No members currently hold custom module, add-on, or cross-unit grants.
                  </div>
                )}
              </ChartCard>
            </div>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
};

export default AccessGrantsDashboard;
