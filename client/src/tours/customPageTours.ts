import { getProfessionalPageTour } from "./professionalPageTours";
import type { BasicPageTour, BasicPageTourStep } from "./basicPageTours";

interface CustomTourRoute extends BasicPageTour {
  matches: (pathname: string) => boolean;
}

const CUSTOM_TOUR_VERSION = 1;

const exact = (path: string) => (pathname: string) =>
  pathname === path || pathname === `${path}/`;

// Routes rendered by a plan-specific component whose Professional tour
// selectors won't resolve for Custom (e.g. /dashboard renders CustomDashboard,
// which has no data-tour attributes yet) — excluded instead of falling back
// to a near-empty tour. Author a dedicated entry in CUSTOM_PAGE_TOURS once
// that page grows its own data-tour hooks.
const PLAN_SPECIFIC_ROUTES = new Set(["/dashboard"]);

// Overrides for Professional tours whose copy states a Professional-only
// fact (a numeric limit, a restricted department set, a filter that's absent
// on Professional but present on Custom) that a plain word swap would get
// wrong. Everything not listed here reuses the matching Professional tour
// via customCopy() below.
const CUSTOM_PAGE_TOURS: CustomTourRoute[] = [
  {
    id: "custom-organization",
    version: CUSTOM_TOUR_VERSION,
    title: "Organization management",
    description: "Manage Custom-plan platform users and your workspace's full department structure.",
    steps: [
      { selector: '[data-tour="organization-users-tab"]', title: "Platform users", description: "Review workspace members, invitations, roles, account state, and member actions. The Custom plan has no fixed user cap — access is controlled by role permissions." },
      { text: "DEPARTMENTS", exactText: true, title: "Departments", description: "Open the department view to manage your workspace's departments and their manager assignments when your role permits it." },
      { selector: '[data-tour="organization-add-user"]', title: "Add a platform user", description: "Open the member form, choose an available role and department access, then send the invitation." },
      { selector: '[data-tour="organization-status-filters"]', title: "Filter onboarding status", description: "Separate invited, registered, pending, joined, or disabled members so you can follow onboarding and account access." },
      { selector: '[data-tour="organization-search"]', title: "Search and narrow members", description: "Search the platform-user list and use the nearby department or role filter to focus the results." },
      { selector: '[data-tour="organization-members-table"]', title: "Member records and access", description: "Review identity, role, departments, status, and access. Authorized users can toggle account access and open View Details for the complete member record." },
    ],
    matches: exact("/company-settings/organization-management"),
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
    matches: exact("/calendar"),
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

  if (PLAN_SPECIFIC_ROUTES.has(normalizedPath)) return null;

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
