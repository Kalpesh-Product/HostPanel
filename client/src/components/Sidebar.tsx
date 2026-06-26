import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
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
  Calendar,
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
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSidebar } from "../context/SideBarContext";
import useAuth from "../hooks/useAuth";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import useLogout from "../hooks/useLogout";
import PrimaryButton from "./PrimaryButton";
import { PLAN_UI_DATA } from "../pages/WorkspaceSetup/workspaceSetupPlans";
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
  upgradeLocked?: boolean;
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
  { id: "organization-management", label: "Organization Management", icon: Building, route: "/company-settings/organization-management" },
  { id: "module-management", label: "Module Management", icon: Boxes, disabled: true },
  { id: "access-grants", label: "Access Grants", icon: UserCog, route: "/company-settings/access-grants" },
  { id: "unit-settings", label: "Unit Settings", icon: Settings, route: "/company-settings/unit-settings", disabled: true },
  { id: "unit-management", label: "Unit Management", icon: MonitorCog, route: "/company-settings/unit-management", disabled: true },
  { id: "analytics", label: "Analytics", icon: BarChart, disabled: true },
  { id: "customer-support", label: "Customer Support", icon: MessageSquareCode, route: "/company-settings/customer-support" },
];

const keyAppsData: NavNode[] = [
  { id: "visitor-management", label: "Visitor Management", icon: ContactRound, route: "/visitors/visitor-management", disabled: false },
  { id: "website-builder", label: "Website Builder", icon: Globe, route: "/company-settings/website-builder", disabled: false },
  { id: "wono-nomad", label: "Wono Nomad", icon: ShieldCheck, route: "/company-settings/wono-nomad", disabled: false },
  { id: "leads-management", label: "Leads Management", icon: Magnet, route: "/sales-crm/leads-management", disabled: false },
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
      { id: "tenant-companies-admin", label: "Tenant Companies", icon: Building2, route: "/administration/tenant-companies", disabled: false },
      { id: "bookings", label: "Bookings", icon: Bed, route: "/administration/bookings", disabled: false },
      {
        id: "visitors-management",
        label: "Visitors Management",
        icon: ContactRound,
        route: "/visitors/visitor-management",
        disabled: false,
      },
      { id: "resource-management", label: "Resource Management", icon: HandCoins, route: "/administration/resource-management", disabled: false },
      { id: "house-keeping", label: "House Keeping", icon: Wrench, route: "/administration/house-keeping", disabled: false },
    ],
  },
  {
    id: "sales-department",
    label: "Sales Department",
    icon: BriefcaseBusiness,
    defaultOpen: false,
    children: [
      { id: "leads-management", label: "Leads Management", icon: Magnet, route: "/sales/leads-management", disabled: false },
      { id: "tenant-companies-sales", label: "Tenant Companies", icon: Building2, route: "/sales/tenant-companies", disabled: false },
      { id: "resource-pricing", label: "Resource & Pricing", icon: Tag, route: "/sales-crm/resource-pricing", disabled: false },
      { id: "sales-architecture", label: "Sales Architecture", icon: ShoppingCart, route: "/sales-crm/sales-architecture", disabled: false },
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
  attendance: "/dashboard/attendance",
  "customer-support": "/company-settings/customer-support",
  "website-builder": "/company-settings/website-builder",
  "wono-nomad": "/company-settings/wono-nomad",
  "website-leads": "/company-settings/website-builder/leads",
  "organization-management": "/company-settings/organization-management",
  "access-grants": "/company-settings/access-grants",
  "unit-settings": "/company-settings/unit-settings",
  "unit-management": "/company-settings/unit-management",
  "visitor-management": "/visitors/visitor-management",
  "visitors-management": "/visitors/visitor-management",
  "tenant-companies-sales": "/sales-crm/tenant-companies",
  "resource-pricing": "/sales-crm/resource-pricing",
  "leads-management": "/sales-crm/leads-management",
  "sales-architecture": "/sales-crm/sales-architecture",
  "tenant-companies-admin": "/administration/tenant-companies",
  bookings: "/administration/bookings",
  "resource-management": "/administration/resource-management",
  "house-keeping": "/administration/house-keeping",
  "meeting-room-system": "/meetings/meeting-rooms",
  assets: "/extra-common-modules/assets",
  inventory: "/extra-common-modules/inventory",
  "department-inventory": "/extra-common-modules/department-inventory",
  calendar: "/calendar",
  tickets: "/tickets",
  "tenant-dashboard": "/dashboard/tenant",
  "tenant-meeting-room-booking": "/dashboard/tenant/meeting-room-booking",
  "tenant-booking-history": "/dashboard/tenant/booking-history",
  "tenant-buy-credits": "/dashboard/tenant/buy-credits",
  "tenant-tickets": "/dashboard/tenant/tickets",
  "tenant-profile": "/profile/company-profile",
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
  calendar: Calendar,
  assets: Package,
  inventory: Warehouse,
  "department-inventory": Warehouse,
  "finance-management": Wallet,
  reports: FileChartColumn,
  "website-builder": Globe,
  "wono-nomad": ShieldCheck,
  "website-leads": NotebookText,
  "organization-management": Building,
  "module-management": Boxes,
  "access-grants": UserCog,
  "unit-settings": Settings,
  "unit-management": MonitorCog,
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
  "resource-pricing": Tag,
  "sales-architecture": ShoppingCart,
  "finance-budget": Wallet,
  "billing-payments": Receipt,
  accounting: Calculator,
  "maintenance-repair-logs": ScanSearch,
  "amc-maintenance-scheduler": CalendarClock,
  "tech-website-builder": Globe,
  "it-repair-logs": FileSearch,
  "tenant-dashboard": LayoutDashboard,
  "tenant-meeting-room-booking": CalendarCheck,
  "tenant-booking-history": Clock,
  "tenant-buy-credits": HandCoins,
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
  // Collapsed module buttons (top-level with no depth offset) use rounded-md;
  // expanded submenu items use rounded-full pill shape.
  const isTopLevel = depth === 0;
  // Collapsed icon-only buttons get rounded-md; everything else (hover + active) gets rounded-full
  const shapeClass = (collapsed && isTopLevel) ? "rounded-md" : "rounded-full";

  return (
    <button
      type="button"
      title={tooltip || (disabled ? (disabledTitle || "Coming soon") : "")}
      className={`w-full flex items-center justify-between py-2.5 px-3 my-1.5 select-none ${shapeClass} transition-colors ${
        isActive
          ? "bg-gray-200 text-gray-900"
          : "text-gray-700 hover:bg-gray-200"
      } ${isRed ? "text-red-500 hover:text-red-600" : ""} ${
        locked ? "opacity-75 cursor-not-allowed" : unavailable ? "cursor-default" : "cursor-pointer"
      }`}
      style={{ paddingLeft: `${depth * 1.25 + 0.75}rem` }}
      onClick={onClick}
    >
      <span className="flex items-center gap-3 min-w-0">
        {Icon && (
          <Icon
            size={collapsed || isTopLevel ? 16 : 15}
            className={isRed ? "text-red-500" : "text-gray-500"}
          />
        )}
        {!collapsed && (
          <span
            className={`${forceSmall ? "text-[10px]" : "text-[12px]"} truncate ${forceBold ? "font-pbold" : "font-pmedium"} uppercase`}
          >
            {label}
          </span>
        )}
      </span>
      {!collapsed && hasChildren && (isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />)}
      {!collapsed && locked && !hasChildren && <Lock size={12} className="text-gray-400" />}
    </button>
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
      return pathname === "/company-settings/website-builder";
    }
    return pathname.startsWith(item.route);
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
  });
  const workspaceSetup = readWorkspaceSetup();

  useEffect(() => {
    let active = true;
    setIsSidebarHydrated(false);

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
        const memberGranted = Array.isArray(payload?.currentMemberGrantedModules)
          ? payload.currentMemberGrantedModules
          : [];
        setRoleAccessContext({
          role: String(
            (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)?.workspaceMembership?.role ||
            (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)?.role ||
            me?.role ||
            "",
          ),
          departments: Array.isArray(me?.departmentNames) ? me.departmentNames : [],
          grantedModules: memberGranted,
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
  const isWorkspaceManagementUnlocked =
    planLabel === "professional" && workspaceCount > 1;
  const enabledIds = new Set([
    ...getEnabledModuleIdsForPlan(planLabel, workspaceCount),
    ...(workspaceAccessMap?.enabledModuleIds || workspaceSetup.enabledModuleIds || []),
    "calendar",
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
      const hostCompaniesResponse = await axiosPrivate.get("http://localhost:5007/api/hosts/host-companies");
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
      if (!item.disabled) return item;
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

    const planDefaults = getEnabledModuleIdsForPlan(planLabel, workspaceCount);
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
    workspaceAccessMap?.enabledModuleIds,
    workspaceAccessMap?.moduleMap?.sections,
    workspaceAccessMap?.selectedPlan,
    workspaceSetup.enabledModuleIds,
    workspaceSetup.selectedPlan,
    planLabel,
    workspaceCount,
  ]);

  const mappedSections: Array<{ key: string; title: string; items: NavNode[] }> = (
    workspaceAccessMap?.moduleMap?.sections || []
  ).map((section) => {
    const sectionKey = String(section?.sectionId || section?.sectionLabel || "section");
    const mappedItems: NavNode[] = (section?.items || []).map((item) => {
      const itemId = String(item?.id || "").trim();
      const itemRoute = item?.route || ROUTE_BY_ID[itemId];
      const hasTabs = Array.isArray(item?.tabs) && item.tabs.length > 0;
      if (hasTabs) {
        const children = (item.tabs || [])
          .map((tab) => {
            const tabId = String(tab?.id || "").trim();
            const tabRoute = tab?.route || ROUTE_BY_ID[tabId];
            const workspaceUnlocked =
              workspaceEnabledCanonicalIds.has(tabId) ||
              (sectionKey === "common-modules" && enabledIds.has(tabId));
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
          icon: ICON_BY_ID[itemId] || Boxes,
          defaultOpen: false,
          children,
        };
      }
      const basicPlanLocked = planLabel === "basic" && BASIC_PLAN_HARD_LOCK_IDS.has(itemId);
      const workspaceUnlocked =
        workspaceEnabledCanonicalIds.has(itemId) ||
        (sectionKey === "common-modules" && enabledIds.has(itemId));
      const roleUnlocked = roleAllowedModuleIds.has(itemId);
      const isMeetingRoom = itemId === "meeting-room-system";
      return {
        id: itemId,
        label: String(item?.label || itemId),
        icon: ICON_BY_ID[itemId] || Boxes,
        route: itemRoute,
        disabled: isMeetingRoom ? false : (basicPlanLocked || !(workspaceUnlocked && roleUnlocked)),
        upgradeLocked: isMeetingRoom ? false : (basicPlanLocked || !workspaceUnlocked),
        disabledTitle: isMeetingRoom
          ? undefined
          : (basicPlanLocked || !workspaceUnlocked
            ? "Upgrade plan to unlock this"
            : !roleUnlocked
              ? "You do not have access to this module"
              : undefined),
      };
    }).filter(Boolean);
    let sortedItems = sortEnabledFirst(mappedItems);
    sortedItems = sortedItems.map((item) => {
      if (item.id === "website-leads")
        return { id: "leads-management", label: "Leads Management", icon: Magnet, route: "/sales-crm/leads-management", disabled: false };
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
  }).filter((section) => section.items.length > 0);

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

      const response = await axiosPrivate.patch("http://localhost:5007/api/hosts/request-upgrade-plan", {
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

  const navigateFromSidebar = (route: string, sectionKey?: string) => {
    navigate(route, { state: { fromSection: sectionKey }, flushSync: true });
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
    navigateFromSidebar(item.route, sectionKey);
  };

  return (
    <div
      className={`${collapsed ? "w-16" : "w-64"
        } h-[90vh] bg-[#f1f5f9] flex flex-col border-r border-gray-200 shadow-sm overflow-hidden transition-all duration-100`}
    >
      <div className="px-4 py-3 flex justify-center">
        <span className="text-[10px] font-bold tracking-wider text-gray-600 bg-gray-200 px-3 py-1 rounded-full uppercase">
          {collapsed ? planLabel[0].toUpperCase() : `Plan - ${planLabel}`}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-5 hideScrollBar">
        {!isSidebarHydrated ? (
          <div className="space-y-4 px-2 py-1 animate-pulse">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-gray-300/70 mx-2" />
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={`sidebar-skeleton-top-${idx}`} className="h-9 rounded-md bg-gray-200" />
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-gray-300/70 mx-2" />
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={`sidebar-skeleton-mid-${idx}`} className="h-9 rounded-md bg-gray-200" />
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-gray-300/70 mx-2" />
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={`sidebar-skeleton-low-${idx}`} className="h-9 rounded-md bg-gray-200" />
              ))}
            </div>
            <div className="mt-3 border-t border-gray-300/70 pt-3 space-y-2">
              <div className="h-3 w-14 rounded bg-gray-300/70 mx-2" />
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={`sidebar-skeleton-general-${idx}`} className="h-9 rounded-md bg-gray-200" />
              ))}
            </div>
          </div>
        ) : (
          (mappedSections.length > 0
            ? (() => {
              const hasKeyApps = mappedSections.some(s => s.key === "key-apps");
              if (hasKeyApps) {
                return mappedSections.map(s =>
                  s.key === "key-apps"
                    ? { ...s, items: [...s.items, ...keyAppsItems.filter(k => k.route && !k.disabled && !s.items.some(ex => ex.id === k.id))] }
                    : s
                );
              }
              return [...mappedSections, { key: "key-apps", title: "Key Apps", items: keyAppsItems }];
            })()
            : [
              { key: "company-settings", title: "Company Settings", items: companySettingsItems },
              { key: "key-apps", title: "Key Apps", items: keyAppsItems },
              { key: "department-accesses", title: "Department Accesses", items: departmentItems },
            ]).map((section) => (
              <div key={section.key}>
                {!collapsed ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenSections((current) => ({
                          ...current,
                          [section.key]: !(current?.[section.key] ?? section.key === "common-modules"),
                        }))
                      }
                      className="w-full mb-2 px-3 flex items-center justify-between text-left"
                    >
                      <span className="text-[12px] font-pbold text-gray-500 tracking-wider uppercase">
                        {section.title}
                      </span>
                      {openSections?.[section.key] ?? section.key === "common-modules" ? (
                        <ChevronDown size={14} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={14} className="text-gray-400" />
                      )}
                    </button>
                    {(openSections?.[section.key] ?? section.key === "common-modules") ? (
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
                    <div className="px-2 pt-1 pb-2">
                      <div className="text-[10px] font-pbold tracking-wider text-gray-500 uppercase text-center">
                        {SECTION_ABBR[section.key] || section.title.slice(0, 3).toUpperCase()}
                      </div>
                      <div className="mt-2 h-px bg-gray-300" />
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
            ))
        )}

        <div>
          {!collapsed ? (
            <div className="flex items-center justify-center px-3 mb-2">
              <div className="h-px bg-gray-300 flex-1" />
              <span className="text-[10px] font-pbold text-gray-500 tracking-wider px-2">General</span>
              <div className="h-px bg-gray-300 flex-1" />
            </div>
          ) : (
            <div className="px-2 pt-1 pb-2">
              <div className="text-[10px] font-pbold tracking-wider text-gray-500 uppercase text-center">GEN</div>
              <div className="mt-2 h-px bg-gray-300" />
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

      {isUpgradeModalOpen ? (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/45 backdrop-blur-[2px] px-4 py-6 flex items-center justify-center">
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
      ) : null}
    </div>
  );
}
