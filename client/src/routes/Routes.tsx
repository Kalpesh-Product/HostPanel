import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";
import LoginPage from "../pages/LoginPage/LoginPage";
import PersistLogin from "../layouts/PersistLogin";

// Import main pages
import { ReportsPage } from "../pages/Reports";
import { CalendarPage } from "../pages/Calendar/CalendarPage";
import Access from "../pages/Access/Access";
import AccessProfile from "../pages/Access/AccessProfile";
import Notifications from "../pages/Notifications";
import Chat from "../pages/Chat";

// Test page
import TestPage from "../pages/Test/TestPage";
import DashboardLayout from "../pages/Dashboard/DashboardLayout";
// import Attendance from "../pages/Dashboard/Attendance/Attendance"; // OLD - moved to extra-common-modules
import { AttendancePage } from "../pages/Attendance/AttendancePage";
import FrontendDashboard from "../pages/Dashboard/FrontendDashboard/FrontendDashboard";
import { MeetingRoomsPage } from "../pages/Meetings/MeetingRoomsPage";
import FrontendLayout from "../pages/Dashboard/FrontendDashboard/FrontendLayout";
import FrontendData from "../pages/Dashboard/FrontendDashboard/Data/FrontendData";
import FrontendLeads from "../pages/Dashboard/FrontendDashboard/Data/FrontendLeads";
import FrontendWebsiteIssueReports from "../pages/Dashboard/FrontendDashboard/Data/FrontendWebsiteIssueReports";
import FrontendFinLayout from "../pages/Dashboard/FrontendDashboard/FrontendFinance/FrontendFinLayout";
import ThemeGrid from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/ThemeGrid";
import ViewTheme from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/ViewTheme";
import PageDemo from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/PageDemo";
import FrontendSettings from "../pages/Dashboard/FrontendDashboard/FrontendSettings/FrontendSettings";
import AssetsLayout from "../pages/Assets/AssetsLayout";
import AssetsDashboard from "../pages/Assets/AssetsDashboard";
import AssignAssets from "../pages/Assets/ManageAssets/AssignAssets";
import ManageAssets from "../pages/Assets/ManageAssets/ManageAssets";
import AssignedAssets from "../pages/Assets/ManageAssets/AssignedAssets";
import Approvals from "../pages/Assets/ManageAssets/Approvals";
import AssetReports from "../pages/Assets/Reports/AssetReports";
import AssetsCategoriesLayout from "../pages/Assets/AssetsCategory/AssetsCategoriesLayout";
import AssetsCategories from "../pages/Assets/AssetsCategory/AssetsCategories";
import AssetsSubCategories from "../pages/Assets/AssetsCategory/AssetsSubCategories";
import ListOfAssets from "../pages/Assets/AssetsCategory/ListOfAssets";
import AssetsSettings from "../pages/Assets/AssetsSettings/AssetsSettings";
import AssetsBulkUpload from "../pages/Assets/AssetsSettings/BulkUpload";
import TasksLayout from "../pages/Tasks/TasksLayout";
import TasksDashboard from "../pages/Tasks/TasksDashboard";
import MyTaskListLayout from "../pages/Tasks/My-Tasklist/MyTaskListLayout";
import DailyTasks from "../pages/Tasks/My-Tasklist/DailyTasks";
import TeamMember from "../pages/Tasks/TeamMembers/TeamMember";
import ProjectList from "../pages/Tasks/ProjectList/ProjectList";
import EditProject from "../pages/Tasks/ProjectList/EditProject";
import TaskReportLayout from "../pages/Tasks/TaskReports/TaskReportLayout";
import MyTaskReports from "../pages/Tasks/TaskReports/MyTaskReports";
import AssignedTaskReports from "../pages/Tasks/TaskReports/AssignedTaskReports";
import DepartmentTaskReports from "../pages/Tasks/TaskReports/DepartmentTaskReports";
import HREmployeeManagementPage from "../pages/HR/HREmployeeManagementPage";
import HRDocumentsPage from "../pages/HR/HRDocumentsPage";
import HRAttendanceReviewPage from "../pages/HR/HRAttendanceReviewPage";
import HRLeaveRequestsProcessingPage from "../pages/HR/HRLeaveRequestsProcessingPage";
import HRRecruitmentPage from "../pages/HR/HRRecruitmentPage";
import VendorTable from "../components/Pages/VendorTable";
import AssetsHome from "../pages/Assets/AssetsHome";
import ManageAssetsHome from "../pages/Assets/ManageAssetsHome";
import { AssetsPage } from "../pages/Assets/AssetsPage";
import LogPage from "../pages/LogPage";
import AccessPages from "../pages/Access/AccessPages";
import ModulePermissions from "../pages/Access/ModulePermissions";
import CreateWebsite from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/CreateWebsite";
import EditWebsite from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/EditWebsite";
import Websites from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/Websites";
import WebsitesLayout from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/WebsitesLayout";
import InActiveWebsites from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/InActiveWebsites";
import WebsiteBuilderTypeActions from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/WebsiteBuilderTypeActions";
import WebsiteBuilderReviews from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/WebsiteBuilderReviews";
import VerticalPicker from "../components/VerticalPicker";

