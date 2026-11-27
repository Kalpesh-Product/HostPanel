import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  DoorOpen,
  LayoutGrid,
  Map as MapIcon,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import PageFrame from "@/components/Pages/PageFrame";
import salesBannerImage from "@/assets/sales-dashboard-banner.webp";
import useAxiosPrivate from "@/hooks/useAxiosPrivate";
import { getStoredUser } from "@/lib/auth-session";
import { getOrganizationOverview } from "@/services/organization";
import {
  getResourceSeatAssignments,
  getResources,
} from "@/services/resources";
import { getTenantCompanies } from "@/services/tenant-companies";
import { getVirtualOffices } from "@/services/virtual-offices";
import { getCafeTables } from "@/services/cafe";
import {
  getWorkspacePlan,
  isDepartmentAllowedForPlan,
} from "@/utils/workspacePlanAccess";
import {
  DashboardBanner,
  DashboardSection,
  DashboardStatTile,
} from "../../Administration/AdministrationModuleDashboardShared";
import InsightDonutChart from "../../Dashboard/FrontendDashboard/dashboard/InsightDonutChart";

type ArchitectureRow = Record<string, any>;

type ArchitectureSnapshot = {
  resources: ArchitectureRow[];
  tenants: ArchitectureRow[];
  virtualOffices: ArchitectureRow[];
  departments: ArchitectureRow[];
  tenantSeatAssignments: ArchitectureRow[];
  departmentSeatAssignments: ArchitectureRow[];
};

type ModuleCard = {
  key: string;
  route: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  operational: boolean;
};

const EMPTY_SNAPSHOT: ArchitectureSnapshot = {
  resources: [],
  tenants: [],
  virtualOffices: [],
  departments: [],
  tenantSeatAssignments: [],
  departmentSeatAssignments: [],
};

const BASE_ROUTE =
  "/department-accesses/sales-department/sales-architecture";

const MODULES: ModuleCard[] = [
  {
    key: "architecture",
    route: "architecture",
    title: "Architecture",
    description: "Visual floor map, space allocation, and inventory views",
    icon: LayoutGrid,
    color: "#2563EB",
    operational: false,
  },
  {
    key: "tenants",
    route: "tenants",
    title: "Tenants",
    description: "Tenant companies, contracts, and assigned desk space",
    icon: Building2,
    color: "#7C3AED",
    operational: true,
  },
  {
    key: "virtualOffices",
    route: "virtual-offices",
    title: "Virtual Offices",
    description: "Virtual-office companies and shared space assignments",
    icon: DoorOpen,
    color: "#0D9488",
    operational: true,
  },
  {
    key: "departments",
    route: "departments",
    title: "Departments",
    description: "Internal department desk and seat allocations",
    icon: Briefcase,
    color: "#F59E0B",
    operational: true,
  },
];

const CONTEXTS = {
  all: {
    title: "Sales Architecture",
    description:
      "Visual workspace map across every enabled vertical, with space allocation and inventory visibility.",
    tags: ["Floor Maps", "Inventory", "Tenants", "Departments"],
    categories: null as ReadonlySet<string> | null,
    showOperationalTabs: true,
  },
  coworking: {
    title: "Coworking Architecture",
    description:
      "Visual coworking map with desks, cabins, virtual offices, tenant seating, and department allocations.",
    tags: ["Coworking", "Desks", "Tenants", "Virtual Offices"],
    categories: new Set(["open_desk", "cabin_desk", "virtual_office"]),
    showOperationalTabs: true,
  },
  "meeting-room": {
    title: "Meeting Room Architecture",
    description:
      "Visual meeting-room map with meeting and conference room capacity, location, and availability.",
    tags: ["Meeting Rooms", "Conference Rooms", "Capacity"],
    categories: new Set(["meeting_room", "conference_room"]),
    showOperationalTabs: false,
  },
  cafe: {
    title: "Cafe Architecture",
    description:
      "Visual cafe floor map with table capacity, live order occupancy, and active table availability.",
    tags: ["Cafe", "Tables", "Live Occupancy"],
    categories: new Set(["cafe_table"]),
    showOperationalTabs: false,
  },
  hostel: {
    title: "Hostel Architecture",
    description:
      "Visual hostel inventory map with dorm capacity, bed totals, location, and maintenance status.",
    tags: ["Hostel", "Dorms", "Beds"],
    categories: new Set(["dorm"]),
    showOperationalTabs: false,
  },
  coliving: {
    title: "Co-living Architecture",
    description:
      "Visual co-living inventory map with room capacity, key totals, location, and maintenance status.",
    tags: ["Co-living", "Rooms", "Keys"],
    categories: new Set(["room"]),
    showOperationalTabs: false,
  },
} as const;

