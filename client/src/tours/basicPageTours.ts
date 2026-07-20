export interface BasicPageTour {
  id: string;
  version: number;
  title: string;
  description: string;
  formDescription?: string;
  recordsDescription?: string;
  steps?: BasicPageTourStep[];
}

export interface BasicPageTourStep {
  title: string;
  description: string;
  selector?: string;
  text?: string;
  exactText?: boolean;
}

interface TourRoute extends BasicPageTour {
  matches: (pathname: string) => boolean;
}

const BASIC_TOUR_VERSION = 4;

const exact = (path: string) => (pathname: string) =>
  pathname === path || pathname === `${path}/`;
const startsWith = (path: string) => (pathname: string) =>
  pathname === path || pathname.startsWith(`${path}/`);

const BASIC_PAGE_TOURS: TourRoute[] = [
  {
    id: "basic-nomad-listing-form",
    version: 1,
    title: "Nomad listing form",
    description: "Add or update the listing details that visitors will use to understand your workspace offering.",
    formDescription: "Complete the required listing information, check the preview details, and save only when everything is accurate.",
    steps: [
      { selector: '[data-tour="page-content"] form', title: "Listing information", description: "Enter the workspace identity, location, amenities, contact information, images, and map details that should appear in the Nomads listing." },
      { text: "+ Add Review", exactText: true, title: "Add a review", description: "Adds another review block to this listing. Each added review can include the reviewer name, rating, and review text." },
      { text: "Submit", exactText: true, title: "Submit listing", description: "Validates the form and creates or updates the listing. While submission is running, the button is disabled to prevent duplicates." },
      { text: "Reset", exactText: true, title: "Reset the form", description: "Clears the values currently entered in the form. Use it only when you want to start the listing again." },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/nomad-listings\/(add|[^/]+)\/?$/.test(path),
  },
  {
    id: "basic-nomad-listings",
    version: 1,
    title: "Nomad listings",
    description: "Review your workspace listings, create a new one, or open an existing listing to update it.",
    recordsDescription: "This area contains your current listings and the actions available for each listing.",
    steps: [
      { text: "Active", exactText: true, title: "Filter by listing status", description: "All, Active, and Inactive buttons change which listings are shown without changing the listing data." },
      { selector: 'input[placeholder="Search by name, type, city..."]', title: "Search listings", description: "Filters the list using the company name, workspace type, or city as you type." },
      { text: "ADD LISTING", title: "Add a listing", description: "Opens the listing form. If the Basic-plan listing limit has been reached, this button explains that no additional listing can be created." },
      { selector: '[data-tour="page-content"] table', title: "Listing records and actions", description: "The table shows publication status and creation date. Select the pencil action in a row to open that listing for editing." },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/nomad-listings\/?$/.test(path),
  },
  {
    id: "basic-website-builder-editor",
    version: 1,
    title: "Website editor",
    description: "Build and update the selected website page. Review your content carefully before saving or publishing changes.",
    formDescription: "Use the editor controls to update page content, images, links, and section settings.",
    steps: [
      { selector: '[data-tour="page-content"] form', title: "Website content form", description: "Each section controls content that appears on the hosted website. Required fields must be valid before the page can be saved." },
      { text: "Preview", title: "Preview changes", description: "Opens or refreshes the website preview so you can check layout and content before making the changes public." },
      { text: "Save", title: "Save website", description: "Sends the current website content and media changes to the server. Wait for the success confirmation before leaving the editor." },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/website-builder\/(dynamic\/create-website|edit-website|edit-theme)(\/|$)/.test(path),
  },
  {
    id: "basic-website-theme",
    version: 1,
    title: "Website themes",
    description: "Browse the available designs, preview a theme, and select the one you want to use for your website.",
    recordsDescription: "These are the available theme choices. Open a preview before committing to a design.",
    steps: [
      { selector: '[data-tour="page-content"] input', title: "Find a suitable theme", description: "Use the available search or category controls to narrow the theme choices for your business type." },
      { text: "Preview", title: "Preview a theme", description: "Opens the selected design so you can inspect its pages and layout before using it." },
      { text: "Select", title: "Select the theme", description: "Chooses this design as the starting point for your website and continues to the website setup flow." },
      { text: "Load More", title: "Load more themes", description: "Displays the next group of available themes without losing the themes already shown." },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/website-builder\/(select-theme|view-theme|live-demo)\/?/.test(path),
  },
  {
    id: "basic-website-leads",
    version: 1,
    title: "Website leads",
    description: "Review enquiries submitted through your hosted website and follow up using the available contact information.",
    recordsDescription: "Each row is a website enquiry. Use its details and actions to review and follow up with the lead.",
    steps: [
      { text: "Pending", exactText: true, title: "Filter by lead stage", description: "The stage buttons limit the table to leads in that workflow state. All restores the complete list." },
      { selector: 'input[placeholder="Search by name, email, phone..."]', title: "Search leads", description: "Finds leads using their name, email address, or phone number." },
      { selector: 'button[aria-label^="View details for"]', title: "Open lead details", description: "The eye button opens the full enquiry. From that panel you can review the message and update the lead to Rejected or Closed." },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/website-builder\/(dynamic\/)?leads\/?$/.test(path),
  },
  {
    id: "basic-website-reviews",
    version: 1,
    title: "Website reviews",
    description: "Review customer feedback submitted through your website and control which approved reviews are displayed publicly.",
    recordsDescription: "Use the review list and row actions to inspect feedback and manage its website visibility.",
    steps: [
      { text: "Pending", exactText: true, title: "Filter review status", description: "Changes the list between pending, approved, and rejected review submissions." },
      { selector: 'input[placeholder="Search by name, source, description..."]', title: "Search reviews", description: "Filters reviews using the reviewer, review source, or submitted description." },
      { selector: '[data-tour="page-content"] table', title: "Review list", description: "The table shows moderation status and whether an approved website review is enabled for public display." },
      { selector: '[data-tour="page-content"] table tbody button', title: "Review details", description: "The eye action opens the full feedback. Pending reviews can be approved or rejected; approved website reviews can also be enabled or disabled publicly." },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/website-builder\/dynamic\/reviews\/?$/.test(path),
  },
  {
    id: "basic-website-careers",
    version: 1,
    title: "Website careers",
    description: "Manage the job openings shown on your hosted careers page and review their publishing status.",
    recordsDescription: "The job list shows current openings and provides actions to view, edit, publish, or close them.",
    steps: [
      { text: "JOB OPENINGS", exactText: true, title: "Job openings", description: "Shows the roles managed for the hosted careers page, including their vacancy and publishing status." },
      { selector: 'input[placeholder="Search by title, department..."]', title: "Search openings", description: "Filters job openings by role title or department." },
      { text: "PUBLISH JOB", title: "Publish a job opening", description: "Opens the complete job form. Publish to Website makes the finished opening available on the hosted careers page." },
      { text: "Edit", exactText: true, title: "Edit an opening", description: "Loads the selected job into the same form so its role details, vacancies, description, and website status can be updated." },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/website-builder\/dynamic\/careers\/?$/.test(path),
  },
  {
    id: "basic-website-builder",
    version: 1,
    title: "Website Builder",
    description: "Create your hosted website, continue editing an existing site, and open its leads, reviews, or careers tools.",
    steps: [
      { selector: '[data-tour="page-content"] [role="button"]', title: "Create or edit the website", description: "Starts a new website when none exists. Once created, the same card becomes Edit Website and opens the current site editor." },
      { text: "Website Leads", exactText: true, title: "Website leads", description: "Opens enquiries submitted through contact and lead forms on the hosted website." },
      { text: "Website Review", exactText: true, title: "Website reviews", description: "Opens website review moderation, where feedback can be approved and controlled for public visibility." },
      { text: "Careers", exactText: true, title: "Careers", description: "Opens job-opening management for the website careers page. It becomes available after the website has been created." },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/website-builder(?:\/dynamic)?$/.test(path),
  },
  {
    id: "basic-nomad-reviews",
    version: 1,
    title: "Nomads reviews",
    description: "Review feedback connected to the workspace’s WoNo Nomads presence.",
    steps: [
      { selector: '[data-tour="page-content"] table', title: "Review records", description: "Shows the reviewer, feedback, rating or type information, date, and current review state available to this workspace." },
      { selector: '[data-tour="page-content"] input', title: "Search reviews", description: "Filters the visible Nomads feedback so a particular reviewer or review can be found quickly." },
      { selector: '[data-tour="page-content"] table button', title: "Open review details", description: "The row action opens the complete review and the moderation information available for it." },
    ],
    matches: exact("/company-settings/reviews"),
  },
  {
    id: "basic-company-profile",
    version: 1,
    title: "Company profile",
    description: "Review the company identity, workspace plan, contact information, and branding used throughout HostPanel.",
    steps: [
      { selector: 'button[title="Upload company logo"]', title: "Upload company logo", description: "Selects a new company logo. The updated logo is used in the HostPanel header and supported company-facing surfaces after it is saved." },
      { text: "Upgrade Plan?", title: "Request a plan upgrade", description: "Opens the upgrade options available from the current Basic plan and starts the plan-change request flow." },
      { text: "Unit & Company Information", exactText: true, title: "Synced company information", description: "These company and unit values are read-only here because they are synchronized from the active workspace setup." },
    ],
    matches: exact("/profile/company-profile"),
  },
  {
    id: "basic-my-profile",
    version: 1,
    title: "My profile",
    description: "Review and maintain your own workspace identity and personal contact details.",
    steps: [
      { text: "Edit", exactText: true, title: "Edit your profile", description: "Unlocks the personal fields you are permitted to change. This does not change workspace roles or module access." },
      { text: "Save", exactText: true, title: "Save profile changes", description: "Validates and saves your updated personal information." },
      { text: "Reset", exactText: true, title: "Reset unsaved changes", description: "Restores the form to its last saved values and discards edits that have not been submitted." },
    ],
    matches: exact("/profile/my-profile"),
  },
  {
    id: "basic-change-password",
    version: 1,
    title: "Change password",
    description: "Securely verify your current password and replace it with a new password.",
    steps: [
      { text: "Verify", exactText: true, title: "Verify current password", description: "Checks the current password before the new-password fields are accepted." },
      { selector: 'button[title="Show password"], button[title="Hide password"]', title: "Show or hide password", description: "Temporarily reveals or conceals the related password field so it can be checked safely." },
      { text: "Submit", exactText: true, title: "Change the password", description: "Validates the password rules and confirmation, then replaces the account password." },
    ],
    matches: exact("/profile/change-password"),
  },
  {
    id: "basic-notifications",
    version: 1,
    title: "Notifications",
    description: "Review workspace updates, actions requiring attention, and links back to the related records.",
    steps: [
      { selector: '[data-tour="page-content"] .cursor-pointer', title: "Open a notification", description: "Select a notification to mark it as read and, when a destination is provided, open the related workspace page." },
      { text: "Mark all as read", exactText: true, title: "Mark all as read", description: "Clears the unread state from every notification currently associated with your account." },
    ],
    matches: exact("/notifications"),
  },
  {
    id: "basic-organization",
    version: 1,
    title: "Organization management",
    description: "Manage the people in this workspace, invite a new member, and review roles and account access.",
    formDescription: "Use member forms to enter valid details and assign only the access the person needs.",
    recordsDescription: "Use the member and department views to review roles, status, and available management actions.",
    steps: [
      { text: "PLATFORM USERS", exactText: true, title: "Platform users", description: "Shows workspace members, invitations, roles, access state, and member actions. Selecting it returns to the user list." },
      { text: "DEPARTMENTS", title: "Departments", description: "Opens department structure and manager assignments when the workspace plan and your permissions allow department management." },
      { text: "Add User", exactText: true, title: "Add a workspace member", description: "Opens the invitation form. On the Basic plan, this creates the permitted additional Super Admin and the plan limit is enforced here." },
      { selector: 'input[placeholder="Search platform users..."]', title: "Search members", description: "Filters workspace members by their visible identity while the status and role filters narrow the results further." },
      { text: "View Details", exactText: true, title: "View member details", description: "The eye action opens the selected member’s identity, role, departments, status, and other workspace information." },
      { selector: '[data-tour="page-content"] table input[type="checkbox"]', title: "Member access switch", description: "Turns a member’s workspace access on or off. Protected accounts and actions outside your permission remain locked." },
    ],
    matches: exact("/company-settings/organization-management"),
  },
  {
    id: "basic-access-grants",
    version: 1,
    title: "Access grants",
    description: "Review and manage the modules and permissions available to workspace members.",
    recordsDescription: "Select a member or role, review the current access, and save only the permissions they require.",
    steps: [
      { text: "Active", exactText: true, title: "Filter member access", description: "Switches the list between all, active, and disabled workspace members." },
      { selector: 'input[placeholder="Search by name, email, or dept..."]', title: "Search access records", description: "Finds a workspace member using their name, email address, or department." },
      { selector: 'button[title="Manage Sidebar Access"]', title: "Manage sidebar access", description: "Opens the module-access dialog for that member. Checked modules appear in their sidebar; removing a module hides and blocks it according to the access contract." },
      { selector: 'button[title="Manage Role"], button[title="View Role"]', title: "Manage role", description: "Opens role details. Authorized founders can promote or demote the member and review role-specific access." },
      { text: "Transfer Founder", exactText: true, title: "Transfer founder ownership", description: "Starts the protected ownership-transfer flow. This changes who controls the workspace, so confirmation is required before it is applied." },
    ],
    matches: exact("/company-settings/access-grants"),
  },
  {
    id: "basic-customer-support",
    version: 1,
    title: "Customer support",
    description: "Raise a support request, review previous conversations, and track the status of issues reported to WoNo.",
    formDescription: "Describe the issue clearly and attach useful evidence before submitting a support request.",
    recordsDescription: "The request list shows the progress and history of support issues raised by your workspace.",
    steps: [
      { text: "Issues Raised", exactText: true, title: "Open support issues", description: "Shows issues that are still being handled. Status filters help separate newly raised, accepted, and in-progress requests." },
      { text: "Issue Resolved", exactText: true, title: "Resolved issues", description: "Shows completed support history. Use this tab when you need to review how a previous issue was resolved." },
      { text: "RAISE ISSUE TO WONO TEAM", title: "Raise an issue", description: "Opens the support form for the issue title, detailed description, affected page, and supporting attachments." },
      { selector: 'button[aria-label^="View details for"]', title: "View issue details", description: "Opens the complete request, status history, attachments, and available follow-up actions for that support issue." },
    ],
    matches: exact("/company-settings/customer-support"),
  },
  {
    id: "basic-wono-nomad",
    version: 1,
    title: "WoNo Nomads",
    description: "Manage how your workspace is presented to the WoNo Nomads audience and open your listing tools.",
    steps: [
      { text: "Nomad Listings", exactText: true, title: "Nomad listings", description: "Opens your public workspace listings. From there you can add a listing, edit its details, and check the Basic-plan listing limit." },
      { text: "Reviews", exactText: true, title: "Nomad reviews", description: "Opens reviews connected to the Nomads presence so you can inspect the feedback associated with the workspace." },
    ],
    matches: exact("/company-settings/wono-nomad"),
  },
  {
    id: "basic-visitor-add",
    version: 1,
    title: "Add a visitor",
    description: "Register an expected visitor or client so the workspace team has the correct arrival information.",
    formDescription: "Enter the visitor, host, date, and visit details, then review them before submitting.",
    steps: [
      { selector: '[data-tour="page-content"] form', title: "Visitor information", description: "Enter the visitor’s identity, contact information, host, purpose, and expected check-in details. Validation appears beside invalid required fields." },
      { selector: '[data-tour="page-content"] button[type="submit"]', title: "Save the visitor", description: "Validates the visible form and adds the visitor record. A success message confirms when the record has been created." },
      { text: "Reset", exactText: true, title: "Reset visitor details", description: "Clears the current form values so a different visitor can be entered." },
    ],
    matches: (path) => /^\/visitors\/(add-visitor|add-client)\/?$/.test(path),
  },
  {
    id: "basic-visitor-records",
    version: 1,
    title: "Visitor records",
    description: "Review internal visitors or external clients and use the available row actions to inspect their records.",
    recordsDescription: "Search, filter, and open a row when you need the complete visitor or client information.",
    steps: [
      { selector: '[data-tour="page-content"] table', title: "Visitor records", description: "Review visitor identity, contact, purpose, check-in, and checkout information in the records table." },
      { selector: '[data-tour="page-content"] table button', title: "Open a visitor record", description: "The row action opens the complete visitor information. Where permitted, you can update checkout or related record details." },
      { text: "Save", exactText: true, title: "Save record changes", description: "Applies edits made in the visitor detail view and confirms when the record has been updated." },
    ],
    matches: startsWith("/visitors/manage-visitors"),
  },
  {
    id: "basic-visitor-team",
    version: 1,
    title: "Visitor team members",
    description: "Review the team members responsible for reception and visitor-management activity.",
    recordsDescription: "This list shows the people who can work with visitor records and their current details.",
    steps: [
      { selector: '[data-tour="page-content"] table', title: "Visitor-management team", description: "Shows the members available to the visitor workflow and the details used to identify them." },
      { selector: '[data-tour="page-content"] input', title: "Find a team member", description: "Use the available search or filtering field to narrow the team-member list." },
    ],
    matches: exact("/visitors/team-members"),
  },
  {
    id: "basic-visitor-reports",
    version: 1,
    title: "Visitor reports",
    description: "Use visitor reports to understand visit activity and export the information when required.",
    recordsDescription: "Apply the available filters before reviewing or exporting visitor activity.",
    steps: [
      { selector: '[data-tour="page-content"] table', title: "Visitor report records", description: "Shows the visitor activity included in the report, such as visitor, host, purpose, and check-in or checkout information." },
      { selector: '[data-tour="page-content"] input', title: "Filter report data", description: "Use the visible search and date controls to narrow the report before reviewing or exporting it." },
      { selector: '[data-tour="page-content"] table button', title: "View report details", description: "Opens the complete visitor record behind the selected report row." },
    ],
    matches: exact("/visitors/reports"),
  },
  {
    id: "basic-visitor-reviews",
    version: 1,
    title: "Visitor reviews",
    description: "Review feedback associated with the visitor experience and inspect individual submissions.",
    recordsDescription: "Use this list to search, filter, and inspect visitor feedback.",
    steps: [
      { selector: '[data-tour="page-content"] table', title: "Visitor feedback", description: "Shows submitted visitor reviews and the information available for each feedback record." },
      { selector: '[data-tour="page-content"] table button', title: "Open review details", description: "Opens the selected review so you can read the complete feedback and related visitor information." },
      { text: "Submit", exactText: true, title: "Submit a review", description: "Validates and saves the visitor feedback entered in the review form." },
    ],
    matches: exact("/visitors/reviews"),
  },
  {
    id: "basic-visitor-settings",
    version: 1,
    title: "Visitor settings",
    description: "Configure visitor-management data and use bulk upload when many records need to be added together.",
    formDescription: "Review the selected settings or upload file carefully before saving changes.",
    steps: [
      { selector: '[data-tour="page-content"] form', title: "Visitor settings form", description: "Update the visible visitor-management settings or select the bulk-upload file required by this page." },
      { selector: '[data-tour="page-content"] button[type="submit"]', title: "Apply visitor settings", description: "Validates the selected settings or upload and submits the changes to the workspace." },
    ],
    matches: startsWith("/visitors/settings"),
  },
  {
    id: "basic-visitor-management",
    version: 1,
    title: "Visitor management",
    description: "Register visitors, monitor expected arrivals, and open the records and reports needed by reception.",
    recordsDescription: "The visitor overview shows current activity and provides actions for managing each visit.",
    steps: [
      { text: "DAILY VISITORS", title: "Daily visitors", description: "Shows today’s visitor workflow. The count identifies active tracked visitors, and the status subtabs separate pending, approved, checked-in, checked-out, and rejected records." },
      { text: "VISITOR HISTORY", exactText: true, title: "Visitor history", description: "Switches to older visitor activity. Month and year selectors appear here so past records can be reviewed." },
      { text: "BOOKINGS", exactText: true, title: "Bookings", description: "Shows walk-in meeting-room bookings with upcoming, in-progress, completed, and cancelled states when this tab is available." },
      { text: "CLIENTS", exactText: true, title: "Clients", description: "Shows walk-in clients and visitors converted into reusable client records for future bookings." },
      { selector: 'input[placeholder="Search records..."]', title: "Search current records", description: "Searches only the records in the currently selected visitor tab and status view." },
      { text: "NEW FRONTDESK ACTION", title: "Start a frontdesk action", description: "Opens the frontdesk flow. Choose the appropriate action to register a standard visitor, process a tour, or create a walk-in booking; permissions control which options are available." },
      { selector: '[data-tour="page-content"] table', title: "Record actions", description: "Use row actions to inspect records and, when allowed by status and permission, approve, check in, print a badge, check out, reschedule, extend, or cancel." },
    ],
    matches: (path) => /^\/visitors(?:\/(visitor-management|dashboard))?$/.test(path),
  },
  {
    id: "basic-dashboard",
    version: 1,
    title: "Basic dashboard",
    description: "Use this overview to understand your workspace, open quick actions, and move into the Basic-plan modules available to you.",
    recordsDescription: "Dashboard sections summarize recent workspace activity and provide shortcuts to the related pages.",
    steps: [
      { selector: '[data-tour="sidebar"]', title: "Your workspace navigation", description: "Use the sidebar to move between the Basic-plan modules available to your role. Page tours will not repeat this navigation explanation." },
      { selector: '[data-tour="breadcrumb"]', title: "Your current location", description: "The breadcrumb shows where you are inside the workspace so you can keep track of the current module and page." },
      { selector: '[data-tour="workspace-switcher"]', title: "Switch workspaces", description: "If you belong to more than one workspace, switch here. Tour completion is remembered separately for every member in each workspace." },
      { selector: '[data-notification-trigger]', title: "Workspace notifications", description: "Open notifications to see new activity and updates that may need your attention." },
      { selector: '[data-tour="dashboard-plan"]', title: "Your Basic plan", description: "This banner confirms the active plan. Selecting it opens the upgrade options where Professional features such as meeting rooms, tickets, and Sales modules can be reviewed." },
      { selector: '[data-tour="dashboard-overview"]', title: "Overview and direct shortcuts", description: "These cards combine live totals with navigation. Visitors Today and All-Time Visitors open Visitor Management, Website Leads opens website enquiries, and Active Members opens Organization Management." },
      { selector: '[data-tour="dashboard-quick-links"]', title: "Quick Links to common pages", description: "Select a shortcut to open Nomad Listings, Website Builder, Website Leads, Visitor Management, Organization, or Access Grants directly." },
      { selector: '[data-tour="dashboard-recent-leads"]', title: "Recent Leads", description: "This list shows the newest website enquiries and their current stage. View all opens the complete Website Leads page for search, filtering, details, and follow-up actions." },
      { selector: '[data-tour="dashboard-lead-status"]', title: "Lead Status", description: "This chart summarizes how many leads are new and how many have been contacted, helping you see the current follow-up workload at a glance." },
      { selector: '[data-tour="dashboard-recent-visitors"]', title: "Recent Visitors", description: "This list shows the latest visitor activity and check-in state. View all opens Visitor Management where the complete visitor workflow is available." },
      { selector: '[data-tour="dashboard-visitor-types"]', title: "Visitor Types", description: "This chart groups recorded visitors by type so you can quickly understand who is using the workspace." },
      { selector: '[data-tour="dashboard-visitor-trend"]', title: "Monthly Visitor Trend", description: "This financial-year chart compares monthly visitor volume and helps reveal changes in workspace activity over time." },
    ],
    matches: exact("/dashboard"),
  },
  {
    id: "basic-add-modules",
    version: 1,
    title: "Add modules",
    description: "Review modules enabled for this workspace and discover features available through a plan upgrade.",
    steps: [
      { selector: '[data-tour="page-content"] button', title: "Expand a module group", description: "Select a group heading to show its enabled and locked modules. The counts summarize what the current workspace can use." },
      { text: "Enabled", exactText: true, title: "Enabled modules", description: "Modules in this section are already available. Selecting an enabled module opens its page." },
      { text: "Locked", exactText: true, title: "Locked modules", description: "Locked modules are outside the current Basic plan or workspace grant. Selecting an upgrade-eligible module opens the plan options." },
      { text: "Upgrade Plan", title: "Upgrade request", description: "Choose the required plan and submit the request. The request is sent for review; it does not immediately change workspace access." },
    ],
    matches: exact("/add-modules"),
  },
  {
    id: "basic-module-landing",
    version: 1,
    title: "Workspace modules",
    description: "Open the module or department function you need from the cards available to your Basic-plan role.",
    steps: [
      { selector: '[data-tour="page-content"] button, [data-tour="page-content"] a', title: "Open a module card", description: "Selecting an enabled card opens that module. Locked cards explain whether the restriction comes from the plan or your role access." },
      { text: "Add Modules", exactText: true, title: "Explore additional modules", description: "Opens the complete module catalog so enabled features can be reviewed and upgrade-only features can be compared." },
    ],
    matches: (path) => path === "/key-apps" || path.startsWith("/module-sections/"),
  },
  {
    id: "basic-company-settings",
    version: 1,
    title: "Company settings",
    description: "This is the home for your Basic-plan company tools. Open a module card to manage that part of the workspace.",
    steps: [
      { text: "Website Builder", exactText: true, title: "Website Builder", description: "Opens website creation and its connected leads, review, and careers functionality." },
      { text: "Wono Nomads", exactText: true, title: "WoNo Nomads", description: "Opens Nomads listings and reviews used to manage the workspace’s public marketplace presence." },
      { text: "Organization Management", exactText: true, title: "Organization Management", description: "Opens workspace member invitations, access state, roles, and Basic-plan user limits." },
      { text: "Access Grants", exactText: true, title: "Access Grants", description: "Opens member role and module-access controls for authorized workspace administrators." },
      { text: "Customer Support", exactText: true, title: "Customer Support", description: "Opens the support workspace where issues can be raised, tracked, viewed, and exported." },
    ],
    matches: exact("/company-settings"),
  },
];

const titleFromPath = (pathname: string) => {
  const pathParts = pathname.split("/").filter(Boolean);
  const part = pathParts[pathParts.length - 1] || "page";
  return part
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const getBasicPageTour = (pathname: string): BasicPageTour | null => {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const match = BASIC_PAGE_TOURS.find((tour) => tour.matches(normalizedPath));
  if (match) {
    const { matches: _matches, ...tour } = match;
    return { ...tour, version: BASIC_TOUR_VERSION };
  }

  // Basic-plan workspace members can still reach shared pages such as Profile,
  // Notifications, and module landing pages. Give every authenticated shell
  // page a stable fallback tour so the Guide button is never missing.
  const stablePath = normalizedPath
    .split("/")
    .map((segment) =>
      /^[a-f0-9]{24}$/i.test(segment) || /^\d+$/.test(segment) ? "detail" : segment,
    )
    .join("/");
  const routeKey = stablePath
    .replace(/^\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 80);

  return {
    id: `basic-page-${routeKey || "overview"}`,
    version: BASIC_TOUR_VERSION,
    title: titleFromPath(normalizedPath),
    description: "Use this page to review the available information and complete the actions provided for this Basic-plan feature.",
    formDescription: "Complete the visible fields carefully and review the information before saving.",
    recordsDescription: "Use the available search, filters, and row actions to work with these records.",
  };
};
