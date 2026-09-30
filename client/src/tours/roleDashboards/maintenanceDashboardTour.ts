import type { BasicPageTour } from "../basicPageTours";

export const maintenanceDashboardTour: BasicPageTour = {
  id: "maintenance-dashboard",
  version: 1,
  title: "Maintenance dashboard",
  description: "Review Maintenance's operational numbers, activity, and trends from one overview.",
  steps: [
    { selector: '[data-tour="sidebar"]', title: "Your workspace navigation", description: "Use the sidebar to move between the modules available to your role. Other page tours will focus only on their own functionality." },
    { selector: '[data-tour="breadcrumb"]', title: "Your current location", description: "The breadcrumb shows the active workspace section and page." },
    { selector: '[data-tour="workspace-switcher"]', title: "Switch workspaces", description: "If you belong to multiple workspaces, switch here. Your automatic guides are remembered across all of your units." },
    { selector: '[data-notification-trigger]', title: "Unit notifications", description: "Open notifications to review recent activity and updates requiring attention." },
    { selector: '[data-tour="maintenance-attendance"]', title: "Clock in and out", description: "Track your working day right from the dashboard — clock in, take breaks, and clock out without leaving this page." },
    { selector: '[data-tour="maintenance-overview"]', title: "Operational overview", description: "Asset uptime, open repair logs, overdue AMC schedules, and schedules due soon — the numbers that need your attention first. Select a card to open its module." },
    { selector: '[data-tour="maintenance-team-status"]', title: "Team live status", description: "See who on the Maintenance team is currently working, on break, or off for the day." },
    { selector: '[data-tour="maintenance-department-visitors"]', title: "Department visitors", description: "Review visitors waiting on a Maintenance host to accept or reject their visit." },
    { selector: '[data-tour="maintenance-recent-repair-logs"]', title: "Recent repair logs", description: "The latest repairs logged across every asset. Select View all to open the full Repair Logs module." },
    { selector: '[data-tour="maintenance-quick-links"]', title: "Quick Links", description: "Jump straight into Repair Logs to log and track repairs, or the AMC Scheduler to manage preventive servicing and alerts." },
    { selector: '[data-tour="maintenance-active-repair-logs"]', title: "Active repair logs", description: "Repairs that are still open or in progress, alongside a breakdown of how healthy your AMC schedules are overall." },
    { selector: '[data-tour="maintenance-resolved-repair-logs"]', title: "Resolved & closed logs", description: "Repairs that have been completed or closed, with a status breakdown of every repair log across the workspace." },
    { selector: '[data-tour="maintenance-repair-log-trend"]', title: "Monthly repair log trend", description: "Track how many repair logs have been raised each month over the past year." },
  ],
};
