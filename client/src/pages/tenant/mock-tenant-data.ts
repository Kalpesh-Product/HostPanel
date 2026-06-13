export const MOCK_USER = {
  id: "tenant-user-001",
  _id: "tenant-user-001",
  recordId: "tenant-user-001",
  fullName: "Sarah Chen",
  name: "Sarah Chen",
  email: "sarah.chen@acmecorp.com",
  phone: "+1 (555) 123-4567",
  mobile: "+1 (555) 123-4567",
  designation: "Office Manager",
  role: "tenant-manager",
  tenantCompanyId: "tenant-co-001",
  tenantCompanyName: "Acme Corp",
  workspaceMembership: {
    role: "tenant-manager",
    tenantCompanyId: "tenant-co-001",
    tenantCompanyName: "Acme Corp",
  },
};

export const MOCK_ROOMS: Record<string, any>[] = [
  { recordId: "room-001", _id: "room-001", name: "Boardroom A", type: "Conference Room", resourceType: "Meeting Room", resourceCategory: "conference_room", floor: "5", locationFloor: "5", wing: "A", locationWing: "A", capacity: 16, credits: 8, pricePerHour: 80, pricePerDay: 640, status: "Active", resourceStatus: "Active", isActive: true, currentlyBooked: false, isBooked: false, assignedTenantCompanyName: "Acme Corp", assignmentLabel: "Acme Corp", description: "Premium boardroom with 4K display and video conferencing", locationLabel: "Floor 5 Wing A" },
  { recordId: "room-002", _id: "room-002", name: "Innovation Hub", type: "Meeting Room", resourceType: "Meeting Room", resourceCategory: "meeting_room", floor: "5", locationFloor: "5", wing: "A", locationWing: "A", capacity: 8, credits: 5, pricePerHour: 50, pricePerDay: 400, status: "Active", resourceStatus: "Active", isActive: true, currentlyBooked: false, isBooked: false, assignedTenantCompanyName: "Acme Corp", assignmentLabel: "Acme Corp", description: "Creative meeting space with whiteboard walls", locationLabel: "Floor 5 Wing A" },
  { recordId: "room-003", _id: "room-003", name: "Focus Room 1", type: "Meeting Room", resourceCategory: "meeting_room", floor: "5", locationFloor: "5", wing: "B", locationWing: "B", capacity: 4, credits: 3, pricePerHour: 30, pricePerDay: 240, status: "Active", isActive: true, currentlyBooked: false, isBooked: false, assignmentLabel: "Acme Corp", description: "Quiet focus room for small team huddles", locationLabel: "Floor 5 Wing B" },
  { recordId: "room-004", _id: "room-004", name: "Executive Lounge", type: "Conference Room", resourceCategory: "conference_room", floor: "6", locationFloor: "6", wing: "A", locationWing: "A", capacity: 12, credits: 10, pricePerHour: 100, pricePerDay: 800, status: "Active", isActive: true, currentlyBooked: false, isBooked: false, assignmentLabel: "Acme Corp", description: "Executive conference room with panoramic views", locationLabel: "Floor 6 Wing A" },
  { recordId: "room-005", _id: "room-005", name: "Collaboration Corner", type: "Meeting Room", resourceCategory: "meeting_room", floor: "6", locationFloor: "6", wing: "B", locationWing: "B", capacity: 6, credits: 4, pricePerHour: 40, pricePerDay: 320, status: "Active", isActive: true, currentlyBooked: false, isBooked: false, assignmentLabel: "Shared", description: "Open collaboration space", locationLabel: "Floor 6 Wing B" },
  { recordId: "room-006", _id: "room-006", name: "Workshop Room", type: "Meeting Room", resourceCategory: "meeting_room", floor: "7", locationFloor: "7", wing: "A", locationWing: "A", capacity: 20, credits: 12, pricePerHour: 120, pricePerDay: 960, status: "Active", isActive: true, currentlyBooked: false, isBooked: false, assignmentLabel: "Shared", description: "Large workshop space for training sessions", locationLabel: "Floor 7 Wing A" },
  { recordId: "room-007", _id: "room-007", name: "Quiet Room 2", type: "Meeting Room", resourceCategory: "meeting_room", floor: "5", locationFloor: "5", wing: "B", locationWing: "B", capacity: 4, credits: 3, pricePerHour: 30, pricePerDay: 240, status: "Active", isActive: true, currentlyBooked: false, isBooked: false, assignmentLabel: "Acme Corp", description: "Phone booth style quiet room", locationLabel: "Floor 5 Wing B" },
  { recordId: "room-008", _id: "room-008", name: "Presentation Hall", type: "Conference Room", resourceCategory: "conference_room", floor: "7", locationFloor: "7", wing: "B", locationWing: "B", capacity: 30, credits: 15, pricePerHour: 150, pricePerDay: 1200, status: "Active", isActive: true, currentlyBooked: false, isBooked: false, assignmentLabel: "Shared", description: "Full presentation hall with stage and projector", locationLabel: "Floor 7 Wing B" },
];

