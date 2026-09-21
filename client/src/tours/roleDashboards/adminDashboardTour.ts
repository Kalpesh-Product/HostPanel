import type { BasicPageTour } from "../basicPageTours";

export const adminDashboardTour: BasicPageTour = {
  id: "admin-dashboard",
  version: 1,
  title: "Admin dashboard",
  description: "Review your assigned departments' operational numbers and everything else granted to you from one overview.",
  steps: [
    { selector: '[data-tour="sidebar"]', title: "Your workspace navigation", description: "Use the sidebar to move between the modules available to your role. Other page tours will focus only on their own functionality." },
    { selector: '[data-tour="breadcrumb"]', title: "Your current location", description: "The breadcrumb shows the active workspace section and page." },
    { selector: '[data-tour="workspace-switcher"]', title: "Switch workspaces", description: "If you belong to multiple workspaces, switch here. Your automatic guides are remembered across all of your units." },
    { selector: '[data-notification-trigger]', title: "Unit notifications", description: "Open notifications to review recent activity and updates requiring attention." },
    { selector: '[data-tour="admin-greeting"]', title: "Your admin dashboard", description: "Confirms your current workspace plan alongside a personal greeting." },
    { selector: '[data-tour="admin-attendance"]', title: "Clock in and out", description: "Log your attendance for the day directly from the dashboard." },
    { selector: '[data-tour="admin-department-dashboards"]', title: "Your department dashboards", description: "Each department you're assigned to gets its own full breakdown here — stat cards, status charts, and monthly trends, exactly like that department's dedicated dashboard." },
    { selector: '[data-tour="admin-other-modules"]', title: "Everything else granted to you", description: "Cards, charts, and quick links for any other module or custom department granted to you that isn't one of the named departments above." },
  ],
};
