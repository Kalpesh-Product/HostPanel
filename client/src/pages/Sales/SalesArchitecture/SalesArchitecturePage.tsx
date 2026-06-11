// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, Building2, CheckCircle2,
  FileDown, FileSpreadsheet, LayoutGrid, Map as MapIcon, Monitor, PieChart,
  Presentation, Search, Users, X
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { useFreshCurrentUser } from "../../../hooks/useFreshCurrentUser";
import { createReport } from "../../../services/reports";
import { assignResource, getResources, releaseResourceAssignment } from "../../../services/resources";
import { getTenantCompanies } from "../../../services/tenant-companies";
import { getOrganizationOverview } from "../../../services/organization";
import { downloadReportFile } from "../../../utils/report-download";
import { toast } from "sonner";
import PageFrame from "../../../components/Pages/PageFrame";

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("hostpanel_auth_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const floors = ["501", "601", "701"];
const wings = ["A", "B"];
const defaultBuilding = "Sunteck Kanaka";
const deskCats = new Set(["open_desk", "cabin_desk"]);
const bookingOnlyCats = new Set(["meeting_room", "conference_room", "virtual_office"]);

const money = (v = 0) => `Rs ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(v || 0))}`;
const location = (r = {}) => [r.floor, r.wing].filter(Boolean).join(" ").trim();
const parseSearchList = (value = "") => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
const buildingLabelFor = (resource = {}) => String(resource.buildingName || resource.building || resource.buildingLabel || "").trim();
const normalizeDepartmentOptions = (departments = []) => {
  const merged = new Map();
  for (const department of departments) {
    const rawName = typeof department === "string"
      ? department
      : department?.name || department?.departmentName || "";
    const name = String(rawName || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const current = merged.get(key) || { id: name, name, description: "", color: "", managerName: "", managerUserId: null, isActive: true };
    merged.set(key, {
      id: String((typeof department === "string" ? name : department?.id || department?._id || current.id) || current.id).trim(),
      name, description: current.description || String(department?.description || "").trim(),
      color: current.color || String(department?.color || "").trim(),
      managerName: current.managerName || String(department?.managerName || department?.headOfDept || "").trim(),
      managerUserId: current.managerUserId || department?.managerUserId || null,
      isActive: current.isActive !== false && department?.isActive !== false,
    });
  }
  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
};
const buildResourceAreaGroups = (items = []) => {
  const grouped = items.reduce((acc, resource) => {
    const label = String(resource.locationLabel || [resource.floor, resource.wing].filter(Boolean).join(" ").trim() || "Unassigned").trim();
    const groupKey = label.toUpperCase().replace(/[\s_-]+/g, "");
    if (!acc[groupKey]) {
      acc[groupKey] = { label, floor: String(resource.floor || "").trim(), wing: String(resource.wing || "").trim().toUpperCase(), seats: [], seatCount: 0 };
    }
    acc[groupKey].seats.push(resource);
    acc[groupKey].seatCount += Math.max(1, Number(resource.capacity || 1));
    return acc;
  }, {});
  return Object.values(grouped).sort((a, b) => {
    const floorCompare = String(a.floor || "").localeCompare(String(b.floor || ""), undefined, { numeric: true });
    if (floorCompare !== 0) return floorCompare;
    return String(a.wing || "").localeCompare(String(b.wing || ""), undefined, { numeric: true });
  });
};

const getSeatLabels = (resource = {}) => {
  const labels = Array.isArray(resource.seatLabels) ? resource.seatLabels.filter(Boolean) : [];
  if (labels.length > 0) return labels;
  const capacity = Math.max(0, Number(resource.capacity || 0));
  if (capacity <= 0) return [];
  const prefix = resource.resourceCategory === "cabin_desk" ? "CDS" : resource.resourceCategory === "open_desk" ? "ODS" : "S";
  return Array.from({ length: capacity }, (_, index) => `${prefix}${index + 1}`);
};

const kindLabel = (r = {}) => (
  r.resourceCategory === "open_desk" ? "Open Desk" :
  r.resourceCategory === "cabin_desk" ? "Cabin Desk" :
  r.resourceCategory === "meeting_room" ? "Meeting Room" :
  r.resourceCategory === "conference_room" ? "Conference Room" :
  r.resourceCategory === "virtual_office" ? "Virtual Office" : (r.type || "Space")
);

const iconFor = (r = {}) => (
  r.resourceCategory === "meeting_room" ? <Users size={18} /> :
  r.resourceCategory === "conference_room" ? <Presentation size={18} /> :
  r.resourceCategory === "virtual_office" ? <Building2 size={18} /> :
  r.resourceCategory === "cabin_desk" ? <Building2 size={18} /> :
  <Monitor size={18} />
);

const toneFor = (r = {}) => {
  if (r.status === "Under Maintenance") return ["bg-amber-50 border-amber-200 text-amber-700", "bg-amber-50 border-amber-300", "Maintenance", "text-amber-600"];
  if (r.status === "Disabled") return ["bg-slate-100 border-slate-200 text-slate-500", "bg-slate-50 border-slate-200", "Disabled", "text-slate-500"];
  if (r.assignmentType === "tenant") return ["bg-indigo-50 border-indigo-200 text-indigo-700", "bg-indigo-50 border-indigo-300", "Tenant", "text-indigo-600"];
  if (r.assignmentType === "department") return ["bg-amber-50 border-amber-200 text-amber-700", "bg-amber-50 border-amber-300", "Department", "text-amber-600"];
  if (bookingOnlyCats.has(r.resourceCategory)) return ["bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700", "bg-fuchsia-50 border-fuchsia-200", "Booking", "text-fuchsia-600"];
  return ["bg-emerald-50 border-emerald-200 text-emerald-700", "bg-white border-green-300", "Available", "text-emerald-600"];
};

const matchesSearch = (r = {}, q = "") => {
  const s = String(q || "").trim().toLowerCase();
  if (!s) return true;
  return [r.resourceCode, r.name, r.type, r.resourceCategory, r.floor, r.wing, r.locationLabel, r.assignmentLabel, r.assignedTenantCompanyName, r.assignedDepartmentName]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(s));
};

function normalizeResource(r = {}) {
  const floor = String(r.floor || "").trim() || floors[0];
  const wing = String(r.wing || "").trim().toUpperCase();
  const assignmentLabel = r.assignmentLabel || r.assignedTenantCompanyName || r.assignedDepartmentName || "";
  const assignmentType = r.assignmentType || (r.assignedTenantCompanyId ? "tenant" : r.assignedDepartmentName ? "department" : "");
  const buildingName = buildingLabelFor(r);
  return {
    ...r,
    recordId: r.recordId || r._id || r.id || r.resourceCode,
    id: r.id || r.resourceCode || "",
    resourceCode: r.resourceCode || r.id || "",
    name: r.name || "",
    type: r.type || "Space",
    resourceCategory: r.resourceCategory || "",
    inventoryMode: r.inventoryMode || (Number(r.capacity || 1) > 1 ? "area" : "single"),
    buildingName, buildingLabel: buildingName, floor, wing,
    locationLabel: r.locationLabel || location({ floor, wing }),
    capacity: Number(r.capacity || 1),
    pricePerDay: Number(r.pricePerDay || 0),
    status: r.status || "Active",
    assignedTenantCompanyId: r.assignedTenantCompanyId || null,
    assignedTenantCompanyName: r.assignedTenantCompanyName || "",
    assignedDepartmentId: r.assignedDepartmentId || "",
    assignedDepartmentName: r.assignedDepartmentName || "",
    assignmentLabel, assignmentType,
  };
}

function getAssignmentTargetLabel(resource = {}) {
  return resource.assignmentType === 'department' ? resource.assignedDepartmentName || 'Department' : resource.assignedTenantCompanyName || 'Tenant Company';
}

function buildArchitectureExportRows({ mode = 'tenant', building = '', floor = '', wing = 'All', assignedResources = [], availableResources = [], searchQuery = '' }) {
  const scopeLabel = mode === 'tenant' ? 'Tenant' : 'Department';
  const rows = [
    { label: 'Scope', value: `${scopeLabel} Architecture` },
    { label: 'Building', value: building || 'All Buildings' },
    { label: 'Floor', value: floor || 'All Floors' },
    { label: 'Wing', value: wing || 'All Wings' },
    { label: 'Search Filter', value: searchQuery || 'All' },
    { label: 'Assigned Count', value: String(assignedResources.length) },
    { label: 'Available Count', value: String(availableResources.length) },
    { label: 'Assigned To', value: mode === 'tenant' ? 'Tenant companies' : 'Departments' },
  ];
  assignedResources.forEach((resource, index) => {
    rows.push({
      label: `${index + 1}. ${resource.name || resource.resourceCode || 'Assigned space'}`,
      value: [resource.resourceCode ? `Code: ${resource.resourceCode}` : '', resource.locationLabel ? `Location: ${resource.locationLabel}` : '', resource.assignmentType ? `Assignment Type: ${resource.assignmentType === 'tenant' ? 'Tenant' : 'Department'}` : '', resource.assignmentLabel ? `Assigned To: ${resource.assignmentLabel}` : '', resource.assignmentLabel && resource.assignmentLabel !== getAssignmentTargetLabel(resource) ? `Target: ${getAssignmentTargetLabel(resource)}` : '', resource.status ? `Status: ${resource.status}` : ''].filter(Boolean).join(' | '),
    });
  });
  rows.push({ label: 'Available Spaces', value: String(availableResources.length) });
  availableResources.forEach((resource, index) => {
    rows.push({
      label: `${index + 1}. ${resource.name || resource.resourceCode || 'Available space'}`,
      value: [resource.resourceCode ? `Code: ${resource.resourceCode}` : '', resource.locationLabel ? `Location: ${resource.locationLabel}` : '', resource.resourceCategory ? `Category: ${resource.resourceCategory}` : '', resource.capacity ? `Seats: ${resource.capacity}` : '', resource.status ? `Status: ${resource.status}` : ''].filter(Boolean).join(' | '),
    });
  });
  return rows;
}

function SpaceCard({ resource, selected, disabled, onToggle }) {
  const [badge, card, label] = toneFor(resource);
  return (
    <button type="button" onClick={() => onToggle(resource)} disabled={disabled}
      className={`group flex min-h-42 flex-col justify-between rounded-[1.75rem] border-2 p-4 text-left transition-all ${card} ${selected ? "ring-4 ring-blue-500 shadow-xl shadow-blue-100 scale-[1.02] z-10" : "shadow-sm hover:-translate-y-0.5 hover:shadow-md"} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-[#0F172A] shadow-sm">{iconFor(resource)}</div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{resource.resourceCode || resource.id || "Space"}</p>
            <h3 className="mt-1 text-base font-black leading-tight text-slate-900">{resource.name || kindLabel(resource)}</h3>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{kindLabel(resource)} {resource.capacity ? ` ${resource.capacity} Seats` : ""}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${badge}`}>{label}</span>
      </div>
      <div className="mt-4 space-y-2">
        <div className="rounded-2xl bg-white/80 p-3">
          <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location</p><p className="text-xs font-black text-slate-900">{resource.locationLabel || "Unassigned Floor"}</p></div>
          <div className="mt-2 flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rate / Day</p><p className="text-xs font-black text-slate-900">{money(resource.pricePerDay || 0)}</p></div>
        </div>
        {getSeatLabels(resource).length > 0 && (
          <div className="rounded-2xl border border-white/70 bg-white/80 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Seats</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {getSeatLabels(resource).map((seatLabel) => (
                <span key={seatLabel} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-700 shadow-sm">{seatLabel}</span>
              ))}
            </div>
          </div>
        )}
        {resource.assignmentLabel ? (
          <div className="rounded-2xl border border-white/70 bg-white/80 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned To</p>
            <p className="mt-1 text-sm font-black leading-tight text-slate-900">{resource.assignmentLabel}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{resource.assignmentType === "department" ? "Department" : "Tenant Company"}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assignment</p><p className="mt-1 text-sm font-bold text-slate-600">Ready to assign</p></div>
        )}
      </div>
    </button>
  );
}

function CardsGridSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 p-2 lg:p-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[2rem] border border-slate-100 bg-white p-4 animate-pulse">
          <div className="h-4 w-24 bg-slate-100 rounded-xl mb-3" />
          <div className="h-8 w-16 bg-slate-100 rounded-xl mb-2" />
          <div className="h-3 w-32 bg-slate-100 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export default function SalesArchitecturePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = useFreshCurrentUser();
  const axiosPrivate = useAxiosPrivate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resources, setResources] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [organizationDepartments, setOrganizationDepartments] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(defaultBuilding);
  const [selectedFloor, setSelectedFloor] = useState(floors[0]);
  const [selectedWing, setSelectedWing] = useState("All");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [mode, setMode] = useState("tenant");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [primaryId, setPrimaryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState("");
  const [viewMode, setViewMode] = useState("map");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const searchParamsKey = searchParams.toString();
  const scopedCompanyId = searchParams.get("tenantCompanyId") || searchParams.get("companyId") || "";
  const scopedFloor = searchParams.get("floor") || "";
  const scopedWing = searchParams.get("wing") || "";
  const scopedSeatIds = useMemo(() => parseSearchList(searchParams.get("seats") || ""), [searchParamsKey]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [rRes, tRes, oRes] = await Promise.allSettled([getResources(), getTenantCompanies(), getOrganizationOverview(axiosPrivate)]);
        if (!alive) return;
        const nextResources = rRes.status === "fulfilled" && Array.isArray(rRes.value?.data?.resources) ? rRes.value.data.resources.map(normalizeResource) : [];
        const nextTenants = tRes.status === "fulfilled" && Array.isArray(tRes.value?.data?.tenants) ? tRes.value.data.tenants : [];
        const storedUser = getStoredUser();
        const nextDepartments = normalizeDepartmentOptions([
          ...(oRes.status === "fulfilled" && Array.isArray(oRes.value?.data?.workspace?.organizationDepartments) ? oRes.value.data.workspace.organizationDepartments : []),
          ...(oRes.status === "fulfilled" && Array.isArray(oRes.value?.data?.departments) ? oRes.value.data.departments : []),
          ...(oRes.status === "fulfilled" && Array.isArray(oRes.value?.data?.workspace?.departments) ? oRes.value.data.workspace.departments : []),
          ...(Array.isArray(storedUser?.workspace?.organizationDepartments) ? storedUser.workspace.organizationDepartments : []),
          ...(Array.isArray(storedUser?.workspaceMembership?.departments) ? storedUser.workspaceMembership.departments : []),
          ...(Array.isArray(storedUser?.departments) ? storedUser.departments : []),
          ...(Array.isArray(storedUser?.workspace?.departments) ? storedUser.workspace.departments : []),
        ]);
        setResources(nextResources);
        setTenants(nextTenants);
        setOrganizationDepartments(nextDepartments);
        if (nextResources.length > 0) {
          const firstFloor = Array.from(new Set(nextResources.map((r) => r.floor).filter(Boolean))).sort()[0];
          if (firstFloor) setSelectedFloor(firstFloor);
        }
      } catch (e) {
        if (alive) setError(e.message || "Unable to load resource architecture.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const availableBuildings = useMemo(() => {
    const list = Array.from(new Set(resources.map((r) => buildingLabelFor(r) || defaultBuilding))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return list.length > 0 ? list : [defaultBuilding];
  }, [resources]);

  useEffect(() => {
    if (!availableBuildings.includes(selectedBuilding)) setSelectedBuilding(availableBuildings[0] || defaultBuilding);
  }, [availableBuildings, selectedBuilding]);

  const buildingResources = useMemo(() => resources.filter((resource) => {
    const resourceBuilding = buildingLabelFor(resource) || defaultBuilding;
    return resourceBuilding === selectedBuilding;
  }), [resources, selectedBuilding]);

  const availableFloors = useMemo(() => {
    const list = Array.from(new Set(buildingResources.map((r) => r.floor).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return list.length ? list : floors;
  }, [buildingResources]);

  useEffect(() => {
    if (!availableFloors.includes(selectedFloor)) {
      setSelectedFloor(availableFloors[0] || floors[0]);
      setSelectedWing("All");
    }
  }, [availableFloors, selectedFloor]);

  const assignedDepartmentNames = useMemo(() => new Set(resources.filter((r) => r.assignmentType === "department" && r.assignedDepartmentName).map((r) => String(r.assignedDepartmentName).trim()).filter(Boolean)), [resources]);
  const availableDepartments = useMemo(() => organizationDepartments.filter((d) => d.isActive !== false), [organizationDepartments]);
  const selectedDepartment = useMemo(() => availableDepartments.find((d) => String(d.id || d.name) === String(selectedDepartmentId)) || null, [availableDepartments, selectedDepartmentId]);
  const selectedCompany = useMemo(() => tenants.find((t) => String(t.recordId || t.id) === String(selectedCompanyId)) || null, [selectedCompanyId, tenants]);
  const currentUserName = useMemo(() => currentUser?.fullName || currentUser?.name || currentUser?.displayName || 'Sales Team', [currentUser]);

  useEffect(() => {
    if (!scopedCompanyId) return;
    setMode("tenant");
    setSelectedCompanyId(scopedCompanyId);
  }, [scopedCompanyId]);

  useEffect(() => {
    if (scopedFloor) setSelectedFloor(scopedFloor);
    if (scopedWing) setSelectedWing(scopedWing);
    if (scopedSeatIds.length > 0) { setSelectedIds(scopedSeatIds); setPrimaryId(scopedSeatIds[scopedSeatIds.length - 1] || ""); }
  }, [scopedFloor, scopedSeatIds, scopedWing, searchParamsKey]);

  useEffect(() => {
    if (scopedSeatIds.length === 0) { setSelectedIds([]); setPrimaryId(""); }
  }, [scopedSeatIds.length]);

  const floorResources = useMemo(() => buildingResources.filter((r) => r.floor === selectedFloor), [buildingResources, selectedFloor]);
  const filtered = useMemo(() => floorResources.filter((r) => {
    if (selectedWing !== "All" && r.wing && r.wing !== selectedWing) return false;
    if (!matchesSearch(r, query)) return false;
    if (mode === "tenant" && r.assignmentType === "department") return false;
    if (mode === "department" && r.assignmentType === "tenant") return false;
    return true;
  }), [floorResources, mode, query, selectedWing]);

  const bookingOnly = useMemo(() => filtered.filter((r) => bookingOnlyCats.has(r.resourceCategory)), [filtered]);
  const desks = useMemo(() => filtered.filter((r) => deskCats.has(r.resourceCategory)), [filtered]);
  const wingGroups = useMemo(() => {
    const grouped = { A: [], B: [] };
    desks.forEach((r) => { (r.wing === "B" ? grouped.B : grouped.A).push(r); });
    grouped.A.sort((a, b) => String(a.name || a.resourceCode || "").localeCompare(String(b.name || b.resourceCode || "")));
    grouped.B.sort((a, b) => String(a.name || a.resourceCode || "").localeCompare(String(b.name || b.resourceCode || "")));
    return grouped;
  }, [desks]);

  const tabVisibleResources = useMemo(() => desks.filter((r) => { if (mode === "tenant") return r.assignmentType !== "department"; return r.assignmentType !== "tenant"; }), [desks, mode]);
  const tabAssignedResources = useMemo(() => tabVisibleResources.filter((r) => r.assignmentType === mode), [mode, tabVisibleResources]);
  const tabAvailableResources = useMemo(() => tabVisibleResources.filter((r) => !r.assignmentLabel && r.status === "Active"), [tabVisibleResources]);
  const tabAssignedGroups = useMemo(() => buildResourceAreaGroups(tabAssignedResources), [tabAssignedResources]);
  const tabAvailableGroups = useMemo(() => buildResourceAreaGroups(tabAvailableResources), [tabAvailableResources]);

  const selectedResources = useMemo(() => resources.filter((r) => selectedIds.includes(String(r.recordId || r.id))), [resources, selectedIds]);
  const assignableResources = useMemo(() => selectedResources.filter((r) => deskCats.has(r.resourceCategory)), [selectedResources]);
  const selectedSeatCount = useMemo(() => assignableResources.reduce((sum, r) => sum + Math.max(1, Number(r.capacity || 1)), 0), [assignableResources]);
  const assignableResourceIds = useMemo(() => assignableResources.map((r) => String(r.recordId || r.id)).filter(Boolean), [assignableResources]);
  const selectedAreaGroups = useMemo(() => buildResourceAreaGroups(assignableResources), [assignableResources]);
  const primary = assignableResources.find((r) => String(r.recordId) === String(primaryId)) || assignableResources[0] || null;

  const floorStats = useMemo(() => {
    const scope = desks;
    return { total: scope.length, available: scope.filter((r) => !r.assignmentLabel && r.status === "Active").length, tenantAssigned: scope.filter((r) => r.assignmentType === "tenant").length, departmentAssigned: scope.filter((r) => r.assignmentType === "department").length, assigned: scope.filter((r) => Boolean(r.assignmentLabel)).length, bookingOnly: bookingOnly.length };
  }, [bookingOnly.length, desks]);

  const floorCards = useMemo(() => availableFloors.map((floor) => {
    const items = buildingResources.filter((r) => r.floor === floor);
    const deskItems = items.filter((r) => deskCats.has(r.resourceCategory));
    return { floor, open: deskItems.filter((r) => !r.assignmentLabel && r.status === "Active").length, tenantAssigned: deskItems.filter((r) => r.assignmentType === "tenant").length, departmentAssigned: deskItems.filter((r) => r.assignmentType === "department").length, assigned: deskItems.filter((r) => Boolean(r.assignmentLabel)).length };
  }), [availableFloors, buildingResources]);

  const scopeLabel = mode === "tenant" ? "Tenant" : "Department";
  const scopeTotalCount = tabVisibleResources.length;
  const scopeAssignedCount = tabAssignedResources.length;
  const scopeAvailableCount = tabAvailableResources.length;
  const scopeUtilizationPct = scopeTotalCount > 0 ? Math.round((scopeAssignedCount / scopeTotalCount) * 100) : 0;
  const exportScopeLabel = mode === 'tenant' ? 'Tenant' : 'Department';

  const canOpenAssignModal = assignableResourceIds.length > 0 && !saving;
  const canSave = canOpenAssignModal && (mode === "department" ? Boolean(String(selectedDepartmentId || "").trim()) : Boolean(selectedCompanyId));

  const handleExportArchitectureReport = async (format = 'PDF') => {
    const reportFormat = String(format).toLowerCase() === 'excel' ? 'Excel' : 'PDF';
    if (tabVisibleResources.length === 0 && tabAvailableResources.length === 0) { toast.error('There is no architecture data to export for this tab.'); return; }
    setIsExportingReport(reportFormat);
    try {
      const response = await createReport({
        title: `Sales Architecture - ${exportScopeLabel}`, department: 'Sales & CRM', category: 'Other', dataWindow: 'Custom',
        reportMonth: new Date().toISOString().slice(0, 7), period: `${exportScopeLabel} Architecture`, generatedBy: currentUserName,
        format: reportFormat, description: `${exportScopeLabel} architecture report showing assigned spaces and available spaces for the current floor view.`,
        sourceType: 'department-roster', sourceRef: `sales-architecture-${mode}`,
        reportRows: buildArchitectureExportRows({ mode, building: selectedBuilding, floor: selectedFloor, wing: selectedWing, assignedResources: tabAssignedResources, availableResources: tabAvailableResources, searchQuery: query }),
        monthlyData: [],
      });
      if (reportFormat === 'PDF') await downloadReportFile(response?.data?.download, { openInNewTab: false });
      const createdReportId = response?.data?.report?.recordId;
      window.dispatchEvent(new Event('reports:refresh'));
      toast.success(reportFormat === 'PDF' ? 'Architecture report saved to Reports.' : 'Architecture report saved to Reports. Preview it before downloading.');
      navigate(createdReportId ? `/dashboard/sales-crm/report?reportId=${createdReportId}` : '/dashboard/sales-crm/report');
    } catch (exportError) { toast.error(exportError?.message || 'Unable to export architecture report.'); }
    finally { setIsExportingReport(''); }
  };

  const clearSelection = () => { setSelectedIds([]); setPrimaryId(""); };
  const selectFloor = (floor) => { setSelectedFloor(floor); setSelectedWing("All"); clearSelection(); };
  const toggleResource = (r) => {
    if (r.status !== "Active" || !deskCats.has(r.resourceCategory)) return;
    const id = String(r.recordId || r.id);
    setSelectedIds((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      setPrimaryId(next[next.length - 1] || "");
      return next;
    });
  };

  const saveSelection = async () => {
    if (!canSave) return;
    setSaving(true); setError("");
    const targetIds = assignableResourceIds;
    const payload = mode === "tenant"
      ? { assignmentType: "tenant", tenantCompanyId: selectedCompany?.recordId || selectedCompany?.id || "", tenantCompanyName: selectedCompany?.companyName || selectedCompany?.name || "" }
      : { assignmentType: "department", departmentId: String(selectedDepartment?.id || selectedDepartment?.name || selectedDepartmentId || "").trim(), departmentName: String(selectedDepartment?.name || selectedDepartmentId || "").trim() };
    try {
      const updated = [];
      for (const resourceId of targetIds) {
        const res = await assignResource(resourceId, payload);
        if (res?.data?.resource) updated.push(normalizeResource(res.data.resource));
      }
      if (updated.length) setResources((current) => current.map((r) => updated.find((x) => String(x.recordId) === String(r.recordId)) || r));
      clearSelection(); setIsAssignModalOpen(false);
    } catch (e) { setError(e.message || "Unable to save resource assignment."); }
    finally { setSaving(false); }
  };

  const releaseSelection = async () => {
    if (!assignableResourceIds.length) return;
    setSaving(true); setError("");
    try {
      const updated = [];
      for (const resourceId of assignableResourceIds) {
        const res = await releaseResourceAssignment(resourceId);
        if (res?.data?.resource) updated.push(normalizeResource(res.data.resource));
      }
      if (updated.length) setResources((current) => current.map((r) => updated.find((x) => String(x.recordId) === String(r.recordId)) || r));
      clearSelection();
    } catch (e) { setError(e.message || "Unable to release resource assignment."); }
    finally { setSaving(false); }
  };

  if (loading) return <CardsGridSkeleton count={6} />;

  const utilizationPct = floorStats.total > 0 ? Math.round((floorStats.assigned / floorStats.total) * 100) : 0;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
      <div className="mb-3 flex flex-col md:flex-row md:items-end justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
            Workspace Architecture
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-1">Live map of tenant and department space allocations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportArchitectureReport('PDF')}
                    disabled={isExportingReport === 'PDF' || isExportingReport === 'Excel'}
                    className="px-4 py-2.5 bg-white text-[#e01313] rounded-xl font-black text-[10px] border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FileDown size={15} /> 
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportArchitectureReport('Excel')}
                    disabled={isExportingReport === 'PDF' || isExportingReport === 'Excel'}
                    className="px-4 py-2.5 bg-[#ffffff] text-[#1fd628] rounded-xl font-black text-[10px] border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FileSpreadsheet size={15} /> 
                  </button>
          </div>
        </div>
      {error && (
        <div className="mb-3 rounded-[2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm shrink-0">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={16} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Architecture error</p>
              <p className="mt-0.5 text-[12px] font-semibold">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3 shrink-0">
        {[
          { icon: LayoutGrid, label: "Total Spaces", value: floorStats.total, color: "text-slate-900", bg: "bg-slate-50 text-slate-600" },
          { icon: MapIcon, label: "Open", value: floorStats.available, color: "text-emerald-600", bg: "bg-emerald-50 text-emerald-600" },
          { icon: Building2, label: "Tenant", value: floorStats.tenantAssigned, color: "text-indigo-600", bg: "bg-indigo-50 text-indigo-600" },
          { icon: Users, label: "Department", value: floorStats.departmentAssigned, color: "text-amber-600", bg: "bg-amber-50 text-amber-600" },
          { icon: Presentation, label: "Booking Only", value: floorStats.bookingOnly, color: "text-fuchsia-600", bg: "bg-fuchsia-50 text-fuchsia-600" },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-white p-2.5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
              <p className={`text-[15px] font-black ${color}`}>{value}</p>
            </div>
            <div className={`p-2 rounded-2xl ${bg}`}><Icon size={16}/></div>
          </div>
        ))}
      </div>

      <div className="mb-3 bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 shrink-0">
        <div className="flex flex-col gap-2 w-full lg:flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Building2 size={13} className="text-blue-600" />
              <select value={selectedBuilding} onChange={(e) => { setSelectedBuilding(e.target.value); setSelectedWing("All"); clearSelection(); }}
                className="bg-transparent text-[12px] font-bold text-slate-900 outline-none cursor-pointer"
              >{availableBuildings.map((b) => <option key={b} value={b}>{b}</option>)}</select>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {floorCards.map((f) => (
                <button key={f.floor} type="button" onClick={() => selectFloor(f.floor)}
                  className={`rounded-xl border px-3 py-2 text-left transition-all ${selectedFloor === f.floor ? "border-blue-600 bg-blue-50 shadow-sm" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}
                >
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Floor</p>
                  <p className={`text-[13px] font-black ${selectedFloor === f.floor ? "text-blue-600" : "text-slate-700"}`}>{f.floor}</p>
                  <p className="text-[9px] font-bold text-slate-400">{f.open} open {f.tenantAssigned} tenant</p>
                </button>
              ))}
            </div>
            <div className="flex bg-slate-100 p-0.5 rounded-lg">
              {['All', ...wings].map((wing) => (
                <button key={wing} type="button" onClick={() => setSelectedWing(wing)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${selectedWing === wing ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >{wing === "All" ? "All" : `Wing ${wing}`}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 self-start">
              <button type="button" onClick={() => { setMode("tenant"); setSelectedDepartmentId(""); clearSelection(); }}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${mode === "tenant" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >Tenant</button>
              <button type="button" onClick={() => { setMode("department"); setSelectedCompanyId(""); clearSelection(); }}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${mode === "department" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >Department</button>
            </div>
            <div className="flex bg-slate-100 p-0.5 rounded-lg self-start">
              <button type="button" onClick={() => setViewMode("map")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${viewMode === "map" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              ><MapIcon size={12} /> Visual Map</button>
              <button type="button" onClick={() => setViewMode("dashboard")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${viewMode === "dashboard" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              ><PieChart size={12} /> Dashboard</button>
            </div>
          </div>
        </div>
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input type="text" placeholder="Search space, location"
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {viewMode === "map" && (
        <div className="space-y-3 flex-1">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 flex flex-col">
            <div className="mb-3 flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <MapIcon size={18} className="text-blue-600" />
                <h2 className="text-[15px] font-black text-slate-900">{selectedBuilding} Floor {selectedFloor}</h2>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{mode === "tenant" ? "Tenant view" : "Department view"} {selectedSeatCount} seats selected</span>
                <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                  {[
                    { bg: "bg-white border-green-400", label: "Available" },
                    { bg: "bg-indigo-100 border-indigo-400", label: "Tenant" },
                    { bg: "bg-amber-50 border-amber-400", label: "Department" },
                    { bg: "bg-fuchsia-100 border-fuchsia-300", label: "Booking only" },
                  ].map(({ bg, label }) => (
                    <div key={label} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-sm border ${bg}`} />
                      <span className="text-[9px] font-bold text-slate-500">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {bookingOnly.length > 0 && (
              <div className="mb-4 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Booking only rooms</p>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {bookingOnly.map((r) => {
                    const id = String(r.recordId || r.id);
                    return <SpaceCard key={id} resource={r} selected={selectedIds.includes(id)} disabled onToggle={toggleResource} />;
                  })}
                </div>
              </div>
            )}

            <div className="space-y-6 flex-1 overflow-y-auto">
              {(["A", "B"].filter((wing) => selectedWing === "All" || selectedWing === wing)).map((wing) => {
                const items = wingGroups[wing] || [];
                return (
                  <section key={wing}>
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Wing {wing}</p>
                        <h3 className="mt-0.5 text-[15px] font-black text-slate-900">Desk & Cabin Inventory</h3>
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{items.length} spaces</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {items.length > 0 ? items.map((r) => {
                        const id = String(r.recordId || r.id);
                        const selectable = r.status === "Active";
                        return <SpaceCard key={id} resource={r} selected={selectedIds.includes(id)} disabled={!selectable} onToggle={toggleResource} />;
                      }) : (
                        <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-[12px] font-medium text-slate-500 md:col-span-2 xl:col-span-3">
                          No desk inventory mapped to Wing {wing} on Floor {selectedFloor}.
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-3 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Building2 size={12} /> {mode === "tenant" ? "Tenant assignments and availability" : "Department assignments and availability"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={clearSelection} disabled={assignableResourceIds.length === 0}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                >Clear Selection</button>
                <button type="button" onClick={() => { if (canOpenAssignModal) setIsAssignModalOpen(true); }} disabled={!canOpenAssignModal}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >Assign Space <ArrowRight size={13} /></button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              <section className="rounded-[2rem] border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{mode === "tenant" ? "Assigned to Tenant" : "Assigned to Department"}</p>
                    <h3 className="mt-0.5 text-[15px] font-black text-slate-900">{tabAssignedResources.length} spaces</h3>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500 shadow-sm">{selectedBuilding}</span>
                </div>
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
                  {tabAssignedGroups.length > 0 ? tabAssignedGroups.map((group) => (
                    <div key={`${group.label}-${group.floor}-${group.wing}`} className="rounded-xl border border-white bg-white p-2.5 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.label}</p>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-600">{group.seatCount} seats</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {group.seats.map((resource) => (
                          <div key={resource.recordId || resource.id} className="flex flex-wrap gap-1.5">
                            {getSeatLabels(resource).map((seatLabel) => (
                              <span key={`${resource.recordId || resource.id}-${seatLabel}`} className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-indigo-700">{seatLabel}</span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-[12px] font-medium text-slate-500">No {mode === "tenant" ? "tenant" : "department"} assignment in this scope.</div>
                  )}
                </div>
              </section>
              <section className="rounded-[2rem] border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{mode === "tenant" ? "Available in Tenant" : "Available in Department"}</p>
                    <h3 className="mt-0.5 text-[15px] font-black text-slate-900">{tabAvailableResources.length} spaces</h3>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-600 shadow-sm">Ready</span>
                </div>
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
                  {tabAvailableGroups.length > 0 ? tabAvailableGroups.map((group) => (
                    <div key={`${group.label}-${group.floor}-${group.wing}`} className="rounded-xl border border-white bg-white p-2.5 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.label}</p>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-600">{group.seatCount} seats</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {group.seats.map((resource) => (
                          <div key={resource.recordId || resource.id} className="flex flex-wrap gap-1.5">
                            {getSeatLabels(resource).map((seatLabel) => (
                              <span key={`${resource.recordId || resource.id}-${seatLabel}`} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-700">{seatLabel}</span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-[12px] font-medium text-slate-500">No available areas in this scope.</div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {viewMode === "dashboard" && (
        <div className="space-y-3 mt-1">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">{scopeLabel} Dashboard</p>
            <h2 className="mt-0.5 text-[15px] font-black text-slate-900">{selectedBuilding} Floor {selectedFloor}</h2>
            <p className="mt-1.5 text-[12px] font-medium text-slate-500">Showing assigned and available areas for {scopeLabel.toLowerCase()} scope only.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">{scopeLabel} Inventory</p>
              <p className="text-3xl font-black text-slate-900">{scopeTotalCount}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-[2rem] shadow-sm text-white flex flex-col justify-between">
              <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mb-3">Available in {scopeLabel}</p>
              <p className="text-3xl font-black text-white">{scopeAvailableCount}</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 rounded-[2rem] shadow-sm text-white flex flex-col justify-between">
              <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mb-3">Assigned to {scopeLabel}</p>
              <p className="text-3xl font-black text-white">{scopeAssignedCount}</p>
            </div>
            <div className="bg-gradient-to-br from-fuchsia-600 to-fuchsia-700 p-5 rounded-[2rem] shadow-sm text-white flex flex-col justify-between">
              <p className="text-[10px] font-bold text-fuchsia-200 uppercase tracking-widest mb-3">Booking Rooms</p>
              <p className="text-3xl font-black text-white">{floorStats.bookingOnly}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {floorCards.map((f) => (
              <button key={f.floor} type="button" onClick={() => { selectFloor(f.floor); setViewMode("map"); }}
                className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Floor</p><p className="text-xl font-black text-slate-900">{f.floor}</p></div>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${selectedFloor === f.floor ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400"}`}><LayoutGrid size={18} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-emerald-50 p-2.5"><p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">Open</p><p className="text-[15px] font-black text-emerald-700">{f.open}</p></div>
                  <div className="rounded-xl bg-indigo-50 p-2.5"><p className="text-[9px] font-bold uppercase tracking-widest text-indigo-400">Assigned</p><p className="text-[15px] font-black text-indigo-700">{f.assigned}</p></div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600">View Floor Map <ArrowRight size={13} /></div>
              </button>
            ))}
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center py-10 text-center">
            <LayoutGrid size={40} className="text-slate-200 mb-3" />
            <h3 className="text-[15px] font-black text-slate-900">{scopeLabel} Inventory Health Floor {selectedFloor}</h3>
            <p className="text-[12px] font-medium text-slate-500 mt-1.5 max-w-md mx-auto">
              Current utilization is <span className="font-black text-blue-600">{scopeUtilizationPct}%</span>. Use the Visual Map to locate available clusters for this scope.
            </p>
            <button onClick={() => setViewMode("map")} className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-[10px] hover:bg-blue-100 transition-all flex items-center gap-1.5">
              Open Visual Map <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {isAssignModalOpen && assignableResourceIds.length > 0 && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-blue-600 text-white flex justify-between items-center">
              <div>
                <h2 className="text-[15px] font-black flex items-center gap-1.5"><Building2 size={18} /> Assign to {mode === "tenant" ? "Tenant" : "Department"}</h2>
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-0.5">
                  Allocating: {selectedSeatCount} seat{selectedSeatCount !== 1 ? "s" : ""} Floor {selectedFloor}
                </p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center hover:bg-red-500 transition-all"><X size={14} /></button>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 max-h-32 overflow-y-auto space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Selected Spaces</p>
                {assignableResources.map((r) => (
                  <div key={r.recordId || r.id} className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-3 py-1.5">
                    <span className="text-[12px] font-bold text-slate-900">{r.name || r.resourceCode}</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase">{kindLabel(r)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{mode === "tenant" ? "Select Tenant Company *" : "Department Name *"}</label>
                {mode === "tenant" ? (
                  <select required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
                    value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)}
                  >
                    <option value="">-- Choose Tenant --</option>
                    {tenants.map((t) => <option key={t.recordId || t.id} value={t.recordId || t.id}>{t.companyName || t.name}</option>)}
                  </select>
                ) : (
                  <select required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
                    value={selectedDepartmentId} onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  >
                    <option value="">-- Choose Department --</option>
                    {availableDepartments.length > 0 ? availableDepartments.map((d) => (
                      <option key={d.id || d.name} value={d.id || d.name}>{d.name}{d.employeeCount ? ` (${d.employeeCount})` : ""}</option>
                    )) : <option value="" disabled>No departments available</option>}
                  </select>
                )}
              </div>
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsAssignModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all text-[10px]"
                >CANCEL</button>
                <button type="button" onClick={saveSelection} disabled={!canSave}
                  className="flex-[2] py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-sm hover:bg-blue-700 transition-all text-[10px] flex items-center justify-center gap-1.5 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
                >{saving ? "Saving..." : <><CheckCircle2 size={14} /> CONFIRM ALLOCATION</>}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      </PageFrame>
    </div>
  );
}
