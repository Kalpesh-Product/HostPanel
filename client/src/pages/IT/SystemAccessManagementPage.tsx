import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageFrame from "@/components/Pages/PageFrame";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Key,
  Package2,
  Search,
  ShieldCheck,
  User,
  Users,
  X,
  Loader2,
} from "lucide-react";
import { getAssets, updateAsset } from "../../services/assets";
import { getWorkspaceMembers } from "../../services/auth";

const SOFTWARE_CATEGORY = "Software";

function normalizeText(value?: string) {
  return String(value || "").trim().toLowerCase();
}

function formatTitle(value?: string) {
  return String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getDaysUntil(dateValue?: string) {
  const date = parseDate(dateValue);
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getExpiryState(asset: any) {
  const days = getDaysUntil(asset.expiryDate || asset.warrantyExpiry);
  if (days === null) return { label: "No expiry", tone: "neutral" as const };
  if (days < 0) return { label: "Expired", tone: "danger" as const };
  if (days <= 30) return { label: "Expiring Soon", tone: "warning" as const };
  return { label: "Valid", tone: "success" as const };
}

function getStatusTone(status?: string) {
  const s = normalizeText(status);
  if (s === "active") return "bg-green-50 text-green-700 border-green-200";
  if (s === "maintenance") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "decommissioned") return "bg-slate-100 text-slate-500 border-slate-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function getExpiryTone(tone: string) {
  if (tone === "danger") return "bg-red-50 text-red-700 border-red-200";
  if (tone === "warning") return "bg-amber-50 text-amber-700 border-amber-200";
  if (tone === "success") return "bg-green-50 text-green-700 border-green-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function getAssignmentLabel(asset: any) {
  if (asset.assignedToUserId) return asset.assignedTo || "Employee";
  if (asset.assignedToDepartment && asset.assignedToRole)
    return `${formatTitle(asset.assignedToDepartment)} · ${formatTitle(asset.assignedToRole)}`;
  if (asset.assignedToDepartment) return formatTitle(asset.assignedToDepartment);
  if (asset.assignedToRole) return formatTitle(asset.assignedToRole);
  return asset.assignedTo || "Unassigned";
}

const DEFAULT_AUDIENCE_OPTIONS = [
  { value: "department", label: "Department" },
  { value: "role", label: "Role" },
  { value: "employee", label: "Employee" },
];

export default function SystemAccessManagementPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [assets, setAssets] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    assetId: "",
    targetDepartment: "",
    targetAudience: "department",
    targetRole: "Manager",
    targetEmployeeId: "",
    notes: "",
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [assetsRes, membersRes] = await Promise.all([
          getAssets(),
          getWorkspaceMembers(),
        ]);

        if (!active) return;

        const nextAssets = Array.isArray(assetsRes?.assets ?? assetsRes) ? (assetsRes?.assets ?? assetsRes) : [];
        const nextMembers = Array.isArray(membersRes?.data?.members ?? membersRes?.members ?? membersRes)
          ? (membersRes?.data?.members ?? membersRes?.members ?? membersRes)
          : [];

        setAssets(nextAssets);
        setMembers(nextMembers);
      } catch (e: any) {
        if (!active) return;
        setError(e?.response?.data?.message || e?.message || "Unable to load system access records");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const softwareAssets = useMemo(
    () => assets.filter((a) => normalizeText(a.category) === normalizeText(SOFTWARE_CATEGORY)),
    [assets],
  );

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    softwareAssets.forEach((a) => {
      if (a.department) set.add(formatTitle(a.department));
      if (a.assignedToDepartment) set.add(formatTitle(a.assignedToDepartment));
    });
    members.forEach((m) => {
      if (Array.isArray(m.departments)) m.departments.forEach((d: string) => set.add(formatTitle(d)));
    });
    return ["All Departments", ...Array.from(set).sort()];
  }, [softwareAssets, members]);

  const roleOptions = useMemo(() => {
    const set = new Set(["Manager", "Employee", "Admin", "Owner", "Super Admin"]);
    members.forEach((m) => {
      const r = m.role ? formatTitle(m.role) : "";
      if (r) set.add(r);
    });
    return ["All Roles", ...Array.from(set)];
  }, [members]);

  const expiringSoonCount = useMemo(
    () => softwareAssets.filter((a) => getExpiryState(a).tone === "warning").length,
    [softwareAssets],
  );

  const expiredCount = useMemo(
    () => softwareAssets.filter((a) => getExpiryState(a).tone === "danger").length,
    [softwareAssets],
  );

  const assignedCount = useMemo(
    () => softwareAssets.filter((a) => Boolean(a.assignedToUserId || a.assignedToDepartment || a.assignedToRole || a.assignedTo)).length,
    [softwareAssets],
  );

  const displayedAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return softwareAssets.filter((a) => {
      const matchesDept = departmentFilter === "All Departments" || formatTitle(a.department) === departmentFilter || formatTitle(a.assignedToDepartment) === departmentFilter;
      const matchesRole = roleFilter === "All Roles" || formatTitle(a.assignedToRole) === roleFilter;
      const matchesStatus = statusFilter === "All Status" || formatTitle(a.status) === statusFilter;
      const matchesSearch = !q || [a.name, a.assetCode, a.department, a.assignedTo, a.assignedToDepartment, a.assignedToRole, a.serialNumber]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      return matchesDept && matchesRole && matchesStatus && matchesSearch;
    });
  }, [softwareAssets, departmentFilter, roleFilter, statusFilter, searchQuery]);

  const selectableAssets = useMemo(
    () => softwareAssets.filter((a) => normalizeText(a.status) !== "decommissioned"),
    [softwareAssets],
  );

  const employeeOptions = useMemo(() => {
    return members
      .map((m) => ({
        value: String(m.userId || m.id || m._id || "").trim(),
        label: m.fullName || m.name || `${m.firstName || ""} ${m.lastName || ""}`.trim(),
        role: formatTitle(m.role),
        departments: Array.isArray(m.departments) ? m.departments.map(formatTitle) : [],
      }))
      .filter((e) => e.value && e.label);
  }, [members]);

  const selectableEmployees = useMemo(() => {
    if (!assignmentForm.targetDepartment) return employeeOptions;
    return employeeOptions.filter((e) => e.departments.includes(assignmentForm.targetDepartment));
  }, [assignmentForm.targetDepartment, employeeOptions]);

  const openModal = (asset: any = null) => {
    setAssignmentForm({
      assetId: asset?.id || asset?._id || asset?.recordId || "",
      targetDepartment: asset?.department ? formatTitle(asset.department) : departmentOptions[1] || "",
      targetAudience: "department",
      targetRole: "Manager",
      targetEmployeeId: "",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleProvision = async (e: FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.assetId) return;

    setIsSaving(true);
    setError("");

    const selectedAsset = softwareAssets.find((a) => String(a.id || a._id) === String(assignmentForm.assetId));
    if (!selectedAsset) {
      setError("Select a valid software asset");
      setIsSaving(false);
      return;
    }

    const selectedEmployee = assignmentForm.targetAudience === "employee"
      ? selectableEmployees.find((e) => e.value === assignmentForm.targetEmployeeId)
      : null;

    if (assignmentForm.targetAudience === "employee" && !selectedEmployee) {
      setError("Select an employee");
      setIsSaving(false);
      return;
    }

    try {
      const nextDepartment = formatTitle(assignmentForm.targetDepartment);
      const nextRole = assignmentForm.targetAudience === "role"
        ? formatTitle(assignmentForm.targetRole)
        : assignmentForm.targetAudience === "employee"
          ? selectedEmployee?.role || ""
          : "";

      const assetId = selectedAsset._id || selectedAsset.id || selectedAsset.recordId;
      await updateAsset(assetId, {
        assignedTo: assignmentForm.targetAudience === "department" ? nextDepartment : assignmentForm.targetAudience === "role" ? nextRole : selectedEmployee?.label || "",
        assignedToDepartment: nextDepartment,
        assignedToRole: nextRole,
        assignedToUserId: assignmentForm.targetAudience === "employee" ? selectedEmployee?.value || null : null,
        notes: assignmentForm.notes,
      });

      toast.success("Access provisioned successfully");

      const freshAssets = await getAssets();
      setAssets(Array.isArray(freshAssets?.assets ?? freshAssets) ? (freshAssets?.assets ?? freshAssets) : []);
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to provision access");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-lg mb-2" />
        <div className="h-4 w-96 bg-slate-100 rounded mb-6" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-3xl" />)}
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="h-14 bg-slate-50 border-b border-slate-100" />
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-slate-50/50 border-b border-slate-50" />)}
        </div>
      </div>
    );
  }

  return (
    <PageFrame>
      <div className="flex flex-col gap-4">

        {/* ── Header ── */}
        <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              System Access Management
            </h2>
            <p className="text-xs font-pmedium text-slate-500 mt-1">
              Software access, role gating, and expiry tracking
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2 text-sm font-bold text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        ) : null}

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-3 shrink-0">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
            <div className="min-w-0">
              <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">Software Assets</p>
              <p className="text-lg font-black text-slate-900">{softwareAssets.length}</p>
            </div>
            <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0">
              <Package2 size={16} />
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-green-500">
            <div className="min-w-0">
              <p className="text-[10px] font-pmedium text-green-600 uppercase tracking-widest mb-1">Assigned</p>
              <p className="text-lg font-black text-slate-900">{assignedCount}</p>
            </div>
            <div className="p-2 rounded-2xl bg-green-50 text-green-600 shrink-0">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
            <div className="min-w-0">
              <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Expiring Soon</p>
              <p className="text-lg font-black text-slate-900">{expiringSoonCount}</p>
            </div>
            <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0">
              <Clock size={16} />
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-rose-500">
            <div className="min-w-0">
              <p className="text-[10px] font-pmedium text-rose-600 uppercase tracking-widest mb-1">Expired</p>
              <p className="text-lg font-black text-slate-900">{expiredCount}</p>
            </div>
            <div className="p-2 rounded-2xl bg-rose-50 text-rose-600 shrink-0">
              <AlertTriangle size={16} />
            </div>
          </div>
        </div>

      {/* ── Data Panel ── */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

        {/* Panel header */}
        <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3 flex-wrap">
            <select
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              {departmentOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Maintenance</option>
              <option>Decommissioned</option>
            </select>
          </div>

          <div className="flex items-center gap-3 w-full xl:w-auto">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search software, owner, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
              />
            </div>
            <button
              type="button"
              onClick={() => openModal()}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 whitespace-nowrap"
            >
              <Key className="w-4 h-4" />
              Provision Access
            </button>
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
              <tr>
                <th className="px-5 py-4">Software Asset</th>
                <th className="px-5 py-4">Owning Dept</th>
                <th className="px-5 py-4">Assignment</th>
                <th className="px-5 py-4">Purchased</th>
                <th className="px-5 py-4">Expires</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayedAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10">
                      <AlertTriangle size={34} className="mx-auto text-slate-300" />
                      <h3 className="mt-4 text-lg font-black text-slate-900">No software assets found</h3>
                      <p className="mt-2 text-sm font-bold text-slate-500">Try another department, role, or search term.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedAssets.map((asset) => {
                  const id = asset._id || asset.id || asset.recordId;
                  const expiry = getExpiryState(asset);
                  const daysUntilExpiry = getDaysUntil(asset.expiryDate || asset.warrantyExpiry);
                  const assigned = getAssignmentLabel(asset);
                  const assignmentType = asset.assignedToUserId ? "Employee" : asset.assignedToRole ? "Role" : asset.assignedToDepartment ? "Department" : "Unassigned";

                  return (
                    <tr key={id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-blue-600">
                            <Package2 size={18} />
                          </div>
                          <div>
                            <div className="font-black text-slate-900">{asset.name || asset.assetName || "--"}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">
                              <span className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1">{asset.assetCode || id}</span>
                              {asset.serialNumber ? <span className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1">SN: {asset.serialNumber}</span> : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800">{formatTitle(asset.department) || "--"}</div>
                        <div className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">
                          {formatTitle(asset.department) || "Unassigned"} ownership
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{assigned}</div>
                        <div className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{assignmentType}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-bold text-slate-700">{asset.purchaseDate || "--"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-2">
                          <span className={`inline-flex w-max items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-pmedium uppercase tracking-widest ${getExpiryTone(expiry.tone)}`}>
                            <CalendarDays size={12} /> {asset.expiryDate || asset.warrantyExpiry || "No expiry"}
                          </span>
                          {daysUntilExpiry !== null ? (
                            <span className="text-[10px] font-pmedium text-slate-400">
                              {daysUntilExpiry < 0 ? `${Math.abs(daysUntilExpiry)} day(s) overdue` : `${daysUntilExpiry} day(s) left`}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-pmedium uppercase tracking-widest ${getStatusTone(asset.status)}`}>
                          <ShieldCheck size={12} /> {formatTitle(asset.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openModal(asset)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-pmedium uppercase tracking-widest text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                        >
                          <Key size={12} /> Assign
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-slate-100/60 text-[10px] font-pmedium text-slate-400 bg-slate-50/30">
          Showing {displayedAssets.length} of {softwareAssets.length} software assets
        </div>
      </div>

      {/* ─── Provision Access Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen ? (
          <motion.div
            className="fixed inset-0 z-[150] flex items-center justify-center px-4 py-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => !isSaving && setIsModalOpen(false)} />
            <motion.div
              className="relative w-full max-w-4xl overflow-hidden rounded-[2.5rem] border border-white/70 bg-white shadow-2xl max-h-[90vh] flex flex-col"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 p-6">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-pmedium uppercase tracking-widest text-blue-600">
                    <Key size={12} /> Provision software access
                  </p>
                  <h2 className="mt-3 text-xl font-black text-slate-900">Assign access by department, role, or employee</h2>
                  <p className="mt-1 max-w-2xl text-xs font-bold text-slate-500">
                    Keep the owning department intact while mapping the software asset to the right team, role, or person.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !isSaving && setIsModalOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleProvision} className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr] flex-1 min-h-0">
                <div className="p-6 space-y-5 overflow-y-auto">
                  <div className="space-y-2">
                    <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Software asset</label>
                    <select
                      required
                      value={assignmentForm.assetId}
                      onChange={(e) => setAssignmentForm((f) => ({ ...f, assetId: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select a software asset</option>
                      {selectableAssets.map((a) => {
                        const id = a._id || a.id || a.recordId;
                        return <option key={id} value={id}>{a.name || a.assetName} ({a.assetCode || id})</option>;
                      })}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Target department</label>
                    <select
                      required
                      value={assignmentForm.targetDepartment}
                      onChange={(e) => setAssignmentForm((f) => ({ ...f, targetDepartment: e.target.value, targetEmployeeId: "" }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select department</option>
                      {departmentOptions.filter((d) => d !== "All Departments").map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Audience type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {DEFAULT_AUDIENCE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAssignmentForm((f) => ({ ...f, targetAudience: opt.value, targetEmployeeId: "" }))}
                          className={`rounded-xl border px-3 py-3 text-xs font-pmedium uppercase tracking-wider transition-all ${
                            assignmentForm.targetAudience === opt.value
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {assignmentForm.targetAudience === "role" ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Role</label>
                      <select
                        required
                        value={assignmentForm.targetRole}
                        onChange={(e) => setAssignmentForm((f) => ({ ...f, targetRole: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      {roleOptions.filter((r) => r !== "All Roles").map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  ) : null}

                  {assignmentForm.targetAudience === "employee" ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Employee</label>
                      <select
                        required
                        value={assignmentForm.targetEmployeeId}
                        onChange={(e) => setAssignmentForm((f) => ({ ...f, targetEmployeeId: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select employee</option>
                        {selectableEmployees.map((e) => (
                          <option key={e.value} value={e.value}>{e.label} · {e.role}</option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Notes</label>
                    <textarea
                      value={assignmentForm.notes}
                      onChange={(e) => setAssignmentForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={3}
                      placeholder="Provisioning note, ticket reference, or expiry context"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>

                <aside className="border-t lg:border-t-0 lg:border-l border-slate-100 bg-slate-50/70 p-6 flex flex-col gap-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Preview</p>
                    <div className="mt-3 space-y-3 text-xs font-bold text-slate-700">
                      <div className="flex items-center justify-between gap-3">
                        <span>Department</span>
                        <span className="text-slate-900">{assignmentForm.targetDepartment || "--"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Audience</span>
                        <span className="text-slate-900">{formatTitle(assignmentForm.targetAudience)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Role</span>
                        <span className="text-slate-900">
                          {assignmentForm.targetAudience === "role" ? assignmentForm.targetRole :
                           assignmentForm.targetAudience === "employee" ? "From employee profile" : "Not required"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 rounded-xl border border-dashed border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">What this does</p>
                    <ul className="mt-3 space-y-3 text-xs font-bold text-slate-600">
                      <li className="flex gap-2"><Users size={16} className="mt-0.5 text-blue-600 shrink-0" /> Keeps the owning department on the asset record.</li>
                      <li className="flex gap-2"><User size={16} className="mt-0.5 text-blue-600 shrink-0" /> Targets a department, role, or single employee for visibility.</li>
                      <li className="flex gap-2"><Clock size={16} className="mt-0.5 text-blue-600 shrink-0" /> Preserves purchase and expiry dates for review and renewal.</li>
                    </ul>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)}
                      className="flex-1 rounded-2xl border border-slate-200 bg-white py-4 font-bold text-slate-700 shadow-sm">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSaving || !assignmentForm.assetId || !assignmentForm.targetDepartment || (assignmentForm.targetAudience === "employee" && !assignmentForm.targetEmployeeId) || (assignmentForm.targetAudience === "role" && !assignmentForm.targetRole)}
                      className="inline-flex items-center justify-center gap-1.5 flex-1 rounded-2xl bg-blue-600 py-4 font-black text-white shadow-sm disabled:bg-slate-300">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {isSaving ? "Saving..." : "Confirm Access"}
                    </button>
                  </div>
                </aside>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      </div>
    </PageFrame>
  );
}
