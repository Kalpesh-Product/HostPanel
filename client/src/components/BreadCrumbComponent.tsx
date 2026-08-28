import { Breadcrumbs, Link, Typography } from "@mui/material";
import { matchPath, useLocation, useNavigate } from "react-router-dom";

type Crumb = {
  label: string;
  path?: string;
};

type BreadcrumbMatcher = {
  pattern: string;
  fromSection?: string;
  end?: boolean;
  crumbs: Crumb[];
};

const SECTION_LABELS = {
  common: "Common Modules",
  extraCommon: "Extra Common Modules",
  keyApps: "Key Apps",
  founderCore: "Core Modules",
  addOns: "Add-Ons",
  departmentAccesses: "Department Accesses",
  tenantPortal: "Tenant Portal",
  profile: "Profile",
  general: "General",
} as const;

const BREADCRUMB_MATCHERS: BreadcrumbMatcher[] = [
  {
    pattern: "/common-modules",
    crumbs: [{ label: SECTION_LABELS.common }],
  },
  {
    pattern: "/extra-common-modules",
    crumbs: [{ label: SECTION_LABELS.extraCommon }],
  },
  {
    pattern: "/key-apps",
    crumbs: [{ label: SECTION_LABELS.keyApps }],
  },
  {
    pattern: "/core-modules",
    crumbs: [{ label: SECTION_LABELS.founderCore }],
  },
  {
    pattern: "/module-sections/add-ons",
    crumbs: [{ label: SECTION_LABELS.addOns }],
  },
  {
    pattern: "/department-accesses",
    crumbs: [{ label: SECTION_LABELS.departmentAccesses }],
  },
  {
    pattern: "/department-accesses/hr-department",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "HR Department" },
    ],
  },
  {
    pattern: "/department-accesses/administration-department",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Administration Department" },
    ],
  },
  {
    pattern: "/department-accesses/sales-department",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Sales Department" },
    ],
  },
  {
    pattern: "/department-accesses/finance-department",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Finance Department" },
    ],
  },
  {
    pattern: "/department-accesses/maintenance-department",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Maintenance Department" },
    ],
  },
  {
    pattern: "/department-accesses/tech-department",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Tech Department" },
    ],
  },
  {
    pattern: "/department-accesses/it-department",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "IT Department" },
    ],
  },
  {
    pattern: "/dashboard/website-builder/dynamic/reviews",
    crumbs: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Website Builder", path: "/dashboard/website-builder" },
      { label: "Website Reviews" },
    ],
  },
  {
    pattern: "/dashboard/website-builder/dynamic/careers",
    crumbs: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Website Builder", path: "/dashboard/website-builder" },
      { label: "Careers" },
    ],
  },
  {
    pattern: "/dashboard",
    crumbs: [
      { label: SECTION_LABELS.common, path: "/common-modules" },
      { label: "Dashboard" },
    ],
  },
  {
    pattern: "/common-modules/calendar",
    crumbs: [
      { label: SECTION_LABELS.common, path: "/common-modules" },
      { label: "Calendar" },
    ],
  },
  {
    pattern: "/common-modules/tickets",
    crumbs: [
      { label: SECTION_LABELS.common, path: "/common-modules" },
      { label: "Tickets" },
    ],
  },
  {
    pattern: "/common-modules/meeting-room-booking",
    crumbs: [
      { label: SECTION_LABELS.common, path: "/common-modules" },
      { label: "Meeting Room Booking" },
    ],
  },
  {
    pattern: "/common-modules/customer-support",
    crumbs: [
      { label: SECTION_LABELS.common, path: "/common-modules" },
      { label: "Customer Support" },
    ],
  },
  {
    pattern: "/common-modules/attendance",
    crumbs: [
      { label: SECTION_LABELS.common, path: "/common-modules" },
      { label: "Attendance" },
    ],
  },
  {
    pattern: "/common-modules/tasks",
    fromSection: "extra-common-modules",
    crumbs: [
      { label: SECTION_LABELS.extraCommon, path: "/extra-common-modules" },
      { label: "Tasks" },
    ],
  },
  {
    pattern: "/common-modules/tasks",
    crumbs: [
      { label: SECTION_LABELS.common, path: "/common-modules" },
      { label: "Tasks" },
    ],
  },
  {
    pattern: "/extra-common-modules/assets",
    crumbs: [
      { label: SECTION_LABELS.extraCommon, path: "/extra-common-modules" },
      { label: "Assets" },
    ],
  },
  {
    pattern: "/extra-common-modules/inventory",
    crumbs: [
      { label: SECTION_LABELS.extraCommon, path: "/extra-common-modules" },
      { label: "Inventory" },
    ],
  },
  {
    pattern: "/extra-common-modules/department-inventory",
    crumbs: [
      { label: SECTION_LABELS.extraCommon, path: "/extra-common-modules" },
      { label: "Department Inventory" },
    ],
  },
  {
    pattern: "/extra-common-modules/finance-management",
    crumbs: [
      { label: SECTION_LABELS.extraCommon, path: "/extra-common-modules" },
      { label: "Finance Management" },
    ],
  },
  {
    pattern: "/extra-common-modules/reports",
    crumbs: [
      { label: SECTION_LABELS.extraCommon, path: "/extra-common-modules" },
      { label: "Reports" },
    ],
  },
  {
    pattern: "/common-modules/leave-requests",
    crumbs: [
      { label: SECTION_LABELS.common, path: "/common-modules" },
      { label: "Leave Requests" },
    ],
  },
  {
    pattern: "/visitors/visitor-management",
    fromSection: "department-accesses",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Administration Department", path: "/department-accesses/administration-department" },
      { label: "Visitor Management" },
    ],
  },
  {
    pattern: "/visitors/visitor-management",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Visitor Management" },
    ],
  },
  {
    pattern: "/key-apps/wono-nomad",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Nomad Listings" },
    ],
  },
  {
    pattern: "/key-apps/nomad-listings/add",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Nomad Listings", path: "/key-apps/wono-nomad" },
      { label: "Listings", path: "/key-apps/nomad-listings" },
      { label: "Add Listing" },
    ],
  },
  {
    pattern: "/key-apps/nomad-listings/:listingId",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Nomad Listings", path: "/key-apps/wono-nomad" },
      { label: "Listings", path: "/key-apps/nomad-listings" },
      { label: "Edit Listing" },
    ],
  },
  {
    pattern: "/key-apps/nomad-listings",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Nomad Listings", path: "/key-apps/wono-nomad" },
      { label: "Listings" },
    ],
  },
  {
    pattern: "/key-apps/reviews",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Nomad Listings", path: "/key-apps/wono-nomad" },
      { label: "Reviews" },
    ],
  },
  {
    pattern: "/key-apps/nomads-leads",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Nomad Listings", path: "/key-apps/wono-nomad" },
      { label: "Leads" },
    ],
  },
  {
    pattern: "/key-apps/all-leads",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "All Leads" },
    ],
  },
  {
    pattern: "/key-apps/website-builder",
    fromSection: "department-accesses",
    end: false,
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Tech Department", path: "/department-accesses/tech-department" },
      { label: "Website Builder" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/leads",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Leads" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/dynamic/leads",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Website Leads" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/dynamic/reviews",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Website Reviews" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/dynamic/careers",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Careers" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/dynamic/create-website",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Create Website" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/select-theme",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Select Theme" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/view-theme",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "View Theme" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/live-demo",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Live Demo" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/edit-website",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Edit Website" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/edit-website/:website",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Edit Website" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/edit-theme/:templateName/:pageName",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Edit Theme" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/data/leads",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Leads" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/data/website-issue-reports",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Website Issue Reports" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/data/monthly-invoice-reports",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Monthly Invoice Reports" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/data/vendor",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Vendor" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/data/vendor/vendor-onboard",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Vendor Onboard" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/data/vendor/:id",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Vendor" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/settings/bulk-upload",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Bulk Upload" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/settings/sops",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "SOPs" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/settings/policies",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Policies" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/finance/budget",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Budget" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/finance/payment-schedule",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Payment Schedule" },
    ],
  },
  {
    pattern: "/key-apps/website-builder/finance/voucher",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder", path: "/key-apps/website-builder" },
      { label: "Voucher" },
    ],
  },
  {
    pattern: "/key-apps/website-builder",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "Website Builder" },
    ],
  },
  {
    pattern: "/key-apps/poc-details",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/key-apps" },
      { label: "POC Details" },
    ],
  },
  {
    pattern: "/core-modules/organization-management",
    crumbs: [
      { label: SECTION_LABELS.founderCore, path: "/core-modules" },
      { label: "Organization Management" },
    ],
  },
  {
    pattern: "/core-modules/access-grants",
    crumbs: [
      { label: SECTION_LABELS.founderCore, path: "/core-modules" },
      { label: "Access Grants" },
    ],
  },
  {
    pattern: "/core-modules/workspace-settings",
    crumbs: [
      { label: SECTION_LABELS.founderCore, path: "/core-modules" },
      { label: "Unit Settings" },
    ],
  },
  {
    pattern: "/core-modules/workspace-management",
    crumbs: [
      { label: SECTION_LABELS.founderCore, path: "/core-modules" },
      { label: "Unit Management" },
    ],
  },
  {
    pattern: "/core-modules/analytics",
    crumbs: [
      { label: SECTION_LABELS.founderCore, path: "/core-modules" },
      { label: "Analytics" },
    ],
  },
  {
    pattern: "/department-accesses/administration-department/tenant-companies",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Administration Department", path: "/department-accesses/administration-department" },
      { label: "Tenant Companies" },
    ],
  },
  {
    pattern: "/department-accesses/administration-department/bookings",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Administration Department", path: "/department-accesses/administration-department" },
      { label: "Bookings" },
    ],
  },
  {
    pattern: "/department-accesses/administration-department/resource-management",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Administration Department", path: "/department-accesses/administration-department" },
      { label: "Resource Management" },
    ],
  },
  {
    pattern: "/department-accesses/administration-department/house-keeping",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Administration Department", path: "/department-accesses/administration-department" },
      { label: "House Keeping" },
    ],
  },
  {
    pattern: "/department-accesses/sales-department/leads-management",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Sales Department", path: "/department-accesses/sales-department" },
      { label: "Leads Management" },
    ],
  },
  {
    pattern: "/department-accesses/sales-department/tenant-companies/:id",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Sales Department", path: "/department-accesses/sales-department" },
      { label: "Tenant Companies", path: "/department-accesses/sales-department/tenant-companies" },
      { label: "Tenant Details" },
    ],
  },
  {
    pattern: "/department-accesses/sales-department/tenant-companies",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Sales Department", path: "/department-accesses/sales-department" },
      { label: "Tenant Companies" },
    ],
  },
  {
    pattern: "/department-accesses/sales-department/resource-pricing",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Sales Department", path: "/department-accesses/sales-department" },
      { label: "Resource & Pricing" },
    ],
  },
  {
    pattern: "/department-accesses/sales-department/sales-architecture",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Sales Department", path: "/department-accesses/sales-department" },
      { label: "Sales Architecture" },
    ],
  },
  {
    pattern: "/department-accesses/hr-department/company-management",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "HR Department", path: "/department-accesses/hr-department" },
      { label: "Company Management" },
    ],
  },
  {
    pattern: "/department-accesses/hr-department/documents",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "HR Department", path: "/department-accesses/hr-department" },
      { label: "Documents" },
    ],
  },
  {
    pattern: "/department-accesses/hr-department/attendance-review",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "HR Department", path: "/department-accesses/hr-department" },
      { label: "Attendance Review" },
    ],
  },
  {
    pattern: "/department-accesses/hr-department/attendance-review/:userId",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "HR Department", path: "/department-accesses/hr-department" },
      { label: "Attendance Review", path: "/department-accesses/hr-department/attendance-review" },
      { label: "Employee Attendance" },
    ],
  },
  {
    pattern: "/department-accesses/hr-department/leave-request-processing",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "HR Department", path: "/department-accesses/hr-department" },
      { label: "Leave Request Processing" },
    ],
  },
  {
    pattern: "/department-accesses/hr-department/recruitment",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "HR Department", path: "/department-accesses/hr-department" },
      { label: "Recruitment" },
    ],
  },
  {
    pattern: "/department-accesses/hr-department/payroll-management",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "HR Department", path: "/department-accesses/hr-department" },
      { label: "Payroll Management" },
    ],
  },
  {
    pattern: "/department-accesses/hr-department/resignation-management",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "HR Department", path: "/department-accesses/hr-department" },
      { label: "Resignation Management" },
    ],
  },
  {
    pattern: "/department-accesses/finance-department/expenses-budget",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Finance Department", path: "/department-accesses/finance-department" },
      { label: "Expenses & Budget" },
    ],
  },
  {
    pattern: "/department-accesses/finance-department/billing-payments",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Finance Department", path: "/department-accesses/finance-department" },
      { label: "Billing & Payments" },
    ],
  },
  {
    pattern: "/department-accesses/finance-department/accounting",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Finance Department", path: "/department-accesses/finance-department" },
      { label: "Accounting" },
    ],
  },
  {
    pattern: "/department-accesses/maintenance-department/repair-logs",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Maintenance Department", path: "/department-accesses/maintenance-department" },
      { label: "Repair Logs" },
    ],
  },
  {
    pattern: "/department-accesses/maintenance-department/amc-scheduler",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "Maintenance Department", path: "/department-accesses/maintenance-department" },
      { label: "AMC Scheduler" },
    ],
  },
  {
    pattern: "/department-accesses/it-department/repair-logs",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "IT Department", path: "/department-accesses/it-department" },
      { label: "Repair Logs" },
    ],
  },
  {
    pattern: "/department-accesses/it-department/system-access",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/department-accesses" },
      { label: "IT Department", path: "/department-accesses/it-department" },
      { label: "System Access" },
    ],
  },
  {
    pattern: "/dashboard/tenant",
    crumbs: [
      { label: SECTION_LABELS.tenantPortal, path: "/dashboard/tenant" },
      { label: "Dashboard" },
    ],
  },
  {
    pattern: "/dashboard/tenant/meeting-room-booking",
    crumbs: [
      { label: SECTION_LABELS.tenantPortal, path: "/dashboard/tenant" },
      { label: "Meeting Room Booking" },
    ],
  },
  {
    pattern: "/dashboard/tenant/booking-history",
    crumbs: [
      { label: SECTION_LABELS.tenantPortal, path: "/dashboard/tenant" },
      { label: "Booking History" },
    ],
  },
  {
    pattern: "/dashboard/tenant/buy-credits",
    crumbs: [
      { label: SECTION_LABELS.tenantPortal, path: "/dashboard/tenant" },
      { label: "Buy Credits" },
    ],
  },
  {
    pattern: "/dashboard/tenant/tickets",
    crumbs: [
      { label: SECTION_LABELS.tenantPortal, path: "/dashboard/tenant" },
      { label: "Tickets" },
    ],
  },
  {
    pattern: "/profile",
    crumbs: [{ label: SECTION_LABELS.profile }],
  },
  {
    pattern: "/profile/company-profile",
    crumbs: [
      { label: SECTION_LABELS.profile, path: "/profile" },
      { label: "Company Profile" },
    ],
  },
  {
    pattern: "/profile/my-profile",
    crumbs: [
      { label: SECTION_LABELS.profile, path: "/profile" },
      { label: "My Profile" },
    ],
  },
  {
    pattern: "/profile/change-password",
    crumbs: [
      { label: SECTION_LABELS.profile, path: "/profile" },
      { label: "Change Password" },
    ],
  },
  {
    pattern: "/profile/assigned-assets",
    crumbs: [
      { label: SECTION_LABELS.profile, path: "/profile" },
      { label: "Assigned Assets" },
    ],
  },
  {
    pattern: "/profile/payslips",
    crumbs: [
      { label: SECTION_LABELS.profile, path: "/profile" },
      { label: "Payslips" },
    ],
  },
  {
    pattern: "/profile/resignation-request",
    crumbs: [
      { label: SECTION_LABELS.profile, path: "/profile" },
      { label: "Resignation Request" },
    ],
  },
];

