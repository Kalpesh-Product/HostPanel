import type { BasicPageTour } from "../basicPageTours";

export const administrationDashboardTour: BasicPageTour = {
  id: "administration-dashboard",
  version: 1,
  title: "Administration dashboard",
  description: "Review Administration's operational numbers, activity, and trends from one overview.",
  steps: [
    { selector: '[data-tour="sidebar"]', title: "Your workspace navigation", description: "Use the sidebar to move between the modules available to your role. Other page tours will focus only on their own functionality." },
    { selector: '[data-tour="breadcrumb"]', title: "Your current location", description: "The breadcrumb shows the active workspace section and page." },
    { selector: '[data-tour="workspace-switcher"]', title: "Switch workspaces", description: "If you belong to multiple workspaces, switch here. Your automatic guides are remembered across all of your units." },
    { selector: '[data-notification-trigger]', title: "Unit notifications", description: "Open notifications to review recent activity and updates requiring attention." },
    { selector: '[data-tour="administration-attendance"]', title: "Clock in and out", description: "Log your attendance for the day directly from the dashboard." },
    { selector: '[data-tour="administration-overview"]', title: "Operational overview", description: "Live, actionable numbers for Administration's core areas — today's visitors, total tenants, meeting room bookings, resources, and pending housekeeping tasks. Select a card to open its complete module." },
    { selector: '[data-tour="administration-team-status"]', title: "Team live status", description: "See who on the Administration team is currently clocked in and working right now." },
    { selector: '[data-tour="administration-department-visitors"]', title: "Visitor requests needing action", description: "Review pending, approved, and checked-in visitor requests routed to Administration so you can act on them quickly." },
    { selector: '[data-tour="administration-housekeeping-queue"]', title: "Housekeeping queue", description: "The latest housekeeping tasks in priority order, from pending through in progress. Select View all to open the complete Housekeeping module." },
    { selector: '[data-tour="administration-visitors"]', title: "Visitor activity", description: "Recent Visitors lists the latest check-ins and View all opens Visitor Management. Visitor Type summarizes today's visitor mix." },
    { selector: '[data-tour="administration-quick-links"]', title: "Quick Links", description: "Direct shortcuts into Tenant Companies, Bookings, Resource Management, Housekeeping, and Visitor Management." },
    { selector: '[data-tour="administration-tenants"]', title: "Tenant activity", description: "Recent Tenants shows the latest companies and View all opens Tenant Companies. Tenant Status summarizes active, pending, and expiring agreements." },
    { selector: '[data-tour="administration-resources"]', title: "Resource activity", description: "Resource Directory lists the latest desks, rooms, and assets, and View all opens Resource Management. Booking Status summarizes confirmed, pending, and cancelled meeting room bookings." },
    { selector: '[data-tour="administration-booking-trend"]', title: "Monthly booking trend", description: "Compare meeting-room booking volume across the current financial year." },
  ],
};