import Companies from "../pages/Dashboard/FrontendDashboard/Companies";
import CompanyLeads from "../pages/Dashboard/FrontendDashboard/CompanyLeads";
import CompanySettingsDashboard from "../pages/Dashboard/FrontendDashboard/CompanySettingsDashboard";
import NomadListing from "../pages/Dashboard/FrontendDashboard/NomadListing";
import PocDetails from "../pages/Dashboard/FrontendDashboard/PocDetails";
import NomadListingsOverview from "../pages/Dashboard/FrontendDashboard/NomadListingsOverview";
import Services from "../pages/Services";
import EditNomadListing from "../pages/Dashboard/FrontendDashboard/EditNomadListing";
import ForgotPassword from "../pages/LoginPage/ForgotPassword";
import ResetPassword from "../pages/LoginPage/ResetPassword";
import RegisterPage from "../pages/LoginPage/RegisterPage";
import RegisterOtpVerification from "../pages/LoginPage/RegisterOtpVerification";
import FounderWorkspaceSelectionPage from "../pages/LoginPage/FounderWorkspaceSelectionPage";
import CompanyReviews from "../pages/Dashboard/FrontendDashboard/CompanyReviews";
import WonoNomad from "../pages/Dashboard/FrontendDashboard/WonoNomad";
import ModuleCardsLanding from "../pages/Dashboard/FrontendDashboard/ModuleCardsLanding";
import CreateWorkspacePage from "../pages/WorkspaceSetup/CreateWorkspacePage";
import SetupModulesPage from "../pages/WorkspaceSetup/SetupModulesPage";
import FinalizeSetupPage from "../pages/WorkspaceSetup/FinalizeSetupPage";
import OrganizationPage from "../pages/Organization/OrganizationPage";
import UnitSettingsPage from "../pages/UnitSettings/UnitSettingsPage";
import UnitManagementPage from "../pages/UnitSettings/UnitManagementPage";
import CustomerSupportPage from "../pages/CustomerSupport/CustomerSupportPage";
import TenantCompaniesPage from "../pages/Sales/TenantCompanies/TenantCompaniesPage";
import TenantCompanyDetailPage from "../pages/Sales/TenantCompanies/TenantCompanyDetailPage";
import ResourcePricingPage from "../pages/Sales/ResourcePricing/Resource&Pricing";
import LeadsManagementPage from "../pages/Sales/LeadsManagement/LeadsManagementPage";
import SalesArchitecturePage from "../pages/Sales/SalesArchitecture/SalesArchitecturePage";
import AdministrationTenantCompaniesPage from "../pages/Administration/TenantCompanies/TenantCompaniesPage";
import AdministrationBookingsPage from "../pages/Administration/Bookings/BookingsPage";
import AdministrationResourceManagementPage from "../pages/Administration/ResourceManagement/ResourceManagementPage";
import AdministrationHousekeepingPage from "../pages/Administration/HouseKeeping/HousekeepingPage";
import { TicketsPage } from "../pages/Tickets/TicketsPage";
import TenantDashboardPage from "../pages/tenant/TenantDashboardPage";
import TenantMeetingRoomBookingPage from "../pages/tenant/TenantMeetingRoomBookingPage";
import TenantBookingHistoryPage from "../pages/tenant/TenantBookingHistoryPage";
import TenantBuyCreditsPage from "../pages/tenant/TenantBuyCreditsPage";
import TenantTicketsPage from "../pages/tenant/TenantTicketsPage";
import { InventoryPage } from "../pages/Inventory/InventoryPage";
import { DepartmentInventoryPage } from "../pages/Inventory/DepartmentInventoryPage";
import { FinancePage } from "../pages/Finance/FinancePage";
import { TasksPage } from "../pages/Tasks/TasksPage";
import { LeaveRequestsPage } from "../pages/LeaveRequests/LeaveRequestsPage";

