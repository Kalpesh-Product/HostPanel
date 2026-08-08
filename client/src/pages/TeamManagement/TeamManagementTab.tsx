import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Shield, UserCheck, Users, UserX } from "lucide-react";
import useAxiosPrivate from "@/hooks/useAxiosPrivate";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import { getOrganizationOverview } from "@/services/organization";
import ManageSidebarAccessDialog, { type ManageSidebarAccessMember } from "./ManageSidebarAccessDialog";

const flattenModuleMeta = (sections: any[] = []) => {
  const labelById: Record<string, string> = {};
  const unlockedIds = new Set<string>();
  for (const section of sections) {
    for (const item of section?.items || []) {
      if (Array.isArray(item?.tabs) && item.tabs.length) {
        for (const tab of item.tabs) {
          if (!tab?.id) continue;
          labelById[tab.id] = tab.label || tab.id;
          if (tab?.unlockedInWorkspace === true) unlockedIds.add(tab.id);
        }
      } else if (item?.id) {
        labelById[item.id] = item.label || item.id;
        if (item?.unlockedInWorkspace === true) unlockedIds.add(item.id);
      }
    }
  }
  return { labelById, unlockedIds };
};

const STATUS_PILLS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

const TeamManagementTab = () => {
  const axiosPrivate = useAxiosPrivate();
  const { moduleMap, enabledModuleIds } = useDashboardAccess();
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<ManageSidebarAccessMember | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["team-management-overview"],
    queryFn: async () => {
      const response = await getOrganizationOverview(axiosPrivate);
      return response?.data?.data ?? response?.data ?? {};
    },
    staleTime: 60 * 1000,
  });

  const { labelById: moduleLabelById, unlockedIds: unlockedModuleIds } = useMemo(
    () => flattenModuleMeta(moduleMap?.sections),
    [moduleMap],
  );

  // getOrganizationOverview already scopes `departments` down to the manager's
  // own department server-side (organizationControllers.ts), so the first
  // (only) entry here IS the manager's department — no separate department
  // lookup/name-matching needed.
  const department = Array.isArray(data?.departments) ? data.departments[0] : null;

  // Only ever surface department modules that are actually enabled at the
  // workspace level right now (via Master Panel) — a module Master Panel has
  // disabled is hidden from this dialog entirely, exactly like AccessGrant.tsx's
  // founder-facing "Sidebar Access" dialog does today.
  const availableModuleIds = useMemo(
    () =>
      (department?.moduleIds || []).filter(
        (id: string) => unlockedModuleIds.has(id) || enabledModuleIds.has(id),
      ),
    [department, unlockedModuleIds, enabledModuleIds],
  );

  // `department.employees` is the server-computed, department-scoped roster
  // (role band manager/admin/employee); `teamMembers` is the flat list that
  // additionally carries each member's grantedModules. Join on `id` so the
  // roster always matches what's actually in this department, while still
  // getting each member's current grants for the access dialog's prefill.
  const employees = useMemo(() => {
    const roster = Array.isArray(department?.employees) ? department.employees : [];
    const teamMembers = Array.isArray(data?.teamMembers) ? data.teamMembers : [];
    const grantedModulesById = new Map<string, any>(
      teamMembers.map((member: any) => [String(member?.id || ""), member]),
    );
    return roster
      .filter((member: any) => String(member?.roleBand || "").trim().toLowerCase() === "employee")
      .map((member: any) => ({
        ...member,
        grantedModules: grantedModulesById.get(String(member?.id || ""))?.grantedModules || [],
      }));
  }, [department, data]);

  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((m: any) => String(m.status || "").trim().toLowerCase() === "active").length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [employees]);

  const statCards = [
    { key: "total", label: "Total Employees", value: stats.total, icon: Users, toneClass: "bg-blue-50 text-[#2563EB]", borderClass: "" },
    { key: "active", label: "Active", value: stats.active, icon: UserCheck, toneClass: "bg-emerald-50 text-emerald-600", borderClass: "border-l-4 border-l-emerald-500" },
    { key: "inactive", label: "Inactive", value: stats.inactive, icon: UserX, toneClass: "bg-rose-50 text-rose-600", borderClass: "border-l-4 border-l-rose-500" },
  ];

  const visible = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return employees.filter((member: any) => {
      const isActive = String(member.status || "").trim().toLowerCase() === "active";
      if (statusFilter === "active" && !isActive) return false;
      if (statusFilter === "inactive" && isActive) return false;
      if (!query) return true;
      return (
        String(member.name || "").toLowerCase().includes(query) ||
        String(member.email || "").toLowerCase().includes(query) ||
        String(member.employeeId || "").toLowerCase().includes(query)
      );
    });
  }, [employees, statusFilter, searchQuery]);

  if (isLoading) {
    return <div className="py-10 text-center text-[12px] font-pmedium text-slate-400">Loading team...</div>;
  }

  if (!department) {
    return (
      <p className="text-[11px] font-pmedium text-slate-400 text-center py-10">
        No managed department found for this account.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 shrink-0">
        {statCards.map((card) => {
          const CardIcon = card.icon;
          return (
            <div
              key={card.key}
              className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${card.borderClass}`}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
              </div>
              <div className={`p-2 rounded-2xl ${card.toneClass} shrink-0`}>
                <CardIcon size={16} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:gap-4 sm:p-4 xl:flex-row xl:items-center lg:p-5">
          <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {STATUS_PILLS.map((pill) => (
              <button
                key={pill.key}
                type="button"
                onClick={() => setStatusFilter(pill.key)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-pmedium transition-all sm:text-[12px] ${
                  statusFilter === pill.key
                    ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                    : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:flex-nowrap xl:w-auto">
            <div className="relative min-w-[180px] flex-1 xl:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search name, email or employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200/60 bg-white py-2.5 pl-9 pr-4 text-[12px] font-pmedium text-[#0F172A] outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
              <tr>
                <th className="px-5 py-4">Employee ID</th>
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-slate-400 font-pmedium">
                    No employees found.
                  </td>
                </tr>
              ) : (
                visible.map((member: any) => {
                  const isActive = String(member.status || "").trim().toLowerCase() === "active";
                  return (
                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4 text-[11px] font-pmedium text-slate-700 whitespace-nowrap">
                        {member.employeeId || "-"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 font-pmedium text-slate-900">
                          <UserCheck size={14} className="text-slate-400" />
                          <span className="text-[12px] text-slate-800">{member.name}</span>
                        </div>
                        {member.email ? (
                          <p className="mt-0.5 text-[10px] font-pmedium text-slate-400">{member.email}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-pmedium uppercase tracking-wider border ${
                            isActive
                              ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                              : "text-slate-500 bg-slate-50 border-slate-200"
                          }`}
                        >
                          {member.status || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedMember({
                              id: member.id,
                              name: member.name,
                              grantedModules: Array.isArray(member.grantedModules) ? member.grantedModules : [],
                            })
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                          aria-label={`Manage sidebar access for ${member.name}`}
                          title="Manage Sidebar Access"
                        >
                          <Shield size={15} strokeWidth={2.5} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ManageSidebarAccessDialog
        open={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        member={selectedMember}
        moduleIds={availableModuleIds}
        moduleLabelById={moduleLabelById}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["team-management-overview"] });
        }}
      />
    </div>
  );
};

export default TeamManagementTab;