export const MOCK_BOOKINGS: Record<string, any>[] = [
  { recordId: "bkg-001", id: "BKG-001", bookingCode: "BKG-001", roomName: "Boardroom A", date: new Date(Date.now() + 86400000).toISOString().split("T")[0], startTime: "09:00", endTime: "10:30", status: "Booked", bookingStatus: "Booked", bookedByName: "Sarah Chen", bookedByUserId: "tenant-user-001", bookedByEmail: "sarah.chen@acmecorp.com", bookingType: "tenant", purpose: "Weekly team standup and sprint planning", attendees: 8, clientCompany: "Acme Corp", bookedByTenantCompanyId: "tenant-co-001", bookedByTenantCompanyName: "Acme Corp", roomCapacity: 16, bookingCredits: 12, location: "Floor 5 Wing A", roomWing: "A", roomInventoryMode: "Conference room", invites: [{ invitedUserId: "emp-002", invitedName: "Mike Ross", invitedEmail: "mike.ross@acmecorp.com", invitedRole: "Lead Developer", status: "accepted" }, { invitedUserId: "emp-003", invitedName: "Rachel Zane", invitedEmail: "rachel.zane@acmecorp.com", invitedRole: "Designer", status: "accepted" }] },
  { recordId: "bkg-002", id: "BKG-002", bookingCode: "BKG-002", roomName: "Innovation Hub", date: new Date(Date.now() + 172800000).toISOString().split("T")[0], startTime: "14:00", endTime: "15:30", status: "Booked", bookingStatus: "Booked", bookedByName: "Sarah Chen", bookedByUserId: "tenant-user-001", bookedByEmail: "sarah.chen@acmecorp.com", bookingType: "tenant", purpose: "Client presentation - Q3 roadmap", attendees: 5, clientCompany: "Acme Corp", bookedByTenantCompanyId: "tenant-co-001", bookedByTenantCompanyName: "Acme Corp", roomCapacity: 8, bookingCredits: 7.5, location: "Floor 5 Wing A", roomWing: "A", roomInventoryMode: "Meeting room", invites: [{ invitedUserId: "emp-004", invitedName: "Jessica Pearson", invitedEmail: "jessica.pearson@acmecorp.com", invitedRole: "CEO", status: "pending" }] },
  { recordId: "bkg-003", id: "BKG-003", bookingCode: "BKG-003", roomName: "Executive Lounge", date: new Date(Date.now() + 259200000).toISOString().split("T")[0], startTime: "10:00", endTime: "11:00", status: "Booked", bookingStatus: "Booked", bookedByName: "Mike Ross", bookedByUserId: "emp-002", bookedByEmail: "mike.ross@acmecorp.com", bookingType: "tenant", purpose: "Architecture review meeting", attendees: 6, clientCompany: "Acme Corp", bookedByTenantCompanyId: "tenant-co-001", bookedByTenantCompanyName: "Acme Corp", roomCapacity: 12, bookingCredits: 10, location: "Floor 6 Wing A", roomWing: "A", roomInventoryMode: "Conference room", invites: [] },
  { recordId: "bkg-004", id: "BKG-004", bookingCode: "BKG-004", roomName: "Focus Room 1", date: new Date(Date.now() - 86400000).toISOString().split("T")[0], startTime: "13:00", endTime: "14:00", status: "Completed", bookingStatus: "Completed", bookedByName: "Sarah Chen", bookedByUserId: "tenant-user-001", bookedByEmail: "sarah.chen@acmecorp.com", bookingType: "tenant", purpose: "1:1 with direct report", attendees: 2, clientCompany: "Acme Corp", bookedByTenantCompanyId: "tenant-co-001", bookedByTenantCompanyName: "Acme Corp", roomCapacity: 4, bookingCredits: 3, location: "Floor 5 Wing B", roomWing: "B", roomInventoryMode: "Meeting room", invites: [] },
  { recordId: "bkg-005", id: "BKG-005", bookingCode: "BKG-005", roomName: "Collaboration Corner", date: new Date(Date.now() - 172800000).toISOString().split("T")[0], startTime: "15:00", endTime: "16:30", status: "Cancelled", bookingStatus: "Cancelled", bookedByName: "Rachel Zane", bookedByUserId: "emp-003", bookedByEmail: "rachel.zane@acmecorp.com", bookingType: "tenant", purpose: "Design sprint retrospective", attendees: 4, clientCompany: "Acme Corp", bookedByTenantCompanyId: "tenant-co-001", bookedByTenantCompanyName: "Acme Corp", roomCapacity: 6, bookingCredits: 6, location: "Floor 6 Wing B", roomWing: "B", cancelReason: "Sprint postponed", invites: [] },
  { recordId: "bkg-006", id: "BKG-006", bookingCode: "BKG-006", roomName: "Innovation Hub", date: new Date(Date.now() + 43200000).toISOString().split("T")[0], startTime: "11:00", endTime: "12:00", status: "Booked", bookingStatus: "Booked", bookedByName: "Jessica Pearson", bookedByUserId: "emp-004", bookedByEmail: "jessica.pearson@acmecorp.com", bookingType: "tenant", purpose: "Board meeting prep", attendees: 3, clientCompany: "Acme Corp", bookedByTenantCompanyId: "tenant-co-001", bookedByTenantCompanyName: "Acme Corp", roomCapacity: 8, bookingCredits: 5, location: "Floor 5 Wing A", roomWing: "A", roomInventoryMode: "Meeting room", invites: [{ invitedUserId: "tenant-user-001", invitedName: "Sarah Chen", invitedEmail: "sarah.chen@acmecorp.com", invitedRole: "Office Manager", status: "pending" }] },
];