const FROM_SECTION_CONTEXT: Record<string, string> = {
  "co-working-management": "coworking",
  "meeting-room-management": "meeting-room",
  cafe: "cafe",
  "cafe-management": "cafe",
  "dorm-management": "hostel",
  "room-management": "coliving",
};

const deskCats = new Set(["open_desk", "cabin_desk"]);
const bookingOnlyCats = new Set(["meeting_room", "conference_room"]);
const voCats = new Set(["virtual_office"]);

const rows = (value: unknown): ArchitectureRow[] =>
  Array.isArray(value) ? (value as ArchitectureRow[]) : [];

const numeric = (value: unknown) =>
  Number(String(value ?? "0").replace(/[^0-9.-]/g, "")) || 0;

const titleCase = (value: unknown, fallback = "Other") =>
  String(value || fallback)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const kindLabel = (resource: ArchitectureRow = {}) => {
  switch (resource.resourceCategory) {
    case "open_desk":
      return "Open Desk";
    case "cabin_desk":
      return "Cabin Desk";
    case "meeting_room":
      return "Meeting Room";
    case "conference_room":
      return "Conference Room";
    case "virtual_office":
      return "Virtual Office";
    case "cafe_table":
      return "Cafe Table";
    case "dorm":
      return "Dorm";
    case "room":
      return "Co-living Room";
    default:
      return String(resource.type || "Space");
  }
};

function normalizeResource(resource: ArchitectureRow = {}): ArchitectureRow {
  const building = String(
    resource.buildingName ||
      resource.building ||
      resource.buildingLabel ||
      resource.location ||
      "",
  ).trim();
  const floor = String(resource.floor || "").trim();
  const wing = String(resource.wing || "").trim().toUpperCase();
  const assignedVirtualOfficeIds = Array.isArray(resource.assignedVirtualOfficeIds)
    ? resource.assignedVirtualOfficeIds.map((id: unknown) => String(id)).filter(Boolean)
    : resource.assignedVirtualOfficeId
      ? [String(resource.assignedVirtualOfficeId)]
      : [];
  const assignmentType =
    resource.assignmentType ||
    (resource.assignedTenantCompanyId
      ? "tenant"
      : assignedVirtualOfficeIds.length
        ? "virtualOffice"
        : resource.assignedDepartmentName
          ? "department"
          : "");
  const assignmentLabel =
    resource.assignmentLabel ||
    resource.assignedTenantCompanyName ||
    resource.assignedVirtualOfficeName ||
    resource.assignedDepartmentName ||
    "";

  return {
    ...resource,
    recordId: String(
      resource.recordId || resource._id || resource.id || resource.resourceCode || "",
    ),
    resourceCategory: String(resource.resourceCategory || ""),
    buildingName: building,
    floor,
    wing,
    locationLabel:
      resource.locationLabel || [floor, wing].filter(Boolean).join(" ").trim() || "Unassigned",
    capacity: Math.max(1, numeric(resource.capacity || 1)),
    status: resource.status || "Active",
    assignmentType,
    assignmentLabel,
    seatSummary: resource.seatSummary || {
      total: Math.max(1, numeric(resource.capacity || 1)),
      assigned: 0,
      assignedToTenant: 0,
      assignedToDepartment: 0,
      vacant: Math.max(1, numeric(resource.capacity || 1)),
    },
  };
}

function normalizeCafeTable(table: ArchitectureRow = {}): ArchitectureRow {
  return normalizeResource({
    ...table,
    recordId: table._id || table.id || table.name,
    resourceCategory: "cafe_table",
    name: table.name || "Cafe Table",
    type: "Cafe Table",
    capacity: numeric(table.seats || 1),
    buildingName: "Cafe",
    floor: "Dining Area",
    wing: "",
    locationLabel: "Dining Area",
    status: table.isActive === false ? "Disabled" : "Active",
    assignmentLabel: table.openOrder ? `Order #${table.openOrder.orderNumber}` : "",
    assignmentType: table.openOrder ? "booking" : "",
    openOrder: table.openOrder || null,
  });
}

