import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Settings,
  Globe,
  ShieldCheck,
  NotebookText,
  ClipboardCheck,
  Building,
  Boxes,
  UserCog,
  MonitorCog,
  Package,
  BarChart,
  Clock,
  ListChecks,
  Ticket,
  CalendarClock,
  Presentation,
  ContactRound,
  Warehouse,
  Wallet,
  MessageSquareCode,
  FileChartColumn,
  Users,
  UserPlus,
  CalendarCheck,
  UserMinus,
  Building2,
  Bed,
  HandCoins,
  Wrench,
  BriefcaseBusiness,
  Magnet,
  Tag,
  ShoppingCart,
  Receipt,
  Calculator,
  ScanSearch,
  Laptop,
  FileSearch,
  User,
  LogOut,
  Handshake,
  Lock,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSidebar } from "../context/SideBarContext";
import useAuth from "../hooks/useAuth";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import useLogout from "../hooks/useLogout";
import {
  getEnabledModuleIdsForPlan,
  getWorkspaceCount,
  isModuleLockedForPlan,
} from "../utils/workspacePlanAccess";

type PlanType = "basic" | "professional" | "custom";

interface NavNode {
  id: string;
  label: string;
  icon?: ElementType;
  route?: string;
  isRed?: boolean;
  disabled?: boolean;
  disabledTitle?: string;
  defaultOpen?: boolean;
  children?: NavNode[];
}

interface SidebarProps {
  drawerOpen?: boolean;
  onCloseDrawer?: () => void;
}

interface NavItemProps {
  icon?: ElementType;
  label: string;
  collapsed: boolean;
  depth?: number;
  hasChildren?: boolean;
  isOpen?: boolean;
  onClick?: () => void;
  isRed?: boolean;
  isActive?: boolean;
  disabled?: boolean;
  locked?: boolean;
  unavailable?: boolean;
  disabledTitle?: string;
  forceBold?: boolean;
  forceSmall?: boolean;
}

interface WorkspaceSetupState {
  selectedPlan?: PlanType;
  enabledModuleIds?: string[];
}

interface WorkspaceAccessMapState {
  selectedPlan?: PlanType;
  enabledModuleIds?: string[];
  currentMemberGrantedModules?: string[];
  moduleMap?: {
    sections?: Array<{
      sectionId?: string;
      sectionLabel?: string;
      items?: Array<{
        id?: string;
        label?: string;
        route?: string;
        unlockedInWorkspace?: boolean;
        implemented?: boolean;
        tabs?: Array<{
          id?: string;
          label?: string;
          route?: string;
          unlockedInWorkspace?: boolean;
          implemented?: boolean;
        }>;
      }>;
    }>;
  };
}

interface RoleAccessContext {
  role: string;
  departments: string[];
  grantedModules: string[];
}

const readWorkspaceSetup = (): WorkspaceSetupState => {
  try {
    const raw = localStorage.getItem("workspace_setup");
    if (!raw) return { selectedPlan: "basic", enabledModuleIds: [] };
    const parsed = JSON.parse(raw) as WorkspaceSetupState;
    return {
      selectedPlan: parsed?.selectedPlan || "basic",
      enabledModuleIds: Array.isArray(parsed?.enabledModuleIds)
        ? parsed.enabledModuleIds
        : [],
    };
  } catch {
    return { selectedPlan: "basic", enabledModuleIds: [] };
  }
};

const companySettingsData: NavNode[] = [
  { id: "website-builder", label: "Website Builder", icon: Globe, route: "/company-settings/website-builder" },
  { id: "wono-nomad", label: "Wono Nomad", icon: ShieldCheck, route: "/company-settings/wono-nomad" },
  { id: "website-leads", label: "Website Leads", icon: NotebookText, route: "/company-settings/website-builder/leads" },
  { id: "organization-management", label: "Organization Management", icon: Building, route: "/company-settings/organization-management" },
  { id: "module-management", label: "Module Management", icon: Boxes, disabled: true },
  { id: "access-grants", label: "Access Grants", icon: UserCog, route: "/company-settings/access-grants" },
  { id: "workspace-settings", label: "Workspace Settings", icon: Settings, route: "/company-settings/workspace-settings", disabled: true },
  { id: "workspace-management", label: "Workspace Management", icon: MonitorCog, route: "/company-settings/workspace-management", disabled: true },
  { id: "analytics", label: "Analytics", icon: BarChart, disabled: true },
  { id: "customer-support", label: "Customer Support", icon: MessageSquareCode, route: "/company-settings/customer-support" },
];

