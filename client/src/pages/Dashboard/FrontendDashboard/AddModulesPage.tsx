import { createPortal } from "react-dom";
import {
  Calendar,
  CheckCircle2,
  BarChart,
  Bed,
  Boxes,
  BriefcaseBusiness,
  Building,
  Building2,
  CalendarCheck,
  CalendarClock,
  Calculator,
  Clock,
  ContactRound,
  FileChartColumn,
  FileSearch,
  Globe,
  HandCoins,
  Laptop,
  LayoutDashboard,
  ListChecks,
  Lock,
  Magnet,
  MessageSquareCode,
  MonitorCog,
  NotebookText,
  Package,
  Receipt,
  ScanSearch,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Ticket,
  X,
  ChevronDown,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  Plus,
} from "lucide-react";
import type { ElementType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../../components/Card";
import PageFrame from "../../../components/Pages/PageFrame";
import PrimaryButton from "../../../components/PrimaryButton";
import useAuth from "../../../hooks/useAuth";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { PLAN_UI_DATA } from "../../WorkspaceSetup/workspaceSetupPlans";
import { getEnabledModuleIdsForPlan, getWorkspaceCount } from "../../../utils/workspacePlanAccess";
import { toast } from "sonner";

type PlanType = "basic" | "professional" | "custom";

type WorkspaceModuleItem = {
  id?: string;
  label?: string;
  route?: string;
  implemented?: boolean;
  unlockedInWorkspace?: boolean;
  tabs?: WorkspaceModuleItem[];
};

type WorkspaceModuleSection = {
  sectionId?: string;
  sectionLabel?: string;
  items?: WorkspaceModuleItem[];
};

type WorkspaceAccessMapState = {
  selectedPlan?: PlanType;
  enabledModuleIds?: string[];
  currentMemberGrantedModules?: string[];
  moduleMap?: {
    sections?: WorkspaceModuleSection[];
  };
};

type RoleAccessContext = {
  role: string;
  grantedModules: string[];
};

type ModuleCard = {
  id: string;
  title: string;
  sectionLabel: string;
  route?: string;
  icon?: ReactNode;
  isEnabled: boolean;
  upgradeLocked?: boolean;
};

type AddOnModuleCard = ModuleCard & {
  unlocked: boolean;
  topLevelGroupKey: string;
  topLevelGroupLabel: string;
  subgroupKey?: string;
  subgroupLabel?: string;
};

const ADD_ON_TOP_LEVEL_ORDER = [
  { key: "common-modules", label: "Common Modules", roman: "I" },
  { key: "extra-common-modules", label: "Extra Common Modules", roman: "II" },
  { key: "key-apps", label: "Key Apps", roman: "III" },
  { key: "founder-core-modules", label: "Core Modules", roman: "IV" },
  { key: "department-accesses", label: "Department Accesses", roman: "V" },
] as const;

const DEPARTMENT_ORDER = [
  "HR Department",
  "Administration Department",
  "Sales Department",
  "Finance Department",
  "Maintenance Department",
  "Tech Department",
  "IT Department",
];

const DEFAULT_SECTION_ROUTES: Record<string, string> = {
  dashboard: "/dashboard",
  tickets: "/tickets",
  "customer-support": "/company-settings/customer-support",
  tasks: "/extra-common-modules/tasks",
  "leave-requests": "/leave-requests",
  attendance: "/extra-common-modules/attendance",
  calendar: "/calendar",
  assets: "/extra-common-modules/assets",
  inventory: "/extra-common-modules/inventory",
  "finance-management": "/extra-common-modules/finance-management",
  reports: "/extra-common-modules/reports",
  "employee-management": "/hr/employee-management",
  "hr-documents": "/hr/documents",
  recruitment: "/hr/recruitment",
  "leave-request-processing": "/hr/leave-request-processing",
  "attendance-review": "/hr/attendance-review",
  "payroll-management": "/hr/payroll-management",
  "exit-management": "/hr/exit-management",
  "tenant-companies-admin": "/administration/tenant-companies",
  bookings: "/administration/bookings",
  "visitors-management": "/visitors/visitor-management",
  "resource-management": "/administration/resource-management",
  "house-keeping": "/administration/house-keeping",
  "leads-management": "/sales-crm/leads-management",
  "tenant-companies-sales": "/sales-crm/tenant-companies",
  "resource-pricing": "/sales-crm/resource-pricing",
  "sales-architecture": "/sales-crm/sales-architecture",
  "finance-budget": "/finance/expenses-budget",
  "billing-payments": "/finance/billing-payments",
  accounting: "/finance/accounting",
  "maintenance-repair-logs": "/maintenance/repair-logs",
  "amc-maintenance-scheduler": "/maintenance/amc-scheduler",
  "tech-website-builder": "/company-settings/website-builder",
  "website-review": "/company-settings/website-builder/dynamic/reviews",
  "it-repair-logs": "/it/repair-logs",
  "it-system-access": "/it/system-access",
};

const DEPARTMENT_LABELS: Record<string, string> = {
  "hr-department": "HR Department",
  "administration-department": "Administration Department",
  "sales-department": "Sales Department",
  "finance-department": "Finance Department",
  "maintenance-department": "Maintenance Department",
  "tech-department": "Tech Department",
  "it-department": "IT Department",
};

const ICON_BY_ID: Record<string, ElementType> = {
  dashboard: LayoutDashboard,
  "customer-support": MessageSquareCode,
  attendance: Clock,
  tasks: ListChecks,
  tickets: Ticket,
  "leave-requests": CalendarClock,
  "meeting-room-system": CalendarClock,
  calendar: Calendar,
  assets: Package,
  inventory: Warehouse,
  "finance-management": Wallet,
  reports: FileChartColumn,
  "website-builder": Globe,
  "wono-nomad": ShieldCheck,
  "website-leads": NotebookText,
  "website-review": CheckCircle2,
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
  "attendance-review": ContactRound,
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
};

const BASIC_PLAN_HARD_LOCK_IDS = new Set(["workspace-settings", "workspace-management"]);
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

const CompactAddOnCard = ({
  title,
  icon,
  locked = false,
  route,
  state,
  onClick,
}: {
  title: string;
  icon?: ReactNode;
  locked?: boolean;
  route?: string;
  state?: Record<string, unknown>;
  onClick?: () => void;
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (locked) {
      onClick?.();
      return;
    }
    if (onClick) {
      onClick();
      return;
    }
    if (route) {
      navigate(route, state ? { state } : undefined);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative flex min-h-[104px] w-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-3 text-center shadow-sm transition-all hover:border-slate-300 hover:shadow-md ${
        locked ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <div className="flex min-w-0 flex-col items-center gap-2">
        {icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[17px] text-slate-700">
            {icon}
          </div>
        ) : null}
        <span className="w-full break-words text-[10px] font-pmedium leading-[1.25] text-slate-800 sm:text-[11px]">
          {title}
        </span>
      </div>
      {locked ? <Lock size={13} className="absolute right-2.5 top-2.5 text-slate-500" /> : null}
    </button>
  );
};

const AddModulesPage = () => {
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const [workspaceAccessMap, setWorkspaceAccessMap] = useState<WorkspaceAccessMapState | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [roleAccessContext, setRoleAccessContext] = useState<RoleAccessContext>({
    role: "",
    grantedModules: [],
  });
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpgradeSubmitting, setIsUpgradeSubmitting] = useState(false);
  const [requestedUpgradePlan, setRequestedUpgradePlan] = useState("");
  const [openAddOnGroups, setOpenAddOnGroups] = useState<Record<string, boolean>>({});
  const [openDepartmentGroups, setOpenDepartmentGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    setIsHydrated(false);
    const loadWorkspaceAccessMap = async () => {
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
        const currentUserEmail = String((auth.user as { email?: string } | null)?.email || "")
          .trim()
          .toLowerCase();
        const me =
          teamMembers.find((member: any) => {
            const memberUserId = String(member?.userId || member?.id || "").trim();
            const memberEmail = String(member?.email || "").trim().toLowerCase();
            return (
              (memberUserId && memberUserId === currentUserId) ||
              (currentUserEmail && memberEmail === currentUserEmail)
            );
          }) || null;
        if (!active) return;
        setWorkspaceAccessMap({
          selectedPlan: payload?.selectedPlan || "basic",
          enabledModuleIds: Array.isArray(payload?.enabledModuleIds) ? payload.enabledModuleIds : [],
          currentMemberGrantedModules: Array.isArray(payload?.currentMemberGrantedModules)
            ? payload.currentMemberGrantedModules
            : [],
          moduleMap: payload?.moduleMap || { sections: [] },
        });
        const memberGranted = Array.isArray(payload?.currentMemberGrantedModules)
          ? payload.currentMemberGrantedModules
          : [];
        setRoleAccessContext({
          role: String(
            me?.role ||
              (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)
                ?.workspaceMembership?.role ||
              (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)
                ?.role ||
              "",
          ),
          grantedModules: memberGranted,
        });
      } catch {
        if (!active) return;
        setWorkspaceAccessMap(null);
        setRoleAccessContext({
          role: String(
            (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)
              ?.workspaceMembership?.role ||
              (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)
                ?.role ||
              "",
          ),
          grantedModules: [],
        });
      } finally {
        if (active) {
          setIsHydrated(true);
        }
      }
    };
    void loadWorkspaceAccessMap();
    return () => {
      active = false;
    };
  }, [auth.user, axiosPrivate]);

  const planLabel =
    workspaceAccessMap?.selectedPlan || "basic";
  const workspaceCount = getWorkspaceCount(
    (auth.user as { workspaceCount?: number } | null)?.workspaceCount,
  );
  const enabledIds = useMemo(
    () =>
      new Set([
        ...getEnabledModuleIdsForPlan(planLabel, workspaceCount),
        ...(workspaceAccessMap?.enabledModuleIds || []),
      ]),
    [planLabel, workspaceAccessMap?.enabledModuleIds, workspaceCount],
  );
  const currentRole = normalizeRole(roleAccessContext.role);
  const isFounderRole = currentRole === "founder" || currentRole === "owner";
  const upgradePlanOptions =
    planLabel === "basic"
      ? ["professional", "custom"]
      : planLabel === "professional"
        ? ["custom"]
        : [];
  const upgradePlanCards = PLAN_UI_DATA.filter((plan) =>
    upgradePlanOptions.includes(plan.key),
  );

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

  const roleAllowedModuleIds = useMemo(() => {
    const sections = Array.isArray(workspaceAccessMap?.moduleMap?.sections)
      ? workspaceAccessMap.moduleMap.sections
      : [];

    const canonicalIds = new Set<string>();
    const aliasToCanonical = new Map<string, string>();

    sections.forEach((sectionItem) => {
      (Array.isArray(sectionItem?.items) ? sectionItem.items : []).forEach((item) => {
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
        if (canonicalIds.has(item)) return item;
        const normalized = normalizeModuleToken(item);
        const direct = aliasToCanonical.get(normalized);
        if (direct) return direct;
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
  }, [isFounderRole, planLabel, roleAccessContext.grantedModules, workspaceAccessMap?.moduleMap?.sections]);

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

    sections.forEach((sectionItem) => {
      (Array.isArray(sectionItem?.items) ? sectionItem.items : []).forEach((item) => {
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
      if (normalized === "administration-visitor-management") {
        const deptVisitor = aliasToCanonical.get("visitors-management");
        if (deptVisitor) return deptVisitor;
      }
      if (normalized === "housekeeping") {
        const housekeeping = aliasToCanonical.get("house-keeping");
        if (housekeeping) return housekeeping;
      }
      return rawTrimmed;
    };

    const enabledRaw = (workspaceAccessMap?.enabledModuleIds || [])
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    const enabledNormalized = new Set(enabledRaw.map(normalizeModuleToken));
    const hasAnyOrgChildEnabled = Array.from(ORG_CHILD_KEYS).some((key) => enabledNormalized.has(key));
    if (hasAnyOrgChildEnabled) {
      enabledRaw.push("organization-management", "org_tab_users", "org_tab_departments");
    }

    return new Set(
      enabledRaw.map(resolveCanonical).map((item) => String(item || "").trim()).filter(Boolean),
    );
  }, [workspaceAccessMap?.enabledModuleIds, workspaceAccessMap?.moduleMap?.sections]);

  const allModuleCards = useMemo(() => {
    const sections = Array.isArray(workspaceAccessMap?.moduleMap?.sections)
      ? workspaceAccessMap.moduleMap.sections
      : [];
    const cards: ModuleCard[] = [];

    const SKIP_IDS = new Set(["org-tab-users", "org-tab-departments"]);

    sections.forEach((section) => {
      const sectionLabel = String(section?.sectionLabel || section?.sectionId || "Modules");
      const sectionId = String(section?.sectionId || "").trim();

      (Array.isArray(section?.items) ? section.items : []).forEach((item) => {
        const itemId = String(item?.id || "").trim();
        if (SKIP_IDS.has(itemId)) return;

        const itemLabel = String(item?.label || itemId).trim();
        const Icon = ICON_BY_ID[itemId];
        const iconNode = Icon ? <Icon size={26} /> : undefined;
        const routedItem = String(item?.route || "").trim() || undefined;
        const hasTabs = Array.isArray(item?.tabs) && item.tabs.length > 0;

        if (hasTabs) {
          const tabs = item.tabs || [];
          const unlockedTabs = tabs.filter((tab) => {
            const tabId = String(tab?.id || "").trim();
            if (SKIP_IDS.has(tabId)) return false;
            const workspaceUnlocked = workspaceEnabledCanonicalIds.has(tabId) || enabledIds.has(tabId);
            const roleUnlocked = roleAllowedModuleIds.has(tabId);
            return Boolean(workspaceUnlocked && roleUnlocked);
          });
          const hasUnlocked = unlockedTabs.length > 0;
          const deptRoute = sectionId === "department-accesses"
            ? `/module-sections/department-accesses/${itemId}`
            : undefined;
          cards.push({
            id: itemId,
            title: itemLabel,
            sectionLabel,
            route: hasUnlocked ? (deptRoute || routedItem) : undefined,
            icon: iconNode,
            isEnabled: hasUnlocked,
            upgradeLocked: !hasUnlocked,
          });
          return;
        }

        const basicPlanLocked = planLabel === "basic" && BASIC_PLAN_HARD_LOCK_IDS.has(itemId);
        const workspaceUnlocked = workspaceEnabledCanonicalIds.has(itemId) || enabledIds.has(itemId);
        const roleUnlocked = roleAllowedModuleIds.has(itemId);
        const isEnabled = Boolean(workspaceUnlocked && roleUnlocked && !basicPlanLocked);
        const upgradeLocked = Boolean(basicPlanLocked || !workspaceUnlocked);

        cards.push({
          id: itemId,
          title: itemLabel,
          sectionLabel,
          route: routedItem,
          icon: iconNode,
          isEnabled,
          upgradeLocked,
        });
      });
    });

    return cards;
  }, [
    enabledIds,
    planLabel,
    roleAllowedModuleIds,
    workspaceAccessMap?.moduleMap?.sections,
    workspaceEnabledCanonicalIds,
  ]);

  const addOnGroups = useMemo(() => {
    const sections = Array.isArray(workspaceAccessMap?.moduleMap?.sections)
      ? workspaceAccessMap.moduleMap.sections
      : [];
    if (!sections.length) return [];

    const SKIP_IDS = new Set(["org-tab-users", "org-tab-departments"]);
    const findSection = (id: string) =>
      sections.find((section) => String(section?.sectionId || "").trim() === id);

    const buildCard = (
      item: WorkspaceModuleItem,
      topLevelGroupKey: string,
      topLevelGroupLabel: string,
      subgroupKey?: string,
      subgroupLabel?: string,
    ): AddOnModuleCard | null => {
      const itemId = String(item?.id || "").trim();
      if (!itemId || SKIP_IDS.has(itemId)) return null;
      const itemLabel = String(item?.label || itemId).trim();
      const Icon = ICON_BY_ID[itemId];
      const iconNode = Icon ? <Icon size={26} /> : undefined;
      const route = String(item?.route || DEFAULT_SECTION_ROUTES[itemId] || "").trim() || undefined;
      const basicPlanLocked = planLabel === "basic" && BASIC_PLAN_HARD_LOCK_IDS.has(itemId);
      const workspaceUnlocked = workspaceEnabledCanonicalIds.has(itemId) || enabledIds.has(itemId);
      const roleUnlocked = roleAllowedModuleIds.has(itemId);
      const unlocked = Boolean(workspaceUnlocked && roleUnlocked && !basicPlanLocked);
      return {
        id: itemId,
        title: itemLabel,
        sectionLabel: topLevelGroupLabel,
        route: unlocked ? route : undefined,
        icon: iconNode,
        isEnabled: unlocked,
        upgradeLocked: Boolean(basicPlanLocked || !workspaceUnlocked),
        unlocked,
        topLevelGroupKey,
        topLevelGroupLabel,
        subgroupKey,
        subgroupLabel,
      };
    };

    const groups: Array<{
      key: string;
      label: string;
      roman?: string;
      cards?: AddOnModuleCard[];
      departments?: Array<{
        key: string;
        label: string;
        cards: AddOnModuleCard[];
      }>;
    }> = [];

    const commonSection = findSection("common-modules");
    const commonCards = (Array.isArray(commonSection?.items) ? commonSection.items : [])
      .map((item) => buildCard(item, "common-modules", "Common Modules"))
      .filter(Boolean) as AddOnModuleCard[];
    if (commonCards.length) groups.push({ key: "common-modules", label: "Common Modules", roman: "I", cards: commonCards });

    const extraSection = findSection("extra-common-modules");
    const extraCards = (Array.isArray(extraSection?.items) ? extraSection.items : [])
      .filter((item) => String(item?.id || "").trim() !== "attendance")
      .map((item) =>
        buildCard(
          String(item?.id || "").trim() === "website-leads"
            ? { ...item, label: "Website Leads" }
            : item,
          "extra-common-modules",
          "Extra Common Modules",
        ),
      )
      .filter(Boolean) as AddOnModuleCard[];
    if (extraCards.length) groups.push({ key: "extra-common-modules", label: "Extra Common Modules", roman: "II", cards: extraCards });

    const keyAppsSection = findSection("key-apps");
    const keyAppCards = (Array.isArray(keyAppsSection?.items) ? keyAppsSection.items : [])
      .map((item) => buildCard(item, "key-apps", "Key Apps"))
      .filter(Boolean) as AddOnModuleCard[];
    if (keyAppCards.length) groups.push({ key: "key-apps", label: "Key Apps", roman: "III", cards: keyAppCards });

    const coreSection = findSection("founder-core-modules");
    const coreCards = (Array.isArray(coreSection?.items) ? coreSection.items : [])
      .map((item) => buildCard(item, "founder-core-modules", "Core Modules"))
      .filter(Boolean) as AddOnModuleCard[];
    if (coreCards.length) groups.push({ key: "founder-core-modules", label: "Core Modules", roman: "IV", cards: coreCards });

    const deptSection = findSection("department-accesses");
    const departmentItems = Array.isArray(deptSection?.items) ? deptSection.items : [];
    const deptGroups = DEPARTMENT_ORDER.map((deptLabel) => {
      const dept = departmentItems.find(
        (item) => String(item?.label || DEPARTMENT_LABELS[String(item?.id || "").trim()] || "").trim() === deptLabel,
      );
      if (!dept) return null;
      const deptKey = String(dept?.id || deptLabel).trim();
      const deptCards = (Array.isArray(dept?.tabs) ? dept.tabs : [])
        .map((tab) => buildCard(tab, "department-accesses", "Department Accesses", deptKey, deptLabel))
        .filter(Boolean) as AddOnModuleCard[];
      if (!deptCards.length) return null;
      return { key: deptKey, label: deptLabel, cards: deptCards };
    })
      .filter(Boolean)
      .sort((a, b) => {
        const enabledDelta =
          b.cards.filter((card) => card.isEnabled).length - a.cards.filter((card) => card.isEnabled).length;
        if (enabledDelta !== 0) return enabledDelta;
        const cardDelta = b.cards.length - a.cards.length;
        if (cardDelta !== 0) return cardDelta;
        return a.label.localeCompare(b.label);
      }) as Array<{ key: string; label: string; cards: AddOnModuleCard[] }>;

    if (deptGroups.length) {
      groups.push({
        key: "department-accesses",
        label: "Department Accesses",
        roman: "V",
        departments: deptGroups,
      });
    }

    return groups;
  }, [
    enabledIds,
    planLabel,
    roleAllowedModuleIds,
    workspaceAccessMap?.moduleMap?.sections,
    workspaceEnabledCanonicalIds,
  ]);

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

  const enabledCount = allModuleCards.filter((c) => c.isEnabled).length;
  const lockedCount = allModuleCards.filter((c) => !c.isEnabled).length;

  return (
    <PageFrame>
      <div className="p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-title font-pmedium uppercase text-primary">Add Modules</h2>
            <p className="mt-1 text-sm text-slate-500">
              {enabledCount} enabled &middot; {lockedCount} locked
            </p>
          </div>
        </div>
        {!isHydrated && !workspaceAccessMap ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 animate-pulse">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={`add-skeleton-${index}`} className="h-60 rounded-2xl bg-gray-200" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {addOnGroups.map((group) => (
              <div
                key={group.key}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenAddOnGroups((prev) => ({
                      ...prev,
                      [group.key]: !prev[group.key],
                    }))
                  }
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <div>
                    <h3 className="text-[15px] font-pmedium uppercase tracking-wide text-slate-800">
                      {group.roman ? `${group.roman}. ` : ""}
                      {group.label}
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {group.key === "department-accesses"
                        ? (group.departments || []).filter((department) =>
                            department.cards.some((card) => card.isEnabled),
                          ).length
                        : (group.cards || []).filter((card) => card.isEnabled).length} enabled &middot;{" "}
                      {group.key === "department-accesses"
                        ? (group.departments || []).filter((department) =>
                            department.cards.every((card) => !card.isEnabled),
                          ).length
                        : (group.cards || []).filter((card) => !card.isEnabled).length} locked
                      {group.key === "department-accesses"
                        ? ` · ${group.departments?.length || 0} departments`
                        : ""}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
                      openAddOnGroups[group.key] ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openAddOnGroups[group.key] ? (
                  <div className="border-t border-slate-200 px-5 py-5">
                  {group.key !== "department-accesses" ? (
                    <div className="space-y-5">
                      {(() => {
                        const enabledCards = [...(group.cards || [])]
                          .filter((card) => card.isEnabled)
                          .sort((a, b) => a.title.localeCompare(b.title));
                        const disabledCards = [...(group.cards || [])]
                          .filter((card) => !card.isEnabled)
                          .sort((a, b) => a.title.localeCompare(b.title));
                        return (
                          <>
                            <div className="space-y-3">
                              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600">
                                Enabled
                              </p>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                                {enabledCards.map((card) => (
                                  <div key={card.id}>
                                    <CompactAddOnCard
                                      title={card.title}
                                      icon={card.icon}
                                      route={card.route}
                                      state={{ fromSection: "add-ons" }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            {disabledCards.length > 0 ? (
                              <div className="space-y-3">
                                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                  Locked
                                </p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                                  {disabledCards.map((card) => (
                                    <div key={card.id}>
                                      <CompactAddOnCard
                                        title={card.title}
                                        icon={card.icon}
                                        locked
                                        onClick={
                                          card.upgradeLocked && upgradePlanCards.length > 0
                                            ? () => setIsUpgradeModalOpen(true)
                                            : undefined
                                        }
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(group.departments || []).map((department) => (
                        <div
                          key={department.key}
                          className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenDepartmentGroups((prev) => ({
                                ...prev,
                                [department.key]: !prev[department.key],
                              }))
                            }
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                          >
                            <div>
                              <h4 className="text-sm font-pmedium uppercase tracking-wide text-slate-700">
                                {department.label}
                              </h4>
                              <p className="mt-1 text-[11px] text-slate-500">
                                {department.cards.filter((card) => card.isEnabled).length} enabled &middot;{" "}
                                {department.cards.filter((card) => !card.isEnabled).length} locked
                              </p>
                            </div>
                            <ChevronDown
                              className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
                                openDepartmentGroups[department.key] ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          {openDepartmentGroups[department.key] ? (
                            <div className="border-t border-slate-200 px-4 py-4">
                              <div className="space-y-5">
                                {(() => {
                                  const enabledCards = [...department.cards]
                                    .filter((card) => card.isEnabled)
                                    .sort((a, b) => a.title.localeCompare(b.title));
                                  const disabledCards = [...department.cards]
                                    .filter((card) => !card.isEnabled)
                                    .sort((a, b) => a.title.localeCompare(b.title));
                                  return (
                                    <>
                                      <div className="space-y-3">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600">
                                          Enabled
                                        </p>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                                          {enabledCards.map((card) => (
                                            <div key={card.id}>
                                              <CompactAddOnCard
                                                title={card.title}
                                                icon={card.icon}
                                                route={card.route}
                                                state={{ fromSection: "add-ons" }}
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {disabledCards.length > 0 ? (
                                        <div className="space-y-3">
                                          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                            Locked
                                          </p>
                                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                                            {disabledCards.map((card) => (
                                              <div key={card.id}>
                                                <CompactAddOnCard
                                                  title={card.title}
                                                  icon={card.icon}
                                                  locked
                                                  onClick={
                                                    card.upgradeLocked && upgradePlanCards.length > 0
                                                      ? () => setIsUpgradeModalOpen(true)
                                                      : undefined
                                                  }
                                                />
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : null}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
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
              className={`grid grid-cols-1 ${
                upgradePlanCards.length > 1 ? "md:grid-cols-2" : ""
              } gap-4 mx-auto ${
                upgradePlanCards.length > 1 ? "max-w-[700px]" : "max-w-[320px]"
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
    </PageFrame>
  );
};

export default AddModulesPage;
