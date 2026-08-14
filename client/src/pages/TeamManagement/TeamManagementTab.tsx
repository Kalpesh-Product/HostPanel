import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Loader2, Search, Shield, UserCheck, Users, UserX, X } from "lucide-react";
import { toast } from "sonner";
import useAxiosPrivate from "@/hooks/useAxiosPrivate";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import { TeamManagementContentSkeleton } from "@/components/ui/Skeleton";
import { formatTime12h } from "@/utils/time";
import { getOrganizationOverview } from "@/services/organization";
import ManageSidebarAccessDialog, {
  type ManageSidebarAccessMember,
  type ManageSidebarAccessModuleGroup,
} from "./ManageSidebarAccessDialog";

const flattenModuleMeta = (sections: any[] = []) => {
  const labelById: Record<string, string> = {};
  const unlockedIds = new Set<string>();
  const moduleIdsBySection: Record<string, string[]> = {};
  for (const section of sections) {
    const sectionModuleIds: string[] = [];
    for (const item of section?.items || []) {
      if (Array.isArray(item?.tabs) && item.tabs.length) {
        for (const tab of item.tabs) {
          if (!tab?.id) continue;
          labelById[tab.id] = tab.label || tab.id;
          sectionModuleIds.push(tab.id);
          if (tab?.unlockedInWorkspace === true) unlockedIds.add(tab.id);
        }
      } else if (item?.id) {
        labelById[item.id] = item.label || item.id;
        sectionModuleIds.push(item.id);
        if (item?.unlockedInWorkspace === true) unlockedIds.add(item.id);
      }
    }
    if (section?.sectionId) moduleIdsBySection[section.sectionId] = sectionModuleIds;
  }
  return { labelById, unlockedIds, moduleIdsBySection };
};

const STATUS_PILLS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

type TeamShiftOption = { id: string; name: string; startTime: string; endTime: string };
type ShiftMember = { id: string; name: string; shiftId: string };

