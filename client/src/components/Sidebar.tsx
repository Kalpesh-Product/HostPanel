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

const COMMON_MODULE_IDS = new Set([
  "dashboard",
  "customer-support",
  "attendance",
  "tasks",
  "tickets",
  "leave-requests",
  "meeting-room-system",
  "chat-bot",
]);

const EXTRA_COMMON_MODULE_IDS = new Set([
  "assets",
  "inventory",
  "finance-management",
  "reports",
]);

const DEPARTMENT_GROUP_BY_KEY: Record<string, string> = {
  hr: "hr-department",
  administration: "administration-department",
  sales: "sales-department",
  finance: "finance-department",
  maintenance: "maintenance-department",
  technology: "tech-department",
  tech: "tech-department",
  it: "it-department",
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

const resolveDepartmentKey = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("administration") || normalized === "admin") return "administration";
  if (normalized.includes("sales")) return "sales";
  if (normalized.includes("finance") || normalized.includes("accounting")) return "finance";
  if (normalized.includes("maintenance") || normalized.includes("facilities")) return "maintenance";
  if (normalized.includes("technology") || normalized.includes("tech")) return "technology";
  if (normalized === "it" || normalized.includes("information technology")) return "it";
  if (normalized.includes("hr")) return "hr";
  return normalized.replace(/\s+/g, "-");
};

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
      disabled ? "opacity-75 cursor-not-allowed" : "cursor-pointer"
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
    {!collapsed && disabled && !hasChildren && <Lock size={12} className="text-gray-400" />}
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
        const [moduleMapRes, orgRes] = await Promise.all([
          axiosPrivate.get("/api/workspaces/module-access-map"),
          axiosPrivate.get("/api/organization/overview"),
        ]);
        const payload = moduleMapRes?.data?.data || {};
        const orgPayload = orgRes?.data?.data || {};
        const teamMembers = Array.isArray(orgPayload?.teamMembers) ? orgPayload.teamMembers : [];
        const currentUserId = String(
          (auth.user as { id?: string; _id?: string } | null)?.id ||
          (auth.user as { id?: string; _id?: string } | null)?._id ||
          "",
        ).trim();
        const me = teamMembers.find((member: any) => {
          const memberUserId = String(member?.userId || member?.id || "").trim();
          return memberUserId && memberUserId === currentUserId;
        });
        if (!active) return;
        setWorkspaceAccessMap({
          selectedPlan: payload?.selectedPlan || "basic",
          enabledModuleIds: Array.isArray(payload?.enabledModuleIds)
            ? payload.enabledModuleIds
            : [],
          moduleMap: payload?.moduleMap || { sections: [] },
        });
        setRoleAccessContext({
          role: String(
            me?.role ||
            (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)?.workspaceMembership?.role ||
            (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)?.role ||
            "",
          ),
          departments: Array.isArray(me?.departmentNames) ? me.departmentNames : [],
          grantedModules: Array.isArray(me?.grantedModules) ? me.grantedModules : [],
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
    return () => {
      active = false;
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
  const isAdminRole = currentRole === "admin" || currentRole === "admin_manager";
  const isManagerRole = currentRole === "manager";
  const isEmployeeRole = !(isFounderRole || isSuperAdminRole || isAdminRole || isManagerRole);
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
      const aEnabled = Boolean(a.route) && !a.disabled;
      const bEnabled = Boolean(b.route) && !b.disabled;
      if (aEnabled === bEnabled) return 0;
      return aEnabled ? -1 : 1;
    });
  };

  const companySettingsItems = sortEnabledFirst(applyEnabledState(companySettingsData));
  const keyAppsItems = sortEnabledFirst(applyEnabledState(keyAppsData));
  const departmentItems = sortEnabledFirst(applyEnabledState(departmentModules));

  const roleAllowedModuleIds = useMemo(() => {
    const allowed = new Set<string>();
    const workspaceEnabled = new Set(
      (workspaceAccessMap?.enabledModuleIds || []).map((id) => String(id || "").trim()).filter(Boolean),
    );
    const granted = (roleAccessContext.grantedModules || [])
      .map((item) => String(item || "").trim())
      .filter((item) => item && !item.startsWith("disabled:"));

    if (isFounderRole) {
      workspaceEnabled.forEach((id) => allowed.add(id));
      return allowed;
    }

    if (isSuperAdminRole) {
      // Super Admin access is founder-controlled:
      // only modules enabled at workspace level AND granted to this user.
      granted
        .filter((id) => workspaceEnabled.has(id))
        .forEach((id) => allowed.add(id));

      if (planLabel === "basic") {
        allowed.delete("workspace-settings");
        allowed.delete("workspace-management");
      }
      return allowed;
    }

    COMMON_MODULE_IDS.forEach((id) => allowed.add(id));
    EXTRA_COMMON_MODULE_IDS.forEach((id) => allowed.add(id));

    if (isAdminRole || isManagerRole) {
      const departmentKeys = (roleAccessContext.departments || [])
        .map((name) => resolveDepartmentKey(name))
        .filter(Boolean);
      departmentKeys.forEach((key) => {
        const groupId = DEPARTMENT_GROUP_BY_KEY[key];
        if (groupId) allowed.add(groupId);
      });
    }

    // Founder can grant any additional enabled modules/tabs to anyone.
    granted.forEach((id) => allowed.add(id));

    if (isEmployeeRole) {
      return allowed;
    }

    return allowed;
  }, [
    isFounderRole,
    isSuperAdminRole,
    isAdminRole,
    isManagerRole,
    isEmployeeRole,
    roleAccessContext.departments,
    roleAccessContext.grantedModules,
    workspaceAccessMap?.enabledModuleIds,
    planLabel,
  ]);

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
            const unlocked = tab?.unlockedInWorkspace && roleAllowedModuleIds.has(tabId);
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
        disabled: basicPlanLocked || !(item?.unlockedInWorkspace && roleAllowedModuleIds.has(itemId)),
      };
    }).filter(Boolean);
    return {
      key: String(section?.sectionId || section?.sectionLabel || "section"),
      title: String(section?.sectionLabel || "Section"),
      items: sortEnabledFirst(mappedItems),
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