const keyAppsData: NavNode[] = [
  { id: "attendance", label: "Attendance", icon: Clock, disabled: true },
  { id: "tasks", label: "Tasks", icon: ListChecks, disabled: true },
  { id: "tickets", label: "Tickets", icon: Ticket, disabled: true },
  { id: "leave-requests", label: "Leave Requests", icon: CalendarClock, disabled: true },
  { id: "meeting-room-system", label: "Meeting Room System", icon: Presentation, disabled: true },
  {
    id: "visitor-management",
    label: "Visitor Management",
    icon: ContactRound,
    route: "/visitors/visitor-management",
    disabled: false,
  },
  { id: "assets", label: "Assets", icon: Package, disabled: true },
  { id: "inventory", label: "Inventory", icon: Warehouse, disabled: true },
  { id: "finance-management", label: "Finance Management", icon: Wallet, disabled: true },
  { id: "chat-bot", label: "Calendar", icon: CalendarClock, disabled: true },
  { id: "reports", label: "Reports", icon: FileChartColumn, disabled: true },
];

const departmentModules: NavNode[] = [
  {
    id: "hr-department",
    label: "HR Department",
    icon: Users,
    defaultOpen: false,
    children: [
      { id: "employee-management", label: "Employee Management", icon: Users, disabled: true },
      { id: "hr-documents", label: "Documents", icon: NotebookText, disabled: true },
      { id: "recruitment", label: "Recruitment", icon: UserPlus, disabled: true },
      { id: "leave-request-processing", label: "Leave Request Processing", icon: CalendarCheck, disabled: true },
      { id: "attendance-review", label: "Attendance Review", icon: ClipboardCheck, disabled: true },
      { id: "payroll-management", label: "Payroll Management", icon: Wallet, disabled: true },
      { id: "exit-management", label: "Exit Management", icon: UserMinus, disabled: true },
    ],
  },
  {
    id: "administration-department",
    label: "Administration Department",
    icon: Building2,
    defaultOpen: false,
    children: [
      { id: "tenant-companies-admin", label: "Tenant Companies", icon: Building2, disabled: true },
      { id: "bookings", label: "Bookings", icon: Bed, disabled: true },
      {
        id: "visitors-management",
        label: "Visitors Management",
        icon: ContactRound,
        route: "/visitors/visitor-management",
        disabled: false,
      },
      { id: "resource-management", label: "Resource Management", icon: HandCoins, disabled: true },
      { id: "house-keeping", label: "House Keeping", icon: Wrench, disabled: true },
      { id: "workspace-layout", label: "Workspace Layout", icon: LayoutDashboard, disabled: true },
    ],
  },
  {
    id: "sales-department",
    label: "Sales Department",
    icon: BriefcaseBusiness,
    defaultOpen: false,
    children: [
      { id: "leads-management", label: "Leads Management", icon: Magnet, disabled: true },
      { id: "tenant-companies-sales", label: "Tenant Companies", icon: Building2, disabled: true },
      { id: "plans-pricing", label: "Plans & Pricing", icon: Tag, disabled: true },
      { id: "sales-architecture", label: "Sales Architecture", icon: ShoppingCart, disabled: true },
    ],
  },
  {
    id: "finance-department",
    label: "Finance Department",
    icon: Wallet,
    defaultOpen: false,
    children: [
      { id: "finance-budget", label: "Finance & Budget", icon: Wallet, disabled: true },
      { id: "billing-payments", label: "Billing & Payments", icon: Receipt, disabled: true },
      { id: "accounting", label: "Accounting", icon: Calculator, disabled: true },
    ],
  },
  {
    id: "maintenance-department",
    label: "Maintenance Department",
    icon: Wrench,
    defaultOpen: false,
    children: [
      { id: "maintenance-repair-logs", label: "Maintenance Repair Logs", icon: ScanSearch, disabled: true },
      { id: "amc-maintenance-scheduler", label: "AMC Maintenance Scheduler", icon: CalendarClock, disabled: true },
    ],
  },
  {
    id: "tech-department",
    label: "Tech Department",
    icon: Laptop,
    defaultOpen: false,
    children: [{ id: "tech-website-builder", label: "Website Builder", icon: Globe, route: "/company-settings/website-builder" }],
  },
  {
    id: "it-department",
    label: "IT Department",
    icon: MonitorCog,
    defaultOpen: false,
    children: [{ id: "it-repair-logs", label: "IT Repair Logs", icon: FileSearch, disabled: true }],
  },
];

