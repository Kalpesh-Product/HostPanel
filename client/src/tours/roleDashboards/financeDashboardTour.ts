import type { BasicPageTour } from "../basicPageTours";

export const financeDashboardTour: BasicPageTour = {
  id: "finance-dashboard",
  version: 1,
  title: "Finance dashboard",
  description: "Review Finance's operational numbers, activity, and trends from one overview.",
  steps: [
    { selector: '[data-tour="sidebar"]', title: "Your workspace navigation", description: "Use the sidebar to move between the modules available to your role. Other page tours will focus only on their own functionality." },
    { selector: '[data-tour="breadcrumb"]', title: "Your current location", description: "The breadcrumb shows the active workspace section and page." },
    { selector: '[data-tour="workspace-switcher"]', title: "Switch workspaces", description: "If you belong to multiple workspaces, switch here. Your automatic guides are remembered across all of your units." },
    { selector: '[data-notification-trigger]', title: "Unit notifications", description: "Open notifications to review recent activity and updates requiring attention." },
    { selector: '[data-tour="finance-attendance"]', title: "Clock in and out", description: "Log your attendance for the day directly from the dashboard." },
    { selector: '[data-tour="finance-overview"]', title: "Finance overview", description: "Net payable for the current payroll cycle, how many employees have been paid, and security deposit status — all live and actionable. Select a card to open Billing & Payments." },
    { selector: '[data-tour="finance-team-status"]', title: "Team status, visitors, and pending deposits", description: "Team Live Status shows who in Finance is currently working, Finance Visitors summarizes today's foot traffic, and Pending Security Deposits lists tenants still owing a deposit." },
    { selector: '[data-tour="finance-quick-links"]', title: "Quick Links", description: "Jump straight into Expenses & Budget, Billing & Payments, or Accounting." },
    { selector: '[data-tour="finance-deposits"]', title: "Security deposit activity", description: "Recent security deposit records and View all opens Billing & Payments. Security Deposit Status summarizes paid versus pending deposits." },
    { selector: '[data-tour="finance-payroll"]', title: "Payroll activity", description: "Top Payroll Earners lists the highest net salaries this cycle and View all opens Billing & Payments. Payroll Status summarizes paid versus pending employees." },
  ],
};