const toTitleCase = (value: string) =>
  decodeURIComponent(value)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const buildFallbackCrumbs = (pathname: string): Crumb[] => {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return [];

  return segments.map((segment, index) => ({
    label: toTitleCase(segment),
    path: index === segments.length - 1 ? undefined : `/${segments.slice(0, index + 1).join("/")}`,
  }));
};

const BreadCrumbComponent = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const queryParamEntries = Array.from(searchParams.entries());

  const matchedConfig = BREADCRUMB_MATCHERS.find((matcher) => {
    const end = matcher.end !== false;
    const pathMatch = Boolean(matchPath({ path: matcher.pattern, end }, location.pathname));
    if (!pathMatch) return false;
    if (matcher.fromSection) {
      return (location.state as Record<string, unknown>)?.fromSection === matcher.fromSection;
    }
    return true;
  });

  let breadcrumbs = matchedConfig?.crumbs || buildFallbackCrumbs(location.pathname);

  // Modules opened from the Add-Ons page keep Add-Ons as their back link
  // instead of the module's home-section trail. Not on the Add-Ons page
  // itself, where that would duplicate its own crumb.
  if (
    (location.state as Record<string, unknown>)?.fromSection === "add-ons" &&
    breadcrumbs.length > 0 &&
    location.pathname !== "/module-sections/add-ons"
  ) {
    breadcrumbs = [
      { label: SECTION_LABELS.addOns, path: "/module-sections/add-ons" },
      { label: breadcrumbs[breadcrumbs.length - 1].label },
    ];
  }

  const breadcrumbsToRender = breadcrumbs.map((crumb, index) => {
    const isLast = index === breadcrumbs.length - 1 || !crumb.path;

    return isLast ? (
      <Typography key={`${crumb.label}-${index}`} color="text.primary">
        {crumb.label}
      </Typography>
    ) : (
      <Link
        key={`${crumb.label}-${index}`}
        underline="hover"
        color="inherit"
        onClick={() => navigate(crumb.path!)}
        style={{ cursor: "pointer" }}
      >
        {crumb.label}
      </Link>
    );
  });

  const modeParam = searchParams.get("mode");
  queryParamEntries.forEach(([key, value], index) => {
    if (key === "mode") return;
    breadcrumbsToRender.push(
      <Typography key={`param-${index}-${key}`} color="text.primary">
        {value}
      </Typography>,
    );
  });

  if (modeParam === "add") {
    breadcrumbsToRender.push(
      <Typography key="mode-add" color="text.primary">
        Add Employee
      </Typography>,
    );
  }

  return (
    <div className="rounded-t-md">
      <Breadcrumbs
        separator=">"
        aria-label="breadcrumb"
        sx={{
          "& .MuiBreadcrumbs-li, & .MuiBreadcrumbs-li .MuiTypography-root, & .MuiBreadcrumbs-li a": {
            fontSize: "0.875rem !important",
            fontFamily: "Poppins-SemiBold, sans-serif !important",
          },
        }}
      >
        {breadcrumbsToRender}
      </Breadcrumbs>
    </div>
  );
};

export default BreadCrumbComponent;
