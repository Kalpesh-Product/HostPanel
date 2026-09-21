import type { BasicPageTour } from "../basicPageTours";

export const salesDashboardTour: BasicPageTour = {
  id: "sales-dashboard",
  version: 1,
  title: "Sales dashboard",
  description: "Review Sales' operational numbers, activity, and trends from one overview.",
  steps: [
    { selector: '[data-tour="sidebar"]', title: "Your workspace navigation", description: "Use the sidebar to move between the modules available to your role. Other page tours will focus only on their own functionality." },
    { selector: '[data-tour="breadcrumb"]', title: "Your current location", description: "The breadcrumb shows the active workspace section and page." },
    { selector: '[data-tour="workspace-switcher"]', title: "Switch workspaces", description: "If you belong to multiple workspaces, switch here. Your automatic guides are remembered across all of your units." },
    { selector: '[data-notification-trigger]', title: "Unit notifications", description: "Open notifications to review recent activity and updates requiring attention." },
    { selector: '[data-tour="sales-attendance"]', title: "Clock in and out", description: "Log your attendance for the day directly from the dashboard." },
    { selector: '[data-tour="sales-overview"]', title: "Sales overview", description: "Live counts for website leads, tenant companies, pricing packages, contacted leads, and today's visitors. Select a card to open its complete module." },
    { selector: '[data-tour="sales-team-activity"]', title: "Team status and new leads", description: "Team Live Status shows who on Sales is currently working, Sales Visitors summarizes today's foot traffic, and Recent Website Leads lists the newest enquiries awaiting follow-up." },
    { selector: '[data-tour="sales-quick-links"]', title: "Quick Links", description: "Jump straight into Leads Management, Tenant Companies, Resource & Pricing, or Sales Architecture." },
    { selector: '[data-tour="sales-uncontacted-leads"]', title: "Uncontacted leads", description: "Uncontacted Leads lists the newest enquiries still waiting for a first follow-up, and View all opens the complete Leads Management page. Lead Status summarizes new, contacted, closed, and rejected leads." },
    { selector: '[data-tour="sales-tenant-attention"]', title: "Tenants needing attention", description: "This list surfaces tenant companies that are not active — pending, expiring soon, or expired — so renewals don't get missed. View all opens Tenant Companies, and Tenant Status summarizes the full breakdown." },
    { selector: '[data-tour="sales-visitor-activity"]', title: "Visitor activity", description: "Recent Visitors shows the latest check-ins and View all opens Visitor Management. Visitor Type summarizes today's visitor mix." },
    { selector: '[data-tour="sales-lead-trend"]', title: "Monthly lead trend", description: "Track how many website leads have come in each month across the current financial year." },
  ],
};
