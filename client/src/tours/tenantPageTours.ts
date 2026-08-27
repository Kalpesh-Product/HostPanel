import type { BasicPageTour, BasicPageTourStep } from "./basicPageTours";

interface TourRoute extends BasicPageTour {
  matches: (pathname: string) => boolean;
}

const exact = (path: string) => (pathname: string) =>
  pathname === path || pathname === `${path}/`;

// Guides for the tenant portal pages (/dashboard/tenant/*). Tenant logins are
// not plan-gated like host workspaces, so this registry is consulted directly
// by usePageTour whenever the signed-in user carries a tenantRole.
const TENANT_PAGE_TOURS: TourRoute[] = [
  {
    id: "tenant-dashboard",
    version: 1,
    title: "Tenant dashboard",
    description: "Your workspace at a glance — available rooms, upcoming bookings, open tickets, and your company's meeting-room credit balance.",
    replayHint: true,
    steps: [
      { selector: '[data-tour="tenant-dash-actions"]', title: "Quick actions", description: "Book Room opens the room booking page, Raise Ticket opens support, and Booking History shows every past and upcoming reservation." },
      { selector: '[data-tour="tenant-dash-summary"]', title: "Today at a glance", description: "Available Rooms counts bookable rooms right now, Upcoming Bookings lists what is scheduled next, Open Tickets tracks unresolved support requests, and Credits Remaining shows your balance against the monthly allocation." },
      { selector: '[data-tour="tenant-dash-upcoming"]', title: "Upcoming bookings", description: "The next reservations for you — or the whole company if you are a tenant manager. Each row shows the room, time window, host, and status." },
      { selector: '[data-tour="tenant-dash-rooms"]', title: "Room pool", description: "Meeting rooms that are active and free right now. Select Book Room on any card in the booking page to reserve one." },
      { selector: '[data-tour="tenant-dash-tickets"]', title: "Support tickets", description: "Your latest tickets with their status. Managers see every ticket raised across the company; employees see their own." },
      { selector: '[data-tour="tenant-dash-team"]', title: "Team snapshot", description: "Your plan, company contact, credit usage meter, assigned manager, and recent team members from the tenant record." },
      { selector: '[data-tour="tenant-dash-balance"]', title: "Balance and credits", description: "A compact roll-up of visible bookings, open tickets, and remaining credits. When credits run low, an alert offers a shortcut to request more.", side: "top" },
    ],
    matches: exact("/dashboard/tenant"),
  },
  {
    id: "tenant-meeting-room-booking",
    version: 1,
    title: "Meeting room booking",
    description: "Browse active meeting and conference rooms grouped by floor and wing, then reserve a slot using your company's credits.",
    formDescription: "Pick a date and a start/end time within business hours — the estimated cost in credits updates as you choose.",
    recordsDescription: "Each room card shows capacity, hourly credit rate, floor, and wing so you can pick the right space before booking.",
    replayHint: true,
    steps: [
      { selector: '[data-tour="tenant-rooms-summary"]', title: "Availability summary", description: "Counts of bookable rooms by type and how many floors they are spread across." },
      { selector: '[data-tour="tenant-rooms-type-pills"]', title: "Filter by room type", description: "Switch between All, Meeting Room, and Conference Room to focus on the kind of space you need." },
      { selector: '[data-tour="tenant-rooms-floor-filter"], [data-tour="tenant-rooms-wing-filter"]', title: "Filter by location", description: "Narrow the list to a specific floor or wing when you know where you want to meet." },
      { selector: '[data-tour="tenant-rooms-search"]', title: "Search rooms", description: "Find a room by name, location, assignment, or description. Results update as you type." },
      { selector: '[data-tour="tenant-rooms-grid"]', title: "Room cards", description: "Each card shows the room type, capacity, hourly credit rate, and location. Only active, currently-free rooms with pricing appear here." },
      { textOnly: true, title: "Inside the booking dialog", description: "Choose the date, purpose, start and end times, and attendees. Conflicts are checked live — if the slot is taken, free alternatives of the same duration are offered. You can invite coworkers while there is spare capacity, and the booking is confirmed only when validation passes." },
      { text: "Book Room", exactText: true, title: "Start a booking", description: "Opens the booking dialog for that room. The submit button stays disabled while a conflicting slot is selected." },
    ],
    matches: exact("/dashboard/tenant/meeting-room-booking"),
  },
  {
    id: "tenant-booking-history",
    version: 1,
    title: "Booking history",
    description: "Track every tenant booking, handle invites, and reschedule, extend, or cancel meetings that have not happened yet.",
    replayHint: true,
    steps: [
      { selector: '[data-tour="tenant-history-refresh"]', title: "Refresh", description: "Reloads bookings immediately. The page also refreshes itself every 30 seconds to keep statuses current." },
      { selector: '[data-tour="tenant-history-tabs"]', title: "Company, personal, invites", description: "Managers can review all Company View bookings. My Bookings lists reservations you hosted or accepted, and Invites collects pending invitations awaiting your response." },
      { selector: '[data-tour="tenant-history-summary"]', title: "Scope at a glance", description: "Counts for the selected tab — upcoming, past, cancelled, and pending invites." },
      { selector: '[data-tour="tenant-history-subtabs"]', title: "Time filters", description: "Switch between Upcoming, Past, and Cancelled meetings within the current tab." },
      { selector: '[data-tour="tenant-history-table"]', title: "Booking records and actions", description: "Each row shows the room, booking code, host, schedule, and live status. The eye action opens full details; reschedule, cancel, extend, and invite actions appear based on the booking state and your role.", side: "top" },
      { textOnly: true, title: "Reschedule, extend, and cancel", description: "Reschedule picks a new date and time — overlap and business hours are validated, and credit differences are shown before saving. Extend adds 15–90 minutes to a running meeting. Cancel refunds the booked credits and asks for a reason." },
    ],
    matches: exact("/dashboard/tenant/booking-history"),
  },
  {
    id: "tenant-buy-credits",
    version: 1,
    title: "Buy credits",
    description: "Request additional meeting-room credits for your company and track each request through approval, payment, and delivery.",
    formDescription: "Enter how many credits you need (minimum 50) and an optional reason for Sales.",
    recordsDescription: "Every request shows its amount, price, status, submitted date, and available actions such as uploading payment proof or viewing the invoice.",
    replayHint: true,
    steps: [
      { selector: '[data-tour="tenant-credits-pricing"]', title: "Pricing and minimums", description: "Credits are priced per credit in your workspace currency, with a minimum order of 50 CR. The usage chip shows how much of the allocated balance has been consumed." },
      { selector: '[data-tour="tenant-credits-new-request"]', title: "Start a credit request", description: "Opens the request form. Enter a whole number of credits (50 or more), add an optional reason, review the estimated price, then submit it to Sales for approval. Only tenant managers and admins can raise requests." },
      { selector: '[data-tour="tenant-credits-summary"]', title: "Credit overview", description: "Remaining credits against the total allocation, plus how many requests your company has raised so far." },
      { selector: '[data-tour="tenant-credits-table"]', title: "Request history and actions", description: "Requests move through Pending Approval, Awaiting Payment, Payment Submitted, and finally Credits Added. When a request awaits payment, use Upload Proof to attach a screenshot or PDF receipt and an optional transaction ID. Once completed, the invoice becomes downloadable.", side: "top" },
    ],
    matches: exact("/dashboard/tenant/buy-credits"),
  },
  {
    id: "tenant-tickets",
    version: 1,
    title: "Support tickets",
    description: "Raise issues to the HostPanel admin teams and follow them from submission to resolution.",
    formDescription: "Give the issue a clear title and describe it in detail — these are required before the ticket can be submitted.",
    recordsDescription: "Tickets show their code, routing department, priority, status, and last update, with a view action for full details.",
    replayHint: true,
    steps: [
      { selector: '[data-tour="tenant-tickets-tabs"]', title: "Ticket scopes", description: "Managers see Company Tickets for everything raised across the company. Raised Tickets lists your own active submissions, and History keeps every resolved or closed ticket for reference." },
      { selector: '[data-tour="tenant-tickets-summary"]', title: "Counts for this scope", description: "Total tickets plus how many are open, in progress, and closed. Selecting a card also filters the list below." },
      { selector: '[data-tour="tenant-tickets-status-filters"]', title: "Filter by status", description: "Narrow the list to All, Open, In Progress, or Closed tickets within the selected tab." },
      { selector: '[data-tour="tenant-tickets-search"]', title: "Search tickets", description: "Find tickets by title, description, code, category, or department. Results update as you type." },
      { selector: '[data-tour="tenant-tickets-raise-btn"]', title: "Raise a ticket", description: "Opens the ticket form. Tap a suggested issue to autofill the title, pick a priority and target department, then submit. Validation highlights anything missing before sending.", side: "left" },
      { selector: '[data-tour="tenant-tickets-table"]', title: "Ticket list", description: "Each row shows the ticket details, who raised it, the department queue, priority, and status. Use the eye action to read the full conversation details.", side: "top" },
      { textOnly: true, title: "What happens after submitting", description: "The ticket lands in the chosen department's queue. Admins accept it (moving it to In Progress) and resolve it with a note, which then appears under History for your reference." },
    ],
    matches: exact("/dashboard/tenant/tickets"),
  },
];

export function getTenantPageTour(pathname: string): BasicPageTour | null {
  const route = TENANT_PAGE_TOURS.find((tour) => tour.matches(pathname));
  if (!route) return null;
  const { matches: _matches, ...tour } = route;
  const steps = (tour.steps || []) as BasicPageTourStep[];
  return { ...tour, steps };
}
