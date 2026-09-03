import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useState } from "react";
import type { ElementType } from "react";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  LayoutDashboard,
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
  ListChecks,
  Ticket,
  CalendarClock,
  Calendar,
  Presentation,
  ContactRound,
  Warehouse,
  Box,
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
  Laptop,
  FileSearch,
  User,
  LogOut,
  Handshake,
  Lock,
  X,
  FileText,
  History,
  UserCheck,
  Banknote,
  CreditCard,
  PiggyBank,
  Landmark,
  WalletCards,
  KeyRound,
  Sparkles,
  UserSquare,
  Store,
  Headphones,
  Server,
  Code2,
  CalendarDays,
  ClipboardList,
  CalendarPlus,
  SlidersHorizontal,
  LayoutGrid,
  Factory,
  UsersRound,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSidebar } from "../context/SideBarContext";
import useAuth from "../hooks/useAuth";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import useLogout from "../hooks/useLogout";
import PrimaryButton from "./PrimaryButton";
import Skeleton from "./ui/Skeleton";
import { PLAN_UI_DATA } from "../pages/WorkspaceSetup/workspaceSetupPlans";
import {
  getEnabledModuleIdsForPlan,
  getWorkspaceCount,
  isModuleLockedForPlan,
} from "../utils/workspacePlanAccess";
import { normalizeLegacyRoute } from "../utils/legacyRouteMap";
import { resolveDepartmentIcon } from "../utils/departmentIcons";

type PlanType = "basic" | "professional" | "custom";

interface NavNode {
  id: string;
  label: string;
  icon?: ElementType;
  route?: string;
  isRed?: boolean;
  disabled?: boolean;
  disabledTitle?: string;
  upgradeLocked?: boolean;
  defaultOpen?: boolean;
  children?: NavNode[];
  state?: Record<string, unknown>;
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
  tooltip?: string;
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
  addOnGrantedModules: string[];
}

interface WorkspaceDepartmentAccess {
  id: string;
  name: string;
  moduleIds: string[];
}

const MASTER_PANEL_BASE_URL = String(import.meta.env.VITE_MASTER_PANEL_BE_URL || "").trim() || "https://masterpanel.wono.co";

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
  { id: "website-builder", label: "Website Builder", icon: Globe, route: "/key-apps/website-builder" },
  { id: "wono-nomad", label: "Wono Nomads", icon: ShieldCheck, route: "/key-apps/wono-nomad" },
  { id: "organization-management", label: "Organization Management", icon: Building, route: "/core-modules/organization-management" },
  { id: "module-management", label: "Module Management", icon: Boxes, disabled: true },
  { id: "access-grants", label: "Access Grants", icon: UserCog, route: "/core-modules/access-grants" },
  { id: "unit-settings", label: "Unit Settings", icon: SlidersHorizontal, route: "/core-modules/workspace-settings", disabled: true },
  { id: "unit-management", label: "Unit Management", icon: LayoutGrid, route: "/core-modules/workspace-management", disabled: true },
  { id: "customer-support", label: "Customer Support", icon: Headphones, route: "/common-modules/customer-support" },
];

const keyAppsData: NavNode[] = [
  { id: "website-builder", label: "Website Builder", icon: Globe, route: "/key-apps/website-builder", disabled: false },
  { id: "wono-nomad", label: "Nomad Listings", icon: ShieldCheck, route: "/key-apps/wono-nomad", disabled: false },
  { id: "website-leads", label: "All Leads", icon: Magnet, route: "/key-apps/all-leads", disabled: false },
  { id: "visitor-management", label: "Visitor Management", icon: ContactRound, route: "/visitors/visitor-management", disabled: false },
];

const departmentModules: NavNode[] = [
  {
    id: "hr-department",
    label: "HR Department",
    icon: Users,
    defaultOpen: false,
    children: [
      { id: "employee-management", label: "Company Management", icon: UserSquare, route: "/department-accesses/hr-department/company-management", disabled: false },
      { id: "hr-documents", label: "Documents", icon: FileText, route: "/department-accesses/hr-department/documents", disabled: false },
      { id: "recruitment", label: "Recruitment", icon: UserPlus, route: "/department-accesses/hr-department/recruitment", disabled: false },
      { id: "leave-request-processing", label: "Leave Request Processing", icon: CalendarCheck, route: "/department-accesses/hr-department/leave-request-processing", disabled: false },
      { id: "attendance-review", label: "Attendance Review", icon: ClipboardCheck, route: "/department-accesses/hr-department/attendance-review", disabled: false },
      { id: "payroll-management", label: "Payroll Management", icon: Banknote, route: "/department-accesses/hr-department/payroll-management", disabled: false },
      { id: "exit-management",      label: "Resignation Management",            icon: UserMinus,    route: "/department-accesses/hr-department/resignation-management", disabled: false },
    ],
  },
  {
    id: "administration-department",
    label: "Administration Department",
    icon: Building2,
    defaultOpen: false,
    children: [
      { id: "tenant-companies-admin", label: "Tenant Companies", icon: Store, route: "/department-accesses/administration-department/tenant-companies", disabled: false },
      { id: "bookings", label: "Bookings", icon: Bed, route: "/department-accesses/administration-department/bookings", disabled: false },
      {
        id: "visitors-management",
        label: "Visitors Management",
        icon: ContactRound,
        route: "/visitors/visitor-management",
        disabled: false,
      },
      { id: "resource-management", label: "Resource Management", icon: HandCoins, route: "/department-accesses/administration-department/resource-management", disabled: false },
      { id: "house-keeping", label: "House Keeping", icon: Sparkles, route: "/department-accesses/administration-department/house-keeping", disabled: false },
    ],
  },
  {
    id: "sales-department",
    label: "Sales Department",
    icon: BriefcaseBusiness,
    defaultOpen: false,
    children: [
      { id: "leads-management", label: "Leads Management", icon: Magnet, route: "/department-accesses/sales-department/leads-management", disabled: false },
      { id: "tenant-companies-sales", label: "Tenant Companies", icon: Store, route: "/department-accesses/sales-department/tenant-companies", disabled: false },
      { id: "virtual-office-sales", label: "Virtual Offices", icon: Building2, route: "/department-accesses/sales-department/virtual-offices", disabled: false },
      { id: "resource-pricing", label: "Resource & Pricing", icon: Tag, route: "/department-accesses/sales-department/resource-pricing", disabled: false },
      { id: "sales-architecture", label: "Sales Architecture", icon: ShoppingCart, route: "/department-accesses/sales-department/sales-architecture", disabled: false },
    ],
  },
  {
    id: "finance-department",
    label: "Finance Department",
    icon: WalletCards,
    defaultOpen: false,
    children: [
      { id: "finance-budget", label: "Finance & Budget", icon: PiggyBank, route: "/department-accesses/finance-department/expenses-budget", disabled: false },
      { id: "billing-payments", label: "Billing & Payments", icon: Receipt, route: "/department-accesses/finance-department/billing-payments", disabled: false },
      { id: "accounting", label: "Accounting", icon: Calculator, route: "/department-accesses/finance-department/accounting", disabled: false },
    ],
  },
  {
    id: "maintenance-department",
    label: "Maintenance Department",
    icon: Wrench,
    defaultOpen: false,
    children: [
      { id: "maintenance-repair-logs", label: "Maintenance Repair Logs", icon: ClipboardList, route: "/department-accesses/maintenance-department/repair-logs" },
      { id: "amc-maintenance-scheduler", label: "AMC Maintenance Scheduler", icon: CalendarClock, route: "/department-accesses/maintenance-department/amc-scheduler" },
    ],
  },
  {
    id: "tech-department",
    label: "Tech Department",
    icon: Laptop,
    defaultOpen: false,
    children: [
      { id: "tech-website-builder", label: "Website Builder", icon: Code2, route: "/key-apps/website-builder" },
      { id: "website-leads", label: "Website Leads", icon: NotebookText, route: "/key-apps/website-builder/leads" },
      { id: "website-review", label: "Website Review", icon: CheckCircle2, route: "/key-apps/website-builder/dynamic/reviews" },
    ],
  },
  {
    id: "it-department",
    label: "IT Department",
    icon: Server,
    defaultOpen: false,
    children: [
      { id: "it-repair-logs", label: "IT Repair Logs", icon: FileSearch, route: "/department-accesses/it-department/repair-logs" },
      { id: "it-system-access", label: "System Access", icon: ShieldCheck, route: "/department-accesses/it-department/system-access" },
    ],
  },
];

