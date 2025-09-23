import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";
import LoginPage from "../pages/LoginPage/LoginPage";
import PersistLogin from "../layouts/PersistLogin";

// Import main pages
import Reports from "../pages/Reports";
import Calender from "../pages/Calendar";
import Access from "../pages/Access/Access";
import AccessProfile from "../pages/Access/AccessProfile";
import Notifications from "../pages/Notifications";
import Chat from "../pages/Chat";

// Import tickets pages
import TicketDashboard from "../pages/Tickets/TicketDashboard";
import ManageTickets from "../pages/Tickets/ManageTickets";
import TeamMembers from "../pages/Tickets/TeamMembers";
import TicketReports from "../pages/Tickets/TicketReports";
import RaiseTicket from "../pages/Tickets/RaiseTicket";
import TicketSettingsnew from "../pages/Tickets/TicketSettingsnew";

// Test page
import TestPage from "../pages/Test/TestPage";
import TicketLayout from "../pages/Tickets/TicketLayout";
import DashboardLayout from "../pages/Dashboard/DashboardLayout";
import FrontendDashboard from "../pages/Dashboard/FrontendDashboard/FrontendDashboard";
import MeetingLayout from "../pages/Meetings/MeetingLayout";
import MeetingDashboard from "../pages/Meetings/MeetingDashboard";
import BookMeetings from "../pages/Meetings/BookMeetings";
import ManageMeetings from "../pages/Meetings/ManageMeetings";
import MeetingSettings from "../pages/Meetings/MeetingSettings";
import Reviews from "../pages/Meetings/Reviews";
import MeetingCalendar from "../pages/Meetings/Calendar";
import MeetingReports from "../pages/Meetings/MeetingReports";
import MeetingFormLayout from "../pages/Meetings/MeetingFormLayout";
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
import TaskReportLayout from "../pages/Tasks/TaskReports.jsx/TaskReportLayout";
import MyTaskReports from "../pages/Tasks/TaskReports.jsx/MyTaskReports";
import AssignedTaskReports from "../pages/Tasks/TaskReports.jsx/AssignedTaskReports";
import DepartmentTaskReports from "../pages/Tasks/TaskReports.jsx/DepartmentTaskReports";
import HrCommonLayout from "../pages/HR/HrCommonLayout";
import HrCommonAttendance from "../pages/HR/HrCommonAttendance";
import HrCommonLeaves from "../pages/HR/HrCommonLeaves";
import HrCommonAgreements from "../pages/HR/HrCommonAgreements";
import HrCommonPayslips from "../pages/HR/HrCommonPayslips";
import Unauthorized from "../pages/Unauthorized";
import VisitorLayout from "../pages/Visitors/VisitorLayout";
import VisitorDashboard from "../pages/Visitors/VisitorDashboard";
import AddVisitor from "../pages/Visitors/Forms/AddVisitor";
import ManageVisitors from "../pages/Visitors/ManageVisitors";
import VisitorTeamMembers from "../pages/Visitors/VisitorTeamMembers";
import VisitorReports from "../pages/Visitors/VisitorReports";
import VisitorReviews from "../pages/Visitors/VisitorReviews";
import VisitorSettings from "../pages/Visitors/VisitorSettings/VisitorSettings";
import VisitorBulkUpload from "../pages/Visitors/VisitorSettings/VisitorBulkUpload";
import ProfileLayout from "../pages/Profile/ProfileLayout";
import ChangePassword from "../pages/Profile/ChangePassword";
import AccessGrant from "../pages/Profile/AccessGrant";
import MyAssets from "../pages/Profile/MyAssets";
import MeetingRoomCredits from "../pages/Profile/MeetingRoomCredits";
import TicketsHistory from "../pages/Profile/TicketsHistory";
import EditTemplate from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/EditTemplate";
import NotFoundPage from "../pages/NotFoundPage";
import MonthMeetings from "../pages/MonthMeetings";
import DepartmentWiseTickets from "../pages/Tickets/DepartmentWiseTickets";
import PerformanceLayout from "../pages/Performance/PerformanceLayout";
import PerformanceHome from "../pages/Performance/PerformanceHome";
import DepartmentPerformanceLayout from "../pages/Performance/DepartmentPerformanceLayout";
import PerformanceKra from "../pages/Performance/DepartmentDetails/PerformanceKra";
import PerformanceAnnual from "../pages/Performance/DepartmentDetails/PerformanceAnnual";
import PerformanceMonthly from "../pages/Performance/DepartmentDetails/PerformanceMonthly";
import DepartmentTasksLayout from "../pages/Tasks/DepartmentTasks/DepartmentTasksLayout";
import DepartmentTasks from "../pages/Tasks/DepartmentTasks/DepartmentTasks";
import TasksDepartmentLayout from "../pages/Tasks/DepartmentTasks/TasksDepartmentLayout";
import TasksViewDepartment from "../pages/Tasks/DepartmentTasks/TasksViewDepartment";
import ManageTicketLayout from "../pages/Tickets/Tables/ManageTicketLayout";
import ManageTicketsHome from "../pages/Tickets/ManageTicketsHome";
import Reimbursement from "../components/Pages/Reimbursement";
import AddClient from "../pages/Visitors/Forms/AddClient";
import ManageVisitorLayout from "../pages/Visitors/ManageVisitorLayout";
import ExternalClients from "../pages/Visitors/ExternalClients";
import ManageMeetingsLayout from "../pages/Meetings/ManageMeetingsLayout";
import ExternalMeetingClients from "../pages/Meetings/ExternalMeetingClients";
import Vendor from "../components/Vendor";
import ViewVendor from "../components/vendor/ViewVendor";
import MonthlyInvoiceCommon from "../components/Pages/MonthlyInvoiceCommon";
import UserDetails from "../pages/Profile/UserDetails";
import BudgetPage from "../components/Pages/BudgetPage";
import PaymentScheduleCommon from "../components/Pages/PaymentScheduleCommon";
import DepartmentAssetCommon from "../components/Pages/DepartmentAssetCommon";
import SopUpload from "../components/Pages/SopUpload";
import PolicyUpload from "../components/Pages/PolicyUpload";
import MainDashboard from "../pages/Dashboard/MainDashboard/MainDashboard";
import DepartmentWiseBulkUpload from "../components/Pages/BulkUpload";
import HrCommonAttandenceRequests from "../pages/HR/HrCommonAttandenceRequests";
import HrCommonHandbook from "../pages/HR/HrCommonHandbook";
import HrCommonDocuments from "../pages/HR/HrCommonDocuments";
import VendorTable from "../components/Pages/VendorTable";
import AssetsHome from "../pages/Assets/AssetsHome";
import ManageAssetsHome from "../pages/Assets/ManageAssetsHome";
import LogPage from "../pages/LogPage";
import AccessPages from "../pages/Access/AccessPages";
import ModulePermissions from "../pages/Access/ModulePermissions";
import CreateWebsite from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/CreateWebsite";
import EditWebsite from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/EditWebsite";
import Websites from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/Websites";
import WebsitesLayout from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/WebsitesLayout";
import InActiveWebsites from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/InActiveWebsites";
import EditWebsiteTemp from "../pages/Dashboard/FrontendDashboard/WebsiteBuilder/EditWebsiteTemp";
import Companies from "../pages/Dashboard/FrontendDashboard/Companies";
import CompanyLeads from "../pages/Dashboard/FrontendDashboard/CompanyLeads";
import CompanyOverview from "../pages/Dashboard/FrontendDashboard/CompanyOverview";
import NomadListing from "../pages/Dashboard/FrontendDashboard/NomadListing";
import PocDetails from "../pages/Dashboard/FrontendDashboard/PocDetails";
import NomadListingsOverview from "../pages/Dashboard/FrontendDashboard/NomadListingsOverview";
import Services from "../pages/Services";