const generalData: NavNode[] = [
  { id: "profile", label: "Profile", icon: User, route: "/profile/company-profile" },
  { id: "logout", label: "Sign Out", icon: LogOut, isRed: true, route: "/sign-out" },
];

const ROUTE_BY_ID: Record<string, string> = {
  dashboard: "/dashboard",
  "customer-support": "/company-settings/customer-support",
  "website-builder": "/company-settings/website-builder",
  "wono-nomad": "/company-settings/wono-nomad",
  "website-leads": "/company-settings/website-builder/leads",
  "organization-management": "/company-settings/organization-management",
  "access-grants": "/company-settings/access-grants",
  "workspace-settings": "/company-settings/workspace-settings",
  "workspace-management": "/company-settings/workspace-management",
  "visitor-management": "/visitors/visitor-management",
  "visitors-management": "/visitors/visitor-management",
  profile: "/profile/company-profile",
};

const ICON_BY_ID: Record<string, ElementType> = {
  dashboard: LayoutDashboard,
  "customer-support": MessageSquareCode,
  attendance: Clock,
  tasks: ListChecks,
  tickets: Ticket,
  "leave-requests": CalendarClock,
  "meeting-room-system": Presentation,
  "chat-bot": CalendarClock,
  assets: Package,
  inventory: Warehouse,
  "finance-management": Wallet,
  reports: FileChartColumn,
  "website-builder": Globe,
  "wono-nomad": ShieldCheck,
  "website-leads": NotebookText,
  "organization-management": Building,
  "module-management": Boxes,
  "access-grants": UserCog,
  "workspace-settings": Settings,
  "workspace-management": MonitorCog,
  analytics: BarChart,
  "visitor-management": ContactRound,
  "visitors-management": ContactRound,
  "hr-department": Users,
  "administration-department": Building2,
  "sales-department": BriefcaseBusiness,
  "finance-department": Wallet,
  "maintenance-department": Wrench,
  "tech-department": Laptop,
  "it-department": MonitorCog,
  "employee-management": Users,
  "hr-documents": NotebookText,
  recruitment: UserPlus,
  "leave-request-processing": CalendarCheck,
  "attendance-review": ClipboardCheck,
  "payroll-management": Wallet,
  "exit-management": UserMinus,
  "tenant-companies-admin": Building2,
  bookings: Bed,
  "resource-management": HandCoins,
  "house-keeping": Wrench,
  "workspace-layout": LayoutDashboard,
  "leads-management": Magnet,
  "tenant-companies-sales": Building2,
  "plans-pricing": Tag,
  "sales-architecture": ShoppingCart,
  "finance-budget": Wallet,
  "billing-payments": Receipt,
  accounting: Calculator,
  "maintenance-repair-logs": ScanSearch,
  "amc-maintenance-scheduler": CalendarClock,
  "tech-website-builder": Globe,
  "it-repair-logs": FileSearch,
  profile: User,
  logout: LogOut,
};

