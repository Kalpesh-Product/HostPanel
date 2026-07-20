import { getBasicPageTour } from "./basicPageTours";
import type { BasicPageTour, BasicPageTourStep } from "./basicPageTours";

interface ProfessionalTourRoute extends BasicPageTour {
  matches: (pathname: string) => boolean;
}

const PROFESSIONAL_TOUR_VERSION = 2;
const PROFESSIONAL_UNIT_TOUR_VERSION = 3;
const exact = (path: string) => (pathname: string) =>
  pathname === path || pathname === `${path}/`;
const startsWith = (path: string) => (pathname: string) =>
  pathname === path || pathname.startsWith(`${path}/`);

const PROFESSIONAL_PAGE_TOURS: ProfessionalTourRoute[] = [
  {
    id: "professional-organization",
    version: PROFESSIONAL_TOUR_VERSION,
    title: "Organization management",
    description: "Manage Professional-plan platform users and the Sales and Technology department structure.",
    steps: [
      { selector: '[data-tour="organization-users-tab"]', title: "Platform users", description: "Review workspace members, invitations, roles, account state, and member actions. Professional supports up to five workspace users." },
      { text: "DEPARTMENTS", exactText: true, title: "Departments", description: "Open the department view to manage the Sales and Technology departments and their manager assignments when your role permits it." },
      { selector: '[data-tour="organization-add-user"]', title: "Add a platform user", description: "Open the member form, choose an available Professional role and department access, then send the invitation. The button is disabled when the five-user plan limit is reached." },
      { selector: '[data-tour="organization-status-filters"]', title: "Filter onboarding status", description: "Separate invited, registered, pending, joined, or disabled members so you can follow onboarding and account access." },
      { selector: '[data-tour="organization-search"]', title: "Search and narrow members", description: "Search the platform-user list and use the nearby department or role filter to focus the results." },
      { selector: '[data-tour="organization-members-table"]', title: "Member records and access", description: "Review identity, role, departments, status, and access. Authorized users can toggle account access and open View Details for the complete member record." },
    ],
    matches: exact("/company-settings/organization-management"),
  },
  {
    id: "professional-access-grants",
    version: PROFESSIONAL_TOUR_VERSION,
    title: "Access grants",
    description: "Review member roles and control access to the Professional modules available in this workspace.",
    steps: [
      { selector: '[data-tour="access-grants-summary"]', title: "Role overview", description: "See the number of members assigned to each workspace role before reviewing individual permissions." },
      { selector: '[data-tour="access-grants-status-filters"]', title: "Filter by access state", description: "Switch between all, active, and disabled workspace members." },
      { selector: '[data-tour="access-grants-search"]', title: "Search access records", description: "Find a member by name, email address, or department." },
      { selector: '[data-tour="access-grants-role-filter"]', title: "Filter by role", description: "Focus the list on a specific workspace role such as Super Admin, Admin, Manager, or Employee." },
      { selector: '[data-tour="access-grants-table"]', title: "Review each member", description: "The table shows role, department scope, account status, and the actions permitted for each member." },
      { selector: '[data-tour="access-grants-actions"]', title: "Manage modules and roles", description: "The shield action opens Sidebar Access for Professional modules. The user-and-cog action opens role details and authorized role changes. Ownership transfer appears separately only when an eligible member exists." },
    ],
    matches: exact("/company-settings/access-grants"),
  },
  {
    id: "professional-dashboard",
    version: PROFESSIONAL_TOUR_VERSION,
    title: "Professional dashboard",
    description: "Review the Professional-plan modules, current operational activity, direct shortcuts, and trends from one workspace overview.",
    steps: [
      { selector: '[data-tour="sidebar"]', title: "Your workspace navigation", description: "Use the sidebar to move between the modules available to your Professional-plan role. Other page tours will focus only on their own functionality." },
      { selector: '[data-tour="breadcrumb"]', title: "Your current location", description: "The breadcrumb shows the active workspace section and page." },
      { selector: '[data-tour="workspace-switcher"]', title: "Switch workspaces", description: "If you belong to multiple workspaces, switch here. Guide progress is remembered separately for each member and workspace." },
      { selector: '[data-notification-trigger]', title: "Workspace notifications", description: "Open notifications to review recent activity and updates requiring attention." },
      { selector: '[data-tour="professional-plan"]', title: "Your Professional plan", description: "This banner confirms the current plan. Selecting it opens Custom-plan options for additional modules such as Finance, HR, AI tools, Maintenance, and IT." },
      { selector: '[data-tour="professional-overview"]', title: "Operational overview", description: "These live cards summarize tenants, bookings, customer-support tickets, and visitors. Selecting a card opens its complete module." },
      { selector: '[data-tour="professional-quick-links"]', title: "Quick Links", description: "Open Nomad Listings, Website Builder, Tenant Companies, Meeting Rooms, Customer Support, Visitor Management, Organization, or Calendar directly." },
      { selector: '[data-tour="professional-visitors"]', title: "Visitor activity", description: "Recent Visitors shows the latest activity and View all opens Visitor Management. Visitor Type summarizes the visitor mix." },
      { selector: '[data-tour="professional-bookings"]', title: "Meeting-room activity", description: "Recent Bookings shows the latest room reservations and View all opens Meeting Rooms. Booking Status summarizes the current workflow states." },
      { selector: '[data-tour="professional-tickets"]', title: "Customer-support activity", description: "Recent Tickets shows the latest support issues and View all opens Customer Support. Ticket Status summarizes open and resolved work." },
      { selector: '[data-tour="professional-tenants"]', title: "Tenant activity", description: "Recent Tenants shows the latest companies and View all opens Tenant Companies. Tenant Status summarizes active and inactive records." },
      { selector: '[data-tour="professional-expiry-alert"]', title: "Agreement expiry alert", description: "When agreements are nearing expiry, this alert opens Tenant Companies so they can be reviewed and renewed before they lapse." },
      { selector: '[data-tour="professional-booking-trend"]', title: "Monthly booking trend", description: "Compare meeting-room booking volume across the current financial year." },
      { selector: '[data-tour="professional-ticket-trend"]', title: "Monthly ticket trend", description: "Review how customer-support ticket volume changes month by month." },
      { selector: '[data-tour="professional-tenant-trend"]', title: "Monthly tenant trend", description: "Track tenant-company activity across the financial year." },
    ],
    matches: exact("/dashboard"),
  },
  {
    id: "professional-tickets",
    version: PROFESSIONAL_TOUR_VERSION,
    title: "Tickets",
    description: "Raise, route, accept, track, and resolve workspace tickets. Tickets let anyone in the workspace report issues, request help, or flag problems — and the right team handles them.",
    recordsDescription: "The ticket list shows each issue with its priority, status, routing, and the actions you can take based on your role.",
    steps: [
      { selector: '[data-tour="tickets-tabs"]', title: "Scope tabs", description: "These tabs control which tickets you see. Your role determines which tabs are available — Company, Department, Assigned Dept, Tenant Company, My Assigned, and My Raised. Only the tabs relevant to your role will appear." },
      { selector: '[data-tour="tickets-tab-company"]', title: "Company tab", description: "Shows all tickets across the entire workspace. Only visible to Founders and Super Admins. Use this for a complete overview of every raised issue regardless of department." },
      { selector: '[data-tour="tickets-tab-department"]', title: "Department tab", description: "Shows tickets routed to your department. Managers see their own department's queue; Employees see department tasks they can accept. This is where unassigned department tickets land." },
      { selector: '[data-tour="tickets-tab-assigned-dept"]', title: "Assigned Dept tab", description: "Shows tickets routed to departments you manage. Only visible to Admins. Use this to monitor department queues and delegate or reassign tickets across teams." },
      { selector: '[data-tour="tickets-tab-tenant-company"]', title: "Tenant Company tab", description: "Shows tickets raised by tenant company employees. These come from external tenants who share your workspace and need support." },
      { selector: '[data-tour="tickets-tab-my-assigned"]', title: "My Assigned tab", description: "Shows tickets that are assigned to you or accepted by you. This is your personal work queue — focus here to see what you need to work on next." },
      { selector: '[data-tour="tickets-tab-my-raised"]', title: "My Raised tab", description: "Shows tickets you personally created. Use this to track the status of issues you reported and see if they have been accepted or resolved." },
      { selector: '[data-tour="tickets-summary"]', title: "Ticket counts at a glance", description: "These four cards show Total Tickets, Open (raised and waiting), In Progress (someone is working on it), and Resolved. The numbers update as you switch tabs." },
      { selector: '[data-tour="tickets-status-filter"]', title: "Filter by status", description: "Narrow the list to specific statuses. 'Raised' shows new unattended tickets, 'In Progress' shows tickets someone is handling, 'Resolved' shows completed work, and 'Closed' shows archived tickets." },
      { selector: '[data-tour="tickets-search-filter"]', title: "Search and filter by department", description: "Use the search box to find tickets by title, ticket ID, or submitter name. The department dropdown lets you focus on a specific team's tickets — for example, only IT or only Maintenance issues." },
      { selector: '[data-tour="tickets-raise-btn"]', title: "Raise a new ticket", description: "Click this to open the ticket form. Choose the target department, set a priority (Low, Medium, or High), write a clear title and description, set a due date, and optionally assign it to a specific person." },
      { selector: '[data-tour="tickets-table"]', title: "Ticket list and actions", description: "Each row shows the ticket ID, title, who raised it, which department it is routed to, its priority, status, and when it was last updated. Click the eye icon on any row to open the full ticket detail." },
    ],
    matches: exact("/tickets"),
  },
  {
    id: "professional-meeting-rooms",
    version: PROFESSIONAL_TOUR_VERSION,
    title: "Meeting Rooms",
    description: "Reserve meeting rooms, manage bookings, and track invitations from one place. Book for yourself, for team members, for walk-in clients, or for tenant companies.",
    recordsDescription: "Booking records show the room, host or client, schedule, invite state, payment information when applicable, and available actions.",
    steps: [
      { selector: '[data-tour="meetings-main-tabs"]', title: "Booking tabs", description: "These four tabs organize all meeting-room activity. My Bookings is your personal hub. Internal, External, and Tenant tabs handle other booking types with their own workflows." },
      { selector: '[data-tour="meetings-tab-my-bookings"]', title: "My Bookings tab", description: "Your personal booking hub. See your own reservations, manage invites from others, and create new room bookings. This is where you start." },
      { selector: '[data-tour="meetings-tab-internal"]', title: "Internal Booking tab", description: "Book a meeting room on behalf of a team member or colleague. Use this when someone asks you to reserve a room for them." },
      { selector: '[data-tour="meetings-tab-external"]', title: "External Booking tab", description: "Handle walk-in or client bookings. These are external visitors who need a meeting room — you can track their payment status, schedule, and reservations." },
      { selector: '[data-tour="meetings-tab-tenant"]', title: "Tenant Bookings tab", description: "Bookings made by or for tenant companies sharing your workspace. Monitor their reservations and manage any issues." },
      { selector: '[data-tour="meetings-summary"]', title: "Booking counts at a glance", description: "These four cards show booking stats that change with each tab — for example, Upcoming, In Progress, Completed, and Cancelled counts for your current view." },
      { selector: '[data-tour="meetings-scope-tabs"]', title: "Scope tabs within My Bookings", description: "Within My Bookings, additional scope tabs let you switch between your own bookings, company-wide bookings (if you have access), and invitations you have received." },
      { selector: '[data-tour="meetings-scope-dept"]', title: "Company or Department scope", description: "Shows all bookings for your company or department. Only visible to Owners, Super Admins, Admins, and Managers — not available to Employees." },
      { selector: '[data-tour="meetings-scope-my-bookings"]', title: "My Bookings scope", description: "Shows only your personal reservations. This is your private booking list." },
      { selector: '[data-tour="meetings-scope-invites"]', title: "Invites scope", description: "Shows meeting invitations you have received from others. Accept or reject pending invites directly from here." },
      { selector: '[data-tour="meetings-status-filter"]', title: "Filter by status", description: "Narrow the list to specific statuses — Booked, In Progress, Completed, Cancelled, or Rescheduled. For invites, filter by Pending, Accepted, or Rejected." },
      { selector: '[data-tour="meetings-search"]', title: "Search bookings", description: "Find bookings by room name, host, client, or booking code. The search adapts based on the active tab." },
      { selector: '[data-tour="meetings-action-btn"]', title: "Create a booking", description: "The action button changes per tab — Book a Room for yourself, Book for Member internally, Walk-in Booking for clients, or Tenant Booking. Click to open the booking form." },
      { selector: '[data-tour="meetings-table"]', title: "Booking list and actions", description: "Each row shows the room, host or client, schedule, status, and available actions. Click the eye icon to view full details, or use reschedule, extend, or cancel buttons as available." },
      { selector: '[data-tour="meetings-calendar"]', title: "Room availability calendar", description: "Check room availability by date. Select a room and month to see which days are free (green), partially booked (amber), or fully booked (red)." },
    ],
    matches: startsWith("/meetings/meeting-rooms"),
  },
  {
    id: "professional-calendar",
    version: PROFESSIONAL_TOUR_VERSION,
    title: "Calendar",
    description: "Use the Professional calendar as a unified view of bookings, tickets, and holidays.",
    steps: [
      { text: "Bookings", exactText: true, title: "Calendar summary", description: "The summary cards show the number of Professional-plan booking, ticket, and holiday events currently available." },
      { text: "Today", exactText: true, title: "Move between months", description: "Use the previous and next controls to change months. Today returns immediately to the current date." },
      { selector: 'input[placeholder="Search events..."]', title: "Search events", description: "Filter visible calendar events by their title or related details." },
      { text: "Tickets", exactText: true, title: "Filter event types", description: "Show all events or focus on Bookings, Tickets, or Holidays. Professional workspaces do not include Custom-only Tasks and Leave filters." },
      { selector: '[data-tour="page-content"] .grid-cols-7', title: "Monthly calendar", description: "Select a date to review its events, or select an event badge to open its complete date, module, priority, and status details." },
    ],
    matches: exact("/calendar"),
  },
  {
    id: "professional-workspace-settings",
    version: PROFESSIONAL_UNIT_TOUR_VERSION,
    title: "Unit Settings",
    description: "Create another Professional unit under the same Founder account and review what will be shared or entered again during setup.",
    steps: [
      { selector: '[data-tour="unit-settings-summary"]', title: "Your unit overview", description: "Owned Units shows how many branches belong to this Founder account. The other cards identify the active unit and combine employee and task totals across linked units." },
      { selector: '[data-tour="unit-settings-create"]', title: "Start another branch unit", description: "This is the complete entry point for adding a second Professional unit. Only the Founder or Owner can start this protected creation flow." },
      { selector: '[data-tour="unit-settings-create-button"]', title: "Select Create Unit", description: "Click Create Unit to open password verification. Enter the current Founder account password and continue; after successful verification, the additional-unit onboarding form opens." },
      { selector: '[data-tour="unit-settings-creation-details"]', title: "What is copied and what is new", description: "The current business and brand identity are prefilled. The new unit name starts empty, and you enter its own country, state, city, address, location, business vertical, and other branch-specific setup information." },
      { selector: '[data-tour="unit-settings-creation-notes"]', title: "Complete the onboarding flow", description: "Finish every required onboarding step and submit the new unit. It is then linked to the same Founder account, appears in the workspace switcher, and unlocks Unit Management because the account now has more than one unit." },
      { selector: '[data-tour="unit-settings-linked-units"]', title: "Confirm the linked unit", description: "After setup is completed, the new branch appears here with its location and employee count. The Active badge identifies the unit you are currently using." },
      { selector: '[data-tour="unit-settings-business-hours"]', title: "Set operating hours", description: "Choose opening and closing times for the active unit, then select Save Hours. These hours control meeting-room, walk-in, and booking availability for its resources." },
    ],
    matches: exact("/company-settings/workspace-settings"),
  },
  {
    id: "professional-workspace-management",
    version: PROFESSIONAL_UNIT_TOUR_VERSION,
    title: "Unit Management",
    description: "Compare and manage every Professional unit linked to the Founder account after a second unit has been created.",
    recordsDescription: "Each unit record combines its identity, operating totals, detailed people and department information, and permitted management actions.",
    steps: [
      { selector: '[data-tour="unit-management-summary"]', title: "Combined unit performance", description: "These cards total employees, departments, tickets, tasks, assets, inventory, meeting bookings, and overall performance across the linked units." },
      { selector: '[data-tour="unit-management-controls"]', title: "Choose the data to review", description: "Use the first filter to show every unit or one specific branch. Use the department filter to recalculate the view for a selected department across the linked units." },
      { selector: '[data-tour="unit-management-view-data"]', title: "Open the combined data view", description: "Select View Data to open a consolidated operational view across units, including status breakdowns and recent records for work, assets, inventory, bookings, and employees." },
      { selector: '[data-tour="unit-management-list"]', title: "Review each linked unit", description: "Each unit card shows its business identity, location, creation date, current or linked state, and separate totals for employees, departments, tickets, tasks, assets, inventory, bookings, and performance." },
      { selector: '[data-tour="unit-management-view-details"]', title: "View a unit’s detailed data", description: "Select View Details to expand the unit. The Employees, Roles, Work Items, and Departments tabs then show the people, access distribution, recent tickets and tasks, and department-level totals for that branch." },
      { selector: '[data-tour="unit-management-edit-unit"]', title: "Edit the unit name", description: "Select Edit Unit to open the edit dialog, update the branch name, and save it. The refreshed name is applied to the linked unit after the update succeeds." },
    ],
    matches: exact("/company-settings/workspace-management"),
  },
  {
    id: "professional-leads-management",
    version: PROFESSIONAL_TOUR_VERSION,
    title: "Leads Management",
    description: "Manage visitor and website leads, review requirements, update their stage, and convert suitable leads into tenant opportunities.",
    steps: [
      { text: "All", exactText: true, title: "Lead source and stage filters", description: "Switch between the lead sources and use stage buttons to focus on the part of the sales workflow that needs attention." },
      { selector: 'input[placeholder="Search leads, companies, visitor codes..."]', title: "Search visitor leads", description: "Find visitor-originated leads using lead, company, contact, or visitor-code information." },
      { selector: '[data-tour="page-content"] table', title: "Lead records", description: "The table shows contact details, requirements, stage, source, and timeline. Select View details to inspect the complete lead." },
      { selector: 'button[aria-label^="View details for"]', title: "Lead details and conversion", description: "Review the lead before updating it. Suitable visitor leads can be converted; website leads can be closed after follow-up is complete." },
    ],
    matches: exact("/sales-crm/leads-management"),
  },
  {
    id: "professional-tenant-company-detail",
    version: PROFESSIONAL_TOUR_VERSION,
    title: "Tenant company profile",
    description: "Review and maintain the selected tenant's company, agreement, occupancy, employee, and access information.",
    steps: [
      { text: "Tenant Occupied Area", exactText: true, title: "Occupied workspace", description: "Review the floors, wings, seats, and space blocks currently allocated to this tenant company." },
      { text: "Add Employee", exactText: true, title: "Invite a tenant employee", description: "Add an employee with validated contact information, designation, and tenant role. The invitation connects the member to this tenant company." },
      { text: "Employee Profile", exactText: true, title: "Manage tenant access", description: "Open an employee profile to review registration and login information, edit their details, or deactivate access when required." },
      { text: "Save Employee", title: "Save employee changes", description: "Review the updated name, phone, designation, and role before saving changes to the tenant employee." },
    ],
    matches: (path) => /^\/sales-crm\/tenant-companies\/[^/]+$/.test(path),
  },
  {
    id: "professional-tenant-companies",
    version: PROFESSIONAL_TOUR_VERSION,
    title: "Tenant Companies",
    description: "Manage tenant companies, agreements, occupied spaces, employees, credits, and related requests.",
    steps: [
      { selector: 'input[placeholder="Search company or contact person..."]', title: "Search tenant companies", description: "Find a tenant using its company name or primary contact person." },
      { selector: '[data-tour="page-content"] table', title: "Tenant records", description: "Review company, contact, agreement, occupancy, and status information. Select View Profile to open the complete tenant workspace." },
      { selector: 'button[title="View Profile"]', title: "Open a tenant profile", description: "The tenant profile contains company details, agreement history, assigned spaces, employees, credit activity, and permitted management actions." },
      { text: "Add Employee", exactText: true, title: "Manage tenant employees", description: "From a tenant profile, authorized users can invite employees, set their tenant role, edit details, deactivate access, or delete an unused invitation." },
    ],
    matches: exact("/sales-crm/tenant-companies"),
  },
  {
    id: "professional-resource-pricing",
    version: PROFESSIONAL_TOUR_VERSION,
    title: "Resource & Pricing",
    description: "Maintain workspace resources, area blocks, and the pricing packages used for memberships and tenant agreements.",
    steps: [
      { selector: '[data-tour="page-content"] h2', title: "Resource and pricing setup", description: "Use this page to keep the spaces available for sale aligned with the rates and packages offered to customers." },
      { selector: '[data-tour="page-content"] [role="tablist"], [data-tour="page-content"] select', title: "Choose the pricing area", description: "Switch between available resource and package areas. The visible controls change according to the selected pricing type." },
      { selector: '[data-tour="page-content"] table', title: "Resources and packages", description: "Review configured resources or packages and use View Details before editing their setup." },
      { text: "Package Summary", exactText: true, title: "Package totals", description: "When creating or editing a package, review its seats, included credits, monthly rate, and contract value before saving." },
    ],
    matches: exact("/sales-crm/resource-pricing"),
  },
  {
    id: "professional-sales-architecture",
    version: PROFESSIONAL_TOUR_VERSION,
    title: "Sales Architecture",
    description: "Understand and manage how workspace floors, wings, desks, tenant companies, and departments are allocated.",
    steps: [
      { selector: 'input[placeholder="Search space, tenant..."]', title: "Search workspace allocation", description: "Find a space or tenant allocation across the workspace architecture." },
      { selector: '[data-tour="page-content"] table', title: "Allocation records", description: "Review locations, capacity, assigned space blocks, tenants, and departments. Use View Details to inspect a complete allocation." },
      { text: "Assign Space", title: "Assign tenant space", description: "Choose a tenant company and select available desks or cabins from the required floor and wing before confirming the allocation." },
      { text: "Assign Space to Department", title: "Assign department space", description: "Allocate available workspace blocks to an internal department and confirm the selected capacity." },
      { text: "Release Spaces", exactText: true, title: "Release an allocation", description: "Use Release Spaces when assigned blocks must return to the available inventory. Review the selection carefully before confirming." },
    ],
    matches: exact("/sales-crm/sales-architecture"),
  },
];

const professionalCopy = (value: string) =>
  value
    .replace(/Basic-plan/g, "Professional-plan")
    .replace(/Basic plan/g, "Professional plan");

const cloneSharedStep = (step: BasicPageTourStep): BasicPageTourStep => ({
  ...step,
  title: professionalCopy(step.title),
  description: professionalCopy(step.description),
});

export const getProfessionalPageTour = (pathname: string): BasicPageTour | null => {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const professionalTour = PROFESSIONAL_PAGE_TOURS.find((tour) => tour.matches(normalizedPath));
  if (professionalTour) {
    const { matches: _matches, ...tour } = professionalTour;
    return tour;
  }

  const sharedTour = getBasicPageTour(normalizedPath);
  if (!sharedTour) return null;

  return {
    ...sharedTour,
    id: sharedTour.id.replace(/^basic-/, "professional-"),
    title: professionalCopy(sharedTour.title),
    description: professionalCopy(sharedTour.description),
    formDescription: sharedTour.formDescription
      ? professionalCopy(sharedTour.formDescription)
      : undefined,
    recordsDescription: sharedTour.recordsDescription
      ? professionalCopy(sharedTour.recordsDescription)
      : undefined,
    steps: sharedTour.steps?.map(cloneSharedStep),
  };
};
