import {
  Globe,
  ShieldCheck,
  NotebookText,
  Building,
  Boxes,
  UserCog,
  Settings,
  MonitorCog,
  BarChart,
  MessageSquareCode,
  Clock,
  ListChecks,
  Ticket,
  CalendarClock,
  ContactRound,
  Package,
  Warehouse,
  Wallet,
  FileChartColumn,
  Lock,
} from "lucide-react";
import type { ReactNode } from "react";
import Card from "../../../components/Card";
import PageFrame from "../../../components/Pages/PageFrame";
import { getEnabledModuleIdsForPlan, getWorkspaceCount } from "../../../utils/workspacePlanAccess";
import useAuth from "../../../hooks/useAuth";

type PlanType = "basic" | "professional" | "custom";
type SectionType = "company-settings" | "key-apps";

type ModuleCard = {
  id: string;
  title: string;
  route?: string;
  icon?: ReactNode;
};

type WorkspaceSetupState = {
  selectedPlan?: PlanType;
  enabledModuleIds?: string[];
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

const companySettingsCards: ModuleCard[] = [
  { id: "website-builder", title: "Website Builder", route: "/company-settings/website-builder", icon: <Globe size={26} /> },
  { id: "wono-nomad", title: "Wono Nomad", route: "/company-settings/wono-nomad", icon: <ShieldCheck size={26} /> },
  { id: "website-leads", title: "Website Leads", route: "/company-settings/website-builder/leads", icon: <NotebookText size={26} /> },
  { id: "organization-management", title: "Organization Management", route: "/company-settings/organization-management", icon: <Building size={26} /> },
  { id: "module-management", title: "Module Management", icon: <Boxes size={26} /> },
  { id: "access-grants", title: "Access Grants", route: "/company-settings/access-grants", icon: <UserCog size={26} /> },
  { id: "workspace-settings", title: "Workspace Settings", route: "/company-settings/workspace-settings", icon: <Settings size={26} /> },
  { id: "workspace-management", title: "Workspace Management", route: "/company-settings/workspace-management", icon: <MonitorCog size={26} /> },
  { id: "analytics", title: "Analytics", icon: <BarChart size={26} /> },
  { id: "customer-support", title: "Customer Support", route: "/company-settings/customer-support", icon: <MessageSquareCode size={26} /> },
];

const keyAppsCards: ModuleCard[] = [
  { id: "attendance", title: "Attendance", icon: <Clock size={26} /> },
  { id: "tasks", title: "Tasks", icon: <ListChecks size={26} /> },
  { id: "tickets", title: "Tickets", icon: <Ticket size={26} /> },
  { id: "leave-requests", title: "Leave Requests", icon: <CalendarClock size={26} /> },
  { id: "meeting-room-system", title: "Meeting Room System", icon: <CalendarClock size={26} /> },
  { id: "visitor-management", title: "Visitor Management", route: "/visitors/visitor-management", icon: <ContactRound size={26} /> },
  { id: "assets", title: "Assets", icon: <Package size={26} /> },
  { id: "inventory", title: "Inventory", icon: <Warehouse size={26} /> },
  { id: "finance-management", title: "Finance Management", icon: <Wallet size={26} /> },
  { id: "chat-bot", title: "Chat Bot", icon: <MessageSquareCode size={26} /> },
  { id: "reports", title: "Reports", icon: <FileChartColumn size={26} /> },
];

const LockedCard = ({ title, icon }: { title: string; icon?: ReactNode }) => (
  <div className="relative flex h-60 w-full flex-col items-center justify-center rounded-2xl bg-white p-6 text-center shadow-md">
    {icon ? (
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
        {icon}
      </div>
    ) : null}
    <h3 className="text-base whitespace-nowrap font-bold text-gray-700">{title}</h3>
    <span className="mt-3 rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
      Locked
    </span>
    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white/45" />
    <Lock size={16} className="absolute right-4 top-4 text-slate-600" />
  </div>
);

const ModuleCardsLanding = ({ section }: { section: SectionType }) => {
  const { auth } = useAuth();
  const workspaceSetup = readWorkspaceSetup();
  const planLabel = workspaceSetup.selectedPlan || "basic";
  const workspaceCount = getWorkspaceCount(
    (auth.user as { workspaceCount?: number } | null)?.workspaceCount,
  );

  const enabledIds = new Set([
    ...getEnabledModuleIdsForPlan(planLabel, workspaceCount),
    ...(workspaceSetup.enabledModuleIds || []),
  ]);

  const cards = section === "company-settings" ? companySettingsCards : keyAppsCards;
  const pageTitle = section === "company-settings" ? "Company Settings" : "Key Apps";
  const alwaysUnlockedCompanySettingsIds = new Set(["wono-nomad", "customer-support"]);
  const orderedCards = cards
    .map((card, index) => ({
      card,
      index,
      isEnabled:
        Boolean(card.route) &&
        (enabledIds.has(card.id) ||
          (section === "company-settings" &&
            alwaysUnlockedCompanySettingsIds.has(card.id))),
    }))
    .sort((a, b) => {
      if (a.isEnabled === b.isEnabled) return a.index - b.index;
      return a.isEnabled ? -1 : 1;
    });

  return (
    <PageFrame>
      <div className="p-4 md:p-6">
        <h2 className="mb-6 text-title font-pmedium uppercase text-primary">{pageTitle}</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {orderedCards.map(({ card, isEnabled }) => {
            return (
              <div key={card.id}>
                {isEnabled ? (
                  <Card title={card.title} icon={card.icon} route={card.route as string} fullHeight />
                ) : (
                  <LockedCard title={card.title} icon={card.icon} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PageFrame>
  );
};

export default ModuleCardsLanding;
