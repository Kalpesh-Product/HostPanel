import { getProfessionalPageTour } from "./professionalPageTours";
import type { BasicPageTour, BasicPageTourStep } from "./basicPageTours";

interface CustomTourRoute extends BasicPageTour {
  matches: (pathname: string) => boolean;
}

const CUSTOM_TOUR_VERSION = 1;

const exact = (path: string) => (pathname: string) =>
  pathname === path || pathname === `${path}/`;

// Overrides for Professional tours whose copy states a Professional-only
// fact (a numeric limit, a restricted department set, a filter that's absent
// on Professional but present on Custom) that a plain word swap would get
// wrong. Everything not listed here reuses the matching Professional tour
// via customCopy() below.
const CUSTOM_PAGE_TOURS: CustomTourRoute[] = [
  {
    id: "custom-organization",
    version: 3,
    title: "Organization management",
    description: "Manage Custom-plan platform users and your workspace's full department structure.",
    replayHint: true,
    steps: [
      { selector: '[data-tour="organization-users-tab"]', title: "Platform users", description: "Review workspace members, invitations, roles, account state, and member actions. The Custom plan has no fixed user cap — access is controlled by role permissions." },
      { selector: '[data-tour="organization-departments-tab"]', title: "Departments", description: "Open the department view to manage your workspace's departments, their manager assignments, and their module access when your role permits it." },
      { selector: '[data-tour="organization-create-department"]', title: "Create a department", description: "Select Create Department to define a new workspace department — set its name, describe its responsibility, and pick the core modules its manager will receive alongside the common modules. This control appears while the Departments tab is open." },
      { selector: '[data-tour="organization-status-filters"]', title: "Filter onboarding status", description: "Separate invited, registered, pending, joined, or disabled members so you can follow onboarding and account access." },
      { selector: '[data-tour="organization-search"]', title: "Search platform users", description: "Find a member by name, email address, or other details shown in the list." },
      { selector: '[data-tour="organization-department-filter"]', title: "Filter by department or role", description: "Narrow the member list to a single department or to one workspace role such as Super Admin, Admin, Manager, or Employee." },
      { selector: '[data-tour="organization-add-user"]', title: "Add a platform user", description: "Open the member form, choose an available role and department access, then send the invitation." },
      { selector: '[data-tour="organization-members-table"]', title: "Member records and access", description: "Review identity, role, departments, status, and access. Authorized users can toggle account access and open View Details for the complete member record.", side: "top" },
    ],
    matches: exact("/core-modules/organization-management"),
  },
  {
    id: "custom-calendar",
    version: CUSTOM_TOUR_VERSION,
    title: "Calendar",
    description: "Use the Custom calendar as a unified view of bookings, tickets, tasks, leave, and holidays.",
    steps: [
      { text: "Bookings", exactText: true, title: "Calendar summary", description: "The summary cards show the number of booking, ticket, task, leave, and holiday events currently available." },
      { text: "Today", exactText: true, title: "Move between months", description: "Use the previous and next controls to change months. Today returns immediately to the current date." },
      { selector: 'input[placeholder="Search events..."]', title: "Search events", description: "Filter visible calendar events by their title or related details." },
      { text: "Tickets", exactText: true, title: "Filter event types", description: "Show all events or focus on Bookings, Tickets, Tasks, Leave, or Holidays." },
      { selector: '[data-tour="page-content"] .grid-cols-7', title: "Monthly calendar", description: "Select a date to review its events, or select an event badge to open its complete date, module, priority, and status details." },
    ],
    matches: exact("/common-modules/calendar"),
  },
  {
    id: "custom-tasks",
    version: CUSTOM_TOUR_VERSION,
    title: "Tasks",
    description: "Delegate work across your workspace's full department structure and follow every task from assignment through acceptance, execution, completion, and approval.",
    steps: [
      { selector: '[data-tour="tasks-page-tabs"]', title: "Task queues", description: "My Tasks opens first with everything assigned to you personally. Department Tasks collects work routed to the departments you manage or belong to, and leadership roles also see the tasks they raised for others. Employees see the My Tasks queue only." },
      { selector: '[data-tour="tasks-page-summary"]', title: "Counts at a glance", description: "The cards total every task in the active queue and break them down by Pending, In Progress, and Resolved / Done so the state of the workload is readable instantly." },
      { selector: '[data-tour="tasks-page-status-filter"]', title: "Filter by status", description: "Focus the queue on All, Pending, In Progress, Completed, or Approved tasks without leaving the tab." },
      { selector: '[data-tour="tasks-page-search"]', title: "Search tasks", description: "Find tasks by their title or by the people involved — results narrow as you type." },
      { selector: '[data-tour="tasks-page-department-filter"]', title: "Filter by department", description: "Narrow the queue to one department. On the Custom plan every department you have created is available here." },
      { selector: '[data-tour="tasks-page-assign-btn"]', title: "Assign a new task", description: "Opens the Delegate Task form. Choose Standard Execution for direct work or Formal Approval Request when sign-off is needed first, write the title and detailed instructions, route it to a department, optionally pick a specific assignee, set the deadline, and attach reference files." },
      { selector: '[data-tour="tasks-page-table"]', title: "Task list and full workflow", description: "Each row shows type and department, who raised and who received it, priority with live progress, due date, and an overdue warning. Open any task to read instructions, accept it, update progress as work advances, complete it with a note and attachments, comment for clarification, and approve or reject formal approval requests.", side: "top" },
    ],
    matches: exact("/common-modules/tasks"),
  },
  {
    id: "custom-dashboard",
    version: CUSTOM_TOUR_VERSION,
    title: "Custom dashboard",
    description: "Review every module enabled for your Custom-plan workspace, its live operational numbers, direct shortcuts, and trends from one overview.",
    steps: [
      { selector: '[data-tour="sidebar"]', title: "Your workspace navigation", description: "Use the sidebar to move between the modules available to your Custom-plan role. Other page tours will focus only on their own functionality." },
      { selector: '[data-tour="breadcrumb"]', title: "Your current location", description: "The breadcrumb shows the active workspace section and page." },
      { selector: '[data-tour="workspace-switcher"]', title: "Switch workspaces", description: "If you belong to multiple workspaces, switch here. Your automatic guides are remembered across all of your units." },
      { selector: '[data-notification-trigger]', title: "Unit notifications", description: "Open notifications to review recent activity and updates requiring attention." },
      { selector: '[data-tour="custom-attendance"]', title: "Clock in and out", description: "Log your attendance for the day directly from the dashboard." },
      { selector: '[data-tour="custom-overview"]', title: "Founder overview", description: "Live, actionable numbers for the core modules your workspace uses most — tenants, bookings, tickets, visitors, leads, and leave requests. Select a card to open its complete module." },
      { selector: '[data-tour="custom-department-modules"]', title: "Department modules", description: "Every other enabled module — resources, housekeeping, maintenance, IT, HR, recruitment, and more — surfaces here as its own overview card and doubles as your entry point into that department's page." },
      { selector: '[data-tour="custom-finance-snapshot"]', title: "Financial snapshot", description: "Booking revenue, security deposits, and payroll or booking status in one row, linking straight into Billing & Payments." },
      { selector: '[data-tour="custom-team-status"]', title: "Team status and visitors", description: "Team Live Status shows who is currently working, and Recent Visitors with Visitor Type summarizes today's foot traffic." },
      { selector: '[data-tour="custom-quick-links"]', title: "Quick Links", description: "Direct shortcuts into every module enabled for your workspace, built automatically from your actual module access." },
      { selector: '[data-tour="custom-profile"]', title: "Profile", description: "Jump to your personal profile, company profile, or password settings." },
      { selector: '[data-tour="custom-status-charts"]', title: "Status breakdown", description: "Tenant, booking, and ticket status charts show how work is distributed across each stage." },
      { selector: '[data-tour="custom-bookings-tickets"]', title: "Bookings and tickets activity", description: "Recent Bookings and Recent Tickets list the latest activity, and View all opens the complete module for each." },
      { selector: '[data-tour="custom-leads"]', title: "Lead activity", description: "Recent Leads tracks the latest website enquiries and View all opens the complete Website Leads page. Lead Status summarizes new versus contacted leads." },
      { selector: '[data-tour="custom-leave-requests"]', title: "Leave request activity", description: "Recent Leave Requests tracks pending time-off and View all opens the complete Leave Requests page. Leave Status summarizes pending, approved, and rejected requests." },
      { selector: '[data-tour="custom-tenants"]', title: "Tenant activity", description: "Recent Tenants lists the latest companies, and an expiry alert appears here when any agreement is nearing its end so it can be reviewed and renewed in time." },
      { selector: '[data-tour="custom-booking-trend"]', title: "Monthly booking trend", description: "Compare meeting-room booking volume across the current financial year." },
      { selector: '[data-tour="custom-ticket-trend"]', title: "Monthly ticket trend", description: "Review how customer-support ticket volume changes month by month." },
      { selector: '[data-tour="custom-tenant-trend"]', title: "Monthly tenant trend", description: "Track tenant-company activity across the financial year." },
    ],
    matches: exact("/dashboard"),
  },
];

const customCopy = (value: string) =>
  value
    .replace(/Professional-plan/g, "Custom-plan")
    .replace(/Professional plan/g, "Custom plan")
    .replace(/Professional/g, "Custom");

const cloneStep = (step: BasicPageTourStep): BasicPageTourStep => ({
  ...step,
  title: customCopy(step.title),
  description: customCopy(step.description),
});

export const getCustomPageTour = (pathname: string): BasicPageTour | null => {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  const customTour = CUSTOM_PAGE_TOURS.find((tour) => tour.matches(normalizedPath));
  if (customTour) {
    const { matches: _matches, ...tour } = customTour;
    return tour;
  }

  const professionalTour = getProfessionalPageTour(normalizedPath);
  if (!professionalTour) return null;

  return {
    ...professionalTour,
    id: professionalTour.id.replace(/^professional-/, "custom-"),
    title: customCopy(professionalTour.title),
    description: customCopy(professionalTour.description),
    formDescription: professionalTour.formDescription
      ? customCopy(professionalTour.formDescription)
      : undefined,
    recordsDescription: professionalTour.recordsDescription
      ? customCopy(professionalTour.recordsDescription)
      : undefined,
    steps: professionalTour.steps?.map(cloneStep),
  };
};