// Missing imports - added to fix ESLint errors
import EditTemplate from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/EditTemplate";
import DepartmentAssetCommon from "../components/Pages/DepartmentAssetCommon";
import MonthlyInvoiceCommon from "../components/Pages/MonthlyInvoiceCommon";
import Vendor from "../components/Vendor";
import ViewVendor from "../components/vendor/ViewVendor";
import PaymentScheduleCommon from "../components/Pages/PaymentScheduleCommon";
import Reimbursement from "../components/Pages/Reimbursement";
import BudgetPage from "../components/Pages/BudgetPage";
import SopUpload from "../components/Pages/SopUpload";
import PolicyUpload from "../components/Pages/PolicyUpload";
import AccessGrant from "../components/Tables/AccessGrantTable";
import ProfileLayout from "../pages/Profile/ProfileLayout";
import UserDetails from "../pages/Profile/UserDetails";
import CompanyProfile from "../pages/Profile/CompanyProfile";
import ChangePassword from "../pages/Profile/ChangePassword";
import { AssignedAssetsTab } from "../pages/Profile/AssignedAssetsTab";
import PerformanceLayout from "../pages/Performance/PerformanceLayout";
import PerformanceHome from "../pages/Performance/PerformanceHome";
import DepartmentPerformanceLayout from "../pages/Performance/DepartmentPerformanceLayout";
import PerformanceKra from "../pages/Performance/DepartmentDetails/PerformanceKra";
import PerformanceMonthly from "../pages/Performance/DepartmentDetails/PerformanceMonthly";
import PerformanceAnnual from "../pages/Performance/DepartmentDetails/PerformanceAnnual";
import DepartmentTasksLayout from "../pages/Tasks/DepartmentTasks/DepartmentTasksLayout";
import DepartmentTasks from "../pages/Tasks/DepartmentTasks/DepartmentTasks";
import TasksDepartmentLayout from "../pages/Tasks/DepartmentTasks/TasksDepartmentLayout";
import TasksViewDepartment from "../pages/Tasks/DepartmentTasks/TasksViewDepartment";
import VisitorLayout from "../pages/Visitors/VisitorLayout";
import VisitorManagement from "../pages/Visitors/VisitorManagement";
import VisitorDashboard from "../pages/Visitors/VisitorDashboard";
import AddVisitor from "../pages/Visitors/Forms/AddVisitor";
import AddClient from "../pages/Visitors/Forms/AddClient";
import ManageVisitorLayout from "../pages/Visitors/ManageVisitorLayout";
import ManageVisitors from "../pages/Visitors/ManageVisitors";
import ExternalClients from "../pages/Visitors/ExternalClients";
import VisitorTeamMembers from "../pages/Visitors/VisitorTeamMembers";
import VisitorReports from "../pages/Visitors/VisitorReports";
import VisitorReviews from "../pages/Visitors/VisitorReviews";
import VisitorSettings from "../pages/Visitors/VisitorSettings/VisitorSettings";
import VisitorBulkUpload from "../pages/Visitors/VisitorSettings/VisitorBulkUpload";
import Unauthorized from "../pages/Unauthorized";
import NotFoundPage from "../pages/NotFoundPage";

// Placeholder for DepartmentWiseBulkUpload (does not exist yet)
const DepartmentWiseBulkUpload = () => <div>DepartmentWiseBulkUpload - Coming Soon</div>;

function VerticalPickerRoute() {
  const location = useLocation();
  const workspaceId = new URLSearchParams(location.search).get("workspaceId") || "";
  return <VerticalPicker workspaceId={workspaceId} />;
}