function normalizeDepartments(
  sources: ArchitectureRow[][],
  plan: string,
): ArchitectureRow[] {
  const merged = new Map<string, ArchitectureRow>();
  sources.flat().forEach((department) => {
    if (!department || typeof department !== "object") return;
    const name = String(department.name || department.departmentName || "").trim();
    if (!name || /^sales\s*(&|and)?\s*crm$/i.test(name)) return;
    merged.set(name.toLowerCase(), {
      id: department.id || department._id || name,
      name,
      isActive: department.isActive !== false,
    });
  });
  if (merged.size === 0) {
    [
      "HR",
      "Administration",
      "Sales",
      "Finance",
      "Maintenance",
      "Technology",
      "IT",
    ].forEach((name) => merged.set(name.toLowerCase(), { id: name, name, isActive: true }));
  }
  return [...merged.values()]
    .filter(
      (department) =>
        department.isActive &&
        isDepartmentAllowedForPlan(plan as any, department.name),
    )
    .sort((left, right) => String(left.name).localeCompare(String(right.name), undefined, { numeric: true }));
}

function topRows(entries: Array<[string, number]>, limit = 6): Array<[string, number]> {
  return entries
    .filter(([, value]) => value > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit);
}

export default function SalesArchitectureWorkspaceDashboard() {
  const location = useLocation();
  const axiosPrivate = useAxiosPrivate();
  const [snapshot, setSnapshot] = useState<ArchitectureSnapshot>(EMPTY_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const fromSection = String(
    (location.state as Record<string, unknown> | null)?.fromSection || "",
  );
  const requestedContext =
    new URLSearchParams(location.search).get("vertical") ||
    FROM_SECTION_CONTEXT[fromSection] ||
    "all";
  const contextKey = (
    Object.prototype.hasOwnProperty.call(CONTEXTS, requestedContext)
      ? requestedContext
      : "all"
  ) as keyof typeof CONTEXTS;
  const context = CONTEXTS[contextKey];

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError("");

    Promise.allSettled([
      getResources(),
      getTenantCompanies(),
      getOrganizationOverview(axiosPrivate),
      getVirtualOffices({ page: 1, limit: 200 }),
      getResourceSeatAssignments(),
      getCafeTables(),
    ]).then(([resourcesResult, tenantsResult, orgResult, voResult, seatsResult, cafeResult]) => {
      if (cancelled) return;

      const rawResources =
        resourcesResult.status === "fulfilled"
          ? resourcesResult.value?.data?.data?.resources ||
            resourcesResult.value?.data?.resources
          : [];
      const cafePayload =
        cafeResult.status === "fulfilled"
          ? cafeResult.value?.data?.data ?? cafeResult.value?.data ?? []
          : [];
      const resources = [
        ...rows(rawResources).map(normalizeResource),
        ...rows(cafePayload).map(normalizeCafeTable),
      ];

      const orgPayload =
        orgResult.status === "fulfilled"
          ? orgResult.value?.data?.data || orgResult.value?.data || orgResult.value
          : {};
      const storedUser = getStoredUser() as any;
      const plan = getWorkspacePlan({ selectedPlan: orgPayload?.workspace?.selectedPlan });
      const departments = normalizeDepartments(
        [
          rows(orgPayload?.departments),
          rows(orgPayload?.workspace?.organizationDepartments),
          rows(storedUser?.workspace?.organizationDepartments),
          rows(storedUser?.workspaceMembership?.departments),
          rows(storedUser?.departments),
        ],
        plan,
      );

      const tenantPayload =
        tenantsResult.status === "fulfilled"
          ? tenantsResult.value?.data?.data?.tenants || tenantsResult.value?.data?.tenants
          : [];
      const voPayload =
        voResult.status === "fulfilled"
          ? voResult.value?.data?.records || voResult.value?.data?.data?.records
          : [];
      const seatPayload =
        seatsResult.status === "fulfilled" ? seatsResult.value?.data?.data || {} : {};

      setSnapshot({
        resources,
        tenants: rows(tenantPayload),
        virtualOffices: rows(voPayload),
        departments,
        tenantSeatAssignments: rows(seatPayload?.tenant),
        departmentSeatAssignments: rows(seatPayload?.department),
      });

      if (resourcesResult.status === "rejected") {
        setLoadError("Space inventory could not be refreshed just now.");
      } else if (
        tenantsResult.status === "rejected" ||
        voResult.status === "rejected" ||
        orgResult.status === "rejected"
      ) {
        setLoadError(
          "Some architecture context could not be refreshed. Available inventory is shown below.",
        );
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [axiosPrivate]);

  const scopedResources = useMemo(
    () =>
      context.categories
        ? snapshot.resources.filter((resource) =>
            context.categories?.has(resource.resourceCategory),
          )
        : snapshot.resources,
    [context.categories, snapshot.resources],
  );

  const stats = useMemo(() => {
    const desks = scopedResources.filter((resource) => deskCats.has(resource.resourceCategory));
    const deskSeatTotals = desks.reduce(
      (total, resource) => {
        const seatSummary = resource.seatSummary || {};
        total.tenant += numeric(seatSummary.assignedToTenant);
        total.department += numeric(seatSummary.assignedToDepartment);
        total.assigned += numeric(seatSummary.assigned);
        total.capacity += numeric(seatSummary.total || resource.capacity);
        return total;
      },
      { tenant: 0, department: 0, assigned: 0, capacity: 0 },
    );
    const tenantSpaces = scopedResources.filter(
      (resource) => resource.assignmentType === "tenant",
    );
    const departmentSpaces = scopedResources.filter(
      (resource) => resource.assignmentType === "department",
    );
    const virtualOfficeSpaces = scopedResources.filter((resource) =>
      voCats.has(resource.resourceCategory),
    );
    const bookingSpaces = scopedResources.filter((resource) =>
      bookingOnlyCats.has(resource.resourceCategory),
    );

    return {
      totalSpaces: scopedResources.length,
      availableSpaces: scopedResources.filter(
        (resource) =>
          resource.status === "Active" &&
          !resource.assignmentLabel &&
          !bookingOnlyCats.has(resource.resourceCategory),
      ).length,
      totalCapacity: scopedResources.reduce(
        (sum, resource) => sum + numeric(resource.capacity),
        0,
      ),
      tenantSeats:
        deskSeatTotals.tenant +
        tenantSpaces
          .filter((resource) => deskCats.has(resource.resourceCategory))
          .reduce((sum, resource) => sum + numeric(resource.capacity), 0),
      departmentSeats:
        deskSeatTotals.department +
        departmentSpaces
          .filter((resource) => deskCats.has(resource.resourceCategory))
          .reduce((sum, resource) => sum + numeric(resource.capacity), 0),
      virtualOfficeSpaces: virtualOfficeSpaces.length,
      virtualOfficeCompanies: snapshot.virtualOffices.length,
      bookingSpaces: bookingSpaces.length,
      maintenance: scopedResources.filter(
        (resource) => resource.status === "Under Maintenance",
      ).length,
      floors: new Set(scopedResources.map((resource) => resource.floor).filter(Boolean))
        .size,
      buildings: new Set(
        scopedResources.map((resource) => resource.buildingName).filter(Boolean),
      ).size,
      activeTenants: snapshot.tenants.filter((tenant) =>
        ["Active", "Expiring Soon"].includes(String(tenant.status || "")),
      ).length,
      assignedDepartments: snapshot.departments.length,
      partialDesks: desks.filter(
        (resource) => resource.assignmentType === "seatsPartial",
      ).length,
    };
  }, [scopedResources, snapshot.departments, snapshot.tenants, snapshot.virtualOffices]);

  const allocationRows = useMemo(
    () =>
      topRows([
        ["Available", stats.availableSpaces],
        ["Tenant", scopedResources.filter((r) => r.assignmentType === "tenant").length],
        ["Department", scopedResources.filter((r) => r.assignmentType === "department").length],
        [
          "Virtual office",
          scopedResources.filter(
            (r) => voCats.has(r.resourceCategory) && Boolean(r.assignmentLabel),
          ).length,
        ],
        [
          "Partially assigned",
          stats.partialDesks,
        ],
        [
          "Booking",
          scopedResources.filter((r) => bookingOnlyCats.has(r.resourceCategory)).length,
        ],
        ["Maintenance", stats.maintenance],
      ]),
    [scopedResources, stats.availableSpaces, stats.maintenance, stats.partialDesks],
  );

  const categoryRows = useMemo(() => {
    const groups = new Map<string, number>();
    scopedResources.forEach((resource) => {
      const label = kindLabel(resource);
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return topRows([...groups.entries()]);
  }, [scopedResources]);

  const locationRows = useMemo(() => {
    const groups = new Map<string, { floor: string; spaces: number; seats: number; assigned: number }>();
    scopedResources.forEach((resource) => {
      const floor = String(resource.floor || "Unassigned");
      const entry = groups.get(floor) || { floor, spaces: 0, seats: 0, assigned: 0 };
      entry.spaces += 1;
      entry.seats += numeric(resource.capacity);
      if (resource.assignmentLabel || resource.status === "Under Maintenance") {
        entry.assigned += numeric(resource.capacity);
      }
      groups.set(floor, entry);
    });
    return [...groups.values()]
      .map((entry) => ({
        ...entry,
        occupancy: entry.seats ? Math.round((entry.assigned / entry.seats) * 100) : 0,
      }))
      .sort((left, right) =>
        String(left.floor).localeCompare(String(right.floor), undefined, { numeric: true }),
      )
      .slice(0, 8);
  }, [scopedResources]);

  const recentResources = useMemo(
    () =>
      [...scopedResources]
        .sort(
          (left, right) =>
            new Date(right.updatedAt || right.createdAt || 0).getTime() -
            new Date(left.updatedAt || left.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [scopedResources],
  );

  const visibleModules = MODULES.filter(
    (module) => !module.operational || context.showOperationalTabs,
  );
  const moduleState = fromSection ? { fromSection } : undefined;
  const dashboardTourKey = contextKey;

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <DashboardBanner
          title={context.title}
          description={context.description}
          tags={[...context.tags]}
          image={salesBannerImage}
        />

        {loadError && !isLoading ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            {loadError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="h-[112px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div
            data-tour="sa-workspace-summary"
            className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <DashboardStatTile
              icon={<MapIcon size={20} />}
              label="Total Spaces"
              value={stats.totalSpaces}
              sub={`Across ${stats.floors} floor${stats.floors === 1 ? "" : "s"} and ${stats.buildings} location${stats.buildings === 1 ? "" : "s"}`}
              tone="blue"
            />
            <DashboardStatTile
              icon={<CheckCircle2 size={20} />}
              label="Available"
              value={stats.availableSpaces}
              sub="Active spaces ready for assignment"
              tone="green"
            />
            <DashboardStatTile
              icon={<Users size={20} />}
              label="Seat Capacity"
              value={stats.totalCapacity}
              sub="Total seats across visible inventory"
              tone="violet"
            />
            <DashboardStatTile
              icon={<Building2 size={20} />}
              label="Tenant Seats"
              value={stats.tenantSeats}
              sub={`${stats.activeTenants} active tenant companies`}
              tone="cyan"
            />
            <DashboardStatTile
              icon={<Briefcase size={20} />}
              label="Department Seats"
              value={stats.departmentSeats}
              sub={`${stats.assignedDepartments} departments on this plan`}
              tone="amber"
            />
            <DashboardStatTile
              icon={<DoorOpen size={20} />}
              label="Virtual Offices"
              value={stats.virtualOfficeSpaces}
              sub={`${stats.virtualOfficeCompanies} virtual-office companies`}
              tone="slate"
            />
            <DashboardStatTile
              icon={<CalendarClock size={20} />}
              label="Booking Rooms"
              value={stats.bookingSpaces}
              sub="Meeting and conference rooms"
              tone="blue"
            />
            <DashboardStatTile
              icon={<Wrench size={20} />}
              label="Maintenance"
              value={stats.maintenance}
              sub="Spaces currently under maintenance"
              tone={stats.maintenance ? "rose" : "green"}
            />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">
            Sales architecture modules
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Open one curated workspace at a time. Only the modules available for
            this architecture context are shown.
          </p>
          <div
            data-tour="sa-workspace-modules"
            className="mt-3 grid w-full grid-cols-1 gap-4 md:grid-cols-[repeat(var(--module-cols),minmax(0,1fr))]"
            style={{ "--module-cols": visibleModules.length } as CSSProperties}
          >
            {visibleModules.map((module) => {
              const Icon = module.icon;
              return (
                <DashboardModuleCard
                  key={module.key}
                  icon={<Icon size={19} />}
                  title={module.title}
                  route={`${BASE_ROUTE}/${module.route}${location.search}`}
                  state={moduleState}
                  description={module.description}
                  color={module.color}
                />
              );
            })}
          </div>
        </div>

        {!isLoading ? (
          <>
            <div
              data-tour="sa-workspace-charts"
              className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2"
            >
              <DashboardSection
                title="Space allocation"
                subtitle="How the visible inventory is currently allocated."
              >
                {allocationRows.length ? (
                  <InsightDonutChart
                    centerLabel="Spaces"
                    labels={allocationRows.map(([label]) => label)}
                    series={allocationRows.map(([, value]) => value)}
                    colors={["#10B981", "#7C3AED", "#F59E0B", "#0D9488", "#F97316", "#EC4899", "#94A3B8"]}
                    tooltipValue={allocationRows.map(
                      ([label, value]) => `${value} ${label.toLowerCase()} space${value === 1 ? "" : "s"}`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[290px] items-center justify-center text-[11px] text-slate-500">
                    No spaces in this architecture view yet.
                  </div>
                )}
              </DashboardSection>
              <DashboardSection
                title="Inventory mix"
                subtitle="Space counts by kind for the selected architecture view."
              >
                {categoryRows.length ? (
                  <InsightDonutChart
                    centerLabel="Spaces"
                    labels={categoryRows.map(([label]) => label)}
                    series={categoryRows.map(([, value]) => value)}
                    colors={["#2563EB", "#0D9488", "#7C3AED", "#F59E0B", "#EC4899", "#10B981", "#64748B", "#0891B2"]}
                    tooltipValue={categoryRows.map(
                      ([label, value]) => `${value} ${label.toLowerCase()}${value === 1 ? "" : "s"}`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[290px] items-center justify-center text-[11px] text-slate-500">
                    No inventory kinds recorded yet.
                  </div>
                )}
              </DashboardSection>
            </div>

            <div
              data-tour="sa-workspace-activity"
              className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
            >
              <DashboardSection
                title="Capacity by floor"
                subtitle="Seats and occupied capacity for each floor in view."
              >
                {locationRows.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-[9px] uppercase tracking-widest text-slate-400">
                          <th className="pb-2">Floor</th>
                          <th className="pb-2 text-right">Spaces</th>
                          <th className="pb-2 text-right">Seats</th>
                          <th className="pb-2 text-right">Occupied</th>
                          <th className="pb-2 text-right">Usage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {locationRows.map((row) => (
                          <tr key={row.floor} className="text-slate-600">
                            <td className="py-2 font-pmedium text-slate-900">{titleCase(row.floor, "Unassigned")}</td>
                            <td className="py-2 text-right">{row.spaces}</td>
                            <td className="py-2 text-right">{row.seats}</td>
                            <td className="py-2 text-right">{row.assigned}</td>
                            <td className="py-2 text-right font-pmedium text-blue-600">{row.occupancy}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-[11px] text-slate-500">
                    No floor-level inventory available.
                  </div>
                )}
              </DashboardSection>

              <DashboardSection
                title="Recent spaces"
                subtitle="Latest inventory records with their current assignment state."
              >
                {recentResources.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-[9px] uppercase tracking-widest text-slate-400">
                          <th className="pb-2">Space</th>
                          <th className="pb-2">Kind</th>
                          <th className="pb-2">Location</th>
                          <th className="pb-2 text-right">Seats</th>
                          <th className="pb-2 text-right">State</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {recentResources.map((resource) => (
                          <tr key={String(resource.recordId || resource.resourceCode)} className="text-slate-600">
                            <td className="py-2 font-pmedium text-slate-900">
                              {resource.name || resource.resourceCode || "Space"}
                            </td>
                            <td className="py-2">{kindLabel(resource)}</td>
                            <td className="py-2">{resource.locationLabel || "—"}</td>
                            <td className="py-2 text-right">{numeric(resource.capacity)}</td>
                            <td className="py-2 text-right">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[9px] font-pmedium ${
                                  resource.status === "Under Maintenance"
                                    ? "bg-slate-100 text-slate-600"
                                    : resource.assignmentLabel
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                {resource.status === "Under Maintenance"
                                  ? "Maintenance"
                                  : resource.assignmentLabel
                                    ? "Assigned"
                                    : "Available"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-[11px] text-slate-500">
                    No spaces recorded yet.
                  </div>
                )}
              </DashboardSection>
            </div>

            <p className="mt-4 text-center text-[9px] uppercase tracking-widest text-slate-400">
              {dashboardTourKey === "all"
                ? "All verticals"
                : `${titleCase(contextKey)} architecture`}{" "}
              · Sales Architecture workspace
            </p>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