export const MOCK_TICKETS: Record<string, any>[] = [
  { id: "TCK-001", recordId: "ticket-001", title: "Air conditioning not working in Wing A", description: "The AC unit on Floor 5 Wing A has been blowing warm air since morning. Multiple team members are affected.", status: "In Progress", priority: "high", department: "Maintenance", category: "Facilities", issueType: "HVAC", requesterUserId: "tenant-user-001", requesterName: "Sarah Chen", submittedBy: "sarah.chen@acmecorp.com", assignedTo: "admin@workspace.com", assignedToName: "John Smith", tenantCompanyId: "tenant-co-001", tenantCompanyName: "Acme Corp", createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "TCK-002", recordId: "ticket-002", title: "Additional desk chairs needed - Floor 5", description: "We have 3 new team members joining next week and need additional ergonomic chairs for the Acme Corp section on Floor 5.", status: "Open", priority: "medium", department: "Administration", category: "Furniture", issueType: "Request", requesterUserId: "tenant-user-001", requesterName: "Sarah Chen", submittedBy: "sarah.chen@acmecorp.com", assignedTo: "", assignedToName: "", tenantCompanyId: "tenant-co-001", tenantCompanyName: "Acme Corp", createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "TCK-003", recordId: "ticket-003", title: "WiFi connectivity issues in Boardroom A", description: "Multiple guests have reported intermittent WiFi drops during video calls in Boardroom A. Need IT to investigate.", status: "Assigned", priority: "high", department: "IT", category: "Network", issueType: "Connectivity", requesterUserId: "emp-002", requesterName: "Mike Ross", submittedBy: "mike.ross@acmecorp.com", assignedTo: "it@workspace.com", assignedToName: "David Lee", tenantCompanyId: "tenant-co-001", tenantCompanyName: "Acme Corp", createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), updatedAt: new Date(Date.now() - 1800000).toISOString() },
  { id: "TCK-004", recordId: "ticket-004", title: "Printer toner replacement - Wing B", description: "The shared printer on Floor 5 Wing B is low on toner and showing streaks on printouts.", status: "Closed", priority: "low", department: "Administration", category: "Equipment", issueType: "Maintenance", requesterUserId: "emp-003", requesterName: "Rachel Zane", submittedBy: "rachel.zane@acmecorp.com", assignedTo: "admin@workspace.com", assignedToName: "John Smith", tenantCompanyId: "tenant-co-001", tenantCompanyName: "Acme Corp", createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: "TCK-005", recordId: "ticket-005", title: "Security badge access for new hires", description: "Need security badges activated for 3 new employees starting Monday: Tom, Diana, and Priya.", status: "Open", priority: "medium", department: "Security", category: "Access", issueType: "Request", requesterUserId: "tenant-user-001", requesterName: "Sarah Chen", submittedBy: "sarah.chen@acmecorp.com", assignedTo: "", assignedToName: "", tenantCompanyId: "tenant-co-001", tenantCompanyName: "Acme Corp", createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), updatedAt: new Date(Date.now() - 3600000 * 2).toISOString() },
];

