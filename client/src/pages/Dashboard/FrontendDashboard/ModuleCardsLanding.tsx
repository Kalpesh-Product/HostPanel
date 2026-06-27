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
  UserCog,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
  Warehouse,
  Wrench,
} from "lucide-react";
import type { ElementType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Card from "../../../components/Card";
import PageFrame from "../../../components/Pages/PageFrame";
import PrimaryButton from "../../../components/PrimaryButton";
import useAuth from "../../../hooks/useAuth";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { PLAN_UI_DATA } from "../../WorkspaceSetup/workspaceSetupPlans";
import { getEnabledModuleIdsForPlan, getWorkspaceCount } from "../../../utils/workspacePlanAccess";
import { toast } from "sonner";

type PlanType = "basic" | "professional" | "custom";

type SectionType =
  | "common-modules"
  | "extra-common-modules"
  | "key-apps"
  | "company-settings"
  | "founder-core-modules"
  | "department-accesses";

type LandingCard = {
  id: string;
  title: string;
  route?: string;
  icon?: ReactNode;
  isEnabled: boolean;
  isInteractive?: boolean;
  upgradeLocked?: boolean;
  disabledTitle?: string;
  helperText?: string;
};

type WorkspaceSetupState = {
  selectedPlan?: PlanType;
  enabledModuleIds?: string[];
};

type WorkspaceModuleTab = {
  id?: string;
  label?: string;
  route?: string;
  implemented?: boolean;
  unlockedInWorkspace?: boolean;
};

type WorkspaceModuleItem = {
  id?: string;
  label?: string;
  route?: string;
  implemented?: boolean;
  unlockedInWorkspace?: boolean;
  tabs?: WorkspaceModuleTab[];
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

const SECTION_TITLES: Record<SectionType, string> = {
  "common-modules": "Common Modules",
  "extra-common-modules": "Extra Common Modules",
  "key-apps": "Key Apps",
  "founder-core-modules": "Founder Core Modules",
  "department-accesses": "Department Accesses",
};

const DEFAULT_SECTION_ROUTES: Record<string, string> = {
  dashboard: "/dashboard",
  tickets: "/tickets",
  "meeting-room-system": "/meetings/meeting-rooms",
  "customer-support": "/company-settings/customer-support",
  tasks: "/extra-common-modules/tasks",
  "leave-requests": "/leave-requests",
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

const SECTION_FALLBACKS: Record<SectionType, WorkspaceModuleSection> = {
  "common-modules": {
    sectionId: "common-modules",
    sectionLabel: "Common Modules",
    items: [
      { id: "dashboard", label: "Dashboard", route: "/dashboard", implemented: true, unlockedInWorkspace: true },
      { id: "customer-support", label: "Customer Support", route: "/company-settings/customer-support", implemented: true, unlockedInWorkspace: true },
      { id: "attendance", label: "Attendance", implemented: false, unlockedInWorkspace: false },
      { id: "tasks", label: "Tasks", route: "/extra-common-modules/tasks", implemented: true, unlockedInWorkspace: true },
      { id: "tickets", label: "Tickets", route: "/tickets", implemented: true, unlockedInWorkspace: true },
      { id: "leave-requests", label: "Leave Requests", route: "/leave-requests", implemented: true, unlockedInWorkspace: true },
      { id: "meeting-room-system", label: "Meeting Room Booking", route: "/meetings/meeting-rooms", implemented: true, unlockedInWorkspace: true },
      { id: "calendar", label: "Calendar", route: "/calendar", implemented: true, unlockedInWorkspace: true },
    ],
  },
  "extra-common-modules": {
    sectionId: "extra-common-modules",
    sectionLabel: "Extra Common Modules",
    items: [
      { id: "assets", label: "Assets", implemented: false, unlockedInWorkspace: false },
      { id: "inventory", label: "Inventory", implemented: false, unlockedInWorkspace: false },
      { id: "finance-management", label: "Finance Management", implemented: false, unlockedInWorkspace: false },
      { id: "reports", label: "Reports", implemented: false, unlockedInWorkspace: false },
      { id: "tasks", label: "Tasks", route: "/extra-common-modules/tasks", implemented: true, unlockedInWorkspace: true },
    ],
  },
  "key-apps": {
    sectionId: "key-apps",
    sectionLabel: "Key Apps",
    items: [
      { id: "visitor-management", label: "Visitor Management", route: "/visitors/visitor-management", implemented: true, unlockedInWorkspace: true },
      { id: "website-builder", label: "Website Builder", route: "/company-settings/website-builder", implemented: true, unlockedInWorkspace: true },
      { id: "wono-nomad", label: "Wono Nomad", route: "/company-settings/wono-nomad", implemented: true, unlockedInWorkspace: true },
      { id: "leads-management", label: "Leads Management", route: "/sales-crm/leads-management", implemented: true, unlockedInWorkspace: true },
    ],
  },
  "founder-core-modules": {
    sectionId: "founder-core-modules",
    sectionLabel: "Founder Core Modules",
    items: [
      { id: "organization-management", label: "Organization Management", route: "/company-settings/organization-management", implemented: true, unlockedInWorkspace: true },
      { id: "access-grants", label: "Access Grants", route: "/company-settings/access-grants", implemented: true, unlockedInWorkspace: true },
      { id: "workspace-settings", label: "Unit Settings", route: "/company-settings/workspace-settings", implemented: true, unlockedInWorkspace: false },
      { id: "workspace-management", label: "Unit Management", route: "/company-settings/workspace-management", implemented: true, unlockedInWorkspace: false },
      { id: "analytics", label: "Analytics", implemented: false, unlockedInWorkspace: false },
    ],
  },
  "department-accesses": {
    sectionId: "department-accesses",
    sectionLabel: "Department Accesses",
    items: [
      { id: "hr-department", label: "HR Department", tabs: [] },
      { id: "administration-department", label: "Administration Department", tabs: [] },
      { id: "sales-department", label: "Sales Department", tabs: [] },
      { id: "finance-department", label: "Finance Department", tabs: [] },
      { id: "maintenance-department", label: "Maintenance Department", tabs: [] },
      { id: "tech-department", label: "Tech Department", tabs: [] },
      { id: "it-department", label: "IT Department", tabs: [] },
    ],
  },
};

const readWorkspaceSetup = (): WorkspaceSetupState => {
  try {
    const raw = localStorage.getItem("workspace_setup");
    if (!raw) return { selectedPlan: "basic", enabledModuleIds: [] };
    const parsed = JSON.parse(raw) as WorkspaceSetupState;
    return {
      selectedPlan: parsed?.selectedPlan || "basic",
      enabledModuleIds: Array.isArray(parsed?.enabledModuleIds) ? parsed.enabledModuleIds : [],
    };
  } catch {
    return { selectedPlan: "basic", enabledModuleIds: [] };
  }
};

const LockedCard = ({
  title,
  icon,
  helperText,
  onClick,
}: {
  title: string;
  icon?: ReactNode;
  helperText?: string;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="relative flex h-60 w-full flex-col items-center justify-center rounded-2xl bg-white p-6 text-center shadow-md transition-all hover:shadow-lg"
  >
    {icon ? (
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
        {icon}
      </div>
    ) : null}
    <h3 className="text-base font-bold text-gray-700">{title}</h3>
    <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#1E3D73]">
      <Lock size={14} />
      <span>Locked</span>
    </div>
    {helperText ? <p className="mt-3 text-xs text-slate-500">{helperText}</p> : null}
    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white/45" />
  </button>
);

const resolveSectionId = (rawSection?: string): SectionType => {
  const normalized = String(rawSection || "").trim() as SectionType;
  if (normalized in SECTION_TITLES) return normalized;
  return "common-modules";
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

const DEPARTMENT_LABELS: Record<string, string> = {
  "hr-department": "HR Department",
  "administration-department": "Administration Department",
  "sales-department": "Sales Department",
  "finance-department": "Finance Department",
  "maintenance-department": "Maintenance Department",
  "tech-department": "Tech Department",
  "it-department": "IT Department",
};

const ModuleCardsLanding = ({ section }: { section?: SectionType }) => {
  const params = useParams();
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const [workspaceAccessMap, setWorkspaceAccessMap] = useState<WorkspaceAccessMapState | null>(null);
  const [isCardsHydrated, setIsCardsHydrated] = useState(false);
  const [roleAccessContext, setRoleAccessContext] = useState<RoleAccessContext>({
    role: "",
    grantedModules: [],
  });
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpgradeSubmitting, setIsUpgradeSubmitting] = useState(false);
  const [requestedUpgradePlan, setRequestedUpgradePlan] = useState("");
  const workspaceSetup = readWorkspaceSetup();
  const sectionId = resolveSectionId(section || params.sectionId);
  const departmentId = params.departmentId;

  useEffect(() => {
    let active = true;
    setIsCardsHydrated(false);
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
            (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)
              ?.workspaceMembership?.role ||
              (auth.user as { workspaceMembership?: { role?: string }; role?: string } | null)
                ?.role ||
              me?.role ||
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
          setIsCardsHydrated(true);
        }
      }
    };
    void loadWorkspaceAccessMap();
    return () => {
      active = false;
    };
  }, [auth.user, axiosPrivate]);

  const planLabel =
    workspaceAccessMap?.selectedPlan || workspaceSetup.selectedPlan || "basic";
  const workspaceCount = getWorkspaceCount(
    (auth.user as { workspaceCount?: number } | null)?.workspaceCount,
  );
  const enabledIds = useMemo(
    () =>
      new Set([
        ...getEnabledModuleIdsForPlan(planLabel, workspaceCount),
        ...(workspaceAccessMap?.enabledModuleIds || workspaceSetup.enabledModuleIds || []),
      ]),
    [planLabel, workspaceAccessMap?.enabledModuleIds, workspaceCount, workspaceSetup.enabledModuleIds],
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

    const enabledRaw = (workspaceAccessMap?.enabledModuleIds || workspaceSetup.enabledModuleIds || [])
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    const enabledNormalized = new Set(enabledRaw.map((item) => normalizeModuleToken(item)));
    const hasAnyOrgChildEnabled = Array.from(ORG_CHILD_KEYS).some((key) => enabledNormalized.has(key));
    if (hasAnyOrgChildEnabled) {
      enabledRaw.push("organization-management", "org_tab_users", "org_tab_departments");
    }

    return new Set(
      enabledRaw.map(resolveCanonical).map((item) => String(item || "").trim()).filter(Boolean),
    );
  }, [workspaceAccessMap?.enabledModuleIds, workspaceAccessMap?.moduleMap?.sections, workspaceSetup.enabledModuleIds]);

  const matchedWorkspaceSection = useMemo(() => {
    const mappedSections = workspaceAccessMap?.moduleMap?.sections || [];
    return mappedSections.find(
      (item) => String(item?.sectionId || "").trim() === sectionId,
    );
  }, [sectionId, workspaceAccessMap?.moduleMap?.sections]);

  const isUsingWorkspaceSection = Boolean(matchedWorkspaceSection);

  const sectionData = useMemo(() => {
    if (matchedWorkspaceSection) return matchedWorkspaceSection;
    if (!isCardsHydrated) return null;
    return SECTION_FALLBACKS[sectionId];
  }, [isCardsHydrated, matchedWorkspaceSection, sectionId]);

  const cards = useMemo(() => {
    const rawItems = Array.isArray(sectionData?.items) ? sectionData.items : [];
    const remappedItems = rawItems.map((item) => {
      const itemId = String(item?.id || "").trim();
      if (itemId === "website-leads")
        return { ...item, id: "leads-management", label: "Leads Management", route: "/sales-crm/leads-management" };
      if (itemId === "resource-pricing")
        return { ...item, label: "Resource & Pricing" };
      return item;
    });

    const items = departmentId && sectionId === "department-accesses"
      ? (() => {
          const dept = remappedItems.find(i => String(i?.id || "").trim() === departmentId);
          const tabs = dept && Array.isArray(dept.tabs) ? dept.tabs : [];
          return tabs.map(t => ({ ...t, _parentDept: dept?.label || departmentId }));
        })()
      : remappedItems;

    return items
      .map((item): LandingCard | null => {
        const itemId = String(item?.id || "").trim();
        const itemLabel = String(item?.label || itemId).trim();
        const Icon = ICON_BY_ID[itemId];
        const iconNode = Icon ? <Icon size={26} /> : undefined;
        const routedItem = String(item?.route || DEFAULT_SECTION_ROUTES[itemId] || "").trim() || undefined;

        if (sectionId === "department-accesses" && !departmentId) {
          const tabs = Array.isArray(item?.tabs) ? item.tabs : [];
          const unlockedChildren = tabs.filter((tab) => {
            const tabId = String(tab?.id || "").trim();
            const workspaceUnlocked = isUsingWorkspaceSection
              ? workspaceEnabledCanonicalIds.has(tabId)
              : workspaceEnabledCanonicalIds.has(tabId) || enabledIds.has(tabId);
            const roleUnlocked = roleAllowedModuleIds.has(tabId);
            return Boolean(workspaceUnlocked && roleUnlocked);
          });
          const firstRoutedUnlockedChild = unlockedChildren.find((tab) => Boolean(tab?.route));
          const hasUnlockedChildren = unlockedChildren.length > 0;
          return {
            id: itemId,
            title: itemLabel,
            route: hasUnlockedChildren ? `/module-sections/department-accesses/${itemId}` : undefined,
            icon: iconNode,
            isEnabled: hasUnlockedChildren,
            isInteractive: hasUnlockedChildren,
            upgradeLocked: !hasUnlockedChildren,
            disabledTitle: !hasUnlockedChildren ? "Upgrade plan to unlock this" : undefined,
            helperText:
              unlockedChildren.length > 0
                ? `${unlockedChildren.length} active module${unlockedChildren.length > 1 ? "s" : ""} inside`
                : "Department modules",
          };
        }

        const basicPlanLocked = planLabel === "basic" && BASIC_PLAN_HARD_LOCK_IDS.has(itemId);
        const workspaceUnlocked = isUsingWorkspaceSection
          ? (workspaceEnabledCanonicalIds.has(itemId) || (sectionId === "common-modules" && enabledIds.has(itemId)))
          : workspaceEnabledCanonicalIds.has(itemId) || enabledIds.has(itemId);
        const roleUnlocked = roleAllowedModuleIds.has(itemId);
        const isEnabled = Boolean(workspaceUnlocked && roleUnlocked && !basicPlanLocked);
        const upgradeLocked = Boolean(basicPlanLocked || !workspaceUnlocked);
        return {
          id: itemId,
          title: itemLabel,
          route: routedItem,
          icon: iconNode,
          isEnabled,
          isInteractive: Boolean(routedItem),
          upgradeLocked,
          disabledTitle:
            upgradeLocked
              ? "Upgrade plan to unlock this"
              : !roleUnlocked
                ? "You do not have access to this module"
                : undefined,
        };
      })
      .filter(Boolean) as LandingCard[];
  }, [
    enabledIds,
    isUsingWorkspaceSection,
    planLabel,
    roleAllowedModuleIds,
    sectionData,
    sectionId,
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

  const pageTitle = departmentId && sectionId === "department-accesses"
    ? DEPARTMENT_LABELS[departmentId] || departmentId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : SECTION_TITLES[sectionId];

  return (
    <PageFrame>
      <div className="p-4 md:p-6">
        <h2 className="mb-6 text-title font-pmedium uppercase text-primary">{pageTitle}</h2>
        {!isCardsHydrated && !sectionData ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`cards-skeleton-${index}`} className="h-60 rounded-2xl bg-gray-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <div key={card.id}>
                {card.isEnabled && card.route ? (
                  <Card
                    title={card.title}
                    icon={card.icon}
                    route={card.route}
                    fullHeight
                    state={departmentId && sectionId === "department-accesses" ? { fromSection: "department-accesses" } : undefined}
                  />
                ) : card.isEnabled ? (
                  <Card
                    title={card.title}
                    icon={card.icon}
                    route="#"
                    fullHeight
                    interactive={Boolean(card.isInteractive)}
                  />
                ) : (
                  <LockedCard
                    title={card.title}
                    icon={card.icon}
                    helperText={card.helperText}
                    onClick={
                      card.upgradeLocked && upgradePlanCards.length > 0
                        ? () => setIsUpgradeModalOpen(true)
                        : undefined
                    }
                  />
                )}
              </div>
            ))}
          </div>
        )}
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
      ) : null}
    </PageFrame>
  );
};

export default ModuleCardsLanding;
