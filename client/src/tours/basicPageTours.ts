export interface BasicPageTour {
  id: string;
  version: number;
  title: string;
  description: string;
  formDescription?: string;
  recordsDescription?: string;
  // When false the tour never starts automatically once its page loads;
  // it only runs from the Guide button. Defaults to true when omitted.
  autoStart?: boolean;
  // When true the walkthrough ends on a step that highlights the page's
  // Guide button so users learn they can replay the tour from there.
  replayHint?: boolean;
  steps?: BasicPageTourStep[];
}

export interface BasicPageTourStep {
  title: string;
  description: string;
  editorPage?: string;
  // Tab-aware pages (e.g. Attendance): only show this step while the page's
  // element carrying data-active-tab reports this value, so replaying the
  // guide from a specific tab walks through that tab's own controls.
  tabPage?: string;
  selector?: string;
  text?: string;
  exactText?: boolean;
  // When true the step needs no highlighted element and its popover renders
  // centered on screen. Use for pure explanations, e.g. a form that only
  // exists inside a modal the tour cannot open.
  textOnly?: boolean;
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
const nomadListingAction = (action: "add" | "edit" | "view") => (pathname: string) => {
  const routeSuffix = "/nomad-listings/" + action;
  return pathname === "/company-settings" + routeSuffix || pathname === "/dashboard" + routeSuffix;
};

const BASIC_PAGE_TOURS: TourRoute[] = [
  {
    id: "basic-nomad-listing-add",
    version: 2,
    title: "Add a Nomads listing",
    description: "Create a complete listing for one workspace location. This guide walks through the details visitors will see and the checks applied before submission.",
    steps: [
      { selector: '[data-tour="nomad-listing-identity"]', title: "Name this listing", description: "Enter the public-facing title for this workspace. You can leave it blank to use your registered company name automatically." },
      { selector: '[data-tour="nomad-listing-company-type"]', title: "Choose the product type", description: "Select Coworking, Meeting Room, Cafe, Workation, Coliving, or Hostel. Your plan limits how many different product types and total listings you can publish." },
      { selector: '[data-tour="nomad-listing-inclusions"]', title: "Select the inclusions", description: "Choose the amenities and facilities available at this location. The options change with the selected product type, so confirm the type first." },
      { selector: '[data-tour="nomad-listing-address"]', title: "Explain the workspace", description: "Enter the visitor-facing street address and use About to describe the workspace, experience, and important selling points." },
      { selector: '[data-tour="nomad-listing-country"]', title: "Set this listing's location", description: "Select Country first, then State and City. The location belongs to this individual listing and can differ from your registered company address." },
      { selector: '[data-tour="nomad-listing-map"]', title: "Pin the location", description: "Paste a valid Google Maps URL. If coordinates are present in the URL, Latitude and Longitude are filled automatically; otherwise they can be entered manually." },
      { selector: '[data-tour="nomad-listing-images"]', title: "Add listing media", description: "Upload up to 10 clear workspace images. You can also provide one optional logo; without one, HostPanel uses the company profile logo." },
      { selector: '[data-tour="nomad-listing-reviews"]', title: "Add optional reviews", description: "Each review can include a reviewer name, 1-5 rating, and review text. Add more review blocks as needed or remove ones that should not be submitted." },
      { selector: '[data-tour="nomad-listing-submit"]', title: "Submit the new listing", description: "Submit validates the form and creates the listing. The button stays disabled while the request is running to prevent duplicate listings." },
      { selector: '[data-tour="nomad-listing-reset"]', title: "Reset or leave", description: "Reset clears the form after confirmation. Cancel returns to Listings without creating this listing." },
    ],
    matches: nomadListingAction("add"),
  },
  {
    id: "basic-nomad-listing-edit",
    version: 2,
    title: "Edit a Nomads listing",
    description: "Review the saved listing and update exactly what Nomads visitors should see for this workspace location.",
    steps: [
      { selector: '[data-tour="nomad-listing-identity"]', title: "Check the listing title", description: "Review the public-facing title saved for this workspace and update it when visitors should see a different name." },
      { selector: '[data-tour="nomad-listing-company-type"]', title: "Confirm the product type", description: "Changing the type also changes which inclusions are available. A new type can only be selected when your plan still has product-type capacity." },
      { selector: '[data-tour="nomad-listing-inclusions"]', title: "Update inclusions", description: "Keep only the amenities and facilities that are currently available at this location. Options are tied to the selected product type." },
      { selector: '[data-tour="nomad-listing-address"]', title: "Update address and description", description: "Correct the visitor-facing address and revise About whenever the workspace offering or important details change." },
      { selector: '[data-tour="nomad-listing-country"]', title: "Update the listing location", description: "Country, State, and City belong to this listing. Changing Country clears State and City; changing State clears City so the combination remains valid." },
      { selector: '[data-tour="nomad-listing-map"]', title: "Check the map pin", description: "Use the current Google Maps URL or paste a replacement. Coordinates are extracted when possible and can also be corrected manually." },
      { selector: '[data-tour="nomad-listing-images"]', title: "Review and add media", description: "Existing listing images appear first. Upload new images only when needed, and optionally replace the current logo; leaving logo upload empty preserves the existing logo." },
      { selector: '[data-tour="nomad-listing-reviews"]', title: "Maintain reviews", description: "Correct existing review details, remove outdated review blocks, or add another reviewer name, rating, and review." },
      { selector: '[data-tour="nomad-listing-submit"]', title: "Save the changes", description: "Submit validates the edited values and updates this listing. It is disabled while saving to prevent repeated updates." },
      { selector: '[data-tour="nomad-listing-reset"]', title: "Reset or cancel", description: "Reset clears the editable form after confirmation. Cancel returns to Listings without submitting the current changes." },
    ],
    matches: nomadListingAction("edit"),
  },
  {
    id: "basic-nomad-listing-view",
    version: 2,
    title: "View a Nomads listing",
    description: "Inspect the complete saved listing in read-only mode before deciding whether any information needs to be edited.",
    steps: [
      { selector: '[data-tour="nomad-listing-identity"]', title: "Listing title", description: "This is the public-facing workspace title saved for the listing. The field is locked because View mode is read-only." },
      { selector: '[data-tour="nomad-listing-company-type"]', title: "Product type", description: "Shows whether this listing is Coworking, Meeting Room, Cafe, Workation, Coliving, or Hostel." },
      { selector: '[data-tour="nomad-listing-inclusions"]', title: "Published inclusions", description: "Review the amenities and facilities associated with the saved product type." },
      { selector: '[data-tour="nomad-listing-address"]', title: "Address and description", description: "Check the street address visitors use and the About content that explains the workspace offering." },
      { selector: '[data-tour="nomad-listing-country"]', title: "Saved location", description: "Confirm the Country, State, and City assigned to this individual listing." },
      { selector: '[data-tour="nomad-listing-map"]', title: "Map information", description: "Review the Google Maps URL and its saved Latitude and Longitude values." },
      { selector: '[data-tour="nomad-listing-images"]', title: "Listing media", description: "Review the images currently saved for the listing. The logo shown below is the listing logo or the company profile fallback." },
      { selector: '[data-tour="nomad-listing-reviews"]', title: "Saved reviews", description: "Review the visitor name, rating, and text for every review attached to this listing." },
      { selector: '[data-tour="nomad-listing-back"]', title: "Return to Listings", description: "Select Back when you have finished reviewing this listing. Use the pencil action from the Listings table when changes are required.", side: "top", align: "center" },
    ],
    matches: nomadListingAction("view"),
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
    version: 2,
    title: "Listings",
    description: "Manage your co-working and co-living space listings across Nomads Listings. Create listings, track their status, and keep your workspace presence up to date.",
    recordsDescription: "Each listing shows your workspace name, type, city, publication status, and creation date.",
    steps: [
      { selector: '[data-tour="nomad-summary"]', title: "Listing counts at a glance", description: "These five cards show Total Listings, Active (live on Nomads), Inactive (hidden or paused), Product Types used against your plan, and Listings Left (how many more you can create under your plan limit)." },
      { selector: '[data-tour="nomad-status-filter"]', title: "Filter by status", description: "Switch between All, Active, or Inactive listings. Active listings are live and visible to Nomads visitors. Inactive listings are hidden but preserved." },
      { selector: '[data-tour="nomad-search"]', title: "Search listings", description: "Find a listing by company name, workspace type, or city. Results update as you type." },
      { selector: '[data-tour="nomad-add-listing"]', title: "Add a new listing", description: "Opens the listing form where you enter workspace details — name, type, location, amenities, images, and contact info. If you've reached your plan limit, this button will be disabled." },
      { selector: '[data-tour="nomad-table"]', title: "Listing records and actions", description: "Each row shows your listing's name, type, city, active/inactive status, and creation date. Click the pencil icon to edit any listing." },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/nomad-listings\/?$/.test(path),
  },
  {
    id: "basic-website-builder-editor",
    version: 11,
    title: "Website editor",
    description: "Build and update your website. Each tab controls a different page. Your work is autosaved as a draft while you build.",
    steps: [
      { editorPage: "home", selector: '[data-tour="wb-editor-header"]', title: "Editor header", description: "The heading shows whether you are creating a new website or editing an existing one. The badge on the right confirms the active editor mode." },
      { editorPage: "home", selector: '[data-tour="wb-editor-draft-status"]', title: "Draft autosave", description: "Your progress is automatically saved as a draft while you work. If you leave and return later, your previous work is restored so you can continue where you left off." },
      { editorPage: "home", selector: '[data-tour="wb-editor-page-tabs"]', title: "Website page tabs", description: "Each tab represents a page on your website. Click a tab to edit that page's content. The Home tab is always first. Other tabs like About Us, Products, Gallery, Testimonials, Contact, Partner, and Careers can be enabled or disabled from here." },
      { editorPage: "home", selector: '[data-tour="wb-editor-hero-section"]', title: "Hero section", description: "The Hero section is the first thing visitors see. Set your company name, tagline, CTA button text, logo, and hero images here. Upload multiple images for a carousel or one image for a static banner." },
      { editorPage: "home", selector: '[data-tour="wb-editor-about-section"]', title: "About section", description: "Introduce your business with a section heading and one or more paragraphs. Use the section toggle to control whether this introduction appears on the Home page." },
      { editorPage: "home", selector: '[data-tour="wb-editor-products-section"]', title: "Our Products section", description: "Set the Home-page products heading and presentation cards. Product pages are created in the Products tab; this section controls how those pages are introduced from Home." },
      { editorPage: "home", selector: '[data-tour="wb-editor-inclusions-section"]', title: "Home Inclusions section", description: "Choose the amenities and facilities displayed below Our Products. Enable only the inclusions that visitors should see on the Home page." },
      { editorPage: "home", selector: '[data-tour="wb-editor-faq-section"]', title: "FAQ section", description: "Create the shared questions and answers used by your product pages. Individual FAQ entries can be enabled or disabled, and each product page controls whether the shared FAQ list is shown." },
      { editorPage: "home", selector: '[data-tour="wb-editor-offerings-section"]', title: "Business offerings", description: "Manage the offering specific to your website type, such as rooms, meeting rooms, packages, dorms, or menu items. Add the details, images, pricing, and enabled state visitors should see." },
      { editorPage: "home", selector: '[data-tour="wb-editor-gallery-section"]', title: "Gallery section", description: "Set the Gallery heading and upload the images that showcase your workspace, property, products, or experience. The section toggle controls whether it appears on Home." },
      { editorPage: "home", selector: '[data-tour="wb-editor-testimonials-section"]', title: "Testimonials section", description: "Add customer names, ratings, and testimonial text to build trust on the Home page. Remove outdated entries and disable the section when it should not be shown." },
      { editorPage: "home", selector: '[data-tour="wb-editor-trusted-by-section"]', title: "Trusted By section", description: "Add the heading and partner or customer logos shown before Contact and Footer. Use transparent logo images where possible and enable the section when the logos are ready." },
      { editorPage: "home", selector: '[data-tour="wb-editor-contact-section"]', title: "Contact section", description: "Provide the Home-page contact heading, embedded map URL, email, phone number, and address so visitors know how to reach or locate your business." },
      { editorPage: "home", selector: '[data-tour="wb-editor-footer-section"]', title: "Footer section", description: "Set the registered company name, copyright text, and social links displayed at the bottom of the website. Only enabled social platforms with valid links are shown." },
      { editorPage: "home", selector: '[data-tour="wb-editor-credits"]', title: "Credit balance", description: "Shows how many publish credits you have remaining. The first publish is free. Each subsequent update uses one credit from your monthly balance.", side: "top", align: "center" },
      { editorPage: "home", selector: '[data-tour="wb-editor-preview"]', title: "Preview your website", description: "Opens a live preview of your website so you can check the layout, content, and images before making changes public. Always preview before publishing.", side: "top" },
      { editorPage: "home", selector: '[data-tour="wb-editor-reset"]', title: "Reset the form", description: "Clears everything you have entered and starts fresh. This cannot be undone. Use it only when you want to rebuild the entire website from scratch.", side: "top" },
      { editorPage: "home", selector: '[data-tour="wb-editor-publish"]', title: "Publish or submit", description: "When you are satisfied with your website, click this button to publish it live. A confirmation dialog will appear to prevent accidental publishes. After publishing, your website is live at its public URL.", side: "top" },
      { editorPage: "about-us", selector: '[data-tour="wb-editor-about-page-hero"]', title: "About Us page", description: "Set the heading shown at the top of the About Us page and use the visibility control to show or hide this page on your published website." },
      { editorPage: "about-us", selector: '[data-tour="wb-editor-about-page-shared"]', title: "About text shared with Home", description: "These paragraphs are shared with the Home About section. Updating them here also updates the Home page, so keep the company introduction consistent." },
      { editorPage: "about-us", selector: '[data-tour="wb-editor-about-page-story"]', title: "Our Story", description: "Explain how the business started, what shaped it, and the journey visitors should understand about your company." },
      { editorPage: "about-us", selector: '[data-tour="wb-editor-about-page-mission-vision"]', title: "Mission and Vision", description: "Use Mission to explain what the company does today and Vision to describe the future it is working toward." },
      { editorPage: "about-us", selector: '[data-tour="wb-editor-about-page-values"]', title: "Company values", description: "Enter the values as a comma-separated list. These values communicate the principles that guide the company." },
      { editorPage: "about-us", selector: '[data-tour="wb-editor-about-page-founders"]', title: "Founders section", description: "Add each founder's photo, name, role, biography, and key highlights. The published page alternates founder profiles for a clear story-led layout." },
      { editorPage: "about-us", selector: '[data-tour="wb-editor-about-page-team"]', title: "Our Team section", description: "Set the team heading and add team-member cards with an image, name or title, role, and individual visibility control." },
      { editorPage: "products", selector: '[data-tour="wb-editor-products-page-settings"]', title: "Products page settings", description: "Add a preset product page or create a custom page, then control whether the main Products page appears on the published website." },
      { editorPage: "products", selector: '[data-tour="wb-editor-products-page-tabs"]', title: "Product page tabs", description: "Each tab is an individual product or service page. Select a tab to edit it, or use its remove button when that page is no longer required." },
      { editorPage: "products", selector: '[data-tour="wb-editor-products-page-details"]', title: "Product page identity", description: "Set the page name visitors see and its route slug. The visibility switch controls whether this individual product page is available." },
      { editorPage: "products", selector: '[data-tour="wb-editor-products-page-hero"]', title: "Product page hero", description: "Configure the page heading, supporting text, CTA label, and either one hero image or a carousel of images." },
      { editorPage: "products", selector: '[data-tour="wb-editor-products-page-lead-form"]', title: "Lead form behavior", description: "Choose whether this product page accepts enquiries and set the CTA label that opens its lead form. Menu pages keep this form disabled." },
      { editorPage: "products", selector: '[data-tour="wb-editor-products-page-content"]', title: "Product content", description: "Manage the content matched to this page type, such as rooms, spaces, packages, dorms, menu items, or custom sub-products. Some content is shared with Home." },
      { editorPage: "products", selector: '[data-tour="wb-editor-products-page-faq"]', title: "Shared FAQs", description: "Choose whether the shared FAQ list appears on this product page. Use the shortcut to edit the actual questions and answers in the Home FAQ section." },
      { editorPage: "products", selector: '[data-tour="wb-editor-products-page-inclusions"]', title: "Page inclusions", description: "Enable the inclusions section and choose the individual amenities or facilities that apply to this product page." },
      { editorPage: "gallery", selector: '[data-tour="wb-editor-gallery-page-hero"]', title: "Gallery page heading", description: "Set the heading shown on the Gallery page and use the visibility control to show or hide the page on the published website." },
      { editorPage: "gallery", selector: '[data-tour="wb-editor-gallery-page-images"]', title: "Gallery images", description: "Upload and manage the full gallery. These images are shared with Home, where only the first group is previewed before visitors open the complete Gallery page." },
      { editorPage: "partner", selector: '[data-tour="wb-editor-partner-page-header"]', title: "Partner page", description: "Use the visibility control to decide whether visitors can open the Partner page on the published website." },
      { editorPage: "partner", selector: '[data-tour="wb-editor-partner-page-content"]', title: "Partnership content and form", description: "Set the page heading, the partnership message shown on the left, and the form title shown above the automatic enquiry form on the right." },
      { editorPage: "careers", selector: '[data-tour="wb-editor-careers-page-hero"]', title: "Careers page introduction", description: "Control the page visibility and write the heading and introduction shown above job openings. Posted roles are brought in automatically from Recruitment." },
      { editorPage: "careers", selector: '[data-tour="wb-editor-careers-page-form-layout"]', title: "Application form layout", description: "Review the fixed fields included in every application. Custom fields appear after the CV upload in the order configured below." },
      { editorPage: "careers", selector: '[data-tour="wb-editor-careers-page-custom-fields"]', title: "Additional application fields", description: "Add, rename, reorder, or remove the extra questions applicants must complete. The preview shows their final order and input type." },
      { editorPage: "contact-us", selector: '[data-tour="wb-editor-contact-page-details"]', title: "Contact page details", description: "Control the Contact page visibility and update its shared email, phone, address, and map. Changes here also update the Home contact section." },
      { editorPage: "contact-us", selector: '[data-tour="wb-editor-contact-page-inquiry"]', title: "Contact availability and enquiries", description: "Add optional business hours and choose whether the Contact page displays its enquiry form. Submitted messages are saved as General Inquiry leads." },
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
    version: 7,
    title: "Website leads",
    description: "Review enquiries submitted through your live website and follow up with potential customers.",
    steps: [
      { selector: '[data-tour="wb-leads-header"]', title: "Leads dashboard", description: "This page collects every enquiry submitted through your website contact forms. Each lead includes the visitor name, email, phone, message, and the date it was received." },
      { selector: '[data-tour="wb-leads-status-filter"]', title: "Filter by lead stage", description: "Use All to review every website enquiry, Pending for leads that still need follow-up, or Closed for completed enquiries." },
      { selector: '[data-tour="wb-leads-search"]', title: "Search leads", description: "Find a specific lead using the visible search field. Results update as you type." },
      { selector: '[data-tour="wb-leads-table"]', title: "Website lead records", description: "Review each lead's contact details, source, product, current status, received date, and available action." },
      { selector: '[data-tour="wb-leads-view"]', title: "Open lead details", description: "The eye button opens the full enquiry so you can read the submitted information and close the lead after following up." },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/website-builder\/(dynamic\/)?leads\/?$/.test(path),
  },
  {
    id: "basic-website-reviews",
    version: 7,
    title: "Website reviews",
    description: "Moderate customer feedback submitted through your website and control which reviews are displayed publicly.",
    steps: [
      { selector: '[data-tour="wb-reviews-header"]', title: "Review moderation", description: "This page shows all customer reviews submitted through your website. Approve genuine reviews for public display and reject spam or inappropriate submissions." },
      { selector: '[data-tour="wb-reviews-status-filter"]', title: "Filter review status", description: "Switch between Pending, Approved, and Rejected reviews, or use All to see every review regardless of status." },
      { selector: '[data-tour="wb-reviews-search"]', title: "Search reviews", description: "Find a specific review by the reviewer name, review source, or submitted description." },
      { selector: '[data-tour="wb-reviews-table"]', title: "Review list", description: "The table shows each review with its moderation status and whether an approved review is enabled for public display on your website." },
      { selector: '[data-tour="wb-reviews-view"]', title: "Review details and actions", description: "The eye button opens the full review. Pending reviews can be approved or rejected, and approved reviews can be enabled or disabled for public display." },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/website-builder\/dynamic\/reviews\/?$/.test(path),
  },
  {
    id: "basic-website-careers",
    version: 3,
    title: "Website careers",
    description: "Publish job openings to your website's careers page and manage the applications they receive. Switch to a tab, then select Guide — the walkthrough follows whichever tab is open.",
    replayHint: true,
    steps: [
      { selector: '[data-tour="hr-recruit-tabs"]', title: "Openings and applications", description: "Job Openings manages the roles shown on your live careers page. Applications collects everything candidates submit against those openings." },

      // ── Job Openings tab ──
      { tabPage: "jobs", selector: '[data-tour="hr-recruit-summary"]', title: "Openings at a glance", description: "Total Jobs counts every listing, Active shows currently open ones, Total Vacancies tallies all open slots, and Filled tracks slots closed by hiring." },
      { tabPage: "jobs", selector: '[data-tour="hr-recruit-status-filters"]', title: "Filter job listings", description: "Switch between All, Active, and Inactive to focus on live roles or paused listings." },
      { tabPage: "jobs", selector: '[data-tour="hr-recruit-search"]', title: "Find a job opening", description: "Search by job title, department, or job code to locate a specific listing quickly." },
      { tabPage: "jobs", selector: '[data-tour="hr-recruit-add-btn"]', title: "Post a new opening", description: "Fill in role title, department, vacancies, and description, then toggle Publish to Website to make it appear on your live careers page.", side: "left" },
      { tabPage: "jobs", selector: '[data-tour="hr-recruit-bulk-upload"]', title: "Bulk upload jobs", description: "Import multiple openings at once using a CSV file — one job per row with title, department, employment type, and vacancy count.", side: "left" },
      { tabPage: "jobs", selector: '[data-tour="hr-recruit-export-btns"]', title: "Export listings", description: "Download the current job listings as a PDF or Excel file for offline review or sharing." },
      { tabPage: "jobs", selector: '[data-tour="hr-recruit-table"]', title: "Published openings", description: "Each row shows the role, code, department, open slots versus filled, active/inactive toggle, and website posting status. Toggle Website Status to post or remove a listing from your live careers page.", side: "top" },

      // ── Applications tab ──
      { tabPage: "candidates", selector: '[data-tour="hr-recruit-summary"]', title: "Application numbers", description: "Total counts every applicant from your careers page, Selected highlights hires awaiting conversion, Onboarded tracks completed conversions, and In Screening flags applicants not yet reviewed." },
      { tabPage: "candidates", selector: '[data-tour="hr-recruit-status-filters"]', title: "Filter by stage", description: "Narrow applications to All, Screening, Interview Scheduled, Interviewed, or Selected to focus on one hiring stage." },
      { tabPage: "candidates", selector: '[data-tour="hr-recruit-search"]', title: "Find an applicant", description: "Search by applicant name or the position they applied for." },
      { tabPage: "candidates", selector: '[data-tour="hr-recruit-table"]', title: "Applications and actions", description: "Each application shows the candidate, position applied for, source, and a status dropdown to advance them through the pipeline. Open full details with the eye action; the convert action appears once a candidate is Selected.", side: "top" },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/website-builder\/dynamic\/careers\/?$/.test(path),
  },
  {
    id: "basic-website-builder",
    version: 7,
    title: "Website Builder",
    description: "Create your hosted website, manage its leads and reviews, and set up career openings from one place.",
    steps: [
      { selector: '[data-tour="page-content"] h2', title: "Website Builder hub", description: "This is your website management dashboard. From here you can create or edit your website, track enquiries from visitors, moderate customer reviews, and manage job openings for your careers page." },
      { selector: '[data-tour="wb-create-edit"]', title: "Create or edit your website", description: "If you have not created a website yet, this card opens the website editor where you add your page content, images, and settings before publishing. If a website already exists, the same card opens the editor so you can update it." },
      { selector: '[data-tour="wb-leads"]', title: "Website Leads", description: "Every time someone submits a contact form or enquiry on your live website, it appears here. You can review the contact details, follow up, and use Pending or Closed to keep the enquiry organized." },
      { selector: '[data-tour="wb-reviews"]', title: "Website Reviews", description: "Customer reviews submitted through your website appear here. Approve good reviews to display them publicly on your site, or reject inappropriate ones. You control what visitors see." },
      { selector: '[data-tour="wb-careers"]', title: "Careers", description: "Create and publish job openings that appear on your website careers page. Add role title, department, description, and vacancies, then publish to make them live. This card is locked until your website is created for the first time." },
    ],
    matches: (path) => /^(\/company-settings|\/dashboard)\/website-builder(?:\/dynamic)?$/.test(path),
  },
  {
    id: "basic-nomad-reviews",
    version: 2,
    title: "Nomads reviews",
    description: "Moderate visitor feedback submitted through your Nomads listings and control which reviews are displayed publicly.",
    steps: [
      { selector: '[data-tour="nomad-reviews-header"]', title: "Review moderation", description: "This page shows visitor-submitted reviews connected to your Nomads listings. The cards summarize Total, Pending, Approved, and Rejected reviews." },
      { selector: '[data-tour="nomad-reviews-status-filter"]', title: "Filter review status", description: "Switch between All, Pending, Approved, and Rejected reviews. Use the rating and product-type filters next to the search box to narrow the list further." },
      { selector: '[data-tour="nomad-reviews-search"]', title: "Search reviews", description: "Find a specific review by reviewer name, review source, product type, or the review description. Results update as you type." },
      { selector: '[data-tour="nomad-reviews-table"]', title: "Review list", description: "Each row shows the reviewer, star rating, description, source, status, and whether an approved review is enabled for public display on your listing." },
      { selector: '[data-tour="nomad-reviews-view"]', title: "Open review details", description: "The eye button opens the full review so you can read the feedback and approve, reject, or enable/disable it for public display." },
    ],
    matches: exact("/company-settings/reviews"),
  },
  {
    id: "basic-nomad-leads",
    version: 1,
    title: "Nomads leads",
    description: "Track enquiries received from your Nomads Listings, review the contact details, and follow up to convert interest into bookings.",
    steps: [
      { selector: '[data-tour="wb-leads-header"]', title: "Leads dashboard", description: "This page collects every enquiry submitted through your Nomads Listings. Each lead includes the visitor name, contact details, source, product, status, and the date it was received." },
      { selector: '[data-tour="wb-leads-status-filter"]', title: "Filter by lead stage", description: "Use All to review every Nomads enquiry, Pending for leads that still need follow-up, or Closed for completed enquiries." },
      { selector: '[data-tour="wb-leads-search"]', title: "Search leads", description: "Find a specific lead using the visible search field. Results update as you type." },
      { selector: '[data-tour="wb-leads-table"]', title: "Nomads lead records", description: "Review each lead's contact details, source, product or service, current status, received date, and available action." },
      { selector: '[data-tour="wb-leads-view"]', title: "Open lead details", description: "The eye button opens the full enquiry so you can read the submitted information and close the lead after following up." },
    ],
    matches: (path) => /^\/company-settings\/nomads-leads\/?$/.test(path),
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
    version: 7,
    title: "Organization management",
    description: "Manage the two people available on the Basic plan: the workspace Founder and one additional Super Admin.",
    formDescription: "Invite the one permitted Super Admin using a valid name and email address. Department management and other member roles are not included in Basic.",
    recordsDescription: "Review the Founder and Super Admin, their invitation or account status, and whether workspace access is enabled.",
    replayHint: true,
    steps: [
      { selector: '[data-tour="organization-users-tab"]', title: "Platform users only", description: "Basic workspaces use this single member view. Department creation and department management are not part of the Basic plan." },
      { selector: '[data-tour="organization-status-filters"]', title: "Follow invitation and account status", description: "Switch between all, invited, registered, pending, joined, and disabled users to see where the additional user is in the onboarding process." },
      { selector: '[data-tour="organization-search"]', title: "Find a platform user", description: "Search the visible member list by name or email." },
      { selector: '[data-tour="organization-department-filter"]', title: "Filter by department or role", description: "Narrow the member list to one workspace role. Department choices apply to higher plans." },
      { selector: '[data-tour="organization-basic-user-limit"]', title: "Your two-user limit", description: "The Founder is the first user. Basic permits one additional Super Admin, so the workspace can contain two users in total. This counter shows whether that additional place has been used." },
      { selector: '[data-tour="organization-add-user"]', title: "Invite the Super Admin", description: "Select Add User to enter the additional user’s name and email. Their role is fixed to Super Admin on Basic. After that one invitation or member exists, this button is disabled because the plan limit has been reached." },
      { selector: '[data-tour="organization-members-table"]', title: "Manage member access", description: "Each row shows identity, role, status, access, and the View Details action. The access switch enables or disables the Super Admin’s workspace login; protected Founder and self-access controls remain locked.", side: "top" },
    ],
    matches: exact("/company-settings/organization-management"),
  },
  {
    id: "basic-access-grants",
    version: 8,
    title: "Access grants",
    description: "Review the Basic modules available to the Founder and the one additional Super Admin, then control the Super Admin’s sidebar access.",
    recordsDescription: "The list shows the Basic workspace users, their role and account state, plus the access actions available for each account.",
    replayHint: true,
    steps: [
      { selector: '[data-tour="access-grants-summary"]', title: "Basic member overview", description: "These cards summarize the workspace users by role. A Basic workspace normally has one Founder and up to one Super Admin; Admin, Manager, and Employee roles are not added on this plan." },
      { selector: '[data-tour="access-grants-status-filters"]', title: "Filter by access state", description: "All shows every workspace user. Active shows users who can enter the workspace, while Disabled shows accounts whose workspace access has been turned off." },
      { selector: '[data-tour="access-grants-search"]', title: "Find a user", description: "Search by name or email to locate the Founder or Super Admin. Department text is also searchable on plans that include departments." },
      { selector: '[data-tour="access-grants-role-filter"]', title: "Filter by role", description: "Use the role filter to focus on the Founder or Super Admin. The other role choices apply to higher plans and will normally have no Basic users." },
      { selector: '[data-tour="access-grants-transfer"]', title: "Transfer ownership", description: "Appears only when an eligible member exists and you are in your main unit. Opens the handoff that makes another member the workspace Founder." },
      { selector: '[data-tour="access-grants-table"]', title: "Review granted access", description: "The list shows each user’s identity, current role, department scope, status, and row actions. The Founder row is protected. For the Super Admin, the shield action opens Sidebar Access limited to Basic modules, and the user-and-cog action opens role and ownership details.", side: "top" },
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
      { selector: '[data-tour="visitors-tab-daily"]', title: "Daily visitors", description: "Shows today’s visitor workflow. The count identifies active tracked visitors, and the status subtabs separate pending, approved, checked-in, checked-out, and rejected records." },
      { selector: '[data-tour="visitors-tab-history"]', title: "Visitor history", description: "Switches to older visitor activity. Month and year selectors appear here so past records can be reviewed." },
      { selector: '[data-tour="visitors-tab-bookings"]', title: "Bookings", description: "Shows walk-in meeting-room bookings with upcoming, in-progress, completed, and cancelled states when this tab is available." },
      { selector: '[data-tour="visitors-tab-clients"]', title: "Clients", description: "Shows walk-in clients and visitors converted into reusable client records for future bookings." },
      { selector: 'input[placeholder="Search records..."]', title: "Search current records", description: "Searches only the records in the currently selected visitor tab and status view." },
      { text: "NEW FRONTDESK ACTION", title: "Start a frontdesk action", description: "Opens the frontdesk flow. Choose the appropriate action to register a standard visitor, process a tour, or create a walk-in booking; permissions control which options are available." },
      { selector: '[data-tour="page-content"] table', title: "Record actions", description: "Use row actions to inspect records and, when allowed by status and permission, approve, check in, print a badge, check out, reschedule, extend, or cancel." },
    ],
    matches: (path) => /^\/visitors(?:\/(visitor-management|dashboard))?$/.test(path),
  },
  {
    id: "basic-leave-requests",
    version: 2,
    title: "Leave management",
    description: "Apply for your own leave and review the request queues you are authorized to action. Switch to a tab, then select Guide — the walkthrough follows whichever tab is open.",
    recordsDescription: "Use the available search, filters, and row actions to work with these leave records.",
    replayHint: true,
    steps: [
      // 1. Tabs
      { selector: '[data-tour="leaves-tabs"]', title: "Leave queues", description: "Move between your personal leaves and the approval or overview queues included for your role. The guide follows the tab you have open." },
      // 2. Cards
      { selector: '[data-tour="leaves-summary"]', title: "Counts at a glance", description: "These cards summarize the open tab — such as pending, approved, and rejected requests or time-off totals." },
      // 3. Sub-tabs
      { selector: '[data-tour="leaves-status-filters"]', tabPage: "my-leaves", title: "Status sub-tabs", description: "Separate your own requests into all, pending, approved, or rejected." },
      { selector: '[data-tour="leaves-status-filters"]', tabPage: "leave-requests", title: "Status sub-tabs", description: "Separate incoming requests into all, pending, approved, or rejected so you can action what matters first." },
      // 4. Search bar
      { selector: '[data-tour="leaves-search"]', title: "Search bar", description: "Find requests faster by employee name within the currently selected queue." },
      // 5–7. MY LEAVES: button, form, table
      { selector: '[data-tour="leaves-apply-btn"]', tabPage: "my-leaves", title: "Apply for leave", description: "Opens your leave application form." },
      { tabPage: "my-leaves", textOnly: true, title: "The leave form", description: "Choose the leave type, start and end dates, and duration mode, attach any supporting document such as a medical certificate, then submit it for approval. You can track its state from this tab afterwards." },
      { selector: '[data-tour="leaves-table"]', tabPage: "my-leaves", title: "Your leave history", description: "Each row shows type, dates, duration, current status, and who actioned it. Open a request to view its complete details.", side: "top" },
      // LEAVE REQUESTS (approval queue) table
      { selector: '[data-tour="leaves-table"]', tabPage: "leave-requests", title: "Review team requests", description: "Each row shows the employee, department, leave type, dates, and status. Open a pending request to approve it or reject it with a reason.", side: "top" },
      // COMPANY LEAVES: search → filters → table
      { selector: '[data-tour="leaves-department-filter"]', tabPage: "company-leaves", title: "Department filter", description: "Focus company-wide leave activity on a single department." },
      { selector: '[data-tour="leaves-status-select"]', tabPage: "company-leaves", title: "Status filter", description: "Show every record or focus on pending, approved, or rejected leave across the workspace." },
      { selector: '[data-tour="leaves-table"]', tabPage: "company-leaves", title: "Company-wide activity", description: "Review who is away, for how long, and who approved it. Use the eye action on any row to inspect the complete record.", side: "top" },
      // ASSIGNED DEPT LEAVES: search → filters → cards → table
      { selector: '[data-tour="leaves-department-filter"]', tabPage: "assigned-dept-leaves", title: "Department filter", description: "Narrow the overview to one of the departments assigned to you." },
      { selector: '[data-tour="leaves-status-select"]', tabPage: "assigned-dept-leaves", title: "Status filter", description: "Show every record or focus on pending, approved, or rejected leave in your departments." },
      { selector: '[data-tour="leaves-department-cards"]', tabPage: "assigned-dept-leaves", title: "Absence overview", description: "These cards show how many people are on leave today in each department so staffing gaps stay visible." },
      { selector: '[data-tour="leaves-table"]', tabPage: "assigned-dept-leaves", title: "Department leave records", description: "Review leave across your assigned departments and open any record for its complete details.", side: "top" },
    ],
    matches: exact("/leave-requests"),
  },
  {
    id: "basic-attendance",
    version: 2,
    autoStart: false,
    title: "Attendance",
    description: "Clock in and out with selfie verification, watch your hours build up live, review team attendance when you manage people, and request corrections for wrong punches. Switch to a tab, then select Guide — the walkthrough follows whichever tab is open.",
    steps: [
      { selector: '[data-tour="attendance-main-tabs"]', title: "Three areas, one guide", description: "My Attendance tracks your own day. Team Attendance appears for managers, HR, and admins to review members, and Corrections lists punch fixes that were requested. The steps after this one always describe the tab you currently have open." },
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
      { tabPage: "team-attendance", selector: '[data-tour="attendance-department-filter"]', title: "Narrow by department", description: "Limit the roster to one department — only departments you are allowed to review appear here." },
      { tabPage: "team-attendance", selector: '[data-tour="attendance-table"]', title: "Member rows", description: "Every row shows an employee's date, punches, status, and hours for the period. The eye button opens their complete timeline — breaks, locations, and clock selfies.", side: "top" },
      // ── Corrections ──
      { tabPage: "corrections", selector: '[data-tour="attendance-summary"]', title: "Correction requests at a glance", description: "These cards track correction activity — how many fixes were requested, which are still pending, and how many were approved or rejected." },
      { tabPage: "corrections", selector: '[data-tour="attendance-status-filters"]', title: "Filter requests by state", description: "Separate pending, approved, and rejected correction requests so open work is never missed." },
      { tabPage: "corrections", selector: '[data-tour="attendance-search"]', title: "Find a request", description: "Locate a correction by employee name when reviewing specific cases." },
      { tabPage: "corrections", selector: '[data-tour="attendance-table"]', title: "Requests and outcomes", description: "Each row shows what was asked for versus the original punch times, who requested it, and its current state. Approved fixes update the underlying attendance record automatically.", side: "top" },
    ],
    matches: exact("/extra-common-modules/attendance"),
  },
  {
    id: "basic-tasks",
    version: 1,
    autoStart: false,
    title: "Tasks",
    description: "Track work routed between departments and people, assign new tasks when your role permits, and move each task through accept, progress, completion, and approval.",
    steps: [
      { selector: '[data-tour="tasks-page-tabs"]', title: "Task queues", description: "My Tasks opens first with everything assigned to you personally. Department Tasks collects work routed to the departments you manage or belong to, and leadership roles also see the tasks they raised for others. Employees see the My Tasks queue only." },
      { selector: '[data-tour="tasks-page-summary"]', title: "Task counts at a glance", description: "These cards total the tasks in the active queue and break them down into Pending, In Progress, and Resolved / Done." },
      { selector: '[data-tour="tasks-page-status-filter"]', title: "Filter by status", description: "Focus the list on All, Pending, In Progress, Completed, or Approved tasks." },
      { selector: '[data-tour="tasks-page-search"]', title: "Search tasks", description: "Find tasks by their title or the people involved. Results update as you type." },
      { selector: '[data-tour="tasks-page-department-filter"]', title: "Filter by department", description: "Narrow the queue to a single department's work." },
      { selector: '[data-tour="tasks-page-assign-btn"]', title: "Assign a new task", description: "Opens the Delegate Task form: choose Standard Execution or a Formal Approval Request, write the title and instructions, route it to a department, optionally pick an assignee, set the deadline, and attach reference files." },
      { selector: '[data-tour="tasks-page-table"]', title: "Task list and details", description: "Each task shows its type and department, who raised and received it, priority with progress, due date, and overdue warnings. Open a task to accept it, update progress, complete it with a note, or approve or reject approval requests.", side: "top" },
    ],
    matches: exact("/extra-common-modules/tasks"),
  },
  {
    id: "basic-leaves",
    version: 1,
    autoStart: false,
    title: "Leave Requests",
    description: "Apply for leave with live balance checks, follow your request through approval, and review company-wide or department absence when your role permits.",
    steps: [
      { selector: '[data-tour="leaves-tabs"]', title: "Leave areas", description: "My Leaves holds your own applications. Company Leaves, Assigned Dept Leaves, and the Leave Requests approval queue appear based on your role and department responsibilities." },
      { selector: '[data-tour="leaves-summary"]', title: "Counts for the active tab", description: "These cards reflect the selected tab — available balance, days taken this month, pending items, and approvals." },
      { selector: '[data-tour="leaves-department-cards"]', title: "Department absences", description: "One card per department shows how many approved employees are on leave today, giving an instant staffing picture." },
      { selector: '[data-tour="leaves-status-filters"]', title: "Filter by status", description: "Switch between All, Pending, Approved, and Rejected requests in the current view." },
      { selector: '[data-tour="leaves-search"]', title: "Search employees", description: "Find requests by employee name, ID, or department. Results update as you type." },
      { selector: '[data-tour="leaves-department-filter"]', title: "Filter by department and status", description: "On shared views, narrow the list to one department or a specific request status." },
      { selector: '[data-tour="leaves-apply-btn"]', title: "Apply for leave", description: "Choose the leave category and dates, then full day, half day, or partial hours. Sundays and holidays are excluded, balances are checked, and overlapping approved leave is blocked before submitting." },
      { selector: '[data-tour="leaves-table"]', title: "Requests and actions", description: "Each row shows the leave type, dates, duration, mode, status, and approver. Open a request to review its details; approvers can approve or reject pending ones, and certificates can be attached where required.", side: "top" },
    ],
    matches: exact("/leave-requests"),
  },
  {
    id: "basic-assets",
    version: 1,
    autoStart: false,
    title: "Assets",
    description: "Track company hardware, licenses, and equipment, filter by department or status, and raise asset requests for items you need.",
    steps: [
      { selector: '[data-tour="assets-module-tabs"]', title: "Assets and requests", description: "The Assets tab lists registered company assets. Asset Requests is where departments ask for new items and follow approvals." },
      { selector: '[data-tour="assets-summary"]', title: "Asset totals", description: "Total Units counts everything on record, Allocated Units shows what is currently issued, plus items in maintenance and decommissioned." },
      { selector: '[data-tour="assets-status-filter"]', title: "Filter by status", description: "Switch between All, Active, In Maintenance, and Decommissioned assets." },
      { selector: '[data-tour="assets-department-filter"]', title: "Filter by department", description: "Narrow the register to a single department, or view everything when your role allows it." },
      { selector: '[data-tour="assets-search"]', title: "Search assets", description: "Find an asset by its name, code, category, or location. Results update as you type." },
      { selector: '[data-tour="assets-add-btn"]', title: "Register an asset", description: "Opens the asset form to record a new item with its identity, owning department, quantity, location, and status. Visible only when your role permits adding assets.", side: "left" },
      { selector: '[data-tour="assets-table"]', title: "Asset list and actions", description: "Each row shows the asset identity, owning and assigned departments, quantity with availability, and location. Use row actions to view details, edit, transfer between departments, or assign to an employee where permitted.", side: "top" },
    ],
    matches: exact("/extra-common-modules/assets"),
  },
  {
    id: "basic-inventory",
    version: 1,
    autoStart: false,
    title: "Inventory",
    description: "Manage consumable and returnable stock per department, transfer units, record returns, and send faulty items to maintenance.",
    steps: [
      { selector: '[data-tour="inventory-summary"]', title: "Stock overview", description: "These cards show total SKU types, units available right now, how many departments hold stock, and overall stock levels." },
      { selector: '[data-tour="inventory-type-filter"]', title: "Filter by type and category", description: "Separate Consumables from Returnable Assets, and narrow further by category when categories exist." },
      { selector: '[data-tour="inventory-department-filter"]', title: "Filter by department", description: "Focus the list on one department's stock, or view all departments when your role permits." },
      { selector: '[data-tour="inventory-search"]', title: "Search stock", description: "Find an item by name or inventory code. Results update as you type." },
      { selector: '[data-tour="inventory-add-btn"]', title: "Add stock", description: "Registers a new item with its type, category, department, quantity, floor, and wing. Visible only when your role permits managing inventory.", side: "left" },
      { selector: '[data-tour="inventory-table"]', title: "Stock list and actions", description: "Each row shows availability against total stock with low-stock warnings. Open an item to transfer units to another department, record employee returns, or log maintenance — actions depend on your role.", side: "top" },
    ],
    matches: exact("/extra-common-modules/inventory"),
  },
  {
    id: "basic-department-inventory",
    version: 1,
    autoStart: false,
    title: "Department Inventory",
    description: "Work with the stock assigned to your own department — track items, update quantities, and keep returns and maintenance up to date.",
    steps: [
      { selector: '[data-tour="dept-inventory-summary"]', title: "Your department's stock", description: "Tracked items, available and total stock, plus low-stock alerts for the department you are viewing." },
      { selector: '[data-tour="dept-inventory-add-btn"]', title: "Add or update stock", description: "ADD NEW ITEM registers a new entry; UPDATE STOCK adjusts existing quantities. Managers and admins see both, employees see neither.", side: "left" },
      { selector: '[data-tour="dept-inventory-search"]', title: "Search items", description: "Find a stocked item quickly by name. Results update as you type." },
      { selector: '[data-tour="dept-inventory-table"]', title: "Items and actions", description: "Each entry shows quantity, tracking type, and status. Depending on permissions you can transfer units, record returns, log maintenance, or open full details.", side: "top" },
    ],
    matches: exact("/extra-common-modules/department-inventory"),
  },
  {
    id: "basic-finance-management",
    version: 1,
    autoStart: false,
    title: "Finance Management",
    description: "Handle budgets in one place — founders approve requests and audit spending across the company, while departments plan, request extra funds, and track paid expenses.",
    steps: [
      { selector: '[data-tour="finance-tabs"]', title: "Finance areas (founder view)", description: "Approvals holds annual budget and extra-fund requests waiting for decisions, and Overview audits each department's budget health for the selected year." },
      { selector: '[data-tour="finance-summary"]', title: "Company-wide numbers", description: "Total allocated budget, spending year-to-date, requests needing action, and the financial year in view." },
      { selector: '[data-tour="finance-sub-tabs"]', title: "Approval queues", description: "Switch between annual budget submissions and extra fund requests. Approve or reject from the table below." },
      { selector: '[data-tour="finance-search"]', title: "Search records", description: "Find finance rows by department, purpose, or requester. The year selector beside it switches the whole page to another financial year." },
      { selector: '[data-tour="finance-table"]', title: "Finance records", description: "Review each line with its amounts, department, and current state, then act using the row controls where your role permits.", side: "top" },
      { selector: '[data-tour="dept-finance-tabs"]', title: "Finance areas (department view)", description: "Monthly Plan manages your projected annual budget, Extra Budget Requests asks founders for additional funds, and History lists paid expenses. Only the areas relevant to your role appear here." },
      { selector: '[data-tour="dept-finance-summary"]', title: "Budget numbers for this tab", description: "Projected annual amount, what has been paid, savings, pending invoices, or extra-request totals — depending on the active tab." },
      { selector: '[data-tour="dept-finance-search"]', title: "Search and export", description: "Search the active tab's records, switch financial years, submit draft budgets, open vendors, or export reports as PDF and Excel." },
      { selector: '[data-tour="dept-finance-table"]', title: "Budget lines and expenses", description: "Each line shows planned versus actual amounts and invoice state. Edit draft plans before submitting, attach invoices to paid expenses, and track approvals end to end.", side: "top" },
    ],
    matches: exact("/extra-common-modules/finance-management"),
  },
  {
    id: "basic-reports",
    version: 1,
    autoStart: false,
    title: "Reports",
    description: "Browse generated attendance, employee, task, ticket, and financial reports, preview their contents, and download them as PDF or Excel.",
    steps: [
      { selector: '[data-tour="reports-summary"]', title: "Report totals", description: "Counts of stored reports broken down by their current state, so you can see coverage at a glance." },
      { selector: '[data-tour="reports-filters"]', title: "Filter reports", description: "Narrow the archive by category — attendance, employees, tasks, tickets, or financial — plus department, month, and data window such as monthly, quarterly, or annual." },
      { selector: '[data-tour="reports-search"]', title: "Search reports", description: "Find a report by its title or who generated it. Results update as you type." },
      { selector: '[data-tour="reports-table"]', title: "Report list and downloads", description: "Open any report to preview its full contents including monthly data, then download it as PDF or Excel. The header buttons download filtered selections directly.", side: "top" },
    ],
    matches: exact("/extra-common-modules/reports"),
  },
  {
    id: "basic-team-management",
    version: 1,
    autoStart: false,
    title: "Team Management",
    description: "As a department manager, control which sidebar modules your members can use, and maintain your department's SOPs and policies.",
    steps: [
      { selector: '[data-tour="team-mgmt-tabs"]', title: "Management areas", description: "Access Control lists your team and their module permissions. Department SOP and Department Policies tabs appear on workspaces that include them." },
      { selector: '[data-tour="team-mgmt-summary"]', title: "Team snapshot", description: "Headline counts for your team — total members and how many are currently active." },
      { selector: '[data-tour="team-mgmt-search"]', title: "Find a member", description: "Search your team by name, email, or employee ID. Results update as you type." },
      { selector: '[data-tour="team-mgmt-table"]', title: "Members and access", description: "Each row shows role, department, shift, and status. Open the action menu to manage that member's sidebar module access within what you can delegate.", side: "top" },
    ],
    matches: exact("/extra-common-modules/team-management"),
  },
  {
    id: "basic-hr-employee-management",
    version: 2,
    autoStart: false,
    title: "Company Management",
    description: "The HR hub for employee records — onboard staff, manage profiles and access, and maintain company SOPs, policies, and birthday lists.",
    steps: [
      { selector: '[data-tour="hr-emp-tabs"]', title: "Company areas", description: "Switch between Employee Management, Company SOP, Company Policies, and Month-wise Birthdays. Select Guide after opening a tab to get the steps for that area." },
      { tabPage: "employees", selector: '[data-tour="hr-emp-summary"]', title: "Workforce totals", description: "Headline counts for your workforce — total employees plus how many are currently active or otherwise." },
      { tabPage: "employees", selector: '[data-tour="hr-emp-status-filters"]', title: "Filter by status", description: "Focus the directory on All, Active, Inactive, or Terminated employees." },
      { tabPage: "employees", selector: '[data-tour="hr-emp-department-filter"]', title: "Filter by department and role", description: "Narrow the list to one department, then further by role when both filters are visible." },
      { tabPage: "employees", selector: '[data-tour="hr-emp-search"]', title: "Search employees", description: "Find people by name or email. Results update as you type." },
      { tabPage: "employees", selector: '[data-tour="hr-emp-add-btn"]', title: "Add an employee", description: "Opens the onboarding form for personal details, job information, salary CTC, documents, and bank details. Saving creates the profile and sends an invite.", side: "left" },
      { tabPage: "employees", selector: '[data-tour="hr-emp-table"]', title: "Directory and row actions", description: "Each row shows ID, role, department, and employment status. Use row actions to edit profiles, manage sidebar module access, or review transferred-in employees listed below.", side: "top" },
      { tabPage: "sop", selector: '[data-tour="hr-company-doc-summary"]', title: "Company SOP totals", description: "See total, active, and inactive SOP documents shared across the whole workspace." },
      { tabPage: "sop", selector: '[data-tour="hr-company-doc-status-filters"]', title: "Filter SOP status", description: "Switch between all, active, and inactive SOPs to audit what employees can currently access." },
      { tabPage: "sop", selector: '[data-tour="hr-company-doc-search"]', title: "Search SOPs", description: "Find a company SOP by document name. Results update as you type." },
      { tabPage: "sop", selector: '[data-tour="hr-company-doc-add-btn"]', title: "Add company SOP", description: "Upload a PDF SOP with a clear document name. Founder, super admin, and HR managers can manage these files.", side: "left" },
      { tabPage: "sop", selector: '[data-tour="hr-company-doc-table"]', title: "SOP list and actions", description: "Open the SOP PDF from the name column, or use row actions to rename, replace, deactivate, or reactivate documents.", side: "top" },
      { tabPage: "policies", selector: '[data-tour="hr-company-doc-summary"]', title: "Company policy totals", description: "See total, active, and inactive policy documents shared across the whole workspace." },
      { tabPage: "policies", selector: '[data-tour="hr-company-doc-status-filters"]', title: "Filter policy status", description: "Switch between all, active, and inactive policies to audit what employees can currently access." },
      { tabPage: "policies", selector: '[data-tour="hr-company-doc-search"]', title: "Search policies", description: "Find a company policy by document name. Results update as you type." },
      { tabPage: "policies", selector: '[data-tour="hr-company-doc-add-btn"]', title: "Add company policy", description: "Upload a PDF policy with a clear document name. Founder, super admin, and HR managers can manage these files.", side: "left" },
      { tabPage: "policies", selector: '[data-tour="hr-company-doc-table"]', title: "Policy list and actions", description: "Open the policy PDF from the name column, or use row actions to rename, replace, deactivate, or reactivate documents.", side: "top" },
      { tabPage: "birthdays", selector: '[data-tour="hr-birthdays-summary"]', title: "Birthday totals", description: "Track all recorded birthdays, this month's count, today's celebrations, and upcoming birthdays." },
      { tabPage: "birthdays", selector: '[data-tour="hr-birthdays-month-filter"]', title: "Month-wise filter", description: "Select All or a specific month to review birthdays month by month." },
      { tabPage: "birthdays", selector: '[data-tour="hr-birthdays-search"]', title: "Search birthdays", description: "Find employees by name, email, employee ID, or department inside the selected month." },
      { tabPage: "birthdays", selector: '[data-tour="hr-birthdays-table"]', title: "Birthday list", description: "Each row shows employee details, date of birth, age, birthday date, and whether the celebration is today, upcoming, or completed.", side: "top" },
    ],
    matches: exact("/hr/company-management"),
  },
  {
    id: "basic-hr-documents",
    version: 1,
    autoStart: false,
    title: "Document Vault",
    description: "Store and open employee documents securely — offer letters, IDs, certificates, and more, organised per person.",
    steps: [
      { selector: '[data-tour="hr-docs-tabs"]', title: "Active and inactive staff", description: "Switch between document sets for current employees and people who have left or been deactivated." },
      { selector: '[data-tour="hr-docs-summary"]', title: "Vault snapshot", description: "Counts of employees with stored paperwork so you can spot who is missing documents." },
      { selector: '[data-tour="hr-docs-search"]', title: "Search and filter", description: "Find a person or a named document, and narrow the list to one department." },
      { selector: '[data-tour="hr-docs-table"]', title: "Employee documents", description: "Each row lists the employee with their stored files. Open any document in a new tab, or view everything a person has on file in one place.", side: "top" },
    ],
    matches: exact("/hr/documents"),
  },
  {
    id: "basic-hr-attendance-review",
    version: 2,
    autoStart: false,
    title: "Attendance Review",
    description: "Monitor company-wide attendance, configure clocking rules, resolve correction requests, and drill into any employee's month.",
    steps: [
      // ── Shared: tabs ──
      { selector: '[data-tour="hr-attendance-tabs"]', title: "Switch between tabs", description: "Attendance Master shows each employee's daily punches across the company. Correction Requests lists change requests raised by staff for you to approve or reject." },

      // ── Attendance Master tab ──
      { tabPage: "attendance-master", selector: '[data-tour="hr-attendance-summary"]', title: "Workforce snapshot", description: "Total Employees counts everyone in the directory, Present shows who clocked in today, Late flags delayed arrivals, and Absent highlights missing punches." },
      { tabPage: "attendance-master", selector: '[data-tour="hr-attendance-status-filters"]', title: "Filter by attendance state", description: "Switch between All, Present, Late, Absent, and Half-Day to focus on specific attendance patterns." },
      { tabPage: "attendance-master", selector: '[data-tour="hr-attendance-date-filter"]', title: "Pick the date range", description: "Jump between Today and This Month, or choose Custom Range to review any period." },
      { tabPage: "attendance-master", selector: '[data-tour="hr-attendance-search"]', title: "Find an employee", description: "Search by name or employee ID to locate someone in the master roster." },
      { tabPage: "attendance-master", selector: '[data-tour="hr-attendance-settings-btn"]', title: "Attendance settings", description: "Configure clock-in rules — geofence locations, allowed distance, shift timings, and grace periods.", side: "left" },
      { tabPage: "attendance-master", selector: '[data-tour="hr-attendance-table"]', title: "Employee rows", description: "Each row shows employee ID, name, department, role, shift, date, check-in and check-out times, status, and hours worked. The eye button opens their full monthly detail view with timeline, breaks, and clock selfies.", side: "top" },

      // ── Correction Requests tab ──
      { tabPage: "correction-requests", selector: '[data-tour="hr-attendance-summary"]', title: "Correction request counts", description: "Total Requests counts all submissions, Pending highlights items awaiting your decision, Approved shows accepted fixes, and Rejected tracks denied requests." },
      { tabPage: "correction-requests", selector: '[data-tour="hr-attendance-status-filters"]', title: "Filter by request state", description: "Switch between All, Pending, Approved, and Rejected to focus on requests that need action or review past decisions." },
      { tabPage: "correction-requests", selector: '[data-tour="hr-attendance-date-filter"]', title: "Pick the date range", description: "Narrow correction requests to a specific day, the current month, or a custom period." },
      { tabPage: "correction-requests", selector: '[data-tour="hr-attendance-search"]', title: "Find a request", description: "Locate a correction by employee name when reviewing specific cases." },
      { tabPage: "correction-requests", selector: '[data-tour="hr-attendance-table"]', title: "Correction rows and actions", description: "Each row shows the employee, department, attendance date, submission date, current punch times versus requested times, and status. The eye button opens a detail modal where you can approve or reject pending corrections with a reason.", side: "top" },

      // ── Detail view (separate page, always shown) ──
      { selector: '[data-tour="hr-att-detail-summary"]', title: "Employee profile (detail view)", description: "When reviewing one person, this card shows their monthly hours, present days, and absences at a glance." },
      { selector: '[data-tour="hr-att-detail-table"]', title: "Daily records (detail view)", description: "Day-by-day punches with in and out times, breaks, and hours. Open a day to inspect selfie captures and the full timeline.", side: "top" },
    ],
    matches: startsWith("/hr/attendance-review"),
  },
  {
    id: "basic-hr-leave-processing",
    version: 2,
    autoStart: false,
    title: "Leave Request Processing",
    description: "Approve employee leave, track who is off today, maintain balances and quotas, and manage the company holiday calendar. Switch to a tab, then select Guide — the walkthrough follows whichever tab is open.",
    replayHint: true,
    steps: [
      { selector: '[data-tour="hr-leave-tabs"]', title: "Leave areas", description: "Leave Requests holds items awaiting decisions, Currently On Leave shows today's absences, Leave Master keeps full history, Leave Quotas manages allocations, and Holidays & Events runs the company calendar." },
      { selector: '[data-tour="hr-leave-summary"]', title: "Counts at a glance", description: "These cards refresh with the open tab — pending decisions and outcomes, absences today, quota totals, or calendar counts." },
      // REQUESTS tab
      { selector: '[data-tour="hr-leave-status-filters"]', tabPage: "requests", title: "Status sub-tabs", description: "Separate the queue into All, Pending, Approved, or Rejected requests." },
      { selector: '[data-tour="hr-leave-department-filter"]', tabPage: "requests", title: "Department filter", description: "Narrow the queue to a single department's requests." },
      { selector: '[data-tour="hr-leave-search"]', tabPage: "requests", title: "Search people", description: "Find employees by name or role. Results update as you type." },
      { selector: '[data-tour="hr-leave-table"]', tabPage: "requests", title: "Process requests", description: "Each row shows type, dates, and status with medical-certificate warnings where required. Pending rows can be approved, rejected with a reason, or opened for the complete request.", side: "top" },
      // CURRENTLY ON LEAVE tab
      { selector: '[data-tour="hr-leave-department-filter"]', tabPage: "current", title: "Department filter", description: "Focus today's absences on a single department." },
      { selector: '[data-tour="hr-leave-search"]', tabPage: "current", title: "Search people", description: "Find an absent employee by name or role." },
      { selector: '[data-tour="hr-leave-table"]', tabPage: "current", title: "Who is away today", description: "Everyone currently on leave with type, dates, and days remaining. Open a row to review the request; pending medical certificates are flagged here.", side: "top" },
      // LEAVE MASTER tab
      { selector: '[data-tour="hr-leave-department-filter"]', tabPage: "master", title: "Department filter", description: "Narrow the roster to one department's leave records." },
      { selector: '[data-tour="hr-leave-search"]', tabPage: "master", title: "Search people", description: "Locate any employee in the leave master panel." },
      { selector: '[data-tour="hr-leave-table"]', tabPage: "master", title: "Full leave history", description: "Every employee with total, used, and remaining leaves plus their record status. The eye action opens that person's complete leave history.", side: "top" },
      // LEAVE QUOTAS tab
      { selector: '[data-tour="hr-leave-quota-year"]', tabPage: "quotas", title: "Leave year", description: "Switch the allocation view between leave years — last year, this year, and next year." },
      { selector: '[data-tour="hr-leave-configure-btn"]', tabPage: "quotas", title: "Configure leave types", description: "Define the company's leave catalogue — annual, sick, casual, and custom types — that can then be assigned to employees.", side: "left" },
      { selector: '[data-tour="hr-leave-quota-table"]', tabPage: "quotas", title: "Allocations per employee", description: "See each employee's assigned leave types and cycle. Use the row actions to assign types or top up an individual's day balance.", side: "top" },
      // HOLIDAYS & EVENTS tab
      { selector: '[data-tour="hr-leave-calendar-subtabs"]', tabPage: "holidays", title: "Holidays or events", description: "Switch between the Company Holidays calendar and the Company Events calendar." },
      { selector: '[data-tour="hr-leave-entry-filters"]', tabPage: "holidays", title: "Entry filters", description: "Holidays filter by all, public, or company; events filter by all, upcoming, or past." },
      { selector: '[data-tour="hr-leave-calendar-search"]', tabPage: "holidays", title: "Search entries", description: "Find a holiday or event by name within the selected calendar." },
      { selector: '[data-tour="hr-leave-add-entry"]', tabPage: "holidays", title: "Add holidays and events", description: "Create a company holiday or event manually. On the Holidays calendar, Import also bulk-adds public holidays for your region. Existing entries can be edited or removed from their rows.", side: "top" },
    ],
    matches: exact("/hr/leave-request-processing"),
  },
  {
    id: "basic-hr-recruitment",
    version: 3,
    autoStart: false,
    title: "Recruitment",
    description: "Publish job openings, collect applicants from your careers page, and move candidates through the hiring pipeline.",
    replayHint: true,
    steps: [
      // ── Shared: tabs ──
      { selector: '[data-tour="hr-recruit-tabs"]', title: "Switch between tabs", description: "Job Openings manages published roles and vacancy tracking. Candidates Tracking follows every applicant through the hiring pipeline." },

      // ── Job Openings tab ──
      { tabPage: "jobs", selector: '[data-tour="hr-recruit-summary"]', title: "Job openings at a glance", description: "Total Jobs counts every listing, Active shows open ones, Total Vacancies tallies all open slots, and Filled tracks how many have been closed by converting candidates." },
      { tabPage: "jobs", selector: '[data-tour="hr-recruit-status-filters"]', title: "Filter job listings", description: "Switch between All, Active, and Inactive to focus on currently open roles or review paused listings." },
      { tabPage: "jobs", selector: '[data-tour="hr-recruit-search"]', title: "Find a job opening", description: "Search by job title, department, or job code to locate a specific listing quickly." },
      { tabPage: "jobs", selector: '[data-tour="hr-recruit-add-btn"]', title: "Publish a new job", description: "Creates a job listing that can appear on your website's careers page. Fill in title, department, vacancies, and description.", side: "left" },
      { tabPage: "jobs", selector: '[data-tour="hr-recruit-bulk-upload"]', title: "Bulk upload jobs", description: "Import multiple job openings at once using a CSV file. Use the recruitment job template — one job per row with title, department, employment type, and vacancy count.", side: "left" },
      { tabPage: "jobs", selector: '[data-tour="hr-recruit-export-btns"]', title: "Export listings", description: "Download the current job listings as a PDF or Excel file for offline review or sharing with hiring managers." },
      { tabPage: "jobs", selector: '[data-tour="hr-recruit-table"]', title: "Job listing rows", description: "Each row shows the job title, code, department, open slots versus filled, active/inactive toggle, website posting status, and an edit action. Toggle Website Status to post or remove a listing from your public careers page.", side: "top" },

      // ── Candidates Tracking tab ──
      { tabPage: "candidates", selector: '[data-tour="hr-recruit-summary"]', title: "Candidate pipeline numbers", description: "Total Candidates counts all applicants, Selected shows hires awaiting conversion, Onboarded tracks those already converted to employees, and In Screening highlights applicants not yet reviewed." },
      { tabPage: "candidates", selector: '[data-tour="hr-recruit-status-filters"]', title: "Filter by pipeline stage", description: "Narrow the list to All, Screening, Interview Scheduled, Interviewed, or Selected to focus on a specific hiring stage." },
      { tabPage: "candidates", selector: '[data-tour="hr-recruit-search"]', title: "Find a candidate", description: "Search by candidate name or the position they applied for to locate applicants quickly." },
      { tabPage: "candidates", selector: '[data-tour="hr-recruit-add-btn"]', title: "Add a candidate manually", description: "Register walk-ins, referrals, or offline applicants. Enter their name, email, phone, and the position applied for.", side: "left" },
      { tabPage: "candidates", selector: '[data-tour="hr-recruit-table"]', title: "Candidate rows and actions", description: "Each row shows the candidate's name and email, position applied for, source, and a pipeline status dropdown to advance them through Screening, Interview Scheduled, Interviewed, or Selected. The eye button opens full details and the convert button appears once a candidate is marked Selected.", side: "top" },
    ],
    matches: exact("/hr/recruitment"),
  },
  {
    id: "basic-hr-payroll",
    version: 2,
    autoStart: false,
    title: "Payroll Management",
    description: "Calculate monthly salaries from employee CTC with attendance deductions, lock the cycle, and hand it to Finance for payment. Switch to a tab, then select Guide — the walkthrough follows whichever tab is open.",
    replayHint: true,
    steps: [
      { selector: '[data-tour="hr-payroll-tabs"]', title: "Payroll areas", description: "Payroll Master runs the current month's cycle. Payroll History keeps every past cycle sent to Finance with its payment progress." },
      { selector: '[data-tour="hr-payroll-summary"]', title: "Cycle numbers", description: "Total payroll cost, employees covered, deductions applied, and the current cycle status for the selected month." },
      // MASTER tab
      { selector: '[data-tour="hr-payroll-status-filters"]', tabPage: "master", title: "Status sub-tabs", description: "Switch the master sheet between All, Pending, and Completed employees." },
      { selector: '[data-tour="hr-payroll-search"]', tabPage: "master", title: "Find an employee", description: "Locate someone in the payroll sheet by name." },
      { selector: '[data-tour="hr-payroll-role-filter"]', tabPage: "master", title: "Role filter", description: "Focus the sheet on one role such as Manager or Employee." },
      { selector: '[data-tour="hr-payroll-department-filter"]', tabPage: "master", title: "Department filter", description: "Narrow the sheet to a single department when your access covers more than one." },
      { selector: '[data-tour="hr-payroll-cycle-actions"]', tabPage: "master", title: "Run the monthly cycle", description: "Choose the month and year, pick a payslip template, then Prepare Payroll to lock attendance-based calculations. When ready, Send to Finance passes the cycle over for processing and payment.", side: "bottom" },
      { selector: '[data-tour="hr-payroll-table"]', tabPage: "master", title: "Salary sheet", description: "Each row shows the employee's earnings, deductions, and net pay for the cycle. Open a row to review the breakdown, apply a bonus or deduction adjustment, and generate the payslip.", side: "top" },
      // HISTORY tab
      { selector: '[data-tour="hr-payroll-search"]', tabPage: "history", title: "Find an employee", description: "Locate someone across past payroll cycles by name." },
      { selector: '[data-tour="hr-payroll-role-filter"]', tabPage: "history", title: "Role filter", description: "Focus past cycles on one role." },
      { selector: '[data-tour="hr-payroll-department-filter"]', tabPage: "history", title: "Department filter", description: "Narrow past cycles to a single department when your access covers more than one." },
      { selector: '[data-tour="hr-payroll-table"]', tabPage: "history", title: "Past cycles and payment progress", description: "Every cycle handed to Finance with its status and totals. Open a cycle to review its employees, amounts, and how far payments have progressed.", side: "top" },
    ],
    matches: exact("/hr/payroll-management"),
  },
  {
    id: "basic-hr-resignation",
    version: 2,
    autoStart: false,
    title: "Resignation Management",
    description: "Handle resignations end to end — review employee requests, move approved employees through notice period clearance, and keep completed or rejected cases in history.",
    steps: [
      { selector: '[data-tour="hr-resignation-tabs"]', title: "Resignation areas", description: "Requests shows new submissions awaiting HR action. Active Notice tracks approved employees still serving notice. History stores completed and rejected cases. Select Guide after opening a tab to walk through that area." },
      { selector: '[data-tour="hr-resignation-summary"]', title: "Tab-specific counts", description: "These cards change with the open tab — pending decisions on Requests, checklist readiness on Active Notice, and completed or rejected totals in History." },
      { selector: '[data-tour="hr-resignation-status-filters"]', title: "Status sub-tabs", description: "Filter the current tab by All, Pending, Approved, Rejected, or Completed. The available results depend on whether you are viewing requests, notice periods, or history." },
      { selector: '[data-tour="hr-resignation-department-filter"]', title: "Department filter", description: "Narrow resignation cases to one department when you need to review a specific team." },
      { selector: '[data-tour="hr-resignation-search"]', title: "Search cases", description: "Find a resignation case by employee name, employee ID, resignation code, or reason." },
      { selector: '[data-tour="hr-resignation-settings-btn"]', title: "Resignation rules", description: "Open the rules panel to configure return requirements, requested document templates, employee instructions, and the confirmation warning used for future resignation requests.", side: "left" },
      { tabPage: "requests", selector: '[data-tour="hr-resignation-table"]', title: "Review requests", description: "Each row shows the employee, department, applied date, notice period, and status. Use the eye action for full details, approve to start the notice period, or reject with a mandatory reason.", side: "top" },
      { tabPage: "requests", textOnly: true, title: "Approving or rejecting", description: "Approving creates the active notice record using the configured checklist. Rejecting requires a note so the outcome is documented in history." },
      { tabPage: "notice", selector: '[data-tour="hr-resignation-table"]', title: "Manage active notice", description: "Track each employee's last working date and checklist progress. Manage opens clearance work; Complete appears only when checklist requirements and notice timing allow final separation.", side: "top" },
      { tabPage: "notice", textOnly: true, title: "Clearance checklist", description: "Inside Manage, HR can extend the notice period, tick return and clearance items, save progress, and complete the resignation only after every required item is cleared." },
      { tabPage: "history", selector: '[data-tour="hr-resignation-table"]', title: "Resignation history", description: "History keeps completed and rejected resignation records with employee details, department, final resignation date, reason, status, and the view action for the full case file.", side: "top" },
    ],
    matches: exact("/hr/resignation-management"),
  },
  {
    id: "basic-admin-tenant-companies",
    version: 2,
    autoStart: false,
    title: "Tenant Companies",
    description: "The administration directory of every onboarded tenant company — contracts, contacts, packages, and renewals in one place.",
    steps: [
      { selector: '[data-tour="admin-tenant-summary"]', title: "Directory totals", description: "Counts of tenants on file split into Total Tenants, Active Contracts, Expiring Soon, and Expired Contracts so renewal work stands out." },
      { selector: '[data-tour="admin-tenant-tabs"]', title: "Filter by contract state", description: "Switch between All, Active, Expiring Soon, and Expired contracts to focus on records that need attention." },
      { selector: '[data-tour="admin-tenant-search"]', title: "Find a company", description: "Search instantly by company name or contact person instead of scrolling the directory." },
      { selector: '[data-tour="admin-tenant-status-select"]', title: "Filter by package", description: "Narrow the directory to tenants contracted on one specific package." },
      { selector: '[data-tour="admin-tenant-table"]', title: "Directory and actions", description: "Each row shows company and contact details, contract period, package and credits, and status. View Details opens the complete profile, Edit Company Record corrects saved information, and Renew Contract extends duration or adds credits.", side: "top" },
    ],
    matches: exact("/administration/tenant-companies"),
  },
  {
    id: "basic-admin-tenant-company-detail",
    version: 1,
    autoStart: false,
    title: "Tenant company profile",
    description: "The complete record for one tenant — contract details, employees, bookings, credit usage, and space allocation. This guide follows whichever tab is open; replay it from each tab for its walkthrough.",
    steps: [
      { selector: '[data-tour="tenant-detail-tabs"]', title: "Five record areas", description: "Company Details holds the agreement record, Employees lists the tenant's team, Bookings tracks their meeting-room usage, Credits follows consumption, and Space Allocation shows assigned seats." },
      { selector: '[data-tour="tenant-detail-stats"]', title: "Credit position", description: "Always visible across tabs — base credits from the contract, purchased top-ups, credits used so far, and the remaining balance." },
      { selector: '[data-tour="tenant-detail-contract-cards"]', tabPage: "company-details", title: "Contract window", description: "Contract start and end dates, total duration in months, and the floor or area assigned to this tenant." },
      { text: "Sales Package Summary", tabPage: "company-details", title: "Package and billing", description: "The contracted package with plan type, monthly credits, and desk counts sits beside the billing snapshot of rent, contract amount, and security deposit." },
      { text: "Manager Assignment", tabPage: "company-details", title: "Manager and contacts", description: "The tenant-side manager responsible for this account, with the customer profile and local and head-office POC contacts alongside." },
      { selector: '[data-tour="tenant-detail-change-manager"]', tabPage: "employees", title: "Change the manager", description: "Reassign the tenant-side manager from the employee list when your day-to-day contact changes." },
      { selector: '[data-tour="tenant-detail-add-employee"]', tabPage: "employees", title: "Add an employee", description: "Invite a tenant employee with name, email, phone, designation, and role so they receive access to the tenant workspace." },
      { selector: '[data-tour="tenant-detail-employees-table"]', tabPage: "employees", title: "Employee directory", description: "Each row shows the employee, contact details, and account status. Open a profile to review it, toggle access on or off, and remove employees who have left. The manager is marked and cannot be removed here.", side: "top" },
      { selector: '[data-tour="tenant-detail-bookings-table"]', tabPage: "bookings", title: "Meeting room bookings", description: "Every booking made by this tenant with room, date and time, booker, status, and credits spent. Open View Details for the complete booking record.", side: "top" },
      { selector: '[data-tour="tenant-detail-credit-utilization"]', tabPage: "credits", title: "Credit utilization", description: "A live bar comparing credits used against base plus purchased credits, with the remaining balance and percentage utilized." },
      { selector: '[data-tour="tenant-detail-credits-month"]', tabPage: "credits", title: "Monthly credit activity", description: "Pick any month and year to review that period's used, refunded, and net credits, then read every transaction as debits and credits with its running balance.", side: "top" },
      { selector: '[data-tour="tenant-detail-space-summary"]', tabPage: "space-allocation", title: "Allocated space", description: "The assigned area with open desks, cabin desks, and total seats, followed by the desk-level breakdown and location labels from the tenant's package." },
    ],
    matches: (path) => /^\/administration\/tenant-companies\/[^/]+$/.test(path),
  },
  {
    id: "basic-admin-bookings",
    version: 2,
    autoStart: false,
    title: "Meeting Room Bookings",
    description: "Oversee meeting room reservations across departments, internal teams, external guests, and tenants. Switch to a scope, then select Guide — the walkthrough follows whichever scope is open.",
    replayHint: true,
    steps: [
      { selector: '[data-tour="admin-bookings-tabs"]', title: "Booking scopes", description: "Department Bookings covers your department, Internal spans all teams and top management, External tracks guest meetings, Tenant follows company reservations, and Booking History archives completed activity." },
      { selector: '[data-tour="admin-bookings-summary"]', title: "Booking numbers", description: "Totals for the selected scope — upcoming bookings, today's schedule, and usage counts at a glance." },
      { selector: '[data-tour="admin-bookings-status-filters"]', title: "Status sub-tabs", description: "Filter rows by booking state such as Booked, Pending, Completed, or Cancelled; tenant scopes also separate bookings in progress." },
      { selector: '[data-tour="admin-bookings-search"]', title: "Search bookings", description: "Locate a reservation quickly by company, resource, date, or any detail in the list." },
      // Resource and type selects render on every scope except Tenant
      { selector: '[data-tour="admin-bookings-resource-filter"]', title: "Resource filter", description: "Focus the list on one resource kind — desk, meeting room, conference room, cabin, or boardroom." },
      { selector: '[data-tour="admin-bookings-type-filter"]', title: "Booking type filter", description: "Separate internal, tenant, and external reservations when a scope mixes them." },
      // Per-scope table walkthroughs
      { selector: '[data-tour="admin-bookings-table"]', tabPage: "department", title: "Department reservations", description: "Bookings raised inside your department with resource, schedule, and booker. Open a row for details; depending on state you can reschedule, extend, or cancel it.", side: "top" },
      { selector: '[data-tour="admin-bookings-table"]', tabPage: "internal", title: "Internal reservations", description: "Cross-team and top-management room usage in one view. Open a row for full details or manage the booking while it is still upcoming.", side: "top" },
      { selector: '[data-tour="admin-bookings-table"]', tabPage: "external", title: "External guest meetings", description: "Meetings booked for outside visitors, including the host department. Open a row to review details or adjust the schedule before arrival.", side: "top" },
      { selector: '[data-tour="admin-bookings-table"]', tabPage: "tenant", title: "Tenant company reservations", description: "Reservations made by tenant companies with the company column shown per row. Open a row to review the booking and its current state.", side: "top" },
      { selector: '[data-tour="admin-bookings-table"]', tabPage: "history", title: "Booking history", description: "The archived record of past bookings across scopes — use it to audit usage or resolve disputes about earlier reservations.", side: "top" },
    ],
    matches: exact("/administration/bookings"),
  },
  {
    id: "basic-admin-resource-management",
    version: 1,
    autoStart: false,
    title: "Resource Management",
    description: "Manage floor-by-floor workspace resources — open desks, cabins, meeting rooms, conference rooms, and virtual offices.",
    steps: [
      { selector: '[data-tour="admin-resource-tabs"]', title: "Resource views", description: "Switch between All Resources, Active, Under Maintenance, and Disabled to focus on what matters now." },
      { selector: '[data-tour="admin-resource-summary"]', title: "Inventory totals", description: "Counts per status so you can see overall availability and maintenance load at a glance." },
      { selector: '[data-tour="admin-resource-filters"]', title: "Filter by category, floor, and wing", description: "Combine category, floor, wing, and status filters to drill down to an exact area of the office." },
      { selector: '[data-tour="admin-resource-search"]', title: "Find a resource", description: "Search by name, ID, category, or location for direct lookups." },
      { selector: '[data-tour="admin-resource-add-btn"]', title: "Add resources", description: "Add Resource registers a new unit with its floor, wing, capacity, and credits. The upload icon next to it bulk-imports many resources from Excel at once." },
      { selector: '[data-tour="admin-resource-table"]', title: "Resource register", description: "Each row lists location, category, seats, inventory mode, and credits, with edit and delete actions. On smaller screens the same data appears as cards.", side: "top" },
    ],
    matches: exact("/administration/resource-management"),
  },
  {
    id: "basic-admin-housekeeping",
    version: 1,
    autoStart: false,
    title: "Housekeeping",
    description: "Run daily housekeeping — schedule tasks, let bookings trigger cleaning automatically, and track staff attendance and history.",
    steps: [
      { selector: '[data-tour="admin-housekeeping-tabs"]', title: "Task views", description: "Daily Scheduled Tasks lists your manual plan, Booking-Based Tasks are generated automatically from room reservations, and Task History archives completed work." },
      { selector: '[data-tour="admin-housekeeping-summary"]', title: "Today at a glance", description: "Pending tasks, booking triggers, work in progress, and everything completed today." },
      { selector: '[data-tour="admin-housekeeping-filters"]', title: "Filter tasks", description: "Filter scheduled tasks by status; history adds month and year pickers for past periods." },
      { selector: '[data-tour="admin-housekeeping-search"]', title: "Search tasks", description: "Jump straight to a task or area by name instead of scanning the board." },
      { selector: '[data-tour="admin-housekeeping-add-btn"]', title: "Create work", description: "Add Scheduled Task plans a cleaning job with time and assignee. The nearby buttons open staff management — Show Staff marks attendance, Add Staff registers new cleaners, and Bulk Upload imports them from Excel." },
      { selector: '[data-tour="admin-housekeeping-table"]', title: "Task board", description: "Tasks show area, floor, assignee, start time, and status with edit or cancel actions; history rows preserve who completed what and when.", side: "top" },
    ],
    matches: exact("/administration/house-keeping"),
  },
  {
    id: "basic-dashboard",
    version: 1,
    title: "Basic dashboard",
    description: "Use this overview to understand your workspace, open quick actions, and move into the Basic-plan modules available to you.",
    recordsDescription: "Dashboard sections summarize recent workspace activity and provide shortcuts to the related pages.",
    replayHint: true,
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
    id: "basic-add-ons",
    version: 1,
    title: "Add-Ons",
    description: "Review every workspace module by category, open features already included in Basic, and identify modules that require a plan upgrade.",
    steps: [
      { selector: '[data-tour="addons-overview"]', title: "Your module access summary", description: "The enabled count shows modules your workspace can open now. The locked count shows modules outside the current plan or role grant." },
      { selector: '[data-tour="addons-groups"]', title: "Modules organized by area", description: "Add-Ons are grouped into Common Modules, Extra Common Modules, Key Apps, Core Modules, and Department Accesses so you can find the required feature quickly." },
      { selector: '[data-tour="addons-group-common-modules"]', title: "Common Modules", description: "Expand this group to review everyday workspace tools. Enabled cards open their module directly; locked cards display a lock and open the upgrade options when selected." },
      { selector: '[data-tour="addons-group-extra-common-modules"]', title: "Extra Common Modules", description: "Expand this group to compare additional shared tools. The enabled and locked totals summarize current workspace access before you open it." },
      { selector: '[data-tour="addons-group-key-apps"]', title: "Key Apps", description: "This group contains major workspace applications such as Website Builder and related tools. Select any enabled card to go directly to that application." },
      { selector: '[data-tour="addons-group-founder-core-modules"]', title: "Core Modules", description: "Core administration modules are collected here. Access depends on both the active plan and your role permissions." },
      { selector: '[data-tour="addons-group-department-accesses"]', title: "Department Accesses", description: "Expand this group, then open a department to see its individual modules. A department counts as enabled when at least one of its modules is available." },
    ],
    matches: exact("/module-sections/add-ons"),
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
      { text: "Nomads Listings", exactText: true, title: "Nomads Listings", description: "Opens Nomads listings and reviews used to manage the workspace's public marketplace presence." },
      { text: "Organization Management", exactText: true, title: "Organization Management", description: "Opens workspace member invitations, access state, roles, and Basic-plan user limits." },
      { text: "Access Grants", exactText: true, title: "Access Grants", description: "Opens member role and module-access controls for authorized workspace administrators." },
      { text: "Customer Support", exactText: true, title: "Customer Support", description: "Opens the support workspace where issues can be raised, tracked, viewed, and exported." },
    ],
    matches: exact("/company-settings"),
  },
  {
    id: "basic-it-repair-logs",
    version: 1,
    title: "IT Repair Logs",
    description: "Track network, device, and system repairs across the IT department. Each tab gives a different view of repair activity.",
    steps: [
      { selector: '[data-tour="it-repair-tabs"]', title: "Tab views", description: "Switch between Active Logs (open and in-progress work), My Work (repairs assigned to you), and History (resolved and closed repairs)." },
      { selector: '[data-tour="it-repair-stats"]', title: "Quick stats", description: "Each tab shows its own summary cards — active counts on Active, your personal workload on My Work, and completion metrics on History." },
      { selector: '[data-tour="it-repair-status-filter"]', title: "Status sub-tabs", description: "Narrow the table further by status. Click All, Open, In Progress, Resolved, or Closed to filter within the current tab." },
      { selector: '[data-tour="it-repair-search-create"]', title: "Search and create", description: "Use the search bar to find logs by code, asset, or issue. Click Log IT Repair to open the form and raise a new repair entry." },
      { selector: '[data-tour="it-repair-table"]', title: "Repair log records", description: "Each row shows the log code, asset name, issue type, assigned technician, status, and creation date. Click View to open full details and advance the status." },
    ],
    matches: exact("/it/repair-logs"),
  },
  {
    id: "basic-maintenance-repair-logs",
    version: 1,
    autoStart: false,
    title: "Maintenance Repair Logs",
    description: "Log repair work orders for workspace assets and move each job through Open, In Progress, Resolved, and Closed. Switch to a tab, then select Guide — the walkthrough follows whichever tab is open.",
    replayHint: true,
    steps: [
      // ── Shared controls ──
      { selector: '[data-tour="maintenance-repair-tabs"]', title: "Work queues", description: "Team Active Logs shows every open and in-progress job across maintenance and appears for managers only. My Work narrows the list to repairs assigned to you or raised by you. History keeps resolved and closed logs as the department's permanent record." },
      { selector: '[data-tour="maintenance-repair-stats"]', title: "Department counts", description: "Total Logs counts every work order on file alongside its Open, In Progress, and Resolved / Closed totals so backlog pressure is visible immediately." },
      { selector: '[data-tour="maintenance-repair-status-filter"]', title: "Filter by status", description: "Narrow the current tab to All, Open, In Progress, Resolved, or Closed work orders." },
      { selector: '[data-tour="maintenance-repair-search-create"]', title: "Search and raise work", description: "Search by log code, asset, issue, technician, or ticket reference. Log Repair opens the intake form: pick an asset, choose an issue type such as Electrical, Plumbing, HVAC, or Furniture, describe the problem, optionally assign a technician, and submit.", side: "left" },
      // ── Team Active Logs tab ──
      { tabPage: "team-active", selector: '[data-tour="maintenance-repair-table"]', title: "Active department work", description: "Every Open and In Progress repair with its asset, issue type, assignee, and status. Rows linked to a customer-support ticket show its code so the repair stays connected to the original report.", side: "top" },
      // ── My Work tab ──
      { tabPage: "my-work", selector: '[data-tour="maintenance-repair-table"]', title: "Your personal queue", description: "Only repairs assigned to you or requested by you that are still open or in progress — this is your working list for the day.", side: "top" },
      // ── History tab ──
      { tabPage: "history", selector: '[data-tour="maintenance-repair-table"]', title: "Completed work", description: "Resolved and closed logs stay here for auditing and warranty questions. Open a row to read the details recorded when the job finished.", side: "top" },
      // ── Workflow explanation ──
      { textOnly: true, title: "Advancing a repair", description: "Open any log with View to see its full record. Start Work moves it to In Progress; from there Mark Resolved records completion or Close Log archives it directly. Closed logs are final and move to History." },
    ],
    matches: exact("/maintenance/repair-logs"),
  },
  {
    id: "basic-amc-scheduler",
    version: 1,
    autoStart: false,
    title: "AMC Maintenance Scheduler",
    description: "Plan preventive servicing for every asset under a maintenance contract and catch due or overdue services before they slip. Switch to a tab, then select Guide — the walkthrough follows whichever tab is open.",
    replayHint: true,
    steps: [
      // ── Shared controls ──
      { selector: '[data-tour="amc-scheduler-tabs"]', title: "Schedule views", description: "Master AMC Schedule lists every preventive servicing plan. Upcoming Alerts filters down to services that are Due Soon or Overdue and badges their combined count so urgent servicing is never missed." },
      { selector: '[data-tour="amc-scheduler-stats"]', title: "AMC health totals", description: "Total Active AMCs with Healthy / Scheduled, Due Soon, Overdue, and Completed counts summarize the servicing position across all contracts at a glance." },
      { selector: '[data-tour="amc-scheduler-filters"]', title: "Filter schedules", description: "Combine the department and status selects to focus on one team's assets or one service state." },
      { selector: '[data-tour="amc-scheduler-search-create"]', title: "Search and add plans", description: "Search by asset, code, technician, frequency, or notes. Add AMC Schedule creates a preventive plan: choose the asset, enter the maintenance type, set the frequency — Monthly, Quarterly, Half-Yearly, or Yearly — name the technician, and pick the next service date. Last serviced date, notes, and reminders are optional.", side: "left" },
      // ── Master AMC Schedule tab ──
      { tabPage: "schedules", selector: '[data-tour="amc-scheduler-table"]', title: "The master register", description: "Each row pairs the schedule code with its asset and department, plus maintenance type, frequency badge, technician, when it was last serviced, and the next service due. The next-due date colors red once overdue and amber when due soon. Use View to open the full record.", side: "top" },
      // ── Upcoming Alerts tab ──
      { tabPage: "alerts", selector: '[data-tour="amc-scheduler-table"]', title: "Services needing action", description: "Only Due Soon and Overdue schedules appear here regardless of the status filter, so this tab is the daily servicing checklist. Clear it by completing each service before it slips further.", side: "top" },
      // ── Workflow explanation ──
      { textOnly: true, title: "Completing a service", description: "Open a schedule and select Complete Service: today is saved as the last serviced date, the next due date advances by the frequency, the status returns to Scheduled, and the visit is written into the schedule's service history." },
    ],
    matches: exact("/maintenance/amc-scheduler"),
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
    return { ...tour, version: Math.max(BASIC_TOUR_VERSION, tour.version) };
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
