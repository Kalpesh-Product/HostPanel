// @ts-nocheck
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  AlertTriangle, ArrowRight, Building2, CheckCircle2,
  FileDown, FileSpreadsheet, LayoutGrid, Map as MapIcon, Monitor, PieChart,
  Presentation, Search, Users, X, Building, CreditCard,
  CalendarClock, Clock, AlertCircle, Briefcase, Wrench, Eye, XCircle,
  DoorOpen, MoveRight, RotateCcw, Filter, Lock
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
  } catch { return null; }
};

const floors = ["501", "601", "701"];
const wings = ["A", "B"];
const defaultBuilding = "Sunteck Kanaka";
const deskCats = new Set(["open_desk", "cabin_desk"]);
const bookingOnlyCats = new Set(["meeting_room", "conference_room", "virtual_office"]);

const money = (v = 0) => `Rs ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(v || 0))}`;
const locStr = (r = {}) => [r.floor, r.wing].filter(Boolean).join(" ").trim();
const buildingLabelFor = (r = {}) => String(r.buildingName || r.building || r.buildingLabel || "").trim();

const normalizeDepartmentOptions = (departments = []) => {
  const merged = new Map();
  for (const d of departments) {
    const name = String(typeof d === "string" ? d : d?.name || d?.departmentName || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const cur = merged.get(key) || { id: name, name, description: "", color: "", managerName: "", managerUserId: null, isActive: true };
    merged.set(key, {
      id: String((typeof d === "string" ? name : d?.id || d?._id || cur.id) || cur.id).trim(),
      name, description: cur.description || String(d?.description || "").trim(),
      color: cur.color || String(d?.color || "").trim(),
      managerName: cur.managerName || String(d?.managerName || d?.headOfDept || "").trim(),
      managerUserId: cur.managerUserId || d?.managerUserId || null,
      isActive: cur.isActive !== false && d?.isActive !== false,
    });
  }
  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
};

const buildResourceAreaGroups = (items = []) => {
  const grouped = items.reduce((acc, r) => {
    const label = String(r.locationLabel || [r.floor, r.wing].filter(Boolean).join(" ").trim() || "Unassigned").trim();
    const key = label.toUpperCase().replace(/[\s_-]+/g, "");
    if (!acc[key]) acc[key] = { label, floor: String(r.floor || "").trim(), wing: String(r.wing || "").trim().toUpperCase(), seats: [], seatCount: 0 };
    acc[key].seats.push(r);
    acc[key].seatCount += Math.max(1, Number(r.capacity || 1));
    return acc;
  }, {});
  return Object.values(grouped).sort((a, b) => {
    const fc = String(a.floor || "").localeCompare(String(b.floor || ""), undefined, { numeric: true });
    return fc !== 0 ? fc : String(a.wing || "").localeCompare(String(b.wing || ""), undefined, { numeric: true });
  });
};

const getSeatLabels = (r = {}) => {
  const labels = Array.isArray(r.seatLabels) ? r.seatLabels.filter(Boolean) : [];
  if (labels.length > 0) return labels;
  const cap = Math.max(0, Number(r.capacity || 0));
  if (cap <= 0) return [];
  const prefix = r.resourceCategory === "cabin_desk" ? "CDS" : r.resourceCategory === "open_desk" ? "ODS" : "S";
  return Array.from({ length: cap }, (_, i) => `${prefix}${i + 1}`);
};

const kindLabel = (r = {}) =>
  r.resourceCategory === "open_desk" ? "Open Desk" :
  r.resourceCategory === "cabin_desk" ? "Cabin Desk" :
  r.resourceCategory === "meeting_room" ? "Meeting Room" :
  r.resourceCategory === "conference_room" ? "Conference Room" :
  r.resourceCategory === "virtual_office" ? "Virtual Office" : (r.type || "Space");

const iconFor = (r = {}) =>
  r.resourceCategory === "meeting_room" ? <Users size={18} /> :
  r.resourceCategory === "conference_room" ? <Presentation size={18} /> :
  r.resourceCategory === "virtual_office" ? <Building2 size={18} /> :
  r.resourceCategory === "cabin_desk" ? <Building2 size={18} /> :
  <Monitor size={18} />;

const toneFor = (r = {}, isPackageLocked = false) => {
  if (r.status === "Under Maintenance") return ["bg-slate-200 border-slate-400 text-slate-600", "bg-slate-100 border-slate-300", "Maintenance", "text-slate-500"];
  if (r.status === "Disabled") return ["bg-slate-100 border-slate-200 text-slate-500", "bg-slate-50 border-slate-200", "Disabled", "text-slate-500"];
  if (isPackageLocked) return ["bg-indigo-50 border-indigo-200 border-dashed text-indigo-700", "bg-indigo-50 border-indigo-300", r.assignedTenantCompanyName || "Package", "text-indigo-600"];
  if (r.assignmentType === "tenant") return ["bg-indigo-50 border-indigo-200 text-indigo-700", "bg-indigo-50 border-indigo-300", r.assignedTenantCompanyName || "Tenant", "text-indigo-600"];
  if (r.assignmentType === "department") return ["bg-amber-50 border-amber-200 text-amber-700", "bg-amber-50 border-amber-300", r.assignedDepartmentName || "Department", "text-amber-600"];
  if (bookingOnlyCats.has(r.resourceCategory)) return ["bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700", "bg-fuchsia-50 border-fuchsia-200", "Booking", "text-fuchsia-600"];
  return ["bg-emerald-50 border-emerald-200 text-emerald-700", "bg-green-50 border-green-300", "Available", "text-emerald-600"];
};

const matchesSearch = (r = {}, q = "") => {
  const s = String(q || "").trim().toLowerCase();
  if (!s) return true;
  return [r.resourceCode, r.name, r.type, r.resourceCategory, r.floor, r.wing, r.locationLabel,
    r.assignmentLabel, r.assignedTenantCompanyName, r.assignedDepartmentName]
    .filter(Boolean).some((v) => String(v).toLowerCase().includes(s));
};

function deriveType(cat = "") {
  if (cat === "open_desk") return "Open Desk";
  if (cat === "cabin_desk") return "Cabin Desk";
  if (cat === "conference_room") return "Conference Room";
  if (cat === "virtual_office") return "Virtual Office";
  return "Meeting Room";
}

function normalizeResource(r = {}) {
  const floor = String(r.floor || "").trim() || floors[0];
  const wing = String(r.wing || "").trim().toUpperCase();
  const assignmentLabel = r.assignmentLabel || r.assignedTenantCompanyName || r.assignedDepartmentName || "";
  const assignmentType = r.assignmentType || (r.assignedTenantCompanyId ? "tenant" : r.assignedDepartmentName ? "department" : "");
  return {
    ...r,
    recordId: r.recordId || r._id || r.id || r.resourceCode,
    id: r.id || r.resourceCode || "",
    resourceCode: r.resourceCode || r.id || "",
    name: r.name || "",
    type: deriveType(r.resourceCategory) || r.type || "Meeting Room",
    resourceCategory: r.resourceCategory || "",
    inventoryMode: r.inventoryMode || (Number(r.capacity || 1) > 1 ? "area" : "single"),
    buildingName: buildingLabelFor(r), floor, wing,
    locationLabel: r.locationLabel || locStr({ floor, wing }),
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

function buildExportRows({ building = "", floor = "", wing = "All", resources = [], searchQuery = "" }) {
  const rows = [
    { label: "Scope", value: "Sales Architecture" },
    { label: "Building", value: building || "All" },
    { label: "Floor", value: floor || "All" },
    { label: "Wing", value: wing || "All" },
    { label: "Search", value: searchQuery || "All" },
    { label: "Total Spaces", value: String(resources.length) },
  ];
  resources.forEach((r, i) => {
    rows.push({
      label: `${i + 1}. ${r.name || r.resourceCode || "Space"}`,
      value: [
        r.locationLabel ? `Location: ${r.locationLabel}` : "",
        r.resourceCategory ? `Type: ${kindLabel(r)}` : "",
        r.capacity ? `Seats: ${r.capacity}` : "",
        r.assignmentLabel ? `Assigned: ${r.assignmentLabel}` : "Available",
        r.status ? `Status: ${r.status}` : "",
      ].filter(Boolean).join(" | "),
    });
  });
  return rows;
}

function SpaceCard({ resource, selected, disabled, packageLocked, onToggle }) {
  const [badge, card, label] = toneFor(resource, packageLocked);
  const locked = packageLocked || disabled;
  const isAssigned = Boolean(resource.assignmentLabel);
  const assignedTo = resource.assignedTenantCompanyName || resource.assignedDepartmentName || resource.assignmentLabel || "";
  return (
    <button type="button" onClick={() => onToggle(resource)} disabled={locked}
      className={`group flex min-h-36 flex-col justify-between rounded-[1.75rem] border-2 p-3 text-left transition-all ${card} ${selected ? "ring-4 ring-blue-500 shadow-xl shadow-blue-100 scale-[1.02] z-10" : "shadow-sm hover:-translate-y-0.5 hover:shadow-md"} ${locked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-[#0F172A] shadow-sm">{iconFor(resource)}</div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate max-w-[120px]">{resource.name || resource.resourceCode || "Space"}</p>
            <p className="text-[11px] font-bold leading-tight text-slate-800">{kindLabel(resource)}{resource.capacity ? ` · ${resource.capacity} seats` : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {packageLocked && <Lock size={10} className="text-indigo-500" />}
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${badge}`}>{label}</span>
        </div>
      </div>
      <div className="mt-2 rounded-xl bg-white/70 p-2 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-bold text-slate-500">{resource.locationLabel || "--"}</span>
          {resource.seatLabels?.length > 0 && (
            <span className="text-[8px] font-bold text-slate-400">{resource.seatLabels.slice(0, 3).join(", ")}{resource.seatLabels.length > 3 ? ` +${resource.seatLabels.length - 3}` : ""}</span>
          )}
        </div>
        {isAssigned && assignedTo && (
          <div className="flex items-center gap-1">
            <Building2 size={8} className={resource.assignmentType === "tenant" ? "text-indigo-500" : "text-amber-500"} />
            <span className={`text-[9px] font-black truncate max-w-[140px] ${resource.assignmentType === "tenant" ? "text-indigo-700" : "text-amber-700"}`}>{assignedTo}</span>
          </div>
        )}
      </div>
    </button>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 p-2 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-[2rem] border border-slate-100 bg-white p-4">
          <div className="h-4 w-24 bg-slate-100 rounded-xl mb-3" />
          <div className="h-6 w-16 bg-slate-100 rounded-xl mb-2" />
          <div className="h-3 w-32 bg-slate-100 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

const MAIN_TABS = [
  { key: "architecture", label: "Architecture", icon: LayoutGrid },
  { key: "tenants", label: "Tenants", icon: Building2 },
  { key: "departments", label: "Departments", icon: Briefcase },
];

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
  const [selectedFloor, setSelectedFloor] = useState("All");
  const [selectedWing, setSelectedWing] = useState("All");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [primaryId, setPrimaryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [isExporting, setIsExporting] = useState("");
  const [viewMode, setViewMode] = useState("map");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("architecture");
  const [assignMode, setAssignMode] = useState("tenant");
  const [viewTenantId, setViewTenantId] = useState("");
  const [spaceFilter, setSpaceFilter] = useState("all"); // all | available | tenant | department | maintenance

  const scopedCompanyId = searchParams.get("tenantCompanyId") || searchParams.get("companyId") || "";
  const scopedFloor = searchParams.get("floor") || "";
  const scopedWing = searchParams.get("wing") || "";
  const scopedSeatIds = useMemo(() => {
    const raw = searchParams.get("seats") || "";
    return String(raw || "").split(",").map((s) => s.trim()).filter(Boolean);
  }, [searchParams]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [rRes, tRes, oRes] = await Promise.allSettled([
          getResources(), getTenantCompanies(), getOrganizationOverview(axiosPrivate),
        ]);
        if (!alive) return;
        
        const rawResources = rRes.status === "fulfilled" ? (rRes.value?.data?.data?.resources || rRes.value?.data?.resources || []) : [];
        const nextResources = Array.isArray(rawResources) ? rawResources.map(normalizeResource) : [];
        
        const rawTenants = tRes.status === "fulfilled" ? (tRes.value?.data?.data?.tenants || tRes.value?.data?.tenants || []) : [];
        const nextTenants = Array.isArray(rawTenants) ? rawTenants : [];
        
        const storedUser = getStoredUser();
        
        // Robust extraction depending on if axios interceptor unwraps the response
        let oData = null;
        if (oRes.status === "fulfilled") {
          oData = oRes.value?.data?.data || oRes.value?.data || oRes.value;
        } else {
          console.error("Failed to fetch org overview:", oRes.reason);
        }
        
        const apiDepartments = Array.isArray(oData?.departments) ? oData.departments : [];
        const workspaceDepts = Array.isArray(oData?.workspace?.organizationDepartments) ? oData.workspace.organizationDepartments : [];
        
        const nextDepartments = normalizeDepartmentOptions([
          ...apiDepartments,
          ...workspaceDepts,
          ...(Array.isArray(storedUser?.workspace?.organizationDepartments) ? storedUser.workspace.organizationDepartments : []),
          ...(Array.isArray(storedUser?.workspaceMembership?.departments) ? storedUser.workspaceMembership.departments : []),
          ...(Array.isArray(storedUser?.departments) ? storedUser.departments : []),
          ...(Array.isArray(storedUser?.workspace?.departments) ? storedUser.workspace.departments : []),
        ]);
        
        // Fallback if absolutely empty so the user can still assign spaces
        if (nextDepartments.length === 0) {
          nextDepartments.push({ id: "General", name: "General", isActive: true });
        }
        
        setResources(nextResources);
        setTenants(nextTenants);
        setOrganizationDepartments(nextDepartments);
        
        // Do not auto-set floor; default is "All"
      } catch (e) {
        if (alive) setError(e.message || "Failed to load architecture data.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [axiosPrivate]);

  const availableBuildings = useMemo(() => {
    const list = Array.from(new Set(resources.map((r) => buildingLabelFor(r) || defaultBuilding)))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return list.length > 0 ? list : [defaultBuilding];
  }, [resources]);

  useEffect(() => {
    if (!availableBuildings.includes(selectedBuilding))
      setSelectedBuilding(availableBuildings[0] || defaultBuilding);
  }, [availableBuildings, selectedBuilding]);

  const buildingResources = useMemo(() =>
    resources.filter((r) => (buildingLabelFor(r) || defaultBuilding) === selectedBuilding),
    [resources, selectedBuilding]
  );

  const availableFloors = useMemo(() => {
    const list = Array.from(new Set(buildingResources.map((r) => r.floor).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return list.length ? list : floors;
  }, [buildingResources]);

  useEffect(() => {
    if (selectedFloor !== "All" && !availableFloors.includes(selectedFloor)) {
      setSelectedFloor("All");
      setSelectedWing("All");
    }
  }, [availableFloors, selectedFloor]);

  const availableDepartments = useMemo(() => organizationDepartments.filter((d) => d.isActive !== false), [organizationDepartments]);
  const selectedCompany = useMemo(() => tenants.find((t) => String(t.recordId || t.id) === String(selectedCompanyId)) || null, [selectedCompanyId, tenants]);
  const selectedDepartment = useMemo(() => availableDepartments.find((d) => String(d.id || d.name) === String(selectedDepartmentId)) || null, [availableDepartments, selectedDepartmentId]);
  const currentUserName = useMemo(() => currentUser?.fullName || currentUser?.name || currentUser?.displayName || "Sales Team", [currentUser]);

  useEffect(() => {
    if (scopedCompanyId) { setActiveTab("architecture"); setSelectedCompanyId(scopedCompanyId); }
  }, [scopedCompanyId]);

  useEffect(() => {
    if (scopedFloor) setSelectedFloor(scopedFloor);
    if (scopedWing) setSelectedWing(scopedWing);
    if (scopedSeatIds.length > 0) { setSelectedIds(scopedSeatIds); setPrimaryId(scopedSeatIds[scopedSeatIds.length - 1] || ""); }
  }, [scopedFloor, scopedSeatIds, scopedWing]);

  useEffect(() => {
    if (scopedSeatIds.length === 0) { setSelectedIds([]); setPrimaryId(""); }
  }, [scopedSeatIds.length]);

  const floorResources = useMemo(() =>
    selectedFloor === "All" ? buildingResources : buildingResources.filter((r) => r.floor === selectedFloor),
    [buildingResources, selectedFloor]
  );
  const filtered = useMemo(() => floorResources.filter((r) => {
    if (r.status === "Disabled") return false;
    if (selectedWing !== "All" && r.wing && r.wing !== selectedWing) return false;
    if (!matchesSearch(r, query)) return false;
    // status/assignment filter
    if (spaceFilter === "available") return !r.assignmentLabel && r.status === "Active" && !bookingOnlyCats.has(r.resourceCategory);
    if (spaceFilter === "tenant") return r.assignmentType === "tenant";
    if (spaceFilter === "department") return r.assignmentType === "department";
    if (spaceFilter === "maintenance") return r.status === "Under Maintenance";
    if (spaceFilter === "booking") return bookingOnlyCats.has(r.resourceCategory);
    return true;
  }), [floorResources, query, selectedWing, spaceFilter]);

  const bookingOnly = useMemo(() => filtered.filter((r) => bookingOnlyCats.has(r.resourceCategory)), [filtered]);
  const desks = useMemo(() => filtered.filter((r) => deskCats.has(r.resourceCategory)), [filtered]);
  const wingGroups = useMemo(() => {
    const g = { A: [], B: [] };
    desks.forEach((r) => { (r.wing === "B" ? g.B : g.A).push(r); });
    g.A.sort((a, b) => String(a.name || a.resourceCode || "").localeCompare(String(b.name || b.resourceCode || "")));
    g.B.sort((a, b) => String(a.name || a.resourceCode || "").localeCompare(String(b.name || b.resourceCode || "")));
    return g;
  }, [desks]);

  const selectedResources = useMemo(() => resources.filter((r) => selectedIds.includes(String(r.recordId || r.id))), [resources, selectedIds]);
  const assignableResources = useMemo(() => selectedResources.filter((r) => deskCats.has(r.resourceCategory)), [selectedResources]);
  const selectedSeatCount = useMemo(() => assignableResources.reduce((s, r) => s + Math.max(1, Number(r.capacity || 1)), 0), [assignableResources]);
  const assignableIds = useMemo(() => assignableResources.map((r) => String(r.recordId || r.id)).filter(Boolean), [assignableResources]);

  const floorStats = useMemo(() => {
    const s = filtered;
    return {
      total: s.length,
      available: s.filter((r) => !r.assignmentLabel && r.status === "Active" && !bookingOnlyCats.has(r.resourceCategory)).length,
      tenantAssigned: s.filter((r) => r.assignmentType === "tenant").length,
      deptAssigned: s.filter((r) => r.assignmentType === "department").length,
      assigned: s.filter((r) => Boolean(r.assignmentLabel)).length,
      meetingRooms: bookingOnly.length,
      maintenance: s.filter((r) => r.status === "Under Maintenance").length,
    };
  }, [filtered, bookingOnly.length]);

  const floorCards = useMemo(() => availableFloors.map((f) => {
    const items = buildingResources.filter((r) => r.floor === f);
    const d = items.filter((r) => deskCats.has(r.resourceCategory));
    return {
      floor: f,
      open: d.filter((r) => !r.assignmentLabel && r.status === "Active").length,
      tenant: d.filter((r) => r.assignmentType === "tenant").length,
      dept: d.filter((r) => r.assignmentType === "department").length,
    };
  }), [availableFloors, buildingResources]);

  const tabAssignedGroups = useMemo(() => buildResourceAreaGroups(desks.filter((r) => r.assignmentLabel)), [desks]);
  const tabAvailableGroups = useMemo(() => buildResourceAreaGroups(desks.filter((r) => !r.assignmentLabel && r.status === "Active")), [desks]);

  const tenantAssignmentMap = useMemo(() => {
    const map = {};
    resources.filter((r) => r.assignmentType === "tenant").forEach((r) => {
      // Always stringify the ObjectId so the map key is consistent
      const id = String(r.assignedTenantCompanyId || "");
      if (!id) return;
      if (!map[id]) map[id] = { id, name: r.assignedTenantCompanyName || "Unknown", resources: [], seatCount: 0, locationLabels: new Set(), floors: new Set(), wings: new Set() };
      map[id].resources.push(r);
      map[id].seatCount += Math.max(1, Number(r.capacity || 1));
      if (r.locationLabel) map[id].locationLabels.add(r.locationLabel);
      if (r.floor) map[id].floors.add(r.floor);
      if (r.wing) map[id].wings.add(r.wing);
    });
    return Object.values(map);
  }, [resources]);

  const tenantsWithPackages = useMemo(() => {
    return tenants.map((t) => {
      const tid = String(t.recordId || t.id);
      const assignment = tenantAssignmentMap.find((a) => String(a.id) === tid);
      // Support both locationMappings field name variants
      const locationMappings = Array.isArray(t.packageDetails?.locationMappings)
        ? t.packageDetails.locationMappings
        : Array.isArray(t.locationMappings) ? t.locationMappings : [];
      // Support floor/wing or locationFloor/locationWing field names
      const firstMapping = locationMappings[0] || {};
      const pkgFloor = firstMapping.floor || firstMapping.locationFloor || "";
      const pkgWing = firstMapping.wing || firstMapping.locationWing || firstMapping.locationWing || "";
      // Seats from package or from actual assigned resources
      const pkgSeats = locationMappings.reduce((s, m) => s + Number(m.seatsAllocated || m.openDesks || m.cabinDesks || 0), 0);
      return {
        ...t,
        assignment,
        pkgFloor,
        pkgWing,
        pkgSeats: pkgSeats || assignment?.seatCount || 0,
        locationMappings,
      };
    });
  }, [tenants, tenantAssignmentMap]);

  const deptAssignmentMap = useMemo(() => {
    const map = {};
    resources.filter((r) => r.assignmentType === "department").forEach((r) => {
      const name = r.assignedDepartmentName || "Unknown";
      if (!map[name]) map[name] = { name, resources: [], seatCount: 0, locationLabels: new Set() };
      map[name].resources.push(r);
      map[name].seatCount += Math.max(1, Number(r.capacity || 1));
      if (r.locationLabel) map[name].locationLabels.add(r.locationLabel);
    });
    return Object.values(map);
  }, [resources]);

  const unassignedDesks = useMemo(() => desks.filter((r) => !r.assignmentLabel && r.status === "Active"), [desks]);

  const packageLockedIds = useMemo(() => {
    const locked = new Set();
    tenantsWithPackages.forEach((t) => {
      const mappings = t.locationMappings || [];
      if (mappings.length === 0) return;
      const tid = String(t.recordId || t.id);
      if (!tid) return;
      const areas = mappings.map((m) => ({
        floor: String(m.floor || "").trim(),
        wing: String(m.wing || "").trim().toUpperCase(),
      }));
      resources.forEach((r) => {
        if (String(r.assignedTenantCompanyId) !== tid) return;
        const match = areas.some((a) => {
          const fMatch = !a.floor || a.floor === String(r.floor || "").trim();
          const wMatch = !a.wing || a.wing === String(r.wing || "").trim().toUpperCase();
          return fMatch && wMatch;
        });
        if (match) locked.add(String(r.recordId || r.id));
      });
    });
    return locked;
  }, [tenantsWithPackages, resources]);

  const canOpenAssign = assignableIds.length > 0 && !saving;
  const canSave = canOpenAssign && (assignMode === "department" ? Boolean(String(selectedDepartmentId || "").trim()) : Boolean(selectedCompanyId));

  const handleExport = async (fmt = "PDF") => {
    const f = String(fmt).toLowerCase() === "excel" ? "Excel" : "PDF";
    if (filtered.length === 0) { toast.error("No architecture data to export."); return; }
    setIsExporting(f);
    try {
      const response = await createReport({
        title: `Sales Architecture - ${selectedBuilding}`,
        department: "Sales & CRM", category: "Other", dataWindow: "Custom",
        reportMonth: new Date().toISOString().slice(0, 7),
        period: `${selectedBuilding} Floor ${selectedFloor}`,
        generatedBy: currentUserName,
        format: f,
        description: `Architecture report for ${selectedBuilding} Floor ${selectedFloor} ${selectedWing !== "All" ? `Wing ${selectedWing}` : ""}.`,
        sourceType: "department-roster", sourceRef: `sales-architecture`,
        reportRows: buildExportRows({ building: selectedBuilding, floor: selectedFloor, wing: selectedWing, resources: filtered, searchQuery: query }),
        monthlyData: [],
      });
      if (f === "PDF") await downloadReportFile(response?.data?.download, { openInNewTab: false });
      const rid = response?.data?.report?.recordId;
      window.dispatchEvent(new Event("reports:refresh"));
      toast.success("Architecture report saved.");
      navigate(rid ? `/dashboard/sales-crm/report?reportId=${rid}` : "/dashboard/sales-crm/report");
    } catch (e) { toast.error(e?.message || "Export failed."); }
    finally { setIsExporting(""); }
  };

  const clearSelection = () => { setSelectedIds([]); setPrimaryId(""); };
  const selectFloor = (f) => { setSelectedFloor(f); setSelectedWing("All"); clearSelection(); };
  const toggleResource = (r) => {
    if (r.status !== "Active") return;
    if (packageLockedIds.has(String(r.recordId || r.id))) return;
    const id = String(r.recordId || r.id);
    setSelectedIds((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      setPrimaryId(next[next.length - 1] || "");
      return next;
    });
  };

  const saveAssignment = async () => {
    if (!canSave) return;
    setSaving(true); setError("");
    const ids = assignableIds;
    const resource = assignableResources.find((r) => String(r.recordId || r.id) === ids[0]);
    const payload = assignMode === "tenant"
      ? { assignmentType: "tenant", tenantCompanyId: selectedCompany?.recordId || selectedCompany?.id || "", tenantCompanyName: selectedCompany?.companyName || selectedCompany?.name || "" }
      : { assignmentType: "department", departmentId: String(selectedDepartment?.id || selectedDepartment?.name || selectedDepartmentId || "").trim(), departmentName: String(selectedDepartment?.name || selectedDepartmentId || "").trim() };
    try {
      const updated = [];
      for (const rid of ids) {
        const res = await assignResource(rid, payload);
        // Server wraps response in data.data.resource
        const resourceData = res?.data?.data?.resource || res?.data?.resource;
        if (resourceData) updated.push(normalizeResource(resourceData));
      }
      if (updated.length) {
        setResources((cur) => cur.map((r) => updated.find((x) => String(x.recordId) === String(r.recordId)) || r));
      }
      clearSelection(); setIsAssignModalOpen(false);
      toast.success(`${updated.length} space(s) assigned successfully.`);
    } catch (e) { setError(e.message || "Assignment failed."); }
    finally { setSaving(false); }
  };

  const releaseAssignment = async () => {
    if (!assignableIds.length) return;
    setSaving(true); setError("");
    try {
      const updated = [];
      for (const rid of assignableIds) {
        const res = await releaseResourceAssignment(rid);
        const resourceData = res?.data?.data?.resource || res?.data?.resource;
        if (resourceData) updated.push(normalizeResource(resourceData));
      }
      if (updated.length) setResources((cur) => cur.map((r) => updated.find((x) => String(x.recordId) === String(r.recordId)) || r));
      clearSelection();
      toast.success(`${updated.length} space(s) released.`);
    } catch (e) { setError(e.message || "Release failed."); }
    finally { setSaving(false); }
  };

  const usagePct = floorStats.total > 0 ? Math.round((floorStats.assigned / floorStats.total) * 100) : 0;

  if (loading) return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame><CardsSkeleton /></PageFrame>
    </div>
  );

  const renderArchitecture = () => (
    <>
      {error && (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={16} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Error</p>
              <p className="mt-0.5 text-[12px] font-semibold">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-3 sm:px-4 lg:px-5 py-2 border-b border-slate-100/40 bg-white flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
          <Building2 size={13} className="text-blue-600" />
          <select value={selectedBuilding} onChange={(e) => { setSelectedBuilding(e.target.value); setSelectedWing("All"); clearSelection(); }}
            className="bg-transparent text-[12px] font-bold text-slate-900 outline-none cursor-pointer"
          >{availableBuildings.map((b) => <option key={b} value={b}>{b}</option>)}</select>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
          <LayoutGrid size={13} className="text-blue-600" />
          <select value={selectedFloor} onChange={(e) => selectFloor(e.target.value)}
            className="bg-transparent text-[12px] font-bold text-slate-900 outline-none cursor-pointer"
          >
            <option value="All">All Floors</option>
            {floorCards.map((f) => <option key={f.floor} value={f.floor}>Floor {f.floor} ({f.open} open)</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
          <Filter size={13} className="text-blue-600" />
          <select value={selectedWing} onChange={(e) => setSelectedWing(e.target.value)}
            className="bg-transparent text-[12px] font-bold text-slate-900 outline-none cursor-pointer"
          >
            <option value="All">All Wings</option>
            {wings.map((w) => <option key={w} value={w}>Wing {w}</option>)}
          </select>
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            {[
              { key: "all",         label: "All",         dot: "bg-slate-400",   active: "bg-slate-800 text-white border-slate-800",   idle: "bg-white text-slate-600 border-slate-200 hover:border-slate-400" },
              { key: "available",   label: "Available",   dot: "bg-emerald-400", active: "bg-emerald-500 text-white border-emerald-500", idle: "bg-white text-emerald-700 border-emerald-200 hover:border-emerald-400" },
              { key: "tenant",      label: "Tenant",      dot: "bg-indigo-400",  active: "bg-indigo-600 text-white border-indigo-600",  idle: "bg-white text-indigo-700 border-indigo-200 hover:border-indigo-400" },
              { key: "department",  label: "Department",  dot: "bg-amber-400",   active: "bg-amber-500 text-white border-amber-500",    idle: "bg-white text-amber-700 border-amber-200 hover:border-amber-400" },
              { key: "booking",     label: "Booking",     dot: "bg-fuchsia-400", active: "bg-fuchsia-600 text-white border-fuchsia-600", idle: "bg-white text-fuchsia-700 border-fuchsia-200 hover:border-fuchsia-400" },
              { key: "maintenance", label: "Maintenance", dot: "bg-slate-300",   active: "bg-slate-500 text-white border-slate-500",    idle: "bg-white text-slate-500 border-slate-200 hover:border-slate-400" },
            ].map(({ key, label, dot, active, idle }) => (
              <button key={key} type="button" onClick={() => setSpaceFilter(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider transition-all ${
                  spaceFilter === key ? active : idle
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${spaceFilter === key ? "bg-white/70" : dot}`} />
                {label}
              </button>
            ))}
          </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3 shrink-0">
        {[
          { icon: LayoutGrid, label: "Total Spaces", value: floorStats.total, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', iconClass: 'bg-slate-50 text-slate-600' },
          { icon: DoorOpen, label: "Available", value: floorStats.available, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', iconClass: 'bg-emerald-50 text-emerald-600' },
          { icon: Building2, label: "Tenant Assigned", value: floorStats.tenantAssigned, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-indigo-500', iconClass: 'bg-indigo-50 text-indigo-600' },
          { icon: Briefcase, label: "Dept Assigned", value: floorStats.deptAssigned, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500', iconClass: 'bg-amber-50 text-amber-600' },
          { icon: Wrench, label: "Maintenance", value: floorStats.maintenance, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-slate-500', iconClass: 'bg-slate-100 text-slate-600' },
        ].map(({ icon: Icon, label, value, cardClass, iconClass }) => (
          <div key={label} className={cardClass}>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
              <p className="text-[15px] font-pmedium text-primary">{value}</p>
            </div>
            <div className={`p-2 rounded-2xl ${iconClass} shrink-0`}><Icon size={16} /></div>
          </div>
        ))}
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-3 sm:p-4 lg:p-1 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 bg-slate-50/50">
          <div className="flex bg-slate-100/50 p-1 rounded-xl w-full xl:w-auto relative border border-slate-200/50 overflow-x-auto">
            {[
              { key: "map", label: "Floor Map" },
              { key: "dashboard", label: "Dashboard" },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setViewMode(tab.key)}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-[13px] font-bold transition-colors relative z-10 whitespace-nowrap ${viewMode === tab.key ? "text-[#0F172A]" : "text-slate-500 hover:text-slate-800"}`}
              >
                {viewMode === tab.key && <div className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/60 z-[-1]" />}
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input type="text" placeholder="Search space, tenant..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
        </div>

        {viewMode === "map" && (
          <div className="p-3 sm:p-4 lg:p-5 space-y-3 flex-1">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4">
              <div className="mb-3 flex items-center gap-2">
                <MapIcon size={18} className="text-blue-600" />
                <h2 className="text-[15px] font-pmedium text-primary">{selectedBuilding} {selectedFloor === "All" ? "— All Floors" : `Floor ${selectedFloor}`}</h2>
                <span className="ml-auto text-[10px] font-bold text-slate-500">{filtered.length} spaces</span>
              </div>

              {bookingOnly.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Meeting & Conference Rooms</p>
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-3">
                    {bookingOnly.map((r) => {
                      const id = String(r.recordId || r.id);
                      return <SpaceCard key={id} resource={r} selected={selectedIds.includes(id)} packageLocked={packageLockedIds.has(id)} onToggle={toggleResource} />;
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {(["A", "B"].filter((w) => selectedWing === "All" || selectedWing === w)).map((wing) => {
                  const items = wingGroups[wing] || [];
                  return (
                    <section key={wing}>
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Wing {wing}</p>
                          <h3 className="mt-0.5 text-[15px] font-pmedium text-primary">Desks & Cabins</h3>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500">{items.length} spaces</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {items.length > 0 ? items.map((r) => {
                          const id = String(r.recordId || r.id);
                          return <SpaceCard key={id} resource={r} selected={selectedIds.includes(id)} disabled={r.status !== "Active"} packageLocked={packageLockedIds.has(id)} onToggle={toggleResource} />;
                        }) : (
                          <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-[12px] font-medium text-slate-500 md:col-span-2 xl:col-span-3">
                            No desks mapped to Wing {wing} on Floor {selectedFloor}.
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {viewMode === "dashboard" && (
          <div className="p-3 sm:p-4 lg:p-5 space-y-3">
            <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Floor Dashboard</p>
              <h2 className="text-[15px] font-pmedium text-primary">{selectedBuilding} Floor {selectedFloor}</h2>
              <p className="text-[12px] font-medium text-slate-500 mt-1">Utilization: <span className="font-black text-blue-600">{usagePct}%</span> ({floorStats.assigned}/{floorStats.total} seats assigned)</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Floor Inventory</p>
                <p className="text-3xl font-black text-slate-900">{floorStats.total}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-[2rem] shadow-sm text-white">
                <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mb-3">Available</p>
                <p className="text-3xl font-black text-white">{floorStats.available}</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 rounded-[2rem] shadow-sm text-white">
                <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mb-3">Tenant Assigned</p>
                <p className="text-3xl font-black text-white">{floorStats.tenantAssigned}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 rounded-[2rem] shadow-sm text-white">
                <p className="text-[10px] font-bold text-amber-100 uppercase tracking-widest mb-3">Dept Assigned</p>
                <p className="text-3xl font-black text-white">{floorStats.deptAssigned}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {floorCards.map((f) => (
                <button key={f.floor} type="button" onClick={() => { selectFloor(f.floor); setViewMode("map"); }}
                  className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Floor</p>
                      <p className="text-xl font-black text-slate-900">{f.floor}</p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><LayoutGrid size={18} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-emerald-50 p-2"><p className="text-[8px] font-bold uppercase text-emerald-500">Open</p><p className="text-sm font-black text-emerald-700">{f.open}</p></div>
                    <div className="rounded-xl bg-indigo-50 p-2"><p className="text-[8px] font-bold uppercase text-indigo-400">Tenant</p><p className="text-sm font-black text-indigo-700">{f.tenant}</p></div>
                    <div className="rounded-xl bg-amber-50 p-2"><p className="text-[8px] font-bold uppercase text-amber-400">Dept</p><p className="text-sm font-black text-amber-700">{f.dept}</p></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isAssignModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 bg-blue-600 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[15px] font-pmedium flex items-center gap-1.5"><Building2 size={18} /> Assign Space
                </h2>
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-0.5">
                  {assignMode === "tenant" ? "Select available spaces for this tenant" : "Select available spaces for this department"}
                </p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center hover:bg-red-500 transition-all"><X size={14} /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Target Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {assignMode === "tenant" ? "Assign to Tenant Company *" : "Assign to Department *"}
                </label>
                {assignMode === "tenant" ? (
                  <select value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
                  >
                    <option value="">-- Select Tenant Company --</option>
                    {tenants.map((t) => <option key={t.recordId || t.id} value={t.recordId || t.id}>{t.companyName || t.name}</option>)}
                  </select>
                ) : (
                  <select value={selectedDepartmentId} onChange={(e) => setSelectedDepartmentId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
                  >
                    <option value="">-- Select Department --</option>
                    {availableDepartments.map((d) => <option key={d.id || d.name} value={d.id || d.name}>{d.name}</option>)}
                  </select>
                )}
              </div>

              {/* Available space picker — Building/Floor/Wing dropdowns */}
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                  <Building2 size={12} className="text-blue-500" />
                  <select value={selectedBuilding} onChange={(e) => { setSelectedBuilding(e.target.value); setSelectedWing("All"); clearSelection(); }}
                    className="bg-transparent text-[11px] font-bold text-slate-900 outline-none cursor-pointer"
                  >{availableBuildings.map((b) => <option key={b} value={b}>{b}</option>)}</select>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                  <LayoutGrid size={12} className="text-blue-500" />
                  <select value={selectedFloor} onChange={(e) => selectFloor(e.target.value)}
                    className="bg-transparent text-[11px] font-bold text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="All">All Floors</option>
                    {floorCards.map((f) => <option key={f.floor} value={f.floor}>Floor {f.floor} ({f.open} open)</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                  <Filter size={12} className="text-blue-500" />
                  <select value={selectedWing} onChange={(e) => setSelectedWing(e.target.value)}
                    className="bg-transparent text-[11px] font-bold text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="All">All Wings</option>
                    {wings.map((w) => <option key={w} value={w}>Wing {w}</option>)}
                  </select>
                </div>
              </div>

              {/* Available spaces list to pick from */}
              <div className="space-y-1">
                {(() => {
                  const availableDesks = desks.filter((r) => !r.assignmentLabel && r.status === "Active" &&
                    (selectedBuilding === "All" || r.building === selectedBuilding) &&
                    (selectedFloor === "All" || r.floor === selectedFloor) &&
                    (selectedWing === "All" || r.wing === selectedWing)
                  );
                  const openDesks = availableDesks.filter(r => r.resourceCategory === "open_desk");
                  const cabinDesks = availableDesks.filter(r => r.resourceCategory === "cabin_desk");
                  const otherDesks = availableDesks.filter(r => r.resourceCategory !== "open_desk" && r.resourceCategory !== "cabin_desk");

                  const renderGroupCards = (title, items) => {
                    if (!items.length) return null;
                    const groups = buildResourceAreaGroups(items);
                    return (
                      <div className="space-y-1.5 mt-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title} <span className="text-emerald-600">({groups.reduce((s,g)=>s+g.seatCount,0)} seats)</span></p>
                        <div className="grid grid-cols-2 gap-2">
                          {groups.map((g) => {
                            const groupResIds = items.filter((r) => r.locationLabel === g.label || (r.floor === g.floor && r.wing === g.wing)).map((r) => String(r.recordId || r.id));
                            const allSelected = groupResIds.length > 0 && groupResIds.every((id) => selectedIds.includes(id));
                            return (
                              <button key={g.label} type="button"
                                onClick={() => {
                                  setSelectedIds((cur) => {
                                    const next = allSelected ? cur.filter((id) => !groupResIds.includes(id)) : [...new Set([...cur, ...groupResIds])];
                                    setPrimaryId(next[next.length - 1] || "");
                                    return next;
                                  });
                                }}
                                className={`flex flex-col items-start rounded-xl border p-3 transition-all text-left ${
                                  allSelected ? "border-blue-400 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                                }`}
                              >
                                <span className="text-[11px] font-bold text-slate-800 mb-1 line-clamp-1">{g.label}</span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                                  allSelected ? "bg-blue-500 text-white" : "bg-emerald-50 text-emerald-700"
                                }`}>{g.seatCount} seats</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  };

                  if (availableDesks.length === 0) {
                    return <p className="text-center text-[11px] text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl">No available desks matching filters.</p>;
                  }

                  return (
                    <div className="max-h-[30vh] overflow-y-auto pr-2 pb-2">
                      {renderGroupCards("Open Desks", openDesks)}
                      {renderGroupCards("Cabin Desks", cabinDesks)}
                      {renderGroupCards("Other Spaces", otherDesks)}
                    </div>
                  );
                })()}
              </div>

              {/* Selected summary */}
              {assignableIds.length > 0 && (
                <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1.5">Selected ({selectedSeatCount} seats)</p>
                  <div className="flex flex-wrap gap-1">
                    {assignableResources.map((r) => (
                      <span key={r.recordId} className="bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">{r.name || r.resourceCode}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button onClick={() => { setIsAssignModalOpen(false); clearSelection(); }}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all text-[10px]"
                >Cancel</button>
                <button onClick={saveAssignment} disabled={!canSave}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-sm hover:bg-blue-700 transition-all text-[10px] flex items-center justify-center gap-1.5 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >{saving ? "Saving..." : <><CheckCircle2 size={14} /> Confirm Allocation</>}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const renderTenants = () => {
    const viewTenant = viewTenantId ? tenantsWithPackages.find((t) => String(t.recordId || t.id) === viewTenantId) : null;
    const viewTenantResources = viewTenant ? resources.filter((r) => String(r.assignedTenantCompanyId) === viewTenantId) : [];

    const fmt = (n = 0) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(n || 0));
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "--";
    

    return (
      <>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <Building2 size={12} className="text-blue-500" />
            <select value={selectedBuilding} onChange={(e) => { setSelectedBuilding(e.target.value); setSelectedWing("All"); clearSelection(); }}
              className="bg-transparent text-[11px] font-bold text-slate-900 outline-none cursor-pointer"
            >{availableBuildings.map((b) => <option key={b} value={b}>{b}</option>)}</select>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <LayoutGrid size={12} className="text-blue-500" />
            <select value={selectedFloor} onChange={(e) => selectFloor(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-slate-900 outline-none cursor-pointer"
            >
              <option value="All">All Floors</option>
              {floorCards.map((f) => <option key={f.floor} value={f.floor}>Floor {f.floor} ({f.open} open)</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <Filter size={12} className="text-blue-500" />
            <select value={selectedWing} onChange={(e) => setSelectedWing(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-slate-900 outline-none cursor-pointer"
            >
              <option value="All">All Wings</option>
              {wings.map((w) => <option key={w} value={w}>Wing {w}</option>)}
            </select>
          </div>
          {/* <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm">{unassignedDesks.length} desks available to assign</span> */}
        </div>

       

        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {/* Summary stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
          {[
            { icon: Building2, label: "Total Tenants", value: tenants.length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', iconClass: 'bg-slate-50 text-slate-600' },
            { icon: CheckCircle2, label: "Active", value: tenants.filter((t) => String(t.status || "").toLowerCase() === "active").length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', iconClass: 'bg-emerald-50 text-emerald-600' },
            { icon: LayoutGrid, label: "Assigned Spaces", value: resources.filter((r) => r.assignmentType === "tenant").length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-indigo-500', iconClass: 'bg-indigo-50 text-indigo-600' },
            { icon: Users, label: "Total Assigned Seats", value: tenantAssignmentMap.reduce((s, a) => s + a.seatCount, 0), cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500', iconClass: 'bg-blue-50 text-blue-600' },
          ].map(({ icon: Icon, label, value, cardClass, iconClass }) => (
            <div key={label} className={cardClass}>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-[15px] font-black text-slate-900">{value}</p>
              </div>
              <div className={`p-2 rounded-2xl ${iconClass} shrink-0`}><Icon size={16} /></div>
            </div>
          ))}
        </div>

         <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Tenant Space Allocation</h3>
          <button onClick={() => { setAssignMode("tenant"); setSelectedCompanyId(""); clearSelection(); setIsAssignModalOpen(true); }}
            className="bg-[#2563EB] text-white px-4 py-2 rounded-xl font-bold text-[11px] flex items-center gap-1.5 shadow-sm hover:bg-blue-700 transition-all"
          ><ArrowRight size={14} /> Assign Space</button>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                <tr>
                  <th className="px-5 py-4 text-left">Company</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-left">Location</th>
                  <th className="px-5 py-4 text-center">Assigned Seats</th>
                  <th className="px-5 py-4 text-left">Space Blocks</th>
                  <th className="px-5 py-4 text-center">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {tenantsWithPackages.map((t) => {
                  const tid = String(t.recordId || t.id);
                  const assignedResources = resources.filter((r) => String(r.assignedTenantCompanyId) === tid);
                  const assignedSeatCount = assignedResources.reduce((s, r) => s + Math.max(1, Number(r.capacity || 1)), 0);
                  // Location: use companyDetails building/unit, or fall back to actual assigned resource floors/wings
                  const building = t.companyDetails?.buildingName || "";
                  const unit = t.companyDetails?.unitNo || "";
                  const assignedFloors = Array.from(new Set(assignedResources.map((r) => r.floor).filter(Boolean))).sort();
                  const assignedWings = Array.from(new Set(assignedResources.map((r) => r.wing).filter(Boolean))).sort();
                  const locationStr = [building, unit].filter(Boolean).join(" • ") ||
                    (assignedFloors.length ? `Floor ${assignedFloors.join(", ")}${assignedWings.length ? ` Wing ${assignedWings.join("/")}` : ""}` : "");
                  return (
                    <tr key={tid} className={`hover:bg-slate-50/50 transition-colors group ${viewTenantId === tid ? "bg-indigo-50/40" : ""}`}>
                      <td className="px-5 py-4">
                        <p className="text-[13px] font-bold text-slate-900">{t.companyName || t.name}</p>
                        <p className="text-[10px] font-medium text-slate-500">{t.businessType || t.contactName || "--"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                          String(t.status || "").toLowerCase() === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          String(t.status || "").includes("Expir") ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>{t.status || "Active"}</span>
                      </td>
                      <td className="px-5 py-4">
                        {locationStr ? (
                          <span className="text-[12px] font-semibold text-slate-700">{locationStr}</span>
                        ) : (
                          <span className="text-[12px] text-slate-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`text-[15px] font-black ${assignedSeatCount > 0 ? "text-indigo-700" : "text-slate-400"}`}>
                          {assignedSeatCount}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {assignedResources.slice(0, 4).map((r) => (
                            <span key={r.recordId} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[9px] font-bold">
                              {r.name || r.resourceCode}
                            </span>
                          ))}
                          {assignedResources.length > 4 && <span className="text-[9px] text-slate-500">+{assignedResources.length - 4} more</span>}
                          {assignedResources.length === 0 && <span className="text-[11px] text-slate-400">No spaces assigned</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => setViewTenantId(viewTenantId === tid ? "" : tid)}
                            className={`p-1.5 rounded-lg transition-all ${
                              viewTenantId === tid ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700"
                            }`}
                            title="View assignment details"
                          ><Eye size={15} strokeWidth={2.5} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {tenants.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-20 text-slate-400 font-semibold">No tenant companies found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tenant detail modal */}
        {viewTenant && (() => {
          // Compute monthly rent: (openDesks × ratePerOpenDesk + cabinDesks × ratePerCabinDesk) × 30
          // billingDetails.monthlyRent may be 0 if not explicitly saved, so we recalculate from rates
          const DAYS = 30;
          const openDesks   = Number(viewTenant.companyDetails?.openDesks   || viewTenant.packageDetails?.openDesks   || 0);
          const cabinDesks  = Number(viewTenant.companyDetails?.cabinDesks  || viewTenant.packageDetails?.cabinDesks  || 0);
          const rateOpen    = Number(viewTenant.companyDetails?.ratePerOpenDesk  || viewTenant.packageDetails?.ratePerOpenDesk  || 0);
          const rateCabin   = Number(viewTenant.companyDetails?.ratePerCabinDesk || viewTenant.packageDetails?.ratePerCabinDesk || 0);
          const calcMonthly = (openDesks * rateOpen + cabinDesks * rateCabin) * DAYS;
          const monthlyRent = Number(viewTenant.billingDetails?.monthlyRent || 0) || calcMonthly;

          return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0F172A]/70 backdrop-blur-sm" onClick={() => setViewTenantId("")}>
              <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Modal header */}
                <div className="p-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Assignment Details</p>
                      <h3 className="text-[16px] font-black">{viewTenant.companyName || viewTenant.name}</h3>
                    </div>
                  </div>
                  <button onClick={() => setViewTenantId("")}
                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-red-500 transition-all"
                  ><X size={14} /></button>
                </div>

                {/* Modal body - scrollable */}
                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Contract info */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contract Info</p>
                      <div className="space-y-2.5">
                        {[
                          { label: "Contact Person", value: viewTenant.contactName || "--" },
                          { label: "Business Type", value: viewTenant.businessType || "--" },
                          { label: "Start Date", value: fmtDate(viewTenant.contractStart || viewTenant.agreementDetails?.startDate) },
                          { label: "End Date", value: fmtDate(viewTenant.contractEnd || viewTenant.agreementDetails?.endDate) },
                          { label: "Monthly Rent", value: monthlyRent > 0 ? `₹${fmt(monthlyRent)}` : "--" },
                          { label: "Building / Unit", value: [viewTenant.companyDetails?.buildingName, viewTenant.companyDetails?.unitNo].filter(Boolean).join(" / ") || "--" },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between items-start gap-3">
                            <span className="text-[11px] font-medium text-slate-500 shrink-0">{label}</span>
                            <span className="text-[12px] font-bold text-slate-800 text-right">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Package info */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Package Details</p>
                      <div className="space-y-2.5">
                        {[
                          { label: "Package", value: viewTenant.packageDetails?.packageName || viewTenant.planType || "--" },
                          { label: "Open Desks", value: openDesks || "--", highlight: openDesks > 0 },
                          { label: "Rate / Open Desk", value: rateOpen > 0 ? `₹${fmt(rateOpen)}/day` : "--" },
                          { label: "Cabin Desks", value: cabinDesks || "--", highlight: cabinDesks > 0 },
                          { label: "Rate / Cabin Desk", value: rateCabin > 0 ? `₹${fmt(rateCabin)}/day` : "--" },
                          { label: "Monthly Credits", value: viewTenant.packageDetails?.monthlyTotalCredits || viewTenant.creditsAllocated || "--" },
                        ].map(({ label, value, highlight }) => (
                          <div key={label} className="flex justify-between items-start gap-3">
                            <span className="text-[11px] font-medium text-slate-500 shrink-0">{label}</span>
                            <span className={`text-[12px] font-bold text-right ${highlight ? "text-indigo-700" : "text-slate-800"}`}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Assigned spaces */}
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Assigned Space Blocks</p>
                      <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-[9px] font-black">
                        {viewTenantResources.reduce((s, r) => s + Math.max(1, Number(r.capacity || 1)), 0)} total seats
                      </span>
                    </div>
                    {viewTenantResources.length === 0 ? (
                      <p className="text-[12px] text-slate-400 font-medium py-6 text-center">No spaces assigned to this tenant yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {viewTenantResources.map((r) => {
                          const labels = Array.isArray(r.seatLabels) && r.seatLabels.length > 0 ? r.seatLabels : getSeatLabels(r);
                          return (
                            <div key={r.recordId} className="rounded-xl bg-white border border-indigo-100 p-3 shadow-sm">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="min-w-0">
                                  <span className="text-[12px] font-black text-slate-900 truncate block">{r.name || r.resourceCode}</span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">{kindLabel(r)}</span>
                                </div>
                                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg text-[9px] font-black shrink-0 ml-2">{r.capacity} seats</span>
                              </div>
                              <p className="text-[10px] font-medium text-slate-500 mb-2">{r.locationLabel || `Floor ${r.floor}${r.wing ? ` Wing ${r.wing}` : ""}`}</p>
                              {labels.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {labels.map((l) => (
                                    <span key={l} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[8px] font-black">{l}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </>
    );
  };
  const renderDepartmentsTab = () => {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <Building2 size={12} className="text-blue-500" />
            <select value={selectedBuilding} onChange={(e) => { setSelectedBuilding(e.target.value); setSelectedWing("All"); clearSelection(); }}
              className="bg-transparent text-[11px] font-bold text-slate-900 outline-none cursor-pointer"
            >{availableBuildings.map((b) => <option key={b} value={b}>{b}</option>)}</select>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <LayoutGrid size={12} className="text-blue-500" />
            <select value={selectedFloor} onChange={(e) => selectFloor(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-slate-900 outline-none cursor-pointer"
            >
              <option value="All">All Floors</option>
              {floorCards.map((f) => <option key={f.floor} value={f.floor}>Floor {f.floor} ({f.open} open)</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <Filter size={12} className="text-blue-500" />
            <select value={selectedWing} onChange={(e) => setSelectedWing(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-slate-900 outline-none cursor-pointer"
            >
              <option value="All">All Wings</option>
              {wings.map((w) => <option key={w} value={w}>Wing {w}</option>)}
            </select>
          </div>
          {/* <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm">{unassignedDesks.length} desks available to assign</span> */}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
          {[
            { icon: Briefcase, label: "Departments", value: availableDepartments.length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', iconClass: 'bg-slate-50 text-slate-600' },
            { icon: LayoutGrid, label: "Dept Spaces", value: resources.filter((r) => r.assignmentType === "department").length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500', iconClass: 'bg-amber-50 text-amber-600' },
            { icon: DoorOpen, label: "Available Desks", value: unassignedDesks.length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', iconClass: 'bg-emerald-50 text-emerald-600' },
            { icon: Users, label: "Dept Seats", value: deptAssignmentMap.reduce((s, d) => s + d.seatCount, 0), cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500', iconClass: 'bg-blue-50 text-blue-600' },
          ].map(({ icon: Icon, label, value, cardClass, iconClass }) => (
            <div key={label} className={cardClass}>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-[15px] font-pmedium text-primary">{value}</p>
              </div>
              <div className={`p-2 rounded-2xl ${iconClass} shrink-0`}><Icon size={16} /></div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Department Space Allocation</h3>
          <button onClick={() => { setAssignMode("tenant"); setSelectedCompanyId(""); clearSelection(); setIsAssignModalOpen(true); }}
            className="bg-[#2563EB] text-white px-4 py-2 rounded-xl font-bold text-[11px] flex items-center gap-1.5 shadow-sm hover:bg-blue-700 transition-all"
          ><ArrowRight size={14} /> Assign Space</button>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col mt-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                <tr>
                  <th className="px-5 py-4 text-left">Department</th>
                  <th className="px-5 py-4 text-center">Seats</th>
                  <th className="px-5 py-4 text-left">Locations</th>
                  <th className="px-5 py-4 text-center">Spaces</th>
                  <th className="px-5 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {availableDepartments.map((d) => {
                  const assignment = deptAssignmentMap.find((a) => a.name === d.name);
                  const locs = Array.from(assignment?.locationLabels || []);
                  return (
                    <tr key={d.id || d.name} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4">
                        <p className="text-[13px] font-bold text-slate-900">{d.name}</p>
                        {d.managerName && <p className="text-[10px] text-slate-500">Manager: {d.managerName}</p>}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-[15px] font-pmedium text-primary">{assignment?.seatCount || 0}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {locs.slice(0, 3).map((l) => (
                            <span key={l} className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[9px] font-bold">{l}</span>
                          ))}
                          {locs.length > 3 && <span className="text-[9px] text-slate-500">+{locs.length - 3}</span>}
                          {locs.length === 0 && <span className="text-[11px] text-slate-400">No spaces</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-[12px] font-semibold text-slate-700">{assignment?.resources.length || 0}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button onClick={() => {
                          setAssignMode("department");
                          setSelectedDepartmentId(d.id || d.name);
                          clearSelection();
                          setIsAssignModalOpen(true);
                        }}
                          className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-all"
                          title="Assign available spaces to this department"
                        ><ArrowRight size={15} strokeWidth={2.5} /></button>
                      </td>
                    </tr>
                  );
                })}
                {availableDepartments.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-20 text-slate-400 font-semibold">No departments configured.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Sales Architecture
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Visual workspace map with tenant and department seating. Assign and manage space allocations.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
               <button onClick={() => handleExport("PDF")} disabled={!!isExporting}
              className="px-3 py-2.5 bg-white text-red-600 rounded-2xl font-black text-[10px] border border-slate-200 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60"
            ><FileDown size={14} /></button>
            <button onClick={() => handleExport("Excel")} disabled={!!isExporting}
              className="px-3 py-2.5 bg-white text-emerald-600 rounded-2xl font-black text-[10px] border border-slate-200 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60"
            ><FileSpreadsheet size={14} /></button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            {MAIN_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${activeTab === tab.key ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
                ><Icon size={14} /> {tab.label}</button>
              );
            })}
          </div>

          <div className="flex-1 mt-2">
            {activeTab === "architecture" && renderArchitecture()}
            {activeTab === "tenants" && renderTenants()}
            {activeTab === "departments" && renderDepartmentsTab()}
          </div>
        </div>
      </PageFrame>
    </div>
  );
}