export const routes = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />,
  },

  {
    element: <PersistLogin />,
    children: [
      {
        element: <AuthLayout />,
        children: [
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
                    element: <CompanyOverview />,
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
                    path: "website-builder",
                    element: <FrontendLayout />,
                    children: [
                      { index: true, element: <FrontendDashboard /> },
                      { path: "select-theme", element: <ThemeGrid /> },
                      { path: "view-theme", element: <ViewTheme /> },
                      { path: "leads", element: <CompanyLeads /> },
                      { path: "live-demo", element: <PageDemo /> },
                      { path: "edit-website", element: <EditWebsite /> }, // no param
                      {
                        path: "edit-website/:website",
                        element: <EditWebsite />,
                      }, // with param
                      {
                        path: "create-website",
                        element: <CreateWebsite />,
                      },
                      {
                        path: "edit-website/:website",
                        element: <EditWebsite />,
                      },

                      // {
                      //   path: "websites",
                      //   element: <WebsitesLayout />,
                      //   children: [
                      //     { path: "active", element: <Websites /> },
                      //     { path: "inactive", element: <InActiveWebsites /> },
                      //     { path: ":website", element: <EditWebsite /> },
                      //     {
                      //       path: "inactive/:website",
                      //       element: <EditWebsiteTemp />,
                      //     },
                      //   ],
                      // },
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
                ],
              },

              {
                path: "services",
                element: <Services />,
              },
              {
                path: "reports",
                element: <Reports />,
              },
              {
                path: "calendar",
                element: <Calender />,
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
                    path: "change-password",
                    element: <ChangePassword />,
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
                path: "tickets", // Parent path
                element: <TicketLayout />, // Parent component for tickets
                children: [
                  {
                    path: "", // Default route for /app/tickets
                    element: <TicketDashboard />, // Dashboard is rendered by default
                    index: true,
                  },
                  {
                    path: "raise-ticket",
                    element: <RaiseTicket />,
                  },
                  {
                    path: "manage-tickets",
                    element: <ManageTicketLayout />,
                    children: [
                      {
                        path: "",
                        element: <ManageTicketsHome />,
                        index: true,
                      },
                      {
                        path: ":department",
                        element: <ManageTickets />,
                      },
                    ],
                  },
                  {
                    path: "ticket-settings",
                    element: <TicketSettingsnew />,
                  },
                  {
                    path: "team-members",
                    element: <TeamMembers />,
                  },
                  {
                    path: "reports",
                    element: <TicketReports />,
                  },
                  {
                    path: "department-wise-tickets",
                    element: <DepartmentWiseTickets />,
                  },
                ],
              },
              {
                path: "meetings", // Parent path
                element: <MeetingLayout />, // Parent component for tickets
                children: [
                  {
                    path: "", // Default route for /app/tickets
                    element: <MeetingDashboard />, // Dashboard is rendered by default
                    index: true,
                  },
                  {
                    path: ":meetings",
                    element: <MonthMeetings />,
                  },
                  {
                    path: "book-meeting",
                    element: <BookMeetings />, // This is your first page
                  },
                  {
                    path: "book-meeting/schedule-meeting",
                    element: <MeetingFormLayout />, // This is your second page
                  },
                  {
                    path: "manage-meetings",
                    element: <ManageMeetingsLayout />,
                    children: [
                      {
                        path: "internal-meetings",
                        element: <ManageMeetings />,
                      },
                      {
                        path: "external-clients",
                        element: <ExternalMeetingClients />,
                      },
                    ],
                  },

                  {
                    path: "settings",
                    element: <MeetingSettings />,
                  },
                  {
                    path: "calendar",
                    element: <MeetingCalendar />,
                  },
                  {
                    path: "reports",
                    element: <MeetingReports />,
                  },
                  {
                    path: "reviews",
                    element: <Reviews />,
                  },
                ],
              },
              {
                path: "assets", // Parent path
                element: <AssetsLayout />, // Parent component for tickets
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
                    path: "reviews",
                    element: <Reviews />,
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
                    path: "calendar",
                    element: <MeetingCalendar />,
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
                    path: "reviews",
                    element: <Reviews />,
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
                    element: <VisitorDashboard />,
                    index: true,
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
