import type { BasicPageTour } from "../basicPageTours";

export const techDashboardTour: BasicPageTour = {
  id: "tech-dashboard",
  version: 1,
  title: "Tech dashboard",
  description: "Review Tech's operational numbers, activity, and trends from one overview.",
  steps: [
    { selector: '[data-tour="sidebar"]', title: "Your workspace navigation", description: "Use the sidebar to move between the modules available to your role. Other page tours will focus only on their own functionality." },
    { selector: '[data-tour="breadcrumb"]', title: "Your current location", description: "The breadcrumb shows the active workspace section and page." },
    { selector: '[data-tour="workspace-switcher"]', title: "Switch workspaces", description: "If you belong to multiple workspaces, switch here. Your automatic guides are remembered across all of your units." },
    { selector: '[data-notification-trigger]', title: "Unit notifications", description: "Open notifications to review recent activity and updates requiring attention." },
    { selector: '[data-tour="tech-attendance"]', title: "Clock in and out", description: "Log your attendance for the day directly from the dashboard." },
    { selector: '[data-tour="tech-overview"]', title: "Website leads overview", description: "Live counts of your website leads, contacted leads, and closed leads. Select a card to open the complete Website Leads page." },
    { selector: '[data-tour="tech-team-status"]', title: "Team status and visitors", description: "Team Live Status shows who on the Tech team is currently working, and Tech Visitors summarizes recent visitor activity for your department." },
    { selector: '[data-tour="tech-quick-links"]', title: "Quick Links", description: "Direct shortcuts into Website Builder, Website Leads, and Website Review." },
    { selector: '[data-tour="tech-leads"]', title: "Lead activity", description: "Recent Website Leads tracks the latest enquiries and View all opens the complete Website Leads page. Lead Status summarizes pending, contacted, closed, and rejected leads." },
    { selector: '[data-tour="tech-leads-trend"]', title: "Monthly leads trend", description: "Track website lead volume across the last twelve months." },
  ],
};