const formatRoleLabel = (role?: string): string => {
  const raw = String(role || "").trim();
  if (!raw) return "Employee";
  return raw
    .replace(/[_\s]+/g, "-")
    .split("-")
    .filter(Boolean)
    .map((word) => (word.toLowerCase() === "hr" || word.toLowerCase() === "it" ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(" ");
};

const formatDepartmentLabel = (departmentNames?: string[]): string =>
  Array.isArray(departmentNames) && departmentNames.length > 0 ? departmentNames.join(" / ") : "-";

const TeamManagementTab = () => {
  const axiosPrivate = useAxiosPrivate();
  const { moduleMap, enabledModuleIds, grantedModuleIds } = useDashboardAccess();
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<ManageSidebarAccessMember | null>(null);
  const [shiftMember, setShiftMember] = useState<ShiftMember | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [isShiftSaving, setIsShiftSaving] = useState(false);
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
  const attendanceShifts = useMemo<TeamShiftOption[]>(() => (
    Array.isArray(data?.attendanceShifts)
      ? data.attendanceShifts.map((shift: any) => ({
          id: String(shift?.id || ""), name: String(shift?.name || ""),
          startTime: String(shift?.startTime || ""), endTime: String(shift?.endTime || ""),
        })).filter((shift: TeamShiftOption) => shift.id && shift.name)
      : []
  ), [data]);

  const {
    labelById: moduleLabelById,
    unlockedIds: unlockedModuleIds,
    moduleIdsBySection,
  } = useMemo(
    () => flattenModuleMeta(moduleMap?.sections),
    [moduleMap],
  );

  // getOrganizationOverview already scopes `departments` down to the manager's
  // own department server-side (organizationControllers.ts), so the first
  // (only) entry here IS the manager's department — no separate department
  // lookup/name-matching needed.
  const department = Array.isArray(data?.departments) ? data.departments[0] : null;

  // A manager may delegate only modules they can currently access: the
  // workspace-enabled Common and Extra Common baseline, plus the Core
  // Modules selected for their own department. Team Management is a
  // manager-only capability and is intentionally not delegable to employees.
  const moduleGroups = useMemo<ManageSidebarAccessModuleGroup[]>(() => {
    const isManagerAccessible = (id: string) =>
      grantedModuleIds.has(id) && (unlockedModuleIds.has(id) || enabledModuleIds.has(id));
    const filterAccessible = (ids: string[] = []) =>
      Array.from(new Set(ids)).filter(isManagerAccessible);

    return [
      {
        id: "common-modules",
        label: "Common Modules",
        moduleIds: filterAccessible(moduleIdsBySection["common-modules"]),
      },
      {
        id: "extra-common-modules",
        label: "Extra Common Modules",
        moduleIds: filterAccessible(
          (moduleIdsBySection["extra-common-modules"] || []).filter((id) => id !== "team-management"),
        ),
      },
      {
        id: "core-modules",
        label: "Core Modules",
        moduleIds: filterAccessible(Array.isArray(department?.moduleIds) ? department.moduleIds : []),
      },
    ];
  }, [department, enabledModuleIds, grantedModuleIds, moduleIdsBySection, unlockedModuleIds]);

  const availableModuleIds = useMemo(
    () => moduleGroups.flatMap((group) => group.moduleIds),
    [moduleGroups],
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

  const saveEmployeeShift = async () => {
    if (!shiftMember || !selectedShiftId || isShiftSaving) return;
    setIsShiftSaving(true);
    try {
      await axiosPrivate.patch(`/api/organization/members/${shiftMember.id}/shift`, { shiftId: selectedShiftId });
      toast.success(`${shiftMember.name}'s shift was updated and they were notified.`);
      setShiftMember(null);
      setSelectedShiftId("");
      await queryClient.invalidateQueries({ queryKey: ["team-management-overview"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to update employee shift.");
    } finally {
      setIsShiftSaving(false);
    }
  };
  if (isLoading) {
    return <TeamManagementContentSkeleton />;
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
          <table className="w-full min-w-[860px] text-left">
            <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
              <tr>
                <th className="px-5 py-4">Employee ID</th>
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Shift</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400 font-pmedium">
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
                      <td className="px-5 py-4 text-[11px] font-pmedium capitalize text-slate-600">
                        {formatRoleLabel(member.role)}
                      </td>
                      <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600">
                        {formatDepartmentLabel(member.departmentNames)}
                      </td>
                      <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600">
                        <span className="inline-flex rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] text-blue-700 whitespace-nowrap">
                          {member.shiftName || "Not assigned"}
                        </span>
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
                        <div className="flex items-center justify-center gap-2">
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
                          <button
                            type="button"
                            onClick={() => {
                              setShiftMember({ id: member.id, name: member.name, shiftId: String(member.shiftId || "") });
                              setSelectedShiftId(String(member.shiftId || ""));
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-amber-100 hover:text-amber-700"
                            aria-label={`Change shift for ${member.name}`}
                            title="Change Shift"
                          >
                            <Clock3 size={15} strokeWidth={2.5} />
                          </button>
                        </div>
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
        moduleGroups={moduleGroups}
        moduleLabelById={moduleLabelById}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["team-management-overview"] });
        }}
      />

      {shiftMember && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={() => !isShiftSaving && setShiftMember(null)}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[10px] font-pmedium uppercase tracking-[0.2em] text-amber-600">Change Shift</p>
                <h3 className="mt-1 text-sm font-pmedium text-slate-900">{shiftMember.name}</h3>
              </div>
              <button type="button" disabled={isShiftSaving} onClick={() => setShiftMember(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X size={16} /></button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Assigned Shift</label>
                <select
                  value={selectedShiftId}
                  onChange={(event) => setSelectedShiftId(event.target.value)}
                  disabled={attendanceShifts.length === 0 || isShiftSaving}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Select Shift</option>
                  {attendanceShifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>{shift.name} ({formatTime12h(shift.startTime)} - {formatTime12h(shift.endTime)})</option>
                  ))}
                </select>
                {attendanceShifts.length === 0 && <p className="mt-2 text-[10px] font-pmedium text-amber-600">HR must configure shifts in Attendance Settings first.</p>}
              </div>
              <p className="rounded-xl bg-blue-50 px-3 py-2 text-[10px] font-pmedium leading-relaxed text-blue-700">The employee will receive a notification. Attendance, clock-in eligibility, and leave hours will immediately follow the new shift.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" disabled={isShiftSaving} onClick={() => setShiftMember(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-[11px] font-pmedium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="button" disabled={!selectedShiftId || isShiftSaving} onClick={saveEmployeeShift} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-[11px] font-pmedium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50">
                {isShiftSaving && <Loader2 size={13} className="animate-spin" />} Save Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagementTab;
