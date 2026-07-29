/**
 * useModuleStats — real, verified stat cards for granted modules, keyed by
 * module id. Only modules with a confirmed working data source are wired
 * here (see plan doc Phase 2); anything else is deliberately left out so
 * ModuleAccessDashboard falls back to a plain QuickLink for it instead of
 * showing a fabricated number.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ElementType } from "react";
import {
  Ticket, CalendarCheck, Eye, Users, UserPlus,
  Wrench, MonitorCog, Building2, Tag, HandCoins, Sparkles, ClipboardCheck,
} from "lucide-react";
import { getTickets } from "../../../../services/tickets";
import { getMeetingRoomBookings } from "../../../../services/meeting-room-bookings";
import { getTenantCompanies } from "../../../../services/tenant-companies";
import { getPricingPackages } from "../../../../services/pricing-packages";
import { getVisitorManagementOverview } from "../../../../services/visitors";
import { getResources } from "../../../../services/resources";
import { getHousekeepingOverview } from "../../../../services/housekeeping";
import { getMaintenanceOverview } from "../../../../services/maintenance";
import { getITOverview } from "../../../../services/it";
import { getEmployeeManagementOverview } from "../../../../services/hr";
import { getRecruitmentOverview } from "../../../../services/recruitment";
import { getHrAttendanceReview } from "../../../../services/attendance";
import { getStoredUser } from "../../../../lib/auth-session";

export interface ModuleStatCardConfig {
  moduleId: string;
  icon: ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  route?: string;
}

export interface ModuleDonutConfig {
  moduleId: string;
  title: string;
  series: number[];
  labels: string[];
  colors: string[];
  centerLabel: string;
}

const arr = (value: any): any[] => (Array.isArray(value) ? value : []);

export const useModuleStats = (moduleIds: Set<string>) => {
  const has = (id: string) => moduleIds.has(id);

  const storedUser = getStoredUser();
  const dashboardWorkspaceId = String(
    (storedUser as any)?.workspaceMembership?.workspaceId ||
      (storedUser as any)?.workspaceMembership?.workspace ||
      (storedUser as any)?.primaryWorkspace ||
      (storedUser as any)?.workspaceId ||
      "",
  );

  const ticketsQuery = useQuery({
    queryKey: ["module-stats-tickets"],
    queryFn: async () => {
      const d = await getTickets({ limit: 100 });
      return Array.isArray(d) ? d : [];
    },
    enabled: has("tickets"),
    staleTime: 5 * 60 * 1000,
  });

  const bookingsQuery = useQuery({
    queryKey: ["module-stats-bookings", dashboardWorkspaceId],
    queryFn: async () => {
      const d = await getMeetingRoomBookings(dashboardWorkspaceId);
      const list = (d as any)?.bookings ?? d;
      return Array.isArray(list) ? list : [];
    },
    enabled: has("meeting-room-system") && Boolean(dashboardWorkspaceId),
    staleTime: 5 * 60 * 1000,
  });

  const tenantsQuery = useQuery({
    queryKey: ["module-stats-tenants"],
    queryFn: async () => {
      const res: any = await getTenantCompanies();
      const list = res?.data?.tenants ?? res?.data?.data?.tenants ?? res?.data?.data ?? res?.data;
      return Array.isArray(list) ? list : [];
    },
    enabled: has("tenant-companies-sales") || has("tenant-companies-admin"),
    staleTime: 5 * 60 * 1000,
  });

  const pricingQuery = useQuery({
    queryKey: ["module-stats-pricing"],
    queryFn: async () => {
      const res: any = await getPricingPackages();
      const list = res?.data?.data?.packages ?? res?.data?.packages;
      return Array.isArray(list) ? list : [];
    },
    enabled: has("resource-pricing"),
    staleTime: 5 * 60 * 1000,
  });

  const visitorsQuery = useQuery({
    queryKey: ["module-stats-visitors"],
    queryFn: () => getVisitorManagementOverview(),
    enabled: has("visitors-management"),
    staleTime: 5 * 60 * 1000,
  });

  const resourcesQuery = useQuery({
    queryKey: ["module-stats-resources"],
    queryFn: async () => {
      const res: any = await getResources();
      const list = res?.data?.data?.resources ?? res?.data?.resources;
      return Array.isArray(list) ? list : [];
    },
    enabled: has("resource-management"),
    staleTime: 5 * 60 * 1000,
  });

  const housekeepingQuery = useQuery({
    queryKey: ["module-stats-housekeeping"],
    queryFn: () => getHousekeepingOverview(),
    enabled: has("house-keeping"),
    staleTime: 5 * 60 * 1000,
  });

  const maintenanceQuery = useQuery({
    queryKey: ["module-stats-maintenance"],
    queryFn: () => getMaintenanceOverview(),
    enabled: has("maintenance-repair-logs") || has("amc-maintenance-scheduler"),
    staleTime: 5 * 60 * 1000,
  });

  const itQuery = useQuery({
    queryKey: ["module-stats-it"],
    queryFn: () => getITOverview(),
    enabled: has("it-repair-logs"),
    staleTime: 5 * 60 * 1000,
  });

  const employeeMgmtQuery = useQuery({
    queryKey: ["module-stats-employee-management"],
    queryFn: async () => {
      const res: any = await getEmployeeManagementOverview();
      return res?.data?.summary ?? res?.data?.data?.summary ?? null;
    },
    enabled: has("employee-management"),
    staleTime: 5 * 60 * 1000,
  });

  const recruitmentQuery = useQuery({
    queryKey: ["module-stats-recruitment"],
    queryFn: () => getRecruitmentOverview(),
    enabled: has("recruitment"),
    staleTime: 5 * 60 * 1000,
  });

  const attendanceReviewQuery = useQuery({
    queryKey: ["module-stats-attendance-review"],
    queryFn: () => getHrAttendanceReview(),
    enabled: has("attendance-review"),
    staleTime: 5 * 60 * 1000,
  });

  const cards = useMemo<ModuleStatCardConfig[]>(() => {
    const list: ModuleStatCardConfig[] = [];

    if (ticketsQuery.data) {
      const tickets = arr(ticketsQuery.data);
      const open = tickets.filter((t: any) => ["open", "Open"].includes(t.status)).length;
      const resolved = tickets.filter((t: any) => ["resolved", "Resolved", "closed", "Closed"].includes(t.status)).length;
      list.push({ moduleId: "tickets", icon: Ticket, label: "Support Tickets", value: tickets.length, sub: `${open} open, ${resolved} resolved`, color: "#ef4444", route: "/tickets" });
    }

    if (bookingsQuery.data) {
      const bookings = arr(bookingsQuery.data);
      const confirmed = bookings.filter((b: any) => String(b.status || "").toLowerCase() === "confirmed").length;
      list.push({ moduleId: "meeting-room-system", icon: CalendarCheck, label: "Meeting Room Bookings", value: bookings.length, sub: `${confirmed} confirmed`, color: "#2563EB", route: "/meetings/meeting-rooms" });
    }

    if (tenantsQuery.data) {
      const tenants = arr(tenantsQuery.data);
      const active = tenants.filter((t: any) => String(t.status || "").toLowerCase() === "active").length;
      list.push({ moduleId: "tenant-companies-sales", icon: Building2, label: "Tenant Companies", value: tenants.length, sub: `${active} active`, color: "#1E3D73", route: "/sales-crm/tenant-companies" });
    }

    if (pricingQuery.data) {
      const packages = arr(pricingQuery.data);
      list.push({ moduleId: "resource-pricing", icon: Tag, label: "Pricing Packages", value: packages.length, color: "#7c3aed", route: "/sales-crm/resource-pricing" });
    }

    if (visitorsQuery.data) {
      const overview: any = visitorsQuery.data;
      const todayCount = arr(overview?.dailyVisitors).length;
      const liveCount = arr(overview?.liveVisitors).length;
      list.push({ moduleId: "visitors-management", icon: Eye, label: "Visitors Today", value: todayCount, sub: `${liveCount} checked in`, color: "#80bf01", route: "/visitors/visitor-management" });
    }

    if (resourcesQuery.data) {
      const resources = arr(resourcesQuery.data);
      list.push({ moduleId: "resource-management", icon: HandCoins, label: "Resources", value: resources.length, color: "#059669", route: "/administration/resource-management" });
    }

    if (housekeepingQuery.data) {
      const summary: any = (housekeepingQuery.data as any)?.data?.summary ?? {};
      list.push({ moduleId: "house-keeping", icon: Sparkles, label: "Housekeeping Tasks", value: summary.activeTasks ?? 0, sub: `${summary.pendingTasks ?? 0} pending`, color: "#0891b2", route: "/administration/house-keeping" });
    }

    if (maintenanceQuery.data) {
      const overview: any = maintenanceQuery.data;
      list.push({ moduleId: "maintenance-repair-logs", icon: Wrench, label: "Maintenance Health", value: `${overview?.uptimePercentage ?? 0}%`, sub: `${overview?.overdueSchedules ?? 0} overdue, ${overview?.openRepairLogs ?? 0} open repairs`, color: "#f59e0b", route: "/maintenance/repair-logs" });
    }

    if (itQuery.data) {
      const overview: any = itQuery.data;
      list.push({ moduleId: "it-repair-logs", icon: MonitorCog, label: "IT Resolution Rate", value: `${overview?.resolutionRate ?? 0}%`, sub: `${overview?.openLogs ?? 0} open, ${overview?.totalLogs ?? 0} total`, color: "#0891b2", route: "/it/repair-logs" });
    }

    if (employeeMgmtQuery.data) {
      const summary: any = employeeMgmtQuery.data;
      list.push({ moduleId: "employee-management", icon: Users, label: "Employees", value: summary.totalEmployees ?? 0, sub: `${summary.activeEmployees ?? 0} active`, color: "#1E3D73", route: "/hr/employee-management" });
    }

    if (recruitmentQuery.data) {
      const summary: any = (recruitmentQuery.data as any)?.summary ?? {};
      list.push({ moduleId: "recruitment", icon: UserPlus, label: "Open Positions", value: summary.activeJobs ?? 0, sub: `${summary.totalCandidates ?? 0} candidates`, color: "#7c3aed", route: "/hr/recruitment" });
    }

    if (attendanceReviewQuery.data) {
      const stats: any = (attendanceReviewQuery.data as any)?.stats ?? {};
      list.push({ moduleId: "attendance-review", icon: ClipboardCheck, label: "Team Attendance %", value: `${stats.attendancePercentage ?? 0}%`, sub: `${stats.present ?? 0} present, ${stats.absent ?? 0} absent`, color: "#059669", route: "/hr/attendance-review" });
    }

    return list;
  }, [
    ticketsQuery.data, bookingsQuery.data, tenantsQuery.data, pricingQuery.data,
    visitorsQuery.data, resourcesQuery.data, housekeepingQuery.data, maintenanceQuery.data,
    itQuery.data, employeeMgmtQuery.data, recruitmentQuery.data, attendanceReviewQuery.data,
  ]);

  const charts = useMemo<ModuleDonutConfig[]>(() => {
    const list: ModuleDonutConfig[] = [];

    if (tenantsQuery.data) {
      const tenants = arr(tenantsQuery.data);
      const statusOf = (t: any) => String(t.status || "").toLowerCase();
      const active = tenants.filter((t: any) => statusOf(t) === "active").length;
      const expiringSoon = tenants.filter((t: any) => statusOf(t).includes("expiring")).length;
      const pending = tenants.filter((t: any) => statusOf(t).includes("pending") || statusOf(t) === "expired").length;
      if (tenants.length > 0) {
        list.push({
          moduleId: "tenant-companies-sales",
          title: "Tenant Status",
          series: [active, pending, expiringSoon],
          labels: ["Active", "Pending/Expired", "Expiring Soon"],
          colors: ["#1E3D73", "#80bf01", "#f59e0b"],
          centerLabel: "Tenants",
        });
      }
    }

    if (maintenanceQuery.data) {
      const overview: any = maintenanceQuery.data;
      const total = Number(overview?.totalSchedules ?? 0);
      if (total > 0) {
        list.push({
          moduleId: "maintenance-repair-logs",
          title: "Schedule Health",
          series: [overview?.healthySchedules ?? 0, overview?.dueSoonSchedules ?? 0, overview?.overdueSchedules ?? 0],
          labels: ["Healthy", "Due Soon", "Overdue"],
          colors: ["#22c55e", "#f59e0b", "#ef4444"],
          centerLabel: "Schedules",
        });
      }
    }

    if (itQuery.data) {
      const overview: any = itQuery.data;
      const total = Number(overview?.totalLogs ?? 0);
      if (total > 0) {
        list.push({
          moduleId: "it-repair-logs",
          title: "Repair Log Status",
          series: [overview?.openLogs ?? 0, overview?.inProgressLogs ?? 0, overview?.resolvedLogs ?? 0, overview?.closedLogs ?? 0],
          labels: ["Open", "In Progress", "Resolved", "Closed"],
          colors: ["#ef4444", "#f59e0b", "#22c55e", "#64748b"],
          centerLabel: "Logs",
        });
      }
    }

    return list;
  }, [tenantsQuery.data, maintenanceQuery.data, itQuery.data]);

  const isLoading = [
    ticketsQuery, bookingsQuery, tenantsQuery, pricingQuery, visitorsQuery, resourcesQuery,
    housekeepingQuery, maintenanceQuery, itQuery, employeeMgmtQuery, recruitmentQuery, attendanceReviewQuery,
  ].some((q) => q.isLoading && q.fetchStatus !== "idle");

  return { cards, charts, isLoading };
};