const DEFAULT_WORKSPACE_DEPARTMENT_NAMES = new Set([
  "hr",
  "administration",
  "sales",
  "finance",
  "maintenance",
  "technology",
  "it",
]);
const generalData: NavNode[] = [
  { id: "profile", label: "Profile", icon: User, route: "/profile/my-profile" },
  { id: "logout", label: "Sign Out", icon: LogOut, isRed: true, route: "/sign-out" },
];

const SECTION_ABBR: Record<string, string> = {
  "common-modules": "COM",
  "company-settings": "COM",
  "key-apps": "KEY",
  "founder-core-modules": "FND",
  "department-accesses": "DEP",
  "add-ons": "ADO",
};

const ROUTE_BY_ID: Record<string, string> = {
  dashboard: "/dashboard",
  attendance: "/common-modules/attendance",
  "customer-support": "/common-modules/customer-support",
  "website-builder": "/key-apps/website-builder",
  "wono-nomad": "/key-apps/wono-nomad",
  "website-leads": "/key-apps/website-builder/leads",
  "website-review": "/key-apps/website-builder/dynamic/reviews",
  "organization-management": "/core-modules/organization-management",
  "access-grants": "/core-modules/access-grants",
  "unit-settings": "/core-modules/workspace-settings",
  "unit-management": "/core-modules/workspace-management",
  "visitor-management": "/visitors/visitor-management",
  "visitors-management": "/visitors/visitor-management",
  "tenant-companies-sales": "/department-accesses/sales-department/tenant-companies",
  "virtual-office-sales": "/department-accesses/sales-department/virtual-offices",
  "resource-pricing": "/department-accesses/sales-department/resource-pricing",
  "leads-management": "/department-accesses/sales-department/leads-management",
  "sales-architecture": "/department-accesses/sales-department/sales-architecture",
  "tenant-companies-admin": "/department-accesses/administration-department/tenant-companies",
  bookings: "/department-accesses/administration-department/bookings",
  "resource-management": "/department-accesses/administration-department/resource-management",
  "house-keeping": "/department-accesses/administration-department/house-keeping",
  "meeting-room-system": "/common-modules/meeting-room-booking",
  assets: "/extra-common-modules/assets",
  analytics: "/core-modules/analytics",
  inventory: "/extra-common-modules/inventory",
  "department-inventory": "/extra-common-modules/department-inventory",
  "finance-management": "/extra-common-modules/finance-management",
  "team-management": "/extra-common-modules/team-management",
  "finance-budget": "/department-accesses/finance-department/expenses-budget",
  "billing-payments": "/department-accesses/finance-department/billing-payments",
  accounting: "/department-accesses/finance-department/accounting",
  reports: "/extra-common-modules/reports",
  tasks: "/common-modules/tasks",
  "leave-requests": "/common-modules/leave-requests",
  calendar: "/common-modules/calendar",
  tickets: "/common-modules/tickets",
  "tenant-dashboard": "/dashboard/tenant",
  "tenant-meeting-room-booking": "/dashboard/tenant/meeting-room-booking",
  "tenant-booking-history": "/dashboard/tenant/booking-history",
  "tenant-buy-credits": "/dashboard/tenant/buy-credits",
  "tenant-tickets": "/dashboard/tenant/tickets",
  "tenant-profile": "/profile/my-profile",
  profile: "/profile/my-profile",
  "employee-management": "/department-accesses/hr-department/company-management",
  "hr-documents": "/department-accesses/hr-department/documents",
  "attendance-review": "/department-accesses/hr-department/attendance-review",
  "leave-request-processing": "/department-accesses/hr-department/leave-request-processing",
  "recruitment": "/department-accesses/hr-department/recruitment",
  "payroll-management": "/department-accesses/hr-department/payroll-management",
  "exit-management": "/department-accesses/hr-department/resignation-management",
  "it-repair-logs": "/department-accesses/it-department/repair-logs",
  "it-system-access": "/department-accesses/it-department/system-access",
  "maintenance-repair-logs": "/department-accesses/maintenance-department/repair-logs",
  "amc-maintenance-scheduler": "/department-accesses/maintenance-department/amc-scheduler",
};

const ICON_BY_ID: Record<string, ElementType> = {
  dashboard: LayoutDashboard,
  "customer-support": Headphones,
  attendance: UserCheck,
  tasks: ListChecks,
  tickets: Ticket,
  "leave-requests": CalendarDays,
  "meeting-room-system": Presentation,
  calendar: Calendar,
  assets: Package,
  inventory: Warehouse,
  "department-inventory": Box,
  "finance-management": Landmark,
  "team-management": UsersRound,
  reports: FileChartColumn,
  "website-builder": Globe,
  "wono-nomad": ShieldCheck,
  "website-leads": NotebookText,
  "website-review": CheckCircle2,
  "organization-management": Building,
  "module-management": Boxes,
  "access-grants": UserCog,
  "workspace-settings": SlidersHorizontal,
  "workspace-management": MonitorCog,
  "unit-settings": SlidersHorizontal,
  "unit-management": LayoutGrid,
  analytics: BarChart,
  "visitor-management": ContactRound,
  "visitors-management": ContactRound,
  "hr-department": Users,
  "administration-department": Building2,
  "sales-department": BriefcaseBusiness,
  "finance-department": WalletCards,
  "maintenance-department": Wrench,
  "tech-department": Laptop,
  "it-department": Server,
  "employee-management": UserSquare,
  "hr-documents": FileText,
  recruitment: UserPlus,
  "leave-request-processing": CalendarCheck,
  "attendance-review": ClipboardCheck,
  "payroll-management": Banknote,
  "exit-management": UserMinus,
  "tenant-companies-admin": Store,
  bookings: Bed,
  "resource-management": HandCoins,
  "house-keeping": Sparkles,
  "workspace-layout": LayoutDashboard,
  "leads-management": Magnet,
  "tenant-companies-sales": Store,
  "virtual-office-sales": Building2,
  "resource-pricing": Tag,
  "sales-architecture": ShoppingCart,
  "finance-budget": PiggyBank,
  "billing-payments": Receipt,
  accounting: Calculator,
  "maintenance-repair-logs": ClipboardList,
  "amc-maintenance-scheduler": CalendarClock,
  "tech-website-builder": Code2,
  "it-repair-logs": FileSearch,
  "it-system-access": KeyRound,
  "tenant-dashboard": LayoutDashboard,
  "tenant-meeting-room-booking": CalendarPlus,
  "tenant-booking-history": History,
  "tenant-buy-credits": CreditCard,
  "tenant-tickets": Ticket,
  "tenant-profile": User,
  profile: User,
  logout: LogOut,
};

