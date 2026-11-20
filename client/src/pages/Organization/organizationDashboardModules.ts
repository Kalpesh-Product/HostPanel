import type { ElementType } from "react";
import { Building2, Users } from "lucide-react";

export type OrganizationDashboardModule = {
  id: "organization-users" | "organization-departments";
  label: string;
  icon: ElementType;
  route: string;
  description: string;
  color: string;
  permission: "org_tab_users" | "org_tab_departments";
};

export const ORGANIZATION_DASHBOARD_MODULES: OrganizationDashboardModule[] = [
  {
    id: "organization-users",
    label: "Platform Users",
    icon: Users,
    route: "/core-modules/organization-management/list?tab=users",
    description: "Manage workspace users, roles, invitations, and account access",
    color: "#2563EB",
    permission: "org_tab_users",
  },
  {
    id: "organization-departments",
    label: "Departments",
    icon: Building2,
    route: "/core-modules/organization-management/list?tab=departments",
    description: "Manage departments, managers, members, and module assignments",
    color: "#7C3AED",
    permission: "org_tab_departments",
  },
];
