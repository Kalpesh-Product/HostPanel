import { useState } from "react";
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
import useLogout from "../hooks/useLogout";
import {
  getEnabledModuleIdsForPlan,
  getWorkspaceCount,
} from "../utils/workspacePlanAccess";

type PlanType = "basic" | "professional" | "custom";

interface NavNode {
  id: string;
  label: string;
  icon?: ElementType;
  route?: string;
  isRed?: boolean;
  disabled?: boolean;
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
  forceBold?: boolean;
  forceSmall?: boolean;
}

interface WorkspaceSetupState {
  selectedPlan?: PlanType;
  enabledModuleIds?: string[];
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
  { id: "nomad-listing", label: "Nomad Listing", icon: ShieldCheck, route: "/company-settings/nomad-listings" },
  { id: "website-leads", label: "Website Leads", icon: NotebookText, route: "/company-settings/website-builder/leads" },
  { id: "reviews", label: "Reviews", icon: ClipboardCheck, route: "/company-reviews" },
  { id: "organization-management", label: "Organization Management", icon: Building, route: "/company-settings/organization-management" },
  { id: "module-management", label: "Module Management", icon: Boxes, disabled: true },
  { id: "access-grants", label: "Access Grants", icon: UserCog, route: "/company-settings/access-grants" },
  { id: "workspace-settings", label: "Workspace Settings", icon: Settings, disabled: true },
  { id: "workspace-management", label: "Workspace Management", icon: MonitorCog, disabled: true },
  { id: "analytics", label: "Analytics", icon: BarChart, disabled: true },
];

const keyAppsData: NavNode[] = [
  { id: "attendance", label: "Attendance", icon: Clock, disabled: true },
  { id: "tasks", label: "Tasks", icon: ListChecks, disabled: true },
  { id: "tickets", label: "Tickets", icon: Ticket, disabled: true },
  { id: "leave-requests", label: "Leave Requests", icon: CalendarClock, disabled: true },
  { id: "meeting-room-system", label: "Meeting Room System", icon: Presentation, disabled: true },
  { id: "visitor-management", label: "Visitor Management", icon: ContactRound, disabled: true },
  { id: "assets", label: "Assets", icon: Package, disabled: true },
  { id: "inventory", label: "Inventory", icon: Warehouse, disabled: true },
  { id: "finance-management", label: "Finance Management", icon: Wallet, disabled: true },
  { id: "chat-bot", label: "Chat Bot", icon: MessageSquareCode, disabled: true },
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
      { id: "visitors-management", label: "Visitors Management", icon: ContactRound, disabled: true },
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
  { id: "profile", label: "Profile", icon: User, route: "/profile/my-profile" },
  { id: "logout", label: "Sign Out", icon: LogOut, isRed: true, route: "/sign-out" },
];

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
  forceBold,
  forceSmall,
}: NavItemProps) => (
  <button
    type="button"
    title={disabled ? "Coming soon" : ""}
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
          {label}
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
  const collapsed = !isSidebarOpen;
  const navigate = useNavigate();
  const logout = useLogout();
  const location = useLocation();
  const [isCompanySettingsOpen, setIsCompanySettingsOpen] = useState(false);
  const [isKeyAppsOpen, setIsKeyAppsOpen] = useState(false);
  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);
  const workspaceSetup = readWorkspaceSetup();
  const planLabel = workspaceSetup.selectedPlan || "basic";
  const workspaceCount = getWorkspaceCount(
    (auth.user as { workspaceCount?: number } | null)?.workspaceCount,
  );
  const enabledIds = new Set([
    ...getEnabledModuleIdsForPlan(planLabel, workspaceCount),
    ...(workspaceSetup.enabledModuleIds || []),
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
      return {
        ...item,
        disabled: !enabledIds.has(item.id),
      };
    });

  const companySettingsItems = applyEnabledState(companySettingsData);
  const keyAppsItems = applyEnabledState(keyAppsData);
  const departmentItems = applyEnabledState(departmentModules);

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
        <div className="space-y-1">
          <NavItem
            icon={LayoutDashboard}
            label="Dashboard"
            collapsed={collapsed}
            isActive={location.pathname === "/company-settings"}
            onClick={() => onNavigate({ id: "dashboard", label: "Dashboard", route: "/company-settings" })}
          />
          {!collapsed && (
            <div
              className="flex items-center justify-between px-3 mb-2 cursor-pointer"
              onClick={() => setIsCompanySettingsOpen((prev) => !prev)}
            >
              <span className="text-[12px] font-pbold text-gray-500 tracking-wider uppercase">Company Settings</span>
              {isCompanySettingsOpen ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
            </div>
          )}
          {(isCompanySettingsOpen || collapsed) && (
            <div className="space-y-1">
              {companySettingsItems.map((item) => (
                <NavGroup
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                  pathname={location.pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          {!collapsed && (
            <div
              className="flex items-center justify-between px-3 mb-2 cursor-pointer"
              onClick={() => setIsKeyAppsOpen((prev) => !prev)}
            >
              <span className="text-[12px] font-pbold text-gray-500 tracking-wider uppercase">Key Apps</span>
              {isKeyAppsOpen ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
            </div>
          )}
          {(isKeyAppsOpen || collapsed) && (
            <div className="space-y-1">
              {keyAppsItems.map((item) => (
                <NavGroup
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                  pathname={location.pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          {!collapsed && (
            <div
              className="flex items-center justify-between px-3 mb-2 cursor-pointer"
              onClick={() => setIsDepartmentOpen((prev) => !prev)}
            >
              <span className="text-[12px] font-pbold text-gray-500 tracking-wider uppercase">Department Accesses</span>
              {isDepartmentOpen ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
            </div>
          )}
          {(isDepartmentOpen || collapsed) && (
            <div className="space-y-1">
              {departmentItems.map((item) => (
                <NavGroup
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                  pathname={location.pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </div>

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