const BASIC_PLAN_HARD_LOCK_IDS = new Set([
  "unit-settings",
  "unit-management",
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

const MODULE_ID_EQUIVALENTS: Record<string, string[]> = {
  "visitor-management": ["visitor-management", "visitors-management"],
  "visitors-management": ["visitor-management", "visitors-management"],
};

const getEquivalentModuleIds = (moduleId: string) => {
  const id = String(moduleId || "").trim();
  return id ? [id, ...(MODULE_ID_EQUIVALENTS[id] || [])] : [];
};

const hasEquivalentModuleId = (ids: Set<string>, moduleId: string) =>
  getEquivalentModuleIds(moduleId).some((id) => ids.has(id));

const ORG_CHILD_KEYS = new Set([
  "org-tab-users",
  "org-tab-departments",
  "org-users-invite-member",
  "org-users-change-role",
  "org-users-toggle-access",
  "org-departments-create",
  "org-departments-edit",
  "org-departments-assign-manager",
  "org-departments-assign-acting-manager",
  "org-departments-remove-acting-manager",
]);

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
  tooltip,
}: NavItemProps) => {
  const tooltipId = useId();
  const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);

  const showTooltip = (element: HTMLButtonElement) => {
    if (!tooltip) return;
    const bounds = element.getBoundingClientRect();
    setTooltipPosition({
      left: bounds.right + 12,
      top: bounds.top + bounds.height / 2,
    });
  };

  return (
    <>
      <button
        type="button"
        title={!tooltip && disabled ? disabledTitle : undefined}
        aria-label={collapsed ? label : undefined}
        aria-describedby={tooltipPosition ? tooltipId : undefined}
        className={`group relative flex w-full items-center rounded-md text-left transition-all hover:bg-white ${
          collapsed ? "h-10 justify-center gap-0 p-0" : "gap-2 px-3 py-2.5"
        } ${isActive ? "bg-white text-black shadow-sm" : "text-black/80"} ${
          isRed ? "text-red-500 hover:text-red-600" : ""
        } ${locked ? "opacity-75 cursor-not-allowed" : unavailable ? "cursor-default" : "cursor-pointer"}`}
        style={collapsed ? undefined : { paddingLeft: `${depth * 1.25 + 0.75}rem` }}
        onClick={onClick}
        onMouseEnter={(event) => showTooltip(event.currentTarget)}
        onMouseLeave={() => setTooltipPosition(null)}
        onFocus={(event) => showTooltip(event.currentTarget)}
        onBlur={() => setTooltipPosition(null)}
      >
        {Icon && (
          <Icon
            size={18}
            className={`shrink-0 ${isRed ? "text-red-500" : isActive ? "text-accent" : "text-black/80"}`}
          />
        )}
        {!collapsed && (
          <span className={`truncate font-['Poppins'] text-xs font-medium ${isActive ? "font-semibold" : ""}`}>
            {label}
          </span>
        )}
        {!collapsed && hasChildren && (
          isOpen
            ? <ChevronUp size={16} className="ml-auto shrink-0 text-black/50" />
            : <ChevronDown size={16} className="ml-auto shrink-0 text-black/50" />
        )}
        {!collapsed && locked && !hasChildren && <Lock size={12} className="ml-auto shrink-0 text-black/40" />}
      </button>

      {tooltip && tooltipPosition
        ? createPortal(
            <div
              id={tooltipId}
              role="tooltip"
              className="pointer-events-none fixed z-[100] -translate-y-1/2 whitespace-nowrap rounded-md bg-black px-3 py-2 font-['Poppins'] text-xs font-semibold text-white shadow-lg"
              style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
            >
              <span
                aria-hidden="true"
                className="absolute left-[-6px] top-1/2 -translate-y-1/2 border-y-[6px] border-r-[6px] border-y-transparent border-r-black"
              />
              {tooltip}
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

interface NavGroupProps {
  item: NavNode;
  collapsed: boolean;
  depth?: number;
  pathname: string;
  onNavigate: (item: NavNode, sectionKey?: string) => void;
  sectionKey?: string;
}

const NavGroup = ({ item, collapsed, depth = 0, pathname, onNavigate, sectionKey }: NavGroupProps) => {
  const [isOpen, setIsOpen] = useState(item.defaultOpen !== false);
  const hasChildren = Boolean(item.children?.length);
  const isActive = (() => {
    if (!item.route) return false;
    if (item.id === "website-builder") {
      return pathname === "/key-apps/website-builder";
    }
    return pathname.startsWith(normalizeLegacyRoute(item.route));
  })();

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen((prev) => !prev);
      return;
    }
    onNavigate(item, sectionKey);
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
        tooltip={collapsed ? item.label : undefined}
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
              sectionKey={sectionKey}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SidebarLoadingSkeleton = ({ collapsed }: { collapsed: boolean }) => (
  <div
    className={`space-y-5 py-1 ${collapsed ? "px-1" : "px-2"}`}
    role="status"
    aria-label="Loading sidebar navigation"
    aria-busy="true"
  >
    {[4, 3].map((itemCount, sectionIndex) => (
      <div key={`sidebar-skeleton-section-${sectionIndex}`} className="space-y-2">
        {collapsed ? (
          <>
            <Skeleton className="mx-auto h-3 w-7 rounded-sm bg-gray-300" />
            <div className="h-px bg-gray-300" />
          </>
        ) : (
          <Skeleton className={`mx-2 h-3 ${sectionIndex === 0 ? "w-24" : "w-20"} rounded-sm bg-gray-300`} />
        )}
        {Array.from({ length: itemCount }).map((_, itemIndex) => (
          <div
            key={`sidebar-skeleton-item-${sectionIndex}-${itemIndex}`}
            className={`flex h-9 items-center ${collapsed ? "justify-center px-2" : "gap-3 px-3"}`}
          >
            <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
            {!collapsed && <Skeleton className={`h-3 ${itemIndex % 2 === 0 ? "w-28" : "w-20"} rounded-sm`} />}
          </div>
        ))}
      </div>
    ))}

    <div className={`flex h-9 items-center ${collapsed ? "justify-center px-2" : "gap-3 px-3"}`}>
      <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
      {!collapsed && <Skeleton className="h-3 w-16 rounded-sm" />}
    </div>

    <div className="space-y-2 border-t border-gray-300 pt-4">
      {collapsed ? (
        <Skeleton className="mx-auto h-3 w-7 rounded-sm bg-gray-300" />
      ) : (
        <Skeleton className="mx-auto h-3 w-14 rounded-sm bg-gray-300" />
      )}
      {Array.from({ length: 2 }).map((_, itemIndex) => (
        <div
          key={`sidebar-skeleton-general-${itemIndex}`}
          className={`flex h-9 items-center ${collapsed ? "justify-center px-2" : "gap-3 px-3"}`}
        >
          <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
          {!collapsed && <Skeleton className={`h-3 ${itemIndex === 0 ? "w-16" : "w-20"} rounded-sm`} />}
        </div>
      ))}
    </div>
    <span className="sr-only">Loading sidebar navigation</span>
  </div>
);

export default function Sidebar({ onCloseDrawer }: SidebarProps) {
  const { isSidebarOpen } = useSidebar();
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const collapsed = !isSidebarOpen;
  const navigate = useNavigate();
  const logout = useLogout();
  const location = useLocation();
  const [workspaceAccessMap, setWorkspaceAccessMap] = useState<WorkspaceAccessMapState | null>(null);
  const [isSidebarHydrated, setIsSidebarHydrated] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpgradeSubmitting, setIsUpgradeSubmitting] = useState(false);
  const [requestedUpgradePlan, setRequestedUpgradePlan] = useState("");
  const [roleAccessContext, setRoleAccessContext] = useState<RoleAccessContext>({
    role: "",
    departments: [],
    grantedModules: [],
    addOnGrantedModules: [],
  });
  const [workspaceDepartments, setWorkspaceDepartments] = useState<WorkspaceDepartmentAccess[]>([]);
  const workspaceSetup = readWorkspaceSetup();

const authUserId = String(
  (auth.user as { id?: string; _id?: string } | null)?.id ||
  (auth.user as { id?: string; _id?: string } | null)?._id ||
  ""
);

const authUserRole = String(
  (auth.user as {
    role?: string;
    workspaceMembership?: { role?: string };
  } | null)?.workspaceMembership?.role ||
  (auth.user as { role?: string } | null)?.role ||
  ""
);

useEffect(() => {
  let active = true;

  if (!isSidebarHydrated) {
    setIsSidebarHydrated(false);
  }

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
        const departments = Array.isArray(orgPayload?.departments) ? orgPayload.departments : [];
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
        const memberGranted = Array.isArray(payload?.currentMemberGrantedModules)
          ? payload.currentMemberGrantedModules
          : [];
        const memberAddOnGranted = Array.isArray(payload?.currentMemberAddOnGrantedModules)
          ? payload.currentMemberAddOnGrantedModules
          : [];
        setRoleAccessContext({
          role: String(
            me?.role ||
            (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)?.workspaceMembership?.role ||
            (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)?.role ||
            "",
          ),
          departments: Array.isArray(me?.departmentNames) ? me.departmentNames : [],
          grantedModules: memberGranted,
          addOnGrantedModules: memberAddOnGranted,
        });
        setWorkspaceDepartments(
          departments.map((department: any) => ({
            id: String(department?.id || department?._id || "").trim(),
            name: String(department?.name || "").trim(),
            moduleIds: Array.isArray(department?.moduleIds)
              ? department.moduleIds.map((id: any) => String(id || "").trim()).filter(Boolean)
              : [],
          })),
        );
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
          addOnGrantedModules: [],
        });
        setWorkspaceDepartments([]);
      } finally {
        if (active) {
          setIsSidebarHydrated(true);
        }
      }
    };

    void loadSidebarData();
    const refresh = () => {
      void loadSidebarData();
    };
    // const intervalId = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      // window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
}, [axiosPrivate, authUserId, authUserRole]);

  useEffect(() => {
    setOpenSections((current) => ({
      ...current,
      "common-modules": true,
    }));
  }, []);

  useEffect(() => {
    let mounted = true;

    const syncUpgradeRequest = async () => {
      const companyId = await resolveMasterCompanyId();
      if (!mounted || !companyId) return;
      try {
        const raw = localStorage.getItem(getUpgradeRequestStorageKey(companyId));
        if (!raw) return;
        const parsed = JSON.parse(raw) as { requestedPlan?: string; status?: string };
        if (parsed?.status === "pending" && parsed?.requestedPlan) {
          setRequestedUpgradePlan(String(parsed.requestedPlan).toLowerCase());
        }
      } catch {
        // Ignore invalid local state.
      }
    };

    void syncUpgradeRequest();
    return () => {
      mounted = false;
    };
  }, [auth.user]);

  const planLabel =
    workspaceAccessMap?.selectedPlan || workspaceSetup.selectedPlan || "basic";
  const isSectionOpenByDefault = (sectionKey: string) =>
    planLabel === "basic" ||
    sectionKey === "common-modules" ||
    sectionKey === "department-accesses" ||
    (planLabel === "professional" &&
      (sectionKey === "key-apps" || sectionKey === "founder-core-modules"));
  const upgradePlanOptions =
    planLabel === "basic"
      ? ["professional", "custom"]
      : planLabel === "professional"
        ? ["custom"]
        : [];
  const upgradePlanCards = PLAN_UI_DATA.filter((plan) =>
    upgradePlanOptions.includes(plan.key),
  );
  const workspaceCount = getWorkspaceCount(
    (auth.user as { workspaceCount?: number } | null)?.workspaceCount,
  );
  const currentRole = normalizeRole(roleAccessContext.role);
  const isFounderRole = currentRole === "founder" || currentRole === "owner";
  // Check if the current user has super admin privileges
  const isSuperAdmin = currentRole === "super_admin";
  const isWorkspaceManagementUnlocked =
    planLabel === "professional" && workspaceCount > 1;
  const enabledIds = new Set([
    ...getEnabledModuleIdsForPlan(planLabel, workspaceCount),
    ...(workspaceAccessMap?.enabledModuleIds || workspaceSetup.enabledModuleIds || []),
  ]);

  useEffect(() => {
    if (requestedUpgradePlan && planLabel === requestedUpgradePlan) {
      setRequestedUpgradePlan("");
    }
  }, [planLabel, requestedUpgradePlan]);

  const getUpgradeRequestStorageKey = (companyId: string) =>
    `hostpanel_upgrade_request_status_${companyId}`;

  const resolveMasterCompanyId = async () => {
    const authUser = auth.user as
      | {
        company?: string | { _id?: string; id?: string };
        companyId?: string;
        hostLeadCompanyId?: string;
        companyName?: string;
      }
      | null;
    const directCompanyId = String(
      authUser?.hostLeadCompanyId ||
      (typeof authUser?.company === "string"
        ? authUser.company
        : authUser?.company?._id || authUser?.company?.id) ||
      authUser?.companyId ||
      "",
    ).trim();

    const legacyCompanyId = String(authUser?.companyId || "").trim();
    const companyNameHint = String(authUser?.companyName || "").trim().toLowerCase();

    try {
      const hostCompaniesResponse = await axiosPrivate.get(`${MASTER_PANEL_BASE_URL}/api/hosts/host-companies`);
      const hostCompanies = (Array.isArray(hostCompaniesResponse?.data)
        ? hostCompaniesResponse.data
        : Array.isArray(hostCompaniesResponse?.data?.data)
          ? hostCompaniesResponse.data.data
          : Array.isArray(hostCompaniesResponse?.data?.companies)
            ? hostCompaniesResponse.data.companies
            : []) as Array<Record<string, unknown>>;

      let matchedCompany = hostCompanies.find((company) => {
        const leadId = String(company?.leadId || "").trim();
        const companyId = String(company?.companyId || "").trim();
        return legacyCompanyId && (leadId === legacyCompanyId || companyId === legacyCompanyId);
      });

      if (!matchedCompany && companyNameHint) {
        matchedCompany = hostCompanies.find((company) => {
          const name = String(company?.companyName || "").trim().toLowerCase();
          return name && name === companyNameHint;
        });
      }

      if (matchedCompany?.companyId) {
        return String(matchedCompany.companyId).trim();
      }
    } catch {
      // Fallback below.
    }

    if (directCompanyId && !/^[a-f0-9]{24}$/i.test(directCompanyId)) {
      return directCompanyId;
    }
    return "";
  };

  const applyEnabledState = (items: NavNode[]): NavNode[] =>
    items.map((item) => {
      const hasChildren = Boolean(item.children?.length);
      if (hasChildren) {
        return {
          ...item,
          children: applyEnabledState(item.children || []),
        };
      }
      if (isModuleLockedForPlan(planLabel, item.id)) {
        return {
          ...item,
          disabled: true,
          upgradeLocked: true,
          disabledTitle: item.disabledTitle || "Upgrade plan to unlock this",
        };
      }
      if (item.id === "work-management" && !isFounderRole) {
        return {
          ...item,
          disabled: true,
          upgradeLocked: true,
          disabledTitle: "Upgrade plan to unlock this",
        };
      }
      if (item.id === "workspace-management" && !isWorkspaceManagementUnlocked) {
        return {
          ...item,
          disabled: true,
          upgradeLocked: true,
          disabledTitle: "Upgrade plan to unlock this",
        };
      }
      return {
        ...item,
        disabled: !enabledIds.has(item.id),
        upgradeLocked: !enabledIds.has(item.id),
        disabledTitle: !enabledIds.has(item.id)
          ? item.disabledTitle || "Upgrade plan to unlock this"
          : item.disabledTitle,
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
        const addAlias = (id: string) => {
          const canonical = String(id || "").trim();
          if (!canonical) return;
          canonicalIds.add(canonical);
          aliasToCanonical.set(normalizeModuleToken(canonical), canonical);
        };

        addAlias(String(item?.id || ""));
        (Array.isArray(item?.tabs) ? item.tabs : []).forEach((tab) => {
          addAlias(String(tab?.id || ""));
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

        // Department-specific fallback without cross-linking key apps:
        // administration-visitor-management -> visitors-management
        if (normalized === "administration-visitor-management") {
          const deptVisitor = aliasToCanonical.get("visitors-management");
          if (deptVisitor) return deptVisitor;
        }
        if (normalized === "housekeeping") {
          const housekeeping = aliasToCanonical.get("house-keeping");
          if (housekeeping) return housekeeping;
        }

        return item;
      })
      .filter((item) => canonicalIds.has(item));
    const grantedNormalized = new Set(
      (roleAccessContext.grantedModules || [])
        .map((item) => normalizeModuleToken(String(item || "")))
        .filter(Boolean),
    );
    const hasAnyOrgChild = Array.from(ORG_CHILD_KEYS).some((key) => grantedNormalized.has(key));

    if (isFounderRole) {
      return new Set<string>(canonicalIds);
    }

    const allowed = new Set<string>(grantedEnabled);
    if (hasAnyOrgChild) {
      allowed.add("organization-management");
      allowed.add("org_tab_users");
      allowed.add("org_tab_departments");
    }
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

    const addAlias = (id: string) => {
      const canonical = String(id || "").trim();
      if (!canonical) return;
      canonicalIds.add(canonical);
      aliasToCanonical.set(normalizeModuleToken(canonical), canonical);
    };

    sections.forEach((section) => {
      (Array.isArray(section?.items) ? section.items : []).forEach((item) => {
        addAlias(String(item?.id || ""));
        (Array.isArray(item?.tabs) ? item.tabs : []).forEach((tab) => {
          addAlias(String(tab?.id || ""));
        });
      });
    });

    const resolveCanonical = (raw: string) => {
      const rawTrimmed = String(raw || "").trim();
      if (canonicalIds.has(rawTrimmed)) return rawTrimmed;
      const normalized = normalizeModuleToken(raw);
      const direct = aliasToCanonical.get(normalized);
      if (direct) return direct;

      // Department-specific fallback without cross-linking key apps.
      if (normalized === "administration-visitor-management") {
        const deptVisitor = aliasToCanonical.get("visitors-management");
        if (deptVisitor) return deptVisitor;
      }
      if (normalized === "housekeeping") {
        const housekeeping = aliasToCanonical.get("house-keeping");
        if (housekeeping) return housekeeping;
      }
      return String(raw || "").trim();
    };

    // Plan defaults are only a bootstrapping fallback for the brief window
    // before a real workspace has ever been fetched (e.g. the pre-creation
    // setup wizard, using workspaceSetup's local-storage draft). Once a real
    // workspace exists, Workspace.enabledModuleIds — seeded from the plan's
    // defaults at creation, then fully staff-controlled from master panel's
    // Workspace/Employee Access screens in either direction — is the only
    // source of truth. Unioning plan defaults in unconditionally here would
    // make it impossible for staff to ever turn off a module that happens to
    // be one of the plan's defaults (e.g. Dashboard, Customer Support,
    // Visitor Management, Website Builder), which is exactly the override
    // capability those screens are meant to provide.
    const hasRealWorkspace = Boolean(workspaceAccessMap);
    const planDefaults = hasRealWorkspace ? [] : getEnabledModuleIdsForPlan(planLabel, workspaceCount);
    const enabledRaw = [
      ...planDefaults,
      ...(workspaceAccessMap?.enabledModuleIds || workspaceSetup.enabledModuleIds || []),
    ]
      .map((item) => String(item || "").trim())
      .filter((item, index, arr) => arr.indexOf(item) === index);
    const enabledNormalized = new Set(enabledRaw.map((item) => normalizeModuleToken(item)));
    const hasAnyOrgChildEnabled = Array.from(ORG_CHILD_KEYS).some((key) => enabledNormalized.has(key));
    if (hasAnyOrgChildEnabled) {
      enabledRaw.push("organization-management", "org_tab_users", "org_tab_departments");
    }

    return new Set(
      enabledRaw
        .map(resolveCanonical)
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    );
  }, [
    workspaceAccessMap,
    workspaceAccessMap?.enabledModuleIds,
    workspaceAccessMap?.moduleMap?.sections,
    workspaceAccessMap?.selectedPlan,
    workspaceSetup.enabledModuleIds,
    workspaceSetup.selectedPlan,
    planLabel,
    workspaceCount,
  ]);

  const dynamicDepartmentItems = useMemo<NavNode[]>(() => {
    if (!["professional", "custom"].includes(planLabel)) return [];

    const assignedDepartmentNames = new Set(
      roleAccessContext.departments
        .map((name) => String(name || "").trim().toLowerCase())
        .filter(Boolean),
    );

    // Founder/super_admin/admin/manager can see every custom department (a
    // management overview). A plain employee only sees the custom
    // department(s) actually assigned to them — but must still be able to
    // see those, not blocked outright, so their granted modules can group
    // under the right heading instead of falling back to a static section.
    const canSeeDepartmentAccess =
      isFounderRole ||
      isSuperAdmin ||
      currentRole === "admin" ||
      currentRole === "manager" ||
      assignedDepartmentNames.size > 0;
    if (!canSeeDepartmentAccess) return [];
    const moduleNavigation = new Map<
      string,
      { label: string; route?: string; icon?: ElementType }
    >();

    (workspaceAccessMap?.moduleMap?.sections || []).forEach((section) => {
      (section?.items || []).forEach((item) => {
        const itemId = String(item?.id || "").trim();
        if (itemId) {
          moduleNavigation.set(itemId, {
            label: String(item?.label || itemId),
            route: item?.route || ROUTE_BY_ID[itemId],
            icon: ICON_BY_ID[itemId] || Boxes,
          });
        }
        (item?.tabs || []).forEach((tab) => {
          const tabId = String(tab?.id || "").trim();
          if (!tabId) return;
          moduleNavigation.set(tabId, {
            label: String(tab?.label || tabId),
            route: tab?.route || ROUTE_BY_ID[tabId],
            icon: ICON_BY_ID[tabId] || Boxes,
          });
        });
      });
    });

    return workspaceDepartments
      .filter((department) => {
        const normalizedName = department.name.trim().toLowerCase();
        if (!normalizedName || DEFAULT_WORKSPACE_DEPARTMENT_NAMES.has(normalizedName)) {
          return false;
        }
        return isFounderRole || isSuperAdmin || assignedDepartmentNames.has(normalizedName);
      })
      .map((department) => ({
        id: "custom-department-" + (department.id || normalizeModuleToken(department.name)),
        label: department.name,
        icon: resolveDepartmentIcon(department.name),
        defaultOpen: false,
        children: department.moduleIds.map((moduleId) => {
          const navigation = moduleNavigation.get(moduleId);
          const workspaceUnlocked = hasEquivalentModuleId(workspaceEnabledCanonicalIds, moduleId);
          const roleUnlocked =
            isFounderRole || isSuperAdmin || hasEquivalentModuleId(roleAllowedModuleIds, moduleId);
          const unlocked = workspaceUnlocked && roleUnlocked;
          return {
            id: moduleId,
            label: navigation?.label || moduleId,
            icon: navigation?.icon || Boxes,
            route: navigation?.route,
            disabled: !unlocked,
            upgradeLocked: !workspaceUnlocked,
            state: {
              fromSection: "department-accesses",
              departmentId: "custom-department-" + (department.id || normalizeModuleToken(department.name)),
              departmentLabel: department.name,
              moduleId,
            },
            disabledTitle: !unlocked
              ? workspaceUnlocked
                ? "You do not have access to this module"
                : "Upgrade plan to unlock this"
              : undefined,
          };
        }),
      }))
      .filter((department) => Boolean(department.children?.length));
  }, [
    currentRole,
    isFounderRole,
    isSuperAdmin,
    planLabel,
    roleAccessContext.departments,
    roleAllowedModuleIds,
    workspaceAccessMap?.moduleMap?.sections,
    workspaceDepartments,
    workspaceEnabledCanonicalIds,
  ]);

  // Modules claimed by a visible custom department (e.g. "Marketing
  // Department") should render only there, not duplicated under their
  // static home section (Finance Department, Tech Department, etc).
  const claimedByCustomDepartmentIds = useMemo(() => {
    const claimed = new Set<string>();
    dynamicDepartmentItems.forEach((department) => {
      (department.children || []).forEach((child) => {
        if (!child.disabled) claimed.add(child.id);
      });
    });
    return claimed;
  }, [dynamicDepartmentItems]);

  const mappedSections: Array<{ key: string; title: string; items: NavNode[] }> = (
    workspaceAccessMap?.moduleMap?.sections || []
  ).map((section) => {
    const sectionKey = String(section?.sectionId || section?.sectionLabel || "section");
    const mappedItems: NavNode[] = (section?.items || []).map((item): NavNode | null => {
      const itemId = String(item?.id || "").trim();
      const itemRoute = item?.route || ROUTE_BY_ID[itemId];
      const hasTabs = Array.isArray(item?.tabs) && item.tabs.length > 0;

      // Administration Department is Custom-only now (per plan/module
      // tracking sheet) — hide the whole group on Basic/Professional
      // instead of just locking its tabs, since one of its tabs
      // (Visitors Management) shares an id-linked page with Key Apps'
      // own Visitor Management entry and would otherwise always show
      // unlocked here regardless of plan.
      if (
        sectionKey === "department-accesses" &&
        itemId === "administration-department" &&
        planLabel !== "custom"
      ) {
        return null;
      }
      if (hasTabs) {
        const children = (item.tabs || [])
          .filter((tab) => {
            if (sectionKey !== "department-accesses") return true;
            const tabId = String(tab?.id || "").trim();
            return !claimedByCustomDepartmentIds.has(tabId);
          })
          .map((tab) => {
            const tabId = String(tab?.id || "").trim();
            const tabRoute = tab?.route || ROUTE_BY_ID[tabId];
            const workspaceUnlocked = workspaceEnabledCanonicalIds.has(tabId);
            const roleUnlocked = roleAllowedModuleIds.has(tabId);
            const unlocked = workspaceUnlocked && roleUnlocked;
            return {
              id: tabId,
              label: String(tab?.label || tabId),
              icon: ICON_BY_ID[tabId] || Boxes,
              route: tabRoute,
              disabled: !unlocked,
              upgradeLocked: !workspaceUnlocked,
              disabledTitle: !unlocked
                ? workspaceUnlocked
                  ? "You do not have access to this module"
                  : "Upgrade plan to unlock this"
                : undefined,
            };
          });
        return {
          id: itemId,
          label: String(item?.label || itemId),
          icon: ICON_BY_ID[itemId] ||
            (sectionKey === "department-accesses"
              ? resolveDepartmentIcon(String(item?.label || itemId))
              : Boxes),
          defaultOpen: false,
          children,
        };
      }
      const basicPlanLocked = planLabel === "basic" && BASIC_PLAN_HARD_LOCK_IDS.has(itemId);
      const workspaceUnlocked = workspaceEnabledCanonicalIds.has(itemId);
      const roleUnlocked = roleAllowedModuleIds.has(itemId);
      return {
        id: itemId,
        label: String(item?.label || itemId),
        icon: ICON_BY_ID[itemId] || Boxes,
        route: itemRoute,
        disabled: basicPlanLocked || !(workspaceUnlocked && roleUnlocked),
        upgradeLocked: basicPlanLocked || !workspaceUnlocked,
        disabledTitle:
          basicPlanLocked || !workspaceUnlocked
            ? "Upgrade plan to unlock this"
            : !roleUnlocked
              ? "You do not have access to this module"
              : undefined,
      };
    }).filter((item): item is NavNode => Boolean(item));
    let sortedItems = sortEnabledFirst(
      sectionKey === "department-accesses"
        ? [...mappedItems, ...dynamicDepartmentItems]
        : mappedItems,
    );
    sortedItems = sortedItems.map((item) => {
      if (item.id === "website-leads" && sectionKey === "key-apps")
        return { ...item, label: "All Leads", icon: Magnet, route: "/key-apps/all-leads" };
      if (item.id === "website-leads")
        return { ...item, label: "Website Leads", icon: NotebookText };
      if (item.id === "resource-pricing")
        return { ...item, label: "Resource & Pricing" };
      return item;
    });
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
  })
  .filter((section) => {
    if (section.items.length === 0) return false;
    // only founder/owner/super_admin can see the founder core modules section
    if (section.key === "founder-core-modules" && !isFounderRole && !isSuperAdmin) return false;
    return true;
  });

  const handleUpgradePlanRequest = async (plan: string) => {
    if (requestedUpgradePlan === plan) {
      toast.info(`${plan.toUpperCase()} plan already requested.`);
      return;
    }

    try {
      setIsUpgradeSubmitting(true);
      const companyId = await resolveMasterCompanyId();
      if (!companyId) {
        toast.error("Company id not found. Please re-login and try again.");
        return;
      }

      const response = await axiosPrivate.patch(`${MASTER_PANEL_BASE_URL}/api/hosts/request-upgrade-plan`, {
        companyId,
        requestedPlan: plan,
      });
      localStorage.setItem(
        getUpgradeRequestStorageKey(companyId),
        JSON.stringify({
          companyId,
          requestedPlan: plan,
          status: "pending",
          requestedAt: new Date().toISOString(),
        }),
      );
      toast.success(response?.data?.message || "Request sent. Sales team will contact you soon.");
      setRequestedUpgradePlan(plan);
      setIsUpgradeModalOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send upgrade request.");
    } finally {
      setIsUpgradeSubmitting(false);
    }
  };

  const navigateFromSidebar = (route: string, sectionKey?: string, state?: Record<string, unknown>) => {
    navigate(route, { state: { fromSection: sectionKey, ...(state || {}) }, flushSync: true });
    if (onCloseDrawer) onCloseDrawer();
  };

  const onNavigate = (item: NavNode, sectionKey?: string) => {
    if (item.id === "logout") {
      void logout();
      if (onCloseDrawer) onCloseDrawer();
      return;
    }
    if (item.disabled) {
      if (item.upgradeLocked && upgradePlanCards.length > 0) {
        setIsUpgradeModalOpen(true);
      }
      return;
    }
    if (!item.route) return;
    navigateFromSidebar(normalizeLegacyRoute(item.route), sectionKey, item.state);
  };

  return (
    <div
      className={`${collapsed ? "w-16" : "w-64"
        } h-[90vh] bg-[#efefef] flex flex-col border-r border-black/10 overflow-hidden transition-all duration-300`}
    >
      <div className="px-4 py-3 flex justify-center">
        {isSidebarHydrated ? (
          <span className="text-[10px] font-semibold tracking-wide text-black/70 bg-white px-3 py-1 rounded-full uppercase">
            {collapsed ? planLabel[0].toUpperCase() : `Plan - ${planLabel}`}
          </span>
        ) : (
          <Skeleton
            className={`${collapsed ? "h-6 w-6" : "h-6 w-24"} rounded-full bg-gray-300`}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-3 space-y-0 hideScrollBar">
        {!isSidebarHydrated ? (
          <SidebarLoadingSkeleton collapsed={collapsed} />
        ) : (
          (() => {
            const rawSections = mappedSections.length > 0
              ? (() => {
                const hasKeyApps = mappedSections.some(s => s.key === "key-apps");
                const hasDeptAccess = mappedSections.some(s => s.key === "department-accesses");
                const sections = mappedSections
                  .filter(s => planLabel !== "basic" || s.key !== "department-accesses")
                  .map(s => {
                    if (s.key === "key-apps") {
                      return { ...s, items: [...s.items, ...keyAppsItems.filter(k => k.route && !s.items.some(ex => ex.id === k.id))] };
                    }
                    if (s.key === "department-accesses") {
                      return { ...s, items: [...s.items, ...departmentItems.filter(d => d.route || (d.children?.length && !s.items.some(ex => ex.id === d.id)))] };
                    }
                    return s;
                  });
                if (!hasKeyApps) sections.push({ key: "key-apps", title: "Key Apps", items: keyAppsItems });
                if (!hasDeptAccess && planLabel !== "basic") sections.push({ key: "department-accesses", title: "Department Accesses", items: departmentItems });
                return sections;
              })()
              : [
                { key: "company-settings", title: "Company Settings", items: companySettingsItems },
                { key: "key-apps", title: "Key Apps", items: keyAppsItems },
                ...(planLabel !== "basic" ? [{ key: "department-accesses", title: "Department Accesses", items: departmentItems }] : []),
              ];

            // Grants are split by source: modules granted inside the Add-ons
            // catalogue live in addOnGrantedModules, every other grant (role
            // defaults + normal section toggles) lives in grantedModules.
            // Grouping rule:
            // - The expandable "Add-ons" section ALWAYS renders (whenever the
            //   Add-ons catalogue exists) so the member can see it's there,
            //   but its expanded list shows ONLY modules actually granted
            //   from the Add-ons catalogue (empty until any are granted).
            // - Every other section renders ONLY modules the member can access
            //   WITHOUT those add-on grants (effective minus add-on), so a
            //   module never appears in both places.
            const addOnGrantedSet = new Set(
              (roleAccessContext.addOnGrantedModules || [])
                .map((id) => normalizeModuleToken(String(id || "")))
                .filter((id) => id && !id.startsWith("disabled:")),
            );
            const normalGrantedSet = new Set(
              (roleAccessContext.grantedModules || [])
                .map((id) => normalizeModuleToken(String(id || "")))
                .filter((id) => id && !id.startsWith("disabled:") && !addOnGrantedSet.has(id)),
            );

            // Recursively keeps only nodes (or groups whose children) are
            // present in the granted set, preserving group nesting.
            const keepGrantedTree = (nodes: NavNode[], grantedIds: Set<string>): NavNode[] => {
              const kept: NavNode[] = [];

              for (const node of nodes) {
                if (node.children?.length) {
                  const children = keepGrantedTree(node.children, grantedIds);
                  if (children.length > 0) {
                    kept.push({ ...node, children });
                  }
                } else if (grantedIds.has(normalizeModuleToken(node.id))) {
                  kept.push(node);
                }
              }

              return kept;
            };

            const addOnsSection = rawSections.find(
              (section) => section.key === "add-ons",
            );

            const addonsItems: NavNode[] = addOnsSection
              ? keepGrantedTree(addOnsSection.items, addOnGrantedSet)
              : [];

            const cleanedSections = rawSections
              .map((s) => {
                if (s.key === "add-ons") {
                  return null;
                }

                const items = keepGrantedTree(s.items, normalGrantedSet);
                return items.length > 0 ? { ...s, items } : null;
              })
              .filter(Boolean) as Array<{ key: string; title: string; items: NavNode[] }>;

            if (addOnsSection) {
              cleanedSections.push({ key: "add-ons", title: "Add-ons", items: addonsItems });
            }

            // Keep Add-ons immediately after Department Accesses while
            // preserving the locked/unlocked split logic above.
            const SECTION_ORDER = [
              "common-modules",
              "extra-common-modules",
              "company-settings",
              "key-apps",
              "founder-core-modules",
              "department-accesses",
              "add-ons",
            ];
            const orderIndex = (key: string) => {
              const index = SECTION_ORDER.indexOf(key);
              return index === -1 ? SECTION_ORDER.length : index;
            };
            const reordered = [...cleanedSections].sort(
              (a, b) => orderIndex(a.key) - orderIndex(b.key),
            );

            return reordered;
          })().map((section) => (


              <div key={section.key} className="px-4 pt-3">
                <div className="border-t border-black/10 pt-2">
                  {section.key === "add-ons" ? (
                    !collapsed ? (
                      <>
                        <div className="flex w-full items-center justify-between">
                          {/* Opens the Add-ons page */}
                          <button
                            type="button"
                            onClick={() => {
                              navigate("/module-sections/add-ons");
                              onNavigate(
                                {
                                  id: "add-ons",
                                  label: "Add-ons",
                                  route: "/module-sections/add-ons",
                                },
                                "add-ons",
                              );
                            }}
                            className="flex-1 text-left font-['Poppins'] text-xs font-semibold uppercase tracking-wide text-black/80 hover:text-blue-600"
                          >
                            Add-ons
                          </button>

                          {/* Only expands or collapses — hidden when no add-ons are granted yet */}
                          {section.items.length > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setOpenSections((current) => ({
                                  ...current,
                                  "add-ons": !current["add-ons"],
                                }))
                              }
                              className="rounded p-1 text-black/70 hover:bg-black/5"
                              aria-label={
                                openSections["add-ons"]
                                  ? "Collapse Add-ons"
                                  : "Expand Add-ons"
                              }
                              aria-expanded={Boolean(openSections["add-ons"])}
                            >
                              {openSections["add-ons"] ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </button>
                          ) : null}
                        </div>

                        {openSections["add-ons"] && section.items.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {section.items.map((item) => (
                              <NavGroup
                                key={`add-ons-${item.id}`}
                                item={item}
                                collapsed={false}
                                pathname={location.pathname}
                                onNavigate={onNavigate}
                                sectionKey="add-ons"
                              />
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <NavGroup
                        item={{
                          id: "add-ons",
                          label: "Add-ons",
                          icon: Boxes,
                          route: "/module-sections/add-ons",
                        }}
                        collapsed
                        pathname={location.pathname}
                        onNavigate={onNavigate}
                        sectionKey="add-ons"
                      />
                    )
                  ) : !collapsed ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenSections((current) => ({
                            ...current,
                            [section.key]: !(
                              current?.[section.key] ??
                              isSectionOpenByDefault(section.key)
                            ),
                          }))
                        }
                        className="flex w-full items-center justify-between text-left font-['Poppins'] text-xs font-semibold uppercase tracking-wide text-black/80"
                      >
                        <span>{section.title}</span>
                        {openSections?.[section.key] ?? isSectionOpenByDefault(section.key) ? (
                          <ChevronUp size={16} className="shrink-0" />
                        ) : (
                          <ChevronDown size={16} className="shrink-0" />
                        )}
                      </button>
                      {(openSections?.[section.key] ?? isSectionOpenByDefault(section.key)) ? (
                        <div className="space-y-1">
                          {section.items.map((item) => (
                            <NavGroup
                              key={`${section.key}-${item.id}`}
                              item={item}
                              collapsed={collapsed}
                              pathname={location.pathname}
                              onNavigate={onNavigate}
                              sectionKey={section.key}
                            />
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-[10px] font-pbold tracking-wide text-black/80 uppercase text-center">
                        {SECTION_ABBR[section.key] || section.title.slice(0, 3).toUpperCase()}
                      </div>
                      {section.items.map((item) => (
                        <NavGroup
                          key={`${section.key}-${item.id}`}
                          item={item}
                          collapsed={collapsed}
                          pathname={location.pathname}
                          onNavigate={onNavigate}
                          sectionKey={section.key}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
        )}

        {isSidebarHydrated && (
          <div className="px-4 pt-2">
            <div className="border-t border-black/10 pt-2 space-y-1">
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
        )}
      </div>

      {/* <div className="p-4 border-t border-gray-200 hover:bg-gray-200 cursor-pointer transition-colors mt-auto">
        <div className="flex items-center gap-3 text-gray-700">
          <Handshake size={16} className="text-gray-500" />
          {!collapsed && <span className="text-xs font-medium">Become a Contributor</span>}
        </div>
      </div> */}

      {isUpgradeModalOpen ? createPortal(
        <div className="fixed inset-0 z-[1400] bg-[#0f172a]/45 backdrop-blur-[2px] px-4 py-6 flex items-center justify-center">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] border border-[#dbe5f2] shadow-[0_20px_80px_rgba(15,23,42,0.28)] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="font-['Poppins'] text-[22px] sm:text-[26px] md:text-[30px] font-bold text-[#111b33] uppercase mb-2 tracking-normal">
                  Upgrade Plan
                </h2>
                <p className="text-[14px] text-[#63738d] mt-1">
                  Choose the plan you want and send the upgrade request to master panel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="h-9 w-9 rounded-full border border-[#d7dfeb] text-[#5c6d84] inline-flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div
              className={`grid grid-cols-1 ${upgradePlanCards.length > 1 ? "md:grid-cols-2" : ""
                } gap-4 mx-auto ${upgradePlanCards.length > 1 ? "max-w-[700px]" : "max-w-[320px]"
                }`}
            >
              {upgradePlanCards.map((plan) => (
                <div
                  key={plan.key}
                  className="w-full max-w-[300px] rounded-[30px] bg-[#eef2f7] p-4 border border-[#d9e1ec] shadow-[0_4px_18px_rgba(15,27,53,0.05)] flex flex-col"
                >
                  <h3 className="text-[18px] font-bold text-[#0f1b35] text-center mt-1">
                    {plan.title}
                  </h3>
                  <p className="text-[11px] text-[#667791] text-center mt-2 min-h-[30px]">
                    {plan.subtitle}
                  </p>
                  <p className="text-center mt-3 mb-3 text-[#0f1b35] font-bold text-[18px]">
                    {plan.priceLabel}
                  </p>

                  <div className="h-px bg-[#d8e0ea] mb-3" />

                  <div className="space-y-2 flex-1 rounded-2xl border border-[#dce4ee] bg-[#f7f9fc] px-3 py-2">
                    {plan.moduleGroups.flatMap((group) => group.items || []).map((item) => (
                      <div key={`${plan.key}-${item}`} className="flex items-start gap-2">
                        <CheckCircle2 size={12} className="text-[#23c35c] mt-0.5" />
                        <span className="text-[11px] text-[#4f627d]">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="h-px bg-[#d8e0ea] mt-3 mb-2" />
                  <p className="text-[11px] text-[#9aa8bc] text-center mb-2">{plan.note}</p>

                  <div className="w-full">
                    <PrimaryButton
                      title={
                        requestedUpgradePlan === plan.key
                          ? "Requested"
                          : isUpgradeSubmitting
                            ? "Sending..."
                            : `Upgrade to ${plan.title}`
                      }
                      handleSubmit={() => {
                        void handleUpgradePlanRequest(plan.key);
                      }}
                      disabled={isUpgradeSubmitting || requestedUpgradePlan === plan.key}
                      className="w-full rounded-full"
                      padding="py-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      , document.body) : null}
    </div>
  );
}
