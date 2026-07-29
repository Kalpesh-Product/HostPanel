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
  // Popover placement relative to the highlighted element. Defaults to "bottom"/"start".
  // Override to "top" for elements that sit at the very bottom of a page, where a
  // bottom-side popover would have no room and render off-screen.
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

interface TourRoute extends BasicPageTour {
  matches: (pathname: string) => boolean;
}

const BASIC_TOUR_VERSION = 6;

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
    id: "basic-wono-nomad",
    version: 1,
    title: "Nomads Listings",
    description: "Your hub for managing co-working and co-living presence across the Nomads network. Each card opens a different area — listings, reviews, or leads.",
    steps: [
      { selector: '[data-tour="wono-nomad-listings"]', title: "Listings", description: "View and manage your co-working and co-living space listings. Create new listings, edit existing ones, and track their active or inactive status across the Nomads network." },
      { selector: '[data-tour="wono-nomad-reviews"]', title: "Reviews", description: "See customer reviews submitted through your Nomads listings. Monitor feedback, check ratings, and follow up with guests who left reviews." },
      { selector: '[data-tour="wono-nomad-leads"]', title: "Leads", description: "Track enquiries and interest from Nomads visitors. Review lead details, contact information, and follow up to convert them into bookings or partnerships." },
    ],
    matches: (path) => /^\/(company-settings|dashboard)\/wono-nomad\/?$/.test(path),
  },
  {
    id: "basic-nomad-listings",
    version: 1,
    title: "Listings",
    description: "Manage your co-working and co-living space listings across Nomads Listings. Create listings, track their status, and keep your workspace presence up to date.",
    recordsDescription: "Each listing shows your workspace name, type, city, publication status, and creation date.",
    steps: [
      { selector: '[data-tour="nomad-summary"]', title: "Listing counts at a glance", description: "These four cards show Total Listings, Active (live on Nomads), Inactive (hidden or paused), and Listings Left (how many more you can create under your plan limit)." },
      { selector: '[data-tour="nomad-status-filter"]', title: "Filter by status", description: "Switch between All, Active, or Inactive listings. Active listings are live and visible to Nomads visitors. Inactive listings are hidden but preserved." },
      { selector: '[data-tour="nomad-search"]', title: "Search listings", description: "Find a listing by company name, workspace type, or city. Results update as you type." },
      { selector: '[data-tour="nomad-add-listing"]', title: "Add a new listing", description: "Opens the listing form where you enter workspace details — name, type, location, amenities, images, and contact info. If you've reached your plan limit, this button will be disabled." },
      { selector: '[data-tour="nomad-table"]', title: "Listing records and actions", description: "Each row shows your listing's name, type, city, active/inactive status, and creation date. Click the pencil icon to edit any listing." },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/nomad-listings\/?$/.test(path),
  },
  {
    id: "basic-website-builder-editor",
    version: 2,
    title: "Website editor",
    description: "Build and update your website. Each tab controls a different page. Your work is autosaved as a draft while you build.",
    steps: [
      { selector: '[data-tour="wb-editor-header"]', title: "Editor header", description: "The heading shows whether you are creating a new website or editing an existing one. The badge on the right confirms the active editor mode." },
      { selector: '[data-tour="wb-editor-draft-status"]', title: "Draft autosave", description: "Your progress is automatically saved as a draft while you work. If you leave and return later, your previous work is restored so you can continue where you left off." },
      { selector: '[data-tour="wb-editor-page-tabs"]', title: "Website page tabs", description: "Each tab represents a page on your website. Click a tab to edit that page's content. The Home tab is always first. Other tabs like About Us, Products, Gallery, Testimonials, Contact, Partner, and Careers can be enabled or disabled from here." },
      { selector: '[data-tour="wb-editor-home-content"]', title: "Home page sections", description: "The Home tab contains all the sections visitors see on your main page: Hero banner, About, Products showcase, Gallery, Testimonials, Contact, and Footer. Each section has its own toggle to show or hide it." },
      { selector: '[data-tour="wb-editor-hero-section"]', title: "Hero section", description: "The Hero section is the first thing visitors see. Set your company name, tagline, CTA button text, logo, and hero images here. Upload multiple images for a carousel or one image for a static banner." },
      { selector: '[data-tour="wb-editor-credits"]', title: "Credit balance", description: "Shows how many publish credits you have remaining. The first publish is free. Each subsequent update uses one credit from your monthly balance." },
      { selector: '[data-tour="wb-editor-preview"]', title: "Preview your website", description: "Opens a live preview of your website so you can check the layout, content, and images before making changes public. Always preview before publishing.", side: "top" },
      { selector: '[data-tour="wb-editor-reset"]', title: "Reset the form", description: "Clears everything you have entered and starts fresh. This cannot be undone. Use it only when you want to rebuild the entire website from scratch.", side: "top" },
      { selector: '[data-tour="wb-editor-publish"]', title: "Publish or submit", description: "When you are satisfied with your website, click this button to publish it live. A confirmation dialog will appear to prevent accidental publishes. After publishing, your website is live at its public URL.", side: "top" },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/website-builder\/(dynamic\/create-website|edit-website)(\/|$)/.test(path),
  },
  {
    id: "basic-website-theme",
    version: 2,
    title: "Website themes",
    description: "Browse available designs, preview a theme in detail, and select the one you want for your website.",
    steps: [
      { selector: '[data-tour="page-content"] h1, [data-tour="page-content"] h2', title: "Theme browser", description: "Scroll through the available website themes. Each theme is designed for a specific business type like co-working, co-living, cafe, or hostel. Your workspace vertical is highlighted by default." },
      { selector: '[data-tour="page-content"] input', title: "Filter themes", description: "Use the search or category controls to narrow the theme choices for your business type. Only themes matching your workspace category will appear." },
      { text: "Preview", title: "Preview a theme", description: "Opens the selected design so you can inspect its full pages and layout before committing. Check the hero, about, products, and contact sections." },
      { text: "Select", title: "Select the theme", description: "Confirms this design as the starting point for your website and moves you to the content editor where you can customize every section." },
      { text: "Load More", title: "Load more themes", description: "Displays the next group of available themes without losing the ones already shown. Keep browsing until you find the right design." },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/website-builder\/(select-theme|view-theme|live-demo)\/?/.test(path),
  },
  {
    id: "basic-website-leads",
    version: 2,
    title: "Website leads",
    description: "Review enquiries submitted through your live website and follow up with potential customers.",
    steps: [
      { selector: '[data-tour="page-content"] h2, [data-tour="page-content"] h1', title: "Leads dashboard", description: "This page collects every enquiry submitted through your website contact forms. Each lead includes the visitor name, email, phone, message, and the date it was received." },
      { text: "Pending", exactText: true, title: "Filter by lead stage", description: "The stage buttons filter the table to show only leads in that workflow state. Use Pending for new enquiries, Rejected for spam or irrelevant ones, Closed for followed-up leads, and All to see everything." },
      { selector: 'input[placeholder="Search by name, email, phone..."]', title: "Search leads", description: "Find a specific lead by typing the visitor name, email address, or phone number. Results update as you type." },
      { selector: 'button[aria-label^="View details for"]', title: "Open lead details", description: "The eye button opens the full enquiry in a detail panel. From there you can read the complete message and update the lead status to Rejected or Closed after following up." },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/website-builder\/(dynamic\/)?leads\/?$/.test(path),
  },
  {
    id: "basic-website-reviews",
    version: 2,
    title: "Website reviews",
    description: "Moderate customer feedback submitted through your website and control which reviews are displayed publicly.",
    steps: [
      { selector: '[data-tour="page-content"] h2, [data-tour="page-content"] h1', title: "Review moderation", description: "This page shows all customer reviews submitted through your website. Your job is to approve genuine reviews so they appear publicly, and reject spam or inappropriate ones." },
      { text: "Pending", exactText: true, title: "Filter review status", description: "Switch between Pending (awaiting your decision), Approved (live on your website), and Rejected (hidden from visitors). Use All to see every review regardless of status." },
      { selector: 'input[placeholder="Search by name, source, description..."]', title: "Search reviews", description: "Find a specific review by the reviewer name, review source, or the submitted description text." },
      { selector: '[data-tour="page-content"] table', title: "Review list", description: "The table shows each review with its moderation status and whether an approved review is currently enabled for public display on your website." },
      { selector: '[data-tour="page-content"] table tbody button', title: "Review details and actions", description: "The eye button opens the full review. Pending reviews can be approved or rejected. Approved reviews can also be toggled on or off for public display, giving you full control over what visitors see." },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/website-builder\/dynamic\/reviews\/?$/.test(path),
  },
  {
    id: "basic-website-careers",
    version: 2,
    title: "Website careers",
    description: "Manage job openings shown on your website careers page and control their publishing status.",
    steps: [
      { selector: '[data-tour="page-content"] h2, [data-tour="page-content"] h1', title: "Careers management", description: "This page manages the job openings that appear on your website careers page. Create openings, set their details, and publish them to make them visible to job seekers." },
      { text: "JOB OPENINGS", exactText: true, title: "Job openings list", description: "Shows all roles managed for your hosted careers page, including their vacancy count and current publishing status. Each opening can be viewed, edited, published, or closed." },
      { selector: 'input[placeholder="Search by title, department..."]', title: "Search openings", description: "Find a specific job opening by its role title or department name." },
      { text: "PUBLISH JOB", title: "Publish a job opening", description: "Opens the complete job form where you fill in the role title, department, description, and vacancies. Toggle Publish to Website to make the finished opening appear on your live careers page." },
      { text: "Edit", exactText: true, title: "Edit an opening", description: "Loads the selected job into the form so you can update its role details, vacancies, description, and website publishing status." },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/website-builder\/dynamic\/careers\/?$/.test(path),
  },
  {
    id: "basic-website-builder",
    version: 2,
    title: "Website Builder",
    description: "Create your hosted website, manage its leads and reviews, and set up career openings from one place.",
    steps: [
      { selector: '[data-tour="page-content"] h2', title: "Website Builder hub", description: "This is your website management dashboard. From here you can create or edit your website, track enquiries from visitors, moderate customer reviews, and manage job openings for your careers page." },
      { selector: '[data-tour="wb-create-edit"]', title: "Create or edit your website", description: "If you have not created a website yet, this card starts the setup wizard where you choose your design, add content, and publish. If a website already exists, the same card opens the editor so you can update any page, image, or setting." },
      { selector: '[data-tour="wb-leads"]', title: "Website Leads", description: "Every time someone submits a contact form or enquiry on your live website, it appears here. You can see the lead name, email, phone, and message, then follow up directly. Filter by Pending, Rejected, or Closed to stay organized." },
      { selector: '[data-tour="wb-reviews"]', title: "Website Reviews", description: "Customer reviews submitted through your website appear here. Approve good reviews to display them publicly on your site, or reject inappropriate ones. You control what visitors see." },
      { selector: '[data-tour="wb-careers"]', title: "Careers", description: "Create and publish job openings that appear on your website careers page. Add role title, department, description, and vacancies, then publish to make them live. This card is locked until your website is created for the first time." },
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
    description: "Manage the two people available on the Basic plan: the workspace Founder and one additional Super Admin.",
    formDescription: "Invite the one permitted Super Admin using a valid name and email address. Department management and other member roles are not included in Basic.",
    recordsDescription: "Review the Founder and Super Admin, their invitation or account status, and whether workspace access is enabled.",
    steps: [
      { selector: '[data-tour="organization-users-tab"]', title: "Platform users only", description: "Basic workspaces use this single member view. Department creation and department management are not part of the Basic plan." },
      { selector: '[data-tour="organization-basic-user-limit"]', title: "Your two-user limit", description: "The Founder is the first user. Basic permits one additional Super Admin, so the workspace can contain two users in total. This counter shows whether that additional place has been used." },
      { selector: '[data-tour="organization-add-user"]', title: "Invite the Super Admin", description: "Select Add User to enter the additional user’s name and email. Their role is fixed to Super Admin on Basic. After that one invitation or member exists, this button is disabled because the plan limit has been reached." },
      { selector: '[data-tour="organization-status-filters"]', title: "Follow invitation and account status", description: "Switch between all, invited, registered, pending, joined, and disabled users to see where the additional user is in the onboarding process." },
      { selector: '[data-tour="organization-search"]', title: "Find a platform user", description: "Search the visible member list. The nearby role filter can narrow the list, although Basic normally contains only the Founder and Super Admin." },
      { selector: '[data-tour="organization-members-table"]', title: "Manage member access", description: "Each row shows identity, role, status, access, and the View Details action. The access switch enables or disables the Super Admin’s workspace login; protected Founder and self-access controls remain locked." },
    ],
    matches: exact("/company-settings/organization-management"),
  },
  {
    id: "basic-access-grants",
    version: 1,
    title: "Access grants",
    description: "Review the Basic modules available to the Founder and the one additional Super Admin, then control the Super Admin’s sidebar access.",
    recordsDescription: "The list shows the Basic workspace users, their role and account state, plus the access actions available for each account.",
    steps: [
      { selector: '[data-tour="access-grants-summary"]', title: "Basic member overview", description: "These cards summarize the workspace users by role. A Basic workspace normally has one Founder and up to one Super Admin; Admin, Manager, and Employee roles are not added on this plan." },
      { selector: '[data-tour="access-grants-status-filters"]', title: "Filter by access state", description: "All shows every workspace user. Active shows users who can enter the workspace, while Disabled shows accounts whose workspace access has been turned off." },
      { selector: '[data-tour="access-grants-search"]', title: "Find a user", description: "Search by name or email to locate the Founder or Super Admin. Department text is also searchable on plans that include departments." },
      { selector: '[data-tour="access-grants-role-filter"]', title: "Filter by role", description: "Use the role filter to focus on the Founder or Super Admin. The other role choices apply to higher plans and will normally have no Basic users." },
      { selector: '[data-tour="access-grants-table"]', title: "Review granted access", description: "The table shows each user’s identity, current role, department scope, status, and available actions. The Founder row is protected; management actions appear for the additional Super Admin." },
      { selector: '[data-tour="access-grants-actions"]', title: "Understand the action buttons", description: "For the Super Admin, the shield button opens Sidebar Access so you can enable or remove only modules available to Basic, then save the selection. The user-and-cog button opens role and ownership details. Buttons stay disabled or hidden when your account is not authorized." },
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
      { selector: '[data-tour="dashboard-quick-links"]', title: "Quick Links to common pages", description: "Select a shortcut to open Listings, Website Builder, Website Leads, Visitor Management, Organization, or Access Grants directly." },
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
      { text: "Nomads Listings", exactText: true, title: "Nomads Listings", description: "Opens Nomads listings and reviews used to manage the workspace’s public marketplace presence." },
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
