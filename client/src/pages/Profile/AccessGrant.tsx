import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle,
  ChevronDown,
  Search,
  Shield,
  Users,
  X,
} from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import useAuth from "../../hooks/useAuth";

type RoleGroup = "Founder" | "Super-Admin" | "Admin" | "Manager" | "Employee";
type RoleFilter = "All Roles" | RoleGroup;

type AccessMember = {
  id: string;
  name: string;
  email: string;
  roleGroup: RoleGroup;
  department: string;
  status: "joined" | "disabled";
  grantedModules: string[];
};

type WorkspaceOption = {
  id: string;
  workspaceName: string;
  location: string;
};

const ROLE_FILTERS: RoleFilter[] = ["All Roles", "Founder", "Super-Admin", "Admin", "Manager", "Employee"];

const MODULES = ["Dashboard", "Reports", "Attendance", "Tasks", "Tickets", "Bookings", "Assets", "Finance"];

const getRoleBadge = (group: RoleGroup): ReactElement => {
  const common = "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1";
  if (group === "Founder") return <span className={`${common} bg-[#111827] text-white`}><Shield size={12} /> Founder</span>;
  if (group === "Super-Admin") return <span className={`${common} bg-[#2563EB]/10 text-[#2563EB`}><Shield size={12} /> Super Admin</span>;
  if (group === "Admin") return <span className={`${common} bg-cyan-100 text-cyan-700`}><Shield size={12} /> Admin</span>;
  if (group === "Manager") return <span className={`${common} bg-emerald-100 text-emerald-700`}><Users size={12} /> Manager</span>;
  return <span className={`${common} bg-slate-100 text-slate-600`}><Users size={12} /> Employee</span>;
};

