import type { ElementType } from "react";
import { Building2, CalendarCheck, ContactRound, History } from "lucide-react";
import { PERMISSIONS } from "../../constants/permissions";

// Same shape as NOMAD_DASHBOARD_MODULES in pages/Dashboard/FrontendDashboard —
// the Visitors workspace mirrors the sales "All Management" dashboard pattern
// so module cards stay consistent across departments.
export type VisitorDashboardModule = {
  id: string;
  label: string;
  icon: ElementType;
  route: string;
  description: string;
  color: string;
  permission: string;
};

export const VISITOR_DASHBOARD_MODULES: VisitorDashboardModule[] = [
  { id: "visitor-daily", label: "Daily Visitors", icon: ContactRound, route: "/visitors/visitor-management?tab=daily", description: "Manage today's arrivals, approvals, and check-ins", color: "#2563EB", permission: PERMISSIONS.VISITORS_TAB_DAILY.value },
  { id: "visitor-history", label: "Visitor History", icon: History, route: "/visitors/visitor-management?tab=history", description: "Review completed and past visitor records", color: "#1E3D73", permission: PERMISSIONS.VISITORS_TAB_HISTORY.value },
  { id: "visitor-bookings", label: "Bookings", icon: CalendarCheck, route: "/visitors/visitor-management?tab=bookings", description: "Track upcoming and completed visitor bookings", color: "#F59E0B", permission: PERMISSIONS.VISITORS_TAB_BOOKINGS.value },
  { id: "visitor-clients", label: "Clients", icon: Building2, route: "/visitors/visitor-management?tab=clients", description: "Manage client records and visit activity", color: "#7C3AED", permission: PERMISSIONS.VISITORS_TAB_CLIENTS.value },
];
