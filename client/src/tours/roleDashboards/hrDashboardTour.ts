import type { BasicPageTour } from "../basicPageTours";

export const hrDashboardTour: BasicPageTour = {
  id: "hr-dashboard",
  version: 1,
  title: "HR dashboard",
  description: "Review HR's operational numbers, activity, and trends from one overview.",
  steps: [
    { selector: '[data-tour="sidebar"]', title: "Your workspace navigation", description: "Use the sidebar to move between the modules available to your role. Other page tours will focus only on their own functionality." },
    { selector: '[data-tour="breadcrumb"]', title: "Your current location", description: "The breadcrumb shows the active workspace section and page." },
    { selector: '[data-tour="workspace-switcher"]', title: "Switch workspaces", description: "If you belong to multiple workspaces, switch here. Your automatic guides are remembered across all of your units." },
    { selector: '[data-notification-trigger]', title: "Unit notifications", description: "Open notifications to review recent activity and updates requiring attention." },
    { selector: '[data-tour="hr-greeting"]', title: "Your dashboard", description: "Confirms your current workspace plan alongside a personal greeting." },
    { selector: '[data-tour="hr-attendance"]', title: "Clock in and out", description: "Log your attendance for the day directly from the dashboard." },
    { selector: '[data-tour="hr-overview"]', title: "HR overview", description: "Your team headcount, pending leaves, correction requests, open positions, payroll, this month's birthdays, and resignation activity, all in one row. Select a card to open its matching page." },
    { selector: '[data-tour="hr-team-status"]', title: "Team status, visitors, and corrections", description: "Team Live Status shows who is currently working, HR Visitors summarizes today's foot traffic, and Correction Requests lists today's attendance corrections awaiting your review." },
    { selector: '[data-tour="hr-quick-links"]', title: "Quick Links", description: "Shortcuts to the HR modules you use most — company management, attendance review, leave requests, recruitment, payroll, documents, and resignation management." },
    { selector: '[data-tour="hr-leave-requests"]', title: "Leave request activity", description: "Recent Leave Requests tracks the latest time-off submissions and View all opens the complete Leave Requests page. Leave Status summarizes approved, pending, and rejected requests." },
    { selector: '[data-tour="hr-recent-attendance"]', title: "Attendance activity", description: "Recent Attendance shows the latest punches across your team and View all opens Attendance Review. Attendance Status summarizes today's present, late, on-leave, and absent counts." },
    { selector: '[data-tour="hr-candidates"]', title: "Recruitment activity", description: "Recent Candidates lists the latest applicants and View all opens the complete Recruitment page. Recruitment Funnel summarizes where candidates stand from applied through selected." },
    { selector: '[data-tour="hr-birthdays-resignations"]', title: "Birthdays and resignations", description: "This month's birthdays and the latest resignation requests, each with a direct link to the full record." },
    { selector: '[data-tour="hr-monthly-trends"]', title: "Monthly HR trends", description: "Compare hires, leaves taken, and attendance percentage across the current financial year." },
  ],
};