const AccessGrant = () => {
  const { auth } = useAuth();
  const currentName = `${auth?.user?.firstName ?? ""} ${auth?.user?.lastName ?? ""}`.trim() || "Current User";

  const members = useMemo<AccessMember[]>(() => [
    {
      id: "owner-1",
      name: currentName,
      email: String(auth?.user?.email || "owner@example.com"),
      roleGroup: "Founder",
      department: "All Departments",
      status: "joined",
      grantedModules: MODULES,
    },
    {
      id: "sa-1",
      name: "Rahul Sharma",
      email: "rahul@company.com",
      roleGroup: "Super-Admin",
      department: "Administration / HR",
      status: "joined",
      grantedModules: ["Dashboard", "Reports", "Bookings", "Assets"],
    },
    {
      id: "m-1",
      name: "Ankita Verma",
      email: "ankita@company.com",
      roleGroup: "Manager",
      department: "Sales",
      status: "joined",
      grantedModules: ["Dashboard", "Tasks", "Tickets"],
    },
    {
      id: "e-1",
      name: "Rohit Das",
      email: "rohit@company.com",
      roleGroup: "Employee",
      department: "HR",
      status: "joined",
      grantedModules: ["Dashboard", "Attendance", "Tasks"],
    },
  ], [auth?.user?.email, currentName]);

  const workspaceOptions: WorkspaceOption[] = [
    { id: "ws-2", workspaceName: "Biznest Downtown", location: "Pune" },
    { id: "ws-3", workspaceName: "Biznest North", location: "Mumbai" },
  ];

  const [selectedRole, setSelectedRole] = useState<RoleFilter>("All Roles");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>(members[0]?.id ?? "");
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showWorkspaceTransferDialog, setShowWorkspaceTransferDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(workspaceOptions[0]?.id ?? "");

  const selectedUser = useMemo(() => members.find((m) => m.id === selectedUserId) ?? null, [members, selectedUserId]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      const roleMatch = selectedRole === "All Roles" || m.roleGroup === selectedRole;
      const textMatch = !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.department.toLowerCase().includes(q);
      return roleMatch && textMatch;
    });
  }, [members, searchQuery, selectedRole]);

  const stats = useMemo(() => {
    const count = (group: RoleGroup) => members.filter((m) => m.roleGroup === group).length;
    return {
      owner: count("Founder"),
      superAdmin: count("Super-Admin"),
      admin: count("Admin"),
      manager: count("Manager"),
      employee: count("Employee"),
    };
  }, [members]);

  return (
    <PageFrame>
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Owner Controls</p>
              <h1 className="mt-2 text-2xl font-black text-slate-900">Access Grants</h1>
              <p className="mt-2 text-sm text-slate-500">Manage roles, visibility, and workspace handovers with a centralized access console.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowLinkDialog(true)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Link Workspace Access</button>
              <button onClick={() => setShowWorkspaceTransferDialog(true)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Transfer Workspace</button>
              <button onClick={() => setShowTransferDialog(true)} className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]">Transfer Founder</button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <button onClick={() => setSelectedRole("Founder")} className="rounded-2xl border border-slate-200 p-3 text-left hover:bg-slate-50"><p className="text-xs text-slate-500">Founders</p><p className="text-xl font-black text-slate-900">{stats.owner}</p></button>
            <button onClick={() => setSelectedRole("Super-Admin")} className="rounded-2xl border border-slate-200 p-3 text-left hover:bg-slate-50"><p className="text-xs text-slate-500">Super Admins</p><p className="text-xl font-black text-slate-900">{stats.superAdmin}</p></button>
            <button onClick={() => setSelectedRole("Admin")} className="rounded-2xl border border-slate-200 p-3 text-left hover:bg-slate-50"><p className="text-xs text-slate-500">Admins</p><p className="text-xl font-black text-slate-900">{stats.admin}</p></button>
            <button onClick={() => setSelectedRole("Manager")} className="rounded-2xl border border-slate-200 p-3 text-left hover:bg-slate-50"><p className="text-xs text-slate-500">Managers</p><p className="text-xl font-black text-slate-900">{stats.manager}</p></button>
            <button onClick={() => setSelectedRole("Employee")} className="rounded-2xl border border-slate-200 p-3 text-left hover:bg-slate-50"><p className="text-xs text-slate-500">Employees</p><p className="text-xl font-black text-slate-900">{stats.employee}</p></button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, email, department" className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10" />
              </div>
              <div className="flex flex-wrap gap-2">
                {ROLE_FILTERS.map((role) => (
                  <button key={role} onClick={() => setSelectedRole(role)} className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${selectedRole === role ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{role}</button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {filteredUsers.map((user) => (
                <button key={user.id} onClick={() => setSelectedUserId(user.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedUserId === user.id ? "border-[#2563EB] bg-[#2563EB]/5" : "border-slate-200 hover:bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      <p className="mt-2 text-xs font-medium text-slate-600">{user.department}</p>
                    </div>
                    {getRoleBadge(user.roleGroup)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-5">
            {selectedUser ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Member Summary</p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">{selectedUser.name}</h2>
                    <p className="text-sm text-slate-500">{selectedUser.email}</p>
                  </div>
                  {getRoleBadge(selectedUser.roleGroup)}
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">Department</p><p className="mt-1 text-sm font-medium text-slate-700">{selectedUser.department}</p></div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">Status</p><p className="mt-1 text-sm font-medium text-emerald-700 inline-flex items-center gap-1"><CheckCircle size={14} /> Active</p></div>
                </div>

                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Granted Modules</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedUser.grantedModules.map((moduleName) => (
                      <span key={moduleName} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">{moduleName}</span>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {showTransferDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white">
              <div className="bg-[#1E293B] p-5"><h3 className="flex items-center gap-2 text-lg font-bold text-white"><AlertCircle className="h-5 w-5 text-amber-400" />Transfer Founder Access</h3></div>
              <div className="space-y-4 p-5">
                <p className="text-sm text-slate-600">Transfer founder ownership to a Super-Admin account. This should be used only for intentional handover.</p>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">Current founder will be downgraded to Super-Admin after confirmation.</div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
                <button onClick={() => setShowTransferDialog(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Cancel</button>
                <button onClick={() => setShowTransferDialog(false)} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">Confirm Transfer</button>
              </div>
            </div>
          </div>
        )}

        {showWorkspaceTransferDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
            <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white">
              <div className="flex items-center justify-between bg-slate-900 p-5">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><ArrowRightLeft size={18} />Workspace Transfer</h3>
                <button onClick={() => setShowWorkspaceTransferDialog(false)} className="rounded-lg p-2 hover:bg-white/10"><X className="h-4 w-4 text-slate-300" /></button>
              </div>
              <div className="space-y-4 p-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Target Workspace</label>
                <div className="relative">
                  <select value={selectedWorkspaceId} onChange={(e) => setSelectedWorkspaceId(e.target.value)} className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                    {workspaceOptions.map((w) => <option key={w.id} value={w.id}>{w.workspaceName} - {w.location}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">The same login credentials remain valid after transfer.</div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
                <button onClick={() => setShowWorkspaceTransferDialog(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Cancel</button>
                <button onClick={() => setShowWorkspaceTransferDialog(false)} className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white">Transfer</button>
              </div>
            </div>
          </div>
        )}

        {showLinkDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
            <div className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white">
              <div className="flex items-center justify-between bg-slate-900 p-5">
                <h3 className="text-lg font-semibold text-white">Link Workspace Access</h3>
                <button onClick={() => setShowLinkDialog(false)} className="rounded-lg p-2 hover:bg-white/10"><X className="h-4 w-4 text-slate-300" /></button>
              </div>
              <div className="space-y-4 p-5">
                <p className="text-sm text-slate-600">Grant this member access to another linked workspace while preserving shared profile identity.</p>
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-800">Role and employee profile remain aligned across linked workspaces.</div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
                <button onClick={() => setShowLinkDialog(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Cancel</button>
                <button onClick={() => setShowLinkDialog(false)} className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white">Add Access</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageFrame>
  );
};

export default AccessGrant;
