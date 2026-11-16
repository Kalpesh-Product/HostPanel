import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  LayoutGrid,
  LayoutList,
  MapPinned,
  ShieldAlert,
  Tags,
  Users,
  Wrench,
} from "lucide-react";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import DonutChart from "@/components/graphs/DonutChart";
import GroupedBarGraph from "@/components/graphs/GroupedBarGraph";
import PageFrame from "@/components/Pages/PageFrame";
import { getResources } from "@/services/resources";
import resourceBannerImage from "@/assets/resource-management-dashboard-banner.png";
import {
  DashboardBanner,
  DashboardSection,
  DashboardStatTile,
} from "../AdministrationModuleDashboardShared";
import { normalizeDashboardLabel } from "../AdministrationDashboardUtils";

type ResourceRecord = Record<string, any>;

const resourceCategory = (resource: ResourceRecord) =>
  resource.resourceCategory || resource.type || "Uncategorised";

const resourceStatus = (resource: ResourceRecord) =>
  resource.status || "Unknown";

const resourceLocation = (resource: ResourceRecord) =>
  [resource.location, resource.floor, resource.wing]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(" • ") || "Not assigned";

const formatDate = (value: unknown) => {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function ResourceManagementWorkspaceDashboard() {
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getResources()
      .then((response: any) => {
        if (cancelled) return;
        const payload = response?.data?.data || response?.data || {};
        setResources(Array.isArray(payload.resources) ? payload.resources : []);
        setLoadError("");
      })
      .catch((error: any) => {
        if (!cancelled) {
          setLoadError(
            error?.message || "Resource data could not be refreshed just now.",
          );
          setResources([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const active = resources.filter(
      (resource) => resourceStatus(resource) === "Active",
    ).length;
    const maintenance = resources.filter(
      (resource) => resourceStatus(resource) === "Under Maintenance",
    ).length;
    const disabled = resources.filter(
      (resource) => resourceStatus(resource) === "Disabled",
    ).length;
    const capacity = resources.reduce(
      (total, resource) => total + Math.max(1, Number(resource.capacity || 1)),
      0,
    );
    const booked = resources.filter(
      (resource) => resource.currentlyBooked === true,
    ).length;
    const assigned = resources.filter(
      (resource) =>
        resource.assignedTenantCompanyId || resource.assignedTenantCompanyName,
    ).length;
    const locations = new Set(
      resources
        .map((resource) => resource.location || resource.floor)
        .filter(Boolean),
    ).size;
    return {
      total: resources.length,
      active,
      maintenance,
      disabled,
      capacity,
      booked,
      assigned,
      locations,
    };
  }, [resources]);

  const categoryRows = useMemo(() => {
    const groups = new Map<string, number>();
    resources.forEach((resource) => {
      const label = normalizeDashboardLabel(resourceCategory(resource));
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [resources]);

  const statusRows = useMemo(() => {
    const groups = new Map<string, number>();
    resources.forEach((resource) => {
      const label = resourceStatus(resource);
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [resources]);

  const capacityRows = useMemo(() => {
    const groups = new Map<string, number>();
    resources.forEach((resource) => {
      const label = normalizeDashboardLabel(resourceCategory(resource));
      groups.set(
        label,
        (groups.get(label) || 0) + Math.max(1, Number(resource.capacity || 1)),
      );
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [resources]);

  const recentResources = useMemo(
    () =>
      [...resources]
        .sort(
          (left, right) =>
            new Date(right.createdAt || 0).getTime() -
            new Date(left.createdAt || 0).getTime(),
        )
        .slice(0, 10),
    [resources],
  );

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <DashboardBanner
          title="Resource Management"
          description="Resource availability, operational status, capacity, tenant allocation, locations, and maintenance visibility."
          tags={["Resources", "Capacity", "Allocation", "Maintenance"]}
          image={resourceBannerImage}
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
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStatTile
              icon={<LayoutGrid size={20} />}
              label="Total Resources"
              value={stats.total}
              sub="Resources registered in the workspace"
              tone="blue"
            />
            <DashboardStatTile
              icon={<CheckCircle2 size={20} />}
              label="Active"
              value={stats.active}
              sub="Resources currently available"
              tone="green"
            />
            <DashboardStatTile
              icon={<Wrench size={20} />}
              label="Maintenance"
              value={stats.maintenance}
              sub="Resources requiring attention"
              tone="amber"
            />
            <DashboardStatTile
              icon={<ShieldAlert size={20} />}
              label="Disabled"
              value={stats.disabled}
              sub="Resources unavailable for use"
              tone="rose"
            />
            <DashboardStatTile
              icon={<Users size={20} />}
              label="Total Capacity"
              value={stats.capacity}
              sub="Combined resource capacity"
              tone="violet"
            />
            <DashboardStatTile
              icon={<Building2 size={20} />}
              label="Currently Booked"
              value={stats.booked}
              sub="Resources in active use"
              tone="cyan"
            />
            <DashboardStatTile
              icon={<Tags size={20} />}
              label="Tenant Assigned"
              value={stats.assigned}
              sub="Resources allocated to tenant companies"
              tone="blue"
            />
            <DashboardStatTile
              icon={<MapPinned size={20} />}
              label="Locations"
              value={stats.locations}
              sub="Distinct resource locations"
              tone="slate"
            />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">
            Manage resources
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Open the resource register to add, update, allocate, maintain, or
            export workspace resources.
          </p>
          <div className="mt-3 grid w-full grid-cols-1 gap-4">
            <DashboardModuleCard
              icon={<LayoutList size={19} />}
              title="Resource Management"
              route="/department-accesses/administration-department/resource-management/manage"
              description="Manage resource inventory, capacity, locations, status, and tenant assignments"
              color="#2563EB"
            />
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4">
              <DashboardSection
                title="Capacity by resource category"
                subtitle="Combined operational capacity available across each resource category."
              >
                {capacityRows.length ? (
                  <GroupedBarGraph
                    options={{
                      chart: { toolbar: { show: false } },
                      xaxis: {
                        categories: capacityRows.map(([label]) => label),
                      },
                      colors: ["#2563EB"],
                      dataLabels: { enabled: false },
                      legend: { show: false },
                    }}
                    series={[
                      {
                        name: "Capacity",
                        data: capacityRows.map(([, value]) => value),
                      },
                    ]}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No resource capacity recorded yet.
                  </div>
                )}
              </DashboardSection>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DashboardSection
                title="Resource categories"
                subtitle="Registered resources grouped by operational category."
              >
                {categoryRows.length ? (
                  <DonutChart
                    centerLabel="Resources"
                    labels={categoryRows.map(([label]) => label)}
                    series={categoryRows.map(([, value]) => value)}
                    colors={[
                      "#2563EB",
                      "#10B981",
                      "#7C3AED",
                      "#F59E0B",
                      "#06B6D4",
                      "#94A3B8",
                    ]}
                    tooltipValue={categoryRows.map(
                      ([, value]) => `${value} resources`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No resource categories recorded yet.
                  </div>
                )}
              </DashboardSection>
              <DashboardSection
                title="Operational status"
                subtitle="Availability, maintenance, and disabled resource mix."
              >
                {statusRows.length ? (
                  <DonutChart
                    centerLabel="Resources"
                    labels={statusRows.map(([label]) => label)}
                    series={statusRows.map(([, value]) => value)}
                    colors={[
                      "#10B981",
                      "#F59E0B",
                      "#94A3B8",
                      "#EF4444",
                      "#2563EB",
                    ]}
                    tooltipValue={statusRows.map(
                      ([, value]) => `${value} resources`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No resource status data recorded yet.
                  </div>
                )}
              </DashboardSection>
            </div>

            <DashboardSection
              title="Recent resources"
              subtitle="Latest resources added to the workspace inventory."
              bodyClassName="max-h-[420px] overflow-auto p-0"
            >
              <table className="w-full min-w-[860px] table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="w-[28%] px-5 py-3 font-pmedium">Resource</th>
                    <th className="w-[18%] px-3 py-3 font-pmedium">Category</th>
                    <th className="w-[24%] px-3 py-3 font-pmedium">Location</th>
                    <th className="w-[12%] px-3 py-3 text-center font-pmedium">
                      Capacity
                    </th>
                    <th className="w-[18%] px-3 py-3 text-center font-pmedium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentResources.length ? (
                    recentResources.map((resource, index) => (
                      <tr
                        key={
                          resource.recordId ||
                          resource._id ||
                          resource.id ||
                          index
                        }
                        className="bg-white text-[11px] text-slate-600"
                      >
                        <td className="px-5 py-3">
                          <p className="truncate font-pmedium text-slate-900">
                            {resource.name ||
                              resource.resourceCode ||
                              "Resource"}
                          </p>
                          <p className="mt-0.5 truncate text-[9px] text-slate-400">
                            {resource.resourceCode ||
                              resource.id ||
                              formatDate(resource.createdAt)}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          {normalizeDashboardLabel(resourceCategory(resource))}
                        </td>
                        <td
                          className="truncate px-3 py-3"
                          title={resourceLocation(resource)}
                        >
                          {resourceLocation(resource)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {Math.max(1, Number(resource.capacity || 1))}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-pmedium uppercase text-slate-600">
                            {resourceStatus(resource)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-12 text-center text-[11px] text-slate-500"
                      >
                        No resources recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </DashboardSection>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
