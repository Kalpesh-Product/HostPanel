import type { PlanType } from "./inviteOnboarding";

const COMPANY_SETTINGS_IDS = [
  "website-builder",
  "nomad-listing",
  "website-leads",
  "reviews",
  "organization-management",
  "module-management",
  "access-grants",
  "workspace-settings",
  "analytics",
] as const;

const WORKSPACE_MANAGEMENT_ID = "workspace-management";

const BASIC_KEY_APP_IDS = [
  "tickets",
  "visitor-management",
  "chat-bot",
] as const;

const PROFESSIONAL_EXTRA_IDS = [
  "meeting-room-system",
  "leads-management",
  "tenant-companies-sales",
  "plans-pricing",
  "sales-architecture",
] as const;

const ALL_LEAF_IDS = [
  ...COMPANY_SETTINGS_IDS,
  WORKSPACE_MANAGEMENT_ID,
  "attendance",
  "tasks",
  "tickets",
  "leave-requests",
  "meeting-room-system",
  "visitor-management",
  "assets",
  "inventory",
  "finance-management",
  "chat-bot",
  "reports",
  "employee-management",
  "hr-documents",
  "recruitment",
  "leave-request-processing",
  "attendance-review",
  "payroll-management",
  "exit-management",
  "tenant-companies-admin",
  "bookings",
  "visitors-management",
  "resource-management",
  "house-keeping",
  "workspace-layout",
  "leads-management",
  "tenant-companies-sales",
  "plans-pricing",
  "sales-architecture",
  "finance-budget",
  "billing-payments",
  "accounting",
  "maintenance-repair-logs",
  "amc-maintenance-scheduler",
  "tech-website-builder",
  "it-repair-logs",
] as const;

export const getWorkspaceCount = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const canAccessWorkspaceManagement = (workspaceCount: number) =>
  getWorkspaceCount(workspaceCount) > 1;

export const getEnabledModuleIdsForPlan = (
  plan: PlanType,
  workspaceCount: number,
): string[] => {
  if (plan === "custom") {
    return [...ALL_LEAF_IDS];
  }

  const enabled = new Set<string>([...COMPANY_SETTINGS_IDS, ...BASIC_KEY_APP_IDS]);

  if (plan === "professional") {
    PROFESSIONAL_EXTRA_IDS.forEach((id) => enabled.add(id));
  }

  if (canAccessWorkspaceManagement(workspaceCount)) {
    enabled.add(WORKSPACE_MANAGEMENT_ID);
  }

  return [...enabled];
};