const BASIC_PLAN_HARD_LOCK_IDS = new Set([
  "workspace-settings",
  "workspace-management",
]);

const normalizeRole = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const normalizeModuleToken = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

const NavItem = ({
  icon: Icon,
  label,
  collapsed,
  depth = 0,
  hasChildren,
  isOpen,
  onClick,
  isRed,
  isActive,
  disabled,
  locked,
  unavailable,
  disabledTitle,
  forceBold,
  forceSmall,
}: NavItemProps) => (
  <button
    type="button"
    title={disabled ? (disabledTitle || "Coming soon") : ""}
    className={`w-full flex items-center justify-between py-2 px-3 select-none rounded-md transition-colors ${
      isActive ? "bg-gray-200 font-medium" : "hover:bg-gray-200"
    } ${isRed ? "text-red-500 hover:text-red-600" : "text-gray-700 hover:text-gray-900"} ${
      locked ? "opacity-75 cursor-not-allowed" : unavailable ? "cursor-default" : "cursor-pointer"
    }`}
    style={{ paddingLeft: `${depth * 1.25 + 0.75}rem` }}
    onClick={onClick}
  >
    <span className="flex items-center gap-3 min-w-0">
      {Icon && <Icon size={16} className={isRed ? "text-red-500" : "text-gray-500"} />}
      {!collapsed && (
        <span
          className={`${forceSmall ? "text-[10px]" : "text-[12px]"} truncate ${forceBold ? "font-pbold" : "font-pmedium"}`}
        >
          {label.toUpperCase()}
        </span>
      )}
    </span>
    {!collapsed && hasChildren && (isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />)}
    {!collapsed && locked && !hasChildren && <Lock size={12} className="text-gray-400" />}
  </button>
);

interface NavGroupProps {
  item: NavNode;
  collapsed: boolean;
  depth?: number;
  pathname: string;
  onNavigate: (item: NavNode) => void;
}

