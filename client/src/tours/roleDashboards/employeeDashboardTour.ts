import type { BasicPageTour } from "../basicPageTours";

export const employeeDashboardTour: BasicPageTour = {
  id: "employee-dashboard",
  version: 1,
  title: "My dashboard",
  description: "Review your personal work queue — tasks, tickets, leave, and assets — from one overview.",
  steps: [
    { selector: '[data-tour="sidebar"]', title: "Your workspace navigation", description: "Use the sidebar to move between the modules available to you. Other page tours will focus only on their own functionality." },
    { selector: '[data-tour="breadcrumb"]', title: "Your current location", description: "The breadcrumb shows the active workspace section and page." },
    { selector: '[data-tour="workspace-switcher"]', title: "Switch workspaces", description: "If you belong to multiple workspaces, switch here. Your automatic guides are remembered across all of your units." },
    { selector: '[data-notification-trigger]', title: "Workspace notifications", description: "Open notifications to review recent activity and updates requiring attention." },
    { selector: '[data-tour="employee-greeting"]', title: "Your dashboard", description: "Confirms your current workspace plan alongside a personal greeting." },
    { selector: '[data-tour="employee-attendance"]', title: "Clock in and out", description: "Log your attendance for the day directly from the dashboard." },
    { selector: '[data-tour="employee-overview"]', title: "Today at a glance", description: "Your tasks, tickets, leave requests, assigned assets, bookings, and upcoming calendar events, all in one row. Select a card to open its matching page." },
    { selector: '[data-tour="employee-quick-links"]', title: "Quick Links", description: "Shortcuts to the common modules you use most — tasks, tickets, leave requests, meeting rooms, calendar, customer support, and your assigned assets." },
    { selector: '[data-tour="employee-my-tasks"]', title: "My Tasks", description: "The work currently assigned to you, ordered by due date. View all opens the complete Tasks page." },
    { selector: '[data-tour="employee-my-tickets"]', title: "My Tickets", description: "Support tickets assigned to you, most recent first. View all opens the complete Tickets page." },
  ],
};