export const MOCK_EMPLOYEES: Record<string, any>[] = [
  { id: "emp-001", fullName: "Sarah Chen", name: "Sarah Chen", email: "sarah.chen@acmecorp.com", role: "tenant-manager", designation: "Office Manager", status: "Active" },
  { id: "emp-002", fullName: "Mike Ross", name: "Mike Ross", email: "mike.ross@acmecorp.com", role: "tenant-employee", designation: "Lead Developer", status: "Active" },
  { id: "emp-003", fullName: "Rachel Zane", name: "Rachel Zane", email: "rachel.zane@acmecorp.com", role: "tenant-employee", designation: "Senior Designer", status: "Active" },
  { id: "emp-004", fullName: "Jessica Pearson", name: "Jessica Pearson", email: "jessica.pearson@acmecorp.com", role: "tenant-manager", designation: "CEO", status: "Active" },
  { id: "emp-005", fullName: "Harvey Specter", name: "Harvey Specter", email: "harvey.specter@acmecorp.com", role: "tenant-employee", designation: "Legal Counsel", status: "Active" },
  { id: "emp-006", fullName: "Donna Paulsen", name: "Donna Paulsen", email: "donna.paulsen@acmecorp.com", role: "tenant-employee", designation: "Operations Manager", status: "Active" },
  { id: "emp-007", fullName: "Louis Litt", name: "Louis Litt", email: "louis.litt@acmecorp.com", role: "tenant-employee", designation: "Finance Lead", status: "Inactive" },
];

export const MOCK_TENANT_COMPANIES: Record<string, any>[] = [
  {
    id: "tenant-co-001",
    recordId: "tenant-co-001",
    tenantCompanyId: "tenant-co-001",
    companyName: "Acme Corp",
    status: "Active",
    planType: "Premium",
    packageDetails: { name: "Premium Plan", monthlyTotalCredits: 200 },
    creditsAllocated: 200,
    creditsTotal: 200,
    creditsRemaining: 147,
    creditsUsed: 53,
    addOnCredits: { remainingCredits: 147 },
    contactName: "Sarah Chen",
    contactEmail: "sarah.chen@acmecorp.com",
    employees: MOCK_EMPLOYEES,
    employeesCount: 7,
    managerEmployeeId: "emp-001",
    managerEmployee: { id: "emp-001", name: "Sarah Chen", fullName: "Sarah Chen", email: "sarah.chen@acmecorp.com", role: "Office Manager" },
  },
];

export function initMockTenantSession(): void {
  try {
    if (!localStorage.getItem("hostpanel_auth_user") && !localStorage.getItem("user")) {
      localStorage.setItem("hostpanel_auth_user", JSON.stringify(MOCK_USER));
    }
    if (!localStorage.getItem("hostpanel_tenant_company_id")) {
      localStorage.setItem("hostpanel_tenant_company_id", "tenant-co-001");
    }
    if (!localStorage.getItem("hostpanel_tenant_company_name")) {
      localStorage.setItem("hostpanel_tenant_company_name", "Acme Corp");
    }
    if (!localStorage.getItem("hostpanel_tenant_role")) {
      localStorage.setItem("hostpanel_tenant_role", "tenant-manager");
    }
  } catch {
    /** noop */
  }
}

export const MOCK_CREDIT_REQUESTS: Record<string, any>[] = [
  { id: "cr-001", credits: 100, reason: "Monthly top-up for Q3", status: "Approved", createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 8).toISOString() },
  { id: "cr-002", credits: 50, reason: "Additional credits for client workshop series", status: "Pending", createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "cr-003", credits: 200, reason: "Enterprise plan upgrade", status: "Paid", createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 25).toISOString(), paymentLink: "https://pay.example.com/cr-003" },
];
