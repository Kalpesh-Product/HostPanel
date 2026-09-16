import type { BasicPageTour } from "../basicPageTours";

export const itDashboardTour: BasicPageTour = {
  id: "it-dashboard",
  version: 1,
  title: "IT dashboard",
  description: "Review IT's operational numbers, activity, and trends from one overview.",
  steps: [
    { selector: '[data-tour="sidebar"]', title: "Your workspace navigation", description: "Use the sidebar to move between the modules available to your role. Other page tours will focus only on their own functionality." },
    { selector: '[data-tour="breadcrumb"]', title: "Your current location", description: "The breadcrumb shows the active workspace section and page." },
    { selector: '[data-tour="workspace-switcher"]', title: "Switch workspaces", description: "If you belong to multiple workspaces, switch here. Your automatic guides are remembered across all of your units." },
    { selector: '[data-notification-trigger]', title: "Workspace notifications", description: "Open notifications to review recent activity and updates requiring attention." },
    { selector: '[data-tour="it-overview"]', title: "Repair log overview", description: "Resolution rate, open logs, in-progress logs, and total logs at a glance. Select any card to open the complete Repair Logs module." },
    { selector: '[data-tour="it-team-status"]', title: "Team status", description: "See who on the IT team is currently checked in and working." },
    { selector: '[data-tour="it-visitors"]', title: "Visitor requests", description: "Review visitors waiting on an IT host to accept or reject their visit." },
    { selector: '[data-tour="it-recent-repair-logs"]', title: "Recent repair logs", description: "The latest repair logs raised across the workspace. Select View all to open the complete Repair Logs module." },
    { selector: '[data-tour="it-quick-links"]', title: "Quick Links", description: "Jump straight into IT Repair Logs to log and track repairs, or System Access to manage software access." },
    { selector: '[data-tour="it-resolved-logs"]', title: "Resolved log activity", description: "Recently Resolved Logs lists the latest repairs that were closed out, and Repair Log Status summarizes how logs are distributed across Open, In Progress, Resolved, and Closed." },
    { selector: '[data-tour="it-monthly-trend"]', title: "Monthly repair log trend", description: "Compare how many repair logs were raised versus resolved each month." },
  ],
};