export const routes = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/forgot-password/verify",
    element: <RegisterOtpVerification />,
  },
  {
    path: "/forgot-password/reset",
    element: <ResetPassword />,
  },
  {
    path: "/reset-password/:token",
    element: <ResetPassword />,
  },
  {
    path: "/register/:token",
    element: <RegisterPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/register/:token/verify",
    element: <RegisterOtpVerification />,
  },
          {
            path: "/register/verify",
            element: <RegisterOtpVerification />,
          },
          {
            path: "/select-workspace",
            element: <FounderWorkspaceSelectionPage />,
          },
  {
    path: "/signup/:token",
    element: <RegisterPage />,
  },
  {
    path: "/signup/:token/verify",
    element: <RegisterOtpVerification />,
  },
  {
    path: "/website-preview",
    element: <PageDemo />,
  },
  {
    path: "/website-preview/*",
    element: <PageDemo />,
  },

  {
    element: <PersistLogin />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: "/create-workspace",
            element: <CreateWorkspacePage />,
          },
          {
            path: "/create-workspace/modules",
            element: <SetupModulesPage />,
          },
          {
            path: "/create-workspace/finalize",
            element: <FinalizeSetupPage />,
          },
          {
            path: "/",
            // path: "/host",
            element: <MainLayout />,
            children: [
              {
                path: "dashboard",
                element: <DashboardLayout />,
                children: [
                  {
                    index: true, // login lands here
                    element: <CompanySettingsDashboard />,
                  },
                  // {
                  //   path: "attendance",
                  //   element: <Attendance />, // OLD - moved to extra-common-modules
                  // },
                  {
                    path: "nomad-listings",
                    element: <NomadListingsOverview />,
                  },
                  {
                    path: "nomad-listings/add",
                    element: <NomadListing />,
                  },
                  {
                    path: "nomad-listings/:listingId",
                    element: <EditNomadListing />,
                  },
                  {
                    path: "website-builder",
                    element: <FrontendLayout />,
                    children: [
                      { index: true, element: <WebsiteBuilderTypeActions type="dynamic" /> },
                      { path: "select-theme", element: <ThemeGrid /> },
                      { path: "view-theme", element: <ViewTheme /> },
                      { path: "leads", element: <CompanyLeads /> },
                      { path: "live-demo", element: <PageDemo /> },
                      { path: "edit-website", element: <EditWebsite /> }, // no param
                      {
                        path: "edit-website/:website",
                        element: <EditWebsite />,
                      }, // with param
                      { path: "dynamic", element: <WebsiteBuilderTypeActions type="dynamic" /> },
                      { path: "dynamic/create-website", element: <CreateWebsite /> },
                      { path: "dynamic/leads", element: <CompanyLeads /> },
                      { path: "dynamic/reviews", element: <WebsiteBuilderReviews /> },
                      // Dynamic-only mode:
                      // { path: "static", element: <WebsiteBuilderTypeActions type="static" /> },
                      // { path: "static/select-vertical", element: <VerticalPickerRoute /> },
                      // { path: "static/create-website", element: <CreateWebsite /> },
                      // { path: "static/leads", element: <CompanyLeads /> },
                      {
                        path: "edit-website/:website",
                        element: <EditWebsite />,
                      },

                      {
                        path: "edit-theme/:templateName/:pageName",
                        element: <EditTemplate />,
                      },
                      {
                        path: "data",
                        element: <FrontendData />,
                        children: [
                          {
                            index: true,
                            path: "leads",
                            element: <FrontendLeads />,
                          },
                          {
                            path: "asset-list",
                            element: <DepartmentAssetCommon />,
                          },
                          {
                            path: "website-issue-reports",
                            element: <FrontendWebsiteIssueReports />,
                          },
                          {
                            path: "monthly-invoice-reports",
                            element: <MonthlyInvoiceCommon />,
                          },
                          { path: "vendor", element: <VendorTable /> },
                          {
                            path: "vendor/vendor-onboard",
                            element: <Vendor />,
                          },
                          { path: "vendor/:id", element: <ViewVendor /> },
                        ],
                      },
                      {
                        path: "settings",
                        element: <FrontendSettings />,
                        children: [
                          {
                            path: "bulk-upload",
                            element: <DepartmentWiseBulkUpload />,
                          },
                          { path: "sops", element: <SopUpload /> },
                          { path: "policies", element: <PolicyUpload /> },
                        ],
                      },
                      {
                        path: "finance",
                        element: <FrontendFinLayout />,
                        children: [
                          { path: "budget", element: <BudgetPage /> },
                          {
                            path: "payment-schedule",
                            element: <PaymentScheduleCommon />,
                          },
                          { path: "voucher", element: <Reimbursement /> },
                        ],
                      },
                    ],
                  },
                  {
                    path: "poc-details",
                    element: <PocDetails />,
                  },
                  {
                    path: "tenant",
                    children: [
                      { index: true, element: <TenantDashboardPage /> },
                      { path: "meeting-room-booking", element: <TenantMeetingRoomBookingPage /> },
                      { path: "booking-history", element: <TenantBookingHistoryPage /> },
                      { path: "buy-credits", element: <TenantBuyCreditsPage /> },
                      { path: "tickets", element: <TenantTicketsPage /> },
                      { path: "profile", element: <Navigate to="/profile/my-profile" replace /> },
                    ],
                  },
                ],
              },

              {
                path: "company-reviews",
                element: <CompanyReviews />,
              },

              {
                path: "company-settings",
                element: <Outlet />,
                children: [
                  {
                    index: true, // login lands here
                    element: <ModuleCardsLanding section="company-settings" />,
                  },

                  {
                    path: "wono-nomad",
                    element: <WonoNomad />,
                  },
                  {
                    path: "nomad-listings",
                    element: <NomadListingsOverview />,
                  },
                  {
                    path: "nomad-listings/add",
                    element: <NomadListing />,
                  },
                  {
                    path: "nomad-listings/:listingId",
                    element: <EditNomadListing />,
                  },
                  {
                    path: "reviews",
                    element: <CompanyReviews />,
                  },
                  {
                    path: "website-builder",
                    element: <FrontendLayout />,
                    children: [
                      { index: true, element: <WebsiteBuilderTypeActions type="dynamic" /> },
                      { path: "select-theme", element: <ThemeGrid /> },
                      { path: "view-theme", element: <ViewTheme /> },
                      { path: "leads", element: <CompanyLeads /> },
                      { path: "live-demo", element: <PageDemo /> },
                      { path: "edit-website", element: <EditWebsite /> }, // no param
                      {
                        path: "edit-website/:website",
                        element: <EditWebsite />,
                      }, // with param
                      { path: "dynamic", element: <WebsiteBuilderTypeActions type="dynamic" /> },
                      { path: "dynamic/create-website", element: <CreateWebsite /> },
                      { path: "dynamic/leads", element: <CompanyLeads /> },
                      { path: "dynamic/reviews", element: <WebsiteBuilderReviews /> },
                      // Dynamic-only mode:
                      // { path: "static", element: <WebsiteBuilderTypeActions type="static" /> },
                      // { path: "static/select-vertical", element: <VerticalPickerRoute /> },
                      // { path: "static/create-website", element: <CreateWebsite /> },
                      // { path: "static/leads", element: <CompanyLeads /> },
                      {
                        path: "edit-website/:website",
                        element: <EditWebsite />,
                      },

                      {
                        path: "edit-theme/:templateName/:pageName",
                        element: <EditTemplate />,
                      },
                      {
                        path: "data",
                        element: <FrontendData />,
                        children: [
                          {
                            index: true,
                            path: "leads",
                            element: <FrontendLeads />,
                          },
                          {
                            path: "asset-list",
                            element: <DepartmentAssetCommon />,
                          },
                          {
                            path: "website-issue-reports",
                            element: <FrontendWebsiteIssueReports />,
                          },
                          {
                            path: "monthly-invoice-reports",
                            element: <MonthlyInvoiceCommon />,
                          },
                          { path: "vendor", element: <VendorTable /> },
                          {
                            path: "vendor/vendor-onboard",
                            element: <Vendor />,
                          },
                          { path: "vendor/:id", element: <ViewVendor /> },
                        ],
                      },
                      {
                        path: "settings",
                        element: <FrontendSettings />,
                        children: [
                          {
                            path: "bulk-upload",
                            element: <DepartmentWiseBulkUpload />,
                          },
                          { path: "sops", element: <SopUpload /> },
                          { path: "policies", element: <PolicyUpload /> },
                        ],
                      },
                      {
                        path: "finance",
                        element: <FrontendFinLayout />,
                        children: [
                          { path: "budget", element: <BudgetPage /> },
                          {
                            path: "payment-schedule",
                            element: <PaymentScheduleCommon />,
                          },
                          { path: "voucher", element: <Reimbursement /> },
                        ],
                      },
                    ],
                  },
                  {
                    path: "poc-details",
                    element: <PocDetails />,
                  },
                  {
                    path: "organization-management",
                    element: <OrganizationPage />,
                  },
                  {
                    path: "access-grants",
                    element: <AccessGrant />,
                  },
                  {
                    path: "workspace-settings",
                    element: <UnitSettingsPage />,
                  },
                  {
                    path: "workspace-management",
                    element: <UnitManagementPage />,
                  },
                  {
                    path: "customer-support",
                    element: <CustomerSupportPage />,
                  },
                ],
              },
              {
                path: "key-apps",
                element: <ModuleCardsLanding section="key-apps" />,
              },
              {
                path: "module-sections/:sectionId/:departmentId",
                element: <ModuleCardsLanding />,
              },
              {
                path: "extra-common-modules/attendance",
                element: <AttendancePage />,
              },
              {
                path: "extra-common-modules/assets",
                element: <AssetsPage />,
              },
              {
                path: "extra-common-modules/inventory",
                element: <InventoryPage />,
              },
              {
                path: "extra-common-modules/department-inventory",
                element: <DepartmentInventoryPage />,
              },
              {
                path: "extra-common-modules/finance-management",
                element: <FinancePage />,
              },
              {
                path: "extra-common-modules/reports",
                element: <ReportsPage />,
              },
              {
                path: "extra-common-modules/tasks",
                element: <TasksPage />,
              },
              {
                path: "leave-requests",
                element: <LeaveRequestsPage />,
              },
              {
                path: "module-sections/:sectionId",
                element: <ModuleCardsLanding />,
              },
              {
                path: "services",
                element: <Services />,
              },
              {
                path: "reports",
                element: <ReportsPage />,
              },
              {
                path: "calendar",
                element: <CalendarPage />,
              },
              {
                path: "access",
                element: <Access />,
              },
              {
                path: "access/permissions",
                element: <AccessProfile />,
              },
              {
                path: "access/permissions/:module",
                element: <ModulePermissions />,
              },
              {
                path: "access/permissions/pages",
                element: <AccessPages />,
              },
              {
                path: "notifications",
                element: <Notifications />,
              },
              {
                path: "chat",
                element: <Chat />,
              },
              {
                path: "profile",
                element: <ProfileLayout />,
                children: [
                  {
                    path: "my-profile",
                    element: <UserDetails />,
                  },
                  {
                    path: "company-profile",
                    element: <CompanyProfile />,
                  },
                  {
                    path: "change-password",
                    element: <ChangePassword pageTitle="Change Password" />,
                  },
                  {
                    path: "assigned-assets",
                    element: <AssignedAssetsTab />,
                  },
                  // {
                  //   path: "permissions",
                  //   element: <AccessGrant />,
                  // },
                  // {
                  //   path: "HR",
                  //   element: <HrCommonLayout />,
                  //   children: [
                  //     {
                  //       path: "attendance",
                  //       element: <HrCommonAttendance />,
                  //     },
                  //     {
                  //       path: "attendance-correction-requests",
                  //       element: <HrCommonAttandenceRequests />,
                  //     },
                  //     {
                  //       path: "leaves",
                  //       element: <HrCommonLeaves />,
                  //     },
                  //     {
                  //       path: "agreements",
                  //       element: <HrCommonAgreements />,
                  //     },
                  //     {
                  //       path: "company-handbook",
                  //       element: <HrCommonHandbook />,
                  //     },
                  //     {
                  //       path: "company-handbook/:department",
                  //       element: <HrCommonDocuments />,
                  //     },
                  //     {
                  //       path: "payslips",
                  //       element: <HrCommonPayslips />,
                  //     },
                  //   ],
                  // },
              // {
                  //   path: "my-assets",
                  //   element: <MyAssets />,
                  // },
                  // {
                  //   path: "my-meetings",
                  //   element: <MeetingRoomCredits />,
                  // },
                  // {
                  //   path: "tickets-history",
                  //   element: <TicketsHistory />,
                  // },
                ],
              },
              {
                path: "test",
                element: <TestPage />,
              },

              {
                path: "tickets",
                children: [
                  {
                    index: true,
                    element: <TicketsPage />,
                  },
                ],
              },
              {
                path: "meetings",
                children: [
                  {
                    path: "meeting-rooms",
                    element: <MeetingRoomsPage />,
                  },
                ],
              },
              {
                path: "tickets-center",
                element: <Navigate to="/tickets" replace />,
              },
              {
                path: "assets",
                element: <AssetsLayout />,
                children: [
                  {
                    path: "",
                    element: <AssetsDashboard />,
                  },
                  {
                    path: "view-assets",
                    element: <AssetsHome />,
                  },
                  {
                    path: "view-assets/:department",
                    element: <AssetsCategoriesLayout />,
                    children: [
                      {
                        path: "assets-categories",
                        index: true,
                        element: <AssetsCategories />,
                      },
                      {
                        path: "assets-sub-categories",
                        element: <AssetsSubCategories />,
                      },
                      {
                        path: "list-of-assets",
                        element: <ListOfAssets />,
                      },
                    ],
                  },
                  {
                    path: "manage-assets",
                    element: <ManageAssetsHome />,
                  },
                  {
                    path: "manage-assets/:department",
                    element: <ManageAssets />,
                    children: [
                      {
                        path: "assign-assets",
                        element: <AssignAssets />,
                      },
                      {
                        path: "assigned-assets",
                        element: <AssignedAssets />,
                      },
                      {
                        path: "approvals",
                        element: <Approvals />,
                      },
                    ],
                  },

                  {
                    path: "reports",
                    element: <AssetReports />,
                  },
                  {
                    path: "settings",
                    element: <AssetsSettings />,
                    children: [
                      {
                        path: "bulk-upload",
                        element: <AssetsBulkUpload />,
                      },
                    ],
                  },
                ],
              },
              {
                path: "performance",
                element: <PerformanceLayout />,
                children: [
                  {
                    path: "",
                    element: <PerformanceHome />,
                    index: true,
                  },
                  {
                    path: ":department",
                    element: <DepartmentPerformanceLayout />,
                    children: [
                      {
                        path: "daily-KRA",
                        element: <PerformanceKra />,
                      },
                      {
                        path: "monthly-KPA",
                        element: <PerformanceMonthly />,
                      },
                      {
                        path: "annual-KPA",
                        element: <PerformanceAnnual />,
                      },
                    ],
                  },
                ],
              },
              {
                path: "tasks", // Parent path
                element: <TasksLayout />, // Parent component for tasks
                children: [
                  {
                    path: "", // Default route for /app/tasks
                    element: <TasksDashboard />, // Dashboard is rendered by default
                    index: true,
                  },
                  {
                    path: "department-tasks",
                    element: <DepartmentTasksLayout />,
                    children: [
                      {
                        path: "",
                        element: <DepartmentTasks />,
                        index: true,
                      },
                      {
                        path: ":department",
                        element: <TasksDepartmentLayout />,
                        children: [
                          {
                            path: "",
                            element: <TasksViewDepartment />,
                            index: true,
                          },
                          {
                            path: "monthly-KPA",
                            element: <PerformanceMonthly />,
                          },
                          {
                            path: "Annual-KRA",
                            element: <PerformanceAnnual />,
                          },
                        ],
                      },
                    ],
                  },
                  {
                    path: "project-list/edit-project",
                    element: <ProjectList />,
                  },
                  {
                    path: "project-list/edit-project/:id",
                    element: <EditProject />,
                  },
                  {
                    path: "my-tasks",
                    element: <MyTaskListLayout />, // This is your first page
                    children: [
                      {
                        path: "",
                        index: true,
                        element: <DailyTasks />,
                      },
                    ],
                  },
                  {
                    path: "team-members",
                    element: <TeamMember />,
                  },
                  {
                    path: "manage-assets",
                    element: <ManageAssets />,
                    children: [
                      {
                        path: "assign-assets",
                        element: <AssignAssets />,
                      },
                      {
                        path: "assigned-assets",
                        element: <AssignedAssets />,
                      },
                      {
                        path: "approvals",
                        element: <Approvals />,
                      },
                    ],
                  },

                  {
                    path: "reports",
                    element: <TaskReportLayout />,
                    children: [
                      {
                        path: "my-task-reports",
                        element: <MyTaskReports />,
                      },
                      {
                        path: "assigned-task-reports",
                        element: <AssignedTaskReports />,
                      },
                      {
                        path: "department-task-reports",
                        element: <DepartmentTaskReports />,
                      },
                    ],
                  },
                  {
                    path: "settings",
                    element: <AssetsSettings />,
                    children: [
                      {
                        path: "bulk-upload",
                        element: <AssetsBulkUpload />,
                      },
                    ],
                  },
                ],
              },
              {
                path: "visitors", // Parent path
                element: <VisitorLayout />, // Parent component for Visitors
                children: [
                  {
                    path: "", // Default route for /app/visitors
                    element: <VisitorManagement />,
                    index: true,
                  },
                  {
                    path: "dashboard",
                    element: <VisitorDashboard />,
                  },
                  {
                    path: "add-visitor", // Page with form to Add a new Visitor
                    element: <AddVisitor />,
                  },
                  {
                    path: "add-client", // Page with form to Add a new Visitor
                    element: <AddClient />,
                  },
                  {
                    path: "visitor-management",
                    element: <VisitorManagement />,
                  },
                  {
                    path: "manage-visitors",
                    element: <ManageVisitorLayout />,
                    children: [
                      {
                        path: "internal-visitors", // Page with table showing a list of all visitors
                        element: <ManageVisitors />,
                        index: true,
                      },
                      {
                        path: "external-clients", // Page with table showing a list of all visitors
                        element: <ExternalClients />,
                        index: true,
                      },
                    ],
                  },

                  {
                    path: "team-members", // Page with table showing a list of all the team members(receptionists)
                    element: <VisitorTeamMembers />,
                  },
                  {
                    path: "reports", // Page with table showing a list of all the visitor reports
                    element: <VisitorReports />,
                  },
                  {
                    path: "reviews", // Page with table showing a list of all the visitor reviews
                    element: <VisitorReviews />,
                  },
                  {
                    path: "settings",
                    element: <VisitorSettings />,
                    children: [
                      {
                        path: "bulk-upload",
                        element: <VisitorBulkUpload />,
                      },
                    ],
                  },
                ],
              },
              {
                path: "sales-crm",
                children: [
                  {
                    path: "tenant-companies",
                    element: <TenantCompaniesPage />,
                  },
                  {
                    path: "tenant-companies/:id",
                    element: <TenantCompanyDetailPage />,
                  },
                  {
                    path: "resource-pricing",
                    element: <ResourcePricingPage />,
                  },
                  {
                    path: "leads-management",
                    element: <LeadsManagementPage />,
                  },
                  {
                    path: "sales-architecture",
                    element: <SalesArchitecturePage />,
                  },
                ],
              },
              {
                path: "administration",
                children: [
                  {
                    path: "tenant-companies",
                    element: <AdministrationTenantCompaniesPage />,
                  },
                  {
                    path: "bookings",
                    element: <AdministrationBookingsPage />,
                  },
                  {
                    path: "resource-management",
                    element: <AdministrationResourceManagementPage />,
                  },
                  {
                    path: "house-keeping",
                    element: <AdministrationHousekeepingPage />,
                  },
                ],
              },
              {
                path: "hr",
                children: [
                  {
                    path: "employee-management",
                    element: <HREmployeeManagementPage />,
                  },
                  {
                    path: "documents",
                    element: <HRDocumentsPage />,
                  },
                  {
                    path: "attendance-review",
                    element: <HRAttendanceReviewPage />,
                  },
                  {
                    path: "leave-request-processing",
                    element: <HRLeaveRequestsProcessingPage />,
                  },
                  {
                    path: "recruitment",
                    element: <HRRecruitmentPage />,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: "secret-logs",
        element: <LogPage />,
      },
      {
        path: "unauthorized",
        element: <Unauthorized />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

