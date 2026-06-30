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
  founderCore: "Founder Core Modules",
  departmentAccesses: "Department Accesses",
  tenantPortal: "Tenant Portal",
  general: "General",
} as const;

const BREADCRUMB_MATCHERS: BreadcrumbMatcher[] = [
  {
    pattern: "/module-sections/common-modules",
    crumbs: [{ label: SECTION_LABELS.common }],
  },
  {
    pattern: "/module-sections/extra-common-modules",
    crumbs: [{ label: SECTION_LABELS.extraCommon }],
  },
  {
    pattern: "/module-sections/key-apps",
    crumbs: [{ label: SECTION_LABELS.keyApps }],
  },
  {
    pattern: "/module-sections/founder-core-modules",
    crumbs: [{ label: SECTION_LABELS.founderCore }],
  },
  {
    pattern: "/module-sections/department-accesses",
    crumbs: [{ label: SECTION_LABELS.departmentAccesses }],
  },
  {
    pattern: "/module-sections/department-accesses/hr-department",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "HR Department" },
    ],
  },
  {
    pattern: "/module-sections/department-accesses/administration-department",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "Administration Department" },
    ],
  },
  {
    pattern: "/module-sections/department-accesses/sales-department",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "Sales Department" },
    ],
  },
  {
    pattern: "/module-sections/department-accesses/finance-department",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "Finance Department" },
    ],
  },
  {
    pattern: "/module-sections/department-accesses/maintenance-department",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "Maintenance Department" },
    ],
  },
  {
    pattern: "/module-sections/department-accesses/tech-department",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "Tech Department" },
    ],
  },
  {
    pattern: "/module-sections/department-accesses/it-department",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
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
    pattern: "/dashboard",
    crumbs: [
      { label: SECTION_LABELS.common, path: "/module-sections/common-modules" },
      { label: "Dashboard" },
    ],
  },
  {
    pattern: "/calendar",
    crumbs: [
      { label: SECTION_LABELS.common, path: "/module-sections/common-modules" },
      { label: "Calendar" },
    ],
  },
  {
    pattern: "/tickets",
    crumbs: [
      { label: SECTION_LABELS.common, path: "/module-sections/common-modules" },
      { label: "Tickets" },
    ],
  },
  {
    pattern: "/meetings/meeting-rooms",
    crumbs: [
      { label: SECTION_LABELS.common, path: "/module-sections/common-modules" },
      { label: "Meeting Room Booking" },
    ],
  },
  {
    pattern: "/company-settings/customer-support",
    crumbs: [
      { label: SECTION_LABELS.common, path: "/module-sections/common-modules" },
      { label: "Customer Support" },
    ],
  },
  {
    pattern: "/extra-common-modules/attendance",
    crumbs: [
      { label: SECTION_LABELS.common, path: "/module-sections/common-modules" },
      { label: "Attendance" },
    ],
  },
  {
    pattern: "/extra-common-modules/tasks",
    crumbs: [
      { label: SECTION_LABELS.common, path: "/module-sections/common-modules" },
      { label: "Tasks" },
    ],
  },
  {
    pattern: "/leave-requests",
    crumbs: [
      { label: SECTION_LABELS.common, path: "/module-sections/common-modules" },
      { label: "Leave Requests" },
    ],
  },
  {
    pattern: "/visitors/visitor-management",
    fromSection: "department-accesses",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "Administration Department", path: "/module-sections/department-accesses/administration-department" },
      { label: "Visitor Management" },
    ],
  },
  {
    pattern: "/visitors/visitor-management",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Visitor Management" },
    ],
  },
  {
    pattern: "/company-settings/wono-nomad",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Wono Nomad" },
    ],
  },
  {
    pattern: "/company-settings/website-builder",
    fromSection: "department-accesses",
    end: false,
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "Tech Department", path: "/module-sections/department-accesses/tech-department" },
      { label: "Website Builder" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/leads",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Leads" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/dynamic/leads",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Leads" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/dynamic/reviews",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Website Reviews" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/dynamic/create-website",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Create Website" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/select-theme",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Select Theme" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/view-theme",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "View Theme" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/live-demo",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Live Demo" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/edit-website",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Edit Website" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/edit-website/:website",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Edit Website" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/edit-theme/:templateName/:pageName",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Edit Theme" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/data/leads",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Leads" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/data/website-issue-reports",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Website Issue Reports" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/data/monthly-invoice-reports",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Monthly Invoice Reports" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/data/vendor",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Vendor" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/data/vendor/vendor-onboard",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Vendor Onboard" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/data/vendor/:id",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Vendor" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/settings/bulk-upload",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Bulk Upload" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/settings/sops",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "SOPs" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/settings/policies",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Policies" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/finance/budget",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Budget" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/finance/payment-schedule",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Payment Schedule" },
    ],
  },
  {
    pattern: "/company-settings/website-builder/finance/voucher",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder", path: "/company-settings/website-builder" },
      { label: "Voucher" },
    ],
  },
  {
    pattern: "/company-settings/website-builder",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Website Builder" },
    ],
  },
  {
    pattern: "/company-settings/organization-management",
    crumbs: [
      { label: SECTION_LABELS.founderCore, path: "/module-sections/founder-core-modules" },
      { label: "Organization Management" },
    ],
  },
  {
    pattern: "/company-settings/access-grants",
    crumbs: [
      { label: SECTION_LABELS.founderCore, path: "/module-sections/founder-core-modules" },
      { label: "Access Grants" },
    ],
  },
  {
    pattern: "/company-settings/workspace-settings",
    crumbs: [
      { label: SECTION_LABELS.founderCore, path: "/module-sections/founder-core-modules" },
      { label: "Unit Settings" },
    ],
  },
  {
    pattern: "/company-settings/workspace-management",
    crumbs: [
      { label: SECTION_LABELS.founderCore, path: "/module-sections/founder-core-modules" },
      { label: "Unit Management" },
    ],
  },
  {
    pattern: "/administration/tenant-companies",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "Administration Department", path: "/module-sections/department-accesses/administration-department" },
      { label: "Tenant Companies" },
    ],
  },
  {
    pattern: "/administration/bookings",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "Administration Department", path: "/module-sections/department-accesses/administration-department" },
      { label: "Bookings" },
    ],
  },
  {
    pattern: "/administration/resource-management",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "Administration Department", path: "/module-sections/department-accesses/administration-department" },
      { label: "Resource Management" },
    ],
  },
  {
    pattern: "/administration/house-keeping",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "Administration Department", path: "/module-sections/department-accesses/administration-department" },
      { label: "House Keeping" },
    ],
  },
  {
    pattern: "/sales-crm/leads-management",
    fromSection: "department-accesses",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "Sales Department", path: "/module-sections/department-accesses/sales-department" },
      { label: "Leads Management" },
    ],
  },
  {
    pattern: "/sales-crm/leads-management",
    crumbs: [
      { label: SECTION_LABELS.keyApps, path: "/module-sections/key-apps" },
      { label: "Leads Management" },
    ],
  },
  {
    pattern: "/sales-crm/tenant-companies/:id",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "Sales Department", path: "/module-sections/department-accesses/sales-department" },
      { label: "Tenant Companies", path: "/sales-crm/tenant-companies" },
      { label: "Tenant Details" },
    ],
  },
  {
    pattern: "/sales-crm/tenant-companies",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "Sales Department", path: "/module-sections/department-accesses/sales-department" },
      { label: "Tenant Companies" },
    ],
  },
  {
    pattern: "/sales-crm/resource-pricing",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "Sales Department", path: "/module-sections/department-accesses/sales-department" },
      { label: "Resource & Pricing" },
    ],
  },
  {
    pattern: "/sales-crm/sales-architecture",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "Sales Department", path: "/module-sections/department-accesses/sales-department" },
      { label: "Sales Architecture" },
    ],
  },
  {
    pattern: "/hr/employee-management",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "HR Department", path: "/module-sections/department-accesses/hr-department" },
      { label: "Employee Management" },
    ],
  },
  {
    pattern: "/hr/documents",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "HR Department", path: "/module-sections/department-accesses/hr-department" },
      { label: "Documents" },
    ],
  },
  {
    pattern: "/hr/attendance-review",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "HR Department", path: "/module-sections/department-accesses/hr-department" },
      { label: "Attendance Review" },
    ],
  },
  {
    pattern: "/hr/leave-request-processing",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "HR Department", path: "/module-sections/department-accesses/hr-department" },
      { label: "Leave Request Processing" },
    ],
  },
  {
    pattern: "/hr/recruitment",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "HR Department", path: "/module-sections/department-accesses/hr-department" },
      { label: "Recruitment" },
    ],
  },
  {
    pattern: "/hr/payroll-management",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "HR Department", path: "/module-sections/department-accesses/hr-department" },
      { label: "Payroll Management" },
    ],
  },
  {
    pattern: "/hr/exit-management",
    crumbs: [
      { label: SECTION_LABELS.departmentAccesses, path: "/module-sections/department-accesses" },
      { label: "HR Department", path: "/module-sections/department-accesses/hr-department" },
      { label: "Exit Management" },
    ],
  },
  {
    pattern: "/dashboard/tenant",
    crumbs: [
      { label: SECTION_LABELS.tenantPortal },
      { label: "Dashboard" },
    ],
  },
  {
    pattern: "/dashboard/tenant/meeting-room-booking",
    crumbs: [
      { label: SECTION_LABELS.tenantPortal },
      { label: "Meeting Room Booking" },
    ],
  },
  {
    pattern: "/dashboard/tenant/booking-history",
    crumbs: [
      { label: SECTION_LABELS.tenantPortal },
      { label: "Booking History" },
    ],
  },
  {
    pattern: "/dashboard/tenant/buy-credits",
    crumbs: [
      { label: SECTION_LABELS.tenantPortal },
      { label: "Buy Credits" },
    ],
  },
  {
    pattern: "/dashboard/tenant/tickets",
    crumbs: [
      { label: SECTION_LABELS.tenantPortal },
      { label: "Tickets" },
    ],
  },
  {
    pattern: "/profile/company-profile",
    crumbs: [
      { label: SECTION_LABELS.general },
      { label: "Profile" },
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

  const breadcrumbs = matchedConfig?.crumbs || buildFallbackCrumbs(location.pathname);

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

  queryParamEntries.forEach(([key, value], index) => {
    breadcrumbsToRender.push(
      <Typography key={`param-${index}-${key}`} color="text.primary">
        {value}
      </Typography>,
    );
  });

  return (
    <div className="rounded-t-md">
      <Breadcrumbs
        separator=">"
        aria-label="breadcrumb"
        sx={{
          "& .MuiBreadcrumbs-ol": {
            fontSize: "1rem !important",
            color: "#1E3D73",
          },
          "& .MuiBreadcrumbs-li": {
            fontSize: "0.9rem !important",
          },
          "& .MuiBreadcrumbs-li .MuiTypography-root": {
            fontSize: "0.9rem !important",
            color: "#1E3D73 !important",
          },
          "& .MuiBreadcrumbs-separator": {
            margin: "0 1rem",
          },
        }}
      >
        {breadcrumbsToRender}
      </Breadcrumbs>
    </div>
  );
};

export default BreadCrumbComponent;