const NavGroup = ({ item, collapsed, depth = 0, pathname, onNavigate }: NavGroupProps) => {
  const [isOpen, setIsOpen] = useState(item.defaultOpen !== false);
  const hasChildren = Boolean(item.children?.length);
  const isActive = (() => {
    if (!item.route) return false;
    if (item.id === "website-builder") {
      return pathname === "/company-settings/website-builder";
    }
    return pathname.startsWith(item.route);
  })();

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen((prev) => !prev);
      return;
    }
    onNavigate(item);
  };

  return (
    <div>
      <NavItem
        icon={item.icon}
        label={item.label}
        collapsed={collapsed}
        depth={depth}
        hasChildren={hasChildren}
        isOpen={isOpen}
        onClick={handleClick}
        isRed={item.isRed}
        isActive={isActive}
        disabled={item.disabled || !item.route}
        locked={Boolean(item.disabled)}
        unavailable={!item.route}
        disabledTitle={item.disabledTitle}
        forceBold={hasChildren}
        forceSmall={!hasChildren && depth > 0}
      />
      {hasChildren && isOpen && !collapsed && (
        <div className="mt-1 flex flex-col gap-1">
          {item.children?.map((child) => (
            <NavGroup
              key={child.id}
              item={child}
              collapsed={collapsed}
              depth={depth + 1}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function Sidebar({ onCloseDrawer }: SidebarProps) {
  const { isSidebarOpen } = useSidebar();
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const collapsed = !isSidebarOpen;
  const navigate = useNavigate();
  const logout = useLogout();
  const location = useLocation();
  const [workspaceAccessMap, setWorkspaceAccessMap] = useState<WorkspaceAccessMapState | null>(null);
  const [roleAccessContext, setRoleAccessContext] = useState<RoleAccessContext>({
    role: "",
    departments: [],
    grantedModules: [],
  });
  const workspaceSetup = readWorkspaceSetup();

  useEffect(() => {
    let active = true;

    const loadSidebarData = async () => {
      try {
        const [moduleMapResult, orgResult] = await Promise.allSettled([
          axiosPrivate.get("/api/workspaces/module-access-map"),
          axiosPrivate.get("/api/organization/overview"),
        ]);

        const payload =
          moduleMapResult.status === "fulfilled"
            ? moduleMapResult.value?.data?.data || {}
            : {};
        const orgPayload =
          orgResult.status === "fulfilled" ? orgResult.value?.data?.data || {} : {};
        const teamMembers = Array.isArray(orgPayload?.teamMembers) ? orgPayload.teamMembers : [];
        const currentUserId = String(
          (auth.user as { id?: string; _id?: string } | null)?.id ||
          (auth.user as { id?: string; _id?: string } | null)?._id ||
          "",
        ).trim();
        const currentUserEmail = String(
          (auth.user as { email?: string } | null)?.email || "",
        )
          .trim()
          .toLowerCase();
        const me = teamMembers.find((member: any) => {
          const memberUserId = String(member?.userId || member?.id || "").trim();
          const memberEmail = String(member?.email || "")
            .trim()
            .toLowerCase();
          return (
            (memberUserId && memberUserId === currentUserId) ||
            (currentUserEmail && memberEmail === currentUserEmail)
          );
        }) || null;
        if (!active) return;
        if (moduleMapResult.status === "fulfilled") {
          setWorkspaceAccessMap({
            selectedPlan: payload?.selectedPlan || "basic",
            enabledModuleIds: Array.isArray(payload?.enabledModuleIds)
              ? payload.enabledModuleIds
              : [],
            currentMemberGrantedModules: Array.isArray(payload?.currentMemberGrantedModules)
              ? payload.currentMemberGrantedModules
              : [],
            moduleMap: payload?.moduleMap || { sections: [] },
          });
        }
        setRoleAccessContext({
          role: String(
            me?.role ||
            (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)?.workspaceMembership?.role ||
            (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)?.role ||
            "",
          ),
          departments: Array.isArray(me?.departmentNames) ? me.departmentNames : [],
          grantedModules:
            Array.isArray(payload?.currentMemberGrantedModules) &&
            payload.currentMemberGrantedModules.length > 0
              ? payload.currentMemberGrantedModules
              : Array.isArray(me?.grantedModules) && me.grantedModules.length > 0
                ? me.grantedModules
                : [],
        });
      } catch {
        // Fallback remains local storage driven.
        if (!active) return;
        setRoleAccessContext({
          role: String(
            (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)?.workspaceMembership?.role ||
            (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)?.role ||
            "",
          ),
          departments: [],
          grantedModules: [],
        });
      }
    };

    void loadSidebarData();
    const refresh = () => {
      void loadSidebarData();
    };
    const intervalId = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [axiosPrivate, auth.user]);

  const planLabel =
    workspaceAccessMap?.selectedPlan || workspaceSetup.selectedPlan || "basic";
  const workspaceCount = getWorkspaceCount(
    (auth.user as { workspaceCount?: number } | null)?.workspaceCount,
  );
  const currentRole = normalizeRole(roleAccessContext.role);
  const isFounderRole = currentRole === "founder" || currentRole === "owner";
  const isSuperAdminRole = currentRole === "super_admin";
  const isWorkspaceManagementUnlocked =
    planLabel === "professional" && workspaceCount > 1;
  const enabledIds = new Set([
    ...getEnabledModuleIdsForPlan(planLabel, workspaceCount),
    ...(workspaceAccessMap?.enabledModuleIds || workspaceSetup.enabledModuleIds || []),
  ]);

  const applyEnabledState = (items: NavNode[]): NavNode[] =>
    items.map((item) => {
      const hasChildren = Boolean(item.children?.length);
      if (hasChildren) {
        return {
          ...item,
          children: applyEnabledState(item.children || []),
        };
      }
      if (!item.disabled) return item;
      if (isModuleLockedForPlan(planLabel, item.id)) {
        return {
          ...item,
          disabled: true,
        };
      }
      if (item.id === "workspace-management" && !isFounderRole) {
        return {
          ...item,
          disabled: true,
          disabledTitle: "Upgrade plan to unlock this",
        };
      }
      if (item.id === "workspace-management" && !isWorkspaceManagementUnlocked) {
        return {
          ...item,
          disabled: true,
          disabledTitle: "Upgrade plan to unlock this",
        };
      }
      return {
        ...item,
        disabled: !enabledIds.has(item.id),
      };
    });

  const sortEnabledFirst = (items: NavNode[]): NavNode[] => {
    const withSortedChildren = items.map((item) => ({
      ...item,
      children: item.children ? sortEnabledFirst(item.children) : item.children,
    }));

    return withSortedChildren.sort((a, b) => {
      const aEnabled = !a.disabled;
      const bEnabled = !b.disabled;
      if (aEnabled === bEnabled) return 0;
      return aEnabled ? -1 : 1;
    });
  };

  const companySettingsItems = sortEnabledFirst(applyEnabledState(companySettingsData));
  const keyAppsItems = sortEnabledFirst(applyEnabledState(keyAppsData));
  const departmentItems = sortEnabledFirst(applyEnabledState(departmentModules));

  const roleAllowedModuleIds = useMemo(() => {
    const sections = Array.isArray(workspaceAccessMap?.moduleMap?.sections)
      ? workspaceAccessMap.moduleMap.sections
      : [];

    const canonicalIds = new Set<string>();
    const aliasToCanonical = new Map<string, string>();

    sections.forEach((section) => {
      (Array.isArray(section?.items) ? section.items : []).forEach((item) => {
        const addAlias = (id: string, label?: string, route?: string) => {
          const canonical = String(id || "").trim();
          if (!canonical) return;
          canonicalIds.add(canonical);
          aliasToCanonical.set(normalizeModuleToken(canonical), canonical);
          if (label) aliasToCanonical.set(normalizeModuleToken(label), canonical);
          if (route) {
            const routeToken = String(route || "").trim().split("/").filter(Boolean).join("-");
            if (routeToken) aliasToCanonical.set(normalizeModuleToken(routeToken), canonical);
          }
        };

        addAlias(String(item?.id || ""), String(item?.label || ""), String(item?.route || ""));
        (Array.isArray(item?.tabs) ? item.tabs : []).forEach((tab) => {
          addAlias(String(tab?.id || ""), String(tab?.label || ""), String(tab?.route || ""));
        });
      });
    });

    const grantedEnabled = (roleAccessContext.grantedModules || [])
      .map((item) => String(item || "").trim())
      .filter((item) => item && !item.toLowerCase().startsWith("disabled:"))
      .map((item) => {
        // Always prefer exact canonical ids from DB over label aliases.
        if (canonicalIds.has(item)) return item;
        const normalized = normalizeModuleToken(item);
        const direct = aliasToCanonical.get(normalized);
        if (direct) return direct;

        // Handle department-prefixed grants such as "administration-visitor-management".
        if (normalized.startsWith("administration-")) {
          const withoutPrefix = normalized.slice("administration-".length);
          const adminVisitor = aliasToCanonical.get("visitors-management");
          if (withoutPrefix === "visitor-management" && adminVisitor) {
            return adminVisitor;
          }
          const prefixedMatch = aliasToCanonical.get(withoutPrefix);
          if (prefixedMatch) return prefixedMatch;
        }

        // Handle shorthand grant ids such as "housekeeping".
        if (normalized === "housekeeping") {
          const housekeeping = aliasToCanonical.get("house-keeping");
          if (housekeeping) return housekeeping;
        }

        // Generic fallback: strip first segment for custom prefixed ids.
        const segments = normalized.split("-").filter(Boolean);
        if (segments.length > 1) {
          const stripped = segments.slice(1).join("-");
          const strippedMatch = aliasToCanonical.get(stripped);
          if (strippedMatch) return strippedMatch;
        }

        return item;
      })
      .filter((item) => canonicalIds.has(item));

    if (isFounderRole || isSuperAdminRole) {
      return new Set<string>(canonicalIds);
    }

    const allowed = new Set<string>(grantedEnabled);
    if (planLabel === "basic") {
      allowed.delete("workspace-settings");
      allowed.delete("workspace-management");
    }

    return allowed;
  }, [
    roleAccessContext.grantedModules,
    workspaceAccessMap?.enabledModuleIds,
    workspaceAccessMap?.moduleMap?.sections,
    planLabel,
  ]);

  const workspaceEnabledCanonicalIds = useMemo(() => {
    const sections = Array.isArray(workspaceAccessMap?.moduleMap?.sections)
      ? workspaceAccessMap.moduleMap.sections
      : [];
    const aliasToCanonical = new Map<string, string>();
    const canonicalIds = new Set<string>();

    const addAlias = (id: string, label?: string, route?: string) => {
      const canonical = String(id || "").trim();
      if (!canonical) return;
      canonicalIds.add(canonical);
      aliasToCanonical.set(normalizeModuleToken(canonical), canonical);
      if (label) aliasToCanonical.set(normalizeModuleToken(label), canonical);
      if (route) {
        const routeToken = String(route || "").trim().split("/").filter(Boolean).join("-");
        if (routeToken) aliasToCanonical.set(normalizeModuleToken(routeToken), canonical);
      }
    };

    sections.forEach((section) => {
      (Array.isArray(section?.items) ? section.items : []).forEach((item) => {
        addAlias(String(item?.id || ""), String(item?.label || ""), String(item?.route || ""));
        (Array.isArray(item?.tabs) ? item.tabs : []).forEach((tab) => {
          addAlias(String(tab?.id || ""), String(tab?.label || ""), String(tab?.route || ""));
        });
      });
    });

    const resolveCanonical = (raw: string) => {
      const rawTrimmed = String(raw || "").trim();
      if (canonicalIds.has(rawTrimmed)) return rawTrimmed;
      const normalized = normalizeModuleToken(raw);
      const direct = aliasToCanonical.get(normalized);
      if (direct) return direct;
      if (normalized.startsWith("administration-")) {
        const withoutPrefix = normalized.slice("administration-".length);
        const adminVisitor = aliasToCanonical.get("visitors-management");
        if (withoutPrefix === "visitor-management" && adminVisitor) return adminVisitor;
        const prefixedMatch = aliasToCanonical.get(withoutPrefix);
        if (prefixedMatch) return prefixedMatch;
      }
      if (normalized === "housekeeping") {
        const housekeeping = aliasToCanonical.get("house-keeping");
        if (housekeeping) return housekeeping;
      }
      const segments = normalized.split("-").filter(Boolean);
      if (segments.length > 1) {
        const stripped = segments.slice(1).join("-");
        const strippedMatch = aliasToCanonical.get(stripped);
        if (strippedMatch) return strippedMatch;
      }
      return String(raw || "").trim();
    };

    const enabledRaw = (workspaceAccessMap?.enabledModuleIds || workspaceSetup.enabledModuleIds || [])
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    return new Set(
      enabledRaw
        .map(resolveCanonical)
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    );
  }, [workspaceAccessMap?.enabledModuleIds, workspaceAccessMap?.moduleMap?.sections, workspaceSetup.enabledModuleIds]);

  const mappedSections: Array<{ key: string; title: string; items: NavNode[] }> = (
    workspaceAccessMap?.moduleMap?.sections || []
  ).map((section) => {
    const mappedItems: NavNode[] = (section?.items || []).map((item) => {
      const itemId = String(item?.id || "").trim();
      const itemRoute = item?.route || ROUTE_BY_ID[itemId];
      const hasTabs = Array.isArray(item?.tabs) && item.tabs.length > 0;
      if (hasTabs) {
        const children = (item.tabs || [])
          .map((tab) => {
            const tabId = String(tab?.id || "").trim();
            const tabRoute = tab?.route || ROUTE_BY_ID[tabId];
            const unlocked = workspaceEnabledCanonicalIds.has(tabId) && roleAllowedModuleIds.has(tabId);
            return {
              id: tabId,
              label: String(tab?.label || tabId),
              icon: ICON_BY_ID[tabId] || Boxes,
              route: tabRoute,
              disabled: !unlocked,
            };
          });
        return {
          id: itemId,
          label: String(item?.label || itemId),
          icon: ICON_BY_ID[itemId] || Boxes,
          defaultOpen: false,
          children,
        };
      }
      const basicPlanLocked = planLabel === "basic" && BASIC_PLAN_HARD_LOCK_IDS.has(itemId);
      return {
        id: itemId,
        label: String(item?.label || itemId),
        icon: ICON_BY_ID[itemId] || Boxes,
        route: itemRoute,
        disabled: basicPlanLocked || !(workspaceEnabledCanonicalIds.has(itemId) && roleAllowedModuleIds.has(itemId)),
      };
    }).filter(Boolean);
    const sectionKey = String(section?.sectionId || section?.sectionLabel || "section");
    let sortedItems = sortEnabledFirst(mappedItems);
    if (sectionKey === "department-accesses") {
      // Prioritize departments with more granted+enabled tabs.
      sortedItems = [...sortedItems].sort((a, b) => {
        const countUnlocked = (node: NavNode) =>
          Array.isArray(node.children)
            ? node.children.filter((child) => !child.disabled).length
            : node.disabled
              ? 0
              : 1;
        const delta = countUnlocked(b) - countUnlocked(a);
        if (delta !== 0) return delta;
        return a.label.localeCompare(b.label);
      });
    }

    return {
      key: sectionKey,
      title: String(section?.sectionLabel || "Section"),
      items: sortedItems,
    };
  }).filter((section) => section.items.length > 0);

  const onNavigate = (item: NavNode) => {
    if (item.id === "logout") {
      void logout();
      if (onCloseDrawer) onCloseDrawer();
      return;
    }
    if (!item.route || item.disabled) return;
    navigate(item.route);
    if (onCloseDrawer) onCloseDrawer();
  };

  return (
    <div
      className={`${
        collapsed ? "w-16" : "w-64"
      } h-[90vh] bg-[#f3f4f6] flex flex-col border-r border-gray-200 shadow-sm overflow-hidden transition-all duration-100`}
    >
      <div className="px-4 py-3 flex justify-center">
        <span className="text-[10px] font-bold tracking-wider text-gray-600 bg-gray-200 px-3 py-1 rounded-full uppercase">
          {collapsed ? planLabel[0].toUpperCase() : `Plan - ${planLabel}`}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-5 hideScrollBar">
        {(mappedSections.length > 0 ? mappedSections : [
          { key: "company-settings", title: "Company Settings", items: companySettingsItems },
          { key: "key-apps", title: "Key Apps", items: keyAppsItems },
          { key: "department-accesses", title: "Department Accesses", items: departmentItems },
        ]).map((section) => (
          <div key={section.key}>
            {!collapsed && (
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-[12px] font-pbold text-gray-500 tracking-wider uppercase">
                  {section.title}
                </span>
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavGroup
                  key={`${section.key}-${item.id}`}
                  item={item}
                  collapsed={collapsed}
                  pathname={location.pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}

        <div>
          {!collapsed && (
            <div className="flex items-center justify-center px-3 mb-2">
              <div className="h-px bg-gray-300 flex-1" />
              <span className="text-[10px] font-pbold text-gray-500 tracking-wider px-2">General</span>
              <div className="h-px bg-gray-300 flex-1" />
            </div>
          )}
          <div className="space-y-1">
            {generalData.map((item) => (
              <NavGroup
                key={item.id}
                item={item}
                collapsed={collapsed}
                pathname={location.pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 hover:bg-gray-200 cursor-pointer transition-colors mt-auto">
        <div className="flex items-center gap-3 text-gray-700">
          <Handshake size={16} className="text-gray-500" />
          {!collapsed && <span className="text-xs font-medium">Become a Contributor</span>}
        </div>
      </div>
    </div>
  );
}
