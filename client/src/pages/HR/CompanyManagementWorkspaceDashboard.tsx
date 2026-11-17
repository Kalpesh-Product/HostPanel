import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Cake,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  FileText,
  LayoutList,
  ShieldCheck,
  UserMinus,
  Users,
  UserSquare,
} from "lucide-react";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import DonutChart from "@/components/graphs/DonutChart";
import PageFrame from "@/components/Pages/PageFrame";
import companyManagementBannerImage from "@/assets/company-management-dashboard-banner.png";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import { getEmployeeManagementOverview } from "@/services/hr";
import {
  DashboardBanner,
  DashboardSection,
  DashboardStatTile,
} from "../Administration/AdministrationModuleDashboardShared";

type EmployeeRecord = Record<string, any>;

const label = (value: unknown, fallback = "Not assigned") => {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return text
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const employeeStatus = (employee: EmployeeRecord) =>
  String(employee.statusKey || employee.status || "pending").toLowerCase();

export default function CompanyManagementWorkspaceDashboard() {
  const { plan } = useDashboardAccess();
  const isCustomPlan = String(plan || "").trim().toLowerCase() === "custom";
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [departments, setDepartments] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getEmployeeManagementOverview()
      .then((response) => {
        if (cancelled) return;
        const payload = response?.data?.data || response?.data || {};
        setEmployees(
          Array.isArray(payload.employees)
            ? payload.employees.filter(
                (employee: EmployeeRecord) =>
                  employee?.source !== "tenant-company",
              )
            : [],
        );
        setDepartments(
          Array.isArray(payload.departments) ? payload.departments : [],
        );
        setLoadError("");
      })
      .catch((error) => {
        if (!cancelled) {
          setEmployees([]);
          setDepartments([]);
          setLoadError(
            error?.message || "Workforce data could not be refreshed just now.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const active = employees.filter(
      (employee) => employeeStatus(employee) === "active",
    ).length;
    const probation = employees.filter(
      (employee) => employeeStatus(employee) === "probation",
    ).length;
    const pending = employees.filter((employee) =>
      ["pending", "invite_sent"].includes(employeeStatus(employee)),
    ).length;
    const inactive = employees.filter((employee) =>
      ["inactive", "terminated", "disabled"].includes(employeeStatus(employee)),
    ).length;
    const managers = employees.filter((employee) =>
      ["manager", "admin", "super_admin", "owner", "founder"].includes(
        String(employee.rawRole || employee.workspaceRole || employee.role || "")
          .toLowerCase()
          .replace(/[\s-]+/g, "_"),
      ),
    ).length;
    return {
      total: employees.length,
      active,
      probation,
      pending,
      inactive,
      managers,
      departments: departments.length,
      documented: employees.filter(
        (employee) => Array.isArray(employee.documents) && employee.documents.length,
      ).length,
    };
  }, [departments.length, employees]);

  const departmentRows = useMemo(() => {
    const groups = new Map<string, number>();
    employees.forEach((employee) => {
      const names = Array.isArray(employee.departments)
        ? employee.departments
            .map((department: any) => department?.name || department)
            .filter(Boolean)
        : [employee.department].filter(Boolean);
      (names.length ? names : ["Not assigned"]).forEach((name) => {
        const key = label(name);
        groups.set(key, (groups.get(key) || 0) + 1);
      });
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [employees]);

  const statusRows = useMemo(() => {
    const groups = new Map<string, number>();
    employees.forEach((employee) => {
      const key = label(employeeStatus(employee));
      groups.set(key, (groups.get(key) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [employees]);

  const recentEmployees = useMemo(
    () =>
      [...employees]
        .sort(
          (left, right) =>
            new Date(right.createdAt || right.joiningDate || 0).getTime() -
            new Date(left.createdAt || left.joiningDate || 0).getTime(),
        )
        .slice(0, 8),
    [employees],
  );

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <DashboardBanner
          title="Company Management"
          description="A live workforce view across employee status, departments, leadership coverage, onboarding, and company records."
          tags={["Employees", "Departments", "Onboarding", "Access"]}
          image={companyManagementBannerImage}
          moduleCount={isCustomPlan ? 4 : 2}
        />

        {loadError && !isLoading ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            {loadError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="h-[112px] animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStatTile icon={<Users size={20} />} label="Total Employees" value={stats.total} sub="People in the company directory" tone="blue" />
            <DashboardStatTile icon={<CheckCircle2 size={20} />} label="Active" value={stats.active} sub="Employees currently active" tone="green" />
            <DashboardStatTile icon={<CircleDashed size={20} />} label="Pending / Invited" value={stats.pending} sub="Onboarding still in progress" tone="amber" />
            <DashboardStatTile icon={<ShieldCheck size={20} />} label="Leadership" value={stats.managers} sub="Managers and workspace leaders" tone="violet" />
            <DashboardStatTile icon={<Building2 size={20} />} label="Departments" value={stats.departments} sub="Active company departments" tone="cyan" />
            <DashboardStatTile icon={<UserSquare size={20} />} label="Probation" value={stats.probation} sub="Employees in probation" tone="amber" />
            <DashboardStatTile icon={<UserMinus size={20} />} label="Inactive" value={stats.inactive} sub="Inactive or terminated records" tone="rose" />
            <DashboardStatTile icon={<LayoutList size={20} />} label="With Documents" value={stats.documented} sub="Employees with files on record" tone="slate" />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">Company management modules</p>
          <p className="mt-1 text-[10px] text-slate-500">Open the exact workspace area for employees, company documents, policies, or birthday planning.</p>
          <div className="mt-3 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardModuleCard
              icon={<LayoutList size={19} />}
              title="Employee Management"
              route="/department-accesses/hr-department/company-management/employee-management"
              description="Onboard employees, maintain profiles, roles, access, and employment records"
              color="#2563EB"
            />
            {isCustomPlan ? (
              <DashboardModuleCard
                icon={<ClipboardList size={19} />}
                title="Company SOP"
                route="/department-accesses/hr-department/company-management/company-sop"
                description="Create and maintain company-wide standard operating procedures"
                color="#0D9488"
              />
            ) : null}
            {isCustomPlan ? (
              <DashboardModuleCard
                icon={<FileText size={19} />}
                title="Company Policies"
                route="/department-accesses/hr-department/company-management/company-policies"
                description="Manage active and archived company policies for the workforce"
                color="#7C3AED"
              />
            ) : null}
            <DashboardModuleCard
              icon={<Cake size={19} />}
              title="Month-wise Birthdays"
              route="/department-accesses/hr-department/company-management/birthdays"
              description="Review upcoming employee birthdays month by month"
              color="#EA580C"
            />
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DashboardSection title="Workforce by department" subtitle="Employee coverage across active company departments.">
                {departmentRows.length ? (
                  <DonutChart centerLabel="Employees" labels={departmentRows.map(([name]) => name)} series={departmentRows.map(([, value]) => value)} colors={["#2563EB", "#0D9488", "#7C3AED", "#F59E0B", "#06B6D4", "#94A3B8"]} tooltipValue={departmentRows.map(([, value]) => `${value} employees`)} wrapLabels />
                ) : <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No department assignments recorded yet.</div>}
              </DashboardSection>
              <DashboardSection title="Employment status" subtitle="Current workforce status and onboarding mix.">
                {statusRows.length ? (
                  <DonutChart centerLabel="Employees" labels={statusRows.map(([name]) => name)} series={statusRows.map(([, value]) => value)} colors={["#10B981", "#F59E0B", "#2563EB", "#EF4444", "#7C3AED", "#94A3B8"]} tooltipValue={statusRows.map(([, value]) => `${value} employees`)} wrapLabels />
                ) : <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No employee status data recorded yet.</div>}
              </DashboardSection>
            </div>

            <DashboardSection title="Recent workforce records" subtitle="Latest employees added to the company directory." bodyClassName="max-h-[420px] overflow-auto p-0">
              <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500"><tr><th className="w-[30%] px-5 py-3 font-pmedium">Employee</th><th className="w-[20%] px-3 py-3 font-pmedium">Department</th><th className="w-[20%] px-3 py-3 font-pmedium">Role</th><th className="w-[15%] px-3 py-3 font-pmedium">Work Mode</th><th className="w-[15%] px-3 py-3 text-center font-pmedium">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {recentEmployees.length ? recentEmployees.map((employee, index) => (
                    <tr key={employee.id || employee._id || index} className="bg-white text-[11px] text-slate-600">
                      <td className="px-5 py-3"><p className="truncate font-pmedium text-slate-900">{employee.fullName || employee.name || "Employee"}</p><p className="mt-0.5 truncate text-[9px] text-slate-400">{employee.employeeId || employee.email || "Employee record"}</p></td>
                      <td className="truncate px-3 py-3">{employee.department || "Not assigned"}</td>
                      <td className="truncate px-3 py-3">{label(employee.jobTitle || employee.workspaceRole || employee.role, "Employee")}</td>
                      <td className="px-3 py-3">{label(employee.workMode, "Not set")}</td>
                      <td className="px-3 py-3 text-center"><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-pmedium uppercase text-slate-600">{label(employeeStatus(employee))}</span></td>
                    </tr>
                  )) : <tr><td colSpan={5} className="px-5 py-12 text-center text-[11px] text-slate-500">No employees recorded yet.</td></tr>}
                </tbody>
              </table>
            </DashboardSection>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
