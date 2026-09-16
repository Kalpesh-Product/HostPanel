import { getBasicPageTour } from "./basicPageTours";
import type { BasicPageTour, BasicPageTourStep } from "./basicPageTours";

interface ProfessionalTourRoute extends BasicPageTour {
  matches: (pathname: string) => boolean;
}

const PROFESSIONAL_TOUR_VERSION = 2;
const PROFESSIONAL_UNIT_TOUR_VERSION = 4;
const exact = (path: string) => (pathname: string) =>
  pathname === path || pathname === `${path}/`;
const startsWith = (path: string) => (pathname: string) =>
  pathname === path || pathname.startsWith(`${path}/`);

const PROFESSIONAL_PAGE_TOURS: ProfessionalTourRoute[] = [
  {
    id: "professional-organization",
    version: 4,
    title: "Organization management",
    description: "Manage Professional-plan platform users and the Sales and Technology department structure.",
    replayHint: true,
    steps: [
      { selector: '[data-tour="organization-users-tab"]', title: "Platform users", description: "Review workspace members, invitations, roles, account state, and member actions. Professional supports up to five workspace users." },
      { selector: '[data-tour="organization-departments-tab"]', title: "Departments", description: "Open the department view to manage the Sales and Technology departments, their manager assignments, and your editable custom department when your role permits it." },
      { selector: '[data-tour="organization-create-department"]', title: "Create your own department", description: "Select Create Department to name your custom department, describe it, and choose the core modules it grants. Sales and Technology are fixed on Professional; after saving, invite its manager through Add User. This control appears while the Departments tab is open." },
      { selector: '[data-tour="organization-status-filters"]', title: "Filter onboarding status", description: "Separate invited, registered, pending, joined, or disabled members so you can follow onboarding and account access." },
      { selector: '[data-tour="organization-search"]', title: "Search platform users", description: "Find a member by name, email address, or other details shown in the list." },
      { selector: '[data-tour="organization-department-filter"]', title: "Filter by department or role", description: "Narrow the member list to a single department or to one workspace role such as Super Admin, Admin, Manager, or Employee." },
      { selector: '[data-tour="organization-add-user"]', title: "Add a platform user", description: "Open the member form, choose an available Professional role and department access, then send the invitation. The button is disabled when the five-user plan limit is reached." },
      { selector: '[data-tour="organization-members-table"]', title: "Member records and access", description: "Review identity, role, departments, status, and access. Authorized users can toggle account access and open View Details for the complete member record.", side: "top" },
    ],
    matches: exact("/core-modules/organization-management"),
  },
  {
    id: "professional-access-grants",
    version: 4,
    title: "Access grants",
    description: "Review member roles and control access to the Professional modules available in this workspace.",
    replayHint: true,
    steps: [
      { selector: '[data-tour="access-grants-summary"]', title: "Role overview", description: "See the number of members assigned to each workspace role before reviewing individual permissions." },
      { selector: '[data-tour="access-grants-status-filters"]', title: "Filter by access state", description: "Switch between all, active, and disabled workspace members." },
      { selector: '[data-tour="access-grants-search"]', title: "Search access records", description: "Find a member by name, email address, or department." },
      { selector: '[data-tour="access-grants-role-filter"]', title: "Filter by role", description: "Focus the list on a specific workspace role such as Super Admin, Admin, Manager, or Employee." },
      { selector: '[data-tour="access-grants-transfer"]', title: "Transfer ownership", description: "Appears only when an eligible member exists and you are in your main unit. Opens the handoff that makes another member the workspace Founder." },
      { selector: '[data-tour="access-grants-table"]', title: "Review members and their actions", description: "The list shows role, department scope, account status, and each member's row actions. The shield action opens Sidebar Access for Professional modules; the user-and-cog action opens role details and authorized role changes. Ownership transfer appears separately only when an eligible member exists.", side: "top" },
    ],
    matches: exact("/core-modules/access-grants"),
  },
  {
    id: "professional-dashboard",
    version: 3,
    title: "Professional dashboard",
    description: "Review the Professional-plan modules, current operational activity, direct shortcuts, and trends from one workspace overview.",
    steps: [
      { selector: '[data-tour="sidebar"]', title: "Your workspace navigation", description: "Use the sidebar to move between the modules available to your Professional-plan role. Other page tours will focus only on their own functionality." },
      { selector: '[data-tour="breadcrumb"]', title: "Your current location", description: "The breadcrumb shows the active workspace section and page." },
      { selector: '[data-tour="workspace-switcher"]', title: "Switch workspaces", description: "If you belong to multiple workspaces, switch here. Your automatic guides are remembered across all of your units." },
      { selector: '[data-notification-trigger]', title: "Workspace notifications", description: "Open notifications to review recent activity and updates requiring attention." },
      { selector: '[data-tour="professional-plan"]', title: "Your Professional plan", description: "This strip confirms the current plan. Selecting it opens Custom-plan options for additional modules such as Finance, HR, AI tools, Maintenance, and IT." },
      { selector: '[data-tour="professional-overview"]', title: "Operational overview", description: "One live, actionable number per domain — tenants, today's bookings, open tickets, and today's visitors. Selecting a card opens its complete module." },
      { selector: '[data-tour="professional-quick-links"]', title: "Quick Links", description: "Open Tenant Companies, Meeting Rooms, Customer Support, Visitor Management, Website Builder, Organization, or Calendar directly." },
      { selector: '[data-tour="professional-getting-started"]', title: "Getting started", description: "Until tenants, bookings, tickets, or visitors start coming in, this checklist replaces the activity rows below — follow the four steps to get your workspace live." },
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
    matches: exact("/common-modules/tickets"),
  },
  {
    id: "professional-attendance",
    version: PROFESSIONAL_TOUR_VERSION,
    autoStart: false,
    title: "Attendance",
    description: "Clock in and out with selfie verification, watch your hours build up live, review team attendance for the departments you manage, and resolve punch corrections. Switch to a tab, then select Guide — the walkthrough follows whichever tab is open.",
    steps: [
      { selector: '[data-tour="attendance-main-tabs"]', title: "Three areas, one guide", description: "My Attendance tracks your own day. Team Attendance appears for managers, HR, and admins to review members across the Sales and Technology departments, and Corrections lists punch fixes that were requested. The steps after this one always describe the tab you currently have open." },
      // ── My Attendance ──
      { tabPage: "my-attendance", selector: '[data-tour="attendance-summary"]', title: "Your month at a glance", description: "These cards count your present, absent, and late days for the selected month, plus your worked hours against the weekly target." },
      { tabPage: "my-attendance", selector: '[data-tour="attendance-clock-card"]', title: "Your day, live", description: "This card follows today's progress — current state (not clocked in, working, or on break), your punches so far, and the shift you are working against." },
      { tabPage: "my-attendance", selector: '[data-tour="attendance-clock-actions"]', title: "Clock in and out", description: "Clock In opens selfie capture with automatic location detection. While clocked in you can Start Break, End Break, and Clock Out. Clock-in opens one hour before your assigned shift." },
      { tabPage: "my-attendance", selector: '[data-tour="attendance-calculations"]', title: "Today's calculations", description: "Total Time, Total Break, Current Break, and Working Hours update live while your day is in progress." },
      { tabPage: "my-attendance", selector: '[data-tour="attendance-daily-target"]', title: "Daily target progress", description: "The bar compares worked hours against the daily target from HR's shift settings and shows how far you are through it." },
      { tabPage: "my-attendance", selector: '[data-tour="attendance-status-filters"]', title: "Filter by status", description: "Switch between All, Present, Absent, and Late records for the selected month." },
      { tabPage: "my-attendance", selector: '[data-tour="attendance-month-select"]', title: "Choose the month", description: "Select any of the last twelve months to load that month's attendance records." },
      { tabPage: "my-attendance", selector: '[data-tour="attendance-view-month"]', title: "Open the monthly overview", description: "Shows a color-coded calendar — green days completed the full target, amber days were clocked but short, red is absent, blue is leave, and violet is a holiday." },
      { tabPage: "my-attendance", selector: '[data-tour="attendance-table"]', title: "Your daily records", description: "Each row shows date, punches, status, and hours. The eye button opens that day's timeline with breaks and calculations; the pencil button requests a correction and locks while a request is pending or approved.", side: "top" },
      // ── Team Attendance ──
      { tabPage: "team-attendance", selector: '[data-tour="attendance-summary"]', title: "Team counts for the selected scope", description: "These cards total present, absent, and late members across the team view you are filtering, so coverage problems stand out immediately." },
      { tabPage: "team-attendance", selector: '[data-tour="attendance-status-filters"]', title: "Filter by status", description: "Focus the list on All, Present, Absent, or Late members for the chosen day and department." },
      { tabPage: "team-attendance", selector: '[data-tour="attendance-month-select"]', title: "Pick the period", description: "Move between months to review how team attendance trends over time." },
      { tabPage: "team-attendance", selector: '[data-tour="attendance-search"]', title: "Search employees", description: "Find a specific member by name instead of scrolling the roster." },
      { tabPage: "team-attendance", selector: '[data-tour="attendance-department-filter"]', title: "Narrow by department", description: "Limit the roster to one department — on Professional this covers Sales, Technology, and any custom departments you manage." },
      { tabPage: "team-attendance", selector: '[data-tour="attendance-table"]', title: "Member rows", description: "Every row shows an employee's date, punches, status, and hours for the period. The eye button opens their complete timeline — breaks, locations, and clock selfies.", side: "top" },
      // ── Corrections ──
      { tabPage: "corrections", selector: '[data-tour="attendance-summary"]', title: "Correction requests at a glance", description: "These cards track correction activity — how many fixes were requested, which are still pending, and how many were approved or rejected." },
      { tabPage: "corrections", selector: '[data-tour="attendance-status-filters"]', title: "Filter requests by state", description: "Separate pending, approved, and rejected correction requests so open work is never missed." },
      { tabPage: "corrections", selector: '[data-tour="attendance-search"]', title: "Find a request", description: "Locate a correction by employee name when reviewing specific cases." },
      { tabPage: "corrections", selector: '[data-tour="attendance-table"]', title: "Requests and outcomes", description: "Each row shows what was asked for versus the original punch times, who requested it, and its current state. Approved fixes update the underlying attendance record automatically.", side: "top" },
    ],
    matches: exact("/common-modules/attendance"),
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
    matches: startsWith("/common-modules/meeting-room-booking"),
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
    matches: exact("/common-modules/calendar"),
  },
  {
    id: "professional-workspace-settings",
    version: PROFESSIONAL_UNIT_TOUR_VERSION,
    title: "Unit Settings",
    description: "Create another Professional unit under the same Founder account and review what will be shared or entered again during setup.",
    steps: [
      { selector: '[data-tour="unit-settings-summary"]', title: "Your unit overview", description: "Owned Units shows how many branches belong to this Founder account. The other cards identify the active unit and combine employee and task totals across linked units." },
      { selector: '[data-tour="unit-settings-create"]', title: "Start another branch unit", description: "This is the complete entry point for adding a second Professional unit. Only the Founder or Owner can start this protected creation flow." },
      { selector: '[data-tour="unit-settings-create-button"]', title: "Select Create Unit", description: "Click Create Unit to open password verification. Enter the current Founder account password to continue. You are then taken to the onboarding flow, where only your current business name is prefilled and you enter the new branch's own unit name, brand name, country, state, city, address, and business vertical. Finishing onboarding links the new unit to this Founder account, adds it to the workspace switcher, and unlocks Unit Management." },
      { selector: '[data-tour="unit-settings-linked-units"]', title: "Your linked units", description: "Every unit linked to this Founder account appears here with its status, plan, location, and employee count. Use the row actions to switch to a unit, rename it, enable or disable it, or delete it. The main unit is protected and cannot be removed." },
      { selector: '[data-tour="unit-settings-business-hours"]', title: "Set operating hours", description: "Choose opening and closing times for the active unit, then select Save Hours. These hours control meeting-room, walk-in, and booking availability for its resources." },
      { selector: '[data-tour="unit-settings-billing"]', title: "Tax and payment preferences", description: "Configure the location-level tax and payment rules that drive external and walk-in booking totals, payment evidence, and confirmation emails for the active unit.", side: "top" },
    ],
    matches: exact("/core-modules/workspace-settings"),
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
      { selector: '[data-tour="unit-management-switch-unit"]', title: "Switch to a linked unit", description: "Select Switch on any linked unit that is not already active to move your session there. This button is only available for units that are not currently active, disabled, or deleted." },
      { selector: '[data-tour="unit-management-manage-unit"]', title: "Manage the unit", description: "Select Manage Unit to jump to Unit Settings, where you can rename, enable or disable, delete, or request recovery for any linked unit." },
    ],
    matches: exact("/core-modules/workspace-management"),
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
    matches: exact("/department-accesses/sales-department/leads-management"),
  },
  {
    id: "professional-tenant-company-detail",
    version: 4,
    title: "Tenant company profile",
    description: "The complete workspace for one tenant — contract, employees, bookings, credits, and space allocation. This guide follows whichever tab is open; replay it from each tab for its walkthrough.",
    steps: [
      { selector: '[data-tour="tenant-detail-tabs"]', title: "Five profile areas", description: "Company Details holds the contract record, Employees manages the tenant's team, Bookings tracks meeting-room usage, Credits follows consumption, and Space Allocation shows the seats assigned." },
      { selector: '[data-tour="tenant-detail-stats"]', title: "Credit position", description: "Always visible across tabs — base credits from the contract, purchased top-ups, credits used so far, and the remaining balance." },
      { selector: '[data-tour="tenant-detail-contract-cards"]', tabPage: "company-details", title: "Contract window", description: "Contract start and end dates, total duration in months, and the floor or area assigned to this tenant." },
      { text: "Sales Package Summary", tabPage: "company-details", title: "Package and billing", description: "The sold package with plan type, monthly credits, and desk counts sits beside the billing snapshot of monthly rent, contract amount, and security deposit." },
      { text: "Admin Assignment", tabPage: "company-details", title: "Admin and contacts", description: "Shows the tenant-side Admin handling this account — Assigned or Pending — with the customer profile and local and head-office POC details alongside." },
      { selector: '[data-tour="tenant-detail-change-manager"]', tabPage: "employees", title: "Change the Admin", description: "Reassign the tenant-side Admin from the current employee list. Admin is a company-wide, master-access role — picking someone new demotes the outgoing Admin to Employee, useful when your contact leaves the company." },
      { selector: '[data-tour="tenant-detail-add-employee"]', tabPage: "employees", title: "Add an employee", description: "Invite a tenant employee with name, email, phone, role, department, and designation. New members appear here and receive access to their tenant workspace." },
      { selector: '[data-tour="tenant-detail-bulk-upload-employees"]', tabPage: "employees", title: "Bulk upload employees", description: "Import several tenant employees at once from a spreadsheet using the template — name, email, phone, and designation per row. Every imported row lands as Employee; assign Admin or Manager manually afterward before sending invites.", side: "left" },
      { selector: '[data-tour="tenant-detail-employees-table"]', tabPage: "employees", title: "Employee directory", description: "Each row shows the employee, contact details, and account status. Send or resend an invite where one is pending, open a profile to review or edit it, toggle access on or off, and remove employees who have left. The Admin is marked and cannot be removed here.", side: "top" },
      { selector: '[data-tour="tenant-detail-bookings-table"]', tabPage: "bookings", title: "Meeting room bookings", description: "Every booking made by this tenant with room, date and time, booker, status, and credits spent. Open View Details for the full booking record.", side: "top" },
      { selector: '[data-tour="tenant-detail-credit-utilization"]', tabPage: "credits", title: "Credit utilization", description: "A live bar comparing credits used against base plus purchased credits, with the remaining balance and percentage utilized." },
      { selector: '[data-tour="tenant-detail-credits-month"]', tabPage: "credits", title: "Monthly credit activity", description: "Pick any month and year to see that period's Used, Refunded, and Net credits at a glance.", side: "top" },
      { selector: '[data-tour="tenant-detail-credits-table"]', tabPage: "credits", title: "Transaction history", description: "Every transaction for the selected month as debits and credits, each with a running balance. Months with no activity show a placeholder here instead.", side: "top" },
      { selector: '[data-tour="tenant-detail-space-summary"]', tabPage: "space-allocation", title: "Allocated space", description: "The assigned area with open desks, cabin desks, and total seats, followed by the desk-level breakdown and location labels from the tenant's package." },
    ],
    matches: (path) => /^\/department-accesses\/sales-department\/tenant-companies\/[^/]+$/.test(path),
  },
  {
    id: "professional-tenant-companies",
    version: 4,
    title: "Sales Tenant Companies",
    description: "Manage client contracts, allocations, and company profiles, and process tenants' extra credits requests. This guide follows whichever tab is open — replay it from the other tab to see its walkthrough.",
    steps: [
      { selector: '[data-tour="sales-tenant-tabs"]', title: "Two working areas", description: "Tenant companies lists every onboarded client contract with its profile. Extra credits requests collects tenants' top-up requests awaiting your approval, Finance invoicing, and payment verification." },
      { selector: '[data-tour="sales-tenant-summary"]', tabPage: "companies", title: "Contract totals", description: "Live counts of tenants on file — Total Tenants, plus Active Contracts, Expiring Soon within thirty days, and Expired Contracts needing renewal." },
      { selector: '[data-tour="sales-tenant-status-filters"]', tabPage: "companies", title: "Filter by contract state", description: "Switch between All, Active, Expiring Soon, Expired, and Inactive contracts to focus follow-ups on renewals." },
      { selector: '[data-tour="sales-tenant-search"]', tabPage: "companies", title: "Find a tenant", description: "Search by company name or primary contact person — results narrow as you type." },
      { selector: '[data-tour="sales-tenant-package-filter"]', tabPage: "companies", title: "Filter by package", description: "Show only tenants contracted on one specific package." },
      { selector: '[data-tour="sales-tenant-add-btn"]', tabPage: "companies", title: "Onboard a tenant company", description: "Opens the full onboarding form — profile and contact, customer and POC details, location and desk assignment, credits allocation, billing, agreement details, and document upload. Submit & Send to Finance passes the record to Finance for processing.", side: "left" },
      { selector: '[data-tour="sales-tenant-bulk-upload"]', tabPage: "companies", title: "Bulk upload companies", description: "Import several tenant companies from Excel using the template. Company, contact, location, desk counts, rates, credits, and contract dates all import directly — Floor and Wing must exactly match an existing Resource & Pricing entry, and only Active-status rows get real desks assigned. A Company Name matching an existing tenant updates it instead of creating a duplicate.", side: "left" },
      { selector: '[data-tour="sales-tenant-table"]', tabPage: "companies", title: "Contract records", description: "Each row shows company and contact details, contract period, package and credits, and status. Available actions follow that status: View and Edit for most tenants; Renew Contract and Mark Inactive once a contract has Expired; Deactivate once its lock-in period has ended for an Active or Expiring Soon tenant; and Reactivate for an Inactive tenant, reassigning floor, wing, desk counts, and rates to bring it back active.", side: "top" },
      { selector: '[data-tour="sales-tenant-summary"]', tabPage: "requests", title: "Request totals", description: "Counts every extra credits request — Total Requests, plus how many are Pending your approval, Sent to Finance for invoicing, and Paid." },
      { selector: '[data-tour="sales-tenant-request-filters"]', tabPage: "requests", title: "Filter requests", description: "Separate All, Completed, and Rejected requests so open approvals are never missed." },
      { selector: '[data-tour="sales-tenant-request-search"]', tabPage: "requests", title: "Find a request", description: "Search credit requests by tenant name." },
      { selector: '[data-tour="sales-tenant-request-table"]', tabPage: "requests", title: "The request workflow", description: "Each row shows the tenant, credits requested with rate and total value, invoice state, and requester. Approve or Reject new requests, Verify payment once proof is submitted, then Add credits completes the top-up. Open View invoice or View proof to check Finance documents first.", side: "top" },
    ],
    matches: exact("/department-accesses/sales-department/tenant-companies"),
  },
  {
    id: "professional-virtual-office-detail",
    version: 1,
    title: "Virtual office company profile",
    description: "The complete workspace for one virtual office company — profile, rental plan, payment history, and space allocation. This guide follows whichever tab is open; replay it from each tab for its walkthrough.",
    steps: [
      { selector: '[data-tour="vod-tabs"]', title: "Four profile areas", description: "Company Profile holds contact and POC details, Rental Plan & Revenue breaks down desks, rent, and contract value, Rent Payments History lists every payment on file, and Space Allocation shows the desks assigned." },
      { selector: '[data-tour="vod-stats"]', title: "Contract snapshot", description: "Always visible across tabs — Monthly Rent, Advance, Security Deposit, and Total Contract Amount." },
      { selector: '[data-tour="vod-header-actions"]', title: "Edit or renew", description: "Edit opens the same onboarding form to update any detail. Renew Contract appears once the company is Expiring Soon or Expired, and sets a new term start date and length — the rent amount and due date carry over unless changed separately in Edit." },
      { selector: '[data-tour="vod-profile-details"]', tabPage: "profile", title: "Company profile and contacts", description: "Brand name, sector, email, phone, and location sit beside the HO and Local points of contact for this company." },
      { selector: '[data-tour="vod-plan-breakdown"]', tabPage: "plan", title: "Desk and rental breakdown", description: "Open desk count and rate, total desks, meeting credits, term length and dates, rent due date, lock-in period, and current rent status." },
      { selector: '[data-tour="vod-plan-revenue"]', tabPage: "plan", title: "Revenue and contract value", description: "Total contract amount, security deposit, and annual increment percentage, plus a projection of next year's rent once that increment applies." },
      { selector: '[data-tour="vod-payments-table"]', tabPage: "payments", title: "Rent payment history", description: "Every payment recorded for this company from the Rent Collections & Payments tab, with period, amount, method, transaction ID, and status. Payments covered by the onboarding advance are marked Advance.", side: "top" },
      { selector: '[data-tour="vod-space-summary"]', tabPage: "space-allocation", title: "Space at a glance", description: "Assigned area, open desks, cabin desks, and total seats." },
      { selector: '[data-tour="vod-space-details"]', tabPage: "space-allocation", title: "Assigned space breakdown", description: "The assigned floor and the individual desks given to this company, alongside any location labels carried from its package." },
      { selector: '[data-tour="vod-space-seats"]', tabPage: "space-allocation", title: "Assigned seats by area", description: "When individual seats are assigned within the space, they're listed here by area." },
    ],
    matches: (path) => /^\/department-accesses\/sales-department\/virtual-offices\/[^/]+$/.test(path),
  },
  {
    id: "professional-virtual-offices",
    version: 1,
    title: "Virtual Office Companies",
    description: "Manage virtual office companies — onboarding, rent status, contract renewals, and payment collection. This guide follows whichever tab is open; replay it from the other tab to see its walkthrough.",
    steps: [
      { selector: '[data-tour="vo-tabs"]', title: "Two working areas", description: "Virtual office companies lists every onboarded company with its plan, rent, and contract status. Rent Collections & Payments tracks and records their monthly rent payments." },
      { selector: '[data-tour="vo-bulk-upload"]', title: "Bulk upload", description: "Import several virtual office companies, or a batch of rent payments, from Excel — the template used depends on which tab is currently open." },
      { selector: '[data-tour="vo-summary"]', tabPage: "companies", title: "Company totals", description: "Live counts of Total Companies, Active Rents, Overdue Rents, and Pending Onboarding." },
      { selector: '[data-tour="vo-status-filters"]', tabPage: "companies", title: "Filter by status", description: "Switch between All, Active, Onboarding, Expiring Soon, Expired, and Cancelled companies." },
      { selector: '[data-tour="vo-search"]', tabPage: "companies", title: "Find a company", description: "Search by company name — results narrow as you type." },
      { selector: '[data-tour="vo-rent-status-filter"]', tabPage: "companies", title: "Filter by rent status", description: "Narrow the list to one rent state — Active, Overdue, Pending, or Cancelled." },
      { selector: '[data-tour="vo-add-btn"]', tabPage: "companies", title: "Onboard a company", description: "Opens the onboarding form — company and contact details, HO and Local points of contact, location, desk count and rate, term, security deposit, annual increment, advance, and lock-in period. Monthly rent, contract total, and the term end date calculate automatically as you fill it in.", side: "left" },
      { selector: '[data-tour="vo-companies-table"]', tabPage: "companies", title: "Company records", description: "Each row shows the plan, monthly rent, advance, term end, and both rent and record status. View opens the complete company profile, Edit updates the record, and Renew (shown once a company is Expiring Soon or Expired) sets a new term.", side: "top" },
      { selector: '[data-tour="vo-summary"]', tabPage: "collections", title: "Collection totals", description: "Collected amount, Paid Records, Pending / Overdue records, and total Companies." },
      { selector: '[data-tour="vo-collection-status-filters"]', tabPage: "collections", title: "Filter by rent status", description: "Switch between All, Active, Overdue, Pending, and Cancelled rent records." },
      { selector: '[data-tour="vo-search"]', tabPage: "collections", title: "Find a company", description: "Search the collections list by company name." },
      { selector: '[data-tour="vo-record-payment-btn"]', tabPage: "collections", title: "Record a payment", description: "Opens the payment form for any company — month, amount, period, payment method, transaction ID, status, and notes." },
      { selector: '[data-tour="vo-collections-table"]', tabPage: "collections", title: "Payment records", description: "Each row shows monthly rent, how many payments are on file, and current rent status. View rent details opens the full payment history and Record payment logs a new one.", side: "top" },
    ],
    matches: exact("/department-accesses/sales-department/virtual-offices"),
  },
  {
    id: "professional-resource-pricing",
    version: 3,
    title: "Resource & Pricing",
    description: "Maintain workspace resources, their rates and credits, and the packages sold to tenant companies. This guide follows whichever tab is open — replay it from the other tab to see its walkthrough.",
    steps: [
      { selector: '[data-tour="resource-pricing-tabs"]', title: "Two pricing areas", description: "Resources prices every desk, cabin, meeting room, conference room, and virtual office in the workspace. Tenant Packages builds the credit bundles tenants buy for their agreements." },
      { selector: '[data-tour="resource-pricing-summary"]', tabPage: "resource", title: "Inventory totals", description: "Counts of every priced resource split by Active, Under Maintenance, and Disabled, so availability issues stand out immediately." },
      { selector: '[data-tour="resource-pricing-status-filters"]', tabPage: "resource", title: "Filter by status", description: "Switch between All, Active, Under Maintenance, and Disabled resources without leaving the tab." },
      { selector: '[data-tour="resource-pricing-search"]', tabPage: "resource", title: "Find a resource", description: "Search by name, category, location code, floor, or wing — results narrow as you type." },
      { selector: '[data-tour="resource-pricing-filters"]', tabPage: "resource", title: "Filter by category, floor, and wing", description: "Combine category, floor, and wing filters to drill down to an exact area of the office, then Reset Filters clears them all." },
      { selector: '[data-tour="resource-pricing-hours-btn"]', tabPage: "resource", title: "Booking hours", description: "Sets the daily booking window used across meeting-room, walk-in, and tenant bookings — for example 9 AM to 10 PM or open 24 hours." },
      { selector: '[data-tour="resource-pricing-add-resource-btn"]', tabPage: "resource", title: "Add a resource", description: "Opens the pricing form for a new unit — category, area block or single desk inventory mode, floor and wing, capacity, hourly and daily rates, credits, and status.", side: "left" },
      { selector: '[data-tour="resource-pricing-bulk-upload"]', tabPage: "resource", title: "Bulk upload resources", description: "Imports many resources at once from an Excel or CSV file using the provided template — required fields are name, location, category, floor, and capacity.", side: "left" },
      { selector: '[data-tour="resource-pricing-export-btns"]', tabPage: "resource", title: "Export the current view", description: "Download everything matching your filters as a PDF report or an Excel file saved to Reports." },
      { selector: '[data-tour="resource-pricing-table"]', tabPage: "resource", title: "Resource register", description: "Each row lists location, category, inventory mode, capacity, hourly and daily rates, and credits. Use the eye action to review details, the pencil to edit pricing and credits, and the circle action to disable or re-enable the resource.", side: "top" },
      { selector: '[data-tour="resource-pricing-summary"]', tabPage: "tenant", title: "Package totals", description: "Counts every tenant package plus how many are active, assigned to a tenant company, and flagged as recommended." },
      { selector: '[data-tour="resource-pricing-status-filters"]', tabPage: "tenant", title: "Filter by status", description: "Switch between All, Active, and Disabled packages to focus on what is currently sellable." },
      { selector: '[data-tour="resource-pricing-search"]', tabPage: "tenant", title: "Find a package", description: "Search by package name, description, or package code." },
      { selector: '[data-tour="resource-pricing-add-package-btn"]', tabPage: "tenant", title: "Create a tenant package", description: "Define the seats included across floors and wings, monthly credits per seat, contract duration of three months or more, price, features, and whether it is recommended.", side: "left" },
      { selector: '[data-tour="resource-pricing-export-btns"]', tabPage: "tenant", title: "Export packages", description: "Download the current filtered package list as a PDF report or Excel file saved to Reports." },
      { selector: '[data-tour="resource-pricing-table"]', tabPage: "tenant", title: "Package list and actions", description: "Each row shows coverage by floor and wing with open, cabin, and total seats, monthly credits that expire monthly, duration, and contract value. Recommended, Custom, and Locked badges explain each package's state. Use the eye action to review details and the pencil to edit; locked packages cannot be edited or deleted while assigned to a tenant.", side: "top" },
    ],
    matches: exact("/department-accesses/sales-department/resource-pricing"),
  },
  {
    id: "professional-frontdesk-action",
    version: 1,
    title: "Frontdesk Action",
    description: "Handle every front-desk task from one page — log a standard visitor, run a unit tour, create a walk-in meeting-room booking, or verify an online booking ID. This guide follows whichever workflow is open; switch tabs and replay it to tour the others.",
    replayHint: true,
    steps: [
      { selector: '[data-tour="frontdesk-tabs"]', title: "Choose a workflow", description: "Standard Visitor logs a guest at the desk, Unit Tour starts a guided property tour, Walk-in Booking reserves a meeting room for a client, and Verify Booking confirms an online booking ID before entry." },
      { selector: '[data-tour="frontdesk-stats"]', title: "Today at a glance", description: "Four summary cards describe the open workflow. Standard Visitor counts checked-in, pending, approved, and checked-out guests; the other tabs show their own relevant totals and they update every time you switch tabs." },
      { selector: '[data-tour="frontdesk-form-standard"]', tabPage: "standard", title: "Log the visitor", description: "Choose New Visitor or search an existing one, fill the personal and visit details, then select the visitor type and payment settings before submitting to check the visitor in and print the badge." },
      { selector: '[data-tour="frontdesk-form-tour"]', tabPage: "tour", title: "Start the tour", description: "Capture the prospect's contact information, location, and client profile and requirements, then submit to sync the lead and begin the unit tour with an optional follow-up date." },
      { selector: '[data-tour="frontdesk-form-walkin"]', tabPage: "walkin_booking", title: "Create the booking", description: "Enter the client details, pick the room and capacity, set the schedule so conflicts are flagged, then review pricing and payment before confirming the walk-in booking." },
      { selector: '[data-tour="frontdesk-form-verify"]', tabPage: "verify_booking", title: "Verify the booking", description: "Type the booking ID from the confirmation email, press FETCH, review the matched booking and its payment status, collect any amount due, then confirm entry." },
      { selector: '[data-tour="frontdesk-footer"]', title: "Confirm or cancel", description: "Cancel returns to visitor management. The right-hand action submits whichever workflow is open and prints the badge once the visitor is checked in." },
    ],
    matches: exact("/visitors/visitor-management/frontdesk-action"),
  },
  {
    id: "professional-sales-architecture",
    version: 3,
    title: "Sales Architecture",
    description: "Manage how workspace floors, wings, desks, meeting rooms, and virtual offices are allocated to tenant companies, virtual office companies, and internal departments. This guide follows whichever tab is open — replay it from another tab to see its walkthrough.",
    steps: [
      { selector: '[data-tour="sa-tabs"]', title: "Four working areas", description: "Architecture is the visual floor map. Tenants, Virtual Offices, and Departments each list every company or department with space assigned, and let you assign or release space of that kind." },
      { selector: '[data-tour="sa-export-btn"]', title: "Export the current view", description: "Download the current architecture view as a PDF report or Excel file saved to Reports." },
      { selector: '[data-tour="sa-filter-bar"]', title: "Filter by location, floor, and wing", description: "Narrow the page to one building, one floor, or one wing — this filter carries across every tab." },

      { selector: '[data-tour="sa-status-filters"]', tabPage: "architecture", title: "Filter by space status", description: "Switch between All, Available, Tenant, Virtual Office, Department, Booking, and Maintenance to focus the map on one kind of space." },
      { selector: '[data-tour="sa-arch-summary-cards"]', tabPage: "architecture", title: "Space totals at a glance", description: "Total and available desks, meeting and conference rooms, virtual offices, desks assigned to tenants, desks assigned to departments, and spaces under maintenance." },
      { selector: '[data-tour="sa-arch-view-toggle"]', tabPage: "architecture", title: "Floor Map or Dashboard", description: "Floor Map shows every space as a selectable card grouped by wing. Dashboard summarizes utilization by floor and wing instead." },
      { selector: '[data-tour="sa-arch-search"]', tabPage: "architecture", title: "Search spaces", description: "Find a space by code, name, floor, wing, or the tenant or department it's assigned to." },
      { selector: '[data-tour="sa-arch-assign-btn"]', tabPage: "architecture", title: "Assign the selected spaces", description: "Appears once you select one or more available desks or cabins on the map below. Opens Assign Space to allocate them to a tenant company." },
      { selector: '[data-tour="sa-arch-release-btn"]', tabPage: "architecture", title: "Release the selected spaces", description: "Appears once your selection includes an assigned space that isn't locked to a package. Frees the selected spaces back to available inventory." },
      { selector: '[data-tour="sa-arch-map-header"]', tabPage: "architecture", title: "Floor map header", description: "Shows the building and floor currently in view, and how many spaces match your filters." },
      { selector: '[data-tour="sa-arch-map-rooms"]', tabPage: "architecture", title: "Meeting & Conference Rooms", description: "Booking-only spaces on this floor — they can't be selected for tenant or department assignment here, only booked through Meeting Rooms." },
      { selector: '[data-tour="sa-arch-map-vo"]', tabPage: "architecture", title: "Virtual Offices on the map", description: "Virtual office spaces on this floor, shown for reference only. Assign them to a company from the Virtual Offices tab instead." },
      { selector: '[data-tour="sa-arch-map-desks"]', tabPage: "architecture", title: "Desks & Cabins by wing", description: "Every open desk and cabin desk on this floor, grouped by wing. Click a vacant card to select it for assignment, or click a desk that already has seats to manage its seat-level assignments individually." },
      { selector: '[data-tour="sa-arch-dashboard-header"]', tabPage: "architecture", title: "Floor dashboard", description: "Shows overall utilization — the share of seats currently assigned against the total for this building and floor." },
      { selector: '[data-tour="sa-arch-dashboard-stats"]', tabPage: "architecture", title: "Desk totals", description: "Total floors and wings in view, total desks, vacant seats, and how many are assigned to tenants versus departments." },
      { selector: '[data-tour="sa-arch-dashboard-floors"]', tabPage: "architecture", title: "Browse by floor", description: "Each card summarizes one floor's totals. Select a card to jump straight to its Floor Map view." },
      { selector: '[data-tour="sa-arch-dashboard-occupancy"]', tabPage: "architecture", title: "Occupancy by floor and wing", description: "Total, vacant, tenant-assigned, and department-assigned seats for each floor and wing, with an occupancy percentage and the open-desk versus cabin-desk split.", side: "top" },

      { selector: '[data-tour="sa-tenants-summary"]', tabPage: "tenants", title: "Tenant totals", description: "Total Tenants, Active contracts, Assigned Spaces, and Total Assigned Seats across the workspace." },
      { selector: '[data-tour="sa-tenants-status-filters"]', tabPage: "tenants", title: "Filter by contract status", description: "Switch between All, Active, Expired, and Inactive tenant companies." },
      { selector: '[data-tour="sa-tenants-search"]', tabPage: "tenants", title: "Find a tenant", description: "Search by company name or contact." },
      { selector: '[data-tour="sa-tenants-assign-btn"]', tabPage: "tenants", title: "Assign Space", description: "Opens Assign Space — choose a tenant company, filter by location, floor, and wing, then select the open desks or cabins to allocate before confirming." },
      { selector: '[data-tour="sa-tenants-table"]', tabPage: "tenants", title: "Tenant records", description: "Each row shows contract status, location, open and cabin desk counts, and total assigned seats. Use the eye icon to view full assignment details, and the release icon to free the spaces held by that tenant.", side: "top" },

      { selector: '[data-tour="sa-vo-summary"]', tabPage: "virtualOffices", title: "Virtual office totals", description: "Total Virtual Offices, Active companies, Assigned Spaces, and Total Assigned Seats." },
      { selector: '[data-tour="sa-vo-orphaned-banner"]', tabPage: "virtualOffices", title: "Orphaned space alert", description: "Appears when spaces are still marked as assigned to a virtual office company that has since been deleted. Release Spaces frees them for reassignment." },
      { selector: '[data-tour="sa-vo-status-filters"]', tabPage: "virtualOffices", title: "Filter by status", description: "Switch between All, Active, Expiring Soon, and Expired companies." },
      { selector: '[data-tour="sa-vo-search"]', tabPage: "virtualOffices", title: "Find a company", description: "Search by company name." },
      { selector: '[data-tour="sa-vo-assign-btn"]', tabPage: "virtualOffices", title: "Assign Space", description: "Opens Assign Space — choose a virtual office company, filter by floor and wing, then select the spaces to allocate. Virtual office spaces can be shared across multiple companies at once." },
      { selector: '[data-tour="sa-vo-table"]', tabPage: "virtualOffices", title: "Virtual office records", description: "Each row shows status, location, total assigned seats, and the specific space blocks held. Use the eye icon to view full details, and the release icon to free the spaces held by that company.", side: "top" },

      { selector: '[data-tour="sa-dept-summary"]', tabPage: "departments", title: "Department totals", description: "Departments available on this workspace plan, Dept Spaces assigned, Available Desks still open, and total Dept Seats." },
      { selector: '[data-tour="sa-dept-status-filters"]', tabPage: "departments", title: "Filter by assignment", description: "Switch between All, Assigned, and Unassigned departments." },
      { selector: '[data-tour="sa-dept-search"]', tabPage: "departments", title: "Find a department", description: "Search by department name or manager." },
      { selector: '[data-tour="sa-dept-assign-btn"]', tabPage: "departments", title: "Assign Space to Department", description: "Opens Assign Space to Department — pick a department, filter by location, floor, and wing, then select the open desks to allocate. The same modal opens from the arrow icon on each department's row." },
      { selector: '[data-tour="sa-dept-table"]', tabPage: "departments", title: "Department records", description: "Each row shows assigned seat count, locations, and space blocks held. Use the eye icon to view full details, the arrow icon to assign more space, and the release icon to free the spaces held by that department.", side: "top" },
    ],
    matches: exact("/department-accesses/sales-department/sales-architecture"),
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
